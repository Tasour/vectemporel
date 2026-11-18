import { register } from './registry.js';

/* Lentille E053 — contraste visuel appliqué au focus et à la tabulation de la
 * vue Constellation. Dix chantiers locaux, déterministes et tolérants : aucun
 * appel réseau, aucune source aléatoire, aucun minuteur ni boucle d'animation
 * propre. Toutes les mutations restent dans le layout courant, jamais dans un
 * fichier partagé, et chaque effet est enveloppé pour neutraliser les erreurs. */

const CSS_ID = 'constellation-e053';
const LIVE_ID = 'e053-live';
const LEGEND_ID = 'e053-legend';
const CHIP_ID = 'e053-tabchip';
const ORDER_ID = 'e053-order';

const CSS = `
/* E053-01 — Anneau de focus à double contraste pour toute cible de la vue :
   contour clair (3 px) + liseré sombre intérieur + halo, décalage de 3 px. */
.constellation-layout button:focus-visible {
  outline: 3px solid var(--gold-bright);
  outline-offset: 3px;
  box-shadow: 0 0 0 2px rgba(8, 10, 14, .95), 0 0 0 6px rgba(244, 214, 158, .30);
  border-radius: 6px;
}
.constellation-layout button:focus:not(:focus-visible) { outline: none; }

/* E053-02 — Modulation du thème d'anneau selon le ratio WCAG calculé en JS
   et exposé sur data-e053-ring (clair / sombre). */
.constellation-layout[data-e053-ring="sombre"] button:focus-visible {
  outline-color: #0b0e13;
  box-shadow: 0 0 0 2px rgba(244, 214, 158, .95), 0 0 0 6px rgba(11, 14, 19, .40);
}

/* E053-03 — Cibles à fond clair (lunes, bouton de retour) : anneau sombre
   renforcé d'un liseré blanc, pour rester visible sur surface claire. */
.constellation-layout .const-moon:focus-visible,
.constellation-layout .constellation-back:focus-visible {
  outline-color: #0b0e13;
  box-shadow: 0 0 0 2px #ffffff, 0 0 0 5px rgba(11, 14, 19, .60);
}

/* E053-04 — Nœud marqué au focus par attribut : étiquette portée à contraste
   maximal, sans dépendre de la seule couleur (poids et couleur). */
.constellation-field [data-e053-focused="true"]::after {
  color: var(--gold-bright) !important;
  font-weight: 700 !important;
}

/* E053-05 — Pastille de position de tabulation, fixe et lisible. */
.e053-tabchip {
  display: inline-block; min-height: 22px; padding: 2px 8px;
  border: 1px solid var(--gold); border-radius: 999px;
  background: var(--surface-2); color: var(--gold-bright);
  font-size: 9px; font-variant-numeric: tabular-nums; letter-spacing: .04em;
}

/* E053-06 — Légende de focus : deux échantillons rendent le code couleur
   explicite (anneau clair sur fond sombre, anneau sombre sur fond clair). */
.e053-legend {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px;
  margin: 6px 0 0; color: var(--muted-2); font-size: 9px;
}
.e053-swatch {
  display: inline-block; width: 12px; height: 12px; border-radius: 3px;
}
.e053-swatch-light { background: var(--gold-bright); box-shadow: 0 0 0 2px #0b0e13; }
.e053-swatch-dark { background: #0b0e13; box-shadow: 0 0 0 2px #ffffff; }
.e053-legend-text { flex: 1 1 220px; }

/* E053-07 — Miroir textuel visuellement masqué du focus. */
.e053-sr {
  position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* E053-08 — Mode sobre : priorité au contraste statique, anneau épaissi,
   aucune transition. Complété par la règle média ci-dessous. */
.e053-calm button { transition: none !important; }
.e053-calm button:focus-visible { outline-width: 4px; box-shadow: 0 0 0 3px rgba(8, 10, 14, .95); }

/* E053-09 — Contraste forcé (Windows High Contrast) : couleurs système. */
@media (forced-colors: active) {
  .constellation-layout button:focus-visible {
    outline: 3px solid Highlight;
    outline-offset: 3px;
    box-shadow: none;
  }
  .constellation-layout button:focus-visible::after { color: HighlightText !important; }
}

@media (prefers-reduced-motion: reduce) {
  .constellation-layout button { transition: none !important; animation: none !important; }
  .constellation-layout button:focus-visible { outline-width: 4px; }
}
`;

