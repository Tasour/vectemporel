import { register } from './registry.js';

/* Lentille POINTS V2 E041 — passe 2 (V2) — domaine E : accessibilité & ARIA.
 * « Région live nommée, périmètre audible et miroir d'état ».
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E041.md — chantiers V2 E041-01 à
 * E041-10. Fichier possédé : ce module uniquement. Aucun fichier de la passe 1
 * (src/views/points/E041.js) ni aucun fichier partagé (vue points.js, coque,
 * styles.css, registry.js, index.js) n'est édité.
 *
 * Différence contractuelle V2 : points.js:128 appelle
 * runEnhancementsV2({ viewId: 'pointsv2', stage, layout }) alors que la passe 1
 * cible 'points' (points.js:127). La lentille filtre donc sur 'pointsv2'. Tous
 * les identifiants, classes, clés dataset et signaux sont préfixés
 * points-v2-e041 / pointsV2E041 afin de ne pas écraser ceux de la passe 1
 * (points-e041-*, pointsE041*) qui s'appliquent au même DOM.
 *
 * La passe 1 fournissait une région générique annonçant l'ère active. La V2
 * ajoute dix chantiers NEUFS : portée CSS isolée, région nommée et décrite,
 * écriture atomique à phrase unique, miroir chiffré visible, périmètre audible
 * dérivé des selects et du détail, annonce du point sélectionné, commande de
 * relecture à la demande, recensement des régions tierces, repli sans feuille
 * ni mouvement, idempotence multi-rendus.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Aucune donnée importée du store : chaque chiffre, chaque nom
 * d'ère, chaque libellé de filtre et chaque titre de point est RELU DANS LE DOM
 * rendu par points.js. Le ctx n'expose toujours pas de point d'écriture audible
 * : la région possédée est donc créée par ctx.el et accrochée au body pour
 * survivre au re-render asynchrone déclenché par set().
 *
 * Invariants V2 : un seul register, une seule feuille dont tous les sélecteurs
 * commencent par .points-v2-e041, des ids uniques protégés contre les doublons,
 * du DOM statique construit par ctx.el (jamais de chaîne HTML), une seule
 * écriture dans la région live, aucun observateur, aucun minuteur, aucune image
 * animée image par image, aucun appel réseau, aucune journalisation, aucun
 * aléa, aucun écouteur global, aucun vol de focus, aucune touche interceptée.
 */

const CSS_ID = 'points-v2-e041';
const SCOPE = 'points-v2-e041';

const CLASS = {
  sr: 'points-v2-e041-sr',
  live: 'points-v2-e041-live',
  status: 'points-v2-e041-status',
  read: 'points-v2-e041-read',
  still: 'points-v2-e041-still',
};

const ID = {
  live: 'points-v2-e041-live',
  title: 'points-v2-e041-title',
  desc: 'points-v2-e041-desc',
  status: 'points-v2-e041-status',
  read: 'points-v2-e041-read',
};

/* Clés dataset (rendues en data-points-v2-e041-*) distinctes de celles de la
 * passe 1, qui utilise data-points-e041-*. Les deux lentilles coexistent. */
const DATA = {
  state: 'pointsV2E041State',
  installs: 'pointsV2E041Installs',
  announces: 'pointsV2E041Announces',
  avoided: 'pointsV2E041Avoided',
  peers: 'pointsV2E041Peers',
  last: 'pointsV2E041Last',
  reduced: 'pointsV2E041Reduced',
  bound: 'pointsV2E041Bound',
};

/* Feuille unique. Chaque règle, y compris dans les @media, commence
 * littéralement par .points-v2-e041 : aucune fuite hors de la vue Points.
 * Les deux nœuds de nommage et la région sont masqués par clip + clip-path,
 * jamais par display:none, visibility:hidden ou un attribut d'absence. */
