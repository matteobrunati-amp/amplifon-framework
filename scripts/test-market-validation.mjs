import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const root = process.cwd();
const modulePath = path.join(root, 'src', 'multistep', '01B_MARKET_VALIDATION.js');

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
  const U = {
    clean(value) {
      return String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
    },
    phone() {
      return null;
    }
  };

  const App = {modules: {utils: U}};
  const document = {
    documentElement: null,
    getElementById() { return null; }
  };
  const window = {
    location: {pathname},
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
    String
  };

  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(modulePath, 'utf8'), sandbox);

  return {
    config,
    U,
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

console.log('market validation tests: OK');
