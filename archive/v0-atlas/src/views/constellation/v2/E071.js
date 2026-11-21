import { register } from './registry.js';

/* Lentille V2 E071 — équivalents clavier des affordances de survol de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau ni source aléatoire ni minuteur ni boucle d'animation propre.
   Préfixe d'unicité exclusif : v2e071 (CSS, id, classes, data-*, clés window).
   Le greffon reste passif et tolérant : un chantier défaillant est neutralisé
   sans jamais remonter d'exception au registre. */

const CSS_ID = 'constellation-v2-e071';
const PANNEAU_ID = 'v2e071-panneau';
const LIVE_ID = 'v2e071-live';
const SORTIE_ID = 'v2e071-sortie';
const TABLEAU_ID = 'v2e071-tableau';
const PIN_ID = 'v2e071-pin';
const CLE_TOUCHES = '__v2e071_touches';
const CLE_SURVOL = '__v2e071_survol';

/* État module : survit aux reconstructions complètes du DOM par la coque. */
const etat = {
  rendus: 0,
  touchesBranchees: false,
  survolBranche: false,
  epingle: false,
  dernier: '',
};

function sansEchec(action) {
  try { action(); } catch { /* greffon tolérant : aucune exception remontée */ }
}

function noeudsDu(layout) {
  return Array.from(layout.querySelectorAll('.const-sun, .const-planet, .const-moon'));
}

function typeDe(noeud) {
  if (noeud.classList.contains('const-sun')) return { nom: 'soleil', pluriel: 'Ères', cle: 'soleil' };
  if (noeud.classList.contains('const-planet')) return { nom: 'planète', pluriel: 'Repères', cle: 'planete' };
  if (noeud.classList.contains('const-moon')) return { nom: 'lune', pluriel: 'Points vérifiés', cle: 'lune' };
  return { nom: 'nœud', pluriel: 'Nœuds', cle: 'noeud' };
}

function libelleDe(noeud) {
  return String(
    noeud.dataset.label || noeud.getAttribute('title') || noeud.getAttribute('aria-label') || ''
  ).trim();
}

function positionDe(noeud) {
  const x = parseFloat(noeud.style.getPropertyValue('--x'));
  const y = parseFloat(noeud.style.getPropertyValue('--y'));
  return { x: Number.isFinite(x) ? x : NaN, y: Number.isFinite(y) ? y : NaN };
}

function identifiantsDu(noeud, index) {
  return { noeud: 'v2e071-noeud-' + index, description: 'v2e071-desc-' + index };
}

/* Panneau d'équivalents, inséré avant la légende sans déplacer le récit. */
function panneauDans(layout, creer) {
  const existant = layout.querySelector('#' + PANNEAU_ID);
  if (existant) return existant;

  const panneau = creer('section', 'v2e071-panneau');
  panneau.id = PANNEAU_ID;
  panneau.setAttribute('aria-label', 'Équivalents clavier du survol');

  const live = creer('p', 'v2e071-sr', '');
  live.id = LIVE_ID;
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  panneau.appendChild(live);

  const sortie = creer('output', 'v2e071-sortie', '');
  sortie.id = SORTIE_ID;
  sortie.setAttribute('aria-live', 'polite');
  sortie.setAttribute('aria-atomic', 'true');
  panneau.appendChild(sortie);

  const legende = layout.querySelector('.constellation-caption');
  if (legende && typeof layout.insertBefore === 'function') layout.insertBefore(panneau, legende);
  else layout.appendChild(panneau);
  return panneau;
}

function ajouterPhaseDescription(noeud, id) {
  const presents = String(noeud.getAttribute('aria-describedby') || '')
    .split(/\s+/).filter(Boolean);
  if (presents.indexOf(id) < 0) {
    presents.push(id);
    noeud.setAttribute('aria-describedby', presents.join(' '));
  }
}

function annonce(texte) {
  const live = typeof document !== 'undefined' ? document.getElementById(LIVE_ID) : null;
  if (live) live.textContent = texte;
}

