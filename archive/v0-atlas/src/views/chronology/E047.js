import { register } from './registry.js';

/* Lentille CHRONOLOGIE E047 — Échelles de temps, densité et granularité des ères.
 *
 * Dix chantiers appliqués à chaque rendu de la vue chronologie par le registre
 * `runEnhancements`. Le thème est le TEMPS : rendre mesurables l'amplitude des
 * ères, leur granulométrie, leur densité en repères et l'échelle sur laquelle
 * elles se succèdent. Aucune donnée historique n'est inventée : tout est lu
 * dans le DOM construit par chronology.js (bandes, listes, statut).
 *
 * Contrat respecté : un seul fichier possédé, CSS injecté une seule fois via
 * ctx.css('chronology-e047', …), identifiants tous préfixés `e047-` avec garde
 * d'existence, zéro trace de débogage, zéro réseau, zéro source d'aléa, aucune
 * boucle d'animation ni minuteur, aucun fichier partagé modifié, aucun sélecteur
 * de test altéré.
 *
 * Lectures utilisées : src/views/chronology.js (:9-93, :207-541),
 * src/views/chronology/registry.js (:9-44), styles.css (:193-237, :312-344),
 * UNIFIED_AUDIT/CHRONOLOGIE/views/E39.md (motif de densité et de garde).
 */

const CSS_ID = 'chronology-e047';
const SCOPE = 'chronology-e047';
const PANEL_ID = 'e047-panel';
const TITLE_ID = 'e047-title';
const SUMMARY_ID = 'e047-summary';
const SCALE_ID = 'e047-scale';
const CONTINUITY_ID = 'e047-continuity';
const AXIS_ID = 'e047-axis';
const LEGEND_ID = 'e047-legend';
const UNITS_ID = 'e047-units';
const ZOOM_ID = 'e047-zoom';
const CONVENTION_ID = 'e047-convention';
const REDUCED_ATTR = 'data-e047-reduced';
const BAND_SPAN_CLASS = 'e047-band-span';

/* Unités de granularité de la mesure : choix éditorial de l'interface, jamais
 * une propriété des données historiques. `siecle` = 100 ans, `millenaire` =
 * 1000 ans, `ere` = décompte brut sans division par une durée. */
const UNIT_VALUES = ['siecle', 'millenaire', 'ere'];
const UNIT_LABELS = { siecle: 'Siècle', millenaire: 'Millénaire', ere: 'Ère' };

/* État de la lentille : survit aux reconstructions du DOM par la coque
 * (shell.js:137), comme `local.query` dans chronology.js:16 ou `compact` dans
 * E39.js:45. Aucun nœud DOM n'est mémorisé ici. */
let unite = 'siecle';
let zoom = false;

