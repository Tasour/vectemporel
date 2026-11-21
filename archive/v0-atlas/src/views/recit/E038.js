import { register } from './registry.js';

/*
 * Lentille E038 — « Performance et sobriété » (vue Récit).
 *
 * Dix chantiers concrets et distincts (E038-01 … E038-10) tiennent dans CE seul
 * module : aucun fichier partagé n'est modifié. La coque reconstruisant le DOM à
 * chaque changement de point, apply() recrée ses nœuds dans le stage courant ;
 * l'état des deux bascules et les compteurs survivent, eux, aux rendus via des
 * variables de module. Les écouteurs globaux sont posés une seule fois.
 *
 * Une seule feuille : css('recit-e038', …), cadrée par [data-e038="on"] posé sur
 * .recit-layout. Toutes les classes créées sont préfixées `recit-e038-`, tous les
 * ids `e038-` et uniques. Zéro console, zéro réseau, zéro aléa, zéro innerHTML.
 * Enrichissement non destructif : sans JavaScript, le récit reste lisible.
 *
 * Attention aux voisins : E009 anime la largeur de `.recit-progress > span`.
 * Le chantier E038-05 n'y touche pas : il pose une barre de composition
 * superposée, laissée seule maîtresse de l'affichage (l'ancienne est masquée).
 */

const CSS_ID = 'recit-e038';
const PANEL_ID = 'e038-cout-dom';
const SEUIL_FIL = 24;        // au-delà, le fil reçoit une fenêtre de défilement
const PANEL_KEYS = ['noeuds', 'boutons', 'fil', 'image', 'sources', 'mode', 'rendus'];

/* État module — jamais écrit ailleurs. */
let latest = null;       // dernier contexte enrichi
let installed = false;   // garde des écouteurs globaux
let frame = 0;           // au plus une requête d'animation en vol
let sobre = false;       // E038-03 — bascule « mode sobre »
let mouvementOff = false;// E038-09 — bascule « mouvement »
let rendus = 0;          // nombre de rendus enrichis
let reuses = 0;          // nœuds déjà présents réutilisés (anti-doublons)

/* ------------------------------------------------------------------------- *
 * Feuille de style unique. Tout est cadré par [data-e038="on"] : aucune règle
 * ne déborde sur une autre vue ni sur un autre greffon.
 * ------------------------------------------------------------------------- */
