import { register } from './registry.js';

/* Lentille E015 — Adaptabilité responsive appliquée aux planètes de la vue
   Constellation. Dix chantiers concrets, tous locaux : aucun appel réseau,
   aucune source aléatoire, aucune sortie de journal, aucun minuteur ni
   boucle d'animation propre. Le greffon reste tolérant : il ne touche au DOM
   que si ctx.layout porte bien un champ. */

/* Seuils de densité, en largeur disponible par planète (px). */
const E015_SEUIL_COMPACT = 34;
const E015_SEUIL_SERRE = 22;

/* État module partagé entre deux rendus du shell (le DOM est recréé à chaque
   set()). Un seul observateur, reconnecté sur le champ courant. */
let e015Observateur = null;
let e015Champ = null;

/* Feuille unique de la lentille. Chaque règle porte l'étiquette du chantier
   qu'elle matérialise ; la classe .e015-responsive est posée par E015-02. */
const E015_CSS = `
  /* E015-01 — Dimension de planète fluide : la vue pose --const-node-size en
     dur (18/22/28 px), on lui substitue une valeur clampée et prioritaire. */
  .constellation-field.e015-responsive { --e015-node: 28px; }
  .constellation-field.e015-responsive .const-planet {
    width: var(--e015-node) !important;
    height: var(--e015-node) !important;
  }
  @media (max-width: 620px) {
    .constellation-field.e015-responsive { --e015-node: clamp(16px, 5vw, 24px); }
  }
  @media (max-width: 420px) {
    .constellation-field.e015-responsive { --e015-node: clamp(14px, 6vw, 20px); }
  }

  /* E015-02 — Largeur d'étiquette pilotée par l'attribut de densité mesuré. */
  .constellation-field.e015-responsive[data-e015-density="compact"] .const-planet::after {
    width: 72px !important;
  }
  .constellation-field.e015-responsive[data-e015-density="sere"] .const-planet::after {
    width: 56px !important;
    font-size: 7px !important;
  }

  /* E015-03 — Étiquettes compactes sous 480 px : largeur, taille et
     interlignage resserrés, sans supprimer le texte. */
  @media (max-width: 480px) {
    .constellation-field.e015-responsive .const-planet::after {
      width: 64px !important;
      font-size: 7px !important;
      line-height: 1.1 !important;
    }
  }

  /* E015-04 — Compression coordonnée des orbites : la même échelle est
     appliquée au SVG des traits et aux trois couches, donc traits et
     planètes restent alignés ; origine = centre du champ. */
  .constellation-field.e015-responsive { --e015-scale: 1; }
  .constellation-field.e015-responsive .constellation-edges,
  .constellation-field.e015-responsive .const-layer {
    transform: scale(var(--e015-scale));
    transform-origin: 50% 50%;
  }
  @media (max-width: 420px) {
    .constellation-field.e015-responsive { --e015-scale: .86; }
  }
  @media (max-width: 340px) {
    .constellation-field.e015-responsive { --e015-scale: .78; }
  }

  /* E015-05 — Cible tactile minimale de 24 px : un ::before transparent
     élargit la zone cliquable quand le disque visible rétrécit. */
  .constellation-field.e015-responsive .const-planet::before {
    content: "";
    position: absolute;
    left: 50%; top: 50%;
    width: max(var(--e015-node), 24px);
    height: max(var(--e015-node), 24px);
    transform: translate(-50%, -50%);
    border-radius: 50%;
  }

  /* E015-06 — Pastille de densité dans la légende : pliée sur elle-même en
     colonne étroite, elle garde une hauteur d'appui >= 24 px. */
  .e015-density-chip {
    display: inline-flex; align-items: center;
    min-height: 24px; padding: 2px 8px;
    border: 1px solid var(--line); border-radius: 999px;
    color: var(--muted); font-size: 8px; white-space: nowrap;
  }
  @media (max-width: 480px) {
    .e015-density-chip { flex-basis: 100%; justify-content: center; }
  }

  /* E015-07 — Encombrement : au-delà du seuil, seules la planète active et
     la planète focalisée gardent leur étiquette lisible. */
  .constellation-field.e015-responsive[data-e015-crowded="1"] .const-planet:not(.is-active)::after {
    opacity: 0 !important;
  }

  /* E015-08 — Alternance haute/basse des étiquettes en colonne étroite :
     les planètes paires étiquettent au-dessus, les impaires en dessous. */
  @media (max-width: 480px) {
    .constellation-field.e015-responsive .const-planet:nth-child(even)::after {
      top: auto !important;
      bottom: calc(100% + 3px) !important;
    }
  }

  /* E015-09 — Révélation au focus clavier : quand E015-07 masque les
     étiquettes, Tab les rend de nouveau visibles et contrastées. */
  .constellation-field.e015-responsive .const-planet:focus-visible::after {
    opacity: 1 !important;
    color: var(--gold-bright) !important;
    font-weight: 600 !important;
    z-index: 6;
  }

  /* E015-10 — Transitions douces, ajoutées uniquement quand le mouvement
     n'est pas réduit (la classe est posée côté JS via ctx.reducedMotion()). */
  .constellation-field.e015-responsive.e015-motion .const-planet,
  .constellation-field.e015-responsive.e015-motion .constellation-edges,
  .constellation-field.e015-responsive.e015-motion .const-layer {
    transition: transform .18s ease, width .18s ease, height .18s ease;
  }
`;

