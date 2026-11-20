import { register } from './registry.js';

/* Lentille E100 — Données, traçabilité et provenance (vue Récit).
 *
 * Dix chantiers E100-01 … E100-10, tous implémentés dans CE seul module.
 * Rapport : UNIFIED_AUDIT/RECIT/views/E100.md.
 *
 * Le greffon ne fait qu'enrichir le DOM déjà rendu par recit.js : aucune
 * donnée historique n'est inventée, aucun texte n'est retiré, aucun fichier
 * partagé n'est modifié. Chaque valeur affichée est dérivée du DOM réel
 * (surtitre, pastille de certitude, trace, fil, métadonnées de l'image).
 *
 * Un seul enregistrement de lentille, une seule feuille de style groupée,
 * toutes les classes préfixées recit-e100-, tous les ids préfixés e100-.
 * Zéro journalisation, zéro réseau, zéro aléa, zéro minuteur, zéro rAF.
 * Sans JavaScript, la vue reste intégralement lisible : les dix chantiers
 * ne sont que des ajouts non destructifs.
 */

const GATE = 'data-e100';
const PANNEAU_ID = 'e100-panneau';
const BOUTON_ID = 'e100-btn-provenance';

/* Cinq lignes du panneau de provenance, dans un ordre déterministe. */
const LIGNES = Object.freeze([
  ['e100-fiche', 'recit-e100-fiche'],
  ['e100-profil-types', 'recit-e100-types'],
  ['e100-profil-certitudes', 'recit-e100-certitudes'],
  ['e100-couverture', 'recit-e100-couverture'],
  ['e100-origine', 'recit-e100-origine'],
]);

/* Vocabulaire repris de la vue, sans réécriture (disputed → contesté). */
const TYPES = Object.freeze({
  'récit': 'récit', figure: 'figure', lieu: 'lieu', audit: 'audit',
});
const CERTITUDES = Object.freeze({
  'vérifié': 'vérifié', certain: 'certain', probable: 'probable', disputed: 'contesté',
});

/* Couverture relevée au fil des rendus : clé = repère + texte du point,
   valeur = 'oui' si une trace est présente, 'non' sinon. L'écriture est
   idempotente : revoir le même point ne le compte jamais deux fois. */
const couvertures = new Map();

/* Feuille unique. E100-10 : CHAQUE règle est cadrée par le verrou
   `.recit-layout[data-e100="on"]`, posé une seule fois par rendu. */
const RULES = `
.recit-layout[data-e100="on"] .recit-e100-panneau{
  margin:12px 0 4px;padding:10px 12px;
  border:1px solid var(--line);border-left:3px solid var(--gold);
  border-radius:8px;background:rgba(255,255,255,.025);
  color:var(--ink-soft);font-size:11px;line-height:1.55;
}
.recit-layout[data-e100="on"] .recit-e100-ligne{margin:3px 0}
.recit-layout[data-e100="on"] .recit-e100-fiche{color:var(--ink);font-weight:600}
.recit-layout[data-e100="on"] .recit-e100-trace{
  margin-top:12px;padding-left:10px;border-left:2px solid var(--line-strong);
  font-size:11px;line-height:1.6;
}
.recit-layout[data-e100="on"] .recit-e100-sources{font-size:11px;line-height:1.6}
.recit-layout[data-e100="on"] .recit-e100-btn{
  min-height:36px;padding:0 12px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--ink-soft);font-size:10px;
  cursor:pointer;transition:border-color .18s linear,color .18s linear;
}
.recit-layout[data-e100="on"] .recit-e100-btn:hover{border-color:var(--gold);color:var(--gold-bright)}
.recit-layout[data-e100="on"] .recit-e100-btn:focus-visible{
  outline:2px solid var(--gold-bright);outline-offset:2px;
}
.recit-layout[data-e100="on"][data-e100-motion="reduce"] .recit-e100-btn{transition:none}
@media (prefers-reduced-motion:reduce){
  .recit-layout[data-e100="on"] .recit-e100-btn{transition:none}
}
`;

/* ---------- gardes : aucun ne peut lever d'erreur ---------- */

function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector)
    : null;
}

function safe(fn) {
  try { fn(); }
  catch { /* chantier neutralisé : la vue reste lisible et inchangée */ }
}

function mark(node, className) {
  if (node && node.classList && typeof node.classList.add === 'function'
      && !node.classList.contains(className)) node.classList.add(className);
}

/* Pose un attribut seulement s'il est absent : enrichissement non destructif. */
function setOnce(node, name, value) {
  if (!node || node.nodeType !== 1) return false;
  if (typeof node.hasAttribute !== 'function' || typeof node.setAttribute !== 'function') return false;
  if (node.hasAttribute(name)) return false;
  node.setAttribute(name, value);
  return true;
}

function texte(node) {
  return String((node && node.textContent) || '').trim();
}