const RULES = `
/* E038-01 — rendu différé des éléments du fil : le navigateur saute la peinture
   des boutons hors écran tout en les gardant dans le DOM et le tab order. */
.recit-layout[data-e038="on"] .recit-e038-fil-differe .recit-thread-item {
  content-visibility: auto;
  contain-intrinsic-size: auto 34px;
  max-height: 46px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* E038-02 — aucune règle : l'économie réseau passe par les attributs de l'image. */

/* E038-03 — mode sobre : effets visuels coûteux neutralisés, information conservée. */
.recit-layout[data-e038="on"].recit-e038-sobre .recit-actions button,
.recit-layout[data-e038="on"].recit-e038-sobre .c3a-filter,
.recit-layout[data-e038="on"].recit-e038-sobre .c3a-search,
.recit-layout[data-e038="on"].recit-e038-sobre .recit-thread-item {
  box-shadow: none !important;
  text-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  background-image: none !important;
}
.recit-layout[data-e038="on"].recit-e038-sobre .media-caption,
.recit-layout[data-e038="on"].recit-e038-sobre .recit-media-credit {
  text-shadow: none !important;
}

/* E038-04 — isolation des blocs statiques : un changement de fil ou de certitude
   ne propage pas son recalcul de mise en page au reste du récit. */
.recit-layout[data-e038="on"] .recit-e038-isole {
  contain: layout paint style;
}

/* E038-05 — barre de composition superposée : transform seul, zéro reflow.
   L'ancienne barre reste intacte pour E009 mais devient invisible. */
.recit-layout[data-e038="on"] .recit-e038-progress { position: relative; }
.recit-layout[data-e038="on"] .recit-e038-progress > span:not(.recit-e038-progression) { opacity: 0; }
.recit-layout[data-e038="on"] .recit-e038-progression {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  transform-origin: left center; background: var(--gold);
}
.recit-layout[data-e038="on"] .recit-e038-progression.recit-e038-transforme {
  transition: transform 420ms cubic-bezier(.22,.61,.36,1);
}
.recit-e038-progression-note {
  margin: -6px 0 8px; color: var(--muted-2); font-size: 9px;
  font-variant-numeric: tabular-nums;
}

/* E038-06 — fenêtre de défilement bornée pour les fils très longs. */
.recit-layout[data-e038="on"] .recit-e038-fil-borne {
  max-height: min(42vh, 340px);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

/* E038-07 — aucun style : le recentrage est un scrollTop calculé une fois. */

/* E038-08 — panneau de mesure, masqué puis remonté dans le tiroir diagnostic. */
.recit-e038-cout { display: none !important; }
body.recit-diagnostics .recit-e038-cout {
  display: block !important; margin: 0 0 12px; padding: 8px 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: rgba(255,255,255,.02);
}
.recit-e038-cout h2 { margin: 0 0 6px; color: var(--gold); font-size: 12px; font-weight: 600; }
.recit-e038-cout p {
  margin: 0 0 4px; color: var(--muted); font-size: 11px;
  line-height: 1.45; font-variant-numeric: tabular-nums;
}

/* E038-09 — neutralisation du mouvement (système OU bascule locale). */
.recit-layout[data-e038="on"].recit-e038-sans-mouvement .recit-e038-progression {
  transition: none !important;
}

/* E038-03 / E038-09 — commandes partageant la même plastique sobre. */
.recit-e038-commandes { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.recit-e038-commande {
  min-height: 36px; padding: 5px 10px; border: 1px solid var(--line-strong);
  border-radius: 8px; background: transparent; color: var(--gold-bright);
  font: inherit; font-size: 10px; cursor: pointer;
}
.recit-e038-commande[aria-pressed="true"] { background: rgba(230,185,111,.12); border-color: var(--gold); }
.recit-e038-commande:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
.recit-e038-commande-etat { align-self: center; color: var(--muted-2); font-size: 9px; }
`;

/* ------------------------------------------------------------------------- *
 * Utilitaires défensifs : aucune recherche DOM ne doit pouvoir lever.
 * ------------------------------------------------------------------------- */
function query(root, selector) {
  if (!root || typeof root.querySelector !== 'function') return null;
  try { return root.querySelector(selector); } catch { return null; }
}

function queryAll(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  try { return Array.from(root.querySelectorAll(selector)); } catch { return []; }
}

function setText(node, text) {
  if (!node || typeof node.textContent !== 'string' || node.textContent === text) return;
  try { node.textContent = text; } catch { /* nœud figé : on ignore */ }
}

function setPressed(node, value) {
  if (!node || typeof node.setAttribute !== 'function') return;
  try { node.setAttribute('aria-pressed', String(value)); } catch { /* ignoré */ }
}

function bindOnce(node, key, handler) {
  if (!node || node[key]) return;
  node[key] = true;
  try { node.addEventListener('click', handler); } catch { /* écouteur indisponible */ }
}

/* Insère un nœud s'il n'existe pas déjà ; le réutilise sinon (E038-10). */
function ensureNode(parent, id, factory, after) {
  if (!parent || typeof parent.appendChild !== 'function') return null;
  const existing = query(parent, `#${id}`);
  if (existing) { reuses += 1; return existing; }
  let node = null;
  try { node = factory(); } catch { return null; }
  if (!node) return null;
  try { node.id = id; } catch { return null; }
  try {
    if (after && after.parentNode === parent && typeof parent.insertBefore === 'function') {
      parent.insertBefore(node, after.nextSibling);
    } else {
      parent.appendChild(node);
    }
  } catch { /* parent instable : on renonce sans casser le rendu */ }
  return node;
}

/* ------------------------------------------------------------------------- *
 * E038-03 / E038-09 — état partagé des deux bascules et du mouvement.
 * ------------------------------------------------------------------------- */
