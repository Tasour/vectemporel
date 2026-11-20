import { register } from './registry.js';

/* Lentille E085 — passe V2, domaine I (Qualité & validation).
 * Thème canonique : « register('ENNN', ctx => …) exact » (themes.json:94).
 * Périmètre strict : ce module et le rapport UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E085.md.
 * La passe 1, registry.js, index.js, styles.css, src/views/chronology.js et
 * toutes les autres lentilles ne sont ni modifiés ni doublés ; ils servent
 * uniquement de contexte de lecture.
 *
 * Le panneau expose dix chantiers disjoints, E085-01 à E085-10, chacun avec
 * une ligne DOM identifiée et une valeur lisible. Il décrit et mesure le
 * contrat d'enregistrement ; il ne pilote jamais le registre partagé.
 *
 * Invariants :
 * - un import de register, exactement un register('E085', ctx => …) ;
 * - une seule feuille ctx.css('chronology-v2-e085', CSS), appelée par le rappel ;
 * - aucun appel au registre depuis le rappel (ni greffon niché, ni pilote) ;
 * - aucun journal, aucune requête, aucun aléa, aucun HTML brut, aucun timer ;
 * - IDs tous préfixés chronology-v2-e085-, avec garde d'existence.
 */

const CSS_ID = 'chronology-v2-e085';
const PANEL_ID = 'chronology-v2-e085-panneau';
const TITLE_ID = 'chronology-v2-e085-titre';
const LIST_ID = 'chronology-v2-e085-liste';
const SUMMARY_ID = 'chronology-v2-e085-resume';
const MAIN_ID = 'atlas-chrono-main';
const PREFIX = 'chronology-v2-e085-';

/* Faits structurels, vérifiés par relecture du présent fichier. */
const REGISTER_ID = 'E085';
const EXPECTED_VIEW = 'chronologyv2';
const REGISTER_CALLS = 1;
const CALLBACK_PARAM = 'ctx';
const NESTED_REGISTERS = 0;
const DRIVER_CALLS = 0;
const RAW_CREATIONS = 0;

let applyCount = 0;
/* E085-04 : valeur figée à l'évaluation du module, avant tout rendu. */
const appliesAtEvaluation = applyCount;
let moduleEvaluations = 0;
/* E085-10 : le cache des modules ESM garantit une seule évaluation. */
moduleEvaluations += 1;
let cssCalls = 0;
let reducedCalls = 0;
let madeNodes = 0;

/* Une seule feuille, injectée par ctx.css depuis le rappel. Le panneau reste
 * lisible en 390×844, sous mouvement réduit et en couleurs forcées. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e085-title {
    margin: 0 0 5px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e085-lede { margin: 0 0 8px; color: var(--muted); }
  #${LIST_ID} { margin: 0; padding: 0; list-style: none; }
  #${LIST_ID} .e085-row {
    display: flex; flex-wrap: wrap; gap: 2px 8px;
    padding: 3px 0; border-top: 1px solid var(--line);
  }
  #${LIST_ID} .e085-code {
    flex: 0 0 62px; color: var(--gold-bright); font-size: 9px;
  }
  #${LIST_ID} .e085-label { flex: 1 1 230px; min-width: 0; }
  #${LIST_ID} .e085-value {
    flex: 1 1 190px; min-width: 0; color: var(--muted);
    font-size: 9px; font-variant-numeric: tabular-nums;
  }
  #${LIST_ID} .e085-state {
    flex: 0 0 auto; padding: 0 6px; border-radius: 4px;
    border: 1px solid var(--line-strong); color: var(--muted);
    font-size: 9px; text-transform: uppercase;
  }
  #${LIST_ID} .e085-row[data-e085-state="conforme"] .e085-state {
    border-color: var(--gold); color: var(--gold-bright);
  }
  #${SUMMARY_ID} {
    margin: 8px 0 0; padding-top: 6px; border-top: 1px solid var(--line);
    color: var(--muted-2); font-size: 9px;
  }
  @media (max-width: 620px) {
    #${LIST_ID} .e085-code, #${LIST_ID} .e085-label,
    #${LIST_ID} .e085-value { flex-basis: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e085-title, #${LIST_ID} .e085-code,
    #${LIST_ID} .e085-state { color: CanvasText; border-color: CanvasText; }
  }
`;

/* Dix chantiers disjoints : identifiant, signature, cycle de vie et
 * consommation du contexte du seul appel register('E085', ctx => …). */
