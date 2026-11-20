import { register } from './registry.js';

/* Lentille E059 — « Transitions et mouvement » de la vue Récit.
 *
 * Dix chantiers concrets et distincts (E059-01 … E059-10), tous implémentés
 * ici. Rapport : UNIFIED_AUDIT/RECIT/views/E059.md. Lectures seules :
 * src/views/recit.js, src/views/recit/registry.js, src/views/recit/index.js,
 * src/views/_diagnostics.js.
 *
 * La coque reconstruisant #app à chaque rendu (recit.js appelle
 * runEnhancements en fin de renderRecit), les nœuds de cette lentille sont
 * recréés à chaque point : les animations CSS jouent donc naturellement à
 * l'apparition d'un nouveau point. L'état qui doit survivre aux reconstructions
 * (préférence d'animation, titre du point précédent) vit dans des variables de
 * module, comme dans E001.
 *
 * Contrat respecté : UN SEUL register('E059', …), UN SEUL css('recit-e059', …),
 * toutes classes préfixées recit-e059-, tous ids créés préfixés e059- et
 * uniques, tout en français, zéro journalisation, réseau, aléa ni rAF.
 * Chaque chantier est enveloppé dans guard() : jamais de throw, jamais de
 * casse du rendu. Enrichissement non destructif : sans JS, la vue reste lisible.
 *
 * Placement des nœuds porteurs d'un id e059- : .recit-media (voile), les
 * boutons .recit-actions (incitant, témoin, bascule). Aucun n'est enfant
 * direct de stage / layout / body, donc le masque diagnostic de
 * _diagnostics.js (qui ne vise que ces trois parents) ne les touche pas.
 */

const CSS_ID = 'recit-e059';

/* État de module — survit aux reconstructions du DOM par la coque. */
let titrePrecedent = null; /* pour détecter un vrai changement de point (E059-01) */
let animationsActivees = true; /* préférence utilisateur de la bascule (E059-08) */
let reductionCourante = false; /* préférence système, mémorisée (E059-10) */

/* Une seule feuille, un seul appel. Toutes les animations sont scopées sous
   .recit-e059-actif : quand l'utilisateur désactive les animations (E059-08)
   ou que le système demande mouvement réduit (E059-10), la classe n'est pas
   posée et aucun mouvement ne joue. Aucune information n'est portée par la
   seule couleur : la bascule s'explicite par son libellé et aria-pressed. */
