import { register } from './registry.js';

/* Lentille E005 — tableau de bord de lecture de la légende cartographique (V2).
 * Dix chantiers, tous réellement implémentés : E005-01 … E005-10.
 * La légende statique devient un poste de lecture : bascules de visibilité,
 * survol et focus synchronisés, compteurs puisés dans le DOM, laboratoire
 * canvas à formules déterministes, choix unique par radiogroupe, motifs sans
 * couleur, parcours animé du chemin, raccourcis clavier, repli et remise à zéro.
 *
 * Zéro réseau, zéro aléa, zéro journalisation ; une seule boucle rAF, annulée
 * quand l'onglet est masqué et reprise au retour. Tout le texte est du texte
 * DOM lisible sans script, intégralement en français. */

const P = 'geography-v2-e005';
const STEP_MS = 700;
const CYCLE_MS = 2400;

/* Préférences conservées d'un rendu à l'autre (le panneau est reconstruit). */
const pref = { markers: true, path: true, outline: true, motifs: false, collapsed: false, focus: 'markers' };

/* Une seule animation rAF au plus, et un seul écouteur de visibilité. */
let anim = null;
let visibilityReady = false;

const CATEGORIES = [
  { key: 'markers', label: 'Lieux affichés', glyph: '●', selector: '.geo-marker',
    offClass: P + '-off-markers', hiClass: P + '-hi-markers', unit: 'marqueur(s)' },
  { key: 'path', label: 'Chemin chronologique', glyph: '┄', selector: '.geo-path-node',
    offClass: P + '-off-path', hiClass: P + '-hi-path', unit: 'nœud(s)' },
  { key: 'outline', label: 'Contour du pays', glyph: '▭', selector: '.geo-outline',
    offClass: P + '-off-outline', hiClass: P + '-hi-outline', unit: 'contour(s)' },
];

const SHORTCUTS = [
  { keys: ['+', '−'], label: 'Zoomer ou dézoomer la carte', target: '#c3b-map .geo-controls button' },
  { keys: ['←', '→'], label: 'Changer de lieu affiché', target: '#c3b-map' },
  { keys: ['↑', '↓'], label: 'Parcourir la liste des lieux', target: '#c3b-places .c3b-place-item' },
  { keys: ['0'], label: 'Revenir à la vue initiale', target: '#c3b-map .geo-controls button[data-fk="c3b-zoom-reset"]' },
  { keys: ['Espace'], label: 'Changer de périmètre', target: 'button[data-fk="c3b-scope"]' },
];

/* E005-10 : garde-fou de visibilité, installé une seule fois. La boucle est
   réellement annulée quand l'onglet est masqué, puis reprise au retour. */
function installVisibilityWatch() {
  if (visibilityReady || typeof document === 'undefined') return;
  visibilityReady = true;
  document.addEventListener('visibilitychange', () => {
    if (!anim) return;
    if (document.hidden) {
      if (anim.rafId !== null) cancelAnimationFrame(anim.rafId);
      anim.rafId = null;
    } else {
      anim.last = null;
      if (!anim.reduced && anim.rafId === null && typeof anim.frame === 'function') {
        anim.rafId = requestAnimationFrame(anim.frame);
      }
    }
  });
}

/* E005-10 : arrêt propre, sans frame résiduelle, de l'unique animation. */
function stopAnimation(silent = false, redraw) {
  if (!anim) return;
  const current = anim;
  if (current.rafId !== null) cancelAnimationFrame(current.rafId);
  current.nodes.forEach((node) => node.classList.remove(P + '-step'));
  anim = null;
  if (!silent && current.progress) current.progress.textContent = 'Parcours arrêté.';
  if (typeof redraw === 'function') redraw();
}

/* E005-10 : parcours déterministe fondé sur l'horodatage rAF, jamais sur un
   tirage aléatoire. Le temps n'avance pas quand document.hidden est vrai. */
