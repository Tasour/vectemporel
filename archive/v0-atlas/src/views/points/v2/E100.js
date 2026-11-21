import { register } from './registry.js';

/* Lentille E100 — passe 2 (module POINTS/V2 E100). Domaine J : pédagogie &
  * narration. La passe 1 (src/views/points/E100.js) dépose un « récapitulatif »
  * qui RACONTE la synthèse des trois fils — couverture, certitude, silences.
  * La passe 2 ajoute un « miroir de synthèse » DISTINCT, non modal, accroché à
  * .points-matrix, qui VÉRIFIE cette synthèse : il relit les mêmes trois fils
  * directement sur le DOM rendu par points.js, expose le calcul de chacun et
  * laisse le lecteur le contredire. Il ne lit aucun nœud de la passe 1, ne
  * réécrit aucune de ses valeurs et ne partage aucun identifiant ni signal.
  *
  * Dix chantiers V2, E100-V2-01 à E100-V2-10, décrits dans
  * UNIFIED_AUDIT/POINTS/V2/views/E100.md. Tous implémentés ici.
  *
  * Différence contractuelle : points.js:128 appelle
  * runEnhancementsV2({ viewId: 'pointsv2', stage, layout }) en plus de la passe
  * 1 (points.js:127). Le greffon filtre donc sur 'pointsv2' ; 'points' est
  * toléré pour un harnais isolé. Tout est dérivé du DOM : aucune grandeur
  * historique n'est codée en dur, aucun total littéral n'est recopié de
  * COVERAGE_POINTS.md (fichier non possédé). Contrat exploité : ctx = {
  * viewId, stage, layout, css(id, rules), el(tag, cls, text), reducedMotion }.
  *
  * Invariants : un seul register, une seule feuille CSS (cssOnce), un seul
  * miroir par rendu ; tous les identifiants préfixés `points-v2-e100-`, tous
  * les signaux `data-v2-e100-*` / `dataset.pointsV2E100*` ; tout DOM bâti avec
  * ctx.el et des nœuds texte (jamais innerHTML/outerHTML/insertAdjacentHTML) ;
  * ids préexistants FUSIONNÉS par aria-describedby, jamais écrasés ; zéro
  * réseau, zéro aléa, zéro timer, zéro rAF, zéro MutationObserver, zéro
  * console.*, zéro région live concurrente (E041 et la passe 1 gardent
  * l'annonce) ; le bouton du défi réagit au CLIC uniquement ; le repli sur
  * structure inattendue est silencieux ; l'installation est idempotente.
  */

const CSS_ID = 'points-v2-e100';
const SCOPE = 'points-v2-e100';
const PANEL_ID = 'points-v2-e100-mirror';
const TITLE_ID = 'points-v2-e100-title';
const RECAP_ID = 'points-v2-e100-recap';
const METHOD_ID = 'points-v2-e100-method';
const CHALLENGE_ID = 'points-v2-e100-challenge';
const ANSWER_ID = 'points-v2-e100-answer';
const REDUCED_ATTR = 'data-v2-e100-reduced';
const VIEW_IDS = ['pointsv2', 'points'];

/* Marqueurs réellement présents dans les fiches du corpus : ils ne qualifient
  * qu'un texte OBSERVÉ, jamais une case invisible. */
const DOCUMENTED = /vide justifié|omission|OM-\s*\d+/i;
const UNTREATED = /vide non traité|non traité|à documenter/i;

/* E100-V2-01 : feuille unique, TOUTES les règles préfixées par la racine
  * .points-v2-e100 posée sur .points-layout : aucune fuite hors de la vue,
  * y compris dans les requêtes média. Cibles ≥ 44 px, focus visible, repli
  * 620 px, couleurs forcées, mouvement réduit et impression sont couverts. */
