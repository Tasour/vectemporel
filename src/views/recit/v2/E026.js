import { register } from './registry.js';

/* V2 lentille E026 — Mobile et reflow responsive (second regard).
 *
 * La passe 1 (`src/views/recit/E026.js`) a traité les zones sûres, la hauteur
 * dynamique `dvh`, la grille intermédiaire, le carrousel horizontal du fil, le
 * retour en haut, le badge de format, le zoom iOS, le débordement des libellés,
 * le rythme vertical et le recentrage du point courant. Cette passe V2 ne
 * reprend aucun de ces chantiers : elle s'attaque aux angles encore non couverts
 * du même thème — pointeur grossier et cibles tactiles, survols indisponibles,
 * geste de glissement, information de cadrage de l'image, écran court en
 * paysage, mesure de lecture, libellés de certitude, ancrage de défilement,
 * état d'orientation et barre d'actions sur écran très étroit.
 *
 * Un seul enregistrement `register` (identifiant `E026`) et un seul appel `css`
 * (identifiant `recit-v2-e026`) regroupant tout le CSS dans un template literal.
 * Classes préfixées `recit-v2-e026-`,
 * identifiant créé préfixé `v2-e026-` (`v2-e026-media-info`) et unique, jamais
 * un id de la passe 1 (`e026-…`). Passe 1 et V2 tournant sur le MÊME DOM, le
 * marqueur de portée est distinct (`recit-v2-e026-root` vs `recit-e026-root`).
 *
 * Zéro console, zéro réseau, zéro Math.random, zéro Date.now, zéro innerHTML.
 * Greffon strictement additif : aucun nœud existant n'est retiré ni réécrit,
 * aucun gestionnaire n'est ré-attribué, aucun attribut porté par la coque ou la
 * passe 1 n'est écrasé. Sans ce module le récit reste intégralement lisible.
 *
 * Les dix chantiers E026-01 … E026-10 sont détaillés dans
 * UNIFIED_AUDIT/RECIT/V2/views/E026.md.
 */

const RACINE = 'recit-v2-e026-root';
const INFO_ID = 'v2-e026-media-info';

/* Feuille unique. La plupart des règles sont de simples media queries cadrées
   par le marqueur de portée : elles ne débordent ni sur une autre vue ni sur la
   passe 1. Les sélecteurs de couleur ne portent jamais une information seule. */
