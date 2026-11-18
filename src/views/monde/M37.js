import { register } from './registry.js';

/* Lentille M37 — Non-invention (domaine D : données & sémantique).
 * Un seul fichier possédé. Le panneau ne restitue que des champs réellement
 * présents dans le contexte (ctx.countries / ctx.selected), recomputés à chaque
 * rendu : aucun fait, chiffre, nom, date, relation ni source n'est fabriqué.
 * Chaque champ absent ou vide produit un état vide explicite, jamais une valeur
 * de comblement. Zéro réseau, zéro aléa, zéro journalisation. */
const CSS_ID = 'monde-m37';
const PANEL_ID = 'monde-m37-garantie';

/* M37-09, M37-10 : feuille unique injectée par ctx.css (cssOnce), sans
 * transition animée sous prefers-reduced-motion, sans dépendance externe. */
const CSS = `
  #${PANEL_ID}{
    position:absolute;top:16px;right:16px;z-index:5;
    width:min(300px,40%);max-height:min(56vh,380px);overflow:hidden;
    padding:10px 12px;pointer-events:none;font:inherit;
    border:1px solid var(--line-strong);border-radius:9px;
    background:rgba(8,11,16,.9);color:var(--ink);
    box-shadow:0 8px 24px rgba(0,0,0,.35);
  }
  #${PANEL_ID} .m37-kicker{
    margin:0 0 4px;color:var(--gold);font-size:9px;font-weight:600;
    letter-spacing:.14em;text-transform:uppercase;
  }
  #${PANEL_ID} .m37-title{
    margin:0 0 6px;color:var(--ink);font-family:var(--serif);
    font-size:15px;font-weight:600;line-height:1.2;
  }
  #${PANEL_ID} .m37-grid{
    display:grid;grid-template-columns:1fr auto;gap:2px 10px;margin:0;
    font-size:11px;
  }
  #${PANEL_ID} .m37-grid dt{color:var(--muted)}
  #${PANEL_ID} .m37-grid dd{
    margin:0;color:var(--ink);font-variant-numeric:tabular-nums;text-align:right;
  }
  #${PANEL_ID} .m37-row{margin:6px 0 0;color:var(--muted);font-size:10px;line-height:1.35}
  #${PANEL_ID} .m37-row strong{color:var(--gold-bright);font-weight:600}
  #${PANEL_ID} .m37-empty{font-style:italic}
  @media (max-width:700px){
    #${PANEL_ID}{top:8px;right:8px;width:min(260px,60%);padding:8px 10px}
  }
  @media (prefers-reduced-motion:reduce){#${PANEL_ID}{box-shadow:none}}
`;

/* M37-07 : seuls les tableaux sont comptés ; toute autre forme vaut 0.
   Aucun NaN, aucun « undefined », aucun « [object Object] » ne peut atteindre
   le DOM : text() ne laisse passer qu'une chaîne ou un nombre fini. */
function count(list) {
  return Array.isArray(list) ? list.length : 0;
}

function asText(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

/* M37-03 : le verdict n'est lu que s'il existe réellement ; « pending » est
   affiché tel quel, un verdict absent devient « non renseigné ». */
function verdictOf(country) {
  const audit = country && typeof country.audit === 'object' && country.audit !== null
    ? country.audit : null;
  return audit ? asText(audit.verdict) : '';
}

/* M37-02 : la distribution de confiance est dérivée des seules valeurs
   présentes dans points[].confidence. Aucune catégorie n'est ajoutée, aucune
   traduction n'est inventée ; l'ordre est déterministe (décroissant, puis
   alphabétique), donc reproductible. */
function confidenceTally(countries) {
  const tally = new Map();
  for (const country of countries) {
    const points = country && Array.isArray(country.points) ? country.points : [];
    for (const point of points) {
      const key = point && typeof point === 'object' ? asText(point.confidence) : '';
      if (!key) continue;
      tally.set(key, (tally.get(key) || 0) + 1);
    }
  }
  return [...tally.entries()].sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0], 'fr'));
}

function verdictTally(countries) {
  const tally = new Map();
  for (const country of countries) {
    const key = verdictOf(country);
    if (!key) continue;
    tally.set(key, (tally.get(key) || 0) + 1);
  }
  return [...tally.entries()].sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0], 'fr'));
}

function sumField(countries, key) {
  let total = 0;
  for (const country of countries) total += count(country && country[key]);
  return total;
}

/* M37-04 : seuls les identifiants réels de sources[] sont repris ; aucune URL
   n'est construite, aucun titre n'est supposé, aucune source n'est suggérée. */
function sourceIds(country) {
  const sources = country && Array.isArray(country.sources) ? country.sources : [];
  const ids = [];
  for (const source of sources) {
    const id = source && typeof source === 'object' ? asText(source.id) : '';
    if (id) ids.push(id);
  }
  return ids;
}

