import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync('src/multistep/07_LEAD_BOOTSTRAP.js', 'utf8');
const successCode = source.slice(
  source.indexOf('  function succeeded(id)'),
  source.indexOf('  function unknown(id)')
);

const events = [];
const timers = [];
const redirects = [];
const sandbox = {
  attempt: {id: 'lead-1', status: 'submitting', values: {email: 'private'}, context: {}},
  tracking: {trackFormSent: () => events.push('form_sent')},
  trackTaboolaLead: () => events.push('taboola'),
  ui: {setStatus: value => events.push(value)},
  engine: {cleanAfterSuccess: () => events.push('cleanup')},
  bridge: {clearPersonal: () => events.push('clearPersonal')},
  c: {
    runtime: {mode: 'live'},
    tracking: {contactLifetimeMs: 15000},
    success: {
      redirectUrl: 'https://example.test/de/thank-you',
      redirectDelayMs: 5000,
      allowedRedirectOrigins: ['https://example.test'],
      requiredPathPrefix: '/de/'
    }
  },
  setTimeout: (fn, ms) => {timers.push({fn, ms}); return timers.length;},
  U: {safeUrl: value => new URL(value)},
  w: {location: {assign: value => redirects.push(value)}},
  attribution: {decorate: value => value},
  cleanupTimer: null,
  redirectTimer: null
};

vm.createContext(sandbox);
vm.runInContext(successCode, sandbox);
vm.runInContext("succeeded('wrong-id')", sandbox);
assert.equal(events.length, 0);
vm.runInContext("succeeded('lead-1'); succeeded('lead-1')", sandbox);
assert.deepEqual(events, ['form_sent', 'taboola', 'succeeded', 'cleanup']);
assert.equal(timers.length, 2);
assert.equal(timers.find(item => item.ms === 5000).ms, 5000);
timers.find(item => item.ms === 5000).fn();
assert.equal(redirects[0], sandbox.c.success.redirectUrl);
timers.find(item => item.ms === 15000).fn();
assert.equal(sandbox.attempt.values, null);

const forbidden = new Proxy({}, {
  get() { throw Error('Unexpected access to native confirmation dialog'); }
});
vm.runInNewContext(
  fs.readFileSync('src/confirmation/amplifon-confirmation.js', 'utf8'),
  {window: forbidden, document: forbidden}
);

const bundle = fs.readFileSync('dist/1.0.13/amplifon-multistep.js', 'utf8');
assert.equal(/confirmation-ready|amp:confirmation-confirmed|showSuccess/.test(bundle), false);

console.log('native confirmation, success dedupe, tracking and redirect checks: OK');
