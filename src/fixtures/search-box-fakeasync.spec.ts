import { fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { SearchBox } from '../app/search-box';
import { SearchGateway } from '../app/search-gateway';

/**
 * The pre-Vitest test for SearchBox, written the way Angular tests have been
 * written since Karma and Jasmine, and left alone on purpose.
 *
 * This file is EXCLUDED from `ng test` and is run four times by check.mjs,
 * once per test configuration in angular.json, to record what each one does:
 *
 *   ng test -c fixture-default      no zone.js               fails to collect
 *   ng test -c zone-only            zone.js                  ProxyZone error
 *   ng test -c zone-without-patch   + zone.js/testing        ProxyZone error
 *   ng test -c zone                 + the vitest patch       passes
 */
describe('SearchBox (the pre-Vitest test, unchanged)', () => {
  let search: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    search = vi.fn((term: string) => of([`${term} (1)`]));
    TestBed.configureTestingModule({
      providers: [{ provide: SearchGateway, useValue: { search } }],
    });
  });

  it('sends one request for a burst of keystrokes', fakeAsync(() => {
    const fixture = TestBed.createComponent(SearchBox);
    const box = fixture.componentInstance;

    box.query.setValue('a');
    tick(100);
    box.query.setValue('an');
    tick(100);
    box.query.setValue('ang');
    tick(299);
    expect(search).not.toHaveBeenCalled();

    tick(1);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('ang');

    flush();
    fixture.destroy();
  }));

  it('an unrelated test in the same file', () => {
    expect(TestBed.inject(SearchGateway)).toBeTruthy();
  });
});
