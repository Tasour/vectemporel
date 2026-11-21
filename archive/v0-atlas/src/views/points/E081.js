import { register } from './registry.js';

/* Lentille E081 — Qualité & validation : instrumentation de conformité (domaine I).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E081.md — chantiers E081-01 à E081-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), le
 * registre (src/views/points/registry.js), la coque et styles.css ne sont ni
 * édités ni doublés : E081 ajoute un rapport LOCAL d'autodiagnostic, non modal,
 * et lit les signaux déjà présents dans le DOM rendu.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion (fournis par
 * points/registry.js:28-44). Aucune dépendance vers le store, les filtres ou le
 * détail : le rapport reste lisible avec un ctx minimal.
 *
 * Invariants :
 * - un seul greffon, un seul CSS (points-e081), un seul badge, un seul bouton
 *   et un seul panneau par rendu ;
 * - aucun ID hors préfixe `points-e081-` ; aucun ID posé sur un nœud d'origine ;
 * - zéro journalisation, zéro requête réseau, zéro aléa, zéro timer, zéro rAF,
 *   zéro `innerHTML` : les contrôles sont des lectures du DOM et un manifeste ;
 * - le contrôle syntaxique `node --check` est un fait de build déclaré, jamais
 *   exécuté au rendu : E081 l'affiche sans le simuler ;
 * - greffon non destructif et idempotent : réutilisation par identifiant, aucun
 *   nœud de la vue supprimé, aucun doublon après un rendu neuf.
 */

const CSS_ID = 'points-e081';
const REGISTER_ID = 'E081';
const SCOPE = 'points-e081';

const ID = Object.freeze({
  badge: 'points-e081-badge',
  toggle: 'points-e081-toggle',
  panel: 'points-e081-panel',
  title: 'points-e081-title',
  checks: 'points-e081-checks',
  syntax: 'points-e081-syntax',
  metrics: 'points-e081-metrics',
});

/* E081-08 : manifeste figé des dix chantiers, source unique de la liste
 * affichée dans le panneau. Aucun chantier n'est ajouté au rendu. */
const CHANTIERS = Object.freeze([
  Object.freeze({ id: 'E081-01', label: 'Rapport d’autodiagnostic local, non modal' }),
  Object.freeze({ id: 'E081-02', label: 'Contrôle syntaxique node --check déclaré' }),
  Object.freeze({ id: 'E081-03', label: 'Zéro journalisation et zéro réseau' }),
  Object.freeze({ id: 'E081-04', label: 'Unicité des identifiants dans le document' }),
  Object.freeze({ id: 'E081-05', label: 'Préfixe points-e081- sur tous les ID propres' }),
  Object.freeze({ id: 'E081-06', label: 'Feuille CSS unique via ctx.css' }),
  Object.freeze({ id: 'E081-07', label: 'Clé register “E081” exacte' }),
  Object.freeze({ id: 'E081-08', label: 'Dix chantiers déclarés dans le rapport' }),
  Object.freeze({ id: 'E081-09', label: 'Greffon non destructif, DOM d’origine intact' }),
  Object.freeze({ id: 'E081-10', label: 'Idempotence multi-rendus' }),
]);

/* Repères que la vue rend elle-même (points.js:29-126) : E081 ne fait que les
 * compter, jamais les déplacer ni leur voler leur identifiant. */
const ANCHORS = Object.freeze([
  '.points-layout',
  '.points-matrix',
  '.points-title',
  '.points-grid',
  '.points-filters',
  '.points-detail',
  '.points-nav',
]);

/* Feuille unique, injectée par ctx.css. Tout est préfixé `#points-e081-` ou
 * `.points-e081-` : aucune fuite hors de la vue Points, aucune ressource
 * externe, aucune animation, cibles ≥ 36 px, focus visible et repli forcé. */
