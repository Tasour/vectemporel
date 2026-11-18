import { register } from './registry.js';

/* Lentille E049 — Transitions et mouvement (vue Récit).
 *
 * Dix chantiers indépendants et distincts (E049-01 … E049-10), tous
 * implémentés ici. Rapport détaillé :
 * UNIFIED_AUDIT/RECIT/views/E049.md.
 *
 * Greffon strictement additif : aucune donnée n'est inventée, aucun texte
 * supprimé, aucune commande ré-attribuée, aucun fichier partagé touché.
 * Le mouvement est entièrement décrit en CSS (aucune animation JavaScript,
 * aucun timer, aucune boucle rAF) ; le JS ne fait que poser des classes,
 * des attributs et — pour la piste d'étapes — quelques pastilles ornementales
 * créées avec ctx.el. Toutes les classes sont préfixées `recit-e049-`,
 * l'unique identifiant créé est préfixé `e049-` et posé dans `.recit-body`
 * (hors du champ de marquage du module de diagnostic). Zéro réseau, zéro
 * aléa, zéro journalisation. Chaque chantier est isolé : une défaillance
 * locale est neutralisée sans jamais interrompre le rendu de la vue.
 */

const CSS_ID = 'recit-e049';
const RACINE = 'recit-e049';
const ATTR_MOUVEMENT = 'data-e049-motion';
const ATTR_APPLIQUE = 'data-e049-applique';
const LIMITE_PASTILLES = 20;
const DEPAS_PASTILLE = 35;

/* Bloc CSS unique, entièrement porté par la classe racine `.recit-e049`.
   Aucune règle globale, aucune police ni ressource distante, aucun
   `will-change` ni `filter` coûteux. Toutes les animations et transitions
   sont conditionnées à `data-e049-motion="full"`, donc désactivables d'un
   seul geste, y compris en direct (chantier E049-09). Le bloc
   `@media (prefers-reduced-motion: reduce)` constitue un second filet. */
