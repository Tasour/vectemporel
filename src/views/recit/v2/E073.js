import { register } from './registry.js';

/* V2 lentille E073 — Recherche et filtrage (second regard).
 *
 * La passe 1 (`src/views/recit/E073.js`) a posé une barre de recherche/filtres
 * parallèle, l'indexage des items, l'estompage réversible, l'annonce du résultat
 * et le repli responsive. Cette passe V2 ne reprend aucun de ces chantiers : elle
 * travaille sur la barre et le fil **réels** de la vue (`#c3a-tools`,
 * `#c3a-status`, `#c3a-thread`) et ajoute dix chantiers neufs, tous dérivés du
 * DOM courant (aria-pressed des filtres, valeur du champ, data-kind /
 * data-confidence / data-fk des items, texte du statut) :
 *
 *   E073-01 pastilles de critères actifs · E073-02 compteur de résultats
 *   E073-03 facettes type/certitude · E073-04 jauge de couverture
 *   E073-05 surlignage du terme · E073-06 liste indexable des résultats
 *   E073-07 position du point courant · E073-08 état vide explicite
 *   E073-09 saut au premier résultat · E073-10 sélecteur de saut
 *
 * Greffon strictement additif : une seule classe racine `recit-v2-e073-root`
 * posée sur `layout`, un seul appel `css('recit-v2-e073', …)` (cssOnce assure
 * l'idempotence), tous les identifiants créés préfixés `v2-e073-` (la passe 1
 * occupe déjà `e073-…` sur le MÊME DOM). Zéro réseau, zéro console, zéro graine
 * aléatoire, zéro `Date.now()`. Le récit reste lisible et filtrable sans ce module.
 *
 * Les dix chantiers sont détaillés dans
 * UNIFIED_AUDIT/RECIT/V2/views/E073.md.
 */

const CSS_ID = 'recit-v2-e073';
const RACINE = 'recit-v2-e073-root';

/* Identifiants DOM — tous préfixés « v2-e073- » et uniques dans le document. */
const ID = {
  criteres: 'v2-e073-criteres',
  compte: 'v2-e073-compte',
  facettes: 'v2-e073-facettes',
  jauge: 'v2-e073-jauge',
  remplissage: 'v2-e073-jauge-remplissage',
  couverture: 'v2-e073-couverture',
  resultats: 'v2-e073-resultats',
  liste: 'v2-e073-liste',
  position: 'v2-e073-position',
  vide: 'v2-e073-vide',
  nav: 'v2-e073-nav',
  premier: 'v2-e073-premier',
  saut: 'v2-e073-saut',
};

