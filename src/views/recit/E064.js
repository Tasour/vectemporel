import { register } from './registry.js';

/* Lentille E064 — Navigation clavier (vue Récit).
   Dix chantiers additifs et distincts (E064-01 … E064-10) : aide intégrée,
   raccourcis de lecture, sauts ciblés, sortie du fil, focus renforcé et
   exposition des touches aux lecteurs d'écran. Aucun texte n'est supprimé,
   aucun gestionnaire existant n'est réécrit. Un écouteur clavier unique est
   armé une seule fois en phase de capture ; chaque changement de point
   reconstruit le DOM, les repères sont donc relus à chaque frappe. Toute
   défaillance locale est neutralisée sans interrompre le rendu. */

const STYLE_ID = 'recit-e064';

/* Le tableau sert à la fois au panneau d'aide (E064-01) et à la cohérence des
   libellés : aucune touche n'est inventée, elles correspondent toutes à une
   action réellement installée plus bas. */
const RACCOURCIS = [
  ['J', 'Point suivant'],
  ['K', 'Point précédent'],
  ['Page↓ / Page↑', 'Point suivant ou précédent depuis le titre'],
  ['/', 'Atteindre la recherche et sélectionner la requête'],
  ['F', 'Aller au point courant dans le fil'],
  ['Échap', 'Quitter le fil et revenir au titre'],
  ['D', 'Atteindre la traçabilité du point'],
  ['0', 'Revenir au premier point'],
];

/* Une seule feuille de styles, préfixée recit-e064-. Le contour double est un
   indice de forme, pas seulement de couleur. Le repli @supports couvre les
   navigateurs qui ignorent :focus-visible. */
const RULES = `
.recit-e064-cible:focus-visible{outline:3px double var(--gold-bright,#f5e9d0);outline-offset:2px;border-radius:6px;box-shadow:0 0 0 1px rgba(0,0,0,.55)}
@supports not selector(:focus-visible){.recit-e064-cible:focus{outline:3px double var(--gold-bright,#f5e9d0);outline-offset:2px;border-radius:6px}}
.recit-e064-fil:focus-visible::before{content:"▶ ";font-size:9px;color:var(--gold-bright,#f5e9d0)}
@supports not selector(:focus-visible){.recit-e064-fil:focus::before{content:"▶ ";font-size:9px;color:var(--gold-bright,#f5e9d0)}}
.recit-e064-aide{margin-top:14px;padding-top:10px;border-top:1px solid var(--line,rgba(255,255,255,.12));font-size:9px;color:var(--muted,#9aa4b2)}
.recit-e064-aide-titre{min-height:32px;display:flex;align-items:center;cursor:pointer;color:var(--gold-bright,#f5e9d0)}
.recit-e064-aide-titre:focus-visible{outline:3px double var(--gold-bright,#f5e9d0);outline-offset:2px}
.recit-e064-aide-liste{margin:8px 0 0;display:grid;grid-template-columns:auto 1fr;gap:4px 10px;align-items:baseline}
.recit-e064-aide-cle{font-variant-numeric:tabular-nums;color:var(--gold,#e6b96f);white-space:nowrap}
.recit-e064-aide-desc{margin:0;line-height:1.4}
/*TRANSITION*/`;

let clavierInstalle = false;

/* Pose un attribut seulement s'il n'existe pas : l'enrichissement reste non
   destructif, même si une autre lentille est passée avant la nôtre. */
function setOnce(node, name, value) {
  if (node && node.nodeType === 1 && !node.hasAttribute(name)) node.setAttribute(name, value);
}

/* Ajoute un jeton à une liste d'identifiants (ici aria-keyshortcuts) sans
   écraser les valeurs déjà présentes ni introduire de doublon. */
function addToken(node, name, token) {
  if (!node || !token) return;
  const courant = node.getAttribute(name) || '';
  const jetons = courant.split(/\s+/).filter(Boolean);
  if (jetons.includes(token)) return;
  jetons.push(token);
  node.setAttribute(name, jetons.join(' '));
}

/* Vrai pour les champs où l'on saisit : aucun raccourci ne doit y voler une
   touche (recherche, entraînement, éditeur). */
function estEditable(node) {
  if (!node || node.nodeType !== 1) return false;
  if (node.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName);
}

