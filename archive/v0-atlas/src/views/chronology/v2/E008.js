import { register } from './registry.js';

/* Lentille E008 — passe V2 du domaine A (Frise & ères).
 * Thème : numérotation ordonnée des repères. Dix chantiers E008-01 à E008-10,
 * tous centrés sur la numérotation ; aucun ne recouvre E001–E007 (bandes d'ères,
 * étiquettes, échelle, ère courante, densité, séparateurs, proportions) ni E009
 * (infobulle) ni E010 (impression).
 *
 * Fichier possédé : src/views/chronology/v2/E008.js uniquement.
 * Lectures : src/views/chronology.js, src/views/chronology/v2/registry.js,
 * src/views/chronology/v2/index.js, src/views/chronology/E049.js (modèle).
 *
 * Contrat : import { register } from './registry.js' ; un seul appel à register
 * pour E008 (fonction fléchée prenant ctx) ; ctx = { viewId:'chronologyv2', stage, layout,
 * css, el, reducedMotion }. Une seule feuille via ctx.css('chronology-v2-e008', …).
 *
 * Invariants : zéro console.*, zéro fetch/XHR/import distant, zéro Math.random,
 * zéro innerHTML, zéro timer, zéro rAF. Tout chiffre est lu dans le DOM rendu
 * (dataset, textes, attributs ARIA), jamais codé en dur. Les numéros ajoutés
 * sont des textes visibles et des attributs, jamais des remplacements de contenu.
 */

const CSS_ID = 'chronology-v2-e008';
const PANEL_ID = 'chronology-v2-e008-panel';
const TITLE_ID = 'chronology-v2-e008-title';
const CHECK_ID = 'chronology-v2-e008-check';
const CURRENT_ID = 'chronology-v2-e008-current';
const CONSISTENCY_ID = 'chronology-v2-e008-consistency';
const INDEX_TITLE_ID = 'chronology-v2-e008-index-title';
const INDEX_ID = 'chronology-v2-e008-index';
const METRIC_ID = 'chronology-v2-e008-metric';

const MAIN_ID = 'atlas-chrono-main';
const EVENTS_ID = 'atlas-chrono-events';
const STATUS_ID = 'atlas-chrono-status';
const PROGRESS_ID = 'nav-c2a-progress';
const ASIDE_ID = 'atlas-chrono-aside';

const BADGE_PREFIX = 'chronology-v2-e008-badge-';
const ORD_PREFIX = 'chronology-v2-e008-ord-';
const GLOBAL_PREFIX = 'chronology-v2-e008-glob-';

/* E008-01, E008-03, E008-09 : une seule feuille, injectée une fois par ctx.css.
   Le panneau reste un bloc en flux normal en fin de colonne : il n'ajoute aucun
   arrêt Tab, ne recouvre ni la frise ni la fiche, et reste lisible à 390×844.
   Aucune animation n'est créée ; mouvement réduit et forced-colors sont couverts. */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.55;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e008-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e008-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .e008-check,
  #${PANEL_ID} .e008-current,
  #${PANEL_ID} .e008-consistency,
  #${PANEL_ID} .e008-metric { margin: 5px 0 0; }
  #${PANEL_ID} .e008-current { color: var(--gold-bright); }
  #${PANEL_ID} .e008-check,
  #${PANEL_ID} .e008-metric { color: var(--muted-2); font-size: 9px; }
  #${PANEL_ID}[data-e008-chrono="0"] .e008-check,
  #${PANEL_ID}[data-e008-consistency="mismatch"] .e008-consistency {
    color: var(--ink); font-weight: 600;
  }
  #${PANEL_ID} .e008-index-title {
    margin: 10px 0 4px; color: var(--ink-soft);
    font-family: var(--serif); font-size: 12px; font-weight: 450;
  }
  #${PANEL_ID} .e008-index { margin: 0; padding: 0; list-style: none; }
  #${PANEL_ID} .e008-index-row { display: flex; gap: 8px; margin: 0 0 2px; }
  #${PANEL_ID} .e008-index-num {
    flex: 0 0 30px; color: var(--gold); text-align: right;
    font-variant-numeric: tabular-nums;
  }
  #${PANEL_ID} .e008-index-label { flex: 1 1 auto; min-width: 0; color: var(--muted); }

  /* E008-01 et E008-03 : badges insérés en tête de chaque carte de repère.
     Chiffres tabulaires et largeur minimale : la numérotation ne fait pas
     danser le texte quand on passe de 9 à 10 (E008-09). */
  .e008-badge {
    display: inline-flex; align-items: baseline; gap: 6px;
    margin-right: 7px; white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .e008-ordinal,
  .e008-global {
    display: inline-block; min-width: 18px;
    padding: 0 4px; border: 1px solid var(--line); border-radius: 4px;
    color: var(--gold-bright); font-size: 9px; line-height: 1.5;
    text-align: center; font-variant-numeric: tabular-nums;
  }
  .e008-ordinal::after {
    content: ' · '; color: var(--muted-2);
  }
  .e008-global { color: var(--muted-2); }

  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 9px 10px 10px; }
    #${PANEL_ID} .e008-index-num { flex-basis: 26px; }
    .e008-badge { gap: 4px; margin-right: 5px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} *, .e008-badge, .e008-ordinal, .e008-global {
      transition: none !important; animation: none !important;
    }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .e008-title,
    #${PANEL_ID} .e008-current,
    .e008-ordinal, .e008-global { color: CanvasText; }
  }
