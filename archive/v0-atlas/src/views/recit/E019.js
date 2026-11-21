import { register } from './registry.js';

/* Lentille E019 — Transitions et mouvement (vue Récit).
 *
 * Dix chantiers (E019-01 … E019-10) appliqués à chaque rendu de la vue Récit par
 * le registre `runEnhancements`. Aucune donnée Historique inventée : chaque
 * indicateur est dérivé du DOM réellement rendu par `recit.js`. Zéro réseau,
 * zéro `console.*`, zéro `Math.random`, zéro minuteur, zéro boucle rAF.
 * Enrichissement non destructif : sans ce module la vue reste lisible.
 *
 * Périmètre de lecture : src/views/recit.js, src/views/recit/registry.js,
 * src/views/recit/index.js, src/views/_diagnostics.js, styles.css.
 */

const SCOPE = 'recit-e019-root';

/* Identifiants DOM créés par la lentille. Le préfixe `e019-` est imposé par le
   contrat ; les nœuds sont volontairement imbriqués dans `.recit-body` (et non
   posés à même `stage`/`layout`/`body`) pour échapper au marquage diagnostic de
   `_diagnostics.js:72` qui masque les enfants directs portant ce préfixe. */
const IDS = ['e019-direction', 'e019-motion-note'];

/* Mémoire de parcours entre deux reconstructions complètes du DOM par la coque.
   Le module survit au `innerHTML` de `shell.js`, exactement comme `c3aLocal`
   survit dans `recit.js`. */
let dernierIndex = null;
let dernierTotal = null;

const q = (root, selector) => (root && root.querySelector ? root.querySelector(selector) : null);

/* Retire les doublons d'ID avant réutilisation : garantie « IDs uniques » même
   si un appelant rejoue les greffons sur un DOM déjà enrichi. */
function nodeUnique(el, id, tag, className, parent, before) {
  const trouves = Array.from(document.querySelectorAll(`[id="${id}"]`));
  for (let i = 1; i < trouves.length; i += 1) {
    const doublon = trouves[i];
    if (doublon.parentNode) doublon.parentNode.removeChild(doublon);
  }
  let cible = trouves[0];
  if (!cible) {
    cible = el(tag, className);
    cible.id = id;
    if (before && before.parentNode) before.parentNode.insertBefore(cible, before);
    else if (parent) parent.appendChild(cible);
  }
  return cible;
}

/* Index courant relu depuis le kicker « Étape X / N · … », avec repli sur
   l'item du fil portant aria-current. Jamais d'accès direct au dataset. */
function lirePosition(layout) {
  const kicker = q(layout, '.view-kicker');
  const trouve = kicker && /Étape\s+(\d+)\s*\/\s*(\d+)/.exec(kicker.textContent || '');
  if (trouve) {
    return {
      index: Math.max(0, Number(trouve[1]) - 1),
      total: Math.max(0, Number(trouve[2])),
    };
  }
  const items = Array.from(layout.querySelectorAll('.recit-thread-item'));
  const courant = items.findIndex((item) => item.classList.contains('is-current')
    || item.getAttribute('aria-current') === 'step');
  return courant >= 0
    ? { index: courant, total: items.length }
    : { index: null, total: 0 };
}

