/* ============================================================================
 * 03 — TRACKING LEGACY LEGGIBILE
 * Input: snapshot del percorso. Output: digitalData / wa_gc / direct call Adobe.
 * Non legge i campi dal DOM, non decide lo step, non invia il form.
 * API: trackStepView, trackAnswer, trackFormView, trackFormSubmit,
 *      trackFormSent, trackRejection. Il mapping è SOLO nello SCRIPT 1.
 * ========================================================================== */
(function (w) {
  'use strict';
  const App = w.AmplifonApp, U = App.modules.utils;
  if (App.modules.tracking) return;

  function create(config) {
    const c = config, queue = [], records = [], identities = new Set(), contactTimers = new Set();
    let timer = null, destroyed = false;

    function consent(destination) {
      try {
        const state = c.tracking.consentReader(destination);
        return state === true ? true : state === false ? false : null;
      } catch (_) { return null; }
    }

    function dataLayer(context, eventName, contact, isLead) {
      const questions = [], answers = [];
      (context.path || []).forEach(function (id) {
        const step = c.funnel.steps.find(item => item.id === id);
        if (!step) return;
        questions.push({id: step.trackingNumber, text: step.trackingQuestion});
        const answer = context.answers[id];
        if (answer && (id !== context.current || eventName === c.tracking.events.rejection)) {
          answers.push({id: step.trackingNumber, text: answer.trackingLabel});
        }
      });
      const payload = {
        page: {pageInfo: {
          pageID: String(c.page.pageID || ''),
          pageName: isLead ? c.page.leadPageName : c.page.pageName,
          destinationURL: '', referringURL: '',
          sysEnv: /iPad|Tablet/i.test(navigator.userAgent) ? 'Tablet' : /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
          Version: c.page.trackingVersion, Language: c.page.language,
          geoRegion: c.page.region, transactionID: c.page.transactionID
        }},
        event: [{eventInfo: {eventName}}],
        form: {
          questionID: questions.map(item => item.id),
          questionString: questions.map(item => item.text),
          answerID: answers.map(item => item.id),
          answerString: answers.map(item => item.text),
          evetTYPType: isLead ? '1' : ''
        },
        user: {profileInfoClearText: {phone: '', email: ''}}
      };
      if (isLead) payload.cfg = {noview: true};
      // Il contatto non esce dalla memoria finché il reader non lo autorizza.
      if (contact && consent('advertising') === true) {
        payload.user.profileInfoClearText.email = contact.email;
        payload.user.profileInfoClearText.phone = U.phoneFor(contact.phone_number, c.tracking.phoneFormat, c.validation);
      }
      return payload;
    }

    function remember(eventName, destination, status, identity) {
      const row = {eventName, destination, status, identity, time: Date.now()};
      records.push(row); if (records.length > 120) records.shift();
      if (c.runtime.debug) console.info('[AMP tracking]', eventName, destination, status);
      return row;
    }

    function clearContact(payload) {
      if (payload && payload.user && payload.user.profileInfoClearText) {
        payload.user.profileInfoClearText.email = '';
        payload.user.profileInfoClearText.phone = '';
      }
    }

    function publish(item) {
      const payload = item.makePayload();
      w.digitalData = payload;
      if (item.destination === 'wa_gc') w.wa_gc(U.clone(payload), 'view');
      else w._satellite.track(item.directCall, {eventId: item.identity, digitalData: U.clone(payload)});
      item.row.status = 'dispatched'; // NON equivale a ricezione confermata dal sistema remoto.
      const timeout = setTimeout(function () { clearContact(payload); contactTimers.delete(timeout); }, c.tracking.contactLifetimeMs);
      contactTimers.add(timeout);
    }

    function flush() {
      clearTimeout(timer); timer = null;
      if (destroyed) return;
      for (let i = 0; i < queue.length;) {
        const item = queue[i];
        const permission = consent(item.destination === 'wa_gc' ? 'analytics' : 'advertising');
        if (permission === false) {
          item.row.status = 'denied'; queue.splice(i, 1); continue;
        }
        if (Date.now() > item.expires) {
          item.row.status = 'expired'; queue.splice(i, 1); continue;
        }
        const available = item.destination === 'wa_gc'
          ? typeof w.wa_gc === 'function'
          : w._satellite && typeof w._satellite.track === 'function';
        if (permission !== true || !available) { i++; continue; }
        queue.splice(i, 1);
        try { publish(item); }
        catch (_) {
          // La libreria può aver prodotto effetti prima di lanciare l'errore:
          // non ritentare automaticamente un direct call parzialmente eseguito.
          item.row.status = 'dispatch-error';
          if (w.digitalData) clearContact(w.digitalData);
        }
      }
      if (queue.length) timer = setTimeout(flush, c.tracking.retryEveryMs);
    }

    function enqueue(eventName, destination, makePayload, identity, directCall) {
      const key = identity || U.uid();
      const dedupeKey = destination + ':' + key;
      if (identities.has(dedupeKey)) return;
      identities.add(dedupeKey);
      const row = remember(eventName, destination, c.tracking.enabled && c.runtime.mode !== 'preview' ? 'pending' : 'disabled', key);
      if (!c.tracking.enabled || c.runtime.mode === 'preview') return;
      if (queue.length >= c.tracking.maxQueue) { row.status = 'overflow'; return; }
      queue.push({eventName, destination, makePayload, identity: key, directCall, row, expires: Date.now() + c.tracking.queueTtlMs});
      flush();
    }

    function trackStepView(step, context) {
      const snapshot = U.clone(context);
      const name = step.id === c.funnel.start ? c.tracking.events.firstView : step.viewEvent;
      enqueue(name, 'wa_gc', () => dataLayer(snapshot, name, null, false));
    }
    function trackAnswer() {
      // Deliberatamente nessun trigger separato: la risposta è nello snapshot
      // della view successiva. Non duplichiamo gli eventi previsti dal legacy.
    }
    function trackFormView(context) {
      const snapshot = U.clone(context), name = c.tracking.events.formView;
      enqueue(name, 'wa_gc', () => dataLayer(snapshot, name, null, false));
    }
    function trackFormSubmit(attempt) {
      const snapshot = U.clone(attempt.context), name = c.tracking.events.submit;
      const contact = c.tracking.contactOnSubmit ? U.clone(attempt.values) : null;
      const make = () => dataLayer(snapshot, name, contact, false);
      enqueue(name, 'wa_gc', make, attempt.id + ':submit');
      if (c.tracking.directCalls.submit) enqueue(name, 'satellite', make, attempt.id + ':submit', c.tracking.directCalls.submit);
    }
    function trackFormSent(attempt) {
      const snapshot = U.clone(attempt.context), name = c.tracking.events.success;
      const contact = c.tracking.contactOnSuccess ? U.clone(attempt.values) : null;
      const make = () => dataLayer(snapshot, name, contact, true);
      if (c.tracking.sendSuccessToWaGc) enqueue(name, 'wa_gc', make, attempt.id + ':success');
      if (c.tracking.directCalls.success) enqueue(name, 'satellite', make, attempt.id + ':success', c.tracking.directCalls.success);
    }
    function trackRejection(context) {
      const snapshot = U.clone(context), name = c.tracking.events.rejection;
      enqueue(name, 'wa_gc', () => dataLayer(snapshot, name, null, false));
    }
    function destroy() {
      destroyed = true; clearTimeout(timer); queue.splice(0);
      contactTimers.forEach(clearTimeout); contactTimers.clear();
      if (w.digitalData) clearContact(w.digitalData);
    }
    return {
      trackStepView, trackAnswer, trackFormView, trackFormSubmit, trackFormSent, trackRejection,
      consentChanged: function () {
        if (consent('advertising') !== true && w.digitalData) clearContact(w.digitalData);
        flush();
      },
      inspect: () => ({pending: queue.length, events: U.clone(records)}),
      destroy
    };
  }
  App.modules.tracking = {create};
})(window);