function build(ctx) {
  const root = ctx.el('div', 'm37-garantie');
  root.id = PANEL_ID;
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Garantie de non-invention — données réellement présentes');
  const kicker = ctx.el('p', 'm37-kicker', 'Non-invention · données vérifiables');
  const title = ctx.el('p', 'm37-title', '');
  const grid = ctx.el('dl', 'm37-grid');
  const conf = ctx.el('p', 'm37-row m37-conf');
  const verdict = ctx.el('p', 'm37-row m37-verdict');
  const sources = ctx.el('p', 'm37-row m37-sources');
  root.append(kicker, title, grid, conf, verdict, sources);
  return root;
}

function addStat(grid, ctx, label, value) {
  grid.append(ctx.el('dt', '', label), ctx.el('dd', '', value));
}

/* M37-01, M37-05, M37-06 : toute écriture passe par textContent ; le nœud est
   retrouvé à chaque appel (les rappels du registre survivent aux rendus). */
function render(country, countries, ctx) {
  const node = document.getElementById(PANEL_ID);
  if (!node) return;
  const titleNode = node.querySelector('.m37-title');
  const grid = node.querySelector('.m37-grid');
  const confNode = node.querySelector('.m37-conf');
  const verdictNode = node.querySelector('.m37-verdict');
  const sourcesNode = node.querySelector('.m37-sources');
  if (!titleNode || !grid || !confNode || !verdictNode || !sourcesNode) return;

  const list = Array.isArray(countries) ? countries : [];
  const one = country && typeof country === 'object' ? country : null;
  const aggregate = !one;
  node.dataset.state = aggregate ? 'aggregate'
    : (count(one.events) || count(one.points) ? 'active' : 'empty');

  titleNode.textContent = aggregate
    ? `Vue d’ensemble · ${list.length} pays`
    : (asText(one.name) || 'Pays sans nom');
  const scope = one ? [one] : list;

  grid.replaceChildren();
  addStat(grid, ctx, 'Pays', String(aggregate ? list.length : 1));
  addStat(grid, ctx, 'Ères', String(aggregate ? sumField(scope, 'eras') : count(one.eras)));
  addStat(grid, ctx, 'Repères', String(aggregate ? sumField(scope, 'events') : count(one.events)));
  addStat(grid, ctx, 'Points', String(aggregate ? sumField(scope, 'points') : count(one.points)));
  addStat(grid, ctx, 'Sources', String(aggregate ? sumField(scope, 'sources') : count(one.sources)));
  addStat(grid, ctx, 'Claims', String(aggregate ? sumField(scope, 'claims') : count(one.claims)));
  addStat(grid, ctx, 'Omissions', String(aggregate ? sumField(scope, 'omissions') : count(one.omissions)));

  confNode.replaceChildren();
  confNode.append(ctx.el('strong', '', 'Confiance déclarée : '));
  const confidences = confidenceTally(scope);
  confNode.append(ctx.el('span', confidences.length ? '' : 'm37-empty',
    confidences.length ? confidences.map(([key, n]) => `${key} ${n}`).join(' · ') : 'non renseignée'));

  verdictNode.replaceChildren();
  verdictNode.append(ctx.el('strong', '', 'Verdict d’audit : '));
  if (aggregate) {
    const verdicts = verdictTally(list);
    verdictNode.append(ctx.el('span', verdicts.length ? '' : 'm37-empty',
      verdicts.length ? verdicts.map(([key, n]) => `${key} ${n}`).join(' · ') : 'non renseigné'));
  } else {
    const verdict = verdictOf(one);
    verdictNode.append(ctx.el('span', verdict ? '' : 'm37-empty', verdict || 'non renseigné'));
  }

  sourcesNode.replaceChildren();
  sourcesNode.append(ctx.el('strong', '', 'Sources : '));
  if (aggregate) {
    const total = sumField(list, 'sources');
    sourcesNode.append(ctx.el('span', total ? '' : 'm37-empty',
      total ? `${total} références dans le corpus` : 'aucune référence'));
  } else {
    const ids = sourceIds(one);
    if (ids.length) {
      sourcesNode.append(ctx.el('span', '', ids.slice(0, 3).join(', ')));
      if (ids.length > 3) sourcesNode.append(ctx.el('span', '', ` · +${ids.length - 3}`));
    } else {
      sourcesNode.append(ctx.el('span', 'm37-empty', 'aucune référence renseignée'));
    }
  }
}

let latest = null;
let subscribed = false;

register('M37', (ctx) => {
  if (!ctx || !ctx.scene) return;
  latest = ctx;
  ctx.css(CSS_ID, CSS);

  /* M37-08 : ID unique et garde d'existence ; la coque est vidée à chaque rendu
     (shell.js:533), ce qui détache l'ancien panneau : un seul reste vivant. */
  if (!document.getElementById(PANEL_ID)) ctx.scene.appendChild(build(ctx));
  render(latest.selected || null, latest.countries, ctx);

  /* M37-08 : le registre ne purge jamais ses tableaux de rappels ; un seul
     abonnement M37 est enregistré, et il relit le ctx courant via latest. */
  if (!subscribed) {
    subscribed = true;
    ctx.onHover(({ country } = {}) => {
      const current = latest || ctx;
      render(country || current.selected || null, current.countries, current);
    });
    ctx.onLeave(() => {
      const current = latest || ctx;
      render(current.selected || null, current.countries, current);
    });
  }
});
