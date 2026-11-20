import { register } from './registry.js';

/* Lentille E090 — passe 2 (module POINTS/V2 E090). Qualité & validation :
 * audit de francisation — couverture des libellés, constats et conformité.
 *
 * Dix chantiers V2, E090-V2-01 à E090-V2-10, décrits dans
 * UNIFIED_AUDIT/POINTS/V2/views/E090.md.
 *
 * La vue points.js:128 appelle runEnhancementsV2({ viewId: 'pointsv2', stage,
 * layout }) en plus de la passe 1 (points.js:127). Ce module est un greffon
 * INDÉPENDANT et COMPLÉMENTAIRE : la passe 1 (src/views/points/E090.js) garde
 * la main sur son relevé de francisation vivant (panneau, observateur, lexique)
 * et sur ses marqueurs ; la passe 2 ne corrige aucun libellé et ne pilote rien.
 * Elle REND AUDITABLE l'état de francisation tel que la vue et la passe 1 l'ont
 * produit : couverture des zones, décompte des constats, conformité à la règle
 * « aucune chaîne anglaise », et coexistence avec la passe 1.
 *
 * Espace de noms distinct : identifiants préfixés `points-v2-e090-`, attributs
 * de données préfixés `data-v2-e090-`, classe de portée `points-v2-e090` posée
 * sur `.points-detail`, feuille injectée sous l'id `points-v2-e090`. Rien ne
 * entre en collision avec la portée `points-e090` de la passe 1.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css, el, reducedMotion }.
 * Aucune dépendance vers le store, aucune écriture d'état, aucun écouteur global
 * et aucun observateur de mutations : le store recrée la vue entière à chaque rendu,
 * donc la lecture au rendu est toujours courante, sans boucle d'écriture.
 * Les marqueurs de la passe 1 sont LUS dans le DOM, jamais modifiés. Les jetons
 * anglais du lexique de repérage sont des données internes et ne sont jamais
 * injectés dans le document : le tableau n'affiche que des termes français.
 *
 * Invariants : un seul register, une seule feuille, un seul tableau par rendu ;
 * ids préfixés et dédupliqués ; tout DOM statique bâti avec ctx.el (jamais de
 * balisage injecté) ; zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro
 * journalisation ; chaque état porte un glyphe ET un mot, jamais la couleur
 * seule ; compteurs accordés selon le pluriel français.
 */

const CSS_ID = 'points-v2-e090';
const SCOPE = 'points-v2-e090';
const PANEL_ID = 'points-v2-e090-panel';
const TITLE_ID = 'points-v2-e090-title';
const REDUCED_ATTR = 'data-v2-e090-reduced';
const VIEW_IDS = ['pointsv2', 'points'];

/* ZONES : les quatorze emplacements où la vue et les lentilles voisines
 * injectent des libellés. Les sélecteurs suivent le DOM réel de
 * points.js:30-125. Chaque zone porte un nom français, seul affiché. */
const ZONES = [
  { selecteur: '.points-title', nom: 'Titre de la vue' },
  { selecteur: '.points-grid-row.is-head > span', nom: 'En-tête de colonne' },
  { selecteur: '.points-era', nom: 'Ère' },
  { selecteur: '.points-cell', nom: 'Cellule', attributs: ['title', 'aria-label'] },
  { selecteur: '.points-filters label', nom: 'Libellé de filtre' },
  { selecteur: '.points-filters option', nom: 'Option de filtre' },
  { selecteur: '.points-filters button', nom: 'Bouton de filtre', attributs: ['aria-label'] },
  { selecteur: '.points-point-title', nom: 'Titre du point' },
  { selecteur: '.points-point-text', nom: 'Texte du point' },
  { selecteur: '.points-meta span', nom: 'Métadonnée du point' },
  { selecteur: '.points-families span', nom: 'Famille du point' },
  { selecteur: '.points-sources', nom: 'Sources du point' },
  { selecteur: '.points-justification', nom: 'Justification du point' },
  { selecteur: '.points-nav button', nom: 'Bouton de navigation', attributs: ['aria-label'] },
];

