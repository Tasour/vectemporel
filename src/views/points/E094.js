import { register } from './registry.js';

/* Lentille E094 — Pédagogie & narration : défi en 5 temps (domaine J).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E094.md — chantiers E094-01 à E094-10.
 * Fichier possédé : ce module uniquement. Aucun fichier partagé n'est édité :
 * ni src/views/points.js, ni le registre, ni styles.css, ni la coque.
 *
 * Le défi conduit l'utilisateur dans l'ordre falsifiable :
 *   prédiction → réglage → résultat attendu → falsification → débrief.
 * Hypothèse testée, formulée par l'élève : « changer un filtre modifie-t-il les
 * chiffres de la matrice ? » Les deux seules sources de vérité sont le DOM
 * rendu (`.points-cell`, `.view-kicker` du détail) et le filtre réellement
 * changé par l'utilisateur via `.points-filters`. Aucun chiffre historique,
 * aucune date, aucun total n'est codé en dur.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion (fournis par
 * points/registry.js:28-44). Aucune dépendance vers le store, le routeur, la
 * coque ou une autre lentille : le greffon reste actif avec le ctx minimal.
 *
 * Invariants :
 * - une seule feuille CSS, un seul panneau, une seule région live, un seul
 *   bouton d'action contextuel à la fois, un seul relevé « avant » par défi ;
 * - le réglage est un filtre natif de points.js : E094 n'écrit jamais dans le
 *   store et ne remplace aucun gestionnaire existant ;
 * - aucun écouteur global, aucun MutationObserver, aucun timer, aucune rAF,
 *   aucun réseau, aucun aléa, aucun appel à la console, aucun innerHTML ;
 * - greffon idempotent : nœuds réutilisés par identifiant ou reconstruits sur
 *   rendu neuf, sans doublon ni référence périmée ; progression volatile.
 */

const CSS_ID = 'points-e094';
const SCOPE = 'points-e094';
const PANEL_ID = 'points-e094-panel';
const TITLE_ID = 'points-e094-title';
const STEPS_ID = 'points-e094-steps';
const BODY_ID = 'points-e094-body';
const LIVE_ID = 'points-e094-live';
const METRICS_ID = 'points-e094-metrics';
const QUESTION_ID = 'points-e094-question';
const NEXT_ID = 'points-e094-next';
const RESTART_ID = 'points-e094-restart';

const STEP_LABELS = Object.freeze([
  'Prédiction', 'Réglage', 'Résultat attendu', 'Falsification', 'Débrief',
]);
const PREDICTIONS = Object.freeze({
  change: 'Les chiffres de la matrice vont changer',
  same: 'Les chiffres de la matrice vont rester identiques',
});

/* Feuille unique. Tout est soit préfixé `points-e094-`, soit porté par la
 * classe `.points-e094` posée sur `.points-matrix` : aucune fuite hors de la
 * vue Points, aucune ressource externe, cibles tactiles ≥ 36 px et focus visible. */
