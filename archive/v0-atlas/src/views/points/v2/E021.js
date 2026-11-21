import { register } from './registry.js';

/* Lentille E021 — passe 2 (V2) : Fiche du point, carte de lecture structurée
 * des champs déjà rendus (domaine C : détail & fiche). Dix chantiers V2,
 * E021-01 à E021-10, décrits dans UNIFIED_AUDIT/POINTS/V2/views/E021.md.
 *
 * La vue points.js appelle runEnhancementsV2({ viewId: 'pointsv2', stage,
 * layout }) en plus de la passe 1 (points.js:127-128). Ce module est donc un
 * greffon INDÉPENDANT de la passe 1 : tout identifiant, toute classe, tout
 * attribut de données et l'id de feuille sont préfixés `points-v2-e021` /
 * `v2-e021`, pour ne jamais entrer en collision avec le bandeau `points-e021`
 * déjà monté dans la même `.points-detail`.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Aucune dépendance vers le store, les filtres internes ou une autre lentille.
 * Aucune écriture destructive : le titre, la métadonnée, les familles, les
 * sources et la justification sont LUS ; la carte est ajoutée en fin de fiche
 * (avant la navigation) et `aria-describedby` du détail est complété, jamais
 * écrasé. Toute la valeur affichée est dérivée du DOM réel : aucun millésime,
 * aucun nom de pays, aucun chiffre historique n'est codé en dur.
 *
 * Invariants : un seul enregistrement, une seule feuille, une seule carte par
 * rendu ; tous les ids préfixés et dédupliqués ; tout DOM statique bâti avec
 * ctx.el (jamais innerHTML) ; zéro réseau, zéro aléa, zéro timer, zéro rAF,
 * zéro écouteur global, zéro console.* ; chaque champ porte un glyphe ET un
 * mot, jamais la couleur seule.
 */

const CSS_ID = 'points-v2-e021';
const SCOPE = 'points-v2-e021';
const CARD_ID = 'points-v2-e021-card';
const TITLE_ID = 'points-v2-e021-title';
const REDUCED_ATTR = 'data-v2-e021-reduced';
const VIEW_IDS = ['pointsv2', 'points'];

/* E021-06 : les quatre degrés de certitude de la méthode (POINT_METHODOLOGY.md
 * §1), avec un glyphe, un mot et une glose fidèle aux règles d'intégrité : le
 * disputé reste disputé, un silence explicite est une donnée. Ces slugs sont
 * le vocabulaire normatif, pas des faits historiques inventés. */
const CONFIDENCE = [
  { key: 'certain', label: 'Certain', mark: '■', gloss: 'établi par des sources concordantes' },
  { key: 'probable', label: 'Probable', mark: '◐', gloss: 'vraisemblable, non encore tranché' },
  { key: 'dispute', label: 'Disputé', mark: '≈', gloss: 'controverse maintenue, non résolue par un silence' },
  { key: 'non-documente', label: 'Non documenté', mark: '?', gloss: 'omission explicite : un silence est une donnée' },
];

/* E021-06 : traduction déterministe du token réellement écrit dans la fiche.
 * Les alias reprennent les libellés déjà rencontrés dans le jeu de données ;
 * un token inconnu n'est jamais forcé, il est réaffiché tel quel. */
const CONFIDENCE_ALIASES = {
  'certain': 'certain',
  'vérifié': 'certain',
  'vérifie': 'certain',
  'high': 'certain',
  'probable': 'probable',
  'medium': 'probable',
  'disputé': 'dispute',
  'disputed': 'dispute',
  'non documenté': 'non-documente',
  'non documente': 'non-documente',
};

/* E021-01 / E021-06 / E021-09 : feuille unique, entièrement préfixée par
 * `.points-v2-e021`, classe posée sur .points-layout : aucune fuite hors de
 * cette vue. Chaque état porte un glyphe ET un mot ; la couleur devient
 * redondante, jamais nécessaire. */
