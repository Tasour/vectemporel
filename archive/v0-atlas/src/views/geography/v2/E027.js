import { register } from './registry.js';

/* V2 — lentille E027 (vague GEOGRAPHIE, seconde passe).
 * Thème : littoral et marées.
 *
 * Les dix chantiers E027-01 … E027-10 sont réellement implémentés ici :
 *   01 badge de nature schématique posé sur la carte sans donnée locale ;
 *   02 fiche de vérité et glossaire en texte sémantique lisible sans JS ;
 *   03 tableau des phases et mesures référencées, toutes recalculées ;
 *   04 sélecteur de phase en radiogroupe + curseur d'heure lunaire ;
 *   05 laboratoire canvas unique : coupe de plage et courbe de marée ;
 *   06 readout role=status aria-live=polite annonçant chaque grandeur ;
 *   07 bandeau comparatif viv'eau / morte-eau (échelle relative) ;
 *   08 navigation clavier complète, cibles ≥ 36 px et focus visible ;
 *   09 défi falsifiable en cinq temps et limite du modèle global ;
 *   10 hygiène du greffon : rAF unique, pauses, idempotence, zéro aléa.
 *
 * Tout est local : aucune requête réseau, aucune graine aléatoire, aucune
 * sortie de débogage, aucun fichier partagé modifié. Le savoir est du texte
 * sémantique présent dans le DOM même sans JavaScript ; le canvas n'est qu'un
 * laboratoire qui illustre une sinusoïde astronomique déterministe et ne détient
 * aucune donnée exclusive. Aucune hauteur n'est exprimée en mètres : l'amplitude
 * lunaire seule sert de référence 1,00.
 *
 * ctx = { viewId, stage, layout, css(id, rules), el(tag, cls, text),
 *         reducedMotion() }.
 */

/* ---------- Identifiants (tous préfixés geography-v2-e027-) ---------- */

const CSS_ID = 'geography-v2-e027';
const PANEL_ID = 'geography-v2-e027-panel';
const TITLE_ID = 'geography-v2-e027-title';
const PHASE_ID = 'geography-v2-e027-phase';
const RADIO_NAME = 'geography-v2-e027-phase-choice';
const HEURE_ID = 'geography-v2-e027-heure';
const HEURE_OUT_ID = 'geography-v2-e027-heure-value';
const CANVAS_ID = 'geography-v2-e027-canvas';
const LEGEND_ID = 'geography-v2-e027-legend';
const READOUT_ID = 'geography-v2-e027-readout';
const PLAY_ID = 'geography-v2-e027-play';
const TABLE_ID = 'geography-v2-e027-table';
const MESURES_ID = 'geography-v2-e027-mesures';
const ECHELLE_ID = 'geography-v2-e027-echelle';
const LIMITE_ID = 'geography-v2-e027-limite';
const BADGE_ID = 'geography-v2-e027-badge';

/* ---------- Constantes astronomiques de référence (aucune donnée locale) ---------- */

const T_DEMI_JOUR_H = 12 + 25 / 60;          /* 12 h 25 min entre deux hautes mers */
const T_JOUR_LUNAIRE_H = 2 * T_DEMI_JOUR_H;  /* 24 h 50 min */
const MOIS_SYNODIQUE_J = 29.53;              /* cycle des phases de la Lune */
const RATIO_SOLEIL_LUNE = 0.46;              /* force génératrice Solaire / Lunaire */
const AMP_LUNE = 1;                          /* référence : amplitude lunaire = 1,00 */
const AMP_VIVE_EAU = AMP_LUNE + RATIO_SOLEIL_LUNE; /* 1,46 */
const MARNAGE_MAX = 2 * AMP_VIVE_EAU;              /* 2,92 */

/* E027-03 : quatre phases canoniques. `signe` = +1 en syzygie, −1 en quadrature. */
const PHASES = [
  { id: 'nouvelle', nom: 'Nouvelle lune', alignement: 'Syzygie', regime: 'Viv’eau', signe: 1 },
  { id: 'premier-quart', nom: 'Premier quartier', alignement: 'Quadrature', regime: 'Morte-eau', signe: -1 },
  { id: 'pleine', nom: 'Pleine lune', alignement: 'Syzygie', regime: 'Viv’eau', signe: 1 },
  { id: 'dernier-quart', nom: 'Dernier quartier', alignement: 'Quadrature', regime: 'Morte-eau', signe: -1 },
];

