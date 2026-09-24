/* ============================================================================
 * 01 — CONFIGURAZIONE GLOBALE / AMPLIFON DE365 / PAGE CONFIG 0.4.0
 * HEAD, prima di ogni altro script della landing.
 * Qui si modificano TUTTI i contenuti, selettori, regole e mapping esterni.
 * Nessun invio o trigger da questo file. Non contiene credenziali.
 * Gli asset incorporati in fondo provengono dallo screenshot fornito.
 * ========================================================================== */
window.AMPLIFON_CONFIG = {
  schemaVersion: 1,
  version: '0.4.0',



  framework: {
    /*
     * RELEASE PINNED: non usare @main o /latest.
     * Crea/pubbblica il repository GitHub e modifica SOLO baseUrl se il nome repo cambia.
     * Il loader aggiunge i due file della release indicata qui sotto.
     */
    version: '1.0.0',
    baseUrl: 'https://cdn.jsdelivr.net/gh/matteobrunati-amp/amplifon-framework@v1.0.0/dist/1.0.0/',
    script: 'amplifon-multistep.js',
    stylesheet: 'amplifon-multistep.css',
    loadTimeoutMs: 12000
  },

  runtime: {
    mode: 'staging',                  // 'staging' | 'live'. 'preview' solo nell'anteprima.
    debug: false,
    rootId: 'amp-app',
    nativeRootSelector: '#lp-pom-root',
    dependencyTimeoutMs: 12000,
    transitionLockMs: 220
  },

  /* Non dedurre l'ID analytics dal titolo "365" dell'editor. */
  page: {
    key: 'de-meta-365',
    pageID: null,                    // Inserire il pageID DE approvato.
    pageName: '365 | [DE] | Meta | Multi Step Miyagi - EarPros.io | Amplifon',
    leadPageName: '365 | [DE] | Meta | Multi Step Miyagi - EarPros.io | Amplifon | Lead',
    language: 'de_DE',
    region: 'DE',
    htmlLang: 'de',
    title: 'Kostenlos Hörgeräte testen | Amplifon',
    trackingVersion: '1.0',
    transactionID: ''                // Preservato: non è il nostro attemptId.
  },

  release: {
    routingReviewed: false,          // Integrazione form/MCI/partner corretta per DE.
    legalReviewed: false,            // Testi completi dei consensi e link verificati.
    rejectionRulesReviewed: false    // Confermare le regole NEIN prima del live.
  },

  assets: {
    /*
     * POLICY ASSET AMPLIFON:
     * - nessun file immagine va caricato o referenziato dalla Media Library Unbounce;
     * - nessun asset base64/data: nel codice di produzione;
     * - tutti gli URL immagine devono essere HTTPS stabili su GitHub.
     *
     * Modificare SOLO queste URL quando cambia una creatività.
     */
    repositoryBase: 'https://raw.githubusercontent.com/matteobrunati-amp/images/refs/heads/main/',
    logo: 'https://raw.githubusercontent.com/matteobrunati-amp/images/refs/heads/main/amplifon-positive-rgb.small.png',
    photo: '',                      // Inserire URL GitHub RAW della foto approvata per DE365.
    google: '',                     // Inserire URL GitHub RAW dell'asset Google Reviews usato dalla pagina.

    photoAlt: 'Beratung im Amplifon Fachgeschäft',
    logoAlt: 'Amplifon'
  },

  theme: {
    brand: '#c5003e',
    brandDark: '#a50034',
    surface: '#f4f4f4',
    text: '#242424',
    maxWidth: '1120px',
    fontFamily: 'Arial, Helvetica, sans-serif'
  },

  form: {
    /* null = ricerca univoca per nomi dei campi; mai "primo form della pagina". */
    selector: null,                  // Es. '#lp-pom-form-123 form' o '#lp-pom-form-123'.
    submitSelector: null,            // Es. '#lp-pom-button-124'. Autodetect se univoco.
    resultTimeoutMs: 30000,
    fields: {
      first_name: 'first_name',
      last_name: 'last_name',
      email: 'email',
      phone_number: 'phone_number',
      zipcode: 'zipcode',
      privacy_flag: 'privacy_flag',
      marketing_flag: 'marketing_flag'
    },
    checkboxNames: {
      privacy_flag: 'privacy_flag_original',
      marketing_flag: 'marketing_flag_original'
    },
    required: ['first_name', 'last_name', 'email', 'phone_number', 'zipcode', 'privacy_flag'],
    consentTrue: 'true',
    consentFalse: 'false',
    phoneFormat: 'e164',              // 'e164' | 'digits' | 'national'. Verificare il destinatario.
    technicalValues: {},             // Solo valori APPROVATI. Es. { partnerId: '...' }.
    technicalAllowlist: ['mci', 'sorg', 'adclid', 'icmp', 'partnerId', 'PartnerID', 'partnerID'],
    attributionFields: {mci: 'mci', sorg: 'sorg', adclid: 'adclid', icmp: 'icmp'}
  },

  validation: {
    callingCode: '49',
    trunkPrefix: '0',
    allowInternational: true,
    minNationalDigits: 5,
    maxNationalDigits: 13,
    nameMaxLength: 100,
    postcodePattern: '^\\d{5}$'       // Sintassi PLZ; NON prova di copertura commerciale.
  },

  attribution: {
    fallbackMci: null,               // Nessun MCI IT/FR usato come ripiego.
    allowedParams: ['mci', 'sorg', 'adclid', 'icmp'],
    maxLength: 200,
    allowedLinkOrigins: ['https://www.bookappointmentonline.com'],
    requireMci: false,
    /* URL > campo nativo esistente > fallback; CTA non sovrascrive MCI. */
    icmp: {
      bottomCta: 'cta_footer',
      back: null,
      postcodeContinue: null,
      submit: null
    }
  },

  tracking: {
    enabled: false,                  // UI e invio NON dipendono dall'attivazione analytics.
    forbiddenPageIDs: ['900323'],
    retryEveryMs: 200,
    queueTtlMs: 10000,
    maxQueue: 32,
    contactLifetimeMs: 15000,
    contactOnSubmit: true,
    contactOnSuccess: true,
    phoneFormat: 'digits',
    /* Contratto leggibile. Nessun eventName inventato nel motore UI. */
    events: {
      firstView: 'form_multi_0',
      formView: 'form_view',
      submit: 'form_submit',
      success: 'form_sent',
      rejection: 'rejection'
    },
    directCalls: {
      submit: null,                 // fb_data_complete non attivato senza verifica Adobe.
      success: 'typ_step_get_earpros'
    },
    sendSuccessToWaGc: false,         // Il popup originale usava solo il direct call per il lead.
    /* Collegare alla CMP esistente. true consente, false nega, null = non noto.
       Questo reader NON usa la checkbox marketing e non forza il consenso. */
    consentReader: function (destination) {
      var api = window.AmplifonConsent;
      return api && typeof api.canTrack === 'function' ? api.canTrack(destination) : null;
    }
  },

  success: {
    redirectUrl: null,               // Non si invia l'utente alla TYP italiana.
    redirectDelayMs: 5000,
    allowedRedirectOrigins: ['https://www.bookappointmentonline.com'],
    requiredPathPrefix: '/de/',
    allowNativeConfirmationHandshake: true
  },

  funnel: {
    start: 'noise',
    /* Le regole reject sotto sono una CONFIGURAZIONE PROPOSTA, non un dato
       verificato del DOM originale. Il live è bloccato da rejectionRulesReviewed.
       Confermare: noise NEIN prosegue; age/trial NEIN mostra l'esclusione. */
    steps: [
      {
        id: 'noise', type: 'choice', trackingNumber: 1, viewEvent: 'form_multi_0',
        title: 'Fällt es Ihnen schwer, Gesprächen in lauten Umgebungen zu folgen?',
        trackingQuestion: 'Fällt es Ihnen schwer, Gesprächen in lauten Umgebungen zu folgen?',
        options: [
          {id: 'yes', label: 'JA', trackingLabel: 'JA', next: 'age', reject: false, icmp: null},
          {id: 'sometimes', label: 'MANCHMAL', trackingLabel: 'MANCHMAL', next: 'age', reject: false, icmp: null},
          {id: 'no', label: 'NEIN', trackingLabel: 'NEIN', next: 'age', reject: false, icmp: null}
        ]
      },
      {
        id: 'age', type: 'choice', trackingNumber: 2, viewEvent: 'form_multi_1',
        title: 'Sind Sie 50 Jahre oder älter?',
        trackingQuestion: 'Sind Sie 50 Jahre oder älter?',
        options: [
          {id: 'yes', label: 'JA', trackingLabel: 'JA', next: 'trial', reject: false, icmp: null},
          {id: 'no', label: 'NEIN', trackingLabel: 'NEIN', next: 'trial', reject: true, icmp: null}
        ]
      },
      {
        id: 'trial', type: 'choice', trackingNumber: 3, viewEvent: 'form_multi_2',
        title: 'Möchten Sie innovative und fast unsichtbare Hörgeräte testen?',
        trackingQuestion: 'Möchten Sie innovative und fast unsichtbare Hörgeräte testen?',
        options: [
          {id: 'yes', label: 'JA', trackingLabel: 'JA', next: 'postcode', reject: false, icmp: null},
          {id: 'no', label: 'NEIN', trackingLabel: 'NEIN', next: 'postcode', reject: true, icmp: null}
        ]
      },
      {
        id: 'postcode', type: 'postcode', trackingNumber: 4, viewEvent: 'form_multi_3',
        title: 'Geben Sie Ihre Postleitzahl ein, um das Amplifon Fachgeschäft in Ihrer Nähe zu finden',
        trackingQuestion: 'ZIPCODE',
        trackingAnswer: 'WEITER',     // NON inviare il valore PLZ come risposta analytics.
        next: 'contact'
      }
    ]
  },

  copy: {
    heading: 'Finden Sie heraus, ob Sie für den kostenlosen Test der neuesten Hörgeräte-Generation infrage kommen',
    intro: 'Beantworten Sie jetzt 4 Fragen!',
    back: 'Zurück',
    next: 'WEITER',
    postcodeLabel: 'Postleitzahl',
    postcodePlaceholder: '',
    progressLabel: 'Fortschritt',
    features: [
      'Fast unsichtbare und diskrete Hörgeräte',
      'Modernste Technologie, die die Lautstärke automatisch reguliert',
      'Reduziert Störgeräusche für ein einwandfreies Sprachverstehen'
    ],
    reviewsHeading: 'Erfahren Sie, was unsere Kunden über dieses revolutionäre Hörgerät sagen!',
    contactHeading: 'HERZLICHEN GLÜCKWUNSCH!',
    contactSubheading: 'Sie haben Anspruch auf einen kostenlosen Hörtest!',
    contactFeaturesHeading: 'Und schauen Sie, was diese Hörgeräte können!',
    contactFeatures: [
      'Fast unsichtbar und diskret',
      'Reduziert Störgeräusche für ein einwandfreies Sprachverstehen',
      'Modernste Technologie, die die Lautstärke automatisch reguliert'
    ],
    formHeading: 'Füllen Sie Ihre Daten aus und sichern Sie sich Ihre kostenlose Beratung',
    formIntro: 'Hinterlassen Sie hier Ihre Daten – wir rufen Sie an, um einen Termin zu vereinbaren.',
    labels: {first_name: 'Vorname', last_name: 'Nachname', email: 'E-Mail', phone_number: 'Telefonnummer'},
    placeholders: {first_name: '', last_name: '', email: '', phone_number: ''},
    privacyHeading: 'Bedingungen und Datenschutz',
    privacyText: 'Ich akzeptiere die Bedingungen der Datenschutzhinweise.',
    marketingHeading: 'Sonderangebote',
    /* Traduzione di lavoro del consenso originale completo: richiede approvazione DE. */
    marketingText: 'Ich willige in die Verarbeitung meiner personenbezogenen Daten ein, um personalisierte Werbeinformationen (profilbasiertes Marketing) über automatisierte Kontaktkanäle (SMS, MMS, E-Mail, WhatsApp) oder traditionelle Kontaktkanäle (Telefonanrufe durch Mitarbeiter, Briefpost) zu erhalten.',
    more: 'Mehr erfahren',
    callout: 'Ein Berater ruft Sie innerhalb von 24 Stunden an, um Ihren Termin zu vereinbaren – unverbindlich.',
    submit: 'JETZT TERMIN BUCHEN',
    submitNote: 'Mit Klick auf „Jetzt Termin Buchen“ stimmen Sie der Verarbeitung Ihrer Daten gemäß dem Link am Seitenende zu.',
    bottomHeading: 'Beantworten Sie 4 Fragen und testen Sie diese innovativen Hörgeräte!',
    bottomCta: 'JETZT STARTEN',
    disclaimer: 'Je nach Testergebnis und Verfügbarkeit im Fachgeschäft kann das Hörgerät, das Sie testen, leicht von dem in der Anzeige gezeigten Modell abweichen. Unsere Hörexperten wählen ein Modell mit vergleichbarer Technologie und Ausstattung aus, das Ihren Bedürfnissen entspricht.',
    privacyLinkLabel: 'Datenschutz',
    cookieLinkLabel: 'Cookies',
    /* I link DE sono riferimenti pubblici, non approvazione del consenso della campagna. */
    privacyUrl: 'https://www.amplifon.com/de/datenschutz',
    cookiesUrl: 'https://www.amplifon.com/de/cookies-policy',
    rejectionHeading: 'Es tut uns leid!',
    rejectionText: 'Leider entsprechen Sie nicht dem Profil, das wir suchen.',
    editAnswer: 'Antwort ändern',
    sending: 'Ihre Daten werden übermittelt …',
    successHeading: 'Vielen Dank!',
    successText: 'Ihre Anfrage wurde übermittelt.',
    popupWaiting: 'Die Bestätigung Ihrer Anfrage wird geprüft …',
    popupNoContext: 'Für dieses Fenster liegt keine bestätigte Anfrage vor.',
    close: 'Schließen',
    errors: {
      required: 'Dieses Feld ist erforderlich.',
      name: 'Bitte prüfen Sie Ihre Eingabe.',
      email: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
      phone: 'Bitte geben Sie eine gültige Telefonnummer ein.',
      postcode: 'Bitte geben Sie eine fünfstellige Postleitzahl ein.',
      privacy: 'Bitte bestätigen Sie die Datenschutzhinweise.',
      unavailable: 'Das Formular ist derzeit nicht verfügbar. Bitte versuchen Sie es später erneut.',
      staging: 'Die Übermittlung ist in dieser Testversion noch nicht freigegeben.',
      nativeValidation: 'Bitte prüfen Sie Ihre Angaben. Die Anfrage wurde nicht übermittelt.',
      unknown: 'Die Übermittlung wurde noch nicht bestätigt. Bitte senden Sie die Anfrage nicht erneut. Eine nachträgliche Bestätigung wird hier angezeigt.',
      failed: 'Die Anfrage konnte nicht gestartet werden. Bitte versuchen Sie es erneut.',
      configuration: 'Die Seite konnte nicht vollständig geladen werden. Bitte versuchen Sie es später erneut.'
    }
  },

  /* Testi e date riprodotti integralmente. Non sono stati forniti voti numerici:
     rating:null NON attribuisce automaticamente cinque stelle alle nuove review. */
  reviews: [
    {
      name: 'Angel Großmann', date: '16/09/26', isoDate: '2026-09-16', rating: null,
      text: 'Hier ist man seeehr gut aufgehoben, wir sind sehr zufrieden, haben eine sehr gute und freundliche Beratung und Hilfe erhalten, es wird alles sehr gut erklärt, so dass keine Fragen offen bleiben, leider kann man nicht mehr Sterne vergeben.'
    },
    {
      name: 'Kristina Miller', date: '15/09/26', isoDate: '2026-09-15', rating: null,
      text: 'Ich wurde in der Filiale sehr gut beraten und habe mich rundum gut betreut gefühlt. Die Filialleiterin ist sehr nett. Ich bin sehr zufrieden mit meinen neuen Hörgeräten!'
    },
    {
      name: 'Peter Hylla', date: '15/09/26', isoDate: '2026-09-15', rating: null,
      text: 'Sehr kompetente und freundliche Mitarbeiterin. Hat sich viel Zeit genommen. Mir vieles erklärt und meine Geräte optimiert. Beide Daumen hoch'
    }
  ]
};
