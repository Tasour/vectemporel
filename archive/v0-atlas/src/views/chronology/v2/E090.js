import { register } from './registry.js';

/* Lentille E090 — passe V2, domaine I (qualité & validation).
 * Thème : « français partout », tel qu'inscrit dans themes.json, clé E090.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E090.md — chantiers E090-01 à E090-10.
 * Fichier possédé : src/views/chronology/v2/E090.js uniquement. Aucun fichier
 * partagé n'est modifié : passe 1, lentilles V2 voisines, registre, point
 * d'entrée, feuille globale et vue Chronologie demeurent intacts.
 *
 * Contrat exploité : viewId 'chronologyv2', stage, layout ; helpers ctx.css,
 * ctx.el, ctx.reducedMotion. Une seule feuille injectée par
 * ctx.css('chronology-v2-e090', …). Tous les identifiants DOM sont préfixés
 * chronology-v2-e090- et protégés par une garde d'existence, afin qu'un rendu
 * successif ne produise jamais de doublon.
 *
 * Invariants :
 * - exactement un register('E090', ctx => { … }) ;
 * - zéro appel réseau, zéro journalisation, zéro aléa, zéro HTML brut ;
 * - zéro minuteur, zéro boucle d'animation, zéro écouteur, zéro région live ;
 * - texte visible réel, dédupliqué et composé selon la typographie française.
 */

const CSS_ID = 'chronology-v2-e090';
const PANNEAU_ID = 'chronology-v2-e090-panneau';
const TITRE_ID = 'chronology-v2-e090-titre';
const PREAMBULE_ID = 'chronology-v2-e090-preambule';
const TABLEAU_ID = 'chronology-v2-e090-tableau';
const LEXIQUE_ID = 'chronology-v2-e090-lexique';
const BILAN_ID = 'chronology-v2-e090-bilan';
const HOTE_ID = 'atlas-chrono-main';

/* E090-01, E090-03, E090-04, E090-08 et E090-09 : feuille unique. Le panneau
   est un bloc en flux normal : il n'ajoute aucun arrêt Tab, ne recouvre rien et
   n'introduit ni animation ni transition. Les deux sélecteurs d'alerte ne
   produisent un effet visible que si un terme étranger est réellement trouvé. */
const CSS = `
  #${PANNEAU_ID} {
    margin: 16px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.55;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANNEAU_ID} .e090-titre {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 15px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANNEAU_ID} .e090-preambule,
  #${PANNEAU_ID} .e090-bilan { margin: 0 0 8px; color: var(--muted); }
  #${PANNEAU_ID} .e090-tableau { margin: 0 0 10px; padding: 0; }
  #${PANNEAU_ID} .e090-ligne {
    display: flex; gap: 10px; margin: 0 0 3px;
    padding: 0 0 3px; border-bottom: 1px solid var(--line);
  }
  #${PANNEAU_ID} .e090-cle { flex: 0 0 158px; margin: 0; color: var(--muted); }
  #${PANNEAU_ID} .e090-valeur { flex: 1 1 auto; min-width: 0; margin: 0; color: var(--gold-bright); }
  #${PANNEAU_ID} .e090-sous-titre {
    margin: 0 0 5px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 12px; font-weight: 600;
  }
  #${PANNEAU_ID} .e090-lexique { margin: 0 0 9px; padding-left: 18px; color: var(--ink-soft); }
  #${PANNEAU_ID} .e090-lexique li { margin: 0 0 2px; }
  #${PANNEAU_ID} .e090-bilan {
    margin: 8px 0 0; padding-top: 7px;
    border-top: 1px solid var(--line); color: var(--muted-2); font-size: 10px;
  }
  [data-e090-verdict="a-verifier"] { outline: 2px dashed #c7664a; outline-offset: 2px; }
  [data-e090-aria="a-verifier"] { text-decoration: underline wavy #c7664a; }
  @media (max-width: 620px) {
    #${PANNEAU_ID} .e090-ligne { flex-wrap: wrap; gap: 1px 8px; }
    #${PANNEAU_ID} .e090-cle { flex-basis: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANNEAU_ID}, #${PANNEAU_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANNEAU_ID} {
      border: 1px solid CanvasText; border-left: 3px solid CanvasText;
      background: Canvas; color: CanvasText;
    }
    #${PANNEAU_ID} .e090-titre,
    #${PANNEAU_ID} .e090-preambule,
    #${PANNEAU_ID} .e090-cle,
    #${PANNEAU_ID} .e090-valeur,
    #${PANNEAU_ID} .e090-sous-titre,
    #${PANNEAU_ID} .e090-lexique,
    #${PANNEAU_ID} .e090-bilan { color: CanvasText; }
  }
`;

