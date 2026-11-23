/* Runtime local du profil scrollytelling : une seule boucle rAF,
 * IntersectionObserver, pause sur document.hidden, clavier et nettoyage.
 * Deux profils : jalons datés (Chronas) et sections d'article (Wikipédia). */
export function createScrolly(host, { onYear = () => {} } = {}) {
  const steps = [...host.querySelectorAll('[data-scrolly-step]')];
  const bar = host.querySelector('.scrolly-progress i');
  const readout = host.querySelector('.scrolly-readout, [data-scrolly-readout]');
  const yearNode = host.querySelector('.scrolly-year');
  const marker = host.querySelector('.scrolly-marker');
  const figures = [...host.querySelectorAll('[data-wiki-image]')];
  const caption = host.querySelector('.wiki-figure-caption');
  if (!steps.length) return { destroy() {}, current: () => 0 };

  let active = 0;
  let target = 0;
  let raf = null;
  let hidden = document.hidden;
  let manualUntil = 0;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function tick() {
    raf = null;
    target += (active - target) * (reduce ? 1 : 0.12);
    const ratio = target / Math.max(1, steps.length - 1);
    if (bar) bar.style.width = `${(100 * ratio).toFixed(1)}%`;
    if (marker) {
      const x = 40 + ratio * 720;
      marker.setAttribute('x1', String(x));
      marker.setAttribute('x2', String(x));
    }
    if (Math.abs(active - target) > 0.002 && !hidden) raf = requestAnimationFrame(tick);
  }
  function schedule() { if (raf === null && !hidden) raf = requestAnimationFrame(tick); }

  function setStep(index, { scroll = false, manual = false } = {}) {
    active = Math.max(0, Math.min(steps.length - 1, index));
    if (manual) manualUntil = Date.now() + 500;
    steps.forEach((node, position) => {
      if (position === active) node.setAttribute('aria-current', 'step');
      else node.removeAttribute('aria-current');
    });
    const step = steps[active];
    const rawYear = step.dataset.year;
    const year = rawYear === undefined ? null : Number(rawYear);
    const progression = Math.round(100 * active / Math.max(1, steps.length - 1));
    if (readout) {
      const when = year === null ? '' : ` — ${year < 0 ? `${-year} av. J.-C.` : `${year} apr. J.-C.`}`;
      readout.textContent = `Étape ${active + 1} sur ${steps.length} — ${step.dataset.title || ''}${when} — progression ${progression} %`;
    }
    if (yearNode) yearNode.textContent = year === null ? String(active + 1) : year < 0 ? `−${-year}` : String(year);
    if (figures.length) {
      figures.forEach((figure, position) => { figure.hidden = position !== active; });
      if (caption) caption.textContent = step.dataset.caption || step.dataset.title || '';
    }
    if (scroll) step.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    if (year !== null && Number.isFinite(year)) onYear(year, active);
    schedule();
  }

  const io = new IntersectionObserver((entries) => {
    if (Date.now() < manualUntil) return;
    const visible = entries.filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) setStep(steps.indexOf(visible.target));
  }, {
    rootMargin: innerWidth < 900 ? '-12% 0px -38% 0px' : '-30% 0px -30% 0px',
    threshold: [0, 0.25, 0.5, 0.75, 1],
  });
  for (const step of steps) io.observe(step);

  const onKey = (event) => {
    if (event.key === 'ArrowDown' || event.key === ' ') { event.preventDefault(); setStep(active + 1, { scroll: true, manual: true }); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setStep(active - 1, { scroll: true, manual: true }); }
  };
  host.addEventListener('keydown', onKey);
  const onVisibility = () => { hidden = document.hidden; if (!hidden) schedule(); };
  document.addEventListener('visibilitychange', onVisibility);
  if (document.fonts?.ready) document.fonts.ready.then(() => setStep(active));
  setStep(0);

  return {
    current: () => active,
    setStep,
    destroy() {
      io.disconnect();
      host.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      if (raf !== null) cancelAnimationFrame(raf);
    },
  };
}
