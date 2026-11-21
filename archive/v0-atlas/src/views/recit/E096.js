import { register } from './registry.js';

/* Lentille E096 — Mobile et reflow responsive (vue Récit).
 *
 * Dix chantiers concrets et distincts, E096-01 … E096-10, tous implémentés
 * dans CE seul module :
 *   01 confinement de conteneur (container-type) : la vue s'adapte à sa largeur
 *      réelle, pas au seul viewport ;
 *   02 reflow piloté par @container (une ou deux colonnes) avec repli @supports ;
 *   03 mesure de lecture fluide en unités de conteneur (cqi / ch) ;
 *   04 priorité au texte sur écran étroit (order : le body avant le média) ;
 *   05 cibles tactiles selon le POINTEUR (pointer: coarse), pas la largeur ;
 *   06 grille d'actions adaptative (auto-fit) avec promotion de « précédent /
 *      suivant » sous requête de conteneur ;
 *   07 fil en grille à colonnes égales sous conteneur étroit (pas un carrousel) ;
 *   08 césure et mots longs pilotés par le conteneur, avec langue déclarée ;
 *   09 ancrage de lecture : scroll-padding / scroll-margin sous en-tête collant ;
 *   10 miroir d'état compact, badge lisible et mouvement réduit (une écriture).
 *
 * Rapport : UNIFIED_AUDIT/RECIT/views/E096.md. Lectures seules : recit.js,
 * registry.js, index.js. Aucun fichier partagé modifié.
 *
 * Un seul enregistrement E096, une seule feuille « recit-e096 » regroupant toute
 * la feuille. Toutes les classes créées sont préfixées `recit-e096-` ; le seul
 * identifiant créé est `e096-regime`, unique et déposé dans `.recit-body`.
 * Zéro console, zéro réseau, zéro aléa, zéro écouteur, zéro minuteur, zéro rAF,
 * aucune injection de balisage, aucune mesure de layout forcée. Aucun nœud existant n'est
 * retiré ni réécrit : sans JavaScript, la vue reste intégralement lisible.
 * Chaque chantier est isolé par une garde d'existence et l'ensemble est
 * enveloppé dans un try/catch : une lentille défaillante ne casse jamais le
 * rendu.
 */

const CSS_ID = 'recit-e096';
const ID_BADGE = 'e096-regime';
const ATTR_MIROIR = 'data-e096-regime';
const SEUIL_COMPACT = '(max-width: 700px)';
const REQUETE_TACTILE = '(pointer: coarse)';

/* Feuille unique. Tout est cadré par la classe racine .recit-e096 posée sur
   .recit-e096 : aucune règle ne déborde sur une autre vue ni sur une autre
   lentille. Les requêtes de conteneur complètent (et ne remplacent pas) les
   règles existantes ; un bloc @supports not assure le repli. */
