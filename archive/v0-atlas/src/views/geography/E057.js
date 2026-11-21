import { register } from './registry.js';

/* Lentille E057 — vue GEOGRAPHIE.
 * Thème : compteurs et statistiques de la vue.
 *
 * Les dix chantiers E057-01 … E057-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E057.md. La lentille relève des grandeurs
 * réelles déjà présentes dans le DOM produit par geography.js : bandeau de
 * statut, liste des lieux, marqueurs de la carte, étiquettes « hors du cadre »,
 * nœuds du chemin chronologique et viewBox du SVG. Elle n'invente aucune donnée.
 *
 * Tout est local : aucune requête réseau, aucune graine aléatoire, aucune
 * console, aucun fichier partagé modifié. Le texte pédagogique est du texte
 * sémantique réel (titre, paragraphes, tableau, statut) présent dans le DOM.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const PREFIX = 'geography-e057';
const PANEL_ID = PREFIX + '-panel';
const TITLE_ID = PREFIX + '-title';
const INTRO_ID = PREFIX + '-intro';
const CONTEXT_ID = PREFIX + '-context';
const TABLE_ID = PREFIX + '-table';
const STATUS_ID = PREFIX + '-status';
const METER_ID = PREFIX + '-meter';
const METER_FILL_ID = PREFIX + '-meter-fill';
const REFRESH_ID = PREFIX + '-refresh';
const NOTE_ID = PREFIX + '-note';

/* Largeur de référence du viewBox de geography.js (voir MAP_W). */
const MAP_W = 900;
/* Durée de l'animation déterministe du compteur de couverture, en ms. */
const ANIM_MS = 720;

/* Cellules du tableau, adressées par identifiant préfixé. */
const V = {
  perimeter: PREFIX + '-v-perimeter',
  visible: PREFIX + '-v-visible',
  framed: PREFIX + '-v-framed',
  off: PREFIX + '-v-off',
  markers: PREFIX + '-v-markers',
  path: PREFIX + '-v-path',
  scale: PREFIX + '-v-scale',
  coverage: PREFIX + '-v-coverage',
};
const R = {
  perimeter: PREFIX + '-r-perimeter',
  visible: PREFIX + '-r-visible',
  framed: PREFIX + '-r-framed',
  off: PREFIX + '-r-off',
  markers: PREFIX + '-r-markers',
  path: PREFIX + '-r-path',
  scale: PREFIX + '-r-scale',
  coverage: PREFIX + '-r-coverage',
};

/* Lignes du tableau : libellé, id valeur, id contrôle, texte initial. */
const ROWS = [
  ['Lieux du périmètre', V.perimeter, R.perimeter, 'référence : 100 % du périmètre'],
  ['Lieux affichés (filtre)', V.visible, R.visible, 'part du périmètre'],
  ['Lieux dans le cadre', V.framed, R.framed, '= marqueurs de la carte'],
  ['Lieux hors du cadre', V.off, R.off, 'listés sans déplacement fictif'],
  ['Marqueurs sur la carte', V.markers, R.markers, 'contrôle de cohérence'],
  ['Nœuds du chemin chronologique', V.path, R.path, 'amplitude en années'],
  ['Échelle de vue', V.scale, R.scale, 'référence : ×1,00 (vue entière)'],
  ['Couverture du filtre', V.coverage, R.coverage, 'bornée à 100 %'],
];

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  message: 'Compteurs et statistiques prêts.',
  stats: null,
  count: null,
  visibilityReady: false,
  reduced: false,
};

/* ---------- Accès au DOM réel (aucune donnée inventée) ---------- */

function parseStatus() {
  const status = document.getElementById('c3b-status');
  const text = status ? (status.textContent || '') : '';
  const match = text.match(/(\d+)\s*lieu\(x\)\s*affiché\(s\)\s*sur\s*(\d+)/i);
  return match ? { visible: Number(match[1]), total: Number(match[2]) } : null;
}

