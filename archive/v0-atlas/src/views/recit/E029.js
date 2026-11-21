import { register } from './registry.js';

/* Lentille E029 — Transitions et mouvement (vue Récit).
 *
 * Rapport : UNIFIED_AUDIT/RECIT/views/E029.md — chantiers E029-01 à E029-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/recit.js), la coque,
 * les autres lentilles et les feuilles de style partagées ne sont pas modifiés.
 *
 * Contrat exploité : viewId, layout, css, el, reducedMotion. Aucune dépendance
 * vers le store, les filtres ou le routeur : la lentille se contente d'observer
 * le DOM déjà produit par la vue et d'y ajouter des attributs, deux éléments
 * décoratifs et une portée CSS isolée.
 *
 * Invariants : un seul register, un seul css, préfixe recit-e029- pour toute
 * classe, préfixe e029- pour tout identifiant, zéro écouteur global, zéro timer,
 * zéro rAF, zéro réseau, zéro aléa, aucun message journalisé. Un rendu sans JS
 * reste intégralement lisible : tout ici est enrichissement non destructif.
 */

const SCOPE = 'recit-e029-racine';

/* Mémoire de rendu en RAM (jamais dans le DOM) : sert à la fois au sens de la
 * transition (E029-03) et au point de départ du marqueur (E029-10). */
let dernierPourcent = null;

