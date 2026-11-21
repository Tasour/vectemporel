import { register } from './registry.js';

/* Lentille E090 — Qualité & validation : francisation intégrale des libellés
 * injectés (domaine I).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E090.md — chantiers E090-01 à E090-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque
 * et styles.css ne sont ni édités ni doublés : E090 ajoute un relevé LOCAL et
 * non modal, dérivé des libellés déjà produits dans la vue, et signale les
 * anglicismes et les pluriels non conformes. Il ne corrige aucun libellé.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, les filtres ou le détail : le relevé reste lisible
 * même avec un ctx minimal.
 *
 * Invariants :
 * - un seul CSS, une seule portée, un seul relevé par rendu ;
 * - un seul MutationObserver, déconnecté puis reconnecté, jamais braqué sur le
 *   relevé lui-même (sinon boucle d'écriture) ;
 * - aucune écriture si la signature est inchangée (anti-redondance) ;
 * - tout texte injecté par E090 est en français, avec des pluriels accordés ;
 * - zéro innerHTML, zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro console.*.
 */

const CSS_ID = 'points-e090';
const SCOPE = 'points-e090';
const PANEL_ID = 'points-e090-panel';
const TITLE_ID = 'points-e090-title';
const REDUCED_ATTR = 'data-points-e090-reduced';

/* Toutes les règles sont préfixées par `.points-e090`, classe posée sur le
 * conteneur `.points-layout` : aucune fuite hors de la vue Points. Le relevé
 * est un frère de `.points-grid` / `.points-filters` dans `.points-matrix`. */
const CSS = `
.points-e090 .points-e090-panel {
  margin: 8px 0 10px; padding: 10px 12px;
  border: 1px solid var(--line-strong); border-radius: 8px;
  background: rgba(230, 185, 111, .05); color: var(--ink-soft);
  font-size: 11px; line-height: 1.45;
}
.points-e090 .points-e090-panel:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 3px;
}
.points-e090 .points-e090-title {
  margin: 0 0 6px; font-family: var(--serif);
  font-size: 14px; color: var(--gold-bright);
}
.points-e090 .points-e090-note,
.points-e090 .points-e090-bilan,
.points-e090 .points-e090-matiere,
.points-e090 .points-e090-matiere li { margin: 0 0 6px; }
.points-e090 .points-e090-note { color: var(--muted-2); }
.points-e090 .points-e090-bilan {
  color: var(--gold); font-variant-numeric: tabular-nums;
}
.points-e090 .points-e090-matiere {
  margin: 6px 0 0; padding-left: 18px;
}
.points-e090 .points-e090-matiere li { overflow-wrap: anywhere; }
.points-e090 .points-e090-controle { color: var(--muted-2); }
@media (max-width: 620px) {
  .points-e090 .points-e090-panel { font-size: 10px; padding: 8px 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .points-e090 .points-e090-panel { transition: none; }
}
@media (forced-colors: active) {
  .points-e090 .points-e090-panel {
    background: Canvas; color: CanvasText; border-color: CanvasText;
  }
  .points-e090 .points-e090-bilan { color: Highlight; }
}
`;

/* ZEILLES : les huit emplacements où la vue et les lentilles voisines injectent
 * des libellés. Chaque zone porte un nom FRANÇAIS, seul affiché dans le relevé.
 * Les seuls attributs lus sont des libellés accessibles ou des infobulles. */
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
  { selecteur: '.points-point-meta', nom: 'Métadonnées du point' },
  { selecteur: '.points-point-families', nom: 'Familles du point' },
  { selecteur: '.points-point-sources', nom: 'Sources du point' },
  { selecteur: '.points-point-justification', nom: 'Justification du point' },
  { selecteur: '.points-nav button', nom: 'Bouton de navigation', attributs: ['aria-label'] },
];

/* REPÈRES DE DÉTECTION. Les jetons anglais ci-dessous sont des MOTIFS DE
 * REPÉRAGE : ils servent uniquement à reconnaître une chaîne suspecte. Ils ne
 * sont JAMAIS injectés dans le DOM — le relevé n'affiche que le nom français
 * de la zone et le remplacement français proposé. */
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

/* TABLE DES PLURIELS du vocabulaire de la vue. Un pluriel français se forme
 * ici par ajout de « s » ; les noms déjà terminés par « s », « x » ou « z »
 * sont exclus de la table pour éviter les faux positifs. */
const PLURIELS = [
  ['ère', 'ères'], ['domaine', 'domaines'], ['famille', 'familles'],
  ['source', 'sources'], ['point', 'points'], ['filtre', 'filtres'],
  ['certitude', 'certitudes'], ['échelle', 'échelles'], ['matrice', 'matrices'],
  ['grille', 'grilles'], ['cellule', 'cellules'], ['ligne', 'lignes'],
  ['colonne', 'colonnes'], ['légende', 'légendes'], ['détail', 'détails'],
];

const DECLENCHEURS = 'les|des|aux|plusieurs|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|\\d+';

