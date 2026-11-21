import { register } from './registry.js';

/* Lentille E082 — vue GEOGRAPHIE.
 * Thème : évitement du chevauchement d'étiquettes.
 *
 * Les dix chantiers E082-01 … E082-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E082.md. Tout est local : aucune requête
 * réseau, aucune valeur aléatoire (générateur mulberry32 à graine affichée),
 * aucun appel de journalisation, aucun fichier partagé modifié. Une seule
 * horloge requestAnimationFrame pilote le laboratoire ; le savoir est du texte
 * sémantique réel (titres, paragraphes, tableau captioné, défi en cinq temps)
 * présent dans le DOM même sans animation ; le canvas ne fait qu'illustrer des
 * algorithmes déterministes calculés sur place.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e082';
const P = 'geography-e082';

const PANEL_ID = `${P}-panel`;
const TITLE_ID = `${P}-title`;
const TABLE_ID = `${P}-table`;
const TABLE_BODY_ID = `${P}-table-body`;
const STRAT_ID = `${P}-strategie`;
const N_ID = `${P}-n`;
const N_OUT_ID = `${P}-n-value`;
const MARGE_ID = `${P}-marge`;
const MARGE_OUT_ID = `${P}-marge-value`;
const ITER_ID = `${P}-iterations`;
const ITER_OUT_ID = `${P}-iterations-value`;
const GRAINE_ID = `${P}-graine`;
const GRAINE_BOUTON_ID = `${P}-graine-suivante`;
const CANVAS_ID = `${P}-canvas`;
const READOUT_ID = `${P}-readout`;
const PLAY_ID = `${P}-play`;
const NOTE_ID = `${P}-note`;

/* Espace logique fixe : les mesures ne dépendent pas de la taille de l'écran. */
const W = 900;
const H = 520;
const PADX = 44;
const PADY = 38;
const HAUTEUR = 30;
const CELLULE = 70;
const CYCLE_MS = 5000;

const STRATEGIES = ['naif', 'glouton', 'relaxation', 'retrait'];
const STRAT_LABELS = {
  naif: 'Naïf — toutes les étiquettes centrées sur leur repère',
  glouton: 'Glouton — priorité puis neuf positions candidates',
  relaxation: 'Relaxation — déplacement itératif déterministe',
  retrait: 'Retrait — les étiquettes en conflit sont masquées',
};
const STRAT_COURT = {
  naif: 'Naïf',
  glouton: 'Glouton',
  relaxation: 'Relaxation',
  retrait: 'Retrait',
};

/* Neuf positions candidates : le centre plus les huit directions. */
const CANDIDATS = [
  [0, 0], [0, -1], [0, 1], [-1, 0], [1, 0],
  [-1, -1], [1, -1], [-1, 1], [1, 1],
];

const NOMS = [
  'Aube', 'Brume', 'Cime', 'Dune', 'Estuaire', 'Falaise', 'Gorge',
  'Havre', 'Îlot', 'Lande', 'Marais', 'Névé', 'Oasis', 'Pointe',
  'Quai', 'Rade', 'Sillon', 'Tundra', 'Vallon', 'Zéphyr',
];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  n: 18,
  marge: 8,
  iterations: 24,
  graine: 82026,
  strategie: 'glouton',
  playing: false,
  elapsed: CYCLE_MS,
  lastPct: -1,
  lastTs: 0,
  rafId: 0,
  inView: true,
  visibilityBound: false,
  motionBound: false,
  motionFn: null,
  observer: null,
  lieux: [],
  calcul: null,
  nodes: {},
};

/* ---------- Outils déterministes ---------- */

const fmt = (v, d = 1) => {
  const f = Math.pow(10, d);
  return (Math.round(v * f) / f).toFixed(d).replace('.', ',');
};

/* Générateur congruentiel mulberry32 : aucune valeur tirée au hasard,
 * la graine est affichée dans le panneau et peut être incrémentée d'un pas. */
