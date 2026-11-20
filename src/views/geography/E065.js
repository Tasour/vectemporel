import { register } from './registry.js';

/* Lentille E065 — vue GEOGRAPHIE.
 * Thème : transitions d'état.
 *
 * Les dix chantiers E065-01 … E065-10 sont décrits dans
 * UNIFIED_AUDIT/GEOGRAPHIE/views/E065.md. Tout est local : aucune requête
 * réseau, aucune valeur aléatoire, aucune sortie console, aucun fichier
 * partagé modifié. Le contenu pédagogique est du texte sémantique réel
 * (titres, paragraphes, tableau, définitions) présent dans le DOM même sans
 * animation ; le canvas n'est qu'un laboratoire qui illustre une machine à
 * états déterministe et des formules traçables.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const CSS_ID = 'geography-e065';
const PANEL_ID = 'geography-e065-panel';
const TITLE_ID = 'geography-e065-title';
const TABLE_ID = 'geography-e065-table';
const EVENTS_ID = 'geography-e065-events';
const DELAY_ID = 'geography-e065-delay';
const DELAY_OUT_ID = 'geography-e065-delay-value';
const CANVAS_ID = 'geography-e065-canvas';
const LEGEND_ID = 'geography-e065-legend';
const BADGE_ID = 'geography-e065-badge';
const READOUT_ID = 'geography-e065-readout';
const INJECT_ID = 'geography-e065-inject';
const PLAY_ID = 'geography-e065-play';
const RESET_ID = 'geography-e065-reset';
const DEFI_ID = 'geography-e065-defi';
const DEBRIEF_ID = 'geography-e065-debrief';
const DEBRIEF_BTN_ID = 'geography-e065-debrief-btn';

/* Grandeurs de référence, toutes traçables dans la vue réelle.
 * geography.js : disque visible r = 4 (repos) / 7 (actif), cercle de capture
 * r = 14, trait de focus 2,5 (styles.css : trait usuel 1,1–1,4). La vue ne
 * déclare aucune propriété CSS `transition` sur les marqueurs : les changements
 * d'état y sont donc instantanés, sans interpolation temporelle. */
const R_REPOS_REF = 4;
const R_ACTIF_REF = 7;
const R_HIT = 14;
const TRAIT_REPOS = 1.4;
const TRAIT_FOCUS = 2.5;
const CIBLE_MIN = 24;
const CIBLE_RECO = 44;
const DELAI_MIN = 100;
const DELAI_MAX = 1200;
const DELAI_REF = 400;

/* Les quatre états du marqueur et la machine à états pédagogique. Les noms
 * d'événements reprennent les API DOM (pointerenter, pointerleave, focus,
 * blur, click) ; « reset » est une commande de laboratoire, pas un événement
 * natif. Le modèle est simplifié et explicitement présenté comme tel. */
const ETATS = ['repos', 'survol', 'focus', 'actif'];
const LIBELLE_ETAT = {
  repos: 'repos',
  survol: 'survol',
  focus: 'focus clavier',
  actif: 'actif (sélectionné)',
};
const GLYPHE_ETAT = { repos: '○', survol: '▷', focus: '◇', actif: '●' };
const POS_ETAT = {
  repos: { x: 0.12, y: 0.50 },
  survol: { x: 0.42, y: 0.18 },
  focus: { x: 0.42, y: 0.82 },
  actif: { x: 0.84, y: 0.50 },
};

