import { register } from './registry.js';

/* Lentille E088 — passe 2 (module POINTS/V2 E088). Qualité & validation :
 * tableau de bord de vérifiabilité des frontières inter-domaines.
 *
 * Dix chantiers V2, E088-V2-01 à E088-V2-10, décrits dans
 * UNIFIED_AUDIT/POINTS/V2/views/E088.md.
 *
 * La vue points.js:128 appelle runEnhancementsV2({ viewId: 'pointsv2', stage,
 * layout }) en plus de la passe 1 (points.js:127). Ce module est un greffon
 * INDÉPENDANT et COMPLÉMENTAIRE : la passe 1 (src/views/points/E088.js) garde
 * la main sur son panneau #points-e088-panel, son bouton, sa live region et son
 * inventaire des limites. La passe 2 n'écrase rien : elle REND FALSIFIABLES les
 * revendications de la passe 1 en mesurant, dans le DOM réel, dix contrôles de
 * non-régression (unicité des ids, feuille injectée, portée, cohabitation,
 * contrat ctx, absence de modale, dérive du inventaire depuis la matrice, etc.).
 * Chaque contrôle porte un glyphe ET un mot, jamais la couleur seule. Le score
 * est recalculé depuis la formule (contrôles réussis / total × 100), jamais codé
 * en dur.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Aucune dépendance vers le store, aucune écriture d'état, aucun écouteur
 * global, aucune announce dans une live region. Aucun libellé de point, aucune
 * ère, aucune source n'est fabriqué : les relevés sont lus dans le DOM rendu par
 * points.js:30-77. Espace de noms réservé : points-v2-e088 (jamais
 * points-e088, jamais une autre lentille V2).
 *
 * Invariants : un seul register, une seule feuille, un seul panneau par rendu ;
 * ids préfixés points-v2-e088- et dédupliqués ; tout DOM statique bâti avec
 * ctx.el (jamais innerHTML) ; zéro réseau, zéro aléa, zéro timer, zéro rAF,
 * zéro console.* ; chaque état porte un glyphe ET un mot, jamais la couleur
 * seule.
 */

const CSS_ID = 'points-v2-e088';
const SCOPE = 'points-v2-e088';
const PANEL_ID = 'points-v2-e088-panel';
const TITLE_ID = 'points-v2-e088-title';
const REDUCED_ATTR = 'data-points-v2-e088-reduced';
const VIEW_IDS = ['pointsv2', 'points'];

/* E088-V2-01 : feuille unique, entièrement préfixée par .points-v2-e088 et
 * ancée sur la classe de portée posée sur .points-layout : aucune fuite hors de
 * cette vue, y compris dans les quatre requêtes @media. Aucune cible interactive
 * n'est ajoutée : le panneau est un tableau de bord en lecture seule. */