const CSS = `
#${PANEL_ID}{
  margin:0 0 12px;padding:9px 11px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.02);color:var(--muted);
  font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums;
}
#${PANEL_ID} h2{margin:0 0 5px;color:var(--gold);font-family:var(--serif);font-size:12px;font-weight:450}
.e047-line{margin:0 0 4px}
.e047-subtitle{margin:8px 0 3px;color:var(--ink-soft);font-size:9px}
.e047-band-span{display:block;margin-top:1px;color:var(--muted-2);font-size:8px;font-variant-numeric:tabular-nums}
.e047-axis{
  position:relative;height:14px;margin:8px 0 6px;
  border:1px solid var(--line);border-radius:4px;
  background:rgba(0,0,0,.25);overflow:hidden;pointer-events:none;
}
.e047-axis[data-e047-zoom="1"]{background:rgba(127,156,255,.09)}
.e047-seg{
  position:absolute;top:0;bottom:0;min-width:1px;
  border-right:1px solid rgba(7,10,14,.7);
  background:rgba(230,185,111,.38);
}
.e047-seg.is-focus{background:rgba(127,156,255,.55)}
.e047-legend{list-style:none;margin:0;padding:0}
.e047-legend-item{
  display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 8px;
  padding:4px 0;border-bottom:1px solid var(--line);
}
.e047-legend-name{color:var(--ink-soft);font-weight:600}
.e047-legend-years,.e047-legend-duration{color:var(--muted)}
.e047-legend-density{grid-column:1/-1;color:var(--gold-bright)}
.e047-control-label{margin:8px 0 3px;color:var(--ink-soft)}
.e047-units{display:flex;flex-wrap:wrap;gap:4px}
.e047-unit{
  min-height:36px;padding:4px 10px;border:1px solid var(--line);border-radius:999px;
  background:transparent;color:var(--muted);font:inherit;font-size:9px;cursor:pointer;
  transition:border-color .18s linear,color .18s linear,background-color .18s linear;
}
.e047-unit[aria-checked="true"]{border-color:var(--gold);background:rgba(230,185,111,.1);color:var(--gold-bright)}
.e047-unit:hover{border-color:var(--gold)}
.e047-zoom{
  min-height:38px;margin-top:8px;padding:4px 12px;border:1px solid var(--line);border-radius:8px;
  background:transparent;color:var(--muted);font:inherit;font-size:9px;cursor:pointer;
  transition:border-color .18s linear,color .18s linear,background-color .18s linear;
}
.e047-zoom[aria-pressed="true"]{border-color:var(--gold);background:rgba(230,185,111,.1);color:var(--gold-bright)}
.e047-unit:focus-visible,.e047-zoom:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e047-convention{margin:8px 0 0;padding-top:6px;border-top:1px solid var(--line);color:var(--muted-2);font-size:8px;line-height:1.5}
.${SCOPE}[${REDUCED_ATTR}] .e047-unit,
.${SCOPE}[${REDUCED_ATTR}] .e047-zoom{transition:none}
@media (max-width:620px){
  #${PANEL_ID}{padding:7px 8px}
  .e047-legend-item{grid-template-columns:1fr}
  .e047-units{gap:3px}
  .e047-unit{padding:4px 8px}
}
@media (prefers-reduced-motion:reduce){
  .e047-unit,.e047-zoom{transition:none}
}`;

