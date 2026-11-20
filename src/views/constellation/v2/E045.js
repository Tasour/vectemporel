import { register } from './registry.js';

/* Lentille V2 E045 — adaptabilité responsive de la légende, seconde passe.
   Dix chantiers inédits et complémentaires de la passe 1. Aucune horloge,
   aucun minuteur, aucune boucle d'animation propre : les mesures sont prises
   à l'application puis uniquement sur un clic explicite. Zéro réseau, zéro
   source aléatoire, zéro appel de débogage. */

const SEUIL_REPLI = 480;
const SEUIL_CRITIQUE = 260;
const PRIORITES = { 'legend-sun': 1, 'legend-planet': 2, 'legend-moon': 3 };

register('E045', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  const legend = layout.querySelector ? layout.querySelector('.constellation-legend') : null;
  if (!legend) return;

  const factory = typeof ctx.el === 'function'
    ? ctx.el
    : (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
      };

  function setData(node, name, value) {
    if (node && typeof node.setAttribute === 'function') {
      node.setAttribute('data-v2e045-' + name, String(value));
    }
  }

  function dataOf(node, name) {
    return node && typeof node.getAttribute === 'function'
      ? node.getAttribute('data-v2e045-' + name) : null;
  }

  function textOf(node) {
    return node && typeof node.textContent === 'string' ? node.textContent.trim() : '';
  }

  function ensure(id, tag, className, parent) {
    let node = null;
    try { node = document.getElementById(id); } catch (error) { node = null; }
    if (!node) {
      node = factory(tag, className);
      node.id = id;
    }
    if (node.parentNode !== parent) parent.appendChild(node);
    return node;
  }

  function gapOf(node) {
    try {
      const style = typeof window !== 'undefined' && window.getComputedStyle
        ? window.getComputedStyle(node) : null;
      const value = style ? parseFloat(style.columnGap || style.gap || '') : NaN;
      return Number.isFinite(value) ? value : 10;
    } catch (error) {
      return 10;
    }
  }

  function widthOf(node) {
    const rect = node && typeof node.getBoundingClientRect === 'function'
      ? node.getBoundingClientRect() : null;
    return rect && Number.isFinite(rect.width) ? rect.width : NaN;
  }

  /* Feuille unique de la lentille : préfixe v2e045 sur tout, aucun import,
     aucune URL distante, aucune règle qui n'ait un chantier correspondant. */
  css('constellation-v2-e045', `
/* E045-01 — ancrage et commandes de mesure. */
.constellation-legend.v2e045-legend{--v2e045-seuil:480px;--v2e045-critique:260px}
.v2e045-controls{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:4px 0 2px}
.v2e045-measure,.v2e045-unfold{
  min-width:36px;min-height:36px;padding:0 12px;
  border:1px solid #7fa9cf;border-radius:7px;
  background:#101821;color:#dbe7f2;font-size:11px;cursor:pointer;
}
.v2e045-measure:focus-visible,.v2e045-unfold:focus-visible{outline:2px solid #e6b96f;outline-offset:2px}
.v2e045-unfold[aria-pressed="true"]{border-color:#e6b96f;background:rgba(230,185,111,.16);color:#f5e6c4}
.v2e045-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
/* E045-02 — témoin textuel de débordement : jamais la seule couleur. */
.v2e045-note{margin:0;color:#cbd5e1;font:10px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}
/* E045-04 — écart entre lignes indexé sur le nombre estimé. */
.v2e045-legend[data-v2e045-lines="2"]{row-gap:6px}
.v2e045-legend[data-v2e045-lines="3"]{row-gap:8px}
/* E045-05 — entrées repliées : retirées de la vue, gardées dans l'arbre accessible. */
.v2e045-folded{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
/* E045-09 — seuil critique 260 px : resserrement sans changer la disposition. */
.v2e045-legend[data-v2e045-critical="oui"]{column-gap:4px;font-size:8px}
/* E045-10 — récapitulatif lisible et adaptation à l'impression. */
.v2e045-recap{margin:4px 0 0;color:#cbd5e1;font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}
.v2e045-legend[data-v2e045-motion="reduce"] .v2e045-measure,.v2e045-legend[data-v2e045-motion="reduce"] .v2e045-unfold{transition:none}
@media print{
  .v2e045-controls,.v2e045-note{display:none!important}
  .v2e045-folded{position:static!important;width:auto!important;height:auto!important;margin:0!important;overflow:visible!important;clip:auto!important}
  .v2e045-recap{color:#000;font-size:10pt}
}
@media (prefers-reduced-motion: reduce){
  .v2e045-measure,.v2e045-unfold{transition:none}
}
`);

  let note = null;
  let status = null;
  let recap = null;

  /* E045-01 — Relevé à la demande : bouton « Remesurer », témoin de largeur
     et région d'annonce. Le clic est le seul déclencheur après l'application,
     ce qui évite toute boucle d'observation ou d'animation. */
  legend.classList.add('v2e045-legend');
  const controls = ensure('v2e045-controls', 'div', 'v2e045-controls', layout);
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Commandes de mesure de la légende');
  const measureButton = ensure('v2e045-measure', 'button', 'v2e045-measure', controls);
  measureButton.type = 'button';
  if (!textOf(measureButton)) measureButton.textContent = 'Remesurer la légende';
  status = ensure('v2e045-status', 'p', 'v2e045-sr', layout);
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');

  /* E045-02 — Détection de débordement : comparaison déterministe entre
     scrollWidth et clientWidth, traduite en texte visible et en attribut. */
  note = ensure('v2e045-overflow-note', 'p', 'v2e045-note', controls);
  note.textContent = 'Mesure en cours…';

  const items = Array.from(
    legend.querySelectorAll('.legend-sun, .legend-planet, .legend-moon')
  );

  /* E045-03 — Largeur minimale requise : somme des largeurs réelles des
     entrées plus les gouttières lues sur le conteneur, sans valeur inventée. */
  setData(legend, 'items', items.length);
  setData(legend, 'gap', Math.round(gapOf(legend)));

  /* E045-04 — Nombre de lignes estimé, borné entre une et le nombre
     d'entrées ; l'attribut pilote l'écart vertical dans la feuille unique. */
  setData(legend, 'lines', 1);

  /* E045-05 — Priorité de repli : l'ère garde la priorité 1, le repère 2 et
     le point vérifié 3. Sous le seuil de 480 px, les priorités supérieures
     sont masquées visuellement mais restent annoncées aux lecteurs d'écran. */
  items.forEach((item) => {
    let priority = 4;
    Object.keys(PRIORITES).forEach((key) => {
      if (item.classList.contains(key)) priority = PRIORITES[key];
    });
    setData(item, 'priority', priority);
  });
  setData(legend, 'seuil', SEUIL_REPLI);

  /* E045-06 — Bascule indépendante « Déplier tout » : elle force l'affichage
     intégral, quel que soit le seuil, avec un aria-pressed légitime. */
  const unfold = ensure('v2e045-unfold', 'button', 'v2e045-unfold', controls);
  unfold.type = 'button';
  if (!textOf(unfold)) unfold.textContent = 'Déplier toutes les entrées';
  if (!unfold.hasAttribute('aria-pressed')) unfold.setAttribute('aria-pressed', 'false');
  setData(legend, 'open', '0');

  /* E045-07 — Infobulle complète : le libellé intégral et sa signification
     sont mémorisés puis proposés au survol, même quand le visuel est abrégé. */
  items.forEach((item) => {
    const full = textOf(item) || 'Élément de légende';
    setData(item, 'full', full);
    let sens = 'entrée de la légende';
    if (item.classList.contains('legend-sun')) sens = 'ère';
    else if (item.classList.contains('legend-planet')) sens = 'repère';
    else if (item.classList.contains('legend-moon')) sens = 'point vérifié';
    if (!item.hasAttribute('title')) item.setAttribute('title', `${full} — ${sens}`);
  });

  /* E045-08 — Densité de lecture : caractères par ligne estimés, calculés
     depuis les libellés mémorisés et le nombre de lignes, sans arrondi aléatoire. */
  setData(legend, 'cpl', 0);

  /* E045-09 — Seuil critique de 260 px : en dessous, la légende resserre ses
     gouttières et son corps de texte sans changer sa disposition, et l'état
     est exposé par un attribut lisible. */
  setData(legend, 'seuilcritique', SEUIL_CRITIQUE);
  setData(legend, 'critical', 'non');

  /* E045-10 — Récapitulatif visible en français, imprimable, et couplage à
     la préférence de mouvement fournie par l'hôte sans sonde propre. */
  recap = ensure('v2e045-recap', 'p', 'v2e045-recap', layout);
  const reduced = typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion();
  setData(legend, 'motion', reduced ? 'reduce' : 'on');

  function mesure() {
    const width = widthOf(legend);
    const scroll = Number.isFinite(legend.scrollWidth) ? legend.scrollWidth : NaN;
    const client = Number.isFinite(legend.clientWidth) ? legend.clientWidth : NaN;
    const overflow = Number.isFinite(scroll) && Number.isFinite(client) && scroll > client + 1;
    const shown = Number.isFinite(width) ? Math.round(width) : 'inconnue';

    setData(legend, 'width', shown);
    setData(legend, 'overflow', overflow ? 'oui' : 'non');
    note.textContent = overflow
      ? 'Débordement détecté : la légende dépasse la largeur disponible.'
      : 'Aucun débordement détecté à cette largeur.';

    const gap = Number(dataOf(legend, 'gap')) || 0;
    let minWidth = 0;
    let chars = 0;
    items.forEach((item) => {
      minWidth += widthOf(item) || 0;
      chars += (dataOf(item, 'full') || '').length;
    });
    if (items.length > 1) minWidth += gap * (items.length - 1);
    const minimum = Math.round(minWidth);
    setData(legend, 'minwidth', minimum);

    const lines = Number.isFinite(width) && width > 0
      ? Math.max(1, Math.min(items.length || 1, Math.ceil(minWidth / width))) : 1;
    setData(legend, 'lines', lines);
    const cpl = Math.round(chars / lines);
    setData(legend, 'cpl', cpl);

    const forceOpen = dataOf(legend, 'open') === '1';
    const narrow = Number.isFinite(width) && width < SEUIL_REPLI;
    let folded = 0;
    items.forEach((item) => {
      const priority = Number(dataOf(item, 'priority')) || 4;
      const isFolded = narrow && !forceOpen && priority > 1;
      if (isFolded) folded += 1;
      if (isFolded) item.classList.add('v2e045-folded');
      else item.classList.remove('v2e045-folded');
    });
    setData(legend, 'folded', folded);

    const critical = Number.isFinite(width) && width < SEUIL_CRITIQUE;
    setData(legend, 'critical', critical ? 'oui' : 'non');

    status.textContent = `Largeur mesurée ${shown} pixels, largeur minimale ${minimum} pixels, `
      + `${lines} ligne(s) estimée(s), ${cpl} caractères par ligne, `
      + `${folded} entrée(s) repliée(s), débordement ${overflow ? 'oui' : 'non'}.`;
    recap.textContent = `Légende : ${items.length} entrées · largeur ${shown} px · `
      + `${minimum} px nécessaires · ${lines} ligne(s) · ${cpl} caractères par ligne · `
      + `${folded} repliée(s) · seuils ${SEUIL_CRITIQUE} et ${SEUIL_REPLI} px.`;
  }

  if (measureButton.dataset.v2e045Bound !== '1') {
    measureButton.dataset.v2e045Bound = '1';
    measureButton.addEventListener('click', mesure);
  }
  if (unfold.dataset.v2e045Bound !== '1') {
    unfold.dataset.v2e045Bound = '1';
    unfold.addEventListener('click', () => {
      const open = dataOf(legend, 'open') !== '1';
      setData(legend, 'open', open ? '1' : '0');
      unfold.setAttribute('aria-pressed', open ? 'true' : 'false');
      mesure();
    });
  }

  mesure();
});
