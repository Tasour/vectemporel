import { register } from './registry.js';

/* Lentille E028 — Performance et sobriété (vue Récit).
   Dix chantiers distincts, tous non destructifs : sans JavaScript, la vue reste
   lisible et identique à ce que produit recit.js. Aucun appel réseau, aucun
   aléa, aucune console, aucune donnée inventée : chaque chiffre affiché est
   recalculé depuis le DOM réellement rendu. */

/* Feuille unique, injectée une seule fois par cssOnce (registry.js). Toutes
   les classes sont préfixées recit-e028- ; aucun sélecteur ne cible une classe
   existante, ce qui évite de modifier le rendu de base. */
const FEUILLE = `
.recit-e028-sobriety{margin:10px 0 0;padding:6px 9px;border-left:2px solid var(--gold);border-radius:0 6px 6px 0;background:rgba(230,185,111,.05);color:var(--muted);font-size:9px;line-height:1.5}
.recit-e028-metric{margin:8px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-e028-densite{margin:0 0 7px;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-e028-contained{contain:layout style}
.recit-e028-cv{content-visibility:auto;contain-intrinsic-size:auto 34px}
.recit-e028-compact{max-block-size:184px;overflow:auto;scrollbar-width:thin}
.recit-e028-toggle,.recit-e028-epure-btn{min-height:36px;padding:5px 10px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--gold-bright);font:inherit;font-size:10px;cursor:pointer}
.recit-e028-toggle:focus-visible,.recit-e028-epure-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-e028-toggle[aria-expanded="true"],.recit-e028-epure-btn[aria-pressed="true"]{border-color:var(--gold);background:rgba(230,185,111,.12)}
.recit-e028-epure{grid-template-columns:1fr!important}
.recit-e028-epure .recit-e028-media{display:none!important}
.recit-e028-still *,.recit-e028-still *::before,.recit-e028-still *::after{transition:none!important;animation:none!important}
@media (max-width:620px){
  .recit-e028-sobriety,.recit-e028-metric,.recit-e028-densite{font-size:10px}
  .recit-e028-toggle,.recit-e028-epure-btn{min-height:40px}
}
`;

/* Un chantier défectueux ne doit jamais interrompre le rendu : le registre
   capture déjà les erreurs, cette garde fournit une seconde barrière locale. */
function sansRisque(action) {
  try { action(); } catch { /* neutralisation silencieuse, sans journal */ }
}

/* Ajout d'un nœud sous réserve que son id n'existe pas déjà : rendu après
   rendu, navigation aller-retour ou lentille tierce ne créent jamais de doublon. */
function ajouteSiAbsent(parent, id, noeud) {
  if (!parent || !noeud || typeof document === 'undefined') return false;
  if (document.getElementById(id)) return false;
  noeud.id = id;
  parent.appendChild(noeud);
  return true;
}

