import { register } from './registry.js';

/* V2 lentille E029 — Transitions et mouvement (second regard).
 *
 * La passe 1 (`src/views/recit/E029.js`) portait l'entrée du titre/du contexte/
 * des métadonnées, le remplissage et le curseur de la barre, la directionnalité,
 * le rail du fil, le retour des commandes, la jauge de lecture, le souffle du
 * média, le chemin doré, l'interrupteur de mouvement réduit et le marqueur.
 *
 * Cette passe V2 ne reprend aucun de ces objets. Elle couvre les transitions
 * encore non traitées, toutes dérivées du DOM réel : le surtitre d'étape, la
 * pastille de certitude, la saisie, les filtres, la densité de la barre
 * d'outils, le message « aucun point », la légende, le titre du fil, le
 * changement de repère et la cohérence du mouvement réduit entre les deux
 * passes (qui tournent sur le MÊME DOM).
 *
 * Invariants : un seul register, un seul appel CSS regroupé, classes
 * préfixées `recit-v2-e029-`, identifiant DOM préfixé `v2-e029-` et protégé
 * contre le doublon, zéro écouteur global, zéro minuteur, zéro rAF, zéro réseau,
 * zéro aléa, zéro journalisation. tout est enrichissement non destructif.
 *
 * Les dix chantiers E029-01 … E029-10 sont détaillés dans
 * UNIFIED_AUDIT/RECIT/V2/views/E029.md.
 */

const RACINE = 'recit-v2-e029-racine';

/* Mémoire RAM (jamais dans le DOM) : nom du repère au rendu précédent, source
 * du chantier E029-09. Aucune collision avec la mémoire de la passe 1. */
let dernierRepere = null;

