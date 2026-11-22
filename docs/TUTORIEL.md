# Tutoriel guidé — cinq écrans

1. **La sphère** — Glissez pour tourner, molette ou `+`/`−` pour zoomer. Cliquez une région : sa fiche s'ouvre avec les faits Chronas de l'année affichée.
2. **La frise** — Le curseur parcourt 4 001 ans. Le bouton `Siècle` passe à 101 crans, un par an. La minimap garde la vue d'ensemble.
3. **Les récits** — Ouvrez `❖`, choisissez un parcours puis avancez étape par étape. Chaque jalon prouve son affirmation par un champ Chronas.
4. **Les détections** — Les badges numérotés dans la frise sont des ruptures calculées ; `⚑` montre les anomalies de capitales. Ce sont des extraits, pas des validations historiques.
5. **Apprendre** — `✧` propose cinq défis locaux. Les réponses alimentent un SRS Leitner stocké uniquement sur cet appareil.

## Didacticiel contextuel des ruptures

Un badge de rupture porte son année et son nombre de régions dans son `aria-label`. Au clic, le readout affiche `Bascule des souverains : N régions · extrait Chronas CC BY-SA 4.0` et les provinces concernées deviennent des raccourcis. La règle de détection est documentée dans `docs/architecture/DECISIONS/ADR-0012-points-de-rupture.md`.
