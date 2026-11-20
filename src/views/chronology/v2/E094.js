import { register } from './registry.js';

/* Lentille E094 — passe V2, domaine J (pédagogie & narration).
 * Thème : « défi en 5 temps (prédiction → falsification) ».
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E094.md — chantiers E094-01 à E094-10.
 * Fichier possédé : src/views/chronology/v2/E094.js uniquement. Rapport possédé :
 * le présent dossier d'audit uniquement. Aucun fichier partagé n'est modifié
 * (registry.js, index.js, styles.css, src/views/chronology.js, passe 1 et autres
 * lentilles laissés intacts).
 *
 * Contrat exploité : viewId 'chronologyv2', stage, layout, css, el, reducedMotion.
 * Une seule feuille CSS : ctx.css('chronology-v2-e094', CSS). Tous les IDs DOM
 * sont préfixés chronology-v2-e094- et protégés par une garde d'existence.
 *
 * Le défi porte sur une propriété vérifiable de la vue : le total global des
 * repères, tel que la vue l'écrit elle-même dans #atlas-chrono-status, doit
 * rester stable quand on change d'ère — seul l'affichage varie. Aucune donnée
 * historique n'est inventée : chaque chiffre affiché est relu dans le DOM.
 *
 * Invariants :
 * - un seul register('E094', install) et un seul ctx.css('chronology-v2-e094', …) ;
 * - aucun gestionnaire de touche : le routeur garde la main ;
 * - aucune région live, aucun focus programmé, aucun preventDefault ;
 * - aucune boucle rAF, aucun minuteur, aucun aléa, aucun réseau, aucune
 *   journalisation, aucun HTML brut (replaceChildren / textContent) ;
 * - le verdict est toujours « non réfuté », jamais « prouvé » : un défi
 *   falsifiable ne démontre pas une vérité, il éprouve une hypothèse.
 */

const CSS_ID = 'chronology-v2-e094';
const PANEL_ID = 'chronology-v2-e094-panel';
const TITLE_ID = 'chronology-v2-e094-title';
const STEPS_ID = 'chronology-v2-e094-steps';
const PREDICTION_ID = 'chronology-v2-e094-prediction';
const PREDICTION_NOTE_ID = 'chronology-v2-e094-prediction-note';
const SETTING_ID = 'chronology-v2-e094-setting';
const SETTING_NOTE_ID = 'chronology-v2-e094-setting-note';
const EXPECTED_ID = 'chronology-v2-e094-expected';
const VERDICT_ID = 'chronology-v2-e094-verdict';
const DEBRIEF_ID = 'chronology-v2-e094-debrief';
const PROGRESS_ID = 'chronology-v2-e094-progress';
const PREV_ID = 'chronology-v2-e094-prev';
const NEXT_ID = 'chronology-v2-e094-next';
const LIMITS_ID = 'chronology-v2-e094-limits';
const A11Y_ID = 'chronology-v2-e094-a11y';
const RENDERS_ID = 'chronology-v2-e094-renders';
const HOST_ID = 'atlas-chrono-main';
const STATUS_ID = 'atlas-chrono-status';

/* E094-01 : les cinq temps, dans l'ordre canonique de la méthode. Les libellés
   sont les cinq temps du défi falsifiable, pas une reformulation libre. */
const STEPS = Object.freeze([
  {
    titre: 'Prédiction',
    consigne: 'Avant de toucher à la frise, écrivez le nombre total de repères que vous vous attendez à retrouver après un changement d’ère.',
  },
  {
    titre: 'Réglage',
    consigne: 'Choisissez une ère dans la liste issue des bandes de la frise. La lentille ne change pas l’ère affichée : c’est à vous d’observer la vue.',
  },
  {
    titre: 'Résultat attendu',
    consigne: 'Énoncez ce qui devrait rester vrai si votre hypothèse tient : le total global lu dans la bande de statut de la vue.',
  },
  {
    titre: 'Falsification',
    consigne: 'Cherchez un cas qui contredit votre prédiction. Comparez le chiffre que vous avez annoncé au total réellement mesuré dans le DOM.',
  },
  {
    titre: 'Débrief',
    consigne: 'Reformulez ce que le défi établit et ce qu’il n’établit pas, en regard de la section « Limites et angles morts ».',
  },
]);

