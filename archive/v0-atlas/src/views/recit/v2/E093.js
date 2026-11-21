import { register } from './registry.js';

/* V2 lentille E093 — Recherche et filtrage (vue Récit). Dix chantiers V2 neufs
   et distincts de la passe 1 : celle-ci fournit déjà un champ de recherche
   local, deux filtres (nature, certitude), une réinitialisation globale, un
   comptage annoncé, le focus visible et le mouvement réduit. La V2 ajoute un
   tableau de bord de synthèse des résultats : critères actifs, correspondances
   du terme, liste surlignée, répartitions, effacement du seul terme, tri,
   annonce dédiée, accessibilité et confort.
   Préfixes : classes recit-v2-e093-, ids DOM v2-e093- (jamais réutilisation des
   ids de la passe 1, qui tourne sur le même DOM). Les contrôles de la passe 1
   sont uniquement LUS via leurs classes (.recit-e093-search, -kind, -conf).
   Zéro réseau, zéro console, zéro aléa. Tout chiffre affiché est recalculé
   depuis le DOM réel (textContent, aria-label, data-kind, data-confidence). */

const CSS = `
/* Tableau de bord V2 de la recherche : styles du panneau et de ses seuls nœuds. */
.recit-v2-e093 .recit-v2-e093-dashboard{
  margin:8px 0 10px;padding:8px 10px;
  border:1px solid var(--line,rgba(255,255,255,.12));border-radius:10px;
  background:rgba(255,255,255,.025);
}
.recit-v2-e093 .recit-v2-e093-titre{
  margin:0 0 6px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;
  color:var(--muted,#a9a9a9);
}
.recit-v2-e093 .recit-v2-e093-criteres,
.recit-v2-e093 .recit-v2-e093-compte,
.recit-v2-e093 .recit-v2-e093-natures,
.recit-v2-e093 .recit-v2-e093-certitudes,
.recit-v2-e093 .recit-v2-e093-status{
  margin:3px 0;font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums;
  color:var(--muted-2,#8f8f8f);overflow-wrap:anywhere;
}
.recit-v2-e093 .recit-v2-e093-compte{color:var(--ink,#e8e8e8)}
.recit-v2-e093 .recit-v2-e093-resultats{
  margin:6px 0;padding-left:18px;max-height:168px;overflow:auto;
  font-size:10px;line-height:1.5;color:var(--ink,#e8e8e8);
}
.recit-v2-e093 .recit-v2-e093-resultats li{margin:2px 0;overflow-wrap:anywhere}
.recit-v2-e093 .recit-v2-e093-mark{
  background:rgba(230,185,111,.28);color:var(--gold-bright,#f5e9d0);
  font-weight:700;text-decoration:underline;text-underline-offset:2px;
}
.recit-v2-e093 .recit-v2-e093-commandes{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 4px}
.recit-v2-e093 .recit-v2-e093-btn{
  min-height:36px;padding:6px 10px;border:1px solid var(--line-strong,rgba(255,255,255,.2));
  border-radius:8px;background:transparent;color:var(--ink,#e8e8e8);
  font:inherit;font-size:10px;cursor:pointer;
}
.recit-v2-e093 .recit-v2-e093-btn[aria-pressed="true"]{
  border-color:var(--gold,#e6b96f);box-shadow:inset 0 -2px 0 var(--gold,#e6b96f);
}
.recit-v2-e093 .recit-v2-e093-btn:focus-visible{
  outline:2px solid var(--gold-bright,#f5e9d0);outline-offset:2px;
}
.recit-v2-e093 .recit-v2-e093-btn:disabled{opacity:.5;cursor:not-allowed}
.recit-v2-e093 .recit-v2-e093-resultats{transition:opacity .18s linear}
[data-v2-e093-motion="reduce"] .recit-v2-e093-resultats{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e093-resultats{transition:none}}
@media (max-width:620px){
  .recit-v2-e093 .recit-v2-e093-commandes{flex-direction:column;align-items:stretch}
  .recit-v2-e093 .recit-v2-e093-btn{min-height:40px}
  .recit-v2-e093 .recit-v2-e093-resultats{max-height:140px}
}
`;

/* Sens du tri de la liste V2 : purement local et déterministe, conservé entre
   deux rendus sans écrire dans le stockage ni dans le hasard. */
