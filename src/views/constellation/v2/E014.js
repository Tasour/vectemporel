import { register } from './registry.js';

/* Lentille V2 E014 — structure sémantique avancée des planètes (repères) de la
   vue Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau, sans source aléatoire et sans minuteur ni boucle propre.
   Préfixe exclusif : v2e014 (aucune collision avec la passe 1). */

const ID = {
  table: 'v2e014-table',
  range: 'v2e014-range',
  index: 'v2e014-index',
  decades: 'v2e014-decades',
  help: 'v2e014-help',
};

/* Liste tolérante : un sélecteur introuvable produit un tableau vide. */
function nodes(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

/* Texte propre, qu'il vienne d'une chaîne ou d'un nœud DOM. */
function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

/* Écriture d'attribut défensive : jamais d'exception sur un nœud incomplet. */
function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

/* Crée un nœud une seule fois par document, puis le laisse en place. */
function ensure(ctx, parent, tag, className, id) {
  let node = null;
  try { node = document.getElementById(id); } catch (error) { node = null; }
  if (!node) {
    node = typeof ctx.el === 'function' ? ctx.el(tag, className, '') : document.createElement(tag);
    node.id = id;
    if (parent && typeof parent.appendChild === 'function') parent.appendChild(node);
  }
  return node;
}

/* Vide un nœud sans dépendre de replaceChildren (DOM partiel toléré). */
function clear(node) {
  if (!node) return;
  while (node.firstChild) node.removeChild(node.firstChild);
}

/* Sépare l'étiquette « année · titre » produite par la vue en deux champs. */
function splitLabel(raw) {
  const parts = String(raw || '').split(' \u00b7 ');
  if (parts.length < 2) return { year: '', title: parts[0].trim() };
  return { year: parts[0].trim(), title: parts.slice(1).join(' \u00b7 ').trim() };
}

/* Direction cardinale déduite des coordonnées déterministes --x/--y. */
function cardinal(x, y) {
  const angle = (Math.atan2(y - 50, x - 50) * 180 / Math.PI + 360) % 360;
  const directions = ['Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest', 'Nord', 'Nord-Est'];
  return directions[Math.round(angle / 45) % 8];
}

register('E014', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique : texte masqué, tableau compact, liens internes visibles
     au focus, marqueur textuel du repère courant et repli mouvement réduit.
     Aucune couleur n'est le seul vecteur d'information. */
  css('constellation-v2-e014', `
.v2e014-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
#${ID.table}{width:100%;border-collapse:collapse;margin:10px 0 0;font-size:9px;line-height:1.4;color:var(--muted-2)}
#${ID.table} caption{text-align:left;padding:0 0 4px;color:var(--muted);font-size:9px}
#${ID.table} th,#${ID.table} td{border-bottom:1px solid var(--line,rgba(244,214,158,.18));padding:2px 4px;text-align:left;vertical-align:top}
#${ID.table} thead th{color:var(--gold);font-weight:600}
#${ID.table} tbody th{font-variant-numeric:tabular-nums;font-weight:600}
#${ID.table} tr[aria-current="true"] td{font-weight:600}
#${ID.range}{margin:10px 0 0;color:var(--gold);font-size:9px;line-height:1.5}
#${ID.index}{margin:10px 0 0;font-size:9px;line-height:1.6}
#${ID.index} ol{margin:2px 0 0;padding:0 0 0 16px}
#${ID.index} a{color:var(--gold-bright);text-decoration:underline;text-underline-offset:2px}
#${ID.index} a:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px;border-radius:2px}
#${ID.decades}{margin:10px 0 0;font-size:9px;line-height:1.5;color:var(--muted-2)}
#${ID.decades} section{margin:0 0 6px}
#${ID.decades} ul{margin:2px 0 0;padding:0 0 0 16px}
.const-planet{position:absolute}
.const-planet[data-v2e014-current="courant"]::after{content:"★ courant";position:absolute;left:50%;top:-13px;transform:translateX(-50%);white-space:nowrap;font-size:8px;color:var(--gold-bright);pointer-events:none}
.v2e014-steady *{transition:none!important}
@media (max-width:620px){#${ID.table} th,#${ID.table} td{padding:2px 3px}}
@media (prefers-reduced-motion:reduce){.v2e014-steady *{transition:none!important}}
`);

  const field = layout.querySelector('.constellation-field');
  if (!field || typeof field.appendChild !== 'function') return;
  const planetLayer = field.querySelector('.const-layer-planets');
  if (!planetLayer) return;
  const planets = nodes(planetLayer, 'button.const-planet');
  if (!planets.length) return;

  const caption = layout.querySelector('.constellation-caption') || field.parentNode || layout;
  const total = planets.length;
  const records = planets.map((planet, index) => {
    const raw = planet.dataset ? txt(planet.dataset.label) : '';
    const parts = splitLabel(raw);
    return {
      planet,
      rank: index + 1,
      label: parts.title || 'Repère sans étiquette',
      year: /^\d{4}$/.test(parts.year) ? parts.year : '',
      active: planet.classList.contains('is-active'),
    };
  });

  /* E014-01 — Tableau de synthèse : légende, en-têtes de colonne et lignes
     numérotées. Structure complémentaire à la liste ordonnée de la passe 1. */
  const table = ensure(ctx, caption, 'table', 'v2e014-table', ID.table);
  clear(table);
  const tableLegend = document.createElement('caption');
  tableLegend.textContent = `Repères de l’ère — ${total} ligne${total > 1 ? 's' : ''}`;
  table.appendChild(tableLegend);
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Rang', 'Année', 'Repère', 'État'].forEach((name) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = name;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  records.forEach((record) => {
    const row = document.createElement('tr');
    if (record.active) put(row, 'aria-current', 'true');
    const rankCell = document.createElement('th');
    rankCell.scope = 'row';
    rankCell.textContent = String(record.rank);
    row.appendChild(rankCell);
    const yearCell = document.createElement('td');
    yearCell.textContent = record.year || '—';
    row.appendChild(yearCell);
    const labelCell = document.createElement('td');
    labelCell.textContent = record.label;
    row.appendChild(labelCell);
    const stateCell = document.createElement('td');
    stateCell.textContent = record.active ? 'Repère courant' : '—';
    row.appendChild(stateCell);
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  /* E014-02 — Orientation cardinale : les coordonnées --x/--y déjà posées
     par la vue donnent une direction textuelle ajoutée au libellé accessible. */
  planets.forEach((planet, index) => {
    const x = parseFloat(planet.style.getPropertyValue('--x'));
    const y = parseFloat(planet.style.getPropertyValue('--y'));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (planet.dataset && planet.dataset.v2e014Orientation) return;
    const direction = cardinal(x, y);
    if (planet.dataset) planet.dataset.v2e014Orientation = direction;
    const label = planet.getAttribute('aria-label') || '';
    if (label.indexOf('orientation') === -1) {
      put(planet, 'aria-label', `${label}, orientation ${direction} (placement décoratif)`);
    }
  });

  /* E014-03 — Le calque reçoit un nom métier et un décompte ajoutés sans
     écraser l'aria-label d'origine ni le rôle de groupe de la passe 1. */
  put(planetLayer, 'aria-roledescription', 'nuage de repères');
  const layerLabel = planetLayer.getAttribute('aria-label') || 'Repères';
  const countText = `${total} repère${total > 1 ? 's' : ''} dans l’ère`;
  if (layerLabel.indexOf(countText) === -1) {
    put(planetLayer, 'aria-label', `${layerLabel} — ${countText}`);
  }

  /* E014-04 — Plage temporelle : deux <time datetime> bornent la période
     couverte, calculée depuis les années réellement présentes dans les libellés. */
  const years = records.map((record) => record.year).filter(Boolean).sort();
  const range = ensure(ctx, caption, 'p', 'v2e014-range', ID.range);
  clear(range);
  if (years.length) {
    range.appendChild(document.createTextNode('Repères de '));
    const from = document.createElement('time');
    from.dateTime = years[0];
    from.textContent = years[0];
    range.appendChild(from);
    range.appendChild(document.createTextNode(' à '));
    const to = document.createElement('time');
    to.dateTime = years[years.length - 1];
    to.textContent = years[years.length - 1];
    range.appendChild(to);
    range.appendChild(document.createTextNode(
      ` — ${years.length} repère${years.length > 1 ? 's' : ''} daté${years.length > 1 ? 's' : ''} sur ${total}.`));
  } else {
    range.textContent = 'Aucune année exploitable dans les étiquettes des repères.';
  }

  /* E014-05 — Index d'ancres internes : chaque bouton reçoit un identifiant
     stable et une <nav> propose des liens fragments locaux, jamais distants. */
  planets.forEach((planet, index) => {
    if (!planet.id) planet.id = `v2e014-planet-${index + 1}`;
  });
  const nav = ensure(ctx, caption, 'nav', 'v2e014-index', ID.index);
  clear(nav);
  put(nav, 'aria-label', 'Index des repères — liens internes');
  const indexList = document.createElement('ol');
  records.forEach((record) => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${record.planet.id}`;
    link.textContent = `${record.rank}. ${record.label}`;
    item.appendChild(link);
    indexList.appendChild(item);
  });
  nav.appendChild(indexList);

  /* E014-06 — Regroupement par décennie : groupes ARIA et liste, dérivés
     des années par tranche de dix, sans toucher aux positions des planètes. */
  const decades = ensure(ctx, caption, 'div', 'v2e014-decades', ID.decades);
  clear(decades);
  const byDecade = new Map();
  records.forEach((record) => {
    if (!record.year) return;
    const decade = `${record.year.slice(0, 3)}0`;
    if (!byDecade.has(decade)) byDecade.set(decade, []);
    byDecade.get(decade).push(record);
  });
  byDecade.forEach((group, decade) => {
    const section = document.createElement('section');
    put(section, 'role', 'group');
    put(section, 'aria-label', `Repères de la décennie ${decade}`);
    const heading = document.createElement('h4');
    heading.className = 'v2e014-sr';
    heading.textContent = `Décennie ${decade} — ${group.length} repère${group.length > 1 ? 's' : ''}`;
    section.appendChild(heading);
    const list = document.createElement('ul');
    group.forEach((record) => {
      const item = document.createElement('li');
      item.textContent = `${record.rank}. ${record.label} (${record.year})`;
      list.appendChild(item);
    });
    section.appendChild(list);
    decades.appendChild(section);
  });

  /* E014-07 — Raccourcis déclarés : les flèches globales changeant de repère
     sont publiées sur chaque planète, sans écraser un jeton déjà présent. */
  planets.forEach((planet) => {
    const tokens = (planet.getAttribute('aria-keyshortcuts') || '').split(/\s+/).filter(Boolean);
    ['ArrowLeft', 'ArrowRight'].forEach((token) => {
      if (tokens.indexOf(token) === -1) tokens.push(token);
    });
    put(planet, 'aria-keyshortcuts', tokens.join(' '));
  });

  /* E014-08 — État du repère courant porté par un attribut et un marqueur
     textuel « ★ courant » : l'information ne repose pas sur la seule couleur. */
  planets.forEach((planet, index) => {
    if (!planet.dataset) return;
    planet.dataset.v2e014Current = records[index].active ? 'courant' : 'autre';
  });

  /* E014-09 — Aide V2 : paragraphe masqué mais réel, ajouté à l'existant
     aria-describedby de la passe 1 sans le remplacer ni le dupliquer. */
  const help = ensure(ctx, layout, 'p', 'v2e014-sr', ID.help);
  help.textContent = 'Structure des repères : le tableau donne rang, année et état ; la plage temporelle résume les années ; l’index propose des liens internes ; les repères sont regroupés par décennie. Les flèches gauche et droite changent de repère.';
  const described = (planetLayer.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (described.indexOf(help.id) === -1) described.push(help.id);
  put(planetLayer, 'aria-describedby', described.join(' '));

  /* E014-10 — Stabilité et mouvement réduit : la classe posée depuis le
     contexte supprime les transitions des structures générées, sans sonde
     propre ni boucle d'animation. */
  let steady = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { steady = !!ctx.reducedMotion(); } catch (error) { steady = false; }
  }
  if (steady) caption.classList.add('v2e014-steady');
  else caption.classList.remove('v2e014-steady');
});