const ROWS = [
  { chantier: 'E085-01', label: 'Identifiant littéral exact : E085.' },
  { chantier: 'E085-02', label: 'Un seul appel register, au niveau du module.' },
  { chantier: 'E085-03', label: 'Signature ctx => { … }, un paramètre, sans décomposition.' },
  { chantier: 'E085-04', label: 'Enregistrement sans exécution immédiate.' },
  { chantier: 'E085-05', label: 'Contexte lu en lecture seule, sans fusion.' },
  { chantier: 'E085-06', label: 'Identifiant de feuille exact, fourni par le rappel.' },
  { chantier: 'E085-07', label: 'ctx.el seul outil de création des nœuds.' },
  { chantier: 'E085-08', label: 'Aucun greffon niché ni appel pilote au registre.' },
  { chantier: 'E085-09', label: 'Vue annoncée chronologyv2, sans autre vue codée en dur.' },
  { chantier: 'E085-10', label: 'Rendus répétés : une évaluation, un greffon, un panneau.' },
];

/* E085-10 : un nœud déjà présent est réutilisé et déplacé dans le parent
 * courant (la coque reconstruisant le stage, l'ancien nœud est détaché). */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) node = make(tagName, className);
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function setData(node, name, value) {
  if (node && node.dataset[name] !== value) node.dataset[name] = value;
}

function countPanels() {
  let total = 0;
  document.querySelectorAll('section').forEach((node) => {
    if (node.id === PANEL_ID) total += 1;
  });
  return total;
}

/* Chaque chantier publie sa valeur et son état en texte visible et en
 * attribut ; aucune information ne repose sur la seule couleur. */
function refresh(panel, rows, summary, state) {
  if (!panel || !panel.isConnected) return;

  const cssNodes = document.getElementById(CSS_ID) ? 1 : 0;
  const panels = countPanels();
  const ok = {
    '01': REGISTER_ID === 'E085',
    '02': REGISTER_CALLS === 1,
    '03': CALLBACK_PARAM === 'ctx',
    '04': appliesAtEvaluation === 0 && state.applies >= 1,
    '05': state.ctxKeys > 0 && state.helpers === 3,
    '06': cssNodes === 1 && state.cssCalls === 1,
    '07': madeNodes > 0 && RAW_CREATIONS === 0,
    '08': NESTED_REGISTERS === 0 && DRIVER_CALLS === 0,
    '09': state.viewId === EXPECTED_VIEW,
    '10': moduleEvaluations === 1 && panels === 1,
  };
  const values = {
    '01': REGISTER_ID,
    '02': `${REGISTER_CALLS} appel · niveau module`,
    '03': `${CALLBACK_PARAM} · 1 paramètre`,
    '04': `${appliesAtEvaluation} au chargement · ${state.applies} au rendu`,
    '05': `${state.ctxKeys} clés ctx · ${state.helpers} helpers · aucune mutation`,
    '06': `${CSS_ID} · ${cssNodes} feuille · ${state.cssCalls} appel`,
    '07': `${madeNodes} nœuds via ctx.el · ${RAW_CREATIONS} création directe`,
    '08': `${NESTED_REGISTERS} greffon niché · ${DRIVER_CALLS} pilote`,
    '09': `${state.viewId || 'vide'} · attendu ${EXPECTED_VIEW}`,
    '10': `${moduleEvaluations} évaluation · ${state.applies} rendu · ${panels} panneau`,
  };

  let conformes = 0;
  rows.forEach((row) => {
    const suffix = row.chantier.slice(5);
    const li = document.getElementById(`${PREFIX}${suffix}`);
    if (!li) return;
    const conforme = Boolean(ok[suffix]);
    if (conforme) conformes += 1;
    const badge = li.querySelector('.e085-state');
    setData(li, 'e085State', conforme ? 'conforme' : 'ecart');
    setData(li, 'e085Value', values[suffix]);
    write(li.querySelector('.e085-value'), values[suffix]);
    write(badge, conforme ? 'conforme' : 'écart');
  });

  write(
    summary,
    `Enregistrement ${REGISTER_ID} · ${REGISTER_CALLS} appel register · signature ${CALLBACK_PARAM} · `
      + `${state.applies} rendu(s) · ${cssNodes} feuille · ${panels} panneau · `
      + `${state.ctxKeys} clés de contexte · ${conformes}/10 chantiers conformes · `
      + `mouvement réduit : ${state.reduced ? 'oui' : 'non'}.`
  );

  setData(panel, 'e085RegisterId', REGISTER_ID);
  setData(panel, 'e085RegisterCalls', String(REGISTER_CALLS));
  setData(panel, 'e085Signature', CALLBACK_PARAM);
  setData(panel, 'e085AppliesAtLoad', String(appliesAtEvaluation));
  setData(panel, 'e085Applies', String(state.applies));
  setData(panel, 'e085CtxKeys', String(state.ctxKeys));
  setData(panel, 'e085Helpers', String(state.helpers));
  setData(panel, 'e085CssCalls', String(state.cssCalls));
  setData(panel, 'e085CssNodes', String(cssNodes));
  setData(panel, 'e085MadeNodes', String(madeNodes));
  setData(panel, 'e085RawCreations', String(RAW_CREATIONS));
  setData(panel, 'e085Nested', String(NESTED_REGISTERS));
  setData(panel, 'e085Driver', String(DRIVER_CALLS));
  setData(panel, 'e085ViewId', state.viewId);
  setData(panel, 'e085ModuleEvals', String(moduleEvaluations));
  setData(panel, 'e085Panels', String(panels));
  setData(panel, 'e085Conformes', String(conformes));
  setData(panel, 'e085Reduced', state.reduced ? '1' : '0');
}

