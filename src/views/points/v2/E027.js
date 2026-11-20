import { register } from './registry.js';

/* Lentille E027 — passe 2 (module POINTS/V2 E027). Détail & fiche :
  * bulletin de lisibilité du texte du point.
  *
  * Dix chantiers V2, E027-V2-01 à E027-V2-10, décrits dans
  * UNIFIED_AUDIT/POINTS/V2/views/E027.md.
  *
  * La vue points.js:128 appelle runEnhancementsV2({ viewId: 'pointsv2', stage,
  * layout }) en plus de la passe 1 (points.js:127). Ce module est un greffon
  * INDÉPENDANT et COMPLÉMENTAIRE : la passe 1 (src/views/points/E027.js) garde
  * la main sur la composition typographique et sur sa note unique ; la passe 2
  * ne pilote rien, elle REND AUDITABLE la lisibilité de la fiche telle que la
  * vue l'a produite. Tout identifiant, classe, attribut de données et id de
  * feuille est préfixé `points-v2-e027` / `v2-e027`, pour ne jamais entrer en
  * collision avec la portée `points-e027` de la passe 1.
  *
  * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
  * Aucune dépendance vers le store, aucun écriture d'état, aucun écouteur
  * global : les signaux sont lus dans le DOM réel de points.js:96-123 (kicker,
  * titre, texte, .points-meta, familles, sources, justification) et réaffichés.
  * Aucun libellé de point, aucune source, aucune ère n'est fabriqué ; la cible
  * de 65 caractères est une constante typographique déclarée, pas un fait du
  * jeu. Le seul ajout à un nœud existant est un aria-describedby complété
  * (jamais écrasé) sur le texte du point ou, à défaut, sur le kicker.
  *
  * Invariants : un seul register, une seule feuille, un seul bulletin par
  * rendu ; ids préfixés et dédupliqués ; tout DOM statique bâti avec ctx.el
  * (jamais innerHTML) ; zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro
  * console.* ; chaque état porte un glyphe ET un mot, jamais la couleur seule.
  */

const CSS_ID = 'points-v2-e027';
const SCOPE = 'points-v2-e027';
const PANEL_ID = 'points-v2-e027-panel';
const TITLE_ID = 'points-v2-e027-title';
const REDUCED_ATTR = 'data-v2-e027-reduced';
const VIEW_IDS = ['pointsv2', 'points'];

/* Cible typographique déclarée (même mesure que la passe 1), réutilisée pour
 * estimer le nombre de lignes. Ce n'est pas une donnée issue du jeu. */
const MEASURE_CH = 65;

/* E027-V2-01 : feuille unique, entièrement préfixée par .points-v2-e027,
  * classe posée sur .points-detail : aucune fuite hors de cette vue. */
