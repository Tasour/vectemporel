import { register } from './registry.js';

/* Lentille V2 E095 — Régions et subdivisions administratives.
 *
 * Seconde passe sur le domaine de l'organisation territoriale : dix chantiers
 * E095-01 … E095-10, tous réellement implémentés (aucun stub), décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E095.md.
 *
 * Un seul import, un seul `register('E095', (ctx) => { … })`, une seule feuille
 * de style installée sous la clé `geography-v2-e095`, tous les identifiants
 * préfixés `geography-v2-e095-`. Le contenu substantiel est du texte sémantique
 * réel (section, h2/h3, p, dl/dt/dd, table/th/td, ol/li, fieldset/radiogroup) :
 * il reste lisible, indexable et consultable même quand l'animation est à
 * l'arrêt ou le mouvement réduit activé. Le canvas d'emboîtement n'est qu'un
 * complément déterministe : aucune information n'est portée par le seul rendu
 * graphique ni par une `aria-label` isolée.
 *
 * Contraintes : zéro réseau, zéro appel à la console, aucune source aléatoire,
 * une seule boucle rAF avec pause sur `document.hidden`, respect de
 * `ctx.reducedMotion()`, DPR plafonné à 2, français partout.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const PFX = 'geography-v2-e095';
const CSS_ID = 'geography-v2-e095';

const PANEL_ID = `${PFX}-panel`;
const TITLE_ID = `${PFX}-title`;
const GLOSSARY_ID = `${PFX}-glossary`;
const LEVELS_ID = `${PFX}-levels`;
const NESTING_ID = `${PFX}-nesting`;
const SELECTOR_ID = `${PFX}-selector`;
const SUMMARY_ID = `${PFX}-summary`;
const COMPARISONS_ID = `${PFX}-comparisons`;
const SEQUENCE_ID = `${PFX}-sequence`;
const CANVAS_ID = `${PFX}-canvas`;
const READOUT_ID = `${PFX}-readout`;
const PREV_ID = `${PFX}-prev`;
const NEXT_ID = `${PFX}-next`;

/* Dimensions logiques du canvas (px CSS) — indépendantes du DPR. */
const CW = 320;
const CH = 196;

/* État de module : survit aux re-renders complets de la coque. */
const S = {
  niveau: 0,          /* index du niveau choisi dans le radiogroupe [0,5] */
  phase: 0,           /* phase déterministe du curseur automatique [0,1) */
  autoIndex: 0,       /* index du niveau montré par le curseur */
  lastTs: 0,
  rafId: 0,
  reduced: false,
  visibilityBound: false,
  motionBound: false,
  ctxRef: null,
  layoutRef: null,
  dom: {},
  listeners: [],
};

/* Niveaux administratifs français, du plus vaste au plus fin. `valeur` sert
   au calcul du message d'état, `repere` est l'affichage d'origine. */
const NIVEAUX = [
  {
    code: 'etat', nom: 'État', role: 'Souveraineté',
    repere: '1 État', valeur: 1, exemple: 'France',
    defin: 'Collectivité souveraine qui détient l’autorité suprême sur un territoire reconnu.',
  },
  {
    code: 'region', nom: 'Région', role: 'Aménagement du territoire',
    repere: '18 régions', valeur: 18, exemple: 'Occitanie',
    defin: 'Découpage de premier niveau en France, chargé du développement économique et de l’aménagement.',
  },
  {
    code: 'departement', nom: 'Département', role: 'Action sociale, collège',
    repere: '101 départements', valeur: 101, exemple: 'Haute-Garonne (31)',
    defin: 'Collectivité intermédiaire entre la région et la commune, dont le chef-lieu est la préfecture.',
  },
  {
    code: 'arrondissement', nom: 'Arrondissement', role: 'Administration préfectorale',
    repere: '342 arrondissements', valeur: 342, exemple: 'Arrondissement de Toulouse',
    defin: 'Subdivision d’un département placée sous l’autorité d’un sous-préfet.',
  },
  {
    code: 'canton', nom: 'Canton', role: 'Élections départementales',
    repere: '2 054 cantons', valeur: 2054, exemple: 'Canton de Toulouse-1',
    defin: 'Circonscription électorale pour l’élection des conseillers départementaux.',
  },
  {
    code: 'commune', nom: 'Commune', role: 'État civil, proximité',
    repere: '≈ 34 900 communes', valeur: 34900, exemple: 'Commune de Toulouse',
    defin: 'Plus petite subdivision française, dotée d’un maire et d’un conseil municipal élu.',
  },
];

