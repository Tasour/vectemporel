# Vue `c4-aide-poc` — Diagnostic et plan de 10 chantiers

> Périmètre (niveau MICRO) : aide, découvrabilité des commandes, modale `?`,
> consignes contextuelles, premier lancement, retour, vocabulaire, états vides.
> Fichiers possédés : zone aide / modalités / toast de `app.js`, et **le texte
> d'aide du Plan** dans `plan.js` (le reste appartient à `m2-hub-plan`).
> Sources : `app.js`, `plan.js`, `APP_PLAN.md` §3/§6/§7/§9/§10, `README.md` :55-120,
> `index.html` (lecture seule), `scripts/e2e-keyboard.mjs`.
> Aucune donnée historique n'est inventée ; les preuves sont des comportements de code.

## 1. C4-01 — La touche `?` ouvre deux aides concurrentes dans Récit, Système solaire et Plan

- **Problème / preuve.** `story.js:1055-1058`, `solar.js:996-999` et `plan.js:214-217`
  ouvrent leur aide sans `stopPropagation()`. Le gestionnaire `document` de `app.js`
  est enregistré après eux (`app.js:3212` ; `story.js:1199`, `plan.js:296`) et
  `app.js:1306-1309` ouvre à son tour la modale « Le concept ». Résultat : deux
  dialogues `aria-modal="true"` empilés, deux pièges de focus rivaux. L'E2E
  (`scripts/e2e-keyboard.mjs:85-90`) ne vérifie que `story-help`, donc il passe.
- **Solution.** Traiter `?` en tête de `onGlobalKeydown`, avant tout retour
  anticipé, et s'effacer dès qu'une vue à aide dédiée est ouverte
  (`VECTEMPOREL_STORY/SOLAR/PLAN.state().open`). Une seule touche, une seule aide.
- **Impact sur l'évidence.** Le test « je peux obtenir de l'aide ici » devient
  observable sans ambiguïté : un seul dialogue, un seul focus, une seule sortie.
- **Risque.** Faible : les aides de vue gardent la priorité ; risque nul sur l'E2E.
  Effort **S**.
- **Vérification.** Dans Récit, Système solaire et Plan : `?` puis `Échap` → un seul
  panneau s'ouvre et se ferme ; `npm run test:e2e` reste 14/14.

## 2. C4-02 — `?` est muet dans le Dragon, le globe et le Lecteur

- **Problème / preuve.** Trois retours anticipés court-circuitent la touche :
  `app.js:1209` (dragon / `spiral-overlay`), `app.js:1217-1240` (globe),
  `app.js:1263-1296` (lecteur). Or `APP_PLAN.md:155` prescrit `?` = aide dans
  **toutes** les vues. Le Dragon et le globe n'ont aucun gestionnaire `?` propre
  (aucune occurrence dans `dragon.js` / `globe-engine.js`).
- **Solution.** Remonter le test de `?` avant ces trois garde-fous, avec le même
  garde-fou « vue à aide dédiée » que C4-01.
- **Impact sur l'évidence.** Le contrat clavier du plan directeur devient vérifiable
  depuis n'importe quelle scène, y compris les deux points d'entrée (globe, Plan).
- **Risque.** Moyen : la modale s'ouvre par-dessus le lecteur ; l'ordre d'`Échap`
  et le piège Tab sont corrigés en C4-05 pour éviter deux dialogues actifs.
  Effort **M**.
- **Vérification.** `?` depuis le globe, le dragon et le lecteur ouvre l'aide ;
  `Échap` rend la vue d'origine.

## 3. C4-03 — L'aile globale n'est pas une aide : la modale est une note de concept

- **Problème / preuve.** `app.js:1306-1308` appelle `openModal()`, dont le contenu
  (`index.html:665-736`) est un argumentaire marketing (roadmap M1/M2/M3, « limites
  assumées », lien `CONCEPT.md`) : **zéro raccourci, zéro consigne, zéro indication
  de la vue courante**. La frise, vue centrale, n'a aucun bouton d'aide ; seul le
  globe, le Plan, le Récit et le Système solaire en ont un.
