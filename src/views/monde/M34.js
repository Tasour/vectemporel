import { register } from './registry.js';

/* Lentille M34 — Ères et repères par pays (structure & indexation).
 * Dix chantiers M34-01 … M34-10, tous implémentés dans ce module. Un seul fichier possédé.
 *
 * Sources lues (aucune valeur inventée) :
 *  - ctx.countries / ctx.selected  → DATASET.countries (globe.js:433-441, registry.js:51-57) ;
 *  - dataset.js:130-203            → eras {id,index,name,start,end,color} ;
 *  - dataset.js:205+               → events {id,eraId,year,title,subtitle,points,...} ;
 *  - chronology.js:285,377,386     → ancres `era-<id>`, `event-<id>`, `event-btn-<id>`.
 *
 * Aucun réseau, aucun aléa, aucun console.*, aucun fichier partagé modifié.
 * Aucun appel à selectCountry()/goView() : store.js:654-657 branche hashchange
 * sur hydrateFromHash(), donc aucun href d'ancre n'est écrit ici non plus.
 */

const CSS_ID = 'monde-m34';
const PANEL_ID = 'monde-m34-panel';
const TITLE_ID = 'monde-m34-title';
const COUNTERS_ID = 'monde-m34-counters';
const SCOPE_ID = 'monde-m34-scope';
const ERAS_ID = 'monde-m34-eras';

const CSS = `
  #${PANEL_ID}{
    position:absolute;left:16px;bottom:16px;z-index:5;
    width:min(300px,calc(100% - 32px));max-height:44%;overflow:auto;
    padding:9px 11px;border:1px solid var(--line);border-radius:9px;
    background:rgba(8,11,16,.92);color:var(--ink-soft);
    font-size:11px;line-height:1.4;font-variant-numeric:tabular-nums;
  }
  #${PANEL_ID} .monde-m34-kicker{
    margin:0 0 2px;color:var(--gold);font-size:9px;font-weight:600;
    letter-spacing:.14em;text-transform:uppercase;
  }
  #${PANEL_ID} .monde-m34-title{
    margin:0;color:var(--ink);font-family:var(--serif);
    font-size:16px;font-weight:600;line-height:1.2;
  }
  #${PANEL_ID} .monde-m34-counters{margin:4px 0 0;color:var(--gold-bright)}
  #${PANEL_ID} .monde-m34-scope{margin:3px 0 6px;color:var(--muted)}
  #${PANEL_ID} .monde-m34-eras{margin:0;padding-left:16px}
  #${PANEL_ID} .monde-m34-era{margin:0 0 7px}
  #${PANEL_ID} .monde-m34-era-title{
    margin:0;color:var(--ink);font-size:11px;font-weight:600;
  }
  #${PANEL_ID} .monde-m34-era-range{margin-left:6px;color:var(--muted);font-weight:400}
  #${PANEL_ID} .monde-m34-era-count{
    margin-left:6px;padding:0 4px;border:1px solid var(--line);border-radius:4px;
    color:var(--gold-bright);font-size:9px;
  }
  #${PANEL_ID} .monde-m34-reperes{margin:3px 0 0;padding-left:14px;list-style:disc}
  #${PANEL_ID} .monde-m34-repere{margin:1px 0}
  #${PANEL_ID} .monde-m34-year{margin-right:4px;color:var(--gold)}
  #${PANEL_ID} .monde-m34-repere-title{color:var(--ink)}
  #${PANEL_ID} .monde-m34-repere-sub{display:block;color:var(--muted);font-size:10px}
  #${PANEL_ID} .monde-m34-chrono{margin-left:5px;color:var(--gold-bright)}
  #${PANEL_ID} .monde-m34-country{
    display:flex;justify-content:space-between;gap:8px;margin:2px 0;
  }
  #${PANEL_ID} .monde-m34-country-name{color:var(--ink)}
  #${PANEL_ID} .monde-m34-country-count{color:var(--muted);white-space:nowrap}
  #${PANEL_ID} .monde-m34-hint{margin:7px 0 0;color:var(--muted);font-size:10px}
  #${PANEL_ID} .monde-m34-empty{color:var(--muted)}
  .monde-m34-sr{
    position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
    overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;
  }
  @media (max-width:900px){
    #${PANEL_ID}{
      left:8px;bottom:8px;width:min(260px,calc(100% - 16px));
      max-height:36%;font-size:10px;
    }
  }
  @media (prefers-reduced-motion:reduce){
    #${PANEL_ID} *{transition:none!important;animation:none!important}
  }
`;

