import { register } from './registry.js';

/* Lentille E085 — Adaptabilité responsive appliquée au chemin de connexion
   de la vue Constellation, c'est-à-dire aux traits `line.is-path` du SVG
   décoratif `.constellation-edges` (soleil de l'ère active → repère actif,
   puis repère actif → point vérifié actif). Dix chantiers E085-01..10, tous
   implémentés ci-dessous : effet CSS, mesure, attribut, DOM ou écouteur.
   Zéro appel réseau, zéro source d'aléa, zéro sortie de diagnostic, aucun
   minuteur ni boucle d'animation propre. Greffon tolérant : aucune écriture
   n'est tentée sans ctx.layout valide, et chaque accès au DOM est protégé. */

/* Seuils de largeur disponible par segment du chemin (px). */
const E085_SEUIL_SERRE = 26;
const E085_SEUIL_CRITIQUE = 14;

/* État module conservé entre deux rendus du shell (le DOM est recréé à
   chaque set()). Un seul observateur, reconnecté sur le champ courant. */
let e085Observateur = null;
let e085Champ = null;

/* Feuille unique de la lentille : chaque règle porte l'étiquette du chantier
   qu'elle matérialise. La classe .e085-path est posée par le JS (garde). */
const E085_CSS = `
  /* E085-01 — Épaisseur de trait fluide : le trait du chemin suit la largeur
     d'écran au lieu de rester figé à 1,6 px sur tous les formats. */
  .constellation-field.e085-path .constellation-edges line.is-path {
    stroke-width: var(--e085-trait, 1.6);
    vector-effect: non-scaling-stroke;
  }
  @media (max-width: 620px) {
    .constellation-field.e085-path { --e085-trait: 1.3; }
  }
  @media (max-width: 390px) {
    .constellation-field.e085-path { --e085-trait: 1.1; }
  }

  /* E085-03 — Compteur de chemin : pastille de lecture discrète, alignée avec
     la légende et repliée sur sa propre ligne en colonne étroite. */
  .e085-meter {
    flex: 1 1 220px; max-width: 520px; margin: 0;
    color: var(--muted-2); font-size: 9px; line-height: 1.4;
    font-variant-numeric: tabular-nums;
  }
  @media (max-width: 480px) {
    .e085-meter { flex-basis: 100%; }
  }

  /* E085-04 — Mise en avant du chemin : quand la largeur par segment se
     réduit, le maillage décoratif s'efface et le chemin actif ressort. */
  .constellation-field.e085-path[data-e085-regime="serre"] .constellation-edges line:not(.is-path) {
    opacity: .6;
  }
  .constellation-field.e085-path[data-e085-regime="critique"] .constellation-edges line:not(.is-path) {
    opacity: .32;
  }
  .constellation-field.e085-path[data-e085-regime="critique"] .constellation-edges line.is-path {
    stroke-opacity: 1;
  }

  /* E085-05 — Orientation dominante : le motif de tiret s'adapte à l'axe
     principal du chemin pour rester discernable en petit format. */
  .constellation-field.e085-path[data-e085-axis="horizontal"] .constellation-edges line.is-path {
    stroke-dasharray: 6 3; stroke-linecap: round;
  }
  .constellation-field.e085-path[data-e085-axis="vertical"] .constellation-edges line.is-path {
    stroke-dasharray: 2 2; stroke-linecap: butt;
  }
  .constellation-field.e085-path[data-e085-axis="diagonal"] .constellation-edges line.is-path {
    stroke-dasharray: 5 2 1 2; stroke-linecap: round;
  }

  /* E085-06 — Bascule « tracer le chemin » : bouton autonome à état
     aria-pressed, épaissit et colore le seul chemin actif. */
  .e085-trace {
    display: inline-flex; align-items: center;
    min-height: 36px; padding: 0 10px;
    border: 1px solid var(--line); border-radius: 8px;
    background: rgba(255, 255, 255, .03); color: var(--ink-soft);
    font-size: 9px; cursor: pointer;
  }
  .e085-trace:hover { border-color: var(--gold); color: var(--gold-bright); }
  .e085-trace:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
  .e085-trace[aria-pressed="true"] {
    border-color: var(--gold); color: var(--gold-bright); background: rgba(230, 185, 111, .1);
  }
  .constellation-field.e085-path[data-e085-trace="1"] .constellation-edges line.is-path {
    stroke: var(--gold-bright);
    stroke-width: calc(var(--e085-trait, 1.6) + 1.2);
    stroke-opacity: 1;
  }

  /* E085-07 — Mouvement réduit : les transitions de trait ne sont actives
     que si la classe .e085-motion a été posée côté JS. */
  .constellation-field.e085-path.e085-motion .constellation-edges line {
    transition: stroke-width .18s ease, opacity .18s ease, stroke-dasharray .18s ease;
  }
  @media (prefers-reduced-motion: reduce) {
    .constellation-field.e085-path .constellation-edges line { transition: none !important; }
  }

  /* E085-08 — Densité de segmentation : trop de segments de lune rendent le
     maillage lunaire illisible ; on l'affine sans toucher au chemin principal. */
  .constellation-field.e085-path[data-e085-moon-dense="1"] .constellation-edges line.is-moon:not(.is-path) {
    stroke-width: .7; opacity: .5;
  }

  /* E085-09 — Format très étroit : le maillage purement décoratif disparaît,
     le chemin de connexion, lui, reste intégralement tracé. */
  @media (max-width: 360px) {
    .constellation-field.e085-path .constellation-edges line:not(.is-path) { display: none; }
    .constellation-field.e085-path .constellation-edges line.is-path { stroke-opacity: .95; }
  }

  /* E085-10 — Contraste forcé : couleurs système et motif distinctif, pour
     que le chemin reste identifiable sans dépendre de la teinte dorée. */
  @media (forced-colors: active) {
    .constellation-field.e085-path .constellation-edges line.is-path {
      stroke: Highlight; stroke-dasharray: 6 2;
    }
    .constellation-field.e085-path .constellation-edges line:not(.is-path) {
      stroke: GrayText;
    }
    .e085-trace, .e085-trace[aria-pressed="true"] {
      border-color: ButtonText; color: ButtonText; background: ButtonFace;
    }
  }
`;