const CSS = `
.points-v2-e100 .points-v2-e100-panel {
  box-sizing: border-box;
  margin: 12px 0 4px; padding: 12px 14px;
  border: 1px solid var(--line-strong, #5b5b5b);
  border-left: 3px solid var(--gold, #e6b96f); border-radius: 10px;
  background: #0b0f15; color: var(--ink-soft, #d8d8d8);
  font-size: 11px; line-height: 1.55; font-variant-numeric: tabular-nums;
}
.points-v2-e100 .points-v2-e100-title {
  margin: 0 0 6px; font-family: var(--serif, serif);
  font-size: 14px; color: var(--gold-bright, #e9c98f);
}
.points-v2-e100 .points-v2-e100-intro,
.points-v2-e100 .points-v2-e100-join,
.points-v2-e100 .points-v2-e100-limit,
.points-v2-e100 .points-v2-e100-formula,
.points-v2-e100 .points-v2-e100-value,
.points-v2-e100 .points-v2-e100-answer {
  margin: 0 0 8px; max-width: 72ch; overflow-wrap: break-word;
}
.points-v2-e100 .points-v2-e100-recap {
  margin: 0 0 8px; color: var(--muted-2, #9a9a9a);
  font-size: 10px; overflow-wrap: break-word;
}
.points-v2-e100 .points-v2-e100-checks {
  margin: 0 0 8px; padding: 0; display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;
}
.points-v2-e100 .points-v2-e100-row {
  margin: 0; padding: 8px 9px;
  border: 1px solid var(--line, #444); border-radius: 8px;
}
.points-v2-e100 .points-v2-e100-term {
  margin: 0 0 4px; color: var(--gold, #e6b96f);
  font-weight: 600; letter-spacing: .02em;
}
.points-v2-e100 .points-v2-e100-glyph {
  display: inline-block; min-width: 1.5em;
  color: var(--gold-bright, #e9c98f); font-weight: 700;
}
.points-v2-e100 .points-v2-e100-method { margin: 0 0 8px; }
.points-v2-e100 .points-v2-e100-summary {
  min-height: 44px; padding: 8px 2px;
  color: var(--gold-bright, #e9c98f); cursor: pointer;
  font: inherit; font-size: 12px; font-weight: 600;
  transition: background-color .2s ease;
}
.points-v2-e100 .points-v2-e100-summary:hover {
  background: rgba(255, 255, 255, .04);
}
.points-v2-e100 .points-v2-e100-panel:focus-visible,
.points-v2-e100 .points-v2-e100-summary:focus-visible,
.points-v2-e100 .points-v2-e100-check:focus-visible {
  outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 3px;
}
.points-v2-e100 .points-v2-e100-challenge {
  margin-top: 10px; padding-top: 8px;
  border-top: 1px solid var(--line-strong, #5b5b5b);
}
.points-v2-e100 .points-v2-e100-label {
  margin: 0 0 6px; color: var(--gold, #e6b96f); font-weight: 600;
}
.points-v2-e100 .points-v2-e100-steps {
  margin: 0 0 8px; padding-left: 20px;
}
.points-v2-e100 .points-v2-e100-steps li { margin-bottom: 4px; }
.points-v2-e100 .points-v2-e100-check {
  min-height: 44px; min-width: 44px; padding: 0 14px;
  border: 1px solid var(--line-strong, #5b5b5b); border-radius: 8px;
  background: rgba(230, 185, 111, .08); color: var(--gold-bright, #e9c98f);
  font: inherit; font-size: 11px; cursor: pointer;
}
.points-v2-e100 .points-v2-e100-check:hover {
  border-color: var(--gold-bright, #e9c98f);
}
.points-v2-e100 .points-v2-e100-answer {
  margin-top: 8px; padding: 8px 10px;
  border-left: 2px solid var(--gold, #e6b96f);
}
.points-v2-e100 .points-v2-e100-answer[hidden] { display: none; }
.points-v2-e100[` + REDUCED_ATTR + `="1"] .points-v2-e100-summary { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-v2-e100 .points-v2-e100-summary { transition: none; animation: none; }
}
@media (max-width: 620px) {
  .points-v2-e100 .points-v2-e100-panel { padding: 10px; }
  .points-v2-e100 .points-v2-e100-checks { grid-template-columns: minmax(0, 1fr); }
  .points-v2-e100 .points-v2-e100-check { width: 100%; }
}
@media (forced-colors: active) {
  .points-v2-e100 .points-v2-e100-panel,
  .points-v2-e100 .points-v2-e100-row,
  .points-v2-e100 .points-v2-e100-answer {
    border-color: CanvasText; background: Canvas; color: CanvasText;
  }
  .points-v2-e100 .points-v2-e100-title,
  .points-v2-e100 .points-v2-e100-term,
  .points-v2-e100 .points-v2-e100-glyph,
  .points-v2-e100 .points-v2-e100-summary,
  .points-v2-e100 .points-v2-e100-label,
  .points-v2-e100 .points-v2-e100-check { color: CanvasText; }
  .points-v2-e100 .points-v2-e100-check { border: 2px solid ButtonText; }
  .points-v2-e100 .points-v2-e100-summary:focus-visible,
  .points-v2-e100 .points-v2-e100-check:focus-visible { outline-color: Highlight; }
}
@media print {
  .points-v2-e100 .points-v2-e100-panel {
    border-color: #000; background: #fff; color: #000; break-inside: avoid;
  }
  .points-v2-e100 .points-v2-e100-title,
  .points-v2-e100 .points-v2-e100-term,
  .points-v2-e100 .points-v2-e100-glyph,
  .points-v2-e100 .points-v2-e100-summary,
  .points-v2-e100 .points-v2-e100-label,
  .points-v2-e100 .points-v2-e100-check { color: #000; }
}
`;

