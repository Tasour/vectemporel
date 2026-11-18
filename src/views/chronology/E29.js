import { register } from './registry.js';

/* Lentille E29 — « Mobile et reflow » de la vue Chronologie
 * (domaine C : adaptation mobile / responsive).
 *
 * Fichier possédé : src/views/chronology/E29.js. Aucun sélecteur de test ni
 * aucune source existante n'est édité : `tests/e2e.mjs` compte les `.event-card`
 * et vérifie la vue `chronology`, `src/views/chronology.js` et `styles.css`
 * restent en lecture seule. Toute la lentille tient dans une seule feuille
 * injectée par ctx.css('chronology-e29', …) : cssOnce garantit l'idempotence
 * par l'ID, et l'enregistrement tardif place nos règles après celles des
 * lentilles voisines à spécificité égale.
 *
 * Le reflow est purement déclaratif : aucun écouteur, aucune boucle rAF,
 * aucun nœud créé, aucun appel à la console, aucun appel réseau, aucun aléa. Là où
 * `chronology.js` injecte son propre <style> dans le `stage` (donc plus tard
 * dans l'ordre du document que notre feuille de <head>), les sélecteurs sont
 * préfixés par `.chronology-main` / `.chronology-aside` / `.chronology-layout`
 * pour garder une spécificité supérieure sans toucher à la source.
 *
 * E29-01 zones sûres · E29-02 partage vertical · E29-03 cartes compactes
 * E29-04 cibles tactiles · E29-05 outils défilants · E29-06 orientation
 * E29-07 reflow sans débordement · E29-08 paysage court · E29-09 lisibilité
 * E29-10 focus / mouvement réduit / contraste forcé.
 */

const CSS_ID = 'chronology-e29';

