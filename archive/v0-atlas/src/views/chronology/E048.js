import { register } from './registry.js';

/* Lentille CHRONOLOGIE E048 — marqueurs temporels absolus, format des années
   et av. J.-C. Tout est dérivé des attributs data-year / data-start / data-end
   déjà posés par chronology.js : aucune date n'est inventée, aucun texte
   historique n'est réécrit. Zéro réseau, zéro Math.random, zéro console.*,
   aucune boucle requestAnimationFrame propre à la lentille. */

const NNBSP = '\u202F'; /* espace insécable fine — typographie française */
const BC = 'av. J.-C.';
const AD = 'ap. J.-C.';

/* Convertit un attribut brut en entier fini, ou null. */
function toInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

/* Groupe les milliers par espace insécable fine (chronology.js:27 ne le fait
   pas : String(year) produit « 10000 »). */
function grouped(value) {
  return String(Math.abs(value)).replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
}

/* Libellé absolu normalisé : espace fine devant « av. J.-C. » et milliers
   groupés. Les années 0 et positives gardent leur valeur chiffrée d'origine. */
function signedLabel(year) {
  return year < 0 ? `${grouped(year)}${NNBSP}${BC}` : grouped(year);
}

/* Formulation parlée pour le lecteur d'écran. */
function spokenYear(year) {
  if (year < 0) return `Année ${grouped(year)} ${BC}.`;
  if (year === 0) return `An zéro astronomique, soit 1 ${BC}.`;
  return `Année ${grouped(year)} ${AD}.`;
}