const CSS = `
/* E049-01 — fondu d'entrée du point courant et de son chapeau. */
.recit-e049 .recit-e049-point{transform-origin:left top}
.recit-e049[data-e049-motion="full"] .recit-e049-point{
  animation:e049-point-in .42s cubic-bezier(.2,.7,.2,1) both;
}
.recit-e049[data-e049-motion="full"] .recit-e049-context{
  animation:e049-point-in .48s cubic-bezier(.2,.7,.2,1) .06s both;
}
@keyframes e049-point-in{
  from{opacity:0;transform:translateY(7px)}
  to{opacity:1;transform:none}
}

/* E049-02 — remplissage animé de la barre de progression. */
.recit-e049 .recit-e049-fill{transform-origin:left center}
.recit-e049[data-e049-motion="full"] .recit-e049-fill{
  animation:e049-fill-in .4s ease-out both;
  transition:width .35s ease;
}
@keyframes e049-fill-in{from{transform:scaleX(0)}to{transform:scaleX(1)}}

/* E049-03 — fil : défilement fluide et respiration de l'item courant. */
.recit-e049[data-e049-motion="full"] .recit-e049-thread-list{
  scroll-behavior:smooth;overscroll-behavior:contain;
}
.recit-e049[data-e049-motion="full"] .recit-e049-thread-current{
  animation:e049-current-pulse .55s ease-out both;
}
@keyframes e049-current-pulse{
  0%{box-shadow:0 0 0 0 rgba(230,185,111,.38)}
  100%{box-shadow:0 0 0 7px rgba(230,185,111,0)}
}

/* E049-04 — retour tactile des commandes et des contrôles du fil. */
.recit-e049[data-e049-motion="full"] .recit-e049-tactile{
  transition:background-color .16s ease,border-color .16s ease,
             color .16s ease,transform .12s ease;
}
.recit-e049[data-e049-motion="full"] .recit-e049-tactile:active{
  transform:translateY(1px) scale(.985);
}

/* E049-05 — ouverture animée de la traçabilité. */
.recit-e049 .recit-e049-trace summary::before{
  content:'▸';display:inline-block;margin-right:6px;
  color:var(--gold,#e6b96f);font-size:1em;line-height:1;
}
.recit-e049[data-e049-motion="full"] .recit-e049-trace summary::before{
  transition:transform .2s ease;
}
.recit-e049[data-e049-motion="full"] .recit-e049-trace[open] summary::before{
  transform:rotate(90deg);
}
.recit-e049[data-e049-motion="full"] .recit-e049-trace[open] .recit-e049-trace-text{
  animation:e049-reveal .22s ease-out both;
}
@keyframes e049-reveal{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}

/* E049-06 — fondu de l'image et léger mouvement au survol. */
.recit-e049[data-e049-motion="full"] .recit-e049-media{
  animation:e049-media-in .5s ease-out both;transform-origin:center center;
}
.recit-e049[data-e049-motion="full"] .recit-e049-media:hover{
  transform:scale(1.012);transition:transform .3s ease;
}
@keyframes e049-media-in{from{opacity:0;transform:scale(1.03)}to{opacity:1;transform:none}}

/* E049-07 — signal animé de la lecture automatique. */
.recit-e049[data-e049-motion="full"] .recit-e049-playing .recit-e049-play-icon{
  animation:e049-pulse 1.4s ease-in-out infinite;
}
.recit-e049 .recit-e049-progress{position:relative}
.recit-e049[data-e049-motion="full"][data-e049-playing="1"] .recit-e049-progress::after{
  content:'';position:absolute;inset:0 auto 0 -40%;
  width:40%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent);
  animation:e049-sheen 1.8s linear infinite;pointer-events:none;
}
@keyframes e049-pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes e049-sheen{from{transform:translateX(0)}to{transform:translateX(350%)}}

/* E049-08 — piste d'étapes ponctuée (ornementale, l'information reste dans le kicker). */
.recit-e049 .recit-e049-steps{
  display:flex;flex-wrap:wrap;gap:5px;align-items:center;
  margin:0 0 12px;padding:0;list-style:none;
}
.recit-e049 .recit-e049-step{
  width:7px;height:7px;border:1px solid var(--line-strong,#6b6255);
  border-radius:50%;background:transparent;
}
.recit-e049 .recit-e049-step.recit-e049-done{background:var(--gold,#e6b96f);border-color:var(--gold,#e6b96f)}
.recit-e049 .recit-e049-step.recit-e049-active{
  border-color:var(--gold-bright,#f5e9d0);background:var(--gold-bright,#f5e9d0);
}
.recit-e049[data-e049-motion="full"] .recit-e049-step.recit-e049-active{
  animation:e049-step-pulse 1.6s ease-in-out infinite;
}
@keyframes e049-step-pulse{
  0%,100%{box-shadow:0 0 0 0 rgba(245,233,208,.45)}
  50%{box-shadow:0 0 0 4px rgba(245,233,208,0)}
}

/* E049-10 — vague d'entrée du fil. */
.recit-e049[data-e049-motion="full"] .recit-e049-wave{
  animation:e049-item-in .34s ease-out both;
  animation-delay:var(--e049-delay,0ms);
}
@keyframes e049-item-in{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}

/* Filet de sécurité : même si l'attribut de gouvernance était mal positionné,
   le réglage système réduit toujours tous les mouvements de cette lentille. */
@media (prefers-reduced-motion:reduce){
  .recit-e049 .recit-e049-point,
  .recit-e049 .recit-e049-context,
  .recit-e049 .recit-e049-fill,
  .recit-e049 .recit-e049-thread-current,
  .recit-e049 .recit-e049-trace summary::before,
  .recit-e049 .recit-e049-trace .recit-e049-trace-text,
  .recit-e049 .recit-e049-media,
  .recit-e049 .recit-e049-playing .recit-e049-play-icon,
  .recit-e049 .recit-e049-step.recit-e049-active,
  .recit-e049 .recit-e049-wave{
    animation:none!important;transition:none!important;
  }
  .recit-e049 .recit-e049-progress::after{display:none!important}
  .recit-e049 .recit-e049-thread-list{scroll-behavior:auto!important}
  .recit-e049 .recit-e049-media:hover{transform:none!important}
  .recit-e049 .recit-e049-tactile:active{transform:none!important}
}
`;

