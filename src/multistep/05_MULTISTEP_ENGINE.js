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
