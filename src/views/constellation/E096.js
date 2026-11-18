import { register } from './registry.js';

/* Lentille E096 — Gestion de l'état appliquée au champ d'étoiles de la vue Constellation.
 *
 * Rapport : UNIFIED_AUDIT/CONSTELLATION/views/E096.md — chantiers E096-01 à E096-10.
 * Fichier possédé : ce module uniquement. Aucun fichier partagé n'est édité :
 * ni src/views/constellation.js, ni registry.js, ni index.js, ni styles.css.
 *
 * Cible : le champ .constellation-field et ses trois couches de boutons
 * (.const-sun, .const-planet, .const-moon), le SVG .constellation-edges et
 * la légende .constellation-caption. La lentille n'écrit jamais dans le store :
 * elle lit l'état rendu (classes .is-active, data-const-key, aria-current),
 * le sérialise, le réconcilie, le projette et l'annonce. Aucune sélection
 * réelle n'est modifiée : les états de repli et de transition sont signalés,
 * jamais substitués au choix de l'utilisateur.
 *
 * Contrat : register('E096', ctx => { … }) avec
 * ctx = { viewId, stage, layout, css(id, rules), el(tag, cls, text), reducedMotion() }.
 * ctx.layout est vérifié avant tout ajout DOM ; une seule feuille CSS est
 * injectée sous l'identifiant constellation-e096. Tous les IDs DOM créés
 * portent le préfixe e096-. Zéro appel réseau, zéro graine aléatoire, aucune
 * journalisation, aucune minuterie ni boucle d'animation propre, aucune injection de balisage.
 */

const CSS_ID = 'constellation-e096';
const ACTIVE = 'data-e096-on';
const LIVE_ID = 'e096-etat-live';
const AUDIT_ID = 'e096-etat-audit';

/* E096-02 : compteur de révision module-privé, incrémenté une fois par passe. */
let revision = 0;
/* E096-02 : mémorisation de l'instance de nœud vue pour le marquage « premier passage ». */
const noeudsVus = new WeakSet();
/* E096-05 : un seul jeu d'écouteurs délégués par champ, même après N rendus. */
const champsGardes = new WeakSet();
/* E096-06 : dernier texte annoncé par légende, pour éviter une écriture redondante. */
const derniersTextes = new WeakMap();

const GROUPES = [
  { nom: 'sun', selection: '.const-sun', couche: '.const-layer-suns', mode: 'clamp' },
  { nom: 'planet', selection: '.const-planet', couche: '.const-layer-planets', mode: 'clamp' },
  { nom: 'moon', selection: '.const-moon', couche: '.const-layer-moons', mode: 'wrap' },
];

const CSS = `
  .constellation-layout[data-e096-on] .const-sun,
  .constellation-layout[data-e096-on] .const-planet,
  .constellation-layout[data-e096-on] .const-moon {
    outline: 0 solid transparent;
    transition: outline-color .18s ease, box-shadow .18s ease;
  }
  .constellation-layout[data-e096-on] [data-e096-active="1"] {
    outline: 2px solid rgba(230, 185, 111, .85);
    outline-offset: 2px;
  }
  .constellation-layout[data-e096-on] .e096-first {
    box-shadow: 0 0 0 1px rgba(178, 139, 221, .45);
  }
  .constellation-layout[data-e096-on] .e096-drift {
    outline: 1px dashed rgba(255, 242, 210, .7);
    outline-offset: 2px;
  }
  .constellation-layout[data-e096-on] .e096-focus {
    box-shadow: 0 0 0 3px rgba(230, 185, 111, .55);
  }
  .constellation-layout[data-e096-on] .e096-repli {
    outline: 1px dashed rgba(127, 178, 217, .85);
    outline-offset: 2px;
  }
  .constellation-layout[data-e096-on] .const-layer.e096-anomalie {
    outline: 1px dashed rgba(217, 150, 143, .7);
    outline-offset: -1px;
  }
  .constellation-layout[data-e096-on] .e096-live {
    margin: 0; color: var(--gold); font-size: 9px; line-height: 1.4;
  }
  .constellation-layout[data-e096-on] .e096-audit {
    flex: 1 1 100%; margin-top: 6px; color: var(--muted); font-size: 9px;
  }
  .constellation-layout[data-e096-on] .e096-audit summary {
    cursor: pointer; color: var(--gold);
  }
  .constellation-layout[data-e096-on] .e096-audit-ligne { margin: 2px 0; }
  @media (prefers-reduced-motion: reduce) {
    .constellation-layout[data-e096-on] .const-sun,
    .constellation-layout[data-e096-on] .const-planet,
    .constellation-layout[data-e096-on] .const-moon { transition: none; }
  }
`;

