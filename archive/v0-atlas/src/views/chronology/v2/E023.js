import { register } from './registry.js';

/* Lentille V2 E023 — C. Détail & fiche : domaine / échelle / temps en
 * métadonnées structurées (thème « E023 » de themes.json).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E023.md — chantiers E023-01 à
 * E023-10. Fichier possédé : src/views/chronology/v2/E023.js uniquement.
 * Lectures seules : registry.js, index.js, styles.css, src/views/chronology.js,
 * src/views/chronology/E049.js et UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md.
 * Aucun fichier partagé n'est modifié, la passe 1 et les autres lentilles
 * restent intactes.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } et les
 * helpers ctx.css(id, règles), ctx.el(balise, classe, texte),
 * ctx.reducedMotion(). Le registre V2 n'expose aucun say() : la lentille
 * n'ajoute AUCUNE région live, n'écrit dans aucune région existante et rend
 * son état en texte visible, dédupliqué, hors aria-live.
 *
 * Invariants :
 * - un seul register('E023', install), un seul ctx.css('chronology-v2-e023', …) ;
 * - tous les IDs DOM sont préfixés chronology-v2-e023- et protégés par une
 *   garde d'existence (idempotence multi-rendus) ;
 * - zéro console.*, zéro fetch/XHR, zéro import distant, zéro Math.random,
 *   zéro innerHTML, zéro timer, zéro boucle rAF, zéro écouteur ;
 * - aucune date ni donnée historique n'est codée en dur : tout est dérivé du
 *   DOM (data-* ou texte visible des nœuds déjà rendus).
 */

const CSS_ID = 'chronology-v2-e023';
const PANEL_ID = 'chronology-v2-e023-panel';
const TITLE_ID = 'chronology-v2-e023-title';
const DEFS_ID = 'chronology-v2-e023-defs';
const LIST_ID = 'chronology-v2-e023-points';
const SCALE_ID = 'chronology-v2-e023-scale';
const CONTRAST_ID = 'chronology-v2-e023-contrast';
const MOTION_ID = 'chronology-v2-e023-motion';
const METRIC_ID = 'chronology-v2-e023-metric';

/* Sélecteurs tolérants : la passe 2 peut nommer différemment les points. On
   ne fait que lire et annoter, jamais renommer ni supprimer de nœud tiers. */
const POINT_SELECTOR = '[data-point-id], li.point, [data-e023-point]';
const MAX_POINTS = 24;

/* E023-01 : vocabulaire normatif des trois dimensions. Aucune donnée
   historique ici : ce sont des définitions de lecture, pas des faits. */
const DIMENSIONS = [
  { cle: 'domaine', titre: 'Domaine', description: 'Secteur ou discipline du point (politique, économie, société…), lu sur les attributs du nœud.' },
  { cle: 'echelle', titre: 'Échelle', description: 'Portée du point, du local au global, ramenée à une gradation à cinq crans.' },
  { cle: 'temps', titre: 'Temps', description: 'Ancrage temporel du point, dérivé de ses attributs ou de son texte visible.' },
];

/* E023-04 : gradation nominale de l'échelle. L'ordre est explicite et sert
   de référence chiffrée (rang 1 à 5), jamais la teinte seule. */
const NIVEAUX_ECHELLE = ['local', 'régional', 'national', 'impérial', 'global'];
const SYNONYMES_ECHELLE = {
  local: 1, locale: 1, communal: 1, municipal: 1,
  regional: 2, régional: 2, provinciale: 2, province: 2,
  national: 3, pays: 3, étatique: 3, etatique: 3,
  imperial: 4, impérial: 4, empire: 4,
  global: 5, mondial: 5, monde: 5, international: 5,
};

