import { register } from './registry.js';

/* Lentille E042 — Hiérarchie visuelle et informationnelle, vue Récit.
 *
 * Fichier possédé : src/views/recit/E042.js (aucun autre fichier touché).
 * Rapport : UNIFIED_AUDIT/RECIT/views/E042.md (E042-01 à E042-10).
 *
 * La lentille n'efface aucun nœud et ne réécrit aucun texte existant : elle
 * structure l'information déjà rendue par recit.js en niveaux lisibles —
 * strates de lecture, ancre temporelle, rangs de certitude et catégories dans
 * le fil, légende hiérarchisée, raccourcis de commandes, profil agrégé du
 * repère, niveau « preuve », robustesse accessibilité et carte de lecture.
 *
 * Garde-fous : une seule feuille, une seule clé, un seul register, ids créés
 * préfixés « e042- » et uniques, classes préfixées « recit-e042- ». Zéro réseau,
 * zéro console, zéro Math.random, zéro minuteur, zéro canvas, zéro boucle rAF.
 * Tous les nœuds sont retrouvés depuis le contexte courant (le stage est
 * reconstruit à chaque rendu) : aucune référence n'est mémorisée entre rendus.
 * Les ids insérés ont toujours pour parent .recit-body, .recit-thread,
 * .recit-trace summary ou un bouton : ils échappent au marquage diagnostics
 * qui ne vise que les parents directs body / stage / layout.
 */

const STYLE_ID = 'recit-e042';
const SCOPE = 'recit-e042-scope';

/* Une seule feuille regroupe les dix chantiers. Toute règle est portée par
   `.recit-layout.recit-e042-scope` (spécificité stable 0-2-0 et plus) afin de
   rester dominante quel que soit l'ordre d'injection des autres lentilles. */
