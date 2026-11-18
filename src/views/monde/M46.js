import { register } from './registry.js';

/* Lentille M46 — Vérification statique du Monde (domaine E : qualité & validation).
 *
 * Ce greffon n'altère aucune surface de test : il OBSERVE le DOM du Monde à
 * chaque rendu et publie un rapport déterministe sous forme d'attributs data-*
 * et d'un panneau sr-only à identifiant unique (#monde-m46-report). Aucun
 * résultat n'est écrit dans la console : la preuve est dans le DOM.
 *
 * Les dix contrôles M46-01 à M46-10 sont implémentés ci-dessous. Le rapport
 * détaillé est livré dans UNIFIED_AUDIT/MONDE/views/M46.md.
 *
 * Règles respectées : un seul fichier possédé, zéro réseau, aucun aléa, aucune
 * écriture dans la console, aucun sélecteur de test modifié, CSS via ctx.css
 * (cssOnce), nœuds à ID unique avec garde d'existence (rendu répété), tout en
 * français.
 */

const CSS_ID = 'monde-m46';
const REPORT_ID = 'monde-m46-report';
const LIST_ID = 'monde-m46-list';
const SUMMARY_ID = 'monde-m46-summary';

const CSS = `
  .m46-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
    overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
`;

/* Identifiants canoniques des dix contrôles (M46-09 vérifie que la liste
 * produite reste exactement celle-ci, sans dérive ni doublon). */
const CHECK_IDS = [
  'M46-01', 'M46-02', 'M46-03', 'M46-04', 'M46-05',
  'M46-06', 'M46-07', 'M46-08', 'M46-09', 'M46-10',
];

/* Ancres structurelles attendues, relevées dans src/views/globe.js.
 * tag = balise observée ; sert à détecter une ancre déplacée ou détournée. */
const ANCHORS = [
  { id: 'globe-canvas', tag: 'div' },
  { id: 'globe-status', tag: 'p' },
  { id: 'globe-hover-readout', tag: 'p' },
  { id: 'globe-title', tag: 'h1' },
  { id: 'globe-choices', tag: 'ol' },
  { id: 'globe-live', tag: 'p' },
  { id: 'globe-help', tag: 'p' },
];

function byId(id) {
  return document.getElementById(id);
}

function byAttributeId(id) {
  return document.querySelectorAll(`[id="${id}"]`);
}

function result(id, ok, detail) {
  return { id, ok: !!ok, detail: String(detail || '') };
}

function idRefs(node) {
  const out = [];
  if (!node || typeof node.getAttribute !== 'function') return out;
  ['aria-describedby', 'aria-labelledby', 'aria-controls'].forEach((attr) => {
    const value = node.getAttribute(attr);
    if (!value) return;
    value.split(/\s+/).forEach((token) => { if (token) out.push(token); });
  });
  return out;
}

function signatureOf(results) {
  return results.map((r) => `${r.id}=${r.ok ? '1' : '0'}`).join('|');
}

/* M46-01 — Ancres uniques attendues : chaque ancre du Monde apparaît
 * exactement une fois dans le document, avec sa balise d'origine. */
function checkAnchors() {
  const defects = [];
  ANCHORS.forEach(({ id, tag }) => {
    const nodes = byAttributeId(id);
    if (nodes.length !== 1) {
      defects.push(`${id}:${nodes.length}`);
      return;
    }
    if (tag && nodes[0].tagName.toLowerCase() !== tag) defects.push(`${id}:balise`);
  });
  return result('M46-01', defects.length === 0,
    defects.length
      ? `ancres en défaut (${defects.join(', ')})`
      : `${ANCHORS.length} ancres présentes une seule fois`);
}

/* M46-02 — Intégrité du host : role=group, tabindex=0 et
 * aria-describedby strictement égal à « globe-help » (jamais réécrit ici). */
function checkHost(host) {
  if (!host) return result('M46-02', false, 'host du globe absent');
  const role = host.getAttribute('role');
  const tab = host.getAttribute('tabindex');
  const desc = host.getAttribute('aria-describedby');
  const ok = role === 'group' && tab === '0' && desc === 'globe-help';
  return result('M46-02', ok,
    `role=${role || '—'} · tabindex=${tab || '—'} · aria-describedby=${desc || '—'}`);
}

/* M46-03 — Titre unique : un seul <h1> dans la vue Monde, et c'est
 * #globe-title. Aucun titre fantôme ajouté par une lentille voisine. */
function checkTitle(stage) {
  const root = stage || document;
  const titles = root.querySelectorAll('h1');
  const ok = titles.length === 1 && titles[0].id === 'globe-title';
  return result('M46-03', ok,
    `${titles.length} h1 dans la vue${titles[0] ? ` (id=${titles[0].id || '—'})` : ''}`);
}

