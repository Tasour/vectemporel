import { register } from './registry.js';

/* Lentille E004 — Structure sémantique des soleils de la vue Constellation.
 * Dix chantiers concrets et variés, tous ancrés dans le DOM déjà rendu par
 * constellation.js : aucun fichier partagé modifié, aucune donnée inventée.
 * Un seul register, une seule feuille CSS, identifiants préfixés e004-.
 * Zéro journalisation, zéro réseau, zéro aléa, aucun minuteur ni boucle
 * d'animation propre. Chaque garde sort sans lever d'exception quand la vue
 * n'est pas rendue ou qu'un nœud attendu manque. */

const INDEX_ID = 'e004-index';
const HELP_ID = 'e004-help';
const LIVE_ID = 'e004-live';
const SUN_ID_PREFIX = 'e004-sun-';

/* Feuille unique. Toutes les règles sont ciblées sous les identifiants ou les
   classes possédés par la lentille ; la seule règle qui touche un nœud de la vue
   est conditionnée par la classe posée sur le champ au chantier 05. Aucune
   règle ne vise les planètes ni les lunes. */
const CSS = `
  .e004-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
    overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}
  #${INDEX_ID}{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;
    margin:8px 0 0;padding:0;list-style:none}
  #${INDEX_ID}::before{content:'Ères, par ordre chronologique';
    color:var(--muted,#8b8b8b);font-size:9px;font-weight:600;letter-spacing:.04em}
  #${INDEX_ID} .e004-jump{min-height:36px;padding:5px 9px;
    border:1px solid var(--line,#444);border-radius:7px;background:transparent;
    color:var(--gold,#e6b96f);font:inherit;font-size:10px;cursor:pointer}
  #${INDEX_ID} .e004-jump:hover:not([disabled]){border-color:var(--gold-bright,#f4d69e)}
  #${INDEX_ID} .e004-jump:focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
  #${INDEX_ID} .e004-jump[aria-current=true]{
    border-color:var(--gold-bright,#f4d69e);font-weight:600;text-decoration:underline;text-underline-offset:3px}
  .e004-ordinaux .const-sun[data-e004-ordinal]::before{
    content:attr(data-e004-ordinal);position:absolute;top:-3px;right:-3px;
    display:grid;place-items:center;width:14px;height:14px;border-radius:50%;
    border:1px solid var(--line,#444);background:var(--surface-2,#222);
    color:var(--gold,#e6b96f);font-size:7px;line-height:1}
  @media (max-width:620px){
    #${INDEX_ID}{gap:4px 6px}
    #${INDEX_ID}::before{flex-basis:100%}
  }
`;

