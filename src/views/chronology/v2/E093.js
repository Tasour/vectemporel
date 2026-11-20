import { register } from './registry.js';

/* Lentille E093 — passe V2, domaine J (Pédagogie & narration).
 * Thème : « les familles de points en carte illustrative » (themes.json:103).
 *
 * Dix chantiers uniques et non chevauchants, chacun avec un effet DOM/CSS observable :
 *  E093-01 carte sémantique (région + liste) ;
 *  E093-02 signal non coloré par famille (glyphe + forme) ;
 *  E093-03 comptage dérivé du DOM ;
 *  E093-04 libellés normalisés + glossaire ;
 *  E093-05 types de points par famille ;
 *  E093-06 axe d'échelle local → global ;
 *  E093-07 exemple illustré par famille ;
 *  E093-08 ancre d'aller-retour vers la frise ;
 *  E093-09 alternative textuelle complète sans CSS ;
 *  E093-10 mouvement réduit, impression et idempotence multi-rendus.
 *
 * Fichier possédé : src/views/chronology/v2/E093.js uniquement. Lectures seules :
 * src/views/chronology/E049.js et UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md.
 * Aucun fichier partagé (registry.js, index.js, styles.css, src/views/chronology.js)
 * n'est modifié, aucune autre lentille n'est touchée.
 *
 * Contrat exploité : ctx.viewId, ctx.stage, ctx.layout, ctx.css, ctx.el,
 * ctx.reducedMotion. Invariants : un seul register('E093', install), un seul
 * ctx.css('chronology-v2-e093', …), tous les IDs préfixés chronology-v2-e093-,
 * gardes d'existence (idempotence multi-rendus), zéro journalisation réseau,
 * zéro aléa, zéro HTML brut, zéro timer, zéro écouteur ni écriture live.
 * Le contenu est explicitement « illustratif » : aucune donnée historique n'est
 * inventée, seuls les comptages sont dérivés du DOM réel.
 */

const CSS_ID = 'chronology-v2-e093';
const MAP_ID = 'chronology-v2-e093-map';
const TITLE_ID = 'chronology-v2-e093-title';
const LEDE_ID = 'chronology-v2-e093-lede';
const GLOSSARY_ID = 'chronology-v2-e093-glossary';
const LIST_ID = 'chronology-v2-e093-family-list';
const SCALE_ID = 'chronology-v2-e093-scale';
const ALT_ID = 'chronology-v2-e093-alt';
const SUMMARY_ID = 'chronology-v2-e093-alt-summary';
const ALT_BODY_ID = 'chronology-v2-e093-alt-body';
const META_ID = 'chronology-v2-e093-meta';
const MAIN_ID = 'atlas-chrono-main';

