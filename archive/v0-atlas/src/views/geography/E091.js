import { register } from './registry.js';

/* Lentille E091 — vue GEOGRAPHIE.
 * Thème : noms de lieux et toponymie francophone.
 *
 * Les dix chantiers E091-01 … E091-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E091.md. Tout est local : aucune requête
 * réseau, aucune graine aléatoire, aucune console, aucun fichier partagé
 * modifié. Le contenu pédagogique est du texte sémantique réel (titre,
 * paragraphes, liste de définitions, tableau) présent dans le DOM même sans
 * animation ni interaction ; le canvas n'est qu'un laboratoire qui illustre
 * des comptages déterministes effectués sur un corpus explicite.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e091';
const PANEL_ID = 'geography-e091-panel';
const TITLE_ID = 'geography-e091-title';
const CORPUS_ID = 'geography-e091-corpus';
const FAM_ID = 'geography-e091-famille';
const SIZE_ID = 'geography-e091-taille';
const SIZE_OUT_ID = 'geography-e091-taille-valeur';
const CANVAS_ID = 'geography-e091-canvas';
const LEGEND_ID = 'geography-e091-legend';
const READOUT_ID = 'geography-e091-readout';
const PLAY_ID = 'geography-e091-play';
const BADGE_ID = 'geography-e091-badge';

/* Cinq familles de formants, repérables à l'écriture, et non à la couleur. */
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

/* Corpus de trente noms de lieux réels, répartis en cinq listes. Aucune
 * commune, aucune étymologie et aucun chiffre n'est fabriqué : les listes
 * servent d'échantillon explicite et les comptages en sont dérivés. */
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

/* Entrelacement déterministe (tour par tour) : l'échantillon fait grandir
 * toutes les familles en même temps, sans tirage aléatoire. */
const CORPUS = (() => {
  const sortie = [];
  let rang = 0;
  let ajoute = true;
  while (ajoute) {
    ajoute = false;
    for (const famille of FAMILLES) {
      const nom = LISTES[famille.key][rang];
      if (nom !== undefined) {
        sortie.push({ nom, famille: famille.key });
        ajoute = true;
      }
    }
    rang += 1;
  }
  return sortie;
})();

const MIN_TAILLE = 6;
const MAX_TAILLE = CORPUS.length;

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  famille: 'ha',
  taille: MAX_TAILLE,
  lecture: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules et comptages déterministes ---------- */

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const pct = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

function comptes(taille) {
  const sous = CORPUS.slice(0, clamp(Math.round(taille), MIN_TAILLE, MAX_TAILLE));
  const valeurs = {};
  FAMILLES.forEach((f) => { valeurs[f.key] = 0; });
  sous.forEach((entree) => { valeurs[entree.famille] += 1; });
  return { total: sous.length, valeurs };
}