/* E094-08 : périmètre explicite du défi. Ces trois lignes ne sont pas des
   données historiques : elles bornent ce que l'épreuve peut ou ne peut pas
   établir, et sont lues telles quelles sans stylesheet. */
const LIMITS = Object.freeze([
  'Le défi éprouve un mécanisme d’affichage, pas l’exactitude des faits : une ère est un filtre de lecture, pas un conteneur de repères.',
  'Le total mesuré vient de la bande de statut de la vue ; si le jeu de données change, le nombre change et l’épreuve doit être rejouée.',
  'Ne sont pas testés ici les sources omises, les points disputés ni les niveaux de confiance : ils relèvent d’autres lentilles et de la section « Limites et angles morts ».',
]);

/* E094-01 et E094-07 : surlignage du temps courant porté par l'attribut, jamais
   par la seule teinte. Cinq règles générées, une par temps, sans état caché. */
const STEP_ACTIVE_CSS = STEPS.map((_, index) => `
  #${PANEL_ID}[data-e094-current="${index + 1}"] .v2e094-step[data-e094-step="${index + 1}"] {
    border-left-color: var(--gold-bright); background: rgba(230,185,111,.06);
  }
  #${PANEL_ID}[data-e094-current="${index + 1}"] .v2e094-num {
    border-color: var(--gold-bright); color: var(--gold-bright);
  }
`).join('');

