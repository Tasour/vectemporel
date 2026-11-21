import { register } from './registry.js';

/*
 * Lentille E003 — « Recherche et filtrage » (vue Récit).
 *
 * Dix chantiers concrets et distincts (E003-01 … E003-10) sont implémentés dans
 * CE seul module : aucun fichier partagé n'est modifié. La coque reconstruisant
 * le DOM à chaque rendu, apply() recrée ses nœuds dans le stage courant ; les
 * préférences et compteurs vivent dans l'état de module et survivent aux
 * reconstructions. L'écouteur clavier global est posé une seule fois.
 *
 * Une seule feuille de style : ctx.css('recit-e003', …), cadrée par
 * .recit-layout[data-e003="on"]. Toutes les classes créées sont préfixées
 * `recit-e003-` ; tous les ids sont préfixés `e003-` et uniques. Zéro console,
 * zéro réseau, zéro aléa, zéro innerHTML. Enrichissement non destructif : aucun
 * texte n'est retiré, aucun contrôle existant n'est ré-attribué ; sans JS, le
 * récit reste lisible et le fil utilisable. Mouvement réduit : aucune transition.
 */

const CSS_ID = 'recit-e003';
const CLE_RECENTES = 'e003-recherches-recentes';
const MAX_RECENTES = 5;
const PREFIXE_KIND = 'c3a-kind-';
const PREFIXE_CONF = 'c3a-conf-';

const CERTITUDE = {
  'vérifié': 'Vérifié',
  'certain': 'Certain',
  'probable': 'Probable',
  'disputed': 'Contesté',
};

/* État module — jamais écrit ailleurs. */
let latest = null;
let ecouteurs = false;
let sousRequete = '';
let recentes = [];
let derniereRecherche = null;
let usagesClavier = 0;

const CHAMPS = [
  ['criteres', 'Critères actifs : —'],
  ['facettes', 'Facettes : —'],
  ['surlignage', 'Surlignage : —'],
  ['navigation', 'Navigation : —'],
  ['secondaire', 'Recherche secondaire : —'],
  ['recentes', 'Recherches récentes : —'],
  ['densite', 'Densité : —'],
  ['clavier', 'Clavier : —'],
  ['mouvement', 'Mouvement : —'],
];

