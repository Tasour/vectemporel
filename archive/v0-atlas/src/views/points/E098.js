import { register } from './registry.js';

/* Lentille POINTS E098 — Pédagogie & narration : encadré « un silence est une
 * donnée » et distinction vide justifié / vide non traité (domaine J).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E098.md — chantiers E098-01 à E098-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), le store,
 * styles.css, la coque et toute autre lentille (notamment E057, qui traite le
 * même thème sous l'angle sémantique) ne sont ni édités ni doublés : E098 ajoute
 * un encart PÉDAGOGIQUE local, non modal, qui apprend à LIRE les silences déjà
 * présents dans le DOM, sans réécrire les cellules ni le détail.
 *
 * Règle méthodologique illustrée (POINT_METHODOLOGY.md, §3.7, §4 et §12) :
 *   « Les silences sont des données : aucune source doit être explicite,
 *     jamais un vide masqué. » — un « vide justifié » est documenté par un ID
 *     d'omission ; un « vide non traité » ne l'est pas et reste à traiter.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion() (fournis par points/registry.js:28-44). Tout est dérivé du
 * DOM rendu par points.js : .points-matrix, .points-grid, .points-cell,
 * .points-filters et .points-detail (.points-point-title, .points-justification,
 * .points-sources, .points-meta .confidence). Aucune donnée historique n'est
 * inventée, aucun chiffre n'est codé en dur.
 *
 * Invariants :
 * - un seul greffon, une seule feuille CSS (cssOnce), un seul encart, un seul
 *   bouton de vérification, une seule région live par rendu ;
 * - tous les identifiants préfixés `points-e098-` ;
 * - aucun innerHTML / outerHTML / insertAdjacentHTML, aucune écriture
 *   destructive : les classes et attributs existants sont préservés, les ids
 *   de aria-describedby sont fusionnés, jamais remplacés ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.* ;
 * - le bouton de vérification réagit au CLIC uniquement (pas de minuterie) ;
 * - installation idempotente : nœuds réutilisés par identifiant, nœuds périmés
 *   retirés, second passage sans doublon.
 */

const CSS_ID = 'points-e098';
const SCOPE = 'points-e098';

const ID = {
  guide: 'points-e098-guide',
  title: 'points-e098-title',
  lede: 'points-e098-lede',
  glossary: 'points-e098-glossary',
  dfnJustified: 'points-e098-dfn-justifie',
  dfnUntreated: 'points-e098-dfn-non-traite',
  steps: 'points-e098-steps',
  caseTitle: 'points-e098-case-title',
  caseSignal: 'points-e098-case-signal',
  caseQuote: 'points-e098-case-quote',
  confidence: 'points-e098-confidence',
  readout: 'points-e098-readout',
  challenge: 'points-e098-challenge',
  check: 'points-e098-check',
  answer: 'points-e098-answer',
};

const REDUCED_ATTR = 'data-e098-reduced';

/* Marqueurs textuels réellement présents dans les fiches du corpus (ex.
 * dataset.js : justification « Cellule « vide justifié » … omission OM-002 »).
 * Ils servent UNIQUEMENT à qualifier un texte observé, jamais à inventer un
 * statut pour une case dont la vue ne dit rien. */
const DOCUMENTED = /vide justifié|omission|OM-\s*\d+/i;
const UNTREATED = /vide non traité|non traité|à documenter/i;

/* Feuille unique. Tout est sous `.points-layout` via la classe de portée posée
 * sur le conteneur, ou prefixé `points-e098-` : aucune fuite hors de la vue.
 * Les deux états se distinguent par le TEXTE et la FORME (pastille, bordure),
 * jamais par la couleur seule. Cibles ≥ 36 px, focus visible, repli 620 px,
 * couleurs forcées et mouvement réduit. */
