import { register } from './registry.js';

/* Lentille E044 — Structure sémantique appliquée à la légende de la vue
   Constellation. Dix chantiers concrets : ancrage et recensement, rôle de
   liste, entrées numérotées, titre relié, description des symboles, noms
   accessibles, liste de définitions miroir, panneau fieldset et bascule,
   région live d'audit, ancrages croisés et mouvement réduit. Greffon
   tolérant : aucune exception, aucun réseau, aucun aléa, aucun minuteur,
   aucune boucle d'animation propre. Seul le layout transmis par ctx est
   complété ; aucun fichier partagé n'est modifié. */

const CSS_ID = 'constellation-e044';

const IDS = {
  legend: 'e044-legend',
  titre: 'e044-titre',
  desc: 'e044-desc',
  defs: 'e044-defs',
  panel: 'e044-panel',
  legende: 'e044-legende-panel',
  bascule: 'e044-bascule',
  audit: 'e044-audit',
};

/* Table déterminée par la classe d'origine des trois entrées de la vue. */
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

const CSS = `
  /* E044-04 — titre de la légende, visuel et référençable. */
  #e044-titre{
    margin:0 0 2px;color:var(--gold-bright,#e6b96f);
    font:600 10px/1.4 ui-sans-serif,system-ui,sans-serif;
    letter-spacing:.02em;
  }
  /* E044-05 et E044-07 — contenu réservé aux technologies d'assistance. */
  .e044-sr{
    position:absolute;width:1px;height:1px;padding:0;margin:-1px;
    overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;
  }
  /* E044-08 et E044-09 — la bascule rend la liste de définitions visible. */
  #e044-defs[data-e044-structure="exposee"]{
    position:static;width:auto;height:auto;margin:6px 0 0;padding:6px 10px;
    overflow:visible;clip:auto;white-space:normal;
    border:1px solid rgba(230,185,111,.35);border-radius:8px;
    background:rgba(9,13,20,.86);
    display:grid;grid-template-columns:max-content 1fr;gap:3px 10px;
  }
  #e044-defs[data-e044-structure="exposee"] .e044-terme{
    color:var(--gold-bright,#e6b96f);font-size:10px;font-weight:700;
  }
  #e044-defs[data-e044-structure="exposee"] .e044-def{
    margin:0;color:var(--ink-soft,#cfd8e6);font-size:10px;line-height:1.45;
  }
  /* E044-08 — fieldset et légende native, sémantique de groupe. */
  #e044-panel{
    display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;
    margin:6px 0 0;padding:4px 10px 8px;
    border:1px solid rgba(230,185,111,.28);border-radius:8px;
  }
  #e044-legende-panel{
    padding:0 4px;color:var(--ink-soft,#cfd8e6);font-size:10px;font-weight:600;
  }
  #e044-bascule{
    min-height:36px;min-width:36px;padding:0 10px;
    border:1px solid var(--line,#3a4150);border-radius:7px;
    background:var(--surface-2,#141a24);color:var(--ink-soft,#cfd8e6);
    font:10px/1.3 ui-sans-serif,system-ui,sans-serif;cursor:pointer;
  }
  #e044-bascule[aria-pressed="true"]{
    border-color:var(--gold-bright,#e6b96f);
    background:rgba(230,185,111,.16);color:var(--gold-bright,#e6b96f);
  }
  #e044-bascule:focus-visible{outline:2px solid var(--gold-bright,#e6b96f);outline-offset:2px}
  #e044-audit{
    flex:1 1 240px;margin:0;color:var(--ink-soft,#cfd8e6);
    font:9px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;
    font-variant-numeric:tabular-nums;
  }
  /* E044-10 — mouvement réduit : aucune transition, aucune animation. */
  #e044-panel[data-e044-motion="reduce"] #e044-bascule,
  #e044-defs[data-e044-motion="reduce"]{transition:none}
  @media (prefers-reduced-motion: reduce){
    #e044-bascule,#e044-defs{transition:none !important}
  }
`;

/* Retourne un nœud réutilisable, toujours rattaché au bon parent. */
function ensure(doc, id, tag, className, parent, factory) {
  let node = null;
  try { node = doc && typeof doc.getElementById === 'function' ? doc.getElementById(id) : null; }
  catch (error) { node = null; }
  if (!node || typeof node.setAttribute !== 'function') node = factory(tag, className);
  if (node.parentNode !== parent) parent.appendChild(node);
  return node;
}

