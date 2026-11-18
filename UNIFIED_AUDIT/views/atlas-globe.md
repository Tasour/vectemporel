# atlas-globe — Audit frontend / accessibilité WebGL

Vue : atlas-globe (globe 3D et sélecteur de pays, point d entrée sans lien externe).
Fichier possédé : src/views/globe.js. Lectures seules : public/globe-engine.js,
src/domain/store.js, src/platform/keyboard.js, src/ui/shell.js, styles.css,
index.html, README.md, scripts/verify.mjs, tests/e2e.mjs.
Aucune autre vue concernée, aucune donnée inventée, aucun appel réseau ajouté.

---

## ATLAS-GLOBE-01 — Boucle WebGL jamais arrêtée à la sortie de la vue

- Problème / preuve : globe.js:46 appelle engine.open() mais aucun engine.close() n est jamais émis par le module. Or globe-engine.js:373-379 démarre setAnimationLoop(frame) et :381-386 l arrête. Quitter la vue (touches 2 à 5, shell.js:142-148) laisse state.visible à true : frame() (:361-371) continue de rendre environ 60 fps sur toutes les autres vues.
- Solution : un IntersectionObserver sur le host plus un abonnement au store alimentent une unique syncEngine() qui appelle open() ou close() selon inView && state.view === globe && !paused. Exposer l état via host.dataset.globeActive.
- Impact : zéro frame GPU hors globe, économie de batterie, GPU libéré pour les autres vues.
- Risque : réouverture parasite pendant les re-renders (shell.js:137 vide root.innerHTML) ; garder un booléen engineRunning et n agir que sur transitions ; open(code) restaure le pays courant.
- Effort : M
- Vérification : e2e — après la touche 2, document.documentElement.dataset.globeActive vaut 0 (le host est détaché, le marqueur persiste sur html) ; retour touche 1, il repasse à 1.

## ATLAS-GLOBE-02 — Canvas aria-hidden sans substitut sémantique ni annonce d état

- Problème / preuve : globe-engine.js:430 met aria-hidden sur le canvas ; globe.js:11-14 ne donne au host ni rôle, ni libellé, ni description, et :25-27 une aide purement visuelle. Un lecteur d écran ne sait ni ce qu est le globe, ni quel pays est actif, ni combien de repères il contient.
- Solution : host focusable avec role=group, aria-label dynamique (pays mis en évidence, position dans la liste, action), aria-describedby vers une instruction, et région role=status aria-live=polite pour les sélections. Le canvas reste aria-hidden, le sens est porté par le DOM.
- Impact : le globe devient compréhensible sans vision ; conforme au principe d équivalence fonctionnelle.
- Risque : annonces trop bavardes si aria-live est aussi utilisé pour le survol ; limiter le live à la sélection et au changement de pays au clavier.
- Effort : M
- Vérification : e2e — #globe-live contient le nom du pays après navigation clavier ; lecture manuelle NVDA/VoiceOver du host.

## ATLAS-GLOBE-03 — Aucun pilotage clavier du globe (flèches, Entrée, Home/End)

- Problème / preuve : src/platform/keyboard.js:43 court-circuite toutes les touches restantes dès que state.view vaut globe. Les flèches et Entrée n ont donc aucun effet : seul Tab vers les boutons permet de choisir un pays, sans miroir visuel sur la sphère.
- Solution : gestionnaire keydown local sur le host (tabindex=0) : flèches parcourent les 10 pays, Home/End vont au premier/dernier, Entrée valide via selectCountry. Chaque déplacement appelle engine.setHover(code) pour refléter le choix sur le globe. Ne pas enregistrer de second routeur global : les touches 1-5, ? et Échap restent au routeur unique.
- Impact : parcours clavier complet du sélecteur 3D, avec retour visuel et sonore (live).
- Risque : interférence avec le routeur global ; vérifier qu il retourne bien avant les branches flèches/Entrée (ligne 43), donc aucun stopPropagation nécessaire.
- Effort : M
- Vérification : e2e — focus sur #globe-canvas, ArrowRight puis Entrée conduit à view=chronology avec countryId renseigné.

