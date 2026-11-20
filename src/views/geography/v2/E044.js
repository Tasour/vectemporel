import { register } from './registry.js';

/* Lentille E044 (V2) — vue GEOGRAPHIE.
 * Thème : respect du mouvement réduit (prefers-reduced-motion, troubles
 * vestibulaires, photosensibilité, stratégies de repli accessibles).
 *
 * Les dix chantiers E044-01 … E044-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E044.md. Les dix sont réellement
 * implémentés : aucun stub, aucune fonction vide. Tout est local : aucune
 * requête réseau, aucune graine aléatoire, aucune journalisation, aucun
 * fichier partagé modifié. Le contenu pédagogique est du texte sémantique
 * réel (titres, paragraphes, tableau captioné, radiogroupe, légende) présent
 * dans le DOM même sans animation ; le canvas n'est qu'un laboratoire qui
 * illustre des formules déterministes.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Préfixe unique : geography-v2-e044- (identifiants, classes, attributs et bloc CSS).
 */

const P = 'geography-v2-e044';

/* Identifiants, tous préfixés geography-v2-e044-. */
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const TABLE_ID = P + '-table';
const VIEW_ID = P + '-view';
const FREQ_ID = P + '-freq';
const FREQ_OUT_ID = P + '-freq-value';
const AMP_ID = P + '-amp';
const AMP_OUT_ID = P + '-amp-value';
const DUR_ID = P + '-dur';
const DUR_OUT_ID = P + '-dur-value';
const CANVAS_ID = P + '-canvas';
const LEGEND_ID = P + '-legend';
const READOUT_ID = P + '-readout';
const PLAY_ID = P + '-play';
const MOTION_ID = P + '-motion';
const BADGE_ID = P + '-badge';
const REDUCED_ATTR = 'data-' + P + '-reduced';

/* Constantes canoniques — aucune donnée fabriquée, tout découle des formules. */
const PHOTO_HZ = 3;         /* seuil de photosensibilité : 3 flashs/s (OMS / WCAG 2.3.1) */
const COMFORT_PX = 24;      /* seuil de confort vestibulaire : déplacement 24 px (heuristique) */
const TRANSITION_MS = 500;  /* durée maximale recommandée d'une transition d'interface */
const SPEED_REF = 150;      /* vitesse de parcours de référence (px/s) */

/* Les trois vues du laboratoire : chacune illustre une catégorie de mouvement. */
const VIEWS = {
  oscillation: 'Balancement sinusoïdal',
  clignotement: 'Clignotement',
  transition: 'Transition d’interface',
};
const VIEW_ORDER = ['oscillation', 'clignotement', 'transition'];

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  view: 'oscillation',
  freq: 3,
  amp: 24,
  dur: 500,
  playing: false,
  forcedReduced: false, /* bascule pédagogique du laboratoire */
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  visible: true,
  visibilityBound: false,
  motionBound: false,
  observer: null,
  nodes: {},
};

/* ctx.reducedMotion() conservé hors du point d'entrée pour la boucle rAF. */
let ctxReduced = null;

/* ---------- Formules déterministes et formatage français ---------- */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const nf = (n, d = 2) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');

/* Vitesse moyenne d'un aller-retour : distance 2·A parcourue f fois par seconde. */
function meanSpeed(amp, freq) {
  return 2 * amp * freq;
}

function seuilTexte(valeur, reference) {
  if (valeur < reference) return 'sous le seuil';
  if (valeur === reference) return 'au seuil';
  return 'au-dessus du seuil';
}

/* Préférence système, relue à chaque appel : ctx.reducedMotion() d'abord,
 * puis matchMedia en repli. Jamais de graine aléatoire, jamais de réseau. */
function systemReduced() {
  if (typeof ctxReduced === 'function' && ctxReduced()) return true;
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  return false;
}

/* Agrège la préférence système et la bascule pédagogique : c'est cette
 * fonction qui pilote le repli statique ET l'arrêt de la boucle d'animation. */
function isReduced() {
  return systemReduced() || S.forcedReduced;
}