function familleParCle(cle) {
  return FAMILLES.find((f) => f.key === cle) || FAMILLES[0];
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e091-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e091-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e091-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e091-panel p{margin:5px 0;max-width:70ch}
#geography-e091-panel .geography-e091-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e091-glossaire{margin:8px 0;padding:0 0 0 4px}
#geography-e091-glossaire dt{margin-top:7px;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e091-glossaire dd{margin:1px 0 0 12px;max-width:70ch;color:var(--ink-soft,#d7d1c6)}
#geography-e091-table{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px}
#geography-e091-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e091-table th,#geography-e091-table td{
  border:1px solid var(--line);padding:3px 5px;text-align:left;vertical-align:top;
}
#geography-e091-table thead th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e091-table tbody th{font-weight:400;color:var(--ink)}
#geography-e091-famille{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e091-famille legend{padding:0 4px;color:var(--muted)}
#geography-e091-panel .geography-e091-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e091-panel .geography-e091-choix input{
  min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f);
}
#geography-e091-taille{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-e091-taille-valeur{color:var(--gold-bright,#f4d69e);font-weight:600;font-variant-numeric:tabular-nums}
#geography-e091-canvas{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e091-legend{font-size:10px;color:var(--muted)}
#geography-e091-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e091-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e091-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e091-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e091-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.geography-e091-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-e091-panel[data-geography-e091-reduced="1"] button,
#geography-e091-panel[data-geography-e091-reduced="1"] .geography-e091-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e091-panel button,.geography-e091-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e091-panel{font-size:10px;padding:9px}
  #geography-e091-canvas{height:190px}
  #geography-e091-panel .geography-e091-choix{margin-right:4px}
}
`;

/* ---------- Contenu sémantique statique (E091-01, -02, -03) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Un toponyme est le nom d’un lieu ; la toponymie étudie l’origine, la forme et la répartition de ces noms. Un odonyme nomme une voie, un hydronyme un cours d’eau, un oronyme une montagne.',
    'Un même toponyme peut porter plusieurs strates : un formant gaulois, une dédicace de saint, un suffixe francique. L’orthographe donne un indice, jamais une certitude absolue.',
    'Les comptages de ce laboratoire portent sur un corpus de trente noms de lieux réels, dressé en tableau plus bas : aucune commune, aucune étymologie et aucune grandeur chiffrée n’est inventée.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e091-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticGlossary() {
  const dl = document.createElement('dl');
  dl.id = 'geography-e091-glossaire';
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
  caption.textContent = `Corpus de ${MAX_TAILLE} noms de lieux réels. La famille est repérée par un indice orthographique observable, sans prétendre à une étymologie exhaustive.`;
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

/* ---------- Panneau ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: FAMILLES.map((f) => document.getElementById(`geography-e091-fam-${f.key}`)),
      taille: document.getElementById(SIZE_ID),
      tailleOut: document.getElementById(SIZE_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e091-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Noms de lieux et toponymie francophone');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Lire un nom de lieu, c’est lire une couche d’histoire : la toponymie francophone garde des traces du gaulois, du latin, du francique et des dédicaces de saints. Ce laboratoire classe trente noms réels par indice orthographique et compte les familles obtenues.');

  const subFacts = ctx.el('h3', '', 'Ce que disent les noms');
  const subGlossaire = ctx.el('h3', '', 'Lexique de toponymie');
  const subCorpus = ctx.el('h3', '', 'Le corpus de trente noms');

  const fieldset = document.createElement('fieldset');
  fieldset.id = FAM_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Famille à mettre en évidence (choix unique)';
  fieldset.appendChild(legend);
  FAMILLES.forEach((famille) => {
    const lab = ctx.el('label', 'geography-e091-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e091-famille-groupe';
    radio.id = `geography-e091-fam-${famille.key}`;
    radio.value = famille.key;
    radio.checked = S.famille === famille.key;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(`${famille.lettre} — ${famille.titre}`));
    fieldset.appendChild(lab);
  });

  const subLab = ctx.el('h3', '', 'Laboratoire : histogramme des familles');

  const tailleRow = ctx.el('p', '');
  const tailleLabel = document.createElement('label');
  tailleLabel.setAttribute('for', SIZE_ID);
  tailleLabel.appendChild(document.createTextNode('Taille de l’échantillon : '));
  const tailleOut = document.createElement('span');
  tailleOut.id = SIZE_OUT_ID;
  tailleLabel.appendChild(tailleOut);
  tailleRow.appendChild(tailleLabel);

  const taille = document.createElement('input');
  taille.type = 'range';
  taille.id = SIZE_ID;
  taille.min = String(MIN_TAILLE);
  taille.max = String(MAX_TAILLE);
  taille.step = '6';
  taille.value = String(S.taille);
  taille.setAttribute('aria-label', `Nombre de noms affichés, de ${MIN_TAILLE} à ${MAX_TAILLE} par pas de 6`);

  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Histogramme des cinq familles toponymiques de l’échantillon. Flèches gauche et droite : changer de famille ; flèches haut et bas : changer la taille de l’échantillon.');

  const legendText = ctx.el('p', 'geography-e091-legend');
  legendText.id = LEGEND_ID;
  legendText.textContent = 'Codes de remplissage, indépendants de la couleur : H hachures obliques (saints), B points (germanique), A croisements (-ac), V traits verticaux (-ville), T traits horizontaux (noms antiques).';

  const readout = ctx.el('p', 'geography-e091-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', S.lecture ? '■ Arrêter le balayage' : '▶ Animer le balayage');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.lecture ? 'true' : 'false');

  panel.append(
    title, lead, subFacts, staticFacts(), subGlossaire, staticGlossary(),
    subCorpus, staticCorpus(), fieldset, subLab, tailleRow, taille,
    canvas, legendText, readout, play,
  );

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    radios: FAMILLES.map((f) => document.getElementById(`geography-e091-fam-${f.key}`)),
    taille, tailleOut, canvas, readout, play,
  };
}

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

  const { total, valeurs } = comptes(S.taille);
  const padL = 14;
  const padR = 14;
  const padT = 24;
  const padB = 28;
  const plotW = Math.max(20, cssW - padL - padR);
  const plotH = Math.max(20, cssH - padT - padB);
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
  g.setLineDash([4, 4]);
  g.strokeStyle = 'rgba(255,255,255,.8)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(xBalayage, padT - 4);
  g.lineTo(xBalayage, baseY);
  g.stroke();
  g.setLineDash([]);

  g.fillStyle = 'rgba(214,207,193,.85)';
  g.font = '10px sans-serif';
  g.fillText(`Échantillon ${total}/${MAX_TAILLE} · référence : 100 % = ${total} noms`, padL, padT - 10);
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const { total, valeurs } = comptes(S.taille);
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode(`Échantillon : ${total} noms sur ${MAX_TAILLE} (référence : 100 % = ${total} noms). `));
  FAMILLES.forEach((famille, i) => {
    const count = valeurs[famille.key];
    if (i > 0) n.appendChild(document.createTextNode(' ; '));
    n.appendChild(document.createTextNode(`${famille.lettre} ${famille.titre} : `));
    n.appendChild(fort(`${count} (${pct(count, total)} %)`));
  });
  const dominante = FAMILLES.reduce((meilleure, f) => (
    valeurs[f.key] > valeurs[meilleure.key] ? f : meilleure
  ), FAMILLES[0]);
  n.appendChild(document.createTextNode(`. Famille la plus représentée : ${dominante.titre} (${valeurs[dominante.key]} noms, ${pct(valeurs[dominante.key], total)} % de l’échantillon).`));
}

function syncControls() {
  const n = S.nodes;
  n.radios.forEach((radio, i) => {
    if (radio) radio.checked = FAMILLES[i].key === S.famille;
  });
  if (n.taille) n.taille.value = String(S.taille);
  if (n.tailleOut) n.tailleOut.textContent = `${S.taille} noms sur ${MAX_TAILLE}`;
  if (n.play) {
    n.play.textContent = S.lecture ? '■ Arrêter le balayage' : '▶ Animer le balayage';
    n.play.setAttribute('aria-pressed', S.lecture ? 'true' : 'false');
  }
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
  const reduced = typeof ctxReducedMotion === 'function' ? !!ctxReducedMotion() : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.lecture && !reduced) S.sweep = (S.sweep + dt * 0.00013) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.lecture && !reduced) S.rafId = requestAnimationFrame(tick);
}

/* Conservé dans le module pour que la boucle interroge la même préférence
 * que le point d'entrée, sans dépendre d'un ctx éphémère. */
let ctxReducedMotion = null;

function installGlobalListeners(ctx) {
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
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE091Reduced = mq.matches ? '1' : '0';
        if (mq.matches) stopLoop(); else if (S.lecture) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

/* ---------- Badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-e091-badge', 'Toponymie : trente noms de lieux réels, classés par indice orthographique. Aucun formant ni chiffre inventé.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E091', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  ctxReducedMotion = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;
  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.nodes.panel.dataset.geographyE091Reduced = reduced ? '1' : '0';
  if (reduced) S.lecture = false;

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
      S.taille = clamp(Math.round(Number(n.taille.value) / 6) * 6, MIN_TAILLE, MAX_TAILLE);
      syncControls();
    });
    n.play.addEventListener('click', () => {
      S.lecture = !S.lecture;
      if (!S.lecture) stopLoop(); else startLoop();
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
      } else {
        used = false;
      }
      if (used) {
        event.preventDefault();
        syncControls();
      }
    });
  }

  installGlobalListeners(ctx);
  if (S.lecture) startLoop();
});
