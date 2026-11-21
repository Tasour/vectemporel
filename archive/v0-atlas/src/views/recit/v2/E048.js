import { register } from './registry.js';

/* Lentille V2 E048 — Sobriété de rendu, passe 2.
 *
 * Même thème que la lentille passe 1 (performance et sobriété de la vue
 * Récit), mais dix chantiers neufs et distincts, centrés sur la peinture,
 * le toucher et la lecture du fil. Aucun ne recoupe la passe 1 :
 *   E048-01  décodage asynchrone de l'illustration ;
 *   E048-02  isolation de peinture du panneau média ;
 *   E048-03  rendu différé des blocs de fin ;
 *   E048-04  commandes tactiles sans délai d'attente ;
 *   E048-05  aucun surlignage tactile sur les commandes ;
 *   E048-06  libellés de commandes non sélectionnables ;
 *   E048-07  décoratif retiré du test de pointage ;
 *   E048-08  synthèse du fil lue dans le statut, sans parcourir le fil ;
 *   E048-09  aucune synthèse de glyphes par le moteur ;
 *   E048-10  portée verrouillée, ids préfixés et empreinte nulle.
 *
 * Greffon strictement non destructif : aucun texte retiré, aucun attribut
 * existant écrasé, aucun écouteur, minuteur, observateur, rAF, aléa, appel
 * réseau ni journalisation. Une seule feuille de style, un seul marqueur de
 * portée, un seul nœud de synthèse. Toutes les classes portent le préfixe
 * `recit-v2-e048-`, l'unique id de contenu créé porte le préfixe `v2-e048-`.
 * La vue reste intégralement lisible et utilisable sans ce module.
 */

const GATE = 'data-v2-e048';
const STATS_ID = 'v2-e048-fil-stats';

/* E048-09 — aucune synthèse de glyphes : règle purement déclarative, rangée
   ici dans la feuille unique et cadrée par le verrou de portée (E048-10).
   Le moteur ne fabrique pas de gras/italique approximatif : moins de shaping
   de texte sur un fil qui peut atteindre 901 libellés. */
const CSS = `
.recit-layout[data-v2-e048="on"]{
  font-synthesis:none;
}
.recit-layout[data-v2-e048="on"] .recit-v2-e048-media{
  contain:paint;
}
.recit-layout[data-v2-e048="on"] .recit-v2-e048-tail{
  content-visibility:auto;
  contain-intrinsic-size:auto 96px;
}
.recit-layout[data-v2-e048="on"] .recit-v2-e048-touch{
  touch-action:manipulation;
}
.recit-layout[data-v2-e048="on"] .recit-v2-e048-nohl{
  -webkit-tap-highlight-color:transparent;
}
.recit-layout[data-v2-e048="on"] .recit-v2-e048-noselect{
  user-select:none;
  -webkit-user-select:none;
}
.recit-layout[data-v2-e048="on"] .recit-v2-e048-decor{
  pointer-events:none;
}
.recit-layout[data-v2-e048="on"] .recit-v2-e048-stats{
  margin:10px 0 0;padding:6px 0 0;
  border-top:1px solid var(--line);
  color:var(--muted-2);font-size:8px;line-height:1.5;
}
`;

/* ---------- utilitaires de garde (aucun ne peut lever d'erreur) ---------- */

function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector)
    : null;
}

function all(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  try { return Array.prototype.slice.call(root.querySelectorAll(selector)); }
  catch { return []; }
}

function mark(node, className) {
  if (node && node.classList && typeof node.classList.add === 'function') {
    node.classList.add(className);
  }
}

function markAll(nodes, className) {
  (nodes || []).forEach((node) => mark(node, className));
}

/* Pose un attribut seulement s'il est absent : enrichissement non destructif,
   même si la passe 1 ou une autre lentille est intervenue avant nous. */
function setOnce(node, name, value) {
  if (!node || node.nodeType !== 1) return false;
  if (typeof node.hasAttribute !== 'function' || typeof node.setAttribute !== 'function') return false;
  if (node.hasAttribute(name)) return false;
  node.setAttribute(name, value);
  return true;
}

