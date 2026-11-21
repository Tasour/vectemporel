import { register } from './registry.js';

/* V2 lentille E016 — Mobile et reflow responsive (second regard).
 *
 * La passe 1 de E016 était entièrement css : zones sûres, partage vertical,
 * cibles tactiles 44 px, barres défilantes, reflow sans débordement, paysage
 * court, actions ancrées, planchers de police, mouvement réduit et contraste
 * forcé. Cette passe V2 ne reprend aucun de ces chantiers : elle ajoute
 * l'instrumentation et la micro-ergonomie encore absentes, à savoir des
 * lectures chiffrées dérivées du DOM réel (configuration d'affichage,
 * débordement horizontal, hauteur du panneau), une bascule « Mode compact »
 * indépendante, l'ancrage magnétique du fil, la contention du rebond de
 * défilement, le liseré en vue empilée, le correctif de zoom iOS, le
 * surlignage tactile et la transparence réduite.
 *
 * Greffon strictement additif : aucun texte existant n'est retiré ni réécrit,
 * aucun gestionnaire existant n'est ré-attribué, aucun fichier partagé n'est
 * modifié. Une seule classe racine `recit-v2-e016-root` posée sur `layout` et,
 * au choix de l'utilisateur, `recit-v2-e016-compact`. Un seul bloc CSS injecté
 * en une fois (cssOnce garantit l'idempotence). Toutes les
 * classes créées sont préfixées `recit-v2-e016-`, tous les ids DOM `v2-e016-`
 * (jamais les ids `e016-…` de la passe 1). Zéro réseau, zéro console, zéro
 * aléa. Les dix chantiers E016-01 … E016-10 sont détaillés dans
 * UNIFIED_AUDIT/RECIT/V2/views/E016.md.
 */

const CSS = `
/* E016-01 — Indicateur de configuration d'affichage : lecture chiffrée de
   l'orientation, du nombre de colonnes et de la largeur mesurés au rendu. */
.recit-v2-e016-config{
  margin:4px 0 0;color:var(--muted);font-size:9px;line-height:1.5;
  font-variant-numeric:tabular-nums;
}

/* E016-02 — Contrôle de débordement horizontal : le résultat, jamais le
   chiffre, est porté par une phrase visible dérivée de scrollWidth. */
.recit-v2-e016-overflow{
  margin:2px 0 0;color:var(--muted);font-size:9px;line-height:1.5;
  font-variant-numeric:tabular-nums;
}

/* E016-03 — Bascule « Mode compact » : cible ≥ 36 px, aria-pressed réservé à
   cette bascule indépendante, contour de focus explicite. Le rythme compressé
   ne s'applique qu'après activation explicite et reste réversible. */
.recit-v2-e016-toggle{
  min-height:36px;min-width:36px;margin:6px 0 2px;padding:6px 10px;
  font:600 11px/1 inherit;color:var(--ink-soft);
  background:rgba(230,185,111,.08);border:1px solid var(--line-strong);
  border-radius:6px;cursor:pointer;
}
.recit-v2-e016-toggle[aria-pressed="true"]{
  color:var(--gold-bright);border-color:var(--gold);
}
.recit-v2-e016-toggle:focus-visible{
  outline:2px solid var(--gold-bright);outline-offset:2px;
}
.recit-v2-e016-root.recit-v2-e016-compact .recit-progress{margin-bottom:4px}
.recit-v2-e016-root.recit-v2-e016-compact .recit-context{margin-top:4px;margin-bottom:6px}
.recit-v2-e016-root.recit-v2-e016-compact .recit-thread{margin-top:4px;margin-bottom:6px}
.recit-v2-e016-root.recit-v2-e016-compact .recit-legend p{margin:3px 0}

/* E016-04 — Hauteur du panneau de lecture : lecture visible de la hauteur
   réellement disponible, utile lorsque le clavier virtuel réduit la vue. */
.recit-v2-e016-height{
  margin:2px 0 0;color:var(--muted);font-size:9px;line-height:1.5;
  font-variant-numeric:tabular-nums;
}

/* E016-05 — Ancrage magnétique du fil défilant : les vrais <li> du fil
   deviennent des points d'accroche, sans ajout de numéro (déjà porté par le
   texte du bouton). La garde data-v2-e016-snap n'active la règle que si la
   liste existe réellement dans le DOM. */
.recit-v2-e016-root .recit-v2-e016-snap{
  scroll-snap-type:x proximity;scroll-padding-inline:6px;
}
.recit-v2-e016-root .recit-v2-e016-snap>li{scroll-snap-align:start}

/* E016-06 — Contention du rebond de défilement : sur mobile, un panneau qui
   arrive en fin de course ne propage plus son élan à la page entière. */
.recit-v2-e016-root .recit-body,
.recit-v2-e016-root .c3a-tools,
.recit-v2-e016-root .recit-thread-list{overscroll-behavior:contain}
@media (max-width:620px){
  .recit-v2-e016-root .c3a-tools,
  .recit-v2-e016-root .recit-thread-list{overscroll-behavior-x:contain}
}

/* E016-07 — Liseré de séparation en vue empilée : posé uniquement lorsque la
   mesure réelle du nombre de colonnes indique une mise en page à une colonne. */
.recit-v2-e016-root[data-v2-e016-stacked="1"] .recit-media{
  border-bottom:1px solid var(--line);
}

/* E016-08 — Correctif de zoom iOS sur la recherche : un champ sous 16 px
   provoque un zoom automatique à la prise de focus sous pointeur grossier. */
@media (pointer:coarse) and (max-width:620px){
  .recit-v2-e016-root .c3a-search{font-size:16px}
}

/* E016-09 — Surlignage tactile et tolérance au toucher : retour visuel au
   tap et suppression du délai de 300 ms sur les contrôles natifs. */
@media (pointer:coarse){
  .recit-v2-e016-root button,
  .recit-v2-e016-root summary,
  .recit-v2-e016-root [role="button"]{
    -webkit-tap-highlight-color:rgba(230,185,111,.28);
    touch-action:manipulation;
  }
}

/* E016-10 — Transparence réduite et focus dans les zones défilantes : les
   fonds translucides deviennent opaques ; le contour :focus-within signale la
   zone défilante quand un de ses boutons reçoit le focus, sans tab stop ajouté. */
@media (prefers-reduced-transparency:reduce){
  .recit-v2-e016-root .recit-actions{background:rgba(8,11,16,1)}
  .recit-v2-e016-root .media-caption{background:#000}
}
.recit-v2-e016-root .c3a-tools:focus-within,
.recit-v2-e016-root .recit-thread-list:focus-within{
  outline:2px solid rgba(230,185,111,.45);outline-offset:-1px;
}
`;

