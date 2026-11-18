import { register } from './registry.js';

/* Lentille E025 — C. Détail & fiche : sources avec repli « omission justifiée ».
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E025.md — chantiers E025-01 à E025-10.
 * Fichier possédé : ce module uniquement. Aucun fichier partagé n'est édité.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Le module
 * lit le DOM construit par points.js (:95-114) et ajoute UNE zone « sources »
 * dans .points-detail : liste structurée des sources déclarées, ou repli
 * explicite « omission justifiée » quand la fiche n'en cite aucune.
 *
 * Aucune source, aucune date, aucun identifiant n'est inventé : tout est
 * dérivé de .points-sources, .points-justification et .points-meta .confidence.
 *
 * Invariants :
 * - un seul register, une seule feuille CSS (ctx.css('points-e025', …)) ;
 * - une seule zone #points-e025-sources par détail, réutilisée par identifiant ;
 * - la ligne plate .points-sources est masquée (jamais supprimée) et son
 *   contenu est intégralement recopié dans la liste structurée ;
 * - aucune région live ajoutée, aucun écouteur, aucun timer, aucune rAF,
 *   aucun réseau, aucun aléa, aucun innerHTML, aucun console.* ;
 * - signature stockée sur le nœud : une écriture seulement si le modèle change.
 */

const CSS_ID = 'points-e025';
const ZONE_ID = 'points-e025-sources';
const TITLE_ID = 'points-e025-title';

/* Feuille unique, cadrée sur les ancres points-e025. Aucune animation : le
 * mouvement réduit est respecté par construction. Aucune info par la couleur
 * seule : chaque état porte un libellé textuel. */
const CSS = `
  .points-sources[hidden] { display: none !important; }
  #${ZONE_ID} {
    margin: 12px 0 4px; padding: 10px 12px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: rgba(255, 255, 255, .02); color: var(--ink-soft);
    font-size: 11px; line-height: 1.5; overflow-wrap: anywhere; max-width: 100%;
  }
  #${ZONE_ID} h3 {
    margin: 0 0 6px; font-family: var(--serif); font-size: 13px;
    color: var(--gold-bright);
  }
  #${ZONE_ID} p { margin: 0 0 6px; }
  #${ZONE_ID} p:last-child { margin-bottom: 0; }
  #${ZONE_ID} .points-e025-label { color: var(--gold); font-weight: 600; letter-spacing: .02em; }
  #${ZONE_ID} .points-e025-list { margin: 6px 0; padding-left: 18px; }
  #${ZONE_ID} .points-e025-list li { margin-bottom: 3px; }
  #${ZONE_ID} .points-e025-cite {
    font-style: normal; color: var(--gold-bright); font-variant-numeric: tabular-nums;
  }
  #${ZONE_ID} .points-e025-kind {
    display: inline-block; margin-right: 6px; padding: 1px 6px;
    border: 1px solid var(--line-strong); border-radius: 999px;
    color: var(--gold); font-size: 10px;
  }
  #${ZONE_ID} .points-e025-reason { color: var(--muted); }
  #${ZONE_ID} .points-e025-confidence,
  #${ZONE_ID} .points-e025-metrics { color: var(--muted-2); }
  #${ZONE_ID} .points-e025-metrics { font-size: 10px; font-variant-numeric: tabular-nums; }
  .points-nav button:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
  @media (max-width: 700px) {
    #${ZONE_ID} { padding: 8px 10px; font-size: 10px; }
  }
  @media (prefers-contrast: more) {
    #${ZONE_ID} { background: #05070a; border-color: var(--gold-bright); color: var(--ink); }
  }
  @media (forced-colors: active) {
    #${ZONE_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${ZONE_ID}, #${ZONE_ID} * { transition: none; }
  }
`;

