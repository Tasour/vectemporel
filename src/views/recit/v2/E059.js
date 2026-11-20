import { register } from './registry.js';

/* V2 lentille E059 — « Transitions et mouvement » (complément de la passe 1).
   Dix chantiers V2 neufs, distincts de ceux de la passe 1, tous implémentés ici :
   E059-01 … E059-10. La passe 1 animait déjà l'entrée du point, la barre de
   progression, le voile du média, la cascade du fil, le halo du point courant,
   l'incitant « suivant », le témoin de lecture, sa bascule, la traçabilité et
   la politique globale du mouvement. La V2 cible des éléments différents :
   barre d'outils et statut, groupes de filtres, retour pressé des commandes,
   pastille de certitude, soulignement du titre, focus clavier du fil, état vide,
   changement de repère, bascule V2 autonome et politique mouvement réduit V2.

   Préfixes : classes recit-v2-e059-, ids DOM v2-e059- (jamais les ids e059- de
   la passe 1, qui tourne sur le MÊME DOM). Zéro réseau, zéro console, zéro aléa.
   Enrichissement non destructif : sans ce module, la vue reste intégralement
   lisible. Chaque chantier est enveloppé dans guard() : aucun throw ne casse le
   rendu. Rapport : UNIFIED_AUDIT/RECIT/V2/views/E059.md. */

const CSS = `
/* E059-01 — Fondu d'entrée de la barre d'outils et du statut de filtrage. */
@keyframes recit-v2-e059-tools-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.recit-v2-e059-actif.recit-v2-e059-change-point .recit-v2-e059-corps .recit-v2-e059-tools{animation:recit-v2-e059-tools-in .42s ease-out both}
.recit-v2-e059-actif.recit-v2-e059-change-point .recit-v2-e059-corps .recit-v2-e059-status{animation:recit-v2-e059-tools-in .42s ease-out .06s both}

/* E059-02 — Cascade d'entrée des groupes de filtres. */
@keyframes recit-v2-e059-group-in{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}
.recit-v2-e059-actif.recit-v2-e059-change-point .recit-v2-e059-corps .recit-v2-e059-group{animation:recit-v2-e059-group-in .32s ease-out both;animation-delay:calc(var(--v2-e059-g,0)*55ms)}

/* E059-03 — Retour tactile pressé sur les commandes. */
.recit-v2-e059-actif .recit-v2-e059-corps .recit-v2-e059-action{transition:transform .12s ease-out}
.recit-v2-e059-actif .recit-v2-e059-corps .recit-v2-e059-action:active{transform:scale(.96)}

/* E059-04 — Transition de la pastille de certitude. */
@keyframes recit-v2-e059-conf-in{from{opacity:0;transform:scale(.86)}to{opacity:1;transform:none}}
.recit-v2-e059-actif.recit-v2-e059-change-point .recit-v2-e059-corps .recit-v2-e059-conf{animation:recit-v2-e059-conf-in .4s ease-out both}

/* E059-05 — Soulignement animé du titre du point. */
.recit-layout .recit-v2-e059-corps .recit-v2-e059-titre{position:relative}
.recit-v2-e059-titre::after{content:"";position:absolute;left:0;bottom:-4px;width:100%;height:2px;background:var(--gold);transform:scaleX(1);transform-origin:left;pointer-events:none}
@keyframes recit-v2-e059-underline{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.recit-v2-e059-actif.recit-v2-e059-change-point .recit-v2-e059-titre::after{animation:recit-v2-e059-underline .5s ease-out both}

/* E059-06 — Repère de focus clavier animé sur le fil. */
@keyframes recit-v2-e059-focus-pulse{0%,100%{box-shadow:0 0 0 0 rgba(230,185,111,0)}50%{box-shadow:0 0 0 3px rgba(230,185,111,.35)}}
.recit-v2-e059-actif .recit-v2-e059-corps .recit-v2-e059-thread-item:focus-visible{animation:recit-v2-e059-focus-pulse 1.3s ease-in-out infinite}

/* E059-07 — Apparition en fondu de l'état vide (résultats filtrés). */
@keyframes recit-v2-e059-empty-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
.recit-v2-e059-actif .recit-v2-e059-corps .recit-v2-e059-empty{animation:recit-v2-e059-empty-in .36s ease-out both}

/* E059-08 — Balayage du panneau au changement de repère (event). */
@keyframes recit-v2-e059-repere-in{from{opacity:.45;transform:translateY(8px)}to{opacity:1;transform:none}}
.recit-v2-e059-actif.recit-v2-e059-change-repere .recit-v2-e059-corps.recit-v2-e059-bloc{animation:recit-v2-e059-repere-in .5s ease-out both}

/* E059-09 — Bascule « Transitions V2 », contrôle tangible et accessible. */
.recit-v2-e059-btn{min-height:36px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--ink-soft);font-size:10px;cursor:pointer;transition:border-color .16s linear,color .16s linear,background-color .16s linear}
.recit-v2-e059-btn[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.12)}
.recit-v2-e059-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}

/* E059-10 — Politique mouvement réduit V2 et filet de sécurité média. */
@media (prefers-reduced-motion:reduce){
  .recit-v2-e059-btn{transition:none!important}
  .recit-v2-e059-actif .recit-v2-e059-corps .recit-v2-e059-action{transition:none!important}
  .recit-v2-e059-titre::after{transform:scaleX(1);animation:none!important}
}
`;

