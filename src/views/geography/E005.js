import { register } from './registry.js';

/* Lentille E005 — Légende cartographique interactive (vue GEOGRAPHIE).
 * Dix chantiers, tous implémentés : E005-01 … E005-10.
 * La légende statique de geography.js devient un tableau de bord de lecture :
 * bascules de visibilité, survol synchronisé, compteurs réels, motifs sans
 * couleur, repli, annonces vocales, raccourcis clavier et parcours animé.
 * Zéro réseau, zéro aléa, zéro console ; une seule boucle rAF, suspendue quand
 * l'onglet est masqué. Tout le texte est du texte DOM lisible sans script. */

const PREFIX = 'geography-e005';
const STEP_MS = 700;

/* Préférences conservées d'un rendu à l'autre (le panneau est reconstruit). */
const pref = { markers: true, path: true, outline: true, motifs: false, collapsed: false };

/* Une seule animation rAF au plus pour toute la lentille. */
let anim = null;
let visibilityReady = false;

const CATEGORIES = [
  { key: 'markers', label: 'Lieux affichés', glyph: '●', selector: '.geo-marker',
    offClass: PREFIX + '-off-markers', hiClass: PREFIX + '-hi-markers', unit: 'marqueur(s)' },
  { key: 'path', label: 'Chemin chronologique', glyph: '┄', selector: '.geo-path-node',
    offClass: PREFIX + '-off-path', hiClass: PREFIX + '-hi-path', unit: 'nœud(s)' },
  { key: 'outline', label: 'Contour du pays', glyph: '▭', selector: '.geo-outline',
    offClass: PREFIX + '-off-outline', hiClass: PREFIX + '-hi-outline', unit: 'contour(s)' },
];

const SHORTCUTS = [
  { keys: ['+', '−'], label: 'Zoomer ou dézoomer la carte', target: '#c3b-map .geo-controls button' },
  { keys: ['←', '→'], label: 'Changer de lieu affiché', target: '#c3b-map' },
  { keys: ['↑', '↓'], label: 'Parcourir la liste des lieux', target: '#c3b-places .c3b-place-item' },
  { keys: ['0'], label: 'Revenir à la vue initiale', target: '#c3b-map .geo-controls button[data-fk="c3b-zoom-reset"]' },
  { keys: ['Espace'], label: 'Changer de périmètre', target: 'button[data-fk="c3b-scope"]' },
];

/* E005-07 : garde-fou de visibilité, installé une seule fois. */
function installVisibilityWatch() {
  if (visibilityReady || typeof document === 'undefined') return;
  visibilityReady = true;
  document.addEventListener('visibilitychange', () => {
    if (anim && !document.hidden) anim.last = null;
  });
}

/* E005-10 : arrêt propre et sans frame résiduelle de l'unique animation. */
function stopAnimation(silent = false) {
  if (!anim) return;
  const current = anim;
  if (current.rafId !== null) cancelAnimationFrame(current.rafId);
  current.nodes.forEach((node) => node.classList.remove(PREFIX + '-step'));
  if (!silent && current.progress) current.progress.textContent = 'Parcours arrêté.';
  anim = null;
}

