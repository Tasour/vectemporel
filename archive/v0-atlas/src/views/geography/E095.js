import { register } from './registry.js';

/* Lentille E095 — vue GEOGRAPHIE.
 * Thème : régions et subdivisions administratives.
 *
 * Dix chantiers E095-01 … E095-10, tous réellement implémentés (aucun stub),
 * décrits dans UNIFIED_AUDIT/GEOGRAPHIE/views/E095.md. La lentille est une
 * couche pédagogique locale posée par-dessus le DOM produit par geography.js :
 * elle n'est ni une vue ni un store, elle ne modifie aucun fichier partagé.
 *
 * Le contenu substantiel est du texte sémantique réel (section, h2/h3, p, dl,
 * table, ol/li, fieldset/radiogroup) inséré dans le DOM : il reste lisible,
 * indexable et consultable même quand le laboratoire d'animation est à
 * l'arrêt ou le mouvement réduit activé. Aucun canvas n'est employé ; la seule
 * animation est un curseur d'emboîtement déterministe (une boucle rAF unique,
 * pause sur document.hidden, respect du mouvement réduit).
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() } (registry.js:28-44).
 */

const CSS_ID = 'geography-e095';
const P = 'geography-e095';

/* Identifiants, tous préfixés `geography-e095-`. */
const PANEL_ID = `${P}-panel`;
const TITLE_ID = `${P}-title`;
const GLOSSAIRE_ID = `${P}-glossary`;
const NIVEAUX_ID = `${P}-levels`;
const IMBRICATION_ID = `${P}-nesting`;
const SELECTEUR_ID = `${P}-selector`;
const RESUME_ID = `${P}-summary`;
const COMPARAISONS_ID = `${P}-comparisons`;
const SEQUENCE_ID = `${P}-sequence`;
const READOUT_ID = `${P}-readout`;
const PREV_ID = `${P}-prev`;
const NEXT_ID = `${P}-next`;

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  niveau: 0,          /* index du niveau choisi par l'utilisateur [0,5] */
  phase: 0,           /* phase déterministe du curseur automatique [0,1) */
  autoIndex: 0,       /* index du niveau montré par le curseur automatique */
  lastTs: 0,
  rafId: 0,
  reduced: false,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* Niveaux administratifs français, du plus vaste au plus fin.
   Les repères chiffrés sont des ordres de grandeur administratifs stables ;
   `valeur` sert au calcul du message d'état, `repere` est l'affichage. */
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
    defin: 'Collectivité intermédiaire entre la région et la commune, chef-lieu en préfecture.',
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

/* Glossaire : chaque terme est défini à sa première occurrence. */
const GLOSSAIRE = [
  ['Subdivision administrative', 'Partie d’un territoire délimitée par l’autorité publique, dotée d’un statut, d’un nom et souvent d’une collectivité ou d’un service déconcentré.'],
  ['Niveau hiérarchique', 'Rang occupé par une subdivision dans l’emboîtement des territoires : un département est d’un rang inférieur à la région qui le contient.'],
  ['Collectivité territoriale', 'Personne morale de droit public (région, département, commune) disposant d’un conseil élu et d’un budget propre.'],
  ['Administration déconcentrée', 'Service de l’État réparti sur le territoire (préfecture, sous-préfecture), distinct des collectivités élues.'],
  ['Emboîtement', 'Propriété d’un découpage où chaque niveau contient plusieurs unités du niveau suivant, à la manière de poupées russes.'],
  ['Chef-lieu', 'Localité où siège l’administration d’une subdivision : la préfecture pour un département, par exemple.'],
];

/* Chaîne d'exemples réels, du plus vaste au plus fin. */
const EXEMPLES = [
  { niveau: 'État', nom: 'France', note: 'Souveraineté unique ; référence de tout le découpage.' },
  { niveau: 'Région', nom: 'Occitanie', note: 'Région du Sud créée en 2016 par fusion de deux anciennes régions.' },
  { niveau: 'Département', nom: 'Haute-Garonne (31)', note: 'Département dont le chef-lieu est la préfecture de Toulouse.' },
  { niveau: 'Arrondissement', nom: 'Arrondissement de Toulouse', note: 'Circonscription de l’administration préfectorale.' },
  { niveau: 'Canton', nom: 'Canton de Toulouse-1', note: 'Circonscription électorale départementale.' },
  { niveau: 'Commune', nom: 'Toulouse', note: 'Commune la plus peuplée de la région Occitanie.' },
];

