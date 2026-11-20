import { register } from './registry.js';

/* Lentille E058 — instrumentation E2E du focus et de la tabulation de la vue
   Constellation. Dix chantiers locaux : sondes, manifestes et marqueurs
   déterministes, sans réseau, sans aléa, sans minuteur ni boucle propre. */
register('E058', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const layout = ctx.layout;

  /* Feuille unique de la lentille : marqueurs de focus, sondes, mode sobre. */
  ctx.css('constellation-e058', `
.e058-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.e058-probe:focus{outline:2px dashed var(--violet);outline-offset:2px}
.e058-probe[data-e058-focused="true"]{box-shadow:0 0 0 2px rgba(178,139,221,.35)}
.e058-calm .e058-probe,.e058-calm .e058-probe[data-e058-focused="true"]{transition:none;box-shadow:none}
@media (prefers-reduced-motion: reduce){.e058-probe,.e058-probe[data-e058-focused="true"]{transition:none!important;box-shadow:none}}
`);

  /* Sélecteur déterministe des arrêts réels de tabulation (tabIndex >= 0). */
  const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]';
  const probes = () => Array.from(layout.querySelectorAll(FOCUSABLE))
    .filter(node => node.tabIndex >= 0 && !node.disabled
      && node.getAttribute('aria-hidden') !== 'true');

  /* Clé de test stable, dérivée de la clé de données ou de la classe. */
  const keyFor = (node, rank) => {
    const raw = node.getAttribute('data-const-key');
    if (raw) return 'noeud-' + raw.replace(/[^a-z0-9]/gi, '-');
    if (node.classList.contains('constellation-back')) return 'retour-chronologie';
    if (node.classList.contains('e001-skip')) return 'evitement-soleils';
    return 'controle-' + (rank + 1);
  };

  const order = probes();
  const trace = [];
  const keys = [];

  /* E058-01 — Manifeste d'ordre de tabulation calculé sur le DOM rendu. */
  layout.setAttribute('data-e058-tab-count', String(order.length));
  order.forEach((node, rank) => node.setAttribute('data-e058-tab-index', String(rank)));
  layout.setAttribute('data-e058-tab-order', order.map((node, rank) => keyFor(node, rank)).join(','));

  /* E058-02 — Clé de test stable exposée sur chaque arrêt de tabulation. */
  order.forEach((node, rank) => {
    node.setAttribute('data-e058-testid', keyFor(node, rank));
  });

  /* E058-03 — Sonde de séquence de focus : journal borné et dernier arrêt. */
  layout.addEventListener('focusin', (event) => {
    const node = event && event.target && event.target.nodeType === 1
      ? event.target : null;
    if (!node || !layout.contains(node)) return;
    const rank = order.indexOf(node);
    const key = rank >= 0 ? keyFor(node, rank) : keyFor(node, 0);
    trace.push(key);
    if (trace.length > 32) trace.shift();
    layout.setAttribute('data-e058-last-focus', key);
    layout.setAttribute('data-e058-focus-count', String(trace.length));
    layout.setAttribute('data-e058-trace', trace.join(','));
  });

  /* E058-04 — Détecteur de tabindex positif : ruptures de l'ordre naturel. */
  let positive = 0;
  order.forEach((node) => {
    const raw = node.getAttribute('tabindex');
    if (raw !== null && Number(raw) > 0) {
      positive += 1;
      node.setAttribute('data-e058-tab-warning', '1');
    }
  });
  layout.setAttribute('data-e058-positive-tabindex', String(positive));

  /* E058-05 — Journal des frappes de navigation, en observation pure. */
  const NAV = ['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', ' '];
  layout.addEventListener('keydown', (event) => {
    if (!event || event.ctrlKey || event.metaKey || event.altKey) return;
    if (NAV.indexOf(event.key) < 0) return;
    keys.push(event.key === ' ' ? 'Space' : event.key);
    if (keys.length > 32) keys.shift();
    layout.setAttribute('data-e058-last-key', keys[keys.length - 1]);
    layout.setAttribute('data-e058-key-count', String(keys.length));
    layout.setAttribute('data-e058-keys', keys.join(','));
  });

  /* E058-06 — Région live d'annonce d'étape pour les assertions E2E. */
  let live = layout.querySelector('#e058-live');
  if (!live) {
    live = ctx.el('p', 'e058-sr', '');
    live.id = 'e058-live';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    layout.appendChild(live);
  }
  layout.addEventListener('focusin', (event) => {
    const node = event && event.target && event.target.nodeType === 1
      ? event.target : null;
    if (!node || !layout.contains(node)) return;
    const rank = order.indexOf(node);
    const key = rank >= 0 ? keyFor(node, rank) : keyFor(node, 0);
    live.textContent = `Étape ${rank + 1}/${order.length} — ${key}.`;
  });

  /* E058-07 — Marqueur de focus instrumenté : attribut et classe de sonde. */
  order.forEach((node) => node.classList.add('e058-probe'));
  layout.addEventListener('focusin', (event) => {
    const node = event && event.target && event.target.nodeType === 1
      ? event.target : null;
    if (!node || !layout.contains(node)) return;
    order.forEach(other => other.removeAttribute('data-e058-focused'));
    if (node.classList.contains('e058-probe')) node.setAttribute('data-e058-focused', 'true');
  });
  layout.addEventListener('focusout', (event) => {
    const node = event && event.target && event.target.nodeType === 1
      ? event.target : null;
    if (node && node.hasAttribute) node.removeAttribute('data-e058-focused');
  });

  /* E058-08 — Sentinelle de sortie de vue : détecte un focus hors constellation. */
  let exits = 0;
  layout.addEventListener('focusout', (event) => {
    const next = event && event.relatedTarget;
    if (next && next.nodeType === 1 && layout.contains(next)) return;
    exits += 1;
    layout.setAttribute('data-e058-focus-left', '1');
    layout.setAttribute('data-e058-exit-count', String(exits));
  });

  /* E058-09 — Contrôle du nom accessible : manifeste d'accessibilité E2E. */
  let unnamed = 0;
  order.forEach((node) => {
    const named = !!(node.getAttribute('aria-label') || node.getAttribute('title')
      || (node.textContent && node.textContent.trim()));
    node.setAttribute('data-e058-named', named ? '1' : '0');
    if (!named) unnamed += 1;
  });
  layout.setAttribute('data-e058-unnamed', String(unnamed));

  /* E058-10 — Mode sobre : aucune animation imposée par l'instrumentation. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    layout.classList.add('e058-calm');
  } else {
    layout.classList.remove('e058-calm');
  }
});
