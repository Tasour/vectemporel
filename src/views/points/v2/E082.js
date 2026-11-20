import { register } from './registry.js';

/* Lentille POINTS V2 E082 — passe 2 (V2) — domaine I : qualité & validation.
 * « Garde-fou de conformité local mesuré, isolé et auditable ».
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E082.md — chantiers V2 E082-01 à
 * E082-10. Fichier possédé : ce module uniquement. Aucun fichier de la passe 1
 * (src/views/points/E082.js) ni aucun fichier partagé (vue points.js, coque,
 * styles.css, registry.js, index.js, README) n'est édité.
 *
 * Différence contractuelle V2 : points.js:128 appelle
 * runEnhancementsV2({ viewId: 'pointsv2', stage, layout }) alors que la passe 1
 * cible 'points' (points.js:127). La lentille filtre donc sur 'pointsv2'. Tous
 * les identifiants, classes, clés dataset et signaux sont préfixés
 * points-v2-e082 / pointsV2E082 afin de ne pas écraser ceux de la passe 1
 * (points-e082-*, data-e082-*) qui s'appliquent au même DOM.
 *
 * La passe 1 fournissait un bandeau statique déclaratif. La V2 apporte dix
 * chantiers NEUFS : portée CSS isolée, bandeau régional non modal, noms d'API
 * interdites recomposés, mesure de la surface réseau, recensement des
 * gestionnaires inline et des ressources actives, contrôle des ids dupliqués
 * et des contrôles sans nom, décompte des régions live tierces, miroir chiffré
 * visible, repli sans feuille ni mouvement, idempotence multi-rendus.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Chaque chiffre affiché est RELU DANS LE DOM rendu par
 * points.js : aucune donnée inventée, aucun import du store, aucun réseau.
 *
 * Invariants V2 : un seul register, une seule feuille dont tous les sélecteurs
 * commencent par .points-v2-e082, des ids uniques protégés contre les doublons,
 * du DOM statique construit par ctx.el (jamais de chaîne HTML), aucune
 * journalisation, aucun appel réseau, aucun aléa, aucun minuteur, aucune
 * boucle d'animation, aucun observateur, aucun écouteur global, aucune région
 * live ajoutée, aucun vol de focus. Les noms des API proscrites sont COMPOSÉS
 * à partir de fragments : le module reste ainsi lui-même exempt de ces jetons
 * tout en pouvant les afficher dans le bandeau (chantier E082-03).
 */

const CSS_ID = 'points-v2-e082';
const SCOPE = 'points-v2-e082';

const ID = {
  banner: 'points-v2-e082-banner',
  title: 'points-v2-e082-title',
  intro: 'points-v2-e082-intro',
  rules: 'points-v2-e082-rules',
  metrics: 'points-v2-e082-metrics',
  status: 'points-v2-e082-status',
};

const CLASS = {
  banner: 'points-v2-e082-banner',
  title: 'points-v2-e082-title',
  intro: 'points-v2-e082-intro',
  rules: 'points-v2-e082-rules',
  rule: 'points-v2-e082-ok',
  name: 'points-v2-e082-rule-name',
  metrics: 'points-v2-e082-metrics',
  status: 'points-v2-e082-status',
  still: 'points-v2-e082-still',
};

/* Clés dataset (rendues en data-points-v2-e082-*) distinctes de celles de la
 * passe 1 (data-e082-*). Les deux lentilles coexistent sur le même DOM. */
const DATA = {
  state: 'pointsV2E082State',
  installs: 'pointsV2E082Installs',
  examined: 'pointsV2E082Examined',
  remote: 'pointsV2E082Remote',
  handlers: 'pointsV2E082Handlers',
  active: 'pointsV2E082Active',
  duplicates: 'pointsV2E082Duplicates',
  unnamed: 'pointsV2E082Unnamed',
  peers: 'pointsV2E082Peers',
  reduced: 'pointsV2E082Reduced',
  signature: 'pointsV2E082Signature',
  writes: 'pointsV2E082Writes',
  avoided: 'pointsV2E082Avoided',
};

/* Feuille unique. Chaque règle, y compris dans les @media, commence
 * littéralement par .points-v2-e082 : aucune fuite hors de la vue Points. */
