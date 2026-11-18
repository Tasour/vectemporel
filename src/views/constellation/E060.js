import { register } from './registry.js';

/* Lentille CONSTELLATION E060 — Mouvement et transitions appliqués au focus
 * et à la tabulation de la vue Constellation.
 *
 * Dix chantiers appliqués à chaque rendu par `runEnhancements`. Le mouvement
 * reste au service de l'orientation : aucune orbite animée, aucune position
 * de nœud modifiée, aucune ressource réseau, aucune valeur aléatoire. Le halo,
 * le fil de focus, la jauge et l'annonce sont dérivés du DOM rendu par
 * `constellation.js`. Une seule feuille CSS, des identifiants préfixés
 * `e060-`, un repli complet quand `prefers-reduced-motion` est actif. */

const ID = {
  halo: 'e060-spotlight',
  pulse: 'e060-pulse',
  trail: 'e060-trail',
  meter: 'e060-meter',
  meterCount: 'e060-meter-count',
  meterFill: 'e060-meter-fill',
  hint: 'e060-hint',
  live: 'e060-live',
};

/* Feuille unique : transitions courtes, ciblées, toutes réversibles. Les
 * règles ne visent que la vue constellation et les ancres `e060-`. */
const CSS = `
.constellation-layout .const-sun,
.constellation-layout .const-planet,
.constellation-layout .const-moon {
  transition: transform .24s cubic-bezier(.2,.8,.2,1),
              box-shadow .24s ease, border-color .24s ease, opacity .2s ease;
}
.constellation-layout .const-sun:focus-visible,
.constellation-layout .const-planet:focus-visible,
.constellation-layout .const-moon:focus-visible {
  outline: 2px solid var(--gold-bright, #f0d29a);
  outline-offset: 3px;
  transform: translate(-50%, -50%) scale(1.14);
}
.e060-spotlight {
  position: absolute;
  left: var(--e060-x, 50%); top: var(--e060-y, 50%);
  width: var(--e060-size, 40px); height: var(--e060-size, 40px);
  transform: translate(-50%, -50%); border-radius: 50%;
  border: 1px dashed rgba(240, 210, 154, .6);
  background: radial-gradient(circle, rgba(240,210,154,.16), rgba(240,210,154,0) 70%);
  pointer-events: none; z-index: 4; opacity: 0;
  transition: left .3s cubic-bezier(.2,.8,.2,1), top .3s cubic-bezier(.2,.8,.2,1),
              width .24s ease, height .24s ease, opacity .2s ease, border-color .24s ease;
}
.e060-spotlight.is-on { opacity: 1; }
.constellation-layout[data-e060-dir="back"] .e060-spotlight {
  border-color: rgba(178, 139, 221, .8); transition-duration: .2s;
}
.constellation-layout[data-e060-nord="1"] .e060-spotlight {
  box-shadow: inset 0 18px 24px -20px rgba(240, 210, 154, .9);
}
.constellation-layout[data-e060-sud="1"] .e060-spotlight {
  box-shadow: inset 0 -18px 24px -20px rgba(178, 139, 221, .9);
}
.e060-pulse {
  position: absolute;
  left: var(--e060-px, 50%); top: var(--e060-py, 50%);
  width: 18px; height: 18px; margin: 0;
  transform: translate(-50%, -50%); border-radius: 50%;
  border: 1px solid rgba(178, 139, 221, .75);
  pointer-events: none; z-index: 5;
  animation: e060-breathe 2.4s ease-in-out infinite;
}
@keyframes e060-breathe {
  0%, 100% { opacity: .25; transform: translate(-50%, -50%) scale(.85); }
  50% { opacity: .8; transform: translate(-50%, -50%) scale(1.25); }
}
.e060-trail {
  display: flex; flex-wrap: wrap; align-items: center;
  gap: 4px; margin: 0; padding: 0; list-style: none;
}
.e060-trail-item {
  padding: 2px 6px; border: 1px solid var(--line, rgba(255,255,255,.14));
  border-radius: 999px; color: var(--muted, #9a958c); font-size: 8px;
  max-width: 132px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  animation: e060-trail-in .26s ease both;
}
@keyframes e060-trail-in {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}
.e060-meter { display: flex; align-items: center; gap: 8px; }
.e060-meter-count {
  min-width: 54px; color: var(--gold, #e6b96f);
  font-size: 9px; font-variant-numeric: tabular-nums;
}
.e060-meter-track {
  display: block; width: 84px; height: 3px; border-radius: 3px;
  background: rgba(255,255,255,.1); overflow: hidden;
}
.e060-meter-fill {
  display: block; width: 0; height: 100%;
  background: linear-gradient(90deg, var(--gold, #e6b96f), var(--violet, #b28bdd));
  transition: width .3s ease;
}
.e060-hint {
  flex: 1 1 100%; margin: 0; color: var(--muted-2, #7d786f);
  font-size: 8px; line-height: 1.5;
}
.e060-live {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
.constellation-layout[data-e060-motion="off"] .const-sun,
.constellation-layout[data-e060-motion="off"] .const-planet,
.constellation-layout[data-e060-motion="off"] .const-moon,
.constellation-layout[data-e060-motion="off"] .e060-spotlight,
.constellation-layout[data-e060-motion="off"] .e060-pulse,
.constellation-layout[data-e060-motion="off"] .e060-trail-item,
.constellation-layout[data-e060-motion="off"] .e060-meter-fill {
  transition: none !important; animation: none !important;
}
`;