const CSS = `
/* E029-01 — entrée en scène du texte : fondu et montée brève, rejouée à chaque
 * reconstruction du DOM puisque la coque recrée les nœuds à chaque point. */
.recit-e029-racine .recit-title,
.recit-e029-racine .recit-context,
.recit-e029-racine .recit-meta {
  animation: recit-e029-entree .32s ease-out both;
}
.recit-e029-racine .recit-context { animation-delay: .05s; }
.recit-e029-racine .recit-meta { animation-delay: .09s; }
@keyframes recit-e029-entree {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

/* E029-03 — directionnalité : le sens avant/arrière, déduit de la variation du
 * pourcentage de progression, glisse le texte depuis la droite ou la gauche.
 * La règle porte un sélecteur d'attribut, donc elle surcharge l'entrée neutre. */
.recit-e029-racine[data-e029-sens="avant"] .recit-title,
.recit-e029-racine[data-e029-sens="avant"] .recit-context,
.recit-e029-racine[data-e029-sens="avant"] .recit-meta {
  animation: recit-e029-glissement-droite .34s ease-out both;
}
.recit-e029-racine[data-e029-sens="arriere"] .recit-title,
.recit-e029-racine[data-e029-sens="arriere"] .recit-context,
.recit-e029-racine[data-e029-sens="arriere"] .recit-meta {
  animation: recit-e029-glissement-gauche .34s ease-out both;
}
.recit-e029-racine[data-e029-sens] .recit-context { animation-delay: .05s; }
.recit-e029-racine[data-e029-sens] .recit-meta { animation-delay: .09s; }
@keyframes recit-e029-glissement-droite {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: none; }
}
@keyframes recit-e029-glissement-gauche {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: none; }
}

/* E029-02 — la barre de progression se déploie depuis zéro, puis un balayage
 * lumineux signale la lecture automatique (aria-pressed du bouton de lecture). */
.recit-e029-racine .recit-progress { position: relative; }
.recit-e029-racine .recit-progress > span:not(.recit-e029-marqueur) {
  transform-origin: left center;
  animation: recit-e029-remplissage .42s ease-out;
}
@keyframes recit-e029-remplissage {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
.recit-e029-racine[data-e029-lecture="1"] .recit-progress::after {
  content: "";
  position: absolute;
  top: 0; bottom: 0; left: 0;
  width: 32%;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .4), transparent);
  animation: recit-e029-balayage 1.9s linear infinite;
}
@keyframes recit-e029-balayage {
  from { transform: translateX(-110%); }
  to { transform: translateX(330%); }
}

/* E029-10 — un curseur lumineux quitte la position précédente et rejoint la
 * nouvelle : le mouvement lui-même porte l'information d'avancement. */
.recit-e029-racine .recit-e029-marqueur {
  position: absolute;
  top: 0;
  left: var(--e029-position, 0%);
  width: 3px;
  height: 100%;
  background: var(--gold-bright);
  box-shadow: 0 0 5px var(--gold-bright);
  pointer-events: none;
  animation: recit-e029-marqueur .4s ease-out;
}
@keyframes recit-e029-marqueur {
  from { left: var(--e029-position-debut, 0%); }
}

/* E029-06 — jauge de temps de lecture : la durée est lue dans le libellé réel
 * puis injectée comme variable CSS, sans minuteur JS. */
.recit-e029-racine .recit-timing {
  position: relative;
  padding-bottom: 6px;
}
.recit-e029-racine .recit-timing::after {
  content: "";
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 2px;
  background: var(--gold);
  transform-origin: left center;
  animation: recit-e029-jauge var(--e029-lecture, 6s) linear;
}
@keyframes recit-e029-jauge {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

/* E029-07 — le média respire doucement et un voile s'efface à chaque point.
 * Rien n'est ajouté quand la vue affiche son message « aucune image ». */
.recit-e029-racine .recit-media { position: relative; }
.recit-e029-racine[data-e029-media="1"] .recit-media img {
  animation: recit-e029-media 20s ease-in-out infinite alternate;
}
@keyframes recit-e029-media {
  from { transform: scale(1.01) translate3d(0, 0, 0); }
  to { transform: scale(1.07) translate3d(-1.2%, -.8%, 0); }
}
.recit-e029-racine .recit-media::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: rgba(0, 0, 0, .5);
  animation: recit-e029-voile .55s ease-out forwards;
}
@keyframes recit-e029-voile {
  from { opacity: .6; }
  to { opacity: 0; }
}

/* E029-04 + E029-08 — le fil devient un rail à défilement doux, avec une ligne
 * parcourue proportionnellement au chemin déjà effectué. */
.recit-e029-racine .recit-thread-list {
  position: relative;
  max-height: min(34vh, 260px);
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-behavior: smooth;
  padding-left: 12px;
}
.recit-e029-racine .recit-thread-list::before {
  content: "";
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 2px;
  background: var(--line-strong);
}
.recit-e029-racine .recit-thread-list::after {
  content: "";
  position: absolute;
  left: 0; top: 0;
  width: 2px;
  height: 100%;
  background: var(--gold-bright);
  transform-origin: top center;
  transform: scaleY(var(--e029-avancement, 0));
  animation: recit-e029-chemin .45s ease-out;
}
@keyframes recit-e029-chemin {
  from { transform: scaleY(0); }
}

/* E029-05 — retours de mouvement sur les commandes et le fil, focus renforcé. */
.recit-e029-racine .recit-actions button {
  transition: transform .16s ease, background-color .16s ease, border-color .16s ease;
}
.recit-e029-racine .recit-actions button:hover:not(:disabled) { transform: translateY(-2px); }
.recit-e029-racine .recit-actions button:active:not(:disabled) { transform: translateY(0) scale(.97); }
.recit-e029-racine .recit-thread-item {
  transition: transform .16s ease, border-color .16s ease;
}
.recit-e029-racine .recit-thread-item:hover { transform: translateX(2px); }
.recit-e029-racine .recit-actions button:focus-visible,
.recit-e029-racine .recit-thread-item:focus-visible {
  outline: 2px solid var(--gold-bright);
  outline-offset: 3px;
}

/* E029-09 — interrupteur de mouvement réduit : couplage JS (attribut) ET
 * media query, avec une note visible qui explique l'absence d'animation. */
.recit-e029-motion-note {
  display: none;
  margin-left: 8px;
  color: var(--muted-2);
  font-size: 9px;
}
.recit-e029-racine[data-e029-motion="reduit"] .recit-e029-motion-note { display: inline; }
.recit-e029-racine[data-e029-motion="reduit"] *,
.recit-e029-racine[data-e029-motion="reduit"] *::before,
.recit-e029-racine[data-e029-motion="reduit"] *::after {
  animation: none !important;
  transition: none !important;
  scroll-behavior: auto !important;
}
@media (prefers-reduced-motion: reduce) {
  .recit-e029-racine *,
  .recit-e029-racine *::before,
  .recit-e029-racine *::after {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
/* Couleurs forcées : le mouvement n'est jamais le seul vecteur d'information. */
@media (forced-colors: active) {
  .recit-e029-racine .recit-thread-list::after { background: Highlight; }
  .recit-e029-racine .recit-e029-marqueur { background: Highlight; box-shadow: none; }
}
`;