/* E094-01, E094-07, E094-09 : feuille unique. Le panneau est un bloc en flux
   normal, non modal, sans tabindex : il n'ajoute aucun arrêt Tab et ne recouvre
   ni la frise ni la fiche. Les transitions sont neutralisées, jamais créées. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 12px 13px 14px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .v2e094-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 15px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .v2e094-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .v2e094-progress {
    margin: 0 0 8px; padding: 6px 8px;
    border: 1px solid var(--line); border-radius: 6px;
    color: var(--gold-bright); font-weight: 600;
  }
  #${PANEL_ID} .v2e094-nav { display: flex; gap: 8px; margin: 0 0 10px; }
  #${PANEL_ID} .v2e094-nav button {
    min-height: 44px; min-width: 44px; padding: 8px 12px;
    border: 1px solid var(--line-strong); border-radius: 6px;
    background: transparent; color: var(--ink-soft);
    font: inherit; font-size: 11px; cursor: pointer;
  }
  #${PANEL_ID} .v2e094-list { margin: 0; padding: 0; list-style: none; }
  #${PANEL_ID} .v2e094-step {
    margin: 0 0 8px; padding: 8px 10px;
    border: 1px solid var(--line); border-left: 3px solid var(--line);
    border-radius: 6px; background: transparent;
  }
  #${PANEL_ID} .v2e094-step-head { display: flex; gap: 8px; align-items: center; }
  #${PANEL_ID} .v2e094-num {
    flex: 0 0 26px; display: inline-flex; align-items: center; justify-content: center;
    min-width: 26px; height: 26px;
    border: 1px solid var(--line-strong); border-radius: 50%;
    color: var(--muted); font-size: 11px; font-weight: 700;
  }
  #${PANEL_ID} .v2e094-step-title {
    margin: 0; color: var(--ink); font-family: var(--serif);
    font-size: 13px; font-weight: 600;
  }
  #${PANEL_ID} .v2e094-consigne { margin: 6px 0 7px; color: var(--muted); }
  #${PANEL_ID} .v2e094-field { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 6px; }
  #${PANEL_ID} .v2e094-field label { flex: 1 1 220px; margin: 0; color: var(--muted-2); font-size: 10px; }
  #${PANEL_ID} input[type="text"], #${PANEL_ID} select {
    flex: 1 1 220px; min-width: 0; min-height: 44px; padding: 8px 9px;
    border: 1px solid var(--line-strong); border-radius: 6px;
    background: transparent; color: var(--ink); font: inherit; font-size: 11px;
  }
  #${PANEL_ID} .v2e094-act {
    flex: 0 0 auto; min-height: 44px; padding: 8px 12px;
    border: 1px solid var(--gold); border-radius: 6px;
    background: transparent; color: var(--gold-bright);
    font: inherit; font-size: 11px; cursor: pointer;
  }
  #${PANEL_ID} .v2e094-note { margin: 4px 0 0; color: var(--muted-2); font-size: 10px; }
  #${PANEL_ID} .v2e094-note[data-e094-state="1"] { color: var(--gold-bright); font-weight: 600; }
  #${PANEL_ID} .v2e094-note[data-e094-verdict="falsifiee"] { color: var(--ink); font-weight: 700; }
  #${PANEL_ID} .v2e094-measure {
    margin: 6px 0 0; padding: 6px 8px;
    border: 1px solid var(--line); border-radius: 6px;
    color: var(--ink-soft);
  }
  #${PANEL_ID} .v2e094-limits {
    margin: 4px 0 0; padding: 8px 10px;
    border: 1px dashed var(--line-strong); border-radius: 6px;
  }
  #${PANEL_ID} .v2e094-limits h3 {
    margin: 0 0 4px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 12px; font-weight: 600;
  }
  #${PANEL_ID} .v2e094-limits ul { margin: 0; padding-left: 18px; color: var(--muted); }
  #${PANEL_ID} .v2e094-foot {
    margin: 8px 0 0; padding-top: 6px;
    border-top: 1px solid var(--line); color: var(--muted-2); font-size: 10px;
  }
  #${PANEL_ID} :focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
  ${STEP_ACTIVE_CSS}
  @media (max-width: 620px) {
    #${PANEL_ID} .v2e094-nav { flex-wrap: wrap; }
    #${PANEL_ID} .v2e094-field label,
    #${PANEL_ID} input[type="text"], #${PANEL_ID} select { flex-basis: 100%; }
  }
  /* E094-09 : neutralisation défensive d'un mouvement hérité, sans en créer. */
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * {
      animation: none !important; transition: none !important;
      scroll-behavior: auto !important;
    }
  }
  @media (prefers-contrast: more) {
    #${PANEL_ID} .v2e094-step { border-width: 2px; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, #${PANEL_ID} .v2e094-step, #${PANEL_ID} .v2e094-limits {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .v2e094-title, #${PANEL_ID} .v2e094-step-title,
    #${PANEL_ID} .v2e094-progress, #${PANEL_ID} .v2e094-num,
    #${PANEL_ID} .v2e094-note, #${PANEL_ID} .v2e094-act,
    #${PANEL_ID} .v2e094-measure, #${PANEL_ID} .v2e094-limits h3 { color: CanvasText; }
  }