const CSS = `
/* E059-01 — entrée animée du point (titre + métadonnées). */
@keyframes recit-e059-titre-in{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:none}}
@keyframes recit-e059-meta-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
.recit-e059-actif.recit-e059-change-point .recit-e059-entree .recit-title{animation:recit-e059-titre-in .46s ease-out both}
.recit-e059-actif.recit-e059-change-point .recit-e059-entree .recit-meta,
.recit-e059-actif.recit-e059-change-point .recit-e059-entree .recit-timing{animation:recit-e059-meta-in .5s ease-out .08s both}

/* E059-02 — remplissage animé de la barre de progression. */
@keyframes recit-e059-fill{from{width:0}to{width:var(--e059-progress,100%)}}
.recit-e059-actif .recit-e059-progress>span{animation:recit-e059-fill .68s ease-out both}

/* E059-03 — voile de transition balayant le média + apparition de l'image. */
.recit-e059-media{position:relative;overflow:hidden}
.recit-e059-veil{position:absolute;inset:0;z-index:2;pointer-events:none;background:linear-gradient(105deg,transparent 32%,rgba(230,185,111,.17) 50%,transparent 68%)}
@keyframes recit-e059-veil{from{opacity:.9;transform:translateX(-100%)}to{opacity:0;transform:translateX(100%)}}
@keyframes recit-e059-img-in{from{opacity:.55;transform:scale(1.02)}to{opacity:1;transform:none}}
.recit-e059-actif.recit-e059-change-point .recit-e059-veil{animation:recit-e059-veil .82s ease-out both}
.recit-e059-actif.recit-e059-change-point .recit-e059-media img{animation:recit-e059-img-in .72s ease-out both}

/* E059-04 — arrivée en cascade des items du fil + réaction au survol. */
@keyframes recit-e059-fil-in{from{opacity:0;transform:translateX(-7px)}to{opacity:1;transform:none}}
.recit-e059-actif.recit-e059-change-point .recit-e059-fil .recit-e059-fil-item{animation:recit-e059-fil-in .34s ease-out both;animation-delay:calc(var(--e059-i,0)*16ms)}
.recit-e059-actif .recit-e059-fil .recit-e059-fil-item{transition:transform .16s ease-out,border-color .16s linear,color .16s linear}
.recit-e059-actif .recit-e059-fil .recit-e059-fil-item:hover{transform:translateX(2px)}

/* E059-05 — halo pulsé sur le point courant du fil (décoratif). */
.recit-e059-courant{position:relative}
@keyframes recit-e059-pulse{0%,100%{box-shadow:0 0 0 0 rgba(230,185,111,0)}50%{box-shadow:0 0 0 3px rgba(230,185,111,.3)}}
.recit-e059-actif .recit-e059-courant::after{content:"";position:absolute;inset:-1px;border-radius:inherit;pointer-events:none;animation:recit-e059-pulse 2.1s ease-in-out infinite}

/* E059-06 — incitant animé vers le point suivant. */
.recit-e059-cue{display:inline-block;margin-left:3px;color:var(--gold-bright);font-size:14px;line-height:1;pointer-events:none}
@keyframes recit-e059-nudge{0%,100%{transform:translateX(0)}50%{transform:translateX(3px)}}
.recit-e059-actif .recit-e059-cue{animation:recit-e059-nudge 1.4s ease-in-out infinite}

/* E059-07 — témoin pulsé de la lecture automatique. */
.recit-e059-dot{display:inline-block;width:6px;height:6px;margin-left:5px;border-radius:50%;background:var(--gold-bright);vertical-align:middle;pointer-events:none}
@keyframes recit-e059-dot-pulse{0%,100%{opacity:.45;transform:scale(.85)}50%{opacity:1;transform:scale(1.15)}}
.recit-e059-actif.recit-e059-lecture .recit-e059-dot{animation:recit-e059-dot-pulse 1.1s ease-in-out infinite}

/* E059-08 — bascule « animations », contrôle tangible et accessible. */
.recit-e059-btn{min-height:36px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--ink-soft);font-size:10px;cursor:pointer;transition:border-color .16s linear,color .16s linear,background-color .16s linear}
.recit-e059-btn[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.12)}
.recit-e059-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}

/* E059-09 — révélation en douceur de la traçabilité et de la légende. */
@keyframes recit-e059-reveal{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@keyframes recit-e059-trace-open{from{opacity:0}to{opacity:1}}
.recit-e059-actif.recit-e059-change-point .recit-e059-reveal{animation:recit-e059-reveal .5s ease-out both}
.recit-e059-actif .recit-trace[open] .recit-e059-trace-contenu{animation:recit-e059-trace-open .28s ease-out both}

/* E059-10 — garde-fou mouvement réduit (filet de sécurité si le réglage
   système change en cours de session : la classe actif est de toute façon
   retirée au rendu, ce bloc couvre le cas d'un changement à chaud). */
@media (prefers-reduced-motion:reduce){
  .recit-e059-btn{transition:none!important}
  .recit-e059-veil,.recit-e059-cue,.recit-e059-dot,.recit-e059-courant::after{animation:none!important}
}
`;

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

/* Applique l'état effectif des animations au cadare courant. */
function appliquerEtat(cadre) {
  if (!cadre || !cadre.classList) return;
  const actif = animationsActivees && !reductionCourante;
  if (actif) cadre.classList.add('recit-e059-actif');
  else cadre.classList.remove('recit-e059-actif');
  setAttr(cadre, 'data-e059-anim', animationsActivees ? 'on' : 'off');
}

/* E059-01 — entrée animée du point, déclenchée seulement sur un vrai
   changement de point (pas sur un simple changement de filtre). */