/* Chaque terme est défini dès sa première occurrence (E095-02). */
const GLOSSAIRE = [
  ['Subdivision administrative', 'Partie d’un territoire délimitée par l’autorité publique, dotée d’un statut, d’un nom et souvent d’une collectivité ou d’un service déconcentré.'],
  ['Niveau hiérarchique', 'Rang occupé par une subdivision dans l’emboîtement des territoires : un département est d’un rang inférieur à la région qui le contient.'],
  ['Collectivité territoriale', 'Personne morale de droit public (région, département, commune) disposant d’un conseil élu et d’un budget propre.'],
  ['Administration déconcentrée', 'Service de l’État réparti sur le territoire (préfecture, sous-préfecture), distinct des collectivités élues.'],
  ['Emboîtement', 'Propriété d’un découpage où chaque niveau contient plusieurs unités du niveau suivant, à la manière de poupées russes.'],
  ['Chef-lieu', 'Localité où siège l’administration d’une subdivision : la préfecture pour un département, par exemple.'],
];

/* Chaîne d'exemples réels, du plus vaste au plus fin (E095-04). */
const EXEMPLES = [
  { niveau: 'État', nom: 'France', note: 'Souveraineté unique ; référence de tout le découpage.' },
  { niveau: 'Région', nom: 'Occitanie', note: 'Région du Sud créée en 2016 par fusion de deux anciennes régions.' },
  { niveau: 'Département', nom: 'Haute-Garonne (31)', note: 'Département dont le chef-lieu est la préfecture de Toulouse.' },
  { niveau: 'Arrondissement', nom: 'Arrondissement de Toulouse', note: 'Circonscription de l’administration préfectorale.' },
  { niveau: 'Canton', nom: 'Canton de Toulouse-1', note: 'Circonscription électorale départementale.' },
  { niveau: 'Commune', nom: 'Toulouse', note: 'Commune la plus peuplée de la région Occitanie.' },
];

/* Subdivisions de premier niveau à l'étranger (E095-07). */
const COMPARAISONS = [
  ['France', 'Régions', 18],
  ['Allemagne', 'Länder (États fédérés)', 16],
  ['Espagne', 'Communautés autonomes', 17],
  ['Italie', 'Régions', 20],
  ['Belgique', 'Régions', 3],
  ['États-Unis', 'États', 50],
];

/* Teintes fixes du schéma canvas : aucune couleur n'est tirée au hasard. */
const TEINTES = [
  'rgba(120,150,190,0.20)',
  'rgba(132,160,196,0.26)',
  'rgba(150,170,200,0.32)',
  'rgba(174,180,196,0.38)',
  'rgba(206,190,160,0.42)',
  'rgba(230,185,111,0.48)',
];

/* ---------- utilitaires déterministes ---------- */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function fmtInt(value) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}

function reduced() {
  return S.reduced === true;
}

function on(node, type, fn) {
  if (!node || typeof node.addEventListener !== 'function') return;
  node.addEventListener(type, fn);
  S.listeners.push({ node, type, fn });
}

function noeudFort(texte) {
  const n = document.createElement('strong');
  n.textContent = texte;
  return n;
}

function paragraphe(classe, texte) {
  const n = document.createElement('p');
  if (classe) n.className = classe;
  if (texte !== undefined) n.textContent = texte;
  return n;
}

/* ---------- E095-09 : canvas d'emboîtement déterministe ---------- */

