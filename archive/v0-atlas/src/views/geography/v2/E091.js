import { register } from './registry.js';

/* Lentille E091 (V2) — vue GEOGRAPHIE.
 * Thème : noms de lieux et toponymie francophone — lire une strate d'histoire.
 *
 * Les dix chantiers E091-01 … E091-10 de cette passe V2 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E091.md et réellement implémentés ici :
 * aucun stub, aucune fonction vide, aucune fonction « décorative ». La passe 1
 * (`src/views/geography/E091.js`) reste intacte ; aucun fichier partagé
 * (registry, index, passe 1) n'est modifié.
 *
 * Préfixe unique : geography-v2-e091- (identifiants, classes, attributs)
 * et une seule feuille `ctx.css('geography-v2-e091', …)`. Tout est local :
 * aucune requête réseau, aucune journalisation, aucune valeur aléatoire. Le
 * réordonnancement du corpus est un mélange de Fisher-Yates piloté par une
 * graine affichée (mulberry32), donc parfaitement reproductible. Le savoir est
 * du texte sémantique réel (titre, paragraphes, glossaire, tableaux, défi en
 * cinq temps) présent dans le DOM même sans animation ni interaction ; le
 * canvas n'est qu'un laboratoire qui illustre des comptages calculés en texte.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const P = 'geography-v2-e091';
const CSS_ID = P;

/* Identifiants, tous préfixés geography-v2-e091-. */
const PANEL_ID = P + '-panel';
const TITLE_ID = P + '-title';
const FAITS_ID = P + '-faits';
const NOTE_ID = P + '-note';
const GLOSSAIRE_ID = P + '-glossaire';
const CORPUS_ID = P + '-corpus';
const MESURES_ID = P + '-mesures';
const MESURES_BODY_ID = P + '-mesures-body';
const FAM_ID = P + '-famille';
const FAM_PREFIX = P + '-fam-';
const TAILLE_ID = P + '-taille';
const TAILLE_OUT_ID = P + '-taille-value';
const GRAINE_ID = P + '-graine';
const GRAINE_OUT_ID = P + '-graine-value';
const GRAINE_BTN_ID = P + '-graine-suivante';
const CANVAS_ID = P + '-canvas';
const LEGEND_ID = P + '-legend';
const CLAVIER_ID = P + '-clavier';
const READOUT_ID = P + '-readout';
const PLAY_ID = P + '-play';
const DEFI_ID = P + '-defi';
const DEBRIEF_ID = P + '-debrief';
const DEBRIEF_BTN_ID = P + '-debrief-btn';
const MAP_BADGE_ID = P + '-map-badge';
const REDUCED_ATTR = 'data-' + P + '-reduced';

const MIN_TAILLE = 6;
const MAX_TAILLE = 30;

/* Cinq familles de formants, repérables à l'écriture et non à la couleur. */
const FAMILLES = [
  {
    key: 'ha', lettre: 'H', titre: 'Hagiotoponymie', indice: 'préfixe Saint-/Sainte-',
    origine: 'dédicace à un saint ou à une sainte (haut Moyen Âge)', hatch: 'diag',
  },
  {
    key: 'bu', lettre: 'B', titre: 'Est germanique', indice: 'suffixes -bourg, -house, -willer',
    origine: 'francique et alsacien : burg (forteresse), haus (maison)', hatch: 'point',
  },
  {
    key: 'ac', lettre: 'A', titre: 'Formant gaulois -ac', indice: 'suffixe -ac',
    origine: 'gaulois *-acum, domaine ou possession', hatch: 'croix',
  },
  {
    key: 'vi', lettre: 'V', titre: 'Formant francique -ville', indice: 'formants -ville, -villers',
    origine: 'francique *villa, ferme ou domaine médiéval', hatch: 'vert',
  },
  {
    key: 'au', lettre: 'T', titre: 'Noms antiques', indice: 'aucun formant productif visible',
    origine: 'anciens noms de peuples ou de cités (Lugdunum, Burdigala…)', hatch: 'horiz',
  },
];

/* Corpus explicite et fin : trente noms de lieux réels, répartis en cinq
 * familles repérables à l'écriture. Aucune commune, aucune étymologie et
 * aucun chiffre n'est fabriqué : les comptages dérivent de ce corpus. */
