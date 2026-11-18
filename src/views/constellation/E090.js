import { register } from './registry.js';

/* Lentille E090 — Mouvement et transitions appliqués au chemin de connexion
 * de la vue Constellation.
 *
 * Le « chemin de connexion » est la chaîne ordonnée des arêtes actives du SVG
 * `.constellation-edges` (constellation.js:246-252) : les droites portant la
 * classe `is-path` relient le soleil de l'ère active à la planète active, puis
 * la planète active à la lune active (addLine, constellation.js:175-183). Cette
 * lentille n'altère ni la géométrie produite par `renderConstellation`, ni le
 * store : elle observe le chemin, le mesure, le marque et lui applique un
 * mouvement purement CSS (tracé progressif, transition de teinte, flux continu,
 * respiration des jonctions). Aucun minuteur, aucune boucle rAF propre, aucune
 * horloge, aucun aléa, aucun appel réseau, aucune écriture dans la console.
 *
 * Contrat : register('E090', ctx => {...}) avec
 * ctx = { viewId, stage, layout, css(id, rules), el(tag, cls, text), reducedMotion() }
 * (registry.js:28-44). La garde d'entrée précède tout ajout DOM. Une seule
 * feuille de style est injectée, via un seul appel `ctx.css('constellation-e090', …)`.
 * Tous les identifiants et attributs sont préfixés `e090-`.
 */

const CSS_ID = 'constellation-e090';
const STATUS_ID = 'e090-motion-status';
const JOINT_PREFIX = 'e090-joint-';

/* État local du module : déterministe, conservé entre les rendus successifs. */
let rendus = 0;
let transitions = 0;
let empreintePrecedente = null;
let empreinteInitiale = null;
let ecouteurInstalle = false;

/* Toutes les règles dans une seule chaîne : un seul appel à ctx.css. */
const CSS = `
/* E090-05 — Tracé progressif du chemin : pathLength=1 posé en JS, révélation
   par stroke-dashoffset avec décalage indexé sur --e090-index. */
.constellation-layout .constellation-edges line[data-e090-trace="1"] {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: e090-trace 900ms cubic-bezier(.22,.61,.36,1) both;
  animation-delay: calc(var(--e090-index, 0) * 140ms);
}
@keyframes e090-trace { to { stroke-dashoffset: 0; } }

/* E090-06 — Transition de teinte du chemin actif, pilotée par data-e090-active. */
.constellation-layout .constellation-edges line {
  transition: stroke 260ms ease, stroke-width 260ms ease,
              stroke-opacity 260ms ease, opacity 260ms ease;
}
.constellation-layout .constellation-edges line[data-e090-active="1"] {
  stroke: rgba(255, 226, 160, .95);
  stroke-width: 2.2;
  stroke-opacity: 1;
  opacity: 1;
}
.constellation-layout .constellation-edges line[data-e090-active="0"] {
  stroke-opacity: .45;
}

/* E090-07 — Flux continu le long du chemin actif (dashes mobiles). */
.constellation-layout .constellation-edges line[data-e090-flux="1"] {
  stroke-dasharray: .14 .10;
  stroke-linecap: round;
  animation: e090-flux 1600ms linear infinite 900ms;
}
@keyframes e090-flux { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }

/* E090-08 — Marqueurs de jonction aux extrémités du chemin. */
.constellation-layout .e090-joint {
  position: absolute;
  width: 7px; height: 7px;
  margin: 0; padding: 0;
  border: 1px solid rgba(255, 232, 178, .9);
  border-radius: 50%;
  background: rgba(255, 226, 160, .35);
  transform: translate(-50%, -50%);
  pointer-events: none;
  animation: e090-joint-pulse 2200ms ease-in-out infinite alternate;
}
@keyframes e090-joint-pulse {
  from { box-shadow: 0 0 0 0 rgba(255, 226, 160, .35); opacity: .7; }
  to   { box-shadow: 0 0 0 4px rgba(255, 226, 160, 0); opacity: 1; }
}

/* E090-09 — Panneau témoin de mouvement, sobre et accessible. */
.constellation-layout #${STATUS_ID} {
  margin: 10px 0 0;
  padding: 6px 9px;
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--muted-2);
  font-size: 9px;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
}

/* Respect de prefers-reduced-motion : aucun mouvement, sans écouteur JS. */
@media (prefers-reduced-motion: reduce) {
  .constellation-layout .constellation-edges line,
  .constellation-layout .e090-joint {
    transition: none !important;
    animation: none !important;
  }
}
.constellation-layout[data-e090-reduced="1"] .constellation-edges line,
.constellation-layout[data-e090-reduced="1"] .e090-joint {
  transition: none !important;
  animation: none !important;
}`;

