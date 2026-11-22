#À propos

Cet atlas est une réimplémentation originale, locale et hors ligne d'une encyclopédie historique interactive. Il ne contient aucun code de Histography ou de Chronas : seules les **données** publiques de Chronas sont importées au build, sous licence **CC BY-SA 4.0**.

- Application : MIT — © Vincent Tassier.
- Three.js r180 : MIT — voir `vendor/` et `public/three-bundle.js`.
- D3 v7.9.2 : ISC — © Mike Bostock, voir `vendor/D3-LICENSES.md`.
- Données : © Chronas, CC BY-SA 4.0 — `ATTRIBUTION.md`, `DATA-LICENSE.md`.
- Natural Earth (noms modernes) : domaine public.

## Périmètre

- 4 001 ans (-2000 → 2000), 41 chunks annuels locaux.
- 2 429 régions, 2 492 géométries vectorielles.
- 560 épiques, 35 jalons de récits, 49 ruptures détectées, 1 372 anomalies de capitales.
- Aucun appel réseau à l'exécution ; PWA hors ligne.

## Choix de conception

- Une seule vue (globe plein écran) avec des modes secondaires, pas de navigation multi-pages.
- Le JS est un laboratoire : le contenu et les faits restent dans le DOM et les données générées.
- Aucune rotation automatique : la lecture est toujours déclenchée par l'utilisateur.
- Tous les chiffres sont recalculés depuis les données locales et étiquetés « extrait Chronas » lorsqu'ils ne sont pas validés.

## Limites

Voir `docs/LIMITES.md`.
