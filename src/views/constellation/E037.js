import { register } from './registry.js';

/* Lentille E037 — Diagnostic textuel appliqué aux arêtes du graphe de la vue
   Constellation. Dix chantiers concrets : recensement, mesure géométrique,
   infobulles SVG, registre lisible, classes sémantiques, légende, bascule,
   tri, annonce vocalisée et bilan de cohérence. Greffon tolérant : aucune
   exception, aucun réseau, aucun aléa, aucun timer, aucune animation propre. */
register('E037', (ctx) => {
  /* Garde d'entrée : le conteneur de la vue est obligatoire avant tout ajout DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;

  try {
    const layout = ctx.layout;
    const doc = layout.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;
    const make = typeof ctx.el === 'function' ? ctx.el : null;
    const css = typeof ctx.css === 'function' ? ctx.css : null;

    /* Feuille de style unique, identifiant réservé à cette lentille. */
    if (css) {
      css('constellation-e037', `
        /* Styles des catégories d'arêtes et du panneau de diagnostic. */
        .constellation-edges line.e037-courte { stroke: rgba(120, 200, 170, .70); }
        .constellation-edges line.e037-moyenne { stroke: rgba(230, 185, 111, .55); }
        .constellation-edges line.e037-longue { stroke: rgba(178, 139, 221, .50); }
        #e037-count {
          display: inline-block; padding: 2px 7px;
          border: 1px solid var(--violet); border-radius: 10px;
          color: var(--violet); font-size: 9px; font-variant-numeric: tabular-nums;
        }
        #e037-register { margin: 6px 0 0; padding-left: 18px; font-size: 9px; line-height: 1.5; color: var(--ink-soft); }
        #e037-register li { margin-bottom: 2px; }
        #e037-register[hidden] { display: none; }
        #e037-legend { margin: 6px 0 0; color: var(--muted); font-size: 9px; line-height: 1.45; }
        #e037-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin-top: 6px; }
        #e037-toggle {
          min-width: 36px; min-height: 36px; padding: 0 10px;
          border: 1px solid var(--line); border-radius: 8px;
          background: rgba(255,255,255,.03); color: var(--ink-soft); font-size: 9px; cursor: pointer;
        }
        #e037-toggle[aria-pressed="true"] { border-color: var(--gold); color: var(--gold-bright); }
        #e037-toggle:focus-visible, #e037-sort:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
        #e037-sort {
          min-height: 36px; padding: 0 6px; font-size: 9px;
          background: var(--surface-2); color: var(--ink-soft);
          border: 1px solid var(--line); border-radius: 6px;
        }
        #e037-live {
          position: absolute !important; width: 1px; height: 1px;
          padding: 0; margin: -1px; overflow: hidden;
          clip: rect(0 0 0 0); white-space: nowrap; border: 0;
        }
        #e037-verdict { margin: 6px 0 0; color: var(--gold); font-size: 9px; }
      `);
    }

    /* Les arêtes sont les <line> du SVG .constellation-edges. */
    const edges = Array.from(layout.querySelectorAll('.constellation-edges line'));
    const caption = layout.querySelector('.constellation-caption') || layout;

    /* Lecture numérique déterministe : jamais d'aléa, repli sur zéro. */
    const nombre = (v) => { const n = Number.parseFloat(v); return Number.isFinite(n) ? n : 0; };

    /* Géométrie calculée une seule fois et partagée par les chantiers. */
    const secteurs = ['E', 'SE', 'S', 'SO', 'O', 'NO', 'N', 'NE'];
    const mesures = edges.map((line, index) => {
      const x1 = nombre(line.getAttribute('x1'));
      const y1 = nombre(line.getAttribute('y1'));
      const x2 = nombre(line.getAttribute('x2'));
      const y2 = nombre(line.getAttribute('y2'));
      const longueur = Math.round(Math.hypot(x2 - x1, y2 - y1) * 100) / 100;
      const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
      const secteur = secteurs[((Math.round(angle / 45) % 8) + 8) % 8];
      const type = line.classList.contains('is-moon') ? 'lune'
        : line.classList.contains('is-path') ? 'chemin' : 'libre';
      return { line, index, longueur, secteur, type, x1, y1, x2, y2 };
    });

    /* E037-01 — Recensement : pastille « N arêtes » insérée en tête de légende. */
    if (make) {
      const nChemin = mesures.filter((m) => m.type === 'chemin').length;
      const nLune = mesures.filter((m) => m.type === 'lune').length;
      const nLibre = mesures.length - nChemin - nLune;
      const pastille = make('span', 'e037-count',
        `${edges.length} arête${edges.length > 1 ? 's' : ''} · chemin ${nChemin} · lune ${nLune} · libre ${nLibre}`);
      pastille.id = 'e037-count';
      caption.insertBefore(pastille, caption.firstChild);
    }

    /* E037-02 — Mesure géométrique : chaque arête porte longueur, orientation et type en attributs. */
    mesures.forEach((m) => {
      m.line.setAttribute('data-e037-length', m.longueur.toFixed(2));
      m.line.setAttribute('data-e037-dir', m.secteur);
      m.line.setAttribute('data-e037-kind', m.type);
    });

    /* E037-03 — Infobulles SVG : un <title> textuel décrit chaque arête. */
    mesures.forEach((m) => {
      const ns = m.line.namespaceURI;
      if (!ns || typeof doc.createElementNS !== 'function') return;
      const titre = doc.createElementNS(ns, 'title');
      titre.textContent = `Arête ${m.index + 1} : ${m.type}, longueur ${m.longueur.toFixed(2)}, orientation ${m.secteur}.`;
      m.line.appendChild(titre);
    });

    /* E037-04 — Registre textuel : une entrée lisible par arête, hors du SVG. */
    if (make) {
      const registre = make('ul', 'e037-register');
      registre.id = 'e037-register';
      mesures.forEach((m) => {
        const entree = make('li', '',
          `Arête ${m.index + 1} · ${m.type} · longueur ${m.longueur.toFixed(2)} · orientation ${m.secteur}`);
        entree.dataset.e037Length = m.longueur.toFixed(2);
        entree.dataset.e037Index = String(m.index);
        registre.appendChild(entree);
      });
      if (!mesures.length) registre.appendChild(make('li', '', 'Aucune arête à diagnostiquer.'));
      caption.appendChild(registre);
    }

    /* E037-05 — Classes sémantiques : catégorie de longueur distinctive, stylée par la feuille unique. */
    mesures.forEach((m) => {
      const categorie = m.longueur < 10 ? 'e037-courte'
        : m.longueur > 25 ? 'e037-longue' : 'e037-moyenne';
      m.line.classList.add(categorie);
      m.line.setAttribute('data-e037-class', categorie);
    });

    /* E037-06 — Légende textuelle : seuils et codes couleur des catégories. */
    if (make) {
      const legende = make('p', 'e037-legend',
        'Diagnostic des arêtes : courte sous 10 unités (vert), moyenne de 10 à 25 (or), '
        + 'longue au-delà de 25 (violet). Orientation sur huit secteurs cardinaux ; '
        + 'type chemin, lune ou libre.');
      legende.id = 'e037-legend';
      caption.appendChild(legende);
    }

    /* E037-07 — Bascule du registre : aria-pressed sur une commande indépendante. */
    if (make) {
      const registre = doc.getElementById('e037-register');
      const bouton = make('button', 'e037-toggle', 'Masquer le registre des arêtes');
      bouton.id = 'e037-toggle';
      bouton.type = 'button';
      bouton.setAttribute('aria-pressed', 'true');
      bouton.setAttribute('aria-controls', 'e037-register');
      if (registre) {
        bouton.addEventListener('click', () => {
          const visible = bouton.getAttribute('aria-pressed') !== 'true';
          bouton.setAttribute('aria-pressed', visible ? 'true' : 'false');
          bouton.textContent = visible
            ? 'Masquer le registre des arêtes' : 'Afficher le registre des arêtes';
          registre.hidden = !visible;
        });
      }
      caption.appendChild(bouton);
    }

    /* E037-08 — Tri du registre : ordre de création, longueur croissante ou décroissante. */
    if (make) {
      const registre = doc.getElementById('e037-register');
      const outils = make('div', 'e037-tools');
      outils.id = 'e037-tools';
      const tri = make('select', 'e037-sort');
      tri.id = 'e037-sort';
      tri.setAttribute('aria-label', 'Trier le registre des arêtes');
      [['creation', 'Ordre de création'],
        ['croissant', 'Longueur croissante'],
        ['decroissant', 'Longueur décroissante']].forEach(([valeur, libelle]) => {
        const option = make('option', '', libelle);
        option.value = valeur;
        tri.appendChild(option);
      });
      if (registre) {
        tri.addEventListener('change', () => {
          const entrees = Array.from(registre.querySelectorAll('li'));
          entrees.sort((a, b) => {
            const ia = Number(a.dataset.e037Index || 0);
            const ib = Number(b.dataset.e037Index || 0);
            if (tri.value === 'creation') return ia - ib;
            const la = Number(a.dataset.e037Length || 0);
            const lb = Number(b.dataset.e037Length || 0);
            return tri.value === 'croissant' ? la - lb || ia - ib : lb - la || ia - ib;
          });
          entrees.forEach((entree) => registre.appendChild(entree));
        });
      }
      outils.appendChild(tri);
      caption.appendChild(outils);
    }

    /* E037-09 — Annonce vocale : au focus d'un nœud, diagnostic des arêtes qui l'atteignent. */
    if (make) {
      const live = make('p', 'e037-live', '');
      live.id = 'e037-live';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      layout.appendChild(live);
      const champ = layout.querySelector('.constellation-field');
      if (champ) {
        champ.addEventListener('focusin', (event) => {
          const cible = (typeof Element !== 'undefined' && event.target instanceof Element)
            ? event.target : null;
          if (!cible) return;
          if (!cible.classList.contains('const-planet') && !cible.classList.contains('const-moon')) return;
          const px = (cible.style.getPropertyValue('--x') || '').trim();
          const py = (cible.style.getPropertyValue('--y') || '').trim();
          const liees = mesures.filter((m) => m.x2.toFixed(2) === px && m.y2.toFixed(2) === py);
          const resumes = liees.map((m) => `${m.type} ${m.longueur.toFixed(2)} ${m.secteur}`);
          live.textContent = resumes.length
            ? `${resumes.length} arête${resumes.length > 1 ? 's' : ''} vers ce nœud : ${resumes.join(' ; ')}.`
            : 'Aucune arête entrante pour ce nœud.';
        });
      }
    }

    /* E037-10 — Bilan de cohérence : nulles, hors bornes et verdict inscrit sur la vue. */
    const nulles = mesures.filter((m) => m.longueur < 0.05).length;
    const horsBornes = mesures.filter((m) => m.longueur > 100).length;
    const verdict = !mesures.length ? 'sans arête'
      : (nulles || horsBornes) ? 'à vérifier' : 'cohérent';
    layout.setAttribute('data-e037-audit', verdict);
    if (make) {
      const bandeau = make('p', 'e037-verdict',
        `Bilan des arêtes : ${verdict} · ${nulles} arête${nulles > 1 ? 's' : ''} de longueur nulle · ${horsBornes} hors bornes.`);
      bandeau.id = 'e037-verdict';
      caption.appendChild(bandeau);
    }
  } catch {
    /* Greffon tolérant : toute anomalie locale est neutralisée sans bruit. */
    return;
  }
});
