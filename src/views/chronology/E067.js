import { register } from './registry.js';

/* E067 — ligne de temps continue, rail et jalons proportionnels.
   Lentille autonome, en lecture seule sur le DOM produit par chronology.js :
   elle n'importe aucun autre module de la vue, n'écrit ni le store ni les
   fichiers partagés et n'invente aucune donnée historique. Toutes les valeurs
   affichées proviennent des attributs réellement rendus (data-start / data-end
   des bandes d'ère, data-year / data-event-id des repères) et du texte déjà
   visible dans les cartes. Invariants : un seul enregistrement, un seul bloc
   CSS via ctx.css('chronology-e067', …), des identifiants préfixés e067
   protégés par des gardes d'existence, zéro console, zéro réseau, zéro aléa,
   zéro timer et zéro boucle d'animation propre au greffon. Français partout. */

const CSS_ID = 'chronology-e067';
const RAIL_ID = 'e067-rail';
const CAPTION_ID = 'e067-caption';
const ERAS_ID = 'e067-eras';
const MARKS_ID = 'e067-marks';
const AXIS_ID = 'e067-axis';
const CURSOR_ID = 'e067-cursor';
const GO_ID = 'e067-go';
const READOUT_ID = 'e067-readout';

/* E067-01 — bloc CSS unique, injecté par ctx.css qui possède sa propre garde
   par identifiant (registry.js:13-19). Aucune règle de styles.css n'est
   modifiée ; tous les sélecteurs sont préfixés e067. */
const CSS = `
.e067-rail {
  margin:0 0 16px; padding:10px 12px 8px;
  border:1px solid var(--line); border-radius:10px;
  background:rgba(255,255,255,.02); color:var(--muted);
  font-size:10px; line-height:1.5;
}
.e067-head { display:flex; flex-wrap:wrap; gap:3px 12px; align-items:baseline; margin:0 0 8px; }
.e067-title { margin:0; color:var(--gold); font-size:9px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; }
.e067-caption { margin:0; color:var(--muted-2); font-size:9px; line-height:1.4; }
.e067-track { position:relative; height:34px; margin:0 6px; border-bottom:1px solid var(--line); }
.e067-eras, .e067-marks { position:absolute; inset:0; margin:0; padding:0; list-style:none; }
.e067-era {
  position:absolute; top:0; height:8px; min-width:2px;
  border-radius:2px; background:var(--e067-era,var(--gold)); opacity:.55; overflow:hidden;
}
.e067-era-label { display:block; padding:0 3px; color:#0b0d12; font-size:7px; line-height:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.e067-mark {
  position:absolute; bottom:4px; width:8px; height:8px; margin-left:-4px;
  border:1px solid var(--gold); border-radius:50%; background:var(--surface-2,#0b0d12);
  transition:transform .12s ease, box-shadow .12s ease;
}
.e067-mark.is-active {
  width:12px; height:12px; margin-left:-6px; border-width:2px;
  box-shadow:0 0 0 3px rgba(230,185,111,.18); transform:translateY(-2px);
}
.e067-axis { display:flex; justify-content:space-between; margin:3px 6px 0; color:var(--muted-2); font-size:8px; font-variant-numeric:tabular-nums; }
.e067-controls { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:8px 0 0; }
.e067-cursor { flex:1 1 180px; min-width:140px; min-height:24px; accent-color:var(--gold); }
.e067-cursor:disabled { opacity:.45; }
.e067-go {
  min-height:36px; padding:5px 12px; border:1px solid var(--line); border-radius:8px;
  background:transparent; color:var(--gold-bright); font-size:10px; cursor:pointer;
}
.e067-go:hover:not(:disabled) { border-color:var(--gold); }
.e067-go:disabled { opacity:.45; cursor:not-allowed; }
.e067-go:focus-visible, .e067-cursor:focus-visible { outline:2px solid var(--gold-bright); outline-offset:2px; }
.e067-readout { margin:7px 0 0; color:var(--muted); font-size:9px; line-height:1.5; }
@media (max-width:620px) {
  .e067-rail { padding:8px 9px; }
  .e067-track { margin:0 3px; }
  .e067-controls { flex-direction:column; align-items:stretch; }
  .e067-cursor { width:100%; }
}
@media (prefers-reduced-motion:reduce) {
  .e067-mark, .e067-mark.is-active { transition:none !important; transform:none; }
}`;

