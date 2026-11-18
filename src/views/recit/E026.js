import { register } from './registry.js';

/* Lentille E026 — Mobile et reflow responsive (vue Récit).
 *
 * Dix chantiers concrets et distincts (E026-01 … E026-10), tous implémentés
 * dans CE seul module. Rapport détaillé : UNIFIED_AUDIT/RECIT/views/E026.md.
 * Lectures seules : src/views/recit.js, src/views/recit/registry.js,
 * src/views/recit/index.js, src/views/recit/E006.js, styles.css.
 *
 * Un seul register('E026', …), un seul css('recit-e026', …). Toutes les classes
 * créées sont préfixées `recit-e026-`, tous les identifiants créés sont
 * préfixés `e026-` et uniques. Les nœuds porteurs d'un id sont déposés dans
 * `.recit-body` (jamais enfant direct de stage, layout ou body) : ils échappent
 * ainsi au tiroir de diagnostic de _diagnostics.js et restent visibles.
 *
 * Zéro console, zéro réseau, zéro Math.random, zéro innerHTML. Aucun nœud
 * existant n'est retiré ni réécrit : sans JavaScript le récit reste lisible.
 * Les nœuds créés (bouton de retour, sentinelle, badge) ne sont injectés qu'après
 * existence vérifiée ; chaque chantier est isolé par une garde.
 */

const CSS_ID = 'recit-e026';
const RACINE = 'recit-e026-root';
const RETOUR_ID = 'e026-retour-haut';
const SENTINELLE_ID = 'e026-sentinel';
const BADGE_ID = 'e026-format-badge';

const LIBELLES_FORMAT = Object.freeze({
  compact: 'Affichage compact · une colonne · fil horizontal',
  moyen: 'Affichage intermédiaire · deux colonnes fluides',
  large: 'Affichage large · deux colonnes',
});

/* Contexte courant mémorisé entre deux reconstructions du DOM par la coque.
   Les écouteurs, eux, ne sont installés qu'une seule fois au niveau module. */
let courant = null;
let ecouteFormatInstalle = false;
const corpsDejaSuivis = new WeakSet();

/* Feuille unique. Les sélecteurs sont cadrés par .recit-e026-root : aucune
   règle ne déborde sur une autre vue ni sur une autre lentille. */
