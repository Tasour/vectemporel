import { register } from './registry.js';

/* Lentille E013 — Contraste visuel appliqué aux planètes (vue Constellation).
 * Dix chantiers décrits dans UNIFIED_AUDIT/CONSTELLATION/views/E013.md.
 *
 * La vue de base (constellation.js:288-313) crée les boutons .const-planet avec
 * un simple chiffre, une couleur var(--ink-soft) et aucune bordure : ils se
 * confondent avec le champ sombre et avec les traits SVG qui les traversent.
 * E013 ne réécrit pas ce balisage : il ajoute un contraste de fond, de bordure,
 * de chiffre et d'étiquette, un signal non coloré de l'état actif, un repère de
 * focus clavier, et des contrastes adaptés à la densité et au fond réel.
 *
 * Tout est dérivé du DOM rendu : aucune donnée inventée, aucun réseau, aucun
 * aléa, aucune console, aucun minuteur ni boucle d'animation propre. */

const CSS_ID = 'constellation-e013';
const KEY_ID = 'e013-contrast-key';

/* Garde de type tolérante : un contexte incomplet neutralise la lentille. */
function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

/* Luminance relative (WCAG) d'une couleur rgb()/rgba() calculée ; null si la
 * couleur n'est pas exploitable. Aucune graine, aucun hasard. */