/* Dernier contexte reçu : les callbacks du registre survivent aux rendus, mais
 * lisent toujours ce pointeur (jamais une closure périmée). */
let latest = null;

function byId(id) {
  return document.getElementById(id);
}

function listOf(value) {
  return Array.isArray(value) ? value : [];
}

function count(list) {
  return listOf(list).length;
}

/* M34-05 : même graphie que globe.js:135-137 et chronology.js:25-27. */
function formatYear(year) {
  if (typeof year !== 'number' || !Number.isFinite(year)) return '—';
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

/* M34-01 : agrégats calculés, jamais codés en dur (globe.js:373 non réutilisé). */
function totals(countries) {
  let eras = 0;
  let reperes = 0;
  countries.forEach((country) => {
    eras += count(country && country.eras);
    reperes += count(country && country.events);
  });
  return { eras, reperes };
}

/* M34-07 : le survol prime, la sélection sert de repli. */
function pickCountry(payload, ctx) {
  if (payload && payload.country) return payload.country;
  return (ctx && ctx.selected) || null;
}

function buildPanel(el) {
  const panel = el('section', 'monde-m34-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);
  panel.dataset.monde = 'M34';
  panel.dataset.state = 'idle';

  panel.appendChild(el('p', 'monde-m34-kicker', 'Ères & repères'));

  const title = el('h2', 'monde-m34-title', '—');
  title.id = TITLE_ID;
  panel.appendChild(title);

  const counters = el('p', 'monde-m34-counters', '—');
  counters.id = COUNTERS_ID;
  panel.appendChild(counters);

  const scope = el('p', 'monde-m34-scope', '');
  scope.id = SCOPE_ID;
  panel.appendChild(scope);

  const list = el('ol', 'monde-m34-eras');
  list.id = ERAS_ID;
  panel.appendChild(list);

  panel.appendChild(el('p', 'monde-m34-hint',
    'Chaque repère porte son ancre de chronologie à titre de référence : aucun changement de vue n’est déclenché ici.'));
  return panel;
}

/* M34-06 : référence non navigante. Pas de <a href> : store.js:654-657
 * brancherait hydrateFromHash() sur le hashchange et forcerait un état. */
function chronoRef(el, anchor, label) {
  const ref = el('span', 'monde-m34-chrono');
  ref.dataset.chronoAnchor = anchor;
  ref.dataset.chronoView = 'chronology';
  ref.setAttribute('title', `${label} · ancre ${anchor}`);
  ref.appendChild(el('span', 'monde-m34-chrono-mark', '↗'));
  ref.appendChild(el('span', 'monde-m34-sr', ` — voir dans la chronologie (ancre ${anchor})`));
  return ref;
}

function repereItem(el, event, country) {
  const li = el('li', 'monde-m34-repere');
  li.dataset.chronoAnchor = `event-${event.id}`;
  li.dataset.countryId = country.id || '';

  const line = el('span', 'monde-m34-repere-line');
  line.appendChild(el('span', 'monde-m34-year', formatYear(event.year)));
  line.appendChild(el('span', 'monde-m34-repere-title', event.title || '—'));
  if (event.subtitle) {
    line.appendChild(el('span', 'monde-m34-repere-sub', event.subtitle));
  }
  li.appendChild(line);
  li.appendChild(chronoRef(el, `event-${event.id}`, `Repère « ${event.title || '—'} »`));
  return li;
}

function eraItem(el, era, events, country) {
  const li = el('li', 'monde-m34-era');
  li.dataset.chronoAnchor = `era-${era.id}`;
  li.dataset.countryId = country.id || '';

  const inEra = events.filter((event) => event && event.eraId === era.id);
  const head = el('h3', 'monde-m34-era-title');
  head.appendChild(el('span', 'monde-m34-era-name', era.name || '—'));
  head.appendChild(el('span', 'monde-m34-era-range',
    `${formatYear(era.start)} → ${formatYear(era.end)}`));
  const badge = el('span', 'monde-m34-era-count', String(inEra.length));
  badge.setAttribute('aria-label', `${inEra.length} repère(s)`);
  head.appendChild(badge);
  li.appendChild(head);

  if (inEra.length) {
    const ol = el('ol', 'monde-m34-reperes');
    inEra.forEach((event) => ol.appendChild(repereItem(el, event, country)));
    li.appendChild(ol);
  }
  return li;
}

/* M34-09 : relecture des nœuds à chaque appel, reconstruction sans innerHTML. */
function render(country, ctx) {
  const panel = byId(PANEL_ID);
  if (!panel || !panel.isConnected) return;
  const el = ctx.el;
  const title = byId(TITLE_ID);
  const counters = byId(COUNTERS_ID);
  const scope = byId(SCOPE_ID);
  const list = byId(ERAS_ID);
  if (!title || !counters || !scope || !list) return;

  while (list.firstChild) list.removeChild(list.firstChild);

  const countries = listOf(ctx.countries);

  if (!country) {
    const t = totals(countries);
    panel.dataset.state = 'idle';
    delete panel.dataset.countryId;
    title.textContent = 'Tous les pays';
    counters.textContent = `${countries.length} pays · ${t.eras} ères · ${t.reperes} repères`;
    scope.textContent = 'Choisissez ou survolez un pays pour ouvrir ses ères et ses repères.';
    countries.forEach((item) => {
      if (!item) return;
      const li = el('li', 'monde-m34-country');
      li.dataset.countryId = item.id || '';
      li.dataset.chronoView = 'chronology';
      li.appendChild(el('span', 'monde-m34-country-name', item.name || '—'));
      li.appendChild(el('span', 'monde-m34-country-count',
        `${count(item.eras)} ères · ${count(item.events)} repères`));
      list.appendChild(li);
    });
    return;
  }

  panel.dataset.state = 'active';
  panel.dataset.countryId = country.id || '';
  title.textContent = country.name || '—';

  const eras = listOf(country.eras);
  const events = listOf(country.events);
  const points = listOf(country.points);
  const domain = country.domain;
  const range = Array.isArray(domain) && domain.length === 2
    ? ` · ${formatYear(domain[0])} → ${formatYear(domain[1])}` : '';

  counters.textContent = `${eras.length} ères · ${events.length} repères · ${points.length} points${range}`;
  scope.textContent = `Ères et repères documentés pour ${country.name || 'ce pays'}, dans l’ordre du jeu de données.`;

  if (!eras.length) {
    list.appendChild(el('li', 'monde-m34-empty', 'Aucune ère documentée pour ce pays.'));
    return;
  }
  eras.forEach((era) => {
    if (era) list.appendChild(eraItem(el, era, events, country));
  });
}

register('M34', (ctx) => {
  if (!ctx || !ctx.scene || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  latest = ctx;

  ctx.css(CSS_ID, CSS);

  let panel = byId(PANEL_ID);
  if (!panel || !panel.isConnected || panel.parentElement !== ctx.scene) {
    panel = buildPanel(ctx.el);
    ctx.scene.appendChild(panel);
  }
  render(pickCountry(null, ctx), ctx);

  /* registry.js:46-50 purge les callbacks à chaque rendu : on réenregistre
   * donc à chaque appel du greffon (aucune garde module qui les perdrait). */
  if (typeof ctx.onHover === 'function') {
    ctx.onHover((payload) => {
      const source = latest;
      if (source) render(pickCountry(payload, source), source);
    });
  }
  if (typeof ctx.onLeave === 'function') {
    ctx.onLeave(() => {
      const source = latest;
      if (source) render(pickCountry(null, source), source);
    });
  }
});