/* Une seule feuille CSS (E093-01, -02, -06, -08, -09, -10), portée par #MAP. */
const CSS = `
  #${MAP_ID} {
    margin: 18px 0 0; padding: 12px 14px 14px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${MAP_ID} .e093-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 15px; font-weight: 600;
  }
  #${MAP_ID} .e093-lede { margin: 0 0 8px; color: var(--muted); }
  #${MAP_ID} .e093-glossary {
    margin: 0 0 10px; padding: 8px 10px;
    border: 1px solid var(--line); border-radius: 8px;
  }
  #${MAP_ID} .e093-term { color: var(--gold-bright); font-weight: 600; }
  #${MAP_ID} .e093-def { margin: 0 0 4px; color: var(--muted); }
  #${MAP_ID} .e093-list {
    list-style: none; margin: 0 0 10px; padding: 0;
    display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 8px;
  }
  #${MAP_ID} .e093-card {
    padding: 8px 9px; border: 1px solid var(--line);
    border-radius: 8px; background: rgba(255,255,255,.02);
  }
  #${MAP_ID} .e093-card-head { display: flex; align-items: center; gap: 8px; }
  #${MAP_ID} .e093-glyph {
    flex: 0 0 26px; width: 26px; height: 26px;
    display: inline-flex; align-items: center; justify-content: center;
    border: 2px solid var(--gold); border-radius: 4px;
    color: var(--gold-bright); font-size: 14px; line-height: 1;
  }
  /* E093-02 : la forme diffère par le style de bordure et l'arrondi, jamais par la couleur. */
  #${MAP_ID} .e093-card[data-e093-forme="losange"] .e093-glyph { border-style: double; border-radius: 2px; }
  #${MAP_ID} .e093-card[data-e093-forme="flèche"] .e093-glyph { border-radius: 2px 12px 2px 12px; }
  #${MAP_ID} .e093-card[data-e093-forme="grille"] .e093-glyph { border-style: dashed; border-radius: 2px; }
  #${MAP_ID} .e093-card[data-e093-forme="étoile"] .e093-glyph { border-radius: 50%; }
  #${MAP_ID} .e093-card[data-e093-forme="cercle"] .e093-glyph { border-style: dotted; border-radius: 50%; }
  #${MAP_ID} .e093-family-name { margin: 0; color: var(--gold-bright); font-size: 12px; }
  #${MAP_ID} .e093-form,
  #${MAP_ID} .e093-example { margin: 5px 0 0; color: var(--muted); }
  #${MAP_ID} .e093-count { margin: 5px 0 0; color: var(--gold-bright); }
  #${MAP_ID} .e093-types-title { margin: 5px 0 2px; color: var(--muted); }
  #${MAP_ID} .e093-types { margin: 0; padding-left: 16px; color: var(--muted); }
  #${MAP_ID} .e093-types li { margin: 1px 0; }
  #${MAP_ID} .e093-scale { margin: 5px 0 0; color: var(--muted-2); }
  /* E093-08 : ancre native, cible tactile et focus visible. */
  #${MAP_ID} .e093-anchor {
    display: inline-block; margin-top: 6px; padding: 5px 8px;
    border: 1px solid var(--line-strong); border-radius: 5px;
    color: var(--gold-bright); text-decoration: none;
  }
  #${MAP_ID} .e093-anchor:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
  /* E093-06 : axe d'échelle lisible sans dépendre d'un dégradé de couleur. */
  #${MAP_ID} .e093-scale-axis {
    margin: 0 0 10px; padding: 8px 10px;
    border: 1px dashed var(--line); border-radius: 8px;
  }
  #${MAP_ID} .e093-scale-level {
    display: inline-flex; margin: 0 8px 4px 0; padding: 2px 7px;
    border: 1px solid var(--line); border-radius: 12px; color: var(--muted);
  }
  /* E093-09 : alternative textuelle dépliée au clavier. */
  #${MAP_ID} .e093-alt { margin-top: 8px; }
  #${MAP_ID} .e093-alt summary { cursor: pointer; color: var(--gold-bright); padding: 4px 0; }
  #${MAP_ID} .e093-alt p { margin: 4px 0; color: var(--muted); }
  #${MAP_ID} .e093-meta {
    margin: 8px 0 0; color: var(--muted-2); font-size: 9px;
  }
  @media (max-width: 620px) {
    #${MAP_ID} .e093-list { grid-template-columns: 1fr; }
    #${MAP_ID} .e093-glyph { flex-basis: 22px; width: 22px; height: 22px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${MAP_ID}, #${MAP_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${MAP_ID}, #${MAP_ID} .e093-card,
    #${MAP_ID} .e093-glossary, #${MAP_ID} .e093-scale-axis {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    #${MAP_ID} .e093-title, #${MAP_ID} .e093-glyph,
    #${MAP_ID} .e093-anchor, #${MAP_ID} .e093-count,
    #${MAP_ID} .e093-alt summary { color: CanvasText; }
  }
  @media print {
    #${MAP_ID} { border: 1px solid #000; background: #fff; color: #000; }
    #${MAP_ID} .e093-alt > div { display: block !important; }
    #${MAP_ID} .e093-anchor { display: none; }
  }
`;

/* Taxonomie pédagogique illustrative (E093-02, -05, -06, -07). Les exemples sont
   des cas d'école explicites, pas des faits historiques assertés. */
const FAMILIES = [
  {
    key: 'evenement', label: 'Événement', glyph: '◆', forme: 'losange', echelle: 'locale',
    types: ['bataille', 'traité', 'découverte'],
    exemple: 'Un traité signé à une date précise et localisé en un lieu.',
  },
  {
    key: 'processus', label: 'Processus', glyph: '➤', forme: 'flèche', echelle: 'régionale',
    types: ['migration', 'industrialisation', 'urbanisation'],
    exemple: 'Une urbanisation étalée sur plusieurs décennies.',
  },
  {
    key: 'structure', label: 'Structure', glyph: '▦', forme: 'grille', echelle: 'globale',
    types: ['institution', 'réseau', 'empire'],
    exemple: 'Un réseau commercial reliant plusieurs continents.',
  },
  {
    key: 'idee', label: 'Idée', glyph: '✦', forme: 'étoile', echelle: 'globale',
    types: ['doctrine', 'courant', 'invention'],
    exemple: 'Une doctrine diffusée loin de son lieu de naissance.',
  },
  {
    key: 'silence', label: 'Silence', glyph: '○', forme: 'cercle', echelle: 'locale',
    types: ['lacune', 'oubli', 'source manquante'],
    exemple: 'Une période sans source conservée : le vide est une donnée.',
  },
];