/* E005-10 : parcours déterministe, basé sur l'horodatage rAF (aucun aléa). */
function startAnimation(layout, progress, announce, reduced) {
  stopAnimation(true);
  const pathNodes = Array.from(layout.querySelectorAll('.geo-path-node'));
  const nodes = pathNodes.length ? pathNodes : Array.from(layout.querySelectorAll('.geo-marker'));
  if (!nodes.length) {
    progress.textContent = 'Aucun nœud à parcourir sur cette carte.';
    announce('Aucun nœud chronologique à parcourir.');
    return;
  }
  if (reduced) {
    nodes[nodes.length - 1].classList.add(PREFIX + '-step');
    progress.textContent = `Lecture instantanée : étape ${nodes.length} sur ${nodes.length} (mouvement réduit).`;
    announce('Parcours affiché instantanément : mouvement réduit demandé.');
    anim = { rafId: null, nodes, progress, last: null, index: nodes.length - 1, reduced: true };
    return;
  }
  anim = { rafId: null, nodes, progress, last: null, index: -1, elapsed: 0, step: STEP_MS, reduced: false };
  const frame = (timestamp) => {
    if (!anim) return;
    if (anim.last === null) anim.last = timestamp;
    const delta = timestamp - anim.last;
    anim.last = timestamp;
    /* Pause explicite sur document.hidden : le temps n'avance pas. */
    if (!document.hidden) {
      anim.elapsed += delta;
      const next = Math.floor(anim.elapsed / anim.step);
      if (next !== anim.index) {
        if (anim.index >= 0 && anim.nodes[anim.index]) {
          anim.nodes[anim.index].classList.remove(PREFIX + '-step');
        }
        anim.index = next;
        if (anim.index < anim.nodes.length) {
          const node = anim.nodes[anim.index];
          node.classList.add(PREFIX + '-step');
          const title = node.querySelector('title');
          const detail = title ? title.textContent : `Étape ${anim.index + 1}`;
          progress.textContent = `Étape ${anim.index + 1} sur ${anim.nodes.length} · ${detail}`;
        }
      }
      if (anim.index >= anim.nodes.length) {
        stopAnimation(true);
        progress.textContent = `Parcours terminé : ${nodes.length} étapes.`;
        announce('Parcours du chemin chronologique terminé.');
        return;
      }
    }
    anim.rafId = requestAnimationFrame(frame);
  };
  anim.rafId = requestAnimationFrame(frame);
  announce(`Lecture du chemin : ${nodes.length} étapes.`);
}

