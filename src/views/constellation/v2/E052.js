import { register } from './registry.js';

/* Lentille V2 E052 — performance de rendu du focus et de la tabulation.
   Seconde passe : dix chantiers inédits, tous implémentés, sans réseau ni
   source aléatoire, sans horloge ni boucle d'animation propre. Chaque
   chantier est local, dégradable et tolère un DOM incomplet. */

const CSS_ID = 'constellation-v2-e052';
const SEL_FIELD = '.constellation-field';
const SEL_TARGETS = 'button[data-const-key]';
const ANCHOR_KEY = '__v2e052_anchor';
const BUDGET_REF = 12; /* Référence : douze arrêts de tabulation au plus. */
const MARQUEURS = [
  'data-v2e052-inert', 'data-v2e052-visual-rank', 'data-v2e052-anchor',
  'data-v2e052-restored', 'data-v2e052-edge', 'data-v2e052-pos',
  'data-v2e052-group', 'data-v2e052-promoted',
];

/* Conversion défensive en entier fini, sans mauvaise surprise de type. */
function entierValeur(valeur) {
  const nombre = Number(valeur);
  return Number.isFinite(nombre) ? Math.trunc(nombre) : 0;
}

/* Fabrication du nœud par le contrat ctx.el, avec repli silencieux. */
function noeudV2(ctx, balise, classe, texte) {
  if (typeof ctx.el === 'function') return ctx.el(balise, classe, texte);
  const doc = (ctx.layout && ctx.layout.ownerDocument) || document;
  const sortie = doc.createElement(balise);
  if (classe) sortie.className = classe;
  if (texte !== undefined) sortie.textContent = texte;
  return sortie;
}

/* Résolution d'une cible appartenant bien au champ courant. */
function cibleDuChamp(champ, evenement) {
  const cible = evenement && evenement.target;
  if (!cible || cible.nodeType !== 1 || typeof cible.getAttribute !== 'function') return null;
  if (!cible.hasAttribute('data-const-key')) return null;
  if (!champ.contains || !champ.contains(cible)) return null;
  return cible;
}

