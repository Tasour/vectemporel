import { register } from './registry.js';

/* Lentille M08 — IntersectionObserver et cycle de vie de la vue (domaine A,
 * rendu WebGL). Dix chantiers M08-01 … M08-10, tous implémentés ici.
 *
 * La décision de rendu reste dans src/views/globe.js : inView (16),
 * engineRunning (17) et syncEngine() (153-169), alimentés par l'observateur
 * canonique (283-290). Cette lentille n'introduit aucune deuxième source de
 * vérité : elle observe, stabilise et réveille. Elle n'appelle jamais
 * engine.open() ni engine.close() (propriété de syncEngine), n'a aucun timer,
 * aucune boucle rAF récurrente, aucun réseau, aucun aléa, aucun journal.
 *
 * M07 possède document.hidden et la phase rAF ; M08 possède la présence dans
 * le viewport. Les marqueurs des deux lentilles sont disjoints.
 */

const CSS_ID = 'monde-m08';
const READOUT_ID = 'm08-lifecycle';
const ENTER_RATIO = 0.05;
const LEAVE_RATIO = 0.01;
const THRESHOLDS = [0, 0.01, 0.05, 0.25, 0.5];
const ANNOUNCE_GAP_MS = 1500;

/* M08-10 : état par host persistant, garde d'idempotence entre rendus. */
const weak = new WeakMap();
let readyHooked = false;

function slot(host) {
  let s = weak.get(host);
  if (!s) {
    s = {
      ratio: 0,
      rawVisible: false,
      settledVisible: false,
      docVisible: !document.hidden,
      reduced: false,
      intent: null,
      wakeups: 0,
      pending: null,
      raf: 0,
      lastAnnounce: 0,
      observer: null,
      docListener: null,
      mutation: null,
      nodes: {},
    };
    weak.set(host, s);
  }
  return s;
}

/* M08-06 : accès défensif au moteur, jamais de console en repli. */
function engineApi() {
  const api = window.VECTEMPOREL_GLOBE;
  return api && api.ready ? api : null;
}

function node(host, parent, key, factory) {
  const s = slot(host);
  let n = s.nodes[key];
  if (!n || !n.isConnected) {
    n = factory();
    s.nodes[key] = n;
  }
  if (n.parentNode !== parent) parent.appendChild(n);
  return n;
}

