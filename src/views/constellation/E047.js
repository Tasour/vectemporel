import { register } from './registry.js';

/* Lentille E047 — Diagnostic textuel appliqué à la légende de la vue Constellation.
   Dix chantiers concrets et variés : inventaire des termes, ambiguïté, couverture
   des calques, pastille de synthèse, nom des couleurs, liaison à la note,
   libellés longs, normalisation typographique, verdict au survol et bilan final.
   Greffon tolérant : aucune exception, aucun réseau, aucun aléa, aucun timer,
   aucune boucle rAF propre. */
register('E047', (ctx) => {
  /* Garde d'entrée : le conteneur de la vue est requis avant tout ajout DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;

  try {
    const layout = ctx.layout;
    const make = typeof ctx.el === 'function' ? ctx.el : null;
    const css = typeof ctx.css === 'function' ? ctx.css : null;
    const legende = layout.querySelector('.constellation-legend');
    const caption = layout.querySelector('.constellation-caption') || layout;

    /* Seuls les trois termes d'origine sont diagnostiqués : les pastilles des
       lentilles voisines (E015) et les nôtres sont exclues par leur classe. */
    const termes = legende
      ? Array.from(legende.children).filter((node) => {
          if (String(node.tagName).toLowerCase() !== 'span') return false;
          const classes = node.classList;
          return classes.contains('legend-sun')
            || classes.contains('legend-planet')
            || classes.contains('legend-moon');
        })
      : [];
    const calques = [
      layout.querySelector('.const-layer-suns'),
      layout.querySelector('.const-layer-planets'),
      layout.querySelector('.const-layer-moons'),
    ];
    const lire = (node) => node ? String(node.textContent || '').replace(/\s+/g, ' ').trim() : '';
    const brut = termes.map(lire);

    /* Feuille de style unique de la lentille, identifiant réservé. */
    if (css) {
      css('constellation-e047', `
        /* E047-04 — pastille de synthèse alignée sur la ligne de légende. */
        #e047-pastille {
          display: inline-block; padding: 2px 6px; border: 1px solid var(--line);
          border-radius: 8px; color: var(--ink-soft); font-size: 8px;
          font-variant-numeric: tabular-nums; white-space: nowrap;
        }
        /* E047-05 — le nom des couleurs est du texte lisible, pas un indice chromatique. */
        #e047-couleurs {
          flex: 1 1 320px; max-width: 620px; margin: 6px 0 0;
          color: var(--muted-2); font-size: 9px; line-height: 1.5;
        }
        /* E047-07 — soulignement des libellés longs porteurs d'une précision. */
        .e047-legende [data-e047-long="1"] {
          border-bottom: 1px dotted var(--gold); cursor: help;
        }
        /* E047-09 — verdict textuel actualisé au survol d'un terme. */
        #e047-verdict {
          flex: 1 1 320px; margin: 6px 0 0; color: var(--gold);
          font-size: 9px; line-height: 1.5;
        }
        /* E047-10 — bilan final distinct de la note de la vue. */
        #e047-bilan {
          flex: 1 1 320px; margin: 0; color: var(--muted);
          font-size: 9px; line-height: 1.5;
        }
        @media (prefers-reduced-motion: reduce) {
          #e047-pastille { transition: none; }
        }
      `);
    }

    /* E047-01 — Inventaire textuel : signature normalisée des termes de la légende. */
    if (legende) {
      legende.classList.add('e047-legende');
      if (!legende.id) legende.id = 'e047-legende';
      legende.dataset.e047Signature = brut.map((t) => t.toLowerCase()).join('|');
    }
    layout.dataset.e047Termes = String(termes.length);

    /* E047-02 — Détection des libellés ambigus : précision issue du calque réel. */
    let ambigus = 0;
    termes.forEach((terme, index) => {
      const texte = brut[index];
      const court = texte.length > 0 && texte.length < 10;
      terme.dataset.e047Ambigu = court ? '1' : '0';
      if (court) ambigus += 1;
      if (court && calques[index]) {
        const precision = lire(calques[index].getAttribute('aria-label'));
        if (precision) {
          terme.dataset.e047Precision = precision;
          if (!terme.getAttribute('title')) terme.title = precision;
        }
      }
    });
    layout.dataset.e047Ambigus = String(ambigus);

    /* E047-03 — Couverture légende ↔ calques : chaque terme doit nommer un calque rendu. */
    const couverts = termes.reduce((total, terme, index) => {
      const nom = lire(terme.getAttribute('aria-label')) || brut[index];
      const calque = calques[index] ? lire(calques[index].getAttribute('aria-label')) : '';
      return total + (nom && calque ? 1 : 0);
    }, 0);
    layout.dataset.e047Couverture = `${couverts}/${calques.length}`;

    /* E047-04 — Pastille de synthèse insérée dans la légende existante. */
    if (make && legende && !layout.querySelector('#e047-pastille')) {
      const pastille = make('span', 'e047-pastille',
        `Diagnostic : ${termes.length} termes · ${couverts}/${calques.length} calques`);
      pastille.id = 'e047-pastille';
      legende.appendChild(pastille);
    }

    /* E047-05 — Codage par couleur traduit en texte : or, bleu, violet. */
    const couleurs = ['Or', 'Bleu', 'Violet'];
    if (make && !layout.querySelector('#e047-couleurs')) {
      const p = make('p', 'e047-couleurs',
        `Codage textuel : ${brut.map((t, i) => `${couleurs[i] || 'Teinte'} = ${t || '—'}`).join(' · ')}.`);
      p.id = 'e047-couleurs';
      caption.appendChild(p);
    }

    /* E047-06 — Liaison sémantique de la légende à la note descriptive de la vue. */
    const note = layout.querySelector('#constellation-note');
    if (legende && note && note.id) {
      legende.setAttribute('role', 'group');
      legende.setAttribute('aria-label', 'Légende de la constellation');
      legende.setAttribute('aria-describedby', note.id);
      legende.dataset.e047Note = 'liee';
    } else if (legende) {
      legende.dataset.e047Note = 'absente';
    }

    /* E047-07 — Repérage des libellés longs, avec précision consultable en title. */
    let longs = 0;
    termes.forEach((terme, index) => {
      const texte = brut[index];
      const estLong = texte.length > 18;
      terme.dataset.e047Long = estLong ? '1' : '0';
      if (estLong) {
        longs += 1;
        if (!terme.getAttribute('title')) terme.title = texte;
      }
    });
    layout.dataset.e047Longs = String(longs);

    /* E047-08 — Normalisation typographique consignée sans altérer le texte visible. */
    const normalises = brut.map((t) => t.replace(/'/g, '’').replace(/\s+/g, ' ').trim());
    termes.forEach((terme, index) => { terme.dataset.e047Normalise = normalises[index]; });
    layout.dataset.e047Corrections = String(normalises.filter((t, i) => t !== brut[i]).length);

    /* E047-09 — Verdict textuel actualisé au survol d'un terme de la légende. */
    if (make && legende && !layout.querySelector('#e047-verdict')) {
      const verdict = make('p', 'e047-verdict',
        'Diagnostic : survolez un terme de la légende pour lire son verdict.');
      verdict.id = 'e047-verdict';
      caption.appendChild(verdict);
      legende.addEventListener('mouseover', (event) => {
        if (!layout.isConnected) return;
        const cible = event.target instanceof Element ? event.target : null;
        if (!cible || cible.parentElement !== legende) return;
        const index = termes.indexOf(cible);
        if (index < 0) return;
        const etat = cible.dataset.e047Ambigu === '1' ? 'libellé ambigu' : 'libellé explicite';
        const message = `Diagnostic · « ${brut[index] || '—'} » (${couleurs[index] || 'teinte'}) : `
          + `${etat}, ${couverts}/${calques.length} calques nommés.`;
        verdict.textContent = message;
        legende.dataset.e047Verdict = message;
      });
    }

    /* E047-10 — Bilan chiffré et trace de la préférence de mouvement. */
    const reduit = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
    layout.dataset.e047Motion = reduit ? 'reduced' : 'full';
    if (make && !layout.querySelector('#e047-bilan')) {
      const bilan = make('p', 'e047-bilan',
        `Bilan : ${termes.length} termes examinés, ${couverts}/${calques.length} calques nommés, `
        + `${ambigus} libellé(s) ambigu(s), ${longs} libellé(s) long(s). `
        + `Mouvement ${reduit ? 'réduit' : 'complet'}.`);
      bilan.id = 'e047-bilan';
      caption.appendChild(bilan);
    }
    layout.dataset.e047Bilan = `${termes.length}:${couverts}/${calques.length}:${ambigus}:${longs}`;
  } catch {
    /* Greffon tolérant : toute anomalie locale est neutralisée sans bruit. */
    return;
  }
});