const CSS = `
.points-v2-e027 .points-v2-e027-panel {
  box-sizing: border-box;
  margin: 16px 0 4px; padding: 12px 14px;
  border: 1px solid var(--line-strong); border-radius: 10px;
  background: rgba(8, 11, 16, .6); font-variant-numeric: tabular-nums;
}
.points-v2-e027 .points-v2-e027-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 15px; color: var(--gold-bright);
}
.points-v2-e027 .points-v2-e027-intro,
.points-v2-e027 .points-v2-e027-note {
  margin: 0 0 8px; font-size: 11px; line-height: 1.5; color: var(--muted-2);
  overflow-wrap: break-word;
}
.points-v2-e027 .points-v2-e027-block { margin: 0 0 10px; }
.points-v2-e027 .points-v2-e027-block-title {
  margin: 0 0 4px; font-size: 11px; font-weight: 700;
  letter-spacing: .03em; color: var(--gold);
}
.points-v2-e027 .points-v2-e027-list {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 4px 10px;
}
.points-v2-e027 .points-v2-e027-list li {
  display: flex; align-items: baseline; gap: 6px;
  min-height: 24px; padding: 2px 0;
  font-size: 11px; line-height: 1.4; color: var(--ink-soft);
  overflow-wrap: anywhere;
}
.points-v2-e027 .points-v2-e027-glyph {
  display: inline-block; min-width: 1.2em;
  color: var(--gold-bright); font-weight: 700;
}
.points-v2-e027 .points-v2-e027-name { color: var(--ink-soft); }
.points-v2-e027 .points-v2-e027-state {
  margin-left: auto; color: var(--muted-2); font-size: 10px; white-space: nowrap;
}
.points-v2-e027 .points-v2-e027-item.is-absent .points-v2-e027-glyph { color: var(--muted-2); }
.points-v2-e027 .points-v2-e027-item.is-empty .points-v2-e027-glyph { color: var(--gold); }
.points-v2-e027 .points-v2-e027-current {
  margin: 4px 0 0; font-size: 10px; line-height: 1.4; color: var(--muted);
  overflow-wrap: anywhere;
}
.points-v2-e027 .points-v2-e027-metrics {
  margin: 8px 0 0; padding-top: 6px; border-top: 1px solid var(--line);
  font-size: 10px; line-height: 1.5; color: var(--muted-2);
}
.points-v2-e027[` + REDUCED_ATTR + `="1"] .points-v2-e027-glyph { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-v2-e027 .points-v2-e027-glyph { transition: none; }
}
@media (max-width: 620px) {
  .points-v2-e027 .points-v2-e027-list { grid-template-columns: 1fr; }
  .points-v2-e027 .points-v2-e027-panel { padding: 10px 12px; }
}
@media (forced-colors: active) {
  .points-v2-e027 .points-v2-e027-panel { border-color: CanvasText; }
  .points-v2-e027 .points-v2-e027-glyph { color: CanvasText; }
}
@media print {
  .points-v2-e027 .points-v2-e027-panel { border-color: #666; background: transparent; }
}
`;

/* E027-V2-01 : gardes structurelles, réutilisées dans tout le module. */
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

/* E027-V2-10 : garde anti-doublon. Tout nœud portant un id préfixé qui n'est
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

/* E027-V2-03 : le décompte est déterministe — points Unicode, jamais de
  * Math.random ni d'arrondi aléatoire. */
function countChars(text) {
  return Array.from(text).length;
}

function estimateLines(chars) {
  return chars > 0 ? Math.ceil(chars / MEASURE_CH) : 0;
}

/* E027-V2-04 : les pastilles de famille sont lues dans le DOM réel
  * (points.js:109-110 les ajoute comme <span> frères du conteneur). Le repli
  * couvre les deux architectures sans jamais fabriquer de libellé. */
function readFamilies(detail) {
  const fromContainer = nodes(query(detail, '.points-families'), 'span');
  if (fromContainer.length) return fromContainer.map(txt).filter(Boolean);
  /* points.js:109-110 laisse le conteneur vide et ajoute les familles comme
   * <span> frères : on les relit alors directement, hors .points-meta. */
  const direct = Array.prototype.slice.call(detail.children).filter((node) =>
    node.tagName === 'SPAN' && !(node.closest && node.closest('.points-meta')));
  return direct.map(txt).filter(Boolean);
}

/* E027-V2-04 : les champs sont lus dans le DOM réel (points.js:97-114).
  * Aucun libellé n'est codé en dur sous forme de valeur de champ : seuls les
  * intitulés du bulletin sont figés, pas les faits affichés. */
function readFields(detail, text, families) {
  const title = txt(query(detail, '.points-point-title'));
  const meta = txt(query(detail, '.points-meta'));
  const justification = txt(query(detail, '.points-justification'));
  const sources = txt(query(detail, '.points-sources'));
  return [
    { key: 'title', label: 'Titre du point', value: title },
    { key: 'text', label: 'Texte du point', value: text },
    { key: 'meta', label: 'Métadonnées', value: meta },
    { key: 'families', label: 'Familles', value: families.join(', ') },
    { key: 'sources', label: 'Sources', value: sources },
    { key: 'justification', label: 'Justification', value: justification },
  ].map((field) => ({ key: field.key, label: field.label, present: !!field.value }));
}

