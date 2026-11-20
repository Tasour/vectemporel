import { register } from './registry.js';

/* Lentille E056 — vue GEOGRAPHIE.
 * Thème : tri des lieux — comment ordonner une liste de lieux, et à quel coût.
 *
 * Les dix chantiers E056-01 … E056-10 sont réellement implémentés ci-dessous et
 * décrits dans UNIFIED_AUDIT/GEOGRAPHIE/views/E056.md. Le sujet n'est pas un
 * nouveau jeu de lieux : la vue possède déjà une liste (#c3b-places) dont
 * l'ordre est celui du jeu de données. La lentille ajoute un panneau autonome
 * qui rend EXPLICITE le choix d'une clé de tri, du sens de tri et de
 * l'algorithme, et qui Montre le coût en comparaisons dans un laboratoire.
 *
 * Contrat : un seul appel à register pour l'identifiant 'E056', avec une
 * fonction (ctx) => { … } et ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 * Une seule feuille de style `geography-e056`, des identifiants préfixés
 * `geography-e056-*`, un seul attribut de simulation, zéro console, zéro réseau,
 * zéro source d'aléa, au plus une requête d'animation en vol (suspendue quand
 * le document est masqué ou le panneau hors écran). Tout le contenu
 * pédagogique est du texte DOM sémantique lisible sans animation : le canvas
 * ne détient aucune information exclusive.
 */

const CSS_ID = 'geography-e056';
const SECTION_ID = 'geography-e056-section';
const TITLE_ID = 'geography-e056-title';
const TABLE_ID = 'geography-e056-table';
const CRIT_ID = 'geography-e056-crit';
const ALGO_ID = 'geography-e056-algo';
const ORDRE_ID = 'geography-e056-ordre';
const LISTE_ID = 'geography-e056-liste';
const READOUT_ID = 'geography-e056-readout';
const CANVAS_ID = 'geography-e056-canvas';
const PLAY_ID = 'geography-e056-play';
const LEGENDE_ID = 'geography-e056-legende';
const LIMITE_ID = 'geography-e056-limite';
const RAPPORTS_ID = 'geography-e056-rapports';

const NARROW = '\u202f';
const MINUS = '\u2212';
const FRAME_MS = 70;

/* ---------- E056-05 : instantané déterministe de lieux réels ----------
 * Valeurs extraites de src/data/dataset.js (jeu de données local, généré le
 * 2026-11-18). Aucune coordonnée n'est inventée : seules des valeurs réelles
 * sont recopiées ici, en dur, pour garantir un laboratoire reproductible sans
 * requête réseau ni lecture du store. Les compteurs (fun, ev) sont ceux des
 * champs `functions` et `eventIds` du même jeu de données.
 */
const LIEUX = [
  { label: 'Paris', lat: 48.856578, lon: 2.351828, hier: 'national', fun: 4, ev: 9 },
  { label: 'Honolulu, Hawaï', lat: 21.30472222, lon: -157.85722222, hier: 'imperial', fun: 3, ev: 1 },
  { label: 'Windhoek', lat: -22.563056, lon: 17.078611, hier: 'transnational', fun: 3, ev: 1 },
  { label: 'Rome', lat: 41.888732, lon: 12.48657, hier: 'imperial', fun: 3, ev: 5 },
  { label: 'Londres', lat: 51.507222, lon: -0.1275, hier: 'national', fun: 4, ev: 8 },
  { label: 'Alger', lat: 36.776234, lon: 3.05997, hier: 'imperial', fun: 3, ev: 2 },
  { label: 'Kolkata (Calcutta)', lat: 22.5675, lon: 88.37, hier: 'imperial', fun: 3, ev: 2 },
  { label: 'Madrid', lat: 40.433333, lon: -3.683333, hier: 'national', fun: 6, ev: 4 },
  { label: 'Édimbourg', lat: 55.95477, lon: -3.2018, hier: 'national', fun: 4, ev: 2 },
  { label: 'Marseille', lat: 43.296346, lon: 5.369889, hier: 'regional', fun: 3, ev: 2 },
  { label: 'Lampedusa', lat: 35.51306, lon: 12.58722, hier: 'local', fun: 2, ev: 1 },
  { label: 'Le Bourget', lat: 48.9353, lon: 2.4256, hier: 'transnational', fun: 3, ev: 1 },
];

/* Ordre de hiérarchie : convention pédagogique explicite, pas un jugement de
   valeur. Elle est affichée dans le tableau et prise pour clé de tri. */
const RANGS_HIERARCHIE = { imperial: 0, national: 1, transnational: 2, regional: 3, local: 4 };
const NOMS_HIERARCHIE = {
  imperial: 'impérial', national: 'national', transnational: 'transnational',
  regional: 'régional', local: 'local',
};
const HIER_INCONNUE = 5;

/* Normalisation déterministe (indépendante des paramètres régionaux du
   navigateur) : on retire les diacritiques pour trier les noms à l'affiche. */
const SANS_ACCENT = (() => {
  const table = {
    à: 'a', â: 'a', ä: 'a', é: 'e', è: 'e', ê: 'e', ë: 'e',
    î: 'i', ï: 'i', ô: 'o', ö: 'o', ù: 'u', ü: 'u', û: 'u', ç: 'c', ñ: 'n',
  };
  return (texte) => String(texte).toLowerCase().replace(/[\u0300-\u036f]/g, '')
    .replace(/[àâäéèêëîïôöùüûçñ]/g, (ch) => table[ch] || ch);
})();

