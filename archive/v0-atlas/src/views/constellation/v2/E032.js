import { register } from './registry.js';

/* Lentille V2 E032 — performance de rendu des arêtes du graphe, seconde passe.
   Elle complète la passe 1 sans la dupliquer : coût de peinture, ordonnancement,
   cache d'invalidation, plafond de traits, remplissage et congestion. Tous les
   identifiants, classes et données portent le préfixe exclusif v2e032.
   Zéro journalisation, zéro réseau, zéro aléa, zéro minuteur, zéro boucle propre. */

const CSS_ID = 'constellation-v2-e032';
const PANEL_ID = 'v2e032-panel';
const PLAFOND = 160;      /* traits au-delà desquels la peinture est différée */
const COUT_REF = 60;      /* score de coût de référence, sur 100 */
const EMPHASE_REF = 0.25; /* part maximale de traits mis en évidence */
const RAYON_CENTRE = 1.5; /* distance au centre (50,50), en unités de viewBox */

/* État local déterministe, conservé entre les rendus successifs. */
let rendus = 0;
let clePrecedente = null;
let aggregatsPrecedents = null;
let cacheHits = 0;

/* Exécution défensive : un chantier défaillant ne neutralise pas les autres. */
function safe(fn) {
  try { fn(); } catch (error) { /* silence voulu : aucune journalisation */ }
}

/* Lecture tolérante d'un attribut numérique d'une arête. */
function nombre(ligne, nom) {
  const brut = typeof ligne.getAttribute === 'function' ? ligne.getAttribute(nom) : '';
  const valeur = Number.parseFloat(brut);
  return Number.isFinite(valeur) ? valeur : 0;
}

/* Distance d'un point à un segment : sert à repérer la congestion au centre. */
function distanceSegment(a, px, py) {
  const dx = a.x2 - a.x1;
  const dy = a.y2 - a.y1;
  const carre = dx * dx + dy * dy;
  if (carre === 0) return Math.hypot(px - a.x1, py - a.y1);
  let t = ((px - a.x1) * dx + (py - a.y1) * dy) / carre;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (a.x1 + t * dx), py - (a.y1 + t * dy));
}

/* Clé de travail : somme pondérée des coordonnées, sans horloge ni aléa. */
function cleTravail(instantane) {
  let cle = 0;
  instantane.forEach((a, i) => {
    const poids = (i % 7) + 1;
    cle = (cle + poids * (a.x1 * 13 + a.y1 * 7 + a.x2 * 3 + a.y2)) % 1000000007;
  });
  return cle.toFixed(3);
}

/* Agrégats de peinture, calculés une seule fois par géométrie distincte. */
function calculerAggregats(instantane) {
  let encre = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let traversees = 0;
  let emphase = 0;
  instantane.forEach((a) => {
    encre += Math.hypot(a.x2 - a.x1, a.y2 - a.y1);
    minX = Math.min(minX, a.x1, a.x2);
    minY = Math.min(minY, a.y1, a.y2);
    maxX = Math.max(maxX, a.x1, a.x2);
    maxY = Math.max(maxY, a.y1, a.y2);
    if (distanceSegment(a, 50, 50) <= RAYON_CENTRE) traversees += 1;
    if (a.chemin) emphase += 1;
  });
  const total = instantane.length;
  const vide = total === 0;
  return {
    total,
    encre,
    parTrait: vide ? 0 : encre / total,
    extent: vide ? '0;0;0;0'
      : `${minX.toFixed(1)};${minY.toFixed(1)};${maxX.toFixed(1)};${maxY.toFixed(1)}`,
    remplissage: vide ? 0 : ((maxX - minX) * (maxY - minY)) / 100,
    traversees,
    emphase,
  };
}

/* Score composite borné à 100 : nombre, encre, emphase et congestion. */
function scoreCout(agg) {
  const parties = [
    Math.min(40, agg.total * 0.5),
    Math.min(30, agg.parTrait * 0.5),
    Math.min(20, agg.emphase * 1.5),
    Math.min(10, agg.traversees),
  ];
  return Math.round(parties.reduce((somme, valeur) => somme + valeur, 0));
}

