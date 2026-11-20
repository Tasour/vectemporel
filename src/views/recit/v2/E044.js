import { register } from './registry.js';

/* V2 lentille E044 — Navigation clavier, second jeu de chantiers (vue Récit).
 *
 * La passe 1 traite les badges de touches, le tabstop unique du fil, l'aide
 * clavier dépliable, la détection Tab/pointeur, les anneaux de focus, l'aperçu
 * au focus, Début/Fin, le retour au point courant, la remise à zéro des filtres
 * et les repères de traçabilité. Ce jeu V2 cible les manœuvres et les annonces
 * que la passe 1 laisse intactes : pagination du fil, saut numérique, position
 * dans les commandes, liens d'évitement, limites de parcours, état de lecture,
 * raccourci vers le repère suivant, annonce de filtrage, inventaire des cibles
 * et régime de navigation renforcée.
 *
 * Dix chantiers, tous non destructifs : aucun texte retiré ni réécrit, aucun
 * attribut porté par la coque écrasé, aucun fichier partagé modifié. Un seul
 * register, un seul bloc CSS, classes préfixées « recit-v2-e044- », ids DOM
 * préfixés « v2-e044- » et uniques (la passe 1 utilise « e044- » sur le MÊME
 * DOM). Zéro réseau, zéro console, zéro aléa. Chaque chantier est isolé par une
 * garde : une défaillance locale ne casse jamais le rendu. Sans ce module, la
 * vue Récit demeure intégralement lisible et utilisable.
 */

const CSS = `
/* Indicateur de position du fil. */
.recit-layout .recit-v2-e044-indice{margin:6px 0;color:var(--ink-soft);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}

/* Saut numérique : aucun style propre, comportement intégralement en JS. */
.recit-layout .recit-v2-e044-indice[data-v2-e044-saut="1"]{color:var(--gold-bright)}

/* Position de la commande focalisée. */
.recit-v2-e044-readout{margin:4px 0;color:var(--ink-soft);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}

/* Liens d'évitement révélés au focus. */
.recit-v2-e044-skip{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.recit-v2-e044-skip:focus-within{position:static;width:auto;height:auto;clip:auto;overflow:visible;display:flex;flex-wrap:wrap;gap:8px;margin:6px 0;padding:6px;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.35)}
.recit-v2-e044-skip-lien{display:inline-block;min-height:36px;padding:6px 12px;border:1px solid var(--gold);border-radius:8px;color:var(--gold-bright);font-size:11px;text-decoration:none}
.recit-v2-e044-skip-lien:focus-visible,.recit-v2-e044-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}

/* Limites du parcours : même région de statut, texte issu du DOM. */

/* État de la lecture automatique : texte issu de aria-pressed. */

/* Raccourci N : aucun style propre, comportement intégralement en JS. */

/* Annonce de filtrage. */

/* Inventaire des cibles. */

/* Navigation renforcée : cibles 44 px et focus appuyés. */
.recit-v2-e044-btn{min-height:36px;padding:5px 12px;border:1px solid var(--line-strong);border-radius:8px;background:transparent;color:var(--gold-bright);font-size:10px;font-weight:600;cursor:pointer}
.recit-v2-e044-btn[aria-pressed="true"]{background:rgba(230,185,111,.18);border-color:var(--gold)}
.recit-v2-e044-renforce .recit-actions button,
.recit-v2-e044-renforce .recit-thread-item{min-height:44px}
.recit-v2-e044-renforce .recit-actions button:focus-visible,
.recit-v2-e044-renforce .recit-thread-item:focus-visible,
.recit-v2-e044-renforce .recit-trace summary:focus-visible,
.recit-v2-e044-renforce .c3a-search:focus-visible,
.recit-v2-e044-renforce a:focus-visible{outline:3px solid var(--gold-bright);outline-offset:3px;box-shadow:0 0 0 6px rgba(230,185,111,.22)}
.recit-layout[data-v2-e044-motion="reduce"] .recit-v2-e044-btn,
.recit-layout[data-v2-e044-motion="reduce"] .recit-v2-e044-skip-lien{transition:none}
@media (max-width:620px){
  .recit-v2-e044-btn,.recit-v2-e044-skip-lien{min-height:40px}
  .recit-v2-e044-readout,.recit-layout .recit-v2-e044-indice{font-size:11px}
}
@media (prefers-reduced-motion:reduce){
  .recit-v2-e044-btn,.recit-v2-e044-skip-lien{transition:none!important}
}
`;

