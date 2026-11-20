import { register } from './registry.js';

/*
 * Lentille E018 — « Performance et sobriété » (vue Récit).
 *
 * Dix chantiers concrets et distincts (E018-01 … E018-10), tous implémentés
 * dans CE seul module. Aucun fichier partagé n'est touché : le contrat de
 * lecture seule est respecté (registry.js, index.js, recit.js intactes).
 *
 * La coque reconstruisant le DOM du récit à chaque changement d'état, apply()
 * recrée ses nœuds dans le stage courant ; les rares écouteurs, eux, sont
 * posés une seule fois au niveau module et lisent toujours le dernier contexte.
 *
 * Une seule feuille de style : ctx.css('recit-e018', …). Préfixes réservés :
 * `recit-e018-` pour les classes, `e018-` pour les identifiants. Zéro appel
 * réseau, zéro aléa, zéro journalisation, zéro dépendance externe.
 */

const CSS_ID = 'recit-e018';

/* ------------------------------------------------------------------------- *
 * Feuille unique E018-01, E018-02, E018-03, E018-04, E018-07, E018-08.
 * Tout est cadré par [data-e018="on"] posé sur .recit-layout : aucune règle
 * ne déborde hors de la vue Récit.
 * ------------------------------------------------------------------------- */
const RULES = `
/* E018-01 — isolation de rendu : un repaint dans une colonne ne propage pas
   aux autres ; le fil long ne peint que les éléments à l'écran. */
.recit-layout[data-e018="on"] .recit-media,
.recit-layout[data-e018="on"] .recit-body { contain: layout paint; }
.recit-layout[data-e018="on"] .recit-progress { contain: paint; }
.recit-layout[data-e018="on"] .recit-thread-list > li {
  content-visibility: auto; contain-intrinsic-size: auto 36px;
}

/* E018-02 — progression compositée : la largeur est neutralisée, le affichage
   est porté par transform (composité, sans recalcul de mise en page). */
.recit-layout[data-e018="on"][data-e018-progress="on"] .recit-progress > span {
  width: 100% !important;
  transform-origin: left center;
  transform: scaleX(var(--e018-progress, 0));
  will-change: transform;
}

/* E018-03 — commande « Mode sobre » : cible tactile et focus visibles. */
.recit-e018-sobre {
  min-height: 36px; padding: 0 12px; border: 1px solid var(--line);
  border-radius: 8px; background: transparent; color: var(--muted);
  font: inherit; font-size: 9px; cursor: pointer;
}
.recit-e018-sobre:hover { border-color: var(--gold); color: var(--gold-bright); }
.recit-e018-sobre[aria-pressed="true"] {
  border-color: var(--gold); color: var(--gold-bright);
  background: rgba(230,185,111,.1);
}
.recit-e018-sobre:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px;
}

/* E018-08 — panneau de coût : texte lisible, chiffres alignés en colonnes. */
.recit-e018-cost {
  margin: 0 0 12px; padding: 8px 10px; border: 1px solid var(--line);
  border-radius: 8px; background: rgba(255,255,255,.02);
}
.recit-e018-cost h2 { margin: 0 0 6px; color: var(--gold); font-size: 12px; }
.recit-e018-cost p {
  margin: 3px 0; color: var(--muted); font-size: 11px;
  line-height: 1.45; font-variant-numeric: tabular-nums;
}

/* E018-03 — mode sobre : on retire les effets coûteux en paint/compositing. */
body[data-e018-sobre="on"] .recit-layout[data-e018="on"] *,
body[data-e018-sobre="on"] .recit-layout[data-e018="on"] {
  box-shadow: none !important; text-shadow: none !important;
  filter: none !important; backdrop-filter: none !important;
  background-image: none !important;
  transition: none !important; animation: none !important;
}

/* E018-07 — sobriété mobile : mêmes effets allégés sous 620 px, sans
   dépendre d'une action de l'utilisateur. */
@media (max-width: 620px) {
  .recit-layout[data-e018="on"] *,
  .recit-layout[data-e018="on"] {
    box-shadow: none !important; text-shadow: none !important;
    backdrop-filter: none !important;
  }
}

/* E018-04 — mouvement réduit : aucune transition ni animation résiduelle. */
@media (prefers-reduced-motion: reduce) {
  .recit-layout[data-e018="on"] *,
  .recit-layout[data-e018="on"] {
    transition: none !important; animation: none !important;
    scroll-behavior: auto !important;
  }
}
`;

/* ------------------------------------------------------------------------- *
 * État module (unique) — aucune donnée historique, aucun aléa.
 * ------------------------------------------------------------------------- */