/* Isole chaque chantier : une défaillance locale est neutralisée sans jamais
   interrompre le rendu ni empêcher les neuf autres de s'appliquer. */
function safe(fn) {
  try { fn(); }
  catch { /* neutralisé : la vue reste lisible et inchangée */ }
}

/* Une seule passe de collecte, avant la moindre écriture d'attribut ou
   d'insertion. Aucune mesure de mise en page n'est répétée. */
function collecter(root) {
  const tapNodes = []
    .concat(all(root, '.recit-actions button'))
    .concat(all(root, '.c3a-filter'))
    .concat(all(root, '.c3a-reset'))
    .concat(all(root, '#c3a-thread .c3a-thread-item'));
  const selectNodes = tapNodes
    .concat(all(root, '.c3a-group-label'))
    .concat(all(root, '.thread-kind'))
    .concat(all(root, '.recit-conf'));
  const decorNodes = all(root, '.thread-kind')
    .concat(all(root, '.recit-actions [aria-hidden="true"]'));
  return {
    corps: q(root, '.recit-body'),
    image: q(root, '.recit-media img'),
    media: q(root, '.recit-media'),
    legend: q(root, '.recit-legend'),
    trace: q(root, '.recit-trace'),
    statut: q(root, '#c3a-status'),
    tapNodes,
    selectNodes,
    decorNodes,
  };
}

/* E048-01 — décodage asynchrone de l'illustration : l'image est décodée hors
   du thread principal pendant que le texte du point est peint. L'attribut
   `decoding` est posé seulement s'il manque ; `src` et `alt` ne sont jamais
   touchés, et la passe 1 (glissement, sélection) reste intacte. */
function chantier01(image) {
  setOnce(image, 'decoding', 'async');
}

/* E048-02 — isolation de peinture du panneau média : `contain: paint` confine
   les invalitations de peinture de l'illustration, de sa légende et de son
   crédit au seul panneau. Le panneau est déjà `position: relative` et
   `overflow: hidden` dans la feuille de la vue : aucun contenu n'est coupé. */
function chantier02(media) {
  mark(media, 'recit-v2-e048-media');
}

/* E048-03 — rendu différé des blocs de fin : la légende et la traçabilité
   sont en aval de la zone de lecture. `content-visibility: auto` saute leur
   mise en page et leur peinture hors écran, avec une taille intrinsèque de
   repli pour éviter tout saut de défilement. Le contenu reste dans le DOM,
   lisible, indexable et accessible : rien n'est retiré ni masqué. */
function chantier03(legend, trace) {
  mark(legend, 'recit-v2-e048-tail');
  mark(trace, 'recit-v2-e048-tail');
}

/* E048-04 — commandes tactiles sans délai : `touch-action: manipulation`
   supprime l'attente de 300 ms et le travail de détection du double-tap sur
   les six commandes, les filtres, la remise à zéro et les 901 items du fil.
   Le clavier et la navigation roulante du fil ne sont pas modifiés. */
function chantier04(nodes) {
  markAll(nodes, 'recit-v2-e048-touch');
}

/* E048-05 — aucun surlignage tactile : `-webkit-tap-highlight-color:
   transparent` évite la surcouche de surlignage que le moteur rasterise à
   chaque appui sur une commande. Propriété purement visuelle, sans effet sur
   le focus ni sur l'état `aria-pressed` porté par la coque. */
function chantier05(nodes) {
  markAll(nodes, 'recit-v2-e048-nohl');
}

/* E048-06 — libellés de commandes non sélectionnables : `user-select: none`
   sur les boutons, les étiquettes de groupe, les indicateurs de type et le
   chip de certitude. Les clics rapides ne produisent plus de sélection
   parasite ni de repeinture. Le texte reste visible et indexable ; la
   certitude conserve son explication dans l'attribut `title` existant. */
function chantier06(nodes) {
  markAll(nodes, 'recit-v2-e048-noselect');
}

