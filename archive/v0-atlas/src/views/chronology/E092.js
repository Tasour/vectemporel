import { register } from './registry.js';

/* Lentille CHRONOLOGIE E092 — événements chevauchants et empilement lisible.
 *
 * Dix chantiers E092-01 … E092-10, tous implémentés dans ce module :
 *   E092-01 bande de simultanéité positionnée sur l'axe réel de l'ère ;
 *   E092-02 empilement en couloirs des marqueurs collidants ;
 *   E092-03 ordre déterministe des couloirs (zéro aléa) ;
 *   E092-04 compteurs textuels de chevauchement (jamais la couleur seule) ;
 *   E092-05 lien marqueur ↔ carte et survol synchronisé (sans toucher au store) ;
 *   E092-06 mode d'empilement « couloirs / compact » en radiogroup ;
 *   E092-07 regroupement thématique indépendant (aria-pressed dédié) ;
 *   E092-08 mouvement réduit respecté (ctx.reducedMotion + écouteur unique) ;
 *   E092-09 re-render safe : IDs préfixés e092, gardes, écouteurs locaux ;
 *   E092-10 readout chiffré et région live, sans rAF ni timer.
 *
 * Contrat : un seul register('E092', ctx), CSS unique via
 * ctx.css('chronology-e092', …), zéro journalisation, zéro réseau, zéro
 * aléa, zéro boucle d'animation propre, zéro timer. Toutes les
 * données lues (années, bornes d'ère, importance, thèmes, couleurs) viennent
 * des attributs réels posés par chronology.js — aucune valeur n'est inventée.
 */

const CSS_ID = 'chronology-e092';
const PANEL_ID = 'e092-panel';
const TITLE_ID = 'e092-title';
const CONTROLS_ID = 'e092-controls';
const MODE_ID = 'e092-mode';
const THEME_ID = 'e092-theme';
const STRIP_ID = 'e092-strip';
const LEGEND_ID = 'e092-legend';
const READOUT_ID = 'e092-readout';

/* Seuil d'affichage, exprimé en fraction de l'axe : il sert uniquement à
 * décider quand deux marqueurs se gênent visuellement. Ce n'est PAS une
 * donnée historique ni une affirmation de simultanéité. */
const EPS = 0.025;
const LANE_H = 22;

/* Préférences locales, conservées entre deux reconstructions du DOM. */
const prefs = { mode: 'lanes', theme: false };
let currentPanel = null;
let motionBound = false;

const CSS = `
.e092-panel{margin:10px 0 14px;padding:9px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.e092-title{margin:0 0 7px;color:var(--ink-soft);font-family:var(--serif);font-size:12px;font-weight:450}
.e092-controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 8px}
.e092-mode{display:inline-flex;flex-wrap:wrap;gap:4px;margin:0;padding:0;border:0}
.e092-mode-option{display:inline-flex;align-items:center;min-height:28px;padding:3px 9px;border:1px solid var(--line);border-radius:7px;color:var(--muted);font-size:9px;cursor:pointer}
.e092-mode-label{pointer-events:none}
.e092-mode input{position:absolute;width:1px;height:1px;opacity:0}
.e092-mode input:checked + .e092-mode-label{color:var(--gold-bright)}
.e092-mode-option:has(input:checked){border-color:var(--gold);background:rgba(230,185,111,.1)}
.e092-mode-option:focus-within,.e092-theme:focus-visible,.e092-marker:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e092-theme{min-height:28px;padding:3px 9px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--muted);font-size:9px;cursor:pointer}
.e092-theme[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.1)}
.e092-strip{position:relative;min-height:34px;border:1px solid var(--line);border-radius:6px;background:rgba(0,0,0,.12);overflow:hidden}
.e092-track{position:absolute;left:8px;right:8px;top:50%;height:1px;background:var(--line)}
.e092-bound{position:absolute;top:2px;color:var(--muted-2);font-size:8px;font-variant-numeric:tabular-nums}
.e092-bound.e092-start{left:5px}
.e092-bound.e092-end{right:5px}
.e092-marker{position:absolute;min-width:24px;min-height:24px;padding:0 3px;border:1px solid var(--era,var(--gold));border-radius:6px;background:var(--surface-2);color:var(--ink);font-size:9px;font-variant-numeric:tabular-nums;line-height:1;cursor:pointer;transform:translate(-50%,-50%)}
.e092-marker[aria-current="true"],.e092-marker[data-e092-active="1"]{border-color:var(--gold-bright);box-shadow:0 0 0 1px rgba(230,185,111,.35)}
.event-card[data-e092-active="1"]{box-shadow:0 0 0 2px var(--gold-bright)}
.e092-legend{margin:6px 0 0;color:var(--muted-2);font-size:8px;line-height:1.5}
.e092-readout{min-height:12px;margin:5px 0 0;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
@media (max-width:620px){.e092-panel{padding:7px}.e092-controls{flex-direction:column;align-items:stretch}}
.e092-panel[data-e092-reduced="1"] .e092-marker,.e092-panel[data-e092-reduced="1"] .event-card{transition:none!important}
`;

function makeEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function num(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatYear(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/* E092-08 : un seul écouteur de préférence de mouvement, armé une fois.
 * Il ne touche qu'un panneau encore connecté, jamais un nœud périmé. */
function ensureMotionBinding() {
  if (motionBound) return;
  motionBound = true;
  const sync = (matches) => {
    if (currentPanel && currentPanel.isConnected) {
      currentPanel.setAttribute('data-e092-reduced', matches ? '1' : '0');
    }
  };
  try {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    sync(query.matches);
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', (event) => sync(Boolean(event.matches)));
    } else if (typeof query.addListener === 'function') {
      query.addListener((event) => sync(Boolean(event.matches)));
    }
  } catch {
    sync(false);
  }
}

/* E092-05 : mise en évidence réciproque marqueur ↔ carte, sans état global. */
function setHighlight(eventItem, on) {
  [eventItem.marker, eventItem.card].filter(Boolean).forEach((node) => {
    if (on) node.setAttribute('data-e092-active', '1');
    else node.removeAttribute('data-e092-active');
  });
}

/* Lecture des seules données réelles exposées par chronology.js:378-383
 * (data-event-id, data-year, data-era-id, data-importance, data-tags) et
 * par la carte (titre fort, aria-current, identifiant). */
function collectEvents(list) {
  return Array.from(list.querySelectorAll('li[data-event-id]')).map((li, index) => {
    const id = li.getAttribute('data-event-id') || '';
    const card = li.querySelector('.event-card')
      || (id ? document.getElementById(`event-btn-${id}`) : null);
    const strong = card ? card.querySelector('strong') : null;
    const eraId = li.getAttribute('data-era-id') || '';
    const band = eraId ? document.getElementById(`era-${eraId}`) : null;
    return {
      id,
      li,
      card,
      year: num(li.getAttribute('data-year'), 0),
      importance: num(li.getAttribute('data-importance'), 0),
      tags: (li.getAttribute('data-tags') || '').split(/\s+/).filter(Boolean),
      color: band ? (band.style.getPropertyValue('--era') || '') : '',
      title: strong ? strong.textContent.trim() : 'Repère sans titre',
      rank: index + 1,
      current: Boolean(card && card.getAttribute('aria-current') === 'true'),
      x: 0,
      lane: 0,
      marker: null,
    };
  });
}

/* Axe réel : bornes de l'ère courante (chronology.js:288-289), sinon
 * repli sur les années effectivement affichées (recherche multi-ères). */
function axisRange(events, layout) {
  const band = layout.querySelector('.era-band[aria-current="true"]');
  let start = band ? num(band.getAttribute('data-start'), NaN) : NaN;
  let end = band ? num(band.getAttribute('data-end'), NaN) : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !events.length) {
    const years = events.map((item) => item.year);
    start = years.length ? Math.min.apply(null, years) : 0;
    end = years.length ? Math.max.apply(null, years) : start + 1;
  }
  if (end <= start) end = start + 1;
  return { start, end };
}

/* E092-02 / E092-03 : groupes de collision déterministes. Le tri porte sur
 * l'année, puis l'importance décroissante, puis l'identifiant : aucun aléa,
 * aucune dépendance à l'ordre d'itération du DOM au-delà du rang affiché. */
