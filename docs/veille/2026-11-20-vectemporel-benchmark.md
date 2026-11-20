# Benchmark concurrentiel — Vectemporel Atlas

> **Date** : 2026-11-20 · **Cible** : Vectemporel Atlas v0.1 (`~/Projects/vectemporel-atlas`)
> **Mode** : complet (décision produit / veille) · **Skill** : `benchmark-concurrentiel`
> **Méthode** : 4 requêtes ciblées (2 FR, 2 EN) → ~25 candidats aperçus → **20 scorés** → **11 analysés en profondeur** par sous-agents `veilleur-concurrentiel` en lecture seule. Surface publique uniquement ; aucun code tiers exécuté, aucun fichier du projet modifié, aucun paywall contourné.
> **Règle d'honnêteté** : ce scan n'est **pas exhaustif**. Les scores sont des jugements d'analyste à partir de preuves publiques, pas des mesures. Les chiffres des candidats sont déclarés par eux et non recalculés, sauf quand une source primaire (API GitHub, LICENSE, page datée) a été consultée.

---

## 1. Fiche cible et requêtes

**Cible** — Atlas historique hiérarchique local, v0.1. Six vues macro→micro : globe 3D (Three.js local, texture de picking, drapeaux vectoriels), chronologie (56 ères / 229 repères), récit guidé (auto-lecture), géographie schématique SVG sans tuile, constellation figée, points (matrice 14 domaines × 56 ères). Stack : ES modules vanilla, serveur Node `http` statique, scripts YAML/CSV, Puppeteer. **Contraintes structurantes** : zéro réseau à l'exécution, tout local, service systemd, navigation clavier complète, provenance et certitude par point. **Public** : curieux, enseignants, apprenants francophones.

**Gaps de départ** (extraits de `AUDIT_COMPLET.md`, 2026-11-20) : deep links incompatibles, recherche inter-pays absente, fiche détail sans image ni crédit, comparaison de pays non réalisée, « 100 % de couverture » contesté (399 cellules ouvertes), 135 points sans source dont 44 `certain`, vocabulaire de certitude divergent, 920 requêtes / 6,1 Mo au chargement, 1 632 modules « lentilles », 3 vues sans `<h1>`, cibles tactiles 14 px.

**Requêtes utilisées** (2026-11-20) :
1. `atlas historique interactif open source globe frise chronologique offline`
2. `interactive historical atlas open source github timeline 3D globe local-first`
3. `open source knowledge graph explorer hierarchical timeline offline visualization license MIT`
4. `alternative Timeline JS StoryMapJS histoire interactive timeline outil open source`

**Pondération adaptée** (conforme au skill, à justifier dans le rapport) : similarité de domaine **30 %**, recouvrement fonctionnel **30 %**, compatibilité des contraintes **20 %** (au lieu de 15 % — le zéro réseau est bloquant), maturité **10 %** (au lieu de 15 %), différenciation **10 %**.

---

## 2. Tableau des 20 candidats

`O` = ouvert (code public) · `F` = fermé (surface publique seule) · Licence = preuve trouvée, sinon `inconnue`.

