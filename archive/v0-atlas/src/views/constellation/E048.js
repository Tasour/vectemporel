import { register } from './registry.js';

/* Lentille E048 — instrumentation E2E appliquée à la légende de la vue Constellation.
 * Module autonome et tolérant : aucun appel réseau, aucune source d'aléa, aucun
 * appel de débogage, aucun minuteur ni boucle d'animation propre. Seul le layout
 * transmis par ctx est complété ; aucun fichier partagé n'est modifié.
 */

const PANEL_ID = 'e048-panel';
const JOURNAL_ID = 'e048-journal';
const ASSERT_ID = 'e048-assertions';
const SNAPSHOT_ID = 'e048-snapshot';
const READOUT_ID = 'e048-readout';
const TOGGLE_ID = 'e048-audit-toggle';

/* Compteur de cycle purement séquentiel : aucune horloge, aucune graine aléatoire. */
let cycle = 0;

function ensureNode(id, tag, className, parent, factory) {
  let node = null;
  try { node = document.getElementById(id); } catch (error) { node = null; }
  if (!node) {
    node = factory(tag, className);
    node.id = id;
  }
  if (node.parentNode !== parent) parent.appendChild(node);
  return node;
}

function safeText(node) {
  return node && typeof node.textContent === 'string' ? node.textContent.trim() : '';
}

