import { register } from './registry.js';

/* Lentille E098 — Instrumentation E2E du champ d'étoiles de la vue Constellation.
   Dix chantiers locaux : sélecteurs de test stables, compteurs, signature
   déterministe, trace d'activation, miroir d'état, contrôle de visibilité
   géométrique, exposition des coordonnées, marqueur de montage, contrôle
   d'accessibilité et panneau de synthèse. Zéro réseau, zéro aléa, aucun
   journal d'exécution, aucun minuteur ni boucle d'animation propre. */
register('E098', (ctx) => {
  /* Garde d'entrée : sans layout valide, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;

  try {
    const layout = ctx.layout;
    const doc = layout.ownerDocument;
    if (!doc) return;
    const make = typeof ctx.el === 'function' ? ctx.el : null;
    const css = typeof ctx.css === 'function' ? ctx.css : null;

    /* Feuille de style unique de la lentille : identifiant réservé e098. */
    if (css) {
      css('constellation-e098', `
        #e098-panel {
          display: block; margin: 10px 0 0; padding: 8px 10px;
          border: 1px solid var(--line); border-left: 3px solid var(--gold);
          border-radius: 6px; background: rgba(255,255,255,.02);
          color: var(--muted); font-size: 9px; line-height: 1.6;
          font-variant-numeric: tabular-nums;
        }
        #e098-panel b { color: var(--gold-bright); font-weight: 600; }
        #e098-panel.e098-alerte { border-left-color: #d98b6b; }
        @media (prefers-reduced-motion: reduce) { #e098-panel { transition: none; } }
      `);
    }

    const field = layout.querySelector('.constellation-field');
    if (!field) return;

    const create = (tag, cls, text) => {
      if (make) {
        try { return make(tag, cls, text); } catch { /* repli local ci-dessous */ }
      }
      const node = doc.createElement(tag);
      if (cls) node.className = cls;
      if (text !== undefined) node.textContent = text;
      return node;
    };

    const suns = Array.from(layout.querySelectorAll('.const-sun'));
    const planets = Array.from(layout.querySelectorAll('.const-planet'));
    const moons = Array.from(layout.querySelectorAll('.const-moon'));
    const edges = Array.from(layout.querySelectorAll('.constellation-edges line'));
    const nodes = suns.concat(planets, moons);
    const groups = [['soleil', suns], ['repere', planets], ['point', moons]];
    const trace = [];
    let refreshPanel = () => {};

    const coord = (node, name) => {
      const raw = node.style.getPropertyValue(`--${name}`);
      const value = parseFloat(raw);
      return Number.isFinite(value) ? value : 50;
    };

    const activeRank = (list) => {
      const found = list.findIndex((node) => node.classList.contains('is-active')
        || node.getAttribute('aria-current') === 'true');
      return found >= 0 ? found + 1 : 0;
    };

    /* Signature FNV-1a 32 bits : strictement déterministe, aucune graine aléatoire. */
    const signatureOf = (list) => {
      let acc = 0x811c9dc5;
      list.forEach((node) => {
        const chaine = (node.getAttribute('data-e098-testid') || '') + ':'
          + coord(node, 'x').toFixed(2) + ',' + coord(node, 'y').toFixed(2);
        for (let i = 0; i < chaine.length; i += 1) {
          acc = Math.imul(acc ^ chaine.charCodeAt(i), 0x01000193) >>> 0;
        }
      });
      return acc.toString(36).toUpperCase();
    };

    /* E098-01 — Sélecteurs de test stables sur le champ et chaque nœud. */
    field.setAttribute('data-e098-testid', 'e098-field');
    nodes.forEach((node) => {
      node.setAttribute('data-e098-kind', node.classList.contains('const-sun')
        ? 'soleil' : node.classList.contains('const-planet') ? 'repere' : 'point');
    });
    groups.forEach(([kind, list]) => {
      list.forEach((node, index) => {
        node.setAttribute('data-e098-testid', `e098-${kind}-${index + 1}`);
      });
    });

    /* E098-02 — Compteurs du champ exposés pour les assertions de rendu. */
    field.setAttribute('data-e098-count-suns', String(suns.length));
    field.setAttribute('data-e098-count-planets', String(planets.length));
    field.setAttribute('data-e098-count-moons', String(moons.length));
    field.setAttribute('data-e098-count-edges', String(edges.length));
    field.setAttribute('data-e098-count-nodes', String(nodes.length));

    /* E098-03 — Empreinte déterministe du champ, calculée depuis les positions. */
    field.setAttribute('data-e098-signature', signatureOf(nodes));

    /* E098-04 — Trace d'activation bornée aux cinq derniers clics du champ. */
    field.addEventListener('click', (event) => {
      const cible = event && event.target && event.target.nodeType === 1
        && typeof event.target.closest === 'function'
        ? event.target.closest('[data-e098-testid]') : null;
      if (!cible || !field.contains(cible) || cible === field) return;
      const entree = cible.getAttribute('data-e098-kind') + ':'
        + cible.getAttribute('data-e098-testid').split('-').pop();
      trace.push(entree);
      if (trace.length > 5) trace.shift();
      field.setAttribute('data-e098-trace', trace.join(' > '));
      field.setAttribute('data-e098-state',
        `ere:${activeRank(suns)}|repere:${activeRank(planets)}|point:${activeRank(moons)}`);
      refreshPanel();
    }, true);

    /* E098-05 — Miroir d'état : ère, repère et point actifs, hors lecture du store. */
    field.setAttribute('data-e098-state',
      `ere:${activeRank(suns)}|repere:${activeRank(planets)}|point:${activeRank(moons)}`);
    field.setAttribute('data-e098-trace', 'aucune activation');

    /* E098-06 — Fixture de visibilité : les nœuds hors [0,100] sont signalés. */
    nodes.forEach((node) => {
      const x = coord(node, 'x');
      const y = coord(node, 'y');
      const dansLeCadre = x >= 0 && x <= 100 && y >= 0 && y <= 100;
      node.setAttribute('data-e098-inframe', dansLeCadre ? 'true' : 'false');
    });

    /* E098-07 — Coordonnées déterministes exposées pour l'assertion E2E. */
    nodes.forEach((node) => {
      node.setAttribute('data-e098-xy',
        coord(node, 'x').toFixed(2) + ',' + coord(node, 'y').toFixed(2));
    });

    /* E098-08 — Marqueur de montage : nombre réel de nœuds instrumentés. */
    const instrumentes = nodes.filter((node) => node.hasAttribute('data-e098-testid')).length;
    field.setAttribute('data-e098-instrumented', String(instrumentes));
    field.setAttribute('data-e098-ready', instrumentes === nodes.length && nodes.length > 0 ? 'true' : 'false');

    /* E098-09 — Contrôle d'accessibilité : étiquette absente ou présente. */
    let manquants = 0;
    nodes.forEach((node) => {
      const etiquette = node.getAttribute('aria-label') || node.getAttribute('title')
        || node.getAttribute('data-label');
      const ok = Boolean(etiquette && etiquette.trim());
      if (!ok) manquants += 1;
      node.setAttribute('data-e098-a11y', ok ? 'ok' : 'manquant');
    });
    field.setAttribute('data-e098-a11y-missing', String(manquants));

    /* E098-10 — Panneau de synthèse : métriques lisibles, vivantes et sourcées. */
    if (!layout.querySelector('#e098-panel')) {
      const panel = create('p', '', '');
      if (panel && panel.setAttribute) {
        panel.id = 'e098-panel';
        panel.setAttribute('role', 'status');
        panel.setAttribute('aria-live', 'polite');
        panel.setAttribute('aria-atomic', 'true');
        panel.setAttribute('data-e098-testid', 'e098-panel');
        if (manquants > 0) panel.classList.add('e098-alerte');
        panel.textContent = 'Instrumentation E2E — nœuds : ' + nodes.length
          + ' (soleils ' + suns.length + ', repères ' + planets.length
          + ', points ' + moons.length + ', arêtes ' + edges.length + ') ; signature '
          + signatureOf(nodes) + ' ; état ' + field.getAttribute('data-e098-state')
          + ' ; étiquettes manquantes : ' + manquants + '.';
        refreshPanel = () => {
          panel.textContent = 'Instrumentation E2E — nœuds : ' + nodes.length
            + ' ; signature ' + field.getAttribute('data-e098-signature')
            + ' ; état ' + field.getAttribute('data-e098-state')
            + ' ; trace ' + field.getAttribute('data-e098-trace') + '.';
        };
        const ancre = layout.querySelector('.constellation-caption') || layout;
        ancre.appendChild(panel);
      }
    }
  } catch {
    /* Greffon tolérant : toute anomalie locale est neutralisée sans bruit. */
    return;
  }
});