/* Une seule feuille, injectée via ctx.css (garde d'id par cssOnce). */
const CSS = `
.recit-v2-e073-root{
  --v2-e073-or:var(--gold,#e6b96f);
  --v2-e073-encre:var(--ink,#e9e2d6);
  --v2-e073-doux:var(--muted,#a8a198);
  --v2-e073-ligne:var(--line-strong,rgba(255,255,255,.24));
}
/* E073-01 — pastilles de critères actifs : l'état est porté par le texte. */
.recit-v2-e073-root .recit-v2-e073-criteres{
  display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0;
  font-size:10px;line-height:1.5;color:var(--v2-e073-doux);
}
.recit-v2-e073-root .recit-v2-e073-chip{
  display:inline-block;padding:2px 7px;border:1px solid var(--v2-e073-or);
  border-radius:999px;background:rgba(230,185,111,.1);color:var(--v2-e073-encre);
  font-variant-numeric:tabular-nums;
}
.recit-v2-e073-root .recit-v2-e073-chip-vide{
  border-style:dashed;border-color:var(--v2-e073-ligne);background:transparent;
}
/* E073-02 — compteur de résultats : puce numérique à côté du champ. */
.recit-v2-e073-root .recit-v2-e073-compte{
  margin-left:6px;padding:2px 7px;border:1px solid var(--v2-e073-ligne);
  border-radius:6px;color:var(--v2-e073-encre);font-size:10px;
  font-variant-numeric:tabular-nums;white-space:nowrap;
}
/* E073-03 — facettes : compteurs par type et par certitude, en texte. */
.recit-v2-e073-root .recit-v2-e073-facettes{
  margin:4px 0 6px;font-size:10px;line-height:1.55;color:var(--v2-e073-doux);
  font-variant-numeric:tabular-nums;
}
/* E073-04 — jauge de couverture : remplissage dérivé du statut réel. */
.recit-v2-e073-root .recit-v2-e073-jauge{
  height:4px;margin:2px 0 4px;border-radius:999px;
  background:rgba(255,255,255,.1);overflow:hidden;
}
.recit-v2-e073-root .recit-v2-e073-jauge>span{
  display:block;height:100%;background:var(--v2-e073-or);
}
.recit-v2-e073-root .recit-v2-e073-couverture{
  margin:0 0 4px;font-size:10px;line-height:1.5;color:var(--v2-e073-doux);
  font-variant-numeric:tabular-nums;
}
/* E073-05 — surlignage du terme : renfort de forme, jamais la seule couleur. */
.recit-v2-e073-root mark.recit-v2-e073-mark{
  padding:0 1px;border-radius:2px;background:rgba(230,185,111,.38);
  color:var(--v2-e073-encre);font-weight:700;
}
/* E073-06 — liste indexable des résultats : nœuds visibles <p>/<ol>/<li>. */
.recit-v2-e073-root .recit-v2-e073-resultats{
  margin:8px 0;padding:8px 10px;border:1px solid var(--v2-e073-ligne);
  border-radius:8px;background:rgba(8,11,16,.55);
}
.recit-v2-e073-root .recit-v2-e073-resultats-titre{
  margin:0 0 4px;color:var(--v2-e073-or);font-size:10px;font-weight:700;
}
.recit-v2-e073-root .recit-v2-e073-liste{
  margin:0;padding-left:18px;font-size:10px;line-height:1.6;
  color:var(--v2-e073-encre);
}
.recit-v2-e073-root .recit-v2-e073-liste li{margin:1px 0}
/* E073-07 — position du point courant : repère chiffré et visible. */
.recit-v2-e073-root .recit-v2-e073-position{
  margin:4px 0;font-size:10px;line-height:1.5;color:var(--v2-e073-or);
  font-weight:700;font-variant-numeric:tabular-nums;
}
/* E073-08 — état vide : le message d'origine est conservé mot pour mot. */
.recit-v2-e073-root .recit-v2-e073-vide-etat{
  border-color:var(--v2-e073-or);background:rgba(230,185,111,.06);
}
.recit-v2-e073-root .recit-v2-e073-vide{
  margin:4px 0 0;font-size:10px;line-height:1.5;color:var(--v2-e073-encre);
}
/* E073-09 — saut au premier résultat : cible ≥ 36 px, focus visible. */
.recit-v2-e073-root .recit-v2-e073-nav{
  display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0;
  padding:8px 10px;border:1px solid var(--v2-e073-ligne);
  border-radius:8px;background:rgba(8,11,16,.55);
}
.recit-v2-e073-root .recit-v2-e073-label{
  color:var(--v2-e073-doux);font-size:9px;text-transform:uppercase;
  letter-spacing:.06em;
}
.recit-v2-e073-root .recit-v2-e073-btn,
.recit-v2-e073-root .recit-v2-e073-saut{
  min-height:36px;padding:6px 9px;border:1px solid var(--v2-e073-ligne);
  border-radius:6px;background:transparent;color:var(--v2-e073-encre);
  font:inherit;font-size:10px;cursor:pointer;touch-action:manipulation;
}
.recit-v2-e073-root .recit-v2-e073-btn:focus-visible,
.recit-v2-e073-root .recit-v2-e073-saut:focus-visible{
  outline:2px solid var(--v2-e073-or);outline-offset:2px;
}
/* E073-10 — sélecteur de saut : même code de forme que le bouton voisin. */
.recit-v2-e073-root .recit-v2-e073-saut{flex:1 1 180px;min-width:120px}
/* Filets de sécurité — responsive, contraste et mouvement réduit. */
@media (max-width:620px){
  .recit-v2-e073-root .recit-v2-e073-nav{flex-direction:column;align-items:stretch}
  .recit-v2-e073-root .recit-v2-e073-saut{width:100%;min-width:0}
}
@media (prefers-contrast:more){
  .recit-v2-e073-root .recit-v2-e073-criteres,
  .recit-v2-e073-root .recit-v2-e073-facettes,
  .recit-v2-e073-root .recit-v2-e073-couverture{color:#f4eee2}
}
html[data-v2-e073-motion="reduced"] .recit-v2-e073-root mark.recit-v2-e073-mark{
  background:transparent;border-bottom:2px solid var(--v2-e073-or);
}
`;