/* Feuille unique. Aucune ressource distante, aucune règle globale. */
const RULES = `
.recit-layout[data-e003="on"] .recit-e003-facette{
  display:inline-block;min-width:16px;margin-left:5px;padding:0 4px;
  border:1px solid var(--line);border-radius:999px;color:var(--muted-2);
  font-size:8px;line-height:14px;text-align:center;font-variant-numeric:tabular-nums;
}
.recit-e003-marqueur{background:rgba(230,185,111,.24);color:var(--gold-bright);border-radius:2px;padding:0 1px}
.recit-layout[data-e003="on"] .recit-e003-titre-correspond{box-shadow:inset 0 -2px 0 rgba(230,185,111,.45)}
.recit-e003-criteres{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin:0 0 9px}
.recit-e003-criteres-label{color:var(--muted-2);font-size:9px}
.recit-e003-puce{display:inline-flex;align-items:center;gap:4px;min-height:24px;padding:2px 4px 2px 8px;border:1px solid var(--line-strong);border-radius:999px;color:var(--gold-bright);font-size:9px}
.recit-e003-puce-vide{color:var(--muted-2);border-style:dashed;padding-right:8px}
.recit-e003-puce-action{min-width:24px;min-height:24px;padding:0 4px;border:0;border-radius:999px;background:transparent;color:inherit;font:inherit;font-size:12px;line-height:1;cursor:pointer}
.recit-e003-puce-action:hover{background:rgba(230,185,111,.14)}
.recit-e003-puce-action:focus-visible{outline:2px solid var(--gold-bright);outline-offset:1px}
.recit-e003-nav-resultats{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 8px}
.recit-e003-nav-bouton{min-height:36px;padding:4px 10px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--muted);font:inherit;font-size:9px;cursor:pointer}
.recit-e003-nav-bouton:hover:not([disabled]){border-color:var(--gold);color:var(--ink)}
.recit-e003-nav-bouton:disabled{opacity:.4;cursor:not-allowed}
.recit-e003-nav-bouton:focus-visible,.recit-e003-aide summary:focus-visible,.recit-e003-recente:focus-visible,.recit-e003-dans-champ:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-e003-nav-compte{color:var(--gold-bright);font-size:10px;font-variant-numeric:tabular-nums}
.recit-e003-aide{margin:0 0 10px;color:var(--muted-2);font-size:9px}
.recit-e003-aide summary{min-height:30px;display:flex;align-items:center;cursor:pointer;color:var(--muted)}
.recit-e003-aide p{margin:5px 0;line-height:1.5}
.recit-e003-recentes{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin:0 0 10px}
.recit-e003-recentes-label{color:var(--muted-2);font-size:9px}
.recit-e003-recente{min-height:30px;padding:3px 8px;border:1px solid var(--line);border-radius:999px;background:transparent;color:var(--muted);font:inherit;font-size:9px;cursor:pointer}
.recit-e003-recente:hover{border-color:var(--gold);color:var(--ink)}
.recit-e003-recente-vide{color:var(--muted-2);font-size:9px}
.recit-e003-dans{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 10px;padding:8px 9px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.recit-e003-dans-label{color:var(--muted);font-size:9px}
.recit-e003-dans-champ{flex:1 1 150px;min-width:140px;min-height:36px;padding:5px 8px;border:1px solid var(--line);border-radius:7px;background:rgba(255,255,255,.03);color:var(--ink);font:inherit;font-size:10px}
.recit-e003-dans-champ::placeholder{color:var(--muted-2)}
.recit-e003-dans-status{flex:1 1 100%;margin:0;color:var(--muted-2);font-size:9px;line-height:1.4;font-variant-numeric:tabular-nums}
.recit-layout[data-e003="on"] .recit-thread-item.recit-e003-item-estompe{opacity:.45}
.recit-layout[data-e003="on"] .recit-thread-item.recit-e003-item-trouve{box-shadow:inset 0 0 0 1px rgba(230,185,111,.5)}
.recit-e003-panel{display:none !important}
body.recit-diagnostics .recit-e003-panel,
body.recit-diagnostics [data-recit-diagnostic].recit-e003-panel{
  display:block !important;margin:0 0 12px;padding:8px 10px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02);
}
.recit-e003-panel h2{margin:0 0 6px;color:var(--gold);font-size:12px;font-weight:600}
.recit-e003-panel p{margin:0 0 4px;color:var(--muted);font-size:11px;line-height:1.45;font-variant-numeric:tabular-nums}
.recit-layout[data-e003="on"].recit-e003-sans-mouvement .recit-e003-marqueur,
.recit-layout[data-e003="on"].recit-e003-sans-mouvement .recit-thread-item,
.recit-layout[data-e003="on"].recit-e003-sans-mouvement .recit-e003-nav-bouton{
  transition:none !important;animation:none !important;
}
`;

/* ---------- Utilitaires purs : aucun effet de bord, aucune donnée inventée ---------- */

function fold(value) {
  const text = String(value == null ? '' : value);
  try {
    return typeof text.normalize === 'function'
      ? text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      : text.toLowerCase();
  } catch {
    return text.toLowerCase();
  }
}

function occurrences(text, needle) {
  const a = fold(text);
  const b = fold(needle);
  if (!b) return 0;
  let n = 0;
  let i = 0;
  while ((i = a.indexOf(b, i)) !== -1) {
    n += 1;
    i += b.length;
  }
  return n;
}

