import { register, mondeDiagnostics } from './registry.js';

/* Lentille M50 — Synthèse et dettes de la vue Monde (domaine E).
 *
 * M50 ne possède ni moteur, ni masque, ni boucle, ni région live : il consolide
 * les garanties livrées par les autres lentilles et rend visibles les dettes
 * structurelles vérifiables dans les fichiers partagés lus. Aucun correctif
 * n'est tenté ici : les fichiers possédés par d'autres lentilles restent intacts.
 *
 * Dettes affichées (cf. UNIFIED_AUDIT/MONDE/views/M50.md) :
 *   D-01 registre non purgé (SYNTHESE.md annonce une purge absente de registry.js)
 *   D-02 couverture 784 (globe.js:373) contre 845 (dataset.js:13)
 *   D-03 moteur absent de ctx, chemin nominal onReady (registry.js:7-12)
 *   D-04 cycle de vie délégué à globe.js, M06, M07, M08, M10
 *   D-05 palette de picking figée à 10 codes (globe-reveal.js:11-22)
 *   D-06 région live unique, HUD des greffons en aria-hidden (globe.js:71-85)
 *
 * Aucun abonnement au registre, aucune boucle propre, aucun timer, aucun
 * observateur d'intersection, aucune sonde de préférence, aucun réseau, aucun
 * aléa, aucune journalisation, aucune donnée inventée.
 */

const CSS_ID = 'monde-m50';
const PANEL_ID = 'monde-m50-synthese';
const GUARANTEES_ID = 'monde-m50-guarantees';
const DEBTS_ID = 'monde-m50-debts';
const SCOPE_ID = 'monde-m50-scope';

/* Palette de référence : 10 codes déclarés en globe-reveal.js:11-22,
 * alignés sur les 10 pays de dataset.js:10. Aucune autre valeur n'est supposée. */
const PICK_CODES = 10;

/* Dettes structurelles, relevées dans les fichiers lus. Les libellés sont
 * volontairement courts : le détail sourcé vit dans le rapport, pas dans le HUD. */
const DEBTS = Object.freeze([
  ['D-01', 'registre non purgé'],
  ['D-02', 'couverture 784/845'],
  ['D-03', 'moteur hors ctx'],
  ['D-04', 'cycle délégué'],
  ['D-05', 'palette 10 codes'],
  ['D-06', 'live unique'],
]);
const DEBT_CODES = DEBTS.map((entry) => entry[0]).join(',');

/* État module : un panneau, un compteur de rendus. Aucun abonnement au registre
 * (M50-02) : apply() est idempotent et reconstruit son contenu à chaque rendu. */
let renderCount = 0;
let panel = null;

const CSS = `
  #${PANEL_ID} {
    position: absolute; left: 16px; bottom: 58px; z-index: 3;
    max-width: min(300px, 44vw); padding: 7px 10px;
    border: 1px solid var(--line, #262a35); border-radius: 8px;
    background: rgba(8,11,16,.86); color: var(--muted, #9aa6b8);
    font: 11px/1.45 system-ui, sans-serif; font-variant-numeric: tabular-nums;
    pointer-events: none;
  }
  #${PANEL_ID} .m50-kicker {
    display: block; margin-bottom: 3px;
    font-size: 9px; letter-spacing: .14em; text-transform: uppercase;
    color: var(--ink-soft, #c9d2e0);
  }
  #${PANEL_ID} p { margin: 0 0 3px; }
  #${PANEL_ID} p:last-child { margin-bottom: 0; }
  #${PANEL_ID} .m50-guarantees { color: var(--ink-soft, #c9d2e0); }
  #${PANEL_ID} .m50-debts { color: var(--gold-bright, #e6b96f); }
  #${PANEL_ID} .m50-scope { color: var(--muted, #9aa6b8); }
  @media (max-width: 700px) {
    #${PANEL_ID} { left: 8px; bottom: 44px; max-width: min(210px, 54vw); font-size: 10px; }
    #${PANEL_ID} .m50-guarantees { display: none; }
  }
`;

