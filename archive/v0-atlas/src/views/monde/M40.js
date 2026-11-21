import { register } from './registry.js';

/* Lentille M40 — Cohérence inter-vues du Monde (domaine D : données & sémantique).
 *
 * Le globe n'est qu'une vue du même état que la Chronologie, le Récit, la
 * Géographie, la Constellation et la Matrice des points (store.js). Cette
 * lentille n'écrit dans aucun fichier partagé : elle rend auditable, puis
 * réconcilie défensivement, les miroirs qui doivent rester alignés entre ces
 * vues. Toutes les valeurs affichées sont recalculées depuis `ctx.countries`,
 * `ctx.state`, le DOM courant ou le lien local — aucune donnée n'est inventée.
 *
 * Zéro réseau, zéro aléa, zéro console, zéro rAF, un seul panneau, un seul jeu
 * de rappels, un seul observateur d'attributs — cf. M40-01 à M40-10.
 */

const CSS_ID = 'monde-m40';
const PANEL_ID = 'monde-m40-coherence';

const CSS = `
  #${PANEL_ID}{
    position:absolute;right:16px;top:74px;z-index:6;
    max-width:min(330px,44%);padding:8px 11px;pointer-events:none;
    border:1px solid var(--line);border-radius:9px;
    background:rgba(8,11,16,.9);color:var(--muted);
    font-size:10px;line-height:1.45;font-variant-numeric:tabular-nums;
  }
  #${PANEL_ID} .m40-kicker{
    display:block;margin:0 0 4px;color:var(--gold);font-size:9px;
    font-weight:600;letter-spacing:.14em;text-transform:uppercase;
  }
  #${PANEL_ID} .m40-line{display:flex;gap:6px;margin:0 0 2px}
  #${PANEL_ID} .m40-label{flex:0 0 88px;color:var(--ink-soft)}
  #${PANEL_ID} .m40-value{flex:1 1 auto;color:var(--ink)}
  #${PANEL_ID} .m40-value[data-tone="warn"]{color:var(--red)}
  #${PANEL_ID} .m40-value[data-tone="ok"]{color:var(--gold-bright)}
  @media (max-width:700px){
    #${PANEL_ID}{left:8px;right:8px;top:8px;max-width:none;font-size:9px}
    #${PANEL_ID} .m40-label{flex-basis:76px}
  }
  @media (prefers-reduced-motion:reduce){#${PANEL_ID}{box-shadow:none}}
`;

/* État module : le contexte le plus récent, jamais une capture périmée. */
let latest = null;
let applies = 0;
let callbacksRegistered = false;
let observer = null;
let observedHtml = null;
let observedHost = null;
let hoverCode = null;

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function byId(countries, id) {
  if (!id) return null;
  return arr(countries).find((country) => country && country.id === id) || null;
}

function byCode(countries, code) {
  if (!code) return null;
  return arr(countries).find((country) => country && country.code === code) || null;
}

/* M40-04 : toutes les grandeurs sont recalculées depuis les pays du contexte.
   `cells` est le nombre de cellules ère × domaine, même convention que la
   matrice de la vue Points (points.js) et le sous-titre du globe. */
function derive(countries) {
  const list = arr(countries);
  let events = 0;
  let points = 0;
  let cells = 0;
  for (const country of list) {
    const eras = arr(country && country.eras).length;
    const countryPoints = arr(country && country.points);
    const domains = new Set(countryPoints.map((point) => point && point.domain)).size;
    events += arr(country && country.events).length;
    points += countryPoints.length;
    cells += eras * domains;
  }
  return { countries: list.length, events, points, cells };
}

function textOf(selector) {
  const node = document.querySelector(selector);
  return node ? (node.textContent || '').trim() : '';
}

function put(panel, key, value, tone) {
  if (!panel) return;
  const node = panel.querySelector(`[data-m40-value="${key}"]`);
  if (!node) return;
  if (node.textContent !== value) node.textContent = value;
  const nextTone = tone || '';
  if (node.dataset.tone !== nextTone) {
    if (nextTone) node.dataset.tone = nextTone;
    else delete node.dataset.tone;
  }
}

function buildPanel(ctx) {
  if (document.getElementById(PANEL_ID)) return;
  const panel = ctx.el('div', 'm40-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Contrôle de cohérence inter-vues du Monde');
  panel.appendChild(ctx.el('span', 'm40-kicker', 'Cohérence inter-vues'));
  const keys = [
    ['id', 'Pays courant'],
    ['mirror', 'Miroir du globe'],
    ['motor', 'Moteur'],
    ['totals', 'Compteurs'],
    ['situation', 'Situation'],
    ['grid', 'Grille des pays'],
    ['link', 'Lien local'],
    ['hover', 'Survol / sélection'],
    ['markers', 'Repères uniques'],
    ['guards', 'Greffon'],
  ];
  for (const [key, label] of keys) {
    const line = ctx.el('p', 'm40-line');
    line.dataset.m40 = key;
    const value = ctx.el('span', 'm40-value', '—');
    value.dataset.m40Value = key;
    line.append(ctx.el('span', 'm40-label', label), value);
    panel.appendChild(line);
  }
  ctx.scene.appendChild(panel);
}

