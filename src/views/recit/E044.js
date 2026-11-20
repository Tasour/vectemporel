import { register } from './registry.js';

/* Lentille E044 — Navigation clavier (vue Récit).
 *
 * Dix chantiers concrets et distincts (E044-01 … E044-10), tous implémentés
 * dans CE seul module ; le détail figure dans
 * UNIFIED_AUDIT/RECIT/views/E044.md.
 *
 * Greffon strictement additif : aucune suppression de texte, aucune
 * ré-attribution de gestionnaire existant, aucun fichier partagé modifié.
 * Une seule classe racine `recit-e044-layout` est posée sur `layout`, un seul
 * bloc CSS est injecté via `css('recit-e044', …)` (cssOnce garantit
 * l'idempotence). Toutes les classes créées sont préfixées `recit-e044-`,
 * tous les identifiants d'éléments sont préfixés `e044-` et uniques.
 * Zéro console.*, zéro réseau (fetch/XHR/src distant/@import/url(http)),
 * zéro Math.random, zéro innerHTML. Chaque chantier est enveloppé dans une
 * garde : une défaillance locale est neutralisée sans casser le rendu.
 * Sans JavaScript, la vue Récit demeure intégralement lisible et utilisable.
 */

const CSS_ID = 'recit-e044';
const RACINE = 'recit-e044-layout';

/* Feuille unique, entièrement cadrée par la classe racine. Aucune ressource
   distante, aucune police téléchargée, aucune information portée par la seule
   couleur : chaque badge de touche est un texte lisible. */
const CSS = `
.recit-e044-layout .recit-e044-kbd{
  display:inline-block;margin-left:6px;padding:1px 5px;
  border:1px solid var(--line-strong,#6b6b6b);border-radius:4px;
  background:rgba(255,255,255,.05);color:var(--muted,#a9a9a9);
  font:600 9px/1.4 var(--sans,inherit);font-variant-numeric:tabular-nums;
  vertical-align:middle;opacity:.55;
  transition:opacity .15s ease,color .15s ease,border-color .15s ease;
}
.recit-e044-layout.recit-e044-clavier .recit-e044-kbd{
  opacity:1;color:var(--gold-bright,#f5e9d0);border-color:var(--gold,#e6b96f);
}
.recit-e044-layout[data-e044-focus="1"] button:focus-visible,
.recit-e044-layout[data-e044-focus="1"] input:focus-visible,
.recit-e044-layout[data-e044-focus="1"] summary:focus-visible,
.recit-e044-layout[data-e044-focus="1"] [tabindex]:focus-visible{
  outline:2px solid var(--gold-bright,#f5e9d0);outline-offset:3px;
  box-shadow:0 0 0 5px rgba(230,185,111,.16);
}
.recit-e044-layout .recit-e044-btn{
  min-height:36px;padding:4px 10px;margin-left:6px;
  border:1px solid var(--line-strong,#6b6b6b);border-radius:8px;
  background:transparent;color:var(--ink-soft,#d8d8d8);
  font:600 10px/1.3 var(--sans,inherit);cursor:pointer;
  transition:border-color .15s ease,color .15s ease;
}
.recit-e044-layout .recit-e044-btn:hover{
  border-color:var(--gold,#e6b96f);color:var(--gold-bright,#f5e9d0);
}
.recit-e044-layout .c3a-tools .recit-e044-btn{margin-left:0}
.recit-e044-layout .recit-e044-aide{
  margin:12px 0 0;padding:10px 12px;border:1px solid var(--line-strong,#6b6b6b);
  border-radius:10px;background:rgba(230,185,111,.05);
  color:var(--ink-soft,#d8d8d8);font-size:10px;line-height:1.55;
}
.recit-e044-layout .recit-e044-aide[hidden]{display:none}
.recit-e044-layout .recit-e044-aide-titre{
  margin:0 0 7px;color:var(--gold-bright,#f5e9d0);font-size:12px;font-weight:700;
}
.recit-e044-layout .recit-e044-aide-list{margin:0;padding-left:18px}
.recit-e044-layout .recit-e044-aide-list li{margin:4px 0}
.recit-e044-layout .recit-e044-aide .recit-e044-kbd{
  margin:0 8px 0 0;min-width:52px;text-align:center;opacity:1;
}
.recit-e044-layout .recit-e044-preview{
  min-height:1.4em;margin:7px 0 0;color:var(--muted,#a9a9a9);
  font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums;
}
.recit-e044-layout .recit-e044-preview[data-e044-preview="1"]{
  color:var(--gold-bright,#f5e9d0);
}
.recit-e044-layout[data-e044-motion="reduce"] .recit-e044-kbd,
.recit-e044-layout[data-e044-motion="reduce"] .recit-e044-btn{transition:none}
@media (max-width:620px){
  .recit-e044-layout .recit-e044-kbd{font-size:8px;padding:1px 4px}
  .recit-e044-layout .recit-e044-btn{min-height:40px}
  .recit-e044-layout .recit-e044-aide .recit-e044-kbd{min-width:46px}
}
@media (prefers-reduced-motion:reduce){
  .recit-e044-layout .recit-e044-kbd,
  .recit-e044-layout .recit-e044-btn{transition:none!important}
}
`;