const LISTES = {
  ha: [
    'Saint-Denis', 'Saint-Étienne', 'Saint-Malo', 'Saint-Nazaire',
    'Sainte-Colombe', 'Saint-Germain-en-Laye', 'Saint-Brieuc', 'Saint-Quentin',
  ],
  bu: ['Strasbourg', 'Wissembourg', 'Lauterbourg', 'Mulhouse', 'Guebwiller'],
  ac: ['Cognac', 'Bergerac', 'Figeac', 'Aurillac', 'Najac', 'Salignac', 'Capdenac'],
  vi: [
    'Villeurbanne', 'Villeneuve-d’Ascq', 'Villefranche-sur-Saône',
    'Charleville-Mézières', 'Aubervilliers', 'Joinville',
  ],
  au: ['Lyon', 'Paris', 'Nantes', 'Bordeaux'],
};

/* Table ordonnée par famille : c'est elle qui est affichée dans le tableau. */
const CORPUS = (() => {
  const sortie = [];
  FAMILLES.forEach((famille) => {
    LISTES[famille.key].forEach((nom) => sortie.push({ nom, famille: famille.key }));
  });
  return sortie;
})();

const REF = (() => {
  const valeurs = {};
  FAMILLES.forEach((f) => { valeurs[f.key] = LISTES[f.key].length; });
  return { total: CORPUS.length, valeurs };
})();

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  famille: 'ha',
  taille: MAX_TAILLE,
  graine: 91026,
  lecture: false,
  debriefOuvert: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  onScreen: true,
  visibilityBound: false,
  motionBound: false,
  io: null,
  ioCanvas: null,
  readoutText: '',
  nodes: {},
};

/* ---------- Outils déterministes (E091-05) ---------- */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pct = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);
const fmtPct = (v) => v + '\u00a0%';

/* Générateur congruentiel mulberry32 : aucune valeur tirée au hasard.
 * La graine est affichée dans le panneau et peut être incrémentée d'un pas. */
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

function familleParCle(cle) {
  return FAMILLES.find((f) => f.key === cle) || FAMILLES[0];
}

/* Mélange de Fisher-Yates déterministe puis découpe : à taille = 30, l'ordre
 * change avec la graine mais les effectifs restent 8/5/7/6/4. */
function echantillon() {
  const suivant = mulberry32(S.graine);
  const copie = CORPUS.slice();
  for (let i = copie.length - 1; i > 0; i -= 1) {
    const j = Math.floor(suivant() * (i + 1));
    const tmp = copie[i];
    copie[i] = copie[j];
    copie[j] = tmp;
  }
  return copie.slice(0, clamp(Math.round(S.taille), MIN_TAILLE, MAX_TAILLE));
}

function comptes() {
  const sous = echantillon();
  const valeurs = {};
  FAMILLES.forEach((f) => { valeurs[f.key] = 0; });
  sous.forEach((entree) => { valeurs[entree.famille] += 1; });
  return { total: sous.length, valeurs };
}