/* Écouteurs attachés une seule fois par nœud, même si runEnhancements repasse. */
const ECOUTE = new WeakSet();
const S = { ctx: null };
const RE_COMPTE = /(\d+)\s*point\(s\)\s*affiché\(s\)\s*sur\s*(\d+)/i;
const RE_POINT = /Point\s+(\d+)\s+sur\s+(\d+)/i;

/* — Gardes et utilitaires --------------------------------------------------- */

function present(node) { return !!(node && node.nodeType === 1); }
function nettoyer(value) { return String(value == null ? '' : value).trim(); }
function texte(node) { return present(node) ? nettoyer(node.textContent) : ''; }
function clip(chaine, max) {
  const s = nettoyer(chaine);
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}
function deja(id) {
  try { return typeof document !== 'undefined' ? document.getElementById(id) : null; }
  catch { return null; }
}
function creer(ctx, tag, classe, id, contenu) {
  const noeud = ctx.el(tag, classe, contenu);
  if (id) noeud.id = id;
  return noeud;
}
function portee(ctx) {
  return (ctx && ctx.layout) || (ctx && ctx.stage) || null;
}
function trouver(ctx, selecteur) {
  const scope = portee(ctx);
  if (!scope || typeof scope.querySelector !== 'function') return null;
  try { return scope.querySelector(selecteur); } catch { return null; }
}
function trouverTous(ctx, selecteur) {
  const scope = portee(ctx);
  if (!scope || typeof scope.querySelectorAll !== 'function') return [];
  try { return Array.from(scope.querySelectorAll(selecteur)); } catch { return []; }
}
function itemsDuFil(ctx) {
  return trouverTous(ctx, '.c3a-thread-item, .recit-thread-item');
}
function marquer(node, classe) {
  if (present(node) && node.classList && typeof node.classList.add === 'function') {
    node.classList.add(classe);
  }
}
function placerApres(node, reference) {
  if (!present(node)) return;
  if (present(reference) && reference.parentNode) {
    reference.parentNode.insertBefore(node, reference.nextSibling);
    return;
  }
  const corps = typeof document !== 'undefined' ? document.body : null;
  if (corps) corps.appendChild(node);
}
function placerDans(node, parent) {
  if (!present(node) || !present(parent)) return;
  parent.appendChild(node);
}
function safe(faire) { try { faire(); } catch { /* chantier neutralisé */ } }
function reduit(ctx) {
  try { return typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false; }
  catch { return false; }
}

/* Lecture des critères réellement actifs dans la barre de la vue. Les boutons
   « Tous les types / Toutes » portent aria-pressed mais un data-fk en « -all » :
   ils sont exclus, sinon le résumé annoncerait un critère qui n'en est pas un. */
function criteresActifs(ctx) {
  const champ = trouver(ctx, '#c3a-search') || deja('c3a-search');
  const recherche = nettoyer(champ && champ.value);
  const liste = [];
  if (recherche) liste.push({ libelle: 'Recherche', valeur: `«${recherche}»` });
  const boutons = trouverTous(ctx, '.c3a-filter[aria-pressed="true"]');
  boutons.forEach((bouton) => {
    const fk = nettoyer(bouton.getAttribute && bouton.getAttribute('data-fk'));
    if (/-all$/.test(fk)) return;
    let libelle = 'Filtre';
    if (fk.indexOf('c3a-kind-') >= 0) libelle = 'Type';
    else if (fk.indexOf('c3a-conf-') >= 0) libelle = 'Certitude';
    const valeur = texte(bouton);
    if (valeur) liste.push({ libelle, valeur });
  });
  return liste;
}

