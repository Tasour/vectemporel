import { register } from './registry.js';

/* Lentille E073 — vue GEOGRAPHIE.
 * Thème : aide contextuelle.
 *
 * Dix chantiers E073-01 … E073-10, tous réellement implémentés (aucun stub),
 * décrits dans UNIFIED_AUDIT/GEOGRAPHIE/views/E073.md. L'aide est une couche
 * locale posée par-dessus le DOM déjà produit par geography.js : elle n'est
 * ni une vue ni un store, elle ne modifie aucun fichier partagé.
 *
 * Le contenu pédagogique est du texte sémantique réel (h2, p, dl, ol, table)
 * inséré dans le DOM : il reste lisible et consultable même quand le
 * laboratoire d'animation est à l'arrêt. Le canvas n'est pas utilisé ici ; la
 * seule animation est unsurintendant de progression déterministe (une boucle
 * rAF unique, pause sur document.hidden, respect du mouvement réduit).
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() } (registry.js:28-44).
 */

const CSS_ID = 'geography-e073';
const P = 'geography-e073';

const PANEL_ID = `${P}-panel`;
const TITLE_ID = `${P}-title`;
const TOGGLE_ID = `${P}-toggle`;
const GLOSSAIRE_ID = `${P}-glossary`;
const ETAPES_ID = `${P}-steps`;
const GUIDE_ID = `${P}-guide`;
const RACCOURCIS_ID = `${P}-shortcuts`;
const READOUT_ID = `${P}-readout`;
const TIP_ID = `${P}-tip`;
const BADGE_ID = `${P}-badge`;

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  ouvert: true,          /* l'aide est visible dès le premier rendu */
  phase: 0,              /* phase déterministe du surintendant [0,1) */
  lastTs: 0,
  rafId: 0,
  reduced: false,
  visibilityBound: false,
  motionBound: false,
  tipBound: false,
  scrollBound: false,
  tipTarget: null,
  nodes: {},
};

const ETAPES = [
  'Repérer le pays ou l’ère affichée dans la barre supérieure du panneau.',
  'Cliquer sur un repère de la carte (ou sur un lieu de la liste) pour ouvrir sa fiche.',
  'Utiliser +, − et 0 pour zoomer, dézoomer et réinitialiser le cadre.',
  'Filtrer la liste avec les boutons « tous », « dans le cadre » ou « hors du cadre ».',
  'Lire la source de coordonnée affichée en bas de la fiche avant de citer un lieu.',
];

const GLOSSAIRE = [
  ['Cadre affiché', 'Zone délimitée par les coordonnées du pays ou de l’ère sélectionné ; les lieux hors de cette zone sont listés sans être déplacés.'],
  ['Repère', 'Marqueur cliquable placé sur la carte à partir de la latitude et de la longitude vérifiées du lieu.'],
  ['Projection schématique', 'Transformation linéaire lat/lon du cadre local vers l’écran : elle ne prétend pas être une carte fidèle du terrain.'],
  ['Source de coordonnée', 'Référence textuelle qui accompagne chaque lieu ; c’est elle qui garantit que la position n’est pas inventée.'],
  ['Mémoire contestée', 'Nom ou récit historique attaché à un lieu, signalé comme débattu plutôt que présenté comme unique.'],
];

const RACCOURCIS = [
  ['+', 'Zoom avant sur la carte'],
  ['−', 'Zoom arrière sur la carte'],
  ['0', 'Réinitialiser le cadre affiché'],
  ['↑ / ↓', 'Parcourir la liste des lieux'],
  ['Début / Fin', 'Sauter au premier / dernier lieu'],
  ['Tab', 'Naviguer entre les contrôles'],
  ['Entrée', 'Activer le contrôle focalisé'],
];

