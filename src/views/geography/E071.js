import { register } from './registry.js';

/* Lentille E071 — vue GEOGRAPHIE.
 * Thème : état de chargement et squelette (skeleton), sans réseau.
 *
 * Les dix chantiers E071-01 … E071-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E071.md. Tout est local : aucune requête
 * réseau, aucune valeur aléatoire, aucun appel de journalisation, aucun
 * fichier partagé modifié. Une seule horloge requestAnimationFrame pilote le
 * laboratoire ; le savoir est du texte sémantique réel (titres, paragraphes,
 * tableau captioné) présent dans le DOM même sans animation ; le canvas ne
 * fait qu'illustrer des formules déterministes calculées sur place.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const PANEL_ID = 'geography-e071-panel';
const TITLE_ID = 'geography-e071-title';
const LAT_ID = 'geography-e071-latence';
const LAT_OUT_ID = 'geography-e071-latence-value';
const BLOCS_ID = 'geography-e071-blocs';
const BLOCS_OUT_ID = 'geography-e071-blocs-value';
const PER_ID = 'geography-e071-periode';
const PER_OUT_ID = 'geography-e071-periode-value';
const ECART_ID = 'geography-e071-ecart';
const ECART_OUT_ID = 'geography-e071-ecart-value';
const ESPECE_ID = 'geography-e071-espece';
const CANVAS_ID = 'geography-e071-canvas';
const READOUT_ID = 'geography-e071-readout';
const PLAY_ID = 'geography-e071-play';
const NOTE_ID = 'geography-e071-note';

const ESPECES = ['shimmer', 'pulse', 'statique'];
const ESPECE_LABELS = {
  shimmer: 'Miroitement — bande lumineuse qui balaie le squelette',
  pulse: 'Pulsation — opacité qui monte et descend doucement',
  statique: 'Statique — gris fixe, sans aucune animation',
};

/* Seuils de réponse admis (valeurs de référence, en millisecondes). */
const SEUILS = [
  { signal: 'Instantané', ms: 100 },
  { signal: 'Seuil de Doherty', ms: 400 },
  { signal: 'Flux de pensée continu', ms: 1000 },
  { signal: 'Limite d’attention', ms: 10000 },
];

const ESPECE_DEFAUT = 'shimmer';
const QUEUE_CONTENT_MS = 1500; /* durée d'affichage du contenu après chargement */

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  latence: 1800,
  blocs: 4,
  periode: 1200,
  ecart: 0,
  espece: ESPECE_DEFAUT,
  playing: false,
  elapsed: 0,
  lastPct: -1,
  lastTs: 0,
  rafId: 0,
  inView: true,
  visibilityBound: false,
  motionBound: false,
  observer: null,
  nodes: {},
};

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

const fmt = (n, d = 2) => {
  const f = Math.pow(10, d);
  return (Math.round(n * f) / f).toFixed(d).replace('.', ',');
};

function verdictLatence(ms) {
  if (ms <= 100) return 'Instantané — aucune attente perceptible';
  if (ms <= 400) return 'Seuil de Doherty respecté — attention maintenue';
  if (ms <= 1000) return 'Doherty dépassé — flux de pensée encore continu';
  if (ms <= 10000) return 'Flux de pensée rompu — attente consciente';
  return 'Limite d’attention atteinte — l’utilisateur décroche';
}

/* CLS estimé du décalage entre squelette et contenu réel.
   Référence : un CLS inférieur à 0,1 est considéré comme « bon ». */
function clsEstime(ecart) {
  return 0.02 + 0.006 * Math.max(0, Math.min(100, ecart));
}

function verdictCLS(cls) {
  if (cls < 0.1) return 'bon';
  if (cls < 0.25) return 'à améliorer';
  return 'mauvais';
}

/* Luminosité déterministe d'un bloc, comprise entre 0 et 1.
   Aucune graine aléatoire : la phase dépend seulement du rang du bloc. */
function luminosite(t, periode, espece, phase) {
  const x = (((t / periode) + phase) % 1 + 1) % 1;
  if (espece === 'statique') return 0.12;
  if (espece === 'pulse') return 0.10 + 0.22 * (1 - Math.abs(2 * x - 1));
  return 0.08 + 0.30 * Math.exp(-Math.pow((x - 0.5) / 0.12, 2));
}

