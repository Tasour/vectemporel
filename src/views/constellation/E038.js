import { register } from './registry.js';

/* Lentille E038 — Instrumentation E2E appliquée aux arêtes du graphe de la vue
   Constellation. Dix chantiers concrets et variés : sélecteurs de test,
   empreinte déterministe, compteurs catégoriels, bus d'événements, journal de
   trace, panneau HUD live, ancres stables, mesures géométriques, mode de
   surlignage et instantané d'état. Greffon tolérant : aucune exception, aucun
   réseau, aucun aléa, aucun timer, aucune boucle d'animation propre. */
register('E038', (ctx) => {
  /* Garde d'entrée : le conteneur de la vue est obligatoire avant tout ajout DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;

  try {
    const layout = ctx.layout;
    const doc = layout.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc || typeof doc.createElement !== 'function') return;

    const make = typeof ctx.el === 'function' ? ctx.el : null;
    const css = typeof ctx.css === 'function' ? ctx.css : null;

    function node(tag, cls, text) {
      if (make) return make(tag, cls, text);
      const n = doc.createElement(tag);
      if (cls) n.className = cls;
      if (text !== undefined) n.textContent = text;
      return n;
    }

    const caption = layout.querySelector('.constellation-caption') || layout;
    const svg = typeof layout.querySelector === 'function'
      ? layout.querySelector('svg.constellation-edges') : null;
    const edges = svg && typeof svg.querySelectorAll === 'function'
      ? Array.from(svg.querySelectorAll('line.const-edge')) : [];

    /* Feuille de style unique, identifiant réservé à cette lentille. */
    if (css) {
      css('constellation-e038', `
        /* E038-06 — panneau HUD d'instrumentation, voisin de la légende. */
        #e038-hud {
          margin-top: 10px; padding: 8px 10px;
          border: 1px solid var(--line); border-radius: 8px;
          background: var(--surface-2); color: var(--muted);
          font-size: 10px; line-height: 1.55; font-variant-numeric: tabular-nums;
        }
        #e038-hud-title {
          display: block; color: var(--gold); font-weight: 600;
          letter-spacing: .1em; text-transform: uppercase;
        }
        #e038-metrics { color: var(--muted-2); }
        /* E038-05 — journal de trace bornée. */
        #e038-trace { margin: 6px 0 0; padding-left: 16px; color: var(--violet); }
        /* E038-09 — bouton de bascule du mode surlignage. */
        #e038-toggle {
          min-width: 36px; min-height: 36px; margin: 6px 8px 0 0;
          padding: 6px 10px; border: 1px solid var(--violet); border-radius: 6px;
          background: transparent; color: var(--violet);
          font: inherit; font-size: 10px; cursor: pointer;
        }
        #e038-toggle:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
        #e038-toggle[aria-pressed="true"] { background: var(--violet); color: var(--bg); }
        /* E038-09 — surlignage des arêtes en mode test. */
        .e038-highlight .constellation-edges line.const-edge {
          stroke: var(--gold-bright); stroke-width: 2.4;
        }
        /* E038-10 — instantané machine, masqué mais présent dans le DOM. */
        #e038-snapshot {
          position: absolute; width: 1px; height: 1px; overflow: hidden;
          clip: rect(0 0 0 0); white-space: nowrap; border: 0; padding: 0; margin: -1px;
        }
        @media (prefers-reduced-motion: reduce) { #e038-toggle { transition: none; } }
      `);
    }

    const aClass = (line, name) => !!(line && line.classList && line.classList.contains(name));

    /* E038-01 — Sélecteurs de test stables posés sur chaque arête. */
    edges.forEach((line, i) => {
      line.setAttribute('data-e038-index', String(i));
      line.setAttribute('data-testid', 'e038-edge-' + i);
    });

    /* E038-02 — Empreinte déterministe du graphe (FNV-1a sur x1,y1,x2,y2,class). */
    function empreinte(list) {
      let h = 2166136261;
      const source = list.map((line) => [
        line.getAttribute('x1'), line.getAttribute('y1'),
        line.getAttribute('x2'), line.getAttribute('y2'),
        line.getAttribute('class'),
      ].join(',')).join(';');
      for (let i = 0; i < source.length; i += 1) {
        h = Math.imul(h ^ source.charCodeAt(i), 16777619) >>> 0;
      }
      return h.toString(16).padStart(8, '0');
    }
    const signature = empreinte(edges);
    if (svg) svg.setAttribute('data-e038-signature', signature);

    /* E038-03 — Compteurs catégoriels exposés en attributs de l'SVG. */
    const total = edges.length;
    const actives = edges.filter((l) => aClass(l, 'is-path')).length;
    const lunaires = edges.filter((l) => aClass(l, 'is-moon')).length;
    const latentes = total - actives;
    if (svg) {
      svg.setAttribute('data-e038-total', String(total));
      svg.setAttribute('data-e038-active', String(actives));
      svg.setAttribute('data-e038-moon', String(lunaires));
      svg.setAttribute('data-e038-latent', String(latentes));
    }

    /* E038-04 — Bus d'événements : signal de disponibilité + sonde idempotente. */
    const EventCtor = doc.defaultView && doc.defaultView.CustomEvent
      ? doc.defaultView.CustomEvent
      : (typeof CustomEvent !== 'undefined' ? CustomEvent : null);
    if (svg && EventCtor) {
      svg.setAttribute('data-e038-probes', '0');
      svg.addEventListener('e038:edges-probe', () => {
        const n = parseInt(svg.getAttribute('data-e038-probes') || '0', 10) || 0;
        svg.setAttribute('data-e038-probes', String(n + 1));
      });
      svg.dispatchEvent(new EventCtor('e038:edges-ready', {
        detail: { total, actives, lunaires, signature },
      }));
    }

    /* E038-05 — Journal de trace bornée des interactions avec les nœuds. */
    const trace = [];
    const traceNode = node('ol', 'e038-trace');
    traceNode.id = 'e038-trace';
    traceNode.setAttribute('aria-label', 'Journal des interactions E2E');
    function enregistrer(libelle) {
      trace.push(libelle);
      while (trace.length > 8) trace.shift();
      traceNode.textContent = '';
      trace.forEach((entree) => {
        const li = node('li', '', entree);
        traceNode.appendChild(li);
      });
      if (svg) svg.setAttribute('data-e038-trace', trace.join(' | '));
    }
    layout.addEventListener('click', (event) => {
      const cible = event.target;
      const noeud = cible && typeof cible.closest === 'function'
        ? cible.closest('[data-const-key]') : null;
      if (noeud && layout.contains(noeud)) {
        enregistrer('clic:' + (noeud.getAttribute('data-const-key') || '?'));
      }
    }, true);
    enregistrer('init:graphe');

    /* E038-06 — Panneau HUD live : métriques, empreinte et mode de mouvement. */
    const hud = node('div', 'e038-hud');
    hud.id = 'e038-hud';
    const titre = node('strong', 'e038-hud-title', 'Instrumentation E2E — arêtes');
    titre.id = 'e038-hud-title';
    const metriques = node('span', 'e038-metrics', '');
    metriques.id = 'e038-metrics';
    metriques.setAttribute('role', 'status');
    metriques.setAttribute('aria-live', 'polite');
    metriques.setAttribute('aria-atomic', 'true');
    hud.appendChild(titre);
    hud.appendChild(metriques);
    hud.appendChild(traceNode);
    caption.appendChild(hud);
    const reduit = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
    layout.setAttribute('data-e038-motion', reduit ? 'reduced' : 'full');

    /* E038-07 — Ancres d'identification stables et rôle sémantique par arête. */
    edges.forEach((line, i) => {
      line.setAttribute('id', 'e038-anchor-' + i);
      const role = aClass(line, 'is-moon')
        ? (aClass(line, 'is-path') ? 'moon-path' : 'moon')
        : (aClass(line, 'is-path') ? 'path' : 'latent');
      line.setAttribute('data-e038-role', role);
    });

    /* E038-08 — Mesures géométriques (longueur, angle) et moyenne agrégée. */
    const nombre = (v) => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0; };
    let sommeLongueurs = 0;
    edges.forEach((line) => {
      const dx = nombre(line.getAttribute('x2')) - nombre(line.getAttribute('x1'));
      const dy = nombre(line.getAttribute('y2')) - nombre(line.getAttribute('y1'));
      const longueur = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
      sommeLongueurs += longueur;
      line.setAttribute('data-e038-length', longueur.toFixed(2));
      line.setAttribute('data-e038-angle', String(angle));
    });
    const moyenne = total ? sommeLongueurs / total : 0;
    if (svg) svg.setAttribute('data-e038-mean-length', moyenne.toFixed(2));
    metriques.textContent = 'Arêtes : ' + total + ' · actives ' + actives
      + ' · lunaires ' + lunaires + ' · latentes ' + latentes
      + ' · empreinte ' + signature + ' · longueur moyenne ' + moyenne.toFixed(2)
      + ' · mouvement ' + (reduit ? 'réduit' : 'complet') + '.';

    /* E038-09 — Bascule du mode surlignage E2E (aria-pressed, classe CSS). */
    const bascule = node('button', 'e038-toggle', 'Surligner les arêtes');
    bascule.id = 'e038-toggle';
    bascule.type = 'button';
    bascule.setAttribute('aria-pressed', 'false');
    bascule.addEventListener('click', () => {
      const actif = bascule.getAttribute('aria-pressed') === 'true';
      bascule.setAttribute('aria-pressed', actif ? 'false' : 'true');
      if (svg) svg.classList.toggle('e038-highlight', !actif);
      enregistrer('bascule:' + (actif ? 'off' : 'on'));
    });
    caption.appendChild(bascule);

    /* E038-10 — Instantané d'état déterministe sérialisé pour les tests. */
    const instantane = {
      vue: ctx.viewId || 'constellation',
      total, actives, lunaires, latentes, signature,
      longueurMoyenne: Number(moyenne.toFixed(2)),
      mouvement: reduit ? 'reduced' : 'full',
      aretes: edges.map((line, i) => ({
        rang: i,
        role: line.getAttribute('data-e038-role'),
        longueur: Number(line.getAttribute('data-e038-length')),
        angle: Number(line.getAttribute('data-e038-angle')),
      })),
    };
    const snapshot = node('pre', 'e038-snapshot', JSON.stringify(instantane));
    snapshot.id = 'e038-snapshot';
    snapshot.setAttribute('aria-hidden', 'true');
    snapshot.setAttribute('data-e038-count', String(instantane.aretes.length));
    caption.appendChild(snapshot);
    if (svg) svg.setAttribute('data-e038-snapshot-ready', 'true');
  } catch {
    /* Greffon tolérant : toute anomalie locale est neutralisée sans bruit. */
    return;
  }
});
