import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync('src/typ/amplifon-typ.js', 'utf8');
const config = {
  runtime: {mode: 'preview', rootId: 'amp-app'},
  page: {htmlLang: 'es-AR', title: 'Gracias | GAES', pageID: 'qa-placeholder', pageName: 'GAES TYP QA', language: 'es_AR', region: 'AR'},
  tracking: {enabled: true},
  assets: {logo: 'https://assets.example.invalid/gaes.png'},
  copy: {
    heading: 'Gracias por tu solicitud',
    subheading: 'Nos pondremos en contacto contigo.',
    nextHeading: 'Próximos pasos',
    nextSteps: [{title: 'Te llamaremos', text: 'Un especialista te contactará.'}],
    privacyUrl: 'https://www.gaes.ar/politica-de-privacidad',
    privacyLinkLabel: 'Privacidad'
  }
};

function runtime(overrides = {}) {
  const calls = [];
  const errors = [];
  const listeners = new Map();
  const nodes = [];
  function node(tag) {
    const attributes = new Map();
    const styleValues = new Map();
    const element = {
      tag, children: [],
      style: {
        setProperty(key, value, priority) { styleValues.set(key, {value, priority}); },
        getPropertyValue: key => styleValues.get(key)?.value,
        getPropertyPriority: key => styleValues.get(key)?.priority
      },
      classList: {add() {}},
      setAttribute(key, value) { attributes.set(key, value); },
      getAttribute: key => attributes.get(key),
      appendChild(child) { this.children.push(child); return child; },
      contains(child) { return this === child || this.children.some(item => item.contains(child)); }
    };
    nodes.push(element);
    return element;
  }
  const nativeRoot = node('section');
  const document = {
    readyState: overrides.loading ? 'loading' : 'complete',
    documentElement: node('html'), body: node('body'), createElement: node,
    getElementById: id => nodes.find(element => element.getAttribute('id') === id) || null,
    querySelector: () => nativeRoot,
    addEventListener(name, callback) { listeners.set(name, callback); },
    get cookie() { throw new Error('TYP must not read cookies'); },
    set cookie(value) { throw new Error('TYP must not write cookies'); }
  };
  const pageConfig = structuredClone(config);
  pageConfig.runtime.mode = overrides.mode || 'preview';
  pageConfig.tracking.enabled = overrides.tracking !== false;
  if (overrides.missingIdentity) pageConfig.page.pageID = '';
  const location = {
    origin: 'https://www.promotion25.com', pathname: '/ar/gaes/gracias/',
    href: 'https://www.promotion25.com/ar/gaes/gracias/?email=synthetic%40example.invalid&mci=qa',
    get search() { throw new Error('TYP must not read query parameters'); },
    assign() { throw new Error('TYP must not redirect'); }
  };
  const window = {
    AMPLIFON_CONFIG: pageConfig, location, navigator: {userAgent: 'QA desktop'},
    _satellite: {track() { throw new Error('TYP must not call Adobe direct calls'); }},
    fbq() { throw new Error('TYP must not call Meta'); },
    fetch() { throw new Error('TYP must not make direct network requests'); }
  };
  if (!overrides.unavailable) window.wa_gc = (data, type) => calls.push({data, type});
  const context = vm.createContext({window, document, URL, console: {error: (...args) => errors.push(args)}});
  return {window, document, calls, errors, nativeRoot, run: () => vm.runInContext(source, context), ready: () => listeners.get('DOMContentLoaded')?.()};
}

const preview = runtime();
preview.run();
assert.equal(preview.window.AmplifonApp.typ.inspect().mounted, true);
assert.equal(preview.calls.length, 0);
assert.equal(preview.nativeRoot.hidden, true);
assert.equal(preview.nativeRoot.style.getPropertyValue('display'), 'none');
assert.equal(preview.nativeRoot.style.getPropertyPriority('display'), 'important');
assert.equal(preview.errors.length, 0);

const live = runtime({mode: 'live'});
live.run();
live.run();
assert.equal(live.calls.length, 1, 'Loading the renderer twice must not duplicate the page view');
assert.equal(live.document.body.children.length, 1, 'Loading the renderer twice must not duplicate the page');
assert.equal(live.calls[0].type, 'view');
const payload = live.calls[0].data;
assert.equal(payload.cfg.noview, true);
assert.deepEqual(Array.from(payload.event, event => event.eventInfo.eventName), ['page_view']);
assert.equal(payload.page.pageInfo.destinationURL, 'https://www.promotion25.com/ar/gaes/gracias/');
assert.equal(payload.user.profileInfoClearText.email, '');
assert.equal(payload.user.profileInfoClearText.phone, '');
assert.equal(payload.form.evetTYPType, '');
assert.equal(JSON.stringify(payload).includes('synthetic'), false, 'Query contacts must never enter the tracking payload');
assert.equal(live.errors.length, 0);

const reload = runtime({mode: 'live'});
reload.run();
assert.equal(reload.calls.length, 1);
assert.deepEqual(Array.from(reload.calls[0].data.event, event => event.eventInfo.eventName), ['page_view']);

const waiting = runtime({mode: 'live', loading: true});
waiting.run();
waiting.run();
assert.equal(waiting.calls.length, 0);
waiting.ready();
assert.equal(waiting.calls.length, 1);

const disabled = runtime({mode: 'live', tracking: false});
disabled.run();
assert.equal(disabled.calls.length, 0);
const unavailable = runtime({mode: 'live', unavailable: true});
unavailable.run();
assert.equal(unavailable.window.AmplifonApp.typ.inspect().pageView, 'unavailable');
assert.equal(unavailable.calls.length, 0);
const invalid = runtime({mode: 'live', missingIdentity: true});
invalid.run();
assert.equal(invalid.window.AmplifonApp.typ.inspect().error, 'TYP_ANALYTICS_ID');
assert.equal(invalid.calls.length, 0);
assert.equal(invalid.document.body.children.length, 0);

console.log('Standalone TYP checks: preview isolation, page-view-only payload, duplicate boot, reload, DOM ready, unavailable tracking and invalid identity: OK');