function entreePoint(env) {
  if (!env.change) return '';
  addCls(env.layout, 'recit-e059-change-point');
  addCls(one(env.layout, '.recit-body'), 'recit-e059-entree');
  return 'entree:1';
}

/* E059-02 — la largeur cible est passée en variable CSS pour l'animation. */
function progression(env) {
  const bar = one(env.layout, '.recit-progress');
  const fill = bar && one(bar, 'span');
  if (!bar || !fill) return '';
  let pct = 0;
  const largeur = fill.style && fill.style.width;
  if (largeur) {
    const valeur = parseFloat(largeur);
    if (!Number.isNaN(valeur)) pct = Math.max(0, Math.min(100, valeur));
  }
  guard(() => bar.style.setProperty('--e059-progress', `${pct}%`));
  addCls(bar, 'recit-e059-progress');
  return `prog:${Math.round(pct)}`;
}

/* E059-03 — voile de balayage déposé dans le média, recréé à chaque point. */
function mediaVeil(env) {
  const media = one(env.layout, '.recit-media');
  if (!media) return '';
  addCls(media, 'recit-e059-media');
  if (!env.change) return 'media:0';
  let veil = one(media, '#e059-media-veil');
  if (!veil || veil.parentElement !== media) {
    veil = make(env.ctx, 'div', 'recit-e059-veil');
    veil.id = 'e059-media-veil';
    setAttr(veil, 'aria-hidden', 'true');
    media.appendChild(veil);
  }
  return 'media:1';
}

/* E059-04 — cascade des items du fil, index plafonné pour rester rapide. */
function filCascade(env) {
  const list = one(env.layout, '#c3a-thread') || one(env.layout, '.recit-thread-list');
  if (!list) return '';
  addCls(list, 'recit-e059-fil');
  const items = all(list, '.recit-thread-item');
  items.forEach((item, i) => {
    guard(() => item.style.setProperty('--e059-i', String(Math.min(i, 24))));
    addCls(item, 'recit-e059-fil-item');
  });
  return `fil:${items.length}`;
}

/* E059-05 — halo sur l'item courant du fil. */
function filCourant(env) {
  const courant = one(env.layout, '.recit-thread-item.is-current')
    || one(env.layout, '.recit-thread-item[aria-current="step"]');
  if (!courant) return '';
  addCls(courant, 'recit-e059-courant');
  return 'courant:1';
}

/* E059-06 — incitant « › » sur le bouton Point suivant, seulement s'il est
   actif ; le pseudo-contenu est aria-hidden et ne change pas le nom du bouton. */
function incitantSuivant(env) {
  const suivant = one(env.layout, '.recit-actions button[data-fk="c3a-next"]');
  if (!suivant || suivant.disabled) return '';
  if (!one(suivant, '#e059-next-cue')) {
    const cue = make(env.ctx, 'span', 'recit-e059-cue', '›');
    cue.id = 'e059-next-cue';
    setAttr(cue, 'aria-hidden', 'true');
    suivant.appendChild(cue);
  }
  return 'suivant:1';
}

/* E059-07 — témoin pulsé quand la lecture automatique est en cours. */
function temoinLecture(env) {
  const play = one(env.layout, '.recit-play');
  if (!play) return '';
  if (play.getAttribute('aria-pressed') !== 'true') return 'lecture:0';
  addCls(env.layout, 'recit-e059-lecture');
  if (!one(play, '#e059-play-dot')) {
    const dot = make(env.ctx, 'span', 'recit-e059-dot');
    dot.id = 'e059-play-dot';
    setAttr(dot, 'aria-hidden', 'true');
    play.appendChild(dot);
  }
  return 'lecture:1';
}

/* Libellé de la bascule, dérivé de l'état (jamais porté par la seule couleur). */
function libelleBascule() {
  return animationsActivees ? 'Animations : désactiver' : 'Animations : activer';
}

function synchroniseBascule(bouton) {
  if (!bouton) return;
  const libelle = libelleBascule();
  bouton.textContent = libelle;
  setAttr(bouton, 'aria-label', libelle);
  setAttr(bouton, 'aria-pressed', animationsActivees ? 'true' : 'false');
}

