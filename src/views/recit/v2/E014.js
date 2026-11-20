import { register } from './registry.js';

/* V2 lentille E014 — « Navigation clavier : repères d'orientation » (second
 * regard). La passe 1 E014 traite l'évitement, le roving tabindex, l'écho de
 * touche, l'aide locale, le fil d'Ariane du focus, les badges de touches,
 * l'ancrage après rendu, les sauts de dix points, la région d'annonce et la
 * bascule de focus renforcé. Cette passe V2 ne reprend aucun de ces chantiers :
 * elle ajoute des REPÈRES D'ORIENTATION calculés sur le DOM réel et quelques
 * commodités ciblées sur la barre de recherche, les filtres et les commandes.
 *
 * Greffon strictement additif : aucune suppression de texte, aucune
 * ré-attribution d'événement existant, aucun fichier partagé modifié. Une seule
 * classe racine `recit-v2-e014-root` posée sur `layout`, un seul bloc CSS
 * injecté via `css('recit-v2-e014', CSS)` (cssOnce garantit l'idempotence).
 * Toutes les classes créées sont préfixées `recit-v2-e014-`, tous les ids
 * d'élément préfixés `v2-e014-` (jamais `e014-`, réservé à la passe 1) et uniques.
 * Aucun appel réseau, aucune journalisation, aucun Math.random, aucune
 * animation JavaScript. Sans ce module, le récit et le fil restent utilisables.
 *
 * Les dix chantiers E014-01 … E014-10 sont détaillés dans
 * UNIFIED_AUDIT/RECIT/V2/views/E014.md.
 */

const RACINE = 'recit-v2-e014-root';
const CSS_ID = 'recit-v2-e014';
const TABLEAU_ID = 'v2-e014-tableau';

/* Sélecteur des cibles réellement tabulables, utilisé pour le comptage E014-01. */
const TABULABLES = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), '
  + 'textarea:not([disabled]), a[href], summary, [tabindex]:not([tabindex="-1"])';

/* Traduction lisible des aria-keyshortcuts rencontrés (E014-02). */
const LIBELLES_TOUCHES = {
  ArrowLeft: '← point précédent',
  ArrowRight: '→ point suivant',
  Space: 'Espace lecture',
  Digit4: '4 chronologie',
};

/* Bloc CSS unique. Les dix marqueurs de chantier sont ici, une seule fois. */
const CSS = `
/* E014-01 — tableau de bord clavier : conteneur discret des repères calculés. */
.recit-v2-e014-root .recit-v2-e014-tableau{
  margin:10px 0 4px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.02);
}
.recit-v2-e014-root .recit-v2-e014-ligne{
  margin:2px 0;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums;
}
.recit-v2-e014-root .recit-v2-e014-ligne [data-v2-e014-valeur]{color:var(--gold-bright);font-weight:700}

/* E014-02 — inventaire des raccourcis actifs : même police que les repères. */
.recit-v2-e014-root .recit-v2-e014-raccourcis{color:var(--muted)}

/* E014-03 — extrémités du fil marquées en texte, jamais par la seule couleur. */
.recit-v2-e014-root .recit-v2-e014-item[data-v2-e014-extremite="debut"]::before{
  content:'↤ début';margin-right:5px;color:var(--gold);font-size:8px;
}
.recit-v2-e014-root .recit-v2-e014-item[data-v2-e014-extremite="fin"]::before{
  content:'↦ fin';margin-right:5px;color:var(--gold);font-size:8px;
}

/* E014-04 — point courant signalé par un texte, distinct de l'état actif coloré. */
.recit-v2-e014-root .recit-v2-e014-item[data-v2-e014-courant="1"]::after{
  content:' ◀ point courant';color:var(--gold-bright);font-size:8px;font-weight:700;
}

/* E014-05 — la recherche porte un titre dérivé du statut (aucun style dédié). */

/* E014-06 — filtres actifs : coche textuelle en plus de l'aria-pressed. */
.recit-v2-e014-root .recit-v2-e014-filtre[aria-pressed="true"]::after{
  content:' ✓ actif';font-weight:700;
}

/* E014-07 — commandes indisponibles explicitées en texte. */
.recit-v2-e014-root .recit-v2-e014-action[disabled]::after{
  content:' (indisponible)';font-weight:400;
}

/* E014-08 — le raccourci « / » est rappelé dans une ligne de l'aide locale. */
.recit-v2-e014-root .recit-v2-e014-indice{color:var(--muted-2);font-style:italic}

/* E014-09 — focus renforcé, limité à la barre de recherche et aux filtres. */
.recit-v2-e014-root .recit-v2-e014-outils .c3a-search:focus-visible,
.recit-v2-e014-root .recit-v2-e014-outils .c3a-filter:focus-visible{
  outline:2px solid var(--gold-bright);outline-offset:2px;
}
.recit-v2-e014-root .recit-v2-e014-outils:focus-within{border-radius:8px;box-shadow:0 0 0 1px var(--line-strong)}

/* E014-10 — commandes regroupées en barre d'outils ARIA. */
.recit-v2-e014-root .recit-v2-e014-commandes:focus-within{
  outline:1px dashed var(--line-strong);outline-offset:3px;border-radius:8px;
}

@media (max-width:620px){
  .recit-v2-e014-root .recit-v2-e014-tableau{padding:6px 8px}
}
`;

