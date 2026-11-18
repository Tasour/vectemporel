import { register } from './registry.js';

/* Lentille E032 — Performance de rendu appliquée aux arêtes du graphe de la
 * vue Constellation. Dix chantiers concrets (E032-01 … E032-10), tous
 * implémentés. La lentille ne réécrit aucune géométrie calculée par
 * constellation.js : elle mesure, classe et pilote le coût de peinture des
 * traits (svg.constellation-edges > line.const-edge) à partir d'un unique
 * instantané de lecture.
 *
 * Contrat : un seul appel `register` avec l'identifiant E032 et une fonction
 * ctx = { viewId, stage, layout,
 * css(id, rules), el(tag, cls, text), reducedMotion() } (registry.js:28-44).
 * Zéro journalisation, zéro réseau, zéro aléa, zéro minuteur, zéro boucle
 * d'animation propre, zéro ressource distante. Une seule feuille CSS, un seul
 * enregistrement, aucun fichier partagé modifié.
 */

const CSS_ID = 'constellation-e032';
const HUD_ID = 'e032-hud';
const BUDGET = 64; /* arêtes au-delà desquelles on bascule en mode compact */

/* État local du module : déterministe, conservé entre les rendus successifs. */
let rendus = 0;
let signaturePrecedente = null;
let survolHooked = false;
let derniereCible = null;

/* Exécution défensive : un chantier défaillant ne neutralise pas les autres. */
function safe(fn) {
  try { fn(); } catch (error) { /* silence voulu : aucune journalisation */ }
}