function luminance(color) {
  if (typeof color !== 'string') return null;
  const parts = color.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (!parts) return null;
  const channels = [Number(parts[1]), Number(parts[2]), Number(parts[3])].map((value) => {
    const c = Math.max(0, Math.min(1, value / 255));
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/* Premier fond opaque rencontré en remontant l'arbre (le champ lui-même est
 * transparent : c'est le fond de la vue qui fait le contraste réel). */
function effectiveBg(node) {
  let current = node;
  while (current && typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    let bg;
    try { bg = window.getComputedStyle(current).backgroundColor; }
    catch { return null; }
    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') return bg;
    current = current.parentElement;
  }
  return null;
}

function prefersReduced(ctx) {
  try { return typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion(); }
  catch { return false; }
}

/* Écouteur de focus unique, installé une seule fois sur le document. Les
 * callbacks lisent un pointeur module courant : jamais de nœud déconnecté. */
let focusBound = false;
let focusedPlanet = null;
function onFocusIn(event) {
  const target = event && event.target;
  if (!target || typeof target.closest !== 'function') return;
  const planet = target.closest('.const-planet');
  if (!planet) return;
  if (focusedPlanet && focusedPlanet !== planet && typeof focusedPlanet.setAttribute === 'function') {
    focusedPlanet.setAttribute('data-e013-focus', 'false');
  }
  focusedPlanet = planet;
  planet.setAttribute('data-e013-focus', 'true');
}

register('E013', (ctx) => {
  const layout = ctx && ctx.layout;
  const stage = ctx && ctx.stage;
  const css = ctx && ctx.css;
  const el = ctx && ctx.el;

  /* E013-00 — Garde d'entrée : vérifier ctx.layout avant tout ajout DOM. */
  if (!isElement(layout) || typeof css !== 'function' || typeof el !== 'function') return;
  const field = layout.querySelector('.constellation-field');
  const caption = layout.querySelector('.constellation-caption');

  /* E013-01 — Feuille de style isolée, injectée une seule fois. Aucun url(),
   * aucune règle d'import distant, aucune transition quand prefers-reduced-motion
   * est actif (l'attribut data-e013-anim pilote la transition, chantier 10). */
  css(CSS_ID, `
    .constellation-field .const-planet{
      box-sizing:border-box;
      background:var(--surface-2,rgba(255,255,255,.06));
      border:1.5px solid var(--line,rgba(244,214,158,.45));
      border-radius:50%;
      box-shadow:0 0 0 2px rgba(0,0,0,.5),0 1px 5px rgba(0,0,0,.55);
    }
    .constellation-field .const-planet[data-e013-role="planete"]{
      border-style:solid;
    }
    .constellation-field .const-planet[data-e013-active="true"]{
      border-style:dashed;
      border-color:var(--gold-bright,#f5d99a);
      box-shadow:0 0 0 2px rgba(0,0,0,.65),0 0 0 4px var(--gold-bright,#f5d99a),
        0 0 12px rgba(245,217,154,.55);
    }
    /* E013-02 — Chiffre de planète : couleur dorée, gras et ombre portée pour
     * rester lisible sur le fond sombre et malgré les traits SVG traversants. */
    .constellation-field .const-planet{
      color:var(--gold-bright,#f5d99a);
      font-size:10px;
      font-weight:700;
      text-shadow:0 1px 2px rgba(0,0,0,.95);
    }
    /* E013-03 — Étiquette (data-label) sur pastille opaque : le texte n'est plus
     * noyé dans les lignes ni dans les nœuds voisins. */
    .constellation-field .const-planet::after{
      color:var(--ink,#f4f6f8);
      background:rgba(10,12,18,.9);
      border:1px solid var(--line,rgba(244,214,158,.35));
      border-radius:4px;
      padding:1px 4px;
      white-space:normal;
      line-height:1.25;
    }
    .constellation-field .const-planet[data-e013-active="true"]::after{
      color:var(--gold-bright,#f5d99a);
      border-color:var(--gold-bright,#f5d99a);
    }
    .constellation-field .const-planet:focus-visible,
    .constellation-field .const-planet[data-e013-focus="true"]{
      outline:2px solid var(--gold-bright,#f5d99a);
      outline-offset:3px;
    }
    .constellation-field [data-e013-role="lune"]{
      box-shadow:0 0 0 1px rgba(0,0,0,.55);
    }
    .constellation-field[data-e013-density="serre"] .const-planet{
      border-width:2px;
      background:rgba(10,12,18,.94);
    }
    .constellation-field[data-e013-density="serre"] .const-planet::after{
      font-size:7px;
    }
    .constellation-field[data-e013-bg="clair"] .const-planet{
      color:#3a2a06;
      border-color:#7a5a12;
      text-shadow:none;
    }
    .constellation-field[data-e013-bg="clair"] .const-planet[data-e013-active="true"]{
      border-color:#8a6208;
      box-shadow:0 0 0 2px rgba(255,255,255,.8),0 0 0 4px #8a6208;
    }
    .constellation-field[data-e013-bg="clair"] .const-planet::after{
      color:#1a1a1a;
      background:rgba(255,255,255,.94);
      border-color:#777;
    }
    .constellation-field[data-e013-anim="oui"] .const-planet{
      transition:background-color .15s ease,border-color .15s ease,box-shadow .15s ease;
    }
    .constellation-field[data-e013-anim="oui"] .const-planet:hover{
      background:var(--gold,#e6b96f);
      color:#1a1408;
    }
    #e013-contrast-key{
      margin:8px 0 0;
      padding:6px 8px;
      flex:1 1 100%;
      border-left:2px solid var(--gold,#e6b96f);
      color:var(--muted,#8aa);
      font-size:9px;
      line-height:1.5;
    }
    @media (prefers-contrast: more){
      .constellation-field .const-planet{border-width:2px;border-color:var(--gold-bright,#f5d99a)}
      .constellation-field .const-planet[data-e013-active="true"]{
        outline:3px double var(--gold-bright,#f5d99a);outline-offset:2px}
    }
    @media (forced-colors: active){
      .constellation-field .const-planet{border:2px solid CanvasText}
      .constellation-field .const-planet[data-e013-active="true"]{border-style:dashed}
    }
  `);

  /* Pas de champ = pas de planètes à traiter ; la feuille reste inoffensive. */
  if (!isElement(field)) return;

  const planets = Array.prototype.slice.call(field.querySelectorAll('.const-planet'));
  if (!planets.length) return;

  /* E013-04 — Signal NON coloré de l'état actif : attribut dérivé de la classe
   * posée par la vue (constellation.js:299), traduit en anneau tireté par le CSS. */
  planets.forEach((planet) => {
    const active = planet.classList && planet.classList.contains('is-active');
    planet.setAttribute('data-e013-active', active ? 'true' : 'false');
  });

  /* E013-05 — Contraste clavier : écouteur de focus délégué, installé une seule
   * fois. Le survol est couvert par le CSS, le focus par l'attribut posé ici. */
  if (typeof document !== 'undefined' && !focusBound) {
    document.addEventListener('focusin', onFocusIn);
    focusBound = true;
  }

  /* E013-06 — Densité calculée depuis le nombre réel de planètes : plus il y en
   * a, plus le fond est opaque et la bordure épaisse pour les séparer. */
  const count = planets.length;
  const density = count > 12 ? 'serre' : count > 6 ? 'moyen' : 'large';
  field.setAttribute('data-e013-density', density);

  /* E013-07 — Contraste selon le fond réel : luminance WCAG calculée depuis le
   * style calculé, puis bascule clair/sombre des couleurs de texte et de bordure. */
  if (typeof window !== 'undefined') {
    const bg = effectiveBg(field);
    const lum = luminance(bg);
    if (lum !== null) field.setAttribute('data-e013-bg', lum > 0.5 ? 'clair' : 'sombre');
  }

  /* E013-08 — Hiérarchie planètes / lunes : attribut de rôle sur les deux
   * familles de nœuds, exploité par le CSS pour différencier leurs contrastes. */
  planets.forEach((planet) => planet.setAttribute('data-e013-role', 'planete'));
  field.querySelectorAll('.const-moon').forEach((moon) => moon.setAttribute('data-e013-role', 'lune'));

  /* E013-09 — Clé de lecture textuelle, ajoutée une seule fois dans la légende :
   * le codage du contraste devient indexable et annonçable, pas seulement visuel. */
  if (isElement(caption) && !caption.querySelector('#' + KEY_ID)) {
    const key = el('p', 'e013-key',
      'Contraste des planètes : anneau plein = repère ordinaire, anneau tireté et chiffre doré = repère sélectionné ; '
      + 'le chiffre reste lisible sur fond sombre comme sur fond clair. Les lunes sont de petits anneaux violets.');
    key.id = KEY_ID;
    caption.appendChild(key);
  }

  /* E013-10 — Cohérence mouvement et contraste renforcé : la transition de
   * survol n'est autorisée que si l'utilisateur n'a pas demandé la réduction des
   * animations. Sans l'attribut « oui », le CSS n'applique aucune transition. */
  if (!prefersReduced(ctx)) field.setAttribute('data-e013-anim', 'oui');
  else field.setAttribute('data-e013-anim', 'non');
});