function startAnimation(layout, progress, announce, reduced, redraw) {
  stopAnimation(true, redraw);
  const pathNodes = Array.from(layout.querySelectorAll('.geo-path-node'));
  const nodes = pathNodes.length ? pathNodes : Array.from(layout.querySelectorAll('.geo-marker'));
  if (!nodes.length) {
    progress.textContent = 'Aucun nœud à parcourir sur cette carte.';
    announce('Aucun nœud chronologique à parcourir.');
    if (typeof redraw === 'function') redraw();
    return;
  }
  if (reduced) {
    const finalNode = nodes[nodes.length - 1];
    finalNode.classList.add(P + '-step');
    progress.textContent = `Lecture instantanée : étape ${nodes.length} sur ${nodes.length} (mouvement réduit).`;
    announce('Parcours affiché instantanément : mouvement réduit demandé.');
    anim = { rafId: null, nodes, progress, frame: null, last: null, elapsed: 0,
      index: nodes.length - 1, step: STEP_MS, reduced: true };
    if (typeof redraw === 'function') redraw();
    return;
  }
  anim = { rafId: null, nodes, progress, frame: null, last: null, elapsed: 0,
    index: -1, step: STEP_MS, reduced: false };
  const frame = (timestamp) => {
    if (!anim) return;
    if (anim.last === null) anim.last = timestamp;
    const delta = timestamp - anim.last;
    anim.last = timestamp;
    if (!document.hidden) {
      anim.elapsed += delta;
      const next = Math.floor(anim.elapsed / anim.step);
      if (next !== anim.index) {
        if (anim.index >= 0 && anim.nodes[anim.index]) {
          anim.nodes[anim.index].classList.remove(P + '-step');
        }
        anim.index = next;
        if (anim.index < anim.nodes.length) {
          const node = anim.nodes[anim.index];
          node.classList.add(P + '-step');
          const title = node.querySelector('title');
          const detail = title ? title.textContent.replace(/\s+/g, ' ').trim() : `Étape ${anim.index + 1}`;
          progress.textContent = `Étape ${anim.index + 1} sur ${anim.nodes.length} · ${detail}`;
        }
      }
      if (anim.index >= anim.nodes.length) {
        stopAnimation(true, redraw);
        progress.textContent = `Parcours terminé : ${nodes.length} étapes.`;
        announce('Parcours du chemin chronologique terminé.');
        return;
      }
    }
    if (typeof redraw === 'function') redraw();
    anim.rafId = requestAnimationFrame(frame);
  };
  anim.frame = frame;
  anim.rafId = requestAnimationFrame(frame);
  announce(`Lecture du chemin : ${nodes.length} étapes.`);
}

