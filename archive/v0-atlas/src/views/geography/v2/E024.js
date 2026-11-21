import { register } from './registry.js';

/* V2 — lentille E024 (vague GEOGRAPHIE).
 * Thème : plateaux et plaines — lire un relief par l'altitude, la pente de ses
 * bords et l'histoire de son érosion.
 *
 * Les dix chantiers E024-01 … E024-10 sont réellement implémentés ici :
 *   01 section sémantique d'introduction, lisible sans JS ;
 *   02 tableau comparatif plaine / plateau / montagne (référence 0 m) ;
 *   03 sélecteur de profil en radiogroupe (choix unique, pas d'aria-pressed) ;
 *   04 curseur de largeur d'escarpement et mesure de pente par formule ;
 *   05 coupe topographique canvas calculée par le modèle déterministe ;
 *   06 grandeurs chiffrées comparées à une référence (readout live) ;
 *   07 boucle rAF unique, pause sur document.hidden, mouvement réduit ;
 *   08 codes visuels non chromatiques (traits, hachures, libellés) ;
 *   09 badge textuel de relief sur la carte existante ;
 *   10 accessibilité, défi falsifiable, limites, glossaire et robustesse d'état.
 *
 * Rigueur des contenus : la carte de la vue GEOGRAPHIE est une transformation
 * affine lat/lon et ne porte aucune altitude. Le laboratoire est un SCHÉMA
 * analytique à une dimension, explicitement présenté comme tel : aucune valeur
 * d'altitude locale n'est attribuée au pays affiché. Tout le contenu pédagogique
 * est du texte sémantique inséré dans le DOM (titres, paragraphes, tableau,
 * fieldset, listes, définitions) : le canvas n'est qu'une surcouche dont chaque
 * grandeur est aussi écrite en toutes lettres dans le readout et le tableau.
 *
 * Modèle déterministe : profil de 100 km, plaine à 100 m, plateau à 800 m,
 * escarpement débutant à 40 km sur une largeur réglable de 5 à 30 km.
 * pente (%) = dénivelé / (largeur × 1000) × 100 ; angle = atan(dénivelé /
 * (largeur × 1000)). Par défaut (10 km) : 700 m de dénivelé, 7 % et ≈ 4,0°.
 * Le plateau disséqué retranche une vallée en V de 220 m centrée à 78 km.
 *
 * Contrat : import de './registry.js' uniquement ; un seul register('E024', …) ;
 * CSS unique via ctx.css('geography-v2-e024', …) ; ids préfixés
 * geography-v2-e024-* ; français partout ; zéro console, zéro réseau, zéro
 * Math.random ; au plus une boucle rAF suspendue sur document.hidden et
 * respectueuse de ctx.reducedMotion().
 *
 * ctx = { viewId, stage, layout, css(id, rules), el(tag, cls, text),
 *         reducedMotion() }.
 */

/* ---------- Identifiants (tous préfixés geography-v2-e024-) ---------- */

const CSS_ID = 'geography-v2-e024';
const PREFIX = 'geography-v2-e024';
const PANEL_ID = `${PREFIX}-panel`;
const TITLE_ID = `${PREFIX}-title`;
const TABLE_ID = `${PREFIX}-table`;
const PROFILE_ID = `${PREFIX}-profile`;
const RADIO_NAME = `${PREFIX}-profil`;
const WIDTH_ID = `${PREFIX}-width`;
const WIDTH_OUT_ID = `${PREFIX}-width-value`;
const CANVAS_ID = `${PREFIX}-canvas`;
const READOUT_ID = `${PREFIX}-readout`;
const PLAY_ID = `${PREFIX}-play`;
const LEGEND_ID = `${PREFIX}-legend`;
const BADGE_ID = `${PREFIX}-badge`;
const LIMITE_ID = `${PREFIX}-limite`;
const DEFI_ID = `${PREFIX}-defi`;
const GLOSSAIRE_ID = `${PREFIX}-glossaire`;