/* ------------------------------------------------------------------------- *
 * Utilitaires silencieux : aucun greffon ne doit faire tomber le rendu.
 * ------------------------------------------------------------------------- */
function sansEchec(fonction) {
  return (...parametres) => {
    try { return fonction(...parametres); }
    catch { return undefined; } // défaillance neutralisée, sans trace console
  };
}

function present(noeud) {
  return !!(noeud && noeud.nodeType === 1);
}

function marquer(noeud, classe) {
  if (!present(noeud) || !noeud.classList) return;
  try { noeud.classList.add(classe); } catch { /* classe facultative */ }
}

function attrSiAbsent(noeud, nom, valeur) {
  if (!present(noeud) || typeof noeud.hasAttribute !== 'function' || noeud.hasAttribute(nom)) return;
  try { noeud.setAttribute(nom, String(valeur)); } catch { /* attribut facultatif */ }
}

function data(noeud, nom, valeur) {
  if (!present(noeud)) return;
  try { noeud.setAttribute(`data-v2-e014-${nom}`, String(valeur)); } catch { /* facultatif */ }
}

/* Extrait le numéro ordinal du libellé « 12. … » d'un item du fil. */
function numeroDe(noeud) {
  const texte = String((present(noeud) && noeud.textContent) || '').trim();
  const trouve = texte.match(/^(\d+)\s*\./);
  return trouve ? trouve[1] : null;
}

/* État de module : survit aux reconstructions du DOM, jamais écrit ailleurs. */
let contexte = null;
let ecouteurPose = false;

function vueActive() {
  return !!(contexte && contexte.layout && contexte.layout.isConnected
    && contexte.layout.querySelector(`#${TABLEAU_ID}`));
}

/* Crée (ou réutilise) le conteneur unique des repères, inséré avant la légende. */
function tableauDe(el, corps) {
  let tableau = corps.querySelector(`#${TABLEAU_ID}`);
  if (present(tableau)) return tableau;
  tableau = el('div', 'recit-v2-e014-tableau');
  tableau.id = TABLEAU_ID;
  tableau.setAttribute('role', 'group');
  tableau.setAttribute('aria-label', 'Repères de navigation clavier');
  const legende = corps.querySelector('.recit-legend');
  if (present(legende) && legende.parentNode === corps) corps.insertBefore(tableau, legende);
  else corps.appendChild(tableau);
  return tableau;
}

/* Ajoute une ligne de synthèse visible dans le tableau, sans doublon d'id. */
function ligne(el, tableau, id, texte) {
  if (!present(tableau) || tableau.querySelector(`#${id}`)) return;
  const noeud = el('p', 'recit-v2-e014-ligne', texte);
  noeud.id = id;
  tableau.appendChild(noeud);
}

/* ------------------------------------------------------------------------- *
 * E014-08 — un seul écouteur « / », installé une fois, posé en capture sur
 * window. Il n'agit que hors champ éditable et ne consomme la touche que s'il
 * a réellement déplacé le focus vers la recherche.
 * ------------------------------------------------------------------------- */
function installer() {
  if (ecouteurPose || typeof window === 'undefined') return;
  ecouteurPose = true;
  window.addEventListener('keydown', sansEchec((evenement) => {
    if (evenement.defaultPrevented || evenement.ctrlKey || evenement.metaKey || evenement.altKey) return;
    if (evenement.key !== '/' || !vueActive()) return;
    const cible = evenement.target;
    if (cible instanceof HTMLElement
      && (cible.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(cible.tagName))) return;
    const recherche = document.getElementById('c3a-search');
    if (!present(recherche) || recherche === document.activeElement) return;
    evenement.preventDefault();
    try { recherche.focus({ preventScroll: true }); }
    catch { try { recherche.focus(); } catch { /* cible non focusable */ } }
  }), true);
}

/* ------------------------------------------------------------------------- *
 * Point d'entrée unique de la lentille.
 * ------------------------------------------------------------------------- */
