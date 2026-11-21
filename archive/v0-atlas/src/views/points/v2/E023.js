import { register } from './registry.js';

/* Lentille POINTS V2 E023 — domaine C : détail & fiche.
 * Seconde passe : la fiche devient une RÉGION NOMMÉE dont les métadonnées sont
 * présentées en groupes de définitions alignés en grille, avec une association
 * ARIA explicite entre chaque libellé et sa valeur.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E023.md — chantiers V2 E023-01 à
 * E023-10 (seconde passe). Fichier possédé : ce module uniquement. Aucun
 * fichier de la passe 1 (src/views/points/E023.js) ni aucun fichier partagé
 * (points.js, index.js, registry.js, styles.css, coque) n'est édité.
 *
 * Contrat exploité : viewId ('pointsv2'), stage, layout, css(id, rules),
 * el(tag, cls, text), reducedMotion() — tels que fournis par runEnhancementsV2
 * (src/views/points.js:128). Toutes les valeurs sont DÉRIVÉES DU DOM rendu :
 * aucun millésime, aucun total, aucune donnée n'est inventée.
 *
 * Spécificités V2 (distinctes de la passe 1 au prefixe `points-e023-`) :
 * - une seule feuille, injectée par ctx.css('points-v2-e023', CSS) ;
 * - TOUTES les règles sont préfixées par la racine .points-v2-e023, y compris
 *   à l'intérieur des requêtes média : aucune fuite hors de la vue Points ;
 * - tous les identifiants créés sont préfixés `points-v2-e023-` ;
 * - le DOM statique est construit exclusivement avec ctx.el (jamais innerHTML) ;
 * - les marqueurs de donnée (data-points-v2-e023*) sont distincts de ceux de la
 *   passe 1 (data-points-e023*) pour ne pas écraser ses signaux ;
 * - la lentille ENRICHIT la <dl> de la passe 1 lorsqu'elle existe, et sait
 *   construire la sienne en repli : aucun doublon, aucun nœud source cloné.
 *
 * Invariants : zéro console, zéro fetch/XMLHttpRequest/réseau, zéro
 * Math.random, zéro timer, zéro rAF, zéro écouteur global, zéro MutationObserver
 * (idempotence pilotée par les rendus). Greffon non destructif : une structure
 * inattendue neutralise la lentille sans propager d'exception.
 */

const CSS_ID = 'points-v2-e023';
const SCOPE = 'points-v2-e023';
const DL_CLASS = 'points-v2-e023-dl';
const PAIR_CLASS = 'points-v2-e023-pair';
const KEY_CLASS = 'points-v2-e023-key';
const VAL_CLASS = 'points-v2-e023-val';
const CAPTION_ID = 'points-v2-e023-caption';
const NOTE_ID = 'points-v2-e023-note';
const COUNT_ID = 'points-v2-e023-count';
const FALLBACK_DL_ID = 'points-v2-e023-dl';
const KEY_ID_PREFIX = 'points-v2-e023-key-';
const REDUCED_ATTR = 'data-points-v2-e023-reduced';
const DATA_SCOPE = 'pointsV2E023';
const DATA_READY = 'pointsV2E023Ready';

/* Noms de CHAMPS (métadonnées), jamais des valeurs historiques. */
const LABELS = ['Domaine', 'Échelle', 'Temps', 'Certitude'];

/* Feuille unique. Chaque sélecteur commence par la classe racine, y compris
 * dans les @media : aucune règle ne peut fuir hors de la fiche V2. Aucune
 * ressource externe, aucune animation de position, cibles non interactives
 * donc aucun piège de focus. Le repli mouvement réduit est double : attribut
 * piloté par ctx.reducedMotion() ET media query native. */
