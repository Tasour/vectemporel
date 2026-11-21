import { register } from './registry.js';

/* Lentille M32 — Noms et libellés des pays (domaine D : données & sémantique).
 * Dix chantiers M32-01 … M32-10, tous implémentés dans ce module.
 *
 * Lectures seules : src/data/dataset.js, src/views/globe.js, styles.css,
 * src/views/globe-reveal.js, src/views/monde/registry.js, src/views/monde/M17.js.
 *
 * Aucune donnée historique inventée : noms, identifiants (id, code) et
 * compteurs (ères, repères, points) sont lus dans ctx.countries, c'est-à-dire
 * dans le dataset généré. Tout le reste est déduit du DOM courant. Zéro réseau,
 * zéro Math.random, aucun console.*, aucun fichier partagé modifié.
 */

const CSS_ID = 'monde-m32';
const PANEL_ID = 'monde-m32-panel';
const SUMMARY_ID = 'monde-m32-summary';
const ROWS_ID = 'monde-m32-rows';
const VERDICT_ID = 'monde-m32-verdict';

/* M32-02, 05, 10 : feuille unique injectée par ctx.css (cssOnce). Le panneau
   est ancré en haut à droite, sous le readout du HUD (styles.css:130-137) et
   à l'opposé des commandes (styles.css:150-152) et de la légende M17. */
const CSS = `
  #${PANEL_ID}{
    position:absolute;right:16px;top:72px;z-index:6;
    width:min(320px,46%);max-height:52%;overflow:auto;
    border:1px solid var(--line);border-radius:9px;
    background:rgba(8,11,16,.94);color:var(--ink-soft);
    font-size:11px;line-height:1.45;font-variant-numeric:tabular-nums;
  }
  #${PANEL_ID} > summary{min-height:28px;padding:7px 10px;cursor:pointer;color:var(--gold)}
  #${PANEL_ID}[open] > summary{border-bottom:1px solid var(--line)}
  .m32-body{padding:8px 10px 10px}
  #monde-m32-table{width:100%;border-collapse:collapse;table-layout:fixed}
  #monde-m32-table caption{padding:0 0 6px;text-align:left;color:var(--muted)}
  #monde-m32-table th,#monde-m32-table td{
    padding:4px 2px;border-top:1px solid var(--line);
    vertical-align:top;overflow-wrap:anywhere;
  }
  #monde-m32-table thead th{color:var(--muted);font-weight:600;text-align:left}
  #monde-m32-table td.m32-mark{width:34px;text-align:center;color:var(--gold-bright)}
  #${VERDICT_ID}{margin:6px 0 0;color:var(--gold-bright)}
  .m32-note{margin:6px 0 0;color:var(--muted)}
  @media (max-width:900px){
    #${PANEL_ID}{right:8px;top:64px;width:min(300px,calc(100% - 16px));max-height:38%}
  }
`;

function count(list) {
  return Array.isArray(list) ? list.length : 0;
}

/* M32-03 : nom accessible calculé comme un lecteur d'écran le ferait :
   on exclut les sous-arbres aria-hidden (numéro et drapeau dans globe.js:406-407)
   et les nœuds hidden, puis on normalise les espaces. */
function accessibleText(node) {
  if (!node) return '';
  let out = '';
  const walk = (current) => {
    if (current.nodeType === 3) {
      out += current.nodeValue;
      return;
    }
    if (current.nodeType !== 1) return;
    if (current.getAttribute && current.getAttribute('aria-hidden') === 'true') return;
    if (current.hidden) return;
    for (const child of current.childNodes) walk(child);
  };
  walk(node);
  return out.replace(/\s+/g, ' ').trim();
}

