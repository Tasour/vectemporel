import { register } from './registry.js';

/* Lentille E099 — Transitions et mouvement (vue Récit).
 *
 * Dix chantiers indépendants et distincts (E099-01 … E099-10). Cette lentille
 * se concentre sur les TRANSITIONS D'ÉTAT (interpolations CSS pilotées par
 * `transition` et par des attributs réellement présents dans le DOM), et non
 * sur les animations d'entrée déjà exploitées par E019, E029, E049 ou E069.
 *
 * Greffon strictement additif : aucune règle retirée, aucun texte existant
 * réécrit, aucun nœud d'origine supprimé, aucun écouteur posé sur un nœud
 * existant. Une seule feuille de style, injectée par un appel unique à `css`
 * (identifiant `recit-e099`).
 * Toutes les classes créées sont préfixées `recit-e099-`, le seul id DOM créé
 * est `e099-motion-note` (garde anti-doublon). Zéro réseau, zéro aléa, zéro
 * journalisation, aucun fichier partagé modifié. Sans JavaScript, la vue
 * Récit reste intégralement lisible et utilisable.
 *
 * Rapport : UNIFIED_AUDIT/RECIT/views/E099.md.
 */

const RACINE = 'recit-e099-root';

/* Bloc CSS unique, entièrement porté par la classe racine : aucune règle
   globale, aucune ressource distante, aucune police téléchargée. Chaque
   chantier est activé par un attribut `data-e099-*` posé par le JS, ce qui
   rend l'enrichissement conditionnel et vérifiable. */
const CSS = `
.recit-e099-root{--e099-duree:320ms;--e099-courbe:cubic-bezier(.22,.61,.36,1)}

/* E099-01 — fondu d'état des puces de filtre. La transition porte sur
   l'attribut aria-pressed déjà présent ; une pastille apparaît en plus du
   changement de couleur (jamais la couleur seule comme vecteur). */
.recit-e099-root .c3a-filter[data-e099-filtre]{
  transition:color var(--e099-duree) var(--e099-courbe),
             background-color var(--e099-duree) var(--e099-courbe),
             border-color var(--e099-duree) var(--e099-courbe)
}
.recit-e099-root .c3a-filter[data-e099-filtre]::after{
  content:'';display:inline-block;width:5px;height:5px;margin-left:5px;
  border-radius:50%;background:currentColor;vertical-align:middle;
  opacity:0;transform:scale(.4);
  transition:opacity var(--e099-duree) var(--e099-courbe),
             transform var(--e099-duree) var(--e099-courbe)
}
.recit-e099-root .c3a-filter[data-e099-filtre][aria-pressed="true"]::after{
  opacity:1;transform:scale(1)
}

/* E099-02 — halo de focus progressif sur le champ de recherche. */
.recit-e099-root .c3a-search[data-e099-search]{
  transition:border-color var(--e099-duree) var(--e099-courbe),
             box-shadow var(--e099-duree) var(--e099-courbe)
}
.recit-e099-root .c3a-search[data-e099-search]:focus-visible{
  border-color:var(--gold-bright);
  box-shadow:0 0 0 3px rgba(230,185,111,.18)
}

/* E099-03 — révélation douce du crédit et de la légende du média. Les
   textes restent visibles au repos (opacité .6) : rien n'est masqué. */
.recit-e099-root [data-e099-credit]{
  opacity:.6;transition:opacity var(--e099-duree) var(--e099-courbe)
}
.recit-e099-root .recit-media:hover [data-e099-credit],
.recit-e099-root .recit-media:focus-within [data-e099-credit]{opacity:1}

/* E099-04 — pivot du chevron de traçabilité, dans le <details> existant. */
.recit-e099-root .recit-trace summary[data-e099-chevron]{list-style:none}
.recit-e099-root .recit-trace summary[data-e099-chevron]::-webkit-details-marker{display:none}
.recit-e099-root .recit-trace summary[data-e099-chevron]::after{
  content:'›';display:inline-block;margin-left:8px;
  transition:transform var(--e099-duree) var(--e099-courbe)
}
.recit-e099-root .recit-trace[open] summary[data-e099-chevron]::after{transform:rotate(90deg)}

/* E099-05 — glissement directionnel des commandes précédent / suivant :
   le mouvement va dans le sens de l'action, sans toucher au libellé. */
.recit-e099-root .recit-actions [data-e099-nav]{
  transition:transform var(--e099-duree) var(--e099-courbe)
}
.recit-e099-root .recit-actions [data-e099-nav="prec"]:hover:not(:disabled){transform:translateX(-3px)}
.recit-e099-root .recit-actions [data-e099-nav="suiv"]:hover:not(:disabled){transform:translateX(3px)}

/* E099-06 — interpolation continue de la largeur de la barre de progression. */
.recit-e099-root .recit-progress>[data-e099-progress]{
  transition:width 480ms var(--e099-courbe)
}

/* E099-07 — entrée en fondu du message « sans source » et de l'état vide. */
@keyframes recit-e099-fondu{from{opacity:0}to{opacity:1}}
.recit-e099-root [data-e099-entree]{
  animation:recit-e099-fondu var(--e099-duree) ease-out both
}

/* E099-08 — trait de sélection qui se déploie sous le point courant du fil. */
@keyframes recit-e099-trait{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.recit-e099-root [data-e099-courant]{position:relative}
.recit-e099-root [data-e099-courant]::after{
  content:'';position:absolute;left:8px;right:8px;bottom:3px;height:2px;
  border-radius:2px;background:var(--gold-bright);
  transform:scaleX(0);transform-origin:left;
  animation:recit-e099-trait 420ms var(--e099-courbe) forwards
}

/* E099-09 — léger soulèvement de la pastille de certitude au survol. */
.recit-e099-root [data-e099-conf]{
  transition:transform var(--e099-duree) var(--e099-courbe),
             box-shadow var(--e099-duree) var(--e099-courbe)
}
.recit-e099-root [data-e099-conf]:hover{
  transform:translateY(-1px);box-shadow:0 2px 8px rgba(230,185,111,.18)
}

/* E099-10 — gouverneur de mouvement réduit et sa note textuelle. */
.recit-e099-note{
  margin:8px 0 0;color:var(--muted);font-size:9px;line-height:1.5;font-style:italic
}
.recit-e099-root[data-e099-motion="reduit"] *,
.recit-e099-root[data-e099-motion="reduit"] *::before,
.recit-e099-root[data-e099-motion="reduit"] *::after{
  transition:none!important;animation:none!important
}
@media (prefers-reduced-motion:reduce){
  .recit-e099-root *,
  .recit-e099-root *::before,
  .recit-e099-root *::after{transition:none!important;animation:none!important}
}
`;

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

