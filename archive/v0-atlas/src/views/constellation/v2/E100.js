import { register } from './registry.js';

/* Lentille V2 E100 — Mouvement et transitions appliqués au champ d'étoiles.
   Seconde passe : dix chantiers inédits, tous implémentés, sous le préfixe
   exclusif v2e100 (aucune collision avec les identifiants de la passe 1).
   Zéro réseau, zéro aléa, zéro minuteur ni boucle d'animation propre : tout est
   déclaratif (CSS) et commuté par des attributs data-v2e100-*. */

function v2All(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  try { return Array.prototype.slice.call(root.querySelectorAll(selector)); }
  catch { return []; }
}

function v2One(root, selector) {
  return v2All(root, selector)[0] || null;
}

function v2Make(ctx, tag, className, text) {
  if (typeof ctx.el === 'function') {
    try {
      const node = ctx.el(tag, className, text);
      if (node) return node;
    } catch { /* repli local ci-dessous */ }
  }
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function v2Num(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function v2Percent(node, name) {
  const value = node && typeof node.style.getPropertyValue === 'function'
    ? parseFloat(node.style.getPropertyValue(name)) : NaN;
  return Number.isFinite(value) ? value : 50;
}

register('E100', ctx => {
  /* Garde d'entrée : sans layout rendu, aucune écriture n'est tentée. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique de la lentille, installée une seule fois par le registre. */
  css('constellation-v2-e100', `
/* v2e100 — texte masqué, réservé aux annonces d'état. */
.v2e100-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}

/* v2e100-01 — tracé lumineux : calque SVG dédié, dessiné par dashoffset. */
.v2e100-trace{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;overflow:visible}
.v2e100-trace-line{stroke:#e6b96f;stroke-width:1.8;stroke-linecap:round;stroke-dasharray:100;stroke-dashoffset:100;animation:v2e100-draw .85s ease-out forwards;animation-delay:calc(var(--v2e100-angle,0) * 3ms)}
@keyframes v2e100-draw{to{stroke-dashoffset:0}}

/* v2e100-02 — surlignage des arêtes du chemin au survol de l'ère active. */
.constellation-field .constellation-edges line.is-path{transition:stroke-width .25s ease,stroke .25s ease}
.constellation-field[data-v2e100-glow="1"] .constellation-edges line.is-path{stroke:#f5e6c4!important;stroke-width:2.4!important;opacity:1!important}

/* v2e100-03 — anneau de focus clavier : enfant décoratif, jamais la couleur seule. */
.v2e100-ring{position:absolute;left:50%;top:50%;width:calc(100% + 12px);height:calc(100% + 12px);transform:translate(-50%,-50%);border:1px dashed rgba(230,185,111,.75);border-radius:50%;opacity:0;pointer-events:none;transition:opacity .2s ease}
.constellation-field button:focus-visible > .v2e100-ring{opacity:1;animation:v2e100-ring .9s ease-in-out infinite alternate}
@keyframes v2e100-ring{from{box-shadow:0 0 0 0 rgba(230,185,111,.3)}to{box-shadow:0 0 0 6px rgba(230,185,111,0)}}

/* v2e100-04 — bascule de gel : le style de l'état pressé change aussi de forme. */
.v2e100-freeze{display:inline-flex;align-items:center;justify-content:center;min-height:36px;min-width:36px;padding:0 12px;border:1px solid rgba(230,185,111,.35);border-radius:8px;background:rgba(7,11,18,.6);color:#e9eef7;font-size:10px;cursor:pointer;transition:border-color .2s ease,background .2s ease}
.v2e100-freeze:hover{border-color:#e6b96f;background:rgba(230,185,111,.12)}
.v2e100-freeze:focus-visible{outline:2px solid #e6b96f;outline-offset:2px}
.v2e100-freeze[aria-pressed="true"]{border-style:dashed;background:rgba(230,185,111,.18);color:#f5e6c4}

/* v2e100-05 — couronne conique en rotation sur le soleil actif. */
.v2e100-orbit{position:absolute;left:50%;top:50%;width:58px;height:58px;transform:translate(-50%,-50%);border-radius:50%;background:conic-gradient(from 0deg,rgba(230,185,111,0) 0deg,rgba(230,185,111,.6) 45deg,rgba(230,185,111,0) 90deg,rgba(230,185,111,0) 360deg);opacity:.75;pointer-events:none;animation:v2e100-orbit 9s linear infinite}
@keyframes v2e100-orbit{from{rotate:0deg}to{rotate:360deg}}

/* v2e100-06 — estompage des couches non focalisées, par opacité uniquement. */
.constellation-field[data-v2e100-focus="suns"] .const-layer-planets,
.constellation-field[data-v2e100-focus="suns"] .const-layer-moons{opacity:.35}
.constellation-field[data-v2e100-focus="planets"] .const-layer-suns,
.constellation-field[data-v2e100-focus="planets"] .const-layer-moons{opacity:.45}
.constellation-field[data-v2e100-focus="moons"] .const-layer-suns,
.constellation-field[data-v2e100-focus="moons"] .const-layer-planets{opacity:.5}
.constellation-field[data-v2e100-focus] .const-layer{transition:opacity .4s ease}

/* v2e100-07 — barre de progression d'ère, révélée par scaleX déterministe. */
.v2e100-progress{display:flex;align-items:center;gap:8px;margin-top:8px;color:var(--muted,#9fb0c6);font-size:9px}
.v2e100-progress-piste{display:block;width:120px;height:4px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden}
.v2e100-progress-fill{display:block;height:100%;width:var(--v2e100-progress,0%);background:#e6b96f;transform-origin:left center;animation:v2e100-grow .7s cubic-bezier(.22,.7,.2,1) backwards}
@keyframes v2e100-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}

/* v2e100-08 — micro-décalage des étiquettes : translation indépendante du
   transform de centrage posé par la vue. */
.constellation-field button.const-sun::after,
.constellation-field button.const-planet::after,
.constellation-field button.const-moon::after{transition:translate .25s ease,opacity .25s ease}
.constellation-field button.const-sun:hover::after,
.constellation-field button.const-planet:hover::after,
.constellation-field button.const-moon:hover::after{translate:0 var(--v2e100-label-shift,-2px)}

/* v2e100-09 — comète déterministe : aucune graine, position et délai issus
   du soleil actif. */
.v2e100-comet{position:absolute;left:var(--v2e100-comet-x,50%);top:var(--v2e100-comet-y,50%);width:3px;height:3px;border-radius:50%;background:#f5e6c4;box-shadow:0 0 10px 2px rgba(245,230,196,.65);opacity:0;transform:translate(-50%,-50%);pointer-events:none;z-index:4;animation:v2e100-comet 1.5s ease-out var(--v2e100-comet-delay,0ms) 1 both}
@keyframes v2e100-comet{0%{opacity:0;translate:160px -110px}25%{opacity:1}100%{opacity:0;translate:0 0}}

/* v2e100-10 — gel global et mouvement réduit : astres et tracés restent
   visibles, aucune information n'est perdue. */
.constellation-field[data-v2e100-freeze="1"],
.constellation-field[data-v2e100-freeze="1"] *{animation:none!important;transition:none!important}
.constellation-field[data-v2e100-freeze="1"] .v2e100-trace-line{stroke-dashoffset:0!important}
.constellation-field[data-v2e100-freeze="1"] .v2e100-comet{opacity:0!important}
[data-v2e100-freeze="1"] .v2e100-progress-fill{animation:none!important;transform:none!important}
@media (prefers-reduced-motion: reduce){
 .v2e100-trace-line,.v2e100-ring,.v2e100-orbit,.v2e100-comet,.v2e100-progress-fill{animation:none!important}
 .v2e100-trace-line{stroke-dashoffset:0!important}
 .v2e100-comet{opacity:0!important}
 .v2e100-progress-fill{transform:none!important}
}
`);

  const field = v2One(layout, '.constellation-field');
  const head = v2One(layout, '.constellation-head') || layout;
  const sunLayer = v2One(field, '.const-layer-suns');
  const activeSun = v2One(sunLayer, 'button.const-sun.is-active');
  const suns = v2All(sunLayer, 'button.const-sun');
  const activeIndex = suns.indexOf(activeSun);
  const astres = v2All(field, 'button.const-sun, button.const-planet, button.const-moon');

  /* Région live V2 distincte de celle de la passe 1, partagée par 04 et 10. */
  let live = v2One(layout, '#v2e100-live');
  if (!live) {
    live = v2Make(ctx, 'p', 'v2e100-sr', '');
    live.id = 'v2e100-live';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    layout.appendChild(live);
  }
  const announce = message => { if (live) live.textContent = message; };

  /* E100-01 — Tracé progressif des arêtes de chemin : un calque SVG dédié
     recopie les segments actifs et les dessine par stroke-dashoffset, avec un
     délai indexé sur l'angle polaire du point de départ (jamais aléatoire). */
  const pathLines = v2All(v2One(field, '.constellation-edges'), 'line.is-path');
  if (field && pathLines.length && typeof document.createElementNS === 'function') {
    let trace = v2One(field, 'svg.v2e100-trace');
    if (!trace) {
      trace = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      trace.setAttribute('class', 'v2e100-trace');
      trace.setAttribute('viewBox', '0 0 100 100');
      trace.setAttribute('preserveAspectRatio', 'none');
      trace.setAttribute('aria-hidden', 'true');
      trace.setAttribute('focusable', 'false');
    }
    while (trace.firstChild) trace.removeChild(trace.firstChild);
    pathLines.forEach((source, index) => {
      const x1 = v2Num(source.getAttribute('x1'), 0);
      const y1 = v2Num(source.getAttribute('y1'), 0);
      const x2 = v2Num(source.getAttribute('x2'), 0);
      const y2 = v2Num(source.getAttribute('y2'), 0);
      const angle = Math.round((Math.atan2(y1 - 50, x1 - 50) * 180 / Math.PI + 360) % 360);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1.toFixed(2));
      line.setAttribute('y1', y1.toFixed(2));
      line.setAttribute('x2', x2.toFixed(2));
      line.setAttribute('y2', y2.toFixed(2));
      line.setAttribute('pathLength', '100');
      line.setAttribute('class', 'v2e100-trace-line');
      line.setAttribute('data-v2e100-angle', String(angle));
      line.style.setProperty('--v2e100-angle', String(angle));
      line.style.setProperty('--v2e100-ordre', String(index + 1));
      trace.appendChild(line);
    });
    if (!trace.parentNode) field.appendChild(trace);
  }

  /* E100-02 — Surlignage des arêtes du chemin au survol de l'ère active :
     délégation passive, aucune écriture si le champs ou la couche manque. */
  if (field && sunLayer && typeof sunLayer.addEventListener === 'function') {
    field.dataset.v2e100Glow = '0';
    const setGlow = on => {
      field.dataset.v2e100Glow = on ? '1' : '0';
      if (on) announce(`${pathLines.length} arête${pathLines.length > 1 ? 's' : ''} du chemin mise${pathLines.length > 1 ? 's' : ''} en évidence.`);
    };
    sunLayer.addEventListener('pointerover', event => {
      const target = event && event.target;
      if (target && typeof target.closest === 'function'
          && target.closest('button.const-sun.is-active')) setGlow(true);
    }, { passive: true });
    sunLayer.addEventListener('pointerout', event => {
      const target = event && event.target;
      if (target && typeof target.closest === 'function'
          && target.closest('button.const-sun.is-active')) setGlow(false);
    }, { passive: true });
  }

  /* E100-03 — Anneau de focus animé sur tous les astres : enfant décoratif
     distinct du halo de survol de la passe 1, actif au clavier seulement. */
  astres.forEach((astre, index) => {
    if (typeof astre.appendChild !== 'function') return;
    if (astre.querySelector && astre.querySelector('.v2e100-ring')) return;
    const ring = v2Make(ctx, 'span', 'v2e100-ring');
    ring.setAttribute('aria-hidden', 'true');
    ring.dataset.v2e100Ring = String(index + 1);
    astre.appendChild(ring);
  });

  /* E100-04 — Bascule globale de gel : aria-pressed (choix indépendant, à la
     différence du radiogroupe tempo de la passe 1), annonce live et repli
     si le bouton existe déjà. */
  let freeze = v2One(layout, '#v2e100-freeze');
  if (!freeze) {
    freeze = v2Make(ctx, 'button', 'v2e100-freeze', 'Figer les animations');
    freeze.type = 'button';
    freeze.id = 'v2e100-freeze';
    freeze.setAttribute('aria-pressed', 'false');
    head.appendChild(freeze);
  }
  const setFreeze = (frozen, message) => {
    if (field) field.dataset.v2e100Freeze = frozen ? '1' : '0';
    if (layout) layout.dataset.v2e100Freeze = frozen ? '1' : '0';
    freeze.setAttribute('aria-pressed', frozen ? 'true' : 'false');
    freeze.textContent = frozen ? 'Reprendre les animations' : 'Figer les animations';
    if (message) announce(message);
  };
  setFreeze(false, '');
  if (typeof freeze.addEventListener === 'function') {
    freeze.addEventListener('click', () => {
      const frozen = freeze.getAttribute('aria-pressed') !== 'true';
      setFreeze(frozen, frozen
        ? 'Animations figées : le champ reste lisible et immobile.'
        : 'Animations reprises : les mouvements déclaratifs reprennent.');
    });
  }

  /* E100-05 — Couronne conique en rotation sur le soleil actif : la propriété
     individuelle rotate est animée, jamais le transform de pose du bouton. */
  if (activeSun && typeof activeSun.appendChild === 'function') {
    let orbit = activeSun.querySelector ? activeSun.querySelector('.v2e100-orbit') : null;
    if (!orbit) {
      orbit = v2Make(ctx, 'span', 'v2e100-orbit');
      orbit.setAttribute('aria-hidden', 'true');
      orbit.dataset.v2e100Orbit = '1';
      activeSun.appendChild(orbit);
    }
  }

  /* E100-06 — Estompage des couches selon celle qui détient le focus :
     focusin/focusout délégués, une seule valeur data-v2e100-focus par champ. */
  if (field && typeof field.addEventListener === 'function') {
    field.dataset.v2e100Focus = 'none';
    field.addEventListener('focusin', event => {
      const target = event && event.target;
      const layer = target && typeof target.closest === 'function'
        ? target.closest('.const-layer') : null;
      if (!layer || !field.contains(layer)) return;
      const key = layer.classList.contains('const-layer-suns') ? 'suns'
        : layer.classList.contains('const-layer-planets') ? 'planets'
        : layer.classList.contains('const-layer-moons') ? 'moons' : '';
      if (key) field.dataset.v2e100Focus = key;
    }, { passive: true });
    field.addEventListener('focusout', () => {
      field.dataset.v2e100Focus = 'none';
    }, { passive: true });
  }

  /* E100-07 — Barre de progression d'ère : rang / total recalculé, largeur
     déterministe et révélation par scaleX, sans minuteur ni graine. */
  let progress = v2One(layout, '#v2e100-progress');
  if (!progress) {
    progress = v2Make(ctx, 'div', 'v2e100-progress');
    progress.id = 'v2e100-progress';
    progress.setAttribute('aria-hidden', 'true');
    const text = v2Make(ctx, 'span', 'v2e100-progress-texte', '');
    const track = v2Make(ctx, 'span', 'v2e100-progress-piste');
    track.appendChild(v2Make(ctx, 'span', 'v2e100-progress-fill'));
    progress.appendChild(text);
    progress.appendChild(track);
    head.appendChild(progress);
  }
  const fillEl = v2One(progress, '.v2e100-progress-fill');
  const textEl = v2One(progress, '.v2e100-progress-texte');
  const total = suns.length;
  const rank = activeIndex >= 0 ? activeIndex + 1 : 0;
  const percent = total > 0 ? Math.round((rank / total) * 100) : 0;
  if (fillEl) {
    fillEl.style.setProperty('--v2e100-progress', `${percent}%`);
    fillEl.dataset.v2e100Progress = String(percent);
  }
  if (textEl) textEl.textContent = total ? `Ère ${rank} sur ${total}` : 'Aucune ère';

  /* E100-08 — Micro-décalage des étiquettes au survol : translation alternative
     indexée, sans ajouter ni remplacer les pseudo-éléments réservés à la vue. */
  astres.forEach((astre, index) => {
    astre.dataset.v2e100Label = String(index + 1);
    astre.style.setProperty('--v2e100-label-shift', index % 2 === 0 ? '-2px' : '2px');
  });

  /* E100-09 — Comète déterministe : position lue sur le soleil actif et délai
     issu de son rang, aucun tirage aléatoire et aucune boucle propre. */
  if (field && typeof field.appendChild === 'function') {
    let comet = v2One(field, '.v2e100-comet');
    if (!comet) {
      comet = v2Make(ctx, 'span', 'v2e100-comet');
      comet.setAttribute('aria-hidden', 'true');
      comet.dataset.v2e100Comet = '1';
      field.appendChild(comet);
    }
    const cometX = activeSun ? v2Percent(activeSun, '--x') : 50;
    const cometY = activeSun ? v2Percent(activeSun, '--y') : 50;
    comet.style.setProperty('--v2e100-comet-x', `${cometX.toFixed(2)}%`);
    comet.style.setProperty('--v2e100-comet-y', `${cometY.toFixed(2)}%`);
    comet.style.setProperty('--v2e100-comet-delay', `${activeIndex >= 0 ? activeIndex * 120 : 0}ms`);
  }

  /* E100-10 — Diagnostic d'animation : décompte des nœuds animés, gel
     automatique en mouvement réduit et annonce dans la région live V2. */
  const animated = v2All(field,
    '.v2e100-trace-line, .v2e100-ring, .v2e100-orbit, .v2e100-comet, .v2e100-progress-fill');
  if (field) field.dataset.v2e100Count = String(animated.length);
  if (layout) layout.dataset.v2e100Reduced = '0';
  let reduced = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduced = !!ctx.reducedMotion(); } catch { reduced = false; }
  }
  if (layout) layout.dataset.v2e100Reduced = reduced ? '1' : '0';
  if (reduced) {
    setFreeze(true, `Mouvement réduit détecté : ${animated.length} éléments animés figés, champ entièrement lisible.`);
  } else {
    announce(`Mouvement normal : ${animated.length} éléments animés disponibles.`);
  }
});
