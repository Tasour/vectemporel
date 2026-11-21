import { register } from './registry.js';

/* Lentille E064 — passe V2, domaine G (performance & rendu).
 * Thème : DPR ≤ 2 si canvas. Le module lit devicePixelRatio, le plafonne à 2,
 * applique ce plafond aux éventuels canvas de la vue et rend le résultat lisible.
 * Il ne crée aucun canvas, ne lance ni rAF ni timer et n'utilise aucun aléa.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E064.md — chantiers E064-01 à E064-10.
 * Fichier possédé : src/views/chronology/v2/E064.js uniquement. Lectures seules :
 * modèles de qualité E049 (passe 1). Aucun fichier partagé n'est modifié
 * (registry.js, index.js, styles.css, src/views/chronology.js intacts).
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } ;
 * helpers ctx.css(id, rules), ctx.el(tag, className, text), ctx.reducedMotion().
 *
 * Invariants :
 * - un seul register('E064', ctx => { … }), un seul ctx.css('chronology-v2-e064', …) ;
 * - tous les IDs sont préfixés chronology-v2-e064- et protégés par une garde
 *   d'existence (idempotence multi-rendus) ;
 * - zéro canvas créé, zéro Math.random, zéro fetch/XHR, zéro console.*,
 *   zéro innerHTML, zéro timer, zéro rAF, zéro MutationObserver ;
 * - une seule veille matchMedia(resolution), ré-armée sans jamais s'accumuler.
 */

const CSS_ID = 'chronology-v2-e064';
const PANEL_ID = 'chronology-v2-e064-panel';
const TITLE_ID = 'chronology-v2-e064-title';
const BRUT_ID = 'chronology-v2-e064-brut';
const EFFECTIF_ID = 'chronology-v2-e064-effectif';
const FACTEUR_ID = 'chronology-v2-e064-facteur';
const CANVAS_ID = 'chronology-v2-e064-canvas';
const LISTE_ID = 'chronology-v2-e064-liste';
const APPLIQUES_ID = 'chronology-v2-e064-appliques';
const CREES_ID = 'chronology-v2-e064-crees';
const REEVALS_ID = 'chronology-v2-e064-reevals';
const REDUIT_ID = 'chronology-v2-e064-reduit';
const CONTRASTE_ID = 'chronology-v2-e064-contraste';
const INSTALLS_ID = 'chronology-v2-e064-installations';

/* E064-07, E064-09 : une seule feuille, injectée une fois par ctx.css. Le
   panneau est un bloc en flux normal (jamais une modale, jamais superposé) :
   il n'ajoute aucun arrêt Tab et ne masque ni la frise ni la fiche. Les valeurs
   sont écrites en texte, jamais portées par la seule couleur. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line, #334155);
    border-left: 3px solid var(--gold, #c9a227);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft, #cbd5e1);
    font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e064-title {
    margin: 0 0 6px; color: var(--gold-bright, #f0d264);
    font-family: var(--serif, Georgia, serif); font-size: 14px;
    font-weight: 600; letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e064-lede { margin: 0 0 8px; color: var(--muted, #94a3b8); }
  #${PANEL_ID} .e064-metrics { margin: 0 0 6px; }
  #${PANEL_ID} .e064-row { display: flex; gap: 8px; margin: 0 0 3px; }
  #${PANEL_ID} .e064-key { flex: 0 0 190px; color: var(--muted, #94a3b8); }
  #${PANEL_ID} .e064-value {
    flex: 1 1 auto; min-width: 0; margin: 0;
    color: var(--gold-bright, #f0d264);
  }
  #${PANEL_ID} .e064-liste {
    margin: 6px 0 0; padding-left: 16px; color: var(--muted, #94a3b8);
  }
  @media (max-width: 620px) {
    #${PANEL_ID} .e064-row { flex-wrap: wrap; gap: 0 8px; }
    #${PANEL_ID} .e064-key { flex-basis: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e064-title,
    #${PANEL_ID} .e064-key,
    #${PANEL_ID} .e064-value,
    #${PANEL_ID} .e064-liste { color: CanvasText; }
  }
`;

let installCount = 0;
let reevalCount = 0;
let listeSignature = '';
let refs = {
  panel: null, root: null, reduced: false,
  brut: null, effectif: null, facteur: null, canvas: null,
  appliques: null, crees: null, reevals: null, reduit: null,
  contraste: null, installs: null, liste: null,
};
let dprWatch = null;

/* E064-10 : accepte un élément ou un identifiant, sinon document.body. */
function asHost(candidate) {
  if (candidate && typeof candidate.appendChild === 'function'
      && typeof candidate.querySelectorAll === 'function') return candidate;
  if (typeof candidate === 'string' && typeof document !== 'undefined') {
    return document.getElementById(candidate);
  }
  return null;
}

