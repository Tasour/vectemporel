import { register } from './registry.js';

/* Lentille E064 (V2) — vue GEOGRAPHIE.
 * Thème : animations douces et respect de la boucle rAF unique.
 *
 * Les dix chantiers E064-01 … E064-10 sont réellement implémentés ci-dessous :
 *  01 texte sémantique d'introduction + bloc CSS isolé et préfixé
 *  02 tableau des valeurs d'interpolation recalculées par ease()
 *  03 sélecteur d'interpolation en radiogroupe (choix unique)
 *  04 curseur de durée borné (1–6 s, pas de 500 ms)
 *  05 interpolation de position entre deux repères géographiques (Haversine)
 *  06 horloge rAF unique, avancement indépendant du taux de rafraîchissement
 *  07 pause sur document.hidden et reprise sans saut
 *  08 respect de prefers-reduced-motion via ctx.reducedMotion() et matchMedia
 *  09 readout chiffré comparé à une référence + codes non chromatiques / DPR ≤ 2
 *  10 défi falsifiable en 5 temps + accessibilité clavier et robustesse d'état
 *
 * Tout est local : aucun appel réseau, aucun tirage aléatoire (graine fixe
 * 0xE064 et mulberry32), aucune journalisation, aucun fichier partagé modifié.
 * Une seule horloge requestAnimationFrame pilote tous les éléments animés :
 * repère, anneau pulsé, traînée et barre de progression lisent le même temps.
 * Le contenu pédagogique est du texte sémantique réel inséré dans le DOM : il
 * reste lisible et indexable même sans animation ni interaction. Le canvas
 * n'est qu'un laboratoire dont chaque grandeur est aussi écrite en toutes
 * lettres dans le tableau statique et dans le readout.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Préfixe unique : geography-v2-e064- (identifiants, classes, attributs et CSS).
 */

const P = 'geography-v2-e064';
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const EASE_ID = P + '-ease';
const DUR_ID = P + '-duration';
const DUR_OUT_ID = P + '-duration-out';
const CANVAS_ID = P + '-canvas';
const READOUT_ID = P + '-readout';
const LEGEND_ID = P + '-legend';
const PLAY_ID = P + '-play';
const RESET_ID = P + '-reset';
const NOTE_ID = P + '-note';
const TABLE_ID = P + '-table';
const BADGE_ID = P + '-badge';
const CHALLENGE_ID = P + '-challenge';
const CHALLENGE_TITLE_ID = P + '-challenge-title';
const APPLY_ID = P + '-apply';
const REVEAL_ID = P + '-reveal';
const DEBRIEF_ID = P + '-debrief';
const REDUCED_ATTR = 'data-' + P + '-reduced';

/* Constantes canoniques : formules et repères réels, aucune donnée fabriquée. */
const RAD = Math.PI / 180;
const SEED = 0xE064;        /* graine fixe et affichée, zéro tirage aléatoire. */
const EARTH_R_KM = 6371;    /* rayon terrestre moyen, référence de Haversine. */
const MAX_DT = 64;          /* pas de temps plafonné, borne d'une image tardive. */
const A = { name: 'Paris', lat: 48.8566, lon: 2.3522 };
const B = { name: 'Lyon', lat: 45.7640, lon: 4.8357 };
const EASINGS = ['linear', 'inout', 'out'];
const EASE_LABELS = {
  linear: 'Linéaire — vitesse constante',
  inout: 'Ease-in-out cubique — départ et arrivée doux',
  out: 'Ease-out quadratique — arrivée amortie',
};
const EASE_SHORT = {
  linear: 'Linéaire',
  inout: 'Ease-in-out cubique',
  out: 'Ease-out quadratique',
};
const TICKS = [0.25, 0.5, 0.75, 1];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  easing: 'inout',
  duration: 4000,
  playing: false,
  elapsed: 0,
  reduced: false,
  lastTs: 0,
  rafId: 0,
  visBound: false,
  motionBound: false,
  nodes: {},
};