## ATLAS-GLOBE-04 — Boutons sans état de sélection et cibles tactiles insuffisantes

- Problème / preuve : globe.js:29-33 crée des boutons sans aria-current ni état visuel de sélection ; styles.css:125-131 impose min-height 38 px, sous la cible recommandée de 44 px (WCAG 2.2 2.5.5). Le drapeau seul porte une information (SEO/accessibilité) qui doit être textuellement doublée.
- Solution : poser aria-current=true sur le bouton du pays issu de state.countryId (choix unique, donc pas aria-pressed), ajouter un style dédié via le bloc injecté atlas-globe-css, porter les boutons à min-height 44 px (48 px sous 620 px) et renforcer :focus-visible.
- Impact : état courant explicite pour les lecteurs d écran et les utilisateurs malvoyants, cibles tactiles confortables.
- Risque : surcharge de styles.css partagé ; utiliser exclusivement le style injecté depuis le module, sans toucher au fichier commun.
- Effort : S
- Vérification : e2e — après retour au globe, le bouton du pays choisi porte aria-current=true et une hauteur calculée >= 44 px.

## ATLAS-GLOBE-05 — Focus perdu à chaque re-render de la coque

- Problème / preuve : shell.js:137 exécute root.innerHTML = vide à chaque emission du store (app.js:8 subscribe(render)) ; renderGlobe (globe.js:18-35) recrée wrapper et liste, donc les boutons. Le focus clavier retourne au body après chaque changement d état (ex. ouverture de l aide par ?), ce qui casse la navigation.
- Solution : mémoriser l index du bouton focalisé via focusin sur le conteneur, puis le restaurer dans un abonnement au store différé en requestAnimationFrame (l abonnement du module est enregistré avant celui de app.js, donc avant le render). Ne restaurer que si state.view vaut globe.
- Impact : continuité du parcours clavier, conformité au critère de gestion du focus.
- Risque : vol de focus lors d un changement de vue ; la garde sur state.view empêche la restoration en chronologie.
- Effort : M
- Vérification : e2e — focuser le 3e bouton, presser ? puis ? , le focus doit revenir au 3e bouton.

## ATLAS-GLOBE-06 — Mouvement réduit non exploitable et rotation sans contrôle utilisateur

- Problème / preuve : globe-engine.js:367 neutralise l auto-rotation si prefers-reduced-motion est actif, mais open() (:491-499) force autoRotate à true. La variable moving (:365) reste vraie et renderer.render() est appelé à chaque frame sans changement visible : boucle GPU inutile. Aucun bouton ne permet d arrêter ou de reprendre la rotation.
- Solution : détecter la préférence au chargement, exposer un bouton à aria-pressed (rotation active oui/non) qui bascule paused et appelle syncEngine(). Au chargement avec mouvement réduit, dessiner une seule frame statique (open puis close après deux requestAnimationFrame) pour que le globe ne soit pas vide.
- Impact : respect réel de prefers-reduced-motion, contrôle explicite, suppression des frames mortes.
- Risque : le moteur n expose pas de setter autoRotate (API publique : init, open, close, resize, setSelected, setHover, debugPick, getInfo). Blocage documenté : un verrou net côté moteur serait plus propre ; la vue contourne par open/close sans modifier globe-engine.js.
- Effort : M
- Vérification : avec mouvement réduit émulé, le host porte data-globe-active à 0 après chargement ; aria-pressed du bouton passe à true après clic et la rotation reprend.

## ATLAS-GLOBE-07 — Survol porté par la seule couleur, sans retour textuel

