import { register } from './registry.js';

/* Lentille POINTS E025 — passe 2 (V2) — Détail & fiche : bandeau de
 * traçabilité des sources, version autonome et préfixée.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E025.md — chantiers E025-01 à E025-10.
 * Fichier possédé : ce module V2 uniquement. Aucun fichier de la passe 1
 * (`src/views/points/E025.js`) ni aucun fichier partagé (`points.js`,
 * `registry.js`, `store.js`, `index.js`) n'est édité.
 *
 * Contrat exploité : ctx.viewId ('pointsv2'), ctx.stage et ctx.layout fournis
 * par runEnhancementsV2({ viewId, stage, layout }) dans src/views/points.js,
 * ainsi que ctx.css, ctx.el et ctx.reducedMotion() fournis par registry.js.
 * Toutes les valeurs affichées sont DÉRIVÉES DU DOM rendu par points.js :
 * `.points-sources`, `.points-justification`, `.points-meta .confidence` et
 * `.points-nav` dans `.points-detail`. Aucune source, aucune date, aucun
 * identifiant ni aucun chiffre n'est inventé.
 *
 * Différenciation V2 : la passe 1 construit une zone de sources avant la
 * justification ; la V2 ajoute un bandeau de traçabilité compact avant la
 * navigation, avec ses propres identifiants et une feuille entièrement
 * préfixée. Les deux lentilles coexistent sans se voler d'ancre.
 *
 * Invariants V2 :
 * - une seule feuille CSS, injectée par ctx.css('points-v2-e025', …) ;
 * - TOUTES les règles CSS sont préfixées par `.points-v2-e025` (classe posée
 *   sur `.points-detail`, ancêtre de toute la sous-arborescence ciblée) ;
 * - tous les identifiants CRÉÉS sont préfixés `points-v2-e025-` ;
 * - garde anti-doublon : chaque nœud créé est réutilisé par identifiant via
 *   `place`, et le contenu n'est réécrit que si le modèle change ;
 * - aucune écriture de balisage par chaîne, aucun minuteur, aucune boucle
 *   d'animation, aucun appel réseau, aucun aléa, aucune journalisation, aucun
 *   écouteur global, aucune région live ajoutée ;
 * - greffon idempotent et tolérant : une structure inattendue neutralise la
 *   lentille sans propager d'exception.
 */

const CSS_ID = 'points-v2-e025';
const ROOT = 'points-v2-e025';

const ID = {
  strip: 'points-v2-e025-strip',
  title: 'points-v2-e025-title',
  desc: 'points-v2-e025-desc',
  status: 'points-v2-e025-status',
  count: 'points-v2-e025-count',
  list: 'points-v2-e025-list',
  reason: 'points-v2-e025-reason',
  omissions: 'points-v2-e025-omissions',
  note: 'points-v2-e025-note',
};

/* Feuille unique. Chaque sélecteur est préfixé par `.points-v2-e025` : aucune
 * fuite hors de la lentille, aucune ressource externe, cibles tactiles
 * lisibles en 390 px, focus visible. Le mouvement est piloté par
 * ctx.reducedMotion() via l'attribut data-v2-e025-motion, avec un repli CSS
 * `@media (prefers-reduced-motion: reduce)`. Aucune information n'est portée
 * par la seule couleur : chaque état porte un badge textuel. */