/* ---------- Constantes du modèle (aucune valeur n'est fabriquée au hasard) ---------- */

const L = 100;            // km — longueur totale du profil.
const PLAIN_H = 100;      // m — altitude de la plaine du modèle.
const PLATEAU_H = 800;    // m — altitude du plateau du modèle.
const ESCARP_X = 40;      // km — abscisse du début de l'escarpement.
const SEA = 0;            // m — référence : niveau de la mer.

const PROFILES = {
  plaine: 'Plaine — surface basse et presque horizontale',
  plateau: 'Plateau — surface haute bordée d’un escarpement',
  dissque: 'Plateau disséqué — plateau entaillé par une vallée',
};
const DASHES = { plaine: [], plateau: [], dissque: [2, 3] };

/* ---------- État de module (survit au `stage.innerHTML = ''` de la coque) ---------- */

const S = {
  profile: 'plateau',
  width: 10,
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  reduced: () => false,
  nodes: {},
};

/* ---------- Formules déterministes (E024-04, E024-05, E024-06) ---------- */

const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');

function escarpEnd(width) {
  return Math.min(L - 5, ESCARP_X + width);
}

/* Altitude (m) en un point x (km) du profil choisi. Tout est fonction de x,
   du type de profil et de la largeur de l'escarpement : aucun aléa. */
function altitudeAt(x, profile, width) {
  const end = escarpEnd(width);
  if (profile === 'plaine') {
    /* Pénéplaine : faible ondulation déterministe autour de 100 m. */
    return PLAIN_H + 6 * Math.sin(x / 14) + 3 * Math.sin(x / 5);
  }
  let h;
  if (x <= ESCARP_X) {
    h = PLAIN_H + 4 * Math.sin(x / 16);
  } else if (x >= end) {
    h = PLATEAU_H + 10 * Math.sin((x - end) / 20);
  } else {
    const t = (x - ESCARP_X) / (end - ESCARP_X);
    h = PLAIN_H + (PLATEAU_H - PLAIN_H) * t;
  }
  if (profile === 'dissque') {
    /* Vallée en V centrée à 78 km, large de 14 km, profonde de 220 m. */
    const cx = 78;
    const half = 7;
    const depth = 220;
    if (x > cx - half && x < cx + half) {
      const d = Math.abs(x - cx) / half;
      h -= depth * (1 - d);
    }
  }
  return h;
}

function measures(profile, width) {
  const delta = profile === 'plaine' ? 0 : PLATEAU_H - PLAIN_H;
  const end = escarpEnd(width);
  const run = (end - ESCARP_X) * 1000; /* m */
  const pct = run > 0 ? (delta / run) * 100 : 0;
  const deg = run > 0 ? Math.atan(delta / run) * (180 / Math.PI) : 0;
  return {
    plainH: PLAIN_H,
    plateauH: profile === 'plaine' ? PLAIN_H : PLATEAU_H,
    delta,
    rapport: profile === 'plaine' ? 1 : PLATEAU_H / PLAIN_H,
    pentePct: pct,
    penteDeg: deg,
    largeur: end - ESCARP_X,
  };
}

/* ---------- E024-10 : fabrique DOM locale et gardes d'idempotence ---------- */

