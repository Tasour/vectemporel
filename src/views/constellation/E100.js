import { register } from './registry.js';

/* Lentille E100 — Mouvement et transitions appliqués au champ d'étoiles.
   Dix chantiers E100-01..10, tous implémentés ci-dessous. Greffon tolérant :
   aucune écriture sans ctx.layout valide, une seule feuille de style, aucune
   sortie console, aucun appel réseau, aucune source aléatoire, aucun minuteur
   ni boucle rAF propre. Toutes les animations sont déclaratives (CSS) et
   pilotées par des attributs data-e100-* déterministes. */

const STYLE_ID = 'constellation-e100';

const CSS = `
/* E100-01 — transition de repositionnement des astres : seule la géométrie
   (left/top) et l'opacité sont lissées, jamais le transform de focus. */
.constellation-field[data-e100-motion="1"] .e100-astre {
  transition: left .5s cubic-bezier(.22,.7,.2,1), top .5s cubic-bezier(.22,.7,.2,1), opacity .3s ease;
}
.constellation-field[data-e100-motion="0"] .e100-astre { transition: none; }

/* E100-02 — entrée en cascade : le rang de l'astre alimente --e100-delay,
   lu par la règle comme délai déterministe (aucune graine aléatoire). */
@keyframes e100-enter {
  from { opacity: 0; transform: translate(-50%, -50%) scale(.72); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
.constellation-field .e100-astre {
  animation: e100-enter calc(.38s * var(--e100-rate, 1)) cubic-bezier(.22,.7,.2,1) backwards;
  animation-delay: calc(var(--e100-delay, 0) * 45ms * var(--e100-rate, 1));
}

/* E100-03 — apparition séquentielle des arêtes : la longueur calculée de
   chaque segment décale son apparition et module son épaisseur initiale. */
@keyframes e100-edge {
  from { opacity: 0; stroke-width: .2; }
  to   { opacity: 1; stroke-width: 1; }
}
.constellation-field .constellation-edges line {
  animation: e100-edge calc(.6s * var(--e100-rate, 1)) ease-out backwards;
  animation-delay: calc(var(--e100-delay, 0) * 35ms * var(--e100-rate, 1));
}

/* E100-04 — pulsation du soleil actif : uniquement box-shadow, pour ne pas
   écraser le transform de focus. Mise en pause dès qu'un soleil est focalisé. */
@keyframes e100-breathe {
  0%, 100% { box-shadow: 0 0 0 0 rgba(230,185,111,.36), 0 0 10px rgba(230,185,111,.16); }
  50%      { box-shadow: 0 0 0 9px rgba(230,185,111,0), 0 0 22px rgba(230,185,111,.40); }
}
.constellation-field .const-sun.is-active.e100-astre {
  animation:
    e100-enter calc(.38s * var(--e100-rate, 1)) cubic-bezier(.22,.7,.2,1) backwards,
    e100-breathe calc(2.4s * var(--e100-rate, 1)) ease-in-out infinite;
  animation-delay:
    calc(var(--e100-delay, 0) * 45ms * var(--e100-rate, 1)),
    0s;
}
.constellation-field[data-e100-pulse="0"] .const-sun.is-active { animation-play-state: running, paused; }

/* E100-05 — parallaxe au pointeur : deux variables normalisées, trois
   profondeurs. La transition couvre aussi l'échelle du chantier E100-06. */
.constellation-field .const-layer {
  translate: calc(var(--e100-par-x, 0) * 5px) calc(var(--e100-par-y, 0) * 4px);
  scale: 1;
  transform-origin: 50% 50%;
  transition: translate .35s ease-out, scale .45s ease;
}
.constellation-field .const-layer-planets {
  translate: calc(var(--e100-par-x, 0) * 9px) calc(var(--e100-par-y, 0) * 7px);
}
.constellation-field .const-layer-moons {
  translate: calc(var(--e100-par-x, 0) * 13px) calc(var(--e100-par-y, 0) * 10px);
}
.constellation-field[data-e100-parallax="0"] .const-layer { translate: 0 0; }

/* E100-06 — respiration du champ : l'entrée du pointeur gonfle très
   légèrement les couches, la sortie les détend. */
.constellation-field[data-e100-hover="1"] .const-layer { scale: 1.012; }

/* E100-07 — halo de survol des planètes : enfant dédié, sans empiéter sur
   les pseudo-éléments déjà réservés aux étiquettes par la vue. */
.constellation-field .const-planet .e100-halo {
  position: absolute;
  inset: -7px;
  border: 1px solid rgba(230,185,111,.55);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(230,185,111,.16), rgba(230,185,111,0) 72%);
  opacity: 0;
  scale: .7;
  pointer-events: none;
  transition: opacity .22s ease, scale .28s cubic-bezier(.2,.8,.2,1);
}
.constellation-field .const-planet:hover .e100-halo,
.constellation-field .const-planet:focus-visible .e100-halo,
.constellation-field .const-planet[data-e100-halo-on="1"] .e100-halo {
  opacity: 1;
  scale: 1;
}

/* E100-08 — oscillation des lunes : la propriété « rotate » est animée
   séparément du « transform » de positionnement ; la phase est indexée. */
@keyframes e100-sway {
  from { rotate: -7deg; }
  to   { rotate: 7deg; }
}
.constellation-field .const-moon.e100-sway {
  animation: e100-sway calc(3.2s * var(--e100-rate, 1)) ease-in-out infinite alternate;
  animation-delay: calc(var(--e100-phase, 0) * -180ms);
}

/* E100-09 — bandeau tempo : radiogroupe à trois choix, dont les valeurs
   pilotent --e100-rate ; l'arrêt retire les animations sans masquer les astres. */
.e100-tempo {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 2px;
  border: 1px solid rgba(230,185,111,.28);
  border-radius: 8px;
  background: rgba(7,11,18,.55);
}
.e100-tempo-btn {
  min-width: 36px;
  min-height: 36px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-soft, #cfd8e6);
  font-size: 9px;
  cursor: pointer;
  transition: background .2s ease, color .2s ease, border-color .2s ease;
}
.e100-tempo-btn[aria-checked="true"] {
  border-color: #e6b96f;
  background: rgba(230,185,111,.16);
  color: #f5e6c4;
}
.e100-tempo-btn:focus-visible { outline: 2px solid #e6b96f; outline-offset: 2px; }
.constellation-field[data-e100-tempo="lent"] { --e100-rate: 2.2; }
.constellation-field[data-e100-tempo="normal"] { --e100-rate: 1; }
.constellation-field[data-e100-tempo="stop"] .e100-astre,
.constellation-field[data-e100-tempo="stop"] .constellation-edges line,
.constellation-field[data-e100-tempo="stop"] .const-moon.e100-sway {
  animation: none !important;
  opacity: 1 !important;
}
.constellation-field[data-e100-tempo="stop"] .const-layer { scale: 1 !important; }

/* E100-10 — mouvement réduit : verrou explicite relayé par la région live,
   doublé d'une media query de sécurité indépendante du contexte JS. */
.e100-sr {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
.constellation-field[data-e100-motion="0"] .e100-astre,
.constellation-field[data-e100-motion="0"] .constellation-edges line,
.constellation-field[data-e100-motion="0"] .const-moon.e100-sway {
  animation: none !important;
  opacity: 1 !important;
}
@media (max-width: 620px) {
  .e100-tempo { gap: 2px; padding: 1px; }
  .e100-tempo-btn { min-width: 32px; padding: 0 5px; font-size: 8px; }
}
@media (prefers-reduced-motion: reduce) {
  .constellation-field .e100-astre,
  .constellation-field .constellation-edges line,
  .constellation-field .const-moon.e100-sway {
    animation: none !important; transition: none !important; opacity: 1 !important;
  }
  .constellation-field .const-layer,
  .constellation-field .e100-halo,
  .e100-tempo-btn {
    transition: none !important; translate: 0 0 !important; scale: 1 !important;
  }
  .constellation-field .const-planet:hover .e100-halo,
  .constellation-field .const-planet:focus-visible .e100-halo { opacity: 1; scale: 1; }
}
`;