function liste(layout, selecteur) {
  try { return Array.from(layout.querySelectorAll(selecteur)); }
  catch { return []; }
}

function lireGroupe(layout, config) {
  const noeuds = liste(layout, config.selection);
  let couche = null;
  try { couche = layout.querySelector(config.couche); }
  catch { couche = null; }
  let actif = -1;
  noeuds.forEach((noeud, index) => {
    if (actif < 0 && noeud.classList && noeud.classList.contains('is-active')) actif = index;
  });
  return { config, noeuds, couche, actif };
}

function lireEtat(groupes, layout) {
  let texte = '—';
  try {
    const source = layout.querySelector('.constellation-state');
    const brut = source && source.textContent ? String(source.textContent).trim() : '';
    if (brut) texte = brut;
  } catch { texte = '—'; }
  return {
    snapshot: groupes.map((g) => (g.actif >= 0 ? String(g.actif) : '-')).join('|'),
    texte,
  };
}

/* E096-01 — Instantané d'état : l'état rendu est sérialisé en era|event|point
   sur le layout, et chaque nœud reçoit son rang et son marqueur d'activation. */
function instantaneEtat(layout, groupes, etat) {
  layout.setAttribute('data-e096-snapshot', etat.snapshot);
  groupes.forEach((g) => {
    g.noeuds.forEach((noeud, index) => {
      noeud.setAttribute('data-e096-index', String(index));
      if (index === g.actif) noeud.setAttribute('data-e096-active', '1');
      else noeud.removeAttribute('data-e096-active');
    });
  });
  return groupes.length + 1;
}

/* E096-02 — Révision de passe : compteur déterministe, marquage « premier
   passage » par instance de nœud (WeakSet) et enregistrement du mouvement. */
function marquerRevision(ctx, layout, groupes) {
  revision += 1;
  layout.setAttribute('data-e096-revision', String(revision));
  let premiers = 0;
  groupes.forEach((g) => {
    g.noeuds.forEach((noeud) => {
      if (noeudsVus.has(noeud)) {
        noeud.setAttribute('data-e096-pass', 'successif');
        return;
      }
      noeudsVus.add(noeud);
      noeud.setAttribute('data-e096-pass', 'premier');
      noeud.classList.add('e096-first');
      premiers += 1;
    });
  });
  let calme = false;
  try { calme = typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion(); }
  catch { calme = false; }
  layout.setAttribute('data-e096-motion', calme ? 'calme' : 'actif');
  return 1 + premiers;
}

/* E096-03 — Réconciliation : dans chaque couche, un seul aria-current peut
   subsister, aligné sur .is-active ; les attributs divergents sont corrigés. */
function reconcilerActivation(layout, groupes) {
  let corrections = 0;
  groupes.forEach((g) => {
    const courants = g.noeuds.filter((n) => (n.getAttribute('aria-current') || '') === 'true');
    const cible = g.actif >= 0 ? g.noeuds[g.actif] : (courants.length ? courants[0] : null);
    g.noeuds.forEach((noeud) => {
      const doit = noeud === cible;
      const attribut = noeud.getAttribute('aria-current');
      if (doit && attribut !== 'true') {
        noeud.setAttribute('aria-current', 'true');
        noeud.setAttribute('data-e096-drift', 'aligne');
        noeud.classList.add('e096-drift');
        corrections += 1;
      } else if (!doit && attribut) {
        noeud.removeAttribute('aria-current');
        noeud.setAttribute('data-e096-drift', 'retire');
        noeud.classList.add('e096-drift');
        corrections += 1;
      } else if (doit) {
        noeud.removeAttribute('data-e096-drift');
        noeud.classList.remove('e096-drift');
      }
    });
  });
  layout.setAttribute('data-e096-drift', String(corrections));
  return corrections;
}

/* E096-04 — Table de transitions projetée : chaque nœud porte ses indices
   suivant et précédent bornés, en mode clamp pour ères/repères et wrap pour
   les points, conformément aux conventions de bornage de la vue. */
function transitionsProjetees(groupes) {
  let ecrit = 0;
  groupes.forEach((g) => {
    const total = g.noeuds.length;
    if (!total) return;
    const borner = (index) => (g.config.mode === 'wrap'
      ? ((index % total) + total) % total
      : Math.max(0, Math.min(total - 1, index)));
    g.noeuds.forEach((noeud, index) => {
      noeud.setAttribute('data-e096-next', String(borner(index + 1)));
      noeud.setAttribute('data-e096-prev', String(borner(index - 1)));
      ecrit += 1;
    });
    if (g.couche) {
      g.couche.setAttribute('data-e096-mode', g.config.mode);
      g.couche.setAttribute('data-e096-bornes', `0..${total - 1}`);
    }
  });
  return ecrit;
}