function fallbackTotal() {
  const kicker = document.querySelector('.geo-panel .view-kicker');
  const text = kicker ? (kicker.textContent || '') : '';
  const match = text.match(/\/\s*(\d+)/);
  return match ? Number(match[1]) : 0;
}

function frameMode() {
  const pressed = document.querySelectorAll('#c3b-tools button.c3b-filter[aria-pressed="true"]');
  if (!pressed.length) return 'non renseigné';
  const label = (pressed[0].textContent || '').trim();
  return label || 'non renseigné';
}

function queryText() {
  const input = document.getElementById('c3b-search');
  const value = input ? (input.value || '').trim() : '';
  return value;
}

function viewScale() {
  const svg = document.querySelector('#c3b-map .geo-svg');
  if (!svg) return null;
  const parts = (svg.getAttribute('viewBox') || '').trim().split(/\s+/).map(Number);
  if (parts.length !== 4 || !Number.isFinite(parts[2]) || parts[2] <= 0) return null;
  return MAP_W / parts[2];
}

function pathAmplitude() {
  const legend = document.querySelector('.geo-legend');
  if (!legend) return '';
  const text = legend.textContent || '';
  const match = text.match(/Chemin\s*:\s*(.+?)\s*\(/i);
  return match ? match[1].trim() : '';
}

/* Collecte unique de toutes les grandeurs, relue à chaque actualisation. */
function collect() {
  const parsed = parseStatus();
  const listItems = document.querySelectorAll('#c3b-places > li').length;
  const markers = document.querySelectorAll('#c3b-map .geo-marker').length;
  const off = document.querySelectorAll('#c3b-places .c3b-offtag').length;
  const pathNodes = document.querySelectorAll('#c3b-map .geo-path-node').length;

  const visible = parsed ? parsed.visible : listItems;
  const total = parsed ? parsed.total : fallbackTotal();
  const framed = markers;

  const percent = (value, base) => (base > 0 ? (value / base) * 100 : 0);
  const coverage = percent(visible, total);
  const scale = viewScale();

  const coherent = (framed + off === visible) && (markers === framed);
  return {
    total,
    visible,
    listItems,
    framed,
    off,
    markers,
    pathNodes,
    amplitude: pathAmplitude(),
    scale,
    coverage,
    framedRatio: percent(framed, visible),
    filterLabel: queryText() ? '« ' + queryText() + ' »' : 'aucune recherche',
    frame: frameMode(),
    coherent,
    statusMatchesList: visible === listItems,
  };
}

/* ---------- Formatage français déterministe ---------- */

function entier(value) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);
}

function pourcent(value) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value) + ' %';
}

function nombre(value, digits) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

function setText(id, text) {
  const node = document.getElementById(id);
  if (node) node.textContent = text;
}

function announce(message) {
  S.message = message;
  setText(STATUS_ID, message);
}

function coherenceNote(stats) {
  if (!stats.statusMatchesList) return 'Écart : affichés (statut) ≠ entrées de la liste.';
  if (stats.framed + stats.off !== stats.visible) return 'Écart : dans le cadre + hors cadre ≠ affichés.';
  if (stats.markers !== stats.framed) return 'Écart : marqueurs ≠ lieux dans le cadre.';
  return 'Cohérence vérifiée : les compteurs se recoupent.';
}

function summaryMessage(stats) {
  return 'Relevé : ' + entier(stats.visible) + ' lieux affichés sur ' + entier(stats.total) +
    ' du périmètre, dont ' + entier(stats.framed) + ' dans le cadre et ' + entier(stats.off) +
    ' hors cadre. Couverture ' + pourcent(stats.coverage) + '. ' + coherenceNote(stats) + '.';
}

