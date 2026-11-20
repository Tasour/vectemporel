import { register } from './registry.js';

/* Lentille V2 E015 — Adaptabilité responsive des planètes (seconde passe).
   Dix chantiers inédits, tous locaux et dégradables : aucun appel réseau,
   aucune source aléatoire, aucun minuteur ni boucle d'animation propre. */
register('E015', ctx => {
  /* Garde d'entrée : sans layout courant ni document, aucun ajout au DOM. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Fabrique d'éléments tolérante : repli si ctx.el n'est pas fourni. */
  const fabriquer = (tag, className, text) => {
    if (typeof ctx.el === 'function') return ctx.el(tag, className, text);
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  /* Requête média tolérante : null si l'API manque ou lève une erreur. */
  const media = requete => {
    try {
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        return window.matchMedia(requete);
      }
    } catch { /* API indisponible : valeurs par défaut conservées. */ }
    return null;
  };
  const est = requete => {
    const requeteMedia = media(requete);
    return !!(requeteMedia && requeteMedia.matches);
  };

  /* Feuille unique de la lentille, préfixée constellation-v2-e015. */
  css('constellation-v2-e015', `
  /* v2e015-01 — Le champ devient un conteneur de taille : les règles
     @container ajustent la planète à la largeur réelle du champ. */
  .constellation-field.v2e015-responsive { container-type: inline-size; --v2e015-node: 28px; }
  .constellation-field.v2e015-responsive .const-planet {
    width: var(--v2e015-node) !important;
    height: var(--v2e015-node) !important;
  }
  @container (max-width: 560px) {
    .const-planet { --v2e015-node: 24px; }
  }
  @container (max-width: 420px) {
    .const-planet { --v2e015-node: 20px; }
  }

  /* v2e015-02 — Orientation : en portrait, l'étiquette se resserre. */
  .constellation-field.v2e015-responsive[data-v2e015-orientation="portrait"] .const-planet::after {
    width: 88px; font-size: 7px;
  }

  /* v2e015-03 — Surfaces tactiles : cible d'au moins 44 px et
     suppression du double-tap zoom. */
  .constellation-field.v2e015-responsive[data-v2e015-pointer="tactile"] .const-planet {
    touch-action: manipulation;
  }
  .constellation-field.v2e015-responsive[data-v2e015-pointer="tactile"] .const-planet::before {
    content: ""; position: absolute; left: 50%; top: 50%;
    width: 44px; height: 44px; transform: translate(-50%, -50%);
    border-radius: 50%;
  }

  /* v2e015-04 — Zones de sécurité des écrans encochés, si prises en charge. */
  @supports (padding: env(safe-area-inset-left)) {
    .constellation-field.v2e015-responsive {
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);
      padding-bottom: env(safe-area-inset-bottom);
    }
  }

  /* v2e015-05 — Couleurs forcées : la planète garde un contour explicite. */
  .constellation-field.v2e015-responsive[data-v2e015-forced="1"] .const-planet {
    outline: 2px solid CanvasText; outline-offset: 1px;
  }
  .constellation-field.v2e015-responsive[data-v2e015-forced="1"] .const-planet::after {
    color: CanvasText;
  }

  /* v2e015-06 — Typographie relative : largeur et corps suivent la
     préférence de taille de police du navigateur (rem, pas px). */
  .constellation-field.v2e015-responsive .const-planet::after {
    width: 7.5rem; font-size: .5rem;
  }
  .constellation-field.v2e015-responsive .const-planet {
    font-size: .6rem;
  }

  /* v2e015-07 — Écrans haute densité : traits plus fins pour rester nets. */
  @media (min-resolution: 2dppx) {
    .constellation-field.v2e015-responsive .constellation-edges line { stroke-width: .7; }
    .constellation-field.v2e015-responsive .const-planet::after { font-size: .48rem; }
  }

  /* v2e015-08 — Mode micro sous 320 px : l'étiquette visible devient le
     seul numéro ; le libellé complet reste dans aria-label. */
  @media (max-width: 320px) {
    .constellation-field.v2e015-responsive .const-planet::after {
      content: attr(data-v2e015-court);
      width: 2.2rem; font-size: .55rem;
    }
  }

  /* v2e015-09 — Pastille et annonce du mode de mise en page. */
  .v2e015-mode-chip {
    display: inline-flex; align-items: center;
    min-height: 24px; padding: 2px 8px;
    border: 1px solid var(--line); border-radius: 999px;
    color: var(--muted); font-size: 8px; white-space: nowrap;
  }
  .v2e015-sr {
    position: absolute !important; width: 1px; height: 1px;
    padding: 0; margin: -1px; overflow: hidden;
    clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }

  /* v2e015-10 — Contraste renforcé : contour et libellé accentués. */
  @media (prefers-contrast: more) {
    .constellation-field.v2e015-responsive .const-planet {
      outline: 2px solid var(--gold-bright); outline-offset: 1px;
    }
    .constellation-field.v2e015-responsive .const-planet::after {
      color: var(--gold-bright); font-weight: 600;
    }
  }
  `);

  const champ = layout.querySelector('.constellation-field');
  const planetes = champ ? Array.from(champ.querySelectorAll('.const-planet')) : [];

  /* E015-01 — Activation du conteneur CSS : toutes les règles
     .v2e015-responsive deviennent effectives dès que le champ existe. */
  if (champ) champ.classList.add('v2e015-responsive');

  /* E015-02 — Orientation initiale, mémorisée en attribut lisible. */
  if (champ) {
    champ.setAttribute('data-v2e015-orientation',
      est('(orientation: portrait)') ? 'portrait' : 'paysage');
  }

  /* E015-03 — Nature du pointeur : tactile ou souris, sans supposition. */
  if (champ) {
    champ.setAttribute('data-v2e015-pointer',
      est('(pointer: coarse)') ? 'tactile' : 'souris');
  }

  /* E015-04 — Prise en charge des zones de sécurité (env()). */
  if (champ) {
    let tolerant = false;
    try {
      tolerant = typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
        && CSS.supports('padding', 'env(safe-area-inset-left)');
    } catch { /* repli : aucune zone de sécurité appliquée. */ }
    champ.setAttribute('data-v2e015-safe', tolerant ? '1' : '0');
  }

  /* E015-05 — Mode couleurs forcées du système. */
  if (champ) {
    champ.setAttribute('data-v2e015-forced', est('(forced-colors: active)') ? '1' : '0');
  }

  /* E015-06 — Marqueur de typographie relative (unités rem). */
  if (champ) champ.setAttribute('data-v2e015-typo', 'relative');

  /* E015-07 — Densité de pixels, valeur entière déterministe. */
  if (champ) {
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    champ.setAttribute('data-v2e015-dppx', String(Math.max(1, Math.round(dpr))));
  }

  /* E015-08 — Libellé court (numéro de la planète) pour le mode micro. */
  planetes.forEach(planete => {
    if (!planete || planete.hasAttribute('data-v2e015-court')) return;
    const court = String(planete.textContent || '').trim();
    if (court) planete.setAttribute('data-v2e015-court', court);
  });

  /* E015-09 — Pastille visible et région live : le mode courant est
     annoncé, sans minuteur, via les seuls événements change de matchMedia. */
  let pastille = layout.querySelector('#v2e015-mode-chip');
  if (!pastille) {
    pastille = fabriquer('span', 'v2e015-mode-chip', '');
    pastille.id = 'v2e015-mode-chip';
    pastille.setAttribute('aria-hidden', 'true');
    const legende = layout.querySelector('.constellation-legend');
    (legende || layout).appendChild(pastille);
  }
  let annonce = layout.querySelector('#v2e015-mode-live');
  if (!annonce) {
    annonce = fabriquer('p', 'v2e015-sr', '');
    annonce.id = 'v2e015-mode-live';
    annonce.setAttribute('role', 'status');
    annonce.setAttribute('aria-live', 'polite');
    annonce.setAttribute('aria-atomic', 'true');
    layout.appendChild(annonce);
  }
  const decrireMode = () => {
    const orientation = est('(orientation: portrait)') ? 'portrait' : 'paysage';
    const pointeur = est('(pointer: coarse)') ? 'tactile' : 'souris';
    const contraste = est('(prefers-contrast: more)') ? 'renforcé' : 'normal';
    if (pastille && pastille.isConnected) {
      pastille.textContent = `${orientation} · ${pointeur}`;
    }
    if (annonce && annonce.isConnected) {
      annonce.textContent = `Mise en page ${orientation}, commande ${pointeur}, contraste ${contraste}.`;
    }
  };
  decrireMode();
  const CLE = '__v2e015_media';
  if (typeof window !== 'undefined') {
    const precedents = Array.isArray(window[CLE]) ? window[CLE] : [];
    precedents.forEach(item => {
      try {
        if (item && item.mql && typeof item.mql.removeEventListener === 'function') {
          item.mql.removeEventListener('change', item.handler);
        } else if (item && item.mql && typeof item.mql.removeListener === 'function') {
          item.mql.removeListener(item.handler);
        }
      } catch { /* nettoyage tolérant. */ }
    });
    const suivants = [];
    ['(orientation: portrait)', '(pointer: coarse)', '(prefers-contrast: more)'].forEach(requete => {
      const mql = media(requete);
      if (!mql) return;
      const handler = () => {
        decrireMode();
        if (champ && champ.isConnected) {
          if (requete === '(orientation: portrait)') {
            champ.setAttribute('data-v2e015-orientation', mql.matches ? 'portrait' : 'paysage');
          } else if (requete === '(pointer: coarse)') {
            champ.setAttribute('data-v2e015-pointer', mql.matches ? 'tactile' : 'souris');
          }
        }
      };
      try {
        if (typeof mql.addEventListener === 'function') mql.addEventListener('change', handler);
        else if (typeof mql.addListener === 'function') mql.addListener(handler);
        else return;
        suivants.push({ mql, handler });
      } catch { /* écoute indisponible : l'état initial reste annoncé. */ }
    });
    window[CLE] = suivants;
  }

  /* E015-10 — Préférence de contraste, mémorisée en attribut. */
  if (champ) {
    champ.setAttribute('data-v2e015-contrast',
      est('(prefers-contrast: more)') ? 'renforce' : 'normal');
  }
});