/* transitions : 8 arcs directed. catégorie -> style de trait (E065-08). */
const TRANSITIONS = [
  { de: 'repos', evt: 'pointerenter', vers: 'survol', categorie: 'pointeur' },
  { de: 'repos', evt: 'focus', vers: 'focus', categorie: 'clavier' },
  { de: 'survol', evt: 'pointerleave', vers: 'repos', categorie: 'pointeur' },
  { de: 'survol', evt: 'click', vers: 'actif', categorie: 'pointeur' },
  { de: 'survol', evt: 'focus', vers: 'focus', categorie: 'clavier' },
  { de: 'focus', evt: 'blur', vers: 'repos', categorie: 'clavier' },
  { de: 'focus', evt: 'click', vers: 'actif', categorie: 'clavier' },
  { de: 'actif', evt: 'reset', vers: 'repos', categorie: 'commande' },
];
const EVENEMENTS = [
  ['pointerenter', 'pointerenter — entrer du pointeur'],
  ['pointerleave', 'pointerleave — sortie du pointeur'],
  ['focus', 'focus — focus clavier'],
  ['blur', 'blur — perte du focus'],
  ['click', 'click — activation'],
  ['reset', 'reset — retour au repos (commande)'],
];

/* Trajectoire fixe, reproductible : chaque état est atteignable depuis le
 * précédent par une transition répertoriée. Aucune valeur aléatoire. */
const TRAJECTOIRE = ['repos', 'survol', 'repos', 'focus', 'actif', 'repos', 'survol'];

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  etat: 'repos',
  evenement: 'pointerenter',
  delai: DELAI_REF,
  index: 0,
  compteur: 0,
  derniere: null,
  animations: false,
  debriefOuvert: false,
  lastTs: 0,
  accumule: 0,
  rafId: 0,
  reduced: false,
  onScreen: true,
  io: null,
  ioCanvas: null,
  visibilityBound: false,
  motionBound: false,
  nodes: {},
};

/* ---------- Formules déterministes (aucune donnée fabriquée) ---------- */

const fmt = (n, d = 0) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const carre = (n) => n * n;

/* E065-02 / E065-06 — recherche de la transition depuis un état courant.
 * Un événement sans arc défini est un « non-changement » : l'état reste le
 * même et aucune transition n'est comptée (comportement idempotent). */
function trouverTransition(de, evt) {
  for (let i = 0; i < TRANSITIONS.length; i += 1) {
    if (TRANSITIONS[i].de === de && TRANSITIONS[i].evt === evt) return TRANSITIONS[i];
  }
  return null;
}

function appliquer(de, evt) {
  const t = trouverTransition(de, evt);
  if (!t) return { etat: de, transition: null };
  return { etat: t.vers, transition: t };
}

/* E065-06 — couverture du graphe : arcs répertoriés / arcs d'un graphe
 * complet sans boucle sur 4 sommets (4 × 3 = 12). */