const CSS = `
.points-layout .points-e098-guide {
  margin: 12px 0; padding: 12px 14px;
  border: 1px solid var(--line-strong, #5b5b5b);
  border-left: 3px solid var(--gold, #e6b96f); border-radius: 10px;
  background: rgba(8, 11, 16, .86); color: var(--ink-soft, #d8d8d8);
  font-size: 11px; line-height: 1.55;
}
.points-layout .points-e098-guide[hidden] { display: none; }
.points-layout .points-e098-guide:focus-visible,
.points-layout .points-e098-guide button:focus-visible {
  outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 3px;
}
.points-layout .points-e098-title {
  margin: 0 0 6px; font-family: var(--serif, serif);
  font-size: 15px; color: var(--gold-bright, #e9c98f);
}
.points-layout .points-e098-lede { margin: 0 0 10px; }
.points-layout .points-e098-label {
  margin: 12px 0 5px; color: var(--gold, #e6b96f);
  font-weight: 600; letter-spacing: .03em;
}
.points-layout .points-e098-glossary {
  margin: 0; padding: 0; display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px;
}
.points-layout .points-e098-glossary > div {
  margin: 0; padding: 8px 10px;
  border: 1px solid var(--line-strong, #5b5b5b); border-radius: 8px;
}
.points-layout .points-e098-glossary dt { margin: 0 0 4px; color: var(--gold-bright, #e9c98f); }
.points-layout .points-e098-glossary dd { margin: 0; }
.points-layout .points-e098-glossary dfn { font-style: normal; font-weight: 700; }
.points-layout .points-e098-steps,
.points-layout .points-e098-challenge ol { margin: 0 0 8px; padding-left: 20px; }
.points-layout .points-e098-steps li,
.points-layout .points-e098-challenge li { margin-bottom: 4px; }
.points-layout .points-e098-case {
  margin: 0; padding: 8px 10px;
  border: 1px dashed var(--line-strong, #5b5b5b); border-radius: 8px;
}
.points-layout .points-e098-case-title { margin: 0 0 4px; font-weight: 600; }
.points-layout .points-e098-case-signal { margin: 0 0 6px; }
.points-layout .points-e098-signal-d { font-weight: 700; }
.points-layout .points-e098-case-quote {
  margin: 0; padding-left: 8px;
  border-left: 2px solid var(--gold, #e6b96f); color: var(--muted-2, #9a9a9a);
}
.points-layout .points-e098-confidence { margin: 0 0 8px; }
.points-layout .points-e098-readout {
  margin: 8px 0 0; color: var(--gold-bright, #e9c98f);
  font-variant-numeric: tabular-nums;
}
.points-layout .points-e098-challenge {
  margin-top: 12px; padding-top: 10px;
  border-top: 1px solid var(--line-strong, #5b5b5b);
}
.points-layout .points-e098-check {
  min-height: 36px; padding: 0 12px;
  border: 1px solid var(--line-strong, #5b5b5b); border-radius: 8px;
  background: rgba(230, 185, 111, .08); color: var(--gold-bright, #e9c98f);
  font: inherit; font-size: 11px; cursor: pointer;
}
.points-layout .points-e098-check:hover { border-color: var(--gold-bright, #e9c98f); }
.points-layout .points-e098-answer {
  margin: 8px 0 0; padding: 8px 10px;
  border-left: 2px solid var(--gold, #e6b96f); color: var(--ink-soft, #d8d8d8);
}
.points-layout .points-e098-answer[hidden] { display: none; }
.points-layout[` + REDUCED_ATTR + `="1"] .points-e098-guide,
.points-layout[` + REDUCED_ATTR + `="1"] .points-e098-check { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-layout .points-e098-guide,
  .points-layout .points-e098-check { transition: none; animation: none; }
}
@media (forced-colors: active) {
  .points-layout .points-e098-guide,
  .points-layout .points-e098-glossary > div,
  .points-layout .points-e098-case { border-color: CanvasText; color: CanvasText; }
  .points-layout .points-e098-check { border: 2px solid ButtonText; }
}
@media (max-width: 620px) {
  .points-layout .points-e098-guide { padding: 10px; font-size: 10px; }
  .points-layout .points-e098-glossary { grid-template-columns: minmax(0, 1fr); }
  .points-layout .points-e098-check { width: 100%; }
}
`;

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.prototype.slice.call(root.querySelectorAll(selector)) : [];
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

/* Réutilise un nœud par identifiant ; retire un nœud périmé d'un rendu précédent
 * avant réinsertion. Garantit l'idempotence sur un DOM neuf comme sur un second
 * passage de runEnhancements sur le même DOM. */