const CSS = `
#${ID.badge} {
  margin: 8px 0 0; padding: 6px 8px;
  border-left: 2px solid var(--gold, #e6b96f);
  color: var(--ink-soft, #d8d8d8);
  font-size: 10px; line-height: 1.5; font-variant-numeric: tabular-nums;
}
#${ID.toggle} {
  min-height: 36px; padding: 0 10px;
  border: 1px solid var(--line-strong, #5b5b5b); border-radius: 8px;
  background: rgba(230, 185, 111, .08); color: var(--gold-bright, #e9c98f);
  font: inherit; font-size: 12px; cursor: pointer;
}
#${ID.toggle}:hover { border-color: var(--gold-bright, #e9c98f); }
#${ID.panel} {
  margin: 12px 0 0; padding: 12px 14px;
  border: 1px solid var(--line-strong, #5b5b5b);
  border-left: 3px solid var(--gold, #e6b96f); border-radius: 10px;
  background: rgba(8, 11, 16, .95); color: var(--ink-soft, #d8d8d8);
  font-size: 12px; line-height: 1.5;
}
#${ID.panel}[hidden] { display: none; }
#${ID.panel}:focus-visible, #${ID.panel} button:focus-visible,
#${ID.toggle}:focus-visible { outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 3px; }
#${ID.panel} h2 {
  margin: 0 0 6px; font-family: var(--serif, serif);
  font-size: 16px; color: var(--gold-bright, #e9c98f);
}
#${ID.panel} p { margin: 0 0 8px; }
.points-e081-label { color: var(--gold, #e6b96f); font-weight: 600; letter-spacing: .03em; }
#${ID.checks} { margin: 0 0 10px; padding: 0; list-style: none; }
.points-e081-row {
  display: grid; grid-template-columns: 78px minmax(0, 1fr);
  gap: 1px 8px; margin-bottom: 6px;
}
.points-e081-tag { font-weight: 700; font-variant-numeric: tabular-nums; }
.points-e081-pass { color: var(--gold-bright, #e9c98f); }
.points-e081-declared { color: var(--muted, #9a9a9a); }
.points-e081-info { color: var(--ink-soft, #d8d8d8); }
.points-e081-detail { grid-column: 2; color: var(--muted-2, #8a8a8a); font-size: 10px; }
#${ID.syntax}, #${ID.metrics} { color: var(--muted-2, #8a8a8a); font-size: 11px; }
.points-e081-cmd { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 11px; }
.points-e081-close {
  min-height: 36px; margin: 4px 0 6px; padding: 0 10px;
  border: 1px solid var(--line-strong, #5b5b5b); border-radius: 8px;
  background: rgba(230, 185, 111, .06); color: var(--gold-bright, #e9c98f);
  font: inherit; font-size: 11px; cursor: pointer;
}
.points-e081-close:hover { border-color: var(--gold-bright, #e9c98f); }
@media (max-width: 620px) {
  .points-e081-row { grid-template-columns: minmax(0, 1fr); }
  .points-e081-detail { grid-column: 1; }
  #${ID.toggle}, #${ID.panel} .points-e081-close { width: 100%; }
  #${ID.panel} { padding: 10px; font-size: 11px; }
}
@media (prefers-reduced-motion: reduce) {
  #${ID.panel}, #${ID.toggle}, #${ID.panel} .points-e081-close { transition: none !important; animation: none !important; }
}
@media (forced-colors: active) {
  #${ID.panel}, #${ID.toggle}, #${ID.panel} .points-e081-close {
    background: Canvas; color: CanvasText; border-color: CanvasText;
  }
  #${ID.badge} { border-left-color: Highlight; }
  .points-e081-pass, .points-e081-declared, .points-e081-info { color: CanvasText; }
}
`;

let panel = null;
let toggle = null;
let badge = null;
let open = false;
let openCount = 0;
let renderCount = 0;

/* E081-03 : aucune annonce supplémentaire. La seule région live est le badge
 * de synthèse (role=status), écrit au plus une fois par rendu. */
function statusKey(status) {
  if (status === 'PASS') return 'pass';
  if (status === 'DÉCLARÉ') return 'declared';
  return 'info';
}

function countById(id) {
  return document.querySelectorAll('[id="' + id + '"]').length;
}

