import { register } from './registry.js';

/* Lentille M35 — Couverture et points d'audit (domaine D : données & sémantique).
 *
 * Fichier seul. Tout est dérivé des objets reçus dans ctx (globe.js:433-441,
 * registry.js:51-57) : ctx.countries = DATASET.countries, ctx.selected = pays
 * courant. Aucun chiffre de couverture n'est recopié : ni le « 784 cellules »
 * figé de globe.js:373, ni le « /14 domaines » codé en dur de globe.js:131 /
 * M13.js:55, ni les totaux de dataset.js:11-13 (la coque ne transmet pas meta).
 *
 * Dix chantiers M35-01 … M35-10 : voir UNIFIED_AUDIT/MONDE/views/M35.md.
 * Zéro réseau, zéro aléa, zéro journalisation, zéro canvas, zéro timer,
 * aucune donnée historique inventée, aucun fichier partagé modifié.
 */

const CSS_ID = 'monde-m35';
const PANEL_ID = 'monde-m35-coverage';
const NAME_ID = 'monde-m35-name';
const LINES_ID = 'monde-m35-lines';
const MAX_DETAIL = 3;

const CSS = `
  #${PANEL_ID}{
    position:absolute;left:16px;top:16px;z-index:5;
    width:min(300px,calc(100% - 32px));max-height:38%;overflow:auto;
    padding:8px 10px;border:1px solid var(--line);border-radius:8px;
    background:rgba(8,11,16,.9);color:var(--muted);
    font-size:11px;line-height:1.4;font-variant-numeric:tabular-nums;
    pointer-events:none;
  }
  #${PANEL_ID} .m35-kicker{
    display:block;margin:0 0 2px;color:var(--gold);
    font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;
  }
  #${PANEL_ID} .m35-name{
    display:block;margin:0;color:var(--ink);
    font-family:var(--serif);font-size:15px;font-weight:600;line-height:1.2;
  }
  #${PANEL_ID} .m35-lines p{margin:3px 0 0;overflow-wrap:anywhere}
  @media (max-width:900px){
    #${PANEL_ID}{
      left:8px;top:8px;width:min(260px,calc(100% - 16px));
      max-height:32%;font-size:10px;
    }
  }
  @media (prefers-reduced-motion:reduce){
    #${PANEL_ID}{transition:none!important;animation:none!important}
  }
`;

/* Le registre purge puis réenregistre ses callbacks à chaque rendu
 * (registry.js:46-50) : on relit toujours `latest`, jamais une closure périmée. */
let latest = null;
let hostRef = null;
let hoverCountry = null;

function byId(id) {
  return document.getElementById(id);
}

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function textValue(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}

function bump(map, key) {
  map[key] = (map[key] || 0) + 1;
}

/* M35-06/07/08/09 : ordre déterministe (décroissant, puis localeCompare). */
function pairs(map, limit) {
  const keys = Object.keys(map).sort((a, b) => map[b] - map[a] || a.localeCompare(b, 'fr'));
  if (keys.length === 0) return 'non renseigné';
  const shown = limit > 0 ? keys.slice(0, limit) : keys;
  const phrase = shown.map((key) => `${key} ${map[key]}`).join(' · ');
  const rest = keys.length - shown.length;
  return rest > 0 ? `${phrase} · + ${rest} autre(s)` : phrase;
}

function brief(values, limit) {
  if (values.length === 0) return '';
  const phrase = values.slice(0, limit).join(', ');
  const rest = values.length - limit;
  return rest > 0 ? `${phrase} · + ${rest} autre(s)` : phrase;
}

/* M35-01/03/04/05/06/07/08/09 : une seule passe de calcul sur le périmètre,
 * aucun libellé ni compteur saisi à la main. */
function compute(scope) {
  const points = [];
  const eras = [];
  for (const country of scope) {
    if (!country || typeof country !== 'object') continue;
    for (const point of arr(country.points)) points.push(point);
    for (const era of arr(country.eras)) eras.push(era);
  }

  const domains = Object.create(null);
  const scales = Object.create(null);
  const precisions = Object.create(null);
  const statuses = Object.create(null);
  const coveredEraIds = new Set();
  let undocumented = 0;
  let omissionRefs = 0;

  for (const point of points) {
    if (!point || typeof point !== 'object') continue;

    const domain = textValue(point.domain);
    if (domain !== null) bump(domains, domain);
    const scale = textValue(point.scale);
    if (scale !== null) bump(scales, scale);
    const precision = textValue(point.datePrecision);
    if (precision !== null) bump(precisions, precision);
    const status = textValue(point.status);
    if (status !== null) bump(statuses, status);
    const eraId = textValue(point.eraId);
    if (eraId !== null) coveredEraIds.add(eraId);

    /* Valeurs observées dans le dataset : `non documenté` et identifiants
     * `OM-*` ; aucun regroupement ni traduction n'est appliqué. */
    if (point.confidence === 'non documenté') undocumented += 1;
    if (arr(point.sources).some((source) => typeof source === 'string' && source.indexOf('OM-') === 0)) {
      omissionRefs += 1;
    }
  }

  const eraIds = [];
  const missingEras = [];
  for (const era of eras) {
    if (!era || typeof era !== 'object') continue;
    const id = textValue(era.id);
    if (id === null) continue;
    eraIds.push(id);
    if (!coveredEraIds.has(id)) missingEras.push(textValue(era.name) || id);
  }

  return {
    countries: scope.length,
    points: points.length,
    domains,
    domainCount: Object.keys(domains).length,
    erasTotal: eraIds.length,
    erasCovered: eraIds.filter((id) => coveredEraIds.has(id)).length,
    missingEras,
    scales,
    precisions,
    statuses,
    undocumented,
    omissionRefs,
  };
}

