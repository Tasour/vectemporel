import { register } from './registry.js';

/* Lentille E080 — passe 2 (module POINTS/V2 E080). Responsive & mobile :
  * tableau de bord de lisibilité (police système et mesure 60–75).
  *
  * Dix chantiers V2, E080-V2-01 à E080-V2-10, décrits dans
  * UNIFIED_AUDIT/POINTS/V2/views/E080.md.
  *
  * La vue points.js:128 appelle runEnhancementsV2({ viewId: 'pointsv2', stage,
  * layout }) en plus de la passe 1 (points.js:127). Ce module est un greffon
  * INDÉPENDANT et COMPLÉMENTAIRE : la passe 1 (src/views/points/E080.js) garde
  * la main sur la composition typographique (pile système, mesure 68ch,
  * text-wrap, tailles fluides) et sur sa note unique ; la passe 2 ne pilote
  * rien, elle REND AUDITABLE la lisibilité responsive telle que la vue et la
  * passe 1 l'ont produite. Tout identifiant, classe, attribut de données et id
  * de feuille est préfixé `points-v2-e080` / `v2-e080`, pour ne jamais entrer
  * en collision avec la portée `points-e080` de la passe 1.
  *
  * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
  * Aucune dépendance vers le store, aucun écriture d'état, aucun écouteur
  * global : les signaux sont lus dans le DOM réel de points.js:96-123 et dans
  * les marqueurs posés par la passe 1 (data-e080-measure, data-e080-font),
  * puis réaffichés. Aucun libellé de point, aucune source, aucune ère n'est
  * fabriqué : la cible de 68 caractères et la plage 60–75 sont des constantes
  * typographiques déclarées, pas des faits du jeu. Le seul ajout à un nœud
  * existant est un aria-describedby complété (jamais écrasé) sur le texte du
  * point ou, à défaut, sur le kicker de la fiche.
  *
  * Invariants : un seul register, une seule feuille, un seul tableau de bord
  * par rendu ; ids préfixés et dédupliqués ; tout DOM statique bâti avec ctx.el
  * (jamais de markup injecté) ; zéro réseau, zéro aléa, zéro timer, zéro rAF,
  * zéro journalisation ; chaque état porte un glyphe ET un mot, jamais la
  * couleur seule.
  */

const CSS_ID = 'points-v2-e080';
const SCOPE = 'points-v2-e080';
const PANEL_ID = 'points-v2-e080-panel';
const TITLE_ID = 'points-v2-e080-title';
const REDUCED_ATTR = 'data-v2-e080-reduced';
const VIEW_IDS = ['pointsv2', 'points'];

/* Cible typographique déclarée (même mesure que la passe 1), réutilisée pour
  * contrôler l'appartenance à la plage et estimer le nombre de lignes. Ce ne
  * sont pas des données issues du jeu. */
const MEASURE_CH = 68;
const MEASURE_MIN = 60;
const MEASURE_MAX = 75;
const MOBILE_PX = 700;
const MEASURE_LABEL = MEASURE_CH + 'ch';
const RANGE_LABEL = MEASURE_MIN + '–' + MEASURE_MAX;

/* Pile système affichée telle quelle : noms de polices déjà présentes sur
  * l'appareil, aucun fichier de police n'est demandé. */
const SYSTEM_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/* E080-V2-01 : feuille unique, entièrement préfixée par .points-v2-e080,
  * classe posée sur .points-detail : aucune fuite hors de cette vue. */
