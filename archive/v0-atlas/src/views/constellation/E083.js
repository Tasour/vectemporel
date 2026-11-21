import { register } from './registry.js';

/* Lentille E083 — Contraste visuel appliqué au chemin de connexion de la vue
 * Constellation. Les « chemins de connexion » sont les <line> SVG contenus dans
 * svg.constellation-edges : le trait plein .is-path relie le soleil de l'ère
 * active au repère actif, les traits .is-moon relient ce repère à ses points
 * vérifiés, et les traits nus restent les liaisons secondaires. Le réglage
 * d'origine les dessine avec des opacités très faibles (.16 pour un trait nu,
 * .35 pour une liaison lunaire), ce qui les rend presque invisibles sur le
 * fond sombre et porte l'information par la seule couleur.
 *
 * Rapport : UNIFIED_AUDIT/CONSTELLATION/views/E083.md — chantiers E083-01 à E083-10.
 * Fichier possédé : ce module uniquement. Aucun fichier partagé n'est édité :
 * ni src/views/constellation.js, ni registry.js, ni index.js, ni styles.css.
 *
 * Contrat : un seul appel register pour la lentille, avec
 * ctx = { viewId, stage, layout, css(id, rules), el(tag, cls, text), reducedMotion() }.
 * ctx.layout est vérifié avant tout ajout DOM ; une seule feuille CSS est
 * injectée sous l'identifiant constellation-e083. Tous les IDs DOM créés
 * portent le préfixe e083-. Zéro appel réseau, zéro aléa, zéro sortie console,
 * aucune minuterie ni boucle d'animation propre, aucune injection HTML.
 */

const CSS_ID = 'constellation-e083';
const LEGEND_ID = 'e083-legend';
const READOUT_ID = 'e083-readout';
const AUDIT_ID = 'e083-audit';
const ACTIVE = 'data-e083-on';

const CSS = `
  .constellation-layout[data-e083-on] .constellation-edges line {
    vector-effect: non-scaling-stroke;
  }
  .constellation-layout[data-e083-on] .constellation-edges line.e083-halo {
    filter: drop-shadow(0 0 2px rgba(246, 217, 155, .55));
  }
  .constellation-layout[data-e083-on] .constellation-edges.e083-focus-path line.is-path {
    stroke-width: 3 !important;
    filter: drop-shadow(0 0 3px rgba(246, 217, 155, .85));
  }
  .constellation-layout[data-e083-on] .e083-legend {
    flex: 1 1 100%; margin: 6px 0 0;
    color: var(--gold-bright, #f6d99b); font-size: 9px; line-height: 1.5;
  }
  .constellation-layout[data-e083-on] .e083-readout {
    flex: 1 1 100%; margin: 4px 0 0;
    color: var(--muted, #9aa6b8); font-size: 9px; line-height: 1.5;
  }
  .constellation-layout[data-e083-on] .e083-audit { display: none; }
  @media (prefers-reduced-motion: reduce) {
    .constellation-layout[data-e083-on] .constellation-edges line { transition: none; }
  }
`;

/* Teintes de référence et fond sombre de la vue, pour le calcul de contraste. */
const GOLD = [230, 185, 111];
const VIOLET = [178, 139, 221];
const GOLD_VIF = [246, 217, 155];
const VIOLET_VIF = [196, 160, 240];
const FOND = [12, 15, 22];

const watchedFields = new WeakSet();

function safe(fn) {
  try { return Math.max(0, Number(fn()) || 0); }
  catch { return 0; }
}

function classe(line, nom) {
  try { return Boolean(line.classList && line.classList.contains(nom)); }
  catch { return false; }
}

function styleLine(line, propriete, valeur) {
  try { line.style.setProperty(propriete, valeur); return true; }
  catch { return false; }
}

function marquer(line, nom, valeur) {
  try { line.setAttribute(nom, valeur); }
  catch { /* attribut non critique */ }
}

function rgbDepuis(chaine) {
  const texte = String(chaine || '').trim();
  const rgba = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(texte);
  if (rgba) return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])];
  const hex = texte.replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return [
      parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16),
    ];
  }
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  return null;
}

function luminance(rgb) {
  if (!rgb) return 0;
  const canal = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(rgb[0]) + 0.7152 * canal(rgb[1]) + 0.0722 * canal(rgb[2]);
}

