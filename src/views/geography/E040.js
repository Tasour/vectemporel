import { register } from './registry.js';

/* Lentille E040 — vue GEOGRAPHIE.
 * Thème : navigation clavier sur la carte.
 *
 * Les dix chantiers E040-01 … E040-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E040.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le texte pédagogique est du texte sémantique réel (titre,
 * paragraphes, tableau, statut) présent dans le DOM ; l'étiquetage et
 * l'animation ne font que révéler et parcourir la carte existante.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const PREFIX = 'geography-e040';
const PANEL_ID = PREFIX + '-panel';
const TITLE_ID = PREFIX + '-title';
const INTRO_ID = PREFIX + '-intro';
const TABLE_ID = PREFIX + '-keys';
const STATUS_ID = PREFIX + '-status';
const START_ID = PREFIX + '-start';
const STOP_ID = PREFIX + '-stop';
const ZIN_ID = PREFIX + '-zoom-in';
const ZOUT_ID = PREFIX + '-zoom-out';
const ZRESET_ID = PREFIX + '-zoom-reset';
const TOLIST_ID = PREFIX + '-to-list';
const TOMAP_ID = PREFIX + '-to-map';
const TOSEARCH_ID = PREFIX + '-to-search';
const TOSCOPE_ID = PREFIX + '-to-scope';
const NOTE_ID = PREFIX + '-note';

const MAP_W = 900; /* largeur de référence du viewBox de geography.js */
const TOUR_MS = 900; /* pas du parcours guidé, en millisecondes */

const SHORTCUTS = [
  { keys: ['←', '→'], label: 'Changer de lieu affiché sur la carte, dans l’ordre des marqueurs.' },
  { keys: ['Début', 'Fin'], label: 'Aller au premier ou au dernier marqueur de la carte.' },
  { keys: ['+', '='], label: 'Zoomer d’un cran autour du centre de la vue.' },
  { keys: ['−', '_'], label: 'Dézoomer d’un cran autour du centre de la vue.' },
  { keys: ['0'], label: 'Revenir à la vue initiale du cadre.' },
  { keys: ['S'], label: 'Atteindre le champ de recherche d’un lieu.' },
  { keys: ['P'], label: 'Atteindre la bascule de périmètre.' },
  { keys: ['Échap'], label: 'Arrêter le parcours guidé en cours.' },
];

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  lastMessage: 'Navigation clavier prête.',
  refocusIndex: null,
  reduced: false,
  tour: null,
  guardReady: false,
  visibilityReady: false,
};

/* ---------- Accès au DOM réel (aucune donnée inventée) ---------- */

function markers() {
  return Array.from(document.querySelectorAll('#c3b-map .geo-marker'));
}

function activeIndex(list) {
  const i = list.findIndex((node) => node.classList.contains('is-active'));
  return i < 0 ? 0 : i;
}

function markerLabel(node) {
  return (node.getAttribute('aria-label') || 'Lieu').replace(/ · lieu actif$/, '');
}

function announce(message) {
  S.lastMessage = message;
  const status = document.getElementById(STATUS_ID);
  if (status) status.textContent = message;
}