function safeList(value) {
  return Array.isArray(value) ? value : [];
}

/* M50-08 : toute grandeur affichée est dérivée de ctx.countries. Les gardes
 * évitent « undefined » sur un pays partiel, sans jamais inventer de valeur. */
function domainSummary(countries) {
  const list = safeList(countries);
  let events = 0;
  let points = 0;
  for (const country of list) {
    if (!country || typeof country !== 'object') continue;
    events += safeList(country.events).length;
    points += safeList(country.points).length;
  }
  return { countries: list.length, events, points };
}

/* M50-10 : seules les données publiques du registre sont lues, jamais
 * mutées : mondeDiagnostics() expose des tableaux partagés. */
function readDiagnostics() {
  try {
    const data = mondeDiagnostics();
    return {
      entries: safeList(data && data.entries),
      diagnostics: safeList(data && data.diagnostics),
    };
  } catch {
    return { entries: [], diagnostics: [] };
  }
}

function ensurePanel(scene) {
  if (panel && panel.isConnected) return panel;
  panel = document.getElementById(PANEL_ID);
  if (!panel && scene && typeof scene.appendChild === 'function') {
    panel = document.createElement('div');
    panel.id = PANEL_ID;
    /* M50-07 : cible d'audit visuel, pas une source d'annonce supplémentaire. */
    panel.setAttribute('aria-hidden', 'true');
    const kicker = document.createElement('span');
    kicker.className = 'm50-kicker';
    kicker.textContent = 'Synthèse Monde · dettes';
    const guarantees = document.createElement('p');
    guarantees.id = GUARANTEES_ID;
    guarantees.className = 'm50-guarantees';
    const debts = document.createElement('p');
    debts.id = DEBTS_ID;
    debts.className = 'm50-debts';
    const scope = document.createElement('p');
    scope.id = SCOPE_ID;
    scope.className = 'm50-scope';
    panel.append(kicker, guarantees, debts, scope);
    scene.appendChild(panel);
  }
  return panel;
}

/* M50-04 : le seul état lu est le miroir déclaratif posé par syncEngine()
 * (globe.js:156). Aucune API du moteur, aucune bibliothèque 3D globale,
 * aucune lecture de métriques GPU. */
function phaseOf(host) {
  return host && host.dataset && host.dataset.globeActive === '1' ? 'globe actif' : 'globe au repos';
}

/* M50-01/02/03/05/06/07/08/09/10 : unique point d'écriture du panneau. */
function paint(summary, diag, host) {
  const guarantees = document.getElementById(GUARANTEES_ID);
  if (guarantees) {
    guarantees.textContent =
      `${diag.entries.length} greffons déclarés · moteur, rendu, drapeau et voix tous délégués (globe.js, M06, M07, M08, M10, M20).`;
  }
  const debts = document.getElementById(DEBTS_ID);
  if (debts) {
    debts.textContent =
      `${DEBTS.length} dettes : ${DEBT_CODES} · ${diag.diagnostics.length} erreur(s) de greffon.`;
  }
  const scope = document.getElementById(SCOPE_ID);
  if (scope) {
    scope.textContent =
      `${summary.countries} pays · ${summary.events} repères · ${summary.points} points (ctx.countries) · ${PICK_CODES} codes de picking · ${phaseOf(host)}.`;
  }

  if (!host || !host.dataset) return;
  host.dataset.m50Renders = String(renderCount);
  host.dataset.m50Debts = String(DEBTS.length);
  host.dataset.m50DebtList = DEBT_CODES;
  host.dataset.m50RuntimeErrors = String(diag.diagnostics.length);
  host.dataset.m50Lenses = String(diag.entries.length);
  host.dataset.m50RenderBudget = 'delegated';
  host.dataset.m50Source = 'ctx.countries';
  host.dataset.m50Phase = phaseOf(host);
}

register('M50', (ctx) => {
  if (!ctx) return;
  renderCount += 1;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);
  ensurePanel(ctx.scene);
  paint(domainSummary(ctx.countries), readDiagnostics(), ctx.host);
});