/* Disposition déterministe des blocs, normalisée entre 0 et 1. */
function blocPositions(n) {
  const out = [{ x: 0.04, y: 0.05, w: 0.46, h: 0.12 }];
  const restants = Math.max(0, n - 1);
  const lignes = Math.max(1, Math.ceil(restants / 2));
  const pas = Math.min(0.17, 0.70 / lignes);
  for (let i = 0; i < restants; i += 1) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    out.push({
      x: 0.04 + col * 0.48,
      y: 0.22 + row * pas,
      w: 0.44,
      h: pas * 0.72,
    });
  }
  return out;
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e071-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e071-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e071-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e071-panel p{margin:5px 0;max-width:68ch}
#geography-e071-panel .geography-e071-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e071-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e071-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e071-table th,#geography-e071-table td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
#geography-e071-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e071-limite{
  margin:8px 0;padding:8px 9px;border:1px dashed var(--line);border-radius:8px;
  background:rgba(230,185,111,.04);
}
#geography-e071-limite ol{margin:4px 0 0;padding-left:20px}
#geography-e071-limite li{margin:2px 0}
#geography-e071-espece{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e071-espece legend{padding:0 4px;color:var(--muted)}
#geography-e071-panel .geography-e071-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e071-panel .geography-e071-choix input{
  min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f);
}
#geography-e071-panel .geography-e071-curseur{
  display:block;width:100%;min-height:36px;margin:2px 0 6px;accent-color:var(--gold,#e6b96f);
}
.geography-e071-valeur{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e071-canvas{
  display:block;width:100%;height:250px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e071-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e071-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e071-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e071-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e071-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#geography-e071-note{font-size:10px;color:var(--muted);margin:6px 0 0}
#geography-e071-panel[data-geography-e071-reduced="1"] button{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e071-panel button{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e071-panel{font-size:10px;padding:9px}
  #geography-e071-canvas{height:200px}
  #geography-e071-panel .geography-e071-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Un état de chargement indique à la personne que le travail est en cours. Un squelette (ou « skeleton screen », écran-squelette) est une maquette grise qui reprend la forme du contenu à venir, sans charger la moindre donnée : il ne s’agit jamais d’un réseau, seulement d’une mise en page attendue.',
    'Un squelette efficace épouse la mise en page définitive : mêmes dimensions, mêmes positions. Sinon le contenu réel « saute » à son arrivée et provoque un déplacement de mise en page, mesuré par le CLS (cumulative layout shift).',
    'L’animation de miroitement (shimmer) doit rester discrète et s’arrêter lorsque la personne préfère un mouvement réduit. La latence perçue dépend de seuils de réponse — 100 ms, 400 ms, 1 s, 10 s — et non de la seule durée réelle.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e071-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticFormules() {
  const wrap = document.createElement('div');
  const formules = [
    'Verdict de latence : 0,1 s est instantané ; 0,4 s est le seuil de Doherty (l’attention reste maintenue) ; 1 s garde le flux de pensée continu ; 10 s marque la limite d’attention.',
    'CLS estimé = 0,02 + 0,006 × écart, où l’écart (en %) mesure le décalage entre le squelette et le contenu réel. Le résultat est « bon » sous 0,1, « à améliorer » sous 0,25, « mauvais » au-delà.',
    'Luminosité du miroitement : L(t) = 0,08 + 0,30 × e^(-((x−0,5)/0,12)²), avec x = (t/T + phase) modulo 1 et T la période réglable. La pulsation utilise une sinusoïde triangulaire ; le mode statique reste à 0,12. Aucun tirage aléatoire.',
    'Promotion : à t = latence, le squelette cède la place au contenu réel ; la transition est comptée en millisecondes. Le laboratoire boucle ensuite sur un cycle déterministe latence + 1 500 ms.',
  ];
  formules.forEach((texte) => {
    const p = document.createElement('p');
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = 'geography-e071-table';
  const caption = document.createElement('caption');
  caption.textContent = 'Seuils de réponse et verdicts. Références : 100 ms (instantané), 400 ms (Doherty), 1 000 ms (flux continu), 10 000 ms (limite d’attention). Le verdict est recalculé par verdictLatence().';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Signal', 'Seuil', 'Verdict'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  SEUILS.forEach(({ signal, ms }) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = signal;
    const tdMs = document.createElement('td');
    tdMs.textContent = ms >= 1000 ? `${fmt(ms / 1000)} s` : `${ms} ms`;
    const tdVerdict = document.createElement('td');
    tdVerdict.textContent = verdictLatence(ms);
    tr.append(th, tdMs, tdVerdict);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function staticLimite() {
  const box = document.createElement('div');
  box.id = 'geography-e071-limite';
  const h = document.createElement('h3');
  h.textContent = 'Limite falsifiable — défi en cinq temps';
  const p = document.createElement('p');
  p.textContent = 'Un squelette conforme n’améliore pas la vitesse réelle : il ne change que la perception. Voici comment tenter de le faire échouer.';
  const ol = document.createElement('ol');
  const etapes = [
    'Prédiction : avec un écart de 0 %, le CLS estimé est de 0,02 (bon) et la promotion paraît fluide ; avec un écart de 40 %, le CLS monte à 0,26 (mauvais).',
    'Réglage : fixer la latence à 1 800 ms, quatre blocs, puis faire passer le curseur « écart » de 0 à 40 %.',
    'Résultat attendu : le squelette et le contenu se décalent, le verdict CLS passe de « bon » à « mauvais » dans la région live.',
    'Falsification : si le verdict reste « bon » à 40 % d’écart, la formule clsEstime() est fausse ; si l’écart n’est pas visible dans le canvas, la promotion ne recalcule pas les positions.',
    'Débrief : retenir qu’un squelette mal aligné peut être pire qu’un simple fond neutre — l’angle mort est la confiance accordée à une maquette qui ne correspond pas au contenu final.',
  ];
  etapes.forEach((texte) => {
    const li = document.createElement('li');
    li.textContent = texte;
    ol.appendChild(li);
  });
  box.append(h, p, ol);
  return box;
}

function curseur(id, valeurId, libelle, min, max, step, valeur, format, aria) {
  const row = document.createElement('p');
  const label = document.createElement('label');
  label.setAttribute('for', id);
  label.appendChild(document.createTextNode(`${libelle} : `));
  const out = document.createElement('span');
  out.id = valeurId;
  out.className = 'geography-e071-valeur';
  out.textContent = format(valeur);
  label.appendChild(out);
  row.appendChild(label);

  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  input.className = 'geography-e071-curseur';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(valeur);
  input.setAttribute('aria-label', aria);
  return { row, input };
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      latence: document.getElementById(LAT_ID),
      latenceOut: document.getElementById(LAT_OUT_ID),
      blocs: document.getElementById(BLOCS_ID),
      blocsOut: document.getElementById(BLOCS_OUT_ID),
      periode: document.getElementById(PER_ID),
      periodeOut: document.getElementById(PER_OUT_ID),
      ecart: document.getElementById(ECART_ID),
      ecartOut: document.getElementById(ECART_OUT_ID),
      shimmer: document.getElementById('geography-e071-espece-shimmer'),
      pulse: document.getElementById('geography-e071-espece-pulse'),
      statique: document.getElementById('geography-e071-espece-statique'),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      note: document.getElementById(NOTE_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e071-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'État de chargement et squelette, sans réseau');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Un squelette est une maquette grise qui annonce la forme du contenu à venir. Le laboratoire ci-dessous montre, sans aucune requête, comment la latence, l’alignement du squelette et son animation changent la perception de l’attente.');

  const fieldset = document.createElement('fieldset');
  fieldset.id = ESPECE_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Animation du squelette (choix unique)';
  fieldset.appendChild(legend);
  [['shimmer', 'Miroitement'], ['pulse', 'Pulsation'], ['statique', 'Statique']].forEach(([value, label]) => {
    const lab = ctx.el('label', 'geography-e071-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e071-espece-groupe';
    radio.id = `geography-e071-espece-${value}`;
    radio.value = value;
    radio.checked = S.espece === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(label));
    fieldset.appendChild(lab);
  });

  const reglages = ctx.el('h3', '', 'Réglages déterministes');

  const lat = curseur(LAT_ID, LAT_OUT_ID, 'Latence simulée', 0, 8000, 200, S.latence,
    (v) => `${v} ms`, 'Latence simulée, de 0 à 8 000 millisecondes');
  const blocs = curseur(BLOCS_ID, BLOCS_OUT_ID, 'Nombre de blocs', 2, 6, 1, S.blocs,
    (v) => `${v}`, 'Nombre de blocs du squelette, de 2 à 6');
  const per = curseur(PER_ID, PER_OUT_ID, 'Période d’animation', 600, 2000, 100, S.periode,
    (v) => `${v} ms`, 'Période de l’animation, de 600 à 2 000 millisecondes');
  const ecart = curseur(ECART_ID, ECART_OUT_ID, 'Écart squelette / contenu', 0, 100, 5, S.ecart,
    (v) => `${v} %`, 'Écart entre le squelette et le contenu final, de 0 à 100 pour cent');

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Squelette de chargement puis contenu réel. Flèche gauche ou droite : latence ; flèche haut ou bas : écart ; touches 1, 2, 3 : miroitement, pulsation ou statique ; Entrée : lancer ou arrêter la simulation.');

  const readout = ctx.el('p', 'geography-e071-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter' : '▶ Lancer la simulation');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  const note = ctx.el('p', 'geography-e071-note', 'Une seule boucle rAF, pause sur onglet masqué et hors écran ; en mouvement réduit l’affichage se fige sur le contenu, sans miroitement.');
  note.id = NOTE_ID;

  panel.append(
    title, lead, staticFacts(), staticFormules(), staticTable(), staticLimite(),
    fieldset, reglages,
    lat.row, lat.input, blocs.row, blocs.input, per.row, per.input, ecart.row, ecart.input,
    canvas, readout, play, note,
  );

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    latence: lat.input, latenceOut: lat.out,
    blocs: blocs.input, blocsOut: blocs.out,
    periode: per.input, periodeOut: per.out,
    ecart: ecart.input, ecartOut: ecart.out,
    shimmer: document.getElementById('geography-e071-espece-shimmer'),
    pulse: document.getElementById('geography-e071-espece-pulse'),
    statique: document.getElementById('geography-e071-espece-statique'),
    canvas, readout, play, note,
  };
}

/* ---------- Rendu du laboratoire (un seul canvas, une seule passe) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 250;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 24;
  const barH = 12;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2 - barH - 12);
  const reduced = reducedNow();

  /* Cadre et graticule : repères non chromatiques (tirets). */
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);
  g.strokeStyle = 'rgba(214,207,193,.18)';
  g.setLineDash([2, 5]);
  for (let k = 1; k < 4; k += 1) {
    const gy = pad + (ih * k) / 4;
    g.beginPath(); g.moveTo(pad, gy); g.lineTo(pad + iw, gy); g.stroke();
  }
  g.setLineDash([]);

  const cycle = S.latence + QUEUE_CONTENT_MS;
  const charge = S.elapsed < S.latence;
  const p = S.latence > 0 ? Math.min(1, S.elapsed / S.latence) : 1;
  const positions = blocPositions(S.blocs);
  const decal = (S.ecart / 100) * 0.10;

  positions.forEach((b, i) => {
    const x = pad + (b.x + (charge ? 0 : decal)) * iw;
    const y = pad + b.y * ih;
    const w = b.w * iw;
    const h = b.h * ih;
    if (charge) {
      const lum = reduced ? 0.12 : luminosite(S.elapsed, S.periode, S.espece, i / Math.max(1, S.blocs));
      const gris = Math.round(150 + lum * 90);
      g.fillStyle = `rgba(${gris},${gris},${gris},.55)`;
      g.fillRect(x, y, w, h);
      g.strokeStyle = 'rgba(244,214,158,.28)';
      g.lineWidth = 1;
      g.strokeRect(x, y, w, h);
    } else {
      /* Contenu réel : barres de texte, décalées de `decal` si écart > 0. */
      g.fillStyle = 'rgba(244,214,158,.75)';
      g.fillRect(x, y, w * (i === 0 ? 0.62 : 1), Math.max(2, h * 0.30));
      g.fillStyle = 'rgba(214,207,193,.55)';
      const lignes = i === 0 ? 1 : 2;
      for (let l = 0; l < lignes; l += 1) {
        g.fillRect(x, y + h * 0.42 + l * h * 0.22, w * (0.92 - l * 0.18), Math.max(1, h * 0.10));
      }
      if (S.ecart > 0) {
        g.strokeStyle = 'rgba(230,185,111,.65)';
        g.setLineDash([3, 3]);
        g.strokeRect(x - decal * iw, y, w, h);
        g.setLineDash([]);
      }
    }
  });

  /* Bandeau d'état, lu directement et repris dans la région live. */
  const phase = charge
    ? `Chargement · ${Math.round(p * 100)} %`
    : 'Contenu affiché';
  const cls = clsEstime(S.ecart);
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText(`${phase} · latence ${S.latence} ms · ${ESPECE_LABELS[S.espece].split(' — ')[0]}`, pad + 2, pad + 13);
  g.fillStyle = 'rgba(214,207,193,.9)';
  g.fillText(`CLS estimé ${fmt(cls)} (${verdictCLS(cls)}) · écart ${S.ecart} %`, pad + 2, pad + 26);

  /* Barre de progression alimentée par la même horloge. */
  const barY = cssH - pad - barH + 6;
  g.strokeStyle = 'rgba(255,255,255,.22)';
  g.lineWidth = 1;
  g.strokeRect(pad, barY, iw, barH);
  g.fillStyle = 'rgba(244,214,158,.55)';
  g.fillRect(pad + 1, barY + 1, (iw - 2) * Math.min(1, S.elapsed / Math.max(1, cycle)), barH - 2);
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const pct = Math.round((S.elapsed / Math.max(1, S.latence + QUEUE_CONTENT_MS)) * 100);
  /* Écriture seulement quand le pourcentage change : moins de DOM et moins
     d'annonces indiscrètes pour les lecteurs d'écran (aria-live poli). */
  if (pct === S.lastPct) return;
  S.lastPct = pct;
  const cls = clsEstime(S.ecart);
  const charge = S.elapsed < S.latence;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode(charge ? 'Phase chargement · ' : 'Phase contenu · '));
  n.appendChild(fort(`${pct} %`));
  n.appendChild(document.createTextNode(' du cycle · latence '));
  n.appendChild(fort(`${S.latence} ms`));
  n.appendChild(document.createTextNode(` (référence : ${verdictLatence(S.latence)}) · CLS estimé `));
  n.appendChild(fort(fmt(cls)));
  n.appendChild(document.createTextNode(` — ${verdictCLS(cls)} (référence : 0,1) · écart ${S.ecart} % · ${ESPECE_LABELS[S.espece]}.`));
}

