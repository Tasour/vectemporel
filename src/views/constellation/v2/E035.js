import { register } from './registry.js';

/* Lentille V2 E035 — adaptabilité responsive des arêtes du graphe de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau, sans source aléatoire et sans minuteur ni boucle d'animation
   propre. Préfixe exclusif : v2e035 (aucune collision avec la passe 1). */
register('E035', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function'
      || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  const make = typeof ctx.el === 'function' ? ctx.el : (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  /* Feuille unique de la lentille. Tout est cadré par le préfixe v2e035 ;
     aucun signal n'est porté par la seule couleur : forme, tiret et texte. */
  css('constellation-v2-e035', `
.v2e035-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
/* E035-01 — format du champ : le pas de tiret suit le ratio mesuré. */
.constellation-field[data-v2e035-format="portrait"] .constellation-edges line:not([data-v2e035-priorite="haute"]){stroke-dasharray:1.2 1.4}
.constellation-field[data-v2e035-format="carre"] .constellation-edges line:not([data-v2e035-priorite="haute"]){stroke-dasharray:1.6 1.6}
.constellation-field[data-v2e035-format="paysage"] .constellation-edges line:not([data-v2e035-priorite="haute"]){stroke-dasharray:2 2}
/* E035-02 — inclinaison : la forme du trait double l'information de teinte. */
.constellation-edges line[data-v2e035-pente="diagonal"]:not([data-v2e035-priorite="haute"]){stroke-dasharray:var(--v2e035-tirets,1.6 1.6)}
.constellation-edges line[data-v2e035-pente="horizontal"]:not([data-v2e035-priorite="haute"]){stroke-linecap:butt}
.constellation-edges line[data-v2e035-pente="vertical"]:not([data-v2e035-priorite="haute"]){stroke-linecap:square}
/* E035-03 — longueur : un trait court garde un pointillé fin et visible. */
.constellation-edges line[data-v2e035-longueur="courte"]:not([data-v2e035-priorite="haute"]){stroke-dasharray:.6 1}
/* E035-04 — doublons : décalage du tiret pour séparer deux traits superposés. */
.constellation-edges line[data-v2e035-doublon="oui"]:not([data-v2e035-priorite="haute"]){stroke-dashoffset:1.4;opacity:.8}
/* E035-05 — déformation du viewBox : correction du pas de tiret. */
.constellation-edges[data-v2e035-deformation="etire"] line:not([data-v2e035-priorite="haute"]){stroke-dasharray:2.4 1.6}
.constellation-edges[data-v2e035-deformation="ecrase"] line:not([data-v2e035-priorite="haute"]){stroke-dasharray:1.2 2}
/* E035-06 — bascule indépendante : cible >= 36 px, focus visible, état pressé. */
#v2e035-toggle{
  min-height:36px;
  padding:6px 12px;
  border:1px solid var(--gold,#e6b96f);
  border-radius:8px;
  background:var(--surface-2,rgba(255,255,255,.06));
  color:var(--ink,#f4f6f8);
  font-size:11px;
  cursor:pointer;
}
#v2e035-toggle:focus-visible{outline:3px solid var(--gold-bright,#f5d99a);outline-offset:3px}
#v2e035-toggle[aria-pressed="true"]{border-width:2px;border-style:double;background:var(--gold,#e6b96f);color:#1a1408}
.constellation-field[data-v2e035-renforce="oui"] .constellation-edges line:not([data-v2e035-priorite="haute"]){stroke-dasharray:none;opacity:1}
/* E035-07 — compteur de croisements : texte indexable, bordure distincte. */
#v2e035-cross{
  margin:6px 0 0;padding:4px 8px;
  border:1px solid var(--line);border-left:3px solid var(--gold-bright,#f5d99a);
  border-radius:6px;color:var(--ink,#f4f6f8);
  font-size:9px;line-height:1.45;font-variant-numeric:tabular-nums;
}
/* E035-08 — légende des inclinaisons : trait orienté et libellé chiffré. */
.v2e035-orient{display:flex;flex-wrap:wrap;gap:3px 14px;margin:6px 0 0;color:var(--muted);font-size:9px}
.v2e035-orient-item{display:inline-flex;align-items:center;gap:5px}
.v2e035-orient-trait{display:inline-block;width:16px;height:0;border-top:2px solid var(--ink,#f4f6f8)}
.v2e035-orient-trait--diagonal{transform:rotate(-35deg)}
.v2e035-orient-trait--vertical{transform:rotate(90deg)}
@media (max-width:420px){
  .v2e035-orient{font-size:8px;gap:2px 8px}
  .v2e035-orient-trait{width:11px}
  #v2e035-cross{font-size:8px;padding:3px 6px}
}
/* E035-09 — priorité du chemin actif : aucune adaptation V2 ne l'altère. */
.constellation-edges line[data-v2e035-priorite="haute"]{stroke-linecap:round;stroke-dasharray:none;opacity:1}
/* E035-10 — repli mouvement réduit et couleurs forcées : les formes restent. */
.constellation-field.v2e035-sobre .v2e035-orient,
.v2e035-sobre #v2e035-toggle,
.v2e035-sobre #v2e035-cross{transition:none}
@media (prefers-reduced-motion:reduce){
  .v2e035-orient,#v2e035-toggle,#v2e035-cross{transition:none!important}
}
@media (forced-colors:active){
  .constellation-edges line:not([data-v2e035-priorite="haute"]){stroke:CanvasText;stroke-dasharray:2 2}
  .constellation-edges line[data-v2e035-priorite="haute"]{stroke:CanvasText;stroke-dasharray:none}
  .v2e035-orient-trait{border-top-color:CanvasText}
  #v2e035-toggle{border:1px solid CanvasText;color:CanvasText}
  #v2e035-toggle[aria-pressed="true"]{outline:2px double CanvasText}
}
  `);

  const svg = layout.querySelector('.constellation-edges');
  const lines = svg && typeof svg.querySelectorAll === 'function'
    ? Array.prototype.slice.call(svg.querySelectorAll('line')) : [];
  if (!lines.length) return;
  const field = layout.querySelector('.constellation-field') || layout;
  const caption = layout.querySelector('.constellation-caption');
  const french = value => String(value).replace('.', ',');
  const coord = (line, name) => {
    if (!line || typeof line.getAttribute !== 'function') return null;
    const raw = line.getAttribute(name);
    const value = raw === null || raw === undefined ? NaN : parseFloat(raw);
    return Number.isFinite(value) ? value : null;
  };
  const ecart = (ax, ay, bx, by) => Math.sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by));

  /* E035-01 — Format du champ déduit du ratio largeur/hauteur mesuré, et non
     d'un palier de largeur absolue comme dans la passe 1. Trois formats. */
  let ratio = null;
  let format = 'inconnu';
  if (typeof field.getBoundingClientRect === 'function') {
    const rect = field.getBoundingClientRect();
    if (rect && Number.isFinite(rect.width) && Number.isFinite(rect.height)
        && rect.width > 0 && rect.height > 0) {
      ratio = rect.width / rect.height;
      format = ratio < 0.85 ? 'portrait' : ratio <= 1.18 ? 'carre' : 'paysage';
    }
  }
  field.dataset.v2e035Format = format;
  field.dataset.v2e035Ratio = ratio === null
    ? 'indisponible' : french(Math.round(ratio * 100) / 100);

  /* E035-02 — Inclinaison de chaque arête : horizontale, verticale ou
     diagonale, calculée depuis x1/y1/x2/y2 du viewBox, sans aucune aléa. */
  const pentes = { horizontal: 0, vertical: 0, diagonal: 0 };
  lines.forEach(line => {
    const x1 = coord(line, 'x1');
    const y1 = coord(line, 'y1');
    const x2 = coord(line, 'x2');
    const y2 = coord(line, 'y2');
    let pente = 'indeterminee';
    if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      pente = dy <= dx * 0.15 ? 'horizontal'
        : dx <= dy * 0.15 ? 'vertical' : 'diagonal';
    }
    line.dataset.v2e035Pente = pente;
    if (Object.prototype.hasOwnProperty.call(pentes, pente)) pentes[pente] += 1;
  });
  field.dataset.v2e035Pentes = `${pentes.horizontal}/${pentes.vertical}/${pentes.diagonal}`;

  /* E035-03 — Longueur euclidienne en unités de viewBox, classée en trois
     catégories : le codage compense le compactage des écrans étroits. */
  lines.forEach(line => {
    const x1 = coord(line, 'x1');
    const y1 = coord(line, 'y1');
    const x2 = coord(line, 'x2');
    const y2 = coord(line, 'y2');
    let classe = 'indeterminee';
    if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
      const longueur = ecart(x1, y1, x2, y2);
      classe = longueur < 8 ? 'courte' : longueur <= 20 ? 'moyenne' : 'longue';
    }
    line.dataset.v2e035Longueur = classe;
  });
  field.dataset.v2e035Courtes = String(lines.filter(line =>
    line.dataset.v2e035Longueur === 'courte').length);

  /* E035-04 — Segments quasi superposés : deux extrémités à moins d'une
     demi-unité près sont marquées comme doublons, y compris en sens inverse. */
  const points = lines.map(line => ({
    x1: coord(line, 'x1'), y1: coord(line, 'y1'),
    x2: coord(line, 'x2'), y2: coord(line, 'y2'),
  }));
  let doublons = 0;
  lines.forEach((line, index) => {
    const a = points[index];
    let estDouble = false;
    if (a && a.x1 !== null && a.y1 !== null && a.x2 !== null && a.y2 !== null) {
      for (let other = 0; other < points.length; other += 1) {
        if (other === index) continue;
        const b = points[other];
        if (!b || b.x1 === null || b.y1 === null || b.x2 === null || b.y2 === null) continue;
        const direct = ecart(a.x1, a.y1, b.x1, b.y1) <= 0.5
          && ecart(a.x2, a.y2, b.x2, b.y2) <= 0.5;
        const inverse = ecart(a.x1, a.y1, b.x2, b.y2) <= 0.5
          && ecart(a.x2, a.y2, b.x1, b.y1) <= 0.5;
        if (direct || inverse) { estDouble = true; break; }
      }
    }
    line.dataset.v2e035Doublon = estDouble ? 'oui' : 'non';
    if (estDouble) doublons += 1;
  });
  field.dataset.v2e035Doublons = String(doublons);

  /* E035-05 — Déformation due à preserveAspectRatio="none" : on compare le
     ratio rendu du SVG au ratio du viewBox (par défaut 100 × 100). */
  if (svg && typeof svg.getBoundingClientRect === 'function') {
    const rect = svg.getBoundingClientRect();
    const viewBox = typeof svg.getAttribute === 'function' ? svg.getAttribute('viewBox') : null;
    const parsed = viewBox ? viewBox.trim().split(/[\s,]+/).map(Number) : [];
    const vw = parsed.length === 4 && Number.isFinite(parsed[2]) ? parsed[2] : 100;
    const vh = parsed.length === 4 && Number.isFinite(parsed[3]) ? parsed[3] : 100;
    if (rect && Number.isFinite(rect.width) && Number.isFinite(rect.height)
        && rect.height > 0 && vh > 0 && vw > 0) {
      const facteur = (rect.width / rect.height) / (vw / vh);
      const deformation = facteur > 1.15 ? 'etire'
        : facteur < 0.85 ? 'ecrase' : 'equilibre';
      svg.setAttribute('data-v2e035-deformation', deformation);
      if (svg.style && typeof svg.style.setProperty === 'function') {
        svg.style.setProperty('--v2e035-deform', String(Math.round(facteur * 100) / 100));
      }
    }
  }

  /* E035-06 — Bascule indépendante de lisibilité : aria-pressed est légitime,
     la cible mesure au moins 36 px et le changement est annoncé en région live. */
  let live = layout.querySelector('#v2e035-live');
  if (!live) {
    live = make('p', 'v2e035-sr', '');
    live.id = 'v2e035-live';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    layout.appendChild(live);
  }
  let toggle = layout.querySelector('#v2e035-toggle');
  if (caption && !toggle) {
    toggle = make('button', '', 'Renforcer la lisibilité des arêtes');
    toggle.id = 'v2e035-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-pressed', 'false');
    toggle.addEventListener('click', () => {
      const renforce = toggle.getAttribute('aria-pressed') !== 'true';
      toggle.setAttribute('aria-pressed', renforce ? 'true' : 'false');
      field.dataset.v2e035Renforce = renforce ? 'oui' : 'non';
      live.textContent = renforce
        ? 'Lisibilité renforcée activée : traits secondaires continus et pleins.'
        : 'Lisibilité renforcée désactivée : retour aux traits adaptés.';
    });
    caption.appendChild(toggle);
  }
  if (!field.dataset.v2e035Renforce) field.dataset.v2e035Renforce = 'non';

  /* E035-07 — Croisements entre arêtes : test d'orientation déterministe,
     publié en texte indexable et en région live, sans comptage codé en dur. */
  const oriente = (a, b, c) => {
    const valeur = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
    return valeur > 1e-6 ? 1 : valeur < -1e-6 ? -1 : 0;
  };
  const entre = (a, b, p) => p.x >= Math.min(a.x, b.x) - 1e-6
    && p.x <= Math.max(a.x, b.x) + 1e-6
    && p.y >= Math.min(a.y, b.y) - 1e-6
    && p.y <= Math.max(a.y, b.y) + 1e-6;
  const seCropent = (a, b, c, d) => {
    const o1 = oriente(a, b, c);
    const o2 = oriente(a, b, d);
    const o3 = oriente(c, d, a);
    const o4 = oriente(c, d, b);
    if (o1 === 0 && entre(a, b, c)) return true;
    if (o2 === 0 && entre(a, b, d)) return true;
    if (o3 === 0 && entre(c, d, a)) return true;
    if (o4 === 0 && entre(c, d, b)) return true;
    return o1 !== o2 && o3 !== o4;
  };
  const segments = points.map(p => (p.x1 === null || p.y1 === null
    || p.x2 === null || p.y2 === null ? null
    : [{ x: p.x1, y: p.y1 }, { x: p.x2, y: p.y2 }]));
  let croisements = 0;
  for (let i = 0; i < segments.length; i += 1) {
    if (!segments[i]) continue;
    for (let j = i + 1; j < segments.length; j += 1) {
      if (!segments[j]) continue;
      if (seCropent(segments[i][0], segments[i][1], segments[j][0], segments[j][1])) {
        croisements += 1;
      }
    }
  }
  field.dataset.v2e035Croisements = String(croisements);
  let croix = layout.querySelector('#v2e035-cross');
  if (!croix) {
    croix = make('p', '', '');
    croix.id = 'v2e035-cross';
    croix.setAttribute('role', 'status');
    croix.setAttribute('aria-live', 'polite');
    croix.setAttribute('aria-atomic', 'true');
    if (caption) caption.appendChild(croix);
    else layout.appendChild(croix);
  }
  croix.textContent = `Croisements détectés : ${croisements} sur ${lines.length} arêtes.`;

  /* E035-08 — Légende des inclinaisons : chaque catégorie porte un trait
     orienté, un libellé et son compte, jamais une couleur seule. */
  let legend = layout.querySelector('#v2e035-orientations');
  if (!legend) {
    legend = make('div', 'v2e035-orient');
    legend.id = 'v2e035-orientations';
    if (caption) caption.appendChild(legend);
    else layout.appendChild(legend);
  }
  if (legend) {
    legend.textContent = '';
    const item = (classe, libelle, compte) => {
      const element = make('span', 'v2e035-orient-item');
      element.append(
        make('span', `v2e035-orient-trait v2e035-orient-trait--${classe}`),
        make('span', '', `${libelle} : ${compte}`)
      );
      return element;
    };
    legend.append(
      item('horizontal', 'Horizontal', pentes.horizontal),
      item('diagonal', 'Diagonal', pentes.diagonal),
      item('vertical', 'Vertical', pentes.vertical)
    );
  }

  /* E035-09 — Priorité sémantique : le chemin actif échappe à toutes les
     adaptations V2 ; un seul attribut pilote les sélecteurs de la feuille. */
  lines.forEach(line => {
    const prioritaire = !!(line.classList && line.classList.contains('is-path'));
    line.dataset.v2e035Priorite = prioritaire ? 'haute' : 'normale';
  });

  /* E035-10 — Repli sans animation : la classe sobre retire les transitions
     des seuls éléments V2 ; couleurs forcées et mouvement réduit sont couverts
     par la feuille unique, sans minuteur ni boucle d'animation propre. */
  let sobre = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { sobre = !!ctx.reducedMotion(); }
    catch (erreur) { sobre = false; }
  }
  if (sobre) field.classList.add('v2e035-sobre');
  else field.classList.remove('v2e035-sobre');
});
