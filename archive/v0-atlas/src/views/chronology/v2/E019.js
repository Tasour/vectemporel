import { register } from './registry.js';

/* Lentille E019 (passe V2, domaine B — Filtres & périmètre) :
   annoncer un changement de filtre SANS BAVARDAGE.
   Fichier possédé : src/views/chronology/v2/E019.js uniquement. Lectures seules :
   src/views/chronology/E049.js et UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md.
   Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E019.md — chantiers E019-01 à E019-10.

   Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Le registre
   V2 n'expose aucun say() : la lentille possède donc UNE seule région live à elle,
   polie et atomique, et n'écrit dans aucune des régions existantes (compteur de
   résultats E015, navigation E041, coque). Elle n'émet aucun nombre de résultats.

   Invariants :
   - un seul register('E019', installer), un seul ctx.css('chronology-v2-e019', …) ;
   - un seul minuteur de coalescence, chaque nouvelle frappe l'annule et le relance ;
   - écriture dédupliquée : deux rendus identiques ne produisent aucune annonce ;
   - aucun timer inutile, aucune boucle rAF, aucun aléa, aucun réseau, aucune
     journalisation, aucun HTML brut, aucun vol de focus. */

const CSS_ID = 'chronology-v2-e019';
const ANNOUNCER_ID = 'chronology-v2-e019-announcer';
const MIRROR_ID = 'chronology-v2-e019-mirror';
const SEARCH_ID = 'atlas-chrono-search';
const TOOLS_ID = 'atlas-chrono-tools';
const MAIN_ID = 'atlas-chrono-main';

/* 220 ms : assez long pour fondre une frappe entière, assez court pour paraître
   immédiat. C'est le SEUL minuteur du module, et il est indispensable à E019-04. */
const DELAI_COALESCENCE = 220;
const LONGUEUR_MAX_TERME = 24;

/* E019-01, E019-05, E019-09, E019-10 : une seule feuille, injectée une fois par ctx.css.
   Le miroir visible est un paragraphe discret en flux ; il n'est ni modal ni
   superposé, il n'ajoute aucun arrêt Tab et ne masque ni la frise ni la fiche. */
const CSS = `
  #${ANNOUNCER_ID} {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0;
  }
  #${MIRROR_ID} {
    flex: 1 1 100%; margin: 6px 0 0; padding: 5px 8px;
    border-left: 3px solid var(--gold); border-radius: 4px;
    background: rgba(255,255,255,.02); color: var(--muted);
    font: inherit; font-size: 10px; line-height: 1.45; overflow-wrap: anywhere;
    transition: color 160ms ease;
  }
  #${MIRROR_ID}[data-e019-actif="1"] { color: var(--gold-bright); }
  #${MIRROR_ID}:empty { display: none; }
  /* E019-09 : aucun mouvement parasite ; la transition du miroir est éteinte. */
  @media (prefers-reduced-motion: reduce) {
    #${MIRROR_ID} { transition: none !important; }
  }
  @media (forced-colors: active) {
    #${MIRROR_ID} { border-left-color: CanvasText; background: Canvas; color: CanvasText; }
    #${MIRROR_ID}[data-e019-actif="1"] { color: CanvasText; }
  }
`;

let nombreInstallations = 0;
let derniereSignatureVue = null;
let dernierAnnonce = null;
let minuteur = null;
let frappesFondues = 0;
let annoncesEtouffees = 0;
let ecritures = 0;
let mouvementReduit = false;
let refs = { annonceur: null, miroir: null };

/* E019-10 : garde d'existence pour toute ID préfixée chronology-v2-e019-. Un
   nœud déjà présent est réutilisé et déplacé dans le parent courant : la coque
   reconstruisant #app, un nœud de la rendu précédent est détaché et n'est donc
   pas retrouvé par getElementById. */
function assurerNoeud(fabriquer, id, balise, classe, parent) {
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = fabriquer(balise, classe);
    noeud.id = id;
  }
  if (noeud.parentElement !== parent) parent.appendChild(noeud);
  return noeud;
}

/* E019-03 : une seule fonction d'écriture, qui ne touche au texte que s'il
   diffère. C'est le garde-fou anti-bavardage au niveau du texte. */
function ecrire(noeud, texte) {
  if (noeud && noeud.textContent !== texte) noeud.textContent = texte;
}

/* E019-02 : troncature pour rester concis — on annonce l'essentiel du critère,
   jamais un vidage d'état ni le nombre de résultats (E015). */
function tronquer(texte, limite) {
  const propre = String(texte || '').trim();
  return propre.length > limite ? `${propre.slice(0, limite - 1)}…` : propre;
}

function libelleDe(noeud) {
  return (noeud.getAttribute('aria-label') || noeud.textContent || '').trim();
}

/* E019-06 et E019-07 : lecture en lecture seule de l'état réel du filtre depuis
   le DOM / dataset. La signature normalisée permet de détecter un « no-op » :
   si elle est inchangée, aucun changement n'a eu lieu, donc aucune annonce. */
