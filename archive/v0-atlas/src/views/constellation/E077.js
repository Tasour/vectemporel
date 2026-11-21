import { register } from './registry.js';

/* Lentille E077 — Diagnostic textuel appliqué au survol de la vue Constellation.
   Dix chantiers locaux : panneau, catalogage, quadrant, densité de voisinage,
   pastille de légende, surlignage, annonce vocalisée, sources des lunes, fil de
   suivi et miroir clavier. Zéro appel réseau, zéro source aléatoire, zéro sortie
   de journal, aucun minuteur ni boucle d'animation propre. Greffon tolérant. */

const E077_CSS = `
  /* E077-01 — Panneau de diagnostic textuel, masqué au repos. */
  .constellation-layout.e077-active { position: relative; }
  #e077-diagnostic {
    position: absolute; top: 4px; right: 8px; z-index: 30;
    max-width: min(340px, 62%); min-height: 34px;
    padding: 6px 10px; border: 1px solid var(--gold); border-radius: 8px;
    background: var(--surface-2); color: var(--ink);
    font-size: 9px; line-height: 1.45;
    opacity: 0; transform: translateY(-4px); pointer-events: none;
    transition: opacity .18s ease, transform .18s ease;
  }
  #e077-diagnostic[data-e077-visible="1"] { opacity: 1; transform: translateY(0); }

  /* E077-05 — Pastille de survol ajoutée à la légende existante. */
  #e077-hover-chip {
    display: inline-flex; align-items: center; min-height: 24px;
    padding: 2px 8px; border: 1px solid var(--line); border-radius: 999px;
    color: var(--gold); font-size: 8px; font-weight: 600;
    letter-spacing: .08em; white-space: nowrap;
  }

  /* E077-06 — Surlignage du nœud survolé ou focalisé, sans déplacer le disque. */
  .constellation-layout .const-sun.e077-hover,
  .constellation-layout .const-planet.e077-hover,
  .constellation-layout .const-moon.e077-hover {
    outline: 2px solid var(--gold-bright); outline-offset: 3px;
    box-shadow: 0 0 0 5px rgba(244, 214, 158, .18); z-index: 8;
  }

  /* E077-07 — Région live : présente pour les lecteurs d'écran, invisible à l'œil. */
  #e077-live {
    position: absolute !important; width: 1px; height: 1px;
    padding: 0; margin: -1px; overflow: hidden;
    clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }

  /* E077-09 — Fil de suivi textuel sous la constellation. */
  #e077-trace {
    flex: 1 1 100%; margin: 2px 0 0; color: var(--muted-2);
    font-size: 8px; line-height: 1.5; font-variant-numeric: tabular-nums;
  }

  /* E077-10 — Mode sobre : aucune transition quand le mouvement est réduit. */
  .e077-calm #e077-diagnostic { transition: none; }
  @media (prefers-reduced-motion: reduce) {
    #e077-diagnostic { transition: none !important; }
  }
`;