/* E100-V2-01 : gardes structurelles, réutilisées dans tout le module. */
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

function textOf(node) {
  if (typeof node === 'string') return node.replace(/\s+/g, ' ').trim();
  return node && typeof node.textContent === 'string'
    ? node.textContent.replace(/\s+/g, ' ').trim() : '';
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

/* E100-V2-10 : garde anti-doublon par identifiant préfixé. */
function nodesById(id) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
}

function enforceUnique(id, keep) {
  const found = nodesById(id);
  found.forEach((node) => { if (node !== keep) removeNode(node); });
  return keep || found[0] || null;
}

/* E100-V2-09 : fusion additive — l'id du miroir est AJOUTÉ aux relations
  * Existing, jamais substitué (E001, E002, E004, E057 et la passe 1 inclus). */
function mergeDescribedBy(node, id) {
  if (!node || typeof node.getAttribute !== 'function') return;
  const ids = (node.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (ids.indexOf(id) !== -1) return;
  ids.push(id);
  setAttr(node, 'aria-describedby', ids.join(' '));
}

/* E100-V2-02 : le compte d'une cellule est lu dans son texte, puis dans son
  * title (« … · N point(s) ») en repli. Aucune valeur n'est supposée. */
function cellCount(cell) {
  const direct = parseInt(textOf(cell), 10);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const title = cell && typeof cell.getAttribute === 'function'
    ? String(cell.getAttribute('title') || '') : '';
  const match = title.match(/(\d+)\s*point/i);
  if (match) {
    const value = parseInt(match[1], 10);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

/* E100-V2-04 : la certitude est lue sur la fiche COURANTE, jamais déduite
  * d'une couleur de cellule. Classe is-* et libellé sont deux sources
  * concordantes ; le repli reste explicite. */
function confidenceOf(detail) {
  if (!isElement(detail)) return null;
  const node = query(detail, '.points-meta .confidence') || query(detail, '.confidence');
  if (!node) return null;
  const text = textOf(node);
  const cls = typeof node.className === 'string' ? node.className : '';
  const hay = cls + ' ' + text;
  let key = 'autre';
  if (/\bis-certain\b|^certain$/i.test(hay)) key = 'certain';
  else if (/\bis-probable\b|\bprobable\b/i.test(hay)) key = 'probable';
  else if (/\bis-disput|\bdisput/i.test(hay)) key = 'disputé';
  else if (/\bis-non\b|non.document/i.test(hay)) key = 'non documenté';
  return { text: text || key, key };
}

/* E100-V2-05 : un silence est documenté quand la fiche cite une omission ou
  * une justification ; il reste non traité si le texte le dit. Sans marqueur,
  * on annonce l'absence de marqueur — jamais un statut inventé. */
function silenceSignal(detail) {
  const corpus = textOf(query(detail, '.points-justification')) + ' '
    + textOf(query(detail, '.points-sources'));
  if (DOCUMENTED.test(corpus)) return 'documented';
  if (UNTREATED.test(corpus)) return 'untreated';
  return 'unknown';
}

/* E100-V2-02 / E100-V2-03 : les trois fils sont MESURÉS ENSEMBLE sur le DOM
  * rendu. La référence de couverture est la grille complète elle-même, jamais
  * un chiffre mémorisé. Aucune grandeur n'est codée en dur. */
function measure(root) {
  const grid = query(root, '.points-grid');
  const detail = query(root, '.points-detail');
  const cells = nodes(grid, '.points-cell');
  const total = cells.length;
  let covered = 0;
  let points = 0;
  let emptyMark = '';
  cells.forEach((cell) => {
    if (cell.classList && cell.classList.contains('has-points')) {
      covered += 1;
      points += cellCount(cell);
    } else if (!emptyMark) {
      emptyMark = textOf(cell);
    }
  });
  const silences = Math.max(0, total - covered);
  const percent = total ? Math.round((covered / total) * 100) : 0;
  const head = query(grid, '.points-grid-row.is-head');
  const domains = Math.max(0, (head && head.children ? head.children.length : 0) - 1);
  const eras = nodes(grid, '.points-grid-row:not(.is-head)').length;
  const activeRow = nodes(grid, '.points-grid-row.is-active')[0] || null;
  const activeEra = activeRow ? textOf(query(activeRow, '.points-era')) : '';
  const activeEmpty = activeRow
    ? nodes(activeRow, '.points-cell').filter((cell) =>
        !cell.classList || !cell.classList.contains('has-points')).length : 0;
  return {
    grid, detail, total, covered, points, silences, percent, domains, eras,
    activeEra, activeEmpty, emptyMark,
    confidence: confidenceOf(detail),
    signal: silenceSignal(detail),
    pointTitle: textOf(query(detail, '.points-point-title')),
  };
}

function signatureOf(f) {
  return [f.total, f.covered, f.points, f.silences, f.percent, f.domains, f.eras,
    f.activeEra, f.activeEmpty, f.emptyMark,
    f.confidence ? f.confidence.key : 'none', f.signal].join('|');
}

/* E100-V2-06 / E100-V2-07 / E100-V2-08 : structure statique, bâtie une seule
  * fois par rendu avec ctx.el et des nœuds texte, sans innerHTML. Repli natif
  * <details>, bouton de défi au clic seul, aucune région live ajoutée. */
function makeRow(ctx, kind, glyph, term) {
  const row = ctx.el('div', 'points-v2-e100-row points-v2-e100-row--' + kind);
  const dt = ctx.el('dt', 'points-v2-e100-term');
  dt.appendChild(ctx.el('span', 'points-v2-e100-glyph', glyph));
  dt.appendChild(document.createTextNode(' ' + term));
  row.appendChild(dt);
  row.appendChild(ctx.el('dd', 'points-v2-e100-value points-v2-e100-value--' + kind));
  return row;
}

function buildPanel(ctx) {
  const panel = ctx.el('section', 'points-v2-e100-panel');
  panel.id = PANEL_ID;
  setAttr(panel, 'role', 'region');
  setAttr(panel, 'aria-labelledby', TITLE_ID);

  const title = ctx.el('h3', 'points-v2-e100-title',
    'Miroir de synthèse — vérifier les trois fils');
  title.id = TITLE_ID;
  panel.appendChild(title);

  panel.appendChild(ctx.el('p', 'points-v2-e100-intro',
    'La passe 1 raconte la synthèse ; ce miroir la vérifie. Il relit la grille et la fiche telles qu’elles sont rendues, affiche le calcul de chaque fil et laisse le lecteur contredire le résultat. Il ne modifie ni la passe 1 ni aucun champ du point.'));

  const checks = ctx.el('dl', 'points-v2-e100-checks');
  checks.appendChild(makeRow(ctx, 'coverage', '✓', 'Couverture'));
  checks.appendChild(makeRow(ctx, 'confidence', '≈', 'Certitude'));
  checks.appendChild(makeRow(ctx, 'silence', '○', 'Silences'));
  panel.appendChild(checks);

  const join = ctx.el('p', 'points-v2-e100-join');
  panel.appendChild(join);

  const recap = ctx.el('p', 'points-v2-e100-recap');
  recap.id = RECAP_ID;
  panel.appendChild(recap);

  const method = ctx.el('details', 'points-v2-e100-method');
  method.id = METHOD_ID;
  method.appendChild(ctx.el('summary', 'points-v2-e100-summary',
    'Comment chaque fil est-il mesuré ?'));
  method.appendChild(ctx.el('p', 'points-v2-e100-formula'));
  panel.appendChild(method);

  const challenge = ctx.el('div', 'points-v2-e100-challenge');
  challenge.id = CHALLENGE_ID;
  challenge.appendChild(ctx.el('p', 'points-v2-e100-label',
    'À vous de jouer — reconstruire la synthèse'));
  challenge.appendChild(ctx.el('ol', 'points-v2-e100-steps'));

  /* E100-V2-07 : accessibilité — région nommée (role=region + aria-labelledby),
    * cibles ≥ 44 px, focus visible en CSS, glyphe ET mot sur chaque fil, et
    * AUCUNE région live ajoutée : l'annonce reste la propriété d'E041 et de la
    * passe 1. aria-controls/aria-expanded décrivent l'état du défi. */
  const check = ctx.el('button', 'points-v2-e100-check', 'Vérifier mon compte');
  check.type = 'button';
  setAttr(check, 'aria-controls', ANSWER_ID);
  setAttr(check, 'aria-expanded', 'false');
  const answer = ctx.el('p', 'points-v2-e100-answer');
  answer.id = ANSWER_ID;
  setAttr(answer, 'hidden', '');
  check.addEventListener('click', () => {
    const wasOpen = !answer.hasAttribute('hidden');
    if (wasOpen) setAttr(answer, 'hidden', '');
    else answer.removeAttribute('hidden');
    setAttr(check, 'aria-expanded', String(!wasOpen));
    setAttr(panel, 'data-v2-e100-checked', String(!wasOpen));
  });
  challenge.append(check, answer);
  panel.appendChild(challenge);

  panel.appendChild(ctx.el('p', 'points-v2-e100-limit',
    'Limite — ce miroir mesure la complétude de la matrice AFFICHÉE, pas la véracité historique des points. Une couverture est binaire et explicite ; un silence documenté n’est pas une erreur et un point disputé n’est pas une certitude.'));

  return panel;
}

/* E100-V2-03 / E100-V2-04 / E100-V2-05 / E100-V2-06 / E100-V2-08 : tout le
  * contenu dynamique est écrit ici, à partir des grandeurs mesurées plus haut.
  * Chaque fil porte un glyphe ET un mot, jamais la couleur seule. */
function fill(ctx, panel, f) {
  const setValue = (kind, text) => {
    const node = query(panel, '.points-v2-e100-value--' + kind);
    if (node) node.textContent = text;
  };

  setValue('coverage', f.total
    ? f.covered + '/' + f.total + ' ' + plural(f.covered, 'case renseignée', 'cases renseignées')
      + ' (' + f.percent + ' %) ; référence : grille complète ' + f.total + '/' + f.total
      + '. Écart : ' + f.silences + ' ' + plural(f.silences, 'case', 'cases') + '.'
    : 'indisponible — aucune cellule mesurable dans le rendu courant.');

  setValue('confidence', f.confidence
    ? 'Fiche « ' + (f.pointTitle || 'point courant') + ' » : « ' + f.confidence.text
      + ' » (clé ' + f.confidence.key + '). Cette certitude qualifie CE point, jamais une case vide.'
    : 'aucune fiche affichée : l’absence de fiche ne dit rien de la certitude d’un éventuel point.');

  const signalWord = f.signal === 'documented'
    ? 'vide justifié documenté (ID d’omission ou justification)'
    : f.signal === 'untreated'
      ? 'non traité — reste à documenter'
      : 'aucun marqueur explicite (qui n’est pas une preuve de traitement)';
  setValue('silence', f.silences + ' ' + plural(f.silences, 'case vide', 'cases vides')
    + (f.emptyMark ? ' (marque « ' + f.emptyMark + ' »)' : '')
    + ' ; fiche : ' + signalWord + '.');

  const join = query(panel, '.points-v2-e100-join');
  if (join) {
    join.textContent = f.total
      ? 'Synthèse — COMBIEN : ' + f.covered + '/' + f.total + ' (' + f.percent
        + ' %) ; SUR QUOI : ' + (f.confidence ? f.confidence.text : 'aucun point affiché')
        + ' ; CE QUI RESTE : ' + f.silences + ' ' + plural(f.silences, 'case', 'cases')
        + '. Lus ensemble : ' + f.points + ' ' + plural(f.points, 'point', 'points')
        + ' sur ' + f.eras + ' ' + plural(f.eras, 'ère', 'ères') + ' et ' + f.domains + ' '
        + plural(f.domains, 'domaine', 'domaines') + '.'
      : 'Synthèse indisponible : sans matrice rendue, les trois fils ne peuvent pas être reliés.';
  }

  const recap = query(panel, '.points-v2-e100-recap');
  if (recap) {
    recap.textContent = f.total
      ? f.covered + '/' + f.total + ' · ' + f.percent + ' % · '
        + (f.confidence ? f.confidence.key : 'aucune certitude') + ' · '
        + f.silences + ' ' + plural(f.silences, 'vide', 'vides') + '.'
      : 'matrice absente — relevé non disponible.';
  }

  const formula = query(panel, '.points-v2-e100-formula');
  if (formula) {
    formula.textContent = f.total
      ? 'Couverture = ' + f.covered + ' ÷ ' + f.total + ' = ' + f.percent
        + ' % ; référence grille complète = ' + f.total + ' ÷ ' + f.total
        + '. Certitude = lecture de .points-meta .confidence sur la fiche. Silences = '
        + f.total + ' − ' + f.covered + ' = ' + f.silences
        + ', qualifiés par la justification et les sources de la fiche. Aucun chiffre n’est codé en dur.'
      : 'Le calcul demande une matrice rendue : il n’y a rien à diviser tant que la grille est absente.';
  }

  const steps = query(panel, '.points-v2-e100-steps');
  if (steps) {
    const items = [
      'Prédiction : combien de cases l’ère « ' + (f.activeEra || 'courante')
        + ' » laisse-t-elle en silences ?',
      'Réglage : placez-vous sur la ligne « ' + (f.activeEra || 'ère courante')
        + ' » de la matrice.',
      'Résultat attendu : ' + (f.activeEra
        ? f.activeEmpty + ' ' + plural(f.activeEmpty, 'silence', 'silences')
        : 'aucune ère active repérée') + '.',
      'Falsification : si votre compte diffère, la ligne a changé de périmètre — recomtez depuis le début.',
      'Débrief : ce sous-total s’inscrit dans le miroir ci-dessus ('
        + f.silences + ' ' + plural(f.silences, 'case', 'cases') + ' au total).',
    ].map((line) => ctx.el('li', '', line));
    steps.replaceChildren.apply(steps, items);
  }

  const answer = query(panel, '#' + ANSWER_ID);
  if (answer) {
    answer.textContent = f.total
      ? 'Compte vérifié : l’ère « ' + (f.activeEra || 'sans nom') + ' » porte '
        + f.activeEmpty + ' ' + plural(f.activeEmpty, 'case vide', 'cases vides')
        + ' ; la matrice en compte ' + f.silences + ' au total, dont ' + f.covered + '/'
        + f.total + ' renseignées (' + f.percent + ' %)'
        + (f.confidence ? ', fiche « ' + f.confidence.text + ' »' : '')
        + (f.signal === 'documented' ? ', silence explicitement documenté' : '') + '.'
      : 'Aucune matrice rendue : la vérification demande d’abord une grille.';
  }
}

/* E100-V2-01 / E100-V2-09 / E100-V2-10 : unique point d'entrée, gardes de
  * type, feuille unique, portée unique, ids dédupliqués, repli silencieux. */
function apply(ctx) {
  if (!ctx || VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const root = isElement(ctx.layout) ? ctx.layout
    : (isElement(ctx.stage) ? ctx.stage : null);
  if (!root) return;
  const matrix = query(root, '.points-matrix');
  if (!isElement(matrix)) return;

  ctx.css(CSS_ID, CSS);
  root.classList.add(SCOPE);

  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) setAttr(root, REDUCED_ATTR, '1');
  else if (typeof root.hasAttribute === 'function' && root.hasAttribute(REDUCED_ATTR)) {
    root.removeAttribute(REDUCED_ATTR);
  }

  const f = measure(root);
  const sig = signatureOf(f);

  /* E100-V2-10 : réconciliation par id — on conserve le miroir déjà monté dans
    * la matrice courante, on retire les nœuds périmés d'un rendu antérieur. */
  const candidates = nodesById(PANEL_ID);
  let panel = null;
  for (const candidate of candidates) {
    if (matrix.contains(candidate) && candidate.parentElement === matrix) {
      panel = candidate;
      break;
    }
  }
  candidates.forEach((node) => { if (node !== panel) removeNode(node); });

  if (!isElement(panel)) {
    panel = buildPanel(ctx);
    matrix.appendChild(panel);
  }
  enforceUnique(TITLE_ID, query(panel, '#' + TITLE_ID));
  enforceUnique(RECAP_ID, query(panel, '#' + RECAP_ID));
  enforceUnique(METHOD_ID, query(panel, '#' + METHOD_ID));
  enforceUnique(CHALLENGE_ID, query(panel, '#' + CHALLENGE_ID));
  enforceUnique(ANSWER_ID, query(panel, '#' + ANSWER_ID));

  const recap = query(panel, '.points-v2-e100-recap');
  if (getAttr(panel, 'data-v2-e100-signature') !== sig || !recap || !textOf(recap)) {
    fill(ctx, panel, f);
    setAttr(panel, 'data-v2-e100-signature', sig);
  }

  /* E100-V2-09 : signaux préfixés, distincts de la passe 1 et des autres
    * lentilles ; l'aria-describedby de la grille est complété, non écrasé. */
  mergeDescribedBy(f.grid, PANEL_ID);
  setAttr(panel, 'data-v2-e100', '1');
  setAttr(panel, 'data-v2-e100-coverage', f.total ? f.covered + '/' + f.total : 'indisponible');
  setAttr(panel, 'data-v2-e100-confidence', f.confidence ? f.confidence.key : 'aucune');
  setAttr(panel, 'data-v2-e100-silences', String(f.silences));
  setAttr(root, 'data-v2-e100', 'ready');
}

register('E100', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
