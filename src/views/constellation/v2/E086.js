import { register } from './registry.js';

/* Lentille V2 E086 — audit déterministe du chemin de connexion de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau, sans source aléatoire et sans minuteur ni boucle propre.
   Préfixe exclusif : v2e086 (aucune collision avec la passe 1). */

const FICHE_ID = 'v2e086-fiche';
const SEUIL = 0.5; /* unités de viewBox : écart maximal toléré sur un trait */

/* Mémoire entre rendus : sert uniquement au calcul du delta (chantier 08). */
const memoire = { cles: null };

/* Lecture tolérante d'un nombre : toute valeur invalide devient zéro. */
function nombre(valeur) {
  const resultat = parseFloat(valeur);
  return Number.isFinite(resultat) ? resultat : 0;
}

/* Coordonnée d'un nœud depuis ses variables CSS --x / --y (pourcentage). */
function positionDe(noeud) {
  if (!noeud || !noeud.style) return null;
  const x = parseFloat(noeud.style.getPropertyValue('--x'));
  const y = parseFloat(noeud.style.getPropertyValue('--y'));
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

/* Distance euclidienne entre deux points du repère de la viewBox. */
function distance(a, b) {
  if (!a || !b) return Infinity;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/* Extrémités d'un segment SVG, lues une seule fois sur ses attributs. */
function debutDe(trait) {
  return { x: nombre(trait.getAttribute('x1')), y: nombre(trait.getAttribute('y1')) };
}

function finDe(trait) {
  return { x: nombre(trait.getAttribute('x2')), y: nombre(trait.getAttribute('y2')) };
}

/* Longueur d'un trait en unités de viewBox. */
function longueurDe(trait) {
  return distance(debutDe(trait), finDe(trait));
}

/* Huit secteurs de 45°. L'axe des y du SVG pointe vers le bas :
   un dy positif correspond donc au Sud, pas au Nord. */
const DIRECTIONS = ['Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest', 'Nord', 'Nord-Est'];

function cardinal(dx, dy) {
  const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
  return DIRECTIONS[Math.round(angle / 45) % 8];
}

/* Empreinte FNV-1a sur 32 bits, rendue en huit caractères hexadécimaux.
   Fonction pure : une même entrée donne toujours la même sortie. */
function empreinte(texte) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i += 1) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/* Exécution silencieuse : un chantier défaillant n'interrompt pas les suivants. */
function sansEchec(action) {
  try { action(); } catch { /* neutralisation silencieuse, sans journal */ }
}

/* Construit la fiche d'audit une seule fois, avec repli sur un DOM incomplet. */
function ficheDans(layout, make) {
  const existante = layout.querySelector('#' + FICHE_ID);
  if (existante) return existante;
  const residu = document.getElementById(FICHE_ID);
  if (residu && residu.parentNode) residu.parentNode.removeChild(residu);

  const fiche = make('section', 'v2e086-fiche');
  fiche.id = FICHE_ID;
  fiche.setAttribute('aria-labelledby', 'v2e086-titre');

  const titre = make('h3', 'v2e086-titre', 'Fiche d’audit du chemin (V2)');
  titre.id = 'v2e086-titre';
  fiche.appendChild(titre);

  const lignes = [
    ['v2e086-hash', 'Empreinte'],
    ['v2e086-description', 'Description'],
    ['v2e086-progression', 'Progression'],
    ['v2e086-ratio', 'Longueur'],
    ['v2e086-orientation', 'Orientation'],
    ['v2e086-continuite', 'Continuité'],
    ['v2e086-coherence', 'Cohérence'],
    ['v2e086-index', 'Registre'],
    ['v2e086-degrade', 'État'],
  ];
  lignes.forEach(([id, libelle]) => {
    const ligne = make('p', 'v2e086-ligne');
    ligne.appendChild(make('span', 'v2e086-nom', libelle + ' : '));
    const valeur = make('span', 'v2e086-valeur', '—');
    valeur.id = id;
    ligne.appendChild(valeur);
    fiche.appendChild(ligne);
  });

  const delta = make('p', 'v2e086-sr', '');
  delta.id = 'v2e086-delta-live';
  delta.setAttribute('role', 'status');
  delta.setAttribute('aria-live', 'polite');
  delta.setAttribute('aria-atomic', 'true');
  fiche.appendChild(delta);

  const caption = layout.querySelector('.constellation-caption');
  if (caption && caption.parentNode) caption.parentNode.insertBefore(fiche, caption);
  else if (layout.appendChild) layout.appendChild(fiche);
  return fiche;
}

register('E086', ctx => {
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique : aucune transition n'est introduite, donc aucun mouvement
     à neutraliser. L'information est toujours portée par le texte. */
  css('constellation-v2-e086', `
.v2e086-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.constellation-layout .v2e086-fiche{
  margin:12px 0 0;padding:10px 12px;border:1px solid var(--line);border-radius:8px;
  background:var(--surface-2);color:var(--muted);font-family:inherit;font-size:10px;
  line-height:1.5;contain:layout style paint;
}
.v2e086-fiche .v2e086-titre{
  margin:0 0 6px;color:var(--gold);font-family:var(--serif);
  font-size:12px;font-weight:450;
}
.v2e086-fiche .v2e086-ligne{margin:2px 0;}
.v2e086-fiche .v2e086-nom{color:var(--gold);}
.v2e086-fiche .v2e086-valeur{color:var(--ink-soft);font-variant-numeric:tabular-nums;}
.v2e086-fiche .v2e086-barre{
  height:4px;min-width:0;margin:4px 0 6px;border-radius:2px;background:var(--gold);
}
@media (prefers-reduced-motion:reduce){.v2e086-fiche,.v2e086-barre{transition:none!important;animation:none!important}}
`);

  const champ = layout.querySelector('.constellation-field');
  if (!champ) return;
  const edges = layout.querySelector('.constellation-edges');

  const make = typeof ctx.el === 'function'
    ? (tag, cls, txt) => ctx.el(tag, cls, txt)
    : (tag, cls, txt) => {
        const noeud = document.createElement(tag);
        if (cls) noeud.className = cls;
        if (txt !== undefined) noeud.textContent = txt;
        return noeud;
      };

  const actif = liste => liste.find(noeud => noeud.classList.contains('is-active')) || null;
  const libelle = noeud => noeud
    ? String(noeud.dataset.label || noeud.getAttribute('aria-label') || '') : '';

  const soleils = Array.from(layout.querySelectorAll('.const-sun'));
  const planetes = Array.from(layout.querySelectorAll('.const-planet'));
  const lunes = Array.from(layout.querySelectorAll('.const-moon'));
  const soleil = actif(soleils);
  const planete = actif(planetes);
  const lune = actif(lunes);
  const segments = edges ? Array.from(edges.querySelectorAll('line.is-path')) : [];
  const duRepere = segments.filter(trait => !trait.classList.contains('is-moon'));
  const duPoint = segments.filter(trait => trait.classList.contains('is-moon'));
  const longueurTotale = segments.reduce((somme, trait) => somme + longueurDe(trait), 0);

  const cleParts = [soleil, planete, lune]
    .map(noeud => (noeud && noeud.dataset ? noeud.dataset.constKey || '' : ''));
  const cle = cleParts.join('|');

  const fiche = ficheDans(layout, make);
  const ecrire = (id, texte) => {
    const noeud = fiche && fiche.querySelector('#' + id);
    if (noeud) noeud.textContent = texte;
  };

  /* E086-01 — Empreinte de contrôle : FNV-1a déterministe calculée sur la clé
   * du chemin et les longueurs arrondies des segments, sans aucune graine
   * aléatoire. Deux états identiques produisent toujours la même valeur. */
  sansEchec(() => {
    const base = `${cle}|${segments.map(trait => longueurDe(trait).toFixed(2)).join(',')}`;
    const valeur = empreinte(base);
    champ.dataset.v2e086Hash = valeur;
    ecrire('v2e086-hash', `${valeur} — empreinte FNV-1a sur la clé et les longueurs`);
  });

  /* E086-02 — Description lisible : une phrase française enchaîne les trois
   * étapes actives. Elle est ajoutée sans écraser l'aria-describedby existant
   * de la passe 1 ni lever l'aria-hidden du calque SVG décoratif. */
  sansEchec(() => {
    const etapes = [libelle(soleil), libelle(planete), libelle(lune)].filter(Boolean);
    const description = etapes.length
      ? `Chemin : ${etapes.join(' → ')}.` : 'Chemin : aucune étape active.';
    ecrire('v2e086-description', description);
    if (edges) edges.setAttribute('data-v2e086-description', description);
    const decrits = (champ.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (decrits.indexOf('v2e086-description') === -1) {
      decrits.push('v2e086-description');
      champ.setAttribute('aria-describedby', decrits.join(' '));
    }
  });

  /* E086-03 — Complétude du chemin : une barre ARIA valuenow entre 0 et 3,
   * doublée d'un texte explicite. Le chiffre est complété par aria-valuetext
   * pour ne jamais reposer sur la seule longueur visuelle de la barre. */
  sansEchec(() => {
    const etapes = [soleil, planete, lune].filter(Boolean).length;
    let barre = fiche && fiche.querySelector('#v2e086-barre');
    if (!barre && fiche) {
      barre = make('div', 'v2e086-barre');
      barre.id = 'v2e086-barre';
      barre.setAttribute('role', 'progressbar');
      barre.setAttribute('aria-label', 'Complétude du chemin');
      barre.setAttribute('aria-valuemin', '0');
      barre.setAttribute('aria-valuemax', '3');
      fiche.appendChild(barre);
    }
    if (barre) {
      barre.setAttribute('aria-valuenow', String(etapes));
      barre.setAttribute('aria-valuetext',
        `${etapes} étape${etapes > 1 ? 's' : ''} sur 3 renseignée${etapes > 1 ? 's' : ''}`);
      barre.style.width = `${(etapes / 3) * 100}%`;
    }
    champ.dataset.v2e086Progression = `${etapes}/3`;
    ecrire('v2e086-progression', etapes === 3
      ? 'Chemin complet : 3 étapes sur 3.'
      : `Chemin partiel : ${etapes} étape${etapes > 1 ? 's' : ''} sur 3.`);
  });

  /* E086-04 — Longueur référencée : la somme des traits est comparée à la
   * diagonale de la viewBox lue sur l'attribut réel du SVG, pas à une constante
   * codée en dur. Le pourcentage et sa référence sont publiés ensemble. */
  sansEchec(() => {
    const vb = edges
      ? String(edges.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(nombre) : [];
    const largeur = vb.length >= 4 ? vb[2] : 100;
    const hauteur = vb.length >= 4 ? vb[3] : 100;
    const diagonale = Math.sqrt(largeur * largeur + hauteur * hauteur) || 1;
    const pourcentage = (longueurTotale / diagonale) * 100;
    champ.dataset.v2e086Diagonale = diagonale.toFixed(2);
    champ.dataset.v2e086Ratio = `${pourcentage.toFixed(1)}%`;
    ecrire('v2e086-ratio',
      `${longueurTotale.toFixed(1)} unités de chemin, soit ${pourcentage.toFixed(1)} % de la diagonale de référence (${diagonale.toFixed(2)} unités).`);
  });

  /* E086-05 — Orientation des traits : l'angle de chaque segment est converti
   * en huit directions cardinales, complété par son ordre dans la chaîne.
   * L'information est textuelle et ajoutée aux attributs des traits. */
  sansEchec(() => {
    const orientations = segments.map((trait, index) => {
      const dx = nombre(trait.getAttribute('x2')) - nombre(trait.getAttribute('x1'));
      const dy = nombre(trait.getAttribute('y2')) - nombre(trait.getAttribute('y1'));
      const direction = cardinal(dx, dy);
      trait.dataset.v2e086Orientation = direction;
      trait.dataset.v2e086Ordre = String(index + 1);
      return `${index + 1}:${direction}`;
    });
    champ.dataset.v2e086Orientations = orientations.join(',');
    ecrire('v2e086-orientation', orientations.length
      ? `Segments (ordre, direction) : ${orientations.join(' ; ')}.`
      : 'Aucun segment de chemin à orienter.');
  });

  /* E086-06 — Continuité topologique : la fin du trait ère→repère doit
   * rejoindre le début du trait repère→point à moins du seuil. Le résultat est
   * binaire et vérifiable par simple lecture d'attribut. */
  sansEchec(() => {
    const a = duRepere[0];
    const b = duPoint[0];
    let etat;
    if (!a || !b) {
      etat = 'non-evaluable';
    } else {
      const ecart = distance(finDe(a), debutDe(b));
      champ.dataset.v2e086EcartJonction = ecart.toFixed(2);
      etat = ecart <= SEUIL ? 'continue' : 'discontinue';
    }
    champ.dataset.v2e086Continuite = etat;
    ecrire('v2e086-continuite', etat === 'continue'
      ? `Jonction continue : les deux traits se rejoignent (écart ≤ ${SEUIL} unité).`
      : etat === 'discontinue'
        ? 'Jonction discontinue : les deux traits ne se rejoignent pas.'
        : 'Continuité non évaluable : un des deux traits manque.');
  });

  /* E086-07 — Cohérence géométrie ↔ sélection : les extrémités des traits sont
   * comparées aux positions --x/--y des nœuds actifs. Un écart au-delà du seuil
   * signale un chemin dessiné qui ne suit plus la sélection courante. */
  sansEchec(() => {
    const pSoleil = positionDe(soleil);
    const pPlanete = positionDe(planete);
    const pLune = positionDe(lune);
    const ecarts = [];
    if (duRepere[0] && pSoleil && pPlanete) {
      ecarts.push(distance(debutDe(duRepere[0]), pSoleil));
      ecarts.push(distance(finDe(duRepere[0]), pPlanete));
    }
    if (duPoint[0] && pPlanete && pLune) {
      ecarts.push(distance(debutDe(duPoint[0]), pPlanete));
      ecarts.push(distance(finDe(duPoint[0]), pLune));
    }
    const ecartMax = ecarts.length ? Math.max.apply(null, ecarts) : Infinity;
    const coherent = ecarts.length > 0 && ecartMax <= SEUIL;
    champ.dataset.v2e086EcartMax = Number.isFinite(ecartMax) ? ecartMax.toFixed(2) : 'indisponible';
    champ.dataset.v2e086Coherence = coherent ? 'coherent' : (ecarts.length ? 'incoherent' : 'non-evaluable');
    ecrire('v2e086-coherence', coherent
      ? `Géométrie cohérente : les traits suivent les nœuds actifs (écart maximal ${ecartMax.toFixed(2)} unité).`
      : `Écart maximal ${Number.isFinite(ecartMax) ? ecartMax.toFixed(2) : 'indisponible'} unité entre traits et nœuds actifs (seuil ${SEUIL}).`);
  });

  /* E086-08 — Delta de changement : une région live distincte de celle de la
   * passe 1 annonce précisément quelle étape a varié entre deux rendus. La
   * différence est calculée sur les clés mémorisées, sans écouteur ni horloge. */
  sansEchec(() => {
    const precedents = memoire.cles;
    const noms = ['ère', 'repère', 'point'];
    const variations = precedents
      ? cleParts.reduce((liste, valeur, index) => {
          if (precedents[index] !== valeur) {
            liste.push(`${noms[index]} : ${precedents[index] || 'aucun'} → ${valeur || 'aucun'}`);
          }
          return liste;
        }, [])
      : [];
    const message = !precedents ? 'État initial enregistré.'
      : variations.length ? `Changement : ${variations.join(' ; ')}.`
        : 'Aucun changement d’état.';
    memoire.cles = cleParts.slice();
    champ.dataset.v2e086Delta = variations.join('|');
    const delta = fiche && fiche.querySelector('#v2e086-delta-live');
    if (delta) delta.textContent = message;
  });

  /* E086-09 — Registre des nœuds : chaque clé est classée par rôle (ère,
   * repère ou point) dans une table déterministe, avec son comptage. Cela
   * permet de vérifier qu'une clé du chemin référence bien un nœud rendu. */
  sansEchec(() => {
    const registre = [];
    const ajouter = (liste, role) => liste.forEach(noeud => {
      const cleNoeud = noeud && noeud.dataset ? noeud.dataset.constKey || '' : '';
      if (cleNoeud) registre.push(`${cleNoeud}=${role}`);
    });
    ajouter(soleils, 'ère');
    ajouter(planetes, 'repère');
    ajouter(lunes, 'point');
    champ.dataset.v2e086Index = registre.join(';');
    champ.dataset.v2e086IndexComptage =
      `${soleils.length}:${planetes.length}:${lunes.length}`;
    ecrire('v2e086-index', `${registre.length} nœuds répertoriés (clé=rôle) : ${registre.slice(0, 8).join(' · ')}${registre.length > 8 ? ' …' : ''}.`);
  });

  /* E086-10 — Signalement d'état dégradé : toute donnée absente est nommée
   * explicitement en français. Les autres chantiers restent actifs et lisibles,
   * ce qui rend le repli observable sans casser le rendu de la vue. */
  sansEchec(() => {
    const manquants = [];
    if (!soleil) manquants.push('ère active');
    if (!planete) manquants.push('repère actif');
    if (!lune) manquants.push('point actif');
    if (!edges) manquants.push('calque SVG');
    if (!segments.length) manquants.push('segment de chemin');
    const degrade = manquants.length > 0;
    champ.dataset.v2e086Degrade = degrade ? 'true' : 'false';
    ecrire('v2e086-degrade', degrade
      ? `Chemin incomplet : ${manquants.join(', ')} absent${manquants.length > 1 ? 's' : ''}. Les autres chantiers restent actifs.`
      : 'Chemin complet : toutes les données attendues sont présentes.');
  });
});