register('M08', (ctx) => {
  const { host, scene, el, css, say, reducedMotion } = ctx;
  if (!host || !scene) return;

  const make = (tag, className) => {
    if (typeof el === 'function') return el(tag, className);
    const n = document.createElement(tag);
    if (className) n.className = className;
    return n;
  };

  /* M08-01 : style isolé, aucun fichier partagé, aucun sélecteur de test. */
  if (typeof css === 'function') {
    css(CSS_ID, `
      .m08-lifecycle{
        position:absolute;left:10px;bottom:10px;z-index:6;
        max-width:min(48ch,62%);box-sizing:border-box;
        font-size:11px;line-height:1.4;
        padding:6px 9px;border-radius:8px;
        background:rgba(12,14,20,.74);color:#d7d3c8;
        border:1px solid rgba(230,185,111,.3);
        pointer-events:none;user-select:none;
      }
      @media (max-width:620px){.m08-lifecycle{max-width:74%;font-size:10px}}
      @media (prefers-reduced-motion:reduce){.m08-lifecycle{transition:none}}
    `);
  }

  const s = slot(host);
  s.reduced = !!(typeof reducedMotion === 'function' && reducedMotion());
  s.docVisible = !document.hidden;

  /* M08-01 / M08-09 : témoin live dédié, indépendant de #globe-live (M20). */
  const readout = node(host, scene, 'readout', () => {
    const n = make('p', 'm08-lifecycle');
    n.id = READOUT_ID;
    n.setAttribute('role', 'status');
    n.setAttribute('aria-live', 'polite');
    n.setAttribute('aria-atomic', 'true');
    return n;
  });

  function paint() {
    const api = engineApi();
    const running = host.dataset.globeActive === '1';
    host.dataset.m08Engine = api ? 'ready' : 'absent';
    host.dataset.m08Visibility = s.settledVisible ? 'visible' : 'hidden';
    host.dataset.m08Document = s.docVisible ? 'visible' : 'hidden';
    host.dataset.m08Wakeups = String(s.wakeups);
    if (api && typeof api.getInfo === 'function') {
      const info = api.getInfo();
      if (info && typeof info.pixelRatio === 'number') {
        host.dataset.m08Pixelratio = String(info.pixelRatio);
      }
    }
    const place = s.settledVisible
      ? 'globe à l’écran'
      : 'globe hors écran · rendu suspendu';
    const tab = s.docVisible
      ? 'onglet actif'
      : 'onglet masqué · rendu suspendu';
    const motor = api
      ? 'moteur prêt'
      : 'moteur 3D indisponible · sélection par la liste';
    const phase = s.reduced
      ? 'reprise statique'
      : running ? 'rendu en cours' : 'rendu arrêté';
    const phrase = `${motor} · ${place} · ${tab} · ${phase} · réveils : ${s.wakeups}.`;
    if (readout.textContent !== phrase) readout.textContent = phrase;
  }

  /* M08-09 : annonce seulement sur suspension stabilisée, throttlée, et dans
     le témoin dédié — #globe-live reste la propriété de la navigation (M20). */
  function announceSuspension(where) {
    const now = performance.now();
    if (now - s.lastAnnounce < ANNOUNCE_GAP_MS) return;
    s.lastAnnounce = now;
    if (typeof say === 'function') {
      say(where === 'document'
        ? 'Onglet masqué : rendu du globe suspendu.'
        : 'Globe hors écran : rendu suspendu.');
    }
  }

  /* M08-05 : point de réveil. Le moteur peut s'arrêter seul au repos après
     IDLE_FRAMES_BEFORE_STOP sans que engineRunning ne change ; invalidate()
     réarme dirty + horloge sans rouvrir la scène. */
  function commit(visible) {
    if (visible === s.settledVisible) return;
    s.settledVisible = visible;
    paint();
    if (!visible) {
      announceSuspension('viewport');
      return;
    }
    if (host.dataset.globeActive === '1' && !s.reduced) {
      const api = engineApi();
      if (api && typeof api.invalidate === 'function') {
        api.invalidate();
        s.wakeups += 1;
        paint();
      }
    }
  }

  /* M08-04 : une seule frame d'antirebond par transition, jamais de boucle. */
  function settle(raw) {
    if (raw === s.pending) return;
    s.pending = raw;
    if (s.raf) cancelAnimationFrame(s.raf);
    s.raf = requestAnimationFrame(() => {
      s.raf = 0;
      commit(s.pending);
    });
  }

  /* M08-02 : observateur de mesure multi-seuils. Il ne pilote pas syncEngine :
     il publie un état stabilisé (maximum du lot + hystérésis) pour le témoin
     et le réveil. Aucun open()/close() ici. */
  if (s.observer) s.observer.disconnect();
  if (s.raf) {
    cancelAnimationFrame(s.raf);
    s.raf = 0;
  }
  s.pending = null;
  if ('IntersectionObserver' in window) {
    s.observer = new IntersectionObserver((entries) => {
      let max = 0;
      for (let i = 0; i < entries.length; i += 1) {
        const entry = entries[i];
        if (entry.isIntersecting && entry.intersectionRatio > max) {
          max = entry.intersectionRatio;
        }
      }
      s.ratio = max;
      let raw;
      if (max >= ENTER_RATIO) raw = true;
      else if (max <= LEAVE_RATIO) raw = false;
      else raw = s.rawVisible; // zone morte : conservation de l'état
      s.rawVisible = raw;
      settle(raw);
    }, { threshold: THRESHOLDS });
    s.observer.observe(host);
  } else {
    /* Repli sans IO : le marqueur canonique data-globe-active fait foi. */
    s.rawVisible = true;
    s.settledVisible = true;
  }

  /* M08-03 : mesure de la visibilité du document only ; le nudge au retour
     appartient à M07, il n'est pas dupliqué ici. */
  if (s.docListener) document.removeEventListener('visibilitychange', s.docListener);
  s.docListener = () => {
    s.docVisible = !document.hidden;
    paint();
    if (!s.docVisible) announceSuspension('document');
  };
  document.addEventListener('visibilitychange', s.docListener);

  /* M08-07 : miroir synchrone de la décision de syncEngine(). Le greffon lit
     data-globe-active, il ne le réécrit jamais. */
  if (s.mutation) s.mutation.disconnect();
  s.mutation = new MutationObserver(() => {
    paint();
    const intent = host.dataset.globeActive === '1';
    if (intent !== s.intent) {
      s.intent = intent;
      /* Sortie de vue : l'IO signale le détachement en retard, on stabilise
         la mesure dès la mutation pour ne pas afficher « à l'écran ». */
      if (!intent && s.settledVisible) {
        s.settledVisible = false;
        paint();
      }
    }
  });
  s.mutation.observe(host, {
    attributes: true,
    attributeFilter: ['data-globe-active'],
  });

  /* M08-06 : un seul callback onReady, enregistré sous garde module malgré
     les rendus successifs ; payload incomplet ignoré sans erreur. */
  if (!readyHooked && typeof ctx.onReady === 'function') {
    readyHooked = true;
    ctx.onReady((payload) => {
      if (payload && payload.engine && payload.engine.ready) paint();
    });
  }

  /* M08-08 : la préférence est relue à chaque rendu ; entre deux rendus,
     globe-engine.js gère onMotionChange (317-327). */
  paint();
});