/* E048-07 — décoratif retiré du test de pointage : `pointer-events: none`
   sur les `span[aria-hidden="true"]` des commandes (icône de lecture) et sur
   les marqueurs de type `.thread-kind`. Le pointage passe directement au
   bouton parent ; ces éléments restent dans le texte accessible par ailleurs
   via l'`aria-label` explicite des items du fil. */
function chantier07(nodes) {
  markAll(nodes, 'recit-v2-e048-decor');
}

/* E048-08 — synthèse du fil lue dans le statut : `#c3a-status` contient déjà
   « N point(s) affiché(s) sur T », calculé par la vue. Une seule expression
   régulière lit ces deux nombres en O(1), sans parcourir les boutons du fil.
   Repli propre si le libellé change de format : aucun chiffre n'est inventé. */
function lireStatut(statut) {
  const texte = String((statut && statut.textContent) || '');
  const trouve = texte.match(/(\d+)\s+point\(s\)\s+affiché\(s\)\s+sur\s+(\d+)/);
  if (!trouve) return null;
  const affiches = Number(trouve[1]);
  const total = Number(trouve[2]);
  if (!Number.isFinite(affiches) || !Number.isFinite(total)) return null;
  return { affiches, total };
}

function publierStats(root, stats) {
  if (!stats) return;
  setOnce(root, `${GATE}-affiches`, String(stats.affiches));
  setOnce(root, `${GATE}-total`, String(stats.total));
}

function ecrireStats(corps, el, stats) {
  if (!corps || typeof el !== 'function') return;
  if (typeof document !== 'undefined' && document.getElementById(STATS_ID)) return;
  if (q(corps, `#${STATS_ID}`)) return;
  const phrase = stats
    ? `Fil : ${stats.affiches} point(s) affiché(s) sur ${stats.total} · chiffres relevés dans le statut, sans parcourir le fil.`
    : 'Fil : statut non disponible · aucun chiffre inventé.';
  const lecture = el('p', 'recit-v2-e048-stats', phrase);
  try { lecture.id = STATS_ID; }
  catch { /* identifiant facultatif */ }
  const legende = q(corps, '.recit-legend');
  try {
    if (legende && typeof corps.insertBefore === 'function') corps.insertBefore(lecture, legende);
    else corps.appendChild(lecture);
  } catch { /* rendu préservé coûte que coûte */ }
}

function chantier08(root, corps, el, stats) {
  publierStats(root, stats);
  ecrireStats(corps, el, stats);
}

/* E048-10 — portée verrouillée, ids préfixés et empreinte nulle : le
   marqueur `data-v2-e048` est posé une seule fois par rendu via `setOnce`,
   ce qui cadre toutes les règles CSS et rend l'enrichissement idempotent.
   L'unique id de contenu est `v2-e048-fil-stats`, préfixé et protégé contre
   les doublons. Aucun écouteur, minuteur, observateur, rAF, aléa, appel réseau
   ni journalisation : l'empreinte est une feuille, sept classes préfixées,
   trois attributs de données et un paragraphe. */
register('E048', (ctx) => {
  try {
    if (!ctx) return;
    const { stage, layout, css, el } = ctx;
    const root = layout && typeof layout.querySelector === 'function'
      ? layout
      : (stage && typeof stage.querySelector === 'function' ? stage : null);
    if (!root) return;

    safe(() => { if (typeof css === 'function') css('recit-v2-e048', CSS); });

    if (!setOnce(root, GATE, 'on')) return;

    /* Lecture groupée, puis seulement écritures. */
    const r = collecter(root);
    const stats = lireStatut(r.statut);

    safe(() => chantier01(r.image));
    safe(() => chantier02(r.media));
    safe(() => chantier03(r.legend, r.trace));
    safe(() => chantier04(r.tapNodes));
    safe(() => chantier05(r.tapNodes));
    safe(() => chantier06(r.selectNodes));
    safe(() => chantier07(r.decorNodes));
    safe(() => chantier08(root, r.corps, el, stats));
  } catch { /* neutralisé : la vue reste lisible et inchangée */ }
});
