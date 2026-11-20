import { register } from './registry.js';

/* E057 — infobulles et descriptions détaillées des événements.
   Lentille autonome, en lecture seule sur le DOM de la chronologie : elle
   n'importe aucun autre module de la vue, n'écrit aucun fichier partagé et ne
   modifie ni le store ni le rendu de base. Tout ce qu'elle affiche est tiré
   des textes et des attributs déjà présents dans la page ; aucune donnée
   historique n'est inventée. Invariants : un seul enregistrement, un seul
   bloc de styles, des identifiants préfixés e057 protégés par des gardes
   d'existence, aucun appel réseau, aucun aléa, aucune journalisation, aucun
   timer ni boucle d'animation propre au greffon. Français partout. */

const CSS_ID = 'chronology-e057';
const TIP_ID = 'e057-tooltip';
const DETAIL_ID = 'e057-detail';
const BODY_ID = 'e057-detail-body';
const READOUT_ID = 'e057-readout';
const HINT_ID = 'e057-hint';

/* E057-01 — bloc CSS unique, injecté par ctx.css (qui possède sa propre
   garde par identifiant). Aucune règle de styles.css n'est modifiée. */
const CSS = `
.e057-tooltip {
  position:fixed; z-index:60; max-width:min(340px,calc(100vw - 24px));
  margin:0; padding:8px 10px; border:1px solid var(--line-strong); border-radius:8px;
  background:rgba(8,11,16,.97); color:var(--ink-soft);
  box-shadow:0 8px 24px rgba(0,0,0,.5); font-size:11px; line-height:1.45;
  pointer-events:none; transition:opacity .12s ease;
}
.e057-tooltip[hidden] { display:none; }
.e057-tooltip.e057-reduced { transition:none; }
.e057-tooltip-main { margin:0 0 4px; color:var(--ink); font-family:var(--serif); font-size:12px; }
.e057-tooltip-meta { margin:0; color:var(--muted); font-size:9px; font-variant-numeric:tabular-nums; }
.e057-tooltip-hint { margin:5px 0 0; color:var(--gold); font-size:8px; }
.e057-hint { margin:0 0 12px; color:var(--muted-2); font-size:8px; line-height:1.5; }
.e057-detail { margin-top:14px; padding-top:8px; border-top:1px solid var(--line); }
.e057-detail-summary { min-height:36px; padding:6px 0; color:var(--gold-bright); font-size:10px; cursor:pointer; }
.e057-detail-summary:focus-visible { outline:2px solid var(--gold-bright); outline-offset:2px; }
.e057-detail-body { padding-top:4px; }
.e057-detail-lede { margin:0 0 8px; color:var(--ink-soft); font-family:var(--serif); font-size:11px; line-height:1.55; }
.e057-detail-points { margin:0; padding-left:18px; }
.e057-detail-points > li { margin:0 0 8px; color:var(--ink-soft); font-size:10px; line-height:1.5; }
.e057-detail-source { margin:2px 0 0; color:var(--muted-2); font-size:8px; }
.e057-readout { margin:8px 0 0; color:var(--muted); font-size:9px; line-height:1.5; }
.e057-point[tabindex="0"] { cursor:help; }
.e057-point:focus-visible { outline:2px solid var(--gold-bright); outline-offset:2px; }
@media (max-width:620px) {
  .e057-tooltip { max-width:calc(100vw - 16px); font-size:10px; }
}
@media (prefers-reduced-motion:reduce) {
  .e057-tooltip { transition:none !important; }
}`;

/* Fonctions de création et de mouvement réduit substituables à chaque rendu
   par celles fournies dans ctx ; les replis locaux garantissent que les
   écouteurs délégués, installés une seule fois, restent fonctionnels. */
let create = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};
let prefersReduced = () => false;
let hooksInstalled = false;

function formatYear(raw) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return raw == null ? '' : String(raw);
  return value < 0 ? `${Math.abs(value)} av. J.-C.` : String(value);
}

function shorten(text, limit) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length > limit ? `${clean.slice(0, limit - 1)}…` : clean;
}

/* E057-02 — nœud d'infobulle unique, créé dans <body> pour survivre au
   innerHTML de la coque ; role=tooltip et attribut hidden (jamais
   aria-hidden, afin que aria-describedby puisse réellement l'annoncer). */
function ensureTooltip() {
  let tip = document.getElementById(TIP_ID);
  if (!tip) {
    tip = create('div', 'e057-tooltip');
    tip.id = TIP_ID;
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;
    document.body.appendChild(tip);
  }
  tip.classList.toggle('e057-reduced', Boolean(prefersReduced()));
  return tip;
}

function hoverable(target) {
  if (!target || typeof target.closest !== 'function') return null;
  const node = target.closest('.event-card, .e057-point');
  return node && node.closest('.chronology-layout') ? node : null;
}

/* E057-04 — lecture des seules données réelles de la carte : millésime,
   titre, sous-titre, ère, importance et thèmes. */