/* E059-08 — bascule indépendante d'activation des animations (aria-pressed
   légitime), attachée une seule fois et conservée entre les rendus. */
function basculeAnimations(env) {
  const actions = one(env.layout, '.recit-actions');
  if (!actions) return '';
  let bouton = one(actions, '#e059-motion-btn');
  if (!bouton || bouton.parentElement !== actions) {
    bouton = make(env.ctx, 'button', 'recit-e059-btn');
    bouton.id = 'e059-motion-btn';
    bouton.type = 'button';
    actions.appendChild(bouton);
  }
  synchroniseBascule(bouton);
  if (bouton.getAttribute('data-e059-bound') !== '1') {
    setAttr(bouton, 'data-e059-bound', '1');
    bouton.addEventListener('click', () => {
      animationsActivees = !animationsActivees;
      const cadre = guard(() => document.querySelector('.recit-layout'));
      appliquerEtat(cadre);
      synchroniseBascule(guard(() => document.getElementById('e059-motion-btn')));
    });
  }
  return `bascule:${animationsActivees ? 1 : 0}`;
}

/* E059-09 — apparition en douceur de la traçabilité et de la légende, et
   fondu du contenu du <details> à l'ouverture. */
function revelations(env) {
  let compte = 0;
  const trace = one(env.layout, '.recit-trace');
  if (trace) {
    addCls(trace, 'recit-e059-reveal');
    addCls(one(trace, 'p'), 'recit-e059-trace-contenu');
    compte += 1;
  }
  const legend = one(env.layout, '.recit-legend');
  if (legend) {
    addCls(legend, 'recit-e059-reveal');
    compte += 1;
  }
  return `reveal:${compte}`;
}

/* E059-10 — politique centralisée du mouvement : préférence système lue une
   fois par rendu, classe d'activation posée en amont, état consolidé dans un
   attribut miroir unique et compact. */
function politiqueMouvement(env) {
  setAttr(env.layout, 'data-e059-motion', env.reduced ? 'reduce' : 'normal');
  appliquerEtat(env.layout);
  return `motion:${env.reduced ? 'reduce' : 'normal'}`;
}

register('E059', (ctx) => {
  if (!ctx) return;
  const { stage, layout, css } = ctx;

  /* Une seule feuille de styles, tous chantiers confondus. */
  if (typeof css === 'function') guard(() => css(CSS_ID, CSS));

  const racine = layout || stage;
  if (!racine || typeof racine.querySelector !== 'function') return;

  /* Préférence système, lue une seule fois par rendu et mémorisée pour la
     bascule. ctx.reducedMotion() gère lui-même son propre try/catch. */
  reductionCourante = guard(() => (typeof ctx.reducedMotion === 'function'
    && ctx.reducedMotion())) ? true : false;

  /* Détection d'un vrai changement de point : le texte du titre est stable
     lors d'un simple filtrage (c3a-filter) ou d'une bascule de lecture. */
  const titre = one(racine, '#recit-point-title') || one(racine, '.recit-title');
  const texteTitre = titre ? String(titre.textContent || '').trim() : '';
  const change = texteTitre !== titrePrecedent;
  titrePrecedent = texteTitre;

  /* La classe d'activation est posée avant les chantiers : toutes les règles
     CSS qui en dépendent sont ainsi effectives dès ce rendu. */
  if (animationsActivees && !reductionCourante) addCls(racine, 'recit-e059-actif');

  const tokens = [];
  const env = { stage, layout: racine, ctx, change, reduced: reductionCourante, tokens };
  const jobs = [
    () => entreePoint(env),
    () => progression(env),
    () => mediaVeil(env),
    () => filCascade(env),
    () => filCourant(env),
    () => incitantSuivant(env),
    () => temoinLecture(env),
    () => basculeAnimations(env),
    () => revelations(env),
    () => politiqueMouvement(env),
  ];
  jobs.forEach((job) => {
    const jeton = guard(job);
    if (jeton) tokens.push(jeton);
  });
  /* Le miroir est réécrit une seule fois, après la collecte des jetons. */
  setAttr(racine, 'data-e059-mouvement', tokens.join(' '));
});