const CSS = `
/* E042-01 — strates de lecture et bandes de section. */
.recit-layout.recit-e042-scope .recit-e042-strate{position:relative;margin-top:12px;padding-top:10px;border-top:1px solid var(--line)}
.recit-layout.recit-e042-scope .recit-e042-strate-preuve::before,
.recit-layout.recit-e042-scope .recit-e042-strate-commandes::before,
.recit-layout.recit-e042-scope .recit-e042-strate-legend::before{display:block;margin-bottom:6px;color:var(--gold-bright);font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
.recit-layout.recit-e042-scope .recit-e042-strate-preuve::before{content:"PREUVE"}
.recit-layout.recit-e042-scope .recit-e042-strate-commandes::before{content:"COMMANDES"}
.recit-layout.recit-e042-scope .recit-e042-strate-legend::before{content:"AIDE ET LÉGENDE"}

/* E042-02 — ancre temporelle au rang de repère secondaire. */
.recit-layout.recit-e042-scope .recit-e042-year{display:inline-block;margin:6px 0 0;padding:2px 8px;border:1px solid var(--line-strong);border-radius:999px;color:var(--gold-bright);font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-variant-numeric:tabular-nums}

/* E042-03 — rang de certitude encodé par l'épaisseur et le style du bord. */
.recit-layout.recit-e042-scope .recit-thread-item[data-e042-rank]{border-left-style:solid}
.recit-layout.recit-e042-scope .recit-thread-item[data-e042-rank="1"]{border-left-width:4px}
.recit-layout.recit-e042-scope .recit-thread-item[data-e042-rank="2"]{border-left-width:3px}
.recit-layout.recit-e042-scope .recit-thread-item[data-e042-rank="3"]{border-left-width:2px;border-left-style:dashed}
.recit-layout.recit-e042-scope .recit-thread-item[data-e042-rank="4"]{border-left-width:2px;border-left-style:dotted}
.recit-layout.recit-e042-scope .recit-thread-item[data-e042-rank="5"]{border-left-width:1px}

/* E042-04 — catégorie de point signalée par un glyphe distinctif. */
.recit-layout.recit-e042-scope .recit-thread-item[data-e042-kind]::before{margin-right:5px;color:var(--gold);font-weight:700}
.recit-layout.recit-e042-scope .recit-thread-item[data-e042-kind="récit"]::before{content:"§"}
.recit-layout.recit-e042-scope .recit-thread-item[data-e042-kind="figure"]::before{content:"◇"}
.recit-layout.recit-e042-scope .recit-thread-item[data-e042-kind="lieu"]::before{content:"⌖"}
.recit-layout.recit-e042-scope .recit-thread-item[data-e042-kind="audit"]::before{content:"◆"}
.recit-layout.recit-e042-scope .recit-thread-item[data-e042-kind="point"]::before{content:"•"}

/* E042-05 — légende structurée en sous-niveaux étiquetés. */
.recit-layout.recit-e042-scope .recit-e042-legende p{padding-left:2px}
.recit-layout.recit-e042-scope .recit-e042-legende p::before{font-weight:700;color:var(--gold-bright);letter-spacing:.06em}
.recit-layout.recit-e042-scope .recit-e042-leg-1::before{content:"CERTITUDES · "}
.recit-layout.recit-e042-scope .recit-e042-leg-2::before{content:"TYPES · "}
.recit-layout.recit-e042-scope .recit-e042-leg-3::before{content:"CLAVIER · "}
.recit-layout.recit-e042-scope .recit-e042-leg-4::before{content:"FIL · "}

/* E042-06 — raccourcis clavier étiquetés sur les commandes. */
.recit-layout.recit-e042-scope .recit-e042-key{display:inline-block;margin-left:6px;padding:1px 5px;border:1px solid var(--line);border-radius:4px;color:var(--muted);font-size:9px;font-weight:400;font-variant-numeric:tabular-nums;transition:border-color .18s linear,color .18s linear}

/* E042-07 — profil de certitude agrégé des points affichés. */
.recit-layout.recit-e042-scope .recit-e042-profile{margin:6px 0 8px;color:var(--muted);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E042-08 — niveau « preuve » distinct et compteur borné. */
.recit-layout.recit-e042-scope .recit-e042-preuve summary{font-weight:600;color:var(--ink-soft)}
.recit-layout.recit-e042-scope .recit-e042-count{display:inline-block;min-width:18px;margin-left:6px;padding:0 5px;border-radius:999px;background:rgba(230,185,111,.14);color:var(--gold-bright);font-size:9px;font-weight:700;text-align:center;font-variant-numeric:tabular-nums}
.recit-layout.recit-e042-scope .recit-e042-preuve-vide{color:var(--muted-2)}

/* E042-09 — hiérarchie robuste en contraste forcé et mouvement réduit. */
.recit-layout.recit-e042-scope .recit-e042-year,
.recit-layout.recit-e042-scope .recit-e042-key,
.recit-layout.recit-e042-scope .recit-e042-count{transition:border-color .18s linear,color .18s linear}
.recit-layout[data-e042-motion="reduce"] .recit-e042-year,
.recit-layout[data-e042-motion="reduce"] .recit-e042-key,
.recit-layout[data-e042-motion="reduce"] .recit-e042-count{transition:none}
@media (prefers-reduced-motion:reduce){
  .recit-layout.recit-e042-scope .recit-e042-year,
  .recit-layout.recit-e042-scope .recit-e042-key,
  .recit-layout.recit-e042-scope .recit-e042-count{transition:none}
}
@media (forced-colors:active){
  .recit-layout.recit-e042-scope .recit-thread-item[data-e042-rank]{border-left-style:solid;border-left-color:CanvasText}
  .recit-layout.recit-e042-scope .recit-e042-strate{border-top-color:CanvasText}
  .recit-layout.recit-e042-scope .recit-e042-year,
  .recit-layout.recit-e042-scope .recit-e042-key,
  .recit-layout.recit-e042-scope .recit-e042-count{border:1px solid CanvasText;color:CanvasText}
}

/* E042-10 — carte de lecture (sommaire interne, liens d'ancre locaux). */
.recit-layout.recit-e042-scope .recit-e042-outline{margin:12px 0 0;padding:8px 0 0;border-top:1px solid var(--line)}
.recit-layout.recit-e042-scope .recit-e042-outline-title{margin:0 0 4px;color:var(--muted);font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.recit-layout.recit-e042-scope .recit-e042-outline-list{display:flex;flex-wrap:wrap;gap:4px 10px;margin:0;padding:0;list-style:none}
.recit-layout.recit-e042-scope .recit-e042-outline-link{color:var(--gold-bright);font-size:10px;text-decoration:none;border-bottom:1px dotted var(--line-strong)}
.recit-layout.recit-e042-scope .recit-e042-outline-link:hover{border-bottom-style:solid}
.recit-layout.recit-e042-scope .recit-e042-outline-link:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}

@media (max-width:620px){
  .recit-layout.recit-e042-scope .recit-e042-year{font-size:10px}
  .recit-layout.recit-e042-scope .recit-e042-outline-list{gap:6px 8px}
}
`;

const RANGS = { 'vérifié': 1, 'certain': 2, 'probable': 3, 'disputed': 4 };
const GLYPHES = { 'récit': '§', 'figure': '◇', 'lieu': '⌖', 'audit': '◆' };
const TOUCHES = { ArrowLeft: '←', ArrowRight: '→', Space: 'Espace', Enter: '↵', Digit4: '4' };
const LEGENDES = ['CERTITUDES · ', 'TYPES · ', 'CLAVIER · ', 'FIL · '];

function q(root, selector) {
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector)) : [];
}

function addClasse(node, name) {
  if (node && node.classList && !node.classList.contains(name)) node.classList.add(name);
}