function navDe(ctx) {
  let nav = deja(ID.nav);
  if (!present(nav)) nav = creer(ctx, 'div', 'recit-v2-e073-nav', ID.nav);
  const ref = deja(ID.resultats) || trouver(ctx, '.recit-thread') || deja(ID.position);
  placerApres(nav, ref);
  return nav;
}

/* — E073-05 : ramassage et surlignage des textes ----------------------------- */

function collecterTextes(racine) {
  const sortie = [];
  if (!present(racine) || typeof racine.getElementsByTagName !== 'function') return sortie;
  const descendants = racine.getElementsByTagName('*');
  for (let i = 0; i < descendants.length; i += 1) {
    const noeud = descendants[i];
    const tag = String(noeud.tagName || '').toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'mark') continue;
    for (let j = 0; j < noeud.childNodes.length; j += 1) {
      const enfant = noeud.childNodes[j];
      if (enfant.nodeType === 3 && nettoyer(enfant.nodeValue)) sortie.push(enfant);
    }
  }
  for (let k = 0; k < racine.childNodes.length; k += 1) {
    const enfant = racine.childNodes[k];
    if (enfant.nodeType === 3 && nettoyer(enfant.nodeValue)) sortie.push(enfant);
  }
  return sortie;
}

function demarquer(racine) {
  if (!present(racine) || typeof racine.querySelectorAll !== 'function') return;
  const marques = racine.querySelectorAll('mark.recit-v2-e073-mark');
  for (let i = 0; i < marques.length; i += 1) {
    const marque = marques[i];
    if (!marque.parentNode) continue;
    marque.parentNode.replaceChild(document.createTextNode(marque.textContent), marque);
  }
  if (typeof racine.normalize === 'function') racine.normalize();
}

function poserMarques(noeud, aiguille) {
  const original = noeud.nodeValue;
  const lower = original.toLocaleLowerCase('fr');
  const fragment = document.createDocumentFragment();
  let curseur = 0;
  let trouvé = lower.indexOf(aiguille);
  while (trouvé >= 0) {
    if (trouvé > curseur) fragment.appendChild(document.createTextNode(original.slice(curseur, trouvé)));
    const marque = document.createElement('mark');
    marque.className = 'recit-v2-e073-mark';
    marque.textContent = original.slice(trouvé, trouvé + aiguille.length);
    fragment.appendChild(marque);
    curseur = trouvé + aiguille.length;
    trouvé = lower.indexOf(aiguille, curseur);
  }
  if (curseur < original.length) fragment.appendChild(document.createTextNode(original.slice(curseur)));
  if (noeud.parentNode) noeud.parentNode.replaceChild(fragment, noeud);
}

/* — Chantiers --------------------------------------------------------------- */

/* E073-01 — Pastilles des critères actifs, lues sur la barre réelle. */
function chantier01(ctx) {
  const critique = criteresActifs(ctx);
  const statut = deja('c3a-status') || trouver(ctx, '.c3a-status');
  let paragraphe = deja(ID.criteres);
  if (!present(paragraphe)) {
    paragraphe = creer(ctx, 'p', 'recit-v2-e073-criteres', ID.criteres);
  }
  paragraphe.textContent = '';
  if (!critique.length) {
    paragraphe.appendChild(creer(ctx, 'span',
      'recit-v2-e073-chip recit-v2-e073-chip-vide', null, 'Aucun critère actif · fil complet'));
  } else {
    critique.forEach((critere) => {
      paragraphe.appendChild(creer(ctx, 'span', 'recit-v2-e073-chip', null,
        `${critere.libelle} : ${critere.valeur}`));
    });
  }
  placerApres(paragraphe, statut);
}