const CSS = `
/* E029-01 — cascade d'entrée du surtitre d'étape : la passe 1 animait le titre,
 * le contexte et la meta mais laissait le surtitre « Étape X / Y » figé. */
.recit-v2-e029-racine .recit-v2-e029-kicker{
  animation:recit-v2-e029-kicker .3s ease-out both;
}
@keyframes recit-v2-e029-kicker{
  from{opacity:0;transform:translateY(-6px)}
  to{opacity:1;transform:none}
}

/* E029-02 — impulsion de la pastille de certitude au changement de point :
 * l'élément est neuf à chaque rendu, l'animation se rejoue sans minuteur. */
.recit-v2-e029-racine .recit-v2-e029-conf{
  transform-origin:center;
  animation:recit-v2-e029-conf .36s ease-out both;
}
@keyframes recit-v2-e029-conf{
  0%{transform:scale(.86);opacity:.45}
  60%{transform:scale(1.06);opacity:1}
  100%{transform:scale(1);opacity:1}
}

/* E029-03 — soulignement glissant du champ de recherche : la taille d'un
 * dégradé en fond d'input pilote l'apparition (fiable sur un élément remplacé,
 * contrairement à un pseudo-élément ). */
.recit-v2-e029-racine .recit-v2-e029-search{
  background-repeat:no-repeat;
  background-position:left bottom;
  background-image:linear-gradient(90deg,var(--gold-bright),transparent);
  background-size:0 2px;
  transition:background-size .24s ease,border-color .2s ease;
}
.recit-v2-e029-racine .recit-v2-e029-search[data-v2-e029-recherche="1"],
.recit-v2-e029-racine .recit-v2-e029-search:focus{
  background-size:100% 2px;
}

/* E029-04 — retour proprioceptif des filtres : la passe 1 ne touchait que les
 * boutons de .recit-actions, pas ceux de la barre C3. */
.recit-v2-e029-racine .recit-v2-e029-filtre{
  transition:transform .16s ease,box-shadow .16s ease;
}
.recit-v2-e029-racine .recit-v2-e029-filtre:active:not(:disabled){
  transform:translateY(1px);
}
.recit-v2-e029-racine .recit-v2-e029-filtre[data-v2-e029-filtre="1"]{
  box-shadow:inset 0 -2px 0 var(--gold-bright);
}

/* E029-05 — densité de la barre d'outils proportionnelle au nombre réel de
 * filtres actifs : un liseré et un retrait glissent quand un filtre est pris. */
.recit-v2-e029-racine .recit-v2-e029-tools{
  border-left:2px solid transparent;
  transition:border-left-color .24s ease,padding-left .24s ease;
}
.recit-v2-e029-racine .recit-v2-e029-tools[data-v2-e029-filtres]:not([data-v2-e029-filtres="0"]){
  border-left-color:var(--gold);
  padding-left:8px;
}

/* E029-06 — révélation du message « aucun point » : le panneau et son bouton
 * de réinitialisation entrent en scène au lieu d'apparaître d'un bloc. */
.recit-v2-e029-racine .recit-v2-e029-empty{
  animation:recit-v2-e029-empty .3s ease-out both;
}
@keyframes recit-v2-e029-empty{
  from{opacity:0;transform:translateY(6px)}
  to{opacity:1;transform:none}
}
.recit-v2-e029-racine .recit-v2-e029-empty .c3a-reset{
  transition:transform .16s ease;
}
.recit-v2-e029-racine .recit-v2-e029-empty .c3a-reset:active{
  transform:scale(.97);
}

/* E029-07 — cascade de la légende : quatre paragraphes révélés en décalé. */
.recit-v2-e029-racine .recit-v2-e029-legend p{
  animation:recit-v2-e029-legende .32s ease-out both;
}
.recit-v2-e029-racine .recit-v2-e029-legend p:nth-child(2){animation-delay:.06s}
.recit-v2-e029-racine .recit-v2-e029-legend p:nth-child(3){animation-delay:.12s}
.recit-v2-e029-racine .recit-v2-e029-legend p:nth-child(4){animation-delay:.18s}
@keyframes recit-v2-e029-legende{
  from{opacity:0;transform:translateY(5px)}
  to{opacity:1;transform:none}
}

/* E029-08 — filet décoratif sous le titre du fil : un simple déploiement
 * horizontal, sans rapport avec le chemin doré de la passe 1 dans le rail. */
.recit-v2-e029-racine .recit-v2-e029-filet{
  display:block;
  height:2px;
  margin-top:4px;
  width:100%;
  background:var(--gold);
  transform-origin:left center;
  animation:recit-v2-e029-filet .4s ease-out both;
}
@keyframes recit-v2-e029-filet{
  from{transform:scaleX(0);opacity:0}
  to{transform:scaleX(1);opacity:1}
}

/* E029-09 — changement de repère : signal distinct de la directionnalité de
 * la passe 1 (qui lisait la progression). Ici on compare le NOM du repère. */
.recit-v2-e029-racine[data-v2-e029-changement="1"] .recit-body{
  animation:recit-v2-e029-repere .38s ease-out both;
}
@keyframes recit-v2-e029-repere{
  from{opacity:.5;transform:translateX(10px)}
  to{opacity:1;transform:none}
}

/* E029-10 — cohérence du mouvement réduit : portée limitée aux seules classes
 * de cette lentille, en miroir de l'état posé par la passe 1 sur le même nœud.
 * Aucun !important global : les couleurs et les textes restent intacts. */
.recit-v2-e029-racine[data-v2-e029-motion="reduit"] .recit-v2-e029-kicker,
.recit-v2-e029-racine[data-v2-e029-motion="reduit"] .recit-v2-e029-conf,
.recit-v2-e029-racine[data-v2-e029-motion="reduit"] .recit-v2-e029-search,
.recit-v2-e029-racine[data-v2-e029-motion="reduit"] .recit-v2-e029-filtre,
.recit-v2-e029-racine[data-v2-e029-motion="reduit"] .recit-v2-e029-tools,
.recit-v2-e029-racine[data-v2-e029-motion="reduit"] .recit-v2-e029-empty,
.recit-v2-e029-racine[data-v2-e029-motion="reduit"] .recit-v2-e029-empty .c3a-reset,
.recit-v2-e029-racine[data-v2-e029-motion="reduit"] .recit-v2-e029-legend p,
.recit-v2-e029-racine[data-v2-e029-motion="reduit"] .recit-v2-e029-filet,
.recit-v2-e029-racine[data-v2-e029-motion="reduit"] .recit-body{
  animation:none;
  transition:none;
  background-size:100% 2px;
}
@media (prefers-reduced-motion:reduce){
  .recit-v2-e029-racine .recit-v2-e029-kicker,
  .recit-v2-e029-racine .recit-v2-e029-conf,
  .recit-v2-e029-racine .recit-v2-e029-search,
  .recit-v2-e029-racine .recit-v2-e029-filtre,
  .recit-v2-e029-racine .recit-v2-e029-tools,
  .recit-v2-e029-racine .recit-v2-e029-empty,
  .recit-v2-e029-racine .recit-v2-e029-empty .c3a-reset,
  .recit-v2-e029-racine .recit-v2-e029-legend p,
  .recit-v2-e029-racine .recit-v2-e029-filet,
  .recit-v2-e029-racine .recit-body{
    animation:none;
    transition:none;
    background-size:100% 2px;
  }
}
`;

/* Vrai nœud d'élément (nodeType 1) — écarte textes et commentaires. */
function present(node) {
  return !!(node && node.nodeType === 1);
}

/* Ajoute une classe sans jamais lever d'erreur si le nœud est absent. */
function marquer(node, className) {
  if (!present(node) || !node.classList || typeof node.classList.add !== 'function') return;
  try { node.classList.add(className); } catch { /* enrichissement facultatif */ }
}