function buildPanel(el) {
  const panel = el('details', 'monde-m32-panel');
  panel.id = PANEL_ID;
  panel.dataset.monde = 'M32';

  const summary = el('summary');
  summary.appendChild(el('span', null, 'Noms & libellés · '));
  const summaryText = el('span', null, 'contrôles en cours');
  summaryText.id = SUMMARY_ID;
  summary.appendChild(summaryText);

  const body = el('div', 'm32-body');
  const table = el('table');
  table.id = 'monde-m32-table';
  table.append(el('caption', null, 'Catalogue des libellés — valeurs lues dans ctx.countries (dataset.js)'));

  const thead = el('thead');
  const headRow = el('tr');
  ['Nom (dataset)', 'id', 'code', 'È/R/P', 'DOM'].forEach((label) => {
    const th = el('th', null, label);
    th.scope = 'col';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  const tbody = el('tbody');
  tbody.id = ROWS_ID;
  table.append(thead, tbody);

  const verdict = el('p', null, 'Contrôles en cours…');
  verdict.id = VERDICT_ID;

  const note = el('p', 'm32-note',
    'Noms, id, codes et compteurs : valeurs exactes du dataset. Les contrôles DOM sont recalculés à chaque rendu. Le décalage id/code éventuel est documenté, jamais corrigé ici (dataset en lecture seule).');

  body.append(table, verdict, note);
  panel.append(summary, body);
  return panel;
}

function addRow(el, tbody, cells, mark) {
  const tr = el('tr');
  cells.forEach((value) => { tr.appendChild(el('td', null, String(value))); });
  tr.appendChild(el('td', 'm32-mark', mark));
  tbody.appendChild(tr);
}

/* M32-01 à M32-09 : toutes les vérifications sont dérivées de ctx.countries
   et du DOM réellement rendu (#globe-choices, .globe-here, #globe-title). */
function refresh(panel, ctx, countries, el) {
  const choices = document.getElementById('globe-choices');
  const buttons = choices ? Array.from(choices.querySelectorAll('button.globe-country')) : [];
  const byIndex = new Map();
  buttons.forEach((button) => {
    const index = Number(button.dataset.index);
    if (Number.isInteger(index)) byIndex.set(index, button);
  });

  /* M32-05 : même collation que globe.js:395 (localeCompare français). */
  const expected = countries
    .map((country, index) => ({ country, index }))
    .sort((a, b) => String(a.country.name).localeCompare(String(b.country.name), 'fr'));

  const tbody = panel.querySelector('#' + ROWS_ID);
  while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

  let graphyOk = true;
  let titleCount = 0;
  let accessibleOk = true;
  let textOnlyOk = true;
  const divergences = [];

  countries.forEach((country, index) => {
    const name = String(country.name || '');
    const button = byIndex.get(index) || null;
    const nameNode = button ? button.querySelector('.globe-country-name') : null;
    const domName = nameNode ? nameNode.textContent : '';

    /* M32-01 : graphie exacte du nom propre (diacritiques, trait d'union). */
    const same = !!nameNode && domName === name;
    if (!same) graphyOk = false;

    /* M32-02 : le libellé visible peut être tronqué par ellipsis
       (styles.css:188) ; le titre natif porte le nom complet. */
    if (nameNode && nameNode.getAttribute('title') !== name) nameNode.setAttribute('title', name);
    if (nameNode && nameNode.getAttribute('title') === name) titleCount += 1;

    /* M32-03 : le nom accessible commence par le nom du pays. */
    const accessible = accessibleText(button);
    const startsWithName = !!name && accessible.indexOf(name) === 0;
    if (!startsWithName) accessibleOk = false;

    /* M32-07 : le texte seul identifie le pays, sans drapeau ni couleur. */
    const flag = button ? button.querySelector('.globe-country-flag') : null;
    const flagHidden = !!flag && flag.getAttribute('aria-hidden') === 'true';
    const textBearing = !!nameNode && domName.length > 0 && flagHidden;
    if (!textBearing) textOnlyOk = false;

    /* M32-04 : seul un id court (2 lettres) peut diverger du code ISO. */
    const id = String(country.id || '');
    const code = String(country.code || '');
    if (id.length === 2 && id.toUpperCase() !== code) divergences.push(id + ' → ' + code);

    addRow(
      el, tbody,
      [name, id, code, `${count(country.eras)}/${count(country.events)}/${count(country.points)}`],
      same ? '✓' : '⚠',
    );
  });

  /* M32-05 : ordre réel des boutons contre ordre attendu. */
  const domSequence = buttons.map((button) => Number(button.dataset.index)).filter(Number.isInteger);
  const expectedSequence = expected.map((entry) => entry.index);
  const orderOk = domSequence.length === expectedSequence.length
    && domSequence.every((value, i) => value === expectedSequence[i]);

  /* M32-06 : unicité des libellés et des codes. */
  const uniqueOk = new Set(countries.map((c) => String(c.name))).size === countries.length
    && new Set(countries.map((c) => String(c.code))).size === countries.length;

  /* M32-08 : titre unique et libellé de sélection aligné sur host.dataset. */
  const headings = document.querySelectorAll('.globe-list h1');
  const h1Ok = headings.length === 1 && headings[0].textContent.trim() === 'Choisir un pays';
  const selectedCode = (ctx.host && ctx.host.dataset.globeSelected) || '';
  const selected = countries.find((c) => String(c.code) === selectedCode) || null;
  const here = document.querySelector('.globe-here');
  const hereText = here ? here.textContent.trim() : '';
  const selectedOk = !!here && (selected
    ? hereText.indexOf(String(selected.name)) !== -1
    : /Aucun pays/i.test(hereText));

  /* M32-09 : un bouton par pays, aucun de plus. */
  const countOk = buttons.length === countries.length;

  const checks = {
    graphy: graphyOk,
    title: countries.length > 0 && titleCount === countries.length,
    accessible: accessibleOk,
    order: orderOk,
    unique: uniqueOk,
    textOnly: textOnlyOk,
    labels: h1Ok && selectedOk,
    count: countOk,
  };
  const keys = Object.keys(checks);
  const okCount = keys.filter((key) => checks[key]).length;
  keys.forEach((key) => { panel.dataset['m32' + key.charAt(0).toUpperCase() + key.slice(1)] = checks[key] ? 'ok' : 'divergent'; });
  panel.dataset.m32Rows = String(countries.length);
  panel.dataset.m32Divergences = String(divergences.length);

  const summaryNode = panel.querySelector('#' + SUMMARY_ID);
  const verdictNode = panel.querySelector('#' + VERDICT_ID);
  summaryNode.textContent = `${countries.length} pays · ${okCount}/${keys.length} contrôles`;
  verdictNode.textContent = countries.length === 0
    ? 'Aucun pays fourni : contrôles non effectués.'
    : `${okCount}/${keys.length} contrôles conformes · ${divergences.length} décalage(s) id/code documenté(s)${divergences.length ? ' : ' + divergences.join(' ; ') + '.' : '.'}`;
}

register('M32', (ctx) => {
  if (!ctx || !ctx.scene) return;
  ctx.css(CSS_ID, CSS);

  const countries = Array.isArray(ctx.countries) ? ctx.countries : [];
  const el = ctx.el;

  /* M32-10 : ID unique et garde d'existence. Le registre réapplique le greffon
     à chaque rendu ; aucun écouteur n'est posé sur un nœud partagé, aucun état
     module n'est conservé, les données sont relues à chaque appel. */
  let panel = document.getElementById(PANEL_ID);
  if (!panel || !panel.isConnected || panel.dataset.monde !== 'M32') {
    panel = buildPanel(el);
    ctx.scene.appendChild(panel);
    panel.addEventListener('toggle', () => {
      if (!panel.open || typeof ctx.say !== 'function') return;
      const verdict = document.getElementById(VERDICT_ID);
      if (verdict) ctx.say('Noms et libellés : ' + verdict.textContent);
    });
  }

  refresh(panel, ctx, countries, el);
});
