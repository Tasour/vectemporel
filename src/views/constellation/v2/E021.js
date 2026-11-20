import { register } from './registry.js';

/* Lentille V2 E021 — accessibilité clavier avancée des lunes (points vérifiés
   du repère actif). Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau, sans source aléatoire, sans minuteur ni boucle d'animation. */
register('E021', ctx => {
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique : texte masqué vocalisable, stabilité du focus, repli sobre. */
  css('constellation-v2-e021', `
.v2e021-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e021-steady{scroll-behavior:auto}
.v2e021-steady .const-moon{transition:none}
@media (prefers-reduced-motion: reduce){.const-layer-moons{scroll-behavior:auto}.const-moon{transition:none!important}}
`);

  const moonLayer = layout.querySelector('.const-layer-moons');
  if (!moonLayer) return;
  const moons = Array.from(moonLayer.querySelectorAll('button.const-moon'));
  if (!moons.length) return;
  const total = moons.length;

  /* Utilitaires partagés : normalisation Unicode, libellé, focus sans défilement. */
  function normalize(text) {
    return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  function nameOf(moon) {
    const brut = moon.dataset.label || moon.getAttribute('aria-label') || '';
    return normalize(brut).replace(/^point\s+\d+\s*:\s*/, '').trim();
  }
  function focusWithoutScroll(node) {
    if (node && typeof node.focus === 'function') node.focus({ preventScroll: true });
  }

  /* E021-01 — Recherche par initiale (type-ahead) dans le groupe de lunes. */
  /* E021-02 — Pagination PageUp/PageDown par groupes de trois points vérifiés. */
  /* E021-03 — Sortie explicite du sélecteur par Échap, focus rendu au retour. */
  const NAV_KEY = '__v2e021_nav';
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function'
      && typeof window.removeEventListener === 'function') {
    const precedent = window[NAV_KEY];
    if (typeof precedent === 'function') window.removeEventListener('keydown', precedent, true);
    const onNav = (event) => {
      if (!event || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (!target || target.nodeType !== 1 || !moonLayer.contains(target)) return;
      if (typeof target.matches !== 'function' || !target.matches('button.const-moon')) return;
      const current = moons.indexOf(target);
      if (current < 0) return;
      const key = event.key;

      /* E021-01 (suite) — une lettre saute à la première lune correspondante. */
      if (typeof key === 'string' && key.length === 1 && /^[a-zà-ÿ]$/iu.test(key)) {
        const lettre = normalize(key);
        for (let pas = 1; pas <= total; pas += 1) {
          const index = (current + pas) % total;
          if (nameOf(moons[index]).indexOf(lettre) === 0) {
            event.preventDefault();
            event.stopPropagation();
            goTo(index, 'Recherche par initiale');
            return;
          }
        }
        return;
      }

      /* E021-02 (suite) — trois lunes par page, parcours cyclique borné. */
      if (key === 'PageDown' || key === 'PageUp') {
        const page = 3;
        const index = key === 'PageDown'
          ? (current + page) % total
          : (current - page + total) % total;
        event.preventDefault();
        event.stopPropagation();
        goTo(index, key === 'PageDown' ? 'Pagination suivante' : 'Pagination précédente');
        return;
      }

      /* E021-03 (suite) — Échap rend le focus au bouton « Revenir au globe ». */
      if (key === 'Escape' || key === 'Esc') {
        event.preventDefault();
        event.stopPropagation();
        focusWithoutScroll(layout.querySelector('.constellation-back'));
        const live = layout.querySelector('#v2e021-move-live');
        if (live) live.textContent = `Sortie du sélecteur de points vérifiés : lune ${current + 1} sur ${total}.`;
        return;
      }
    };
    window[NAV_KEY] = onNav;
    window.addEventListener('keydown', onNav, true);
  }

  /* E021-04 — Position canonique aria-posinset / aria-setsize sur chaque lune. */
  moons.forEach((moon, index) => {
    moon.setAttribute('aria-posinset', String(index + 1));
    moon.setAttribute('aria-setsize', String(total));
    moon.dataset.v2e021Pos = `${index + 1}/${total}`;
  });

  /* E021-05 — Orientation cardinale ajoutée au libellé accessible des lunes. */
  function cardinal(x, y) {
    const angle = (Math.atan2(y - 50, x - 50) * 180 / Math.PI + 360) % 360;
    const directions = ['Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest', 'Nord', 'Nord-Est'];
    return directions[Math.round(angle / 45) % 8];
  }
  moons.forEach((moon) => {
    const x = Number.parseFloat(moon.style.getPropertyValue('--x'));
    const y = Number.parseFloat(moon.style.getPropertyValue('--y'));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const direction = cardinal(x, y);
    moon.dataset.v2e021Orientation = direction;
    const label = moon.getAttribute('aria-label') || '';
    if (label.indexOf('orientation') === -1) {
      moon.setAttribute('aria-label', `${label} — orientation ${direction} (placement décoratif)`);
    }
  });

  /* E021-06 — Roledescription et décompte grammatical sur le groupe de lunes. */
  moonLayer.setAttribute('aria-roledescription', 'sélecteur de points vérifiés');
  const decompte = `${total} point${total > 1 ? 's' : ''} vérifié${total > 1 ? 's' : ''} disponible${total > 1 ? 's' : ''}`;
  const libelleGroupe = moonLayer.getAttribute('aria-label') || '';
  if (libelleGroupe.indexOf(decompte) === -1) {
    moonLayer.setAttribute('aria-label', libelleGroupe ? `${libelleGroupe} — ${decompte}` : decompte);
  }

  /* E021-07 — Région live V2 distincte pour les déplacements, annonce avant focus. */
  let moveLive = layout.querySelector('#v2e021-move-live');
  if (!moveLive) {
    moveLive = typeof ctx.el === 'function'
      ? ctx.el('p', 'v2e021-sr', '') : document.createElement('p');
    moveLive.id = 'v2e021-move-live';
    moveLive.setAttribute('role', 'status');
    moveLive.setAttribute('aria-live', 'polite');
    moveLive.setAttribute('aria-atomic', 'true');
    layout.appendChild(moveLive);
  }
  function announceMove(prefix, cible) {
    const node = layout.querySelector('#v2e021-move-live');
    if (!node) return;
    const index = moons.indexOf(cible);
    node.textContent = `${prefix} : lune ${index + 1} sur ${total} — ${nameOf(cible) || 'point vérifié'}.`;
  }
  function goTo(index, prefix) {
    const cible = moons[((index % total) + total) % total];
    if (!cible) return;
    announceMove(prefix, cible);
    focusWithoutScroll(cible);
  }

  /* E021-08 — Fusion idempotent des nouvelles touches dans aria-keyshortcuts. */
  const nouvellesTouches = ['PageUp', 'PageDown', 'Escape', 'A-Z'];
  moons.forEach((moon) => {
    const tokens = (moon.getAttribute('aria-keyshortcuts') || '').split(/\s+/).filter(Boolean);
    nouvellesTouches.forEach((token) => {
      if (tokens.indexOf(token) === -1) tokens.push(token);
    });
    moon.setAttribute('aria-keyshortcuts', tokens.join(' '));
    moon.dataset.v2e021Keys = tokens.join(' ');
  });

  /* E021-09 — Aide V2 rattachée sans écraser l'aide de la passe 1. */
  let help = layout.querySelector('#v2e021-help');
  if (!help) {
    help = typeof ctx.el === 'function'
      ? ctx.el('p', 'v2e021-sr',
        'Lettre : sauter à une lune. Page précédente et Page suivante : avancer ou reculer de trois points. Échap : quitter le sélecteur.')
      : document.createElement('p');
    help.id = 'v2e021-help';
    layout.appendChild(help);
  }
  const decritsGroupe = (moonLayer.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (decritsGroupe.indexOf(help.id) === -1) decritsGroupe.push(help.id);
  moonLayer.setAttribute('aria-describedby', decritsGroupe.join(' '));
  moons.forEach((moon) => {
    const decrits = (moon.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (decrits.indexOf(help.id) === -1) decrits.push(help.id);
    moon.setAttribute('aria-describedby', decrits.join(' '));
  });

  /* E021-10 — Focus sans défilement et repli « mouvement réduit » demandé au contexte. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) moonLayer.classList.add('v2e021-steady');
  else moonLayer.classList.remove('v2e021-steady');
});