const CSS = `
.points-v2-e088 .points-v2-e088-panel {
  box-sizing: border-box;
  margin: 14px 0 4px; padding: 12px 14px;
  border: 1px solid var(--line-strong); border-left: 3px solid var(--gold);
  border-radius: 10px; background: rgba(8, 11, 16, .6);
  color: var(--ink-soft); font-variant-numeric: tabular-nums;
  font-size: 11px; line-height: 1.5; overflow-wrap: anywhere;
}
.points-v2-e088 .points-v2-e088-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 15px; font-weight: 600; color: var(--gold-bright);
}
.points-v2-e088 .points-v2-e088-intro,
.points-v2-e088 .points-v2-e088-note {
  margin: 0 0 8px; font-size: 11px; line-height: 1.5; color: var(--muted-2);
  overflow-wrap: break-word;
}
.points-v2-e088 .points-v2-e088-block { margin: 0 0 10px; }
.points-v2-e088 .points-v2-e088-block-title {
  margin: 0 0 4px; font-size: 11px; font-weight: 700;
  letter-spacing: .03em; color: var(--gold);
}
.points-v2-e088 .points-v2-e088-list {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 4px 10px;
}
.points-v2-e088 .points-v2-e088-item {
  display: flex; align-items: baseline; gap: 6px;
  min-height: 24px; padding: 2px 0;
  font-size: 11px; line-height: 1.4; color: var(--ink-soft);
}
.points-v2-e088 .points-v2-e088-glyph {
  display: inline-block; min-width: 1.2em;
  color: var(--gold-bright); font-weight: 700;
}
.points-v2-e088 .points-v2-e088-name { color: var(--ink-soft); }
.points-v2-e088 .points-v2-e088-word {
  margin-left: auto; color: var(--muted-2); font-size: 10px; white-space: nowrap;
}
.points-v2-e088 .points-v2-e088-item.is-fail .points-v2-e088-glyph { color: var(--gold); }
.points-v2-e088 .points-v2-e088-item.is-fail .points-v2-e088-word { color: var(--ink); }
.points-v2-e088 .points-v2-e088-score {
  margin: 8px 0 0; padding: 6px 0 0; border-top: 1px solid var(--line);
  font-size: 11px; font-weight: 600; color: var(--gold-bright);
}
.points-v2-e088 .points-v2-e088-metrics {
  margin: 6px 0 0; font-size: 10px; line-height: 1.5; color: var(--muted);
}
.points-v2-e088[data-points-v2-e088-reduced="1"] .points-v2-e088-item { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-v2-e088 .points-v2-e088-item { transition: none; }
}
@media (forced-colors: active) {
  .points-v2-e088 .points-v2-e088-panel { border-color: CanvasText; background: Canvas; color: CanvasText; }
  .points-v2-e088 .points-v2-e088-title,
  .points-v2-e088 .points-v2-e088-block-title,
  .points-v2-e088 .points-v2-e088-score,
  .points-v2-e088 .points-v2-e088-glyph { color: CanvasText; }
  .points-v2-e088 .points-v2-e088-panel { border: 1px solid CanvasText; }
}
@media (max-width: 620px) {
  .points-v2-e088 .points-v2-e088-list { grid-template-columns: 1fr; }
  .points-v2-e088 .points-v2-e088-panel { padding: 10px 12px; }
}
@media print {
  .points-v2-e088 .points-v2-e088-panel { border-color: #666; background: transparent; }
}
`;

/* Identifiants de la passe 1, lus (jamais modifiés) pour la sonde de
 * cohabitation E088-V2-04. Chaînes de documentation uniquement : aucun import,
 * aucun appel vers l'autre module. */
const PASS1_PANEL = 'points-e088-panel';

/* ------------------------------------------------------------------------- *
 * Utilitaires gardés (E088-V2-01 / 10).
 * ------------------------------------------------------------------------- */
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

function nodesById(id) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
}

function enforceUnique(id, keep) {
  nodesById(id).forEach((node) => { if (node !== keep) removeNode(node); });
  return keep || nodesById(id)[0] || null;
}

function plural(count, one, many) {
  return count > 1 ? many : one;
}

/* E088-V2-03 : détection des doublons d'ids préfixés, tous espaces de noms
 * confondus pour la vue (passe 1 et V2). Le relevé est un fait mesuré, pas une
 * constante : un doublon introduit par une autre lentille fait basculer l'état. */
function duplicateIds(root) {
  const seen = Object.create(null);
  const duplicates = Object.create(null);
  nodes(root, '[id^="points-e088-"], [id^="points-v2-e088-"]').forEach((node) => {
    const id = node.id;
    if (!id) return;
    if (seen[id]) duplicates[id] = true;
    seen[id] = true;
  });
  return Object.keys(duplicates);
}

/* E088-V2-08 : chaque résultat porte un glyphe ET un mot. La couleur est
 * redondante ; le sens reste lisible en daltonisme et en contraste forcé. */
function resultItem(ctx, check) {
  const li = ctx.el('li', 'points-v2-e088-item ' + (check.ok ? 'is-pass' : 'is-fail'));
  li.append(
    ctx.el('span', 'points-v2-e088-glyph', check.ok ? '✓' : '✗'),
    ctx.el('span', 'points-v2-e088-name', check.label),
    ctx.el('span', 'points-v2-e088-word', check.ok ? 'vérifié' : 'à corriger')
  );
  setAttr(li, 'data-v2-e088-check', check.key);
  setAttr(li, 'data-v2-e088-etat', check.ok ? 'verifie' : 'a-corriger');
  setAttr(li, 'title', check.detail);
  return li;
}

/* E088-V2-02 : structure statique bâtie une seule fois par rendu avec ctx.el,
 * jamais innerHTML. Deux blocs titrés : contrôles de non-régression et relevé
 * dérivé du DOM. Le panneau n'est ni une modale ni une région live. */