function lirePosition(layout) {
  const kicker = layout.querySelector('.view-kicker');
  const found = kicker && /Étape\s+(\d+)\s*\/\s*(\d+)/.exec(kicker.textContent || '');
  if (found) {
    return { index: Math.max(0, Number(found[1]) - 1), total: Math.max(0, Number(found[2])) };
  }
  return { index: 0, total: 0 };
}

function collecterItems(layout) {
  const list = layout.querySelector('#c3a-thread') || layout.querySelector('.recit-thread-list');
  const noeuds = list
    ? list.querySelectorAll('.recit-thread-item')
    : layout.querySelectorAll('.recit-thread-item');
  const items = [];
  if (!noeuds || typeof noeuds.forEach !== 'function') return items;
  noeuds.forEach((button) => {
    items.push({
      button,
      text: (button.textContent || '').trim(),
      kind: button.dataset ? (button.dataset.kind || '') : '',
      conf: button.dataset ? (button.dataset.confidence || '') : '',
    });
  });
  return items;
}

function criteresActifs(layout) {
  const actifs = { query: '', kind: '', conf: '' };
  const search = layout.querySelector('#c3a-search') || document.getElementById('c3a-search');
  if (search && typeof search.value === 'string') actifs.query = search.value.trim();
  const boutons = layout.querySelectorAll('.c3a-filter[aria-pressed="true"]');
  if (boutons && typeof boutons.forEach === 'function') {
    boutons.forEach((button) => {
      const fk = button.dataset ? (button.dataset.fk || '') : '';
      if (fk === 'c3a-kind-all' || fk === 'c3a-conf-all') return;
      if (fk.indexOf(PREFIXE_KIND) === 0) actifs.kind = fk.slice(PREFIXE_KIND.length);
      else if (fk.indexOf(PREFIXE_CONF) === 0) actifs.conf = fk.slice(PREFIXE_CONF.length);
    });
  }
  return actifs;
}

function cliquerFiltre(fk) {
  const cur = latest;
  const racine = cur && cur.layout ? cur.layout : document;
  if (!racine || typeof racine.querySelector !== 'function') return;
  const bouton = racine.querySelector('[data-fk="' + fk + '"]');
  if (bouton && typeof bouton.click === 'function') bouton.click();
}

function effacerRecherche() {
  const search = document.getElementById('c3a-search');
  if (!search) return;
  search.value = '';
  try { search.dispatchEvent(new Event('input', { bubbles: true })); }
  catch { /* événement indisponible : le fil reste inchangé, sans erreur */ }
}

function lireRecentes() {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return [];
    const brut = window.sessionStorage.getItem(CLE_RECENTES);
    if (!brut) return [];
    const parse = JSON.parse(brut);
    if (!Array.isArray(parse)) return [];
    return parse.filter((x) => typeof x === 'string' && x.trim()).slice(0, MAX_RECENTES);
  } catch {
    return [];
  }
}

function ecrireRecentes(liste) {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    window.sessionStorage.setItem(CLE_RECENTES, JSON.stringify(liste.slice(0, MAX_RECENTES)));
  } catch {
    /* stockage indisponible : la mémoire de module reste suffisante */
  }
}

/* ---------- E003-01 — compteurs de facettes sur les filtres existants ---------- */

function ajouterFacettes(el, layout, items) {
  const groupes = [
    { prefixe: PREFIXE_KIND, cle: 'kind' },
    { prefixe: PREFIXE_CONF, cle: 'conf' },
  ];
  const resume = {};
  groupes.forEach((groupe) => {
    const boutons = layout.querySelectorAll('[data-fk^="' + groupe.prefixe + '"]');
    if (!boutons || typeof boutons.forEach !== 'function') return;
    const morceaux = [];
    boutons.forEach((bouton) => {
      const fk = bouton.dataset ? (bouton.dataset.fk || '') : '';
      if (fk === groupe.prefixe + 'all') return;
      const valeur = fk.slice(groupe.prefixe.length);
      if (!valeur) return;
      let compte = 0;
      items.forEach((item) => { if (item[groupe.cle] === valeur) compte += 1; });
      if (!bouton.querySelector('.recit-e003-facette')) {
        const badge = el('span', 'recit-e003-facette', String(compte));
        badge.setAttribute('aria-hidden', 'true');
        bouton.appendChild(badge);
      }
      morceaux.push(valeur + ' ' + compte);
    });
    resume[groupe.cle] = morceaux.join(' · ');
  });
  return 'type [' + (resume.kind || '—') + '] · certitude [' + (resume.conf || '—') + ']';
}