/* E027-V2-05 : le nombre de sources est dérivé du paragraphe réel, sans le
  * réécrire : on retire le préfixe « Sources : » puis on compte les segments
  * non vides séparés par une virgule. */
function countSources(sourcesText) {
  if (!sourcesText) return 0;
  const body = sourcesText.replace(/^sources\s*:\s*/i, '');
  if (!body) return 0;
  return body.split(',').map(txt).filter(Boolean).length;
}

/* E027-V2-06 : le token de certitude est réaffiché tel quel, jamais normalisé
  * de force ni modifié (le badge reste la responsabilité de la passe 1). */
function readConfidence(detail) {
  return txt(query(detail, '.points-meta .confidence'));
}

function readSignals(detail) {
  const text = txt(query(detail, '.points-point-text'));
  const chars = countChars(text);
  const families = readFamilies(detail);
  const fields = readFields(detail, text, families);
  const sourcesText = txt(query(detail, '.points-sources'));
  const confidence = readConfidence(detail);
  return {
    title: txt(query(detail, '.points-point-title')),
    text,
    chars,
    lines: estimateLines(chars),
    fields,
    present: fields.filter((field) => field.present).length,
    sourceCount: countSources(sourcesText),
    familyCount: families.length,
    confidence,
    empty: !chars,
  };
}

/* E027-V2-08 : compléter aria-describedby sans jamais écraser les identifiants
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
    signals.fields.map((field) => (field.present ? '1' : '0')).join(''),
    signals.sourceCount, signals.familyCount, signals.confidence,
  ].join('|');
}

function listItem(ctx, glyph, name, state, kind) {
  const li = ctx.el('li', 'points-v2-e027-item is-' + kind);
  li.append(
    ctx.el('span', 'points-v2-e027-glyph', glyph),
    ctx.el('span', 'points-v2-e027-name', name),
    ctx.el('span', 'points-v2-e027-state', state)
  );
  return li;
}

/* E027-V2-02 : structure statique construite une seule fois par rendu avec
  * ctx.el (jamais innerHTML) ; seules les listes et les trois lignes
  * dynamiques sont remplacées ensuite par fill() via replaceChildren. */
function buildPanel(ctx) {
  const panel = ctx.el('section', 'points-v2-e027-panel');
  panel.id = PANEL_ID;
  setAttr(panel, 'role', 'region');
  setAttr(panel, 'aria-labelledby', TITLE_ID);

  const title = ctx.el('h3', 'points-v2-e027-title', 'Lisibilité de la fiche');
  title.id = TITLE_ID;
  panel.appendChild(title);

  panel.appendChild(ctx.el('p', 'points-v2-e027-intro',
    'Ce bulletin relit la fiche telle que la vue l’a rendue. Il n’écrit aucun champ du point et ne remplace pas le texte : la composition typographique et la note de lecture restent gérées par la passe 1.'));

  const blocks = [
    ['points-v2-e027-measure', 'Mesure du texte', 'points-v2-e027-measure-list'],
    ['points-v2-e027-fields', 'Champs composés', 'points-v2-e027-fields-list'],
    ['points-v2-e027-context', 'Contexte déclaré', 'points-v2-e027-context-list'],
  ];
  blocks.forEach(([blockClass, label, listClass]) => {
    const block = ctx.el('div', 'points-v2-e027-block ' + blockClass);
    block.appendChild(ctx.el('p', 'points-v2-e027-block-title', label));
    block.appendChild(ctx.el('ul', 'points-v2-e027-list ' + listClass));
    panel.appendChild(block);
  });

  panel.appendChild(ctx.el('p', 'points-v2-e027-current', ''));
  panel.appendChild(ctx.el('p', 'points-v2-e027-metrics', ''));
  panel.appendChild(ctx.el('p', 'points-v2-e027-note',
    'Règle de lecture : le nombre de caractères est compté sur le texte affiché ; la cible de '
      + MEASURE_CH + ' caractères par ligne et le nombre de lignes estimé sont des repères typographiques, pas des mesures physiques. Chaque état est écrit avec un signe et un mot, jamais par la couleur seule.'));
  return panel;
}