`;

let installs = 0;
let activeStep = 1;
let prediction = '';
let predictionNumber = null;
let setting = '';
let expected = '';
let verdict = { label: 'non testé', code: 'non-teste' };
let debriefShown = false;
let reduced = false;
let refs = {
  panel: null, progress: null, predictionNote: null, settingNote: null,
  expected: null, verdict: null, debrief: null, a11y: null, renders: null,
  select: null, options: [],
};

/* E094-10 : garde d'existence. La coque reconstruisant le stage, un nœud de la
   rendu précédent est détaché : on le réutilise et on le déplace dans le parent
   courant plutôt que d'en créer un doublon. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function setData(node, key, value) {
  if (node && node.dataset[key] !== value) node.dataset[key] = value;
}

/* E094-04 et E094-05 : toute mesure est relue dans le DOM vivant. Aucune date,
   aucun total et aucun nom d'ère n'est codé en dur dans le module. */
function measure() {
  const status = document.getElementById(STATUS_ID);
  const text = status ? (status.textContent || '') : '';
  const global = text.match(/rang global\s+(\d+)\s*\/\s*(\d+)/);
  const search = text.match(/Recherche dans les\s+(\d+)\s+repères/);
  const shown = text.match(/(\d+)\s+repère\(s\)\s+affiché\(s\)\s+sur\s+(\d+)/);
  return {
    total: global ? Number(global[2]) : search ? Number(search[1]) : 0,
    shown: shown ? Number(shown[1]) : 0,
    scope: shown ? Number(shown[2]) : 0,
    bands: document.querySelectorAll('.era-band').length,
    cards: document.querySelectorAll('.event-card').length,
    points: document.querySelectorAll('.point').length,
    source: global ? 'rang global' : search ? 'périmètre de recherche' : 'indisponible',
  };
}

/* E094-03 : les options du réglage sont dérivées des bandes réellement
   présentes. Une signature évite de reconstruire la liste sans changement. */
function refreshOptions(select) {
  const bands = Array.from(document.querySelectorAll('.era-band'));
  const options = bands.map((band, index) => ({
    id: band.dataset.eraId || band.id || `ere-${index + 1}`,
    label: ((band.querySelector('span') || {}).textContent || band.textContent || `Ère ${index + 1}`).trim(),
  }));
  const signature = options.map((item) => `${item.id}\u0000${item.label}`).join('\u0001');
  if (select.dataset.e094Options !== signature) {
    const nodes = options.map((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.label;
      return option;
    });
    select.replaceChildren(...nodes);
    setData(select, 'e094Options', signature);
  }
  if (setting && options.some((item) => item.id === setting)) select.value = setting;
  return options;
}

function describeSetting(options) {
  if (!setting) return 'Aucun réglage noté pour l’instant.';
  const found = options.find((item) => item.id === setting);
  return found
    ? `Réglage noté : ère « ${found.label} » (bande présente dans la frise).`
    : `Réglage noté : ${setting} (bande absente de la frise actuelle).`;
}

/* E094-06 : le débrief distingue explicitement « non réfuté » et « prouvé ». */
function describeDebrief(m) {
  if (!debriefShown) return '';
  return `Débrief : le défi a porté sur ${m.bands} bande(s) d’ère et ${m.cards} carte(s) affichée(s), pour un total global de ${m.total} repère(s) lu dans « ${m.source} ». Une hypothèse non réfutée n’est pas une vérité démontrée : elle résiste à cette épreuve-ci, dans l’état courant du DOM.`;
}

/* E094-01, E094-02, E094-07 à E094-10 : un seul rafraîchissement écrit tout
   l'état visible et ses attributs, en dédupliquant chaque écriture. */
function paint() {
  const r = refs;
  const m = measure();
  if (!r.panel || !r.panel.isConnected) return;

  setData(r.panel, 'e094Current', String(activeStep));
  setData(r.panel, 'e094Progress', `${activeStep}/${STEPS.length}`);
  setData(r.panel, 'e094Reduced', reduced ? '1' : '0');
  write(r.progress, `Temps ${activeStep} sur ${STEPS.length} — ${STEPS[activeStep - 1].titre}.`);

  const options = r.select ? refreshOptions(r.select) : [];
  if (r.settingNote) {
    write(r.settingNote, describeSetting(options));
    setData(r.settingNote, 'e094State', setting ? '1' : '0');
  }
  write(r.expected, expected);
  write(r.verdict, verdict.label);
  setData(r.verdict, 'e094Verdict', verdict.code);
  write(r.debrief, describeDebrief(m));
  setData(r.debrief, 'e094State', debriefShown ? '1' : '0');
  write(r.a11y, `Contrôles étiquetés, cibles de 44 px, numéros et texte porteurs de l’état, mouvement réduit : ${reduced ? 'oui' : 'non'}, repli forced-colors actif.`);
  write(r.renders, `Rendus du greffon : ${installs}. Mesure courante : ${m.shown} affiché(s) sur ${m.scope}, total ${m.total}, ${m.bands} ère(s), ${m.cards} carte(s), ${m.points} point(s).`);
}

function addNote(make, parent, id, className) {
  const node = make('p', className);
  node.id = id;
  parent.appendChild(node);
  return node;
}

function addAct(make, parent, index, handler) {
  const button = make('button', 'v2e094-act', `Valider le temps ${index + 1}`);
  button.type = 'button';
  button.id = `chronology-v2-e094-act-${index + 1}`;
  button.setAttribute('aria-label', `Valider le temps ${index + 1} : ${STEPS[index].titre}`);
  button.addEventListener('click', handler);
  parent.appendChild(button);
  return button;
}

function onPrediction() {
  const input = document.getElementById(PREDICTION_ID);
  prediction = input ? (input.value || '').trim() : '';
  const found = prediction.match(/\d+[\d\s\u00a0]*/);
  predictionNumber = found ? Number(found[0].replace(/[\s\u00a0]/g, '')) : null;
  paint();
}

function onSetting() {
  const select = document.getElementById(SETTING_ID);
  setting = select ? select.value : '';
  paint();
}

function onExpected() {
  const m = measure();
  expected = m.total
    ? `Résultat attendu : si l’hypothèse tient, le total global de ${m.total} repère(s) lu dans « ${m.source} » reste inchangé quand l’affichage passe à ${m.shown} repère(s) sur ${m.bands} ère(s).`
    : 'Résultat attendu indisponible : la bande de statut de la vue ne fournit aucun total lisible.';
  paint();
}

function onFalsify() {
  const m = measure();
  if (!m.total) verdict = { label: 'Indéterminé — aucun total mesurable dans la bande de statut.', code: 'indetermine' };
  else if (predictionNumber === null) verdict = { label: `Indéterminé — vous aviez prédit « ${prediction || 'rien'} » sans chiffre : saisissez un nombre au temps 1 pour rendre l’épreuve falsifiable.`, code: 'indetermine' };
  else if (predictionNumber === m.total) verdict = { label: `Non réfutée — votre prédiction (${predictionNumber}) égale le total mesuré (${m.total}).`, code: 'non-refutee' };
  else verdict = { label: `Falsifiée — vous aviez prédit ${predictionNumber}, le total mesuré est ${m.total} (source : ${m.source}).`, code: 'falsifiee' };
  paint();
}

function onDebrief() {
  debriefShown = true;
  paint();
}

function buildStep(make, step, index) {
  const item = make('li', 'v2e094-step');
  item.dataset.e094Step = String(index + 1);
  const head = make('div', 'v2e094-step-head');
  head.append(make('span', 'v2e094-num', String(index + 1)), make('h3', 'v2e094-step-title', step.titre));
  const body = make('div', 'v2e094-step-body');
  body.appendChild(make('p', 'v2e094-consigne', step.consigne));

  if (index === 0) {
    const field = make('div', 'v2e094-field');
    const label = make('label', 'v2e094-label', 'Votre prédiction (un nombre suffit)');
    label.htmlFor = PREDICTION_ID;
    const input = make('input', 'v2e094-input');
    input.type = 'text';
    input.id = PREDICTION_ID;
    input.value = prediction;
    input.setAttribute('autocomplete', 'off');
    field.append(label, input);
    body.appendChild(field);
    refs.predictionNote = addNote(make, body, PREDICTION_NOTE_ID, 'v2e094-note');
    addAct(make, body, index, onPrediction);
    if (prediction) write(refs.predictionNote, `Prédiction enregistrée : « ${prediction} ».`);
    setData(refs.predictionNote, 'e094State', prediction ? '1' : '0');
  } else if (index === 1) {
    const field = make('div', 'v2e094-field');
    const label = make('label', 'v2e094-label', 'Ère à examiner');
    label.htmlFor = SETTING_ID;
    const select = make('select', 'v2e094-input');
    select.id = SETTING_ID;
    field.append(label, select);
    body.appendChild(field);
    refs.select = select;
    refs.settingNote = addNote(make, body, SETTING_NOTE_ID, 'v2e094-note');
    addAct(make, body, index, onSetting);
  } else if (index === 2) {
    addAct(make, body, index, onExpected);
    refs.expected = addNote(make, body, EXPECTED_ID, 'v2e094-measure');
  } else if (index === 3) {
    addAct(make, body, index, onFalsify);
    refs.verdict = addNote(make, body, VERDICT_ID, 'v2e094-measure');
  } else {
    addAct(make, body, index, onDebrief);
    refs.debrief = addNote(make, body, DEBRIEF_ID, 'v2e094-measure');
  }

  item.append(head, body);
  return item;
}

function install(ctx) {
  const make = ctx && ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installs += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(HOST_ID) || ctx.stage || ctx.layout;
  if (!host || typeof host.appendChild !== 'function') return;

  const panel = ensureNode(make, PANEL_ID, 'section', 'v2e094-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);
  setData(panel, 'e094View', ctx.viewId || 'chronologyv2');

  const title = make('h2', 'v2e094-title', 'Défi en cinq temps — éprouver une hypothèse');
  title.id = TITLE_ID;
  const lede = make('p', 'v2e094-lede', 'Hypothèse : changer d’ère filtre l’affichage, il ne change pas le total des repères du pays. Ce défi ne démontre rien : il tente de réfuter cette affirmation en cinq temps.');

  const progress = make('p', 'v2e094-progress');
  progress.id = PROGRESS_ID;
  const nav = make('div', 'v2e094-nav');
  const prev = make('button', 'v2e094-nav-btn', '← Temps précédent');
  prev.type = 'button';
  prev.id = PREV_ID;
  prev.setAttribute('aria-label', 'Aller au temps précédent du défi');
  const next = make('button', 'v2e094-nav-btn', 'Temps suivant →');
  next.type = 'button';
  next.id = NEXT_ID;
  next.setAttribute('aria-label', 'Aller au temps suivant du défi');
  prev.addEventListener('click', () => {
    activeStep = Math.max(1, activeStep - 1);
    paint();
  });
  next.addEventListener('click', () => {
    activeStep = Math.min(STEPS.length, activeStep + 1);
    paint();
  });
  nav.append(prev, next);

  const list = make('ol', 'v2e094-list');
  list.id = STEPS_ID;
  STEPS.forEach((step, index) => list.appendChild(buildStep(make, step, index)));

  const limits = make('aside', 'v2e094-limits');
  limits.id = LIMITS_ID;
  limits.setAttribute('aria-label', 'Limites et angles morts du défi');
  limits.appendChild(make('h3', '', 'Limites et angles morts du défi'));
  const limitList = make('ul');
  LIMITS.forEach((text) => limitList.appendChild(make('li', '', text)));
  limits.appendChild(limitList);

  const a11y = make('p', 'v2e094-foot');
  a11y.id = A11Y_ID;
  const renders = make('p', 'v2e094-foot');
  renders.id = RENDERS_ID;

  panel.replaceChildren(title, lede, progress, nav, list, limits, a11y, renders);

  reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = {
    panel, progress,
    select: refs.select || null,
    predictionNote: refs.predictionNote || null,
    settingNote: refs.settingNote || null,
    expected: refs.expected || null,
    verdict: refs.verdict || null,
    debrief: refs.debrief || null,
    a11y, renders, options: [],
  };
  paint();
}

register('E094', install);