`;

let installCount = 0;

function formatYear(year) {
  return Number.isFinite(year)
    ? (year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year))
    : 'année inconnue';
}

/* E008-10 : garde d'existence pour toute ID préfixée chronology-v2-e008.
   La coque reconstruisant #app, un nœud de la rendu précédent est détaché et
   n'est pas retrouvé par getElementById : on le recrée ; s'il est retrouvé
   dans un ancien parent, on le déplace sans jamais le cloner. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* Écriture dédupliquée : aucun textContent n'est touché si le texte est déjà
   le bon, ce qui évite les mutations redondantes d'un rendu à l'autre. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function badgeIdFor(li) {
  return `${BADGE_PREFIX}${li.dataset.eventId || li.id || 'repere'}`;
}

/* E008-04 : le rang global est lu dans la progression de la passe 1, qui le
   conserve même sous filtre (chronology.js:267), puis en repli dans le bandeau
   de statut (chronology.js:255-256). L'ancrage sur la carte aria-current permet
   de déduire le rang de toutes les autres cartes affichées par simple décalage. */
function readAnchor(nodes, pattern) {
  for (const node of nodes) {
    if (!node) continue;
    const found = pattern.exec(node.textContent || '');
    if (found) return { rank: Number(found[1]), total: Number(found[2]), source: node.id };
  }
  return null;
}

register('E008', ctx => {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(MAIN_ID) || ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e008-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);
  panel.setAttribute('lang', 'fr');

  const title = make('h2', 'e008-title', 'Numérotation ordonnée des repères');
  title.id = TITLE_ID;
  const lede = make('p', 'e008-lede', 'Chaque repère porte son numéro d’ordre, son rang dans l’ère et son rang global. Tout est calculé depuis la frise rendue : la numérotation ne invente aucune date et ne dépend d’aucun tirage aléatoire.');
  const check = make('p', 'e008-check');
  check.id = CHECK_ID;
  const current = make('p', 'e008-current');
  current.id = CURRENT_ID;
  const consistency = make('p', 'e008-consistency');
  consistency.id = CONSISTENCY_ID;
  const indexTitle = make('h3', 'e008-index-title', 'Index numéroté des repères affichés');
  indexTitle.id = INDEX_TITLE_ID;
  const index = make('ol', 'e008-index');
  index.id = INDEX_ID;
  index.setAttribute('aria-label', 'Index numéroté des repères affichés');
  const metric = make('p', 'e008-metric');
  metric.id = METRIC_ID;
  panel.replaceChildren(title, lede, check, current, consistency, indexTitle, index, metric);

  /* E008-05 et E008-09 : l'état de préférence est exposé en texte et en
     attribut ; le CSS neutralise toute transition dès que le mouvement est
     réduit, sans qu'aucune animation n'ait été créée par la lentille. */
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  panel.dataset.e008Base = '1';
  panel.dataset.e008Tabular = '1';
  panel.dataset.e008Reduced = reduced ? '1' : '0';
  panel.dataset.e008Installs = String(installCount);
  panel.dataset.e008Css = CSS_ID;

  const list = document.getElementById(EVENTS_ID);
  const status = document.getElementById(STATUS_ID);
  const progress = document.getElementById(PROGRESS_ID);
  const aside = document.getElementById(ASIDE_ID);

  if (!list) {
    write(check, 'Aucune liste de repères dans cette vue : la numérotation n’a rien à ordonner.');
    write(current, 'Repère courant : non déterminé.');
    write(consistency, 'Cohérence frise / fiche : non vérifiable sans liste.');
    index.replaceChildren();
    write(metric, `Greffon installé ${installCount} fois · feuille « ${CSS_ID} » · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);
    panel.dataset.e008Chrono = 'na';
    panel.dataset.e008Current = 'na';
    panel.dataset.e008Consistency = 'na';
    panel.dataset.e008GlobalSource = 'na';
    return;
  }

  const items = Array.from(list.children).filter(
    (node) => node.tagName === 'LI' && node.querySelector('.event-card')
  );

  if (!items.length) {
    write(check, 'Aucun repère affiché : la numérotation est vide, pas erronée.');
    write(current, 'Repère courant : aucun dans la frise affichée.');
    write(consistency, 'Cohérence frise / fiche : sans objet, aucun repère affiché.');
    index.replaceChildren();
    panel.dataset.e008Chrono = 'na';
    panel.dataset.e008Current = 'na';
    panel.dataset.e008Consistency = 'na';
    panel.dataset.e008GlobalSource = 'na';
    write(metric, `Greffon installé ${installCount} fois · feuille « ${CSS_ID} » · 0 repère numéroté · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);
    return;
  }

  const anchors = [progress, status];
  const globalAnchor = readAnchor(anchors, /rang global\s+(\d+)\s*\/\s*(\d+)/i);
  const eraAnchor = readAnchor(anchors, /repère\s+(\d+)\s*\/\s*(\d+)\s+dans l'ère/i);
  panel.dataset.e008GlobalSource = globalAnchor ? globalAnchor.source : 'fallback';

  const currentLi = list.querySelector('.event-card[aria-current="true"]')
    ? list.querySelector('.event-card[aria-current="true"]').closest('li')
    : null;
  const currentIndex = currentLi ? items.indexOf(currentLi) : -1;

  /* E008-02 : l'ordre de la liste est comparé à l'ordre des années issues de
     data-year. Un désaccord est signalé en texte, jamais masqué par la couleur
     seule (chronology.js:381 pose data-year sur chaque li). */
  const years = items.map((li) => Number(li.dataset.year));
  let inversions = 0;
  for (let i = 1; i < years.length; i += 1) {
    if (years[i] < years[i - 1]) inversions += 1;
  }
  panel.dataset.e008Chrono = inversions === 0 ? '1' : '0';
  write(check, inversions === 0
    ? `Ordre chronologique vérifié : ${items.length} repères, de ${formatYear(years[0])} à ${formatYear(years[years.length - 1])} (années non décroissantes).`
    : `Attention : ${inversions} inversion(s) d’années dans l’affichage ; la numérotation suit l’ordre de la liste, pas l’ordre des dates.`);

  const eraCounts = new Map();
  items.forEach((li) => {
    const key = li.dataset.eraId || 'sans-ere';
    eraCounts.set(key, (eraCounts.get(key) || 0) + 1);
  });

  const ranks = new Map();

  items.forEach((li, index) => {
    const card = li.querySelector('.event-card');
    const shift = currentIndex >= 0 ? index - currentIndex : 0;
    const eraKey = li.dataset.eraId || 'sans-ere';
    const eraTotal = eraAnchor ? eraAnchor.total : (eraCounts.get(eraKey) || items.length);
    const eraRank = eraAnchor
      ? eraAnchor.rank + shift
      : items.slice(0, index + 1).filter((candidate) => (candidate.dataset.eraId || 'sans-ere') === eraKey).length;
    const globalTotal = globalAnchor ? globalAnchor.total : items.length;
    const globalRank = globalAnchor ? globalAnchor.rank + shift : index + 1;
    ranks.set(li, { eraRank, eraTotal, globalRank, globalTotal });

    /* E008-01 : badge de numéro d'ordre, dérivé de la position réelle dans la
       liste. E008-03 : second badge pour le rang global, distinct du rang dans
       l'ère. Les deux sont des textes visibles, pas des images ni du CSS pur. */
    if (card) {
      const badgeId = badgeIdFor(li);
      let badge = document.getElementById(badgeId);
      if (!badge) {
        badge = make('span', 'e008-badge');
        badge.id = badgeId;
      }
      const ordId = `${ORD_PREFIX}${li.dataset.eventId || index + 1}`;
      const globId = `${GLOBAL_PREFIX}${li.dataset.eventId || index + 1}`;
      const ordinal = ensureNode(make, ordId, 'span', 'e008-ordinal', badge);
      const globalNode = ensureNode(make, globId, 'span', 'e008-global', badge);
      write(ordinal, String(eraRank));
      write(globalNode, `#${globalRank}/${globalTotal}`);
      ordinal.setAttribute('aria-hidden', 'true');
      globalNode.setAttribute('aria-hidden', 'true');
      ordinal.title = `Rang ${eraRank} sur ${eraTotal} dans l'ère ${eraKey}`;
      globalNode.title = `Rang global ${globalRank} sur ${globalTotal} dans le pays`;
      badge.dataset.e008Ordinal = String(eraRank);
      badge.dataset.e008GlobalRank = String(globalRank);
      badge.dataset.e008Era = eraKey;
      if (card.firstElementChild !== badge) card.prepend(badge);
    }

    /* E008-07 : position explicite dans la liste sémantique. aria-posinset et
       aria-setsize décrivent la liste affichée ; le badge global décrit, lui,
       le pays entier. Les deux numérotations sont distinctes mais cohérentes. */
    li.setAttribute('aria-posinset', String(index + 1));
    li.setAttribute('aria-setsize', String(items.length));
    li.dataset.e008Ordinal = String(eraRank);
    li.dataset.e008GlobalRank = String(globalRank);
  });

  /* E008-06 : table des matières numérotée, en texte seul, sans lien ni bouton :
     elle n'ajoute aucun arrêt Tab et ne détourne aucune navigation (E038). */
  const rows = items.map((li) => {
    const info = ranks.get(li);
    const row = make('li', 'e008-index-row');
    const num = make('span', 'e008-index-num', `${info.globalRank}.`);
    const labelText = li.querySelector('.event-card strong')?.textContent || 'Repère sans titre';
    const label = make('span', 'e008-index-label', `${labelText} (${formatYear(Number(li.dataset.year))})`);
    row.append(num, label);
    return row;
  });
  index.replaceChildren(...rows);

  /* E008-05 : le numéro du repère courant est resté lisible même quand la
     carte courante est hors écran ; il est déduit de aria-current et des rangs
     calculés ci-dessus, sans écriture dans une région live. */
  if (currentLi && ranks.has(currentLi)) {
    const info = ranks.get(currentLi);
    write(current, `Repère courant : ${info.globalRank} / ${info.globalTotal} · rang ${info.eraRank} / ${info.eraTotal} dans l'ère.`);
    panel.dataset.e008Current = String(info.globalRank);
  } else {
    write(current, 'Repère courant : aucun repère marqué aria-current dans la frise.');
    panel.dataset.e008Current = 'na';
  }

  /* E008-08 : contrôle de cohérence entre la numérotation de la frise (badge
     global de la carte courante) et celle de la fiche (chronology.js:421). */
  let asideRank = null;
  if (aside) {
    const kicker = aside.querySelector('.aside-kicker');
    const found = /Repère\s+(\d+)\s*\/\s*(\d+)/i.exec(kicker?.textContent || '');
    if (found) asideRank = { rank: Number(found[1]), total: Number(found[2]) };
  }
  if (asideRank && currentLi && ranks.has(currentLi)) {
    const info = ranks.get(currentLi);
    const ok = asideRank.rank === info.globalRank && asideRank.total === info.globalTotal;
    panel.dataset.e008Consistency = ok ? 'ok' : 'mismatch';
    write(consistency, ok
      ? `Numérotation cohérente : la frise et la fiche annoncent toutes deux le repère ${asideRank.rank} / ${asideRank.total}.`
      : `Divergence constatée : frise ${info.globalRank}/${info.globalTotal}, fiche ${asideRank.rank}/${asideRank.total}.`);
  } else {
    panel.dataset.e008Consistency = 'na';
    write(consistency, 'Cohérence frise / fiche : NON vérifiable en l’absence de repère courant.');
  }

  /* E008-10 : bilan d'idempotence, lisible sans outil de développement. */
  write(metric, `Greffon installé ${installCount} fois · feuille CSS unique « ${CSS_ID} » · ${items.length} repères numérotés · base 1 · chiffres tabulaires · mouvement réduit : ${reduced ? 'oui' : 'non'} · aucun timer, réseau ou aléa.`);
});