/* E073-02 — Compteur de résultats, extrait du texte de #c3a-status. */
function chantier02(ctx) {
  const message = texte(deja('c3a-status'));
  const trouvaille = RE_COMPTE.exec(message);
  const outils = deja('c3a-tools') || trouver(ctx, '.c3a-tools');
  let compteur = deja(ID.compte);
  if (!present(compteur)) compteur = creer(ctx, 'span', 'recit-v2-e073-compte', ID.compte);
  compteur.textContent = trouvaille
    ? `${trouvaille[1]} résultat(s)` : 'Compteur indisponible';
  placerDans(compteur, outils);
}

/* E073-03 — Facettes : comptage dérivé de data-kind / data-confidence. */
function chantier03(ctx) {
  const types = Object.create(null);
  const certitudes = Object.create(null);
  itemsDuFil(ctx).forEach((item) => {
    const type = nettoyer(item.getAttribute && item.getAttribute('data-kind')) || 'point';
    const certitude = nettoyer(item.getAttribute && item.getAttribute('data-confidence')) || 'non renseignée';
    types[type] = (types[type] || 0) + 1;
    certitudes[certitude] = (certitudes[certitude] || 0) + 1;
  });
  let paragraphe = deja(ID.facettes);
  if (!present(paragraphe)) paragraphe = creer(ctx, 'p', 'recit-v2-e073-facettes', ID.facettes);
  const morceaux = [];
  const trier = (a, b) => a.localeCompare(b, 'fr');
  const typesPresent = Object.keys(types).sort(trier);
  const certsPresentes = Object.keys(certitudes).sort(trier);
  if (typesPresent.length) {
    morceaux.push(`Types : ${typesPresent.map((c) => `${c} ${types[c]}`).join(' · ')}`);
  }
  if (certsPresentes.length) {
    morceaux.push(`Certitudes : ${certsPresentes.map((c) => `${c} ${certitudes[c]}`).join(' · ')}`);
  }
  paragraphe.textContent = morceaux.length
    ? `${morceaux.join(' · ')}.` : 'Aucun point dans le fil affiché.';
  placerApres(paragraphe, deja(ID.criteres) || deja('c3a-status'));
}

/* E073-04 — Jauge de couverture : pourcentage calculé depuis « N sur M ». */
function chantier04(ctx) {
  const trouvaille = RE_COMPTE.exec(texte(deja('c3a-status')));
  let jauge = deja(ID.jauge);
  if (!present(jauge)) jauge = creer(ctx, 'div', 'recit-v2-e073-jauge', ID.jauge);
  let remplissage = deja(ID.remplissage);
  if (!present(remplissage)) remplissage = creer(ctx, 'span', '', ID.remplissage);
  if (remplissage.parentNode !== jauge) jauge.appendChild(remplissage);
  let couverture = deja(ID.couverture);
  if (!present(couverture)) couverture = creer(ctx, 'p', 'recit-v2-e073-couverture', ID.couverture);
  if (trouvaille) {
    const affiches = Number(trouvaille[1]);
    const total = Number(trouvaille[2]);
    const pourcent = total > 0 ? Math.round((affiches / total) * 100) : 0;
    const borne = Math.max(0, Math.min(100, pourcent));
    remplissage.style.width = `${borne}%`;
    couverture.textContent = `Couverture du fil : ${affiches} point(s) affiché(s) sur ${total} (${pourcent} %).`;
  } else {
    remplissage.style.width = '0%';
    couverture.textContent = 'Couverture du fil : mesure indisponible.';
  }
  const ref = deja(ID.facettes) || deja(ID.criteres) || deja('c3a-status');
  placerApres(couverture, ref);
  placerApres(jauge, couverture);
}

/* E073-05 — Surlignage du terme recherché dans les libellés visibles du fil.
   L'aria-label des boutons n'est jamais réécrit : le nom accessible reste stable. */
function chantier05(ctx) {
  const champ = trouver(ctx, '#c3a-search') || deja('c3a-search');
  const recherche = nettoyer(champ && champ.value);
  const aiguille = recherche ? recherche.toLocaleLowerCase('fr') : '';
  itemsDuFil(ctx).forEach((item) => {
    demarquer(item);
    if (!aiguille) return;
    collecterTextes(item).forEach((noeud) => {
      if (noeud.nodeValue.toLocaleLowerCase('fr').indexOf(aiguille) >= 0) {
        poserMarques(noeud, aiguille);
      }
    });
  });
}