/* État de la bascule, conservé entre deux reconstructions du DOM par la coque. */
let navRenforcee = false;

/* Neutralise un chantier défaillant sans interrompre les suivants ni le rendu. */
function securise(action) {
  try { if (typeof action === 'function') action(); }
  catch { /* enrichissement non destructif : la vue ne casse jamais. */ }
}

/* Ajoute une classe sans écraser les classes déjà portées par la coque. */
function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

/* Pose un attribut uniquement s'il est absent : jamais d'écrasement de la coque. */
function attributSiAbsent(noeud, nom, valeur) {
  if (noeud && noeud.nodeType === 1 && !noeud.hasAttribute(nom)) noeud.setAttribute(nom, valeur);
}

/* Réutilise un nœud déjà inséré (idempotence), le crée sinon, et le place
   éventuellement juste après une ancre du même parent. */
function place(parent, id, balise, classe, texte, ancre) {
  if (!parent || parent.nodeType !== 1 || typeof document === 'undefined') return null;
  let noeud = document.getElementById(id) || null;
  if (!noeud) noeud = document.createElement(balise);
  noeud.id = id;
  if (classe) noeud.className = classe;
  if (texte !== undefined && noeud.textContent !== texte) noeud.textContent = texte;
  const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

/* Vrais boutons du fil, lus dans le DOM rendu (jamais inventés). */
function itemsDuFil(layout) {
  const liste = layout.querySelector('#c3a-thread') || layout.querySelector('.recit-thread-list');
  if (!liste || typeof liste.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(liste.querySelectorAll('.recit-thread-item'));
}

/* Indice de l'item focalisé, sinon de l'item courant marqué par la vue. */
function indexCourant(items) {
  if (!items.length) return -1;
  const actif = typeof document !== 'undefined' ? document.activeElement : null;
  const i = items.indexOf(actif);
  if (i >= 0) return i;
  return items.findIndex((item) => item.classList && item.classList.contains('is-current'));
}

/* Tabulation rovante : un seul tabstop, le focus déplacé sans activer le point. */
function deplaceFocus(items, index) {
  if (!items.length) return;
  const i = Math.max(0, Math.min(index, items.length - 1));
  items.forEach((item) => { item.tabIndex = -1; });
  items[i].tabIndex = 0;
  if (typeof items[i].focus === 'function') items[i].focus({ preventScroll: true });
}

/* E044-01 — pagination du fil avec PageUp / PageDown (pas de 5 au plus). */
function chantier01(layout) {
  const fil = layout.querySelector('.recit-thread');
  const liste = layout.querySelector('#c3a-thread') || layout.querySelector('.recit-thread-list');
  if (!fil || !liste) return;
  const indice = place(fil, 'v2-e044-fil-indice', 'p', 'recit-v2-e044-indice', '', null);
  if (!indice) return;
  indice.setAttribute('role', 'status');
  indice.setAttribute('aria-live', 'polite');
  indice.setAttribute('aria-atomic', 'true');

  const metteAJour = () => {
    const items = itemsDuFil(layout);
    if (!items.length) return;
    const courant = indexCourant(items);
    const numero = courant >= 0 ? courant + 1 : 1;
    indice.textContent = `Navigation clavier : point ${numero} sur ${items.length} · PgUp/PgDn changent de page, 1–9 joignent un point.`;
  };

  if (liste.dataset.v2E044Page !== '1') {
    liste.dataset.v2E044Page = '1';
    liste.addEventListener('focusin', metteAJour);
    liste.addEventListener('keydown', (evenement) => {
      if (!evenement || (evenement.key !== 'PageUp' && evenement.key !== 'PageDown')) return;
      const items = itemsDuFil(layout);
      if (!items.length) return;
      evenement.preventDefault();
      const pas = Math.max(1, Math.min(5, items.length));
      const base = indexCourant(items);
      deplaceFocus(items, (base < 0 ? 0 : base) + (evenement.key === 'PageUp' ? -pas : pas));
      metteAJour();
    });
  }
  metteAJour();
}

/* E044-02 — saut direct au point 1–9 par touche numérique dans le fil. */
function chantier02(layout) {
  const liste = layout.querySelector('#c3a-thread') || layout.querySelector('.recit-thread-list');
  if (!liste || liste.dataset.v2E044Digit === '1') return;
  liste.dataset.v2E044Digit = '1';
  liste.addEventListener('keydown', (evenement) => {
    if (!evenement || evenement.altKey || evenement.ctrlKey || evenement.metaKey) return;
    if (!/^[1-9]$/.test(evenement.key || '')) return;
    const items = itemsDuFil(layout);
    const numero = parseInt(evenement.key, 10);
    if (numero > items.length) return;
    evenement.preventDefault();
    deplaceFocus(items, numero - 1);
    const indice = document.getElementById('v2-e044-fil-indice');
    if (indice) {
      indice.textContent = `Navigation clavier : point ${numero} sur ${items.length} rejoint par la touche ${evenement.key}.`;
      indice.setAttribute('data-v2-e044-saut', '1');
    }
  });
}

/* E044-03 — annonce de la position de la commande focalisée dans .recit-actions. */
function chantier03(layout) {
  const actions = layout.querySelector('.recit-actions');
  if (!actions) return;
  const readout = place(actions, 'v2-e044-action-pos', 'p', 'recit-v2-e044-readout', '', null);
  if (!readout) return;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  if (actions.dataset.v2E044Pos === '1') return;
  actions.dataset.v2E044Pos = '1';
  actions.addEventListener('focusin', (evenement) => {
    const bouton = evenement && evenement.target && evenement.target.closest
      ? evenement.target.closest('button') : null;
    if (!bouton || !actions.contains(bouton)) return;
    const boutons = Array.prototype.slice.call(actions.querySelectorAll('button'));
    const position = boutons.indexOf(bouton) + 1;
    if (!position) return;
    const libelle = String(bouton.getAttribute('aria-label') || bouton.textContent || '')
      .trim().replace(/\s+/g, ' ');
    readout.textContent = `Commande ${position} sur ${boutons.length} : ${libelle}.`;
  });
}

/* E044-04 — liens d'évitement vers les vrais ids du fil et des commandes. */
function chantier04(layout) {
  const corps = layout.querySelector('.recit-body') || layout;
  const fil = layout.querySelector('#c3a-thread') || layout.querySelector('.recit-thread-list');
  const actions = layout.querySelector('.recit-actions');
  if (!corps) return;
  if (fil) attributSiAbsent(fil, 'id', 'c3a-thread');
  if (actions) attributSiAbsent(actions, 'id', 'v2-e044-actions');

  const barre = place(corps, 'v2-e044-skip', 'div', 'recit-v2-e044-skip', undefined, null);
  if (!barre) return;
  barre.setAttribute('aria-label', 'Liens d’évitement du récit');
  if (!barre.querySelector('a')) {
    const versFil = document.createElement('a');
    versFil.className = 'recit-v2-e044-skip-lien';
    versFil.textContent = 'Aller au fil du repère';
    versFil.href = fil ? `#${fil.id || 'c3a-thread'}` : '#c3a-thread';
    const versActions = document.createElement('a');
    versActions.className = 'recit-v2-e044-skip-lien';
    versActions.textContent = 'Aller aux commandes';
    versActions.href = actions && actions.id ? `#${actions.id}` : '#c3a-thread';
    barre.append(versFil, versActions);
  }
  if (corps.firstChild !== barre) corps.insertBefore(barre, corps.firstChild);
}

/* E044-05 — annonce des limites du parcours lue depuis l'état disabled des
   boutons « Point précédent » / « Point suivant » de la vue. */
function chantier05(layout) {
  const actions = layout.querySelector('.recit-actions');
  if (!actions) return;
  const readout = place(actions, 'v2-e044-limites', 'p', 'recit-v2-e044-readout', '', null);
  if (!readout) return;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');
  if (actions.dataset.v2E044Lim === '1') return;
  actions.dataset.v2E044Lim = '1';
  actions.addEventListener('focusin', (evenement) => {
    const bouton = evenement && evenement.target && evenement.target.closest
      ? evenement.target.closest('button') : null;
    if (!bouton || !actions.contains(bouton)) return;
    const fk = bouton.dataset ? bouton.dataset.fk : '';
    if (fk !== 'c3a-prev' && fk !== 'c3a-next') return;
    if (bouton.disabled) {
      readout.textContent = fk === 'c3a-prev'
        ? 'Début du fil : aucun point précédent.'
        : 'Fin du fil : aucun point suivant.';
    } else {
      readout.textContent = 'Navigation entre les points disponible.';
    }
  });
}

/* E044-06 — état de la lecture automatique déduit de aria-pressed du bouton
   existant ; la coque reconstruisant le DOM, une lecture par rendu suffit. */
function chantier06(layout) {
  const actions = layout.querySelector('.recit-actions');
  const lecture = layout.querySelector('.recit-play');
  if (!actions || !lecture) return;
  const enCours = lecture.getAttribute('aria-pressed') === 'true';
  const texte = enCours
    ? 'Lecture automatique : en cours (Espace pour mettre en pause).'
    : 'Lecture automatique : en pause (Espace pour lancer).';
  const readout = place(actions, 'v2-e044-play-etat', 'p', 'recit-v2-e044-readout', texte, null);
  if (readout) {
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');
    readout.setAttribute('aria-atomic', 'true');
  }
}

/* E044-07 — raccourci « N » vers le repère suivant, dérivé du bouton réel. */
function chantier07(layout) {
  const suivant = layout.querySelector('[data-fk="c3a-next-event"]');
  if (!suivant) return;
  attributSiAbsent(suivant, 'aria-keyshortcuts', 'N');
  if (layout.dataset.v2E044N === '1') return;
  layout.dataset.v2E044N = '1';
  layout.addEventListener('keydown', (evenement) => {
    if (!evenement || evenement.defaultPrevented) return;
    if (evenement.ctrlKey || evenement.metaKey || evenement.altKey) return;
    if (String(evenement.key || '').toLowerCase() !== 'n') return;
    const cible = evenement.target;
    if (cible && cible.nodeType === 1 && cible.closest
      && cible.closest('input, textarea, select, [contenteditable="true"]')) return;
    const bouton = layout.querySelector('[data-fk="c3a-next-event"]');
    if (!bouton || bouton.disabled) return;
    evenement.preventDefault();
    bouton.click();
  });
}

/* E044-08 — annonce de filtrage : nombres lus dans #c3a-status et présence
   réelle de l'encart « aucun résultat ». */
function chantier08(layout) {
  const corps = layout.querySelector('.recit-body') || layout;
  const statut = layout.querySelector('#c3a-status') || layout.querySelector('.c3a-status');
  if (!corps || !statut) return;
  const brut = String(statut.textContent || '').trim().replace(/\s+/g, ' ');
  const trouve = /(\d+)\s*point\(s\)\s*affiché\(s\)\s*sur\s*(\d+)/i.exec(brut);
  const vide = !!layout.querySelector('#c3a-empty, .c3a-empty') || !!corps.querySelector('.c3a-empty');
  let texte;
  if (trouve) {
    texte = vide
      ? `Filtre clavier : ${trouve[1]} point affiché sur ${trouve[2]} · aucun résultat, utilisez « Réinitialiser les filtres ».`
      : `Filtre clavier : ${trouve[1]} point(s) affiché(s) sur ${trouve[2]} · le fil reste navigable au clavier.`;
  } else {
    texte = vide
      ? 'Filtre clavier : aucun résultat, utilisez « Réinitialiser les filtres » pour retrouver le fil.'
      : 'Filtre clavier : le fil des points reste navigable au clavier.';
  }
  const readout = place(corps, 'v2-e044-filtre', 'p', 'recit-v2-e044-readout', texte, statut);
  if (readout) {
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');
    readout.setAttribute('aria-atomic', 'true');
  }
}

/* E044-09 — inventaire des cibles interactives réellement présentes, hors
   liens d'évitement et éléments désactivés ou masqués aux lecteurs d'écran. */
function chantier09(layout) {
  const corps = layout.querySelector('.recit-body') || layout;
  if (!corps) return;
  const legend = layout.querySelector('.recit-legend');
  const selecteur = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';
  let total = 0;
  Array.prototype.forEach.call(corps.querySelectorAll(selecteur), (cible) => {
    if (cible.disabled) return;
    if (cible.getAttribute('aria-hidden') === 'true') return;
    if (cible.closest && cible.closest('#v2-e044-skip')) return;
    total += 1;
  });
  place(corps, 'v2-e044-cibles', 'p', 'recit-v2-e044-readout',
    `Accessibilité clavier : ${total} cible(s) interactive(s) dans cette vue, hors liens d’évitement.`,
    legend);
}

/* E044-10 — bascule « Navigation renforcée » (bascule indépendante, donc
   aria-pressed autorisé) et marqueur de mouvement réduit. */
function chantier10(layout, reducedMotion) {
  const actions = layout.querySelector('.recit-actions');
  if (!actions) return;
  ajouteClasse(layout, 'recit-v2-e044-base');
  layout.classList.toggle('recit-v2-e044-renforce', navRenforcee);

  const bouton = place(actions, 'v2-e044-nav-btn', 'button', 'recit-v2-e044-btn',
    'Navigation renforcée', null);
  if (!bouton) return;
  bouton.type = 'button';
  bouton.setAttribute('aria-pressed', String(navRenforcee));
  bouton.setAttribute('aria-label', navRenforcee
    ? 'Désactiver la navigation renforcée'
    : 'Activer la navigation renforcée');

  if (bouton.dataset.v2E044Nav !== '1') {
    bouton.dataset.v2E044Nav = '1';
    bouton.addEventListener('click', () => {
      navRenforcee = !navRenforcee;
      const cadre = document.querySelector('.recit-layout');
      if (cadre) cadre.classList.toggle('recit-v2-e044-renforce', navRenforcee);
      bouton.setAttribute('aria-pressed', String(navRenforcee));
      bouton.setAttribute('aria-label', navRenforcee
        ? 'Désactiver la navigation renforcée'
        : 'Activer la navigation renforcée');
    });
  }

  if (typeof reducedMotion === 'function' && reducedMotion()) {
    layout.setAttribute('data-v2-e044-motion', 'reduce');
  } else {
    layout.setAttribute('data-v2-e044-motion', 'normal');
  }
}

register('E044', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx || {};
  try {
    if (typeof document === 'undefined') return;
    securise(() => { if (typeof css === 'function') css('recit-v2-e044', CSS); });
    if (!layout || typeof layout.querySelector !== 'function') return;
    void el; /* API disponible ; les nœuds sont créés avec createElement. */

    securise(() => chantier01(layout));
    securise(() => chantier02(layout));
    securise(() => chantier03(layout));
    securise(() => chantier04(layout));
    securise(() => chantier05(layout));
    securise(() => chantier06(layout));
    securise(() => chantier07(layout));
    securise(() => chantier08(layout));
    securise(() => chantier09(layout));
    securise(() => chantier10(layout, reducedMotion));
  } catch {
    /* garde-fou global : une lentille défaillante ne casse pas le rendu. */
  }
});
