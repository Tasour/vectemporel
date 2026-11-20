import { register } from './registry.js';

/* V2 lentille E056 — Mobilité et reflow responsive (complément de la passe 1).
   Dix chantiers V2 neufs, distincts de ceux de la passe 1 (dvh, zones sûres,
   paysage deux colonnes, densité ≤ 360 px, espacement clamp, ordre des boutons,
   ratio 21/9, confinement horizontal, progression sticky, retour tactile) :
     01 bandeau de situation chiffré, dérivé du DOM réel ;
     02 plancher tactile de 36 px sur TOUS les contrôles, filtres compris ;
     03 barre d'outils sans débordement horizontal sur reflow ;
     04 fil en grille compacte sur reflow moyen (621–1000 px) ;
     05 défilement à inertie et confinement de la chaîne de scroll ;
     06 cassure des mots longs sans perte de texte ;
     07 commandes en grille sur très petit écran (≤ 360 px) ;
     08 média borné en svh en colonne unique portrait ;
     09 padding de défilement pour les ancrages du fil ;
     10 régime court piloté par matchMedia (hauteur ≤ 480 px).
   Préfixes : classes recit-v2-e056-, ids DOM v2-e056-, attributs data-v2-e056-.
   Un seul register, une seule feuille injectée une fois par cssOnce. Zéro réseau,
   zéro console, zéro aléa. Greffon non destructif : sans lui la vue reste lisible. */

const REQUETE_COLONNE = '(max-width:1000px)';
const REQUETE_COURT = '(max-height:480px)';

/* Une seule feuille, un seul appel, toutes les règles regroupées ci-dessous. */
const CSS = `
/* E056-01 — Bandeau de situation chiffré, valeurs lues dans le DOM réel. */
.recit-v2-e056-lisible .recit-v2-e056-situation{
  margin:6px 0 0;color:var(--ink-soft);font-size:10px;line-height:1.5;
  font-variant-numeric:tabular-nums;transition:opacity .2s linear
}
.recit-v2-e056[data-v2-e056-motion="reduce"] .recit-v2-e056-situation{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e056-situation{transition:none}}

/* E056-02 — Plancher tactile de 36 px sur tous les contrôles, filtres inclus. */
.recit-v2-e056-tactile .recit-actions button,
.recit-v2-e056-tactile .c3a-filter,
.recit-v2-e056-tactile .c3a-reset,
.recit-v2-e056-tactile .recit-trace summary,
.recit-v2-e056-tactile .c3a-search,
.recit-v2-e056-tactile .recit-thread-item{min-height:36px}

/* E056-03 — Barre d'outils sans débordement horizontal sur reflow. */
@media (max-width:1000px){
  .recit-v2-e056-outils .c3a-search{min-width:0;width:100%;flex:1 1 100%}
  .recit-v2-e056-outils .c3a-group{min-width:0;flex-wrap:wrap}
  .recit-v2-e056-outils .c3a-group-label{white-space:normal}
  .recit-v2-e056-outils .c3a-tools{min-width:0;max-width:100%}
}

/* E056-04 — Fil en grille compacte sur le reflow moyen (621–1000 px). */
@media (min-width:621px) and (max-width:1000px){
  .recit-v2-e056-filgrille .recit-thread-list{
    display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px
  }
  .recit-v2-e056-filgrille .recit-thread-item{width:100%;white-space:normal}
}

/* E056-05 — Défilement à inertie et confinement de la chaîne de scroll. */
.recit-v2-e056-inertie{-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain}

/* E056-06 — Cassure des mots longs, sans effacer ni tronquer le texte. */
.recit-v2-e056-cassure .recit-title,
.recit-v2-e056-cassure .recit-meta,
.recit-v2-e056-cassure .recit-context,
.recit-v2-e056-cassure .recit-thread-item,
.recit-v2-e056-cassure .recit-legend p{overflow-wrap:anywhere}

/* E056-07 — Commandes en grille sur très petit écran (≤ 360 px). */
@media (max-width:360px){
  .recit-v2-e056-cmdgrille .recit-actions{
    display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px
  }
  .recit-v2-e056-cmdgrille .recit-actions button{
    width:100%;padding:6px 4px;white-space:normal
  }
}

/* E056-08 — Média borné en svh en colonne unique portrait (écran court). */
@media (max-width:1000px) and (orientation:portrait){
  .recit-v2-e056-media .recit-media{max-height:26vh;max-height:26svh;min-height:0}
  .recit-v2-e056-media .recit-media img{height:100%;object-fit:cover}
}

/* E056-09 — Padding de défilement pour les ancrages du fil. */
.recit-v2-e056-ancrespad{scroll-padding-top:16px;scroll-padding-bottom:72px}

/* E056-10 — Régime court piloté : resserrement du rythme secondaire. */
.recit-v2-e056-court .recit-body .view-kicker{margin-top:4px}
.recit-v2-e056-court .recit-body .recit-timing{margin-top:2px}
.recit-v2-e056-court .recit-body .c3a-tools{margin:6px 0 4px}
.recit-v2-e056-court .recit-body .c3a-status{margin-bottom:4px}
.recit-v2-e056-court .recit-body .recit-legend{margin-top:8px;padding-top:6px}
`;