/* E096-05 — État transitoire de focus : deux écouteurs délégués au plus par
   champ (WeakSet), clé de focus mémorisée sur le champ et classe posée sur
   le nœud courant ; la sortie du champ efface cet état local. */
function memoriserFocus(champ) {
  let ajoutes = 0;
  if (champ && !champsGardes.has(champ)) {
    champsGardes.add(champ);
    champ.addEventListener('focusin', (event) => {
      try {
        const cible = event.target && typeof event.target.closest === 'function'
          ? event.target.closest('[data-const-key]') : null;
        if (!cible || !champ.contains(cible)) return;
        champ.setAttribute('data-e096-focus', cible.getAttribute('data-const-key') || '');
        cible.classList.add('e096-focus');
      } catch { /* greffon tolérant */ }
    });
    champ.addEventListener('focusout', (event) => {
      try {
        if (event.relatedTarget && champ.contains(event.relatedTarget)) return;
        champ.removeAttribute('data-e096-focus');
        liste(champ, '.e096-focus').forEach((n) => n.classList.remove('e096-focus'));
      } catch { /* greffon tolérant */ }
    });
    ajoutes = 2;
  }
  if (champ) champ.setAttribute('data-e096-focusguard', 'on');
  return ajoutes + (champ ? 1 : 0);
}

/* E096-06 — Pont d'annonce : une région de statut réutilisée, alimentée depuis
   l'instantané et le texte de légende, avec écriture seulement si le texte
   change réellement (WeakMap), afin de ne pas saturer les lecteurs d'écran. */
function pontAnnonce(ctx, layout, etat) {
  let caption = null;
  try { caption = layout.querySelector('.constellation-caption'); }
  catch { caption = null; }
  if (!caption) return 0;
  let live = null;
  try { live = document.getElementById(LIVE_ID); }
  catch { live = null; }
  if (!live || live.parentNode !== caption) {
    if (live && live.parentNode) live.parentNode.removeChild(live);
    live = ctx.el('p', 'e096-live');
    live.id = LIVE_ID;
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    caption.appendChild(live);
  }
  const texte = `État du champ : ${etat.snapshot} · ${etat.texte}`;
  let precedent = '';
  try { precedent = derniersTextes.get(caption) || ''; }
  catch { precedent = ''; }
  if (precedent === texte) {
    live.setAttribute('data-e096-live', 'stable');
    return 0;
  }
  try { derniersTextes.set(caption, texte); }
  catch { /* greffon tolérant */ }
  live.textContent = texte;
  live.setAttribute('data-e096-live', 'mis-a-jour');
  return 1;
}

/* E096-07 — État des arêtes : la classe SVG est traduite en attribut lisible
   (chemin / lune / chemin-lune / lien) et les totaux sont consignés sur le SVG. */
function etatArete(layout) {
  let svg = null;
  try { svg = layout.querySelector('.constellation-edges'); }
  catch { svg = null; }
  if (!svg) return 0;
  const lignes = liste(svg, 'line');
  let chemins = 0;
  let lunes = 0;
  lignes.forEach((ligne) => {
    const classes = ligne.getAttribute('class') || '';
    const estChemin = /(^|\s)is-path(\s|$)/.test(classes);
    const estLune = /(^|\s)is-moon(\s|$)/.test(classes);
    const nature = estChemin && estLune ? 'chemin-lune'
      : estChemin ? 'chemin' : estLune ? 'lune' : 'lien';
    ligne.setAttribute('data-e096-edge', nature);
    if (estChemin) {
      ligne.setAttribute('data-e096-edge-active', '1');
      chemins += 1;
    } else {
      ligne.removeAttribute('data-e096-edge-active');
    }
    if (estLune) lunes += 1;
  });
  svg.setAttribute('data-e096-paths', String(chemins));
  svg.setAttribute('data-e096-moons', String(lunes));
  return lignes.length + 2;
}

/* E096-08 — Comptage dérivé : nombre d'actifs par couche, avec signalement
   d'une couche vide ou sur-sélectionnée (état incohérent, jamais corrigé). */
function tallyActivation(layout, groupes) {
  let anomalies = 0;
  groupes.forEach((g) => {
    const actifs = g.noeuds.filter((n) => n.classList && n.classList.contains('is-active')).length;
    layout.setAttribute(`data-e096-count-${g.config.nom}`, String(actifs));
    if (g.noeuds.length && actifs !== 1) {
      if (g.couche) g.couche.classList.add('e096-anomalie');
      anomalies += 1;
    } else if (g.couche) {
      g.couche.classList.remove('e096-anomalie');
      g.couche.removeAttribute('data-e096-anomalie');
    }
  });
  layout.setAttribute('data-e096-anomalies', String(anomalies));
  return groupes.length;
}