register('E032', ctx => {
  /* Garde d'entrée obligatoire : aucun ajout au DOM sans layout exploitable. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique de la lentille, installée une seule fois par cssOnce. */
  safe(() => css(CSS_ID, `
  /* v2e032-03 — ordre de peinture : extrémités de trait sobres et prédictibles. */
  .constellation-edges.v2e032-edges line.const-edge { stroke-linecap: butt; }
  /* v2e032-05 / v2e032-06 — traits différés et quasi-doublons retirés de la
     peinture, sans modification de l'arbre d'origine. */
  .constellation-edges.v2e032-edges line[data-v2e032-deferre="1"],
  .constellation-edges.v2e032-edges line[data-v2e032-quasi-dup="1"] { display: none; }
  /* v2e032-08 — congestion au centre : intensité réduite, l'information reste
     portée par l'attribut et non par la seule couleur. */
  .constellation-edges.v2e032-edges line[data-v2e032-centre="1"] { stroke-opacity: .45; }
  /* v2e032-02 / v2e032-09 — en cas de coût élevé ou d'emphase trop dense, on
     réduit la largeur des traits mis en évidence, sans ajouter d'effet. */
  .constellation-edges.v2e032-edges.v2e032-lourd line.is-path,
  .constellation-edges.v2e032-edges.v2e032-emphase-dense line.is-path { stroke-width: 1.2; }
  /* v2e032-10 — panneau de synthèse, lisible et annoncé sans dépendre d'une couleur. */
  .v2e032-panel {
    margin: 8px 0 0; padding: 6px 9px;
    border: 1px solid var(--line); border-radius: 6px;
    color: var(--muted-2); font-size: 9px; line-height: 1.5;
    font-variant-numeric: tabular-nums;
  }
  @media (forced-colors: active) {
    .v2e032-panel { border-color: CanvasText; color: CanvasText; }
  }
  `));

  /* Lecture unique : un seul instantané avant toute écriture. */
  const svg = safe(() => layout.querySelector('svg.constellation-edges')) || null;
  const noeuds = svg && typeof svg.querySelectorAll === 'function'
    ? Array.from(svg.querySelectorAll('line.const-edge')) : [];
  const instantane = noeuds.map((node, index) => ({
    node,
    index,
    x1: nombre(node, 'x1'), y1: nombre(node, 'y1'),
    x2: nombre(node, 'x2'), y2: nombre(node, 'y2'),
    chemin: !!(node.classList && node.classList.contains('is-path')),
    lune: !!(node.classList && node.classList.contains('is-moon')),
  }));
  rendus += 1;

  /* Le calcul d'agrégats est pur : il ne touche pas au DOM et ne peut échouer
     sur un instantané vide. Le cache sert uniquement à éviter de le refaire. */
  const cle = cleTravail(instantane);
  const fromCache = clePrecedente === cle && !!aggregatsPrecedents;
  const agg = fromCache ? aggregatsPrecedents : calculerAggregats(instantane);
  if (fromCache) cacheHits += 1;
  else {
    clePrecedente = cle;
    aggregatsPrecedents = agg;
  }

  /* E032-01 — Budget d'encre : longueur totale des traits et moyenne par trait,
     deux mesures de coût de peinture issues du même instantané. */
  safe(() => {
    layout.dataset.v2e032Ink = agg.encre.toFixed(1);
    layout.dataset.v2e032InkPerEdge = agg.parTrait.toFixed(2);
    layout.dataset.v2e032EdgeCount = String(agg.total);
    if (svg && typeof svg.classList === 'object') svg.classList.add('v2e032-edges');
  });

  /* E032-02 — Score de coût composite, borné et comparé à une référence fixe. */
  safe(() => {
    const score = scoreCout(agg);
    layout.dataset.v2e032Cost = String(score);
    layout.dataset.v2e032CostRef = String(COUT_REF);
    if (svg && typeof svg.classList === 'object') {
      if (score > COUT_REF) svg.classList.add('v2e032-lourd');
      else svg.classList.remove('v2e032-lourd');
    }
  });

  /* E032-03 — Ordonnancement de peinture : base, puis chemin, puis lune. Les
     traits mis en évidence sont peints en dernier, donc au-dessus des autres. */
  safe(() => {
    if (!svg || typeof svg.appendChild !== 'function') return;
    const seaux = { base: [], path: [], moon: [] };
    instantane.forEach((a) => {
      const seau = a.lune ? 'moon' : (a.chemin ? 'path' : 'base');
      a.node.dataset.v2e032Ordre = seau;
      seaux[seau].push(a.node);
    });
    seaux.base.concat(seaux.path, seaux.moon).forEach(node => svg.appendChild(node));
    layout.dataset.v2e032Zorder =
      `${seaux.base.length}/${seaux.path.length}/${seaux.moon.length}`;
  });

  /* E032-04 — Cache d'agrégats : une clé de travail identique réutilise les
     valeurs précédentes ; le nombre de réutilisations est publié et mesurable. */
  safe(() => {
    layout.dataset.v2e032Cache = fromCache ? 'hit' : 'miss';
    layout.dataset.v2e032CacheHits = String(cacheHits);
    if (svg) svg.dataset.v2e032WorkKey = cle;
  });

  /* E032-05 — Plafond de traits : au-delà de 160 arêtes, les suivantes sont
     différées de façon déterministe (par index), jamais selon une heuristique
     temporelle ou aléatoire. */
  safe(() => {
    let deferrees = 0;
    instantane.forEach((a, i) => {
      if (i >= PLAFOND) {
        a.node.dataset.v2e032Deferre = '1';
        deferrees += 1;
      }
    });
    layout.dataset.v2e032Cap = String(PLAFOND);
    layout.dataset.v2e032Deferrees = String(deferrees);
  });

  /* E032-06 — Quasi-doublons angulaires : même origine, même angle et même
     longueur approximatifs. Plus précis qu'une égalité exacte d'extrémités. */
  safe(() => {
    const vus = new Set();
    let quasi = 0;
    instantane.forEach((a) => {
      const origine = `${a.x1.toFixed(1)};${a.y1.toFixed(1)}`;
      const angle = Math.round(Math.atan2(a.y2 - a.y1, a.x2 - a.x1) * 180 / Math.PI * 2) / 2;
      const longueur = Math.round(Math.hypot(a.x2 - a.x1, a.y2 - a.y1) * 2) / 2;
      const cleDoublon = `${origine}|${angle}|${longueur}`;
      if (vus.has(cleDoublon)) {
        a.node.dataset.v2e032QuasiDup = '1';
        quasi += 1;
      } else {
        vus.add(cleDoublon);
      }
    });
    layout.dataset.v2e032QuasiDoubles = String(quasi);
  });

  /* E032-07 — Empreinte spatiale : boîte englobante et taux de remplissage du
     champ, deux indications de l'étendue réellement repeinte. */
  safe(() => {
    layout.dataset.v2e032Extent = agg.extent;
    layout.dataset.v2e032Remplissage = `${agg.remplissage.toFixed(1)}%`;
    if (svg) svg.dataset.v2e032Extent = agg.extent;
  });

  /* E032-08 — Congestion au centre : un trait passant à moins de 1,5 unité du
     centre est marqué et atténué ; le compte est publié sur le layout. */
  safe(() => {
    let traversees = 0;
    instantane.forEach((a) => {
      if (distanceSegment(a, 50, 50) <= RAYON_CENTRE) {
        a.node.dataset.v2e032Centre = '1';
        traversees += 1;
      }
    });
    layout.dataset.v2e032TraverseesCentre = String(traversees);
  });

  /* E032-09 — Budget d'emphase : trop de traits épais coûtent cher et nuisent
     à la hiérarchie visuelle ; au-delà de 25 %, on réduit leur largeur. */
  safe(() => {
    const total = agg.total;
    const part = total ? agg.emphase / total : 0;
    layout.dataset.v2e032Emphase = total ? `${agg.emphase}/${total}` : '0/0';
    layout.dataset.v2e032EmphasePart = `${(part * 100).toFixed(1)}%`;
    if (svg && typeof svg.classList === 'object') {
      if (part > EMPHASE_REF) svg.classList.add('v2e032-emphase-dense');
      else svg.classList.remove('v2e032-emphase-dense');
    }
  });

  /* E032-10 — Panneau de synthèse accessible : unique, créé seulement s'il
     manque, avec role="status" et aria-live="polite" en français. */
  safe(() => {
    if (typeof ctx.el !== 'function') return;
    let panneau = null;
    try { panneau = layout.querySelector(`#${PANEL_ID}`); } catch (error) { panneau = null; }
    if (!panneau) {
      panneau = ctx.el('p', 'v2e032-panel', '');
      panneau.id = PANEL_ID;
      layout.appendChild(panneau);
    }
    panneau.setAttribute('role', 'status');
    panneau.setAttribute('aria-live', 'polite');
    panneau.setAttribute('aria-atomic', 'true');
    panneau.textContent =
      `E032 V2 — arêtes ${layout.dataset.v2e032EdgeCount || '0'} · ` +
      `encre ${layout.dataset.v2e032Ink || '0.0'} (${layout.dataset.v2e032InkPerEdge || '0.00'} par trait) · ` +
      `coût ${layout.dataset.v2e032Cost || '0'}/100 pour ${COUT_REF} de référence · ` +
      `ordre ${layout.dataset.v2e032Zorder || '0/0/0'} · ` +
      `cache ${layout.dataset.v2e032Cache || 'miss'} (${layout.dataset.v2e032CacheHits || '0'} réutilisations) · ` +
      `différés ${layout.dataset.v2e032Deferrees || '0'} · ` +
      `quasi-doubles ${layout.dataset.v2e032QuasiDoubles || '0'} · ` +
      `remplissage ${layout.dataset.v2e032Remplissage || '0.0%'} · ` +
      `traversées du centre ${layout.dataset.v2e032TraverseesCentre || '0'} · ` +
      `emphase ${layout.dataset.v2e032Emphase || '0/0'} · rendus ${rendus}.`;
  });
});
