# Vague RECIT — 100 lentilles

100 sous-agents, un module dédié `src/views/recit/E01.js` … `E100.js`, 10 chantiers chacun, les 10 implémentés. Synthèse maître dans `SYNTHESE.md`.

Contrat : `register('Enn', ctx => {...})` ; ctx = { stage, layout, css(id,rules), el(tag,cls,text), reducedMotion() }. CSS via ctx.css, IDs uniques, zéro console/réseau/aléa. Validation : node --check uniquement par lentille ; suites rejouées par l'agent maître.
