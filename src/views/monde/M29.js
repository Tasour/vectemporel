import { register } from './registry.js';

/* Lentille M29 — Mobile et reflow (domaine C : adaptation mobile/responsive).
 *
 * Fichier possédé : src/views/monde/M29.js. Aucun autre fichier modifié.
 * Toute la lentille tient dans une seule feuille de style injectée par
 * ctx.css('monde-m29', ...) : cssOnce garantit l'idempotence par l'ID, et
 * l'ordre d'enregistrement (index.js : M06…M17 avant M29) place nos règles
 * après celles des lentilles déjà greffées, à spécificité égale.
 *
 * Le reflow est purement déclaratif : aucun écouteur, aucune boucle rAF,
 * aucun nœud ajouté, aucun sélecteur de test renommé. Les sélecteurs utilisés
 * par tests/e2e.mjs (.globe-list button, .event-card, .detail-sheet,
 * .recit-title, .geo-marker, .constellation-field) restent intacts : seules
 * des propriétés de mise en page sont ajustées sous media query.
 *
 * M29-11 à M29-14 (audit 390×844) : désempilement complet du bas de scène,
 * chargement de la colonne de décision (M48 ne crée plus de 3e ligne),
 * barre de recherche sur deux colonnes et cibles 48 px réaffirmées contre
 * l'attribut d'audit M23. Zéro réseau, zéro aléa, aucune sortie console.
 */

const CSS_ID = 'monde-m29';

