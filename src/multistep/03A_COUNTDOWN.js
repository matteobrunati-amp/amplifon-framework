/* Optional page countdown. All copy and campaign timing belong to PAGE CONFIG. */
(function (w) {
  'use strict';

  const App = w.AmplifonApp;
  const U = App.modules.utils;
  if (App.modules.countdown) return;

  function deadline(value) {
    if (typeof value !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return NaN;
    // Date.parse normalizes impossible dates such as February 30: reject those.
    const parts = value.slice(0, 10).split('-').map(Number);
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    if (date.getUTCFullYear() !== parts[0] || date.getUTCMonth() !== parts[1] - 1 ||
        date.getUTCDate() !== parts[2] || Number(value.slice(11, 13)) > 23) return NaN;
    return Date.parse(value);
  }

  function validate(cfg) {
    if (cfg == null) return;
    U.assert(typeof cfg === 'object' && !Array.isArray(cfg), 'CONFIG_COUNTDOWN');
    U.assert(typeof cfg.enabled === 'boolean', 'CONFIG_COUNTDOWN_ENABLED');
    if (!cfg.enabled) return;
    U.assert(['deadline', 'duration'].includes(cfg.mode), 'CONFIG_COUNTDOWN_MODE');
    if (cfg.mode === 'deadline') {
      U.assert(Number.isFinite(deadline(cfg.endsAt)), 'CONFIG_COUNTDOWN_DEADLINE');
    } else {
      U.assert(Number.isSafeInteger(cfg.durationSeconds) && cfg.durationSeconds > 0 &&
        cfg.durationSeconds <= 31536000, 'CONFIG_COUNTDOWN_DURATION');
    }
    U.assert(cfg.placements && typeof cfg.placements.header === 'boolean' &&
      typeof cfg.placements.contact === 'boolean', 'CONFIG_COUNTDOWN_PLACEMENTS');
    U.assert(['hide', 'message'].includes(cfg.expiredBehavior), 'CONFIG_COUNTDOWN_EXPIRY');
    U.assert(Number.isSafeInteger(cfg.urgentThresholdSeconds) &&
      cfg.urgentThresholdSeconds >= 0, 'CONFIG_COUNTDOWN_THRESHOLD');
    U.assert(cfg.text && typeof cfg.text === 'object', 'CONFIG_COUNTDOWN_TEXT');
    ['header', 'contact'].forEach(function (placement) {
      if (!cfg.placements[placement]) return;
      U.assert(typeof cfg.text[placement] === 'string' && cfg.text[placement].trim(),
        'CONFIG_COUNTDOWN_TEXT:' + placement);
      const urgent = cfg.text['urgent' + (placement === 'header' ? 'Header' : 'Contact')];
      U.assert(urgent == null || typeof urgent === 'string', 'CONFIG_COUNTDOWN_URGENT_TEXT');
    });
    if (cfg.expiredBehavior === 'message') {
      U.assert(typeof cfg.text.expired === 'string' && cfg.text.expired.trim(),
        'CONFIG_COUNTDOWN_EXPIRED_TEXT');
    }
    U.assert(cfg.labels && typeof cfg.labels === 'object', 'CONFIG_COUNTDOWN_LABELS');
    ['days', 'hours', 'minutes', 'seconds'].forEach(function (unit) {
      U.assert(typeof cfg.labels[unit] === 'string' && cfg.labels[unit].trim(),
        'CONFIG_COUNTDOWN_LABEL:' + unit);
    });
  }

  function create(cfg) {
    validate(cfg);
    const enabled = !!cfg && cfg.enabled === true;
    const views = [];
    let target = null;
    let timer = null;
    let started = false;

    function view(placement) {
      if (!enabled || !cfg.placements[placement]) return null;
      const copy = U.node('p', {class: 'amp-countdown-copy'});
      const time = U.node('p', {class: 'amp-countdown-time', role: 'timer', 'aria-live': 'off'});
      const element = U.node('section', {
        class: 'amp-countdown amp-countdown--' + placement,
        'data-amp-countdown': placement,
        hidden: true
      }, [copy, time]);
      views.push({element: element, copy: copy, time: time, placement: placement});
      return element;
    }

    function stop() {
      if (timer !== null) w.clearInterval(timer);
      timer = null;
    }

    function update() {
      const remaining = Math.max(0, target - Date.now());
      const seconds = Math.ceil(remaining / 1000);
      const values = [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24,
        Math.floor(seconds / 60) % 60, seconds % 60];
      const units = ['days', 'hours', 'minutes', 'seconds'];
      const formatted = values.map(function (value, index) {
        return String(value).padStart(2, '0') + cfg.labels[units[index]];
      }).join(' ');
      views.forEach(function (item) {
        const expired = remaining === 0;
        item.element.hidden = expired && cfg.expiredBehavior === 'hide';
        item.time.hidden = expired;
        const urgent = cfg.text['urgent' + (item.placement === 'header' ? 'Header' : 'Contact')];
        item.copy.textContent = expired ? (cfg.text.expired || '') :
          (remaining <= cfg.urgentThresholdSeconds * 1000 && urgent ? urgent : cfg.text[item.placement]);
        item.time.textContent = expired ? '' : formatted;
      });
      if (remaining === 0) stop();
    }

    function start() {
      if (!enabled || started || !views.length) return;
      started = true;
      target = cfg.mode === 'deadline' ? deadline(cfg.endsAt) : Date.now() + cfg.durationSeconds * 1000;
      timer = w.setInterval(update, 1000);
      update();
    }

    return {view: view, start: start, destroy: stop};
  }

  App.modules.countdown = {create: create, validate: validate};
})(window);
