/* Amplifon Framework - multistep v1.0.5 | generated; edit src/, not dist/ */

/* ===== 01_UTILS.js ===== */
/* 02 — UTILITY, VALIDAZIONI E CICLO DI VITA. Nessun tracking, rendering o submit. */
(function (w, d) {
  'use strict';

  const configuredVersion =
    w.AMPLIFON_CONFIG &&
    w.AMPLIFON_CONFIG.framework &&
    w.AMPLIFON_CONFIG.framework.version
      ? String(w.AMPLIFON_CONFIG.framework.version)
      : 'unknown';

  const App = w.AmplifonApp = w.AmplifonApp || {version: configuredVersion, modules: {}};
  App.version = configuredVersion;

  if (App.modules.utils) return;

  function assert(condition, code) { if (!condition) throw new Error(code); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function clean(value) { return String(value == null ? '' : value).trim().replace(/\s+/gu, ' '); }

  function uid() {
    return w.crypto && typeof w.crypto.randomUUID === 'function'
      ? w.crypto.randomUUID()
      : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }

  function ready(callback) {
    if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', callback, {once: true});
    else callback();
  }

  function waitFor(test, timeout, signal) {
    return new Promise(function (resolve, reject) {
      const started = Date.now();
      let timer;

      function cleanup() {
        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', abort);
      }

      function abort() {
        cleanup();
        reject(new Error('ABORTED'));
      }

      function tick() {
        if (signal && signal.aborted) return abort();

        try {
          const value = test();
          if (value) {
            cleanup();
            resolve(value);
            return;
          }
        } catch (error) {
          cleanup();
          reject(error);
          return;
        }

        if (Date.now() - started >= timeout) {
          cleanup();
          reject(new Error('DEPENDENCY_TIMEOUT'));
          return;
        }

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
      if (child != null) {
        element.append(child instanceof Node ? child : d.createTextNode(String(child)));
      }
    });

    return element;
  }

  function safeUrl(raw, base) {
    try {
      const url = new URL(String(raw), base || w.location.href);
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url : null;
    } catch (_) {
      return null;
    }
  }

  function phone(raw, rules) {
    let text = clean(raw);

    if (!text || /[^\d\s()+.\-]/u.test(text)) return null;

    const plus = (text.match(/\+/g) || []).length;
    if (plus > 1 || (plus && text[0] !== '+')) return null;

    text = text.replace(
      new RegExp('^(\\+|00)' + rules.callingCode + '\\s*\\(0\\)'),
      '+' + rules.callingCode
    );

    let compact = text.replace(/[\s().\-]/g, '');
    if (compact.startsWith('00')) compact = '+' + compact.slice(2);

    const international = compact.startsWith('+');
    let digits = compact.replace(/^\+/, '');

    if (!/^\d+$/.test(digits)) return null;

    if (international) {
      if (!/^[1-9]\d{6,14}$/.test(digits)) return null;

      if (digits.startsWith(rules.callingCode)) {
        const national = digits.slice(rules.callingCode.length);

        if (
          national.startsWith('0') ||
          national.length < rules.minNationalDigits ||
          national.length > rules.maxNationalDigits
        ) {
          return null;
        }
      } else if (!rules.allowInternational) {
        return null;
      }
    } else {
      if (digits.startsWith(rules.trunkPrefix)) {
        digits = digits.slice(rules.trunkPrefix.length);
      }

      if (
        !digits ||
        digits.startsWith('0') ||
        digits.length < rules.minNationalDigits ||
        digits.length > rules.maxNationalDigits
      ) {
        return null;
      }

      digits = rules.callingCode + digits;

      if (digits.length > 15) return null;
    }

    return '+' + digits;
  }

  function phoneFor(value, format, rules) {
    if (!value) return '';

    if (format === 'digits') return value.replace(/^\+/, '');

    if (
      format === 'national' &&
      value.startsWith('+' + rules.callingCode)
    ) {
      return rules.trunkPrefix + value.slice(rules.callingCode.length + 1);
    }

    return value;
  }

  function normalize(values, config) {
    return {
      first_name: clean(values.first_name),
      last_name: clean(values.last_name),
      email: String(values.email || '').trim(),
      phone_number: phone(values.phone_number, config.validation),
      zipcode: String(values.zipcode || '').trim(),
      privacy_flag: values.privacy_flag === true,
      marketing_flag: values.marketing_flag === true
    };
  }

  function validate(values, config) {
    const errors = {};
    const required = new Set(config.form.required);

    ['first_name', 'last_name'].forEach(function (key) {
      if (!values[key]) {
        if (required.has(key)) errors[key] = config.copy.errors.required;
      } else if (
        values[key].length > config.validation.nameMaxLength ||
        !/^[\p{L}\p{M}][\p{L}\p{M} '\u2019.\-]*$/u.test(values[key])
      ) {
        errors[key] = config.copy.errors.name;
      }
    });

    if (!values.email) {
      if (required.has('email')) errors.email = config.copy.errors.required;
    } else if (
      values.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)
    ) {
      errors.email = config.copy.errors.email;
    }

    if (!values.phone_number && required.has('phone_number')) {
      errors.phone_number = config.copy.errors.phone;
    }

    if (!new RegExp(config.validation.postcodePattern).test(values.zipcode)) {
      errors.zipcode = config.copy.errors.postcode;
    }

    if (required.has('privacy_flag') && !values.privacy_flag) {
      errors.privacy_flag = config.copy.errors.privacy;
    }

    return errors;
  }

  function validateConfig(c) {
    assert(c && c.schemaVersion === 1, 'CONFIG_SCHEMA');
    assert(['staging', 'live', 'preview'].includes(c.runtime.mode), 'CONFIG_MODE');
    assert(/^[A-Za-z][A-Za-z0-9_-]*$/.test(c.runtime.rootId), 'CONFIG_ROOT_ID');

    const topKeys = [
      'schemaVersion',
      'version',
      'runtime',
      'framework',
      'page',
      'release',
      'assets',
      'theme',
      'form',
      'validation',
      'attribution',
      'tracking',
      'success',
      'funnel',
      'copy',
      'reviews'
    ];

    Object.keys(c).forEach(function (key) {
      assert(topKeys.includes(key), 'CONFIG_UNKNOWN_KEY:' + key);
    });

    const consentMode = c.tracking.consentMode || 'reader';
    const contactDataMode = c.tracking.contactDataMode || 'reader';

    assert(
      ['reader', 'domain-managed'].includes(consentMode),
      'CONFIG_CONSENT_MODE'
    );

    assert(
      ['reader', 'legacy', 'none'].includes(contactDataMode),
      'CONFIG_CONTACT_DATA_MODE'
    );

    if (consentMode === 'reader' || contactDataMode === 'reader') {
      assert(
        typeof c.tracking.consentReader === 'function',
        'CONFIG_CONSENT_READER'
      );
    }

    assert(
      ['e164', 'digits', 'national'].includes(c.form.phoneFormat),
      'CONFIG_PHONE_FORMAT'
    );

    assert(
      ['e164', 'digits', 'national'].includes(c.tracking.phoneFormat),
      'CONFIG_TRACKING_PHONE_FORMAT'
    );

    const map = new Map();
    const numbers = new Set();

    c.funnel.steps.forEach(function (step) {
      assert(step.id && step.id !== 'contact' && !map.has(step.id), 'CONFIG_STEP_ID');
      assert(['choice', 'postcode'].includes(step.type), 'CONFIG_STEP_TYPE');
      assert(
        Number.isInteger(step.trackingNumber) && !numbers.has(step.trackingNumber),
        'CONFIG_TRACKING_NUMBER'
      );
      assert(
        typeof step.title === 'string' && step.title.length > 0,
        'CONFIG_STEP_TITLE'
      );

      map.set(step.id, step);
      numbers.add(step.trackingNumber);

      if (step.type === 'choice') {
        assert(Array.isArray(step.options) && step.options.length > 0, 'CONFIG_OPTIONS');

        const options = new Set();

        step.options.forEach(function (option) {
          assert(option.id && !options.has(option.id), 'CONFIG_OPTION_ID');
          options.add(option.id);
          assert(typeof option.reject === 'boolean', 'CONFIG_REJECTION');
        });
      }
    });

    assert(map.has(c.funnel.start), 'CONFIG_START');

    map.forEach(function (step) {
      (step.options || [{next: step.next}]).forEach(function (option) {
        assert(
          option.next === 'contact' || map.has(option.next),
          'CONFIG_NEXT'
        );
      });
    });

    const visiting = new Set();
    const visited = new Set();

    function visit(id) {
      if (id === 'contact') return;

      assert(!visiting.has(id), 'CONFIG_CYCLE');

      if (visited.has(id)) return;

      visiting.add(id);

      const step = map.get(id);

      (step.options || [{next: step.next}]).forEach(function (option) {
        visit(option.next);
      });

      visiting.delete(id);
      visited.add(id);
    }

    visit(c.funnel.start);

    assert(visited.size === map.size, 'CONFIG_UNREACHABLE_STEP');

    c.form.required.forEach(function (key) {
      assert(key in c.form.fields, 'CONFIG_REQUIRED_MAPPING');
    });

    Object.keys(c.form.technicalValues).forEach(function (key) {
      assert(
        c.form.technicalAllowlist.includes(key),
        'CONFIG_TECHNICAL_FIELD'
      );

      assert(
        !Object.values(c.form.attributionFields).includes(key),
        'CONFIG_TECHNICAL_ATTRIBUTION_COLLISION'
      );
    });

    if (c.tracking.enabled) {
      assert(
        c.page.pageID &&
        !c.tracking.forbiddenPageIDs.includes(String(c.page.pageID)),
        'CONFIG_ANALYTICS_ID'
      );
    }

    if (c.success.redirectUrl) {
      const url = safeUrl(c.success.redirectUrl);

      assert(
        url &&
        url.protocol === 'https:' &&
        c.success.allowedRedirectOrigins.includes(url.origin) &&
        url.pathname.startsWith(c.success.requiredPathPrefix),
        'CONFIG_REDIRECT'
      );
    }

    c.reviews.forEach(function (review) {
      assert(
        review.rating === null ||
        (
          Number.isInteger(review.rating) &&
          review.rating >= 1 &&
          review.rating <= 5
        ),
        'CONFIG_REVIEW_RATING'
      );
    });

    return true;
  }

  function releaseBlocks(c) {
    const blocks = [];

    if (c.runtime.mode !== 'live') {
      blocks.push('MODE_NOT_LIVE');
    }

    Object.entries(c.release).forEach(function ([key, value]) {
      if (value !== true) blocks.push('REVIEW:' + key);
    });

    return blocks;
  }

  App.modules.utils = {
    assert,
    clone,
    clean,
    uid,
    ready,
    waitFor,
    node,
    safeUrl,
    phone,
    phoneFor,
    normalize,
    validate,
    validateConfig,
    releaseBlocks
  };
})(window, document);

/* ===== 02_TRACKING.js ===== */
/* ============================================================================
 * 03 — TRACKING LEGACY LEGGIBILE
 * Input: snapshot del percorso. Output: digitalData / wa_gc / direct call Adobe.
 * Non legge i campi dal DOM, non decide lo step, non invia il form.
 * API: trackStepView, trackAnswer, trackFormView, trackFormSubmit,
 *      trackFormSent, trackRejection. Il mapping è SOLO nello SCRIPT 1.
 * ========================================================================== */
(function (w) {
  'use strict';

  const App = w.AmplifonApp;
  const U = App.modules.utils;

  if (App.modules.tracking) return;

  function create(config) {
    const c = config;
    const queue = [];
    const records = [];
    const identities = new Set();
    const contactTimers = new Set();

    let timer = null;
    let destroyed = false;

    function consentMode() {
      return c.tracking.consentMode || 'reader';
    }

    function contactDataMode() {
      return c.tracking.contactDataMode || 'reader';
    }

    function readConsent(destination) {
      try {
        const state = c.tracking.consentReader(destination);
        return state === true ? true : state === false ? false : null;
      } catch (_) {
        return null;
      }
    }

    /*
     * domain-managed:
     * il framework non blocca l'emissione perché la policy dei tag viene gestita
     * dal layer/CMP già presente a livello dominio.
     *
     * reader:
     * il framework attende un consenso esplicito dal consentReader.
     */
    function deliveryPermission(destination) {
      if (consentMode() === 'domain-managed') return true;
      return readConsent(destination);
    }

    /*
     * La policy di trasporto e la policy dei dati di contatto sono separate.
     * - reader: include PII solo se advertising=true dal consentReader
     * - legacy: mantiene il contratto legacy della pagina
     * - none: non inserisce PII nel payload tracking
     */
    function contactPermission() {
      const mode = contactDataMode();

      if (mode === 'none') return false;
      if (mode === 'legacy') return true;

      return readConsent('advertising') === true;
    }

    function dataLayer(context, eventName, contact, isLead) {
      const questions = [];
      const answers = [];

      (context.path || []).forEach(function (id) {
        const step = c.funnel.steps.find(function (item) {
          return item.id === id;
        });

        if (!step) return;

        questions.push({
          id: step.trackingNumber,
          text: step.trackingQuestion
        });

        const answer = context.answers[id];

        if (
          answer &&
          (
            id !== context.current ||
            eventName === c.tracking.events.rejection
          )
        ) {
          answers.push({
            id: step.trackingNumber,
            text: answer.trackingLabel
          });
        }
      });

      const payload = {
        page: {
          pageInfo: {
            pageID: String(c.page.pageID || ''),
            pageName: isLead ? c.page.leadPageName : c.page.pageName,
            destinationURL: w.location.href,
            referringURL: dReferrer(),
            sysEnv: deviceType(),
            Version: c.page.trackingVersion,
            Language: c.page.language,
            geoRegion: c.page.region,
            transactionID: c.page.transactionID
          }
        },

        event: [
          {
            eventInfo: {
              eventName: eventName
            }
          }
        ],

        form: {
          questionID: questions.map(function (item) { return item.id; }),
          questionString: questions.map(function (item) { return item.text; }),
          answerID: answers.map(function (item) { return item.id; }),
          answerString: answers.map(function (item) { return item.text; }),
          evetTYPType: isLead ? '1' : ''
        },

        user: {
          profileInfoClearText: {
            phone: '',
            email: ''
          }
        }
      };

      if (isLead || c.tracking.noView === true) {
        payload.cfg = payload.cfg || {};
        payload.cfg.noview = true;
      }

      if (contact && contactPermission()) {
        payload.user.profileInfoClearText.email = contact.email;

        payload.user.profileInfoClearText.phone = U.phoneFor(
          contact.phone_number,
          c.tracking.phoneFormat,
          c.validation
        );
      }

      return payload;
    }

    function dReferrer() {
      return typeof document !== 'undefined'
        ? document.referrer || ''
        : '';
    }

    function deviceType() {
      const ua = navigator.userAgent;

      if (/iPad|Tablet/i.test(ua)) return 'Tablet';
      if (/Mobi|Android|iPhone/i.test(ua)) return 'Mobile';

      return 'Desktop';
    }

    function remember(eventName, destination, status, identity) {
      const row = {
        eventName: eventName,
        destination: destination,
        status: status,
        identity: identity,
        time: Date.now()
      };

      records.push(row);

      if (records.length > 120) {
        records.shift();
      }

      if (c.runtime.debug) {
        console.info(
          '[AMP tracking]',
          eventName,
          destination,
          status
        );
      }

      return row;
    }

    function clearContact(payload) {
      if (
        payload &&
        payload.user &&
        payload.user.profileInfoClearText
      ) {
        payload.user.profileInfoClearText.email = '';
        payload.user.profileInfoClearText.phone = '';
      }
    }

    function destinationAvailable(item) {
      if (item.destination === 'wa_gc') {
        return typeof w.wa_gc === 'function';
      }

      return !!(
        w._satellite &&
        typeof w._satellite.track === 'function'
      );
    }

    function publish(item) {
      const payload = item.makePayload();

      w.digitalData = payload;

      if (item.destination === 'wa_gc') {
        w.wa_gc(U.clone(payload), 'view');
      } else {
        w._satellite.track(
          item.directCall,
          {
            eventId: item.identity,
            digitalData: U.clone(payload)
          }
        );
      }

      item.row.status = 'dispatched';

      const timeout = setTimeout(function () {
        clearContact(payload);
        contactTimers.delete(timeout);
      }, c.tracking.contactLifetimeMs);

      contactTimers.add(timeout);
    }

    function flush() {
      clearTimeout(timer);
      timer = null;

      if (destroyed) return;

      for (let i = 0; i < queue.length;) {
        const item = queue[i];

        const permission = deliveryPermission(
          item.destination === 'wa_gc'
            ? 'analytics'
            : 'advertising'
        );

        if (permission === false) {
          item.row.status = 'denied';
          queue.splice(i, 1);
          continue;
        }

        if (Date.now() > item.expires) {
          item.row.status = destinationAvailable(item)
            ? 'expired'
            : 'dependency-expired';

          queue.splice(i, 1);
          continue;
        }

        if (permission !== true || !destinationAvailable(item)) {
          i++;
          continue;
        }

        queue.splice(i, 1);

        try {
          publish(item);
        } catch (_) {
          item.row.status = 'dispatch-error';

          if (w.digitalData) {
            clearContact(w.digitalData);
          }
        }
      }

      if (queue.length) {
        timer = setTimeout(
          flush,
          c.tracking.retryEveryMs
        );
      }
    }

    function enqueue(
      eventName,
      destination,
      makePayload,
      identity,
      directCall
    ) {
      const key = identity || U.uid();
      const dedupeKey = destination + ':' + key;

      if (identities.has(dedupeKey)) return;

      identities.add(dedupeKey);

      const active =
        c.tracking.enabled &&
        c.runtime.mode !== 'preview';

      const row = remember(
        eventName,
        destination,
        active ? 'pending' : 'disabled',
        key
      );

      if (!active) return;

      if (queue.length >= c.tracking.maxQueue) {
        row.status = 'overflow';
        return;
      }

      queue.push({
        eventName: eventName,
        destination: destination,
        makePayload: makePayload,
        identity: key,
        directCall: directCall,
        row: row,
        expires: Date.now() + c.tracking.queueTtlMs
      });

      flush();
    }

    function trackStepView(step, context) {
      const snapshot = U.clone(context);

      const name =
        step.id === c.funnel.start
          ? c.tracking.events.firstView
          : step.viewEvent;

      enqueue(
        name,
        'wa_gc',
        function () {
          return dataLayer(snapshot, name, null, false);
        }
      );
    }

    function trackAnswer() {
      /*
       * Nessun trigger separato.
       * La risposta entra nello snapshot della view successiva.
       */
    }

    function trackFormView(context) {
      const snapshot = U.clone(context);
      const name = c.tracking.events.formView;

      enqueue(
        name,
        'wa_gc',
        function () {
          return dataLayer(snapshot, name, null, false);
        }
      );
    }

    function trackFormSubmit(attempt) {
      const snapshot = U.clone(attempt.context);
      const name = c.tracking.events.submit;

      const contact = c.tracking.contactOnSubmit
        ? U.clone(attempt.values)
        : null;

      const make = function () {
        return dataLayer(snapshot, name, contact, false);
      };

      enqueue(
        name,
        'wa_gc',
        make,
        attempt.id + ':submit'
      );

      if (c.tracking.directCalls.submit) {
        enqueue(
          name,
          'satellite',
          make,
          attempt.id + ':submit',
          c.tracking.directCalls.submit
        );
      }
    }

    function trackFormSent(attempt) {
      const snapshot = U.clone(attempt.context);
      const name = c.tracking.events.success;

      const contact = c.tracking.contactOnSuccess
        ? U.clone(attempt.values)
        : null;

      const make = function () {
        return dataLayer(snapshot, name, contact, true);
      };

      if (c.tracking.sendSuccessToWaGc) {
        enqueue(
          name,
          'wa_gc',
          make,
          attempt.id + ':success'
        );
      }

      if (c.tracking.directCalls.success) {
        enqueue(
          name,
          'satellite',
          make,
          attempt.id + ':success',
          c.tracking.directCalls.success
        );
      }
    }

    function trackRejection(context) {
      const snapshot = U.clone(context);
      const name = c.tracking.events.rejection;

      enqueue(
        name,
        'wa_gc',
        function () {
          return dataLayer(snapshot, name, null, false);
        }
      );
    }

    function destroy() {
      destroyed = true;

      clearTimeout(timer);
      queue.splice(0);

      contactTimers.forEach(clearTimeout);
      contactTimers.clear();

      if (w.digitalData) {
        clearContact(w.digitalData);
      }
    }

    function inspect() {
      return {
        enabled: c.tracking.enabled === true,
        consentMode: consentMode(),
        contactDataMode: contactDataMode(),
        dependencies: {
          wa_gc: typeof w.wa_gc === 'function',
          satellite: !!(
            w._satellite &&
            typeof w._satellite.track === 'function'
          )
        },
        consent: {
          analytics:
            consentMode() === 'domain-managed'
              ? 'domain-managed'
              : readConsent('analytics'),
          advertising:
            consentMode() === 'domain-managed'
              ? 'domain-managed'
              : readConsent('advertising')
        },
        pending: queue.length,
        events: U.clone(records)
      };
    }

    return {
      trackStepView: trackStepView,
      trackAnswer: trackAnswer,
      trackFormView: trackFormView,
      trackFormSubmit: trackFormSubmit,
      trackFormSent: trackFormSent,
      trackRejection: trackRejection,

      consentChanged: function () {
        if (
          contactDataMode() === 'reader' &&
          readConsent('advertising') !== true &&
          w.digitalData
        ) {
          clearContact(w.digitalData);
        }

        flush();
      },

      inspect: inspect,
      destroy: destroy
    };
  }

  App.modules.tracking = {create: create};
})(window);

/* ===== 03_ATTRIBUTION.js ===== */
/* ============================================================================
 * 04 — ATTRIBUTION / MCI / SORG / ADCLID / ICMP
 * Nessun dato personale.
 *
 * Responsabilità:
 * - legge i parametri ammessi dall'URL;
 * - completa i valori dai campi nativi / fallback;
 * - registra l'ICMP dell'ultima interazione;
 * - opzionalmente aggiorna l'URL corrente SENZA reload;
 * - decora i link esplicitamente ammessi.
 * ========================================================================== */
(function (w) {
  'use strict';

  const App = w.AmplifonApp;
  const U = App.modules.utils;

  if (App.modules.attribution) return;

  function create(c, sourceSearch) {
    const values = {};
    const origins = {};

    const input = new URLSearchParams(
      sourceSearch === undefined
        ? w.location.search
        : sourceSearch
    );

    function allowed(value) {
      return (
        typeof value === 'string' &&
        value.length > 0 &&
        value.length <= c.attribution.maxLength &&
        !/[\u0000-\u001f\u007f]/.test(value)
      );
    }

    function allowedParam(key) {
      return c.attribution.allowedParams.includes(key);
    }

    c.attribution.allowedParams.forEach(function (key) {
      const value = input.get(key);

      if (allowed(value)) {
        values[key] = value;
        origins[key] = 'url';
      }
    });

    function useNative(read) {
      Object.entries(c.form.attributionFields).forEach(
        function ([key, fieldName]) {
          if (values[key] && origins[key] !== 'config') return;

          const value = read(fieldName);

          if (allowed(value)) {
            values[key] = value;
            origins[key] = 'native';
          }
        }
      );

      if (
        !values.mci &&
        allowed(c.attribution.fallbackMci)
      ) {
        values.mci = c.attribution.fallbackMci;
        origins.mci = 'config';
      }
    }

    function decorateAllowedParams(url) {
      c.attribution.allowedParams.forEach(function (key) {
        if (values[key]) {
          url.searchParams.set(key, values[key]);
        } else {
          url.searchParams.delete(key);
        }
      });

      return url;
    }

    function updateCurrentUrl() {
      if (c.attribution.updateUrl === false) return;
      if (!w.history || typeof w.history.replaceState !== 'function') return;

      try {
        const current = new URL(w.location.href);

        decorateAllowedParams(current);

        w.history.replaceState(
          w.history.state,
          '',
          current.pathname +
          current.search +
          current.hash
        );
      } catch (_) {
        /* Attribution non deve mai bloccare il funnel. */
      }
    }

    function interaction(icmp) {
      if (!allowed(icmp)) return false;

      values.icmp = icmp;
      origins.icmp = 'interaction';

      updateCurrentUrl();

      return true;
    }

    function decorate(href) {
      const url = U.safeUrl(href);

      if (
        !url ||
        !c.attribution.allowedLinkOrigins.includes(url.origin)
      ) {
        return href;
      }

      decorateAllowedParams(url);

      return url.toString();
    }

    /*
     * All'avvio leggiamo solo il contesto disponibile.
     * Non modifichiamo l'URL finché non avviene un'interazione.
     */
    useNative(function () {
      return '';
    });

    return {
      useNative: useNative,
      interaction: interaction,
      decorate: decorate,
      updateCurrentUrl: updateCurrentUrl,

      snapshot: function () {
        return U.clone(values);
      },

      inspect: function () {
        return {
          present: Object.keys(values),
          values: U.clone(values),
          origins: U.clone(origins),
          urlUpdateEnabled: c.attribution.updateUrl !== false
        };
      }
    };
  }

  App.modules.attribution = {
    create: create
  };
})(window);

/* ===== 04_RENDERER.js ===== */
/* 05 — RENDERER. Tutto il markup visibile nasce dalla CONFIG, non dal DOM legacy. */
(function (w, d) {
  'use strict';

  const App = w.AmplifonApp;
  const U = App.modules.utils;

  if (App.modules.renderer) return;

  function create(c) {
    const N = U.node;
    const signalOwner = new AbortController();

    let actions = {};
    let current = null;

    const root = N('div', {
      id: c.runtime.rootId,
      class: 'amp-app'
    });

    const content = N('main', {
      class: 'amp-main'
    });

    const quizView = N('div', {
      'data-amp-view': 'quiz'
    });

    const contactView = N(
      'section',
      {
        'data-amp-view': 'contact',
        class: 'amp-contact amp-shell',
        hidden: true
      }
    );

    const successView = N(
      'section',
      {
        'data-amp-view': 'success',
        class: 'amp-confirmation amp-shell',
        hidden: true
      }
    );

    const stepCard = N(
      'section',
      {
        class: 'amp-question-card',
        'aria-labelledby': 'amp-question-title'
      }
    );

    const controls = {};
    const errors = {};

    const status = N(
      'p',
      {
        class: 'amp-form-status',
        role: 'status',
        'aria-live': 'polite',
        hidden: true
      }
    );

    const form = N(
      'form',
      {
        class: 'amp-contact-form',
        id: 'amp-contact-form',
        novalidate: true
      }
    );

    const sendButton = N(
      'button',
      {
        type: 'submit',
        class: 'amp-button amp-submit',
        text: c.copy.submit
      }
    );

    const original = {
      lang: d.documentElement.lang,
      title: d.title
    };

    function assetUrl(source) {
      if (!source) return '';

      const value = String(source).trim();

      if (!value) return '';

      if (/^https?:\/\//i.test(value)) {
        const absolute = U.safeUrl(value);
        return absolute ? absolute.toString() : '';
      }

      const base =
        c.assets &&
        c.assets.repositoryBase
          ? U.safeUrl(c.assets.repositoryBase)
          : null;

      if (!base) {
        if (c.runtime.debug) {
          console.warn(
            '[AMP renderer] repositoryBase mancante:',
            value
          );
        }

        return '';
      }

      const resolved = U.safeUrl(
        value,
        base.toString()
      );

      return resolved
        ? resolved.toString()
        : '';
    }

    function img(source, alt, className, eager) {
      const src = assetUrl(source);

      if (!src) return null;

      return N(
        'img',
        {
          src: src,
          alt: alt || '',
          class: className,
          decoding: 'async',
          loading: eager ? 'eager' : 'lazy'
        }
      );
    }

    function safeFocus(element) {
      if (!element || typeof element.focus !== 'function') return;

      try {
        element.focus({preventScroll: true});
      } catch (_) {
        /*
         * Non usiamo focus() come fallback perché sui browser meno recenti
         * potrebbe generare proprio lo scroll automatico che vogliamo evitare.
         */
      }
    }

    function featureList(items, compact) {
      return N(
        'ul',
        {
          class: compact
            ? 'amp-features amp-features--stack'
            : 'amp-features'
        },
        items.map(function (text) {
          return N(
            'li',
            {},
            [
              N(
                'span',
                {
                  class: 'amp-check',
                  'aria-hidden': 'true',
                  text: '✓'
                }
              ),
              N('span', {text: text})
            ]
          );
        })
      );
    }

    function reviews(stacked) {
      const list = N(
        'div',
        {
          class: stacked
            ? 'amp-reviews amp-reviews--stack'
            : 'amp-reviews'
        }
      );

      c.reviews.forEach(function (review) {
        const header = N(
          'div',
          {
            class: 'amp-review-header'
          },
          [
            N(
              'div',
              {},
              [
                N(
                  'p',
                  {
                    class: 'amp-review-name',
                    text: review.name
                  }
                ),
                N(
                  'time',
                  {
                    datetime: review.isoDate,
                    class: 'amp-review-date',
                    text: review.date
                  }
                )
              ]
            )
          ]
        );

        const googleImage = img(
          c.assets.google,
          'Google',
          'amp-google',
          false
        );

        if (googleImage) {
          header.append(googleImage);
        }

        const block = N(
          'article',
          {
            class: 'amp-review'
          },
          [header]
        );

        if (review.rating !== null) {
          block.append(
            N(
              'p',
              {
                class: 'amp-stars',
                'aria-label': review.rating + ' / 5',
                text:
                  '★'.repeat(review.rating) +
                  '☆'.repeat(5 - review.rating)
              }
            )
          );
        }

        block.append(
          N(
            'blockquote',
            {
              text: review.text
            }
          )
        );

        list.append(block);
      });

      return list;
    }

    function field(key, type, autocomplete) {
      const required = c.form.required.includes(key);
      const id = 'amp-field-' + key;

      const label = N(
        'label',
        {
          for: id,
          text:
            c.copy.labels[key] +
            (required ? ' *' : '')
        }
      );

      const input = N(
        'input',
        {
          id: id,
          type: type,
          'data-amp-field': key,
          autocomplete: autocomplete,
          required: required,
          placeholder: c.copy.placeholders[key],
          'aria-describedby': id + '-error',
          maxlength:
            key === 'email'
              ? 254
              : key === 'phone_number'
                ? 40
                : c.validation.nameMaxLength
        }
      );

      if (key === 'phone_number') {
        input.setAttribute('inputmode', 'tel');
      }

      const error = N(
        'p',
        {
          id: id + '-error',
          class: 'amp-field-error',
          hidden: true
        }
      );

      controls[key] = input;
      errors[key] = error;

      return N(
        'div',
        {
          class: 'amp-field'
        },
        [
          label,
          input,
          error
        ]
      );
    }

    function consentField(key, heading, text) {
      const required = c.form.required.includes(key);
      const id = 'amp-field-' + key;

      const input = N(
        'input',
        {
          type: 'checkbox',
          id: id,
          'data-amp-field': key,
          required: required,
          'aria-describedby': id + '-error'
        }
      );

      controls[key] = input;

      const label = N(
        'label',
        {
          for: id,
          class: 'amp-consent-label'
        },
        [
          input,
          N(
            'span',
            {
              text:
                heading +
                (required ? ' *' : '')
            }
          )
        ]
      );

      const group = N(
        'div',
        {
          class: 'amp-consent'
        },
        [label]
      );

      if (key === 'privacy_flag') {
        group.append(
          N(
            'p',
            {
              class: 'amp-consent-copy'
            },
            [
              N(
                'a',
                {
                  href: c.copy.privacyUrl,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  text: text
                }
              )
            ]
          )
        );
      } else {
        group.append(
          N(
            'details',
            {
              class: 'amp-consent-details'
            },
            [
              N(
                'summary',
                {
                  text: c.copy.more
                }
              ),
              N(
                'p',
                {
                  text: text
                }
              )
            ]
          )
        );
      }

      errors[key] = N(
        'p',
        {
          id: id + '-error',
          class: 'amp-field-error',
          hidden: true
        }
      );

      group.append(errors[key]);

      return group;
    }

    function mount() {
      U.assert(
        !d.getElementById(c.runtime.rootId),
        'UI_ROOT_DUPLICATE'
      );

      root.style.setProperty(
        '--amp-brand',
        c.theme.brand
      );

      root.style.setProperty(
        '--amp-brand-dark',
        c.theme.brandDark
      );

      root.style.setProperty(
        '--amp-surface',
        c.theme.surface
      );

      root.style.setProperty(
        '--amp-text',
        c.theme.text
      );

      root.style.setProperty(
        '--amp-max',
        c.theme.maxWidth
      );

      root.style.setProperty(
        '--amp-font',
        c.theme.fontFamily
      );

      const logoImage = img(
        c.assets.logo,
        c.assets.logoAlt,
        'amp-logo',
        true
      );

      const header = N(
        'header',
        {
          class: 'amp-header'
        },
        [
          N(
            'div',
            {
              class: 'amp-shell amp-header-inner'
            },
            logoImage ||
            N(
              'span',
              {
                class: 'amp-logo-text',
                text: c.assets.logoAlt
              }
            )
          )
        ]
      );

      const heroCopy = N(
        'div',
        {
          class: 'amp-hero-copy'
        },
        [
          N(
            'h1',
            {
              text: c.copy.heading
            }
          ),
          N(
            'p',
            {
              class: 'amp-intro',
              text: c.copy.intro
            }
          )
        ]
      );

      const heroInner = N(
        'div',
        {
          class: 'amp-shell amp-hero-inner'
        },
        [heroCopy]
      );

      const heroImage = img(
        c.assets.photo,
        c.assets.photoAlt,
        'amp-hero-photo',
        true
      );

      if (heroImage) {
        heroInner.append(heroImage);
      }

      const hero = N(
        'section',
        {
          class: 'amp-hero'
        },
        [heroInner]
      );

      const quizShell = N(
        'div',
        {
          class: 'amp-shell amp-quiz-shell'
        },
        [
          stepCard,
          featureList(
            c.copy.features,
            false
          )
        ]
      );

      const social = N(
        'section',
        {
          class: 'amp-social amp-shell',
          'aria-labelledby': 'amp-reviews-heading'
        },
        [
          N(
            'h2',
            {
              id: 'amp-reviews-heading',
              text: c.copy.reviewsHeading
            }
          ),
          reviews(false)
        ]
      );

      const bottom = N(
        'section',
        {
          class: 'amp-bottom amp-shell'
        },
        [
          N(
            'h2',
            {
              text: c.copy.bottomHeading
            }
          ),
          N(
            'button',
            {
              type: 'button',
              class: 'amp-button',
              'data-amp-action': 'start',
              text: c.copy.bottomCta
            }
          ),
          N(
            'p',
            {
              class: 'amp-disclaimer',
              text: c.copy.disclaimer
            }
          )
        ]
      );

      quizView.append(
        hero,
        quizShell,
        social,
        bottom
      );

      const left = N(
        'div',
        {
          class: 'amp-contact-information'
        },
        [
          N(
            'h1',
            {
              id: 'amp-contact-title',
              tabindex: '-1'
            },
            [
              N(
                'span',
                {
                  class: 'amp-congratulations',
                  text: c.copy.contactHeading
                }
              ),
              N(
                'span',
                {
                  text: c.copy.contactSubheading
                }
              )
            ]
          ),

          N(
            'h2',
            {
              class: 'amp-contact-reviews-title',
              text: c.copy.reviewsHeading
            }
          ),

          reviews(true),

          N(
            'h2',
            {
              class: 'amp-contact-features-title',
              text: c.copy.contactFeaturesHeading
            }
          ),

          featureList(
            c.copy.contactFeatures,
            true
          )
        ]
      );

      const right = N(
        'div',
        {
          class: 'amp-form-card'
        },
        [
          N(
            'div',
            {
              class: 'amp-form-heading'
            },
            [
              N(
                'h2',
                {
                  text: c.copy.formHeading
                }
              )
            ]
          )
        ]
      );

      form.append(
        N(
          'p',
          {
            class: 'amp-form-intro',
            text: c.copy.formIntro
          }
        )
      );

      form.append(
        field(
          'first_name',
          'text',
          'given-name'
        )
      );

      form.append(
        field(
          'last_name',
          'text',
          'family-name'
        )
      );

      form.append(
        field(
          'email',
          'email',
          'email'
        )
      );

      form.append(
        field(
          'phone_number',
          'tel',
          'tel'
        )
      );

      form.append(
        consentField(
          'privacy_flag',
          c.copy.privacyHeading,
          c.copy.privacyText
        )
      );

      form.append(
        consentField(
          'marketing_flag',
          c.copy.marketingHeading,
          c.copy.marketingText
        )
      );

      form.append(
        N(
          'p',
          {
            class: 'amp-callout',
            text: c.copy.callout
          }
        ),
        status,
        sendButton,
        N(
          'p',
          {
            class: 'amp-submit-note',
            text: c.copy.submitNote
          }
        )
      );

      right.append(form);

      contactView.append(
        N(
          'div',
          {
            class: 'amp-contact-grid'
          },
          [
            left,
            right
          ]
        )
      );

      successView.append(
        N(
          'h1',
          {
            tabindex: '-1',
            text: c.copy.successHeading
          }
        ),
        N(
          'p',
          {
            text: c.copy.successText
          }
        )
      );

      content.append(
        quizView,
        contactView,
        successView
      );

      const footer = N(
        'footer',
        {
          class: 'amp-footer'
        },
        [
          N(
            'div',
            {
              class: 'amp-shell'
            },
            [
              N(
                'a',
                {
                  href: c.copy.cookiesUrl,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  'data-amp-action': 'link',
                  'data-amp-icmp': c.attribution.icmp.cookies || '',
                  text: c.copy.cookieLinkLabel
                }
              ),
              N(
                'a',
                {
                  href: c.copy.privacyUrl,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  'data-amp-action': 'link',
                  'data-amp-icmp': c.attribution.icmp.privacy || '',
                  text: c.copy.privacyLinkLabel
                }
              )
            ]
          )
        ]
      );

      root.append(
        header,
        content,
        footer
      );

      d.body.append(root);
      d.body.classList.add('amp-page-active');

      d.documentElement.lang = c.page.htmlLang;
      d.title = c.page.title;

      root.addEventListener(
        'click',
        function (event) {
          const button = event.target.closest(
            '[data-amp-action]'
          );

          if (
            !button ||
            !root.contains(button) ||
            button.disabled ||
            event.detail > 1
          ) {
            return;
          }

          const action = button.dataset.ampAction;

          if (action === 'link') {
            event.preventDefault();

            if (actions.link) {
              actions.link({
                href: button.getAttribute('href'),
                target: button.getAttribute('target'),
                icmp: button.dataset.ampIcmp || null
              });
            }

            return;
          }

          if (action === 'answer') {
            actions.answer &&
            actions.answer(
              button.dataset.ampStep,
              button.dataset.ampOption
            );
          }

          /*
           * Nessuno scroll automatico.
           * La posizione della viewport rimane sotto controllo dell'utente.
           */
          if (action === 'start') {
            actions.start &&
            actions.start();
          }

          if (action === 'edit') {
            actions.edit &&
            actions.edit();
          }
        },
        {
          signal: signalOwner.signal
        }
      );

      form.addEventListener(
        'submit',
        function (event) {
          event.preventDefault();
          event.stopPropagation();

          if (actions.submit) {
            actions.submit(
              getContact()
            );
          }
        },
        {
          signal: signalOwner.signal
        }
      );

      return root;
    }

    function returnToQuestion() {
      if (!stepCard || stepCard.hidden) return;

      try {
        stepCard.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      } catch (_) {
        const top =
          stepCard.getBoundingClientRect().top +
          w.pageYOffset -
          18;

        w.scrollTo(0, Math.max(0, top));
      }

      const heading =
        stepCard.querySelector('#amp-question-title');

      if (heading) {
        setTimeout(function () {
          safeFocus(heading);
        }, 250);
      }
    }

    function showQuiz(step, state, focus) {
      current = step.id;

      quizView.hidden = false;
      contactView.hidden = true;
      successView.hidden = true;

      stepCard.replaceChildren();

      const nav = N(
        'div',
        {
          class: 'amp-step-top'
        }
      );

      const heading = N(
        'h2',
        {
          id: 'amp-question-title',
          tabindex: '-1',
          text: step.title
        }
      );

      stepCard.append(
        nav,
        N(
          'div',
          {
            class: 'amp-question-heading'
          },
          [heading]
        )
      );

      if (state.rejected) {
        const rejection = N(
          'div',
          {
            class: 'amp-rejection',
            role: 'alert'
          },
          [
            N(
              'h3',
              {
                text: c.copy.rejectionHeading
              }
            ),
            N(
              'p',
              {
                text: c.copy.rejectionText
              }
            ),
            N(
              'button',
              {
                type: 'button',
                class: 'amp-button amp-button--outline',
                'data-amp-action': 'edit',
                text: c.copy.editAnswer
              }
            )
          ]
        );

        stepCard.append(rejection);
      } else if (step.type === 'choice') {
        const answers = N(
          'div',
          {
            class: 'amp-answers'
          }
        );

        step.options.forEach(function (option) {
          answers.append(
            N(
              'button',
              {
                type: 'button',
                class: 'amp-button',
                'data-amp-action': 'answer',
                'data-amp-step': step.id,
                'data-amp-option': option.id,
                'aria-pressed': String(
                  state.answers[step.id] &&
                  state.answers[step.id].optionId === option.id ||
                  false
                ),
                text: option.label
              }
            )
          );
        });

        stepCard.append(answers);
      } else {
        const zipForm = N(
          'form',
          {
            class: 'amp-postcode-form',
            novalidate: true
          }
        );

        const label = N(
          'label',
          {
            for: 'amp-postcode',
            class: 'amp-visually-hidden',
            text: c.copy.postcodeLabel
          }
        );

        const input = N(
          'input',
          {
            id: 'amp-postcode',
            inputmode: 'numeric',
            type: 'text',
            autocomplete: 'postal-code',
            placeholder: c.copy.postcodePlaceholder,
            'aria-describedby': 'amp-postcode-error'
          }
        );

        input.value = state.postcode || '';

        const error = N(
          'p',
          {
            id: 'amp-postcode-error',
            class: 'amp-field-error',
            hidden: true
          }
        );

        input.addEventListener(
          'input',
          function () {
            error.hidden = true;
            input.removeAttribute(
              'aria-invalid'
            );
          }
        );

        zipForm.append(
          label,
          input,
          error,
          N(
            'button',
            {
              type: 'submit',
              class: 'amp-button',
              text: c.copy.next
            }
          )
        );

        zipForm.addEventListener(
          'submit',
          function (event) {
            event.preventDefault();
            event.stopPropagation();

            if (actions.postcode) {
              actions.postcode(
                step.id,
                input.value
              );
            }
          }
        );

        stepCard.append(zipForm);
      }

      const progress = N(
        'ol',
        {
          class: 'amp-progress',
          'aria-label': c.copy.progressLabel
        }
      );

      c.funnel.steps.forEach(
        function (entry, index) {
          const visited =
            state.path.includes(entry.id);

          progress.append(
            N(
              'li',
              {
                class:
                  visited
                    ? 'is-visited'
                    : '',
                'aria-current':
                  entry.id === current
                    ? 'step'
                    : null
              },
              [
                N(
                  'span',
                  {
                    text: String(index + 1)
                  }
                )
              ]
            )
          );
        }
      );

      stepCard.append(progress);

      if (focus) {
        safeFocus(heading);
      }
    }

    function postcodeError() {
      const input =
        root.querySelector('#amp-postcode');

      const error =
        root.querySelector('#amp-postcode-error');

      if (error) {
        error.textContent =
          c.copy.errors.postcode;

        error.hidden = false;
      }

      if (input) {
        input.setAttribute(
          'aria-invalid',
          'true'
        );

        safeFocus(input);
      }
    }

    function showContact(focus) {
      current = 'contact';

      quizView.hidden = true;
      contactView.hidden = false;
      successView.hidden = true;

      if (focus) {
        safeFocus(
          contactView.querySelector('h1')
        );
      }
    }

    function getContact() {
      const values = {};

      Object.entries(controls).forEach(
        function ([key, input]) {
          values[key] =
            input.type === 'checkbox'
              ? input.checked
              : input.value;
        }
      );

      return values;
    }

    function setErrors(values) {
      Object.keys(errors).forEach(
        function (key) {
          errors[key].textContent =
            values[key] || '';

          errors[key].hidden =
            !values[key];

          if (values[key]) {
            controls[key].setAttribute(
              'aria-invalid',
              'true'
            );
          } else {
            controls[key].removeAttribute(
              'aria-invalid'
            );
          }
        }
      );

      const first = Object.keys(controls).find(
        function (key) {
          return values[key];
        }
      );

      if (first) {
        safeFocus(
          controls[first]
        );
      }
    }

    function setStatus(state, message) {
      const busy = [
        'validating',
        'submitting',
        'unknown',
        'succeeded'
      ].includes(state);

      sendButton.disabled = busy;

      form.setAttribute(
        'aria-busy',
        String(
          state === 'validating' ||
          state === 'submitting'
        )
      );

      Object.values(controls).forEach(
        function (input) {
          input.disabled = busy;
        }
      );

      sendButton.textContent =
        state === 'submitting'
          ? c.copy.sending
          : c.copy.submit;

      status.textContent =
        message || '';

      status.hidden =
        !message;

      status.classList.toggle(
        'is-error',
        [
          'failed',
          'unknown',
          'blocked'
        ].includes(state)
      );
    }

    function showSuccess() {
      quizView.hidden = true;
      contactView.hidden = true;
      successView.hidden = false;

      safeFocus(
        successView.querySelector('h1')
      );

      form.reset();
    }

    function destroy() {
      signalOwner.abort();
      root.remove();

      d.body.classList.remove(
        'amp-page-active'
      );

      d.documentElement.lang =
        original.lang;

      d.title =
        original.title;
    }

    return {
      mount: mount,
      bind: function (value) {
        actions = value;
      },
      showQuiz: showQuiz,
      showContact: showContact,
      returnToQuestion: returnToQuestion,
      postcodeError: postcodeError,
      getContact: getContact,
      setErrors: setErrors,
      setStatus: setStatus,
      showSuccess: showSuccess,
      destroy: destroy
    };
  }

  App.modules.renderer = {
    create: create
  };
})(window, document);

/* ===== 05_MULTISTEP_ENGINE.js ===== */
/* 06 — MOTORE MULTISTEP. Stato privato in memoria; nessuno storage o selettore legacy. */
(function (w) {
  'use strict';
  const App = w.AmplifonApp, U = App.modules.utils;
  if (App.modules.multistep) return;

  function create(c, callbacks) {
    const stepMap = new Map(c.funnel.steps.map(step => [step.id, step]));
    const state = {current: c.funnel.start, path: [c.funnel.start], answers: {}, postcode: '', rejected: false};
    let lockedUntil = 0, submissionLocked = false;

    function snapshot() { return U.clone(state); }
    function view(focus, emit) {
      const context = snapshot();
      if (state.current === 'contact') callbacks.contact(context, focus, emit);
      else callbacks.step(stepMap.get(state.current), context, focus, emit);
    }
    function canTransition(id) {
      return !submissionLocked && Date.now() >= lockedUntil && id === state.current;
    }
    function advance(next) {
      U.assert(next === 'contact' || stepMap.has(next), 'FLOW_NEXT');
      lockedUntil = Date.now() + c.runtime.transitionLockMs;
      state.current = next; state.path.push(next); state.rejected = false;
      view(true, true);
    }
    function answer(stepId, optionId) {
      if (!canTransition(stepId)) return false;
      const step = stepMap.get(stepId);
      if (!step || step.type !== 'choice') return false;
      const option = step.options.find(item => item.id === optionId);
      if (!option) return false;
      state.answers[stepId] = {optionId, trackingLabel: option.trackingLabel};
      callbacks.answer(step, option);
      if (option.reject) {
        lockedUntil = Date.now() + c.runtime.transitionLockMs; state.rejected = true;
        callbacks.rejection(snapshot()); view(true, false); return true;
      }
      advance(option.next); return true;
    }
    function postcode(stepId, raw) {
      if (!canTransition(stepId)) return false;
      const step = stepMap.get(stepId);
      if (!step || step.type !== 'postcode') return false;
      const value = String(raw || '').trim();
      if (!new RegExp(c.validation.postcodePattern).test(value)) { callbacks.invalidPostcode(); return false; }
      state.postcode = value;
      state.answers[stepId] = {optionId: 'continue', trackingLabel: step.trackingAnswer};
      callbacks.postcode(); advance(step.next); return true;
    }
    function back() {
      if (submissionLocked || state.path.length < 2 || Date.now() < lockedUntil) return;
      const leaving = state.path.pop();
      delete state.answers[leaving];
      if (stepMap.get(leaving) && stepMap.get(leaving).type === 'postcode') state.postcode = '';
      state.current = state.path[state.path.length - 1]; state.rejected = false;
      // La risposta corrente rimane evidenziata; le risposte del ramo abbandonato
      // vengono eliminate quando si risale la cronologia, non accodate negli array.
      lockedUntil = Date.now() + c.runtime.transitionLockMs; callbacks.back(); view(true, true);
    }
    function edit() {
      if (submissionLocked) return;
      state.rejected = false; delete state.answers[state.current]; lockedUntil = 0; view(true, false);
    }
    function resume() {
      if (submissionLocked) return;
      // La CTA inferiore torna al questionario senza cancellare il percorso.
      callbacks.start(); view(true, false);
    }
    function restart() {
      if (submissionLocked) return;
      state.current = c.funnel.start; state.path = [c.funnel.start]; state.answers = {}; state.postcode = ''; state.rejected = false;
      lockedUntil = 0; callbacks.start(); view(true, true);
    }
    function cleanAfterSuccess() { state.answers = {}; state.postcode = ''; submissionLocked = true; }
    return {
      start: () => view(false, true), answer, postcode, back, edit, resume, restart,
      snapshot, current: () => state.current,
      lockSubmission: value => { submissionLocked = value; }, cleanAfterSuccess,
      inspect: () => ({step: state.current, visited: state.path.slice(), answeredCount: Object.keys(state.answers).length, rejected: state.rejected})
    };
  }
  App.modules.multistep = {create};
})(window);

/* ===== 06_UNBOUNCE_BRIDGE.js ===== */
/* ============================================================================
 * 07 — PONTE FORM UNBOUNCE
 * Conserva i nodi nativi, action, integrazioni, honeypot, hidden e handler.
 * Non usa fetch, form.submit() o endpoint ricostruiti. Attiva il pulsante nativo.
 * Fonte del successo: afterFormSubmit del FORM collegato e tentativo in corso.
 * ========================================================================== */
(function (w, d) {
  'use strict';
  const App = w.AmplifonApp, U = App.modules.utils;
  if (App.modules.unbounce) return;

  function findField(form, name) {
    const matches = Array.from(form.elements).filter(el => el.name === name || el.name === name + '[]');
    U.assert(matches.length <= 1, 'NATIVE_FIELD_AMBIGUOUS:' + name);
    return matches[0] || null;
  }

  function create(c, callbacks) {
    const lifetime = new AbortController(), hiddenNodes = [], tabIndexes = [];
    let form = null, wrapper = null, button = null, hooks = null;
    let beforeHook = null, afterHook = null, invalidObserver = null, active = null, ready = false, problem = null;

    function locate() {
      let forms;
      if (c.form.selector) {
        forms = Array.from(d.querySelectorAll(c.form.selector)).flatMap(el => el instanceof HTMLFormElement ? [el] : Array.from(el.querySelectorAll('form')));
        forms = [...new Set(forms)];
      } else {
        forms = Array.from(d.forms).filter(candidate =>
          !candidate.closest('#' + c.runtime.rootId) &&
          ['first_name', 'last_name', 'email', 'phone_number'].every(key => findField(candidate, c.form.fields[key]))
        );
      }
      U.assert(forms.length <= 1, 'NATIVE_FORM_AMBIGUOUS');
      if (!forms.length) { problem = 'WAITING_NATIVE_FORM'; return null; }
      const candidate = forms[0], container = candidate.closest('.lp-pom-form') || candidate;
      form = candidate; wrapper = container;
      for (const name of Object.values(c.form.fields)) U.assert(findField(candidate, name), 'NATIVE_FIELD_MISSING:' + name);
      let buttons = [];
      if (c.form.submitSelector) buttons = Array.from(d.querySelectorAll(c.form.submitSelector));
      else {
        const id = w.ub && w.ub.form && w.ub.form.submitButtonId;
        if (typeof id === 'string') {
          const native = d.getElementById(id.replace(/^#/, ''));
          if (native) buttons = [native];
        }
        if (!buttons.length) buttons = Array.from(container.querySelectorAll('button[type="submit"],input[type="submit"],a.lp-pom-button'));
      }
      U.assert(buttons.length <= 1, 'NATIVE_SUBMIT_AMBIGUOUS');
      if (!buttons.length) { problem = 'WAITING_NATIVE_SUBMIT'; return null; }
      U.assert(!buttons[0].closest('#' + c.runtime.rootId), 'NATIVE_SUBMIT_CUSTOM_UI');
      button = buttons[0];
      if (!w.ub || !w.ub.hooks || !Array.isArray(w.ub.hooks.beforeFormSubmit) || !Array.isArray(w.ub.hooks.afterFormSubmit)) {
        problem = 'WAITING_UNBOUNCE_HOOKS'; return null;
      }
      problem = null;
      return {form: candidate, wrapper: container, button: buttons[0], hooks: w.ub.hooks};
    }

    function hide(element) {
      if (!element || hiddenNodes.some(item => item.element === element)) return;
      hiddenNodes.push({element, aria: element.getAttribute('aria-hidden'), classWasPresent: element.classList.contains('amp-native-transport')});
      element.classList.add('amp-native-transport'); element.setAttribute('aria-hidden', 'true');
      const tabbable = [element, ...element.querySelectorAll('input,select,textarea,button,a,[tabindex]')];
      tabbable.forEach(function (node) {
        if (tabIndexes.some(item => item.node === node)) return;
        tabIndexes.push({node, value: node.getAttribute('tabindex')}); node.setAttribute('tabindex', '-1');
      });
    }

    async function init() {
      // Nasconde subito la sola struttura nativa: non attende Adobe o gli hook.
      const initialRoot = c.runtime.nativeRootSelector ? d.querySelector(c.runtime.nativeRootSelector) : null;
      if (initialRoot && !initialRoot.contains(d.getElementById(c.runtime.rootId))) hide(initialRoot);
      const result = await U.waitFor(locate, c.runtime.dependencyTimeoutMs, lifetime.signal);
      form = result.form; wrapper = result.wrapper; button = result.button; hooks = result.hooks;
      beforeHook = function (args) {
        if (!args || args.formElement !== form || !active || active.status !== 'pending') return;
        active.beforeReceived = true;
        callbacks.before(active.id);
      };
      afterHook = function (args) {
        if (!args || args.formElement !== form || !active || !active.beforeReceived || active.status === 'succeeded') return;
        const id = active.id;
        active.status = 'succeeded'; clearTimeout(active.timer);
        callbacks.success(id);
      };
      hooks.beforeFormSubmit.push(beforeHook); hooks.afterFormSubmit.push(afterHook);
      form.addEventListener('invalid', function () {
        if (active && !active.beforeReceived) failKnownValidation();
      }, {capture: true, signal: lifetime.signal});
      invalidObserver = new MutationObserver(function () {
        if (!active || active.beforeReceived || active.status !== 'pending') return;
        const invalid = form.querySelector('input[aria-invalid="true"],select[aria-invalid="true"],textarea[aria-invalid="true"],label.error:not(:empty)');
        if (invalid) failKnownValidation();
      });
      invalidObserver.observe(form, {subtree: true, attributes: true, childList: true, attributeFilter: ['aria-invalid', 'class']});
      // Non sposta i nodi: mantiene anche gli handler delegati agli antenati Unbounce.
      const nativeRoot = c.runtime.nativeRootSelector ? d.querySelector(c.runtime.nativeRootSelector) : null;
      hide(nativeRoot && nativeRoot.contains(form) ? nativeRoot : wrapper);
      if (!hiddenNodes.some(item => item.element.contains(button))) hide(button);
      patchMessages(); ready = true; return api;
    }

    function patchMessages() {
      const messages = w.ub && w.ub.form && w.ub.form.validationMessages;
      if (!messages) return;
      const mapping = {...c.form.fields, ...c.form.checkboxNames};
      Object.entries(mapping).forEach(function ([key, name]) {
        if (!messages[name]) return;
        if ('required' in messages[name]) messages[name].required = key === 'privacy_flag' ? c.copy.errors.privacy : c.copy.errors.required;
        if (key === 'email' && 'email' in messages[name]) messages[name].email = c.copy.errors.email;
        if (key === 'phone_number' && 'phone' in messages[name]) messages[name].phone = c.copy.errors.phone;
      });
    }

    function write(name, value, optional) {
      const field = findField(form, name);
      if (!field && optional) return;
      U.assert(field, 'NATIVE_FIELD_MISSING:' + name);
      if (field.type === 'checkbox') field.checked = value === true || value === c.form.consentTrue;
      else field.value = value == null ? '' : String(value);
      field.dispatchEvent(new Event('input', {bubbles: true}));
      field.dispatchEvent(new Event('change', {bubbles: true}));
    }

    function sync(values, attribution) {
      Object.entries(c.form.fields).forEach(function ([key, name]) {
        let value = values[key];
        if (key === 'phone_number') value = U.phoneFor(value, c.form.phoneFormat, c.validation);
        if (key === 'privacy_flag' || key === 'marketing_flag') {
          if (c.form.checkboxNames[key]) write(c.form.checkboxNames[key], value === true, true);
          value = value === true ? c.form.consentTrue : c.form.consentFalse;
        }
        write(name, value);
      });
      Object.entries(c.form.attributionFields).forEach(function ([key, name]) {
        if (attribution[key]) write(name, attribution[key], true);
      });
      Object.entries(c.form.technicalValues).forEach(function ([name, value]) {
        U.assert(c.form.technicalAllowlist.includes(name), 'NATIVE_TECHNICAL_NOT_ALLOWED'); write(name, value, false);
      });
      // Non scrive mai domande/risposte nel form. Gli hidden non mappati restano intatti.
    }

    function submit(attempt) {
      U.assert(ready, 'NATIVE_NOT_READY');
      U.assert(!active || active.status === 'failed', 'NATIVE_BUSY');
      sync(attempt.values, attempt.attribution);
      U.assert(form.checkValidity(), 'NATIVE_VALIDATION');
      active = {id: attempt.id, status: 'pending', beforeReceived: false, timer: null};
      active.timer = setTimeout(function () {
        if (!active || active.id !== attempt.id || active.status === 'succeeded') return;
        active.status = 'unknown'; callbacks.unknown(attempt.id);
      }, c.form.resultTimeoutMs);
      try { button.click(); }
      catch (_) {
        // Non è possibile escludere che un handler abbia già iniziato il POST.
        active.status = 'unknown'; clearTimeout(active.timer); callbacks.unknown(attempt.id);
      }
    }
    function failKnownValidation() {
      if (!active || active.beforeReceived || active.status === 'succeeded') return;
      active.status = 'failed'; clearTimeout(active.timer); callbacks.failure(active.id, 'NATIVE_VALIDATION');
    }
    function clearPersonal() {
      if (!form) return;
      Object.entries(c.form.fields).forEach(function ([key, name]) {
        const input = findField(form, name); if (!input) return;
        if (input.type === 'checkbox') input.checked = false;
        else input.value = /_flag$/.test(key) ? c.form.consentFalse : '';
      });
      Object.values(c.form.checkboxNames).forEach(function (name) { const input = findField(form, name); if (input) input.checked = false; });
    }
    function inspect() {
      return {
        ready, problem, formId: form ? form.id : null, submitId: button ? button.id : null,
        hooksAvailable: !!hooks, state: active ? active.status : 'idle',
        fields: Object.fromEntries(Object.entries(c.form.fields).map(([key, name]) => [key, {name, present: !!(form && findField(form, name))}]))
      };
    }
    function destroy() {
      lifetime.abort(); if (active) clearTimeout(active.timer); if (invalidObserver) invalidObserver.disconnect();
      if (hooks) [['beforeFormSubmit', beforeHook], ['afterFormSubmit', afterHook]].forEach(function ([name, fn]) {
        const index = hooks[name].indexOf(fn); if (index >= 0) hooks[name].splice(index, 1);
      });
      tabIndexes.forEach(function (entry) { if (entry.value === null) entry.node.removeAttribute('tabindex'); else entry.node.setAttribute('tabindex', entry.value); });
      hiddenNodes.forEach(function (entry) {
        if (!entry.classWasPresent) entry.element.classList.remove('amp-native-transport');
        if (entry.aria === null) entry.element.removeAttribute('aria-hidden'); else entry.element.setAttribute('aria-hidden', entry.aria);
      });
      ready = false;
    }
    const api = {
      init, submit, inspect, clearPersonal, destroy,
      readTechnical: name => { const input = form && findField(form, name); return input ? input.value : ''; },
      setProblem: code => { problem = code; }
    };
    return api;
  }
  App.modules.unbounce = {create};
})(window, document);

/* ===== 07_LEAD_BOOTSTRAP.js ===== */
/* ============================================================================
 * 08 — LEAD + BOOTSTRAP
 * Un solo tentativo, un solo successo logico.
 * UI, attribution, tracking e trasporto Unbounce restano separati.
 * ========================================================================== */
(function (w, d) {
  'use strict';

  const App = w.AmplifonApp;

  if (!App || !App.modules.utils || App.boot) return;

  const U = App.modules.utils;

  let state = 'idle';
  let ui = null;
  let engine = null;
  let tracking = null;
  let attribution = null;
  let bridge = null;

  let c = null;
  let attempt = null;
  let redirectTimer = null;
  let cleanupTimer = null;
  let previewTimer = null;

  let nativeProblem = null;
  let bootstrapProblem = null;

  let controller = new AbortController();

  const confirmationFrames = new Map();

  function confirmationMessage(nonce) {
    return {
      type: 'amp:confirmation-confirmed',
      version: 1,
      nonce: nonce,
      attemptId: attempt.id,
      heading: c.copy.successHeading,
      text: c.copy.successText,
      logo: c.assets.logo,
      lang: c.page.htmlLang
    };
  }

  function sendConfirmations() {
    if (!attempt || attempt.status !== 'succeeded') return;

    confirmationFrames.forEach(function (entry, source) {
      if (Date.now() - entry.time > 20000) {
        confirmationFrames.delete(source);
        return;
      }

      try {
        source.postMessage(
          confirmationMessage(entry.nonce),
          w.location.origin
        );
      } catch (_) {
        /* Nessun retry di lead. */
      }
    });
  }

  function onConfirmationRequest(event) {
    if (
      !c.success.allowNativeConfirmationHandshake ||
      event.origin !== w.location.origin ||
      event.source === w
    ) {
      return;
    }

    const message = event.data;

    if (
      !message ||
      message.type !== 'amp:confirmation-ready' ||
      message.version !== 1 ||
      typeof message.nonce !== 'string' ||
      !/^[\w-]{8,100}$/.test(message.nonce)
    ) {
      return;
    }

    const childFrame = Array.from(
      d.querySelectorAll('iframe')
    ).some(function (frame) {
      return frame.contentWindow === event.source;
    });

    if (
      !childFrame ||
      !attempt ||
      (
        confirmationFrames.size >= 4 &&
        !confirmationFrames.has(event.source)
      )
    ) {
      return;
    }

    confirmationFrames.set(
      event.source,
      {
        nonce: message.nonce,
        time: Date.now()
      }
    );

    sendConfirmations();
  }

  function before(id) {
    if (
      !attempt ||
      attempt.id !== id ||
      attempt.beforeTracked
    ) {
      return;
    }

    attempt.beforeTracked = true;
    attempt.status = 'submitting';

    tracking.trackFormSubmit(attempt);
  }

  function succeeded(id) {
    if (
      !attempt ||
      attempt.id !== id ||
      attempt.status === 'succeeded'
    ) {
      return;
    }

    attempt.status = 'succeeded';

    tracking.trackFormSent(attempt);

    ui.setStatus('succeeded');
    ui.showSuccess();

    engine.cleanAfterSuccess();

    sendConfirmations();

    cleanupTimer = setTimeout(function () {
      if (
        attempt &&
        attempt.id === id
      ) {
        attempt.values = null;
        attempt.context = null;
      }

      if (bridge) {
        bridge.clearPersonal();
      }
    }, c.tracking.contactLifetimeMs);

    if (
      c.success.redirectUrl &&
      c.runtime.mode === 'live'
    ) {
      redirectTimer = setTimeout(function () {
        const destination =
          U.safeUrl(c.success.redirectUrl);

        if (
          destination &&
          c.success.allowedRedirectOrigins.includes(
            destination.origin
          ) &&
          destination.pathname.startsWith(
            c.success.requiredPathPrefix
          )
        ) {
          w.location.assign(
            attribution.decorate(
              destination.toString()
            )
          );
        }
      }, c.success.redirectDelayMs);
    }
  }

  function unknown(id) {
    if (
      !attempt ||
      attempt.id !== id ||
      attempt.status === 'succeeded'
    ) {
      return;
    }

    attempt.status = 'unknown';

    ui.setStatus(
      'unknown',
      c.copy.errors.unknown
    );
  }

  function failed(id, code) {
    if (
      !attempt ||
      attempt.id !== id ||
      attempt.status === 'succeeded'
    ) {
      return;
    }

    attempt.status = 'failed';

    engine.lockSubmission(false);

    ui.setStatus(
      'failed',
      code === 'NATIVE_VALIDATION'
        ? c.copy.errors.nativeValidation
        : c.copy.errors.failed
    );
  }

  function openTrackedLink(data) {
    if (!data || !data.href) return;

    attribution.interaction(data.icmp);

    const href =
      attribution.decorate(data.href);

    if (
      data.target === '_blank'
    ) {
      w.open(
        href,
        '_blank',
        'noopener,noreferrer'
      );
      return;
    }

    w.location.assign(href);
  }

  function submit(raw) {
    if (
      engine.current() !== 'contact' ||
      (
        attempt &&
        [
          'submitting',
          'pending',
          'unknown',
          'succeeded'
        ].includes(attempt.status)
      )
    ) {
      return;
    }

    const context = engine.snapshot();

    const values = U.normalize(
      {
        ...raw,
        zipcode: context.postcode
      },
      c
    );

    const errors =
      U.validate(values, c);

    ui.setErrors(errors);

    if (Object.keys(errors).length) {
      return;
    }

    if (c.runtime.mode !== 'preview') {
      if (U.releaseBlocks(c).length) {
        ui.setStatus(
          'blocked',
          c.copy.errors.staging
        );
        return;
      }

      if (
        !bridge ||
        !bridge.inspect().ready
      ) {
        ui.setStatus(
          'failed',
          c.copy.errors.unavailable
        );
        return;
      }
    }

    attribution.interaction(
      c.attribution.icmp.submit
    );

    const campaign =
      attribution.snapshot();

    if (
      c.attribution.requireMci &&
      !campaign.mci
    ) {
      ui.setStatus(
        'blocked',
        c.copy.errors.staging
      );
      return;
    }

    attempt = {
      id: U.uid(),
      status: 'pending',
      values: U.clone(values),
      context: context,
      attribution: campaign,
      beforeTracked: false
    };

    engine.lockSubmission(true);

    ui.setStatus(
      'submitting',
      c.copy.sending
    );

    if (c.runtime.mode === 'preview') {
      before(attempt.id);

      previewTimer = setTimeout(
        function () {
          succeeded(attempt.id);
        },
        350
      );

      return;
    }

    try {
      bridge.submit(attempt);
    } catch (error) {
      nativeProblem = error.message;

      failed(
        attempt.id,
        error.message === 'NATIVE_VALIDATION'
          ? 'NATIVE_VALIDATION'
          : 'NATIVE_START_FAILED'
      );
    }
  }

  async function boot() {
    if (
      state === 'starting' ||
      state === 'ready'
    ) {
      return;
    }

    state = 'starting';
    c = w.AMPLIFON_CONFIG;

    try {
      U.validateConfig(c);

      [
        'tracking',
        'attribution',
        'renderer',
        'multistep',
        'unbounce'
      ].forEach(function (name) {
        U.assert(
          App.modules[name],
          'MODULE_MISSING:' + name
        );
      });

      tracking =
        App.modules.tracking.create(c);

      attribution =
        App.modules.attribution.create(c);

      ui =
        App.modules.renderer.create(c);

      ui.mount();

      engine =
        App.modules.multistep.create(
          c,
          {
            step: function (
              step,
              context,
              focus,
              emit
            ) {
              ui.showQuiz(
                step,
                context,
                focus
              );

              if (emit) {
                tracking.trackStepView(
                  step,
                  context
                );
              }
            },

            contact: function (
              context,
              focus,
              emit
            ) {
              ui.showContact(focus);

              if (emit) {
                tracking.trackFormView(
                  context
                );
              }
            },

            answer: function (
              step,
              option
            ) {
              attribution.interaction(
                option.icmp
              );

              tracking.trackAnswer(
                step.id,
                option.id
              );
            },

            postcode: function () {
              attribution.interaction(
                c.attribution.icmp
                  .postcodeContinue
              );
            },

            invalidPostcode: function () {
              ui.postcodeError();
            },

            rejection: function (context) {
              tracking.trackRejection(
                context
              );
            },

            back: function () {
              attribution.interaction(
                c.attribution.icmp.back
              );
            },

            start: function () {
              attribution.interaction(
                c.attribution.icmp.bottomCta
              );
            }
          }
        );

      ui.bind({
        answer: engine.answer,
        postcode: engine.postcode,
        back: engine.back,

        /*
         * CTA esplicita "JETZT STARTEN":
         * torna al questionario e SOLO QUI è ammesso lo scroll.
         */
        start: function () {
          engine.resume();

          if (
            ui.returnToQuestion
          ) {
            ui.returnToQuestion();
          }
        },

        edit: engine.edit,
        submit: submit,
        link: openTrackedLink
      });

      engine.start();

      state = 'ready';

      w.addEventListener(
        'message',
        onConfirmationRequest,
        {
          signal: controller.signal
        }
      );

      w.addEventListener(
        'amp:consent-changed',
        function () {
          tracking.consentChanged();
        },
        {
          signal: controller.signal
        }
      );

      if (c.runtime.mode !== 'preview') {
        bridge =
          App.modules.unbounce.create(
            c,
            {
              before: before,
              success: succeeded,
              failure: failed,
              unknown: unknown
            }
          );

        try {
          await bridge.init();

          attribution.useNative(
            bridge.readTechnical
          );
        } catch (error) {
          nativeProblem =
            error.message === 'DEPENDENCY_TIMEOUT'
              ? (
                bridge.inspect().problem ||
                error.message
              )
              : error.message;

          bridge.setProblem(
            nativeProblem
          );
        }
      }
    } catch (error) {
      state = 'error';
      bootstrapProblem = error.message;

      const message =
        c && c.copy
          ? c.copy.errors.configuration
          : 'Die Seite konnte nicht geladen werden.';

      if (
        !d.getElementById(
          c && c.runtime
            ? c.runtime.rootId
            : 'amp-app'
        )
      ) {
        const panel = U.node(
          'div',
          {
            class: 'amp-bootstrap-error',
            role: 'alert',
            text: message
          }
        );

        d.body.prepend(panel);
      }

      console.error(
        '[AMP]',
        bootstrapProblem
      );
    }
  }

  function inspect() {
    return {
      version: App.version,
      state: state,
      mode:
        c
          ? c.runtime.mode
          : null,

      bootstrapProblem:
        bootstrapProblem,

      nativeProblem:
        nativeProblem,

      releaseBlocks:
        c
          ? U.releaseBlocks(c)
          : [],

      funnel:
        engine
          ? engine.inspect()
          : null,

      submission:
        attempt
          ? {
            id: attempt.id,
            status: attempt.status
          }
          : {
            status: 'idle'
          },

      native:
        bridge
          ? bridge.inspect()
          : {
            ready:
              c &&
              c.runtime.mode === 'preview',
            simulated: true
          },

      attribution:
        attribution
          ? attribution.inspect()
          : null,

      tracking:
        tracking
          ? tracking.inspect()
          : null
    };
  }

  function destroy() {
    U.assert(
      !attempt ||
      ![
        'pending',
        'submitting',
        'unknown'
      ].includes(attempt.status),
      'DESTROY_DURING_SUBMIT'
    );

    controller.abort();
    controller =
      new AbortController();

    clearTimeout(redirectTimer);
    clearTimeout(cleanupTimer);
    clearTimeout(previewTimer);

    if (tracking) {
      tracking.destroy();
    }

    if (bridge) {
      bridge.destroy();
    }

    if (ui) {
      ui.destroy();
    }

    confirmationFrames.clear();

    attempt = null;
    state = 'idle';
    bootstrapProblem = null;
    nativeProblem = null;
  }

  App.boot = boot;
  App.inspect = inspect;
  App.destroy = destroy;

  App.refreshConsent = function () {
    if (tracking) {
      tracking.consentChanged();
    }
  };

  U.ready(boot);
})(window, document);
