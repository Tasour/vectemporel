import { register } from './registry.js';

/* Lentille E045 — vue CHRONOLOGIE : repères de situation, fil d'Ariane et
   progression de lecture. Dix chantiers E045-01 à E045-10, tous implémentés
   dans ce module.

   Tout est dérivé du DOM rendu par chronology.js : aucun état global importé,
   aucune donnée historique inventée, aucun réseau, aucune trace de débogage,
   aucune source d'aléa, aucune boucle d'animation propre. Le panneau vit
   dans le flux de #atlas-chrono-main, qui est le conteneur défilant réel
   (styles.css:195) : le rapport de lecture est donc calculé sur ce nœud, pas
   sur la fenêtre.

   Le fil C2 existant (chronology.js:140-168, 258-275) est complété, jamais
   remplacé : aucun identifiant nav-c2a-* n'est réécrit. */

const STYLE_ID = 'chronology-e045';

/* Choix éditorial d'estimation, explicitement déclaré : 200 mots par minute.
   Ce n'est pas une mesure historique ni une promesse de lecture. */
const WORDS_PER_MINUTE = 200;

const CSS = `
.e045-panel{margin:0 0 14px;padding:9px 11px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)}
.e045-title{margin:0 0 5px;color:var(--ink);font-family:var(--serif);font-size:12px;font-weight:450}
.e045-line{margin:3px 0;color:var(--muted);font-size:9px;line-height:1.5}
.e045-subtrail{margin:6px 0}
.e045-subtrail-list{display:flex;flex-wrap:wrap;gap:4px;margin:0;padding:0;list-style:none}
.e045-subtrail-list>li{display:flex;min-width:0}
.e045-point-btn{min-width:24px;min-height:24px;padding:2px 6px;border:1px solid var(--line);border-radius:6px;background:transparent;color:var(--muted);font-size:9px;font-variant-numeric:tabular-nums;cursor:pointer}
.e045-point-btn:hover{border-color:var(--gold)}
.e045-point-btn[aria-current="step"]{border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.1)}
.e045-point-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e045-meters{margin:7px 0 0}
.e045-meter{margin:5px 0}
.e045-meter-label{display:block;margin:0 0 3px;color:var(--muted);font-size:9px;font-variant-numeric:tabular-nums}
.e045-meter progress{display:block;width:100%;height:7px;accent-color:var(--gold)}
.e045-scroll-track{height:7px;border:1px solid var(--line);border-radius:999px;overflow:hidden;background:var(--surface)}
.e045-scroll-fill{display:block;width:0;height:100%;background:var(--gold);transition:width .12s linear}
.e045-actions{margin:7px 0 0}
.e045-top-btn{min-height:36px;padding:5px 10px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--gold-bright);font-size:9px;cursor:pointer}
.e045-top-btn:hover{border-color:var(--gold)}
.e045-top-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.e045-rank{padding:0 10px 2px;color:var(--muted-2);font-size:8px;font-variant-numeric:tabular-nums}
.e045-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media (max-width:620px){.e045-panel{padding:7px 8px}.e045-point-btn{min-height:28px}}
@media (prefers-reduced-motion:reduce){.e045-scroll-fill{transition:none!important}}
[data-e045-reduced="1"] .e045-scroll-fill{transition:none}
`;

function byId(id) {
  return document.getElementById(id);
}

/* Une seule fabrique pour tous les nœuds E045 : réutilise un nœud déjà
   présent, le déplace sinon dans le parent courant. C'est la garde
   d'existence qui rend la lentille sûre après reconstruction du DOM. */