register('E005', (ctx) => {
  const layout = ctx.layout;
  const legend = layout && layout.querySelector('.geo-legend');
  if (!layout || !legend) return;

  installVisibilityWatch();
  stopAnimation(true);

  /* E005-01 : bloc CSS isolé, préfixé, sans aucune ressource externe. */
  ctx.css(P, `
  #${P}-legend { padding: 10px 12px; }
  .${P}-head { display:flex; align-items:center; justify-content:space-between; gap:8px; }
  .${P}-title { margin:0; font-size:12px; color:var(--gold-bright); }
  .${P}-subtitle { margin:10px 0 2px; font-size:10px; color:var(--gold-bright); font-weight:normal; }
  .${P}-collapse, .${P}-motifs, .${P}-reset, .${P}-play, .${P}-stop, .${P}-shortcut {
    min-height:36px; min-width:36px; padding:5px 9px; border:1px solid var(--line);
    border-radius:8px; background:transparent; color:var(--muted); font-size:10px;
    line-height:1.4; text-align:left; cursor:pointer;
  }
  .${P}-collapse, .${P}-motifs, .${P}-reset, .${P}-play, .${P}-stop { text-align:center; }
  .${P}-collapse:hover, .${P}-motifs:hover, .${P}-reset:hover,
  .${P}-play:hover, .${P}-stop:hover, .${P}-shortcut:hover { border-color:var(--gold); color:var(--gold-bright); }
  .${P}-collapse:focus-visible, .${P}-motifs:focus-visible, .${P}-reset:focus-visible,
  .${P}-play:focus-visible, .${P}-stop:focus-visible, .${P}-shortcut:focus-visible,
  .${P}-radio:focus-visible + .${P}-radio-face, .${P}-canvas:focus-visible {
    outline:2px solid var(--gold-bright); outline-offset:2px;
  }
  .${P}-body { margin-top:8px; }
  .${P}-collapsed .${P}-body { display:none; }
  .${P}-notice, .${P}-info, .${P}-status, .${P}-progress, .${P}-formula {
    margin:6px 0; font-size:10px; line-height:1.6; color:var(--muted);
  }
  .${P}-info, .${P}-formula { color:var(--gold-bright); }
  .${P}-status, .${P}-progress { font-variant-numeric:tabular-nums; min-height:14px; }
  .${P}-toggles, .${P}-shortcuts { list-style:none; margin:6px 0; padding:0; }
  .${P}-entry, .${P}-shortcut-item { margin:0 0 4px; }
  .${P}-toggle { width:100%; display:flex; align-items:center; gap:8px; }
  .${P}-toggle[aria-pressed="true"] { border-color:var(--gold); color:var(--gold-bright); background:rgba(230,185,111,.10); }
  .${P}-toggle[aria-pressed="false"] { opacity:.62; }
  .${P}-toggle.${P}-echo { border-color:#ffffff; color:#ffffff; box-shadow:0 0 0 1px #ffffff inset; }
  .${P}-glyph { display:inline-block; min-width:18px; text-align:center; font-size:14px; }
  .${P}-count { margin-left:auto; font-variant-numeric:tabular-nums; color:var(--muted-2); font-size:9px; }
  .${P}-actions, .${P}-anim { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin:8px 0 4px; }
  .${P}-anim .${P}-progress { flex:1 1 100%; }
  .${P}-shortcut { width:100%; display:flex; align-items:center; gap:8px; }
  .${P}-keys { display:inline-flex; gap:3px; flex:0 0 auto; }
  .${P}-keys kbd { border:1px solid var(--line); border-radius:4px; padding:1px 5px; font-size:10px; color:var(--gold-bright); background:rgba(255,255,255,.03); }
  .${P}-lab { margin:8px 0 4px; padding:8px; border:1px solid var(--line); border-radius:8px; background:rgba(255,255,255,.02); }
  .${P}-lab-head { margin:0 0 6px; font-size:10px; color:var(--gold-bright); font-weight:normal; }
  .${P}-canvas { display:block; width:100%; height:132px; border:1px solid var(--line); border-radius:6px; background:rgba(0,0,0,.18); }
  .${P}-lab-value { margin:6px 0 0; font-size:10px; color:var(--muted); font-variant-numeric:tabular-nums; }
  .${P}-radios { list-style:none; margin:6px 0; padding:0; }
  .${P}-radio-item { margin:0 0 4px; }
  .${P}-radio-label { display:flex; align-items:center; gap:8px; min-height:36px; cursor:pointer; }
  .${P}-radio { min-width:20px; min-height:20px; accent-color:var(--gold); }
  .${P}-radio-face { color:var(--muted); font-size:10px; }

  /* E005-02 : masquage réel des catégories, sans supprimer la donnée. */
  .${P}-off-markers .geo-marker { display:none; }
  .${P}-off-path .geo-path, .${P}-off-path .geo-path-node { display:none; }
  .${P}-off-outline .geo-outline { display:none; }

  /* E005-03 : mise en évidence synchronisée survol / focus. */
  .${P}-hi-markers .geo-ring { stroke:#ffffff; stroke-width:2.6; }
  .${P}-hi-path .geo-path { stroke-width:2.6; opacity:1; }
  .${P}-hi-path .geo-path-node { stroke:#ffffff; stroke-width:1.8; opacity:1; }
  .${P}-hi-outline .geo-outline { stroke-width:2.6; opacity:.95; }

  /* E005-08 : motifs distincts — l'information ne repose pas sur la couleur. */
  .${P}-motifs .geo-outline { stroke-dasharray:8 4; }
  .${P}-motifs .geo-path { stroke-dasharray:1 5; stroke-linecap:round; }
  .${P}-motifs .geo-marker .geo-ring { stroke-dasharray:2 2; }

  /* E005-10 : étape courante du parcours. */
  .geo-path-node.${P}-step { fill:var(--gold-bright); stroke:#ffffff; stroke-width:2.4; }
  .geo-marker.${P}-step .geo-ring { stroke:#ffffff; stroke-width:3.2; }

  @media (max-width:620px) {
    .${P}-collapse, .${P}-motifs, .${P}-reset, .${P}-play, .${P}-stop { min-height:40px; }
    .${P}-keys kbd { font-size:9px; }
  }`);

  /* E005-01 : on conserve le texte d'origine dans un paragraphe sémantique,
     visible et lisible même si aucune interaction n'est disponible. */
  const baseText = Array.from(legend.children)
    .map((node) => (node.textContent || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' · ');
  legend.id = P + '-legend';
  legend.classList.add(P + '-legend');
  legend.classList.toggle(P + '-collapsed', pref.collapsed);
  legend.replaceChildren();

  const body = ctx.el('div', P + '-body');
  body.id = P + '-body';

  const notice = ctx.el('p', P + '-notice',
    baseText || 'Légende des symboles et des commandes de la carte locale.');
  body.appendChild(notice);

  /* E005-07 : région de statut unique, annoncée poliment : c'est le « readout ». */
  const status = ctx.el('p', P + '-status', 'Légende prête.');
  status.id = P + '-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const announce = (message) => { status.textContent = message; };
  body.appendChild(status);

  /* E005-09 : repli, avec titre et bouton toujours présents et nommés. */
  const head = ctx.el('div', P + '-head');
  const title = ctx.el('h3', P + '-title', 'Légende interactive et laboratoire de lecture');
  title.id = P + '-title';
  const collapse = ctx.el('button', P + '-collapse',
    pref.collapsed ? 'Afficher la légende' : 'Masquer la légende');
  collapse.type = 'button';
  collapse.id = P + '-collapse';
  collapse.setAttribute('aria-controls', body.id);
  collapse.setAttribute('aria-expanded', pref.collapsed ? 'false' : 'true');
  collapse.addEventListener('click', () => {
    pref.collapsed = !pref.collapsed;
    legend.classList.toggle(P + '-collapsed', pref.collapsed);
    collapse.setAttribute('aria-expanded', pref.collapsed ? 'false' : 'true');
    collapse.textContent = pref.collapsed ? 'Afficher la légende' : 'Masquer la légende';
    announce(pref.collapsed ? 'Légende repliée.' : 'Légende dépliée.');
  });
  head.append(title, collapse);

  /* E005-02 / E005-04 : une entrée par catégorie de symbole, avec compteur réel. */
  const buttons = {};
  const applies = (cat, on) => {
    pref[cat.key] = on;
    layout.classList.toggle(cat.offClass, !on);
    const button = buttons[cat.key];
    if (button) button.setAttribute('aria-pressed', on ? 'true' : 'false');
  };
  const highlight = (cat, on) => { layout.classList.toggle(cat.hiClass, on); };
  const countOf = (cat) => layout.querySelectorAll(cat.selector).length;

  CATEGORIES.forEach((cat) => layout.classList.toggle(cat.offClass, !pref[cat.key]));
  layout.classList.toggle(P + '-motifs', pref.motifs);

  const group = ctx.el('div', P + '-toggles');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Visibilité des symboles de la carte');
  CATEGORIES.forEach((cat) => {
    const button = ctx.el('button', P + '-toggle');
    button.type = 'button';
    button.id = P + '-entry-' + cat.key;
    button.setAttribute('aria-pressed', pref[cat.key] ? 'true' : 'false');
    button.setAttribute('aria-describedby', P + '-count-' + cat.key);
    const glyph = ctx.el('span', P + '-glyph', cat.glyph);
    glyph.setAttribute('aria-hidden', 'true');
    const label = ctx.el('span', P + '-label', cat.label);
    const count = ctx.el('span', P + '-count');
    count.id = P + '-count-' + cat.key;
    count.textContent = `${countOf(cat)} ${cat.unit}`;
    button.append(glyph, label, count);
    button.addEventListener('click', () => {
      applies(cat, !pref[cat.key]);
      announce(`${cat.label} ${pref[cat.key] ? 'affiché' : 'masqué'} sur la carte.`);
    });
    button.addEventListener('mouseenter', () => highlight(cat, true));
    button.addEventListener('mouseleave', () => highlight(cat, false));
    button.addEventListener('focus', () => highlight(cat, true));
    button.addEventListener('blur', () => highlight(cat, false));
    button.addEventListener('keydown', (event) => {
      const handled = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'];
      if (!handled.includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      const list = CATEGORIES.map((item) => buttons[item.key]);
      const pos = list.indexOf(button);
      let next = pos;
      if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = list.length - 1;
      else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        next = pos < 0 ? 0 : Math.min(pos + 1, list.length - 1);
      } else {
        next = pos < 0 ? list.length - 1 : Math.max(pos - 1, 0);
      }
      list[next].focus();
    });
    buttons[cat.key] = button;
    const row = ctx.el('div', P + '-entry');
    row.appendChild(button);
    group.appendChild(row);
  });
  body.appendChild(group);

  /* E005-03 (retour Carte → légende) : le survol d'un symbole met en écho
     son entrée. Un marqueur d'état évite d'ajouter deux fois les écouteurs. */
  CATEGORIES.forEach((cat) => {
    layout.querySelectorAll(cat.selector).forEach((node) => {
      if (node.dataset[P + 'Echo'] === '1') return;
      node.dataset[P + 'Echo'] = '1';
      const on = () => buttons[cat.key].classList.add(P + '-echo');
      const off = () => buttons[cat.key].classList.remove(P + '-echo');
      node.addEventListener('mouseenter', on);
      node.addEventListener('mouseleave', off);
      node.addEventListener('focus', on);
      node.addEventListener('blur', off);
    });
  });

  body.appendChild(ctx.el('p', P + '-info',
    '◎ Lieu sélectionné : mis en évidence sur la carte, un seul à la fois.'));

  /* E005-06 / E005-08 : réinitialisation et motif sans couleur. */
  const actions = ctx.el('div', P + '-actions');
  const motifs = ctx.el('button', P + '-motifs',
    pref.motifs ? 'Motifs : activés' : 'Motifs : désactivés');
  motifs.type = 'button';
  motifs.id = P + '-motifs';
  motifs.setAttribute('aria-pressed', pref.motifs ? 'true' : 'false');
  motifs.addEventListener('click', () => {
    pref.motifs = !pref.motifs;
    layout.classList.toggle(P + '-motifs', pref.motifs);
    motifs.setAttribute('aria-pressed', pref.motifs ? 'true' : 'false');
    motifs.textContent = pref.motifs ? 'Motifs : activés' : 'Motifs : désactivés';
    announce(pref.motifs
      ? 'Motifs activés : les symboles se distinguent par leur forme et leurs tirets.'
      : 'Motifs désactivés : retour aux couleurs habituelles.');
    redrawLab();
  });
  const reset = ctx.el('button', P + '-reset', 'Tout afficher');
  reset.type = 'button';
  reset.id = P + '-reset';
  reset.addEventListener('click', () => {
    CATEGORIES.forEach((cat) => {
      applies(cat, true);
      layout.classList.remove(cat.hiClass);
    });
    stopAnimation(true, redrawLab);
    progress.textContent = 'Parcours réinitialisé.';
    announce('Légende réinitialisée : tous les symboles sont affichés.');
    redrawLab();
  });
  actions.append(motifs, reset);
  body.appendChild(actions);

  /* E005-06 : laboratoire canvas à formules déterministes. Les grandeurs sont
     puisées dans le DOM réel ; la courbe est échantillonnée par une formule
     trigonométrique de l'indice — aucun tirage aléatoire. */
  const lab = ctx.el('div', P + '-lab');
  lab.id = P + '-lab';
  lab.appendChild(ctx.el('h4', P + '-lab-head',
    'Laboratoire · signature de lecture de la légende'));
  const canvas = ctx.el('canvas', P + '-canvas');
  canvas.id = P + '-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label',
    'Graphique déterministe des trois catégories de symboles et de la courbe du chemin chronologique. Appuyer sur Entrée pour lancer ou arrêter le parcours.');
  lab.appendChild(canvas);
  const labValue = ctx.el('p', P + '-lab-value', 'Mesures en attente de calcul.');
  labValue.id = P + '-lab-value';
  lab.appendChild(labValue);
  lab.appendChild(ctx.el('p', P + '-formula',
    'Formule : y(i) = base − amplitude × (0,5 + 0,5 × sin((i+1) × 0,7)), i parcourant les nœuds du chemin.'));
  body.appendChild(lab);

  const context = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;

  /* E005-06 : le redessin est déterministe et idempotent ; il peut être appelé
     au clic, au changement de choix, à chaque frame et au retour de visibilité. */
  function redrawLab() {
    if (!context) {
      labValue.textContent = 'Graphique indisponible : les mesures restent lisibles dans les compteurs ci-dessus.';
      return;
    }
    const rect = typeof canvas.getBoundingClientRect === 'function' ? canvas.getBoundingClientRect() : null;
    const cssW = Math.max(120, Math.round((rect && rect.width) || 260));
    const cssH = 132;
    const dpr = Math.min(2, (window.devicePixelRatio || 1));
    const pxW = Math.round(cssW * dpr);
    const pxH = Math.round(cssH * dpr);
    if (canvas.width !== pxW || canvas.height !== pxH) {
      canvas.width = pxW;
      canvas.height = pxH;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, cssW, cssH);

    const palette = ['#e6b96f', '#9fd0c4', '#d9a7c2'];
    const counts = CATEGORIES.map((cat) => countOf(cat));
    const maxCount = Math.max(1, counts[0], counts[1], counts[2]);
    const pad = 18;
    const usableW = Math.max(1, cssW - pad * 2);
    const baseline = cssH - 26;
    const barW = (usableW / counts.length) * 0.46;

    /* Barres : hauteur = compte / compte maximal × amplitude disponible. */
    counts.forEach((count, i) => {
      const cx = pad + (usableW * (i + 0.5)) / counts.length;
      const h = (count / maxCount) * (baseline - 26);
      const chosen = pref.focus === CATEGORIES[i].key;
      context.fillStyle = palette[i];
      context.globalAlpha = chosen ? 0.95 : 0.4;
      context.fillRect(cx - barW / 2, baseline - h, barW, h);
      context.globalAlpha = 1;
      context.strokeStyle = palette[i];
      context.lineWidth = chosen ? 2 : 1;
      context.setLineDash(chosen ? [] : [3, 3]);
      context.strokeRect(cx - barW / 2, baseline - h, barW, h);
      context.setLineDash([]);
      /* Chiffre lisible, jamais porté par la seule couleur. */
      context.fillStyle = chosen ? '#ffffff' : '#c9c2b4';
      context.font = '10px sans-serif';
      context.textAlign = 'center';
      context.fillText(String(count), cx, baseline - h - 5);
    });

    /* Ligne de base et sa graduation. */
    context.strokeStyle = '#6f6a60';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(pad, baseline);
    context.lineTo(pad + usableW, baseline);
    context.stroke();

    /* Courbe déterministe du chemin chronologique. */
    const total = counts[1];
    const samples = Math.max(2, total);
    const amplitude = baseline - 34;
    context.strokeStyle = '#e6b96f';
    context.lineWidth = 1.6;
    context.beginPath();
    for (let i = 0; i < samples; i += 1) {
      const t = samples === 1 ? 0.5 : i / (samples - 1);
      const x = pad + t * usableW;
      const y = baseline - 8 - amplitude * (0.5 + 0.5 * Math.sin((i + 1) * 0.7));
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();

    /* Curseur de lecture : position déterministe fondée sur le temps écoulé. */
    if (anim && !anim.reduced) {
      const t = (anim.elapsed % CYCLE_MS) / CYCLE_MS;
      const x = pad + t * usableW;
      context.strokeStyle = '#ffffff';
      context.lineWidth = 1;
      context.setLineDash([4, 3]);
      context.beginPath();
      context.moveTo(x, 8);
      context.lineTo(x, baseline);
      context.stroke();
      context.setLineDash([]);
    }

    const chosenCat = CATEGORIES.find((cat) => cat.key === pref.focus) || CATEGORIES[0];
    labValue.textContent = `Lieux : ${counts[0]} · Chaînon du chemin : ${counts[1]} · Contours : ${counts[2]}. `
      + `Catégorie inspectée : ${chosenCat.label.toLowerCase()} (${counts[CATEGORIES.indexOf(chosenCat)]}).`;
  }

  /* E005-07 : radiogroupe à choix unique. Une seule catégorie peut être
     inspectée à la fois ; le choix commande la mise en évidence du laboratoire. */
  const radioSet = ctx.el('div', P + '-radio-set');
  radioSet.id = P + '-radio-set';
  radioSet.setAttribute('role', 'radiogroup');
  radioSet.setAttribute('aria-label', 'Catégorie à inspecter dans le laboratoire');
  const radioList = ctx.el('ul', P + '-radios');
  CATEGORIES.forEach((cat) => {
    const input = ctx.el('input', P + '-radio');
    input.type = 'radio';
    input.name = P + '-focus';
    input.value = cat.key;
    input.id = P + '-radio-' + cat.key;
    input.checked = pref.focus === cat.key;
    input.addEventListener('change', () => {
      if (!input.checked) return;
      pref.focus = cat.key;
      announce(`Catégorie inspectée : ${cat.label.toLowerCase()}.`);
      redrawLab();
    });
    const face = ctx.el('span', P + '-radio-face', `${cat.glyph} ${cat.label}`);
    face.setAttribute('aria-hidden', 'true');
    const label = ctx.el('label', P + '-radio-label');
    label.setAttribute('for', input.id);
    label.append(input, face);
    const item = ctx.el('li', P + '-radio-item');
    item.appendChild(label);
    radioList.appendChild(item);
  });
  radioSet.appendChild(radioList);
  body.appendChild(radioSet);

  /* E005-10 : commandes du parcours, avec lecture instantanée si mouvement réduit. */
  const animRow = ctx.el('div', P + '-anim');
  const play = ctx.el('button', P + '-play', 'Lire le chemin');
  play.type = 'button';
  play.id = P + '-play';
  play.addEventListener('click', () => {
    startAnimation(layout, progress, announce, ctx.reducedMotion(), redrawLab);
  });
  const stop = ctx.el('button', P + '-stop', 'Arrêter');
  stop.type = 'button';
  stop.id = P + '-stop';
  stop.addEventListener('click', () => {
    stopAnimation(false, redrawLab);
    announce('Parcours arrêté.');
  });
  const progress = ctx.el('p', P + '-progress', 'Parcours non démarré.');
  progress.id = P + '-progress';
  progress.setAttribute('role', 'status');
  progress.setAttribute('aria-live', 'polite');
  animRow.append(play, stop, progress);
  body.appendChild(animRow);

  /* Équivalent clavier du canvas : Entrée ou Espace lance ou arrête le parcours. */
  canvas.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (anim) {
      stopAnimation(false, redrawLab);
      announce('Parcours arrêté depuis le graphique.');
    } else {
      startAnimation(layout, progress, announce, ctx.reducedMotion(), redrawLab);
    }
  });

  /* E005-05 : les raccourcis sont de vrais boutons qui atteignent la commande. */
  body.appendChild(ctx.el('h4', P + '-subtitle',
    'Raccourcis clavier — cliquer pour atteindre la commande'));
  const shortcuts = ctx.el('ul', P + '-shortcuts');
  SHORTCUTS.forEach((shortcut, index) => {
    const button = ctx.el('button', P + '-shortcut');
    button.type = 'button';
    button.id = P + '-kbd-' + index;
    const keys = ctx.el('span', P + '-keys');
    shortcut.keys.forEach((key) => keys.appendChild(ctx.el('kbd', '', key)));
    button.append(keys, ctx.el('span', P + '-shortcut-label', shortcut.label));
    button.addEventListener('click', () => {
      const target = document.querySelector(shortcut.target);
      if (target && typeof target.focus === 'function') {
        target.focus();
        announce(`Commande atteinte : ${shortcut.label}.`);
      } else {
        announce(`Commande indisponible dans cet état : ${shortcut.label}.`);
      }
    });
    const item = ctx.el('li', P + '-shortcut-item');
    item.appendChild(button);
    shortcuts.appendChild(item);
  });
  body.appendChild(shortcuts);

  legend.append(head, body);
  redrawLab();
});