const SCALES = ['locale', 'régionale', 'globale'];

/* E093-04 : définitions données à la première occurrence des termes. */
const GLOSSARY = [
  ['Famille de points', 'Regroupement de repères qui partagent la même nature : événement, processus, structure, idée ou silence.'],
  ['Repère', 'Marqueur daté de la frise qui porte un ou plusieurs points.'],
  ['Confiance', 'Degré de certitude attaché à un point, indépendamment de sa couleur.'],
];

let installCount = 0;

/* E093-10 : garde d'existence. La coque reconstruisant #app, un nœud de la
   rendu précédent est détaché : getElementById ne le retrouve pas et on le
   crée ; s'il est retrouvé dans le nouveau parent, on le réutilise et on le
   replace sans jamais le cloner. */
function ensureNode(make, id, tag, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tag, className);
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

function normalizeLabel(label) {
  const raw = String(label || '').trim();
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : '';
}

/* E093-03 : comptage dérivé du DOM réel, dédupliqué. Aucun chiffre codé en dur. */
function countFamily(key) {
  const found = new Set();
  const selectors = [`[data-family="${key}"]`, `.point-family-${key}`, `[data-point-family="${key}"]`];
  selectors.forEach((selector) => {
    try {
      document.querySelectorAll(selector).forEach((node) => found.add(node));
    } catch (_erreur) {
      /* Sélecteur non pris en charge : on conserve le décompte partiel. */
    }
  });
  return found.size;
}