/* Exécution défensive : un chantier défaillant ne neutralise pas les autres. */
function safe(fn) {
  try { fn(); } catch (error) { /* silence voulu : aucune écriture dans la console */ }
}

/* Empreinte FNV-1a 32 bits : identifiant de version déterministe, sans aléa. */
function empreinte(source) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/* Lecture unique des arêtes : une seule passe avant toute écriture. */
function lireAretes(layout) {
  const noeuds = layout.querySelectorAll('.constellation-edges line.const-edge');
  return Array.prototype.map.call(noeuds, (node, index) => ({
    node,
    index,
    x1: Number(node.getAttribute('x1')) || 0,
    y1: Number(node.getAttribute('y1')) || 0,
    x2: Number(node.getAttribute('x2')) || 0,
    y2: Number(node.getAttribute('y2')) || 0,
    chemin: node.classList.contains('is-path'),
    lune: node.classList.contains('is-moon'),
  }));
}

/* Un seul écouteur de capture, installé une seule fois pour toute la session. */
function surChangementChemin(event) {
  if (!event || !event.target || typeof event.target.closest !== 'function') return;
  const noeud = event.target.closest('.const-sun, .const-planet, .const-moon');
  if (!noeud) return;
  transitions += 1;
  noeud.dataset.e090Clicked = '1';
}