/* E073-06 — Liste indexable des résultats : textes de synthèse en <p>/<ol>/<li>. */
function chantier06(ctx) {
  const items = itemsDuFil(ctx);
  let bloc = deja(ID.resultats);
  if (!present(bloc)) bloc = creer(ctx, 'div', 'recit-v2-e073-resultats', ID.resultats);
  let titre = bloc.querySelector('.recit-v2-e073-resultats-titre');
  if (!present(titre)) {
    titre = creer(ctx, 'p', 'recit-v2-e073-resultats-titre', null, '');
    bloc.appendChild(titre);
  }
  titre.textContent = `Résultats affichés dans le fil (${items.length}) :`;
  let liste = deja(ID.liste);
  if (!present(liste) || liste.parentNode !== bloc) {
    liste = creer(ctx, 'ol', 'recit-v2-e073-liste', ID.liste);
    bloc.appendChild(liste);
  }
  liste.textContent = '';
  items.forEach((item) => {
    const libelle = nettoyer(item.getAttribute && item.getAttribute('aria-label')) || texte(item);
    const certitude = nettoyer(item.getAttribute && item.getAttribute('data-confidence'));
    const ajout = certitude && libelle.toLocaleLowerCase('fr').indexOf(certitude.toLocaleLowerCase('fr')) < 0
      ? ` · certitude : ${certitude}` : '';
    liste.appendChild(ctx.el('li', '', libelle + ajout));
  });
  placerApres(bloc, trouver(ctx, '.recit-thread') || deja(ID.position));
}

/* E073-07 — Position du point courant, lue sur aria-current et l'aria-label. */
function chantier07(ctx) {
  const items = itemsDuFil(ctx);
  const courant = trouver(ctx,
    '#c3a-thread .c3a-thread-item[aria-current="step"], .c3a-thread-item.is-current, .recit-thread-item.is-current');
  let paragraphe = deja(ID.position);
  if (!present(paragraphe)) paragraphe = creer(ctx, 'p', 'recit-v2-e073-position', ID.position);
  const libelle = courant ? nettoyer(courant.getAttribute && courant.getAttribute('aria-label')) : '';
  const trouvaille = RE_POINT.exec(libelle);
  const rang = courant ? items.indexOf(courant) + 1 : 0;
  if (trouvaille && rang > 0) {
    paragraphe.textContent = `Point courant : ${trouvaille[1]} sur ${trouvaille[2]} du repère · `
      + `rang ${rang} parmi les ${items.length} point(s) affiché(s).`;
  } else if (courant && rang > 0) {
    paragraphe.textContent = `Point courant : rang ${rang} parmi les ${items.length} point(s) affiché(s).`;
  } else {
    paragraphe.textContent = 'Aucun point courant dans le fil affiché.';
  }
  placerApres(paragraphe, deja(ID.jauge) || deja(ID.couverture) || deja(ID.facettes));
}

/* E073-08 — État vide : le message d'origine est gardé, un complément est ajouté. */
function chantier08(ctx) {
  const vide = trouver(ctx, '#c3a-empty') || deja('c3a-empty');
  let complement = deja(ID.vide);
  if (!present(vide)) {
    if (present(complement) && complement.parentNode) complement.parentNode.removeChild(complement);
    return;
  }
  if (!present(complement)) complement = creer(ctx, 'p', 'recit-v2-e073-vide', ID.vide);
  marquer(vide, 'recit-v2-e073-vide-etat');
  const critique = criteresActifs(ctx);
  complement.textContent = critique.length
    ? `Aucun résultat avec ${critique.length} critère(s) actif(s) : `
      + `${critique.map((c) => `${c.libelle} ${c.valeur}`).join(' · ')}.`
    : 'Aucun résultat alors qu’aucun critère n’est actif : le fil du repère est vide.';
  if (complement.parentNode !== vide) vide.appendChild(complement);
}