function drawCanvas() {
  const canvas = S.dom.canvas;
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const pxW = Math.round(CW * dpr);
  const pxH = Math.round(CH * dpr);
  if (canvas.width !== pxW || canvas.height !== pxH) {
    canvas.width = pxW;
    canvas.height = pxH;
  }
  const g = canvas.getContext('2d');
  if (!g || typeof g.setTransform !== 'function') return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, CW, CH);
  g.fillStyle = 'rgba(8,12,18,0.60)';
  g.fillRect(0, 0, CW, CH);

  /* Six rectangles concentriques : géométrie calculée depuis l'index du rang.
     Aucune position, aucune couleur et aucun nombre d'encoches n'est aléatoire. */
  const pas = 11;
  const gauche = 10;
  const haut = 12;
  const largeur = CW - 20;
  const hauteur = CH - 48;
  NIVEAUX.forEach((niveau, index) => {
    const x = gauche + index * pas;
    const y = haut + index * pas;
    const w = largeur - 2 * index * pas;
    const h = hauteur - 2 * index * pas;
    const courant = index === S.autoIndex;
    g.fillStyle = TEINTES[index % TEINTES.length];
    g.fillRect(x, y, w, h);
    g.strokeStyle = courant ? '#f4d69e' : 'rgba(244,214,158,0.28)';
    g.lineWidth = courant ? 2 : 1;
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    g.fillStyle = courant ? '#f4d69e' : 'rgba(214,224,236,0.72)';
    g.font = courant ? 'bold 10px sans-serif' : '10px sans-serif';
    g.textAlign = 'left';
    g.fillText(niveau.nom, x + 5, y + 12);
    /* Encoches : index + 1, donc reproductibles et différentes par rang. */
    g.strokeStyle = 'rgba(244,214,158,0.32)';
    g.lineWidth = 1;
    for (let k = 0; k <= index; k += 1) {
      const tx = x + 6 + k * 9;
      if (tx > x + w - 6) break;
      g.beginPath();
      g.moveTo(tx, y + h - 5);
      g.lineTo(tx, y + h - 11);
      g.stroke();
    }
  });

  /* Légende textuelle doublée dans #sequence : la couleur n'est jamais seule. */
  const niveau = NIVEAUX[S.autoIndex];
  const prefixe = reduced() ? 'Mouvement réduit — ' : 'Lecture automatique — ';
  g.fillStyle = 'rgba(214,224,236,0.88)';
  g.font = '11px sans-serif';
  g.textAlign = 'left';
  g.fillText(`${prefixe}niveau ${S.autoIndex + 1}/${NIVEAUX.length} : ${niveau.nom}`, 10, CH - 13);

  /* Barre de progression linéaire, fonction de la seule phase. */
  g.fillStyle = 'rgba(230,185,111,0.18)';
  g.fillRect(10, CH - 8, CW - 20, 3);
  g.fillStyle = '#e6b96f';
  g.fillRect(10, CH - 8, Math.round((CW - 20) * S.phase), 3);
}

/* ---------- E095-08 : message d'état chiffré ---------- */

function mesures() {
  const communes = NIVEAUX[NIVEAUX.length - 1].valeur;
  const regions = NIVEAUX[1].valeur;
  return {
    nbNiveaux: NIVEAUX.length,
    nbPays: COMPARAISONS.length,
    nbTermes: GLOSSAIRE.length,
    communes,
    regions,
    communesParRegion: Math.round(communes / regions),
  };
}

function majReadout() {
  const n = S.dom.readout;
  if (!n) return;
  const m = mesures();
  n.textContent = '';
  n.append(
    document.createTextNode('Repères — '),
    noeudFort(String(m.nbNiveaux)),
    document.createTextNode(' niveaux emboîtés, '),
    noeudFort(String(m.nbPays)),
    document.createTextNode(' pays comparés et '),
    noeudFort(String(m.nbTermes)),
    document.createTextNode(' termes définis. Une région rassemble en moyenne '),
    noeudFort(fmtInt(m.communesParRegion)),
    document.createTextNode(` communes (${fmtInt(m.communes)} ÷ ${fmtInt(m.regions)}) : ${fmtInt(m.communesParRegion)} fois la référence « 1 commune ».`),
  );
}

/* ---------- E095-05 / E095-06 : sélection et résumé ---------- */

function majSelection() {
  const d = S.dom;
  const niveau = NIVEAUX[S.niveau];
  if (!niveau) return;
  if (d.radios) {
    d.radios.forEach((radio, index) => {
      const actif = index === S.niveau;
      radio.checked = actif;
      radio.setAttribute('aria-checked', actif ? 'true' : 'false');
    });
  }
  if (d.lignes) {
    d.lignes.forEach((ligne, index) => {
      ligne.classList.toggle(`${PFX}-actif`, index === S.niveau);
    });
  }
  if (d.resume) {
    d.resume.textContent = '';
    d.resume.append(
      noeudFort(`${S.niveau + 1} / ${NIVEAUX.length} — ${niveau.nom} : `),
      document.createTextNode(`${niveau.defin} Repère : ${niveau.repere}. Exemple : ${niveau.exemple}.`),
    );
  }
}

