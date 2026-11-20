import { register } from './registry.js';

/* Lentille E089 — vue GEOGRAPHIE.
 * Thème : unités de distance (kilomètre, mille terrestre, mille marin) et conversions.
 *
 * Les dix chantiers E089-01 … E089-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E089.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titres,
 * paragraphes, tableau) présent dans le DOM même sans animation ; le canvas
 * n'est qu'un laboratoire qui illustre des conversions déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e089';
const PANEL_ID = 'geography-e089-panel';
const TITLE_ID = 'geography-e089-title';
const TABLE_ID = 'geography-e089-table';
const SOURCE_ID = 'geography-e089-source';
const TARGET_ID = 'geography-e089-target';
const DISTANCE_ID = 'geography-e089-distance';
const DISTANCE_OUT_ID = 'geography-e089-distance-value';
const CANVAS_ID = 'geography-e089-canvas';
const LEGEND_ID = 'geography-e089-legend';
const READOUT_ID = 'geography-e089-readout';
const PLAY_ID = 'geography-e089-play';
const BADGE_ID = 'geography-e089-badge';

/* Facteurs exacts (définitions internationales, aucune donnée inventée). */
const MI_KM = 1.609344;  /* 1 mille terrestre international = 1 609,344 m */
const NM_KM = 1.852;     /* 1 mille marin international = 1 852 m */
const UNITS = {
  km: { short: 'km', nom: 'kilomètre', auKm: 1, dash: [] },
  mi: { short: 'mi', nom: 'mille terrestre', auKm: MI_KM, dash: [7, 4] },
  nm: { short: 'M', nom: 'mille marin', auKm: NM_KM, dash: [2, 3] },
};
const ORDER = ['km', 'mi', 'nm'];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  source: 'km',
  target: 'mi',
  distance: 100,
  playing: false,
  sweep: 0.5,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

const fmt = (n, d = 4) => {
  const p = Math.pow(10, d);
  return (Math.round(n * p) / p).toFixed(d).replace('.', ',');
};

function versKm(valeur, unite) {
  return valeur * (UNITS[unite] ? UNITS[unite].auKm : 1);
}

function depuisKm(km, unite) {
  return km / (UNITS[unite] ? UNITS[unite].auKm : 1);
}

/* Combien de `cible` pour une unité `source` ? */
function facteur(source, cible) {
  return depuisKm(versKm(1, source), cible);
}

function ecartMilles() {
  return (NM_KM / MI_KM - 1) * 100;
}

