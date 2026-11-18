import { register } from './registry.js';

/* Lentille CONSTELLATION E014 — Structure sémantique des planètes.
 *
 * Dix chantiers appliqués à chaque rendu de la vue constellation par le
 * registre `runEnhancements`. Le thème est la STRUCTURE SÉMANTIQUE des
 * planètes (`.const-planet`) : groupe nommé, rangs ARIA, liste ordonnée,
 * figure du repère actif, unicité de `aria-current`, étiquettes
 * contextuelles, relation avec les points, glossaire, titre hiérarchique
 * et statut narratif. Toutes les valeurs affichées sont dérivées du DOM
 * rendu par `constellation.js` : aucune donnée n'est inventée, aucune
 * position n'est modifiée. Une seule feuille CSS, tous les identifiants
 * préfixés `e014-`, zéro réseau, zéro aléa, zéro journalisation, aucun
 * fichier partagé modifié, aucun sélecteur de test altéré. */

const CSS_ID = 'constellation-e014';

const ID = {
  desc: 'e014-planets-desc',
  heading: 'e014-planets-heading',
  order: 'e014-planet-order',
  figure: 'e014-active-figure',
  figcaption: 'e014-active-figcaption',
  points: 'e014-moon-relation',
  glossary: 'e014-glossary',
  status: 'e014-planet-status',
  moons: 'e014-moons',
};

/* Feuille unique. Les règles ne visent que des ancres `e014-` ou les
 * boutons `.const-planet` : aucune fuite hors de la vue, aucune animation,
 * aucune ressource externe. Le focus clavier des planètes devient visible. */
const CSS = `
.e014-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
#${ID.order}{margin:10px 0 0;padding:0 0 0 18px;color:var(--muted);font:inherit;font-size:9px;line-height:1.5}
#${ID.order} li{margin:1px 0}
#${ID.order} li[aria-current="true"]{color:var(--gold-bright);font-weight:600}
#${ID.figure}{margin:10px 0 0;padding:0;color:var(--muted-2)}
#${ID.figure} figcaption{font-size:9px;line-height:1.5;color:var(--ink-soft)}
#${ID.glossary}{margin:10px 0 0;display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 8px;font-size:9px;line-height:1.4}
#${ID.glossary} dt{color:var(--muted);font-weight:600}
#${ID.glossary} dd{margin:0;color:var(--muted-2)}
#${ID.status}{margin:10px 0 0;color:var(--gold);font-size:9px;font-variant-numeric:tabular-nums}
.const-planet:focus-visible{outline:2px solid var(--gold-bright);outline-offset:3px}
@media (max-width:620px){
  #${ID.order}{padding-left:14px}
  #${ID.glossary}{grid-template-columns:minmax(0,1fr)}
}
@media (prefers-reduced-motion:reduce){
  #${ID.order} *,#${ID.glossary} *,#${ID.status}{transition:none}
}
`;

function nodes(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll(selector));
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') return value.textContent.trim();
  return '';
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function hiddenText(ctx, id, value) {
  const node = ctx.el('p', 'e014-sr', value);
  node.id = id;
  return node;
}

function captionOf(field, layout) {
  return layout.querySelector('.constellation-caption') || field.parentNode || layout;
}

/* Le nom de l'ère est lu sur le soleil actif, sinon sur l'étiquette du
 * calque des planètes ; aucune valeur n'est fabriquée. */
function eraNameOf(field, planetLayer) {
  const sun = field.querySelector('.const-sun.is-active');
  let raw = sun && sun.dataset ? txt(sun.dataset.label) : '';
  if (!raw) raw = txt(planetLayer.getAttribute('aria-label'));
  return raw ? raw.split(' \u00b7 ')[0].trim() : '';
}

