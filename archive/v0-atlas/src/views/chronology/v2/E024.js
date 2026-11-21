import { register } from './registry.js';

/* Lentille E024 — Passe V2, domaine C : détail & fiche.
 *
 * Thème : « familles de points en puces sémantiques ». La fiche de la vue
 * (src/views/chronology.js:474-488) imprime chaque famille de point dans un
 * <span class="point-kind is-KIND"> brut, dont le sens est porté surtout par
 * la couleur (styles.css:230-234). Cette lentille n'édite ni la vue, ni le CSS
 * global : elle greffe un panneau de légende non modal dans la fiche et
 * annote les puces existantes, sans changer leur texte visible.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E024.md — chantiers
 * E024-01 à E024-10. Fichier possédé : ce module uniquement.
 *
 * Contrat : viewId 'chronologyv2', stage, layout ; helpers ctx.css, ctx.el,
 * ctx.reducedMotion. Une seule feuille CSS, un seul register, aucun réseau,
 * aucun aléa, aucune journalisation, aucun timer, aucun innerHTML,
 * aucun role="status"/aria-live, aucun aria-pressed (les puces ne sont pas
 * des bascules), aucun ajout d'arrêt Tab.
 */

const CSS_ID = 'chronology-v2-e024';
const PANEL_ID = 'chronology-v2-e024-families';
const TITLE_ID = 'chronology-v2-e024-title';
const LIST_ID = 'chronology-v2-e024-list';
const METRIC_ID = 'chronology-v2-e024-metric';
const ASIDE_ID = 'atlas-chrono-aside';

/* E024-01 à E024-10 : une seule feuille, injectée une fois par ctx.css.
   Le panneau reste un bloc en flux normal en fin de fiche : jamais de modale,
   jamais de superpositions, jamais de tabindex ajouté. */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 10px 12px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e024-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 13px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e024-lede,
  #${PANEL_ID} .e024-distinct,
  #${PANEL_ID} .e024-metric { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .e024-distinct {
    padding-left: 8px; border-left: 2px solid var(--line-strong);
  }
  #${PANEL_ID} .e024-list {
    display: flex; flex-wrap: wrap; gap: 6px;
    margin: 0 0 8px; padding: 0; list-style: none;
  }
  #${PANEL_ID} .e024-chip {
    display: inline-flex; align-items: center; gap: 5px;
    min-height: 24px; padding: 2px 8px;
    border: 1px solid var(--line-strong); border-radius: 999px;
    color: var(--ink-soft); font-size: 10px; white-space: normal;
  }
  #${PANEL_ID} .e024-glyph {
    flex: 0 0 auto; color: var(--gold-bright); font-size: 11px;
  }
  #${PANEL_ID} .e024-count { color: var(--muted-2); }
  #${PANEL_ID} .e024-desc { color: var(--muted); font-size: 9px; }
  #${PANEL_ID} .e024-metric { margin: 0; color: var(--muted-2); font-size: 9px; }
  #${PANEL_ID} .e024-sr {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }
  /* E024-03 : la famille « récit », majoritaire, reçoit un style explicite
     au lieu d'hériter du vide des sélecteurs .is-* (styles.css:231-233). */
  #${ASIDE_ID} .point-kind[data-e024-kind="récit"] {
    border-style: solid; color: var(--ink-soft);
  }
  /* E024-07 : une forme distincte accompagne toujours la couleur :
     pointillé pour les figures, tiret pour les lieux, double pour les audits. */
  #${ASIDE_ID} .point-kind[data-e024-annotated="1"] { border-style: dashed; }
  #${ASIDE_ID} .point-kind[data-e024-kind="figure"] { border-style: dotted; }
  #${ASIDE_ID} .point-kind[data-e024-kind="lieu"] { border-style: dashed; }
  #${ASIDE_ID} .point-kind[data-e024-kind="audit"] { border-style: double; }
  /* E024-08 : à 390×844, les puces restent lisibles et ne débordent pas. */
  @media (max-width: 620px) {
    #${PANEL_ID} .e024-list { gap: 4px; }
    #${PANEL_ID} .e024-chip { padding: 3px 7px; font-size: 11px; }
    #${PANEL_ID} .e024-desc { flex-basis: 100%; }
  }
  /* E024-10 : zéro mouvement propre, repli forced-colors. */
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, #${PANEL_ID} .e024-chip { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e024-title,
    #${PANEL_ID} .e024-glyph { color: CanvasText; }
  }
