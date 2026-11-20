import { register } from './registry.js';

/* Lentille V2 E065 — adaptabilité responsive avancée des métriques chiffrées
   de la vue Constellation. Seconde passe : dix chantiers inédits, tous
   implémentés, sans réseau, sans source aléatoire et sans minuteur ni boucle
   d'animation propre. Préfixe exclusif : v2e065 (aucune collision passe 1). */

/* Lecture bornée d'une mesure : le rectangle réel d'abord, puis la fenêtre. */
function nombre(valeur, repli) {
  const n = parseFloat(valeur);
  return Number.isFinite(n) ? n : repli;
}

function borne(valeur, min, max) {
  return Math.max(min, Math.min(max, valeur));
}

function mesure(node) {
  let largeur = 0;
  let hauteur = 0;
  try {
    if (node && typeof node.getBoundingClientRect === 'function') {
      const rect = node.getBoundingClientRect();
      largeur = rect.width;
      hauteur = rect.height;
    }
  } catch {
    largeur = 0;
    hauteur = 0;
  }
  if (!Number.isFinite(largeur) || largeur <= 0) {
    largeur = typeof window !== 'undefined' && Number.isFinite(window.innerWidth)
      ? window.innerWidth : 1000;
  }
  if (!Number.isFinite(hauteur) || hauteur <= 0) {
    hauteur = typeof window !== 'undefined' && Number.isFinite(window.innerHeight)
      ? window.innerHeight : 800;
  }
  return {
    largeur: Math.max(0, Math.round(largeur)),
    hauteur: Math.max(0, Math.round(hauteur)),
  };
}

/* Formatage français déterministe : Intl est une fonction pure de la locale. */
const formateurs = {};
function formaterNombre(valeur, compact) {
  const cle = compact ? 'compact' : 'plein';
  try {
    if (typeof Intl === 'undefined' || typeof Intl.NumberFormat !== 'function') {
      return String(valeur);
    }
    if (!formateurs[cle]) {
      formateurs[cle] = compact
        ? new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 })
        : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
    }
    return formateurs[cle].format(valeur);
  } catch {
    return String(valeur);
  }
}

function tronquer(texte, budget) {
  const chaine = String(texte || '');
  if (chaine.length <= budget) return chaine;
  return chaine.slice(0, Math.max(0, budget - 1)).trimEnd() + '…';
}

/* Réutilise un nœud déjà posé, sinon le crée via le contrat ctx.el. */
function preparer(parent, id, tag, classe, texte, ctx) {
  if (!parent || typeof parent.querySelector !== 'function') return null;
  const existant = parent.querySelector('#' + id);
  if (existant) return existant;
  let noeud = null;
  if (ctx && typeof ctx.el === 'function') {
    noeud = ctx.el(tag, classe, texte);
  } else {
    const doc = parent.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (doc && typeof doc.createElement === 'function') {
      noeud = doc.createElement(tag);
      if (classe) noeud.className = classe;
      if (texte !== undefined) noeud.textContent = texte;
    }
  }
  if (!noeud) return null;
  noeud.id = id;
  parent.appendChild(noeud);
  return noeud;
}

/* Ajoute un glyphe décoratif et le libellé complet : jamais la couleur seule. */
function marquer(pastille, glyphe, texteComplet) {
  if (!pastille) return;
  if (!pastille.querySelector('.v2e065-glyphe')) {
    const doc = pastille.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc || typeof doc.createElement !== 'function') return;
    const embleme = doc.createElement('span');
    embleme.className = 'v2e065-glyphe';
    embleme.setAttribute('aria-hidden', 'true');
    embleme.textContent = glyphe;
    pastille.insertBefore(embleme, pastille.firstChild);
  }
  pastille.setAttribute('title', texteComplet);
  pastille.setAttribute('aria-label', texteComplet);
}

/* Chaque chantier est isolé : une mesure manquante n'abîme pas les autres. */
function protege(chantier) {
  try {
    chantier();
  } catch {
    /* Chantier neutralisé, rendu nominal poursuivi. */
  }
}