/* ---------- E003-02 — surlignage literal des occurrences du terme ---------- */

function ajouterSurlignage(el, layout, query) {
  layout.dataset.e003Marques = '0';
  if (!query) return 0;
  const aiguille = fold(query);
  if (!aiguille) return 0;
  let total = 0;
  const boutons = Array.from(layout.querySelectorAll('.recit-thread-item'));
  boutons.forEach((bouton) => {
    if (!bouton.dataset || bouton.dataset.e003Marque === '1') return;
    bouton.dataset.e003Marque = '1';
    const enfants = Array.from(bouton.childNodes || []);
    enfants.forEach((noeud) => {
      if (!noeud || noeud.nodeType !== 3 || !noeud.nodeValue) return;
      const brut = noeud.nodeValue;
      const plat = fold(brut);
      if (plat.indexOf(aiguille) === -1) return;
      const fragment = document.createDocumentFragment();
      let depuis = 0;
      let position = 0;
      let coups = 0;
      while ((position = plat.indexOf(aiguille, depuis)) !== -1) {
        if (position > depuis) fragment.appendChild(document.createTextNode(brut.slice(depuis, position)));
        fragment.appendChild(el('mark', 'recit-e003-marqueur', brut.slice(position, position + aiguille.length)));
        depuis = position + aiguille.length;
        coups += 1;
      }
      if (depuis < brut.length) fragment.appendChild(document.createTextNode(brut.slice(depuis)));
      if (noeud.parentNode && fragment.childNodes.length) noeud.parentNode.replaceChild(fragment, noeud);
      total += coups;
    });
  });
  const titre = layout.querySelector('#recit-point-title') || layout.querySelector('.recit-title');
  if (titre && fold(titre.textContent || '').indexOf(aiguille) !== -1) {
    titre.classList.add('recit-e003-titre-correspond');
  }
  layout.dataset.e003Marques = String(total);
  return total;
}

/* ---------- E003-03 — puces des critères actifs, effaçables une à une ---------- */

function puce(el, libelle, intituleAction, action) {
  const rangee = el('span', 'recit-e003-puce');
  rangee.appendChild(el('span', '', libelle));
  const bouton = el('button', 'recit-e003-puce-action', '×');
  bouton.type = 'button';
  bouton.setAttribute('aria-label', intituleAction);
  bouton.addEventListener('click', action);
  rangee.appendChild(bouton);
  return rangee;
}

function ajouterCriteres(el, layout, actifs) {
  const statut = layout.querySelector('#c3a-status') || layout.querySelector('.c3a-status');
  if (!statut || !statut.parentNode || layout.querySelector('#e003-criteres')) return null;
  const rangee = el('div', 'recit-e003-criteres');
  rangee.id = 'e003-criteres';
  rangee.appendChild(el('span', 'recit-e003-criteres-label', 'Critères actifs :'));
  let nombre = 0;
  if (actifs.query) {
    nombre += 1;
    rangee.appendChild(puce(el, 'Recherche : « ' + actifs.query + ' »', 'Effacer la recherche', effacerRecherche));
  }
  if (actifs.kind) {
    nombre += 1;
    rangee.appendChild(puce(el, 'Type : ' + actifs.kind, 'Retirer le filtre de type',
      () => cliquerFiltre('c3a-kind-all')));
  }
  if (actifs.conf) {
    nombre += 1;
    rangee.appendChild(puce(el, 'Certitude : ' + (CERTITUDE[actifs.conf] || actifs.conf),
      'Retirer le filtre de certitude', () => cliquerFiltre('c3a-conf-all')));
  }
  if (!nombre) rangee.appendChild(el('span', 'recit-e003-puce recit-e003-puce-vide', 'aucun — tous les points du repère'));
  statut.parentNode.insertBefore(rangee, statut.nextSibling);
  return rangee;
}