/* Libellés visibles des touches : ils proviennent des `aria-keyshortcuts`
   déjà posés par la vue, jamais d'une action inventée. */
const TOUCHES = {
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Space: 'Espace',
  Enter: 'Entrée',
  Escape: 'Échap',
  Digit4: '4',
};

const LIBELLES_CERTITUDE = {
  'vérifié': 'Vérifié',
  verifie: 'Vérifié',
  certain: 'Certain',
  probable: 'Probable',
  disputed: 'Contesté',
  'contesté': 'Contesté',
};

/* État module : partagé entre les rendus, jamais écrit dans un fichier. */
let layoutCourant = null;
let detectionInstallee = false;

function securise(action) {
  try { if (typeof action === 'function') action(); }
  catch { /* une lentille défaillante ne doit jamais casser le rendu */ }
}

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function attributSiAbsent(noeud, nom, valeur) {
  if (noeud && noeud.nodeType === 1 && !noeud.hasAttribute(nom)) {
    noeud.setAttribute(nom, valeur);
  }
}

/* Réutilise un nœud déjà présent, le crée sinon, et le place dans le parent
   courant. Garde d'unicité : un seul nœud par identifiant dans le document. */
function place(parent, id, balise, classe, texte, fabrique) {
  if (!parent || parent.nodeType !== 1 || typeof document === 'undefined') return null;
  let noeud = document.getElementById(id) || null;
  if (!noeud) {
    noeud = typeof fabrique === 'function'
      ? fabrique(balise, classe, texte)
      : document.createElement(balise);
  }
  noeud.id = id;
  if (classe) noeud.className = classe;
  if (texte !== undefined && noeud.textContent !== texte) noeud.textContent = texte;
  if (noeud.parentNode !== parent) parent.appendChild(noeud);
  return noeud;
}

