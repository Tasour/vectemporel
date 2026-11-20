import { register } from './registry.js';

/* Lentille E063 — passe V2 CHRONOLOGIE (domaine G : Performance & rendu).
 * Thème : « MutationObserver ciblé, jamais sur la zone écrite ».
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E063.md — chantiers E063-01 à E063-10.
 * Fichier possédé : src/views/chronology/v2/E063.js uniquement. Aucun fichier
 * partagé (registry.js, index.js, styles.css, src/views/chronology.js), aucune
 * autre lentille, aucune passe 1 n'est modifié.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } avec les
 * helpers ctx.css(id, règles), ctx.el(balise, classe, texte) et ctx.reducedMotion().
 * Le registre V2 n'expose pas de say() : la lentille n'ajoute AUCUNE région live
 * et n'écrit que dans des paragraphes visibles ordinaires, dédupliqués.
 *
 * Invariants :
 * - un seul register('E063', ctx => …), un seul ctx.css('chronology-v2-e063', …) ;
 * - un seul observateur module, réutilisé entre rendus après takeRecords() et
 *   disconnect() ; la cible observée n'est JAMAIS le panneau écrit ;
 * - ciblage étroit : subtree désactivé sur la racine, ou sous-arbre d'une bande
 *   de frise distincte du panneau ; childList et characterData toujours à false ;
 * - zéro aléa, zéro réseau, zéro journalisation, zéro HTML brut, zéro timer,
 *   zéro boucle rAF : le rendu est synchrone et purement déductif du DOM.
 */

const CSS_ID = 'chronology-v2-e063';
const PANEL_ID = 'chronology-v2-e063-panel';
const TITRE_ID = 'chronology-v2-e063-titre';
const METRIQUE_ID = 'chronology-v2-e063-metrique';

/* Les dix chantiers, disjoints : un seul observateur, dix facettes de sa
   configuration et de sa traçabilité, une section par facette dans le panneau. */