/* ---------- État de module (survit à la reconstruction du `stage` par la coque) ---------- */

const S = {
  phase: 'nouvelle',
  t: T_DEMI_JOUR_H / 4, /* première marée haute visible */
  jouant: false,
  dernierTs: 0,
  rafId: 0,
  visible: true,
  visibiliteLiee: false,
  intersectionLiee: false,
  mouvementLie: false,
  noeuds: {},
  reducedMotion: null,
};

/* ---------- Utilitaires déterministes ---------- */

const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
const fmtHm = (h) => {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${hh} h ${String(mm).padStart(2, '0')} min`;
};
const phaseCourante = () => PHASES.find((p) => p.id === S.phase) || PHASES[0];
const amplitude = (p) => AMP_LUNE + p.signe * RATIO_SOLEIL_LUNE;
const marnage = (p) => 2 * amplitude(p);
const hauteur = (t, p) => amplitude(p) * Math.sin((2 * Math.PI * t) / T_DEMI_JOUR_H);
const repliMouvement = () => {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  } catch { return false; }
};
const reducedNow = () => {
  if (typeof S.reducedMotion === 'function') return !!S.reducedMotion();
  return repliMouvement();
};

/* ---------- Feuille de style unique, injectée une seule fois (E027-01 / 10) ---------- */

const CSS = `
#geography-v2-e027-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-v2-e027-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-v2-e027-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-v2-e027-panel p{margin:5px 0;max-width:68ch}
#geography-v2-e027-panel ul,#geography-v2-e027-panel ol{margin:5px 0;padding-left:20px;max-width:68ch}
#geography-v2-e027-panel li{margin:3px 0}
.geography-v2-e027-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
.geography-v2-e027-glossaire{margin:8px 0;padding:0;font-size:10px}
.geography-v2-e027-glossaire dt{font-weight:600;color:var(--gold-bright,#f4d69e);margin-top:5px}
.geography-v2-e027-glossaire dd{margin:1px 0 0 12px;max-width:64ch;color:var(--ink-soft,#d7d1c6)}
#geography-v2-e027-table{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px;font-variant-numeric:tabular-nums}
#geography-v2-e027-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-v2-e027-table th,#geography-v2-e027-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-v2-e027-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-v2-e027-mesures li{font-variant-numeric:tabular-nums}
#geography-v2-e027-phase{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-v2-e027-phase legend{padding:0 4px;color:var(--muted)}
#geography-v2-e027-panel .geography-v2-e027-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:6px;
  padding:2px 6px;cursor:pointer;
}
#geography-v2-e027-panel .geography-v2-e027-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#geography-v2-e027-heure{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
#geography-v2-e027-heure-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-v2-e027-canvas{
  display:block;width:100%;height:300px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
.geography-v2-e027-legend{font-size:10px;color:var(--muted)}
#geography-v2-e027-readout{
  min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-v2-e027-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-v2-e027-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-v2-e027-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-v2-e027-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#geography-v2-e027-limite{margin:10px 0 0;padding:8px 10px;border:1px dashed var(--line);border-radius:8px}
#geography-v2-e027-echelle{margin:8px 0;padding:0;font-size:10px;color:var(--ink-soft,#d7d1c6)}
#geography-v2-e027-echelle li{font-variant-numeric:tabular-nums}
.geography-v2-e027-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#geography-v2-e027-panel[data-geography-v2-e027-reduced="1"] button,
#geography-v2-e027-panel[data-geography-v2-e027-reduced="1"] .geography-v2-e027-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-v2-e027-panel button,.geography-v2-e027-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-v2-e027-panel{font-size:10px;padding:9px}
  #geography-v2-e027-canvas{height:252px}
  #geography-v2-e027-panel .geography-v2-e027-choix{margin-right:4px}
}
`;

/* ---------- E027-02 : fiche de vérité et glossaire, lisibles sans JavaScript ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Une marée est la variation périodique du niveau de la mer causée par les forces génératrices de la Lune et du Soleil ; elle se manifeste par des marées hautes et des marées basses.',
    'L’alternance des marées suit le jour lunaire de 24 h 50 min : deux hautes mers et deux basses mers environ toutes les 24 h 50 min, soit un intervalle de 12 h 25 min entre deux marées hautes.',
    'L’alignement Soleil–Terre–Lune (syzygie, nouvelle ou pleine lune) donne les marées de viv’eau ; à quadrature (premier ou dernier quartier), les forces solaire et lunaire se contrarient et donnent les marées de morte-eau.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-v2-e027-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticGlossary() {
  const dl = document.createElement('dl');
  dl.className = 'geography-v2-e027-glossaire';
  const entrees = [
    ['Littoral', 'Zone de contact entre la terre et la mer, de la plage émergée à la partie immergée proche de la côte.'],
    ['Estran', 'Partie du littoral comprise entre le niveau des marées basses et celui des marées hautes : il est alternativement découvert et immergé.'],
    ['Marnage', 'Différence de hauteur entre une marée haute et la marée basse qui la suit ; dans ce modèle relatif, il vaut deux fois l’amplitude.'],
    ['Syzygie', 'Alignement du Soleil, de la Terre et de la Lune (nouvelle lune ou pleine lune) : les forces de marée s’additionnent.'],
    ['Quadrature', 'Position où la direction Soleil–Terre est perpendiculaire à la direction Terre–Lune (premier ou dernier quartier) : les forces de marée se contrarient en partie.'],
    ['Viv’eau / morte-eau', 'Marée de grande amplitude en syzygie (viv’eau) ; marée de faible amplitude en quadrature (morte-eau).'],
  ];
  entrees.forEach(([terme, def]) => {
    const dt = document.createElement('dt');
    dt.textContent = terme;
    const dd = document.createElement('dd');
    dd.textContent = def;
    dl.append(dt, dd);
  });
  return dl;
}

/* ---------- E027-03 : tableau des phases, toutes les valeurs recalculées ---------- */

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Amplitude lunaire seule = 1,00 ; rapport des forces solaire/lunaire = 0,46. Marnage relatif = 2 × amplitude (unité sans mètre).';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Phase lunaire', 'Alignement', 'Régime', 'Amplitude (réf. 1,00)', 'Marnage relatif'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  PHASES.forEach((p) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = p.nom;
    const cellules = [p.alignement, p.regime, fmt(amplitude(p)), fmt(marnage(p))];
    tr.appendChild(th);
    cellules.forEach((c) => {
      const td = document.createElement('td');
      td.textContent = c;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* E027-03 / E027-07 : grandeurs référencées, dérivées des formules. */
function chiffres() {
  const viv = marnage(PHASES[0]);
  const morte = marnage(PHASES[1]);
  return {
    viv,
    morte,
    rapport: morte / viv,
    jour: T_JOUR_LUNAIRE_H,
    demi: T_DEMI_JOUR_H,
    mois: MOIS_SYNODIQUE_J,
    ratio: RATIO_SOLEIL_LUNE,
  };
}

function staticMeasures() {
  const c = chiffres();
  const section = document.createElement('section');
  section.id = MESURES_ID;
  const h = document.createElement('h3');
  h.textContent = 'Mesures référencées';
  section.appendChild(h);
  const ul = document.createElement('ul');
  [
    `Jour lunaire : ${fmtHm(c.jour)} — c’est la période de référence des phases.`,
    `Demi-jour lunaire : ${fmtHm(c.demi)} = ${fmtHm(c.jour)} ÷ 2 ; c’est l’intervalle entre deux marées hautes.`,
    `Mois synodique (cycle des phases) : ${fmt(c.mois)} jours.`,
    `Rapport des forces génératrices Soleil/Lune : ${fmt(c.ratio)} ; l’amplitude lunaire seule sert de référence 1,00.`,
    `Amplitude viv’eau ${fmt(AMP_VIVE_EAU)} contre ${fmt(amplitude(PHASES[1]))} en morte-eau ; le marnage de morte-eau (${fmt(c.morte)}) vaut environ ${Math.round(c.rapport * 100)} % de celui de viv’eau (${fmt(c.viv)}).`,
  ].forEach((t) => {
    const li = document.createElement('li');
    li.textContent = t;
    ul.appendChild(li);
  });
  section.appendChild(ul);
  return section;
}

/* ---------- E027-07 : échelle comparative viv'eau / morte-eau en texte ---------- */

function staticEchelle() {
  const c = chiffres();
  const section = document.createElement('section');
  section.id = ECHELLE_ID;
  const h = document.createElement('h3');
  h.textContent = 'Échelle relative des marées';
  section.appendChild(h);
  const ul = document.createElement('ul');
  [
    `Viv’eau (syzygie) : marnage relatif ${fmt(c.viv)} — la barre pleine du bas du laboratoire lui correspond.`,
    `Morte-eau (quadrature) : marnage relatif ${fmt(c.morte)} — la barre hachurée mesure ${Math.round(c.rapport * 100)} % de la précédente.`,
    `Rapport recalculé : ${fmt(c.morte)} ÷ ${fmt(c.viv)} ≈ ${fmt(c.rapport)}. La longueur des barres est proportionnelle au marnage, jamais une couleur.`,
  ].forEach((t) => {
    const li = document.createElement('li');
    li.textContent = t;
    ul.appendChild(li);
  });
  section.appendChild(ul);
  return section;
}

/* ---------- E027-09 : limite falsifiable en cinq temps ---------- */

function staticLimite() {
  const c = chiffres();
  const section = document.createElement('section');
  section.id = LIMITE_ID;
  const h = document.createElement('h3');
  h.textContent = 'Limites et angles morts — vérification en cinq temps';
  section.appendChild(h);
  const ol = document.createElement('ol');
  [
    ['Prédiction', `En passant de la syzygie à la quadrature, le marnage relatif doit tomber de ${fmt(c.viv)} à ${fmt(c.morte)}, soit environ ${Math.round(c.rapport * 100)} % de la valeur de viv’eau.`],
    ['Réglage', 'Choisir « Pleine lune », puis « Premier quartier » dans le sélecteur, sans toucher à l’heure lunaire : seule la phase change.'],
    ['Résultat attendu', 'Le readout annonce un marnage plus faible en quadrature et la courbe du bas s’aplatit, sans changer de période (12 h 25 min).'],
    ['Falsification', 'Si le marnage ne change pas avec la phase, ou si l’outil affichait une hauteur en mètres pour un port, le modèle serait faux ou abuserait des données : le jeu de données de l’atlas ne contient aucun marégraphe.'],
    ['Débrief', 'Le modèle est global et astronomique (une sinusoïde) : il ignore la résonance des bassins, la bathymétrie, la déclinaison lunaire et la météo. Il illustre une mécanique, il ne prédit pas la marée d’un littoral donné.'],
  ].forEach(([temps, texte]) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = `${temps} : `;
    li.append(strong, document.createTextNode(texte));
    ol.appendChild(li);
  });
  section.appendChild(ol);
  return section;
}

/* ---------- Construction du panneau (E027-02 / 04 / 05 / 06 / 08) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  const nodes = (panel) => ({
    panel,
    fresh: false,
    nouvelle: document.getElementById(`${PHASE_ID}-nouvelle`),
    premier: document.getElementById(`${PHASE_ID}-premier-quart`),
    pleine: document.getElementById(`${PHASE_ID}-pleine`),
    dernier: document.getElementById(`${PHASE_ID}-dernier-quart`),
    heure: document.getElementById(HEURE_ID),
    heureOut: document.getElementById(HEURE_OUT_ID),
    canvas: document.getElementById(CANVAS_ID),
    legend: document.getElementById(LEGEND_ID),
    readout: document.getElementById(READOUT_ID),
    jeu: document.getElementById(PLAY_ID),
  });

  if (existant && existant.isConnected) return nodes(existant);

  const panel = ctx.el('section', 'geography-v2-e027-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Littoral et marées');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Le rivage n’est pas une ligne fixe : la marée déplace la laisse d’eau sur l’estran deux fois par jour lunaire. Ce laboratoire montre comment l’alignement des astres change l’amplitude du mouvement, sans jamais inventer de mesure locale.');

  panel.append(title, lead, staticFacts(), staticGlossary(), staticTable(), staticMeasures(), staticEchelle());

  /* E027-04 : choix unique → radiogroupe natif, pas d'aria-pressed. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = PHASE_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Phase lunaire (choix unique)';
  fieldset.appendChild(legend);
  PHASES.forEach((p) => {
    const lab = ctx.el('label', 'geography-v2-e027-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = RADIO_NAME;
    radio.id = `${PHASE_ID}-${p.id}`;
    radio.value = p.id;
    radio.checked = S.phase === p.id;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(p.nom));
    fieldset.appendChild(lab);
  });
  panel.appendChild(fieldset);

  const heureRow = ctx.el('p', '');
  const heureLabel = document.createElement('label');
  heureLabel.setAttribute('for', HEURE_ID);
  heureLabel.appendChild(document.createTextNode('Heure lunaire : '));
  const heureOut = document.createElement('span');
  heureOut.id = HEURE_OUT_ID;
  heureLabel.appendChild(heureOut);
  heureRow.appendChild(heureLabel);
  panel.appendChild(heureRow);

  const heure = document.createElement('input');
  heure.type = 'range';
  heure.id = HEURE_ID;
  heure.min = '0';
  heure.max = T_JOUR_LUNAIRE_H.toFixed(2);
  heure.step = '0.01';
  heure.value = S.t.toFixed(2);
  heure.setAttribute('aria-label', 'Heure lunaire, de 0 à 24,83 heures');
  panel.appendChild(heure);

  /* E027-05 : un seul canvas, focalisable, décrit pour lecteur d'écran. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Coupe schématique du littoral, courbe de marée sur un jour lunaire et échelle relative des marées. Flèches gauche et droite : changer de phase ; flèches haut et bas : avancer ou reculer d’un quart d’heure lunaire ; Début et Fin : revenir au début ou à la fin du cycle.');

  const legendText = ctx.el('p', 'geography-v2-e027-legend', 'Trait plein : surface de l’eau actuelle ; tirets : niveau moyen de référence ; hachures : estran découvert ou immergé. En bas, la barre pleine est la viv’eau, la barre hachurée la morte-eau : le style, pas la couleur, porte l’information.');
  legendText.id = LEGEND_ID;

  /* E027-06 : une seule région live. */
  const readout = ctx.el('p', 'geography-v2-e027-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');

  /* E027-08 : la bascule d'animation est indépendante → seul aria-pressed. */
  const jeu = ctx.el('button', '', S.jouant ? '■ Arrêter l’animation' : '▶ Animer le cycle des marées');
  jeu.type = 'button';
  jeu.id = PLAY_ID;
  jeu.setAttribute('aria-pressed', S.jouant ? 'true' : 'false');

  const clavier = ctx.el('p', 'geography-v2-e027-legend', 'Clavier : ←/→ changent de phase ; ↑/↓ déplacent l’heure lunaire de 15 min ; Début/Fin vont à 0 h et à 24 h 50 min. Le bouton animer est une bascule indépendante.');

  panel.append(canvas, legendText, readout, jeu, clavier, staticLimite());

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    nouvelle: document.getElementById(`${PHASE_ID}-nouvelle`),
    premier: document.getElementById(`${PHASE_ID}-premier-quart`),
    pleine: document.getElementById(`${PHASE_ID}-pleine`),
    dernier: document.getElementById(`${PHASE_ID}-dernier-quart`),
    heure, heureOut, canvas, legend: legendText, readout, jeu,
  };
}

/* ---------- E027-01 : badge posé sur la carte, sans donnée locale ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('#c3b-map') || scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = ctx.el('div', 'geography-v2-e027-badge', 'Modèle astronomique global : la carte ne contient aucune mesure de marée locale. Aucune hauteur en mètres n’est revendiquée.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- E027-05 / 07 : rendu du laboratoire (un seul canvas) ---------- */

function drawLab() {
  const cv = S.noeuds.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
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

  const p = phaseCourante();
  const hNow = hauteur(S.t, p);
  const pad = 12;
  const iw = Math.max(10, cssW - 2 * pad);
  const sep1 = pad + Math.round(cssH * 0.40);   /* fin de la coupe */
  const sep2 = pad + Math.round(cssH * 0.78);   /* fin de la courbe */
  const profH = sep1 - pad - 4;
  const courbeTop = sep1 + 6;
  const courbeH = sep2 - courbeTop - 6;
  const echelleTop = sep2 + 4;
  const echelleH = cssH - echelleTop - pad - 2;
  const yMean = pad + profH * 0.45;
  const scale = (profH * 0.34) / AMP_VIVE_EAU;
  const waterY = yMean - hNow * scale;

  /* Zone 1 — coupe transversale du littoral. */
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, profH);

  const xShore = pad + iw * 0.55;
  const slope = 0.16;
  const A0 = yMean - slope * xShore;
  const groundY = (x) => A0 + slope * x;

  g.beginPath();
  g.moveTo(pad, pad + profH);
  for (let x = pad; x <= pad + iw; x += 6) g.lineTo(x, Math.max(pad, Math.min(pad + profH, groundY(x))));
  g.lineTo(pad + iw, pad + profH);
  g.closePath();
  g.fillStyle = 'rgba(214,207,193,.16)';
  g.fill();

  const xInt = Math.max(pad, Math.min(pad + iw, (waterY - A0) / slope));
  g.beginPath();
  g.moveTo(xInt, waterY);
  g.lineTo(pad + iw, waterY);
  g.lineTo(pad + iw, pad + profH);
  g.lineTo(xInt, pad + profH);
  g.closePath();
  g.fillStyle = 'rgba(120,170,190,.22)';
  g.fill();

  g.strokeStyle = 'rgba(196,222,232,.95)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(xInt, waterY);
  g.lineTo(pad + iw, waterY);
  g.stroke();

  g.setLineDash([6, 4]);
  g.strokeStyle = 'rgba(244,214,158,.85)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(pad, yMean);
  g.lineTo(pad + iw, yMean);
  g.stroke();
  g.setLineDash([]);

  if (Math.abs(waterY - yMean) > 1) {
    const yTop = Math.min(yMean, waterY);
    const yBot = Math.max(yMean, waterY);
    g.strokeStyle = 'rgba(230,185,111,.5)';
    g.lineWidth = 1;
    for (let x = pad + 2; x < pad + iw; x += 10) {
      g.beginPath();
      g.moveTo(x, yBot);
      g.lineTo(Math.min(pad + iw, x + 4), yTop);
      g.stroke();
    }
  }

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText('Haut de plage / dune', pad + 3, pad + 11);
  g.fillText('Niveau moyen (référence)', pad + 3, yMean - 4);
  g.fillText('Estran · zone de marnage', pad + 3, Math.max(pad + 24, waterY - 4));
  g.fillText(`Niveau actuel : ${hNow >= 0 ? '+' : ''}${fmt(hNow)} (réf. 1,00)`, pad + 3, pad + profH - 5);

  /* Zone 2 — courbe de marée sur un jour lunaire avec repère mobile. */
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, courbeTop, iw, courbeH);
  const midY = courbeTop + courbeH / 2;
  g.setLineDash([4, 4]);
  g.strokeStyle = 'rgba(214,207,193,.4)';
  g.beginPath();
  g.moveTo(pad, midY);
  g.lineTo(pad + iw, midY);
  g.stroke();
  g.setLineDash([]);

  const xFor = (t) => pad + (t / T_JOUR_LUNAIRE_H) * iw;
  const yFor = (v) => midY - (v / AMP_VIVE_EAU) * (courbeH * 0.42);
  g.beginPath();
  for (let i = 0; i <= 240; i += 1) {
    const t = (i / 240) * T_JOUR_LUNAIRE_H;
    const x = xFor(t);
    const y = yFor(hauteur(t, p));
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.strokeStyle = 'rgba(196,222,232,.95)';
  g.lineWidth = 1.6;
  if (p.signe < 0 && g.setLineDash) g.setLineDash([3, 3]);
  g.stroke();
  if (g.setLineDash) g.setLineDash([]);

  const mx = xFor(S.t);
  const my = yFor(hNow);
  g.strokeStyle = 'rgba(244,214,158,.8)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(mx, courbeTop);
  g.lineTo(mx, courbeTop + courbeH);
  g.stroke();
  g.beginPath();
  g.arc(mx, my, 3.2, 0, Math.PI * 2);
  g.fillStyle = 'rgba(244,214,158,1)';
  g.fill();

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText(`Courbe sur ${fmtHm(T_JOUR_LUNAIRE_H)} · ${fmtHm(T_DEMI_JOUR_H)} entre deux hautes mers`, pad + 3, courbeTop + 11);

  /* Zone 3 — E027-07 : échelle comparative, longueur proportionnelle au marnage. */
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, echelleTop, iw, echelleH);

  const c = chiffres();
  const barX = pad + 86;
  const barMax = Math.max(10, pad + iw - barX - 10);
  const rang1 = echelleTop + echelleH * 0.32;
  const rang2 = echelleTop + echelleH * 0.72;

  g.font = '10px sans-serif';
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.fillText('Viv’eau', pad + 4, rang1 + 4);
  /* Barre pleine : viv'eau = 2,92 (référence de longueur). */
  g.strokeStyle = 'rgba(196,222,232,.95)';
  g.lineWidth = 8;
  g.beginPath();
  g.moveTo(barX, rang1);
  g.lineTo(barX + barMax * (c.viv / c.viv), rang1);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,.92)';
  g.fillText(fmt(c.viv), barX + barMax + 4, rang1 + 4);

  g.fillStyle = 'rgba(214,207,193,.95)';
  g.fillText('Morte-eau', pad + 4, rang2 + 4);
  /* Barre hachurée : morte-eau = 1,08, soit ~37 % de la précédente. */
  g.setLineDash([4, 3]);
  g.strokeStyle = 'rgba(230,185,111,.95)';
  g.lineWidth = 8;
  g.beginPath();
  g.moveTo(barX, rang2);
  g.lineTo(barX + barMax * (c.morte / c.viv), rang2);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(255,255,255,.92)';
  g.fillText(fmt(c.morte), barX + barMax * (c.morte / c.viv) + 4, rang2 + 4);
}

/* ---------- E027-06 : readout role=status aria-live=polite ---------- */

function updateReadout() {
  const n = S.noeuds.readout;
  if (!n) return;
  const p = phaseCourante();
  const A = amplitude(p);
  const M = marnage(p);
  const hNow = hauteur(S.t, p);
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  const signe = hNow >= 0 ? '+' : '';
  n.textContent = '';
  n.appendChild(document.createTextNode('Phase : '));
  n.appendChild(fort(p.nom));
  n.appendChild(document.createTextNode(` (${p.alignement.toLowerCase()} · ${p.regime}) · heure lunaire ${fmtHm(S.t)} · amplitude `));
  n.appendChild(fort(fmt(A)));
  n.appendChild(document.createTextNode(' (référence lune seule = 1,00) · marnage relatif '));
  n.appendChild(fort(fmt(M)));
  n.appendChild(document.createTextNode(` · niveau actuel ${signe}${fmt(hNow)} · demi-jour ${fmtHm(T_DEMI_JOUR_H)} · cycle des phases ${fmt(MOIS_SYNODIQUE_J)} j. Aucune hauteur en mètres : le modèle est global et sans donnée locale.`));
}

function updateLegend() {
  const n = S.noeuds.legend;
  if (!n) return;
  const p = phaseCourante();
  n.textContent = `Régime courant : ${p.regime}. Trait plein : eau actuelle ; tirets : niveau moyen ; hachures : estran. Barre pleine : viv’eau ${fmt(chiffres().viv)} ; barre hachurée : morte-eau ${fmt(chiffres().morte)} (${Math.round(chiffres().rapport * 100)} %). Le style de trait, pas la couleur, distingue les régimes.`;
}

/* ---------- Synchronisation des contrôles ---------- */

function renderLive() {
  const n = S.noeuds;
  if (n.heure) n.heure.value = S.t.toFixed(2);
  if (n.heureOut) n.heureOut.textContent = fmtHm(S.t);
  updateReadout();
  updateLegend();
  drawLab();
}

function syncControls() {
  const n = S.noeuds;
  if (n.nouvelle) n.nouvelle.checked = S.phase === 'nouvelle';
  if (n.premier) n.premier.checked = S.phase === 'premier-quart';
  if (n.pleine) n.pleine.checked = S.phase === 'pleine';
  if (n.dernier) n.dernier.checked = S.phase === 'dernier-quart';
  if (n.jeu) {
    n.jeu.textContent = S.jouant ? '■ Arrêter l’animation' : '▶ Animer le cycle des marées';
    n.jeu.setAttribute('aria-pressed', S.jouant ? 'true' : 'false');
  }
  renderLive();
}

/* ---------- E027-10 : boucle rAF unique, pause sur document.hidden ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.dernierTs = 0;
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.visible) return;
  S.dernierTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.visible) return;
  const reduced = reducedNow();
  if (S.dernierTs && S.jouant && !reduced) {
    const dt = Math.min(80, ts - S.dernierTs);
    S.t = (S.t + dt * 0.0005) % T_JOUR_LUNAIRE_H; /* 0,5 heure lunaire par seconde */
  }
  S.dernierTs = ts;
  renderLive();
  if (S.jouant && !reduced) S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibiliteLiee) {
    S.visibiliteLiee = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.jouant && !reducedNow()) startLoop();
    });
  }
  if (!S.mouvementLie && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.mouvementLie = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyV2E027Reduced = mq.matches ? '1' : '0';
        if (mq.matches) {
          S.jouant = false;
          stopLoop();
          syncControls();
        } else if (S.jouant) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  if (!S.intersectionLiee && typeof IntersectionObserver === 'function') {
    const panel = document.getElementById(PANEL_ID);
    if (panel) {
      S.intersectionLiee = true;
      try {
        const obs = new IntersectionObserver((entrees) => {
          S.visible = entrees.some((e) => e.isIntersecting);
          if (!S.visible) stopLoop();
          else if (S.jouant && !reducedNow()) startLoop();
        }, { threshold: 0.01 });
        obs.observe(panel);
      } catch { /* observation indisponible : la boucle reste pilotée par l'onglet. */ }
    }
  }
}

/* ---------- E027-10 : point d'entrée unique, idempotent ---------- */

register('E027', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);
  S.reducedMotion = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null;
  S.noeuds = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = reducedNow();
  S.noeuds.panel.dataset.geographyV2E027Reduced = reduced ? '1' : '0';
  if (reduced) S.jouant = false;
  syncControls();

  if (S.noeuds.fresh) {
    const n = S.noeuds;
    [n.nouvelle, n.premier, n.pleine, n.dernier].forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.phase = radio.value;
        syncControls();
      });
    });
    n.heure.addEventListener('input', () => {
      const v = Number(n.heure.value);
      if (Number.isFinite(v)) S.t = Math.max(0, Math.min(T_JOUR_LUNAIRE_H, v));
      renderLive();
    });
    n.jeu.addEventListener('click', () => {
      S.jouant = !S.jouant;
      if (!S.jouant) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let traite = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const i = PHASES.findIndex((p) => p.id === S.phase);
        const pas = event.key === 'ArrowRight' ? 1 : -1;
        S.phase = PHASES[(i + pas + PHASES.length) % PHASES.length].id;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const pas = event.key === 'ArrowUp' ? 0.25 : -0.25;
        S.t = Math.max(0, Math.min(T_JOUR_LUNAIRE_H, S.t + pas));
      } else if (event.key === 'Home') {
        S.t = 0;
      } else if (event.key === 'End') {
        S.t = T_JOUR_LUNAIRE_H;
      } else {
        traite = false;
      }
      if (traite) {
        event.preventDefault();
        event.stopPropagation();
        syncControls();
      }
    });
  }

  installGlobalListeners();
  if (S.jouant && !reduced) startLoop();
});
