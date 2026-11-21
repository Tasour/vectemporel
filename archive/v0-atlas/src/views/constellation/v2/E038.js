import { register } from './registry.js';

/* Lentille V2 E038 — instrumentation E2E des arêtes du graphe de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sur le même domaine que la passe 1 mais sans recouvrir ses apports.
   Cartographie des extrémités, adjacence, doublons, rangs de longueur,
   distribution, intégrité, registre d'époques, inspecteur clavier,
   surlignage croisé et manifeste déclaratif. Zéro réseau, zéro aléa,
   zéro minuteur, zéro boucle d'animation propre. */
register('E038', (ctx) => {
  /* Garde d'entrée obligatoire : sans layout courant, aucun ajout au DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function'
      || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  const doc = layout.ownerDocument || document;

  try {
    const svg = layout.querySelector('svg.constellation-edges');
    if (!svg || typeof svg.querySelectorAll !== 'function') return;
    const edges = Array.from(svg.querySelectorAll('line.const-edge'));
    const nodes = Array.from(layout.querySelectorAll('[data-const-key]'));
    const caption = layout.querySelector('.constellation-caption') || layout;

    const make = typeof ctx.el === 'function' ? ctx.el : null;
    function node(tag, cls, text) {
      if (make) return make(tag, cls, text);
      const n = doc.createElement(tag);
      if (cls) n.className = cls;
      if (text !== undefined) n.textContent = text;
      return n;
    }
    const nombre = (v) => {
      const x = parseFloat(v);
      return Number.isFinite(x) ? x : 0;
    };
    const coordonnee = (line, attr) => nombre(line.getAttribute(attr)).toFixed(2);
    const aClasse = (n, c) => !!(n && n.classList && n.classList.contains(c));

    /* Feuille unique de la lentille : style de l'inspecteur, marquages
       d'arêtes et région d'annonce. Identifiant réservé à la V2. */
    css('constellation-v2-e038', `
      .v2e038-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
      .v2e038-inspecteur{margin-top:10px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--muted);font-size:10px}
      .v2e038-titre{margin:0 0 6px;color:var(--gold);font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
      .v2e038-liste{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:4px}
      .v2e038-item{margin:0}
      .v2e038-edge-btn{min-width:36px;min-height:36px;padding:6px 9px;border:1px solid var(--violet);border-radius:6px;background:transparent;color:var(--violet);font:inherit;font-size:10px;cursor:pointer}
      .v2e038-edge-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
      svg.constellation-edges line.const-edge[data-v2e038-inspected="true"]{stroke-dasharray:5 2;stroke-width:2.6}
      svg.constellation-edges.v2e038-relier line.const-edge[data-v2e038-linked="true"]{stroke-dasharray:2 2;stroke-width:2.2}
      .v2e038-integrite{margin:6px 0 0;padding-left:16px;color:var(--muted-2)}
      @media (prefers-reduced-motion: reduce){.v2e038-edge-btn{transition:none!important}}
    `);

  /* E038-01 — Cartographie des extrémités : chaque arête est reliée à la
       clé du nœu dont elle part et du nœu où elle arrive, par correspondance
       des coordonnées avec les variables CSS --x / --y des nœuds. */
    const parPosition = new Map();
    nodes.forEach((n) => {
      const style = n.style;
      if (!style || typeof style.getPropertyValue !== 'function') return;
      const x = parseFloat(style.getPropertyValue('--x'));
      const y = parseFloat(style.getPropertyValue('--y'));
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const pos = x.toFixed(2) + ',' + y.toFixed(2);
      if (!parPosition.has(pos)) parPosition.set(pos, n.dataset.constKey || '?');
    });
    let nonResolus = 0;
    edges.forEach((line) => {
      const depart = parPosition.get(coordonnee(line, 'x1') + ',' + coordonnee(line, 'y1')) || '?';
      const arrivee = parPosition.get(coordonnee(line, 'x2') + ',' + coordonnee(line, 'y2')) || '?';
      if (depart === '?' || arrivee === '?') nonResolus += 1;
      line.setAttribute('data-v2e038-link', depart + '→' + arrivee);
    });
    svg.setAttribute('data-v2e038-unresolved', String(nonResolus));
    svg.setAttribute('data-v2e038-nodes', String(parPosition.size));

  /* E038-02 — Index d'adjacence et degrés : voisinage symétrique déduit
       des liens, exposé en JSON sur le SVG et en degré sur chaque nœu. */
    const voisins = new Map();
    function relier(a, b) {
      if (a === '?' || b === '?' || a === b) return;
      if (!voisins.has(a)) voisins.set(a, new Set());
      if (!voisins.has(b)) voisins.set(b, new Set());
      voisins.get(a).add(b);
      voisins.get(b).add(a);
    }
    edges.forEach((line) => {
      const parties = (line.getAttribute('data-v2e038-link') || '').split('→');
      relier(parties[0], parties[1]);
    });
    const adjacence = {};
    let degreMax = 0;
    voisins.forEach((set, cle) => {
      const liste = Array.from(set).sort();
      adjacence[cle] = liste;
      if (liste.length > degreMax) degreMax = liste.length;
    });
    svg.setAttribute('data-v2e038-adjacency', JSON.stringify(adjacence));
    svg.setAttribute('data-v2e038-degree-max', String(degreMax));
    nodes.forEach((n) => {
      const cle = n.dataset.constKey;
      if (cle && voisins.has(cle)) n.setAttribute('data-v2e038-degree', String(voisins.get(cle).size));
    });

  /* E038-03 — Détection des doublons : deux arêtes reliant la même paire
       de nœuds sont signalées, la première servant d'origine au marquage. */
    const pairesVues = new Map();
    let doublons = 0;
    edges.forEach((line, i) => {
      const parties = (line.getAttribute('data-v2e038-link') || '?→?').split('→');
      const paire = parties.slice().sort().join('↔');
      if (pairesVues.has(paire)) {
        doublons += 1;
        line.setAttribute('data-v2e038-duplicate', 'true');
        line.setAttribute('data-v2e038-duplicate-of', pairesVues.get(paire));
      } else {
        pairesVues.set(paire, String(i));
      }
    });
    svg.setAttribute('data-v2e038-duplicates', String(doublons));
    svg.setAttribute('data-v2e038-unique-pairs', String(pairesVues.size));

  /* E038-04 — Rangs de longueur : classement déterministe des arêtes,
       à égalité près, sans écrire la longueur brute (déjà en passe 1). */
    const mesures = edges.map((line, i) => {
      const dx = nombre(line.getAttribute('x2')) - nombre(line.getAttribute('x1'));
      const dy = nombre(line.getAttribute('y2')) - nombre(line.getAttribute('y1'));
      return { index: i, line, valeur: Math.sqrt(dx * dx + dy * dy) };
    });
    const ordre = mesures.slice().sort((a, b) => b.valeur - a.valeur || a.index - b.index);
    let exAequo = 0;
    ordre.forEach((m, rang) => {
      m.line.setAttribute('data-v2e038-length-rank', String(rang + 1));
      if (rang > 0 && Math.abs(m.valeur - ordre[rang - 1].valeur) < 0.005) {
        m.line.setAttribute('data-v2e038-tie', 'true');
        exAequo += 1;
      }
    });
    svg.setAttribute('data-v2e038-ties', String(exAequo));
    svg.setAttribute('data-v2e038-longest', ordre.length ? String(ordre[0].index) : '');

  /* E038-05 — Distribution avancée : minimum, maximum, médiane et écart
       type de la longueur, en complément de la seule moyenne de la passe 1. */
    const valeurs = mesures.map((m) => m.valeur).sort((a, b) => a - b);
    const compte = valeurs.length;
    const min = compte ? valeurs[0] : 0;
    const max = compte ? valeurs[compte - 1] : 0;
    const mediane = compte
      ? (compte % 2 ? valeurs[(compte - 1) / 2] : (valeurs[compte / 2 - 1] + valeurs[compte / 2]) / 2)
      : 0;
    const moyenne = compte ? valeurs.reduce((s, v) => s + v, 0) / compte : 0;
    const ecartType = compte
      ? Math.sqrt(valeurs.reduce((s, v) => s + (v - moyenne) * (v - moyenne), 0) / compte)
      : 0;
    svg.setAttribute('data-v2e038-min', min.toFixed(2));
    svg.setAttribute('data-v2e038-max', max.toFixed(2));
    svg.setAttribute('data-v2e038-median', mediane.toFixed(2));
    svg.setAttribute('data-v2e038-stddev', ecartType.toFixed(2));
    svg.setAttribute('data-v2e038-spread', (max - min).toFixed(2));

  /* E038-06 — Validation d'intégrité : coordonnées finies, liens résolus
       et unicité des marqueurs ; anomalies listées en texte réel. */
    const anomalies = [];
    edges.forEach((line, i) => {
      ['x1', 'y1', 'x2', 'y2'].forEach((attr) => {
        const brut = line.getAttribute(attr);
        if (brut === null || brut === '' || !Number.isFinite(parseFloat(brut))) {
          anomalies.push('Arête ' + (i + 1) + ' : coordonnée ' + attr + ' invalide.');
        }
      });
      const lien = line.getAttribute('data-v2e038-link') || '';
      if (lien.indexOf('→') < 0 || lien.indexOf('?') >= 0) {
        anomalies.push('Arête ' + (i + 1) + ' : extrémité non résolue.');
      }
    });
    if (new Set(edges.map((l, i) => l.getAttribute('id') || 'v2e038-' + i)).size !== edges.length) {
      anomalies.push('Identifiants d’arêtes non uniques.');
    }
    svg.setAttribute('data-v2e038-integrity', anomalies.length ? 'anomalies:' + anomalies.length : 'ok');
    let bilan = layout.querySelector('#v2e038-integrity');
    if (!bilan) {
      bilan = node('div', 'v2e038-sr', '');
      bilan.id = 'v2e038-integrity';
      bilan.setAttribute('role', 'status');
      bilan.setAttribute('aria-live', 'polite');
      caption.appendChild(bilan);
    }
    const listeAnomalies = node('ul', 'v2e038-integrite', '');
    const lignesAnomalies = anomalies.length ? anomalies : ['Aucune anomalie détectée.'];
    lignesAnomalies.slice(0, 8).forEach((texte) => {
      listeAnomalies.appendChild(node('li', '', texte));
    });
    bilan.textContent = '';
    bilan.appendChild(listeAnomalies);

  /* E038-07 — Registre d'époques de rendu : compteur déterministe borné,
       sans horodatage ni minuteur, pour détecter un re-rendu en E2E. */
    const CLE_EPOQUES = '__v2e038_epochs';
    const disposer = typeof window !== 'undefined' && !!window;
    let epochs = disposer && Array.isArray(window[CLE_EPOQUES]) ? window[CLE_EPOQUES] : null;
    if (disposer && !epochs) {
      epochs = [];
      window[CLE_EPOQUES] = epochs;
    }
    const epoch = epochs ? epochs.length + 1 : 1;
    if (epochs) {
      epochs.push({ rang: epoch, aretes: edges.length, paires: pairesVues.size, doublons });
      while (epochs.length > 6) epochs.shift();
    }
    svg.setAttribute('data-v2e038-epoch', String(epoch));
    svg.setAttribute('data-v2e038-ledger', epochs ? String(epochs.length) : 'hors-fenetre');

  /* E038-08 — Inspecteur clavier : une commande par arête, libellée en
       français, qui isole l'arête correspondante et annonce ses mesures. */
    let inspecteur = layout.querySelector('#v2e038-inspecteur');
    if (!inspecteur) {
      inspecteur = node('section', 'v2e038-inspecteur', '');
      inspecteur.id = 'v2e038-inspecteur';
      inspecteur.setAttribute('aria-label', 'Inspecteur clavier des arêtes');
      inspecteur.appendChild(node('h3', 'v2e038-titre', 'Inspecteur des arêtes'));
      const liste = node('ul', 'v2e038-liste', '');
      liste.id = 'v2e038-liste';
      const statut = node('p', 'v2e038-sr', '');
      statut.id = 'v2e038-status';
      statut.setAttribute('role', 'status');
      statut.setAttribute('aria-live', 'polite');
      statut.setAttribute('aria-atomic', 'true');
      edges.forEach((line, i) => {
        const item = node('li', 'v2e038-item', '');
        const bouton = node('button', 'v2e038-edge-btn',
          'Arête ' + (i + 1) + ' : ' + (line.getAttribute('data-v2e038-link') || '?'));
        bouton.type = 'button';
        bouton.id = 'v2e038-btn-' + i;
        bouton.setAttribute('data-v2e038-target', String(i));
        bouton.addEventListener('focus', () => {
          edges.forEach((l) => l.removeAttribute('data-v2e038-inspected'));
          line.setAttribute('data-v2e038-inspected', 'true');
          const rang = line.getAttribute('data-v2e038-length-rank') || '?';
          const role = line.getAttribute('data-v2e038-role')
            || (aClasse(line, 'is-moon') ? 'lunaire' : aClasse(line, 'is-path') ? 'active' : 'latente');
          statut.textContent = 'Arête ' + (i + 1) + ' : ' + role + ', rang de longueur '
            + rang + ', ' + (line.getAttribute('data-v2e038-link') || 'extrémités inconnues') + '.';
        });
        bouton.addEventListener('blur', () => {
          line.removeAttribute('data-v2e038-inspected');
        });
        item.appendChild(bouton);
        liste.appendChild(item);
      });
      inspecteur.appendChild(liste);
      inspecteur.appendChild(statut);
      caption.appendChild(inspecteur);
    }
    svg.setAttribute('data-v2e038-inspector', 'ready');
    svg.setAttribute('data-v2e038-inspector-count', String(inspecteur.querySelectorAll('button').length));

  /* E038-09 — Surlignage croisé nœu ↔ arêtes : au focus ou au survol d'un
       nœud, ses arêtes incidentes reçoivent un marquage non coloriel. */
    function marquerNoeud(noeud, actif) {
      if (!noeud || typeof noeud.getAttribute !== 'function') return;
      const cle = noeud.getAttribute('data-const-key');
      if (!cle) return;
      edges.forEach((line) => {
        const parties = (line.getAttribute('data-v2e038-link') || '').split('→');
        if (parties.indexOf(cle) >= 0) {
          if (actif) line.setAttribute('data-v2e038-linked', 'true');
          else line.removeAttribute('data-v2e038-linked');
        }
      });
      if (actif) {
        svg.classList.add('v2e038-relier');
        svg.setAttribute('data-v2e038-active-node', cle);
      } else {
        svg.classList.remove('v2e038-relier');
        svg.removeAttribute('data-v2e038-active-node');
      }
    }
    ['focusin', 'focusout', 'mouseover', 'mouseout'].forEach((type) => {
      layout.addEventListener(type, (event) => {
        const cible = event && event.target;
        const noeud = cible && typeof cible.closest === 'function'
          ? cible.closest('[data-const-key]') : null;
        if (!noeud || !layout.contains(noeud)) return;
        const entree = type === 'focusin' || type === 'mouseover';
        marquerNoeud(noeud, entree);
      }, true);
    });

  /* E038-10 — Manifeste déclaratif : contrat de test lisible par machine,
       distinct de l'instantané d'état de la passe 1, sans réseau ni stockage. */
    const manifeste = {
      vue: ctx.viewId || 'constellation',
      passe: 'v2',
      selecteurs: {
        aretes: 'svg.constellation-edges line.const-edge',
        noeuds: '[data-const-key]',
        inspecteur: '#v2e038-inspecteur',
        bilan: '#v2e038-integrity',
      },
      attentes: {
        aretes: edges.length,
        noeuds: parPosition.size,
        pairesUniques: pairesVues.size,
        doublons,
        nonResolus,
        exAequo,
        epoch,
        integrite: anomalies.length ? 'anomalies' : 'ok',
      },
      distribution: {
        minimum: Number(min.toFixed(2)),
        maximum: Number(max.toFixed(2)),
        mediane: Number(mediane.toFixed(2)),
        ecartType: Number(ecartType.toFixed(2)),
      },
      invariants: [
        'Les rangs de longueur forment une permutation de 1 à N.',
        'Paires uniques + doublons = nombre d’arêtes.',
        'L’époque croît d’une unité à chaque rendu.',
      ],
    };
    let manifesteNode = layout.querySelector('#v2e038-manifest');
    if (!manifesteNode) {
      manifesteNode = doc.createElement('script');
      manifesteNode.type = 'application/json';
      manifesteNode.id = 'v2e038-manifest';
      manifesteNode.setAttribute('aria-hidden', 'true');
      manifesteNode.textContent = JSON.stringify(manifeste);
      caption.appendChild(manifesteNode);
    }
    svg.setAttribute('data-v2e038-manifest', 'ready');
  } catch {
    /* Greffon tolérant : toute anomalie locale est neutralisée sans bruit. */
    return;
  }
});