/* ctx.reducedMotion() conservé hors du point d'entrée pour la boucle rAF. */
let ctxReduced = null;

/* ---------- E064-05 : générateur déterministe (mulberry32, graine affichée) ---------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- E064-05 : formules déterministes (aucune donnée fabriquée) ---------- */

function ease(kind, t) {
  const x = Math.max(0, Math.min(1, t));
  if (kind === 'linear') return x;
  if (kind === 'out') return 1 - (1 - x) * (1 - x);
  /* ease-in-out cubique : p(0,25) = 4 × 0,25³ = 0,0625. */
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function distanceKm(p, q) {
  const dLat = (q.lat - p.lat) * RAD;
  const dLon = (q.lon - p.lon) * RAD;
  const lat1 = p.lat * RAD;
  const lat2 = q.lat * RAD;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.asin(Math.min(1, Math.sqrt(a)));
  return EARTH_R_KM * c;
}

const TOTAL_KM = distanceKm(A, B);

function positionAt(p) {
  return {
    lat: A.lat + (B.lat - A.lat) * p,
    lon: A.lon + (B.lon - A.lon) * p,
  };
}

function fmt(value, digits) {
  const d = digits === undefined ? 2 : digits;
  const factor = Math.pow(10, d);
  return (Math.round(value * factor) / factor).toFixed(d).replace('.', ',');
}

/* ---------- E064-01 : feuille de style unique, préfixée, sans réseau ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:72ch}
#${PANEL_ID} .${P}-fait{margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f)}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${EASE_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${EASE_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} input[type=range]{
  width:100%;min-height:36px;accent-color:var(--gold,#e6b96f);
  -webkit-appearance:none;appearance:none;background:transparent;cursor:pointer;
}
#${PANEL_ID} input[type=range]::-webkit-slider-runnable-track{height:6px;border-radius:3px;background:rgba(214,207,193,.35)}
#${PANEL_ID} input[type=range]::-webkit-slider-thumb{
  -webkit-appearance:none;appearance:none;width:24px;height:24px;margin-top:-9px;
  border:1px solid var(--gold-bright,#f4d69e);border-radius:50%;background:var(--gold,#e6b96f);
}
#${PANEL_ID} input[type=range]::-moz-range-track{height:6px;border-radius:3px;background:rgba(214,207,193,.35)}
#${PANEL_ID} input[type=range]::-moz-range-thumb{
  width:24px;height:24px;border:1px solid var(--gold-bright,#f4d69e);border-radius:50%;
  background:var(--gold,#e6b96f);
}
#${PANEL_ID} .${P}-valeur{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${CANVAS_ID}{
  display:block;width:100%;height:240px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.3);touch-action:none;
}
#${LEGEND_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID}{
  min-height:56px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
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
#${PANEL_ID} button[aria-pressed=true]{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.16)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${NOTE_ID}{font-size:10px;color:var(--muted);margin:6px 0 0}
#${CHALLENGE_ID}{margin-top:12px;border-top:1px solid var(--line);padding-top:6px}
#${CHALLENGE_ID} ol{margin:6px 0;padding-left:20px;font-size:10px;line-height:1.6;color:var(--muted)}
#${CHALLENGE_ID} li{margin:3px 0}
#${DEBRIEF_ID}{border-left:2px solid var(--gold,#e6b96f);padding-left:8px;color:var(--gold-bright,#f4d69e)}
.${P}-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:64%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[${REDUCED_ATTR}="1"] button,.${P}-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.${P}-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:200px}
}
`;

/* ---------- E064-01 : faits sémantiques, lisibles sans JS ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une animation fluide utilise une seule horloge : tous les éléments animés lisent le même temps, sinon ils se désynchronisent. Ici, repère, anneau, traînée et barre de progression sont dessinés dans la même passe à partir de la même valeur de temps écoulé.',
    'Le déplacement doit être indépendant du taux de rafraîchissement : on avance selon le temps écoulé entre deux images, pas d’un pas fixe par image. Sans cela, le même trajet paraîtrait deux fois plus rapide sur un écran 120 Hz que sur un écran 60 Hz.',
    'Une fonction d’interpolation (ou « easing ») module la vitesse pour adoucir le départ et l’arrivée ; sans elle, le mouvement paraît mécanique. Linéaire, ease-in-out cubique et ease-out quadratique atteignent toutes la valeur 1 à t = 1 : la destination est atteinte.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = P + '-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

/* ---------- E064-02 : tableau des valeurs d'interpolation recalculées ---------- */

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Progression normalisée p = ease(t), recalculée par la même fonction que le laboratoire. Référence : t = 1 donne toujours 1,00 (destination atteinte) ; la ligne « Linéaire » sert de repère à vitesse constante.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Interpolation', 't = 0,25', 't = 0,50', 't = 0,75', 't = 1,00'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  EASINGS.forEach((kind) => {
    const tr = document.createElement('tr');
    const label = document.createElement('th');
    label.scope = 'row';
    label.textContent = EASE_SHORT[kind];
    tr.appendChild(label);
    TICKS.forEach((t) => {
      const td = document.createElement('td');
      td.textContent = fmt(ease(kind, t));
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: {
        linear: document.getElementById(P + '-ease-linear'),
        inout: document.getElementById(P + '-ease-inout'),
        out: document.getElementById(P + '-ease-out'),
      },
      duration: document.getElementById(DUR_ID),
      durationOut: document.getElementById(DUR_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      legend: document.getElementById(LEGEND_ID),
      play: document.getElementById(PLAY_ID),
      reset: document.getElementById(RESET_ID),
      note: document.getElementById(NOTE_ID),
      apply: document.getElementById(APPLY_ID),
      reveal: document.getElementById(REVEAL_ID),
      debrief: document.getElementById(DEBRIEF_ID),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Animations douces et horloge unique');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', `Un repère se déplace de ${A.name} vers ${B.name} selon une interpolation choisie. Tous les éléments animés — repère, anneau, traînée et barre de progression — sont pilotés par une seule boucle rAF : ils partagent le même temps et ne peuvent pas se désynchroniser. Le tableau ci-dessous donne les valeurs de référence, vérifiables sans lancer l’animation.`);

  /* E064-03 : radiogroupe natif complété par un rôle explicite. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = EASE_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Interpolation du mouvement (choix unique)');
  const legendField = document.createElement('legend');
  legendField.textContent = '1. Choisir l’interpolation (choix unique)';
  fieldset.appendChild(legendField);
  const radios = {};
  EASINGS.forEach((value) => {
    const lab = ctx.el('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-ease';
    radio.id = P + '-ease-' + value;
    radio.value = value;
    radio.checked = S.easing === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(EASE_SHORT[value]));
    fieldset.appendChild(lab);
    radios[value] = radio;
  });

  /* E064-04 : curseur de durée borné, entier multiple de 500 ms. */
  const durRow = ctx.el('p', '');
  const durLabel = document.createElement('label');
  durLabel.setAttribute('for', DUR_ID);
  durLabel.appendChild(document.createTextNode('2. Durée d’un trajet : '));
  const durOut = ctx.el('span', P + '-valeur');
  durOut.id = DUR_OUT_ID;
  durLabel.appendChild(durOut);
  const duration = document.createElement('input');
  duration.type = 'range';
  duration.id = DUR_ID;
  duration.min = '1000';
  duration.max = '6000';
  duration.step = '500';
  duration.value = String(S.duration);
  duration.setAttribute('aria-label', 'Durée d’un trajet, de 1 à 6 secondes par pas de 500 millisecondes');
  durRow.appendChild(durLabel);

  /* E064-05 / E064-09 : canvas lab, focusable et doublé en texte. */
  const sub = ctx.el('h3', '', 'Observer le trajet');
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `Trajet ${A.name} vers ${B.name} animé. Flèche gauche ou droite : changer d’interpolation ; flèche haut ou bas : changer la durée ; Entrée : lancer ou arrêter l’animation.`);

  /* E064-09 : légende sans couleur, glyphes + graine affichée. */
  const legendText = ctx.el('p', P + '-legend');
  legendText.id = LEGEND_ID;

  /* E064-09 : unique région live, annoncée poliment. */
  const readout = ctx.el('p', P + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  /* E064-06 : commandes de l'animation (bascule indépendante → aria-pressed). */
  const play = ctx.el('button', '', '▶ Animer le trajet');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', 'false');
  const reset = ctx.el('button', '', 'Réinitialiser');
  reset.type = 'button';
  reset.id = RESET_ID;

  const note = ctx.el('p', P + '-note', 'Une seule boucle rAF avec pause sur onglet masqué ; le mouvement réduit fige le repère à destination.');
  note.id = NOTE_ID;

  /* E064-10 : défi en 5 temps, aligné sur la limite du modèle. */
  const challenge = ctx.el('section', P + '-challenge');
  challenge.id = CHALLENGE_ID;
  challenge.setAttribute('aria-labelledby', CHALLENGE_TITLE_ID);
  const chTitle = ctx.el('h3', '', 'À vous de jouer — vérifier une affirmation');
  chTitle.id = CHALLENGE_TITLE_ID;
  const steps = document.createElement('ol');
  [
    'Prédiction : avec l’ease-in-out cubique à t = 0,25, la progression effective p est-elle inférieure à 0,10 ?',
    'Réglage : utilisez le bouton « Appliquer le réglage du défi » pour fixer l’interpolation, la durée à 4 s et le temps à t = 0,25.',
    'Résultat attendu : le calcul donne p = 4 × 0,25³ = 0,0625, soit 0,06 : bien inférieur à 0,10, alors que le temps écoulé est de 25 %.',
    'Falsification : si la lecture donne p ≥ 0,10, l’affirmation est réfutée — revérifiez la formule cubique p = 4t³ pour t < 0,5 et la valeur lue dans le readout.',
    'Débrief : révélez la valeur calculée et expliquez l’écart entre avancement du temps et progression effective, puis les limites du modèle.',
  ].forEach((texte) => {
    const li = document.createElement('li');
    li.textContent = texte;
    steps.appendChild(li);
  });
  challenge.appendChild(chTitle);
  challenge.appendChild(steps);

  const apply = ctx.el('button', '', 'Appliquer le réglage du défi');
  apply.type = 'button';
  apply.id = APPLY_ID;
  const reveal = ctx.el('button', '', 'Voir le débrief');
  reveal.type = 'button';
  reveal.id = REVEAL_ID;
  const debrief = ctx.el('p', '', '');
  debrief.id = DEBRIEF_ID;
  debrief.hidden = true;
  reveal.setAttribute('aria-controls', DEBRIEF_ID);
  reveal.setAttribute('aria-expanded', 'false');
  challenge.append(apply, reveal, debrief);

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, durRow, duration,
    sub, canvas, legendText, readout, play, reset, note, challenge);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  if (aside && typeof aside.insertBefore === 'function') aside.insertBefore(panel, aside.firstChild);
  else if (host && typeof host.appendChild === 'function') host.appendChild(panel);

  return {
    panel, fresh: true, radios, duration, durationOut: durOut, canvas,
    readout, legend: legendText, play, reset, note, apply, reveal, debrief,
  };
}

/* ---------- E064-05 / E064-09 : dessin déterministe, un seul canvas ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 340;
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

  const t = Math.max(0, Math.min(1, S.elapsed / S.duration));
  const p = ease(S.easing, t);
  const here = positionAt(p);

  const pad = 26;
  const barH = 14;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2 - barH - 10);
  const latMin = 45, latMax = 50, lonMin = 1.5, lonMax = 5.5;
  const toPx = (lat, lon) => [
    pad + ((lon - lonMin) / (lonMax - lonMin)) * iw,
    pad + ((latMax - lat) / (latMax - latMin)) * ih,
  ];
  const [ax, ay] = toPx(A.lat, A.lon);
  const [bx, by] = toPx(B.lat, B.lon);
  const [mx, my] = toPx(here.lat, here.lon);

  /* Cadre et graticule — repères non chromatiques (tirets). */
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);
  g.strokeStyle = 'rgba(214,207,193,.20)';
  g.setLineDash([2, 5]);
  for (let k = 1; k < 4; k += 1) {
    const gy = pad + (ih * k) / 4;
    g.beginPath(); g.moveTo(pad, gy); g.lineTo(pad + iw, gy); g.stroke();
    const gx = pad + (iw * k) / 4;
    g.beginPath(); g.moveTo(gx, pad); g.lineTo(gx, pad + ih); g.stroke();
  }
  g.setLineDash([]);

  /* Jalons déterministes le long du trajet : mulberry32(0xE064), graine fixe. */
  const rng = mulberry32(SEED);
  g.fillStyle = 'rgba(214,207,193,.55)';
  for (let k = 1; k < 8; k += 1) {
    const u = k / 8;
    const jitter = (rng() - 0.5) * 6;
    const jx = ax + (bx - ax) * u;
    const jy = ay + (by - ay) * u + jitter;
    g.beginPath();
    g.arc(jx, jy, 1.4, 0, Math.PI * 2);
    g.fill();
  }

  /* Trajet complet en tirets, portion parcourue en trait plein. */
  g.strokeStyle = 'rgba(214,207,193,.45)';
  g.lineWidth = 1.5;
  g.setLineDash([6, 5]);
  g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
  g.setLineDash([]);
  g.strokeStyle = 'rgba(244,214,158,.95)';
  g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(ax, ay); g.lineTo(mx, my); g.stroke();

  /* Anneau pulsé : rayon déterministe fonction de p, jamais aléatoire. */
  g.strokeStyle = 'rgba(244,214,158,.35)';
  g.lineWidth = 1;
  g.beginPath(); g.arc(mx, my, 6 + 13 * p, 0, Math.PI * 2); g.stroke();

  /* Extrémités en croix, indépendantes de la couleur. */
  const cross = (x, y, r) => {
    g.beginPath();
    g.moveTo(x - r, y); g.lineTo(x + r, y);
    g.moveTo(x, y - r); g.lineTo(x, y + r);
    g.stroke();
  };
  g.strokeStyle = 'rgba(214,207,193,.9)';
  g.lineWidth = 1.5;
  cross(ax, ay, 5);
  cross(bx, by, 5);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.beginPath(); g.arc(mx, my, 4.5, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(8,12,18,.9)';
  g.lineWidth = 1;
  cross(mx, my, 8);

  g.fillStyle = 'rgba(214,207,193,.9)';
  g.font = '10px sans-serif';
  g.fillText(A.name, ax + 8, ay - 6);
  g.fillText(B.name, bx - 8 - g.measureText(B.name).width, by - 6);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText(`${EASE_SHORT[S.easing]} · p = ${fmt(p)}`, pad + 2, pad + 13);

  /* Barre de progression, alimentée par la même valeur p. */
  const barY = cssH - pad - barH + 6;
  g.strokeStyle = 'rgba(255,255,255,.22)';
  g.lineWidth = 1;
  g.strokeRect(pad, barY, iw, barH);
  g.fillStyle = 'rgba(244,214,158,.55)';
  g.fillRect(pad + 1, barY + 1, (iw - 2) * p, barH - 2);
}