function all(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function setText(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function frInt(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function frDecimal(value) {
  return value.toFixed(1).replace('.', ',');
}

/* Même convention que chronology.js:26-28 : une année négative est av. J.-C. */
function annee(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/* E047-01 / -02 / -03 : les bornes sont celles des bandes (chronology.js:288-289). */
function eraData(main) {
  const out = [];
  all(main, '#atlas-chrono-eras .era-band').forEach((band, index) => {
    const start = Number(band.dataset.start);
    const end = Number(band.dataset.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return;
    const children = Array.prototype.slice.call(band.children);
    const nameNode = children.find((child) => (
      child.tagName === 'SPAN' && !child.classList.contains('atlas-chrono-era-range')
    ));
    const name = nameNode ? nameNode.textContent.trim() : (band.dataset.eraId || `Ère ${index + 1}`);
    out.push({
      band,
      id: band.dataset.eraId || '',
      name,
      start,
      end,
      duration: end - start,
    });
  });
  return out;
}

/* Densité : seuls les repères réellement affichés comptent. E04 pose `hidden`
 * sans re-rendre la vue (voir E39.js:110-118), donc l'attribut est testé. */
function eventCounts(main) {
  const counts = {};
  all(main, '#atlas-chrono-events > li[data-event-id]').forEach((item) => {
    if (item.hidden) return;
    const id = item.dataset.eraId;
    if (id) counts[id] = (counts[id] || 0) + 1;
  });
  return counts;
}

/* E047-05 : continuité des frontières, déduite des bornes triées par début. */
function continuityLabel(eras) {
  if (eras.length < 2) {
    return `${eras.length} ère(s) rendue(s) : aucune frontière consécutive à comparer.`;
  }
  const sorted = eras.slice().sort((a, b) => a.start - b.start);
  let contacts = 0;
  let lacunes = 0;
  let chevauchements = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    const precedent = sorted[i - 1];
    const courant = sorted[i];
    if (courant.start > precedent.end) lacunes += 1;
    else if (courant.start < precedent.end) chevauchements += 1;
    else contacts += 1;
  }
  return `Frontières : ${contacts} contact(s), ${lacunes} lacune(s), `
    + `${chevauchements} chevauchement(s) entre ères consécutives (bornes triées par début).`;
}

function uniteLabel() {
  return UNIT_LABELS[unite] || 'Ère';
}

/* E047-06 : la densité est exprimée dans l'unité choisie, jamais présentée
 * comme un fait historique. */
function densityLabel(count, duration, unit) {
  if (unit === 'ere') return `${count} repère(s) affiché(s) / ère`;
  if (!(duration > 0)) return 'densité non calculable';
  const diviseur = unit === 'siecle' ? 100 : 1000;
  return `${frDecimal((count * diviseur) / duration)} repère(s) affiché(s) / `
    + (unit === 'siecle' ? 'siècle' : 'millénaire');
}

function applyUnit(value) {
  if (UNIT_VALUES.indexOf(value) !== -1) unite = value;
}

/* E047-04 / -07 : axe proportionnel. Les segments sont positionnés en pourcentage
 * de l'étendue (absolue ou réduite à l'ère courante) ; l'information complète
 * reste dans la légende textuelle, donc l'axe n'est jamais le seul support. */
function updateAxis(ctx, axis, eras, main) {
  const courante = main.querySelector('.era-band[aria-current="true"]');
  const idCourant = courante ? courante.dataset.eraId : '';
  const focus = zoom ? eras.find((item) => item.id === idCourant) : null;
  let lo = 0;
  let hi = 0;
  if (focus) {
    lo = focus.start;
    hi = focus.end;
  } else if (eras.length) {
    lo = Math.min.apply(null, eras.map((item) => item.start));
    hi = Math.max.apply(null, eras.map((item) => item.end));
  }
  const span = hi - lo;
  const segments = [];
  if (span > 0) {
    eras.forEach((item) => {
      const a = Math.max(item.start, lo);
      const b = Math.min(item.end, hi);
      if (b <= a) return;
      const left = ((a - lo) / span) * 100;
      const width = ((b - a) / span) * 100;
      const seg = ctx.el('span', 'e047-seg');
      seg.style.left = `${clamp(left, 0, 100).toFixed(3)}%`;
      seg.style.width = `${clamp(width, 0, 100 - left).toFixed(3)}%`;
      seg.dataset.eraId = item.id;
      seg.title = `${item.name} : ${annee(item.start)} → ${annee(item.end)} · ${frInt(item.duration)} an(s)`;
      if (focus && item.id === focus.id) seg.classList.add('is-focus');
      segments.push(seg);
    });
  }
  axis.replaceChildren.apply(axis, segments);
  axis.dataset.e047Zoom = zoom ? '1' : '0';
  axis.setAttribute('aria-label', eras.length
    ? `Axe des ères de ${annee(lo)} à ${annee(hi)}${focus ? `, agrandi sur ${focus.name}` : ''} : `
      + `${segments.length} segment(s) proportionnels à la durée.`
    : 'Aucune ère à représenter sur l’axe.');
}

function refresh(ctx, layout) {
  const main = layout.querySelector('#atlas-chrono-main');
  const panel = document.getElementById(PANEL_ID);
  if (!main || !panel) return;

  const eras = eraData(main);
  const counts = eventCounts(main);
  const durees = eras.map((item) => item.duration).filter((value) => value > 0);
  const minDur = durees.length ? Math.min.apply(null, durees) : 0;
  const maxDur = durees.length ? Math.max.apply(null, durees) : 0;
  const borneMin = eras.length ? Math.min.apply(null, eras.map((item) => item.start)) : 0;
  const borneMax = eras.length ? Math.max.apply(null, eras.map((item) => item.end)) : 0;
  const etendue = borneMax - borneMin;

  setText(document.getElementById(SUMMARY_ID), eras.length
    ? `Échelles : ${eras.length} ère(s) couvrant ${frInt(etendue)} année(s) de ${annee(borneMin)} à ${annee(borneMax)}, `
      + `soit ${frDecimal(etendue / eras.length)} année(s) par ère en moyenne.`
    : 'Aucune borne d’ère exploitable pour mesurer une échelle.');

  setText(document.getElementById(SCALE_ID), eras.length
    ? `Granularité : ères de ${frInt(minDur)} à ${frInt(maxDur)} année(s) `
      + `(rapport ${minDur > 0 ? frDecimal(maxDur / minDur) : '—'}) ; densité exprimée par ${uniteLabel()}.`
    : 'Granularité non mesurable sans bornes d’ères.');

  setText(document.getElementById(CONTINUITY_ID), continuityLabel(eras));

  /* E047-01 : l'amplitude est ajoutée à la bande elle-même, là où le lecteur
   * regarde déjà la plage d'années. Un seul span par bande, recréée à chaque rendu. */
  eras.forEach((item) => {
    let span = item.band.querySelector(`.${BAND_SPAN_CLASS}`);
    if (!span) {
      span = ctx.el('span', BAND_SPAN_CLASS);
      item.band.appendChild(span);
    }
    setText(span, `${frInt(item.duration)} an(s)`);
  });

  /* E047-03 : la légende est le support textuel complet, toujours visible. */
  const axis = document.getElementById(AXIS_ID);
  if (axis) updateAxis(ctx, axis, eras, main);

  const legend = document.getElementById(LEGEND_ID);
  if (legend) {
    const items = eras.map((item) => {
      const li = ctx.el('li', 'e047-legend-item');
      li.append(
        ctx.el('span', 'e047-legend-name', item.name),
        ctx.el('span', 'e047-legend-years', `${annee(item.start)} → ${annee(item.end)}`),
        ctx.el('span', 'e047-legend-duration', `${frInt(item.duration)} an(s)`),
        ctx.el('span', 'e047-legend-density', densityLabel(counts[item.id] || 0, item.duration, unite))
      );
      return li;
    });
    legend.replaceChildren.apply(legend, items);
  }

  UNIT_VALUES.forEach((value) => {
    const button = document.getElementById(`e047-unit-${value}`);
    if (!button) return;
    button.setAttribute('aria-checked', value === unite ? 'true' : 'false');
    button.tabIndex = value === unite ? 0 : -1;
  });

  const zoomButton = document.getElementById(ZOOM_ID);
  if (zoomButton) zoomButton.setAttribute('aria-pressed', zoom ? 'true' : 'false');

  /* E047-08 : la convention est explicite ; aucune précision n'est supposée
   * au-delà des années entières enregistrées par la vue. */
  setText(document.getElementById(CONVENTION_ID),
    'Convention : une année négative se lit « av. J.-C. » ; l’amplitude est la différence fin − début '
    + 'telle qu’enregistrée, sans précision ni borne manquante supposée.');
}

function buildPanel(ctx) {
  const panel = ctx.el('section', 'e047-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', 'e047-title', 'Échelles de temps du pays');
  title.id = TITLE_ID;

  const summary = ctx.el('p', 'e047-line');
  summary.id = SUMMARY_ID;
  const scale = ctx.el('p', 'e047-line');
  scale.id = SCALE_ID;
  const continuity = ctx.el('p', 'e047-line');
  continuity.id = CONTINUITY_ID;

  /* E047-09 : l'axe porte un libellé ARIA concis ; la légende ci-dessous
   * donne toute l'information en texte, sans dépendre d'une couleur. */
  const axis = ctx.el('div', 'e047-axis');
  axis.id = AXIS_ID;
  axis.setAttribute('role', 'img');
  axis.setAttribute('aria-label', 'Axe proportionnel des ères.');

  const legendTitle = ctx.el('p', 'e047-subtitle', 'Détail par ère — équivalent textuel de l’axe');
  const legend = ctx.el('ol', 'e047-legend');
  legend.id = LEGEND_ID;

  const unitsLabel = ctx.el('p', 'e047-control-label', 'Granularité de la mesure :');
  const units = ctx.el('div', 'e047-units');
  units.id = UNITS_ID;
  units.setAttribute('role', 'radiogroup');
  units.setAttribute('aria-label', 'Unité de mesure de la densité des ères');
  UNIT_VALUES.forEach((value) => {
    const button = ctx.el('button', 'e047-unit', UNIT_LABELS[value]);
    button.type = 'button';
    button.id = `e047-unit-${value}`;
    button.dataset.e047Unit = value;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', value === unite ? 'true' : 'false');
    button.tabIndex = value === unite ? 0 : -1;
    units.appendChild(button);
  });

  const zoomButton = ctx.el('button', 'e047-zoom', 'Agrandir l’axe sur l’ère courante');
  zoomButton.type = 'button';
  zoomButton.id = ZOOM_ID;
  zoomButton.setAttribute('aria-pressed', zoom ? 'true' : 'false');
  zoomButton.setAttribute('aria-controls', AXIS_ID);

  const convention = ctx.el('p', 'e047-convention');
  convention.id = CONVENTION_ID;

  panel.append(title, summary, scale, continuity, axis, legendTitle, legend,
    unitsLabel, units, zoomButton, convention);
  return panel;
}

/* E047-10 : écouteurs posés sur le `main` courant, détruit avec la coque ;
 * aucun écouteur global, aucun minuteur, aucune boucle rAF. */
function bind(ctx, main, layout) {
  if (main.dataset.e047Bound === '1') return;
  main.dataset.e047Bound = '1';

  const units = main.querySelector(`#${UNITS_ID}`);
  if (units) {
    units.addEventListener('click', (event) => {
      const target = event.target;
      const button = target && target.closest ? target.closest('button[data-e047-unit]') : null;
      if (!button || !units.contains(button)) return;
      applyUnit(button.dataset.e047Unit);
      refresh(ctx, layout);
      const active = units.querySelector('button[aria-checked="true"]');
      if (active && typeof active.focus === 'function') active.focus();
    });
    /* Choix unique = radiogroup : flèches pour parcourir, tabulation roving. */
    units.addEventListener('keydown', (event) => {
      const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
      if (keys.indexOf(event.key) === -1) return;
      const buttons = all(units, 'button[data-e047-unit]');
      const index = buttons.indexOf(document.activeElement);
      if (index < 0 || !buttons.length) return;
      event.preventDefault();
      const pas = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
      const suivant = buttons[(index + pas + buttons.length) % buttons.length];
      applyUnit(suivant.dataset.e047Unit);
      refresh(ctx, layout);
      if (typeof suivant.focus === 'function') suivant.focus();
    });
  }

  const zoomButton = main.querySelector(`#${ZOOM_ID}`);
  if (zoomButton) {
    zoomButton.addEventListener('click', () => {
      zoom = !zoom;
      refresh(ctx, layout);
      zoomButton.setAttribute('aria-pressed', zoom ? 'true' : 'false');
      if (typeof zoomButton.focus === 'function') zoomButton.focus();
    });
  }

  /* Même rafraîchissement différé que E39.js:172-178 : les filtres E04 posent
   * `hidden` sans émettre d'événement personnalisé. Aucun timer introduit. */
  const apresAction = (event) => {
    if (event && event.target && event.target.closest
      && event.target.closest(`#${UNITS_ID}, #${ZOOM_ID}`)) return;
    refresh(ctx, layout);
  };
  main.addEventListener('input', apresAction);
  main.addEventListener('change', apresAction);
  main.addEventListener('click', apresAction);
}

register('E047', (ctx) => {
  if (!ctx || typeof ctx.el !== 'function' || typeof ctx.css !== 'function') return;
  const layout = ctx.layout
    || (ctx.stage && typeof ctx.stage.querySelector === 'function'
      ? ctx.stage.querySelector('.chronology-layout') : null);
  if (!layout || typeof layout.querySelector !== 'function') return;
  const main = layout.querySelector('#atlas-chrono-main');
  if (!main) return; /* la vue chronologie n'est pas rendue : lentille inactive */

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e047 = '1';
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }

  /* Un panneau détaché d'un rendu précédent ne doit jamais rester adressable. */
  const obsolète = document.getElementById(PANEL_ID);
  if (obsolète && !main.contains(obsolète)) obsolète.remove();

  if (!main.querySelector(`#${PANEL_ID}`)) {
    const panel = buildPanel(ctx);
    const status = main.querySelector('#atlas-chrono-status');
    if (status && status.nextSibling) main.insertBefore(panel, status.nextSibling);
    else main.prepend(panel);
  }

  bind(ctx, main, layout);
  refresh(ctx, layout);
});