const alpha = (p) => SANS_ACCENT(p.label);
const rangAlpha = (() => {
  const ordre = LIEUX.map((p, i) => i).sort((a, b) => (
    alpha(LIEUX[a]) < alpha(LIEUX[b]) ? -1 : alpha(LIEUX[a]) > alpha(LIEUX[b]) ? 1 : a - b
  ));
  const rangs = new Array(LIEUX.length);
  ordre.forEach((index, rang) => { rangs[index] = rang; });
  return rangs;
})();
const MAX_FUN = Math.max(...LIEUX.map((p) => p.fun));
const MAX_EV = Math.max(...LIEUX.map((p) => p.ev));

/* E056-03 : les six clés de tri, avec une valeur normalisée pour la hauteur
   des barres du laboratoire (E056-07). */
const CRITERES = {
  alpha: {
    titre: 'Alphabétique (nom)', type: 'texte',
    cle: (p, i) => alpha(p), valeur: (p, i) => rangAlpha[i] / Math.max(1, LIEUX.length - 1),
    lire: (p) => p.label,
  },
  lat: {
    titre: 'Latitude', type: 'nombre',
    cle: (p) => p.lat, valeur: (p) => (p.lat + 90) / 180,
    lire: (p) => `${dec(p.lat, 3)}°`,
  },
  lon: {
    titre: 'Longitude', type: 'nombre',
    cle: (p) => p.lon, valeur: (p) => (p.lon + 180) / 360,
    lire: (p) => `${dec(p.lon, 3)}°`,
  },
  hier: {
    titre: 'Hiérarchie', type: 'catégorie',
    cle: (p) => (RANGS_HIERARCHIE[p.hier] === undefined ? HIER_INCONNUE : RANGS_HIERARCHIE[p.hier]),
    valeur: (p) => ((RANGS_HIERARCHIE[p.hier] === undefined ? HIER_INCONNUE : RANGS_HIERARCHIE[p.hier]) / HIER_INCONNUE),
    lire: (p) => NOMS_HIERARCHIE[p.hier] || p.hier,
  },
  fun: {
    titre: 'Nombre de fonctions', type: 'nombre',
    cle: (p) => p.fun, valeur: (p) => p.fun / MAX_FUN,
    lire: (p) => `${p.fun} fonction(s)`,
  },
  ev: {
    titre: "Nombre d'événements", type: 'nombre',
    cle: (p) => p.ev, valeur: (p) => p.ev / MAX_EV,
    lire: (p) => `${p.ev} événement(s)`,
  },
};
const ORDRE_CRIT = ['alpha', 'lat', 'lon', 'hier', 'fun', 'ev'];

/* E056-06 : les trois algorithmes, tous déterministes (pivot médian pour le
   rapide, jamais de tirage au sort). Chacun renvoie l'ordre final, le nombre
   de comparaisons et une trace d'étapes pour le laboratoire. */
const ALGOS = {
  insertion: 'Insertion — stable, comparaisons comptées',
  fusion: 'Fusion — stable, récursive',
  rapide: 'Rapide — pivot médian, non stable',
};
const ORDRE_ALGO = ['insertion', 'fusion', 'rapide'];

let RAF_ID = 0;
let INSTALLE = false;
let IO = null;
let IO_CANVAS = null;

const S = {
  critere: 'alpha',
  algo: 'insertion',
  ascend: true,
  playing: false,
  pos: 0,
  last: 0,
  visible: true,
  reduced: false,
  rendus: 0,
  resultat: null,
  derniereEtape: -1,
  nodes: {},
};

/* ---------- Formatage déterministe, sans Intl ni aléa ---------- */

function dec(valeur, digits) {
  if (typeof valeur !== 'number' || !Number.isFinite(valeur)) return '—';
  const fixe = Math.abs(valeur).toFixed(digits).split('.');
  const groupe = fixe[0].replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
  return `${valeur < 0 ? MINUS : ''}${groupe}${fixe[1] ? `,${fixe[1]}` : ''}`;
}
function entier(valeur) {
  return String(Math.round(valeur)).replace(/\B(?=(\d{3})+(?!\d))/g, NARROW);
}

/* Comparateur à ordre total : la clé choisie d'abord, le nom en départage
   (toujours croissant) pour garantir un résultat reproductible même à égalité. */
function plusPetit(a, b, ascend) {
  const crit = CRITERES[S.critere];
  const ka = crit.cle(LIEUX[a], a);
  const kb = crit.cle(LIEUX[b], b);
  let d = ka < kb ? -1 : ka > kb ? 1 : 0;
  if (!ascend) d = -d;
  if (d === 0) {
    const aa = alpha(LIEUX[a]);
    const ab = alpha(LIEUX[b]);
    d = aa < ab ? -1 : aa > ab ? 1 : a - b;
  }
  return d < 0;
}

function trierInsertion(ascend) {
  const a = LIEUX.map((p, i) => i);
  const etapes = [];
  let comparaisons = 0;
  for (let i = 1; i < a.length; i += 1) {
    const valeur = a[i];
    let j = i - 1;
    while (j >= 0) {
      comparaisons += 1;
      etapes.push({ ordre: a.slice(), a: j, b: j + 1, comparaisons });
      if (plusPetit(valeur, a[j], ascend)) { a[j + 1] = a[j]; j -= 1; } else break;
    }
    a[j + 1] = valeur;
  }
  return fin(a, comparaisons, etapes);
}