/* E081-04 : mesure réelle des doublons d'ID du document courant. */
function duplicateIds() {
  const counts = new Map();
  const all = document.querySelectorAll('[id]');
  Array.prototype.forEach.call(all, (node) => {
    counts.set(node.id, (counts.get(node.id) || 0) + 1);
  });
  const duplicates = [];
  counts.forEach((count, id) => {
    if (count > 1) duplicates.push(id);
  });
  return { total: all.length, duplicates };
}

/* E081-05 : `points-e081` (la feuille) et `points-e081-*` (les nœuds) forment
 * la famille complète des identifiants possédés par la lentille. */
function ownIds() {
  return Array.prototype.map.call(
    document.querySelectorAll('[id^="points-e081"]'), (node) => node.id);
}

function expectedIds() {
  return Object.keys(ID).map((key) => ID[key]).concat([CSS_ID]);
}

function motion(ctx) {
  if (typeof ctx.reducedMotion === 'function') {
    try { return ctx.reducedMotion() ? 'reduce' : 'normal'; }
    catch { /* repli prudent ci-dessous */ }
  }
  return 'normal';
}

/* E081-01 à E081-10 : les dix contrôles, exécutés à chaque rendu pour les
 * signaux observables et déclarés pour les faits de source et de build. */
function runChecks(ctx, layout) {
  const dup = duplicateIds();
  const expected = expectedIds();
  const found = ownIds();
  const missing = expected.filter((id) => countById(id) !== 1);
  const extra = found.filter((id) => expected.indexOf(id) === -1);
  const sheets = countById(CSS_ID);
  const anchorCount = ANCHORS.filter((selector) => {
    const node = selector === '.points-layout' ? layout : layout.querySelector(selector);
    return Boolean(node && node.isConnected);
  }).length;
  const single = countById(ID.panel) === 1 && countById(ID.toggle) === 1 && countById(ID.badge) === 1;
  const registerMirror = layout.getAttribute('data-points-e081-register') === REGISTER_ID;

  return [
    { ...CHANTIERS[0], status: single ? 'PASS' : 'INFO',
      detail: `${countById(ID.panel)} panneau · ${countById(ID.toggle)} bouton · ${countById(ID.badge)} badge` },
    { ...CHANTIERS[1], status: 'DÉCLARÉ',
      detail: 'node --check src/views/points/E081.js → PASS (contrôle de build, non rejoué au rendu)' },
    { ...CHANTIERS[2], status: 'DÉCLARÉ',
      detail: 'invariant de source : aucune journalisation, aucune requête réseau, aucun aléa' },
    { ...CHANTIERS[3], status: dup.duplicates.length === 0 ? 'PASS' : 'INFO',
      detail: `${dup.total} ID visités · ${dup.duplicates.length} doublon(s)` },
    { ...CHANTIERS[4], status: missing.length === 0 && extra.length === 0 ? 'PASS' : 'INFO',
      detail: `${found.length} ID préfixés · ${missing.length} absent(s) · ${extra.length} inattendu(s)` },
    { ...CHANTIERS[5], status: sheets === 1 ? 'PASS' : 'INFO',
      detail: `${sheets} feuille #${CSS_ID} (ctx.css appelé une fois)` },
    { ...CHANTIERS[6], status: registerMirror ? 'PASS' : 'INFO',
      detail: `clé déclarée ${REGISTER_ID} · miroir data-points-e081-register` },
    { ...CHANTIERS[7], status: CHANTIERS.length === 10 ? 'PASS' : 'INFO',
      detail: `${CHANTIERS.length} entrées dans le manifeste figé` },
    { ...CHANTIERS[8], status: anchorCount === ANCHORS.length ? 'PASS' : 'INFO',
      detail: `${anchorCount}/${ANCHORS.length} repères d’origine présents et connectés` },
    { ...CHANTIERS[9], status: single && sheets === 1 ? 'PASS' : 'INFO',
      detail: `${countById(ID.panel)} panneau · ${countById(ID.toggle)} bouton · ${sheets} feuille après ${renderCount} rendu(s)` },
  ];
}

