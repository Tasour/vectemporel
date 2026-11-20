import { register } from './registry.js';

/* Lentille V2 E011 — accessibilité clavier avancée des planètes (repères) de la
   vue Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau, sans source aléatoire et sans minuteur ni boucle propre.
   Préfixe exclusif : v2e011 (aucune collision avec la passe 1 e011). */
register('E011', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique de la lentille : texte masqué, stabilité du focus, repli
     « mouvement réduit ». Aucune couleur n'est le seul vecteur d'information. */
  css('constellation-v2-e011', `
.v2e011-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e011-steady .constellation-field{scroll-behavior:auto}
.v2e011-steady .const-planet{transition:none}
@media (prefers-reduced-motion: reduce){.constellation-field{scroll-behavior:auto}.const-planet{transition:none!important}}
`);

  const layer = layout.querySelector('.const-layer-planets');
  if (!layer) return;
  const planets = Array.from(layer.querySelectorAll('button.const-planet'));
  if (!planets.length) return;

  const total = planets.length;
  const indexOf = node => planets.indexOf(node);
  const normalize = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  /* data-label = « année · titre » (année parfois « 48 av. J.-C. ») : le titre
     est le dernier segment. Repli sur l'aria-label sans séparateur. */
  const nameOf = node => {
    const raw = node.dataset.label || node.getAttribute('aria-label') || node.title || '';
    const parts = String(raw).split('·');
    return normalize(parts[parts.length - 1] || raw)
      .replace(/^repere\s*\d+\s*:\s*/u, '').trim();
  };
  const labelOf = node => node.dataset.label || node.getAttribute('aria-label') || '';

  /* E011-06 — Zone de statut dédiée aux déplacements V2, distincte de
     l'annonce de sélection `#e011-live` de la passe 1. Créée une seule fois. */
  let moveLive = layout.querySelector('#v2e011-move-live');
  if (!moveLive) {
    moveLive = typeof ctx.el === 'function'
      ? ctx.el('p', 'v2e011-sr', '')
      : document.createElement('p');
    moveLive.id = 'v2e011-move-live';
    moveLive.setAttribute('role', 'status');
    moveLive.setAttribute('aria-live', 'polite');
    moveLive.setAttribute('aria-atomic', 'true');
    layout.appendChild(moveLive);
  }
  const announceMove = (planet, prefix) => {
    if (!moveLive) return;
    const index = indexOf(planet);
    if (index < 0) return;
    moveLive.textContent = `${prefix} : repère ${index + 1} sur ${total} — ${labelOf(planet)}.`;
  };

  /* E011-04 — Orientation cardinale des planètes déduite des variables --x/--y
     déjà posées par la vue (angle déterministe 137,5°, aucun tirage aléatoire).
     L'information est ajoutée au libellé, jamais portée par la seule couleur. */
  const cardinal = (x, y) => {
    const angle = (Math.atan2(y - 50, x - 50) * 180 / Math.PI + 360) % 360;
    const directions = ['Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest', 'Nord', 'Nord-Est'];
    return directions[Math.round(angle / 45) % 8];
  };
  planets.forEach(planet => {
    const x = parseFloat(planet.style.getPropertyValue('--x'));
    const y = parseFloat(planet.style.getPropertyValue('--y'));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const direction = cardinal(x, y);
    planet.dataset.v2e011Orientation = direction;
    const label = planet.getAttribute('aria-label') || '';
    if (label.indexOf('orientation') === -1) {
      planet.setAttribute('aria-label', `${label}, orientation ${direction} (placement décoratif)`);
    }
  });

  /* E011-03 — Position canonique dans le groupe : aria-posinset et
     aria-setsize complètent le rang de la passe 1 pour les lecteurs d'écran,
     sans dépendre du libellé enrichi ni d'un badge affiché. */
  planets.forEach((planet, index) => {
    planet.setAttribute('aria-posinset', String(index + 1));
    planet.setAttribute('aria-setsize', String(total));
    planet.dataset.v2e011Pos = `${index + 1}/${total}`;
  });

  /* E011-05 — Le groupe est nommé « sélecteur de repères » avec décompte,
     sans écraser le rôle radiogroupe posé par la passe 1 ni son aria-label. */
  layer.setAttribute('aria-roledescription', 'sélecteur de repères');
  const groupLabel = layer.getAttribute('aria-label') || 'Repères';
  const countText = `${total} repère${total > 1 ? 's' : ''} disponible${total > 1 ? 's' : ''}`;
  if (groupLabel.indexOf(countText) === -1) {
    layer.setAttribute('aria-label', `${groupLabel} — ${countText}`);
  }

  /* E011-07 — Les nouvelles touches sont déclarées sur chaque planète, en
     ajout à celles déjà publiées par la passe 1. Le crochet « ] » s'écrit
     `BracketRight` dans aria-keyshortcuts, « [ » s'écrit `BracketLeft`. */
  planets.forEach(planet => {
    const tokens = (planet.getAttribute('aria-keyshortcuts') || '').split(/\s+/).filter(Boolean);
    ['BracketLeft', 'BracketRight', 'A-Z'].forEach(token => {
      if (tokens.indexOf(token) === -1) tokens.push(token);
    });
    planet.setAttribute('aria-keyshortcuts', tokens.join(' '));
  });

  /* E011-08 — Aide V2 reliée de façon non destructive : l'identifiant est
     ajouté à l'aria-describedby existant plutôt que de le remplacer. */
  let help = layout.querySelector('#v2e011-help');
  if (!help) {
    help = typeof ctx.el === 'function'
      ? ctx.el('p', 'v2e011-sr', 'Raccourcis V2 : [ et ] parcourent les repères par groupes de trois ; une lettre saute au premier repère dont le titre commence par cette lettre. Les flèches, Début/Fin et les sauts de couche de la passe 1 restent actifs.')
      : document.createElement('p');
    help.id = 'v2e011-help';
    layout.appendChild(help);
  }
  const described = (layer.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (described.indexOf(help.id) === -1) described.push(help.id);
  layer.setAttribute('aria-describedby', described.join(' '));

  /* Nommer l'activation partagée : l'annonce de déplacement est écrite avant
     le clic, donc avant le re-rendu déclenché par selectEvent, comme en passe 1. */
  const goTo = (planet, prefix) => {
    if (!planet || indexOf(planet) < 0) return;
    announceMove(planet, prefix);
    planet.click();
  };

  /* E011-01 — Recherche par initiale (type-ahead) : une lettre accentuée ou non
     mène au premier repère dont le titre commence par cette lettre, avec
     normalisation des accents et parcours cyclique. Aucun tampon, donc aucun
     minuteur. */
  /* E011-02 — Pagination par crochets : [ et ] déplacent de trois repères,
     bornés par le modulo, sans conflit avec PageUp/PageDown (passe 1) déjà
     réservés au saut entre couches. */
  /* Les deux chantiers ci-dessus partagent l'écouteur enregistré ci-dessous. */
  const NAV_KEY = '__v2e011_nav';
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    const previous = window[NAV_KEY];
    if (typeof previous === 'function' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('keydown', previous, true);
    }
    const onNav = event => {
      if (!event || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (!target || target.nodeType !== 1 || !layer.contains(target)) return;
      if (typeof target.matches !== 'function' || !target.matches('button.const-planet')) return;
      const current = indexOf(target);
      if (current < 0) return;
      const key = event.key || '';

      /* Pagination par page de trois repères (voir E011-02). */
      if (key === '[' || key === ']') {
        const page = 3;
        const next = key === ']'
          ? (current + page) % total
          : (current - page + total) % total;
        event.preventDefault();
        event.stopPropagation();
        goTo(planets[next], key === ']' ? 'Pagination suivante' : 'Pagination précédente');
        return;
      }

      if (key.length === 1 && /^[a-zà-ÿ]$/iu.test(key)) {
        const letter = normalize(key);
        let found = -1;
        for (let step = 1; step <= total; step++) {
          const candidate = planets[(current + step) % total];
          if (nameOf(candidate).startsWith(letter)) {
            found = (current + step) % total;
            break;
          }
        }
        if (found < 0) return;
        event.preventDefault();
        event.stopPropagation();
        goTo(planets[found], 'Recherche par initiale');
      }
    };
    window[NAV_KEY] = onNav;
    window.VECTEMPOREL_KEYS?.registerScoped?.(() => true, onNav);
  }

  /* E011-09 — Stabilité du focus : la coque restaure déjà le focus avec
     preventScroll ; le repli « mouvement réduit » retire en plus le défilement
     fluide et les transitions. Le contraste du contour de focus de la passe 1
     reste intact : le mouvement n'est jamais la seule information. */
  let steady = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { steady = !!ctx.reducedMotion(); } catch (error) { steady = false; }
  }
  if (steady) layer.classList.add('v2e011-steady');
  else layer.classList.remove('v2e011-steady');

  /* E011-10 — Traçabilité et idempotence V2 : des marqueurs de données sous
     le préfixe exclusif v2e011 exposent l'état appliqué et le cardinal, pour
     audit et vérification sans outil d'accessibilité. La garde sur l'existence
     des marqueurs rend l'application tolérante à un DOM déjà enrichi. */
  if (layer.dataset) {
    layer.dataset.v2e011Applied = '1';
    layer.dataset.v2e011Count = String(total);
  }
  planets.forEach((planet, index) => {
    if (planet.dataset && !planet.dataset.v2e011Index) {
      planet.dataset.v2e011Index = String(index + 1);
    }
  });
});