| # | Famille | Candidat | URL | O/F | Licence déclarée / prouvée | Stack ou signal d'activité | Consulté |
|---|---|---|---|---|---|---|---|
| 1 | A | FayezBast/chronoatlas | github.com/FayezBast/chronoatlas | O | **aucune** (API `license: null`, LICENSE 404) | React 19 / TS / MapLibre · 5★, 2 forks, 2 commits | 2026-11-20 |
| 2 | A | GeoTime | github.com/karangupta8/GeoTime | O | MIT (fichier LICENSE + API) | React/Vite/Mapbox · 73 commits, 0★ | 2026-11-20 |
| 3 | A | OpenHistory | github.com/kdhillon/openhistory | O | MIT **déclaré**, fichier absent | React 19 / MapLibre / FastAPI · 9★, 210 commits | 2026-11-20 |
| 4 | A | Jiangshan Map | github.com/DeanChensj/jiangshan-map | O | GPL-3.0 + exceptions CHGIS 🔴 | JS vanilla, zéro npm · ~8,4 k★, ~460 commits, v1.3.0 | 2026-11-20 |
| 5 | A | timeline-atlas | github.com/bartromgens/timeline-atlas | O | MIT | Django / Angular / Leaflet · 0★, 69 commits | 2026-11-20 |
| 6 | A | History of Europe in Frames | github.com/stabruriss/history-of-europe-in-frames | O | MIT + BSD-2 + domaine public | HTML vanilla / Leaflet · 0★, 227 commits, actif 19/11 | 2026-11-20 |
| 7 | B | Erask | erask.org | F | code inconnu ; données CC0/CC BY-SA/Commons | PWA, globe GPU, index local · 90 705 événements | 2026-11-20 |
| 8 | B | Pastlas | pastlas.com | F | code GPL-3.0 déclaré ; données 🔴 copyright | app hébergée + pages statiques · v2.40.0 (15/11) | 2026-11-20 |
| 9 | B | Chronica Maps | chronicamaps.com | F | logiciel inconnu ; données GPL-3.0 | D3 / SVG / pages `.md` · MAJ 17/11 | 2026-11-20 |
| 10 | B | RewindMap | rewindmap.com | F | inconnue | globe/flat, calques, stories · non audité | 2026-11-20 |
| 11 | B | ChronoAtlas.nl | chronoatlas.nl | F | du site : inconnue (TOS interdit copie) | MapLibre / Protomaps / OpenAI · 99 cartes, 516 leçons | 2026-11-20 |
| 12 | B | Human Saga | humansaga.net | F | inconnue (données CC BY-SA) | carte + frise · 163 empires, 1 283 événements | 2026-11-20 |
| 13 | C | TimelineJS / TimelineNG | timeline.knightlab.com | O | MPL 2.0 | Google Sheets / JSON · 1 M timelines, 1 Md vues | 2026-11-20 |
| 14 | C | StoryMapJS | storymap.knightlab.com | O | MIT | slides cartographiques, gigapixel | 2026-11-20 |
| 15 | C | TimeMapper | timemapper.okfnlabs.org | O | open source OKFN, licence non vérifiée | Google Sheets / Leaflet / TimelineJS | 2026-11-20 |
| 16 | D | GeoViz | github.com/JeremyChou28/GeoViz | O | Apache-2.0 prouvée, **code absent** | 3 vues Tree-Net-Map · 13★, 27 commits, gelé depuis 2024 | 2026-11-20 |
| 17 | D | Timeline Generator | github.com/docxology/timeline_generator | O | MIT (fichier ajouté le 09/11) | TS/React/D3/Neo4j · 6★, 204 tests déclarés | 2026-11-20 |
| 18 | D | Semantica Explorer | github.com/Sameer6305/semantica | O | MIT déclaré (non revérifié en source) | React 19 / Sigma.js · 3 135 commits | 2026-11-20 |
| 19 | D | Astrapai | github.com/OSideMedia/Astrapai | O | MIT déclaré (non revérifié) | Next.js / Supabase / D3 · 365 commits | 2026-11-20 |
| 20 | D | InferaGraph | inferagraph.ai | O | MIT déclaré (non revérifié) | Three.js / graphe 3D / ARIA · v0.15.0 | 2026-11-20 |

Familles : **A** atlas historiques open source · **B** atlas grand public (surface publique) · **C** outils récit/timeline · **D** exploration de connaissances multi-vues.

---

## 3. Scores et shortlist

Scores /5 sur les 5 critères pondérés ; `Total` = 0,30·S + 0,30·R + 0,20·C + 0,10·M + 0,10·D. `★` = candidat ayant reçu une fiche d'analyse approfondie.

| Rang | Candidat | S | R | C | M | D | Total | Fiche |
|---|---|---:|---:|---:|---:|---:|---:|:---:|
| 1 | Pastlas | 5 | 5 | 3 | 4 | 5 | **4,5** | ★ |
| 2 | Erask | 5 | 4 | 4 | 3 | 5 | **4,3** | ★ |
| 3 | Chronica Maps | 5 | 4 | 3 | 4 | 4 | **4,1** | ★ |
| 4 | FayezBast/chronoatlas | 5 | 5 | 2 | 2 | 4 | **4,0** | ★ |
| 5 | Jiangshan Map | 5 | 4 | 2 | 4 | 4 | **3,9** | ★ |
| 6 | ChronoAtlas.nl | 5 | 4 | 2 | 3 | 4 | **3,8** | ★ |
| 7 | OpenHistory | 5 | 4 | 2 | 3 | 3 | **3,7** | ★ |
| 8 | History of Europe in Frames | 4 | 3 | 5 | 2 | 4 | **3,7** | ★ |
| 9 | RewindMap | 5 | 4 | 2 | 3 | 3 | **3,7** | — |
| 10 | Human Saga | 5 | 3 | 2 | 3 | 3 | **3,4** | — |
| 11 | GeoTime | 5 | 3 | 2 | 2 | 2 | **3,2** | ★ |
| 12 | Semantica Explorer | 2 | 3 | 3 | 5 | 4 | 3,0 | — |
| 13 | InferaGraph | 2 | 3 | 4 | 3 | 4 | 3,0 | — |
| 14 | timeline-atlas | 4 | 3 | 2 | 2 | 3 | 3,0 | — |
| 15 | GeoViz | 3 | 3 | 2 | 2 | 5 | 2,9 | ★ |
| 16 | Timeline Generator | 3 | 3 | 2 | 3 | 4 | 2,9 | ★ |
| 17 | TimelineJS / TimelineNG | 3 | 2 | 2 | 5 | 2 | 2,6 | — |
| 18 | Astrapai | 2 | 3 | 1 | 4 | 4 | 2,5 | — |
| 19 | StoryMapJS | 3 | 2 | 2 | 4 | 2 | 2,5 | — |
| 20 | TimeMapper | 3 | 2 | 2 | 2 | 2 | 2,3 | — |