register('E071', (ctx) => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  const creer = typeof ctx.el === 'function' ? ctx.el : document.createElement.bind(document);
  const noeuds = noeudsDu(layout);

  /* Feuille unique de la lentille V2, installée une seule fois pour la vue. */
  css(CSS_ID, `
.v2e071-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e071-panneau{margin:8px 0 4px}
.v2e071-sortie{display:block;font-size:9px;line-height:1.5;color:var(--gold);font-variant-numeric:tabular-nums}

/* E071-03 — miroir générique survol → focus sur tous les contrôles de la vue. */
.constellation-layout[data-v2e071="on"] :is(a,button)[data-v2e071-mirror="on"]:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px;border-color:var(--gold);color:var(--gold-bright);background:rgba(244,214,158,.08)}

/* E071-04 — indicateur de focus en mode contrastes forcés (non porté par la couleur). */
@media (forced-colors: active){
  .constellation-layout :is(a,button)[data-v2e071-mirror="on"]:focus-visible,
  .constellation-layout :is(.const-sun,.const-planet,.const-moon):focus-visible{outline:3px solid Highlight;outline-offset:3px;forced-color-adjust:none}
  .constellation-layout [data-v2e071-over="true"]{outline:3px dashed CanvasText;forced-color-adjust:none}
  #v2e071-pin{border:2px solid ButtonText;forced-color-adjust:none}
}

/* E071-06 — survol clavier épinglé : contour distinct du focus réel. */
.constellation-layout [data-v2e071-over="true"]:not(:focus-visible){outline:2px dashed var(--violet);outline-offset:2px}
.constellation-layout[data-v2e071-epingle="on"] [data-v2e071-over="true"]{outline:3px solid var(--violet);outline-offset:3px}
#v2e071-pin{min-height:36px;padding:0 12px;border:1px solid var(--gold);border-radius:8px;background:var(--surface-2);color:var(--gold-bright);font-size:10px;cursor:pointer}
#v2e071-pin[aria-pressed="true"]{border-style:double;border-width:3px}
#v2e071-pin:focus-visible,.v2e071-skip:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}

/* E071-07 — raccourcis ciblés : masqués jusqu'au focus, cibles ≥ 36 px. */
.v2e071-skip{position:absolute;left:10px;top:-64px;z-index:9;min-height:36px;padding:0 12px;border:1px solid var(--violet);border-radius:8px;background:var(--surface-2);color:var(--gold-bright);font-size:10px;cursor:pointer}
.v2e071-skip:focus-visible{top:8px}

/* E071-09 — inventaire indexable des infobulles de survol. */
#v2e071-tableau{border-collapse:collapse;margin:6px 0;font-size:9px;color:var(--muted-2)}
#v2e071-tableau caption{text-align:left;color:var(--gold);font-size:9px;margin-bottom:3px}
#v2e071-tableau th,#v2e071-tableau td{border:1px solid var(--line);padding:2px 5px;text-align:left}
#v2e071-tableau th{color:var(--gold-bright);font-weight:600}

/* E071-10 — mode sobre : aucune transition ni halo animé. */
.constellation-layout.v2e071-calm :is(a,button,.const-sun,.const-planet,.const-moon){transition:none!important}
.constellation-layout.v2e071-calm [data-v2e071-over="true"]{box-shadow:none}
@media (prefers-reduced-motion: reduce){
  .constellation-layout :is(a,button,.const-sun,.const-planet,.const-moon,.v2e071-skip){transition:none!important}
  .constellation-layout [data-v2e071-over="true"]{box-shadow:none}
}
@media (max-width:620px){
  .v2e071-sortie,#v2e071-tableau{font-size:8px}
}
`);

  panneauDans(layout, creer);

  /* E071-01 — Position et taille d'ensemble annoncées : chaque nœud porte sa
     place dans son type (aria-posinset) et l'effectif du type (aria-setsize). */
  sansEchec(() => {
    const effectifs = { soleil: 0, planete: 0, lune: 0 };
    noeuds.forEach((noeud) => { effectifs[typeDe(noeud).cle] += 1; });
    const vus = { soleil: 0, planete: 0, lune: 0 };
    noeuds.forEach((noeud) => {
      const cle = typeDe(noeud).cle;
      vus[cle] += 1;
      noeud.setAttribute('aria-posinset', String(vus[cle]));
      noeud.setAttribute('aria-setsize', String(effectifs[cle]));
    });
    layout.dataset.v2e071Effectifs = 'soleil:' + effectifs.soleil
      + ';planete:' + effectifs.planete + ';lune:' + effectifs.lune;
    layout.dataset.v2e071Positionnes = String(noeuds.length);
  });

  /* E071-02 — Infobulle convertie en description accessible : le texte que le
     survol portait dans title est dupliqué dans un nœud sr-only relié au bouton. */
  sansEchec(() => {
    const panneau = layout.querySelector('#' + PANNEAU_ID);
    if (!panneau) return;
    let descriptions = 0;
    noeuds.forEach((noeud, index) => {
      const rang = String(index + 1);
      const ids = identifiantsDu(noeud, rang);
      if (!noeud.id) noeud.id = ids.noeud;
      const type = typeDe(noeud);
      const titre = noeud.getAttribute('title') || '';
      const texte = type.nom + ' ' + rang + ' : ' + libelleDe(noeud)
        + (titre && titre !== libelleDe(noeud) ? ' — ' + titre : '') + '.';
      const desc = creer('span', 'v2e071-sr', texte);
      desc.id = ids.description;
      if (!layout.querySelector('#' + ids.description)) {
        panneau.appendChild(desc);
        descriptions += 1;
      }
      ajouterPhaseDescription(noeud, ids.description);
      noeud.dataset.v2e071Index = rang;
    });
    layout.dataset.v2e071Descriptions = String(descriptions);
  });

  /* E071-03 — Miroir générique survol → focus : interrupteur unique et marquage
     de tous les contrôles, pour étendre l'équivalence au-delà du seul retour. */
  sansEchec(() => {
    layout.dataset.v2e071 = 'on';
    const controles = Array.from(layout.querySelectorAll('a, button'));
    let marques = 0;
    controles.forEach((controle) => {
      controle.dataset.v2e071Mirror = 'on';
      marques += 1;
    });
    layout.dataset.v2e071Controles = String(marques);
  });

  /* E071-04 — Contrastes forcés : préparation auditable de la feuille dédiée,
     sans sonde propre ; le repli est entièrement porté par la feuille unique. */
  sansEchec(() => {
    layout.dataset.v2e071Contraste = 'prepare';
    const feuille = typeof document !== 'undefined' ? document.getElementById(CSS_ID) : null;
    layout.dataset.v2e071Feuille = feuille ? 'installee' : 'absente';
  });

  /* E071-05 — Saut direct par touches numériques 1–9 : écouteur de capture
     unique, enregistré sous une clé dédiée et remplacé à chaque rendu. */
  sansEchec(() => {
    if (etat.touchesBranchees || typeof window === 'undefined'
        || typeof window.addEventListener !== 'function'
        || typeof document.addEventListener !== 'function') return;
    etat.touchesBranchees = true;
    const surTouche = (evenement) => {
      if (!evenement || evenement.defaultPrevented || evenement.ctrlKey
          || evenement.metaKey || evenement.altKey) return;
      const touche = String(evenement.key || '');
      if (!/^[1-9]$/.test(touche)) return;
      const cible = evenement.target;
      const dansVue = (cible && cible.nodeType === 1 && layout.contains(cible))
        || (typeof document.activeElement !== 'undefined' && layout.contains(document.activeElement));
      if (!dansVue) return;
      const destination = noeuds[Number(touche) - 1];
      if (!destination || typeof destination.focus !== 'function') return;
      evenement.preventDefault();
      evenement.stopPropagation();
      destination.focus({ preventScroll: true });
      annonce('Saut direct : nœud ' + touche + ' sur ' + noeuds.length + '.');
    };
    const precedent = window[CLE_TOUCHES];
    if (typeof precedent === 'function') document.removeEventListener('keydown', precedent, true);
    window.VECTEMPOREL_KEYS?.registerScoped?.(() => true, surTouche);
    window[CLE_TOUCHES] = surTouche;
    layout.dataset.v2e071Touches = 'on';
  });

  /* E071-06 — Épinglage de l'aperçu : bascule indépendante (aria-pressed) et
     délégation focusin/focusout gardant l'état quand l'aperçu est épinglé. */
  sansEchec(() => {
    const panneau = layout.querySelector('#' + PANNEAU_ID);
    if (!panneau || layout.querySelector('#' + PIN_ID)) return;
    const bouton = creer('button', 'v2e071-pin', 'Épingler l’aperçu clavier');
    bouton.id = PIN_ID;
    bouton.type = 'button';
    bouton.setAttribute('aria-pressed', etat.epingle ? 'true' : 'false');
    bouton.addEventListener('click', () => {
      etat.epingle = !etat.epingle;
      bouton.setAttribute('aria-pressed', etat.epingle ? 'true' : 'false');
      layout.dataset.v2e071Epingle = etat.epingle ? 'on' : 'off';
      if (!etat.epingle) {
        noeuds.forEach((noeud) => noeud.removeAttribute('data-v2e071-over'));
      }
      annonce(etat.epingle
        ? 'Aperçu clavier épinglé : il reste affiché quand le focus quitte le nœud.'
        : 'Aperçu clavier libéré.');
    });
    panneau.appendChild(bouton);

    if (!etat.survolBranche && typeof document.addEventListener === 'function') {
      etat.survolBranche = true;
      const surEntree = (evenement) => {
        const cible = evenement && evenement.target;
        if (!cible || cible.nodeType !== 1 || typeof cible.closest !== 'function') return;
        const noeud = cible.closest('.const-sun, .const-planet, .const-moon');
        if (!noeud || !layout.contains(noeud)) return;
        noeuds.forEach((autre) => autre.removeAttribute('data-v2e071-over'));
        noeud.setAttribute('data-v2e071-over', 'true');
        etat.dernier = libelleDe(noeud);
        const type = typeDe(noeud);
        annonce(type.nom + ' : ' + libelleDe(noeud)
          + ' — position ' + String(noeud.getAttribute('aria-posinset') || '?')
          + ' / ' + String(noeud.getAttribute('aria-setsize') || '?') + '.');
        const sortie = layout.querySelector('#' + SORTIE_ID);
        if (sortie) majSortie(layout, sortie);
      };
      const surSortie = (evenement) => {
        if (etat.epingle) return;
        const cible = evenement && evenement.target;
        if (!cible || cible.nodeType !== 1 || typeof cible.closest !== 'function') return;
        const noeud = cible.closest('.const-sun, .const-planet, .const-moon');
        if (noeud) noeud.removeAttribute('data-v2e071-over');
      };
      const precedent = typeof window !== 'undefined' ? window[CLE_SURVOL] : null;
      if (Array.isArray(precedent)) {
        document.removeEventListener('focusin', precedent[0], true);
        document.removeEventListener('focusout', precedent[1], true);
      }
      document.addEventListener('focusin', surEntree, true);
      document.addEventListener('focusout', surSortie, true);
      if (typeof window !== 'undefined') window[CLE_SURVOL] = [surEntree, surSortie];
    }
    layout.dataset.v2e071Epingle = etat.epingle ? 'on' : 'off';
    layout.dataset.v2e071Focus = 'on';
  });

  /* E071-07 — Raccourcis ciblés par type : un point d'entrée pour chaque couche
     sémantique, masqué jusqu'au focus, avec description rattachée à la couche. */
  sansEchec(() => {
    const champ = layout.querySelector('.constellation-field');
    if (!champ) return;
    const groupes = [
      { cle: 'soleil', selecteur: '.const-layer-suns', libelle: 'Aller aux ères' },
      { cle: 'planete', selecteur: '.const-layer-planets', libelle: 'Aller aux repères' },
      { cle: 'lune', selecteur: '.const-layer-moons', libelle: 'Aller aux points vérifiés' },
    ];
    let poses = 0;
    groupes.forEach((groupe) => {
      const couche = layout.querySelector(groupe.selecteur);
      const cibles = noeuds.filter((noeud) => typeDe(noeud).cle === groupe.cle);
      const saut = creer('button', 'v2e071-skip', groupe.libelle);
      saut.id = 'v2e071-aller-' + groupe.cle;
      saut.type = 'button';
      if (couche) {
        saut.setAttribute('aria-controls', couche.id || ('v2e071-couche-' + groupe.cle));
        if (!couche.id) couche.id = 'v2e071-couche-' + groupe.cle;
      }
      saut.addEventListener('click', () => {
        if (cibles[0] && typeof cibles[0].focus === 'function') cibles[0].focus({ preventScroll: true });
      });
      if (champ.parentNode && !layout.querySelector('#' + saut.id)) {
        champ.parentNode.insertBefore(saut, champ);
        poses += 1;
      }
    });
    layout.dataset.v2e071Sauts = String(poses);
  });

  /* E071-08 — Synthèse dans un output : l'état du survol clavier est récapitulé
     dans un élément à rôle de statut implicite, relié à la bascule et aux sauts. */
  sansEchec(() => {
    const sortie = layout.querySelector('#' + SORTIE_ID);
    if (!sortie) return;
    const references = [PIN_ID].concat(noeuds.slice(0, 3).map((noeud) => noeud.id).filter(Boolean));
    sortie.setAttribute('for', references.join(' '));
    majSortie(layout, sortie);
    layout.dataset.v2e071Sortie = SORTIE_ID;
  });

  /* E071-09 — Inventaire indexable : un tableau décrit chaque infobulle de
     survol (type, rang, libellé, position), lisible sans pointeur ni couleur. */
  sansEchec(() => {
    const panneau = layout.querySelector('#' + PANNEAU_ID);
    if (!panneau || layout.querySelector('#' + TABLEAU_ID)) return;
    const tableau = creer('table', 'v2e071-tableau');
    tableau.id = TABLEAU_ID;
    const legendeTexte = 'Infobulles de survol — équivalent clavier';
    const caption = creer('caption', '', legendeTexte);
    tableau.appendChild(caption);
    const tete = creer('thead', '');
    const ligneTete = creer('tr', '');
    ['Type', 'Rang', 'Libellé', 'Position'].forEach((texte) => {
      const th = creer('th', '', texte);
      th.setAttribute('scope', 'col');
      ligneTete.appendChild(th);
    });
    tete.appendChild(ligneTete);
    tableau.appendChild(tete);
    const corps = creer('tbody', '');
    noeuds.forEach((noeud, index) => {
      const type = typeDe(noeud);
      const position = positionDe(noeud);
      const coords = Number.isFinite(position.x) && Number.isFinite(position.y)
        ? String(position.x).replace('.', ',') + ' / ' + String(position.y).replace('.', ',')
        : '—';
      const ligne = creer('tr', '');
      ligne.dataset.v2e071Rang = String(index + 1);
      [type.nom, String(index + 1), libelleDe(noeud), coords].forEach((texte) => {
        ligne.appendChild(creer('td', '', texte));
      });
      corps.appendChild(ligne);
    });
    tableau.appendChild(corps);
    panneau.appendChild(tableau);
    layout.dataset.v2e071Lignes = String(noeuds.length);
  });

  /* E071-10 — Mode sobre et garde d'idempotence : préférence lue sur le contexte,
     unicité du panneau vérifiée, état final consigné dans la synthèse. */
  sansEchec(() => {
    etat.rendus += 1;
    const reduit = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion() : false;
    layout.dataset.v2e071Mouvement = reduit ? 'reduit' : 'normal';
    layout.dataset.v2e071Rendus = String(etat.rendus);
    if (reduit) layout.classList.add('v2e071-calm');
    else layout.classList.remove('v2e071-calm');
    const panneaux = typeof document !== 'undefined'
      ? document.querySelectorAll('#' + PANNEAU_ID).length : 0;
    layout.dataset.v2e071Idempotence = String(panneaux);
    const sortie = layout.querySelector('#' + SORTIE_ID);
    if (sortie) {
      sortie.textContent += ' Mouvement réduit : ' + (reduit ? 'oui' : 'non')
        + ' · panneaux v2e071 : ' + panneaux + ' (attendu 1).';
    }
  });
});

/* Récapitulatif partagé, utilisé par l'annonce du chantier 06 et la synthèse 08. */
function majSortie(layout, sortie) {
  const effectifs = String(layout.dataset.v2e071Effectifs || '');
  const dernier = etat.dernier ? ' · courant : ' + etat.dernier : '';
  sortie.textContent = 'Ères, repères, points — ' + effectifs.replace(/;/g, ' · ')
    + dernier + ' · épinglé : ' + (etat.epingle ? 'oui' : 'non') + '.';
}
