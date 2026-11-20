# M11-masque-decoupe — lentille « Monde » du masque de découpe du contour pays

> Domaine B : drapeau & révélation. Fichier possédé : `src/views/monde/M11.js` (seul fichier modifié).
> Lectures seules : `src/views/globe-reveal.js` (1–247), `public/globe-pick.png` (2048×1024, RGBA/8),
> `public/globe-palette.json` (196 codes), `src/views/monde/registry.js`, `src/views/globe.js:310–486`.
> 10 chantiers, **les 10 implémentés** dans `M11.js`. Zéro réseau, zéro `Math.random`, zéro `console.*`,
> aucun sélecteur de test modifié, aucun autre fichier touché. Vérification : `node --check src/views/monde/M11.js`.

## Synthèse

| # | Chantier | Priorité | Effort |
| --- | --- | --- | --- |
| M11-01 | Palette figée à 10 codes, divergente des 196 du JSON | P0 | S |
| M11-02 | Tolérance cubique ±18 : attribution au mauvais pays | P0 | M |
| M11-03 | Bords binaires 0/255 : crénelure au zoom ×7 | P0 | M |
| M11-04 | Masque non recadré : silhouette noyée dans 2048×1024 | P0 | M |
| M11-05 | Territoires disjoints non filtrés (50 composantes pour FR) | P0 | M |
| M11-06 | Pays minuscules : masque vide, révélation invisible | P1 | S |
| M11-07 | Cache non borné, dataURL pleine taille, échecs rejoués | P1 | M |
| M11-08 | Jetons survol/révélation confondus : masque périmé | P1 | S |
| M11-09 | Échec de texture silencieux, sans statut ni repli | P1 | S |
| M11-10 | Aucune observabilité du masque | P2 | S |

Mesures relevées sur `globe-pick.png` par décodage local : 2 097 152 pixels, alpha intégralement à 255,
448 326 pixels de couleur exactement dans la palette, **1 648 826 pixels hors palette** (bords dégradés).
À tolérance 18 : FR compte 50 composantes connexes (cœur 1 935 px, 70×49) pour une bbox naïve de 1325×566 ;
CN 529 composantes (cœur 30 358 px) pour 2047×523 ; US 116, JP 34.
Masques vides ou quasi vides : SM 0 px, NR 0, TV 0, AD 0, MC 1, MT 3, LI 4.

---

## M11-01 — Palette figée à 10 codes, divergente des 196 du JSON

- **Preuve** : `globe-reveal.js:11–22` déclare `PALETTE` en dur pour FR, GB, US, DE, IT, ES, CN, IN, JP, EG ; `globe-palette.json:1–1574` en contient 196, générés par la règle exacte `rgb = (24+40·⌊i/36⌋, 24+40·(⌊i/6⌋ mod 6), 24+40·(i mod 6))` (vérifié sur 196/196 entrées). `maskFor()` `:106–107` renvoie `null` pour tout code absent, donc `hover()` `:200–202` masque l'overlay et `reveal()` `:221` ne fait rien. Toute extension du jeu de pays casse silencieusement la découpe.
- **Solution** : `M11.js` embarque la liste ordonnée des 196 codes et la règle de couleur, sans `fetch`, et expose `rgbFor(code)` ; le masque est calculable pour n'importe quel code de la palette, indépendamment des 10 pays du `DATASET`.
- **Impact** : la couverture du masque suit le JSON canonique ; plus de dépendance à une copie partielle et non vérifiée.
- **Risque** : duplication de la palette (chantier M03) → miroir interne, documenté, aucun fichier partagé modifié ; la règle arithmétique est vérifiable en une ligne.
- **Effort** : S.
- **Vérification** : `VECTEMPOREL_M11.paletteSize === 196` ; `VECTEMPOREL_M11.rgbFor('FR')` = `[184,64,104]` ; `rgbFor('VU')` = `[224,104,144]`.

## M11-02 — Tolérance cubique ±18 : attribution au mauvais pays