function trierFusion(ascend) {
  const a = LIEUX.map((p, i) => i);
  const etapes = [];
  let comparaisons = 0;
  const fusionner = (lo, mid, hi) => {
    const gauche = a.slice(lo, mid);
    const droite = a.slice(mid, hi);
    let i = 0; let j = 0; let k = lo;
    while (i < gauche.length && j < droite.length) {
      comparaisons += 1;
      etapes.push({ ordre: a.slice(), a: lo + i, b: mid + j, comparaisons });
      if (plusPetit(gauche[i], droite[j], ascend)) a[k++] = gauche[i++];
      else a[k++] = droite[j++];
    }
    while (i < gauche.length) a[k++] = gauche[i++];
    while (j < droite.length) a[k++] = droite[j++];
  };
  const trier = (lo, hi) => {
    if (hi - lo < 2) return;
    const mid = (lo + hi) >> 1;
    trier(lo, mid);
    trier(mid, hi);
    fusionner(lo, mid, hi);
  };
  trier(0, a.length);
  return fin(a, comparaisons, etapes);
}

function trierRapide(ascend) {
  const a = LIEUX.map((p, i) => i);
  const etapes = [];
  let comparaisons = 0;
  const partitionner = (lo, hi) => {
    const pivotIndex = (lo + hi) >> 1;
    const pivot = a[pivotIndex];
    a[pivotIndex] = a[hi];
    a[hi] = pivot;
    let i = lo;
    for (let j = lo; j < hi; j += 1) {
      comparaisons += 1;
      etapes.push({ ordre: a.slice(), a: j, b: hi, comparaisons });
      if (plusPetit(a[j], pivot, ascend)) {
        const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
        i += 1;
      }
    }
    const tmp = a[i]; a[i] = a[hi]; a[hi] = tmp;
    return i;
  };
  const trier = (lo, hi) => {
    if (lo >= hi) return;
    const p = partitionner(lo, hi);
    trier(lo, p - 1);
    trier(p + 1, hi);
  };
  trier(0, a.length - 1);
  return fin(a, comparaisons, etapes);
}

/* Certain qu'aucune étape intermédiaire n'est perdue : `fin` reçoit la trace
   complète et la prolonge d'une étape finale sans curseur. */
function fin(ordre, comparaisons, etapes) {
  etapes.push({ ordre: ordre.slice(), a: -1, b: -1, comparaisons });
  return { ordre: ordre.slice(), comparaisons, etapes };
}

function recomputer() {
  if (S.algo === 'fusion') S.resultat = trierFusion(S.ascend);
  else if (S.algo === 'rapide') S.resultat = trierRapide(S.ascend);
  else S.resultat = trierInsertion(S.ascend);
  S.pos = 0;
}

/* ---------- Feuille de style unique, cadrée sur la vue ---------- */

