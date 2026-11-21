import { register } from './registry.js';

/* V2 lentille E089 — Transitions et mouvement (complément de la passe 1).
   Dix chantiers V2 neufs et distincts de ceux de la passe 1 (curseur de
   progression, cascade du fil, balise de parcours, compteur bascule,
   respiration de la barre, soulignage des commandes, révélation de la
   traçabilité, pan du visuel, glissement du média, bouton de réglage). Ici :
   durée de transition calée sur la lecture, fondu du titre, transition du
   remplissage, entrée échelonnée des commandes, bascule de la certitude,
   transition de l'icône de lecture, balayage de l'item courant du fil, fondu
   du résumé, transition au survol du fil, garde-fou mouvement réduit avec
   bilan visible. Tout chiffre affiché est dérivé du DOM réellement rendu.
   Préfixes : classes recit-v2-e089-, ids DOM v2-e089- (jamais e089- de la
   passe 1, qui tourne sur le même DOM). Zéro réseau, zéro console, zéro aléa,
   enrichissement non destructif : sans ce module la vue reste lisible. */

const RACINE = 'recit-v2-e089-root';
const ID_BILAN = 'v2-e089-bilan';

/* Mémoires de module : elles survivent au innerHTML de la coque. */
let titrePrecedent = null;
let confPrecedente = null;

/* Bloc CSS unique, entièrement préfixé recit-v2-e089-. Toutes les animations
   sont soit finies (une seule exécution), soit neutralisées par le garde-fou
   data-v2-e089-motion="reduce" et la préférence système. */
const CSS = `
/* E089-01 — Durée de transition calée sur la lecture. */
.recit-v2-e089-root{--v2-e089-duree:.38s}

/* E089-02 — Fondu du titre au changement de point. */
.recit-v2-e089-titre-fondu{animation:recit-v2-e089-fondu var(--v2-e089-duree,.38s) ease-out both}
@keyframes recit-v2-e089-fondu{from{opacity:.25;transform:translateY(6px)}to{opacity:1;transform:none}}

/* E089-03 — Transition fluide du remplissage de la barre. */
.recit-v2-e089-root .recit-progress>span{transition:width .45s cubic-bezier(.2,.7,.2,1)}

/* E089-04 — Entrée échelonnée des commandes. */
.recit-v2-e089-action-entree{animation:recit-v2-e089-action .3s ease-out both;animation-delay:calc(var(--v2-e089-ordre,0)*45ms)}
@keyframes recit-v2-e089-action{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}

/* E089-05 — Bascule de la pastille de certitude. */
.recit-v2-e089-conf-bascule{animation:recit-v2-e089-conf .42s cubic-bezier(.2,.9,.3,1) 1}
@keyframes recit-v2-e089-conf{0%{transform:scale(.86);opacity:.6}60%{transform:scale(1.06);opacity:1}100%{transform:scale(1);opacity:1}}

/* E089-06 — Transition de l'icône de lecture, keyée sur aria-pressed réel. */
.recit-v2-e089-icone{display:inline-block;transition:transform .28s ease,opacity .28s ease}
.recit-v2-e089-root .recit-play[aria-pressed="true"] .recit-v2-e089-icone{transform:scale(.78);opacity:.62}

/* E089-07 — Balayage lumineux de l'item courant du fil. */
.recit-v2-e089-courant .recit-thread-item.is-current{position:relative;overflow:hidden}
.recit-v2-e089-courant .recit-thread-item.is-current::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(230,185,111,.24),transparent);transform:translateX(-100%);animation:recit-v2-e089-balayage 1.6s ease-in-out infinite;pointer-events:none}
@keyframes recit-v2-e089-balayage{0%{transform:translateX(-100%)}60%,100%{transform:translateX(100%)}}

/* E089-08 — Fondu du résumé au premier point. */
.recit-v2-e089-contexte{animation:recit-v2-e089-fondu var(--v2-e089-duree,.38s) ease-out both;animation-delay:.08s}

/* E089-09 — Transition au survol et au focus des items du fil. */
.recit-v2-e089-fil .recit-thread-item{transition:border-color .25s ease,color .25s ease,transform .25s ease}
.recit-v2-e089-fil .recit-thread-item:hover,
.recit-v2-e089-fil .recit-thread-item:focus-visible{transform:translateX(2px)}

/* E089-10 — Garde-fou mouvement réduit V2 et bilan visible. */
.recit-v2-e089-bilan{margin:8px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-v2-e089-root[data-v2-e089-motion="reduce"] .recit-progress>span,
.recit-v2-e089-root[data-v2-e089-motion="reduce"] .recit-v2-e089-titre-fondu,
.recit-v2-e089-root[data-v2-e089-motion="reduce"] .recit-v2-e089-action-entree,
.recit-v2-e089-root[data-v2-e089-motion="reduce"] .recit-v2-e089-conf-bascule,
.recit-v2-e089-root[data-v2-e089-motion="reduce"] .recit-v2-e089-icone,
.recit-v2-e089-root[data-v2-e089-motion="reduce"] .recit-v2-e089-contexte,
.recit-v2-e089-root[data-v2-e089-motion="reduce"] .recit-v2-e089-fil .recit-thread-item,
.recit-v2-e089-root[data-v2-e089-motion="reduce"] .recit-v2-e089-courant .recit-thread-item.is-current::after{animation:none!important;transition:none!important;transform:none!important}
@media (prefers-reduced-motion:reduce){
  .recit-v2-e089-root .recit-progress>span,
  .recit-v2-e089-titre-fondu,
  .recit-v2-e089-action-entree,
  .recit-v2-e089-conf-bascule,
  .recit-v2-e089-icone,
  .recit-v2-e089-contexte,
  .recit-v2-e089-fil .recit-thread-item,
  .recit-v2-e089-courant .recit-thread-item.is-current::after{animation:none!important;transition:none!important;transform:none!important}
}`;