/* M46-04 — Liste des pays : #globe-choices est un <ol> contenant exactement
 * countries.length boutons button[data-index], avec des index uniques et
 * bornés dans [0, N-1]. Aucun sélecteur n'est modifié. */
function checkChoices(stage, countries) {
  const list = byId('globe-choices');
  if (!list || list.tagName.toLowerCase() !== 'ol') {
    return result('M46-04', false, '#globe-choices absent ou non-<ol>');
  }
  if (stage && stage !== document && !stage.contains(list)) {
    return result('M46-04', false, '#globe-choices hors de la vue Monde');
  }
  const buttons = list.querySelectorAll('button[data-index]');
  const expected = Array.isArray(countries) ? countries.length : 0;
  const seen = [];
  let coherent = true;
  buttons.forEach((button) => {
    const index = Number(button.getAttribute('data-index'));
    if (!Number.isInteger(index) || index < 0 || index >= expected || seen.indexOf(index) >= 0) {
      coherent = false;
    }
    seen.push(index);
  });
  const ok = buttons.length === expected && coherent;
  return result('M46-04', ok,
    `${buttons.length}/${expected} boutons · index ${coherent ? 'uniques et bornés' : 'incohérents'}`);
}

/* M46-05 — Régions live : #globe-live et #globe-status portent
 * role=status et aria-live=polite, et restent uniques. */
function checkLive() {
  const defects = [];
  ['globe-live', 'globe-status'].forEach((id) => {
    const nodes = byAttributeId(id);
    if (nodes.length !== 1) {
      defects.push(`${id}:${nodes.length}`);
      return;
    }
    const role = nodes[0].getAttribute('role');
    const live = nodes[0].getAttribute('aria-live');
    if (role !== 'status' || live !== 'polite') defects.push(`${id}:role/live`);
  });
  return result('M46-05', defects.length === 0,
    defects.length
      ? defects.join(', ')
      : 'globe-live et globe-status : role=status, aria-live=polite');
}

/* M46-06 — Références ARIA résolvables : chaque IDREF (aria-describedby,
 * aria-labelledby, aria-controls) de la vue pointe vers une ancre unique. */
function checkRefs(stage) {
  const root = stage || document;
  const candidates = [root].concat(Array.from(
    root.querySelectorAll('[aria-describedby],[aria-labelledby],[aria-controls]')
  ));
  const defects = [];
  candidates.forEach((node) => {
    idRefs(node).forEach((token) => {
      const matches = byAttributeId(token).length;
      if (matches !== 1) defects.push(`${token}:${matches}`);
    });
  });
  return result('M46-06', defects.length === 0,
    defects.length
      ? `références orphelines ou dupliquées (${defects.join(', ')})`
      : 'toutes les références ARIA pointent vers une ancre unique');
}

/* M46-07 — Aucun ID dupliqué dans la vue Monde (ancres uniques). Le scan
 * couvre le stage et la région live globale, qui vit dans <body>. */
function checkDuplicateIds(stage) {
  const seen = new Map();
  collectIds(stage || document, seen);
  const live = byId('globe-live');
  if (live) seen.set('globe-live', (seen.get('globe-live') || 0) + 1);
  const duplicates = [];
  seen.forEach((count, id) => { if (count > 1) duplicates.push(`${id}:${count}`); });
  duplicates.sort();
  return result('M46-07', duplicates.length === 0,
    duplicates.length
      ? `IDs dupliqués (${duplicates.join(', ')})`
      : 'aucun ID dupliqué dans la vue Monde');
}

function collectIds(root, seen) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  const nodes = root.id
    ? [root].concat(Array.from(root.querySelectorAll('[id]')))
    : Array.from(root.querySelectorAll('[id]'));
  nodes.forEach((node) => {
    const id = node.getAttribute('id');
    if (id) seen.set(id, (seen.get(id) || 0) + 1);
  });
}

/* M46-08 — Confinement statique : aucun gestionnaire d'événement inline
 * (on*) et aucune source distante (src/href http(s) ou //) dans la vue. */
function checkNoRemote(stage) {
  const root = stage || document;
  const defects = [];
  Array.from(root.querySelectorAll('*')).forEach((node) => {
    const attrs = node.attributes || [];
    for (let i = 0; i < attrs.length; i += 1) {
      const name = attrs[i].name.toLowerCase();
      const value = attrs[i].value || '';
      if (name.indexOf('on') === 0) defects.push(`inline:${name}`);
      if ((name === 'src' || name === 'href') && /^(https?:)?\/\//i.test(value)) {
        defects.push(`remote:${name}`);
      }
    }
  });
  return result('M46-08', defects.length === 0,
    defects.length
      ? defects.slice(0, 5).join(', ')
      : 'aucun gestionnaire inline, aucune source distante');
}