function lireEtat() {
  const champ = document.getElementById(SEARCH_ID);
  const recherche = champ && typeof champ.value === 'string' ? champ.value.trim() : '';
  const types = [];
  const outils = document.getElementById(TOOLS_ID);
  if (outils) {
    const puces = outils.querySelectorAll(
      'button[aria-pressed="true"], [data-active="true"], [aria-selected="true"]'
    );
    puces.forEach((puce) => {
      const libelle = libelleDe(puce);
      if (libelle) types.push(libelle);
    });
  }
  types.sort((a, b) => a.localeCompare(b, 'fr'));
  const signature = `${recherche.toLocaleLowerCase('fr')}||${types
    .map((type) => type.toLocaleLowerCase('fr'))
    .join('|')}`;
  return { recherche, types, signature };
}

/* E019-02 et E019-08 : composer une synthèse courte des SEULES dimensions qui
   ont changé. Si recherche et types changent ensemble, un unique message groupé
   est produit — jamais deux annonces concurrentes. */
function composer(avant, apres) {
  const rechercheChangee = avant.recherche !== apres.recherche;
  const typesAvant = avant.types.join('|');
  const typesApres = apres.types.join('|');
  const typesChanges = typesAvant !== typesApres;
  const morceaux = [];
  if (rechercheChangee) {
    morceaux.push(apres.recherche
      ? `Recherche : « ${tronquer(apres.recherche, LONGUEUR_MAX_TERME)} ».`
      : 'Recherche effacée.');
  }
  if (typesChanges) {
    morceaux.push(apres.types.length
      ? `Types : ${apres.types.map((type) => tronquer(type, LONGUEUR_MAX_TERME)).join(', ')}.`
      : 'Aucun type de point retenu.');
  }
  return {
    texte: morceaux.join(' '),
    groupe: rechercheChangee && typesChanges,
  };
}

/* E019-05, E019-07, E019-09 : rendre l'état auditable par attributs de données
   (installations, frappes fondues, annonces étouffées, écriture, mouvement réduit).
   Ces compteurs ne sont pas annoncés : ils servent uniquement à la vérification. */
function actualiserCompteurs() {
  const annonceur = refs.annonceur;
  if (!annonceur) return;
  annonceur.dataset.e019Installs = String(nombreInstallations);
  annonceur.dataset.e019Coalesced = String(frappesFondues);
  annonceur.dataset.e019Suppressed = String(annoncesEtouffees);
  annonceur.dataset.e019Writes = String(ecritures);
  annonceur.dataset.e019Reduced = mouvementReduit ? '1' : '0';
}

/* E019-04 : vidage du minuteur à l'échéance. Relire l'état courant ici permet
   de fondre toutes les frappes intervenues depuis la mise en attente. */
function publier() {
  minuteur = null;
  const annonceur = refs.annonceur;
  if (!annonceur || !annonceur.isConnected) return;
  const courant = lireEtat();

  if (dernierAnnonce && dernierAnnonce.signature === courant.signature) {
    annoncesEtouffees += 1;
    actualiserCompteurs();
    return;
  }

  const { texte, groupe } = composer(dernierAnnonce || { recherche: '', types: [] }, courant);
  if (texte) {
    ecrire(annonceur, texte);
    ecrire(refs.miroir, texte);
    ecritures += 1;
    annonceur.dataset.e019Grouped = groupe ? '1' : '0';
    refs.miroir.dataset.e019Actif = '1';
    dernierAnnonce = courant;
  }
  actualiserCompteurs();
}

function installer(ctx) {
  const fabriquer = ctx && ctx.el;
  if (typeof fabriquer !== 'function' || !ctx || !ctx.layout) return;

  nombreInstallations += 1;
  ctx.css(CSS_ID, CSS);
  /* E019-09 : lire la préférence de mouvement, sans jamais créer d'animation. */
  mouvementReduit = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;

  /* E019-01 : la région live est posée dans <body> pour survivre au vidage du
     DOM de la coque ; le miroir visible vit près des filtres. */
  const annonceur = assurerNoeud(fabriquer, ANNOUNCER_ID, 'p', 'e019-sr e019-annonceur', document.body);
  annonceur.setAttribute('role', 'status');
  annonceur.setAttribute('aria-live', 'polite');
  annonceur.setAttribute('aria-atomic', 'true');
  annonceur.dataset.e019View = ctx.viewId || '';

  const host = document.getElementById(MAIN_ID) || ctx.layout;
  const outils = document.getElementById(TOOLS_ID) || host;
  const miroir = assurerNoeud(fabriquer, MIRROR_ID, 'p', 'e019-miroir', outils);

  refs = { annonceur, miroir };
  const courant = lireEtat();

  if (derniereSignatureVue === null) {
    /* E019-06 : période de grâce — au premier rendu on mémorise l'état de
       référence, mais on n'annonce rien : un état initial n'est pas un
       changement. */
    derniereSignatureVue = courant.signature;
    dernierAnnonce = courant;
    annonceur.dataset.e019First = '1';
    ecrire(annonceur, '');
    ecrire(miroir, '');
  } else if (courant.signature !== derniereSignatureVue) {
    /* E019-04 : une nouvelle frappe annule et relance l'unique minuteur. */
    derniereSignatureVue = courant.signature;
    frappesFondues += 1;
    annonceur.dataset.e019First = '0';
    if (minuteur !== null) clearTimeout(minuteur);
    minuteur = setTimeout(publier, DELAI_COALESCENCE);
  }

  actualiserCompteurs();
}

register('E019', installer);