function cardData(card) {
  const item = card.closest('li');
  const year = card.querySelector('.event-year')?.textContent?.trim()
    || (item?.dataset.year ? formatYear(item.dataset.year) : '');
  const title = card.querySelector('strong')?.textContent?.trim() || '';
  const subtitle = card.querySelector('.event-subtitle')?.textContent?.trim() || '';
  const era = card.querySelector('.atlas-chrono-card-era')?.textContent?.trim()
    || item?.dataset.eraId || '';
  const importance = item?.dataset.importance || '';
  const tags = item?.dataset.tags ? item.dataset.tags.split(/\s+/).filter(Boolean) : [];
  return { id: card.dataset.eventId || '', year, title, subtitle, era, importance, tags };
}

function pointData(point) {
  const head = shorten(point.querySelector('.point-head')?.textContent || 'Point', 120);
  const text = shorten(point.querySelector('p')?.textContent || '', 320);
  return { head, text };
}

function tooltipLines(target) {
  if (target.classList.contains('event-card')) {
    const data = cardData(target);
    const lead = [data.year, data.title, data.subtitle].filter(Boolean).join(' — ');
    const meta = [];
    if (data.era) meta.push(`Ère : ${data.era}`);
    if (data.importance) meta.push(`Importance : ${data.importance}`);
    if (data.tags.length) meta.push(`Thèmes : ${data.tags.join(', ')}`);
    return {
      owner: data.id,
      lead: lead || 'Repère sans intitulé',
      meta: meta.join(' · '),
      hint: 'Description détaillée : ouvrez la fiche du repère.',
    };
  }
  const data = pointData(target);
  return {
    owner: target.dataset.pointId || '',
    lead: data.head,
    meta: data.text,
    hint: 'Texte intégral et sources : fiche du repère, description détaillée.',
  };
}

function hideTip(target) {
  const tip = document.getElementById(TIP_ID);
  if (tip) {
    tip.hidden = true;
    delete tip.dataset.e057Owner;
  }
  if (target && target.getAttribute?.('aria-describedby') === TIP_ID) {
    target.removeAttribute('aria-describedby');
  }
}

/* E057-06 — positionnement au plus près de la cible, borné à la fenêtre,
   avec bascule sous la cible si la place manque au-dessus. L'infobulle est
   non interactive (pointer-events:none) : elle n'intercepte jamais le clic
   du repère ni du point. */