function scopedNode(id, layout) {
  let node = layout.querySelector('#' + id);
  if (node) return node;
  const stale = document.getElementById(id);
  if (stale && !layout.contains(stale)) stale.remove();
  return null;
}

function appendTextList(el, list, items) {
  items.forEach((sentence) => list.appendChild(el('li', '', sentence)));
}

/* Le glyphe « · » affiché par points.js:46 pour une case sans point. Le nom de
 * l'ère et le domaine sont lus dans le DOM, jamais codés en dur. */
function silenceLabel(era, domain) {
  return era && domain
    ? `une cellule « · » de l'ère ${era}, domaine ${domain}`
    : 'une cellule « · » de la matrice';
}

/* E098-04 : extrait court et fidèle d'un texte réellement affiché. Aucune
 * réécriture, aucune invention : on tronque proprement sur une borne de mot. */
function excerpt(text, max) {
  const clean = txt(text);
  if (!clean) return '';
  if (clean.length <= max) return clean;
  const head = clean.slice(0, max);
  const cut = head.lastIndexOf(' ');
  return (cut > max / 2 ? head.slice(0, cut) : head) + '…';
}

/* E098-04 : qualifier un texte observé, pas une case invisible. Le statut
 * « non traité » n'est annoncé que si le texte le dit explicitement ; sinon on
 * annonce l'absence de marqueur, ce qui n'est pas une preuve de traitement. */
function signalOf(justification, sources) {
  const corpus = `${txt(justification)} ${txt(sources)}`;
  if (DOCUMENTED.test(corpus)) {
    return { key: 'documented', text: 'vide justifié — omission documentée dans cette fiche' };
  }
  if (UNTREATED.test(corpus)) {
    return { key: 'untreated', text: 'vide non traité — marqueur explicite dans cette fiche' };
  }
  return { key: 'unknown', text: 'aucun marqueur explicite dans cette fiche' };
}

/* E098-03 / E098-09 : les identifiants déjà portés par un aria-describedby sont
 * préservés ; le nôtre est fusionné, jamais substitué. */