const CSS = `
.points-v2-e080 .points-v2-e080-panel {
  box-sizing: border-box;
  margin: 16px 0 4px; padding: 12px 14px;
  border: 1px solid var(--line-strong); border-radius: 10px;
  background: rgba(8, 11, 16, .6); font-variant-numeric: tabular-nums;
}
.points-v2-e080 .points-v2-e080-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 15px; color: var(--gold-bright);
}
.points-v2-e080 .points-v2-e080-intro,
.points-v2-e080 .points-v2-e080-note {
  margin: 0 0 8px; font-size: 11px; line-height: 1.5; color: var(--muted-2);
  overflow-wrap: break-word;
}
.points-v2-e080 .points-v2-e080-block { margin: 0 0 10px; }
.points-v2-e080 .points-v2-e080-block-title {
  margin: 0 0 4px; font-size: 11px; font-weight: 700;
  letter-spacing: .03em; color: var(--gold);
}
.points-v2-e080 .points-v2-e080-list {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 4px 10px;
}
.points-v2-e080 .points-v2-e080-list li {
  display: flex; align-items: baseline; gap: 6px;
  min-height: 24px; padding: 2px 0;
  font-size: 11px; line-height: 1.4; color: var(--ink-soft);
  overflow-wrap: anywhere;
}
.points-v2-e080 .points-v2-e080-glyph {
  display: inline-block; min-width: 1.2em;
  color: var(--gold-bright); font-weight: 700;
}
.points-v2-e080 .points-v2-e080-name { color: var(--ink-soft); }
.points-v2-e080 .points-v2-e080-state {
  margin-left: auto; color: var(--muted-2); font-size: 10px; white-space: nowrap;
}
.points-v2-e080 .points-v2-e080-item.is-absent .points-v2-e080-glyph { color: var(--muted-2); }
.points-v2-e080 .points-v2-e080-item.is-empty .points-v2-e080-glyph { color: var(--gold); }
.points-v2-e080 .points-v2-e080-current {
  margin: 4px 0 0; font-size: 10px; line-height: 1.4; color: var(--muted);
  overflow-wrap: anywhere;
}
.points-v2-e080 .points-v2-e080-metrics {
  margin: 8px 0 0; padding-top: 6px; border-top: 1px solid var(--line);
  font-size: 10px; line-height: 1.5; color: var(--muted-2);
}
.points-v2-e080[` + REDUCED_ATTR + `="1"] .points-v2-e080-glyph { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-v2-e080 .points-v2-e080-glyph { transition: none; }
}
@media (max-width: 620px) {
  .points-v2-e080 .points-v2-e080-list { grid-template-columns: 1fr; }
  .points-v2-e080 .points-v2-e080-panel { padding: 10px 12px; }
}
@media (forced-colors: active) {
  .points-v2-e080 .points-v2-e080-panel { border-color: CanvasText; }
  .points-v2-e080 .points-v2-e080-glyph { color: CanvasText; }
}
@media print {
  .points-v2-e080 .points-v2-e080-panel { border-color: #666; background: transparent; }
}
`;

