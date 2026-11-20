import { register } from './registry.js';

/* V2 lentille E045 — Accessibilité ARIA et lecteurs d'écran (complément de la
   passe 1). Dix chantiers V2 neufs, distincts de ceux de la passe 1 (E005 et
   E045 : barre de progression, sémantique de liste, description de l'image,
   nom de la pastille, liens d'évitement, groupes commandes/légende, statut,
   région live, restauration du focus, région du corps ; puis kicker relié au
   titre, raisons des boutons désactivés, aide clavier du champ de recherche,
   aide du fil, temps de lecture en note, légende des degrés, nom de la
   traçabilité, aria-controls du résumé, aria-controls des commandes, état sans
   image). Ici : état de lecture audible, état des groupes de filtres, message
   sans résultat atomique, position du fil, titre du fil en heading, doublons
   d'étiquettes masqués, message sans source en note, contexte du repère relié
   à la recherche, étiquettes de type masquées.
   Tous non destructifs : sans ce module, la vue reste intégralement lisible.
   Préfixes : classes recit-v2-e045-, ids DOM v2-e045- (jamais e045- de la
   passe 1, qui tourne sur le même DOM). Zéro réseau, zéro console, zéro aléa,
   aucun fichier partagé modifié. */

const CSS = `
/* E045-01 à E045-10 — utilitaire commun : texte de synthèse masqué hors flux,
   exposé aux technologies d'assistance via aria-describedby (jamais aria-hidden). */
.recit-v2-e045-sr{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0
}
@media (prefers-reduced-motion:reduce){.recit-v2-e045-sr{transition:none}}
`;

/* --- utilitaires de garde -------------------------------------------------- */

function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector)
    : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector))
    : [];
}

/* Texte visible ou d'attribut, normalisé, sans jamais lever d'erreur. */
function txt(node) {
  return String((node && node.textContent) || '').replace(/\s+/g, ' ').trim();
}

/* Pose un attribut seulement s'il est absent : enrichissement non destructif. */
function setOnce(node, name, value) {
  if (node && node.nodeType === 1 && typeof node.hasAttribute === 'function'
      && !node.hasAttribute(name)) node.setAttribute(name, value);
}

/* Ajoute un jeton à une liste d'identifiants sans écraser les valeurs déjà
   présentes ni introduire de doublon. */
function addToken(node, name, token) {
  if (!node || !token || typeof node.getAttribute !== 'function') return;
  const current = node.getAttribute(name) || '';
  const tokens = current.split(/\s+/).filter(Boolean);
  if (tokens.indexOf(token) >= 0) return;
  tokens.push(token);
  node.setAttribute(name, tokens.join(' '));
}

/* Identifiant existant réutilisé, ou identifiant préfixé créé une seule fois. */
function idOf(node, wanted) {
  if (!node || node.nodeType !== 1) return null;
  if (node.id) return node.id;
  try { node.id = wanted; } catch { return null; }
  return node.id || null;
}

/* Dépose (ou réutilise) un paragraphe masqué, à un emplacement stable. Le nœud
   est réutilisé par id et déplacé, donc aucun doublon après reconstruction. */