/* E073-09 — Bouton « premier résultat » : focus clavier sur le premier item. */
function chantier09(ctx) {
  const nav = navDe(ctx);
  let bouton = deja(ID.premier);
  if (!present(bouton)) {
    bouton = creer(ctx, 'button', 'recit-v2-e073-btn', ID.premier, 'Atteindre le premier résultat');
  }
  bouton.type = 'button';
  bouton.title = 'Place le focus sur le premier point affiché du fil';
  if (bouton.parentNode !== nav) nav.appendChild(bouton);
  if (!ECOUTE.has(bouton)) {
    ECOUTE.add(bouton);
    bouton.addEventListener('click', () => {
      const actif = S.ctx || ctx;
      const premier = itemsDuFil(actif)[0];
      if (!present(premier)) return;
      try { premier.focus({ preventScroll: reduit(actif) }); }
      catch { premier.focus(); }
    });
  }
}

/* E073-10 — Sélecteur de saut : options construites depuis les items affichés. */
function chantier10(ctx) {
  const nav = navDe(ctx);
  let select = deja(ID.saut);
  if (!present(select)) {
    select = creer(ctx, 'select', 'recit-v2-e073-saut', ID.saut);
    select.setAttribute('aria-label', 'Sauter vers un point affiché du fil');
  }
  let etiquette = nav.querySelector('label');
  if (!present(etiquette)) {
    etiquette = creer(ctx, 'label', 'recit-v2-e073-label', null, 'Aller au point');
    etiquette.htmlFor = ID.saut;
  }
  if (etiquette.parentNode !== nav) nav.appendChild(etiquette);
  if (select.parentNode !== nav) nav.appendChild(select);

  const items = itemsDuFil(ctx);
  select.textContent = '';
  const videOption = ctx.el('option', '', 'Choisir un point…');
  videOption.value = '';
  select.appendChild(videOption);
  items.forEach((item) => {
    const fk = nettoyer(item.getAttribute && item.getAttribute('data-fk'));
    const libelle = nettoyer(item.getAttribute && item.getAttribute('aria-label')) || texte(item);
    const option = ctx.el('option', '', clip(libelle, 70));
    option.value = fk;
    select.appendChild(option);
  });
  if (!ECOUTE.has(select)) {
    ECOUTE.add(select);
    select.addEventListener('change', () => {
      const fk = select.value;
      if (!fk || !/^[A-Za-z0-9_-]+$/.test(fk)) return;
      const cible = trouver(S.ctx || ctx, `#c3a-thread [data-fk="${fk}"]`);
      if (present(cible) && typeof cible.click === 'function') cible.click();
    });
  }
}

register('E073', (ctx) => {
  /* Garde d'existence globale : une lentille ne doit jamais faire échouer le rendu. */
  try {
    if (!ctx || !ctx.layout || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
    S.ctx = ctx;

    /* Un seul bloc CSS pour toute la lentille (cssOnce garantit l'idempotence). */
    try { ctx.css(CSS_ID, CSS); } catch { /* rendu préservé coûte que coûte */ }

    marquer(ctx.layout, RACINE);
    const racine = typeof document !== 'undefined' ? document.documentElement : null;
    if (racine && racine.dataset) racine.dataset.v2E073Motion = reduit(ctx) ? 'reduced' : 'full';

    /* E073-01 — pastilles de critères actifs */
    safe(() => chantier01(ctx));
    /* E073-02 — compteur de résultats */
    safe(() => chantier02(ctx));
    /* E073-03 — facettes type/certitude */
    safe(() => chantier03(ctx));
    /* E073-04 — jauge de couverture */
    safe(() => chantier04(ctx));
    /* E073-05 — surlignage du terme recherché */
    safe(() => chantier05(ctx));
    /* E073-06 — liste indexable des résultats */
    safe(() => chantier06(ctx));
    /* E073-07 — position du point courant */
    safe(() => chantier07(ctx));
    /* E073-08 — état vide explicite */
    safe(() => chantier08(ctx));
    /* E073-09 — saut au premier résultat */
    safe(() => chantier09(ctx));
    /* E073-10 — sélecteur de saut vers un point affiché */
    safe(() => chantier10(ctx));
  } catch {
    /* Enrichissement non destructif : le récit reste lisible et filtrable sans cette lentille. */
  }
});