function mulberry32(graine) {
  let a = graine >>> 0;
  return function suivant() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nommer(i) {
  const base = NOMS[i % NOMS.length];
  return i < NOMS.length ? base : `${base}${Math.floor(i / NOMS.length) + 1}`;
}

function largeurEtiquette(nom) {
  return 46 + 8 * nom.length;
}

function genererLieux(n, graine) {
  const suivant = mulberry32(graine);
  const out = [];
  for (let i = 0; i < n; i += 1) {
    out.push({
      i,
      rang: i,
      nom: nommer(i),
      ax: PADX + (W - 2 * PADX) * suivant(),
      ay: PADY + (H - 2 * PADY) * suivant(),
    });
  }
  return out;
}

/* ---------- Géométrie des boîtes et index spatial ---------- */

function boiteCentree(cx, cy, w) {
  return { x: cx - w / 2, y: cy - HAUTEUR / 2, w, h: HAUTEUR, cx, cy };
}

function chevauche(a, b, marge) {
  return (a.x - marge) < (b.x + b.w + marge)
    && (a.x + a.w + marge) > (b.x - marge)
    && (a.y - marge) < (b.y + b.h + marge)
    && (a.y + a.h + marge) > (b.y - marge);
}

/* Grille régulière : on n'examine que les cellules voisines au lieu de
 * comparer toutes les paires. L'index est reconstruit à chaque stratégie. */
function grilleVide() {
  return new Map();
}

function ajouterGrille(grille, b, idx) {
  const c = CELLULE;
  for (let gx = Math.floor(b.x / c); gx <= Math.floor((b.x + b.w) / c); gx += 1) {
    for (let gy = Math.floor(b.y / c); gy <= Math.floor((b.y + b.h) / c); gy += 1) {
      const k = `${gx}|${gy}`;
      let tab = grille.get(k);
      if (!tab) { tab = []; grille.set(k, tab); }
      tab.push(idx);
    }
  }
}

function indicesProches(grille, b) {
  const c = CELLULE;
  const ensemble = new Set();
  for (let gx = Math.floor(b.x / c) - 1; gx <= Math.floor((b.x + b.w) / c) + 1; gx += 1) {
    for (let gy = Math.floor(b.y / c) - 1; gy <= Math.floor((b.y + b.h) / c) + 1; gy += 1) {
      const tab = grille.get(`${gx}|${gy}`);
      if (tab) tab.forEach((i) => ensemble.add(i));
    }
  }
  return ensemble;
}

function conflitsAvec(grille, places, b, marge) {
  let total = 0;
  indicesProches(grille, b).forEach((j) => {
    if (chevauche(b, places[j], marge)) total += 1;
  });
  return total;
}

function compterPaires(boites, marge) {
  const grille = grilleVide();
  boites.forEach((b, i) => ajouterGrille(grille, b, i));
  let total = 0;
  boites.forEach((b, i) => {
    indicesProches(grille, b).forEach((j) => {
      if (j > i && chevauche(b, boites[j], marge)) total += 1;
    });
  });
  return total;
}

/* ---------- Quatre stratégies de placement ---------- */

function placerNaif(lieux) {
  return lieux.map((pt) => ({
    pt,
    boite: boiteCentree(pt.ax, pt.ay, largeurEtiquette(pt.nom)),
  }));
}

function placerGlouton(lieux, marge) {
  const places = [];
  const grille = grilleVide();
  const resultat = [];
  const ordre = lieux.slice().sort((a, b) => a.rang - b.rang);
  ordre.forEach((pt) => {
    const w = largeurEtiquette(pt.nom);
    let retenu = null;
    for (let k = 0; k < CANDIDATS.length; k += 1) {
      const ox = CANDIDATS[k][0];
      const oy = CANDIDATS[k][1];
      const cx = pt.ax + ox * (w / 2 + marge + 2);
      const cy = pt.ay + oy * (HAUTEUR / 2 + marge + 2);
      const b = boiteCentree(cx, cy, w);
      if (b.x < 2 || b.y < 2 || b.x + b.w > W - 2 || b.y + b.h > H - 2) continue;
      if (conflitsAvec(grille, places, b, marge) === 0) { retenu = b; break; }
    }
    if (!retenu) {
      const b = boiteCentree(pt.ax, pt.ay, w);
      b.conflit = true;
      retenu = b;
    }
    const idx = places.length;
    places.push(retenu);
    ajouterGrille(grille, retenu, idx);
    resultat.push({ pt, boite: retenu });
  });
  resultat.sort((a, b) => a.pt.i - b.pt.i);
  return resultat;
}

function placerRetrait(lieux, marge) {
  return placerGlouton(lieux, marge).filter((r) => !r.boite.conflit);
}

/* Relaxation : à chaque passe on sépare les boîtes qui se touchent du moins
 * recouvrement, puis on les rappelle faiblement vers leur ancre. Aucun tirage
 * aléatoire : tout dépend de l'itération et des positions initiales. */
function placerRelaxation(lieux, marge, iterations) {
  let boites = lieux.map((pt) => boiteCentree(pt.ax, pt.ay, largeurEtiquette(pt.nom)));
  for (let it = 0; it < iterations; it += 1) {
    const depl = boites.map(() => ({ dx: 0, dy: 0 }));
    const grille = grilleVide();
    boites.forEach((b, i) => ajouterGrille(grille, b, i));
    boites.forEach((b, i) => {
      indicesProches(grille, b).forEach((j) => {
        if (j <= i) return;
        const o = boites[j];
        if (!chevauche(b, o, marge)) return;
        const recX = Math.min(b.x + b.w, o.x + o.w) - Math.max(b.x, o.x) + marge;
        const recY = Math.min(b.y + b.h, o.y + o.h) - Math.max(b.y, o.y) + marge;
        if (recX < recY) {
          const dir = (b.x + b.w / 2) <= (o.x + o.w / 2) ? -1 : 1;
          const p = recX / 2 + 0.5;
          depl[i].dx += dir * p;
          depl[j].dx -= dir * p;
        } else {
          const dir = (b.y + b.h / 2) <= (o.y + o.h / 2) ? -1 : 1;
          const p = recY / 2 + 0.5;
          depl[i].dy += dir * p;
          depl[j].dy -= dir * p;
        }
      });
    });
    boites = boites.map((b, k) => {
      const cx = b.cx + depl[k].dx * 0.5 + (lieux[k].ax - b.cx) * 0.02;
      const cy = b.cy + depl[k].dy * 0.5 + (lieux[k].ay - b.cy) * 0.02;
      const bb = boiteCentree(cx, cy, b.w);
      bb.x = Math.max(2, Math.min(W - 2 - bb.w, bb.x));
      bb.y = Math.max(2, Math.min(H - 2 - bb.h, bb.y));
      bb.cx = bb.x + bb.w / 2;
      bb.cy = bb.y + bb.h / 2;
      return bb;
    });
  }
  return boites.map((b, k) => ({ pt: lieux[k], boite: b }));
}

function calculer(lieux, strategie, marge, iterations) {
  let rendu;
  if (strategie === 'naif') rendu = placerNaif(lieux);
  else if (strategie === 'glouton') rendu = placerGlouton(lieux, marge);
  else if (strategie === 'relaxation') rendu = placerRelaxation(lieux, marge, iterations);
  else rendu = placerRetrait(lieux, marge);

  const boites = rendu.map((r) => r.boite);
  const chevauchements = compterPaires(boites, marge);
  const paires = (lieux.length * (lieux.length - 1)) / 2;
  const taux = paires > 0 ? (chevauchements / paires) * 100 : 0;
  const poses = rendu.filter((r) => !r.boite.conflit).length;
  const couverture = lieux.length > 0 ? (poses / lieux.length) * 100 : 0;
  const deplacement = rendu.length > 0
    ? rendu.reduce((s, r) => s + Math.hypot(r.boite.cx - r.pt.ax, r.boite.cy - r.pt.ay), 0) / rendu.length
    : 0;
  return {
    rendu, chevauchements, taux, couverture, deplacement,
    visibles: poses, total: lieux.length,
  };
}

/* ---------- Feuille de style unique et préfixée ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:68ch}
#${PANEL_ID} .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${P}-limite{
  margin:8px 0;padding:8px 9px;border:1px dashed var(--line);border-radius:8px;
  background:rgba(230,185,111,.04);
}
#${P}-limite ol{margin:4px 0 0;padding-left:20px}
#${P}-limite li{margin:2px 0}
#${STRAT_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${STRAT_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix input{
  min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f);
}
#${PANEL_ID} .${P}-curseur{
  display:block;width:100%;min-height:36px;margin:2px 0 6px;accent-color:var(--gold,#e6b96f);
}
.${P}-valeur{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${CANVAS_ID}{
  display:block;width:100%;height:300px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${READOUT_ID}{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
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
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${P}-note{font-size:10px;color:var(--muted);margin:6px 0 0}
#${PANEL_ID}[data-${P}-reduced="1"] button{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{height:240px}
  #${PANEL_ID} .${P}-choix{margin-right:4px}
}
`;

/* ---------- Texte sémantique, lisible sans laboratoire ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une étiquette cartographique porte un nom près d’un repère. Quand deux étiquettes se recouvrent, la lecture devient ambiguë : « éviter le chevauchement » consiste à déplacer certaines étiquettes, à en masquer, ou à les relier à leur repère par une ligne de rappel. Le laboratoire compte les paires qui se touchent, jamais à l’œil.',
    'La détection de collision utilise des boîtes alignées sur les axes (AABB) : deux boîtes se touchent si leurs intervalles se chevauchent sur les deux axes, avec une marge de séparation réglable. Une grille régulière indexe les boîtes par cellule : on ne compare qu’un voisinage, pas toutes les paires.',
    'Quatre stratégies sont comparées : le placement naïf (tout centré, référence), le placement glouton (priorité au rang, neuf positions candidates), la relaxation (séparation itérative et retour élastique vers l’ancre) et le retrait (suppression des étiquettes en conflit). En mouvement réduit, l’animation s’arrête et l’état final est dessiné une seule fois.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = `${P}-fait`;
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticFormules() {
  const wrap = document.createElement('div');
  const formules = [
    'Collision AABB : deux boîtes a et b se touchent si, sur chaque axe, a.min − marge < b.max + marge et a.max + marge > b.min − marge. La marge est la même pour les quatre stratégies, donc la comparaison est équitable.',
    'Taux de chevauchement = paires en conflit / paires possibles × 100, avec paires possibles = n × (n − 1) / 2. La référence est 0 % : aucune paire ne se touche. Le placement naïf sert de points de comparaison.',
    'Couverture = étiquettes posées / étiquettes totales × 100. La référence est 100 % : tous les lieux sont nommés. Le retrait augmente la lisibilité au prix d’une couverture plus faible.',
    'Déplacement moyen = moyenne des distances entre le centre de l’étiquette et son ancre, en pixels logiques. La référence est 0 px (placement naïf). À chaque passe de relaxation, chaque boîte recule de la moitié du plus faible recouvrement et revient de 2 % vers son ancre.',
  ];
  formules.forEach((texte) => {
    const p = document.createElement('p');
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function celluleTexte(tag, texte, portee) {
  const n = document.createElement(tag);
  if (portee) n.scope = portee;
  n.textContent = texte;
  return n;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Comparaison des quatre stratégies aux réglages courants. Références : 0 % de chevauchement, 100 % de couverture, 0 px de déplacement. Toutes les valeurs sont recalculées par les mêmes fonctions que le canvas.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Stratégie', 'Paires en conflit', 'Taux (%)', 'Couverture (%)', 'Déplacement (px)'].forEach((h) => {
    hr.appendChild(celluleTexte('th', h, 'col'));
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  tbody.id = TABLE_BODY_ID;
  table.appendChild(tbody);
  return table;
}

function majTable() {
  const tbody = document.getElementById(TABLE_BODY_ID);
  if (!tbody) return;
  tbody.textContent = '';
  STRATEGIES.forEach((s) => {
    const c = calculer(S.lieux, s, S.marge, S.iterations);
    const tr = document.createElement('tr');
    tr.appendChild(celluleTexte('th', STRAT_COURT[s], 'row'));
    tr.appendChild(celluleTexte('td', String(c.chevauchements)));
    tr.appendChild(celluleTexte('td', fmt(c.taux)));
    tr.appendChild(celluleTexte('td', fmt(c.couverture)));
    tr.appendChild(celluleTexte('td', fmt(c.deplacement)));
    tbody.appendChild(tr);
  });
}

function staticLimite() {
  const box = document.createElement('div');
  box.id = `${P}-limite`;
  const h = document.createElement('h3');
  h.textContent = 'Limite falsifiable — défi en cinq temps';
  const p = document.createElement('p');
  p.textContent = 'Déplacer les étiquettes ne crée pas d’information : cela arbitrage entre lisibilité, couverture et fidélité de position. Voici comment tenter de faire échouer la lentille.';
  const ol = document.createElement('ol');
  const etapes = [
    'Prédiction : à la graine 82026 par défaut, le placement naïf a exactement 0 px de déplacement et 7 paires en conflit ; le retrait en affiche 0 mais ne nomme que 16 des 18 lieux.',
    'Réglage : fixer 18 repères, 8 px de marge, 24 itérations, parcourir les quatre stratégies, puis agrandir la marge jusqu’à 24 px.',
    'Résultat attendu : à 8 px le naïf compte 7 conflits et le retrait 0 ; à 24 px le naïf en compte 16 et la couverture du retrait descend à 66,7 % : élargir la marge rend le placement plus difficile, pas plus facile.',
    'Falsification : si le déplacement naïf n’est pas nul, si le retrait affiche un conflit, si un taux sort de [0 % ; 100 %], ou si le déplacement moyen du naïf dépasse celui du glouton, les formules ou le calcul de collision sont faux.',
    'Débrief : retenir qu’aucune stratégie n’est simultanément parfaite sur les trois grandeurs — l’angle mort est de croire qu’un algorithme de placement supprime le compromis entre nommer tous les lieux et garder chaque étiquette à sa place.',
  ];
  etapes.forEach((texte) => {
    const li = document.createElement('li');
    li.textContent = texte;
    ol.appendChild(li);
  });
  box.append(h, p, ol);
  return box;
}

/* ---------- Contrôles et construction du panneau ---------- */

function curseur(id, valeurId, libelle, min, max, step, valeur, format, aria) {
  const row = document.createElement('p');
  const label = document.createElement('label');
  label.setAttribute('for', id);
  label.appendChild(document.createTextNode(`${libelle} : `));
  const out = document.createElement('span');
  out.id = valeurId;
  out.className = `${P}-valeur`;
  out.textContent = format(valeur);
  label.appendChild(out);
  row.appendChild(label);

  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  input.className = `${P}-curseur`;
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
      radios: STRATEGIES.map((s) => document.getElementById(`${STRAT_ID}-${s}`)),
      n: document.getElementById(N_ID),
      nOut: document.getElementById(N_OUT_ID),
      marge: document.getElementById(MARGE_ID),
      margeOut: document.getElementById(MARGE_OUT_ID),
      iterations: document.getElementById(ITER_ID),
      iterationsOut: document.getElementById(ITER_OUT_ID),
      graine: document.getElementById(GRAINE_ID),
      graineBouton: document.getElementById(GRAINE_BOUTON_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      note: document.getElementById(NOTE_ID),
    };
  }

  const panel = ctx.el('section', `${P}-panel`);
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Évitement du chevauchement d’étiquettes');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Le laboratoire place des étiquettes sur des repères déterministes et compte les collisions. Faites varier la marge, le nombre de repères et la stratégie : les quatre grandeurs affichées sont recalculées par les mêmes fonctions que le dessin.');

  const fieldset = document.createElement('fieldset');
  fieldset.id = STRAT_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Stratégie de placement (choix unique)';
  fieldset.appendChild(legend);
  STRATEGIES.forEach((s) => {
    const lab = ctx.el('label', `${P}-choix`);
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `${P}-strategie-groupe`;
    radio.id = `${STRAT_ID}-${s}`;
    radio.value = s;
    radio.checked = S.strategie === s;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(STRAT_COURT[s]));
    fieldset.appendChild(lab);
  });

  const reglages = ctx.el('h3', '', 'Réglages déterministes');

  const nCtrl = curseur(N_ID, N_OUT_ID, 'Nombre de repères', 6, 24, 1, S.n,
    (v) => `${v}`, 'Nombre de repères, de 6 à 24');
  const margeCtrl = curseur(MARGE_ID, MARGE_OUT_ID, 'Marge de séparation', 0, 24, 2, S.marge,
    (v) => `${v} px`, 'Marge de séparation entre étiquettes, de 0 à 24 pixels');
  const iterCtrl = curseur(ITER_ID, ITER_OUT_ID, 'Passes de relaxation', 4, 60, 2, S.iterations,
    (v) => `${v}`, 'Nombre de passes de la relaxation, de 4 à 60');

  const graineP = document.createElement('p');
  const graineTexte = document.createElement('span');
  graineTexte.id = GRAINE_ID;
  graineTexte.className = `${P}-valeur`;
  graineTexte.textContent = String(S.graine);
  graineP.appendChild(document.createTextNode('Graine du générateur (affichée, jamais aléatoire) : '));
  graineP.appendChild(graineTexte);
  const graineBouton = ctx.el('button', '', 'Graine suivante');
  graineBouton.type = 'button';
  graineBouton.id = GRAINE_BOUTON_ID;
  graineBouton.setAttribute('aria-label', 'Incrémenter la graine déterministe d’une unité');
  graineP.appendChild(graineBouton);

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Placement des étiquettes sur les repères. Flèche gauche ou droite : nombre de repères ; flèche haut ou bas : marge ; touches 1 à 4 : naïf, glouton, relaxation ou retrait ; Entrée : lancer ou arrêter l’animation ; G : graine suivante.');

  const readout = ctx.el('p', `${P}-readout`);
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.playing ? '■ Arrêter' : '▶ Lancer l’animation');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');

  const note = ctx.el('p', `${P}-note`, 'Une seule boucle rAF, pause sur onglet masqué et hors écran ; en mouvement réduit, une seule image est dessinée sur l’état final.');
  note.id = NOTE_ID;

  panel.append(
    title, lead, staticFacts(), staticFormules(), staticTable(), staticLimite(),
    fieldset, reglages,
    nCtrl.row, nCtrl.input, margeCtrl.row, margeCtrl.input, iterCtrl.row, iterCtrl.input,
    graineP, canvas, readout, play, note,
  );

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: STRATEGIES.map((s) => document.getElementById(`${STRAT_ID}-${s}`)),
    n: nCtrl.input, nOut: nCtrl.out,
    marge: margeCtrl.input, margeOut: margeCtrl.out,
    iterations: iterCtrl.input, iterationsOut: iterCtrl.out,
    graine: graineTexte, graineBouton,
    canvas, readout, play, note,
  };
}