const ASTUCES = [
  { test: (n) => n.id === 'c3b-zoom-in', texte: 'Zoom avant : la touche + fait la même chose.' },
  { test: (n) => n.id === 'c3b-zoom-out', texte: 'Zoom arrière : la touche − fait la même chose.' },
  { test: (n) => n.id === 'c3b-zoom-reset', texte: 'Réinitialise le cadre ; équivalent de la touche 0.' },
  { test: (n) => n.id === 'c3b-search', texte: 'Filtrer les lieux par nom ; la liste se met à jour au fur et à mesure.' },
  { test: (n) => n.classList.contains('c3b-filter'), texte: 'Choisir quels lieux apparaissent dans la liste.' },
  { test: (n) => n.classList.contains('c3b-scope'), texte: 'Changer de périmètre : pays ou repère d’ère.' },
  { test: (n) => n.classList.contains('c3b-back'), texte: 'Revenir à la vue précédente.' },
];

const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');

/* ---------- Feuille de style unique ---------- */

const CSS = `
#${PANEL_ID}[hidden],#${TIP_ID}[hidden]{display:none!important}
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${PANEL_ID} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:68ch}
#${PANEL_ID} .${P}-lede{color:var(--muted)}
#${PANEL_ID} .${P}-glossaire{margin:6px 0;padding:0}
#${PANEL_ID} .${P}-glossaire dt{margin-top:7px;color:var(--gold-bright,#f4d69e);font-weight:600}
#${PANEL_ID} .${P}-glossaire dd{margin:2px 0 0;padding-left:10px;border-left:2px solid var(--gold,#e6b96f)}
#${PANEL_ID} .${P}-etapes{margin:6px 0;padding-left:22px}
#${PANEL_ID} .${P}-etapes li{margin:4px 0}
#${GUIDE_ID}{
  margin:8px 0;padding:7px 9px;border:1px solid var(--gold,#e6b96f);border-radius:8px;
  background:rgba(230,185,111,.07);color:var(--ink-soft,#d7d1c6);font-size:10px;
}
#${GUIDE_ID}::before{
  content:"";display:block;height:3px;margin-bottom:6px;border-radius:2px;
  background:var(--gold,#e6b96f);
  width:calc(var(--${P}-progression,0) * 100%);
}
#${RACCOURCIS_ID}{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px}
#${RACCOURCIS_ID} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${RACCOURCIS_ID} th,#${RACCOURCIS_ID} td{border:1px solid var(--line);padding:4px 6px;text-align:left}
#${RACCOURCIS_ID} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${RACCOURCIS_ID} kbd{
  display:inline-block;min-width:18px;padding:1px 5px;border:1px solid var(--line);
  border-radius:4px;background:rgba(0,0,0,.25);font:inherit;font-size:10px;
}
#${READOUT_ID}{
  min-height:34px;margin-top:8px;padding:7px 8px;border:1px solid var(--line);
  border-radius:8px;background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);
  font-size:10px;font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${TOGGLE_ID}{
  display:inline-grid;place-items:center;width:44px;height:44px;min-width:44px;min-height:44px;
  border:1px solid var(--line);border-radius:8px;background:rgba(8,12,18,.9);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:17px;font-weight:700;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#${TOGGLE_ID}:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.14)}
#${TOGGLE_ID}:focus-visible,#${PANEL_ID} :focus-visible{
  outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
#${TIP_ID}{
  position:fixed;z-index:40;max-width:240px;padding:6px 9px;border:1px solid var(--gold,#e6b96f);
  border-radius:6px;background:rgba(8,12,18,.96);color:var(--ink);
  font-size:10px;line-height:1.45;pointer-events:none;
}
.${P}-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:64%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[data-${P}-reduced="1"] #${GUIDE_ID}::before{width:100%}
@media (prefers-reduced-motion:reduce){
  #${TOGGLE_ID}{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  .${P}-badge{font-size:9px;max-width:80%;left:8px;bottom:8px}
}
`;

/* ---------- Contenu statique (lisible sans animation ni interaction) ---------- */