/* ---------- E040-01 : feuille de style isolée ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 6px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--muted);font-size:10px;line-height:1.65;
}
.${PREFIX}-title{margin:0 0 6px;font-size:12px;color:var(--gold-bright);}
.${PREFIX}-intro,.${PREFIX}-note{margin:4px 0 8px;font-size:10px;line-height:1.65;color:var(--muted);}
.${PREFIX}-note{color:var(--gold-bright);}
.${PREFIX}-table{width:100%;border-collapse:collapse;margin:8px 0 10px;font-size:10px;}
.${PREFIX}-table caption{text-align:left;padding:0 0 4px;color:var(--gold-bright);font-size:10px;}
.${PREFIX}-table th,.${PREFIX}-table td{border-bottom:1px solid var(--line);padding:5px 6px;text-align:left;vertical-align:top;}
.${PREFIX}-table th{font-weight:600;color:var(--gold-bright);font-size:9px;text-transform:uppercase;letter-spacing:.04em;}
.${PREFIX}-table td:first-child{white-space:nowrap;width:34%;}
.${PREFIX}-keys{display:inline-flex;flex-wrap:wrap;gap:3px;}
.${PREFIX}-keys kbd{
  display:inline-block;min-width:22px;text-align:center;padding:2px 6px;
  border:1px solid var(--line);border-radius:4px;background:rgba(255,255,255,.03);
  color:var(--gold-bright);font:inherit;font-size:9px;font-variant-numeric:tabular-nums;
}
.${PREFIX}-cmds{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 4px;}
.${PREFIX}-cmd{
  min-height:44px;min-width:44px;padding:6px 10px;border:1px solid var(--line);
  border-radius:8px;background:transparent;color:var(--muted);font:inherit;font-size:10px;
  line-height:1.35;cursor:pointer;
}
.${PREFIX}-cmd:hover{border-color:var(--gold);color:var(--gold-bright);}
.${PREFIX}-cmd:focus-visible,.${PREFIX}-table kbd:focus-visible{
  outline:2px solid var(--gold-bright);outline-offset:2px;
}
.${PREFIX}-cmd[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.10);}
.${PREFIX}-status{
  min-height:16px;margin:8px 0 0;padding:6px 8px;border-left:2px solid var(--gold);
  color:var(--ink);font-size:10px;font-variant-numeric:tabular-nums;
}

/* E040-07 : focus visible renforcé sur les marqueurs existants. */
#c3b-map .geo-marker:focus{outline:none;}
#c3b-map .geo-marker:focus-visible .geo-ring{stroke:#ffffff;stroke-width:3.2;}
#c3b-map:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px;}