/* E100-01 — panneau de provenance : un seul conteneur, cinq paragraphes
   repérés par id, réordonnés à chaque rendu de façon déterministe. */
function assurerPanneau(corps, el) {
  if (!corps || typeof corps.appendChild !== 'function' || typeof el !== 'function') return null;
  let panneau = q(corps, `#${PANNEAU_ID}`);
  if (!panneau) {
    panneau = el('div', 'recit-e100-panneau');
    panneau.id = PANNEAU_ID;
    corps.appendChild(panneau);
  }
  const nodes = {};
  LIGNES.forEach(([id, cls]) => {
    let node = q(panneau, `#${id}`);
    if (!node) {
      node = el('p', `recit-e100-ligne ${cls}`);
      node.id = id;
    }
    nodes[id] = node;
  });
  LIGNES.forEach(([id]) => { safe(() => panneau.appendChild(nodes[id])); });
  return { panneau, nodes };
}

/* E100-01 — fiche du point courant, construite uniquement à partir du DOM. */
function lireFiche(root) {
  const courant = q(root, '.recit-thread-item[aria-current="step"]');
  const kicker = texte(q(root, '.view-kicker'));
  const pastille = texte(q(root, '.recit-conf')).replace(/^[^\s]+\s*/, '');
  const trace = q(root, '.recit-trace');
  const resume = texte(trace ? q(trace, 'summary') : null);
  const trouve = resume.match(/(\d+)\s*référence/);
  const refs = trouve ? Number(trouve[1]) : 0;
  const type = (courant && typeof courant.getAttribute === 'function'
    ? courant.getAttribute('data-kind') : '')
    || kicker.split('·').pop().trim() || 'point';
  const source = trace
    ? `${refs} identifiant(s) de source local(aux)`
    : 'aucun identifiant de source attaché';
  return `Provenance du point : type « ${type} » · certitude « ${pastille || '—'} » · ${source}.`;
}

/* E100-07 — origine du repère : le préfixe textuel de .recit-meta contient
   déjà « titre · année · ». On ne lit que ce texte, jamais une source externe. */
function lireOrigine(root) {
  const meta = q(root, '.recit-meta');
  let brut = meta && meta.firstChild && typeof meta.firstChild.nodeValue === 'string'
    ? meta.firstChild.nodeValue : '';
  brut = brut.replace(/\s*·\s*$/, '').trim();
  if (!brut) {
    brut = texte(q(root, '.view-kicker'))
      .replace(/^Étape\s+\d+\s*\/\s*\d+\s*·\s*/, '').trim();
  }
  return brut || 'repère non identifié';
}

/* E100-02 / E100-03 — distribution des types et des certitudes lue sur les
   attributs de données déjà posés par la vue sur chaque item du fil. */
function compter(root, attribut) {
  const resultat = {};
  let total = 0;
  const fil = q(root, '.recit-thread-list');
  if (!fil || typeof fil.querySelectorAll !== 'function') return { resultat, total };
  fil.querySelectorAll('.recit-thread-item').forEach((item) => {
    const valeur = item && typeof item.getAttribute === 'function'
      ? item.getAttribute(attribut) : null;
    if (!valeur) return;
    resultat[valeur] = (resultat[valeur] || 0) + 1;
    total += 1;
  });
  return { resultat, total };
}

function formuler(table, resultat) {
  return Object.keys(table).map((cle) => `${table[cle]} ${resultat[cle] || 0}`).join(' · ');
}

/* E100-04 — couverture de la session, mise à jour sans double comptage. */
function relever(titre, origine, avecSource) {
  if (!titre) return null;
  const cle = `${origine}|${titre}`;
  try { couvertures.set(cle, avecSource ? 'oui' : 'non'); }
  catch { return null; }
  let oui = 0;
  couvertures.forEach((valeur) => { if (valeur === 'oui') oui += 1; });
  return { oui, total: couvertures.size };
}

/* E100-06 — relie la légende et le crédit au programme : l'image porte un
   aria-describedby enrichi, sans écraser une relation déjà présente. */
function relierCredit(root) {
  const image = q(root, '.recit-media img');
  if (!image || typeof image.getAttribute !== 'function'
      || typeof image.setAttribute !== 'function') return;
  const ids = [];
  [['.recit-media .media-caption', 'e100-legende-image'],
    ['.recit-media .recit-media-credit', 'e100-credit-image']].forEach(([selecteur, id]) => {
    const noeud = q(root, selecteur);
    if (!noeud) return;
    if (!noeud.id) {
      try { noeud.id = id; }
      catch { return; }
    }
    ids.push(noeud.id);
  });
  if (!ids.length) return;
  const deja = image.getAttribute('aria-describedby') || '';
  const manquants = ids.filter((id) => !deja.split(/\s+/).includes(id));
  if (!manquants.length) return;
  image.setAttribute('aria-describedby', [deja, ...manquants].filter(Boolean).join(' '));
}