/* ---------- E003-04 — navigation bornée entre résultats filtrés ---------- */

function naviguerResultats(delta) {
  const cur = latest;
  if (!cur || !cur.items || !cur.items.length) return;
  const liste = cur.items;
  let position = liste.findIndex((item) =>
    item.button.getAttribute('aria-current') === 'step' || item.button.classList.contains('is-current'));
  if (position < 0) position = 0;
  const suivant = (position + delta + liste.length) % liste.length;
  const cible = liste[suivant] && liste[suivant].button;
  if (cible && typeof cible.click === 'function') cible.click();
}

function ajouterNavigation(el, layout, items) {
  const fil = layout.querySelector('.recit-thread');
  if (!fil || layout.querySelector('#e003-nav-resultats')) return null;
  const rangee = el('div', 'recit-e003-nav-resultats');
  rangee.id = 'e003-nav-resultats';
  const precedente = el('button', 'recit-e003-nav-bouton', '← Résultat précédent');
  precedente.id = 'e003-result-prec';
  precedente.type = 'button';
  const compte = el('span', 'recit-e003-nav-compte', '0 / 0');
  compte.id = 'e003-result-compte';
  const suivante = el('button', 'recit-e003-nav-bouton', 'Résultat suivant →');
  suivante.id = 'e003-result-suiv';
  suivante.type = 'button';
  let position = items.findIndex((item) =>
    item.button.getAttribute('aria-current') === 'step' || item.button.classList.contains('is-current'));
  if (position < 0) position = 0;
  compte.textContent = items.length ? (position + 1) + ' / ' + items.length : '0 / 0';
  precedente.disabled = items.length < 2;
  suivante.disabled = items.length < 2;
  precedente.addEventListener('click', () => naviguerResultats(-1));
  suivante.addEventListener('click', () => naviguerResultats(1));
  rangee.append(precedente, compte, suivante);
  const titre = fil.querySelector('.recit-thread-title');
  if (titre && titre.parentNode === fil) fil.insertBefore(rangee, titre.nextSibling);
  else fil.insertBefore(rangee, fil.firstChild);
  return compte.textContent;
}

/* ---------- E003-05 — vocabulaire local proposé au champ de recherche ---------- */

function ajouterSuggestions(el, layout, items, search) {
  const ancienne = document.getElementById('e003-suggestions');
  if (ancienne && ancienne.parentNode) {
    try { ancienne.parentNode.removeChild(ancienne); } catch { /* déjà détachée */ }
  }
  const frequences = new Map();
  items.forEach((item) => {
    String(item.text || '').split(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9]+/).forEach((mot) => {
      const nettoye = fold(mot);
      if (nettoye.length >= 4 && !/^\d+$/.test(nettoye)) {
        frequences.set(nettoye, (frequences.get(nettoye) || 0) + 1);
      }
    });
  });
  const termes = Array.from(frequences.entries())
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map((entree) => entree[0]);
  const liste = el('datalist');
  liste.id = 'e003-suggestions';
  termes.forEach((terme) => {
    const option = el('option', '', terme);
    option.value = terme;
    liste.appendChild(option);
  });
  const outils = layout.querySelector('#c3a-tools') || layout.querySelector('.c3a-tools');
  const corps = layout.querySelector('.recit-body');
  if (outils && outils.parentNode) outils.parentNode.insertBefore(liste, outils.nextSibling);
  else if (corps) corps.appendChild(liste);
  if (search && !search.hasAttribute('list')) search.setAttribute('list', 'e003-suggestions');
  return termes.length;
}