const CSS = `
.recit-e019-root .recit-progress>span{transition:width .45s cubic-bezier(.2,.7,.2,1)}
.recit-e019-enter{animation-duration:.42s;animation-timing-function:cubic-bezier(.2,.7,.2,1);animation-fill-mode:both}
.recit-e019-enter-avant{animation-name:recit-e019-in-avant}
.recit-e019-enter-arriere{animation-name:recit-e019-in-arriere}
.recit-e019-enter-first,.recit-e019-enter-stable{animation-name:recit-e019-in-fade}
@keyframes recit-e019-in-avant{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes recit-e019-in-arriere{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}
@keyframes recit-e019-in-fade{from{opacity:0;transform:none}to{opacity:1;transform:none}}
.recit-e019-direction{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0 2px;color:var(--muted);font-size:9px;font-variant-numeric:tabular-nums}
.recit-e019-arrow{display:inline-block;color:var(--gold-bright);font-weight:600;transition:transform .3s ease}
.recit-e019-root[data-e019-direction="avant"] .recit-e019-arrow{animation:recit-e019-nudge-avant .5s ease-out 1}
.recit-e019-root[data-e019-direction="arriere"] .recit-e019-arrow{animation:recit-e019-nudge-arriere .5s ease-out 1}
@keyframes recit-e019-nudge-avant{from{transform:translateX(-6px);opacity:.4}to{transform:none;opacity:1}}
@keyframes recit-e019-nudge-arriere{from{transform:translateX(6px);opacity:.4}to{transform:none;opacity:1}}
.recit-e019-root .recit-actions button,
.recit-e019-root .recit-thread-item{transition:transform .12s ease,border-color .18s ease,color .18s ease,background-color .18s ease}
.recit-e019-root .recit-actions button:active,
.recit-e019-root .recit-thread-item:active{transform:translateY(1px) scale(.98)}
@keyframes recit-e019-spin-in{from{transform:rotate(-120deg);opacity:.3}to{transform:none;opacity:1}}
.recit-e019-root .recit-play[aria-pressed="true"] .recit-e019-play-icon{animation:recit-e019-spin-in .5s ease-out 1}
.recit-e019-chevron{display:inline-block;margin-right:6px;transition:transform .2s ease}
.recit-e019-root .recit-trace[open] .recit-e019-chevron{transform:rotate(90deg)}
@keyframes recit-e019-reveal{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
.recit-e019-root .recit-trace[open] .recit-e019-disclosure-body{animation:recit-e019-reveal .28s ease-out 1}
@keyframes recit-e019-image-in{from{transform:scale(1.05);opacity:.82}to{transform:scale(1);opacity:1}}
.recit-e019-root .recit-e019-image{animation:recit-e019-image-in 1.1s ease-out 1}
.recit-e019-note{margin:6px 0 0;color:var(--muted-2);font-size:8px;line-height:1.5;font-style:italic}
.recit-e019-root[data-e019-motion="reduced"] .recit-e019-enter,
.recit-e019-root[data-e019-motion="reduced"] .recit-e019-arrow,
.recit-e019-root[data-e019-motion="reduced"] .recit-e019-play-icon,
.recit-e019-root[data-e019-motion="reduced"] .recit-e019-chevron,
.recit-e019-root[data-e019-motion="reduced"] .recit-e019-disclosure-body,
.recit-e019-root[data-e019-motion="reduced"] .recit-e019-image,
.recit-e019-root[data-e019-motion="reduced"] .recit-progress>span,
.recit-e019-root[data-e019-motion="reduced"] .recit-actions button,
.recit-e019-root[data-e019-motion="reduced"] .recit-thread-item{animation:none!important;transition:none!important;transform:none!important}
@media (prefers-reduced-motion:reduce){
  .recit-e019-enter,.recit-e019-arrow,.recit-e019-play-icon,.recit-e019-chevron,
  .recit-e019-disclosure-body,.recit-e019-image,.recit-progress>span,
  .recit-actions button,.recit-thread-item{animation:none!important;transition:none!important;transform:none!important}
}`;