- Problème / preuve : globe-engine.js:149-154 colore le pays survolé par mélange de couleurs uniquement ; renderGlobe ne transmet que onSelect (globe.js:41-45) et ignore onHover, onReady et onError définis dans state.callbacks (globe-engine.js:26). Aucun texte ne nomme le pays pointé.
- Solution : transmettre onHover (met à jour un libellé visible #globe-hover-readout), onReady et onError (statut), en plus de onSelect. Le libellé n est pas un aria-live pour éviter le spam ; la sélection, elle, reste annoncée.
- Impact : information non dépendante de la couleur, meilleure compréhension pour daltoniens et lecteurs d écran.
- Risque : taux de rafraîchissement de onHover déjà limité à 45 ms dans le moteur (:246-251) ; la mise à jour textuelle reste peu coûteuse.
- Effort : S
- Vérification : appeler VECTEMPOREL_GLOBE.setHover('FRA') en console et contrôler que #globe-hover-readout affiche France et 57 repères.

## ATLAS-GLOBE-08 — Chargement sans état d attente ni repli accessible

- Problème / preuve : globe.js:38-48 ne gère que deux branches. Si THREE ou le moteur est absent, rien n est affiché ; si init() rejette, hostNode.textContent écrase le host (globe.js:47) avec un message brut, sans role=status ni aria-live, et détruit le canvas. En iframe, un WebGL indisponible laisse un vide incompréhensible.
- Solution : toujours créer un nœud #globe-status (role=status) et aria-busy sur le host ; distinguer chargement, succès et erreur via setStatus() ; en erreur, ne pas écraser le host, seulement afficher le message et laisser la liste et le pilotage clavier opérationnels.
- Impact : repli robuste, aucun contenu perdu, message audible.
- Risque : double signalement car init() appelle onError puis rejette ; setStatus est idempotent.
- Effort : S
- Vérification : lancer e2e avec WebGL désactivé ; les 10 boutons et le message d erreur doivent rester présents, aucune erreur console non gérée.

## ATLAS-GLOBE-09 — Retour au globe désynchronisé de l état partagé

Problème / preuve : globe.js:46 appelle engine.open() sans argument alors que open(selectedCode) accepte un code (globe-engine.js:491-493). state.countryId est ignoré : après avoir choisi un pays puis pressé 1, ni la liste ni le globe ne marquent la sélection.
Solution : dériver currentCode de state.countryId à chaque render, transmettre ce code à open(), appeler setSelected et poser aria-current sur le bouton.
Impact : cohérence avec l état unique, pas de sélection fantôme.
Risque : open() réinitialise la rotation et le survol ; n appeler que lors du retour effectif à la vue globe.
Effort : S
Vérification : e2e — choisir un pays, presser 1, contrôler aria-current et host.dataset.globeSelected.

## ATLAS-GLOBE-10 — Mobile : zoom non accessible et pas de consigne de taille tactile

Problème / preuve : le zoom repose sur wheel et pincement (globe-engine.js:302-309, 354-359), inutilisables au clavier ou avec un seul doigt ; styles.css:259 donne 55% de hauteur au host sous 1000 px, sans plan de repli pour les petits écrans.
Solution : boutons Zoom+ et Zoom- (min 44 px, aria-label) qui dispatchent un WheelEvent sur le canvas, CSS injecté atlas-globe-css avec min-height 45vh pour le host et 48 px pour les boutons sous 620 px, et consigne textuelle des gestes.
Impact : zoom utilisable au toucher et au clavier, cibles conformes sur mobile.
Risque : un WheelEvent synthétique ne peut pas planter le moteur car onWheel est enregistré avec passive false ; la rotation, elle, reste non exposée par l API (cf. ATLAS-GLOBE-06).
Effort : S
Vérification : e2e en viewport 390x844 — les 3 boutons de commande sont visibles, cliquables, et aucun débordement horizontal.

---

## Statut d implementation
Les 10 chantiers sont implémentés dans src/views/globe.js. Aucun fichier interdit modifié ; le CSS est injecté via le style atlas-globe-css.
Blocage partiel : ATLAS-GLOBE-06 serait plus propre avec un setter autoRotate côté moteur (public/globe-engine.js non possédé) ; la vue contourne par open/close et documente le contournement.

## Vérifications
node --check src/views/globe.js : PASS. npm run verify : 21 contrôles PASS. npm run test:e2e : 15 contrôles PASS. npm run check : PASS complet. Tests complémentaires (/tmp, non livrés) : clavier globe, focus restauré, mouvement réduit, zoom, mobile 390x844, survol textuel : 31 contrôles PASS.