const CSS = `
  .points-v2-e041-sr {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%);
    white-space: nowrap; border: 0;
  }
  .points-v2-e041-live {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%);
    white-space: nowrap; border: 0;
  }
  .points-v2-e041 .points-v2-e041-status {
    flex-basis: 100%; margin: 6px 0 0; padding: 6px 8px;
    border: 1px solid var(--line-strong, #6b6b6b); border-radius: 6px;
    color: var(--muted-2, #9a9a9a); font-size: 11px; line-height: 1.4;
  }
  .points-v2-e041 .points-v2-e041-read {
    min-height: 44px; padding: 8px 12px;
    border: 1px solid var(--line-strong, #6b6b6b); border-radius: 8px;
    background: rgba(230, 185, 111, .08); color: var(--gold-bright, #f0d49a);
    font: inherit; cursor: pointer;
  }
  .points-v2-e041 .points-v2-e041-read:focus-visible {
    outline: 2px solid var(--gold-bright, #f0d49a); outline-offset: 3px;
  }
  .points-v2-e041.points-v2-e041-still .points-v2-e041-read { transition: none; }
  @media (max-width: 620px) {
    .points-v2-e041 .points-v2-e041-status { font-size: 12px; }
    .points-v2-e041 .points-v2-e041-read { min-height: 44px; padding: 10px 12px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e041 .points-v2-e041-read { transition: none; }
  }
  @media (forced-colors: active) {
    .points-v2-e041 .points-v2-e041-status,
    .points-v2-e041 .points-v2-e041-read {
      border: 2px solid ButtonText; color: ButtonText; background: ButtonFace;
    }
    .points-v2-e041 .points-v2-e041-read:focus-visible { outline-color: Highlight; }
  }
`;

const TITLE_TEXT = 'Annonces de la matrice des points';
const DESC_TEXT = 'Cette région annonce, au registre poli, l’ère courante, les filtres actifs, le nombre de points visibles et le point sélectionné. Aucune annonce automatique n’est émise au chargement.';

/* État de session : compteurs et dernière phrase survivent aux rendus. La
 * première phrase est enregistrée silencieusement (E041-04) pour ne pas parler
 * au chargement de la vue. */
let installCount = 0;
let announceCount = 0;
let avoidedCount = 0;
let lastMessage = '';
let lastSignature = '';
let reduced = false;

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function docOf(ctx, root) {
  if (root && root.ownerDocument) return root.ownerDocument;
  if (ctx && ctx.stage && ctx.stage.ownerDocument) return ctx.stage.ownerDocument;
  return typeof document !== 'undefined' ? document : null;
}

/* E041-01 — ancrage V2 : le filtre sur viewId neutralise la lentille hors de
 * la passe 2 ; layout d'abord, repli sur le .points-layout contenu dans stage. */
function rootOf(ctx) {
  if (!ctx || (ctx.viewId && ctx.viewId !== 'pointsv2')) return null;
  const layout = ctx.layout;
  if (layout && typeof layout.querySelector === 'function' && layout.isConnected !== false) return layout;
  const stage = ctx.stage;
  if (stage && typeof stage.querySelector === 'function') {
    return stage.querySelector('.points-layout') || stage;
  }
  return null;
}

/* E041-02 / E041-03 / E041-05 / E041-08 — garde d'existence par identifiant.
 * Un nœud d'une autre balise portant le même id est retiré ; un nœud détaché
 * est rapatrié dans le parent courant ; une classe perdue est restaurée.
 * Jamais de clonage, jamais de construction HTML par chaîne. */
function ensureNode(doc, ctx, id, className, tag, parent, before) {
  if (!doc || !parent || typeof ctx.el !== 'function') return null;
  let node = doc.getElementById(id);
  if (node && node.tagName && node.tagName.toLowerCase() !== tag) {
    if (typeof node.remove === 'function') node.remove();
    node = null;
  }
  if (!node) {
    node = ctx.el(tag, className);
    node.id = id;
  }
  if (node.classList && typeof node.classList.add === 'function'
      && !node.classList.contains(className)) {
    node.classList.add(className);
  }
  const anchor = before && before.parentNode === parent ? before : null;
  const placed = node.parentNode === parent && (!anchor || node.nextSibling === anchor);
  if (!placed) {
    if (anchor) parent.insertBefore(node, anchor);
    else parent.appendChild(node);
  }
  return node;
}

/* E041-04 — L'unique écriture dans la région live. textContent remplace la
 * phrase entière : aucun empilement, aucune lecture fragmentée. */
function write(live, message) {
  const text = String(message == null ? '' : message).trim();
  if (!text || !live || live.isConnected === false) return false;
  if (live.textContent !== text) live.textContent = text;
  return true;
}


/* E041-04 / E041-08 — entonnoir d'annonce. Le mode « forcé » sert uniquement
 * à la commande explicite de relecture : une demande de l'utilisateur doit
 * toujours être traitée, même si le périmètre n'a pas changé. */