let ecouteInstallee = false;

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && typeof noeud.classList.contains === 'function'
      && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function retireClasse(noeud, nom) {
  if (noeud && noeud.classList && typeof noeud.classList.remove === 'function'
      && noeud.classList.contains(nom)) noeud.classList.remove(nom);
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

function lireTexte(noeud) {
  return noeud && typeof noeud.textContent === 'string' ? noeud.textContent : '';
}

/* Insère un nœud juste après une ancre, sans le déplacer inutilement. */
function placeApres(noeud, ancre, parent) {
  if (!noeud || !parent || typeof parent.insertBefore !== 'function') return;
  const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
}

/* Applique toutes les lentilles sur une racine. Idempotent : les classes et le
   texte du bandeau sont réécrits à l'identique à chaque rendu. */
function appliquerSur(racine, el) {
  if (!racine || typeof racine.querySelector !== 'function') return;
  const corps = racine.querySelector('.recit-body');
  if (!corps) return;

  ajouteClasse(racine, 'recit-v2-e056');        /* garde-fou des règles */
  ajouteClasse(racine, 'recit-v2-e056-tactile'); /* E056-02 */
  ajouteClasse(racine, 'recit-v2-e056-media');   /* E056-08 */
  ajouteClasse(corps, 'recit-v2-e056-lisible');  /* E056-01 */
  ajouteClasse(corps, 'recit-v2-e056-outils');   /* E056-03 */
  ajouteClasse(corps, 'recit-v2-e056-filgrille');/* E056-04 */
  ajouteClasse(corps, 'recit-v2-e056-inertie');  /* E056-05 */
  ajouteClasse(corps, 'recit-v2-e056-cassure');  /* E056-06 */
  ajouteClasse(corps, 'recit-v2-e056-cmdgrille');/* E056-07 */
  ajouteClasse(corps, 'recit-v2-e056-ancrespad');/* E056-09 */

  const kicker = corps.querySelector('.view-kicker');
  const fil = (typeof document !== 'undefined' && document.getElementById('c3a-thread'))
    || corps.querySelector('.recit-thread-list');
  const items = fil && typeof fil.querySelectorAll === 'function'
    ? Array.prototype.slice.call(fil.querySelectorAll('.recit-thread-item')) : [];

  const colonne = correspond(REQUETE_COLONNE);
  const court = correspond(REQUETE_COURT);

  /* E056-01 — chaque nombre est lu : mode issu de matchMedia, count du fil,
     étape/total du kicker « Étape X / Y ». Aucune valeur inventée. */
  let readout = typeof document !== 'undefined' ? document.getElementById('v2-e056-situation') : null;
  if (!readout && typeof el === 'function') {
    readout = el('p', 'recit-v2-e056-situation');
    readout.id = 'v2-e056-situation';
  }
  if (readout) {
    const morceaux = [`Régime : ${colonne ? 'une colonne' : 'deux colonnes'}`];
    if (items.length) {
      const pluriel = items.length > 1 ? 's' : '';
      morceaux.push(`fil : ${items.length} point${pluriel} affiché${pluriel}`);
    }
    const trouv = lireTexte(kicker).match(/Étape\s+(\d+)\s*\/\s*(\d+)/i);
    if (trouv) morceaux.push(`étape ${trouv[1]} / ${trouv[2]}`);
    readout.textContent = `${morceaux.join(' · ')}.`;
    placeApres(readout, kicker, corps);
  }

  /* E056-10 — la classe et le miroir découlent de la requête de hauteur. */
  if (court) ajouteClasse(racine, 'recit-v2-e056-court');
  else retireClasse(racine, 'recit-v2-e056-court');
  if (typeof racine.setAttribute === 'function') {
    racine.setAttribute('data-v2-e056-regime', `colonnes:${colonne ? 1 : 0} court:${court ? 1 : 0}`);
  }
}

/* Écoute installée une seule fois ; la coque reconstruisant le DOM, on
   réinterroge le document à chaque changement de format. */
function installerEcoute() {
  if (ecouteInstallee || typeof window === 'undefined'
      || typeof window.matchMedia !== 'function') return;
  ecouteInstallee = true;
  const reevaluer = () => {
    if (typeof document === 'undefined') return;
    const racines = document.querySelectorAll('.recit-layout.recit-v2-e056');
    Array.prototype.slice.call(racines).forEach((racine) => appliquerSur(racine, null));
  };
  [REQUETE_COLONNE, REQUETE_COURT].forEach((requete) => {
    try {
      const req = window.matchMedia(requete);
      if (typeof req.addEventListener === 'function') req.addEventListener('change', reevaluer);
      else if (typeof req.addListener === 'function') req.addListener(reevaluer);
    } catch {
      /* Requête non prise en charge : simplement inactive, jamais d'exception. */
    }
  });
}

register('E056', (ctx) => {
  try {
    if (!ctx) return;
    const { layout, stage, css, el, reducedMotion } = ctx;
    if (typeof css === 'function') css('recit-v2-e056', CSS);
    const racine = (layout && typeof layout.querySelector === 'function') ? layout
      : (stage && typeof stage.querySelector === 'function' ? stage : null);
    if (!racine) return;

    let reduit = false;
    try { reduit = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
    catch { reduit = false; }
    if (typeof racine.setAttribute === 'function') {
      racine.setAttribute('data-v2-e056-motion', reduit ? 'reduce' : 'normal');
    }

    appliquerSur(racine, el);
    installerEcoute();
  } catch {
    /* Une lentille défaillante ne doit jamais interrompre le rendu de la vue. */
  }
});