const CHANTIERS = [
  ['c01', 'E063-01 — Anti-rétroaction : observer la frise, écrire le panneau'],
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

/* Racines candidates : la passe V2 peut héberger la frise sous un identifiant
   légèrement différent de la passe 1. La détection reste défensive. */
const ID_RACINES = [
  'atlas-chrono-main',
  'atlas-chronology-main',
  'atlas-chrono-v2-main',
  'chronology-v2-main',
  'atlas-chrono-aside',
];
const SELECTEUR_SOURCE = '.era-band, .chrono-track, .chronology-track, .era-list, [data-era-id], [data-event-id]';
const ATTRIBUTS_SUIVIS = [
  'class', 'aria-selected', 'aria-current', 'aria-pressed',
  'data-active', 'data-selected', 'data-era-id', 'data-event-id',
];

/* E063-03 et E063-04 : deux profils, jamais d'écoute d'enfants ni de texte.
   Le profil large ne s'applique qu'à un sous-arbre de frise distinct du panneau ;
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

/* Une seule feuille, dix accents de chantier. Chaque couleur d'accent est
   doublée d'un libellé textuel, jamais porteuse d'information à elle seule. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 13px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.55;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e063-titre {
    margin: 0 0 5px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e063-intro { margin: 0 0 9px; color: var(--muted); }
  #${PANEL_ID} .e063-section {
    margin: 0 0 7px; padding: 6px 8px;
    border: 1px solid var(--line); border-left-width: 3px;
    border-radius: 6px; background: rgba(255,255,255,.015);
  }
  #${PANEL_ID} .e063-section h3 {
    margin: 0 0 3px; color: var(--gold-bright);
    font: inherit; font-size: 10px; font-weight: 600;
  }
  #${PANEL_ID} .e063-section p { margin: 0; color: var(--muted); }
  #${PANEL_ID} .e063-metrique {
    margin: 9px 0 0; padding-top: 7px; border-top: 1px solid var(--line);
    color: var(--gold-bright); font-size: 9px;
  }
  #${PANEL_ID} .e063-c01 { border-left-color: var(--gold); }
  #${PANEL_ID} .e063-c02 { border-left-color: var(--gold-bright); }
  #${PANEL_ID} .e063-c03 { border-left-color: var(--muted-2); }
  #${PANEL_ID} .e063-c04 { border-left-color: var(--accent, var(--gold)); }
  #${PANEL_ID} .e063-c05 { border-left-color: var(--gold); }
  #${PANEL_ID} .e063-c06 { border-left-color: var(--gold-bright); }
  #${PANEL_ID} .e063-c07 { border-left-color: var(--danger, var(--gold)); }
  #${PANEL_ID} .e063-c08 { border-left-color: var(--muted-2); }
  #${PANEL_ID} .e063-c09 { border-left-color: var(--accent, var(--gold)); }
  #${PANEL_ID} .e063-c10 { border-left-color: var(--gold); }
  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 9px 10px 10px; }
    #${PANEL_ID} .e063-section { padding: 5px 6px; }
    #${PANEL_ID} .e063-metrique { font-size: 9px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, #${PANEL_ID} .e063-section {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .e063-titre, #${PANEL_ID} .e063-section h3,
    #${PANEL_ID} .e063-metrique { color: CanvasText; }
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

/* E063-01 et E063-03 : on préfère observer un sous-arbre de frise distinct du
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
  const panneau = assurerNoeud(fabriquer, PANEL_ID, 'section', 'e063-panneau', racine);
  panneau.setAttribute('role', 'region');
  panneau.setAttribute('aria-labelledby', TITRE_ID);

  const titre = fabriquer('h2', 'e063-titre', 'MutationObserver ciblé et sans rétroaction');
  titre.id = TITRE_ID;
  const intro = fabriquer(
    'p',
    'e063-intro',
    'Panneau de performance : un seul observateur scrute la frise et jamais ce panneau. Il n’écrit que dans ses propres paragraphes visibles, en une seule passe par lot de mutations.'
  );

  const sections = CHANTIERS.map(([code, libelle]) => {
    const section = assurerNoeud(
      fabriquer,
      `chronology-v2-e063-${code}`,
      'div',
      `e063-section e063-${code}`,
      panneau
    );
    section.dataset.e063Chantier = code;
    const titreSection = fabriquer('h3', '', libelle);
    const detail = fabriquer('p', '', 'En attente du premier rafraîchissement.');
    detail.id = `chronology-v2-e063-${code}-detail`;
    section.replaceChildren(titreSection, detail);
    etat.sections[code] = { section, detail };
    return section;
  });

  const metrique = assurerNoeud(fabriquer, METRIQUE_ID, 'p', 'e063-metrique', panneau);
  panneau.replaceChildren(titre, intro, ...sections, metrique);
  etat.metrique = metrique;
  return panneau;
}

function actualiser() {
  const panneau = etat.panneau;
  if (!panneau || !panneau.isConnected) return;

  const profil = cibleId === 'aucune'
    ? 'aucun'
    : (cibleId === 'racine-frise'
      ? 'étroit (racine, sous-arbre désactivé)'
      : 'ciblé (sous-arbre de la frise)');

  const textes = {
    c01: `Zone observée : ${cibleId}. Zone écrite : ${PANEL_ID}. Aucune écriture n’est faite dans la zone observée.`,
    c02: `Observateur module : ${observateur ? 'un seul, réutilisé entre rendus' : 'aucun'}.`,
    c03: `Profil : ${profil}. childList et characterData sont désactivés dans les deux profils.`,
    c04: `${ATTRIBUTS_SUIVIS.length} attributs filtrés explicitement : class, aria-* et data-* de la frise.`,
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
    attribuer(reference.section, 'data-e063-chantier-pret', '1');
  });

  attribuer(panneau, 'data-e063-lots', String(lots));
  attribuer(panneau, 'data-e063-mutations', String(mutations));
  attribuer(panneau, 'data-e063-ignores', String(ignores));
  attribuer(panneau, 'data-e063-purges', String(purges));
  attribuer(panneau, 'data-e063-soutenu', soutenu ? '1' : '0');
  attribuer(panneau, 'data-e063-cible', cibleId);
  attribuer(panneau, 'data-e063-reduit', etat.reduit ? '1' : '0');
  attribuer(panneau, 'data-e063-installations', String(installations));

  ecrire(
    etat.metrique,
    `Traçabilité : ${installations} installation(s) · ${lots} lot(s) · ${mutations} mutation(s) retenue(s) · ${ignores} ignorée(s) · ${purges} purgée(s) · mouvement réduit : ${etat.reduit ? 'oui' : 'non'}.`
  );
}

function installer(ctx) {
  const fabriquer = ctx.el;
  if (typeof fabriquer !== 'function' || !ctx.layout) return;

  installations += 1;
  ctx.css(CSS_ID, CSS);
  etat.reduit = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  etat.sections = {};

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
      ? (source.id || String(source.className || 'source-frise'))
      : (racine.id || 'racine-frise');
    if (!observateur) observateur = new Observateur(surMutations);
    observateur.observe(cible, source ? OPTIONS_LARGE : OPTIONS_ETROITE);
  } else {
    cibleId = 'aucune';
  }

  actualiser();
}

register('E063', ctx => {
  installer(ctx);
});
