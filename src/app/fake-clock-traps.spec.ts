import { TestBed } from '@angular/core/testing';
import { defer, of } from 'rxjs';
import { DEBOUNCE_MS, SearchBox } from './search-box';
import { SearchGateway } from './search-gateway';

/**
 * The four things that made a rewritten test hang, or pass for the wrong
 * reason, while this demo was being written. Each one is asserted rather than
 * described, so a version bump that changes the behaviour breaks the suite.
 */

const TIMER_GLOBALS = [
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'setImmediate',
  'clearImmediate',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'Date',
  'performance',
  'queueMicrotask',
] as const;

function snapshot() {
  const out = new Map<string, unknown>();
  for (const name of TIMER_GLOBALS) {
    out.set(name, (globalThis as Record<string, unknown>)[name]);
  }
  return out;
}

describe('trap 1: which globals vi.useFakeTimers() replaces', () => {
  afterEach(() => vi.useRealTimers());

  it('fakes the timer functions and Date, and leaves queueMicrotask alone', () => {
    const before = snapshot();
    vi.useFakeTimers();
    const after = snapshot();

    const replaced = TIMER_GLOBALS.filter((n) => after.get(n) !== before.get(n));
    const untouched = TIMER_GLOBALS.filter((n) => after.get(n) === before.get(n));

    expect(replaced).toEqual([
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'setImmediate',
      'clearImmediate',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'Date',
      'performance',
    ]);
    expect(untouched).toEqual(['queueMicrotask']);
  });
});

describe('trap 2: whenStable() waits on a timer, so it needs the clock', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: SearchGateway, useValue: { search: vi.fn((t: string) => of([`${t} (1)`])) } },
      ],
    });
  });
  afterEach(() => vi.useRealTimers());

  it('never resolves on its own: 60 ms of real time go by and nothing settles', async () => {
    const realSetTimeout = globalThis.setTimeout;
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(SearchBox);

    const outcome = await Promise.race([
      fixture.whenStable().then(() => 'stable'),
      new Promise<string>((resolve) => realSetTimeout(() => resolve('still waiting'), 60)),
    ]);

    expect(outcome).toBe('still waiting');
  });

  it('is still pending when the clock stops exactly on the debounce boundary', async () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(SearchBox);
    await vi.advanceTimersByTimeAsync(1);

    fixture.componentInstance.query.setValue('ang');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    // The debounce has fired and the request has gone out...
    expect(fixture.componentInstance.requests()).toBe(1);
    // ...but the render it asked for is two queued callbacks: Angular's
    // scheduler races a setTimeout against a requestAnimationFrame, and the
    // fake clock is faking both.
    expect(vi.getTimerCount()).toBe(2);

    let settled = false;
    void fixture.whenStable().then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toBe(true);
  });

  it('detectChanges() renders with no clock movement at all', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(SearchBox);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="requests"]')?.textContent?.trim()).toBe('requests: 0');
  });
});

describe('trap 3: the synchronous advance stops short of a promise', () => {
  afterEach(() => vi.useRealTimers());

  /** A gateway whose answer arrives on a microtask, the way an HTTP one does. */
  function promiseBackedGateway() {
    const search = vi.fn((term: string) => defer(() => Promise.resolve([`${term} (1)`])));
    TestBed.configureTestingModule({
      providers: [{ provide: SearchGateway, useValue: { search } }],
    });
    return search;
  }

  it('advanceTimersByTime fires the debounce but leaves the answer unresolved', async () => {
    const search = promiseBackedGateway();
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(SearchBox);
    fixture.detectChanges();

    fixture.componentInstance.query.setValue('ang');
    vi.advanceTimersByTime(DEBOUNCE_MS);

    expect(search).toHaveBeenCalledExactlyOnceWith('ang');
    expect(fixture.componentInstance.results()).toEqual([]);
  });

  it('advanceTimersByTimeAsync drains the microtasks as it goes', async () => {
    const search = promiseBackedGateway();
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(SearchBox);
    fixture.detectChanges();

    fixture.componentInstance.query.setValue('ang');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    expect(search).toHaveBeenCalledExactlyOnceWith('ang');
    expect(fixture.componentInstance.results()).toEqual(['ang (1)']);
  });
});

describe('trap 4: the clock outlives the test that installed it', () => {
  it('leaves a fake clock in place when nothing puts it back', () => {
    vi.useFakeTimers();
    expect(vi.isFakeTimers()).toBe(true);
  });

  it('sees the clock the previous test left behind', () => {
    expect(vi.isFakeTimers()).toBe(true);
    vi.useRealTimers();
    expect(vi.isFakeTimers()).toBe(false);
  });
});