/* ---------- Rendu du laboratoire (un seul canvas, une seule passe) ---------- */

function renduAnime() {
  const c = S.calcul;
  if (!c) return [];
  if (S.strategie === 'naif') return c.rendu;
  if (S.strategie === 'relaxation') {
    const passes = Math.max(1, Math.round(S.progressionFinal() * S.iterations));
    return calculer(S.lieux, 'relaxation', S.marge, passes).rendu;
  }
  const k = Math.max(1, Math.ceil(S.progressionFinal() * S.lieux.length));
  return c.rendu.filter((r) => r.pt.rang < k);
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 420;
  const cssH = cv.clientHeight || 300;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const sx = cssW / W;
  const sy = cssH / H;
  const X = (v) => v * sx;
  const Y = (v) => v * sy;

  /* Graticule : repères non chromatiques (tirets). */
  g.strokeStyle = 'rgba(255,255,255,.14)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(X(PADX / 2), Y(PADY / 2), X(W - PADX), Y(H - PADY));
  g.strokeStyle = 'rgba(214,207,193,.16)';
  g.setLineDash([2, 5]);
  for (let k = 1; k < 4; k += 1) {
    const gy = Y(PADY + ((H - 2 * PADY) * k) / 4);
    g.beginPath(); g.moveTo(X(PADX / 2), gy); g.lineTo(X(W - PADX / 2), gy); g.stroke();
  }
  g.setLineDash([]);

  /* Ancres : croix pleines, distinctes des étiquettes. */
  S.lieux.forEach((pt) => {
    const x = X(pt.ax);
    const y = Y(pt.ay);
    g.strokeStyle = 'rgba(214,207,193,.7)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x - 3, y); g.lineTo(x + 3, y);
    g.moveTo(x, y - 3); g.lineTo(x, y + 3);
    g.stroke();
  });

  const rendu = renduAnime();
  rendu.forEach((r) => {
    const b = r.boite;
    const dist = Math.hypot(b.cx - r.pt.ax, b.cy - r.pt.ay);
    if (dist > 8) {
      /* Ligne de rappel en pointillés : l'information n'est pas portée par la couleur. */
      g.strokeStyle = b.conflit ? 'rgba(220,120,110,.85)' : 'rgba(230,185,111,.8)';
      g.setLineDash([3, 3]);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(X(r.pt.ax), Y(r.pt.ay));
      g.lineTo(X(b.cx), Y(b.cy));
      g.stroke();
      g.setLineDash([]);
    }
    const x = X(b.x);
    const y = Y(b.y);
    const w = Math.max(14, X(b.w));
    const h = Math.max(12, Y(b.h));
    g.fillStyle = b.conflit ? 'rgba(120,60,56,.78)' : 'rgba(12,18,26,.94)';
    g.fillRect(x, y, w, h);
    g.strokeStyle = b.conflit ? 'rgba(220,120,110,.9)' : 'rgba(244,214,158,.65)';
    g.lineWidth = 1;
    g.strokeRect(x, y, w, h);
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.font = '10px sans-serif';
    g.textBaseline = 'middle';
    g.fillText(r.pt.nom, x + 4, y + h / 2, Math.max(8, w - 8));
  });

  /* Bandeau d'état : valeurs lues directement, reprises dans la région live. */
  const c = S.calcul || { chevauchements: 0, taux: 0, couverture: 0, deplacement: 0 };
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.textBaseline = 'alphabetic';
  g.fillText(`${STRAT_LABELS[S.strategie].split(' — ')[0]} · ${S.n} repères · marge ${S.marge} px`, 8, 14);
  g.fillStyle = 'rgba(214,207,193,.92)';
  g.fillText(`Chevauchements ${c.chevauchements} · couverture ${fmt(c.couverture)} % · déplacement ${fmt(c.deplacement)} px`, 8, 28);
  g.fillText(`Graine ${S.graine} · références : 0 conflit, 100 % couverts, 0 px déplacé`, 8, 42);

  /* Barre de progression alimentée par l'unique horloge. */
  const barY = cssH - 12;
  g.strokeStyle = 'rgba(255,255,255,.22)';
  g.lineWidth = 1;
  g.strokeRect(8, barY, cssW - 16, 6);
  g.fillStyle = 'rgba(244,214,158,.55)';
  g.fillRect(9, barY + 1, (cssW - 18) * S.progressionFinal(), 4);
}