const CSS = `
  .points-e094 { --e094-accent: var(--gold-bright, #e9c98f); }
  #${PANEL_ID} {
    margin: 12px 0 0; padding: 12px 14px;
    border: 1px solid var(--line-strong, #5b5b5b);
    border-left: 3px solid var(--gold, #e6b96f); border-radius: 10px;
    background: rgba(8, 11, 16, .94); color: var(--ink-soft, #d8d8d8);
    font-size: 12px; line-height: 1.55; font-variant-numeric: tabular-nums;
  }
  #${PANEL_ID}:focus-visible, #${PANEL_ID} button:focus-visible,
  #${PANEL_ID} input:focus-visible { outline: 2px solid var(--e094-accent); outline-offset: 3px; }
  #${PANEL_ID} h2 {
    margin: 0 0 6px; font-family: var(--serif, serif);
    font-size: 16px; color: var(--e094-accent);
  }
  #${PANEL_ID} p { margin: 0 0 8px; }
  #${PANEL_ID} .points-e094-intro { color: var(--muted, #9a9a9a); font-size: 11px; }
  #${PANEL_ID} .points-e094-restart {
    min-height: 36px; margin: 2px 0 10px; padding: 6px 10px;
    border: 1px solid var(--line-strong, #5b5b5b); border-radius: 8px;
    background: rgba(230, 185, 111, .06); color: var(--e094-accent);
    font: inherit; font-size: 11px; cursor: pointer;
  }
  #${PANEL_ID} .points-e094-restart:hover { border-color: var(--e094-accent); }
  #${STEPS_ID} {
    display: flex; flex-wrap: wrap; gap: 4px 6px;
    margin: 0 0 6px; padding: 0; list-style: none;
  }
  #${STEPS_ID} .points-e094-step {
    padding: 3px 7px; border: 1px solid var(--line-strong, #5b5b5b);
    border-radius: 999px; color: var(--muted, #9a9a9a); font-size: 10px;
  }
  #${STEPS_ID} .points-e094-step[aria-current="step"] {
    border-color: var(--e094-accent); color: var(--e094-accent);
    font-weight: 700; text-decoration: underline; text-underline-offset: 3px;
  }
  #${PANEL_ID} .points-e094-progress {
    margin: 0 0 8px; color: var(--gold, #e6b96f); font-size: 10px;
    letter-spacing: .03em;
  }
  #${PANEL_ID} .points-e094-lead { color: var(--e094-accent); font-weight: 600; }
  #${PANEL_ID} .points-e094-question { font-size: 13px; }
  #${PANEL_ID} .points-e094-choice {
    margin: 0 0 8px; padding: 8px 10px;
    border: 1px solid var(--line-strong, #5b5b5b); border-radius: 8px;
  }
  #${PANEL_ID} .points-e094-legend { padding: 0 4px; color: var(--gold, #e6b96f); font-size: 11px; }
  #${PANEL_ID} .points-e094-option { display: flex; align-items: center; gap: 8px; min-height: 36px; }
  #${PANEL_ID} .points-e094-radio { width: 24px; height: 24px; margin: 0; accent-color: var(--gold, #e6b96f); }
  #${PANEL_ID} .points-e094-option-label { flex: 1 1 auto; min-height: 36px; padding: 8px 2px; cursor: pointer; }
  #${PANEL_ID} .points-e094-hint { color: var(--muted-2, #808080); font-size: 10px; }
  #${PANEL_ID} .points-e094-highlight {
    margin: 8px 0; padding: 7px 9px;
    border-left: 2px solid var(--gold, #e6b96f);
    background: rgba(230, 185, 111, .06); color: var(--ink, #f5e9d0);
  }
  #${PANEL_ID} .points-e094-facts {
    display: grid; grid-template-columns: minmax(96px, auto) minmax(0, 1fr);
    gap: 3px 10px; margin: 0 0 10px; font-size: 11px;
  }
  #${PANEL_ID} .points-e094-facts dt { color: var(--muted, #9a9a9a); font-weight: 600; }
  #${PANEL_ID} .points-e094-facts dd { margin: 0; overflow-wrap: anywhere; }
  #${PANEL_ID} .points-e094-verdict {
    margin: 0 0 8px; padding: 7px 9px;
    border: 1px solid var(--line-strong, #5b5b5b); border-radius: 8px;
    color: var(--e094-accent); font-weight: 600;
  }
  #${PANEL_ID} .points-e094-limit { color: var(--muted, #9a9a9a); font-size: 11px; font-style: italic; }
  #${NEXT_ID}, #${PANEL_ID} .points-e094-next {
    min-height: 44px; margin: 4px 0 0; padding: 8px 14px;
    border: 1px solid var(--line-strong, #5b5b5b); border-radius: 8px;
    background: rgba(230, 185, 111, .10); color: var(--e094-accent);
    font: inherit; font-size: 12px; cursor: pointer;
  }
  #${NEXT_ID}:hover { border-color: var(--e094-accent); }
  #${LIVE_ID} {
    position: absolute !important; width: 1px; height: 1px;
    margin: -1px; padding: 0; overflow: hidden;
    clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0;
  }
  #${METRICS_ID} {
    margin: 8px 0 0; color: var(--muted-2, #808080);
    font-size: 10px; font-variant-numeric: tabular-nums;
  }
  @media (max-width: 700px) {
    #${PANEL_ID} .points-e094-facts { grid-template-columns: minmax(0, 1fr); }
    #${PANEL_ID} .points-e094-next, #${PANEL_ID} .points-e094-restart { width: 100%; }
    #${STEPS_ID} .points-e094-step { font-size: 9px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID} button { transition: none; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, #${STEPS_ID} .points-e094-step, #${PANEL_ID} .points-e094-choice {
      border-color: CanvasText; color: CanvasText; background: Canvas;
    }
    #${STEPS_ID} .points-e094-step[aria-current="step"] { border-color: Highlight; }
  }
`;