/* ---------- E044-02 : bloc CSS unique, préfixé, sans réseau ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:70ch}
#${PANEL_ID} .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${PANEL_ID} .${P}-limite{
  margin:8px 0;padding:7px 9px;border:1px dashed var(--gold,#e6b96f);border-radius:8px;
  color:var(--ink-soft,#d7d1c6);
}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${VIEW_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${VIEW_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} .${P}-cursor{margin:7px 0}
#${PANEL_ID} .${P}-cursor label{display:block;margin-bottom:2px}
#${PANEL_ID} input[type="range"]{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} .${P}-val{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
#${CANVAS_ID}{
  display:block;width:100%;height:240px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${LEGEND_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID}{
  min-height:46px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} button:disabled{opacity:.5;cursor:not-allowed}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.${P}-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:64%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[${REDUCED_ATTR}="1"] button,
#${PANEL_ID}[${REDUCED_ATTR}="1"] .${P}-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.${P}-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:200px}
  #${PANEL_ID} .${P}-choix{margin-right:4px}
}
`;

/* ---------- E044-01 : section sémantique, lisible sans JS ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Le mouvement réduit est une préférence d’accessibilité : une personne qui active « Réduire les animations » demande aux interfaces de supprimer ou d’atténuer les mouvements non essentiels. La feuille de style lit la requête média prefers-reduced-motion : reduce et le script la relaie via ctx.reducedMotion().',
    'Les troubles vestibulaires rendent certains déplacements (balancement, parallaxe, défilement automatique) source de vertige ou de nausée. Les respecter ne retire aucune information : seule la façon de la présenter change, par exemple une transition devient un affichage instantané.',
    'La photosensibilité concerne les clignotements : au-delà de 3 flashs par seconde, le risque de crise est réel pour les personnes sensibles. Une animation qui respecte le mouvement réduit ne clignote pas, ou se fige en un état statique dès que la préférence est détectée.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = P + '-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* ---------- E044-10 : limite falsifiable, défi en cinq temps (texte réel) ---------- */

function staticLimite() {
  const p = document.createElement('p');
  p.className = P + '-limite';
  p.textContent = 'Limite falsifiable — défi en cinq temps. Prédiction : que se passe-t-il si j’active le mouvement réduit pendant que le tracé s’anime ? Réglage : lancez l’animation, puis activez « Simuler mouvement réduit ». Résultat attendu : la boucle s’arrête, le tracé devient statique et les trois grandeurs restent affichées. Falsification : si un seul mouvement persiste ou si une seule mesure disparaît, l’implémentation est en défaut. Débrief : la préférence est respectée sans perte d’information — le laboratoire illustre des formules schématiques, pas une mesure clinique réelle.';
  return p;
}

/* ---------- E044-02 : tableau comparatif, lisible sans JS ---------- */

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Catégories de mouvement et stratégie de repli — repli conforme au mouvement réduit. Références : 3 flashs/s, déplacement 24 px, transition 500 ms.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Catégorie', 'Exemple', 'Risque', 'Repli mouvement réduit'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const lignes = [
    ['Clignotement', 'Alerte qui pulse', 'Photosensibilité (> 3 Hz)', 'État fixe, sans pulsation'],
    ['Balancement', 'Pendule, vague', 'Vertige vestibulaire', 'Trait statique, plus d’oscillation'],
    ['Défilement auto', 'Carrousel défilant', 'Perte de repère', 'Arrêt, navigation manuelle'],
    ['Parallaxe', 'Couches qui glissent', 'Conflit visuel', 'Couches alignées, immobiles'],
    ['Transition', 'Fondu 500 ms', 'Inconfort, latence', 'Affichage instantané'],
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

