import { register } from './registry.js';

/* Lentille E052 — performance de rendu appliquée au focus et à la tabulation
   de la vue Constellation. Dix chantiers déterministes et locaux : un seul
   écouteur délégué, un cache d'index, des écritures conditionnelles, une
   feuille de style unique et aucune horloge ni tirage aléatoire.
   Greffon tolérant : toute anomalie locale est neutralisée sans bruit. */

const CSS_ID = 'constellation-e052';
const SELECT_FIELD = '.constellation-field';
const SELECT_CAPTION = '.constellation-caption';
const SELECT_TARGETS = 'button[data-const-key]';
const BUDGET_REF = 4; /* 1 écouteur + 1 cache + 1 anneau + 1 écriture atomique. */

/* Convertit une valeur en entier fini, sans mauvaise surprise de type. */
function entier(valeur) {
  const nombre = Number(valeur);
  return Number.isFinite(nombre) ? Math.trunc(nombre) : 0;
}

/* Création du nœud par le contrat ctx.el, avec repli silencieux. */
function noeud(ctx, balise, classe, texte) {
  if (typeof ctx.el === 'function') return ctx.el(balise, classe, texte);
  const doc = ctx.layout.ownerDocument;
  const sortie = doc.createElement(balise);
  if (classe) sortie.className = classe;
  if (texte !== undefined) sortie.textContent = texte;
  return sortie;
}

