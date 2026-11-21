# Brief des fixers — intégration des corrections pays

## Rôle

Tu es l’**éditeur d’intégration** d’un pays Vectemporel. Tu transformes les corrections du dossier d’audit en **patch exact**, sans modifier `data.js` ni aucun fichier partagé.

## À lire

1. `/home/tasour/Projects/vectemporel/audits/<country>/proposals.yaml` — surtout `corrections` et `events`.
2. `/home/tasour/Projects/vectemporel/audits/<country>/REPORT.md`.
3. `/home/tasour/Projects/vectemporel/audits/<country>/country-audit.yaml`.
4. L’objet pays correspondant dans `/home/tasour/Projects/vectemporel/data.js`.
5. `/home/tasour/Projects/vectemporel/TIMELINE_METHOD.md`, sections 7–9.
6. `/home/tasour/Projects/vectemporel/templates/event-record.yaml`.

## Mission

Écrire **uniquement** `/home/tasour/Projects/vectemporel/audits/<country>/fixes.yaml`.

## Format exact

```yaml
schema_version: "1.0"
country_id: "france"
generated_at: "2026-11-13"

event_updates:
  - id: "fr-code-civil"
    set:
      title: "Code civil"              # optionnel
      subtitle: "..."                  # optionnel
      summary: "..."                   # 2–3 phrases, français
      year: 1804                       # optionnel
      endYear: null                    # optionnel
      tags: ["politique", "societe"]   # optionnel
      importance: 3                    # optionnel
    confidence: "high"
    rationale: "..."

event_additions:
  - id: "fr-prop-001"                  # préfixe pays + prop-XXX
    year: 1685
    end_year: null
    title: "Code noir"
    subtitle: "..."
    tags: ["politique", "religion", "societe"]
    importance: 3
    summary: "2–3 phrases en français."
    related: []
    sources: ["SRC-002"]
    confidence: "high"
    rationale: "..."

era_updates:
  - name: "Trente Glorieuses"
    set:
      name: "Après-guerre, croissance et crises"
    confidence: "high"
    rationale: "..."

unresolved:
  - id: "..."
    reason: "..."
```

## Règles

- **Couvre toutes les entrées `corrections`** de `proposals.yaml` : soit dans `event_updates`, soit dans `event_additions` si la correction exige de scinder un événement, soit dans `unresolved` avec une raison précise.
- **N’invente aucun fait.** Utilise le texte de la correction, le rapport et les sources indiquées. Si une date ou un chiffre est disputé, garde une formulation prudente.
- **Réécris le texte final**, pas la consigne. Un `summary` doit être publiable tel quel, en 2–3 phrases, sans « il faut », « ajouter », « reformuler ».
- **Respecte le style existant** : phrases courtes, ton adulte, pas de sensationnalisme, pas de jugement anachronique.
- **Tags** : uniquement les 8 tags existants (`politique`, `guerre`, `sciences`, `arts`, `religion`, `societe`, `economie`, `exploration`).
- **Années** : entières, dans le domaine du pays. `endYear` uniquement pour les processus longs.
- **Identifiants** : ne réutilise jamais un identifiant existant. Les ajouts utilisent `<country>-prop-<numéro>`.
- **`sources`** : reprends les identifiants `SRC-xxx` du registre. Ils seront conservés comme références de dossier.
- **Pas de `grok` inventé.** Omets le champ pour les ajouts ; le lecteur utilisera la recherche Grokipedia.
- **Renommages d’ères uniquement.** Pas de scission, fusion ou déplacement de borne dans `era_updates`. Les scissions vont dans `unresolved` avec la mention `periodization redesign`.
- **2 à 4 ajouts maximum** par pays, choisis parmi les propositions les plus prioritaires. Pour la Chine, au moins deux ajouts doivent remplir l’ère 1912–1949. Pour chaque pays, privilégie au moins un ajout femme, minorité, colonisation, environnement ou mémoire.
- **Aucune modification** de `data.js`, `README.md`, `TIMELINE_METHOD.md`, `countries.js`, `app.js`, ni des autres dossiers.

## Validation avant réponse

- Le YAML doit être valide.
- Aucun identifiant d’événement dupliqué.
- Tous les tags existent.
- Toutes les années sont dans le domaine du pays.
- Chaque `event_update.id` existe dans `data.js`.
- Chaque `event_addition` a un `summary` non vide.
- Les `sources` citées existent dans `source-register.csv`.

## Réponse finale

Donne uniquement :

1. le nombre de `event_updates`, `event_additions`, `era_updates`, `unresolved` ;
2. la liste des identifiants mis à jour et ajoutés ;
3. les points qui restent en `unresolved` ;
4. les risques ou vérifications humaines nécessaires.