const CSS = `
.points-v2-e025 .points-v2-e025-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.points-v2-e025 #points-v2-e025-strip{margin:8px 0 0;padding:8px 10px;border:1px solid var(--line-strong);border-radius:6px;background:rgba(255,255,255,.02);color:var(--ink-soft);font-size:10px;line-height:1.5;overflow-wrap:anywhere;max-width:100%}
.points-v2-e025 #points-v2-e025-title{margin:0 0 4px;font-family:var(--serif);font-size:12px;color:var(--gold-bright)}
.points-v2-e025 .points-v2-e025-pill{display:inline-block;margin-right:6px;padding:1px 6px;border:1px solid var(--line-strong);border-radius:999px;color:var(--gold);font-weight:600}
.points-v2-e025 #points-v2-e025-status{margin:0 0 4px}
.points-v2-e025 #points-v2-e025-count{margin:0 0 4px;color:var(--muted)}
.points-v2-e025 #points-v2-e025-list{margin:4px 0;padding-left:16px}
.points-v2-e025 #points-v2-e025-list li{margin-bottom:2px}
.points-v2-e025 .points-v2-e025-cite{font-style:normal;color:var(--gold-bright);font-variant-numeric:tabular-nums}
.points-v2-e025 #points-v2-e025-reason,
.points-v2-e025 #points-v2-e025-omissions{margin:0 0 4px;color:var(--muted-2)}
.points-v2-e025 #points-v2-e025-note{margin:4px 0 0;color:var(--muted-2);font-size:9px}
.points-v2-e025 .points-nav button:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.points-v2-e025[data-v2-e025-motion="full"] .points-v2-e025-pill{transition:border-color .15s ease,color .15s ease}
.points-v2-e025[data-v2-e025-motion="reduced"] .points-v2-e025-pill{transition:none}
@media (max-width:700px){
  .points-v2-e025 #points-v2-e025-strip{padding:6px 8px;font-size:9px}
}
@media (prefers-contrast:more){
  .points-v2-e025 #points-v2-e025-strip{background:#05070a;border-color:var(--gold-bright);color:var(--ink)}
}
@media (forced-colors:active){
  .points-v2-e025 #points-v2-e025-strip{border:1px solid CanvasText;background:Canvas;color:CanvasText}
}
@media (prefers-reduced-motion:reduce){
  .points-v2-e025 .points-v2-e025-pill{transition:none}
}
`;