function pasAimable(valeur) {
  const brut = Math.max(0.2, valeur / 5);
  const mag = Math.pow(10, Math.floor(Math.log10(brut)));
  const r = brut / mag;
  const mul = r <= 1 ? 1 : (r <= 2 ? 2 : (r <= 5 ? 5 : 10));
  return mul * mag;
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e089-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e089-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e089-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e089-panel p{margin:5px 0;max-width:68ch}
#geography-e089-panel .geography-e089-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e089-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e089-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e089-table th,#geography-e089-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e089-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e089-panel fieldset{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e089-panel legend{padding:0 4px;color:var(--muted)}
#geography-e089-panel .geography-e089-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;padding:2px 6px;cursor:pointer;
}
#geography-e089-panel .geography-e089-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-e089-distance{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e089-distance-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e089-canvas{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e089-legend{font-size:10px;color:var(--muted)}
#geography-e089-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e089-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e089-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e089-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e089-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e089-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;background:rgba(8,12,18,.9);
  color:var(--gold-bright,#f4d69e);font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e089-panel[data-geography-e089-reduced="1"] button,
#geography-e089-panel[data-geography-e089-reduced="1"] .geography-e089-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e089-panel button,.geography-e089-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e089-panel{font-size:10px;padding:9px}
  #geography-e089-canvas{height:190px}
  #geography-e089-panel .geography-e089-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function staticFacts(ctx) {
  const wrap = document.createElement('div');
  const faits = [
    'Le mètre est l’unité de base du système international ; le kilomètre vaut exactement 1 000 mètres.',
    'Le mille terrestre international vaut exactement 1 609,344 mètres, soit 1,609344 km ; un kilomètre vaut donc environ 0,621371 mille.',
    'Le mille marin international vaut exactement 1 852 mètres. Il ne faut pas le confondre avec le mille terrestre : il est environ 15 % plus long.',
  ];
  faits.forEach((texte) => {
    const p = ctx.el('p', 'geography-e089-fait', texte);
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable(ctx) {
  const table = ctx.el('table', '');
  table.id = TABLE_ID;
  const caption = ctx.el('caption', '', 'Équivalences de référence (facteurs exacts : 1 mille = 1 609,344 m, 1 mille marin = 1 852 m).');
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Quantité', 'En kilomètres', 'En milles terrestres', 'En milles marins'].forEach((h) => {
    const th = ctx.el('th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['1 kilomètre', 1, 'km'],
    ['1 mille terrestre', 1, 'mi'],
    ['1 mille marin', 1, 'nm'],
    ['100 kilomètres', 100, 'km'],
  ];
  lignes.forEach(([libelle, valeur, unite]) => {
    const tr = document.createElement('tr');
    const th = ctx.el('th', '', libelle);
    th.scope = 'row';
    tr.appendChild(th);
    const km = versKm(valeur, unite);
    ORDER.forEach((u) => {
      const td = ctx.el('td', '', fmt(depuisKm(km, u), 6));
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function radioGroup(ctx, nom, id, legende, etatKey) {
  const fieldset = document.createElement('fieldset');
  fieldset.id = id;
  fieldset.appendChild(ctx.el('legend', '', legende));
  ORDER.forEach((u) => {
    const lab = ctx.el('label', 'geography-e089-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = nom;
    radio.id = `${id}-${u}`;
    radio.value = u;
    radio.checked = S[etatKey] === u;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(UNITS[u].nom));
    fieldset.appendChild(lab);
  });
  return fieldset;
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      src: ORDER.map((u) => document.getElementById(`${SOURCE_ID}-${u}`)),
      tgt: ORDER.map((u) => document.getElementById(`${TARGET_ID}-${u}`)),
      distance: document.getElementById(DISTANCE_ID),
      distanceOut: document.getElementById(DISTANCE_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e089-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Unités de distance et conversions');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Le kilomètre, le mille terrestre et le mille marin ne mesurent pas la même réalité : connaître leur facteur exact permet de convertir sans approximation. Le laboratoire ci-dessous superpose deux échelles d’une même distance.');
  const sousTitre = ctx.el('h3', '', 'Trois faits de référence');

  const source = radioGroup(ctx, 'geography-e089-source', SOURCE_ID, 'Unité de la distance saisie (choix unique)', 'source');
  const target = radioGroup(ctx, 'geography-e089-target', TARGET_ID, 'Unité de conversion affichée (choix unique)', 'target');

  const distanceRow = ctx.el('p', '');
  const distanceLabel = document.createElement('label');
  distanceLabel.setAttribute('for', DISTANCE_ID);
  distanceLabel.appendChild(document.createTextNode('Distance mesurée : '));
  const distanceOut = ctx.el('span', '', '');
  distanceOut.id = DISTANCE_OUT_ID;
  distanceLabel.appendChild(distanceOut);
  distanceRow.appendChild(distanceLabel);

  const distance = document.createElement('input');
  distance.type = 'range';
  distance.id = DISTANCE_ID;
  distance.min = '1';
  distance.max = '500';
  distance.step = '1';
  distance.value = String(S.distance);
  distance.setAttribute('aria-label', 'Distance dans l’unité source, de 1 à 500');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Deux règles graduées superposées représentant la même distance. Flèches gauche et droite : déplacer le repère ; flèches haut et bas : changer la distance.');

  const legend = ctx.el('p', 'geography-e089-legend', '');
  legend.id = LEGEND_ID;

  const readout = ctx.el('p', 'geography-e089-readout', '');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter le déplacement' : '▶ Animer le repère');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  panel.append(title, lead, sousTitre, staticFacts(ctx), staticTable(ctx), source, target,
    distanceRow, distance, canvas, legend, readout, play);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    src: ORDER.map((u) => document.getElementById(`${SOURCE_ID}-${u}`)),
    tgt: ORDER.map((u) => document.getElementById(`${TARGET_ID}-${u}`)),
    distance, distanceOut, canvas, readout, play, legend,
  };
}

/* ---------- Rendu du laboratoire (un seul canvas, une seule frame par dessin) ---------- */

function drawScale(g, y, left, width, unite, titre) {
  const dash = UNITS[unite].dash || [];
  if (g.setLineDash) g.setLineDash(dash);
  g.strokeStyle = 'rgba(214,207,193,.75)';
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(left, y);
  g.lineTo(left + width, y);
  g.stroke();
  if (g.setLineDash) g.setLineDash([]);

  const pas = pasAimable(S.distance);
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.font = '10px sans-serif';
  g.textAlign = 'center';
  for (let v = 0; v <= S.distance + 1e-9; v += pas) {
    const x = left + (v / S.distance) * width;
    g.beginPath();
    g.moveTo(x, y - 5);
    g.lineTo(x, y + 5);
    g.strokeStyle = 'rgba(214,207,193,.75)';
    g.lineWidth = 1;
    g.stroke();
    g.fillText(fmt(v, pas < 1 ? 1 : 0), x, y + (y < 110 ? -9 : 16));
  }
  g.textAlign = 'left';
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(titre, left, y + (y < 110 ? -22 : 28));
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 230;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const left = 24;
  const right = cssW - 24;
  const width = Math.max(10, right - left);
  const yA = Math.round(cssH * 0.34);
  const yB = Math.round(cssH * 0.74);

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  g.textAlign = 'left';
  g.fillText(`1 ${UNITS[S.source].short} = ${fmt(facteur(S.source, S.target))} ${UNITS[S.target].short}`, left, 17);

  drawScale(g, yA, left, width, S.source, `Échelle source · ${UNITS[S.source].nom}`);
  drawScale(g, yB, left, width, S.target, `Échelle cible · ${UNITS[S.target].nom}`);

  /* Repère mobile : position déterministe = f(S.sweep), jamais aléatoire. */
  const x = left + S.sweep * width;
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2;
  g.setLineDash([]);
  g.beginPath();
  g.moveTo(x, yA - 14);
  g.lineTo(x, yB + 14);
  g.stroke();

  const valeurSource = S.sweep * S.distance;
  const valeurCible = depuisKm(versKm(valeurSource, S.source), S.target);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.textAlign = x > (left + width) * 0.78 ? 'right' : 'left';
  const dx = x > (left + width) * 0.78 ? -5 : 5;
  g.fillText(`${fmt(valeurSource, 1)} ${UNITS[S.source].short}`, x + dx, yA - 32);
  g.fillText(`${fmt(valeurCible, 1)} ${UNITS[S.target].short}`, x + dx, yB + 26);
  g.textAlign = 'left';
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const km = versKm(S.distance, S.source);
  const out = depuisKm(km, S.target);
  const ratio = facteur(S.source, S.target);
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode('Conversion : '));
  /* La distance saisie est un entier (curseur pas 1) : zéro décimale, pas « 100,0000 ». */
  n.appendChild(fort(`${fmt(S.distance, 0)} ${UNITS[S.source].nom}`));
  n.appendChild(document.createTextNode(' = '));
  n.appendChild(fort(`${fmt(out)} ${UNITS[S.target].nom}`));
  n.appendChild(document.createTextNode('. Facteur : 1 '));
  n.appendChild(fort(UNITS[S.source].short));
  n.appendChild(document.createTextNode(' = '));
  n.appendChild(fort(fmt(ratio)));
  n.appendChild(document.createTextNode(' '));
  n.appendChild(fort(UNITS[S.target].short));
  n.appendChild(document.createTextNode('. Référence : 1 mille = 1,609344 km, 1 mille marin = 1,852 km ; écart mille marin / mille terrestre : '));
  n.appendChild(fort(`${fmt(ecartMilles(), 2)} %`));
  n.appendChild(document.createTextNode('.'));
}

function updateLegend() {
  const n = S.nodes.legend;
  if (!n) return;
  n.textContent = `Trait plein : kilomètre · tirets : mille terrestre · pointillés : mille marin. Échelle haute en ${UNITS[S.source].nom}, échelle basse en ${UNITS[S.target].nom} : le style de trait distingue l’unité, indépendamment de la couleur.`;
}

function syncControls() {
  const n = S.nodes;
  n.src.forEach((radio, i) => { if (radio) radio.checked = S.source === ORDER[i]; });
  n.tgt.forEach((radio, i) => { if (radio) radio.checked = S.target === ORDER[i]; });
  if (n.distance) n.distance.value = String(S.distance);
  if (n.distanceOut) n.distanceOut.textContent = `${S.distance} ${UNITS[S.source].nom}`;
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le déplacement' : '▶ Animer le repère';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateLegend();
  updateReadout();
  drawLab();
}

/* ---------- Boucle rAF unique, pause sur document.hidden ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  const reduced = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !reduced) S.sweep = (S.sweep + dt * 0.00009) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE089Reduced = mq.matches ? '1' : '0';
        if (mq.matches) stopLoop(); else if (S.playing) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- Badge honnête sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e089-badge', 'Repère schématique : les distances à l’écran ne sont pas à l’échelle métrique.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E089', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.dataset.geographyE089Reduced = reduced ? '1' : '0';
  if (reduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.src.forEach((radio, i) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.source = ORDER[i];
        syncControls();
      });
    });
    n.tgt.forEach((radio, i) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.target = ORDER[i];
        syncControls();
      });
    });
    n.distance.addEventListener('input', () => {
      S.distance = Math.max(1, Math.min(500, Math.round(Number(n.distance.value))));
      syncControls();
    });
    n.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 0.05 : -0.05;
        S.sweep = Math.max(0, Math.min(1, S.sweep + step));
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 10 : -10;
        S.distance = Math.max(1, Math.min(500, S.distance + step));
      } else {
        used = false;
      }
      if (used) {
        event.preventDefault();
        syncControls();
      }
    });
  }

  installGlobalListeners();
  if (S.playing) startLoop();
});

