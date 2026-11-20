import { register } from './registry.js';

/* Lentille V2 E060 — F. Sémantique & données : couverture binaire 100 %
 * explicitée (thème « E060 » de themes.json).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E060.md — chantiers E060-01 à
 * E060-10. Fichier possédé : src/views/chronology/v2/E060.js uniquement.
 * Aucun fichier partagé (registry.js, index.js, styles.css, chronology.js)
 * n'est modifié ; la passe 1 et toutes les autres lentilles V2 restent intactes.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } et les
 * helpers ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
 * Le registre V2 n'expose pas de say() : la lentille n'ajoute AUCUNE région
 * live, elle n'écrit dans aucune région existante et se contente d'afficher
 * son état en texte visible, dédupliqué, hors aria-live.
 *
 * Périmètre strict : la COUVERTURE BINAIRE des champs déjà présents dans le
 * DOM (points, repères, ères). Chaque champ vaut 1 (présent) ou 0 (absent) ;
 * le taux global est dérivé du DOM seul. La lentille n'invente aucune donnée
 * historique, ne corrige aucun champ manquant et n'empiète ni sur E051/E052
 * (chiffres et dates dérivés), ni sur E056/E057 (omission de source, silences),
 * ni sur E022/E024 (confiance, familles) : elle ne fait que rendre EXPLICITE
 * la présence ou l'absence, sous forme de matrice lisible.
 *
 * Invariants :
 * - exactement un register('E060', ctx => { … }) ;
 * - exactement un ctx.css('chronology-v2-e060', …) ;
 * - tous les IDs DOM sont préfixés chronology-v2-e060- et protégés par une
 *   garde d'existence (idempotence multi-rendus) ;
 * - zéro console.*, zéro fetch/XHR, zéro import distant, zéro Math.random,
 *   zéro innerHTML, zéro timer, zéro animation, zéro réseau.
 */

const PANEL_ID = 'chronology-v2-e060-panel';
const TITLE_ID = 'chronology-v2-e060-title';
const LEGEND_ID = 'chronology-v2-e060-legend';
const SCOPE_ID = 'chronology-v2-e060-scope';
const POINTS_ID = 'chronology-v2-e060-points';
const RATE_ID = 'chronology-v2-e060-rate';
const EVENTS_ID = 'chronology-v2-e060-events';
const ERAS_ID = 'chronology-v2-e060-eras';
const GAPS_ID = 'chronology-v2-e060-gaps';
const ENCODING_ID = 'chronology-v2-e060-encoding';
const MOTION_ID = 'chronology-v2-e060-motion';
const METRIC_ID = 'chronology-v2-e060-metric';
const ASIDE_ID = 'atlas-chrono-aside';

/* Sélecteurs tolérants : la passe 2 peut nommer ses nœuds différemment de la
   passe 1. On ne fait que lire et annoter, jamais renommer ni supprimer.
   Un repère porte data-event-id, une ère porte data-start : les deux
   sélecteurs sont donc disjoints malgré le data-era-id partagé. */
const POINT_SELECTOR = 'li.point, [data-point-id]';
const EVENT_SELECTOR = 'li[data-event-id]';
const ERA_SELECTOR = '[data-era-id][data-start]';
const MAX_ITEMS = 200;

/* E060-01 à E060-09 : une seule feuille. Les cellules sont encodées en TEXTE
   (chiffres 1/0 et mots « présent »/« absent ») : aucune information n'est
   confiée à la seule couleur, et le repli couleurs forcées ne change rien au
   sens. Aucune règle globale n'est modifiée. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 4px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.6;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e060-title {
    margin: 0 0 4px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 15px; font-weight: 600;
    line-height: 1.3; letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e060-lede { margin: 0 0 10px; color: var(--muted); }
  #${PANEL_ID} .e060-line { margin: 4px 0 0; }
  #${PANEL_ID} .e060-key { color: var(--gold-bright); }
  #${PANEL_ID} .e060-legend {
    margin: 6px 0 10px; padding: 6px 9px;
    border: 1px solid var(--line); border-radius: 6px;
    color: var(--ink-soft); font-size: 10px; line-height: 1.55;
  }
  #${PANEL_ID} .e060-metric { margin-top: 9px; color: var(--muted-2); font-size: 9px; }

  /* E060-01, E060-04, E060-05 : pastille de couverture ajoutée à chaque
     point, repère et ère. Le texte porte la matrice et le verdict ; la couleur
     n'est qu'un renfort. Les zéros sont visibles par le mot « absent » et par
     la classe .e060-zero, pas par une teinte seule. */
  .e060-badge {
    display: inline-block; margin: 2px 0 2px 8px; padding: 1px 5px;
    border: 1px solid var(--line); border-radius: 4px;
    background: rgba(255,255,255,.02); color: var(--muted);
    font: inherit; font-size: 8px; line-height: 1.4;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  .e060-badge[data-e060-ok="1"] { border-color: var(--line-strong); color: var(--gold-bright); }
  .e060-badge.e060-zero { border-style: dashed; color: var(--ink-soft); }

  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 10px; }
    .e060-badge { display: block; margin: 3px 0 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} *, .e060-badge {
      transition: none !important; animation: none !important;
    }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, #${PANEL_ID} .e060-legend, .e060-badge {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .e060-title,
    #${PANEL_ID} .e060-key,
    .e060-badge[data-e060-ok="1"] { color: CanvasText; }
    .e060-badge.e060-zero { border-style: dashed; }
  }