const RULES = `
.geo-layout[data-geography-e056="on"] .geography-e056-section {
  margin:12px 0 6px;padding:10px 12px;border:1px solid var(--line);
  border-left:3px solid var(--gold);border-radius:8px;
  background:rgba(255,255,255,.02);color:var(--muted);font-size:11px;line-height:1.6;
}
.geo-layout[data-geography-e056="on"] .geography-e056-section h2 {
  margin:0 0 8px;color:var(--gold-bright);font-size:12px;font-weight:600;
}
.geo-layout[data-geography-e056="on"] .geography-e056-section h3 {
  margin:12px 0 5px;color:var(--ink);font-size:10px;font-weight:600;
}
.geo-layout[data-geography-e056="on"] .geography-e056-p {
  margin:0 0 7px;max-width:68ch;overflow-wrap:anywhere;
}
.geo-layout[data-geography-e056="on"] .geography-e056-p strong { color:var(--gold-bright); }
.geo-layout[data-geography-e056="on"] .geography-e056-fait {
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold);
}
.geo-layout[data-geography-e056="on"] .geography-e056-table {
  width:100%;border-collapse:collapse;margin:6px 0 10px;font-size:10px;font-variant-numeric:tabular-nums;
}
.geo-layout[data-geography-e056="on"] .geography-e056-table caption {
  text-align:left;margin-bottom:4px;color:var(--muted-2,var(--muted));
}
.geo-layout[data-geography-e056="on"] .geography-e056-table th,
.geo-layout[data-geography-e056="on"] .geography-e056-table td {
  border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;
}
.geo-layout[data-geography-e056="on"] .geography-e056-table th { color:var(--gold-bright);font-weight:600; }
.geo-layout[data-geography-e056="on"] fieldset.geography-e056-group {
  margin:8px 0;padding:6px 8px;border:1px solid var(--line);border-radius:8px;
}
.geo-layout[data-geography-e056="on"] fieldset.geography-e056-group legend { padding:0 4px;color:var(--muted); }
.geo-layout[data-geography-e056="on"] .geography-e056-choix {
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;padding:2px 6px;cursor:pointer;
}
.geo-layout[data-geography-e056="on"] .geography-e056-choix input {
  min-width:18px;min-height:18px;accent-color:var(--gold);
}
.geo-layout[data-geography-e056="on"] .geography-e056-btn {
  min-height:44px;min-width:44px;margin:6px 6px 0 0;padding:6px 10px;
  border:1px solid var(--line);border-radius:8px;background:transparent;
  color:var(--gold-bright);font:inherit;font-size:10px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
.geo-layout[data-geography-e056="on"] .geography-e056-btn:hover { border-color:var(--gold);background:rgba(230,185,111,.10); }
.geo-layout[data-geography-e056="on"] .geography-e056-btn[aria-pressed="true"] {
  border-color:var(--gold-bright);background:rgba(230,185,111,.14);
}
.geo-layout[data-geography-e056="on"] .geography-e056-section :focus-visible {
  outline:2px solid var(--gold-bright);outline-offset:2px;
}
.geo-layout[data-geography-e056="on"] .geography-e056-readout {
  min-height:34px;margin:8px 0;padding:7px 9px;border:1px dashed var(--line);
  border-radius:7px;color:var(--gold-bright);font-variant-numeric:tabular-nums;overflow-wrap:anywhere;
}
.geo-layout[data-geography-e056="on"] .geography-e056-figure { margin:8px 0;text-align:center; }
.geo-layout[data-geography-e056="on"] .geography-e056-canvas {
  display:block;width:100%;max-width:340px;height:auto;aspect-ratio:3 / 2;
  margin:0 auto;border:1px solid var(--line);border-radius:8px;
  background:rgba(0,0,0,.28);touch-action:none;
}
.geo-layout[data-geography-e056="on"] .geography-e056-caption {
  margin-top:5px;font-size:10px;color:var(--muted);
}
.geo-layout[data-geography-e056="on"] .geography-e056-liste {
  margin:5px 0 8px;padding-left:22px;max-width:68ch;
}
.geo-layout[data-geography-e056="on"] .geography-e056-liste li { margin:0 0 3px; }
.geo-layout[data-geography-e056="on"] .geography-e056-liste .geography-e056-cle { color:var(--gold-bright); }
.geo-layout[data-geography-e056="on"] .geography-e056-rapport {
  margin:6px 0;padding-left:9px;border-left:2px solid var(--line);
}
@media (max-width:620px) {
  .geo-layout[data-geography-e056="on"] .geography-e056-section { padding:9px 10px;font-size:10px; }
  .geo-layout[data-geography-e056="on"] .geography-e056-choix { margin-right:4px; }
  .geo-layout[data-geography-e056="on"] .geography-e056-canvas { max-width:280px; }
}
@media (prefers-reduced-motion:reduce) {
  .geo-layout[data-geography-e056="on"] .geography-e056-section * {
    transition:none!important;animation:none!important;
  }
}
`;

/* ---------- E056-01 : amorce textuelle, lisible sans aucune interaction ---------- */

function ajouterIntro(ctx, section) {
  const titre = ctx.el('h2', '', 'Trier les lieux : la question de l’ordre');
  titre.id = TITLE_ID;
  const lede = ctx.el('p', 'geography-e056-p',
    'La liste de lieux de la vue suit l’ordre du jeu de données. La changer n’ajoute ' +
    'ni n’enlève aucun lieu : cela choisit une clé, un sens et un algorithme. ' +
    'Ce panneau rend ce choix explicite et compte le coût du tri en comparaisons.');
  const faits = [
    'Une clé de tri est la grandeur qui décide de la position : un texte (le nom), un nombre (la latitude) ou une catégorie (la hiérarchie).',
    'Un tri est stable quand deux lieux de même clé gardent leur ordre d’origine ; l’insertion et la fusion le sont, le rapide ne l’est pas.',
    'Le coût d’un tri se mesure en nombre de comparaisons de clés : l’insertion peut atteindre n(n−1)/2, un tri en n log₂ n fait bien moins de comparaisons en moyenne.',
  ];
  section.appendChild(titre);
  section.appendChild(lede);
  faits.forEach((texte) => {
    const p = ctx.el('p', 'geography-e056-p geography-e056-fait', texte);
    p.id = `geography-e056-fait-${faits.indexOf(texte) + 1}`;
    section.appendChild(p);
  });
}

/* ---------- E056-02 : tableau statique des clés de tri ---------- */

