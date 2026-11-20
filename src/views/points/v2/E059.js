import { register } from './registry.js';

/* Lentille E059 — passe 2 (V2), domaine F : sémantique & données.
 * Thème : « échelle (local → global) représentée ».
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E059.md — chantiers E059-01 à E059-10.
 * Fichier possédé : src/views/points/v2/E059.js uniquement. Ni la passe 1
 * (src/views/points/E059.js), ni la vue points.js, ni la coque, ni registry.js,
 * ni index.js, ni styles.css, ni une autre lentille ne sont modifiés.
 *
 * Différence contractuelle V2 : points.js:128 appelle
 * runEnhancementsV2({ viewId: 'pointsv2', stage, layout }). La lentille filtre
 * donc strictement sur 'pointsv2'. Tous ses signaux — CSS, ids, classes,
 * clés data-* et propriétés dataset — sont préfixés points-v2-e059 /
 * pointsV2E059 pour ne pas écraser ceux de la passe 1 (points-e059,
 * pointsE059Scale, pointsE059Ready). Les deux règles coexistent sans conflit.
 *
 * Contrat exploité : viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion(). Aucune dépendance au dataset, au store, au routeur ou à une
 * autre lentille : l'échelle est lue dans le seul DOM déjà rendu.
 *
 * Invariants : une seule feuille CSS, une seule portée, un seul panneau, une
 * seule observation, une seule signature d'écriture par rendu, un seul
 * register('E059', ctx => …). Zéro innerHTML, zéro réseau, zéro aléa, zéro
 * timer, zéro rAF, zéro console.*, aucun écouteur global.
 */

const VIEW_ID = 'pointsv2';
const CSS_ID = 'points-v2-e059';
const SCOPE = 'points-v2-e059';
const PANEL_ID = 'points-v2-e059-panel';
const TITLE_ID = 'points-v2-e059-title';
const INTRO_ID = 'points-v2-e059-intro';
const READING_ID = 'points-v2-e059-reading';
const LADDER_ID = 'points-v2-e059-ladder';
const NOTE_ID = 'points-v2-e059-note';
const METRICS_ID = 'points-v2-e059-metrics';

const DATA_SCOPE = 'pointsV2E059';
const REDUCED_ATTR = 'data-points-v2-e059-reduced';

/* E059-01, E059-02, E059-03 : vocabulaire canonique du local au global,
 * documenté dans POINT_METHODOLOGY.md:15 (« local / régional / national /
 * impérial / global ») et :28 (`E` = échelle). Les cinq rangs restent distincts
 * et chacun porte un libellé, une définition et un glyphe textuel. Le jeton
 * `transnational` du jeu de données est ramené au cran global, comme en passe 1. */
const RANGS = Object.freeze([
  Object.freeze({
    code: 'local',
    libelle: 'Local',
    definition: 'Une commune, un site, un quartier : interaction directe.',
    glyphe: '•',
  }),
  Object.freeze({
    code: 'regional',
    libelle: 'Régional',
    definition: 'Une province, une région : portée infra-nationale.',
    glyphe: '••',
  }),
  Object.freeze({
    code: 'national',
    libelle: 'National',
    definition: 'Le pays entier, ses institutions et sa population.',
    glyphe: '•••',
  }),
  Object.freeze({
    code: 'imperial',
    libelle: 'Impérial',
    definition: 'Un empire ou un domaine réunissant plusieurs territoires.',
    glyphe: '••••',
  }),
  Object.freeze({
    code: 'global',
    libelle: 'Transnational / global',
    definition: 'Des réseaux et flux au-delà des frontières, à portée planétaire.',
    glyphe: '•••••',
  }),
]);

/* Égalité stricte (jamais de sous-chaîne) : « Circulations transnationales »,
 * un domaine, ne peut pas être pris pour une échelle. */