/* Le filtrage par vue : les raccourcis ne vivent que dans la vue Récit. */
function estDans(layout, node) {
  return Boolean(node && node.closest && layout && node.closest('.recit-layout'));
}

function focaliser(node, sansDefilement) {
  if (!node || typeof node.focus !== 'function') return;
  try { node.focus({ preventScroll: Boolean(sansDefilement) }); }
  catch { try { node.focus(); } catch { /* neutralisé */ } }
}

function controle(layout, fk) {
  if (!layout || typeof layout.querySelector !== 'function') return null;
  return layout.querySelector(`[data-fk="${fk}"]`);
}

function titre(layout) {
  if (!layout || typeof layout.querySelector !== 'function') return null;
  return layout.querySelector('#recit-point-title') || layout.querySelector('.recit-title');
}

function itemCourant(layout) {
  if (!layout || typeof layout.querySelector !== 'function') return null;
  return layout.querySelector('#c3a-thread [aria-current="step"]')
    || layout.querySelector('#c3a-thread .c3a-thread-item');
}

/* Active la commande d'origine : le clic déclenche le vrai gestionnaire de la
   vue (changement de point, annonce, restauration de focus). Un bouton désactivé
   est simplement ignoré. */
function activer(bouton) {
  if (!bouton || bouton.disabled || typeof bouton.click !== 'function') return;
  try { bouton.click(); } catch { /* neutralisé */ }
}

/* Garde la tabindex mobile du fil cohérente quand on y entre par le clavier :
   seul l'item visé reste point d'entrée de Tab. */
function roving(layout, item) {
  if (!layout || !item) return;
  const items = layout.querySelectorAll('#c3a-thread .c3a-thread-item');
  Array.prototype.forEach.call(items, (noeud) => {
    noeud.tabIndex = noeud === item ? 0 : -1;
  });
}

/* E064-02 … E064-07 et E064-10 : un seul écouteur, en capture sur window, posé
   une seule fois. La capture précède le routeur global (document, capture) :
   un raccourci consommé n'est donc pas réinterprété en « retour au monde ». */
function installerClavier() {
  if (clavierInstalle || typeof window === 'undefined') return;
  clavierInstalle = true;
  window.addEventListener('keydown', (event) => {
    try {
      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
      const cible = event.target;
      const layout = document.querySelector('.recit-layout');
      if (!estDans(layout, cible) || estEditable(cible)) return;
      const touche = typeof event.key === 'string' ? event.key : '';
      if (!touche) return;
      const actif = document.activeElement;
      const titreNoeud = titre(layout);

      /* E064-06 — Échap dans le fil : sortie locale, sans quitter la vue. */
      if (touche === 'Escape') {
        if (actif && actif.closest && actif.closest('#c3a-thread')) {
          event.preventDefault();
          event.stopPropagation();
          focaliser(titreNoeud, true);
        }
        return;
      }

      /* E064-04 — « / » : atteindre la recherche et sélectionner la requête. */
      if (touche === '/') {
        const recherche = (layout.querySelector('#c3a-search') || layout.querySelector('.c3a-search'));
        if (!recherche) return;
        event.preventDefault();
        event.stopPropagation();
        focaliser(recherche, false);
        try { if (recherche.value) recherche.select(); } catch { /* neutralisé */ }
        return;
      }

      const bas = touche.toLowerCase();
      switch (bas) {
        /* E064-02 — lecture rapide J / K. */
        case 'j':
          event.preventDefault(); event.stopPropagation();
          activer(controle(layout, 'c3a-next'));
          return;
        case 'k':
          event.preventDefault(); event.stopPropagation();
          activer(controle(layout, 'c3a-prev'));
          return;
        /* E064-03 — PageDown / PageUp uniquement depuis le titre (mode lecture). */
        case 'pagedown':
        case 'pageup': {
          const estTitre = titreNoeud && (actif === titreNoeud
            || (actif && actif.classList && actif.classList.contains('recit-title')));
          if (!estTitre) return;
          event.preventDefault(); event.stopPropagation();
          activer(controle(layout, bas === 'pagedown' ? 'c3a-next' : 'c3a-prev'));
          return;
        }
        /* E064-05 — entrer dans le fil au point courant. */
        case 'f': {
          const item = itemCourant(layout);
          if (!item) return;
          event.preventDefault(); event.stopPropagation();
          roving(layout, item);
          focaliser(item, false);
          return;
        }
        /* E064-07 — accès direct à la traçabilité. */
        case 'd': {
          const resume = layout.querySelector('.recit-trace summary');
          if (!resume) return;
          event.preventDefault(); event.stopPropagation();
          focaliser(resume, false);
          return;
        }
        /* E064-10 — retour au premier point. */
        case '0':
          event.preventDefault(); event.stopPropagation();
          activer(controle(layout, 'c3a-restart'));
          return;
        default:
          return;
      }
    } catch { /* neutralisé : aucun raccourci ne casse la vue */ }
  }, true);
}

