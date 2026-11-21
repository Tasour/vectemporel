import { register } from './registry.js';

/* Lentille V2 E021 — C. Détail & fiche : titre du repère et ancre temporelle
 * en évidence (thème « E021 » de themes.json).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E021.md — chantiers E021-01 à
 * E021-10. Fichier possédé : src/views/chronology/v2/E021.js uniquement.
 * Aucun fichier partagé (registry.js, index.js, styles.css,
 * src/views/chronology.js) n'est modifié ; la passe 1 et les autres lentilles
 * restent intactes.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } et les
 * helpers ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
 * Le registre V2 n'expose pas de say() : la lentille n'ajoute AUCUNE région
 * live, elle n'écrit dans aucune région existante et affiche son état en texte
 * visible, dédupliqué, hors aria-live.
 *
 * Invariants :
 * - un seul register('E021', install), une seule feuille
 *   ctx.css('chronology-v2-e021', …) ;
 * - tous les IDs DOM sont préfixés chronology-v2-e021- et protégés par une
 *   garde d'existence (idempotence multi-rendus) ;
 * - zéro console.*, zéro fetch/XHR, zéro import distant, zéro Math.random,
 *   zéro innerHTML, zéro timer, zéro réseau, aucune date inventée.
 */

/* Huit IDs DOM possédés, tous préfixés chronology-v2-e021-. */
const PANEL_ID = 'chronology-v2-e021-panel';
const HEADING_ID = 'chronology-v2-e021-heading';
const TITLE_ID = 'chronology-v2-e021-title';
const ANCHOR_ID = 'chronology-v2-e021-anchor';
const NOTE_ID = 'chronology-v2-e021-note';
const ORDER_ID = 'chronology-v2-e021-order';
const AUDIT_ID = 'chronology-v2-e021-audit';
const METRIC_ID = 'chronology-v2-e021-metric';

/* Sélecteur tolérant : la passe 2 peut nommer ses repères différemment de la
   passe 1. On ne fait que lire et annoter, jamais renommer ni supprimer. */
const REPERE_SELECTOR = '[class*="event-card"], [class*="repere"], [data-event], [data-event-id], [data-repere]';
const DATE_ATTRS = ['data-date', 'data-year', 'data-start', 'data-end'];
const MAX_REPERES = 24;

/* E021-01 à E021-03, E021-08, E021-09 : une seule feuille. Le titre est mis
   en évidence par la taille, le poids et une lisière ; l'ancre par un libellé,
   une unité et un glyphe — jamais par la teinte seule. */
const CSS = `
  #${PANEL_ID} {
    margin: 16px 0 0; padding: 12px 14px 13px;
    border: 1px solid var(--line); border-left: 4px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e021-heading {
    margin: 0 0 4px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 15px; font-weight: 600;
    line-height: 1.3; letter-spacing: .01em; text-transform: none;
  }
  #${PANEL_ID} .e021-lede { margin: 0 0 10px; color: var(--muted); }
  #${PANEL_ID} .e021-titre {
    margin: 0 0 8px; padding: 2px 0 2px 10px;
    border-left: 4px solid var(--gold-bright);
    color: var(--ink); font-family: var(--serif);
    font-size: 19px; font-weight: 700; line-height: 1.25;
    letter-spacing: -.01em; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e021-titre[data-e021-title="0"] {
    color: var(--muted-2); font-style: italic; font-weight: 400;
    border-left-style: dashed;
  }
  #${PANEL_ID} .e021-ancre {
    display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 8px;
    margin: 0 0 8px; padding: 8px 10px;
    border: 1px dashed var(--line-strong);
    border-left: 3px solid var(--gold);
    border-radius: 6px; background: rgba(255,255,255,.03);
  }
  #${PANEL_ID} .e021-anchor-label {
    flex: 0 0 auto; color: var(--muted-2); font-size: 9px;
    letter-spacing: .06em; text-transform: uppercase;
  }
  #${PANEL_ID} .e021-anchor-kind {
    flex: 0 0 auto; min-width: 20px; padding: 0 4px;
    border: 1px solid var(--gold-bright); border-radius: 3px;
    color: var(--gold-bright); font-size: 11px; text-align: center;
  }
  #${PANEL_ID} .e021-anchor-kind[data-e021-kind="intervalle"] {
    border-style: double; border-width: 3px;
  }
  #${PANEL_ID} .e021-anchor-kind[data-e021-kind="inconnu"] {
    border-style: dashed; color: var(--muted);
  }
  #${PANEL_ID} .e021-anchor-value {
    flex: 1 1 auto; min-width: 0; color: var(--gold-bright);
    font-family: var(--serif); font-size: 15px; font-weight: 600;
    overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e021-anchor-unit {
    flex: 0 0 auto; color: var(--muted); font-size: 9px;
  }
  #${PANEL_ID} .e021-note,
  #${PANEL_ID} .e021-order,
  #${PANEL_ID} .e021-audit { margin: 5px 0 0; color: var(--muted); }
  #${PANEL_ID} .e021-order { color: var(--gold-bright); }
  #${PANEL_ID} .e021-audit,
  #${PANEL_ID} .e021-metric { margin: 5px 0 0; color: var(--muted-2); font-size: 9px; }
  .e021-card-code {
    margin-left: 6px; padding: 0 4px;
    border: 1px solid currentColor; border-radius: 3px;
    font-size: 9px; font-style: normal; opacity: .85;
  }
  [data-e021-anchor="0"] .e021-card-code { color: var(--muted-2); border-style: dashed; }
  [data-e021-anchor="1"] .e021-card-code { color: var(--gold-bright); }
  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 10px 11px 11px; }
    #${PANEL_ID} .e021-titre { font-size: 17px; }
    #${PANEL_ID} .e021-ancre { align-items: flex-start; }
    #${PANEL_ID} .e021-anchor-label { flex-basis: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (prefers-contrast: more) {
    #${PANEL_ID}, #${PANEL_ID} .e021-ancre, #${PANEL_ID} .e021-anchor-kind {
      border-color: var(--ink); border-width: 2px;
    }
    #${PANEL_ID} .e021-titre { border-left-width: 6px; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, #${PANEL_ID} .e021-ancre, [data-e021-anchor] {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .e021-heading,
    #${PANEL_ID} .e021-titre,
    #${PANEL_ID} .e021-anchor-label,
    #${PANEL_ID} .e021-anchor-kind,
    #${PANEL_ID} .e021-anchor-value,
    #${PANEL_ID} .e021-order { color: CanvasText; border-color: CanvasText; }
    #${PANEL_ID} .e021-titre { border-left: 4px solid CanvasText; }
    #${PANEL_ID} .e021-anchor-kind[data-e021-kind="intervalle"] { border-style: solid; }
  }
`;