const ALIAS = Object.freeze({
  local: 'local',
  regional: 'regional', régional: 'regional',
  national: 'national',
  imperial: 'imperial', impérial: 'imperial',
  global: 'global', transnational: 'global', transnationale: 'global', transnationales: 'global',
});

/* E059-01 : feuille unique. Chaque sélecteur commence littéralement par
 * `.points-v2-e059`, y compris dans les @media : aucune règle ne peut fuir
 * hors de la vue Points ni écraser la feuille points-e059 de la passe 1.
 * Aucune information n'est portée par la seule couleur (ordinal, libellé,
 * glyphe et statut textuels doublent l'accent). */
const CSS = `
  .points-v2-e059 .points-v2-e059-panel {
    margin: 12px 0 4px; padding: 11px 13px 13px;
    border: 1px solid var(--line-strong, #6b6b6b);
    border-left: 3px solid var(--gold-bright, #f0d49a);
    border-radius: 10px; background: rgba(230, 185, 111, .04);
    color: var(--ink-soft, #d8d8d8); font: inherit;
    font-size: 11px; line-height: 1.5; font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
  .points-v2-e059 .points-v2-e059-title {
    margin: 0 0 6px; color: var(--gold-bright, #f0d49a);
    font-family: var(--serif, Georgia, serif); font-size: 13px; font-weight: 600;
  }
  .points-v2-e059 .points-v2-e059-intro,
  .points-v2-e059 .points-v2-e059-note { margin: 0 0 8px; color: var(--muted-2, #999); }
  .points-v2-e059 .points-v2-e059-reading { margin: 0 0 9px; color: var(--ink-soft, #d8d8d8); }
  .points-v2-e059 .points-v2-e059-ladder { list-style: none; margin: 0 0 9px; padding: 0; }
  .points-v2-e059 .points-v2-e059-rang {
    display: grid; grid-template-columns: 18px 20px 96px 1fr;
    gap: 6px; align-items: baseline; margin: 0 0 3px; padding: 5px 6px;
    min-height: 44px; border: 1px solid var(--line, #444);
    border-left-width: 3px; border-radius: 6px;
    background: rgba(255, 255, 255, .02);
  }
  .points-v2-e059 .points-v2-e059-rang.is-past { opacity: .72; }
  .points-v2-e059 .points-v2-e059-rang.is-current {
    border-color: var(--gold-bright, #f0d49a);
    box-shadow: inset 0 0 0 1px var(--gold-bright, #f0d49a);
  }
  .points-v2-e059 .points-v2-e059-ordinal { color: var(--muted-2, #999); font-size: 10px; }
  .points-v2-e059 .points-v2-e059-glyphe {
    color: var(--gold-bright, #f0d49a); font-size: 10px; letter-spacing: 1px;
    white-space: nowrap;
  }
  .points-v2-e059 .points-v2-e059-libelle {
    color: var(--ink-soft, #d8d8d8); font-size: 11px; font-weight: 600;
  }
  .points-v2-e059 .points-v2-e059-rang.is-current .points-v2-e059-libelle {
    color: var(--gold-bright, #f0d49a);
  }
  .points-v2-e059 .points-v2-e059-def { color: var(--muted-2, #999); font-size: 10px; }
  .points-v2-e059 .points-v2-e059-statut {
    grid-column: 3 / -1; color: var(--muted-2, #999); font-size: 10px;
  }
  .points-v2-e059 .points-v2-e059-rang.is-current .points-v2-e059-statut {
    color: var(--gold-bright, #f0d49a);
  }
  .points-v2-e059 .points-v2-e059-metrics {
    margin: 0; padding-top: 6px; border-top: 1px solid var(--line, #444);
    color: var(--muted-2, #999); font-size: 10px; font-variant-numeric: tabular-nums;
  }
  @media (max-width: 700px) {
    .points-v2-e059 .points-v2-e059-rang { grid-template-columns: 16px 18px 1fr; }
    .points-v2-e059 .points-v2-e059-def { grid-column: 3 / -1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e059 .points-v2-e059-panel,
    .points-v2-e059 .points-v2-e059-rang {
      transition: none !important; animation: none !important;
    }
  }
  @media (forced-colors: active) {
    .points-v2-e059 .points-v2-e059-panel,
    .points-v2-e059 .points-v2-e059-rang {
      border-color: CanvasText; background: Canvas; color: CanvasText;
    }
    .points-v2-e059 .points-v2-e059-title,
    .points-v2-e059 .points-v2-e059-intro,
    .points-v2-e059 .points-v2-e059-note,
    .points-v2-e059 .points-v2-e059-reading,
    .points-v2-e059 .points-v2-e059-ordinal,
    .points-v2-e059 .points-v2-e059-glyphe,
    .points-v2-e059 .points-v2-e059-libelle,
    .points-v2-e059 .points-v2-e059-def,
    .points-v2-e059 .points-v2-e059-statut,
    .points-v2-e059 .points-v2-e059-metrics { color: CanvasText; }
  }
`;

