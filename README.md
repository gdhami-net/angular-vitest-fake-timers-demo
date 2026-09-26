# angular-vitest-fake-timers-demo

Companion repo for the post **"Replacing fakeAsync and tick when Angular tests
move to Vitest"** ([gdhami.net](https://gdhami.net) — link added when the post is
live).

`ng new` on Angular 22.2.0 scaffolds a project with Vitest as the unit test
runner and no `zone.js` anywhere in it. `fakeAsync`, `tick` and `flush` come from
`@angular/core/testing` but they are implemented by `zone.js/testing`, so on that
project they throw before a single assertion runs.

This repo holds one component — a search box with a 300 ms `debounceTime` — and
the same behaviour tested five ways.

## What it proves

| configuration | polyfills | what happens |
|---|---|---|
| `ng test` | none | the fake-timer tests pass, 17 of them |
| `ng test -c fixture-default` | none | the `fakeAsync` file fails to collect; `Tests  no tests` |
| `ng test -c zone-only` | `zone.js` | `Expected to be running in 'ProxyZone', but it was not found.` |
| `ng test -c zone-without-patch` | `zone.js`, `zone.js/testing` | the same ProxyZone error |
| `ng test -c zone` | `zone.js`, `zone.js/testing`, `zone.js/plugins/vitest-patch` | the untouched `fakeAsync` test passes |

`src/fixtures/search-box-fakeasync.spec.ts` is one file, run by the last four
rows without a character changing between them. The only difference is which
polyfills the build target lists.

The first error, in full, including the eight spaces Angular's own source puts in
front of the second line:

```
Error: zone-testing.js is needed for the fakeAsync() test helper but could not be found.
        Please make sure that your environment includes zone.js/testing
```

## The tests

- `src/app/old-fakeasync-test.spec.ts` — asserts that message character for
  character, that `fakeAsync()` throws when it builds the wrapper rather than
  when the body runs, and that `globalThis.Zone` is `undefined`.
- `src/app/search-box.spec.ts` — the replacement, on `vi.useFakeTimers()`. Five
  tests: nothing fires before 300 ms, a burst of keystrokes collapses to one
  request, the rendered DOM catches up, `vi.runAllTimersAsync()` as the version
  that names no number, and `Date` frozen except for what the test advances.
- `src/app/fake-clock-traps.spec.ts` — the four things that cost time while this
  was being written:
  1. which globals `vi.useFakeTimers()` replaces on Vitest 5.0.2 (ten of them,
     including `requestAnimationFrame`; `queueMicrotask` is left real).
  2. `fixture.whenStable()` waits on a timer. With a fake clock and no advance it
     never resolves — the test races it against a real 60 ms timeout and the
     timeout wins. Stopping the clock exactly on the debounce boundary leaves
     two timers queued, because Angular's zoneless scheduler races a
     `setTimeout` against a `requestAnimationFrame`, and one more millisecond
     settles it. `fixture.detectChanges()` needs no clock at all.
  3. `vi.advanceTimersByTime` fires the debounce but stops short of a promise the
     debounce started; `vi.advanceTimersByTimeAsync` drains the microtasks as it
     goes.
  4. A fake clock survives the test that installed it, which is why
     `vi.useRealTimers()` belongs in `afterEach`. Two tests assert exactly that,
     in order.
- `src/fixtures/search-box-fakeasync.spec.ts` — the pre-Vitest test, excluded
  from `ng test` and run by the four fixture configurations above.

## Run it

```bash
npm install
npm run check
```

`npm run check` runs all five configurations and asserts the exit code and the
message for each. It prints `ALL CHECKS PASSED` when the table above still
holds. `npm test` runs only the first row.

`npm start` serves the page: type into the box and the request counter stays put
until you stop for 300 ms.

Angular 22.2.0, Vitest 5.0.2, `@angular/build` 22.2.0, TypeScript 6.0.3,
zone.js 0.16.3, jsdom 30.1.1, Node 26.1.0. jsdom rather than a real browser; not
repeated on Linux.

## License

MIT — see [LICENSE](LICENSE).
