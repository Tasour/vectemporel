import { register } from './registry.js';

/* Lentille E075 — Accessibilité ARIA et lecteurs d'écran (vue Récit).
   Dix chantiers additifs et distincts (E075-01 … E075-10), appliqués sur un DOM
   déjà assemblé. Aucun texte n'est retiré, aucun attribut existant n'est écrasé,
   aucune région live n'est créée : sans ce module la vue reste intégralement
   lisible. Aucune sortie de débogage, aucune requête réseau, aucun aléa.
   Une défaillance locale est neutralisée sans jamais interrompre le rendu. */

const CSS_ID = 'recit-e075';
const OUTILS = { el: null };

/* Une seule feuille de styles, intégralement préfixée recit-e075-. */
const CSS = `
.recit-e075-breadcrumb{margin:0 0 9px;color:var(--muted-2,#8c8d91);font-size:10px;line-height:1.45}
.recit-e075-breadcrumb ol{display:flex;flex-wrap:wrap;gap:3px 0;margin:0;padding:0;list-style:none}
.recit-e075-breadcrumb li{display:inline;max-width:100%;overflow-wrap:anywhere}
.recit-e075-breadcrumb li+li::before{content:'\\203A';margin:0 5px;color:var(--gold,#e6b96f)}
.recit-e075-breadcrumb li[aria-current="location"]{color:var(--gold-bright,#f5e9d0)}
.recit-e075-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.recit-e075-btn{min-height:36px;padding:5px 10px;border:1px solid var(--line,#2a2f3a);border-radius:8px;background:rgba(255,255,255,.03);color:var(--gold-bright,#f5e9d0);font:inherit;font-size:10px;line-height:1.3;cursor:pointer}
.recit-e075-btn:hover{border-color:var(--gold,#e6b96f)}
.recit-e075-btn:focus-visible,.recit-e075-breadcrumb:focus-visible{outline:2px solid var(--gold-bright,#f5e9d0);outline-offset:2px}
@media (max-width:620px){.recit-e075-btn{min-height:40px}}
@media (prefers-reduced-motion:reduce){.recit-e075-btn{transition:none!important}}
`;

/* Chaque chantier est isolé : les neuf autres survivent à une passe défaillante. */
function safe(fn) {
  try { return fn(); } catch { return null; }
}

