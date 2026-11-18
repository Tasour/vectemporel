import { register } from './registry.js';

/* Lentille M42 — Contraste et lisibilité (domaine E : qualité & validation).
 * Chantiers M42-01 … M42-12, tous implémentés dans ce module.
 *
 * Faits relevés dans les fichiers locaux (aucune valeur inventée) :
 *  - globe-reveal.js:73  .gr-figure : filter:drop-shadow(0 12px 32px rgba(0,0,0,.55))
 *  - globe-reveal.js:77  .gr-page   : background:rgba(8,11,18,.72); color:#f5e9d0
 *  - globe-reveal.js:91  .gr-page span : opacity:.85
 *  - globe-reveal.js:92-94 .gr-caption : bottom:-26px; white-space:nowrap; color:#f5e9d0
 *  - styles.css:6        --line: rgba(255,255,255,.1)
 *  - styles.css:154,171,177 bordures 1px var(--line) sur commandes / orientation / cartes
 *  - styles.css:110-113,230,243 corps 8 px, badges 7 px, media-caption 9 px
 *  - styles.css:143      état « ready » repasse de --ink-soft (13,06:1) à --muted (7,51:1)
 *  - styles.css:188      .globe-country-name : white-space:nowrap (troncature au zoom 200 %)
 *  - styles.css:33-36    focus-visible : outline 2px --gold-bright, offset 3px
 *  - styles.css:342-344  seul prefers-reduced-motion est géré ; aucun forced-colors
 *
 * Contraste calculé (sRGB, WCAG 2.x) :
 *  - #f5e9d0 sur drapeau jaune DE (#e0e000) : 1,18:1 ; sur blanc JP (#f6f6f4) : 1,11:1
 *  - plaque rgba(8,11,16,.92) sur jaune + texte --ink : 14,69:1
 *  - bordure blanche 10 % sur --surface-2 : 1,31:1 ; à 42 % : 4,07:1 (seuil UI 3:1)
 *  - page .94 + texte opaque sur jaune : 14,80:1 ( contre 6,39:1 avec .72 + opacité .85 )
 *
 * Aucune requête réseau, aucune source aléatoire, aucun appel à la console,
 * aucun fichier partagé modifié, aucun sélecteur de test renommé. */
const CSS_ID = 'monde-m42';
const OVERLAY_ID = 'globe-reveal';