function metriques() {
  const nbEtats = ETATS.length;
  const maxTransitions = nbEtats * (nbEtats - 1);
  const nbTransitions = TRANSITIONS.length;
  return {
    nbEtats,
    maxTransitions,
    nbTransitions,
    couverture: nbTransitions / maxTransitions,
    parPointeur: TRANSITIONS.filter((t) => t.categorie === 'pointeur').length,
    parClavier: TRANSITIONS.filter((t) => t.categorie === 'clavier').length,
    parCommande: TRANSITIONS.filter((t) => t.categorie === 'commande').length,
    dureeTrajectoire: (TRAJECTOIRE.length - 1) * S.delai,
    dureeReference: (TRAJECTOIRE.length - 1) * DELAI_REF,
    rapportRayons: R_ACTIF_REF / R_REPOS_REF,
    rapportSurfaces: carre(R_ACTIF_REF) / carre(R_REPOS_REF),
    captureSurVisible: carre(R_HIT) / carre(R_REPOS_REF),
    diametreCapture: 2 * R_HIT,
    traitFocusSurRepos: TRAIT_FOCUS / TRAIT_REPOS,
  };
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#geography-e065-panel{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#geography-e065-panel h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#geography-e065-panel h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#geography-e065-panel p{margin:5px 0;max-width:68ch}
#geography-e065-panel .geography-e065-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#geography-e065-table{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#geography-e065-table caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#geography-e065-table th,#geography-e065-table td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#geography-e065-table th{color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e065-events{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#geography-e065-events legend{padding:0 4px;color:var(--muted)}
#geography-e065-panel .geography-e065-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:44px;margin-right:8px;
  padding:2px 6px;cursor:pointer;
}
#geography-e065-panel .geography-e065-choix input{min-width:20px;min-height:20px;accent-color:var(--gold,#e6b96f)}
#geography-e065-delay{width:100%;min-height:44px;accent-color:var(--gold,#e6b96f)}
.geography-e065-value{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#geography-e065-canvas{
  display:block;width:100%;height:270px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#geography-e065-legend{font-size:10px;color:var(--muted)}
#geography-e065-badge,#geography-e065-readout,#geography-e065-debrief{
  min-height:30px;padding:7px 8px;margin:6px 0;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#geography-e065-badge[data-categorie="pointeur"]{border-left:4px solid var(--gold,#e6b96f)}
#geography-e065-badge[data-categorie="clavier"]{border-left:4px dashed var(--muted,#9a9386)}
#geography-e065-badge[data-categorie="commande"]{border-left:4px dotted var(--muted,#9a9386)}
#geography-e065-readout strong{color:var(--gold-bright,#f4d69e)}
#geography-e065-debrief[hidden]{display:none}
#geography-e065-panel button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#geography-e065-panel button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#geography-e065-panel :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
#geography-e065-panel[data-geography-e065-reduced="1"] button{transition:none}
@media (prefers-reduced-motion:reduce){
  #geography-e065-panel button{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #geography-e065-panel{font-size:10px;padding:9px}
  #geography-e065-canvas{height:220px}
  #geography-e065-panel .geography-e065-choix{margin-right:4px}
}
`;

/* ---------- Contenu sémantique, lisible sans animation ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    'Un marqueur de carte n’a pas un aspect unique : il occupe l’un des états repos, survol, focus clavier ou actif. Une transition d’état est le passage d’un état source à un état cible, déclenché par un événement (entrée du pointeur, focus, clic…) et conditionné par une règle : seul l’arc défini pour la paire « état + événement » est emprunté.',
    'La vue GEOGRAPHIE declare quatre états visuels mais aucune propriété CSS « transition » sur ses marqueurs : les changements y sont instantanés. Ce laboratoire ajoute un délai réglable, non pour décrire le code, mais pour rendre visible la trajectoire et ses étapes.',
    'Un graphe complet à 4 états comporterait 4 × (4 − 1) = 12 arcs dirigés hors boucle. La machine simplifiée présentée ici en répertorie 8, soit une couverture de 8/12 ≈ 0,67 : les autres paires n’ont pas de règle, l’événement est alors un non-changement (état idempotent).',
    'Les valeurs d’aspect restent traçables : disque visible de rayon 4 px au repos et 7 px à l’état actif, cercle de capture de rayon 14 px, trait de focus 2,5 px. La cible mesure donc 28 px de diamètre, au-dessus du minimum WCAG 2.2 de 24 px mais sous les 44 px recommandés.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = 'geography-e065-fait';
    p.textContent = texte;
    wrap.appendChild(p);
  });
  return wrap;
}

function staticTable() {
  const table = document.createElement('table');
  table.id = TABLE_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Les 8 transitions de la machine simplifiée — état source, événement, état cible et catégorie. Modèle pédagogique déduit des états présents dans geography.js et styles.css.';
  table.appendChild(caption);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['État source', 'Événement', 'État cible', 'Catégorie', 'Trait de l’arc'].forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const trait = { pointeur: 'plein', clavier: 'tirets', commande: 'pointillés' };
  TRANSITIONS.forEach((t) => {
    const tr = document.createElement('tr');
    const cells = [
      LIBELLE_ETAT[t.de],
      t.evt,
      LIBELLE_ETAT[t.vers],
      t.categorie,
      trait[t.categorie],
    ];
    cells.forEach((c, i) => {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cell.scope = 'row';
      cell.textContent = c;
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- E065-01 / E065-04 / E065-09 : panneau et contrôles ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      evenements: EVENEMENTS.map(([value]) => document.getElementById(`geography-e065-evt-${value}`)),
      delay: document.getElementById(DELAY_ID),
      delayOut: document.getElementById(DELAY_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      legend: document.getElementById(LEGEND_ID),
      badge: document.getElementById(BADGE_ID),
      readout: document.getElementById(READOUT_ID),
      inject: document.getElementById(INJECT_ID),
      play: document.getElementById(PLAY_ID),
      reset: document.getElementById(RESET_ID),
      debriefBtn: document.getElementById(DEBRIEF_BTN_ID),
      debrief: document.getElementById(DEBRIEF_ID),
    };
  }

  const panel = ctx.el('section', 'geography-e065-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', '', 'Transitions d’état : la machine à états du marqueur');
  title.id = TITLE_ID;
  const lead = ctx.el('p', '', 'Un marqueur passe d’un état à un autre lorsqu’un événement correspond à une règle. Ce laboratoire isole les huit arcs de la machine, montre la trajectoire pas à pas et recalcule la couverture du graphe, afin de distinguer une vraie transition d’un simple changement de couleur.');

  /* E065-04 : choix unique -> fieldset/legend + radios de même nom. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = EVENTS_ID;
  const legend = document.createElement('legend');
  legend.textContent = 'Événement à injecter depuis l’état courant (choix unique)';
  fieldset.appendChild(legend);
  const evenements = [];
  EVENEMENTS.forEach(([value, label]) => {
    const lab = ctx.el('label', 'geography-e065-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'geography-e065-event';
    radio.id = `geography-e065-evt-${value}`;
    radio.value = value;
    radio.checked = S.evenement === value;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(label));
    fieldset.appendChild(lab);
    evenements.push(radio);
  });

  /* E065-05 : curseur de délai entre deux étapes. */
  const delayRow = ctx.el('p', '');
  const delayLabel = document.createElement('label');
  delayLabel.setAttribute('for', DELAY_ID);
  delayLabel.appendChild(document.createTextNode('Délai entre deux transitions : '));
  const delayOut = ctx.el('span', 'geography-e065-value');
  delayOut.id = DELAY_OUT_ID;
  delayLabel.appendChild(delayOut);
  delayRow.appendChild(delayLabel);
  const delay = document.createElement('input');
  delay.type = 'range';
  delay.id = DELAY_ID;
  delay.min = String(DELAI_MIN);
  delay.max = String(DELAI_MAX);
  delay.step = '100';
  delay.value = String(S.delai);
  delay.setAttribute('aria-label', `Délai entre deux étapes de la trajectoire, de ${DELAI_MIN} à ${DELAI_MAX} millisecondes`);

  /* E065-08 : canvas focalisable, étiqueté, avec équivalent clavier. */
  const canvas = document.createElement('canvas');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Laboratoire des transitions d’état : quatre nœuds repos, survol, focus et actif reliés par huit arcs dirigés. Trait plein = pointeur, tirets = clavier, pointillés = commande ; une flèche marque le sens. Le nœud courant porte un anneau double et le glyphe ► ici. Flèche droite ou bas : étape suivante de la trajectoire ; flèche gauche ou haut : étape précédente ; Origine : revenir au repos ; Entrée : injecter l’événement choisi. Aucune information n’est portée par la seule couleur.');

  const legendText = ctx.el('p', 'geography-e065-legend', 'Repères : trait plein = événement pointeur, tirets = événement clavier, pointillés = commande ; la flèche indique le sens de la transition ; le nœud cerclé deux fois est l’état courant. Formes : ○ repos, ▷ survol, ◇ focus, ● actif.');
  legendText.id = LEGEND_ID;

  const badge = ctx.el('p', '', '');
  badge.id = BADGE_ID;
  const readout = ctx.el('p', 'geography-e065-readout');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  /* E065-09 : bascule indépendante -> aria-pressed autorisé. */
  const play = ctx.el('button', '', S.animations ? '■ Arrêter la trajectoire' : '▶ Animer la trajectoire');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', S.animations ? 'true' : 'false');
  const inject = ctx.el('button', '', 'Injecter l’événement');
  inject.type = 'button';
  inject.id = INJECT_ID;
  const reset = ctx.el('button', '', 'Réinitialiser');
  reset.type = 'button';
  reset.id = RESET_ID;

  /* E065-10 : défi en cinq temps, débrief révélé par aria-expanded. */
  const defi = ctx.el('p', '', 'À vous de jouer : prédiction — avec 4 états et 8 arcs répertoriés, la couverture du graphe est-elle de 50 % ou de 66,7 % ? Réglage — placez le curseur de délai sur 400 ms et injectez « pointerenter » depuis le repos. Résultat attendu — le repos passe au survol et la couverture vaut 8/(4×3) = 0,667. Falsification — si vous obtenez 50 %, vous avez compté les états au lieu des arcs dirigés, ou oublié que le graphe complet en compte 12.');
  defi.id = DEFI_ID;
  const debriefBtn = ctx.el('button', '', 'Révéler le débrief');
  debriefBtn.type = 'button';
  debriefBtn.id = DEBRIEF_BTN_ID;
  debriefBtn.setAttribute('aria-expanded', 'false');
  debriefBtn.setAttribute('aria-controls', DEBRIEF_ID);
  const debrief = ctx.el('p', '', 'Débrief : un graphe dirigé sans boucle sur n sommets a au plus n×(n−1) arcs, soit 4×3 = 12 ici. La machine en définit 8, donc 8/12 = 0,666… ≈ 66,7 %. Un événement sans arc défini est un non-changement : l’état reste identique et le compteur n’augmente pas. Le délai réglable ne modifie pas la topologie du graphe, seulement la vitesse à laquelle on parcourt la trajectoire.');
  debrief.id = DEBRIEF_ID;
  debrief.hidden = true;

  panel.append(title, lead, staticFacts(), staticTable(), fieldset, delayRow, delay, canvas, legendText, badge, readout, inject, play, reset, defi, debriefBtn, debrief);

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    evenements, delay, delayOut, canvas, legend: legendText, badge, readout,
    inject, play, reset, debriefBtn, debrief,
  };
}

/* ---------- E065-03 / E065-08 : laboratoire sur canvas ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 270;
  /* DPR plafonné à 2. */
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 14;
  const w = Math.max(10, cssW - pad * 2);
  const h = Math.max(10, cssH - pad * 2);
  const px = (key) => ({ x: pad + POS_ETAT[key].x * w, y: pad + POS_ETAT[key].y * h });

  /* Fond neutre : quadrillage déterministe, aucune coordonnée fabriquée. */
  g.fillStyle = 'rgba(214,207,193,.035)';
  g.fillRect(pad, pad, w, h);
  g.strokeStyle = 'rgba(214,207,193,.10)';
  g.lineWidth = 1;
  for (let k = 1; k < 5; k += 1) {
    const gx = pad + (w * k) / 5;
    g.beginPath(); g.moveTo(gx, pad); g.lineTo(gx, pad + h); g.stroke();
  }
  for (let k = 1; k < 3; k += 1) {
    const gy = pad + (h * k) / 3;
    g.beginPath(); g.moveTo(pad, gy); g.lineTo(pad + w, gy); g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,.22)';
  g.strokeRect(pad, pad, w, h);

  /* Arcs dirigés. Le style de trait porte la catégorie, pas la couleur. */
  TRANSITIONS.forEach((t) => {
    const a = px(t.de);
    const b = px(t.vers);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const r = 16; /* dégage le nœud pour laisser voir la flèche. */
    const x1 = a.x + ux * r;
    const y1 = a.y + uy * r;
    const x2 = b.x - ux * r;
    const y2 = b.y - uy * r;
    const estDernier = S.derniere && S.derniere.de === t.de
      && S.derniere.evt === t.evt && S.derniere.vers === t.vers;
    g.save();
    g.strokeStyle = estDernier ? 'rgba(244,214,158,.98)' : 'rgba(214,207,193,.55)';
    g.lineWidth = estDernier ? 2.6 : 1.2;
    if (t.categorie === 'clavier') g.setLineDash([5, 4]);
    else if (t.categorie === 'commande') g.setLineDash([2, 4]);
    else g.setLineDash([]);
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    g.setLineDash([]);
    /* Tête de flèche : sens de la transition. */
    const ah = estDernier ? 8 : 6;
    g.fillStyle = estDernier ? 'rgba(244,214,158,.98)' : 'rgba(214,207,193,.7)';
    g.beginPath();
    g.moveTo(x2, y2);
    g.lineTo(x2 - ux * ah - uy * ah * 0.5, y2 - uy * ah + ux * ah * 0.5);
    g.lineTo(x2 - ux * ah + uy * ah * 0.5, y2 - uy * ah - ux * ah * 0.5);
    g.closePath();
    g.fill();
    g.restore();
    /* Étiquette d'événement au milieu de l'arc, fondu lisible. */
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    g.font = '9px sans-serif';
    const txt = t.evt;
    const tw = g.measureText(txt).width;
    g.fillStyle = 'rgba(11,15,21,.85)';
    g.fillRect(mx - tw / 2 - 2, my - 6, tw + 4, 11);
    g.fillStyle = estDernier ? 'rgba(244,214,158,1)' : 'rgba(214,207,193,.85)';
    g.textAlign = 'center';
    g.fillText(txt, mx, my + 2);
    g.textAlign = 'left';
  });

  /* Nœuds : forme et glyphe distincts, anneau double pour l'état courant. */
  ETATS.forEach((key) => {
    const p = px(key);
    const courant = key === S.etat;
    g.save();
    if (courant) {
      g.strokeStyle = 'rgba(244,214,158,.95)';
      g.lineWidth = 1.5;
      g.beginPath(); g.arc(p.x, p.y, 17, 0, Math.PI * 2); g.stroke();
    }
    g.beginPath(); g.arc(p.x, p.y, 12, 0, Math.PI * 2);
    g.fillStyle = courant ? 'rgba(244,214,158,.18)' : 'rgba(11,15,21,.95)';
    g.fill();
    g.lineWidth = courant ? 2.2 : 1.2;
    g.strokeStyle = courant ? 'rgba(244,214,158,1)' : 'rgba(214,207,193,.75)';
    g.stroke();
    g.fillStyle = courant ? 'rgba(244,214,158,1)' : 'rgba(214,207,193,.9)';
    g.font = courant ? 'bold 12px sans-serif' : '12px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(GLYPHE_ETAT[key], p.x, p.y + 0.5);
    g.font = '10px sans-serif';
    g.textBaseline = 'alphabetic';
    g.fillText(`${key}${courant ? ' ► ici' : ''}`, p.x, p.y + 27);
    g.restore();
    g.textAlign = 'left';
  });

  /* Compteur affiché dans le laboratoire, alimenté par la même source. */
  const m = metriques();
  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '10px sans-serif';
  g.fillText(`étape ${S.index + 1}/${TRAJECTOIRE.length} · transitions comptées ${S.compteur} · couverture ${fmt(m.couverture * 100, 1)} %`, pad + 3, pad + 12);
}

/* ---------- E065-06 / E065-07 : lectures et région de statut ---------- */

function updateBadge() {
  const n = S.nodes.badge;
  if (!n) return;
  const cat = S.derniere ? S.derniere.categorie : 'pointeur';
  n.dataset.categorie = cat;
  if (cat === 'pointeur') {
    n.textContent = 'Voie pointeur : les arcs pleins correspondent à pointerenter, pointerleave et click. Le survol est transitoire : il suit le pointeur et disparaît dès qu’il s’éloigne.';
  } else if (cat === 'clavier') {
    n.textContent = 'Voie clavier : les arcs en tirets correspondent à focus, blur et au clic sous focus. Le focus remplace le survol ; un trait plus épais et la croix ◇ le signalent sans couleur.';
  } else {
    n.textContent = 'Voie commande : l’arc en pointillés est « reset », une commande de laboratoire qui ramène au repos. Ce n’est pas un événement natif du DOM.';
  }
}

function updateReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const m = metriques();
  const fort = (texte) => {
    const st = document.createElement('strong');
    st.textContent = texte;
    return st;
  };
  const transition = trouverTransition(S.etat, S.evenement);
  n.textContent = '';
  n.appendChild(document.createTextNode('État courant '));
  n.appendChild(fort(LIBELLE_ETAT[S.etat]));
  n.appendChild(document.createTextNode(' · événement '));
  n.appendChild(fort(S.evenement));
  n.appendChild(document.createTextNode(' · '));
  n.appendChild(fort(transition
    ? `transition ${LIBELLE_ETAT[S.etat]} → ${LIBELLE_ETAT[transition.vers]}`
    : 'aucune transition définie (non-changement)'));
  n.appendChild(document.createTextNode(`. Arcs ${fmt(m.nbTransitions)} sur ${fmt(m.maxTransitions)} (référence graphe complet) · couverture `));
  n.appendChild(fort(fmt(m.couverture * 100, 1) + ' %'));
  n.appendChild(document.createTextNode(`. Trajectoire ${fmt(m.dureeTrajectoire)} ms, référence ${fmt(m.dureeReference)} ms · rayons ${fmt(R_REPOS_REF)} → ${fmt(R_ACTIF_REF)} px, surfaces ×${fmt(m.rapportSurfaces, 2)} (référence (7/4)²) · cible ${fmt(m.diametreCapture)} px : `));
  n.appendChild(fort(m.diametreCapture >= CIBLE_RECO ? '≥ 44 px recommandés' : (m.diametreCapture >= CIBLE_MIN ? '≥ 24 px minimum' : 'sous le minimum')));
  n.appendChild(document.createTextNode(`. Trait focus/repos = ${fmt(m.traitFocusSurRepos, 2)}.`));
}

function syncControls() {
  const n = S.nodes;
  n.evenements.forEach((radio) => {
    if (radio) radio.checked = S.evenement === radio.value;
  });
  if (n.delay) n.delay.value = String(S.delai);
  if (n.delayOut) n.delayOut.textContent = `${fmt(S.delai)} ms`;
  if (n.play) {
    n.play.textContent = S.animations ? '■ Arrêter la trajectoire' : '▶ Animer la trajectoire';
    n.play.setAttribute('aria-pressed', S.animations ? 'true' : 'false');
  }
  if (n.debriefBtn) {
    n.debriefBtn.textContent = S.debriefOuvert ? 'Masquer le débrief' : 'Révéler le débrief';
    n.debriefBtn.setAttribute('aria-expanded', S.debriefOuvert ? 'true' : 'false');
  }
  if (n.debrief) n.debrief.hidden = !S.debriefOuvert;
  updateBadge();
  updateReadout();
  drawLab();
}

/* ---------- E065-09 : boucle rAF unique, pause sur document.hidden ---------- */

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
  if (!S.onScreen || S.reduced) return;
  S.lastTs = 0;
  S.accumule = 0;
  S.rafId = requestAnimationFrame(tick);
}

function stepSuivant() {
  S.index = (S.index + 1) % TRAJECTOIRE.length;
  const cible = TRAJECTOIRE[S.index];
  /* Recherche de l'arc source → cible qui correspond à l'étape suivante. */
  const arc = TRANSITIONS.find((tr) => tr.de === S.etat && tr.vers === cible);
  if (arc) {
    S.derniere = arc;
    S.compteur += 1;
    S.evenement = arc.evt;
    S.etat = arc.vers;
  } else {
    /* Sécurité : si l'index et l'état se sont désynchronisés, on repart du
       repos puis on applique l'arc sortant attendu — toujours déterministe. */
    S.etat = 'repos';
    S.index = 0;
    const reprise = TRANSITIONS.find((tr) => tr.de === 'repos' && tr.vers === TRAJECTOIRE[1]);
    if (reprise) {
      S.derniere = reprise;
      S.compteur += 1;
      S.evenement = reprise.evt;
      S.etat = reprise.vers;
    }
  }
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.onScreen || S.reduced) return;
  if (S.lastTs) {
    /* Temps écoulé plafonné : source de temps unique, aucune valeur aléatoire. */
    const dt = Math.min(80, Math.max(0, ts - S.lastTs));
    S.accumule += dt;
    while (S.accumule >= S.delai) {
      S.accumule -= S.delai;
      stepSuivant();
    }
  }
  S.lastTs = ts;
  syncControls();
  if (S.animations) S.rafId = requestAnimationFrame(tick);
}

function injecterEvenement() {
  const resultat = appliquer(S.etat, S.evenement);
  if (resultat.transition) {
    S.derniere = resultat.transition;
    S.compteur += 1;
    S.etat = resultat.etat;
    /* Garde la trajectoire cohérente avec le nouvel état, sans aléa. */
    const idx = TRAJECTOIRE.lastIndexOf(S.etat);
    S.index = idx >= 0 ? idx : 0;
  } else {
    /* Non-changement : l'état et le compteur restent intacts. */
    S.derniere = null;
  }
  syncControls();
}

function reinitialiser() {
  stopLoop();
  S.etat = 'repos';
  S.index = 0;
  S.compteur = 0;
  S.accumule = 0;
  S.derniere = null;
  S.evenement = 'pointerenter';
  syncControls();
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.animations && !S.reduced) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = mq.matches;
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.dataset.geographyE065Reduced = mq.matches ? '1' : '0';
        if (mq.matches) { S.animations = false; stopLoop(); syncControls(); }
        else if (S.animations) startLoop();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
}

/* ---------- E065-10 : IntersectionObserver, sobriété, reproductibilité ---------- */

function ensureObserver(canvas) {
  if (typeof IntersectionObserver !== 'function') { S.onScreen = true; return; }
  if (S.io && S.ioCanvas === canvas) return;
  if (S.io) S.io.disconnect();
  S.io = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    S.onScreen = entry ? entry.isIntersecting : true;
    if (!S.onScreen) stopLoop();
    else if (S.animations && !S.reduced) startLoop();
  }, { threshold: 0.01 });
  S.io.observe(canvas);
  S.ioCanvas = canvas;
}

/* ---------- Point d'entrée ---------- */

register('E065', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.reduced = typeof ctx.reducedMotion === 'function'
    ? !!ctx.reducedMotion()
    : (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false);

  S.nodes = ensurePanel(ctx);
  S.nodes.panel.dataset.geographyE065Reduced = S.reduced ? '1' : '0';
  if (S.reduced) S.animations = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.evenements.forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.evenement = radio.value;
        syncControls();
      });
    });
    n.delay.addEventListener('input', () => {
      S.delai = clamp(Math.round(Number(n.delay.value) / 100) * 100, DELAI_MIN, DELAI_MAX);
      S.accumule = 0;
      syncControls();
    });
    n.inject.addEventListener('click', injecterEvenement);
    n.reset.addEventListener('click', reinitialiser);
    n.play.addEventListener('click', () => {
      S.animations = !S.animations;
      if (!S.animations) stopLoop(); else startLoop();
      syncControls();
    });
    n.debriefBtn.addEventListener('click', () => {
      S.debriefOuvert = !S.debriefOuvert;
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        stepSuivant();
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        S.index = (S.index - 1 + TRAJECTOIRE.length) % TRAJECTOIRE.length;
        const cible = TRAJECTOIRE[S.index];
        const arc = TRANSITIONS.find((tr) => tr.vers === cible);
        if (arc) {
          S.etat = cible;
          S.derniere = arc;
          S.evenement = arc.evt;
        } else {
          S.etat = 'repos';
        }
      } else if (event.key === 'Home') {
        reinitialiser();
      } else if (event.key === 'Enter' || event.key === ' ') {
        injecterEvenement();
      } else used = false;
      if (used) {
        event.preventDefault();
        syncControls();
      }
    });
    ensureObserver(n.canvas);
  }

  installGlobalListeners();
  if (S.animations && !S.reduced) startLoop();
});
