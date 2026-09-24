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
