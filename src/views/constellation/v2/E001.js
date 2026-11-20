import { register } from './registry.js';

/* Lentille V2 E001 — accessibilité clavier avancée des soleils (ères) de la
   vue Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau, sans source aléatoire et sans minuteur ni boucle propre.
   Préfixe exclusif : v2e001 (aucune collision avec la passe 1). */
register('E001', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique de la lentille : texte masqué, stabilité du focus, repli
     « mouvement réduit ». Aucune couleur n'est le seul vecteur d'information. */
  css('constellation-v2-e001', `
.v2e001-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e001-steady .constellation-field{scroll-behavior:auto}
.v2e001-steady .const-sun{transition:none}
@media (prefers-reduced-motion: reduce){.constellation-field{scroll-behavior:auto}.const-sun{transition:none!important}}
`);

  const sunLayer = layout.querySelector('.const-layer-suns');
  if (!sunLayer) return;
  const suns = Array.from(sunLayer.querySelectorAll('button.const-sun'));
  if (!suns.length) return;

  const total = suns.length;
  const indexOf = sun => suns.indexOf(sun);
  const normalize = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const nameOf = sun => normalize(sun.dataset.label || sun.getAttribute('aria-label') || sun.title || '')
    .replace(/^ere\s+/u, '').trim();
  const labelOf = sun => sun.dataset.label || sun.getAttribute('aria-label') || '';

  /* Focus programmatique sans défilement : partagé par la sortie Échap et
     repris en E001-10, il évite tout saut de scroll pendant la navigation. */
  const focusWithoutScroll = node => {
    if (node && typeof node.focus === 'function') node.focus({ preventScroll: true });
  };

  /* E001-07 — Zone de statut dédiée aux déplacements clavier V2, distincte de
     l'annonce de sélection de la passe 1. Créée une seule fois par rendu. */
  let moveLive = layout.querySelector('#v2e001-move-live');
  if (!moveLive) {
    moveLive = typeof ctx.el === 'function'
      ? ctx.el('p', 'v2e001-sr', '')
      : document.createElement('p');
    moveLive.id = 'v2e001-move-live';
    moveLive.setAttribute('role', 'status');
    moveLive.setAttribute('aria-live', 'polite');
    moveLive.setAttribute('aria-atomic', 'true');
    layout.appendChild(moveLive);
  }
  const announceMove = (sun, prefix) => {
    if (!moveLive) return;
    const index = indexOf(sun);
    if (index < 0) return;
    moveLive.textContent = `${prefix} : ère ${index + 1} sur ${total} — ${labelOf(sun)}.`;
  };

  /* E001-05 — Orientation cardinale des soleils déduite des variables --x/--y
     déjà posées par la vue (positions déterministes, aucun tirage aléatoire).
     L'information est ajoutée au libellé, jamais portée par la seule couleur. */
  const cardinal = (x, y) => {
    const angle = (Math.atan2(y - 50, x - 50) * 180 / Math.PI + 360) % 360;
    const directions = ['Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest', 'Nord', 'Nord-Est'];
    return directions[Math.round(angle / 45) % 8];
  };
  suns.forEach(sun => {
    const x = parseFloat(sun.style.getPropertyValue('--x'));
    const y = parseFloat(sun.style.getPropertyValue('--y'));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const direction = cardinal(x, y);
    sun.dataset.v2e001Orientation = direction;
    const label = sun.getAttribute('aria-label') || '';
    if (label.indexOf('orientation') === -1) {
      sun.setAttribute('aria-label', `${label}, orientation ${direction} (placement décoratif)`);
    }
  });

  /* E001-04 — Position canonique dans le radiogroupe : aria-posinset et
     aria-setsize complètent le rang visuel de la passe 1 pour les lecteurs
     d'écran, sans dépendre du badge affiché au focus. */
  suns.forEach((sun, index) => {
    sun.setAttribute('aria-posinset', String(index + 1));
    sun.setAttribute('aria-setsize', String(total));
    sun.dataset.v2e001Pos = `${index + 1}/${total}`;
  });

  /* E001-06 — Le groupe est nommé « sélecteur d'ères » avec décompte, sans
     écraser le « un seul choix » posé par la passe 1 ni l'aria-label d'origine. */
  sunLayer.setAttribute('aria-roledescription', 'sélecteur d’ères');
  const groupLabel = sunLayer.getAttribute('aria-label') || 'Ères';
  const countText = `${total} ère${total > 1 ? 's' : ''} disponible${total > 1 ? 's' : ''}`;
  if (groupLabel.indexOf(countText) === -1) {
    sunLayer.setAttribute('aria-label', `${groupLabel} — ${countText}`);
  }

  /* E001-08 — Les nouvelles touches sont déclarées sur chaque soleil, en
     ajout aux flèches et Début/Fin déjà publiées par la passe 1. */
  suns.forEach(sun => {
    const tokens = (sun.getAttribute('aria-keyshortcuts') || '').split(/\s+/).filter(Boolean);
    ['PageUp', 'PageDown', 'Escape', 'A-Z'].forEach(token => {
      if (tokens.indexOf(token) === -1) tokens.push(token);
    });
    sun.setAttribute('aria-keyshortcuts', tokens.join(' '));
  });

  /* E001-09 — Aide V2 reliée de façon non destructive : l'identifiant est
     ajouté à l'aria-describedby existant plutôt que de le remplacer. */
  let help = layout.querySelector('#v2e001-help');
  if (!help) {
    help = typeof ctx.el === 'function'
      ? ctx.el('p', 'v2e001-sr', 'Raccourcis V2 : Page précédente et Page suivante parcourent les ères par groupes de trois ; une lettre saute à la première ère commençant par cette lettre ; Échap quitte le sélecteur et rend le focus au bouton Chronologie.')
      : document.createElement('p');
    help.id = 'v2e001-help';
    layout.appendChild(help);
  }
  const described = (sunLayer.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (described.indexOf(help.id) === -1) described.push(help.id);
  sunLayer.setAttribute('aria-describedby', described.join(' '));

  /* Nommer l'activation partagée : l'annonce de déplacement est écrite avant
     le clic, donc avant le re-rendu déclenché par selectEra, comme en passe 1. */
  const goTo = (sun, prefix) => {
    if (!sun || indexOf(sun) < 0) return;
    announceMove(sun, prefix);
    sun.click();
  };

  /* E001-01 — Recherche par initiale (type-ahead) : une lettre accentuée ou non
     mène au premier soleil dont le nom d'ère commence par cette lettre, avec
     normalisation des accents et parcours cyclique. Aucun tampon, donc aucun
     minuteur. */
  /* E001-02 — Pagination PageUp/PageDown : déplacement par page de trois ères,
     borné par le modulo, sans conflit avec les flèches de la passe 1. */
  /* E001-03 — Échap : sortie explicite du sélecteur, focus rendu au bouton
     « Chronologie » avec preventScroll (aucun saut de défilement). */
  /* Les trois chantiers ci-dessus partagent l'écouteur enregistré ci-dessous. */
  const NAV_KEY = '__v2e001_nav';
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    const previous = window[NAV_KEY];
    if (typeof previous === 'function' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('keydown', previous, true);
    }
    const onNav = event => {
      if (!event || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (!target || target.nodeType !== 1 || !sunLayer.contains(target)) return;
      if (typeof target.matches !== 'function' || !target.matches('button.const-sun')) return;
      const current = indexOf(target);
      if (current < 0) return;
      const key = event.key || '';

      /* Pagination par page (voir E001-02). */
      if (key === 'PageDown' || key === 'PageUp') {
        const page = 3;
        const next = key === 'PageDown'
          ? (current + page) % total
          : (current - page + total) % total;
        event.preventDefault();
        event.stopPropagation();
        goTo(suns[next], key === 'PageDown' ? 'Pagination suivante' : 'Pagination précédente');
        return;
      }

      /* Sortie explicite du sélecteur (voir E001-03). */
      if (key === 'Escape' || key === 'Esc') {
        event.preventDefault();
        event.stopPropagation();
        const back = layout.querySelector('.constellation-back');
        focusWithoutScroll(back);
        announceMove(target, 'Sortie du sélecteur d’ères');
        return;
      }

      if (key.length === 1 && /^[a-zà-ÿ]$/iu.test(key)) {
        const letter = normalize(key);
        let found = -1;
        for (let step = 1; step <= total; step++) {
          const candidate = suns[(current + step) % total];
          if (nameOf(candidate).startsWith(letter)) {
            found = (current + step) % total;
            break;
          }
        }
        if (found < 0) return;
        event.preventDefault();
        event.stopPropagation();
        goTo(suns[found], 'Recherche par initiale');
      }
    };
    window[NAV_KEY] = onNav;
    window.addEventListener('keydown', onNav, true);
  }

  /* E001-10 — Stabilité du focus : le focus sans défilement et le repli
     « mouvement réduit » retirent défilement fluide et transitions. Le
     contraste du contour de focus reste intact : le mouvement n'est jamais
     la seule information. */
  let steady = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { steady = !!ctx.reducedMotion(); } catch (error) { steady = false; }
  }
  if (steady) sunLayer.classList.add('v2e001-steady');
  else sunLayer.classList.remove('v2e001-steady');
});