register('E077', ctx => {
  /* Garde d'entrée : ctx.layout est exigé avant tout ajout au DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  if (typeof document === 'undefined') return;

  try {
    const layout = ctx.layout;
    const field = layout.querySelector('.constellation-field');
    if (!field) return;

    const make = typeof ctx.el === 'function'
      ? ctx.el
      : (tag, cls, txt) => {
          const n = document.createElement(tag);
          if (cls) n.className = cls;
          if (txt !== undefined) n.textContent = txt;
          return n;
        };

    /* Unique feuille de style de la lentille, injectée une seule fois. */
    if (typeof ctx.css === 'function') ctx.css('constellation-e077', E077_CSS);
    layout.classList.add('e077-active');

    /* E077-02 — Catalogage des nœuds survolables : type, clé, libellé, rang et
       coordonnées issues des variables --x/--y posées par la vue. */
    const noeuds = Array.from(field.querySelectorAll('.const-sun, .const-planet, .const-moon'));
    if (!noeuds.length) return;
    noeuds.forEach((node) => {
      const type = node.classList.contains('const-sun') ? 'ère'
        : node.classList.contains('const-moon') ? 'point' : 'repère';
      const x = parseFloat(node.style.getPropertyValue('--x'));
      const y = parseFloat(node.style.getPropertyValue('--y'));
      node.dataset.e077Type = type;
      node.dataset.e077Key = node.dataset.constKey || `${type}-?`;
      node.dataset.e077Label = node.dataset.label
        || node.getAttribute('aria-label') || node.getAttribute('title') || '';
      node.dataset.e077Rang = (node.textContent || '').trim() || '?';
      node.dataset.e077X = String(Number.isFinite(x) ? x : 50);
      node.dataset.e077Y = String(Number.isFinite(y) ? y : 50);

      /* E077-03 — Quadrant de position : chaque nœud reçoit son secteur
         déterministe (nord/sud × ouest/est) depuis ses coordonnées. */
      const xe = Number(node.dataset.e077X);
      const ye = Number(node.dataset.e077Y);
      const ns = ye < 50 ? 'nord' : 'sud';
      const eo = xe < 50 ? 'ouest' : 'est';
      node.dataset.e077Quadrant = `${ns}-${eo}`;
    });

    /* E077-01 — Panneau de diagnostic : élément unique, masqué au repos,
       rempli et révélé à chaque survol ou focus. */
    let panneau = layout.querySelector('#e077-diagnostic');
    if (!panneau) {
      panneau = make('p', 'e077-diagnostic', 'Survolez un nœud pour obtenir son diagnostic.');
      panneau.id = 'e077-diagnostic';
      panneau.setAttribute('aria-hidden', 'true');
      panneau.dataset.e077Visible = '0';
      layout.appendChild(panneau);
    }

    /* E077-05 — Pastille de survol insérée dans la légende, avec garde. */
    const legend = layout.querySelector('.constellation-legend');
    let chip = layout.querySelector('#e077-hover-chip');
    if (!chip && legend) {
      chip = make('span', 'e077-hover-chip', 'AUCUN SURVOL');
      chip.id = 'e077-hover-chip';
      chip.setAttribute('aria-hidden', 'true');
      legend.appendChild(chip);
    }

    /* E077-07 — Région live : le diagnostic textuel est vocalisé sans être
       lu deux fois, le panneau visuel restant aria-hidden. */
    let live = layout.querySelector('#e077-live');
    if (!live) {
      live = make('p', 'e077-live', '');
      live.id = 'e077-live';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      layout.appendChild(live);
    }

    /* E077-09 — Fil de suivi : paragraphe de la légende de bas de vue. */
    const caption = layout.querySelector('.constellation-caption');
    let trace = layout.querySelector('#e077-trace');
    if (!trace && caption) {
      trace = make('p', 'e077-trace', 'Parcours de survol : aucun.');
      trace.id = 'e077-trace';
      caption.appendChild(trace);
    }
    const parcours = [];

    /* E077-04 — Densité locale de voisinage : distance euclidienne entre le
       nœud survolé et les repères, calculée sur les coordonnées cataloguées. */
    const diagnostiquerVoisinage = (node) => {
      const xe = Number(node.dataset.e077X || 50);
      const ye = Number(node.dataset.e077Y || 50);
      let proches = 0;
      noeuds.forEach((autre) => {
        if (autre === node || !autre.classList.contains('const-planet')) return;
        const dx = Number(autre.dataset.e077X || 50) - xe;
        const dy = Number(autre.dataset.e077Y || 50) - ye;
        if (Math.sqrt(dx * dx + dy * dy) <= 14) proches += 1;
      });
      node.dataset.e077Voisins = String(proches);
      return proches >= 3
        ? `voisinage dense : ${proches} repères proches`
        : `voisinage clairsemé : ${proches} repère(s) proche(s)`;
    };

    /* E077-08 — Diagnostic des lunes : confiance et nombre de sources lus dans
       le titre/aria-label déjà posés par la vue, sans nouvelle donnée externe. */
    const diagnostiquerSources = (node) => {
      if (!node.classList.contains('const-moon')) {
        node.dataset.e077Sources = 'sans objet';
        return 'sources : sans objet pour ce type de nœud';
      }
      const brut = `${node.getAttribute('title') || ''} ${node.getAttribute('aria-label') || ''}`;
      const confiance = brut.match(/confiance\s+(\d+)/i);
      const sources = brut.match(/(\d+)\s+source/i);
      const valeurConfiance = confiance ? confiance[1] : '?';
      const valeurSources = sources ? sources[1]
        : /\baucune source\b/i.test(brut) ? '0' : '?';
      node.dataset.e077Sources = `${valeurConfiance}|${valeurSources}`;
      return `confiance ${valeurConfiance} · ${valeurSources} source(s) déclarée(s)`;
    };

    /* Point d'entrée commun aux chantiers 01, 04, 05, 06, 07, 08 et 09. */
    let derniereAnnonce = '';
    const diagnostiquer = (node, origine) => {
      if (!node || !node.isConnected) return;
      const type = node.dataset.e077Type || 'nœud';
      const rang = node.dataset.e077Rang || '?';
      const cle = node.dataset.e077Key || '—';
      const quadrant = node.dataset.e077Quadrant || '—';
      const voisinage = diagnostiquerVoisinage(node);
      const sources = diagnostiquerSources(node);
      const court = `${type} ${rang} (${cle})`;
      const phrase = `Diagnostic · ${court} · ${quadrant}. ${voisinage}. ${sources}.`;

      if (panneau) {
        panneau.textContent = `${phrase} Origine : ${origine}.`;
        panneau.dataset.e077Visible = '1';
      }
      if (chip) chip.textContent = `SURVOL · ${court}`;

      /* E077-06 — Une seule classe de surlignage à la fois sur le champ. */
      noeuds.forEach((n) => n.classList.remove('e077-hover'));
      node.classList.add('e077-hover');
      field.dataset.e077Survol = cle;

      /* E077-07 — Annonce sans répétition du même nœud d'un survol à l'autre. */
      if (live && cle !== derniereAnnonce) {
        derniereAnnonce = cle;
        live.textContent = `Diagnostic : ${court}, ${quadrant}, ${voisinage}, ${sources}.`;
      }

      /* E077-09 — Le fil garde au plus quatre entrées, du plus ancien au plus récent. */
      if (trace && parcours[parcours.length - 1] !== court) {
        parcours.push(court);
        while (parcours.length > 4) parcours.shift();
        trace.textContent = `Parcours de survol : ${parcours.map((p) => `› ${p}`).join(' ')}`;
      }
    };

    const effacer = (node) => {
      if (panneau) panneau.dataset.e077Visible = '0';
      if (chip) chip.textContent = 'AUCUN SURVOL';
      if (node) node.classList.remove('e077-hover');
      if (!field.querySelector('.e077-hover')) delete field.dataset.e077Survol;
    };

    const cible = (target) => {
      if (!target || target.nodeType !== 1 || typeof target.closest !== 'function') return null;
      const node = target.closest('.const-sun, .const-planet, .const-moon');
      return node && field.contains(node) ? node : null;
    };

    /* E077-01 / E077-04 / E077-05 — Délégation des événements de survol. */
    field.addEventListener('mouseover', (event) => {
      const node = cible(event.target);
      if (node) diagnostiquer(node, 'survol');
    });
    field.addEventListener('mouseout', (event) => {
      const node = cible(event.target);
      if (node) effacer(node);
    });

    /* E077-10 — Miroir clavier : le même diagnostic est produit au focus, puis
       le mode sobre est consigné sur le layout sans aucune animation propre. */
    field.addEventListener('focusin', (event) => {
      const node = cible(event.target);
      if (node) diagnostiquer(node, 'clavier');
    });
    field.addEventListener('focusout', (event) => {
      const node = cible(event.target);
      if (node) effacer(node);
    });
    const sobre = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
    layout.classList.toggle('e077-calm', sobre);
    layout.dataset.e077Motion = sobre ? 'reduced' : 'full';
  } catch {
    /* Greffon tolérant : sans incident, le rendu se poursuit sans diagnostic. */
  }
});