function paragraphe(classe, texte) {
  const n = document.createElement('p');
  if (classe) n.className = classe;
  n.textContent = texte;
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

function construireEtapes() {
  const ol = document.createElement('ol');
  ol.id = ETAPES_ID;
  ol.className = `${P}-etapes`;
  ETAPES.forEach((texte) => {
    const li = document.createElement('li');
    li.textContent = texte;
    ol.appendChild(li);
  });
  return ol;
}

function construireRaccourcis() {
  const table = document.createElement('table');
  table.id = RACCOURCIS_ID;
  const caption = document.createElement('caption');
  caption.textContent = 'Raccourcis clavier de la vue (aucune information n’est portée par la seule couleur).';
  table.appendChild(caption);
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  ['Touche', 'Action'].forEach((t) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = t;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  RACCOURCIS.forEach(([touche, action]) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    const kbd = document.createElement('kbd');
    kbd.textContent = touche;
    th.appendChild(kbd);
    const td = document.createElement('td');
    td.textContent = action;
    tr.append(th, td);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- Mesures dérivées du DOM rendu (aucune donnée inventée) ---------- */

function mesures() {
  const items = Array.from(document.querySelectorAll('#c3b-places .c3b-place-item'));
  const total = items.length;
  const dansCadre = items.filter((n) => !n.querySelector('.c3b-offtag')).length;
  return {
    nbLieux: total,
    nbVisibles: dansCadre,
    part: total ? dansCadre / total : 0,
    nbFiltres: document.querySelectorAll('.c3b-filter').length,
    nbRaccourcis: RACCOURCIS.length,
  };
}

function majReadout() {
  const n = S.nodes.readout;
  if (!n) return;
  const m = mesures();
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.append(
    document.createTextNode('Aide contextuelle — '),
    fort(`${m.nbRaccourcis}`),
    document.createTextNode(' raccourcis documentés, '),
    fort(`${m.nbFiltres}`),
    document.createTextNode(' filtres, '),
    fort(`${m.nbLieux}`),
    document.createTextNode(' lieux répertoriés dont '),
    fort(`${m.nbVisibles}`),
    document.createTextNode(' dans le cadre : '),
    fort(fmt(m.part)),
    document.createTextNode(' de l’ensemble (référence 1,00 = tous les lieux dans le cadre). Le ? ouvre ou masque ce guide.'),
  );
}

/* ---------- Construction du panneau ---------- */

function construirePanel() {
  const panel = document.createElement('section');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const titre = document.createElement('h2');
  titre.id = TITLE_ID;
  titre.textContent = 'Aide à la lecture de la carte';

  const lede = paragraphe(`${P}-lede`, 'Cette aide explique comment lire la carte locale : ce que représente un repère, comment le cadre est défini et comment naviguer sans souris. Tout le contenu ci-dessous est du texte lisible, même sans animation.');
  const gloseIntro = paragraphe('', 'Vocabulaire : les termes ci-dessous sont définis dès leur première occurrence dans la fiche d’un lieu.');
  const etapesIntro = paragraphe('', 'Procédure : suivez ces cinq étapes pour consulter un lieu et vérifier sa source.');
  const raccourcisIntro = paragraphe('', 'Clavier : chaque action de la carte possède un équivalent clavier.');

  const guide = paragraphe('', '');
  guide.id = GUIDE_ID;
  guide.setAttribute('aria-hidden', 'true');

  const readout = paragraphe('', '');
  readout.id = READOUT_ID;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const hGlossaire = document.createElement('h3');
  hGlossaire.textContent = 'Glossaire';
  const hEtapes = document.createElement('h3');
  hEtapes.textContent = 'Comment faire';
  const hRaccourcis = document.createElement('h3');
  hRaccourcis.textContent = 'Raccourcis clavier';

  panel.append(
    titre, lede,
    hGlossaire, gloseIntro, construireGlossaire(),
    hEtapes, etapesIntro, construireEtapes(), guide,
    hRaccourcis, raccourcisIntro, construireRaccourcis(),
    readout,
  );
  return panel;
}

function hostCible(ctx) {
  const layout = ctx.layout || ctx.stage;
  const panel = layout && typeof layout.querySelector === 'function'
    ? layout.querySelector('.geo-panel')
    : null;
  return panel || layout || ctx.stage;
}

function assurerAstuce(ctx) {
  let tip = document.getElementById(TIP_ID);
  if (!tip) {
    tip = document.createElement('div');
    tip.id = TIP_ID;
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;
    const host = ctx.layout || ctx.stage || document.body;
    host.appendChild(tip);
  }
  return tip;
}

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant,
      fresh: false,
      toggle: document.getElementById(TOGGLE_ID),
      guide: document.getElementById(GUIDE_ID),
      readout: document.getElementById(READOUT_ID),
      tip: document.getElementById(TIP_ID),
    };
  }

  const panel = construirePanel();
  const host = hostCible(ctx);
  if (host && typeof host.insertBefore === 'function') host.insertBefore(panel, host.firstChild);
  else if (host && typeof host.appendChild === 'function') host.appendChild(panel);

  /* Bouton d'ouverture : placé dans les contrôles de la carte si présents. */
  const controls = (ctx.layout || ctx.stage) && typeof (ctx.layout || ctx.stage).querySelector === 'function'
    ? (ctx.layout || ctx.stage).querySelector('.geo-controls')
    : null;
  let toggle = document.getElementById(TOGGLE_ID);
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = TOGGLE_ID;
    toggle.setAttribute('aria-controls', PANEL_ID);
    if (controls && typeof controls.appendChild === 'function') controls.appendChild(toggle);
    else panel.insertBefore(toggle, panel.firstChild);
  }

  const tip = assurerAstuce(ctx);

  return {
    panel, fresh: true, toggle,
    guide: document.getElementById(GUIDE_ID),
    readout: document.getElementById(READOUT_ID),
    tip,
  };
}