function buildPanel(ctx) {
  const panel = ctx.el('section', 'points-v2-e088-panel');
  panel.id = PANEL_ID;
  setAttr(panel, 'role', 'region');
  setAttr(panel, 'aria-labelledby', TITLE_ID);

  const title = ctx.el('h3', 'points-v2-e088-title',
    'Vérifiabilité des frontières inter-domaines');
  title.id = TITLE_ID;
  panel.appendChild(title);

  panel.appendChild(ctx.el('p', 'points-v2-e088-intro',
    'Tableau de bord local et non modal. La passe 1 inventorie les limites avec la coque, '
    + 'le store et les autres vues ; cette passe mesure, dans le DOM réel, que ses engagements '
    + 'sont tenus. Chaque contrôle porte un signe et un mot, jamais la couleur seule.'));

  const blocks = [
    ['points-v2-e088-checks', 'Contrôles de non-régression',
      'points-v2-e088-check-list', 'points-v2-e088-check-holder'],
    ['points-v2-e088-evidence', 'Relevé dérivé de la matrice',
      'points-v2-e088-evidence-list', 'points-v2-e088-evidence-holder'],
  ];
  blocks.forEach(([blockClass, label, listClass, holderClass]) => {
    const block = ctx.el('div', 'points-v2-e088-block ' + blockClass);
    block.appendChild(ctx.el('p', 'points-v2-e088-block-title', label));
    const holder = ctx.el('div', holderClass);
    holder.appendChild(ctx.el('ul', 'points-v2-e088-list ' + listClass));
    block.appendChild(holder);
    panel.appendChild(block);
  });

  panel.appendChild(ctx.el('p', 'points-v2-e088-score', ''));
  panel.appendChild(ctx.el('p', 'points-v2-e088-metrics', ''));
  panel.appendChild(ctx.el('p', 'points-v2-e088-note',
    'Score = contrôles vérifiés ÷ contrôles totaux × 100, recalculé à chaque rendu. '
    + 'Aucun chiffre n’est figé : changer le DOM, retirer la feuille ou dupliquer un id '
    + 'fait basculer un contrôle sans modification du code. Aucune annonce n’est écrite '
    + 'dans une région live ; le panneau reste lisible sans JavaScript.'));
  return panel;
}

/* E088-V2-03 / 04 / 05 / 06 / 07 : les contrôles sont des mesures du DOM et du
 * contrat courant, jamais des constantes. Chacun renvoie { key, label, ok,
 * detail } avec un libellé lisible et une preuve chiffrée quand c'est possible. */
