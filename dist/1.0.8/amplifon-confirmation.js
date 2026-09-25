/* ============================================================================
 * AMPLIFON CONFIRMATION — GENERIC RENDERER
 * Nessun testo di mercato hardcodato.
 * Tutto il copy arriva dal PAGE CONFIG della pagina parent.
 * Nessun tracking, nessun submit.
 * ========================================================================== */
(function (w, d) {
  'use strict';

  if (w.__AMP_CONFIRMATION_BOOTED__) return;
  w.__AMP_CONFIRMATION_BOOTED__ = true;

  var nonce =
    w.crypto && typeof w.crypto.randomUUID === 'function'
      ? w.crypto.randomUUID()
      : 'confirmation-' + Date.now();

  var confirmed = false;
  var started = Date.now();
  var timer = null;
  var parentConfig = null;

  try {
    parentConfig =
      w.parent &&
      w.parent !== w &&
      w.parent.AMPLIFON_CONFIG
        ? w.parent.AMPLIFON_CONFIG
        : null;
  } catch (_) {
    parentConfig = null;
  }

  var copy =
    parentConfig && parentConfig.copy
      ? parentConfig.copy
      : {};

  function el(tag, className, text) {
    var node = d.createElement(tag);

    if (className) node.className = className;
    if (text != null) node.textContent = text;

    return node;
  }

  function resolveAsset(source) {
    if (!source) return '';

    if (/^https:\/\//i.test(String(source))) {
      return String(source);
    }

    if (
      !parentConfig ||
      !parentConfig.assets ||
      !parentConfig.assets.repositoryBase
    ) {
      return '';
    }

    try {
      return new URL(
        String(source),
        String(parentConfig.assets.repositoryBase)
      ).toString();
    } catch (_) {
      return '';
    }
  }

  function mount() {
    var root = el('section', 'amp-confirmation-content');

    root.id = 'amp-confirmation-content';
    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');

    var logo = el('img', 'amp-confirmation-logo');
    logo.alt =
      parentConfig &&
      parentConfig.assets &&
      parentConfig.assets.logoAlt
        ? parentConfig.assets.logoAlt
        : '';
    logo.hidden = true;

    var heading = el(
      'h1',
      'amp-confirmation-heading',
      copy.successHeading || ''
    );

    var mainText = el(
      'p',
      'amp-confirmation-main',
      copy.successText || ''
    );

    var subText = el(
      'p',
      'amp-confirmation-sub',
      copy.successSubtext || ''
    );

    var spinner = el('div', 'amp-confirmation-spinner');
    spinner.setAttribute('aria-hidden', 'true');

    var details = el('div', 'amp-confirmation-details');
    details.hidden = true;

    root.append(
      logo,
      heading,
      mainText,
      subText,
      spinner,
      details
    );

    var style = d.createElement('style');

    style.textContent = [
      'html,body{margin:0!important;padding:0!important;background:#fff!important}',
      '#lp-pom-root{display:none!important}',
      '#amp-confirmation-content{box-sizing:border-box;width:100%;min-height:300px;display:flex;flex-direction:column;align-items:center;padding:30px 24px;background:#fff;color:#242424;text-align:center;font:17px/1.5 Arial,Helvetica,sans-serif}',
      '.amp-confirmation-logo{width:150px;max-width:55vw;height:auto;margin:0 auto 18px}',
      '.amp-confirmation-heading{margin:0;color:#c5003e;font:700 29px/1.2 Arial,Helvetica,sans-serif}',
      '.amp-confirmation-main{margin:10px 0 0;font-size:18px;font-weight:700}',
      '.amp-confirmation-sub{margin:5px 0 0;color:#555}',
      '.amp-confirmation-spinner{width:42px;height:42px;margin:22px 0;border:4px solid #f2c7d4;border-top-color:#c5003e;border-radius:50%;animation:amp-spin .85s linear infinite}',
      '.amp-confirmation-details{width:min(620px,100%);margin-top:20px;padding-top:20px;border-top:1px solid #e5e5e5;text-align:left}',
      '.amp-confirmation-details h2{margin:0 0 8px;font-size:20px}',
      '.amp-confirmation-details p{margin:0 0 10px}',
      '.amp-confirmation-details ol{margin:8px 0 20px;padding-left:24px}',
      '.amp-confirmation-details li{margin:0 0 10px}',
      '.amp-confirmation-reminder{margin-top:18px!important;padding:16px;background:#f4f4f4;font-weight:700}',
      '@keyframes amp-spin{to{transform:rotate(360deg)}}'
    ].join('');

    d.head.appendChild(style);
    d.body.appendChild(root);

    function setLogo(source) {
      var src = resolveAsset(source);

      if (src) {
        logo.src = src;
        logo.hidden = false;
      }
    }

    function renderDetails(payload) {
      details.replaceChildren();

      if (payload.lead) {
        details.appendChild(
          el('p', 'amp-confirmation-lead', payload.lead)
        );
      }

      if (payload.stepsHeading) {
        details.appendChild(
          el('h2', '', payload.stepsHeading)
        );
      }

      if (
        Array.isArray(payload.successSteps) &&
        payload.successSteps.length
      ) {
        var list = el('ol');

        payload.successSteps.forEach(function (item) {
          list.appendChild(el('li', '', item));
        });

        details.appendChild(list);
      }

      if (payload.reminderHeading || payload.reminderText) {
        var reminder = el('div', 'amp-confirmation-reminder');

        if (payload.reminderHeading) {
          reminder.appendChild(
            el('strong', '', payload.reminderHeading)
          );
        }

        if (payload.reminderText) {
          reminder.appendChild(
            el('p', '', payload.reminderText)
          );
        }

        details.appendChild(reminder);
      }

      details.hidden = !details.children.length;
    }

    function renderPayload(payload) {
      heading.textContent =
        payload.heading ||
        copy.successHeading ||
        '';

      mainText.textContent =
        payload.text ||
        copy.successText ||
        '';

      subText.textContent =
        payload.subtext ||
        copy.successSubtext ||
        '';

      setLogo(
        payload.logo ||
        (
          parentConfig &&
          parentConfig.assets
            ? parentConfig.assets.logo
            : ''
        )
      );

      renderDetails({
        lead:
          payload.lead ||
          copy.successLead ||
          '',

        stepsHeading:
          payload.stepsHeading ||
          copy.successStepsHeading ||
          '',

        successSteps:
          payload.successSteps ||
          copy.successSteps ||
          [],

        reminderHeading:
          payload.reminderHeading ||
          copy.successReminderHeading ||
          '',

        reminderText:
          payload.reminderText ||
          copy.successReminderText ||
          ''
      });

      spinner.hidden =
        payload.redirecting !== true;
    }

    function listen(event) {
      var payload = event.data;

      if (
        event.source !== w.parent ||
        event.origin !== w.location.origin ||
        confirmed ||
        !payload ||
        payload.type !== 'amp:confirmation-confirmed' ||
        payload.version !== 1 ||
        payload.nonce !== nonce
      ) {
        return;
      }

      confirmed = true;
      clearTimeout(timer);

      renderPayload(payload);
      w.removeEventListener('message', listen);
    }

    w.addEventListener('message', listen);

    renderPayload({
      redirecting: !!(
        parentConfig &&
        parentConfig.success &&
        parentConfig.success.redirectUrl
      )
    });

    function request() {
      if (confirmed) return;

      if (
        w.parent === w ||
        Date.now() - started > 12000
      ) {
        spinner.hidden = true;
        return;
      }

      w.parent.postMessage(
        {
          type: 'amp:confirmation-ready',
          version: 1,
          nonce: nonce
        },
        w.location.origin
      );

      timer = setTimeout(request, 200);
    }

    request();
  }

  if (d.readyState === 'loading') {
    d.addEventListener(
      'DOMContentLoaded',
      mount,
      {once: true}
    );
  } else {
    mount();
  }
})(window, document);
