import { register } from './registry.js';

/* Lentille CHRONOLOGIE E071 — Infobulles de dates, calendriers et conversion
 * des repères.
 *
 * Dix chantiers appliqués à chaque rendu de la vue chronologie par le registre
 * `runEnhancements`. Thème : rendre la notation des années explicite, enrichir
 * les millésimes affichés d'infobulles, placer le repère dans un mini-calendrier
 * de l'ère et offrir un convertisseur entre notations (av./apr. J.-C., siècle,
 * millénaire, année astronomique).
 *
 * Aucune donnée historique n'est inventée : toutes les grandeurs sont des
 * conversions arithmétiques des entiers `data-year` / `data-start` / `data-end`
 * déjà présents dans le DOM (chronology.js:288-289, :380). Les conventions
 * (absence d'an zéro, année astronomique) sont expliquées comme telles.
 *
 * Contrat respecté : un seul fichier possédé, CSS injecté une seule fois via
 * ctx.css('chronology-e071', …), identifiants tous préfixés `e071-` et protégés
 * par garde d'existence, aucun `console.*`, aucun appel réseau, aucun
 * `Math.random`, aucune boucle rAF, aucun fichier partagé modifié.
 *
 * Lectures utilisées : src/views/chronology.js, src/views/chronology/registry.js,
 * src/ui/shell.js (:533), styles.css (:194-237, :316, :339, :342),
 * UNIFIED_AUDIT/MONDE/views/M07-raf-pause.md et M01-ombres-eclairage.md (modèles),
 * UNIFIED_AUDIT/CHRONOLOGIE/views/E39.md (modèle de lentille CHRONOLOGIE).
 */

const CSS_ID = 'chronology-e071';
const SCOPE = 'chronology-e071';
const REDUCED_ATTR = 'data-e071-reduced';

const PANEL_ID = 'e071-panel';
const TITLE_ID = 'e071-title';
const LEGEND_ID = 'e071-legend';
const DETAIL_ID = 'e071-detail';
const CALENDAR_ID = 'e071-calendar';
const CALENDAR_TEXT_ID = 'e071-calendar-text';
const CALENDAR_BAR_ID = 'e071-calendar-bar';
const MARKER_ID = 'e071-calendar-marker';
const CONVERTER_ID = 'e071-converter';
const LABEL_ID = 'e071-label';
const INPUT_ID = 'e071-input';
const BUTTON_ID = 'e071-button';
const OUTPUT_ID = 'e071-output';

/* Seul état module : la valeur du convertisseur, conservée comme `local.query`
 * le fait dans chronology.js:16, car la coque reconstruit tout le DOM
 * (shell.js:533). Aucun nœud DOM n'est mémorisé ici. */
let converterValue = '';

const CSS = `
#${PANEL_ID}{
  margin:0 0 12px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.02);color:var(--muted);
  font-size:9px;line-height:1.55;font-variant-numeric:tabular-nums;
}
#${PANEL_ID} h2{margin:0 0 5px;color:var(--gold);font-family:var(--serif);font-size:12px;font-weight:450}
#${PANEL_ID} p{margin:0 0 5px}
#${PANEL_ID} p:last-child{margin-bottom:0}
#${DETAIL_ID}{color:var(--ink-soft)}
.e071-calendar{margin:6px 0}
.e071-calendar-bar{position:relative;height:8px;margin:4px 0 0;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.03)}
.e071-marker{position:absolute;top:-3px;width:2px;height:14px;background:var(--gold-bright)}
.e071-converter{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px}
.e071-converter label{min-height:24px;color:var(--muted)}
.e071-converter input{
  min-height:36px;width:96px;padding:5px 8px;border:1px solid var(--line);border-radius:7px;
  background:var(--surface-2);color:var(--ink);font:inherit;font-size:10px;
}
.e071-converter button{
  min-height:36px;padding:5px 12px;border:1px solid var(--line);border-radius:7px;
  background:transparent;color:var(--gold-bright);font:inherit;font-size:10px;cursor:pointer;
}
.e071-converter button:hover{border-color:var(--gold)}
.e071-converter button:focus-visible,.e071-converter input:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
#${OUTPUT_ID}{flex:1 1 100%;color:var(--ink-soft)}
[data-e071-reduced="1"] .e071-marker{transition:none}
@media (max-width:620px){
  #${PANEL_ID}{padding:7px 8px}
  .e071-converter input{width:84px}
}
@media (prefers-reduced-motion:reduce){
  .e071-marker{transition:none}
}`;

