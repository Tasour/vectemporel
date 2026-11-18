import { register } from './registry.js';

/* Lentille E056 — Mobile et reflow responsive (vue Récit).
 *
 * Dix chantiers concrets et distincts, E056-01 … E056-10, tous implémentés
 * dans CE seul module :
 *   01 hauteur dynamique du viewport (dvh) ;
 *   02 zones sûres des écrans à encoche (env(safe-area-inset-*)) ;
 *   03 reflow paysage : retour à deux colonnes quand la largeur le permet ;
 *   04 reflow très étroit (≤ 360 px) : densité compacte sans perte de texte ;
 *   05 échelle d'espacement fluide (clamp) au lieu de marges fixes ;
 *   06 priorité des commandes essentielles par ordre sur petit écran ;
 *   07 ratio d'image adapté au passage en colonne unique ;
 *   08 confinement horizontal (min-width / overflow) anti-débordement ;
 *   09 progression ancrée en haut et marges d'ancre de lecture ;
 *   10 retour tactile sobre, sélection lisible et mouvement réduit.
 *
 * Greffon strictement non destructif : aucun nœud créé ni retiré, aucun texte
 * réécrit, aucun écouteur sur les contrôles existants. Seules des classes
 * préfixées recit-e056- et un attribut de données préfixé data-e056- sont
 * ajoutés. Sans JavaScript, la vue Récit reste intégralement lisible.
 * Les identifiants DOM sont soit existants (non modifiés), soit inexistants
 * (E056 n'en crée aucun) : aucune collision possible.
 *
 * Rapport : UNIFIED_AUDIT/RECIT/views/E056.md.
 */

const REGIME = 'data-e056-regime';
const REQUETE_PAYSAGE = '(orientation: landscape) and (min-width: 620px) and (max-height: 560px)';
const REQUETE_ETROIT = '(max-width: 360px)';

/* Une seule feuille, un seul appel css('recit-e056', …), toutes les règles.
   Aucune règle universelle, aucune image, aucune police ni ressource distante. */