function collecter(ctx) {
  const layout = ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return null;
  const dims = mesure(layout);
  return {
    ctx,
    layout,
    caption: layout.querySelector('.constellation-caption') || layout,
    etat: layout.querySelector('.constellation-state'),
    soleils: Array.prototype.slice.call(layout.querySelectorAll('.const-sun')),
    planetes: Array.prototype.slice.call(layout.querySelectorAll('.const-planet')),
    lunes: Array.prototype.slice.call(layout.querySelectorAll('.const-moon')),
    largeur: dims.largeur,
    hauteur: dims.hauteur,
  };
}

function appliquer(donnees) {
  const { layout, caption, ctx, soleils, planetes, lunes, largeur, hauteur } = donnees;
  const compact = largeur < 620;
  const totalNoeuds = soleils.length + planetes.length + lunes.length;

  layout.setAttribute('data-v2e065', 'on');

  /* Conteneur partagé : grille responsive réutilisable d'un rendu à l'autre. */
  const grille = preparer(caption, 'v2e065-grille', 'div', 'v2e065-grille', '', ctx);
  if (grille) {
    grille.setAttribute('role', 'group');
    grille.setAttribute('aria-label', 'Métriques chiffrées adaptatives');
  }
  const cible = grille || caption;

  /* Région live unique pour les annonces V2, distincte de la passe 1. */
  const live = preparer(layout, 'v2e065-live', 'p', 'v2e065-sr', '', ctx);
  if (live) {
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
  }
  const annoncer = texte => { if (live) live.textContent = texte; };

  /* E065-01 — Hauteur mesurée, ratio d'aspect et orientation du champ. */
  protege(() => {
    const ratio = hauteur > 0 ? largeur / hauteur : 0;
    const aspect = ratio < 0.85 ? 'portrait' : ratio > 1.35 ? 'paysage' : 'carre';
    const nom = aspect === 'portrait' ? 'Portrait' : aspect === 'paysage' ? 'Paysage' : 'Carré';
    layout.setAttribute('data-v2e065-hauteur', String(hauteur));
    layout.setAttribute('data-v2e065-ratio', ratio.toFixed(2));
    layout.setAttribute('data-v2e065-aspect', aspect);
    layout.style.setProperty('--v2e065-ratio', ratio.toFixed(2));
    const pastille = preparer(cible, 'v2e065-aspect', 'span', 'v2e065-metric', '', ctx);
    if (pastille) {
      pastille.textContent = 'Champ ' + nom + ' · ' + largeur + ' × ' + hauteur + ' px';
      marquer(pastille, '◫', 'Champ ' + nom + ' : ' + largeur + ' pixels de large sur ' + hauteur + ' pixels de haut');
    }
  });

  /* E065-02 — Débordement réellement mesuré du bandeau de métriques. */
  protege(() => {
    let depassement = 0;
    try {
      if (caption && typeof caption.scrollWidth === 'number' && typeof caption.clientWidth === 'number') {
        depassement = Math.max(0, caption.scrollWidth - caption.clientWidth);
      }
    } catch {
      depassement = 0;
    }
    const deborde = depassement > 1;
    layout.setAttribute('data-v2e065-debordement', deborde ? 'oui' : 'non');
    const pastille = preparer(cible, 'v2e065-debordement', 'span', 'v2e065-metric', '', ctx);
    if (pastille) {
      pastille.textContent = deborde ? 'Bandeau dense — pastilles compactées' : 'Bandeau ajusté';
      marquer(pastille, deborde ? '⚠' : '✓', deborde
        ? 'Débordement de ' + depassement + ' pixels : les pastilles sont compactées'
        : 'Aucun débordement détecté dans le bandeau');
    }
    if (deborde) annoncer('Métriques compactées : le bandeau dépasse de ' + depassement + ' pixels.');
  });

  /* E065-03 — Total des nœuds en chiffres français, compact sur champ étroit. */
  protege(() => {
    const plein = formaterNombre(totalNoeuds, false);
    const court = formaterNombre(totalNoeuds, compact);
    layout.setAttribute('data-v2e065-total', String(totalNoeuds));
    layout.setAttribute('data-v2e065-total-fr', plein);
    const pastille = preparer(cible, 'v2e065-total', 'span', 'v2e065-metric', '', ctx);
    if (pastille) {
      pastille.textContent = 'Nœuds : ' + court;
      marquer(pastille, '∑', 'Total des nœuds : ' + plein + ' (ères, repères et points confondus)');
    }
  });

  /* E065-04 — Budget de caractères et troncature contrôlée avec repli complet. */
  protege(() => {
    const budget = Math.max(6, Math.floor(largeur / 9));
    layout.style.setProperty('--v2e065-budget', budget + 'ch');
    layout.setAttribute('data-v2e065-budget', String(budget));
    const resume = soleils.length + ' ères · ' + planetes.length + ' repères · ' + lunes.length + ' points';
    const court = tronquer(resume, budget);
    const pastille = preparer(cible, 'v2e065-budget', 'span', 'v2e065-metric', '', ctx);
    if (pastille) {
      pastille.textContent = court;
      marquer(pastille, '✂', 'Résumé complet : ' + resume);
    }
  });

  /* E065-05 — Écartement fluide des pastilles, borné entre 4 et 16 px. */
  protege(() => {
    const ecart = Math.round(borne(largeur / 90, 4, 16));
    layout.style.setProperty('--v2e065-gap', ecart + 'px');
    layout.setAttribute('data-v2e065-gap', ecart + 'px');
    if (grille) grille.setAttribute('data-v2e065-gap', ecart + 'px');
  });

  /* E065-06 — Grille auto-fit : largeur de colonne déduite de la place réelle. */
  protege(() => {
    const colonne = Math.round(borne(largeur / 12, 96, 190));
    layout.style.setProperty('--v2e065-col', colonne + 'px');
    layout.setAttribute('data-v2e065-col', colonne + 'px');
    if (grille) {
      grille.setAttribute('data-v2e065-colonnes', colonne + 'px');
      layout.setAttribute('data-v2e065-nb-colonnes', String(Math.max(1, Math.floor(largeur / colonne))));
    }
  });

  /* E065-07 — Marquage textuel de chaque pastille, jamais la seule couleur. */
  protege(() => {
    const pastilles = cible.querySelectorAll('.v2e065-metric');
    pastilles.forEach(pastille => {
      if (!pastille.querySelector('.v2e065-glyphe')) {
        const doc = pastille.ownerDocument || (typeof document !== 'undefined' ? document : null);
        if (doc && typeof doc.createElement === 'function') {
          const embleme = doc.createElement('span');
          embleme.className = 'v2e065-glyphe';
          embleme.setAttribute('aria-hidden', 'true');
          embleme.textContent = '•';
          pastille.insertBefore(embleme, pastille.firstChild);
        }
      }
      if (!pastille.getAttribute('aria-label')) {
        pastille.setAttribute('aria-label', pastille.textContent.trim());
      }
      pastille.setAttribute('data-v2e065-marque', 'texte+glyphe');
    });
    layout.setAttribute('data-v2e065-glyphes', String(pastilles.length));
  });

  /* E065-08 — Précision décimale adaptative au régime, arrondi déterministe. */
  protege(() => {
    const precision = compact ? 1 : largeur < 1000 ? 2 : 3;
    const facteur = Math.pow(10, precision);
    const arrondi = valeur => Math.round(valeur * facteur) / facteur;
    const densite = totalNoeuds / Math.max(1, largeur / 100);
    const texte = arrondi(densite).toFixed(precision);
    layout.setAttribute('data-v2e065-precision', String(precision));
    layout.setAttribute('data-v2e065-densite100', texte);
    const pastille = preparer(cible, 'v2e065-precision', 'span', 'v2e065-metric', '', ctx);
    if (pastille) {
      pastille.textContent = 'Densité ' + texte + ' nœud/100 px';
      marquer(pastille, '⌁', 'Densité : ' + texte + ' nœud pour 100 pixels de large');
    }
  });

  /* E065-09 — Indicateur de charge classé, libellé et forme non colorés. */
  protege(() => {
    const densite = totalNoeuds / Math.max(1, largeur / 100);
    const niveau = densite < 1 ? 'faible' : densite < 2.5 ? 'moyen' : 'eleve';
    const libelle = niveau === 'faible' ? 'Faible' : niveau === 'moyen' ? 'Moyenne' : 'Élevée';
    const glyphe = niveau === 'faible' ? '○' : niveau === 'moyen' ? '◐' : '●';
    layout.setAttribute('data-v2e065-charge', niveau);
    const pastille = preparer(cible, 'v2e065-charge', 'span', 'v2e065-metric', '', ctx);
    if (pastille) {
      pastille.textContent = 'Charge ' + libelle;
      marquer(pastille, glyphe, 'Charge de la constellation : ' + libelle
        + ' (' + densite.toFixed(2) + ' nœud/100 px)');
    }
    if (niveau === 'eleve') {
      annoncer('Charge élevée : ' + totalNoeuds + ' nœuds sur ' + largeur + ' pixels de large.');
    }
  });

  /* E065-10 — Netteté DPR bornée à 2 et repli sur mouvement réduit. */
  protege(() => {
    let brut = 1;
    try {
      if (typeof window !== 'undefined' && Number.isFinite(window.devicePixelRatio)) {
        brut = window.devicePixelRatio;
      }
    } catch {
      brut = 1;
    }
    const nettete = Math.min(2, Math.max(1, brut));
    layout.setAttribute('data-v2e065-dpr', String(brut));
    layout.setAttribute('data-v2e065-dpr-borne', String(nettete));
    layout.style.setProperty('--v2e065-dpr', String(nettete));
    let reduit = false;
    try {
      reduit = !!(ctx && typeof ctx.reducedMotion === 'function' && ctx.reducedMotion());
    } catch {
      reduit = false;
    }
    layout.setAttribute('data-v2e065-motion', reduit ? 'reduce' : 'full');
    if (reduit) layout.classList.add('v2e065-steady');
    else layout.classList.remove('v2e065-steady');
    const pastille = preparer(cible, 'v2e065-dpr', 'span', 'v2e065-metric', '', ctx);
    if (pastille) {
      pastille.textContent = 'Netteté ×' + nettete.toFixed(1) + (reduit ? ' · sobre' : '');
      marquer(pastille, '◇', 'Résolution bornée à ' + nettete.toFixed(1)
        + (reduit ? ' ; mouvement réduit activé' : ' ; animations autorisées'));
    }
  });
}

