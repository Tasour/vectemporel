import { register } from './registry.js';

/* Lentille V2 E053 — contraste du focus et de la tabulation, seconde passe.
   Dix chantiers inédits, tous locaux et déterministes : aucun appel réseau,
   aucune source aléatoire, aucun minuteur ni boucle d'animation propre. Toutes
   les mutations restent dans le layout courant et chaque effet est enveloppé
   pour neutraliser les erreurs. */

const CSS_ID = 'constellation-v2-e053';
const CVD_KEY = '__v2e053_cvd';

const CSS = `
/* V2E053-01 — Anneau à contraste garanti par différence de couleurs : un liseré
   blanc en mix-blend-mode difference devient le complément du fond réel. */
.constellation-layout .v2e053-blend:focus-visible::after {
  content: '';
  position: absolute;
  inset: -5px;
  border: 3px solid #fff;
  border-radius: 8px;
  mix-blend-mode: difference;
  pointer-events: none;
  z-index: 7;
}

/* V2E053-02 — Simulation de daltonisme : filtre local sur la scène, sans
   toucher au thème global. L'état est piloté par un bouton à bascule. */
.v2e053-cvd .constellation-field { filter: grayscale(1); }

/* V2E053-03 — Si le contraste mesuré de l'étiquette est faible, l'anneau est
   épaissi : l'information ne repose pas sur une nuance de couleur. */
.v2e053-faible:focus-visible { outline-width: 4px !important; }

/* V2E053-04 — Anneau proportionné à la taille de la cible, piloté par une
   variable CSS calculée en JS. */
.constellation-layout .v2e053-blend:focus-visible {
  outline-offset: var(--v2e053-offset, 3px);
}

/* V2E053-05 — Fil de suivi textuel des dernières cibles focalisées. */
.v2e053-trail {
  display: block; margin: 6px 0 0; color: var(--muted-2);
  font-size: 9px; font-variant-numeric: tabular-nums;
}

/* V2E053-06 — Note d'alerte pour les cibles masquées mais tabulables. */
.v2e053-note {
  display: block; margin: 4px 0 0; padding: 4px 8px;
  border: 1px solid var(--gold); border-radius: 6px;
  background: var(--surface-2); color: var(--gold-bright);
  font-size: 9px;
}

/* V2E053-07 — Extrémités de la séquence : décalage d'anneau distinct. */
.v2e053-debut:focus-visible,
.v2e053-fin:focus-visible { outline-offset: 7px; }

/* V2E053-08 — Préférence système de contraste renforcé : repli CSS pur, sans
   sonde propre ni minuteur. */
@media (prefers-contrast: more) {
  .constellation-layout .v2e053-blend:focus-visible {
    outline-width: 4px;
    box-shadow: 0 0 0 3px #000;
  }
  .v2e053-note, .v2e053-trail { border-width: 2px; }
}

/* V2E053-09 — Repère de zone active : le champ entier s'encadre dès qu'un
   bouton interne reçoit le focus, avec un badge textuel. */
.v2e053-zone { position: relative; }
.v2e053-zone:focus-within { outline: 2px dashed var(--gold); outline-offset: 3px; }
.v2e053-zone-badge {
  position: absolute; top: -14px; left: 6px; z-index: 4;
  padding: 1px 6px; border: 1px solid var(--gold); border-radius: 999px;
  background: var(--surface-2); color: var(--gold-bright); font-size: 8px;
  opacity: 0; pointer-events: none;
}
.v2e053-zone:focus-within .v2e053-zone-badge { opacity: 1; }

/* V2E053-10 — Bouton d'annonce et region live visuellement masquée. */
.v2e053-where, .v2e053-toggle {
  min-height: 36px; padding: 6px 10px; margin: 6px 6px 0 0;
  border: 1px solid var(--gold); border-radius: 8px;
  background: var(--surface-2); color: var(--gold-bright);
  font-size: 10px; cursor: pointer;
}
.v2e053-where:focus-visible, .v2e053-toggle:focus-visible {
  outline: 3px solid var(--gold-bright); outline-offset: 3px;
}
.v2e053-sr {
  position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
`;

function safe(fn) {
  try { fn(); } catch { /* Greffon neutralisé : le rendu reste intact. */ }
}

