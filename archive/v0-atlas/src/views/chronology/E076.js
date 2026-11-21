import { register } from './registry.js';

/* Lentille E076 — Accessibilité des boutons, cibles tactiles et focus visible.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/views/E076.md (chantiers E076-01 à E076-10).
 * Lectures seules : src/views/chronology.js, src/views/chronology/registry.js,
 * src/views/chronology/index.js, styles.css.
 * Aucun fichier partagé modifié, aucun appel réseau, aucune source aléatoire,
 * aucune sortie de débogage, aucun timer ni boucle d'animation, aucun écouteur
 * durable : la lentille est réappliquée à chaque rendu et se contente de mesurer.
 *
 * La coque reconstruisant tout le DOM à chaque `set()` (chronology.js:539),
 * le readout est retrouvé par ID à chaque passage tandis que le compteur de
 * rendus vit au niveau module. Une seule feuille de style est injectée via
 * ctx.css('chronology-e076', …) (registry.js:13-19).
 * Toutes les chaînes visibles sont en français.
 */

const CSS_ID = 'chronology-e076';
const READOUT_ID = 'e076-a11y-readout';

/* Feuille unique. Le seuil de 44 px vise la recommandation WCAG 2.5.5 ; le
   plancher de 24 px de WCAG 2.5.8 est couvert avec marge. Aucune information
   n'est portée par la seule couleur : l'état désactivé est aussi hachuré et le
   focus est un anneau (forme), pas un simple changement de teinte. */
const CSS = `
  #${READOUT_ID} {
    position: absolute; left: 12px; bottom: 10px; z-index: 6;
    max-width: min(340px, 46vw); margin: 0; padding: 6px 9px;
    border: 1px solid var(--line); border-radius: 8px;
    background: rgba(8, 11, 16, .9); color: var(--muted);
    font-size: 10px; line-height: 1.45; font-variant-numeric: tabular-nums;
    pointer-events: none;
  }
  /* E076-01 — pastilles de thème : 24/30 px portées à 44 px. */
  .chronology-layout .atlas-chrono-tag,
  .chronology-layout .atlas-chrono-tags .atlas-chrono-tag {
    min-height: 44px; min-width: 44px;
    padding: 8px 12px; font-size: 10px; line-height: 1.3;
  }
  /* E076-02 — bouton « Retour au monde » : 30 px porté à 44 px. */
  .chronology-layout #nav-c2a-back {
    min-height: 44px; padding: 8px 14px; font-size: 10px;
  }
  /* E076-03 — bouton « Réinitialiser le filtre » : 32 px porté à 44 px. */
  .chronology-layout .atlas-chrono-empty button {
    min-height: 44px; padding: 0 14px; font-size: 10px;
  }
  /* E076-04 — boutons « Repère précédent / suivant » : 38 px portés à 44 px,
     avec un écart pour éviter les tapes erronées sur des commandes voisines. */
  .chronology-layout .aside-actions { gap: 8px; }
  .chronology-layout .aside-actions button {
    min-height: 44px; min-width: 96px; padding: 8px 10px; font-size: 10px;
  }
  /* E076-05 — espacement entre cibles adjacentes (ères, outils, thèmes). */
  .chronology-layout .atlas-chrono-era-list { gap: 8px; }
  .chronology-layout .atlas-chrono-tools { gap: 10px; }
  .chronology-layout .atlas-chrono-tags .atlas-chrono-tag { margin: 6px 6px 0 0; }
  /* E076-06 — recherche : cible 36 px portée à 44 px, taille de police 16 px
     (évite le zoom automatique mobile) et anneau dédié, l'input étant absent
     de la règle de base styles.css:33. */
  .chronology-layout .atlas-chrono-search { min-height: 44px; font-size: 16px; }
  .chronology-layout #atlas-chrono-search:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(230, 185, 111, .18);
  }
  /* E076-07 — focus renforcé : contour de 3 px + halo sombre, donc visible
     même sur fond clair ou sur une carte déjà bordée dorée. */
  .chronology-layout .era-band:focus-visible,
  .chronology-layout .event-card:focus-visible,
  .chronology-layout .atlas-chrono-tag:focus-visible,
  .chronology-layout #nav-c2a-back:focus-visible,
  .chronology-layout .atlas-chrono-empty button:focus-visible,
  .chronology-layout .aside-actions button:focus-visible {
    position: relative; z-index: 2;
    outline: 3px solid var(--gold-bright); outline-offset: 3px;
    box-shadow: 0 0 0 2px #05070b, 0 0 0 6px rgba(230, 185, 111, .35);
  }
  /* Garde : aucun contour supprimé au clavier, quel que soit l'ordre des
     feuilles injectées par les autres lentilles. */
  .chronology-layout button:focus-visible,
  .chronology-layout input:focus-visible { outline-style: solid !important; }
  /* E076-08 — état désactivé hachuré (jamais la couleur seule). */
  .chronology-layout .aside-actions button:disabled {
    background-image: repeating-linear-gradient(135deg,
      rgba(255,255,255,.05) 0 4px, transparent 4px 8px);
    opacity: .7; cursor: default;
  }
  @media (max-width: 620px) {
    .chronology-layout .atlas-chrono-tag,
    .chronology-layout .atlas-chrono-tags .atlas-chrono-tag {
      min-height: 44px; min-width: 44px;
    }
    .chronology-layout .aside-actions button { min-width: 0; }
    #${READOUT_ID} { max-width: 92vw; font-size: 9px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .chronology-layout .era-band,
    .chronology-layout .event-card,
    .chronology-layout .atlas-chrono-tag,
    .chronology-layout #nav-c2a-back,
    .chronology-layout .aside-actions button { transition: none !important; }
  }
`;