function fabriquer(ctx, tag, className, text) {
  if (typeof ctx.el === 'function') return ctx.el(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* ---------- Feuille de style unique (E024-10), injectée une seule fois ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${TITLE_ID}{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:68ch}
#${PANEL_ID} .${PREFIX}-lede{color:var(--ink-soft,#d7d1c6)}
#${PANEL_ID} .${PREFIX}-fait{
  margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f);
}
#${PANEL_ID} dfn{font-style:normal;color:var(--gold-bright,#f4d69e);border-bottom:1px dotted var(--gold,#e6b96f)}
#${TABLE_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${TABLE_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${TABLE_ID} th,#${TABLE_ID} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top;line-height:1.45}
#${TABLE_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${TABLE_ID} td{color:var(--ink-soft,#d7d1c6)}
#${PROFILE_ID}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${PROFILE_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${PREFIX}-choix{
  display:inline-flex;align-items:center;gap:5px;min-height:44px;margin-right:8px;
  padding:2px 6px;border:1px solid transparent;border-radius:8px;cursor:pointer;
}
#${PANEL_ID} .${PREFIX}-choix:has(input:checked){border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12);color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} .${PREFIX}-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#${WIDTH_ID}{width:100%;min-height:24px;accent-color:var(--gold,#e6b96f)}
#${WIDTH_OUT_ID}{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${CANVAS_ID}{
  display:block;width:100%;max-width:420px;height:auto;aspect-ratio:420/240;
  margin:8px auto;border:1px solid var(--line);border-radius:8px;
  background:rgba(0,0,0,.28);touch-action:manipulation;
}
#${LEGEND_ID}{margin:6px 0;font-size:10px;color:var(--muted);line-height:1.6}
#${READOUT_ID}{
  min-height:34px;margin:8px 0;padding:7px 8px;border:1px solid var(--line);
  border-left:2px solid var(--gold,#e6b96f);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;line-height:1.7;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${LIMITE_ID}{margin:9px 0 0;padding:7px 9px;border:1px dashed var(--line);border-radius:8px;color:var(--muted);font-size:10px;line-height:1.7}
#${DEFI_ID}{margin:6px 0;padding-left:18px;font-size:10px;color:var(--ink-soft,#d7d1c6)}
#${DEFI_ID} li{margin:2px 0}
#${GLOSSAIRE_ID}{margin:8px 0;font-size:10px;color:var(--ink-soft,#d7d1c6);line-height:1.7}
#${GLOSSAIRE_ID} dt{color:var(--gold-bright,#f4d69e);font-weight:600;margin-top:4px}
#${GLOSSAIRE_ID} dd{margin:0 0 2px 12px}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;font-weight:600;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.${PREFIX}-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[data-${PREFIX}-reduced="1"] button,
#${PANEL_ID}[data-${PREFIX}-reduced="1"] .${PREFIX}-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.${PREFIX}-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${CANVAS_ID}{max-width:100%;aspect-ratio:320/240}
  #${PANEL_ID} .${PREFIX}-choix{margin-right:4px}
  .${PREFIX}-badge{left:8px;bottom:8px;max-width:70%;font-size:9px}
}
`;

/* ---------- E024-01 : section sémantique d'introduction (lisible sans JS) ---------- */

function staticFacts() {
  const wrap = document.createElement('div');
  const faits = [
    ['Une <dfn>plaine</dfn> est une vaste surface basse et peu accidentée, généralement sous 200 mètres d’altitude, modelée par la sédimentation ou par une longue érosion (pénéplaine).', 'plaine'],
    ['Un <dfn>plateau</dfn> est une surface haute et relativement plane, souvent au-dessus de 500 mètres, bordée de versants abruptes appelés <dfn>escarpements</dfn> ou talus.', 'plateau'],
    ['Le critère qui distingue le plateau de la plaine n’est pas seulement l’altitude : c’est l’existence de bords pentus qui isolent une surface topique plate. La montagne s’en distingue par des pentes fortes sur toute l’étendue.', 'distinction'],
  ];
  faits.forEach(([html, cle]) => {
    const p = document.createElement('p');
    p.className = `${PREFIX}-fait`;
    /* Le texte est inséré de façon sûre : on remplace les balises <dfn> par
       des nœuds réels, sans jamais interpréter de HTML arbitraire. */
    const parties = html.split(/(<dfn>[^<]*<\/dfn>)/g);
    parties.forEach((partie) => {
      const m = /^<dfn>([^<]*)<\/dfn>$/.exec(partie);
      if (m) {
        const dfn = document.createElement('dfn');
        dfn.textContent = m[1];
        p.appendChild(dfn);
      } else if (partie) {
        p.appendChild(document.createTextNode(partie));
      }
    });
    void cle;
    wrap.appendChild(p);
  });
  return wrap;
}

/* ---------- E024-02 : tableau comparatif (référence = niveau de la mer) ---------- */

function staticTable(ctx) {
  const table = fabriquer(ctx, 'table', '');
  table.id = TABLE_ID;
  const caption = fabriquer(ctx, 'caption', '',
    'Formes de relief du modèle comparées au niveau de la mer (référence : 0 mètre).');
  table.appendChild(caption);

  const thead = fabriquer(ctx, 'thead', '');
  const hr = fabriquer(ctx, 'tr', '');
  ['Forme', 'Altitude', 'Pente des bords', 'Processus dominant'].forEach((h) => {
    const th = fabriquer(ctx, 'th', '', h);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = fabriquer(ctx, 'tbody', '');
  const lignes = [
    ['Plaine', '100 m (réf. 0 m)', 'Moins de 2°', 'Sédimentation ou pénéplanation'],
    ['Plateau', '800 m (8× la plaine)', '7 % sur 10 km (≈ 4°)', 'Soulèvement puis érosion'],
    ['Montagne (repère)', 'Plus de 1 500 m', 'Plus de 25° partout', 'Tectonique / orogenèse'],
  ];
  lignes.forEach((cells) => {
    const tr = fabriquer(ctx, 'tr', '');
    cells.forEach((c, i) => {
      const cell = fabriquer(ctx, i === 0 ? 'th' : 'td', '', c);
      if (i === 0) cell.scope = 'row';
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- E024-10 : glossaire, défi falsifiable et limites ---------- */

function staticGlossaire(ctx) {
  const div = fabriquer(ctx, 'div', '');
  const titre = fabriquer(ctx, 'h3', '', 'Glossaire — définitions à la première occurrence');
  const dl = fabriquer(ctx, 'dl', '');
  dl.id = GLOSSAIRE_ID;
  const termes = [
    ['Plaine', 'Surface basse et peu accidentée, ici vers 100 m dans le modèle.'],
    ['Pénéplaine', 'Plaine très érodée, presque plane, façonnée sur un temps géologique long.'],
    ['Plateau', 'Surface haute et plate, ici à 800 m, isolée par des bords pentus.'],
    ['Escarpement', 'Versant abrupt qui sépare le plateau de la plaine ; sa largeur commande la pente.'],
    ['Dénivelé', 'Différence d’altitude entre deux points : 700 m entre la plaine et le plateau du modèle.'],
    ['Pente', 'Rapport entre le dénivelé et la distance horizontale, exprimé en pourcentage ou en degrés.'],
  ];
  termes.forEach(([terme, definition]) => {
    dl.appendChild(fabriquer(ctx, 'dt', '', terme));
    dl.appendChild(fabriquer(ctx, 'dd', '', definition));
  });
  div.append(titre, dl);
  return div;
}

function staticDefi(ctx) {
  const wrap = fabriquer(ctx, 'div', '');
  wrap.appendChild(fabriquer(ctx, 'h3', '', 'À vous de jouer : la pente suit-elle vraiment la largeur ?'));
  const ol = fabriquer(ctx, 'ol', '');
  ol.id = DEFI_ID;
  const etapes = [
    'Prédiction : avec le profil « Plateau », doubler la largeur de l’escarpement de 5 à 10 km doit diviser la pente par deux (de 14 % à 7 %).',
    'Réglage : choisissez « Plateau », placez le curseur de largeur à 5 km, lisez le readout, puis passez-le à 10 km.',
    'Résultat attendu : le dénivelé reste à 700 m, la pente passe de 14 % (≈ 8,0°) à 7 % (≈ 4,0°) et le tracé du talus s’adoucit.',
    'Falsification : si la pente augmentait ou restait identique quand la largeur grandit, le modèle décrit ici serait en défaut.',
    'Débrief : la pente est une fonction déterministe du dénivelé et de la largeur ; cette coupe reste un schéma, pas la mesure d’un terrain réel.',
  ];
  etapes.forEach((texte) => {
    ol.appendChild(fabriquer(ctx, 'li', '', texte));
  });
  wrap.appendChild(ol);
  return wrap;
}

function staticLimites(ctx) {
  const wrap = fabriquer(ctx, 'div', '');
  wrap.appendChild(fabriquer(ctx, 'h3', '', 'Limites et angles morts'));
  const p = fabriquer(ctx, 'p', '',
    'La coupe est un modèle à une dimension : elle illustre une relation entre altitude, largeur et pente, mais elle ne représente aucun terrain mesuré. Les ondulations sinusoïdales de la plaine et du plateau sont purement illustratives. Le repère animé avance au rythme du temps écoulé : sa position dépend donc de la vitesse d’affichage, mais sa trajectoire est déterministe et reproductible par le clavier (flèches gauche et droite, Début et Fin). En mouvement réduit, l’animation est désactivée et un seul dessin est produit. Aucune grandeur n’est portée par la seule couleur : traits pleins, tirets, pointillés, hachures et libellés doublent chaque code.');
  p.id = LIMITE_ID;
  p.setAttribute('role', 'note');
  wrap.appendChild(p);
  return wrap;
}

/* ---------- Construction du panneau (E024-03, E024-04) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      plaine: document.getElementById(`${PREFIX}-prof-plaine`),
      plateau: document.getElementById(`${PREFIX}-prof-plateau`),
      dissque: document.getElementById(`${PREFIX}-prof-dissque`),
      width: document.getElementById(WIDTH_ID),
      widthOut: document.getElementById(WIDTH_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      legend: document.getElementById(LEGEND_ID),
    };
  }

  const panel = fabriquer(ctx, 'section', `${PREFIX}-panel`);
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = fabriquer(ctx, 'h2', '', 'Plateaux et plaines — lire le relief');
  title.id = TITLE_ID;
  const lead = fabriquer(ctx, 'p', `${PREFIX}-lede`,
    'Comparer une plaine, un plateau et un plateau disséqué permet de voir qu’un relief se lit par son altitude, par la pente de ses bords et par l’histoire de son érosion. Le jeu de données de la carte ne contenant aucune altitude, le laboratoire ci-dessous est un schéma analytique et non un terrain local.');

  panel.append(title, lead, staticFacts(), staticTable(ctx), staticGlossaire(ctx));

  /* E024-03 — sélecteur de profil : radios natifs dans un fieldset légendé
     portant role="radiogroup" (choix unique, jamais d'aria-pressed ici). */
  const fieldset = fabriquer(ctx, 'fieldset', '');
  fieldset.id = PROFILE_ID;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Profil observé (choix unique)');
  const legend = fabriquer(ctx, 'legend', '', 'Profil observé (choix unique)');
  fieldset.appendChild(legend);
  [['plaine', 'Plaine'], ['plateau', 'Plateau'], ['dissque', 'Plateau disséqué']].forEach(([value, label]) => {
    const lab = fabriquer(ctx, 'label', `${PREFIX}-choix`);
    const radio = fabriquer(ctx, 'input', '');
    radio.type = 'radio';
    radio.name = RADIO_NAME;
    radio.id = `${PREFIX}-prof-${value}`;
    radio.value = value;
    radio.checked = S.profile === value;
    radio.setAttribute('aria-label', label);
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(label));
    fieldset.appendChild(lab);
  });

  /* E024-04 — curseur de largeur d'escarpement. */
  const sub = fabriquer(ctx, 'h3', '', 'Faire varier l’escarpement');
  const widthRow = fabriquer(ctx, 'p', '');
  const widthLabel = fabriquer(ctx, 'label', '');
  widthLabel.setAttribute('for', WIDTH_ID);
  widthLabel.appendChild(document.createTextNode('Largeur de l’escarpement : '));
  const widthOut = fabriquer(ctx, 'span', '', '');
  widthOut.id = WIDTH_OUT_ID;
  widthLabel.appendChild(widthOut);
  widthRow.appendChild(widthLabel);

  const width = fabriquer(ctx, 'input', '');
  width.type = 'range';
  width.id = WIDTH_ID;
  width.min = '5';
  width.max = '30';
  width.step = '1';
  width.value = String(S.width);
  width.setAttribute('aria-label', 'Largeur de l’escarpement, de 5 à 30 kilomètres');

  /* E024-05 — laboratoire canvas. */
  const canvas = fabriquer(ctx, 'canvas', '');
  canvas.id = CANVAS_ID;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Profil topographique en coupe. Flèches gauche et droite : déplacer le repère d’observation ; flèches haut et bas : changer de profil ; Début et Fin : placer le repère aux extrémités.');

  const legendText = fabriquer(ctx, 'p', `${PREFIX}-legend`, '');
  legendText.id = LEGEND_ID;

  /* E024-06 — grandeurs chiffrées annoncées. */
  const readout = fabriquer(ctx, 'p', '');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  /* E024-07 — bascule d'animation (bascule indépendante : aria-pressed licite). */
  const play = fabriquer(ctx, 'button', '', '');
  play.type = 'button';
  play.id = PLAY_ID;
  play.setAttribute('aria-pressed', 'false');

  panel.append(fieldset, sub, widthRow, width, canvas, legendText, readout, play,
    staticDefi(ctx), staticLimites(ctx));

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    plaine: document.getElementById(`${PREFIX}-prof-plaine`),
    plateau: document.getElementById(`${PREFIX}-prof-plateau`),
    dissque: document.getElementById(`${PREFIX}-prof-dissque`),
    width, widthOut, canvas, readout, play, legend: legendText,
  };
}

/* ---------- E024-05, E024-08 : laboratoire canvas (un seul, déterministe) ---------- */

function drawLab() {
  const cv = S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 240;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 16;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const MIN_A = -100;
  const MAX_A = 1000;
  const toPx = (x, a) => [
    pad + (x / L) * iw,
    pad + (1 - (a - MIN_A) / (MAX_A - MIN_A)) * ih,
  ];

  /* Cadre et graduations de l'axe horizontal (km). */
  g.strokeStyle = 'rgba(255,255,255,.16)';
  g.lineWidth = 1;
  g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);
  g.fillStyle = 'rgba(214,207,193,.65)';
  g.font = '9px sans-serif';
  for (let x = 0; x <= L; x += 20) {
    const [px, py] = toPx(x, MIN_A);
    g.beginPath();
    g.moveTo(px, py - 4);
    g.lineTo(px, py + 4);
    g.stroke();
    g.fillText(`${x} km`, px + 2, py - 6);
  }

  /* Niveau de la mer : référence 0 m, trait tiré (jamais la couleur seule). */
  const [seaX0, seaY] = toPx(0, SEA);
  const seaX1 = toPx(L, SEA)[0];
  g.strokeStyle = 'rgba(255,255,255,.55)';
  g.setLineDash([6, 4]);
  g.beginPath();
  g.moveTo(seaX0, seaY);
  g.lineTo(seaX1, seaY);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(214,207,193,.75)';
  g.fillText('0 m — niveau de la mer (référence)', seaX0 + 3, seaY - 4);

  /* Corps du relief : hachures sous le plateau, pointillés sous la plaine. */
  g.save();
  g.beginPath();
  g.moveTo(pad, toPx(0, MIN_A)[1]);
  for (let x = 0; x <= L; x += 1) g.lineTo(...toPx(x, altitudeAt(x, S.profile, S.width)));
  g.lineTo(pad + iw, toPx(L, MIN_A)[1]);
  g.closePath();
  g.clip();
  g.strokeStyle = 'rgba(230,185,111,.20)';
  g.lineWidth = 1;
  for (let x = 0; x <= L; x += 6) {
    const [px] = toPx(x, 0);
    const by = toPx(0, MIN_A)[1];
    g.setLineDash(S.profile === 'plaine' ? [2, 3] : []);
    g.beginPath();
    g.moveTo(px, by);
    g.lineTo(px + 10, by - ih);
    g.stroke();
  }
  g.restore();
  g.setLineDash([]);

  /* Surface : trait plein, échantillonné sur le modèle. */
  g.strokeStyle = 'rgba(214,207,193,.95)';
  g.lineWidth = 1.6;
  g.beginPath();
  for (let x = 0; x <= L; x += 1) {
    const [px, py] = toPx(x, altitudeAt(x, S.profile, S.width));
    if (x === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.stroke();

  /* Escarpement : trait épaissi + hachures (repère non chromatique). */
  if (S.profile !== 'plaine') {
    const end = escarpEnd(S.width);
    g.strokeStyle = 'rgba(244,214,158,.98)';
    g.lineWidth = 3;
    g.beginPath();
    for (let x = ESCARP_X; x <= end; x += 0.5) {
      const [px, py] = toPx(x, altitudeAt(x, S.profile, S.width));
      if (x === ESCARP_X) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.stroke();
    g.lineWidth = 1;
    for (let x = ESCARP_X + 1; x < end; x += 2) {
      const [px, py] = toPx(x, altitudeAt(x, S.profile, S.width));
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px - 5, py + 9);
      g.stroke();
    }
    const [lx, ly] = toPx(ESCARP_X + (end - ESCARP_X) / 2, (PLAIN_H + PLATEAU_H) / 2);
    g.fillStyle = 'rgba(244,214,158,.98)';
    g.fillText('escarpement', lx + 4, ly);
  }

  /* Vallée du plateau disséqué : pointillés, distincts du trait de surface. */
  if (S.profile === 'dissque') {
    g.strokeStyle = 'rgba(255,255,255,.9)';
    g.lineWidth = 1.5;
    g.setLineDash(DASHES.dissque);
    g.beginPath();
    for (let x = 71; x <= 85; x += 0.5) {
      const [px, py] = toPx(x, altitudeAt(x, S.profile, S.width));
      if (x === 71) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.stroke();
    g.setLineDash([]);
    const [vx, vy] = toPx(78, altitudeAt(78, S.profile, S.width));
    g.fillStyle = 'rgba(255,255,255,.9)';
    g.fillText('vallée d’érosion', vx + 5, vy - 4);
  }

  /* Repère d'observation : position déterministe f(S.sweep). */
  const obsX = S.sweep * L;
  const obsA = altitudeAt(obsX, S.profile, S.width);
  const [ox, oy] = toPx(obsX, obsA);
  const [, baseY] = toPx(obsX, MIN_A);
  g.strokeStyle = 'rgba(255,255,255,.7)';
  g.setLineDash([2, 3]);
  g.beginPath();
  g.moveTo(ox, baseY);
  g.lineTo(ox, oy);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(244,214,158,.98)';
  g.beginPath();
  g.arc(ox, oy, 4, 0, Math.PI * 2);
  g.fill();
  g.fillText(`repère · ${Math.round(obsA)} m`, Math.min(ox + 6, pad + iw - 78), Math.max(pad + 10, oy - 8));

  g.fillStyle = 'rgba(214,207,193,.85)';
  g.fillText(PROFILES[S.profile], pad + 2, pad + 13);
}

/* ---------- E024-06 : grandeurs chiffrées comparées à une référence ---------- */

function updateReadout() {
  const m = measures(S.profile, S.width);
  const n = S.nodes.readout;
  if (!n) return;
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  if (S.profile === 'plaine') {
    n.appendChild(document.createTextNode('Plaine : surface à '));
    n.appendChild(fort(`${m.plainH} m`));
    n.appendChild(document.createTextNode(' au-dessus de la mer (référence 0 m). Ondulation faible, pente négligeable : pas d’escarpement. Référence de comparaison : la plaine sert ici de base, le rapport vaut '));
    n.appendChild(fort('1'));
    n.appendChild(document.createTextNode('.'));
    return;
  }
  n.appendChild(document.createTextNode('Plaine '));
  n.appendChild(fort(`${m.plainH} m`));
  n.appendChild(document.createTextNode(' au-dessus de la mer (référence 0 m) ; plateau '));
  n.appendChild(fort(`${m.plateauH} m`));
  n.appendChild(document.createTextNode(', soit '));
  n.appendChild(fort(`${fmt(m.rapport)}×`));
  n.appendChild(document.createTextNode(' la plaine ; dénivelé '));
  n.appendChild(fort(`${m.delta} m`));
  n.appendChild(document.createTextNode(' ; escarpement large de '));
  n.appendChild(fort(`${m.largeur} km`));
  n.appendChild(document.createTextNode(' → pente '));
  n.appendChild(fort(`${fmt(m.pentePct)} %`));
  n.appendChild(document.createTextNode(' (≈ '));
  n.appendChild(fort(`${fmt(m.penteDeg)}°`));
  n.appendChild(document.createTextNode('). Plus l’escarpement est étroit, plus la pente est forte.'));
}

function syncControls() {
  const n = S.nodes;
  if (n.plaine) n.plaine.checked = S.profile === 'plaine';
  if (n.plateau) n.plateau.checked = S.profile === 'plateau';
  if (n.dissque) n.dissque.checked = S.profile === 'dissque';
  if (n.width) n.width.value = String(S.width);
  if (n.widthOut) n.widthOut.textContent = `${S.width} km`;
  if (n.legend) {
    n.legend.textContent = PROFILES[S.profile] + ' · traits : surface pleine, mer en tirets, vallée en pointillés, escarpement épaissi et hachuré — la couleur ne porte aucune information.';
  }
  if (n.play) {
    n.play.textContent = S.playing ? '■ Arrêter le parcours' : '▶ Animer le parcours';
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
  }
  updateReadout();
  drawLab();
}

/* ---------- E024-07 : boucle rAF unique, pause sur document.hidden ---------- */

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
  const reduced = typeof S.reduced === 'function' ? !!S.reduced() : false;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing && !reduced) S.sweep = (S.sweep + dt * 0.00006) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (S.playing && !reduced) S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners(ctx) {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        const reduced = !!mq.matches;
        S.reduced = () => reduced;
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.setAttribute(`data-${PREFIX}-reduced`, reduced ? '1' : '0');
        if (reduced) {
          S.playing = false;
          stopLoop();
        } else if (S.playing) {
          startLoop();
        }
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

/* ---------- E024-09 : badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = fabriquer(ctx, 'div', `${PREFIX}-badge`,
    'Carte schématique sans relief : l’altitude n’y est pas représentée. Plaine, plateau et escarpement sont expliqués dans le panneau.');
  badge.id = BADGE_ID;
  map.appendChild(badge);
}

/* ---------- Point d'entrée ---------- */

register('E024', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function') return;

  ctx.css(CSS_ID, CSS);

  const initialReduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  S.reduced = () => initialReduced;
  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  S.nodes.panel.setAttribute(`data-${PREFIX}-reduced`, initialReduced ? '1' : '0');
  if (initialReduced) S.playing = false;

  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    [n.plaine, n.plateau, n.dissque].forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.profile = radio.value;
        syncControls();
      });
    });
    n.width.addEventListener('input', () => {
      S.width = Math.max(5, Math.min(30, Math.round(Number(n.width.value))));
      syncControls();
    });
    n.play.addEventListener('click', () => {
      S.playing = !S.playing;
      if (S.playing && S.reduced()) S.playing = false;
      if (!S.playing) stopLoop(); else startLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const step = event.key === 'ArrowRight' ? 0.05 : -0.05;
        S.sweep = (S.sweep + step + 1) % 1;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const order = ['plaine', 'plateau', 'dissque'];
        const step = event.key === 'ArrowDown' ? 1 : -1;
        const i = order.indexOf(S.profile);
        S.profile = order[(i + step + order.length) % order.length];
      } else if (event.key === 'Home') {
        S.sweep = 0;
      } else if (event.key === 'End') {
        S.sweep = 1;
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
  if (S.playing) startLoop();
});
