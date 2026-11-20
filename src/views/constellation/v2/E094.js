import { register } from './registry.js';

/* Lentille V2 E094 — structure sémantique du champ d'étoiles, seconde passe.
   Dix chantiers inédits : hiérarchie, relations, références et cohérence.
   Aucun réseau, aucune source aléatoire, aucun minuteur ni boucle d'animation
   propre ; tout est dérivé du DOM produit par la vue Constellation. */

const ID_PANEL = 'v2e094-panel';
const ID_TITRE = 'v2e094-titre';
const ID_INTRO = 'v2e094-intro';
const ID_SELECT = 'v2e094-select';
const ID_ARBRE = 'v2e094-arbre';
const ID_LISTE = 'v2e094-liste';
const ID_COMPTEURS = 'v2e094-compteurs';
const ID_SIGNETS = 'v2e094-signets';
const ID_STATUT = 'v2e094-statut';
const ID_CONTROLE = 'v2e094-controle';

/* Vue de structure retenue : survit aux reconstructions complètes du DOM. */
const etat = { vue: 'arbre' };

const VUES = [
  { cle: 'arbre', libelle: 'Arbre' },
  { cle: 'liste', libelle: 'Liste' },
  { cle: 'compteurs', libelle: 'Compteurs' },
];

/* Isole chaque chantier : une anomalie locale n'interrompt pas les suivants. */
function sansEchec(action) {
  try { action(); } catch { /* neutralisation silencieuse, sans journalisation */ }
}

/* Tronque un libellé sans couper un mot, pour les intitulés dérivés du DOM. */
function court(texte, max) {
  const s = (texte == null ? '' : String(texte)).trim();
  if (s.length <= max) return s;
  const tranche = s.slice(0, max - 1);
  const espace = tranche.lastIndexOf(' ');
  return (espace > 0 ? tranche.slice(0, espace) : tranche) + '…';
}

/* Feuille unique de la lentille, identifiant réservé à cette seconde passe. */
const CSS = `
#${ID_PANEL}{margin:12px 0 0;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--muted);font:inherit;font-size:10px;line-height:1.5}
#${ID_PANEL} h2{margin:0 0 4px;color:var(--gold);font-size:12px;font-weight:600}
#${ID_INTRO}{margin:0 0 8px;color:var(--ink-soft);font-size:10px}
#${ID_SELECT}{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}
.v2e094-radio{min-height:36px;min-width:70px;padding:6px 10px;border:1px solid var(--line);border-radius:6px;background:transparent;color:var(--ink-soft);font:inherit;font-size:10px;cursor:pointer}
.v2e094-radio[aria-checked="true"]{border-color:var(--gold);border-style:double;color:var(--gold-bright);font-weight:600;text-decoration:underline}
.v2e094-radio:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
#${ID_PANEL} [hidden]{display:none!important}
#${ID_ARBRE},#${ID_LISTE},#${ID_COMPTEURS}{margin:0;padding:0}
.v2e094-treeitem{margin:0 0 2px;padding:2px 6px;border-left:2px solid transparent}
.v2e094-treeitem[data-v2e094-rel="courant"]{border-left-color:var(--gold-bright);font-weight:600;text-decoration:underline}
.v2e094-treeitem[data-v2e094-rel="ancetre"]{border-left-color:var(--violet)}
.v2e094-treeitem[data-v2e094-rel="frere"]{opacity:.85}
.v2e094-treeitem[tabindex="0"]:focus-visible{outline:2px solid var(--gold-bright);outline-offset:1px}
.v2e094-tige{margin:2px 0 2px 10px;padding-left:10px;border-left:1px dashed var(--line)}
.v2e094-lbl{cursor:default}
#${ID_COMPTEURS} dt{color:var(--gold);font-weight:600;margin-top:6px}
#${ID_COMPTEURS} dd{margin:0 0 0 10px;color:var(--ink-soft)}
#${ID_LISTE} ol{margin:0 0 4px;padding-left:18px}
#${ID_SIGNETS}{margin:8px 0 0}
#${ID_SIGNETS} h3{margin:0 0 4px;font-size:10px;color:var(--gold)}
#${ID_SIGNETS} ol{margin:0;padding-left:18px;columns:2}
.v2e094-signet{color:var(--gold-bright);text-decoration:underline;font-size:10px}
.v2e094-signet:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
#${ID_STATUT}{margin:8px 0 0;color:var(--gold-bright);font-size:10px;min-height:1em}
#${ID_CONTROLE}{margin:6px 0 0;color:var(--muted);font-size:9px}
#${ID_CONTROLE}[data-v2e094-ok="non"]{color:var(--gold-bright);text-decoration:underline}
/* Chantier 06 : branche courante mise en avant sans porter l'information par la seule couleur. */
.constellation-field [data-v2e094-rel="courant"]{box-shadow:0 0 0 3px rgba(244,214,158,.45)}
.constellation-field [data-v2e094-rel="ancetre"]{box-shadow:0 0 0 3px rgba(178,139,221,.35)}
.constellation-field [data-v2e094-rel="autre"]{opacity:.7}
.v2e094-still #${ID_PANEL},.v2e094-still #${ID_PANEL} *{transition:none!important;animation:none!important}
@media (prefers-reduced-motion:reduce){#${ID_PANEL},#${ID_PANEL} *{transition:none!important;animation:none!important}}
@media (max-width:620px){#${ID_PANEL}{padding:8px}#${ID_SIGNETS} ol{columns:1}}`;