/* M40-01 à M40-10 : un seul point de lecture, réinterrogeant le DOM courant. */
function refresh() {
  const panel = document.getElementById(PANEL_ID);
  const ctx = latest;
  const countries = ctx ? arr(ctx.countries) : [];
  const state = ctx && ctx.state ? ctx.state : null;
  const host = ctx && ctx.host ? ctx.host : null;
  const stateId = state && state.countryId ? state.countryId : null;
  const stateCountry = byId(countries, stateId);
  const snapshot = ctx && ctx.selected ? ctx.selected : null;
  const totals = derive(countries);
  const isGlobe = !!(state && state.view === 'globe');

  /* M40-01 — identité du pays : l'instantané du rendu doit égaler l'état. */
  const snapshotId = snapshot ? snapshot.id : null;
  const idOk = (!stateId && !snapshotId)
    || (!!stateId && !!snapshotId && stateId === snapshotId);
  put(panel, 'id',
    stateCountry
      ? `${stateCountry.name} · ${stateCountry.code || '—'} · ${idOk ? 'aligné' : 'divergent'}`
      : `aucun pays sélectionné · ${idOk ? 'aligné' : 'divergent'}`,
    idOk ? 'ok' : 'warn');

  /* M40-02 — miroir data-globe-selected : réconciliation défensive. */
  const expectedCode = stateCountry && stateCountry.code ? stateCountry.code : '';
  const observedCode = host && host.dataset ? (host.dataset.globeSelected || '') : '';
  const mirrorOk = observedCode === expectedCode;
  if (!mirrorOk && host && host.dataset && isGlobe) {
    host.dataset.globeSelected = expectedCode;
  }
  put(panel, 'mirror',
    mirrorOk ? `${expectedCode || '—'} · conforme`
      : `lu « ${observedCode || '—'} » · attendu « ${expectedCode || '—'} » · corrigé`,
    mirrorOk ? 'ok' : 'warn');

  /* M40-03 — invariant d'arrêt hors Monde : un globeActif à 1 hors de la vue
     signifierait un moteur qui continue de consommer dans une autre vue. */
  const html = document.documentElement;
  const htmlActive = html.dataset.globeActive === '1';
  const hostActive = !!host && !!host.dataset && host.dataset.globeActive === '1';
  let motorText;
  let motorTone = 'ok';
  if (isGlobe) {
    motorText = `vue Monde · drapeau ${htmlActive ? '1' : '0'} (visibilité/rotation)`;
  } else if (!htmlActive && !hostActive) {
    motorText = 'hors Monde · moteur arrêté (0/0)';
  } else {
    motorText = 'hors Monde · actif détecté · corrigé';
    motorTone = 'warn';
    if (htmlActive) html.dataset.globeActive = '0';
    if (hostActive && host) host.dataset.globeActive = '0';
  }
  put(panel, 'motor', motorText, motorTone);

  /* M40-04 — compteurs dérivés contre les inscriptions visibles du globe. */
  const progress = textOf('.globe-orientation .globe-progress');
  const subtitle = textOf('.globe-subtitle');
  const inscriptionOk = [totals.countries, totals.events, totals.points]
    .every((n) => progress.indexOf(String(n)) !== -1)
    && subtitle.indexOf(String(totals.cells)) !== -1;
  put(panel, 'totals',
    `${totals.countries} pays · ${totals.events} repères · ${totals.points} points · ${totals.cells} cellules · ${inscriptionOk ? 'concordant' : 'à vérifier'}`,
    inscriptionOk ? 'ok' : 'warn');

  /* M40-05 — fil de situation local aligné sur le pays issu de l'état. */
  const trail = document.getElementById('nav-c2b-trail');
  const crumbs = trail ? arr(trail.querySelectorAll('.nav-c2-crumb')) : [];
  const lastCrumb = crumbs.length ? (crumbs[crumbs.length - 1].textContent || '').trim() : '';
  const here = textOf('.globe-orientation .globe-here');
  const expectedHere = stateCountry ? `Sélection courante : ${stateCountry.name}` : 'Aucun pays sélectionné';
  const situationOk = !stateCountry
    ? (here === expectedHere && (!lastCrumb || lastCrumb === 'Monde'))
    : (here.indexOf(stateCountry.name) !== -1 && lastCrumb === stateCountry.name);
  put(panel, 'situation',
    stateCountry
      ? `Monde › ${lastCrumb || '—'} · ${situationOk ? 'conforme' : 'divergent'}`
      : `Monde seul · ${situationOk ? 'conforme' : 'divergent'}`,
    situationOk ? 'ok' : 'warn');

  /* M40-06 — exactement un aria-current dans la grille, sur le bon pays. */
  const buttons = arr(document.querySelectorAll('.globe-list button.globe-country'));
  const marked = buttons.filter((button) => button.getAttribute('aria-current') === 'true');
  const expectedButton = stateCountry
    ? buttons.find((button) => {
      const name = button.querySelector('.globe-country-name');
      return !!name && (name.textContent || '').trim() === stateCountry.name;
    })
    : null;
  const gridOk = stateCountry
    ? (marked.length === 1 && marked[0] === expectedButton)
    : marked.length === 0;
  put(panel, 'grid',
    `marqueurs ${marked.length} · ${stateCountry ? stateCountry.name : 'aucun'} · ${gridOk ? 'conforme' : 'divergent'}`,
    gridOk ? 'ok' : 'warn');

  /* M40-07 — le lien local reflète la vue et le pays (store.js:formatDeepLink). */
  let linkText = 'miroir indisponible';
  let linkOk = true;
  let linkTone = 'ok';
  try {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const v = params.get('v');
    const c = params.get('c') || '';
    linkOk = (v === null || v === 'globe') && c === (stateId || '');
    linkText = `v=${v || '—'} · c=${c || '—'} · ${linkOk ? 'conforme' : 'divergent'}`;
    linkTone = linkOk ? 'ok' : 'warn';
  } catch (_) {
    linkTone = 'warn';
  }
  put(panel, 'link', linkText, linkTone);

  /* M40-08 — survol et sélection restent deux sources distinctes et validées. */
  const hoverCountry = byCode(countries, hoverCode);
  const readout = textOf('#globe-hover-readout');
  const readoutOk = !hoverCountry || readout.indexOf(hoverCountry.name) !== -1;
  put(panel, 'hover',
    hoverCountry
      ? `survol ${hoverCountry.name} · sélection ${stateCountry ? stateCountry.name : 'aucune'} · ${readoutOk ? 'sources distinctes' : 'lecture à vérifier'}`
      : `survol aucun · sélection ${stateCountry ? stateCountry.name : 'aucune'}`,
    readoutOk ? 'ok' : 'warn');

  /* M40-09 — unicité des repères ; M40 n'ajoute aucune région live. */
  const trails = document.querySelectorAll('#nav-c2b-trail').length;
  const lives = document.querySelectorAll('#globe-live').length;
  const readouts = document.querySelectorAll('#globe-hover-readout').length;
  const markersOk = trails === 1 && lives === 1 && readouts === 1;
  put(panel, 'markers',
    `fil ${trails}/1 · live ${lives}/1 · lecture ${readouts}/1 · M40 sans live`,
    markersOk ? 'ok' : 'warn');

  /* M40-10 — idempotence : un panneau, un jeu de rappels, un observateur. */
  const panels = document.querySelectorAll(`#${PANEL_ID}`).length;
  const guardsOk = panels === 1;
  put(panel, 'guards',
    `appliqué ${applies}× · panneaux ${panels} · rappels ${callbacksRegistered ? 1 : 0} · observateur ${observer ? 1 : 0}`,
    guardsOk ? 'ok' : 'warn');
}

