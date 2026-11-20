import { register } from './registry.js';

/* Lentille V2 E037 — Statistiques et topologie du graphe d'arêtes de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   déterministes, tolérants à un DOM incomplet, sans réseau, sans source
   aléatoire, sans minuteur ni boucle d'animation propre. Préfixe DOM réservé :
   v2e037 (aucune collision avec la passe 1 qui utilisait e037). */
register('E037', ctx => {
  /* Garde d'entrée : sans layout courant ni document, aucun ajout au DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function'
      || typeof document === 'undefined') return;

  const layout = ctx.layout;
  const doc = layout.ownerDocument || document;
  if (!doc) return;

  /* Feuille unique de la lentille : id réservé, aucun import ni url distante. */
  const css = ctx.css;
  if (typeof css === 'function') {
    css('constellation-v2-e037', `
      .constellation-caption .v2e037-bloc{margin:8px 0 0;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
      .v2e037-titre{margin:0 0 4px;color:var(--gold);font-size:10px;letter-spacing:.04em}
      .v2e037-ligne{margin:2px 0;color:var(--ink-soft);font-size:9px;line-height:1.55;font-variant-numeric:tabular-nums}
      .v2e037-barre{font-family:ui-monospace,monospace;color:var(--gold-bright)}
      .v2e037-table{width:100%;border-collapse:collapse;font-size:9px;color:var(--ink-soft)}
      .v2e037-table th,.v2e037-table td{padding:2px 4px;border-bottom:1px solid var(--line);text-align:left;font-variant-numeric:tabular-nums}
      .v2e037-fiche{white-space:pre-wrap;word-break:break-word;margin:6px 0 0;padding:8px;border:1px dashed var(--line);border-radius:6px;color:var(--ink-soft);font:9px/1.5 ui-monospace,monospace;max-height:150px;overflow:auto}
      @media print{.constellation-field,.constellation-head{display:none!important}.v2e037-bloc{break-inside:avoid;border-color:#777}.v2e037-fiche{max-height:none;overflow:visible}}
    `);
  }

  /* Fabrique d'éléments avec repli local si le contexte ne fournit pas ctx.el. */
  const faire = typeof ctx.el === 'function'
    ? ctx.el
    : (tag, cls, txt) => {
        const n = doc.createElement(tag);
        if (cls) n.className = cls;
        if (txt !== undefined) n.textContent = txt;
        return n;
      };

  /* Lecture numérique déterministe : jamais d'aléa, repli sur zéro. */
  const nombre = (v) => { const n = Number.parseFloat(v); return Number.isFinite(n) ? n : 0; };

  /* Clé de position stable, arrondie au centième comme les attributs SVG. */
  const clef = (x, y) => `${(Math.round(x * 100) / 100).toFixed(2)};${(Math.round(y * 100) / 100).toFixed(2)}`;

  /* Ajout d'un bloc de diagnostic textuel dans la légende de la vue. */
  let caption = layout;
  const bloc = (id, titre) => {
    const section = faire('section', 'v2e037-bloc');
    section.id = id;
    section.appendChild(faire('h3', 'v2e037-titre', titre));
    caption.appendChild(section);
    return section;
  };
  const ligne = (parent, texte) => {
    const p = faire('p', 'v2e037-ligne', texte);
    parent.appendChild(p);
    return p;
  };

  /* Collecte unique des arêtes, des nœuds et des mesures partagées. */
  let edges = [];
  let mesures = [];
  let noeuds = [];
  let soleil = null;
  try {
    edges = Array.from(layout.querySelectorAll('.constellation-edges line'));
    caption = layout.querySelector('.constellation-caption') || layout;
    soleil = layout.querySelector('.const-sun');
    noeuds = Array.from(layout.querySelectorAll('.const-planet, .const-moon, .const-sun'));
    mesures = edges.map((line, index) => {
      const x1 = nombre(line.getAttribute('x1'));
      const y1 = nombre(line.getAttribute('y1'));
      const x2 = nombre(line.getAttribute('x2'));
      const y2 = nombre(line.getAttribute('y2'));
      const type = line.classList.contains('is-moon') ? 'lune'
        : line.classList.contains('is-path') ? 'chemin' : 'libre';
      line.setAttribute('data-v2e037-kind', type);
      return {
        line, index, x1, y1, x2, y2, type,
        a: clef(x1, y1), b: clef(x2, y2),
        longueur: Math.hypot(x2 - x1, y2 - y1)
      };
    });
  } catch {
    /* DOM incomplet : les chantiers ci-dessous opèrent sur des jeux vides. */
  }

  /* E037-01 — Degré de connexion par nœud et distribution textuelle. */
  try {
    const degres = new Map();
    mesures.forEach(m => {
      degres.set(m.a, (degres.get(m.a) || 0) + 1);
      degres.set(m.b, (degres.get(m.b) || 0) + 1);
    });
    noeuds.forEach(n => {
      const k = clef(nombre(n.style.getPropertyValue('--x')), nombre(n.style.getPropertyValue('--y')));
      if (degres.has(k)) n.setAttribute('data-v2e037-degree', String(degres.get(k)));
    });
    const distribution = new Map();
    degres.forEach(d => distribution.set(d, (distribution.get(d) || 0) + 1));
    const parties = Array.from(distribution.entries()).sort((a, b) => a[0] - b[0])
      .map(([d, n]) => `degré ${d} : ${n} nœud${n > 1 ? 's' : ''}`);
    const s = bloc('v2e037-degrees', 'Degré de connexion des nœuds');
    ligne(s, parties.length ? parties.join(' · ') : 'Aucun nœud connecté.');
    ligne(s, `Nœuds distincts touchés par au moins une arête : ${degres.size}.`);
  } catch { /* chantier neutralisé sans bruit */ }

  /* E037-02 — Statistiques de longueur et histogramme textuel déterministe. */
  try {
    const tri = mesures.map(m => m.longueur).sort((a, b) => a - b);
    const n = tri.length;
    const min = n ? tri[0] : 0;
    const max = n ? tri[n - 1] : 0;
    const med = n ? (n % 2 ? tri[(n - 1) / 2] : (tri[n / 2 - 1] + tri[n / 2]) / 2) : 0;
    const moy = n ? tri.reduce((a, b) => a + b, 0) / n : 0;
    const ecart = n > 1 ? Math.sqrt(tri.reduce((a, b) => a + (b - moy) * (b - moy), 0) / n) : 0;
    const s = bloc('v2e037-distribution', 'Distribution des longueurs');
    ligne(s, `min ${min.toFixed(2)} · médiane ${med.toFixed(2)} · moyenne ${moy.toFixed(2)} · max ${max.toFixed(2)} · écart-type ${ecart.toFixed(2)}.`);
    const bornes = [0, 10, 20, 30, 40, 50, 100];
    bornes.slice(0, -1).forEach((b, i) => {
      const c = tri.filter(v => v >= b && v < bornes[i + 1]).length;
      const barre = '■'.repeat(Math.min(c, 20)) + (c > 20 ? '+' : '');
      ligne(s, `${b}–${bornes[i + 1]} : ${barre} (${c})`);
    });
  } catch { /* chantier neutralisé sans bruit */ }

  /* E037-03 — Détection des arêtes parallèles partageant leurs extrémités. */
  try {
    const groupes = new Map();
    mesures.forEach(m => {
      const k = [m.a, m.b].sort().join('|');
      if (!groupes.has(k)) groupes.set(k, []);
      groupes.get(k).push(m);
    });
    const doublons = [];
    groupes.forEach((liste, k) => {
      if (liste.length < 2) return;
      liste.forEach(m => m.line.setAttribute('data-v2e037-duplicate', 'true'));
      doublons.push(`${liste.length} arêtes sur ${k.split('|').join(' ↔ ')}`);
    });
    const s = bloc('v2e037-duplicates', 'Arêtes parallèles');
    ligne(s, doublons.length ? doublons.join(' · ') : 'Aucune paire d’extrémités partagée : aucun doublon.');
  } catch { /* chantier neutralisé sans bruit */ }

  /* E037-04 — Composantes connexes calculées par union-find déterministe. */
  try {
    const parent = new Map();
    const trouver = (x) => {
      let r = x;
      while (parent.get(r) !== r) r = parent.get(r);
      while (parent.get(x) !== x) { const p = parent.get(x); parent.set(x, r); x = p; }
      return r;
    };
    mesures.forEach(m => {
      if (!parent.has(m.a)) parent.set(m.a, m.a);
      if (!parent.has(m.b)) parent.set(m.b, m.b);
      const ra = trouver(m.a), rb = trouver(m.b);
      if (ra !== rb) parent.set(rb, ra);
    });
    const racines = new Map();
    parent.forEach((_, k) => { const r = trouver(k); racines.set(r, (racines.get(r) || 0) + 1); });
    const tailleMax = racines.size ? Math.max(...racines.values()) : 0;
    const s = bloc('v2e037-components', 'Composantes connexes');
    ligne(s, `${racines.size} composante${racines.size > 1 ? 's' : ''} · plus grande : ${tailleMax} nœud${tailleMax > 1 ? 's' : ''}.`);
    ligne(s, racines.size <= 1 ? 'Le graphe est connexe.' : 'Le graphe est fragmenté : certains nœuds ne communiquent pas entre eux.');
  } catch { /* chantier neutralisé sans bruit */ }

  /* E037-05 — Sens radial de chaque arête par rapport au soleil. */
  try {
    const sx = soleil ? nombre(soleil.style.getPropertyValue('--x')) : 50;
    const sy = soleil ? nombre(soleil.style.getPropertyValue('--y')) : 50;
    const distance = (x, y) => Math.hypot(x - sx, y - sy);
    let vers = 0, depuis = 0, neutres = 0;
    mesures.forEach(m => {
      const delta = distance(m.x2, m.y2) - distance(m.x1, m.y1);
      let sens;
      if (delta < -0.5) { sens = 'vers-soleil'; vers++; }
      else if (delta > 0.5) { sens = 'depuis-soleil'; depuis++; }
      else { sens = 'neutre'; neutres++; }
      m.line.setAttribute('data-v2e037-radial', sens);
    });
    const s = bloc('v2e037-radial', 'Orientation radiale');
    ligne(s, `Repère soleil (${sx.toFixed(2)} ; ${sy.toFixed(2)}) : vers ${vers} · depuis ${depuis} · neutres ${neutres}.`);
  } catch { /* chantier neutralisé sans bruit */ }

  /* E037-06 — Angles d'incidence entre arêtes partageant un nœud. */
  try {
    const incident = new Map();
    mesures.forEach(m => {
      [m.a, m.b].forEach(k => {
        if (!incident.has(k)) incident.set(k, []);
        incident.get(k).push(m);
      });
    });
    let perpendiculaires = 0, alignes = 0, paires = 0;
    incident.forEach((liste, k) => {
      const borne = liste.slice(0, 12);
      const sommet = k.split(';').map(nombre);
      for (let i = 0; i < borne.length; i++) {
        for (let j = i + 1; j < borne.length; j++) {
          paires++;
          const ca = (borne[i].a === k ? borne[i].b : borne[i].a).split(';').map(nombre);
          const cb = (borne[j].a === k ? borne[j].b : borne[j].a).split(';').map(nombre);
          const dx1 = ca[0] - sommet[0], dy1 = ca[1] - sommet[1];
          const dx2 = cb[0] - sommet[0], dy2 = cb[1] - sommet[1];
          const norme1 = Math.hypot(dx1, dy1), norme2 = Math.hypot(dx2, dy2);
          if (!norme1 || !norme2) continue;
          const cos = Math.max(-1, Math.min(1, (dx1 * dx2 + dy1 * dy2) / (norme1 * norme2)));
          const angle = Math.acos(cos) * 180 / Math.PI;
          if (angle >= 80 && angle <= 100) perpendiculaires++;
          else if (angle < 10 || angle > 170) alignes++;
        }
      }
    });
    const s = bloc('v2e037-angles', 'Angles d’incidence');
    ligne(s, `${paires} paire${paires > 1 ? 's' : ''} d’arêtes incidentes · ${perpendiculaires} jonctions quasi perpendiculaires · ${alignes} quasi alignées.`);
  } catch { /* chantier neutralisé sans bruit */ }

  /* E037-07 — Bilan pondéré par type de longueur, sous forme de tableau. */
  try {
    const types = ['chemin', 'lune', 'libre'];
    const total = mesures.reduce((a, m) => a + m.longueur, 0);
    const s = bloc('v2e037-weight', 'Longueur totale par type');
    const table = faire('table', 'v2e037-table');
    const tete = faire('thead');
    const lTete = faire('tr');
    ['Type', 'Longueur', 'Part'].forEach(t => lTete.appendChild(faire('th', '', t)));
    tete.appendChild(lTete);
    table.appendChild(tete);
    const corps = faire('tbody');
    types.forEach(type => {
      const somme = mesures.filter(m => m.type === type).reduce((a, m) => a + m.longueur, 0);
      const tr = faire('tr');
      tr.appendChild(faire('td', '', type));
      tr.appendChild(faire('td', '', somme.toFixed(2)));
      tr.appendChild(faire('td', '', total ? `${(100 * somme / total).toFixed(1)} %` : '0 %'));
      corps.appendChild(tr);
    });
    table.appendChild(corps);
    s.appendChild(table);
    layout.setAttribute('data-v2e037-total-length', total.toFixed(2));
  } catch { /* chantier neutralisé sans bruit */ }

  /* E037-08 — Densité du graphe et couverture des nœuds déclarés. */
  try {
    const uniques = new Set();
    mesures.forEach(m => { uniques.add(m.a); uniques.add(m.b); });
    const v = uniques.size, e = mesures.length;
    const densite = v > 1 ? (2 * e) / (v * (v - 1)) : 0;
    const presents = noeuds.filter(n => uniques.has(
      clef(nombre(n.style.getPropertyValue('--x')), nombre(n.style.getPropertyValue('--y')))
    )).length;
    const couverture = noeuds.length ? Math.round(100 * presents / noeuds.length) : 0;
    const s = bloc('v2e037-density', 'Densité et couverture');
    ligne(s, `${v} nœuds uniques · ${e} arêtes · densité ${densite.toFixed(3)} · couverture ${couverture} % des nœuds déclarés.`);
  } catch { /* chantier neutralisé sans bruit */ }

  /* E037-09 — Estimation de contraste des traits et indice non coloré. */
  try {
    const luminance = (valeur) => {
      const composantes = String(valeur || '').match(/[\d.]+/g);
      if (!composantes || composantes.length < 3) return null;
      const c = composantes.slice(0, 3).map(nombre).map(x => {
        const u = x / 255;
        return u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const vue = doc.defaultView;
    let evalues = 0, lisibles = 0;
    mesures.forEach(m => {
      let stroke = '';
      try {
        stroke = (vue && typeof vue.getComputedStyle === 'function')
          ? vue.getComputedStyle(m.line).stroke : '';
      } catch { stroke = ''; }
      const L = luminance(stroke);
      if (L === null) return;
      evalues++;
      const contraste = 1 + 20 * L;
      if (contraste >= 3) lisibles++;
      m.line.setAttribute('data-v2e037-contrast', contraste.toFixed(2));
    });
    const s = bloc('v2e037-contrast', 'Lisibilité des traits');
    ligne(s, `${evalues} trait${evalues > 1 ? 's' : ''} évalué${evalues > 1 ? 's' : ''} sur fond sombre · ${lisibles} dépassent 3:1 (estimation, transparence non pondérée).`);
    ligne(s, 'Le type reste identifié par data-v2e037-kind et par la forme du trait, jamais par la couleur seule.');
  } catch { /* chantier neutralisé sans bruit */ }

  /* E037-10 — Fiche textuelle selectible, imprimable et sans dépendance. */
  try {
    const s = bloc('v2e037-summary', 'Fiche de synthèse imprimable');
    const fiche = faire('pre', 'v2e037-fiche');
    fiche.id = 'v2e037-fiche';
    const chemin = mesures.filter(m => m.type === 'chemin').length;
    const lune = mesures.filter(m => m.type === 'lune').length;
    const total = mesures.reduce((a, m) => a + m.longueur, 0);
    const longest = mesures.reduce((a, m) => Math.max(a, m.longueur), 0);
    fiche.textContent = [
      'Diagnostic V2 des arêtes — vue Constellation',
      `Arêtes : ${mesures.length} · chemin ${chemin} · lune ${lune} · libre ${mesures.length - chemin - lune}`,
      `Longueur totale : ${total.toFixed(2)} · arête la plus longue : ${longest.toFixed(2)}`,
      `Attributs par arête : data-v2e037-kind, radial ; duplicate et contrast si évalués`,
      'Fiche autonome : aucun réseau, aucune donnée aléatoire, aucun minuteur.'
    ].join('\n');
    s.appendChild(fiche);
  } catch { /* chantier neutralisé sans bruit */ }
});