function contraste(rgb, fond) {
  const clair = Math.max(luminance(rgb), luminance(fond));
  const sombre = Math.min(luminance(rgb), luminance(fond));
  return (clair + 0.05) / (sombre + 0.05);
}

function melanger(rgb, fond, alpha) {
  return rgb.map((canal, i) => Math.round(canal * alpha + fond[i] * (1 - alpha)));
}

function rgba(rgb, alpha) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

/* Opacité d'origine d'un trait, déduite de ses classes (valeurs du CSS de la
   vue) : sert de point de comparaison avant rehaussement. */
function opaciteInitiale(line) {
  if (classe(line, 'is-moon') && classe(line, 'is-path')) return 0.85;
  if (classe(line, 'is-path')) return 0.65;
  if (classe(line, 'is-moon')) return 0.35;
  return 0.16;
}

function teinteInitiale(line) {
  return classe(line, 'is-moon') ? VIOLET : GOLD;
}

/* E083-01 — Plancher d'opacité : chaque trait dont l'opacité initiale est
   inférieure à un seuil reçoit une opacité relevée, écrite en style inline.
   Effet concret : ligne.style.stroke + attribut data-e083-alpha. */
function etape01(lignes) {
  const plancher = { 0.16: 0.42, 0.35: 0.55, 0.65: 0.85, 0.85: 0.95 };
  let touches = 0;
  lignes.forEach((line) => {
    const avant = opaciteInitiale(line);
    const apres = plancher[avant] !== undefined ? plancher[avant] : Math.max(avant, 0.42);
    if (styleLine(line, 'stroke', rgba(teinteInitiale(line), apres))) {
      marquer(line, 'data-e083-alpha', `${avant.toFixed(2)}→${apres.toFixed(2)}`);
      touches += 1;
    }
  });
  return touches;
}

/* E083-02 — Épaississement du trait actif : les liaisons .is-path passent à
   2,4 px de stroke-width et conservent vector-effect non-scaling-stroke.
   Effet concret : line.style.stroke-width, setAttribute('vector-effect') et
   marqueur data-e083-width. */
function etape02(lignes) {
  let touches = 0;
  lignes.forEach((line) => {
    if (!classe(line, 'is-path')) return;
    styleLine(line, 'stroke-width', '2.4');
    try { line.setAttribute('vector-effect', 'non-scaling-stroke'); }
    catch { /* attribut non critique */ }
    marquer(line, 'data-e083-width', '2.4');
    touches += 1;
  });
  return touches;
}

/* E083-03 — Ratio de contraste du chemin actif : la couleur effective du trait
   est composée sur le fond sombre, puis comparée au seuil WCAG de 3:1 pour les
   éléments graphiques. Sous le seuil, le trait passe en doré vif. Le ratio
   minimum est mémorisé pour la lecture de l'état (chantier 08).
   Effet concret : stroke recomposé + attribut data-e083-ratio. */
function etape03(lignes, etat) {
  let touches = 0;
  lignes.forEach((line) => {
    if (!classe(line, 'is-path')) return;
    const avant = opaciteInitiale(line);
    const compose = melanger(teinteInitiale(line), FOND, avant);
    let ratio = contraste(compose, FOND);
    if (ratio < 3) {
      const vues = classe(line, 'is-moon') ? VIOLET_VIF : GOLD_VIF;
      const vCompose = melanger(vues, FOND, 0.95);
      styleLine(line, 'stroke', rgba(vues, 0.95));
      ratio = contraste(vCompose, FOND);
      touches += 1;
    }
    marquer(line, 'data-e083-ratio', `${ratio.toFixed(2)}:1`);
    if (ratio < etat.ratioMin) etat.ratioMin = ratio;
  });
  if (!Number.isFinite(etat.ratioMin)) etat.ratioMin = 0;
  return touches;
}

/* E083-04 — Halo de lisibilité : le chemin actif reçoit la classe .e083-halo ;
   l'unique feuille CSS lui applique une ombre portée statique qui le détache
   du fond. Le marqueur data-e083-on sur le layout active la règle.
   Effet concret : classList.add + données du layout + règle CSS. */
function etape04(layout, lignes) {
  try { layout.setAttribute(ACTIVE, 'on'); }
  catch { /* le greffon reste tolérant */ }
  let touches = 0;
  lignes.forEach((line) => {
    if (!classe(line, 'is-path')) return;
    try { line.classList.add('e083-halo'); touches += 1; }
    catch { /* classe non critique */ }
  });
  return touches;
}