/* E064-10 : garde d'existence pour toute ID préfixée chronology-v2-e064-.
   La coque reconstruisant le stage, un nœud de la rendu précédente est détaché
   et n'est donc pas retrouvé : on le recrée et on l'attache au parent courant. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* Écriture dédupliquée : aucun textContent n'est touché si la valeur est
   identique, ce qui évite les invalidations de rendu inutiles. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function setData(node, key, value) {
  if (!node) return;
  const attr = `data-chronology-v2-e064-${key}`;
  const text = String(value);
  if (node.getAttribute(attr) !== text) node.setAttribute(attr, text);
}

/* E064-01, E064-02 : lecture de devicePixelRatio et plafonnement à 2. Le
   facteur d'échelle est le rapport effectif/brut ; vaut 1 si brut ≤ 2. */
function readDpr() {
  const raw = (typeof window !== 'undefined' && Number(window.devicePixelRatio) > 0)
    ? Number(window.devicePixelRatio)
    : 1;
  const brut = Number.isFinite(raw) && raw > 0 ? raw : 1;
  const effectif = Math.min(brut, 2);
  return { brut, effectif, facteur: effectif / brut };
}

/* Taille CSS en pixels, indépendante de la mémoire tampon (backing store) :
   on privilégie getComputedStyle pour ne jamais réinjecter la taille déjà
   multipliée par le DPR et provoquer une croissance en cascade. */
function cssSize(canvas) {
  const cs = (typeof window !== 'undefined' && window.getComputedStyle)
    ? window.getComputedStyle(canvas) : null;
  const w = cs ? parseFloat(cs.width) : NaN;
  const h = cs ? parseFloat(cs.height) : NaN;
  const rect = (typeof canvas.getBoundingClientRect === 'function')
    ? canvas.getBoundingClientRect() : { width: 0, height: 0 };
  return {
    w: Number.isFinite(w) && w > 0 ? w : (rect.width || 0),
    h: Number.isFinite(h) && h > 0 ? h : (rect.height || 0),
  };
}

/* E064-03, E064-04, E064-05, E064-06 : inventaire des canvas présents,
   plafonnement de leur densité, zéro canvas créé, traçabilité par attribut.
   On ne réduit qu'une densité dépassant le plafond : un canvas déjà conforme
   n'est jamais réinitialisé (aucune perte de contexte de dessin intempestive). */
function capCanvases(effectif) {
  const root = refs.root;
  let canvases = [];
  if (root && typeof root.querySelectorAll === 'function') {
    canvases = Array.from(root.querySelectorAll('canvas'));
  }
  let ajustes = 0;
  const noms = canvases.map((canvas, index) => {
    const size = cssSize(canvas);
    if (size.w > 0 && size.h > 0) {
      const densite = canvas.width / size.w;
      if (densite > effectif + 0.01) {
        canvas.width = Math.max(1, Math.round(size.w * effectif));
        canvas.height = Math.max(1, Math.round(size.h * effectif));
        ajustes += 1;
      }
    }
    setData(canvas, 'dpr-plafond', effectif.toFixed(2));
    const etiquette = canvas.id ? `#${canvas.id}`
      : (canvas.className ? `.${String(canvas.className).split(/\s+/)[0]}` : `canvas[${index}]`);
    return `${etiquette} — ${canvas.width}×${canvas.height}`;
  });
  return { total: canvases.length, ajustes, noms };
}

/* E064-04 : la liste n'est reconstruite que si son contenu change réellement. */
function buildListe(node, noms) {
  const signature = noms.join('|');
  if (signature === listeSignature) return;
  listeSignature = signature;
  const items = noms.length
    ? noms.map((nom) => {
        const li = document.createElement('li');
        li.textContent = nom;
        return li;
      })
    : [(() => {
        const li = document.createElement('li');
        li.textContent = 'Aucun canvas dans la vue : le plafond est déclaré, rien n’est modifié.';
        return li;
      })()];
  node.replaceChildren(...items);
}

/* E064-01 à E064-10 : rafraîchissement de tous les indicateurs visibles et
   des attributs de traçabilité. Aucune écriture dans une région live. */
