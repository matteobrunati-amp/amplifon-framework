# Countdown — dalla v1.1.0

Il countdown è opzionale. Senza `countdown`, oppure con `enabled: false`, le pagine mantengono il comportamento precedente. Tutti i testi e i tempi restano nello **SCRIPT 1 — PAGE CONFIG** di Unbounce; il repository contiene solo il componente riutilizzabile.

## Settings di pagina

Aggiungere questo oggetto dentro `window.AMPLIFON_CONFIG`, allo stesso livello di `copy`, `funnel` e `tracking`:

```js
countdown: {
  enabled: true,                  // false = nasconde tutto
  mode: 'deadline',               // 'deadline' oppure 'duration'
  endsAt: '2026-10-31T23:59:59+01:00', // scadenza con fuso orario esplicito
  durationSeconds: 1800,          // usato solo con mode: 'duration' (30 minuti)
  placements: {
    header: true,                // banner nella parte iniziale del questionario
    contact: true                // banner compatto sopra il form di contatto
  },
  urgentThresholdSeconds: 172800, // testi urgenti nelle ultime 48 ore; 0 = disabilitati
  expiredBehavior: 'message',     // 'hide' = scompare; 'message' = mostra text.expired
  text: {
    header: 'Approfitta della promozione entro:',
    contact: 'Tempo rimanente:',
    urgentHeader: 'Ultimi giorni per aderire:',
    urgentContact: 'La promozione sta per terminare:',
    expired: 'La promozione è terminata.'
  },
  labels: {days: 'g', hours: 'h', minutes: 'm', seconds: 's'}
}
```

I testi sono un esempio da adattare nella pagina, non copy preimpostato nel framework. `urgentHeader` e `urgentContact` sono facoltativi: se assenti o vuoti resta il testo ordinario. I testi supportano a capo con `\n` e sono trattati come testo semplice, senza eseguire HTML.

## Data di scadenza o durata

- **deadline**: tutti i visitatori vedono la stessa scadenza; ricaricare la pagina non la sposta. `endsAt` richiede data, ora, secondi e fuso (`Z`, `+01:00`, `+02:00`, ecc.). Una data passata applica subito il comportamento di scadenza.
- **duration**: il tempo parte quando il framework monta la pagina. Una sola scadenza governa questionario e contatto; avanti/indietro non la riavviano. Un reload o una nuova visita fa partire una nuova durata. Non vengono usati cookie o storage. Per una promozione con scadenza reale usare `deadline`. Durata ammessa: da 1 secondo a 365 giorni.

Il fuso va scelto per **la data della scadenza**: in Italia e Spagna continentale il 31 ottobre 2026 l'offset è `+01:00`. La pagina di riferimento usa `+02:00`, quindi quel valore termina un'ora prima dell'ora locale indicata.

## Visibilità e fine countdown

`placements.header` e `placements.contact` sono indipendenti. Il banner iniziale appartiene alla vista questionario e quello compatto alla vista contatto. `enabled: false` basta per disattivare entrambi, anche lasciando gli altri settings incompleti.

A zero il timer si ferma: con `hide` sparisce; con `message` rimane soltanto `text.expired`, senza numeri negativi o riavvii. Il countdown è informativo: non blocca il form, non decide l'idoneità all'offerta e non invia conversioni. Eventuali vincoli commerciali devono essere applicati dal sistema che gestisce l'offerta.

Il componente eredita colore e font dal tema della pagina, si adatta al mobile e non annuncia ogni secondo agli screen reader. Il tempo dipende dall'orologio del dispositivo e si riallinea al tempo trascorso quando una scheda torna attiva.

## Aggiornamento della landing

1. Adottare JS e CSS **entrambi v1.1.0**, mantenendo il tema già utilizzato (`amplifon-multistep.css` oppure `amplifon-multistep-amplifon.css`).
2. Impostare `framework.version: '1.1.0'` nel PAGE CONFIG e aggiornare gli URL del loader alla release pubblicata.
3. Inserire `countdown` nei settings; verificare lingua, scadenza, fuso, entrambe le posizioni e comportamento finale in anteprima Unbounce.
4. Pubblicare soltanto le pagine che devono adottare la nuova release. Le landing fissate alle release precedenti non cambiano.

Gli URL `@v1.1.0/dist/1.1.0/...` diventano utilizzabili dopo la pubblicazione del relativo tag. La sola creazione del branch o della pull request non pubblica la release.