let triActif = false;

/* ---------- Utilitaires défensifs ---------- */

function securise(action) {
  try { if (typeof action === 'function') action(); }
  catch { /* chantier neutralisé : le rendu de la vue reste intact */ }
}

function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function tous(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.prototype.slice.call(root.querySelectorAll(selector)) : [];
}

function texte(noeud) {
  return noeud && typeof noeud.textContent === 'string' ? noeud.textContent.trim() : '';
}

function valeur(root, selector) {
  const noeud = q(root, selector);
  return noeud && typeof noeud.value === 'string' ? noeud.value.trim() : '';
}

function norm(s) {
  return String(s || '').toLocaleLowerCase('fr').trim();
}

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && typeof noeud.classList.add === 'function'
      && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function ecrit(id, valeurTexte) {
  const noeud = document.getElementById(id);
  if (noeud) noeud.textContent = valeurTexte;
}

/* Réutilise un nœud déjà inséré (unicité de l'id) et le replace juste après
   son ancre, sans toucher aux autres enfants du parent. */
function placeApres(id, fabrique, parent, ancre) {
  if (!parent || typeof parent.insertBefore !== 'function') return null;
  let noeud = document.getElementById(id);
  if (!noeud) noeud = fabrique();
  if (!noeud) return null;
  const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

function itemsDuFil(root) {
  let items = tous(root, '#c3a-thread .recit-thread-item');
  if (!items.length) items = tous(root, '.recit-thread-list .recit-thread-item');
  return items;
}

/* L'état d'estompage est posé par la passe 1 ; en son absence, tous les items
   présents dans le DOM sont considérés comme visibles. */
function estVisible(item) {
  const marque = item.getAttribute('data-093-estompe');
  return marque ? marque !== 'oui' : true;
}

function libelle(item) {
  const aria = item.getAttribute('aria-label') || '';
  const pos = aria.indexOf(' : ');
  if (pos >= 0) return aria.slice(pos + 3).trim();
  return texte(item).replace(/^\s*\d+\.\s*/, '').trim();
}

function extrait(root, regex) {
  const source = texte(q(root, '#c3a-status'));
  const trouvaille = regex.exec(source);
  return trouvaille && trouvaille[1] ? trouvaille[1].trim() : '';
}

function comptePar(items, attribut) {
  const resultat = {};
  items.forEach((item) => {
    const brut = item.getAttribute(attribut);
    const cle = brut && brut.trim() ? brut.trim() : 'non renseigné';
    resultat[cle] = (resultat[cle] || 0) + 1;
  });
  return resultat;
}

function formatCompte(tableau) {
  const paires = Object.keys(tableau).map((cle) => `${cle} ×${tableau[cle]}`);
  return paires.length ? paires.join(' · ') : 'aucun';
}

function ajouteSurlignage(li, label, terme) {
  const t = norm(terme);
  const base = norm(label);
  const pos = t ? base.indexOf(t) : -1;
  if (pos < 0) {
    li.appendChild(document.createTextNode(label));
    return;
  }
  li.appendChild(document.createTextNode(label.slice(0, pos)));
  const marque = document.createElement('mark');
  marque.className = 'recit-v2-e093-mark';
  marque.textContent = label.slice(pos, pos + terme.length);
  li.appendChild(marque);
  li.appendChild(document.createTextNode(label.slice(pos + terme.length)));
}

function majBoutonTri(bouton) {
  if (!bouton) return;
  bouton.setAttribute('aria-pressed', triActif ? 'true' : 'false');
  bouton.textContent = triActif ? 'Ordre du fil' : 'Trier A → Z';
  bouton.setAttribute('aria-label', triActif
    ? 'Rétablir l’ordre du fil'
    : 'Trier les résultats par ordre alphabétique');
}

/* ---------- Recalcul complet, dérivé du DOM courant ---------- */

function actualiser(root) {
  securise(() => {
    if (!document.getElementById('v2-e093-panel')) return;
    const items = itemsDuFil(root);
    const total = items.length;
    const visibles = items.filter(estVisible);

    /* Lectures uniques des critères : contrôles de la passe 1 d'abord,
       repli sur le statut de la coque si ces contrôles sont absents. */
    const recherche = valeur(root, '.recit-e093-search') || valeur(root, '#c3a-search');
    const nature = valeur(root, '.recit-e093-kind') || extrait(root, /type :\s*([^·]+)/);
    const certitude = valeur(root, '.recit-e093-conf') || extrait(root, /certitude :\s*([^·]+)/);

    /* E093-01 — Synthèse des critères actifs (nœud visible, non live). */
    const criteres = [];
    if (recherche) criteres.push(`recherche « ${recherche} »`);
    if (nature) criteres.push(`nature : ${nature}`);
    if (certitude) criteres.push(`certitude : ${certitude}`);
    ecrit('v2-e093-criteres', criteres.length
      ? `Critères actifs : ${criteres.join(' · ')}.`
      : 'Critères actifs : aucun ; le fil est parcouru dans son intégralité.');

    /* E093-02 — Correspondances du terme, comptées sur TOUS les items du fil,
       indépendamment des deux autres filtres et de l'estompage. */
    const correspondances = recherche
      ? items.filter((item) => norm(texte(item)).indexOf(norm(recherche)) >= 0).length
      : 0;
    ecrit('v2-e093-compte', recherche
      ? `Le terme « ${recherche} » apparaît dans ${correspondances} des ${total} point(s) du fil.`
      : 'Aucun terme saisi : aucun comptage de correspondances à afficher.');

    /* E093-03 — Liste des résultats visibles, libellés lus dans aria-label et
       terme surligné par création de nœuds texte + <mark>, sans injection de balisage. */
    const liste = document.getElementById('v2-e093-resultats');
    if (liste) {
      while (liste.firstChild) liste.removeChild(liste.firstChild);
      const libelles = visibles.map(libelle);
      if (triActif) libelles.sort((a, b) => norm(a).localeCompare(norm(b), 'fr'));
      libelles.forEach((libelleItem) => {
        const li = document.createElement('li');
        ajouteSurlignage(li, libelleItem, recherche);
        liste.appendChild(li);
      });
    }

    /* E093-04 — Répartition par nature des seuls résultats visibles. */
    ecrit('v2-e093-natures',
      `Résultats par nature : ${formatCompte(comptePar(visibles, 'data-kind'))}.`);

    /* E093-05 — Répartition par certitude des seuls résultats visibles. */
    ecrit('v2-e093-certitudes',
      `Résultats par certitude : ${formatCompte(comptePar(visibles, 'data-confidence'))}.`);

    /* E093-06 — Le bouton d'effacement n'est actif que si un terme est saisi. */
    const effacer = document.getElementById('v2-e093-clear');
    if (effacer) effacer.disabled = !recherche;

    /* E093-08 — Annonce V2 polie, distincte du statut de la passe 1. */
    ecrit('v2-e093-status',
      `Synthèse V2 : ${visibles.length} résultat(s) sur ${total} point(s) · ` +
      `${recherche ? `terme « ${recherche} »` : 'aucun terme'} · ` +
      `tri ${triActif ? 'alphabétique' : 'd’origine'}.`);
  });
}

/* E093-06 et E093-07 — gestionnaires des deux boutons, posés une seule fois
   par nœud (dataset propre à la V2). */
function installeBoutons(root) {
  securise(() => {
    const effacer = document.getElementById('v2-e093-clear');
    if (effacer && effacer.dataset && effacer.dataset.v2E093Bound !== '1') {
      effacer.dataset.v2E093Bound = '1';
      effacer.addEventListener('click', () => {
        securise(() => {
          /* On vide UNIQUEMENT le terme : les filtres nature et certitude de
             la passe 1 restent en place, contrairement à son « Réinitialiser ». */
          const champ = q(root, '.recit-e093-search') || q(root, '#c3a-search');
          if (!champ) return;
          champ.value = '';
          if (typeof Event === 'function') {
            champ.dispatchEvent(new Event('input', { bubbles: true }));
          }
          actualiser(root);
        });
      });
    }

    const trier = document.getElementById('v2-e093-sort');
    if (trier && trier.dataset && trier.dataset.v2E093Bound !== '1') {
      trier.dataset.v2E093Bound = '1';
      trier.addEventListener('click', () => {
        triActif = !triActif;
        majBoutonTri(trier);
        actualiser(root);
      });
    }
  });
}

/* Un seul écouteur délégué par layout, gardé par dataset : il survit à la
   création différée des contrôles de la passe 1 et ne double pas au rendu
   suivant. */
function installeVeille(layout) {
  securise(() => {
    if (!layout || typeof layout.addEventListener !== 'function') return;
    if (layout.dataset && layout.dataset.v2E093Watch === '1') return;
    if (layout.dataset) layout.dataset.v2E093Watch = '1';
    const cibles = '.recit-e093-search, .recit-e093-kind, .recit-e093-conf, #c3a-search';
    const surChangement = (evenement) => {
      const cible = evenement && evenement.target;
      if (!cible || typeof cible.matches !== 'function' || !cible.matches(cibles)) return;
      actualiser(layout);
    };
    layout.addEventListener('input', surChangement);
    layout.addEventListener('change', surChangement);
  });
}

/* ---------- Point d'entrée unique ---------- */

register('E093', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout
        || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e093', CSS); /* un seul appel, toutes les règles du module. */

    const corps = q(layout, '.recit-body');
    if (!corps) return;
    ajouteClasse(layout, 'recit-v2-e093');

    /* E093-09 — Contrôles accessibles : boutons natifs type="button", cibles
       ≥ 36 px en CSS, aria-pressed réservé à la bascule de tri indépendante,
       libellé textuel de l'état (jamais la couleur seule), focus visible en CSS. */
    let panneau = document.getElementById('v2-e093-panel');
    if (!panneau) {
      panneau = el('section', 'recit-v2-e093-dashboard');
      panneau.id = 'v2-e093-panel';
      panneau.setAttribute('aria-label', 'Synthèse de la recherche dans le fil');
      panneau.appendChild(el('p', 'recit-v2-e093-titre', 'Synthèse de la recherche'));

      const criteres = el('p', 'recit-v2-e093-criteres');
      criteres.id = 'v2-e093-criteres';
      panneau.appendChild(criteres);

      const compte = el('p', 'recit-v2-e093-compte');
      compte.id = 'v2-e093-compte';
      panneau.appendChild(compte);

      const liste = el('ul', 'recit-v2-e093-resultats');
      liste.id = 'v2-e093-resultats';
      liste.setAttribute('aria-label', 'Points du fil correspondant aux critères');
      panneau.appendChild(liste);

      const natures = el('p', 'recit-v2-e093-natures');
      natures.id = 'v2-e093-natures';
      panneau.appendChild(natures);

      const certitudes = el('p', 'recit-v2-e093-certitudes');
      certitudes.id = 'v2-e093-certitudes';
      panneau.appendChild(certitudes);

      const commandes = el('div', 'recit-v2-e093-commandes');
      const effacer = el('button', 'recit-v2-e093-btn', 'Effacer le terme');
      effacer.id = 'v2-e093-clear';
      effacer.type = 'button';
      const trier = el('button', 'recit-v2-e093-btn', 'Trier A → Z');
      trier.id = 'v2-e093-sort';
      trier.type = 'button';
      majBoutonTri(trier);
      commandes.append(effacer, trier);
      panneau.appendChild(commandes);

      const statut = el('p', 'recit-v2-e093-status');
      statut.id = 'v2-e093-status';
      statut.setAttribute('role', 'status');
      statut.setAttribute('aria-live', 'polite');
      panneau.appendChild(statut);
    }

    /* Le panneau suit la barre de la passe 1 quand elle existe, sinon le
       statut de la coque, sinon la légende : insertion non destructrice. */
    const ancre = q(corps, '.recit-e093-barre') || q(corps, '#c3a-status')
      || q(corps, '.recit-legend');
    placeApres('v2-e093-panel', () => panneau, corps, ancre);

    /* E093-10 — Mouvement réduit lu une fois par rendu ; l'adaptation mobile
       est portée par la media query en fin de feuille. */
    securise(() => {
      const reduit = Boolean(typeof reducedMotion === 'function' && reducedMotion());
      layout.setAttribute('data-v2-e093-motion', reduit ? 'reduce' : 'normal');
    });

    /* Structure d'abord, calcul et gestionnaires ensuite. */
    actualiser(corps);
    installeBoutons(corps);
    installeVeille(layout);
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