const CSS = `
/* E096-01 — confinement de conteneur : la mise en page suit la largeur réelle
   de la vue, y compris si elle est intégrée dans un panneau plus étroit. */
.recit-e096.recit-e096-conteneur{
  container-type:inline-size;
  container-name:recite096;
}

/* E096-02 — reflow piloté par le conteneur, pas par le viewport. */
@container recite096 (max-width:46rem){
  .recit-e096.recit-e096-grille{
    grid-template-columns:minmax(0,1fr);
    grid-template-rows:auto minmax(0,1fr);
  }
}
@container recite096 (min-width:46.0625rem){
  .recit-e096.recit-e096-grille{
    grid-template-columns:minmax(0,42%) minmax(0,58%);
    grid-template-rows:minmax(0,1fr);
  }
}
/* Repli si les requêtes de conteneur ne sont pas prises en charge. */
@supports not (container-type:inline-size){
  @media (max-width:700px){
    .recit-e096.recit-e096-grille{
      grid-template-columns:minmax(0,1fr);
      grid-template-rows:auto minmax(0,1fr);
    }
  }
}

/* E096-03 — mesure de lecture fluide, exprimée en unités de conteneur. */
.recit-e096 .recit-e096-mesure{--e096-mesure:min(100%,68ch)}
.recit-e096 .recit-e096-mesure .recit-title,
.recit-e096 .recit-e096-mesure .recit-context{max-width:var(--e096-mesure)}
@container recite096 (max-width:46rem){
  .recit-e096 .recit-e096-mesure .recit-title,
  .recit-e096 .recit-e096-mesure .recit-context{max-width:none}
}
@container recite096 (max-width:46rem){
  .recit-e096 .recit-e096-flux .recit-title{font-size:clamp(22px,6cqi,34px)}
  .recit-e096 .recit-e096-flux .recit-context{font-size:clamp(14px,3.2cqi,16px);line-height:1.68}
}
@supports not (container-type:inline-size){
  @media (max-width:700px){
    .recit-e096 .recit-e096-mesure .recit-title,
    .recit-e096 .recit-e096-mesure .recit-context{max-width:none}
    .recit-e096 .recit-e096-flux .recit-title{font-size:clamp(22px,7vw,34px)}
    .recit-e096 .recit-e096-flux .recit-context{font-size:clamp(14px,3.6vw,16px);line-height:1.68}
  }
}

/* E096-04 — priorité au texte : sur conteneur étroit, le récit passe avant le
   média, qui devient une bannière basse. Aucun contenu n'est supprimé. */
@container recite096 (max-width:46rem){
  .recit-e096.recit-e096-texte-dabord{grid-template-rows:minmax(0,1fr) auto}
  .recit-e096.recit-e096-texte-dabord > .recit-body{order:-1}
  .recit-e096.recit-e096-texte-dabord > .recit-e096-media{
    order:1;min-height:0;height:clamp(64px,16svh,150px);height:clamp(64px,16dvh,150px)
  }
}
@supports not (container-type:inline-size){
  @media (max-width:700px){
    .recit-e096.recit-e096-texte-dabord{grid-template-rows:minmax(0,1fr) auto}
    .recit-e096.recit-e096-texte-dabord > .recit-body{order:-1}
    .recit-e096.recit-e096-texte-dabord > .recit-e096-media{order:1;min-height:0;height:clamp(64px,16dvh,150px)}
  }
}

/* E096-05 — cibles tactiles selon le pointeur principal, pas la largeur :
   on n'agrandit que lorsqu'un doigt est l'entrée dominante. */
@media (pointer:coarse){
  .recit-e096 .recit-e096-tactile .recit-actions button,
  .recit-e096 .recit-e096-tactile .recit-thread-item,
  .recit-e096 .recit-e096-tactile .recit-trace summary,
  .recit-e096 .recit-e096-tactile .c3a-filter,
  .recit-e096 .recit-e096-tactile input{
    touch-action:manipulation;
    -webkit-tap-highlight-color:transparent;
    min-height:44px;
  }
  .recit-e096 .recit-e096-tactile .recit-actions button{min-width:44px}
}

/* E096-06 — grille d'actions adaptative : sur conteneur étroit, les six
   commandes se répartissent en colonnes égales et « précédent / suivant »
   sont promus en tête. Rien n'est retiré. */
@container recite096 (max-width:46rem){
  .recit-e096 .recit-e096-commandes.recit-actions{
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:6px;
  }
  .recit-e096 .recit-e096-commandes button{width:100%}
  .recit-e096 .recit-e096-commandes button[data-fk="c3a-prev"]{order:-2}
  .recit-e096 .recit-e096-commandes button[data-fk="c3a-next"]{order:-1}
}
@container recite096 (min-width:46.0625rem){
  .recit-e096 .recit-e096-commandes.recit-actions{display:flex;flex-wrap:wrap;gap:8px}
}
@supports not (container-type:inline-size){
  @media (max-width:700px){
    .recit-e096 .recit-e096-commandes.recit-actions{
      display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px
    }
    .recit-e096 .recit-e096-commandes button{width:100%}
    .recit-e096 .recit-e096-commandes button[data-fk="c3a-prev"]{order:-2}
    .recit-e096 .recit-e096-commandes button[data-fk="c3a-next"]{order:-1}
  }
}

/* E096-07 — fil en grille à colonnes égales sous conteneur étroit : les
   points restent tous présents, mais forment une grille nette au lieu d'une
   bande de pastilles irrégulière. */
@container recite096 (max-width:46rem){
  .recit-e096 .recit-e096-fil .recit-thread-list{
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr));
    gap:6px;
  }
  .recit-e096 .recit-e096-fil .recit-thread-list > li{display:flex;min-width:0}
  .recit-e096 .recit-e096-fil .recit-thread-item{width:100%;white-space:normal;overflow-wrap:anywhere}
}
@supports not (container-type:inline-size){
  @media (max-width:700px){
    .recit-e096 .recit-e096-fil .recit-thread-list{
      display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr));gap:6px
    }
    .recit-e096 .recit-e096-fil .recit-thread-list > li{display:flex;min-width:0}
    .recit-e096 .recit-e096-fil .recit-thread-item{width:100%;white-space:normal;overflow-wrap:anywhere}
  }
}

/* E096-08 — césure et mots longs pilotés par le conteneur : aucun identifiant
   ni libellé ne peut élargir la vue, quelle que soit sa largeur intégrée. */
.recit-e096 .recit-e096-cesure :where(
  .view-kicker, .recit-meta, .recit-conf, .recit-timing,
  .recit-sources, .recit-legend, .recit-thread-title
){
  min-width:0;max-width:100%;overflow-wrap:anywhere;word-break:break-word
}
@container recite096 (max-width:46rem){
  .recit-e096 .recit-e096-cesure{overflow-x:clip}
  .recit-e096 .recit-e096-cesure .recit-title,
  .recit-e096 .recit-e096-cesure .recit-context{
    -webkit-hyphens:auto;hyphens:auto;overflow-wrap:anywhere
  }
}

/* E096-09 — ancrage de lecture : le titre visé par le clavier ou un fragment
   n'est plus masqué par un éventuel en-tête collant. */
@container recite096 (max-width:46rem){
  .recit-e096.recit-e096-ancrage > .recit-body{
    scroll-padding-top:calc(12px + env(safe-area-inset-top,0px));
  }
  .recit-e096 .recit-e096-ancrage #recit-point-title{
    scroll-margin-top:calc(12px + env(safe-area-inset-top,0px));
  }
}

/* E096-10 — badge lisible (état écrit, pas seulement stylé) et mouvement
   maîtrisé, sans sélecteur universel. */
.recit-e096-badge{
  display:inline-flex;flex-wrap:wrap;align-items:baseline;gap:5px;
  margin:0 0 10px;padding:3px 9px;
  border:1px dashed var(--line);border-radius:999px;
  color:var(--muted-2);font-size:9px;line-height:1.45;
  max-width:100%;overflow-wrap:anywhere;
}
.recit-e096-badge strong{color:var(--gold-bright);font-weight:600}
.recit-e096[data-e096-motion="reduce"] .recit-e096-commandes,
.recit-e096[data-e096-motion="reduce"] .recit-thread-item,
.recit-e096[data-e096-motion="reduce"] .recit-progress > span{transition:none}
@media (prefers-reduced-motion:reduce){
  .recit-e096 .recit-e096-commandes button,
  .recit-e096 .recit-thread-item,
  .recit-e096 .recit-progress > span{transition:none}
}
`;