/* E096-09 — État de repli purement visuel : une couche sans actif voit son
   premier nœud souligné en pointillé et consigné, sans changer l'aria-label
   ni le aria-current, pour ne jamais annoncer une sélection fictive. */
function etatRepli(layout, groupes) {
  let replis = 0;
  const noms = [];
  groupes.forEach((g) => {
    const actifs = g.noeuds.filter((n) => n.classList && n.classList.contains('is-active'));
    if (g.noeuds.length && actifs.length === 0) {
      const premier = g.noeuds[0];
      premier.classList.add('e096-repli');
      premier.setAttribute('data-e096-repli', '1');
      noms.push(g.config.nom);
      replis += 1;
      return;
    }
    g.noeuds.forEach((n) => {
      n.classList.remove('e096-repli');
      n.removeAttribute('data-e096-repli');
    });
  });
  layout.setAttribute('data-e096-repli-couches', noms.join(',') || 'aucune');
  return replis;
}

/* E096-10 — Sceau auditable : compteurs par chantier sur le layout et panneau
   #e096-etat-audit réutilisé, vidé puis rempli de paragraphes de texte réel. */
function sceauAudit(ctx, layout, comptes, etat, groupes) {
  /* Le sceau est le dernier chantier : sa propre valeur est connue ici (1),
     les neuf premières venant du tableau déjà renseigné. */
  const locaux = comptes.slice(0, 9).concat([1]);
  const total = locaux.reduce((somme, n) => somme + n, 0);
  layout.setAttribute('data-e096-checks', locaux
    .map((n, i) => `${String(i + 1).padStart(2, '0')}:${n}`).join(' '));
  layout.setAttribute('data-e096-total', String(total));
  let cible = null;
  try { cible = layout.querySelector('.constellation-caption') || layout; }
  catch { cible = layout; }
  let panneau = null;
  try { panneau = document.getElementById(AUDIT_ID); }
  catch { panneau = null; }
  if (!panneau || panneau.parentNode !== cible) {
    if (panneau && panneau.parentNode) panneau.parentNode.removeChild(panneau);
    panneau = ctx.el('details', 'e096-audit');
    panneau.id = AUDIT_ID;
    panneau.setAttribute('aria-label', 'Synthèse de l’état du champ — E096');
    cible.appendChild(panneau);
  }
  while (panneau.firstChild) panneau.removeChild(panneau.firstChild);
  panneau.appendChild(ctx.el('summary', 'e096-audit-titre', 'État du champ — audit E096'));
  panneau.appendChild(ctx.el('p', 'e096-audit-ligne',
    `Instantané ${etat.snapshot} · révision ${revision} · ${total} effet(s) · `
    + `${locaux.filter((n) => n > 0).length} chantier(s) actif(s).`));
  locaux.forEach((n, i) => {
    panneau.appendChild(ctx.el('p', 'e096-audit-ligne',
      `E096-${String(i + 1).padStart(2, '0')} : ${n} effet(s).`));
  });
  panneau.appendChild(ctx.el('p', 'e096-audit-ligne',
    `${groupes.length} couche(s) · mouvement ${layout.getAttribute('data-e096-motion') || 'inconnu'} `
    + `· dérives ${layout.getAttribute('data-e096-drift') || '0'} `
    + `· repli ${layout.getAttribute('data-e096-repli-couches') || 'aucune'}.`));
  return 1;
}

register('E096', (ctx) => {
  /* Contrat : ctx.layout est exigé avant la moindre insertion dans le DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'constellation') return;
  if (typeof document === 'undefined') return;

  const layout = ctx.layout;
  let champ = null;
  try { champ = layout.querySelector('.constellation-field'); }
  catch { champ = null; }

  const groupes = GROUPES.map((config) => lireGroupe(layout, config));
  const etat = lireEtat(groupes, layout);

  try { ctx.css(CSS_ID, CSS); }
  catch { /* greffon tolérant : la mise en forme reste celle de la vue. */ }
  layout.setAttribute(ACTIVE, 'on');

  const comptes = new Array(10).fill(0);
  const etapes = [
    () => instantaneEtat(layout, groupes, etat),
    () => marquerRevision(ctx, layout, groupes),
    () => reconcilerActivation(layout, groupes),
    () => transitionsProjetees(groupes),
    () => memoriserFocus(champ),
    () => pontAnnonce(ctx, layout, etat),
    () => etatArete(layout),
    () => tallyActivation(layout, groupes),
    () => etatRepli(layout, groupes),
    () => sceauAudit(ctx, layout, comptes, etat, groupes),
  ];
  etapes.forEach((etape, index) => {
    try { comptes[index] = Math.max(0, Number(etape()) || 0); }
    catch { comptes[index] = 0; }
  });
});