/* Substituables à chaque rendu par ctx.el / ctx.reducedMotion ; les replis
   locaux gardent les écouteurs délégués fonctionnels si ctx est incomplet. */
let create = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};
let prefersReduced = () => false;
let currentEvents = [];

/* Calque local de formatYear (chronology.js:26-28) : les années négatives
   restent lisibles « av. J.-C. » sans jamais toucher au formateur de la vue. */
function formatYear(raw) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return raw == null || raw === '' ? '—' : String(raw);
  return value < 0 ? `${Math.abs(value)} av. J.-C.` : String(value);
}

function numeric(raw) {
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

/* E067-07 — réutilise un nœud existant, le déplace dans le parent courant et
   ne le recrée que s'il est absent du document. Le stage étant reconstruit à
   chaque rendu (chronology.js:30-33), un simple getElementById suffit à
   garantir l'unicité des identifiants e067. */
function ensureNode(parent, id, tag, className) {
  let node = document.getElementById(id);
  if (!node || !node.isConnected) {
    node = create(tag, className);
    node.id = id;
  } else if (className && !node.classList.contains(className)) {
    node.className = className;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E067-02 — les durées d'ère sont déjà publiées en attributs par la vue
   (chronology.js:288-289) ; elles sont lues telles quelles, sans importer le
   jeu de données. */
function readEras(main) {
  return [...main.querySelectorAll('.era-band[data-start][data-end]')].map((band) => ({
    name: band.querySelector('span')?.textContent?.trim() || band.getAttribute('title') || 'Ère',
    start: numeric(band.dataset.start),
    end: numeric(band.dataset.end),
    color: band.style.getPropertyValue('--era').trim() || 'var(--gold)',
  }));
}

/* E067-03 et E067-06 — les jalons sont lus sur les <li data-event-id> réellement
   rendus (chronology.js:378-383), pas sur une copie du store : le périmètre
   change avec la recherche et les thèmes (chronology.js:178-188). */
function readEvents(main) {
  const list = main.querySelector('#atlas-chrono-events');
  if (!list) return [];
  return [...list.querySelectorAll('li[data-event-id]')].map((item) => {
    const card = item.querySelector('.event-card');
    return {
      id: item.dataset.eventId || card?.dataset.eventId || '',
      year: numeric(item.dataset.year),
      eraId: item.dataset.eraId || '',
      title: card?.querySelector('strong')?.textContent?.trim() || '',
      active: Boolean(card && (card.getAttribute('aria-current') === 'true' || card.classList.contains('is-active'))),
      card,
    };
  });
}

function computeBounds(eras, events) {
  const values = [];
  eras.forEach((era) => {
    if (era.start !== null) values.push(era.start);
    if (era.end !== null) values.push(era.end);
  });
  events.forEach((event) => {
    if (event.year !== null) values.push(event.year);
  });
  if (!values.length) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}

/* E067-03 — position normalisée ; le cas d'une amplitude nulle (repère unique
   ou ère ponctuelle) renvoie le centre, et le repli « rang » répartit les
   jalons également. Aucun NaN, aucune division par zéro, aucune valeur hors
   de [0, 100]. */
function positionOf(year, bounds, index, total, scale) {
  if (scale === 'rang') return total <= 1 ? 50 : (index / (total - 1)) * 100;
  if (!bounds || bounds.max === bounds.min || year === null) return 50;
  return clampPercent(((year - bounds.min) / (bounds.max - bounds.min)) * 100);
}

function valueText(index) {
  const event = currentEvents[index];
  if (!event) return 'Aucun repère sur l’axe';
  return `${formatYear(event.year)}, rang ${index + 1} sur ${currentEvents.length}`;
}

function install(ctx) {
  if (!ctx) return;
  if (ctx.viewId !== undefined && ctx.viewId !== 'chronology') return;

  create = ctx.el || create;
  prefersReduced = ctx.reducedMotion || prefersReduced;
  ctx.css(CSS_ID, CSS);

  const layout = ctx.layout && ctx.layout.isConnected ? ctx.layout : null;
  const main = layout?.querySelector('.chronology-main') || document.getElementById('atlas-chrono-main');
  if (!main) return;

  const eras = readEras(main);
  const events = readEvents(main);
  currentEvents = events;
  const bounds = computeBounds(eras, events);
  const scale = bounds && bounds.max > bounds.min ? 'annee' : 'rang';
  const activeIndex = events.findIndex((event) => event.active);

  /* Le rail est inséré avant la navigation d'ère : il reste visible avant
     toute sélection, comme la bande de situation (chronology.js:258-275). */
  const rail = ensureNode(main, RAIL_ID, 'section', 'e067-rail');
  rail.setAttribute('aria-label', 'Ligne de temps continue');
  rail.classList.toggle('e067-reduced', Boolean(prefersReduced()));
  const anchor = main.querySelector('#atlas-chrono-eras')
    || main.querySelector('.atlas-chrono-tools')
    || main.querySelector('#atlas-chrono-events');
  if (anchor && rail.nextElementSibling !== anchor) main.insertBefore(rail, anchor);

  const span = bounds ? bounds.max - bounds.min : 0;
  const caption = ensureNode(rail, CAPTION_ID, 'p', 'e067-caption');
  caption.textContent = events.length
    ? `Axe continu : ${formatYear(bounds?.min)} → ${formatYear(bounds?.max)}. Les segments d'ère suivent leur durée, les jalons suivent leur année.`
    : 'Axe continu : aucun repère à placer dans ce périmètre.';

  /* E067-02 — segments proportionnels, avec plancher CSS de 2 px pour qu'une
     ère très courte reste perceptible sans fausser l'échelle des autres. */
  const eraList = ensureNode(rail, ERAS_ID, 'ol', 'e067-eras');
  eraList.setAttribute('aria-label', 'Ères proportionnelles à leur durée');
  eraList.replaceChildren();
  eras.forEach((era) => {
    const li = create('li', 'e067-era');
    const left = era.start !== null && span > 0 ? clampPercent(((era.start - bounds.min) / span) * 100) : 0;
    const width = era.start !== null && era.end !== null && span > 0
      ? clampPercent(((era.end - era.start) / span) * 100)
      : 0;
    li.style.left = `${left.toFixed(3)}%`;
    li.style.width = `${width.toFixed(3)}%`;
    li.style.setProperty('--e067-era', era.color);
    li.title = era.start !== null && era.end !== null
      ? `${era.name} : ${formatYear(era.start)} → ${formatYear(era.end)} (${Math.abs(era.end - era.start)} ans)`
      : era.name;
    li.dataset.e067Start = era.start === null ? '' : String(era.start);
    li.dataset.e067End = era.end === null ? '' : String(era.end);
    li.appendChild(create('span', 'e067-era-label', era.name));
    eraList.appendChild(li);
  });

  /* E067-03 et E067-05 — un jalon par repère visible, positionné par son
     année ; le jalon actif se distingue par sa taille, son anneau et un
     attribut de données, jamais par la couleur seule. */
  const markList = ensureNode(rail, MARKS_ID, 'ol', 'e067-marks');
  markList.setAttribute('aria-label', 'Jalons positionnés par année');
  markList.replaceChildren();
  events.forEach((event, index) => {
    const pct = positionOf(event.year, bounds, index, events.length, scale);
    const li = create('li', `e067-mark${index === activeIndex ? ' is-active' : ''}`);
    li.style.left = `${pct.toFixed(3)}%`;
    li.title = `${formatYear(event.year)} — ${event.title || 'repère'}${event.eraId ? ` · ${event.eraId}` : ''}`;
    li.dataset.e067EventId = event.id;
    li.dataset.e067Year = event.year === null ? '' : String(event.year);
    li.dataset.e067Position = pct.toFixed(2);
    if (index === activeIndex) li.dataset.e067Active = '1';
    else delete li.dataset.e067Active;
    markList.appendChild(li);
  });

  const axis = ensureNode(rail, AXIS_ID, 'div', 'e067-axis');
  axis.replaceChildren();
  axis.appendChild(create('span', 'e067-bound', bounds ? formatYear(bounds.min) : '—'));
  axis.appendChild(create('span', 'e067-bound', bounds ? formatYear(bounds.max) : '—'));

  /* E067-04 — le curseur est un aperçu clavier, pas un pilote du store :
     les cartes de chronology.js:406-409 déplacent le focus vers elles après
     un clic. On sépare donc l'aperçu (input) de l'action explicite (bouton),
     pour qu'une flèche ne fasse pas perdre le focus à l'utilisateur. */
  const cursor = ensureNode(rail, CURSOR_ID, 'input', 'e067-cursor');
  cursor.type = 'range';
  cursor.min = '0';
  cursor.max = String(Math.max(0, events.length - 1));
  const preview = activeIndex >= 0 ? activeIndex : 0;
  cursor.value = String(preview);
  cursor.disabled = events.length === 0;
  cursor.setAttribute('aria-label', 'Aperçu de la ligne de temps, repère par rang');
  cursor.setAttribute('aria-controls', MARKS_ID);
  cursor.setAttribute('aria-valuetext', valueText(preview));
  if (cursor.dataset.e067Bound !== '1') {
    cursor.dataset.e067Bound = '1';
    cursor.addEventListener('input', () => {
      const index = Number(cursor.value);
      const event = currentEvents[index];
      cursor.setAttribute('aria-valuetext', valueText(index));
      rail.dataset.e067Preview = String(index);
      const readout = document.getElementById(READOUT_ID);
      if (readout && event) {
        readout.textContent = `Aperçu : ${formatYear(event.year)}, ${event.title || 'repère'} — rang ${index + 1} sur ${currentEvents.length}.`;
      }
    });
  }

  const go = ensureNode(rail, GO_ID, 'button', 'e067-go');
  go.type = 'button';
  go.textContent = 'Ouvrir ce repère';
  go.disabled = events.length === 0;
  if (go.dataset.e067Bound !== '1') {
    go.dataset.e067Bound = '1';
    go.addEventListener('click', () => {
      const control = document.getElementById(CURSOR_ID);
      const event = currentEvents[Number(control?.value ?? 0)];
      if (!event?.card || !event.card.isConnected) return;
      event.card.click();
    });
  }

  /* E067-09 — trois grandeurs chiffrées au minimum, dont une comparée à une
     référence (le rang sur le total), dans une région live unique. */
  const readout = ensureNode(rail, READOUT_ID, 'p', 'e067-readout');
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  if (!events.length) {
    readout.textContent = 'Aucun repère à placer sur l’axe continu pour ce périmètre.';
  } else {
    const active = events[activeIndex];
    const where = active
      ? ` Repère actif : ${formatYear(active.year)}, rang ${activeIndex + 1}/${events.length}, ${positionOf(active.year, bounds, activeIndex, events.length, scale).toFixed(0)} % de l'axe.`
      : ' Aucun repère actif.';
    readout.textContent = `Axe continu : ${formatYear(bounds?.min)} → ${formatYear(bounds?.max)}${span ? ` (${Math.abs(span)} ans)` : ''}. ${events.length} repère(s) sur ${eras.length} ère(s).${where} Échelle ${scale === 'annee' ? 'proportionnelle aux années' : 'par rang'}.`;
  }

  /* E067-10 — miroir d'audit : état discret, lisible par un test sans
     instrumentation, recalculé à chaque rendu sans timer ni boucle rAF. */
  rail.dataset.e067Events = String(events.length);
  rail.dataset.e067Eras = String(eras.length);
  rail.dataset.e067Span = span ? String(Math.abs(span)) : '';
  rail.dataset.e067Scale = scale;
  rail.dataset.e067Active = activeIndex >= 0 ? String(activeIndex) : '';
  rail.dataset.e067Reduced = prefersReduced() ? '1' : '0';
  rail.dataset.e067Preview = String(preview);
}

register('E067', install);