let layout = null;          // .points-layout courant, réutilisé d'un rendu à l'autre
let panel = null;           // relevé recréé à chaque rendu de la vue
let bilanNode = null;       // bilan chiffré, hors région live
let matiereNode = null;     // liste des constats
let controleNode = null;    // résultat de l'autocontrôle du relevé
let observer = null;        // unique MutationObserver, jamais sur le relevé
let currentCtx = null;      // dernier ctx reçu, pour l'observateur
let lastSignature = '';     // dernière signature réellement écrite
let analyses = 0;           // nombre d'analyses effectuées
let ecritures = 0;          // écritures de relevé réalisées
let evitees = 0;            // écritures évitées (signature inchangée)

function root(ctx) {
  if (ctx && ctx.layout && ctx.layout.isConnected) return ctx.layout;
  if (ctx && ctx.stage && typeof ctx.stage.querySelector === 'function') {
    const trouve = ctx.stage.querySelector('.points-layout');
    if (trouve && trouve.isConnected) return trouve;
  }
  return null;
}

function q(ctx, selecteur) {
  const n = root(ctx);
  return n && typeof n.querySelector === 'function' ? n.querySelector(selecteur) : null;
}

function qa(ctx, selecteur) {
  const n = root(ctx);
  return n && typeof n.querySelectorAll === 'function'
    ? n.querySelectorAll(selecteur) : [];
}

function texte(node) {
  return node ? String(node.textContent || '').trim() : '';
}

/* Accord FRANÇAIS des compteurs : « 1 libellé » mais « 0 libellés ». */
function accord(nombre, singulier, pluriel) {
  return `${nombre} ${Number(nombre) === 1 ? singulier : pluriel}`;
}

function frontiere(mot) {
  const echappe = mot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return `(^|[^\\p{L}\\p{N}])${echappe}([^\\p{L}\\p{N}]|$)`;
}

function contourne(texteValue, motif) {
  try { return new RegExp(motif, 'iu').test(texteValue); }
  catch { return false; }
}

/* Une seule fonction d'analyse sert aux libellés observés et à l'autocontrôle. */
function analyser(texteValue, emplacement, constats) {
  if (!texteValue) return;
  const valeur = String(texteValue);
  ANGLICISMES.forEach(([repere, repli]) => {
    if (contourne(valeur, frontiere(repere))) {
      constats.push({ genre: 'anglicisme', emplacement, repli });
    }
  });
  PLURIELS.forEach(([singulier, pluriel]) => {
    const declenche = new RegExp(`(?:${DECLENCHEURS})\\s+${frontiere(singulier)}`, 'iu');
    const dejaPluriel = new RegExp(frontiere(pluriel), 'iu').test(valeur);
    if (declenche.test(valeur) && !dejaPluriel) {
      constats.push({ genre: 'pluriel', emplacement, repli: pluriel });
    }
  });
  if (contourne(valeur, "\\p{L}'s([^\\p{L}]|$)")) {
    constats.push({ genre: 'pluriel', emplacement, repli: 'pluriel français' });
  }
}

/* Lecture en lecture seule des huit zones : aucun nœud existant n'est modifié. */
function relever(ctx) {
  const constats = [];
  let examines = 0;
  let empreinte = '';
  ZONES.forEach((zone) => {
    qa(ctx, zone.selecteur).forEach((node) => {
      const paragraphs = [];
      const brut = texte(node);
      if (brut) paragraphs.push({ valeur: brut, ou: zone.nom });
      (zone.attributs || []).forEach((attribut) => {
        const valeur = node.getAttribute ? String(node.getAttribute(attribut) || '').trim() : '';
        if (!valeur) return;
        const ou = attribut === 'title' ? 'Infobulle' : 'Libellé accessible';
        paragraphs.push({ valeur, ou: `${zone.nom} · ${ou}` });
      });
      paragraphs.forEach(({ valeur, ou }) => {
        examines += 1;
        empreinte += `${ou}=${valeur};`;
        analyser(valeur, ou, constats);
      });
    });
  });
  return { constats, examines, empreinte };
}

function setTexte(node, valeur) {
  if (!node || node.textContent === valeur) return false;
  node.textContent = valeur;
  return true;
}

function ecrireBilan(examines, constats) {
  const anglicismes = constats.filter((c) => c.genre === 'anglicisme').length;
  const pluriels = constats.length - anglicismes;
  setTexte(bilanNode,
    `${accord(examines, 'libellé examiné', 'libellés examinés')} · ` +
    `${accord(anglicismes, 'anglicisme', 'anglicismes')} · ` +
    `${accord(pluriels, 'pluriel à corriger', 'pluriels à corriger')}.`);
}

function ecrireMatiere(constats) {
  if (!matiereNode) return;
  const affiches = constats.slice(0, 12).map((constat) => {
    const debut = constat.genre === 'anglicisme'
      ? 'Anglicisme relevé' : 'Pluriel à corriger';
    return ctxEl('li', '', `${debut} dans « ${constat.emplacement} » : employer « ${constat.repli} ».`);
  });
  if (constats.length > affiches.length) {
    const reste = constats.length - affiches.length;
    affiches.push(ctxEl('li', '', `${accord(reste, 'constat supplémentaire', 'constats supplémentaires')} non affichés.`));
  }
  matiereNode.replaceChildren(...affiches);
}