register('E015', (ctx) => {
  /* Garde d'entrée : sans layout valide ni document, aucun ajout DOM. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;

  const champ = ctx.layout.querySelector('.constellation-field');
  if (!champ) return;
  const planetes = champ.querySelectorAll('.const-planet');
  let pastille = null;

  /* E015-07 — Calcul d'encombrement : trop de repères, ou trop peu de place
     par repère, bascule l'attribut qui pilote le masquage des étiquettes. */
  const appliquerEncombrement = (cible, parPlanete, compte) => {
    const serre = compte > 14 || parPlanete < E015_SEUIL_SERRE;
    cible.setAttribute('data-e015-crowded', serre ? '1' : '0');
  };

  /* E015-02 — Mesure de densité : largeur du champ / nombre de planètes,
     traduite en attribut lisible et rafraîchie par ResizeObserver. */
  const appliquerDensite = (cible) => {
    if (!cible || !cible.isConnected) return;
    const largeur = cible.clientWidth || 0;
    const compte = cible.querySelectorAll('.const-planet').length;
    const parPlanete = compte ? largeur / compte : largeur;
    const densite = parPlanete < E015_SEUIL_SERRE
      ? 'sere'
      : parPlanete < E015_SEUIL_COMPACT ? 'compact' : 'spacieux';
    cible.setAttribute('data-e015-density', densite);
    cible.setAttribute('data-e015-par-planete', String(Math.round(parPlanete)));
    appliquerEncombrement(cible, parPlanete, compte);
    if (pastille && pastille.isConnected) {
      pastille.textContent = `${compte} repères · ${densite}`;
    }
  };

  /* E015-01 — Injection unique de la feuille CSS (un seul appel ctx.css),
     puis activation de la classe qui porte toutes les règles responsive. */
  ctx.css('constellation-e015', E015_CSS);
  champ.classList.add('e015-responsive');
  appliquerDensite(champ);

  if (typeof ResizeObserver !== 'undefined') {
    try {
      if (!e015Observateur) {
        e015Observateur = new ResizeObserver(() => appliquerDensite(e015Champ));
      }
      if (e015Champ && e015Champ !== champ && typeof e015Observateur.unobserve === 'function') {
        e015Observateur.unobserve(e015Champ);
      }
      e015Observateur.observe(champ);
      e015Champ = champ;
    } catch {
      /* Greffon tolérant : on conserve la mesure initiale, sans exception. */
    }
  }

  /* E015-06 — Pastille de densité ajoutée à la légende existante, avec un
     id préfixé et une garde contre les rendus successifs. */
  const legende = ctx.layout.querySelector('.constellation-legend');
  if (legende && !ctx.layout.querySelector('#e015-density-chip')) {
    pastille = ctx.el('span', 'e015-density-chip', '');
    pastille.id = 'e015-density-chip';
    pastille.setAttribute('aria-hidden', 'true');
    legende.appendChild(pastille);
    appliquerDensite(champ);
  }

  /* E015-10 — Couplage au mouvement réduit : la classe d'animation n'est
     posée que si ctx.reducedMotion() autorise les transitions. */
  const mouvementAutorise = typeof ctx.reducedMotion === 'function' && !ctx.reducedMotion();
  champ.classList.toggle('e015-motion', mouvementAutorise);
  champ.setAttribute('data-e015-motion', mouvementAutorise ? 'on' : 'off');

  /* E015-08 / E015-09 — Marquage du nombre de planètes pour les règles
     d'alternance et de révélation au focus (attribut de comptage stable). */
  champ.setAttribute('data-e015-planetes', String(planetes.length));
});
