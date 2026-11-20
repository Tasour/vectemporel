import { register } from './registry.js';

/* Lentille POINTS E063 — passe 2 (V2) : MutationObserver ciblé, jamais sur la
 * zone écrite (domaine G : performance & rendu).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E063.md — chantiers E063-01 à E063-10.
 * Fichier possédé : src/views/points/v2/E063.js uniquement. Ni la passe 1
 * (src/views/points/E063.js), ni la vue points.js, ni la coque, ni registry.js,
 * ni index.js ne sont modifiés. La lentille n'ajoute qu'un relevé LOCAL et non
 * modal dans .points-matrix, dérivé du DOM déjà produit par la vue.
 *
 * Différence contractuelle V2 : points.js:128 appelle
 * runEnhancementsV2({ viewId: 'pointsv2', stage, layout }). La lentille filtre
 * donc strictement sur 'pointsv2'. Tous ses signaux (CSS, ids, classes, data-*)
 * sont préfixés points-v2-e063 / pointsV2E063 pour ne pas écraser ceux de la
 * passe 1 (points-e063, data-e063*, points-e063-*). Les deux relevés coexistent
 * sans conflit : la V2 ne retire ni ne réétiquette aucun nœud de la passe 1.
 *
 * Contrat exploité : viewId, stage, layout, css(id, règles), el(balise, cls,
 * texte), reducedMotion(). Aucune dépendance au store, au routeur, aux filtres
 * ni à une autre lentille : le relevé reste lisible avec un ctx minimal.
 *
 * Invariants :
 * - un seul register('E063', ctx => …), un seul ctx.css('points-v2-e063', …) ;
 * - une seule portée .points-v2-e063, un seul panneau, une seule phrase métrique ;
 * - un seul observateur module, réutilisé entre rendus après takeRecords() et
 *   disconnect() ; la cible observée n'est JAMAIS le panneau écrit ;
 * - ciblage étroit : childList et characterData désactivés dans les deux profils ;
 * - zéro aléa, zéro réseau, zéro journalisation, zéro HTML brut, zéro timer,
 *   zéro boucle rAF : le rendu est synchrone et purement déductif du DOM.
 */

const VIEW_ID = 'pointsv2';
const CSS_ID = 'points-v2-e063';
const SCOPE = 'points-v2-e063';
const PANEL_ID = 'points-v2-e063-panel';
const TITRE_ID = 'points-v2-e063-titre';
const METRIQUE_ID = 'points-v2-e063-metrique';

const DATA_SCOPE = 'pointsV2E063';
const DATA_LOTS = 'pointsV2E063Lots';
const DATA_MUTATIONS = 'pointsV2E063Mutations';
const DATA_IGNORES = 'pointsV2E063Ignores';
const DATA_PURGES = 'pointsV2E063Purges';
const DATA_SOUTENU = 'pointsV2E063Soutenu';
const DATA_CIBLE = 'pointsV2E063Cible';
const DATA_REDUIT = 'pointsV2E063Reduit';
const DATA_INSTALLATIONS = 'pointsV2E063Installations';
const DATA_CHANTIER_PRET = 'pointsV2E063Pret';
const REDUCED_ATTR = 'data-points-v2-e063-reduced';

/* Les dix chantiers, disjoints : un seul observateur, dix facettes de sa
   configuration et de sa traçabilité, une section par facette dans le panneau. */
const CHANTIERS = [
  ['c01', 'E063-01 — Anti-rétroaction : observer la matrice, écrire le panneau'],
  ['c02', 'E063-02 — Un seul observateur module, réutilisé entre rendus'],
  ['c03', 'E063-03 — Ciblage étroit : sous-arbre désactivé sur la racine'],
  ['c04', 'E063-04 — attributeFilter explicite sur les seuls attributs utiles'],
  ['c05', 'E063-05 — Coalescence : une seule passe de mise à jour par lot'],
  ['c06', 'E063-06 — Ré-attachement contrôlé : disconnect() avant observe()'],
  ['c07', 'E063-07 — Garde d’exclusion de la zone écrite dans le rappel'],
  ['c08', 'E063-08 — Purge de la file par takeRecords() avant déconnexion'],
  ['c09', 'E063-09 — Repli gracieux si MutationObserver est absent'],
  ['c10', 'E063-10 — Traçabilité lisible des lots, mutations et purges'],
];

/* Racines candidates : la passe V2 peut héberger la matrice sous un identifiant
   légèrement différent de la passe 1. La détection reste défensive. */
const ID_RACINES = [
  'points-v2-main',
  'atlas-points-v2-main',
  'atlas-points-main',
];
const SELECTEUR_SOURCE = '.points-grid, .points-filters, .points-point-title, [data-era-id], [data-point-id]';
const ATTRIBUTS_SUIVIS = [
  'class', 'aria-selected', 'aria-current', 'aria-pressed',
  'aria-label', 'data-active', 'data-selected', 'data-era-id',
];

