import { register } from './registry.js';

/* Lentille E056 — gestion de l'état appliquée au focus et à la tabulation
   de la vue Constellation. Snapshot dérivé du DOM, historique borné,
   transitions de focus et miroir textuel : tout est local et déterministe. */
register('E056', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  if (typeof ctx.css !== 'function') return;
  const layout = ctx.layout;
  if (typeof layout.querySelector !== 'function'
      || typeof layout.setAttribute !== 'function'
      || !layout.dataset || typeof layout.dataset !== 'object') return;

  /* Feuille unique de la lentille ; le mode sobre est géré au chantier 10. */
  ctx.css('constellation-e056', `
.e056-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.e056-back{min-height:36px;padding:0 10px;margin:8px 0 0;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--ink-soft);font-size:9px;cursor:pointer}
.e056-back:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e056-back[disabled]{opacity:.45;cursor:default}
.constellation-layout button.const-planet[data-e056-focused="true"],.constellation-layout button.const-moon[data-e056-focused="true"]{outline:2px solid var(--gold-bright);outline-offset:3px;z-index:6}
.e056-mirror{margin:6px 0 0;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums;transition:color .15s ease}
.constellation-layout[data-e056-tabdir="avant"] .e056-mirror::after{content:" · Tab avant"}
.constellation-layout[data-e056-tabdir="arriere"] .e056-mirror::after{content:" · Tab arrière"}
.e056-still .e056-mirror,.e056-still .e056-back{transition:none}
@media (prefers-reduced-motion: reduce){.e056-mirror,.e056-back{transition:none!important}}
`);

  const field = layout.querySelector('.constellation-field');
  if (!field || typeof field.querySelectorAll !== 'function'
      || typeof field.addEventListener !== 'function'
      || typeof field.contains !== 'function') return;

  const make = typeof ctx.el === 'function' ? ctx.el : (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  /* Lecture unique des arrêts de la scène dans l'ordre réel du DOM. */
  const collect = () => Array.from(field.querySelectorAll('button[data-const-key]'));

  const family = (node) => {
    const classes = node && node.classList ? node.classList : null;
    if (classes && classes.contains('const-sun')) return 'ère';
    if (classes && classes.contains('const-planet')) return 'repère';
    if (classes && classes.contains('const-moon')) return 'point';
    return 'arrêt';
  };

  /* État local unique : toute mutation passe par publish(). */
  const state = {
    version: 0,
    keys: [],
    count: 0,
    phase: 'hors-scène',
    activeKey: '',
    activeOrder: 0,
    transition: 'aucune',
    tabDir: 'aucune',
    tabCount: 0,
    history: [],
    drift: 'à jour',
    invariant: 'ok',
    motion: 'animée',
  };

  let mirror = null;
  let live = null;
  let back = null;

  function updateMirror() {
    if (!mirror) return;
    const rang = state.activeOrder > 0 ? `${state.activeOrder}/${state.count}` : '—';
    mirror.textContent = `État du focus — phase ${state.phase} · arrêt ${rang} · transition ${state.transition} · tabulations ${state.tabCount} · dérive ${state.drift} · invariant ${state.invariant} · historique ${state.history.length}`;
  }

  function publish() {
    layout.dataset.e056Version = String(state.version);
    layout.dataset.e056Phase = state.phase;
    layout.dataset.e056Transition = state.transition;
    layout.dataset.e056Tabdir = state.tabDir;
    layout.dataset.e056Tabcount = String(state.tabCount);
    layout.dataset.e056Drift = state.drift;
    layout.dataset.e056Invariant = state.invariant;
    layout.dataset.e056History = state.history.length ? state.history.join('>') : 'vide';
    layout.dataset.e056Active = state.activeKey || 'aucun';
    layout.dataset.e056Motion = state.motion;
    if (back) back.disabled = state.history.length < 2;
    updateMirror();
  }

  function pushHistory(key) {
    if (!key) return;
    if (state.history[state.history.length - 1] === key) return;
    state.history.push(key);
    if (state.history.length > 8) state.history.shift();
  }

  function checkDrift() {
    const liveKeys = collect().map(node => node.dataset.constKey || '');
    state.count = liveKeys.length;
    state.drift = liveKeys.length === state.keys.length
      && liveKeys.every((key, index) => key === state.keys[index]) ? 'à jour' : 'obsolète';
  }

  function checkInvariant() {
    let anomalies = 0;
    ['const-sun', 'const-planet', 'const-moon'].forEach((cls) => {
      let actifs = 0;
      collect().forEach((node) => {
        const classes = node.classList;
        if (classes && classes.contains(cls)
            && (classes.contains('is-active') || node.getAttribute('aria-current') === 'true')) {
          actifs += 1;
        }
      });
      if (actifs > 1) anomalies += 1;
    });
    state.invariant = anomalies > 0 ? 'anomalie' : 'ok';
  }

  /* E056-01 — Instantané d'état : une seule lecture de la scène, versionnée. */
  const initial = collect();
  state.keys = initial.map(node => node.dataset.constKey || '');
  state.count = initial.length;
  state.version += 1;
  publish();

  /* E056-02 — Registre des arrêts : identifiant, rang et famille par bouton. */
  initial.forEach((node, index) => {
    node.dataset.e056Id = node.dataset.constKey || `arret:${index}`;
    node.dataset.e056Order = String(index + 1);
    node.dataset.e056Group = family(node);
  });

  /* E056-03 — Détection de dérive : le snapshot est comparé au DOM vivant. */
  checkDrift();
  publish();

  /* E056-04 — Historique borné : huit clés au plus, dédupliquées, avec amorce. */
  const seed = initial.find(node => node.classList && node.classList.contains('is-active'));
  if (seed) pushHistory(seed.dataset.constKey || '');
  publish();

  /* E056-05 — Bouton de retour : restitue le focus de l'arrêt précédent. */
  if (field.parentNode && typeof field.parentNode.insertBefore === 'function'
      && !layout.querySelector('#e056-back')) {
    back = make('button', 'e056-back', '← Focus précédent');
    back.id = 'e056-back';
    back.type = 'button';
    if (!field.id) field.id = 'e056-scene';
    back.setAttribute('aria-controls', field.id);
    back.addEventListener('click', () => {
      const predecessor = state.history[state.history.length - 2];
      const target = predecessor
        ? collect().find(node => (node.dataset.constKey || '') === predecessor) : null;
      if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
    });
    field.parentNode.insertBefore(back, field);
  }
  publish();

  /* E056-06 — Machine à transitions : entrée, interne, sortie, vocalisées. */
  live = make('p', 'e056-sr', '');
  live.id = 'e056-live';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  layout.appendChild(live);

  const resolveStop = (target) => {
    if (!target || target.nodeType !== 1 || typeof target.closest !== 'function') return null;
    const node = target.closest('button[data-const-key]');
    return node && field.contains(node) ? node : null;
  };
  const labels = { entree: 'entrée dans la scène', interne: 'changement d’arrêt', sortie: 'sortie de la scène' };

  field.addEventListener('focusin', (event) => {
    const node = resolveStop(event && event.target);
    if (!node) return;
    const key = node.dataset.constKey || '';
    state.transition = state.activeKey && state.activeKey !== key ? 'interne' : 'entree';
    state.phase = 'dans-scene';
    state.activeKey = key;
    const order = parseInt(node.dataset.e056Order || '0', 10);
    state.activeOrder = Number.isFinite(order) ? order : 0;
    collect().forEach((other) => other.removeAttribute('data-e056-focused'));
    node.setAttribute('data-e056-focused', 'true');
    pushHistory(key);
    checkDrift();
    checkInvariant();
    publish();
    live.textContent = `${family(node)} ${state.activeOrder}/${state.count} — ${labels[state.transition] || state.transition}.`;
  });

  field.addEventListener('focusout', (event) => {
    const next = event && event.relatedTarget;
    if (next && field.contains(next)) return;
    state.phase = 'hors-scene';
    state.transition = 'sortie';
    publish();
  });

  /* E056-07 — État de direction : chaque Tab est compté et orienté. */
  layout.addEventListener('keydown', (event) => {
    if (!event || event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
    state.tabDir = event.shiftKey ? 'arriere' : 'avant';
    state.tabCount += 1;
    publish();
  }, true);

  /* E056-08 — Invariant d'activation : au plus un élu par famille. */
  checkInvariant();
  publish();

  /* E056-09 — Miroir textuel : l'état est lisible sans outil de développement. */
  const caption = layout.querySelector('.constellation-caption');
  mirror = make('p', 'e056-mirror', '');
  mirror.id = 'e056-mirror';
  if (caption && typeof caption.appendChild === 'function') caption.appendChild(mirror);
  else layout.appendChild(mirror);
  updateMirror();

  /* E056-10 — Mode sobre : la préférence devient un état publié, sans animation. */
  let still = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { still = !!ctx.reducedMotion(); }
    catch { still = false; }
  }
  state.motion = still ? 'calme' : 'animée';
  if (layout.classList) {
    if (still) layout.classList.add('e056-still');
    else layout.classList.remove('e056-still');
  }
  publish();
});