const RULES = `
/* E026-01 — zones sûres : encoche et barre gestuelle, avec repli constant(). */
.recit-e026-root[data-e026-format="compact"] .recit-e026-securite.recit-body{
  padding-left:max(12px, env(safe-area-inset-left, 0px));
  padding-right:max(12px, env(safe-area-inset-right, 0px));
  padding-bottom:calc(26px + env(safe-area-inset-bottom, 0px));
}
@supports (padding-left: constant(safe-area-inset-left)){
  .recit-e026-root[data-e026-format="compact"] .recit-e026-securite.recit-body{
    padding-left:max(12px, constant(safe-area-inset-left));
    padding-right:max(12px, constant(safe-area-inset-right));
    padding-bottom:calc(26px + constant(safe-area-inset-bottom));
  }
}
.recit-e026-root[data-e026-format="compact"] .recit-e026-securite-actions.recit-actions{
  padding-bottom:env(safe-area-inset-bottom, 0px);
}

/* E026-02 — hauteur dynamique : le média suit la barre d'adresse mobile. */
.recit-e026-root.recit-e026-viewport[data-e026-format="compact"] .recit-media{
  min-height:min(14svh, 96px);
  min-height:min(14dvh, 96px);
  max-height:20vh;
  max-height:min(22dvh, 190px);
}

/* E026-03 — grille intermédiaire : passage progressif 1 → 2 colonnes. */
.recit-e026-root.recit-e026-grille[data-e026-format="moyen"]{
  grid-template-columns:minmax(0, clamp(34%, 42vw, 46%)) minmax(0, 1fr);
  grid-template-rows:minmax(0, 1fr);
  column-gap:clamp(8px, 1.4vw, 20px);
}

/* E026-04 — fil en carrousel horizontal à accrochage, sur écran étroit. */
.recit-e026-root[data-e026-format="compact"] .recit-e026-carrousel.recit-thread-list{
  display:flex; flex-wrap:nowrap; overflow-x:auto; overflow-y:hidden;
  scroll-snap-type:x proximity; overscroll-behavior-inline:contain;
  gap:8px; padding:2px 2px 10px; scrollbar-width:thin;
}
.recit-e026-root[data-e026-format="compact"] .recit-e026-carrousel.recit-thread-list > li{
  flex:0 0 auto; width:min(76vw, 20rem); scroll-snap-align:center;
}
.recit-e026-root[data-e026-format="compact"] .recit-e026-carrousel .recit-thread-item{
  display:block; width:100%; white-space:normal; overflow-wrap:anywhere;
}

/* E026-05 — retour en haut : flottant, discret, texte et pictogramme. */
.recit-e026-sentinel{display:block;width:1px;height:1px;pointer-events:none}
.recit-e026-retour{
  position:fixed; right:calc(12px + env(safe-area-inset-right, 0px));
  bottom:calc(76px + env(safe-area-inset-bottom, 0px)); z-index:12;
  display:none; align-items:center; justify-content:center; gap:5px;
  min-width:48px; min-height:48px; padding:0 12px;
  border:1px solid var(--line-strong); border-radius:999px;
  background:rgba(12,16,24,.94); color:var(--gold-bright);
  font:inherit; font-size:11px; line-height:1; cursor:pointer;
  box-shadow:0 4px 16px rgba(0,0,0,.38);
  transition:background-color 160ms ease, border-color 160ms ease;
}
.recit-e026-retour.recit-e026-visible{display:inline-flex}
.recit-e026-retour:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}

/* E026-06 — badge de format : l'état du reflow est écrit, pas seulement stylé. */
.recit-e026-format{
  display:inline-flex; align-items:center; margin:0 0 10px;
  padding:3px 9px; border:1px dashed var(--line); border-radius:999px;
  color:var(--muted-2); font-size:9px; line-height:1.45; max-width:100%;
  overflow-wrap:anywhere;
}

/* E026-07 — zoom automatique iOS au focus d'un champ < 16 px. */
.recit-e026-root{-webkit-text-size-adjust:100%;text-size-adjust:100%}
.recit-e026-root[data-e026-format="compact"] input.recit-e026-zoom{
  font-size:16px; min-height:44px;
}

/* E026-08 — aucun débordement horizontal, même avec des identifiants longs. */
.recit-e026-root > .recit-media,
.recit-e026-root > .recit-body{min-width:0}
.recit-e026-root.recit-e026-flux :where(
  .view-kicker, .recit-meta, .recit-conf, .recit-timing,
  .recit-legend, .recit-sources, .recit-thread-title
){
  min-width:0; max-width:100%; overflow-wrap:anywhere;
  word-break:break-word; hyphens:auto;
}

/* E026-09 — rythme vertical fluide et barre de défilement stable. */
.recit-e026-rythme{--e026-r:14px}
@media (max-width:620px){.recit-e026-rythme{--e026-r:clamp(9px, 2.6vw, 16px)}}
.recit-e026-rythme > .recit-progress{margin-bottom:var(--e026-r)}
.recit-e026-rythme > .view-kicker{margin-bottom:var(--e026-r)}
.recit-e026-rythme > .recit-title{margin-bottom:var(--e026-r)}
.recit-e026-rythme > .recit-meta{margin-bottom:var(--e026-r)}
.recit-e026-rythme > .recit-timing{margin-bottom:var(--e026-r)}
.recit-e026-root[data-e026-format="compact"] .recit-e026-rythme{
  scrollbar-gutter:stable; overscroll-behavior-y:contain;
}

/* E026-10 — mouvement réduit : le retour en haut n'anime rien. */
.recit-e026-root.recit-e026-sans-mouvement .recit-e026-retour{transition:none}
@media (prefers-reduced-motion:reduce){.recit-e026-retour{transition:none}}
`;

/* ---------- Gardes et utilitaires ---------- */