/* E040-10 : marqueur courant du parcours guidé, distinction hors couleur. */
#c3b-map .geo-marker.${PREFIX}-step .geo-ring{
  stroke:#ffffff;stroke-width:3.6;stroke-dasharray:5 3;
  animation:${PREFIX}-pulse 1.05s ease-in-out infinite alternate;
}
#c3b-map .geo-marker.${PREFIX}-step text{fill:var(--gold-bright);font-weight:700;}
@keyframes ${PREFIX}-pulse{from{opacity:.62;}to{opacity:1;}}
@media (prefers-reduced-motion:reduce){
  #c3b-map .geo-marker.${PREFIX}-step .geo-ring{animation:none;stroke-dasharray:none;}
}
@media (max-width:620px){
  #${PANEL_ID}{padding:10px;}
  .${PREFIX}-cmd{min-height:40px;min-width:40px;}
  .${PREFIX}-table td:first-child{width:40%;}
}`;

/* ---------- E040-09 : garde-fou de capture, installé une seule fois ---------- */

function onKey(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  /* E040-10 : Échap interrompt le parcours, quelle que soit la cible. */
  if (event.key === 'Escape' && (S.tour || document.querySelector('.' + PREFIX + '-step'))) {
    event.preventDefault();
    event.stopPropagation();
    stopTour();
    clearStep();
    announce('Parcours guidé arrêté.');
    return;
  }
  if (event.altKey || event.ctrlKey || event.metaKey) return;

  const inMap = !!target.closest('#c3b-map');
  const inPanel = !!target.closest('#' + PANEL_ID);
  const typing = target.matches('input, textarea, select') || target.isContentEditable;

  /* E040-03 : flèches sur un marqueur — déplacement du focus dans l'ordre DOM. */
  const marker = target.closest('.geo-marker');
  const arrows = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (marker && arrows.includes(event.key)) {
    event.preventDefault();
    event.stopPropagation();
    const list = markers();
    if (!list.length) { announce('Aucun marqueur à parcourir sur cette carte.'); return; }
    const pos = list.indexOf(marker);
    let next = pos;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = list.length - 1;
    else if (event.key === 'ArrowRight') next = pos < 0 ? 0 : Math.min(pos + 1, list.length - 1);
    else next = pos < 0 ? list.length - 1 : Math.max(pos - 1, 0);
    S.refocusIndex = next;
    list[next].focus({ preventScroll: true });
    announce(`Lieu ${next + 1} sur ${list.length} : ${markerLabel(list[next])}.`);
    return;
  }

  /* E040-03 (suite) : flèches depuis le conteneur de carte lui-même. */
  if (target.id === 'c3b-map' && arrows.includes(event.key)) {
    event.preventDefault();
    event.stopPropagation();
    const list = markers();
    if (!list.length) { announce('Aucun marqueur à parcourir sur cette carte.'); return; }
    const pos = activeIndex(list);
    let next = pos;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = list.length - 1;
    else if (event.key === 'ArrowRight') next = Math.min(pos + 1, list.length - 1);
    else next = Math.max(pos - 1, 0);
    S.refocusIndex = next;
    list[next].focus({ preventScroll: true });
    announce(`Lieu ${next + 1} sur ${list.length} : ${markerLabel(list[next])}.`);
    return;
  }

  /* E040-08 : raccourcis d'outils, cadrés sur la carte et le panneau. */
  if ((inMap || inPanel) && !typing) {
    const key = event.key.toLowerCase();
    if (key === 's') {
      event.preventDefault();
      event.stopPropagation();
      reachSearch();
    } else if (key === 'p') {
      event.preventDefault();
      event.stopPropagation();
      reachScope();
    }
  }
}

function installGuard() {
  if (S.guardReady || typeof window === 'undefined') return;
  S.guardReady = true;
  window.addEventListener('keydown', onKey, true);
}

function installVisibility() {
  if (S.visibilityReady || typeof document === 'undefined') return;
  S.visibilityReady = true;
  document.addEventListener('visibilitychange', () => {
    /* E040-10 : le temps du parcours ne progresse pas quand l'onglet est masqué. */
    if (S.tour && !document.hidden) S.tour.last = 0;
  });
}

/* ---------- E040-04 : zoom réel, sans réimplémenter la projection ---------- */

function zoomWith(fk, verbe) {
  const button = document.querySelector('#c3b-map .geo-controls button[data-fk="' + fk + '"]');
  if (!button) { announce('Commande de zoom indisponible dans cet état.'); return; }
  button.click();
  const svg = document.querySelector('#c3b-map .geo-svg');
  let detail = '';
  if (svg) {
    const parts = (svg.getAttribute('viewBox') || '').trim().split(/\s+/).map(Number);
    if (parts.length === 4 && Number.isFinite(parts[2]) && parts[2] > 0) {
      detail = `échelle de vue ×${(MAP_W / parts[2]).toFixed(2)} (référence : 1,00 en vue entière)`;
    }
  }
  announce(`${verbe} — ${detail || 'vue mise à jour'}.`);
}

/* ---------- E040-05 / E040-08 : atteindre les régions et outils ---------- */

function reachList() {
  const item = document.querySelector('#c3b-places .c3b-place-item[tabindex="0"]')
    || document.querySelector('#c3b-places .c3b-place-item');
  if (!item) { announce('La liste des lieux est vide dans ce périmètre.'); return; }
  item.focus({ preventScroll: true });
  announce(`Liste des lieux atteinte : ${item.textContent.trim()}.`);
}

function reachMap() {
  const map = document.getElementById('c3b-map');
  if (!map) { announce('Carte indisponible dans cet état.'); return; }
  map.focus({ preventScroll: true });
  announce('Carte atteinte. Flèches : changer de lieu ; plus et moins : zoomer.');
}

function reachSearch() {
  const input = document.getElementById('c3b-search');
  if (!input) { announce('Champ de recherche indisponible dans cet état.'); return; }
  input.focus({ preventScroll: true });
  announce('Champ de recherche atteint : saisissez un nom de lieu, puis Tab pour la liste.');
}

function reachScope() {
  const button = document.querySelector('button[data-fk="c3b-scope"]');
  if (!button) { announce('Bascule de périmètre indisponible dans cet état.'); return; }
  button.focus({ preventScroll: true });
  announce(`Bascule de périmètre atteinte : ${button.textContent.trim()}.`);
}

/* ---------- E040-07 : roving tabindex aligné sur le lieu actif ---------- */

function enforceRoving() {
  const list = markers();
  if (!list.length) return;
  const focusIndex = activeIndex(list);
  list.forEach((node, index) => {
    node.setAttribute('tabindex', index === focusIndex ? '0' : '-1');
  });
}

/* ---------- E040-10 : unique boucle rAF, parcours guidé déterministe ---------- */

function clearStep() {
  markers().forEach((node) => node.classList.remove(PREFIX + '-step'));
}

function syncStartLabel() {
  const start = document.getElementById(START_ID);
  if (!start) return;
  start.textContent = S.tour ? '■ Parcours en cours…' : '▶ Parcourir les lieux';
  start.setAttribute('aria-pressed', S.tour ? 'true' : 'false');
}

function stopTour(silent = false) {
  if (!S.tour) return;
  if (S.tour.rafId) cancelAnimationFrame(S.tour.rafId);
  S.tour = null;
  clearStep();
  syncStartLabel();
  if (!silent) announce('Parcours guidé arrêté.');
}

function tickTour(timestamp) {
  if (!S.tour) return;
  const tour = S.tour;
  tour.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) {
    /* Pause : on conserve l'horodatage, aucune étape ne franchit le seuil. */
    tour.last = timestamp;
    tour.rafId = requestAnimationFrame(tickTour);
    return;
  }
  if (!tour.last) tour.last = timestamp;
  const list = markers();
  if (!list.length) { stopTour(true); announce('Aucun lieu à parcourir : parcours interrompu.'); return; }
  if (timestamp - tour.last >= TOUR_MS) {
    tour.last = timestamp;
    tour.index += 1;
    if (tour.index >= list.length) {
      stopTour(true);
      announce(`Parcours terminé : ${list.length} lieux visités dans l’ordre de la carte.`);
      return;
    }
    clearStep();
    list[tour.index].classList.add(PREFIX + '-step');
    announce(`Étape ${tour.index + 1} sur ${list.length} : ${markerLabel(list[tour.index])}.`);
  }
  tour.rafId = requestAnimationFrame(tickTour);
}

function startTour() {
  stopTour(true);
  const list = markers();
  if (!list.length) { announce('Aucun lieu affiché : lancez le parcours après avoir choisi un pays.'); return; }
  if (S.reduced) {
    /* Mouvement réduit : résultat équivalent, sans aucune boucle d'animation. */
    clearStep();
    list[list.length - 1].classList.add(PREFIX + '-step');
    syncStartLabel();
    announce(`Affichage instantané : lieu ${list.length} sur ${list.length}, ${markerLabel(list[list.length - 1])} (mouvement réduit).`);
    return;
  }
  clearStep();
  S.tour = { rafId: 0, last: 0, index: -1 };
  syncStartLabel();
  announce(`Parcours guidé lancé : ${list.length} lieux, une étape toutes les ${TOUR_MS / 1000} secondes.`);
  S.tour.rafId = requestAnimationFrame(tickTour);
}

/* ---------- E040-01 / E040-02 : panneau sémantique et tableau des touches ---------- */

function buildTable(ctx) {
  const table = ctx.el('table', PREFIX + '-table');
  table.id = TABLE_ID;
  table.appendChild(ctx.el('caption', '', 'Raccourcis clavier de la carte et du panneau'));
  const head = ctx.el('thead');
  const headRow = ctx.el('tr');
  headRow.appendChild(ctx.el('th', '', 'Touche'));
  headRow.appendChild(ctx.el('th', '', 'Action'));
  head.appendChild(headRow);
  const body = ctx.el('tbody');
  SHORTCUTS.forEach((shortcut) => {
    const row = ctx.el('tr');
    const keyCell = ctx.el('td');
    const keys = ctx.el('span', PREFIX + '-keys');
    shortcut.keys.forEach((key) => keys.appendChild(ctx.el('kbd', '', key)));
    keyCell.appendChild(keys);
    row.append(keyCell, ctx.el('td', '', shortcut.label));
    body.appendChild(row);
  });
  table.append(head, body);
  return table;
}

function command(ctx, id, label, action, pressed = null) {
  const button = ctx.el('button', PREFIX + '-cmd', label);
  button.type = 'button';
  button.id = id;
  if (pressed !== null) button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  button.addEventListener('click', action);
  return button;
}

function ensurePanel(ctx) {
  const layout = ctx.layout || ctx.stage;
  let panel = document.getElementById(PANEL_ID);
  if (!panel || (layout && !layout.contains(panel))) {
    panel = ctx.el('section', PREFIX + '-panel');
    panel.id = PANEL_ID;
    panel.setAttribute('aria-labelledby', TITLE_ID);

    const title = ctx.el('h2', PREFIX + '-title', 'Navigation clavier sur la carte');
    title.id = TITLE_ID;
    panel.appendChild(title);

    const intro = ctx.el('p', PREFIX + '-intro',
      'La carte est une région focalisable : Tab y mène, les flèches parcourent les marqueurs, ' +
      'plus et moins règlent le zoom, zéro restaure la vue entière. Chaque déplacement est annoncé ' +
      'dans la région de statut ci-dessous. Le tableau suivant décrit toutes les touches ; il reste ' +
      'lisible même si aucune animation ne démarre.');
    intro.id = INTRO_ID;
    panel.appendChild(intro);

    panel.appendChild(buildTable(ctx));

    const cmds = ctx.el('div', PREFIX + '-cmds');
    cmds.append(
      command(ctx, ZIN_ID, '+ Zoom avant', () => zoomWith('c3b-zoom-in', 'Zoom avant')),
      command(ctx, ZOUT_ID, '− Zoom arrière', () => zoomWith('c3b-zoom-out', 'Zoom arrière')),
      command(ctx, ZRESET_ID, '0 Vue initiale', () => zoomWith('c3b-zoom-reset', 'Vue initiale restaurée')),
      command(ctx, TOLIST_ID, 'Liste des lieux', reachList),
      command(ctx, TOMAP_ID, 'Carte', reachMap),
      command(ctx, TOSEARCH_ID, 'S Recherche', reachSearch),
      command(ctx, TOSCOPE_ID, 'P Périmètre', reachScope),
      command(ctx, START_ID, '▶ Parcourir les lieux', startTour, false),
      command(ctx, STOP_ID, '■ Arrêter', () => stopTour()),
    );
    panel.appendChild(cmds);

    const status = ctx.el('p', PREFIX + '-status', S.lastMessage);
    status.id = STATUS_ID;
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    panel.appendChild(status);

    const note = ctx.el('p', PREFIX + '-note',
      'Le parcours guidé met en évidence chaque lieu sans déplacer le marqueur ni modifier la sélection : ' +
      'la couleur, le tiret et l’annonce vocale signalent l’étape. Avec « mouvement réduit », ' +
      'le dernier lieu est affiché instantanément, sans boucle d’animation.');
    note.id = NOTE_ID;
    panel.appendChild(note);

    layout.appendChild(panel);
  }

  const status = document.getElementById(STATUS_ID);
  if (status) status.textContent = S.lastMessage;
  panel.dataset.reduced = S.reduced ? '1' : '0';
  syncStartLabel();
  return panel;
}

/* ---------- Point d'entrée ---------- */

register('E040', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (!ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  if (!ctx.layout.querySelector('#c3b-map')) return;

  /* E040-01 : une seule feuille de style, injectée une seule fois. */
  ctx.css('geography-e040', CSS);

  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  ensurePanel(ctx);
  enforceRoving();
  installGuard();
  installVisibility();

  /* E040-03 : restauration du focus après le rendu provoqué par un déplacement. */
  if (S.refocusIndex !== null) {
    const index = S.refocusIndex;
    S.refocusIndex = null;
    const list = markers();
    if (list[index]) list[index].focus({ preventScroll: true });
  }

  if (S.tour && S.reduced) {
    /* La préférence est devenue « mouvement réduit » : on fige le parcours. */
    stopTour(true);
  }
});
