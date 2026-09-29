/* 02B — MARKET VALIDATION / URL CONTEXT. */
(function (w, d) {
  'use strict';

  const App = w.AmplifonApp;
  const U = App && App.modules && App.modules.utils;

  if (!U || App.modules.marketValidation) return;

  const URL_MARKETS = {
    de: {country: 'DE', locale: 'de', language: 'de_DE'},
    it: {country: 'IT', locale: 'it', language: 'it_IT'},
    fr: {country: 'FR', locale: 'fr', language: 'fr_FR'},
    es: {country: 'ES', locale: 'es', language: 'es_ES'},
    uk: {country: 'GB', locale: 'en', language: 'en_GB'},
    gb: {country: 'GB', locale: 'en', language: 'en_GB'},
    us: {country: 'US', locale: 'en', language: 'en_US'},
    au: {country: 'AU', locale: 'en', language: 'en_AU'},
    ca: {country: 'CA', locale: 'en', language: 'en_CA'},
    pl: {country: 'PL', locale: 'pl', language: 'pl_PL'},
    hu: {country: 'HU', locale: 'hu', language: 'hu_HU'}
  };

  const CANADA_NPA = new Set([
    '403','780','368','587','825',
    '604','250','236','672','778','257',
    '204','431','584','506','428','709','879','902','782',
    '416','613','519','705','807','905','226','249','289','343',
    '382','365','437','548','647','683','742','753','942',
    '418','514','450','819','263','354','367','438','468','579',
    '581','873','306','474','639','867'
  ]);

  const COUNTRY_PROFILES = {
    DE: {
      callingCode: '49', trunkPrefix: '0', requireTrunkForNational: true,
      phonePattern: /^[1-9]\d{4,12}$/,
      postcodePattern: /^\d{5}$/,
      postcodeMode: 'digits5', postcodeInputMode: 'numeric', postcodeMaxLength: 5
    },
    IT: {
      callingCode: '39', trunkPrefix: '',
      phonePattern: /^3\d{9}$/,
      postcodePattern: /^\d{5}$/,
      postcodeMode: 'digits5', postcodeInputMode: 'numeric', postcodeMaxLength: 5
    },
    GB: {
      callingCode: '44', trunkPrefix: '0',
      phonePattern: /^7\d{9}$/,
      postcodePattern: /^(GIR ?0AA|(?:(?:[A-Z][0-9]{1,2})|(?:[A-Z][A-Z][0-9]{1,2})|(?:[A-Z][0-9][A-Z])|(?:[A-Z][A-Z][0-9][A-Z])) ?[0-9][A-Z]{2})$/,
      postcodeMode: 'uk', postcodeInputMode: 'text', postcodeMaxLength: 10
    },
    ES: {
      callingCode: '34', trunkPrefix: '',
      phonePattern: /^[67]\d{8}$/,
      postcodePattern: /^(0[1-9]|[1-4]\d|5[0-2])\d{3}$/,
      postcodeMode: 'digits5', postcodeInputMode: 'numeric', postcodeMaxLength: 5
    },
    US: {
      callingCode: '1', trunkPrefix: '',
      phonePattern: /^[2-9]\d{2}[2-9]\d{6}$/,
      postcodePattern: /^\d{5}(?:-\d{4})?$/,
      postcodeMode: 'us', postcodeInputMode: 'numeric', postcodeMaxLength: 10
    },
    CA: {
      callingCode: '1', trunkPrefix: '',
      phonePattern: /^[2-9]\d{2}[2-9]\d{6}$/,
      phoneAreaCodes: CANADA_NPA,
      postcodePattern: /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTVXY]\s?\d[ABCEGHJ-NPRSTVXY]\d$/,
      postcodeMode: 'ca', postcodeInputMode: 'text', postcodeMaxLength: 7
    },
    AU: {
      callingCode: '61', trunkPrefix: '0',
      phonePattern: /^(?:4|2|3|7|8)\d{8}$/,
      postcodePattern: /^\d{4}$/,
      postcodeMode: 'digits4', postcodeInputMode: 'numeric', postcodeMaxLength: 4
    },
    FR: {
      callingCode: '33', trunkPrefix: '0',
      phonePattern: /^[67]\d{8}$/,
      postcodePattern: /^\d{5}$/,
      postcodeMode: 'digits5', postcodeInputMode: 'numeric', postcodeMaxLength: 5
    },
    PL: {
      callingCode: '48', trunkPrefix: '',
      phonePattern: /^[1-9]\d{8}$/,
      postcodePattern: /^\d{2}-\d{3}$/,
      postcodeMode: 'pl', postcodeInputMode: 'numeric', postcodeMaxLength: 6
    }
  };

  const GENERIC_POSTCODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 \-]{1,18}[A-Za-z0-9]$|^[A-Za-z0-9]{3,10}$/;

  const I18N = {
    de: {
      required: 'Dieses Feld ist erforderlich.',
      name: 'Bitte verwenden Sie nur Buchstaben, Leerzeichen, Bindestriche oder Apostrophe.',
      email: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
      emailTypo: 'Bitte überprüfen Sie die E-Mail-Domain.',
      phone: 'Bitte geben Sie eine gültige Telefonnummer ein.',
      postcode: 'Bitte geben Sie eine gültige Postleitzahl ein.',
      privacy: 'Bitte bestätigen Sie die Datenschutzhinweise.'
    },
    it: {
      required: 'Questo campo è obbligatorio.',
      name: 'Usa solo lettere. Sono consentiti spazi, trattini e apostrofi.',
      email: 'Inserisci un indirizzo email valido.',
      emailTypo: 'Controlla il dominio email.',
      phone: 'Inserisci un numero di telefono valido.',
      postcode: 'Inserisci un CAP valido.',
      privacy: 'Accetta l’informativa privacy.'
    },
    en: {
      required: 'This field is required.',
      name: 'Use letters only. Spaces, hyphens and apostrophes are allowed.',
      email: 'Enter a valid email address.',
      emailTypo: 'Check the email domain.',
      phone: 'Enter a valid phone number.',
      postcode: 'Enter a valid postal/ZIP code.',
      privacy: 'Please accept the privacy policy.'
    },
    es: {
      required: 'Este campo es obligatorio.',
      name: 'Usa solo letras. Se permiten espacios, guiones y apóstrofos.',
      email: 'Introduce un email válido.',
      emailTypo: 'Revisa el dominio del email.',
      phone: 'Introduce un número de teléfono válido.',
      postcode: 'Introduce un código postal válido.',
      privacy: 'Acepta la política de privacidad.'
    },
    fr: {
      required: 'Ce champ est obligatoire.',
      name: 'Utilisez uniquement des lettres, espaces, tirets ou apostrophes.',
      email: 'Entrez une adresse e-mail valide.',
      emailTypo: 'Vérifiez le domaine de l’e-mail.',
      phone: 'Entrez un numéro de téléphone valide.',
      postcode: 'Entrez un code postal valide.',
      privacy: 'Veuillez accepter la politique de confidentialité.'
    },
    pl: {
      required: 'To pole jest wymagane.',
      name: 'Użyj tylko liter. Dozwolone są spacje, myślniki i apostrofy.',
      email: 'Wpisz poprawny adres e-mail.',
      emailTypo: 'Sprawdź domenę e-mail.',
      phone: 'Wpisz poprawny numer telefonu.',
      postcode: 'Wpisz poprawny kod pocztowy.',
      privacy: 'Zaakceptuj politykę prywatności.'
    },
    hu: {
      required: 'A mező kitöltése kötelező.',
      name: 'Csak betűket használjon; szóköz, kötőjel és aposztróf engedélyezett.',
      email: 'Adjon meg érvényes e-mail-címet.',
      emailTypo: 'Ellenőrizze az e-mail-domain nevet.',
      phone: 'Adjon meg érvényes telefonszámot.',
      postcode: 'Adjon meg érvényes irányítószámot.',
      privacy: 'Kérjük, fogadja el az adatvédelmi feltételeket.'
    }
  };

  const BAD_DOMAINS = new Set([
    'gmil.com','gmai.com','gmaill.com','gmial.com','gamil.com','gmal.com',
    'gmail.con','gmail.co','gmail.cm','htmail.com','hotmial.com','hotmal.com',
    'homail.com','hotmai.com','hotmali.com','hotmail.con','outlok.com',
    'outlook.con','outllok.com','yaho.com','yahho.com','yahoo.con',
    'yahoo.co','yhoo.com','icloud.con','live.con','liv.com'
  ]);

  const NAME_RE = /^[\p{L}\p{M}]+(?:[ '\u2019\-][\p{L}\p{M}]+)*$/u;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

  function pathContext() {
    const parts = String(w.location && w.location.pathname || '')
      .split('/')
      .filter(Boolean);
    const key = String(parts[0] || '').toLowerCase();
    return URL_MARKETS[key] || null;
  }

  function localeFromPage(config) {
    const lang = String(config.page && config.page.language || '').toLowerCase();
    if (lang.startsWith('de')) return 'de';
    if (lang.startsWith('it')) return 'it';
    if (lang.startsWith('fr')) return 'fr';
    if (lang.startsWith('es')) return 'es';
    if (lang.startsWith('pl')) return 'pl';
    if (lang.startsWith('hu')) return 'hu';
    return 'en';
  }

  function context(config) {
    const v = config.validation || {};
    const detected = pathContext();
    const autoCountry = v.autoDetectCountryFromUrl !== false;
    const autoLanguage = v.autoDetectLanguageFromUrl !== false;
    return {
      country: autoCountry && detected
        ? detected.country
        : String(config.page && config.page.region || 'INTL').toUpperCase(),
      locale: autoLanguage && detected
        ? detected.locale
        : localeFromPage(config),
      language: autoLanguage && detected
        ? detected.language
        : String(config.page && config.page.language || ''),
      detectedFromUrl: !!detected
    };
  }

  function fieldConfig(config, key) {
    const fields = (config.validation && config.validation.fields) || {};
    const raw = fields[key];
    if (raw && typeof raw === 'object') {
      return {
        enabled: raw.enabled !== false,
        mode: String(raw.mode || ((key === 'phone' || key === 'postcode') ? 'country' : 'standard')).toLowerCase()
      };
    }
    return {
      enabled: raw !== false,
      mode: (key === 'phone' || key === 'postcode') ? 'country' : 'standard'
    };
  }

  function enabled(config, key) {
    if (config.validation && config.validation.enabled === false) return false;
    return fieldConfig(config, key).enabled;
  }

  function countryProfile(config) {
    const ctx = context(config);
    if (config.validation && config.validation.useCountryProfiles === false) return null;
    return COUNTRY_PROFILES[ctx.country] || null;
  }

  function postcodeRules(config) {
    const fc = fieldConfig(config, 'postcode');
    if (!enabled(config, 'postcode')) {
      return {pattern: /^.+$/, mode: 'trim', inputMode: 'text', maxLength: 64};
    }
    if (fc.mode === 'generic') {
      return {pattern: GENERIC_POSTCODE_PATTERN, mode: 'trim', inputMode: 'text', maxLength: 20};
    }
    const p = countryProfile(config);
    if (!p) {
      return {
        pattern: new RegExp(config.validation.postcodePattern || '.+'),
        mode: 'trim', inputMode: 'text', maxLength: 20
      };
    }
    return {
      pattern: p.postcodePattern,
      mode: p.postcodeMode,
      inputMode: p.postcodeInputMode,
      maxLength: p.postcodeMaxLength
    };
  }

  function normalizePostcode(value, rules) {
    let s = String(value || '');
    if (rules.mode === 'digits5') return s.replace(/\D+/g, '').slice(0, 5);
    if (rules.mode === 'digits4') return s.replace(/\D+/g, '').slice(0, 4);
    if (rules.mode === 'pl') {
      const dgt = s.replace(/\D+/g, '').slice(0, 5);
      return dgt.length > 2 ? dgt.slice(0, 2) + '-' + dgt.slice(2) : dgt;
    }
    if (rules.mode === 'us') {
      const dgt = s.replace(/\D+/g, '').slice(0, 9);
      return dgt.length > 5 ? dgt.slice(0, 5) + '-' + dgt.slice(5) : dgt;
    }
    if (rules.mode === 'ca') {
      const c = s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      return c.length > 3 ? c.slice(0, 3) + ' ' + c.slice(3) : c;
    }
    if (rules.mode === 'uk') {
      const c = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
      return c.length > 3 ? c.slice(0, -3) + ' ' + c.slice(-3) : c;
    }
    return s.trim();
  }

  function compactPhone(raw) {
    let text = U.clean(raw);
    if (!text || /[^\d\s()+.\-]/u.test(text)) return null;
    const plus = (text.match(/\+/g) || []).length;
    if (plus > 1 || (plus && text[0] !== '+')) return null;
    let compact = text.replace(/[\s().\-]/g, '');
    if (compact.startsWith('00')) compact = '+' + compact.slice(2);
    return compact;
  }

  function genericPhone(raw) {
    const compact = compactPhone(raw);
    if (!compact) return null;
    const international = compact.startsWith('+');
    const digits = compact.replace(/^\+/, '');
    if (!/^\d{6,15}$/.test(digits) || /^0+$/.test(digits)) return null;
    return international ? '+' + digits : digits;
  }

  function countryPhone(raw, config) {
    const p = countryProfile(config);
    if (!p) return U.phone(raw, config.validation);

    const compact = compactPhone(raw);
    if (!compact) return null;

    const international = compact.startsWith('+');
    let digits = compact.replace(/^\+/, '');
    let national;

    if (international) {
      if (!digits.startsWith(p.callingCode)) return null;
      national = digits.slice(p.callingCode.length);
      if (national.startsWith('0')) return null;
    } else {
      if (p.requireTrunkForNational && p.trunkPrefix && !digits.startsWith(p.trunkPrefix)) {
        return null;
      }
      national = digits;
      if (p.trunkPrefix && national.startsWith(p.trunkPrefix)) {
        national = national.slice(p.trunkPrefix.length);
      }
    }

    if (!p.phonePattern.test(national)) return null;
    if (p.phoneAreaCodes && !p.phoneAreaCodes.has(national.slice(0, 3))) return null;

    return '+' + p.callingCode + national;
  }

  function normalizePhone(raw, config) {
    if (!enabled(config, 'phone')) return U.clean(raw);
    const mode = fieldConfig(config, 'phone').mode;
    return mode === 'generic' ? genericPhone(raw) : countryPhone(raw, config);
  }

  function emailTypo(email) {
    const value = String(email || '').trim().toLowerCase();
    const at = value.lastIndexOf('@');
    if (at < 0) return false;
    const domain = value.slice(at + 1).replace(/\s+/g, '');
    return BAD_DOMAINS.has(domain) || domain.endsWith('.con');
  }

  function applyConfig(config) {
    const ctx = context(config);
    const v = config.validation = config.validation || {};

    if (ctx.detectedFromUrl && v.autoDetectCountryFromUrl !== false) {
      config.page.region = ctx.country;
    }
    if (ctx.detectedFromUrl && v.autoDetectLanguageFromUrl !== false) {
      config.page.language = ctx.language;
      config.page.htmlLang = ctx.locale;
    }

    const profile = countryProfile(config);
    if (profile && fieldConfig(config, 'phone').mode === 'country') {
      v.callingCode = profile.callingCode;
      v.trunkPrefix = profile.trunkPrefix;
      v.allowInternational = false;
      const source = profile.phonePattern.source;
      const minMax = source.match(/\{(\d+),(\d+)\}/);
      if (ctx.country === 'DE') {
        v.minNationalDigits = 5;
        v.maxNationalDigits = 13;
      }
    }

    const pr = postcodeRules(config);
    v.postcodePattern = pr.pattern.source;
    v.postcodeInputMode = pr.inputMode;
    v.postcodeMaxLength = pr.maxLength;
    v.postcodeNormalizer = pr.mode;

    if (v.autoMessagesFromUrl === true && I18N[ctx.locale] && config.copy && config.copy.errors) {
      Object.assign(config.copy.errors, I18N[ctx.locale]);
    }

    return ctx;
  }

  function normalize(values, config) {
    const pr = postcodeRules(config);
    return {
      first_name: U.clean(values.first_name),
      last_name: U.clean(values.last_name),
      email: String(values.email || '').trim(),
      phone_number: normalizePhone(values.phone_number, config),
      zipcode: enabled(config, 'postcode')
        ? normalizePostcode(values.zipcode, pr)
        : String(values.zipcode || '').trim(),
      privacy_flag: values.privacy_flag === true,
      marketing_flag: values.marketing_flag === true
    };
  }

  function validate(values, config) {
    const errors = {};
    const required = new Set(config.form.required);
    const maxName = Number(config.validation && config.validation.nameMaxLength || 100);

    ['first_name', 'last_name'].forEach(function (key) {
      if (!values[key]) {
        if (required.has(key)) errors[key] = config.copy.errors.required;
      } else if (enabled(config, 'name') && (values[key].length > maxName || !NAME_RE.test(values[key]))) {
        errors[key] = config.copy.errors.name;
      }
    });

    if (!values.email) {
      if (required.has('email')) errors.email = config.copy.errors.required;
    } else if (enabled(config, 'email') && !EMAIL_RE.test(values.email)) {
      errors.email = config.copy.errors.email;
    } else if (
      enabled(config, 'email') &&
      config.validation.emailTypoCheck !== false &&
      emailTypo(values.email)
    ) {
      errors.email = config.copy.errors.emailTypo || config.copy.errors.email;
    }

    if (!values.phone_number) {
      if (required.has('phone_number')) errors.phone_number = config.copy.errors.phone;
    }

    if (!values.zipcode) {
      if (required.has('zipcode')) errors.zipcode = config.copy.errors.required;
    } else if (enabled(config, 'postcode') && !postcodeRules(config).pattern.test(values.zipcode)) {
      errors.zipcode = config.copy.errors.postcode;
    }

    if (required.has('privacy_flag') && !values.privacy_flag) {
      errors.privacy_flag = config.copy.errors.privacy;
    }

    return errors;
  }

  function attachPostcodeUx() {
    if (!d || !d.documentElement) return;
    const attached = new WeakSet();

    function bind() {
      const input = d.getElementById && d.getElementById('amp-postcode');
      if (!input || attached.has(input)) return;
      attached.add(input);
      const config = w.AMPLIFON_CONFIG;
      if (!config) return;
      const rules = postcodeRules(config);
      input.setAttribute('inputmode', rules.inputMode || 'text');
      input.setAttribute('maxlength', String(rules.maxLength || 20));
      input.addEventListener('input', function () {
        if (!enabled(config, 'postcode')) return;
        input.value = normalizePostcode(input.value, rules);
      });
      input.addEventListener('blur', function () {
        if (!enabled(config, 'postcode')) return;
        input.value = normalizePostcode(input.value, rules);
      });
    }

    bind();
    if (typeof MutationObserver === 'function') {
      const observer = new MutationObserver(bind);
      observer.observe(d.documentElement, {childList: true, subtree: true});
    }
  }

  const config = w.AMPLIFON_CONFIG;
  if (config) applyConfig(config);

  U.marketContext = context;
  U.marketValidationEnabled = enabled;
  U.marketPostcodeRules = postcodeRules;
  U.marketNormalizePostcode = normalizePostcode;
  U.marketNormalizePhone = normalizePhone;
  U.normalize = normalize;
  U.validate = validate;

  App.modules.marketValidation = {
    context,
    applyConfig,
    enabled,
    fieldConfig,
    postcodeRules,
    normalizePostcode,
    normalizePhone,
    genericPhone,
    countryPhone
  };

  attachPostcodeUx();
})(window, document);
