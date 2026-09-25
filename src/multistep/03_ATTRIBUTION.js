/* ============================================================================
 * 04 â€” ATTRIBUTION / MCI / SORG / ADCLID / ICMP
 * Nessun dato personale.
 *
 * ResponsabilitÃ :
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

      /*
       * Sincronizza subito l'URL anche senza interazione.
       * Il fallback MCI compare al caricamento; un valore nativo
       * puo' ancora sostituirlo quando il bridge Unbounce e' pronto.
       */
      updateCurrentUrl();
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
     * Non modifichiamo l'URL finchÃ© non avviene un'interazione.
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