const CSS = `
/* E026-01 — cibles tactives élargies sous pointeur grossier. */
@media (pointer:coarse){
  .recit-v2-e026-root .recit-v2-e026-tactile :is(.recit-thread-item,.c3a-filter,.c3a-reset,.recit-actions button){
    min-height:44px;
  }
}

/* E026-02 — survol indisponible : indices persistants en texte et glyphe. */
@media (hover:none){
  .recit-v2-e026-root .recit-v2-e026-hoverless .recit-trace summary::before{
    content:'▸ ';color:var(--gold);font-size:10px;
  }
  .recit-v2-e026-root .recit-v2-e026-hoverless .recit-v2-e026-courant::after{
    content:' ●';color:var(--gold-bright);
  }
}

/* E026-03 — geste de glissement horizontal fiable sur le fil carrousel. */
.recit-v2-e026-root .recit-v2-e026-pan.recit-thread-list{touch-action:pan-x}
@media (pointer:fine){
  .recit-v2-e026-root .recit-v2-e026-pan.recit-thread-list{touch-action:auto}
}

/* E026-04 — cadrage de l'image : information textuelle dérivée du DOM. */
.recit-v2-e026-root .recit-v2-e026-media-info{
  position:absolute;left:10px;bottom:10px;z-index:1;
  margin:0;max-width:calc(100% - 20px);padding:2px 7px;
  border-radius:5px;background:rgba(0,0,0,.55);color:rgba(255,255,255,.86);
  font-size:8px;line-height:1.4;overflow-wrap:anywhere;pointer-events:none;
}

/* E026-05 — écran court en paysage : média et rythme compactés. */
@media (orientation:landscape) and (max-height:480px){
  .recit-v2-e026-root[data-v2-e026-orientation="paysage"] .recit-media{
    min-height:64px;max-height:120px;
  }
  .recit-v2-e026-root[data-v2-e026-orientation="paysage"] .recit-body{
    padding-block:12px;
  }
}

/* E026-06 — mesure de lecture bornée sur les grands écrans. */
@media (min-width:1001px){
  .recit-v2-e026-root .recit-v2-e026-mesure.recit-body{
    max-width:74ch;margin-inline:auto;
  }
}

/* E026-07 — libellés de certitude autorisés à passer à la ligne. */
@media (max-width:620px){
  .recit-v2-e026-root .recit-v2-e026-densite :is(.recit-conf,.recit-meta){
    white-space:normal;overflow-wrap:anywhere;
  }
}

/* E026-08 — ancrage de défilement stabilisé : seules les zones instables
   sont désancrées, le corps reste en ancrage automatique. */
.recit-v2-e026-root .recit-v2-e026-ancrage > :is(.recit-progress,.recit-thread){
  overflow-anchor:none;
}
.recit-v2-e026-root .recit-v2-e026-ancrage.recit-body{overflow-anchor:auto}

/* E026-09 — état d'orientation : crochet CSS pour l'écran court (E026-05). */
.recit-v2-e026-root[data-v2-e026-orientation]{
  --v2-e026-orientation-connu:1;
}

/* E026-10 — écran très étroit : barre d'actions en colonne pleine largeur. */
@media (max-width:359px){
  .recit-v2-e026-root .recit-v2-e026-etroit.recit-actions{
    display:grid;grid-template-columns:1fr;gap:8px;
  }
  .recit-v2-e026-root .recit-v2-e026-etroit.recit-actions button{
    width:100%;min-height:44px;
  }
}
`;

/* Vrai nœud d'élément (nodeType 1) — écarte textes et commentaires. */
function present(node) {
  return !!(node && node.nodeType === 1);
}

/* Ajoute une classe sans jamais lever d'erreur si le nœud est absent. */
function marquer(node, className) {
  if (present(node) && node.classList && typeof node.classList.add === 'function') {
    node.classList.add(className);
  }
}

/* Pose un attribut data-* réservé à la lentille (jamais un id de la passe 1). */
function data(node, name, value) {
  if (!present(node) || typeof node.setAttribute !== 'function') return;
  try { node.setAttribute(`data-v2-e026-${name}`, String(value)); } catch { /* facultatif */ }
}

/* Images déjà suivies : l'écouteur `load` n'est installé qu'une fois par image,
   même si la coque reconstruit le DOM et repasse la lentille. */
const imagesSuivies = new WeakSet();

/* Contexte courant rafraîchi à chaque rendu ; les écouteurs d'orientation, eux,
   ne sont installés qu'une fois et lisent cette référence (jamais un nœud
   détaché d'un rendu précédent). */
let courant = null;
let orientationInstallee = false;

/* ---------- E026-04 : information de cadrage issue du DOM ---------- */

function renseignerMedia(root, el) {
  if (!root || typeof root.querySelector !== 'function' || typeof el !== 'function') return;
  const media = root.querySelector('.recit-media');
  if (!present(media)) return;
  if (typeof document === 'undefined') return;

  let info = document.getElementById(INFO_ID);
  if (!present(info)) {
    info = el('p', 'recit-v2-e026-media-info');
    info.id = INFO_ID;
    media.appendChild(info);
  }

  const img = media.querySelector('img');
  const ecrire = () => {
    if (!present(info)) return;
    const largeur = img ? Number(img.naturalWidth || 0) : 0;
    const hauteur = img ? Number(img.naturalHeight || 0) : 0;
    if (largeur > 0 && hauteur > 0) {
      const orientation = largeur > hauteur ? 'paysage' : (hauteur > largeur ? 'portrait' : 'carré');
      info.textContent = `Image source : ${largeur} × ${hauteur} px · ${orientation}`;
      data(media, 'ratio', `${largeur}/${hauteur}`);
    } else {
      /* Aucun chiffre inventé si l'image n'est pas encore décodée. */
      info.textContent = 'Image du repère · dimensions non disponibles';
    }
  };

  ecrire();
  if (present(img) && !img.naturalWidth && typeof img.addEventListener === 'function'
      && !imagesSuivies.has(img)) {
    imagesSuivies.add(img);
    try {
      img.addEventListener('load', ecrire, { once: true });
      img.addEventListener('error', ecrire, { once: true });
    } catch { /* information finale reste celle de l'appel initial */ }
  }
}