/* E083-05 — Différenciation par pointillé : les traits non actifs reçoivent un
   stroke-dasharray, si bien que le niveau de contraste n'est plus porté par la
   seule couleur. Effet concret : line.style.stroke-dasharray + data-e083-dash. */
function etape05(lignes) {
  let touches = 0;
  lignes.forEach((line) => {
    if (classe(line, 'is-path')) return;
    const motif = classe(line, 'is-moon') ? '2 1.2' : '1.6 1.8';
    if (styleLine(line, 'stroke-dasharray', motif)) {
      marquer(line, 'data-e083-dash', motif);
      touches += 1;
    }
  });
  return touches;
}

/* E083-06 — Liaison lunaire contrastée : les traits .is-moon passent en violet
   vif avec une opacité plancher de .9, un motif de tirets propre et une largeur
   minimale de 1,4 px. Effet concret : stroke, dasharray, stroke-width et
   attribut data-e083-moonlink. */
function etape06(lignes) {
  let touches = 0;
  lignes.forEach((line) => {
    if (!classe(line, 'is-moon')) return;
    styleLine(line, 'stroke', rgba(VIOLET_VIF, 0.9));
    styleLine(line, 'stroke-dasharray', '2 1');
    if (!classe(line, 'is-path')) styleLine(line, 'stroke-width', '1.4');
    marquer(line, 'data-e083-moonlink', 'renforce');
    touches += 1;
  });
  return touches;
}

/* E083-07 — Légende textuelle du chemin : un paragraphe de la légende décrit
   les deux niveaux de contraste (trait plein doré = chemin actif, pointillé =
   liaison secondaire). Le texte est réel et indexable, recréé de façon
   idempotente. Effet concret : p#e083-legend inséré dans .constellation-caption. */
function etape07(ctx, layout) {
  const caption = layout.querySelector('.constellation-caption');
  if (!caption) return 0;
  let legende = document.getElementById(LEGEND_ID);
  if (!legende || legende.parentNode !== caption) {
    if (legende && legende.parentNode) legende.parentNode.removeChild(legende);
    legende = ctx.el('p', 'e083-legend');
    legende.id = LEGEND_ID;
    caption.appendChild(legende);
  }
  legende.textContent = 'Contraste du chemin : trait plein doré = liaison active, '
    + 'tirets violets = points vérifiés, tirets discrets = liaisons secondaires.';
  return 1;
}

/* E083-08 — Lecture de l'état de contraste : une région role="status"
   aria-live="polite" porte le ratio minimum mesuré et le nombre de traits
   traités, équivalent textuel de l'information visuelle. Effet concret :
   p#e083-readout créé puis renseigné en fin de passe. */
function etape08(ctx, layout) {
  const caption = layout.querySelector('.constellation-caption');
  if (!caption) return 0;
  let lecture = document.getElementById(READOUT_ID);
  if (!lecture || lecture.parentNode !== caption) {
    if (lecture && lecture.parentNode) lecture.parentNode.removeChild(lecture);
    lecture = ctx.el('p', 'e083-readout');
    lecture.id = READOUT_ID;
    lecture.setAttribute('role', 'status');
    lecture.setAttribute('aria-live', 'polite');
    lecture.setAttribute('aria-atomic', 'true');
    caption.appendChild(lecture);
  }
  return 1;
}

function renseignerReadout(etat, lignes) {
  const lecture = document.getElementById(READOUT_ID);
  if (!lecture) return;
  const ratio = Number.isFinite(etat.ratioMin) ? etat.ratioMin.toFixed(2) : '0.00';
  lecture.textContent = `Chemin de connexion : ${lignes.length} trait(s), `
    + `contraste minimal ${ratio}:1 (référence 3:1), renforcement appliqué sur `
    + `${etat.renforces} liaison(s) active(s).`;
}

/* E083-09 — Relief au focus : un écouteur délégué unique par champ (WeakSet)
   ajoute .e083-focus-path au SVG quand un nœud du champ reçoit le focus, et le
   retire à la sortie. La CSS épaissit alors le chemin actif : l'effet est
   accessible au clavier, sans animation. Effet concret : écouteurs focusin/
   focusout + attribut data-e083-focus. */