/* Subdivisions de premier niveau à l'étranger : le découpage n'est pas universel. */
const COMPARAISONS = [
  ['France', 'Régions', 18],
  ['Allemagne', 'Länder (États fédérés)', 16],
  ['Espagne', 'Communautés autonomes', 17],
  ['Italie', 'Régions', 20],
  ['Belgique', 'Régions', 3],
  ['États-Unis', 'États', 50],
];

/* ---------- Formatage déterministe (aucune dépendance locale réseau) ---------- */

const fmtInt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');

/* ---------- Feuille de style unique ---------- */

const CSS = `
#${PANEL_ID}[hidden]{display:none!important}
#${PANEL_ID}{
  margin:12px 0 6px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} p{margin:5px 0;max-width:70ch}
#${PANEL_ID} .${P}-lede{color:var(--muted)}
#${PANEL_ID} .${P}-intro{color:var(--muted)}
.${P}-glossaire{margin:6px 0;padding:0}
.${P}-glossaire dt{margin-top:7px;font-weight:600;color:var(--gold-bright,#f4d69e)}
.${P}-glossaire dd{margin:2px 0 0;padding-left:10px;border-left:2px solid var(--gold,#e6b96f)}
.${P}-table{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px}
.${P}-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
.${P}-table th,.${P}-table td{border:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}
.${P}-table thead th{color:var(--gold-bright,#f4d69e);font-weight:600}
.${P}-table tbody tr.${P}-actif{background:rgba(230,185,111,.14)}
.${P}-table tbody tr.${P}-actif th{color:var(--gold-bright,#f4d69e)}
.${P}-imbrication{margin:6px 0;padding-left:22px}
.${P}-imbrication li{margin:4px 0;padding:3px 5px;border-radius:4px}
.${P}-imbrication li.${P}-encours{background:rgba(230,185,111,.14);box-shadow:inset 3px 0 0 var(--gold,#e6b96f)}
.${P}-imbrication .${P}-niveau{font-weight:600;color:var(--gold-bright,#f4d69e)}
.${P}-radios{margin:8px 0;padding:8px;border:1px solid var(--line);border-radius:8px}
.${P}-radios legend{padding:0 4px;font-size:11px;color:var(--gold-bright,#f4d69e)}
.${P}-radio-row{display:flex;align-items:center;gap:8px;min-height:30px}
.${P}-radio-row input{width:24px;height:24px;margin:0;accent-color:var(--gold,#e6b96f)}
.${P}-radio-row label{cursor:pointer}
.${P}-nav{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
#${PREV_ID},#${NEXT_ID}{
  min-width:44px;min-height:44px;padding:0 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(8,12,18,.86);color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
}
#${PREV_ID}:hover,#${NEXT_ID}:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.14)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#${RESUME_ID},#${SEQUENCE_ID},#${READOUT_ID}{
  min-height:34px;margin-top:8px;padding:7px 8px;border:1px solid var(--line);
  border-radius:8px;background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);
  font-size:10px;font-variant-numeric:tabular-nums;
}
#${SEQUENCE_ID} strong,#${RESUME_ID} strong,#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${PANEL_ID}[data-${P}-reduced="1"] .${P}-imbrication li.${P}-encours{background:none;box-shadow:inset 3px 0 0 var(--gold,#e6b96f)}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} *{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${PANEL_ID} .${P}-table{font-size:9px}
  #${PREV_ID},#${NEXT_ID}{min-width:44px;min-height:44px}
}
`;

/* ----------Constructeurs de contenu sémantique ---------- */

function paragraphe(classe, texte) {
  const n = document.createElement('p');
  if (classe) n.className = classe;
  if (texte !== undefined) n.textContent = texte;
  return n;
}

function construireGlossaire() {
  const dl = document.createElement('dl');
  dl.id = GLOSSAIRE_ID;
  dl.className = `${P}-glossaire`;
  GLOSSAIRE.forEach(([terme, definition]) => {
    const dt = document.createElement('dt');
    dt.textContent = terme;
    const dd = document.createElement('dd');
    dd.textContent = definition;
    dl.append(dt, dd);
  });
  return dl;
}