`;

/* E024-02 et E024-03 : vocabulaire stable, dérivé des quatre valeurs de
   point.kind présentes dans src/data/dataset.js (récit, figure, lieu, audit).
   Aucune famille n'est inventée : un kind inattendu est signalé « autre ». */
const FAMILIES = [
  { kind: 'récit', label: 'Récit', glyph: '—', description: 'Fil narratif du repère.' },
  { kind: 'figure', label: 'Figure', glyph: '◆', description: 'Personne nommée.' },
  { kind: 'lieu', label: 'Lieu', glyph: '▣', description: 'Place géographique.' },
  { kind: 'audit', label: 'Audit', glyph: '◈', description: 'Point de vérification.' },
];

let installCount = 0;
let refs = null;

/* E024-09 : garde d'existence pour toute ID préfixée. Un nœud déjà présent
   est réutilisé et déplacé dans le parent courant : la coque reconstruisant
   la scène, un nœud de la rendu précédente est détaché et n'est pas retrouvé
   par getElementById. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E024-05 : décompte lu dans le DOM rendu, jamais codé en dur. Les points
   portent data-kind depuis src/views/chronology.js:478. */
function collectCounts(host) {
  const counts = new Map();
  let total = 0;
  host.querySelectorAll('.point[data-kind]').forEach((point) => {
    const kind = (point.dataset.kind || '').trim();
    if (!kind) return;
    total += 1;
    counts.set(kind, (counts.get(kind) || 0) + 1);
  });
  return { counts, total };
}

function describe(kind) {
  return FAMILIES.find((family) => family.kind === kind) || null;
}

/* E024-01, E024-02, E024-03, E024-07 : la légende est une vraie liste <ul>/<li>.
   Chaque puce porte glyphe (décoratif, aria-hidden), libellé textuel,
   description et compte ; aucune information n'est laissée à la couleur. */
function buildList(make, list, counts) {
  const known = FAMILIES.map((family) => family.kind);
  const extra = [...counts.keys()].filter((kind) => !known.includes(kind))
    .sort((a, b) => a.localeCompare(b, 'fr'));
  const kinds = [...known, ...extra];

  list.replaceChildren(...kinds.map((kind) => {
    const family = describe(kind);
    const label = family ? family.label : 'Autre';
    const glyph = family ? family.glyph : '•';
    const definition = family ? family.description : 'Famille non documentée par la légende.';
    const count = counts.get(kind) || 0;

    const item = make('li', 'e024-item');
    const chip = make('span', 'e024-chip');
    chip.dataset.e024Kind = kind;
    const mark = make('span', 'e024-glyph', glyph);
    mark.setAttribute('aria-hidden', 'true');
    chip.append(
      mark,
      make('span', 'e024-label', label),
      make('span', 'e024-count', `×${count}`)
    );
    item.append(chip, make('span', 'e024-desc', definition));
    return item;
  }));

  return { known: known.length, extra: extra.length };
}

/* E024-06 : équivalent textuel pour les technologies d'assistance. Le texte
   visible de la puce d'origine n'est pas modifié ; on lui préfixe un segment
   visuellement masqué « Famille : » et on publie son identifiant. */
function annotateKinds(make, host) {
  let annotated = 0;
  host.querySelectorAll('.point-kind').forEach((span) => {
    const point = span.closest('.point');
    const kind = (point && point.dataset.kind) || span.textContent.trim();
    const family = describe(kind);
    span.dataset.e024Kind = kind;
    span.setAttribute('title', family
      ? `Famille de point : ${family.label} — ${family.description}`
      : `Famille de point : ${kind} (non documentée)`);
    if (span.dataset.e024Annotated !== '1') {
      span.prepend(make('span', 'e024-sr', 'Famille : '));
      span.dataset.e024Annotated = '1';
      annotated += 1;
    }
  });
  return annotated;
}

function refresh() {
  if (!refs || !refs.panel || !refs.panel.isConnected) return;
  const { panel, list, metric, host, reduced } = refs;
  const { counts, total } = collectCounts(host);
  const { extra } = buildList(refs.make, list, counts);
  const annotated = annotateKinds(refs.make, host);

  panel.dataset.e024Families = String(FAMILIES.length);
  panel.dataset.e024Points = String(total);
  panel.dataset.e024Unknown = String(extra);
  panel.dataset.e024Annotated = String(annotated);
  panel.dataset.e024Installs = String(installCount);
  panel.dataset.e024Reduced = reduced ? '1' : '0';
  panel.dataset.e024Scope = 'family';

  write(metric, `Familles documentées : ${FAMILIES.length} · points étiquetés : ${total} · familles inconnues : ${extra} · puces annotées : ${annotated} · installations : ${installCount} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(ASIDE_ID) || ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e024-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e024-title', 'Familles de points');
  title.id = TITLE_ID;
  const lede = make('p', 'e024-lede', 'Une famille dit ce qu’est le point : récit, figure, lieu ou audit. Chaque puce porte son nom, sa forme et son compte, jamais la couleur seule.');
  const distinct = make('p', 'e024-distinct', 'Les familles décrivent la nature d’un point. Les « Thèmes » affichés plus haut sont des filtres de repère : ils ne se confondent pas avec cette légende.');
  const list = make('ul', 'e024-list');
  list.id = LIST_ID;
  const metric = make('p', 'e024-metric');
  metric.id = METRIC_ID;
  panel.replaceChildren(title, lede, distinct, list, metric);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = { panel, list, metric, host, reduced, make };
  refresh();
}

register('E024', install);