/* ---------- E091-01, -02, -03 : texte sémantique lisible sans JS ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  wrap.id = FAITS_ID;
  const faits = [
    'Un toponyme est le nom d’un lieu ; la toponymie étudie l’origine, la forme et la répartition de ces noms. Un odonyme nomme une voie, un hydronyme un cours d’eau, un oronyme une montagne. Ce laboratoire ne manipule que des noms de lieux réels.',
    'Un même toponyme peut porter plusieurs strates : un formant gaulois (-ac), une dédicace de saint (Saint-), un suffixe francique (-ville, -bourg). L’orthographe donne un indice de forme, jamais une certitude étymologique : la classification présentée ici est pédagogique et simplifiée.',
    'Le corpus est fini et explicite : trente noms de lieux réels, répartis en cinq familles (8 hagiotoponymes, 5 noms germaniques, 7 formants -ac, 6 formants -ville, 4 noms antiques). À échantillon complet, les parts sont 27 %, 17 %, 23 %, 20 % et 13 % de 30 noms : toute autre valeur est recalculée depuis le corpus, jamais inventée.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = P + '-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  const note = document.createElement('p');
  note.id = NOTE_ID;
  note.textContent = 'Référence de lecture : 100 % = taille de l’échantillon. La graine affichée pilote seulement l’ordre d’arrivée des noms ; elle ne change jamais les effectifs quand l’échantillon est complet (30 noms).';
  wrap.appendChild(note);
  return wrap;
}

function staticGlossary() {
  const dl = document.createElement('dl');
  dl.id = GLOSSAIRE_ID;
  const entrees = [
    ['Toponymie', 'Étude des noms de lieux : leur origine, leur évolution et leur répartition. Le nom lui-même est un toponyme.'],
    ['Formant', 'Élément de mot, préfixe ou suffixe, qui entre dans la formation d’un toponyme et signale une strate linguistique (par exemple -ac ou -ville).'],
    ['Hagiotoponymie', 'Toponymie formée à partir du nom d’un saint ou d’une sainte : les préfixes Saint- et Sainte- en sont l’indice le plus visible.'],
    ['Endonyme et exonyme', 'L’endonyme est le nom employé par les habitants du lieu ; l’exonyme est le nom utilisé depuis l’extérieur, dans une autre langue (Paris / London).'],
    ['Odonyme, hydronyme, oronyme', 'Respectivement nom de rue ou de voie, nom de cours d’eau et nom de montagne : trois familles de toponymes selon l’objet désigné.'],
  ];
  entrees.forEach(([terme, definition]) => {
    const dt = document.createElement('dt');
    dt.textContent = terme;
    const dd = document.createElement('dd');
    dd.textContent = definition;
    dl.append(dt, dd);
  });
  return dl;
}

function staticCorpus() {
  const table = document.createElement('table');
  table.id = CORPUS_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Corpus de trente noms de lieux réels. La famille est repérée par un indice orthographique observable, sans prétendre à une étymologie exhaustive.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Nom de lieu', 'Famille', 'Indice observable'].forEach((titre) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = titre;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  CORPUS.forEach((entree) => {
    const famille = familleParCle(entree.famille);
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = entree.nom;
    const tdFamille = document.createElement('td');
    tdFamille.textContent = famille.titre;
    const tdIndice = document.createElement('td');
    tdIndice.textContent = famille.indice;
    tr.append(th, tdFamille, tdIndice);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* Tableau de mesures recalculées à chaque réglage (E091-03, E091-07). */
function staticMesures() {
  const table = document.createElement('table');
  table.id = MESURES_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Mesures recalculées depuis le corpus — référence : 100 % = taille de l’échantillon.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Famille', 'Effectif courant', 'Part courante', 'Référence (30 noms)'].forEach((titre) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = titre;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  tbody.id = MESURES_BODY_ID;
  table.appendChild(tbody);
  return table;
}

function fillMesures() {
  const body = S.nodes.mesuresBody;
  if (!body) return;
  const { total, valeurs } = comptes();
  const frag = document.createDocumentFragment();
  FAMILLES.forEach((famille) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = famille.lettre + ' — ' + famille.titre;
    const tdB = document.createElement('td');
    tdB.textContent = String(valeurs[famille.key]) + ' noms';
    const tdP = document.createElement('td');
    tdP.textContent = fmtPct(pct(valeurs[famille.key], total));
    const tdR = document.createElement('td');
    tdR.textContent = String(REF.valeurs[famille.key]) + ' noms (' +
      fmtPct(pct(REF.valeurs[famille.key], REF.total)) + ')';
    tr.append(th, tdB, tdP, tdR);
    frag.appendChild(tr);
  });
  const tr = document.createElement('tr');
  const th = document.createElement('th');
  th.scope = 'row';
  th.textContent = 'Total';
  const tdTotal = document.createElement('td');
  tdTotal.textContent = String(total) + ' noms';
  const tdPart = document.createElement('td');
  tdPart.textContent = fmtPct(100);
  const tdRef = document.createElement('td');
  tdRef.textContent = String(REF.total) + ' noms (100 % = ' + REF.total + ' noms)';
  tr.append(th, tdTotal, tdPart, tdRef);
  frag.appendChild(tr);
  body.replaceChildren(frag);
}

