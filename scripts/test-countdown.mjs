import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync('src/multistep/03A_COUNTDOWN.js', 'utf8');
let now = Date.parse('2026-10-27T12:00:00Z');
const timers = new Map();
let nextId = 0;
const App = {modules: {utils: {
  assert(condition, code) { if (!condition) throw Error(code); },
  node(tag, attrs, children = []) {
    return {tag, ...attrs, hidden: attrs.hidden === true, textContent: attrs.text || '', children};
  }
}}};
class Clock extends Date { static now() { return now; } }
vm.runInNewContext(source, {Date: Clock, window: {
  AmplifonApp: App,
  setInterval(fn) { const id = ++nextId; timers.set(id, fn); return id; },
  clearInterval(id) { timers.delete(id); }
}});
const M = App.modules.countdown;
function config(overrides = {}) {
  return {enabled: true, mode: 'duration', durationSeconds: 90061,
    placements: {header: true, contact: true}, expiredBehavior: 'message',
    urgentThresholdSeconds: 60, labels: {days: 'd', hours: 'h', minutes: 'm', seconds: 's'},
    text: {header: 'HEADER', contact: 'CONTACT', urgentHeader: 'URGENT',
      urgentContact: 'HURRY', expired: 'EXPIRED'}, ...overrides};
}
function tick(ms) { now += ms; [...timers.values()].forEach(fn => fn()); }

// Existing page configs and explicit opt-out allocate no DOM or timer.
for (const cfg of [undefined, null, {enabled: false}]) {
  const timer = M.create(cfg);
  assert.equal(timer.view('header'), null);
  timer.start();
  timer.destroy();
  assert.equal(timers.size, 0);
}
const timer = M.create(config());
const header = timer.view('header');
const contact = timer.view('contact');
assert.equal(header.hidden, true);
timer.start(); timer.start();
assert.equal(timers.size, 1);
assert.equal(header.hidden, false);
assert.equal(header.children[1].textContent, '01d 01h 01m 01s');
assert.equal(contact.children[0].textContent, 'CONTACT');
assert.equal(header.children[1]['aria-live'], 'off');
// A throttled/background tab catches up from absolute time, rather than ticks.
tick(90001000);
assert.equal(header.children[0].textContent, 'URGENT');
assert.equal(contact.children[0].textContent, 'HURRY');
assert.equal(contact.children[1].textContent, '00d 00h 01m 00s');
tick(60000);
assert.equal(timers.size, 0);
assert.equal(header.children[0].textContent, 'EXPIRED');
assert.equal(header.children[1].hidden, true);
assert.equal(contact.children[1].textContent, '');
timer.start();
assert.equal(timers.size, 0); // Expiry cannot restart on navigation.

const deadline = M.create(config({mode: 'deadline', endsAt: '2026-10-31T23:59:59+01:00'}));
const fixed = deadline.view('header');
deadline.start();
assert.equal(fixed.children[1].textContent, '03d 09h 58m 58s');
deadline.destroy();
assert.equal(timers.size, 0);

for (const behavior of ['hide', 'message']) {
  const expired = M.create(config({mode: 'deadline', endsAt: '2026-01-01T00:00:00Z', expiredBehavior: behavior}));
  const node = expired.view('header');
  expired.start();
  assert.equal(node.hidden, behavior === 'hide');
  assert.equal(timers.size, 0);
}
const single = M.create(config({placements: {header: false, contact: true}}));
assert.equal(single.view('header'), null);
single.view('contact'); single.start(); single.destroy();
const neither = M.create(config({placements: {header: false, contact: false}}));
neither.start();
assert.equal(timers.size, 0);

// Copy remains plain text even when it contains HTML. No cookies/network/storage API is available.
const literal = M.create(config({text: {header: '<img src=x onerror=alert(1)>', contact: 'C', expired: 'E'}}));
const literalNode = literal.view('header'); literal.start();
assert.equal(literalNode.children[0].textContent, '<img src=x onerror=alert(1)>');
literal.destroy();

for (const bad of [0, -1, 1.5, Infinity, 31536001, '600']) {
  assert.throws(() => M.validate(config({durationSeconds: bad})), /CONFIG_COUNTDOWN_DURATION/);
}
for (const endsAt of ['2026-10-31', '2026-10-31T23:59:59', '2026-02-30T12:00:00Z',
  '2026-10-31T24:00:00Z', 'invalid']) {
  assert.throws(() => M.validate(config({mode: 'deadline', endsAt})), /CONFIG_COUNTDOWN_DEADLINE/);
}
for (const overrides of [{enabled: 'true'}, {mode: 'other'}, {placements: {header: true}},
  {urgentThresholdSeconds: -1}, {expiredBehavior: 'restart'}, {labels: {}},
  {text: {header: 'H', contact: 'C'}}]) {
  assert.throws(() => M.validate(config(overrides)), /CONFIG_COUNTDOWN/);
}
assert.equal(timers.size, 0);
console.log('countdown opt-in, synchronization, deadline, duration, expiry, lifecycle and validation: OK');
