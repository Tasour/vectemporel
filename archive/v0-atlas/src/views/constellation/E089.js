import { register } from './registry.js';

/* Lentille E089 — robustesse et garde-fous appliqués au chemin de connexion
   de la vue Constellation (le réseau de segments SVG .const-edge qui relie le
   soleil de l'ère active aux planètes, puis aux lunes). Dix chantiers concrets :
   aucun appel réseau, aucune source aléatoire, aucun minuteur ni boucle
   d'animation propre, aucune sortie journalisée. Greffon tolérant. */
register('E089', (ctx) => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function'
      || typeof document === 'undefined') return;
  const css = typeof ctx.css === 'function' ? ctx.css : null;
  if (!css) return;
  const layout = ctx.layout;

  /* Utilitaire tolérant : ajout de classe sans jamais lever d'exception. */
  const addClass = (node, name) => {
    if (node && node.classList && typeof node.classList.add === 'function') node.classList.add(name);
  };
  const setAttr = (node, name, value) => {
    if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
  };

  /* Feuille unique de la lentille, injectée une seule fois via ctx.css. */
  css('constellation-e089', `
    .e089-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
    #e089-edges .const-edge{vector-effect:non-scaling-stroke;stroke-linecap:round;paint-order:stroke}
    #e089-edges .e089-degenerate{stroke-dasharray:2 2;opacity:.45}
    #e089-edges .e089-clamped{stroke-dasharray:1 3}
    #e089-edges[data-e089-fallback="1"]{opacity:.4}
    #e089-edges.e089-calm .const-edge{transition:none!important;animation:none!important}
  `);

  try {
    /* E089-01 — Repérage tolérant du tracé : identifiant dédié, sinon sortie. */
    const edges = layout.querySelector('svg.constellation-edges');
    if (!edges || typeof edges.setAttribute !== 'function') return;
    if (!edges.id) edges.id = 'e089-edges';
    setAttr(edges, 'data-e089-edges', '1');

    /* E089-02 — Inventaire des segments et validation des quatre coordonnées. */
    const segments = typeof edges.querySelectorAll === 'function'
      ? Array.from(edges.querySelectorAll('line.const-edge')) : [];
    const AXES = ['x1', 'y1', 'x2', 'y2'];
    const readCoord = (line, attr) => {
      const raw = typeof line.getAttribute === 'function' ? line.getAttribute(attr) : null;
      if (raw === null || String(raw).trim() === '') return NaN;
      const value = Number(raw);
      return Number.isFinite(value) ? value : NaN;
    };
    const isSound = (line) => AXES.every(attr => Number.isFinite(readCoord(line, attr)));
    let invalidCount = 0;
    segments.forEach((line) => {
      if (isSound(line)) {
        if (typeof line.removeAttribute === 'function') line.removeAttribute('data-e089-invalid');
      } else {
        setAttr(line, 'data-e089-invalid', '1');
        invalidCount += 1;
      }
    });
    setAttr(edges, 'data-e089-invalid-count', String(invalidCount));

    /* E089-03 — Bornage des valeurs hors viewBox : 0 ≤ coordonnée ≤ 100. */
    let clampedCount = 0;
    segments.forEach((line) => {
      if (!isSound(line)) return;
      AXES.forEach((attr) => {
        const value = readCoord(line, attr);
        const bounded = Math.max(0, Math.min(100, value));
        if (bounded !== value) {
          setAttr(line, attr, bounded.toFixed(2));
          addClass(line, 'e089-clamped');
          clampedCount += 1;
        }
      });
    });
    setAttr(edges, 'data-e089-clamped-count', String(clampedCount));

    /* E089-04 — Détection des segments dégénérés (longueur quasi nulle). */
    let degenerateCount = 0;
    segments.forEach((line) => {
      if (!isSound(line)) return;
      const dx = readCoord(line, 'x2') - readCoord(line, 'x1');
      const dy = readCoord(line, 'y2') - readCoord(line, 'y1');
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length < 0.5) {
        addClass(line, 'e089-degenerate');
        setAttr(line, 'data-e089-degenerate', length.toFixed(2));
        degenerateCount += 1;
      }
    });
    setAttr(edges, 'data-e089-degenerate-count', String(degenerateCount));

    /* E089-05 — Gardien de viewBox : cadrage et étirement restaurés si absents. */
    const viewBox = typeof edges.getAttribute === 'function' ? edges.getAttribute('viewBox') : null;
    const vbOk = viewBox !== null && /^0\s+0\s+100\s+100$/.test(String(viewBox).trim());
    if (!vbOk) {
      setAttr(edges, 'viewBox', '0 0 100 100');
      setAttr(edges, 'data-e089-viewbox-fixed', '1');
    } else {
      setAttr(edges, 'data-e089-viewbox-fixed', '0');
    }
    const aspect = typeof edges.getAttribute === 'function' ? edges.getAttribute('preserveAspectRatio') : null;
    if (aspect !== 'none') setAttr(edges, 'preserveAspectRatio', 'none');

    /* E089-06 — Rôle décoratif verrouillé sur le tracé et chaque segment. */
    setAttr(edges, 'aria-hidden', 'true');
    setAttr(edges, 'focusable', 'false');
    segments.forEach((line) => {
      setAttr(line, 'focusable', 'false');
      setAttr(line, 'data-e089-decorative', '1');
    });

    /* E089-07 — Rôles explicites : chemin actif et raccords de point, comptés. */
    const hasClass = (node, name) => !!(node && node.classList && typeof node.classList.contains === 'function'
      && node.classList.contains(name));
    const paths = segments.filter(line => hasClass(line, 'is-path'));
    const moons = segments.filter(line => hasClass(line, 'is-moon'));
    setAttr(edges, 'data-e089-path-count', String(paths.length));
    setAttr(edges, 'data-e089-moon-count', String(moons.length));
    paths.forEach((line, index) => {
      setAttr(line, 'data-e089-role', 'chemin-actif');
      if (index === 0 && !line.id) line.id = 'e089-chemin-actif';
    });
    moons.forEach((line) => setAttr(line, 'data-e089-role', 'raccord-point'));
    setAttr(edges, 'data-e089-path-guard', paths.length === 1 ? 'unique' : (paths.length ? 'multiple' : 'absent'));

    /* E089-08 — Trait robuste à l'étirement : largeur non mise à l'échelle. */
    addClass(edges, 'e089-strokes');
    setAttr(edges, 'data-e089-stroke-guard', 'non-scaling');

    /* E089-09 — Mouvement réduit : mode sobre demandé au contexte, sans rAF. */
    if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
      addClass(edges, 'e089-calm');
      setAttr(edges, 'data-e089-reduced', '1');
    } else {
      if (edges.classList && typeof edges.classList.remove === 'function') edges.classList.remove('e089-calm');
      setAttr(edges, 'data-e089-reduced', '0');
    }

    /* E089-10 — Filet de sécurité : annonce live si le chemin est inexploitable. */
    const usable = segments.length - invalidCount;
    const make = typeof ctx.el === 'function' ? ctx.el : null;
    const ensureLive = () => {
      let live = layout.querySelector('#e089-live');
      if (!live) {
        live = make ? make('p', 'e089-sr', '') : document.createElement('p');
        if (!live.id) live.id = 'e089-live';
        setAttr(live, 'role', 'status');
        setAttr(live, 'aria-live', 'polite');
        setAttr(live, 'aria-atomic', 'true');
        layout.appendChild(live);
      }
      return live;
    };
    if (usable <= 0) {
      setAttr(edges, 'data-e089-fallback', '1');
      ensureLive().textContent = 'Aucun lien de connexion fiable à afficher pour cette constellation.';
    } else {
      setAttr(edges, 'data-e089-fallback', '0');
      if (invalidCount > 0 || clampedCount > 0) {
        ensureLive().textContent = `${invalidCount} segment(s) ignoré(s), ${clampedCount} coordonnée(s) recadrée(s) sur ${segments.length}.`;
      }
    }
  } catch (error) {
    /* Dernier garde-fou : une anomalie locale ne doit jamais casser le rendu. */
    return;
  }
});
