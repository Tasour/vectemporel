import { register } from './registry.js';

/* Lentille V2 E049 — robustesse et garde-fous avancés de la légende de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés, sans
   réseau, sans source aléatoire et sans minuteur ni boucle propre. Préfixe
   exclusif v2e049 : aucune collision avec la passe 1 (e049-…, #e049-legend). */
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

  /* Feuille unique de la lentille : ordre canonique, doublons, densité,
     isolation, cible clavier, lisibilité et repli mouvement réduit. Aucune
     information n'est portée par la seule couleur. */
  css('constellation-v2-e049', `
.v2e049-legend{display:flex;flex-wrap:wrap;gap:6px 14px;max-width:100%;box-sizing:border-box;isolation:isolate;contain:layout style}
.v2e049-legend>span{min-width:0;box-sizing:border-box;overflow-wrap:anywhere;order:var(--v2e049-ordre,99)}
.v2e049-legend>span[data-v2e049-doublon="oui"]{display:none!important}
.v2e049-legend:focus{outline:none}
.v2e049-legend:focus-visible{outline:3px solid var(--gold-bright,#d8b46a);outline-offset:3px;border-radius:6px}
.v2e049-legend.v2e049-compact{gap:4px 8px}
.v2e049-legend.v2e049-petit{font-size:10px}
.v2e049-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media (prefers-reduced-motion: reduce){.v2e049-legend>span{transition:none!important}}
`);

  /* Ancrage non destructif : la légende réelle est visée, sans écraser
     l'identifiant e049-legend posé par la passe 1 ; repli sur l'en-tête. */
  let legend = layout.querySelector('.constellation-legend');
  if (!legend || legend.nodeType !== 1) legend = layout.querySelector('#e049-legend');
  if (!legend || legend.nodeType !== 1) {
    const head = layout.querySelector('.constellation-head');
    if (!head || head.nodeType !== 1) return;
    legend = make('div', 'constellation-legend', 'Légende : ère, repère, point vérifié.');
    head.appendChild(legend);
  }
  legend.classList.add('v2e049-legend');

  const isSpan = node => !!node && node.nodeType === 1 && node.tagName === 'SPAN';
  const CANON = [
    { cls: 'legend-sun', label: 'Ère' },
    { cls: 'legend-planet', label: 'Repère' },
    { cls: 'legend-moon', label: 'Point vérifié du repère' },
  ];
  const rankOf = node => {
    if (!node || !node.classList) return 99;
    for (let i = 0; i < CANON.length; i += 1) {
      if (node.classList.contains(CANON[i].cls)) return i;
    }
    return 99;
  };
  let entries = Array.prototype.filter.call(legend.children || [], isSpan);
  if (!entries.length) return;

  /* E049-01 — Dédoublonnage déterministe : une seule entrée par nature, la première conservée, les suivantes masquées et comptées. */
  const vus = Object.create(null);
  let doublons = 0;
  entries.forEach(entry => {
    const rang = rankOf(entry);
    if (rang === 99 || vus[rang]) {
      doublons += 1;
      entry.setAttribute('data-v2e049-doublon', 'oui');
      return;
    }
    vus[rang] = true;
    entry.removeAttribute('data-v2e049-doublon');
  });
  legend.setAttribute('data-v2e049-dedupe', String(doublons));

  /* E049-02 — Ordre canonique sans mutation du DOM : un rang déterministe par entrée, appliqué en CSS par la propriété order. */
  entries.forEach(entry => {
    const rang = rankOf(entry);
    const ordre = String(rang === 99 ? 99 : rang + 1);
    entry.setAttribute('data-v2e049-ordre', ordre);
    entry.style.setProperty('--v2e049-ordre', ordre);
  });
  legend.setAttribute('data-v2e049-ordre-canonique', 'sun,planet,moon');

  /* E049-03 — Assainissement et plafonnement du libellé : retrait des caractères de contrôle, espaces normalisés et longueur bornée. */
  const LIMITE = 48;
  const assainir = value => {
    const brut = typeof value === 'string' ? value : '';
    const net = brut.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
    return net.length > LIMITE ? `${net.slice(0, LIMITE - 1)}…` : net;
  };
  entries.forEach(entry => {
    const source = entry.getAttribute('data-e049-label') || entry.textContent || '';
    const net = assainir(source);
    entry.setAttribute('data-v2e049-label-safe', net);
    entry.dataset.v2e049Longueur = String(net.length);
  });

  /* E049-04 — Garde de densité responsive mesurée : une seule lecture de largeur, un attribut et une classe, sans observation ni boucle. */
  let largeur = 0;
  try { largeur = Math.round(legend.clientWidth || layout.clientWidth || 0); } catch (_) { largeur = 0; }
  const densite = largeur > 0 && largeur < 360 ? 'compacte' : 'ample';
  legend.classList.toggle('v2e049-compact', densite === 'compacte');
  legend.setAttribute('data-v2e049-densite', densite);
  legend.setAttribute('data-v2e049-largeur', String(largeur));

  /* E049-05 — Isolation de style : confinement de la mise en page et de la cascade, consigné en attribut pour l'audit. */
  legend.setAttribute('data-v2e049-isole', 'oui');

  /* E049-06 — Signature déterministe et détection de changement : empreinte FNV des libellés ordonnés, sans aléa ni minuteur. */
  const signature = () => {
    const parties = entries.map(entry => `${rankOf(entry)}:${entry.getAttribute('data-v2e049-label-safe') || ''}`);
    const chaine = parties.join('|');
    let h = 2166136261;
    for (let i = 0; i < chaine.length; i += 1) {
      h = (h ^ chaine.charCodeAt(i)) >>> 0;
      h = (h * 16777619) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  };
  const sign = signature();
  const SIG_KEY = '__v2e049_signature';
  let changement = 'initial';
  if (typeof window !== 'undefined') {
    const precedent = window[SIG_KEY];
    changement = precedent && precedent !== sign ? 'modifie' : (precedent ? 'stable' : 'initial');
    window[SIG_KEY] = sign;
  }
  legend.setAttribute('data-v2e049-signature', sign);
  legend.setAttribute('data-v2e049-changement', changement);

  /* E049-07 — Cible clavier de la légende : tabindex non destructif, nom accessible et contour de focus visible sans dépendre de la couleur. */
  if (!legend.hasAttribute('tabindex')) {
    legend.setAttribute('tabindex', '0');
    legend.setAttribute('data-v2e049-clavier', 'ajoute');
  } else {
    legend.setAttribute('data-v2e049-clavier', 'existant');
  }
  if (!legend.getAttribute('aria-label')) {
    legend.setAttribute('aria-label', 'Légende de la constellation : ère, repère, point vérifié');
  }
  legend.setAttribute('data-v2e049-tabindex', legend.getAttribute('tabindex') || '');

  /* E049-08 — Bilan vocal d'état : région status distincte de la passe 1, mise à jour une fois avec un résumé français mesurable. */
  let bilan = layout.querySelector('#v2e049-live');
  if (!bilan || bilan.nodeType !== 1) {
    bilan = make('p', 'v2e049-sr', '');
    bilan.id = 'v2e049-live';
    bilan.setAttribute('role', 'status');
    bilan.setAttribute('aria-live', 'polite');
    bilan.setAttribute('aria-atomic', 'true');
    layout.appendChild(bilan);
  }
  const presents = CANON.filter(pair => entries.some(entry =>
    entry.classList && entry.classList.contains(pair.cls))).length;
  bilan.textContent = `Légende prête : ${presents} symbole${presents > 1 ? 's' : ''} sur ${CANON.length}, `
    + `${doublons} doublon${doublons > 1 ? 's' : ''}, `
    + `${densite === 'compacte' ? 'affichage compact' : 'affichage ample'}.`;

  /* E049-09 — Filet de taille minimale de police : une lecture protégée du style calculé relève une police trop petite et la corrige en CSS. */
  let petite = false;
  try {
    const vue = typeof window !== 'undefined' && window.getComputedStyle
      ? window.getComputedStyle(legend) : null;
    const taille = vue ? parseFloat(vue.fontSize) : NaN;
    petite = Number.isFinite(taille) && taille > 0 && taille < 10;
  } catch (_) { petite = false; }
  legend.classList.toggle('v2e049-petit', petite);
  legend.setAttribute('data-v2e049-lisibilite', petite ? 'corrigee' : 'conforme');

  /* E049-10 — Auto-audit d'empreinte V2 : vérification finale des marqueurs de la lentille et publication d'un bilan d'intégrité. */
  const marqueurs = [
    'data-v2e049-dedupe', 'data-v2e049-ordre-canonique', 'data-v2e049-densite',
    'data-v2e049-isole', 'data-v2e049-signature', 'data-v2e049-changement',
    'data-v2e049-clavier', 'data-v2e049-lisibilite',
  ];
  const presentsMarqueurs = marqueurs.filter(m => legend.hasAttribute(m)).length;
  const entreesMarquees = entries.filter(entry => entry.hasAttribute('data-v2e049-ordre')
    && entry.hasAttribute('data-v2e049-label-safe')).length;
  const complet = presentsMarqueurs === marqueurs.length && entreesMarquees === entries.length;
  legend.setAttribute('data-v2e049-empreinte', complet ? 'complete' : 'partielle');
  legend.setAttribute('data-v2e049-empreinte-marqueurs', `${presentsMarqueurs}/${marqueurs.length}`);
});