function ensure(id, tag, className, parent) {
  let node = byId(id);
  if (!node) {
    node = document.createElement(tag);
    node.id = id;
    if (className) node.className = className;
  }
  if (parent && node.parentNode !== parent) parent.appendChild(node);
  return node;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function textOf(root, selector) {
  const node = root && root.querySelector(selector);
  return node ? String(node.textContent || '').trim() : '';
}

function setText(id, value) {
  const node = byId(id);
  if (node && node.textContent !== value) node.textContent = value;
}

/* Accepte « rang global 3/12 » (chronology.js:255) et
   « Repère 3 / 12 » (chronology.js:420). */
function fraction(text) {
  const found = String(text || '').match(/(\d+)\s*(?:\/|sur)\s*(\d+)/i);
  if (!found) return { current: 0, total: 0 };
  return { current: Number(found[1]), total: Number(found[2]) };
}

function focusable(node) {
  if (node && node.tabIndex < 0 && !node.dataset.e045Focusable) {
    node.tabIndex = -1;
    node.dataset.e045Focusable = '1';
  }
}

function buildPanel(main, orientation) {
  const panel = ensure('e045-panel', 'section', 'e045-panel', main);
  panel.setAttribute('aria-labelledby', 'e045-panel-title');

  ensure('e045-panel-title', 'h2', 'e045-title', panel).textContent = 'Repères de lecture';
  ensure('e045-depth', 'p', 'e045-line', panel);

  const subtrail = ensure('e045-subtrail', 'nav', 'e045-subtrail', panel);
  subtrail.setAttribute('aria-label', 'Fil de lecture du repère — points');
  ensure('e045-subtrail-list', 'ol', 'e045-subtrail-list', subtrail);

  const meters = ensure('e045-meters', 'div', 'e045-meters', panel);

  const scrollMeter = ensure('e045-scroll-meter', 'div', 'e045-meter', meters);
  ensure('e045-scroll-label', 'span', 'e045-meter-label', scrollMeter);
  const track = ensure('e045-scroll-bar', 'div', 'e045-scroll-track', scrollMeter);
  track.setAttribute('role', 'progressbar');
  track.setAttribute('aria-label', 'Progression de lecture dans la colonne chronologique');
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', '100');
  track.setAttribute('aria-valuenow', '0');
  ensure('e045-scroll-fill', 'span', 'e045-scroll-fill', track);

  const globalWrap = ensure('e045-global-meter-wrap', 'div', 'e045-meter', meters);
  ensure('e045-global-label', 'span', 'e045-meter-label', globalWrap);
  const globalMeter = ensure('e045-global-meter', 'progress', '', globalWrap);
  globalMeter.setAttribute('aria-label', 'Progression parmi les repères du pays');

  const eraWrap = ensure('e045-era-meter-wrap', 'div', 'e045-meter', meters);
  ensure('e045-era-label', 'span', 'e045-meter-label', eraWrap);
  const eraMeter = ensure('e045-era-meter', 'progress', '', eraWrap);
  eraMeter.setAttribute('aria-label', 'Progression parmi les ères du pays');

  ensure('e045-point-now', 'p', 'e045-line', panel);
  ensure('e045-load', 'p', 'e045-line', panel);

  const actions = ensure('e045-actions', 'div', 'e045-actions', panel);
  const top = ensure('e045-top-btn', 'button', 'e045-top-btn', actions);
  top.type = 'button';
  top.textContent = '↑ Reprendre le fil';

  ensure('e045-orientation-desc', 'p', 'e045-sr-only', main);

  /* Placement : juste après le bloc C2 quand il existe, sinon après le
     statut, sinon en tête de colonne. Aucun nœud existant n'est retiré. */
  const anchor = ((orientation && orientation.parentNode === main)
    ? orientation
    : byId('atlas-chrono-status'));
  if (anchor && anchor.nextSibling !== panel) main.insertBefore(panel, anchor.nextSibling);
  else if (!anchor && main.firstChild !== panel) main.insertBefore(panel, main.firstChild);

  return panel;
}

register('E045', (ctx) => {
  const layout = ctx.layout;
  if (!layout || layout.dataset.view !== 'chronology') return;
  ctx.css(STYLE_ID, CSS);

  const main = byId('atlas-chrono-main');
  const aside = byId('atlas-chrono-aside');
  const heading = byId('atlas-chrono-title');
  if (!main) return;

  layout.classList.add('chronology-e045');
  layout.dataset.e045 = '1';
  layout.dataset.e045Reduced = ctx.reducedMotion() ? '1' : '0';

  const orientation = main.querySelector('.nav-c2-orientation');
  buildPanel(main, orientation);

  /* L'identifiant C2 est porté par le <nav> (chronology.js:144) et non par
     l'<ol> (chronology.js:146) : les sélecteurs passent donc par le nav. */
  const crumbs = [...main.querySelectorAll('#nav-c2a-trail .nav-c2-trail-list > li')];
  const currentCrumb = main.querySelector('#nav-c2a-trail .nav-c2-crumb.is-current');
  const points = aside ? [...aside.querySelectorAll('.point')] : [];
  const bands = [...main.querySelectorAll('#atlas-chrono-eras .era-band')];
  let lastPoint = 0;

  /* E045-03 — profondeur de situation : le fil C2 a cinq niveaux et seule la
     crumb courante porte aria-current="location" (chronology.js:154-165). */
  const currentIndex = crumbs.findIndex((item) => item.querySelector('.nav-c2-crumb.is-current'));
  const level = currentIndex >= 0 ? currentIndex + 1 : crumbs.length;
  setText('e045-depth', crumbs.length
    ? `Situation : niveau ${level} sur ${crumbs.length} du fil — ${currentCrumb ? currentCrumb.textContent.trim() : 'repère non sélectionné'}.`
    : 'Situation : le fil de la coque n’est pas disponible dans cette vue.');

  /* E045-05 — progression globale des repères, lue dans le statut puis, à
     défaut, dans la première kicker de la fiche. */
  const statusText = String(byId('atlas-chrono-status')?.textContent || '');
  const local = statusText.match(/rang global\s*(\d+)\s*\/\s*(\d+)/i);
  const global = local
    ? { current: Number(local[1]), total: Number(local[2]) }
    : fraction(textOf(aside, '.aside-kicker'));
  const globalMeter = byId('e045-global-meter');
  if (globalMeter) {
    globalMeter.max = global.total || 1;
    globalMeter.value = clamp(global.current, 0, global.total || 1);
  }
  setText('e045-global-label', global.total
    ? `Repères du pays : ${global.current} sur ${global.total}.`
    : 'Repères du pays : progression non disponible.');

  /* E045-06 — progression des ères, déduite des bandes et de leur attribut
     aria-current (chronology.js:284-305). */
  const bandIndex = bands.findIndex((band) => band.getAttribute('aria-current') === 'true');
  const eraMeter = byId('e045-era-meter');
  if (eraMeter) {
    eraMeter.max = bands.length || 1;
    eraMeter.value = clamp(bandIndex + 1, 0, bands.length || 1);
  }
  setText('e045-era-label', bands.length
    ? `Ères du pays : ${bandIndex + 1} sur ${bands.length}.`
    : 'Ères du pays : aucune ère documentée.');

  /* E045-02 — sous-fil des points : un jalon par <li class="point"> réel,
     adressable au clavier et marqué avec aria-current="step". */
  const pointList = byId('e045-subtrail-list');
  if (pointList) {
    while (pointList.firstChild) pointList.removeChild(pointList.firstChild);
    points.forEach((point, position) => {
      const li = document.createElement('li');
      const button = ensure(`e045-point-${position + 1}`, 'button', 'e045-point-btn', li);
      button.type = 'button';
      button.textContent = String(position + 1);
      button.setAttribute('aria-label', `Aller au point ${position + 1} sur ${points.length}`);
      button.addEventListener('click', () => {
        const reduced = ctx.reducedMotion();
        focusable(point);
        if (typeof point.scrollIntoView === 'function') {
          point.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
        }
        if (typeof point.focus === 'function') point.focus({ preventScroll: true });
        if (lastPoint !== position + 1) {
          lastPoint = position + 1;
          markPoint();
          describe();
        }
      });
      li.appendChild(button);
      pointList.appendChild(li);
    });
    if (!points.length) {
      const li = document.createElement('li');
      li.textContent = 'Aucun point documenté pour ce repère.';
      pointList.appendChild(li);
    }
  }

  function markPoint() {
    for (let position = 1; position <= points.length; position += 1) {
      const button = byId(`e045-point-${position}`);
      if (!button) continue;
      if (position === lastPoint) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
    setText('e045-point-now', points.length
      ? `Lecture des points : point ${lastPoint} sur ${points.length}.`
      : 'Lecture des points : aucun point documenté pour ce repère.');
  }

  function currentPoint() {
    if (!aside || !points.length) return 0;
    const threshold = aside.getBoundingClientRect().top + 24;
    let index = 1;
    points.forEach((point, position) => {
      if (point.getBoundingClientRect().top <= threshold) index = position + 1;
    });
    return index;
  }

  /* E045-09 — équivalent textuel de la situation pour les lecteurs d'écran.
     L'identifiant est ajouté à aria-describedby sans écraser les autres. */
  function describe() {
    const desc = byId('e045-orientation-desc');
    if (!desc) return;
    const country = String(heading?.textContent || '').replace(/^Chronologie\s*·\s*/, '').trim();
    const eraLabel = textOf(main, '#atlas-chrono-eras .era-band[aria-current="true"] span');
    const pieces = [
      `Situation de lecture : chronologie de ${country || 'pays non sélectionné'}`,
      eraLabel ? `ère ${eraLabel}` : '',
      currentCrumb ? `repère ${currentCrumb.textContent.trim()}` : '',
      global.total ? `rang global ${global.current} sur ${global.total}` : '',
      points.length ? `point ${lastPoint} sur ${points.length}` : '',
    ].filter(Boolean);
    desc.textContent = `${pieces.join(' ; ')}.`;
    if (heading) {
      const ids = String(heading.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      if (!ids.includes(desc.id)) {
        ids.push(desc.id);
        heading.setAttribute('aria-describedby', ids.join(' '));
      }
    }
  }

  /* E045-01 — progression de lecture calculée sur le conteneur défilant
     #atlas-chrono-main (styles.css:195), écouteur simple et passif : aucune
     boucle rAF, aucun timer, aucune annonce live concurrente. */
  function refreshScroll() {
    const range = main.scrollHeight - main.clientHeight;
    const percent = range <= 0 ? 100 : clamp(Math.round((main.scrollTop / range) * 100), 0, 100);
    setText('e045-scroll-label', range <= 0
      ? 'Lecture de la colonne : 100 % — contenu entièrement visible.'
      : `Lecture de la colonne : ${percent} %.`);
    const track = byId('e045-scroll-bar');
    if (track) track.setAttribute('aria-valuenow', String(percent));
    const fill = byId('e045-scroll-fill');
    if (fill) fill.style.width = `${percent}%`;
  }
  main.addEventListener('scroll', refreshScroll, { passive: true });

  if (aside) {
    aside.addEventListener('scroll', () => {
      const index = currentPoint();
      if (index !== lastPoint) {
        lastPoint = index;
        markPoint();
        describe();
      }
    }, { passive: true });
  }

  /* E045-04 — charge de lecture estimée à partir du texte réellement rendu.
     La fenêtre d'estimation est déclarée plus haut, aucun chiffre n'est
     présenté comme un fait historique. */
  const measured = [byId('atlas-chrono-events'), aside]
    .filter(Boolean)
    .map((node) => node.innerText || node.textContent || '')
    .join(' ');
  const words = (measured.match(/[\p{L}\p{N}’'-]+/gu) || []).length;
  const minutes = Math.ceil(words / WORDS_PER_MINUTE);
  setText('e045-load', `Charge de lecture estimée : ≈ ${minutes} min (${words.toLocaleString('fr-FR')} mots visibles, estimation à ${WORDS_PER_MINUTE} mots/min).`);

  /* E045-07 — rang de chaque carte, recalculé depuis sa position dans la
     liste rendue, sans renommer .event-card ni toucher aux filtres. */
  const cards = [...main.querySelectorAll('#atlas-chrono-events > li[data-event-id] .event-card')];
  cards.forEach((item, position) => {
    const rank = ensure(`e045-rank-${position + 1}`, 'span', 'e045-rank', item);
    /* Libellé relatif à la liste affichée : sous filtre (chronology.js:178-188)
       la liste peut couvrir tous les repères du pays, pas seulement l'ère. */
    rank.textContent = `Position dans la liste : ${position + 1} sur ${cards.length}`;
  });

  /* E045-08 — retour au fil depuis le bas de colonne, avec mouvement réduit
     respecté (ctx.reducedMotion(), registry.js:33-37). */
  const topButton = byId('e045-top-btn');
  if (topButton) {
    topButton.addEventListener('click', () => {
      const reduced = ctx.reducedMotion();
      if (typeof main.scrollTo === 'function') {
        main.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      } else {
        main.scrollTop = 0;
      }
      const target = orientation || heading;
      if (target) {
        focusable(target);
        if (typeof target.focus === 'function') target.focus({ preventScroll: true });
      }
      refreshScroll();
    });
  }

  /* E045-10 — initialisation synchrone : une seule passe, puis les deux
     écouteurs attachés à des nœuds recreés à chaque rendu disparaissent avec
     eux. Aucun état module mutable, aucun garde-fou supprimé. */
  lastPoint = currentPoint();
  markPoint();
  refreshScroll();
  describe();
});