- **Preuve** : `globe-reveal.js:23` fixe `TOLERANCE = 18` et `:125–127` teste chaque canal indépendamment. Or 79 % des pixels de la texture sont hors palette (bords dégradés). Un pixel de bord de FR mélangé à 85 % avec un fond sombre vaut environ `[156,54,88]` : il est à 12/10/16 de `[144,64,104]` (TJ, indice 116) et passe donc le filtre cubique **pour le mauvais code**. La boîte ±18 accepte aussi des points à 31 de distance euclidienne.
- **Solution** : dans le laboratoire M11, chaque pixel est d'abord attribué à la couleur de palette la plus proche par arrondi sur la grille 6×6×6 (O(1)), puis accepté seulement si cette couleur est le code visé et si la distance euclidienne est ≤ tolérance. Un compteur `nearMiss` mesure précisément les pixels que l'ancienne règle attribuerait à tort ; la tolérance devient réglable (8/18/28).
- **Impact** : disparition des franges colorées empruntées à un pays voisin ; l'effet de la tolérance devient mesurable au lieu d'être une constante magique.
- **Risque** : un seuil trop serré rogne les bords dégradés → compensation par le lissage doux de M11-03 et par le choix de 18 par défaut.
- **Effort** : M.
- **Vérification** : `VECTEMPOREL_M11.debug('FR',18)` renvoie `nearMiss` ; `debug('FR',8)` donne un `nearMiss` plus faible et un `pixels` plus petit ; aucun pixel accepté dont la couleur la plus proche n'est pas FR.

## M11-03 — Bords binaires 0/255 : crénelure au zoom ×7

- **Preuve** : `globe-reveal.js:124–133` écrit un alpha strictement 0 ou 255, sans couverture partielle ni filtre ; `:229–233` agrandit ensuite la figure par `scale(7)`. Chaque marche d'escalier du contour devient un bloc visible de 7 px et le drapeau semble déchiré.
- **Solution** : estimation d'une couverture continue `1 - (distance - cœur)/(tolérance - cœur)`, pondérée par l'alpha source, puis flou séparable 3×3 `[1,2,1]/4` sur la zone recadrée, avec maintien à 255 du cœur déjà opaque (rayon ≤ 1 px, aucune bibliothèque).
- **Impact** : contour lisse à l'agrandissement, sans débord d'un pixel sur les pays voisins.
- **Risque** : sur-lissage des petits pays → le noyau reste 3×3 et le cœur n'est jamais atténué ; le repli de M11-06 court-circuite le filtre pour les masques quasi vides.
- **Effort** : M.
- **Vérification** : l'aperçu `#monde-m11-preview` présente des valeurs d'alpha intermédiaires sur le bord ; `debug('FR',18).crop` reste très inférieur à 2048×1024 après recadrage et lissage.

## M11-04 — Masque non recadré : silhouette noyée dans 2048×1024

- **Preuve** : `globe-reveal.js:111–138` construit un masque aux dimensions pleines de l'image, tandis que `:72–74` étire la figure 2:1 et le drapeau en `background-size:cover`. Le cœur de FR occupe 70×49 px sur 2048×1024, soit 0,16 % de la surface : le drapeau découpé est un filament et `:229–233` zoome sur le centre de la figure, pas sur le pays.
- **Solution** : calcul d'une boîte englobante sur les composantes retenues, marge de 2 px, découpe du tampon d'alpha à cette boîte ; l'aperçu M11 aligne drapeau et masque sur le même rectangle, l'API expose `bbox` et `crop`.
- **Impact** : le drapeau remplit réellement le contour et le point de zoom est le pays, pas le milieu de l'océan.
- **Risque** : pays très étendus (RU, États-Unis) → la boîte peut rester large ; c'est le reflet fidèle de la géographie, et M11-05 limite la dérive aux seules composantes significatives.
- **Effort** : M.
- **Vérification** : `debug('FR',18).crop` ≈ `[359,281]` (deux composantes retenues) contre `[2048,1024]` pour l'ancien masque ; les attributs `data-m11-code` et `aria-label` de l'aperçu suivent le pays courant.

## M11-05 — Territoires disjoints non filtrés (50 composantes pour FR)