/* ---------- E026-09 : état d'orientation dérivé des dimensions réelles ---------- */

function appliquerOrientation() {
  const root = courant;
  if (!present(root) || typeof window === 'undefined') return;
  try {
    const largeur = Number(window.innerWidth || 0);
    const hauteur = Number(window.innerHeight || 0);
    if (largeur > 0 && hauteur > 0) {
      data(root, 'orientation', largeur > hauteur ? 'paysage' : 'portrait');
    }
  } catch { /* dimensions indisponibles : l'attribut reste non posé */ }
}

function installerOrientation() {
  if (orientationInstallee || typeof window === 'undefined'
      || typeof window.addEventListener !== 'function') return;
  orientationInstallee = true;
  try {
    window.addEventListener('orientationchange', appliquerOrientation, { passive: true });
    window.addEventListener('resize', appliquerOrientation, { passive: true });
  } catch { /* écouteurs indisponibles : l'état initial reste posé */ }
}

/* ---------- Point d'entrée unique ---------- */

register('E026', (ctx) => {
  try {
    if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
    const { layout, css, el } = ctx;
    const root = layout;

    /* Un seul bloc CSS pour toute la lentille (cssOnce garantit l'idempotence). */
    if (typeof css === 'function') {
      try { css('recit-v2-e026', CSS); } catch { /* rendu préservé coûte que coûte */ }
    }
    marquer(root, RACINE);

    /* --- E026-01 : cibles tactives ------------------------------------- */
    ['.recit-thread-list', '.c3a-tools', '.recit-actions'].forEach((selecteur) => {
      marquer(root.querySelector(selecteur), 'recit-v2-e026-tactile');
    });

    /* --- E026-02 : indices sans survol --------------------------------- */
    const corpsHover = root.querySelector('.recit-body');
    if (present(corpsHover)) {
      marquer(corpsHover, 'recit-v2-e026-hoverless');
      const items = corpsHover.querySelectorAll('.recit-thread-item');
      Array.prototype.forEach.call(items, (item) => {
        const courant = item.classList.contains('is-current')
          || item.getAttribute('aria-current') === 'step';
        if (courant) marquer(item, 'recit-v2-e026-courant');
      });
    }

    /* --- E026-03 : geste horizontal sur le fil ------------------------- */
    marquer(root.querySelector('.recit-thread-list'), 'recit-v2-e026-pan');

    /* --- E026-04 : cadrage de l'image ----------------------------------- */
    renseignerMedia(root, el);

    /* --- E026-05 : écran court en paysage (rule CSS) -------------------- */

    /* --- E026-06 : mesure de lecture ------------------------------------ */
    marquer(root.querySelector('.recit-body'), 'recit-v2-e026-mesure');

    /* --- E026-07 : libellés de certitude -------------------------------- */
    marquer(root.querySelector('.recit-body'), 'recit-v2-e026-densite');

    /* --- E026-08 : ancrage de défilement -------------------------------- */
    marquer(root.querySelector('.recit-body'), 'recit-v2-e026-ancrage');

    /* --- E026-09 : état d'orientation ----------------------------------- */
    courant = root;
    appliquerOrientation();
    installerOrientation();

    /* --- E026-10 : barre d'actions sur écran très étroit ---------------- */
    marquer(root.querySelector('.recit-actions'), 'recit-v2-e026-etroit');
  } catch { /* rendu préservé coûte que coûte */ }
});