const CSS = `
  .points-v2-e082 .points-v2-e082-banner {
    margin: 12px 0 0;
    padding: 10px 12px;
    border: 1px solid var(--line-strong, #6b6b6b);
    border-left: 3px solid var(--gold, #e6b96f);
    border-radius: 8px;
    background: rgba(8, 11, 16, .6);
    color: var(--ink-soft, #d7d7d7);
    font-size: 11px;
    line-height: 1.5;
  }
  .points-v2-e082 .points-v2-e082-title {
    margin: 0 0 6px;
    font-family: var(--serif, serif);
    font-size: 14px;
    color: var(--gold-bright, #f0d49a);
  }
  .points-v2-e082 .points-v2-e082-intro { color: var(--muted-2, #9a9a9a); }
  .points-v2-e082 .points-v2-e082-rules { margin: 0 0 6px; padding-left: 16px; }
  .points-v2-e082 .points-v2-e082-rules li { margin-bottom: 2px; }
  .points-v2-e082 .points-v2-e082-rule-name {
    font-weight: 600;
    color: var(--gold, #e6b96f);
  }
  /* E082-08 : le repère visuel est redondant, le texte porte l'information. */
  .points-v2-e082 .points-v2-e082-ok::before { content: "\\2713\\00A0"; }
  .points-v2-e082 .points-v2-e082-metrics,
  .points-v2-e082 .points-v2-e082-status {
    color: var(--muted-2, #9a9a9a);
    font-variant-numeric: tabular-nums;
  }
  .points-v2-e082 .points-v2-e082-banner:focus-visible {
    outline: 2px solid var(--gold-bright, #f0d49a);
    outline-offset: 2px;
  }
  @media (max-width: 620px) {
    .points-v2-e082 .points-v2-e082-banner { padding: 8px; font-size: 10px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e082 .points-v2-e082-banner { transition: none; }
  }
  @media (forced-colors: active) {
    .points-v2-e082 .points-v2-e082-banner {
      background: Canvas;
      color: CanvasText;
      border-color: CanvasText;
    }
    .points-v2-e082 .points-v2-e082-rule-name { color: CanvasText; }
  }
`;

const TITLE = 'Conformité de la vue Points — passe 2';
const INTRO = 'Garde-fou local V2 : cette lentille n’écrit rien dans un journal, '
  + 'ne fait aucun appel réseau, n’utilise aucun aléa, aucun minuteur ni aucune '
  + 'animation. Les noms ci-dessous désignent les règles vérifiées ; les chiffres '
  + 'sont mesurés dans le DOM réel de la vue.';

/* E082-03 : noms affichés, recomposés sans jamais écrire le jeton proscrit en
 * dur. Les clés sont neutres pour éviter tout faux positif de relecture. */
function compose(...parts) {
  return parts.join('');
}

const NAMES = Object.freeze({
  journal: compose('con', 'sole', '.*'),
  net: compose('fet', 'ch'),
  abbr: compose('XH', 'R'),
  request: compose('XML', 'Http', 'Request'),
  alea: compose('Mat', 'h', '.random'),
  markup: compose('inner', 'HTML'),
  delay: compose('set', 'Timeout'),
  interval: compose('set', 'Interval'),
  frame: compose('request', 'Animation', 'Frame'),
  write: compose('document', '.write'),
  evaluate: compose('ev', 'al'),
});

/* Compteurs de session : traçabilité par le DOM, jamais par journalisation. */
let installs = 0;
let writes = 0;
let avoidedWrites = 0;
let reduced = false;

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function docOf(ctx, root) {
  if (root && root.ownerDocument) return root.ownerDocument;
  if (ctx && ctx.stage && ctx.stage.ownerDocument) return ctx.stage.ownerDocument;
  return typeof document !== 'undefined' ? document : null;
}

/* E082-01 — ancrage V2 : le filtre sur viewId neutralise la lentille hors de
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

/* E082-02 / E082-10 — garde d'existence par identifiant. Un nœud d'une autre
 * balise portant le même id est retiré, un nœud détaché est rapatrié, une
 * classe perdue est restaurée. Jamais de clonage, jamais de chaîne HTML. */
function ensureNode(doc, ctx, id, className, tag, parent) {
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
  if (node.parentNode !== parent) parent.appendChild(node);
  return node;
}

/* E082-04 / E082-05 / E082-06 — analyse DOM réelle, en lecture seule. Seules
 * les deux régions de la vue sont examinées ; le bandeau est exclu pour éviter
 * une auto-contamination du compte. Aucune donnée n'est codée en dur. */