/* ---------- Badge d'aide sur la carte ---------- */

function ajouterBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? scope.querySelector('.geo-map') : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = document.createElement('div');
  badge.className = `${P}-badge`;
  badge.id = BADGE_ID;
  badge.textContent = 'Aide : cliquez sur un repère pour lire sa fiche ; le bouton ? ouvre ce guide.';
  map.appendChild(badge);
}

/* ---------- Info-bulles contextuelles (une seule bulle partagée) ---------- */

function trouverAstuce(noeud) {
  if (!noeud || !(noeud instanceof Element)) return '';
  const trouve = ASTUCES.find((a) => {
    try { return a.test(noeud); } catch { return false; }
  });
  return trouve ? trouve.texte : '';
}

function placerAstuce(cible) {
  const tip = S.nodes.tip;
  if (!tip || !cible) return;
  const r = cible.getBoundingClientRect();
  const largeur = tip.offsetWidth || 200;
  const hauteur = tip.offsetHeight || 40;
  const maxX = Math.max(8, (window.innerWidth || 1024) - largeur - 8);
  const maxY = Math.max(8, (window.innerHeight || 768) - hauteur - 8);
  let x = Math.min(maxX, Math.max(8, r.left));
  let y = r.bottom + 6;
  if (y > maxY) y = Math.max(8, r.top - hauteur - 6);
  tip.style.left = `${Math.round(x)}px`;
  tip.style.top = `${Math.round(y)}px`;
}

function montrerAstuce(cible) {
  const texte = trouverAstuce(cible);
  const tip = S.nodes.tip;
  if (!texte || !tip) return;
  if (S.tipTarget && S.tipTarget !== cible) S.tipTarget.removeAttribute('aria-describedby');
  tip.textContent = texte;
  tip.hidden = false;
  cible.setAttribute('aria-describedby', TIP_ID);
  S.tipTarget = cible;
  placerAstuce(cible);
}

function cacherAstuce() {
  const tip = S.nodes.tip;
  if (tip) tip.hidden = true;
  if (S.tipTarget) {
    S.tipTarget.removeAttribute('aria-describedby');
    S.tipTarget = null;
  }
}