const q = (racine, selecteur) =>
  racine && typeof racine.querySelector === 'function' ? racine.querySelector(selecteur) : null;

/* Ajoute une classe sans jamais écraser les autres classes du nœud. */
function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

/* Relance une animation finie en retirant/reprenant la classe après lecture
   de offsetWidth : pur réétiquetage CSS, aucun texte n'est modifié. */
function rejoue(noeud, nom) {
  if (!noeud || !noeud.classList) return;
  noeud.classList.remove(nom);
  void noeud.offsetWidth;
  noeud.classList.add(nom);
}

/* Réutilise le paragraphe de bilan par id, supprime tout doublon éventuel et
   le place dans la légende (imbriquée dans .recit-body, hors du masquage
   diagnostic des enfants directs de stage/layout/body). */
function placeBilan(el, legende, texte) {
  if (!legende || typeof el !== 'function') return null;
  const trouves = Array.from(document.querySelectorAll(`[id="${ID_BILAN}"]`));
  for (let i = 1; i < trouves.length; i += 1) {
    const doublon = trouves[i];
    if (doublon.parentNode) doublon.parentNode.removeChild(doublon);
  }
  let noeud = trouves[0];
  if (!noeud) {
    noeud = el('p', 'recit-v2-e089-bilan');
    noeud.id = ID_BILAN;
  }
  noeud.textContent = texte;
  if (noeud.parentNode !== legende) legende.appendChild(noeud);
  return noeud;
}

