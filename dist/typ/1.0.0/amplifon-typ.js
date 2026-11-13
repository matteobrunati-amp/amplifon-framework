/* Amplifon Framework — standalone thank-you page v1.0.0 */
(function (w, d) {
  'use strict';

  if (w.__AMPLIFON_TYP__) return;

  const state = {version: '1.0.0', mode: null, mounted: false, pageView: 'disabled', pageDispatchCount: 0, conversionOwner: 'landing', error: null};
  w.__AMPLIFON_TYP__ = state;
  const App = w.AmplifonApp = w.AmplifonApp || {};
  App.version = state.version;
  App.typ = {inspect: () => ({...state})};

  function node(tag, attributes, children) {
    const element = d.createElement(tag);
    Object.entries(attributes || {}).forEach(function ([key, value]) {
      if (value === undefined || value === null || value === '') return;
      if (key === 'text') element.textContent = value;
      else element.setAttribute(key, value);
    });
    (Array.isArray(children) ? children : [children]).forEach(function (child) {
      if (child) element.appendChild(child);
    });
    return element;
  }

  function image(src, alt, className) {
    if (!src) return null;
    const url = new URL(src, w.location.href);
    if (url.protocol !== 'https:') throw new Error('TYP_ASSET_URL');
    return node('img', {src: url.href, alt: alt || '', class: className, decoding: 'async'});
  }

  function link(href, label) {
    if (!href || !label) return null;
    const url = new URL(href, w.location.href);
    if (url.protocol !== 'https:') throw new Error('TYP_LINK_URL');
    return node('a', {href: url.href, text: label, rel: 'noopener'});
  }

  function pageData(c) {
    return {
      cfg: {noview: true},
      page: {pageInfo: {
        pageID: String(c.page.pageID || ''),
        pageName: c.page.pageName || '',
        destinationURL: w.location.origin + w.location.pathname,
        referringURL: '',
        sysEnv: /Mobi|Android|iPhone/i.test(w.navigator.userAgent || '') ? 'Mobile' : 'Desktop',
        Version: '1.0',
        Language: c.page.language || '',
        geoRegion: c.page.region || '',
        transactionID: ''
      }},
      event: [{eventInfo: {eventName: 'page_view'}}],
      form: {questionID: [], questionString: [], answerID: [], answerString: [], evetTYPType: ''},
      user: {profileInfoClearText: {phone: '', email: ''}}
    };
  }

  function trackPageView(c) {
    if (c.runtime.mode !== 'live' || c.tracking?.enabled !== true) return;
    if (!c.page.pageID) throw new Error('TYP_ANALYTICS_ID');
    if (typeof w.wa_gc !== 'function') {
      state.pageView = 'unavailable';
      return;
    }
    state.pageView = 'sent';
    state.pageDispatchCount += 1;
    w.digitalData = pageData(c);
    w.wa_gc(w.digitalData, 'view');
  }

  function boot() {
    const c = w.AMPLIFON_CONFIG;
    try {
      if (!c || !['preview', 'live'].includes(c.runtime?.mode) || !c.page || !c.copy?.heading) {
        throw new Error('TYP_CONFIG');
      }
      if (c.runtime.mode === 'live' && c.tracking?.enabled === true && !c.page.pageID) {
        throw new Error('TYP_ANALYTICS_ID');
      }
      const copy = c.copy;
      state.mode = c.runtime.mode;
      const assets = c.assets || {};
      const rootId = c.runtime.rootId || 'amp-app';
      if (d.getElementById(rootId)) throw new Error('TYP_ROOT_EXISTS');
      const root = node('div', {id: rootId, class: 'amp-typ'});
      const theme = c.theme || {};
      Object.entries({brand: '--amp-brand', brandDark: '--amp-brand-dark', surface: '--amp-surface', text: '--amp-text', maxWidth: '--amp-max', fontFamily: '--amp-font'}).forEach(function ([key, property]) {
        if (theme[key]) root.style.setProperty(property, theme[key]);
      });

      root.appendChild(node('header', {class: 'amp-typ-header'}, [
        node('div', {class: 'amp-typ-shell'}, image(assets.logo, assets.logoAlt, 'amp-typ-logo'))
      ]));
      const check = node('span', {class: 'amp-typ-check', 'aria-hidden': 'true', text: '\u2713'});
      const heroText = node('div', {class: 'amp-typ-hero-text'}, [
        check,
        node('h1', {id: 'amp-typ-title', text: copy.heading}),
        node('p', {class: 'amp-typ-subheading', text: copy.subheading}),
        node('p', {class: 'amp-typ-body', text: copy.body})
      ]);
      const hero = node('section', {class: 'amp-typ-hero amp-typ-shell', 'aria-labelledby': 'amp-typ-title'}, [
        heroText,
        image(assets.photo, assets.photoAlt, 'amp-typ-photo')
      ]);
      const main = node('main', {}, hero);

      if (copy.nextHeading || copy.nextSteps?.length) {
        const items = node('ol', {class: 'amp-typ-steps'});
        (copy.nextSteps || []).forEach(function (step, index) {
          items.appendChild(node('li', {class: 'amp-typ-step'}, [
            node('span', {class: 'amp-typ-step-number', 'aria-hidden': 'true', text: String(index + 1)}),
            node('h3', {text: step.title}),
            node('p', {text: step.text})
          ]));
        });
        main.appendChild(node('section', {class: 'amp-typ-next amp-typ-shell', 'aria-labelledby': 'amp-typ-next-title'}, [
          node('h2', {id: 'amp-typ-next-title', text: copy.nextHeading}),
          items
        ]));
      }
      if (copy.reminderHeading || copy.reminder) {
        main.appendChild(node('aside', {class: 'amp-typ-reminder amp-typ-shell'}, [
          node('h2', {text: copy.reminderHeading}),
          node('p', {text: copy.reminder})
        ]));
      }
      root.appendChild(main);
      root.appendChild(node('footer', {class: assets.footerLogo ? 'amp-typ-footer amp-typ-footer-brand' : 'amp-typ-footer'}, [
        image(assets.footerLogo, assets.footerLogoAlt, 'amp-typ-footer-logo'),
        node('nav', {class: 'amp-typ-shell', 'aria-label': copy.footerLabel || undefined}, [
          link(copy.privacyUrl, copy.privacyLinkLabel),
          link(copy.cookiesUrl, copy.cookieLinkLabel)
        ])
      ]));

      d.documentElement.lang = c.page.htmlLang || 'es';
      if (c.page.title) d.title = c.page.title;
      d.body.appendChild(root);
      const nativeRoot = d.querySelector(c.runtime.nativeRootSelector || '#lp-pom-root');
      if (nativeRoot && !nativeRoot.contains(root)) {
        nativeRoot.hidden = true;
        nativeRoot.setAttribute('aria-hidden', 'true');
        nativeRoot.style.setProperty('display', 'none', 'important');
      }
      d.body.classList.add('amp-typ-page');
      state.mounted = true;
      trackPageView(c);
    } catch (error) {
      state.error = error.message;
      d.documentElement.setAttribute('data-amp-typ-error', error.message);
      console.error('[AMP TYP]', error.message);
    }
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot, {once: true});
  else boot();
})(window, document);