/* Vide un nœud sans dépendre de replaceChildren. */
function clear(node) {
  try {
    while (node.firstChild) node.removeChild(node.firstChild);
  } catch (error) {
    /* Greffon tolérant : un échec local ne remonte pas au registre. */
  }
}

/* Fusion non destructive d'un identifiant dans une liste ARIA. */
function merge(node, attribute, token) {
  const parts = (node.getAttribute(attribute) || '').split(/\s+/).filter(Boolean);
  if (parts.indexOf(token) < 0) {
    parts.push(token);
    node.setAttribute(attribute, parts.join(' '));
  }
}

register('E044', (ctx) => {
  /* Garde d'entrée : aucun ajout au DOM sans ctx.layout exploitable. */
  if (!ctx || !ctx.layout || ctx.layout.nodeType !== 1
    || typeof ctx.layout.querySelectorAll !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'constellation') return;

  try {
    const layout = ctx.layout;
    const doc = layout.ownerDocument;
    const factory = typeof ctx.el === 'function' ? ctx.el : (tag, className, text) => {
      const node = doc.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };

    /* E044-01 — Ancrage et recensement de la légende réellement rendue.
       Sans légende, le greffon sort sans toucher au DOM. */
    const legend = layout.querySelector('.constellation-legend');
    if (!legend || typeof legend.setAttribute !== 'function') return;
    if (!legend.id) legend.id = IDS.legend;
    legend.classList.add('e044-legende');
    const entrees = Array.prototype.filter.call(legend.children || [], (child) => (
      child && child.nodeType === 1 && child.classList && TERMES.some((terme) => (
        child.classList.contains(terme.classe)
      ))
    ));
    legend.dataset.e044Items = String(entrees.length);
    layout.dataset.e044Ancrage = 'constellation-legend';
    const host = legend.parentNode && legend.parentNode.nodeType === 1
      ? legend.parentNode : layout;

    /* E044-02 — Rôle de liste et nom du conteneur, posés sans écraser
       un rôle ou un nom déjà fourni par la vue ou une autre lentille. */
    if (!legend.hasAttribute('role')) legend.setAttribute('role', 'list');
    if (!legend.hasAttribute('aria-label')) {
      legend.setAttribute('aria-label', 'Légende de la constellation');
    }
    legend.dataset.e044Role = legend.getAttribute('role') || 'list';

    /* E044-03 — Chaque entrée devient un élément de liste numéroté :
       aria-posinset et aria-setsize rendent l'ordre explicite. */
    entrees.forEach((entree, index) => {
      if (!entree.hasAttribute('role')) entree.setAttribute('role', 'listitem');
      entree.classList.add('e044-item');
      entree.dataset.e044Rang = String(index + 1);
      entree.setAttribute('aria-posinset', String(index + 1));
      entree.setAttribute('aria-setsize', String(entrees.length));
    });
    layout.dataset.e044Positions = String(entrees.length);

    /* E044-04 — Titre de la légende créé puis relié par aria-labelledby ;
       il précède le conteneur dans l'arbre DOM, comme dans la lecture. */
    const titre = ensure(doc, IDS.titre, 'h3', 'e044-titre', host, factory);
    titre.textContent = 'Légende de la constellation — nature des repères';
    if (titre.nextSibling !== legend && titre.parentNode === host) {
      host.insertBefore(titre, legend);
    }
    merge(legend, 'aria-labelledby', IDS.titre);

    /* E044-05 — Description vocale du jeu de symboles, ajoutée à
       aria-describedby sans écraser une description existante. */
    const desc = ensure(doc, IDS.desc, 'p', 'e044-sr', host, factory);
    desc.textContent = 'Trois entrées : le disque doré désigne l’ère, le carré bleu un repère, l’anneau violet un point vérifié du repère.';
    merge(legend, 'aria-describedby', IDS.desc);

    /* E044-06 — Nom accessible enrichi : le libellé visible est complété
       par la forme et le sens, lus dans la table déterminée plus haut. */
    entrees.forEach((entree) => {
      const terme = TERMES.find((candidat) => entree.classList.contains(candidat.classe));
      const visible = (entree.textContent || '').trim();
      const nom = terme
        ? `${terme.titre} — ${terme.definition}`
        : `${visible || 'Entrée de la légende'} — élément de la légende`;
      entree.setAttribute('aria-label', nom);
      entree.dataset.e044Nom = nom;
    });

    /* E044-07 — Liste de définitions miroir : vraie sémantique dl/dt/dd,
       construite depuis les entrées présentes, sans inventer de donnée. */
    const defs = ensure(doc, IDS.defs, 'dl', 'e044-sr e044-defs', host, factory);
    clear(defs);
    defs.dataset.e044Structure = 'sr-only';
    entrees.forEach((entree) => {
      const terme = TERMES.find((candidat) => entree.classList.contains(candidat.classe));
      const visible = (entree.textContent || '').trim();
      const dt = factory('dt', 'e044-terme');
      const dd = factory('dd', 'e044-def');
      dt.textContent = terme ? terme.titre : (visible || 'Entrée');
      dd.textContent = terme
        ? terme.definition
        : `Entrée de la légende : ${visible || 'sans libellé'}.`;
      defs.appendChild(dt);
      defs.appendChild(dd);
    });
    defs.dataset.e044Definitions = String(entrees.length);

    /* E044-08 — Panneau fieldset/legend natif et bascule indépendante
       qui expose ou masque la structure de définitions. */
    const panel = ensure(doc, IDS.panel, 'fieldset', 'e044-panel', host, factory);
    let legendePanel = doc && typeof doc.getElementById === 'function'
      ? doc.getElementById(IDS.legende) : null;
    if (!legendePanel || legendePanel.parentNode !== panel) {
      legendePanel = factory('legend', 'e044-legende-panel');
      legendePanel.id = IDS.legende;
      panel.appendChild(legendePanel);
    }
    legendePanel.textContent = 'Structure de la légende';
    const bascule = ensure(doc, IDS.bascule, 'button', 'e044-bascule', panel, factory);
    bascule.id = IDS.bascule;
    bascule.setAttribute('type', 'button');
    bascule.setAttribute('aria-controls', IDS.defs);
    if (bascule.dataset.e044Bound !== '1') {
      bascule.dataset.e044Bound = '1';
      bascule.addEventListener('click', () => {
        const exposee = defs.dataset.e044Structure !== 'exposee';
        defs.dataset.e044Structure = exposee ? 'exposee' : 'sr-only';
        bascule.setAttribute('aria-pressed', exposee ? 'true' : 'false');
        bascule.textContent = exposee ? 'Masquer la structure' : 'Afficher la structure';
        bascule.setAttribute('aria-label', exposee
          ? 'Masquer la structure de la légende'
          : 'Afficher la structure de la légende');
        audit.textContent = message(exposee);
      });
    }

    /* E044-09 — Région live d'audit structurel : comptages et état des
       liaisons annoncés aux technologies d'assistance à chaque bascule. */
    function message(exposee) {
      return `${entrees.length} entrées en rôle liste, ${entrees.length} définitions, `
        + `titre et description associés ; structure ${exposee ? 'exposée' : 'réservée aux lecteurs d’écran'}.`;
    }
    const audit = ensure(doc, IDS.audit, 'p', 'e044-audit', panel, factory);
    audit.id = IDS.audit;
    audit.setAttribute('role', 'status');
    audit.setAttribute('aria-live', 'polite');
    audit.setAttribute('aria-atomic', 'true');
    const exposee = defs.dataset.e044Structure === 'exposee';
    bascule.setAttribute('aria-pressed', exposee ? 'true' : 'false');
    bascule.textContent = exposee ? 'Masquer la structure' : 'Afficher la structure';
    bascule.setAttribute('aria-label', exposee
      ? 'Masquer la structure de la légende'
      : 'Afficher la structure de la légende');
    audit.textContent = message(exposee);
    layout.dataset.e044Audit = String(entrees.length);

    /* E044-10 — Ancrages croisés du panneau, focus visible et mouvement
       réduit signalé par ctx.reducedMotion() à la feuille de style unique. */
    merge(panel, 'aria-describedby', IDS.audit);
    panel.setAttribute('aria-labelledby', IDS.legende);
    const reduit = typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion();
    panel.dataset.e044Motion = reduit ? 'reduce' : 'on';
    defs.dataset.e044Motion = reduit ? 'reduce' : 'on';
    legend.dataset.e044Motion = reduit ? 'reduce' : 'on';

    if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);
  } catch (error) {
    /* Greffon tolérant : toute anomalie locale est neutralisée sans bruit. */
    return;
  }
});
