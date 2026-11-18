import { register } from './registry.js';

/* Lentille E061 — performance, rendu incrémental et coût des greffons (vue
 * Chronologie). Dix chantiers E061-01 … E061-10 implémentés ici, uniquement.
 *
 * Le registre réapplique TOUTES les lentilles à chaque émission du store
 * (chronology.js:7,539 ; registry.js:28-44) : E061 doit donc être elle-même
 * gratuit — aucun écouteur, aucun timer, aucune boucle rAF, aucun réseau,
 * aucun aléa. Le chronométrage est strictement synchrone (performance.now).
 *
 * Les identifiants sont préfixés `e061` avec garde d'existence : le module
 * _diagnostics.js:72 les reconnaît et les range dans le tiroir, hors du flux
 * de lecture. Les nœuds sont réutilisés et déplacés à chaque passe, donc le
 * re-render du stage ne duplique aucun ID.
 */

const PANEL_ID = 'e061-perf-panel';
const TITLE_ID = 'e061-perf-title';
const READOUT_ID = 'e061-perf-readout';
const NOTES_ID = 'e061-perf-notes';

let passes = 0;
let dernierTexte = '';

/* Horloge monotone, sans timer ni boucle : une seule lecture par passe. */
function maintenant() {
  try {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
  } catch {
    /* Contexte sans performance : la mesure vaut alors 0 ms. */
  }
  return 0;
}

/* Une seule mesure par passe : compte les nœuds RÉELLEMENT présents après
   reconstruction du DOM par chronology.js:207-540. */
function compter(layout, selecteur) {
  if (!layout || typeof layout.querySelectorAll !== 'function') return 0;
  try {
    return layout.querySelectorAll(selecteur).length;
  } catch {
    return 0;
  }
}

/* Les sélecteurs sont locaux au layout courant : pas de document.querySelector
   global, donc pas de vol d'un nœud appartenant à une ancienne passe. */
function ensureNode(ctx, id, balise, classe, parent) {
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = ctx && typeof ctx.el === 'function'
      ? ctx.el(balise, classe)
      : document.createElement(balise);
    noeud.id = id;
  }
  if (classe && noeud.className !== classe) noeud.className = classe;
  if (noeud.parentNode !== parent) parent.appendChild(noeud);
  return noeud;
}

function setData(noeud, cle, valeur) {
  if (noeud && noeud.dataset) noeud.dataset[cle] = String(valeur);
}