**Shortlist retenue (11)** : les 8 meilleurs scores + GeoViz et Timeline Generator, représentants de la famille D (différenciation multi-vues et provenance), + GeoTime (meilleur score open source de la famille A après les précédents). RewindMap et Human Saga (rangs 9 et 10) n'ont pas de fiche approfondie : leur surface publique se limite à la page d'accueil, sans document de méthode ni dépôt consultable. Aucun candidat n'a nécessité de retry échoué ; toutes les fiches sont complètes.

---

## 4. Fiches d'analyse (11)

### 4.1 Pastlas — 4,5/5 · 🟡 code déclaré GPL-3.0 / 🔴 données
Site grand public de Oleh Voronko, v1.0 le 29/09/2026, v2.40.0 le 15/11/2026 (~80 entrées de changelog en 2 mois). 45 321 lignes de record (3 117 États, 11 853 événements, 28 918 personnes, 1 433 œuvres), 13 765 frontières annoncées (1 465 États à frontière dans `llms.txt` : deux mesures distinctes). Patterns : **« unmeasured »** hachuré avec explication quand le record est mince (« A quiet record is not a calm century »), **deux sources deux dates** sans moyenne (Thera 1610 BCE NOAA *et* 1601 Wikidata), liens de vue `?v=&y=&sel=&q=`, comparaison de **12 cas** exportable CSV, formulaire de correction pré-rempli + journal public. Limites : données compilées sous copyright + *database right* (🔴), Google Fonts et Umami à l'exécution, code GPL déclaré mais dépôt introuvable. → Inspiration fonctionnelle uniquement ; priorité absolute pour le gap « 100 % de couverture ».