function placeSr(id, parent, ancre, valeur, el) {
  if (!parent || typeof parent.insertBefore !== 'function' || typeof el !== 'function') return null;
  let noeud = null;
  try { noeud = document.getElementById(id); } catch { noeud = null; }
  if (!noeud) {
    try {
      noeud = el('p', 'recit-v2-e045-sr', valeur);
      noeud.id = id;
    } catch { return null; }
  }
  noeud.textContent = valeur;
  const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

/* Un chantier défaillant est neutralisé : les neuf autres continuent. */
function safe(fn) {
  try { fn(); } catch { /* rendu préservé coûte que coûte */ }
}

/* --- E045-01 — état de lecture audible issu du titre réel du bouton -------- */

function chantier01(body, el) {
  const play = q(body, '.recit-play');
  if (!play) return;
  const titre = txt(play.getAttribute('title') || '');
  const presse = play.getAttribute('aria-pressed') === 'true';
  const etat = titre || (presse
    ? 'Mettre la lecture en pause'
    : 'Lancer la lecture automatique');
  const noeud = placeSr('v2-e045-play-etat', play.parentNode, play,
    `État de la lecture : ${etat}.`, el);
  if (noeud) addToken(play, 'aria-describedby', noeud.id);
}

/* --- E045-02 / E045-03 — état de sélection des groupes de filtres ---------- */

function etatGroupe(groupe, etiquette, id, el) {
  if (!groupe) return;
  const label = q(groupe, '.c3a-group-label');
  if (txt(label) !== etiquette) return;
  const presse = qa(groupe, '.c3a-filter').filter((b) => b.getAttribute
    && b.getAttribute('aria-pressed') === 'true');
  /* Le bouton « Tous les types » / « Toutes » porte aria-pressed quand aucun
     filtre n'est actif : il ne compte pas comme un filtre sélectionné. */
  const actifs = presse.map((b) => txt(b)).filter((t) => t && !/^Tou/i.test(t));
  const valeur = actifs.length
    ? `${etiquette} : filtre actif ${actifs.map((n) => `« ${n} »`).join(', ')}.`
    : `${etiquette} : aucun filtre actif, toutes les valeurs sont affichées.`;
  const noeud = placeSr(id, groupe, label, valeur, el);
  if (noeud) addToken(groupe, 'aria-describedby', noeud.id);
}

function chantier02(body, el) {
  const groupes = qa(body, '.c3a-group');
  etatGroupe(groupes.filter((g) => txt(q(g, '.c3a-group-label')) === 'Type')[0],
    'Type', 'v2-e045-type-etat', el);
}

function chantier03(body, el) {
  const groupes = qa(body, '.c3a-group');
  etatGroupe(groupes.filter((g) => txt(q(g, '.c3a-group-label')) === 'Certitude')[0],
    'Certitude', 'v2-e045-conf-etat', el);
}

/* --- E045-04 — message « aucun résultat » atomique et nommé --------------- */

function chantier04(body) {
  const vide = q(body, '#c3a-empty') || q(body, '.c3a-empty');
  if (!vide) return;
  setOnce(vide, 'aria-live', 'polite');
  setOnce(vide, 'aria-atomic', 'true');
  if (!vide.hasAttribute('aria-label')) {
    const texte = txt(q(vide, 'p')) || txt(vide);
    if (texte) vide.setAttribute('aria-label', texte);
  }
}

/* --- E045-05 — position du fil annoncée à la liste ------------------------ */

function chantier05(body, el) {
  const liste = q(body, '#c3a-thread') || q(body, '.recit-thread-list');
  if (!liste) return;
  const items = qa(liste, '.recit-thread-item');
  if (!items.length) return;
  const rang = items.findIndex((n) => n.classList && n.classList.contains('is-current'));
  const valeur = rang >= 0
    ? `Fil : point ${rang + 1} sur ${items.length} en cours de lecture.`
    : `Fil : ${items.length} points affichés.`;
  const nav = liste.parentNode;
  const ancre = nav && q(nav, '.recit-thread-title');
  const noeud = placeSr('v2-e045-fil-pos', nav || body, ancre || liste, valeur, el);
  if (noeud) addToken(liste, 'aria-describedby', noeud.id);
}

/* --- E045-06 — titre du fil promu en heading de niveau 2 ------------------ */

function chantier06(body) {
  const titre = q(body, '.recit-thread-title');
  if (!titre) return;
  setOnce(titre, 'role', 'heading');
  setOnce(titre, 'aria-level', '2');
}

/* --- E045-07 — étiquettes de groupe masquées (doublon du aria-label) ------ */

function chantier07(body) {
  qa(body, '.c3a-group-label').forEach((label) => setOnce(label, 'aria-hidden', 'true'));
}

/* --- E045-08 — message « aucune source » nommé comme note ----------------- */

function chantier08(body) {
  const sources = q(body, '.recit-sources');
  if (!sources) return;
  setOnce(sources, 'role', 'note');
  if (!sources.hasAttribute('aria-label')) {
    const texte = txt(sources);
    const libelle = /^Aucun/i.test(texte)
      ? 'Aucune source attachée à ce point'
      : 'Sources du point';
    sources.setAttribute('aria-label', libelle);
  }
}

/* --- E045-09 — contexte du repère relié au champ de recherche ------------- */

function chantier09(body) {
  const contexte = q(body, '#recit-context') || q(body, '.recit-context');
  const recherche = q(body, '#c3a-search');
  if (!contexte || !recherche) return;
  const id = idOf(contexte, 'v2-e045-contexte');
  if (id) addToken(recherche, 'aria-describedby', id);
}

/* --- E045-10 — étiquettes de type du fil masquées (doublon du aria-label) - */

function chantier10(body) {
  qa(body, '.recit-thread-item .thread-kind').forEach((tag) => {
    setOnce(tag, 'aria-hidden', 'true');
  });
}

register('E045', (ctx) => {
  try {
    if (!ctx || typeof document === 'undefined') return;
    const { layout, stage, css, el } = ctx;
    const root = layout || stage;
    if (!root || typeof root.querySelector !== 'function') return;

    if (typeof css === 'function') css('recit-v2-e045', CSS);

    const corps = q(root, '.recit-body') || root;
    safe(() => chantier01(corps, el));
    safe(() => chantier02(corps, el));
    safe(() => chantier03(corps, el));
    safe(() => chantier04(corps));
    safe(() => chantier05(corps, el));
    safe(() => chantier06(corps));
    safe(() => chantier07(corps));
    safe(() => chantier08(corps));
    safe(() => chantier09(corps));
    safe(() => chantier10(corps));
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
