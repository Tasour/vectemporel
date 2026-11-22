# Procédure de publication

1. Vérifier que la branche courante est `master` et qu'elle est alignée sur `origin/atlas`.
2. Lancer `npm run check` : tous les tests doivent passer, sans skip.
3. Capturer et relire 1658×1150 et 390×844 pour tout changement visuel.
4. Vérifier `git diff --check`.
5. Mettre à jour `README.md`, `CHANGELOG.md` et `docs/architecture/ROADMAP.md` avant le commit.
6. Commiter avec un message conventionnel (`feat:`, `fix:`, `docs:`, `chore:`), auteur `noreply` GitHub.
7. `git push origin master:atlas`.
8. `npm run build:pages` puis synchroniser `dist-pages/` vers le worktree `gh-pages`.
9. Commiter et pousser `gh-pages`.
10. Vérifier le code HTTP 200 du site, le numéro de version servi et les nouveaux fichiers.

## Rollback

Chaque phase du ROADMAP porte une section « Rollback ». En dernier recours, restaurer `archive/v2-globe-1year/` et republier le commit indiqué dans « Rollback global ».