const CSS = `
  /* V2-01 : la fiche redevient un flux vertical porté par la <dl>. */
  .points-v2-e023 .points-meta { display: block; }
  /* V2-02 : légende nommée de la région, texte statique lisible sans CSS. */
  .points-v2-e023 .points-v2-e023-caption {
    margin: 0 0 6px; color: var(--gold, #c8a96a);
    font-size: 11px; font-weight: 600; letter-spacing: .02em;
  }
  /* V2-03 : la <dl> et ses groupes forment une grille deux colonnes. */
  .points-v2-e023 .points-v2-e023-dl {
    margin: 8px 0; padding: 10px 12px;
    border: 1px solid var(--line-strong, #6b6b6b); border-radius: 8px;
    background: rgba(255, 255, 255, .02);
  }
  .points-v2-e023 .points-v2-e023-pair {
    display: grid;
    grid-template-columns: minmax(64px, max-content) 1fr;
    gap: 4px 12px; align-items: baseline;
    padding: 5px 0; border-bottom: 1px solid var(--line-soft, rgba(255, 255, 255, .12));
    transition: background-color .18s linear;
  }
  .points-v2-e023 .points-v2-e023-pair:last-child { border-bottom: 0; }
  /* V2-04 : libellé en texte réel ; le séparateur ::after est décoratif. */
  .points-v2-e023 .points-v2-e023-key {
    color: var(--muted-2, #8c8d91); font-size: 10px; font-weight: 600;
    letter-spacing: .04em; text-transform: uppercase;
  }
  .points-v2-e023 .points-v2-e023-key::after { content: ' :'; }
  /* V2-05 : la valeur d'origine garde sa classe (dont confidence is-…). */
  .points-v2-e023 .points-v2-e023-val {
    margin: 0; color: var(--ink-soft, #d7d1c6); font-size: 12px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  .points-v2-e023 .points-v2-e023-val > span { color: inherit; }
  .points-v2-e023 .points-v2-e023-val > span.confidence { font-weight: 600; }
  /* V2-07 / V2-08 : compteur et note, hors région live, texte plein. */
  .points-v2-e023 .points-v2-e023-count,
  .points-v2-e023 .points-v2-e023-note {
    margin: 6px 0 0; color: var(--muted-2, #8c8d91);
    font-size: 10px; line-height: 1.4;
  }
  /* V2-10 : mouvement réduit, couplage JS (attribut) ET media query. */
  .points-v2-e023[${REDUCED_ATTR}="1"] .points-v2-e023-pair { transition: none; }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e023 .points-v2-e023-pair { transition: none; }
  }
  /* V2-10 : écran étroit — le libellé passe au-dessus de la valeur. */
  @media (max-width: 620px) {
    .points-v2-e023 .points-v2-e023-pair { grid-template-columns: 1fr; gap: 2px; }
    .points-v2-e023 .points-v2-e023-val { font-size: 11px; }
  }
  /* V2-10 : couleurs forcées — bordures et texte explicites. */
  @media (forced-colors: active) {
    .points-v2-e023 .points-v2-e023-dl,
    .points-v2-e023 .points-v2-e023-pair,
    .points-v2-e023 .points-v2-e023-key { border-color: CanvasText; color: CanvasText; }
  }
  /* V2-10 : impression — aucune bordure parasite, paires non scindées. */
  @media print {
    .points-v2-e023 .points-v2-e023-dl { border: 0; background: transparent; padding: 0; }
    .points-v2-e023 .points-v2-e023-pair { break-inside: avoid; }
  }
`;

/* V2-01 : ancrage de portée — layout d'abord, stage en repli. */
function rootOf(ctx) {
  if (ctx && ctx.layout && typeof ctx.layout.querySelector === 'function') return ctx.layout;
  if (ctx && ctx.stage && typeof ctx.stage.querySelector === 'function') return ctx.stage;
  return null;
}

function findDetail(ctx) {
  const root = rootOf(ctx);
  return root ? root.querySelector('.points-detail') : null;
}

/* V2-09 : retrait des nœuds périmés laissés par un rendu précédent, hors du
 * panneau courant. Recherche par identifiant (tous préfixés points-v2-e023-). */
function removeStale(detail) {
  if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
  [CAPTION_ID, NOTE_ID, COUNT_ID, FALLBACK_DL_ID].forEach((id) => {
    const stale = document.getElementById(id);
    if (stale && (!detail || !detail.contains(stale))) stale.remove();
  });
}

/* V2-02 / V2-07 / V2-08 : au plus un nœud par identifiant, créé par ctx.el. */
function ensureNode(ctx, parent, id, cls, text, before) {
  let node = parent.querySelector('#' + id);
  if (!node) {
    node = ctx.el('p', cls, text);
    node.id = id;
    if (before && before.parentNode === parent) parent.insertBefore(node, before);
    else parent.appendChild(node);
  }
  return node;
}

/* V2-03 / V2-04 : enrichit la <dl> existante (passe 1) en regroupant chaque
 * paire <dt>/<dd> dans un <div> (structure autorisée en HTML5). Les <span>
 * d'origine restent les mêmes nœuds, simplement déplacés : jamais clonés.
 * Un marqueur de groupe garantit l'idempotence ; remplacé par la passe 1, le
 * groupe est reconstruit au rendu suivant (auto-guérison). */
