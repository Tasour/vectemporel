# Contribuer

- Lire `README.md`, `docs/ARCHITECTURE.md` et `docs/LIMITES.md`.
- Aucune dépendance runtime : tout module doit être local, déterministe et hors ligne.
- Aucune donnée n'est ajoutée à la main au runtime : les données passent par un script `scripts/build-*.mjs` avec SHA-256.
- Toute nouvelle fonction pure reçoit un test unitaire ; tout nouveau panneau reçoit un test e2e et un test mobile.
- Les captures 1658×1150 et 390×844 sont archivées dans `docs/harness/`.
- Avant commit : `npm run check` vert, `git diff --check`, message conventionnel.
- Les données Chronas restent CC BY-SA 4.0 ; le code applicatif est MIT.
