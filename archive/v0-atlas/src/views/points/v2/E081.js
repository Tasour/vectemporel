import { register } from './registry.js';

/* Lentille E081 — passe 2 (module POINTS/V2 E081). Qualité & validation :
 * traçabilité de conformité — audit de l'autodiagnostic de la passe 1.
 *
 * Dix chantiers V2, E081-V2-01 à E081-V2-10, décrits dans
 * UNIFIED_AUDIT/POINTS/V2/views/E081.md.
 *
 * La vue points.js:128 appelle runEnhancementsV2({ viewId: 'pointsv2', stage,
 * layout }) en plus de la passe 1 (points.js:127). Ce module est un greffon
 * INDÉPENDANT et COMPLÉMENTAIRE : la passe 1 (src/views/points/E081.js) garde
 * la main sur son rapport d'autodiagnostic, son badge live, son bouton et son
 * panneau `#points-e081-panel`. La passe 2 n'écrase rien : elle RELIT les miroirs
 * `data-points-e081-*`, les attributs ARIA et le contrat de rendu laissés par la
 * passe 1, puis en trace une empreinte déterministe. Tout identifiant, classe,
 * attribut de données et id de feuille est préfixé `points-v2-e081` / `v2-e081`,
 * pour ne jamais entrer en collision avec la portée `points-e081` de la passe 1
 * ni avec les autres lentilles V2.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Aucune dépendance vers le store, aucune écriture d'état, aucun écouteur
 * global : les signaux sont lus dans le DOM réel produit par points.js:30-126.
 * Aucun chiffre de la passe 1 n'est recopié comme vrai : les miroirs sont
 * affichés tels quels et l'empreinte est recalculée à chaque rendu depuis des
 * entrées observables, sans hasard.
 *
 * Invariants : un seul register, une seule feuille, un seul panneau par rendu ;
 * ids préfixés et dédupliqués ; tout DOM statique bâti avec ctx.el (jamais
 * innerHTML) ; zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.* ;
 * chaque état porte un signe ET un mot, jamais la couleur seule.
 */

const CSS_ID = 'points-v2-e081';
const SCOPE = 'points-v2-e081';
const PANEL_ID = 'points-v2-e081-panel';
const TITLE_ID = 'points-v2-e081-title';
const VIEW_IDS = ['pointsv2', 'points'];

/* Ids privés de la passe 2, tous préfixés points-v2-e081-. */
const IDS = Object.freeze([
  PANEL_ID,
  TITLE_ID,
  'points-v2-e081-ledger',
  'points-v2-e081-aria',
  'points-v2-e081-coverage',
  'points-v2-e081-drift',
  'points-v2-e081-contract',
  'points-v2-e081-signature',
  'points-v2-e081-metrics',
]);

/* Ids de la passe 1, lus sans jamais être modifiés ni déplacés. */
const P1 = Object.freeze({
  panel: 'points-e081-panel',
  badge: 'points-e081-badge',
  toggle: 'points-e081-toggle',
  checks: 'points-e081-checks',
  title: 'points-e081-title',
  syntax: 'points-e081-syntax',
  metrics: 'points-e081-metrics',
});

/* E081-V2-01 / 02 : manuel des dix chantiers V2, source unique de la liste
 * affichée dans le panneau. Aucun chantier n'est ajouté au rendu. */
const CHANTIERS = Object.freeze([
  Object.freeze({ id: 'E081-V2-01', label: 'Feuille unique cadrée, gardes structurelles et portée dédiée' }),
  Object.freeze({ id: 'E081-V2-02', label: 'Panneau de traçabilité structuré, bâti avec ctx.el' }),
  Object.freeze({ id: 'E081-V2-03', label: 'Relevé des miroirs de la passe 1 en texte lisible' }),
  Object.freeze({ id: 'E081-V2-04', label: 'Contrôle d’intégrité ARIA du rapport passe 1 (lecture seule)' }),
  Object.freeze({ id: 'E081-V2-05', label: 'Matrice de couverture des dix chantiers de la passe 1' }),
  Object.freeze({ id: 'E081-V2-06', label: 'Détection de dérive de périmètre (fuite et doublons d’ids)' }),
  Object.freeze({ id: 'E081-V2-07', label: 'Manifeste du contrat de rendu ctx, affiché sans écriture' }),
  Object.freeze({ id: 'E081-V2-08', label: 'Empreinte de reproductibilité déterministe' }),
  Object.freeze({ id: 'E081-V2-09', label: 'Thèmes, contraste forcé, mouvement réduit et repli responsive' }),
  Object.freeze({ id: 'E081-V2-10', label: 'Idempotence, unicité des ids et register unique' }),
]);

