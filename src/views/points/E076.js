import { register } from './registry.js';

/* Lentille E076 — Responsive & mobile : safe-area insets / iPhone (domaine H).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E076.md — chantiers E076-01 à E076-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), la coque,
 * styles.css et index.html ne sont ni édités ni doublés : index.html porte déjà
 * `viewport-fit=cover`, la lentille s'y appuie sans le modifier.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Aucune
 * dépendance vers le store, les filtres ou le détail : les insets restent
 * appliqués même avec un ctx minimal.
 *
 * Invariants : un seul CSS, une seule portée, une seule note, zéro écouteur
 * global, zéro timer, zéro rAF, zéro réseau, zéro aléa, zéro console.*.
 */

const CSS_ID = 'points-e076';
const SCOPE = 'points-e076';
const NOTE_ID = 'points-e076-note';
const REDUCED_ATTR = 'data-e076-reduced';

/* Toutes les règles sont préfixées par `.points-e076`, classe posée sur
 * `.points-layout`. Celui-ci n'a aucun padding dans styles.css : ajouter les
 * insets dessus est purement additif et n'écrase aucune autre règle. */
const CSS = `
/* E076-02 : chaîne de repli progressive des quatre insets.
 * constant() = iOS 11.0/11.1, env() = iOS 11.2+, 0px = navigateur sans inset.
 * La dernière déclaration prise en charge gagne. */
.points-e076 {
  --points-e076-top: 0px;
  --points-e076-right: 0px;
  --points-e076-bottom: 0px;
  --points-e076-left: 0px;
  --points-e076-top: constant(safe-area-inset-top);
  --points-e076-right: constant(safe-area-inset-right);
  --points-e076-bottom: constant(safe-area-inset-bottom);
  --points-e076-left: constant(safe-area-inset-left);
  --points-e076-top: env(safe-area-inset-top, 0px);
  --points-e076-right: env(safe-area-inset-right, 0px);
  --points-e076-bottom: env(safe-area-inset-bottom, 0px);
  --points-e076-left: env(safe-area-inset-left, 0px);
}

/* E076-03 (haut), E076-04 (gauche/droite), E076-05 (bas). */
.points-e076 {
  padding-top: var(--points-e076-top);
  padding-right: var(--points-e076-right);
  padding-bottom: var(--points-e076-bottom);
  padding-left: var(--points-e076-left);
}

@media (max-width: 620px) {
  /* E076-06 : plancher de 12px sur mobile ; repli calc() si max() est absent. */
  .points-e076 {
    padding-top: calc(var(--points-e076-top) + 12px);
    padding-top: max(12px, var(--points-e076-top));
    padding-right: calc(var(--points-e076-right) + 12px);
    padding-right: max(12px, var(--points-e076-right));
    padding-bottom: calc(var(--points-e076-bottom) + 12px);
    padding-bottom: max(12px, var(--points-e076-bottom));
    padding-left: calc(var(--points-e076-left) + 12px);
    padding-left: max(12px, var(--points-e076-left));
  }
  /* E076-08 : cibles tactiles ≥ 44px dans la bande d'inset. */
  .points-e076 .points-filters select,
  .points-e076 .points-filters button,
  .points-e076 .points-nav button,
  .points-e076 .points-era,
  .points-e076 .points-cell {
    min-height: 44px;
  }
}

/* E076-09 : mouvement réduit, couplage JS (attribut) ET media query. */
.points-e076[` + REDUCED_ATTR + `="1"] .points-filters button,
.points-e076[` + REDUCED_ATTR + `="1"] .points-nav button {
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  .points-e076 .points-filters button,
  .points-e076 .points-nav button {
    transition: none;
  }
}

/* E076-09 : couleurs forcées — bordures explicites, rien que par la couleur. */
@media (forced-colors: active) {
  .points-e076 .points-filters select,
  .points-e076 .points-filters button,
  .points-e076 .points-nav button {
    border: 1px solid CanvasText;
    color: CanvasText;
  }
}

/* E076-07 : note de lecture, statique, hors région live. */
.points-e076-note {
  margin: 0 0 10px;
  color: var(--muted-2);
  font-size: 10px;
  line-height: 1.4;
}
`;