/* Sélection tolérante : jamais d'exception si le sélecteur ou la racine
   n'existe pas (vue partielle, DOM en cours de reconstruction). */
function queryAll(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  try { return Array.prototype.slice.call(root.querySelectorAll(selector)); }
  catch { return []; }
}

function one(root, selector) {
  return queryAll(root, selector)[0] || null;
}

/* Fabrique DOM : le ctx.el est préféré, avec repli local si besoin. */
function makeEl(factory, tag, className, text) {
  if (typeof factory === 'function') {
    try {
      const node = factory(tag, className, text);
      if (node) return node;
    } catch { /* repli ci-dessous */ }
  }
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

register('E100', (ctx) => {
  try {
    /* Garde d'entrée : sans layout rendu, aucun ajout au DOM ni feuille CSS. */
    if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
    if (typeof document === 'undefined') return;

    const layout = ctx.layout;
    const css = ctx.css;
    const el = ctx.el;
    const reducedMotion = ctx.reducedMotion;
    if (typeof css !== 'function') return;

    const reduced = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false;

    /* Feuille unique de la lentille, injectée une seule fois par le registre. */
    css(STYLE_ID, CSS);

    const field = one(layout, '.constellation-field');
    if (!field) return;

    const sunLayer = one(field, '.const-layer-suns');
    const planetLayer = one(field, '.const-layer-planets');
    const moonLayer = one(field, '.const-layer-moons');

    /* E100-01 — Transition de repositionnement : marquage de tous les astres
       et pose de la grille data-e100-motion qui autorise ou coupe la transition. */
    field.dataset.e100Motion = reduced ? '0' : '1';
    const astres = [];
    [sunLayer, planetLayer, moonLayer].forEach((layer) => {
      queryAll(layer, 'button.const-sun, button.const-planet, button.const-moon').forEach((node) => {
        node.classList.add('e100-astre');
        astres.push(node);
      });
    });

    /* E100-02 — Entrée en cascade : le rang fixe un délai déterministe
       (rang × 45 ms) lu par la feuille CSS comme variable --e100-delay. */
    astres.forEach((node, index) => {
      node.dataset.e100Enter = String(index + 1);
      node.style.setProperty('--e100-delay', String(index));
    });

    /* E100-03 — Arêtes : la longueur euclidienne, recalculée depuis x1/y1/x2/y2,
       décale l'apparition du trait ; le résultat est arrondi au centième. */
    const edges = one(field, '.constellation-edges');
    queryAll(edges, 'line').forEach((line, index) => {
      const x1 = Number(line.getAttribute('x1')) || 0;
      const y1 = Number(line.getAttribute('y1')) || 0;
      const x2 = Number(line.getAttribute('x2')) || 0;
      const y2 = Number(line.getAttribute('y2')) || 0;
      const length = Math.round(Math.hypot(x2 - x1, y2 - y1) * 100) / 100;
      line.dataset.e100Length = String(length);
      line.style.setProperty('--e100-delay', String(index + Math.round(length / 10)));
      line.classList.add('e100-edge');
    });

    /* E100-04 — Pulsation du soleil actif : marquage de l'astre concerné et
       suspension de la pulsation dès qu'un soleil reçoit / perd le focus. */
    const active = one(sunLayer, 'button.const-sun.is-active');
    if (active) active.dataset.e100PulseOn = '1';
    field.dataset.e100Pulse = '1';
    if (sunLayer && typeof sunLayer.addEventListener === 'function') {
      sunLayer.addEventListener('focusin', () => { field.dataset.e100Pulse = '0'; }, { passive: true });
      sunLayer.addEventListener('focusout', () => { field.dataset.e100Pulse = '1'; }, { passive: true });
    }

    /* E100-05 — Parallaxe au pointeur : position normalisée dans [-1, 1],
       écrite dans deux variables CSS ; la transition est portée par la feuille
       unique, sans rAF ni minuteur. Le gestionnaire est passif et ré-entrable. */
    field.dataset.e100Parallax = '0';
    if (typeof field.addEventListener === 'function'
        && typeof field.getBoundingClientRect === 'function') {
      field.addEventListener('pointermove', (event) => {
        if (field.dataset.e100Motion !== '1' || field.dataset.e100Tempo === 'stop'
            || field.dataset.e100Parallax !== '1' || !event) return;
        const box = field.getBoundingClientRect();
        if (!box.width || !box.height) return;
        const px = Math.max(-1, Math.min(1, ((event.clientX - box.left) / box.width) * 2 - 1));
        const py = Math.max(-1, Math.min(1, ((event.clientY - box.top) / box.height) * 2 - 1));
        field.style.setProperty('--e100-par-x', px.toFixed(3));
        field.style.setProperty('--e100-par-y', py.toFixed(3));
      }, { passive: true });
    }

    /* E100-06 — Respiration du champ : entrée/sortie du pointeur commutent
       l'attribut d'échelle et activent / désactivent la parallaxe. */
    field.dataset.e100Hover = '0';
    if (typeof field.addEventListener === 'function') {
      field.addEventListener('pointerenter', () => {
        field.dataset.e100Hover = '1';
        field.dataset.e100Parallax = reduced ? '0' : '1';
      }, { passive: true });
      field.addEventListener('pointerleave', () => {
        field.dataset.e100Hover = '0';
        field.dataset.e100Parallax = '0';
        field.style.setProperty('--e100-par-x', '0');
        field.style.setProperty('--e100-par-y', '0');
      }, { passive: true });
    }

    /* E100-07 — Halo de survol des planètes : un enfant « span » dédié,
       marqué d'un rang, remplace un pseudo-élément déjà occupé par la vue. */
    queryAll(planetLayer, 'button.const-planet').forEach((planet, index) => {
      if (typeof planet.appendChild !== 'function') return;
      if (planet.querySelector && planet.querySelector('.e100-halo')) return;
      const halo = makeEl(el, 'span', 'e100-halo');
      halo.setAttribute('aria-hidden', 'true');
      halo.dataset.e100Halo = String(index + 1);
      planet.appendChild(halo);
    });

    /* E100-08 — Oscillation des lunes : classe d'animation, phase indexée
       (décalage négatif) et sens alterné, sans toucher au transform de pose. */
    queryAll(moonLayer, 'button.const-moon').forEach((moon, index) => {
      moon.classList.add('e100-sway');
      moon.dataset.e100Sway = String(index + 1);
      moon.style.setProperty('--e100-phase', String(index));
    });

    /* E100-09 — Bandeau tempo : radiogroupe à choix unique (aucun
       aria-pressed), trois valeurs déterministes qui pilotent --e100-rate. */
    field.dataset.e100Tempo = 'normal';
    let panel = one(layout, '#e100-tempo');
    if (!panel && typeof layout.appendChild === 'function') {
      panel = makeEl(el, 'div', 'e100-tempo');
      panel.id = 'e100-tempo';
      panel.setAttribute('role', 'radiogroup');
      panel.setAttribute('aria-label', 'Vitesse du mouvement de la constellation');
      [['lent', 'Lent'], ['normal', 'Normal'], ['stop', 'Arrêt']].forEach((choice) => {
        const button = makeEl(el, 'button', 'e100-tempo-btn', choice[1]);
        button.type = 'button';
        button.id = 'e100-tempo-' + choice[0];
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-checked', choice[0] === 'normal' ? 'true' : 'false');
        button.dataset.e100Tempo = choice[0];
        panel.appendChild(button);
      });
      const head = one(layout, '.constellation-head');
      (head || layout).appendChild(panel);
    }
    if (panel && typeof panel.addEventListener === 'function') {
      panel.addEventListener('click', (event) => {
        const target = event && event.target;
        const button = target && typeof target.closest === 'function'
          ? target.closest('button.e100-tempo-btn') : null;
        if (!button || !panel.contains(button)) return;
        const value = button.dataset.e100Tempo || 'normal';
        field.dataset.e100Tempo = value;
        queryAll(panel, 'button.e100-tempo-btn').forEach((candidate) => {
          candidate.setAttribute('aria-checked', candidate === button ? 'true' : 'false');
        });
        const live = one(layout, '#e100-status');
        if (live) live.textContent = value === 'stop'
          ? 'Mouvement arrêté : les astres restent visibles et immobiles.'
          : value === 'lent'
            ? 'Mouvement ralenti : les transitions durent plus longtemps.'
            : 'Mouvement normal : les transitions reprennent leur durée initiale.';
      });
    }

    /* E100-10 — Mouvement réduit : état demandé au contexte, figé sur le
       champ, annoncé dans une région live et doublé par la media query CSS. */
    field.dataset.e100Motion = reduced ? '0' : '1';
    if (reduced) field.dataset.e100Parallax = '0';
    let status = one(layout, '#e100-status');
    if (!status && typeof layout.appendChild === 'function') {
      status = makeEl(el, 'p', 'e100-sr', reduced
        ? 'Mouvement réduit actif : animations et transitions désactivées.'
        : 'Mouvement normal : animations et transitions actives.');
      status.id = 'e100-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.setAttribute('aria-atomic', 'true');
      layout.appendChild(status);
    }
  } catch {
    /* Greffon tolérant : un échec local ne doit jamais interrompre le rendu. */
    return;
  }
});