function groupEvents(events, axis, theme) {
  const span = axis.end - axis.start;
  events.forEach((item) => { item.x = clamp01((item.year - axis.start) / span); });

  const sorted = events.slice().sort((a, b) => {
    if (theme) {
      const firstA = a.tags[0] || '';
      const firstB = b.tags[0] || '';
      if (firstA !== firstB) return firstA.localeCompare(firstB, 'fr');
    }
    return (a.year - b.year) || (b.importance - a.importance) || a.id.localeCompare(b.id, 'fr');
  });

  const groups = [];
  sorted.forEach((item) => {
    const last = groups[groups.length - 1];
    const joins = last && (theme
      ? last.key === (item.tags[0] || '')
      : Math.abs(item.x - last.anchorX) <= EPS);
    if (joins) last.items.push(item);
    else groups.push({ key: theme ? (item.tags[0] || '') : '', anchorX: item.x, items: [item] });
  });

  groups.forEach((group) => {
    group.items.forEach((item, index) => {
      item.lane = prefs.mode === 'lanes' ? index : 0;
    });
  });
  return groups;
}

/* E092-01 / E092-02 / E092-04 / E092-05 / E092-10 : dessin du panneau.
 * Tout est reconstruit à partir de zéro à chaque repaint : aucun écouteur
 * ne survit à un ancien marqueur, aucun ID n'est dupliqué. */
function paint(panel, data) {
  const strip = document.getElementById(STRIP_ID);
  const legend = document.getElementById(LEGEND_ID);
  const readout = document.getElementById(READOUT_ID);
  if (!strip || !legend || !readout || !panel.contains(strip)) return;

  const { events, groups, axis, maxLanes } = data;
  const overlapping = groups.filter((group) => group.items.length > 1).length;

  strip.replaceChildren();
  strip.style.height = `${Math.max(34, maxLanes * LANE_H + 10)}px`;
  strip.setAttribute('data-e092-mode', prefs.mode);
  strip.setAttribute('data-e092-theme', prefs.theme ? '1' : '0');
  strip.setAttribute('data-e092-groups', String(overlapping));
  strip.setAttribute('data-e092-density', String(maxLanes));

  const track = makeEl('div', 'e092-track');
  track.setAttribute('aria-hidden', 'true');
  const startLabel = makeEl('span', 'e092-bound e092-start', formatYear(axis.start));
  const endLabel = makeEl('span', 'e092-bound e092-end', formatYear(axis.end));
  startLabel.setAttribute('aria-hidden', 'true');
  endLabel.setAttribute('aria-hidden', 'true');
  strip.append(track, startLabel, endLabel);

  groups.forEach((group) => {
    group.items.forEach((item) => {
      const marker = makeEl('button', 'e092-marker', String(item.rank));
      marker.type = 'button';
      marker.id = `e092-marker-${item.id}`;
      marker.style.left = `${(item.x * 100).toFixed(2)}%`;
      marker.style.top = `${item.lane * LANE_H + LANE_H / 2 + 5}px`;
      if (item.color) marker.style.setProperty('--era', item.color);
      if (item.current) marker.setAttribute('aria-current', 'true');
      if (item.card && item.card.id) marker.setAttribute('aria-controls', item.card.id);
      marker.setAttribute('data-e092-event-id', item.id);
      marker.setAttribute('data-e092-year', String(item.year));
      marker.setAttribute('data-e092-lane', String(item.lane));
      marker.setAttribute('data-e092-group-size', String(group.items.length));
      marker.setAttribute('data-e092-rank', String(item.rank));

      const keyLabel = prefs.theme
        ? (group.key ? `, thème ${group.key}` : ', sans thème')
        : `, couloir ${item.lane + 1}`;
      marker.setAttribute('aria-label', `Repère ${item.rank} : ${item.title}, ${formatYear(item.year)}${keyLabel}, ${group.items.length} simultané(s).`);

      item.marker = marker;
      marker.addEventListener('click', () => {
        /* Réutilise le gestionnaire existant (chronology.js:406-409) plutôt
         * que d'importer le store : la fiche se met à jour normalement. */
        if (item.card && typeof item.card.click === 'function') item.card.click();
      });
      marker.addEventListener('mouseenter', () => setHighlight(item, true));
      marker.addEventListener('mouseleave', () => setHighlight(item, false));
      marker.addEventListener('focus', () => setHighlight(item, true));
      marker.addEventListener('blur', () => setHighlight(item, false));
      strip.appendChild(marker);
    });
  });

  legend.textContent = events.length
    ? `Chaque pastille porte le rang du repère ; son étiquette donne l'année, le couloir et le nombre de simultanés. Axe réel de l'ère : ${formatYear(axis.start)} → ${formatYear(axis.end)}.`
    : `Aucun repère tracé : l'axe de l'ère couvre ${formatYear(axis.start)} → ${formatYear(axis.end)}.`;

  readout.textContent = events.length
    ? `${events.length} repère(s) tracé(s) · ${overlapping} groupe(s) chevauchant(s) · densité maximale ${maxLanes} simultané(s) sur une plage de ${axis.end - axis.start} an(s) (référence).`
    : `0 repère tracé dans le périmètre courant ; densité maximale 0 sur une plage de ${axis.end - axis.start} an(s) (référence).`;
}

