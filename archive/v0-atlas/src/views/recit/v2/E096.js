import { register } from './registry.js';

/* V2 lentille E096 — Mobile et reflow responsive (complément de la passe 1).
   La passe 1 couvrait déjà : containment de conteneur, reflow @container une/deux
   colonnes, mesure cqi, priorité au texte, cibles (pointer: coarse), grille
   d'actions, fil en grille, césure, ancrage de lecture et badge d'état. La V2
   propose DIX chantiers neufs et distincts, tous dans le même thème :
     01 reflow d'impression ; 02 orientation paysage à faible hauteur ;
     03 zones sûres latérales et basses ; 04 zoom automatique iOS neutralisé ;
     05 confinement du défilement tactile ; 06 gouttière de barre stable ;
     07 bande responsive lue par matchMedia (texte visible) ;
     08 orientation lue par matchMedia (texte visible) ;
     09 densité de commandes et du fil lue dans le DOM (texte visible) ;
     10 séparateur média/texte en colonne unique.
   Préfixes : classes recit-v2-e096-, ids DOM v2-e096- (jamais les ids e096- de
   la passe 1, qui tourne sur le MÊME DOM). Zéro réseau, zéro console, zéro aléa,
   zéro écouteur, zéro minuteur, zéro rAF, aucune mesure de layout forcée, aucun
   fichier partagé modifié. Tous les chiffres affichés sont dérivés du DOM réel
   ou d'un état matchMedia effectivement consulté. Sans ce module, la vue reste
   intégralement lisible et utilisable. */

const ID_BANDE = 'v2-e096-bande';
const ID_ORIENTATION = 'v2-e096-orientation';
const ID_DENSITE = 'v2-e096-densite';
const ATTR_BANDE = 'data-v2-e096-bande';
const ATTR_ORIENTATION = 'data-v2-e096-orientation';

/* Quatre bandes disjointes, évaluées dans l'ordre ; aucun seuil n'est affiché. */
const BANDES = [
  { nom: 'xs', requete: '(max-width: 420px)' },
  { nom: 'sm', requete: '(min-width: 421px) and (max-width: 700px)' },
  { nom: 'md', requete: '(min-width: 701px) and (max-width: 1100px)' },
  { nom: 'lg', requete: '(min-width: 1101px)' },
];

const CSS = `
/* E096-01 — Reflow d'impression : le récit redevient une colonne continue, le
   média de fond disparaît et le fil est renvoyé en fin de document imprimé. */
@media print{
  .recit-v2-e096.recit-v2-e096-print{display:block;height:auto;overflow:visible}
  .recit-v2-e096 .recit-v2-e096-print.recit-media{display:none}
  .recit-v2-e096 .recit-v2-e096-print .recit-body{overflow:visible;max-width:none;padding:0}
  .recit-v2-e096 .recit-v2-e096-print .recit-thread{break-before:page;page-break-before:always}
  .recit-v2-e096 .recit-v2-e096-print .recit-thread-list > li,
  .recit-v2-e096 .recit-v2-e096-print .recit-actions button{break-inside:avoid;page-break-inside:avoid}
}

/* E096-02 — Paysage à faible hauteur : bannière et espacements resserrés quand
   la hauteur disponible est contrainte (téléphone en paysage). */
@media (orientation:landscape) and (max-height:480px){
  .recit-v2-e096.recit-v2-e096-paysage .recit-media{min-height:56px;max-height:96px}
  .recit-v2-e096.recit-v2-e096-paysage .recit-body{padding-top:8px;padding-bottom:12px}
  .recit-v2-e096.recit-v2-e096-paysage .recit-thread{margin-bottom:8px}
}

/* E096-03 — Zones sûres latérales et basses : la passe 1 ne traitait que le
   haut. Ici on AJOUTE les trois autres côtés au padding existant (16 px / 28 px)
   avec un repli à 0 px pour les navigateurs sans env(). */
.recit-v2-e096 .recit-v2-e096-sure.recit-body{
  padding-left:calc(16px + env(safe-area-inset-left,0px));
  padding-right:calc(16px + env(safe-area-inset-right,0px));
  padding-bottom:calc(28px + env(safe-area-inset-bottom,0px));
}

/* E096-04 — Zoom automatique iOS neutralisé : en paysage, Safari peut agrandir
   le texte et provoquer un débordement horizontal du récit. */
.recit-v2-e096.recit-v2-e096-zoom{-webkit-text-size-adjust:100%;text-size-adjust:100%}

/* E096-05 — Confinement du défilement tactile : empêche le « scroll chaining »
   vers la coque quand le panneau de lecture arrive en bout de course. */
.recit-v2-e096 .recit-v2-e096-scroll.recit-body{
  overscroll-behavior:contain;
  -webkit-overflow-scrolling:touch;
}

/* E096-06 — Gouttière de barre stable : la largeur du texte ne saute pas au
   moment où la barre de défilement apparaît au survol sur desktop. */
.recit-v2-e096 .recit-v2-e096-gouttiere{
  scrollbar-gutter:stable;
  scrollbar-width:thin;
}

/* E096-07 — Miroir de bande responsive, texte visible dérivé de matchMedia. */
.recit-v2-e096-readout{
  margin:4px 0;padding:2px 0;
  color:var(--muted-2);font-size:9px;line-height:1.5;
  font-variant-numeric:tabular-nums;
}
.recit-v2-e096-readout strong{color:var(--gold-bright);font-weight:600}

/* E096-10 — Séparateur média/texte en colonne unique : délimite la bannière
   image du récit lorsque le reflow empile les deux blocs. */
@media (max-width:700px){
  .recit-v2-e096 .recit-v2-e096-separe.recit-media{
    border-top:1px solid var(--line);
    box-shadow:0 -6px 12px rgba(0,0,0,.25);
  }
}
`;