/* ---------- E003-06 — aide repliée sur le contrat de recherche ---------- */

function ajouterAide(el, layout) {
  if (layout.querySelector('#e003-aide')) return null;
  const details = el('details', 'recit-e003-aide');
  details.id = 'e003-aide';
  details.appendChild(el('summary', '', 'Comment chercher dans ce repère ?'));
  [
    'La recherche porte sur le texte des points, leur type, leur certitude et l’année du repère ; les critères se cumulent (ET).',
    'Les nombres entre parenthèses sur les filtres comptent les points actuellement affichés pour chaque valeur.',
    'Raccourcis : / place le curseur dans la recherche, Échap l’efface, ↑ ↓ parcourent le fil, Entrée ouvre le point.',
    'Aucune donnée n’est envoyée : tout est calculé localement à partir des points déjà chargés dans la page.',
  ].forEach((texte) => details.appendChild(el('p', '', texte)));
  const statut = layout.querySelector('#c3a-status') || layout.querySelector('.c3a-status');
  const outils = layout.querySelector('#c3a-tools') || layout.querySelector('.c3a-tools');
  if (statut && statut.parentNode) statut.parentNode.insertBefore(details, statut.nextSibling);
  else if (outils && outils.parentNode) outils.parentNode.insertBefore(details, outils.nextSibling);
  return details;
}

/* ---------- E003-07 — requêtes récentes conservées dans la session ---------- */

function appliquerRecente(terme) {
  const search = document.getElementById('c3a-search');
  if (!search) return;
  search.value = terme;
  try { search.dispatchEvent(new Event('input', { bubbles: true })); } catch { /* sans effet */ }
  try { search.focus(); } catch { /* focus refusé */ }
}

function ajouterRecententes(el, layout, query) {
  const statut = layout.querySelector('#c3a-status') || layout.querySelector('.c3a-status');
  if (!statut || !statut.parentNode || layout.querySelector('#e003-recentes')) return null;
  if (!recentes.length) recentes = lireRecentes();
  if (query && query !== derniereRecherche) {
    recentes = [query].concat(recentes.filter((r) => r !== query)).slice(0, MAX_RECENTES);
    ecrireRecentes(recentes);
    derniereRecherche = query;
  } else if (!query) {
    derniereRecherche = null;
  }
  const rangee = el('div', 'recit-e003-recentes');
  rangee.id = 'e003-recentes';
  rangee.appendChild(el('span', 'recit-e003-recentes-label', 'Recherches récentes :'));
  if (!recentes.length) {
    rangee.appendChild(el('span', 'recit-e003-recente-vide', 'aucune dans cette session'));
  } else {
    recentes.forEach((terme) => {
      const bouton = el('button', 'recit-e003-recente', terme);
      bouton.type = 'button';
      bouton.setAttribute('aria-label', 'Relancer la recherche : ' + terme);
      bouton.addEventListener('click', () => appliquerRecente(terme));
      rangee.appendChild(bouton);
    });
  }
  statut.parentNode.insertBefore(rangee, statut.nextSibling);
  return rangee;
}

/* ---------- E003-08 — recherche secondaire dans les résultats affichés ---------- */

function appliquerSecondaire() {
  const cur = latest;
  if (!cur || !cur.layout || !cur.layout.isConnected) return;
  const actif = Boolean(fold(sousRequete).trim());
  let trouves = 0;
  cur.items.forEach((item) => {
    const coups = actif ? occurrences(item.text, sousRequete) : 0;
    item.button.classList.toggle('recit-e003-item-estompe', actif && coups === 0);
    item.button.classList.toggle('recit-e003-item-trouve', actif && coups > 0);
    if (coups > 0) trouves += 1;
  });
  const statut = cur.refs && cur.refs.sousStatut;
  if (statut) {
    statut.textContent = actif
      ? trouves + ' résultat(s) sur ' + cur.items.length + ' point(s) affiché(s) pour « ' + sousRequete.trim() + ' » (recherche secondaire, sans modifier le fil principal).'
      : 'Recherche secondaire inactive : ' + cur.items.length + ' point(s) affiché(s).';
  }
  cur.sousResultats = trouves;
  mesurer();
}