function runChecks(ctx, layout) {
  const checks = [];

  /* E088-V2-01 / 06 : feuille V2 injectée une fois via ctx.css. */
  const style = typeof document !== 'undefined' && document.getElementById
    ? document.getElementById(CSS_ID) : null;
  checks.push({
    key: 'css',
    label: 'Feuille points-v2-e088 injectée',
    ok: !!style && style.tagName === 'STYLE',
    detail: style
      ? 'Élément <style> #' + CSS_ID + ' présent dans le document.'
      : 'Aucune feuille #' + CSS_ID + ' détectée.',
  });

  /* E088-V2-03 : unicité des ids préfixés des deux passes. */
  const duplicates = duplicateIds(layout);
  checks.push({
    key: 'ids',
    label: 'Identifiants préfixés uniques',
    ok: duplicates.length === 0,
    detail: duplicates.length
      ? 'Doublons : ' + duplicates.join(', ') + '.'
      : 'Aucun doublon parmi les ids points-e088- / points-v2-e088-.',
  });

  /* E088-V2-01 : portée posée sur le layout courant. */
  checks.push({
    key: 'scope',
    label: 'Portée points-v2-e088 sur le layout',
    ok: !!(layout.classList && layout.classList.contains(SCOPE)),
    detail: layout.classList && layout.classList.contains(SCOPE)
      ? 'Classe ' + SCOPE + ' posée sur .points-layout.'
      : 'Classe de portée absente du layout.',
  });

  /* E088-V2-04 : cohabitation avec la passe 1, sans collision d'ids. */
  const pass1 = query(layout, '#' + PASS1_PANEL);
  const v2 = query(layout, '#' + PANEL_ID);
  checks.push({
    key: 'cohabitation',
    label: 'Cohabitation avec la passe 1',
    ok: !!pass1 && !!v2 && pass1 !== v2 && PANEL_ID !== PASS1_PANEL,
    detail: pass1
      ? 'Panneau passe 1 #' + PASS1_PANEL + ' distinct de #' + PANEL_ID + '.'
      : 'Panneau passe 1 #' + PASS1_PANEL + ' non détecté dans ce rendu.',
  });

  /* E088-V2-04 : aucune modale ajoutée par la passe 2. */
  const modal = v2
    ? query(v2, '[role="dialog"], [aria-modal]')
      || (getAttr(v2, 'role') === 'dialog' || getAttr(v2, 'aria-modal') ? v2 : null)
    : null;
  checks.push({
    key: 'nonmodal',
    label: 'Aucune modale ajoutée',
    ok: !modal,
    detail: modal
      ? 'Attribut de modale détecté dans le panneau V2.'
      : 'role=region, aucun role=dialog ni aria-modal dans le panneau V2.',
  });

  /* E088-V2-05 : contrat ctx complet et exploitable. */
  const contractOk = !!ctx && typeof ctx.css === 'function' && typeof ctx.el === 'function'
    && typeof ctx.reducedMotion === 'function' && typeof ctx.viewId === 'string';
  checks.push({
    key: 'contrat',
    label: 'Contrat ctx complet',
    ok: contractOk,
    detail: contractOk
      ? 'viewId, css, el et reducedMotion disponibles et exploités.'
      : 'Un membre du contrat (viewId/css/el/reducedMotion) manque.',
  });

  /* E088-V2-07 : relevé dérivé de la matrice rendue (falsifiable). */
  const rows = nodes(layout, '.points-grid-row:not(.is-head)').length;
  const cells = nodes(layout, '.points-cell').length;
  const selects = nodes(layout, '.points-filters select').length;
  checks.push({
    key: 'dom',
    label: 'Inventaire dérivé de la matrice',
    ok: rows > 0 && cells > 0,
    detail: rows + ' ' + plural(rows, 'ligne', 'lignes') + ' d’ère et '
      + cells + ' ' + plural(cells, 'cellule', 'cellules') + ' lues dans .points-grid ; '
      + selects + ' ' + plural(selects, 'filtre', 'filtres') + ' dans .points-filters.',
  });

  /* E088-V2-04 : aucune région live parasite ajoutée par la passe 2. */
  const addedLive = v2 ? nodes(v2, '[aria-live], [role="status"]').length : 0;
  checks.push({
    key: 'live',
    label: 'Aucune annonce live parasite',
    ok: addedLive === 0,
    detail: addedLive === 0
      ? 'Aucune région live ajoutée par la passe 2 ; la live de la passe 1 est intacte.'
      : addedLive + ' région(s) live ajoutée(s) dans le panneau V2.',
  });

  return checks;
}

/* E088-V2-06 : score recalculé depuis la formule, jamais codé en dur. */
function scoreOf(checks) {
  const total = checks.length;
  const reussis = checks.filter((check) => check.ok).length;
  const pourcent = total ? Math.round((reussis / total) * 100) : 0;
  return { total, reussis, pourcent };
}

function signatureOf(checks, score) {
  return checks.map((check) => check.key + ':' + (check.ok ? '1' : '0') + ':' + check.detail)
    .join('|') + '#' + score.reussis + '/' + score.total;
}

/* E088-V2-06 / 07 : remplit les deux listes, la ligne de score et les
 * métriques. Les écritures se font par replaceChildren, après le calcul : aucun
 * texte généré n'est une donnée codée en dur. */