function wrapExisting(ctx, dl) {
  if (dl.querySelector('.' + PAIR_CLASS)) return;
  const keys = Array.prototype.slice.call(dl.querySelectorAll('dt'));
  const values = Array.prototype.slice.call(dl.querySelectorAll('dd'));
  const total = Math.max(keys.length, values.length);
  const pairs = [];
  for (let i = 0; i < total; i += 1) {
    const pair = ctx.el('div', PAIR_CLASS);
    const key = keys[i];
    const value = values[i];
    if (key) {
      key.classList.add(KEY_CLASS);
      key.id = KEY_ID_PREFIX + i;
      pair.appendChild(key);
    }
    if (value) {
      value.classList.add(VAL_CLASS);
      if (key) value.setAttribute('aria-labelledby', key.id);
      pair.appendChild(value);
    }
    pairs.push(pair);
  }
  if (pairs.length) dl.replaceChildren.apply(dl, pairs);
}

/* V2-06 : repli — construit la <dl> quand la passe 1 n'a pas fourni de
 * <dt>. Les valeurs sont lues dans le DOM ; les libellés au-delà de quatre
 * champs reçoivent un repli « Champ N ». Zéro bloc fantôme si aucun <span>. */
function buildFromSpans(ctx, dl, meta) {
  const spans = Array.prototype.slice.call(meta.querySelectorAll('span'));
  if (!spans.length) return;
  const pairs = [];
  spans.forEach((span, index) => {
    const pair = ctx.el('div', PAIR_CLASS);
    const key = ctx.el('dt', KEY_CLASS, LABELS[index] || ('Champ ' + (index + 1)));
    key.id = KEY_ID_PREFIX + index;
    const value = ctx.el('dd', VAL_CLASS);
    value.setAttribute('aria-labelledby', key.id);
    value.appendChild(span); // déplacement, pas clonage
    pair.appendChild(key);
    pair.appendChild(value);
    pairs.push(pair);
  });
  dl.replaceChildren.apply(dl, pairs);
}

/* V2-01 / V2-02 / V2-03 : réutilise la <dl> de la passe 1 si elle existe,
 * sinon en crée une (identifiant préfixé). Nomme la région et chaque valeur. */
function ensureStructure(ctx, meta, detail) {
  let dl = detail.querySelector('#points-e023-dl') || meta.querySelector('dl');
  if (!dl && meta.querySelector('span')) {
    dl = ctx.el('dl', DL_CLASS);
    dl.id = FALLBACK_DL_ID;
    meta.appendChild(dl);
  }
  if (!dl) return null;
  dl.classList.add(DL_CLASS);
  if (dl.dataset) dl.dataset[DATA_READY] = '1';
  if (dl.querySelectorAll('dt').length) wrapExisting(ctx, dl);
  else buildFromSpans(ctx, dl, meta);
  /* V2-02 : nom de la région, indépendant du libellé de chaque champ. */
  dl.setAttribute('aria-label', 'Métadonnées structurées de l’entrée.');
  return dl;
}

function apply(ctx) {
  /* V2-01 : filtre sur la vue V2 et gardes de type pour un ctx minimal. */
  if (!ctx || ctx.viewId !== 'pointsv2') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const detail = findDetail(ctx);
  if (!detail) return;

  ctx.css(CSS_ID, CSS);
  detail.classList.add(SCOPE);
  if (detail.dataset) detail.dataset[DATA_SCOPE] = '1';

  /* V2-10 : couplage explicite à la préférence de mouvement réduit. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    detail.setAttribute(REDUCED_ATTR, '1');
  } else {
    detail.removeAttribute(REDUCED_ATTR);
  }

  /* V2-09 : nettoyage avant toute création (aucun doublon après re-rendu). */
  removeStale(detail);

  const meta = detail.querySelector('.points-meta');
  if (!meta) return; // V2-06 : aucun point → aucun bloc fantôme

  const dl = ensureStructure(ctx, meta, detail);
  if (!dl) return;

  /* V2-02 : légende visible + description associée à la <dl>. */
  const caption = ensureNode(ctx, meta, CAPTION_ID, 'points-v2-e023-caption',
    'Fiche — métadonnées structurées de l’entrée.', dl);
  dl.setAttribute('aria-describedby', caption.id);

  /* V2-08 : note de lecture statique, hors région live. */
  ensureNode(ctx, meta, NOTE_ID, 'points-v2-e023-note',
    'Domaine, échelle, temps et certitude forment une liste de définitions ; chaque valeur garde sa classe d’origine.');

  /* V2-07 : compteur dérivé du DOM, jamais codé en dur, hors région live. */
  const fieldCount = dl.querySelectorAll('dt').length;
  const count = ensureNode(ctx, meta, COUNT_ID, 'points-v2-e023-count', '');
  count.textContent = 'Champs structurés : ' + fieldCount + '.';

  if (detail.dataset) detail.dataset[DATA_READY] = '1';
}

/* V2-09 : une lentille défaillante est neutralisée sans interrompre le rendu. */
register('E023', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