/* ---------- Feuille de style unique ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-left:3px solid var(--gold,#e6b96f);
  border-radius:10px;background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p,#${PANEL_ID} ul{margin:5px 0;max-width:70ch}
#${PANEL_ID} dl{margin:8px 0;padding-left:4px}
#${PANEL_ID} dt{margin-top:7px;color:var(--gold-bright,#f4d69e);font-weight:600}
#${PANEL_ID} dd{margin:1px 0 0 12px;max-width:70ch;color:var(--ink-soft,#d7d1c6)}
#${PANEL_ID} .${P}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${CORPUS_ID},#${MESURES_ID}{
  width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;font-variant-numeric:tabular-nums;
}
#${CORPUS_ID} caption,#${MESURES_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${CORPUS_ID} th,#${CORPUS_ID} td,#${MESURES_ID} th,#${MESURES_ID} td{
  border:1px solid var(--line);padding:3px 5px;text-align:left;vertical-align:top;
}
#${CORPUS_ID} th,#${MESURES_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${CORPUS_ID} tbody th,#${MESURES_ID} tbody th{font-weight:400;color:var(--ink)}
#${FAM_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${FAM_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${P}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:6px;
  padding:2px 6px;cursor:pointer;
}
#${PANEL_ID} .${P}-choix input{min-width:24px;min-height:24px;accent-color:var(--gold,#e6b96f)}
.${P}-range{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
.${P}-value{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
#${CANVAS_ID}{
  display:block;width:100%;max-width:360px;height:auto;aspect-ratio:360 / 230;margin:8px 0;
  border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.28);touch-action:manipulation;
}
#${LEGEND_ID},#${CLAVIER_ID}{font-size:10px;color:var(--muted)}
#${READOUT_ID},#${DEBRIEF_ID}{
  min-height:34px;padding:7px 8px;margin:6px 0;border:1px dashed var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink);font-size:10px;font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${DEBRIEF_ID}[hidden]{display:none}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} button[aria-pressed="true"]{border-color:var(--gold-bright,#f4d69e);background:rgba(230,185,111,.14)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.${P}-map-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[${REDUCED_ATTR}="1"] button,
#${PANEL_ID}[${REDUCED_ATTR}="1"] .${P}-map-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.${P}-map-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{max-width:240px}
  #${PANEL_ID} .${P}-choix{margin-right:4px}
  #${CORPUS_ID},#${MESURES_ID}{font-size:9px}
}
`;

/* ---------- Laboratoire canvas : un seul canvas, tout déterministe ---------- */