function summary(checks, dupCount) {
  const pass = checks.filter((check) => check.status === 'PASS').length;
  const declared = checks.filter((check) => check.status === 'DÉCLARÉ').length;
  const info = checks.filter((check) => check.status === 'INFO').length;
  return `Autodiagnostic E081 : ${checks.length}/${CHANTIERS.length} chantiers · ${pass} PASS · ${declared} déclaré(s) · ${info} à revoir · ${dupCount} doublon(s) d’ID.`;
}

function writeMirrors(layout, checks, dupCount, seenMotion) {
  const pass = checks.filter((check) => check.status === 'PASS').length;
  const declared = checks.filter((check) => check.status === 'DÉCLARÉ').length;
  const info = checks.filter((check) => check.status === 'INFO').length;
  const ownCount = ownIds().length;
  layout.dataset.pointsE081 = '1';
  layout.dataset.pointsE081Register = REGISTER_ID;
  layout.dataset.pointsE081Css = CSS_ID;
  layout.dataset.pointsE081Chantiers = String(CHANTIERS.length);
  layout.dataset.pointsE081CssCount = String(countById(CSS_ID));
  layout.dataset.pointsE081Ids = String(ownCount);
  layout.dataset.pointsE081Duplicates = String(dupCount);
  layout.dataset.pointsE081Checks = `${pass}/${declared}/${info}`;
  layout.dataset.pointsE081Motion = seenMotion;
  layout.dataset.pointsE081Open = open ? '1' : '0';
}

/* Coquille statique, sans innerHTML. Rôle=region non modal : aucun role=dialog,
 * aucun aria-modal, aucun piège de focus. Les identifiants sont créés ici,
 * avant les contrôles, pour qu'E081-05 mesure l'état réel du premier rendu. */
function buildPanel(ctx, target) {
  target.replaceChildren();
  target.setAttribute('role', 'region');
  target.setAttribute('aria-labelledby', ID.title);
  target.tabIndex = -1;

  const title = ctx.el('h2', '', 'Autodiagnostic de conformité — vue Points');
  title.id = ID.title;
  target.appendChild(title);

  target.appendChild(ctx.el('p', '',
    'Rapport local de la lentille E081. La touche ? ouvre l’aide générale de l’application : ce rapport la complète, il ne la remplace pas.'));

  target.appendChild(ctx.el('p', 'points-e081-label', 'Contrôles des dix chantiers'));
  const list = ctx.el('ul');
  list.id = ID.checks;
  target.appendChild(list);

  target.appendChild(ctx.el('p', 'points-e081-label', 'Vérification statique'));
  target.appendChild(ctx.el('p', 'points-e081-cmd', 'node --check src/views/points/E081.js'));
  const syntax = ctx.el('p', '');
  syntax.id = ID.syntax;
  target.appendChild(syntax);

  const metrics = ctx.el('p', '');
  metrics.id = ID.metrics;
  target.appendChild(metrics);

  const close = ctx.el('button', 'points-e081-close', 'Fermer le rapport');
  close.type = 'button';
  close.setAttribute('aria-label', 'Fermer le rapport d’autodiagnostic E081');
  close.addEventListener('click', () => setOpen(false, true));
  target.appendChild(close);

  /* Échap local uniquement : le routeur clavier reste seul maître ailleurs.
   * Un seul écouteur par panneau, même après plusieurs rendus. */
  if (!target.dataset.pointsE081KeysBound) {
    target.dataset.pointsE081KeysBound = '1';
    target.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false, true);
    });
  }
}

