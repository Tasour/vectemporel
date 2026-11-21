import { register } from './registry.js';

/* Lentille V2 E044 — structure sémantique enrichie de la légende de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau, sans source aléatoire et sans minuteur ni boucle propre.
   La passe 1 avait posé le rôle de liste, le titre, la description d'ensemble,
   les noms enrichis, le miroir dl/dt/dd, le fieldset, la bascule et l'audit :
   la V2 ajoute une table native, des termes définis, une note, aria-details,
   un index navigable et ses annonces, sans réécrire aucun de ces apports.
   Préfixe exclusif : v2e044 (aucune collision avec la passe 1). */
register('E044', ctx => {
  /* Garde d'entrée : aucun ajout au DOM sans layout exploitable et sans
     document courant. Le greffon reste silencieux sur un DOM incomplet. */
  if (!ctx || !ctx.layout || ctx.layout.nodeType !== 1
    || typeof ctx.layout.querySelector !== 'function'
    || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;

  const layout = ctx.layout;
  const doc = layout.ownerDocument || document;
  const factory = typeof ctx.el === 'function'
    ? ctx.el
    : (tag, className, text) => {
      const node = doc.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };

  const make = (tag, className, text) => factory(tag, className, text);

  /* Feuille unique de la lentille : tout ce qui suit est décoratif ou
     interactif au sens CSS ; aucune information n'est portée par la couleur
     seule, et les libellés restent de vrais nœuds texte. */
  css('constellation-v2-e044', `
.v2e044-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e044-bloc{margin:8px 0 0;padding:8px 10px;border:1px solid rgba(230,185,111,.28);border-radius:8px;background:rgba(9,13,20,.72);color:var(--ink-soft,#cfd8e6);font:10px/1.45 ui-sans-serif,system-ui,sans-serif}
.v2e044-titre-bloc{margin:0 0 6px;color:var(--gold-bright,#e6b96f);font:600 10px/1.4 ui-sans-serif,system-ui,sans-serif}
.v2e044-table{width:100%;border-collapse:collapse;font-size:10px}
.v2e044-caption{padding:0 0 6px;color:var(--ink-soft,#cfd8e6);font-style:italic;text-align:left}
.v2e044-table th,.v2e044-table td{padding:3px 6px;border-bottom:1px solid rgba(230,185,111,.16);text-align:left;vertical-align:top}
.v2e044-table thead th{color:var(--gold-bright,#e6b96f);font-weight:700;border-bottom-color:rgba(230,185,111,.4)}
.v2e044-table tbody th{color:var(--gold-bright,#e6b96f);font-weight:700;white-space:nowrap}
.v2e044-dfn{font-style:normal;border-bottom:1px dotted currentColor}
.v2e044-note{margin:8px 0 0;color:var(--ink-soft,#cfd8e6);font-size:10px}
.v2e044-abbr{text-decoration:underline dotted;cursor:help}
.v2e044-index{margin:8px 0 0}
.v2e044-liste{margin:0;padding-left:18px}
.v2e044-item-index{margin:2px 0}
.v2e044-lien{display:inline-flex;align-items:center;min-height:36px;padding:0 8px;border-radius:6px;color:var(--gold-bright,#e6b96f);text-decoration:none}
.v2e044-lien:hover{text-decoration:underline}
.v2e044-lien:focus-visible,.v2e044-skip:focus-visible{outline:2px solid var(--gold-bright,#e6b96f);outline-offset:2px}
.v2e044-skip{position:absolute;left:10px;top:-64px;z-index:9;display:inline-flex;align-items:center;min-height:36px;padding:0 12px;border:1px solid var(--gold,#e6b96f);border-radius:8px;background:var(--surface-2,#141a24);color:var(--gold-bright,#e6b96f);font-size:10px;transition:top .15s ease}
.v2e044-skip:focus-visible{top:8px}
.v2e044-bloc[data-v2e044-motion="reduce"] .v2e044-skip{transition:none}
@media (prefers-reduced-motion: reduce){.v2e044-skip{transition:none!important}}
`);

  /* Préparation non numérotée : ancrage sur la légende réellement rendue,
     table déterminée par classe, calcul d'un parent d'accueil et helpers
     partagés. Aucun de ces helpers n'écrit hors du layout transmis. */
  const legend = layout.querySelector('.constellation-legend');
  if (!legend || typeof legend.setAttribute !== 'function') return;

  const TERMES = [
    {
      classe: 'legend-sun',
      titre: 'Ère',
      definition: 'Disque doré : l’ère de référence de la constellation.',
    },
    {
      classe: 'legend-planet',
      titre: 'Repère',
      definition: 'Carré bleu : un repère daté situé dans l’ère.',
    },
    {
      classe: 'legend-moon',
      titre: 'Point vérifié',
      definition: 'Anneau violet : un point vérifié rattaché au repère.',
    },
  ];

  const entrees = Array.prototype.filter.call(legend.children || [], child => (
    child && child.nodeType === 1 && child.classList
      && TERMES.some(terme => child.classList.contains(terme.classe))
  ));
  if (!entrees.length) return;

  const host = legend.parentNode && legend.parentNode.nodeType === 1
    ? legend.parentNode : layout;

  const clear = node => {
    while (node && node.firstChild) {
      try { node.removeChild(node.firstChild); }
      catch (erreur) { break; }
    }
  };

  const merge = (node, attribute, token) => {
    const parts = String(node.getAttribute(attribute) || '').split(/\s+/).filter(Boolean);
    if (parts.indexOf(token) < 0) {
      parts.push(token);
      node.setAttribute(attribute, parts.join(' '));
    }
  };

  const slot = (id, tag, className, parent) => {
    let node = null;
    try { node = doc && typeof doc.getElementById === 'function' ? doc.getElementById(id) : null; }
    catch (erreur) { node = null; }
    if (!node || typeof node.setAttribute !== 'function'
      || node.tagName !== tag.toUpperCase()) {
      if (node && node.parentNode) node.parentNode.removeChild(node);
      node = make(tag, className);
      node.id = id;
    }
    if (node.parentNode !== parent) parent.appendChild(node);
    return node;
  };

  /* Le bloc est ajouté après la légende dans son parent réel, même lorsque
     celle-ci est imbriquée dans l'en-tête de la vue. */
  const block = slot('v2e044-bloc', 'section', 'v2e044-bloc', host);
  let tbody = null;

  /* E044-01 — Table native de correspondance : caption et en-têtes portés. */
  const table = slot('v2e044-table', 'table', 'v2e044-table', block);
  clear(table);
  table.appendChild(make('caption', 'v2e044-caption', 'Correspondance des symboles de la légende'));
  const thead = make('thead');
  const headRow = make('tr');
  ['Symbole', 'Signification'].forEach(libelle => {
    const th = make('th', 'v2e044-th-col', libelle);
    th.setAttribute('scope', 'col');
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  tbody = make('tbody');
  entrees.forEach((entree, index) => {
    const terme = TERMES.find(candidat => entree.classList.contains(candidat.classe));
    const row = make('tr', 'v2e044-ligne');
    const th = make('th', 'v2e044-th-ligne');
    th.setAttribute('scope', 'row');
    th.textContent = terme ? terme.titre : `Symbole ${index + 1}`;
    const cell = make('td', 'v2e044-td');
    cell.id = `v2e044-def-${index + 1}`;
    cell.textContent = terme
      ? terme.definition
      : `Entrée de la légende ${index + 1} : symbole non identifié.`;
    row.appendChild(th);
    row.appendChild(cell);
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  table.dataset.v2e044Colonnes = '2';
  table.dataset.v2e044Lignes = String(entrees.length);

  /* E044-02 — Occurrences définissantes : dfn dans l'en-tête de ligne et
     rôle definition natif sur la cellule de signification. */
  let termes = 0;
  Array.prototype.forEach.call(tbody.rows || [], (row, index) => {
    const th = row.cells && row.cells[0];
    const cellule = row.cells && row.cells[1];
    if (!th || !cellule) return;
    const dfn = make('dfn', 'v2e044-dfn', (th.textContent || '').trim());
    dfn.id = `v2e044-terme-${index + 1}`;
    dfn.setAttribute('aria-describedby', cellule.id);
    clear(th);
    th.appendChild(dfn);
    cellule.setAttribute('role', 'definition');
    cellule.dataset.v2e044Definition = String(index + 1);
    termes += 1;
  });
  block.dataset.v2e044Termes = String(termes);

  /* E044-03 — Note sémantique : role="note" et abréviation développée par
     un vrai élément abbr, jamais une information portée par la seule couleur. */
  const note = slot('v2e044-note', 'p', 'v2e044-note', block);
  clear(note);
  note.setAttribute('role', 'note');
  const abbr = make('abbr', 'v2e044-abbr', 'ARIA');
  abbr.title = 'Accessible Rich Internet Applications';
  abbr.setAttribute('aria-label', 'Accessible Rich Internet Applications');
  note.appendChild(doc.createTextNode('Note — la couleur ne porte jamais seule l’information : chaque symbole est nommé par un texte. Les relations '));
  note.appendChild(abbr);
  note.appendChild(doc.createTextNode(' ci-dessus restent lisibles sans les styles.'));

  /* E044-04 — Relation aria-details : la légende pointe vers la table V2,
     qui devient le complément détaillé sans écraser role, nom ou décrit. */
  legend.setAttribute('aria-details', table.id);
  legend.dataset.v2e044Details = table.id;
  block.dataset.v2e044Details = table.id;

  /* E044-05 — Index de navigation interne : nav nommée, liste ordonnée et
     liens de fragment locaux vers les entrées réelles de la légende. */
  entrees.forEach((entree, index) => {
    if (!entree.id) entree.id = `v2e044-entree-${index + 1}`;
    entree.dataset.v2e044Cible = String(index + 1);
    entree.setAttribute('tabindex', '-1');
  });
  const nav = slot('v2e044-index', 'nav', 'v2e044-index', block);
  clear(nav);
  nav.setAttribute('tabindex', '-1');
  nav.setAttribute('aria-label', 'Index des symboles de la légende');
  const liste = make('ol', 'v2e044-liste');
  entrees.forEach((entree, index) => {
    const item = make('li', 'v2e044-item-index');
    const lien = make('a', 'v2e044-lien', (entree.textContent || '').trim() || `Symbole ${index + 1}`);
    lien.id = `v2e044-lien-${index + 1}`;
    lien.setAttribute('href', `#${entree.id}`);
    item.appendChild(lien);
    liste.appendChild(item);
  });
  nav.appendChild(liste);
  nav.dataset.v2e044Liens = String(entrees.length);

  /* E044-06 — Suivi de cible : aria-current sur l'entrée visée et annonce
     dans une région live V2 distincte de l'audit de la passe 1. */
  const navLive = slot('v2e044-nav-live', 'p', 'v2e044-sr', layout);
  navLive.setAttribute('role', 'status');
  navLive.setAttribute('aria-live', 'polite');
  navLive.setAttribute('aria-atomic', 'true');
  navLive.textContent = `Index de la légende : ${entrees.length} symboles.`;
  if (nav.dataset.v2e044Bound !== '1') {
    nav.dataset.v2e044Bound = '1';
    nav.addEventListener('click', evenement => {
      const cibleEvenement = evenement && evenement.target;
      const lien = cibleEvenement && cibleEvenement.nodeType === 1
        && typeof cibleEvenement.closest === 'function'
        ? cibleEvenement.closest('a.v2e044-lien') : null;
      if (!lien || !nav.contains(lien)) return;
      entrees.forEach(entree => entree.removeAttribute('aria-current'));
      const correspondance = String(lien.id).match(/(\d+)$/);
      const rang = correspondance ? Number(correspondance[1]) : 0;
      const visée = rang > 0 ? entrees[rang - 1] : null;
      if (visée) {
        visée.setAttribute('aria-current', 'true');
        visée.dataset.v2e044Actif = 'vrai';
        navLive.textContent = `Symbole ciblé : ${(visée.textContent || '').trim()} (${rang} sur ${entrees.length}).`;
      }
      layout.dataset.v2e044Navigation = lien.getAttribute('href') || '';
    });
  }

  /* E044-07 — Description affinée : chaque entrée reçoit, en plus de la
     description d'ensemble de la passe 1, sa propre cellule de définition. */
  entrees.forEach((entree, index) => {
    let cellule = null;
    try { cellule = doc.getElementById(`v2e044-def-${index + 1}`); }
    catch (erreur) { cellule = null; }
    if (!cellule) return;
    merge(entree, 'aria-describedby', cellule.id);
    entree.dataset.v2e044Description = cellule.id;
  });
  layout.dataset.v2e044Descriptions = String(entrees.length);

  /* E044-08 — Repère nommé du bloc V2 : section à rôle region, titre réel
     inséré en tête et aria-labelledby, sans toucher au h3 de la passe 1. */
  const titreBloc = slot('v2e044-titre-bloc', 'h3', 'v2e044-titre-bloc', block);
  titreBloc.textContent = 'Structure détaillée de la légende';
  if (titreBloc.parentNode === block && block.firstChild !== titreBloc) {
    block.insertBefore(titreBloc, block.firstChild);
  }
  block.setAttribute('role', 'region');
  block.setAttribute('aria-labelledby', titreBloc.id);
  block.dataset.v2e044Region = 'structure-detaillee';

  /* E044-09 — Lien d'évitement vers l'index : une cible de 36 px, masquée
     hors focus, insérée avant le parent de la légende quand c'est possible. */
  if (!doc.getElementById('v2e044-skip')) {
    const skip = make('a', 'v2e044-skip', 'Aller à l’index des symboles de la légende');
    skip.id = 'v2e044-skip';
    skip.setAttribute('href', `#${nav.id}`);
    skip.setAttribute('aria-controls', nav.id);
    const parent = host.parentNode && host.parentNode.nodeType === 1 ? host.parentNode : null;
    if (parent) parent.insertBefore(skip, host);
    else layout.appendChild(skip);
  }

  /* E044-10 — Mouvement réduit et focus visible : la préférence de l'hôte
     est tracée dans le DOM et la feuille retire toute transition, tandis que
     les contours de focus des nouveaux contrôles restent contrastés. */
  let reduit = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduit = !!ctx.reducedMotion(); }
    catch (erreur) { reduit = false; }
  }
  const mouvement = reduit ? 'reduce' : 'on';
  block.dataset.v2e044Motion = mouvement;
  nav.dataset.v2e044Motion = mouvement;
  layout.dataset.v2e044Motion = mouvement;
});
