import { register } from './registry.js';

/* Lentille E079 — Transitions et mouvement.
   Dix enrichissements indépendants et non destructifs de la vue Récit.
   Lecture seule : aucun fichier partagé n'est modifié. Zéro réseau, zéro
   console, zéro aléa. Tout le mouvement est dérivé du DOM déjà rendu et
   respecte prefers-reduced-motion (via reducedMotion() et des règles CSS).

   Mémoire de parcours entre deux rendus : register n'est appelé qu'une fois,
   ces variables de module persistent donc pendant toute la session. */
let e079ClePrecedente = null;
let e079IndexPrecedent = null;

register('E079', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;

  /* Un seul bloc CSS, préfixé, injecté une seule fois via cssOnce. */
  css('recit-e079', `
/* E079-01 — progression lissée. */
.recit-e079-progress{transition:width 520ms cubic-bezier(.22,.61,.36,1)}
/* E079-02 — arrivée du point. */
@keyframes recit-e079-fade-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.recit-e079-enter{animation:recit-e079-fade-up 440ms ease-out both}
.recit-e079-enter-context{animation-delay:110ms}
/* E079-03 — sens de parcours. */
@keyframes recit-e079-nudge-next{from{transform:translateX(-4px)}to{transform:translateX(2px)}}
@keyframes recit-e079-nudge-prev{from{transform:translateX(4px)}to{transform:translateX(-2px)}}
.recit-e079-dir-chip{display:inline-flex;align-items:center;gap:3px;margin-left:8px;color:var(--muted);font-size:9px;white-space:nowrap}
.recit-e079-dir-chip .recit-e079-dir-arrow{display:inline-block;color:var(--gold-bright)}
.recit-e079-dir-next .recit-e079-dir-arrow{animation:recit-e079-nudge-next 620ms ease-out both}
.recit-e079-dir-prev .recit-e079-dir-arrow{animation:recit-e079-nudge-prev 620ms ease-out both}
/* E079-04 — survol et focus du fil. */
.recit-e079-thread-item{transition:transform 170ms ease,background-color 170ms ease,border-color 170ms ease,color 170ms ease}
.recit-e079-thread-item:hover,.recit-e079-thread-item:focus-visible{transform:translateX(2px)}
/* E079-05 — marqueur animé du point courant. */
@keyframes recit-e079-mark-in{from{opacity:0;transform:translateX(-5px)}to{opacity:1;transform:translateX(0)}}
@keyframes recit-e079-mark-pulse{0%,100%{opacity:1}50%{opacity:.35}}
.recit-e079-current-mark{display:inline-block;margin-right:4px;color:var(--gold-bright);font-size:8px;animation:recit-e079-mark-in 380ms ease-out both,recit-e079-mark-pulse 2.4s ease-in-out 380ms infinite}
/* E079-06 — lecture automatique. */
@keyframes recit-e079-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.8)}}
.recit-e079-play-indicator{display:inline-flex;align-items:center;gap:4px;margin-left:10px;color:var(--gold-bright);font-size:9px;white-space:nowrap}
.recit-e079-play-indicator .recit-e079-dot{display:inline-block;animation:recit-e079-pulse 1.15s ease-in-out infinite}
/* E079-07 — fondu d'arrivée du média. */
@keyframes recit-e079-media-in{from{opacity:0;transform:scale(1.015)}to{opacity:1;transform:scale(1)}}
.recit-e079-media img,.recit-e079-media .media-empty{animation:recit-e079-media-in 560ms ease-out both}
/* E079-08 — barre de temps de lecture. */
@keyframes recit-e079-time-fill{from{width:0%}to{width:100%}}
.recit-e079-readbar{height:2px;margin:8px 0 0;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}
.recit-e079-readbar-fill{display:block;height:100%;width:100%;background:var(--gold);animation:recit-e079-time-fill linear both}
.recit-e079-readbar-static .recit-e079-readbar-fill{animation:none;width:100%}
/* E079-09 — micro-interaction des commandes. */
.recit-e079-action{transition:transform 130ms ease,background-color 170ms ease,border-color 170ms ease}
.recit-e079-action:active{transform:scale(.97)}
/* E079-10 — interrupteur mouvement réduit. */
.recit-e079-motion-note{margin-top:9px;color:var(--muted-2);font-size:8px;line-height:1.55}
.recit-e079-motion-note summary{min-height:26px;display:flex;align-items:center;cursor:pointer}
.recit-e079-motion-note summary:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-e079-motion-note p{margin:4px 0}
.recit-e079-motion-off .recit-e079-enter,
.recit-e079-motion-off .recit-e079-media img,
.recit-e079-motion-off .recit-e079-media .media-empty,
.recit-e079-motion-off .recit-e079-readbar-fill,
.recit-e079-motion-off .recit-e079-dir-arrow,
.recit-e079-motion-off .recit-e079-current-mark,
.recit-e079-motion-off .recit-e079-play-indicator .recit-e079-dot,
.recit-e079-motion-off .recit-e079-progress,
.recit-e079-motion-off .recit-e079-thread-item,
.recit-e079-motion-off .recit-e079-action{animation:none!important;transition:none!important}
@media (prefers-reduced-motion:reduce){
  .recit-e079-enter,.recit-e079-media img,.recit-e079-media .media-empty,
  .recit-e079-readbar-fill,.recit-e079-dir-arrow,.recit-e079-current-mark,
  .recit-e079-play-indicator .recit-e079-dot,.recit-e079-progress,
  .recit-e079-thread-item,.recit-e079-action{animation:none!important;transition:none!important}
}
@media (max-width:620px){
  .recit-e079-dir-chip{display:block;margin:4px 0 0}
  .recit-e079-play-indicator{display:block;margin:4px 0 0}
}
`);

  /* Racine sûre : la vue est reconstruite à chaque rendu, on travaille dans le
     fragment courant uniquement. Tout échec local est absorbé. */
  if (typeof document === 'undefined') return;
  const root = (layout && typeof layout.querySelector === 'function')
    ? layout
    : (stage && typeof stage.querySelector === 'function' ? stage : null);
  if (!root) return;

  const q = (selector) => root.querySelector(selector);
  const qa = (selector) => Array.from(root.querySelectorAll(selector));
  const unique = (id) => !document.getElementById(id);
  const safe = (fn) => { try { fn(); } catch (_) { /* neutre : jamais de throw */ } };
  const reduce = (() => {
    try { return typeof reducedMotion === 'function' && !!reducedMotion(); }
    catch (_) { return false; }
  })();

  function insertAfter(node, reference) {
    if (!node || !reference || !reference.parentNode) return;
    reference.parentNode.insertBefore(node, reference.nextSibling);
  }

  function stepInfo() {
    const kicker = String(q('.view-kicker')?.textContent || '');
    const match = kicker.match(/Étape\s+(\d+)\s*\/\s*(\d+)/);
    if (!match) return { index: null, total: null };
    return { index: parseInt(match[1], 10), total: parseInt(match[2], 10) };
  }

  function eventKey() {
    return String(q('.recit-meta')?.textContent || '').split(' · ')[0].trim();
  }

  /* E079-01 — Progression lissée et sémantique de barre de progression. */
  safe(() => {
    const progress = q('.recit-progress');
    const fill = progress && progress.querySelector('span');
    if (!fill) return;
    const step = stepInfo();
    if (step.total !== null && step.index !== null) {
      try {
        progress.setAttribute('role', 'progressbar');
        progress.setAttribute('aria-valuemin', '0');
        progress.setAttribute('aria-valuemax', String(step.total));
        progress.setAttribute('aria-valuenow', String(step.index));
        progress.setAttribute('aria-label', `Progression : étape ${step.index} sur ${step.total}`);
      } catch (_) { /* repli silencieux */ }
    }
    if (reduce) return;
    const width = String((fill.style && fill.style.width) || '');
    if (!/^(\d+(?:\.\d+)?)%$/.test(width)) return;
    fill.classList.add('recit-e079-progress');
    const finalWidth = width;
    fill.style.width = '0%';
    const restore = () => { try { fill.style.width = finalWidth; } catch (_) { /* repli */ } };
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(restore));
    } else if (typeof setTimeout === 'function') {
      setTimeout(restore, 30);
    } else {
      restore();
    }
  });

  /* E079-02 — Fondu d'arrivée du point (titre puis contexte, décalés). */
  safe(() => {
    const title = q('#recit-point-title');
    if (title && title.classList) title.classList.add('recit-e079-enter');
    const context = q('#recit-context');
    if (context && context.classList) {
      context.classList.add('recit-e079-enter', 'recit-e079-enter-context');
    }
  });

  /* E079-03 — Indicateur du sens de parcours, mémorisé entre deux rendus. */
  safe(() => {
    const meta = q('.recit-meta');
    if (!meta || !unique('e079-direction')) return;
    const step = stepInfo();
    const cle = eventKey();
    let dir = 'initial';
    if (e079ClePrecedente === cle && e079IndexPrecedent !== null && step.index !== null) {
      if (step.index > e079IndexPrecedent) dir = 'next';
      else if (step.index < e079IndexPrecedent) dir = 'prev';
      else dir = 'stable';
    }
    e079ClePrecedente = cle;
    e079IndexPrecedent = step.index;

    const labels = {
      next: 'En avant',
      prev: 'En arrière',
      stable: 'Point inchangé',
      initial: 'Repère initial',
    };
    const symboles = { next: '→', prev: '←', stable: '●', initial: '●' };
    const chip = el('span', 'recit-e079-dir-chip recit-e079-dir-' + dir);
    chip.id = 'e079-direction';
    const arrow = el('span', 'recit-e079-dir-arrow', symboles[dir] || '●');
    arrow.setAttribute('aria-hidden', 'true');
    chip.append(arrow, document.createTextNode(' ' + (labels[dir] || 'Repère initial')));
    chip.title = 'Sens du dernier déplacement dans le récit, calculé localement.';
    if (root.dataset) root.dataset.e079Dir = dir;
    meta.appendChild(chip);
  });

  /* E079-04 — Survol et focus animés des items du fil. */
  safe(() => {
    qa('.recit-thread-item').forEach((item) => {
      if (item.classList && !item.classList.contains('recit-e079-thread-item')) {
        item.classList.add('recit-e079-thread-item');
      }
    });
  });

  /* E079-05 — Marqueur animé du point courant dans le fil. */
  safe(() => {
    const current = q('.recit-thread-item.is-current')
      || q('.recit-thread-item[aria-current="step"]');
    if (!current || current.getAttribute('data-e079-current') === '1') return;
    current.classList.add('recit-e079-current');
    const mark = el('span', 'recit-e079-current-mark', '▶');
    mark.setAttribute('aria-hidden', 'true');
    mark.title = 'Point courant du fil.';
    current.prepend(mark);
    current.setAttribute('data-e079-current', '1');
  });

  /* E079-06 — Témoin animé de la lecture automatique en cours. */
  safe(() => {
    const play = q('.recit-play');
    if (!play || play.getAttribute('aria-pressed') !== 'true') return;
    if (!unique('e079-play-indicator')) return;
    const host = q('.recit-timing') || play.parentNode;
    if (!host) return;
    const indicator = el('span', 'recit-e079-play-indicator');
    indicator.id = 'e079-play-indicator';
    const dot = el('span', 'recit-e079-dot', '●');
    dot.setAttribute('aria-hidden', 'true');
    indicator.append(dot, document.createTextNode(' Lecture automatique en cours'));
    host.appendChild(indicator);
  });

  /* E079-07 — Fondu d'arrivée du média lors du changement de repère. */
  safe(() => {
    const media = q('.recit-media');
    if (media && media.classList) media.classList.add('recit-e079-media');
  });

  /* E079-08 — Barre de temps de lecture, cadencée depuis le libellé existant. */
  safe(() => {
    if (!unique('e079-readbar')) return;
    const timing = q('.recit-timing');
    if (!timing) return;
    const match = String(timing.textContent || '').match(/≈\s*(\d+)\s*s/);
    if (!match) return;
    const seconds = parseInt(match[1], 10);
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    const wrap = el('div', 'recit-e079-readbar' + (reduce ? ' recit-e079-readbar-static' : ''));
    wrap.id = 'e079-readbar';
    wrap.setAttribute('aria-hidden', 'true');
    const fill = el('span', 'recit-e079-readbar-fill');
    if (!reduce) {
      try { fill.style.animationDuration = seconds + 's'; } catch (_) { /* repli */ }
    }
    wrap.appendChild(fill);
    insertAfter(wrap, timing);
  });

  /* E079-09 — Retour tactile animé des boutons de commande. */
  safe(() => {
    qa('.recit-actions button').forEach((button) => {
      if (button.classList && !button.classList.contains('recit-e079-action')) {
        button.classList.add('recit-e079-action');
      }
    });
  });

  /* E079-10 — Interrupteur mouvement réduit et note accessible. */
  safe(() => {
    if (reduce && root.classList) root.classList.add('recit-e079-motion-off');
    if (!unique('e079-motion-note')) return;
    const legend = q('.recit-legend');
    if (!legend) return;
    const details = el('details', 'recit-e079-motion-note');
    details.id = 'e079-motion-note';
    details.appendChild(el('summary', '', 'Transitions et mouvement'));
    details.appendChild(el('p', '',
      'Les transitions de cette vue (progression, arrivée du point, fil et média) '
      + 'sont purement visuelles : elles ne modifient ni le contenu ni la navigation.'));
    details.appendChild(el('p', '',
      reduce
        ? 'Mouvement réduit actif : les animations et transitions sont désactivées.'
        : 'Mouvement actif : les animations s’arrêtent automatiquement si la préférence système « réduire les animations » est activée.'));
    legend.appendChild(details);
  });
});