register('E052', (ctx) => {
  /* Garde d'entrée obligatoire : sans layout courant, aucun ajout au DOM. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  if (typeof layout.querySelector !== 'function') return;

  let champ = null;
  let caption = null;
  let cibles = [];
  try {
    champ = layout.querySelector(SEL_FIELD);
    caption = layout.querySelector('.constellation-caption') || champ || layout;
    cibles = champ ? Array.from(champ.querySelectorAll(SEL_TARGETS)) : [];
  } catch {
    return;
  }
  if (!champ || !cibles.length) return;

  /* Feuille unique de la lentille, injectée une seule fois. */
  try {
    css(CSS_ID, `
/* v2e052 — région live masquée, mais bien présente pour les lecteurs d'écran. */
.v2e052-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
/* v2e052-05 — isolation de la couche de peinture du contour de focus. */
.constellation-field[data-v2e052-ready="1"]{contain:paint;isolation:isolate}
/* v2e052-05 — contour net : aucun flou, aucune ombre repeinte au déplacement. */
.constellation-field[data-v2e052-ready="1"] button[data-const-key]:focus-visible{outline:2px solid var(--gold-bright,#e6b96f);outline-offset:2px;box-shadow:none;transition:none}
/* v2e052-09 — promotion de la seule cible focalisée, retirée au focusout. */
.constellation-field button[data-const-key][data-v2e052-promoted="1"]{will-change:outline-color}
/* v2e052-01 — une cible inerte ne porte aucun accent visuel. */
.constellation-field button[data-const-key][data-v2e052-inert="1"]{opacity:.5}
/* v2e052-06 — trait de début de groupe, doublé d'un attribut lisible. */
.constellation-field button[data-const-key][data-v2e052-edge="debut"]{border-left:2px solid var(--gold,#b2894e)}
/* v2e052-07 — pastille de budget à largeur réservée, chiffres alignés. */
.v2e052-budget{display:inline-flex;align-items:center;justify-content:center;min-width:16ch;padding:2px 6px;margin-left:8px;border:1px solid rgba(178,139,221,.35);border-radius:6px;color:var(--muted-2);font-size:9px;font-variant-numeric:tabular-nums;white-space:nowrap}
@media (prefers-reduced-motion:reduce){.constellation-field button[data-const-key]{transition:none!important}}
      `);
  } catch {
    return;
  }

  /* E052-01 — inventaire idempotent des arrêts : remise à zéro des marqueurs
     d'une passe précédente, puis tri des cibles réellement focalisables. */
  cibles.forEach((cible) => {
    MARQUEURS.forEach((attribut) => {
      try { cible.removeAttribute(attribut); } catch { /* attribut facultatif */ }
    });
  });

  const vue = (champ.ownerDocument && champ.ownerDocument.defaultView) || null;
  const effectives = [];
  let inertes = 0;
  cibles.forEach((cible, index) => {
    let inerte = cible.hasAttribute('hidden') || Boolean(cible.disabled)
      || cible.getAttribute('aria-hidden') === 'true';
    if (!inerte && vue && typeof vue.getComputedStyle === 'function') {
      try {
        const style = vue.getComputedStyle(cible);
        inerte = style.display === 'none' || style.visibility === 'hidden';
      } catch {
        inerte = false;
      }
    }
    try {
      if (inerte) {
        cible.setAttribute('data-v2e052-inert', '1');
        inertes += 1;
      } else {
        cible.removeAttribute('data-v2e052-inert');
        effectives.push({ noeud: cible, index });
      }
    } catch {
      /* Attribut facultatif : on poursuit l'inventaire. */
    }
  });
  if (!effectives.length) return;

  /* E052-02 — lecture géométrique groupée : toutes les mesures sont prises
     dans une seule bouche sans écriture, puis comparées à l'ordre du DOM. */
  const mesures = effectives.map((entree) => {
    let haut = 0;
    let gauche = 0;
    try {
      const rect = entree.noeud.getBoundingClientRect();
      haut = Number(rect.top) || 0;
      gauche = Number(rect.left) || 0;
    } catch {
      haut = 0;
      gauche = 0;
    }
    return { index: entree.index, haut, gauche };
  });
  const ordreVisuel = mesures.slice().sort((a, b) => {
    const ecart = a.haut - b.haut;
    if (Math.abs(ecart) > 4) return ecart;
    return a.gauche - b.gauche;
  });
  let ecartsOrdre = 0;
  ordreVisuel.forEach((mesure, rangVisuel) => {
    if (mesure.index !== effectives[rangVisuel].index) ecartsOrdre += 1;
    try {
      const noeud = cibles[mesure.index];
      if (noeud) noeud.setAttribute('data-v2e052-visual-rank', String(rangVisuel + 1));
    } catch {
      /* Marqueur facultatif. */
    }
  });

  /* E052-03 — ancre de focus par clé logique, conservée sur un objet durable.
     Le champ étant recréé à chaque rendu, la clé survit au DOM éphémère. */
  let ancre = '';
  try {
    if (typeof window !== 'undefined') ancre = String(window[ANCHOR_KEY] || '');
  } catch {
    ancre = '';
  }
  try {
    if (ancre) {
      const retabli = effectives.find((entree) => entree.noeud.getAttribute('data-const-key') === ancre);
      if (retabli) retabli.noeud.setAttribute('data-v2e052-restored', '1');
    }
    champ.setAttribute('data-v2e052-anchor', ancre);
  } catch {
    /* L'ancre est un repère d'audit : son échec ne bloque rien. */
  }

  /* E052-04 — région live dédupliquée : aucun texte réécrit à l'identique. */
  let live = null;
  let dernierMessage = '';
  try {
    live = noeudV2(ctx, 'p', 'v2e052-sr', '');
    live.id = 'v2e052-live';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    caption.appendChild(live);
  } catch {
    live = null;
  }

  /* E052-05 — isolation de la couche de peinture du focus : les règles
     `contain: paint`, `isolation: isolate` et le contour net sans flou sont
     déclarées dans l'unique feuille injectée plus haut, puis activées par
     l'attribut `data-v2e052-ready` écrit en fin de passe. */

  /* E052-06 — segmentation en groupes contigus et repères de début/fin. */
  const groupes = [];
  const carteGroupes = [];
  effectives.forEach((entree) => {
    const noeud = entree.noeud;
    const nom = noeud.classList.contains('const-sun') ? 'soleil'
      : noeud.classList.contains('const-planet') ? 'repère'
        : noeud.classList.contains('const-moon') ? 'lune' : 'autre';
    let groupe = groupes[groupes.length - 1];
    if (!groupe || groupe.nom !== nom) {
      groupe = { nom, rangs: [] };
      groupes.push(groupe);
    }
    groupe.rangs.push(carteGroupes.length);
    carteGroupes.push({ nom, rang: groupe.rangs.length, taille: 0 });
  });
  groupes.forEach((groupe) => {
    groupe.rangs.forEach((rang) => { carteGroupes[rang].taille = groupe.rangs.length; });
    try {
      const premier = cibles[effectives[groupe.rangs[0]].index];
      const dernier = cibles[effectives[groupe.rangs[groupe.rangs.length - 1]].index];
      if (premier) premier.setAttribute('data-v2e052-edge', 'debut');
      if (dernier) dernier.setAttribute('data-v2e052-edge', 'fin');
    } catch {
      /* Les délimiteurs restent facultatifs. */
    }
  });
  const resumeGroupes = groupes.map((groupe) => groupe.nom + ':' + groupe.rangs.length).join(',');

  /* E052-07 — budget d'arrêts comparé à la référence de douze unités. */
  const total = effectives.length;
  const ecartBudget = total - BUDGET_REF;
  const budgetTenu = ecartBudget <= 0;
  const statutBudget = budgetTenu ? 'dans_le_budget' : 'au_dessus';
  try {
    const pastille = noeudV2(ctx, 'span', 'v2e052-budget',
      total + ' / ' + BUDGET_REF + ' arrêts · ' + (budgetTenu ? 'budget tenu' : 'budget dépassé'));
    pastille.id = 'v2e052-budget';
    pastille.title = 'Arrêts de tabulation effectifs comparés à la référence de ' + BUDGET_REF + '.';
    pastille.setAttribute('aria-label', pastille.textContent);
    caption.appendChild(pastille);
  } catch {
    /* La pastille est une mesure, pas un contrôle : son échec est sans effet. */
  }

  /* E052-08 — position sémantique dans la séquence, calculée une seule fois. */
  effectives.forEach((entree, rang) => {
    try {
      entree.noeud.setAttribute('data-v2e052-pos', String(rang + 1));
      entree.noeud.setAttribute('aria-posinset', String(rang + 1));
      entree.noeud.setAttribute('aria-setsize', String(total));
      entree.noeud.setAttribute('data-v2e052-group', carteGroupes[rang].nom);
    } catch {
      /* Attributs d'aide à l'audit : on continue avec les autres cibles. */
    }
  });

  /* E052-09 — promotion de la seule cible focalisée, avec nettoyage au focusout.
     Deux écouteurs délégués sur le champ éphémère : aucun sur le document. */
  let promu = null;
  if (typeof champ.addEventListener === 'function') {
    try {
      champ.addEventListener('focusin', (evenement) => {
        if (!champ.isConnected) return;
        const cible = cibleDuChamp(champ, evenement);
        if (!cible) return;
        const cle = cible.getAttribute('data-const-key') || '';
        const pos = entierValeur(cible.getAttribute('data-v2e052-pos'));
        const info = carteGroupes[pos - 1] || { nom: 'autre', rang: pos, taille: total };

        /* E052-03 — écriture de l'ancre logique sur l'objet durable. */
        try {
          if (typeof window !== 'undefined') window[ANCHOR_KEY] = cle;
          champ.setAttribute('data-v2e052-anchor', cle);
        } catch { /* ancre facultative */ }

        /* E052-04 — annonce dédupliquée, uniquement si le texte change. */
        if (live) {
          const message = 'Arrêt ' + pos + ' sur ' + total + ' · ' + info.nom + ' '
            + info.rang + '/' + info.taille + ' · budget ' + total + '/' + BUDGET_REF + '.';
          if (message !== dernierMessage) {
            try { live.textContent = message; dernierMessage = message; } catch { /* live facultatif */ }
          }
        }

        /* E052-09 — une seule cible promue à la fois, sans accumulation. */
        try {
          if (promu && promu !== cible) promu.removeAttribute('data-v2e052-promoted');
          cible.setAttribute('data-v2e052-promoted', '1');
          promu = cible;
        } catch { /* promotion facultative */ }
      }, true);
    } catch { /* écouteur facultatif */ }

    try {
      champ.addEventListener('focusout', (evenement) => {
        if (!champ.isConnected) return;
        const suivant = evenement && evenement.relatedTarget;
        if (suivant && champ.contains && champ.contains(suivant)) return;
        try {
          if (promu) promu.removeAttribute('data-v2e052-promoted');
          promu = null;
        } catch { /* nettoyage facultatif */ }
      }, true);
    } catch { /* écouteur facultatif */ }
  }

  /* E052-10 — activation groupée : le manifeste et l'ouverture des règles
     CSS sont écrits en fin de passe, une fois le DOM stabilisé. */
  try {
    champ.setAttribute('data-v2e052-manifest',
      'cibles=' + cibles.length + ',effectives=' + total + ',inertes=' + inertes
      + ',ecarts=' + ecartsOrdre + ',budget=' + statutBudget + ',groupes=' + resumeGroupes);
    champ.setAttribute('data-v2e052-ready', '1');
  } catch {
    /* Sans activation, la feuille reste inactive : aucun rendu perturbé. */
  }
});