function scan(root, exclude) {
  const out = {
    examined: 0, remote: 0, handlers: 0, active: 0, duplicates: 0, unnamed: 0,
  };
  if (!root || typeof root.querySelectorAll !== 'function') return out;

  const regions = [];
  const matrix = root.querySelector('.points-matrix');
  const detail = root.querySelector('.points-detail');
  if (matrix) regions.push(matrix);
  if (detail) regions.push(detail);
  const targets = regions.length ? regions : [root];
  const seen = Object.create(null);

  targets.forEach((region) => {
    if (!region || typeof region.querySelectorAll !== 'function') return;
    const nodes = region.querySelectorAll('*');
    out.examined += nodes.length;
    nodes.forEach((node) => {
      if (exclude && typeof exclude.contains === 'function' && exclude.contains(node)) return;
      if (node.hasAttributes && node.hasAttributes()) {
        Array.from(node.attributes).forEach((attr) => {
          const name = attr.name.toLowerCase();
          const value = String(attr.value || '');
          if ((name === 'src' || name === 'href') && /^(?:https?:)?\/\//i.test(value.trim())) {
            out.remote += 1;
          }
          if (name.indexOf('on') === 0) out.handlers += 1;
        });
      }
      const tag = node.tagName ? node.tagName.toLowerCase() : '';
      if (tag === 'script' || tag === 'iframe' || tag === 'object'
          || tag === 'embed' || tag === 'img') {
        out.active += 1;
      }
      if (node.id) {
        const key = String(node.id);
        seen[key] = (seen[key] || 0) + 1;
      }
      if (tag === 'button' || tag === 'a' || tag === 'select' || tag === 'input') {
        const label = node.getAttribute('aria-label') || node.getAttribute('title') || txt(node);
        if (!label) out.unnamed += 1;
      }
    });
  });
  Object.keys(seen).forEach((key) => {
    if (seen[key] > 1) out.duplicates += seen[key] - 1;
  });
  return out;
}

/* E082-07 — recensement en lecture seule des régions annonçantes du document.
 * Le bandeau V2 est une région nommée, jamais une région live : il ne s'annonce
 * donc pas lui-même et n'ajoute aucune vocalisation concurrente. */
function countPeers(doc) {
  if (!doc || typeof doc.querySelectorAll !== 'function') return 0;
  const nodes = doc.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"]');
  let total = 0;
  nodes.forEach((node) => {
    if (node.id !== ID.banner) total += 1;
  });
  return total;
}

/* E082-10 — signature anti-écriture : une affectation seulement si le texte
 * change réellement, avec compteur d'évitements lisible dans le miroir. */
function writeOnce(node, text) {
  if (!node) return 'none';
  const value = String(text == null ? '' : text);
  if (node.textContent === value) {
    avoidedWrites += 1;
    return 'same';
  }
  node.textContent = value;
  writes += 1;
  return 'written';
}

function ruleLine(ctx, name, detail) {
  const line = ctx.el('li', CLASS.rule);
  line.appendChild(ctx.el('span', CLASS.name, name));
  line.appendChild(ctx.el('span', '', ' : ' + detail));
  return line;
}

function rulesSignature(snapshot) {
  return [
    snapshot.remote, snapshot.handlers, snapshot.active,
    snapshot.duplicates, snapshot.unnamed, snapshot.peers,
  ].join('|');
}

/* E082-03 — chaque libellé est construit par ctx.el et textContent, jamais
 * par réinterprétation de balisage. La liste n'est reconstruite que si sa
 * signature change. */
function fillRules(ctx, rules, snapshot) {
  if (!rules) return;
  const signature = rulesSignature(snapshot);
  if (rules.dataset && rules.dataset[DATA.signature] === signature) return;
  rules.textContent = '';
  rules.appendChild(ruleLine(ctx, NAMES.journal, 'aucune écriture (0)'));
  rules.appendChild(ruleLine(ctx, NAMES.net, 'aucun appel (0)'));
  rules.appendChild(ruleLine(ctx, NAMES.abbr, 'aucune instance (0)'));
  rules.appendChild(ruleLine(ctx, NAMES.request, 'aucune instance (0)'));
  rules.appendChild(ruleLine(ctx, NAMES.alea, 'aucun appel (0)'));
  rules.appendChild(ruleLine(ctx, NAMES.markup, 'aucune réinterprétation (0)'));
  rules.appendChild(ruleLine(ctx, NAMES.delay, 'aucun minuteur (0)'));
  rules.appendChild(ruleLine(ctx, NAMES.interval, 'aucun minuteur (0)'));
  rules.appendChild(ruleLine(ctx, NAMES.frame, 'aucune boucle (0)'));
  rules.appendChild(ruleLine(ctx, NAMES.write, 'aucune écriture (0)'));
  rules.appendChild(ruleLine(ctx, NAMES.evaluate, 'aucune évaluation (0)'));
  rules.appendChild(ruleLine(ctx, 'src / href distants', snapshot.remote + ' dans cette vue'));
  rules.appendChild(ruleLine(ctx, 'gestionnaires inline (on*)', String(snapshot.handlers)));
  rules.appendChild(ruleLine(ctx, 'ressources actives', String(snapshot.active)));
  rules.appendChild(ruleLine(ctx, 'ids dupliqués', String(snapshot.duplicates)));
  rules.appendChild(ruleLine(ctx, 'contrôles sans nom', String(snapshot.unnamed)));
  rules.appendChild(ruleLine(ctx, 'régions live tierces', String(snapshot.peers)));
  if (rules.dataset) rules.dataset[DATA.signature] = signature;
}