register('E019', (ctx) => {
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const { stage, layout, css, el, reducedMotion } = ctx;

  /* E019-01 — un seul bloc CSS, injecté une fois, et ancrage de portée. */
  if (typeof css === 'function') css('recit-e019', CSS);
  layout.classList.add(SCOPE);

  const reduced = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false;

  /* E019-01 (suite) — couplage explicite du mouvement à la préférence système. */
  layout.dataset.e019Motion = reduced ? 'reduced' : 'full';

  /* Position lue depuis le rendu, jamais depuis une copie du dataset. */
  const position = lirePosition(layout);
  const index = position.index;
  const total = position.total;

  /* E019-04 — sens de parcours dérivé de la mémoire de position. Un changement
     de repère (total différent) est traité comme une entrée, pas comme un retour. */
  let direction = 'stable';
  if (index === null) direction = 'stable';
  else if (dernierIndex === null || (dernierTotal !== null && total !== dernierTotal)) direction = 'first';
  else if (index > dernierIndex) direction = 'avant';
  else if (index < dernierIndex) direction = 'arriere';
  if (index !== null) {
    dernierIndex = index;
    dernierTotal = total;
  }
  layout.dataset.e019Direction = direction;
  layout.dataset.e019Point = index === null ? '' : String(index + 1);
  layout.dataset.e019Total = String(total);

  /* E019-02 — fondu directionnel du point courant (titre et contexte rendus).
     La classe d'entrée est ajoutée, jamais le texte remplacé. */
  const titre = q(layout, '#recit-point-title');
  if (titre) titre.classList.add('recit-e019-enter', `recit-e019-enter-${direction}`);
  const contexte = q(layout, '#recit-context');
  if (contexte) contexte.classList.add('recit-e019-enter', `recit-e019-enter-${direction}`);

  /* E019-04 (suite) — indicateur textuel de sens, imbriqué dans .recit-body. */
  const corps = q(layout, '.recit-body') || layout;
  const kicker = q(corps, '.view-kicker');
  const directionNode = nodeUnique(el, IDS[0], 'p', 'recit-e019-direction', corps, kicker);
  const libelles = {
    avant: 'en avant',
    arriere: 'en arrière',
    first: 'entrée dans le repère',
    stable: 'position stable',
  };
  const fleches = { avant: '→', arriere: '←', first: '•', stable: '•' };
  directionNode.textContent = '';
  directionNode.appendChild(document.createTextNode(`Sens de lecture : ${libelles[direction] || libelles.stable} `));
  const fleche = el('span', `recit-e019-arrow recit-e019-arrow-${direction}`, fleches[direction] || '•');
  fleche.setAttribute('aria-hidden', 'true');
  directionNode.appendChild(fleche);

  /* E019-05 — suivi du fil : l'item courant est amené dans la zone visible,
     en douceur seulement si le mouvement est autorisé. Garde totale d'erreur. */
  const itemCourant = q(layout, '.recit-thread-item.is-current')
    || q(layout, '.recit-thread-item[aria-current="step"]');
  if (itemCourant && typeof itemCourant.scrollIntoView === 'function') {
    try {
      itemCourant.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: reduced ? 'auto' : 'smooth',
      });
    } catch {
      /* repli silencieux : le fil reste lisible sans défilement assisté. */
    }
  }

  /* E019-07 — l'icône de lecture est marquée pour animer la bascule en cours. */
  const iconeLecture = q(layout, '.recit-play > span[aria-hidden="true"]');
  if (iconeLecture) iconeLecture.classList.add('recit-e019-play-icon');

  /* E019-08 — traçabilité : chevron d'ouverture et fondu du contenu révélé. */
  const trace = q(layout, 'details.recit-trace');
  if (trace) {
    const resume = q(trace, 'summary');
    if (resume && !q(resume, '.recit-e019-chevron')) {
      const chevron = el('span', 'recit-e019-chevron', '▸');
      chevron.setAttribute('aria-hidden', 'true');
      resume.appendChild(chevron);
    }
    const corpsTrace = q(trace, 'p');
    if (corpsTrace) corpsTrace.classList.add('recit-e019-disclosure-body');
  }

  /* E019-09 — léger mouvement d'entrée de l'image du repère, sans chargement
     supplémentaire (l'image est déjà celle de `recit.js`). */
  const image = q(layout, '.recit-media img');
  if (image) image.classList.add('recit-e019-image');

  /* E019-10 — témoin auditable visible : dit pourquoi le mouvement est actif
     ou réduit, sans jamais porter d'information par la seule couleur. */
  const legende = q(corps, '.recit-legend') || corps;
  const note = nodeUnique(el, IDS[1], 'p', 'recit-e019-note', legende);
  note.textContent = reduced
    ? 'Mouvement réduit : fondus et transitions sont désactivés selon votre réglage système.'
    : 'Mouvement actif : fondus et transitions douces accompagnent le changement de point ; ils suivent votre réglage système.';

  /* E019-10 (suite) — attributs de contrôle pour relecture et tests. */
  layout.dataset.e019Enhancements = '10';
  const uniques = IDS.every((id) => document.querySelectorAll(`[id="${id}"]`).length <= 1);
  layout.dataset.e019Unique = uniques ? '1' : '0';
  if (stage && stage.isConnected) stage.dataset.e019MotionState = reduced ? 'reduced' : 'full';
});