function ajouterSecondaire(el, layout) {
  const fil = layout.querySelector('.recit-thread');
  if (!fil || layout.querySelector('#e003-dans-results')) return null;
  const rangee = el('div', 'recit-e003-dans');
  rangee.id = 'e003-dans-results';
  const libelle = el('label', 'recit-e003-dans-label', 'Chercher parmi les résultats affichés');
  libelle.htmlFor = 'e003-dans-champ';
  const champ = el('input', 'recit-e003-dans-champ');
  champ.id = 'e003-dans-champ';
  champ.type = 'search';
  champ.placeholder = 'Dans ces résultats…';
  champ.setAttribute('aria-controls', 'c3a-thread');
  champ.value = sousRequete;
  const statut = el('p', 'recit-e003-dans-status', 'Recherche secondaire inactive.');
  statut.id = 'e003-dans-status';
  statut.setAttribute('role', 'status');
  statut.setAttribute('aria-live', 'polite');
  champ.addEventListener('input', () => {
    sousRequete = typeof champ.value === 'string' ? champ.value : '';
    appliquerSecondaire();
  });
  rangee.append(libelle, champ, statut);
  const navigation = layout.querySelector('#e003-nav-resultats');
  const titre = fil.querySelector('.recit-thread-title');
  if (navigation && navigation.parentNode === fil) fil.insertBefore(rangee, navigation.nextSibling);
  else if (titre && titre.parentNode === fil) fil.insertBefore(rangee, titre.nextSibling);
  else fil.insertBefore(rangee, fil.firstChild);
  latest.refs.sousChamp = champ;
  latest.refs.sousStatut = statut;
  return rangee;
}

/* ---------- E003-09 — raccourcis clavier locaux, sans conflit avec la coque ---------- */

function installerClavier() {
  if (ecouteurs || typeof window === 'undefined') return;
  ecouteurs = true;
  window.addEventListener('keydown', (event) => {
    if (!latest || !latest.layout || !latest.layout.isConnected) return;
    const cible = event.target;
    const balise = cible && cible.tagName ? String(cible.tagName).toLowerCase() : '';
    const saisie = balise === 'input' || balise === 'textarea' || (cible && cible.isContentEditable === true);
    if (event.key === '/' && !saisie && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const recherche = document.getElementById('c3a-search');
      if (recherche) {
        event.preventDefault();
        try { recherche.focus(); } catch { /* focus refusé */ }
        if (typeof recherche.select === 'function') recherche.select();
        usagesClavier += 1;
        mesurer();
      }
      return;
    }
    if (event.key === 'Escape' && saisie && cible
      && (cible.id === 'c3a-search' || cible.id === 'e003-dans-champ')) {
      cible.value = '';
      try { cible.dispatchEvent(new Event('input', { bubbles: true })); } catch { /* sans effet */ }
      usagesClavier += 1;
      mesurer();
    }
  }, false);
}

/* ---------- E003-10 — panneau de mesures, visible dans le tiroir diagnostic ---------- */

function ajouterPanneau(el, stage) {
  const ancien = document.getElementById('e003-mesures');
  if (ancien && ancien.parentNode) {
    try { ancien.parentNode.removeChild(ancien); } catch { /* déjà détaché */ }
  }
  const panneau = el('section', 'recit-e003-panel');
  panneau.id = 'e003-mesures';
  panneau.setAttribute('data-recit-diagnostic', '');
  panneau.setAttribute('aria-label', 'Mesures de la recherche et du filtrage du récit');
  panneau.appendChild(el('h2', '', 'E003 — Recherche et filtrage · mesures'));
  const noeuds = {};
  CHAMPS.forEach(([cle, texte]) => {
    const ligne = el('p', '', texte);
    ligne.id = 'e003-mesure-' + cle;
    panneau.appendChild(ligne);
    noeuds[cle] = ligne;
  });
  stage.appendChild(panneau);
  return noeuds;
}