function appliquerNiveau(index) {
  /* Garde d'état : une valeur non finie ne corrompt jamais S.niveau. */
  if (!Number.isFinite(index)) return;
  S.niveau = clamp(Math.round(index), 0, NIVEAUX.length - 1);
  majSelection();
}

/* ---------- E095-09 : curseur d'emboîtement et boucle rAF unique ---------- */

function majCurseur() {
  const d = S.dom;
  const exemple = EXEMPLES[S.autoIndex];
  if (!exemple) return;
  if (d.items) {
    d.items.forEach((li, index) => {
      li.classList.toggle(`${PFX}-encours`, index === S.autoIndex);
    });
  }
  if (d.sequence) {
    d.sequence.textContent = '';
    const prefixe = reduced()
      ? 'Lecture automatique arrêtée (mouvement réduit) — '
      : 'Lecture automatique — ';
    d.sequence.append(
      document.createTextNode(prefixe),
      noeudFort(`niveau ${S.autoIndex + 1} sur ${EXEMPLES.length} : ${exemple.niveau}`),
      document.createTextNode(` — ${exemple.nom} : ${exemple.note}`),
    );
  }
  drawCanvas();
}

function setAutoIndex(index) {
  if (!Number.isFinite(index)) return;
  S.autoIndex = clamp(Math.round(index), 0, NIVEAUX.length - 1);
  S.phase = S.autoIndex / NIVEAUX.length;
  majCurseur();
}

function arreterBoucle() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function demarrerBoucle() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (reduced()) return;
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

/* Un cycle complet des six niveaux en ~3 s (vitesse fixe 0,00032 / ms),
   sans aléa ni minuteur. `dt` est plafonné pour éviter les sauts. */
function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (reduced()) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    S.phase = (S.phase + dt * 0.00032) % 1;
  }
  S.lastTs = ts;
  const index = Math.min(NIVEAUX.length - 1, Math.floor(S.phase * NIVEAUX.length));
  if (index !== S.autoIndex) {
    S.autoIndex = index;
    majCurseur();
  } else {
    drawCanvas();
  }
  S.rafId = requestAnimationFrame(tick);
}

/* ---------- E095-10 : mouvement réduit, visibilité, robustesse ---------- */

function installerGlobal() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) arreterBoucle();
      else if (!reduced()) demarrerBoucle();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        let next = mq.matches;
        if (!next && S.ctxRef && typeof S.ctxRef.reducedMotion === 'function') {
          try { next = !!S.ctxRef.reducedMotion(); } catch { next = false; }
        }
        S.reduced = next;
        const panneau = document.getElementById(PANEL_ID);
        if (panneau) panneau.setAttribute('data-geography-v2-e095-reduced', S.reduced ? '1' : '0');
        if (S.reduced) {
          arreterBoucle();
          S.phase = 0;
          S.autoIndex = 0;
        }
        majCurseur();
        if (!S.reduced) demarrerBoucle();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

function onCanvasKey(event) {
  let next = S.autoIndex;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = S.autoIndex + 1;
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = S.autoIndex - 1;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = NIVEAUX.length - 1;
  else return;
  event.preventDefault();
  event.stopPropagation();
  setAutoIndex(next);
}

function teardown() {
  arreterBoucle();
  S.listeners.forEach(({ node, type, fn }) => {
    try { node.removeEventListener(type, fn); } catch { /* nœud déjà détaché */ }
  });
  S.listeners = [];
  const racines = [S.layoutRef, S.ctxRef && S.ctxRef.stage].filter(Boolean);
  racines.forEach((racine) => {
    if (!racine || typeof racine.querySelectorAll !== 'function') return;
    Array.from(racine.querySelectorAll(`[id^="${PFX}-"]`)).forEach((node) => node.remove());
  });
  S.dom = {};
  S.layoutRef = null;
}