register('E005', (ctx) => {
  const layout = ctx.layout;
  const legend = layout && layout.querySelector('.geo-legend');
  if (!layout || !legend) return;

  installVisibilityWatch();
  stopAnimation(true);

  /* E005-01 : bloc CSS isolé, injecté une seule fois, sans ressource externe. */
  ctx.css(PREFIX, `
  #${PREFIX}-legend { padding: 10px 12px; }
  .${PREFIX}-head { display:flex; align-items:center; justify-content:space-between; gap:8px; }
  .${PREFIX}-title { margin:0; font-size:12px; color:var(--gold-bright); }
  .${PREFIX}-subtitle { margin:10px 0 2px; font-size:10px; color:var(--gold-bright); font-weight:normal; }
  .${PREFIX}-collapse, .${PREFIX}-motifs, .${PREFIX}-reset,
  .${PREFIX}-play, .${PREFIX}-stop, .${PREFIX}-toggle, .${PREFIX}-shortcut {
    min-height:36px; min-width:36px; padding:5px 9px; border:1px solid var(--line);
    border-radius:8px; background:transparent; color:var(--muted); font-size:10px;
    line-height:1.4; text-align:left; cursor:pointer;
  }
  .${PREFIX}-collapse, .${PREFIX}-motifs, .${PREFIX}-reset, .${PREFIX}-play, .${PREFIX}-stop { text-align:center; }
  .${PREFIX}-collapse:hover, .${PREFIX}-motifs:hover, .${PREFIX}-reset:hover,
  .${PREFIX}-play:hover, .${PREFIX}-stop:hover, .${PREFIX}-toggle:hover, .${PREFIX}-shortcut:hover { border-color:var(--gold); color:var(--gold-bright); }
  .${PREFIX}-collapse:focus-visible, .${PREFIX}-motifs:focus-visible, .${PREFIX}-reset:focus-visible,
  .${PREFIX}-play:focus-visible, .${PREFIX}-stop:focus-visible, .${PREFIX}-toggle:focus-visible,
  .${PREFIX}-shortcut:focus-visible { outline:2px solid var(--gold-bright); outline-offset:2px; }
  .${PREFIX}-body { margin-top:8px; }
  .${PREFIX}-collapsed .${PREFIX}-body { display:none; }
  .${PREFIX}-notice, .${PREFIX}-info, .${PREFIX}-status, .${PREFIX}-progress {
    margin:6px 0; font-size:10px; line-height:1.6; color:var(--muted);
  }
  .${PREFIX}-info { color:var(--gold-bright); }
  .${PREFIX}-status, .${PREFIX}-progress { font-variant-numeric:tabular-nums; min-height:14px; }
  .${PREFIX}-toggles, .${PREFIX}-shortcuts { list-style:none; margin:6px 0; padding:0; }
  .${PREFIX}-entry, .${PREFIX}-shortcut-item { margin:0 0 4px; }
  .${PREFIX}-toggle { width:100%; display:flex; align-items:center; gap:8px; }
  .${PREFIX}-toggle[aria-pressed="true"] { border-color:var(--gold); color:var(--gold-bright); background:rgba(230,185,111,.10); }
  .${PREFIX}-toggle[aria-pressed="false"] { opacity:.62; }
  .${PREFIX}-toggle.${PREFIX}-echo { border-color:#ffffff; color:#ffffff; box-shadow:0 0 0 1px #ffffff inset; }
  .${PREFIX}-glyph { display:inline-block; min-width:18px; text-align:center; font-size:14px; }
  .${PREFIX}-count { margin-left:auto; font-variant-numeric:tabular-nums; color:var(--muted-2); font-size:9px; }
  .${PREFIX}-actions, .${PREFIX}-anim { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin:8px 0 4px; }
  .${PREFIX}-anim .${PREFIX}-progress { flex:1 1 100%; }
  .${PREFIX}-shortcut { width:100%; display:flex; align-items:center; gap:8px; }
  .${PREFIX}-keys { display:inline-flex; gap:3px; flex:0 0 auto; }
  .${PREFIX}-keys kbd { border:1px solid var(--line); border-radius:4px; padding:1px 5px; font-size:10px; color:var(--gold-bright); background:rgba(255,255,255,.03); }

  /* E005-02 : masquage réel des catégories, sans supprimer la donnée. */
  .${PREFIX}-off-markers .geo-marker { display:none; }
  .${PREFIX}-off-path .geo-path, .${PREFIX}-off-path .geo-path-node { display:none; }
  .${PREFIX}-off-outline .geo-outline { display:none; }

  /* E005-03 : mise en évidence synchronisée survol / focus. */
  .${PREFIX}-hi-markers .geo-ring { stroke:#ffffff; stroke-width:2.6; }
  .${PREFIX}-hi-path .geo-path { stroke-width:2.6; opacity:1; }
  .${PREFIX}-hi-path .geo-path-node { stroke:#ffffff; stroke-width:1.8; opacity:1; }
  .${PREFIX}-hi-outline .geo-outline { stroke-width:2.6; opacity:.95; }

  /* E005-08 : motifs distincts — l'information ne repose pas sur la couleur. */
  .${PREFIX}-motifs .geo-outline { stroke-dasharray:8 4; }
  .${PREFIX}-motifs .geo-path { stroke-dasharray:1 5; stroke-linecap:round; }
  .${PREFIX}-motifs .geo-marker .geo-ring { stroke-dasharray:2 2; }

  /* E005-10 : étape courante du parcours. */
  .geo-path-node.${PREFIX}-step { fill:var(--gold-bright); stroke:#ffffff; stroke-width:2.4; }
  .geo-marker.${PREFIX}-step .geo-ring { stroke:#ffffff; stroke-width:3.2; }

  @media (max-width:620px) {
    .${PREFIX}-collapse, .${PREFIX}-motifs, .${PREFIX}-reset,
    .${PREFIX}-play, .${PREFIX}-stop { min-height:40px; }
    .${PREFIX}-keys kbd { font-size:9px; }
  }`);

  /* E005-04 : compteurs calculés depuis le DOM réel, jamais inventés. */
  const applies = (cat, on) => {
    pref[cat.key] = on;
    layout.classList.toggle(cat.offClass, !on);
    const button = buttons[cat.key];
    if (button) button.setAttribute('aria-pressed', on ? 'true' : 'false');
  };
  const highlight = (cat, on) => { layout.classList.toggle(cat.hiClass, on); };

  CATEGORIES.forEach((cat) => layout.classList.toggle(cat.offClass, !pref[cat.key]));
  layout.classList.toggle(PREFIX + '-motifs', pref.motifs);

  /* E005-01 : on conserve le texte d'origine de la légende dans un paragraphe
     sémantique, lisible même si aucune interaction n'est disponible. */
  const baseText = Array.from(legend.children)
    .map((node) => (node.textContent || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' · ');
  legend.id = PREFIX + '-legend';
  legend.classList.add(PREFIX + '-legend');
  legend.classList.toggle(PREFIX + '-collapsed', pref.collapsed);
  legend.replaceChildren();

  const body = ctx.el('div', PREFIX + '-body');
  body.id = PREFIX + '-body';

  const notice = ctx.el('p', PREFIX + '-notice',
    baseText || 'Légende des symboles et des commandes de la carte locale.');
  body.appendChild(notice);

  /* E005-07 : région de statut unique, annoncée poliment. */
  const status = ctx.el('p', PREFIX + '-status', 'Légende prête.');
  status.id = PREFIX + '-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const announce = (message) => { status.textContent = message; };
  body.appendChild(status);

  /* E005-09 : repli, avec titre et bouton toujours présents et nommés. */
  const head = ctx.el('div', PREFIX + '-head');
  const title = ctx.el('h3', PREFIX + '-title', 'Légende interactive');
  title.id = PREFIX + '-title';
  const collapse = ctx.el('button', PREFIX + '-collapse',
    pref.collapsed ? 'Afficher la légende' : 'Masquer la légende');
  collapse.type = 'button';
  collapse.id = PREFIX + '-collapse';
  collapse.setAttribute('aria-controls', body.id);
  collapse.setAttribute('aria-expanded', pref.collapsed ? 'false' : 'true');
  collapse.addEventListener('click', () => {
    pref.collapsed = !pref.collapsed;
    legend.classList.toggle(PREFIX + '-collapsed', pref.collapsed);
    collapse.setAttribute('aria-expanded', pref.collapsed ? 'false' : 'true');
    collapse.textContent = pref.collapsed ? 'Afficher la légende' : 'Masquer la légende';
    announce(pref.collapsed ? 'Légende repliée.' : 'Légende dépliée.');
  });
  head.append(title, collapse);

  /* E005-02 / E005-03 / E005-04 : une entrée par catégorie de symbole. */
  const buttons = {};
  const group = ctx.el('div', PREFIX + '-toggles');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Visibilité des symboles de la carte');
  CATEGORIES.forEach((cat) => {
    const button = ctx.el('button', PREFIX + '-toggle');
    button.type = 'button';
    button.id = PREFIX + '-entry-' + cat.key;
    button.setAttribute('aria-pressed', pref[cat.key] ? 'true' : 'false');
    button.setAttribute('aria-describedby', PREFIX + '-count-' + cat.key);
    const glyph = ctx.el('span', PREFIX + '-glyph', cat.glyph);
    glyph.setAttribute('aria-hidden', 'true');
    const label = ctx.el('span', PREFIX + '-label', cat.label);
    const count = ctx.el('span', PREFIX + '-count');
    count.id = PREFIX + '-count-' + cat.key;
    const total = layout.querySelectorAll(cat.selector).length;
    count.textContent = `${total} ${cat.unit}`;
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
    const row = ctx.el('div', PREFIX + '-entry');
    row.appendChild(button);
    group.appendChild(row);
  });
  body.appendChild(group);

  /* E005-03 (retour Carte → légende). */
  CATEGORIES.forEach((cat) => {
    layout.querySelectorAll(cat.selector).forEach((node) => {
      const on = () => buttons[cat.key].classList.add(PREFIX + '-echo');
      const off = () => buttons[cat.key].classList.remove(PREFIX + '-echo');
      node.addEventListener('mouseenter', on);
      node.addEventListener('mouseleave', off);
      node.addEventListener('focus', on);
      node.addEventListener('blur', off);
    });
  });

  body.appendChild(ctx.el('p', PREFIX + '-info',
    '◎ Lieu sélectionné : mis en évidence sur la carte, un seul à la fois.'));

  /* E005-06 / E005-08 : réinitialisation et motif sans couleur. */
  const actions = ctx.el('div', PREFIX + '-actions');
  const motifs = ctx.el('button', PREFIX + '-motifs',
    pref.motifs ? 'Motifs : activés' : 'Motifs : désactivés');
  motifs.type = 'button';
  motifs.id = PREFIX + '-motifs';
  motifs.setAttribute('aria-pressed', pref.motifs ? 'true' : 'false');
  motifs.addEventListener('click', () => {
    pref.motifs = !pref.motifs;
    layout.classList.toggle(PREFIX + '-motifs', pref.motifs);
    motifs.setAttribute('aria-pressed', pref.motifs ? 'true' : 'false');
    motifs.textContent = pref.motifs ? 'Motifs : activés' : 'Motifs : désactivés';
    announce(pref.motifs
      ? 'Motifs activés : les symboles se distinguent par leur forme et leurs tirets.'
      : 'Motifs désactivés : retour aux couleurs habituelles.');
  });
  const reset = ctx.el('button', PREFIX + '-reset', 'Tout afficher');
  reset.type = 'button';
  reset.id = PREFIX + '-reset';
  reset.addEventListener('click', () => {
    CATEGORIES.forEach((cat) => {
      applies(cat, true);
      layout.classList.remove(cat.hiClass);
    });
    stopAnimation(true);
    progress.textContent = 'Parcours réinitialisé.';
    announce('Légende réinitialisée : tous les symboles sont affichés.');
  });
  actions.append(motifs, reset);
  body.appendChild(actions);

  /* E005-10 : commandes du parcours, avec lecture instantanée si mouvement réduit. */
  const animRow = ctx.el('div', PREFIX + '-anim');
  const play = ctx.el('button', PREFIX + '-play', 'Lire le chemin');
  play.type = 'button';
  play.id = PREFIX + '-play';
  play.addEventListener('click', () => {
    startAnimation(layout, progress, announce, ctx.reducedMotion());
  });
  const stop = ctx.el('button', PREFIX + '-stop', 'Arrêter');
  stop.type = 'button';
  stop.id = PREFIX + '-stop';
  stop.addEventListener('click', () => {
    stopAnimation();
    progress.textContent = 'Parcours arrêté.';
    announce('Parcours arrêté.');
  });
  const progress = ctx.el('p', PREFIX + '-progress', 'Parcours non démarré.');
  progress.id = PREFIX + '-progress';
  progress.setAttribute('role', 'status');
  progress.setAttribute('aria-live', 'polite');
  animRow.append(play, stop, progress);
  body.appendChild(animRow);

  /* E005-05 : les raccourcis sont de vrais boutons qui atteignent la commande. */
  body.appendChild(ctx.el('h4', PREFIX + '-subtitle',
    'Raccourcis clavier — cliquer pour atteindre la commande'));
  const shortcuts = ctx.el('ul', PREFIX + '-shortcuts');
  SHORTCUTS.forEach((shortcut, index) => {
    const button = ctx.el('button', PREFIX + '-shortcut');
    button.type = 'button';
    button.id = PREFIX + '-kbd-' + index;
    const keys = ctx.el('span', PREFIX + '-keys');
    shortcut.keys.forEach((key) => keys.appendChild(ctx.el('kbd', '', key)));
    button.append(keys, ctx.el('span', PREFIX + '-shortcut-label', shortcut.label));
    button.addEventListener('click', () => {
      const target = document.querySelector(shortcut.target);
      if (target && typeof target.focus === 'function') {
        target.focus();
        announce(`Commande atteinte : ${shortcut.label}.`);
      } else {
        announce(`Commande indisponible dans cet état : ${shortcut.label}.`);
      }
    });
    const item = ctx.el('li', PREFIX + '-shortcut-item');
    item.appendChild(button);
    shortcuts.appendChild(item);
  });
  body.appendChild(shortcuts);

  legend.append(head, body);
});
