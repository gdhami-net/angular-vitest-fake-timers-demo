#!/usr/bin/env node
// Runs every test configuration in angular.json and asserts what each one
// does. The post quotes these outputs, so a version bump that changes any of
// them fails here instead of quietly making the post wrong.
//
//   npm run check
//
// Exit code 0 means every line below printed PASS.

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const NG = require.resolve('@angular/cli/bin/ng.js');

const PROXY_ZONE = "Expected to be running in 'ProxyZone', but it was not found.";
const ZONE_TESTING_MISSING =
  'zone-testing.js is needed for the fakeAsync() test helper but could not be found.';

const CASES = [
  {
    name: 'ng test (the default setup: no zone.js, Vitest fake timers)',
    args: ['test', '--no-watch', '--reporters=dot'],
    expectPass: true,
    expect: ['Tests  17 passed'],
  },
  {
    name: 'ng test -c fixture-default (the fakeAsync test, untouched)',
    args: ['test', '-c', 'fixture-default', '--no-watch', '--reporters=dot'],
    expectPass: false,
    expect: [ZONE_TESTING_MISSING, 'Tests  no tests', 'Failed Suites 1'],
  },
  {
    name: 'ng test -c zone-only (polyfills: zone.js)',
    args: ['test', '-c', 'zone-only', '--no-watch', '--reporters=dot'],
    expectPass: false,
    expect: [PROXY_ZONE],
  },
  {
    name: 'ng test -c zone-without-patch (polyfills: zone.js, zone.js/testing)',
    args: ['test', '-c', 'zone-without-patch', '--no-watch', '--reporters=dot'],
    expectPass: false,
    expect: [PROXY_ZONE],
  },
  {
    name: 'ng test -c zone (+ zone.js/plugins/vitest-patch)',
    args: ['test', '-c', 'zone', '--no-watch', '--reporters=dot'],
    expectPass: true,
    expect: ['Tests  2 passed'],
  },
];

const ANSI = /\[[0-9;]*m/g;
let failures = 0;

function report(ok, line) {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${line}`);
}

for (const testCase of CASES) {
  const run = spawnSync(process.execPath, [NG, ...testCase.args], {
    encoding: 'utf8',
    cwd: import.meta.dirname,
  });
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`.replace(ANSI, '');
  const passed = run.status === 0;

  console.log(`\n--- ${testCase.name}`);
  report(
    passed === testCase.expectPass,
    `exit code ${run.status} (${testCase.expectPass ? 'suite must pass' : 'suite must fail'})`,
  );
  for (const needle of testCase.expect) {
    report(output.includes(needle), `output contains ${JSON.stringify(needle)}`);
  }
}

console.log(
  failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