let latest = null;          // dernier ctx reçu
let panel = null;           // panneau du défi, reconstruit à chaque rendu neuf
let body = null;            // bloc des 5 temps, seul remplacé à chaque étape
let stepsList = null;       // ordonnance des 5 temps
let progressNode = null;    // « Étape N sur 5 »
let live = null;            // région live locale, dédupliquée
let metrics = null;         // compteurs auditables, hors région live

let step = 0;               // 0..4
let prediction = '';        // 'change' | 'same'
let beforeSignature = '';   // relevé de la matrice avant réglage
let beforeDetail = '';      // relevé du détail avant réglage
let beforeSummary = '';     // résumé chiffré avant réglage
let filterChanged = '';     // libellé du filtre réellement modifié
let filterAfter = '';       // valeur choisie dans le filtre
let awaitingRender = false; // le changement de filtre déclenche un rendu asynchrone
let outcome = null;         // résultat de la confrontation, calculé à la vérification
let completed = 0;          // défis menés jusqu'au débrief
let refuted = 0;            // prédictions infirmées par l'observation
let lastAnnouncement = '';
let renderedSignature = ''; // anti-écriture du bloc d'étape

function nodes(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function txt(node) {
  return node && typeof node.textContent === 'string' ? node.textContent.trim() : '';
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function rootOf(ctx) {
  if (ctx && ctx.layout && typeof ctx.layout.querySelector === 'function') return ctx.layout;
  if (ctx && ctx.stage && typeof ctx.stage.querySelector === 'function') return ctx.stage;
  return null;
}

/* Toutes les grandeurs sont recomputées depuis le DOM rendu : zéro total,
 * zéro millésime et zéro nom de domaine codés en dur. */
function matrixStats(ctx) {
  const cells = nodes(rootOf(ctx), '.points-grid .points-cell');
  let total = 0;
  cells.forEach((cell) => {
    const value = parseInt(txt(cell), 10);
    if (Number.isFinite(value) && value > 0) total += value;
  });
  return { cells: cells.length, total };
}

function matrixSignature(ctx) {
  return nodes(rootOf(ctx), '.points-grid .points-cell')
    .map((cell, index) => `${index}=${txt(cell)}`).join(';');
}

function detailSignature(ctx) {
  const root = rootOf(ctx);
  const kicker = root ? root.querySelector('.points-detail .view-kicker') : null;
  const title = root ? root.querySelector('.points-detail .points-point-title') : null;
  return `${txt(kicker)} | ${txt(title)}`;
}

function summaryOf(stats) {
  return `${stats.cells} cellules · ${stats.total} points comptés`;
}

function captureBefore(ctx) {
  beforeSignature = matrixSignature(ctx);
  beforeDetail = detailSignature(ctx);
  beforeSummary = summaryOf(matrixStats(ctx));
}

function predictionText() {
  return PREDICTIONS[prediction] || 'aucune prédiction enregistrée';
}

function expectedText() {
  if (prediction === 'change') {
    return 'Résultat attendu : au moins un chiffre de la matrice doit différer du relevé effectué avant le réglage.';
  }
  if (prediction === 'same') {
    return 'Résultat attendu : tous les chiffres de la matrice doivent rester identiques au relevé effectué avant le réglage.';
  }
  return 'Résultat attendu : disponible dès qu’une prédiction aura été choisie.';
}

function questionText(ctx) {
  const root = rootOf(ctx);
  const active = root ? root.querySelector('.points-grid-row.is-active .points-era') : null;
  const era = txt(active) || 'l’ère courante';
  const stats = matrixStats(ctx);
  const selects = nodes(root, '.points-filters select');
  const labels = selects.map((select) => select.getAttribute('aria-label') || 'filtre').join(' ou ');
  return `Ère affichée : ${era}. La matrice expose ${stats.cells} cellules et ${stats.total} points comptés. Si vous modifiez un filtre (${labels || 'aucun filtre disponible'}), ces chiffres vont-ils changer ?`;
}

function announce(text) {
  if (!text || text === lastAnnouncement || !live || !live.isConnected) return;
  lastAnnouncement = text;
  live.textContent = text;
}

function writeMetrics() {
  if (metrics) metrics.textContent = `Défis terminés : ${completed} · Prédictions infirmées : ${refuted}.`;
}

/* Miroirs d'état auditables : aucun journal, aucune sortie console. */
function writeSignals() {
  const root = rootOf(latest);
  const matrix = root ? root.querySelector('.points-matrix') : null;
  if (!matrix || !matrix.dataset) return;
  matrix.dataset.pointsE094Step = String(step + 1);
  matrix.dataset.pointsE094Prediction = prediction || 'none';
  matrix.dataset.pointsE094Filter = filterAfter || 'none';
  matrix.dataset.pointsE094Outcome = outcome ? (outcome.confirmed ? 'confirmed' : 'refuted') : 'pending';
}

function nextButton(ctx, label, handler) {
  const button = ctx.el('button', 'points-e094-next', label);
  button.id = NEXT_ID;
  button.type = 'button';
  button.addEventListener('click', handler);
  return button;
}

function reset() {
  step = 0;
  prediction = '';
  beforeSignature = '';
  beforeDetail = '';
  beforeSummary = '';
  filterChanged = '';
  filterAfter = '';
  awaitingRender = false;
  outcome = null;
  renderedSignature = '';
  announce('Défi réinitialisé. Étape 1 sur 5 : prédiction.');
  render();
}

function verify(ctx) {
  const matrixChanged = matrixSignature(ctx) !== beforeSignature;
  const detailChanged = detailSignature(ctx) !== beforeDetail;
  outcome = {
    matrixChanged,
    detailChanged,
    confirmed: prediction ? (prediction === 'change') === matrixChanged : false,
    afterSummary: summaryOf(matrixStats(ctx)),
    afterDetail: detailSignature(ctx),
    filterLabel: filterChanged || 'filtre non identifié',
  };
  step = 3;
  announce('Confrontation effectuée. Étape 4 sur 5 : falsification.');
  render();
}

/* Construit exactement le bloc de l'étape courante. Aucun nœud n'est réécrit
 * ailleurs que dans body.replaceChildren(...). */
function buildBody(ctx) {
  const parts = [];
  const lead = (text) => parts.push(ctx.el('p', 'points-e094-lead', text));

  if (step === 0) {
    lead('Étape 1 — Prédiction');
    const question = ctx.el('p', 'points-e094-question', questionText(ctx));
    question.id = QUESTION_ID;
    parts.push(question);
    const fieldset = ctx.el('fieldset', 'points-e094-choice');
    fieldset.appendChild(ctx.el('legend', 'points-e094-legend', 'Votre prédiction'));
    Object.keys(PREDICTIONS).forEach((key) => {
      const row = ctx.el('div', 'points-e094-option');
      const input = ctx.el('input', 'points-e094-radio');
      input.type = 'radio';
      input.name = 'points-e094-prediction';
      input.value = key;
      input.id = `points-e094-pred-${key}`;
      input.checked = prediction === key;
      input.addEventListener('change', () => {
        prediction = key;
        captureBefore(latest);
        step = 1;
        announce('Prédiction enregistrée. Étape 2 sur 5 : réglage.');
        render();
      });
      const label = ctx.el('label', 'points-e094-option-label', PREDICTIONS[key]);
      label.htmlFor = input.id;
      row.append(input, label);
      fieldset.appendChild(row);
    });
    parts.push(fieldset);
    parts.push(ctx.el('p', 'points-e094-hint',
      'Les deux affirmations seront confrontées au relevé réel : choisissez celle que vous pensez vérifiable.'));
    return parts;
  }

  if (step === 1) {
    lead('Étape 2 — Réglage');
    parts.push(ctx.el('p', '',
      'Ouvrez l’une des deux listes de filtres de la vue (« Filtrer par domaine » ou « Filtrer par famille ») et choisissez une autre valeur. La vue recalcule alors la matrice et le détail ; E094 n’écrit jamais dans le store et ne remplace aucun gestionnaire.'));
    parts.push(ctx.el('p', 'points-e094-hint', `Relevé avant réglage : ${beforeSummary} · Détail : ${beforeDetail}.`));
    if (awaitingRender) {
      parts.push(nextButton(ctx, 'Continuer après le réglage', () => {
        awaitingRender = false;
        step = 2;
        announce('Réglage appliqué. Étape 3 sur 5 : résultat attendu.');
        render();
      }));
    } else {
      parts.push(nextButton(ctx, 'Aller au filtre de famille', () => {
        const selects = nodes(rootOf(latest), '.points-filters select');
        const target = selects[1] || selects[0];
        if (!target || typeof target.focus !== 'function') return;
        target.focus();
        announce(`Focus placé sur ${target.getAttribute('aria-label') || 'le filtre'}.`);
      }));
    }
    return parts;
  }

  if (step === 2) {
    lead('Étape 3 — Résultat attendu');
    parts.push(ctx.el('p', '', `Votre prédiction : « ${predictionText()} ».`));
    parts.push(ctx.el('p', 'points-e094-highlight', expectedText()));
    parts.push(ctx.el('p', 'points-e094-hint',
      'Cette attente découle de votre seule prédiction : elle n’est pas encore confrontée aux chiffres relevés après le réglage.'));
    parts.push(nextButton(ctx, 'Vérifier dans la matrice', verify.bind(null, latest)));
    return parts;
  }

  if (step === 3) {
    lead('Étape 4 — Falsification');
    const facts = ctx.el('dl', 'points-e094-facts');
    [
      ['Prédiction', predictionText()],
      ['Attente', expectedText()],
      ['Filtre utilisé', outcome ? outcome.filterLabel : 'non identifié'],
      ['Matrice avant', beforeSummary],
      ['Matrice après', outcome ? outcome.afterSummary : 'non relevée'],
      ['Matrice modifiée ?', outcome && outcome.matrixChanged ? 'oui' : 'non'],
      ['Détail avant', beforeDetail],
      ['Détail après', outcome ? outcome.afterDetail : 'non relevé'],
      ['Détail modifié ?', outcome && outcome.detailChanged ? 'oui' : 'non'],
    ].forEach(([key, value]) => {
      facts.appendChild(ctx.el('dt', '', key));
      facts.appendChild(ctx.el('dd', '', value));
    });
    parts.push(facts);
    parts.push(ctx.el('p', 'points-e094-verdict', outcome && outcome.confirmed
      ? 'Prédiction confirmée par l’observation.'
      : 'Prédiction infirmée par l’observation.'));
    parts.push(ctx.el('p', 'points-e094-limit',
      'Limite falsifiable : ce test ne mesure que la réactivité de la matrice au filtre. Il ne prouve ni l’exactitude des dates, ni la présence des sources. Un changement de la matrice infirmerait l’hypothèse d’indépendance ; sa stabilité ne la démontre pas absolument.'));
    parts.push(nextButton(ctx, 'Lire le débrief', () => {
      step = 4;
      completed += 1;
      if (outcome && !outcome.confirmed) refuted += 1;
      announce('Défi terminé. Étape 5 sur 5 : débrief.');
      render();
    }));
    return parts;
  }

  lead('Étape 5 — Débrief');
  parts.push(ctx.el('p', '', `Vous avez prédit : « ${predictionText()} ». Le filtre utilisé était : ${outcome ? outcome.filterLabel : 'non identifié'}.`));
  let lesson;
  if (outcome && !outcome.matrixChanged && outcome.detailChanged) {
    lesson = 'Le détail a changé sans que la matrice change : les deux panneaux répondent à deux questions différentes — la couverture (ère × domaine) d’un côté, le point sélectionné et ses sources de l’autre.';
  } else if (outcome && outcome.matrixChanged) {
    lesson = 'La matrice a changé : l’hypothèse d’indépendance des filtres est ici infirmée. Cherchez dans le rendu quel relevé a été recalculé avant de conclure.';
  } else {
    lesson = 'Ni la matrice ni le détail n’ont bougé : le réglage n’a peut-être pas été appliqué. Vérifiez la valeur du filtre avant de conclure.';
  }
  parts.push(ctx.el('p', 'points-e094-highlight', lesson));
  parts.push(ctx.el('p', 'points-e094-limit',
    'Angle mort : une matrice inchangée peut masquer un point mal daté, une source absente ou une cellule vide non justifiée. La stabilité observée ne dit rien de la vérité historique.'));
  parts.push(ctx.el('p', 'points-e094-hint',
    `Bilan cumulé : ${completed} défi(s) terminé(s), ${refuted} prédiction(s) infirmée(s).`));
  parts.push(nextButton(ctx, 'Recommencer le défi', reset));
  return parts;
}

function render() {
  if (!latest || !body) return;
  const signature = [step, prediction, awaitingRender,
    outcome ? `${outcome.matrixChanged}/${outcome.detailChanged}/${outcome.confirmed}` : ''].join('|');
  if (signature === renderedSignature) return;
  renderedSignature = signature;

  if (stepsList) {
    nodes(stepsList, '.points-e094-step').forEach((item, index) => {
      if (index === step) put(item, 'aria-current', 'step');
      else if (item.hasAttribute('aria-current')) item.removeAttribute('aria-current');
    });
  }
  if (progressNode) progressNode.textContent = `Étape ${step + 1} sur ${STEP_LABELS.length} — ${STEP_LABELS[step]}.`;
  body.replaceChildren(...buildBody(latest));
  writeMetrics();
  writeSignals();
}

/* Structure statique construite une seule fois par rendu neuf. Seul `body`
 * est remplacé ; la live et les compteurs restent en place. */
function buildPanel(ctx) {
  panel = ctx.el('section', 'points-e094-panel');
  panel.id = PANEL_ID;
  put(panel, 'role', 'region');
  put(panel, 'aria-labelledby', TITLE_ID);
  panel.tabIndex = -1;

  const title = ctx.el('h2', '', 'Défi en 5 temps — la matrice répond-elle au filtre ?');
  title.id = TITLE_ID;
  panel.appendChild(title);
  panel.appendChild(ctx.el('p', 'points-e094-intro',
    'Annoncez ce que vous allez observer, appliquez un réglage réel, puis confrontez votre prédiction au DOM. Aucun chiffre n’est inventé : tout est relevé dans la vue.'));

  const restart = ctx.el('button', 'points-e094-restart', 'Recommencer le défi');
  restart.id = RESTART_ID;
  restart.type = 'button';
  restart.addEventListener('click', reset);
  panel.appendChild(restart);

  stepsList = ctx.el('ol', 'points-e094-steps');
  stepsList.id = STEPS_ID;
  STEP_LABELS.forEach((label) => stepsList.appendChild(ctx.el('li', 'points-e094-step', label)));
  panel.appendChild(stepsList);

  progressNode = ctx.el('p', 'points-e094-progress', '');
  panel.appendChild(progressNode);

  body = ctx.el('div', 'points-e094-body');
  body.id = BODY_ID;
  panel.appendChild(body);

  live = ctx.el('p', 'points-e094-live', '');
  live.id = LIVE_ID;
  put(live, 'role', 'status');
  put(live, 'aria-live', 'polite');
  put(live, 'aria-atomic', 'true');
  panel.appendChild(live);

  metrics = ctx.el('p', 'points-e094-metrics', '');
  metrics.id = METRICS_ID;
  panel.appendChild(metrics);
}

/* Écouteurs NON destructifs : les gestionnaires natifs de points.js restent
 * actifs. Un garde par nœuf (dataset) évite tout doublon sur le même select. */
function bindFilters(ctx) {
  nodes(rootOf(ctx), '.points-filters select').forEach((select) => {
    if (select.dataset.pointsE094Bound === '1') return;
    select.dataset.pointsE094Bound = '1';
    select.addEventListener('change', () => {
      if (step !== 1) return;
      const label = select.getAttribute('aria-label') || 'filtre';
      const option = select.options && select.options[select.selectedIndex];
      filterChanged = `${label} : ${option ? txt(option) || select.value : select.value}`;
      filterAfter = select.value;
      awaitingRender = true;
      renderedSignature = '';
      render();
    });
  });
}

function install(ctx) {
  if (!ctx || ctx.viewId !== 'points'
    || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  latest = ctx;
  ctx.css(CSS_ID, CSS);

  const root = rootOf(ctx);
  if (!root) return;
  const matrix = root.querySelector('.points-matrix');
  if (!matrix) return;
  matrix.classList.add(SCOPE);

  /* Un rendu neuf recrée la matrice : le panneau déconnecté le signale. Une
   * attente de rendu (filtre juste changé) fait passer au résultat attendu ;
   * un rendu sans rapport, en cours d'attente, re-baseline silencieusement. */
  const fresh = !(panel && panel.isConnected);
  if (fresh) {
    lastAnnouncement = '';
    if (awaitingRender) {
      awaitingRender = false;
      if (step === 1) step = 2;
    } else if (step === 2) {
      captureBefore(ctx);
    }
    const stale = document.getElementById(PANEL_ID);
    if (stale) stale.remove();
    buildPanel(ctx);
  } else if (!panel || !body || !panel.isConnected
    || !document.getElementById(BODY_ID)) {
    const stale = document.getElementById(PANEL_ID);
    if (stale && stale.parentElement !== matrix) stale.remove();
    if (!panel || !panel.isConnected) buildPanel(ctx);
  }
  if (panel && panel.parentElement !== matrix) matrix.appendChild(panel);

  bindFilters(ctx);
  renderedSignature = '';
  render();
  put(matrix, 'data-points-e094', '1');
}

register('E094', install);