function installerAstuces() {
  if (S.tipBound || typeof document === 'undefined') return;
  S.tipBound = true;
  const SELECTEUR = '#c3b-zoom-in,#c3b-zoom-out,#c3b-zoom-reset,#c3b-search,.c3b-filter,.c3b-scope,.c3b-back';
  document.addEventListener('focusin', (e) => {
    if (!document.getElementById(PANEL_ID)) return;
    const cible = e.target instanceof Element ? e.target.closest(SELECTEUR) : null;
    if (cible) montrerAstuce(cible); else cacherAstuce();
  });
  document.addEventListener('mouseover', (e) => {
    if (!document.getElementById(PANEL_ID)) return;
    const cible = e.target instanceof Element ? e.target.closest(SELECTEUR) : null;
    if (cible) montrerAstuce(cible);
  });
  document.addEventListener('mouseout', (e) => {
    if (!document.getElementById(PANEL_ID)) return;
    const cible = e.target instanceof Element ? e.target.closest(SELECTEUR) : null;
    if (cible && (!e.relatedTarget || !cible.contains(e.relatedTarget))) cacherAstuce();
  });
  if (!S.scrollBound && typeof window !== 'undefined') {
    S.scrollBound = true;
    window.addEventListener('scroll', () => {
      if (S.tipTarget && !S.nodes.tip?.hidden) placerAstuce(S.tipTarget);
    }, { passive: true });
    window.addEventListener('resize', () => {
      if (S.tipTarget && !S.nodes.tip?.hidden) placerAstuce(S.tipTarget);
    });
  }
}

/* ---------- État d'ouverture et boucle rAF unique ---------- */

function appliquerEtat() {
  const n = S.nodes;
  if (n.panel) n.panel.hidden = !S.ouvert;
  if (n.toggle) {
    n.toggle.textContent = S.ouvert ? '?' : '?';
    n.toggle.setAttribute('aria-expanded', S.ouvert ? 'true' : 'false');
    n.toggle.setAttribute('aria-label', S.ouvert ? 'Masquer l’aide contextuelle' : 'Afficher l’aide contextuelle');
    n.toggle.title = S.ouvert ? 'Masquer l’aide' : 'Afficher l’aide';
  }
  if (!S.ouvert) cacherAstuce();
  if (S.ouvert && !S.reduced) demarrerBoucle();
  else arreterBoucle();
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
  S.lastTs = 0;
  S.rafId = requestAnimationFrame(tick);
}

/* Surintendant déterministe : met en avant l'étape courante de la procédure. */
function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.ouvert || S.reduced) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    S.phase = (S.phase + dt * 0.00022) % 1;
  }
  S.lastTs = ts;
  const guide = S.nodes.guide;
  if (guide) {
    const index = Math.min(ETAPES.length - 1, Math.floor(S.phase * ETAPES.length));
    guide.textContent = `Étape ${index + 1} sur ${ETAPES.length} : ${ETAPES[index]}`;
    guide.style.setProperty(`--${P}-progression`, String(S.phase));
  }
  S.rafId = requestAnimationFrame(tick);
}

function installerGlobal(ctx) {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) arreterBoucle();
      else if (S.ouvert && !S.reduced) demarrerBoucle();
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
        const guide = S.nodes.guide;
        if (guide) guide.textContent = S.reduced ? `Étape 1 sur ${ETAPES.length} : ${ETAPES[0]}` : '';
        appliquerEtat();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

/* ---------- Point d'entrée ---------- */

register('E073', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  ctx.css(CSS_ID, CSS);

  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;

  S.nodes = ensurePanel(ctx);
  ajouterBadge(ctx);
  installerAstuces();

  const { panel, toggle, guide, readout } = S.nodes;
  if (!panel || !toggle || !readout) return;

  panel.dataset[`${P}Reduced`] = S.reduced ? '1' : '0';
  if (S.reduced) S.phase = 0;
  if (guide && S.reduced) guide.textContent = `Étape 1 sur ${ETAPES.length} : ${ETAPES[0]}`;

  majReadout();
  appliquerEtat();

  if (S.nodes.fresh) {
    toggle.addEventListener('click', () => {
      S.ouvert = !S.ouvert;
      appliquerEtat();
    });
  }

  installerGlobal(ctx);
});