function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector)
    : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector))
    : [];
}

function ajouteClasse(node, classe) {
  if (node && node.classList && typeof node.classList.add === 'function') {
    node.classList.add(classe);
  }
}

function mouvementAutorise() {
  if (!courant || typeof courant.reducedMotion !== 'function') return true;
  try { return !courant.reducedMotion(); }
  catch { return true; }
}

function formatCourant() {
  try {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'large';
    if (window.matchMedia('(max-width: 620px)').matches) return 'compact';
    if (window.matchMedia('(max-width: 1000px)').matches) return 'moyen';
    return 'large';
  } catch { return 'large'; }
}

/* ---------- E026-10 : réancrage du point courant après un reflow ---------- */

function recentrer(layout) {
  if (!layout || typeof layout.querySelector !== 'function') return;
  const point = q(layout, '.recit-thread-item[aria-current="step"]')
    || q(layout, '.recit-thread-item.is-current');
  if (!point || typeof point.scrollIntoView !== 'function') return;
  const comportement = mouvementAutorise() ? 'smooth' : 'auto';
  try {
    point.scrollIntoView({ block: 'nearest', inline: 'center', behavior: comportement });
  } catch {
    try { point.scrollIntoView(); } catch { /* ancrage indisponible */ }
  }
}

function appliquerFormat(avecRecentrage) {
  const etat = courant;
  if (!etat || !etat.layout) return;
  const format = formatCourant();
  try { etat.layout.setAttribute('data-e026-format', format); } catch { /* attribut non applicable */ }
  if (etat.badge && typeof etat.badge.textContent === 'string') {
    etat.badge.textContent = LIBELLES_FORMAT[format] || LIBELLES_FORMAT.large;
  }
  /* Au rendu initial, on ne déplace pas le corps : le titre doit rester visible.
     Le recentrage n'intervient que sur un changement réel de point de rupture. */
  if (avecRecentrage) recentrer(etat.layout);
}

function installerFormat() {
  if (ecouteFormatInstalle || typeof window === 'undefined'
      || typeof window.matchMedia !== 'function') return;
  ecouteFormatInstalle = true;
  try {
    const petite = window.matchMedia('(max-width: 620px)');
    const moyenne = window.matchMedia('(max-width: 1000px)');
    const surChangement = () => appliquerFormat(true);
    [petite, moyenne].forEach((requete) => {
      if (!requete) return;
      if (typeof requete.addEventListener === 'function') {
        requete.addEventListener('change', surChangement);
      } else if (typeof requete.addListener === 'function') {
        requete.addListener(surChangement);
      }
    });
  } catch { /* media queries indisponibles : le format initial reste posé. */ }
}

/* ---------- E026-05 : retour en haut ---------- */

function installerRetour(el, layout, corps) {
  if (typeof el !== 'function' || !corps || typeof corps.insertBefore !== 'function') return;
  if (typeof document === 'undefined') return;

  const sentinelle = el('span', 'recit-e026-sentinel');
  sentinelle.id = SENTINELLE_ID;
  sentinelle.setAttribute('aria-hidden', 'true');
  try { corps.insertBefore(sentinelle, corps.firstChild); }
  catch { /* sentinelle non insérée : le bouton restera masqué */ }

  const bouton = el('button', 'recit-e026-retour', '↑ Haut');
  bouton.id = RETOUR_ID;
  bouton.type = 'button';
  bouton.title = 'Revenir au début du texte du repère';
  bouton.setAttribute('aria-label', 'Revenir au début du texte du repère');
  bouton.addEventListener('click', () => {
    try {
      if (typeof corps.scrollTo === 'function') {
        corps.scrollTo({ top: 0, behavior: mouvementAutorise() ? 'smooth' : 'auto' });
      } else {
        corps.scrollTop = 0;
      }
    } catch {
      try { corps.scrollTop = 0; } catch { /* défilement indisponible */ }
    }
    const titre = q(layout, '#recit-point-title');
    if (titre && typeof titre.focus === 'function') {
      try { titre.focus({ preventScroll: true }); } catch { titre.focus(); }
    }
  });

  const montrer = (visible) => {
    if (bouton.classList && typeof bouton.classList.toggle === 'function') {
      bouton.classList.toggle('recit-e026-visible', Boolean(visible));
    }
  };

  if (typeof IntersectionObserver === 'function') {
    try {
      const observateur = new IntersectionObserver((entrees) => {
        entrees.forEach((entree) => {
          if (entree && entree.target === sentinelle) montrer(!entree.isIntersecting);
        });
      }, { root: corps, threshold: 0 });
      observateur.observe(sentinelle);
    } catch { installRepliScroll(corps, montrer); }
  } else {
    installRepliScroll(corps, montrer);
  }

  try { corps.appendChild(bouton); }
  catch { /* bouton non inséré : le récit reste lisible */ }
}

