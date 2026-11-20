import { register } from './registry.js';

/* Lentille V2 E012 — allègement du coût de rendu des planètes de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau, sans source aléatoire et sans minuteur ni boucle propre.
   Préfixe exclusif : v2e012 (aucune collision avec la passe 1). */
register('E012', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique de la lentille. Les étiquettes éloignées sont atténuées
     par la taille et l'opacité, jamais par la seule couleur. */
  css('constellation-v2-e012', `
.v2e012-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.const-planet{touch-action:manipulation;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
.const-planet::after{pointer-events:none}
[data-v2e012-hover="1"]{outline:2px solid var(--gold-bright);outline-offset:2px}
[data-v2e012-labelbudget="1"] .const-planet[data-v2e012-far="1"]::after{font-size:7px;opacity:.55}
.v2e012-jauge{position:absolute;left:10px;bottom:10px;z-index:13;max-width:min(260px,78vw);
  box-sizing:border-box;padding:6px 8px;border:1px solid var(--gold);border-radius:8px;
  background:var(--surface-2);color:var(--ink);font:10px/1.4 system-ui,sans-serif;
  font-variant-numeric:tabular-nums;pointer-events:none}
@media (prefers-reduced-motion:reduce){.const-planet,[data-v2e012-labelbudget="1"] .const-planet::after{transition:none!important}}
`);

  const layer = layout.querySelector('.const-layer-planets');
  if (!layer) return;

  /* E012-01 — Purge idempotente des marqueurs V2 obsolètes. Avant toute
     écriture, on retire les attributs `data-v2e012-*` résiduels de l'hôte
     et des planètes, ainsi que la jauge et son aide d'un rendu précédent :
     plusieurs passages ne doivent accumuler ni attributs ni nœuds. */
  const purge = node => {
    if (!node || !node.attributes) return;
    const stale = [];
    for (let i = 0; i < node.attributes.length; i += 1) {
      const name = node.attributes[i].name;
      if (name.indexOf('data-v2e012-') === 0) stale.push(name);
    }
    stale.forEach(name => node.removeAttribute(name));
  };
  purge(layout);
  ['#v2e012-jauge', '#v2e012-hint'].forEach(selector => {
    const old = layout.querySelector(selector);
    if (old && old.parentNode) old.parentNode.removeChild(old);
  });
  const planets = Array.from(layer.querySelectorAll('.const-planet'));
  if (!planets.length) return;
  planets.forEach(purge);
  layout.dataset.v2e012Purged = '1';

  /* E012-02 — Lecture groupée puis écritures différées, contre le « layout
     thrashing ». Les positions `--x`/`--y` posées par la vue sont lues en une
     seule passe, sans aucune écriture, avant que les attributs d'audit ne
     soient posés dans une seconde passe. Repli 50/50 si une variable manque. */
  const metrics = planets.map((node, index) => {
    const x = parseFloat(node.style.getPropertyValue('--x'));
    const y = parseFloat(node.style.getPropertyValue('--y'));
    return {
      node,
      index,
      x: Number.isFinite(x) ? x : 50,
      y: Number.isFinite(y) ? y : 50,
    };
  });
  metrics.forEach(m => {
    m.node.dataset.v2e012X = m.x.toFixed(2);
    m.node.dataset.v2e012Y = m.y.toFixed(2);
  });
  layout.dataset.v2e012Batched = '1';

  /* E012-03 — Empreinte géométrique calculée en mémoire : distance au centre
     (50/50) de chaque planète et portée maximale, sans nouvelle lecture du
     DOM. Le calcul est une fonction déterministe des positions déjà lues. */
  let span = 0;
  metrics.forEach(m => {
    const dx = m.x - 50;
    const dy = m.y - 50;
    m.distance = Math.sqrt(dx * dx + dy * dy);
    if (m.distance > span) span = m.distance;
  });
  const roundedSpan = Math.round(span * 10) / 10;
  metrics.forEach(m => {
    m.node.dataset.v2e012Dist = (Math.round(m.distance * 10) / 10).toFixed(1);
  });
  layout.dataset.v2e012Span = roundedSpan.toFixed(1);

  /* E012-04 — Délégation d'événements passive : un seul écouteur de survol
     pour toute la couche, enregistré sous une clé `window` dédiée. Le
     gestionnaire précédent est retiré avant ré-enregistrement, et l'option
     `passive` évite de bloquer le défilement. Aucun minuteur, aucun rAF. */
  const HOVER_KEY = '__v2e012_hover';
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    const previous = window[HOVER_KEY];
    if (typeof previous === 'function' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('pointerover', previous, true);
      window.removeEventListener('pointerout', previous, true);
    }
    const onHover = event => {
      const target = event && event.target;
      const node = target && target.nodeType === 1 && typeof target.closest === 'function'
        ? target.closest('.const-planet') : null;
      if (!node || !layer.contains(node)) return;
      const related = event.relatedTarget;
      if (event.type === 'pointerout' && related && node.contains(related)) return;
      planets.forEach(p => {
        if (p !== node) p.removeAttribute('data-v2e012-hover');
      });
      if (event.type === 'pointerout') node.removeAttribute('data-v2e012-hover');
      else node.dataset.v2e012Hover = '1';
    };
    window[HOVER_KEY] = onHover;
    window.addEventListener('pointerover', onHover, { capture: true, passive: true });
    window.addEventListener('pointerout', onHover, { capture: true, passive: true });
    layout.dataset.v2e012Delegated = '1';
  } else {
    layout.dataset.v2e012Delegated = '0';
  }

  /* E012-05 — Cibles tactiles sans délai : `touch-action: manipulation`
     supprime l'attente du double-tap et allège le traitement des gestes.
     Règle portée par la feuille unique ; marqueur d'audit sur l'hôte. */
  layout.dataset.v2e012Touch = '1';

  /* E012-06 — Sélection de texte et halo tactile désactivés sur les planètes
     (`user-select`, `-webkit-tap-highlight-color` de la feuille unique) :
     un clic rapide ne déclenche plus de repeint de sélection parasite. */
  layout.dataset.v2e012Noselect = '1';

  /* E012-07 — Hit-testing réduit : les étiquettes décoratives `::after` ne
     captent plus le pointeur (feuille unique). La zone de test d'intersection
     se limite au bouton, pas au libellé qui le dépasse largement. */
  layout.dataset.v2e012Hit = '1';

  /* E012-08 — Insertion groupée en fragment : la jauge et son aide sont
     fabriquées hors du document puis insérées en une seule opération, plutôt
     qu'autant d'insertions que de nœuds, afin de limiter les recalculs. */
  const make = (tag, className, text) => {
    const node = typeof ctx.el === 'function'
      ? ctx.el(tag, className, text)
      : document.createElement(tag);
    if (typeof ctx.el !== 'function') {
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
    }
    return node;
  };
  const jauge = make('output', 'v2e012-jauge', '');
  jauge.id = 'v2e012-jauge';
  jauge.setAttribute('role', 'status');
  jauge.setAttribute('aria-live', 'polite');
  jauge.setAttribute('aria-atomic', 'true');
  jauge.setAttribute('aria-label', 'Jauge de rendu des planètes');
  const hint = make('p', 'v2e012-sr', 'Valeurs calculées localement, sans appel réseau ni tirage aléatoire.');
  hint.id = 'v2e012-hint';
  jauge.setAttribute('aria-describedby', hint.id);
  const readout = () => `Planètes : ${planets.length} · portée : ${roundedSpan.toFixed(1)} %`
    + ` · invalidations : ${invalidations} · survol délégué : ${layout.dataset.v2e012Delegated === '1' ? 'oui' : 'non'}.`;

  /* E012-09 — Compteur d'invalidations sans horloge : un `MutationObserver`
     relève les changements de classe et de style des planètes. L'hôte étant
     ascendant du sous-arbre observé, les écritures du callback (attribut de
     l'hôte et texte de la jauge) ne peuvent pas le redéclencher. */
  let invalidations = 0;
  if (typeof MutationObserver === 'function') {
    try {
      const observer = new MutationObserver(records => {
        invalidations += records.length;
        layout.dataset.v2e012Invalidations = String(invalidations);
        jauge.textContent = readout();
      });
      observer.observe(layer, { attributes: true, attributeFilter: ['class', 'style'], subtree: true });
      layout.dataset.v2e012Observed = '1';
    } catch (unsupported) {
      layout.dataset.v2e012Observed = '0';
    }
  } else {
    layout.dataset.v2e012Observed = '0';
  }
  layout.dataset.v2e012Invalidations = String(invalidations);
  jauge.textContent = readout();
  if (typeof document.createDocumentFragment === 'function') {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(jauge);
    fragment.appendChild(hint);
    layout.appendChild(fragment);
  } else {
    layout.appendChild(jauge);
    layout.appendChild(hint);
  }

  /* E012-10 — Budget d'étiquettes : au-delà d'un plafond fixe de planètes,
     les libellés des planètes les plus éloignées du centre sont atténués
     (taille réduite et opacité), jamais seulement recolorés. Seuil et
     sélection déterministes, sans aléa ni mesure horaire. */
  const LABEL_BUDGET = 12;
  const overBudget = planets.length > LABEL_BUDGET;
  if (overBudget) {
    const threshold = roundedSpan * 0.6;
    metrics.forEach(m => {
      if (m.distance > threshold) m.node.dataset.v2e012Far = '1';
    });
    layout.dataset.v2e012Labelbudget = '1';
  } else {
    layout.dataset.v2e012Labelbudget = '0';
  }
});
