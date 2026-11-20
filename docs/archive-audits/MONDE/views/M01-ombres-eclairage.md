# M01 — Ombres et éclairage du globe

> Lentille **M01**, vague « Monde » (domaine A : rendu & moteur WebGL).
> Fichier possédé : `src/views/monde/M01.js`. Lectures seules : `src/views/globe.js`,
> `public/globe-engine.js`, `public/globe-palette.json`, `src/views/globe-reveal.js`,
> `src/views/monde/registry.js`, `src/platform/keyboard.js`, `styles.css`, `tests/e2e.mjs`.
> 10 chantiers, priorité décroissante, **les 10 implémentés** dans le module.
> Zéro réseau, zéro `Math.random`, zéro `console.*`, aucun sélecteur de test modifié.

## Synthèse

| # | Chantier | Priorité | Effort |
| --- | --- | --- | --- |
| M01-01 | Terminateur quasi absent : 72 % d'ambiant, 28 % de modulation | P0 | M |
| M01-02 | Aucune ombre portée malgré un canvas à canal alpha | P0 | S |
| M01-03 | Éclairage muet pour les lecteurs d'écran | P0 | M |
| M01-04 | Direction de lumière inmodifiable : API moteur incomplète | P1 | M |
| M01-05 | Aucun terme spéculaire dans le fragment shader | P1 | S |
| M01-06 | Halo de contour ancré à la caméra, insensible à la rotation | P1 | M |
| M01-07 | Mouvement réduit : calques non couplés à la préférence | P1 | M |
| M01-08 | `getInfo()` ignoré : budget de rendu non auditable | P2 | S |
| M01-09 | Composition des calques non bornée sur grand canvas | P2 | M |
| M01-10 | Re-render : doublons d'IDs et vol des flèches | P2 | M |

---

## M01-01 — Terminateur quasi absent : 72 % d'ambiant, 28 % de modulation

- **Problème / preuve** : `public/globe-engine.js:171` calcule `float light = 0.72 + 0.28 * max(dot(normalize(vNormal), uLightDir), 0.0)` : la face à l'opposé de la lumière garde 72 % de la luminosité de la face éclairée, il n'existe donc pas de face nuit. `public/globe-engine.js:8` confirme « aucune lumière dynamique, aucun shadow map ». Le seul vecteur est figé à `public/globe-engine.js:142` (`uLightDir` = `(-0.42, 0.62, 0.72).normalize()`, soit ≈ `(-0.40, 0.60, 0.69)`).
- **Solution** : calque `.monde-m01-terminator` limité au disque du globe, dégradé alpha `rgba(1,3,8,0) → rgba(1,3,8,.62)`, centré en `28% 24%` (projection écran du vecteur normé : x ≈ 30 %, y ≈ 20 %). Composition alpha simple, sans `mix-blend-mode`, pour rester indépendant du contexte d'empilement. Bascule `#monde-m01-terminator-btn` avec `aria-pressed`, état miroir dans `host.dataset.m01Terminator`.
- **Impact** : la nuit devient lisible et le relief se perçoit, sans modifier le shader ni ajouter de draw call WebGL.
- **Risque** : `vNormal` est calculé avec `normalMatrix` (`public/globe-engine.js:154`), donc en espace de vue : le calque reste, comme le shader, ancré à l'écran et non à la surface terrestre. Le documenter comme éclairage de lecture, pas comme ombre physique ; amplitude plafonnée à `.62`.
- **Effort** : M.
- **Vérification** : un seul `.monde-m01-terminator` présent ; la bascule change `aria-pressed` et le texte de `#globe-live` ; relecture visuelle du contraste jour/nuit en 1658×1150 et 390×844.

## M01-02 — Aucune ombre portée malgré un canvas à canal alpha

