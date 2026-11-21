# Benchmark — Histography / Chronas pour une encyclopédie historique mondiale

> Date : 2026-11-21 · Décision : données Chronas (CC BY-SA 4.0) + interface Histography reconstruite en clean-room dans Vectemporel.

## 1. Ce que veut l'utilisateur

Une encyclopédie pour apprendre l'histoire de **chacun des pays du monde**, optimisée pour l'ergonomie cognitive, avec du plaisir et des visuels qui soutiennent l'engagement. Formulation prudente : aucun projet sérieux ne vise « stimuler la dopamine/serotonine » ; les leviers vérifiables sont feedback immédiat, rappel actif, répétition espacée, entrelacement, double codage visuel, difficulté adaptative, progression visible, nouveauté et saillance émotionnelle (MAD Learn 2021 ; gamification studies 2018–2019).

## 2. Verdicts de licence

| Projet | Licence code | Licence données | Verdict |
|---|---|---|---|
| [Histography](https://histography.io/) — Matan Stauber, Bezalel 2015 | aucun dépôt, aucun LICENSE | — | 🔴 **Non forkable**. Reproduction fonctionnelle autorisée, copie de code/design interdite |
| [Chronasorg/chronas-api](https://github.com/Chronasorg/chronas-api) | 🟢 MIT (LICENSE présent) | 🟡 CC BY-SA 4.0 (`DATA-LICENSE.md`) | ✅ Forkable ; 50 M points, Node 24/Lambda + DynamoDB |
| [daumann/chronas-application](https://github.com/daumann/chronas-application) | 🟢 MIT (2017) | — | ✅ Forkable mais stack Django/Leaflet/PostGIS ancienne |
| [Chronasorg/chronas-frontend](https://github.com/Chronasorg/chronas-frontend) | ⚪ aucun LICENSE | — | ⚠️ Fork technique ToS GitHub, **aucun droit de réutilisation** |
| [Chronasorg/chronas](https://github.com/Chronasorg/chronas) v2 beta | ⚪ aucun LICENSE | — | ⚠️ Idem |

## 3. Scores (pondération : similarité 30 %, recouvrement 30 %, contraintes 20 %, maturité 10 %, différenciation 10 %)

| Candidat | Similarité | Recouvrement | Contraintes | Maturité | Différenciation | Total |
|---|---:|---:|---:|---:|---:|---:|
| Chronas (API + données) | 5 | 4 | 4 | 5 | 5 | **4,5** |
| Histography (expérience) | 5 | 4 | 2 | 2 | 5 | **3,8** |
| pilgrims-path (CC0, SRS + feedback) | 4 | 4 | 5 | 2 | 4 | **3,8** |
| ultimate-history (MIT + CC BY-SA) | 4 | 3 | 5 | 3 | 4 | **3,7** |
| Tempora (MIT, simulation mondiale) | 4 | 3 | 5 | 3 | 5 | **3,8** |
| Chronos_App (fermé) | 5 | 5 | 3 | 3 | 5 | **4,3** — 🔴 non réutilisable |

## 4. Écarts et idées transférées

| Gap Vectemporel | Source | Idée retenue |
|---|---|---|
| 10 pays seulement | Chronas `/v1/areas/{year}` | Snapshot borné de données mondiales au build, extension progressive vers ~195 pays |
| Timeline « dots » absente | Histography | Vue Timeline en clean-room : dots = événements, bandes d'ères, catégories, « Feeling Lucky », son Web Audio |
| Deep links limités | Chronas `?type=area&value=…&pos=lat,lon,zoom&year=…` | Sérialiser type/valeur/position/année dans le hash |
| Apprentissage passif | pilgrims-path, ultimate-history | Rappel actif, indices bidirectionnels, SRS, feedback immédiat |
| Provenance faible | Vectemporel + Chronas DATA-LICENSE | CC BY-SA + attribution Chronas/Wikipédia sur la couche importée |

## 5. Contraintes techniques relevées

- Histography : PixiJS 3.0 + jQuery 1.10, 3,2 Mo, refuse iPhone Safari (test indépendant 2026) → **ne pas reproduire ces choix**.
- Chronas API : `/v1/version` → 1.3.92 ; `/v1/areas/1000` ~133 Ko ; `/v1/markers?year=1000` ~73 Ko ; `/v1/metadata?type=g&f=provinces` ~750 Ko. Throttling documenté ; **copie locale préférée** au cache live (DATA-LICENSE).
- Vectemporel doit rester zéro réseau au runtime : import **uniquement au build**, snapshot versionné, PWA inchangée.

## 6. Décisions

1. Ne pas fork Histography ; reconstruire son interaction en clean-room.
2. Importer Chronas en snapshot borné et déterministe, avec attribution et CC BY-SA 4.0 sur les données.
3. Ajouter une vue Timeline dot-based à Vectemporel sans changer la taxonomie à 6 vues (mode dans la Chronologie).
4. Reproduire le deep link Chronas dans le store.

Sources consultées le 2026-11-21 via websearch, `veille` (GitHub/DDG) et l'API publique `api.chronas.org`.