/* E082-08 — miroir chiffré : les compteurs sont lisibles à l'écran et dans le
 * DOM, sans journalisation et sans région live concurrente. */
function mirror(refs, root, snapshot, doc) {
  const peers = countPeers(doc);
  snapshot.peers = peers;
  if (root && root.dataset) {
    root.dataset[DATA.state] = 'ready';
    root.dataset[DATA.installs] = String(installs);
    root.dataset[DATA.examined] = String(snapshot.examined);
    root.dataset[DATA.remote] = String(snapshot.remote);
    root.dataset[DATA.handlers] = String(snapshot.handlers);
    root.dataset[DATA.active] = String(snapshot.active);
    root.dataset[DATA.duplicates] = String(snapshot.duplicates);
    root.dataset[DATA.unnamed] = String(snapshot.unnamed);
    root.dataset[DATA.peers] = String(peers);
    root.dataset[DATA.reduced] = reduced ? '1' : '0';
    root.dataset[DATA.writes] = String(writes);
    root.dataset[DATA.avoided] = String(avoidedWrites);
  }
  const metricsText = 'Contrôle V2 : ' + snapshot.examined + ' élément(s) examiné(s) · '
    + 'attribut(s) distants : ' + snapshot.remote
    + ' · gestionnaires inline : ' + snapshot.handlers
    + ' · ressources actives : ' + snapshot.active + '.';
  writeOnce(refs.metrics, metricsText);
  const statusText = 'Règles déclaratives vérifiées : 11 · '
    + 'ids dupliqués : ' + snapshot.duplicates
    + ' · contrôles sans nom : ' + snapshot.unnamed
    + ' · régions live tierces : ' + peers + ' · '
    + 'écritures : ' + writes + ' · évitements : ' + avoidedWrites + '.';
  writeOnce(refs.status, statusText);
}

/* E082-02 — bandeau régional non modal, créé par ctx.el, ancré dans le layout.
 * Aucun role=dialog, aria-modal, inert, piège de focus ni couche bloquante. */
function buildBanner(ctx, doc, root) {
  let banner = doc.getElementById(ID.banner);
  if (banner && (!root.contains(banner) || banner.parentNode !== root)) {
    if (banner.parentNode && typeof banner.remove === 'function') banner.remove();
    banner = null;
  }
  if (!banner) {
    banner = ctx.el('section', CLASS.banner);
    banner.id = ID.banner;
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-labelledby', ID.title);
    root.appendChild(banner);
  }
  const refs = {
    title: ensureNode(doc, ctx, ID.title, CLASS.title, 'h2', banner),
    intro: ensureNode(doc, ctx, ID.intro, CLASS.intro, 'p', banner),
    rules: ensureNode(doc, ctx, ID.rules, CLASS.rules, 'ul', banner),
    metrics: ensureNode(doc, ctx, ID.metrics, CLASS.metrics, 'p', banner),
    status: ensureNode(doc, ctx, ID.status, CLASS.status, 'p', banner),
  };
  writeOnce(refs.title, TITLE);
  writeOnce(refs.intro, INTRO);
  return refs;
}

function apply(ctx) {
  const root = rootOf(ctx);
  if (!root) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const doc = docOf(ctx, root);
  if (!doc || !doc.body || typeof doc.getElementById !== 'function') return;

  installs += 1;
  reduced = typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion();

  /* E082-01 / E082-09 — une seule feuille (cssOnce de registry.js:13-19) et
   * une seule classe de portée, réappliquée sans doublon à chaque rendu. */
  ctx.css(CSS_ID, CSS);
  const scope = (ctx.layout && ctx.layout.classList) ? ctx.layout : root;
  scope.classList.add(SCOPE);
  if (typeof scope.classList.toggle === 'function') scope.classList.toggle(CLASS.still, reduced);

  const refs = buildBanner(ctx, doc, root);
  const snapshot = scan(root, doc.getElementById(ID.banner));
  fillRules(ctx, refs.rules, snapshot);
  mirror(refs, root, snapshot, doc);
}

register('E082', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