function hatch(g, type, x, y, w, h) {
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.lineWidth = 1;
  g.strokeStyle = 'rgba(214,207,193,.38)';
  g.fillStyle = 'rgba(214,207,193,.42)';
  if (type === 'diag' || type === 'croix') {
    for (let d = -h; d < w + h; d += 7) {
      g.beginPath();
      g.moveTo(x + d, y + h);
      g.lineTo(x + d + h, y);
      g.stroke();
    }
  }
  if (type === 'croix') {
    for (let d = -h; d < w + h; d += 7) {
      g.beginPath();
      g.moveTo(x + d, y);
      g.lineTo(x + d + h, y + h);
      g.stroke();
    }
  }
  if (type === 'point') {
    for (let px = x + 4; px < x + w; px += 7) {
      for (let py = y + 4; py < y + h; py += 7) {
        g.fillRect(px, py, 1.5, 1.5);
      }
    }
  }
  if (type === 'vert') {
    for (let px = x + 5; px < x + w; px += 6) {
      g.beginPath();
      g.moveTo(px, y);
      g.lineTo(px, y + h);
      g.stroke();
    }
  }
  if (type === 'horiz') {
    for (let py = y + 5; py < y + h; py += 6) {
      g.beginPath();
      g.moveTo(x, py);
      g.lineTo(x + w, py);
      g.stroke();
    }
  }
  g.restore();
}

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const largeur = Math.max(180, Math.min(360, cv.clientWidth || 360));
  const hauteur = Math.round(largeur * (230 / 360));
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const pxW = Math.round(largeur * dpr);
  const pxH = Math.round(hauteur * dpr);
  if (cv.width !== pxW || cv.height !== pxH) {
    cv.width = pxW;
    cv.height = pxH;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, largeur, hauteur);

  const { total, valeurs } = comptes();
  const padL = 14;
  const padR = 14;
  const padT = 24;
  const padB = 28;
  const plotW = Math.max(20, largeur - padL - padR);
  const plotH = Math.max(20, hauteur - padT - padB);
  const baseY = padT + plotH;
  const maxCount = Math.max(1, ...FAMILLES.map((f) => valeurs[f.key]));
  const largeurBarre = (plotW / FAMILLES.length) * 0.66;

  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(padL, baseY + 0.5);
  g.lineTo(padL + plotW, baseY + 0.5);
  g.stroke();

  FAMILLES.forEach((famille, i) => {
    const count = valeurs[famille.key];
    const hBarre = (count / maxCount) * (plotH - 8);
    const xBarre = padL + (i + 0.5) * (plotW / FAMILLES.length) - largeurBarre / 2;
    const yBarre = baseY - hBarre;
    if (hBarre > 0) {
      g.fillStyle = 'rgba(230,185,111,.08)';
      g.fillRect(xBarre, yBarre, largeurBarre, hBarre);
      hatch(g, famille.hatch, xBarre, yBarre, largeurBarre, hBarre);
    }
    const actif = famille.key === S.famille;
    g.strokeStyle = actif ? 'rgba(244,214,158,.98)' : 'rgba(214,207,193,.55)';
    g.lineWidth = actif ? 2 : 1;
    g.strokeRect(xBarre, yBarre, largeurBarre, Math.max(1, hBarre));

    g.fillStyle = actif ? 'rgba(244,214,158,.98)' : 'rgba(214,207,193,.85)';
    g.font = 'bold 11px sans-serif';
    g.textAlign = 'center';
    g.fillText(famille.lettre, xBarre + largeurBarre / 2, Math.max(padT + 10, yBarre - 5));
    g.font = '9px sans-serif';
    g.fillText(String(count), xBarre + largeurBarre / 2, baseY + 12);
    g.textAlign = 'left';

    if (actif) {
      const cx = xBarre + largeurBarre / 2;
      g.beginPath();
      g.moveTo(cx - 5, baseY + 18);
      g.lineTo(cx + 5, baseY + 18);
      g.lineTo(cx, baseY + 23);
      g.closePath();
      g.fill();
    }
  });

  /* Curseur de lecture : seul élément animé, position = f(S.sweep). */
  const xBalayage = padL + S.sweep * plotW;
  if (g.setLineDash) g.setLineDash([4, 4]);
  g.strokeStyle = 'rgba(255,255,255,.8)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(xBalayage, padT - 4);
  g.lineTo(xBalayage, baseY);
  g.stroke();
  if (g.setLineDash) g.setLineDash([]);

  g.fillStyle = 'rgba(214,207,193,.85)';
  g.font = '10px sans-serif';
  g.fillText('Échantillon ' + total + '/' + MAX_TAILLE +
    ' · référence : 100 % = ' + total + ' noms · graine ' + S.graine, padL, padT - 10);
}

/* ---------- E091-07 : région de statut unique, relatée en texte ---------- */

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const { total, valeurs } = comptes();
  const fort = (texte) => {
    const st = document.createElement('strong');
    st.textContent = texte;
    return st;
  };
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createTextNode('Échantillon : '));
  frag.appendChild(fort(String(total)));
  frag.appendChild(document.createTextNode(' noms sur ' + MAX_TAILLE +
    ' (référence : 100 % = ' + total + ' noms) ; graine ' + S.graine + '. '));
  FAMILLES.forEach((famille, i) => {
    if (i > 0) frag.appendChild(document.createTextNode(' ; '));
    frag.appendChild(document.createTextNode(famille.lettre + ' ' + famille.titre + ' : '));
    frag.appendChild(fort(valeurs[famille.key] + ' (' + fmtPct(pct(valeurs[famille.key], total)) + ')'));
  });
  const dominante = FAMILLES.reduce((meilleure, f) => (
    valeurs[f.key] > valeurs[meilleure.key] ? f : meilleure
  ), FAMILLES[0]);
  frag.appendChild(document.createTextNode('. Famille la plus représentée : '));
  frag.appendChild(fort(dominante.titre + ' (' + valeurs[dominante.key] + ' noms, ' +
    fmtPct(pct(valeurs[dominante.key], total)) + ')'));
  frag.appendChild(document.createTextNode('. '));
  frag.appendChild(fort(familleParCle(S.famille).titre + ' mise en évidence.'));
  const texte = frag.textContent;
  if (texte === S.readoutText) return; // évite de saturer la région live.
  S.readoutText = texte;
  n.textContent = '';
  n.appendChild(frag);
}