function install(ctx) {
  if (!ctx || typeof document === 'undefined') return;

  const viewId = typeof ctx.viewId === 'string' && ctx.viewId ? ctx.viewId : 'chronologyv2';
  const stage = ctx.stage == null ? '' : String(ctx.stage);
  const make = (tag, className, text) => {
    let node;
    if (typeof ctx.el === 'function') {
      node = ctx.el(tag, className, text);
    }
    if (!node || !node.nodeType) {
      node = document.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
    }
    if (className && !node.className) node.className = className;
    if (text != null && node.textContent !== text) node.textContent = text;
    return node;
  };

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(MAIN_ID)
    || (ctx.layout && ctx.layout.nodeType === 1 ? ctx.layout : null)
    || document.body;
  if (!host) return;

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;

  /* E093-01 : une seule région sémantique, avec titre et liste. */
  const map = ensureNode(make, MAP_ID, 'section', 'e093-map', host);
  map.setAttribute('role', 'region');
  map.setAttribute('aria-labelledby', TITLE_ID);
  setData(map, 'e093ViewId', viewId);
  setData(map, 'e093Stage', stage);
  setData(map, 'e093Installs', String(installCount));
  setData(map, 'e093Reduced', reduced ? '1' : '0');

  const title = make('h2', 'e093-title', 'Carte illustrative des familles de points');
  title.id = TITLE_ID;
  const lede = make(
    'p', 'e093-lede',
    'Cette carte range les repères par famille. Chaque famille est reconnaissable à un glyphe et à une forme, jamais à la seule couleur. Les comptages proviennent du DOM ; les exemples sont illustratifs.'
  );
  lede.id = LEDE_ID;

  /* E093-04 : glossaire en <dl>, definitions données au premier terme. */
  const glossary = ensureNode(make, GLOSSARY_ID, 'dl', 'e093-glossary', map);
  const glossaryParts = [];
  GLOSSARY.forEach(([term, definition]) => {
    glossaryParts.push(make('dt', 'e093-term', term), make('dd', 'e093-def', definition));
  });
  glossary.replaceChildren(...glossaryParts);

  /* E093-06 : axe d'échelle, alimenté pendant la construction des cartes. */
  const perScale = {};
  SCALES.forEach((level) => { perScale[level] = 0; });

  const mainEl = document.getElementById(MAIN_ID);
  const defaultHref = mainEl && mainEl.id ? `#${mainEl.id}` : '#';
  const cards = [];
  const altParas = [];
  let totalDetected = 0;

  FAMILIES.forEach((famille) => {
    const count = countFamily(famille.key);
    totalDetected += count;
    perScale[famille.echelle] += 1;

    const card = make('li', 'e093-card');
    setData(card, 'e093Family', famille.key);
    setData(card, 'e093Forme', famille.forme);
    setData(card, 'e093Scale', famille.echelle);
    setData(card, 'e093Count', String(count));

    const head = make('div', 'e093-card-head');
    const glyph = make('span', 'e093-glyph', famille.glyph);
    glyph.setAttribute('aria-hidden', 'true');
    head.append(glyph, make('h3', 'e093-family-name', normalizeLabel(famille.label)));

    const form = make(
      'p', 'e093-form',
      `Forme distinctive : ${famille.forme} (la forme et le glyphe, jamais la seule couleur).`
    );
    const countText = count === 0
      ? `Points détectés dans la vue : 0 — aucun repère de cette famille n'est marqué dans le DOM.`
      : `Points détectés dans la vue : ${count}.`;
    const countLine = make('p', 'e093-count', countText);

    const typesTitle = make('p', 'e093-types-title', 'Types de points :');
    const types = make('ul', 'e093-types');
    famille.types.forEach((type) => types.appendChild(make('li', 'e093-type', type)));

    const scaleLine = make('p', 'e093-scale', `Portée : ${famille.echelle}.`);
    const example = make('p', 'e093-example', `Exemple illustratif : ${famille.exemple}`);

    /* E093-08 : ancre native, clavier-first, sans gestionnaire JS. */
    let href = defaultHref;
    try {
      const cible = document.querySelector(`[data-family="${famille.key}"]`);
      if (cible && cible.id) href = `#${cible.id}`;
    } catch (_erreur) {
      /* On garde l'ancre vers la frise. */
    }
    const anchor = make('a', 'e093-anchor', 'Aller à la frise →');
    anchor.setAttribute('href', href);
    anchor.setAttribute('aria-label', `Aller à la frise — famille ${famille.label}`);

    card.append(head, form, countLine, typesTitle, types, scaleLine, example, anchor);
    cards.push(card);

    altParas.push(make(
      'p', 'e093-alt-item',
      `Famille ${famille.label} : forme ${famille.forme}, ${count} point(s) détecté(s), portée ${famille.echelle}. Types : ${famille.types.join(', ')}. Exemple : ${famille.exemple}`
    ));
  });

  const list = ensureNode(make, LIST_ID, 'ul', 'e093-list', map);
  list.replaceChildren(...cards);

  const scaleAxis = ensureNode(make, SCALE_ID, 'div', 'e093-scale-axis', map);
  setData(scaleAxis, 'e093ScaleSummary', SCALES.map((level) => `${level}:${perScale[level]}`).join('|'));
  const scaleLevels = SCALES.map((level) => make(
    'span', 'e093-scale-level', `${level} — ${perScale[level]} famille(s)`
  ));
  scaleAxis.replaceChildren(...scaleLevels);

  /* E093-09 : alternative textuelle complète, visible même sans CSS. */
  const alt = ensureNode(make, ALT_ID, 'details', 'e093-alt', map);
  const summary = ensureNode(make, SUMMARY_ID, 'summary', 'e093-alt-summary', alt);
  write(summary, 'Lire la carte en texte (sans mise en forme)');
  const altBody = ensureNode(make, ALT_BODY_ID, 'div', 'e093-alt-body', alt);
  altBody.replaceChildren(...altParas);
  if (alt.firstElementChild !== summary) alt.insertBefore(summary, alt.firstElementChild);

  /* E093-10 : état du greffon en texte lisible + data-attributes de contrôle. */
  const meta = ensureNode(make, META_ID, 'p', 'e093-meta', map);
  write(
    meta,
    `Carte pédagogique — ${FAMILIES.length} familles illustrées, ${totalDetected} point(s) détecté(s) dans le DOM, vue ${viewId}, étape ${stage || '—'}, installations : ${installCount}, mouvement réduit : ${reduced ? 'oui' : 'non'}.`
  );

  map.replaceChildren(title, lede, glossary, scaleAxis, list, alt, meta);
}

register('E093', install);
