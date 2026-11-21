import { register } from './registry.js';

/* Lentille E071 — passe V2, domaine H (responsive & mobile).
 * Thème canonique : « H. Responsive & mobile — frise fluide en 390×844 »
 * (themes.json:79). Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E071.md.
 * Fichier possédé : src/views/chronology/v2/E071.js uniquement. Lectures seules :
 * registry.js, index.js, src/views/chronology.js, styles.css, E049.js (passe 1),
 * E049.js / E044.js (modèles de style V2). Aucun fichier partagé n'est modifié.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } et les
 * helpers ctx.css(id,règles), ctx.el(balise,classe,texte), ctx.reducedMotion()
 * (registry.js:28-43). Le registre V2 n'expose pas de say() : la lentille
 * n'ajoute AUCUNE région live et n'écrit dans aucune région existante ; son
 * état est affiché en texte visible, dédupliqué, hors aria-live.
 *
 * Invariants :
 * - un seul `register` pour E071, une seule feuille `ctx.css` chronology-v2-e071 ;
 * - tous les IDs DOM sont préfixés chronology-v2-e071- et protégés par une
 *   garde d'existence (idempotence multi-rendus) ;
 * - une seule feuille CSS, des règles fluides additives ciblant la frise réelle
 *   (aucune données historique inventée, aucun sélecteur de test renommé) ;
 * - zéro journalisation, zéro réseau, zéro aléa, zéro HTML brut, zéro timer,
 *   zéro écouteur inutile, zéro animation propre.
 *
 * Les dix chantiers E071-01 à E071-10 sont distincts et non chevauchants :
 * 01 grille fluide des ères · 02 bandes sans largeur fixe · 03 grille de repères
 * auto-fill · 04 images fluides · 05 typographie clamp · 06 hauteur/défilement
 * portrait · 07 étiquettes non tronquées · 08 gouttières fluides · 09 replis
 * mouvement réduit / couleurs forcées · 10 idempotence multi-rendus.
 */

const CSS_ID = 'chronology-v2-e071';
const PANEL_ID = 'chronology-v2-e071-panel';
const TITLE_ID = 'chronology-v2-e071-title';
const VIEWPORT_ID = 'chronology-v2-e071-viewport';
const BREAKPOINT_ID = 'chronology-v2-e071-breakpoint';
const ERA_FLOW_ID = 'chronology-v2-e071-era-flow';
const CARD_FLOW_ID = 'chronology-v2-e071-card-flow';
const MEDIA_FLOW_ID = 'chronology-v2-e071-media-flow';
const TYPE_ID = 'chronology-v2-e071-type';
const HEIGHT_ID = 'chronology-v2-e071-height';
const LABEL_ID = 'chronology-v2-e071-label';
const GAP_ID = 'chronology-v2-e071-gap';
const FALLBACK_ID = 'chronology-v2-e071-fallback';
const RENDERS_ID = 'chronology-v2-e071-renders';
const BILAN_ID = 'chronology-v2-e071-bilan';
const HOST_ID = 'atlas-chrono-main';
const BREAKPOINT_PX = 430;