function first(root, selector) {
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

/* Écriture conditionnelle : poser un attribut déjà conforme devient une
 * opération sans effet sur un DOM inchangé. */
function put(node, name, value) {
  if (!node || typeof node.setAttribute !== 'function') return;
  const next = String(value);
  if (node.getAttribute(name) !== next) node.setAttribute(name, next);
}

/* Réutilise un nœud par identifiant ; le retire s'il est mal parenté, le
 * recrée s'il est déconnecté. Garantit l'absence de doublon après un second
 * passage de la même passe V2. */
function place(ctx, id, tag, className, parent) {
  let node = document.getElementById(id);
  if (node && node.parentElement && node.parentElement !== parent) node.remove();
  if (!node || !node.isConnected) {
    node = ctx.el(tag, className);
    node.id = id;
    parent.appendChild(node);
  }
  return node;
}

function dedupe(values) {
  const seen = Object.create(null);
  return values.filter((value) => {
    if (seen[value]) return false;
    seen[value] = true;
    return true;
  });
}

/* Premier segment de phrase, plafonné : la justification intégrale reste dans
 * `.points-justification`, la V2 n'en montre qu'un extrait documentaire. */
function excerpt(text, max) {
  const clean = String(text || '').trim();
  if (!clean) return '';
  const match = /\.(?:\s|$)/.exec(clean);
  const cut = match ? clean.slice(0, match.index + 1) : clean;
  return cut.length > max ? `${cut.slice(0, max - 1).trimEnd()}…` : cut;
}

/* Le préfixe « Sources : » est ôté ; la virgule sépare les jetons. Aucun nom
 * de source n'est codé en dur. Un jeton OM-* n'est pas une citation. */
function sourceTokens(node) {
  const raw = txt(node);
  if (!raw) return [];
  return raw.replace(/^sources\s*:\s*/i, '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function kindOf(justification) {
  if (/vide\s+justifié/i.test(justification)) return 'case vide justifiée';
  if (/omission\s+documentée/i.test(justification)) return 'omission documentée';
  if (/dette\s+/i.test(justification)) return 'dette documentée';
  return 'absence de source déclarée';
}

function readModel(detail) {
  const base = first(detail, '.points-sources');
  const justification = txt(first(detail, '.points-justification'));
  const confidence = txt(first(detail, '.points-meta .confidence'));
  const tokens = sourceTokens(base);
  const citations = tokens.filter((token) => !/^OM-\d+$/i.test(token));
  const storedRefs = tokens.filter((token) => /^OM-\d+$/i.test(token));
  const ids = dedupe((`${justification} ${storedRefs.join(' ')}`).match(/OM-\d+/g) || []);
  const notDocumented = /non documenté/i.test(confidence);
  const hasSources = citations.length > 0;

  /* Quatre états mutuellement exclusifs, dérivés de deux signaux indépendants :
   * présence de citations et valeur de certitude. Aucun signal n'est corrigé. */
  let state;
  let badge;
  let detailText;
  if (hasSources && notDocumented) {
    state = 'inconsistent';
    badge = 'Cohérence à vérifier';
    detailText = `La fiche cite ${citations.length} référence(s) mais porte la certitude « ${confidence} » : les deux signaux sont affichés sans être résolus.`;
  } else if (hasSources) {
    state = 'sourced';
    badge = 'Sources citées';
    detailText = `${citations.length} référence(s) relevée(s) dans la ligne « Sources » de la fiche.`;
  } else if (notDocumented) {
    state = 'omission-documented';
    badge = 'Omission documentée';
    detailText = `Aucune citation ; la certitude « ${confidence} » est déclarée et tracée, non masquée.`;
  } else {
    state = 'omission-unqualified';
    badge = 'Omission non qualifiée';
    detailText = 'Aucune citation relevée ; la fiche ne déclare pas la certitude « non documenté ».';
  }

  return {
    citations,
    ids,
    justification,
    confidence,
    kind: kindOf(justification),
    hasSources,
    state,
    badge,
    detailText,
  };
}

/* Reproduction fidèle du modèle lu : les citations sont recopiées telles
 * quelles, les identifiants d'omission ne deviennent jamais des citations. */
function signatureOf(model) {
  return [
    model.state,
    model.badge,
    model.detailText,
    model.citations.join('\u0001'),
    model.ids.join('\u0001'),
    model.kind,
    model.confidence,
    model.justification,
  ].join('\u0002');
}

function render(ctx, strip, model) {
  strip.replaceChildren();

  /* E025-03 — en-tête nommé, description masquée référencée par aria-describedby. */
  const title = ctx.el('h4', 'points-v2-e025-title', 'Traçabilité des sources');
  title.id = ID.title;
  strip.appendChild(title);
  const desc = ctx.el('p', 'points-v2-e025-sr',
    'Ce bandeau résume les signaux déjà présents dans la fiche : ligne « Sources », justification et certitude. Il n’ajoute aucune source et ne remplace pas la zone de la passe 1.');
  desc.id = ID.desc;
  strip.appendChild(desc);

  /* E025-04 / E025-08 — badge textuel + phrase dérivée, sans couleur seule. */
  const status = ctx.el('p', 'points-v2-e025-status');
  status.id = ID.status;
  status.append(
    ctx.el('span', 'points-v2-e025-pill', model.badge),
    document.createTextNode(model.detailText)
  );
  strip.appendChild(status);

  /* E025-05 — décompte et liste structurée des citations réellement lues. */
  const count = ctx.el('p', 'points-v2-e025-count',
    `Références citées : ${model.citations.length} — identifiants d’omission : ${model.ids.length}.`);
  count.id = ID.count;
  strip.appendChild(count);
  if (model.citations.length) {
    const list = ctx.el('ul', 'points-v2-e025-list');
    list.id = ID.list;
    model.citations.forEach((token) => {
      const item = ctx.el('li');
      item.appendChild(ctx.el('cite', 'points-v2-e025-cite', token));
      list.appendChild(item);
    });
    strip.appendChild(list);
  }

  /* E025-07 — motif en extrait, jamais transformé en référence ni en URL. */
  if (!model.hasSources) {
    const reason = ctx.el('p', 'points-v2-e025-reason');
    reason.id = ID.reason;
    reason.append(
      ctx.el('span', 'points-v2-e025-pill', model.kind),
      document.createTextNode(excerpt(model.justification, 200)
        || ' aucun motif supplémentaire n’est fourni par la fiche.')
    );
    strip.appendChild(reason);
  }

  /* E025-06 — identifiants OM-* dédupliqués, classés à part des citations. */
  const omissions = ctx.el('p', 'points-v2-e025-omissions');
  omissions.id = ID.omissions;
  omissions.textContent = model.ids.length
    ? `Identifiants d’omission : ${model.ids.join(', ')} — ils consignent une absence documentée, non une source consultée.`
    : 'Aucun identifiant d’omission dédié relevé dans la fiche.';
  strip.appendChild(omissions);

  /* Note méthodologique statique : aucune donnée chiffrée n'y est figée. */
  const note = ctx.el('p', 'points-v2-e025-note',
    'Toutes les valeurs de ce bandeau sont lues sur la fiche ; aucune source, aucune date ni aucun identifiant n’est inventé.');
  note.id = ID.note;
  strip.appendChild(note);
}

function apply(ctx) {
  /* ctx.layout est la racine fournie par points.js ; ctx.stage sert de repli. */
  const scope = ctx && (ctx.layout || ctx.stage);
  if (!scope || typeof scope.querySelector !== 'function') return;
  const detail = first(scope, '.points-detail');
  if (!detail || typeof detail.insertBefore !== 'function') return;

  /* E025-01 — feuille unique et ancrage CSS préfixé. */
  ctx.css(CSS_ID, CSS);
  if (!detail.classList.contains(ROOT)) detail.classList.add(ROOT);

  /* E025-02 — exploitation explicite des quatre entrées de contexte. */
  put(detail, 'data-v2-e025-view', txt(ctx.viewId) || 'pointsv2');
  const stage = ctx.stage;
  const stageRef = stage && stage.id ? stage.id
    : (stage && stage.tagName ? String(stage.tagName).toLowerCase() : '');
  put(detail, 'data-v2-e025-stage', stageRef);
  let reduced = false;
  try { reduced = Boolean(ctx.reducedMotion && ctx.reducedMotion()); } catch { reduced = false; }
  put(detail, 'data-v2-e025-motion', reduced ? 'reduced' : 'full');

  const model = readModel(detail);
  const strip = place(ctx, ID.strip, 'section', 'points-v2-e025-strip', detail);

  /* Orientation : avant la navigation, jamais après ; la zone de la passe 1
   * (avant la justification) reste à sa place. */
  const anchor = first(detail, '.points-nav');
  if (anchor && strip.nextElementSibling !== anchor) detail.insertBefore(strip, anchor);

  /* E025-03 / E025-04 / E025-05 / E025-06 — attributs de groupe et signaux
   * auditables, distincts de ceux de la passe 1. */
  put(strip, 'role', 'group');
  put(strip, 'aria-labelledby', ID.title);
  put(strip, 'aria-describedby', ID.desc);
  put(strip, 'data-v2-e025', '1');
  put(strip, 'data-v2-e025-state', model.state);
  put(strip, 'data-v2-e025-count', String(model.citations.length));
  put(strip, 'data-v2-e025-omissions', String(model.ids.length));

  /* E025-10 — sortie sans écriture si le modèle est inchangé. La signature
   * vit sur le nœud : elle disparaît avec lui au rendu neuf. */
  const sig = signatureOf(model);
  if (strip.getAttribute('data-v2-e025-sig') === sig && first(strip, `#${ID.status}`)) return;
  put(strip, 'data-v2-e025-sig', sig);
  render(ctx, strip, model);
}

register('E025', (ctx) => {
  try {
    apply(ctx);
  } catch {
    /* une structure inattendue neutralise la lentille, jamais le rendu. */
  }
});