/* Empreinte FNV-1a 32 bits, sans aléa ni horloge. */
function empreinte(source) {
  let h = 0x811c9dc5;
  for (let i = 0; i < source.length; i += 1) {
    h ^= source.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/* Un seul écouteur délégué, installé une seule fois (E032-09). */
function surLigneSurvollee(event) {
  const source = event && event.target;
  if (!source || typeof source.closest !== 'function') return;
  const ligne = source.closest('line.const-edge');
  if (!ligne) return;
  if (derniereCible && derniereCible !== ligne &&
      typeof derniereCible.removeAttribute === 'function') {
    derniereCible.removeAttribute('data-e032-hover');
  }
  ligne.setAttribute('data-e032-hover', '1');
  derniereCible = ligne;
  const hote = typeof ligne.closest === 'function'
    ? ligne.closest('.constellation-layout') : null;
  if (hote && typeof hote.setAttribute === 'function') {
    hote.dataset.e032Hover = ligne.getAttribute('data-e032-index') || '?';
  }
}

register('E032', (ctx) => {
  const { viewId, layout, css, el, reducedMotion } = ctx || {};

  /* Garde d'entrée : aucun ajout DOM, y compris la feuille dans <head>, tant
   * que ctx.layout n'est pas exploitable. Greffon tolérant aux ctx partiels. */
  if (!layout || typeof layout.querySelectorAll !== 'function') return;
  if (typeof viewId === 'string' && viewId !== 'constellation') return;

  let reduit = false;
  try { reduit = !!(typeof reducedMotion === 'function' && reducedMotion()); }
  catch (error) { reduit = false; }

  /* Lecture unique : un seul instantané avant toute écriture. */
  const svg = safe(() => layout.querySelector('svg.constellation-edges')) || null;
  const noeuds = svg && typeof svg.querySelectorAll === 'function'
    ? Array.from(svg.querySelectorAll('line.const-edge')) : [];
  const instantane = noeuds.map((ligne, index) => {
    const nombre = (nom) => {
      const brut = typeof ligne.getAttribute === 'function' ? ligne.getAttribute(nom) : '';
      const valeur = Number.parseFloat(brut);
      return Number.isFinite(valeur) ? valeur : 0;
    };
    return {
      node: ligne,
      index,
      x1: nombre('x1'), y1: nombre('y1'),
      x2: nombre('x2'), y2: nombre('y2'),
      chemin: typeof ligne.classList === 'object' && ligne.classList.contains('is-path'),
      lune: typeof ligne.classList === 'object' && ligne.classList.contains('is-moon'),
    };
  });
  const total = instantane.length;
  rendus += 1;

  /* E032-01 — Instantané de lecture : le nombre d'arêtes est publié en une
     seule passe, sans re-interroger le DOM par la suite. */
  layout.dataset.e032EdgeCount = String(total);

  /* E032-02 — Signature géométrique : empreinte FNV-1a des coordonnées,
     témoin déterministe de stabilité entre deux rendus successifs. */
  safe(() => {
    const source = instantane.map((a) =>
      `${a.x1},${a.y1},${a.x2},${a.y2},${a.chemin ? 1 : 0},${a.lune ? 1 : 0}`).join('|');
    const signature = empreinte(source);
    const stable = signaturePrecedente === null || signaturePrecedente === signature;
    layout.dataset.e032Signature = signature;
    layout.dataset.e032Stable = stable ? '1' : '0';
    signaturePrecedente = signature;
  });

  /* E032-03 — Tri par lots de style : chaque arête reçoit un seau (`path`,
     `moon` ou `base`) afin que le navigateur mutualise les changements de
     pinceau au lieu de recalculer un style par trait. */
  safe(() => {
    instantane.forEach((a) => {
      a.node.setAttribute('data-e032-index', String(a.index));
      a.node.dataset.e032Bucket = a.chemin ? 'path' : (a.lune ? 'moon' : 'base');
    });
    const pathCount = instantane.filter((a) => a.node.dataset.e032Bucket === 'path').length;
    const moonCount = instantane.filter((a) => a.node.dataset.e032Bucket === 'moon').length;
    layout.dataset.e032Lots = `${pathCount}/${moonCount}`;
  });

  /* E032-04 — Isolation de la couche : une classe unique sur le SVG active
     confinement de peinture et précision géométrique (voir la feuille CSS). */
  safe(() => {
    if (svg && typeof svg.classList !== 'object') return;
    if (svg) svg.classList.add('e032-edges');
    if (svg) svg.dataset.e032Isolated = '1';
  });

  /* E032-05 — Mouvement réduit : on pose un marqueur sur le layout quand
     reducedMotion() le demande ; la feuille supprime alors tout effet coûteux
     sur les arêtes sans toucher aux décisions de la vue. */
  safe(() => {
    if (reduit) layout.classList.add('e032-reduit');
    else layout.classList.remove('e032-reduit');
    layout.dataset.e032Reduced = reduit ? '1' : '0';
  });

  /* E032-06 — Élagage des traits dégénérés : longueur nulle ou coordonnées
     hors du viewBox 0–100. Marqués, ils sont masqués en CSS (moins de paint). */
  safe(() => {
    let degeneres = 0;
    instantane.forEach((a) => {
      const nul = a.x1 === a.x2 && a.y1 === a.y2;
      const hors = [a.x1, a.y1, a.x2, a.y2].some((v) => v < 0 || v > 100);
      if (nul || hors) {
        a.node.dataset.e032Degenerate = '1';
        degeneres += 1;
      }
    });
    layout.dataset.e032Degenerate = String(degeneres);
  });

  /* E032-07 — Déduplication des tracés : deux arêtes de mêmes extrémités
     sont redondantes ; on ne garde que la première, les autres sont masquées
     pour réduire le surpeinture (overdraw). */
  safe(() => {
    const vus = new Set();
    let doublons = 0;
    instantane.forEach((a) => {
      const cle = [a.x1, a.y1, a.x2, a.y2].map((v) => v.toFixed(2)).join(';');
      if (vus.has(cle)) {
        a.node.dataset.e032Dup = '1';
        doublons += 1;
      } else {
        vus.add(cle);
      }
    });
    layout.dataset.e032Duplicates = String(doublons);
  });

  /* E032-08 — Halo de mesure : un unique nœud live, attaché au layout,
     annonce les métriques sans jamais journaliser. */
  safe(() => {
    if (typeof el !== 'function') return;
    let hud = null;
    try { hud = layout.querySelector(`#${HUD_ID}`); } catch (error) { hud = null; }
    if (!hud) {
      hud = el('p', 'e032-hud');
      hud.id = HUD_ID;
      layout.appendChild(hud);
    }
    hud.setAttribute('role', 'status');
    hud.setAttribute('aria-live', 'polite');
    hud.setAttribute('aria-atomic', 'true');
    hud.textContent = `E032 · arêtes ${total} · lots ${layout.dataset.e032Lots || '—'} · ` +
      `dégénérées ${layout.dataset.e032Degenerate || '0'} · doublons ` +
      `${layout.dataset.e032Duplicates || '0'} · signature ${layout.dataset.e032Signature || '—'} · ` +
      `stable ${layout.dataset.e032Stable === '1' ? 'oui' : 'non'} · ` +
      `mode ${layout.dataset.e032Mode || '—'} · budget ${layout.dataset.e032Budget || '—'} · ` +
      `mouvement réduit ${reduit ? 'oui' : 'non'} · rendus ${rendus}.`;
  });

  /* E032-09 — Délégation de survol : un seul écouteur de capture pour toutes
     les arêtes, au lieu d'un par trait ; l'arête visée est marquée en attribut
     et le HUD reflète son index. */
  safe(() => {
    if (typeof document === 'undefined' || survolHooked) return;
    survolHooked = true;
    document.addEventListener('pointerover', surLigneSurvollee, true);
  });

  /* E032-10 — Décision de budget : au-delà de 64 arêtes, on bascule en mode
     compact (shape-rendering: optimizeSpeed, cf. CSS) plutôt que de multiplier
     les effets de trait ; la décision est exposée en attribut. */
  safe(() => {
    const compact = total > BUDGET;
    layout.dataset.e032Budget = compact ? 'depasse' : 'ok';
    layout.dataset.e032Mode = compact ? 'compact' : 'detaille';
    if (svg && typeof svg.classList === 'object') {
      if (compact) svg.classList.add('e032-compact');
      else svg.classList.remove('e032-compact');
    }
  });

  /* Feuille unique, portée à la vue, injectée une seule fois par cssOnce. */
  safe(() => {
    if (typeof css !== 'function') return;
    css(CSS_ID, `
  /* E032-04 — Confinement de la couche d'arêtes : la peinture du SVG est
     isolée du reste du champ, la géométrique reste nette. */
  .constellation-edges.e032-edges {
    contain: layout paint style;
    shape-rendering: geometricPrecision;
  }
  /* E032-09 — Ligne survolable malgré le pointeur désactivé sur le SVG ; le
     survol ne modifie aucun état applicatif, seulement le pinceau. */
  .constellation-edges.e032-edges line.const-edge { pointer-events: stroke; }
  .constellation-edges.e032-edges line.const-edge[data-e032-hover="1"] {
    stroke: var(--gold-bright);
    stroke-width: 2.4;
  }
  /* E032-06 / E032-07 — Traits dégénérés et doublons retirés du calcul de
     peinture, sans être supprimés du DOM d'origine. */
  .constellation-edges.e032-edges line[data-e032-degenerate="1"],
  .constellation-edges.e032-edges line[data-e032-dup="1"] { display: none; }
  /* E032-10 — Mode compact : on privilégie la vitesse de tracé à la finesse
    lorsque le budget d'arêtes est dépassé. */
  .constellation-edges.e032-edges.e032-compact line.const-edge {
    shape-rendering: optimizeSpeed;
  }
  /* E032-05 — Aucun effet animé coûteux quand l'utilisateur demande moins
     de mouvement ; les transitions d'arêtes sont purement supprimées. */
  .constellation-layout.e032-reduit .constellation-edges line.const-edge {
    transition: none;
    animation: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .constellation-edges line.const-edge { transition: none; animation: none; }
  }
  /* E032-08 — Halo de mesure, discret et lisible sans couleur seule. */
  #${HUD_ID} {
    margin: 8px 0 0;
    padding: 6px 9px;
    border: 1px solid var(--line);
    border-radius: 6px;
    color: var(--muted-2);
    font-size: 9px;
    line-height: 1.5;
    font-variant-numeric: tabular-nums;
  }
  @media (forced-colors: active) {
    #${HUD_ID} { border-color: CanvasText; color: CanvasText; }
    .constellation-edges line.const-edge[data-e032-hover="1"] { stroke: Highlight; }
  }
    `);
  });
});