register('E092', (ctx) => {
  const layout = ctx && ctx.layout;
  const list = layout ? layout.querySelector('#atlas-chrono-events') : null;
  if (!layout || !list || !list.parentNode) return;

  const el = (ctx && typeof ctx.el === 'function') ? ctx.el : makeEl;
  const css = (ctx && typeof ctx.css === 'function') ? ctx.css.bind(ctx) : () => {};
  const reduced = (ctx && typeof ctx.reducedMotion === 'function') ? !!ctx.reducedMotion() : false;

  css(CSS_ID, CSS);

  /* E092-09 : le panneau est inséré avant la liste, dans .chronology-main.
   * S'il existe déjà sous ce même parent, on le réutilise (garde d'existence)
   * plutôt que d'en créer un second ; puis on vide et on reconstruit. */
  let panel = document.getElementById(PANEL_ID);
  if (!panel || !list.parentNode.contains(panel)) {
    panel = el('section', 'e092-panel');
    panel.id = PANEL_ID;
    list.parentNode.insertBefore(panel, list);
  }
  currentPanel = panel;
  panel.setAttribute('data-e092-reduced', reduced ? '1' : '0');
  panel.setAttribute('aria-labelledby', TITLE_ID);
  panel.replaceChildren();

  const title = el('h2', 'e092-title', 'Simultanéités — empilement lisible des repères');
  title.id = TITLE_ID;

  const controls = el('div', 'e092-controls');
  controls.id = CONTROLS_ID;

  /* E092-06 : choix unique → radiogroup, jamais aria-pressed. */
  const radios = el('div', 'e092-mode');
  radios.id = MODE_ID;
  radios.setAttribute('role', 'radiogroup');
  radios.setAttribute('aria-label', "Mode d'empilement des repères simultanés");
  [['lanes', 'Couloirs'], ['compact', 'Compact']].forEach(([value, label]) => {
    const option = el('label', 'e092-mode-option');
    const input = el('input');
    input.type = 'radio';
    input.name = 'e092-mode';
    input.value = value;
    input.checked = prefs.mode === value;
    const span = el('span', 'e092-mode-label', label);
    option.append(input, span);
    input.addEventListener('change', () => {
      if (!input.checked) return;
      prefs.mode = value;
      repaint();
    });
    radios.appendChild(option);
  });

  /* E092-07 : bascule indépendante → aria-pressed réservé à celle-ci. */
  const themeButton = el('button', 'e092-theme',
    prefs.theme ? 'Chevauchement par thème : actif' : 'Regrouper par thème');
  themeButton.type = 'button';
  themeButton.id = THEME_ID;
  themeButton.setAttribute('aria-pressed', prefs.theme ? 'true' : 'false');
  themeButton.addEventListener('click', () => {
    prefs.theme = !prefs.theme;
    themeButton.setAttribute('aria-pressed', prefs.theme ? 'true' : 'false');
    themeButton.textContent = prefs.theme
      ? 'Chevauchement par thème : actif' : 'Regrouper par thème';
    repaint();
  });
  controls.append(radios, themeButton);

  const strip = el('div', 'e092-strip');
  strip.id = STRIP_ID;
  strip.setAttribute('role', 'group');
  strip.setAttribute('aria-label', 'Bande de simultanéité des repères');

  const legend = el('p', 'e092-legend');
  legend.id = LEGEND_ID;
  const readout = el('p', 'e092-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');

  panel.append(title, controls, strip, legend, readout);

  const events = collectEvents(list);
  const axis = axisRange(events, layout);

  function repaint() {
    const groups = groupEvents(events, axis, prefs.theme);
    const maxLanes = groups.reduce((maximum, group) => Math.max(maximum, group.items.length), 0);
    paint(panel, { events, groups, axis, maxLanes });
  }

  repaint();
  ensureMotionBinding();
});
