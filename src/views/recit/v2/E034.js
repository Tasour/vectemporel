import { register } from './registry.js';

/* V2 lentille E034 — Navigation clavier : repères d'orientation et commandes
   complémentaires. Dix chantiers neufs, distincts de ceux de la passe 1
   (boussole de focus, inventaire vivant des raccourcis, bilan du fil, distance
   au point courant, filtres actifs, état de lecture, raccourci t, raccourci x,
   mouvement réduit, robustesse). Tout est dérivé du DOM réel : aucun chiffre
   inventé, aucune donnée historique ajoutée. Non destructif : sans ce module,
   la vue reste intégralement lisible et navigable. Préfixes : classes
   recit-v2-e034-, ids v2-e034- (jamais les ids e034- de la passe 1).
   Zéro réseau, zéro console, zéro aléa, aucun fichier partagé modifié. */

const PANEL_ID = 'v2-e034-panel';
const COMPASS_ID = 'v2-e034-compass';
const KEYS_ID = 'v2-e034-keys';
const THREAD_ID = 'v2-e034-thread';
const DIST_ID = 'v2-e034-distance';
const FILTERS_ID = 'v2-e034-filters';
const PLAY_ID = 'v2-e034-play';

const CSS = `
/* E034-01 — Panneau d'orientation et boussole de focus. */
.recit-v2-e034-panel{margin:10px 0 4px;padding:8px 10px;border:1px solid var(--line,rgba(255,255,255,.1));border-radius:9px;background:rgba(255,255,255,.02)}
.recit-v2-e034-head{margin:0 0 5px;color:var(--muted,#a9a49a);font-size:9px;letter-spacing:.1em;text-transform:uppercase}
.recit-v2-e034-readout{margin:2px 0;color:var(--ink-soft,#d7d1c6);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums;transition:opacity .18s linear}
.recit-v2-e034-compass{color:var(--gold-bright,#f4d69e)}
/* E034-02 — Inventaire des raccourcis réellement présents. */
.recit-v2-e034-keys{display:grid;grid-template-columns:max-content 1fr;gap:1px 8px;margin:3px 0;font-size:9px;line-height:1.45}
.recit-v2-e034-keys dt{color:var(--gold-bright,#f4d69e);font-variant-numeric:tabular-nums;white-space:nowrap}
.recit-v2-e034-keys dd{margin:0;color:var(--muted,#a9a49a)}
.recit-v2-e034-keys kbd{font:inherit}
/* E034-03 — Bilan du fil au clavier. */
.recit-v2-e034-thread{color:var(--ink-soft,#d7d1c6)}
/* E034-04 — Distance au point courant. */
.recit-v2-e034-distance{color:var(--muted,#a9a49a)}
/* E034-05 — Filtres actifs en clair. */
.recit-v2-e034-filters{color:var(--muted,#a9a49a)}
/* E034-06 — État de la lecture en clair. */
.recit-v2-e034-play{color:var(--muted,#a9a49a)}
/* E034-09 — Mouvement réduit des mises à jour du panneau. */
.recit-layout[data-v2-e034-motion="reduce"] .recit-v2-e034-readout{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e034-readout{transition:none}}
@media (max-width:620px){.recit-v2-e034-panel{padding:8px}.recit-v2-e034-keys{font-size:8px}}
`;

/* État module : aucune référence de nœud de rendu, uniquement le stage et un
   drapeau d'installation des listeners (E034-10). */
const S = { stage: null, listenersInstalled: false };

function byId(id) {
  return document.getElementById(id);
}

function getHost() {
  const stage = S.stage;
  if (!stage || typeof stage.querySelector !== 'function') return null;
  return stage.querySelector('.recit-layout') || null;
}

function nettoie(texte) {
  return String(texte || '').replace(/\s+/g, ' ').trim();
}

function isEditable(node) {
  return !!(node && (node.isContentEditable
    || ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(node.tagName) >= 0));
}

/* E034-10 : récupère un nœud déjà inséré ou en crée un neuf ; guérit un nœud
   orphelin resté dans un layout détaché. Idempotent d'un rendu à l'autre. */