/* E090-V2-03 : MOTIFS DE REPÉRAGE. Associe chaque jeton anglais à son
 * remplacement français. Les jetons ne sont jamais écrits dans le document :
 * seul le remplacement français est affiché dans les constats. */
const ANGLICISMES = [
  ['filter', 'filtre'], ['filters', 'filtres'], ['reset', 'réinitialiser'],
  ['detail', 'détail'], ['details', 'détails'], ['next', 'suivant'],
  ['previous', 'précédent'], ['close', 'fermer'], ['open', 'ouvrir'],
  ['search', 'rechercher'], ['loading', 'chargement'], ['error', 'erreur'],
  ['ready', 'prêt'], ['title', 'titre'], ['apply', 'appliquer'],
  ['cancel', 'annuler'], ['show', 'afficher'], ['hide', 'masquer'],
  ['select', 'sélectionner'], ['selected', 'sélectionné'], ['clear', 'effacer'],
  ['all', 'tout'], ['none', 'aucun'], ['view', 'vue'], ['list', 'liste'],
  ['grid', 'grille'], ['row', 'ligne'], ['cell', 'cellule'],
  ['column', 'colonne'], ['header', 'en-tête'], ['button', 'bouton'],
  ['click', 'cliquer'], ['keyboard', 'clavier'], ['help', 'aide'],
  ['legend', 'légende'], ['summary', 'résumé'], ['overview', 'aperçu'],
  ['family', 'famille'], ['families', 'familles'], ['scale', 'échelle'],
  ['domain', 'domaine'], ['domains', 'domaines'], ['era', 'ère'],
  ['eras', 'ères'], ['certainty', 'certitude'], ['coverage', 'couverture'],
  ['matrix', 'matrice'], ['data', 'données'], ['label', 'libellé'],
  ['value', 'valeur'], ['name', 'nom'], ['count', 'compte'],
  ['default', 'par défaut'], ['step', 'étape'], ['result', 'résultat'],
  ['results', 'résultats'], ['item', 'élément'], ['items', 'éléments'],
  ['empty', 'vide'], ['first', 'premier'], ['last', 'dernier'],
  ['current', 'actuel'], ['save', 'enregistrer'], ['load', 'charger'],
  ['print', 'imprimer'], ['export', 'exporter'], ['import', 'importer'],
  ['copy', 'copier'], ['edit', 'modifier'], ['delete', 'supprimer'],
  ['add', 'ajouter'], ['remove', 'retirer'], ['update', 'actualiser'],
  ['refresh', 'actualiser'], ['more', 'plus'], ['less', 'moins'],
  ['back', 'retour'], ['submit', 'valider'],
  ['level', 'niveau'], ['success', 'succès'], ['failure', 'échec'],
  ['warning', 'avertissement'], ['tips', 'conseils'],
];

/* E090-V2-04 : TABLE DES PLURIELS du vocabulaire de la vue. Les noms déjà
 * terminés par s, x ou z sont exclus pour éviter les pluriels redoublés. */
const PLURIELS = [
  ['ère', 'ères'], ['domaine', 'domaines'], ['famille', 'familles'],
  ['source', 'sources'], ['point', 'points'], ['filtre', 'filtres'],
  ['certitude', 'certitudes'], ['échelle', 'échelles'], ['matrice', 'matrices'],
  ['grille', 'grilles'], ['cellule', 'cellules'], ['ligne', 'lignes'],
  ['colonne', 'colonnes'], ['légende', 'légendes'], ['détail', 'détails'],
];

const DECLENCHEURS = 'les|des|aux|plusieurs|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|\\d+';

/* E090-V2-01 : feuille unique, entièrement préfixée par .points-v2-e090, classe
 * posée sur .points-detail : aucune fuite hors de cette vue. Les couleurs ne
 * font que redoubler un glyphe et un mot (E090-V2-08). */