- **Problème / preuve** : `public/globe-engine.js:8` exclut tout shadow map ; `public/globe-engine.js:591-596` crée le renderer avec `alpha: true` et `premultipliedAlpha: true`, `:597` pose `setClearColor(0x000000, 0)`, `:602` marque le canvas `globe-webgl`. Le hors-globe est donc transparent, mais aucune ombre n'exploite cette silhouette. La géométrie est une sphère lisse `SphereGeometry(1, 64, 40)` (`:189`) : aucun relief ne peut projeter d'ombre.
- **Solution** : `filter: drop-shadow(0 14px 22px rgba(0,0,0,.55))` sur `.monde-m01-host canvas.globe-webgl` (le filtre suit l'alpha réel du canvas), plus une ellipse de contact `.monde-m01-ground` en `z-index:0` sous le canvas, en `radial-gradient` et `pointer-events:none`.
- **Impact** : ombre portée réelle sur le fond et ancrage spatial du globe, pour un coût nul en draw calls GPU.
- **Risque** : `drop-shadow` force une couche de composition ; blur volontairement limité à 22 px et aucune animation du filtre. `contain:paint` reste sur le conteneur de calques uniquement, jamais sur le host, afin de ne pas rogner l'ombre.
- **Effort** : S.
- **Vérification** : le `filter` calculé du canvas contient `drop-shadow` ; `engine.getInfo().calls` reste inchangé avant/après activation ; `#globe-live` reste vide au survol.

## M01-03 — Éclairage muet pour les lecteurs d'écran

- **Problème / preuve** : `public/globe-engine.js:601` pose `aria-hidden="true"` sur le canvas ; `src/views/globe.js:270-271` donne au host un `aria-label` qui ne parle que du parcours des pays, et `:278` un `aria-describedby` unique pointant `globe-help`. Aucun texte ne décrit la direction de la lumière ni l'absence d'ombres, alors que l'ombre et le relief sont portés uniquement par l'image.
- **Solution** : paragraphe sr-only `#monde-m01-light-desc` créé dans `ctx.host`, dont l'identifiant est **ajouté** à l'`aria-describedby` existant sans écraser `globe-help`. Les bascules d'éclairage utilisent `aria-pressed` (commandes indépendantes, contrairement au choix unique du pays qui relève d'`aria-current`). Les annonces passent par `ctx.say()` uniquement sur action explicite, jamais sur survol.
- **Impact** : équivalence fonctionnelle de l'information lumineuse pour les lecteurs d'écran ; aucune info nouvelle n'est portée par la seule couleur.
- **Risque** : région live partagée `#globe-live` (`src/views/globe.js:73-85`) : limiter les messages aux changements d'état pour éviter le bavardage. L'ajout à `aria-describedby` est idempotent (garde par tableau d'IDs).
- **Effort** : M.
- **Vérification** : `aria-describedby` du host contient à la fois `globe-help` et `monde-m01-light-desc` ; après clic sur « Terminateur », `#globe-live` contient « Terminateur activé. » ; lecture NVDA/VoiceOver du host.

## M01-04 — Direction de lumière inmodifiable : API moteur incomplète

- **Problème / preuve** : `public/globe-engine.js:142` fige `uLightDir` dans `state.uniforms`, et l'API publique `public/globe-engine.js:677-705` n'expose que `init`, `open`, `close`, `resize`, `setSelected`, `setHover`, `setAutoRotate`, `invalidate`, `dispose`, `debugPick`, `ready` et `getInfo` : aucun setter de lumière. Une lentille ne peut donc pas réorienter le soleil du moteur.
- **Solution** : curseur `#monde-m01-azimuth` (`type="range"`, `min="-25"`, `max="25"`, `step="5"`) avec `<label>` sr-only et `aria-valuetext` en français, qui décale les variables `--m01-lx` / `--m01-ly` des calques et écrit `host.dataset.m01Azimuth`. Blocage moteur documenté : un `setLightDirection(dir)` exposant `uLightDir` serait nécessaire pour un alignement parfait.
- **Impact** : l'utilisateur adapte l'accent lumineux à sa lecture sans attendre une évolution du moteur.
- **Risque** : au-delà de ±25° le calque divergerait du shader : plage volontairement resserrée autour de la direction d'origine. Le curseur est un `INPUT`, donc le routeur ignore ses touches (`src/platform/keyboard.js:59-62`) ; les raccourcis 1–6 sont neutralisés tant qu'il a le focus, comportement normal d'un contrôle de formulaire ; aucun piège de focus ajouté.
- **Effort** : M.
- **Vérification** : flèches sur le curseur → `aria-valuetext` et `--m01-lx` changent ; la valeur reste dans `[-25, 25]` par pas de 5 ; aucun appel réseau ; E2E rejoué à froid par l'agent maître.

## M01-05 — Aucun terme spéculaire dans le fragment shader

- **Problème / preuve** : le fragment shader `public/globe-engine.js:158-185` ne contient que le terme diffus (`:171`), le rim (`:173-174`) et deux mélanges de couleurs de sélection (`:176-181`) ; aucune fonction `reflect`, `pow(dot(n,h))` ni constante de shininess. `public/globe-engine.js:600` applique en outre `NoToneMapping`, donc aucun éclat n'est récupérable en sortie.
- **Solution** : calque `.monde-m01-specular` — `radial-gradient(9% 9% ...)` en alpha clair plafonné à `.24`, centré sur les mêmes variables `--m01-lx/--m01-ly` — piloté par `#monde-m01-spec-btn` (`aria-pressed`) et renforcé au survol via `ctx.onHover` qui pose `host.dataset.m01Hover = "1"` (remis à `0` par `ctx.onLeave`).
- **Impact** : éclat de lecture au point d'incidence, sans augmentation du budget GPU.
- **Risque** : un halo trop clair masquerait les frontières ; alpha plafonné, dégradé circulaire borné au disque du globe, `pointer-events:none`. La surbrillance au survol est décorative et n'annonce rien dans la live region.
- **Effort** : S.
- **Vérification** : la bascule change `aria-pressed` et l'opacité calculée ; `data-m01-hover` passe à `1` puis `0` au survol/sortie ; zéro `console.*`.

## M01-06 — Halo de contour ancré à la caméra, insensible à la rotation

- **Problème / preuve** : `public/globe-engine.js:173-174` calcule le rim avec `dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))` : le vecteur caméra est constant dans l'espace de vue obtenu en `:154`, alors que la rotation tourne en `:446-470` (`rotation.y += dt * 0.065`). Le halo ne varie donc jamais quand le globe tourne : l'indice de profondeur est plat.
- **Solution** : anneau CSS `.monde-m01-rim` (disque de `height:78%` et `aspect-ratio:1/1`, `box-shadow:inset`), activable par `#monde-m01-rim-btn` (`aria-pressed`). Les 78 % sont calculés depuis la caméra `PerspectiveCamera(35, …)` à `z = 4.05` (`:130-131`) et le rayon `1` (`:189`) : `2 / (4.05 × tan(17,5°)) ≈ 0,783` de la hauteur.
- **Impact** : contour plus lisible, profondeur perçue même quand l'auto-rotation est en pause.
- **Risque** : le calque est en `z-index:2`, sous le HUD (`styles.css:130-135`, `z-index:4`) et les commandes (`:150`, `z-index:5`) : aucun recouvrement des textes. Le halo reste un repère de lecture, pas une ombre physique.
- **Effort** : M.
- **Vérification** : diamètre calculé du disque ≈ 78 % de la hauteur du host en 1440×900 ; `aria-pressed` cohérent après 10 re-renders ; aucun texte du HUD recouvert.

## M01-07 — Mouvement réduit : calques non couplés à la préférence

- **Problème / preuve** : `public/globe-engine.js:317-327` (`onMotionChange`) ne pilote que `autoRotate` ; `src/views/globe.js:436-439` fournit `ctx.reducedMotion()` mais aucun greffon ne l'utilise. `styles.css:342-345` neutralise bien les `animation`/`transition` globalement, mais pas le changement instantané de `box-shadow` au survol (M01-06), ni un état auditable.
- **Solution** : lire `ctx.reducedMotion()` à chaque application, écrire `host.dataset.m01Reduced`, enregistrer **un seul** écouteur module-level `matchMedia('(prefers-reduced-motion: reduce)')` (`change`, avec repli `addListener`), et neutraliser le halo de survol sous préférence réduite. La frame statique reste celle de `src/views/globe.js:172-183` : aucun second `requestAnimationFrame` n'est ajouté.
- **Impact** : aucune surprise de mouvement, état de la préférence exposé dans le DOM, cohérence avec le moteur.
- **Risque** : un écouteur dupliqué à chaque rendu ; garde module-level `motionBound` et référence `currentHost`. Ne pas remplacer l'`aria-describedby` existant ni modifier `styles.css`.
- **Effort** : M.
- **Vérification** : avec mouvement réduit émulé, `data-m01-reduced="1"` et les `transition-duration` calculées des calques à `0s` ; aucun `requestAnimationFrame` supplémentaire dans le module ; E2E rejoué à froid.

## M01-08 — `getInfo()` ignoré : budget de rendu non auditable

- **Problème / preuve** : `public/globe-engine.js:691-704` expose `getInfo()` avec `calls`, `triangles`, `textures`, `pixelRatio`, `width`, `height`, mais `src/views/globe.js:442` transmet le contexte aux lentilles sans hook de diagnostic. Rien ne prouve que l'ajout des ombres CSS ne dégrade pas le budget d'une seule sphère annoncé en `public/globe-engine.js:5`.
- **Solution** : un seul `ctx.onReady((payload) => …)` lit `payload.engine.getInfo()` et alimente `#monde-m01-metric` (« N draw call · N triangles · DPR x ») ainsi que `data-m01-draw-calls`, `data-m01-triangles` et `data-m01-pixel-ratio` sur le host. Le callback est enregistré une fois (garde `readyBound`) car `flushMondeReady` n'est appelé qu'à la première initialisation (`src/views/globe.js:467`).
- **Impact** : dérive du nombre de draw calls immédiatement visible, et coût GPU nul des ombres CSS démontré.
- **Risque** : `getInfo()` renvoie `null` avant création du renderer (`:692`) : garde sur `info` et sur `currentHost`. Une valeur `0` après arrêt de la boucle n'est pas une erreur.
- **Effort** : S.
- **Vérification** : après chargement, `#monde-m01-metric` contient « draw call » et `data-m01-draw-calls` est numérique ; le texte est lisible en 390×844 (le badge est masqué sous 620 px, les `data-*` restent au DOM).

## M01-09 — Composition des calques non bornée sur grand canvas

- **Problème / preuve** : `public/globe-engine.js:202-205` borne le budget à `2 200 000` pixels et le DPR à `1,5` ; `styles.css:127-129` étire le canvas à `100%` du host dans une scène en `overflow:hidden`. Trois calques pleine surface viendraient doubler le coût de composition sur un grand écran, sans garde-fou.
- **Solution** : calques regroupés dans un unique conteneur `.monde-m01-layers` avec `contain:paint`, aucun `will-change` permanent, aucune animation de dégradé ; `@media (max-width:1000px)` décale le groupe de commandes, `@media (max-width:620px)` masque le reflet, le halo et la métrique, ne laissant que le terminateur et l'ombre portée.
- **Impact** : budget pixels du moteur préservé, pas de `fill-rate` doublé sur mobile, pas de scintillement.
- **Risque** : `contain:paint` sur le host rognerait le `drop-shadow` : la propriété est appliquée au seul conteneur de calques. Le masquage mobile retire deux commandes visuelles mais leurs états `data-m01-*` restent cohérents.
- **Effort** : M.
- **Vérification** : `contain` calculé du conteneur à `paint` ; au plus un calque décoratif visible sous 620 px ; `getInfo().pixelRatio ≤ 1,5` ; aucun `will-change` dans le style injecté.

## M01-10 — Re-render : doublons d'IDs et vol des flèches

- **Problème / preuve** : `src/views/globe.js:310` reconstruit `scene` à chaque émission du store (`:317`) tandis que le host est réutilisé (`:263-264`) ; `:442` rejoue les 50 greffons à chaque rendu ; `src/views/monde/registry.js:25-31` ne garantit que le style (`cssOnce`), pas les nœuds ni les écouteurs. Le host porte en outre un gestionnaire de flèches (`:281`) : placer les commandes d'éclairage dedans ferait parcourir les pays au lieu de régler le curseur.
- **Solution** : helper `ensureNode(id, tag, className, parent)` qui réutilise un nœud existant et le déplace dans le parent courant ; calques et description dans `ctx.host` (persistant), groupe de commandes dans `ctx.scene` (recréé) ; un seul `ctx.css('monde-m01', …)` ; drapeaux `m01Bound` sur les boutons et gardes module-level `hoverBound` / `readyBound` / `motionBound` pour les écouteurs.
- **Impact** : aucun ID dupliqué, aucun vol des flèches, zéro erreur console sur une longue session.
- **Risque** : le host survivant peut conserver un état de bascule alors que la scène change : les `data-m01-*` et `aria-pressed` sont resynchronisés à chaque application. Le registre neutralise silencieusement une lentille défaillante, mais la garde d'existence reste nécessaire pour les nœuds déplacés.
- **Effort** : M.
- **Vérification** : 20 cycles de retour vers le globe → un seul `#monde-m01-light-desc`, un seul `<style id="monde-m01">`, un seul groupe `#monde-m01-controls` ; flèches sur le curseur sans changement de pays ; `node --check src/views/monde/M01.js` et suite E2E rejouée par l'agent maître.