/* ---------- Construction du panneau (texte sémantique) ---------- */

function sliderRow(ctx, id, outId, label, min, max, step, value, ariaLabel) {
  const row = ctx.el('p', '');
  const lab = document.createElement('label');
  lab.setAttribute('for', id);
  lab.appendChild(document.createTextNode(label + ' : '));
  const out = document.createElement('span');
  out.id = outId;
  out.className = P + '-value';
  lab.appendChild(out);
  row.appendChild(lab);
  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.className = P + '-range';
  input.setAttribute('aria-label', ariaLabel);
  return { row, input, out };
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant, fresh: false,
      radios: FAMILLES.map((f) => document.getElementById(FAM_PREFIX + f.key)),
      taille: document.getElementById(TAILLE_ID),
      tailleOut: document.getElementById(TAILLE_OUT_ID),
      graine: document.getElementById(GRAINE_ID),
      graineOut: document.getElementById(GRAINE_OUT_ID),
      graineBtn: document.getElementById(GRAINE_BTN_ID),
      mesuresBody: document.getElementById(MESURES_BODY_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      debriefBtn: document.getElementById(DEBRIEF_BTN_ID),
      debrief: document.getElementById(DEBRIEF_ID),
    };
  }

  const panel = ctx.el('section', P + '-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Noms de lieux et toponymie francophone — laboratoire V2');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Lire un nom de lieu, c’est lire une couche d’histoire : la toponymie francophone garde des traces du gaulois, du latin, du francique et des dédicaces de saints. Ce laboratoire classe trente noms réels par indice orthographique, puis compte les familles d’un échantillon dont la graine est affichée et reproductible.');

  /* E091-01/02/03 : faits sourcés, glossaire et corpus, lisibles sans JS. */
  const faits = staticFacts();
  const hLexique = ctx.el('h3', '', 'Lexique de toponymie');
  const glossaire = staticGlossary();
  const hCorpus = ctx.el('h3', '', 'Le corpus de trente noms');
  const corpus = staticCorpus();
  const hMesures = ctx.el('h3', '', 'Mesures recalculées');
  const mesures = staticMesures();

  /* E091-04 : radiogroupe de familles (choix unique, pas d'aria-pressed). */
  const fieldset = document.createElement('fieldset');
  fieldset.id = FAM_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Famille à mettre en évidence, choix unique');
  const legend = document.createElement('legend');
  legend.textContent = 'Famille à mettre en évidence (choix unique)';
  fieldset.appendChild(legend);
  const radios = FAMILLES.map((famille) => {
    const lab = ctx.el('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-famille-groupe';
    radio.id = FAM_PREFIX + famille.key;
    radio.value = famille.key;
    radio.checked = S.famille === famille.key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(famille.lettre + ' — ' + famille.titre));
    fieldset.appendChild(lab);
    return radio;
  });

  const hLab = ctx.el('h3', '', 'Laboratoire : histogramme des familles');

  /* E091-05 : taille d'échantillon et graine affichée (mulberry32). */
  const taille = sliderRow(ctx, TAILLE_ID, TAILLE_OUT_ID, 'Taille de l’échantillon',
    MIN_TAILLE, MAX_TAILLE, 6, S.taille,
    'Nombre de noms affichés, de 6 à 30 par pas de 6');
  const graine = sliderRow(ctx, GRAINE_ID, GRAINE_OUT_ID, 'Graine de mélange',
    91000, 91100, 1, S.graine,
    'Graine du mélange déterministe, de 91 000 à 91 100');
  const graineBtn = ctx.el('button', '', 'Graine suivante (+1)');
  graineBtn.type = 'button';
  graineBtn.id = GRAINE_BTN_ID;

  /* E091-06 : canvas focalisable, étiqueté, avec équivalent clavier. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Histogramme des cinq familles toponymiques de l’échantillon. Flèches gauche et droite : changer de famille ; flèches haut et bas : changer la taille ; Page précédente et Page suivante : changer la graine.');
  canvas.setAttribute('aria-describedby', CLAVIER_ID + ' ' + LEGEND_ID);

  /* E091-09 : légende des motifs, indépendants de la couleur. */
  const legendText = ctx.el('p', '', 'Repères sans couleur : H hachures obliques (saints), B points (germanique), A croisements (-ac), V traits verticaux (-ville), T traits horizontaux (noms antiques). La barre active a un contour épais et un triangle au sol ; le tiret vertical est le curseur de balayage.');
  legendText.id = LEGEND_ID;
  const clavier = ctx.el('p', '', 'Clavier : Tab atteint les cinq familles, les deux curseurs, la graine suivante, le balayage, le défi puis le schéma. Sur le schéma, ← → changent de famille, ↑ ↓ changent la taille par pas de 6, Page précédente et Page suivante incrémentent la graine. Le balayage est une bascule indépendante : son état est toujours écrit, jamais porté par le seul pixel.');
  clavier.id = CLAVIER_ID;

  /* E091-07 : région de statut unique, annoncée aux technologies d'assistance. */
  const readout = ctx.el('p', P + '-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');

  /* E091-10 : bascule indépendante -> aria-pressed autorisé. */
  const play = ctx.el('button', '', S.lecture ? '■ Arrêter le balayage' : '▶ Animer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.lecture ? 'true' : 'false');
  play.setAttribute('aria-controls', CANVAS_ID);

  /* E091-09 : défi falsifiable en cinq temps, débrief révélé par aria-expanded. */
  const defi = ctx.el('p', '', 'À vous de jouer — 1) Prédire : à échantillon complet (30 noms), quelle famille domine et combien de noms compte-t-elle ? 2) Réglage : mettez la taille à 30, puis essayez trois graines différentes. 3) Résultat attendu : H (hagiotoponymie) domine avec 8 noms, soit 27 % de 30 ; puis A 7 (23 %), V 6 (20 %), B 5 (17 %), T 4 (13 %). 4) Falsification : si changer la graine à taille 30 modifie les cinq effectifs, l’hypothèse « la graine ne change que l’ordre d’arrivée » est réfutée — vérifiez. 5) Débrief : vérifiez votre raisonnement ci-dessous.');
  defi.id = DEFI_ID;
  const debriefBtn = ctx.el('button', '', 'Révéler le débrief');
  debriefBtn.type = 'button';
  debriefBtn.id = DEBRIEF_BTN_ID;
  debriefBtn.setAttribute('aria-expanded', 'false');
  debriefBtn.setAttribute('aria-controls', DEBRIEF_ID);
  const debrief = ctx.el('p', '', 'Débrief : à taille 30, l’échantillon contient tous les noms du corpus, donc les effectifs sont fixes (8/5/7/6/4) quelle que soit la graine — seul leur ordre d’arrivée change. La graine n’influe sur les comptes que lorsque la taille est partielle. La classification repose sur un indice orthographique observable, pas sur une étymologie exhaustive : c’est un échantillon pédagogique fini, pas une mesure de la toponymie française.');
  debrief.id = DEBRIEF_ID;
  debrief.hidden = true;

  panel.append(title, lead, faits, hLexique, glossaire, hCorpus, corpus,
    hMesures, mesures, fieldset, hLab, taille.row, taille.input,
    graine.row, graine.input, graineBtn, canvas, legendText, clavier,
    readout, play, defi, debriefBtn, debrief);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true, radios,
    taille: taille.input, tailleOut: taille.out,
    graine: graine.input, graineOut: graine.out, graineBtn,
    mesuresBody: document.getElementById(MESURES_BODY_ID),
    canvas, readout, play, debriefBtn, debrief,
  };
}