const CSS = `
.v2e065-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.constellation-layout[data-v2e065]{--v2e065-gap:8px;--v2e065-col:120px;--v2e065-budget:40ch;--v2e065-dpr:1}
#v2e065-grille{display:grid;grid-template-columns:repeat(auto-fit,minmax(var(--v2e065-col,120px),1fr));gap:var(--v2e065-gap,8px);width:100%;margin-top:4px}
.v2e065-metric{display:block;max-width:min(100%,var(--v2e065-budget,40ch));overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased}
.v2e065-glyphe{display:inline-block;margin-right:4px;font-weight:700;color:var(--gold-bright)}
.constellation-layout[data-v2e065-debordement="oui"] #v2e065-grille{gap:4px;grid-template-columns:repeat(auto-fit,minmax(88px,1fr))}
.constellation-layout[data-v2e065-motion="reduce"] .v2e065-metric,
.constellation-layout[data-v2e065-motion="reduce"] #v2e065-grille{transition:none}
@media (prefers-reduced-motion: reduce){.v2e065-metric,#v2e065-grille{transition:none!important}}
`;

register('E065', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;

  /* Feuille unique, injectée une seule fois par le registre. */
  css('constellation-v2-e065', CSS);

  const relancer = () => {
    const donnees = collecter(ctx);
    if (donnees) appliquer(donnees);
  };
  relancer();

  /* Un seul écouteur de redimensionnement, réappliqué sur la passe courante. */
  const CLE = '__v2e065_resize';
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    const precedent = window[CLE];
    if (typeof precedent === 'function' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('resize', precedent);
    }
    const surRedimension = () => {
      try {
        const vivant = typeof document !== 'undefined'
          ? document.querySelector('.constellation-layout[data-v2e065]') : null;
        if (vivant) appliquer(collecter({ ...ctx, layout: vivant }));
      } catch {
        /* Mise à jour ignorée sans effet sur la vue. */
      }
    };
    window[CLE] = surRedimension;
    window.addEventListener('resize', surRedimension, { passive: true });
  }
});