function safe(fn) {
  try { fn(); } catch { /* Greffon neutralisé : le rendu reste intact. */ }
}

/* E053-02 — Luminance relative WCAG d'une couleur #rrggbb, calculée sans
   dépendance ni aléa. Sert au ratio de contraste du chantier 02. */
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

register('E053', (ctx) => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const layout = ctx.layout;
  const stage = ctx.stage || layout;
  const css = typeof ctx.css === 'function' ? ctx.css : () => {};
  const el = typeof ctx.el === 'function' ? ctx.el : (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  /* Feuille unique de la lentille, posée avant toute mutation du DOM. */
  safe(() => css(CSS_ID, CSS));

  const field = layout.querySelector('.constellation-field');
  const focusables = Array.from(layout.querySelectorAll(
    'button.const-sun, button.const-planet, button.const-moon, button.constellation-back'
  ));

  /* E053-02 — Ratio de contraste WCAG calculé depuis deux couleurs fixes :
     exposé en attribut et en variable CSS, il pilote le thème d'anneau. */
  safe(() => {
    const ratio = Math.round(contrastRatio('#f4d69e', '#0e1116') * 100) / 100;
    const text = ratio.toFixed(2);
    layout.setAttribute('data-e053-ratio', text);
    layout.style.setProperty('--e053-ratio', text);
    layout.setAttribute('data-e053-ring', ratio >= 4.5 ? 'clair' : 'sombre');
  });

  /* E053-08 — Mouvement réduit demandé au contexte : classe et attribut
     posés même si la constellation est vide, sans sonde propre. */
  safe(() => {
    let reduced = false;
    try { reduced = !!(typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()); }
    catch { reduced = false; }
    layout.classList.toggle('e053-calm', reduced);
    layout.setAttribute('data-e053-motion', reduced ? 'reduce' : 'full');
  });

  /* Constellation vide : la feuille de style reste inoffensive. */
  if (!field && !focusables.length) return;

  /* E053-04 — Écouteurs délégués de focus : posent data-e053-focused sur la
     seule cible active et data-e053-kind (ère, repère, point, commande). */
  safe(() => {
    if (!field) return;
    const asButton = (target) => {
      if (!target || target.nodeType !== 1 || typeof target.closest !== 'function') return null;
      const node = target.closest('button');
      return node && field.contains(node) ? node : null;
    };
    const mark = (node) => {
      focusables.forEach((other) => {
        if (other !== node) other.removeAttribute('data-e053-focused');
      });
      if (!node) return;
      node.setAttribute('data-e053-focused', 'true');
      const key = node.getAttribute('data-const-key') || '';
      node.setAttribute('data-e053-kind', key.split(':')[0] || 'commande');
    };
    field.addEventListener('focusin', (event) => {
      const node = asButton(event && event.target);
      if (node) mark(node);
    });
    field.addEventListener('focusout', (event) => {
      if (asButton(event && event.target)) mark(null);
    });
  });

  /* E053-05 — Pastille de position de tabulation calculée et maintenue à
     jour au focus : « Tab N / M » sur un compteur déterministe. */
  safe(() => {
    const total = focusables.length;
    if (!total) return;
    let chip = layout.querySelector('#' + CHIP_ID);
    if (!chip) {
      chip = el('span', 'e053-tabchip', '');
      chip.id = CHIP_ID;
      chip.setAttribute('data-e053-total', String(total));
      const caption = layout.querySelector('.constellation-caption');
      (caption || layout).appendChild(chip);
    }
    const update = (node) => {
      const index = focusables.indexOf(node);
      chip.textContent = index < 0
        ? `Tab : ${total} cible${total > 1 ? 's' : ''}`
        : `Tab ${index + 1} / ${total}`;
    };
    update(null);
    if (field) field.addEventListener('focusin', (event) => {
      const target = event && event.target;
      const node = target && target.nodeType === 1 && typeof target.closest === 'function'
        ? target.closest('button') : null;
      if (node && focusables.indexOf(node) >= 0) update(node);
    });
  });

  /* E053-06 — Légende de focus insérée dans la légende de la vue : deux
     échantillons rendent visible le sens des anneaux clair et sombre. */
  safe(() => {
    if (layout.querySelector('#' + LEGEND_ID)) return;
    const legend = el('p', 'e053-legend', '');
    legend.id = LEGEND_ID;
    const light = el('span', 'e053-swatch e053-swatch-light', '');
    const dark = el('span', 'e053-swatch e053-swatch-dark', '');
    const note = el('span', 'e053-legend-text',
      'Focus : anneau clair sur fond sombre · anneau sombre sur fond clair.');
    legend.append(light, dark, note);
    const caption = layout.querySelector('.constellation-caption');
    (caption || layout).appendChild(legend);
  });

  /* E053-07 — Région live visuellement masquée : annonce en français la
     cible focalisée et le ratio de contraste calculé au chantier 02. */
  safe(() => {
    if (layout.querySelector('#' + LIVE_ID)) return;
    const live = el('p', 'e053-sr', 'Contraste du focus : en attente de tabulation.');
    live.id = LIVE_ID;
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    layout.appendChild(live);
    if (!field) return;
    field.addEventListener('focusin', (event) => {
      const target = event && event.target;
      const node = target && target.nodeType === 1 && typeof target.closest === 'function'
        ? target.closest('[data-const-key]') : null;
      if (!node) return;
      const kind = node.classList.contains('const-sun') ? 'ère'
        : node.classList.contains('const-planet') ? 'repère'
        : node.classList.contains('const-moon') ? 'point vérifié' : 'commande';
      const ratio = layout.getAttribute('data-e053-ratio') || '—';
      const message = `Focus sur ${kind} : anneau contrasté, ratio ${ratio} pour 1.`;
      if (live.textContent !== message) live.textContent = message;
    });
  });

  /* E053-10 — Ordre de tabulation explicite : data-e053-order sur chaque
     cible, liste masquée décrivant la séquence, reliée au champ par un
     aria-describedby complété sans écraser la note existante. */
  safe(() => {
    if (!focusables.length) return;
    let list = layout.querySelector('#' + ORDER_ID);
    if (!list) {
      list = el('ol', 'e053-sr', '');
      list.id = ORDER_ID;
      layout.appendChild(list);
    }
    list.textContent = '';
    focusables.forEach((node, index) => {
      node.setAttribute('data-e053-order', String(index + 1));
      const label = node.getAttribute('aria-label') || node.textContent || 'cible';
      list.appendChild(el('li', '', `${index + 1}. ${label}`));
    });
    if (field) {
      const described = (field.getAttribute('aria-describedby') || '')
        .split(/\s+/).filter(Boolean);
      if (described.indexOf(ORDER_ID) < 0) {
        described.push(ORDER_ID);
        field.setAttribute('aria-describedby', described.join(' '));
      }
    }
  });

  /* E053-03 — Le bouton de retour profite aussi du contraste renforcé :
     marquage d'attribut pour le style dédié de la feuille unique. */
  safe(() => {
    const back = layout.querySelector('.constellation-back');
    if (back) back.setAttribute('data-e053-cible-claire', 'true');
  });

  /* Contexte conservé en référence : la lentille n'écrit que dans son layout. */
  safe(() => {
    layout.setAttribute('data-e053-view', ctx.viewId || 'constellation');
    layout.setAttribute('data-e053-stage', stage === layout ? 'local' : 'shell');
  });
});
