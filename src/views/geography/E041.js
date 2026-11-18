import { register } from './registry.js';

/* Lentille E041 — vue GEOGRAPHIE.
 * Thème : focus visible des marqueurs.
 *
 * Les dix chantiers E041-01 … E041-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E041.md. Tout est local : aucun appel réseau,
 * aucune graine aléatoire, aucune console. Le contenu pédagogique est du texte
 * sémantique réel (titre, paragraphes, tableau, fieldset) présent dans le DOM
 * même sans animation ; le canvas n'est qu'un laboratoire déterministe.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e041';
const SVG_NS = 'http://www.w3.org/2000/svg';

const PANEL_ID = 'geography-e041-panel';
const TITLE_ID = 'geography-e041-title';
const STYLE_GROUP_ID = 'geography-e041-style';
const BOOST_ID = 'geography-e041-boost';
const TOUR_ID = 'geography-e041-tour';
const CANVAS_ID = 'geography-e041-canvas';
const READOUT_ID = 'geography-e041-readout';
const LEGEND_ID = 'geography-e041-legend';

/* Choix unique de style de focus : radiogroup, jamais d'aria-pressed ici. */
const FOCUS_STYLES = [
  { key: 'halo', label: 'Halo tireté' },
  { key: 'anneau', label: 'Anneau plein' },
  { key: 'contraste', label: 'Contraste maximal' },
];

/* État de module : survit au remplacement du contenu de stage par la coque. */
const S = {
  panelFresh: false,
  style: 'halo',
  boost: false,
  reduced: false,
  focusedIndex: -1,
  pendingFocusIndex: null,
  tour: false,
  tourIndex: 0,
  tourAcc: 0,
  phase: 0,
  lastTs: 0,
  rafId: 0,
  labState: 1,
  visibilityBound: false,
  motionBound: false,
  delegatedBound: false,
  keyBound: false,
};

/* ---------- Utilitaires déterministes ---------- */

function svg(tag) {
  return document.createElementNS(SVG_NS, tag);
}

function byId(id) {
  return document.getElementById(id);
}

function scopeOf(ctx) {
  /* La coque remplace le layout à chaque rendu : interroger le DOM vivant
     évite de piloter un ancien noeud détaché après un re-render. */
  const vivant = typeof document !== 'undefined' && typeof document.querySelector === 'function'
    ? document.querySelector('.geo-layout') : null;
  if (vivant) return vivant;
  return (ctx && ctx.layout) || (ctx && ctx.stage) || document;
}

function markersOf(ctx) {
  const scope = scopeOf(ctx);
  if (!scope || typeof scope.querySelectorAll !== 'function') return [];
  return Array.from(scope.querySelectorAll('.geo-marker'));
}

function placeItems() {
  return Array.from(document.querySelectorAll('.c3b-place-item'));
}

function labelOf(marker) {
  const raw = (marker && marker.getAttribute('aria-label')) || '';
  return raw.split(' · ')[0].trim();
}

/* ---------- [E041-01] Feuille de style unique, isolée et préfixée ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 5px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:68ch}
#${PANEL_ID} .geography-e041-fait{margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f)}
#${PANEL_ID} table{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;font-variant-numeric:tabular-nums}
#${PANEL_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${PANEL_ID} th,#${PANEL_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${PANEL_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${STYLE_GROUP_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${STYLE_GROUP_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .geography-e041-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:6px;
  padding:3px 7px;border:1px solid transparent;border-radius:8px;cursor:pointer;
}
#${PANEL_ID} .geography-e041-choix-on{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.1)}
#${PANEL_ID} .geography-e041-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} button[aria-pressed="true"]{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.16)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${CANVAS_ID}{
  display:block;width:100%;height:190px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${LEGEND_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID}{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}

/* [E041-02] Renfort du focus des vrais marqueurs — actif même sans JS. */
.geo-svg .geo-marker:focus .geo-ring,
.geo-svg .geo-marker:focus-visible .geo-ring{
  stroke:#ffffff;stroke-width:3;stroke-dasharray:none;
  filter:drop-shadow(0 0 3px rgba(255,255,255,.95));
}
.geo-svg .geo-marker:focus .geo-hit{r:18}
.geo-svg .geo-marker:focus-visible{outline:2px solid rgba(255,255,255,.7);outline-offset:2px}