const CSS = `
  /* M29-09 — plancher de taille de texte : neutralise l'agrandissement
     automatique d'iOS au changement d'orientation (reflow imprévisible). */
  html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }

  /* M29-07 — aucune grille ne doit imposer un débordement horizontal. */
  #app, .shell-stage, .globe-view, .globe-scene, .globe-list { min-width: 0; }

  @media (max-width: 1000px) {
    /* M29-02 — la scène garde un plancher au-dessus du clavier virtuel. */
    .globe-view { grid-template-rows: minmax(240px, 42dvh) minmax(0, 1fr); }
  }

  @media (max-width: 620px) {
    /* M29-01 — zones sûres (encoche, barre système) et hauteur réelle. */
    #app {
      min-height: 0;
      padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px)
               env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
    }

    /* M29-02 — partage vertical resserré mais exploitable. */
    .globe-view { grid-template-rows: minmax(220px, 38dvh) minmax(0, 1fr); }
    .globe-list { padding: 12px 12px 18px; }

    /* M29-03 — cartes compactes ; la seconde colonne n'arrive qu'en M29-03b. */
    .globe-choices { gap: 6px; }
    .globe-country { min-height: 54px; padding: 8px 10px; }
    .globe-country-meta { line-height: 1.35; }

    /* M29-05 — HUD compact : on réduit les paddings, pas l'information. */
    .globe-hud { gap: 6px; }
    .globe-status { padding: 6px 8px; line-height: 1.35; }
    .globe-hover-readout { min-height: 28px; padding: 6px 8px; }

    /* M29-06 / M29-11 — bas de scène : commandes en bas (8 px), badge de zoom
       au-dessus (≈71 px), légende en haut à gauche (116 px). Les panneaux
       purement diagnostiques et l'aide clavier
       physique sont retirés du globe étroit : le tiroir « Diagnostics » et
       l'aide « ? » les conservent. Cela supprime les chevauchements relevés
       à 390×844 entre #globe-m05-zoom, #monde-m24-legend, .globe-controls,
       #m17-legend et .globe-m05-hint. */
    #monde-m14-rail,
    #monde-m06-budget, #monde-m07-raf, #monde-m24-legend,
    .globe-m05-hint { display: none; }
    /* M05 place son badge en inline juste AU-DESSUS de la légende : en
       remontant la légende à 116 px, le calcul de M05 donne bottom≈71 px,
       donc le badge reste au-dessus des commandes (finies à 56 px). */
    #m17-legend.m17-legend { left: 8px; right: auto; bottom: 116px; max-width: min(200px, 52vw); padding: 6px 8px; }
    #globe-m05-zoom { right: 8px; bottom: 71px; min-width: 132px; }
    .globe-controls {
      left: 8px; right: auto; bottom: 8px;
      flex-direction: row; flex-wrap: nowrap; gap: 4px;
      max-width: calc(100% - 16px); overflow-x: auto;
    }

    /* M29-07 — la barre d'outils défile au lieu de déborder de la page. */
    .shell-bar { grid-template-columns: auto minmax(0, 1fr) auto; gap: 4px; padding: 0 6px; }
    .shell-tabs { overflow-x: auto; justify-content: flex-start; scrollbar-width: none; }
    .shell-tabs::-webkit-scrollbar { display: none; }
    .shell-tab { flex: 0 0 auto; }

    /* M29-12 — recherche et filtre sur deux colonnes même à 390 px : la barre
       M27 passe d'une colonne (≈190 px de haut) à deux (≈120 px), ce qui
       libère la liste des pays sans toucher à #m27-search ni à ses attributs. */
    #m27-toolbar { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 8px; margin-bottom: 8px; padding: 8px; }
    /* Le texte d'aide reste dans l'arbre d'accessibilité (aria-describedby)
       mais ne consomme plus 38 px de hauteur ; statut et réinitialisation
       partagent la seconde ligne. Barre : 189 px → ~112 px. */
    #m27-toolbar .m27-help {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
    }
    #m27-toolbar .m27-status {
      grid-column: 1; grid-row: 2; align-self: center;
      margin: 0; font-size: 11px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #m27-toolbar .m27-reset { grid-column: 2; grid-row: 2; justify-self: end; }

    /* M29-09 — plancher de lisibilité en rem : suit la taille de police OS. */
    .shell-tab, .globe-here, .globe-progress, .globe-country-meta,
    .globe-help, .globe-status, .globe-hover-readout { font-size: max(11px, 0.78rem); }

    /* M29-10 — le focus reste visible au bord de l'écran. */
    button:focus-visible, [tabindex]:focus-visible { outline-offset: 1px; outline-width: 3px; }
  }

  @media (max-width: 620px) and (min-height: 521px) {
    /* M29-13 — M48 greffe sa bascule d'aide comme 4e enfant de .globe-view :
       sans garde-fou elle crée une 3e ligne de grille (≈91 px) qui écrase la
       liste des pays. On l'ancre en bas de la cellule « decision », partagée
       avec .globe-list, avec un rembourrage réservé. Spécificité (0,2,0) pour
       prévaloir sur la règle M42 chargée après M29. */
    .shell-stage .globe-view {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: minmax(220px, 38dvh) minmax(0, 1fr);
      grid-template-areas: "scene" "decision";
    }
    .globe-list { grid-area: decision; z-index: 1; padding: 12px 12px 76px; }
    #m48-doc {
      grid-area: decision; align-self: end; z-index: 2;
      max-height: 55%; overflow-y: auto;
      margin: 0; padding: 8px 12px 10px;
      border-top: 1px solid var(--line-strong); background: var(--surface);
    }
    .monde-m38-panel { display: none; }
    /* L'indice de la bascule d'aide est conservé pour aria-describedby mais
       retiré visuellement : ~30 px rendus à la liste des pays. */
    #m48-doc .m48-hint {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
    }
  }

  @media (max-width: 620px) and (min-height: 700px) {
    /* M29-03b — deux colonnes seulement quand la hauteur le permet :
       dix cartes tiennent en cinq rangées au lieu de dix. */
    .globe-choices { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (pointer: coarse) {
    /* M29-04 — cibles tactiles ≥ 44 px, sans renommer de sélecteur. */
    .shell-tab { min-height: 44px; }
    .shell-icon { width: 44px; height: 44px; }
    .crumb { min-height: 36px; padding: 6px 8px; }
    /* M29-14 — M23 pose data-monde-m23="1" et reprend height:46px avec une
       spécificité (0,3,1) : on réaffirme 48 px à spécificité égale, chargé
       après lui, sans changer les libellés (aria-label porte le nom). */
    .globe-view .globe-controls button,
    .globe-view[data-monde-m23="1"] .globe-controls button {
      min-width: 48px; min-height: 48px; height: 48px; padding-inline: 8px;
    }
    .globe-view[data-monde-m23="1"] .globe-controls { align-items: center; }
  }

  @media (max-height: 520px) and (orientation: landscape) {
    /* M29-08 — paysage court (clavier virtuel, rotation) : retour à deux
       colonnes et barres réduites pour préserver la scène 3D. */
    #app { min-height: 0; }
    .shell-bar { height: 42px; }
    .shell-footer { display: none; }
    .shell-trail { min-height: 22px; padding: 2px 8px; }
    .globe-view {
      grid-template-columns: minmax(0, 1fr) minmax(0, 46%);
      grid-template-rows: minmax(0, 1fr);
      grid-template-areas: "scene decision";
    }
    .globe-list { padding: 10px 12px; }
    .globe-hud { flex-direction: row; }
    .globe-controls { flex-direction: column; }
    .globe-subtitle { display: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    /* M29-10 — cohérence avec la règle globale styles.css:342. */
    .globe-hud, .globe-list, .globe-view { scroll-behavior: auto; transition: none; }
  }

  @media (forced-colors: active) {
    /* M29-10 — panneaux délimités même quand les fonds rgba sont supprimés. */
    .globe-status, .globe-hover-readout, #m17-legend,
    #monde-m06-budget, #monde-m07-raf {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
  }
`;

register('M29', (ctx) => {
  if (!ctx || typeof ctx.css !== 'function') return;
  ctx.css(CSS_ID, CSS);
});
