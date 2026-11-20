import { register } from './registry.js';

/* Lentille E048 — Performance et sobriété de la vue Récit.
 *
 * Dix chantiers concrets et distincts, tous implémentés dans CE seul module :
 *   E048-01  recherche sans correction automatique (moins de travail par frappe) ;
 *   E048-02  bandeau d'outils isolé du recalcul de mise en page (`contain`) ;
 *   E048-03  illustration non glissable, légende et crédit non sélectionnables ;
 *   E048-04  `color-scheme: dark` (contrôles natifs sans éclair ni surpeinture) ;
 *   E048-05  `text-size-adjust: 100%` (aucun gonflement texte → aucun reflow) ;
 *   E048-06  chiffres tabulaires (largeurs stables, moins de repeints) ;
 *   E048-07  gouttière de défilement stable et défilement non chaîné ;
 *   E048-08  total lu dans le surtitre, sans parcourir les 901 points ;
 *   E048-09  une seule passe de lecture puis écritures groupées ;
 *   E048-10  portée CSS verrouillée, un seul id préfixé, empreinte nulle.
 *
 * Rapport : UNIFIED_AUDIT/RECIT/views/E048.md. Lectures seules :
 * src/views/recit.js, src/views/recit/registry.js, src/views/recit/index.js,
 * src/views/_diagnostics.js, styles.css.
 *
 * Greffon strictement non destructif : aucun texte retiré, aucune commande
 * ré-attribuée, aucun écouteur, minuteur, observateur, rAF, aléa, appel réseau
 * ni journalisation. Un seul `register('E048', …)`, une seule feuille
 * `css('recit-e048', …)`. Toutes les classes sont préfixées `recit-e048-`,
 * le seul identifiant créé est `e048-sobriete-readout` (préfixé et unique).
 * Sans JavaScript, la vue reste intégralement lisible : les chantiers 01 à 08
 * et 10 sont des attributs ou de la CSS, le 09 n'ajoute qu'une ligne de texte.
 */

const CSS_ID = 'recit-e048';
const GATE = 'data-e048';
const READOUT_ID = 'e048-sobriete-readout';

/* Feuille unique. E048-10 : CHAQUE règle est cadrée par le sélecteur de portée
   `.recit-layout[data-e048="on"]`, posé une seule fois par rendu. Aucun
   sélecteur universel, aucun `will-change`, `backdrop-filter` ou `filter`,
   aucune ressource distante, aucune police téléchargée. */