const CSS = `
/* E056-01 — hauteur dynamique : le navigateur mobile masque sa barre d'adresse. */
@media (max-width:1000px){
  .recit-e056.recit-e056-viewport{height:100vh;height:100dvh}
}

/* E056-02 — zones sûres : encoches, coins arrondis et barre système. */
@media (max-width:620px){
  .recit-e056 .recit-e056-safe{
    padding-right:max(12px,env(safe-area-inset-right));
    padding-left:max(12px,env(safe-area-inset-left))
  }
  .recit-e056 .recit-e056-corps.recit-e056-safe{
    padding-top:max(10px,env(safe-area-inset-top));
    padding-bottom:max(64px,env(safe-area-inset-bottom))
  }
  .recit-e056 .recit-e056-commandes.recit-e056-safe{
    padding-right:env(safe-area-inset-right);
    padding-left:env(safe-area-inset-left)
  }
}

/* E056-05 — espacement fluide : la verticalité suit la largeur disponible. */
.recit-e056 .recit-e056-rythme .recit-title{margin-bottom:clamp(8px,2.2vw,14px)}
.recit-e056 .recit-e056-rythme .recit-context{margin-bottom:clamp(10px,2.6vw,18px)}
.recit-e056 .recit-e056-rythme .recit-thread{margin-bottom:clamp(10px,3vw,18px)}
.recit-e056 .recit-e056-rythme .recit-actions{margin-top:clamp(12px,3.4vw,24px)}
.recit-e056 .recit-e056-rythme .recit-legend{
  margin-top:clamp(10px,2.8vw,16px);padding-top:clamp(8px,2vw,12px)
}

/* E056-06 — priorité des commandes : précédent/suivant d'abord sur petit écran.
   Aucun bouton n'est retiré ; seul l'ordre d'affichage change. */
@media (max-width:620px){
  .recit-e056 .recit-e056-commandes{gap:4px}
  .recit-e056 .recit-e056-commandes button[data-fk="c3a-prev"]{order:-2}
  .recit-e056 .recit-e056-commandes button[data-fk="c3a-next"]{order:-1}
  .recit-e056 .recit-e056-commandes button[data-fk="c3a-play"]{order:0}
  .recit-e056 .recit-e056-commandes button[data-fk="c3a-restart"]{order:1}
  .recit-e056 .recit-e056-commandes button[data-fk="c3a-next-event"]{order:2}
  .recit-e056 .recit-e056-commandes button[data-fk="c3a-chrono"]{order:3}
}

/* E056-07 — ratio du média en colonne unique : la ligne devient auto, l'image
   garde un format prévisible et le texte récupère la hauteur restante. */
@media (max-width:1000px){
  .recit-e056.recit-e056-ratio{grid-template-rows:auto minmax(0,1fr)}
  .recit-e056 .recit-e056-media{aspect-ratio:21/9;min-height:0}
  .recit-e056 .recit-e056-media img{width:100%;height:100%;object-fit:cover}
  .recit-e056 .recit-e056-media .media-empty{height:100%}
}

/* E056-03 — paysage court : on rétablit deux colonnes (média étroit, récit large).
   Ce bloc vient après E056-07 : en paysage, c'est lui qui commande la grille. */
@media (orientation:landscape) and (min-width:620px) and (max-height:560px){
  .recit-e056.recit-e056-paysage{
    grid-template-columns:minmax(0,34%) minmax(0,66%);
    grid-template-rows:minmax(0,1fr)
  }
  .recit-e056.recit-e056-paysage .recit-e056-media{min-height:0;height:100%}
  .recit-e056.recit-e056-paysage .recit-e056-corps{padding-top:10px;padding-bottom:46px}
}

/* E056-04 — très petit téléphone (≤ 360 px) : densité resserrée, textes conservés. */
@media (max-width:360px){
  .recit-e056.recit-e056-etroit .recit-e056-corps{padding-right:10px;padding-left:10px}
  .recit-e056.recit-e056-etroit .recit-title{font-size:clamp(22px,6vw,30px)}
  .recit-e056.recit-e056-etroit .recit-conf{white-space:normal}
  .recit-e056.recit-e056-etroit .recit-timing,
  .recit-e056.recit-e056-etroit .recit-legend{font-size:10px}
  .recit-e056.recit-e056-etroit .recit-e056-commandes{gap:3px}
}

/* E056-08 — confinement : aucun contenu long ne peut élargir la vue. */
.recit-e056.recit-e056-clip{overflow-x:clip}
.recit-e056 .recit-e056-clip{min-width:0;overflow-x:hidden}
.recit-e056 .recit-e056-fil{min-width:0;max-width:100%}

/* E056-09 — progression ancrée en haut du bloc lisant et marges d'ancre. */
@media (max-width:620px){
  .recit-e056 .recit-e056-progress{
    position:sticky;top:0;z-index:2;margin-top:-2px;
    background-color:rgba(8,11,18,.96)
  }
}
.recit-e056 .recit-e056-ancre{
  scroll-margin-top:calc(10px + env(safe-area-inset-top));
  scroll-margin-bottom:72px
}

/* E056-10 — retour tactile sobre, sélection lisible, mouvement maîtrisé. */
.recit-e056.recit-e056-tactile button,
.recit-e056.recit-e056-tactile summary,
.recit-e056.recit-e056-tactile input,
.recit-e056.recit-e056-tactile [tabindex]{-webkit-tap-highlight-color:transparent}
.recit-e056.recit-e056-tactile ::selection{background:rgba(230,185,111,.28);color:var(--ink)}
.recit-e056.recit-e056-anime .recit-e056-progress>span{transition:width .2s ease}
@media (prefers-reduced-motion:reduce){
  .recit-e056 .recit-e056-progress>span{transition:none !important}
}
`;

let ecouteInstallee = false;
let mouvementReduit = false;

function un(racine, selecteur) {
  return racine && typeof racine.querySelector === 'function'
    ? racine.querySelector(selecteur)
    : null;
}

function tous(racine, selecteur) {
  return racine && typeof racine.querySelectorAll === 'function'
    ? Array.prototype.slice.call(racine.querySelectorAll(selecteur))
    : [];
}

/* Ajoute une classe sans jamais écraser une classe existante. */
function classe(noeud, nom) {
  if (noeud && noeud.classList && typeof noeud.classList.add === 'function'
      && typeof noeud.classList.contains === 'function'
      && !noeud.classList.contains(nom)) {
    noeud.classList.add(nom);
  }
}

