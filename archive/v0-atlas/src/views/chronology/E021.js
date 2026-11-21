import { register } from './registry.js';

/* Lentille E021 — Lisibilité de la chronologie (chantiers E21-01 … E21-10).
 *
 * Fichier possédé : ce module uniquement. Lectures seules :
 *   - src/views/chronology.js       (feuille de la vue injectée dans #atlas-stage,
 *     chaque rendu reconstruit le stage : ses règles sont donc postérieures aux
 *     nôtres dans le DOM ; on élève la spécificité avec .chronology-layout /
 *     .chronology-main / .chronology-aside plutôt que d'user de !important) ;
 *   - styles.css                    (colonnes 380 px, corps 7–11 px, --line 10 %) ;
 *   - src/views/chronology/registry.js (cssOnce protège l'injection par ID) ;
 *   - src/views/_diagnostics.js     (aucun ID de nœud créé : le motif e\d\d
 *     transformerait un panneau en panneau de diagnostic masqué).
 *
 * Aucune donnée inventée, aucun appel réseau, aucun Math.random, aucun
 * console.*, aucun écouteur, aucune région live, aucune boucle rAF, aucun timer.
 *
 * Faits vérifiés et chiffres recalculés (WCAG 2.x, sRGB) :
 *   styles.css:6      --line = rgba(255,255,255,.1) → 1,31:1 sur --surface-2
 *   porté à .42                                    → 4,07:1 (seuil UI 3:1)
 *   styles.css:11     --muted-2 = #8c8d91 → 5,52:1 sur #10151d, 5,79:1 sur #0b0f15
 *   styles.css:10     --muted   = #a8a198 → 7,16:1 sur #10151d
 *   styles.css:9      --ink-soft= #d7d1c6 → 12,05:1 sur #10151d
 *   chronology.js:108 .nav-c2-sep = rgba(255,255,255,.28) → 2,45:1 sur --surface
 *   porté à .50                                         → 5,33:1
 *   chronology.js:54  .atlas-chrono-tag min-height:30px, :65 min-height:24px
 *   styles.css:230    .point-kind/.confidence font-size:7px
 *   styles.css:194    .chronology-layout colonne figée à 380 px
 */
const CSS_ID = 'chronology-e21';