function refresh() {
  const r = refs;
  if (!r.panel || !r.panel.isConnected) return;

  const { brut, effectif, facteur } = readDpr();
  const cap = capCanvases(effectif);

  write(r.brut, brut.toFixed(2));
  write(r.effectif, `${effectif.toFixed(2)}${brut > 2 ? ' (plafonné)' : ''}`);
  write(r.facteur, `${Math.round(facteur * 100)} %`);
  write(r.canvas, String(cap.total));
  write(r.appliques, String(cap.ajustes));
  write(r.crees, '0');
  write(r.reevals, String(reevalCount));
  write(r.reduit, r.reduced
    ? 'oui — aucune animation déclarée'
    : 'non — aucune animation déclarée');
  write(r.contraste, 'Valeurs chiffrées en texte : aucune information portée par la seule couleur.');
  write(r.installs, String(installCount));
  buildListe(r.liste, cap.noms);

  setData(r.panel, 'dpr-brut', brut.toFixed(2));
  setData(r.panel, 'dpr-effectif', effectif.toFixed(2));
  setData(r.panel, 'dpr-plafond', '2');
  setData(r.panel, 'facteur', `${Math.round(facteur * 100)}%`);
  setData(r.panel, 'canvas-total', cap.total);
  setData(r.panel, 'canvas-ajustes', cap.ajustes);
  setData(r.panel, 'canvas-crees', 0);
  setData(r.panel, 'reevals', reevalCount);
  setData(r.panel, 'reduced', r.reduced ? '1' : '0');
  setData(r.panel, 'installs', installCount);
}

/* E064-06 : veille d'un changement de densité (zoom, déplacement entre écrans)
   via matchMedia('(resolution: Ndppx)'). On réarme un unique écouteur et on
   retire l'ancien : aucun cumul, aucun timer, aucune boucle rAF. */
function armDprWatch() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
  const { brut } = readDpr();
  const query = `(resolution: ${brut}dppx)`;
  if (dprWatch && dprWatch.query === query) return;
  if (dprWatch && dprWatch.mql && typeof dprWatch.mql.removeEventListener === 'function') {
    dprWatch.mql.removeEventListener('change', dprWatch.handler);
  }
  const mql = window.matchMedia(query);
  const handler = () => {
    reevalCount += 1;
    armDprWatch();
    refresh();
  };
  if (mql && typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', handler);
  }
  dprWatch = { mql, query, handler };
}

function makeRow(make, dl, label, id) {
  const wrap = make('div', 'e064-row');
  const dt = make('dt', 'e064-key', label);
  const dd = make('dd', 'e064-value');
  dd.id = id;
  wrap.append(dt, dd);
  dl.appendChild(wrap);
  return dd;
}

/* E064-07 : contenu du panneau construit avec ctx.el / createElement uniquement. */
function buildContent(make) {
  const title = make('h2', 'e064-title', 'Plafond de densité de pixels (DPR ≤ 2)');
  title.id = TITLE_ID;
  const lede = make(
    'p', 'e064-lede',
    'Ce moniteur lit devicePixelRatio, le plafonne à 2 et applique le plafond aux seuls canvas déjà présents dans la vue. Il ne crée aucun canvas, ne lance aucune animation et n’écrit dans aucune région live.'
  );
  const dl = make('dl', 'e064-metrics');
  const brut = makeRow(make, dl, 'DPR brut (appareil)', BRUT_ID);
  const effectif = makeRow(make, dl, 'DPR effectif (plafonné à 2)', EFFECTIF_ID);
  const facteur = makeRow(make, dl, 'Facteur d’échelle appliqué', FACTEUR_ID);
  const canvas = makeRow(make, dl, 'Canvas présents dans la vue', CANVAS_ID);
  const appliques = makeRow(make, dl, 'Canvas ajustés au plafond', APPLIQUES_ID);
  const crees = makeRow(make, dl, 'Canvas créés par la lentille', CREES_ID);
  const reevals = makeRow(make, dl, 'Réévaluations après changement de DPR', REEVALS_ID);
  const reduit = makeRow(make, dl, 'Mouvement réduit', REDUIT_ID);
  const contraste = makeRow(make, dl, 'Lisibilité / contraste', CONTRASTE_ID);
  const installs = makeRow(make, dl, 'Installations du greffon', INSTALLS_ID);
  const liste = make('ul', 'e064-liste');
  liste.id = LISTE_ID;
  return {
    nodes: [title, lede, dl, liste],
    refs: {
      brut, effectif, facteur, canvas, appliques,
      crees, reevals, reduit, contraste, installs, liste,
    },
  };
}

function install(ctx) {
  const make = ctx && ctx.el;
  if (typeof make !== 'function') return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = asHost(ctx.stage) || asHost(ctx.layout)
    || (typeof document !== 'undefined' ? document.body : null);
  if (!host) return;

  const panel = ensureNode(make, PANEL_ID, 'section', 'e064-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const content = buildContent(make);
  panel.replaceChildren(...content.nodes);

  const reduced = typeof ctx.reducedMotion === 'function'
    ? Boolean(ctx.reducedMotion()) : false;
  refs = { ...content.refs, panel, root: host, reduced };

  refresh();
  armDprWatch();
}

register('E064', ctx => {
  install(ctx);
});