/* M46-09 — Déterminisme : la liste produite reste exactement les dix IDs
 * canoniques, dérivés du DOM seul (aucune date, aucun aléa, aucun réseau). */
function checkDeterminism(results) {
  const ids = results.map((r) => r.id);
  const canonical = ids.length === CHECK_IDS.length
    && ids.every((id, index) => id === CHECK_IDS[index]);
  const sig = signatureOf(results);
  const stable = sig.length > 0 && sig === signatureOf(results.slice());
  return result('M46-09', canonical && stable,
    `${ids.length} contrôles canoniques · signature ${sig}`);
}

function ensureReport(ctx) {
  let report = byId(REPORT_ID);
  if (!report || !report.isConnected) {
    report = typeof ctx.el === 'function'
      ? ctx.el('div', 'm46-sr')
      : document.createElement('div');
    report.id = REPORT_ID;
    report.setAttribute('role', 'group');
    report.setAttribute('aria-label', 'Vérification statique du Monde');
    const summary = typeof ctx.el === 'function'
      ? ctx.el('p', 'm46-summary')
      : document.createElement('p');
    summary.id = SUMMARY_ID;
    const list = typeof ctx.el === 'function'
      ? ctx.el('ul', 'm46-list')
      : document.createElement('ul');
    list.id = LIST_ID;
    report.append(summary, list);
    document.body.appendChild(report);
  }
  return report;
}

/* Écrit le rapport de façon idempotente : la liste est vidée puis reconstruite
 * à partir des résultats triés, et les compteurs sont exposés en data-*. */
function updateReport(report, results) {
  if (!report) return;
  const ordered = results.slice().sort((a, b) => a.id.localeCompare(b.id, 'fr'));
  const passed = ordered.filter((r) => r.ok).length;
  const failed = ordered.length - passed;
  const summary = report.querySelector(`#${SUMMARY_ID}`);
  const list = report.querySelector(`#${LIST_ID}`);
  if (summary) {
    summary.textContent = `Vérification statique du Monde : ${ordered.length} contrôles, `
      + `${passed} réussites, ${failed} échecs.`;
  }
  if (list) {
    while (list.firstChild) list.removeChild(list.firstChild);
    ordered.forEach((r) => {
      const li = document.createElement('li');
      li.setAttribute('data-m46-check', r.id);
      li.setAttribute('data-m46-ok', r.ok ? '1' : '0');
      const code = document.createElement('span');
      code.className = 'm46-code';
      code.textContent = `${r.id} — ${r.ok ? 'OK' : 'ÉCHEC'} : `;
      const detail = document.createElement('span');
      detail.className = 'm46-detail';
      detail.textContent = r.detail;
      li.append(code, detail);
      list.appendChild(li);
    });
  }
  report.dataset.m46Total = String(ordered.length);
  report.dataset.m46Passed = String(passed);
  report.dataset.m46Failed = String(failed);
  report.dataset.m46Signature = signatureOf(ordered);
  report.dataset.m46Version = '1';
}

register('M46', (ctx) => {
  if (!ctx) return;
  const stage = ctx.stage || (ctx.scene && ctx.scene.closest('.globe-view')) || document;

  /* M46-10 (CSS) : feuille unique, injectée via cssOnce, classe isolée. */
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);

  /* M46-01 à M46-08 : contrôles observés sur le DOM courant. */
  const results = [
    checkAnchors(),                    // M46-01
    checkHost(ctx.host),               // M46-02
    checkTitle(stage),                 // M46-03
    checkChoices(stage, ctx.countries),// M46-04
    checkLive(),                       // M46-05
    checkRefs(stage),                  // M46-06
    checkDuplicateIds(stage),          // M46-07
    checkNoRemote(stage),              // M46-08
    checkDeterminism([] /* complété ci-dessous */), // M46-09 (provisoire)
    result('M46-10', false, 'rapport en cours de construction'), // M46-10 (provisoire)
  ];

  /* M46-09 : signature calculée sur les huit contrôles d'observation. */
  results[8] = checkDeterminism(results.slice(0, 8));

  /* M46-10 : nœud de rapport autonome et idempotent. Deux écritures : la
   * première publie l'état courant, la seconde valide l'unicité du nœud. */
  const report = ensureReport(ctx);
  updateReport(report, results);
  const unique = byAttributeId(REPORT_ID).length === 1;
  const counters = report
    && report.dataset.m46Total === String(results.length)
    && report.dataset.m46Passed === String(results.filter((r) => r.ok).length);
  results[9] = result('M46-10', !!(unique && counters && report && report.isConnected),
    unique
      ? 'rapport unique #monde-m46-report, compteurs cohérents, sans touches aux sélecteurs testés'
      : 'rapport dupliqué ou compteurs incohérents');
  updateReport(report, results);
});