/* E063-03 et E063-04 : deux profils, jamais d'écoute d'enfants ni de texte.
   Le profil large ne s'applique qu'à une zone de matrice distincte du panneau ;
   le profil étroit n'observe que les attributs de la racine elle-même. */
const OPTIONS_LARGE = {
  attributes: true,
  attributeFilter: ATTRIBUTS_SUIVIS,
  childList: false,
  characterData: false,
  subtree: true,
};
const OPTIONS_ETROITE = {
  attributes: true,
  attributeFilter: ATTRIBUTS_SUIVIS,
  childList: false,
  characterData: false,
  subtree: false,
};

/* Une seule feuille. Chaque règle commence littéralement par `.points-v2-e063`,
   y compris dans les @media : aucune fuite hors de la vue Points et aucun
   écrasement de la feuille points-e063 de la passe 1. Chaque accent de chantier
   est doublé d'un libellé textuel, jamais porteur d'information à lui seul. */
const CSS = `
  .points-v2-e063 .points-v2-e063-panel {
    margin: 12px 0 14px; padding: 11px 13px 13px;
    border: 1px solid var(--line, #3a4252); border-left: 3px solid var(--gold, #e6b96f);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft, #d5dae2); font: inherit; font-size: 10px; line-height: 1.55;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  .points-v2-e063 .points-v2-e063-panel:focus-visible {
    outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 3px;
  }
  .points-v2-e063 .points-v2-e063-titre {
    margin: 0 0 5px; color: var(--gold-bright, #e9c98f);
    font-family: var(--serif, Georgia, serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  .points-v2-e063 .points-v2-e063-intro { margin: 0 0 9px; color: var(--muted, #aab3c0); }
  .points-v2-e063 .points-v2-e063-section {
    margin: 0 0 7px; padding: 6px 8px;
    border: 1px solid var(--line, #3a4252); border-left-width: 3px;
    border-radius: 6px; background: rgba(255,255,255,.015);
  }
  .points-v2-e063 .points-v2-e063-section h3 {
    margin: 0 0 3px; color: var(--gold-bright, #e9c98f);
    font: inherit; font-size: 10px; font-weight: 600;
  }
  .points-v2-e063 .points-v2-e063-section p { margin: 0; color: var(--muted, #aab3c0); }
  .points-v2-e063 .points-v2-e063-metrique {
    margin: 9px 0 0; padding-top: 7px; border-top: 1px solid var(--line, #3a4252);
    color: var(--gold-bright, #e9c98f); font-size: 9px;
  }
  .points-v2-e063 .points-v2-e063-c01 { border-left-color: var(--gold, #e6b96f); }
  .points-v2-e063 .points-v2-e063-c02 { border-left-color: var(--gold-bright, #e9c98f); }
  .points-v2-e063 .points-v2-e063-c03 { border-left-color: var(--muted-2, #9aa4b2); }
  .points-v2-e063 .points-v2-e063-c04 { border-left-color: var(--accent, var(--gold, #e6b96f)); }
  .points-v2-e063 .points-v2-e063-c05 { border-left-color: var(--gold, #e6b96f); }
  .points-v2-e063 .points-v2-e063-c06 { border-left-color: var(--gold-bright, #e9c98f); }
  .points-v2-e063 .points-v2-e063-c07 { border-left-color: var(--danger, var(--gold, #e6b96f)); }
  .points-v2-e063 .points-v2-e063-c08 { border-left-color: var(--muted-2, #9aa4b2); }
  .points-v2-e063 .points-v2-e063-c09 { border-left-color: var(--accent, var(--gold, #e6b96f)); }
  .points-v2-e063 .points-v2-e063-c10 { border-left-color: var(--gold, #e6b96f); }
  @media (max-width: 620px) {
    .points-v2-e063 .points-v2-e063-panel { padding: 9px 10px 10px; }
    .points-v2-e063 .points-v2-e063-section { padding: 5px 6px; }
    .points-v2-e063 .points-v2-e063-metrique { font-size: 9px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e063 .points-v2-e063-panel,
    .points-v2-e063 .points-v2-e063-section { transition: none !important; animation: none !important; }
  }
  .points-v2-e063[data-points-v2-e063-reduced="1"] .points-v2-e063-panel { transition: none; }
  @media (forced-colors: active) {
    .points-v2-e063 .points-v2-e063-panel,
    .points-v2-e063 .points-v2-e063-section {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    .points-v2-e063 .points-v2-e063-titre,
    .points-v2-e063 .points-v2-e063-section h3,
    .points-v2-e063 .points-v2-e063-metrique { color: CanvasText; }
  }
`;

