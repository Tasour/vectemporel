# Vectemporel — plan directeur de l’application

> **Document de référence unique — v1.0, 17 novembre 2026.**
> Toute modification d’interface doit être conforme à ce plan. Si un écran
> n’y figure pas, il ne doit pas exister.

---

## 1. Les cinq règles du plan

1. **Un seul point d’entrée.** L’application s’ouvre sur le **Monde 3D**. Cliquer un pays mène au **Système solaire** de ce pays.
2. **Trois verbes.** Raconter (Récit) · Explorer (Système solaire) · Consulter (Frise). Le lecteur est une sortie.
3. **Un seul état partagé.** Le pays, l’ère, le repère et le lieu sont possédés par une seule couche et visibles partout.
4. **Densité progressive.** Un écran = une question. On ne montre jamais le récit, la carte et la frise en même temps.
5. **Rien n’est inventé.** Aucune date, citation, coordonnée ou anecdote hors des données vérifiées.

---

## 2. Plan du site (architecture de l’information)

```text
VECTEMPOREL
│
├── 00 · MONDE 3D ........................ menu principal, choix du pays
│   └── 01 · SYSTÈME SOLAIRE ............. vue centrale après le pays
│       ├── soleil ....................... période / ère
│       ├── planète ...................... événement (image vérifiée)
│       ├── lune ......................... personnage, lieu, repère-clé
│       ├── fiche détaillée .............. récit + figures + lieux
│       └── Récit ......................... période → panorama → lieux satellite
│
├── 02 · FRISE ........................... consultation (`?classic=1`)
└── 03 · LECTEUR ......................... sortie commune (Grokipedia traduit)
```

Le globe est le menu : un clic sur un pays ouvre son système. Le système
solaire remplace l'ancienne queue en tourbillon : ère → événement → détails.
Le lecteur reste une sortie, jamais une destination.

---

## 3. Inventaire des écrans

| ID | Écran | Question servie | Entrée | Sortie | Route clavier |
| --- | --- | --- | --- | --- | --- |
| 00 | Plan | Où vais-je ? | Chargement, `Échap`, onglet Plan | 01/02/03/04 | `1`–`4`, flèches + `Entrée` |
| 01a | Périodes | Quelle époque ? | Plan, `R` | 01b | flèches, `Entrée`, `1`–`9` |
| 01b | Panorama | Que s’est-il passé ? | 01a | 01c, 04 | `←/→`, `Espace`, `Entrée` |
| 01c | Lieux | Où ça s’est passé ? | 01b | 01b | `←/→`, `+/-`, `0` |
| 02 | Dragon | Comment ça se relie ? | Plan, `D` | 02a, 04, 00 | flèches, `+/-`, `R` |
| 02a | Fiche détaillée | Quels détails ? | 02 | 02, 04 | `Entrée`, `Échap` |
| 03 | Frise | Quand exactement ? | Plan, `F` | 04, 00 | `/`, `+/-`, flèches |
| 04 | Lecteur | Que dit la source ? | 01b, 02a, 03 | retour à l’écran d’origine | `Échap` |

---

## 4. Parcours nominal

```text
Démarrage
  → 00 Plan
  → 01a Périodes (choix)
  → 01b Panorama (récit animé, lecture auto possible)
  → 01c Lieux (carte satellite, navigation lieu par lieu)
  → Entrée : retour au repère
  → Échap ×2 : Dragon (exploration libre)
  → clic sur une écaille : 02a Fiche détaillée
  → « Lire la fiche » : 04 Lecteur
  → Échap : retour au Dragon
  → Échap : 00 Plan
```

Parcours alternatif : `Plan → 02 Dragon` si l’utilisateur veut explorer sans récit.
Parcours experte : `Plan → 03 Frise` pour chercher une date précise.

---

## 5. Modèle d’état unique

```js
AppState = {
  countryId: 'france',     // possédé par la coque, partagé partout
  view: 'plan',            // plan | recit | dragon | frise | lecteur
  step: 'eras',            // eras | panorama | places (dans recit)
  eraIndex: 0,             // 0..n-1
  eventIndex: 0,           // dans l'ère courante
  placeIndex: 0,           // dans le périmètre courant
  placeScope: 'era',       // era | country | excluded
  zoom: 1,                 // dragon / satellite
  playing: false,          // lecture automatique du panorama
  selectedEventId: null,   // dernière fiche ouverte
}
```

Règles de possession :
- la **coque** possède `countryId` et `view` ;
- le **Récit** possède `step`, `eraIndex`, `eventIndex`, `placeIndex`, `placeScope`, `playing` ;
- le **Dragon** possède sa propre progression `p` mais la synchronise avec `AppState.selectedEventId` ;
- le **Lecteur** ne possède rien : il reçoit un `eventId` et rend la main à `view` précédente.

---

## 6. Grammaire d’interface

Une seule coque, trois zones, toujours au même endroit :

