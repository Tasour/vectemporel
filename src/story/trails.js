/* Lecteur de récits guidés : logique pure, sans DOM ni horloge.
 * Le récit ne fait que proposer un jalon ; l'application applique l'année
 * et la province, puis affiche le texte. Chaque pas est donc testable. */

export function createTrailPlayer(trails = [], options = {}) {
  const onStep = typeof options.onStep === 'function' ? options.onStep : () => {};
  const onEnd = typeof options.onEnd === 'function' ? options.onEnd : () => {};
  const list = Array.isArray(trails) ? trails : [];
  let current = null;
  let index = 0;

  const clampIndex = (value, total) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.min(Math.max(0, Math.trunc(number)), Math.max(0, total - 1));
  };

  function state() {
    const steps = current?.steps ?? [];
    return {
      active: Boolean(current),
      id: current?.id ?? null,
      title: current?.title ?? '',
      subtitle: current?.subtitle ?? '',
      index,
      total: steps.length,
      step: steps[index] ?? null,
      first: index === 0,
      last: steps.length > 0 && index === steps.length - 1,
    };
  }

  function emit(reason) {
    const snapshot = state();
    if (snapshot.step) onStep(snapshot, reason);
    return snapshot;
  }

  function start(id, stepIndex = 0) {
    const trail = list.find((item) => item.id === id);
    if (!trail || !trail.steps?.length) return null;
    current = trail;
    index = clampIndex(stepIndex, trail.steps.length);
    return emit('start');
  }

  function next() {
    if (!current) return state();
    if (index >= current.steps.length - 1) {
      onEnd(state());
      return state();
    }
    index += 1;
    return emit('next');
  }

  function prev() {
    if (!current || index === 0) return state();
    index -= 1;
    return emit('prev');
  }

  function stop() {
    current = null;
    index = 0;
    return state();
  }

  return {
    start,
    next,
    prev,
    stop,
    state,
    has: (id) => list.some((item) => item.id === id),
    ids: () => list.map((item) => item.id),
  };
}
