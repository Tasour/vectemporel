# vectemporel-atlas — règles locales

> En cas de conflit avec `~/.config/opencode/AGENTS.md`, ce fichier gagne.

## Service

- Lancement : `npm start` (= `node scripts/serve.mjs`).
- Port : **4181** (`PORT` en environnement), **loopback uniquement** — `listen(PORT, '127.0.0.1')`.
- ⚠️ L'unité `vectemporel-v2.service` est une **unité fantôme** (`not-found`, `start-limit-hit`
  depuis le 18/11). Elle doit être supprimée, pas réparée : il n'existe aucun fichier correspondant.

## Vérification avant de dire terminé

```bash
npm run check      # verify + years + vector + http-guards + e2e + perf + pwa
```

C'est le seul critère de sortie. Un `npm run check` non lancé n'est pas un `npm run check` vert.
Captures aux deux viewports (1658×1150 et 390×844) pour tout changement visuel.

## Invariants

1. **Zéro réseau au chargement** : aucun `<a href^="http">` visible, aucun `fetch` distant,
   CSP `connect-src 'self'`.
2. **Un seul `<h1>` par vue**, hiérarchie de titres croissante, focus visible, cibles ≥ 44 px.
3. **Chiffres traçables** : un point « validé » exige `verdict === 'accepted'`,
   `signoff.signed_by.length > 0` et `!blocked`. Sinon il s'appelle « extrait ».
4. **Déterminisme** : deux `build:points` produisent le même SHA-256. Aucune date figée en dur
   sans être déclarée.
5. **Une seule taxonomie** : README et coque dérivent de `VIEW_TAXONOMY`. `taxonomyAligned() === true`
   et `conflicts().length === 0` après tout ajout de vue.
6. **Nettoyage des vues** : `AbortController` / `ctx.onLeave()` — aucune rAF ni observer ne survit
   à un changement de vue.

## Skills à charger en premier

`ui-architecte` (agent) pour toute migration de vue ; `d3-graph-studio` pour un graphique ;
`threejs` (et les skills `threejs-*` locaux) pour la scène 3D, les shaders et le pipeline glTF ;
`quality-gates` avant livraison ; `visual-density-lab` pour une grille de tuiles.

Le serveur MCP `threejs-devtools-mcp` est configuré dans `~/.config/opencode/opencode.json` :
69 outils d'inspection de scène vivante. Son pont navigateur doit être ouvert avant usage
(`bridge_status` indique l'URL locale à visiter) ; il ne modifie jamais les sources sans édition
explicite.

`npm run test:devtools` (intégré à `npm run check`) injecte le même pont **avant chargement**
via `attachDevtools({ connect: false })`, sans assouplir la CSP `script-src 'self'` ni exposer
`window.THREE` dans l'application. C'est la voie de vérification retenue pour la scène ESM r180.

## Pièges connus

- 59 modules `E*.js` étaient orphelins avant `check-imports.mjs` : ne pas ajouter de module sans
  vérifier qu'il est atteignable.
- Les deep links historiques `#/pays/époque/événement` doivent rester hydratables (adaptateur V3-9).
- Le déploiement GitHub Pages part de `dist-pages` : vérifier que rien de non redistribuable
  (voir `~/.config/opencode/THIRD-PARTY.md`) n'y entre.