/* E064-01 — panneau d'aide intégré, construit depuis le tableau commun et
   ajouté en fin de corps. Il n'existe qu'une seule fois par document. */
function chantierAide(body, el) {
  if (document.getElementById('e064-aide')) return;
  const panneau = el('details', 'recit-e064-aide');
  panneau.id = 'e064-aide';
  const sommaire = el('summary', 'recit-e064-aide-titre', 'Aide clavier : raccourcis du récit');
  sommaire.id = 'e064-aide-titre';
  const liste = el('dl', 'recit-e064-aide-liste');
  RACCOURCIS.forEach(([cle, description]) => {
    liste.appendChild(el('dt', 'recit-e064-aide-cle', cle));
    liste.appendChild(el('dd', 'recit-e064-aide-desc', description));
  });
  panneau.appendChild(sommaire);
  panneau.appendChild(liste);
  body.appendChild(panneau);
}

/* E064-08 — toutes les cibles focalisables reçoivent un repère de forme :
   contour double et, dans le fil, un marqueur « ▶ » non porté par la couleur. */
function chantierCibles(layout) {
  const selecteur = '.recit-actions button, .recit-thread-item, .recit-trace summary, '
    + '.c3a-search, .c3a-filter, .c3a-reset, .recit-body a[href], #recit-point-title';
  const cibles = layout.querySelectorAll(selecteur);
  Array.prototype.forEach.call(cibles, (noeud) => {
    noeud.classList.add('recit-e064-cible');
    if (noeud.classList.contains('recit-thread-item')) noeud.classList.add('recit-e064-fil');
  });
}

/* E064-09 — les touches installées sont déclarées sur les commandes elles-
   mêmes (aria-keyshortcuts) et rappelées dans un title si aucun n'existe. */
function chantierRaccourcis(layout) {
  const ajouter = (noeud, touche, indication) => {
    if (!noeud) return;
    addToken(noeud, 'aria-keyshortcuts', touche);
    setOnce(noeud, 'title', indication);
  };
  ajouter(controle(layout, 'c3a-prev'), 'K', 'Point précédent (raccourci K)');
  ajouter(controle(layout, 'c3a-next'), 'J', 'Point suivant (raccourci J)');
  ajouter(controle(layout, 'c3a-restart'), '0', 'Revenir au premier point (raccourci 0)');
  const recherche = layout.querySelector('#c3a-search') || layout.querySelector('.c3a-search');
  ajouter(recherche, '/', 'Rechercher un point (raccourci /)');
  const resume = layout.querySelector('.recit-trace summary');
  ajouter(resume, 'D', 'Traçabilité du point (raccourci D)');
}

/* Isolateur : un chantier défaillant n'empêche pas les neuf autres. */
function safe(fn) {
  try { fn(); } catch { /* neutralisé : la vue reste lisible et inchangée */ }
}

register('E064', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (typeof document === 'undefined') return;
  const racine = layout || stage;
  if (!racine || typeof racine.querySelector !== 'function') return;

  let mouvement = false;
  try { mouvement = Boolean(typeof reducedMotion === 'function' && !reducedMotion()); }
  catch { mouvement = false; }
  const transition = mouvement
    ? '.recit-e064-aide-liste{opacity:.85;transition:opacity .16s ease}.recit-e064-aide[open] .recit-e064-aide-liste{opacity:1}'
    : '';

  safe(() => css(STYLE_ID, RULES.replace('/*TRANSITION*/', transition)));
  safe(() => installerClavier());
  safe(() => chantierCibles(racine));
  safe(() => chantierRaccourcis(racine));
  const corps = racine.querySelector('.recit-body');
  if (corps) safe(() => chantierAide(corps, el));
});