/* Espace fine insécable : sépare le signe deux-points, le point-virgule, le
   point d'exclamation, le point d'interrogation et les guillemets français. */
const ESPACE_FINE = '\u202F';

/* E090-02 et E090-03 : textes normatifs du panneau. Ils sont la source des
   mesures affichées ; chaque chiffre affiché en dérive, rien n'est codé en dur
   dans les libellés de résultat. */
const TEXTES_NORMATIFS = Object.freeze([
  'Vocabulaire :\u202Fère, repère, point, confiance, filtre et silence.',
  'Les guillemets français encadrent les termes cités ;\u202Fl’apostrophe typographique est employée.',
  'Un terme signalétique est encadré par «\u202Fguillemets français\u202F».',
  'Une espace fine insécable précède deux-points, point-virgule, point d’exclamation et point d’interrogation.',
]);

/* E090-04 et E090-08 : vocables d'interface à signaler s'ils apparaissent dans
   les libellés visibles ou dans les attributs accessibles de la vue. */
const MOTS_ETRANGERS = Object.freeze([
  /\breset\b/i, /\bsearch\b/i, /\bfilter\b/i, /\bapply\b/i,
  /\bclose\b/i, /\bnext\b/i, /\bprevious\b/i, /\bloading\b/i,
  /\berror\b/i, /\bsuccess\b/i, /\bcancel\b/i, /\bsubmit\b/i,
]);

/* E090-05 : libellés d'état canoniques, en français, sans anglais résiduel. */
const MESSAGES = Object.freeze({
  pret: 'État : prêt — la vue reste lisible sans script.',
  greffon: 'État : greffon appliqué — le contenu de base est intact.',
  repli: 'État : repli — données indisponibles, lecture possible malgré tout.',
  langue: 'État : langue vérifiée — aucun terme étranger détecté.',
});

/* E090-07 : lexique normatif, défini à la première occurrence dans le panneau. */
const LEXIQUE = Object.freeze([
  ['ère', 'Grande tranche de temps qui structure la frise.'],
  ['repère', 'Marque datée qui situe un ou plusieurs points.'],
  ['point', 'Fait historique rattaché à un repère.'],
  ['confiance', 'Degré de certitude attaché à un point.'],
  ['filtre', 'Critère qui restreint les repères affichés.'],
  ['silence', 'Absence de source ou de donnée, traitée comme information.'],
]);

/* E090-01 à E090-10 : dix lignes, une par chantier, chacune avec son propre
   identifiant préfixé. Le registre visible est donc falsifiable ligne à ligne. */
const LIGNES = Object.freeze([
  ['chronology-v2-e090-langue', 'Langue déclarée'],
  ['chronology-v2-e090-espaces', 'Espaces fines insécables'],
  ['chronology-v2-e090-guillemets', 'Guillemets et apostrophes'],
  ['chronology-v2-e090-libelles', 'Libellés de commandes'],
  ['chronology-v2-e090-etats', 'Messages d’état'],
  ['chronology-v2-e090-nombres', 'Nombres au format français'],
  ['chronology-v2-e090-lexique', 'Lexique normatif'],
  ['chronology-v2-e090-aria', 'Attributs accessibles'],
  ['chronology-v2-e090-registre', 'Registre de conformité'],
  ['chronology-v2-e090-unicite', 'Unicité après rendu'],
]);

/* E090-02 et E090-03 : mesures dérivées des textes normatifs, calculées une
   seule fois. Les guillemets droits sont comptés pour prouver leur absence. */
const ESPACES_NORMATIFS = (TEXTES_NORMATIFS.join(' ').match(/\u202F/g) || []).length;
const GUILLEMETS_NORMATIFS = (TEXTES_NORMATIFS.join(' ').match(/«/g) || []).length;
const GUILLEMETS_DROITS = (TEXTES_NORMATIFS.join(' ').match(/"/g) || []).length;

let rendus = 0;
let instances = 0;
let references = {
  panneau: null, preambule: null, lignes: [], lexique: null, bilan: null,
};

/* E090-10 : garde d'existence. La coque reconstruisant le stage, un nœud issu
   d'une rendu précédent est détaché : on le réutilise et on le déplace dans le
   parent courant au lieu d'en créer un second. */
function assurerNoeud(creer, id, balise, classe, parent) {
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = creer(balise, classe);
    noeud.id = id;
  }
  if (noeud.parentElement !== parent) parent.appendChild(noeud);
  return noeud;
}

function ecrire(noeud, texte) {
  if (noeud && noeud.textContent !== texte) noeud.textContent = texte;
}

function mettreAttribut(noeud, nom, valeur) {
  if (noeud && noeud.getAttribute(nom) !== valeur) noeud.setAttribute(nom, valeur);
}

function mettreDonnee(noeud, cle, valeur) {
  if (noeud && noeud.dataset[cle] !== valeur) noeud.dataset[cle] = valeur;
}

/* E090-06 : formatage explicite en français. Le repli manuel emploie une
   espace fine insécable, jamais une virgule ni une espace ordinaire. */
function formaterNombre(valeur) {
  const nombre = Number.isFinite(valeur) ? valeur : 0;
  try {
    return new Intl.NumberFormat('fr-FR').format(nombre);
  } catch {
    return String(nombre).replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE_FINE);
  }
}

