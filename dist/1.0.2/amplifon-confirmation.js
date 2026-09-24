/* SOLO TAB FORM CONFIRMATION DIALOG — Before Body End.
 * Genera la conferma; non legge contatti, non genera lead, non chiama Adobe.
 * Non serve se Unbounce è configurato per non aprire il dialog nativo.
 */
(function (w, d) {
  'use strict';
  if (w.__AMP_CONFIRMATION_BOOTED__) return;
  w.__AMP_CONFIRMATION_BOOTED__ = true;
  const nonce = w.crypto && w.crypto.randomUUID ? w.crypto.randomUUID() : 'confirmation-' + Date.now();
  let confirmed = false, started = Date.now(), timer = null;
  function mount() {
    const root = d.createElement('section'); root.id = 'amp-confirmation-content';
    root.setAttribute('role', 'status'); root.setAttribute('aria-live', 'polite');
    const heading = d.createElement('h1'); heading.textContent = 'Die Bestätigung Ihrer Anfrage wird geprüft …';
    root.append(heading);
    const style = d.createElement('style');
    style.textContent = '#amp-confirmation-content{box-sizing:border-box;background:white;color:#242424;font:17px/1.5 Arial,Helvetica,sans-serif;padding:38px 24px;text-align:center;width:100%;min-height:210px}#amp-confirmation-content h1{font:700 28px/1.2 Arial,Helvetica,sans-serif;color:#c5003e;margin:0 0 16px}#amp-confirmation-content p{margin:0}#amp-confirmation-content img{width:145px;height:auto;margin:0 auto 25px;display:block}body{margin:0!important;min-width:0!important}#lp-pom-root{display:none!important}';
    d.head.append(style); d.body.append(root); d.documentElement.lang = 'de';
    function listen(event) {
      const message = event.data;
      if (event.source !== w.parent || event.origin !== w.location.origin || confirmed || !message || message.type !== 'amp:confirmation-confirmed' || message.version !== 1 || message.nonce !== nonce) return;
      if (typeof message.attemptId !== 'string' || typeof message.heading !== 'string' || typeof message.text !== 'string') return;
      confirmed = true; clearTimeout(timer);
      root.replaceChildren();
      if (typeof message.logo === 'string' && /^(https:\/\/|data:image\/(?:png|jpeg|webp);base64,)/.test(message.logo)) {
        const logo = d.createElement('img'); logo.src = message.logo; logo.alt = 'Amplifon'; root.append(logo);
      }
      heading.textContent = message.heading; root.append(heading);
      const body = d.createElement('p'); body.textContent = message.text; root.append(body);
      w.removeEventListener('message', listen);
    }
    w.addEventListener('message', listen);
    function request() {
      if (confirmed) return;
      if (w.parent === w || Date.now() - started > 12000) {
        heading.textContent = 'Für dieses Fenster liegt keine bestätigte Anfrage vor.';
        w.removeEventListener('message', listen); return;
      }
      w.parent.postMessage({type:'amp:confirmation-ready',version:1,nonce}, w.location.origin);
      timer = setTimeout(request, 200);
    }
    request();
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', mount, {once:true}); else mount();
})(window, document);
