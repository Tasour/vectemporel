import { register } from './registry.js';

/* Lentille E023 — Contraste visuel appliqué aux lunes de la vue Constellation.
 *
 * Dix chantiers purement présentationnels, appliqués à chaque rendu de la vue
 * par le registre `runEnhancements`. Les lunes sont les points vérifiés du
 * repère actif, créés par `constellation.js` dans `.const-layer-moons` avec une
 * étiquette `data-label`, un `title` et un `aria-label` contenant la confiance
 * et le nombre de sources. La lentille ne modifie aucune donnée : elle lit ces
 * attributs existants pour coder le contraste, ajoute une pastille de légende
 * et une bascule de contraste renforcé.
 *
 * Zéro réseau, zéro aléa, zéro journalisation, zéro minuteur, zéro animation
 * propre, aucun fichier partagé modifié. CSS injecté une seule fois, nœuds
 * protégés par des identifiants uniques préfixés `e023-`, re-render idempotent.
 */

const CSS_ID = 'constellation-e023';
const SCOPE = 'constellation-e023';
const TOGGLE_ID = 'e023-contrast-toggle';
const LEGEND_ID = 'e023-legend-contrast';

/* État de la bascule, mémorisé entre deux re-renders complets du shell. */
let highContrast = false;

const CSS = `
/* E023-01 — ancrage de portée : toute règle est prefixed par .constellation-e023. */
.constellation-e023 .const-moon {
  background: #18202c;
  border: 2px solid var(--violet);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, .7);
  transition: background-color .16s linear, border-color .16s linear, box-shadow .16s linear;
}
.constellation-e023 .const-moon:hover {
  background: #2a2140;
  border-color: var(--gold-bright);
}
/* E023-02 — lune active : double anneau, l'état ne tient pas à la couleur seule. */
.constellation-e023 .const-moon.is-active {
  background: var(--violet);
  border-color: var(--gold-bright);
  box-shadow: 0 0 0 2px var(--ink), 0 0 12px rgba(178, 139, 221, .65);
}
/* E023-03 — traits vers les lunes : couleur et épaisseur renforcées. */
.constellation-e023 .constellation-edges line.is-moon {
  stroke: rgba(178, 139, 221, .6);
  stroke-width: 1.4;
}
.constellation-e023 .constellation-edges line.is-moon.is-path {
  stroke: var(--gold-bright);
  stroke-width: 2.2;
}
/* E023-04 — étiquette de lune : pastille contrastée sur fond opaque. */
.constellation-e023 .const-moon::after {
  color: var(--ink-soft);
  background: rgba(8, 11, 16, .94);
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  padding: 1px 3px;
  font-size: 8px;
  font-weight: 600;
}
/* E023-05 — focus clavier : anneau dédié, distinct de l'état actif. */
.constellation-e023 .const-moon:focus-visible {
  outline: 2px solid var(--gold-bright);
  outline-offset: 3px;
}
/* E023-06 — confiance codée en texte, calculée depuis le titre de la lune. */
.constellation-e023 .const-moon::before {
  position: absolute;
  top: -7px;
  right: -7px;
  z-index: 1;
  font-size: 8px;
  font-weight: 700;
  line-height: 1;
}
.constellation-e023 .const-moon[data-e023-confidence="fort"]::before { content: "+"; color: var(--gold-bright); }
.constellation-e023 .const-moon[data-e023-confidence="mitige"]::before { content: "~"; color: var(--ink); }
.constellation-e023 .const-moon[data-e023-confidence="faible"]::before { content: "-"; color: var(--ink-soft); }
/* E023-07 — présence de source : bord plein ou tireté, jamais la seule couleur. */
.constellation-e023 .const-moon[data-e023-sources="oui"] { border-style: solid; }
.constellation-e023 .const-moon[data-e023-sources="non"] { border-style: dashed; }
/* E023-08 — pastille explicative ajoutée dans la légende des lunes. */
.e023-legend-contrast {
  color: var(--ink-soft);
  font-size: 8px;
  line-height: 1.4;
}
/* E023-09 — bascule de contraste renforcé. */
.e023-toggle {
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: rgba(255, 255, 255, .03);
  color: var(--ink-soft);
  font: inherit;
  font-size: 9px;
  cursor: pointer;
}
.e023-toggle[aria-pressed="true"] {
  border-color: var(--gold-bright);
  background: rgba(244, 214, 158, .12);
  color: var(--gold-bright);
}
.e023-toggle:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
.constellation-e023.e023-high .const-moon { background: #000; border-color: #fff; border-width: 3px; }
.constellation-e023.e023-high .const-moon.is-active { background: #fff; border-color: #000; box-shadow: 0 0 0 2px #000, 0 0 0 4px #fff; }
.constellation-e023.e023-high .constellation-edges line.is-moon { stroke: #fff; stroke-width: 2.4; }
.constellation-e023.e023-high .const-moon::after { color: #fff; background: #000; border-color: #fff; }
/* E023-10 — mouvement réduit et préférence de contraste système. */
.constellation-e023[data-e023-reduced="1"] .const-moon,
.constellation-e023[data-e023-reduced="1"] .e023-toggle { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .constellation-e023 .const-moon,
  .constellation-e023 .e023-toggle { transition: none; }
}
@media (prefers-contrast: more) {
  .constellation-e023 .const-moon { background: #000; border-color: #fff; }
  .constellation-e023 .constellation-edges line.is-moon { stroke: #fff; }
}`;