let panel = null;          // panneau V2, réutilisé d'un rendu à l'autre
let reading = null;        // phrase de lecture dérivée du DOM
let ladder = null;         // liste ordonnée des crans
let metrics = null;        // compteurs auditables, hors région live
let observer = null;       // unique observateur, ciblé sur .points-meta
let currentCtx = null;     // dernier ctx reçu, pour l'observateur
let lastSignature = '';    // signature anti-écriture
let installations = 0;     // nombre d'installations, exposé aux compteurs

/* E059-01 : racine = layout (.points-layout), repliée sur stage. */
function rootOf(ctx) {
  const layout = ctx && ctx.layout;
  if (layout && typeof layout.querySelector === 'function') return layout;
  const stage = ctx && ctx.stage;
  if (stage && typeof stage.querySelector === 'function') return stage;
  return null;
}

function metaOf(root) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector('.points-detail .points-meta') : null;
}

/* Clé de dataset hyphenée : marquer(noeud, 'Code', 'local') écrit
 * data-points-v2-e059-code, distinct de toute clé de la passe 1. */
function marquer(noeud, propriete, valeur) {
  if (!noeud || !noeud.dataset) return;
  const cle = `${DATA_SCOPE}${propriete}`;
  if (noeud.dataset[cle] !== valeur) noeud.dataset[cle] = valeur;
}

function ecrire(noeud, texte) {
  if (noeud && noeud.textContent !== texte) noeud.textContent = texte;
}

/* E059-02 : le seul chiffre/vocable importé est l'échelle LUE dans le DOM.
 * points.js:101-107 écrit domaine, échelle, temps, certitude dans quatre spans ;
 * la position 1 est contractuelle, le balayage exact sert de repli. */
function readScale(root) {
  const meta = metaOf(root);
  if (!meta) return null;
  const spans = Array.from(meta.querySelectorAll('span'));
  const ordered = spans.length > 1 ? [spans[1], ...spans] : spans;
  const seen = new Set();
  for (const span of ordered) {
    if (!span || seen.has(span)) continue;
    seen.add(span);
    const raw = String(span.textContent || '').trim();
    const key = ALIASES[raw.toLowerCase()];
    if (key) return { key, raw };
  }
  return null;
}

function levelOf(key) {
  return RANGS.find((rang) => rang.code === key) || null;
}

/* E059-05 : le jeton brut est montré puis glossé ; l'absence est un état,
 * jamais un silence ni une valeur inventée. */
function readingText(scale, rang) {
  if (!scale || !rang) {
    return 'Échelle non renseignée dans le détail : le champ E du point est absent ou illisible.';
  }
  return `Ce point se situe à l’échelle « ${scale.raw} » : ${rang.definition}`;
}

/* E059-03/04 : cinq crans ordonnés, chacun avec un ordinal, un glyphe, un
 * libellé, une définition et un statut textuel. Le cran courant porte en plus
 * aria-current, la classe is-current et le marqueur « ← ce point » : jamais la
 * couleur seule ne porte l'information. */