const CSS = `
.points-v2-e021 .points-v2-e021-card {
  box-sizing: border-box;
  margin: 14px 0 4px; padding: 12px 14px;
  border: 1px solid var(--line-strong); border-left: 3px solid var(--gold);
  border-radius: 10px; background: rgba(230, 185, 111, .04);
  font-variant-numeric: tabular-nums;
}
.points-v2-e021 .points-v2-e021-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 15px; color: var(--gold-bright);
}
.points-v2-e021 .points-v2-e021-intro,
.points-v2-e021 .points-v2-e021-note {
  margin: 0 0 8px; font-size: 11px; line-height: 1.5; color: var(--muted-2);
}
.points-v2-e021 .points-v2-e021-list {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 4px 12px;
}
.points-v2-e021 .points-v2-e021-item {
  display: flex; align-items: baseline; gap: 6px;
  min-height: 24px; padding: 2px 0;
  font-size: 11px; line-height: 1.4; color: var(--ink-soft);
}
.points-v2-e021 .points-v2-e021-glyph {
  display: inline-block; min-width: 1.2em;
  color: var(--gold-bright); font-weight: 700;
}
.points-v2-e021 .points-v2-e021-label {
  color: var(--muted-2); font-size: 10px;
  text-transform: uppercase; letter-spacing: .04em;
}
.points-v2-e021 .points-v2-e021-value {
  min-width: 0; color: var(--ink-soft);
  font-weight: 600; overflow-wrap: anywhere;
}
.points-v2-e021 .points-v2-e021-item.is-absent .points-v2-e021-value {
  color: var(--muted-2); font-weight: 400;
}
.points-v2-e021 .points-v2-e021-item.is-current .points-v2-e021-value {
  color: var(--gold-bright);
}
.points-v2-e021 .points-v2-e021-current {
  margin: 4px 0 0; font-size: 10px; line-height: 1.4; color: var(--muted);
}
.points-v2-e021 .points-v2-e021-metrics {
  margin: 8px 0 0; padding-top: 6px; border-top: 1px solid var(--line);
  font-size: 10px; color: var(--muted-2);
}
.points-v2-e021[` + REDUCED_ATTR + `="1"] .points-v2-e021-glyph { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-v2-e021 .points-v2-e021-glyph { transition: none; }
}
@media (max-width: 900px) {
  .points-v2-e021 .points-v2-e021-list { grid-template-columns: 1fr; }
  .points-v2-e021 .points-v2-e021-item { min-height: 36px; }
}
@media (forced-colors: active) {
  .points-v2-e021 .points-v2-e021-card { border-color: CanvasText; }
  .points-v2-e021 .points-v2-e021-glyph { color: CanvasText; }
  .points-v2-e021 .points-v2-e021-item.is-current .points-v2-e021-value { color: Highlight; }
}
@media print {
  .points-v2-e021 .points-v2-e021-card { border-color: #666; background: transparent; }
}
`;