function etape09(champ, layout) {
  if (!champ || typeof champ.addEventListener !== 'function') return 0;
  const edges = layout.querySelector('.constellation-edges');
  if (!edges) return 0;
  if (!watchedFields.has(champ)) {
    watchedFields.add(champ);
    champ.addEventListener('focusin', (event) => {
      const cible = event.target && typeof event.target.closest === 'function'
        ? event.target.closest('.const-sun, .const-planet, .const-moon') : null;
      if (cible && champ.contains(cible)) {
        try { edges.classList.add('e083-focus-path'); }
        catch { /* classe non critique */ }
      }
    });
    champ.addEventListener('focusout', () => {
      try { edges.classList.remove('e083-focus-path'); }
      catch { /* classe non critique */ }
    });
  }
  try { champ.setAttribute('data-e083-focus', 'on'); }
  catch { /* attribut non critique */ }
  return 1;
}

/* E083-10 — Sceau auditable : compteurs par chantier sur le layout et panneau
   #e083-audit recréé de façon idempotente avec un récapitulatif en texte réel.
   Effet concret : layout.dataset.e083Checks + section#e083-audit. */
function etape10(ctx, layout, counts, etat, lignes) {
  const total = counts.reduce((somme, n) => somme + n, 0);
  try {
    layout.dataset.e083Contrast = 'on';
    layout.dataset.e083Lines = String(lignes.length);
    layout.dataset.e083Ratio = etat.ratioMin.toFixed(2);
    layout.dataset.e083Checks = counts
      .map((n, index) => `${String(index + 1).padStart(2, '0')}:${n}`).join(' ');
  } catch { /* données non critiques */ }

  let panneau = document.getElementById(AUDIT_ID);
  if (!panneau || panneau.parentNode !== layout) {
    if (panneau && panneau.parentNode) panneau.parentNode.removeChild(panneau);
    panneau = ctx.el('section', 'e083-audit');
    panneau.id = AUDIT_ID;
    panneau.setAttribute('aria-label', 'Audit de contraste du chemin de connexion');
    layout.appendChild(panneau);
  }
  while (panneau.firstChild) panneau.removeChild(panneau.firstChild);
  const calme = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
  panneau.appendChild(ctx.el('h3', 'e083-audit-titre', 'Contraste du chemin — E083'));
  panneau.appendChild(ctx.el('p', 'e083-audit-ligne',
    `${lignes.length} trait(s) examiné(s) · ${total} effet(s) · `
    + `${counts.filter((n) => n > 0).length} chantier(s) actif(s).`));
  counts.forEach((n, index) => {
    panneau.appendChild(ctx.el('p', 'e083-audit-ligne',
      `E083-${String(index + 1).padStart(2, '0')} : ${n} effet(s).`));
  });
  panneau.appendChild(ctx.el('p', 'e083-audit-ligne',
    `Mouvement réduit : ${calme ? 'actif' : 'inactif'} · aucune animation ajoutée.`));
  return 1;
}

register('E083', (ctx) => {
  /* Contrat : ctx.layout est exigé avant la moindre insertion dans le DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'constellation') return;
  if (typeof document === 'undefined') return;

  const layout = ctx.layout;
  const lignes = Array.from(layout.querySelectorAll('.constellation-edges line'));
  const champ = layout.querySelector('.constellation-field');
  const etat = { ratioMin: Number.POSITIVE_INFINITY, renforces: 0 };

  ctx.css(CSS_ID, CSS);

  try {
    const counts = [];
    counts.push(safe(() => etape01(lignes)));
    counts.push(safe(() => etape02(lignes)));
    etat.renforces = safe(() => etape03(lignes, etat));
    counts.push(etat.renforces);
    counts.push(safe(() => etape04(layout, lignes)));
    counts.push(safe(() => etape05(lignes)));
    counts.push(safe(() => etape06(lignes)));
    counts.push(safe(() => etape07(ctx, layout)));
    counts.push(safe(() => etape08(ctx, layout)));
    counts.push(safe(() => etape09(champ, layout)));
    counts.push(safe(() => etape10(ctx, layout, counts, etat, lignes)));
    safe(() => renseignerReadout(etat, lignes));
  } catch {
    /* greffon tolérant : un rendu partiel reste lisible et fonctionnel. */
  }
});