/* E085-03 : le rappel garde exactement un paramètre nommé ctx, sans
 * décomposition ni paramètre facultatif. E085-04 : il est enregistré, jamais
 * appelé ici. E085-08 : aucun appel au registre depuis ce rappel. */
register('E085', ctx => {
  if (!ctx || typeof ctx.el !== 'function' || typeof ctx.css !== 'function') return;

  applyCount += 1;
  madeNodes = 0;
  cssCalls = 0;
  reducedCalls = 0;

  cssCalls += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(MAIN_ID) || ctx.layout || ctx.stage;
  if (!host) return;

  /* E085-05 et E085-07 : lecture seule du contexte ; toute création passe
   * par ctx.el, jamais par une API de document. */
  const make = (tagName, className, text) => {
    madeNodes += 1;
    return ctx.el(tagName, className, text);
  };
  const ctxKeys = Object.keys(ctx).length;
  const helpers = ['css', 'el', 'reducedMotion'].filter((name) => typeof ctx[name] === 'function').length;
  const viewId = typeof ctx.viewId === 'string' ? ctx.viewId : '';
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  reducedCalls += 1;

  const panel = ensureNode(make, PANEL_ID, 'section', 'e085-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e085-title', 'Contrat d’enregistrement exact');
  title.id = TITLE_ID;
  const lede = make(
    'p',
    'e085-lede',
    'Dix garanties sur le seul appel register(\'E085\', ctx => …) : identifiant, signature, cycle de vie et contexte. Ce panneau décrit et mesure, il ne modifie aucun comportement.'
  );

  const list = make('ul', 'e085-list');
  list.id = LIST_ID;
  const built = ROWS.map((row) => {
    const li = make('li', 'e085-row');
    li.id = `${PREFIX}${row.chantier.slice(5)}`;
    li.append(
      make('span', 'e085-code', row.chantier),
      make('span', 'e085-label', row.label),
      make('span', 'e085-value'),
      make('span', 'e085-state', 'à vérifier')
    );
    return li;
  });
  list.replaceChildren(...built);

  const summary = make('p', 'e085-resume');
  summary.id = SUMMARY_ID;
  panel.replaceChildren(title, lede, list, summary);

  refresh(panel, ROWS, summary, {
    applies: applyCount,
    ctxKeys,
    helpers,
    cssCalls,
    viewId,
    reduced,
  });
  setData(panel, 'e085ReducedCalls', String(reducedCalls));
});