### 4.2 Erask — 4,3/5 · 🔴 code / 🟢-🟡-⚪ données
Projet personnel de « vibe coding » (Giovanni, Italie), fermé. 90 705 événements datés (4000 BCE→aujourd'hui), 45 catégories, index local unique, PWA hors ligne, zéro compte/tracker. Patterns : **dessin de zone** (Italie → 6 590 entrées + 1 919 références, ~0,03 s affirmé), **règle du temps à arrêts** (1815 → 47 lieux + 77 liste), **événements-intervalles** rendus atténués (1350 : 533 objets dont 450 déjà commencés), expansion des références en branches indentées, crédits désagrégés par jeu de données. Lacunes : dépendance Wikimedia à l'exécution, biais de conflit assumé (13 000 batailles / 273 hôpitaux), ~¼ de points empruntés mal placés, aucune licence de code publiée. → Réimplémenter règle à arrêts, intervalles et marquage de certitude.

### 4.3 Chronica Maps — 4,1/5 · ⚪ logiciel / 🟡-🔴-⚪ données
Site gratuit, pages statiques + jumeaux `.md`, MAJ le 17/11/2026. 39 cartes de frontières, 231 villes, 134 batailles, 243 événements, 92 monuments, 16 voyages, 11 routes, 600 fiches de villes, recherche sur 7 342 villes, 135 pays, 48 ères, 5 outils, 5 langues **dont français**. Patterns : état dans l'URL (`#y1453-c-istanbul-l-en`), table « qui régnait ici » **calculée** depuis les cartes, date de dernière reconstruction en pied de page, comparaison de **deux années**, export GIF/MP4 100 % client, traductions FR/DE/ES déclarées automatiques. Limites : logiciel sans licence publiée (`/terms`, `/license` → 404), images servies depuis `thumb.wikimedia.org`, frontières GPL-3.0, textes sans licence déclarée. → Deep links, recherche inter-pays, traçabilité datée.

### 4.4 FayezBast/chronoatlas — 4,0/5 · 🔴 aucune licence
Prototype React 19/TS/MapLibre, 2 commits (15 et 21/07/2026), 5★. 52 snapshots 10 000 BCE→2010, 3 027 polities indexées avec alias, 37 fiches civilisations, ~110 villes renommées, ~150 événements, 7 récits guidés, 44 guerres / 236 batailles simulées, chronomètre à échelle piecewise 6–300 ans/s, raccourcis clavier, assistant hors-ligne par défaut, palette de 20 teintes validée par 4 critères, `rAF guard`. Limites bloquantes : **aucune licence** (`license: null`, LICENSE 404), 3 URL distantes codées en dur (polices MapLibre, Esri, relief AWS) malgré « static files », 30 Mo de données au `npm run data`. → Réimplémenter index à alias, lazy-load, palette validée ; écarter assistant à clé API.

### 4.5 Jiangshan Map — 3,9/5 · 🟡 GPL-3.0, 🔴 couche CHGIS, ⚪ provinces DataV
Atlas mono-Chine 403 BCE→présent, 18 dynasties, 198 snapshots, ~8,4 k★, ~460 commits, v1.3.0 (13/11/2026), zéro dépendance npm, statique + PWA. Patterns : frise à poignées zoom **16×**, *Ghost Boundary Diff* (contour pointillé de la phase précédente), *Trace Place* (généalogie administrative sur 18 ères), deep links miroir de l'écran (`year, place, person, stop, polity, trace, from, to, lock, autoplay`), compression 26,47 Mo → 2,09 Mo / boot 72 Ko (chiffres tiers), **ratchet de QA** qui refuse régression *et* obsolescence, 139 notices sourcées sur 1 455. Limites : la couche préfecturale CHGIS/Hartwell est **non redistribuable** (🔴), monolithe `app.js` ~668 Ko, 26,47 Mo de sources versionnées, 5 issues ouvertes. → Meilleur exemple observable pour deep links, fiche sourcée et budget réseau ; ne jamais importer CHGIS.

### 4.6 ChronoAtlas.nl — 3,8/5 · ⚪ site sans licence prouvée / 🔴 usage
Site fermé, TOS daté 2026-01-28 interdisant scraping et redistribution. 99 cartes (14 gratuites, 85 Pro), 43 plans de ville, 30 dirigeants en *Rule History*, AR *Time Walk*, 206 motions au Sénat, 516 leçons en 5 langues dont français, assistant OpenAI, deep links géo-temporels. **Homonymie tranchée** : la mention « MIT License © 2026 DRG Software Solutions LLC » dans le TOS qualifie **Tidewater**, composant tiers de Dan Greenheck, **pas le site** ; le dépôt `FayezBast/chronoatlas` est un projet distinct. Limites : dépendance réseau totale (tuiles Sevalla, Photon, OpenAI, Stripe), 85 % des cartes payantes, comparaison de deux **années** seulement, pas de pays. → Crédits par source, deep links, saisie directe de l'année.

### 4.7 OpenHistory — 3,7/5 · ⚪ MIT déclaré sans fichier LICENSE
9★, 210 commits, dernier push 16/05/2026. React 19 / MapLibre / FastAPI / PostgreSQL **hébergé sur Railway** (aucune base locale). Pattern majeur : **cascade de couleurs parent→enfant** (5 signaux Wikidata P150 > P361 > P131 > P127 > P17, intersection d'années, repli par capitale partagée, protection contre cycles), recherche globale avec tri « dans la fenêtre temporelle », récit guidé livré (1 histoire, 20 beats), étiquettes pilotées par l'importance (`sitelinksCount`, `admin_level`). Limites : MIT annoncé sans `LICENSE` (`license: null`), `seed.geojson` 32,8 Mo, PostHog + Google Fonts, scripts écrivant directement en production, doc désynchronisée (React 18 annoncé vs 19.2 réel). → Cascade de couleurs et recherche inter-pays, réimplémentées en local.

### 4.8 History of Europe in Frames — 3,7/5 · 🟢 MIT + BSD-2 + domaine public
0★, 227 commits, dernier le 19/11/2026. **Un seul `index.html` de 16,8 Mo**, une requête, build-time Python stdlib avec 20 placeholders et `assert '/*__' not in t`. 2 137 scènes, 440 sections, 14 chapitres, 19 lignes de **métro historique**, 840 figures, 1 788 fiches datées, 845 tags de moments. Navigation `←→` station / `↑↓` scène avec zoom auto, `aria-keyshortcuts`, `:focus-visible`, `prefers-reduced-motion`, panneau redimensionnable `role="separator"`. CI : `npm run build && git diff --exit-code --stat index.html` + tests Puppeteer offline 390 px / 0 erreur. Limites : 16,8 Mo en un bloc (parse/mémoire), tuiles Esri et MP3 déportés (faux « offline »), README muet sur l'audio. → **Réponse directe au gap 920 requêtes**, avec attribution MIT + Leaflet à conserver.

### 4.9 GeoTime — 3,2/5 · 🟢 code MIT / ⚪ données
73 commits concentrés sur 5 jours (août 2025), 0★. 1 120 événements / 551 Ko, slider 1000 BCE→2025, API `/api/events?year=` et plage `startYear`/`endYear` validée, 10 catégories annoncées (11 présentes dans les données), clustering Supercluster, résumé LLM multi-fournisseur. Limites : Mapbox GL + clé saisie à l'exécution + géocodage + LLM ⇒ dépendance réseau structurelle, `attributionControl: false` (anti-pattern), 1 120/1 120 `images: []` malgré la doc, démo en 429. → Idées de roadmap non livrées : comparaison de deux dates, géosearch local, filtres.

### 4.10 GeoViz — 2,9/5 · ⚪ Apache-2.0 prouvé mais code absent
13★, 27 commits, dernier le 13/05/2024 (~30 mois d'inactivité). Article arXiv 4 pages. Triple vue **Tree-Net-Map** (arbre de connaissances, réseau sémantique, carte + axe temps), normalisation temps (monde→décennie→année) et espace (monde→continent→pays), sous-graphe au double-clic, liens inférés en pointillés, filtres spatio-temporels. **Fait majeur** : le dépôt ne contient que `demo_data/`, `LICENSE`, `README.md`, `workflow.jpg` — aucun code plateforme à réutiliser ; démo injoignable le 20/11. → Le concept de coordination de vues reste la référence la plus proche des 6 vues de Vectemporel, mais aucune copie n'est possible.

### 4.11 Timeline Generator — 2,9/5 · 🟢 MIT (ajouté le 09/11) / ⚪ données
6★, 21 commits, 204 tests déclarés sans CI. Graphe D3 de biographies (20 personnes, 42 arêtes), **26 types de relations / 10 catégories** (README dit 24 : divergence), **5 paliers de confiance** (0,9–1,0 Attested … 0,3–0,5 « LLM inference »), `datePrecision` séparé (`day/month/year/approximate`), `strength` distinct de `confidence`, `provenance: Source[]` et `evidence: Source[]`, `d3-brush` sur frise, 8 schémas Zod. Limites : Neo4j + Docker, Perplexity Sonar en ligne, confiance « Low = inférence LLM » (reproduirait le gap des 44 « certains » sans source), phase 2 « citation chain verification » non implémentée. → Barème de confiance et datation qualifiée directement transposables.

---

## 5. Matrice des gaps

| Gap Vectemporel | Chez eux (candidat source) | Chez nous | Manquant ? |
|---|---|---|---|
| Deep links partageables | `?v=&y=&sel=&q=` (Pastlas), `#y1453-c-istanbul-l-en` (Chronica), URL miroir complet (Jiangshan), `?y=` (Erask), `/timewalk?lat…` (ChronoAtlas.nl) | `#v=&c=&e=&r=` via `replaceState`, format POC `#/france/…` incompatible | **Oui — P0** |
| Recherche inter-pays | index 3 027 polities + alias (ChronoAtlas), `/town` 7 342 villes (Chronica), `/api/search` (OpenHistory), `/`+Ctrl+K (Jiangshan) | `String.includes` limité au pays courant | **Oui — P0** |
| Fiche image + crédit + licence | fiche complète avec 4 cartes SVG locales et « How this page is made » (Pastlas), crédits par image (Chronica), portrait + crédit (ChronoAtlas.nl) | dialogue texte seul (`shell.js:484-512`) | **Oui — P1** |
| Comparaison de deux entités | 12 cas côte à côte (Pastlas), deux camps (Jiangshan), deux années (Chronica, ChronoAtlas.nl), roadmap (GeoTime) | absente | **Oui — P1** |
| Incertitude visible | hachures « unmeasured » (Pastlas), lignes vides et points empruntés marqués (Erask), pointillés « inféré » (GeoViz), « c. » et « no data » (Chronica) | 399 cellules ouvertes mais « 784/784 = 100 % » | **Oui — P0** |
| Vocabulaire de certitude / date | 5 paliers nommés + score 0–1, `datePrecision` séparé (Timeline Generator) | `certain/probable/disputé/disputed`, 135 points sans source, 18 valeurs de `datePrecision` | **Oui — P0** |
| Budget réseau / reproductibilité | 1 fichier + CI `git diff --exit-code` (HistoryFrames), boot 72 Ko (Jiangshan), lazy-load + préfetch (ChronoAtlas) | 920 requêtes / 6,1 Mo, `merge-points` non idempotent | **Oui — P0** |
| Hiérarchie visuelle | métro 19 lignes (HistoryFrames), frise à poignées (Jiangshan), palette validée 4 critères (ChronoAtlas) | pas de hero, corps 7–9 px, Georgia/system-ui | **Oui — P1** |
| Correction ouverte + journal | formulaire pré-rempli + changelog (Pastlas, Chronica), édition amont Wikidata/OHM (OpenHistory) | audits non signés, 42 sources non concluantes non signalées | **Oui — P1** |
| Navigation clavier / cibles | `←→`/`↑↓` + focus visible (HistoryFrames), `/`+Ctrl+K+flèches (Jiangshan) | 3 vues sans `<h1>`, cibles 14 px, routeur contourné | **Partiel** |
| Drapeaux vectoriels locaux | emblèmes SVG + repli monogramme (ChronoAtlas) | déjà livré dans le shader du globe | **Non — avantage Vectemporel** |

---

## 6. Idées priorisées

`Priorité = impact × (6 − effort)` (max 25). **QW** = quick win (impact ≥ 4, effort ≤ 2) · **Pari** = impact ≥ 4, effort ≥ 4. Verdict = licence de la source ; toutes les idées doivent être **réimplémentées originalement**, aucune n'autorise une copie de code fermé.

| # | Idée (candidat source) | I | E | Prio | Type | Verdict | URL source |
|---|---|---:|---:|---:|---|---|---|
| 1 | Deep links d'état complets `?pays&ère&repère&point` (Pastlas, Chronica, Jiangshan, ChronoAtlas.nl) | 5 | 2 | **25** | QW | 🔴 | pastlas.com/llms.txt ; chronicamaps.com/guide |
| 2 | Barème de confiance 5 paliers + `datePrecision` séparé (Timeline Generator) | 5 | 2 | **25** | QW | 🟢 MIT | github.com/docxology/timeline_generator/docs/data-model.md |
| 3 | Hachures « non mesuré » + raison sur les 399 cellules (Pastlas) | 5 | 2 | **25** | QW | 🔴 | pastlas.com/ |
| 4 | Assemblage build-time déterministe + CI `git diff --exit-code` (HistoryFrames) | 5 | 2 | **25** | QW | 🟢 MIT | github.com/stabruriss/history-of-europe-in-frames/src/assemble.py |
| 5 | Page de droits séparant code / données / sources (Pastlas, Jiangshan) | 4 | 1 | **20** | QW | 🔴 | app.pastlas.com/terms/ ; github.com/DeanChensj/jiangshan-map |
| 6 | Saisie directe de l'année + réglage fin clavier (ChronoAtlas.nl) | 4 | 1 | **20** | QW | 🔴 | chronoatlas.nl/ |
| 7 | Palette validée par 4 contrôles, jamais la couleur seule (ChronoAtlas) | 4 | 2 | 16 | QW | 🔴 | github.com/FayezBast/chronoatlas |
| 8 | Fiche image + crédit + licence (Pastlas, Chronica) | 4 | 2 | 16 | QW | 🔴 | app.pastlas.com/state/roman-republic/ |
| 9 | Navigation scènes `←→` / `↑↓` + zoom auto (HistoryFrames) | 4 | 2 | 16 | QW | 🟢 MIT | github.com/stabruriss/history-of-europe-in-frames |
| 10 | Curseur de seuil de confiance masquant « non documenté » (Timeline Generator) | 4 | 2 | 16 | QW | 🟢 MIT | docs/frontend-guide.md |
| 11 | Frise à poignées de bornes, double-clic reset (Jiangshan) | 4 | 2 | 16 | QW | 🟡 GPL | github.com/DeanChensj/jiangshan-map/releases/tag/v1.3.0 |
| 12 | Date de rebuild par page + correction à la source (Chronica, Pastlas) | 4 | 2 | 16 | QW | 🔴 | chronicamaps.com/about |
| 13 | Index de recherche inter-entités avec alias (ChronoAtlas, OpenHistory) | 5 | 3 | 15 | — | 🔴 / ⚪ | github.com/FayezBast/chronoatlas ; github.com/kdhillon/openhistory |
| 14 | Typage des preuves + « deux sources, deux dates » sans moyenne (Pastlas) | 5 | 3 | 15 | — | 🔴 | pastlas.com/ |
| 15 | Règle à arrêts + événements-intervalles atténués (Erask) | 5 | 3 | 15 | — | 🔴 | erask.org/timed-sync.html |
| 16 | Sous-graphe au double-clic pour la constellation (GeoViz) | 5 | 3 | 15 | — | ⚪ code absent | arxiv.org/html/2405.03697v2 |
| 17 | Repli explicite `role="status"` si ressource absente (HistoryFrames) | 3 | 1 | 15 | — | 🟢 MIT | src/template.html |
| 18 | Cascade de couleurs parent→enfant + repli capitale (OpenHistory) | 5 | 3 | 15 | — | ⚪ MIT non prouvé | docs/polity-parent-coloring.md |
| 19 | Lazy-load des 1 632 lentilles + préfetch voisin (ChronoAtlas) | 5 | 4 | 10 | Pari | 🔴 | github.com/FayezBast/chronoatlas |
| 20 | Comparaison de deux pays sur une même frise (Pastlas, Jiangshan) | 5 | 4 | 10 | Pari | 🔴 / 🟡 | pastlas.com/changelog/2026-10-30-twelve-cases-side-by-side/ |
| 21 | Dessin de zone filtrant les points en local (Erask) | 5 | 4 | 10 | Pari | 🔴 | erask.org/explore.html |
| 22 | Généalogie multi-ères dans la fiche (Jiangshan) | 5 | 4 | 10 | Pari | 🟡 GPL | github.com/DeanChensj/jiangshan-map |
| 23 | Correctif ouvert + journal public des corrections (Pastlas, Chronica) | 4 | 4 | 8 | Pari | 🔴 | app.pastlas.com/changelog/ |
| 24 | Boot seed + encodage delta des géométries (Jiangshan) | 5 | 5 | 5 | Pari | 🟡 GPL | billet tiers 2026-11-07 |

---

## 7. Directions et anti-patterns

**UX** — restaurer une hiérarchie visuelle (métro 19 lignes, frise à poignées) ; rendre l'incertitude visible au lieu de la masquer ; fiche détail créditée ; deep links comme contrat de partage.

**Performance** — assemblage build-time déterministe avec artefact vérifié en CI (idéal : 1–3 fichiers au lieu de 1 001 modules) ; lazy-load des lentilles ; clustering / index local ; budget `< 50` requêtes et `< 1 Mo` mesurable.

**Architecture** — contrats typés sur YAML/CSV (schémas Zod ou équivalent local) ; une seule source de vérité pour taxonomie et compteurs ; CI qui échoue sur régression **et** sur documentation obsolète (ratchet).

**Accessibilité** — palette validée par bande de luminosité, plancher de chroma, séparation CVD et contraste ; navigation par scènes ; focus visible, cibles 44 px, replis textuels annoncés.

**Distribution** — page de droits séparant code / données / sources / images ; crédits désagrégés ; données sous licence claire ; zéro dépendance réseau à l'exécution.

**Anti-patterns observés, à ne pas reproduire** :
1. « Gratuit » sans licence publiée (Chronica Maps, ChronoAtlas.nl) — l'usage libre n'est pas un droit de réutilisation.
2. « Open source » sans code (GeoViz) ou sans fichier LICENSE (OpenHistory, ChronoAtlas GitHub) — ne pas bâtir une roadmap là-dessus.
3. CDN, polices, analytics ou IA distants dans un outil annoncé hors ligne (Erask, Pastlas, Chronica, GeoTime, OpenHistory, ChronoAtlas.nl).
4. Proclamer 100 % de couverture quand des cellules restent ouvertes ; moyennner deux dates contradictoires (Pastlas fait l'inverse).
5. Marquer 100 % des faits `verified: true` sans preuve distincte (GeoTime) ou confondre inférence LLM et certitude documentaire (Timeline Generator).
6. Laisser diverger catégories API et données (GeoTime : 10 vs 11), README et code (OpenHistory React 18 vs 19.2 ; ChronoAtlas 44 guerres absentes du tableau).
7. Désactiver le contrôle d'attribution (GeoTime, OpenHistory) ou retirer un réglage « pour simplifier ».
8. Inliner 16,8 Mo d'un coup sans découpage ni lazy-load (HistoryFrames) — une requête ne signifie pas un petit parse.
9. Importer une couche de données non redistribuable sous prétexte que le `LICENSE` du dépôt est permissif (CHGIS dans Jiangshan Map).
10. Générer 1 165 rapports d'audit dont la preuve n'est pas exécutable — le défaut de Vectemporel lui-même, documenté dans `AUDIT_COMPLET.md`.

---

## 8. Verdicts de licence et attributions

| Candidat | Code | Données | Verdict global |
|---|---|---|---|
| History of Europe in Frames | 🟢 MIT prouvé | 🟢 BSD-2 (Leaflet), domaine public (Natural Earth) | 🟢 réutilisable **avec attribution** ; tuiles Esri et MP3 exclus |
| Timeline Generator | 🟢 MIT prouvé (09/11/2026) | ⚪ licence du jeu Fuller non déclarée | 🟢 pour les concepts ; ne pas copier les données |
| GeoTime | 🟢 MIT prouvé | ⚪ non déclarée (Wikidata en provenance) | 🟢 code, ⚪ données ; stack incompatible en l'état |
| GeoViz | 🟢 Apache-2.0 prouvé mais **aucun code publié** | ⚪ inconnue | ⚪ bloqué : rien à réutiliser matériellement |
| OpenHistory | ⚪ MIT annoncé, aucun `LICENSE`, API `license: null` | 🟢 CC BY-SA déclaré / 🟢 CC0 frontières / tuiles © | ⚪ bloqué pour le code ; 🟢 principes de données |
| Pastlas | 🟡 GPL-3.0 déclaré, dépôt introuvable | 🔴 copyright + database right | 🟡/🔴 : validation humaine obligatoire, aucune copie de données |
| Jiangshan Map | 🟡 GPL-3.0 prouvé | 🟡 GPL-3.0 ; 🔴 CHGIS non redistribuable ; ⚪ DataV | 🟡 : arrêt humain avant tout emprunt ; couche CHGIS proscrite |
| FayezBast/chronoatlas | 🔴 aucune licence | 🟡 GPL-3.0 amont | 🔴 : inspiration seule |
| Erask | 🔴 inconnue (fermé) | 🟢 CC0 / 🟡 CC BY-SA / ⚪ Commons | 🔴 code ; données selon jeu |
| Chronica Maps | ⚪ inconnue (`/license` 404) | 🟡 GPL-3.0 ; 🟡/🟢 Commons | 🔴 inspiration seule |
| ChronoAtlas.nl | ⚪ inconnue (TOS restrictif) | 🟡 GPL-3.0 / 🟢 CC0 / 🟡 CC BY-SA | 🔴 inspiration seule ; le MIT du TOS = composant tiers Tidewater |
| TimelineJS / StoryMapJS | 🟡 MPL 2.0 / 🟢 MIT (déclaré, non revérifié en source) | — | 🟡/🟢 selon outil |
| Semantica, Astrapai, InferaGraph, timeline-atlas | 🟢 MIT déclaré (non revérifié en source) | — | ⚪ prudent : preuve à rapporter avant réutilisation |

**Aucun code n'a été copié pendant cet audit.** Bloc d'attribution à insérer **uniquement si** du code d'un candidat 🟢 est effectivement réutilisé lors d'une session ultérieure :

```html
<!-- Code adapté de <nom> (<URL exacte>), licence <LICENCE>, © <auteurs>.
     Voir LICENSES.md à la racine du projet. -->
```

Entrées `LICENSES.md` à créer le cas échéant (composant · URL exacte · licence · auteurs · date de consultation · fichiers concernés · nature de l'adaptation) :
- History of Europe in Frames · `https://github.com/stabruriss/history-of-europe-in-frames` · MIT + Leaflet BSD-2-Clause + Natural Earth domaine public · Chris Wu · 2026-11-20 · *à renseigner* · *pattern d'assemblage / CI déterministe*.
- Timeline Generator · `https://github.com/docxology/timeline_generator` · MIT · Daniel Ari Friedman · 2026-11-20 · *à renseigner* · *barème de confiance et datation qualifiée*.
- GeoTime · `https://github.com/karangupta8/GeoTime` · MIT · Karan Gupta · 2026-11-20 · *à renseigner* · *idée de slider synchronisé (réimplémentation vanilla)*.

**Règle d'or** : 🔴 = aucune copie, réimplémentation originale à partir du principe observé ; 🟡 = arrêt et validation humaine avant tout commit ; ⚪ = verdict bloqué tant que la preuve de licence n'est pas rapportée.

---

## 9. Sources datées et limites du scan

**Sources primaires consultées le 2026-11-20** (hors fiches détaillées ci-dessus) : `https://api.github.com/repos/FayezBast/chronoatlas`, `.../docxology/timeline_generator`, `.../karangupta8/GeoTime`, `.../kdhillon/openhistory`, `.../JeremyChou28/GeoViz`, `.../DeanChensj/jiangshan-map` ; `https://arxiv.org/html/2405.03697v2` ; `https://erask.org/{about,credits,timed-sync,explore,privacy}.html` ; `https://pastlas.com/` et `https://app.pastlas.com/{terms,llms.txt,changelog/}` ; `https://chronicamaps.com/{about,guide,tools}` ; `https://chronoatlas.nl/{tos,pricing,timewalk,classroom}` ; `https://openhistory.app` ; `https://timemapper.okfnlabs.org/` ; `https://timeline.knightlab.com/`.

**Limites** : 4 requêtes seulement, donc découverte non exhaustive (~25 vus, 20 scorés, 11 analysés) ; surface publique des produits fermés (docs, sites, changelogs, TOS) sans accès au code interne ; aucune application tierce exécutée ni mesurée ; chiffres d'audience et de performance le plus souvent auto-déclarés et non recalculés ; accessibilité et rendu réel non vérifiés chez les concurrents ; trois homonymes « ChronoAtlas » identifiés, deux analysés (`FayezBast/chronoatlas` et `.nl`), le troisième (`.org`) non audité ; licences des candidats non analysés en fiche marquées « déclaré, non revérifié ». Aucune affirmation chiffrée n'est présentée comme une mesure indépendante.

**Décision produite** : ne pas réutiliser de code tiers dans l'immédiat ; retenir 12 idées *quick win* (rang 1–12 du tableau) comme première vague d'amélioration de Vectemporel, sous réserve du feu vert séparé requis par le skill avant toute écriture dans l'application.