function showTip(target) {
  const tip = ensureTooltip();
  const lines = tooltipLines(target);
  tip.replaceChildren();
  tip.appendChild(create('p', 'e057-tooltip-main', lines.lead));
  if (lines.meta) tip.appendChild(create('p', 'e057-tooltip-meta', lines.meta));
  tip.appendChild(create('p', 'e057-tooltip-hint', lines.hint));
  tip.hidden = false;
  tip.dataset.e057Owner = lines.owner;
  target.setAttribute('aria-describedby', TIP_ID);

  const box = target.getBoundingClientRect();
  const size = tip.getBoundingClientRect();
  const margin = 8;
  let left = box.left + box.width / 2 - size.width / 2;
  let top = box.top - size.height - margin;
  if (top < margin) top = box.bottom + margin;
  left = Math.max(margin, Math.min(left, window.innerWidth - size.width - margin));
  top = Math.max(margin, Math.min(top, window.innerHeight - size.height - margin));
  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(top)}px`;
}

/* E057-03 — écouteurs délégués uniques sur le document, donc insensibles à
   la reconstruction complète du DOM à chaque rendu. Le contrôle de
   filiation évite d'agripper un élément sorti de la vue chronologie et le
   contrôle de relatedTarget évite de masquer lors d'un mouvement interne. */
function onOver(event) {
  const target = hoverable(event.target);
  if (!target) return;
  if (event.relatedTarget && target.contains(event.relatedTarget)) return;
  showTip(target);
}

function onOut(event) {
  const target = hoverable(event.target);
  if (!target) return;
  if (event.relatedTarget && target.contains(event.relatedTarget)) return;
  hideTip(target);
}

function onFocusIn(event) {
  const target = hoverable(event.target);
  if (target) showTip(target);
}

function onFocusOut(event) {
  const target = hoverable(event.target);
  if (target) hideTip(target);
}

function ensureHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;
  document.addEventListener('mouseover', onOver);
  document.addEventListener('mouseout', onOut);
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);
}

/* E057-05 — description détaillée en texte long, visible et indexable,
   portée par un <details> natif : l'ouverture fonctionne au clavier sans
   le greffon. Le contenu est assemblé depuis le résumé, les points et les
   sources déjà rendus dans la fiche du repère. */
function detailKey(aside) {
  const title = aside.querySelector('#atlas-chrono-event-title')?.textContent || '';
  const year = aside.querySelector('.aside-year')?.textContent || '';
  const count = aside.querySelectorAll('.point').length;
  return `${title}|${year}|${count}`;
}

function fillDetail(details, aside) {
  let body = document.getElementById(BODY_ID);
  if (!body || !details.contains(body)) {
    body = create('div', 'e057-detail-body');
    body.id = BODY_ID;
    details.appendChild(body);
  }
  body.replaceChildren();

  const summary = aside.querySelector('.aside-summary')?.textContent?.trim() || '';
  if (summary) body.appendChild(create('p', 'e057-detail-lede', summary));

  const points = [...aside.querySelectorAll('.point')];
  if (points.length) {
    const list = create('ol', 'e057-detail-points');
    points.forEach((point) => {
      const li = create('li', 'e057-detail-point');
      const text = point.querySelector('p')?.textContent?.trim() || '';
      if (text) li.appendChild(create('p', '', text));
      const head = shorten(point.querySelector('.point-head')?.textContent || '', 160);
      const sources = [...point.querySelectorAll('.point-sources li')]
        .map((node) => node.textContent.trim()).filter(Boolean);
      const parts = [head, ...sources].filter(Boolean);
      if (parts.length) li.appendChild(create('p', 'e057-detail-source', parts.join(' · ')));
      list.appendChild(li);
    });
    body.appendChild(list);
  }

  const sourceCount = aside.querySelectorAll('.point-sources li').length;
  let readout = document.getElementById(READOUT_ID);
  if (!readout || !body.contains(readout)) {
    readout = create('p', 'e057-readout');
    readout.id = READOUT_ID;
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');
    readout.setAttribute('aria-atomic', 'true');
    body.appendChild(readout);
  }
  readout.textContent = `Description détaillée : ${points.length} point(s), ${sourceCount} source(s) citée(s). Le texte intégral est reproduit ci-dessus, sans lien externe.`;
  details.dataset.e057Points = String(points.length);
  details.dataset.e057Sources = String(sourceCount);
}

function ensureDetail(aside) {
  if (!aside) return null;
  const title = aside.querySelector('#atlas-chrono-event-title');
  if (!title) return null;

  let details = document.getElementById(DETAIL_ID);
  if (details && !details.isConnected) details = null;
  if (!details) {
    details = create('details', 'e057-detail');
    details.id = DETAIL_ID;
    details.appendChild(create('summary', 'e057-detail-summary', 'Description détaillée du repère'));
    aside.appendChild(details);
  } else if (details.parentElement !== aside) {
    aside.appendChild(details);
  }

  const key = detailKey(aside);
  if (details.dataset.e057Key !== key) {
    details.dataset.e057Key = key;
    fillDetail(details, aside);
  }
  return details;
}

/* E057-07 — les points deviennent parcourables au clavier et reçoivent un
   libellé unique construit à partir de leur rang, de leur nature et de leur
   texte réel ; l'infobulle de point reste purement complémentaire. */
function enhancePoints(aside) {
  if (!aside) return;
  const points = [...aside.querySelectorAll('.point')];
  points.forEach((point, index) => {
    point.classList.add('e057-point');
    if (!point.hasAttribute('tabindex')) point.setAttribute('tabindex', '0');
    const data = pointData(point);
    const label = `${index + 1}. ${data.head}${data.text ? ` : ${data.text}` : ''}`;
    point.setAttribute('aria-label', shorten(label, 420));
  });
}

/* E057-08 — ligne d'aide visible, unique, qui rend l'infobulle découvrable
   et rappelle où se trouve le texte long (jamais une information portée par
   la seule couleur). */
function ensureHint(layout) {
  const main = layout?.querySelector('.chronology-main') || document.getElementById('atlas-chrono-main');
  if (!main || document.getElementById(HINT_ID)) return;
  const hint = create('p', 'e057-hint',
    'Infobulles : survolez ou parcourez au clavier un repère ou un point. La description détaillée figure dans la fiche du repère, en fin de colonne.');
  hint.id = HINT_ID;
  const anchor = main.querySelector('.atlas-chrono-hint');
  if (anchor) anchor.after(hint);
  else main.prepend(hint);
}

function install(ctx) {
  if (!ctx) return;
  if (ctx.viewId !== undefined && ctx.viewId !== 'chronology') return;

  /* E057-09 — ctx.reducedMotion() est relu à chaque rendu ; le style
     média préférences complète le repli. Aucun timer, aucune boucle
     d'animation, aucune requête réseau, aucun aléa, aucune journalisation. */
  create = ctx.el || create;
  prefersReduced = ctx.reducedMotion || prefersReduced;

  ctx.css(CSS_ID, CSS);

  const layout = ctx.layout && ctx.layout.isConnected ? ctx.layout : null;
  const aside = layout?.querySelector('.chronology-aside')
    || document.getElementById('atlas-chrono-aside');

  ensureHint(layout);
  enhancePoints(aside);
  ensureDetail(aside);
  ensureHooks();

  /* E057-10 — gardes multi-rendus : si le repère qui portait l'infobulle a
     disparu, on la masque ; si le focus est resté sur une carte recréée, on
     régénère son contenu depuis le DOM courant. */
  const tip = document.getElementById(TIP_ID);
  if (tip && !tip.hidden) {
    const owner = tip.dataset.e057Owner;
    if (owner && !document.getElementById(`event-btn-${owner}`)) hideTip(null);
  }
  const active = document.activeElement;
  if (active && active.classList?.contains('event-card') && active.closest('.chronology-layout')) {
    showTip(active);
  }
}

register('E057', install);