const CSS = `
  /* M42-01 — plaque opaque sous la légende du drapeau : contraste déterministe,
     indépendant de la couleur du drapeau masqué. M17 garde text-transform:none.
     CORRECTIF : la source impose white-space:nowrap (globe-reveal.js:93), ce qui
     rendait overflow-wrap inopérant ; on repasse en flux normal et on ancre la
     plaque sous la figure (top:100%) pour qu'un libellé sur 2 lignes ne
     chevauche jamais le drapeau, quel que soit le zoom. */
  #globe-reveal .gr-caption{
    top:100%;bottom:auto;margin-top:10px;left:50%;transform:translateX(-50%);
    max-width:calc(100% - 24px);white-space:normal;
    padding:4px 12px;border:1px solid var(--line-strong);border-radius:999px;
    background:rgba(8,11,16,.92);color:var(--ink);
    font-size:13px;font-weight:600;letter-spacing:.02em;line-height:1.3;
    text-align:center;text-shadow:none;overflow-wrap:anywhere;
  }

  /* M42-02 — page de révélation : fond porté de .72 à .94, texte à opacité pleine. */
  #globe-reveal .gr-page{background:rgba(8,11,18,.94);color:var(--ink)}
  #globe-reveal .gr-page strong{color:var(--gold-bright)}
  #globe-reveal .gr-page span{opacity:1;color:var(--ink-soft)}

  /* M42-03 — délimitation des cibles : bordure portée de 1,31:1 à 4,07:1.
     Les états sélectionné/survolé/appuyé gardent leurs règles d'origine. */
  .globe-view .globe-orientation{border-color:rgba(255,255,255,.42)}
  .globe-view .globe-country:not([aria-current="true"]):not(:hover){border-color:rgba(255,255,255,.42)}
  .globe-view .globe-controls button:not(:hover):not([aria-pressed="true"]){border-color:rgba(255,255,255,.42)}

  /* M42-04 + M42-07 — plancher typographique et contraste renforcé de l'aide.
     Les interlignes évitent la coupe des petites capitales au zoom 200 %. */
  .globe-list .globe-help{color:var(--muted);font-size:13px}
  .globe-view .globe-progress{font-size:13px;line-height:1.45}
  .view-kicker,.view-title,.shell-footer,.aside-credit,.recit-note{font-size:10px;letter-spacing:.08em;line-height:1.4}
  .point-kind,.confidence,.points-meta span,.points-families span{font-size:9px;line-height:1.3}
  .media-caption{font-size:11px;line-height:1.4}
  .globe-status[data-kind="ready"]{color:var(--ink-soft)}

  /* M42-05 — préférences de contraste et couleurs forcées (absentes de styles.css).
     On couvre aussi les commandes, cartes et la légende media pour que chaque
     surface porteuse de texte reçoive une frontière CanvasText explicite. */
  @media (prefers-contrast:more){
    #globe-reveal .gr-caption,
    #globe-reveal .gr-page,
    .globe-view .globe-status,
    .globe-view .globe-hover-readout,
    .globe-view .globe-orientation{
      background:#05070a;border-color:var(--gold-bright);color:var(--ink);
    }
    .globe-view .globe-help,
    .globe-view .globe-country-meta{color:var(--ink-soft)}
  }
  @media (forced-colors:active){
    #globe-reveal .gr-caption,
    #globe-reveal .gr-page,
    .globe-view .globe-status,
    .globe-view .globe-hover-readout,
    .globe-view .globe-orientation,
    .globe-view .globe-country,
    .globe-view .globe-controls button,
    .media-caption{
      border:1px solid CanvasText;background:Canvas;color:CanvasText;
    }
  }

  /* M42-06 — l'ombre portée n'est plus le seul séparateur du texte sur image. */
  .media-caption{background:rgba(8,11,16,.82);padding:3px 8px;border-radius:6px;text-shadow:none}

  /* M42-08 — reflow / zoom 200 % : colonne minimale et libellés non tronqués. */
  .globe-view{grid-template-columns:minmax(0,1fr) minmax(280px,420px)}
  .globe-view .globe-country-name{
    white-space:normal;overflow:visible;text-overflow:clip;line-height:1.25;overflow-wrap:anywhere;
  }
  @media (max-width:1000px){
    .globe-view{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(200px,44%) minmax(0,1fr)}
  }

  /* M42-09 — redondance non colorée de l'état de bascule (label + aria-pressed + trait). */
  .globe-view .globe-controls button[aria-pressed="true"]{box-shadow:inset 0 -2px 0 var(--gold-bright)}

  /* M42-10 — mouvement réduit : aucune transition de plaque, même à chaud. */
  @media (prefers-reduced-motion:reduce){
    #globe-reveal .gr-caption,
    #globe-reveal .gr-page{transition:none;animation:none}
  }

  /* M42-11 — focus visible : anneau porté à 3 px, offset réduit à 2 px pour
     rester dans la zone de la cible (46 px) à 200 % ; variante Highlight en
     couleurs forcées, où --gold-bright est remplacé par le système. */
  .globe-view button:focus-visible,
  .globe-view [tabindex]:focus-visible,
  #globe-reveal [tabindex]:focus-visible{
    outline:3px solid var(--gold-bright);outline-offset:2px;
  }
  @media (forced-colors:active){
    .globe-view button:focus-visible,
    .globe-view [tabindex]:focus-visible,
    #globe-reveal [tabindex]:focus-visible{
      outline:3px solid Highlight;outline-offset:2px;
    }
  }

  /* M42-12 — état sélectionné sans couleur en couleurs forcées : le box-shadow
     M42-09 disparaît (propriété neutralisée), on le remplace par un liseré
     interne Highlight sur aria-current / aria-pressed. */
  @media (forced-colors:active){
    .globe-view .globe-country[aria-current="true"],
    .globe-view .globe-controls button[aria-pressed="true"]{
      outline:2px solid Highlight;outline-offset:-2px;
    }
  }
`;

/* M42-10 — marquage non destructif, sans écouteur ni région live : les tableaux
   de rappels du registre ne sont jamais purgés, aucun abonnement n'est ajouté.
   Le greffon est réappliqué à chaque rendu : setAttribute est idempotent. */
function mark() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay && overlay.dataset.m42 !== 'contrast') overlay.dataset.m42 = 'contrast';
}

register('M42', (ctx) => {
  if (!ctx) return;
  ctx.css(CSS_ID, CSS);
  mark();
});