/* E076-07 : le meta viewport (déjà `viewport-fit=cover` dans index.html) est
 * lu, jamais écrit : sans couverture, env() vaut 0 et aucun décalage n'a lieu. */
function viewportCover() {
  const meta = document.querySelector('meta[name="viewport"]');
  const content = meta ? String(meta.getAttribute('content') || '') : '';
  return /(?:^|[,\s])viewport-fit\s*=\s*cover/i.test(content);
}

/* E076-07 : mesure ponctuelle des insets réels via une sonde 0×0 retirée
 * immédiatement. Aucun écouteur, aucun timer, aucune trace dans le document. */
function measureInsets() {
  const empty = { top: 0, right: 0, bottom: 0, left: 0 };
  try {
    if (!document.body || typeof window.getComputedStyle !== 'function') return empty;
    const probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.position = 'fixed';
    probe.style.top = '0';
    probe.style.left = '0';
    probe.style.width = '0';
    probe.style.height = '0';
    probe.style.pointerEvents = 'none';
    probe.style.visibility = 'hidden';
    probe.style.paddingTop = 'env(safe-area-inset-top, 0px)';
    probe.style.paddingRight = 'env(safe-area-inset-right, 0px)';
    probe.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
    probe.style.paddingLeft = 'env(safe-area-inset-left, 0px)';
    document.body.appendChild(probe);
    let computed;
    try { computed = window.getComputedStyle(probe); }
    finally { probe.remove(); }
    const px = (value) => {
      const number = parseFloat(value);
      return Number.isFinite(number) ? number : 0;
    };
    return {
      top: px(computed.paddingTop),
      right: px(computed.paddingRight),
      bottom: px(computed.paddingBottom),
      left: px(computed.paddingLeft),
    };
  } catch {
    return empty;
  }
}

register('E076', (ctx) => {
  const { viewId, layout, css, el } = ctx;
  if (viewId !== 'points' || !layout || typeof css !== 'function' || typeof el !== 'function') return;

  /* E076-01 : injection unique (cssOnce) et ancrage de portée sur la vue. */
  css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e076 = '1';

  /* E076-07 : couverture et insets mesurés exposés sur le layout, sans écrire
   * dans le store ni dans le DOM des autres lentilles. */
  const cover = viewportCover();
  const insets = measureInsets();
  layout.dataset.e076Cover = cover ? 'cover' : 'auto';
  layout.dataset.e076Top = String(insets.top);
  layout.dataset.e076Right = String(insets.right);
  layout.dataset.e076Bottom = String(insets.bottom);
  layout.dataset.e076Left = String(insets.left);

  /* E076-09 : couplage explicite à ctx.reducedMotion() en plus de la media
   * query, pour les environnements sans matchMedia fiable. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.setAttribute(REDUCED_ATTR, '1');
  } else {
    layout.removeAttribute(REDUCED_ATTR);
  }

  /* E076-07 + E076-10 : une seule note de lecture par rendu ; le garde
   * anti-doublon supporte un second passage sur le même DOM. */
  if (!layout.querySelector('#' + NOTE_ID)) {
    const stale = document.getElementById(NOTE_ID);
    if (stale && !layout.contains(stale)) stale.remove();

    const matrix = layout.querySelector('.points-matrix');
    if (matrix) {
      const noteText = cover
        ? `Safe-area active (viewport-fit=cover) : insets mesurés — haut ${insets.top}px, droite ${insets.right}px, bas ${insets.bottom}px, gauche ${insets.left}px. Matrice et détail restent dégagés de l’encoche et de la barre d’accueil.`
        : 'viewport-fit=cover absent : les insets safe-area valent 0 et rien n’est décalé. Ajoutez viewport-fit=cover au meta viewport pour activer les marges sur iPhone.';
      const note = el('p', 'points-e076-note', noteText);
      note.id = NOTE_ID;
      const kicker = matrix.querySelector('.view-kicker');
      if (kicker && kicker.nextSibling) matrix.insertBefore(note, kicker.nextSibling);
      else matrix.prepend(note);
    }
  }
});
