import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { DEBOUNCE_MS, SearchBox } from './search-box';
import { SearchGateway } from './search-gateway';

/** The replacement for the fakeAsync/tick version, on Vitest's fake clock. */
describe('SearchBox on Vitest fake timers', () => {
  let fixture: ComponentFixture<SearchBox>;
  let search: (term: string) => Observable<readonly string[]>;

  beforeEach(async () => {
    vi.useFakeTimers();
    search = vi.fn((term: string) => of([`${term} (1)`, `${term} (2)`]));
    TestBed.configureTestingModule({
      providers: [{ provide: SearchGateway, useValue: { search } }],
    });
    fixture = TestBed.createComponent(SearchBox);
    // The first render is scheduled on a timer too, so let the clock start it.
    await vi.advanceTimersByTimeAsync(1);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function type(term: string) {
    fixture.componentInstance.query.setValue(term);
  }

  function requestsText() {
    const el = fixture.nativeElement as HTMLElement;
    return el.querySelector('[data-testid="requests"]')?.textContent?.trim();
  }

  it('asks nothing until the debounce window has passed', async () => {
    type('ang');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1);
    expect(search).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('ang');
  });

  it('collapses a burst of keystrokes into one request', async () => {
    type('a');
    await vi.advanceTimersByTimeAsync(100);
    type('an');
    await vi.advanceTimersByTimeAsync(100);
    type('ang');
    await vi.advanceTimersByTimeAsync(100);
    expect(search).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(search).toHaveBeenCalledExactlyOnceWith('ang');
  });

  it('renders the results once the clock has moved past the render as well', async () => {
    type('ang');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 1);
    await fixture.whenStable();

    expect(requestsText()).toBe('requests: 1');
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '[data-testid="results"] li',
    );
    expect([...rows].map((li) => li.textContent?.trim())).toEqual(['ang (1)', 'ang (2)']);
  });

  it('runs the pending debounce with runAllTimersAsync, without naming a number', async () => {
    type('ang');
    await vi.runAllTimersAsync();
    await fixture.whenStable();

    expect(search).toHaveBeenCalledExactlyOnceWith('ang');
    expect(requestsText()).toBe('requests: 1');
  });

  it('keeps Date frozen except for what the test advances', async () => {
    const t0 = Date.now();
    type('ang');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(Date.now() - t0).toBe(DEBOUNCE_MS);
  });
});