register('E048', (ctx) => {
  const doc = ctx.stage && ctx.stage.ownerDocument ? ctx.stage.ownerDocument : document;
  const root = ctx.layout || ctx.stage;
  if (!root) return;

  /* Une seule injection de feuille, idempotente (registry.js:13-19). */
  ctx.css('chronology-e048', `
.e048-scale{margin:0 0 14px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.e048-scale-note{margin:0 0 6px;color:var(--muted);font-size:9px;line-height:1.4}
.e048-scale-bar{display:flex;align-items:center;gap:6px}
.e048-scale-side{color:var(--muted-2);font-size:8px;white-space:nowrap}
.e048-scale-rule{position:relative;flex:1;height:2px;border-radius:2px;background:linear-gradient(90deg,rgba(230,185,111,.25),rgba(230,185,111,.7) 50%,rgba(120,170,220,.25))}
.e048-scale-zero{position:absolute;top:-3px;left:var(--e048-zero);width:1px;height:9px;background:var(--muted)}
.e048-ad{margin-left:3px;color:var(--muted-2);font-size:8px;white-space:nowrap}
.e048-zero{display:block;margin-top:2px;color:var(--muted-2);font-size:7px;line-height:1.3}
.e048-era-span{display:block;margin-top:2px;color:var(--muted-2);font-size:7px}
.e048-pos{position:relative;display:block;height:7px;margin:0 10px 4px;border-radius:4px;background:linear-gradient(90deg,rgba(230,185,111,.18),rgba(120,170,220,.18))}
.e048-pos::after{content:'';position:absolute;top:-1px;left:var(--e048-pos);width:5px;height:5px;border-radius:50%;background:var(--gold);transform:translateX(-50%)}
.e048-pos[data-e048-segment="bc"]::after{background:#d9a441}
.e048-pos[data-e048-segment="ad"]::after{background:#7aaad9}
.e048-sr-year{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.e048-gap{margin:8px 0 0;color:var(--muted);font-size:9px;line-height:1.4}
[data-e048-reduced="1"] .e048-pos::after{transition:none}
@media (max-width:620px){.e048-scale{padding:7px 8px}.e048-scale-side{font-size:7px}.e048-zero{font-size:6px}}
@media (prefers-reduced-motion:reduce){.e048-pos::after{transition:none!important}}`);

  const el = ctx.el;

  /* E048-10 : un seul point d'entrée pour les nœuds ajoutés. Un nœud existant
     mais déplacé hors du rendu courant est retiré avant d'être recréé, ce qui
     interdit tout doublon d'identifiant après reconstruction de la coque. */
  function ensureNode(id, tag, className, parent, before) {
    let node = doc.getElementById(id);
    if (node) {
      if (node.isConnected && parent.contains(node)) return node;
      if (node.isConnected) node.remove();
    }
    node = el(tag, className);
    node.id = id;
    if (before && before.parentNode === parent) parent.insertBefore(node, before);
    else parent.appendChild(node);
    return node;
  }

  /* Repères datés réellement rendus, avec leur carte et leur année brute. */
  function collected() {
    const items = [];
    root.querySelectorAll('#atlas-chrono-events > li[data-year]').forEach((item) => {
      if (item.hidden) return;
      const year = toInt(item.dataset.year);
      if (year === null) return;
      items.push({ item, card: item.querySelector('.event-card'), year });
    });
    return items;
  }

  function currentRawYear() {
    const card = root.querySelector('#atlas-chrono-events .event-card[aria-current="true"]');
    const item = card && card.closest('li[data-year]');
    return item ? item.dataset.year : null;
  }

  root.dataset.e048 = '1';
  root.dataset.e048Reduced = ctx.reducedMotion() ? '1' : '0';

  const items = collected();
  const years = items.map((entry) => entry.year);
  const min = years.length ? Math.min(...years) : null;
  const max = years.length ? Math.max(...years) : null;

  /* E048-01 (espace fine) et E048-04 (milliers groupés) : les trois endroits
     où chronology.js appelle formatYear() (392, 296, 430) sont normalisés
     depuis l'année brute, sans toucher au titre ni au sous-titre. */
  root.querySelectorAll('.event-year').forEach((node) => {
    const item = node.closest('li[data-year]');
    if (!item || node.dataset.e048Typo === '1') return;
    const year = toInt(item.dataset.year);
    if (year === null) return;
    node.dataset.e048Typo = '1';
    node.dataset.e048Raw = String(year);
    node.textContent = signedLabel(year);
  });

  root.querySelectorAll('.atlas-chrono-era-range').forEach((node) => {
    const band = node.closest('.era-band[data-start]');
    if (!band || node.dataset.e048Typo === '1') return;
    const start = toInt(band.dataset.start);
    const end = toInt(band.dataset.end);
    if (start === null || end === null) return;
    node.dataset.e048Typo = '1';
    node.dataset.e048Raw = `${start}..${end}`;
    node.textContent = `${signedLabel(start)} → ${signedLabel(end)}`;
  });

  const asideYear = root.querySelector('.aside-year');
  if (asideYear && asideYear.dataset.e048Typo !== '1') {
    const raw = currentRawYear();
    const year = toInt(raw);
    if (year !== null) {
      const text = asideYear.textContent;
      const split = text.indexOf(' · ');
      const tail = split >= 0 ? text.slice(split) : '';
      asideYear.dataset.e048Typo = '1';
      asideYear.dataset.e048Raw = String(year);
      asideYear.textContent = '';
      const label = el('span', 'e048-aside-label', signedLabel(year));
      asideYear.appendChild(label);
      if (tail) asideYear.appendChild(doc.createTextNode(tail));
      /* E048-02 : le « ap. J.-C. » est inséré juste après l'année, avant le
         séparateur, jamais après le sous-titre. */
      if (year > 0) label.appendChild(el('span', 'e048-ad', NNBSP + AD));
    }
  }

  /* E048-02 : pastille « ap. J.-C. » sur les années positives des cartes et
     des plages d'ères entièrement positives. Les années négatives portent
     déjà « av. J.-C. » dans signedLabel(). */
  items.forEach(({ card, year }) => {
    if (!card || year <= 0) return;
    const node = card.querySelector('.event-year');
    if (!node || node.querySelector('.e048-ad')) return;
    node.appendChild(el('span', 'e048-ad', NNBSP + AD));
  });
  root.querySelectorAll('.era-band[data-start][data-end]').forEach((band) => {
    const start = toInt(band.dataset.start);
    const end = toInt(band.dataset.end);
    if (start === null || end === null || start <= 0 || end <= 0) return;
    const node = band.querySelector('.atlas-chrono-era-range');
    if (node && !node.querySelector('.e048-ad')) node.appendChild(el('span', 'e048-ad', NNBSP + AD));
  });

  /* E048-03 : l'an zéro astronomique n'existe pas dans le calendrier
     historique ; un repère brut 0 est signalé, jamais converti silencieusement. */
  items.forEach(({ item, card, year }) => {
    if (year !== 0 || !card) return;
    const node = card.querySelector('.event-year');
    if (node && !node.querySelector('.e048-zero')) {
      node.appendChild(el('span', 'e048-zero', `an 0 astronomique = 1 ${BC}`));
    }
  });
  root.querySelectorAll('.era-band[data-start="0"], .era-band[data-end="0"]').forEach((band) => {
    if (band.querySelector('.e048-zero')) return;
    band.appendChild(el('span', 'e048-zero', `an 0 = 1 ${BC}`));
  });

  /* E048-05 : règle d'échelle absolue insérée après la bande de statut, dont
     les bornes sont calculées depuis les data-year réellement rendus. */
  const main = root.querySelector('#atlas-chrono-main');
  if (main) {
    const status = root.querySelector('#atlas-chrono-status');
    const scale = ensureNode('e048-scale', 'div', 'e048-scale', main, status ? status.nextSibling : null);
    scale.textContent = '';
    scale.dataset.e048Min = min === null ? '' : String(min);
    scale.dataset.e048Max = max === null ? '' : String(max);
    scale.appendChild(el('p', 'e048-scale-note', min === null
      ? 'Échelle absolue : aucun repère daté dans cette ère.'
      : `Échelle absolue : ${years.length} repère(s) daté(s), de ${signedLabel(min)} à ${signedLabel(max)}.`));
    const bar = el('div', 'e048-scale-bar');
    bar.setAttribute('aria-hidden', 'true');
    bar.append(el('span', 'e048-scale-side', BC), el('span', 'e048-scale-rule'), el('span', 'e048-scale-side', AD));
    if (min !== null && min <= 0 && max >= 0 && max > min) {
      const tick = el('span', 'e048-scale-zero', '');
      tick.style.setProperty('--e048-zero', `${((0 - min) / (max - min)) * 100}%`);
      bar.querySelector('.e048-scale-rule').appendChild(tick);
    }
    scale.appendChild(bar);
  }

  /* E048-06 : position absolue de chaque repère sur l'échelle du rendu
     courant ; le point est décoratif et donc soustrait aux lecteurs d'écran. */
  items.forEach(({ card, year }) => {
    if (!card || card.querySelector('.e048-pos')) return;
    const marker = el('span', 'e048-pos', '');
    marker.setAttribute('aria-hidden', 'true');
    const ratio = min === null || max === min ? 0.5 : (year - min) / (max - min);
    marker.dataset.e048Segment = year < 0 ? 'bc' : (year === 0 ? 'zero' : 'ad');
    marker.style.setProperty('--e048-pos', `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`);
    card.appendChild(marker);
  });

  /* E048-07 : segment av./ap. J.-C. ajouté aux bandes d'ères, qui ne portent
     que des bornes numériques brutes (chronology.js:288-289). */
  root.querySelectorAll('.era-band[data-start][data-end]').forEach((band) => {
    if (band.querySelector('.e048-era-span')) return;
    const start = toInt(band.dataset.start);
    const end = toInt(band.dataset.end);
    if (start === null || end === null) return;
    let label = AD;
    if (end <= 0) label = BC;
    else if (start < 0) label = `${BC} → ${AD}`;
    band.appendChild(el('span', 'e048-era-span', label));
  });

  /* E048-08 : année absolue parlée, en texte sr-only dans le bouton de carte
     (le search de chronology.js:316 porte déjà sur « une année », mais sa
     haystack de :173 ne prononce jamais le av./ap. J.-C.). */
  items.forEach(({ card, year }) => {
    if (!card || card.querySelector('.e048-sr-year')) return;
    card.appendChild(el('span', 'e048-sr-year', spokenYear(year)));
  });

  /* E048-09 : mesure chiffrée de l'écart avec le repère précédent, lue dans
     le DOM rendu et annoncée dans une région live dédiée. */
  const aside = root.querySelector('#atlas-chrono-aside');
  if (aside) {
    const gap = ensureNode('e048-gap', 'p', 'e048-gap', aside);
    gap.setAttribute('role', 'status');
    gap.setAttribute('aria-live', 'polite');
    gap.setAttribute('aria-atomic', 'true');
    const active = root.querySelector('#atlas-chrono-events .event-card[aria-current="true"]');
    const activeItem = active && active.closest('li[data-year]');
    const index = activeItem ? items.findIndex((entry) => entry.item === activeItem) : -1;
    if (index < 0) {
      gap.textContent = 'Écart non mesurable : aucun repère daté sélectionné.';
    } else if (index === 0) {
      gap.textContent = `Écart non mesurable : premier repère daté (${signedLabel(items[0].year)}).`;
    } else {
      const delta = Math.abs(items[index].year - items[index - 1].year);
      gap.textContent = `Écart avec le repère précédent : ${grouped(delta)} année(s).`;
    }
  }

  /* E048-10 : aucune autre mutation du DOM, aucun écouteur module-level,
     aucun état persistant entre rendus — la coque reconstruit tout (registry.js:28-44). */
});