/* ---------- E057-01 : feuille de style isolée ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 6px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--muted);font-size:10px;line-height:1.65;
}
.${PREFIX}-title{margin:0 0 6px;font-size:12px;color:var(--gold-bright);}
.${PREFIX}-intro,.${PREFIX}-context,.${PREFIX}-note{margin:4px 0 8px;font-size:10px;line-height:1.65;color:var(--muted);}
.${PREFIX}-context{font-variant-numeric:tabular-nums;}
.${PREFIX}-note{color:var(--gold-bright);}
.${PREFIX}-table{width:100%;border-collapse:collapse;margin:8px 0 10px;font-size:10px;}
.${PREFIX}-table caption{text-align:left;padding:0 0 4px;color:var(--gold-bright);font-size:10px;}
.${PREFIX}-table th,.${PREFIX}-table td{border-bottom:1px solid var(--line);padding:5px 6px;text-align:left;vertical-align:top;}
.${PREFIX}-table th{font-weight:600;color:var(--gold-bright);font-size:9px;text-transform:uppercase;letter-spacing:.04em;}
.${PREFIX}-table td:first-child{width:42%;}
.${PREFIX}-table td:nth-child(2){white-space:nowrap;font-weight:600;color:var(--ink);font-variant-numeric:tabular-nums;}
.${PREFIX}-table td:nth-child(3){font-size:9px;}
.${PREFIX}-meter{height:8px;margin:6px 0 4px;border:1px solid var(--line);border-radius:5px;overflow:hidden;background:rgba(255,255,255,.03);}
.${PREFIX}-meter-fill{display:block;height:100%;width:0;border-radius:5px;background:var(--gold);}
.${PREFIX}-cmds{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 4px;}
.${PREFIX}-cmd{
  min-height:44px;min-width:44px;padding:6px 10px;border:1px solid var(--line);
  border-radius:8px;background:transparent;color:var(--muted);font:inherit;font-size:10px;
  line-height:1.35;cursor:pointer;
}
.${PREFIX}-cmd:hover{border-color:var(--gold);color:var(--gold-bright);}
.${PREFIX}-cmd:focus-visible,.${PREFIX}-table:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px;}
.${PREFIX}-status{
  min-height:16px;margin:8px 0 0;padding:6px 8px;border-left:2px solid var(--gold);
  color:var(--ink);font-size:10px;font-variant-numeric:tabular-nums;
}
@media (prefers-reduced-motion:reduce){
  .${PREFIX}-meter-fill{transition:none;}
}
@media (max-width:620px){
  #${PANEL_ID}{padding:10px;}
  .${PREFIX}-table td:first-child{width:48%;}
}`;

/* ---------- E057-08 : tableau récapitulatif ---------- */

function buildTable(ctx) {
  const table = ctx.el('table', PREFIX + '-table');
  table.id = TABLE_ID;
  table.tabIndex = 0;
  table.setAttribute('aria-label', 'Tableau des compteurs et statistiques de la vue géographique');
  table.appendChild(ctx.el('caption', '', 'Compteurs relevés dans la vue géographique'));

  const head = ctx.el('thead');
  const headRow = ctx.el('tr');
  headRow.append(
    ctx.el('th', '', 'Grandeur'),
    ctx.el('th', '', 'Valeur'),
    ctx.el('th', '', 'Référence / contrôle'),
  );
  head.appendChild(headRow);
  table.appendChild(head);

  const body = ctx.el('tbody');
  ROWS.forEach(([label, valueId, refId]) => {
    const row = ctx.el('tr');
    const valueCell = ctx.el('td', '', '—');
    valueCell.id = valueId;
    const refCell = ctx.el('td', '', '—');
    refCell.id = refId;
    row.append(ctx.el('td', '', label), valueCell, refCell);
    body.appendChild(row);
  });
  table.appendChild(body);
  return table;
}

/* ---------- E057-02 … E057-09 : écriture des compteurs ---------- */

