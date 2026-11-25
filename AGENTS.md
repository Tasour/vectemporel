# vectemporel-atlas — règles locales

> Ces règles complètent `~/.config/opencode/AGENTS.md` et le `CLAUDE.md` du dépôt.
> En cas de conflit avec la règle globale, ce fichier gagne pour ce projet.

## Cycle de vie des workspaces de test (obligatoire)

Règle non négociable dès qu'un test ouvre une fenêtre (navigateur, Playwright/MCP, Blender, serveur avec interface).

1. **Un workspace dédié par projet.** Avant le premier test, exécuter `~/.config/opencode/scripts/agent-workspace.sh enter "Vectemporel"`. Toutes les fenêtres et tous les process de test du prompt vont exclusivement dans le workspace nommé `Vectemporel` (`name:Vectemporel` sous Hyprland) : aucune fenêtre de test dans le workspace de l'utilisateur ni dans `special:opencode`.
2. **Une session, un workspace.** Une session concurrente sur un autre projet crée son propre workspace nommé et n'utilise jamais celui-ci. Deux projets = deux workspaces distincts.
3. **Clôture à 100 % d'un prompt.** Exécuter `~/.config/opencode/scripts/agent-workspace.sh leave "Vectemporel"`, puis `~/.config/opencode/scripts/agent-workspace.sh status "Vectemporel"`. Résultat attendu : zéro fenêtre tracée, zéro process suivi, zéro port de test ouvert, workspace vide. Le helper ne ferme que ce que la session a ouvert ; toute fenêtre ou tout PID présent avant `enter` reste intouchable. Tout process ou MCP sans fenêtre lancé par la session est déclaré par `agent-workspace.sh track <pid>` dès son démarrage ; sans déclaration, il ne peut pas être arrêté automatiquement.
4. **Preuve ou échec.** Si `status` signale un résidu, créer une ligne `FIX-nn` avec l'adresse de fenêtre, le PID ou le port, et ne pas déclarer le prompt terminé. Si Hyprland est injoignable (`HYPRLAND_INSTANCE_SIGNATURE` absent), écrire `notMeasured` : ce n'est pas une réussite. Hyprland ne supprimant pas un workspace nommé sur commande, on vérifie qu'il est vide ; un workspace nommé encore listé est signalé, sans modifier la configuration.
5. **Dernière ligne du todo.** Ajouter `Clôture workspace Vectemporel — zéro résidu vérifié` et ne la passer `completed` qu'après un `status` vide.
6. **En début de session**, exécuter `~/.config/opencode/scripts/agent-workspace.sh status` et fermer les résidus d'une session précédente avant toute autre action.

Texte identique dans tous les projets ; toute modification se fait d'abord dans la référence canonique `~/.config/opencode/AGENTS.md`, puis est répercutée dans les 17 fichiers.
