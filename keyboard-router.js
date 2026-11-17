/* Routeur clavier unique.
 *
 * Cinq modules écoutaient `document.keydown` et une touche pouvait déclencher
 * deux ou trois actions. Ce routeur intercepte en phase capture et ne distribue
 * l'événement qu'au module visible le plus haut. Les gestionnaires historiques
 * restent en place mais ne reçoivent plus rien : `stopImmediatePropagation`.
 */
(() => {
  'use strict';

  const BUS = window.VECTEMPOREL_KEYS = {
    handle(event) { return route(event); },
  };

  function visible(id) {
    if (!id) return false;
    const node = document.getElementById(id);
    return Boolean(node && !node.hidden);
  }

  function editable(target) {
    return target instanceof HTMLElement && (
      target.isContentEditable
      || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
    );
  }

  function route(event) {
    // Le lecteur est toujours au-dessus ; il gère son propre Échap.
    if (visible('reader-overlay') && event.key === 'Escape') {
      return call('app', event);
    }

    const help = ['story-help', 'solar-help', 'plan-help'].find(visible);
    const active = help
      || (visible('story-overlay') && 'story')
      || (visible('solar-overlay') && 'solar')
      || (visible('spiral-overlay') && 'dragon')
      || (visible('plan-overlay') && 'plan')
      || (visible('globe-overlay') && 'app')
      || 'app';
    return call(active, event);
  }

  function call(name, event) {
    const api = {
      app: () => window.VECTEMPOREL_APP,
      plan: () => window.VECTEMPOREL_PLAN,
      story: () => window.VECTEMPOREL_STORY,
      solar: () => window.VECTEMPOREL_SOLAR,
      dragon: () => window.VECTEMPOREL_DRAGON,
    }[name]?.();
    const handler = api?.handleKey;
    if (typeof handler !== 'function') return;
    event.stopImmediatePropagation();
    handler(event);
  }

  document.addEventListener('keydown', (event) => {
    // La saisie dans un champ doit rester native (recherche, sélecteurs).
    if (editable(event.target)) return;
    route(event);
  }, true);
})();