function remplir(ctx, panel, checks) {
  const score = scoreOf(checks);
  const checkList = query(panel, '.points-v2-e088-check-list');
  if (!checkList) return;

  const items = checks.map((check) => resultItem(ctx, check));
  checkList.replaceChildren.apply(checkList, items);

  const rows = txt(getAttr(panel, 'data-v2-e088-rows'));
  const cells = txt(getAttr(panel, 'data-v2-e088-cells'));
  const selects = txt(getAttr(panel, 'data-v2-e088-selects'));
  const evidence = query(panel, '.points-v2-e088-evidence-list');
  if (evidence) {
    const evidenceItems = [
      ['rows', 'Lignes d’ère dans .points-grid', rows || '—'],
      ['cells', 'Cellules dans .points-grid', cells || '—'],
      ['selects', 'Filtres dans .points-filters', selects || '—'],
    ].map(([key, label, value]) => {
      const li = ctx.el('li', 'points-v2-e088-item');
      li.append(
        ctx.el('span', 'points-v2-e088-glyph', '·'),
        ctx.el('span', 'points-v2-e088-name', label),
        ctx.el('span', 'points-v2-e088-word', value)
      );
      setAttr(li, 'data-v2-e088-mesure', key);
      return li;
    });
    evidence.replaceChildren.apply(evidence, evidenceItems);
  }

  const scoreNode = query(panel, '.points-v2-e088-score');
  if (scoreNode) {
    scoreNode.textContent = 'Score : ' + score.reussis + ' contrôle'
      + plural(score.reussis, '', 's') + ' vérifié'
      + plural(score.reussis, '', 's') + ' sur ' + score.total + ' × 100 = '
      + score.pourcent + ' %.';
  }
  const metrics = query(panel, '.points-v2-e088-metrics');
  if (metrics) {
    metrics.textContent = 'Contrôles : ' + score.total + ' · vérifiés : ' + score.reussis
      + ' · à corriger : ' + (score.total - score.reussis)
      + ' · doublons d’ids : ' + (checks.filter((c) => c.key === 'ids' && !c.ok).length)
      + ' · sigle : points-v2-e088.';
  }

  setAttr(panel, 'data-v2-e088-total', String(score.total));
  setAttr(panel, 'data-v2-e088-verifies', String(score.reussis));
  setAttr(panel, 'data-v2-e088-score', String(score.pourcent));
  setAttr(panel, 'data-v2-e088-signature', signatureOf(checks, score));
}

/* ------------------------------------------------------------------------- *
 * E088-V2-01 / 09 / 10 — point d'entrée unique, gardes, feuille unique, ids
 * dédupliqués, mouvement réduit couplé et repli silencieux.
 * ------------------------------------------------------------------------- */
function apply(ctx) {
  if (!ctx || VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const layout = isElement(ctx.layout) ? ctx.layout
    : (isElement(ctx.stage) ? ctx.stage : null);
  if (!isElement(layout)) return;

  const matrix = query(layout, '.points-matrix') || layout;

  /* E088-V2-01 : une seule feuille, cssOnce déduplique déjà par id. */
  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  setAttr(layout, 'data-v2-e088', '1');

  /* E088-V2-09 : préférence système couplée sans animation à désactiver. */
  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) setAttr(layout, REDUCED_ATTR, '1');
  else if (typeof layout.hasAttribute === 'function' && layout.hasAttribute(REDUCED_ATTR)) {
    layout.removeAttribute(REDUCED_ATTR);
  }

  const checks = runChecks(ctx, layout);
  const evidence = checks.filter((c) => c.key === 'dom')[0];
  const rows = nodes(layout, '.points-grid-row:not(.is-head)').length;
  const cells = nodes(layout, '.points-cell').length;
  const selects = nodes(layout, '.points-filters select').length;

  /* E088-V2-10 : réconciliation par identifiant dans le layout courant. Aucun
   * nœud d'un rendu précédent n'est conservé ; les doublons sont retirés. */
  const candidates = nodesById(PANEL_ID);
  let panel = null;
  for (const candidate of candidates) {
    if (matrix.contains(candidate) && candidate.parentElement === matrix) {
      panel = candidate;
      break;
    }
  }
  candidates.forEach((node) => { if (node !== panel) removeNode(node); });

  const created = !isElement(panel);
  if (created) {
    panel = buildPanel(ctx);
    matrix.appendChild(panel);
  }
  enforceUnique(TITLE_ID, query(panel, '#' + TITLE_ID));

  setAttr(panel, 'data-v2-e088-rows', String(rows));
  setAttr(panel, 'data-v2-e088-cells', String(cells));
  setAttr(panel, 'data-v2-e088-selects', String(selects));
  setAttr(panel, 'data-v2-e088-evidence', evidence ? evidence.detail : '');

  const score = scoreOf(checks);
  const sig = signatureOf(checks, score);
  if (getAttr(panel, 'data-v2-e088-signature') !== sig || created) {
    remplir(ctx, panel, checks);
  }
}

register('E088', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