const CSS = `
  /* E29-09 — neutralise l'agrandissement automatique d'iOS au changement
     d'orientation, source de reflow non déterministe. */
  html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }

  /* E29-07 — aucun bossage de grille (« grid blowout ») : chaque cellule
     peut rétrécir sous la largeur de son contenu. */
  #app, .shell-stage, .chronology-layout, .chronology-main,
  .chronology-aside, .event-list.atlas-chrono-events > li,
  .nav-c2-trail-item > *, .point-head > * { min-width: 0; }

  @media (max-width: 1000px) {
    /* E29-02 — la rupture existante donne 55 % au récit et 45 % à la fiche.
       On remonte à 58/42 : la liste des repères (titre, situation, ères,
       recherche, cartes) a besoin de la place, la fiche garde ses points. */
    .chronology-layout {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: minmax(0, 58%) minmax(0, 42%);
    }
    .chronology-main { padding: 18px 16px 24px; }
    .chronology-aside { padding: 16px 16px 24px; }
  }

  @media (max-width: 620px) {
    /* E29-01 — encoche et barre gestuelle intégrées au calcul de hauteur.
       box-sizing:border-box global (styles.css:25) fait réduire la zone de
       contenu au lieu d'agrandir la page ; env(...,0px) fournit le repli. */
    #app {
      min-height: 0;
      padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px)
               env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
    }

    /* E29-02 — partage resserré mais exploitable : 62/38 sur téléphone haut.
       Les deux panneaux gardent leur propre défilement vertical. */
    .chronology-layout { grid-template-rows: minmax(0, 62%) minmax(0, 38%); }
    .chronology-main { padding: 14px 12px 20px; }
    .chronology-aside { padding: 12px 12px 20px; }

    /* E29-06 — bloc de situation compact, sans rien retrancher au texte :
       fil, progression et retour restent dans l'arbre et dans le DOM. */
    .chronology-main .view-lede { margin: 4px 0 10px; }
    .chronology-main .atlas-chrono-hint { margin: -2px 0 10px; line-height: 1.4; }
    .chronology-main .atlas-chrono-status { margin-bottom: 8px; }
    .chronology-main .nav-c2-orientation { margin-bottom: 8px; padding: 6px 8px; }
    .chronology-main .nav-c2-trail-list { gap: 1px 6px; line-height: 1.4; }
    .chronology-main .nav-c2-progress { margin-top: 4px; line-height: 1.4; }
    .chronology-main .nav-c2-back { min-height: 36px; margin-top: 5px; }
    /* E29-06 — ancres : la barre coque fait 48 px en mobile, pas 60 px. */
    .chronology-layout .era-band, .chronology-layout .event-card,
    .chronology-layout .atlas-chrono-tag { scroll-margin-block: 48px; }

    /* E29-05 — recherche pleine largeur puis tags en bandeau défilant :
       les libellés et l'état aria-pressed restent intacts, le compteur est
       aussi porté par #atlas-chrono-status, donc rien n'est perdu. */
    .chronology-main .atlas-chrono-tools {
      flex-direction: row; flex-wrap: nowrap; align-items: center;
      gap: 6px; margin-bottom: 8px; padding-bottom: 4px;
      overflow-x: auto; scrollbar-width: none;
    }
    .chronology-main .atlas-chrono-tools::-webkit-scrollbar { display: none; }
    .chronology-main .atlas-chrono-search {
      flex: 0 0 min(78vw, 280px); width: auto; min-width: 0;
    }
    .chronology-main .atlas-chrono-tools > .atlas-chrono-tag,
    .chronology-main .atlas-chrono-count { flex: 0 0 auto; }

    /* E29-03 — cartes compactes : on réduit l'image et le plancher de
       hauteur, pas le nombre de boutons (E2E : .event-card > 0). */
    .chronology-main .event-list.atlas-chrono-events { gap: 6px; }
    .chronology-main .event-list.atlas-chrono-events > li { min-width: 0; }
    .chronology-main .event-card { min-height: 116px; }
    .chronology-main .event-card img { height: 56px; }
    .chronology-main .event-card strong { font-size: 15px; }
    .chronology-main .event-subtitle,
    .chronology-main .atlas-chrono-card-era { line-height: 1.25; }

    /* E29-02 — fiche : l'image cède de la place aux points vérifiés. */
    .chronology-aside .aside-image { height: 120px; }
    .chronology-aside .aside-title { font-size: 24px; }
    .chronology-aside .aside-summary { font-size: 13px; line-height: 1.45; }
    .chronology-aside .point { padding: 8px 0; }
    .chronology-aside .point-head { flex-wrap: wrap; gap: 4px 6px; }

    /* E29-09 — planchers de lisibilité en rem : suit la police du système
       sans laisser de texte illisible quand la préférence est petite. */
    .chronology-main .view-lede, .chronology-main .atlas-chrono-status,
    .chronology-main .nav-c2-trail-list, .chronology-main .nav-c2-progress,
    .chronology-main .atlas-chrono-count, .chronology-main .atlas-chrono-empty,
    .chronology-aside .point p, .chronology-aside .aside-summary {
      font-size: max(11px, 0.78rem);
    }
    .chronology-main .atlas-chrono-hint,
    .chronology-main .atlas-chrono-era-range,
    .chronology-main .atlas-chrono-card-era,
    .chronology-aside .aside-credit, .chronology-aside .point-sources,
    .chronology-aside .atlas-chrono-tags { font-size: max(10px, 0.7rem); }

    /* E29-07 — la barre d'outils de la coque défile latéralement au lieu
       de pousser la page ; les onglets restent focusables dans l'ordre DOM. */
    .shell-bar { grid-template-columns: auto minmax(0, 1fr) auto; gap: 4px; padding: 0 6px; }
    .shell-tabs { overflow-x: auto; justify-content: flex-start; scrollbar-width: none; }
    .shell-tabs::-webkit-scrollbar { display: none; }
    .shell-tab { flex: 0 0 auto; }
  }

  @media (max-width: 620px) and (min-height: 700px) {
    /* E29-03 (complément) — deux colonnes seulement quand la hauteur le
       permet : cinq rangées de cartes au lieu de dix à 390×844. */
    .chronology-main .event-list.atlas-chrono-events {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (pointer: coarse) {
    /* E29-04 — cibles tactiles ≥ 44 px. Le media pointer ne s'active pas
       sous le navigateur headless de l'E2E (souris) : aucun test perturbé.
       Préfixage nécessaire pour battre le <style> de chronology.js. */
    .shell-tab { min-height: 44px; }
    .shell-icon { width: 44px; height: 44px; }
    .crumb { min-height: 36px; padding: 6px 8px; }
    .chronology-main .atlas-chrono-search { min-height: 44px; }
    .chronology-main .atlas-chrono-tag,
    .chronology-aside .atlas-chrono-tags .atlas-chrono-tag { min-height: 44px; }
    .chronology-main .nav-c2-back,
    .chronology-main .atlas-chrono-empty button,
    .chronology-aside .aside-actions button { min-height: 44px; }
  }

  @media (max-height: 520px) and (orientation: landscape) {
    /* E29-08 — paysage court (rotation, clavier virtuel) : retour à deux
       colonnes « liste | fiche » pour que les points restent visibles. */
    #app { min-height: 0; }
    .shell-bar { height: 42px; }
    .shell-footer { display: none; }
    .shell-trail { min-height: 22px; padding: 2px 8px; }
    .chronology-layout {
      grid-template-columns: minmax(0, 1fr) minmax(0, 42%);
      grid-template-rows: minmax(0, 1fr);
      grid-template-areas: "liste fiche";
    }
    .chronology-main { grid-area: liste; }
    .chronology-aside { grid-area: fiche; }
    .chronology-main .atlas-chrono-tools { flex-wrap: wrap; }
    .chronology-main .atlas-chrono-search { min-width: 140px; }
    .chronology-aside .aside-image { height: 90px; }
    .chronology-main .atlas-chrono-hint { display: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    /* E29-10 — défense en profondeur avec styles.css:342. */
    .chronology-main, .chronology-aside { scroll-behavior: auto; transition: none; }
  }

  @media (forced-colors: active) {
    /* E29-10 — les fonds rgba disparaissent en contraste forcé : on garde
       des délimitations et des couleurs système, sans doubler de couche. */
    .chronology-main .nav-c2-orientation, .chronology-main .atlas-chrono-empty,
    .chronology-main .event-card, .chronology-aside .point,
    .chronology-main .atlas-chrono-search {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
  }
`;

register('E29', (ctx) => {
  /* Une seule feuille, un seul enregistrement, zéro effet de bord. */
  if (!ctx || typeof ctx.css !== 'function') return;
  ctx.css(CSS_ID, CSS);
});