function mesurer() {
  const cur = latest;
  if (!cur || !cur.nodes) return;
  const poser = (cle, texte) => {
    const noeud = cur.nodes[cle];
    if (noeud && noeud.textContent !== texte) noeud.textContent = texte;
  };
  const actifs = cur.actifs || { query: '', kind: '', conf: '' };
  const liste = [];
  if (actifs.query) liste.push('recherche');
  if (actifs.kind) liste.push('type');
  if (actifs.conf) liste.push('certitude');
  const total = cur.position ? cur.position.total : 0;
  const affiches = cur.items ? cur.items.length : 0;
  const pourcentage = total > 0 ? ((affiches / total) * 100).toFixed(1).replace('.', ',') : '0,0';
  poser('criteres', 'Critères actifs : ' + liste.length + ' (' + (liste.join(' · ') || 'aucun') + ').');
  poser('facettes', 'Facettes : ' + (cur.facettes || '—') + '.');
  poser('surlignage', 'Surlignage : ' + (cur.marques || 0) + ' occurrence(s) du terme principal dans le fil.');
  poser('navigation', 'Navigation : ' + (cur.navCompte || '0 / 0') + ', avec retour au début après la dernière occurrence.');
  poser('secondaire', 'Recherche secondaire : ' + (cur.sousResultats || 0) + ' résultat(s) sur ' + affiches + ' point(s) affiché(s).');
  poser('recentes', 'Recherches récentes : ' + recentes.length + ' conservée(s) pour cette session (maximum ' + MAX_RECENTES + ').');
  poser('densite', 'Densité : ' + affiches + ' point(s) affiché(s) sur ' + total + ' du repère, soit ' + pourcentage + ' %.');
  poser('clavier', 'Clavier : ' + usagesClavier + ' usage(s) du raccourci / ou Échap.');
  poser('mouvement', 'Mouvement : ' + (cur.sys ? 'réduit (système)' : 'complet') + ' · marqueurs ' + (cur.sys ? 'sans transition' : 'avec transition') + '.');
}

/* -------------------------------------------------------------------------- *
 * Point d'entrée unique.
 * -------------------------------------------------------------------------- */
register('E003', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout) return;
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (typeof css !== 'function' || typeof el !== 'function') return;
  css(CSS_ID, RULES);

  const corps = layout.querySelector('.recit-body');
  if (!corps) return;
  layout.dataset.e003 = 'on';
  const sys = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false;
  layout.classList.toggle('recit-e003-sans-mouvement', sys);

  const items = collecterItems(layout);
  const actifs = criteresActifs(layout);
  const recherche = layout.querySelector('#c3a-search') || document.getElementById('c3a-search');

  latest = {
    stage, layout, el, sys, items, actifs,
    position: lirePosition(layout),
    marques: 0, sousResultats: 0, navCompte: '0 / 0', facettes: '',
    refs: {}, nodes: null,
  };

  /* Chantiers 01 à 03 : facettes, surlignage et puces effaçables. */
  latest.facettes = ajouterFacettes(el, layout, items);
  latest.marques = ajouterSurlignage(el, layout, actifs.query);
  ajouterCriteres(el, layout, actifs);

  /* Chantiers 04 à 07 : navigation, suggestions, aide et mémoire locale. */
  latest.navCompte = ajouterNavigation(el, layout, items) || '0 / 0';
  ajouterSuggestions(el, layout, items, recherche);
  ajouterAide(el, layout);
  ajouterRecententes(el, layout, actifs.query);

  /* Chantiers 08 à 10 : recherche secondaire, clavier et mesures. */
  ajouterSecondaire(el, layout);
  appliquerSecondaire();
  latest.nodes = ajouterPanneau(el, stage);
  installerClavier();
  mesurer();
});
