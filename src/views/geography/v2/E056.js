import { register } from './registry.js';

/* Lentille E056 — passe V2, vue GEOGRAPHIE.
 * Thème : tri des lieux — comment ordonner une liste de lieux, et à quel coût.
 *
 * Les dix chantiers E056-01 … E056-10 sont réellement implémentés (aucun stub) ;
 * leur description est dans UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E056.md.
 * Tout est local : zéro réseau, zéro journalisation, aucun générateur aléatoire,
 * aucun fichier partagé ni module de la passe 1 modifié. Le contenu pédagogique
 * est du texte sémantique réel (h2, h3, p, dl, table, fieldset, label, ol, ul)
 * inséré dans le DOM : il reste lisible et indexable même sans animation ni
 * interaction. Le canvas n'est qu'un laboratoire déterministe : chaque grandeur
 * qu'il illustre est aussi écrite en toutes lettres dans la liste ordonnée, le
 * statut et la liste de rapports chiffrés.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-v2-e056';
const P = 'geography-v2-e056-';
const PANEL_ID = P + 'panel';
const TITLE_ID = P + 'title';
const GLOSSARY_ID = P + 'glossary';
const TABLE_ID = P + 'table';
const CRIT_ID = P + 'crit';
const ALGO_ID = P + 'algo';
const ORDRE_ID = P + 'ordre';
const LISTE_ID = P + 'liste';
const READOUT_ID = P + 'readout';
const CANVAS_ID = P + 'canvas';
const PLAY_ID = P + 'play';
const LEGENDE_ID = P + 'legende';
const LIMITE_ID = P + 'limite';
const RAPPORTS_ID = P + 'rapports';

const NARROW = '\u202f';
const MINUS = '\u2212';
const FRAME_MS = 70;
/* Identifiant du jeu figé (aucun tirage aléatoire) : affiché pour la traçabilité. */
const GRAINE = 0x45e056;

/* ---------- E056-05 : instantané déterministe de lieux réels ----------
 * Valeurs recopiées de src/data/dataset.js (jeu local généré le 2026-11-18).
 * Aucune coordonnée n'est inventée : seules des valeurs réelles sont figées ici,
 * pour un laboratoire reproductible sans requête réseau ni lecture du store.
 * Les compteurs (fun, ev) viennent des champs `functions` et `eventIds`. */
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

/* Convention pédagogique explicite, pas un jugement de valeur. */
const RANGS_HIERARCHIE = { imperial: 0, national: 1, transnational: 2, regional: 3, local: 4 };
const NOMS_HIERARCHIE = {
  imperial: 'impérial', national: 'national', transnational: 'transnational',
  regional: 'régional', local: 'local',
};
const HIER_INCONNUE = 5;

/* Normalisation déterministe, indépendante des paramètres régionaux. */
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
const N = LIEUX.length;
const PIRE = (N * (N - 1)) / 2;
const REF_NLOGN = N * Math.log2(N);