function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function query(root, selector) {
  return isElement(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function setAttr(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function getAttr(node, name) {
  return node && typeof node.getAttribute === 'function' ? node.getAttribute(name) : null;
}

function removeNode(node) {
  if (node && typeof node.remove === 'function') node.remove();
}

function plural(count, one, many) {
  return count > 1 ? many : one;
}

/* E021-10 : garde anti-doublon. Tout nœud portant un id préfixé qui n'est pas
 * celui que l'on a choisi de conserver est retiré du document (un nœud détaché
 * d'un rendu précédent n'est pas ciblé par querySelectorAll, donc inoffensif). */
function nodesById(id) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
}

function enforceUnique(id, keep) {
  nodesById(id).forEach((node) => { if (node !== keep) removeNode(node); });
  return keep || nodesById(id)[0] || null;
}

/* E021-03 : lecture des trois champs de .points-meta (domaine, échelle, ancre)
 * et du badge de certitude. Aucune valeur historique littérale : la source est
 * le DOM déjà rendu par points.js:101-107. Le badge de certitude est écarté de
 * la liste ordinale pour que l'ancre reste le troisième champ, quelle que soit
 * la structure exacte du balisage. */
function metaValues(detail) {
  const meta = query(detail, '.points-meta');
  if (!meta || !meta.children) {
    return { domain: '', scale: '', time: '', confidence: '' };
  }
  const plain = [];
  for (const child of meta.children) {
    if (child.classList && child.classList.contains('confidence')) continue;
    plain.push(txt(child));
  }
  return {
    domain: plain[0] || '',
    scale: plain[1] || '',
    time: plain[2] || '',
    confidence: txt(query(meta, '.confidence')),
  };
}

/* E021-04 : les familles sont lues dans le détail. points.js les dépose en
 * <span> directement sous .points-detail (le conteneur .points-families n'est
 * pas monté) ; la lecture tente d'abord le conteneur, puis retombe sur les
 * <span> enfants directs, ce qui reste vrai dans les deux structures. */
function familyLabels(detail) {
  const container = query(detail, '.points-families');
  let nodes;
  if (container && typeof container.querySelectorAll === 'function') {
    nodes = Array.prototype.slice.call(container.querySelectorAll('span'));
  } else if (detail && detail.children) {
    nodes = Array.prototype.slice.call(detail.children).filter((n) => n.tagName === 'SPAN');
  } else {
    nodes = [];
  }
  return nodes.map(txt).filter(Boolean);
}

/* E021-05 : présence explicite d'un champ optionnel. Un vide est rapporté
 * comme un état (« Non renseigné »), jamais comme une valeur inventée ni comme
 * un badge muet (§3.7 : les silences sont des données). */
function presence(detail, selector, prefix) {
  const value = txt(query(detail, selector));
  if (!value) return { on: false, value: '' };
  const cleaned = prefix && value.indexOf(prefix) === 0
    ? value.slice(prefix.length).trim() : value;
  return { on: !!cleaned, value: cleaned };
}

/* E021-06 : traduction déterministe du token de certitude, avec repli sur une
 * chaîne vide pour un libellé hors taxonomie (jamais forcé). */
function confidenceOf(token) {
  const key = txt(token).toLocaleLowerCase('fr');
  return Object.prototype.hasOwnProperty.call(CONFIDENCE_ALIASES, key)
    ? CONFIDENCE_ALIASES[key] : '';
}

function signatureOf(data) {
  return [
    data.domain, data.scale, data.time, data.confidenceToken,
    data.families.join('|'), data.sources.value, data.justification.value,
  ].join('\u0000');
}

/* E021-02 : structure statique construite une seule fois par rendu avec ctx.el
 * (jamais innerHTML). Région titrée, non modale, sans piège de focus : seuls les
 * deux paragraphes dynamiques et la liste seront remplacés par fill(). */
function buildCard(ctx) {
  const card = ctx.el('section', 'points-v2-e021-card');
  card.id = CARD_ID;
  setAttr(card, 'role', 'region');
  setAttr(card, 'aria-labelledby', TITLE_ID);

  const title = ctx.el('h3', 'points-v2-e021-title', 'Carte de lecture du point');
  title.id = TITLE_ID;
  card.appendChild(title);

  card.appendChild(ctx.el('p', 'points-v2-e021-intro',
    'Cette carte résume les champs déjà présents dans la fiche. Chaque information est écrite avec un signe et un mot : la couleur ne porte jamais le sens à elle seule.'));

  card.appendChild(ctx.el('ul', 'points-v2-e021-list'));
  card.appendChild(ctx.el('p', 'points-v2-e021-current', ''));
  card.appendChild(ctx.el('p', 'points-v2-e021-metrics', ''));
  card.appendChild(ctx.el('p', 'points-v2-e021-note',
    'Règle de lecture : la carte ne remplace ni la fiche ni son titre ; elle rend explicites les champs que la fiche donne déjà. Un silence est une donnée, jamais une valeur inventée.'));
  return card;
}

/* E021-03 / E021-04 / E021-05 / E021-06 : un item = glyphe + libellé + valeur,
 * avec un mot d'état explicite pour l'absence. Aucune distinction par la seule
 * couleur. */
function fieldItem(ctx, label, value, mark, state) {
  const li = ctx.el('li', 'points-v2-e021-item' + (state ? ' ' + state : ''));
  li.appendChild(ctx.el('span', 'points-v2-e021-glyph', mark));
  li.appendChild(ctx.el('span', 'points-v2-e021-label', label));
  li.appendChild(ctx.el('span', 'points-v2-e021-value', value));
  return li;
}

/* E021-03 / E021-04 / E021-05 / E021-08 : tout le contenu dynamique est écrit
 * ici par replaceChildren, à partir des signaux lus dans le DOM. */
function fill(ctx, card, data) {
  const list = query(card, '.points-v2-e021-list');
  if (list) {
    const items = [
      fieldItem(ctx, 'Domaine', data.domain || 'Non renseigné',
        data.domain ? '▦' : '○', data.domain ? 'is-present' : 'is-absent'),
      fieldItem(ctx, 'Échelle', data.scale || 'Non renseignée',
        data.scale ? '◎' : '○', data.scale ? 'is-present' : 'is-absent'),
      fieldItem(ctx, 'Ancre', data.time || 'Non renseignée',
        data.time ? '◷' : '○', data.time ? 'is-present' : 'is-absent'),
      fieldItem(ctx, 'Certitude', data.confidenceLabel || 'Non renseignée',
        data.confidenceLabel ? (data.confidenceMark + ' ' + data.confidenceLabel) : '○',
        data.confidenceLabel ? 'is-present is-current' : 'is-absent'),
      fieldItem(ctx, 'Familles', data.families.length ? data.families.join(', ') : 'Aucune renseignée',
        data.families.length ? '◈' : '○', data.families.length ? 'is-present' : 'is-absent'),
      fieldItem(ctx, 'Sources', data.sources.on ? 'Renseignées' : 'Non renseignées',
        data.sources.on ? '✓' : '○', data.sources.on ? 'is-present' : 'is-absent'),
      fieldItem(ctx, 'Justification', data.justification.on ? 'Renseignée' : 'Non renseignée',
        data.justification.on ? '✓' : '○', data.justification.on ? 'is-present' : 'is-absent'),
    ];
    list.replaceChildren(...items);
  }

  const current = query(card, '.points-v2-e021-current');
  if (current) {
    current.textContent = data.hasPoint
      ? 'Certitude déclarée : ' + (data.confidenceLabel
        || ('« ' + data.confidenceToken + ' » (libellé non normalisé)'))
        + (data.confidenceGloss ? ' — ' + data.confidenceGloss : '') + '.'
      : 'Aucun point affiché dans ce périmètre : aucun champ à cartographier.';
  }
  setAttr(card, 'data-v2-e021-confidence', data.confidenceToken || '');

  const metrics = query(card, '.points-v2-e021-metrics');
  if (metrics) {
    const present = [data.domain, data.scale, data.time, data.confidenceLabel].filter(Boolean).length
      + (data.families.length ? 1 : 0)
      + (data.sources.on ? 1 : 0)
      + (data.justification.on ? 1 : 0);
    metrics.textContent = 'Carte : ' + present + ' champ' + plural(present, '', 's')
      + ' renseigné' + plural(present, '', 's') + ' sur 7 · '
      + data.families.length + ' famille' + plural(data.families.length, '', 's')
      + ' déclarée' + plural(data.families.length, '', 's') + '.';
  }
}

/* E021-07 : le lien avec le détail est additif. Les identifiants déja posés par
 * la passe 1 ou par une autre lentille sont préservés et dédupliqués. */
function augmentDescribedBy(detail, id) {
  const existing = (getAttr(detail, 'aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (existing.indexOf(id) !== -1) return;
  setAttr(detail, 'aria-describedby', existing.concat(id).join(' '));
}

/* E021-01 / E021-09 / E021-10 : unique point d'entrée, gardes structurelles,
 * feuille unique, portée unique, ids dédupliqués, repli silencieux sur
 * structure inattendue. */
function apply(ctx) {
  if (!ctx || VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const layout = isElement(ctx.layout) ? ctx.layout
    : (isElement(ctx.stage) ? ctx.stage : null);
  if (!isElement(layout)) return;

  const detail = query(layout, '.points-detail');
  if (!isElement(detail)) return;

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) setAttr(layout, REDUCED_ATTR, '1');
  else if (typeof layout.hasAttribute === 'function' && layout.hasAttribute(REDUCED_ATTR)) {
    layout.removeAttribute(REDUCED_ATTR);
  }

  const meta = metaValues(detail);
  const confidence = confidenceOf(meta.confidence);
  const level = CONFIDENCE.find((item) => item.key === confidence) || null;
  const data = {
    domain: meta.domain,
    scale: meta.scale,
    time: meta.time,
    confidenceToken: meta.confidence,
    confidenceLabel: level ? level.label : '',
    confidenceMark: level ? level.mark : '',
    confidenceGloss: level ? level.gloss : '',
    families: familyLabels(detail),
    sources: presence(detail, '.points-sources', 'Sources :'),
    justification: presence(detail, '.points-justification', ''),
    hasPoint: !!query(detail, '.points-meta'),
  };
  const sig = signatureOf(data);

  /* E021-10 : réconciliation par id. On conserve la carte déjà correctement
   * montée dans le détail courant, on retire toute autre carte portant le même
   * id (doublon d'un rendu antérieur), puis on garantit l'unicité du titre. */
  const candidates = nodesById(CARD_ID);
  let card = null;
  for (const candidate of candidates) {
    if (detail.contains(candidate) && candidate.parentElement === detail) {
      card = candidate;
      break;
    }
  }
  candidates.forEach((node) => { if (node !== card) removeNode(node); });

  if (!isElement(card)) {
    card = buildCard(ctx);
    const nav = query(detail, '.points-nav');
    if (nav && nav.parentElement === detail) detail.insertBefore(card, nav);
    else detail.appendChild(card);
  }
  enforceUnique(TITLE_ID, query(card, '#' + TITLE_ID));

  if (getAttr(card, 'data-v2-e021-signature') !== sig) {
    setAttr(card, 'data-v2-e021-signature', sig);
    fill(ctx, card, data);
  }

  setAttr(card, 'data-v2-e021', '1');
  augmentDescribedBy(detail, CARD_ID);
}

register('E021', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