/* Feuille unique, injectée par ctx.css. Tout est préfixé `.points-v2-e081` :
 * aucune fuite hors de la vue Points V2, aucune ressource externe, aucune
 * animation, cibles non interactives, focus et replis prévus. */
const CSS = `
.points-v2-e081 .points-v2-e081-panel {
  box-sizing: border-box;
  margin: 14px 0 4px; padding: 12px 14px;
  border: 1px solid var(--line-strong); border-left: 3px solid var(--gold);
  border-radius: 10px; background: rgba(8, 11, 16, .6);
  color: var(--ink-soft); font-size: 11px; line-height: 1.5;
  font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
}
.points-v2-e081 .points-v2-e081-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 15px; font-weight: 600; color: var(--gold-bright);
}
.points-v2-e081 .points-v2-e081-intro,
.points-v2-e081 .points-v2-e081-note {
  margin: 0 0 8px; font-size: 11px; line-height: 1.5; color: var(--muted-2);
  overflow-wrap: break-word;
}
.points-v2-e081 .points-v2-e081-block { margin: 0 0 10px; }
.points-v2-e081 .points-v2-e081-block-title {
  margin: 0 0 4px; font-size: 11px; font-weight: 700;
  letter-spacing: .03em; color: var(--gold);
}
.points-v2-e081 .points-v2-e081-list {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 4px 10px;
}
.points-v2-e081 .points-v2-e081-list li {
  display: flex; align-items: baseline; gap: 6px;
  min-height: 24px; padding: 2px 0;
  font-size: 11px; line-height: 1.4; color: var(--ink-soft);
}
.points-v2-e081 .points-v2-e081-glyph {
  display: inline-block; min-width: 1.2em;
  color: var(--gold-bright); font-weight: 700;
}
.points-v2-e081 .points-v2-e081-name { color: var(--ink-soft); }
.points-v2-e081 .points-v2-e081-value {
  margin-left: auto; color: var(--gold-bright);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 10px; white-space: nowrap;
}
.points-v2-e081 .points-v2-e081-item.is-off .points-v2-e081-glyph { color: var(--gold); }
.points-v2-e081 .points-v2-e081-item.is-off .points-v2-e081-value { color: var(--ink); }
.points-v2-e081 .points-v2-e081-coverage,
.points-v2-e081 .points-v2-e081-drift {
  margin: 2px 0 0; font-size: 11px; line-height: 1.5; color: var(--ink-soft);
}
.points-v2-e081 .points-v2-e081-signature,
.points-v2-e081 .points-v2-e081-metrics {
  margin: 8px 0 0; padding-top: 6px; border-top: 1px solid var(--line);
  font-size: 10px; line-height: 1.5; color: var(--muted-2);
}
.points-v2-e081[data-points-v2-e081-reduced="1"] .points-v2-e081-list li { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-v2-e081 .points-v2-e081-list li { transition: none; }
}
@media (forced-colors: active) {
  .points-v2-e081 .points-v2-e081-panel { border-color: CanvasText; background: Canvas; color: CanvasText; }
  .points-v2-e081 .points-v2-e081-title,
  .points-v2-e081 .points-v2-e081-block-title,
  .points-v2-e081 .points-v2-e081-value,
  .points-v2-e081 .points-v2-e081-glyph { color: CanvasText; }
}
@media (max-width: 620px) {
  .points-v2-e081 .points-v2-e081-list { grid-template-columns: 1fr; }
  .points-v2-e081 .points-v2-e081-panel { padding: 10px 12px; }
}
@media print {
  .points-v2-e081 .points-v2-e081-panel { border-color: #666; background: transparent; }
}
`;

/* ------------------------------------------------------------------------- *
 * Utilitaires bornés et silencieux : aucune API n'est supposée présente.
 * ------------------------------------------------------------------------- */
function isElement(node) {
  return Boolean(node) && node.nodeType === 1;
}