const CSS = `
  /* E21-01 — Plancher typographique. Les 7–9 px de la vue (chronology.js:38-65,
     styles.css:215-230) deviennent 9–12 px ; l'ancêtre porte la spécificité. */
  .chronology-layout .atlas-chrono-hint,
  .chronology-layout .atlas-chrono-status,
  .chronology-layout .atlas-chrono-era-range,
  .chronology-layout .atlas-chrono-card-era,
  .chronology-layout .atlas-chrono-tags,
  .chronology-layout .atlas-chrono-count,
  .chronology-layout .nav-c2-progress,
  .chronology-layout .nav-c2-crumb,
  .chronology-layout .nav-c2-back{font-size:11px;line-height:1.5}
  .chronology-aside .aside-kicker,
  .chronology-aside .aside-credit,
  .chronology-aside .point small,
  .chronology-aside .point-sources{font-size:10px;line-height:1.55}
  .chronology-layout .point-kind,
  .chronology-layout .confidence{font-size:9px;line-height:1.35;letter-spacing:.04em}
  .chronology-aside .atlas-chrono-tags .atlas-chrono-tag{font-size:10px;line-height:1.3}

  /* E21-02 — Contraste des métadonnées : 5,52:1 → 7,16:1 (muted), statut à
     12,05:1 (ink-soft), séparateur du fil 2,45:1 → 5,33:1. Les préférences du
     système sont honorées sans changer le thème ordinaire. */
  .chronology-layout .atlas-chrono-hint,
  .chronology-layout .atlas-chrono-card-era,
  .chronology-layout .atlas-chrono-count,
  .chronology-layout .atlas-chrono-tags,
  .chronology-aside .aside-credit,
  .chronology-aside .point small,
  .chronology-aside .point-sources,
  .chronology-aside .confidence{color:var(--muted)}
  .chronology-layout .atlas-chrono-status{color:var(--ink-soft)}
  .chronology-layout .nav-c2-sep{color:rgba(255,255,255,.5)}
  @media (prefers-contrast:more){
    .chronology-main .atlas-chrono-search,
    .chronology-main .event-card,
    .chronology-main .era-band,
    .chronology-main .nav-c2-orientation,
    .chronology-aside .point{background:#05070a;border-color:var(--gold-bright)}
    .chronology-layout .atlas-chrono-status,
    .chronology-layout .atlas-chrono-hint,
    .chronology-layout .nav-c2-progress,
    .chronology-aside .aside-credit,
    .chronology-aside .point-sources{color:var(--ink)}
  }
  @media (forced-colors:active){
    .chronology-main .atlas-chrono-search,
    .chronology-main .event-card,
    .chronology-main .era-band,
    .chronology-main .nav-c2-orientation,
    .chronology-aside .point{
      border:1px solid CanvasText;background:Canvas;color:CanvasText;
    }
  }

  /* E21-03 — Respiration des listes : 1,45 → 1,6 pour les points, 1,4 → 1,6
     pour les sources, espacement des puces du fil et du texte de statut. */
  .chronology-aside .point{padding:12px 0}
  .chronology-aside .point p{font-size:12px;line-height:1.6;margin:0 0 8px}
  .chronology-aside .point-sources{line-height:1.6;gap:6px 12px}
  .chronology-layout .atlas-chrono-status{line-height:1.55}
  .chronology-layout .nav-c2-trail-list{line-height:1.7;gap:4px}

  /* E21-04 — Measure bornée : la colonne principale peut dépasser 1 600 px sur
     un grand écran ; lede, statut et progression sont plafonnés à 72 caractères. */
  .chronology-main .view-lede,
  .chronology-main .atlas-chrono-status,
  .chronology-main .nav-c2-progress{max-width:72ch;text-wrap:pretty;text-align:left}
  .chronology-aside .aside-summary{max-width:68ch;text-wrap:pretty}

  /* E21-05 — Chiffres alignés et années non coupées : tabular-nums sur les
     compteurs et les libellés de position ; nowrap sur les millésimes. */
  .chronology-layout .aside-kicker,
  .chronology-aside .aside-year,
  .chronology-layout .atlas-chrono-status,
  .chronology-layout .nav-c2-progress{font-variant-numeric:tabular-nums}
  .chronology-layout .aside-kicker,
  .chronology-aside .aside-year,
  .chronology-main .event-year,
  .chronology-layout .atlas-chrono-era-range{white-space:nowrap}

  /* E21-06 — Cibles tactiles : 24/30 px → 36 px, anneau de focus porté à 3 px. */
  .chronology-main .atlas-chrono-tag{min-height:36px;padding:6px 12px}
  .chronology-aside .atlas-chrono-tags .atlas-chrono-tag{
    min-height:36px;padding:5px 10px;margin:4px 4px 0 0;
  }
  .chronology-layout .nav-c2-back{min-height:36px}
  .chronology-layout button:focus-visible,
  .chronology-layout [tabindex]:focus-visible{
    outline:3px solid var(--gold-bright);outline-offset:2px;
  }
  @media (forced-colors:active){
    .chronology-layout button:focus-visible,
    .chronology-layout [tabindex]:focus-visible{outline:3px solid Highlight}
  }

  /* E21-07 — Délimitation des composants : 1,31:1 → 4,07:1, sans écraser les
     états sélectionné / survolé / appuyé pilotés par chronology.js. */
  .chronology-main .event-card:not(.is-active):not([aria-current="true"]):not(:hover),
  .chronology-main .era-band:not(.is-active):not([aria-current="true"]):not(:hover),
  .chronology-main .atlas-chrono-tag:not([aria-pressed="true"]):not(:hover),
  .chronology-main .atlas-chrono-search,
  .chronology-main .nav-c2-orientation,
  .chronology-layout .atlas-chrono-empty{border-color:rgba(255,255,255,.42)}

  /* E21-08 — État de filtre redondé : aria-pressed + libellé inchangé + trait
     géométrique interne ; en couleurs forcées, liseré Highlight (box-shadow
     neutralisé par le système). */
  .chronology-layout .atlas-chrono-tag[aria-pressed="true"],
  .chronology-aside .atlas-chrono-tags .atlas-chrono-tag[aria-pressed="true"]{
    box-shadow:inset 0 -2px 0 var(--gold-bright);
  }
  @media (forced-colors:active){
    .chronology-layout .atlas-chrono-tag[aria-pressed="true"],
    .chronology-layout .era-band[aria-current="true"]{
      outline:2px solid Highlight;outline-offset:-2px;
    }
  }

  /* E21-09 — Reflow / zoom 200 % : la colonne de 380 px devient souple, le
     bascule a lieu à 900 px et les titres longs ne sont plus ellipsés. */
  .chronology-layout{grid-template-columns:minmax(0,1fr) minmax(280px,380px)}
  .chronology-main .event-card strong,
  .chronology-aside .aside-title{overflow-wrap:anywhere;hyphens:auto;line-height:1.2}
  @media (max-width:900px){
    .chronology-layout{
      grid-template-columns:minmax(0,1fr);
      grid-template-rows:minmax(0,1fr) minmax(220px,45%);
    }
    .chronology-aside{border-left:0;border-top:1px solid var(--line)}
  }

  /* E21-10 — Mouvement réduit : aucune transition résiduelle sur les bandes,
     cartes et puces, y compris quand le stage est reconstruit à chaud. */
  @media (prefers-reduced-motion:reduce){
    .chronology-layout .era-band,
    .chronology-layout .event-card,
    .chronology-layout .atlas-chrono-tag{transition:none !important;animation:none !important}
  }
`;

/* E21-10 — marquage non destructif et idempotent. Aucun ID de nœud n'est créé
   (le motif du diagnostics masquerait tout identifiant e\d\d), aucun écouteur
   n'est ajouté : le registre réapplique la lentille à chaque rendu. */
function mark(ctx) {
  const layout = ctx && ctx.layout;
  if (layout && layout.dataset.e21 !== 'legibility') layout.dataset.e21 = 'legibility';
}

register('E21', (ctx) => {
  if (!ctx) return;
  ctx.css(CSS_ID, CSS);
  mark(ctx);
});