register('E061', (ctx) => {
  /* E061-06 : cssOnce (registry.js:13-19) garantit une seule feuille dans
     <head>, qui survit à la reconstruction du stage (chronology.js:30-35). */
  ctx.css('chronology-e061', `
.chronology-layout .e061-perf {
  margin: 8px 0; padding: 8px 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: rgba(255,255,255,.02);
}
.chronology-layout .e061-perf-title {
  margin: 0 0 4px; color: var(--gold-bright);
  font-size: 9px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
}
.chronology-layout .e061-readout {
  margin: 0; color: var(--ink-soft);
  font-size: 10px; line-height: 1.55; font-variant-numeric: tabular-nums;
}
.chronology-layout .e061-notes {
  margin: 4px 0 0; color: var(--muted);
  font-size: 9px; line-height: 1.5;
}
/* E061-03 — rendu incrémental : le navigateur saute la mise en forme des
   cartes et des points hors écran, sans retirer un seul nœud du DOM. */
.chronology-layout .event-list.atlas-chrono-events > li > .event-card {
  content-visibility: auto;
  contain-intrinsic-size: auto 168px;
}
.chronology-layout .points.atlas-chrono-points > .point {
  content-visibility: auto;
  contain-intrinsic-size: auto 96px;
}
/* E061-04 — confinement : les invalidations de mise en page restent dans les
   sous-arbres. Pas de containment « paint » sur l'aside, qui rognerait les
   box-shadow des cartes sélectionnées. */
.chronology-layout .chronology-main,
.chronology-layout .chronology-aside,
.chronology-layout .event-list.atlas-chrono-events,
.chronology-layout .points.atlas-chrono-points {
  contain: layout style;
}
@media (prefers-reduced-motion: reduce) {
  .chronology-layout .e061-perf,
  .chronology-layout .e061-readout { transition: none !important; }
}
`);

  const stage = ctx.stage;
  const layout = ctx.layout;
  if (!stage || !layout) return;

  /* E061-01 : une passe de la lentille = une passe du registre. Le compteur
     module (et non un nœud) ne croît donc qu'une fois par rendu réel. */
  passes += 1;
  const debut = maintenant();

  /* E061-02 : aucune boucle propre ; la seule lecture d'horloge est ci-dessus
     et l'unique relevé de durée a lieu en fin de passe, avant le texte. */

  /* E061-03 et E061-04 : marqueurs auditables du dispositif CSS. */
  setData(layout, 'e061Incremental', 'content-visibility');
  setData(layout, 'e061Contain', 'layout-style');

  /* E061-05 : les boutons sont recréés à chaque rendu (chronology.js:273,
     298,330,361,385,445,508-509). Leur nombre chiffre le coût de re-bind. */
  const boutons = compter(layout, 'button');

  /* E061-07 : le filtrage parcourt country.events et tous les textes de
     points (chronology.js:171-188) ; on relève ce qui est AFFICHÉ. */
  const reperes = compter(layout, '#atlas-chrono-events > li');
  const points = compter(layout, '.point');
  const cartes = compter(layout, '.event-card');

  /* E061-09 : la préférence est relue à chaque passe, sans abonnement. */
  const reduit = ctx.reducedMotion() ? '1' : '0';

  /* E061-08 : panneau unique, réutilisé et déplacé dans le stage courant. */
  const panneau = ensureNode(ctx, PANEL_ID, 'section', 'e061-perf', stage);
  panneau.setAttribute('data-e061', 'panneau');
  panneau.setAttribute('aria-label', 'Mesure de performance — coût des greffons');
  const titre = ensureNode(ctx, TITLE_ID, 'p', 'e061-perf-title', panneau);
  titre.textContent = 'Coût des greffons — mesure locale';
  const lecture = ensureNode(ctx, READOUT_ID, 'p', 'e061-readout', panneau);
  lecture.setAttribute('role', 'status');
  lecture.setAttribute('aria-live', 'polite');
  lecture.setAttribute('aria-atomic', 'true');
  const notes = ensureNode(ctx, NOTES_ID, 'p', 'e061-notes', panneau);
  notes.textContent = 'Mesure synchrone : aucun écouteur, aucun timer et aucune boucle rAF ajoutés par cette lentille.';

  const duree = (maintenant() - debut).toFixed(2);

  /* Miroirs DOM : auditables sans console, y compris dans le tiroir. */
  setData(layout, 'e061Passes', passes);
  setData(layout, 'e061DureeMs', duree);
  setData(layout, 'e061Reperes', reperes);
  setData(layout, 'e061Points', points);
  setData(layout, 'e061Cartes', cartes);
  setData(layout, 'e061Boutons', boutons);
  setData(layout, 'e061Reduit', reduit);
  setData(layout, 'e061Feuille', document.getElementById('chronology-e061') ? 'unique' : 'absente');

  /* E061-10 : un seul texte agrégé, non porté par la couleur. Le garde-fou
     évite de réécrire la région live quand rien n'a changé. */
  const texte = `Passes du registre : ${passes} · durée propre : ${duree} ms · `
    + `repères affichés : ${reperes} · cartes : ${cartes} · points : ${points} · `
    + `boutons à relier : ${boutons} · mouvement réduit : ${reduit === '1' ? 'oui' : 'non'}.`;
  if (texte !== dernierTexte) {
    lecture.textContent = texte;
    dernierTexte = texte;
  }
});
