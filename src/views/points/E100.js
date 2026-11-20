import { register } from './registry.js';

/* Lentille POINTS E100 — Synthèse pédagogique de la vue Points (domaine J :
 * pédagogie & narration). Rapport : UNIFIED_AUDIT/POINTS/views/E100.md —
 * chantiers E100-01 à E100-10.
 *
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), le store,
 * styles.css, la coque et toute autre lentille (notamment E091–E099, qui traitent
 * chaque thème pédagogique séparément) ne sont ni édités ni doublés : E100 ajoute
 * un récapitulatif LOCAL et non modal, accroché à .points-matrix, qui RELIE trois
 * fils déjà présents dans la vue — la COUVERTURE, la CERTITUDE et les SILENCES —
 * sans réécrire la grille ni la fiche.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion() (fournis par points/registry.js:28-44). Tout est dérivé du DOM
 * rendu par points.js : .points-grid/.points-grid-row/.points-era/.points-cell
 * (.has-points), .points-filters (2 <select> + bouton de réinitialisation) et
 * .points-detail (.points-point-title/-text/-meta/.confidence/.points-families/
 * .points-sources/.points-justification/.points-nav). Aucune valeur historique
 * n'est inventée, aucun chiffre de couverture n'est codé en dur.
 *
 * Invariants :
 * - un seul greffon, une seule feuille CSS (cssOnce), un seul panneau, une seule
 *   région live, un seul défi, un seul observateur par rendu ;
 * - tous les identifiants préfixés `points-e100-`, tous les signaux `pointsE100` ;
 * - aucun innerHTML / outerHTML / insertAdjacentHTML, aucune écriture destructive :
 *   les ids et aria-describedby existants sont FUSIONNÉS, jamais écrasés ;
 * - zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.* ;
 * - le bouton du défi réagit au CLIC uniquement ;
 * - installation idempotente : nœud réutilisé par identifiant, nœud périmé retiré,
 *   second passage sans doublon.
 */

const CSS_ID = 'points-e100';
const SCOPE = 'points-e100';
const PANEL_ID = 'points-e100-synthesis';
const TITLE_ID = 'points-e100-title';
const READOUT_ID = 'points-e100-readout';
const REDUCED_ATTR = 'data-e100-reduced';

/* Marqueurs réellement présents dans les fiches du corpus. Ils ne qualifient
 * qu'un texte OBSERVÉ : aucune case invisible ne se voit attribuer un statut. */
const DOCUMENTED = /vide justifié|omission|OM-\s*\d+/i;
const UNTREATED = /vide non traité|non traité|à documenter/i;

/* Feuille unique, tout sous `.points-e100` : aucune fuite hors de la vue.
 * Les trois fils se distinguent par le TEXTE et la FORME (pastille, bordure,
 * libellé), jamais par la couleur seule. Cibles ≥ 36 px, focus visible, repli
 * 620 px, couleurs forcées et mouvement réduit. */