register('E023', (ctx) => {
  const layout = ctx && ctx.layout;
  if (!layout) return;
  const css = ctx.css;
  const el = ctx.el;
  const reducedMotion = ctx.reducedMotion;

  try {
    /* E023-01 — CSS injecté une fois, classe et attribut de portée posés sur le layout. */
    if (typeof css === 'function') css(CSS_ID, CSS);
    layout.classList.add(SCOPE);
    layout.setAttribute('data-e023', '1');

    /* E023-02 — anneau de la lune active (règle CSS dédiée ci-dessus). */
    /* E023-03 — traits is-moon renforcés (règle CSS dédiée ci-dessus). */
    /* E023-04 — étiquette en pastille contrastée (règle CSS dédiée ci-dessus). */
    /* E023-05 — anneau de focus clavier (règle CSS dédiée ci-dessus). */

    const nodes = layout.querySelectorAll ? layout.querySelectorAll('.const-moon') : [];
    const moons = Array.prototype.slice.call(nodes || []);

    /* E023-06 — calcul de la confiance depuis le title/aria-label puis attribut
       data-e023-confidence lu par le CSS pour afficher + / ~ / -. */
    moons.forEach((moon) => {
      const title = moon.getAttribute('title') || moon.getAttribute('aria-label') || '';
      const found = /confiance\s+([^·]+)/i.exec(title);
      const raw = found ? found[1].trim().toLowerCase() : '';
      let level = 'fort';
      if (raw.indexOf('disput') !== -1 || raw.indexOf('non document') !== -1) {
        level = 'faible';
      } else if (raw.indexOf('probable') !== -1) {
        level = 'mitige';
      }
      moon.setAttribute('data-e023-confidence', level);
    });

    /* E023-07 — calcul de la présence de sources puis attribut
       data-e023-sources : bord plein avec source, bord tireté sans source. */
    moons.forEach((moon) => {
      const label = moon.getAttribute('title') || moon.getAttribute('aria-label') || '';
      const counted = /(\d+)\s+source/i.exec(label);
      const hasSource = counted
        ? Number(counted[1]) > 0
        : (/source/i.test(label) && !/aucune source/i.test(label));
      moon.setAttribute('data-e023-sources', hasSource ? 'oui' : 'non');
    });

    /* E023-08 — nœud DOM ajouté : pastille explicative dans la légende des lunes. */
    const legend = layout.querySelector ? layout.querySelector('.constellation-legend') : null;
    if (legend && typeof el === 'function' && !legend.querySelector('#' + LEGEND_ID)) {
      const chip = el('span', 'e023-legend-contrast',
        'Contraste des lunes : + confiance fort · ~ mitigé · - faible · bord plein : source · bord tireté : sans source');
      chip.id = LEGEND_ID;
      legend.appendChild(chip);
    }

    /* E023-09 — bouton, écouteur et état mémorisé de la bascule de contraste. */
    const caption = layout.querySelector ? layout.querySelector('.constellation-caption') : null;
    if (caption && typeof el === 'function' && !caption.querySelector('#' + TOGGLE_ID)) {
      const btn = el('button', 'e023-toggle',
        highContrast ? 'Contraste renforcé : activé' : 'Contraste renforcé');
      btn.type = 'button';
      btn.id = TOGGLE_ID;
      btn.setAttribute('aria-pressed', highContrast ? 'true' : 'false');
      btn.addEventListener('click', () => {
        highContrast = !highContrast;
        btn.setAttribute('aria-pressed', highContrast ? 'true' : 'false');
        btn.textContent = highContrast ? 'Contraste renforcé : activé' : 'Contraste renforcé';
        layout.classList.toggle('e023-high', highContrast);
      });
      caption.appendChild(btn);
    }
    layout.classList.toggle('e023-high', highContrast);

    /* E023-10 — couplage à prefers-reduced-motion via l'API fournie, avec
       attribut data-e023-reduced lu par la règle CSS qui neutralise la transition. */
    let reduced = false;
    if (typeof reducedMotion === 'function') reduced = !!reducedMotion();
    if (reduced) layout.setAttribute('data-e023-reduced', '1');
    else layout.removeAttribute('data-e023-reduced');
  } catch {
    /* Greffon tolérant : une feuille sans lune, sans légende ou sans légende
       de caption reste lisible ; aucune exception ne remonte au registre. */
    return;
  }
});