/* E080-V2-01 : gardes structurelles, réutilisées dans tout le module. */
function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function query(root, selector) {
  return isElement(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function nodes(root, selector) {
  if (!isElement(root) || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function setAttr(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function getAttr(node, name) {
  return node && typeof node.getAttribute === 'function' ? node.getAttribute(name) : null;
}

function removeNode(node) {
  if (node && typeof node.remove === 'function') node.remove();
}

function plural(count, one, many) {
  return count > 1 ? many : one;
}

/* E080-V2-10 : garde anti-doublon. Tout nœud portant un id préfixé qui n'est
  * pas celui conservé est retiré du document (un nœud détaché d'un rendu
  * antérieur n'est pas ciblé par querySelectorAll, donc inoffensif). */
function nodesById(id) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
}

function enforceUnique(id, keep) {
  nodesById(id).forEach((node) => { if (node !== keep) removeNode(node); });
  return keep || nodesById(id)[0] || null;
}

/* E080-V2-03 / E080-V2-05 : décomptes déterministes — points Unicode, jamais
  * d'arrondi aléatoire. */
function countChars(text) {
  return Array.from(text).length;
}

function estimateLines(chars) {
  return chars > 0 ? Math.ceil(chars / MEASURE_CH) : 0;
}

/* E080-V2-03 : la cible déclarée appartient-elle à la plage normative ? */
function inRange(value) {
  return value >= MEASURE_MIN && value <= MEASURE_MAX;
}

/* E080-V2-06 : la mesure de la passe 1 est lue dans le dataset du layout,
  * jamais réécrite. Le repli est la constante déclarée par ce module. */
function readMeasure(layout) {
  const declared = layout && layout.dataset ? txt(layout.dataset.e080Measure) : '';
  const match = /^(\d+)\s*ch$/i.exec(declared);
  const value = match ? Number(match[1]) : MEASURE_CH;
  return {
    label: declared || MEASURE_LABEL,
    value,
    source: match ? 'passe 1' : 'repli V2',
  };
}

/* E080-V2-04 : le token de police de la passe 1 est réaffiché tel quel. */
function readFontToken(layout) {
  return layout && layout.dataset ? (txt(layout.dataset.e080Font) || 'system') : 'system';
}

/* E080-V2-06 : les contrôles mobiles sont comptés dans le DOM réel produit par
  * points.js:61-94 (filtres) et points.js:116-123 (navigation). */
function countControls(detail) {
  const filterSelects = nodes(query(detail, '.points-filters'), 'select').length;
  const filterButtons = nodes(query(detail, '.points-filters'), 'button').length;
  const navButtons = nodes(query(detail, '.points-nav'), 'button').length;
  return {
    filters: filterSelects + filterButtons,
    nav: navButtons,
  };
}

/* E080-V2-06 : lecture groupée des signaux, sans aucune écriture. */
function readSignals(layout, detail) {
  const text = txt(query(detail, '.points-point-text'));
  const chars = countChars(text);
  const measure = readMeasure(layout);
  const controls = countControls(detail);
  return {
    kicker: txt(query(detail, '.view-kicker')),
    title: txt(query(detail, '.points-point-title')),
    text,
    chars,
    lines: estimateLines(chars),
    measure,
    fontToken: readFontToken(layout),
    controls,
    hasJustification: !!txt(query(detail, '.points-justification')),
    hasSources: !!txt(query(detail, '.points-sources')),
    empty: !chars,
  };
}

/* E080-V2-08 : compléter aria-describedby sans jamais écraser les identifiants
  * déjà posés par la passe 1 ou par une autre lentille. */
function augmentDescribedBy(node, id) {
  if (!node || typeof node.setAttribute !== 'function') return;
  const existing = (getAttr(node, 'aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (existing.indexOf(id) !== -1) return;
  setAttr(node, 'aria-describedby', existing.concat(id).join(' '));
}

function signatureOf(signals) {
  return [
    signals.title, signals.chars, signals.lines,
    signals.measure.label, signals.fontToken,
    signals.controls.filters, signals.controls.nav,
    signals.hasJustification ? '1' : '0', signals.hasSources ? '1' : '0',
  ].join('|');
}

function listItem(ctx, glyph, name, state, kind) {
  const li = ctx.el('li', 'points-v2-e080-item is-' + kind);
  li.append(
    ctx.el('span', 'points-v2-e080-glyph', glyph),
    ctx.el('span', 'points-v2-e080-name', name),
    ctx.el('span', 'points-v2-e080-state', state)
  );
  return li;
}

/* E080-V2-02 : structure statique construite une seule fois par rendu avec
  * ctx.el (jamais de markup injecté) ; seules les listes et les deux lignes
  * dynamiques sont remplacées ensuite par fill() via replaceChildren. */
function buildPanel(ctx) {
  const panel = ctx.el('section', 'points-v2-e080-panel');
  panel.id = PANEL_ID;
  setAttr(panel, 'role', 'region');
  setAttr(panel, 'aria-labelledby', TITLE_ID);

  const title = ctx.el('h3', 'points-v2-e080-title', 'Diagnostic responsive & mobile');
  title.id = TITLE_ID;
  panel.appendChild(title);

  panel.appendChild(ctx.el('p', 'points-v2-e080-intro',
    'Ce tableau relit la fiche et ses marqueurs de lisibilité tels que la vue et la passe 1 les ont rendus. Il n’écrit aucun champ du point et ne remplace pas le texte : la composition typographique et la note de lecture restent gérées par la passe 1.'));

  const blocks = [
    ['points-v2-e080-measure', 'Mesure de lecture', 'points-v2-e080-measure-list'],
    ['points-v2-e080-fonts', 'Police & texte', 'points-v2-e080-fonts-list'],
    ['points-v2-e080-controls', 'Contrôles mobiles', 'points-v2-e080-controls-list'],
    ['points-v2-e080-contexts', 'Contextes couverts', 'points-v2-e080-contexts-list'],
  ];
  blocks.forEach(([blockClass, label, listClass]) => {
    const block = ctx.el('div', 'points-v2-e080-block ' + blockClass);
    block.appendChild(ctx.el('p', 'points-v2-e080-block-title', label));
    block.appendChild(ctx.el('ul', 'points-v2-e080-list ' + listClass));
    panel.appendChild(block);
  });

  panel.appendChild(ctx.el('p', 'points-v2-e080-current', ''));
  panel.appendChild(ctx.el('p', 'points-v2-e080-metrics', ''));
  panel.appendChild(ctx.el('p', 'points-v2-e080-note',
    'Règle de lecture : la cible de ' + MEASURE_CH + ' caractères et la plage ' + RANGE_LABEL
      + ' sont des repères typographiques déclarés, pas des mesures physiques ; les lignes sont estimées en divisant les caractères affichés par la cible. La pile de polices et les Contextes couverts sont des déclarations de feuille de style, pas des faits du jeu. Chaque état est écrit avec un signe et un mot, jamais par la couleur seule.'));
  return panel;
}

/* E080-V2-03 / E080-V2-04 / E080-V2-05 / E080-V2-06 / E080-V2-08 : tout le
  * contenu dynamique est écrit ici, à partir des signaux lus plus haut. */
function fill(ctx, panel, signals) {
  const measureList = query(panel, '.points-v2-e080-measure-list');
  if (measureList) {
    const ok = inRange(signals.measure.value);
    measureList.replaceChildren(
      listItem(ctx, ok ? '✓' : '!', 'Cible déclarée : ' + signals.measure.label,
        ok ? 'dans la plage ' + RANGE_LABEL : 'hors plage', ok ? 'present' : 'absent'),
      listItem(ctx, '◫', 'Plage normative : ' + RANGE_LABEL + ' caractères',
        'référence', 'present'),
      listItem(ctx, '≡', 'Lignes estimées : environ ' + signals.lines,
        signals.empty ? 'sans texte' : 'estimées', signals.empty ? 'absent' : 'present')
    );
  }

  const fontsList = query(panel, '.points-v2-e080-fonts-list');
  if (fontsList) {
    fontsList.replaceChildren(
      listItem(ctx, '✓', 'Police : système (' + signals.fontToken + ')',
        'aucun téléchargement', 'present'),
      listItem(ctx, '✎', 'Caractères du texte : ' + signals.chars,
        signals.empty ? 'aucun texte' : 'mesurés', signals.empty ? 'empty' : 'present'),
      listItem(ctx, '≈', 'Pile : ' + SYSTEM_STACK,
        'déclarée', 'present')
    );
  }

  const controlsList = query(panel, '.points-v2-e080-controls-list');
  if (controlsList) {
    controlsList.replaceChildren(
      listItem(ctx, signals.controls.filters ? '✓' : '○',
        'Contrôles de filtre : ' + signals.controls.filters,
        signals.controls.filters ? 'présents' : 'aucun',
        signals.controls.filters ? 'present' : 'absent'),
      listItem(ctx, signals.controls.nav ? '✓' : '○',
        'Boutons de navigation : ' + signals.controls.nav,
        signals.controls.nav ? 'présents' : 'aucun',
        signals.controls.nav ? 'present' : 'absent'),
      listItem(ctx, signals.hasJustification || signals.hasSources ? '✓' : '○',
        'Justification / sources : '
          + ((signals.hasJustification ? 'justification' : '')
            + (signals.hasJustification && signals.hasSources ? ' + ' : '')
            + (signals.hasSources ? 'sources' : '') || 'aucune'),
        signals.hasJustification || signals.hasSources ? 'composées' : 'absentes',
        signals.hasJustification || signals.hasSources ? 'present' : 'absent')
    );
  }

  const contextsList = query(panel, '.points-v2-e080-contexts-list');
  if (contextsList) {
    contextsList.replaceChildren(
      listItem(ctx, '▤', 'Empilement mobile (≤ ' + MOBILE_PX + ' px)', 'déclaré', 'present'),
      listItem(ctx, '▤', 'Paysage court (≤ 520 px de haut)', 'déclaré', 'present'),
      listItem(ctx, '▤', 'Couleurs forcées', 'déclaré', 'present'),
      listItem(ctx, '▤', 'Impression', 'déclaré', 'present')
    );
  }

  const currentLine = query(panel, '.points-v2-e080-current');
  if (currentLine) {
    currentLine.textContent = signals.title
      ? 'Point affiché : ' + signals.title
      : (signals.kicker || 'Aucun point affiché dans ce périmètre.');
  }

  const metrics = query(panel, '.points-v2-e080-metrics');
  if (metrics) {
    metrics.textContent = 'Lisibilité : ' + signals.chars + ' caractère'
      + plural(signals.chars, '', 's') + ' · environ ' + signals.lines + ' ligne'
      + plural(signals.lines, '', 's') + ' à ~' + MEASURE_CH
      + ' car/ligne · mesure ' + signals.measure.label + ' ('
      + signals.measure.source + ') · ' + signals.controls.filters + ' filtre'
      + plural(signals.controls.filters, '', 's') + ' et '
      + signals.controls.nav + ' bouton'
      + plural(signals.controls.nav, '', 's') + ' de navigation.';
  }

  setAttr(panel, 'data-v2-e080-title', signals.title);
  setAttr(panel, 'data-v2-e080-chars', String(signals.chars));
  setAttr(panel, 'data-v2-e080-lines', String(signals.lines));
  setAttr(panel, 'data-v2-e080-measure', signals.measure.label);
  setAttr(panel, 'data-v2-e080-font', signals.fontToken);
  setAttr(panel, 'data-v2-e080-filters', String(signals.controls.filters));
  setAttr(panel, 'data-v2-e080-nav', String(signals.controls.nav));
  setAttr(panel, 'data-v2-e080-in-range', inRange(signals.measure.value) ? '1' : '0');
}

/* E080-V2-01 / E080-V2-09 / E080-V2-10 : unique point d'entrée, gardes
  * structurelles, feuille unique, portée unique, ids dédupliqués, repli
  * silencieux sur structure inattendue. */
function apply(ctx) {
  if (!ctx || VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const layout = isElement(ctx.layout) ? ctx.layout
    : (isElement(ctx.stage) ? ctx.stage : null);
  if (!isElement(layout)) return;

  const detail = query(layout, '.points-detail');
  if (!isElement(detail)) return;

  ctx.css(CSS_ID, CSS);
  detail.classList.add(SCOPE);

  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) setAttr(detail, REDUCED_ATTR, '1');
  else if (typeof detail.hasAttribute === 'function' && detail.hasAttribute(REDUCED_ATTR)) {
    detail.removeAttribute(REDUCED_ATTR);
  }

  const signals = readSignals(layout, detail);
  const sig = signatureOf(signals);

  /* E080-V2-10 : réconciliation par id. On conserve le tableau déjà monté dans
   * le détail courant, on retire les doublons d'un rendu antérieur, puis on
   * garantit l'unicité du titre. */
  const candidates = nodesById(PANEL_ID);
  let panel = null;
  for (const candidate of candidates) {
    if (detail.contains(candidate) && candidate.parentElement === detail) {
      panel = candidate;
      break;
    }
  }
  candidates.forEach((node) => { if (node !== panel) removeNode(node); });

  if (!isElement(panel)) {
    panel = buildPanel(ctx);
    detail.appendChild(panel);
  }
  enforceUnique(TITLE_ID, query(panel, '#' + TITLE_ID));

  if (getAttr(panel, 'data-v2-e080-signature') !== sig) {
    setAttr(panel, 'data-v2-e080-signature', sig);
    fill(ctx, panel, signals);
  }

  setAttr(panel, 'data-v2-e080', '1');
  augmentDescribedBy(query(detail, '.points-point-text') || query(detail, '.view-kicker'), PANEL_ID);
}

register('E080', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