function installRepliScroll(corps, montrer) {
  if (!corps || typeof corps.addEventListener !== 'function' || corpsDejaSuivis.has(corps)) return;
  corpsDejaSuivis.add(corps);
  corps.addEventListener('scroll', () => {
    montrer(Number(corps.scrollTop || 0) > 240);
  }, { passive: true });
}

/* ---------- E026-06 : badge de format ---------- */

function installerBadge(el, layout, corps) {
  if (typeof el !== 'function' || !corps || typeof corps.insertBefore !== 'function') return null;
  const badge = el('p', 'recit-e026-format', LIBELLES_FORMAT.large);
  badge.id = BADGE_ID;
  badge.setAttribute('role', 'status');
  badge.setAttribute('aria-live', 'polite');
  badge.setAttribute('aria-atomic', 'true');
  const kicker = q(layout, '.view-kicker');
  try {
    if (kicker && kicker.parentNode) kicker.parentNode.insertBefore(badge, kicker.nextSibling);
    else corps.insertBefore(badge, corps.firstChild);
  } catch { return null; }
  return badge;
}

/* ---------- Point d'entrée unique ---------- */

register('E026', (ctx) => {
  if (!ctx) return;
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (typeof css === 'function') css(CSS_ID, RULES);
  const racine = layout || stage;
  if (!racine || typeof racine.querySelector !== 'function') return;

  const corps = q(racine, '.recit-body');

  /* Marqueur racine : cadre toutes les règles ci-dessus. */
  ajouteClasse(racine, RACINE);
  try {
    let reduit = false;
    if (typeof reducedMotion === 'function') reduit = Boolean(reducedMotion());
    racine.classList.toggle('recit-e026-sans-mouvement', reduit);
  } catch { /* mouvement réduit non détecté : valeurs par défaut */ }

  /* E026-01 — zones sûres sur le corps et la barre d'actions. */
  ajouteClasse(corps, 'recit-e026-securite');
  ajouteClasse(q(racine, '.recit-actions'), 'recit-e026-securite-actions');

  /* E026-02 — hauteur dynamique du média. */
  ajouteClasse(racine, 'recit-e026-viewport');

  /* E026-03 — grille intermédiaire fluide. */
  ajouteClasse(racine, 'recit-e026-grille');

  /* E026-04 — carrousel horizontal du fil. */
  ajouteClasse(q(racine, '.recit-thread-list'), 'recit-e026-carrousel');

  /* E026-07 — champ de recherche à 16 px sous 620 px. */
  ajouteClasse(q(racine, '#c3a-search') || q(racine, '.c3a-search'), 'recit-e026-zoom');

  /* E026-08 — libellés longs sans débordement. */
  ajouteClasse(racine, 'recit-e026-flux');

  /* E026-09 — rythme vertical fluide. */
  ajouteClasse(corps, 'recit-e026-rythme');

  /* E026-06 — badge de format, puis E026-05 — retour en haut. */
  let badge = null;
  if (corps) {
    badge = installerBadge(el, racine, corps);
    installerRetour(el, racine, corps);
  }

  /* État module rafraîchi à chaque rendu ; écouteurs installés une seule fois. */
  courant = { stage, layout: racine, corps, badge, reducedMotion };
  appliquerFormat();
  installerFormat();
});
