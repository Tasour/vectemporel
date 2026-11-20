import { register } from './registry.js';

/* Lentille E086 — gestion de l'état appliquée au chemin de connexion de la vue
 * Constellation. Le chemin est la chaîne « soleil de l'ère active → planète du
 * repère actif → lune du point actif », matérialisée par les traits SVG
 * `.is-path`. La lentille n'écrit aucun fichier partagé : un seul greffon, une
 * unique feuille de style, des identifiants préfixés e086-, aucune sortie de
 * journal, aucun appel réseau, aucune source aléatoire, aucun minuteur ni
 * boucle d'animation propre. Tout est lu depuis le DOM déjà rendu.
 *
 * Contrat : un seul appel d'enregistrement pour l'identifiant E086, avec un
 * contexte { viewId, stage, layout, css(id, rules), el(tag, cls, text),
 * reducedMotion() }.
 */

const MIROIR_ID = 'e086-miroir';
const LIVE_ID = 'e086-live';
const BOUTON_ID = 'e086-reset';
const MAX_HISTORIQUE = 8;

/* État module : survit aux reconstructions complètes du DOM par la coque. */
const etat = {
  rendus: 0,
  clePrecedente: null,
  cleInitiale: null,
  clesInitiales: null,
  generation: 0,
  transitions: 0,
  historique: [],
};

/* Exécution tolérante : un chantier défaillant n'interrompt pas les suivants. */
function sansEchec(action) {
  try { action(); } catch { /* neutralisation silencieuse, sans journal */ }
}

function actifPar(liste) {
  return liste.find((noeud) => noeud.classList.contains('is-active')) || null;
}

function cleDe(noeud) {
  return noeud && noeud.dataset ? (noeud.dataset.constKey || '') : '';
}

function libelleDe(noeud) {
  return noeud ? String(noeud.dataset.label || noeud.getAttribute('aria-label') || '') : '';
}

function nombre(valeur) {
  const resultat = parseFloat(valeur);
  return Number.isFinite(resultat) ? resultat : 0;
}

function longueurDe(trait) {
  const dx = nombre(trait.getAttribute('x2')) - nombre(trait.getAttribute('x1'));
  const dy = nombre(trait.getAttribute('y2')) - nombre(trait.getAttribute('y1'));
  return Math.sqrt(dx * dx + dy * dy);
}

function ecrire(miroir, id, texte) {
  const noeud = miroir && miroir.querySelector('#' + id);
  if (noeud) noeud.textContent = texte;
}

/* Fabrique le miroir d'état une seule fois par rendu, avec garde d'idempotence. */
function miroirDans(layout, make) {
  const existant = layout.querySelector('#' + MIROIR_ID);
  if (existant) return existant;
  const residu = document.getElementById(MIROIR_ID);
  if (residu && residu.parentNode) residu.parentNode.removeChild(residu);

  const miroir = make('section', 'e086-miroir');
  miroir.id = MIROIR_ID;
  miroir.setAttribute('aria-labelledby', 'e086-titre');

  const titre = make('h3', 'e086-titre', 'État du chemin de connexion');
  titre.id = 'e086-titre';
  miroir.appendChild(titre);

  const lignes = [
    ['e086-valeur-ere', 'Ère'],
    ['e086-valeur-repere', 'Repère'],
    ['e086-valeur-point', 'Point'],
    ['e086-valeur-segments', 'Segments'],
    ['e086-valeur-longueur', 'Longueur'],
    ['e086-valeur-historique', 'Historique'],
  ];
  lignes.forEach(([id, libelle]) => {
    const ligne = make('p', 'e086-ligne');
    const nom = make('span', 'e086-nom', libelle + ' : ');
    const valeur = make('span', 'e086-valeur', '—');
    valeur.id = id;
    ligne.appendChild(nom);
    ligne.appendChild(valeur);
    miroir.appendChild(ligne);
  });

  const live = make('p', 'e086-sr e086-live', '');
  live.id = LIVE_ID;
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  miroir.appendChild(live);

  const bouton = make('button', 'e086-reset', 'Revenir au chemin initial');
  bouton.id = BOUTON_ID;
  bouton.type = 'button';
  miroir.appendChild(bouton);

  const caption = layout.querySelector('.constellation-caption');
  if (caption && caption.parentNode) caption.parentNode.insertBefore(miroir, caption);
  else if (layout.appendChild) layout.appendChild(miroir);
  return miroir;
}