/* ---------- Synchronisation de tous les contrôles et du dessin ---------- */

function syncControls() {
  const n = S.nodes;
  n.radios.forEach((radio, i) => {
    if (radio) radio.checked = FAMILLES[i].key === S.famille;
  });
  if (n.taille) n.taille.value = String(S.taille);
  if (n.tailleOut) n.tailleOut.textContent = S.taille + ' noms sur ' + MAX_TAILLE;
  if (n.graine) n.graine.value = String(S.graine);
  if (n.graineOut) n.graineOut.textContent = String(S.graine);
  if (n.play) {
    n.play.textContent = S.lecture ? '■ Arrêter le balayage' : '▶ Animer le balayage';
    n.play.setAttribute('aria-pressed', S.lecture ? 'true' : 'false');
  }
  if (n.debriefBtn) {
    n.debriefBtn.textContent = S.debriefOuvert ? 'Masquer le débrief' : 'Révéler le débrief';
    n.debriefBtn.setAttribute('aria-expanded', S.debriefOuvert ? 'true' : 'false');
  }
  if (n.debrief) n.debrief.hidden = !S.debriefOuvert;
  if (n.panel) n.panel.setAttribute(REDUCED_ATTR, reducedNow() ? '1' : '0');
  updateReadout();
  fillMesures();
  drawLab();
}