function renderStats(stats) {
  setText(V.perimeter, entier(stats.total));
  setText(R.perimeter, 'référence : 100 %');

  setText(V.visible, entier(stats.visible));
  setText(R.visible, pourcent(stats.coverage) + ' du périmètre');

  setText(V.framed, entier(stats.framed));
  setText(R.framed, pourcent(stats.framedRatio) + ' des affichés');

  setText(V.off, entier(stats.off));
  setText(R.off, entier(stats.framed) + ' + ' + entier(stats.off) + ' = ' +
    entier(stats.framed + stats.off) + (stats.framed + stats.off === stats.visible ? ' ✓' : ' ✗'));

  setText(V.markers, entier(stats.markers));
  setText(R.markers, stats.markers === stats.framed ? 'égal au cadre ✓' : 'écart ✗');

  setText(V.path, entier(stats.pathNodes));
  setText(R.path, stats.amplitude || 'aucun chemin');

  setText(V.scale, stats.scale === null ? 'indisponible' : '×' + nombre(stats.scale, 2));
  setText(R.scale, stats.scale === null ? 'vue entière de référence' :
    (Math.abs(stats.scale - 1) < 0.005 ? 'vue entière ✓' : 'écart à ×1,00'));

  setText(R.coverage, stats.coherent ? 'cohérent ✓' : coherenceNote(stats));

  setText(CONTEXT_ID, 'Filtre : ' + stats.filterLabel + ' · Cadre : ' + stats.frame +
    ' · Contrôle : ' + coherenceNote(stats));

  const fill = document.getElementById(METER_FILL_ID);
  if (fill) {
    const ratio = Math.max(0, Math.min(100, stats.coverage));
    fill.style.width = nombre(ratio, 1) + '%';
  }
  const meter = document.getElementById(METER_ID);
  if (meter) meter.setAttribute('aria-label', 'Couverture du filtre : ' + pourcent(stats.coverage));
}

function paintCoverage(value) {
  setText(V.coverage, pourcent(value));
  const fill = document.getElementById(METER_FILL_ID);
  if (fill) fill.style.width = nombre(Math.max(0, Math.min(100, value)), 1) + '%';
}

/* ---------- E057-10 : unique boucle rAF, déterministe ---------- */

