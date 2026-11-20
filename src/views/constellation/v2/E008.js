import { register } from './registry.js';

/* Lentille V2 E008 — instrumentation E2E avancée des soleils (ères) de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés, sans
   réseau, sans source aléatoire et sans minuteur ni boucle d'animation propre.
   Préfixe exclusif : v2e008 (aucune collision avec la passe 1 e008). */
register('E008', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique de la lentille : contour des soleils hors champ, panneau de
     contrat masqué en rendu nominal, et repli « mouvement réduit ». Aucune
     couleur n'est le seul vecteur d'information (contour pointillé + attribut). */
  css('constellation-v2-e008', `
/* V2 E008-06 — soleil hors des limites du champ, révélé en mode diagnostic. */
body.constellation-diagnostics .const-sun.v2e008-oob{outline:2px dotted var(--violet);outline-offset:2px}
/* V2 E008-09 — panneau de contrat : masqué par défaut, visible en diagnostic. */
#v2e008-panel{display:none!important}
body.constellation-diagnostics #v2e008-panel{
  display:block!important;margin:12px 0 0;padding:10px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02);
}
#v2e008-panel summary{min-height:36px;padding:4px 0;color:var(--gold);font:600 12px/1.3 inherit;cursor:pointer}
#v2e008-panel summary:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
#v2e008-panel p{margin:0 0 4px;color:var(--muted);font-size:10px;line-height:1.45;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
/* V2 E008-10 — aucune transition quand le mouvement est réduit. */
.constellation-layout[data-v2e008-motion="reduce"] #v2e008-panel *,
.constellation-layout[data-v2e008-motion="reduce"] .v2e008-oob{transition:none!important}
@media (prefers-reduced-motion: reduce){#v2e008-panel *,.v2e008-oob{transition:none!important}}
`);

  /* Fabrique d'éléments avec repli si le contexte ne fournit pas ctx.el. */
  const make = (tag, className, text) => {
    if (typeof ctx.el === 'function') return ctx.el(tag, className, text);
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  /* Accès tolérant aux attributs, pour un DOM incomplet. */
  const put = (node, attr, value) => {
    if (node && typeof node.setAttribute === 'function') node.setAttribute(attr, value);
  };
  const read = (node, attr) => node && typeof node.getAttribute === 'function'
    ? node.getAttribute(attr) : null;
  const number = (value, fallback) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  /* Slug stable d'un libellé : accents retirés, ponctuation réduite à des tirets. */
  const slug = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sans-nom';
  /* Position décimale lue directement dans les variables CSS posées par la vue. */
  const positionOf = sun => {
    const style = sun && sun.style ? sun.style : null;
    const x = style && typeof style.getPropertyValue === 'function' ? style.getPropertyValue('--x') : '';
    const y = style && typeof style.getPropertyValue === 'function' ? style.getPropertyValue('--y') : '';
    return number(x, NaN) + ',' + number(y, NaN);
  };

  const sunLayer = layout.querySelector('.const-layer-suns');
  const suns = sunLayer
    ? Array.prototype.slice.call(sunLayer.querySelectorAll('button.const-sun')) : [];
  const field = layout.querySelector('.constellation-field');

  /* V2 E008-01 — Sélecteurs sémantiques normalisés : un data-testid lisible,
     dérivé du nom d'ère (avant le séparateur « · ») et de l'index de rendu.
     Contrairement aux identifiants purement numériques de la passe 1, ce
     sélecteur reste compréhensible dans un message d'échec de test. */
  const testIds = suns.map((sun, index) => {
    const label = (sun.dataset && sun.dataset.label ? sun.dataset.label : '') || read(sun, 'aria-label') || '';
    const name = slug(String(label).split('·')[0]);
    const testid = 'soleil-' + index + '-' + name;
    put(sun, 'data-v2e008-testid', testid);
    return testid;
  });

  /* V2 E008-02 — Contrat d'ordre de tabulation : la suite des clés atteignables
     est publiée et le nombre d'arrêts Tab compté. Plus d'un arrêt à 0 signale
     une régression du tabindex mobile introduite par la passe 1 d'accessibilité. */
  const tabOrder = suns
    .filter(sun => (sun.tabIndex | 0) >= 0)
    .map(sun => read(sun, 'data-const-key') || '?');
  const tabStops = suns.filter(sun => (sun.tabIndex | 0) === 0).length;
  put(sunLayer, 'data-v2e008-taborder', tabOrder.join('>'));
  put(sunLayer, 'data-v2e008-tabstops', String(tabStops));
  put(sunLayer, 'data-v2e008-tabok', tabStops <= 1 ? '1' : '0');

  /* V2 E008-03 — Inventaire de topologie de la scène : présence et effectif
     des trois couches, nombre de traits SVG. Un rendu partiel est détectable
     sans inspecter chaque nœud à la main. */
  const layerSpecs = [
    ['.const-layer-suns', 'soleils'],
    ['.const-layer-planets', 'repères'],
    ['.const-layer-moons', 'points'],
  ];
  let missingLayers = 0;
  const layerCounts = layerSpecs.map(spec => {
    const node = layout.querySelector(spec[0]);
    if (!node) { missingLayers += 1; return spec[1] + ':0'; }
    return spec[1] + ':' + (typeof node.querySelectorAll === 'function'
      ? node.querySelectorAll('button').length : 0);
  });
  const edges = layout.querySelector('.constellation-edges');
  const edgeCount = edges && edges.children ? edges.children.length : 0;
  const topology = layerCounts.join(';') + ';traits:' + edgeCount;
  put(layout, 'data-v2e008-topology', topology);
  put(layout, 'data-v2e008-layer-missing', String(missingLayers));

  /* V2 E008-04 — Cohérence du libellé visible : le chiffre affiché sur chaque
     soleil doit valoir son index + 1. Une dérive trahit un rendu désynchronisé
     entre le texte du bouton et l'ordre des ères. */
  let labelMismatch = 0;
  suns.forEach((sun, index) => {
    const visible = String(sun.textContent || '').trim();
    const coherent = visible === String(index + 1);
    put(sun, 'data-v2e008-labelcoh', coherent ? 'ok' : 'incoherent');
    if (!coherent) labelMismatch += 1;
  });
  put(layout, 'data-v2e008-label-mismatch', String(labelMismatch));

  /* V2 E008-05 — Compteur de génération de rendu : un compteur strictement
     croissant, mémorisé sous une clé window dédiée, est estampillé sur la
     disposition et sur chaque soleil. Un nœud capturé dont l'époch diffère de
     celui de la disposition est un nœud périmé, à ne pas réutiliser dans un test. */
  const EPOCH_KEY = '__v2e008_epoch';
  let epoch = 0;
  if (typeof window !== 'undefined') {
    epoch = ((number(window[EPOCH_KEY], 0) | 0) + 1) | 0;
    window[EPOCH_KEY] = epoch;
  }
  put(layout, 'data-v2e008-epoch', String(epoch));
  suns.forEach(sun => put(sun, 'data-v2e008-epoch', String(epoch)));

  /* V2 E008-06 — Contrôle d'appartenance au champ : le centre de chaque soleil
     est comparé au rectangle de .constellation-field. Hors limites, un attribut
     et une classe de contour sont posés (visibles seulement en diagnostic). */
  let outOfBounds = 0;
  const fieldRect = field && typeof field.getBoundingClientRect === 'function'
    ? field.getBoundingClientRect() : null;
  suns.forEach(sun => {
    if (!fieldRect || typeof sun.getBoundingClientRect !== 'function') {
      put(sun, 'data-v2e008-bounds', 'non-mesure');
      return;
    }
    const rect = sun.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const inside = cx >= fieldRect.left && cx <= fieldRect.right
      && cy >= fieldRect.top && cy <= fieldRect.bottom;
    put(sun, 'data-v2e008-bounds', inside ? 'dedans' : 'hors');
    if (inside) sun.classList.remove('v2e008-oob');
    else { outOfBounds += 1; sun.classList.add('v2e008-oob'); }
  });
  put(layout, 'data-v2e008-oob', String(outOfBounds));

  /* V2 E008-07 — Contrat de jeton de couleur : la variable --era posée par la
     vue doit être renseignée sur chaque soleil. On vérifie la présence du jeton,
     pas le contraste visuel, afin de rester déterministe et sans mesure de rendu. */
  let colorMissing = 0;
  suns.forEach(sun => {
    const era = sun.style && typeof sun.style.getPropertyValue === 'function'
      ? sun.style.getPropertyValue('--era') : '';
    const present = !!era && String(era).trim().length > 0;
    put(sun, 'data-v2e008-color', present ? 'present' : 'absent');
    if (!present) colorMissing += 1;
  });
  put(layout, 'data-v2e008-color-missing', String(colorMissing));

  /* V2 E008-08 — Régularité angulaire : les angles des soleils, déduits de
     --x/--y, sont triés et l'écart minimal entre voisins est publié. Complète
     la détection de collision euclidienne de la passe 1 par une assertion de
     répartition circulaire (40° attendus pour 9 ères). Aucune mesure aléatoire. */
  const angles = [];
  suns.forEach(sun => {
    const position = positionOf(sun).split(',');
    const x = number(position[0], NaN);
    const y = number(position[1], NaN);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      angles.push((Math.atan2(y - 50, x - 50) * 180 / Math.PI + 360) % 360);
    }
  });
  let minGap = Infinity;
  if (angles.length > 1) {
    const sorted = angles.slice().sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i += 1) {
      const next = i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + 360;
      minGap = Math.min(minGap, next - sorted[i]);
    }
  }
  const gap = Number.isFinite(minGap) ? minGap.toFixed(2) : 'indisponible';
  put(layout, 'data-v2e008-angle-min', gap);

  /* V2 E008-09 — Panneau de contrat E2E : un <details> natif (aucun aria-pressed,
     aucune touche à réinventer), créé une seule fois, regroupant huit lignes de
     texte lisible. Marqué data-constellation-diagnostic pour le tiroir générique. */
  let panel = layout.querySelector('#v2e008-panel');
  if (!panel) {
    panel = make('details', 'v2e008-panel');
    panel.id = 'v2e008-panel';
    panel.setAttribute('aria-label', 'Contrat E2E V2 — soleils de la constellation');
    panel.setAttribute('data-constellation-diagnostic', '');
    panel.appendChild(make('summary', '', 'Contrat E2E V2 — soleils'));
    [
      'v2e008-line-topologie', 'v2e008-line-selecteurs', 'v2e008-line-onglets',
      'v2e008-line-libelles', 'v2e008-line-epoch', 'v2e008-line-cibles',
      'v2e008-line-angles', 'v2e008-line-stabilite',
    ].forEach(id => {
      const line = make('p');
      line.id = id;
      panel.appendChild(line);
    });
    layout.appendChild(panel);
  }
  const write = (id, text) => {
    const node = layout.querySelector('#' + id);
    if (node) node.textContent = text;
  };
  write('v2e008-line-topologie',
    'Topologie : ' + topology + ' · couches manquantes ' + missingLayers + '.');
  write('v2e008-line-selecteurs',
    'Sélecteurs : ' + testIds.length + ' testids, par exemple ' + (testIds[0] || 'aucun') + '.');
  write('v2e008-line-onglets',
    'Tabulation : ' + tabStops + ' arrêt(s) · ordre ' + (tabOrder.join(' > ') || 'aucun') + '.');
  write('v2e008-line-libelles',
    'Libellés visibles : ' + labelMismatch + ' incohérence(s) sur ' + suns.length + '.');
  write('v2e008-line-epoch', 'Génération de rendu : ' + epoch + '.');

  /* V2 E008-10 — Signature de stabilité inter-rendus : la concaténation ordonnée
     des testids, clés, positions et états actifs est comparée à celle du rendu
     précédent, mémorisée sous une clé window dédiée. « 1 » = stable, « 0 » =
     dérive, « premier » = premier passage. Le mouvement réduit est couplé à la
     classe v2e008-calm et à l'attribut data-v2e008-motion, sans boucle propre. */
  const SNAP_KEY = '__v2e008_snapshot';
  const snapshot = suns.map((sun, index) => [
    testIds[index] || index,
    read(sun, 'data-const-key') || '',
    positionOf(sun),
    read(sun, 'aria-current') || '',
  ].join('|')).join(';');
  let stable = 'premier';
  if (typeof window !== 'undefined') {
    const previous = window[SNAP_KEY];
    stable = previous === undefined ? 'premier' : (previous === snapshot ? '1' : '0');
    window[SNAP_KEY] = snapshot;
  }
  put(layout, 'data-v2e008-stable', stable);

  let reduce = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduce = !!ctx.reducedMotion(); } catch (error) { reduce = false; }
  }
  put(layout, 'data-v2e008-motion', reduce ? 'reduce' : 'complet');
  if (reduce) layout.classList.add('v2e008-calm');
  else layout.classList.remove('v2e008-calm');

  write('v2e008-line-cibles',
    'Hors champ : ' + outOfBounds + ' · jetons couleur absents : ' + colorMissing + '.');
  write('v2e008-line-angles', 'Écart angulaire minimal : ' + gap + '°.');
  write('v2e008-line-stabilite',
    'Stabilité : ' + stable + ' · mouvement ' + (reduce ? 'réduit' : 'complet') + '.');
});