register('E089', (ctx) => {
  try {
    if (typeof document === 'undefined' || !ctx || !ctx.layout
        || typeof ctx.layout.querySelector !== 'function') return;
    const { layout, css, el, reducedMotion } = ctx;

    if (typeof css === 'function') css('recit-v2-e089', CSS); /* un seul appel, toutes les règles. */
    ajouteClasse(layout, RACINE);

    const corps = q(layout, '.recit-body');
    if (!corps) return;

    const reduit = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false;
    layout.setAttribute('data-v2-e089-motion', reduit ? 'reduce' : 'normal');

    /* E089-01 — durée lue dans « Lecture estimée : ≈ N s », bornée à 0,30–0,90 s.
       Le temps de lecture est plafonné par recit.js entre 4 et 12 s. */
    const timing = q(corps, '.recit-timing');
    if (timing) {
      const trouve = /≈\s*(\d+)\s*s/.exec(timing.textContent || '');
      if (trouve) {
        const secondes = parseInt(trouve[1], 10);
        const duree = Math.max(0.3, Math.min(0.9, 0.32 + (secondes - 4) * 0.06));
        layout.style.setProperty('--v2-e089-duree', `${duree.toFixed(2)}s`);
      }
    }

    /* E089-02 — fondu du titre déclenché par la variation réelle du texte. */
    const titre = q(corps, '.recit-title') || document.getElementById('recit-point-title');
    if (titre) {
      const texteTitre = String(titre.textContent || '').trim();
      if (titrePrecedent === null || texteTitre !== titrePrecedent) {
        rejoue(titre, 'recit-v2-e089-titre-fondu');
      }
      titrePrecedent = texteTitre;
    }

    /* E089-03 — transition de la largeur du remplissage : pure CSS, voir bloc. */

    /* E089-04 — entrée échelonnée des commandes, délai plafonné à 6 rangs. */
    const actions = q(corps, '.recit-actions');
    if (actions) {
      Array.from(actions.querySelectorAll('button')).forEach((bouton, i) => {
        if (!bouton.classList || bouton.classList.contains('recit-v2-e089-action-entree')) return;
        bouton.style.setProperty('--v2-e089-ordre', String(Math.min(i, 6)));
        ajouteClasse(bouton, 'recit-v2-e089-action-entree');
      });
    }

    /* E089-05 — bascule de la pastille de certitude quand son texte change. */
    const conf = q(corps, '.recit-conf');
    if (conf) {
      const texteConf = String(conf.textContent || '').trim();
      if (confPrecedente === null || texteConf !== confPrecedente) {
        rejoue(conf, 'recit-v2-e089-conf-bascule');
      }
      confPrecedente = texteConf;
    }

    /* E089-06 — transition de l'icône de lecture, keyée sur l'aria-pressed
       réel du bouton ; aucun attribut existant n'est réécrit. */
    const play = q(corps, '.recit-play');
    if (play) {
      const icone = play.firstElementChild;
      if (icone && icone.tagName === 'SPAN') ajouteClasse(icone, 'recit-v2-e089-icone');
    }

    /* E089-07 — balayage lumineux de l'item courant (classe sur le fil,
       ciblage CSS via le vrai marqueur .is-current). */
    const fil = q(corps, '.recit-thread');
    if (fil) ajouteClasse(fil, 'recit-v2-e089-courant');

    /* E089-08 — fondu du résumé, présent uniquement au premier point. */
    const contexte = q(corps, '.recit-context');
    if (contexte) ajouteClasse(contexte, 'recit-v2-e089-contexte');

    /* E089-09 — transition au survol et au focus des items du fil. */
    if (fil) ajouteClasse(fil, 'recit-v2-e089-fil');

    /* E089-10 — garde-fou mouvement réduit + bilan visible dérivé du DOM. */
    const effets = [];
    if (q(corps, '.recit-progress > span')) effets.push('barre');
    if (titre && titre.classList.contains('recit-v2-e089-titre-fondu')) effets.push('titre');
    if (actions && q(actions, '.recit-v2-e089-action-entree')) effets.push('commandes');
    if (conf && conf.classList.contains('recit-v2-e089-conf-bascule')) effets.push('certitude');
    if (play && q(play, '.recit-v2-e089-icone')) effets.push('lecture');
    if (fil && fil.classList.contains('recit-v2-e089-courant')) effets.push('balayage');
    if (contexte) effets.push('résumé');
    if (fil && fil.classList.contains('recit-v2-e089-fil')) effets.push('fil');
    const texteBilan = reduit
      ? `Mouvement réduit (réglage système) : ${effets.length} transition(s) V2 neutralisée(s) ; le récit reste lisible.`
      : `Transitions V2 actives : ${effets.length} effet(s) — ${effets.join(', ')}.`;
    const legende = q(corps, '.recit-legend') || corps;
    placeBilan(el, legende, texteBilan);

    /* Témoins auditables : nombre de chantiers et unicité de l'id créé. */
    layout.setAttribute('data-v2-e089-chantiers', '10');
    const unique = document.querySelectorAll(`[id="${ID_BILAN}"]`).length === 1;
    layout.setAttribute('data-v2-e089-unique', unique ? '1' : '0');
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
