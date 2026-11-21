import { register } from './registry.js';

/* Lentille E045 — Accessibilité ARIA et lecteurs d'écran (vue Récit).
 *
 * Dix chantiers E045-01 … E045-10, tous implémentés ici et détaillés dans
 * UNIFIED_AUDIT/RECIT/views/E045.md. Lectures seules : src/views/recit.js,
 * src/views/recit/registry.js, src/views/recit/index.js, src/views/_diagnostics.js.
 *
 * Greffon strictement non destructif : aucun texte n'est effacé, aucun attribut
 * existant n'est écrasé (setOnce / addToken / idOf), aucun contrôle n'est
 * ré-attribué, aucun écouteur, timer, observateur, rAF, aléa ni réseau. Seuls
 * sont ajoutés : des noms et des descriptions ARIA, des identifiants préfixés
 * e045-, des classes préfixées recit-e045- et des paragraphes masqués hors flux,
 * sans effet visuel. Sans JavaScript, la vue reste intégralement lisible.
 *
 * Les attributs déjà portés par les lentilles antérieures (E002, E005, E015,
 * E025 : role=progressbar, role=region, role=toolbar, role=note, aria-label des
 * pastilles, etc.) sont préservés : E045 ne s'y superpose pas, elle complète
 * les zones restées muettes pour un lecteur d'écran.
 */

const STYLE_ID = 'recit-e045';

/* Une seule feuille, entièrement portée par une classe préfixée. Le texte de
   raison des commandes indisponibles est masqué hors écran mais reste exposé
   aux technologies d'assistance via aria-describedby. */
const CSS = `
.recit-e045-sr{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0
}
@media (prefers-reduced-motion:reduce){.recit-e045-sr{transition:none}}
`;

/* --- utilitaires de garde -------------------------------------------------- */

function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector)
    : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector))
    : [];
}

/* Pose un attribut seulement s'il est absent : enrichissement non destructif. */
function setOnce(node, name, value) {
  if (node && node.nodeType === 1 && typeof node.hasAttribute === 'function'
      && !node.hasAttribute(name)) node.setAttribute(name, value);
}

/* Ajoute un jeton à une liste d'identifiants sans écraser les valeurs déjà
   présentes ni introduire de doublon. */
function addToken(node, name, token) {
  if (!node || !token || typeof node.getAttribute !== 'function') return;
  const current = node.getAttribute(name) || '';
  const tokens = current.split(/\s+/).filter(Boolean);
  if (tokens.indexOf(token) >= 0) return;
  tokens.push(token);
  node.setAttribute(name, tokens.join(' '));
}

/* Identifiant existant réutilisé, ou identifiant préfixé créé une seule fois. */
function idOf(node, wanted) {
  if (!node || node.nodeType !== 1) return null;
  if (node.id) return node.id;
  try { node.id = wanted; } catch { return null; }
  return node.id || null;
}

/* Création d'un nœud, avec repli si ctx.el est absent. */
function make(el, tag, className, text) {
  let node = null;
  if (typeof el === 'function') {
    try { node = el(tag, className, text); } catch { node = null; }
  }
  if (!node && typeof document !== 'undefined') {
    node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
  }
  return node;
}

/* Texte visible d'un nœud, sans jamais lever d'erreur. */
function txt(node) {
  return String((node && node.textContent) || '').replace(/\s+/g, ' ').trim();
}

/* Un chantier défaillant est neutralisé : les neuf autres continuent. */
function safe(fn) {
  try { fn(); } catch { /* rendu préservé coûte que coûte */ }
}

/* --- E045-01 — étape courante rattachée au titre -------------------------- */

function chantier01(body) {
  const kicker = q(body, '.view-kicker');
  const title = q(body, '#recit-point-title') || q(body, '.recit-title');
  if (!kicker || !title) return;
  const id = idOf(kicker, 'e045-recit-etape');
  if (id) addToken(title, 'aria-describedby', id);
}

/* --- E045-02 — raison des commandes désactivées --------------------------- */

function raisonBouton(libelle) {
  const t = libelle.toLowerCase();
  if (t.indexOf('précédent') >= 0) return "Premier point du repère : il n'y a pas de point précédent.";
  if (t.indexOf('repère suivant') >= 0) return "Dernier repère : il n'y a pas de repère suivant.";
  if (t.indexOf('suivant') >= 0) return "Dernier point du repère : il n'y a pas de point suivant.";
  if (t.indexOf('recommencer') >= 0) return "Vous êtes déjà au premier point : recommencer est inutile.";
  return "Cette commande n'est pas disponible dans l'état actuel.";
}