const CSS = `
.points-v2-e090 .points-v2-e090-panel {
  box-sizing: border-box;
  margin: 14px 0 4px; padding: 12px 14px;
  border: 1px solid var(--line-strong); border-radius: 10px;
  background: rgba(230, 185, 111, .05); color: var(--ink-soft);
  font-size: 11px; line-height: 1.5; font-variant-numeric: tabular-nums;
}
.points-v2-e090 .points-v2-e090-panel:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 3px;
}
.points-v2-e090 .points-v2-e090-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 15px; color: var(--gold-bright);
}
.points-v2-e090 .points-v2-e090-intro,
.points-v2-e090 .points-v2-e090-note {
  margin: 0 0 8px; font-size: 11px; line-height: 1.5;
  color: var(--muted-2); overflow-wrap: anywhere;
}
.points-v2-e090 .points-v2-e090-block { margin: 0 0 10px; }
.points-v2-e090 .points-v2-e090-block-title {
  margin: 0 0 4px; font-size: 11px; font-weight: 700;
  letter-spacing: .03em; color: var(--gold);
}
.points-v2-e090 .points-v2-e090-list {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 4px 10px;
}
.points-v2-e090 .points-v2-e090-list li {
  display: flex; align-items: baseline; gap: 6px;
  min-height: 24px; padding: 2px 0;
  font-size: 11px; line-height: 1.4; overflow-wrap: anywhere;
}
.points-v2-e090 .points-v2-e090-glyph {
  display: inline-block; min-width: 1.2em;
  color: var(--gold-bright); font-weight: 700;
}
.points-v2-e090 .points-v2-e090-name { color: var(--ink-soft); }
.points-v2-e090 .points-v2-e090-state {
  margin-left: auto; color: var(--muted-2); font-size: 10px;
  white-space: nowrap;
}
.points-v2-e090 .points-v2-e090-item.is-alerte .points-v2-e090-glyph { color: var(--gold); }
.points-v2-e090 .points-v2-e090-item.is-absent .points-v2-e090-glyph { color: var(--muted-2); }
.points-v2-e090 .points-v2-e090-current,
.points-v2-e090 .points-v2-e090-metrics {
  margin: 4px 0 0; font-size: 10px; line-height: 1.5;
  color: var(--muted-2); overflow-wrap: anywhere;
}
.points-v2-e090 .points-v2-e090-metrics {
  margin-top: 8px; padding-top: 6px; border-top: 1px solid var(--line);
}
.points-v2-e090[data-v2-e090-reduced="1"] .points-v2-e090-glyph { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-v2-e090 .points-v2-e090-glyph { transition: none; }
}
@media (max-width: 620px) {
  .points-v2-e090 .points-v2-e090-list { grid-template-columns: 1fr; }
  .points-v2-e090 .points-v2-e090-panel { padding: 10px 12px; }
}
@media (forced-colors: active) {
  .points-v2-e090 .points-v2-e090-panel { border-color: CanvasText; background: Canvas; color: CanvasText; }
  .points-v2-e090 .points-v2-e090-glyph { color: CanvasText; }
}
@media print {
  .points-v2-e090 .points-v2-e090-panel { border-color: #666; background: transparent; }
}
`;

