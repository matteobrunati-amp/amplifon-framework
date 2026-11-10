import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const root = process.cwd();
const modulesPath = path.join(root, 'src', 'multistep');

function makeConfig(phoneMode = 'country', postcodeMode = 'country') {
  return {
    page: {region: 'DE', language: 'de_DE', htmlLang: 'de'},
    validation: {
      enabled: true,
      autoDetectCountryFromUrl: true,
      autoDetectLanguageFromUrl: true,
      autoMessagesFromUrl: true,
      useCountryProfiles: true,
      nameMaxLength: 100,
      fields: {
        name: {enabled: true, mode: 'standard'},
        email: {enabled: true, mode: 'standard'},
        phone: {enabled: true, mode: phoneMode},
        postcode: {enabled: true, mode: postcodeMode}
      },
      emailTypoCheck: true,
      callingCode: '49',
      trunkPrefix: '0',
      allowInternational: true,
      minNationalDigits: 5,
      maxNationalDigits: 13,
      postcodePattern: '^\\d{5}$'
    },
    form: {
      required: [
        'first_name', 'last_name', 'email',
        'phone_number', 'zipcode', 'privacy_flag'
      ]
    },
    copy: {
      errors: {
        required: 'required',
        name: 'name',
        email: 'email',
        phone: 'phone',
        postcode: 'postcode',
        privacy: 'privacy'
      }
    }
  };
}

function load(pathname, phoneMode = 'country', postcodeMode = 'country') {
  const config = makeConfig(phoneMode, postcodeMode);
  const App = {modules: {}};
  const document = {
    documentElement: null,
    getElementById() { return null; }
  };
  const window = {
    location: {pathname, href: 'https://example.test' + pathname},
    AMPLIFON_CONFIG: config,
    AmplifonApp: App
  };

  const sandbox = {
    window,
    document,
    MutationObserver: undefined,
    console,
    Set,
    Object,
    RegExp,
    String,
    URL,
    URLSearchParams
  };

  vm.createContext(sandbox);
  for (const file of ['01_UTILS.js', '01B_MARKET_VALIDATION.js', '03_ATTRIBUTION.js']) {
    vm.runInContext(fs.readFileSync(path.join(modulesPath, file), 'utf8'), sandbox);
  }

  return {
    config,
    U: App.modules.utils,
    attribution: App.modules.attribution,
    M: App.modules.marketValidation
  };
}

function equal(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function ok(condition, label) {
  if (!condition) throw new Error(label);
}

{
  const {config, M} = load('/de/amplifon/meta/test/', 'country', 'country');
  equal(config.page.region, 'DE', 'DE region');
  equal(config.page.language, 'de_DE', 'DE language');
  equal(M.countryPhone('0171 1234567', config), '+491711234567', 'DE national');
  equal(M.countryPhone('+49 171 1234567', config), '+491711234567', 'DE +49');
  equal(M.countryPhone('0049 171 1234567', config), '+491711234567', 'DE 0049');
  equal(M.countryPhone('+39 333 1234567', config), null, 'DE rejects IT');
  equal(M.countryPhone('333 1234567', config), null, 'DE requires trunk 0');
  ok(M.postcodeRules(config).pattern.test('10115'), 'DE postcode valid');
  ok(!M.postcodeRules(config).pattern.test('1011'), 'DE postcode invalid');
}

{
  const {config, M} = load('/de/amplifon/meta/test/', 'generic', 'country');
  equal(M.genericPhone('+39 333 1234567'), '+393331234567', 'generic IT');
  equal(M.genericPhone('+49 171 1234567'), '+491711234567', 'generic DE');
  equal(M.genericPhone('0033 6 12 34 56 78'), '+33612345678', 'generic FR');
}

{
  const {config, M} = load('/ca/test/', 'country', 'country');
  equal(config.page.region, 'CA', 'CA region');
  equal(M.countryPhone('+1 416 555 1234', config), '+14165551234', 'CA valid');
  equal(M.countryPhone('+1 212 555 1234', config), null, 'CA rejects US NPA');
  const rules = M.postcodeRules(config);
  const zip = M.normalizePostcode('k1a0b1', rules);
  equal(zip, 'K1A 0B1', 'CA postcode normalize');
  ok(rules.pattern.test(zip), 'CA postcode valid');
}

{
  const {config, M} = load('/uk/test/', 'country', 'country');
  const rules = M.postcodeRules(config);
  const zip = M.normalizePostcode('sw1a1aa', rules);
  equal(zip, 'SW1A 1AA', 'UK postcode normalize');
  ok(rules.pattern.test(zip), 'UK postcode valid');
}

{
  const {config, U} = load('/ar/test/');
  config.form.extraFields = [
    {key: 'phone_type', options: [{value: 'fijo', label: 'Fijo'}]},
    {key: 'area_code', pattern: '^(0)?[0-9]{2,3}$', patternError: 'area'},
    {key: 'city'}
  ];
  config.form.required.push('phone_type', 'area_code', 'city');
  config.form.phoneAdapter = {
    normalize(values) {
      return values.localPhoneNumber ? '+54' + values.area_code + values.localPhoneNumber : null;
    },
    nativeValue(values) {
      return values.area_code + ' - ' + values.localPhoneNumber;
    }
  };
  const raw = {phone_type: 'fijo', area_code: ' 11 ', phone_number: ' 45678901 ', city: ' Buenos Aires '};
  const values = U.normalize(raw, config);
  equal(values.phone_number, '+541145678901', 'split phone canonical value');
  equal(values.localPhoneNumber, '45678901', 'split phone retains local digits for native field');
  equal(config.form.phoneAdapter.nativeValue(values), '11 - 45678901', 'split phone native value');
  equal(values.city, 'Buenos Aires', 'extra city is normalized');
  const invalid = U.normalize({...raw, phone_type: 'unknown', area_code: 'invalid', city: ''}, config);
  const errors = U.validate(invalid, config);
  equal(errors.phone_type, config.copy.errors.required, 'unknown select value');
  equal(errors.area_code, 'area', 'extra field pattern');
  equal(errors.city, config.copy.errors.required, 'required extra field');
}

{
  const {config, attribution} = load('/ar/test/');
  config.form.attributionFields = {mci: 'mci'};
  config.attribution = {
    allowedParams: ['mci'],
    maxLength: 120,
    fallbackMci: 'default_value',
    ignoredValues: {mci: ['default_value']},
    updateUrl: false
  };
  const placeholder = attribution.create(config, '?mci=default_value');
  placeholder.useNative(() => 'default_value');
  equal(placeholder.snapshot().mci, undefined, 'placeholder absent from URL, native and fallback');
  const campaign = attribution.create(config, '?mci=campaign-test');
  campaign.useNative(() => 'default_value');
  equal(campaign.snapshot().mci, 'campaign-test', 'URL campaign takes precedence');
}

console.log('market validation tests: OK');
