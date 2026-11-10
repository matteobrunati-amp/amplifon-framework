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
const statuses = [];
const sandbox = {
  attempt: {id: 'lead-1', status: 'submitting', values: {email: 'private'}, context: {}},
  tracking: {trackFormSent: () => events.push('form_sent')},
  trackTaboolaLead: () => events.push('taboola'),
  ui: {setStatus: (value, message) => {
    events.push(value);
    statuses.push({value, message});
  }},
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
assert.deepEqual(statuses, [{value: 'succeeded', message: undefined}]);
assert.equal(timers.length, 2);
assert.equal(timers.find(item => item.ms === 5000).ms, 5000);
timers.find(item => item.ms === 5000).fn();
assert.equal(redirects[0], sandbox.c.success.redirectUrl);
timers.find(item => item.ms === 15000).fn();
assert.equal(sandbox.attempt.values, null);

sandbox.attempt = {id: 'preview-1', status: 'submitting'};
sandbox.c.runtime.mode = 'preview';
sandbox.c.copy = {previewSuccess: 'Prueba completada. No se enviaron datos.'};
events.length = timers.length = redirects.length = statuses.length = 0;
vm.runInContext("succeeded('preview-1'); succeeded('preview-1')", sandbox);
assert.deepEqual(events, ['form_sent', 'succeeded', 'cleanup']);
assert.deepEqual(statuses, [{value: 'succeeded', message: sandbox.c.copy.previewSuccess}]);
assert.deepEqual(timers.map(timer => timer.ms), [15000]);
assert.deepEqual(redirects, []);

function nativeElement(initialAttributes) {
  const attributes = new Map(Object.entries(initialAttributes));
  const classes = new Set();
  return {
    getAttribute: name => attributes.get(name) ?? null,
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: name => attributes.delete(name),
    classList: {
      contains: value => classes.has(value),
      add: value => classes.add(value),
      remove: value => classes.delete(value)
    }
  };
}

const native = nativeElement({'aria-hidden': 'false'});
const nativeButton = nativeElement({tabindex: '0'});
const appRoot = {};
let nativeContainsApp = false;
native.contains = element => nativeContainsApp && element === appRoot;
native.querySelectorAll = () => [nativeButton];
const window = {
  AmplifonApp: {modules: {}},
  get ub() { throw Error('Preview must not inspect native submission hooks'); }
};
vm.runInNewContext(
  fs.readFileSync('src/multistep/06_UNBOUNCE_BRIDGE.js', 'utf8'),
  {window, document: {querySelector: () => native, getElementById: () => appRoot}, AbortController}
);
const config = {runtime: {nativeRootSelector: '#lp-pom-root', rootId: 'amp-app'}, form: {fields: {}}};
const bridge = window.AmplifonApp.modules.unbounce.create(config, {});
bridge.hideNativeRoot();
assert.equal(native.classList.contains('amp-native-transport'), true);
assert.equal(native.getAttribute('aria-hidden'), 'true');
assert.equal(nativeButton.getAttribute('tabindex'), '-1');
assert.equal(bridge.inspect().ready, false);
bridge.destroy();
assert.equal(native.classList.contains('amp-native-transport'), false);
assert.equal(native.getAttribute('aria-hidden'), 'false');
assert.equal(native.getAttribute('tabindex'), null);
assert.equal(nativeButton.getAttribute('tabindex'), '0');

nativeContainsApp = true;
const nestedBridge = window.AmplifonApp.modules.unbounce.create(config, {});
nestedBridge.hideNativeRoot();
assert.equal(native.classList.contains('amp-native-transport'), false);

const forbidden = new Proxy({}, {
  get() { throw Error('Unexpected access to native confirmation dialog'); }
});
vm.runInNewContext(
  fs.readFileSync('src/confirmation/amplifon-confirmation.js', 'utf8'),
  {window: forbidden, document: forbidden}
);

const {version} = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const bundle = fs.readFileSync(`dist/${version}/amplifon-multistep.js`, 'utf8');
assert.equal(/confirmation-ready|amp:confirmation-confirmed|showSuccess/.test(bundle), false);

console.log('native confirmation, preview transport, success dedupe, tracking and redirect checks: OK');