/* E085-05 : axe dominant, calculé une seule fois depuis les coordonnées déjà
   écrites par la vue. Aucune trigonométrie, aucune source d'aléa. */
function axeDominant(segments) {
  let largeur = 0;
  let hauteur = 0;
  segments.forEach((ligne) => {
    if (!ligne || typeof ligne.getAttribute !== 'function') return;
    const x1 = parseFloat(ligne.getAttribute('x1')) || 0;
    const y1 = parseFloat(ligne.getAttribute('y1')) || 0;
    const x2 = parseFloat(ligne.getAttribute('x2')) || 0;
    const y2 = parseFloat(ligne.getAttribute('y2')) || 0;
    largeur += Math.abs(x2 - x1);
    hauteur += Math.abs(y2 - y1);
  });
  if (largeur === 0 && hauteur === 0) return 'diagonal';
  const rapport = largeur / (largeur + hauteur);
  if (rapport > .62) return 'horizontal';
  if (rapport < .38) return 'vertical';
  return 'diagonal';
}

register('E085', (ctx) => {
  /* Garde d'entrée : sans layout courant ni document, aucun ajout au DOM. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  if (typeof ctx.css !== 'function') return;

  const layout = ctx.layout;
  const champ = layout.querySelector('.constellation-field');
  const svg = layout.querySelector('.constellation-edges');

  /* E085-01 — injection unique de la feuille puis activation de la classe
     porteuse de toutes les règles responsive du chemin. */
  ctx.css('constellation-e085', E085_CSS);
  if (!champ) return;
  champ.classList.add('e085-path');
  champ.setAttribute('data-e085-trace', '0');
  if (svg && svg.dataset) svg.dataset.e085Trait = '1';

  const lignes = svg && typeof svg.querySelectorAll === 'function'
    ? Array.from(svg.querySelectorAll('line')) : [];
  const segments = lignes.filter((ligne) => ligne && ligne.classList
    && ligne.classList.contains('is-path'));
  const lunes = lignes.filter((ligne) => ligne && ligne.classList
    && ligne.classList.contains('is-moon'));

  /* E085-08 — comptage des segments et des traits lunaires, écrit sur le champ
     pour piloter l'affinage conditionnel du CSS. */
  champ.setAttribute('data-e085-segments', String(segments.length));
  champ.setAttribute('data-e085-moon-dense', lunes.length > 6 ? '1' : '0');

  /* E085-05 — orientation dominante traduite en attribut lisible. */
  champ.setAttribute('data-e085-axis', axeDominant(segments));

  /* E085-03 — compteur de chemin ajouté à la légende existante, id préfixé,
     rôle de statut et garde contre les rendus successifs. */
  let metre = null;
  const legende = layout.querySelector('.constellation-legend');
  if (legende && typeof ctx.el === 'function' && !layout.querySelector('#e085-path-meter')) {
    metre = ctx.el('p', 'e085-meter', '');
    metre.id = 'e085-path-meter';
    metre.setAttribute('role', 'status');
    metre.setAttribute('aria-live', 'polite');
    metre.setAttribute('aria-atomic', 'true');
    legende.appendChild(metre);
  }

  /* E085-02 — mesure de densité : largeur du champ / nombre de segments,
     traduite en régime (ample, serre, critique). Un seul observateur, gardé
     par typeof et try/catch, reconnecté sur le champ courant. */
  const mesurer = (cible) => {
    if (!cible || !cible.isConnected) return;
    const largeur = cible.clientWidth || 0;
    const parSegment = segments.length ? largeur / segments.length : largeur;
    const regime = parSegment < E085_SEUIL_CRITIQUE
      ? 'critique'
      : parSegment < E085_SEUIL_SERRE ? 'serre' : 'ample';
    cible.setAttribute('data-e085-regime', regime);
    cible.setAttribute('data-e085-par-segment', String(Math.round(parSegment)));
    if (metre && metre.isConnected) {
      metre.textContent = `${segments.length} segments · ${regime} · ${Math.round(parSegment)} px par segment`;
    }
  };
  mesurer(champ);

  if (typeof ResizeObserver !== 'undefined') {
    try {
      if (!e085Observateur) {
        e085Observateur = new ResizeObserver(() => mesurer(e085Champ));
      }
      if (e085Champ && e085Champ !== champ && typeof e085Observateur.unobserve === 'function') {
        e085Observateur.unobserve(e085Champ);
      }
      e085Observateur.observe(champ);
      e085Champ = champ;
    } catch {
      /* Greffon tolérant : la mesure initiale est conservée, sans exception. */
    }
  }

  /* E085-06 — bascule « tracer le chemin » : choix indépendant, donc
     aria-pressed légitime ; l'écouteur ne modifie que des attributs locaux. */
  if (legende && typeof ctx.el === 'function' && !layout.querySelector('#e085-trace-toggle')) {
    const bascule = ctx.el('button', 'e085-trace', 'Tracer le chemin');
    bascule.id = 'e085-trace-toggle';
    bascule.type = 'button';
    bascule.setAttribute('aria-pressed', 'false');
    bascule.addEventListener('click', () => {
      const actif = bascule.getAttribute('aria-pressed') !== 'true';
      bascule.setAttribute('aria-pressed', actif ? 'true' : 'false');
      champ.setAttribute('data-e085-trace', actif ? '1' : '0');
    });
    legende.appendChild(bascule);
  }

  /* E085-07 — couplage au mouvement réduit : la classe d'animation n'est
     posée que si le contexte autorise les transitions. */
  const anime = typeof ctx.reducedMotion === 'function' && !ctx.reducedMotion();
  champ.classList.toggle('e085-motion', anime);
  champ.setAttribute('data-e085-motion', anime ? 'on' : 'off');

  /* E085-04 / E085-09 / E085-10 sont purement CSS : les règles de mise en
     avant, de format très étroit et de contraste forcé viennent de E085_CSS,
     pilotées par les attributs posés ci-dessus. Aucun écouteur de
     redimensionnement propre, aucune boucle d'animation, aucun minuteur. */
});