const RULES = `
.recit-layout[data-e048="on"]{
  color-scheme:dark;
  text-size-adjust:100%;
  -webkit-text-size-adjust:100%;
}
.recit-layout[data-e048="on"] .recit-e048-corps{
  scrollbar-gutter:stable;
  overscroll-behavior:contain;
}
.recit-layout[data-e048="on"] .recit-e048-outils{
  contain:layout style;
}
.recit-layout[data-e048="on"] .recit-e048-image{
  -webkit-user-drag:none;
  user-select:none;
  -webkit-user-select:none;
}
.recit-layout[data-e048="on"] .recit-e048-legende-image,
.recit-layout[data-e048="on"] .recit-e048-credit-image{
  user-select:none;
  -webkit-user-select:none;
}
.recit-layout[data-e048="on"] .recit-e048-chiffres{
  font-variant-numeric:tabular-nums;
}
.recit-layout[data-e048="on"] .recit-e048-readout{
  margin:12px 0 0;padding:6px 0 0;
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

function mark(node, className) {
  if (node && node.classList && typeof node.classList.add === 'function') {
    node.classList.add(className);
  }
}

/* Pose un attribut seulement s'il est absent : enrichissement non destructif,
   même si une autre lentille est passée avant la nôtre. */
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

/* E048-09 — une seule passe de lecture : tous les repères sont collectés une
   fois, avant la moindre écriture d'attribut ou d'insertion. Aucune mesure de
   mise en page n'est répétée, aucun querySelectorAll n'est lancé sur le fil. */
function collecter(root) {
  return {
    racine: root,
    corps: q(root, '.recit-body'),
    outils: q(root, '.c3a-tools'),
    recherche: q(root, '#c3a-search'),
    media: q(root, '.recit-media'),
    image: q(root, '.recit-media img'),
    legendeImage: q(root, '.recit-media .media-caption'),
    creditImage: q(root, '.recit-media .recit-media-credit'),
    kicker: q(root, '.view-kicker'),
    timing: q(root, '.recit-timing'),
    statut: q(root, '#c3a-status'),
    progression: q(root, '.recit-progress'),
  };
}

/* E048-08 — le total est déjà dans le libellé « Étape X / Y · … » calculé par
   la vue. Le lire coûte O(1) au lieu d'itérer les 901 points du fil. Repli :
   pas de parcours de secours, on renonce proprement si le libellé est absent. */
function totalDepuisKicker(kicker) {
  const texte = String((kicker && kicker.textContent) || '');
  const trouve = texte.match(/(\d+)\s*\/\s*(\d+)/);
  if (!trouve) return null;
  const total = Number(trouve[2]);
  return Number.isFinite(total) && total >= 0 ? total : null;
}

/* E048-01 — le champ de recherche sert à filtrer jusqu'à 901 points : on
   désactive les dictionnaires et la correction automatique qui retravaillent
   le texte à chaque frappe. Attributs posés une seule fois, sans toucher au
   gestionnaire `input` de la vue. */
function chantier01(recherche) {
  setOnce(recherche, 'spellcheck', 'false');
  setOnce(recherche, 'autocomplete', 'off');
  setOnce(recherche, 'autocapitalize', 'off');
  setOnce(recherche, 'autocorrect', 'off');
  setOnce(recherche, 'inputmode', 'search');
}

/* E048-02 — isolate le bandeau de recherche et de filtres : une frappe ne
   peut plus invalider la mise en page du reste du récit. */
function chantier02(outils) {
  mark(outils, 'recit-e048-outils');
}

/* E048-03 — l'illustration ne produit plus d'image de glissement et sa
   légende ne devient pas une sélection parasite lors des clics répétés. */
function chantier03(r) {
  mark(r.media, 'recit-e048-media');
  mark(r.image, 'recit-e048-image');
  setOnce(r.image, 'draggable', 'false');
  mark(r.legendeImage, 'recit-e048-legende-image');
  mark(r.creditImage, 'recit-e048-credit-image');
}

/* E048-06 — les compteurs changent de largeur à chaque filtrage ; des chiffres
   à largeur fixe évitent le décalage des libellés voisins et leur repeinture. */
function chantier06(r) {
  mark(r.kicker, 'recit-e048-chiffres');
  mark(r.timing, 'recit-e048-chiffres');
  mark(r.statut, 'recit-e048-chiffres');
  mark(r.progression, 'recit-e048-chiffres');
}

/* E048-07 — la barre de défilement réserve sa place en permanence (plus de
   saut horizontal quand le fil se vide) et le défilement ne remonte pas à la page. */
function chantier07(corps) {
  mark(corps, 'recit-e048-corps');
}

/* E048-08 (suite) — publication du total sous forme d'attribut de données,
   consommable sans recalcul et sans nouvelle région live. */
function publierTotal(root, total) {
  if (total === null) return;
  setOnce(root, `${GATE}-total`, String(total));
}

/* E048-09 (suite) — un unique lecteur de synthèse, visible et sobre, inséré
   avant la légende. Il ne porte aucun `aria-live` : E005 gère déjà les annonces
   et E008 ne recense aucune région live supplémentaire. */
function ecrireReadout(corps, el, total) {
  if (!corps || typeof el !== 'function') return;
  if (typeof document !== 'undefined' && document.getElementById(READOUT_ID)) return;
  if (q(corps, `#${READOUT_ID}`)) return;
  const phrase = total === null
    ? 'Empreinte : une feuille de style, aucun écouteur, aucune animation, aucun appel réseau. Total non annoncé par le surtitre.'
    : `Empreinte : une feuille de style, aucun écouteur, aucune animation, aucun appel réseau. ${total} point(s) annoncé(s) sans parcourir le fil.`;
  const lecture = el('p', 'recit-e048-readout', phrase);
  try { lecture.id = READOUT_ID; }
  catch { /* identifiant facultatif */ }
  const legende = q(corps, '.recit-legend');
  try {
    if (legende && typeof corps.insertBefore === 'function') corps.insertBefore(lecture, legende);
    else corps.appendChild(lecture);
  } catch { /* rendu préservé coûte que coûte */ }
}

register('E048', (ctx) => {
  if (!ctx) return;
  const { stage, layout, css, el } = ctx;
  const root = layout && typeof layout.querySelector === 'function'
    ? layout
    : (stage && typeof stage.querySelector === 'function' ? stage : null);
  if (!root) return;

  /* Une seule feuille pour toute la lentille (cssOnce garantit l'idempotence). */
  safe(() => { if (typeof css === 'function') css(CSS_ID, RULES); });

  /* E048-10 — verrou de portée : posé une seule fois par rendu, il cadre
     toutes les règles CSS et rend l'enrichissement idempotent. */
  if (!setOnce(root, GATE, 'on')) return;

  /* E048-09 — lecture groupée, puis seulement écritures. */
  const r = collecter(root);
  const total = totalDepuisKicker(r.kicker);

  safe(() => chantier01(r.recherche));
  safe(() => chantier02(r.outils));
  safe(() => chantier03(r));
  safe(() => chantier06(r));
  safe(() => chantier07(r.corps));
  safe(() => publierTotal(root, total));
  safe(() => ecrireReadout(r.corps, el, total));
});