/* Pose un attribut data-* réservé à la lentille (jamais un id de la passe 1). */
function data(node, name, value) {
  if (!present(node)) return;
  try { node.setAttribute(`data-v2-e029-${name}`, String(value)); } catch { /* facultatif */ }
}

/* Lit « Étape X / Y » dans le surtitre sans modifier son texte. */
function lireEtape(kicker) {
  const texte = String((kicker && kicker.textContent) || '');
  const trouve = texte.match(/(\d+)\s*\/\s*(\d+)/);
  return trouve ? { etape: trouve[1], total: trouve[2] } : null;
}

/* Isole le nom du repère dans « Fil du repère · <nom> ». */
function nomRepere(title) {
  const texte = String((title && title.textContent) || '');
  const parties = texte.split('·');
  const nom = (parties.length > 1 ? parties[parties.length - 1] : '').trim();
  return nom || null;
}

/* Compte les filtres réellement pressés dans la barre C3. */
function compterFiltres(tools) {
  if (!present(tools) || typeof tools.querySelectorAll !== 'function') return 0;
  return tools.querySelectorAll('.c3a-filter[aria-pressed="true"]').length;
}

register('E029', (ctx) => {
  /* Garde ultime : un DOM inattendu ne doit jamais interrompre le rendu. */
  try {
    if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
    const { layout, css, el, reducedMotion } = ctx;

    /* Une seule injection CSS pour toute la lentille, puis ancrage de portée. */
    if (typeof css === 'function') {
      try { css('recit-v2-e029', CSS); } catch { /* rendu préservé coûte que coûte */ }
    }
    marquer(layout, RACINE);

    /* --- E029-01 : surtitre d'étape --------------------------------------- */
    const kicker = layout.querySelector('.view-kicker');
    const etape = lireEtape(kicker);
    if (present(kicker)) {
      marquer(kicker, 'recit-v2-e029-kicker');
      if (etape) data(kicker, 'etape', `${etape.etape}/${etape.total}`);
    }

    /* --- E029-02 : pastille de certitude ---------------------------------- */
    const conf = layout.querySelector('.recit-conf');
    if (present(conf)) {
      marquer(conf, 'recit-v2-e029-conf');
      data(conf, 'conf', String(conf.textContent || '').trim());
    }

    /* --- E029-03 : recherche ---------------------------------------------- */
    const recherche = layout.querySelector('.c3a-search');
    if (present(recherche)) {
      marquer(recherche, 'recit-v2-e029-search');
      data(recherche, 'recherche', String(recherche.value || '').trim() ? '1' : '0');
    }

    /* --- E029-04 : filtres ------------------------------------------------ */
    const filtres = layout.querySelectorAll('.c3a-filter');
    Array.prototype.forEach.call(filtres, (filtre) => {
      marquer(filtre, 'recit-v2-e029-filtre');
      const presse = filtre.getAttribute('aria-pressed');
      data(filtre, 'filtre', presse === 'true' ? '1' : '0');
    });

    /* --- E029-05 : densité de la barre d'outils --------------------------- */
    const outils = layout.querySelector('.c3a-tools');
    if (present(outils)) {
      marquer(outils, 'recit-v2-e029-tools');
      data(outils, 'filtres', String(compterFiltres(outils)));
    }

    /* --- E029-06 : message « aucun point » -------------------------------- */
    const vide = layout.querySelector('.c3a-empty');
    if (present(vide)) marquer(vide, 'recit-v2-e029-empty');

    /* --- E029-07 : légende ------------------------------------------------ */
    const legende = layout.querySelector('.recit-legend');
    if (present(legende)) marquer(legende, 'recit-v2-e029-legend');

    /* --- E029-08 : filet sous le titre du fil ----------------------------- */
    const titreFil = layout.querySelector('.recit-thread-title');
    if (present(titreFil) && typeof el === 'function') {
      let filet = layout.querySelector('#v2-e029-filet');
      if (!filet) {
        filet = el('span', 'recit-v2-e029-filet', '');
        filet.id = 'v2-e029-filet';
        filet.setAttribute('aria-hidden', 'true');
        titreFil.appendChild(filet);
      }
    }

    /* --- E029-09 : changement de repère ----------------------------------- */
    const repere = nomRepere(titreFil);
    const change = repere !== null && dernierRepere !== null && repere !== dernierRepere;
    data(layout, 'changement', change ? '1' : '0');
    dernierRepere = repere;

    /* --- E029-10 : cohérence du mouvement réduit -------------------------- */
    const reduit = typeof reducedMotion === 'function' && reducedMotion();
    const passe1 = layout.getAttribute('data-e029-motion');
    const statut = (reduit || passe1 === 'reduit') ? 'reduit' : 'normal';
    data(layout, 'motion', statut);
  } catch {
    /* Enrichissement non destructif : aucun défaut ne doit casser le rendu. */
  }
});