function syncFlags(cur) {
  if (!cur || !cur.layout) return;
  const sys = typeof cur.reducedMotion === 'function' ? Boolean(cur.reducedMotion()) : false;
  cur.sysMotion = sys;
  cur.motion = !mouvementOff && !sys;
  const layout = cur.layout;
  try {
    layout.dataset.e038 = 'on';
    layout.dataset.e038Sobre = sobre ? 'on' : 'off';
    layout.dataset.e038Mouvement = cur.motion ? 'on' : 'off';
    layout.classList.toggle('recit-e038-sobre', sobre);
    layout.classList.toggle('recit-e038-sans-mouvement', !cur.motion);
  } catch { /* dataset indisponible : classes seules ignorées */ }
  if (cur.ui) {
    setPressed(cur.ui.sobre, sobre);
    setPressed(cur.ui.mouvement, !mouvementOff);
    setText(cur.ui.etatSobre, sobre ? 'Effets réduits' : 'Effets complets');
    setText(cur.ui.etatMouvement,
      sys ? 'Mouvement réduit (système)'
          : (mouvementOff ? 'Mouvement arrêté' : 'Mouvement autorisé'));
  }
}

/* ------------------------------------------------------------------------- *
 * E038-01 / E038-06 / E038-07 — le fil : paint différé, fenêtre bornée, et
 * maintien du point courant visible sans faire défiler la page entière.
 * ------------------------------------------------------------------------- */
function prepareThread(cur) {
  const list = query(cur.layout, '.recit-thread-list');
  const items = queryAll(cur.layout, '.recit-thread-item');
  if (list) {
    try { list.classList.add('recit-e038-fil-differe'); } catch { /* ignoré */ }
    if (items.length > SEUIL_FIL) {
      try { list.classList.add('recit-e038-fil-borne'); } catch { /* ignoré */ }
    }
  }
  let current = null;
  for (let i = 0; i < items.length; i += 1) {
    const node = items[i];
    if (node && typeof node.getAttribute === 'function'
        && node.getAttribute('aria-current') === 'step') { current = node; break; }
  }
  cur.refs.list = list;
  cur.refs.current = current;
  return { total: items.length, borne: Boolean(list && items.length > SEUIL_FIL) };
}

/* ------------------------------------------------------------------------- *
 * E038-02 — image chargée sans bloquer la première peinture, sans référent.
 * ------------------------------------------------------------------------- */
function prepareImage(cur) {
  const img = query(cur.layout, '.recit-media img');
  if (!img || typeof img.setAttribute !== 'function') return 'aucune image vérifiée';
  const attrs = [
    ['loading', 'lazy'],
    ['decoding', 'async'],
    ['fetchpriority', 'low'],
    ['referrerpolicy', 'no-referrer'],
  ];
  attrs.forEach(([name, value]) => {
    try { img.setAttribute(name, value); } catch { /* attribut non pris en charge */ }
  });
  return 'image différée, priorité basse';
}

/* ------------------------------------------------------------------------- *
 * E038-04 — isolation des blocs qui ne changent qu'au filtrage.
 * ------------------------------------------------------------------------- */
function prepareIsolation(cur) {
  const selectors = ['.recit-progress', '.recit-timing', '.recit-conf',
    '.recit-meta', '.recit-thread-title', '.recit-legend', '.recit-sources'];
  let count = 0;
  selectors.forEach((selector) => {
    queryAll(cur.layout, selector).forEach((node) => {
      if (!node || typeof node.classList !== 'object') return;
      try { node.classList.add('recit-e038-isole'); count += 1; } catch { /* ignoré */ }
    });
  });
  return count;
}

/* ------------------------------------------------------------------------- *
 * E038-05 — barre de progression composée. On ne touche pas à la largeur de
 * l'élément d'origine (réservé à E009) : une barre superposée porte le transform.
 * ------------------------------------------------------------------------- */
function prepareProgress(cur) {
  const progress = query(cur.layout, '.recit-progress');
  if (!progress || !progress.parentNode) return;
  const origin = query(progress, 'span');
  let raw = origin && origin.style ? (origin.style.width || '') : '';
  const match = /^(-?\d+(?:\.\d+)?)\s*%?$/.exec(String(raw).trim());
  const pct = match ? Math.max(0, Math.min(100, Number(match[1]))) : 0;
  cur.progressPct = pct;

  try { progress.classList.add('recit-e038-progress'); } catch { /* ignoré */ }
  const bar = ensureNode(progress, 'e038-progression-barre',
    () => cur.el('span', 'recit-e038-progression'), null);
  if (bar) {
    try { bar.setAttribute('aria-hidden', 'true'); } catch { /* ignoré */ }
    try {
      if (cur.motion) {
        bar.style.transform = 'scaleX(0)';
        bar.classList.add('recit-e038-transforme');
        cur.progressTarget = `scaleX(${pct / 100})`;
      } else {
        bar.style.transform = `scaleX(${pct / 100})`;
        bar.classList.remove('recit-e038-transforme');
        cur.progressTarget = '';
      }
    } catch { cur.progressTarget = ''; }
    cur.refs.progressBar = bar;
  }

  const note = ensureNode(progress.parentNode, 'e038-progression-note',
    () => cur.el('p', 'recit-e038-progression-note', ''), progress);
  if (note) {
    setText(note, `Progression : ${Math.round(pct)} % · barre animée par composition, sans recalcul de mise en page.`);
  }
}