register('E014', (ctx) => {
  try {
    if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
    const { layout, css, el } = ctx;
    if (typeof css === 'function') {
      try { css(CSS_ID, CSS); } catch { /* rendu préservé coûte que coûte */ }
    }

    const corps = layout.querySelector('.recit-body');
    if (!present(corps)) return;

    contexte = { layout, corps, el };
    marquer(layout, RACINE);
    data(layout, 'orientation', '1');

    const tableau = tableauDe(el, corps);

    /* --- E014-01 : compteur de cibles tabulables, dérivé du DOM ----------- */
    const cibles = corps.querySelectorAll(TABULABLES);
    const nombreCibles = cibles.length;
    const compteur = el('span', '', String(nombreCibles));
    compteur.setAttribute('data-v2-e014-valeur', String(nombreCibles));
    if (!tableau.querySelector('#v2-e014-tabcount')) {
      const ligneCompteur = el('p', 'recit-v2-e014-ligne');
      ligneCompteur.id = 'v2-e014-tabcount';
      ligneCompteur.appendChild(document.createTextNode('Navigation clavier : '));
      ligneCompteur.appendChild(compteur);
      ligneCompteur.appendChild(document.createTextNode(' cible(s) tabulable(s) dans cette vue.'));
      tableau.appendChild(ligneCompteur);
    }
    data(tableau, 'tabstops', nombreCibles);

    /* --- E014-02 : inventaire des raccourcis réellement actifs ------------ */
    const boutonsRaccourcis = corps.querySelectorAll('button[aria-keyshortcuts]:not([disabled])');
    const raccourcis = [];
    Array.prototype.forEach.call(boutonsRaccourcis, (bouton) => {
      const cle = String(bouton.getAttribute('aria-keyshortcuts') || '').trim();
      if (!cle) return;
      raccourcis.push(LIBELLES_TOUCHES[cle] || cle);
    });
    const texteRaccourcis = raccourcis.length
      ? `Raccourcis actifs : ${raccourcis.join(' · ')}.`
      : 'Raccourcis actifs : aucun dans cette vue.';
    ligne(el, tableau, 'v2-e014-raccourcis', texteRaccourcis);
    marquer(tableau.querySelector('#v2-e014-raccourcis'), 'recit-v2-e014-raccourcis');
    data(tableau, 'shortcuts', raccourcis.length);

    /* --- E014-03 : repères d'extrémité du fil ----------------------------- */
    const items = corps.querySelectorAll('#c3a-thread .c3a-thread-item');
    const totalItems = items.length;
    if (totalItems) {
      const premier = items[0];
      const dernier = items[totalItems - 1];
      marquer(premier, 'recit-v2-e014-item');
      marquer(dernier, 'recit-v2-e014-item');
      if (premier !== dernier) {
        data(premier, 'extremite', 'debut');
        data(dernier, 'extremite', 'fin');
      }
      const ordinalPremier = numeroDe(premier) || '1';
      const ordinalDernier = numeroDe(dernier) || String(totalItems);
      ligne(el, tableau, 'v2-e014-extremites',
        `Fil : premier point N°${ordinalPremier} · dernier point N°${ordinalDernier} `);
      const ligneExtremites = tableau.querySelector('#v2-e014-extremites');
      if (ligneExtremites) ligneExtremites.textContent += `(${totalItems} point(s) affiché(s)).`;
      data(tableau, 'fil', totalItems);
    }

    /* --- E014-04 : badge « point courant » sur l'item du fil ------------- */
    const courant = corps.querySelector('#c3a-thread .c3a-thread-item[aria-current="step"]')
      || corps.querySelector('#c3a-thread .c3a-thread-item.is-current');
    if (present(courant)) {
      marquer(courant, 'recit-v2-e014-item');
      data(courant, 'courant', '1');
    }

    /* --- E014-05 : titre de la recherche dérivé du statut ----------------- */
    const recherche = corps.querySelector('#c3a-search');
    const statut = corps.querySelector('#c3a-status');
    const texteStatut = String((present(statut) && statut.textContent) || '');
    const comptage = texteStatut.match(/(\d+)\s*point\(s\)\s*affiché\(s\)\s*sur\s*(\d+)/i);
    if (present(recherche) && comptage) {
      attrSiAbsent(recherche, 'title',
        `Recherche active : ${comptage[1]} point(s) affiché(s) sur ${comptage[2]} dans ce repère.`);
      data(recherche, 'count', `${comptage[1]}/${comptage[2]}`);
    }

    /* --- E014-06 : filtres actifs lisibles sans la couleur ---------------- */
    const filtres = corps.querySelectorAll('.c3a-filter[aria-pressed]');
    Array.prototype.forEach.call(filtres, (filtre) => marquer(filtre, 'recit-v2-e014-filtre'));

    /* --- E014-07 : commandes indisponibles explicitées ------------------- */
    const actions = corps.querySelector('.recit-actions');
    if (present(actions)) {
      const boutons = actions.querySelectorAll('button');
      Array.prototype.forEach.call(boutons, (bouton) => marquer(bouton, 'recit-v2-e014-action'));
    }

    /* --- E014-08 : rappel textuel du raccourci « / » ---------------------- */
    ligne(el, tableau, 'v2-e014-indice',
      'Astuce clavier : « / » place le focus dans la recherche du fil.');
    marquer(tableau.querySelector('#v2-e014-indice'), 'recit-v2-e014-indice');

    /* --- E014-09 : focus renforcé sur la barre de filtres ----------------- */
    const outils = corps.querySelector('#c3a-tools') || corps.querySelector('.c3a-tools');
    if (present(outils)) {
      marquer(outils, 'recit-v2-e014-outils');
      data(outils, 'focus', '1');
    }

    /* --- E014-10 : barre d'outils ARIA pour les commandes ----------------- */
    if (present(actions)) {
      marquer(actions, 'recit-v2-e014-commandes');
      attrSiAbsent(actions, 'role', 'toolbar');
      attrSiAbsent(actions, 'aria-label', 'Commandes du récit');
    }

    installer();
  } catch { /* rendu préservé coûte que coûte */ }
});