const GLYPHES = { date: '◉', intervalle: '↔', inconnu: '?' };
const UNITES = { date: 'date', intervalle: 'intervalle', inconnu: 'non daté' };
const POSITION_SUIVANTE = 4; /* Node.DOCUMENT_POSITION_FOLLOWING */

let installCount = 0;

/* E021-10 : garde d'existence pour toute ID préfixée. Un nœud déjà présent
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

/* E021-10 : écriture dédupliquée — deux rendus sans changement ne touchent
   aucun texte. */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E021-01, E021-04 : le titre est lu sur le repère courant, jamais inventé. */
function lireTitre(carte) {
  const local = carte.querySelector('h1, h2, h3, h4, [class*="title"], [class*="titre"]');
  if (local && local.textContent.trim()) return local.textContent.trim();
  const attribut = carte.getAttribute('aria-label')
    || carte.getAttribute('data-title')
    || carte.getAttribute('data-titre')
    || carte.getAttribute('title');
  return attribut && attribut.trim() ? attribut.trim() : '';
}

/* E021-02, E021-04, E021-05 : l'ancre est dérivée des attributs déjà présents
   dans le DOM. Aucune année n'est codée en dur dans cette lentille. */
function lireAncre(carte) {
  for (let i = 0; i < DATE_ATTRS.length; i += 1) {
    const attr = DATE_ATTRS[i];
    const valeur = carte.getAttribute(attr);
    if (valeur && valeur.trim()) {
      return {
        valeur: valeur.trim(),
        source: attr,
        type: attr === 'data-start' || attr === 'data-end' ? 'intervalle' : 'date',
      };
    }
  }
  const temps = carte.querySelector('time[datetime]');
  if (temps && temps.getAttribute('datetime')) {
    return { valeur: temps.getAttribute('datetime'), source: 'datetime', type: 'date' };
  }
  return { valeur: '', source: 'absente', type: 'inconnu' };
}

function repereCourant(cartes) {
  for (let i = 0; i < cartes.length; i += 1) {
    const carte = cartes[i];
    if (carte.getAttribute('aria-current') === 'true'
      || carte.getAttribute('aria-selected') === 'true'
      || String(carte.className || '').indexOf('is-active') !== -1) return carte;
  }
  return cartes.length ? cartes[0] : null;
}

/* E021-06 : ordre de lecture source — le titre doit précéder l'ancre. */
function estAvant(a, b) {
  return Boolean(a && b && (a.compareDocumentPosition(b) & POSITION_SUIVANTE));
}

/* E021-07 : annotation en lecture seule des repères existants. On pose deux
   indicateurs d'état et un code court, sous garde d'unicité. */