- **Preuve** : mesures sur `globe-pick.png` : FR = 50 composantes connexes, CN = 529, US = 116, JP = 34. La palette colore les territoires éloignés (outre-mer, Alaska, îles) et les résidus d'anti-aliasing. Une bbox naïve pour FR passe de 70×49 (cœur) à 1325×566 ; pour CN, de 348×189 à 2047×523.
- **Solution** : parcours en largeur 4-connexe sur le tampon d'alpha (tableaux de travail réutilisés, une seule passe), tri par aire, conservation des composantes d'aire ≥ `max(24, 2 % du cœur)` et au plus 6 ; publication des comptes `components`, `kept`, `ignored`.
- **Impact** : la découpe suit le territoire principal ; les archipels restent représentés, les bruits de compression disparaissent.
- **Risque** : supprimer un territoire légitime (îles) → seuil à 2 % du cœur et plafond de 6 composantes, explicites dans les statistiques.
- **Effort** : M.
- **Vérification** : `debug('FR',18)` donne `components ≈ 50`, `kept` entre 1 et 6, `ignored = components - kept` ; `debug('CN',18).kept === 1` ; `debug('US',18).kept >= 2` (cœur + Alaska).

## M11-06 — Pays minuscules : masque vide, révélation invisible

- **Preuve** : à tolérance 18, SM, NR, TV et AD ont **0 pixel** dans `globe-pick.png`, MC 1, MT 3, LI 4. `maskFor()` renvoie pourtant une dataURL valide entièrement transparente ; `show()` (`globe-reveal.js:179–192`) affiche alors une légende au-dessus d'un drapeau invisible et `reveal()` zoome sur du vide.
- **Solution** : seuil `MIN_PIXELS = 24` ; en dessous, génération d'une pastille radiale 28×28 aux contours lissés, marquée `tiny`/`fallback`, avec le nombre réel de pixels conservé dans les statistiques et une annonce `role="status"`.
- **Impact** : jamais de révélation fantôme ; l'utilisateur voit un état explicite et l'aire réelle est mesurable.
- **Risque** : pastille trop généreuse pour un pays réellement petit → seuil bas (24 px) et la pastille porte la couleur exacte du pays, pas un drapeau inventé.
- **Effort** : S.
- **Vérification** : `debug('SM',18).fallback === true` et `.pixels === 0` ; `debug('FR',18).fallback === false` ; `host.dataset.m11Tiny` suit l'état courant.

## M11-07 — Cache non borné, dataURL pleine taille, échecs rejoués

- **Preuve** : `globe-reveal.js:30` `masks = new Map()` sans limite, `:135–136` y stocke une dataURL PNG 2048×1024 par code, soit jusqu'à 196 entrées ; `:90–99` garde un `pickPromise` rejeté pour toujours, si bien qu'un chargement raté rejoue à chaque survol.
- **Solution** : texture source décodée une seule fois, tampon d'alpha **recadré** stocké par entrée, LRU de 12 clés `code|tolérance` (accès = suppression puis réinsertion), état d'échec conservé dans `pickState`.
- **Impact** : mémoire bornée (moins de 1 Mo pour le cache des masques), aucun recalcul inutile, aucun ré-essai infini.
- **Risque** : éviction pendant un survol rapide → le seuil 12 dépasse largement le nombre de pays visités ; le recalcul reste local et asynchrone.
- **Effort** : M.
- **Vérification** : `VECTEMPOREL_M11.state().cache <= 12` ; deux appels `debug('FR',18)` donnent `cached === true` au second ; `state().pick === 'error'` après échec, sans rechargement.

## M11-08 — Jetons survol/révélation confondus : masque périmé

- **Preuve** : `globe-reveal.js:196–211` protège `hover()` par `hoverToken`, mais `:219–237` réutilise le même compteur pour `reveal()` sans garde propre sur le résultat de `maskFor()` : deux révélations rapprochées, ou un survol survenu pendant le chargement, peuvent appliquer le contour d'un pays obsolète à la figure en cours de zoom.
- **Solution** : le pipeline M11 tient deux séquences indépendantes (`hoverSeq`, `revealSeq`), incrémente la séquence concernée à chaque évènement, annule les deux sur `onLeave`, et ne peint l'aperçu que si le numéro capturé est toujours courant au moment de la résolution. Les constructions sont coalescées en une seule `requestAnimationFrame`.
- **Impact** : le contour affiché correspond toujours au pays courant, même sous survol rapide.
- **Risque** : annuler une transition déjà lancée par `globe-reveal.js` → M11 ne pilote pas cette animation (fichier non possédé) ; la garde s'applique à son aperçu et l'état `seq` est exposé pour coordination.
- **Effort** : S.
- **Vérification** : survols successifs FR → DE → FR puis `onLeave` : un seul aperçu peint, celui de FR ; `state().code` est `null` après `onLeave`.