function itemsDuFil(layout) {
  const liste = layout.querySelector('#c3a-thread') || layout.querySelector('.recit-thread-list');
  if (!liste || typeof liste.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(liste.querySelectorAll('.recit-thread-item'));
}

function annonce(layout, texte) {
  const region = layout && layout.querySelector
    ? layout.querySelector('#e044-focus-preview') : null;
  if (region) {
    region.textContent = texte;
    region.setAttribute('data-e044-preview', '1');
  }
}

/* E044-01 — badges de touches sur les commandes. */
function chantier01(layout, el) {
  const actions = layout.querySelector('.recit-actions');
  if (!actions || typeof el !== 'function') return;
  Array.prototype.forEach.call(actions.querySelectorAll('button'), (bouton) => {
    if (bouton.querySelector('.recit-e044-kbd')) return;
    const raccourci = bouton.getAttribute('aria-keyshortcuts') || '';
    const libelle = TOUCHES[raccourci];
    if (!libelle) return;
    const badge = el('span', 'recit-e044-kbd', libelle);
    badge.setAttribute('aria-hidden', 'true');
    bouton.appendChild(badge);
  });
}

/* E044-02 — point d'entrée unique dans le fil (tabulation rovante). */
function chantier02(layout) {
  const items = itemsDuFil(layout);
  if (!items.length) return;
  const tabbables = items.filter((item) => item.tabIndex === 0);
  let cible = tabbables.length === 1 ? tabbables[0] : null;
  if (!cible) {
    cible = items.filter((item) => item.classList.contains('is-current')
      || item.getAttribute('aria-current') === 'step')[0] || items[0];
    items.forEach((item) => { item.tabIndex = item === cible ? 0 : -1; });
  }
  items.forEach((item) => {
    attributSiAbsent(item, 'aria-keyshortcuts', 'Enter');
    if (item !== cible && item.tabIndex === 0) item.tabIndex = -1;
  });
  const fil = layout.querySelector('.recit-thread');
  if (fil) fil.setAttribute('data-e044-tabstop', cible ? '1' : '0');
}

/* E044-03 — aide clavier contextuelle, dépliable, propre à cette vue. */
function chantier03(layout, el) {
  const corps = layout.querySelector('.recit-body');
  if (!corps || typeof el !== 'function') return;
  const panneau = place(corps, 'e044-help-panel', 'section', 'recit-e044-aide', undefined, el);
  if (!panneau) return;
  const titre = place(panneau, 'e044-help-title', 'h2', 'recit-e044-aide-titre',
    'Raccourcis clavier du récit', el);
  panneau.setAttribute('aria-labelledby', titre.id);
  panneau.hidden = true;

  if (!panneau.querySelector('.recit-e044-aide-list')) {
    const liste = el('ul', 'recit-e044-aide-list');
    const entrees = [
      ['← →', 'point précédent ou point suivant'],
      ['↑ ↓', 'parcourir les points du fil'],
      ['Début Fin', 'premier ou dernier point du fil'],
      ['Entrée', 'ouvrir le détail du point'],
      ['Espace', 'lancer ou arrêter la lecture'],
      ['Échap', 'fermer un panneau ou revenir au monde'],
      ['?', 'ouvrir l’aide générale'],
      ['Tab', 'parcourir les commandes'],
    ];
    entrees.forEach((paire) => {
      const ligne = el('li', '');
      ligne.appendChild(el('span', 'recit-e044-kbd', paire[0]));
      ligne.appendChild(document.createTextNode(paire[1]));
      liste.appendChild(ligne);
    });
    panneau.appendChild(liste);
  }

  const actions = layout.querySelector('.recit-actions') || corps;
  const bouton = place(actions, 'e044-help-btn', 'button', 'recit-e044-btn',
    'Aide clavier', el);
  if (!bouton) return;
  bouton.type = 'button';
  bouton.setAttribute('aria-controls', panneau.id);
  bouton.setAttribute('aria-expanded', 'false');
  bouton.setAttribute('aria-label', 'Afficher les raccourcis clavier du récit');
  if (bouton.dataset.e044Bound !== '1') {
    bouton.dataset.e044Bound = '1';
    bouton.addEventListener('click', () => {
      const panneauCourant = document.getElementById('e044-help-panel');
      if (!panneauCourant) return;
      const ouvre = panneauCourant.hidden;
      panneauCourant.hidden = !ouvre;
      bouton.setAttribute('aria-expanded', ouvre ? 'true' : 'false');
      bouton.textContent = ouvre ? 'Masquer l’aide clavier' : 'Aide clavier';
      bouton.setAttribute('aria-label', ouvre
        ? 'Masquer les raccourcis clavier du récit'
        : 'Afficher les raccourcis clavier du récit');
    });
  }
}

/* E044-04 — détection du mode clavier (Tab) et retour au pointeur. */
function chantier04(layout) {
  layoutCourant = layout;
  if (detectionInstallee || typeof window === 'undefined') return;
  detectionInstallee = true;
  securise(() => {
    window.addEventListener('keydown', (evenement) => {
      if (!evenement || evenement.key !== 'Tab' || !layoutCourant) return;
      ajouteClasse(layoutCourant, 'recit-e044-clavier');
    }, true);
    window.addEventListener('pointerdown', () => {
      if (layoutCourant && layoutCourant.classList) {
        layoutCourant.classList.remove('recit-e044-clavier');
      }
    }, true);
  });
}

/* E044-05 — marqueur des anneaux de focus renforcés (règles en CSS). */
function chantier05(layout) {
  attributSiAbsent(layout, 'data-e044-focus', '1');
}

/* E044-06 — aperçu de l'item focalisé dans le fil, sans l'activer. */
function chantier06(layout, el) {
  const fil = layout.querySelector('.recit-thread');
  const liste = layout.querySelector('#c3a-thread') || layout.querySelector('.recit-thread-list');
  if (!fil || !liste || typeof el !== 'function') return;
  const region = place(fil, 'e044-focus-preview', 'p', 'recit-e044-preview', '', el);
  if (!region) return;
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'true');
  if (region.dataset.e044Bound === '1') return;
  region.dataset.e044Bound = '1';
  liste.addEventListener('focusin', (evenement) => {
    if (!region.isConnected) return;
    const cible = evenement && evenement.target;
    const item = cible && cible.closest ? cible.closest('.recit-thread-item') : null;
    if (!item) return;
    const items = itemsDuFil(layout);
    const numero = items.indexOf(item) + 1;
    if (!numero) return;
    const type = item.getAttribute('data-kind') || 'point';
    const brut = item.getAttribute('data-confidence') || '';
    const certitude = LIBELLES_CERTITUDE[brut] || brut || 'non renseignée';
    region.textContent = `Point ${numero} sur ${items.length} · ${type} · certitude : ${certitude}. Entrée pour ouvrir.`;
    region.setAttribute('data-e044-preview', '1');
  });
}

