import { register } from './registry.js';

/* Lentille E012 — performance de rendu appliquée aux planètes de la vue
 * Constellation. Dix chantiers locaux et déterministes : un seul bloc CSS
 * injecté, des attributs `data-e012-*`, un panneau préfixé `e012-` et des
 * nœuds déjà présents dans la couche des planètes. Aucun appel réseau, aucune
 * source aléatoire, aucune écriture dans une console, aucune boucle
 * d'animation propre (ni horloge, ni rAF). Un observateur d'intersection,
 * sans minuteur, suspend les effets hors écran. */

/* Bloc unique de la feuille dédiée `constellation-e012`, injecté une seule
   fois dans le corps du greffon. Il matérialise les chantiers 03, 04, 05,
   06, 07, 08, 09 et 10 côté style. */
const CSS = `
.constellation-layout{position:relative}
/* E012-03 — contention de peinture : la couche et chaque planète deviennent
   des isolates, les repeints ne remontent plus au reste de la vue. */
.const-layer-planets{contain:layout paint style}
.const-planet{contain:layout paint}
/* E012-05 — promotion GPU réservée à la planète active (les autres restent
   sur le chemin logiciel, pour ne pas gaspiller de mémoire de texture). */
.const-planet[data-e012-promote="1"]{will-change:transform;transform:translate(-50%,-50%) translateZ(0)}
/* E012-06 — les planètes hors écran ne sont pas peintes ; une taille
   intrinsèque figée évite tout recalcul de mise en page à leur retour. */
.const-planet{content-visibility:auto;contain-intrinsic-size:28px 28px}
/* E012-04 — mode compact, piloté par l'attribut posé en JS. */
[data-e012-compact="1"] .const-planet::after{letter-spacing:0;font-size:7px}
/* E012-07 — mouvement réduit : aucune transition ni animation surviving. */
[data-e012-still="1"] .const-planet,
[data-e012-still="1"] .const-planet::after{transition:none!important;animation:none!important}
/* E012-09 — hors champ, on suspend la peinture des étiquettes décoratives. */
[data-e012-visible="0"] .const-planet::after{opacity:0;transition:none}
/* E012-10 — économie d'énergie : on éteint les effets coûteux. */
[data-e012-eco="1"] .const-planet::after{text-shadow:none}
/* E012-08 — panneau de métriques, ancré et non intrusif. */
.e012-panel{position:absolute;right:10px;bottom:10px;z-index:12;
  width:min(300px,60vw);box-sizing:border-box;padding:8px 10px;border-radius:10px;
  color:#f5e9d0;background:rgba(8,11,18,.92);border:1px solid rgba(230,185,111,.35);
  box-shadow:0 6px 20px rgba(0,0,0,.45);font:12px/1.45 system-ui,sans-serif}
.e012-title{margin:0 0 6px;color:#e6b96f;font-family:var(--serif,Georgia,serif);
  font-size:13px;font-weight:450}
.e012-toggle{display:block;width:100%;min-height:36px;min-width:36px;margin:0 0 6px;
  padding:6px 8px;border:1px solid rgba(230,185,111,.45);border-radius:6px;
  background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.e012-toggle:hover{background:rgba(230,185,111,.12)}
.e012-panel :focus-visible{outline:2px solid #e6b96f;outline-offset:2px}
.e012-status{margin:6px 0;min-height:3em;color:#e6d3ad;overflow-wrap:anywhere}
.e012-note{margin:6px 0 0;color:var(--muted-2,#9c9382);font-size:10px;line-height:1.4}
@media (max-width:620px){.e012-panel{width:min(300px,88vw)}}
@media (prefers-reduced-motion:reduce){.e012-panel *{transition:none!important}}
`;

/* Libellés français déterministes, sans aléa ni horodatage. */
const DENSITY_LABEL = { low: 'faible', medium: 'moyenne', high: 'forte' };