/* E100-05 — commande d'atteinte de la fiche : un bouton dans .recit-actions,
   donc couvert par le garde-fou clavier de la vue, sans toucher au hash. */
function assurerBouton(actions, el, panneau) {
  if (!actions || typeof actions.appendChild !== 'function' || typeof el !== 'function') return;
  let bouton = q(actions, `#${BOUTON_ID}`);
  if (!bouton) {
    bouton = el('button', 'recit-e100-btn', 'Aller à la fiche de provenance');
    bouton.id = BOUTON_ID;
    bouton.type = 'button';
    actions.appendChild(bouton);
  }
  if (bouton.getAttribute('data-e100-bound') === '1') return;
  bouton.setAttribute('data-e100-bound', '1');
  bouton.addEventListener('click', () => {
    safe(() => {
      const cible = (panneau && panneau.isConnected)
        ? panneau
        : (typeof document !== 'undefined' ? document.getElementById(PANNEAU_ID) : null);
      if (!cible) return;
      if (!cible.hasAttribute('tabindex')) cible.setAttribute('tabindex', '-1');
      if (typeof cible.focus === 'function') cible.focus({ preventScroll: true });
      if (typeof cible.scrollIntoView === 'function') cible.scrollIntoView({ block: 'nearest' });
    });
  });
}

/* E100-09 — mouvement réduit, lu une seule fois par rendu. */
function motion(root, reducedMotion) {
  let reduit = false;
  try { reduit = !!(typeof reducedMotion === 'function' && reducedMotion()); }
  catch { reduit = false; }
  setOnce(root, 'data-e100-motion', reduit ? 'reduce' : 'normal');
}

register('E100', (ctx) => {
  if (!ctx) return;
  const { stage, layout, css, el, reducedMotion } = ctx;

  /* Une seule feuille pour toute la lentille (cssOnce garantit l'idempotence). */
  safe(() => { if (typeof css === 'function') css('recit-e100', RULES); });

  const root = layout && typeof layout.querySelector === 'function'
    ? layout
    : (stage && typeof stage.querySelector === 'function' ? stage : null);
  if (!root) return;

  /* E100-10 — verrou de portée : posé une seule fois par rendu, il cadre
     toutes les règles et rend l'enrichissement idempotent. */
  if (!setOnce(root, GATE, 'on')) return;

  const corps = q(root, '.recit-body');
  const ensemble = assurerPanneau(corps, el);
  const nodes = ensemble ? ensemble.nodes : null;

  /* E100-08 — lisibilité du bloc de traçabilité déjà présent. */
  safe(() => {
    mark(q(root, '.recit-trace'), 'recit-e100-trace');
    mark(q(root, '.recit-sources'), 'recit-e100-sources');
  });

  safe(() => relierCredit(root));
  safe(() => motion(root, reducedMotion));

  const titre = texte(q(root, '#recit-point-title')) || texte(q(root, '.recit-title'));
  const origine = lireOrigine(root);

  safe(() => {
    if (!nodes || !nodes['e100-fiche']) return;
    nodes['e100-fiche'].textContent = lireFiche(root);
  });

  safe(() => {
    if (!nodes || !nodes['e100-profil-types']) return;
    const { resultat, total } = compter(root, 'data-kind');
    nodes['e100-profil-types'].textContent = total
      ? `Composition du repère : ${total} point(s) · ${formuler(TYPES, resultat)}.`
      : 'Composition du repère : fil indisponible, profil non calculé.';
    setOnce(root, 'data-e100-types', String(total));
  });

  safe(() => {
    if (!nodes || !nodes['e100-profil-certitudes']) return;
    const { resultat, total } = compter(root, 'data-confidence');
    nodes['e100-profil-certitudes'].textContent = total
      ? `Certitudes du repère : ${formuler(CERTITUDES, resultat)}.`
      : 'Certitudes du repère : fil indisponible, profil non calculé.';
    setOnce(root, 'data-e100-certitudes', String(total));
  });

  safe(() => {
    if (!nodes || !nodes['e100-couverture']) return;
    const avecSource = !!q(root, '.recit-trace');
    const etat = relever(titre, origine, avecSource);
    nodes['e100-couverture'].textContent = etat
      ? `Traçabilité relevée pendant la lecture : ${etat.oui} point(s) avec source sur ${etat.total} point(s) rencontré(s).`
      : 'Traçabilité relevée : point non identifié, relevé non comptabilisé.';
    setOnce(root, 'data-e100-couverture', etat ? `${etat.oui}/${etat.total}` : 'indisponible');
  });

  safe(() => {
    if (!nodes || !nodes['e100-origine']) return;
    nodes['e100-origine'].textContent = `Origine du repère : ${origine}.`;
    setOnce(root, 'data-e100-origine', origine);
  });

  safe(() => assurerBouton(q(root, '.recit-actions'), el, ensemble && ensemble.panneau));
});
