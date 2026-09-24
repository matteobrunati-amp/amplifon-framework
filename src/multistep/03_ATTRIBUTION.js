/* 04 — MCI / SORG / ADCLID / ICMP. Nessun observer globale e nessun dato personale. */
(function (w) {
  'use strict';
  const App = w.AmplifonApp, U = App.modules.utils;
  if (App.modules.attribution) return;

  function create(c, sourceSearch) {
    const values = {}, origins = {};
    const input = new URLSearchParams(sourceSearch === undefined ? w.location.search : sourceSearch);
    function allowed(value) {
      return typeof value === 'string' && value.length > 0 && value.length <= c.attribution.maxLength && !/[\u0000-\u001f\u007f]/.test(value);
    }
    c.attribution.allowedParams.forEach(function (key) {
      const value = input.get(key);
      if (allowed(value)) { values[key] = value; origins[key] = 'url'; }
    });
    function useNative(read) {
      Object.entries(c.form.attributionFields).forEach(function ([key, fieldName]) {
        if (values[key] && origins[key] !== 'config') return;
        const value = read(fieldName);
        if (allowed(value)) { values[key] = value; origins[key] = 'native'; }
      });
      if (!values.mci && allowed(c.attribution.fallbackMci)) {
        values.mci = c.attribution.fallbackMci; origins.mci = 'config';
      }
    }
    function interaction(icmp) {
      if (allowed(icmp)) { values.icmp = icmp; origins.icmp = 'interaction'; }
    }
    function decorate(href) {
      // Usare SOLO per link di campagna esplicitamente ammessi, non per il footer legale.
      const url = U.safeUrl(href);
      if (!url || !c.attribution.allowedLinkOrigins.includes(url.origin)) return href;
      c.attribution.allowedParams.forEach(function (key) { if (values[key]) url.searchParams.set(key, values[key]); });
      return url.toString();
    }
    useNative(() => '');
    return {
      useNative, interaction, decorate,
      snapshot: () => U.clone(values),
      inspect: () => ({present: Object.keys(values), origins: U.clone(origins)})
    };
  }
  App.modules.attribution = {create};
})(window);