/* État de module — survit aux reconstructions du DOM par la coque. */
let titrePointPrecedent = null; /* détection du vrai changement de point (E059-01 à 05) */
let titreReperePrecedent = null; /* E059-08 — détection du changement de repère */
let mouvementV2Active = true; /* préférence de la bascule V2 (E059-09) */
let reductionV2 = false; /* préférence système mémorisée (E059-10) */

/* Chaque chantier est isolé : un échec n'en empêche aucun autre et ne casse
   jamais le rendu (le registre neutralise déjà une lentille fautive). */
function guard(fn) {
  try { return fn(); } catch { return null; }
}

function one(root, selector) {
  return guard(() => (root && typeof root.querySelector === 'function')
    ? root.querySelector(selector) : null);
}

function all(root, selector) {
  return guard(() => (root && typeof root.querySelectorAll === 'function')
    ? Array.from(root.querySelectorAll(selector)) : []) || [];
}

function make(ctx, tag, className, text) {
  if (ctx && typeof ctx.el === 'function') {
    const node = guard(() => ctx.el(tag, className, text));
    if (node) return node;
  }
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function addCls(node, className) {
  if (node && node.classList && typeof node.classList.add === 'function'
      && !node.classList.contains(className)) node.classList.add(className);
}

function setAttr(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

/* Applique l'état effectif des transitions V2 au cadre courant. La préférence
   système (réduction) l'emporte toujours sur la bascule utilisateur. */
function appliquerEtatV2(cadre) {
  if (!cadre || !cadre.classList) return;
  const actif = mouvementV2Active && !reductionV2;
  if (actif) cadre.classList.add('recit-v2-e059-actif');
  else cadre.classList.remove('recit-v2-e059-actif');
  setAttr(cadre, 'data-v2-e059-motion', reductionV2 ? 'reduce' : 'normal');
}

/* Libellé de la bascule, dérivé de l'état (jamais porté par la seule couleur). */
function libelleBascule() {
  return mouvementV2Active ? 'Transitions V2 : désactiver' : 'Transitions V2 : activer';
}

function synchroniseBascule(bouton) {
  if (!bouton) return;
  const libelle = libelleBascule();
  bouton.textContent = libelle;
  setAttr(bouton, 'aria-label', libelle);
  setAttr(bouton, 'aria-pressed', mouvementV2Active ? 'true' : 'false');
}

/* E059-01 — entrée en fondu de la barre d'outils et du statut de filtrage. */
function entreesOutils(env) {
  const corps = one(env.racine, '.recit-body');
  if (!corps) return '';
  addCls(corps, 'recit-v2-e059-corps');
  const outils = one(corps, '.c3a-tools');
  const statut = one(corps, '.c3a-status');
  if (outils) addCls(outils, 'recit-v2-e059-tools');
  if (statut) addCls(statut, 'recit-v2-e059-status');
  return (outils || statut) ? 'outils:1' : '';
}

/* E059-02 — cascade des groupes de filtres, index plafonné pour rester rapide. */
function cascadeGroupes(env) {
  const groupes = all(env.racine, '.c3a-tools .c3a-group');
  groupes.forEach((groupe, i) => {
    addCls(groupe, 'recit-v2-e059-group');
    guard(() => groupe.style.setProperty('--v2-e059-g', String(Math.min(i, 6))));
  });
  return groupes.length ? `groupes:${groupes.length}` : '';
}

/* E059-03 — retour tactile pressé sur les commandes (:active, translate en moins). */
function retourPresse(env) {
  const boutons = all(env.racine, '.recit-actions button');
  boutons.forEach((bouton) => addCls(bouton, 'recit-v2-e059-action'));
  return boutons.length ? `actions:${boutons.length}` : '';
}

/* E059-04 — transition de la pastille de certitude. */
function pastilleCertitude(env) {
  const conf = one(env.racine, '.recit-conf');
  if (!conf) return '';
  addCls(conf, 'recit-v2-e059-conf');
  return 'conf:1';
}

/* E059-05 — soulignement animé du titre du point. */
function soulignementTitre(env) {
  const titre = one(env.racine, '#recit-point-title') || one(env.racine, '.recit-title');
  if (!titre) return '';
  addCls(titre, 'recit-v2-e059-titre');
  return 'titre:1';
}

/* E059-06 — repère de focus clavier animé sur le fil (renfort de :focus-visible). */
function focusClavierFil(env) {
  const items = all(env.racine, '.recit-thread-item');
  items.forEach((item) => addCls(item, 'recit-v2-e059-thread-item'));
  return items.length ? `fil:${items.length}` : '';
}

/* E059-07 — apparition en fondu de l'état vide (aucun résultat de filtrage). */
function etatVide(env) {
  const vide = one(env.racine, '#c3a-empty');
  if (!vide) return '';
  addCls(vide, 'recit-v2-e059-empty');
  return 'vide:1';
}

/* E059-08 — balayage du panneau déclenché par un vrai changement de repère,
   détecté via .recit-thread-title (texte dérivé du DOM, jamais inventé). */
function changementRepere(env) {
  const corps = one(env.racine, '.recit-body');
  if (!corps) return '';
  addCls(corps, 'recit-v2-e059-bloc');
  return env.changeRepere ? 'repere:1' : 'repere:0';
}

/* E059-09 — bascule indépendante des transitions V2 (aria-pressed légitime),
   attachée une seule fois et conservée entre les rendus. */
function basculeV2(env) {
  const actions = one(env.racine, '.recit-actions');
  if (!actions) return '';
  let bouton = one(actions, '#v2-e059-move-btn');
  if (!bouton || bouton.parentElement !== actions) {
    bouton = make(env.ctx, 'button', 'recit-v2-e059-btn');
    bouton.id = 'v2-e059-move-btn';
    bouton.type = 'button';
    actions.appendChild(bouton);
  }
  synchroniseBascule(bouton);
  if (bouton.getAttribute('data-v2-e059-bound') !== '1') {
    setAttr(bouton, 'data-v2-e059-bound', '1');
    guard(() => bouton.addEventListener('click', () => {
      mouvementV2Active = !mouvementV2Active;
      const cadre = guard(() => document.querySelector('.recit-layout'));
      appliquerEtatV2(cadre);
      synchroniseBascule(guard(() => document.getElementById('v2-e059-move-btn')));
    }));
  }
  return `bascule:${mouvementV2Active ? 1 : 0}`;
}

/* E059-10 — politique centralisée du mouvement réduit V2 : l'activation est
   réappliquée ici et l'attribut miroir est positionné en aval. */
function politiqueMouvement(env) {
  appliquerEtatV2(env.racine);
  return `motion:${reductionV2 ? 'reduce' : 'normal'}`;
}

register('E059', (ctx) => {
  try {
    if (!ctx || typeof document === 'undefined') return;
    const { layout, stage, css, reducedMotion } = ctx;
    if (!layout || typeof layout.querySelector !== 'function') return;

    /* Une seule feuille de styles, tous chantiers V2 confondus. */
    if (typeof css === 'function') guard(() => css('recit-v2-e059', CSS));

    const racine = layout || stage;

    /* Préférence système lue une seule fois par rendu (ctx.reducedMotion gère
       lui-même son try/catch). */
    reductionV2 = guard(() => (typeof reducedMotion === 'function'
      && reducedMotion())) ? true : false;

    /* Détection d'un vrai changement de point : le texte du titre reste stable
       lors d'un simple filtrage ou d'une bascule de lecture. */
    const titrePoint = one(racine, '#recit-point-title') || one(racine, '.recit-title');
    const textePoint = titrePoint ? String(titrePoint.textContent || '').trim() : '';
    const changePoint = textePoint !== titrePointPrecedent;
    titrePointPrecedent = textePoint;
    if (changePoint) addCls(racine, 'recit-v2-e059-change-point');

    /* Détection d'un changement de repère via le titre du fil (contient le
       titre de l'événement), distinct du changement de point. */
    const titreRepere = one(racine, '.recit-thread-title');
    const texteRepere = titreRepere ? String(titreRepere.textContent || '').trim() : '';
    const changeRepere = texteRepere !== titreReperePrecedent;
    titreReperePrecedent = texteRepere;
    if (changeRepere) addCls(racine, 'recit-v2-e059-change-repere');

    /* La classe d'activation est posée avant les chantiers : toutes les règles
       CSS qui en dépendent sont effectives dès ce rendu. */
    appliquerEtatV2(racine);

    const jetons = [];
    const env = { racine, ctx, changePoint, changeRepere };
    const jobs = [
      () => entreesOutils(env),
      () => cascadeGroupes(env),
      () => retourPresse(env),
      () => pastilleCertitude(env),
      () => soulignementTitre(env),
      () => focusClavierFil(env),
      () => etatVide(env),
      () => changementRepere(env),
      () => basculeV2(env),
      () => politiqueMouvement(env),
    ];
    jobs.forEach((job) => {
      const jeton = guard(job);
      if (jeton) jetons.push(jeton);
    });

    /* Miroir réécrit une seule fois, après la collecte des jetons. */
    setAttr(racine, 'data-v2-e059-mouvement', jetons.join(' '));
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