register('E094', ctx => {
  /* Garde d'entrée : sans layout exploitable, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  const doc = layout.ownerDocument || document;

  const faire = typeof ctx.el === 'function'
    ? (tag, cls, txt) => ctx.el(tag, cls, txt)
    : (tag, cls, txt) => {
        const n = doc.createElement(tag);
        if (cls) n.className = cls;
        if (txt !== undefined) n.textContent = txt;
        return n;
      };
  const dire = (message) => {
    const live = layout.querySelector('#' + ID_STATUT);
    if (live) live.textContent = message;
  };

  css('constellation-v2-e094', CSS);

  /* Matières premières : uniquement le DOM rendu, aucune donnée inventée. */
  const champ = layout.querySelector('.constellation-field');
  const couches = {
    ere: champ ? champ.querySelector('.const-layer-suns') : null,
    repere: champ ? champ.querySelector('.const-layer-planets') : null,
    point: champ ? champ.querySelector('.const-layer-moons') : null,
  };
  const soleils = couches.ere ? Array.from(couches.ere.querySelectorAll('.const-sun')) : [];
  const planetes = couches.repere ? Array.from(couches.repere.querySelectorAll('.const-planet')) : [];
  const lunes = couches.point ? Array.from(couches.point.querySelectorAll('.const-moon')) : [];
  const noeuds = soleils.concat(planetes, lunes);
  const aretes = champ ? champ.querySelectorAll('.constellation-edges .const-edge').length : 0;
  const etatNoeud = layout.querySelector('.constellation-state');
  const texteEtat = etatNoeud && typeof etatNoeud.textContent === 'string' ? etatNoeud.textContent : '';

  const estCourant = (n) => !!n && n.getAttribute('aria-current') === 'true';
  const courant = {
    ere: soleils.findIndex(estCourant),
    repere: planetes.findIndex(estCourant),
    point: lunes.findIndex(estCourant),
  };
  const ancetres = new Set();
  if (courant.ere >= 0) ancetres.add(soleils[courant.ere]);
  if (courant.repere >= 0) ancetres.add(planetes[courant.repere]);

  function chemin(type, index) {
    const ere = courant.ere >= 0 ? `Ère ${courant.ere + 1}` : 'Ère —';
    if (type === 'ere') return `Ère ${index + 1}`;
    if (type === 'repere') return `${ere} · Repère ${index + 1}`;
    return `${ere} · Repère ${courant.repere >= 0 ? courant.repere + 1 : '—'} · Point ${index + 1}`;
  }
  function relation(noeur, type) {
    if (estCourant(noeur)) return 'courant';
    if (ancetres.has(noeur)) return 'ancetre';
    if (courant[type] >= 0) return 'frere';
    return 'autre';
  }
  function libelle(noeur) {
    return court(noeur.getAttribute('aria-label') || noeur.dataset.label || noeur.title || 'Sans libellé', 34);
  }

  /* E094-01 — Conteneur de structure : repère nommé et introduction textuelle. */
  let panneau = layout.querySelector('#' + ID_PANEL);
  sansEchec(() => {
    if (!panneau) {
      panneau = faire('section', '', '');
      panneau.id = ID_PANEL;
      panneau.appendChild(faire('h2', '', 'Structure du champ — seconde passe'));
      panneau.lastChild.id = ID_TITRE;
      panneau.appendChild(faire('p', '', ''));
      panneau.lastChild.id = ID_INTRO;
      layout.appendChild(panneau);
    }
    panneau.setAttribute('aria-labelledby', ID_TITRE);
    const intro = panneau.querySelector('#' + ID_INTRO);
    if (intro) {
      intro.textContent = noeuds.length
        ? 'Lecture structurée du champ : hiérarchie ères, repères et points, relations entre couches et cohérence des décomptes. Les libellés proviennent du rendu, aucune donnée n’est ajoutée.'
        : 'Aucun nœud à structurer dans ce rendu du champ d’étoiles.';
    }
  });

  /* E094-02 — Carte arborescente : role="tree", groupes imbriqués et tabulation mobile. */
  const arbre = panneau ? faire('div', '', '') : null;
  sansEchec(() => {
    if (!arbre || !noeuds.length) return;
    arbre.id = ID_ARBRE;
    arbre.setAttribute('role', 'tree');
    arbre.setAttribute('aria-label', 'Carte arborescente du champ : ères, repères puis points');
    const items = [];
    const ajouterItem = (parent, noeur, type, index) => {
      const item = faire('div', 'v2e094-treeitem', '');
      item.setAttribute('role', 'treeitem');
      item.setAttribute('aria-level', type === 'ere' ? '1' : type === 'repere' ? '2' : '3');
      item.setAttribute('aria-selected', estCourant(noeur) ? 'true' : 'false');
      item.setAttribute('data-v2e094-rel', relation(noeur, type));
      item.setAttribute('data-v2e094-cible', noeur.getAttribute('data-v2e094-ancre') || '');
      item.appendChild(faire('span', 'v2e094-lbl', chemin(type, index) + ' — ' + libelle(noeur)));
      parent.appendChild(item);
      items.push(item);
      return item;
    };
    soleils.forEach((soleil, i) => {
      const itemEre = ajouterItem(arbre, soleil, 'ere', i);
      const tigeRep = faire('div', 'v2e094-tige', '');
      tigeRep.setAttribute('role', 'group');
      itemEre.appendChild(tigeRep);
      planetes.forEach((planete, j) => {
        const itemRep = ajouterItem(tigeRep, planete, 'repere', j);
        const tigePt = faire('div', 'v2e094-tige', '');
        tigePt.setAttribute('role', 'group');
        itemRep.appendChild(tigePt);
        lunes.forEach((lune, k) => ajouterItem(tigePt, lune, 'point', k));
      });
    });
    items.forEach((item, i) => { item.tabIndex = i === 0 ? 0 : -1; });
    arbre.addEventListener('keydown', (event) => {
      if (!event || event.altKey || event.ctrlKey || event.metaKey) return;
      const idx = items.indexOf(doc.activeElement);
      if (idx < 0) return;
      let next = idx;
      if (event.key === 'ArrowDown') next = Math.min(items.length - 1, idx + 1);
      else if (event.key === 'ArrowUp') next = Math.max(0, idx - 1);
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = items.length - 1;
      else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        const item = items[idx];
        if (item.querySelector('[role="group"]')) {
          const ouvert = item.getAttribute('aria-expanded') !== 'false';
          item.setAttribute('aria-expanded', ouvert ? 'false' : 'true');
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        next = event.key === 'ArrowRight' ? Math.min(items.length - 1, idx + 1) : Math.max(0, idx - 1);
      } else return;
      event.preventDefault();
      event.stopPropagation();
      items.forEach((it, i) => { it.tabIndex = i === next ? 0 : -1; });
      items[next].focus({ preventScroll: true });
    });
  });

  /* E094-03 — Chemins structurels déterministes posés sur chaque nœud. */
  sansEchec(() => {
    soleils.forEach((n, i) => n.setAttribute('data-v2e094-path', chemin('ere', i)));
    planetes.forEach((n, i) => n.setAttribute('data-v2e094-path', chemin('repere', i)));
    lunes.forEach((n, i) => n.setAttribute('data-v2e094-path', chemin('point', i)));
  });

  /* E094-04 — Cardinalités en liste de définitions, réutilisée par la vue « Compteurs ». */
  const compteurs = panneau ? faire('dl', '', '') : null;
  sansEchec(() => {
    if (!compteurs) return;
    compteurs.id = ID_COMPTEURS;
    const paires = [
      ['Ères', `${soleils.length} soleil${soleils.length > 1 ? 's' : ''} dans la couche des ères.`],
      ['Repères de l’ère', `${planetes.length} planète${planetes.length > 1 ? 's' : ''} rattachée${planetes.length > 1 ? 's' : ''} à l’ère courante.`],
      ['Points vérifiés', `${lunes.length} lune${lunes.length > 1 ? 's' : ''} du repère courant.`],
      ['Arêtes', `${aretes} trait${aretes > 1 ? 's' : ''} de liaison décoratif${aretes > 1 ? 's' : ''} dans le champ.`],
    ];
    paires.forEach(([terme, definition]) => {
      compteurs.appendChild(faire('dt', '', terme));
      compteurs.appendChild(faire('dd', '', definition));
    });
  });

  /* E094-05 — Relations de contrôle entre couches : le parent annonce ce qu'il pilote. */
  sansEchec(() => {
    if (!couches.repere || !couches.point) return;
    if (!couches.repere.id) couches.repere.id = 'v2e094-couche-repere';
    if (!couches.point.id) couches.point.id = 'v2e094-couche-point';
    couches.repere.setAttribute('data-v2e094-couche', 'repere');
    couches.point.setAttribute('data-v2e094-couche', 'point');
    soleils.forEach((n) => n.setAttribute('aria-controls', couches.repere.id));
    planetes.forEach((n) => n.setAttribute('aria-controls', couches.point.id));
  });

  /* E094-06 — États relationnels et mise en avant de la branche courante. */
  sansEchec(() => {
    noeuds.forEach((n) => {
      const type = soleils.indexOf(n) >= 0 ? 'ere' : planetes.indexOf(n) >= 0 ? 'repere' : 'point';
      n.setAttribute('data-v2e094-rel', relation(n, type));
    });
    if (!champ) return;
    champ.addEventListener('focusin', (event) => {
      const cible = event && event.target && event.target.nodeType === 1 && typeof event.target.closest === 'function'
        ? event.target.closest('.const-sun,.const-planet,.const-moon') : null;
      if (!cible || !champ.contains(cible)) return;
      noeuds.forEach((n) => {
        if (n !== cible) n.removeAttribute('data-v2e094-focus');
      });
      cible.setAttribute('data-v2e094-focus', 'true');
      dire('Nœud focalisé : ' + (cible.getAttribute('data-v2e094-path') || libelle(cible)) + '.');
    });
  });

  /* E094-07 — Signets internes : ancres locales, aucun href distant ni réseau. */
  let seq = 0;
  sansEchec(() => {
    noeuds.forEach((n) => {
      if (!n.id) {
        n.id = 'v2e094-noeud-' + (++seq);
        n.setAttribute('data-v2e094-id-cree', 'oui');
      }
      n.setAttribute('data-v2e094-ancre', n.id);
    });
    if (!panneau || !noeuds.length) return;
    const nav = faire('nav', '', '');
    nav.id = ID_SIGNETS;
    nav.setAttribute('aria-label', 'Signets structurels du champ d’étoiles');
    nav.appendChild(faire('h3', '', 'Signets structurels'));
    const liste = faire('ol', '', '');
    noeuds.forEach((n) => {
      const li = faire('li', '', '');
      const a = faire('a', 'v2e094-signet', court(n.getAttribute('data-v2e094-path') || libelle(n), 40));
      a.href = '#' + n.getAttribute('data-v2e094-ancre');
      li.appendChild(a);
      liste.appendChild(li);
    });
    nav.appendChild(liste);
    panneau.appendChild(nav);
  });

  /* E094-08 — Vue de structure à choix unique : radiogroupe, pas d'aria-pressed. */
  const listeLineaire = panneau ? faire('div', '', '') : null;
  const radios = [];
  sansEchec(() => {
    if (!panneau || !listeLineaire) return;
    listeLineaire.id = ID_LISTE;
    listeLineaire.appendChild(faire('h3', '', 'Outline linéaire'));
    soleils.forEach((soleil, i) => {
      const ol = faire('ol', '', '');
      const liEre = faire('li', '', court(chemin('ere', i) + ' — ' + libelle(soleil), 48));
      ol.appendChild(liEre);
      const sous = faire('ol', '', '');
      planetes.forEach((planete, j) => {
        const liRep = faire('li', '', court(chemin('repere', j) + ' — ' + libelle(planete), 46));
        sous.appendChild(liRep);
        const sousPt = faire('ol', '', '');
        lunes.forEach((lune, k) => sousPt.appendChild(faire('li', '', court(chemin('point', k) + ' — ' + libelle(lune), 44))));
        liRep.appendChild(sousPt);
      });
      liEre.appendChild(sous);
      listeLineaire.appendChild(ol);
    });

    const select = faire('div', '', '');
    select.id = ID_SELECT;
    select.setAttribute('role', 'radiogroup');
    select.setAttribute('aria-label', 'Représentation de la structure');
    VUES.forEach((vue) => {
      const bouton = faire('button', 'v2e094-radio', vue.libelle);
      bouton.type = 'button';
      bouton.setAttribute('role', 'radio');
      bouton.setAttribute('data-v2e094-vue', vue.cle);
      bouton.addEventListener('click', () => appliquerVue(vue.cle));
      select.appendChild(bouton);
      radios.push(bouton);
    });
    panneau.insertBefore(select, panneau.firstChild.nextSibling);
    panneau.insertBefore(arbre, select.nextSibling);
    panneau.insertBefore(listeLineaire, arbre.nextSibling);
    panneau.insertBefore(compteurs, listeLineaire.nextSibling);

    select.addEventListener('keydown', (event) => {
      if (!event) return;
      const idx = radios.indexOf(doc.activeElement);
      if (idx < 0) return;
      let next = idx;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (idx + 1) % radios.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (idx - 1 + radios.length) % radios.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = radios.length - 1;
      else return;
      event.preventDefault();
      event.stopPropagation();
      radios[next].focus({ preventScroll: true });
      appliquerVue(radios[next].getAttribute('data-v2e094-vue'));
    });
    appliquerVue(etat.vue);
  });

  function appliquerVue(cle) {
    etat.vue = VUES.some((v) => v.cle === cle) ? cle : 'arbre';
    const regions = { arbre, liste: listeLineaire, compteurs };
    Object.keys(regions).forEach((k) => {
      if (regions[k]) regions[k].hidden = k !== etat.vue;
    });
    radios.forEach((r) => {
      const actif = r.getAttribute('data-v2e094-vue') === etat.vue;
      r.setAttribute('aria-checked', actif ? 'true' : 'false');
      r.tabIndex = actif ? 0 : -1;
    });
    const vue = VUES.find((v) => v.cle === etat.vue) || VUES[0];
    dire(`Vue ${vue.libelle.toLowerCase()} affichée : ${soleils.length} ères, ${planetes.length} repères, ${lunes.length} points.`);
  }

  /* E094-09 — Région de statut structurel : annonce polie, non portée par la couleur. */
  sansEchec(() => {
    if (!panneau) return;
    let statut = panneau.querySelector('#' + ID_STATUT);
    if (!statut) {
      statut = faire('p', '', '');
      statut.id = ID_STATUT;
      panneau.appendChild(statut);
    }
    statut.setAttribute('role', 'status');
    statut.setAttribute('aria-live', 'polite');
    statut.setAttribute('aria-atomic', 'true');
    const vue = VUES.find((v) => v.cle === etat.vue) || VUES[0];
    statut.textContent = `Structure : ${soleils.length} ères, ${planetes.length} repères, ${lunes.length} points · vue ${vue.libelle.toLowerCase()}.`;
  });

  /* E094-10 — Contrôle de cohérence reproductible : déclaré contre rendu. */
  sansEchec(() => {
    if (!panneau) return;
    let sortie = panneau.querySelector('#' + ID_CONTROLE);
    if (!sortie) {
      sortie = faire('p', '', '');
      sortie.id = ID_CONTROLE;
      panneau.appendChild(sortie);
    }
    const repere = /Point\s*:\s*(\d+)\s*\/\s*(\d+)/.exec(texteEtat);
    const declare = repere ? Number(repere[2]) : null;
    const coherent = declare === null ? null : declare === lunes.length;
    const attribues = noeuds.filter((n) => n.getAttribute('data-v2e094-path')).length;
    sortie.setAttribute('data-v2e094-ok', coherent === null ? 'indetermine' : coherent ? 'oui' : 'non');
    sortie.textContent = coherent === null
      ? `Contrôle de cohérence : décompte déclaré indisponible ; ${attribues} chemins structurels posés sur ${noeuds.length} nœuds rendus.`
      : coherent
        ? `Contrôle de cohérence : ${declare} point(s) déclaré(s), ${lunes.length} rendu(s) — concordance ; ${attribues}/${noeuds.length} chemins posés.`
        : `Contrôle de cohérence : ${declare} point(s) déclaré(s) mais ${lunes.length} rendu(s) — divergence ; ${attribues}/${noeuds.length} chemins posés.`;
  });

  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) layout.classList.add('v2e094-still');
  else layout.classList.remove('v2e094-still');
});