S.progressionFinal = function progressionFinal() {
  return reducedNow() ? 1 : Math.min(1, S.elapsed / CYCLE_MS);
};

function updateReadout() {
  const n = S.nodes.readout;
  const c = S.calcul;
  if (!n || !c) return;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.append(
    document.createTextNode(`${STRAT_COURT[S.strategie]} — `),
    fort(String(c.chevauchements)),
    document.createTextNode(` paires en conflit sur ${Math.round((S.n * (S.n - 1)) / 2)} possibles (référence 0) · couverture `),
    fort(`${fmt(c.couverture)} %`),
    document.createTextNode(' (référence 100 %) · déplacement moyen '),
    fort(`${fmt(c.deplacement)} px`),
    document.createTextNode(` (référence 0 px) · graine ${S.graine}.`),
  );
}

function updateNote() {
  const n = S.nodes.note;
  if (!n) return;
  n.textContent = reducedNow()
    ? 'Mouvement réduit actif : une seule image est dessinée sur l’état final, sans boucle rAF ni animation.'
    : 'Une seule boucle rAF, pause sur onglet masqué et hors écran ; le déplacement des étiquettes est recalculé à chaque passe.';
}

function syncControls() {
  const n = S.nodes;
  if (n.n) n.n.value = String(S.n);
  if (n.nOut) n.nOut.textContent = String(S.n);
  if (n.marge) n.marge.value = String(S.marge);
  if (n.margeOut) n.margeOut.textContent = `${S.marge} px`;
  if (n.iterations) n.iterations.value = String(S.iterations);
  if (n.iterationsOut) n.iterationsOut.textContent = String(S.iterations);
  if (n.graine) n.graine.textContent = String(S.graine);
  n.radios.forEach((r) => { if (r) r.checked = r.value === S.strategie; });
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter' : '▶ Lancer l’animation';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  if (n.panel) n.panel.dataset[`${P}Reduced`] = reducedNow() ? '1' : '0';
  majTable();
  updateReadout();
  updateNote();
  drawLab();
}