function rangeRow(labelText, id, outId, min, max, step, value, aria) {
  const row = document.createElement('div');
  row.className = P + '-cursor';
  const lab = document.createElement('label');
  lab.setAttribute('for', id);
  lab.appendChild(document.createTextNode(labelText + ' : '));
  const out = document.createElement('span');
  out.id = outId;
  out.className = P + '-val';
  lab.appendChild(out);
  row.appendChild(lab);
  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.setAttribute('aria-label', aria);
  row.appendChild(input);
  return { row, input, out };
}

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: VIEW_ORDER.map((v) => document.getElementById(P + '-view-' + v)),
      freq: document.getElementById(FREQ_ID),
      freqOut: document.getElementById(FREQ_OUT_ID),
      amp: document.getElementById(AMP_ID),
      ampOut: document.getElementById(AMP_OUT_ID),
      dur: document.getElementById(DUR_ID),
      durOut: document.getElementById(DUR_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      motion: document.getElementById(MOTION_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Respect du mouvement réduit');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Une interface accessible ne force jamais un mouvement : ce laboratoire relie la préférence prefers-reduced-motion aux seuils de clignotement, d’amplitude et de durée, et montre le repli statique qui remplace l’animation.');

  /* E044-09 : radiogroupe natif complété par un rôle explicite (choix unique). */
  const fieldset = document.createElement('fieldset');
  fieldset.id = VIEW_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Vue du laboratoire (choix unique)');
  const legend = document.createElement('legend');
  legend.textContent = 'Vue du laboratoire (choix unique)';
  fieldset.appendChild(legend);
  VIEW_ORDER.forEach((value) => {
    const lab = ctx.el('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-view';
    radio.id = P + '-view-' + value;
    radio.value = value;
    radio.checked = S.view === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(VIEWS[value]));
    fieldset.appendChild(lab);
  });

  const freq = rangeRow('Fréquence de clignotement', FREQ_ID, FREQ_OUT_ID, 0.5, 6, 0.5, S.freq, 'Fréquence de clignotement, de 0,5 à 6 hertz');
  const amp = rangeRow('Amplitude de déplacement', AMP_ID, AMP_OUT_ID, 0, 60, 2, S.amp, 'Amplitude du déplacement, de 0 à 60 pixels');
  const dur = rangeRow('Durée de transition', DUR_ID, DUR_OUT_ID, 0, 1000, 50, S.dur, 'Durée de la transition, de 0 à 1000 millisecondes');

  /* E044-07 : canvas lab, focalisable et doublé en texte. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Laboratoire du mouvement réduit. Flèches gauche et droite : changer de vue ; flèches haut et bas : régler la fréquence.');

  const legendText = ctx.el('p', P + '-legend');
  legendText.id = LEGEND_ID;

  /* E044-09 : unique région live, annoncée poliment. */
  const readout = ctx.el('p', P + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', '▶ Animer le mouvement');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', 'false');

  const motion = ctx.el('button', '', '♿ Simuler « mouvement réduit »');
  motion.type = 'button';
  motion.id = MOTION_ID;
  motion.setAttribute('aria-pressed', 'false');

  panel.append(title, lead, staticFacts(), staticTable(), staticLimite(), fieldset,
    freq.row, amp.row, dur.row, canvas, legendText, readout, play, motion);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: VIEW_ORDER.map((v) => document.getElementById(P + '-view-' + v)),
    freq: freq.input, freqOut: freq.out,
    amp: amp.input, ampOut: amp.out,
    dur: dur.input, durOut: dur.out,
    canvas, readout, play, motion, legend: legendText,
  };
}

/* ---------- E044-07 : dessin déterministe et codes non chromatiques ---------- */

function drawGrid(g, pad, iw, ih) {
  g.strokeStyle = 'rgba(255,255,255,.14)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);
  g.setLineDash([3, 5]);
  g.strokeStyle = 'rgba(255,255,255,.10)';
  g.beginPath();
  g.moveTo(pad, pad + ih * 0.5);
  g.lineTo(pad + iw, pad + ih * 0.5);
  g.stroke();
  g.setLineDash([]);
}