/* [E041-03] Halo non chromatique injecté (anneau tireté + croix). */
.geography-e041-halo{
  fill:none;stroke:#ffffff;stroke-width:2.5;stroke-dasharray:6 4;pointer-events:none;
  stroke-opacity:var(--geography-e041-pulse,1);
}
.geography-e041-tick{stroke:#ffffff;stroke-width:2;pointer-events:none}
.geo-svg .geo-marker.geography-e041-focused .geo-ring{stroke-width:3}

/* [E041-07] Variantes de style et bascule de renfort, pilotées par data-*. */
.geo-layout[data-geography-e041-style="anneau"] .geography-e041-halo{stroke-dasharray:none;stroke-width:2}
.geo-layout[data-geography-e041-style="contraste"] .geography-e041-halo{stroke-dasharray:2 3;stroke-width:3.5}
.geo-layout[data-geography-e041-boost="1"] .geography-e041-halo{stroke-width:4;stroke-dasharray:8 4}
.geo-layout[data-geography-e041-boost="1"] .geography-e041-tick{stroke-width:3}

/* [E041-04] Lien marqueur ↔ liste des lieux. */
.c3b-place-item.geography-e041-link{outline:2px dashed var(--gold-bright,#f4d69e);outline-offset:2px}

.geo-layout[data-geography-e041-reduced="1"] #${PANEL_ID} button{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button{transition:none!important;animation:none!important}
  .geography-e041-halo{stroke-opacity:1!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:165px}
  #${PANEL_ID} .geography-e041-choix{margin-right:3px;padding:2px 5px}
}
`;

/* ---------- [E041-01] Contenu sémantique, lisible sans JavaScript ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Le focus visible désigne l’indicateur qui signale, à tout moment, quel élément recevra la prochaine touche. Le critère 2.4.7 du WCAG (niveau AA) demande que cet indicateur soit perceptible : un marqueur de carte ne doit jamais devenir invisible simplement parce qu’il a le focus.',
    'Un indicateur fiable ne repose pas sur la couleur seule. Un anneau tireté, des graduations et un libellé textuel restent lisibles en Vision déficiente, sur fond clair comme sur fond sombre, et restent compréhensibles lorsque le contraste chromatique est insuffisant.',
    'La vue GEOGRAPHIE rend ses marqueurs focalisables (rôle « bouton », étiquette, tabindex itinérant). La lentille E041 renforce cet indicateur existant : elle ne déplace aucun lieu, ne modifie aucune donnée et n’ajoute aucune ressource externe.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e041-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* [E041-08] Mesures référencées : trois grandeurs, dont deux comparées. */
function staticMeasures() {
  const table = document.createElement('table');
  const caption = document.createElement('caption');
  caption.textContent = 'Repères d’accessibilité du focus, avec leur référence normative.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Référence', 'Grandeur', 'Ce que la lentille garantit'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['WCAG 2.4.7 (AA)', 'Indicateur visible', 'Le focus du marqueur est toujours perceptible : trait renforcé, halo tireté et annonce textuelle.'],
    ['WCAG 2.5.8 (AA, 2.2)', '24 × 24 px', 'Cible minimale de 24 px ; le disque de la vue mesure 28 px de diamètre et passe à 36 px au focus.'],
    ['WCAG 1.4.11 (AA)', 'Contraste 3:1', 'Le halo blanc sur fond sombre dépasse le seuil de 3:1 exigé pour un indicateur non textuel.'],
  ];
  lignes.forEach((cells) => {
    const tr = document.createElement('tr');
    cells.forEach((c, i) => {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cell.scope = 'row';
      cell.textContent = c;
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function ensurePanel(ctx) {
  const existant = byId(PANEL_ID);
  if (existant && existant.isConnected) {
    S.panelFresh = false;
    return { panel: existant, fresh: false };
  }

  S.panelFresh = true;
  const panel = ctx.el('section', 'geography-e041-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Focus visible des marqueurs');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Un indicateur de focus doit se voir, se distinguer et s’annoncer. Cette lentille renforce celui des marqueurs de la carte et permet de comparer trois traitements, sans toucher aux lieux ni aux données.');

  const subFait = ctx.el('h3', '', 'Ce que dit la règle');
  const subMesure = ctx.el('h3', '', 'Mesures de référence');
  const subStyle = ctx.el('h3', '', 'Style de l’indicateur (choix unique)');

  /* [E041-07] radiogroup : choix unique → aria-checked, pas d'aria-pressed. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = STYLE_GROUP_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Trait du focus';
  fieldset.appendChild(legend);
  FOCUS_STYLES.forEach((style) => {
    const lab = ctx.el('label', 'geography-e041-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e041-style';
    radio.id = `geography-e041-style-${style.key}`;
    radio.value = style.key;
    radio.tabIndex = S.style === style.key ? 0 : -1;
    radio.setAttribute('role', 'radio');
    radio.setAttribute('aria-checked', S.style === style.key ? 'true' : 'false');
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(style.label));
    fieldset.appendChild(lab);
  });
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Style de l’indicateur de focus');

  const boost = ctx.el('button', '', S.boost ? '◆ Focus renforcé : activé' : '◇ Activer le focus renforcé');
  boost.type = 'button';
  boost.id = BOOST_ID;
  boost.setAttribute('aria-pressed', S.boost ? 'true' : 'false');

  const tour = ctx.el('button', '', S.tour ? '■ Arrêter le parcours' : '▶ Parcourir les marqueurs');
  tour.type = 'button';
  tour.id = TOUR_ID;
  tour.setAttribute('aria-pressed', S.tour ? 'true' : 'false');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Laboratoire : trois états de focus — repos, focus visible, actif. Flèches gauche et droite pour changer d’état, Entrée pour activer le marqueur.');

  const legendText = ctx.el('p', 'geography-e041-legend', 'Lecture sans couleur : repos = anneau fin ; focus = anneau tireté plus deux graduations ; actif = point plein cerclé. Le libellé sous chaque état nomme toujours le traitement.');
  legendText.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e041-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  panel.append(title, lead, subFait, staticFacts(), subMesure, staticMeasures(), subStyle, fieldset, boost, tour, canvas, legendText, readout);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return { panel, fresh: true };
}

/* ---------- [E041-03] Halo injecté, jamais la couleur seule ---------- */

function clearDecorations() {
  const scope = document;
  Array.from(scope.querySelectorAll('.geography-e041-halo, .geography-e041-tick')).forEach((n) => {
    if (n.parentNode) n.parentNode.removeChild(n);
  });
  Array.from(scope.querySelectorAll('.geo-marker.geography-e041-focused')).forEach((m) => {
    m.classList.remove('geography-e041-focused');
  });
}

function decorate(marker) {
  const ring = marker && marker.querySelector('.geo-ring');
  if (!ring) return;
  const cx = ring.getAttribute('cx');
  const cy = ring.getAttribute('cy');
  if (!cx || !cy) return;

  const halo = svg('circle');
  halo.setAttribute('class', 'geography-e041-halo');
  halo.setAttribute('cx', cx);
  halo.setAttribute('cy', cy);
  halo.setAttribute('r', '12');

  const hTick = svg('line');
  hTick.setAttribute('class', 'geography-e041-tick');
  hTick.setAttribute('x1', String(Number(cx) - 16));
  hTick.setAttribute('x2', String(Number(cx) - 9));
  hTick.setAttribute('y1', cy);
  hTick.setAttribute('y2', cy);

  const vTick = svg('line');
  vTick.setAttribute('class', 'geography-e041-tick');
  vTick.setAttribute('x1', cx);
  vTick.setAttribute('x2', cx);
  vTick.setAttribute('y1', String(Number(cy) - 16));
  vTick.setAttribute('y2', String(Number(cy) - 9));

  marker.append(halo, hTick, vTick);
  marker.classList.add('geography-e041-focused');
}

/* [E041-04] Synchronisation marqueur ↔ liste des lieux. */
function applyFocusDecorations(ctx) {
  clearDecorations();
  const markers = markersOf(ctx);
  const focused = S.focusedIndex >= 0 ? markers[S.focusedIndex] : null;
  const label = focused ? labelOf(focused) : '';

  if (focused) decorate(focused);

  placeItems().forEach((item) => {
    const text = (item.textContent || '').trim();
    const lie = label && text && text.indexOf(label) !== -1;
    if (lie) item.classList.add('geography-e041-link');
    else item.classList.remove('geography-e041-link');
  });
}

/* ---------- [E041-06] Région de statut annoncée ---------- */

function strong(text) {
  const s = document.createElement('strong');
  s.textContent = text;
  return s;
}

function updateReadout(kind, ctx) {
  const n = byId(READOUT_ID);
  if (!n) return;
  const markers = markersOf(ctx);
  const total = markers.length;
  const index = S.focusedIndex;
  const focused = index >= 0 ? markers[index] : null;
  const label = focused ? labelOf(focused) : '';

  n.textContent = '';
  if (kind === 'style') {
    const style = FOCUS_STYLES.find((s) => s.key === S.style) || FOCUS_STYLES[0];
    n.appendChild(document.createTextNode('Style du focus : '));
    n.appendChild(strong(style.label));
    n.appendChild(document.createTextNode('. Renfort indépendant : '));
    n.appendChild(strong(S.boost ? 'activé' : 'désactivé'));
    n.appendChild(document.createTextNode('.'));
    return;
  }
  if (kind === 'tour') {
    n.appendChild(document.createTextNode('Parcours des marqueurs : '));
    n.appendChild(strong(S.tour ? 'en cours' : 'arrêté'));
    n.appendChild(document.createTextNode(' · ' + total + ' marqueur' + (total > 1 ? 's' : '') + ' dans le cadre.'));
    return;
  }
  if (kind === 'lab') {
    const noms = ['repos', 'focus visible', 'actif'];
    n.appendChild(document.createTextNode('État du laboratoire : '));
    n.appendChild(strong(noms[S.labState]));
    n.appendChild(document.createTextNode(' · le trait, les graduations et le libellé distinguent les trois états.'));
    return;
  }
  if (focused) {
    n.appendChild(document.createTextNode('Marqueur '));
    n.appendChild(strong(String(index + 1) + ' / ' + total));
    n.appendChild(document.createTextNode(' · « '));
    n.appendChild(strong(label));
    n.appendChild(document.createTextNode(' » — focus visible '));
    n.appendChild(strong(S.boost ? 'renforcé' : 'actif'));
    n.appendChild(document.createTextNode('.'));
  } else {
    n.appendChild(document.createTextNode('Aucun marqueur focalisé. Tab : premier marqueur · ← → : parcourir · Entrée : activer.'));
  }
}

/* ---------- [E041-05] Tabindex itinérant et navigation clavier ---------- */

function focusMarkerAt(index, ctx) {
  const markers = markersOf(ctx);
  if (!markers.length) return;
  const i = ((index % markers.length) + markers.length) % markers.length;
  S.pendingFocusIndex = i;
  markers.forEach((m, j) => m.setAttribute('tabindex', j === i ? '0' : '-1'));
  markers[i].focus();
}

function installKeyGuard() {
  if (S.keyBound || typeof window === 'undefined') return;
  S.keyBound = true;
  /* Capture fenêtre : passe avant le routeur global (même motif que C3-06). */
  window.addEventListener('keydown', (event) => {
    const target = event.target;
    if (!target || typeof target.closest !== 'function') return;
    const marker = target.closest('.geo-marker');
    if (!marker) return;
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (keys.indexOf(event.key) === -1) return;
    event.preventDefault();
    event.stopPropagation();
    const markers = markersOf(null);
    if (!markers.length) return;
    const pos = markers.indexOf(marker);
    let next = pos;
    if (event.key === 'ArrowRight') next = (pos + 1) % markers.length;
    else if (event.key === 'ArrowLeft') next = (pos - 1 + markers.length) % markers.length;
    else if (event.key === 'Home') next = 0;
    else next = markers.length - 1;
    focusMarkerAt(next, null);
  }, true);
}

/* [E041-04] Délégation sur stage : survit au remplacement du layout. */
function installDelegates(ctx) {
  if (S.delegatedBound || !ctx.stage || typeof ctx.stage.addEventListener !== 'function') return;
  S.delegatedBound = true;

  ctx.stage.addEventListener('focusin', (event) => {
    const target = event.target;
    if (!target || typeof target.closest !== 'function') return;
    const marker = target.closest('.geo-marker');
    if (marker) {
      const pos = markersOf(ctx).indexOf(marker);
      if (pos >= 0) {
        S.focusedIndex = pos;
        S.tourIndex = pos;
        applyFocusDecorations(ctx);
        updateReadout('focus', ctx);
      }
      return;
    }
    const item = target.closest('.c3b-place-item');
    if (item) {
      const text = (item.textContent || '').trim();
      const markers = markersOf(ctx);
      const pos = markers.findIndex((m) => text && text.indexOf(labelOf(m)) !== -1);
      if (pos >= 0) {
        S.focusedIndex = pos;
        applyFocusDecorations(ctx);
        updateReadout('focus', ctx);
      }
    }
  });

  ctx.stage.addEventListener('focusout', (event) => {
    const next = event.relatedTarget;
    if (next && typeof next.closest === 'function'
      && (next.closest('.geo-marker') || next.closest('.c3b-place-item'))) return;
    S.focusedIndex = -1;
    applyFocusDecorations(ctx);
    updateReadout('focus', ctx);
  });
}

/* ---------- [E041-10] Laboratoire canvas : trois états déterministes ---------- */

function drawLab() {
  const cv = byId(CANVAS_ID);
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 190;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const noms = ['Repos', 'Focus visible', 'Actif'];
  const largeur = cssW / 3;
  const cy = cssH * 0.44;
  for (let i = 0; i < 3; i += 1) {
    const cx = largeur * (i + 0.5);
    if (i === S.labState) {
      g.fillStyle = 'rgba(230,185,111,.10)';
      g.fillRect(largeur * i + 3, 8, largeur - 6, cssH - 16);
      g.strokeStyle = 'rgba(244,214,158,.9)';
      g.lineWidth = 1;
      g.strokeRect(largeur * i + 3, 8, largeur - 6, cssH - 16);
    }
    g.strokeStyle = 'rgba(255,255,255,.85)';
    g.lineWidth = i === 0 ? 1.5 : 2.5;
    g.setLineDash([]);
    g.beginPath();
    g.arc(cx, cy, 13, 0, Math.PI * 2);
    g.stroke();
    if (i === 1 || i === 2) {
      g.strokeStyle = 'rgba(255,255,255,.95)';
      g.lineWidth = 2;
      g.setLineDash(i === 1 ? [5, 4] : []);
      g.beginPath();
      g.arc(cx, cy, 21, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
      g.beginPath();
      g.moveTo(cx - 27, cy); g.lineTo(cx - 24, cy);
      g.moveTo(cx + 24, cy); g.lineTo(cx + 27, cy);
      g.moveTo(cx, cy - 27); g.lineTo(cx, cy - 24);
      g.moveTo(cx, cy + 24); g.lineTo(cx, cy + 27);
      g.stroke();
    }
    if (i === 2) {
      g.fillStyle = 'rgba(255,255,255,.95)';
      g.beginPath();
      g.arc(cx, cy, 6, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = 'rgba(244,214,158,.96)';
    g.font = '11px sans-serif';
    g.textAlign = 'center';
    g.fillText(noms[i], cx, cssH - 18);
    g.fillStyle = 'rgba(214,207,193,.85)';
    g.font = '10px sans-serif';
    g.fillText(String(i + 1) + ' / 3', cx, 24);
  }
  g.textAlign = 'start';
}

/* ---------- [E041-09] Une seule boucle rAF, pause sur document.hidden ---------- */

function setPulse(value) {
  const layout = typeof document !== 'undefined' ? document.querySelector('.geo-layout') : null;
  if (layout) layout.style.setProperty('--geography-e041-pulse', String(value));
}

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
  setPulse(1);
}

function startLoop(ctx) {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.reduced) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame((ts) => tick(ts, ctx));
}

function tick(ts, ctx) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    S.tourAcc += dt;
    if (S.tourAcc >= 900) {
      S.tourAcc = 0;
      focusMarkerAt(S.tourIndex + 1, ctx);
    }
    S.phase = (S.phase + dt * 0.004) % (Math.PI * 2);
    setPulse(0.72 + 0.28 * (0.5 + 0.5 * Math.sin(S.phase)));
  }
  S.lastTs = ts;
  if (S.tour && !S.reduced) S.rafId = requestAnimationFrame((t) => tick(t, ctx));
  else stopLoop();
}

function installGlobalListeners(ctx) {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.tour && !S.reduced) startLoop(ctx);
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = mq.matches;
        const layout = document.querySelector('.geo-layout');
        if (layout) layout.dataset.geographyE041Reduced = S.reduced ? '1' : '0';
        if (S.reduced) {
          stopLoop();
          S.tour = false;
          const b = byId(TOUR_ID);
          if (b) {
            b.textContent = '▶ Parcourir les marqueurs';
            b.setAttribute('aria-pressed', 'false');
          }
          setPulse(1);
        }
        drawLab();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- Synchronisation des contrôles ---------- */

function syncControls(ctx) {
  const layout = scopeOf(ctx);
  if (layout && layout.dataset) {
    layout.dataset.geographyE041Style = S.style;
    layout.dataset.geographyE041Boost = S.boost ? '1' : '0';
    layout.dataset.geographyE041Reduced = S.reduced ? '1' : '0';
  }

  FOCUS_STYLES.forEach((style) => {
    const radio = byId(`geography-e041-style-${style.key}`);
    if (!radio) return;
    const on = S.style === style.key;
    radio.checked = on;
    radio.tabIndex = on ? 0 : -1;
    radio.setAttribute('aria-checked', on ? 'true' : 'false');
    if (radio.parentNode) radio.parentNode.classList.toggle('geography-e041-choix-on', on);
  });

  const boost = byId(BOOST_ID);
  if (boost) {
    boost.textContent = S.boost ? '◆ Focus renforcé : activé' : '◇ Activer le focus renforcé';
    boost.setAttribute('aria-pressed', S.boost ? 'true' : 'false');
  }
  const tour = byId(TOUR_ID);
  if (tour) {
    tour.textContent = S.tour ? '■ Arrêter le parcours' : '▶ Parcourir les marqueurs';
    tour.setAttribute('aria-pressed', S.tour ? 'true' : 'false');
  }

  setPulse(1);
  applyFocusDecorations(ctx);
  drawLab();
}

/* ---------- Point d'entrée ---------- */

register('E041', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  /* [E041-01] CSS isolée, injectée une seule fois par cssOnce. */
  ctx.css(CSS_ID, CSS);

  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  const panneau = ensurePanel(ctx);
  S.markers = markersOf(ctx);
  if (S.focusedIndex >= S.markers.length) S.focusedIndex = -1;

  installDelegates(ctx);
  installKeyGuard();
  installGlobalListeners(ctx);

  syncControls(ctx);
  updateReadout('focus', ctx);

  if (panneau.fresh) {
    FOCUS_STYLES.forEach((style) => {
      const radio = byId(`geography-e041-style-${style.key}`);
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.style = style.key;
        updateReadout('style', ctx);
        syncControls(ctx);
      });
    });

    byId(BOOST_ID).addEventListener('click', () => {
      S.boost = !S.boost;
      updateReadout('style', ctx);
      syncControls(ctx);
    });

    byId(TOUR_ID).addEventListener('click', () => {
      S.tour = !S.tour;
      S.tourAcc = 0;
      if (S.tour && S.reduced) {
        /* Mouvement réduit : un pas discret par clic, sans boucle animée. */
        focusMarkerAt(S.tourIndex + 1, ctx);
        S.tour = false;
        updateReadout('tour', ctx);
        syncControls(ctx);
        return;
      }
      if (S.tour) startLoop(ctx); else stopLoop();
      updateReadout('tour', ctx);
      syncControls(ctx);
    });

    const canvas = byId(CANVAS_ID);
    canvas.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        S.labState = (S.labState + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
      } else if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        S.labState = 2;
      } else {
        return;
      }
      updateReadout('lab', ctx);
      drawLab();
    });
    canvas.addEventListener('click', () => {
      S.labState = (S.labState + 1) % 3;
      updateReadout('lab', ctx);
      drawLab();
    });
  }

  if (S.tour && !S.reduced) startLoop(ctx);

  /* Restauration du focus après un re-render déclenché par la coque. */
  if (S.pendingFocusIndex !== null) {
    const k = S.pendingFocusIndex;
    S.pendingFocusIndex = null;
    S.focusedIndex = k;
    const markers = markersOf(ctx);
    if (markers[k]) markers[k].focus();
  }
});