function renderLadder(ctx, rang) {
  if (!ladder) return;
  const currentRank = rang ? RANGS.indexOf(rang) + 1 : 0;
  const steps = RANGS.map((entree, index) => {
    const position = index + 1;
    const current = !!rang && entree.code === rang.code;
    const passe = !!rang && position < currentRank;
    const statut = current
      ? '← ce point · cran actuel'
      : (passe ? 'cran plus circonscrit' : (rang ? 'cran plus étendu' : 'cran de la règle'));
    const li = ctx.el('li',
      `points-v2-e059-rang${current ? ' is-current' : ''}${passe ? ' is-past' : ''}`);
    if (current) li.setAttribute('aria-current', 'true');
    marquer(li, 'Code', entree.code);
    marquer(li, 'Rang', String(position));
    marquer(li, 'Statut', current ? 'actuel' : (passe ? 'passe' : (rang ? 'avenir' : 'neutre')));
    const ordinal = ctx.el('span', 'points-v2-e059-ordinal', String(position));
    ordinal.setAttribute('aria-hidden', 'true');
    const glyphe = ctx.el('span', 'points-v2-e059-glyphe', entree.glyphe);
    glyphe.setAttribute('aria-hidden', 'true');
    li.append(
      ordinal,
      glyphe,
      ctx.el('span', 'points-v2-e059-libelle', entree.libelle),
      ctx.el('span', 'points-v2-e059-def', entree.definition),
      ctx.el('span', 'points-v2-e059-statut', statut)
    );
    return li;
  });
  ladder.replaceChildren(...steps);
}

/* E059-07 : compteurs dérivés de la règle et du DOM, jamais du dataset. Le
 * nœud est un <p> ordinaire, hors région live, avec miroir sur dataset. */
function writeMetrics(rang, root) {
  if (!metrics) return;
  const rank = rang ? RANGS.indexOf(rang) + 1 : 0;
  const total = RANGS.length;
  const enDeça = Math.max(0, rank - 1);
  const auDelà = Math.max(0, total - rank);
  ecrire(metrics,
    `Échelle lue : ${rang ? rang.libelle : 'non renseignée'} · Cran ${rank}/${total} · ` +
    `${enDeça} cran(s) en deçà, ${auDelà} au-delà · ${total} niveaux · Rendus : ${installations}.`);
  if (panel) {
    marquer(panel, 'Rang', String(rank));
    marquer(panel, 'Total', String(total));
    marquer(panel, 'EnDeça', String(enDeça));
    marquer(panel, 'AuDelà', String(auDelà));
    marquer(panel, 'Installations', String(installations));
  }
  if (root && root.dataset) marquer(root, 'State', rang ? 'ready' : 'unknown');
}

function render(root) {
  if (!panel || !panel.isConnected) return;
  const scale = readScale(root);
  const rang = scale ? levelOf(scale.key) : null;
  const signature = scale ? `${scale.key}|${scale.raw}` : 'none';
  if (signature === lastSignature) return;
  lastSignature = signature;
  ecrire(reading, readingText(scale, rang));
  renderLadder(currentCtx, rang);
  writeMetrics(rang, root);
  const detail = root ? root.querySelector('.points-detail') : null;
  if (detail && detail.dataset) {
    marquer(detail, 'Scale', scale ? scale.key : 'unknown');
    marquer(detail, 'Ready', 'true');
  }
}