/* ---------- constructeurs de contenu sémantique (lisibles sans JS) ---------- */

function construireGlossaire(el) {
  const dl = el('dl', `${PFX}-glossaire`);
  dl.id = GLOSSARY_ID;
  GLOSSAIRE.forEach(([terme, definition]) => {
    const dt = el('dt', '', terme);
    const dd = el('dd', '', definition);
    dl.append(dt, dd);
  });
  return dl;
}

function construireTableNiveaux(el) {
  const table = el('table', `${PFX}-table`);
  table.id = LEVELS_ID;
  table.appendChild(el('caption', '', 'Les six niveaux administratifs français, du plus vaste au plus fin ; la ligne surlignée suit le niveau choisi.'));
  const thead = el('thead', '');
  const hr = el('tr', '');
  ['Niveau', 'Rôle principal', 'Repère chiffré', 'Exemple'].forEach((titre) => {
    const th = el('th', '', titre);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = el('tbody', '');
  NIVEAUX.forEach((niveau, index) => {
    const tr = el('tr', '');
    tr.dataset.index = String(index);
    const th = el('th', '', `${index + 1}. ${niveau.nom}`);
    th.scope = 'row';
    tr.append(th, el('td', '', niveau.role), el('td', '', niveau.repere), el('td', '', niveau.exemple));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function construireImbrication(el) {
  const ol = el('ol', `${PFX}-imbrication`);
  ol.id = NESTING_ID;
  EXEMPLES.forEach((exemple) => {
    const li = el('li', '');
    li.append(el('span', `${PFX}-niveau`, `${exemple.niveau} : `), document.createTextNode(`${exemple.nom} — ${exemple.note}`));
    ol.appendChild(li);
  });
  return ol;
}

function construireSelecteur(el) {
  const fs = el('fieldset', `${PFX}-radios`);
  fs.id = SELECTOR_ID;
  fs.setAttribute('role', 'radiogroup');
  /* Avec role=radiogroup, la légende native n'est pas garantie comme nom
     accessible : on fournit un aria-label explicite (légende conservée). */
  fs.setAttribute('aria-label', 'Niveau administratif — choisir un rang de l’emboîtement');
  fs.appendChild(el('legend', '', 'Choisir un niveau administratif'));

  const radios = [];
  NIVEAUX.forEach((niveau, index) => {
    const row = el('div', `${PFX}-radio-row`);
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `${PFX}-niveau`;
    radio.id = `${PFX}-niveau-${niveau.code}`;
    radio.value = String(index);
    radio.checked = index === S.niveau;
    on(radio, 'change', () => {
      if (radio.checked) appliquerNiveau(index);
    });
    const label = el('label', '', `${niveau.nom} — ${niveau.repere}`);
    label.htmlFor = radio.id;
    row.append(radio, label);
    fs.appendChild(row);
    radios.push(radio);
  });
  return { fieldset: fs, radios };
}

function construireComparaisons(el) {
  const table = el('table', `${PFX}-table`);
  table.id = COMPARISONS_ID;
  table.appendChild(el('caption', '', 'Subdivision de premier niveau dans quelques pays : le nombre et le nom varient, le principe d’emboîtement reste.'));
  const thead = el('thead', '');
  const hr = el('tr', '');
  ['Pays', 'Subdivision de premier niveau', 'Nombre'].forEach((titre) => {
    const th = el('th', '', titre);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = el('tbody', '');
  COMPARAISONS.forEach(([pays, subdivision, nombre]) => {
    const tr = el('tr', '');
    const th = el('th', '', pays);
    th.scope = 'row';
    tr.append(th, el('td', '', subdivision), el('td', '', fmtInt(nombre)));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- feuille de style unique, isolée par le préfixe ---------- */

const CSS = `
#${PANEL_ID}[hidden]{display:none!important}
#${PANEL_ID}{
  margin:14px 0 6px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${TITLE_ID}{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} p{margin:5px 0;max-width:70ch}
.${PFX}-lead{color:var(--muted)}
.${PFX}-intro{color:var(--muted)}
.${PFX}-glossaire{margin:6px 0;padding:0}
.${PFX}-glossaire dt{margin-top:7px;font-weight:600;color:var(--gold-bright,#f4d69e)}
.${PFX}-glossaire dd{margin:2px 0 0;padding-left:10px;border-left:2px solid var(--gold,#e6b96f)}
.${PFX}-table{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px}
.${PFX}-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
.${PFX}-table th,.${PFX}-table td{border:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}
.${PFX}-table thead th{color:var(--gold-bright,#f4d69e);font-weight:600}
.${PFX}-table tbody tr.${PFX}-actif{background:rgba(230,185,111,.14)}
.${PFX}-table tbody tr.${PFX}-actif th{color:var(--gold-bright,#f4d69e)}
.${PFX}-imbrication{margin:6px 0;padding-left:22px}
.${PFX}-imbrication li{margin:4px 0;padding:3px 5px;border-radius:4px}
.${PFX}-imbrication li.${PFX}-encours{background:rgba(230,185,111,.14);box-shadow:inset 3px 0 0 var(--gold,#e6b96f)}
.${PFX}-niveau{font-weight:600;color:var(--gold-bright,#f4d69e)}
#${SELECTOR_ID}{margin:8px 0;padding:8px;border:1px solid var(--line);border-radius:8px}
#${SELECTOR_ID} legend{padding:0 4px;font-size:11px;color:var(--gold-bright,#f4d69e)}
.${PFX}-radio-row{display:flex;align-items:center;gap:8px;min-height:36px}
.${PFX}-radio-row input{width:24px;height:24px;margin:0;accent-color:var(--gold,#e6b96f)}
.${PFX}-radio-row label{cursor:pointer}
.${PFX}-nav{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.${PFX}-btn{
  min-width:40px;min-height:40px;padding:0 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(8,12,18,.86);color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
}
.${PFX}-btn:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.14)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${SUMMARY_ID},#${SEQUENCE_ID},#${READOUT_ID}{
  min-height:34px;margin-top:8px;padding:7px 8px;border:1px solid var(--line);
  border-radius:8px;background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);
  font-size:10px;font-variant-numeric:tabular-nums;
}
#${SEQUENCE_ID} strong,#${SUMMARY_ID} strong,#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${CANVAS_ID}{
  display:block;width:100%;max-width:${CW}px;height:auto;margin:8px 0;
  border:1px solid var(--line);border-radius:8px;touch-action:none;cursor:default;
}
#${PANEL_ID}[data-geography-v2-e095-reduced="1"] .${PFX}-imbrication li.${PFX}-encours{background:none;box-shadow:inset 3px 0 0 var(--gold,#e6b96f)}
@media (prefers-reduced-motion:reduce){#${PANEL_ID} *{transition:none!important;animation:none!important}}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${PANEL_ID} .${PFX}-table{font-size:9px}
}
`;

/* ---------- point d'entrée ---------- */

register('E095', (ctx) => {
  if (!ctx || typeof document === 'undefined') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const portee = ctx.layout || ctx.stage;
  if (!portee) return;

  S.ctxRef = ctx;
  ctx.css(CSS_ID, CSS);
  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;

  teardown();

  const el = ctx.el;
  const host = (typeof portee.querySelector === 'function' && portee.querySelector('.geo-panel')) || portee;
  S.layoutRef = portee;

  /* E095-01 : section sémantique complète, lisible sans animation. */
  const section = el('section', '');
  section.id = PANEL_ID;
  section.setAttribute('aria-labelledby', TITLE_ID);
  const titre = el('h2', '', 'Régions et subdivisions administratives');
  titre.id = TITLE_ID;
  const lede = paragraphe(`${PFX}-lead`, 'Un territoire national ne se découpe pas d’un seul bloc : il s’emboîte en niveaux, de l’État à la commune. Cette fiche explique ces niveaux, donne des repères chiffrés et montre comment le même principe varie d’un pays à l’autre. Tout le texte ci-dessous est lisible sans animation.');
  section.append(titre, lede);

  /* E095-02 : glossaire. */
  section.append(el('h3', '', 'Vocabulaire'));
  section.append(paragraphe(`${PFX}-intro`, 'Les termes ci-dessous sont définis dès leur première occurrence dans la fiche.'));
  section.append(construireGlossaire(el));

  /* E095-03 : tableau hiérarchique des six niveaux. */
  section.append(el('h3', '', 'Les six niveaux, du plus vaste au plus fin'));
  section.append(paragraphe(`${PFX}-intro`, 'Chaque ligne est un rang de l’emboîtement : la région contient des départements, le département des arrondissements, et ainsi de suite jusqu’à la commune.'));
  section.append(construireTableNiveaux(el));

  /* E095-04 : chaîne d'emboîtement commentée. */
  section.append(el('h3', '', 'Emboîtement : de l’État à la commune'));
  section.append(paragraphe(`${PFX}-intro`, 'La chaîne suivante suit un même fil, de la souveraineté nationale jusqu’à l’échelon de proximité. Le surlignage est piloté par le curseur de lecture, mais le texte reste lisible quand il est arrêté.'));
  section.append(construireImbrication(el));

  /* E095-05 : radiogroupe de sélection + résumé textuel. */
  section.append(el('h3', '', 'Choisir un niveau'));
  section.append(paragraphe(`${PFX}-intro`, 'Sélectionnez un niveau avec les boutons radio (flèches du clavier comprises), avec les boutons précédent et suivant, ou avec les flèches sur le schéma. Le résumé et le surlignage du tableau se mettent à jour.'));
  const selecteur = construireSelecteur(el);
  section.append(selecteur.fieldset);
  const resume = paragraphe('', '');
  resume.id = SUMMARY_ID;
  section.append(resume);

  /* E095-06 : navigation séquentielle, cibles ≥ 36 px. */
  const nav = el('div', `${PFX}-nav`);
  const prev = el('button', `${PFX}-btn`, '← Niveau précédent');
  prev.type = 'button';
  prev.id = PREV_ID;
  prev.setAttribute('aria-label', 'Niveau précédent — choisir le rang administratif inférieur');
  on(prev, 'click', () => appliquerNiveau(S.niveau - 1));
  const next = el('button', `${PFX}-btn`, 'Niveau suivant →');
  next.type = 'button';
  next.id = NEXT_ID;
  next.setAttribute('aria-label', 'Niveau suivant — choisir le rang administratif supérieur');
  on(next, 'click', () => appliquerNiveau(S.niveau + 1));
  nav.append(prev, next);
  section.append(nav);

  /* E095-07 : comparaison internationale. */
  section.append(el('h3', '', 'Un découpage qui varie selon les pays'));
  section.append(paragraphe(`${PFX}-intro`, 'Les noms et les effectifs changent, mais l’idée d’un premier niveau de subdivision se retrouve presque partout.'));
  section.append(construireComparaisons(el));

  /* E095-09 : lecture automatique, texte + canvas déterministe. */
  section.append(el('h3', '', 'Lecture automatique de l’emboîtement'));
  const sequence = paragraphe('', '');
  sequence.id = SEQUENCE_ID;
  section.append(sequence);
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Schéma d’emboîtement des six niveaux administratifs, de l’État à la commune. Appuyez sur les flèches droite et gauche pour parcourir les niveaux, Début et Fin pour les extrémités.');
  on(canvas, 'keydown', onCanvasKey);
  section.append(canvas);

  /* E095-08 : annonce accessible, visible et indexable. */
  const readout = paragraphe('', 'Repères — 6 niveaux emboîtés, 6 pays comparés et 6 termes définis. Une région rassemble en moyenne 1 939 communes (34 900 ÷ 18) : 1 939 fois la référence « 1 commune ».');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  section.append(readout);

  if (typeof host.insertBefore === 'function') host.insertBefore(section, host.firstChild);
  else host.appendChild(section);

  S.dom = {
    panel: section,
    radios: selecteur.radios,
    lignes: Array.from(section.querySelectorAll(`#${LEVELS_ID} tbody tr`)),
    items: Array.from(section.querySelectorAll(`#${NESTING_ID} li`)),
    resume,
    sequence,
    canvas,
    readout,
    prev,
    next,
  };

  section.setAttribute('data-geography-v2-e095-reduced', S.reduced ? '1' : '0');
  if (S.reduced) {
    arreterBoucle();
    S.phase = 0;
    S.autoIndex = 0;
  }

  majReadout();
  majSelection();
  majCurseur();
  installerGlobal();
  if (!S.reduced) demarrerBoucle();
});
