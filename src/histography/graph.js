/* Vue Obsidian du récit local : articles = nœuds, mots-clés = liens.
 * Graphe de force D3 local, zéro réseau, déterministe (ordre stable des nœuds). */
import {
  select, forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, drag,
} from '../../public/d3-bundle.js';

const STOP = new Set('le la les de des du un une et ou aux dans pour sur par avec est sont était été qui que quoi dont ce cet cette ces se son sa ses leur leurs il elle ils elles nous vous je tu mes tes nos vos en au au plus moins comme mais ou bien tout tous toute toutes entre chez après avant depuis pendant sans sous dans contre'.split(/\s+/));
const cleanWord = (word) => word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9-]/g, '');

export function keywordsOf(article, max = 3) {
  const counts = new Map();
  for (const raw of (article.extract || '').split(/\W+/)) {
    const word = cleanWord(raw);
    if (word.length < 5 || STOP.has(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
    .slice(0, max).map(([word]) => word);
}

export function createArticleGraph(host, data, { onArticle = () => {} } = {}) {
  host.replaceChildren();
  const articles = data.articles.slice(0, 40);
  const nodes = articles.map((article, index) => ({
    id: `article-${index}`, label: article.title, year: article.year,
    extract: article.extract, url: article.url, type: 'article', index,
  }));
  const keywords = [...new Set(articles.flatMap((article) => keywordsOf(article)))].sort();
  for (const word of keywords) nodes.push({ id: `mot-${word}`, label: word, type: 'keyword' });
  const links = [];
  articles.forEach((article, index) => {
    for (const word of keywordsOf(article)) links.push({ source: `article-${index}`, target: `mot-${word}` });
  });

  const shell = document.createElement('div');
  shell.className = 'article-graph';
  const header = document.createElement('div');
  header.className = 'article-graph-header';
  header.innerHTML = `<h2>${data.meta.title}</h2><p>${articles.length} articles · ${keywords.length} mots-clés</p>`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Graphe des articles Wikipédia et de leurs mots-clés');
  const detail = document.createElement('div');
  detail.className = 'article-graph-detail';
  detail.hidden = true;
  shell.append(header, svg, detail);
  host.appendChild(shell);

  const width = Math.max(320, window.innerWidth - 24);
  const height = Math.max(320, window.innerHeight - 150);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const root = select(svg);
  const linkSel = root.append('g').attr('class', 'graph-links').selectAll('line').data(links).join('line');
  const nodeSel = root.append('g').attr('class', 'graph-nodes').selectAll('g').data(nodes).join('g')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (d) => `${d.label}${d.year ? `, ${d.year}` : ''}`);
  nodeSel.append('circle').attr('r', (d) => (d.type === 'article' ? 14 : 8));
  nodeSel.append('text').attr('text-anchor', 'middle').attr('dy', 3)
    .text((d) => (d.type === 'article' ? String(d.year) : d.label.slice(0, 9)));

  const simulation = forceSimulation(nodes)
    .force('link', forceLink(links).id((d) => d.id).distance(70))
    .force('charge', forceManyBody().strength(-180))
    .force('center', forceCenter(width / 2, height / 2))
    .force('collide', forceCollide(20))
    .on('tick', () => {
      for (const node of nodes) {
        node.x = Math.max(24, Math.min(width - 24, node.x || width / 2));
        node.y = Math.max(24, Math.min(height - 24, node.y || height / 2));
      }
      linkSel.attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y);
      nodeSel.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

  nodeSel.call(drag()
    .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
    .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
    .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

  function show(d) {
    if (d.type !== 'article') { detail.hidden = true; return; }
    detail.replaceChildren();
    const title = document.createElement('h3');
    title.textContent = d.label;
    const meta = document.createElement('p');
    meta.textContent = `${d.year} · Wikipédia FR · CC BY-SA 4.0`;
    const text = document.createElement('p');
    text.textContent = d.extract || '';
    const action = document.createElement('button');
    action.type = 'button';
    action.textContent = 'Ouvrir le récit';
    action.addEventListener('click', () => onArticle({ title: d.label, year: d.year, url: d.url }));
    detail.append(title, meta, text, action);
    detail.hidden = false;
  }
  nodeSel.on('click', (event, d) => show(d)).on('keydown', (event, d) => {
    if (event.key === 'Enter') { event.preventDefault(); show(d); }
  });

  return {
    state: () => ({ articles: articles.length, keywords: keywords.length, links: links.length }),
    destroy() { simulation.stop(); host.replaceChildren(); },
  };
}