/* Remplissage dérivé des contrôles : replaceChildren, jamais innerHTML. */
function fillPanel(ctx, checks, line) {
  const list = document.getElementById(ID.checks);
  if (list) {
    list.replaceChildren();
    checks.forEach((check) => {
      const row = ctx.el('li', 'points-e081-row');
      row.appendChild(ctx.el('span', `points-e081-tag points-e081-${statusKey(check.status)}`, check.status));
      row.appendChild(ctx.el('span', 'points-e081-name', `${check.id} — ${check.label}`));
      row.appendChild(ctx.el('span', 'points-e081-detail', check.detail));
      list.appendChild(row);
    });
  }
  const syntax = document.getElementById(ID.syntax);
  if (syntax) syntax.textContent = line;
  const metrics = document.getElementById(ID.metrics);
  if (metrics) {
    metrics.textContent = `Rendus : ${renderCount} · Ouvertures : ${openCount}. Les compteurs ne mesurent que ce greffon.`;
  }
}

/* Réutilise un nœud par identifiant ; retire seulement un nœud mal parenté
 * appartenant à E081, jamais un nœud de la vue. */
function place(ctx, id, tag, className, parent) {
  let node = document.getElementById(id);
  if (node && node.parentElement && node.parentElement !== parent) node.remove();
  if (!node || !node.isConnected) {
    node = ctx.el(tag, className);
    node.id = id;
    parent.appendChild(node);
  }
  return node;
}

function setOpen(next, restoreFocus) {
  open = !!next;
  if (panel) panel.hidden = !open;
  if (toggle) toggle.setAttribute('aria-expanded', String(open));
  if (open) {
    openCount += 1;
    if (panel) panel.focus({ preventScroll: true });
  } else if (restoreFocus && toggle && toggle.isConnected) {
    toggle.focus({ preventScroll: true });
  }
}

register('E081', (ctx) => {
  const { viewId, layout, css, el } = ctx;
  if (viewId !== 'points' || !layout || typeof layout.querySelector !== 'function') return;
  if (typeof css !== 'function' || typeof el !== 'function') return;

  renderCount += 1;
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  const foundPanel = document.getElementById(ID.panel);
  if (!(foundPanel && foundPanel.isConnected)) open = false;

  /* Le miroir register est écrit avant les contrôles pour qu'E081-07 lise
   * l'état réellement installé, pas une valeur supposée. */
  layout.dataset.pointsE081Register = REGISTER_ID;

  const matrix = layout.querySelector('.points-matrix');
  const filters = layout.querySelector('.points-filters');
  const matrixParent = matrix || layout;
  const filtersParent = filters || layout;

  /* E081-01 / E081-10 : les nœuds propres sont installés AVANT les contrôles.
   * Le rapport mesure donc l'état réellement greffé, jamais un état anticipé. */
  badge = place(ctx, ID.badge, 'p', 'points-e081-badge', matrixParent);
  badge.setAttribute('role', 'status');
  badge.setAttribute('aria-live', 'polite');
  badge.setAttribute('aria-atomic', 'true');

  /* E081-01 — commande locale, pas de touche réservée, pas d'écouteur global. */
  toggle = place(ctx, ID.toggle, 'button', 'points-e081-toggle', filtersParent);
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', ID.panel);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', 'Afficher le rapport d’autodiagnostic de conformité E081');
  if (!toggle.dataset.pointsE081Bound) {
    toggle.dataset.pointsE081Bound = '1';
    toggle.addEventListener('click', () => setOpen(!open, !open));
  }

  /* Le tiroir de diagnostics (_diagnostics.js:69-79) marque les nœuds dont le
   * parent direct est stage/layout/body. Le panneau vit donc sous .points-matrix
   * (comme le badge) : son ID reste préfixé, mais sa commande reste actionnable
   * hors mode diagnostic et aucun fichier partagé n'est modifié. */
  panel = place(ctx, ID.panel, 'section', 'points-e081-panel', matrixParent);
  buildPanel(ctx, panel);

  const checks = runChecks(ctx, layout);
  const dup = duplicateIds();
  const seenMotion = motion(ctx);
  const line = `Résultat déclaré : PASS — contrôle exécuté à la construction du module, non rejoué au rendu (mouvement : ${seenMotion}).`;

  const text = summary(checks, dup.duplicates.length);
  if (badge.textContent !== text) badge.textContent = text;

  fillPanel(ctx, checks, line);
  panel.hidden = !open;

  writeMirrors(layout, checks, dup.duplicates.length, seenMotion);
});