/* E027-V2-03 / E027-V2-04 / E027-V2-05 / E027-V2-06 / E027-V2-08 : tout le
  * contenu dynamique est écrit ici, à partir des signaux lus plus haut. */
function fill(ctx, panel, signals) {
  const measureList = query(panel, '.points-v2-e027-measure-list');
  if (measureList) {
    measureList.replaceChildren(
      listItem(ctx, '✎', 'Caractères du texte : ' + signals.chars,
        signals.empty ? 'aucun texte' : 'mesurés', signals.empty ? 'empty' : 'present'),
      listItem(ctx, '◫', 'Cible de lecture : environ ' + MEASURE_CH + ' caractères par ligne',
        'repère', 'present'),
      listItem(ctx, '≡', 'Lignes estimées : environ ' + signals.lines,
        signals.empty ? 'sans texte' : 'estimées', signals.empty ? 'absent' : 'present')
    );
  }

  const fieldsList = query(panel, '.points-v2-e027-fields-list');
  if (fieldsList) {
    fieldsList.replaceChildren.apply(fieldsList, signals.fields.map((field) =>
      listItem(ctx, field.present ? '●' : '○', field.label,
        field.present ? 'présent' : 'absent', field.present ? 'present' : 'absent')));
  }

  const contextList = query(panel, '.points-v2-e027-context-list');
  if (contextList) {
    contextList.replaceChildren(
      listItem(ctx, '▤', 'Sources déclarées : ' + signals.sourceCount,
        signals.sourceCount ? 'déclarées' : 'aucune',
        signals.sourceCount ? 'present' : 'absent'),
      listItem(ctx, '◇', 'Familles déclarées : ' + signals.familyCount,
        signals.familyCount ? 'déclarées' : 'aucune',
        signals.familyCount ? 'present' : 'absent'),
      listItem(ctx, signals.confidence ? '✓' : '○',
        'Certitude : ' + (signals.confidence || 'non déclarée'),
        signals.confidence ? 'déclarée' : 'non déclarée',
        signals.confidence ? 'present' : 'absent')
    );
  }

  const currentLine = query(panel, '.points-v2-e027-current');
  if (currentLine) {
    currentLine.textContent = signals.title
      ? 'Point affiché : ' + signals.title
      : 'Aucun point affiché dans ce périmètre.';
  }

  const metrics = query(panel, '.points-v2-e027-metrics');
  if (metrics) {
    metrics.textContent = 'Lisibilité : ' + signals.chars + ' caractère'
      + plural(signals.chars, '', 's') + ' · environ ' + signals.lines + ' ligne'
      + plural(signals.lines, '', 's') + ' à ~' + MEASURE_CH
      + ' car/ligne · ' + signals.present + ' champ'
      + plural(signals.present, '', 's') + ' sur ' + signals.fields.length + ' présents.';
  }

  setAttr(panel, 'data-v2-e027-title', signals.title);
  setAttr(panel, 'data-v2-e027-chars', String(signals.chars));
  setAttr(panel, 'data-v2-e027-lines', String(signals.lines));
  setAttr(panel, 'data-v2-e027-sources', String(signals.sourceCount));
  setAttr(panel, 'data-v2-e027-families', String(signals.familyCount));
  setAttr(panel, 'data-v2-e027-confidence', signals.confidence);
}

/* E027-V2-01 / E027-V2-09 / E027-V2-10 : unique point d'entrée, gardes
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

  const signals = readSignals(detail);
  const sig = signatureOf(signals);

  /* E027-V2-10 : réconciliation par id. On conserve le bulletin déjà monté
   * dans le détail courant, on retire les doublons d'un rendu antérieur, puis
   * on garantit l'unicité du titre. */
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

  if (getAttr(panel, 'data-v2-e027-signature') !== sig) {
    setAttr(panel, 'data-v2-e027-signature', sig);
    fill(ctx, panel, signals);
  }

  setAttr(panel, 'data-v2-e027', '1');
  augmentDescribedBy(query(detail, '.points-point-text') || query(detail, '.view-kicker'), PANEL_ID);
}

register('E027', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