register('E028', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (!layout || typeof css !== 'function' || typeof el !== 'function') return;

  sansRisque(() => css('recit-e028', FEUILLE));

  const corps = layout.querySelector('.recit-body');
  const actions = layout.querySelector('.recit-actions');
  const fil = layout.querySelector('.recit-thread');
  const liste = layout.querySelector('#c3a-thread') || layout.querySelector('.recit-thread-list');
  const media = layout.querySelector('.recit-media');
  const legende = layout.querySelector('.recit-legend');
  const kicker = layout.querySelector('.view-kicker');
  const points = layout.querySelectorAll('.recit-thread-item');

  /* E028-03 — Confinement de la mise en page du fil : les ajustements du fil
     ne provoquent plus de reflow sur le reste de la vue. */
  sansRisque(() => {
    if (fil && !fil.classList.contains('recit-e028-contained')) {
      fil.classList.add('recit-e028-contained');
    }
  });

  /* E028-04 — Paint différé des points hors écran via content-visibility.
     La taille intrinsèque garde la barre de défilement stable. */
  sansRisque(() => {
    Array.prototype.forEach.call(points, (point) => {
      if (!point.classList.contains('recit-e028-cv')) point.classList.add('recit-e028-cv');
    });
  });

  /* E028-05 — Fil compact au-delà de douze points : la hauteur du conteneur
     est plafonnée et un bouton permet de la lever. Les points restent dans le
     DOM (aucune donnée perdue) ; seul le coût de peinture initial baisse. */
  sansRisque(() => {
    const seuil = 12;
    const total = points.length;
    if (!liste || total <= seuil || !actions) {
      layout.setAttribute('data-e028-fil', 'entier');
      return;
    }
    const bouton = el('button', 'recit-e028-toggle', `Afficher les ${total} points du fil`);
    bouton.type = 'button';
    bouton.setAttribute('aria-controls', liste.id || 'c3a-thread');
    bouton.setAttribute('aria-expanded', 'false');
    let ouvert = false;
    bouton.addEventListener('click', () => {
      ouvert = !ouvert;
      liste.classList.toggle('recit-e028-compact', !ouvert);
      bouton.setAttribute('aria-expanded', String(ouvert));
      bouton.textContent = ouvert ? 'Réduire le fil' : `Afficher les ${total} points du fil`;
    });
    if (ajouteSiAbsent(actions, 'e028-fil-bouton', bouton)) {
      liste.classList.add('recit-e028-compact');
      layout.setAttribute('data-e028-fil', 'compact');
    }
  });

  /* E028-06 — Décodage et chargement différés de l'unique image locale déjà
     présente dans la vue : aucun src n'est modifié, aucun réseau ajouté. */
  sansRisque(() => {
    const image = media && media.querySelector('img');
    if (!image) {
      layout.setAttribute('data-e028-image', 'absente');
      return;
    }
    if (!image.hasAttribute('loading')) image.setAttribute('loading', 'lazy');
    if (!image.hasAttribute('decoding')) image.setAttribute('decoding', 'async');
    layout.setAttribute('data-e028-image', 'differee');
  });

  /* E028-07 — Mouvement réduit : aucune transition ni animation propre à la
     lentille, et neutralisation de celles déjà présentes dans le panneau. */
  sansRisque(() => {
    let reduit = false;
    try { reduit = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
    catch { reduit = false; }
    if (reduit && !layout.classList.contains('recit-e028-still')) {
      layout.classList.add('recit-e028-still');
    }
    layout.setAttribute('data-e028-mouvement', reduit ? 'reduit' : 'normal');
  });

  /* E028-08 — Mode lecture épurée : bascule indépendante qui masque le
     panneau d'image pour réduire la charge visuelle. Reversible, sans JS le
     panneau reste affiché. */
  sansRisque(() => {
    if (media && !media.classList.contains('recit-e028-media')) {
      media.classList.add('recit-e028-media');
    }
    if (!actions) return;
    const bouton = el('button', 'recit-e028-epure-btn', 'Vue épurée');
    bouton.type = 'button';
    bouton.title = 'Masquer le panneau d’image pour alléger l’affichage';
    bouton.setAttribute('aria-pressed', 'false');
    let actif = false;
    bouton.addEventListener('click', () => {
      actif = !actif;
      layout.classList.toggle('recit-e028-epure', actif);
      bouton.setAttribute('aria-pressed', String(actif));
      bouton.textContent = actif ? 'Vue complète' : 'Vue épurée';
      layout.setAttribute('data-e028-epure', actif ? 'active' : 'inactive');
    });
    if (ajouteSiAbsent(actions, 'e028-epure-bouton', bouton)) {
      layout.setAttribute('data-e028-epure', 'inactive');
    }
  });

  /* E028-01 — Transparence de sobriété : une seule ligne, ajoutée à la
     légende existante, rappelle que la vue ne fait aucun appel réseau. */
  sansRisque(() => {
    const badge = el('p', 'recit-e028-sobriety',
      'Sobriété : aucune requête réseau, données exclusivement locales, aucun aléa.');
    if (ajouteSiAbsent(legende, 'e028-sobriete', badge)) {
      layout.setAttribute('data-e028-sobriete', 'local');
    }
  });

  /* E028-02 — Observabilité du poids du rendu : le nombre de nœuds est
     recalculé depuis le DOM final, jamais mémorisé ni inventé. */
  sansRisque(() => {
    const noeuds = layout.querySelectorAll('*').length;
    const ligne = el('p', 'recit-e028-metric',
      `Légèreté du rendu : ${noeuds} nœuds locaux · ${points.length} point(s) dans le fil.`);
    if (ajouteSiAbsent(corps, 'e028-metrique', ligne)) {
      layout.setAttribute('data-e028-noeuds', String(noeuds));
    }
  });

  /* E028-10 — Densité du fil : compare les points affichés au total annoncé
     par la vue, pour rendre visible le compromis performance / complétude. */
  sansRisque(() => {
    const affiches = points.length;
    const motif = kicker && /Étape\s+(\d+)\s*\/\s*(\d+)/.exec(kicker.textContent || '');
    const total = motif && Number.isFinite(Number(motif[2])) ? Number(motif[2]) : affiches;
    const ligne = el('p', 'recit-e028-densite',
      `Fil : ${affiches} point(s) affiché(s) sur ${total} dans ce repère · rendu allégé sans retrait de données.`);
    if (ajouteSiAbsent(fil, 'e028-densite', ligne)) {
      layout.setAttribute('data-e028-densite', `${affiches}/${total}`);
    }
  });

  /* E028-09 — Sceau d'idempotence : attributs de vérification sur la scène,
     posés une seule fois. Aucun écouteur global, aucun timer, aucun doublon. */
  sansRisque(() => {
    if (!layout.hasAttribute('data-e028-sceau')) {
      layout.setAttribute('data-e028-sceau', 'E028');
      layout.setAttribute('data-e028-chantiers', '10');
      if (stage && !stage.hasAttribute('data-e028-scene')) {
        stage.setAttribute('data-e028-scene', 'recit');
      }
    }
  });
});