function setText(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function all(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

/* E071-01 — légende : l'étiquette brute de chronology.js:26-28 (`-600` →
 * « 600 av. J.-C. ») ne dit pas que la numérotation ne comporte pas d'an zéro. */
function friendly(year) {
  if (year === 0) return '1 av. J.-C. (an 0 astronomique)';
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : `${year} apr. J.-C.`;
}

function roman(value) {
  const table = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let rest = Math.max(1, Math.trunc(value));
  let out = '';
  table.forEach(([amount, glyph]) => {
    while (rest >= amount) { out += glyph; rest -= amount; }
  });
  return out;
}

function ordinal(value) {
  return value === 1 ? '1er' : `${value}e`;
}

/* E071-03 — siècle : 1789 → XVIIIe siècle ; 600 av. J.-C. → VIe siècle
 * av. J.-C. (un siècle av. J.-C. couvre les années 600 à 501). */
function centuryText(year) {
  const rank = Math.max(1, Math.ceil(Math.abs(year) / 100));
  const numeral = roman(rank) + (rank === 1 ? 'er' : 'e');
  return `${numeral} siècle${year < 0 ? ' av. J.-C.' : ''}`;
}

/* E071-04 — année astronomique : la convention décale d'une unité les années
 * av. J.-C. (1 av. J.-C. = 0, 600 av. J.-C. = -599). */
function astronomical(year) {
  return year < 0 ? year + 1 : year;
}

/* E071-07 — millénaire : 2026 → 3e millénaire ; -600 → 1er millénaire
 * av. J.-C. */
function millenniumText(year) {
  const rank = Math.max(1, Math.ceil(Math.abs(year) / 1000));
  return `${ordinal(rank)} millénaire${year < 0 ? ' av. J.-C.' : ''}`;
}

/* Conversion complète, réutilisée par l'infobulle (E071-02), le panneau de
 * détail clavier (E071-09) et le convertisseur (E071-08). */
function conversion(year) {
  return `${friendly(year)} · ${centuryText(year)} · ${millenniumText(year)}`
    + ` · année astronomique ${astronomical(year)}.`;
}

function signed(value) {
  return value >= 0 ? `+${value}` : String(value);
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

/* E071-05 / E071-06 — les bornes d'ère sont celles posées par la vue dans
 * `data-start` / `data-end` (chronology.js:288-289). */
function eraMap(main) {
  const map = new Map();
  all(main, '#atlas-chrono-eras .era-band').forEach((band) => {
    const id = band.dataset.eraId;
    if (!id) return;
    const nameNode = band.querySelector('span');
    const start = Number(band.dataset.start);
    const end = Number(band.dataset.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;
    map.set(id, {
      name: nameNode ? nameNode.textContent.trim() : id,
      start,
      end,
    });
  });
  return map;
}

function yearEvents(main) {
  return all(main, '#atlas-chrono-events li[data-year]');
}

function currentEventItem(main) {
  const card = main.querySelector('.event-card[aria-current="true"]');
  return card ? card.closest('li[data-year]') : null;
}

function describe(item, eras) {
  const year = Number(item.dataset.year);
  if (!Number.isFinite(year)) return 'Aucune année renseignée pour ce repère.';
  let text = `Conversion du repère : ${conversion(year)}`;
  const era = eras.get(item.dataset.eraId);
  if (era) {
    const offset = year - era.start;
    const span = era.end - era.start;
    const percent = span > 0 ? clampPercent((offset / span) * 100) : 0;
    text += ` Dans l'ère « ${era.name} » (${friendly(era.start)} → ${friendly(era.end)}) :`
      + ` décalage arithmétique de ${signed(offset)} an(s) depuis le début,`
      + ` soit ${Math.round(percent)} % de la période.`;
  }
  return text;
}

/* E071-10 — un nœud par identifiant, réutilisé s'il existe déjà, déplacé dans
 * le parent courant sinon. Le CSS est, lui, protégé par `cssOnce` du registre
 * (registry.js:13-19). */
function ensure(ctx, id, tag, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = ctx.el(tag, className);
    node.id = id;
  }
  if (node.parentNode !== parent) parent.appendChild(node);
  return node;
}

function buildPanel(ctx, main, status) {
  const panel = ensure(ctx, PANEL_ID, 'section', 'e071-panel', main);
  const title = ensure(ctx, TITLE_ID, 'h2', 'e071-title', panel);
  title.textContent = 'Dates, calendriers et conversion des repères';
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const legend = ensure(ctx, LEGEND_ID, 'p', 'e071-legend', panel);
  legend.textContent = 'Notation : une année négative du jeu se lit « av. J.-C. »'
    + ' (ex. -600 → 600 av. J.-C.), une année positive « apr. J.-C. ».'
    + ' La numérotation historique passe de 1 av. J.-C. à 1 apr. J.-C. sans année zéro :'
    + ' l’année astronomique 0 équivaut à 1 av. J.-C.'
    + ' Toutes les conversions ci-dessous sont arithmétiques et n’inventent aucun fait.';

  const detail = ensure(ctx, DETAIL_ID, 'p', 'e071-detail', panel);
  const calendar = ensure(ctx, CALENDAR_ID, 'div', 'e071-calendar', panel);
  const calendarText = ensure(ctx, CALENDAR_TEXT_ID, 'p', 'e071-calendar-text', calendar);
  const bar = ensure(ctx, CALENDAR_BAR_ID, 'div', 'e071-calendar-bar', calendar);
  bar.setAttribute('aria-hidden', 'true');
  const marker = ensure(ctx, MARKER_ID, 'span', 'e071-marker', bar);

  const converter = ensure(ctx, CONVERTER_ID, 'div', 'e071-converter', panel);
  const label = ensure(ctx, LABEL_ID, 'label', 'e071-label', converter);
  label.textContent = 'Année à convertir (négative = av. J.-C.)';
  const input = ensure(ctx, INPUT_ID, 'input', 'e071-input', converter);
  input.type = 'number';
  input.step = '1';
  label.setAttribute('for', INPUT_ID);
  input.setAttribute('aria-label', 'Année entière à convertir');
  const button = ensure(ctx, BUTTON_ID, 'button', 'e071-button', converter);
  button.type = 'button';
  button.textContent = 'Convertir';
  const output = ensure(ctx, OUTPUT_ID, 'p', 'e071-output', converter);

  if (status) main.insertBefore(panel, status.nextSibling);
  else main.prepend(panel);

  return { panel, detail, calendarText, marker, input, button, output };
}

/* E071-09 — l'infobulle native `title` ne s'adresse qu'au pointeur ; le panneau
 * de détail, mis à jour au focus du clavier, en est l'équivalent accessible. */
function updateDateView(main, eras, nodes, item) {
  const target = item || currentEventItem(main);
  const detailText = target
    ? describe(target, eras)
    : 'Survolez ou focalisez un repère pour afficher sa conversion de date.';
  setText(nodes.detail, detailText);

  const year = target ? Number(target.dataset.year) : NaN;
  const era = target ? eras.get(target.dataset.eraId) : null;
  if (!era || !Number.isFinite(year)) {
    setText(nodes.calendarText, 'Calendrier de l’ère : aucun repère à situer pour le moment.');
    nodes.marker.style.left = '0%';
    return;
  }
  const span = era.end - era.start;
  const percent = span > 0 ? clampPercent(((year - era.start) / span) * 100) : 0;
  nodes.marker.style.left = `${percent}%`;
  setText(nodes.calendarText,
    `Ère « ${era.name} » : ${friendly(era.start)} → ${friendly(era.end)}.`
    + ` Repère à ${Math.round(percent)} % de la période`
    + ` (décalage ${signed(year - era.start)} an(s)).`);
}

register('E071', (ctx) => {
  if (!ctx || typeof ctx.el !== 'function' || typeof ctx.css !== 'function') return;
  const layout = ctx.layout
    || (ctx.stage && typeof ctx.stage.querySelector === 'function'
      ? ctx.stage.querySelector('.chronology-layout') : null);
  if (!layout || typeof layout.querySelector !== 'function') return;
  const main = layout.querySelector('#atlas-chrono-main');
  if (!main) return; /* la vue chronologie n'est pas rendue : lentille inactive */

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e071 = '1';
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }

  const status = main.querySelector('#atlas-chrono-status');
  const nodes = buildPanel(ctx, main, status);
  const eras = eraMap(main);

  /* E071-02 — infobulles natives sur chaque millésime de carte. La garde
   * `data-e071-titled` évite de dupliquer le texte si la lentille est rejouée
   * sans reconstruction du DOM. */
  yearEvents(main).forEach((item) => {
    const year = Number(item.dataset.year);
    if (!Number.isFinite(year)) return;
    const stamp = item.querySelector('.event-year');
    if (!stamp || stamp.dataset.e071Titled === '1') return;
    const text = `Repère : ${conversion(year)}`;
    stamp.title = stamp.title ? `${stamp.title} · ${text}` : text;
    stamp.dataset.e071Year = String(year);
    stamp.dataset.e071Astro = String(astronomical(year));
    stamp.dataset.e071Titled = '1';
  });

  /* E071-08 — convertisseur réversible : une valeur entière, négative pour
   * une année av. J.-C., est traduite par la même fonction que les infobulles. */
  nodes.input.value = converterValue;
  nodes.input.addEventListener('input', () => { converterValue = nodes.input.value; });
  const runConversion = () => {
    const raw = converterValue.trim();
    const year = Number(raw);
    if (raw === '' || !Number.isInteger(year)) {
      setText(nodes.output,
        'Saisissez une année entière : une valeur négative désigne une année av. J.-C.');
      return;
    }
    setText(nodes.output, conversion(year));
  };
  nodes.button.addEventListener('click', runConversion);
  nodes.input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); runConversion(); }
  });

  /* Écouteurs locaux au `main` courant : détruits avec la coque (shell.js:533),
   * donc aucun cumul entre rendus, aucun écouteur global. */
  const list = main.querySelector('#atlas-chrono-events');
  if (list) {
    list.addEventListener('focusin', (event) => {
      const card = event.target && event.target.closest ? event.target.closest('.event-card') : null;
      const item = card ? card.closest('li[data-year]') : null;
      if (item) updateDateView(main, eras, nodes, item);
    });
  }

  updateDateView(main, eras, nodes, null);
});