function apply(ctx) {
  /* Contrat : vérification de ctx.layout avant tout ajout au DOM. */
  const layout = ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const field = layout.querySelector('.constellation-field');
  if (!field || typeof field.appendChild !== 'function') return;
  const planetLayer = field.querySelector('.const-layer-planets');
  if (!planetLayer) return;

  /* Feuille de style unique, injectée une seule fois par ctx.css/cssOnce. */
  ctx.css(CSS_ID, CSS);

  const planets = nodes(field, '.const-planet');
  const size = planets.length;
  const caption = captionOf(field, layout);
  const eraName = eraNameOf(field, planetLayer);

  /* E014-01 — Groupe sémantique : le calque des planètes reçoit un rôle,
   * un compteur dérivé du DOM et une description rendue publique via un
   * paragraphe masqué à l'écran mais exposé aux technologies d'assistance. */
  put(planetLayer, 'role', 'group');
  put(planetLayer, 'data-e014-count', String(size));
  put(planetLayer, 'aria-describedby', ID.desc);
  if (!document.getElementById(ID.desc)) {
    field.appendChild(hiddenText(ctx, ID.desc,
      'Les planètes sont les repères de l’ère affichée. Leur numéro suit la numérotation visible ; leur position est décorative et ne code ni date ni importance.'));
  }

  /* E014-02 — Rangs ARIA : chaque planète porte aria-posinset et
   * aria-setsize calculés depuis sa position dans la liste rendue. */
  planets.forEach((planet, index) => {
    put(planet, 'aria-posinset', String(index + 1));
    put(planet, 'aria-setsize', String(size));
    if (planet.dataset) {
      planet.dataset.e014Rank = String(index + 1);
      planet.dataset.e014Size = String(size);
    }
  });

  /* E014-03 — Liste ordonnée : une <ol> du résumé énumère les repères
   * dans l'ordre réel du calque, avec l'étiquette déjà portée par chaque
   * bouton, et reflète le repère courant. */
  if (caption && typeof caption.replaceChildren === 'function') {
    let order = document.getElementById(ID.order);
    if (!order) {
      order = ctx.el('ol', 'e014-order');
      order.id = ID.order;
      put(order, 'aria-label', 'Repères de l’ère, par ordre');
      caption.appendChild(order);
    }
    order.replaceChildren();
    planets.forEach((planet, index) => {
      const label = planet.dataset ? txt(planet.dataset.label) : '';
      const item = ctx.el('li', 'e014-order-item', `${index + 1}. ${label || 'Repère sans étiquette'}`);
      if (planet.dataset && planet.dataset.constKey) item.dataset.e014PlanetKey = planet.dataset.constKey;
      if (planet.classList.contains('is-active')) put(item, 'aria-current', 'true');
      order.appendChild(item);
    });
  }

  /* E014-04 — Figure : une <figure> avec <figcaption> nomme le repère
   * actif et son rang, sans toucher aux boutons ni aux positions. */
  if (caption && typeof caption.replaceChildren === 'function') {
    let figure = document.getElementById(ID.figure);
    if (!figure) {
      figure = ctx.el('figure', 'e014-figure');
      figure.id = ID.figure;
      const label = ctx.el('figcaption', 'e014-figcaption');
      label.id = ID.figcaption;
      figure.appendChild(label);
      caption.appendChild(figure);
    }
    const active = planets.filter((planet) => planet.classList.contains('is-active'))[0] || null;
    const rank = active ? planets.indexOf(active) + 1 : 0;
    const label = active && active.dataset ? txt(active.dataset.label) : '';
    const legend = document.getElementById(ID.figcaption);
    if (legend) {
      legend.textContent = active
        ? `Repère actif : ${rank}/${size} · ${label || 'sans étiquette'}`
        : 'Aucun repère actif dans cette ère.';
    }
  }

  /* E014-05 — Unicité de aria-current : un seul repère peut être déclaré
   * courant ; l'attribut est retiré de toutes les planètes inactives. */
  planets.forEach((planet) => {
    if (planet.classList.contains('is-active')) {
      put(planet, 'aria-current', 'true');
    } else if (planet.hasAttribute && planet.hasAttribute('aria-current')) {
      planet.removeAttribute('aria-current');
    }
  });

  /* E014-06 — Étiquettes contextuelles : le nom de l'ère est ajouté à
   * l'étiquette accessible de chaque planète, une seule fois par rendu. */
  planets.forEach((planet, index) => {
    if (!planet.dataset || planet.dataset.e014Labelled === '1') return;
    const label = txt(planet.dataset.label);
    const active = planet.classList.contains('is-active');
    put(planet, 'aria-label',
      `Repère ${index + 1} sur ${size}${eraName ? ` de l’ère ${eraName}` : ''} : `
      + `${label || 'sans étiquette'}${active ? ', repère sélectionné' : ''}`);
    planet.dataset.e014Labelled = '1';
  });

  /* E014-07 — Relation planètes → points : le calque des lunes reçoit un
   * identifiant stable et chaque planète pointe vers une note masquée qui
   * explicite le lien entre repère et points vérifiés. */
  const moonLayer = field.querySelector('.const-layer-moons');
  if (moonLayer && !moonLayer.id) moonLayer.id = ID.moons;
  if (!document.getElementById(ID.points)) {
    field.appendChild(hiddenText(ctx, ID.points,
      'Les points vérifiés du repère sélectionné sont représentés par des lunes ; ils s’ouvrent dans le détail et ne modifient pas la position de la planète.'));
  }
  planets.forEach((planet) => put(planet, 'aria-details', ID.points));

  /* E014-08 — Glossaire : une <dl> définit ère, repère et point à partir
   * de la légende et des étiquettes des calques réellement rendus. */
  if (caption && typeof caption.replaceChildren === 'function') {
    let glossary = document.getElementById(ID.glossary);
    if (!glossary) {
      glossary = ctx.el('dl', 'e014-glossary');
      glossary.id = ID.glossary;
      caption.appendChild(glossary);
    }
    glossary.replaceChildren();
    const legends = nodes(layout, '.constellation-legend > span');
    ['.const-layer-suns', '.const-layer-planets', '.const-layer-moons'].forEach((selector, index) => {
      const term = txt(legends[index]);
      const layer = field.querySelector(selector);
      const definition = layer ? txt(layer.getAttribute('aria-label')) : '';
      if (!term && !definition) return;
      glossary.appendChild(ctx.el('dt', '', term || 'Élément'));
      glossary.appendChild(ctx.el('dd', '', definition || '—'));
    });
  }

  /* E014-09 — Titre hiérarchique : un <h3> masqué nomme le groupe des
   * planètes et devient son nom accessible via aria-labelledby. */
  let heading = document.getElementById(ID.heading);
  if (!heading) {
    heading = ctx.el('h3', 'e014-sr');
    heading.id = ID.heading;
    field.appendChild(heading);
  }
  heading.textContent = `Repères de l’ère${eraName ? ` ${eraName}` : ''} : ${size} planète${size > 1 ? 's' : ''}`;
  put(planetLayer, 'aria-labelledby', ID.heading);

  /* E014-10 — Statut narratif : un <p role="status" aria-live="polite">
   * énonce le nombre de planètes décrites et le rang du repère actif. */
  if (caption) {
    let status = document.getElementById(ID.status);
    if (!status) {
      status = ctx.el('p', 'e014-status');
      status.id = ID.status;
      put(status, 'role', 'status');
      put(status, 'aria-live', 'polite');
      caption.appendChild(status);
    }
    const activeRank = planets.filter((planet) => planet.classList.contains('is-active')).length
      ? planets.indexOf(planets.filter((planet) => planet.classList.contains('is-active'))[0]) + 1
      : 0;
    status.textContent = size
      ? `${size} planète${size > 1 ? 's' : ''} décrite${size > 1 ? 's' : ''} · repère actif ${activeRank}/${size} · ère ${eraName || 'non nommée'}.`
      : 'Aucune planète à décrire pour cette ère.';
  }
}

/* Greffon tolérant : une structure inattendue neutralise la lentille
 * sans jamais propager d'exception au registre. */
register('E014', (ctx) => {
  try {
    apply(ctx);
  } catch {
    return;
  }
});
