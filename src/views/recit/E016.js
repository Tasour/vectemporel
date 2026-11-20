import { register } from './registry.js';

/* Lentille E016 — Mobile et reflow responsive (vue Récit).
   Dix chantiers purement css : aucun noeud cree, aucun identifiant, aucun
   attribut ARIA ni texte de la vue modifie, aucune donnee inventee. La vue
   reste lisible et navigable sans cette feuille : elle n'ajoute que de la
   mise en page et de la lisibilite sur les petits ecrans.
   Une seule feuille (cssOnce par l'id) et un seul enregistrement. */

register('E016', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;

  /* Garde d'existence : le stage est reconstruit a chaque rendu, on ne
     travaille que sur le layout courant, sans jamais interrompre le rendu. */
  if (!stage || !layout || typeof layout.classList === 'undefined') return;

  css('recit-e016', `
    /* E016-01 — Zones sure : encoche et barre gestuelle.
       Les paddings absorbent les insets plutot que de laisser le texte
       passer sous l'encoche ; env(...,0px) fournit un repli universel. */
    @media (max-width:620px){
      .recit-e016 .recit-body{
        padding-top:max(12px, env(safe-area-inset-top, 0px));
        padding-right:max(14px, env(safe-area-inset-right, 0px));
        padding-bottom:max(24px, env(safe-area-inset-bottom, 0px));
        padding-left:max(14px, env(safe-area-inset-left, 0px));
      }
      .recit-e016 .media-caption{
        right:max(10px, env(safe-area-inset-right, 0px));
        left:max(10px, env(safe-area-inset-left, 0px));
      }
    }

    /* E016-02 — Partage vertical sous clavier virtuel.
       On reduit la bande image pour rendre de la hauteur au recit, sans
       toucher au contenu ni a l'ordre des blocs. */
    @media (max-width:1000px) and (min-width:621px){
      .recit-e016.recit-layout{grid-template-rows:minmax(120px,24%) minmax(0,1fr)}
    }
    @media (max-width:620px){
      .recit-e016.recit-layout{
        grid-template-columns:minmax(0,1fr);
        grid-template-rows:minmax(84px,17vh) minmax(0,1fr);
      }
      .recit-e016 .recit-media{min-height:84px;max-height:19vh}
    }

    /* E016-03 — Cibles tactiles d'au moins 44 px sur pointeur grossier.
       Le media pointer desactive ces regles sous la souris du test E2E. */
    @media (pointer:coarse){
      .recit-e016 .recit-actions button,
      .recit-e016 .recit-thread-item,
      .recit-e016 .c3a-filter,
      .recit-e016 .c3a-reset,
      .recit-e016 .c3a-search,
      .recit-e016 .recit-trace summary{min-height:44px}
    }

    /* E016-04 — Bandeau d'outils compact et defilant.
       Recherche et filtres tiennent sur une ligne ; le defilement horizontal
       natif garde tous les boutons atteignables au clavier. */
    @media (max-width:620px){
      .recit-e016 .c3a-tools{
        flex-direction:row;flex-wrap:nowrap;
        overflow-x:auto;overflow-y:hidden;
        -webkit-overflow-scrolling:touch;
        scrollbar-width:none;gap:6px;padding-bottom:2px;
      }
      .recit-e016 .c3a-tools::-webkit-scrollbar{display:none}
      .recit-e016 .c3a-search{flex:0 0 min(72vw,240px);width:auto}
      .recit-e016 .c3a-group{flex:0 0 auto;flex-wrap:nowrap}
    }

    /* E016-05 — Fil du recit en bandeau horizontal compact.
       Aucune troncature ni line-clamp : le libelle se replie dans sa carte
       et la largeur reste bornee pour eviter un debordement. */
    @media (max-width:620px){
      .recit-e016 .recit-thread-list{
        flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;
        -webkit-overflow-scrolling:touch;
        scrollbar-width:none;gap:6px;padding-bottom:4px;
      }
      .recit-e016 .recit-thread-list::-webkit-scrollbar{display:none}
      .recit-e016 .recit-thread-list>li{
        flex:0 0 auto;min-width:0;max-width:min(82vw,300px);
      }
      .recit-e016 .recit-thread-item{
        white-space:normal;overflow-wrap:anywhere;text-align:left;
      }
    }

    /* E016-06 — Reflow sans debordement horizontal.
       Les enfants de grille peuvent diminuer ; les textes longs et les
       images restent dans la largeur disponible, y compris a 320 px. */
    .recit-e016.recit-layout{max-width:100%}
    .recit-e016 .recit-body,
    .recit-e016 .recit-media{min-width:0;max-width:100%}
    .recit-e016 .recit-media img{display:block;max-width:100%;height:100%;object-fit:cover}
    @media (max-width:620px){
      .recit-e016 .recit-title{overflow-wrap:anywhere;word-break:normal}
      .recit-e016 .recit-actions,
      .recit-e016 .c3a-group,
      .recit-e016 .recit-thread{max-width:100%}
      .recit-e016 .recit-actions>button{min-width:0}
    }

    /* E016-07 — Paysage court et clavier ouvert : on retombe en deux
       colonnes des que la hauteur passe sous 520 px, chaque panneau gardant
       son propre defilement. */
    @media (max-height:520px) and (orientation:landscape){
      .recit-e016.recit-layout{
        grid-template-columns:minmax(0,38%) minmax(0,62%);
        grid-template-rows:minmax(0,1fr);
      }
      .recit-e016 .recit-media{min-height:0;max-height:none;height:100%}
      .recit-e016 .recit-body{padding-top:10px;padding-bottom:16px}
    }

    /* E016-08 — Barre d'actions ancrée en bas du panneau de lecture.
       Les six commandes restent accessibles sans remonter le texte ; elles
       tiennent sur une seule ligne defilante. */
    @media (max-width:620px){
      .recit-e016 .recit-actions{
        position:sticky;bottom:0;z-index:2;
        flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;
        -webkit-overflow-scrolling:touch;
        scrollbar-width:none;gap:6px;
        margin-top:10px;padding:8px 2px 6px;
        background:rgba(8,11,16,.96);
        border-top:1px solid var(--line);
      }
      .recit-e016 .recit-actions::-webkit-scrollbar{display:none}
      .recit-e016 .recit-actions>button{flex:0 0 auto;white-space:nowrap}
    }

    /* E016-09 — Lisibilite sous zoom et police systeme : le rem suit la
       preference de l'utilisateur, le plancher evite les textes illisibles. */
    @media (max-width:620px){
      .recit-e016 .recit-body{font-size:max(11px,0.78rem)}
      .recit-e016 .view-kicker,
      .recit-e016 .recit-timing,
      .recit-e016 .recit-meta,
      .recit-e016 .recit-conf,
      .recit-e016 .recit-thread-title,
      .recit-e016 .thread-kind,
      .recit-e016 .recit-legend,
      .recit-e016 .recit-sources,
      .recit-e016 .c3a-status,
      .recit-e016 .c3a-group-label,
      .recit-e016 .c3a-filter,
      .recit-e016 .c3a-search,
      .recit-e016 .recit-thread-item,
      .recit-e016 .recit-actions button{font-size:max(10px,0.7rem)}
      .recit-e016 .recit-title{font-size:clamp(23px,6.4vw,32px);line-height:1.2}
      .recit-e016 .recit-context{font-size:max(13px,0.9rem);line-height:1.6}
      .recit-e016 .recit-legend p,
      .recit-e016 .recit-trace p{line-height:1.5}
    }

    /* E016-10 — Mouvement reduit, focus et contraste force.
       L'anneau de focus est rentre dans l'ecran a 320 px ; la classe
       .recit-e016-reduit reflete la preference meme sans media query. */
    .recit-e016 .recit-progress>span{transition:width .2s ease}
    @media (prefers-reduced-motion:reduce){
      .recit-e016 .recit-progress>span,
      .recit-e016 .recit-body,
      .recit-e016 .recit-media{transition:none;scroll-behavior:auto}
    }
    .recit-e016-reduit .recit-progress>span{transition:none}
    .recit-e016-reduit .recit-body,
    .recit-e016-reduit .recit-media{scroll-behavior:auto}
    @media (max-width:620px){
      .recit-e016 button:focus-visible,
      .recit-e016 [tabindex]:focus-visible,
      .recit-e016 summary:focus-visible{outline-offset:1px;outline-width:3px}
    }
    @media (forced-colors:active){
      .recit-e016 .recit-media,
      .recit-e016 .recit-thread-item,
      .recit-e016 .c3a-search,
      .recit-e016 .recit-actions,
      .recit-e016 .recit-trace,
      .recit-e016 .c3a-empty{
        border:1px solid CanvasText;background:Canvas;color:CanvasText;
      }
    }
  `);

  /* Une seule classe de portee, ajouee de facon non destructive : elle ne
     remplace aucun attribut et disparait avec le DOM du rendu courant. */
  layout.classList.add('recit-e016');

  /* Repli explicite de la preference de mouvement, sans toucher au DOM. */
  if (typeof reducedMotion === 'function' && reducedMotion()) {
    layout.classList.add('recit-e016-reduit');
  }
});