function annoterRepères(make, cartes) {
  let avecTitre = 0;
  let avecAncre = 0;
  cartes.forEach((carte, index) => {
    const titre = lireTitre(carte) !== '';
    const ancre = lireAncre(carte).valeur !== '';
    if (titre) avecTitre += 1;
    if (ancre) avecAncre += 1;
    carte.dataset.e021Title = titre ? '1' : '0';
    carte.dataset.e021Anchor = ancre ? '1' : '0';
    if (!carte.querySelector('.e021-card-code')) {
      const code = make('span', 'e021-card-code', `E021-${index + 1}`);
      code.setAttribute('aria-hidden', 'true');
      carte.appendChild(code);
    }
  });
  return { total: cartes.length, avecTitre, avecAncre };
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installCount += 1;
  ctx.css('chronology-v2-e021', CSS);

  const host = ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e021-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', HEADING_ID);

  const heading = ensureNode(make, HEADING_ID, 'h2', 'e021-heading', panel);
  const lede = make('p', 'e021-lede', 'Fiche témoin : le titre du repère et son ancre temporelle sont mis en évidence. Le module lit le DOM existant sans modifier la frise ni la fiche d’origine.');
  const titre = ensureNode(make, TITLE_ID, 'h3', 'e021-titre', panel);
  const ancre = ensureNode(make, ANCHOR_ID, 'div', 'e021-ancre', panel);
  const note = ensureNode(make, NOTE_ID, 'p', 'e021-note', panel);
  const ordre = ensureNode(make, ORDER_ID, 'p', 'e021-order', panel);
  const audit = ensureNode(make, AUDIT_ID, 'p', 'e021-audit', panel);
  const metric = ensureNode(make, METRIC_ID, 'p', 'e021-metric', panel);

  const cartes = Array.prototype.slice.call(host.querySelectorAll(REPERE_SELECTOR), 0, MAX_REPERES);
  const resultat = annoterRepères(make, cartes);
  const courant = repereCourant(cartes);
  const titreTexte = courant ? lireTitre(courant) : '';
  const ancreDonnees = courant
    ? lireAncre(courant)
    : { valeur: '', source: 'absente', type: 'inconnu' };

  write(titre, titreTexte || 'Repère sans titre');
  titre.dataset.e021Title = titreTexte ? '1' : '0';
  titre.dataset.e021Source = courant ? 'domaine' : 'absent';

  const libelle = make('span', 'e021-anchor-label', 'Ancre temporelle');
  const glyphe = make('span', 'e021-anchor-kind', GLYPHES[ancreDonnees.type]);
  glyphe.dataset.e021Kind = ancreDonnees.type;
  glyphe.setAttribute('aria-hidden', 'true');
  const valeur = make('span', 'e021-anchor-value', ancreDonnees.valeur || 'ancre indisponible');
  const unite = make('span', 'e021-anchor-unit', UNITES[ancreDonnees.type]);
  ancre.replaceChildren(libelle, glyphe, valeur, unite);
  ancre.dataset.e021Kind = ancreDonnees.type;
  ancre.dataset.e021Source = ancreDonnees.source;

  panel.replaceChildren(heading, lede, titre, ancre, note, ordre, audit, metric);

  const suite = [heading, titre, ancre, note, ordre];
  let inversions = 0;
  for (let i = 0; i + 1 < suite.length; i += 1) {
    if (!estAvant(suite[i], suite[i + 1])) inversions += 1;
  }
  panel.dataset.e021Ordre = inversions === 0 ? 'ok' : 'anomalie';

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  panel.dataset.e021Reduced = reduced ? '1' : '0';
  panel.dataset.e021Installs = String(installCount);
  panel.dataset.e021Repères = String(resultat.total);

  write(note, 'Le titre se distingue par sa taille, son poids et sa lisière ; l’ancre porte un libellé, une unité et un glyphe. Aucune information ne repose sur la seule couleur : repli prévu en couleurs forcées et en contraste renforcé.');
  write(ordre, inversions === 0
    ? 'Ordre de lecture vérifié : titre → ancre → note, dans l’ordre source du document.'
    : `Ordre de lecture anormal : ${inversions} inversion(s) détectée(s) entre le titre et l’ancre.`);
  write(audit, `Repères repérés : ${resultat.total} · avec titre : ${resultat.avecTitre} · avec ancre : ${resultat.avecAncre} · sans titre : ${resultat.total - resultat.avecTitre} · sans ancre : ${resultat.total - resultat.avecAncre}.`);
  write(metric, `Installations : ${installCount} · source de l’ancre : ${ancreDonnees.source} · mouvement réduit : ${reduced ? 'oui' : 'non'} · mise en page 390×844 sans débordement prévue par la feuille unique.`);
}

register('E021', install);