function mergeDescribedBy(node, id) {
  if (!node || typeof node.getAttribute !== 'function') return;
  const ids = (node.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (ids.includes(id)) return;
  ids.push(id);
  put(node, 'aria-describedby', ids.join(' '));
}

function apply(ctx) {
  const { viewId, layout, css, el, reducedMotion } = ctx;
  if (viewId && viewId !== 'points') return;
  if (!layout || typeof layout.querySelector !== 'function') return;
  if (typeof css !== 'function' || typeof el !== 'function') return;

  /* E098-10 : une seule feuille, injectée par cssOnce (registry.js:13-19). */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  put(layout, 'data-points-e098', CSS_ID);

  const matrix = layout.querySelector('.points-matrix');
  const grid = layout.querySelector('.points-grid');
  const detail = layout.querySelector('.points-detail');
  if (!matrix) return;

  /* Toutes les grandeurs sont recomptées depuis le DOM rendu. */
  const head = grid ? grid.querySelector('.points-grid-row.is-head') : null;
  const domains = qa(head, 'span').slice(1).map(txt);
  const rows = qa(grid, '.points-grid-row:not(.is-head)');
  const cells = qa(grid, '.points-cell');
  const filled = cells.filter((cell) => cell.classList.contains('has-points'));
  const empty = cells.filter((cell) => !cell.classList.contains('has-points'));
  const total = cells.length;
  const coverage = total ? Math.round((filled.length / total) * 100) : 0;
  const activeRow = rows.filter((row) => row.classList.contains('is-active'))[0] || null;
  const activeEra = activeRow ? txt(activeRow.querySelector('.points-era')) : '';
  const activeEmpty = activeRow
    ? qa(activeRow, '.points-cell').filter((cell) => !cell.classList.contains('has-points')).length
    : 0;
  const sample = empty[0];
  const sampleIndex = sample ? cells.indexOf(sample) : -1;
  const sampleDomain = sampleIndex >= 0 ? (domains[sampleIndex] || '') : '';
  const sampleEra = sample ? txt(sample.parentElement && sample.parentElement.querySelector('.points-era')) : '';

  /* E098-04 : exemple travaillé, lu dans le détail réel. */
  const pointTitle = txt(detail && detail.querySelector('.points-point-title'));
  const justification = txt(detail && detail.querySelector('.points-justification'));
  const sources = txt(detail && detail.querySelector('.points-sources'));
  const confidenceNode = detail && detail.querySelector('.points-meta .confidence');
  const confidence = txt(confidenceNode);
  const signal = signalOf(justification, sources);

  /* E098-01 : un seul encart, non modal, réutilisé par identifiant. */
  let guide = scopedNode(ID.guide, layout);
  if (!guide) {
    guide = el('section', 'points-e098-guide');
    guide.id = ID.guide;
  }
  guide.replaceChildren();
  put(guide, 'role', 'note');
  put(guide, 'aria-labelledby', ID.title);
  guide.tabIndex = -1;

  const title = el('h3', 'points-e098-title', 'Un silence est une donnée');
  title.id = ID.title;
  guide.appendChild(title);

  /* E098-02 / E098-03 : la narration définit ses termes à la première
   * occurrence via <dfn>, puis mène une lecture en trois temps. */
  const lede = el('p', 'points-e098-lede');
  lede.id = ID.lede;
  lede.appendChild(document.createTextNode(
    'Une case sans point n’est pas un oubli : c’est un silence à lire. La méthodologie distingue '
      + 'deux statuts d’absence : l’un, examiné et documenté par un ID d’omission ; l’autre, encore '
      + 'sans documentation. Les deux se lisent dans la fiche, jamais dans la seule couleur d’une cellule.'));
  guide.appendChild(lede);

  const glossary = el('dl', 'points-e098-glossary');
  glossary.id = ID.glossary;
  [
    [ID.dfnJustified, 'Vide justifié', 'Silence documenté : la fiche cite une omission (ID OM-*) ou une justification explicite. Il est recevable à 100 % de couverture.'],
    [ID.dfnUntreated, 'Vide non traité', 'Silence encore sans documentation. Il reste à traiter : la couverture n’est explicite que lorsqu’il devient justifié ou couvert.'],
  ].forEach(([id, term, definition]) => {
    const group = el('div');
    const dt = el('dt');
    const dfn = el('dfn', '', term);
    dfn.id = id;
    dt.appendChild(dfn);
    group.appendChild(dt);
    group.appendChild(el('dd', '', definition));
    glossary.appendChild(group);
  });
  guide.appendChild(glossary);

  guide.appendChild(el('p', 'points-e098-label', 'Comment lire une case vide en trois temps'));
  const steps = el('ol', 'points-e098-steps');
  steps.id = ID.steps;
  appendTextList(el, steps, [
    `Repérer ${silenceLabel(sampleEra, sampleDomain)} dans la matrice : le « · » signifie zéro point validé.`,
    'Nommer le silence : lire l’étiquette de la case et le domaine de sa colonne, sans supposer une donnée absente.',
    'Documenter : ouvrir la fiche et chercher dans la justification et les sources un ID d’omission ; sans marqueur, le silence reste à traiter.',
  ]);
  guide.appendChild(steps);

  /* E098-04 : l'exemple est tiré de la fiche affichée ; s'il n'y a pas de point,
   * on le dit, sans inventer de justification. */
  guide.appendChild(el('p', 'points-e098-label', 'Exemple pris dans la fiche affichée'));
  const example = el('div', 'points-e098-case');
  const caseTitle = el('p', 'points-e098-case-title');
  caseTitle.id = ID.caseTitle;
  const caseSignal = el('p', 'points-e098-case-signal');
  caseSignal.id = ID.caseSignal;
  const badge = el('span', 'points-e098-signal-d', signal.text);
  caseSignal.appendChild(badge);
  const quote = el('blockquote', 'points-e098-case-quote');
  quote.id = ID.caseQuote;
  if (pointTitle) {
    caseTitle.textContent = `Fiche : ${excerpt(pointTitle, 90)}`;
    quote.textContent = justification
      ? `Justification observée : « ${excerpt(justification, 220)} »`
      : 'Aucune justification affichée dans cette fiche.';
  } else {
    caseTitle.textContent = 'Aucune fiche de point dans ce périmètre.';
    quote.textContent = 'Le silence est ici global : aucune justification locale à examiner.';
  }
  example.append(caseTitle, caseSignal, quote);
  guide.appendChild(example);

  /* E098-06 : la certitude qualifie un point, jamais une case vide. */
  guide.appendChild(el('p', 'points-e098-label', 'Ce que la certitude ne dit pas'));
  const confidenceText = el('p', 'points-e098-confidence');
  confidenceText.id = ID.confidence;
  confidenceText.textContent = confidence
    ? `La fiche porte la certitude « ${confidence} » : elle qualifie ce point, pas une case vide. Un point « non documenté » reste un point ; une case sans point reste un silence.`
    : 'Aucune certitude affichée : l’absence de fiche ne prouve rien sur la certitude d’un éventuel point.';
  guide.appendChild(confidenceText);

  /* E098-07 : trois grandeurs chiffrées, toutes recomptées, en région live. */
  const readout = el('p', 'points-e098-readout');
  readout.id = ID.readout;
  put(readout, 'role', 'status');
  put(readout, 'aria-live', 'polite');
  put(readout, 'aria-atomic', 'true');
  readout.textContent = `Silences : ${empty.length} case(s) vide(s) · Points : ${filled.length} case(s) renseignée(s) · Couverture : ${coverage} % (${total} cellules).`;
  guide.appendChild(readout);

  /* E098-08 : défi en cinq temps, aligné sur le comptage de l'ère courante.
   * Le bouton ne fait que basculer une réponse au CLIC : aucun timer, aucune rAF. */
  const challenge = el('div', 'points-e098-challenge');
  challenge.id = ID.challenge;
  challenge.appendChild(el('p', 'points-e098-label', 'À vous de jouer — vérifier une lecture'));
  const challengeList = el('ol');
  appendTextList(el, challengeList, [
    'Prédiction : combien de cellules « · » compte l’ère active ?',
    `Réglage : placez-vous sur la ligne « ${activeEra || 'ère courante'} » de la matrice.`,
    `Résultat attendu : ${activeEra ? `${activeEmpty} silence(s)` : 'aucune ère active repérée'}.`,
    'Falsification : si votre compte diffère, la ligne a changé de périmètre — recomtez depuis le début.',
    'Débrief : ce sous-total s’inscrit dans le total de la matrice affiché dans le récapitulatif.',
  ]);
  challenge.appendChild(challengeList);

  const check = el('button', 'points-e098-check', 'Vérifier ma lecture');
  check.id = ID.check;
  check.type = 'button';
  put(check, 'aria-controls', ID.answer);
  put(check, 'aria-expanded', 'false');
  const answer = el('p', 'points-e098-answer');
  answer.id = ID.answer;
  put(answer, 'hidden', '');
  answer.textContent = `Lecture vérifiée : l’ère « ${activeEra || 'sans nom'} » porte ${activeEmpty} case(s) vide(s) ; la matrice en compte ${empty.length} au total${signal.key === 'documented' ? ', et la fiche observée documente explicitement un silence' : ''}.`;
  check.addEventListener('click', () => {
    const open = !answer.hasAttribute('hidden');
    if (open) put(answer, 'hidden', '');
    else answer.removeAttribute('hidden');
    put(check, 'aria-expanded', String(!open));
    put(layout, 'data-points-e098-checked', String(!open));
  });
  challenge.append(check, answer);
  guide.appendChild(challenge);

  /* Insertion unique, avant les filtres (lecture : matrice → guide → commandes). */
  const filters = layout.querySelector('.points-filters');
  const anchor = filters && filters.parentElement === matrix ? filters.nextSibling : null;
  if (guide.parentNode !== matrix || guide.nextSibling !== anchor) matrix.insertBefore(guide, anchor);

  /* E098-05 : relier la matrice à l'encart sans écraser les relations déjà
   * posées par E001, E002, E004 ou E057. */
  mergeDescribedBy(grid, ID.guide);

  /* E098-09 : miroirs d'état auditables et mouvement réduit (JS + feuille). */
  if (typeof reducedMotion === 'function' && reducedMotion()) put(layout, REDUCED_ATTR, '1');
  else if (layout.hasAttribute(REDUCED_ATTR)) layout.removeAttribute(REDUCED_ATTR);
  put(layout, 'data-points-e098-silences', String(empty.length));
  put(layout, 'data-points-e098-filled', String(filled.length));
  put(layout, 'data-points-e098-signal', signal.key);
}

register('E098', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