/* --- Utilitaires de garde : jamais de throw, jamais d'écrasement de contenu. --- */

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && typeof noeud.classList.add === 'function'
      && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function requete(query) {
  try {
    return !!(typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia(query).matches);
  } catch {
    return false;
  }
}

function attribut(noeud, nom, valeur) {
  if (noeud && typeof noeud.setAttribute === 'function'
      && !(typeof noeud.hasAttribute === 'function' && noeud.hasAttribute(nom))) {
    noeud.setAttribute(nom, valeur);
  }
}

/* Dépose (ou réutilise) un paragraphe visible à un emplacement stable. */
function placeParagraphe(documentRef, fabrique, id, parent, ancre, texte) {
  if (!parent || typeof parent.insertBefore !== 'function'
      || typeof documentRef.getElementById !== 'function'
      || typeof fabrique !== 'function') return;
  let noeud = documentRef.getElementById(id);
  if (!noeud || typeof noeud.setAttribute !== 'function') {
    noeud = fabrique('p', 'recit-v2-e096-readout');
    if (!noeud || typeof noeud.setAttribute !== 'function') return;
    noeud.id = id;
  }
  noeud.textContent = texte;
  const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
}

register('E096', (ctx) => {
  try {
    const { stage, layout, css, el, reducedMotion } = ctx;
    void stage;
    void reducedMotion;
    if (typeof document === 'undefined' || !layout
        || typeof layout.querySelector !== 'function') return;
    if (typeof css === 'function') css('recit-v2-e096', CSS);

    const corps = layout.querySelector('.recit-body');
    const media = layout.querySelector('.recit-media');
    const kicker = corps ? corps.querySelector('.view-kicker') : null;
    const timing = corps ? corps.querySelector('.recit-timing') : null;
    const actions = corps ? corps.querySelector('.recit-actions') : null;
    const fil = corps ? corps.querySelector('#c3a-thread') : null;

    /* E096-01 — reflow d'impression. */
    ajouteClasse(layout, 'recit-v2-e096');
    ajouteClasse(layout, 'recit-v2-e096-print');
    ajouteClasse(media, 'recit-v2-e096-print');
    ajouteClasse(corps, 'recit-v2-e096-print');

    /* E096-02 — paysage court : classes de ciblage (les règles sont déjà
       conditionnées par @media, aucun état JS n'est nécessaire). */
    ajouteClasse(layout, 'recit-v2-e096-paysage');

    /* E096-03 — zones sûres latérales et basses. */
    ajouteClasse(corps, 'recit-v2-e096-sure');

    /* E096-04 — zoom automatique iOS neutralisé. */
    ajouteClasse(layout, 'recit-v2-e096-zoom');

    /* E096-05 — confinement du défilement tactile. */
    ajouteClasse(corps, 'recit-v2-e096-scroll');

    /* E096-06 — gouttière de barre stable. */
    ajouteClasse(corps, 'recit-v2-e096-gouttiere');

    /* E096-07 — bande responsive lue par matchMedia (jamais de nombre affiché
       qui ne vienne d'un état réellement consulté). */
    let bande = 'indéterminée';
    for (const entree of BANDES) {
      if (requete(entree.requete)) { bande = entree.nom; break; }
    }
    const colonnes = (bande === 'xs' || bande === 'sm') ? 'une colonne' : 'deux colonnes';
    attribut(layout, ATTR_BANDE, bande);
    if (corps && kicker) {
      placeParagraphe(document, el, ID_BANDE, corps, kicker,
        `Affichage : bande ${bande} · mise en page en ${colonnes}.`);
    }

    /* E096-08 — orientation lue par matchMedia. */
    const portrait = requete('(orientation: portrait)');
    const orientation = portrait ? 'portrait' : 'paysage';
    attribut(layout, ATTR_ORIENTATION, orientation);
    if (corps && timing) {
      placeParagraphe(document, el, ID_ORIENTATION, corps, timing,
        `Orientation de l'écran : ${orientation} · la bannière s'adapte à la hauteur disponible.`);
    }

    /* E096-09 — densité lue dans le DOM réel : commandes et points du fil. */
    const commandes = actions && actions.querySelectorAll
      ? actions.querySelectorAll('button').length : 0;
    const points = fil && fil.querySelectorAll
      ? fil.querySelectorAll('.recit-thread-item').length : 0;
    if (corps && actions && commandes > 0) {
      placeParagraphe(document, el, ID_DENSITE, corps, actions,
        `${commandes} commandes accessibles · ${points} point${points > 1 ? 's' : ''} dans le fil.`);
    }

    /* E096-10 — séparateur média/texte en colonne unique. */
    ajouteClasse(media, 'recit-v2-e096-separe');
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