register('E012', (ctx) => {
  const api = ctx || {};
  const host = api.layout || null;

  /* Contrat : on vérifie `ctx.layout` avant tout ajout au DOM. */
  if (!host || typeof document === 'undefined') return;

  /* Injection CSS unique — feuille dédiée `constellation-e012`, jamais
     partagée, injectée seulement ici après le contrôle de `ctx.layout`. */
  ctx.css('constellation-e012', CSS);

  /* E012-01 — cache du NodeList. Une seule interrogation du DOM, réutilisée
     par tous les chantiers ; le compte est exposé sur l'hôte. */
  const planets = Array.from(host.querySelectorAll('.const-planet'));
  host.dataset.e012Nodes = String(planets.length);

  /* E012-02 — métrique de densité calculée une fois depuis le nombre de
     planètes. Aucune valeur aléatoire : les seuils sont fixes. */
  const density = planets.length > 16 ? 'high' : planets.length > 9 ? 'medium' : 'low';
  host.dataset.e012Density = density;

  /* E012-03 — contention de peinture (styles « contain » dans CSS plus haut).
     On marque l'hôte pour rendre la mesure auditable. */
  host.dataset.e012Contain = '1';

  /* E012-04 — mode compact : sous forte densité ou en économie, on réduit
     la taille de chaque planète via une propriété locale, ce qui surcharge
     la valeur héritée du champ sans toucher au fichier partagé. */
  function applyCompact() {
    const eco = host.dataset.e012Eco === '1';
    const on = density === 'high' || eco;
    host.dataset.e012Compact = on ? '1' : '0';
    planets.forEach((node) => {
      if (on) node.style.setProperty('--const-node-size', '16px');
      else node.style.removeProperty('--const-node-size');
    });
    return on;
  }
  let compact = applyCompact();

  /* E012-05 — promotion GPU ciblée : une seule planète, l'active, reçoit
     l'attribut qui active `will-change`; les autres sont nettoyées. */
  let promoted = 0;
  planets.forEach((node) => {
    const active = node.classList.contains('is-active') || node.hasAttribute('aria-current');
    if (active) {
      node.dataset.e012Promote = '1';
      promoted += 1;
    } else if ('e012Promote' in node.dataset) {
      delete node.dataset.e012Promote;
    }
  });
  host.dataset.e012Promoted = String(promoted);

  /* E012-06 — contenu différé (content-visibility + taille intrinsèque) :
     effet purement CSS, confirmé par un attribut de diagnostic sur l'hôte. */
  host.dataset.e012Deferred = '1';

  /* E012-07 — mouvement réduit, lu dans le contexte fourni par le registre. */
  const still = typeof api.reducedMotion === 'function' && api.reducedMotion() ? '1' : '0';
  host.dataset.e012Still = still;

  /* E012-08 — panneau de métriques : texte sémantique et indexable dans un
     `<output role="status">`, relu à chaque rendu, sans doublon d'identifiant. */
  const make = (tag, className, text) => {
    const node = typeof api.el === 'function'
      ? api.el(tag, className, text)
      : document.createElement(tag);
    if (typeof api.el !== 'function') {
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
    }
    return node;
  };

  const statusText = () => `Planètes : ${planets.length} · densité ${DENSITY_LABEL[density]}`
    + ` · nœud ${compact ? '16 px' : 'hérité'}`
    + ` · promotion GPU : ${promoted}`
    + ` · économie : ${host.dataset.e012Eco === '1' ? 'activée' : 'désactivée'}`;

  let panel = host.querySelector('#e012-panel');
  let status = null;
  let toggle = null;
  if (!panel) {
    panel = make('section', 'e012-panel');
    panel.id = 'e012-panel';
    panel.setAttribute('aria-label', 'Performance de rendu des planètes');

    const title = make('h3', 'e012-title', 'Rendu des planètes');
    title.id = 'e012-title';
    panel.appendChild(title);

    toggle = make('button', 'e012-toggle');
    toggle.id = 'e012-toggle';
    toggle.type = 'button';
    panel.appendChild(toggle);

    status = make('output', 'e012-status', statusText());
    status.id = 'e012-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    panel.appendChild(status);

    const note = make('p', 'e012-note', 'Métriques locales, calculées sans aléa ni appel réseau.');
    note.id = 'e012-note';
    panel.appendChild(note);

    host.appendChild(panel);
  } else {
    status = panel.querySelector('#e012-status');
    toggle = panel.querySelector('#e012-toggle');
  }

  /* E012-10 — bascule « économie d'énergie ». Son état survit au re-render
     complet du shell : il est relu depuis l'attribut de l'hôte. */
  function paintToggle() {
    const on = host.dataset.e012Eco === '1';
    if (toggle) {
      toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
      toggle.textContent = `Économie d’énergie : ${on ? 'activée' : 'désactivée'}`;
    }
    if (status) status.textContent = statusText();
  }

  if (toggle && !toggle.dataset.e012Bound) {
    toggle.dataset.e012Bound = '1';
    toggle.addEventListener('click', () => {
      host.dataset.e012Eco = host.dataset.e012Eco === '1' ? '0' : '1';
      compact = applyCompact();
      paintToggle();
    });
  }
  paintToggle();

  /* E012-09 — observateur d'intersection : pose `data-e012-visible` pour
     suspendre la peinture des étiquettes lorsque le champ sort de l'écran.
     Aucun minuteur ni rAF ; repli silencieux si l'API est absente. */
  const field = host.querySelector('.constellation-field') || host;
  if (typeof IntersectionObserver === 'function') {
    try {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (host.isConnected) host.dataset.e012Visible = entry.isIntersecting ? '1' : '0';
        });
      });
      observer.observe(field);
      if (typeof api.onLeave === 'function') api.onLeave(() => observer.disconnect());
      host.dataset.e012Observed = '1';
    } catch (unsupported) {
      host.dataset.e012Visible = '1';
      host.dataset.e012Observed = '0';
    }
  } else {
    host.dataset.e012Visible = '1';
    host.dataset.e012Observed = '0';
  }
});
