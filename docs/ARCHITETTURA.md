# Architettura v0.4.0

## Cosa resta nella landing Unbounce

La pagina contiene soltanto:

1. **SCRIPT 1 — PAGE CONFIG**: tutte le variabili specifiche della landing: pageID, lingua, copy, domande, recensioni, asset GitHub, MCI/ICMP, mapping form, validazioni, tracking e successo.
2. **SCRIPT 2 — FRAMEWORK LOADER**: carica CSS e bundle condivisi, bloccati a una release precisa.
3. **Form Unbounce nativo + pulsante submit nativo**: restano nel DOM e vengono nascosti/controllati dal bridge.

Non devono rimanere i vecchi blocchi grafici o gli otto script funzionali separati nella pagina.

## Cosa sta su GitHub

I moduli sorgente rimangono separati per responsabilità:

- Utils
- Tracking
- Attribution
- Renderer
- Multistep Engine
- Unbounce Bridge
- Lead + Bootstrap

In produzione vengono assemblati in `amplifon-multistep.js`. In questo modo il codice rimane modulare nel repository ma la pagina carica un solo JS condiviso.

## Perché è importante versionare

Una pagina online non deve cambiare comportamento quando si lavora sulla successiva. La landing punta quindi a `v1.0.0`, non a `main`. Una nuova release, per esempio `v1.1.0`, viene adottata solo dalle pagine che vengono esplicitamente aggiornate e collaudate.

## Asset

Tutte le immagini sono URL GitHub configurati nel PAGE CONFIG. Nessun asset visuale deve dipendere dalla Media Library Unbounce.