/* E090-V2-01 : gardes structurelles, réutilisées dans tout le module. */
function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function query(root, selector) {
  return isElement(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function nodes(root, selector) {
  if (!isElement(root) || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function attrText(node, name) {
  return node && typeof node.getAttribute === 'function'
    ? String(node.getAttribute(name) || '').trim() : '';
}

function setAttr(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function getAttr(node, name) {
  return node && typeof node.getAttribute === 'function' ? node.getAttribute(name) : null;
}

function removeNode(node) {
  if (node && typeof node.remove === 'function') node.remove();
}

/* E090-V2-06 : accord FRANÇAIS des compteurs — « 1 libellé », « 0 libellés ». */
function accord(nombre, singulier, pluriel) {
  return Number(nombre) === 1 ? singulier : pluriel;
}

/* E090-V2-10 : garde anti-doublon. Tout nœud portant un id préfixé qui n'est
 * pas celui conservé est retiré du document. */
function nodesById(id) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
}

function enforceUnique(id, keep) {
  nodesById(id).forEach((node) => { if (node !== keep) removeNode(node); });
  return keep || nodesById(id)[0] || null;
}

/* E090-V2-03 / E090-V2-04 : détection à frontières de mots Unicode. La
 * construction de l'expression régulière est isolée dans un repli silencieux. */
function frontiere(mot) {
  const echappe = mot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return '(^|[^\\p{L}\\p{N}])' + echappe + '([^\\p{L}\\p{N}]|$)';
}

function contourne(valeur, motif) {
  try { return new RegExp(motif, 'iu').test(valeur); }
  catch { return false; }
}

/* Une seule fonction d'analyse sert aux libellés observés et à l'autocontrôle
 * du tableau (E090-V2-05). */
function analyser(valeur, emplacement, constats) {
  if (!valeur) return;
  const texteValue = String(valeur);
  ANGLICISMES.forEach(([repere, repli]) => {
    if (contourne(texteValue, frontiere(repere))) {
      constats.push({ genre: 'anglicisme', emplacement, repli });
    }
  });
  PLURIELS.forEach(([singulier, pluriel]) => {
    const declenche = new RegExp('(?:' + DECLENCHEURS + ')\\s+' + frontiere(singulier), 'iu');
    const dejaPluriel = new RegExp(frontiere(pluriel), 'iu').test(texteValue);
    if (declenche.test(texteValue) && !dejaPluriel) {
      constats.push({ genre: 'pluriel', emplacement, repli: pluriel });
    }
  });
  if (contourne(texteValue, "\\p{L}'s([^\\p{L}]|$)")) {
    constats.push({ genre: 'pluriel', emplacement, repli: 'pluriel français' });
  }
}

/* E090-V2-02 / E090-V2-03 : lecture en lecture seule des quatorze zones.
 * Aucun nœud existant n'est modifié ; les attributs lus sont traduits en
 * français (« Infobulle », « Libellé accessible ») dans le relevé. */
function relever(layout) {
  const constats = [];
  let examines = 0;
  let zonesCouvertes = 0;
  let dernierEmplacement = '';
  ZONES.forEach((zone) => {
    const trouves = nodes(layout, zone.selecteur);
    if (trouves.length) zonesCouvertes += 1;
    trouves.forEach((node) => {
      const paragraphs = [];
      const brut = txt(node);
      if (brut) paragraphs.push({ valeur: brut, ou: zone.nom });
      (zone.attributs || []).forEach((attribut) => {
        const valeur = attrText(node, attribut);
        if (!valeur) return;
        const ou = attribut === 'title' ? 'Infobulle' : 'Libellé accessible';
        paragraphs.push({ valeur, ou: zone.nom + ' · ' + ou });
      });
      paragraphs.forEach(({ valeur, ou }) => {
        examines += 1;
        dernierEmplacement = ou;
        analyser(valeur, ou, constats);
      });
    });
  });
  /* Aucune valeur de libellé n'est conservée : seuls des intitulés français
   * (emplacements et remplacements) peuvent être réaffichés ou signés. */
  const replis = [];
  constats.forEach((constat) => {
    if (replis.indexOf(constat.repli) === -1) replis.push(constat.repli);
  });
  return {
    constats, examines, zonesCouvertes, dernierEmplacement, replis,
    anglicismes: constats.filter((c) => c.genre === 'anglicisme').length,
    pluriels: constats.filter((c) => c.genre === 'pluriel').length,
  };
}

/* E090-V2-07 : marqueurs posés par la passe 1, lus dans le DOM réel et jamais
 * réécrits. La source est affichée avec son origine pour rester honnête. */
function lirePasse1(layout) {
  const marqueur = attrText(layout, 'data-points-e090');
  const mouvement = attrText(layout, 'data-points-e090-reduced');
  const panneau = query(layout, '#points-e090-panel');
  const bilan = txt(query(layout, '.points-e090-bilan'));
  return {
    actif: marqueur === '1',
    mouvement: mouvement === '1',
    panneau: !!panneau,
    bilan,
  };
}

/* E090-V2-05 : le détecteur est appliqué au texte du tableau lui-même. */
function autocontrôle(panel) {
  if (!isElement(panel)) return 0;
  const constats = [];
  analyser(txt(panel), 'Tableau de francisation', constats);
  return constats.length;
}

function signatureOf(releve, passe1, controle) {
  return [
    String(releve.zonesCouvertes), String(releve.examines),
    String(releve.anglicismes), String(releve.pluriels),
    releve.dernierEmplacement, releve.replis.join(' · '),
    String(controle),
    passe1.actif ? '1' : '0',
    passe1.panneau ? '1' : '0',
    passe1.mouvement ? '1' : '0',
    passe1.bilan,
  ].join('||');
}

/* E090-V2-08 : chaque ligne porte un glyphe, un nom et un mot d'état. */
function listItem(ctx, glyph, name, state, kind) {
  const li = ctx.el('li', 'points-v2-e090-item is-' + kind);
  li.append(
    ctx.el('span', 'points-v2-e090-glyph', glyph),
    ctx.el('span', 'points-v2-e090-name', name),
    ctx.el('span', 'points-v2-e090-state', state)
  );
  return li;
}

/* E090-V2-02 : structure statique bâtie une seule fois par rendu avec ctx.el
 * (jamais de balisage injecté). Seules les listes et les deux lignes dynamiques
 * sont remplacées ensuite par remplir() via replaceChildren. */
function construire(ctx) {
  const panel = ctx.el('section', 'points-v2-e090-panel');
  panel.id = PANEL_ID;
  setAttr(panel, 'role', 'region');
  setAttr(panel, 'aria-labelledby', TITLE_ID);
  panel.tabIndex = -1;

  const title = ctx.el('h3', 'points-v2-e090-title', 'Audit de francisation — seconde passe');
  title.id = TITLE_ID;
  panel.appendChild(title);

  panel.appendChild(ctx.el('p', 'points-v2-e090-intro',
    'Ce tableau relit les libellés tels que la vue et la passe 1 les ont rendus. Il ne corrige aucun libellé, ne modifie aucun marqueur de la passe 1 et ne remplace pas le relevé vivant : il rend la francisation auditable par relecture.'));

  const blocs = [
    ['points-v2-e090-couverture', 'Couverture des libellés', 'points-v2-e090-couverture-list'],
    ['points-v2-e090-constats', 'Constats de francisation', 'points-v2-e090-constats-list'],
    ['points-v2-e090-reference', 'Référence et conformité', 'points-v2-e090-reference-list'],
    ['points-v2-e090-coexistence', 'Coexistence avec la passe 1', 'points-v2-e090-coexistence-list'],
  ];
  blocs.forEach(([blockClass, label, listClass]) => {
    const block = ctx.el('div', 'points-v2-e090-block ' + blockClass);
    block.appendChild(ctx.el('p', 'points-v2-e090-block-title', label));
    block.appendChild(ctx.el('ul', 'points-v2-e090-list ' + listClass));
    panel.appendChild(block);
  });

  panel.appendChild(ctx.el('p', 'points-v2-e090-current', ''));
  panel.appendChild(ctx.el('p', 'points-v2-e090-metrics', ''));
  panel.appendChild(ctx.el('p', 'points-v2-e090-note',
    'Règle de lecture : la référence est de zéro chaîne anglaise et de zéro pluriel non conforme. Les remplacements proposés sont des termes français ; les jetons de repérage ne sont jamais affichés. Un état est toujours écrit avec un signe et un mot, jamais par la couleur seule.'));
  return panel;
}

/* E090-V2-03 / E090-V2-04 / E090-V2-05 / E090-V2-06 / E090-V2-07 / E090-V2-08 :
 * tout le contenu dynamique est écrit ici, à partir des signaux lus plus haut. */
function remplir(ctx, panel, releve, passe1, controle) {
  const couverture = query(panel, '.points-v2-e090-couverture-list');
  if (couverture) {
    couverture.replaceChildren(
      listItem(ctx, releve.zonesCouvertes ? '✓' : '○',
        'Zones renseignées : ' + releve.zonesCouvertes + ' / ' + ZONES.length,
        releve.zonesCouvertes ? 'présentes' : 'aucune',
        releve.zonesCouvertes ? 'present' : 'absent'),
      listItem(ctx, releve.examines ? '◫' : '○',
        'Libellés examinés : ' + releve.examines,
        releve.examines ? 'examinés' : 'aucun',
        releve.examines ? 'present' : 'absent'),
      listItem(ctx, '□', 'Périmètre : titre, grille, filtres, fiche, navigation',
        'lecture seule', 'present')
    );
  }

  const constats = query(panel, '.points-v2-e090-constats-list');
  if (constats) {
    const replis = releve.replis;
    constats.replaceChildren(
      listItem(ctx, releve.anglicismes ? '!' : '✓',
        'Anglicismes relevés : ' + releve.anglicismes,
        releve.anglicismes ? 'à corriger' : 'aucun',
        releve.anglicismes ? 'alerte' : 'present'),
      listItem(ctx, releve.pluriels ? '!' : '✓',
        'Pluriels à corriger : ' + releve.pluriels,
        releve.pluriels ? 'à corriger' : 'aucun',
        releve.pluriels ? 'alerte' : 'present'),
      listItem(ctx, '✎', 'Remplacements proposés : '
        + (replis.slice(0, 6).join(' · ') || 'aucun'),
        replis.length ? 'en français' : 'sans objet',
        replis.length ? 'present' : 'absent')
    );
  }

  const reference = query(panel, '.points-v2-e090-reference-list');
  if (reference) {
    const conforme = releve.anglicismes === 0 && releve.pluriels === 0;
    reference.replaceChildren(
      listItem(ctx, conforme ? '✓' : '!', 'Règle : aucune chaîne anglaise',
        releve.anglicismes === 0 ? 'respectée' : 'écart constaté',
        releve.anglicismes === 0 ? 'present' : 'alerte'),
      listItem(ctx, releve.pluriels === 0 ? '✓' : '!',
        'Référence : zéro pluriel non conforme',
        releve.pluriels === 0 ? 'respectée' : 'écart constaté',
        releve.pluriels === 0 ? 'present' : 'alerte'),
      listItem(ctx, controle === 0 ? '✓' : '!',
        'Autocontrôle du tableau : ' + accord(controle, 'point à revoir', 'points à revoir'),
        controle === 0 ? 'aucun écart' : 'à revoir',
        controle === 0 ? 'present' : 'alerte')
    );
  }

  const coexistence = query(panel, '.points-v2-e090-coexistence-list');
  if (coexistence) {
    coexistence.replaceChildren(
      listItem(ctx, passe1.actif ? '✓' : '○', 'Marqueur de la passe 1 : '
        + (passe1.actif ? 'présent' : 'absent'),
      passe1.actif ? 'lu' : 'repli V2', passe1.actif ? 'present' : 'absent'),
      listItem(ctx, passe1.panneau ? '✓' : '○', 'Relevé de la passe 1 : '
        + (passe1.panneau ? 'présent' : 'absent'),
      passe1.panneau ? 'lu' : 'repli V2', passe1.panneau ? 'present' : 'absent'),
      listItem(ctx, '≈', 'Bilan de la passe 1 : '
        + (passe1.bilan ? passe1.bilan.slice(0, 110) : 'aucun bilan affiché'),
      passe1.bilan ? 'réaffiché' : 'aucun', passe1.bilan ? 'present' : 'absent')
    );
  }

  const courante = query(panel, '.points-v2-e090-current');
  if (courante) {
    courante.textContent = releve.examines
      ? 'Dernier emplacement examiné : « ' + releve.dernierEmplacement + ' ».'
      : 'Aucun libellé à examiner dans ce périmètre.';
  }

  const metriques = query(panel, '.points-v2-e090-metrics');
  if (metriques) {
    metriques.textContent = 'Couverture : ' + releve.zonesCouvertes + ' zone'
      + accord(releve.zonesCouvertes, '', 's') + ' sur ' + ZONES.length
      + ' · ' + releve.examines + ' libellé' + accord(releve.examines, '', 's')
      + ' examiné' + accord(releve.examines, '', 's')
      + ' · ' + releve.anglicismes + ' anglicisme' + accord(releve.anglicismes, '', 's')
      + ' · ' + releve.pluriels + ' pluriel' + accord(releve.pluriels, '', 's')
      + ' à corriger · autocontrôle : ' + controle + ' écart'
      + accord(controle, '', 's') + '.';
  }

  setAttr(panel, 'data-v2-e090-zones', String(releve.zonesCouvertes));
  setAttr(panel, 'data-v2-e090-examines', String(releve.examines));
  setAttr(panel, 'data-v2-e090-anglicismes', String(releve.anglicismes));
  setAttr(panel, 'data-v2-e090-pluriels', String(releve.pluriels));
  setAttr(panel, 'data-v2-e090-autocontrole', String(controle));
  setAttr(panel, 'data-v2-e090-conforme',
    releve.anglicismes === 0 && releve.pluriels === 0 ? '1' : '0');
  setAttr(panel, 'data-v2-e090-passe1', passe1.actif && passe1.panneau ? '1' : '0');
}

/* E090-V2-08 : compléter aria-describedby sans jamais écraser les identifiants
 * déjà posés par la passe 1 ou par une autre lentille. */
function augmentDescribedBy(node, id) {
  if (!node || typeof node.setAttribute !== 'function') return;
  const existants = (getAttr(node, 'aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (existants.indexOf(id) !== -1) return;
  setAttr(node, 'aria-describedby', existants.concat(id).join(' '));
}

/* E090-V2-01 / E090-V2-09 / E090-V2-10 : unique point d'entrée, gardes
 * structurelles, feuille unique, portée unique, ids dédupliqués, repli
 * silencieux sur structure inattendue. */
function appliquer(ctx) {
  if (!ctx || VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const layout = isElement(ctx.layout) ? ctx.layout
    : (isElement(ctx.stage) ? ctx.stage : null);
  if (!isElement(layout)) return;

  const detail = query(layout, '.points-detail');
  if (!isElement(detail)) return;

  ctx.css(CSS_ID, CSS);
  detail.classList.add(SCOPE);

  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); }
    catch { reduced = false; }
  }
  if (reduced) setAttr(detail, REDUCED_ATTR, '1');
  else if (typeof detail.hasAttribute === 'function' && detail.hasAttribute(REDUCED_ATTR)) {
    detail.removeAttribute(REDUCED_ATTR);
  }

  const releve = relever(layout);
  const passe1 = lirePasse1(layout);

  /* E090-V2-10 : réconciliation par id. On conserve le tableau déjà monté dans
   * le détail courant, on retire les doublons d'un rendu antérieur, puis on
   * garantit l'unicité du titre. */
  const candidats = nodesById(PANEL_ID);
  let panel = null;
  for (const candidat of candidats) {
    if (detail.contains(candidat) && candidat.parentElement === detail) {
      panel = candidat;
      break;
    }
  }
  candidats.forEach((node) => { if (node !== panel) removeNode(node); });

  if (!isElement(panel)) {
    panel = construire(ctx);
    detail.appendChild(panel);
  }
  enforceUnique(TITLE_ID, query(panel, '#' + TITLE_ID));

  const controle = autocontrôle(panel);
  const sig = signatureOf(releve, passe1, controle);
  if (getAttr(panel, 'data-v2-e090-signature') !== sig) {
    setAttr(panel, 'data-v2-e090-signature', sig);
    remplir(ctx, panel, releve, passe1, controle);
  }

  setAttr(panel, 'data-v2-e090', '1');
  augmentDescribedBy(query(detail, '.points-point-text') || query(detail, '.view-kicker'), PANEL_ID);
}

register('E090', (ctx) => {
  try { appliquer(ctx); }
  catch { return; }
});
