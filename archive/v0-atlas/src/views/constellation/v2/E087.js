import { register } from './registry.js';

/* Lentille V2 E087 — audit de qualité et de lisibilité du graphe de connexion
   de la vue Constellation. Seconde passe : dix chantiers inédits, tous
   implémentés, sans réseau, sans source aléatoire et sans minuteur ni boucle
   d'animation propre. Préfixe exclusif : v2e087 (aucune collision passe 1). */
register('E087', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  if (typeof layout.querySelector !== 'function' || typeof layout.appendChild !== 'function') return;

  /* Fabrique tolérante : ctx.el si disponible, repli local sinon. */
  const make = (tag, cls, text) => {
    if (typeof ctx.el === 'function') {
      const node = ctx.el(tag, cls, text);
      if (node) return node;
    }
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };
  const attr = (node, name) => (node && typeof node.getAttribute === 'function')
    ? node.getAttribute(name) : null;
  const numeric = (node, name) => {
    const value = parseFloat(attr(node, name));
    return Number.isFinite(value) ? value : NaN;
  };
  const variable = (node, name) => (node && node.style && typeof node.style.getPropertyValue === 'function')
    ? parseFloat(node.style.getPropertyValue(name)) : NaN;
  const hasClass = (node, name) => !!(node && node.classList
    && typeof node.classList.contains === 'function' && node.classList.contains(name));
  const set = (node, name, value) => {
    if (node && typeof node.setAttribute === 'function') node.setAttribute(name, String(value));
  };
  const decimal = value => (Math.round(value * 100) / 100).toFixed(2);
  const plural = (count, word) => `${count} ${word}${count > 1 ? 's' : ''}`;

  const field = layout.querySelector('.constellation-field');
  if (!field || typeof field.setAttribute !== 'function' || typeof field.querySelector !== 'function') return;
  const host = layout.querySelector('svg.constellation-edges');
  const allEdges = host && typeof host.querySelectorAll === 'function'
    ? Array.from(host.querySelectorAll('line.const-edge')) : [];
  const pathEdges = allEdges.filter(line => hasClass(line, 'is-path'));
  const roles = ['source', 'relais', 'feuille'];
  const nodes = {
    source: field.querySelector('.const-layer-suns .const-sun.is-active'),
    relais: field.querySelector('.const-layer-planets .const-planet.is-active'),
    feuille: field.querySelector('.const-layer-moons .const-moon.is-active'),
  };
  const titles = { source: 'Ère', relais: 'Repère', feuille: 'Point' };
  const nameOf = node => {
    if (!node) return '—';
    if (node.dataset && node.dataset.label) return node.dataset.label;
    return attr(node, 'aria-label') || attr(node, 'title') || '—';
  };
  const chaine = () => roles.map(role => `${titles[role]} : ${nameOf(nodes[role])}`).join(' → ');
  const segments = allEdges.map(line => ({
    x1: numeric(line, 'x1'), y1: numeric(line, 'y1'), x2: numeric(line, 'x2'), y2: numeric(line, 'y2'),
  }));
  const pointOf = node => ({ x: variable(node, '--x'), y: variable(node, '--y') });
  const near = (a, b, tol) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol;
  const touches = (seg, point, tol) =>
    (near(seg.x1, point.x, tol) && near(seg.y1, point.y, tol))
    || (near(seg.x2, point.x, tol) && near(seg.y2, point.y, tol));
  const links = (seg, a, b, tol) =>
    (near(seg.x1, a.x, tol) && near(seg.y1, a.y, tol) && near(seg.x2, b.x, tol) && near(seg.y2, b.y, tol))
    || (near(seg.x2, a.x, tol) && near(seg.y2, a.y, tol) && near(seg.x1, b.x, tol) && near(seg.y1, b.y, tol));

  let calm = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { calm = !!ctx.reducedMotion(); } catch (error) { calm = false; }
  }

  /* Feuille unique de la lentille, injectée par le seul appel autorisé. */
  css('constellation-v2-e087', `
.v2e087-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e087-note{margin:8px 0 0;padding-left:8px;border-left:2px solid var(--gold,#b98b46);font-size:10px;line-height:1.5;color:var(--gold-bright,#e6b96f)}
.v2e087-note-warn{border-left-color:#d66f6f}
.v2e087-box{margin-top:10px;padding:8px 10px;border:1px solid var(--gold,#b98b46);border-radius:8px;background:rgba(7,11,18,.55);font-size:10px}
.v2e087-box h3{margin:0 0 6px;font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--gold-bright,#e6b96f)}
.v2e087-box p{margin:4px 0;color:var(--text-muted,#c9c2b4);font-variant-numeric:tabular-nums}
.v2e087-slider{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:8px}
.v2e087-slider label{min-height:36px;display:inline-flex;align-items:center;font-size:10px;color:var(--gold-bright,#e6b96f)}
.v2e087-slider input[type=range]{min-height:36px;min-width:140px;accent-color:var(--gold,#b98b46)}
.v2e087-slider input:focus-visible{outline:3px solid var(--gold-bright,#e6b96f);outline-offset:2px}
.v2e087-slider output{font-size:10px;font-variant-numeric:tabular-nums;color:var(--gold-bright,#e6b96f)}
.v2e087-calm *{transition:none!important}
@media (prefers-reduced-motion: reduce){.v2e087-box *,.v2e087-slider *{transition:none!important}}
`);
  if (calm && field.classList && typeof field.classList.add === 'function') field.classList.add('v2e087-calm');

  /* Région live partagée par les chantiers 07 et 10, créée une seule fois. */
  let live = layout.querySelector('#v2e087-live');
  if (!live) {
    live = make('p', 'v2e087-sr', '');
    live.id = 'v2e087-live';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    layout.appendChild(live);
  }
  const announce = text => { live.textContent = text; };

  /* E087-01 — Contrôle d'intégrité des coordonnées des traits. */
  let invalides = 0;
  let horsCadre = 0;
  segments.forEach(seg => {
    const values = [seg.x1, seg.y1, seg.x2, seg.y2];
    if (values.some(value => !Number.isFinite(value))) { invalides += 1; return; }
    if (values.some(value => value < 0 || value > 100)) horsCadre += 1;
  });
  set(field, 'data-v2e087-invalid', invalides);
  set(field, 'data-v2e087-oob', horsCadre);
  if (!layout.querySelector('#v2e087-integrite')) {
    const note = make('p', 'v2e087-note',
      `Intégrité des traits : ${plural(allEdges.length, 'trait')} contrôlé${allEdges.length > 1 ? 's' : ''}, ${invalides} illisible${invalides > 1 ? 's' : ''}, ${horsCadre} hors du champ (repère 0–100).`);
    note.id = 'v2e087-integrite';
    field.appendChild(note);
  }

  /* E087-02 — Rose textuelle des directions du chemin. */
  const directions = ['Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest', 'Nord', 'Nord-Est'];
  const roses = Object.create(null);
  pathEdges.forEach(line => {
    const seg = { x1: numeric(line, 'x1'), y1: numeric(line, 'y1'), x2: numeric(line, 'x2'), y2: numeric(line, 'y2') };
    if (![seg.x1, seg.y1, seg.x2, seg.y2].every(Number.isFinite)) return;
    const angle = (Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1) * 180 / Math.PI + 360) % 360;
    const cap = directions[Math.round(angle / 45) % 8];
    roses[cap] = (roses[cap] || 0) + 1;
  });
  const roseTexte = Object.keys(roses).map(cap => `${cap} : ${roses[cap]}`).join(' · ') || 'aucune direction mesurable';
  set(field, 'data-v2e087-bearings', roseTexte);
  if (!layout.querySelector('#v2e087-rose')) {
    const rose = make('p', 'v2e087-note', `Directions du chemin : ${roseTexte}.`);
    rose.id = 'v2e087-rose';
    field.appendChild(rose);
  }

  /* Évaluation partagée par les chantiers 03, 04 et 10. La tolérance est un
     nombre fini borné, fourni au départ puis par le curseur local. */
  const evaluate = tol => {
    const safeTol = Number.isFinite(tol) ? Math.min(5, Math.max(0.1, tol)) : 0.6;
    const degrees = Object.create(null);
    roles.forEach(role => {
      const node = nodes[role];
      const point = pointOf(node);
      degrees[role] = node ? segments.filter(seg => touches(seg, point, safeTol)).length : 0;
      set(node, 'data-v2e087-degree', node ? degrees[role] : 0);
    });
    /* Degrés des nœuds actifs, exploités par le chantier 03. */
    set(field, 'data-v2e087-degree-source', degrees.source);
    set(field, 'data-v2e087-degree-relais', degrees.relais);
    set(field, 'data-v2e087-degree-feuille', degrees.feuille);
    const isolated = roles.filter(role => nodes[role] && degrees[role] === 0).map(role => titles[role]);
    set(field, 'data-v2e087-isolated', isolated.length ? isolated.join(', ') : 'aucun');

    /* Continuité bout à bout, exploitée par le chantier 04. */
    const presents = roles.filter(role => nodes[role]);
    const manquants = [];
    let continus = 0;
    for (let i = 0; i + 1 < presents.length; i += 1) {
      const a = pointOf(nodes[presents[i]]);
      const b = pointOf(nodes[presents[i + 1]]);
      const relie = segments.some(seg => links(seg, a, b, safeTol));
      if (relie) continus += 1;
      else manquants.push(`${titles[presents[i]]} → ${titles[presents[i + 1]]}`);
    }
    const attendus = Math.max(0, presents.length - 1);
    const gaps = attendus - continus;
    set(field, 'data-v2e087-links', continus);
    set(field, 'data-v2e087-gaps', gaps);
    set(field, 'data-v2e087-missing', manquants.length ? manquants.join(' ; ') : 'aucun');
    return { degrees, gaps, continus, attendus, manquants, safeTol, isolated };
  };

  /* Valeur initiale : reprise de la tolérance de la passe 1 (0,6 unité). */
  let resultat = evaluate(0.6);

  /* E087-03 (suite) — Compte rendu des degrés, distinct du panneau passe 1. */
  if (!layout.querySelector('#v2e087-degrees')) {
    const deg = make('p', 'v2e087-note');
    deg.id = 'v2e087-degrees';
    field.appendChild(deg);
  }
  const degreesNode = layout.querySelector('#v2e087-degrees');
  const paintDegrees = data => {
    if (!degreesNode) return;
    degreesNode.textContent = `Degrés de connexion (tolérance ${decimal(data.safeTol)} u.) : `
      + roles.map(role => `${titles[role]} ${data.degrees[role]}`).join(' · ')
      + `. Nœuds isolés : ${data.isolated.length ? data.isolated.join(', ') : 'aucun'}.`;
  };
  paintDegrees(resultat);

  /* E087-04 (suite) — Phrase de continuité mise à jour à chaque recalcul. */
  if (!layout.querySelector('#v2e087-continuite')) {
    const cont = make('p', 'v2e087-note');
    cont.id = 'v2e087-continuite';
    field.appendChild(cont);
  }
  const continuiteNode = layout.querySelector('#v2e087-continuite');
  const paintContinuity = data => {
    if (!continuiteNode) return;
    continuiteNode.textContent = `Continuité : ${data.continus} liaison${data.continus > 1 ? 's' : ''} raccordée${data.continus > 1 ? 's' : ''} sur ${data.attendus} attendue${data.attendus > 1 ? 's' : ''}`
      + ` ; ${plural(data.gaps, 'rupture')}. Chaînons manquants : ${data.manquants.join(' ; ') || 'aucun'}.`;
  };
  paintContinuity(resultat);

  /* E087-05 — Taux de complétude de la chaîne. */
  const presents = roles.filter(role => nodes[role]);
  const completeness = `${presents.length}/3`;
  set(field, 'data-v2e087-complete', completeness);
  if (!layout.querySelector('#v2e087-complete')) {
    const complete = make('p', 'v2e087-note');
    complete.id = 'v2e087-complete';
    complete.textContent = `Chaîne renseignée : ${completeness} nœud${presents.length > 1 ? 's' : ''} sur 3 (`
      + `${presents.length === 3 ? 'complète' : 'incomplète'}).`;
    field.appendChild(complete);
  }

  /* E087-06 — Livre de bord : compteur de rendus déterministe. */
  let rendus = 1;
  if (typeof window !== 'undefined') {
    const previous = window.__v2e087_renders;
    rendus = Number.isFinite(previous) ? previous + 1 : 1;
    window.__v2e087_renders = rendus;
  }
  set(field, 'data-v2e087-renders', rendus);
  if (!layout.querySelector('#v2e087-rendus')) {
    const bord = make('p', 'v2e087-note');
    bord.id = 'v2e087-rendus';
    bord.textContent = `Livre de bord : diagnostic recalculé ${rendus} fois sur ce rendu.`;
    field.appendChild(bord);
  }

  /* E087-07 — Comparateur de configuration entre deux relevés. */
  const courante = chaine();
  let changement = 'premier relevé';
  if (typeof window !== 'undefined' && typeof window.__v2e087_prev === 'string') {
    changement = window.__v2e087_prev === courante ? 'inchangé' : 'modifié';
  }
  if (typeof window !== 'undefined') window.__v2e087_prev = courante;
  set(field, 'data-v2e087-change', changement);
  announce(`Comparateur V2 : configuration ${changement}. ${courante}.`);

  /* E087-08 — Synthèse narrative en une phrase. */
  if (!layout.querySelector('#v2e087-resume')) {
    const box = make('section', 'v2e087-box');
    box.id = 'v2e087-resume';
    box.setAttribute('role', 'note');
    box.setAttribute('aria-label', 'Synthèse du diagnostic de connexion');
    const heading = make('h3', null, 'Synthèse du diagnostic');
    const phrase = make('p', null,
      `${plural(allEdges.length, 'trait')} dessinés, ${plural(pathEdges.length, 'segment')} sur le chemin actif, `
      + `${invalides} coordonnée${invalides > 1 ? 's' : ''} illisible${invalides > 1 ? 's' : ''}, `
      + `${plural(resultat.gaps, 'rupture')} et une chaîne renseignée à ${completeness} : `
      + `${changement}.`);
    box.appendChild(heading);
    box.appendChild(phrase);
    layout.appendChild(box);
  }

  /* E087-09 — Avertissement de densité du graphe. */
  const totalNoeuds = typeof field.querySelectorAll === 'function'
    ? field.querySelectorAll('.const-sun, .const-planet, .const-moon').length : 0;
  const densite = totalNoeuds ? allEdges.length / totalNoeuds : 0;
  const dense = densite > 1.5;
  set(field, 'data-v2e087-density', decimal(densite));
  if (!layout.querySelector('#v2e087-densite')) {
    const note = make('p', dense ? 'v2e087-note v2e087-note-warn' : 'v2e087-note',
      dense
        ? `Graphe dense : ${plural(allEdges.length, 'trait')} pour ${plural(totalNoeuds, 'nœud')} (${decimal(densite)} par nœud).`
        : `Densité modérée : ${plural(allEdges.length, 'trait')} pour ${plural(totalNoeuds, 'nœud')} (${decimal(densite)} par nœud).`);
    note.id = 'v2e087-densite';
    field.appendChild(note);
  }

  /* E087-10 — Curseur de tolérance de raccord, recalcul local et éventuel. */
  if (!layout.querySelector('#v2e087-tolerance')) {
    const wrap = make('div', 'v2e087-slider');
    wrap.id = 'v2e087-tolerance';
    const label = make('label', null, 'Tolérance de raccord');
    label.setAttribute('for', 'v2e087-tol');
    const input = document.createElement('input');
    input.type = 'range';
    input.id = 'v2e087-tol';
    input.min = '0.1';
    input.max = '5';
    input.step = '0.1';
    input.value = String(resultat.safeTol);
    set(input, 'aria-valuetext', `${decimal(resultat.safeTol)} unité${resultat.safeTol > 1 ? 's' : ''}`);
    const output = make('output', null, `${decimal(resultat.safeTol)} u.`);
    output.setAttribute('for', 'v2e087-tol');
    input.addEventListener('input', () => {
      const value = parseFloat(input.value);
      resultat = evaluate(value);
      const text = `${decimal(resultat.safeTol)} u.`;
      output.textContent = text;
      set(input, 'aria-valuetext', `${decimal(resultat.safeTol)} unité${resultat.safeTol > 1 ? 's' : ''}`);
      paintDegrees(resultat);
      paintContinuity(resultat);
      announce(`Tolérance ${text} : ${resultat.gaps} rupture${resultat.gaps > 1 ? 's' : ''} sur ${resultat.attendus} chaînon${resultat.attendus > 1 ? 's' : ''}.`);
    });
    wrap.appendChild(label);
    wrap.appendChild(input);
    wrap.appendChild(output);
    field.appendChild(wrap);
  }
});