function chantier02(body, el) {
  const buttons = qa(body, '.recit-actions button');
  let rang = 0;
  buttons.forEach((button) => {
    const disabled = button.disabled === true
      || (typeof button.getAttribute === 'function' && button.getAttribute('aria-disabled') === 'true');
    if (!disabled || typeof button.getAttribute !== 'function') return;
    const cle = (button.dataset && button.dataset.fk) || `btn-${rang}`;
    rang += 1;
    const id = `e045-recit-raison-${cle}`;
    if (typeof document !== 'undefined' && document.getElementById(id)) return;
    const parent = button.parentNode;
    if (!parent || typeof parent.insertBefore !== 'function') return;
    const raison = make(el, 'span', 'recit-e045-sr', raisonBouton(txt(button)));
    if (!raison) return;
    raison.id = id;
    parent.insertBefore(raison, button.nextSibling);
    addToken(button, 'aria-describedby', id);
  });
}

/* --- E045-03 — aide clavier décrite au champ de recherche ----------------- */

function chantier03(body) {
  const paragraphes = qa(body, '.recit-legend p');
  const search = q(body, '#c3a-search');
  if (!search) return;
  const aide = paragraphes.filter((p) => txt(p).indexOf('Lecture guidée') >= 0)[0];
  if (!aide) return;
  const id = idOf(aide, 'e045-recit-aide-clavier');
  if (id) addToken(search, 'aria-describedby', id);
}

/* --- E045-04 — aide de navigation décrite au fil -------------------------- */

function chantier04(body) {
  const paragraphes = qa(body, '.recit-legend p');
  const fil = q(body, 'nav.recit-thread') || q(body, '.recit-thread');
  if (!fil) return;
  const aide = paragraphes.filter((p) => /^Fil\s*:/.test(txt(p)))[0];
  if (!aide) return;
  const id = idOf(aide, 'e045-recit-aide-fil');
  if (id) addToken(fil, 'aria-describedby', id);
}

/* --- E045-05 — temps de lecture nommé comme note -------------------------- */

function chantier05(body) {
  const timing = q(body, '.recit-timing');
  if (!timing) return;
  idOf(timing, 'e045-recit-timing');
  setOnce(timing, 'role', 'note');
  setOnce(timing, 'aria-label', 'Temps de lecture estimé');
}

/* --- E045-06 — pastille de certitude décrite par la légende des degrés ---- */

function chantier06(body) {
  const chip = q(body, '.recit-conf');
  if (!chip) return;
  const paragraphes = qa(body, '.recit-legend p');
  const legende = paragraphes.filter((p) => txt(p).indexOf('Degrés de certitude') >= 0)[0];
  if (!legende) return;
  const id = idOf(legende, 'e045-recit-legende-cert');
  if (id) addToken(chip, 'aria-describedby', id);
}

/* --- E045-07 — conteneur de traçabilité nommé ----------------------------- */

function chantier07(body) {
  const details = q(body, 'details.recit-trace') || q(body, '.recit-trace');
  if (!details || details.tagName !== 'DETAILS') return;
  idOf(details, 'e045-recit-trace');
  setOnce(details, 'aria-label', 'Détails de traçabilité du point courant');
}

/* --- E045-08 — résumé relié au détail des identifiants -------------------- */

function chantier08(body) {
  const details = q(body, 'details.recit-trace') || q(body, '.recit-trace');
  if (!details) return;
  const summary = q(details, 'summary');
  const detail = q(details, 'p');
  if (!summary || !detail) return;
  const id = idOf(detail, 'e045-recit-trace-ids');
  if (id) setOnce(summary, 'aria-controls', id);
}

/* --- E045-09 — navigation du point reliée au titre contrôlé --------------- */

function chantier09(body) {
  const title = q(body, '#recit-point-title') || q(body, '.recit-title');
  if (!title || !title.id) return;
  qa(body, '.recit-actions button').forEach((button) => {
    const t = txt(button).toLowerCase();
    if (t.indexOf('précédent') < 0 && t.indexOf('suivant') < 0
        && t.indexOf('recommencer') < 0) return;
    if (t.indexOf('repère suivant') >= 0) return;
    setOnce(button, 'aria-controls', title.id);
  });
}

/* --- E045-10 — état « aucune image » nommé -------------------------------- */

function chantier10(root) {
  const empty = q(root, '.recit-media .media-empty');
  if (!empty) return;
  const visible = txt(empty) || 'Aucune image vérifiée pour ce repère.';
  setOnce(empty, 'role', 'img');
  setOnce(empty, 'aria-label', visible);
}

register('E045', (ctx) => {
  if (!ctx || typeof document === 'undefined') return;
  const { stage, layout, css, el } = ctx;
  void stage;
  const root = layout || stage;
  if (!root || typeof root.querySelector !== 'function') return;

  safe(() => { if (typeof css === 'function') css(STYLE_ID, CSS); });

  const body = q(root, '.recit-body') || root;
  safe(() => chantier01(body));
  safe(() => chantier02(body, el));
  safe(() => chantier03(body));
  safe(() => chantier04(body));
  safe(() => chantier05(body));
  safe(() => chantier06(body));
  safe(() => chantier07(body));
  safe(() => chantier08(body));
  safe(() => chantier09(body));
  safe(() => chantier10(root));
});
