/* Lentille E23 — recherche dans la chronologie : 10 améliorations. */
import { register } from './registry.js';

const ID = 'chronology-e23';

const RULES = `
  #${ID}-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0}
  #${ID}-input{flex:1 1 220px;min-height:36px;padding:8px 10px;
    border:1px solid var(--line);border-radius:6px;color:var(--ink);background:var(--panel)}
  #${ID}-input:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
  #${ID}-count{font-size:12px;color:var(--ink-soft);font-variant-numeric:tabular-nums}
  #${ID}-empty{padding:10px 12px;border-left:3px solid var(--gold);background:rgba(230,185,111,.08)}
  #${ID}-chip{display:inline-block;padding:2px 6px;margin:0 4px 4px 0;border-radius:4px;
    border:1px solid var(--line);font-size:11px}
  @media (max-width:620px){#${ID}-bar{flex-direction:column;align-items:stretch}}
  @media (prefers-reduced-motion:reduce){#${ID}-bar *{transition:none}}
`;

register('E23', (ctx) => {
  if (typeof ctx.css === 'function') ctx.css(ID, RULES);
  const main = ctx.layout && ctx.layout.querySelector('.chronology-main');
  if (!main || document.getElementById(`${ID}-bar`)) return;

  const input = ctx.el('input', 'chronology-e23-input');
  input.id = `${ID}-input`;
  input.type = 'search';
  input.placeholder = 'Filtrer les repères affichés (nom, année, ère)';
  input.setAttribute('aria-label', 'Rechercher dans la chronologie affichée');
  input.setAttribute('autocomplete', 'off');

  const count = ctx.el('span', 'chronology-e23-count');
  count.id = `${ID}-count`;
  count.setAttribute('aria-hidden', 'true');

  const bar = ctx.el('div', 'chronology-e23-bar');
  bar.id = `${ID}-bar`;
  bar.append(input, count);

  const empty = ctx.el('p', 'chronology-e23-empty');
  empty.id = `${ID}-empty`;
  empty.hidden = true;

  const anchor = main.querySelector('[id*="search"], .chronology-tools, h2');
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(bar, anchor);
  else main.prepend(bar);
  main.appendChild(empty);

  const cards = () => [...main.querySelectorAll('.event-card, li[data-event-id]')];
  const refresh = () => {
    const q = input.value.trim().toLocaleLowerCase('fr');
    let shown = 0;
    cards().forEach((card) => {
      const hay = (card.textContent || '').toLocaleLowerCase('fr');
      const hit = !q || hay.includes(q);
      card.hidden = !hit;
      if (hit) shown += 1;
    });
    count.textContent = `${shown} repère${shown > 1 ? 's' : ''} affiché${shown > 1 ? 's' : ''}`;
    empty.hidden = shown !== 0 || !q;
    if (shown === 0) empty.textContent = `Aucun repère ne contient « ${input.value.trim()} ». Effacez le champ pour revenir à la vue complète.`;
  };

  input.addEventListener('input', refresh);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && input.value) {
      input.value = '';
      refresh();
    }
  });
  refresh();
});