/* M40-02/03 : un seul observateur d'attributs, réarmé si le nœud hôte change. */
function ensureObserver() {
  if (typeof MutationObserver === 'undefined') return;
  const html = document.documentElement;
  const host = latest && latest.host ? latest.host : null;
  if (observer && observedHtml === html && observedHost === host) return;
  if (observer) observer.disconnect();
  observer = new MutationObserver(() => { refresh(); });
  observer.observe(html, { attributes: true, attributeFilter: ['data-globe-active'] });
  if (host) observer.observe(host, {
    attributes: true,
    attributeFilter: ['data-globe-active', 'data-globe-selected'],
  });
  observedHtml = html;
  observedHost = host;
}

register('M40', (ctx) => {
  if (!ctx || !ctx.scene) return;
  latest = ctx;             // référence fraîche, même après re-render
  applies += 1;
  ctx.css(CSS_ID, CSS);
  buildPanel(ctx);
  refresh();
  ensureObserver();

  /* M40-10 : le registre ne purge jamais ses tableaux ; un seul jeu de
     rappels, tous lisant `latest` et le DOM courant, jamais un ctx périmé. */
  if (callbacksRegistered) return;
  callbacksRegistered = true;
  if (typeof ctx.onReady === 'function') ctx.onReady(() => { refresh(); });
  if (typeof ctx.onHover === 'function') {
    ctx.onHover(({ code } = {}) => {
      hoverCode = code || null;
      refresh();
    });
  }
  if (typeof ctx.onLeave === 'function') {
    ctx.onLeave(() => { hoverCode = null; refresh(); });
  }
  if (typeof window !== 'undefined') window.addEventListener('hashchange', refresh);
});