## M11-09 — Échec de texture silencieux, sans statut ni repli

- **Preuve** : `globe-reveal.js:90–99` rejette sur `image.onerror` ; `:208–210` et `:236` se contentent de retirer `is-visible`. Aucun `role="status"`, aucun message, aucun repli : l'utilisateur voit disparaître le drapeau sans explication.
- **Solution** : le laboratoire M11 maintient `data-m11="idle|loading|ready|error"` sur le host, un `role="status" aria-live="polite"` avec le texte d'état, un unique `ctx.say` par transition d'état (garde `announced`), et le masque de repli de M11-06 pour le pays courant.
- **Impact** : défaillance explicite, audible, et contour toujours visible.
- **Risque** : double annonce avec la live region du globe → une seule annonce par changement d'état, jamais sur un simple survol nominal.
- **Effort** : S.
- **Vérification** : en simulant `globe-pick.png` absent, `#monde-m11-status` contient « Texture de picking indisponible », `host.dataset.m11 === 'error'` et `say` est appelé une seule fois.

## M11-10 — Aucune observabilité du masque

- **Preuve** : `globe-reveal.js:240–246` n'expose que `hover`, `leave`, `reveal`, `current`, `isRevealing` : ni tolérance, ni aire, ni boîte, ni état du cache, ni compte de composantes. Impossible de vérifier les neuf autres chantiers sans instrumenter le fichier.
- **Solution** : `window.VECTEMPOREL_M11` avec `state()`, `debug(code, tol)`, `rgbFor(code)`, `setTolerance(tol)` et `paletteSize` ; panneau unique `#monde-m11-panel` avec statistiques en `role="status"`, aperçu canvas légendé et `radiogroup` de tolérance (choix unique → `aria-checked`, pas `aria-pressed`), navigation par flèches/Début/Fin.
- **Impact** : la qualité du masque devient mesurable, réglable et vérifiable par l'agent maître comme par la personne.
- **Risque** : API globale supplémentaire → objet minimal, créé une seule fois ; panneau avec garde d'existence et IDs uniques, réutilisé à chaque re-render.
- **Effort** : S.
- **Vérification** : `node --check src/views/monde/M11.js` ; un seul `<style id="monde-m11">` et un seul `#monde-m11-panel` après trois rendus ; flèche droite dans le `radiogroup` fait passer la tolérance de 18 à 28 et recalcule l'aperçu.

---

## État d'implémentation et coordination

Les 10 chantiers sont implémentés dans `src/views/monde/M11.js` uniquement. Le CSS est injecté par `ctx.css('monde-m11', …)` ; le panneau, ses trois contrôles et ses gardes d'existence vivent dans ce module. Aucun sélecteur utilisé par les tests (`.globe-list button`, `.globe-country`, `#globe-reveal`, `.event-card`) n'est modifié.

Points à coordonner avec l'agent maître :

1. `globe-reveal.js` (non possédé) continue d'utiliser sa propre `PALETTE` de 10 codes et son masque pleine taille ; M11 fournit un pipeline corrigé et autonome, mais ne substitue pas l'overlay existant.
2. M11-08 suppose une garde équivalente côté `reveal()` de `globe-reveal.js` pour la figure animée : l'état `seq` est exposé à cette fin.
3. Le `radiogroup` de tolérance est propre à M11 ; si un autre greffon pilote la tolérance, passer par `VECTEMPOREL_M11.setTolerance()`.

## Vérifications

- `node --check src/views/monde/M11.js` : **PASS**.
- Aucune autre commande de vérification n'a été lancée, conformément à la consigne de la lentille.