/* ------------------------------------------------------------------------- *
 * E038-03 / E038-09 — les deux bascules, dans la barre d'outils existante.
 * ------------------------------------------------------------------------- */
function addCommands(cur) {
  const tools = query(cur.layout, '#c3a-tools') || query(cur.layout, '.c3a-tools');
  if (!tools || !cur.el) return null;
  const wrap = ensureNode(tools, 'e038-commandes',
    () => cur.el('div', 'recit-e038-commandes'), null);
  if (!wrap) return null;

  const command = (id, label, controls) => {
    const node = ensureNode(wrap, id, () => cur.el('button', 'recit-e038-commande', label), null);
    if (!node) return null;
    try {
      node.type = 'button';
      if (controls) node.setAttribute('aria-controls', controls);
    } catch { /* attributs non applicables */ }
    return node;
  };

  const btnSobre = command('e038-sobre', 'Mode sobre', 'e038-commandes');
  bindOnce(btnSobre, '__e038Sobre', () => {
    sobre = !sobre;
    if (latest) syncFlags(latest);
    schedule();
  });

  const btnMouvement = command('e038-mouvement', 'Mouvement', 'e038-progression-barre');
  bindOnce(btnMouvement, '__e038Mouvement', () => {
    mouvementOff = !mouvementOff;
    if (latest) syncFlags(latest);
    schedule();
  });

  const etatSobre = ensureNode(wrap, 'e038-sobre-etat',
    () => cur.el('span', 'recit-e038-commande-etat', ''), null);
  const etatMouvement = ensureNode(wrap, 'e038-mouvement-etat',
    () => cur.el('span', 'recit-e038-commande-etat', ''), null);

  return { sobre: btnSobre, mouvement: btnMouvement,
    etatSobre, etatMouvement };
}

/* ------------------------------------------------------------------------- *
 * E038-08 / E038-10 — panneau de mesures, texte réel et falsifiable, unique.
 * ------------------------------------------------------------------------- */
function addPanel(cur) {
  if (typeof document === 'undefined' || !cur.el || !cur.stage) return;
  let panel = null;
  try { panel = document.getElementById(PANEL_ID); } catch { panel = null; }
  if (!panel) {
    panel = cur.el('section', 'recit-e038-cout');
    panel.id = PANEL_ID;
    try {
      panel.setAttribute('data-recit-diagnostic', '');
      panel.setAttribute('aria-label', 'Mesures de performance et de sobriété de la vue récit');
    } catch { /* attributs non applicables */ }
    const heading = cur.el('h2', '', 'E038 — Performance et sobriété · coût de rendu');
    heading.id = 'e038-cout-titre';
    panel.appendChild(heading);
    PANEL_KEYS.forEach((key) => {
      const line = cur.el('p', '', `${key} : —`);
      line.id = `e038-cout-${key}`;
      panel.appendChild(line);
    });
    try { cur.stage.appendChild(panel); } catch { /* panneau non inséré */ }
  } else {
    reuses += 1;
    if (!panel.parentNode) {
      try { cur.stage.appendChild(panel); } catch { /* panneau non rattaché */ }
    }
  }
  cur.nodes = {};
  PANEL_KEYS.forEach((key) => {
    cur.nodes[key] = query(panel, `#e038-cout-${key}`);
  });
  cur.refs.panel = panel;
}

/* ------------------------------------------------------------------------- *
 * Unique frame de peinture : transform cible, recentrage du fil et mesures.
 * ------------------------------------------------------------------------- */