/* E023-02, E023-06 à E023-09 : une seule feuille. Le codage des métadonnées
   est redondant (rang chiffré + forme + mot), jamais porté par la couleur
   seule. Aucune règle ne surcharge le outline :focus-visible global. */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 12px 14px 13px;
    border: 1px solid var(--line); border-left: 4px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e023-title {
    margin: 0 0 4px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 16px; font-weight: 600;
    line-height: 1.3; letter-spacing: .01em; text-transform: none;
  }
  #${PANEL_ID} .e023-lede { margin: 0 0 10px; color: var(--muted); }
  #${PANEL_ID} .e023-dl { margin: 0 0 12px; }
  #${PANEL_ID} .e023-dl div {
    display: grid; grid-template-columns: 84px 1fr; gap: 4px 10px;
    padding: 5px 0; border-top: 1px dashed var(--line);
  }
  #${PANEL_ID} .e023-dl dt {
    color: var(--gold-bright); font-weight: 600; text-transform: none;
  }
  #${PANEL_ID} .e023-dl dd { margin: 0; color: var(--ink-soft); }
  #${PANEL_ID} .e023-list { margin: 0; padding: 0; list-style: none; }
  #${PANEL_ID} .e023-item {
    margin: 0; padding: 8px 0; border-top: 1px dashed var(--line);
  }
  #${PANEL_ID} .e023-item-head {
    display: flex; align-items: center; gap: 8px;
    color: var(--ink); font-family: var(--serif); font-size: 12px; font-weight: 600;
  }
  #${PANEL_ID} .e023-num {
    flex: 0 0 auto; min-width: 22px; padding: 1px 5px;
    border: 1px solid var(--line-strong); border-radius: 4px;
    color: var(--gold-bright); font-size: 10px; text-align: center;
  }
  #${PANEL_ID} .e023-forme {
    display: inline-block; width: 12px; height: 12px; flex: 0 0 12px;
    background: currentColor; border: 1px solid currentColor;
  }
  #${PANEL_ID} .e023-forme[data-e023-dim="domaine"] { border-radius: 50%; }
  #${PANEL_ID} .e023-forme[data-e023-dim="echelle"] {
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
  }
  #${PANEL_ID} .e023-forme[data-e023-dim="temps"] {
    transform: rotate(45deg);
  }
  #${PANEL_ID} .e023-meta {
    display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px; margin: 6px 0 0; padding: 0; list-style: none;
  }
  #${PANEL_ID} .e023-meta div {
    min-width: 0; padding: 5px 6px;
    border: 1px solid var(--line); border-radius: 6px;
  }
  #${PANEL_ID} .e023-meta dt {
    color: var(--muted-2); font-size: 9px; letter-spacing: .04em;
    text-transform: uppercase;
  }
  #${PANEL_ID} .e023-meta dd { margin: 2px 0 0; color: var(--ink); font-size: 10px; }
  #${PANEL_ID} .e023-echelle {
    display: block; height: 4px; margin: 3px 0 0;
    border-radius: 2px; background: var(--line);
  }
  #${PANEL_ID} .e023-echelle i {
    display: block; height: 100%; border-radius: 2px; background: var(--gold);
  }
  #${PANEL_ID} .e023-echelle[data-e023-level="1"] i { width: 20%; }
  #${PANEL_ID} .e023-echelle[data-e023-level="2"] i { width: 40%; }
  #${PANEL_ID} .e023-echelle[data-e023-level="3"] i { width: 60%; }
  #${PANEL_ID} .e023-echelle[data-e023-level="4"] i { width: 80%; }
  #${PANEL_ID} .e023-echelle[data-e023-level="5"] i { width: 100%; }
  #${PANEL_ID} .e023-manquant { color: var(--muted); font-style: italic; }
  #${PANEL_ID} .e023-note { margin: 8px 0 0; color: var(--muted); font-size: 10px; }
  #${PANEL_ID} .e023-scale { color: var(--gold-bright); font-size: 10px; }
  #${PANEL_ID} .e023-metric { color: var(--muted-2); font-size: 9px; }
  [data-e023-point][data-e023-annotated="1"] {
    box-shadow: inset 3px 0 0 0 var(--gold);
  }
  [data-e023-point] .e023-badge {
    display: inline-block; margin-left: 5px; padding: 0 4px;
    border: 1px solid currentColor; border-radius: 3px;
    font: inherit; font-size: 8px; white-space: nowrap;
  }
  @media (max-width: 620px) {
    #${PANEL_ID} .e023-dl div { grid-template-columns: 1fr; gap: 1px; }
    #${PANEL_ID} .e023-meta { grid-template-columns: 1fr; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
    [data-e023-point] { transition: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, [data-e023-point][data-e023-annotated="1"] {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .e023-title, #${PANEL_ID} .e023-dl dt,
    #${PANEL_ID} .e023-num, #${PANEL_ID} .e023-forme,
    #${PANEL_ID} .e023-badge, #${PANEL_ID} .e023-scale { color: CanvasText; }
    #${PANEL_ID} .e023-echelle i { background: CanvasText; }
  }
`;

let installCount = 0;
let refs = {
  panel: null, defs: null, list: null, scale: null,
  contrast: null, motion: null, metric: null, reduced: false,
};

/* E023-10 : garde d'existence pour toute ID préfixée. Un nœud déjà présent est
   réutilisé et déplacé dans le parent courant : la coque reconstruisant le
   stage, un nœud de la rendu précédente est détaché et n'est pas retrouvé par
   getElementById, mais l'idempotence reste assurée dans les deux cas. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* Écriture dédupliquée : deux rendus sans changement ne touchent aucun texte. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E023-03, E023-04, E023-05 : lecture tolérante des attributs d'une dimension.
   On essaye plusieurs noms d'attributs et on renvoie '' si rien n'est renseigné
   (jamais une valeur inventée). */
function lireAttribut(node, noms) {
  for (const nom of noms) {
    const valeur = node.getAttribute(nom);
    if (valeur && valeur.trim()) return valeur.trim();
  }
  return '';
}

/* E023-04 : normalisation de l'échelle vers un rang 1 à 5. Retourne rang 0
   et libellé « non renseigné » pour toute valeur inconnue ou absente. */
function normaliserEchelle(valeur) {
  if (!valeur) return { rang: 0, libelle: 'non renseigné' };
  const cle = valeur.toLowerCase().trim();
  if (Object.prototype.hasOwnProperty.call(SYNONYMES_ECHELLE, cle)) {
    const rang = SYNONYMES_ECHELLE[cle];
    return { rang, libelle: `${NIVEAUX_ECHELLE[rang - 1]} (${rang}/5)` };
  }
  return { rang: 0, libelle: `échelle « ${valeur} » (hors gradation)` };
}

/* E023-05 : ancrage temporel dérivé du DOM. On privilégie les attributs ; à
   défaut on repère une année à quatre chiffres dans le texte visible, en la
   signalant comme non vérifiée. Aucune date n'est codée en dur. */
function ancrerTemps(node) {
  const attribute = lireAttribut(node, ['data-year', 'data-start', 'data-date', 'data-time']);
  if (attribute) return { texte: attribute, source: 'attribut' };
  const texte = (node.textContent || '').trim();
  const correspondance = texte.match(/-?\d{4}\b/);
  if (correspondance) return { texte: `${correspondance[0]} (d'après le texte)`, source: 'texte' };
  return { texte: 'non renseigné', source: 'aucune' };
}

/* E023-01 : le glossaire est une vraie liste de définitions, lisible sans CSS. */
function renderDefs(make, defs) {
  const lignes = DIMENSIONS.map((dim) => {
    const ligne = make('div', 'e023-def');
    ligne.append(
      make('dt', 'e023-dim', dim.titre),
      make('dd', 'e023-definition', dim.description)
    );
    return ligne;
  });
  defs.replaceChildren(...lignes);
  return lignes.length;
}

/* E023-02, E023-06, E023-07, E023-08 : une fiche structurée par point, en
   <li> dans une <ol>, avec une <dl> à trois entrées. Chaque entrée porte un
   marqueur de forme (rond / triangle / losange) en plus du mot : l'information
   ne repose jamais sur la seule couleur. */
function renderPoints(make, list, points) {
  const fiches = points.map((entree, index) => {
    const { node, domaine, echelle, temps } = entree;
    const item = make('li', 'e023-item');
    item.dataset.e023Point = node.dataset.pointId || `point-${index + 1}`;

    const head = make('div', 'e023-item-head');
    head.append(
      make('span', 'e023-num', String(index + 1)),
      make('span', 'e023-titre', `Point ${index + 1}`),
      ...DIMENSIONS.map((dim) => {
        const marqueur = make('span', 'e023-forme');
        marqueur.dataset.e023Dim = dim.cle;
        marqueur.setAttribute('aria-hidden', 'true');
        return marqueur;
      })
    );

    const dl = make('dl', 'e023-meta');

    const dom = make('div', 'e023-cell');
    dom.append(make('dt', '', 'Domaine'));
    const domVal = make('dd', domaine.valeur ? '' : 'e023-manquant', domaine.valeur || 'non renseigné');
    if (!domaine.valeur) domVal.dataset.e023Missing = '1';
    dom.appendChild(domVal);

    const ech = make('div', 'e023-cell');
    ech.append(make('dt', '', 'Échelle'));
    const echVal = make('dd', '', echelle.libelle);
    const metre = make('span', 'e023-echelle');
    metre.dataset.e023Level = String(echelle.rang);
    metre.setAttribute('aria-hidden', 'true');
    metre.appendChild(make('i'));
    echVal.appendChild(metre);
    ech.appendChild(echVal);

    const tmp = make('div', 'e023-cell');
    tmp.append(make('dt', '', 'Temps'));
    const tmpVal = make('dd', temps.source === 'aucune' ? 'e023-manquant' : '', temps.texte);
    if (temps.source === 'aucune') tmpVal.dataset.e023Missing = '1';
    tmp.appendChild(tmpVal);

    dl.append(dom, ech, tmp);
    item.append(head, dl);
    return item;
  });
  list.replaceChildren(...fiches);
  return fiches.length;
}

/* E023-03, E023-04, E023-05, E023-07 : annotation en lecture seule des points
   déjà rendus. On pose des data-e023-* et un badge textuel, sans toucher au
   texte ni aux classes existantes. */
function collecterPoints(make) {
  const host = refs.panel && refs.panel.parentElement ? refs.panel.parentElement : document;
  const nœuds = Array.prototype.slice.call(host.querySelectorAll(POINT_SELECTOR), 0, MAX_POINTS);
  let annotes = 0;
  let manquants = 0;

  const fiches = nœuds.map((node) => {
    const domaine = lireAttribut(node, ['data-domain', 'data-kind', 'data-domaine']);
    const echelle = normaliserEchelle(lireAttribut(node, ['data-scale', 'data-scope', 'data-echelle']));
    const temps = ancrerTemps(node);
    if (!domaine || echelle.rang === 0 || temps.source === 'aucune') manquants += 1;

    node.dataset.e023Point = node.dataset.pointId || `point-${annotes + 1}`;
    node.dataset.e023Annotated = '1';
    node.dataset.e023Domain = domaine || 'non renseigné';
    node.dataset.e023Level = String(echelle.rang);
    node.dataset.e023Time = temps.source === 'aucune' ? 'non renseigné' : temps.texte;
    if (!domaine || temps.source === 'aucune') node.dataset.e023Missing = '1';

    if (!node.querySelector('.e023-badge')) {
      const badge = make('span', 'e023-badge', `Éch. ${echelle.rang || '—'}/5`);
      badge.setAttribute('aria-hidden', 'true');
      node.appendChild(badge);
    }
    annotes += 1;
    return { node, domaine, echelle, temps };
  });

  return { fiches, annotes, manquants, total: nœuds.length };
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css(CSS_ID, CSS);

  const host = ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e023-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e023-title', 'Métadonnées structurées — domaine, échelle, temps');
  title.id = TITLE_ID;
  const lede = make('p', 'e023-lede',
    'Lecture de la fiche : chaque point est décrit par trois métadonnées lisibles et doublées (mot, rang, forme). Aucune valeur n’est inventée : une donnée absente est dite « non renseigné ».');

  const defs = make('dl', 'e023-dl');
  defs.id = DEFS_ID;
  const nbDefs = renderDefs(make, defs);

  const points = collecterPoints(make);
  const list = make('ol', 'e023-list');
  list.id = LIST_ID;
  const nbFiches = renderPoints(make, list, points.fiches);

  const scale = make('p', 'e023-scale');
  scale.id = SCALE_ID;
  const contrast = make('p', 'e023-note e023-contrast');
  contrast.id = CONTRAST_ID;
  const motion = make('p', 'e023-note e023-motion');
  motion.id = MOTION_ID;
  const metric = make('p', 'e023-metric');
  metric.id = METRIC_ID;

  panel.replaceChildren(title, lede, defs, list, scale, contrast, motion, metric);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = { panel, defs, list, scale, contrast, motion, metric, reduced };

  write(scale, `Échelle de référence : ${NIVEAUX_ECHELLE.length} crans, du local (1/5) au global (5/5). Le rang est affiché en chiffres et doublé par la longueur de la barre.`);
  write(contrast, 'Lisibilité : forme, rang et mot doublent la teinte ; repli automatique en couleurs forcées (forced-colors: active) et à 200 % de zoom.');
  write(motion, reduced
    ? 'Mouvement réduit actif : aucune transition ni animation ne porte d’information dans ces métadonnées.'
    : 'Mouvement normal : les métadonnées restent lisibles sans animation, même si les transitions globales sont actives.');
  write(metric, `Points annotés : ${points.annotes} sur ${points.total} repérés · fiches : ${nbFiches} · définitions : ${nbDefs} · métadonnées incomplètes : ${points.manquants} · installations : ${installCount} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);

  panel.dataset.e023Defs = String(nbDefs);
  panel.dataset.e023Fiches = String(nbFiches);
  panel.dataset.e023Missing = String(points.manquants);
  panel.dataset.e023Reduced = reduced ? '1' : '0';
  panel.dataset.e023Installs = String(installCount);
}

register('E023', install);