/* ---------- E056-02 / E056-03 : les six clés de tri ---------- */
const CRITERES = {
  alpha: {
    titre: 'Alphabétique (nom)', type: 'texte',
    cle: (p, i) => alpha(p), valeur: (p, i) => rangAlpha[i] / Math.max(1, N - 1),
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

/* ---------- E056-06 : trois algorithmes déterministes ---------- */
const ALGOS = {
  insertion: 'Insertion — stable, comparaisons comptées',
  fusion: 'Fusion — stable, récursive',
  rapide: 'Rapide — pivot médian, non stable',
};
const ORDRE_ALGO = ['insertion', 'fusion', 'rapide'];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  critere: 'alpha',
  algo: 'insertion',
  ascend: true,
  playing: false,
  pos: 0,
  lastTs: 0,
  rafId: 0,
  visible: true,
  reduced: false,
  rendus: 0,
  resultat: null,
  derniereEtape: -1,
  visibilityBound: false,
  motionBound: false,
  observersInstalled: false,
  observedCanvas: null,
  intersection: null,
  nodes: {},
};

/* Alias de ctx.el, initialisé au point d'entrée. */
let E = (tag, cls, txt) => {
  const noeud = document.createElement(tag);
  if (cls) noeud.className = cls;
  if (txt !== undefined) noeud.textContent = txt;
  return noeud;
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

/* Comparateur à ordre total : clé choisie, puis nom en départage croissant. */
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

/* Aucune étape intermédiaire n'est perdue : étape finale sans curseur. */
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

/* ---------- Feuille de style unique, tous ids préfixés ---------- */
const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-left:3px solid var(--gold,#e6b96f);
  border-radius:10px;background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 7px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 5px;font-size:11px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} p{margin:5px 0;max-width:68ch;overflow-wrap:anywhere}
#${PANEL_ID} .geography-v2-e056-fait{margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f)}
#${PANEL_ID} .geography-v2-e056-note{color:var(--muted)}
#${GLOSSARY_ID}{margin:6px 0;max-width:68ch}
#${GLOSSARY_ID} dt{color:var(--gold-bright,#f4d69e);font-weight:600;margin-top:5px}
#${GLOSSARY_ID} dd{margin:1px 0 4px 12px;color:var(--ink-soft,#d7d1c6)}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:7px 0 10px;font-size:10px;font-variant-numeric:tabular-nums}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${PANEL_ID} fieldset{margin:8px 0;padding:7px 8px;border:1px solid var(--line);border-radius:8px}
#${PANEL_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .geography-v2-e056-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .geography-v2-e056-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;min-width:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} button[aria-pressed="true"]{border-color:var(--gold-bright,#f4d69e);background:rgba(230,185,111,.14)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${READOUT_ID}{
  min-height:34px;margin:8px 0;padding:7px 9px;border:1px dashed var(--line);border-radius:7px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${CANVAS_ID}{
  display:block;width:100%;max-width:340px;height:auto;aspect-ratio:3 / 2;margin:8px auto;
  border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${LEGENDE_ID}{font-size:10px;color:var(--muted)}
#${LISTE_ID}{margin:5px 0 8px;padding-left:22px;max-width:68ch}
#${LISTE_ID} li{margin:0 0 3px}
#${LISTE_ID} .geography-v2-e056-cle{color:var(--gold-bright,#f4d69e)}
#${RAPPORTS_ID}{margin:6px 0;padding-left:9px;border-left:2px solid var(--line);max-width:68ch}
#${RAPPORTS_ID} li{margin:3px 0}
#${PANEL_ID}[data-geography-v2-e056-reduced="1"] button{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} *{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${PANEL_ID} .geography-v2-e056-choix{margin-right:4px}
  #${CANVAS_ID}{max-width:280px}
}
`;

/* ---------- E056-01 : section sémantique enrichie et lexique ---------- */

function staticFacts() {
  const bloc = E('div', 'geography-v2-e056-groupe');
  bloc.appendChild(E('h3', '', 'Trois faits à retenir'));
  const faits = [
    'Une clé de tri est la grandeur qui décide de la position : un texte (le nom), un nombre (la latitude) ou une catégorie (la hiérarchie).',
    'Un tri est stable quand deux lieux de même clé gardent leur ordre d’origine ; l’insertion et la fusion le sont, le rapide ne l’est pas.',
    'Le coût d’un tri se mesure en comparaisons de clés : l’insertion peut atteindre n(n−1)/2, un tri en n log₂ n fait bien moins de comparaisons en moyenne.',
  ];
  faits.forEach((texte) => bloc.appendChild(E('p', 'geography-v2-e056-fait', texte)));
  return bloc;
}

function staticGlossary() {
  const bloc = E('div', 'geography-v2-e056-groupe');
  bloc.appendChild(E('h3', '', 'Lexique — définitions à la première occurrence'));
  const dl = E('dl');
  dl.id = GLOSSARY_ID;
  const termes = [
    ['Clé de tri', 'Grandeur (texte, nombre ou catégorie) dont on compare les valeurs pour décider de la position de chaque lieu.'],
    ['Tri stable', 'Tri qui conserve l’ordre d’origine des éléments de même clé ; l’insertion et la fusion sont stables, le rapide ne l’est pas.'],
    ['Comparaison', 'Opération élémentaire qui décide lequel de deux lieux vient avant l’autre selon la clé choisie : c’est l’unité de coût comptée ici.'],
    ['Ordre total', 'Règle qui départage tous les lieux, y compris à clé égale : ici le nom croissant, afin que le résultat soit reproductible.'],
  ];
  termes.forEach(([terme, definition]) => {
    dl.appendChild(E('dt', '', terme));
    dl.appendChild(E('dd', '', definition));
  });
  bloc.appendChild(dl);
  return bloc;
}

/* ---------- E056-02 : tableau statique des six clés, exemples recalculés ---------- */

function staticTable() {
  const table = E('table');
  table.id = TABLE_ID;
  table.appendChild(E('caption', '',
    `Six clés possibles, appliquées à un instantané de ${N} lieux réels du jeu de données local figé (graine ${GRAINE.toString(16)}). Exemples recalculés depuis ces valeurs.`));

  const thead = E('thead');
  const hr = E('tr');
  ['Clé', 'Type', 'Exemple (Paris)', 'Rang de hiérarchie'].forEach((titre) => {
    const th = E('th', '', titre);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = E('tbody');
  const exemples = {
    alpha: LIEUX[0].label, lat: `${dec(LIEUX[0].lat, 3)}°`, lon: `${dec(LIEUX[0].lon, 3)}°`,
    hier: NOMS_HIERARCHIE[LIEUX[0].hier], fun: String(LIEUX[0].fun), ev: String(LIEUX[0].ev),
  };
  const rangs = 'impérial 0 · national 1 · transnational 2 · régional 3 · local 4';
  ORDRE_CRIT.forEach((cle, i) => {
    const tr = E('tr');
    const cellules = [CRITERES[cle].titre, CRITERES[cle].type, exemples[cle], i === 3 ? rangs : '—'];
    cellules.forEach((texte, j) => {
      const cellule = E(j === 0 ? 'th' : 'td', '', texte);
      if (j === 0) cellule.scope = 'row';
      tr.appendChild(cellule);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- E056-03 / E056-06 : choix uniques en radiogroup explicite ---------- */

function fieldsetCriteres(nodes) {
  const fs = E('fieldset');
  fs.id = CRIT_ID;
  fs.setAttribute('role', 'radiogroup');
  fs.setAttribute('aria-label', 'Clé de tri (choix unique)');
  fs.appendChild(E('legend', '', 'Clé de tri (choix unique)'));
  nodes.radiosCrit = {};
  ORDRE_CRIT.forEach((cle) => {
    const label = E('label', 'geography-v2-e056-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + 'crit';
    radio.id = P + 'crit-' + cle;
    radio.value = cle;
    radio.checked = S.critere === cle;
    label.appendChild(radio);
    label.appendChild(document.createTextNode(CRITERES[cle].titre));
    fs.appendChild(label);
    nodes.radiosCrit[cle] = radio;
  });
  return fs;
}

function fieldsetAlgos(nodes) {
  const fs = E('fieldset');
  fs.id = ALGO_ID;
  fs.setAttribute('role', 'radiogroup');
  fs.setAttribute('aria-label', 'Algorithme de tri (choix unique)');
  fs.appendChild(E('legend', '', 'Algorithme de tri (choix unique)'));
  nodes.radiosAlgo = {};
  ORDRE_ALGO.forEach((algo) => {
    const label = E('label', 'geography-v2-e056-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + 'algo';
    radio.id = P + 'algo-' + algo;
    radio.value = algo;
    radio.checked = S.algo === algo;
    label.appendChild(radio);
    label.appendChild(document.createTextNode(ALGOS[algo]));
    fs.appendChild(label);
    nodes.radiosAlgo[algo] = radio;
  });
  return fs;
}

/* ---------- E056-09 : liste sémantique ordonnée, jamais la couleur seule ---------- */

function ligneListe(rang, nom, valeurCle) {
  const li = document.createElement('li');
  const debut = document.createElement('span');
  debut.textContent = `${rang}. ${nom} — `;
  li.appendChild(debut);
  const valeur = document.createElement('span');
  valeur.className = 'geography-v2-e056-cle';
  valeur.textContent = valeurCle;
  li.appendChild(valeur);
  li.appendChild(document.createTextNode('.'));
  return li;
}

function rendreListe() {
  const liste = S.nodes.liste;
  if (!liste || !S.resultat) return;
  const crit = CRITERES[S.critere];
  liste.textContent = '';
  S.resultat.ordre.forEach((index, rang) => {
    const place = LIEUX[index];
    liste.appendChild(ligneListe(rang + 1, place.label, crit.lire(place)));
  });
}

/* ---------- E056-07 : laboratoire canvas déterministe, une seule figure ---------- */

function etapeCourante() {
  if (!S.resultat || !S.resultat.etapes.length) return null;
  const etapes = S.resultat.etapes;
  const pos = Math.max(0, Math.min(etapes.length - 1, Math.floor(S.pos)));
  return etapes[pos];
}

function dessiner() {
  const canvas = S.nodes.canvas;
  if (!canvas || !canvas.isConnected || typeof canvas.getContext !== 'function' || !S.resultat) return;
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
  const pas = largeur / N;
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

    /* Forme et épaisseur du trait, pas la couleur seule. */
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
  g.fillText(`${entier(S.resultat.comparaisons)} comparaisons · graine ${GRAINE.toString(16)}`, pad + 2, pad + 23);
}

/* ---------- E056-08 : région live unique, valeurs référencées ---------- */

function ecrireReadout(forcer) {
  const noeud = S.nodes.readout;
  if (!noeud || !S.resultat) return;
  const etapes = S.resultat.etapes.length;
  const etape = Math.min(etapes, Math.max(1, Math.floor(S.pos) + 1));
  /* Une région live n'est pas réécrite à chaque image : seulement au changement d'étape. */
  if (!forcer && etape === S.derniereEtape) return;
  S.derniereEtape = etape;
  const premier = S.resultat.ordre.slice(0, 3).map((i) => LIEUX[i].label).join(' · ');
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  noeud.textContent = '';
  noeud.appendChild(document.createTextNode(
    `Tri « ${CRITERES[S.critere].titre} » (${S.ascend ? 'croissant' : 'décroissant'}) par ${ALGOS[S.algo].split(' — ')[0]} : `
    + `${N} lieux, `,
  ));
  noeud.appendChild(fort(`${entier(S.resultat.comparaisons)} comparaisons`));
  noeud.appendChild(document.createTextNode(
    `. Références : au plus ${entier(PIRE)} pour l’insertion (n(n−1)/2), `
    + `${dec(REF_NLOGN, 1)} pour un tri en n log₂ n (rapport ${dec(S.resultat.comparaisons / REF_NLOGN, 2)}). `
    + `Étape ${etape} / ${entier(etapes)}. Début de l’ordre : ${premier}…`,
  ));
}

function ecrireRapports() {
  const noeud = S.nodes.rapports;
  if (!noeud || !S.resultat) return;
  const lignes = [
    `Jeu de référence : ${N} lieux réels du jeu de données local, figés sous la graine ${GRAINE.toString(16)}, coordonnées recopiées sans invention.`,
    `Comparaison maximale de l’insertion : ${entier(PIRE)} = ${N} × ${N - 1} / 2 ; c’est la borne haute affichée.`,
    `Référence n log₂ n : ${dec(REF_NLOGN, 1)} comparaisons ; le tri choisi en fait ${entier(S.resultat.comparaisons)}, soit ${dec(S.resultat.comparaisons / REF_NLOGN, 2)} fois cette référence.`,
    `Stabilité : insertion et fusion conservent l’ordre d’origine à clé égale ; le rapide utilise un pivot médian déterministe et peut déplacer des lieux équivalents.`,
  ];
  noeud.textContent = '';
  lignes.forEach((texte) => noeud.appendChild(E('li', '', texte)));
}

/* ---------- E056-10 : défi falsifiable en cinq temps ---------- */

function staticDefi() {
  const bloc = E('section', 'geography-v2-e056-groupe');
  bloc.id = LIMITE_ID;
  bloc.appendChild(E('h3', '', 'Limite et vérification — protocole en cinq temps'));
  const ol = E('ol');
  const etapes = [
    'Prédiction : le passage du tri par insertion au tri fusion réduit-il le nombre de comparaisons ?',
    'Réglage : choisir la clé « Latitude » et inverser le sens pour obtenir un ordre décroissant.',
    'Résultat attendu : Édimbourg (55,955°) ouvre la liste et Windhoek (−22,563°) la ferme ; le statut annonce le nombre de comparaisons.',
    'Falsification : si ce nombre diffère de celui que compte l’algorithme, ou si l’ordre ne correspond pas à la clé, le laboratoire est faux.',
    `Débrief : l’instantané contient ${N} lieux figés et non les ${N} premiers filtrés de la vue ; la convention de hiérarchie est arbitraire mais affichée ; le rapide n’est pas stable ; le coût modélisé est en comparaisons, pas en temps réel.`,
  ];
  etapes.forEach((texte) => ol.appendChild(E('li', '', texte)));
  bloc.appendChild(ol);
  return bloc;
}

/* ---------- Construction du panneau (texte sémantique réel) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant, fresh: false,
      radiosCrit: {
        alpha: document.getElementById(P + 'crit-alpha'),
        lat: document.getElementById(P + 'crit-lat'),
        lon: document.getElementById(P + 'crit-lon'),
        hier: document.getElementById(P + 'crit-hier'),
        fun: document.getElementById(P + 'crit-fun'),
        ev: document.getElementById(P + 'crit-ev'),
      },
      radiosAlgo: {
        insertion: document.getElementById(P + 'algo-insertion'),
        fusion: document.getElementById(P + 'algo-fusion'),
        rapide: document.getElementById(P + 'algo-rapide'),
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
  const panel = E('section', 'geography-v2-e056-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);
  panel.setAttribute('data-sim', 'tri-des-lieux-v2');

  const titre = E('h2', '', 'Trier les lieux : la question de l’ordre');
  titre.id = TITLE_ID;
  const lede = E('p', '',
    'La liste de lieux de la vue suit l’ordre du jeu de données. La changer n’ajoute ni n’enlève '
    + 'aucun lieu : cela choisit une clé, un sens et un algorithme. Ce panneau rend ce choix '
    + 'explicite et compte le coût du tri en comparaisons. Tout est recalculé depuis le jeu figé '
    + `identifié par la graine ${GRAINE.toString(16)} : aucun tirage, aucune requête.`);

  const hResultat = E('h3', '', 'Résultat du tri, en toutes lettres');
  const liste = E('ol');
  liste.id = LISTE_ID;
  liste.setAttribute('aria-label', 'Lieux ordonnés selon la clé et l’algorithme choisis');
  nodes.liste = liste;

  const readout = E('p', 'geography-v2-e056-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  nodes.readout = readout;

  const legende = E('p', 'geography-v2-e056-note',
    'Repères : A ▲ barre comparée en premier · B ▼ barre comparée en second · trait épais = '
    + 'barre en cours de comparaison · barre claire = ordre final. Le nom complet de chaque lieu '
    + 'est écrit dans la liste ci-dessus : la couleur ne porte aucune information exclusive.');
  legende.id = LEGENDE_ID;

  const figure = E('figure');
  const canvas = E('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Laboratoire de tri : douze barres, une par lieu, dont la hauteur code la clé choisie. '
    + 'Flèches gauche et droite : étape précédente ou suivante ; Début et Fin : première et '
    + 'dernière étape ; Entrée : lancer ou arrêter le parcours.');
  canvas.setAttribute('aria-describedby', LEGENDE_ID);
  nodes.canvas = canvas;
  figure.appendChild(canvas);
  figure.appendChild(E('figcaption', 'geography-v2-e056-note',
    'Maquette déterministe : la hauteur des barres code la clé de tri, pas une mesure de terrain. '
    + 'Les comparaisons, l’étape courante et l’ordre complet sont écrits en texte.'));

  const ordre = E('button', '', '↕ Ordre : croissant');
  ordre.type = 'button';
  ordre.id = ORDRE_ID;
  ordre.setAttribute('aria-pressed', 'false');
  ordre.setAttribute('aria-label', 'Inverser le sens du tri (croissant ou décroissant)');
  nodes.ordre = ordre;

  const play = E('button', '', '▶ Parcourir les étapes');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-controls', `${READOUT_ID} ${CANVAS_ID}`);
  nodes.play = play;

  const rapports = E('ul');
  rapports.id = RAPPORTS_ID;
  nodes.rapports = rapports;

  panel.append(
    titre, lede, staticFacts(), staticGlossary(), staticTable(),
    fieldsetCriteres(nodes), fieldsetAlgos(nodes),
    hResultat, liste, readout, legende, figure, ordre, play, rapports, staticDefi(),
  );

  const host = ctx.layout || ctx.stage;
  const cible = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  cible.insertBefore(panel, cible.firstChild);

  return { panel, fresh: true, ...nodes };
}

/* ---------- Synchronisation de l'état vers le DOM ---------- */

function synchroniser() {
  const n = S.nodes;
  ORDRE_CRIT.forEach((cle) => {
    if (n.radiosCrit && n.radiosCrit[cle]) n.radiosCrit[cle].checked = S.critere === cle;
  });
  ORDRE_ALGO.forEach((algo) => {
    if (n.radiosAlgo && n.radiosAlgo[algo]) n.radiosAlgo[algo].checked = S.algo === algo;
  });
  if (n.ordre) {
    n.ordre.textContent = S.ascend ? '↕ Ordre : croissant' : '↕ Ordre : décroissant';
    n.ordre.setAttribute('aria-pressed', S.ascend ? 'false' : 'true');
  }
  if (n.play) n.play.textContent = S.playing ? '■ Arrêter le parcours' : '▶ Parcourir les étapes';
  if (n.panel) n.panel.dataset.geographyV2E056Reduced = S.reduced ? '1' : '0';
  rendreListe();
  ecrireRapports();
  dessiner();
  ecrireReadout(true);
  if (n.panel) {
    n.panel.dataset.geographyV2E056Critere = S.critere;
    n.panel.dataset.geographyV2E056Algo = S.algo;
    n.panel.dataset.geographyV2E056Ordre = S.ascend ? 'croissant' : 'decroissant';
    n.panel.dataset.geographyV2E056Comparaisons = String(S.resultat ? S.resultat.comparaisons : 0);
    n.panel.dataset.geographyV2E056Etape = String(Math.floor(S.pos) + 1);
    n.panel.dataset.geographyV2E056Rendus = String(S.rendus);
  }
}

/* ---------- E056-10 : boucle rAF unique, pause et mouvement réduit ---------- */

function arreter() {
  if (S.rafId) { cancelAnimationFrame(S.rafId); S.rafId = 0; }
  S.lastTs = 0;
}

function demarrer() {
  if (S.rafId || !S.playing || S.reduced || !S.visible) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (typeof requestAnimationFrame !== 'function') return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.playing || S.reduced || !S.visible || !S.resultat) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    S.pos = (S.pos + dt / FRAME_MS) % S.resultat.etapes.length;
  }
  S.lastTs = ts;
  dessiner();
  ecrireReadout();
  S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners(ctx) {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) arreter();
      else demarrer();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : mq.matches;
        if (S.reduced) { S.playing = false; arreter(); }
        else demarrer();
        if (S.resultat) { S.pos = S.resultat.etapes.length - 1; synchroniser(); }
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* Préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

function installObservers() {
  const cv = S.nodes.canvas;
  if (!cv || !cv.isConnected || typeof IntersectionObserver !== 'function') return;
  if (!S.observersInstalled) {
    S.observersInstalled = true;
    S.intersection = new IntersectionObserver((entrees) => {
      const e = entrees[entrees.length - 1];
      S.visible = e ? e.isIntersecting : true;
      if (!S.visible) arreter();
      else demarrer();
    }, { threshold: 0.01 });
  }
  if (S.observedCanvas !== cv) {
    if (S.observedCanvas && S.intersection) S.intersection.unobserve(S.observedCanvas);
    S.observedCanvas = cv;
    S.intersection.observe(cv);
  }
}

/* ---------- Point d'entrée ---------- */

register('E056', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  E = typeof ctx.el === 'function' ? ctx.el : E;
  ctx.css(CSS_ID, CSS);

  S.rendus += 1;
  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  if (S.reduced) { S.playing = false; arreter(); }

  S.nodes = ensurePanel(ctx);
  recomputer();
  S.pos = S.resultat.etapes.length - 1;
  synchroniser();

  if (S.nodes.fresh) {
    const n = S.nodes;
    ORDRE_CRIT.forEach((cle) => {
      const radio = n.radiosCrit[cle];
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.critere = cle;
        recomputer();
        S.pos = S.resultat.etapes.length - 1;
        S.playing = false;
        arreter();
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
        S.playing = false;
        arreter();
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
      if (!S.playing) arreter();
      else if (S.pos >= S.resultat.etapes.length - 1) S.pos = 0;
      if (S.playing) demarrer();
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
        S.playing = false;
        arreter();
        dessiner();
        ecrireReadout();
        synchroniser();
      }
    });
  }

  installObservers();
  installGlobalListeners(ctx);
  demarrer();
});