/* E059-09 : contenu statique construit par ctx.el, jamais innerHTML. */
function buildBody(ctx) {
  const title = ctx.el('h2', 'points-v2-e059-title', 'Échelle V2 du point — du local au global');
  title.id = TITLE_ID;

  const intro = ctx.el('p', 'points-v2-e059-intro',
    'Lecture de l’échelle du point : du local au global. Le rang est porté par l’ordre de la liste, par un ordinal, un libellé et un statut textuels — jamais par la seule couleur. Aucune échelle n’est déduite de la date du point.');
  intro.id = INTRO_ID;

  const readingNode = ctx.el('p', 'points-v2-e059-reading', '');
  readingNode.id = READING_ID;

  const ladderNode = ctx.el('ol', 'points-v2-e059-ladder');
  ladderNode.id = LADDER_ID;
  ladderNode.setAttribute('aria-label', 'Échelle du point, du local au global');

  /* E059-06 : rappel du champ E de la forme P = (S, R, O, T, E, D, Src, C),
   * source POINT_METHODOLOGY.md:15 et :23-28. */
  const note = ctx.el('p', 'points-v2-e059-note',
    'L’échelle est le « E » de P = (S, R, O, T, E, D, Src, C) : un champ du point, pas une déduction de son millésime.');
  note.id = NOTE_ID;

  const metricsNode = ctx.el('p', 'points-v2-e059-metrics', '');
  metricsNode.id = METRICS_ID;

  return { title, intro, reading: readingNode, ladder: ladderNode, note, metrics: metricsNode };
}

/* E059-08 : un seul observateur, déconnecté puis reconnecté, ciblé sur
 * .points-meta (la zone LUE), jamais sur le panneau que E059 réécrit. */
function observeMeta(root) {
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  if (typeof MutationObserver === 'undefined' || !root) return;
  const meta = metaOf(root);
  if (!meta) return;
  observer = new MutationObserver(() => {
    if (root) render(root);
  });
  observer.observe(meta, { childList: true, characterData: true, subtree: true });
}

/* E059-10 : mouvement réduit lu avec repli sûr, comme en E030 V2. */
function reducedMotion(ctx) {
  if (ctx && typeof ctx.reducedMotion === 'function') {
    try { return !!ctx.reducedMotion(); }
    catch { /* repli ci-dessous */ }
  }
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

function apply(ctx) {
  /* E059-01 : filtre strict sur la vue V2 et gardes de type pour un ctx
   * minimal. Un viewId étranger ou absent neutralise la lentille. */
  if (!ctx || ctx.viewId !== VIEW_ID) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const root = rootOf(ctx);
  if (!root) return;

  ctx.css(CSS_ID, CSS);
  if (root.classList) root.classList.add(SCOPE);
  marquer(root, 'Scope', '1');
  if (reducedMotion(ctx)) root.setAttribute(REDUCED_ATTR, '1');
  else root.removeAttribute(REDUCED_ATTR);

  const detail = root.querySelector('.points-detail');
  if (!detail) return;
  currentCtx = ctx;
  installations += 1;

  /* Un rendu neuf recrée le panneau : un panneau déconnecté le signale. */
  const fresh = !panel || !panel.isConnected;
  if (fresh) lastSignature = '';

  /* E059-10 : un seul panneau, relogé sans doublon, réutilisé sinon. Les ids
   * V2 sont distincts de ceux de la passe 1 (points-e059-…). */
  let found = document.getElementById(PANEL_ID);
  if (found && found.parentElement !== detail) found.remove();
  panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = ctx.el('section', 'points-v2-e059-panel');
    panel.id = PANEL_ID;
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-labelledby', TITLE_ID);
  }
  if (panel.parentElement !== detail) detail.appendChild(panel);

  if (fresh) {
    const body = buildBody(ctx);
    reading = body.reading;
    ladder = body.ladder;
    metrics = body.metrics;
    panel.replaceChildren(body.title, body.intro, body.reading,
      body.ladder, body.note, body.metrics);
  }

  render(root);
  observeMeta(root);
  if (detail.dataset) marquer(detail, 'Ready', 'true');
}

/* E059-10 : enregistrement unique, isolé par try/catch : une lentille
 * défaillante ne doit jamais interrompre le rendu des autres modules V2. */
register('E059', (ctx) => {
  try { apply(ctx); } catch { return; }
});