register('E090', (ctx) => {
  /* Garde d'entrée : aucun ajout DOM tant que ctx.layout n'est pas exploitable. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const layout = ctx.layout;
  const field = layout.querySelector('.constellation-field') || layout;
  const reduit = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;

  /* E090-01 — Instantané du chemin : mesure ordonnée des segments actifs. */
  const aretes = lireAretes(layout);
  const chemin = aretes.filter((a) => a.chemin);
  const segments = chemin.map((a) => ({
    ...a,
    longueur: Math.hypot(a.x2 - a.x1, a.y2 - a.y1),
  }));
  const cumul = segments.reduce((total, s) => total + s.longueur, 0);
  rendus += 1;
  layout.dataset.e090AreteCount = String(aretes.length);
  layout.dataset.e090SegmentCount = String(segments.length);
  layout.dataset.e090Longueur = cumul.toFixed(2);

  /* E090-02 — Miroir géométrique : rôle, longueur et angle sur chaque arête. */
  safe(() => {
    aretes.forEach((a) => {
      a.node.dataset.e090Role = a.chemin ? 'chemin' : a.lune ? 'lune' : 'libre';
      a.node.dataset.e090Length = Math.hypot(a.x2 - a.x1, a.y2 - a.y1).toFixed(2);
      a.node.dataset.e090Angle = (Math.atan2(a.y2 - a.y1, a.x2 - a.x1) * 180 / Math.PI).toFixed(1);
      if (a.chemin) a.node.setAttribute('pathLength', '1');
    });
    layout.dataset.e090Mirror = '1';
  });

  /* E090-03 — Marquage du chemin actif et de sa direction de parcours. */
  safe(() => {
    const actives = new Set(chemin.map((a) => a.node));
    aretes.forEach((a) => {
      a.node.dataset.e090Active = actives.has(a.node) ? '1' : '0';
      a.node.dataset.e090Dir = a.x2 >= a.x1 ? 'sortant' : 'entrant';
    });
    layout.dataset.e090Direction = segments.length
      ? (segments[0].x2 >= segments[0].x1 ? 'centrifuge' : 'centripete') : 'aucune';
  });

  /* E090-04 — Écouteur de capture : comptage des changements de chemin. */
  safe(() => {
    if (typeof document !== 'undefined' && !ecouteurInstalle) {
      ecouteurInstalle = true;
      document.addEventListener('click', surChangementChemin, true);
    }
    layout.dataset.e090Transitions = String(transitions);
  });

  /* E090-05 — Tracé progressif : index de décalage posé sur les segments. */
  safe(() => {
    segments.forEach((s, i) => {
      s.node.style.setProperty('--e090-index', String(i));
      s.node.dataset.e090Trace = '1';
    });
    layout.dataset.e090Trace = String(segments.length);
  });

  /* E090-06 — Transition de teinte : état publié et feuille unique injectée.
     Un seul appel ctx.css, une seule feuille portée par la vue. */
  safe(() => {
    layout.dataset.e090Tone = segments.length ? 'actif' : 'neutre';
    layout.dataset.e090ActiveCount = String(segments.length);
    ctx.css(CSS_ID, CSS);
  });

  /* E090-07 — Flux continu : le dernier segment (vers la lune) porte le flux. */
  safe(() => {
    let flux = 0;
    segments.forEach((s) => {
      const terminal = s === segments[segments.length - 1];
      if (terminal) { s.node.dataset.e090Flux = '1'; flux += 1; }
      else { s.node.dataset.e090Flux = '0'; }
    });
    layout.dataset.e090Flux = String(flux);
  });

  /* E090-08 — Marqueurs de jonction : un point par extrémité de segment actif. */
  safe(() => {
    segments.forEach((s, i) => {
      const id = `${JOINT_PREFIX}${i}`;
      let joint = layout.querySelector(`#${id}`);
      if (!joint) {
        joint = ctx.el('span', 'e090-joint');
        joint.id = id;
        joint.setAttribute('aria-hidden', 'true');
        field.appendChild(joint);
      }
      joint.style.left = `${s.x1.toFixed(2)}%`;
      joint.style.top = `${s.y1.toFixed(2)}%`;
    });
    layout.dataset.e090Joints = String(segments.length);
  });

  /* E090-09 — Panneau témoin de mouvement : région live unique, sans doublon. */
  let status = null;
  safe(() => {
    status = layout.querySelector(`#${STATUS_ID}`);
    if (!status) {
      status = ctx.el('p', 'e090-status');
      status.id = STATUS_ID;
      layout.appendChild(status);
    }
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
  });

  /* E090-10 — Empreinte de mouvement et relevé consolidé. */
  safe(() => {
    layout.dataset.e090Reduced = reduit ? '1' : '0';
    const source = segments.map((s) =>
      `${s.x1},${s.y1},${s.x2},${s.y2},${s.longueur.toFixed(2)}`).join('|')
      + `#${transitions}#${reduit ? 1 : 0}`;
    const version = empreinte(source);
    const stable = empreintePrecedente === null || empreintePrecedente === version;
    if (empreinteInitiale === null) empreinteInitiale = version;
    empreintePrecedente = version;
    layout.dataset.e090Fingerprint = version;
    layout.dataset.e090Stable = stable ? '1' : '0';
    layout.dataset.e090Renders = String(rendus);
    layout.dataset.e090Changed = version === empreinteInitiale ? '0' : '1';

    if (status) {
      status.textContent = `E090 · chemin ${segments.length} segment${segments.length > 1 ? 's' : ''}`
        + ` · longueur ${cumul.toFixed(1)} · jonctions ${segments.length}`
        + ` · direction ${layout.dataset.e090Direction || '—'}`
        + ` · transitions ${transitions} · flux ${layout.dataset.e090Flux || '0'}`
        + ` · version ${version} · stable ${stable ? 'oui' : 'non'}`
        + ` · mouvement ${reduit ? 'réduit' : 'actif'} · rendus ${rendus}.`;
    }
  });
});