/* --- Utilitaires de garde : jamais de throw, jamais d'écrasure de contenu. --- */

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

/* E096-10 — badge unique, déposé dans .recit-body ancres comprises. */
function assureBadge(documentRef, fabrique, corps, texte) {
  if (!corps || typeof documentRef.getElementById !== 'function') return;
  let badge = documentRef.getElementById(ID_BADGE);
  if (!badge || typeof badge.setAttribute !== 'function') {
    if (typeof fabrique !== 'function') return;
    badge = fabrique('p', 'recit-e096-badge');
    if (!badge || typeof badge.setAttribute !== 'function') return;
    badge.id = ID_BADGE;
  }
  badge.textContent = texte;
  if (badge.parentElement !== corps) corps.appendChild(badge);
}

register('E096', (ctx) => {
  try {
    const { stage, layout, css, el, reducedMotion } = ctx;
    void stage;
    if (typeof document === 'undefined' || !layout
        || typeof layout.querySelector !== 'function') return;
    if (typeof css === 'function') css(CSS_ID, CSS);

    /* Racines de la vue. Toutes les écritures sont des classes ou attributs
       préfixés : aucun texte existant n'est modifié. */
    const corps = layout.querySelector('.recit-body');
    const media = layout.querySelector('.recit-media');
    const fil = layout.querySelector('.recit-thread');
    const actions = layout.querySelector('.recit-actions');
    const titre = document.getElementById('recit-point-title')
      || layout.querySelector('.recit-title');
    const contexte = document.getElementById('recit-context')
      || layout.querySelector('.recit-context');

    /* E096-01 — confinement de conteneur. */
    ajouteClasse(layout, 'recit-e096');
    ajouteClasse(layout, 'recit-e096-conteneur');

    /* E096-02 — grille reflowable par le conteneur. */
    ajouteClasse(layout, 'recit-e096-grille');

    /* E096-03 — mesure fluide et échelle typographique de conteneur. */
    ajouteClasse(corps, 'recit-e096-mesure');
    ajouteClasse(corps, 'recit-e096-flux');

    /* E096-04 — priorité au texte, média relégué en bannière. */
    ajouteClasse(layout, 'recit-e096-texte-dabord');
    ajouteClasse(media, 'recit-e096-media');

    /* E096-05 — cibles tactiles (pilote = le pointeur, pas la largeur). */
    ajouteClasse(corps, 'recit-e096-tactile');

    /* E096-06 — grille d'actions adaptative. */
    ajouteClasse(actions, 'recit-e096-commandes');

    /* E096-07 — fil en grille à colonnes égales. */
    ajouteClasse(fil, 'recit-e096-fil');

    /* E096-08 — césure sûre + langue déclarée pour la césure française. */
    ajouteClasse(corps, 'recit-e096-cesure');
    [titre, contexte].forEach((noeud) => {
      if (noeud && typeof noeud.hasAttribute === 'function'
          && !noeud.hasAttribute('lang')) {
        attribut(noeud, 'lang', 'fr');
      }
    });

    /* E096-09 — ancrage sous en-tête collant. */
    ajouteClasse(layout, 'recit-e096-ancrage');

    /* E096-10 — miroir d'état, badge et mouvement réduit (une seule passe). */
    const compact = requete(SEUIL_COMPACT);
    const tactile = requete(REQUETE_TACTILE);
    let reduit = false;
    try { reduit = !!(reducedMotion && typeof reducedMotion === 'function' && reducedMotion()); }
    catch { reduit = false; }

    const regime = compact ? 'compact' : 'large';
    const pointeur = tactile ? 'tactile' : 'fin';
    const mouvement = reduit ? 'reduc' : 'normal';
    attribut(layout, ATTR_MIROIR, `regime:${regime} pointer:${pointeur} motion:${mouvement}`);
    attribut(layout, 'data-e096-motion', mouvement);

    const libelleRegime = compact
      ? 'Affichage compact · une colonne · texte en tête'
      : 'Affichage large · deux colonnes';
    const libellePointeur = tactile
      ? 'cibles tactiles élargies'
      : 'pointeur fin';
    assureBadge(document, el, corps, `Reflow : ${libelleRegime} · ${libellePointeur}.`);
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