/* E044-07 — Début/Fin depuis les contrôles de la vue, hors champ de saisie. */
function chantier07(layout) {
  securise(() => {
    layout.addEventListener('keydown', (evenement) => {
      if (!evenement || evenement.defaultPrevented) return;
      if (evenement.ctrlKey || evenement.metaKey || evenement.altKey) return;
      const cle = evenement.key;
      if (cle !== 'Home' && cle !== 'End') return;
      const cible = evenement.target;
      if (cible && cible.nodeType === 1) {
        if (cible.closest('#c3a-thread')) return; /* déjà géré par la vue */
        if (cible.closest('input, textarea, select, [contenteditable="true"]')) return;
      }
      const items = itemsDuFil(layout);
      if (!items.length) return;
      evenement.preventDefault();
      const choix = cle === 'Home' ? items[0] : items[items.length - 1];
      items.forEach((item) => { item.tabIndex = item === choix ? 0 : -1; });
      choix.focus();
    });
  });
}

/* E044-08 — bouton de récupération du focus sur le point courant. */
function chantier08(layout, el) {
  const actions = layout.querySelector('.recit-actions');
  if (!actions || typeof el !== 'function') return;
  const bouton = place(actions, 'e044-current-btn', 'button', 'recit-e044-btn',
    'Rejoindre le point courant', el);
  if (!bouton) return;
  bouton.type = 'button';
  bouton.setAttribute('aria-label', 'Placer le focus sur le point courant du fil');
  if (bouton.dataset.e044Bound === '1') return;
  bouton.dataset.e044Bound = '1';
  bouton.addEventListener('click', () => {
    const cadre = document.querySelector('.recit-e044-layout') || layout;
    const items = itemsDuFil(cadre);
    const courant = items.filter((item) => item.classList.contains('is-current')
      || item.getAttribute('aria-current') === 'step')[0] || items[0];
    const titre = document.getElementById('recit-point-title');
    const cible = courant || titre;
    if (cible && typeof cible.focus === 'function') cible.focus();
    annonce(cadre, courant
      ? 'Focus placé sur le point courant du fil.'
      : 'Focus placé sur le titre du point.');
  });
}

/* E044-09 — réinitialisation des filtres entièrement au clavier. */
function chantier09(layout, el) {
  const outils = layout.querySelector('#c3a-tools') || layout.querySelector('.c3a-tools');
  if (!outils || typeof el !== 'function') return;
  const bouton = place(outils, 'e044-clear-btn', 'button', 'recit-e044-btn',
    'Effacer les filtres', el);
  if (!bouton) return;
  bouton.type = 'button';
  bouton.setAttribute('aria-label', 'Effacer la recherche et les filtres du fil');
  if (bouton.dataset.e044Bound === '1') return;
  bouton.dataset.e044Bound = '1';
  bouton.addEventListener('click', () => {
    securise(() => {
      const champ = document.getElementById('c3a-search');
      if (champ && champ.value) {
        champ.value = '';
        champ.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const barre = document.querySelector('.recit-layout .c3a-tools');
      if (barre) {
        Array.prototype.forEach.call(
          barre.querySelectorAll('button[aria-pressed="true"]'),
          (filtre) => {
            const libelle = String(filtre.textContent || '');
            if (libelle.indexOf('Tous les types') >= 0 || libelle.trim() === 'Toutes') {
              filtre.click();
            }
          }
        );
      }
      const cadre = document.querySelector('.recit-e044-layout') || layout;
      annonce(cadre, 'Recherche et filtres réinitialisés.');
    });
  });
}

/* E044-10 — traçabilité et source : cibles clavier explicitement annoncées. */
function chantier10(layout, el) {
  const details = layout.querySelector('.recit-trace');
  if (details) {
    ajouteClasse(details, 'recit-e044-trace');
    const resume = details.querySelector('summary');
    if (resume && typeof el === 'function') {
      attributSiAbsent(resume, 'aria-keyshortcuts', 'Enter Space');
      if (!resume.querySelector('.recit-e044-kbd')) {
        const badge = el('span', 'recit-e044-kbd', 'Entrée');
        badge.setAttribute('aria-hidden', 'true');
        resume.appendChild(badge);
      }
    }
  }
  const sources = layout.querySelector('.recit-sources');
  if (sources) ajouteClasse(sources, 'recit-e044-sources');
}

register('E044', (ctx) => {
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  const { layout, css, el, reducedMotion } = ctx;

  securise(() => { if (typeof css === 'function') css(CSS_ID, CSS); });
  securise(() => ajouteClasse(layout, RACINE));
  securise(() => {
    if (typeof reducedMotion === 'function' && reducedMotion()) {
      layout.setAttribute('data-e044-motion', 'reduce');
    } else {
      layout.setAttribute('data-e044-motion', 'normal');
    }
  });

  securise(() => chantier01(layout, el));
  securise(() => chantier02(layout));
  securise(() => chantier03(layout, el));
  securise(() => chantier04(layout));
  securise(() => chantier05(layout));
  securise(() => chantier06(layout, el));
  securise(() => chantier07(layout));
  securise(() => chantier08(layout, el));
  securise(() => chantier09(layout, el));
  securise(() => chantier10(layout, el));
});
