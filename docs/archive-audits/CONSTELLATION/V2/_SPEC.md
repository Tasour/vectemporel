# Spécification partagée — CONSTELLATION V2 (lentilles E001…E100)

Tu implémentes **UNE seule** lentille `ENNN` (remplace `NNN` par ton numéro à
trois chiffres, ex. `E001`, `E042`, `E100`). Travaille dans le dépôt :

```
/home/tasour/Projects/vectemporel-atlas
```

## 1. Deux fichiers — et seulement ceux-ci

1. `src/views/constellation/v2/ENNN.js` — remplace le stub de 95 octets.
2. `UNIFIED_AUDIT/CONSTELLATION/V2/views/ENNN.md` — crée le rapport.

**Ne touche à rien d'autre.** En particulier :
- `src/views/constellation/*.js` et `UNIFIED_AUDIT/CONSTELLATION/views/*.md` = **passe 1**, INTACTES.
- `src/views/constellation/v2/index.js`, `registry.js`, `README.md` = intacts.
- Aucun autre module `E***.js` d'aucune passe.

## 2. Contexte et API (lis d'abord ces fichiers)

- `src/views/constellation/v2/registry.js` — Fournit `register`, `cssOnce`, `el`,
  `runEnhancements`, `viewDiagnostics`.
- `src/views/constellation.js` ligne 368 : `runEnhancementsV2({ viewId: 'constellationv2', stage, layout })`.
  Donc `ctx` contient au minimum `{ viewId, stage, layout, css, el, reducedMotion }` :
  - `ctx.layout` : élément DOM de la vue (garde d'entrée OBLIGATOIRE) ;
  - `ctx.stage` : scène ;
  - `ctx.css(id, rules)` : installe une feuille de style une seule fois (idempotent) ;
  - `ctx.el(tag, className, text)` : crée un élément ;
  - `ctx.reducedMotion()` : booléen (mouvement réduit).
- **Référence de qualité** : lis `src/views/constellation/E001.js` et
  `UNIFIED_AUDIT/CONSTELLATION/views/E001.md` (passe 1) pour le style, la
  rigueur et le format. Ta lentille V2 est une **seconde passe** : lis aussi
  `src/views/constellation/ENNN.js` et `UNIFIED_AUDIT/CONSTELLATION/views/ENNN.md`
  pour connaître le domaine de ta lentille, puis propose **10 NOUVEAUX chantiers
  différents** de ceux de la passe 1, sur le même domaine.

## 3. Contrat du module

Un seul import, un seul `register` :

```js
import { register } from './registry.js';

/* Lentille V2 ENNN — <thème en français>. Seconde passe : dix chantiers
   inédits, tous implémentés, sans réseau ni source aléatoire. */
register('ENNN', ctx => {
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  css('constellation-v2-ennn', `/* règles */`);

  /* ENNN-01 — … */  // code réel
  /* … */
  /* ENNN-10 — … */  // code réel
});
```

`ennn` = ton identifiant en minuscules, zéro-padded (ex. `e001`, `e042`, `e100`).

## 4. Unicité — INTERDICTION de collision avec la passe 1

La passe 1 utilise `e001-…`, `constellation-e001`, `__e001_…`, `data-e001-…`.
Toi, utilise **exclusivement** le préfixe `v2ennn` :

| Élément | Passe 1 (interdit) | Obligatoire en V2 |
| --- | --- | --- |
| Feuille CSS | `constellation-e001` | `constellation-v2-e001` |
| `id` DOM | `e001-live` | `v2e001-live` |
| Classes | `e001-sr` | `v2e001-sr` |
| `data-*` | `data-e001-rank` | `data-v2e001-rank` |
| Clé `window` | `__e001_nav` | `__v2e001_nav` |

## 5. Contraintes dures (vérifiables)

- **Zéro `console.*`** (log/warn/error/info/debug…).
- **Zéro réseau** : ni `fetch`, `XMLHttpRequest`, `WebSocket`, ni `src=`/`href=`
  distant, ni `@import`, ni `url(http…)`, ni `import()` dynamique distant.
- **Zéro `Math.random()`** : si du pseudo-aléatoire est nécessaire, écrire un
  `mulberry32` local avec graine affichée (deterministe).
- **Zéro minuteur / boucle d'animation propre** : pas de `setTimeout`,
  `setInterval`, `requestAnimationFrame` dans le module (le rapport peut les
  évoquer comme piste, le module reste passif).
- **10 chantiers réellement implémentés** dans le code (pas de simple
  commentaire). Chacun est local, dégradable, et tolère un DOM incomplet.
- **Français** pour tous les textes visibles, `aria-label`, et commentaires.
- Contrôles accessibles : boutons ≥ 36 px, focus visible, `aria-pressed`
  uniquement pour bascules indépendantes, `role="status" aria-live="polite"`
  pour les annonces, jamais d'information portée par la seule couleur.

## 6. Rapport `UNIFIED_AUDIT/CONSTELLATION/V2/views/ENNN.md`

Markdown français, même squelette que la passe 1 :

```md
# ENNN — <thème de la lentille>

Lentille V2 de la vue Constellation. <2–4 phrases : fichier, ligne du register,
garde ctx.layout, unique feuille constellation-v2-ennn, 10 chantiers inédits,
zéro dépendance externe.>

## ENNN-01 — <titre du chantier>

- **Preuve** — référence les lignes réelles de `ENNN.js` et le code exact.
- **Solution** — ce que fait le chantier et pourquoi.
- **Impact** — bénéfice concret (chiffres si pertinent).
- **Effort** — Faible / Moyen / Élevé + courte justification.
- **Vérification** — geste de test concret et observable.

## ENNN-02 — …
(… jusqu'à ENNN-10)
```

Citer des **numéros de ligne réels** du module que tu as écrit. Viser ~8–12 Ko.

## 7. Auto-validation avant de répondre

```bash
cd /home/tasour/Projects/vectemporel-atlas
node --check src/views/constellation/v2/ENNN.js
grep -nE 'console\.|fetch\(|XMLHttpRequest|Math\.random|setTimeout|setInterval|requestAnimationFrame' src/views/constellation/v2/ENNN.js   # doit être vide
grep -c '^  /\* ENNN-' src/views/constellation/v2/ENNN.js   # doit valoir 10
test -f UNIFIED_AUDIT/CONSTELLATION/V2/views/ENNN.md && echo OK
```

Réponds uniquement : `ENNN livré — module + rapport, 10 chantiers, node --check OK`.
Si quelque chose bloque, réponds `ENNN BLOQUÉ — <raison courte>`.
