# Installazione sulla landing DE365

## 1. Pubblicare il framework su GitHub

Creare il repository previsto oppure modificare `framework.baseUrl` nel PAGE CONFIG. Caricare la cartella `github/amplifon-framework/`, creare il tag/release `v1.0.0` e verificare che i tre file in `dist/1.0.0/` siano raggiungibili.

L'URL proposto nel config è:

`https://cdn.jsdelivr.net/gh/matteobrunati-amp/amplifon-framework@v1.0.0/dist/1.0.0/`

Se repository, organizzazione o tag sono diversi, cambiare solo `framework.baseUrl`.

## 2. Unbounce — Head

Inserire nell'ordine:

1. `01_PAGE_CONFIG_HEAD.html`
2. `02_FRAMEWORK_LOADER_HEAD.html`

Non inserire più separatamente Utils, Tracking, Renderer, Engine, Bridge e Lead+Bootstrap.

## 3. Unbounce — elementi nativi

Mantenere soltanto il form nativo e il pulsante submit nativo con i campi/integration originali. Il framework li nasconde e li usa come backend del form visibile generato dal renderer.

Rimuovere i vecchi blocchi grafici e i vecchi script locali dopo il collaudo sulla variante/copia.

## 4. Confirmation Dialog

Dalla v1.0.13 usare solo il Form Confirmation Dialog nativo. Rimuovere dalla tab JavaScripts del dialog il loader di `amplifon-confirmation.js`. Testi e grafica del dialog si modificano esclusivamente nell’editor Unbounce. Nessun tracking o secondo submit nel dialog: la pagina principale continua a gestire successo, dedupe, conversioni e redirect.

## 5. Prima del live

Completare nel PAGE CONFIG i valori ancora non verificati: pageID DE, MCI/partner se richiesti, URL GitHub mancanti, regole di esclusione, testi legali/CMP e redirect. Poi passare `runtime.mode` a `live` e `tracking.enabled` a `true` solo dopo il collaudo.

## 6. Ownership dei contenuti

Il framework contiene solo logica tecnica e temi CSS riutilizzabili. Il PAGE CONFIG della singola landing resta in Unbounce e non viene copiato nel repository framework. Copy, domande, recensioni, testi legali, MCI/ICMP, conversion ID, URL e asset configurabili devono quindi essere modificabili da Unbounce.

## 7. Pulsante indietro

Nel PAGE CONFIG usare `funnel.navigation.backEnabled`. Il default effettivo è `false`: se la proprietà manca oppure vale `false`, il renderer non crea il pulsante. Per abilitarlo impostare `true`; non è necessario modificare il framework o il CSS. `copy.back` definisce la label e `attribution.icmp.back` può essere valorizzato se si vuole associare un ICMP al click.