- **Solution.** Injecter dans la modale (via `<style id="nav-c4">` et DOM construit
  en JS) un panneau « Aide & raccourcis » : vue courante, sections par vue, états
  vides, rappel « Échap vous rend à la vue en cours ». Aucune navigation, aucun
  changement d'état : l'aide est consultable sans perdre son contexte.
- **Impact sur l'évidence.** « Comment je le sais ? » devient une réponse visible
  et actionnable dans la scène où l'on se trouve, pas un document externe.
- **Risque.** Moyen : panneau long dans une modale scrollable (`styles.css:2209-2215`) ;
  mise en page compacte et grille une colonne sous 640 px. Effort **M**.
- **Vérification.** Ouvrir `?` sur la frise : la vue « Frise » est marquée, les
  touches `/`, `+ - 0`, `← →`, `Échap` sont listées ; fermer → focus rendu.

## 4. C4-04 — Raccourcis non listés par vue et vocabulaire en conflit avec les onglets

- **Problème / preuve.** Les raccourcis n'existent que dans `README.md:60` et
  `APP_PLAN.md:143-156`, jamais dans l'interface hors pied du Plan
  (`index.html:447-450`). Le vocabulaire diverge : `index.html:681` « Le globe &
  la flèche », `index.html:696` « La spirale », `README.md:5` « queue de dragon »,
  `index.html:88-91` « Le concept », alors que la barre affiche Plan / Récit /
  Dragon (`index.html:59`, `284`, `80`) et le Plan « Frise », « Lecteur »
  (`index.html:459-462`). Le même objet porte quatre noms.
- **Solution.** Aligner les titres des sections d'aide sur les libellés d'onglets
  exacts (Plan, Récit, Dragon, Frise, Lecteur, Système solaire) et recopier les
  touches de `APP_PLAN.md:143-156` sans les réinterpréter.
- **Impact sur l'évidence.** Un même mot désigne un même écran dans la barre, le
  Plan et l'aide : la carte mentale devient mesurable par simple concordance.
- **Risque.** Faible ; risque éditorial si un libellé d'onglet change sans l'aide.
  Effort **S**.
- **Vérification.** Comparer les six titres du panneau aux libellés visibles des
  onglets et des cartes du Plan.

## 5. C4-05 — Focus non piégé dans la modale « Le concept », Échap mal priorisé

- **Problème / preuve.** `openModal()` (`app.js:2723-2729`) place le focus sur
  `modal-close` mais ne piège jamais `Tab`, contrairement au globe
  (`app.js:1223-1238`) et au lecteur (`app.js:1263-1282`). `APP_PLAN.md:186`
  exige « Focus piégé dans la modale active ». En outre `app.js:1253-1260` ferme
  le lecteur **avant** la modale si les deux sont ouverts (cas C4-02).
- **Solution.** Piège `Tab` sur `about-overlay` (devant même le piège du lecteur),
  avec réintégration si le focus a quitté le dialogue ; `Échap` ferme d'abord la
  modale ; garde `modalClosing` pendant les 320 ms de transition.
- **Impact sur l'évidence.** La hiérarchie des dialogues devient démontrable au
  clavier : le focus ne peut pas « fuir » vers une vue masquée.
- **Risque.** Moyen : deux pièges Tab imbriqués ; ordre explicite modale > lecteur.
  Effort **M**.
- **Vérification.** Ouvrir l'aide depuis le lecteur ; `Tab` en boucle reste dans
  la modale ; `Échap` la ferme, second `Échap` ferme le lecteur.

## 6. C4-06 — Le retour ne rend pas le focus à l'élément d'origine

- **Problème / preuve.** `closeModal()` (`app.js:2738`) appelle toujours
  `els.aboutBtn.focus()`, même quand la modale a été ouverte par `?` depuis le
  stage, le globe ou le lecteur. Le fil d'Ariane cognitif est rompu : on revient
  sur un bouton de la barre, pas là où on était.
- **Solution.** Mémoriser `document.activeElement` à l'ouverture, le restaurer à
  la fermeture s'il est encore connecté, repli sur `aboutBtn`.
- **Impact sur l'évidence.** « Je reviens d'où je viens » devient observable par
  la position du focus, pas seulement par le retour visuel.