function correspond(requete) {
  try {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia(requete).matches === true;
  } catch {
    return false;
  }
}

/* Recalcule les deux régimes de format sur toutes les racines présentes et
   écrit un miroir compact, sans créer ni supprimer le moindre nœud. */
function appliquerRegimes() {
  if (typeof document === 'undefined') return;
  const paysage = correspond(REQUETE_PAYSAGE);
  const etroit = correspond(REQUETE_ETROIT);
  const miroir = `paysage:${paysage ? 1 : 0} etroit:${etroit ? 1 : 0} mouvement:${mouvementReduit ? 'reduce' : 'normal'} css:1`;
  tous(document, '.recit-e056').forEach((racine) => {
    if (paysage) classe(racine, 'recit-e056-paysage');
    else if (racine.classList && typeof racine.classList.remove === 'function') {
      racine.classList.remove('recit-e056-paysage');
    }
    if (etroit) classe(racine, 'recit-e056-etroit');
    else if (racine.classList && typeof racine.classList.remove === 'function') {
      racine.classList.remove('recit-e056-etroit');
    }
    if (typeof racine.getAttribute === 'function'
        && typeof racine.setAttribute === 'function'
        && racine.getAttribute(REGIME) !== miroir) {
      racine.setAttribute(REGIME, miroir);
    }
  });
}

/* L'écoute est installée une seule fois pour la durée de la page ; la coque
   reconstruisant le DOM, on interroge le document à chaque changement. */
function installerRegimes() {
  if (ecouteInstallee || typeof window === 'undefined'
      || typeof window.matchMedia !== 'function') return;
  ecouteInstallee = true;
  [REQUETE_PAYSAGE, REQUETE_ETROIT].forEach((requete) => {
    try {
      const req = window.matchMedia(requete);
      if (typeof req.addEventListener === 'function') req.addEventListener('change', appliquerRegimes);
      else if (typeof req.addListener === 'function') req.addListener(appliquerRegimes);
    } catch {
      /* Une requête media non prise en charge reste simplement inactive. */
    }
  });
}

register('E056', (ctx) => {
  try {
    if (!ctx) return;
    const { stage, layout, css, el, reducedMotion } = ctx;
    void el; /* E056 ne crée aucun nœud : aucun identifiant DOM introduit. */

    const racine = layout && typeof layout.querySelector === 'function'
      ? layout
      : (stage && typeof stage.querySelector === 'function' ? stage : null);
    if (!racine) return;

    if (typeof css === 'function') css('recit-e056', CSS);
    classe(racine, 'recit-e056');
    classe(racine, 'recit-e056-viewport');   /* E056-01 */
    classe(racine, 'recit-e056-ratio');      /* E056-07 */
    classe(racine, 'recit-e056-clip');       /* E056-08 */
    classe(racine, 'recit-e056-tactile');    /* E056-10 */

    try {
      mouvementReduit = Boolean(reducedMotion && typeof reducedMotion === 'function' && reducedMotion());
    } catch {
      mouvementReduit = false;
    }
    if (!mouvementReduit) classe(racine, 'recit-e056-anime');

    const corps = un(racine, '.recit-body');
    classe(corps, 'recit-e056-corps');
    classe(corps, 'recit-e056-safe');    /* E056-02 */
    classe(corps, 'recit-e056-rythme');  /* E056-05 */
    classe(corps, 'recit-e056-clip');    /* E056-08 */

    classe(un(racine, '.recit-media'), 'recit-e056-media');       /* E056-07 */
    classe(un(racine, '.recit-thread-list'), 'recit-e056-fil');   /* E056-08 */
    classe(un(racine, '.recit-progress'), 'recit-e056-progress'); /* E056-09 */
    classe(un(racine, '.recit-actions'), 'recit-e056-commandes'); /* E056-06 */
    classe(un(racine, '.recit-actions'), 'recit-e056-safe');      /* E056-02 */
    classe(un(racine, '#recit-point-title') || un(racine, '.recit-title'), 'recit-e056-ancre');
    classe(un(racine, '#recit-context') || un(racine, '.recit-context'), 'recit-e056-ancre');

    installerRegimes();
    appliquerRegimes();
  } catch {
    /* Une lentille défaillante ne doit jamais interrompre le rendu de la vue. */
  }
});