function construireTableNiveaux() {
  const table = document.createElement('table');
  table.id = NIVEAUX_ID;
  table.className = `${P}-table`;
  const caption = document.createElement('caption');
  caption.textContent = 'Les six niveaux administratifs français, du plus vaste au plus fin ; les lignes surlignées suivent le niveau choisi.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Niveau', 'Rôle principal', 'Repère chiffré', 'Exemple'].forEach((t) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = t;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  NIVEAUX.forEach((niveau, index) => {
    const tr = document.createElement('tr');
    tr.dataset.index = String(index);
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = `${index + 1}. ${niveau.nom}`;
    const role = document.createElement('td');
    role.textContent = niveau.role;
    const repere = document.createElement('td');
    repere.textContent = niveau.repere;
    const exemple = document.createElement('td');
    exemple.textContent = niveau.exemple;
    tr.append(th, role, repere, exemple);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function construireImbrication() {
  const ol = document.createElement('ol');
  ol.id = IMBRICATION_ID;
  ol.className = `${P}-imbrication`;
  EXEMPLES.forEach((exemple) => {
    const li = document.createElement('li');
    const rang = document.createElement('span');
    rang.className = `${P}-niveau`;
    rang.textContent = `${exemple.niveau} : `;
    li.append(rang, document.createTextNode(`${exemple.nom} — ${exemple.note}`));
    ol.appendChild(li);
  });
  return ol;
}

function construireSelecteur() {
  const fs = document.createElement('fieldset');
  fs.id = SELECTEUR_ID;
  fs.className = `${P}-radios`;
  fs.setAttribute('role', 'radiogroup');
  /* Avec role=radiogroup, la légende native n'est pas garantie comme nom
     accessible : on fournit un aria-label explicite (la légende reste visible). */
  fs.setAttribute('aria-label', 'Niveau administratif — choisir un rang de l’emboîtement');
  const legend = document.createElement('legend');
  legend.textContent = 'Choisir un niveau administratif';
  fs.appendChild(legend);

  NIVEAUX.forEach((niveau, index) => {
    const row = document.createElement('div');
    row.className = `${P}-radio-row`;
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `${P}-niveau`;
    radio.id = `${P}-niveau-${niveau.code}`;
    radio.value = String(index);
    radio.checked = index === S.niveau;
    const label = document.createElement('label');
    label.htmlFor = radio.id;
    label.textContent = `${niveau.nom} — ${niveau.repere}`;
    row.append(radio, label);
    fs.appendChild(row);
  });
  return fs;
}

function construireComparaisons() {
  const table = document.createElement('table');
  table.id = COMPARAISONS_ID;
  table.className = `${P}-table`;
  const caption = document.createElement('caption');
  caption.textContent = 'Subdivision de premier niveau dans quelques pays : le nombre et le nom varient, le principe d’emboîtement reste.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Pays', 'Subdivision de premier niveau', 'Nombre'].forEach((t) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = t;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  COMPARAISONS.forEach(([pays, subdivision, nombre]) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = pays;
    const tdSub = document.createElement('td');
    tdSub.textContent = subdivision;
    const tdNb = document.createElement('td');
    tdNb.textContent = fmtInt(nombre);
    tr.append(th, tdSub, tdNb);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function bouton(id, label, ariaLabel) {
  const b = document.createElement('button');
  b.type = 'button';
  b.id = id;
  b.textContent = label;
  b.setAttribute('aria-label', ariaLabel);
  return b;
}

function construirePanel() {
  const panel = document.createElement('section');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const titre = document.createElement('h2');
  titre.id = TITLE_ID;
  titre.textContent = 'Régions et subdivisions administratives';

  const lede = paragraphe(`${P}-lede`, 'Un territoire national ne se découpe pas d’un seul bloc : il s’emboîte en niveaux, de l’État à la commune. Cette fiche explique ces niveaux, donne des repères chiffrés et montre comment le même principe varie d’un pays à l’autre. Tout le texte ci-dessous est lisible sans animation.');

  const hGlossaire = document.createElement('h3');
  hGlossaire.textContent = 'Vocabulaire';
  const introGlossaire = paragraphe(`${P}-intro`, 'Les termes ci-dessous sont définis dès leur première occurrence dans la fiche.');

  const hNiveaux = document.createElement('h3');
  hNiveaux.textContent = 'Les six niveaux, du plus vaste au plus fin';
  const introNiveaux = paragraphe(`${P}-intro`, 'Chaque ligne est un rang de l’emboîtement : la région contient des départements, le département des arrondissements, et ainsi de suite jusqu’à la commune.');

  const hImbrication = document.createElement('h3');
  hImbrication.textContent = 'Emboîtement : de l’État à la commune';
  const introImbrication = paragraphe(`${P}-intro`, 'La chaîne suivante suit un même fil, de la souveraineté nationale jusqu’à l’échelon de proximité. Le surlignage est piloté par le curseur de lecture ; le texte reste lisible quand il est arrêté.');

  const hSelecteur = document.createElement('h3');
  hSelecteur.textContent = 'Choisir un niveau';
  const introSelecteur = paragraphe(`${P}-intro`, 'Sélectionnez un niveau avec les boutons radio (flèches du clavier comprises) ou avec les boutons précédent et suivant. Le résumé et le surlignage du tableau se mettent à jour.');

  const resume = paragraphe('', '');
  resume.id = RESUME_ID;
  const nav = document.createElement('div');
  nav.className = `${P}-nav`;
  nav.append(
    bouton(PREV_ID, '← Niveau précédent', 'Niveau précédent — choisir le rang administratif inférieur'),
    bouton(NEXT_ID, 'Niveau suivant →', 'Niveau suivant — choisir le rang administratif supérieur'),
  );

  const hComparaisons = document.createElement('h3');
  hComparaisons.textContent = 'Un découpage qui varie selon les pays';
  const introComparaisons = paragraphe(`${P}-intro`, 'Les noms et les effectifs changent, mais l’idée d’un premier niveau de subdivision se retrouve presque partout.');

  const hSequence = document.createElement('h3');
  hSequence.textContent = 'Lecture automatique de l’emboîtement';
  const sequence = paragraphe('', '');
  sequence.id = SEQUENCE_ID;

  const readout = paragraphe('', '');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  panel.append(
    titre, lede,
    hGlossaire, introGlossaire, construireGlossaire(),
    hNiveaux, introNiveaux, construireTableNiveaux(),
    hImbrication, introImbrication, construireImbrication(),
    hSelecteur, introSelecteur, construireSelecteur(), resume, nav,
    hComparaisons, introComparaisons, construireComparaisons(),
    hSequence, sequence,
    readout,
  );
  return panel;
}

/* ---------- Ancrage et gardes anti-doublon ---------- */

function hostCible(ctx) {
  const portee = ctx.layout || ctx.stage;
  const panneau = portee && typeof portee.querySelector === 'function'
    ? portee.querySelector('.geo-panel')
    : null;
  return panneau || portee || ctx.stage;
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      radios: Array.from(existant.querySelectorAll('input[type="radio"]')),
      lignes: Array.from(existant.querySelectorAll(`#${NIVEAUX_ID} tbody tr`)),
      items: Array.from(existant.querySelectorAll(`#${IMBRICATION_ID} li`)),
      resume: document.getElementById(RESUME_ID),
      sequence: document.getElementById(SEQUENCE_ID),
      readout: document.getElementById(READOUT_ID),
      prev: document.getElementById(PREV_ID),
      next: document.getElementById(NEXT_ID),
    };
  }

  const panel = construirePanel();
  const host = hostCible(ctx);
  if (host && typeof host.insertBefore === 'function') host.insertBefore(panel, host.firstChild);
  else if (host && typeof host.appendChild === 'function') host.appendChild(panel);

  return {
    panel,
    fresh: true,
    radios: Array.from(panel.querySelectorAll('input[type="radio"]')),
    lignes: Array.from(panel.querySelectorAll(`#${NIVEAUX_ID} tbody tr`)),
    items: Array.from(panel.querySelectorAll(`#${IMBRICATION_ID} li`)),
    resume: document.getElementById(RESUME_ID),
    sequence: document.getElementById(SEQUENCE_ID),
    readout: document.getElementById(READOUT_ID),
    prev: document.getElementById(PREV_ID),
    next: document.getElementById(NEXT_ID),
  };
}

/* ---------- Mesures dérivées des données (aucun chiffre inventé) ---------- */

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

function noeudFort(texte) {
  const n = document.createElement('strong');
  n.textContent = texte;
  return n;
}

function majReadout() {
  const n = S.nodes.readout;
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

/* ---------- Synchronisation du niveau choisi et du curseur ---------- */

function majSelection() {
  const n = S.nodes;
  const niveau = NIVEAUX[S.niveau];
  if (!niveau) return;

  n.radios.forEach((radio, index) => {
    radio.checked = index === S.niveau;
    radio.setAttribute('aria-checked', index === S.niveau ? 'true' : 'false');
  });
  n.lignes.forEach((ligne, index) => {
    ligne.classList.toggle(`${P}-actif`, index === S.niveau);
  });
  if (n.resume) {
    n.resume.textContent = '';
    n.resume.append(
      noeudFort(`${S.niveau + 1} / ${NIVEAUX.length} — ${niveau.nom} : `),
      document.createTextNode(`${niveau.defin} Repère : ${niveau.repere}. Exemple : ${niveau.exemple}.`),
    );
  }
}

function majCurseur() {
  const n = S.nodes;
  const exemple = EXEMPLES[S.autoIndex];
  if (!exemple) return;
  n.items.forEach((li, index) => {
    li.classList.toggle(`${P}-encours`, index === S.autoIndex);
  });
  if (n.sequence) {
    n.sequence.textContent = '';
    const prefixe = S.reduced
      ? 'Lecture automatique arrêtée (mouvement réduit) — '
      : 'Lecture automatique — ';
    n.sequence.append(
      document.createTextNode(prefixe),
      noeudFort(`niveau ${S.autoIndex + 1} sur ${EXEMPLES.length} : ${exemple.niveau}`),
      document.createTextNode(` — ${exemple.nom} : ${exemple.note}`),
    );
  }
}

function appliquerNiveau(index) {
  /* Garde d'état : une valeur non finie ne doit jamais corrompre S.niveau. */
  if (!Number.isFinite(index)) return;
  S.niveau = Math.max(0, Math.min(NIVEAUX.length - 1, index));
  majSelection();
}

/* ---------- Boucle rAF unique, pause sur document.hidden ---------- */

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
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

/* Curseur déterministe : parcourt les six niveaux en environ 3 s (soit ~0,5 s
 * par niveau), sans aléa ni minuteur. */
function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.reduced) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    S.phase = (S.phase + dt * 0.00032) % 1;
  }
  S.lastTs = ts;
  const index = Math.min(EXEMPLES.length - 1, Math.floor(S.phase * EXEMPLES.length));
  if (index !== S.autoIndex) {
    S.autoIndex = index;
    majCurseur();
  }
  S.rafId = requestAnimationFrame(tick);
}

/* ---------- Écouteurs globaux posés une seule fois ---------- */

function installerGlobal(ctx) {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) arreterBoucle();
      else if (!S.reduced) demarrerBoucle();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = mq.matches;
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset[`${P}Reduced`] = S.reduced ? '1' : '0';
        if (S.reduced) {
          arreterBoucle();
          S.phase = 0;
          S.autoIndex = 0;
        } else {
          demarrerBoucle();
        }
        majCurseur();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

/* ---------- Point d'entrée ---------- */

register('E095', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;

  S.nodes = ensurePanel(ctx);
  const n = S.nodes;
  if (!n.panel || !n.readout) return;

  n.panel.dataset[`${P}Reduced`] = S.reduced ? '1' : '0';
  if (S.reduced) {
    arreterBoucle();
    S.phase = 0;
    S.autoIndex = 0;
  }

  majReadout();
  majSelection();
  majCurseur();

  if (n.fresh) {
    n.radios.forEach((radio, index) => {
      radio.addEventListener('change', () => {
        if (radio.checked) appliquerNiveau(index);
      });
    });
    if (n.prev) n.prev.addEventListener('click', () => appliquerNiveau(S.niveau - 1));
    if (n.next) n.next.addEventListener('click', () => appliquerNiveau(S.niveau + 1));
  }

  installerGlobal(ctx);
  if (!S.reduced) demarrerBoucle();
});