- **Risque.** Faible ; le bouton « Explorer la frise » (`app.js:3188-3191`)
  continue de placer le focus sur le stage après sa propre action. Effort **S**.
- **Vérification.** Focus sur un repère → `?` → `Échap` : le focus revient au repère.

## 7. C4-07 — L'aide du Plan contredit le premier lancement et emploie du jargon

- **Problème / preuve.** `index.html:457` affirme « Le Plan est le point de départ »,
  alors que `plan.js:325-327` et `plan.js:339-344` ouvrent le **globe** au chargement
  et que `plan.js:3-4` décrit le Plan comme « point d'entrée unique » (formulation
  historique). `index.html:460` « plonger vers le centre remonte le temps » est le
  jargon du Dragon, pas le vocabulaire des onglets. `APP_PLAN.md:179` impose des
  états vides explicites, pas un repli silencieux.
- **Solution.** Dans `plan.js` uniquement, réécrire le texte d'aide au `init()` par
  DOM : globe = entrée, Plan = menu ; libellés d'onglets ; raccourcis
  (`1–4`, `← →`, `↑ ↓`, `↵`, `?`, `Échap`) repris de `APP_PLAN.md:143-156` ;
  conserver la note « aucune donnée inventée ».
- **Impact sur l'évidence.** Le premier écran et l'aide racontent le même parcours :
  la contradiction disparaît, la source de vérité devient l'interface.
- **Risque.** Moyen : co-édition de `plan.js` avec `m2-hub-plan` ; ancres uniques,
  relecture avant edit, aucun autre contenu touché. Effort **M**.
- **Vérification.** Ouvrir l'aide du Plan : plus de « point de départ », présence de
  « globe » et des six raccourcis ; le reste de `plan.js` inchangé.

## 8. C4-08 — Premier lancement sans aucun indice de l'aide

- **Problème / preuve.** `plan.js:339-344` ouvre le globe après 180 ms ; aucun
  message n'annonce `?`, ni le pilotage clavier. `README.md:43` décrit encore un
  démarrage direct sur le Récit, contredisant `APP_PLAN.md:11` et le code.
- **Solution.** Un toast d'accueil unique par session : « Appuyez sur ? à tout
  moment pour ouvrir l'aide et les raccourcis de la vue. » Marqueur protégé par
  `try/catch` (stockage éventuellement indisponible), neutralisé dès que l'aide a été
  ouverte manuellement.
- **Impact sur l'évidence.** Le premier lancement produit une trace observable de
  la découvrabilité : on peut vérifier que l'indice a été donné une seule fois.
- **Risque.** Faible : toast `role="status" aria-live="polite"` existant
  (`index.html:738`), non bloquant, sans effet sur l'E2E. Effort **S**.
- **Vérification.** Nouvel onglet → indice après le globe ; rechargement → plus
  d'indice ; ouverture manuelle de l'aide → plus d'indice.

## 9. C4-09 — Découvrabilité mobile : l'aide est un mot ou une touche, pas un `?`

- **Problème / preuve.** Le bouton de barre est libellé « Le concept »
  (`index.html:88-91`), pas « aide » ; les seules consignes visibles sont des
  `<kbd>` (`index.html:447-450`) inutiles sans clavier. Le bouton `?` n'existe que
  dans les vues qui en ont un (`plan-help-btn` : `index.html:402`,
  `solar-help-btn` : `solar.js` / `index.html:534`).
- **Solution.** Depuis `app.js`, ajouter un badge `?` visible au bouton de barre,
  un `aria-label` explicite (« Aide et raccourcis clavier, touche ? ») et un `title` ;
  libeller le bouton « Aide ». CSS responsive dans `#nav-c4` : cible ≥ 36 px,
  grille une colonne sous 640 px, focus visible.
- **Impact sur l'évidence.** Sur mobile, l'aide est trouvable par un signe
  universel (`?`) indépendamment du clavier : la découvrabilité devient testable
  au toucher.
- **Risque.** Faible : `index.html` n'est pas modifié, nouvelle étiquette appliquée
  au runtime ; l'E2E n'utilise pas ce bouton. Effort **S**.