/* Empreinte FNV-1a déterministe, utilisée comme signature d'instantané. */
function signature(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

register('E048', (ctx) => {
  /* Garde d'entrée : aucun ajout au DOM sans layout fourni. */
  if (!ctx || !ctx.layout) return;
  if (typeof ctx.css !== 'function') return;

  const layout = ctx.layout;
  if (typeof layout.querySelector !== 'function') return;
  const legend = layout.querySelector('.constellation-legend');
  if (!legend) return;
  const field = layout.querySelector('.constellation-field');
  const factory = typeof ctx.el === 'function'
    ? ctx.el
    : (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
      };

  /* Unique feuille de style de la lentille. */
  ctx.css('constellation-e048', `
  /* Panneau d'instrumentation, inséré juste sous l'en-tête légendé. */
  #e048-panel{
    margin:10px 0 4px;padding:8px 10px;
    border:1px solid rgba(230,185,111,.35);border-radius:8px;
    background:rgba(9,13,20,.86);color:var(--ink-soft,#cfd8e6);
    font:10px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;
  }
  .e048-head{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin-bottom:6px}
  .e048-title{margin:0;color:var(--gold,#e6b96f);font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
  /* E048-01 — cibles de test stables, soulignement discrètement typé. */
  .e048-entry{text-decoration:underline dotted rgba(178,139,221,.55);text-underline-offset:3px}
  /* E048-02 — témoin de complétude de la légende. */
  .constellation-legend.e048-probed::after{
    content:'· sonde ' attr(data-e048-complete-label);
    padding:1px 5px;border:1px solid rgba(230,185,111,.4);border-radius:5px;
    color:#e6b96f;font-size:8px;
  }
  .constellation-legend.e048-incomplete::after{border-color:rgba(220,130,130,.6);color:#f0b4b4}
  /* E048-06 — renvoi du focus d'un nœud vers son entrée de légende. */
  .constellation-legend[data-e048-focus]{box-shadow:0 0 0 2px rgba(230,185,111,.24)}
  .e048-entry[data-e048-focus="1"]{
    background:rgba(230,185,111,.14);border-radius:4px;
    box-shadow:0 0 0 3px rgba(230,185,111,.18);
  }
  /* E048-07 — signalement visuel d'une entrée mal étiquetée. */
  .e048-entry[data-e048-a11y="vide"],
  .e048-entry[data-e048-a11y="masqué"]{text-decoration:underline wavy #d98a8a}
  .e048-journal{margin:4px 0;padding-left:18px;max-height:104px;overflow:auto;color:#b9c4d4}
  .e048-journal li{margin:1px 0}
  .e048-assertions{
    display:grid;grid-template-columns:repeat(auto-fit,minmax(126px,1fr));
    gap:4px;margin:4px 0;padding:0;list-style:none;
  }
  .e048-assertions li{padding:3px 6px;border:1px solid rgba(120,140,165,.32);border-radius:5px}
  .e048-assertions li[data-result="1"]{border-color:rgba(120,200,150,.5);color:#bfe8cb}
  .e048-assertions li[data-result="0"]{border-color:rgba(220,130,130,.55);color:#f0b4b4}
  .e048-snapshot{margin:4px 0;color:#cbd5e1;font-variant-numeric:tabular-nums}
  #e048-readout{margin:6px 0 0;color:#f0cf8f;font-variant-numeric:tabular-nums}
  #e048-audit-toggle{
    min-height:36px;min-width:36px;padding:0 10px;
    border:1px solid var(--line,#3a4150);border-radius:7px;
    background:var(--surface-2,#141a24);color:var(--ink-soft,#cfd8e6);
    font:inherit;font-size:10px;cursor:pointer;
  }
  #e048-audit-toggle[aria-pressed="true"]{border-color:#e6b96f;background:rgba(230,185,111,.16);color:#f5e6c4}
  #e048-audit-toggle:focus-visible,.e048-entry:focus-visible{outline:2px solid #e6b96f;outline-offset:2px}
  /* E048-09 — mouvement réduit sans transition. */
  #e048-panel[data-e048-motion="reduit"] *{transition:none!important}
  /* E048-10 — la bascule replie les détails mais garde le rapport vivant. */
  #e048-panel[data-e048-audit="0"] .e048-detail{display:none}
  @media (max-width:620px){
    #e048-panel{padding:6px 8px;font-size:9px}
    .e048-journal{max-height:84px}
  }
  `);

  /* E048-01 — identifiants de test stables posés sur les trois entrées de légende. */
  const specs = [
    { key: 'sun', selector: '.legend-sun', label: 'soleil' },
    { key: 'planet', selector: '.legend-planet', label: 'repère' },
    { key: 'moon', selector: '.legend-moon', label: 'point' },
  ];
  const entries = [];
  specs.forEach((spec) => {
    const node = legend.querySelector(spec.selector);
    if (!node) return;
    node.dataset.e048Testid = `e048-legend-${spec.key}`;
    node.classList.add('e048-entry');
    entries.push({ key: spec.key, label: spec.label, node });
  });

  /* E048-02 — sonde de complétude : calcul puis attribut lisible par le CSS. */
  const complete = entries.length === specs.length
    && entries.every((entry) => safeText(entry.node).length > 0);
  legend.dataset.e048Complete = complete ? '1' : '0';
  legend.dataset.e048CompleteLabel = complete ? 'complète' : 'incomplète';
  legend.classList.add('e048-probed');
  if (complete) legend.classList.remove('e048-incomplete');
  else legend.classList.add('e048-incomplete');

  /* E048-03 — numéro de cycle séquentiel, mémorisé sur le panneau. */
  cycle += 1;

  const head = layout.querySelector('.constellation-head');
  const anchor = head && head.parentNode === layout ? head.nextSibling : null;
  const panel = ensureNode(PANEL_ID, 'section', null, layout, factory);
  if (anchor && panel.nextSibling !== anchor) layout.insertBefore(panel, anchor);
  panel.setAttribute('aria-label', 'Instrumentation E2E de la légende');
  panel.dataset.e048Cycle = String(cycle);
  if (panel.dataset.e048Audit !== '0') panel.dataset.e048Audit = '1';

  let headRow = panel.querySelector('.e048-head');
  if (!headRow) {
    headRow = factory('div', 'e048-head');
    panel.appendChild(headRow);
    headRow.appendChild(factory('h3', 'e048-title', 'Instrumentation E2E · légende'));
  }

  /* E048-10 — bascule indépendante du mode auditeur, état relu à chaque rendu. */
  const toggle = ensureNode(TOGGLE_ID, 'button', null, headRow, factory);
  if (!safeText(toggle)) {
    toggle.type = 'button';
    toggle.textContent = 'Mode auditeur';
  }
  toggle.setAttribute('aria-pressed', panel.dataset.e048Audit === '1' ? 'true' : 'false');

  const journal = ensureNode(JOURNAL_ID, 'ol', 'e048-journal e048-detail', panel, factory);
  journal.setAttribute('aria-label', 'Journal des interactions instrumentées');
  let empty = journal.querySelector('[data-e048-empty="1"]');
  if (!empty && !journal.childElementCount) {
    empty = factory('li', null, 'aucune interaction enregistrée');
    empty.dataset.e048Empty = '1';
    journal.appendChild(empty);
  }

  const assertionList = ensureNode(ASSERT_ID, 'ul', 'e048-assertions e048-detail', panel, factory);
  const snapshotNode = ensureNode(SNAPSHOT_ID, 'p', 'e048-snapshot e048-detail', panel, factory);
  const readout = ensureNode(READOUT_ID, 'p', null, panel, factory);
  if (!readout.getAttribute('role')) {
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');
  }

  /* E048-05 — grille d'assertions calculées depuis le DOM vivant. */
  const checks = [
    { id: 'A1', label: '3 entrées de légende', ok: entries.length === specs.length },
    { id: 'A2', label: 'champ présent', ok: !!field },
    { id: 'A3', label: 'champ étiqueté', ok: !!field && safeText(field.getAttribute('aria-label')).length > 0 },
    {
      id: 'A4',
      label: 'entrées exposées',
      ok: entries.every((entry) => safeText(entry.node).length > 0
        && entry.node.getAttribute('aria-hidden') !== 'true'),
    },
  ];
  let passed = 0;
  checks.forEach((check) => {
    if (check.ok) passed += 1;
    panel.dataset[`e048Assert${check.id}`] = check.ok ? '1' : '0';
    let item = assertionList.querySelector(`[data-assertion="${check.id}"]`);
    if (!item) {
      item = factory('li', null, '');
      item.dataset.assertion = check.id;
      assertionList.appendChild(item);
    }
    item.dataset.result = check.ok ? '1' : '0';
    item.textContent = `${check.id} · ${check.label} · ${check.ok ? 'OK' : 'ÉCHEC'}`;
  });

  /* E048-07 — verdict d'étiquetage porté par chaque entrée. */
  entries.forEach((entry) => {
    const text = safeText(entry.node);
    const hidden = entry.node.getAttribute('aria-hidden') === 'true';
    entry.node.dataset.e048A11y = hidden ? 'masqué' : (text.length ? 'exposé' : 'vide');
  });

  /* E048-08 — instantané déterministe des trois couches et empreinte associée. */
  const count = (selector) => (field ? field.querySelectorAll(selector).length : 0);
  const counts = [
    count('.const-layer-suns .const-sun'),
    count('.const-layer-planets .const-planet'),
    count('.const-layer-moons .const-moon'),
  ];
  const snapshotText = counts.join('/');
  const fingerprint = signature(`${cycle}:${snapshotText}:${entries.length}`);
  panel.dataset.e048Snapshot = snapshotText;
  panel.dataset.e048Fingerprint = fingerprint;
  snapshotNode.textContent = `instantané soleils/planètes/lunes ${snapshotText} · empreinte ${fingerprint}`;

  /* E048-09 — sonde de préférence de mouvement réduit, sans animation propre. */
  let reduced = false;
  try { reduced = typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion(); }
  catch (error) { reduced = false; }
  panel.dataset.e048Motion = reduced ? 'reduit' : 'plein';

  /* E048-04 — journal borné des clics sur les entrées instrumentées. */
  function record(label, key) {
    const placeholder = journal.querySelector('[data-e048-empty="1"]');
    if (placeholder) placeholder.remove();
    const line = factory('li', null, `cycle ${cycle} · clic légende ${label}`);
    line.dataset.e048Trace = key;
    journal.appendChild(line);
    while (journal.childElementCount > 5) journal.removeChild(journal.firstElementChild);
    paintReadout();
  }

  entries.forEach((entry) => {
    if (entry.node.dataset.e048ClickBound === '1') return;
    entry.node.dataset.e048ClickBound = '1';
    entry.node.addEventListener('click', () => record(entry.label, entry.key));
  });

  /* E048-06 — le focus d'un nœud est renvoyé vers son entrée de légende. */
  const focusHost = field || layout;
  if (focusHost.dataset.e048FocusBound !== '1') {
    focusHost.dataset.e048FocusBound = '1';
    focusHost.addEventListener('focusin', (event) => {
      const target = event.target;
      if (!target || !target.classList) return;
      let key = '';
      if (target.classList.contains('const-sun')) key = 'sun';
      else if (target.classList.contains('const-planet')) key = 'planet';
      else if (target.classList.contains('const-moon')) key = 'moon';
      else if (target.dataset && target.dataset.e048Testid) {
        key = target.dataset.e048Testid.replace('e048-legend-', '');
      }
      if (!key) return;
      legend.dataset.e048Focus = `e048-legend-${key}`;
      entries.forEach((entry) => {
        entry.node.dataset.e048Focus = entry.key === key ? '1' : '0';
      });
      paintReadout();
    });
    focusHost.addEventListener('focusout', () => {
      legend.dataset.e048Focus = '';
      entries.forEach((entry) => { entry.node.dataset.e048Focus = '0'; });
      paintReadout();
    });
  }

  /* E048-10 — le rapport de conformité est annoncé poliment à chaque changement. */
  function paintReadout() {
    const focus = legend.dataset.e048Focus || 'aucun';
    const mode = panel.dataset.e048Audit === '1' ? 'auditeur actif' : 'auditeur passif';
    readout.textContent = `${passed}/${checks.length} assertions · instantané ${snapshotText} · cycle ${cycle} · focus ${focus} · ${mode}`;
  }

  if (toggle.dataset.e048Bound !== '1') {
    toggle.dataset.e048Bound = '1';
    toggle.addEventListener('click', () => {
      const on = panel.dataset.e048Audit !== '1';
      panel.dataset.e048Audit = on ? '1' : '0';
      toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
      paintReadout();
    });
  }
  paintReadout();
});