/* ---------- E064-09 : readout, région live unique ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const t = Math.max(0, Math.min(1, S.elapsed / S.duration));
  const p = ease(S.easing, t);
  const pct = Math.round(t * 100);
  const linear = t; /* référence : vitesse constante. */
  const km = TOTAL_KM * p;
  const sec = Math.min(S.duration, S.elapsed) / 1000;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  const parts = [
    'Avancement du temps : ', fort(pct + ' %'), ' · progression effective (easing) : ',
    fort('p = ' + fmt(p)), ' (référence à vitesse constante : ', fort(fmt(linear)), '). ',
    'Distance « à vol d’oiseau » parcourue : ', fort(fmt(km, 1) + ' km'),
    ' sur ', fort(fmt(TOTAL_KM, 1) + ' km'), ' (référence : trajet complet). ',
    'Temps écoulé : ', fort(fmt(sec) + ' s'), ' sur ', fort(fmt(S.duration / 1000) + ' s'),
    ' · ', fort(EASE_LABELS[S.easing]), '.',
  ];

  /* N'écrire que si le texte change : évite les annonces redondantes. */
  const plain = parts.map((item) => (typeof item === 'string' ? item : item.textContent)).join('');
  if (n.textContent === plain) return;
  n.textContent = '';
  parts.forEach((item) => {
    if (typeof item === 'string') n.appendChild(document.createTextNode(item));
    else n.appendChild(item);
  });
}

