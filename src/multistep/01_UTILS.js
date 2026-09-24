/* 02 — UTILITY, VALIDAZIONI E CICLO DI VITA. Nessun tracking, rendering o submit. */
(function (w, d) {
  'use strict';
  const App = w.AmplifonApp = w.AmplifonApp || {version: '1.0.0', modules: {}};
  if (App.modules.utils) return;

  function assert(condition, code) { if (!condition) throw new Error(code); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function clean(value) { return String(value == null ? '' : value).trim().replace(/\s+/gu, ' '); }
  function uid() {
    return w.crypto && typeof w.crypto.randomUUID === 'function'
      ? w.crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }
  function ready(callback) {
    if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', callback, {once: true});
    else callback();
  }
  function waitFor(test, timeout, signal) {
    return new Promise(function (resolve, reject) {
      const started = Date.now();
      let timer;
      function cleanup() { clearTimeout(timer); if (signal) signal.removeEventListener('abort', abort); }
      function abort() { cleanup(); reject(new Error('ABORTED')); }
      function tick() {
        if (signal && signal.aborted) return abort();
        try {
          const value = test();
          if (value) { cleanup(); resolve(value); return; }
        } catch (error) { cleanup(); reject(error); return; }
        if (Date.now() - started >= timeout) { cleanup(); reject(new Error('DEPENDENCY_TIMEOUT')); return; }
        timer = setTimeout(tick, 100);
      }
      if (signal) signal.addEventListener('abort', abort, {once: true});
      tick();
    });
  }
  function node(tag, attributes, children) {
    const element = d.createElement(tag);
    Object.entries(attributes || {}).forEach(function (entry) {
      const key = entry[0], value = entry[1];
      if (value === null || value === undefined || value === false) return;
      if (key === 'class') element.className = value;
      else if (key === 'text') element.textContent = value;
      else if (key === 'hidden') element.hidden = true;
      else element.setAttribute(key, value === true ? '' : String(value));
    });
    (Array.isArray(children) ? children : children == null ? [] : [children]).forEach(function (child) {
      if (child != null) element.append(child instanceof Node ? child : d.createTextNode(String(child)));
    });
    return element;
  }
  function safeUrl(raw, base) {
    try {
      const url = new URL(String(raw), base || w.location.href);
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url : null;
    } catch (_) { return null; }
  }
  function phone(raw, rules) {
    let text = clean(raw);
    if (!text || /[^\d\s()+.\-]/u.test(text)) return null;
    const plus = (text.match(/\+/g) || []).length;
    if (plus > 1 || (plus && text[0] !== '+')) return null;
    // Un prefisso esplicito +49 (0) viene normalizzato una volta sola.
    text = text.replace(new RegExp('^(\\+|00)' + rules.callingCode + '\\s*\\(0\\)'), '+' + rules.callingCode);
    let compact = text.replace(/[\s().\-]/g, '');
    if (compact.startsWith('00')) compact = '+' + compact.slice(2);
    let international = compact.startsWith('+');
    let digits = compact.replace(/^\+/, '');
    if (!/^\d+$/.test(digits)) return null;
    if (international) {
      if (!/^[1-9]\d{6,14}$/.test(digits)) return null;
      if (digits.startsWith(rules.callingCode)) {
        const national = digits.slice(rules.callingCode.length);
        if (national.startsWith('0') || national.length < rules.minNationalDigits || national.length > rules.maxNationalDigits) return null;
      } else if (!rules.allowInternational) return null;
    } else {
      if (digits.startsWith(rules.trunkPrefix)) digits = digits.slice(rules.trunkPrefix.length);
      if (!digits || digits.startsWith('0') || digits.length < rules.minNationalDigits || digits.length > rules.maxNationalDigits) return null;
      digits = rules.callingCode + digits;
      if (digits.length > 15) return null;
    }
    return '+' + digits;
  }
  function phoneFor(value, format, rules) {
    if (format === 'digits') return value.replace(/^\+/, '');
    if (format === 'national' && value.startsWith('+' + rules.callingCode)) return rules.trunkPrefix + value.slice(rules.callingCode.length + 1);
    return value;
  }
  function normalize(values, config) {
    return {
      first_name: clean(values.first_name), last_name: clean(values.last_name),
      email: String(values.email || '').trim(),
      phone_number: phone(values.phone_number, config.validation),
      zipcode: String(values.zipcode || '').trim(),
      privacy_flag: values.privacy_flag === true,
      marketing_flag: values.marketing_flag === true
    };
  }
  function validate(values, config) {
    const errors = {}, required = new Set(config.form.required);
    ['first_name', 'last_name'].forEach(function (key) {
      if (!values[key]) { if (required.has(key)) errors[key] = config.copy.errors.required; }
      else if (values[key].length > config.validation.nameMaxLength || !/^[\p{L}\p{M}][\p{L}\p{M} '\u2019.\-]*$/u.test(values[key])) errors[key] = config.copy.errors.name;
    });
    if (!values.email) { if (required.has('email')) errors.email = config.copy.errors.required; }
    else if (values.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = config.copy.errors.email;
    if (!values.phone_number && required.has('phone_number')) errors.phone_number = config.copy.errors.phone;
    if (!new RegExp(config.validation.postcodePattern).test(values.zipcode)) errors.zipcode = config.copy.errors.postcode;
    if (required.has('privacy_flag') && !values.privacy_flag) errors.privacy_flag = config.copy.errors.privacy;
    return errors;
  }
  function validateConfig(c) {
    assert(c && c.schemaVersion === 1, 'CONFIG_SCHEMA');
    assert(['staging', 'live', 'preview'].includes(c.runtime.mode), 'CONFIG_MODE');
    assert(/^[A-Za-z][A-Za-z0-9_-]*$/.test(c.runtime.rootId), 'CONFIG_ROOT_ID');
    const topKeys = ['schemaVersion', 'version', 'framework', 'runtime', 'page', 'release', 'assets', 'theme', 'form', 'validation', 'attribution', 'tracking', 'success', 'funnel', 'copy', 'reviews'];
    Object.keys(c).forEach(key => assert(topKeys.includes(key), 'CONFIG_UNKNOWN_KEY:' + key));
    assert(typeof c.tracking.consentReader === 'function', 'CONFIG_CONSENT_READER');
    assert(['e164', 'digits', 'national'].includes(c.form.phoneFormat), 'CONFIG_PHONE_FORMAT');
    assert(['e164', 'digits', 'national'].includes(c.tracking.phoneFormat), 'CONFIG_TRACKING_PHONE_FORMAT');
    const map = new Map(), numbers = new Set();
    c.funnel.steps.forEach(function (step) {
      assert(step.id && step.id !== 'contact' && !map.has(step.id), 'CONFIG_STEP_ID');
      assert(['choice', 'postcode'].includes(step.type), 'CONFIG_STEP_TYPE');
      assert(Number.isInteger(step.trackingNumber) && !numbers.has(step.trackingNumber), 'CONFIG_TRACKING_NUMBER');
      assert(typeof step.title === 'string' && step.title.length > 0, 'CONFIG_STEP_TITLE');
      map.set(step.id, step); numbers.add(step.trackingNumber);
      if (step.type === 'choice') {
        assert(Array.isArray(step.options) && step.options.length > 0, 'CONFIG_OPTIONS');
        const options = new Set();
        step.options.forEach(function (option) {
          assert(option.id && !options.has(option.id), 'CONFIG_OPTION_ID'); options.add(option.id);
          assert(typeof option.reject === 'boolean', 'CONFIG_REJECTION');
        });
      }
    });
    assert(map.has(c.funnel.start), 'CONFIG_START');
    map.forEach(step => (step.options || [{next: step.next}]).forEach(option => assert(option.next === 'contact' || map.has(option.next), 'CONFIG_NEXT')));
    const visiting = new Set(), visited = new Set();
    function visit(id) {
      if (id === 'contact') return;
      assert(!visiting.has(id), 'CONFIG_CYCLE'); if (visited.has(id)) return;
      visiting.add(id);
      const step = map.get(id); (step.options || [{next: step.next}]).forEach(option => visit(option.next));
      visiting.delete(id); visited.add(id);
    }
    visit(c.funnel.start);
    assert(visited.size === map.size, 'CONFIG_UNREACHABLE_STEP');
    c.form.required.forEach(key => assert(key in c.form.fields, 'CONFIG_REQUIRED_MAPPING'));
    Object.keys(c.form.technicalValues).forEach(function (key) {
      assert(c.form.technicalAllowlist.includes(key), 'CONFIG_TECHNICAL_FIELD');
      assert(!Object.values(c.form.attributionFields).includes(key), 'CONFIG_TECHNICAL_ATTRIBUTION_COLLISION');
    });
    if (c.tracking.enabled) assert(c.page.pageID && !c.tracking.forbiddenPageIDs.includes(String(c.page.pageID)), 'CONFIG_ANALYTICS_ID');
    if (c.success.redirectUrl) {
      const url = safeUrl(c.success.redirectUrl);
      assert(url && url.protocol === 'https:' && c.success.allowedRedirectOrigins.includes(url.origin) && url.pathname.startsWith(c.success.requiredPathPrefix), 'CONFIG_REDIRECT');
    }
    c.reviews.forEach(review => assert(review.rating === null || (Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5), 'CONFIG_REVIEW_RATING'));
    return true;
  }
  function releaseBlocks(c) {
    const blocks = [];
    if (c.runtime.mode !== 'live') blocks.push('MODE_NOT_LIVE');
    Object.entries(c.release).forEach(([key, value]) => { if (value !== true) blocks.push('REVIEW:' + key); });
    return blocks;
  }

  App.modules.utils = {assert, clone, clean, uid, ready, waitFor, node, safeUrl, phone, phoneFor, normalize, validate, validateConfig, releaseBlocks};
})(window, document);
