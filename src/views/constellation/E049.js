import { register } from './registry.js';

/* Lentille E049 — robustesse et garde-fous de la légende de la vue Constellation.
   Dix chantiers locaux et complémentaires : aucun appel réseau, aucune source
   aléatoire, aucun minuteur ni boucle d'animation propre. Chaque chantier
   tolère un élément manquant et neutralise seulement son propre effet. */
register('E049', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Fabrique tolérante : repli sur le document si l'outil du contexte manque. */
  const make = (tag, cls, text) => {
    let node = null;
    try { if (typeof ctx.el === 'function') node = ctx.el(tag, cls, text); } catch (_) { node = null; }
    if (!node || node.nodeType !== 1) node = document.createElement(tag);
    if (cls && !node.className) node.className = cls;
    if (text !== undefined && !node.textContent) node.textContent = text;
    return node;
  };

  /* Feuille unique de la lentille : ancrage, glyphes, anti-débordement,
     contraste forcé, survol et mode sobre. Aucune ressource externe. */
  css('constellation-e049', `
.e049-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
#e049-legend{display:flex;flex-wrap:wrap;gap:6px 14px;max-width:100%;box-sizing:border-box;list-style:none;margin:0;padding:0}
#e049-legend>span{min-width:0;box-sizing:border-box;overflow-wrap:anywhere;display:inline-flex;align-items:center;gap:5px;font-size:10px;line-height:1.5}
#e049-legend>span::before{flex:none;font-weight:700;font-size:12px;content:attr(data-e049-glyph)}
#e049-legend>span[data-e049-survol="oui"]{text-decoration:underline solid;text-underline-offset:3px}
@media (forced-colors: active){
  #e049-legend>span{text-decoration:underline dotted;text-underline-offset:3px}
  #e049-legend>span::before{forced-color-adjust:none;color:CanvasText}
}
@media (prefers-contrast: more){
  #e049-legend>span{border:1px solid currentColor;border-radius:4px;padding:1px 5px}
}
#e049-legend.e049-calm,#e049-legend.e049-calm>span{transition:none!important;transform:none!important}
@media (prefers-reduced-motion: reduce){
  #e049-legend,#e049-legend>span{transition:none!important;transform:none!important}
}
`);

  const FALLBACKS = [
    ['legend-sun', 'Ère'],
    ['legend-planet', 'Repère'],
    ['legend-moon', 'Point vérifié du repère'],
  ];
  const GLYPHS = { 'legend-sun': '◆', 'legend-planet': '●', 'legend-moon': '○' };
  const isSpan = node => !!node && node.nodeType === 1 && node.tagName === 'SPAN';

  /* E049-01 — Ancrage robuste : la légende réelle est visée, avec repli sur
     l'en-tête ; un poumon de secours est créé si la légende est absente. */
  let legend = layout.querySelector('.constellation-legend');
  if (!legend || legend.nodeType !== 1) {
    const head = layout.querySelector('.constellation-head');
    if (!head || head.nodeType !== 1) return;
    legend = make('div', 'constellation-legend', 'Légende : ère, repère, point vérifié.');
    head.appendChild(legend);
  }
  legend.id = 'e049-legend';
  legend.setAttribute('data-e049', 'ancrée');

  /* Empreinte idempotente : les nœuds e049-* d'un rendu précédent, désormais
     hors de ce layout, sont retirés pour éviter identifiants et écouteurs
     dupliqués. Seuls les nœuds préfixés par la lentille sont concernés. */
  const stale = document.querySelectorAll('[id^="e049-"]');
  for (let i = 0; i < stale.length; i += 1) {
    const node = stale[i];
    if (node !== legend && !layout.contains(node) && node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }

  let entries = Array.prototype.filter.call(legend.children || [], isSpan);
  if (!entries.length) return;

  /* E049-02 — Sémantique de liste : le conteneur devient une liste et chaque
     entrée un élément de liste, sans changer l'apparence ni le texte. */
  legend.setAttribute('role', 'list');
  legend.setAttribute('aria-label', 'Légende de la constellation');
  entries.forEach(entry => entry.setAttribute('role', 'listitem'));

  /* E049-03 — Filet textuel anti-vide : une entrée sans texte reçoit un libellé
     de secours déduit de sa classe, et toute entrée porte son libellé sûr dans
     un attribut réutilisable par le survol et l'audit. */
  const safeLabel = (node, index) => {
    const direct = node.textContent ? node.textContent.replace(/\s+/g, ' ').trim() : '';
    if (direct) return direct;
    const pair = FALLBACKS[index] || FALLBACKS[FALLBACKS.length - 1];
    if (node.classList && node.classList.contains(pair[0])) return pair[1];
    return `Élément de légende ${index + 1}`;
  };
  entries.forEach((entry, index) => {
    const label = safeLabel(entry, index);
    if (!entry.textContent || !entry.textContent.trim()) entry.textContent = label;
    entry.setAttribute('data-e049-label', label);
    entry.dataset.e049Index = String(index + 1);
  });

  /* E049-04 — Glyphes distincts : un symbole par nature est posé en attribut
     puis affiché en CSS. L'information ne repose donc pas sur la couleur. */
  entries.forEach(entry => {
    let glyph = '·';
    if (entry.classList) {
      for (const key in GLYPHS) {
        if (entry.classList.contains(key)) { glyph = GLYPHS[key]; break; }
      }
    }
    entry.setAttribute('data-e049-glyph', glyph);
  });

  /* E049-05 — Garde anti-débordement : la feuille unique impose flex-wrap,
     min-width nul, retour à la ligne des mots et box-sizing ; l'attribut
     marque le chantier pour l'audit sans rien ajouter au DOM. */
  legend.setAttribute('data-e049-wrap', 'oui');

  /* E049-06 — Description pour lecteur d'écran : un paragraphe masqué
     relié par aria-describedby nomme chaque symbole, avec repli si le nœud
     attendu n'existe pas ou a été vidé. */
  const HELP = 'Légende de la constellation : le losange désigne une ère, '
    + 'le disque plein un repère, le disque creux un point vérifié du repère. '
    + 'Chaque symbole est également nommé en texte.';
  let help = layout.querySelector('#e049-legend-help');
  if (!help || help.nodeType !== 1) {
    help = make('p', 'e049-sr', HELP);
    help.id = 'e049-legend-help';
    layout.appendChild(help);
  }
  if (!help.textContent || !help.textContent.trim()) help.textContent = HELP;
  legend.setAttribute('aria-describedby', help.id);

  /* E049-07 — Contraste forcé : les règles de la feuille unique ajoutent
     soulignement et bordure en mode contraste renforcé ou couleurs forcées ;
     l'attribut consigne l'état de ce garde-fou. */
  legend.setAttribute('data-e049-contrast', 'prêt');

  /* E049-08 — Contrôle d'intégrité : les trois entrées attendues sont
     recensées ; celles qui manquent sont recréées avec leur libellé, leur
     glyphe et leur rôle, puis le bilan est publié en attributs. */
  const manquants = FALLBACKS.filter(pair => !entries.some(entry =>
    entry.classList && entry.classList.contains(pair[0])));
  manquants.forEach(pair => {
    const node = make('span', pair[0], pair[1]);
    node.setAttribute('role', 'listitem');
    node.setAttribute('data-e049-label', pair[1]);
    node.setAttribute('data-e049-glyph', GLYPHS[pair[0]] || '·');
    node.setAttribute('data-e049-ajout', 'secours');
    legend.appendChild(node);
  });
  entries = Array.prototype.filter.call(legend.children || [], isSpan);
  legend.setAttribute('data-e049-attendu', String(FALLBACKS.length));
  legend.setAttribute('data-e049-present', String(entries.length));
  legend.setAttribute('data-e049-complet', entries.length >= FALLBACKS.length ? 'oui' : 'non');

  /* E049-09 — Survol contrôlé : un titre sûr est posé sur chaque entrée, et
     deux écouteurs délégués mettent à jour un état de survol. Les gestionnaires
     précédents sont retirés avant ré-enregistrement, sans minuteur propre. */
  const KEY = '__e049Hover';
  if (legend[KEY]) {
    legend.removeEventListener('mouseover', legend[KEY].over);
    legend.removeEventListener('mouseout', legend[KEY].out);
  }
  entries.forEach(entry => {
    const label = entry.getAttribute('data-e049-label') || 'Élément de légende';
    if (!entry.getAttribute('title')) entry.setAttribute('title', `Symbole : ${label}`);
  });
  const clearHover = () => {
    for (let i = 0; i < entries.length; i += 1) {
      entries[i].removeAttribute('data-e049-survol');
    }
  };
  const onOver = event => {
    const target = event && event.target;
    if (!isSpan(target) || target.parentNode !== legend) return;
    clearHover();
    target.setAttribute('data-e049-survol', 'oui');
    legend.setAttribute('data-e049-survol-label', target.getAttribute('data-e049-label') || '');
  };
  const onOut = event => {
    const target = event && event.target;
    if (isSpan(target) && target.parentNode === legend) clearHover();
  };
  legend.addEventListener('mouseover', onOver);
  legend.addEventListener('mouseout', onOut);
  legend[KEY] = { over: onOver, out: onOut };

  /* E049-10 — Mode sobre : la préférence est demandée au contexte, jamais
     sondée par une boucle propre ; la classe désactive transitions et
     transformations définies dans l'unique feuille de style. */
  const calm = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
  if (calm) legend.classList.add('e049-calm');
  else legend.classList.remove('e049-calm');
  legend.setAttribute('data-e049-sobre', calm ? 'oui' : 'non');
});