/* ---------- Synchronisation des contrôles et du laboratoire ---------- */

function syncControls() {
  const n = S.nodes;
  EASINGS.forEach((kind) => {
    if (n.radios && n.radios[kind]) n.radios[kind].checked = S.easing === kind;
  });
  if (n.duration) n.duration.value = String(S.duration);
  if (n.durationOut) n.durationOut.textContent = fmt(S.duration / 1000) + ' s';
  if (n.play) {
    n.play.textContent = S.reduced
      ? 'Position fixe (mouvement réduit)'
      : (S.playing ? '■ Arrêter' : '▶ Animer le trajet');
    n.play.setAttribute('aria-pressed', S.playing && !S.reduced ? 'true' : 'false');
  }
  if (n.note) {
    n.note.textContent = S.reduced
      ? 'Mouvement réduit actif : une seule image est dessinée, repère figé à destination, aucune boucle rAF.'
      : 'Une seule boucle rAF avec pause sur onglet masqué ; le mouvement réduit fige le repère à destination.';
  }
  if (n.panel) n.panel.setAttribute(REDUCED_ATTR, S.reduced ? '1' : '0');
  if (n.canvas) {
    n.canvas.setAttribute('aria-label', `Trajet ${A.name} vers ${B.name}. Interpolation ${EASE_SHORT[S.easing]}, durée ${fmt(S.duration / 1000)} s. Flèche gauche ou droite : changer d’interpolation ; flèche haut ou bas : changer la durée ; Entrée : lancer ou arrêter l’animation.`);
  }
  if (n.legend) {
    n.legend.textContent = 'Graine de dessin ' + SEED.toString(16).toUpperCase() +
      ' (mulberry32, aucun tirage aléatoire) · ┄ tirets = trajet complet · ━ trait plein = portion parcourue · ' +
      '✕ = extrémités (Paris, Lyon) · ◎ = repère, cercle fin = anneau pulsé · ' +
      'distance totale ' + fmt(TOTAL_KM, 1) + ' km à vol d’oiseau (rayon terrestre ' + EARTH_R_KM + ' km).';
  }
  if (n.debrief && n.reveal && !n.debrief.hidden) {
    const value = ease('inout', 0.25);
    n.debrief.textContent = 'Calcul : p = 4 × 0,25³ = ' + fmt(value, 4) + ' ≈ ' + fmt(value) +
      ' < 0,10, donc l’affirmation est confirmée : l’ease-in-out démarre lentement alors que le temps a déjà avancé de 25 %. Limite du modèle : les distances sont orthodromiques (à vol d’oiseau, ' +
      fmt(TOTAL_KM, 1) + ' km) et l’interpolation lat/lon n’est pas la route réelle ; la fluidité dépend aussi du navigateur et de son taux de rafraîchissement.';
  }
  updateReadout();
  drawLab();
}