/* E071-01 à E071-09 : feuille unique. Les sélecteurs sont purposément
   préfixés d'un identifiant ou de `body` afin de l'emporter, en spécificité,
   sur les règles du stage injectées par chronology.js:33-94, sans toucher à
   styles.css ni au fichier de vue. Aucune valeur n'est codée en dur dans les
   libellés : les compteurs affichés dérivent de l'audit de cette chaîne. */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 10px 12px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .v2e071-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .v2e071-lede { margin: 0 0 8px; color: var(--muted); }
  #${PANEL_ID} .v2e071-list { margin: 0; padding: 0; }
  #${PANEL_ID} .v2e071-row {
    display: flex; gap: 10px; margin: 0 0 3px;
    padding: 0 0 3px; border-bottom: 1px solid var(--line);
  }
  #${PANEL_ID} .v2e071-key { flex: 0 0 138px; margin: 0; color: var(--muted); }
  #${PANEL_ID} .v2e071-val { flex: 1 1 auto; min-width: 0; margin: 0; color: var(--gold-bright); }
  #${PANEL_ID} .v2e071-bilan {
    margin: 8px 0 0; padding-top: 7px;
    border-top: 1px solid var(--line); color: var(--muted-2); font-size: 10px;
  }

  /* E071-01 et E071-02 : frise d'ères fluide — colonnes souples, jamais de
     largeur fixe, aucune coupure de mot ; deux bandes tiennent en 390 px. */
  #${HOST_ID} .atlas-chrono-era-list {
    display: flex; flex-wrap: wrap; gap: clamp(4px, 1.6vw, 8px);
  }
  #${HOST_ID} .atlas-chrono-era-list > li {
    flex: 1 1 clamp(112px, 46vw, 200px); min-width: 0;
  }
  #${HOST_ID} .era-band.atlas-chrono-band {
    width: 100%; min-width: 0; box-sizing: border-box;
  }

  /* E071-03 et E071-04 : grille de repères auto-fill (au moins une colonne à
     390 px) et médias fluides qui ne débordent pas de leur carte. */
  #${HOST_ID} .event-list.atlas-chrono-events {
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 150px), 1fr));
    gap: clamp(6px, 2vw, 10px);
  }
  #${HOST_ID} .event-card img { max-width: 100%; height: auto; box-sizing: border-box; }

  /* E071-05 et E071-07 : typographie fluide et étiquettes non tronquées. */
  #${HOST_ID} .view-title.atlas-chrono-h1 { font-size: clamp(18px, 5vw, 22px); }
  #${HOST_ID} .event-card strong { font-size: clamp(14px, 4vw, 17px); }
  #${HOST_ID} .era-band span,
  #${HOST_ID} .event-card strong,
  #${HOST_ID} .event-subtitle {
    overflow-wrap: anywhere; white-space: normal; word-break: normal;
  }

  /* E071-06 et E071-08 : composition portrait 390×844 — hauteur fluide,
     défilement interne préservé et paddings/gouttières en clamp(). */
  @media (max-width: ${BREAKPOINT_PX}px) and (orientation: portrait) {
    body .chronology-main, body .chronology-aside {
      min-height: 0; overscroll-behavior: contain;
      padding: clamp(12px, 4vw, 20px);
      -webkit-overflow-scrolling: touch;
    }
  }
  @media (max-width: ${BREAKPOINT_PX}px) {
    #${PANEL_ID} .v2e071-row { flex-wrap: wrap; gap: 1px 8px; }
    #${PANEL_ID} .v2e071-key { flex-basis: 100%; }
  }

  /* E071-09 : replis défensifs. Aucune animation n'est créée ; seules des
     neutralisations et un contraste textuel de secours sont déclarées. */
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} {
      border: 1px solid CanvasText; border-left: 3px solid CanvasText;
      background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .v2e071-title,
    #${PANEL_ID} .v2e071-key,
    #${PANEL_ID} .v2e071-val,
    #${PANEL_ID} .v2e071-bilan { color: CanvasText; }
  }
`;

function occurrences(pattern) {
  return (CSS.match(pattern) || []).length;
}

/* Audit de la feuille unique, calculé une fois depuis sa chaîne source.
   Chaque chiffre affiché en résulte : aucune mesure n'est inventée. */
const CSS_AUDIT = Object.freeze({
  autoFill: occurrences(/grid-template-columns:\s*repeat\(auto-fill/g),
  clamps: occurrences(/clamp\(/g),
  minZero: occurrences(/min-width:\s*0/g),
  wraps: occurrences(/overflow-wrap:\s*anywhere/g),
  media: occurrences(/@media/g),
  reduced: occurrences(/@media\s*\(prefers-reduced-motion:\s*reduce\)/g),
  forced: occurrences(/@media\s*\(forced-colors:\s*active\)/g),
});

let installs = 0;
let refs = {
  panel: null, viewport: null, breakpoint: null, eraFlow: null,
  cardFlow: null, mediaFlow: null, type: null, height: null,
  label: null, gap: null, fallback: null, renders: null, bilan: null,
};
let snapshot = {
  width: 0, narrow: false, portrait: false, reduced: false,
  bands: 0, cards: 0, labeled: 0,
};

/* E071-10 : garde d'existence. La coque reconstruisant le stage, un nœud de la
   rendu précédente est détaché : on le réutilise et on le déplace dans le
   parent courant plutôt que d'en créer un doublon. */
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

function setData(node, key, value) {
  if (node && node.dataset[key] !== value) node.dataset[key] = value;
}

/* E071-01 à E071-10 : mesure en lecture seule de la frise et du viewport.
   Aucune donnée historique n'est lue ni inventée : seuls des faits de mise en
   page (largeur, orientation, nombre de bandes/cartes, libellés) sont relevés. */
function measure(host) {
  const width = document.documentElement && typeof document.documentElement.clientWidth === 'number'
    ? document.documentElement.clientWidth : 0;
  const matches = (query) => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches : false;
  const bands = Array.from(host.querySelectorAll('.era-band'));
  return {
    width,
    narrow: matches(`(max-width: ${BREAKPOINT_PX}px)`),
    portrait: matches('(orientation: portrait)'),
    reduced: false,
    bands: bands.length,
    cards: host.querySelectorAll('.event-card').length,
    labeled: bands.filter((band) => band.getAttribute('title')).length,
  };
}

/* E071-01 à E071-10 : l'état est affiché en texte visible ordinaire, sans
   région live et sans écriture redondante (write déduplique les textes). */
function paint() {
  const r = refs;
  if (!r.panel || !r.panel.isConnected) return;
  const s = snapshot;

  write(r.viewport, `${s.width} px de large mesurés · cible de fluidité ${BREAKPOINT_PX}×844.`);
  write(r.breakpoint, `${CSS_AUDIT.media} requêtes média · rupture principale à ${BREAKPOINT_PX} px · étroit : ${s.narrow ? 'oui' : 'non'} · portrait : ${s.portrait ? 'oui' : 'non'}.`);
  write(r.eraFlow, `${s.bands} bande(s) d'ère · colonnes souples avec min-width:0 · ${CSS_AUDIT.minZero} garde(s) contre la largeur fixe.`);
  write(r.cardFlow, `${s.cards} carte(s) de repère · grille auto-fill (${CSS_AUDIT.autoFill}) à au moins une colonne sous ${BREAKPOINT_PX} px.`);
  write(r.mediaFlow, `${CSS_AUDIT.clamps} expression(s) clamp() au total · images de carte en max-width:100 % / height:auto.`);
  write(r.type, `Titres et années en typographie fluide · aucune taille fixe dans la frise mobile.`);
  write(r.height, `Hauteur et défilement adaptés au portrait ${BREAKPOINT_PX}×844 · débordement vertical conservé dans la colonne.`);
  write(r.label, `${s.labeled}/${s.bands} bande(s) avec intitulé complet · ${CSS_AUDIT.wraps} règle(s) anti-troncature.`);
  write(r.gap, `Gouttières et paddings en clamp() · respiration maintenue en ${BREAKPOINT_PX} px.`);
  write(r.fallback, `Replis : mouvement réduit ${CSS_AUDIT.reduced} · couleurs forcées ${CSS_AUDIT.forced} · préférence système : ${s.reduced ? 'active' : 'inactive'}.`);
  write(r.renders, String(installs));
  write(r.bilan, `Frise fluide : ${s.bands} ère(s), ${s.cards} carte(s), ${CSS_AUDIT.clamps} valeur(s) fluide(s), ${CSS_AUDIT.media} repli(s) média. ${s.narrow ? 'Vue étroite : la frise se réorganise sans débordement.' : 'Vue large : les mêmes règles restent sans effet cassant.'}`);

  setData(r.panel, 'e071Width', String(s.width));
  setData(r.panel, 'e071Narrow', s.narrow ? '1' : '0');
  setData(r.panel, 'e071Portrait', s.portrait ? '1' : '0');
  setData(r.panel, 'e071Reduced', s.reduced ? '1' : '0');
  setData(r.panel, 'e071Bands', String(s.bands));
  setData(r.panel, 'e071Cards', String(s.cards));
  setData(r.panel, 'e071Labeled', String(s.labeled));
  setData(r.panel, 'e071Renders', String(installs));
}