let writes = 0; // compteur auditable d'écritures réelles, remis à zéro sur nœud neuf

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function first(root, selector) {
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

/* put ne réécrit que si la valeur diffère : les attributs posés à chaque passe
 * deviennent des opérations sans effet sur un DOM déjà conforme. */
function put(node, name, value) {
  if (!node || typeof node.setAttribute !== 'function') return;
  const next = String(value);
  if (node.getAttribute(name) !== next) node.setAttribute(name, next);
}

/* E025-10 — réutilisation par identifiant ; un nœud mal parenté est retiré,
 * un nœud déconnecté est recréé (et son compteur remis à zéro). */
function place(ctx, id, tag, className, parent) {
  let node = document.getElementById(id);
  if (node && node.parentElement && node.parentElement !== parent) node.remove();
  if (!node || !node.isConnected) {
    node = ctx.el(tag, className);
    node.id = id;
    parent.appendChild(node);
    writes = 0;
  }
  return node;
}

/* E025-02 — les références sont lues sur la ligne plate écrite par
 * points.js:110 (« Sources : A, B ») ; le préfixe est ôté, la virgule sépare.
 * Aucun nom de source n'est codé en dur. */
function sourceTokens(node) {
  const raw = txt(node);
  if (!raw) return [];
  const body = raw.replace(/^sources\s*:\s*/i, '');
  return body.split(',').map((part) => part.trim()).filter(Boolean);
}

/* E025-04 — la fiche stocke parfois un identifiant d'omission dans `sources`
 * (dataset.js:4695-4699 : "sources": ["OM-002"], confidence "non documenté").
 * Un tel jeton n'est PAS une citation : il est classé à part, sinon la liste
 * présenterait une absence documentée comme une source consultée. */
function isOmissionToken(token) {
  return /^OM-\d+$/i.test(token);
}

/* E025-05 — nature de l'absence, déduite du texte réel de la justification. */
function omissionKind(text) {
  if (/omission\s+documentée/i.test(text)) return 'omission documentée';
  if (/vide\s+justifié/i.test(text)) return 'case vide justifiée';
  if (/dette\s+/i.test(text)) return 'dette documentée';
  return 'absence de source déclarée';
}

/* E025-06 — identifiants OM-* lus dans la justification, dédupliqués. */
function omissionIds(text) {
  const found = String(text || '').match(/OM-\d+/g) || [];
  const seen = Object.create(null);
  return found.filter((id) => {
    if (seen[id]) return false;
    seen[id] = true;
    return true;
  });
}

/* E025-07 — la certitude est lue sur le badge rendu par points.js:105. */
function confidenceOf(detail) {
  return txt(first(detail, '.points-meta .confidence'));
}

/* Première phrase de la justification : motif court, sans recopier le long
 * texte que la fiche affiche déjà dans .points-justification. */
function excerpt(text) {
  const clean = String(text || '').trim();
  if (!clean) return '';
  const match = /\.(?:\s|$)/.exec(clean);
  const cut = match ? clean.slice(0, match.index + 1) : clean;
  return cut.length > 240 ? `${cut.slice(0, 237).trimEnd()}…` : cut;
}

function readModel(detail) {
  const base = first(detail, '.points-sources');
  const justification = txt(first(detail, '.points-justification'));
  const tokens = sourceTokens(base);
  const citations = tokens.filter((token) => !isOmissionToken(token));
  const storedRefs = tokens.filter(isOmissionToken);
  /* E025-06 — les identifiants viennent des deux signaux réels du détail :
   * la justification et la ligne « Sources » quand elle contient un OM-*. */
  const ids = omissionIds(`${justification} ${storedRefs.join(' ')}`);
  return {
    hasSources: citations.length > 0,
    tokens: citations,
    storedRefs,
    justification,
    kind: omissionKind(justification),
    ids,
    confidence: confidenceOf(detail),
  };
}

/* Signature dérivée du seul modèle lu dans le DOM. Stockée sur le nœud, elle
 * rend l'installation idempotente et automatiquement remise à zéro au rendu
 * neuf (un nœud neuf n'a pas de signature). */
function signatureOf(model) {
  return [
    model.hasSources ? 'sources' : 'omission',
    model.tokens.join('\u0001'),
    model.storedRefs.join('\u0001'),
    model.justification,
    model.kind,
    model.ids.join(','),
    model.confidence,
  ].join('\u0002');
}

/* E025-01 / E025-02 / E025-03 — sources présentes : liste <ul>/<li>/<cite>,
 * chaque référence conservée telle quelle, avec libellé textuel explicite. */
function renderSources(ctx, body, model) {
  const lead = ctx.el('p', 'points-e025-lead');
  lead.append(
    ctx.el('span', 'points-e025-label', 'Sources déclarées : '),
    document.createTextNode(model.tokens.length
      ? `${model.tokens.length} référence(s) citée(s) dans la fiche.`
      : 'la fiche déclare des sources, mais aucune référence n’est lisible.')
  );
  body.appendChild(lead);
  if (!model.tokens.length) return;
  const list = ctx.el('ul', 'points-e025-list');
  model.tokens.forEach((token) => {
    const item = ctx.el('li');
    item.appendChild(ctx.el('cite', 'points-e025-cite', token));
    list.appendChild(item);
  });
  body.appendChild(list);
  body.appendChild(ctx.el('p', 'points-e025-note',
    'Chaque référence est recopiée telle quelle depuis la ligne « Sources » de la fiche ; aucune n’est inventée.'));
  if (model.storedRefs.length) {
    body.appendChild(ctx.el('p', 'points-e025-ref',
      `Références d’omission associées : ${model.storedRefs.join(', ')} — elles consignent une absence documentée, non une source consultée.`));
  }
}

/* E025-04 / E025-05 / E025-06 / E025-07 — repli « omission justifiée » :
 * le motif est lu sur la justification, jamais présenté comme une source. */
function renderOmission(ctx, body, model) {
  const intro = ctx.el('p', 'points-e025-intro');
  intro.append(
    ctx.el('span', 'points-e025-kind', model.kind),
    document.createTextNode('Aucune source citée pour ce point : l’absence est documentée, pas masquée.')
  );
  body.appendChild(intro);
  const reason = ctx.el('p', 'points-e025-reason');
  reason.append(
    ctx.el('span', 'points-e025-label', 'Motif : '),
    document.createTextNode(excerpt(model.justification)
      || 'aucun motif supplémentaire n’est fourni par la fiche.')
  );
  body.appendChild(reason);
  const ref = ctx.el('p', 'points-e025-ref');
  if (model.ids.length) {
    ref.append(
      ctx.el('span', 'points-e025-label', 'Référence d’omission : '),
      document.createTextNode(`${model.ids.join(', ')}.`)
    );
  } else {
    ref.textContent = 'Aucun identifiant d’omission dédié n’est associé à cette case.';
  }
  body.appendChild(ref);
  if (/non documenté/i.test(model.confidence)) {
    body.appendChild(ctx.el('p', 'points-e025-confidence',
      `Certitude « ${model.confidence} » : l’absence de source est attendue et tracée ; ce point n’est pas présenté comme une citation.`));
  }
}

/* E025-09 — une seule écriture DOM, conditionnée à la signature. Le titre
 * porte l'identifiant référencé par aria-labelledby ; aucune région live. */
function render(ctx, zone, model, detail) {
  const base = first(detail, '.points-sources');
  zone.replaceChildren();
  const title = ctx.el('h3', 'points-e025-title',
    model.hasSources ? 'Sources de ce point' : 'Sources · omission justifiée');
  title.id = TITLE_ID;
  zone.appendChild(title);
  const body = ctx.el('div', 'points-e025-body');
  zone.appendChild(body);

  /* Non destructif : la ligne plate est masquée, jamais retirée ; son contenu
   * est intégralement reclassé en citations ou en références d'omission. */
  if (base && !base.hidden) {
    base.hidden = true;
    put(base, 'data-points-e025-folded', '1');
  }
  if (model.hasSources) renderSources(ctx, body, model);
  else renderOmission(ctx, body, model);
  zone.appendChild(ctx.el('p', 'points-e025-metrics',
    `État : ${model.hasSources ? 'sources déclarées' : 'omission justifiée'} · actualisations de la zone : ${writes}.`));
}

/* E025-01 à E025-10 — passe unique, tolérante, appliquée à chaque rendu par
 * runEnhancements({ viewId, stage, layout }) (points.js:126). */
function apply(ctx) {
  const layout = ctx && ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const detail = first(layout, '.points-detail');
  if (!detail || typeof detail.insertBefore !== 'function') return;
  ctx.css(CSS_ID, CSS);

  const model = readModel(detail);
  const zone = place(ctx, ZONE_ID, 'section', 'points-e025-zone', detail);

  /* Orientation : avant la justification et la navigation, jamais après. */
  const anchor = first(detail, '.points-justification') || first(detail, '.points-nav');
  if (anchor && zone.nextElementSibling !== anchor) detail.insertBefore(zone, anchor);

  /* E025-03 / E025-08 — groupe nommé ; pas de role=dialog, ni d'aria-modal,
   * ni de région live ajoutée (E041 reste l'unique source d'annonces). */
  put(zone, 'role', 'group');
  put(zone, 'aria-labelledby', TITLE_ID);
  put(zone, 'data-points-e025', 'zone');

  /* E025-09 — sortie sans écriture si le modèle est inchangé. */
  const sig = signatureOf(model);
  if (zone.dataset.pointsE025Sig === sig && zone.querySelector('.points-e025-body')) return;
  zone.dataset.pointsE025Sig = sig;
  render(ctx, zone, model, detail);
  writes += 1;
}

register('E025', (ctx) => {
  try { apply(ctx); }
  catch { /* une structure inattendue neutralise la lentille, jamais le rendu. */ }
});