`;

let installCount = 0;

/* E060-10 : garde d'existence pour toute ID préfixée. Un nœud déjà présent
   est réutilisé et déplacé dans le parent courant : la coque reconstruisant
   le stage, un nœud de la rendu précédente est détaché et n'est pas retrouvé
   par getElementById, mais l'idempotence reste assurée dans les deux cas. */
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

function slice(nodes) {
  return Array.prototype.slice.call(nodes, 0, MAX_ITEMS);
}

/* Un champ est présent s'il porte une valeur non vide : attribut de données
   renseigné ou texte non vide. Aucune inférence, aucune date reconstruite. */
function hasAttr(node, name) {
  const value = node.getAttribute(name);
  return typeof value === 'string' && value.trim().length > 0;
}

function hasText(node) {
  return Boolean(node && (node.textContent || '').trim().length > 0);
}

function directParagraph(item) {
  const children = Array.prototype.slice.call(item.children || []);
  return children.find((child) => child.tagName === 'P') || null;
}

function firstChildWithText(item, selector) {
  const found = Array.prototype.slice.call(item.querySelectorAll(selector));
  return found.find(hasText) || null;
}

/* E060-01, E060-03, E060-04, E060-05 : la pastille est cherchée parmi les
   ENFANTS du nœud, jamais par querySelector global : deux points d'un même
   repère ne peuvent donc pas partager la même pastille. */
function ensureBadge(make, parent, className) {
  const children = Array.prototype.slice.call(parent.children || []);
  let badge = children.find((child) => child.classList.contains(className));
  if (!badge) {
    badge = make('span', `e060-badge ${className}`);
    parent.appendChild(badge);
  }
  return badge;
}

function annotate(kind, items, fieldsFor, make, stats) {
  items.forEach((item, index) => {
    const fields = fieldsFor(item, index);
    const bits = fields.map((present) => (present ? '1' : '0')).join('');
    const total = fields.length;
    const present = fields.reduce((sum, value) => sum + (value ? 1 : 0), 0);
    const missing = total - present;

    /* E060-01, E060-03, E060-04 : état binaire lisible dans le DOM seul. */
    item.dataset.e060Cover = bits;
    item.dataset.e060Fields = String(total);
    item.dataset.e060Present = String(present);
    item.dataset.e060Ok = missing === 0 ? '1' : '0';

    /* E060-02, E060-05 : effet visible — matrice, taux et zéros explicites. */
    const badge = ensureBadge(make, item, `e060-${kind}-badge`);
    write(badge, missing === 0
      ? `Couverture ${bits} · 100 %`
      : `Couverture ${bits} · ${present}/${total} · ${missing} absent(s)`);
    if (missing === 0) badge.classList.remove('e060-zero');
    else badge.classList.add('e060-zero');

    stats.total += 1;
    stats.cells += total;
    stats.present += present;
    stats.gaps += missing;
  });
}

function newStats() {
  return { total: 0, cells: 0, present: 0, gaps: 0 };
}

function pointFields(item) {
  return [
    hasAttr(item, 'data-point-id'),
    hasAttr(item, 'data-kind'),
    hasAttr(item, 'data-confidence'),
    hasText(directParagraph(item)),
    Boolean(item.querySelector('[data-source-id]')),
  ];
}

function eventFields(item) {
  return [
    hasAttr(item, 'data-event-id'),
    hasAttr(item, 'data-year'),
    hasAttr(item, 'data-era-id'),
    hasAttr(item, 'data-importance'),
    hasAttr(item, 'data-tags'),
    hasText(firstChildWithText(item, 'strong')),
  ];
}

function eraFields(item) {
  return [
    hasAttr(item, 'data-era-id'),
    hasAttr(item, 'data-start'),
    hasAttr(item, 'data-end'),
    hasText(firstChildWithText(item, 'span')),
  ];
}

/* Pourcentage français, dérivé du seul DOM : aucune valeur n'est codée en dur
   et aucune date n'est reconstruite (périmètre E051/E052 respecté). */
function pourcentage(present, cells) {
  if (cells === 0) return '0,0 %';
  return `${((present * 100) / cells).toFixed(1).replace('.', ',')} %`;
}

/* Montage du panneau : chaque chantier possède une ligne visible dédiée, ce
   qui rend son effet observable même sans outil de développement. */
function mountPanel(make, parent) {
  const panel = ensureNode(make, PANEL_ID, 'section', 'e060-panel', parent);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e060-title', 'Couverture binaire des données');
  title.id = TITLE_ID;

  const lede = make('p', 'e060-lede',
    'Ce panneau rend explicite la présence ou l’absence des champs déjà rendus : points, repères et ères. Il n’ajoute aucune donnée historique et ne corrige aucun champ manquant.');

  /* E060-06 : contrat de lecture de la matrice, sans lequel les chiffres 1/0
     seraient opaques. */
  const legend = make('p', 'e060-legend',
    'Lecture : 1 = champ présent dans le DOM, 0 = champ absent. « 100 % » signifie que tous les champs attendus sont présents ; chaque 0 est signalé par le mot « absent » et une pastille en pointillé.');
  legend.id = LEGEND_ID;

  const line = (id, label) => {
    const node = make('p', 'e060-line');
    node.id = id;
    node.appendChild(make('span', 'e060-key', `${label} : `));
    node.appendChild(make('span', 'e060-value', ''));
    return node;
  };

  const scope = line(SCOPE_ID, 'Périmètre mesuré');
  const points = line(POINTS_ID, 'Points (id · famille · confiance · texte · source)');
  const rate = line(RATE_ID, 'Taux de couverture des points');
  const events = line(EVENTS_ID, 'Repères (id · année · ère · importance · thèmes · titre)');
  const eras = line(ERAS_ID, 'Ères (id · début · fin · nom)');
  const gaps = line(GAPS_ID, 'Zéros explicités');
  const encoding = line(ENCODING_ID, 'Encodage visible');
  const motion = line(MOTION_ID, 'Mouvement réduit');
  const metric = make('p', 'e060-metric');
  metric.id = METRIC_ID;

  panel.replaceChildren(title, lede, legend, scope, points, rate, events,
    eras, gaps, encoding, motion, metric);
  return panel;
}

/* Écrit la valeur d'une ligne sans toucher à son libellé (un seul textContent
   ciblé par ligne, dédupliqué). */
function setValue(lineNode, value) {
  if (!lineNode) return;
  const target = lineNode.querySelector('.e060-value');
  if (target && target.textContent !== value) target.textContent = value;
}

register('E060', ctx => {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css('chronology-v2-e060', CSS);

  const host = document.getElementById(ASIDE_ID) || ctx.layout;
  const panel = mountPanel(make, host);

  /* E060-01/02 : points ; E060-03 : repères ; E060-04 : ères. La mesure porte
     sur ce qui est réellement rendu, pas sur une source supposée (E060-07). */
  const points = newStats();
  const events = newStats();
  const eras = newStats();
  annotate('point', slice(ctx.layout.querySelectorAll(POINT_SELECTOR)), pointFields, make, points);
  annotate('event', slice(ctx.layout.querySelectorAll(EVENT_SELECTOR)), eventFields, make, events);
  annotate('era', slice(ctx.layout.querySelectorAll(ERA_SELECTOR)), eraFields, make, eras);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  const gapsTotal = points.gaps + events.gaps + eras.gaps;

  setValue(document.getElementById(SCOPE_ID),
    `${points.total} point(s), ${events.total} repère(s) et ${eras.total} ère(s) mesurés sur le rendu courant ; aucun chiffre n’est supposé hors du DOM.`);
  setValue(document.getElementById(POINTS_ID),
    `${points.present} champ(s) présent(s) sur ${points.cells} attendus chez les points.`);
  setValue(document.getElementById(RATE_ID),
    `${pourcentage(points.present, points.cells)} de couverture binaire des points (100 % = ${points.cells} champs présents sur ${points.cells}).`);
  setValue(document.getElementById(EVENTS_ID),
    `${events.present}/${events.cells} champ(s) présent(s) chez les repères ; matrice publiée dans data-e060-cover.`);
  setValue(document.getElementById(ERAS_ID),
    `${eras.present}/${eras.cells} champ(s) présent(s) chez les ères ; matrice publiée dans data-e060-cover.`);
  setValue(document.getElementById(GAPS_ID), gapsTotal === 0
    ? 'Aucun zéro : chaque champ attendu est présent dans le rendu courant.'
    : `${gapsTotal} champ(s) absent(s) signalé(s) explicitement par le mot « absent » et la classe .e060-zero, jamais par un vide silencieux.`);
  setValue(document.getElementById(ENCODING_ID),
    'État porté par le texte « 1 / 0 », « présent / absent » et le pourcentage ; le repli couleurs forcées conserve le même sens.');
  setValue(document.getElementById(MOTION_ID), reduced
    ? 'Préférence de mouvement réduit détectée : aucune transition ni animation sur les pastilles.'
    : 'Mouvement normal : la couverture reste lisible sans animation, aucune transition ne porte d’information.');
  write(document.getElementById(METRIC_ID),
    `Installations : ${installCount} · champs examinés : ${points.cells + events.cells + eras.cells} · couverture des points : ${pourcentage(points.present, points.cells)} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);

  /* État auditable depuis le DOM seul, réécrit à chaque installation. */
  panel.dataset.e060PointRate = pourcentage(points.present, points.cells);
  panel.dataset.e060Gaps = String(gapsTotal);
  panel.dataset.e060Reduced = reduced ? '1' : '0';
  panel.dataset.e060Installs = String(installCount);
});