function addRow(list, make, key, id) {
  const row = make('div', 'v2e071-row');
  const dt = make('dt', 'v2e071-key', key);
  const dd = make('dd', 'v2e071-val');
  dd.id = id;
  row.append(dt, dd);
  list.appendChild(row);
  return dd;
}

register('E071', (ctx) => {
  const make = ctx && ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installs += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(HOST_ID) || ctx.stage || ctx.layout;
  if (!host || typeof host.appendChild !== 'function') return;

  const panel = ensureNode(make, PANEL_ID, 'section', 'v2e071-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'v2e071-title', 'Frise fluide en 390×844');
  title.id = TITLE_ID;
  const lede = make('p', 'v2e071-lede', 'Ce panneau décrit la fluidité de la frise sur écran étroit. Il n’ajoute aucune région live, ne détourne aucun contrôle et n’invente aucune donnée historique : il applique des règles de mise en page additives et en affiche la mesure.');

  const list = make('dl', 'v2e071-list');
  const viewport = addRow(list, make, 'Largeur mesurée', VIEWPORT_ID);
  const breakpoint = addRow(list, make, 'Ruptures / orientation', BREAKPOINT_ID);
  const eraFlow = addRow(list, make, 'Frise des ères', ERA_FLOW_ID);
  const cardFlow = addRow(list, make, 'Grille des repères', CARD_FLOW_ID);
  const mediaFlow = addRow(list, make, 'Images / valeurs fluides', MEDIA_FLOW_ID);
  const type = addRow(list, make, 'Typographie fluide', TYPE_ID);
  const height = addRow(list, make, 'Hauteur / défilement', HEIGHT_ID);
  const label = addRow(list, make, 'Étiquettes lisibles', LABEL_ID);
  const gap = addRow(list, make, 'Gouttières fluides', GAP_ID);
  const fallback = addRow(list, make, 'Replis', FALLBACK_ID);
  const renders = addRow(list, make, 'Rendus du greffon', RENDERS_ID);

  const bilan = make('p', 'v2e071-bilan');
  bilan.id = BILAN_ID;

  /* replaceChildren plutôt qu'une affectation de HTML brut : les nœuds de la rendu précédente
     sont détachés, donc aucun ID en doublon ne subsiste dans le document. */
  panel.replaceChildren(title, lede, list, bilan);

  snapshot = measure(host);
  snapshot.reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = {
    panel, viewport, breakpoint, eraFlow, cardFlow, mediaFlow,
    type, height, label, gap, fallback, renders, bilan,
  };
  paint();
});