function paint() {
  const cur = latest;
  if (!cur || !cur.layout || !cur.layout.isConnected) return;

  syncFlags(cur);

  if (cur.refs.progressBar && cur.progressTarget) {
    try { cur.refs.progressBar.style.transform = cur.progressTarget; } catch { /* ignoré */ }
    cur.progressTarget = '';
  }

  /* E038-07 — une seule lecture de géométrie, uniquement si le fil est borné. */
  const list = cur.refs.list;
  const current = cur.refs.current;
  if (list && current && cur.threadBorne) {
    try {
      const lv = list.getBoundingClientRect();
      const cv = current.getBoundingClientRect();
      const above = cv.top - lv.top;
      const below = cv.bottom - lv.bottom;
      if (above < 0) list.scrollTop += above - 4;
      else if (below > 0) list.scrollTop += below + 4;
    } catch { /* géométrie indisponible : aucun défilement forcé */ }
  }

  if (!cur.nodes) return;
  let noeuds = 0;
  let boutons = 0;
  if (typeof cur.layout.getElementsByTagName === 'function') {
    noeuds = cur.layout.getElementsByTagName('*').length;
    boutons = cur.layout.getElementsByTagName('button').length;
  }
  const sources = query(cur.layout, '.recit-trace')
    ? 'tracée'
    : (query(cur.layout, '.recit-sources') ? 'sans source déclarée' : 'non renseignée');
  const mode = `sobre ${sobre ? 'activé' : 'désactivé'} · `
    + `mouvement ${cur.motion ? 'autorisé' : 'neutralisé'} · `
    + `${cur.sysMotion ? 'préférence système réduite' : 'préférence système complète'}`;

  setText(cur.nodes.noeuds, `Nœuds : ${noeuds} dans le récit (mesure unique par rendu).`);
  setText(cur.nodes.boutons, `Boutons : ${boutons}, dont ${cur.threadTotal || 0} dans le fil.`);
  setText(cur.nodes.fil, `Fil : ${cur.threadTotal || 0} point(s) · `
    + `${cur.threadBorne ? `fenêtre bornée à ${SEUIL_FIL}+ points` : `pas de fenêtre (≤ ${SEUIL_FIL} points)`}.`);
  setText(cur.nodes.image, `Image : ${cur.imageState || '—'} · requêtes réseau ajoutées : 0.`);
  setText(cur.nodes.sources, `Sources : ${sources} · aucun lien externe ajouté.`);
  setText(cur.nodes.mode, `Mode : ${mode}.`);
  setText(cur.nodes.rendus, `Rendus : ${rendus} · nœuds réutilisés : ${reuses} `
    + `· feuille de style unique : ${CSS_ID}.`);
}

function schedule() {
  if (frame || (typeof document !== 'undefined' && document.hidden)) return;
  if (typeof requestAnimationFrame !== 'function') { paint(); return; }
  frame = requestAnimationFrame(() => { frame = 0; paint(); });
}

/* Écouteurs uniques et passifs ; une seule frame pour toutes les relances. */
function install() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  try {
    if (typeof window.matchMedia === 'function') {
      const queryMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (queryMedia && typeof queryMedia.addEventListener === 'function') {
        queryMedia.addEventListener('change', schedule);
      }
    }
  } catch { /* media-query indisponible : ctx.reducedMotion() reste la source vivante */ }
}

/* ------------------------------------------------------------------------- *
 * Point d'entrée unique de la lentille.
 * ------------------------------------------------------------------------- */
register('E038', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout) return;
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (typeof css !== 'function' || typeof el !== 'function') return;
  if (!query(layout, '.recit-body')) return;

  rendus += 1;
  css(CSS_ID, RULES);

  const cur = {
    stage, layout, el, reducedMotion,
    sysMotion: false, motion: true,
    progressPct: 0, progressTarget: '',
    refs: {}, nodes: null, ui: null,
    threadTotal: 0, threadBorne: false, imageState: '—',
  };
  latest = cur;
  syncFlags(cur);

  const thread = prepareThread(cur);
  cur.threadTotal = thread.total;
  cur.threadBorne = thread.borne;
  cur.imageState = prepareImage(cur);
  prepareIsolation(cur);
  prepareProgress(cur);
  cur.ui = addCommands(cur);
  addPanel(cur);
  syncFlags(cur);

  install();
  schedule();
});
