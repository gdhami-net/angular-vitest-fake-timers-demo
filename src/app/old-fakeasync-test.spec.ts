import { fakeAsync, flush, tick } from '@angular/core/testing';

/**
 * What `@angular/core/testing`'s zone helpers do on the setup `ng new`
 * produces today: Angular 22.2.0, Vitest 5.0.2, no zone.js in the project.
 *
 * The message is spelled out in full, including the newline and the eight
 * spaces Angular's own source puts in front of the second line.
 */
const ZONE_TESTING_MISSING =
  'zone-testing.js is needed for the fakeAsync() test helper but could not be found.\n' +
  '        Please make sure that your environment includes zone.js/testing';

describe('the zone test helpers on the default ng new setup', () => {
  it('has no Zone global at all', () => {
    expect((globalThis as Record<string, unknown>)['Zone']).toBeUndefined();
  });

  it('throws from fakeAsync() itself, before the test body is ever called', () => {
    const body = vi.fn();
    expect(() => fakeAsync(body)).toThrowError(ZONE_TESTING_MISSING);
    expect(body).not.toHaveBeenCalled();
  });

  it('throws from tick() with the same message', () => {
    expect(() => tick(300)).toThrowError(ZONE_TESTING_MISSING);
  });

  it('throws from flush() with the same message', () => {
    expect(() => flush()).toThrowError(ZONE_TESTING_MISSING);
  });
});