- **Vérification.** À 390 px de large, le `?` est visible et actionnable au toucher,
  il ouvre le même panneau que la touche.

## 10. C4-10 — Les états vides sont explicites à l'écran, muets dans l'aide

- **Problème / preuve.** Messages réels : `app.js:2645` « Aucun repère trouvé.
  Essayez « Alésia », « 1789 », « Dreyfus » ou « Berlin ». », `app.js:3383`
  « Aucun repère dans cette fenêtre. », `app.js:1719` « Aucun lieu renseigné …
  dans le corpus actuel. ». Aucun n'est expliqué dans l'aide, alors que
  `APP_PLAN.md:179` impose « aucun repli silencieux ».
- **Solution.** Section « Quand rien ne s'affiche » dans le panneau d'aide avec ces
  trois messages et leur suite (recadrer avec `0`, corriger la recherche, ne pas
  substituer de lieu). Un `MutationObserver` posé sur `#search-results`, entièrement
  dans la zone toast, émet un conseil quand `.search-empty` apparaît — sans
  toucher au rendu de la recherche.
- **Impact sur l'évidence.** Un état vide devient une information pédagogique :
  l'utilisateur sait quoi faire, et l'audit peut le constater dans l'aide.
- **Risque.** Faible : observation en `childList`, dédupliquée, silencieuse si le
  noeud n'apparaît pas. Effort **M**.
- **Vérification.** Rechercher un terme absent → toast de conseil ; ouvrir `?` →
  section « Quand rien ne s'affiche » ; aucun point ni date substitué.

## Synthèse de priorisation

| Ordre | Chantier | Effort | Risque |
| --- | --- | --- | --- |
| 1 | C4-01 doublon d'aide | S | Faible |
| 2 | C4-02 `?` muet sur 3 vues | M | Moyen |
| 3 | C4-03 aide actionnable | M | Moyen |
| 4 | C4-04 vocabulaire / raccourcis | S | Faible |
| 5 | C4-05 piège Tab + Échap | M | Moyen |
| 6 | C4-06 retour du focus | S | Faible |
| 7 | C4-07 aide du Plan | M | Moyen (co-édition) |
| 8 | C4-08 premier lancement | S | Faible |
| 9 | C4-09 mobile | S | Faible |
| 10 | C4-10 états vides | M | Faible |

---

## Statut d'implémentation

**10/10 chantiers implémentés** dans les deux zones possédées :

- `app.js` — zone aide / modalités / toast : `toast()` + `toastTip()`, `?` universel
  avec garde-fou des aides dédiées, piège Tab et priorité `Échap` de la modale,
  restauration du focus, panneau « Aide & raccourcis » construit en DOM dans la
  modale (vue courante, 7 sections par vue, états vides), bouton de barre
  libellé « Aide » avec badge `?`, indice de premier lancement unique,
  observateur des recherches vides, et adaptation au bus public du routeur clavier
  (`vectemporel:keyroute`) pour que `?` réponde aussi depuis le globe et le dragon.
- `plan.js` — **uniquement** `rewritePlanHelp()` (texte d'aide du Plan) appelé au
  `init()` ; aucune autre fonction touchée.
- CSS : bloc injecté `<style id="nav-c4">` ; `styles.css`, `index.html`, `story.js`,
  `solar.js`, `dragon.js`, `keyboard-router.js` et `scripts/` non modifiés par cette surface.

**Vérifications.** `node --check app.js` et `node --check plan.js` : OK.
Contrôles navigateur ciblés : `?` ouvre une seule aide dans les 5 vues, focus
piégé dans la modale, `Échap` rend la vue d'origine, panneau et états vides
présents, badge `?` visible à 390 px, zéro erreur console.
`npm run test:e2e` : **14/14** (dernières exécutions stables).

**Risque de concurrence.** Des exécutions intermédiaires sont passées à 13/14 puis
9/14 pendant que les surfaces `t1-routeur-poc` et `t3-retour-poc` réécrivaient
`keyboard-router.js` et `story.js` (course sur le délai de 240 ms de fermeture de
`story-help`). Aucune de ces corrections n'a été appliquée ici : hors périmètre.