/* Écoute de préférence installée une seule fois pour toute la session. */
let layoutCourant = null;
let ecouteMediaPose = false;

function nodes(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

/* Un identifiant n'est créé qu'une fois, même si le registre rejoue la
 * lentille sur un DOM déjà enrichi. */
function unique(ctx, doc, id, tag, cls, texte, parent) {
  let node = typeof doc.getElementById === 'function' ? doc.getElementById(id) : null;
  if (!node) {
    node = ctx.el(tag, cls, texte);
    node.id = id;
    if (parent && typeof parent.appendChild === 'function') parent.appendChild(node);
  }
  return node;
}

function apply(ctx) {
  /* Contrat : vérification de ctx.layout avant tout ajout au DOM. */
  const layout = ctx && ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const doc = layout.ownerDocument || (typeof document !== 'undefined' ? document : null);
  if (!doc || typeof doc.createElement !== 'function') return;
  if (typeof ctx.el !== 'function') return;

  const field = layout.querySelector('.constellation-field');
  const head = layout.querySelector('.constellation-head');
  const caption = layout.querySelector('.constellation-caption')
    || (field && field.parentNode) || layout;
  const noeuds = nodes(layout, '[data-const-key]');
  const animer = typeof ctx.reducedMotion === 'function' ? !ctx.reducedMotion() : true;

  /* E060-01 — Transition de focus sur les trois types de nœuds : une seule
   * feuille CSS injectée, anneau visible et montée douce au :focus-visible. */
  if (typeof ctx.css === 'function') ctx.css('constellation-e060', CSS);

  /* E060-02 — Halo glissant : un disque suit le nœud focalisé en lisant ses
   * variables --x/--y ; sa taille est calculée depuis le type de nœud. */
  const halo = field ? unique(ctx, doc, ID.halo, 'span', 'e060-spotlight', undefined, field) : null;
  put(halo, 'aria-hidden', 'true');

  /* E060-03 — Ordre de tabulation explicite : rang `data-e060-tab` et
   * tabindex 0 attribués dans l'ordre ère → repère → point du DOM rendu. */
  noeuds.forEach((noeud, index) => {
    put(noeud, 'data-e060-tab', String(index + 1));
    noeud.tabIndex = 0;
  });

  /* E060-04 — Bord animé : la coordonnée --y du nœud est convertie en
   * nombre, puis reportée en attributs nord/sud sur le layout. */
  const appliquerBord = (noeud) => {
    const brut = noeud && noeud.style ? noeud.style.getPropertyValue('--y') : '';
    const valeur = parseFloat(brut);
    const y = Number.isFinite(valeur) ? valeur : 50;
    put(layout, 'data-e060-nord', y < 25 ? '1' : '0');
    put(layout, 'data-e060-sud', y > 75 ? '1' : '0');
  };

  /* E060-05 — Fil de tabulation : liste des cinq derniers nœuds focalisés,
   * insérée devant, avec entrée animée en CSS et plafond de cinq items. */
  const trail = head ? unique(ctx, doc, ID.trail, 'ol', 'e060-trail', undefined, head) : null;
  put(trail, 'aria-label', 'Fil des cinq derniers éléments focalisés');
  const ajouterFil = (libelle) => {
    if (!trail || typeof trail.insertBefore !== 'function') return;
    trail.insertBefore(ctx.el('li', 'e060-trail-item', libelle), trail.firstChild);
    while (trail.children.length > 5) trail.removeChild(trail.lastChild);
  };

  /* E060-06 — Jauge de tabulation : compteur textuel et largeur de barre
   * transitionnée, calculée en pourcentage plafonné à 100. */
  let countText = null;
  let jauge = null;
  if (caption) {
    const meter = unique(ctx, doc, ID.meter, 'div', 'e060-meter', undefined, caption);
    put(meter, 'aria-hidden', 'true');
    countText = unique(ctx, doc, ID.meterCount, 'span', 'e060-meter-count', 'Tab 0', meter);
    jauge = typeof doc.getElementById === 'function' ? doc.getElementById(ID.meterFill) : null;
    let track = jauge ? jauge.parentNode : null;
    if (!track || !meter.contains(track)) {
      track = ctx.el('span', 'e060-meter-track');
      meter.appendChild(track);
    }
    if (!jauge) {
      jauge = ctx.el('span', 'e060-meter-fill');
      jauge.id = ID.meterFill;
      track.appendChild(jauge);
    }
  }
  let compteur = 0;
  const majCompteur = () => {
    compteur += 1;
    if (countText) countText.textContent = 'Tab ' + compteur;
    if (jauge) jauge.style.width = Math.min(100, compteur * 8) + '%';
    layout.dataset.e060Tabcount = String(compteur);
  };

  /* E060-07 — Repli mouvement réduit : attribut sur le layout, lu par la
   * feuille unique pour neutraliser transitions et animations; suivi des
   * changements de préférence sans timer ni boucle propre. */
  put(layout, 'data-e060-motion', animer ? 'on' : 'off');
  layoutCourant = layout;
  if (!ecouteMediaPose && typeof window !== 'undefined' && window.matchMedia) {
    try {
      const requete = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (requete && typeof requete.addEventListener === 'function') {
        requete.addEventListener('change', () => {
          put(layoutCourant, 'data-e060-motion', requete.matches ? 'off' : 'on');
        });
        ecouteMediaPose = true;
      }
    } catch {
      /* Préférence indisponible : l'état initial reste applicable. */
    }
  }

  /* E060-08 — Direction : Tab ou Maj+Tab posent l'attribut `data-e060-dir`,
   * lu par le CSS pour colorer et accélérer le halo en sens inverse. */
  put(layout, 'data-e060-dir', 'forward');
  const surTouche = (event) => {
    if (!event || typeof event.key !== 'string') return;
    if (event.key === 'Tab') {
      put(layout, 'data-e060-dir', event.shiftKey ? 'back' : 'forward');
      majCompteur();
      return;
    }
    if (event.key === 'Escape' && halo && noeuds.length) {
      const actif = noeuds.filter((n) => n.getAttribute('aria-current') === 'true')[0] || noeuds[0];
      placer(halo, actif, '--e060-x', '--e060-y');
      placer(pulse, actif, '--e060-px', '--e060-py');
      if (live) live.textContent = 'Retour au nœud actif';
    }
  };

  /* E060-09 — Respiration du nœud focalisé : un anneau distinct, animé en
   * CSS, recalé sur les variables de position du nœud à chaque focus. */
  const pulse = field ? unique(ctx, doc, ID.pulse, 'span', 'e060-pulse', undefined, field) : null;
  put(pulse, 'aria-hidden', 'true');

  /* E060-10 — Consigne et annonce polie : texte d'orientation dans l'en-tête
   * et région `role="status"` mise à jour au focus, tous deux dérivés du DOM. */
  const hint = head ? unique(ctx, doc, ID.hint, 'p', 'e060-hint',
    'Mouvement : le halo suit le focus. Tab / Maj+Tab parcourent ères, repères et points dans cet ordre ; Échap replace le halo sur le nœud actif. Les transitions sont neutralisées si « réduire les animations » est actif.', head) : null;
  const live = unique(ctx, doc, ID.live, 'span', 'e060-live', undefined, caption);
  put(live, 'role', 'status');
  put(live, 'aria-live', 'polite');

  /* Report des variables de position du nœud sur un élément de la lentille. */
  function placer(element, noeud, nomX, nomY) {
    if (!element || !noeud || !noeud.style) return;
    const x = noeud.style.getPropertyValue('--x');
    const y = noeud.style.getPropertyValue('--y');
    if (x) element.style.setProperty(nomX, x);
    if (y) element.style.setProperty(nomY, y);
  }

  layout.addEventListener('keydown', surTouche);
  layout.addEventListener('focusin', (event) => {
    const cible = event && event.target && event.target.dataset && event.target.dataset.constKey
      ? event.target : null;
    if (!cible) return;
    const cle = cible.dataset.constKey;
    const libelle = cible.dataset.label || cle;
    placer(halo, cible, '--e060-x', '--e060-y');
    if (halo) {
      const type = cle.split(':')[0];
      const taille = type === 'sun' ? 56 : type === 'planet' ? 34 : 22;
      halo.style.setProperty('--e060-size', taille + 'px');
      halo.classList.add('is-on');
    }
    placer(pulse, cible, '--e060-px', '--e060-py');
    appliquerBord(cible);
    ajouterFil(libelle);
    if (live) live.textContent = 'Focus : ' + libelle;
  });
}

/* Greffon tolérant : une structure inattendue neutralise la lentille sans
 * jamais propager d'exception au registre. */
register('E060', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