register('E029', (ctx) => {
  /* Garde ultime : même un DOM inattendu ne doit jamais interrompre le rendu. */
  try {
    const { viewId, layout, css, el, reducedMotion } = ctx;
    if (viewId !== 'recit' || !layout || typeof css !== 'function' || typeof el !== 'function') return;

    /* Une seule injection CSS pour toute la lentille, puis ancrage de portée. */
    css('recit-e029', CSS);
    layout.classList.add(SCOPE);

    /* E029-02 : état de lecture auto lu sur le bouton existant, jamais modifié. */
    const boutonLecture = layout.querySelector('.recit-actions .recit-play');
    const enLecture = !!(boutonLecture && boutonLecture.getAttribute('aria-pressed') === 'true');
    layout.setAttribute('data-e029-lecture', enLecture ? '1' : '0');

    /* E029-09 : préférence système, sans supposer matchMedia disponible. */
    const reduit = typeof reducedMotion === 'function' && reducedMotion();
    layout.setAttribute('data-e029-motion', reduit ? 'reduit' : 'normal');

    /* E029-03 / E029-10 : la progression réellement écrite par la vue sert de
     * source unique. Le pourcentage précédent donne le sens et le point de départ. */
    const progression = layout.querySelector('.recit-progress');
    const remplissage = progression ? progression.querySelector('span') : null;
    const brut = remplissage && remplissage.style ? parseFloat(remplissage.style.width) : NaN;
    const pourcent = Number.isFinite(brut) ? Math.max(0, Math.min(100, brut)) : 0;
    const depart = dernierPourcent === null ? 0 : dernierPourcent;
    const sens = pourcent < depart ? 'arriere' : 'avant';
    layout.setAttribute('data-e029-sens', sens);
    layout.setAttribute('data-e029-etape', String(Math.round(pourcent)));
    dernierPourcent = pourcent;

    if (progression) {
      progression.style.setProperty('--e029-position', `${pourcent}%`);
      progression.style.setProperty('--e029-position-debut', `${depart}%`);
      if (!progression.querySelector('#e029-marqueur')) {
        const marqueur = el('span', 'recit-e029-marqueur', '');
        marqueur.id = 'e029-marqueur';
        marqueur.setAttribute('aria-hidden', 'true');
        progression.appendChild(marqueur);
      }
    }

    /* E029-06 : on lit la durée affichée, on ne la recalcule pas. */
    const timing = layout.querySelector('.recit-timing');
    if (timing) {
      const secondes = String(timing.textContent || '').match(/≈\s*(\d+)\s*s/);
      const valeur = secondes ? Math.max(4, Math.min(12, parseInt(secondes[1], 10))) : 6;
      timing.style.setProperty('--e029-lecture', `${valeur}s`);
      if (!timing.querySelector('#e029-motion-note')) {
        const note = el('span', 'recit-e029-motion-note', 'Mouvements réduits');
        note.id = 'e029-motion-note';
        note.setAttribute('aria-hidden', 'true');
        timing.appendChild(note);
      }
    }

    /* E029-07 : le média n'est animé que s'il existe réellement. */
    const media = layout.querySelector('.recit-media');
    layout.setAttribute('data-e029-media', media && media.querySelector('img') ? '1' : '0');

    /* E029-04 / E029-08 : ligne parcourue et aménagement du point courant dans
     * le rail. Seul le conteneur défile : la page ne bouge pas. */
    const liste = layout.querySelector('.recit-thread-list');
    if (liste) {
      liste.style.setProperty('--e029-avancement', String(Math.max(0, Math.min(1, pourcent / 100))));
      const courant = liste.querySelector('.recit-thread-item.is-current')
        || liste.querySelector('.recit-thread-item[aria-current="step"]');
      if (courant) {
        const rectListe = liste.getBoundingClientRect();
        const rectItem = courant.getBoundingClientRect();
        const delta = (rectItem.top - rectListe.top) - (rectListe.height - rectItem.height) / 2;
        if (Math.abs(delta) > 2) {
          liste.style.scrollBehavior = reduit ? 'auto' : 'smooth';
          liste.scrollTop = liste.scrollTop + delta;
        }
      }
    }
  } catch {
    /* Enrichissement non destructif : aucun défaut ne doit casser le rendu. */
  }
});