function updateNote() {
  const n = S.nodes.note;
  if (!n) return;
  const reduced = reducedNow();
  n.textContent = reduced
    ? 'Mouvement réduit actif : une seule image est dessinée, squelette sans miroitement, aucune boucle rAF.'
    : 'Une seule boucle rAF, pause sur onglet masqué et hors écran ; en mouvement réduit l’affichage se fige sur le contenu, sans miroitement.';
}

function syncControls() {
  const n = S.nodes;
  if (n.latence) n.latence.value = String(S.latence);
  if (n.latenceOut) n.latenceOut.textContent = `${S.latence} ms`;
  if (n.blocs) n.blocs.value = String(S.blocs);
  if (n.blocsOut) n.blocsOut.textContent = String(S.blocs);
  if (n.periode) n.periode.value = String(S.periode);
  if (n.periodeOut) n.periodeOut.textContent = `${S.periode} ms`;
  if (n.ecart) n.ecart.value = String(S.ecart);
  if (n.ecartOut) n.ecartOut.textContent = `${S.ecart} %`;
  if (n.shimmer) n.shimmer.checked = S.espece === 'shimmer';
  if (n.pulse) n.pulse.checked = S.espece === 'pulse';
  if (n.statique) n.statique.checked = S.espece === 'statique';
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter' : '▶ Lancer la simulation';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset.geographyE071Reduced = reducedNow() ? '1' : '0';
  updateNote();
  S.lastPct = -1;
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
  if (!S.inView) return;
  if (reducedNow()) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

/* Horloge unique : une seule fonction tick, un seul identifiant rafId.
   Tous les éléments animés lisent la même valeur de elapsed. */
function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.inView || reducedNow()) return;
  if (S.lastTs) {
    /* dt plafonné : un retour d'onglet ne provoque pas de saut. */
    const dt = Math.min(64, Math.max(0, ts - S.lastTs));
    const cycle = S.latence + QUEUE_CONTENT_MS;
    S.elapsed = (S.elapsed + dt) % cycle;
  }
  S.lastTs = ts;
  drawLab();
  updateReadout();
  if (S.playing) S.rafId = requestAnimationFrame(tick);
}