function ensureNode(host, id, tag, className, parent) {
  if (!host || !parent) return null;
  let node = byId(id);
  if (node && !host.contains(node)) {
    try { if (node.parentNode) node.parentNode.removeChild(node); } catch { /* ignoré */ }
    node = null;
  }
  if (!node) {
    node = document.createElement(tag);
    node.id = id;
    if (className) node.className = className;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E034-01 : zone de focus dérivée des sélecteurs réels de la vue. L'ordre
   est du plus spécifique au plus général (filtres avant fil, par exemple). */
function zoneOf(node, host) {
  if (!node || !host || typeof node.closest !== 'function') return 'hors du récit';
  const zones = [
    ['.c3a-search', 'recherche du fil'],
    ['.c3a-filter', 'filtres du fil'],
    ['#c3a-thread', 'fil du repère'],
    ['.recit-trace', 'traçabilité'],
    ['.recit-actions', 'commandes du récit'],
    ['#recit-point-title', 'titre du point'],
    ['.recit-legend', 'légendes'],
    ['.recit-v2-e034-panel', 'repères clavier'],
  ];
  for (let i = 0; i < zones.length; i += 1) {
    if (node.closest(zones[i][0])) return zones[i][1];
  }
  if (host.contains(node)) return 'corps du récit';
  return 'hors du récit';
}

function updateCompass(host, target) {
  const node = byId(COMPASS_ID);
  if (!node || !node.isConnected) return;
  node.textContent = `Focus : zone « ${zoneOf(target, host)} ».`;
}

/* E034-04 : distance entre l'item focalisé et l'item marqué aria-current,
   calculée sur la liste réelle des boutons du fil. */
function updateDistance(host, target) {
  const node = byId(DIST_ID);
  if (!node || !node.isConnected || !host) return;
  if (!target || typeof target.closest !== 'function'
    || !target.closest('.c3a-thread-item')) {
    node.textContent = 'Distance au point courant : placez le focus sur un point du fil.';
    return;
  }
  const items = Array.prototype.slice.call(host.querySelectorAll('.c3a-thread-item'));
  const idx = items.indexOf(target);
  const current = items.findIndex((item) => item.hasAttribute('aria-current'));
  if (idx < 0) return;
  if (current < 0) {
    node.textContent = `Point ${idx + 1} : aucun point courant marqué dans le fil.`;
  } else if (idx === current) {
    node.textContent = `Point ${idx + 1} : vous êtes sur le point en cours.`;
  } else {
    const ecart = Math.abs(idx - current);
    node.textContent = `Point ${idx + 1} : ${ecart} point${ecart > 1 ? 's' : ''} ${idx < current ? 'avant' : 'après'} le point en cours (n° ${current + 1}).`;
  }
}

function onFocusIn(event) {
  const host = getHost();
  const target = event && event.target;
  if (!host) return;
  updateCompass(host, target);
  updateDistance(host, target && target.nodeType === 1 ? target : null);
}

function focusNoeud(node) {
  if (!node || typeof node.focus !== 'function') return;
  try { node.focus({ preventScroll: true }); } catch { node.focus(); }
}

/* E034-07 — Raccourci t : revenir au titre du point. Touche non réservée par
   le routeur (lequel réserve m, c, r, g, s, p, les chiffres, ?, Échap, Entrée,
   Espace et les flèches). Aucun appel direct au store. */
/* E034-08 — Raccourci x : rejoindre l'item courant du fil (ou le premier à
   défaut), sans passer par le store ni modifier l'état du récit. */
function onKeyDown(event) {
  if (!event || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target;
  if (!target || typeof target.closest !== 'function' || isEditable(target)) return;
  const host = getHost();
  if (!host || !host.contains(target)) return;
  if (document.querySelector('[aria-modal="true"]')) return;

  if (event.key === 't') {
    const titre = byId('recit-point-title') || host.querySelector('.recit-title');
    if (!titre) return;
    event.preventDefault();
    event.stopPropagation();
    focusNoeud(titre);
    return;
  }
  if (event.key === 'x') {
    const courant = host.querySelector('.c3a-thread-item[aria-current="step"]')
      || host.querySelector('.c3a-thread-item');
    if (!courant) return;
    event.preventDefault();
    event.stopPropagation();
    focusNoeud(courant);
  }
}

function installListeners() {
  if (S.listenersInstalled) return;
  S.listenersInstalled = true;
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('keydown', onKeyDown);
}

/* E034-02 : inventaire construit depuis les attributs aria-keyshortcuts
   réellement portés par les contrôles du DOM, augmenté des deux raccourcis V2. */
function buildKeys(make, host) {
  const liste = make('dl', 'recit-v2-e034-keys');
  const paires = [];
  const porteurs = host.querySelectorAll('[aria-keyshortcuts]');
  Array.prototype.forEach.call(porteurs, (porteur) => {
    const touche = nettoie(porteur.getAttribute('aria-keyshortcuts'));
    const libelle = nettoie(porteur.getAttribute('aria-label') || porteur.textContent).slice(0, 46);
    if (touche && libelle) paires.push([touche, libelle]);
  });
  paires.push(['t', 'Revenir au titre du point']);
  paires.push(['x', 'Rejoindre le point courant du fil']);
  const visibles = paires.slice(0, 10);
  visibles.forEach(([touche, libelle]) => {
    const dt = make('dt', '', touche);
    const kbd = make('kbd', '', touche);
    dt.replaceChildren(kbd);
    liste.appendChild(dt);
    liste.appendChild(make('dd', '', libelle));
  });
  if (paires.length > visibles.length) {
    liste.appendChild(make('dt', '', '…'));
    liste.appendChild(make('dd', '', `et ${paires.length - visibles.length} autre(s) raccourci(s) présents.`));
  }
  return liste;
}

/* Construit ou rafraîchit le panneau unique ; tous les textes sont des <p>
   visibles ou des <dt>/<dd> de liste, jamais du texte généré inaccessible. */
function buildPanel(host, make) {
  const corps = host.querySelector('.recit-body') || host;
  const panneau = ensureNode(host, PANEL_ID, 'div', 'recit-v2-e034-panel', corps);
  if (!panneau) return;
  panneau.setAttribute('role', 'group');
  panneau.setAttribute('aria-label', 'Repères clavier du récit');

  const head = make('p', 'recit-v2-e034-head', 'Repères clavier');
  const compass = make('p', 'recit-v2-e034-readout recit-v2-e034-compass', 'Focus : zone « corps du récit ».');
  compass.id = COMPASS_ID;

  const thread = make('p', 'recit-v2-e034-readout recit-v2-e034-thread', 'Bilan du fil : en attente du décompte réel.');
  thread.id = THREAD_ID;

  const keysLabel = make('p', 'recit-v2-e034-head', 'Raccourcis réellement actifs');
  const keys = buildKeys(make, host);
  keys.id = KEYS_ID;

  const distance = make('p', 'recit-v2-e034-readout recit-v2-e034-distance', 'Distance au point courant : placez le focus sur un point du fil.');
  distance.id = DIST_ID;

  const filters = make('p', 'recit-v2-e034-readout recit-v2-e034-filters', 'Filtres actifs : lecture en cours.');
  filters.id = FILTERS_ID;

  const play = make('p', 'recit-v2-e034-readout recit-v2-e034-play', 'État de la lecture : en attente.');
  play.id = PLAY_ID;

  panneau.replaceChildren(head, compass, thread, keysLabel, keys, distance, filters, play);

  const legend = corps.querySelector('.recit-legend');
  if (legend && panneau.nextSibling !== legend) corps.insertBefore(panneau, legend);
  else if (!legend && panneau.parentElement === corps && panneau !== corps.lastElementChild) {
    corps.appendChild(panneau);
  }
}

/* E034-03 : décompte lu depuis les vrais boutons du fil et le kicker
   « Étape i / total » ; E034-05 : filtres lus depuis aria-pressed ;
   E034-06 : lecture lue depuis aria-pressed du bouton .recit-play. */
function refreshReadouts(host) {
  const kicker = host.querySelector('.view-kicker');
  const totalMatch = kicker && nettoie(kicker.textContent).match(/Étape\s+\d+\s*\/\s*(\d+)/i);
  const total = totalMatch ? totalMatch[1] : null;
  const items = host.querySelectorAll('.c3a-thread-item');
  const courant = host.querySelector('.c3a-thread-item[aria-current="step"]');
  const noMatch = courant && nettoie(courant.getAttribute('aria-label')).match(/Point\s+(\d+)/i);
  const threadNode = byId(THREAD_ID);
  if (threadNode && threadNode.isConnected) {
    threadNode.textContent = total
      ? `Bilan du fil : ${items.length} point(s) affiché(s) sur ${total} · point courant n° ${noMatch ? noMatch[1] : '—'}.`
      : `Bilan du fil : ${items.length} point(s) affiché(s) · point courant n° ${noMatch ? noMatch[1] : '—'}.`;
  }

  const actifs = Array.prototype.slice.call(host.querySelectorAll('.c3a-filter[aria-pressed="true"]'));
  const filtersNode = byId(FILTERS_ID);
  if (filtersNode && filtersNode.isConnected) {
    filtersNode.textContent = actifs.length
      ? `Filtres actifs : ${actifs.map((n) => nettoie(n.textContent)).join(', ')}.`
      : 'Filtres actifs : aucun (tous les points sont affichés).';
  }

  const playNode = host.querySelector('.recit-play');
  const playOut = byId(PLAY_ID);
  if (playOut && playOut.isConnected) {
    const enCours = playNode && playNode.getAttribute('aria-pressed') === 'true';
    playOut.textContent = `Lecture automatique : ${enCours ? 'en cours' : 'en pause'}.`;
  }
}

register('E034', (ctx) => {
  const { stage, layout, css, el: makeEl, reducedMotion } = ctx || {};
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    if (typeof css !== 'function') return;
    css('recit-v2-e034', CSS); /* une seule feuille, toutes les règles du module. */
    S.stage = stage || layout.parentNode || document.body;

    const host = getHost();
    if (!host) return;

    const make = (tag, className, text) => {
      if (typeof makeEl === 'function') return makeEl(tag, className, text);
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };

    /* Préférence de mouvement lue sans jamais lever d'erreur (cf. E034-09). */
    let reduced = false;
    try { reduced = !!(reducedMotion && reducedMotion()); } catch { reduced = false; }
    host.setAttribute('data-v2-e034-motion', reduced ? 'reduce' : 'normal');

    /* E034-10 — tout le greffon est enveloppé : une lentille défaillante ne
       doit jamais casser le rendu du récit. Les listeners sont posés une
       seule fois et re-résolvent le layout courant à chaque événement. */
    buildPanel(host, make);
    refreshReadouts(host);
    updateCompass(host, document.activeElement);
    updateDistance(host, null);
    installListeners();
  } catch {
    /* Neutralisation silencieuse, conformément au contrat du registre. */
  }
});