/* M35-10 : miroir d'état sur le host, aucune journalisation, aucune instrumentation. */
function mirror(stats, country) {
  const host = hostRef;
  if (!host || !host.isConnected) return;
  host.dataset.m35Scope = country ? textValue(country.code) || '' : 'all';
  host.dataset.m35Points = String(stats.points);
  host.dataset.m35Domains = String(stats.domainCount);
  host.dataset.m35Eras = `${stats.erasCovered}/${stats.erasTotal}`;
  host.dataset.m35Om = String(stats.omissionRefs);
  host.dataset.m35Status = Object.keys(stats.statuses).sort().join(',') || 'non renseigné';
}

function buildPanel(el) {
  const panel = el('div', 'monde-m35-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Couverture et points d’audit');
  panel.dataset.monde = 'M35';

  panel.appendChild(el('p', 'm35-kicker', 'Couverture & points'));

  const name = el('p', 'm35-name', '—');
  name.id = NAME_ID;
  panel.appendChild(name);

  const lines = el('div', 'm35-lines');
  lines.id = LINES_ID;
  panel.appendChild(lines);
  return panel;
}

/* M35-09 : le survol prime, la sélection sert de repli. Le statut des points
 * d'audit est affiché tel quel (`validated`), sans le confondre avec le
 * `vérifié` des points de repère (corpus distinct). */
function render(country, ctx) {
  const panel = byId(PANEL_ID);
  if (!panel || !panel.isConnected) return;
  const name = byId(NAME_ID);
  const lines = byId(LINES_ID);
  if (!name || !lines) return;

  const scope = country ? [country] : arr(ctx && ctx.countries);
  const stats = compute(scope);

  panel.dataset.scope = country ? 'country' : 'all';
  if (country) panel.dataset.countryId = textValue(country.id) || '';
  else delete panel.dataset.countryId;

  name.textContent = country
    ? `${textValue(country.name) || '—'}${textValue(country.code) ? ' · ' + country.code : ''}`
    : 'Tous les pays';

  const perimeter = stats.countries > 1 ? ` · ${stats.countries} pays` : '';
  const missing = stats.missingEras.length
    ? ` · sans point : ${brief(stats.missingEras, MAX_DETAIL)}`
    : '';

  const texts = [
    `Points d’audit : ${stats.points} · statut : ${pairs(stats.statuses)}${perimeter}`,
    `Domaines couverts : ${stats.domainCount} · détail : ${pairs(stats.domains, MAX_DETAIL)}`,
    `Ères couvertes : ${stats.erasCovered}/${stats.erasTotal}${missing}`,
    `Échelles : ${pairs(stats.scales)}`,
    `Précision de date : ${pairs(stats.precisions, MAX_DETAIL)}`,
    `Points « non documenté » : ${stats.undocumented} · citant une omission (OM-*) : ${stats.omissionRefs}`,
  ];

  while (lines.firstChild) lines.removeChild(lines.firstChild);
  for (const text of texts) lines.appendChild(ctx.el('p', 'm35-line', text));

  mirror(stats, country);
}

register('M35', (ctx) => {
  if (!ctx || !ctx.scene || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  latest = ctx;
  if (ctx.host && ctx.host.isConnected) hostRef = ctx.host;

  ctx.css(CSS_ID, CSS);

  let panel = byId(PANEL_ID);
  if (!panel || !panel.isConnected || panel.parentElement !== ctx.scene) {
    panel = buildPanel(ctx.el);
    ctx.scene.appendChild(panel);
  }

  render(hoverCountry || ctx.selected || null, ctx);

  /* registry.js:46-50 purge les callbacks à chaque rendu : on réenregistre
   * à chaque appel du greffon (aucune garde module qui les perdrait). */
  if (typeof ctx.onHover === 'function') {
    ctx.onHover((payload) => {
      hoverCountry = (payload && payload.country) || null;
      const source = latest;
      if (source) render(hoverCountry || source.selected || null, source);
    });
  }
  if (typeof ctx.onLeave === 'function') {
    ctx.onLeave(() => {
      hoverCountry = null;
      const source = latest;
      if (source) render(source.selected || null, source);
    });
  }
});