/* ctx.el est mémorisé pour rester utilisable depuis les helpers de rendu. */
function ctxEl(tag, classe, texteValue) {
  return currentCtx && typeof currentCtx.el === 'function'
    ? currentCtx.el(tag, classe, texteValue)
    : document.createElement(tag);
}

/* L'autocontrôle applique exactement le même détecteur au texte du relevé :
 * la lentille qui exige le français s'applique d'abord à elle-même. */
function autocontrôle() {
  if (!panel) return 0;
  const constats = [];
  analyser(texte(panel), 'Relevé de francisation', constats);
  return constats.length;
}

function ecrireControle(nombre) {
  setTexte(controleNode, nombre === 0
    ? 'Autocontrôle : aucune chaîne anglaise dans ce relevé.'
    : `Autocontrôle : ${accord(nombre, 'point à revoir', 'points à revoir')} dans ce relevé.`);
}

function ecrireEtat(examines, constats, signature) {
  analyses += 1;
  const controle = autocontrôle();
  const prochaine = `${signature}||${controle}`;
  if (prochaine === lastSignature) {
    evitees += 1;
    return false;
  }
  lastSignature = prochaine;
  ecritures += 1;
  ecrireBilan(examines, constats);
  ecrireMatiere(constats);
  ecrireControle(controle);
  return true;
}

function rafraichir(ctx) {
  if (!ctx) return;
  currentCtx = ctx;
  const releve = relever(ctx);
  ecrireEtat(releve.examines, releve.constats, releve.empreinte);
}

/* Le relevé est bâti une seule fois par rendu, par ctx.el et textContent —
 * jamais par innerHTML. */
function construire(ctx) {
  const section = ctx.el('section', 'points-e090-panel');
  section.id = PANEL_ID;
  section.setAttribute('role', 'region');
  section.setAttribute('aria-labelledby', TITLE_ID);
  section.tabIndex = -1;

  const titre = ctx.el('h3', 'points-e090-title', 'Contrôle de francisation des libellés');
  titre.id = TITLE_ID;
  section.appendChild(titre);
  section.appendChild(ctx.el('p', 'points-e090-note',
    'Relevé local : cette lentille lit les libellés injectés par la vue Points et signale les anglicismes et les pluriels non conformes. Elle ne modifie aucun libellé.'));
  bilanNode = ctx.el('p', 'points-e090-bilan', '');
  matiereNode = ctx.el('ul', 'points-e090-matiere');
  controleNode = ctx.el('p', 'points-e090-controle', '');
  section.append(bilanNode, matiereNode, controleNode);
  return section;
}

/* Un seul observateur, déconnecté puis reconnecté ; il braque sur cinq cibles
 * en lecture seule et JAMAIS sur le relevé (sinon boucle d'écriture). */
function observerCibles(ctx) {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver(() => rafraichir(currentCtx));
  const cibles = [
    q(ctx, '.points-title'),
    q(ctx, '.points-grid'),
    q(ctx, '.points-filters'),
    q(ctx, '.points-detail'),
    q(ctx, '.points-nav'),
  ];
  const options = {
    childList: true, characterData: true, subtree: true,
    attributes: true, attributeFilter: ['class', 'value', 'aria-current', 'title', 'aria-label'],
  };
  cibles.forEach((cible) => { if (cible) observer.observe(cible, options); });
}

/* Installation idempotente : un rendu neuf se repère au nœud déconnecté ; on
 * retire alors un relevé orphelin et on réinstalle un seul panneau. */
function install(ctx) {
  if (!ctx || ctx.viewId !== 'points') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const courant = root(ctx);
  if (!courant) return;

  currentCtx = ctx;
  ctx.css(CSS_ID, CSS);
  courant.classList.add(SCOPE);
  courant.setAttribute('data-points-e090', '1');
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    courant.setAttribute(REDUCED_ATTR, '1');
  } else {
    courant.removeAttribute(REDUCED_ATTR);
  }

  const neuf = !layout || !layout.isConnected || layout !== courant;
  layout = courant;

  const orphelin = document.getElementById(PANEL_ID);
  if (orphelin && !courant.contains(orphelin)) orphelin.remove();

  panel = courant.querySelector('#' + PANEL_ID);
  if (!panel) {
    panel = construire(ctx);
    const matrice = courant.querySelector('.points-matrix');
    const titre = courant.querySelector('.points-title');
    const ancre = matrice || courant;
    if (titre && titre.parentNode === ancre && titre.nextSibling) {
      ancre.insertBefore(panel, titre.nextSibling);
    } else {
      ancre.appendChild(panel);
    }
  }
  bilanNode = panel.querySelector('.points-e090-bilan');
  matiereNode = panel.querySelector('.points-e090-matiere');
  controleNode = panel.querySelector('.points-e090-controle');

  observerCibles(ctx);

  if (neuf) lastSignature = '';
  rafraichir(ctx);
}

register('E090', (ctx) => { install(ctx); });