function say(doc, ctx, message, forced) {
  const text = String(message == null ? '' : message).trim();
  if (!text) return 'empty';
  if (!forced && text === lastMessage) {
    avoidedCount += 1;
    return 'avoided';
  }
  const live = ensureNode(doc, ctx, ID.live, CLASS.live, 'p', doc.body);
  if (!live) return 'failed';
  put(live, 'role', 'status');
  put(live, 'aria-live', 'polite');
  put(live, 'aria-atomic', 'true');
  put(live, 'aria-labelledby', ID.title);
  put(live, 'aria-describedby', ID.desc);
  if (live.hasAttribute('aria-hidden')) live.removeAttribute('aria-hidden');
  if (live.hasAttribute('hidden')) live.removeAttribute('hidden');
  if (!write(live, text)) return 'failed';
  lastMessage = text;
  announceCount += 1;
  if (live.dataset) live.dataset[DATA.last] = text;
  return 'written';
}

/* E041-06 — recensement en lecture seule des régions annonçantes du document,
 * en excluant la nôtre. Aucun nœud trouvé n'est modifié. */
function countPeers(doc) {
  if (!doc || typeof doc.querySelectorAll !== 'function') return 0;
  const nodes = doc.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"]');
  let total = 0;
  nodes.forEach((node) => {
    if (node.id !== ID.live) total += 1;
  });
  return total;
}

/* E041-05 — miroir d'état : les compteurs et le parc live sont lisibles dans
 * le DOM sans journalisation. La ligne visible n'a PAS de rôle live, afin de
 * ne pas produire une seconde vocalisation concurrente de la région possédée. */
function mirror(refs, root, doc) {
  const peers = countPeers(doc);
  if (root && root.dataset) {
    root.dataset[DATA.state] = 'ready';
    root.dataset[DATA.installs] = String(installCount);
    root.dataset[DATA.announces] = String(announceCount);
    root.dataset[DATA.avoided] = String(avoidedCount);
    root.dataset[DATA.peers] = String(peers);
    root.dataset[DATA.last] = lastMessage;
    root.dataset[DATA.reduced] = reduced ? '1' : '0';
  }
  if (refs.status) {
    const text = `Annonces : ${announceCount} · doublons évités : ${avoidedCount} · régions live tierces : ${peers}.`;
    if (refs.status.textContent !== text) refs.status.textContent = text;
  }
}

/* E041-06 — le nom de l'ère est lu dans la ligne réellement active de la
 * matrice ; aucun millésime, aucun libellé historique codé en dur. */
function eraName(root) {
  if (!root || typeof root.querySelector !== 'function') return '';
  const row = root.querySelector('.points-grid-row.is-active');
  if (!row) return '';
  return txt(row.querySelector('.points-era') || (row.children && row.children[0]));
}

/* Repli de décompte : somme des cellules has-points de la ligne active, puis
 * de toute la matrice si aucune ligne n'est active. */
function matrixTotal(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return 0;
  const active = root.querySelectorAll('.points-grid-row.is-active .points-cell.has-points');
  const cells = active.length ? active : root.querySelectorAll('.points-cell.has-points');
  let total = 0;
  cells.forEach((cell) => {
    const value = Number.parseInt(txt(cell), 10);
    if (Number.isFinite(value) && value > 0) total += value;
  });
  return total;
}

/* E041-06 — le chiffre affiché dans le détail (points.js:97) est la source de
 * vérité du périmètre filtré ; le repli sur la matrice couvre un détail absent. */
function visibleTotal(root) {
  const kicker = root && typeof root.querySelector === 'function'
    ? root.querySelector('.points-detail .view-kicker') : null;
  const match = /(\d+)\s*point/i.exec(txt(kicker));
  if (match) {
    const value = Number.parseInt(match[1], 10);
    if (Number.isFinite(value)) return value;
  }
  return matrixTotal(root);
}