/* Rejoue les clés du premier rendu : la restauration est une action utilisateur. */
function restaurer(layout, champ) {
  if (!etat.clesInitiales) return;
  const cles = [etat.clesInitiales.ere, etat.clesInitiales.repere, etat.clesInitiales.point]
    .filter((cle) => Boolean(cle));
  const candidats = Array.from(layout.querySelectorAll('[data-const-key]'));
  cles.forEach((cle) => {
    const noeud = candidats.find((candidat) => candidat.dataset.constKey === cle);
    if (noeud && typeof noeud.click === 'function') noeud.click();
  });
  if (champ) champ.dataset.e086Restaure = 'true';
}

register('E086', (ctx) => {
  /* Garde d'entrée : sans layout rendu par constellation.js, aucun ajout DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'constellation') return;
  if (typeof document === 'undefined') return;

  try {
    const layout = ctx.layout;
    const make = typeof ctx.el === 'function'
      ? (tag, cls, txt) => ctx.el(tag, cls, txt)
      : (tag, cls, txt) => {
          const noeud = document.createElement(tag);
          if (cls) noeud.className = cls;
          if (txt !== undefined) noeud.textContent = txt;
          return noeud;
        };

    /* Feuille unique de la lentille, injectée une seule fois par le registre. */
    ctx.css('constellation-e086', `
/* Miroir d'état : panneau textuel autonome, isolé du reste du rendu. */
.constellation-layout .e086-miroir{
  margin:12px 0 0;padding:10px 12px;border:1px solid var(--line);border-radius:8px;
  background:var(--surface-2);color:var(--muted);font-family:inherit;
  font-size:10px;line-height:1.55;contain:layout style paint;
}
.e086-miroir .e086-titre{
  margin:0 0 6px;color:var(--gold);font-family:var(--serif);
  font-size:12px;font-weight:450;
}
.e086-miroir .e086-ligne{margin:2px 0;}
.e086-miroir .e086-nom{color:var(--gold);}
.e086-miroir .e086-valeur{color:var(--ink-soft);font-variant-numeric:tabular-nums;}
.e086-miroir .e086-live{margin:6px 0;color:var(--gold-bright);font-size:9px;}
.e086-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;}
.e086-reset{
  min-height:36px;padding:0 10px;border:1px solid var(--gold);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--gold-bright);
  font-size:9px;cursor:pointer;
}
.e086-reset:focus-visible{outline:3px solid var(--gold-bright);outline-offset:2px;}
.e086-reset:disabled{opacity:.45;cursor:not-allowed;}

/* chantier 04 — transition courte du trait, neutralisée en mode sobre. */
.constellation-layout .constellation-edges line.is-path{
  transition:stroke .18s ease,stroke-width .18s ease,opacity .18s ease;
}
/* chantier 05 — l'activation se lit aussi sur le tracé, pas sur la couleur seule. */
.constellation-edges line.is-path[data-e086-segment="inactif"]{
  stroke-dasharray:3 3;opacity:.45;
}
/* chantier 09 — invalidation visible sans dépendre d'une teinte. */
.constellation-field[data-e086-invalide="true"]{
  outline:1px dashed rgba(230,185,111,.28);outline-offset:-2px;
}
/* chantier 10 — mouvement réduit : aucune transition sur le trait ni le panneau. */
.e086-calm .constellation-edges line.is-path,
.e086-calm .e086-miroir,
.e086-calm .e086-reset{transition:none;}
@media (prefers-reduced-motion:reduce){
  .constellation-edges line.is-path,.e086-miroir,.e086-reset{
    transition:none!important;animation:none!important;
  }
}
`);

    const champ = layout.querySelector('.constellation-field');
    if (!champ) return;
    const edges = layout.querySelector('.constellation-edges');

    const soleils = Array.from(layout.querySelectorAll('.const-sun'));
    const planetes = Array.from(layout.querySelectorAll('.const-planet'));
    const lunes = Array.from(layout.querySelectorAll('.const-moon'));
    const segments = edges ? Array.from(edges.querySelectorAll('line.is-path')) : [];
    const soleil = actifPar(soleils);
    const planete = actifPar(planetes);
    const lune = actifPar(lunes);
    const longueurTotale = segments.reduce((somme, trait) => somme + longueurDe(trait), 0);
    etat.rendus += 1;

    /* E086-01 — Instantané figé : une seule lecture des trois familles de
     * nœuds, puis publication d'une empreinte immuable sur le champ. */
    const instantane = Object.freeze({
      ere: cleDe(soleil),
      repere: cleDe(planete),
      point: cleDe(lune),
      segments: segments.length,
      soleils: soleils.length,
      planetes: planetes.length,
      lunes: lunes.length,
    });
    sansEchec(() => {
      champ.dataset.e086Snapshot = `${instantane.ere}/${instantane.repere}/${instantane.point}`;
      champ.dataset.e086Comptage =
        `${instantane.soleils}:${instantane.planetes}:${instantane.lunes}:${instantane.segments}`;
    });

    /* E086-02 — Clé d'identité déterministe : la concaténation des trois clés
     * actives identifie sans ambiguïté l'état courant du chemin. */
    const cleChemin = `${instantane.ere}|${instantane.repere}|${instantane.point}`;
    sansEchec(() => {
      champ.dataset.e086Cle = cleChemin;
      if (edges) edges.dataset.e086Cle = cleChemin;
    });

    /* E086-03 — Détection de transition : comparaison avec la clé mémorisée
     * au rendu précédent et comptage des changements d'état. */
    const transition = etat.clePrecedente === null
      ? 'initial'
      : (etat.clePrecedente === cleChemin ? 'stable' : 'changement');
    if (transition === 'changement') etat.transitions += 1;
    etat.clePrecedente = cleChemin;
    sansEchec(() => {
      champ.dataset.e086Transition = transition;
      champ.dataset.e086Transitions = String(etat.transitions);
    });

    /* E086-04 — Métadonnées géométriques calculées une fois par segment :
     * identifiant, extrémités et longueur euclidienne en unités de viewBox. */
    sansEchec(() => {
      segments.forEach((trait, index) => {
        const x1 = nombre(trait.getAttribute('x1'));
        const y1 = nombre(trait.getAttribute('y1'));
        const x2 = nombre(trait.getAttribute('x2'));
        const y2 = nombre(trait.getAttribute('y2'));
        trait.dataset.e086SegmentId = `e086-seg-${index + 1}`;
        trait.dataset.e086Debut = `${x1.toFixed(2)},${y1.toFixed(2)}`;
        trait.dataset.e086Fin = `${x2.toFixed(2)},${y2.toFixed(2)}`;
        trait.dataset.e086Longueur = longueurDe(trait).toFixed(2);
      });
    });

    /* E086-05 — État d'activation dérivé : la classe .is-active est l'unique
     * source de vérité ; elle pilote la chaîne et le marquage des segments. */
    const chaine = `${soleil ? 1 : 0}${planete ? 1 : 0}${lune ? 1 : 0}`;
    sansEchec(() => {
      champ.dataset.e086Chaine = chaine;
      segments.forEach((trait) => {
        const estLune = trait.classList.contains('is-moon');
        const actif = estLune ? Boolean(lune) : Boolean(planete);
        trait.dataset.e086Segment = actif ? 'actif' : 'inactif';
        trait.dataset.e086Axe = estLune ? 'repere-point' : 'ere-repere';
      });
      const actifs = segments.filter((trait) => trait.dataset.e086Segment === 'actif').length;
      champ.dataset.e086SegmentsActifs = String(actifs);
    });

    /* E086-06 — Miroir d'état : panneau textuel inséré avant la légende, avec
     * région live, valeurs publiées et écouteur délégué mémorisant l'action. */
    const miroir = miroirDans(layout, make);
    sansEchec(() => {
      ecrire(miroir, 'e086-valeur-ere', libelleDe(soleil) || 'aucune ère active');
      ecrire(miroir, 'e086-valeur-repere', libelleDe(planete) || 'aucun repère actif');
      ecrire(miroir, 'e086-valeur-point', libelleDe(lune) || 'aucun point actif');
      ecrire(miroir, 'e086-valeur-segments', `${segments.length} segment(s) · chaîne ${chaine}`);
      ecrire(miroir, 'e086-valeur-longueur', `${longueurTotale.toFixed(1)} unités`);
      ecrire(miroir, LIVE_ID, `Chemin actif : ${cleChemin} (${transition}).`);
      if (champ.dataset.e086Listener !== 'pose') {
        champ.dataset.e086Listener = 'pose';
        champ.addEventListener('click', (evenement) => {
          sansEchec(() => {
            const cible = evenement && evenement.target;
            const noeud = cible && cible.nodeType === 1 && typeof cible.closest === 'function'
              ? cible.closest('[data-const-key]') : null;
            if (!noeud || !champ.contains(noeud)) return;
            champ.dataset.e086DerniereAction = noeud.dataset.constKey || '';
          });
        });
      }
    });

    /* E086-07 — Journal borné : au plus huit états conservés entre deux rendus,
     * publiés comme compteur et dans la ligne « Historique » du miroir. */
    if (transition !== 'stable' || etat.rendus === 1) {
      etat.historique.push(`${transition}:${cleChemin}`);
      if (etat.historique.length > MAX_HISTORIQUE) etat.historique.shift();
    }
    sansEchec(() => {
      champ.dataset.e086Historique = String(etat.historique.length);
      ecrire(miroir, 'e086-valeur-historique',
        `${etat.historique.length} entrée(s) · ${MAX_HISTORIQUE} au maximum`);
    });

    /* E086-08 — Mémoire du premier état et restauration sur demande : les clés
     * initiales sont figées puis rejouées par le bouton du miroir. */
    if (!etat.clesInitiales) {
      etat.clesInitiales = Object.freeze({
        ere: cleDe(soleil),
        repere: cleDe(planete),
        point: cleDe(lune),
      });
      etat.cleInitiale = cleChemin;
    }
    sansEchec(() => {
      champ.dataset.e086Initial = etat.cleInitiale || '';
      const bouton = miroir && miroir.querySelector('#' + BOUTON_ID);
      if (!bouton) return;
      bouton.disabled = !etat.clesInitiales.ere;
      bouton.setAttribute('aria-label',
        `Revenir au chemin initial : ${etat.cleInitiale || 'indisponible'}`);
      bouton.addEventListener('click', () => sansEchec(() => restaurer(layout, champ)));
    });

    /* E086-09 — Invalidation contrôlée : un numéro de génération distingue les
     * rendus et marque la génération courante comme périmée après un changement
     * de clé, sans horloge ni comparaison de date. */
    etat.generation += 1;
    const generation = String(etat.generation);
    const invalide = transition === 'changement' ? 'true' : 'false';
    sansEchec(() => {
      champ.dataset.e086Generation = generation;
      champ.dataset.e086Invalide = invalide;
      if (edges) edges.dataset.e086Generation = generation;
      segments.forEach((trait) => {
        trait.dataset.e086Generation = generation;
        if (invalide === 'true') trait.removeAttribute('data-e086-ancre');
        else trait.setAttribute('data-e086-ancre', 'courant');
      });
    });

    /* E086-10 — Mouvement réduit : la préférence fournie par le contexte active
     * le mode sobre ; l'information reste portée par le texte et les attributs,
     * jamais par la seule couleur ni par le seul mouvement. */
    const sobre = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
    sansEchec(() => {
      champ.classList.toggle('e086-calm', Boolean(sobre));
      if (miroir) miroir.classList.toggle('e086-calm', Boolean(sobre));
      champ.dataset.e086Sobre = sobre ? 'oui' : 'non';
    });
  } catch { /* greffon tolérant : aucune exception ne remonte au rendu */ }
});