/* Compteur module : survit aux reconstructions du DOM sans mémoriser de nœud. */
let renders = 0;

/* E076-09 et E076-10 : mesure réelle des cibles et de l'ordre de tabulation.
   Le nœud est détruit/recréé à chaque rendu : toutes les fonctions réinterrogent
   le DOM courant, aucun cache de nœud, aucun écouteur, aucune boucle. */
function audit(ctx) {
  const root = ctx.layout;
  const controls = root.querySelectorAll('button, input, [tabindex="0"]');
  let measured = 0;
  let minHeight = 0;
  let below = 0;
  controls.forEach((node) => {
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    measured += 1;
    const height = Math.round(rect.height);
    if (minHeight === 0 || height < minHeight) minHeight = height;
    if (height < 44 || rect.width < 24) below += 1;
  });

  const disabled = root.querySelectorAll('button:disabled');
  disabled.forEach((node) => node.setAttribute('data-e076-disabled', 'true'));

  let positiveTab = 0;
  root.querySelectorAll('[tabindex]').forEach((node) => {
    const value = Number(node.getAttribute('tabindex'));
    if (Number.isInteger(value) && value > 0) positiveTab += 1;
  });

  const reduced = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
  return {
    measured, minHeight, below,
    disabled: disabled.length, positiveTab, reduced,
  };
}

/* Garde d'existence sur un ID unique préfixé e076 : au plus un readout dans le
   document, même si install() est rejoué sur le même stage. */
function ensureReadout(ctx) {
  const existing = document.getElementById(READOUT_ID);
  if (existing && existing.isConnected) return existing;
  const node = ctx.el('p', 'e076-readout');
  node.id = READOUT_ID;
  node.setAttribute('role', 'status');
  node.setAttribute('aria-live', 'polite');
  node.setAttribute('aria-atomic', 'true');
  if (ctx.stage && ctx.stage.isConnected) ctx.stage.appendChild(node);
  return node;
}

function install(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (!ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;
  if (!ctx.viewId || ctx.viewId !== 'chronology') return;

  ctx.css(CSS_ID, CSS);
  renders += 1;
  const result = audit(ctx);
  const layout = ctx.layout;

  layout.setAttribute('data-e076-renders', String(renders));
  layout.setAttribute('data-e076-targets', String(result.measured));
  layout.setAttribute('data-e076-min-height', String(result.minHeight));
  layout.setAttribute('data-e076-below', String(result.below));
  layout.setAttribute('data-e076-disabled', String(result.disabled));
  layout.setAttribute('data-e076-taborder', result.positiveTab ? 'anomalie' : 'ok');
  layout.setAttribute('data-e076-focus', 'anneau-3px-double');
  layout.setAttribute('data-e076-motion', result.reduced ? 'reduced' : 'full');

  const readout = ensureReadout(ctx);
  if (!readout || !readout.isConnected) return;
  readout.textContent = `Cibles tactiles : ${result.measured} contrôles mesurés`
    + ` · hauteur minimale ${result.minHeight} px pour un seuil de 44 px`
    + ` · ${result.below} sous le seuil.`
    + ` Focus clavier : anneau de 3 px et halo, jamais supprimé.`
    + ` Boutons désactivés : ${result.disabled} · ordre de tabulation :`
    + ` ${result.positiveTab ? 'anomalie' : 'ok'}.`;
}

/* E076-10 : un seul register, une seule clé, aucun effet en dehors de ctx. */
register('E076', install);