/* Source de vérité pour la préférence de mouvement, fournie par la coque. */
let reducedMotionFn = null;
function reducedNow() {
  if (typeof reducedMotionFn === 'function') {
    try { return !!reducedMotionFn(); } catch { return false; }
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  }
  return false;
}

function applyReduced(reduced) {
  if (reduced) {
    stopLoop();
    S.playing = false;
    /* On fige sur le contenu final, sans miroitement. */
    S.elapsed = S.latence + QUEUE_CONTENT_MS / 2;
    syncControls();
  } else if (S.playing) {
    startLoop();
  } else {
    updateNote();
    if (S.nodes.panel) S.nodes.panel.dataset.geographyE071Reduced = '0';
    drawLab();
  }
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing && S.inView && !reducedNow()) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => applyReduced(mq.matches);
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* Préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  /* Sortie d'écran : on met la boucle en pause, on la reprend au retour. */
  if (typeof IntersectionObserver === 'function' && !S.observer && S.nodes.canvas) {
    try {
      S.observer = new IntersectionObserver((entries) => {
        const ent = entries[0];
        S.inView = !!(ent && ent.isIntersecting);
        if (!S.inView) stopLoop();
        else if (S.playing && !reducedNow()) startLoop();
      }, { threshold: 0.05 });
      S.observer.observe(S.nodes.canvas);
    } catch { /* Observateur indisponible : la pause sur onglet masqué suffit. */ }
  }
}

