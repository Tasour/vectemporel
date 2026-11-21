import { register } from './registry.js';

/* Lentille V2 E088 — audit topologicalique du réseau SVG de traits de la vue
   Constellation (soleil de l'ère active → repère actif → point vérifié actif).
   Seconde passe : dix chantiers inédits, tous implémentés, sans réseau, sans
   source aléatoire et sans minuteur ni boucle d'animation propre. Préfixe
   exclusif : v2e088 (aucune collision avec la passe 1). */
register('E088', ctx => {
  /* Garde d'entrée : sans contexte ni layout courant, aucun ajout au DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  if (typeof document === 'undefined' || typeof ctx.css !== 'function') return;
  const css = ctx.css;
  const layout = ctx.layout;

  /* Chaque chantier est isolé : une anomalie locale n'empêche pas les autres. */
  const safe = (fn) => { try { fn(); } catch { /* neutralisé sans bruit */ } };

  /* Lecture déterministe : repli au centre du viewBox si l'attribut manque. */
  const nombre = (value) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 50;
  };
  const arrondi = (value) => Math.round(value * 100) / 100;
  const cle = (x, y) => arrondi(x) + ',' + arrondi(y);
  const creer = (tag, className, text) => typeof ctx.el === 'function'
    ? ctx.el(tag, className, text) : document.createElement(tag);

  /* Direction compassée : 0° = haut, 90° = droite, mesurée dans le repère du
     viewBox. Le secteur à huit cases évite de faire porter un fait à la couleur. */
  const SECTEURS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const direction = (segment) => {
    const dx = segment.x2 - segment.x1;
    const dy = segment.y2 - segment.y1;
    const degres = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
    return { degres, secteur: SECTEURS[Math.round(degres / 45) % 8] };
  };

  /* Feuille unique de la lentille : texte masqué, accent des croisements par
     tracé (jamais par la seule couleur), cible tactile et repli sobre. */
  css('constellation-v2-e088', `
.v2e088-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.constellation-layout[data-v2e088="on"] .const-edge.v2e088-croise{stroke-dasharray:2 4}
.constellation-layout[data-v2e088="on"] .const-edge.v2e088-doublon{stroke-dasharray:1 5}
.v2e088-parcours{min-height:36px;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--ink-soft);font-size:10px;cursor:pointer}
.v2e088-parcours:focus-visible{outline:3px solid var(--gold-bright);outline-offset:3px}
.v2e088-calm .v2e088-parcours{transition:none}
@media (prefers-reduced-motion: reduce){.v2e088-parcours{transition:none}}
`);

  const edges = layout.querySelector('svg.constellation-edges');
  if (!edges || typeof edges.querySelectorAll !== 'function') return;
  const lignes = Array.from(edges.querySelectorAll('line.const-edge'));
  if (!lignes.length) return;

  const field = layout.querySelector('.constellation-field');
  const caption = layout.querySelector('.constellation-caption');
  const couches = [
    layout.querySelector('.const-layer-suns'),
    layout.querySelector('.const-layer-planets'),
    layout.querySelector('.const-layer-moons'),
  ];

  /* Chaque trait est lu une seule fois, dans le repère 0–100 du viewBox. */
  const segments = lignes.map((node) => ({
    node,
    x1: nombre(node.getAttribute('x1')), y1: nombre(node.getAttribute('y1')),
    x2: nombre(node.getAttribute('x2')), y2: nombre(node.getAttribute('y2')),
    moon: node.classList.contains('is-moon'),
    path: node.classList.contains('is-path'),
  }));

  /* Position rendue d'un bouton, lue sur ses variables CSS --x/--y. */
  const positionBouton = (node) => node
    ? { x: nombre(node.style.getPropertyValue('--x')), y: nombre(node.style.getPropertyValue('--y')) }
    : null;
  const soleilActif = layout.querySelector('.const-sun.is-active');
  const planeteActive = layout.querySelector('.const-planet.is-active');
  const luneActive = layout.querySelector('.const-moon.is-active');

  /* E088-01 — Angle compassé et secteur de chaque arête, avec histogramme
     des huit directions sur le réseau pour une assertion d'orientation. */
  safe(() => {
    const histoire = Object.create(null);
    segments.forEach((segment) => {
      const { degres, secteur } = direction(segment);
      segment.node.setAttribute('data-v2e088-angle', degres.toFixed(1));
      segment.node.setAttribute('data-v2e088-secteur', secteur);
      histoire[secteur] = (histoire[secteur] || 0) + 1;
    });
    const parts = SECTEURS.filter((secteur) => histoire[secteur])
      .map((secteur) => secteur + ':' + histoire[secteur]);
    edges.setAttribute('data-v2e088-orientations', parts.join(';'));
  });

  /* E088-02 — Degré des sommets : les extrémités arrondies sont regroupées,
     ce qui distingue les nœuds terminaux (degré 1) des jonctions (degré ≥ 2). */
  const degres = new Map();
  safe(() => {
    segments.forEach((segment) => {
      const a = cle(segment.x1, segment.y1);
      const b = cle(segment.x2, segment.y2);
      if (!degres.has(a)) degres.set(a, { x: segment.x1, y: segment.y1, degre: 0 });
      if (!degres.has(b)) degres.set(b, { x: segment.x2, y: segment.y2, degre: 0 });
      degres.get(a).degre += 1;
      degres.get(b).degre += 1;
      segment.node.setAttribute('data-v2e088-degre',
        degres.get(a).degre + '>' + degres.get(b).degre);
    });
    let jonctions = 0;
    degres.forEach((sommet) => { if (sommet.degre >= 2) jonctions += 1; });
    edges.setAttribute('data-v2e088-noeuds',
      'total=' + degres.size + ';terminaux=' + (degres.size - jonctions) + ';jonctions=' + jonctions);
    couches.forEach((couche) => {
      if (!couche || typeof couche.querySelectorAll !== 'function') return;
      Array.from(couche.querySelectorAll('button')).forEach((bouton) => {
        const p = positionBouton(bouton);
        const sommet = p && degres.get(cle(p.x, p.y));
        bouton.setAttribute('data-v2e088-jonction', sommet && sommet.degre >= 2 ? '1' : '0');
      });
    });
  });

  /* E088-03 — Composantes connexes et accessibilité depuis le soleil actif :
     un parcours en largeur déterministe mesure la portée du chemin. */
  safe(() => {
    const voisins = new Map();
    const ajouter = (a, b) => {
      if (!voisins.has(a)) voisins.set(a, []);
      voisins.get(a).push(b);
    };
    segments.forEach((segment) => {
      const a = cle(segment.x1, segment.y1);
      const b = cle(segment.x2, segment.y2);
      ajouter(a, b);
      ajouter(b, a);
    });
    const visites = new Set();
    const composantes = [];
    degres.forEach((_sommet, racine) => {
      if (visites.has(racine)) return;
      composantes.push(racine);
      const file = [racine];
      visites.add(racine);
      while (file.length) {
        const courant = file.shift();
        (voisins.get(courant) || []).forEach((suivant) => {
          if (visites.has(suivant)) return;
          visites.add(suivant);
          file.push(suivant);
        });
      }
    });
    const ancre = positionBouton(soleilActif)
      || { x: segments[0].x1, y: segments[0].y1 };
    const depart = cle(ancre.x, ancre.y);
    const accessibles = new Set();
    if (degres.has(depart)) {
      const file = [depart];
      accessibles.add(depart);
      while (file.length) {
        const courant = file.shift();
        (voisins.get(courant) || []).forEach((suivant) => {
          if (accessibles.has(suivant)) return;
          accessibles.add(suivant);
          file.push(suivant);
        });
      }
    }
    [planeteActive, luneActive].forEach((bouton) => {
      if (!bouton) return;
      const p = positionBouton(bouton);
      bouton.setAttribute('data-v2e088-atteint', p && accessibles.has(cle(p.x, p.y)) ? '1' : '0');
    });
    edges.setAttribute('data-v2e088-composantes', String(composantes.length));
    edges.setAttribute('data-v2e088-atteignables',
      accessibles.size + '/' + degres.size);
  });

  /* E088-04 — Croisements propres entre traits, hors extrémités partagées :
     le produit vectoriel signé donne un test exact et borné. */
  const croisements = { count: 0 };
  safe(() => {
    const orient = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const p = (s, i) => i === 0 ? { x: s.x1, y: s.y1 } : { x: s.x2, y: s.y2 };
    let total = 0;
    for (let i = 0; i < segments.length; i += 1) {
      for (let j = i + 1; j < segments.length; j += 1) {
        const a = segments[i];
        const b = segments[j];
        const commun = cle(a.x1, a.y1) === cle(b.x1, b.y1)
          || cle(a.x1, a.y1) === cle(b.x2, b.y2)
          || cle(a.x2, a.y2) === cle(b.x1, b.y1)
          || cle(a.x2, a.y2) === cle(b.x2, b.y2);
        if (commun) continue;
        const a1 = p(a, 0), a2 = p(a, 1), b1 = p(b, 0), b2 = p(b, 1);
        const d1 = orient(a1, a2, b1);
        const d2 = orient(a1, a2, b2);
        const d3 = orient(b1, b2, a1);
        const d4 = orient(b1, b2, a2);
        if (d1 * d2 < 0 && d3 * d4 < 0) {
          total += 1;
          a.node.classList.add('v2e088-croise');
          b.node.classList.add('v2e088-croise');
        }
      }
    }
    croisements.count = total;
    edges.setAttribute('data-v2e088-croisements', String(total));
  });

  /* E088-05 — Barycentre des milieux et dérive radiale par rapport au centre
     (50, 50) du viewBox, référence explicite de la mesure. */
  safe(() => {
    let sx = 0, sy = 0, rayon = 0;
    segments.forEach((segment) => {
      const mx = (segment.x1 + segment.x2) / 2;
      const my = (segment.y1 + segment.y2) / 2;
      sx += mx; sy += my;
      const r = Math.hypot(mx - 50, my - 50);
      if (r > rayon) rayon = r;
    });
    const cx = sx / segments.length;
    const cy = sy / segments.length;
    const derive = Math.hypot(cx - 50, cy - 50);
    edges.setAttribute('data-v2e088-barycentre', arrondi(cx) + ',' + arrondi(cy));
    edges.setAttribute('data-v2e088-derive',
      'derive=' + derive.toFixed(2) + '/rayon=' + rayon.toFixed(2) + '/reference=50,50');
  });

  /* E088-06 — Cohérence entre la géométrie SVG et la position réelle des
     boutons : l'origine d'un trait lunaire doit être le repère actif. */
  let ancrageOk = false;
  safe(() => {
    const cible = positionBouton(planeteActive);
    const point = positionBouton(luneActive);
    let ecart = Infinity;
    segments.forEach((segment) => {
      if (!segment.moon || !cible) return;
      const d = Math.hypot(segment.x1 - cible.x, segment.y1 - cible.y);
      if (d < ecart) ecart = d;
      segment.node.setAttribute('data-v2e088-ancrage', d.toFixed(2));
    });
    if (point) {
      segments.forEach((segment) => {
        if (!segment.moon || !segment.path) return;
        const d = Math.hypot(segment.x2 - point.x, segment.y2 - point.y);
        segment.node.setAttribute('data-v2e088-extremite', d.toFixed(2));
      });
    }
    ancrageOk = Number.isFinite(ecart) && ecart <= 0.5;
    edges.setAttribute('data-v2e088-ancrage-ok', ancrageOk ? '1' : '0');
  });

  /* E088-07 — Boîte englobante du réseau et taux de couverture du viewBox,
     rapporté à la surface de référence 100 × 100. */
  safe(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    segments.forEach((segment) => {
      [segment.x1, segment.x2].forEach((x) => {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      });
      [segment.y1, segment.y2].forEach((y) => {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      });
    });
    const part = ((maxX - minX) * (maxY - minY) / 10000) * 100;
    edges.setAttribute('data-v2e088-boite',
      'x=' + arrondi(minX) + '..' + arrondi(maxX) + ';y=' + arrondi(minY) + '..' + arrondi(maxY));
    edges.setAttribute('data-v2e088-couverture',
      'part=' + part.toFixed(1) + '%/reference=100%');
  });

  /* E088-08 — Légende textuelle masquée : chaque arête du SVG (aria-hidden)
     reçoit un équivalent lisible, rattaché au champ sans écraser sa note. */
  safe(() => {
    let liste = layout.querySelector('#v2e088-legende');
    if (!liste) {
      liste = creer('ol', 'v2e088-sr');
      liste.id = 'v2e088-legende';
      liste.setAttribute('aria-label', 'Équivalent textuel des traits du réseau');
      segments.forEach((segment, index) => {
        const { degres, secteur } = direction(segment);
        const nature = segment.moon
          ? (segment.path ? 'lune active' : 'lune inactive')
          : (segment.path ? 'chemin actif' : 'liaison');
        const item = creer('li', '', 'Arête ' + (index + 1) + ' : ' + nature
          + ', de (' + segment.x1.toFixed(2) + ',' + segment.y1.toFixed(2) + ') à ('
          + segment.x2.toFixed(2) + ',' + segment.y2.toFixed(2) + '), angle '
          + degres.toFixed(0) + '°, secteur ' + secteur + '.');
        item.setAttribute('aria-posinset', String(index + 1));
        item.setAttribute('aria-setsize', String(segments.length));
        liste.appendChild(item);
      });
      layout.appendChild(liste);
    }
    if (field) {
      const decrits = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      if (decrits.indexOf(liste.id) === -1) {
        decrits.push(liste.id);
        field.setAttribute('aria-describedby', decrits.join(' '));
      }
    }
  });

  /* E088-09 — Parcours guidé clavier de la chaîne : un bouton à cible large
     amène le focus sur soleil, repère puis point, avec annonce live. */
  safe(() => {
    const etapes = [soleilActif, planeteActive, luneActive].filter(Boolean);
    if (!etapes.length || !caption) return;
    let curseur = -1;
    if (!layout.querySelector('#v2e088-annonce')) {
      const annonce = creer('p', 'v2e088-sr', '');
      annonce.id = 'v2e088-annonce';
      annonce.setAttribute('role', 'status');
      annonce.setAttribute('aria-live', 'polite');
      annonce.setAttribute('aria-atomic', 'true');
      layout.appendChild(annonce);
    }
    if (!layout.querySelector('#v2e088-parcours')) {
      const bouton = creer('button', 'v2e088-parcours', 'Parcourir la chaîne de connexion');
      bouton.id = 'v2e088-parcours';
      bouton.type = 'button';
      bouton.addEventListener('click', () => {
        curseur = (curseur + 1) % etapes.length;
        const cible = etapes[curseur];
        if (cible) cible.focus({ preventScroll: true });
        layout.setAttribute('data-v2e088-etape', String(curseur + 1) + '/' + etapes.length);
        const annonce = layout.querySelector('#v2e088-annonce');
        if (annonce) annonce.textContent = 'Étape ' + (curseur + 1) + ' sur ' + etapes.length
          + ' : ' + (cible && cible.dataset.label ? cible.dataset.label : 'nœud du chemin') + '.';
      });
      caption.insertBefore(bouton, caption.firstChild);
    }
  });

  /* E088-10 — Synthèse d'intégrité : collisions de nœuds confondus, score
     d'anomalies agrégé et repli « mouvement réduit » demandé au contexte. */
  safe(() => {
    const vus = new Map();
    let collisions = 0;
    couches.forEach((couche) => {
      if (!couche || typeof couche.querySelectorAll !== 'function') return;
      Array.from(couche.querySelectorAll('button')).forEach((bouton) => {
        const p = positionBouton(bouton);
        if (!p) return;
        const k = cle(p.x, p.y);
        vus.set(k, (vus.get(k) || 0) + 1);
      });
    });
    vus.forEach((count, k) => {
      if (count < 2) return;
      collisions += count - 1;
      couches.forEach((couche) => {
        if (!couche || typeof couche.querySelectorAll !== 'function') return;
        Array.from(couche.querySelectorAll('button')).forEach((bouton) => {
          const p = positionBouton(bouton);
          if (p && cle(p.x, p.y) === k) {
            bouton.setAttribute('data-v2e088-doublon', '1');
            bouton.classList.add('v2e088-doublon');
          }
        });
      });
    });
    const anomalies = croisements.count + collisions + (ancrageOk ? 0 : 1);
    edges.setAttribute('data-v2e088-collisions', String(collisions));
    layout.setAttribute('data-v2e088', 'on');
    layout.setAttribute('data-v2e088-integrite',
      'anomalies=' + anomalies + ';croisements=' + croisements.count
      + ';collisions=' + collisions + ';ancrage=' + (ancrageOk ? 'ok' : 'ko'));
    const reduit = typeof ctx.reducedMotion === 'function' && Boolean(ctx.reducedMotion());
    layout.classList.toggle('v2e088-calm', !!reduit);
    layout.setAttribute('data-v2e088-motion', reduit ? 'reduced' : 'full');
  });
});