register('E016', (ctx) => {
  try {
    if (typeof document === 'undefined' || !ctx || !ctx.layout ||
        typeof ctx.layout.querySelector !== 'function') return;

    const { layout } = ctx;

    /* Un seul appel CSS pour toute la lentille (cssOnce garantit l'idempotence). */
    css('recit-v2-e016', CSS);

    /* Vrai nœud d'élément (nodeType 1) — écarte textes et commentaires. */
    function present(node) {
      return !!(node && node.nodeType === 1);
    }

    /* Ajoute une classe sans jamais écraser les classes déjà portées. */
    function ajouteClasse(node, nom) {
      if (present(node) && node.classList && !node.classList.contains(nom)) {
        node.classList.add(nom);
      }
    }

    /* Pose un attribut data-* réservé à la lentille (jamais un id d'élément). */
    function data(node, nom, valeur) {
      if (!present(node) || typeof node.setAttribute !== 'function') return;
      try { node.setAttribute(`data-v2-e016-${nom}`, String(valeur)); } catch { /* facultatif */ }
    }

    /* Dépose ou réutilise un bloc visible, à un emplacement stable. Le nœud est
       retrouvé par son id préfixé, mis à jour, puis déplacé après l'ancre. */
    function placeBloc(id, tag, classe, texte, parent, ancre) {
      if (!present(parent) || typeof parent.insertBefore !== 'function') return null;
      let noeud = document.getElementById(id);
      if (!noeud) {
        noeud = document.createElement(tag);
        noeud.id = id;
      }
      noeud.className = classe;
      noeud.textContent = texte;
      const cible = present(ancre) && ancre.parentNode === parent ? ancre.nextSibling : null;
      if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
        parent.insertBefore(noeud, cible);
      }
      return noeud;
    }

    ajouteClasse(layout, 'recit-v2-e016-root');

    const corps = layout.querySelector('.recit-body');
    if (!present(corps)) return;

    const progression = layout.querySelector('.recit-progress');
    const timing = layout.querySelector('.recit-timing');
    const liste = layout.querySelector('.recit-thread-list');

    /* --- Chantier 01 : configuration d'affichage (orientation, colonnes,
       largeur) lue sur la géométrie réelle, sans nombre inventé. ------------- */
    let largeur = null;
    let colonnes = null;
    try {
      const rect = layout.getBoundingClientRect();
      if (rect && typeof rect.width === 'number' && rect.width > 0) {
        largeur = Math.round(rect.width);
      }
      const calcul = typeof window !== 'undefined' && window.getComputedStyle
        ? window.getComputedStyle(layout) : null;
      const grille = calcul && calcul.gridTemplateColumns;
      if (grille && typeof grille === 'string') {
        const n = grille.trim().split(/\s+/).filter(Boolean).length;
        if (n > 0) colonnes = n >= 2 ? 'deux colonnes' : 'une colonne';
      }
    } catch { /* géométrie indisponible : on omet la donnée plutôt que de l'inventer */ }

    const paysage = typeof window !== 'undefined' &&
      window.innerWidth >= window.innerHeight;
    let config = paysage ? 'Paysage' : 'Portrait';
    if (colonnes) config += ` · ${colonnes}`;
    if (largeur !== null) config += ` · ${largeur} px mesurés`;
    config += ' (au rendu).';

    const ancreHaut = present(progression) ? progression : corps.firstChild;
    const blocConfig = placeBloc('v2-e016-config', 'p', 'recit-v2-e016-config',
      `Configuration d'affichage : ${config}`, corps, ancreHaut);

    /* --- Chantier 03 : bascule « Mode compact ». Le nœud est réutilisé, un
       seul écouteur posé à la création, l'état ARIA relu à chaque rendu. ----- */
    const boutonCompact = placeBloc('v2-e016-compact', 'button', 'recit-v2-e016-toggle',
      'Mode compact', corps, blocConfig || ancreHaut);
    if (present(boutonCompact)) {
      boutonCompact.setAttribute('type', 'button');
      if (!boutonCompact.hasAttribute('data-v2-e016-bound')) {
        boutonCompact.addEventListener('click', () => {
          const actif = layout.classList.toggle('recit-v2-e016-compact');
          boutonCompact.setAttribute('aria-pressed', String(actif));
        });
        boutonCompact.setAttribute('data-v2-e016-bound', '1');
      }
      boutonCompact.setAttribute('aria-pressed',
        String(layout.classList.contains('recit-v2-e016-compact')));
    }

    /* --- Chantier 02 : débordement horizontal mesuré sur le document, jamais
       déduit d'une valeur codée en dur. ------------------------------------- */
    let debordement = null;
    try {
      const largeurDoc = document.documentElement && document.documentElement.scrollWidth;
      const largeurVue = typeof window !== 'undefined' ? window.innerWidth : 0;
      if (typeof largeurDoc === 'number' && largeurVue) debordement = largeurDoc - largeurVue;
    } catch { /* mesure indisponible */ }
    const texteDebord = debordement === null
      ? 'Débordement horizontal : non mesurable au rendu.'
      : (debordement <= 1
        ? 'Aucun débordement horizontal mesuré au rendu.'
        : `Débordement horizontal : ${debordement} px au rendu.`);
    placeBloc('v2-e016-overflow', 'p', 'recit-v2-e016-overflow',
      texteDebord, corps, boutonCompact || blocConfig || ancreHaut);

    /* --- Chantier 04 : hauteur réellement disponible du panneau de lecture. */
    let hauteur = null;
    try {
      const rect = corps.getBoundingClientRect();
      if (rect && typeof rect.height === 'number' && rect.height > 0) {
        hauteur = Math.round(rect.height);
      }
    } catch { /* mesure indisponible */ }
    const texteHauteur = hauteur !== null
      ? `Hauteur du panneau de lecture : ${hauteur} px (au rendu).`
      : 'Hauteur du panneau de lecture : non mesurable au rendu.';
    placeBloc('v2-e016-height', 'p', 'recit-v2-e016-height',
      texteHauteur, corps, present(timing) ? timing : (boutonCompact || ancreHaut));

    /* --- Chantier 05 : ancrage magnétique du vrai fil défilant. ------------- */
    if (present(liste)) {
      ajouteClasse(liste, 'recit-v2-e016-snap');
      data(liste, 'snap', '1');
    }

    /* --- Chantier 07 : liseré posé seulement si la grille mesure une colonne. */
    if (colonnes === 'une colonne') data(layout, 'stacked', '1');

    /* Les chantiers 06, 08, 09 et 10 sont purement css et n'exigent aucun
       nœud : leurs règles sont déjà portées par la feuille unique ci-dessus. */
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
