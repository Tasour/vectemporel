# V-ATLAS — Vectemporel V2

Application neuve, reconstruite de zéro selon le plan `/home/tasour/.opencode/plan/V_ATLAS_PLAN.md`.

**Règle principale :** aucun lien Grokipedia, aucun service externe dans l’interface. Les points de connaissance sont générés depuis les audits locaux.

## Lancer

```bash
npm install
npm run build:data
npm start
```

Ouvrir `http://127.0.0.1:4181`.

## Vérifier

```bash
npm run verify
npm run test:e2e
```

- `verify` contrôle le jeu de données, les images, les identifiants et l’absence de lien externe.
- `test:e2e` parcourt le globe, la chronologie, le détail, le récit, la géographie et la constellation au clavier.

## Structure

```text
index.html
styles.css                     design system local
public/                        textures du globe, moteur Three.js, images
src/
  data/dataset.js              généré, jamais édité
  domain/store.js              état unique et sélecteurs
  platform/keyboard.js         routeur clavier unique
  ui/shell.js                  coque commune
  views/globe.js               sélecteur de pays 3D
  views/chronology.js          vue par défaut
  views/recit.js               lecture guidée des points
  views/geography.js           carte schématique locale
  views/constellation.js       vue optionnelle, figée
scripts/
  build-dataset.mjs            génère le dataset depuis les audits
  serve.mjs                    serveur statique local
  verify.mjs                   contrôles de cohérence
tests/e2e.mjs                  parcours clavier complet
```

## Génération des points

`scripts/build-dataset.mjs` lit :

- `../vectemporel/data.js` pour les repères curatés ;
- `../vectemporel/audits/<pays>/country-audit.yaml` pour ères, acteurs, lieux, claims, omissions et gouvernance ;
- `../vectemporel/audits/<pays>/source-register.csv` pour les références ;
- `../vectemporel/event-images.js` pour les images vérifiées.

Il produit **229 repères** et **901 points** : phrases des résumés vérifiés, affirmations des audits, figures et lieux documentés. Chaque point garde son degré de certitude et ses identifiants de source.

## Navigation

| Touche | Action |
| --- | --- |
| `1`–`5` | Monde, Chronologie, Récit, Géographie, Constellation |
| `←` `→` | repère / point / lieu précédent ou suivant |
| `↑` `↓` | période précédente / suivante |
| `Entrée` | ouvrir le détail d’un repère |
| `Espace` | lecture du récit ou changement de périmètre géographique |
| `Échap` | fermer le détail ou revenir au monde |
| `?` | aide |

## État de validation

- Cycle en V : phases A–G réalisées (besoin, exigences, données, architecture, interaction, design, implémentation).
- Phases H–J automatisées : `npm run verify` et `npm run test:e2e`.
- Phase K (validation utilisateur, 20 participants) reste à faire.
- Dette éditoriale héritée des audits : audits non signés, schéma de preuve partiel, sources non concluantes.

Le projet reste un **POC v0.1**, pas une v1.0 académique.