function drawOscillation(g, cssH, pad, iw, ih) {
  const midY = pad + ih * 0.5;
  const reduced = isReduced();
  const A = reduced ? 0 : S.amp; /* repli : amplitude ramenée à zéro */

  g.strokeStyle = reduced ? 'rgba(214,207,193,.55)' : 'rgba(244,214,158,.95)';
  g.lineWidth = reduced ? 1.5 : 2.5;
  g.beginPath();
  const N = 180;
  for (let i = 0; i <= N; i += 1) {
    const x = pad + (i / N) * iw;
    const phase = 2 * Math.PI * (S.freq * (i / N) + S.sweep);
    const y = midY - A * Math.sin(phase);
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.stroke();

  /* Marqueur de phase : figé en mouvement réduit. */
  if (!reduced) {
    const frac = S.sweep % 1;
    const markerX = pad + frac * iw;
    const markerY = midY - A * Math.sin(2 * Math.PI * (S.freq * frac + S.sweep));
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(markerX, markerY, 4.5, 0, Math.PI * 2);
    g.fill();
  }

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText(reduced ? 'Mouvement réduit : tracé statique (amplitude 0)' : `Amplitude A = ${nf(S.amp, 0)} px`, pad + 2, cssH - pad - 18);
  g.fillText(`Fréquence f = ${nf(S.freq, 1)} Hz — seuil photosensibilité ${nf(PHOTO_HZ, 0)} Hz`, pad + 2, cssH - pad - 4);
}

function drawFlash(g, cssH, pad, iw, ih) {
  const reduced = isReduced();
  const top = pad;

  if (reduced) {
    /* Repli : un état uniforme, sans aucune alternance lumineuse. */
    g.fillStyle = 'rgba(214,207,193,.32)';
    g.fillRect(pad, top, iw, ih);
  } else {
    const blocks = Math.max(2, Math.round(S.freq * 2));
    const cw = iw / blocks;
    for (let k = 0; k < blocks; k += 1) {
      g.fillStyle = k % 2 === 0 ? 'rgba(244,214,158,.85)' : 'rgba(244,214,158,.10)';
      g.fillRect(pad + k * cw, top, cw, ih);
    }
  }

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText(reduced ? 'Mouvement réduit : clignotement supprimé (état fixe)' : `Clignotement à ${nf(S.freq, 1)} Hz`, pad + 2, cssH - pad - 18);
  g.fillText(seuilTexte(S.freq, PHOTO_HZ) + ` du seuil de ${nf(PHOTO_HZ, 0)} flashs/s`, pad + 2, cssH - pad - 4);
}

function drawTransition(g, cssH, pad, iw, ih) {
  const reduced = isReduced();
  const bottom = pad + ih * 0.8;
  const top = pad + ih * 0.2;
  const dureeNorm = clamp(S.dur / 1000, 0, 1);

  g.strokeStyle = reduced ? 'rgba(214,207,193,.55)' : 'rgba(244,214,158,.95)';
  g.lineWidth = reduced ? 1.5 : 2.5;
  g.beginPath();
  if (reduced) {
    /* Repli : saut instantané dès l'origine, aucune rampe. */
    g.moveTo(pad, bottom);
    g.lineTo(pad, top);
    g.lineTo(pad + iw, top);
  } else {
    const endX = pad + dureeNorm * iw;
    g.moveTo(pad, bottom);
    const N = 120;
    for (let i = 0; i <= N; i += 1) {
      const u = i / N;
      const ease = 1 - (1 - u) ** 3; /* ease-out cubique */
      g.lineTo(pad + u * (endX - pad), bottom - ease * (bottom - top));
    }
    g.lineTo(pad + iw, top);
  }
  g.stroke();

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText(reduced ? 'Mouvement réduit : affichage instantané' : `Transition de ${nf(S.dur, 0)} ms (ease-out cubique)`, pad + 2, cssH - pad - 18);
  g.fillText(seuilTexte(S.dur, TRANSITION_MS) + ` de la recommandation ${nf(TRANSITION_MS, 0)} ms`, pad + 2, cssH - pad - 4);
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 240;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 16;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2 - 28);

  drawGrid(g, pad, iw, ih);

  if (S.view === 'oscillation') drawOscillation(g, cssH, pad, iw, ih);
  else if (S.view === 'clignotement') drawFlash(g, cssH, pad, iw, ih);
  else drawTransition(g, cssH, pad, iw, ih);
}

/* ---------- E044-06 : readout, région live unique ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const v = meanSpeed(S.amp, S.freq);
  const reduced = isReduced();

  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  const ligne = (texte) => {
    const p = document.createElement('span');
    p.style.display = 'block';
    p.textContent = texte;
    return p;
  };

  n.textContent = '';
  const l1 = document.createElement('span');
  l1.style.display = 'block';
  l1.appendChild(document.createTextNode('Clignotement f = '));
  l1.appendChild(fort(`${nf(S.freq, 1)} Hz`));
  l1.appendChild(document.createTextNode(` — ${seuilTexte(S.freq, PHOTO_HZ)} du seuil de ${nf(PHOTO_HZ, 0)} flashs/s ; `));
  l1.appendChild(document.createTextNode('amplitude A = '));
  l1.appendChild(fort(`${nf(S.amp, 0)} px`));
  l1.appendChild(document.createTextNode(` — ${seuilTexte(S.amp, COMFORT_PX)} du seuil de confort ${nf(COMFORT_PX, 0)} px.`));
  n.appendChild(l1);

  const l2 = document.createElement('span');
  l2.style.display = 'block';
  l2.appendChild(document.createTextNode('Durée t = '));
  l2.appendChild(fort(`${nf(S.dur, 0)} ms`));
  l2.appendChild(document.createTextNode(` — ${seuilTexte(S.dur, TRANSITION_MS)} de la recommandation ${nf(TRANSITION_MS, 0)} ms ; `));
  l2.appendChild(document.createTextNode('vitesse moyenne v = 2·A·f = '));
  l2.appendChild(fort(`${nf(v, 0)} px/s`));
  l2.appendChild(document.createTextNode(` (référence ${nf(SPEED_REF, 0)} px/s).`));
  n.appendChild(l2);

  n.appendChild(ligne('État : ' + (reduced
    ? 'mouvement réduit actif — l’animation est figée et le repli statique est affiché ; toutes les mesures restent lisibles.'
    : (S.playing ? 'animation en cours.' : 'animation arrêtée — ajustez les curseurs ou lancez l’animation.'))));
}

/* ---------- Synchronisation des contrôles et du laboratoire ---------- */