/* Un unique écouteur `matchMedia` pour toute la lentille : il maintient
   l'attribut de gouvernance à jour quand l'utilisateur change son réglage
   système en cours de navigation (chantier E049-09). */
let ecouteMouvementInstalle = false;

function q(root, selector) {
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector)) : [];
}

function marquer(node, className) {
  if (node && node.classList && typeof node.classList.add === 'function') {
    node.classList.add(className);
  }
}

function attribut(node, name, value) {
  if (node && node.nodeType === 1 && typeof node.setAttribute === 'function') {
    node.setAttribute(name, value);
  }
}

/* Exécute un chantier sans jamais laisser une exception atteindre la coque. */
function safe(fn) {
  try { fn(); } catch { /* neutralisé : la vue reste lisible */ }
}

/* « Étape i / n · kind » → { now, max }, borné et fini. Repli : nombre d'items. */
function lireEtape(root) {
  const kicker = q(root, '.view-kicker');
  const trouve = String((kicker && kicker.textContent) || '').match(/(\d+)\s*\/\s*(\d+)/);
  if (trouve) {
    const now = Number(trouve[1]);
    const max = Number(trouve[2]);
    if (Number.isFinite(now) && Number.isFinite(max) && max > 0) {
      return { now: Math.min(Math.max(now, 1), max), max };
    }
  }
  const count = qa(root, '#c3a-thread .recit-thread-item').length;
  return { now: count ? 1 : 0, max: count };
}

/* E049-09 — gouverneur de mouvement : pose l'attribut sur toutes les racines
   vivantes et arme un seul écouteur de changement de préférence. */