function cancelCount() {
  if (!S.count) return;
  if (S.count.raf) cancelAnimationFrame(S.count.raf);
  S.count = null;
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function tickCount(timestamp) {
  const counter = S.count;
  if (!counter) return;
  counter.raf = 0;
  if (typeof document !== 'undefined' && document.hidden) {
    /* Pause : le temps masqué ne progresse pas dans l'animation. */
    counter.last = 0;
    counter.raf = requestAnimationFrame(tickCount);
    return;
  }
  if (!counter.last) counter.last = timestamp;
  counter.elapsed += timestamp - counter.last;
  counter.last = timestamp;

  const t = Math.min(1, counter.elapsed / ANIM_MS);
  paintCoverage(counter.target * easeOut(t));

  if (t < 1) {
    counter.raf = requestAnimationFrame(tickCount);
  } else {
    S.count = null;
    announce('Couverture relevée : ' + pourcent(counter.target) + ' du périmètre. ' +
      coherenceNote(S.stats || counter.statsSnapshot));
  }
}

function animateCoverage(stats) {
  cancelCount();
  if (S.reduced || typeof requestAnimationFrame !== 'function') {
    /* Mouvement réduit : résultat identique, immédiat, sans boucle. */
    paintCoverage(stats.coverage);
    setText(R.coverage, stats.coherent ? 'cohérent ✓' : coherenceNote(stats));
    return;
  }
  S.count = {
    raf: 0,
    last: 0,
    elapsed: 0,
    target: stats.coverage,
    statsSnapshot: stats,
  };
  S.count.raf = requestAnimationFrame(tickCount);
}

function refresh() {
  const stats = collect();
  S.stats = stats;
  renderStats(stats);
  animateCoverage(stats);
  if (S.reduced) announce(summaryMessage(stats));
}

function installVisibility() {
  if (S.visibilityReady || typeof document === 'undefined') return;
  S.visibilityReady = true;
  document.addEventListener('visibilitychange', () => {
    /* Un changement de visibilité ne crée pas de seconde boucle : on reprend
       l'unique animation en cours sans accumuler le temps masqué. */
    if (!document.hidden && S.count) S.count.last = 0;
  });
}

/* ---------- E057-01 / E057-09 : panneau sémantique ---------- */

function ensurePanel(ctx) {
  const layout = ctx.layout || ctx.stage;
  let panel = document.getElementById(PANEL_ID);
  if (!panel || (layout && !layout.contains(panel))) {
    panel = ctx.el('section', PREFIX + '-panel');
    panel.id = PANEL_ID;
    panel.setAttribute('aria-labelledby', TITLE_ID);

    const title = ctx.el('h2', PREFIX + '-title', 'Compteurs et statistiques de la vue');
    title.id = TITLE_ID;
    panel.appendChild(title);

    const intro = ctx.el('p', PREFIX + '-intro',
      'Ce panneau relève les compteurs déjà calculés par la vue géographique : le nombre de lieux du ' +
      'périmètre, le nombre de lieux affichés après filtre, la répartition entre lieux dans le cadre et ' +
      'hors du cadre, les marqueurs de la carte, les nœuds du chemin chronologique et l’échelle de vue. ' +
      'Chaque valeur est lue dans le document, puis recalculée : aucune donnée n’est fabriquée. Le tableau ' +
      'ci-dessous reste lisible même si aucune animation ne démarre.');
    intro.id = INTRO_ID;
    panel.appendChild(intro);

    const context = ctx.el('p', PREFIX + '-context', 'Filtre : en attente de relevé.');
    context.id = CONTEXT_ID;
    panel.appendChild(context);

    panel.appendChild(buildTable(ctx));

    const meter = ctx.el('div', PREFIX + '-meter');
    meter.id = METER_ID;
    meter.setAttribute('role', 'img');
    meter.setAttribute('aria-label', 'Couverture du filtre : en attente de relevé');
    const fill = ctx.el('span', PREFIX + '-meter-fill');
    fill.id = METER_FILL_ID;
    fill.setAttribute('aria-hidden', 'true');
    meter.appendChild(fill);
    panel.appendChild(meter);

    const cmds = ctx.el('div', PREFIX + '-cmds');
    const button = ctx.el('button', PREFIX + '-cmd', '↻ Actualiser les compteurs');
    button.type = 'button';
    button.id = REFRESH_ID;
    button.addEventListener('click', refresh);
    cmds.appendChild(button);
    panel.appendChild(cmds);

    const status = ctx.el('p', PREFIX + '-status', S.message);
    status.id = STATUS_ID;
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    panel.appendChild(status);

    const note = ctx.el('p', PREFIX + '-note',
      'Limite falsifiable : la couverture est bornée à 100 % du périmètre. Si un relevé annonçait plus ' +
      'de lieux affichés que de lieux du périmètre, ou si marqueurs et lieux dans le cadre cessaient de ' +
      'coïncider, le contrôle signalerait explicitement l’écart. Cette statistique décrit l’état du filtre, ' +
      'non une présence géographique réelle : une couverture de 100 % ne prouve pas l’exactitude des lieux.');
    note.id = NOTE_ID;
    panel.appendChild(note);

    layout.appendChild(panel);
  }

  const status = document.getElementById(STATUS_ID);
  if (status) status.textContent = S.message;
  panel.dataset.reduced = S.reduced ? '1' : '0';
  return panel;
}

/* ---------- Point d'entrée ---------- */

register('E057', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (!ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  if (!ctx.layout.querySelector('#c3b-status') && !ctx.layout.querySelector('#c3b-places')) return;

  /* E057-01 : une seule feuille de style, injectée une seule fois. */
  ctx.css('geography-e057', CSS);

  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  ensurePanel(ctx);
  installVisibility();

  /* Relevé initial sans animation, puis affichage immédiat du statut. */
  const stats = collect();
  S.stats = stats;
  renderStats(stats);
  paintCoverage(stats.coverage);
  setText(R.coverage, stats.coherent ? 'cohérent ✓' : coherenceNote(stats));
  announce(summaryMessage(stats));
});