let latest = null;        // dernier contexte vu
let installed = false;    // garde des écouteurs globaux
let frame = 0;            // au plus une requête d'animation en vol
let sobre = false;        // état de la bascule « Mode sobre »
let sobreInitialise = false;
let rendus = 0;           // nombre de rendus observés
let dernierRendu = 0;      // horodatage du rendu précédent (ms)
let champsCout = {};       // nœuds du panneau de coût

function horodatage() {
  if (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

/* ------------------------------------------------------------------------- *
 * E018-08 — panneau de coût, mesuré sans forcer de mise en page : seules des
 * requêtes de nœuds et la lecture d'horodatages sont effectuées.
 * ------------------------------------------------------------------------- */
function assurerPanneauCout(ctx) {
  let panneau = null;
  try { panneau = document.getElementById('e018-cost'); } catch { /* absent */ }
  if (panneau && !panneau.classList.contains('recit-e018-cost')) {
    if (panneau.parentNode) panneau.parentNode.removeChild(panneau);
    panneau = null;
  }
  if (!panneau) {
    panneau = ctx.el('section', 'recit-e018-cost');
    panneau.id = 'e018-cost';
    panneau.setAttribute('aria-label', 'Coût de rendu de la vue récit');

    const titre = ctx.el('h2', '', 'Coût de rendu — E018');
    panneau.appendChild(titre);

    const champs = [
      ['noeuds', 'Nœuds dans la vue : —'],
      ['fil', 'Points du fil : —'],
      ['rendus', 'Rendus observés : —'],
      ['cadence', 'Cadence entre rendus : —'],
      ['etat', 'État : —'],
      ['reference', 'Référence : 901 points · 587 sans identifiant de source.'],
    ];
    champs.forEach(([cle, texte]) => {
      const ligne = ctx.el('p', '', texte);
      ligne.setAttribute('data-e018-field', cle);
      panneau.appendChild(ligne);
    });
    ctx.stage.appendChild(panneau);
  }

  champsCout = {};
  try {
    panneau.querySelectorAll('[data-e018-field]').forEach((noeud) => {
      champsCout[noeud.getAttribute('data-e018-field')] = noeud;
    });
  } catch { /* panneau vide : les gardes de paint() suffisent */ }
  return panneau;
}

/* ------------------------------------------------------------------------- *
 * E018-08 / E018-09 — une seule écriture groupée dans une frame rAF.
 * ------------------------------------------------------------------------- */
function paint() {
  const courant = latest;
  if (!courant || !courant.layout) return;
  const ecrire = (noeud, texte) => {
    if (noeud && noeud.textContent !== texte) noeud.textContent = texte;
  };

  let noeuds = 0;
  let fil = 0;
  try { noeuds = courant.layout.querySelectorAll('*').length; } catch { /* 0 */ }
  try { fil = courant.layout.querySelectorAll('.recit-thread-item').length; } catch { /* 0 */ }

  const cache = (typeof document !== 'undefined' && document.hidden);
  const reduit = Boolean(courant.reducedMotion && courant.reducedMotion());
  const metriques = courant.metriques || {};

  ecrire(champsCout.noeuds, `Nœuds dans la vue : ${noeuds}.`);
  ecrire(champsCout.fil, `Points du fil affichés : ${fil}.`);
  ecrire(champsCout.rendus, `Rendus observés : ${metriques.rendus || 0}.`);
  ecrire(champsCout.cadence, metriques.cadence
    ? `Cadence entre rendus : ${metriques.cadence} ms.`
    : 'Cadence entre rendus : premier rendu.');
  ecrire(champsCout.etat,
    `État : sobre ${sobre ? 'activé' : 'désactivé'} · mouvement ${reduit ? 'réduit' : 'complet'} · `
    + `${cache ? 'document masqué' : 'document visible'} · animation ${frame ? 'en attente' : 'au repos'}.`);
}

/* E018-05 — coalescence en une frame, aucun timer périodique, pause sur
   document.hidden. Une seule frame peut être en vol à la fois. */
function schedule() {
  if (frame || (typeof document !== 'undefined' && document.hidden)) return;
  if (typeof requestAnimationFrame !== 'function') { paint(); return; }
  frame = requestAnimationFrame(() => { frame = 0; paint(); });
}

/* ------------------------------------------------------------------------- *
 * E018-03 — bascule « Mode sobre », état porté par <body> pour survivre aux
 * reconstructions du stage ; aria-pressed sur une bascule indépendante.
 * ------------------------------------------------------------------------- */
function appliquerSobre() {
  try {
    if (typeof document !== 'undefined' && document.body) {
      document.body.dataset.e018Sobre = sobre ? 'on' : 'off';
    }
  } catch { /* attribut non critique */ }
  try {
    const titre = sobre
      ? 'Mode sobre activé : cliquez pour rétablir les effets.'
      : 'Mode sobre : réduire les effets graphiques coûteux.';
    document.querySelectorAll('.recit-e018-sobre').forEach((bouton) => {
      bouton.setAttribute('aria-pressed', String(sobre));
      bouton.title = titre;
    });
  } catch { /* aucun bouton présent */ }
}

/* ------------------------------------------------------------------------- *
 * E018-06 — installation unique, déléguée et passive : un seul
 * écouteur de clic, un seul écouteur de redimensionnement, un seul observateur
 * de classe, quel que soit le nombre de rendus.
 * ------------------------------------------------------------------------- */
function clicDelegue(evenement) {
  if (!evenement || typeof Element === 'undefined') return;
  if (!(evenement.target instanceof Element)) return;
  let bouton = null;
  try { bouton = evenement.target.closest('.recit-e018-sobre'); } catch { return; }
  if (!bouton) return;
  sobre = !sobre;
  appliquerSobre();
  schedule();
}

function installer() {
  if (installed || typeof document === 'undefined' || typeof window === 'undefined') return;
  installed = true;
  try { document.addEventListener('click', clicDelegue, { passive: true }); } catch { /* non critique */ }
  try { window.addEventListener('resize', schedule, { passive: true }); } catch { /* non critique */ }
  try { document.addEventListener('visibilitychange', schedule, { passive: true }); } catch { /* non critique */ }
  try {
    if (typeof MutationObserver === 'function' && document.body) {
      const observateur = new MutationObserver(() => { schedule(); });
      observateur.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
  } catch { /* observation facultative */ }
}

/* E018-03 — la commande rejoint .recit-actions : le garde-clavier existant y
   intercepte déjà Entrée/Espace, sans doubler de routeur. */
function ajouterCommande(ctx) {
  const actions = ctx.layout.querySelector('.recit-actions');
  if (!actions) return;
  const bouton = ctx.el('button', 'recit-e018-sobre', 'Mode sobre');
  bouton.type = 'button';
  bouton.setAttribute('aria-pressed', String(sobre));
  bouton.title = sobre
    ? 'Mode sobre activé : cliquez pour rétablir les effets.'
    : 'Mode sobre : réduire les effets graphiques coûteux.';
  actions.appendChild(bouton);
}

/* ------------------------------------------------------------------------- *
 * E018-02 — conversion de la progression en transformation compositée. La
 * largeur posée en ligne par la vue est lue comme chaîne (aucune mesure de
 * mise en page), bornée puis transmise via une variable CSS.
 * ------------------------------------------------------------------------- */
function compositerProgression(ctx) {
  const remplissage = ctx.layout.querySelector('.recit-progress > span');
  if (!remplissage || !remplissage.style) return;
  const brut = remplissage.style.width;
  if (!brut) return;
  const pourcent = parseFloat(brut);
  if (!Number.isFinite(pourcent)) return;
  const fraction = Math.max(0, Math.min(1, pourcent / 100));
  remplissage.style.setProperty('--e018-progress', String(fraction));
  ctx.layout.dataset.e018Progress = 'on';
}

/* ------------------------------------------------------------------------- *
 * E018-10 — garde-fous : un seul register, une seule feuille, nœuds recréés
 * à chaque rendu, identifiant unique réutilisé, chaque chantier isolé dans un
 * try/catch. Aucune opération ne peut interrompre le rendu de la vue.
 * ------------------------------------------------------------------------- */
register('E018', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  try { ctx.css(CSS_ID, RULES); } catch { /* feuille déjà injectée */ }

  /* E018-09 — cadence : horodatage déterministe, aucun générateur aléatoire. */
  const maintenant = horodatage();
  rendus += 1;
  const cadence = dernierRendu ? Math.max(0, Math.round(maintenant - dernierRendu)) : 0;
  dernierRendu = maintenant;

  if (!sobreInitialise) {
    sobreInitialise = true;
    sobre = Boolean(typeof ctx.reducedMotion === 'function' && ctx.reducedMotion());
  }

  /* E018-01 — marqueur de portée des règles, repositionné à chaque rendu. */
  try { ctx.layout.dataset.e018 = 'on'; } catch { /* jeu de données figé */ }

  latest = {
    stage: ctx.stage,
    layout: ctx.layout,
    reducedMotion: ctx.reducedMotion,
    metriques: { rendus, cadence },
  };

  try { compositerProgression(ctx); } catch { /* repli : largeur native */ }
  try { ajouterCommande(ctx); } catch { /* commande facultative */ }
  try { appliquerSobre(); } catch { /* état facultatif */ }
  try { assurerPanneauCout(ctx); } catch { /* panneau facultatif */ }
  try { installer(); } catch { /* écouteurs facultatifs */ }
  schedule();
});