let installations = 0;
let observateur = null;
let cibleId = 'aucune';
let soutenu = false;
let lots = 0;
let mutations = 0;
let ignores = 0;
let dernierLot = 0;
let dernierAttribut = 'aucun';
let purges = 0;
let etat = { panneau: null, metrique: null, sections: {}, reduit: false };

function assurerNoeud(fabriquer, id, balise, classe, parent) {
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = fabriquer(balise, classe);
    noeud.id = id;
  }
  if (noeud.parentElement !== parent) parent.appendChild(noeud);
  return noeud;
}

function ecrire(noeud, texte) {
  if (noeud && noeud.textContent !== texte) noeud.textContent = texte;
}

function attribuer(noeud, nom, valeur) {
  if (!noeud) return;
  const chaine = String(valeur);
  if (noeud.getAttribute(nom) !== chaine) noeud.setAttribute(nom, chaine);
}

function trouverRacine(ctx) {
  for (const id of ID_RACINES) {
    const noeud = document.getElementById(id);
    if (noeud) return noeud;
  }
  if (ctx.layout && ctx.layout.appendChild) return ctx.layout;
  if (ctx.stage && ctx.stage.appendChild) return ctx.stage;
  return document.body;
}

/* E063-01 et E063-07 : la zone écrite est le panneau. Toute cible ou toute
   mutation qui s'y trouve est exclue, pour ne jamais boucler sur nos écritures. */
function estDansPanneau(noeud) {
  const panneau = etat.panneau;
  if (!panneau || !noeud) return false;
  return noeud === panneau || panneau.contains(noeud);
}

/* E063-01 et E063-03 : on préfère observer une zone de la matrice distincte du
   panneau. À défaut, on observe la racine en profil étroit (attributs seuls). */
function trouverSource(racine) {
  if (!racine || typeof racine.querySelectorAll !== 'function') return null;
  const candidats = racine.querySelectorAll(SELECTEUR_SOURCE);
  for (const candidat of candidats) {
    if (!estDansPanneau(candidat)) return candidat;
  }
  return null;
}

/* E063-06 et E063-08 : avant chaque ré-attachement, on vide la file avec
   takeRecords() puis on déconnecte. Le compteur des purges est publié. */
function desactiverObservateur() {
  if (!observateur) return;
  try {
    const restants = observateur.takeRecords();
    purges += restants.length;
  } catch {
    /* Repli silencieux : takeRecords peut manquer sur une implémentation partielle. */
  }
  observateur.disconnect();
}

/* E063-05 : un seul rafraîchissement par lot, même si le lot contient dix
   enregistrements. E063-07 : les records issus de la zone écrite sont ignorés. */
function surMutations(records) {
  if (!records || !records.length) return;
  let retenues = 0;
  for (const record of records) {
    if (estDansPanneau(record.target)) {
      ignores += 1;
      continue;
    }
    retenues += 1;
    if (record.type === 'attributes' && record.attributeName) {
      dernierAttribut = record.attributeName;
    }
  }
  if (!retenues) return;
  lots += 1;
  mutations += retenues;
  dernierLot = retenues;
  actualiser();
}

function construirePanneau(fabriquer, racine) {
  const panneau = assurerNoeud(fabriquer, PANEL_ID, 'section', 'points-v2-e063-panel', racine);
  panneau.setAttribute('role', 'region');
  panneau.setAttribute('aria-labelledby', TITRE_ID);
  panneau.tabIndex = -1;

  const titre = fabriquer('h2', 'points-v2-e063-titre', 'MutationObserver ciblé et sans rétroaction');
  titre.id = TITRE_ID;
  const intro = fabriquer(
    'p',
    'points-v2-e063-intro',
    'Relevé de performance V2 : un seul observateur scrute la matrice des points et jamais ce panneau. Il n’écrit que dans ses propres paragraphes visibles, en une seule passe par lot de mutations.'
  );

  const sections = CHANTIERS.map(([code, libelle]) => {
    const section = assurerNoeud(
      fabriquer,
      `points-v2-e063-${code}`,
      'div',
      `points-v2-e063-section points-v2-e063-${code}`,
      panneau
    );
    section.dataset[DATA_CHANTIER_PRET] = code;
    const titreSection = fabriquer('h3', '', libelle);
    const detail = fabriquer('p', '', 'En attente du premier rafraîchissement.');
    detail.id = `points-v2-e063-${code}-detail`;
    section.replaceChildren(titreSection, detail);
    etat.sections[code] = { section, detail };
    return section;
  });

  const metrique = assurerNoeud(fabriquer, METRIQUE_ID, 'p', 'points-v2-e063-metrique', panneau);
  panneau.replaceChildren(titre, intro, ...sections, metrique);
  etat.metrique = metrique;
  return panneau;
}