function query(root, selector) {
  return isElement(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function queryAll(root, selector) {
  return isElement(root) && typeof root.querySelectorAll === 'function'
    ? Array.prototype.slice.call(root.querySelectorAll(selector)) : [];
}

function byId(id) {
  try { return document.getElementById(id); }
  catch { return null; }
}

function nodesById(id) {
  return queryAll(document, '[id="' + id + '"]');
}

function getAttr(node, name) {
  return isElement(node) && typeof node.getAttribute === 'function'
    ? node.getAttribute(name) : null;
}

function setAttr(node, name, value) {
  if (isElement(node) && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function removeNode(node) {
  if (isElement(node) && node.parentNode) node.parentNode.removeChild(node);
}

function enforceUnique(id, keep) {
  nodesById(id).forEach((node) => { if (node !== keep) removeNode(node); });
}

/* E081-V2-08 : signature déterministe, sans hasard. Toute entrée est une
 * chaîne observable ; à DOM inchangé, l'empreinte est identique d'un rendu à
 * l'autre, ce qui rend la reproductibilité falsifiable. */
function signature(parts) {
  const source = parts.join('|');
  let acc = 0;
  for (let i = 0; i < source.length; i += 1) {
    acc = (acc * 31 + source.charCodeAt(i)) % 1000000007;
  }
  let out = acc.toString(36);
  while (out.length < 6) out = '0' + out;
  return out;
}

/* E081-V2-03 à E081-V2-08 : une seule passe de lecture, écrite en texte
 * lisible et dans des attributs auditables (jamais dans une région live). */
function collectState(ctx, layout) {
  const mirrorLabels = [
    ['', 'Racine (data-points-e081)'],
    ['-register', 'Clé register'],
    ['-css', 'Feuille CSS'],
    ['-chantiers', 'Chantiers déclarés'],
    ['-css-count', 'Feuilles injectées'],
    ['-ids', 'Ids préfixés'],
    ['-duplicates', 'Doublons d’ids'],
    ['-checks', 'Contrôles PASS/DÉCLARÉ/INFO'],
    ['-motion', 'Mouvement'],
    ['-open', 'Panneau ouvert'],
  ];
  const mirrors = mirrorLabels.map(([suffix, label]) => [
    label, getAttr(layout, 'data-points-e081' + suffix) || '—',
  ]);

  const panelNode = byId(P1.panel);
  const badge = byId(P1.badge);
  const toggle = byId(P1.toggle);
  const aria = [
    ['Panneau role=region', getAttr(panelNode, 'role') === 'region'],
    ['Panneau aria-labelledby', Boolean(getAttr(panelNode, 'aria-labelledby'))],
    ['Badge role=status', getAttr(badge, 'role') === 'status'],
    ['Badge aria-live=polite', getAttr(badge, 'aria-live') === 'polite'],
    ['Badge aria-atomic=true', getAttr(badge, 'aria-atomic') === 'true'],
    ['Bouton aria-controls', Boolean(getAttr(toggle, 'aria-controls'))],
    ['Bouton aria-expanded valide', ['true', 'false'].indexOf(getAttr(toggle, 'aria-expanded')) !== -1],
  ];

  const checksList = byId(P1.checks);
  const checkRows = checksList ? queryAll(checksList, 'li').length : 0;
  const p1ids = [P1.panel, P1.badge, P1.toggle, P1.checks, P1.title, P1.syntax, P1.metrics];
  const p1present = p1ids.filter((id) => byId(id)).length;
  const coverage = 'Passe 1 : ' + checkRows + '/10 lignes de contrôle · '
    + p1present + '/' + p1ids.length + ' ids propres présents · chantiers déclarés '
    + (getAttr(layout, 'data-points-e081-chantiers') || '—') + '.';

  const own = queryAll(document, '[id^="points-e081"]');
  const v2 = queryAll(document, '[id^="points-v2-e081"]');
  const seen = new Set();
  let duplicates = 0;
  own.concat(v2).forEach((node) => {
    const id = node.id || '';
    if (seen.has(id)) duplicates += 1;
    else seen.add(id);
  });
  const drift = 'Ids passe 1 : ' + own.length + ' · ids passe 2 : ' + v2.length
    + ' · doublons : ' + duplicates + '.';

  const contractKeys = ['viewId', 'stage', 'layout', 'css', 'el', 'reducedMotion'];
  const contract = contractKeys.map((key) => [
    key, Object.prototype.hasOwnProperty.call(ctx, key) ? typeof ctx[key] : 'absent',
  ]);

  const parts = [
    ctx.viewId == null ? '' : String(ctx.viewId),
    getAttr(layout, 'data-points-e081-register') || '',
    getAttr(layout, 'data-points-e081-checks') || '',
    String(checkRows),
    String(p1present),
    String(own.length), String(v2.length), String(duplicates),
    contract.map((entry) => entry[0] + ':' + entry[1]).join(','),
    aria.map((entry) => (entry[1] ? '1' : '0')).join(''),
  ];
  const sig = signature(parts);

  return {
    mirrors, aria, coverage, drift, contract, sig,
    counts: {
      ariaOk: aria.filter((entry) => entry[1]).length,
      ariaTotal: aria.length,
      contractOk: contract.filter((entry) => entry[1] !== 'absent').length,
      contractTotal: contract.length,
      duplicates,
    },
  };
}

/* E081-V2-02 : une ligne d'état avec signe ET mot, jamais la couleur seule. */
function line(ctx, kind, name, value) {
  const li = ctx.el('li', 'points-v2-e081-item is-' + kind);
  li.appendChild(ctx.el('span', 'points-v2-e081-glyph', kind === 'ok' ? '✓' : '○'));
  li.appendChild(ctx.el('span', 'points-v2-e081-name', name));
  if (value) li.appendChild(ctx.el('span', 'points-v2-e081-value', value));
  return li;
}

/* E081-V2-02 : structure statique bâtie une seule fois par rendu avec ctx.el,
 * jamais innerHTML. Seules les zones dynamiques sont remplacées ensuite. */
function buildPanel(ctx) {
  const panel = ctx.el('section', 'points-v2-e081-panel');
  panel.id = PANEL_ID;
  setAttr(panel, 'role', 'region');
  setAttr(panel, 'aria-labelledby', TITLE_ID);

  const title = ctx.el('h3', 'points-v2-e081-title', 'Traçabilité de conformité — passe 2');
  title.id = TITLE_ID;
  panel.appendChild(title);

  panel.appendChild(ctx.el('p', 'points-v2-e081-intro',
    'Audit de l’autodiagnostic : cette passe relit les miroirs, les attributs ARIA et le contrat laissés par la passe 1, puis en trace une empreinte déterministe. Elle ne modifie aucun nœud de la passe 1.'));

  const mBlock = ctx.el('div', 'points-v2-e081-block points-v2-e081-manifest-block');
  mBlock.appendChild(ctx.el('p', 'points-v2-e081-block-title', 'Manifeste des dix chantiers V2'));
  const mList = ctx.el('ul', 'points-v2-e081-list points-v2-e081-manifest');
  CHANTIERS.forEach((chantier) => {
    const li = ctx.el('li', 'points-v2-e081-item is-ok');
    li.appendChild(ctx.el('span', 'points-v2-e081-glyph', '•'));
    li.appendChild(ctx.el('span', 'points-v2-e081-name', chantier.id + ' — ' + chantier.label));
    mList.appendChild(li);
  });
  mBlock.appendChild(mList);
  panel.appendChild(mBlock);

  const blocks = [
    ['ledger', 'Miroirs de la passe 1 relevés', 'ul', 'points-v2-e081-ledger'],
    ['aria', 'Intégrité ARIA du rapport passe 1', 'ul', 'points-v2-e081-aria'],
    ['coverage', 'Couverture des dix chantiers passe 1', 'p', 'points-v2-e081-coverage'],
    ['drift', 'Dérive de périmètre', 'p', 'points-v2-e081-drift'],
    ['contract', 'Contrat de rendu (lecture seule)', 'ul', 'points-v2-e081-contract'],
  ];
  blocks.forEach(([key, label, tag, id]) => {
    const block = ctx.el('div', 'points-v2-e081-block points-v2-e081-' + key + '-block');
    block.appendChild(ctx.el('p', 'points-v2-e081-block-title', label));
    const target = ctx.el(tag, 'points-v2-e081-' + key);
    target.id = id;
    block.appendChild(target);
    panel.appendChild(block);
  });

  const sig = ctx.el('p', 'points-v2-e081-signature', '');
  sig.id = 'points-v2-e081-signature';
  panel.appendChild(sig);
  const metrics = ctx.el('p', 'points-v2-e081-metrics', '');
  metrics.id = 'points-v2-e081-metrics';
  panel.appendChild(metrics);
  panel.appendChild(ctx.el('p', 'points-v2-e081-note',
    'Empreinte recalculée à chaque rendu : à DOM inchangé, elle reste identique. Signes et mots accompagnent chaque état, jamais la couleur seule.'));
  return panel;
}

/* Remplissage dérivé : replaceChildren, jamais innerHTML. */
function fillPanel(ctx, panel, state) {
  const ledger = byId('points-v2-e081-ledger');
  if (ledger) {
    ledger.replaceChildren.apply(ledger, state.mirrors.map((entry) =>
      line(ctx, entry[1] === '—' ? 'off' : 'ok', entry[0], entry[1])));
  }
  const aria = byId('points-v2-e081-aria');
  if (aria) {
    aria.replaceChildren.apply(aria, state.aria.map((entry) =>
      line(ctx, entry[1] ? 'ok' : 'off', entry[0], entry[1] ? 'présent' : 'absent')));
  }
  const coverage = byId('points-v2-e081-coverage');
  if (coverage) coverage.textContent = state.coverage;
  const drift = byId('points-v2-e081-drift');
  if (drift) drift.textContent = state.drift;
  const contract = byId('points-v2-e081-contract');
  if (contract) {
    contract.replaceChildren.apply(contract, state.contract.map((entry) =>
      line(ctx, entry[1] === 'absent' ? 'off' : 'ok', entry[0], entry[1])));
  }
  const sig = byId('points-v2-e081-signature');
  if (sig) sig.textContent = 'Empreinte de reproductibilité : ' + state.sig + '.';
  const metrics = byId('points-v2-e081-metrics');
  if (metrics) {
    metrics.textContent = 'Chantiers V2 : ' + CHANTIERS.length
      + ' · ARIA conformes : ' + state.counts.ariaOk + '/' + state.counts.ariaTotal
      + ' · contrat renseigné : ' + state.counts.contractOk + '/' + state.counts.contractTotal
      + ' · dérive : ' + state.counts.duplicates + ' doublon(s).';
  }
  setAttr(panel, 'data-v2-e081-chantiers', String(CHANTIERS.length));
  setAttr(panel, 'data-v2-e081-sig', state.sig);
}

/* ------------------------------------------------------------------------- *
 * E081-V2-01 / 09 / 10 — point d'entrée unique, gardes, feuille unique, ids
 * dédupliqués, repli silencieux sur structure inattendue.
 * ------------------------------------------------------------------------- */
function apply(ctx) {
  if (!ctx || VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const layout = isElement(ctx.layout) ? ctx.layout
    : (isElement(ctx.stage) ? ctx.stage : null);
  if (!isElement(layout) || typeof layout.querySelector !== 'function') return;

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) setAttr(layout, 'data-points-v2-e081-reduced', '1');
  else if (typeof layout.hasAttribute === 'function' && layout.hasAttribute('data-points-v2-e081-reduced')) {
    layout.removeAttribute('data-points-v2-e081-reduced');
  }

  const state = collectState(ctx, layout);

  /* Le tiroir de diagnostics marque les nœuds dont le parent direct est
   * stage/layout/body. Comme la passe 1, on parente sous .points-matrix pour
   * garder la commande actionnable sans toucher au fichier partagé. */
  const parent = query(layout, '.points-matrix') || layout;
  const candidates = nodesById(PANEL_ID);
  let panel = null;
  for (const candidate of candidates) {
    if (parent.contains(candidate) && candidate.parentElement === parent) {
      panel = candidate;
      break;
    }
  }
  candidates.forEach((node) => { if (node !== panel) removeNode(node); });

  if (!isElement(panel)) {
    panel = buildPanel(ctx);
    parent.appendChild(panel);
  }
  enforceUnique(TITLE_ID, byId(TITLE_ID));

  if (getAttr(panel, 'data-v2-e081-fill-sig') !== state.sig) {
    setAttr(panel, 'data-v2-e081-fill-sig', state.sig);
    fillPanel(ctx, panel, state);
  }

  setAttr(panel, 'data-v2-e081', '1');
  setAttr(layout, 'data-points-v2-e081', '1');
  setAttr(layout, 'data-points-v2-e081-signature', state.sig);
}

register('E081', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