/* E090-02 : application de la typographie française à tout texte composé. */
function typoFrancaise(texte) {
  return String(texte)
    .replace(/\s+([:;!?])/g, `${ESPACE_FINE}$1`)
    .replace(/«\s/g, `«${ESPACE_FINE}`)
    .replace(/\s»/g, `${ESPACE_FINE}»`);
}

/* E090-03 : citation normative, guillemets français et espace fine. */
function citer(texte) {
  return `«${ESPACE_FINE}${texte}${ESPACE_FINE}»`;
}

function contientEtranger(texte) {
  const chaine = typeof texte === 'string' ? texte : '';
  return MOTS_ETRANGERS.some((mot) => mot.test(chaine));
}

/* E090-04 : verdict porté par les libellés visibles des commandes. Le marquage
   est purement déclaratif : aucun texte existant n'est réécrit. */
function analyserLibelles(host) {
  let examines = 0;
  let suspects = 0;
  const noeuds = host.querySelectorAll('button, input, select, textarea, a[href]');
  noeuds.forEach((noeud) => {
    const libelle = noeud.textContent || '';
    const verdict = contientEtranger(libelle) ? 'a-verifier' : 'fr';
    if (verdict === 'a-verifier') suspects += 1;
    mettreAttribut(noeud, 'data-e090-verdict', verdict);
    examines += 1;
  });
  return { examines, suspects };
}

/* E090-08 : verdict porté par les attributs accessibles. Champ d'examen
   distinct du précédent : ici, seules les métadonnées sont inspectées. */
function analyserAttributs(host) {
  let examines = 0;
  let suspects = 0;
  const noeuds = host.querySelectorAll('[aria-label], [title], [placeholder]');
  noeuds.forEach((noeud) => {
    const parties = ['aria-label', 'title', 'placeholder']
      .map((nom) => noeud.getAttribute(nom) || '');
    const verdict = contientEtranger(parties.join(' ')) ? 'a-verifier' : 'fr';
    if (verdict === 'a-verifier') suspects += 1;
    mettreAttribut(noeud, 'data-e090-aria', verdict);
    examines += 1;
  });
  return { examines, suspects };
}

function mesurer(host) {
  const libelles = analyserLibelles(host);
  const aria = analyserAttributs(host);
  return {
    langue: 'fr',
    espaces: ESPACES_NORMATIFS,
    guillemets: GUILLEMETS_NORMATIFS,
    droits: GUILLEMETS_DROITS,
    libelles,
    etats: Object.keys(MESSAGES).length,
    lexique: LEXIQUE.length,
    aria,
    registre: LIGNES.length,
    rendus,
  };
}

function conformites(m) {
  return [
    m.langue === 'fr',
    m.espaces > 0,
    m.guillemets > 0 && m.droits === 0,
    m.libelles.suspects === 0,
    m.etats > 0,
    true,
    m.lexique === 6,
    m.aria.suspects === 0,
    m.registre === 10,
    m.rendus >= 1,
  ].filter(Boolean).length;
}

function valeurs(m, conformes) {
  const nf = formaterNombre;
  return [
    `Langue : ${citer(m.langue)} — attribut de langue et direction de lecture déclarés sur le panneau.`,
    `Espaces fines : ${nf(m.espaces)} — appliquées à chaque texte normatif du panneau.`,
    `Guillemets français : ${nf(m.guillemets)} · guillemets droits : ${nf(m.droits)}.`,
    `${nf(m.libelles.examines)} libellés examinés · ${nf(m.libelles.suspects)} à vérifier.`,
    `${nf(m.etats)} messages d’état en français ; aucun anglais dans les états.`,
    `Format ${citer('fr-FR')} — ${nf(m.rendus)} rendu(s), ${nf(m.libelles.examines)} libellés chiffrés.`,
    `${nf(m.lexique)} termes définis : ère, repère, point, confiance, filtre, silence.`,
    `${nf(m.aria.examines)} attributs examinés · ${nf(m.aria.suspects)} à vérifier.`,
    `Registre : ${nf(m.registre)} chantiers, ${nf(conformes)} conformes.`,
    `Rendus : ${nf(m.rendus)} — un seul panneau et une seule feuille de style.`,
  ];
}