const CSS = `
  .points-e100 .points-e100-synthesis {
    margin: 12px 0 4px; padding: 12px 14px;
    border: 1px solid var(--line-strong, #5b5b5b);
    border-left: 3px solid var(--gold, #e6b96f); border-radius: 10px;
    background: rgba(8, 11, 16, .88); color: var(--ink-soft, #d8d8d8);
    font-size: 11px; line-height: 1.55; font-variant-numeric: tabular-nums;
  }
  .points-e100 .points-e100-synthesis[hidden] { display: none; }
  .points-e100 .points-e100-synthesis:focus-visible,
  .points-e100 .points-e100-synthesis button:focus-visible,
  .points-e100 .points-e100-synthesis summary:focus-visible {
    outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 3px;
  }
  .points-e100 .points-e100-title {
    margin: 0 0 6px; font-family: var(--serif, serif);
    font-size: 15px; color: var(--gold-bright, #e9c98f);
  }
  .points-e100 .points-e100-p { margin: 0 0 8px; overflow-wrap: anywhere; }
  .points-e100 .points-e100-label {
    margin: 10px 0 5px; color: var(--gold, #e6b96f);
    font-weight: 600; letter-spacing: .03em;
  }
  .points-e100 .points-e100-thread {
    margin: 0 0 8px; padding: 6px 9px;
    border-left: 2px solid var(--gold, #e6b96f);
  }
  .points-e100 .points-e100-thread b { color: var(--gold-bright, #e9c98f); }
  .points-e100 .points-e100-join {
    margin: 0 0 8px; padding: 8px 10px;
    border: 1px solid var(--line-strong, #5b5b5b); border-radius: 8px;
    background: rgba(230, 185, 111, .06);
  }
  .points-e100 .points-e100-glossary {
    margin: 0 0 10px; padding: 0; display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;
  }
  .points-e100 .points-e100-glossary > div {
    margin: 0; padding: 7px 9px;
    border: 1px solid var(--line-strong, #5b5b5b); border-radius: 8px;
  }
  .points-e100 .points-e100-glossary dt { margin: 0 0 4px; color: var(--gold-bright, #e9c98f); }
  .points-e100 .points-e100-glossary dd { margin: 0; }
  .points-e100 .points-e100-glossary dfn { font-style: normal; font-weight: 700; }
  .points-e100 .points-e100-readout {
    margin: 0 0 8px; padding: 6px 8px;
    border: 1px solid var(--line, #444); border-radius: 6px;
    color: var(--ink, #e8e8e8); transition: background-color .2s linear;
  }
  .points-e100 .points-e100-details { margin: 2px 0 0; }
  .points-e100 .points-e100-summary {
    min-height: 36px; display: flex; align-items: center;
    padding: 6px 8px; border: 1px solid var(--line, #444); border-radius: 6px;
    color: var(--gold, #e6b96f); cursor: pointer;
  }
  .points-e100 .points-e100-formula { margin: 6px 8px 0; color: var(--muted-2, #9a9a9a); }
  .points-e100 .points-e100-challenge {
    margin-top: 12px; padding-top: 10px;
    border-top: 1px solid var(--line-strong, #5b5b5b);
  }
  .points-e100 .points-e100-steps { margin: 0 0 8px; padding-left: 20px; }
  .points-e100 .points-e100-steps li { margin-bottom: 4px; }
  .points-e100 .points-e100-check {
    min-height: 36px; padding: 0 12px;
    border: 1px solid var(--line-strong, #5b5b5b); border-radius: 8px;
    background: rgba(230, 185, 111, .08); color: var(--gold-bright, #e9c98f);
    font: inherit; font-size: 11px; cursor: pointer;
  }
  .points-e100 .points-e100-check:hover { border-color: var(--gold-bright, #e9c98f); }
  .points-e100 .points-e100-answer {
    margin: 8px 0 0; padding: 8px 10px;
    border-left: 2px solid var(--gold, #e6b96f); color: var(--ink-soft, #d8d8d8);
  }
  .points-e100 .points-e100-answer[hidden] { display: none; }
  .points-e100[` + REDUCED_ATTR + `="1"] .points-e100-readout { transition: none; }
  @media (max-width: 620px) {
    .points-e100 .points-e100-synthesis { padding: 10px; font-size: 10px; }
    .points-e100 .points-e100-glossary { grid-template-columns: minmax(0, 1fr); }
    .points-e100 .points-e100-check { width: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-e100 .points-e100-readout { transition: none; animation: none; }
  }
  @media (forced-colors: active) {
    .points-e100 .points-e100-synthesis,
    .points-e100 .points-e100-thread,
    .points-e100 .points-e100-join,
    .points-e100 .points-e100-glossary > div,
    .points-e100 .points-e100-readout,
    .points-e100 .points-e100-summary,
    .points-e100 .points-e100-answer { border-color: CanvasText; color: CanvasText; }
    .points-e100 .points-e100-check { border: 2px solid ButtonText; }
  }
`;

let currentCtx = null;        // dernier ctx reçu, pour l'observateur
let observer = null;          // unique MutationObserver, ciblé en lecture seule
let renderedSignature = '';   // empreinte du texte, évite les réécritures redondantes
let readoutNode = null;       // région live, conservée d'un rendu à l'autre du panneau

function rootOf(ctx) {
  if (ctx && ctx.layout && typeof ctx.layout.querySelector === 'function') return ctx.layout;
  if (ctx && ctx.stage && typeof ctx.stage.querySelector === 'function') return ctx.stage;
  return null;
}