function setOnce(node, attr, value) {
  if (node && typeof node.setAttribute === 'function' && !node.hasAttribute(attr)) {
    node.setAttribute(attr, value);
  }
}

function fabrique(ctx, tag, className, text) {
  if (ctx && typeof ctx.el === 'function') return ctx.el(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* E042-01 — trois bandes de lecture distinctes dans le corps du récit. */
function strates(layout) {
  addClasse(layout, SCOPE);
  addClasse(q(layout, '.recit-thread'), 'recit-e042-strate');
  const preuve = q(layout, '.recit-trace') || q(layout, '.recit-sources');
  addClasse(preuve, 'recit-e042-strate');
  addClasse(preuve, 'recit-e042-strate-preuve');
  addClasse(q(layout, '.recit-actions'), 'recit-e042-strate');
  addClasse(q(layout, '.recit-actions'), 'recit-e042-strate-commandes');
  addClasse(q(layout, '.recit-legend'), 'recit-e042-strate-legend');
}

/* E042-02 — année extraite de .recit-meta, érigée en ancre secondaire. */
function ancreTemporelle(ctx, layout) {
  const meta = q(layout, '.recit-meta');
  if (!meta) return;
  const found = String(meta.textContent || '').match(/(\d{1,4}\s*av\.\s*J\.-C\.|\b\d{3,4}\b)/);
  if (!found) return;
  let ancre = document.getElementById('e042-year-anchor');
  if (!ancre || ancre.parentElement !== layout) {
    ancre = fabrique(ctx, 'span', 'recit-e042-year');
    ancre.id = 'e042-year-anchor';
    setOnce(ancre, 'aria-hidden', 'true');
    const kicker = q(layout, '.view-kicker');
    if (kicker && kicker.parentNode) kicker.parentNode.insertBefore(ancre, kicker.nextSibling);
    else if (meta.parentNode) meta.parentNode.insertBefore(ancre, meta);
    else return;
  }
  ancre.textContent = `Repère · ${found[1].replace(/\s+/g, ' ')}`;
}

/* E042-03 — la certitude devient un rang visuel (épaisseur + style de bord). */
function rangsCertitude(layout) {
  qa(layout, '.recit-thread-item').forEach((item) => {
    const conf = item.getAttribute('data-confidence') || '';
    const rang = Object.prototype.hasOwnProperty.call(RANGS, conf) ? RANGS[conf] : 5;
    setOnce(item, 'data-e042-rank', String(rang));
  });
}

/* E042-04 — le type de point devient une catégorie glyphique distincte. */
function categories(layout) {
  qa(layout, '.recit-thread-item').forEach((item) => {
    const kind = item.getAttribute('data-kind') || 'point';
    setOnce(item, 'data-e042-kind', kind);
    const glyphe = GLYPHES[kind] || '•';
    setOnce(item, 'title', `${glyphe} ${kind} — catégorie du point`);
  });
}

/* E042-05 — la légende dense reçoit des sous-étiquettes de niveau. */
function legendeNiveaux(layout) {
  const legend = q(layout, '.recit-legend');
  if (!legend) return;
  addClasse(legend, 'recit-e042-legende');
  qa(legend, 'p').slice(0, LEGENDES.length).forEach((p, i) => {
    addClasse(p, `recit-e042-leg-${i + 1}`);
  });
}

/* E042-06 — les raccourcis déjà exposés en ARIA deviennent visibles. */
function raccourcisVisibles(ctx, layout) {
  qa(layout, '.recit-actions button').forEach((btn) => {
    if (btn.hasAttribute('data-e042-key')) return;
    const spec = btn.getAttribute('aria-keyshortcuts');
    if (!spec) return;
    const touches = spec.split(/\s+/).map((key) => TOUCHES[key] || key).filter(Boolean);
    if (!touches.length) return;
    const kbd = fabrique(ctx, 'span', 'recit-e042-key', touches.join(' '));
    setOnce(kbd, 'aria-hidden', 'true');
    btn.appendChild(kbd);
    setOnce(btn, 'data-e042-key', touches.join(' '));
  });
}

/* E042-07 — profil agrégé des certitudes, calculé sur les points affichés. */
function profilCertitude(ctx, layout) {
  const thread = q(layout, '.recit-thread');
  if (!thread) return;
  const items = qa(thread, '.recit-thread-item');
  if (!items.length) return;
  const comptes = { 'vérifié': 0, 'certain': 0, 'probable': 0, 'disputed': 0, 'autre': 0 };
  items.forEach((item) => {
    const conf = item.getAttribute('data-confidence') || '';
    if (Object.prototype.hasOwnProperty.call(comptes, conf)) comptes[conf] += 1;
    else comptes.autre += 1;
  });
  const intitules = [
    ['vérifié', 'vérifié', 'vérifiés'], ['certain', 'certain', 'certains'],
    ['probable', 'probable', 'probables'], ['disputed', 'contesté', 'contestés'],
    ['autre', 'autre', 'autres'],
  ];
  const detail = intitules.filter(([key]) => comptes[key] > 0)
    .map(([key, sing, plur]) => `${comptes[key]} ${comptes[key] > 1 ? plur : sing}`)
    .join(' · ');
  let ligne = document.getElementById('e042-conf-profile');
  if (!ligne || ligne.parentElement !== thread) {
    ligne = fabrique(ctx, 'p', 'recit-e042-profile');
    ligne.id = 'e042-conf-profile';
    const titre = q(thread, '.recit-thread-title');
    if (titre && titre.parentNode) titre.parentNode.insertBefore(ligne, titre.nextSibling);
    else thread.appendChild(ligne);
  }
  ligne.textContent = `Profil de certitude des points affichés (${items.length}) : ${detail}.`;
}

/* E042-08 — le niveau « preuve » reçoit un compteur distinct du libellé. */
function niveauPreuve(ctx, layout) {
  const trace = q(layout, '.recit-trace');
  if (trace) {
    addClasse(trace, 'recit-e042-preuve');
    const summary = q(trace, 'summary');
    if (!summary) return;
    const found = String(summary.textContent || '').match(/(\d+)\s*référence/);
    let badge = document.getElementById('e042-proof-count');
    if (!badge || badge.parentElement !== summary) {
      badge = fabrique(ctx, 'span', 'recit-e042-count');
      badge.id = 'e042-proof-count';
      setOnce(badge, 'aria-hidden', 'true');
      summary.appendChild(badge);
    }
    if (found) badge.textContent = found[1];
  } else {
    const sources = q(layout, '.recit-sources');
    if (sources) {
      addClasse(sources, 'recit-e042-preuve');
      addClasse(sources, 'recit-e042-preuve-vide');
    }
  }
}

/* E042-09 — le mouvement réduit est lu une fois par rendu, sans minuteur. */
function robustesse(ctx, layout) {
  let still = false;
  try { still = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion(); }
  catch { still = false; }
  setOnce(layout, 'data-e042-motion', still ? 'reduce' : 'normal');
}

/* E042-10 — sommaire interne : seules des ancres locales (#id) sont créées. */
function carteLecture(ctx, layout) {
  const body = q(layout, '.recit-body');
  if (!body) return;
  const thread = q(layout, '.recit-thread');
  const preuve = q(layout, '.recit-trace') || q(layout, '.recit-sources');
  const actions = q(layout, '.recit-actions');
  if (thread) setOnce(thread, 'id', 'e042-thread');
  if (preuve) setOnce(preuve, 'id', 'e042-proof');
  if (actions) setOnce(actions, 'id', 'e042-actions');

  let nav = document.getElementById('e042-outline');
  if (!nav || nav.parentElement !== body) {
    nav = fabrique(ctx, 'nav', 'recit-e042-outline');
    nav.id = 'e042-outline';
    setOnce(nav, 'aria-label', 'Carte de lecture du point');
    const legend = q(body, '.recit-legend');
    if (legend && legend.parentNode) legend.parentNode.insertBefore(nav, legend);
    else body.appendChild(nav);
  }
  nav.textContent = '';
  nav.appendChild(fabrique(ctx, 'p', 'recit-e042-outline-title', 'Carte de lecture'));
  const liste = fabrique(ctx, 'ul', 'recit-e042-outline-list');
  const ajoute = (selector, label) => {
    if (!q(layout, selector)) return;
    const li = fabrique(ctx, 'li');
    const lien = fabrique(ctx, 'a', 'recit-e042-outline-link', label);
    lien.href = selector;
    li.appendChild(lien);
    liste.appendChild(li);
  };
  ajoute('#recit-point-title', 'Point courant');
  ajoute('#e042-thread', 'Fil du repère');
  ajoute('#e042-proof', 'Preuve');
  ajoute('#e042-actions', 'Commandes');
  if (liste.childNodes.length) nav.appendChild(liste);
}

register('E042', (ctx) => {
  try {
    if (!ctx || typeof document === 'undefined') return;
    const layout = ctx.layout && ctx.layout.classList ? ctx.layout : q(ctx.stage, '.recit-layout');
    if (!layout || typeof layout.querySelector !== 'function') return;

    if (typeof ctx.css === 'function') ctx.css(STYLE_ID, CSS);
    else if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    strates(layout);
    ancreTemporelle(ctx, layout);
    rangsCertitude(layout);
    categories(layout);
    legendeNiveaux(layout);
    raccourcisVisibles(ctx, layout);
    profilCertitude(ctx, layout);
    niveauPreuve(ctx, layout);
    robustesse(ctx, layout);
    carteLecture(ctx, layout);
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