register('E052', (ctx) => {
  /* Contrat : sans layout exploitable, aucun ajout DOM n'est tenté. */
  const layout = ctx && ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;

  let champ;
  let caption;
  let cibles;
  try {
    champ = layout.querySelector(SELECT_FIELD);
    caption = layout.querySelector(SELECT_CAPTION) || layout;
    cibles = champ ? Array.from(champ.querySelectorAll(SELECT_TARGETS)) : [];
  } catch {
    return;
  }

  /* Feuille unique : toutes les règles sont écrites en une seule injection. */
  try {
    if (typeof ctx.css === 'function') {
      ctx.css(CSS_ID, `
/* E052-04 — le compteur ne relance pas la mise en page du reste de la vue. */
.constellation-caption[data-e052-contain="1"] {
  contain: layout style;
}
/* E052-05 — anneau plat : pas de flou, pas de nouvelle boîte à repeindre. */
.constellation-field[data-e052-ready="1"] button[data-const-key]:focus-visible {
  outline: 2px solid var(--gold-bright, #e6b96f);
  outline-offset: 2px;
  box-shadow: none;
  transition: none;
}
/* E052-06 — largeur réservée : le changement de chiffre ne décale rien. */
#e052-tabcount {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 12ch; padding: 2px 6px; margin-left: 8px;
  border: 1px solid rgba(178, 139, 221, .35); border-radius: 6px;
  color: var(--muted-2); font-size: 9px;
  font-variant-numeric: tabular-nums; white-space: nowrap;
}
/* E052-08 — pendant la tabulation, aucun effet coûteux n'est peint. */
.constellation-field[data-e052-ready="1"][data-e052-nav="1"] button[data-const-key] {
  box-shadow: none;
  transition: none;
}
/* E052-09 — mouvement réduit : aucune transition animée au focus. */
.constellation-field[data-e052-ready="1"][data-e052-motion="reduced"] button[data-const-key] {
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  .constellation-field[data-e052-ready="1"] button[data-const-key] { transition: none; }
}
/* E052-10 — une seule écriture active toutes les règles en même temps. */
.constellation-field[data-e052-ready="1"] { contain: style; }
      `);
    }
  } catch {
    return;
  }

  /* État partagé entre la délégation de focus, le curseur et la pastille. */
  let courant = -1;
  let curseur = -1;
  let pastille = null;

  /* Écrit la pastille sans toucher au DOM si le rang n'a pas changé. */
  function metreAJour(index) {
    if (!pastille) return;
    const total = cibles.length;
    const rang = Math.max(0, entier(index)) + 1;
    const cout = total + 1;
    pastille.textContent = 'Tab ' + rang + ' / ' + total + ' · ' + cout + '/' + BUDGET_REF + ' u';
  }

  /* E052-03 — curseur à écriture conditionnelle : un seul attribut posé,
     uniquement lors d'un changement réel de cible focalisée. */
  function poserCurseur(index) {
    if (index < 0 || index === curseur) return;
    if (curseur >= 0 && cibles[curseur]) cibles[curseur].removeAttribute('data-e052-cursor');
    if (cibles[index]) cibles[index].setAttribute('data-e052-cursor', '1');
    curseur = index;
  }

  /* E052-01 — un seul écouteur focusin délégué sur le champ, en phase capture. */
  if (champ && typeof champ.addEventListener === 'function') {
    champ.addEventListener('focusin', (event) => {
      if (!champ.isConnected) return;
      const cible = event.target;
      if (!cible || typeof cible.getAttribute !== 'function') return;
      const rangBrut = cible.getAttribute('data-e052-index');
      if (rangBrut === null) return;
      const index = entier(rangBrut);
      if (index < 0 || index >= cibles.length) return;
      if (champ.hasAttribute('data-e052-nav')) champ.removeAttribute('data-e052-nav');
      if (index === courant) return;
      courant = index;
      poserCurseur(index);
      metreAJour(index);
    }, true);
  }

  /* E052-02 — cache d'index : chaque cible porte son rang et son rôle,
     calculés une seule fois au lieu d'un querySelector par tabulation. */
  cibles.forEach((cible, index) => {
    try {
      cible.setAttribute('data-e052-index', String(index));
      const role = cible.classList.contains('const-sun') ? 'sun'
        : cible.classList.contains('const-planet') ? 'planet'
          : cible.classList.contains('const-moon') ? 'moon' : 'autre';
      cible.setAttribute('data-e052-role', role);
    } catch {
      /* Attribut facultatif : on continue avec les autres cibles. */
    }
  });

  /* E052-06 — pastille « Tab N / total » à largeur fixe et chiffres alignés. */
  try {
    if (cibles.length) {
      pastille = noeud(ctx, 'span', 'e052-tabcount', '');
      pastille.id = 'e052-tabcount';
      pastille.setAttribute('role', 'status');
      pastille.setAttribute('aria-live', 'polite');
      pastille.setAttribute('aria-atomic', 'true');
      const cout = cibles.length + 1;
      pastille.title = 'Parcours de tabulation : ' + cout + ' unités pour ' +
        cibles.length + ' cibles ; référence ' + BUDGET_REF + ' unités.';
      pastille.setAttribute('aria-label', pastille.title);
      metreAJour(0);
      caption.appendChild(pastille);
    }
  } catch {
    pastille = null;
  }

  /* E052-07 — écouteur borné au champ éphémère, jamais au document : les
     rendus successifs ne laissent aucun écouteur accumulé. */
  if (champ && typeof champ.addEventListener === 'function') {
    try {
      champ.setAttribute('data-e052-bound', '1');
      champ.addEventListener('keydown', (event) => {
        if (!champ.isConnected) return;
        if (event.key !== 'Tab') return;

        /* E052-08 — direction relevée sans intercepter le Tab natif. */
        champ.setAttribute('data-e052-nav', '1');
        champ.setAttribute('data-e052-dir', event.shiftKey ? 'back' : 'forward');
      }, true);
    } catch {
      /* Le suivi de tabulation est facultatif. */
    }
  }

  /* E052-04 — confinement de la légende où vit la pastille. */
  try {
    caption.setAttribute('data-e052-contain', '1');
  } catch {
    /* Le confinement est une optimisation : son échec est sans effet. */
  }

  /* E052-09 — trace du mode de mouvement, lue une seule fois. */
  try {
    const reduit = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
    if (champ) champ.setAttribute('data-e052-motion', reduit ? 'reduced' : 'full');
  } catch {
    /* Valeur par défaut : aucune règle de mouvement réduit ne s'applique. */
  }

  /* E052-10 — activation atomique : dernière écriture, après toutes les autres. */
  try {
    if (champ) {
      champ.setAttribute('data-e052-count', String(cibles.length));
      champ.setAttribute('data-e052-ready', '1');
    }
  } catch {
    /* Sans activation, la feuille reste inactive : aucun rendu perturbé. */
  }
});