function txt(node) {
  if (typeof node === 'string') return node.trim();
  return node && typeof node.textContent === 'string' ? node.textContent.trim() : '';
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.prototype.slice.call(root.querySelectorAll(selector)) : [];
}

/* Réutilise un nœud par identifiant et retire un nœud périmé d'un rendu précédent
 * avant réinsertion : garantit l'idempotence sur un DOM neuf comme sur un second
 * passage de runEnhancements sur le même DOM. */
function scopedNode(id, root) {
  let node = root.querySelector('#' + id);
  if (node) return node;
  const stale = document.getElementById(id);
  if (stale && !root.contains(stale)) stale.remove();
  return null;
}

/* E100-02 : une cellule « has-points » porte un compte lisible. On lit d'abord
 * son texte, puis son title (« … · N point(s) ») en repli : aucun nombre n'est
 * supposé, aucune donnée du dataset n'est importée. */
function cellCount(cell) {
  const direct = parseInt(txt(cell), 10);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const title = cell && cell.getAttribute ? String(cell.getAttribute('title') || '') : '';
  const match = title.match(/(\d+)\s*point/i);
  if (match) {
    const value = parseInt(match[1], 10);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

/* E100-04 : la certitude est lue sur la fiche courante, jamais déduite d'une
 * couleur de cellule. La classe `is-*` posée par points.js:105 et le libellé
 * sont deux sources concordantes ; le repli reste explicite. */
function confidenceOf(detail) {
  if (!detail) return null;
  const node = detail.querySelector('.points-meta .confidence') || detail.querySelector('.confidence');
  if (!node) return null;
  const text = txt(node);
  const cls = String(node.className || '');
  let key = 'autre';
  if (/is-certain\b|^certain$/i.test(cls + ' ' + text)) key = 'certain';
  else if (/is-probable\b|probable/i.test(cls + ' ' + text)) key = 'probable';
  else if (/is-disput|disput/i.test(cls + ' ' + text)) key = 'disputé';
  else if (/is-non|non.document/i.test(cls + ' ' + text)) key = 'non documenté';
  return { text, key };
}

/* E100-05 : un silence est documenté quand la fiche cite une omission (ID OM-*)
 * ou une justification explicite ; il reste non traité si le texte le dit. Sans
 * marqueur, on annonce l'absence de marqueur — jamais un statut inventé. */
function silenceSignal(detail) {
  const corpus = `${txt(detail && detail.querySelector('.points-justification'))} `
    + `${txt(detail && detail.querySelector('.points-sources'))}`;
  if (DOCUMENTED.test(corpus)) return 'documented';
  if (UNTREATED.test(corpus)) return 'untreated';
  return 'unknown';
}

/* E100-02 / E100-03 : toutes les grandeurs sont MESURÉES sur le DOM rendu. La
 * référence de couverture est la grille complète elle-même (total/TOTAL), jamais
 * un chiffre mémorisé. Les trois fils sont mesurés ensemble, ici, pour être
 * racontés d'une seule voix plus bas. */
function measure(root) {
  const grid = root ? root.querySelector('.points-grid') : null;
  const detail = root ? root.querySelector('.points-detail') : null;
  const cells = qa(grid, '.points-cell');
  const covered = cells.filter((cell) => cell.classList.contains('has-points'));
  const total = cells.length;
  const coveredCount = covered.length;
  const silences = Math.max(0, total - coveredCount);
  let points = 0;
  covered.forEach((cell) => { points += cellCount(cell); });

  const head = grid ? grid.querySelector('.points-grid-row.is-head') : null;
  const domains = Math.max(0, (head ? head.children.length : 0) - 1); // « Ère » n'est pas un domaine
  const rows = qa(grid, '.points-grid-row:not(.is-head)');
  const eras = rows.length;
  const activeRow = rows.filter((row) => row.classList.contains('is-active'))[0] || null;
  const activeEra = activeRow ? txt(activeRow.querySelector('.points-era')) : '';
  const activeEmpty = activeRow
    ? qa(activeRow, '.points-cell').filter((cell) => !cell.classList.contains('has-points')).length : 0;

  const percent = total ? Math.round((coveredCount / total) * 100) : 0;
  const pointTitle = txt(detail && detail.querySelector('.points-point-title'));
  return {
    grid, detail, total, coveredCount, silences, points, domains, eras, percent,
    activeEra, activeEmpty, pointTitle,
    confidence: confidenceOf(detail),
    signal: silenceSignal(detail),
  };
}

function dash(data) {
  return data.total ? String(data.total) : '—';
}

/* E100-03 / E100-05 / E100-06 : le récit enchaîne DÉFINITION → COUVERTURE →
 * CERTITUDE → SILENCES → SYNTHÈSE → LIMITE. C'est la synthèse (5e ligne) qui
 * RELIE les trois fils : « combien / sur quoi peut-on compter / que reste-t-il
 * à documenter ». Le tiret cadratin sert de repli textuel, jamais un chiffre
 * fictif. Le texte est dans des <p> visibles, lisible sans JS. */
function buildContent(data) {
  const total = dash(data);
  const covered = data.total ? String(data.coveredCount) : '—';
  const silences = data.total ? String(data.silences) : '—';
  const points = data.total ? String(data.points) : '—';
  const eras = data.eras ? String(data.eras) : '—';
  const domains = data.domains ? String(data.domains) : '—';

  const lines = [
    'Un point d’histoire est la plus petite unité de connaissance démontrable, datable, localisable et transmissible. La matrice croise ères et domaines : chaque case porte un nombre de points validés, ou « · » lorsqu’un silence est affiché.',
    data.total
      ? `Couverture — ${covered} case(s) renseignée(s) sur ${total} (${data.percent} %) ; ${silences} case(s) en silences. Référence, grille complète : ${total}/${total}. Écart à la référence : ${silences} case(s).`
      : 'Couverture — indisponible : aucune cellule mesurable dans le rendu courant. Le panneau se tait plutôt que d’inventer un chiffre.',
    data.confidence
      ? `Certitude — la fiche « ${data.pointTitle || 'point courant'} » porte la certitude « ${data.confidence.text || data.confidence.key} ». Elle qualifie CE point, jamais une case vide : un point « disputé » reste disputé, il n'est pas résolu par un silence.`
      : 'Certitude — aucune fiche de point dans ce périmètre : l’absence de fiche ne dit rien de la certitude d’un éventuel point.',
    data.signal === 'documented'
      ? 'Silences — la fiche observée documente explicitement un vide justifié (ID d’omission ou justification) : ce silence est une donnée recevable, pas un oubli masqué.'
      : data.signal === 'untreated'
        ? 'Silences — la fiche observée porte un marqueur « non traité » : ce silence reste à documenter, la couverture n’est pas encore explicite ici.'
        : 'Silences — aucun marqueur explicite dans la fiche observée : l’absence de marqueur n’est pas une preuve de traitement.',
    data.total
      ? `Synthèse — la couverture dit COMBIEN de cases sont renseignées (${covered}/${total}) ; la certitude dit SUR QUOI l'on peut compter (${data.confidence ? data.confidence.text || data.confidence.key : 'aucun point affiché'}) ; les silences disent CE QUI RESTE à documenter (${silences} case(s)). Lus ensemble, ces trois fils forment un même récapitulatif : ${points} point(s) sur ${eras} ère(s) et ${domains} domaine(s).`
      : 'Synthèse — les trois fils (couverture, certitude, silences) ne peuvent être reliés que sur une matrice rendue : consultez la grille ci-dessus.',
    'Limite — ces grandeurs mesurent la complétude de la matrice AFFICHÉE, pas la véracité historique des points. La couverture est binaire et explicite ; un silence documenté n’est pas une erreur et un point disputé n’est pas une certitude.',
  ];

  const readout = data.total
    ? `Couverture : ${covered}/${total} (${data.percent} %) · Certitude observée : ${data.confidence ? data.confidence.text || data.confidence.key : 'aucune'} · Silences : ${silences} case(s) vide(s).`
    : 'Couverture : indisponible · Certitude : aucune · Silences : indisponibles.';

  const formula = data.total
    ? `Couverture = cases « has-points » ÷ toutes les .points-cell = ${data.coveredCount} ÷ ${data.total} = ${data.percent} %. La référence est la grille complète (${data.total} ÷ ${data.total}). La certitude est lue sur .points-meta .confidence de la fiche ; les silences sont les cases sans « has-points », qualifiées par la justification et les sources de la fiche. Aucun chiffre n'est codé en dur.`
    : 'Le calcul demande une matrice rendue : il n’y a rien à diviser tant que la grille est absente.';

  const answer = data.total
    ? `Synthèse vérifiée : l’ère « ${data.activeEra || 'sans nom'} » porte ${data.activeEmpty} case(s) vide(s) ; la matrice en compte ${silences} au total, dont ${covered}/${total} renseignées (${data.percent} %)${data.confidence ? `, et la fiche porte « ${data.confidence.text || data.confidence.key} »` : ''}${data.signal === 'documented' ? ', avec un silence explicitement documenté' : ''}.`
    : 'Aucune matrice rendue : la vérification demande d’abord une grille.';

  return { lines, readout, formula, answer };
}

function signatureOf(content) {
  return content.lines.join(' | ') + ' || ' + content.readout + ' || ' + content.formula + ' || ' + content.answer;
}

/* E100-06 / E100-07 / E100-08 : tout est construit avec ctx.el et des nœuds
 * texte, sans innerHTML. Le défi en cinq temps est aligné sur la limite (6e ligne)
 * et le bouton ne bascule la réponse qu'au CLIC — aucun timer, aucune rAF. */
function refresh(ctx, panel, data) {
  if (!panel || !ctx || typeof ctx.el !== 'function') return;
  const content = buildContent(data);
  const signature = signatureOf(content);
  if (signature === renderedSignature && readoutNode && readoutNode.isConnected) return;
  renderedSignature = signature;

  const title = ctx.el('h2', 'points-e100-title', 'Synthèse — couverture, certitude, silences');
  title.id = TITLE_ID;
  title.tabIndex = -1;

  const intro = ctx.el('p', 'points-e100-p', content.lines[0]);

  const glossary = ctx.el('dl', 'points-e100-glossary');
  [
    ['Couverture', 'Mesure COMBIEN de cases sont renseignées, rapportées à la grille complète.'],
    ['Certitude', 'Qualifie UN point (certain, probable, disputé, non documenté), jamais une case vide.'],
    ['Silence', 'Une case sans point : donnée à documenter, jamais un vide masqué.'],
  ].forEach(([term, definition]) => {
    const group = ctx.el('div');
    const dt = ctx.el('dt');
    dt.appendChild(ctx.el('dfn', '', term));
    group.appendChild(dt);
    group.appendChild(ctx.el('dd', '', definition));
    glossary.appendChild(group);
  });

  const threadLabel = ctx.el('p', 'points-e100-label', 'Les trois fils, lus séparément');
  const threads = ctx.el('div');
  [1, 2, 3].forEach((index) => {
    const raw = content.lines[index];
    const pos = raw.indexOf('—');
    const label = pos >= 0 ? raw.slice(0, pos).trim() : '';
    const rest = pos >= 0 ? raw.slice(pos + 1).trim() : raw;
    const p = ctx.el('p', 'points-e100-thread');
    if (label) p.appendChild(ctx.el('b', '', label + ' — '));
    p.appendChild(document.createTextNode(rest));
    threads.appendChild(p);
  });

  const join = ctx.el('p', 'points-e100-join', content.lines[4]);

  const readout = ctx.el('p', 'points-e100-readout', content.readout);
  readout.id = READOUT_ID;
  put(readout, 'role', 'status');
  put(readout, 'aria-live', 'polite');
  put(readout, 'aria-atomic', 'true');
  readoutNode = readout;

  const details = ctx.el('details', 'points-e100-details');
  details.appendChild(ctx.el('summary', 'points-e100-summary', 'Comment ces synthèses sont-elles calculées ?'));
  details.appendChild(ctx.el('p', 'points-e100-formula', content.formula));

  const limit = ctx.el('p', 'points-e100-p', content.lines[5]);

  const challenge = ctx.el('div', 'points-e100-challenge');
  challenge.appendChild(ctx.el('p', 'points-e100-label', 'À vous de jouer — refaire la synthèse'));
  const steps = ctx.el('ol', 'points-e100-steps');
  [
    'Prédiction : combien de cases l’ère active laisse-t-elle en silences ?',
    `Réglage : placez-vous sur la ligne « ${data.activeEra || 'ère courante'} » de la matrice.`,
    `Résultat attendu : ${data.activeEra ? `${data.activeEmpty} silence(s)` : 'aucune ère active repérée'}.`,
    'Falsification : si votre compte diffère, la ligne a changé de périmètre — recomtez depuis le début.',
    'Débrief : ce sous-total s’inscrit dans la synthèse du récapitulatif ci-dessus.',
  ].forEach((sentence) => steps.appendChild(ctx.el('li', '', sentence)));
  challenge.appendChild(steps);

  const check = ctx.el('button', 'points-e100-check', 'Vérifier ma synthèse');
  check.type = 'button';
  put(check, 'aria-controls', 'points-e100-answer');
  put(check, 'aria-expanded', 'false');
  const answer = ctx.el('p', 'points-e100-answer', content.answer);
  answer.id = 'points-e100-answer';
  put(answer, 'hidden', '');
  check.addEventListener('click', () => {
    const wasOpen = !answer.hasAttribute('hidden');
    if (wasOpen) put(answer, 'hidden', '');
    else answer.removeAttribute('hidden');
    put(check, 'aria-expanded', String(!wasOpen));
    put(panel, 'data-points-e100-checked', String(!wasOpen));
  });
  challenge.append(check, answer);

  panel.replaceChildren(title, intro, threadLabel, threads, join, readout, details, limit, challenge);
  put(readout, 'data-points-e100', 'live');
}

/* E100-09 : les ids et aria-describedby déjà portés par la grille (E001, E002,
 * E004, E057…) sont préservés ; le nôtre est FUSIONNÉ, jamais substitué. */
function mergeDescribedBy(node, id) {
  if (!node || typeof node.getAttribute !== 'function') return;
  const ids = (node.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (ids.includes(id)) return;
  ids.push(id);
  put(node, 'aria-describedby', ids.join(' '));
}

/* E100-10 : un seul observateur, ciblé sur la grille et la fiche en LECTURE
 * SEULE. Le panneau est fils de .points-matrix, hors de ces deux sous-arbres :
 * ses écritures ne peuvent donc pas déclencher l'observateur (pas de boucle). */
function observe(ctx, data) {
  if (typeof MutationObserver === 'undefined') return;
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  if (!data.grid && !data.detail) return;
  observer = new MutationObserver(() => {
    if (!currentCtx) return;
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    refresh(currentCtx, panel, measure(rootOf(currentCtx)));
  });
  if (data.grid) observer.observe(data.grid, { childList: true, characterData: true, subtree: true, attributes: true });
  if (data.detail) observer.observe(data.detail, { childList: true, characterData: true, subtree: true });
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'points') return;

  currentCtx = ctx;
  ctx.css(CSS_ID, CSS);

  const root = rootOf(ctx);
  if (!root) return;
  root.classList.add(SCOPE);

  const matrix = root.querySelector('.points-matrix');
  if (!matrix) return;
  const data = measure(root);

  /* E100-01 / E100-10 : panneau unique, non modal, réutilisé par identifiant. */
  let panel = scopedNode(PANEL_ID, root);
  if (!panel) {
    panel = ctx.el('section', 'points-e100-synthesis');
    panel.id = PANEL_ID;
  }
  put(panel, 'role', 'region');
  put(panel, 'aria-labelledby', TITLE_ID);
  if (!panel.hasAttribute('tabindex')) panel.tabIndex = -1;
  if (panel.parentNode !== matrix) matrix.appendChild(panel);

  /* E100-09 : signaux préfixés, lisibles sans occuper de nom générique. */
  mergeDescribedBy(data.grid, PANEL_ID);
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) put(root, REDUCED_ATTR, '1');
  else if (root.hasAttribute(REDUCED_ATTR)) root.removeAttribute(REDUCED_ATTR);
  root.dataset.pointsE100 = 'ready';
  root.dataset.pointsE100Coverage = data.total ? `${data.coveredCount}/${data.total}` : 'indisponible';
  root.dataset.pointsE100Confidence = data.confidence ? data.confidence.key : 'aucune';
  root.dataset.pointsE100Silences = String(data.silences);
  if (data.grid) data.grid.dataset.pointsE100 = 'measured';

  refresh(ctx, panel, data);
  observe(ctx, data);
}

register('E100', install);