/* Un chantier défaillant ne doit jamais interrompre le rendu. */
function sansEchec(fn) {
  try { fn(); } catch { /* neutralisé : la vue reste lisible */ }
}

register('E099', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;

    css('recit-e099', CSS); /* un seul appel, toutes les règles du module. */
    ajouteClasse(layout, RACINE);

    /* E099-01 — puces de filtre : on active la transition sur chaque puce
       déjà porteuse de aria-pressed, sans toucher à leur libellé. */
    sansEchec(() => {
      const puces = layout.querySelectorAll('.c3a-filter');
      puces.forEach((puce) => {
        if (!puce.hasAttribute('data-e099-filtre')) puce.setAttribute('data-e099-filtre', '1');
      });
    });

    /* E099-02 — champ de recherche : activation du halo de focus. */
    sansEchec(() => {
      const recherche = layout.querySelector('.c3a-search');
      if (recherche && !recherche.hasAttribute('data-e099-search')) {
        recherche.setAttribute('data-e099-search', '1');
      }
    });

    /* E099-03 — crédit et légende du média : révélation au survol / focus.
       Uniquement si ces textes existent réellement. */
    sansEchec(() => {
      const credit = layout.querySelectorAll('.recit-media-credit, .media-caption');
      credit.forEach((noeud) => {
        if (!noeud.hasAttribute('data-e099-credit')) noeud.setAttribute('data-e099-credit', '1');
      });
    });

    /* E099-04 — chevron du résumé de traçabilité : pivot à l'ouverture. */
    sansEchec(() => {
      const resume = layout.querySelector('.recit-trace summary');
      if (resume && !resume.hasAttribute('data-e099-chevron')) {
        resume.setAttribute('data-e099-chevron', '1');
      }
    });

    /* E099-05 — commandes précédent / suivant : glissement directionnel.
       Repérage par data-fk, sans réécrire le texte des boutons. */
    sansEchec(() => {
      const prec = layout.querySelector('.recit-actions [data-fk="c3a-prev"]');
      if (prec && !prec.hasAttribute('data-e099-nav')) prec.setAttribute('data-e099-nav', 'prec');
      const suiv = layout.querySelector('.recit-actions [data-fk="c3a-next"]');
      if (suiv && !suiv.hasAttribute('data-e099-nav')) suiv.setAttribute('data-e099-nav', 'suiv');
    });

    /* E099-06 — barre de progression : le remplissage est le premier span. */
    sansEchec(() => {
      const remplissage = layout.querySelector('.recit-progress > span');
      if (remplissage && !remplissage.hasAttribute('data-e099-progress')) {
        remplissage.setAttribute('data-e099-progress', '1');
      }
    });

    /* E099-07 — entrée en fondu du message sans source et de l'état vide. */
    sansEchec(() => {
      const cibles = layout.querySelectorAll('.recit-sources, .c3a-empty');
      cibles.forEach((noeud) => {
        if (!noeud.hasAttribute('data-e099-entree')) noeud.setAttribute('data-e099-entree', '1');
      });
    });

    /* E099-08 — trait sous le point courant du fil (source de vérité :
       la classe is-current posée par la vue). */
    sansEchec(() => {
      const courant = layout.querySelector('.recit-thread-item.is-current, .recit-thread-item[aria-current="step"]');
      if (courant && !courant.hasAttribute('data-e099-courant')) {
        courant.setAttribute('data-e099-courant', '1');
      }
    });

    /* E099-09 — pastille de certitude : soulèvement au survol. */
    sansEchec(() => {
      const conf = layout.querySelector('.recit-conf');
      if (conf && !conf.hasAttribute('data-e099-conf')) conf.setAttribute('data-e099-conf', '1');
    });

    /* E099-10 — gouverneur : on lit la préférence système une seule fois et
       on la reporte dans un attribut. Une note discrète l'explicite en mode
       réduit, sans doubler la région d'annonce #atlas-recit-live. */
    sansEchec(() => {
      let reduit = false;
      try { reduit = !!reducedMotion(); } catch { reduit = false; }
      layout.setAttribute('data-e099-motion', reduit ? 'reduit' : 'normal');
      if (!reduit) return;
      let note = document.getElementById('e099-motion-note');
      if (!note) {
        note = el('p', 'recit-e099-note',
          'Mouvement réduit : les transitions sont désactivées ; l’information reste intégralement lisible.');
        note.id = 'e099-motion-note';
        note.setAttribute('aria-hidden', 'true');
      }
      const ancres = [layout.querySelector('.recit-legend'), layout.querySelector('.recit-body')];
      const ancre = ancres.find((noeud) => noeud && noeud.appendChild);
      if (ancre && note.parentElement !== ancre) ancre.appendChild(note);
    });
  } catch { /* neutralisé : la vue reste lisible */ }
});