function gouvernerMouvement(root, reducedMotion) {
  let reduce = false;
  try { reduce = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
  catch { reduce = false; }
  const valeur = reduce ? 'reduce' : 'full';
  const racines = qa(document, '.' + RACINE);
  (racines.length ? racines : (root ? [root] : [])).forEach((node) => {
    attribut(node, ATTR_MOUVEMENT, valeur);
  });
  if (ecouteMouvementInstalle || typeof window === 'undefined'
      || typeof window.matchMedia !== 'function') return;
  try {
    const requete = window.matchMedia('(prefers-reduced-motion: reduce)');
    const maj = (evenement) => {
      const etat = (evenement && evenement.matches) ? 'reduce' : 'full';
      qa(document, '.' + RACINE).forEach((node) => attribut(node, ATTR_MOUVEMENT, etat));
    };
    if (typeof requete.addEventListener === 'function') {
      requete.addEventListener('change', maj);
      ecouteMouvementInstalle = true;
    } else if (typeof requete.addListener === 'function') {
      requete.addListener(maj);
      ecouteMouvementInstalle = true;
    }
  } catch { /* navigateur sans matchMedia : le repli CSS reste actif */ }
}

/* E049-08 — piste d'étapes : pastilles ornementales insérées après le kicker,
   dans `.recit-body` (jamais en enfant direct de body/stage/layout). */
function pisteEtapes(body, root, el) {
  if (typeof el !== 'function' || !body || typeof body.insertBefore !== 'function') return;
  if (document.getElementById('e049-recit-steptrack')) return;
  const kicker = q(root, '.view-kicker');
  if (!kicker || !kicker.parentNode) return;
  const { now, max } = lireEtape(root);
  if (!max) return;
  const total = Math.min(max, LIMITE_PASTILLES);
  const piste = el('div', 'recit-e049-steps');
  piste.id = 'e049-recit-steptrack';
  attribut(piste, 'aria-hidden', 'true');
  const position = Math.round(((now - 1) / Math.max(1, max - 1)) * (total - 1));
  for (let i = 0; i < total; i += 1) {
    const clas = 'recit-e049-step' + (i < position ? ' recit-e049-done' : '')
      + (i === position ? ' recit-e049-active' : '');
    piste.appendChild(el('span', clas));
  }
  body.insertBefore(piste, kicker.nextSibling);
}

register('E049', (ctx) => {
  if (!ctx || typeof document === 'undefined') return;
  const { stage, layout, css, el, reducedMotion } = ctx;
  const root = layout || (stage && typeof stage.querySelector === 'function' ? stage : null);
  if (!root || typeof root.querySelector !== 'function') return;

  safe(() => { if (typeof css === 'function') css(CSS_ID, CSS); });

  if (root.getAttribute && root.getAttribute(ATTR_APPLIQUE) === '1'
      && root.classList && root.classList.contains(RACINE)) return;
  attribut(root, ATTR_APPLIQUE, '1');
  marquer(root, RACINE);

  safe(() => gouvernerMouvement(root, reducedMotion));

  const body = q(root, '.recit-body');

  /* --- E049-01 : fondu du point et de son chapeau ------------------------ */
  safe(() => {
    marquer(q(root, '#recit-point-title, .recit-title'), 'recit-e049-point');
    marquer(q(root, '#recit-context, .recit-context'), 'recit-e049-context');
  });

  /* --- E049-02 : remplissage animé de la progression --------------------- */
  safe(() => {
    const remplissage = q(root, '.recit-progress > span');
    marquer(remplissage, 'recit-e049-fill');
    marquer(remplissage && remplissage.parentNode, 'recit-e049-progress');
  });

  /* --- E049-03 : fil fluide et item courant ------------------------------ */
  safe(() => {
    marquer(q(root, '.recit-thread-list'), 'recit-e049-thread-list');
    marquer(q(root, '.recit-thread-item.is-current, .recit-thread-item[aria-current="step"]'),
      'recit-e049-thread-current');
  });

  /* --- E049-04 : retour tactile des commandes ---------------------------- */
  safe(() => {
    qa(root, '.recit-actions button, .c3a-filter, .c3a-reset, '
      + '.recit-thread-item, .recit-trace summary').forEach((node) => {
      marquer(node, 'recit-e049-tactile');
    });
  });

  /* --- E049-05 : ouverture animée de la traçabilité ---------------------- */
  safe(() => {
    const trace = q(root, '.recit-trace');
    if (!trace) return;
    marquer(trace, 'recit-e049-trace');
    marquer(q(trace, 'p'), 'recit-e049-trace-text');
  });

  /* --- E049-06 : fondu de l'image ---------------------------------------- */
  safe(() => marquer(q(root, '.recit-media img'), 'recit-e049-media'));

  /* --- E049-07 : signal de lecture automatique --------------------------- */
  safe(() => {
    const lecture = q(root, '.recit-play');
    if (!lecture) return;
    const actif = lecture.getAttribute
      && lecture.getAttribute('aria-pressed') === 'true';
    attribut(root, 'data-e049-playing', actif ? '1' : '0');
    if (actif) marquer(lecture, 'recit-e049-playing');
    marquer(q(lecture, 'span[aria-hidden="true"]'), 'recit-e049-play-icon');
  });

  /* --- E049-08 : piste d'étapes ------------------------------------------ */
  safe(() => pisteEtapes(body, root, el));

  /* --- E049-10 : vague d'entrée du fil ----------------------------------- */
  safe(() => {
    const items = qa(root, '.recit-thread-item');
    items.slice(0, LIMITE_PASTILLES).forEach((item, index) => {
      marquer(item, 'recit-e049-wave');
      if (item.style && typeof item.style.setProperty === 'function') {
        item.style.setProperty('--e049-delay', `${Math.min(index * DEPAS_PASTILLE,
          (LIMITE_PASTILLES - 1) * DEPAS_PASTILLE)}ms`);
      }
    });
  });
});
