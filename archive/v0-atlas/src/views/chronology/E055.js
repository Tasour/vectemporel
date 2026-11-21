import { register } from './registry.js';

/* Lentille E055 — vue Chronologie.
   Thème : titres sémantiques, regroupement par époque, structure de document.
   Tout est dérivé du DOM produit par chronology.js : aucune donnée n'est
   inventée, aucun fichier partagé n'est modifié. Aucun appel réseau, aucune
   source de hasard, aucun affichage de débogage, aucune boucle d'animation
   propre à la lentille. */

const STYLE_ID = 'chronology-e055';

function formatYear(value) {
  const year = Number(value);
  if (!Number.isFinite(year)) return '?';
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : `${year}`;
}

register('E055', (ctx) => {
  const { stage, layout, css, el } = ctx;
  if (!layout || !stage) return;

  /* E055-10 : bloc de style unique, injecté une seule fois dans <head>
     (registry.js:13-19), qui survit au innerHTML de la coque. */
  css(STYLE_ID, `
.e055-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.e055-outline{margin:0 0 14px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;background:rgba(255,255,255,.02)}
.e055-outline-lead{margin:0 0 6px;color:var(--gold);font-size:8px;font-weight:600;letter-spacing:.16em;text-transform:uppercase}
.e055-outline-list{display:flex;flex-wrap:wrap;gap:5px 12px;margin:0;padding:0;list-style:none}
.e055-outline-item{display:flex;gap:6px;align-items:baseline;min-width:0}
.e055-outline-title{margin:0;color:var(--ink-soft);font-family:var(--serif);font-size:12px;font-weight:450}
.e055-outline-item[aria-current="true"] .e055-outline-title{color:var(--gold-bright);font-weight:600}
.e055-outline-range,.e055-outline-count{color:var(--muted-2);font-size:8px;font-variant-numeric:tabular-nums}
.e055-outline-count::before{content:' · '}
.e055-era-head{display:block!important;width:100%;margin:12px 0 2px;padding:0 0 4px;border-bottom:1px solid var(--line-strong)}
.e055-era-head-title{margin:0;color:var(--gold);font-family:var(--serif);font-size:13px;font-weight:450}
.e055-era-head-count{margin-left:6px;color:var(--muted-2);font-size:8px;font-variant-numeric:tabular-nums}
.event-card > strong[role="heading"]{display:block}
@media (max-width:620px){.e055-outline{padding:7px 8px}.e055-outline-list{gap:4px 8px}}
@media (prefers-reduced-motion:reduce){.e055-outline,.e055-era-head{transition:none!important}}`);

  /* Gardes d'existence : réutilise un nœud e055 déjà présent, le déplace
     dans le bon parent et ne duplique jamais d'IDENTIFIANT. */
  function ensureNode(parent, id, tag, className, text) {
    let node = document.getElementById(id);
    if (!node || node.tagName.toLowerCase() !== tag.toLowerCase()) {
      if (node) node.remove();
      node = el(tag, className, text);
      node.id = id;
    } else {
      if (className) node.className = className;
      if (text !== undefined && !node.hasChildNodes()) node.textContent = text;
    }
    if (node.parentNode !== parent) parent.appendChild(node);
    return node;
  }

  const main = document.getElementById('atlas-chrono-main');
  const eraNav = document.getElementById('atlas-chrono-eras');
  const list = document.getElementById('atlas-chrono-events');
  const status = document.getElementById('atlas-chrono-status');
  if (!main || !eraNav || !list) return;

  /* E055-01 — chronology.js:218 crée une <section class="chronology-main">
     avec aria-labelledby (:220) mais aucun repère <main>/role="main".
     On pose le rôle seulement si la page n'en possède déjà aucun, afin de
     ne jamais introduire un second <main>. */
  if (!document.querySelector('main, [role="main"]')) {
    main.setAttribute('role', 'main');
  }
  const hasMain = main.tagName.toLowerCase() === 'main' || main.getAttribute('role') === 'main';
  layout.dataset.e055Main = hasMain ? '1' : '0';

  /* E055-02 — les titres des cartes sont des <strong> (chronology.js:393) :
     ils échappent à la navigation par titres des lecteurs d'écran. On les
     élève au rang 3 de la hiérarchie, sans éditer chronology.js. */
  const cards = Array.from(list.querySelectorAll('li[data-event-id] > .event-card'));
  cards.forEach((card) => {
    const strong = Array.from(card.children).find((node) => node.tagName === 'STRONG');
    if (strong && !strong.hasAttribute('role')) {
      strong.setAttribute('role', 'heading');
      strong.setAttribute('aria-level', '3');
    }
  });

  /* E055-03 à E055-06 — métadonnées lues sur les bandes réelles
     (chronology.js:284-297) : nom (premier <span>, :295), plage
     (data-start/data-end, :288-289), rang et état courant (aria-current, :290).
     Aucune valeur n'est fabriquée. */
  const bands = Array.from(eraNav.querySelectorAll('.era-band'));
  const eras = bands.map((band, index) => ({
    id: band.dataset.eraId || '',
    index,
    name: band.firstElementChild ? band.firstElementChild.textContent.trim() : '',
    start: band.dataset.start,
    end: band.dataset.end,
    current: band.getAttribute('aria-current') === 'true',
  }));

  const items = Array.from(list.children).filter((node) => node.dataset && node.dataset.eraId);
  const countFor = (id) => items.filter((node) => node.dataset.eraId === id).length;

  const outline = ensureNode(main, 'e055-era-outline', 'nav', 'e055-outline');
  outline.setAttribute('aria-label', 'Sommaire des ères documentées');
  ensureNode(outline, 'e055-outline-lead', 'p', 'e055-outline-lead', 'Ères documentées');
  const outlineList = ensureNode(outline, 'e055-outline-list', 'ol', 'e055-outline-list');
  const anchor = document.getElementById('atlas-chrono-tools') || list;
  if (outline.nextElementSibling !== anchor) main.insertBefore(outline, anchor);

  eras.forEach((era) => {
    const item = ensureNode(outlineList, `e055-outline-item-${era.id}`, 'li', 'e055-outline-item');
    ensureNode(item, `e055-outline-title-${era.id}`, 'h2', 'e055-outline-title',
      `Ère ${era.index + 1} · ${era.name}`);
    ensureNode(item, `e055-outline-range-${era.id}`, 'span', 'e055-outline-range',
      `${formatYear(era.start)} → ${formatYear(era.end)}`);
    const countNode = ensureNode(item, `e055-outline-count-${era.id}`, 'span', 'e055-outline-count',
      `${countFor(era.id)} repère(s)`);
    countNode.setAttribute('aria-label', `${countFor(era.id)} repères dans cette ère`);
    if (era.current) {
      item.setAttribute('aria-current', 'true');
      const title = item.querySelector('.e055-outline-title');
      if (title) title.setAttribute('aria-current', 'true');
    } else {
      item.removeAttribute('aria-current');
      const title = item.querySelector('.e055-outline-title');
      if (title) title.removeAttribute('aria-current');
    }
  });

  /* E055-07 — sous filtre, la liste est plate (chronology.js:348-414) :
     les repères de plusieurs ères se succèdent dans un seul <ol>. On insère
     un en-tête de groupe avant chaque série continue d'une même ère. */
  if (list.dataset.e055Grouped !== '1') {
    let run = 0;
    let previous = null;
    let groups = 0;
    items.forEach((li) => {
      if (li.dataset.eraId !== previous) {
        run += 1;
        groups += 1;
        const era = eras.find((candidate) => candidate.id === li.dataset.eraId);
        const head = el('li', 'e055-era-head');
        head.id = `e055-group-${run}`;
        head.setAttribute('role', 'presentation');
        const label = era
          ? `Ère ${era.index + 1} · ${era.name} (${formatYear(era.start)} → ${formatYear(era.end)})`
          : `Ère · ${li.dataset.eraId}`;
        const title = el('h2', 'e055-era-head-title', label);
        title.id = `e055-group-title-${run}`;
        title.appendChild(el('span', 'e055-era-head-count', `${countFor(li.dataset.eraId)} repère(s)`));
        head.appendChild(title);
        list.insertBefore(head, li);
      }
      previous = li.dataset.eraId;
    });
    list.dataset.e055Grouped = '1';
    list.dataset.e055Groups = String(groups);
  }

  /* E055-08 — hiérarchie cohérente : h1 (chronology.js:227) → h2 ère →
     h3 repère → h4 points. La fiche porte déjà h2 (:423) et h3 (:462) ;
     aria-level les aligne sur les titres de repère promus en E055-02. */
  const eventTitle = document.getElementById('atlas-chrono-event-title');
  if (eventTitle && eventTitle.tagName.toLowerCase() === 'h2' && !eventTitle.hasAttribute('aria-level')) {
    eventTitle.setAttribute('aria-level', '3');
  }
  const pointsTitle = document.getElementById('atlas-chrono-points-title');
  if (pointsTitle && pointsTitle.tagName.toLowerCase() === 'h3' && !pointsTitle.hasAttribute('aria-level')) {
    pointsTitle.setAttribute('aria-level', '4');
  }

  /* E055-09 — le <main> est étiqueté par le h1 (:220) ; on ajoute la bande
     de statut visible (:247-256) comme description sans écraser un
     aria-describedby existant (garde par jetons). */
  if (status) {
    const described = (main.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (!described.includes(status.id)) {
      described.push(status.id);
      main.setAttribute('aria-describedby', described.join(' '));
    }
  }

  /* E055-10 — miroir d'audit, mouvement réduit et unicité finale. */
  let reduced = false;
  try {
    reduced = Boolean(typeof ctx.reducedMotion === 'function' && ctx.reducedMotion());
  } catch {
    reduced = false;
  }
  layout.dataset.e055Reduced = reduced ? '1' : '0';
  layout.dataset.e055Outline = String(eras.length);
  layout.dataset.e055Cards = String(cards.length);

  const seen = new Set();
  document.querySelectorAll('[id^="e055-"]').forEach((node) => {
    if (seen.has(node.id)) node.remove();
    else seen.add(node.id);
  });
});