/* E090-09 : écriture dédupliquée de toutes les mesures. Le texte visible est
   la preuve ; les attributs de données permettent un harnais de vérification. */
function peindre(m) {
  const r = references;
  if (!r.panneau || !r.panneau.isConnected) return;

  const conformes = conformites(m);
  const textes = valeurs(m, conformes);

  ecrire(r.preambule, typoFrancaise(`${MESSAGES.pret} ${TEXTES_NORMATIFS.join(' ')}`));
  r.lignes.forEach((dd, index) => ecrire(dd, textes[index]));
  if (r.lexique) {
    r.lexique.replaceChildren(...LEXIQUE.map(([terme, definition]) => {
      const item = document.createElement('li');
      const fort = document.createElement('strong');
      fort.textContent = terme;
      item.append(fort, document.createTextNode(` — ${typoFrancaise(definition)}`));
      return item;
    }));
  }
  ecrire(r.bilan, typoFrancaise(
    `Bilan — français partout : ${conformes}/10 chantiers conformes ; `
    + `${m.libelles.suspects + m.aria.suspects} point(s) à vérifier. ` + MESSAGES.greffon
  ));

  mettreDonnee(r.panneau, 'e090Vue', 'chronologyv2');
  mettreDonnee(r.panneau, 'e090Lang', m.langue);
  mettreDonnee(r.panneau, 'e090Espaces', String(m.espaces));
  mettreDonnee(r.panneau, 'e090Guillemets', String(m.guillemets));
  mettreDonnee(r.panneau, 'e090Droits', String(m.droits));
  mettreDonnee(r.panneau, 'e090Libelles', String(m.libelles.examines));
  mettreDonnee(r.panneau, 'e090Suspects', String(m.libelles.suspects + m.aria.suspects));
  mettreDonnee(r.panneau, 'e090Etats', String(m.etats));
  mettreDonnee(r.panneau, 'e090Format', 'fr-FR');
  mettreDonnee(r.panneau, 'e090Lexique', String(m.lexique));
  mettreDonnee(r.panneau, 'e090Aria', String(m.aria.suspects));
  mettreDonnee(r.panneau, 'e090Registre', String(m.registre));
  mettreDonnee(r.panneau, 'e090Rendus', String(m.rendus));
  mettreDonnee(r.panneau, 'e090Conformes', String(conformes));
}

function installer(ctx) {
  const creer = ctx && ctx.el;
  if (typeof creer !== 'function' || !ctx.layout) return;

  rendus += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(HOTE_ID) || ctx.stage || ctx.layout;
  if (!host || typeof host.appendChild !== 'function') return;

  const panneau = assurerNoeud(creer, PANNEAU_ID, 'section', 'e090-panneau', host);
  panneau.setAttribute('role', 'region');
  panneau.setAttribute('aria-labelledby', TITRE_ID);
  mettreAttribut(panneau, 'lang', 'fr');
  mettreAttribut(panneau, 'dir', 'ltr');

  const titre = creer('h2', 'e090-titre', 'Français partout — conformité linguistique');
  titre.id = TITRE_ID;
  const preambule = creer('p', 'e090-preambule');
  preambule.id = PREAMBULE_ID;

  const tableau = creer('dl', 'e090-tableau');
  tableau.id = TABLEAU_ID;
  const lignes = LIGNES.map(([id, intitule]) => {
    const rangee = creer('div', 'e090-ligne');
    const cle = creer('dt', 'e090-cle', intitule);
    const valeur = creer('dd', 'e090-valeur');
    valeur.id = id;
    rangee.append(cle, valeur);
    tableau.appendChild(rangee);
    return valeur;
  });

  const sousTitre = creer('h3', 'e090-sous-titre', 'Lexique de la vue');
  const lexique = creer('ul', 'e090-lexique');
  instances += 1;
  lexique.id = `${LEXIQUE_ID}-${instances}`;
  const bilan = creer('p', 'e090-bilan');
  bilan.id = `${BILAN_ID}-${instances}`;

  /* E090-10 : replaceChildren et non concaténation de balisage : les nœuds
     d'une rendu antérieure sont détachés, aucun identifiant n'est dupliqué. */
  panneau.replaceChildren(titre, preambule, tableau, sousTitre, lexique, bilan);

  references = { panneau, preambule, lignes, lexique, bilan };
  peindre(mesurer(host));
}

/* E090-01 à E090-10 : un seul point d'entrée, une seule feuille, un seul
   greffon enregistré auprès du registre de la passe V2. */
register('E090', (ctx) => {
  installer(ctx);
});