function setEasing(value) {
  if (EASINGS.indexOf(value) < 0) return;
  S.easing = value;
  S.elapsed = 0;
  syncControls();
}

function setDuration(ms) {
  S.duration = Math.max(1000, Math.min(6000, Math.round(Number(ms) / 500) * 500));
  S.elapsed = 0;
  syncControls();
}

/* ---------- E064-06 / E064-07 : boucle rAF unique, pause sur document.hidden ---------- */

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
  if (typeof ctxReduced === 'function' && ctxReduced()) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

/* Horloge unique : une seule fonction tick, un seul identifiant rafId.
   Tous les éléments animés lisent la même valeur de elapsed. */
function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  const reduced = typeof ctxReduced === 'function' ? !!ctxReduced() : false;
  if (S.lastTs) {
    /* dt plafonné : un retour d'onglet ou une image lente ne provoque pas
       de saut ; la vitesse reste indépendante du taux de rafraîchissement. */
    const dt = Math.min(MAX_DT, Math.max(0, ts - S.lastTs));
    S.elapsed = (S.elapsed + dt) % S.duration;
  }
  S.lastTs = ts;
  updateReadout();
  drawLab();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
}

/* ---------- E064-08 : mouvement réduit et garde-fous d'écouteurs ---------- */

function applyReduced(reduced) {
  S.reduced = !!reduced;
  if (S.reduced) {
    stopLoop();
    S.playing = false;
    S.elapsed = S.duration; /* repère figé à destination. */
  }
  syncControls();
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visBound) {
    S.visBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing && !S.reduced) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => applyReduced(mq.matches);
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- E064-09 : badge textuel de mise en garde sur la carte ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', P + '-badge',
    'Schéma conceptuel non à l’échelle : les distances sont orthodromiques (« à vol d’oiseau »), pas des distances routières. Une seule horloge rAF pilote tous les éléments animés.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E064', (ctx) => {
  if (!ctx || (!ctx.stage && !ctx.layout) || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  /* E064-01 : bloc CSS isolé, une seule fois, identifiants préfixés. */
  ctx.css(P, CSS);

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  ctxReduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;
  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  if (S.reduced) {
    S.playing = false;
    stopLoop();
    S.elapsed = S.duration;
  }

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    EASINGS.forEach((kind) => {
      const radio = n.radios[kind];
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        setEasing(kind);
      });
    });
    n.duration.addEventListener('input', () => setDuration(n.duration.value));
    n.play.addEventListener('click', () => {
      if (S.reduced) {
        /* Mouvement réduit : une seule position fixe, équivalent lisible. */
        S.playing = false;
        S.elapsed = S.duration;
        stopLoop();
        syncControls();
        return;
      }
      S.playing = !S.playing;
      if (S.playing) startLoop(); else stopLoop();
      syncControls();
    });
    n.reset.addEventListener('click', () => {
      S.playing = false;
      stopLoop();
      S.easing = 'inout';
      S.duration = 4000;
      S.elapsed = 0;
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = EASINGS.indexOf(S.easing);
        setEasing(EASINGS[(i + step + EASINGS.length) % EASINGS.length]);
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 500 : -500;
        setDuration(S.duration + step);
      } else if (event.key === 'Enter' || event.key === ' ') {
        n.play.click();
      } else {
        used = false;
      }
      if (used) event.preventDefault();
    });
    n.apply.addEventListener('click', () => {
      S.playing = false;
      stopLoop();
      S.easing = 'inout';
      S.duration = 4000;
      S.elapsed = 1000; /* t = 0,25 : p = 0,0625. */
      syncControls();
    });
    n.reveal.addEventListener('click', () => {
      const value = ease('inout', 0.25);
      n.debrief.textContent = 'Calcul : p = 4 × 0,25³ = ' + fmt(value, 4) + ' ≈ ' + fmt(value) +
        ' < 0,10, donc l’affirmation est confirmée : l’ease-in-out démarre lentement alors que le temps a déjà avancé de 25 %. Limite du modèle : les distances sont orthodromiques (à vol d’oiseau, ' +
        fmt(TOTAL_KM, 1) + ' km) et l’interpolation lat/lon n’est pas la route réelle ; la fluidité dépend aussi du navigateur et de son taux de rafraîchissement.';
      n.debrief.hidden = false;
      n.reveal.setAttribute('aria-expanded', 'true');
    });
  }

  installGlobalListeners();
  if (S.playing && !S.reduced) startLoop();
});