function actualiser() {
  const panneau = etat.panneau;
  if (!panneau || !panneau.isConnected) return;

  const profil = cibleId === 'aucune'
    ? 'aucun'
    : (cibleId === 'racine-matrice'
      ? 'étroit (racine, sous-arbre désactivé)'
      : 'ciblé (sous-arbre de la matrice)');

  const textes = {
    c01: `Zone observée : ${cibleId}. Zone écrite : ${PANEL_ID}. Aucune écriture n’est faite dans la zone observée.`,
    c02: `Observateur module : ${observateur ? 'un seul, réutilisé entre rendus' : 'aucun'}.`,
    c03: `Profil : ${profil}. childList et characterData sont désactivés dans les deux profils.`,
    c04: `${ATTRIBUTS_SUIVIS.length} attributs filtrés explicitement : class, aria-* et data-* de la matrice.`,
    c05: `${lots} lot(s) traité(s), ${mutations} mutation(s) retenue(s) : une seule passe de mise à jour par lot.`,
    c06: `${installations} installation(s) : disconnect() est appelé avant chaque nouvel observe().`,
    c07: `${ignores} mutation(s) issue(s) de la zone écrite ignorée(s) par la garde d’exclusion.`,
    c08: `${purges} enregistrement(s) vidé(s) par takeRecords() avant déconnexion.`,
    c09: `MutationObserver disponible : ${soutenu ? 'oui' : 'non — repli textuel, aucun observateur installé'}.`,
    c10: `Dernier lot : ${dernierLot} mutation(s) ; dernier attribut observé : ${dernierAttribut}.`,
  };

  CHANTIERS.forEach(([code]) => {
    const reference = etat.sections[code];
    if (!reference) return;
    ecrire(reference.detail, textes[code]);
    attribuer(reference.section, 'data-points-v2-e063-chantier-pret', '1');
  });

  attribuer(panneau, `data-${DATA_LOTS}`, String(lots));
  attribuer(panneau, `data-${DATA_MUTATIONS}`, String(mutations));
  attribuer(panneau, `data-${DATA_IGNORES}`, String(ignores));
  attribuer(panneau, `data-${DATA_PURGES}`, String(purges));
  attribuer(panneau, `data-${DATA_SOUTENU}`, soutenu ? '1' : '0');
  attribuer(panneau, `data-${DATA_CIBLE}`, cibleId);
  attribuer(panneau, `data-${DATA_REDUIT}`, etat.reduit ? '1' : '0');
  attribuer(panneau, `data-${DATA_INSTALLATIONS}`, String(installations));

  ecrire(
    etat.metrique,
    `Traçabilité : ${installations} installation(s) · ${lots} lot(s) · ${mutations} mutation(s) retenue(s) · ${ignores} ignorée(s) · ${purges} purgée(s) · mouvement réduit : ${etat.reduit ? 'oui' : 'non'}.`
  );
}

function installer(ctx) {
  if (!ctx || ctx.viewId !== VIEW_ID) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const fabriquer = ctx.el;

  installations += 1;
  ctx.css(CSS_ID, CSS);

  const layout = ctx.layout && ctx.layout.classList ? ctx.layout : null;
  if (layout) {
    layout.classList.add(SCOPE);
    if (layout.dataset) layout.dataset[DATA_SCOPE] = '1';
  }
  if (typeof ctx.reducedMotion === 'function') {
    try { etat.reduit = Boolean(ctx.reducedMotion()); }
    catch { etat.reduit = false; }
  } else {
    etat.reduit = false;
  }
  if (layout) attribuer(layout, REDUCED_ATTR, etat.reduit ? '1' : '0');

  const racine = trouverRacine(ctx);
  const panneau = construirePanneau(fabriquer, racine);
  etat.panneau = panneau;

  /* E063-09 : aucun appel à MutationObserver s'il est indisponible. */
  const Observateur = typeof MutationObserver !== 'undefined'
    ? MutationObserver
    : (typeof window !== 'undefined' ? window.MutationObserver : null);
  soutenu = Boolean(Observateur);

  desactiverObservateur();
  if (soutenu) {
    const source = trouverSource(racine);
    const cible = source || racine;
    cibleId = source
      ? (source.id || String(source.className || 'source-matrice'))
      : 'racine-matrice';
    if (!observateur) observateur = new Observateur(surMutations);
    observateur.observe(cible, source ? OPTIONS_LARGE : OPTIONS_ETROITE);
  } else {
    cibleId = 'aucune';
  }

  actualiser();
}

/* E063-10 : enregistrement unique, isolé par un try/catch — une lentille
   défaillante ne doit jamais interrompre le rendu des autres modules V2. */
register('E063', (ctx) => {
  try { installer(ctx); } catch { return; }
});