function regenerer() {
  S.lieux = genererLieux(S.n, S.graine);
  S.calcul = calculer(S.lieux, S.strategie, S.marge, S.iterations);
}

function recalculer() {
  S.calcul = calculer(S.lieux, S.strategie, S.marge, S.iterations);
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
  if (!S.inView || reducedNow()) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

/* Horloge unique : une seule fonction tick, un seul identifiant rafId. */
function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.inView || reducedNow()) return;
  if (S.lastTs) {
    /* Pas plafonné : un retour d'onglet ne provoque pas de saut. */
    const dt = Math.min(64, Math.max(0, ts - S.lastTs));
    S.elapsed = (S.elapsed + dt) % CYCLE_MS;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing) S.rafId = requestAnimationFrame(tick);
}

/* Source de vérité de la préférence de mouvement, fournie par la coque. */
function reducedNow() {
  if (typeof S.motionFn === 'function') {
    try { return !!S.motionFn(); } catch { return false; }
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  }
  return false;
}

function applyReduced() {
  if (reducedNow()) {
    stopLoop();
    S.playing = false;
    S.elapsed = CYCLE_MS;
  } else if (S.playing) {
    startLoop();
  }
  syncControls();
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
      const onChange = () => applyReduced();
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* Préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
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

register('E082', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  if (typeof ctx.reducedMotion === 'function') S.motionFn = ctx.reducedMotion;

  ctx.css(CSS_ID, CSS);

  S.nodes = ensurePanel(ctx);
  regenerer();

  if (reducedNow()) {
    stopLoop();
    S.playing = false;
    S.elapsed = CYCLE_MS;
  }

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        S.strategie = radio.value;
        recalculer();
        syncControls();
      });
    });
    n.n.addEventListener('input', () => {
      S.n = Math.max(6, Math.min(24, Math.round(Number(n.n.value))));
      regenerer();
      syncControls();
    });
    n.marge.addEventListener('input', () => {
      S.marge = Math.max(0, Math.min(24, Math.round(Number(n.marge.value) / 2) * 2));
      recalculer();
      syncControls();
    });
    n.iterations.addEventListener('input', () => {
      S.iterations = Math.max(4, Math.min(60, Math.round(Number(n.iterations.value) / 2) * 2));
      recalculer();
      syncControls();
    });
    const graineSuivante = () => {
      S.graine = (S.graine + 1) >>> 0;
      regenerer();
      syncControls();
    };
    n.graineBouton.addEventListener('click', graineSuivante);
    n.play.addEventListener('click', () => {
      if (reducedNow()) {
        S.playing = false;
        S.elapsed = CYCLE_MS;
        syncControls();
        return;
      }
      S.playing = !S.playing;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let utilise = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        S.n = Math.max(6, Math.min(24, S.n + (event.key === 'ArrowRight' ? 1 : -1)));
        regenerer();
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        S.marge = Math.max(0, Math.min(24, S.marge + (event.key === 'ArrowUp' ? 2 : -2)));
        recalculer();
      } else if (event.key >= '1' && event.key <= '4') {
        S.strategie = STRATEGIES[Number(event.key) - 1];
        recalculer();
      } else if (event.key === 'Enter' || event.key === ' ') {
        n.play.click();
      } else if (event.key === 'g' || event.key === 'G') {
        graineSuivante();
      } else {
        utilise = false;
      }
      if (utilise) {
        event.preventDefault();
        syncControls();
      }
    });
  }

  installGlobalListeners();
  if (S.playing && S.inView && !reducedNow()) startLoop();
});