function tableauCriteres(ctx) {
  const table = ctx.el('table', 'geography-e056-table');
  table.id = TABLE_ID;
  const caption = ctx.el('caption', '',
    `Six clés possibles, appliquées à un instantané de ${LIEUX.length} lieux réels du jeu de données local. Exemples calculés depuis ces valeurs.`);
  table.appendChild(caption);
  const thead = ctx.el('thead');
  const hr = ctx.el('tr');
  ['Clé', 'Type', 'Exemple', 'Rang de hiérarchie'].forEach((titre) => {
    const th = ctx.el('th', '', titre);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = ctx.el('tbody');
  const exemples = {
    alpha: LIEUX[0].label, lat: `${dec(LIEUX[0].lat, 3)}°`, lon: `${dec(LIEUX[0].lon, 3)}°`,
    hier: NOMS_HIERARCHIE[LIEUX[0].hier], fun: String(LIEUX[0].fun), ev: String(LIEUX[0].ev),
  };
  const rangs = 'impérial 0 · national 1 · transnational 2 · régional 3 · local 4';
  ORDRE_CRIT.forEach((cle, i) => {
    const tr = ctx.el('tr');
    const cells = [
      CRITERES[cle].titre, CRITERES[cle].type, exemples[cle], i === 3 ? rangs : '—',
    ];
    cells.forEach((texte, j) => {
      const cellule = ctx.el(j === 0 ? 'th' : 'td', '', texte);
      if (j === 0) cellule.scope = 'row';
      tr.appendChild(cellule);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- E056-03 : choix unique de la clé, par radios natifs ---------- */

function fieldsetCrites(ctx, nodes) {
  const fs = ctx.el('fieldset', 'geography-e056-group');
  fs.id = CRIT_ID;
  fs.appendChild(ctx.el('legend', '', 'Clé de tri (choix unique)'));
  nodes.radiosCrit = {};
  ORDRE_CRIT.forEach((cle) => {
    const label = ctx.el('label', 'geography-e056-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e056-crit';
    radio.id = `geography-e056-crit-${cle}`;
    radio.value = cle;
    radio.checked = S.critere === cle;
    label.appendChild(radio);
    label.appendChild(document.createTextNode(CRITERES[cle].titre));
    fs.appendChild(label);
    nodes.radiosCrit[cle] = radio;
  });
  return fs;
}

/* ---------- E056-06 : choix unique de l'algorithme ---------- */

function fieldsetAlgos(ctx, nodes) {
  const fs = ctx.el('fieldset', 'geography-e056-group');
  fs.id = ALGO_ID;
  fs.appendChild(ctx.el('legend', '', 'Algorithme de tri (choix unique)'));
  nodes.radiosAlgo = {};
  ORDRE_ALGO.forEach((algo) => {
    const label = ctx.el('label', 'geography-e056-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e056-algo';
    radio.id = `geography-e056-algo-${algo}`;
    radio.value = algo;
    radio.checked = S.algo === algo;
    label.appendChild(radio);
    label.appendChild(document.createTextNode(ALGOS[algo]));
    fs.appendChild(label);
    nodes.radiosAlgo[algo] = radio;
  });
  return fs;
}

/* ---------- E056-09 : liste sémantique ordonnée, jamais la seule couleur ---------- */

function rendreListe() {
  const liste = S.nodes.liste;
  if (!liste || !S.resultat) return;
  const crit = CRITERES[S.critere];
  liste.textContent = '';
  S.resultat.ordre.forEach((index, rang) => {
    const place = LIEUX[index];
    const li = ligneListe(rang + 1, place.label, crit.lire(place));
    liste.appendChild(li);
  });
}

/* Crée un <li> avec le rang et le nom en texte, puis un <span> distinct pour
   la valeur de clé : le chiffre reste lisible même sans style. */
function ligneListe(rang, nom, valeurCle) {
  const noeud = document.createElement('li');
  const point = document.createElement('span');
  point.textContent = `${rang}. ${nom} — `;
  noeud.appendChild(point);
  const valeur = document.createElement('span');
  valeur.className = 'geography-e056-cle';
  valeur.textContent = valeurCle;
  noeud.appendChild(valeur);
  noeud.appendChild(document.createTextNode('.'));
  return noeud;
}

/* ---------- E056-07 : laboratoire canvas, une seule figure ---------- */

function etapeCourante() {
  if (!S.resultat) return null;
  const etapes = S.resultat.etapes;
  if (!etapes.length) return null;
  const pos = Math.max(0, Math.min(etapes.length - 1, Math.floor(S.pos)));
  return etapes[pos];
}

function dessiner() {
  const canvas = S.nodes.canvas;
  if (!canvas || typeof canvas.getContext !== 'function' || !S.resultat) return;
  const g = canvas.getContext('2d');
  if (!g) return;
  const etape = etapeCourante();
  if (!etape) return;
  const cssW = canvas.clientWidth || 320;
  const cssH = canvas.clientHeight || 214;
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const pxW = Math.max(1, Math.round(cssW * dpr));
  const pxH = Math.max(1, Math.round(cssH * dpr));
  if (canvas.width !== pxW || canvas.height !== pxH) { canvas.width = pxW; canvas.height = pxH; }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const crit = CRITERES[S.critere];
  const pad = 10;
  const haut = cssH - pad * 2 - 16;
  const largeur = cssW - pad * 2;
  const n = LIEUX.length;
  const pas = largeur / n;
  const bw = Math.max(3, pas * 0.62);

  /* Ligne de référence : la hauteur nulle est toujours visible. */
  g.strokeStyle = 'rgba(255,255,255,.22)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(pad, cssH - pad - 16);
  g.lineTo(cssW - pad, cssH - pad - 16);
  g.stroke();

  etape.ordre.forEach((index, position) => {
    const h = Math.max(6, crit.valeur(LIEUX[index], index) * haut);
    const x = pad + position * pas + (pas - bw) / 2;
    const y = cssH - pad - 16 - h;
    const actifA = etape.a === position;
    const actifB = etape.b === position;
    const fini = etape.a === -1;

    /* Forme et épaisseur du trait, pas la couleur seule, pour distinguer
       les deux barres comparées des autres. */
    g.fillStyle = actifA || actifB
      ? 'rgba(244,214,158,.92)'
      : (fini ? 'rgba(214,207,193,.78)' : 'rgba(154,160,168,.62)');
    g.fillRect(x, y, bw, h);
    g.strokeStyle = actifA || actifB ? 'rgba(244,214,158,1)' : 'rgba(255,255,255,.35)';
    g.lineWidth = actifA || actifB ? 2 : 1;
    g.strokeRect(x + 0.5, y + 0.5, bw - 1, h - 1);

    if (actifA || actifB) {
      const marque = actifA ? 'A' : 'B';
      g.fillStyle = 'rgba(244,214,158,1)';
      g.font = 'bold 10px sans-serif';
      g.fillText(marque, x + bw / 2 - 3, Math.max(10, y - 4));
      g.beginPath();
      g.moveTo(x + bw / 2, y - 2);
      g.lineTo(x + bw / 2 - 3, y + 2);
      g.lineTo(x + bw / 2 + 3, y + 2);
      g.closePath();
      g.fill();
    }

    g.fillStyle = 'rgba(214,207,193,.85)';
    g.font = '9px sans-serif';
    const code = SANS_ACCENT(LIEUX[index].label).slice(0, 2).toUpperCase();
    g.fillText(code, x + bw / 2 - 4, cssH - pad - 3);
  });

  const titreCourt = `${crit.titre} · ${S.ascend ? 'croissant' : 'décroissant'} · ${ALGOS[S.algo].split(' — ')[0]}`;
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText(titreCourt, pad + 2, pad + 10);
  g.fillStyle = 'rgba(214,207,193,.85)';
  g.fillText(`${entier(S.resultat.comparaisons)} comparaisons`, pad + 2, pad + 23);
}

/* ---------- E056-08 : région live unique, valeurs référencées ---------- */

function ecrireReadout(forcer) {
  const noeud = S.nodes.readout;
  if (!noeud || !S.resultat) return;
  const n = LIEUX.length;
  const pire = (n * (n - 1)) / 2;
  const reference = n * Math.log2(n);
  const ratio = reference > 0 ? S.resultat.comparaisons / reference : 0;
  const etapes = S.resultat.etapes.length;
  const etape = Math.min(etapes, Math.max(1, Math.floor(S.pos) + 1));
  /* Une région live n'est pas réécrite à chaque image : on n'annonce que
     les changements d'étape, sauf resynchronisation explicite. */
  if (!forcer && etape === S.derniereEtape) return;
  S.derniereEtape = etape;
  const premier = S.resultat.ordre.slice(0, 3).map((i) => LIEUX[i].label).join(' · ');
  noeud.textContent =
    `Tri « ${CRITERES[S.critere].titre} » (${S.ascend ? 'croissant' : 'décroissant'}) par ${ALGOS[S.algo].split(' — ')[0]} : ` +
    `${n} lieux, ${entier(S.resultat.comparaisons)} comparaisons. ` +
    `Référence : au plus ${entier(pire)} comparaisons pour l’insertion (n(n−1)/2), ` +
    `et ${dec(reference, 1)} pour un tri en n log₂ n (rapport ${dec(ratio, 2)}). ` +
    `Étape ${etape} / ${entier(etapes)}. Début de l’ordre : ${premier}…`;
}

/* ---------- E056-10 : une seule boucle rAF, pause hors écran ---------- */

function stopLoop() {
  if (RAF_ID) { cancelAnimationFrame(RAF_ID); RAF_ID = 0; }
  S.last = 0;
}

function startLoop() {
  if (RAF_ID || !S.playing || S.reduced || !S.visible) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (typeof requestAnimationFrame !== 'function') return;
  S.last = 0;
  RAF_ID = requestAnimationFrame(tick);
}

function tick(ts) {
  RAF_ID = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.playing || S.reduced || !S.visible || !S.resultat) return;
  if (S.last) {
    const dt = Math.min(80, ts - S.last);
    const etapes = S.resultat.etapes.length;
    S.pos = (S.pos + dt / FRAME_MS) % etapes;
  }
  S.last = ts;
  dessiner();
  ecrireReadout();
  RAF_ID = requestAnimationFrame(tick);
}

function assurerObservateur(canvas) {
  if (typeof IntersectionObserver !== 'function') { S.visible = true; return; }
  if (IO && IO_CANVAS === canvas) return;
  if (IO) IO.disconnect();
  IO = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    S.visible = entry ? entry.isIntersecting : true;
    if (!S.visible) stopLoop();
    else if (S.playing) startLoop();
  }, { threshold: 0.01 });
  IO.observe(canvas);
  IO_CANVAS = canvas;
}

function installGlobal() {
  if (INSTALLE || typeof document === 'undefined') return;
  INSTALLE = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopLoop();
    else if (S.playing) startLoop();
  });
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = mq.matches;
        if (S.reduced) {
          S.playing = false;
          stopLoop();
          if (S.nodes.play) S.nodes.play.textContent = '▶ Parcourir les étapes';
        }
        const panneau = document.getElementById(SECTION_ID);
        if (panneau) panneau.dataset.geographyE056Reduced = S.reduced ? '1' : '0';
        if (S.resultat) { S.pos = S.resultat.etapes.length - 1; dessiner(); ecrireReadout(true); }
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- Construction du panneau (texte sémantique réel) ---------- */

function construirePanneau(ctx) {
  const existant = document.getElementById(SECTION_ID);
  if (existant && existant.isConnected) {
    return {
      section: existant,
      frais: false,
      radiosCrit: {
        alpha: document.getElementById('geography-e056-crit-alpha'),
        lat: document.getElementById('geography-e056-crit-lat'),
        lon: document.getElementById('geography-e056-crit-lon'),
        hier: document.getElementById('geography-e056-crit-hier'),
        fun: document.getElementById('geography-e056-crit-fun'),
        ev: document.getElementById('geography-e056-crit-ev'),
      },
      radiosAlgo: {
        insertion: document.getElementById('geography-e056-algo-insertion'),
        fusion: document.getElementById('geography-e056-algo-fusion'),
        rapide: document.getElementById('geography-e056-algo-rapide'),
      },
      ordre: document.getElementById(ORDRE_ID),
      liste: document.getElementById(LISTE_ID),
      readout: document.getElementById(READOUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      play: document.getElementById(PLAY_ID),
      rapports: document.getElementById(RAPPORTS_ID),
    };
  }

  const nodes = {};
  const section = ctx.el('section', 'geography-e056-section');
  section.id = SECTION_ID;
  section.setAttribute('aria-labelledby', TITLE_ID);
  section.setAttribute('data-sim', 'tri-des-lieux');

  ajouterIntro(ctx, section);
  section.appendChild(tableauCriteres(ctx));
  section.appendChild(fieldsetCrites(ctx, nodes));
  section.appendChild(fieldsetAlgos(ctx, nodes));

  const h3 = ctx.el('h3', '', 'Résultat du tri, en toutes lettres');
  section.appendChild(h3);
  const liste = ctx.el('ol', 'geography-e056-liste');
  liste.id = LISTE_ID;
  liste.setAttribute('aria-label', 'Lieux ordonnés selon la clé et l’algorithme choisis');
  section.appendChild(liste);
  nodes.liste = liste;

  const readout = ctx.el('p', 'geography-e056-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  section.appendChild(readout);
  nodes.readout = readout;

  /* E056-09 : légende en glyphes, lisible en niveaux de gris. */
  const legende = ctx.el('p', 'geography-e056-p',
    'E056-09 · Repères : A ▲ barre comparée en premier · B ▼ barre comparée en second · ' +
    'trait épais = barre en cours de comparaison · barre claire = ordre final. ' +
    'Le nom complet de chaque lieu est écrit dans la liste ci-dessus : la couleur ne porte aucune information exclusive.');
  legende.id = LEGENDE_ID;
  section.appendChild(legende);

  const figure = ctx.el('figure', 'geography-e056-figure');
  const canvas = ctx.el('canvas', 'geography-e056-canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Laboratoire de tri : douze barres, une par lieu, dont la hauteur code la clé choisie. ' +
    'Flèches gauche et droite : étape précédente ou suivante ; Début et Fin : première et dernière étape ; ' +
    'Entrée : lancer ou arrêter le parcours.');
  canvas.setAttribute('aria-describedby', LEGENDE_ID);
  const caption = ctx.el('figcaption', 'geography-e056-caption',
    'Maquette déterministe : la hauteur des barres code la clé de tri, pas une mesure de terrain. ' +
    'Les comparaisons, l’étape courante et l’ordre complet sont écrits en texte.');
  figure.append(canvas, caption);
  section.appendChild(figure);
  nodes.canvas = canvas;

  /* E056-04 : bascule indépendante du sens de tri — aria-pressed légitime. */
  const ordre = ctx.el('button', 'geography-e056-btn', S.ascend ? '↕ Ordre : croissant' : '↕ Ordre : décroissant');
  ordre.type = 'button';
  ordre.id = ORDRE_ID;
  ordre.setAttribute('aria-pressed', S.ascend ? 'false' : 'true');
  ordre.setAttribute('aria-label', 'Inverser le sens du tri (croissant ou décroissant)');
  section.appendChild(ordre);
  nodes.ordre = ordre;

  const play = ctx.el('button', 'geography-e056-btn', '▶ Parcourir les étapes');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-controls', `${READOUT_ID} ${CANVAS_ID}`);
  section.appendChild(play);
  nodes.play = play;

  /* E056-08 (suite) : rapports chiffrés redondés en texte. */
  const rapports = ctx.el('ul', 'geography-e056-rapport');
  rapports.id = RAPPORTS_ID;
  section.appendChild(rapports);
  nodes.rapports = rapports;

  /* E056-10 : limite falsifiable en cinq temps, alignée sur les angles morts. */
  const limite = ctx.el('p', 'geography-e056-p',
    'E056-10 · Limite et vérification : 1) prédire que le passage du tri par insertion au tri fusion ' +
    'réduit le nombre de comparaisons ; 2) régler la clé « Latitude » en ordre décroissant ; ' +
    '3) lire le nombre annoncé dans le statut ; 4) falsifier si ce nombre diffère de celui que ' +
    'compte l’algorithme ou si l’ordre ne correspond pas à la clé ; 5) débrief : l’instantané contient ' +
    `${LIEUX.length} lieux et non les ${LIEUX.length} premiers de la vue, la convention de hiérarchie ` +
    'est arbitraire et affichée, le rapide n’est pas stable, et le laboratoire modélise le coût en ' +
    'comparaisons, pas le temps réel d’exécution.');
  limite.id = LIMITE_ID;
  section.appendChild(limite);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(section, aside.firstChild);

  section.dataset.geographyE056Reduced = S.reduced ? '1' : '0';
  return { section, frais: true, ...nodes };
}

function ecrireRapports() {
  const noeud = S.nodes.rapports;
  if (!noeud || !S.resultat) return;
  const n = LIEUX.length;
  const pire = (n * (n - 1)) / 2;
  const reference = n * Math.log2(n);
  const lignes = [
    `Jeu de référence : ${n} lieux réels du jeu de données local, coordonnées recopiées sans invention.`,
    `Comparaison maximale de l’insertion : ${entier(pire)} = ${n} × ${n - 1} / 2 ; c’est la borne haute affichée.`,
    `Référence n log₂ n : ${dec(reference, 1)} comparaisons ; le tri choisi en fait ${entier(S.resultat.comparaisons)}, soit ${dec(S.resultat.comparaisons / reference, 2)} fois cette référence.`,
    `Stabilité : insertion et fusion conservent l’ordre d’origine à clé égale ; le rapide utilise un pivot médian déterministe et peut déplacer des lieux équivalents.`,
  ];
  noeud.textContent = '';
  lignes.forEach((texte, i) => {
    const li = document.createElement('li');
    li.id = `geography-e056-rapport-${i}`;
    li.textContent = texte;
    noeud.appendChild(li);
  });
}

function synchroniser() {
  const n = S.nodes;
  if (!n.radiosCrit) return;
  ORDRE_CRIT.forEach((cle) => { if (n.radiosCrit[cle]) n.radiosCrit[cle].checked = S.critere === cle; });
  ORDRE_ALGO.forEach((algo) => { if (n.radiosAlgo[algo]) n.radiosAlgo[algo].checked = S.algo === algo; });
  if (n.ordre) {
    n.ordre.textContent = S.ascend ? '↕ Ordre : croissant' : '↕ Ordre : décroissant';
    n.ordre.setAttribute('aria-pressed', S.ascend ? 'false' : 'true');
  }
  if (n.play) n.play.textContent = S.playing ? '■ Arrêter le parcours' : '▶ Parcourir les étapes';
  rendreListe();
  ecrireRapports();
  dessiner();
  ecrireReadout(true);
  const host = ctxLayout();
  if (host) {
    host.dataset.geographyE056Critere = S.critere;
    host.dataset.geographyE056Algo = S.algo;
    host.dataset.geographyE056Ordre = S.ascend ? 'croissant' : 'decroissant';
    host.dataset.geographyE056Comparaisons = String(S.resultat ? S.resultat.comparaisons : 0);
    host.dataset.geographyE056Etape = String(Math.floor(S.pos) + 1);
    host.dataset.geographyE056Rendus = String(S.rendus);
  }
}

function ctxLayout() {
  const section = document.getElementById(SECTION_ID);
  return section ? section.closest('.geo-layout') || section.parentNode : null;
}

/* ---------- Point d'entrée ---------- */

register('E056', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, RULES);

  S.rendus += 1;
  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  if (S.reduced) S.playing = false;

  const layout = ctx.layout || ctx.stage;
  if (layout && layout.setAttribute) {
    layout.setAttribute('data-geography-e056', 'on');
    layout.setAttribute('data-geography-e056-render', String(S.rendus));
  }

  S.nodes = construirePanneau(ctx);
  recomputer();
  S.pos = S.resultat.etapes.length - 1;
  if (S.nodes.section) S.nodes.section.dataset.geographyE056Reduced = S.reduced ? '1' : '0';

  synchroniser();

  if (S.nodes.frais) {
    const n = S.nodes;
    ORDRE_CRIT.forEach((cle) => {
      const radio = n.radiosCrit[cle];
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.critere = cle;
        recomputer();
        S.pos = S.resultat.etapes.length - 1;
        stopLoop();
        S.playing = false;
        synchroniser();
      });
    });
    ORDRE_ALGO.forEach((algo) => {
      const radio = n.radiosAlgo[algo];
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.algo = algo;
        recomputer();
        S.pos = S.resultat.etapes.length - 1;
        stopLoop();
        S.playing = false;
        synchroniser();
      });
    });
    n.ordre.addEventListener('click', () => {
      S.ascend = !S.ascend;
      recomputer();
      S.pos = S.resultat.etapes.length - 1;
      synchroniser();
    });
    n.play.addEventListener('click', () => {
      if (S.reduced) {
        S.pos = (S.pos + 1) % S.resultat.etapes.length;
        dessiner();
        ecrireReadout(true);
        return;
      }
      S.playing = !S.playing;
      if (!S.playing) stopLoop();
      else if (S.pos >= S.resultat.etapes.length - 1) S.pos = 0;
      if (S.playing) startLoop();
      synchroniser();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let traite = true;
      const total = S.resultat.etapes.length;
      if (event.key === 'ArrowRight') S.pos = Math.min(total - 1, Math.floor(S.pos) + 1);
      else if (event.key === 'ArrowLeft') S.pos = Math.max(0, Math.floor(S.pos) - 1);
      else if (event.key === 'Home') S.pos = 0;
      else if (event.key === 'End') S.pos = total - 1;
      else if (event.key === 'Enter' || event.key === ' ') n.play.click();
      else traite = false;
      if (traite) {
        event.preventDefault();
        if (S.playing) stopLoop();
        S.playing = false;
        dessiner();
        ecrireReadout();
        const host = ctxLayout();
        if (host) host.dataset.geographyE056Etape = String(Math.floor(S.pos) + 1);
        synchroniser();
      }
    });
  }

  assurerObservateur(S.nodes.canvas);
  installGlobal();
  if (S.playing) startLoop();
});
