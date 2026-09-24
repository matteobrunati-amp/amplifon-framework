# Amplifon Framework

Framework JavaScript/CSS condiviso per le landing Amplifon / EarPros costruite su Unbounce.

## Principio

Unbounce contiene soltanto:

1. configurazione specifica della pagina;
2. loader della release del framework;
3. form nativo Unbounce e pulsante submit nativo, nascosti dal bridge.

Il comportamento comune vive in questo repository ed è versionato per release.

## Struttura

```text
src/
  multistep/
    01_UTILS.js
    02_TRACKING.js
    03_ATTRIBUTION.js
    04_RENDERER.js
    05_MULTISTEP_ENGINE.js
    06_UNBOUNCE_BRIDGE.js
    07_LEAD_BOOTSTRAP.js
  styles/
    amplifon-multistep.css
  confirmation/
    amplifon-confirmation.js
configs/examples/
  de365.page-config.example.js
dist/
  1.0.0/
    amplifon-multistep.js
    amplifon-multistep.css
    amplifon-confirmation.js
    manifest.json
scripts/
  build.mjs
docs/
```

## Build

Richiede Node.js 18+.

```bash
npm run build
```

La versione della release deriva da `package.json` e viene generata in `dist/<version>/`.

## Regola di rilascio

Non usare `main`, `latest` o URL non versionati nelle landing pubblicate.

Per una release 1.0.0:

```text
https://cdn.jsdelivr.net/gh/matteobrunati-amp/amplifon-framework@v1.0.0/dist/1.0.0/amplifon-multistep.js
https://cdn.jsdelivr.net/gh/matteobrunati-amp/amplifon-framework@v1.0.0/dist/1.0.0/amplifon-multistep.css
```

Ogni landing resta bloccata alla release collaudata finché non viene aggiornata esplicitamente.

## Asset grafici

Le immagini non appartengono a questo repository. Sono servite dal repository GitHub dedicato agli asset e vengono dichiarate nella configurazione pagina.

## Configurazioni pagina

`configs/examples/` contiene esempi e non è la sorgente operativa delle landing. La configurazione reale rimane nella singola pagina Unbounce per rendere testi, tracking e parametri locali facilmente modificabili.

## Documentazione

- `docs/ARCHITETTURA.md`
- `docs/INSTALLAZIONE_UNBOUNCE.md`