/* Luminance relative WCAG d'une couleur #rrggbb, sans dépendance ni aléa. */
function luminance(hex) {
  const matched = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!matched) return 0;
  const parts = matched[1].match(/.{2}/g).map((part) => {
    const channel = parseInt(part, 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2];
}

function contrastRatio(first, second) {
  const a = luminance(first);
  const b = luminance(second);
  const high = Math.max(a, b);
  const low = Math.min(a, b);
  return (high + 0.05) / (low + 0.05);
}

/* Convertit une couleur calculée rgb()/rgba() en hexadécimal exploitable. */
function rgbToHex(value) {
  const matched = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(String(value || ''));
  if (!matched) return '';
  const two = (n) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0');
  return '#' + two(matched[1]) + two(matched[2]) + two(matched[3]);
}

register('E053', (ctx) => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  if (typeof ctx.css !== 'function') return;
  const layout = ctx.layout;
  const el = typeof ctx.el === 'function' ? ctx.el : (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  /* Feuille unique de la lentille, posée avant toute mutation du DOM. */
  safe(() => ctx.css(CSS_ID, CSS));

  const field = layout.querySelector('.constellation-field');
  const focusables = Array.from(layout.querySelectorAll(
    'button.const-sun, button.const-planet, button.const-moon, button.constellation-back'
  ));
  const caption = layout.querySelector('.constellation-caption') || layout;
  let lastTarget = null;

  /* E053-01 — Anneau à contraste garanti par différence de couleurs. */
  safe(() => {
    layout.setAttribute('data-v2e053-blend', 'difference');
    focusables.forEach((node) => {
      node.classList.add('v2e053-blend');
      let position = '';
      try { position = window.getComputedStyle ? window.getComputedStyle(node).position : ''; }
      catch { position = ''; }
      if (!position || position === 'static') {
        node.style.position = 'relative';
        node.setAttribute('data-v2e053-pos', 'relative');
      }
    });
  });

  /* E053-02 — Simulateur de daltonisme : bascule locale et mémorisée. */
  safe(() => {
    if (!field) { layout.setAttribute('data-v2e053-cvd', 'indisponible'); return; }
    let active = false;
    try { active = !!(typeof window !== 'undefined' && window[CVD_KEY]); }
    catch { active = false; }
    const apply = (on) => {
      field.classList.toggle('v2e053-cvd', on);
      layout.setAttribute('data-v2e053-cvd', on ? 'grayscale' : 'off');
    };
    apply(active);
    let button = layout.querySelector('#v2e053-cvd');
    if (!button) {
      button = el('button', 'v2e053-toggle', 'Simuler le daltonisme');
      button.id = 'v2e053-cvd';
      button.type = 'button';
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      button.addEventListener('click', () => {
        active = !active;
        try { if (typeof window !== 'undefined') window[CVD_KEY] = active; } catch { /* Stockage indisponible. */ }
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
        apply(active);
      });
      caption.appendChild(button);
    } else {
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  });

  /* E053-03 — Contraste réel de l'étiquette mesuré sur le fond calculé. */
  safe(() => {
    if (!field || typeof window === 'undefined' || !window.getComputedStyle) {
      layout.setAttribute('data-v2e053-label-min', '—');
      return;
    }
    const background = rgbToHex(window.getComputedStyle(field).backgroundColor) || '#0e1116';
    let worst = Infinity;
    focusables.forEach((node) => {
      const foreground = rgbToHex(window.getComputedStyle(node).color);
      if (!foreground) return;
      const ratio = Math.round(contrastRatio(foreground, background) * 100) / 100;
      node.setAttribute('data-v2e053-label-ratio', ratio.toFixed(2));
      node.classList.toggle('v2e053-faible', ratio < 4.5);
      if (ratio < worst) worst = ratio;
    });
    layout.setAttribute('data-v2e053-label-min', Number.isFinite(worst) ? worst.toFixed(2) : '—');
  });

  /* E053-04 — Anneau proportionné à la taille de la cible. */
  safe(() => {
    focusables.forEach((node) => {
      const width = node.offsetWidth || 0;
      const height = node.offsetHeight || 0;
      const compact = width > 0 && height > 0 && (width < 28 || height < 28 || width * height < 900);
      node.setAttribute('data-v2e053-size', compact ? 'compacte' : 'large');
      node.style.setProperty('--v2e053-offset', compact ? '5px' : '3px');
    });
    layout.setAttribute('data-v2e053-sized', String(focusables.length));
  });

  /* E053-05 — Fil de suivi des cinq dernières cibles focalisées. */
  safe(() => {
    let trail = layout.querySelector('#v2e053-trail');
    if (!trail) {
      trail = el('p', 'v2e053-trail', 'Parcours : en attente de tabulation.');
      trail.id = 'v2e053-trail';
      caption.appendChild(trail);
    }
    const history = [];
    const nameOf = (node) => node.getAttribute('aria-label')
      || (node.textContent || '').trim()
      || node.getAttribute('data-const-key')
      || 'cible';
    (field || layout).addEventListener('focusin', (event) => {
      const target = event && event.target;
      const node = target && target.nodeType === 1 && typeof target.closest === 'function'
        ? target.closest('button') : null;
      if (!node || focusables.indexOf(node) < 0) return;
      lastTarget = node;
      const label = nameOf(node);
      if (history[history.length - 1] !== label) {
        history.push(label);
        if (history.length > 5) history.shift();
      }
      const text = 'Parcours : ' + history.join(' › ');
      if (trail.textContent !== text) trail.textContent = text;
    });
    layout.setAttribute('data-v2e053-trail', '5');
  });

  /* E053-06 — Alerte sur les cibles masquées mais restant tabulables. */
  safe(() => {
    if (!field || typeof window === 'undefined' || !window.getComputedStyle) {
      layout.setAttribute('data-v2e053-hidden', '0');
      return;
    }
    let hidden = 0;
    focusables.forEach((node) => {
      const style = window.getComputedStyle(node);
      const isHidden = style.display === 'none' || style.visibility === 'hidden'
        || node.getAttribute('aria-hidden') === 'true' || node.offsetParent === null;
      if (isHidden) {
        hidden += 1;
        node.setAttribute('data-v2e053-hidden', 'true');
      } else {
        node.removeAttribute('data-v2e053-hidden');
      }
    });
    layout.setAttribute('data-v2e053-hidden', String(hidden));
    let note = layout.querySelector('#v2e053-hidden-note');
    if (hidden > 0) {
      if (!note) {
        note = el('p', 'v2e053-note', '');
        note.id = 'v2e053-hidden-note';
        caption.appendChild(note);
      }
      const plural = hidden > 1 ? 's' : '';
      note.textContent = `Attention : ${hidden} cible${plural} masquée${plural} restent atteignables au clavier.`;
    } else if (note) {
      note.remove();
    }
  });

  /* E053-07 — Marquage des extrémités de la séquence de tabulation. */
  safe(() => {
    focusables.forEach((node) => node.classList.remove('v2e053-debut', 'v2e053-fin'));
    if (!focusables.length) {
      layout.setAttribute('data-v2e053-extremite', 'aucune');
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first.classList.add('v2e053-debut');
    first.setAttribute('data-v2e053-extremite', 'debut');
    last.classList.add('v2e053-fin');
    last.setAttribute('data-v2e053-extremite', 'fin');
    let ends = layout.querySelector('#v2e053-extremes');
    if (!ends) {
      ends = el('p', 'v2e053-trail', '');
      ends.id = 'v2e053-extremes';
      caption.appendChild(ends);
    }
    const nameOf = (node) => node.getAttribute('aria-label')
      || (node.textContent || '').trim() || 'cible';
    ends.textContent = `Premier arrêt : ${nameOf(first)} · Dernier arrêt : ${nameOf(last)}.`;
    layout.setAttribute('data-v2e053-extremite', 'marquee');
  });

  /* E053-08 — Repli CSS pour la préférence système de contraste renforcé. */
  safe(() => {
    layout.setAttribute('data-v2e053-contrast-rule', 'prefers-contrast: more');
    layout.setAttribute('data-v2e053-contrast-source', 'feuille unique');
  });

  /* E053-09 — Repère global de zone active : focus-within sur le champ. */
  safe(() => {
    if (!field) { layout.setAttribute('data-v2e053-zone', 'absente'); return; }
    field.classList.add('v2e053-zone');
    let badge = layout.querySelector('#v2e053-zone-badge');
    if (!badge) {
      badge = el('span', 'v2e053-zone-badge', 'Zone active : constellation');
      badge.id = 'v2e053-zone-badge';
      field.appendChild(badge);
    }
    layout.setAttribute('data-v2e053-zone', 'active');
  });

  /* E053-10 — Bouton d'annonce de la dernière cible visitée. */
  safe(() => {
    let live = layout.querySelector('#v2e053-where-live');
    if (!live) {
      live = el('p', 'v2e053-sr', 'Dernière cible : en attente de tabulation.');
      live.id = 'v2e053-where-live';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      layout.appendChild(live);
    }
    if (!layout.querySelector('#v2e053-where')) {
      const button = el('button', 'v2e053-where', 'Dernière cible visitée');
      button.id = 'v2e053-where';
      button.type = 'button';
      button.addEventListener('click', () => {
        const node = lastTarget && field && field.contains(lastTarget) ? lastTarget : null;
        let message;
        if (!node || focusables.indexOf(node) < 0) {
          message = "Aucune cible de la constellation n'a été visitée pour l'instant.";
        } else {
          const ratio = node.getAttribute('data-v2e053-label-ratio') || '—';
          const label = node.getAttribute('aria-label')
            || (node.textContent || '').trim() || 'cible';
          const size = node.getAttribute('data-v2e053-size') || '—';
          message = `Dernière cible : ${label} · contraste d'étiquette ${ratio} pour 1 · cible ${size}.`;
        }
        if (live.textContent !== message) live.textContent = message;
      });
      caption.appendChild(button);
    }
    layout.setAttribute('data-v2e053-where', 'pret');
  });
});