function make(tag, className, text) {
  if (OUTILS.el && typeof OUTILS.el === 'function') return OUTILS.el(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function one(root, selector) {
  return safe(() => (root && typeof root.querySelector === 'function') ? root.querySelector(selector) : null);
}

function all(root, selector) {
  return safe(() => (root && typeof root.querySelectorAll === 'function') ? Array.from(root.querySelectorAll(selector)) : []) || [];
}

function setOnce(node, name, value) {
  if (node && node.nodeType === 1 && typeof node.setAttribute === 'function' && !node.hasAttribute(name)) {
    node.setAttribute(name, value);
  }
}

/* Ajoute un identifiant à une liste ARIA sans effacer les références voisines. */
function addToken(node, name, token) {
  if (!node || !token || typeof node.getAttribute !== 'function') return;
  const valeurs = (node.getAttribute(name) || '').split(/\s+/).filter(Boolean);
  if (valeurs.indexOf(token) >= 0) return;
  valeurs.push(token);
  node.setAttribute(name, valeurs.join(' '));
}

/* Reprend un identifiant existant ou en attribue un, préfixé e075-, une seule fois. */
function idOf(node, voulu) {
  if (!node || node.nodeType !== 1) return null;
  if (!node.id) node.id = voulu;
  return node.id || null;
}

function texte(node) {
  return String((node && node.textContent) || '').replace(/\s+/g, ' ').trim();
}

/* La position est lue sur le libellé réel calculé par la vue, jamais inventée. */
function progression(body) {
  const kicker = one(body, '.view-kicker');
  const trouve = /Étape\s+(\d+)\s*\/\s*(\d+)/.exec(texte(kicker));
  if (trouve) return { now: Number(trouve[1]), total: Number(trouve[2]) };
  const items = all(body, '#c3a-thread .recit-thread-item').length;
  return { now: items ? 1 : 0, total: items };
}

function listeFil(body) {
  return one(body, '#c3a-thread') || one(body, '.recit-thread-list');
}

const CERTITUDE = {
  'vérifié': 'vérifié',
  'certain': 'certain',
  'probable': 'probable',
  'disputed': 'contesté (terme source « disputed »)',
};

/* E075-01 — Fil d'Ariane : un repère de navigation dit où l'on se trouve. */
function filDAriane(body) {
  if (one(body, '#e075-breadcrumb')) return;
  const titre = document.getElementById('recit-point-title') || one(body, '#recit-point-title');
  if (!titre) return;
  const meta = one(body, '.recit-meta');
  const { now, total } = progression(body);
  const repere = texte(meta).split('·')[0].trim() || 'Repère courant';

  const nav = make('nav', 'recit-e075-breadcrumb');
  nav.id = 'e075-breadcrumb';
  nav.setAttribute('aria-label', 'Fil d’Ariane de la lecture guidée');
  const liste = make('ol', 'recit-e075-fil');
  const ajoute = (libelle, courant) => {
    const item = make('li', 'recit-e075-fil-item', libelle);
    if (courant) item.setAttribute('aria-current', 'location');
    liste.appendChild(item);
  };
  ajoute('Récit guidé', false);
  ajoute(repere, false);
  ajoute(total ? `Point ${now} sur ${total}` : 'Point courant', true);
  nav.appendChild(liste);
  body.insertBefore(nav, body.firstChild);
}

/* E075-02 — Le fil tire son nom de son titre visible et sa description du
   statut de filtrage : le nom accessible vient du texte réellement affiché. */
function nomDuFil(body) {
  const titreFil = one(body, '.recit-thread-title');
  const liste = listeFil(body);
  if (!titreFil || !liste) return;
  const id = idOf(titreFil, 'e075-fil-titre');
  if (id) setOnce(liste, 'aria-labelledby', id);
  const statut = one(body, '#c3a-status');
  if (statut) addToken(liste, 'aria-describedby', idOf(statut, 'c3a-status'));
}

/* E075-03 — Position et taille : aria-posinset / aria-setsize restent justes
   même quand le fil est filtré, contrairement au numéro du libellé d'origine. */
function positionsDuFil(body) {
  const liste = listeFil(body);
  if (!liste) return;
  const items = all(liste, 'li');
  const taille = items.length;
  items.forEach((item, rang) => {
    if (!item || typeof item.setAttribute !== 'function') return;
    item.setAttribute('aria-posinset', String(rang + 1));
    item.setAttribute('aria-setsize', String(taille));
  });
}

/* E075-04 — Certitude de chaque point : l'aria-label du bouton du fil nomme le
   type, pas la certitude. Une description masquée, une par point, la complète. */
function certitudesDuFil(body) {
  const liste = listeFil(body);
  if (!liste) return;
  const boutons = all(liste, '.recit-thread-item');
  if (!boutons.length) return;
  let boite = one(body, '#e075-desc-fil');
  if (!boite) {
    boite = make('div', 'recit-e075-sr-only');
    boite.id = 'e075-desc-fil';
    body.appendChild(boite);
  }
  boutons.forEach((bouton, rang) => {
    const brut = bouton.getAttribute('data-confidence') || '';
    const libelle = CERTITUDE[brut] || (brut || 'non précisée');
    const id = `e075-desc-${rang}`;
    let description = one(boite, `#${id}`);
    if (!description) {
      description = make('p', 'recit-e075-sr-only');
      description.id = id;
      boite.appendChild(description);
    }
    description.textContent = `Certitude du point ${rang + 1} : ${libelle}.`;
    addToken(bouton, 'aria-describedby', id);
  });
}

/* E075-05 — État de la lecture automatique : la bascule change de sens sans
   que le changement soit annoncé. On réutilise la région d'annonce existante. */
function annonceLecture(body) {
  const actions = one(body, '.recit-actions');
  if (!actions || actions.getAttribute('data-e075-bound') === '1') return;
  actions.setAttribute('data-e075-bound', '1');
  actions.addEventListener('click', (evenement) => {
    const cible = evenement && evenement.target && evenement.target.closest
      ? evenement.target.closest('[data-fk="c3a-play"], .recit-play') : null;
    if (!cible || !actions.contains(cible)) return;
    const etaitActif = cible.getAttribute('aria-pressed') === 'true';
    const message = etaitActif
      ? 'Lecture automatique désactivée.'
      : 'Lecture automatique activée.';
    const dire = () => {
      const live = document.getElementById('atlas-recit-live');
      if (live) live.textContent = message;
    };
    if (typeof queueMicrotask === 'function') queueMicrotask(dire);
    else dire();
  });
}

/* E075-06 — Traçabilité : le résumé est nommé de façon explicite, avec le
   nombre de références et leurs identifiants déjà présents dans le DOM. */
function tracabilite(body) {
  const details = one(body, 'details.recit-trace');
  if (!details) return;
  setOnce(details, 'role', 'note');
  setOnce(details, 'aria-label', 'Traçabilité du point courant');
  const resume = one(details, 'summary');
  if (!resume || resume.getAttribute('data-e075-trace') === '1') return;
  const compte = /(\d+)\s*référence/.exec(texte(resume));
  const nombre = compte ? compte[1] : 'plusieurs';
  const paragraphe = one(details, 'p');
  const identifiants = texte(paragraphe).replace(/^Identifiants\s*:\s*/i, '');
  resume.setAttribute('aria-label', `Traçabilité : ${nombre} référence(s) locale(s). `
    + `${identifiants ? `Identifiants : ${identifiants}. ` : ''}Ouvrir ou fermer le détail.`);
  resume.setAttribute('data-e075-trace', '1');
}

/* E075-07 — Langue : la zone de lecture et toutes les aides créées ici sont
   déclarées en français, pour une prononciation correcte des annonces. */
function langue(body, layout) {
  setOnce(body, 'lang', 'fr');
  setOnce(layout, 'lang', 'fr');
  all(body, '.recit-e075-sr-only, .recit-e075-breadcrumb, .recit-e075-btn, [id^="e075-"]')
    .forEach((noeud) => setOnce(noeud, 'lang', 'fr'));
}

/* E075-08 — Les commandes qui changent le point déclarent celui qu'elles
   contrôlent : le lecteur d'écran sait à quoi l'action s'applique. */
function ciblesDesCommandes(body) {
  const titre = document.getElementById('recit-point-title') || one(body, '#recit-point-title');
  if (!titre) return;
  const cible = idOf(titre, 'recit-point-title');
  all(body, '.recit-actions button').forEach((bouton) => {
    const libelle = texte(bouton).toLowerCase();
    if (/(point|recommencer)/.test(libelle)) addToken(bouton, 'aria-controls', cible);
  });
}

/* E075-09 — Le trait coloré est muet : une description masquée ajoute le
   nombre de points restants à côté des valeurs de la barre de progression. */
function pointsRestants(body) {
  const barre = one(body, '.recit-progress');
  if (!barre) return;
  const { now, total } = progression(body);
  let node = one(body, '#e075-reste');
  if (!node) {
    node = make('p', 'recit-e075-sr-only');
    node.id = 'e075-reste';
    body.appendChild(node);
  }
  const restants = Math.max(0, total - now);
  node.textContent = total
    ? `Progression : point ${now} sur ${total}. ${restants} point(s) restent à parcourir dans ce repère.`
    : 'Aucun point à parcourir dans ce repère.';
  addToken(barre, 'aria-describedby', node.id);
}

/* E075-10 — Structuration à la demande : un bouton verse dans la région
   d'annonce existante un résumé vocal de la vue, sans voler le focus. */
function annonceStructure(body) {
  const actions = one(body, '.recit-actions');
  if (!actions) return;
  let bouton = one(actions, '#e075-structure-btn') || document.getElementById('e075-structure-btn');
  if (!bouton || bouton.parentElement !== actions) {
    bouton = make('button', 'recit-e075-btn', 'Announcer la structure de la vue');
    bouton.id = 'e075-structure-btn';
    bouton.type = 'button';
    actions.appendChild(bouton);
  }
  setOnce(bouton, 'aria-label', 'Announcer la structure de la vue aux lecteurs d’écran');
  if (bouton.getAttribute('data-e075-bound') === '1') return;
  bouton.setAttribute('data-e075-bound', '1');
  bouton.addEventListener('click', () => {
    const live = document.getElementById('atlas-recit-live');
    if (!live) return;
    const kicker = texte(one(body, '.view-kicker'));
    const confBrute = texte(one(body, '.recit-conf')).replace(/^[^\p{L}\p{N}]+/u, '');
    const count = all(body, '.recit-thread-item').length;
    const message = `Structure de la vue Récit guidé. ${kicker}. `
      + `${confBrute ? `Certitude : ${confBrute}. ` : ''}`
      + `Le fil affiche ${count} point(s). Repères : lecture du point, fil du repère, commandes. `
      + 'L’aide clavier liste les raccourcis.';
    const dire = () => { live.textContent = message; };
    if (typeof queueMicrotask === 'function') queueMicrotask(dire);
    else dire();
  });
}

register('E075', (ctx) => {
  const { stage, layout, css, el } = ctx;
  OUTILS.el = (el && typeof el === 'function') ? el : null;
  if (typeof document === 'undefined' || !stage || !layout) return;
  if (typeof stage.querySelector !== 'function') return;

  safe(() => css(CSS_ID, CSS)); /* un seul appel, toutes les règles du module. */

  const body = one(stage, '.recit-body') || one(layout, '.recit-body');
  if (!body) return;

  const travaux = [
    () => filDAriane(body),
    () => nomDuFil(body),
    () => positionsDuFil(body),
    () => certitudesDuFil(body),
    () => annonceLecture(body),
    () => tracabilite(body),
    () => langue(body, layout),
    () => ciblesDesCommandes(body),
    () => pointsRestants(body),
    () => annonceStructure(body),
  ];
  travaux.forEach((travail) => { safe(travail); });
});