function shorten(text, max) {
  const clean = String(text || '').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

/* E041-07 — le point sélectionné et sa confiance sont lus dans le détail ;
 * jamais de focus déplacé, jamais d'écouteur de navigation ajouté. */
function currentPoint(root) {
  if (!root || typeof root.querySelector !== 'function') return { subject: '', confidence: '' };
  return {
    subject: txt(root.querySelector('.points-detail .points-point-title')),
    confidence: txt(root.querySelector('.points-detail .confidence')),
  };
}

/* E041-06 / E041-07 — une seule phrase déterministe, en français, dont chaque
 * segment vient du DOM courant. Les filtres à '*' sont explicités en clair. */
function buildMessage(root) {
  if (!root) return '';
  const filters = root.querySelector('.points-filters');
  const selects = filters && typeof filters.querySelectorAll === 'function'
    ? filters.querySelectorAll('select') : [];
  const domain = selects[0] ? String(selects[0].value || '').trim() : '';
  const family = selects[1] ? String(selects[1].value || '').trim() : '';
  const era = eraName(root);
  const count = visibleTotal(root);

  const segments = [];
  if (era) segments.push(`ère ${era}`);
  segments.push(`domaine ${domain && domain !== '*' ? domain : 'tous'}`);
  segments.push(`famille ${family && family !== '*' ? family : 'toutes'}`);
  segments.push(`${count} point${count === 1 ? '' : 's'} visible${count === 1 ? '' : 's'}`);

  let message = `Périmètre de la matrice : ${segments.join(' · ')}.`;
  const point = currentPoint(root);
  if (point.subject) {
    message += ` Point sélectionné : « ${shorten(point.subject, 80)} »`;
    if (point.confidence) message += ` (confiance ${point.confidence})`;
    message += '.';
  }
  return message;
}

function apply(ctx) {
  const root = rootOf(ctx);
  if (!root) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const doc = docOf(ctx, root);
  if (!doc || !doc.body || typeof doc.getElementById !== 'function') return;
  const filters = root.querySelector('.points-filters');
  if (!filters) return;

  installCount += 1;
  reduced = typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion();

  /* E041-01 — une seule feuille (cssOnce de registry.js:13-19) et une seule
   * classe de portée, réappliquée sans doublon à chaque rendu. */
  ctx.css(CSS_ID, CSS);
  const scope = (ctx.layout && ctx.layout.classList) ? ctx.layout : root;
  scope.classList.add(SCOPE);
  if (typeof scope.classList.toggle === 'function') scope.classList.toggle(CLASS.still, reduced);

  /* E041-02 / E041-03 / E041-05 / E041-08 — une région, deux nœuds de nommage,
   * une ligne de synthèse et un bouton, tous créés par ctx.el et gardés contre
   * les doublons. Le bouton et la ligne vivent dans .points-filters, donc sont
   * reconstruits avec le stage ; la région vit dans body et lui survit. */
  const refs = {
    live: ensureNode(doc, ctx, ID.live, CLASS.live, 'p', doc.body),
    status: ensureNode(doc, ctx, ID.status, CLASS.status, 'p', filters),
    read: ensureNode(doc, ctx, ID.read, CLASS.read, 'button', filters),
  };
  const title = ensureNode(doc, ctx, ID.title, CLASS.sr, 'p', doc.body);
  const desc = ensureNode(doc, ctx, ID.desc, CLASS.sr, 'p', doc.body);
  if (title && title.textContent !== TITLE_TEXT) title.textContent = TITLE_TEXT;
  if (desc && desc.textContent !== DESC_TEXT) desc.textContent = DESC_TEXT;

  if (refs.live) {
    put(refs.live, 'role', 'status');
    put(refs.live, 'aria-live', 'polite');
    put(refs.live, 'aria-atomic', 'true');
    put(refs.live, 'aria-labelledby', ID.title);
    put(refs.live, 'aria-describedby', ID.desc);
    if (refs.live.hasAttribute('aria-hidden')) refs.live.removeAttribute('aria-hidden');
    if (refs.live.hasAttribute('hidden')) refs.live.removeAttribute('hidden');
  }

  /* E041-08 — commande de relecture à la demande : cible 44 px, nom accessible
   * explicite, type natif, un seul écouteur par bouton. Le gestionnaire relit
   * le DOM au moment du clic pour ne jamais annoncer un état périmé. */
  if (refs.read) {
    if (!refs.read.getAttribute('type')) put(refs.read, 'type', 'button');
    if (!refs.read.getAttribute('aria-label')) {
      put(refs.read, 'aria-label', 'Lire à nouveau le périmètre de la matrice des points');
    }
    if (!txt(refs.read)) refs.read.textContent = 'Lire le périmètre';
    if (refs.read.dataset && refs.read.dataset[DATA.bound] !== '1') {
      refs.read.dataset[DATA.bound] = '1';
      refs.read.addEventListener('click', () => {
        const here = refs.read.closest && refs.read.closest('.points-layout');
        const target = here && here.isConnected !== false ? here : root;
        /* Préfixe distinct : une relecture explicite est une phrase différente,
         * donc réellement transmise à la région même si le périmètre est stable. */
        say(doc, ctx, `Relecture demandée. ${buildMessage(target)}`, true);
        mirror(refs, target, doc);
      });
    }
  }

  /* E041-04 — annonce au rendu, sans observateur ni minuteur. Le premier état
   * est mémorisé silencieusement ; un onglet masqué n'annonce pas mais garde
   * la signature, pour ne pas bavarder en arrière-plan. */
  const message = buildMessage(root);
  if (message && message !== lastSignature) {
    lastSignature = message;
    if (lastMessage === '') lastMessage = message;
    else if (!doc.hidden) say(doc, ctx, message, false);
  }

  mirror(refs, root, doc);
}

register('E041', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