function syncControls() {
  const n = S.nodes;
  const reduced = isReduced();

  (n.radios || []).forEach((radio, i) => {
    if (radio) radio.checked = VIEW_ORDER[i] === S.view;
  });
  if (n.freq) n.freq.value = String(S.freq);
  if (n.freqOut) n.freqOut.textContent = `${nf(S.freq, 1)} Hz`;
  if (n.amp) n.amp.value = String(S.amp);
  if (n.ampOut) n.ampOut.textContent = `${nf(S.amp, 0)} px`;
  if (n.dur) n.dur.value = String(S.dur);
  if (n.durOut) n.durOut.textContent = `${nf(S.dur, 0)} ms`;
  if (n.legend) n.legend.textContent = VIEWS[S.view] + ' · la forme du tracé et les libellés distinguent les états, indépendamment de la couleur.';
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter l’animation' : '▶ Animer le mouvement';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
    n.play.disabled = reduced;
  }
  if (n.motion) {
    n.motion.textContent = S.forcedReduced ? '♿ Mouvement réduit simulé : ON' : '♿ Simuler « mouvement réduit »';
    n.motion.setAttribute('aria-pressed', S.forcedReduced ? 'true' : 'false');
  }
  if (n.panel) n.panel.setAttribute(REDUCED_ATTR, reduced ? '1' : '0');
  updateReadout();
  drawLab();
}

/* ---------- E044-08 : boucle rAF unique, quatre conditions d'arrêt ---------- */

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
  if (!S.visible) return;
  if (isReduced()) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.visible || isReduced()) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs); /* pas plafonné : pas de saut */
    if (S.playing) S.sweep = (S.sweep + dt * 0.00025) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !isReduced()) S.rafId = requestAnimationFrame(tick);
}

/* ---------- E044-03 / E044-09 : garde-fous d'écouteurs ---------- */

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing && !isReduced()) startLoop();
    });
  }

  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        if (mq.matches) {
          S.playing = false;
          stopLoop();
        }
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }

  if (!S.observer && typeof IntersectionObserver === 'function' && typeof document !== 'undefined') {
    const cv = S.nodes.canvas;
    if (cv) {
      S.observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          S.visible = entry.isIntersecting;
          if (S.visible) { if (S.playing && !isReduced()) startLoop(); }
          else stopLoop();
        }
      }, { threshold: 0.01 });
      S.observer.observe(cv);
    }
  }
}

/* ---------- E044-10 : badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', P + '-badge', 'Ce laboratoire respecte prefers-reduced-motion : l’animation s’arrête et le tracé devient statique dès que la préférence est détectée, sans perte de mesure.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E044', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  /* E044-02 : bloc CSS isolé, une seule fois, identifiants préfixés. */
  ctx.css(P, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  ctxReduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;
  const reduced = isReduced();
  S.nodes.panel.setAttribute(REDUCED_ATTR, reduced ? '1' : '0');
  if (reduced) {
    S.playing = false;
    stopLoop();
  }

  syncControls();

  if (S.nodes.fresh) {
    (S.nodes.radios || []).forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.view = radio.value;
        syncControls();
      });
    });

    S.nodes.freq.addEventListener('input', () => {
      S.freq = clamp(Math.round(Number(S.nodes.freq.value) * 2) / 2, 0.5, 6);
      syncControls();
    });
    S.nodes.amp.addEventListener('input', () => {
      S.amp = clamp(Math.round(Number(S.nodes.amp.value) / 2) * 2, 0, 60);
      syncControls();
    });
    S.nodes.dur.addEventListener('input', () => {
      S.dur = clamp(Math.round(Number(S.nodes.dur.value) / 50) * 50, 0, 1000);
      syncControls();
    });

    S.nodes.play.addEventListener('click', () => {
      if (isReduced()) return;
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });

    S.nodes.motion.addEventListener('click', () => {
      S.forcedReduced = !S.forcedReduced;
      if (S.forcedReduced) {
        S.playing = false;
        stopLoop();
      }
      syncControls();
    });

    /* Équivalent clavier du laboratoire. */
    S.nodes.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = VIEW_ORDER.indexOf(S.view);
        S.view = VIEW_ORDER[(i + step + VIEW_ORDER.length) % VIEW_ORDER.length];
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 0.5 : -0.5;
        S.freq = clamp(Math.round((S.freq + step) * 2) / 2, 0.5, 6);
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
  if (S.playing && !isReduced()) startLoop();
});