function soleils(layer) {
  if (!layer || typeof layer.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(layer.querySelectorAll('.const-sun'));
}

function libelle(node) {
  if (!node) return '';
  if (node.dataset && node.dataset.label) return String(node.dataset.label).trim();
  const title = node.getAttribute ? node.getAttribute('title') : '';
  return title ? String(title).trim() : '';
}

function nomEre(sun) {
  return libelle(sun).split(' · ')[0].trim();
}

function construireIndex(ctx, suns) {
  const index = ctx.el('ol', 'e004-index');
  index.id = INDEX_ID;
  index.setAttribute('aria-label', 'Sommaire des soleils : ères ordonnées');
  suns.forEach((sun, i) => {
    const item = ctx.el('li', 'e004-item');
    const bouton = ctx.el('button', 'e004-jump', `${i + 1}. ${nomEre(sun) || `Ère ${i + 1}`}`);
    bouton.type = 'button';
    bouton.setAttribute('data-e004-target', (sun.dataset && sun.dataset.constKey) || '');
    item.appendChild(bouton);
    index.appendChild(item);
  });
  return index;
}

function annoncerFocus(event) {
  const cible = event && event.target;
  if (!cible || !cible.classList || !cible.classList.contains('const-sun')) return;
  const live = document.getElementById(LIVE_ID);
  if (!live) return;
  const rang = (cible.dataset && cible.dataset.e004Ordinal) || '?';
  const total = (cible.dataset && cible.dataset.e004Total) || '?';
  live.textContent = `Soleil ${rang} sur ${total} : ${libelle(cible)}.`;
}

register('E004', (ctx) => {
  if (typeof document === 'undefined' || !ctx || !ctx.layout) return;
  if (typeof ctx.el !== 'function' || typeof ctx.css !== 'function') return;
  if (typeof ctx.layout.querySelector !== 'function') return;

  /* Feuille unique de la lentille : un seul appel, idempotent par cssOnce. */
  ctx.css('constellation-e004', CSS);

  /* E004-01 — Sommaire ordonné des soleils : une liste ol réelle, construite
     depuis data-label, insérée dans l'en-tête sans toucher aux boutons d'ère. */
  const field = ctx.layout.querySelector('.constellation-field');
  const sunLayer = field ? field.querySelector('.const-layer-suns') : null;
  const suns = soleils(sunLayer);
  if (!sunLayer || !suns.length) return;
  const head = ctx.layout.querySelector('.constellation-head');
  const caption = ctx.layout.querySelector('.constellation-caption');
  const index = construireIndex(ctx, suns);
  if (head && !document.getElementById(INDEX_ID)) head.appendChild(index);

  /* E004-02 — Description du champ enrichie : aria-describedby conserve
     constellation-note et ajoute l'aide textuelle de la lentille. */
  if (field) {
    const decrits = String(field.getAttribute('aria-describedby') || '').trim().split(' ').filter(Boolean);
    if (decrits.indexOf(HELP_ID) === -1) decrits.push(HELP_ID);
    field.setAttribute('aria-describedby', decrits.join(' '));
  }

  /* E004-03 — Ordinal calculé : rang et total écrits sur chaque soleil
     depuis sa position réelle dans la couche, jamais codés en dur. */
  const total = suns.length;
  suns.forEach((sun, i) => {
    sun.setAttribute('data-e004-ordinal', String(i + 1));
    sun.setAttribute('data-e004-total', String(total));
  });

  /* E004-04 — Étiquette du groupe : le libellé de la couche reçoit le décompte
     des soleils et l'ordre chronologique, sans écraser le nom du pays. */
  const labelActuel = String(sunLayer.getAttribute('aria-label') || 'Ères');
  const coupe = labelActuel.indexOf(' : ');
  const base = coupe >= 0 ? labelActuel.slice(0, coupe) : labelActuel;
  sunLayer.setAttribute('aria-label', `${base} : ${total} soleil${total > 1 ? 's' : ''}, ordre chronologique.`);
  sunLayer.setAttribute('data-e004-count', String(total));

  /* E004-05 — Badge d'ordinal : la classe posée sur le champ active la règle
     CSS ::before qui affiche data-e004-ordinal près de chaque soleil. */
  field.classList.add('e004-ordinaux');

  /* E004-06 — Aide textuelle discrète : un paragraphe e004-sr décrit soleils,
     numérotation et sommaire ; il sert de cible à aria-describedby. */
  if (!document.getElementById(HELP_ID)) {
    const aide = ctx.el('p', 'e004-sr', `Les soleils sont les ères, numérotés de 1 à ${total} de la plus ancienne à la plus récente. Le sommaire donne la même liste en texte. Le petit chiffre près d'un soleil répète son numéro ; l'ère courante est marquée dans le sommaire.`);
    aide.id = HELP_ID;
    (caption || field).appendChild(aide);
  }

  /* E004-07 — Annonce locale au focus : une région de statut et un écouteur
     focusin sur la couche décrivent le soleil atteint au clavier. */
  if (!document.getElementById(LIVE_ID)) {
    const live = ctx.el('p', 'e004-sr');
    live.id = LIVE_ID;
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    (caption || field).appendChild(live);
  }
  if (!sunLayer.dataset.e004FocusBound) {
    sunLayer.addEventListener('focusin', annoncerFocus);
    sunLayer.dataset.e004FocusBound = '1';
  }

  /* E004-08 — Étiquette ordinalée des soleils : aria-label préfixé du rang,
     mémorisé une fois pour rester stable entre deux rendus du shell. */
  suns.forEach((sun, i) => {
    if (typeof sun.dataset.e004OriginalAria !== 'string') {
      sun.dataset.e004OriginalAria = sun.getAttribute('aria-label') || libelle(sun) || `Ère ${i + 1}`;
    }
    sun.setAttribute('aria-label', `Soleil ${i + 1} sur ${total} : ${sun.dataset.e004OriginalAria}`);
  });

  /* E004-09 — Identifiants et commandes : chaque soleil reçoit un id e004-,
     chaque bouton du sommaire le relie par aria-controls à son soleil. */
  suns.forEach((sun, i) => {
    const id = `${SUN_ID_PREFIX}${i}`;
    if (!sun.id) sun.id = id;
    if (!sun.getAttribute('data-e004-id')) sun.setAttribute('data-e004-id', id);
  });
  const jumps = Array.prototype.slice.call(index.querySelectorAll('.e004-jump'));
  jumps.forEach((jump, i) => {
    const sun = suns[i];
    if (sun && sun.id) jump.setAttribute('aria-controls', sun.id);
  });

  /* E004-10 — Synchronisation de l'ère courante : l'entrée active du sommaire
     est déduite de is-active / aria-current, puis marquée dans la liste. */
  let actif = -1;
  for (let i = 0; i < suns.length; i += 1) {
    if (suns[i].classList.contains('is-active') || suns[i].getAttribute('aria-current') === 'true') {
      actif = i;
      break;
    }
  }
  jumps.forEach((jump, i) => {
    if (i === actif) jump.setAttribute('aria-current', 'true');
    else jump.removeAttribute('aria-current');
  });
  index.setAttribute('data-e004-active', actif >= 0 ? String(actif) : '');
});