/* ---------- Point d'entrée ---------- */

register('E071', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  if (typeof ctx.reducedMotion === 'function') reducedMotionFn = ctx.reducedMotion;

  ctx.css('geography-e071', CSS);

  S.nodes = ensurePanel(ctx);
  S.nodes.panel.dataset.geographyE071Reduced = reducedNow() ? '1' : '0';

  if (reducedNow()) {
    stopLoop();
    S.playing = false;
    S.elapsed = S.latence + QUEUE_CONTENT_MS / 2;
  }

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    [n.shimmer, n.pulse, n.statique].forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        S.espece = radio.value;
        S.elapsed = 0;
        syncControls();
      });
    });
    n.latence.addEventListener('input', () => {
      S.latence = Math.max(0, Math.min(8000, Math.round(Number(n.latence.value) / 200) * 200));
      S.elapsed = 0;
      syncControls();
    });
    n.blocs.addEventListener('input', () => {
      S.blocs = Math.max(2, Math.min(6, Math.round(Number(n.blocs.value))));
      syncControls();
    });
    n.periode.addEventListener('input', () => {
      S.periode = Math.max(600, Math.min(2000, Math.round(Number(n.periode.value) / 100) * 100));
      syncControls();
    });
    n.ecart.addEventListener('input', () => {
      S.ecart = Math.max(0, Math.min(100, Math.round(Number(n.ecart.value) / 5) * 5));
      syncControls();
    });
    n.play.addEventListener('click', () => {
      if (reducedNow()) {
        S.playing = false;
        S.elapsed = S.latence + QUEUE_CONTENT_MS / 2;
        syncControls();
        return;
      }
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 200 : -200;
        S.latence = Math.max(0, Math.min(8000, S.latence + step));
        S.elapsed = 0;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 5 : -5;
        S.ecart = Math.max(0, Math.min(100, S.ecart + step));
      } else if (event.key === '1' || event.key === '2' || event.key === '3') {
        S.espece = ESPECES[Number(event.key) - 1];
      } else if (event.key === 'Enter' || event.key === ' ') {
        n.play.click();
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
  if (S.playing && S.inView && !reducedNow()) startLoop();
});