/* ---------- E091-10 : boucle rAF unique, pauses multiples ---------- */

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
  if (!S.onScreen || reducedNow()) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

/* Un seul pas discret, utilisé en mouvement réduit. */
function stepSweep() {
  S.sweep = (S.sweep + 0.2) % 1;
  syncControls();
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen || reducedNow()) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.lecture) S.sweep = (S.sweep + dt * 0.00013) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.lecture && !reducedNow()) S.rafId = requestAnimationFrame(tick);
}

/* Source unique de la préférence de mouvement (ctx.reducedMotion + repli). */
let reducedProvider = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
};
function reducedNow() { return !!reducedProvider(); }

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.lecture) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        if (mq.matches) { S.lecture = false; stopLoop(); }
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : reducedNow() reste la source. */ }
  }
}

/* E091-10 : IntersectionObserver, pause hors écran. */
function ensureObserver(canvas) {
  if (typeof IntersectionObserver !== 'function') { S.onScreen = true; return; }
  if (S.io && S.ioCanvas === canvas) return;
  if (S.io) S.io.disconnect();
  S.io = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    S.onScreen = entry ? entry.isIntersecting : true;
    if (!S.onScreen) stopLoop();
    else if (S.lecture) startLoop();
  }, { threshold: 0.01 });
  S.io.observe(canvas);
  S.ioCanvas = canvas;
}

/* E091-08 : badge textuel sur la carte existante. */
function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(MAP_BADGE_ID)) return;
  const badge = ctx.el('div', P + '-map-badge', 'Toponymie : trente noms de lieux réels, classés par indice orthographique. Graine affichée, aucun formant ni chiffre inventé.');
  badge.id = MAP_BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée unique, idempotent ---------- */

register('E091', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  if (typeof ctx.reducedMotion === 'function') reducedProvider = () => !!ctx.reducedMotion();

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  if (reducedNow()) S.lecture = false;
  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.radios.forEach((radio, i) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.famille = FAMILLES[i].key;
        syncControls();
      });
    });
    n.taille.addEventListener('input', () => {
      S.taille = clamp(Math.round(Number(n.taille.value)), MIN_TAILLE, MAX_TAILLE);
      syncControls();
    });
    n.graine.addEventListener('input', () => {
      S.graine = clamp(Math.round(Number(n.graine.value)), 91000, 91100);
      syncControls();
    });
    n.graineBtn.addEventListener('click', () => {
      S.graine = S.graine >= 91100 ? 91000 : S.graine + 1;
      syncControls();
    });
    n.play.addEventListener('click', () => {
      if (reducedNow() || typeof requestAnimationFrame !== 'function') {
        S.lecture = false;
        stopLoop();
        stepSweep(); // palier discret : jamais d'animation en mouvement réduit.
        syncControls();
        return;
      }
      S.lecture = !S.lecture;
      if (!S.lecture) stopLoop(); else startLoop();
      syncControls();
    });
    n.debriefBtn.addEventListener('click', () => {
      S.debriefOuvert = !S.debriefOuvert;
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const i = FAMILLES.findIndex((f) => f.key === S.famille);
        S.famille = FAMILLES[(i + step + FAMILLES.length) % FAMILLES.length].key;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const step = event.key === 'ArrowUp' ? 6 : -6;
        S.taille = clamp(S.taille + step, MIN_TAILLE, MAX_TAILLE);
      } else if (event.key === 'PageUp' || event.key === 'PageDown') {
        const sens = event.key === 'PageDown' ? 1 : -1;
        S.graine = clamp(S.graine + sens, 91000, 91100);
      } else used = false;
      if (used) {
        event.preventDefault();
        syncControls();
      }
    });
    ensureObserver(n.canvas);
  }

  installGlobalListeners();
  if (S.lecture && !reducedNow()) startLoop();
});