```text
┌──────────────────────────────────────────────────────────────┐
│ [Plan] [Récit] [Dragon]   [ France ▾ ]        [ ? ] [ × ]    │  barre 54px
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                          SCÈNE                               │  flexible
│              (une seule question à la fois)                  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ ← → nav   ↵ ouvrir   ? aide              ● ● ● ● ● progress │  pied 52px
└──────────────────────────────────────────────────────────────┘
```

- **Barre** : onglets, pays, aide, fermeture. Identique dans Plan, Récit et Dragon.
- **Scène** : un seul composant principal, jamais deux.
- **Pied** : raccourcis contextuels + progression.

Grille du Plan :

```text
┌─────────────┬─────────────┐
│ 01 · RÉCIT  │ 02 · DRAGON │
│ Période →   │ Queue libre │
│ panorama →  │ à explorer  │
│ lieux       │             │
├─────────────┼─────────────┤
│ 03 · FRISE  │ 04 · LECTEUR│
│ Chercher    │ Lire la     │
│ une date    │ source      │
└─────────────┴─────────────┘
```

---

## 7. Contrat clavier

| Touche | Plan | Récit | Dragon | Frise | Lecteur |
| --- | --- | --- | --- | --- | --- |
| `1`–`4` | destination | — | — | — | — |
| `1`–`9` | — | période directe | — | — | — |
| `Maj+1/2/3` | — | étape directe | — | — | — |
| `← →` | choisir une carte | ère/repère/lieu | écaille | date | — |
| `↑ ↓` | choisir une carte | changer d’ère | — | — | — |
| `Entrée` | ouvrir | entrer/ouvrir | fiche détaillée | ouvrir | — |
| `Espace` | — | lecture auto | — | — | défilement |
| `R` / `D` / `F` | ouvrir la vue | — | — | — | — |
| `+ - 0` | — | zoom carte | zoom | zoom | — |
| `Échap` | quitter | reculer d’une étape | retour Plan | retour Plan | fermer |
| `?` | aide | aide | aide | aide | aide |

---

## 8. Contrat de données

| Fichier | Rôle | Généré par |
| --- | --- | --- |
| `data.js` | 10 pays, 229 repères, ères, tags | `apply-country-fixes.mjs` |
| `spiral-meta.js` | acteurs et lieux par ère | `build-spiral-meta.mjs` |
| `event-images.js` | 229 images vérifiées + crédits | `build:images:all` |
| `place-atlas.js` | coordonnées et contours | `build-place-atlas.mjs` |
| `audits/<pays>/*.yaml` | sources, omissions, couverture | revue éditoriale |

Aucune vue ne lit un fichier autre que ceux-ci. Aucune vue n’écrit dans `data.js`.

---

## 9. Règles de contenu

- Le récit est **exactement** le résumé vérifié, découpé en phrases.
- Les images sont légendées par ce qu’elles montrent, pas par l’événement supposé.
- Les motifs génératifs sont signalés « non documentaire ».
- Les lieux sans coordonnée ne sont pas placés sur la carte.
- Les états vides sont explicites : « aucun lieu lié à cette ère », pas un repli silencieux.

---

## 10. Accessibilité et performance

- Focus visible et déplacé à chaque changement de scène.
- Focus piégé dans la modale active.
- Contrastes du design system sombre conservés.
- `prefers-reduced-motion` désactive les animations.
- WebGL rendu à la demande, une image satellite par vue,pas de tuiles.
- 60 fps au repos, 55+ fps en transition (mesuré en rendu logiciel).

---

## 11. Déploiement par phases

| Phase | Contenu | Critère d’acceptation |
| --- | --- | --- |
| **P0 — Plan** | Grille 2 × 2, coque, raccourcis, retour Plan depuis partout | On peut atteindre les 4 vues au clavier depuis le chargement et revenir au Plan. |
| **P1 — Coque unique** | Barre et pied identiques dans Récit/Dragon, pays partagé | Changer de pays dans une vue le change dans l’autre. |
| **P2 — Scènes** | Système solaire + Récit conformes à la grammaire | Une seule question par scène, jamais deux panneaux concurrents. |
| **P3 — Frise & globe** | Sélecteur de pays intégré, recherche, retour Plan | La frise n’est plus qu’un outil de consultation, pas un labyrinthe. |
| **P4 — Évaluation** | Test utilisateur, kappa, sign-off | 20 participants, tâches « trouver / raconter / situer ». |

**État actuel : nouvelle structure livrée + chantiers 1, 2 et 3 de l'audit externe (`UX_EXPERT_AUDIT.md`) ; chantiers 4 et 5 livrés.** Le Monde 3D est le menu principal ; un pays ouvre le Système solaire (soleils, planètes, lunes). Le Récit et sa carte satellite restent accessibles depuis le Système. L'ancien tourbillon est conservé dans le code mais retiré du parcours principal.

---

## 12. Ce qui disparaît

- L’ouverture automatique du Récit au chargement.
- Les barres dupliquées avec des boutons « fermer » au sens changeant.
- Le retour silencieux « tous les lieux du pays » quand une ère n’a pas de lieu.
- Les territoires d’outre-mer dans l’emprise de la carte France.
- Les modes orphelins (spirale narrative historique) dans le parcours par défaut.
