/* ============================================================================
 * 03 â€” TRACKING LEGACY LEGGIBILE
 * Input: snapshot del percorso. Output: digitalData / wa_gc / direct call Adobe.
 * Non legge i campi dal DOM, non decide lo step, non invia il form.
 * API: trackStepView, trackAnswer, trackFormView, trackFormSubmit,
 *      trackFormSent, trackRejection. Il mapping Ã¨ SOLO nello SCRIPT 1.
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
     * il framework non blocca l'emissione perchÃ© la policy dei tag viene gestita
     * dal layer/CMP giÃ  presente a livello dominio.
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

      const isFirstView =
        step.id === c.funnel.start;

      const name =
        isFirstView
          ? c.tracking.events.firstView
          : step.viewEvent;

      /*
       * In modalita' bootstrap il primo form_multi_0 e' gia'
       * presente in digitalData prima del normale page tracking
       * Adobe di dominio. Non lo reinviamo con wa_gc.
       */
      if (
        isFirstView &&
        c.tracking.firstViewMode === 'bootstrap'
      ) {
        remember(
          name,
          'bootstrap',
          'inherited',
          'page-load:first-view'
        );

        return;
      }

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
        firstViewMode: c.tracking.firstViewMode || 'dispatch',
        noView: c.tracking.noView === true,
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

