import { register } from './registry.js';

/* Lentille E088 — Qualité & validation : blocages et limites inter-domaines.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E088.md — chantiers E088-01 à E088-10.
 * Fichier possédé : src/views/chronology/v2/E088.js uniquement, avec son rapport.
 * Lectures autorisées : le modèle src/views/chronology/E049.js et son rapport,
 * ainsi que la table des thèmes UNIFIED_AUDIT/CHRONOLOGIE/V2/themes.json.
 * Aucun fichier partagé n'est modifié : ni registry.js, ni index.js, ni styles.css,
 * ni src/views/chronology.js, ni une autre lentille, ni la passe 1.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Le registre
 * ne fournit pas say() : la lentille n'ajoute AUCUNE région live et n'écrit dans
 * aucune région existante, afin de respecter le domaine E041.
 *
 * Invariants :
 * - un seul register('E088', install), un seul ctx.css('chronology-v2-e088', …) ;
 * - tous les IDs sont préfixés chronology-v2-e088- et passent par ensureNode ;
 * - aucune écriture live, aucun vol de focus, aucun écouteur, aucun timer ;
 * - zéro réseau, zéro hasard, zéro journalisation, zéro HTML brut, zéro timer.
 *
 * Les dix chantiers sont des facettes distinctes d'un même inventaire : cartographie
 * des domaines (01), sévérité textuelle (02), propriété des fichiers (03),
 * dépendances (04), contrat du greffon (05), interdits (06), limites d'observation
 * (07), empreinte déterministe (08), synthèse chiffrée (09) et renoncements (10).
 */

const CSS_ID = 'chronology-v2-e088';
const PANEL_ID = 'chronology-v2-e088-panel';
const TITLE_ID = 'chronology-v2-e088-title';
const DOMAINS_ID = 'chronology-v2-e088-domains';
const SEVERITY_ID = 'chronology-v2-e088-severity';
const OWNERSHIP_ID = 'chronology-v2-e088-ownership';
const DEPS_ID = 'chronology-v2-e088-deps';
const CONTRACT_ID = 'chronology-v2-e088-contract';
const FORBIDDEN_ID = 'chronology-v2-e088-forbiddens';
const LIMITS_ID = 'chronology-v2-e088-limits';
const FINGERPRINT_ID = 'chronology-v2-e088-fingerprint';
const SUMMARY_ID = 'chronology-v2-e088-summary';
const RENOUNCEMENTS_ID = 'chronology-v2-e088-renouncements';

/* E088-01, E088-02, E088-06 : une seule feuille injectée une fois. Le panneau
   est un bloc en flux normal, jamais une modale ni une superposition : il
   n'ajoute aucun arrêt Tab et ne recouvre ni la frise ni la fiche. La sévérité
   est portée par un mot ET par un glyph, jamais par la couleur seule. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 12px 14px 14px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.55;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e088-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e088-lede { margin: 0 0 10px; color: var(--muted); }
  #${PANEL_ID} .e088-section { margin: 0 0 10px; padding: 8px 0 0; border-top: 1px dotted var(--line); }
  #${PANEL_ID} .e088-legend { margin: 0 0 6px; color: var(--muted-2); font-size: 9px; }
  #${PANEL_ID} .e088-list { margin: 0; padding: 0; list-style: none; }
  #${PANEL_ID} .e088-row { display: flex; flex-wrap: wrap; gap: 4px 9px; margin: 0 0 5px; }
  #${PANEL_ID} .e088-code {
    flex: 0 0 auto; min-width: 18px; color: var(--gold-bright);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px;
  }
  #${PANEL_ID} .e088-nom { flex: 0 0 132px; font-weight: 600; }
  #${PANEL_ID} .e088-texte { flex: 1 1 220px; min-width: 0; color: var(--muted); }
  #${PANEL_ID} .e088-badge {
    flex: 0 0 auto; padding: 0 5px; border: 1px solid var(--line-strong);
    border-radius: 3px; font-size: 9px; white-space: nowrap;
  }
  #${PANEL_ID} .e088-badge::before { content: '● '; }
  #${PANEL_ID} .e088-badge[data-severite='Bloquant']::before { content: '■ '; }
  #${PANEL_ID} .e088-badge[data-severite='Limite']::before { content: '▲ '; }
  #${PANEL_ID} .e088-badge[data-severite='Info']::before { content: '◆ '; }
  #${PANEL_ID} .e088-pair { display: flex; flex-wrap: wrap; gap: 4px 9px; margin: 0 0 4px; }
  #${PANEL_ID} .e088-pair dt { flex: 0 0 156px; margin: 0; color: var(--gold-bright); }
  #${PANEL_ID} .e088-pair dd { flex: 1 1 180px; min-width: 0; margin: 0; color: var(--muted); }
  #${PANEL_ID} .e088-state { color: var(--gold-bright); }
  #${PANEL_ID} .e088-metric { margin: 5px 0 0; color: var(--gold-bright); }
  #${PANEL_ID} .e088-fingerprint {
    margin: 0; color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  #${PANEL_ID} .e088-renoncement { margin: 0 0 4px; color: var(--muted); }
  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 10px; }
    #${PANEL_ID} .e088-nom, #${PANEL_ID} .e088-pair dt { flex-basis: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .e088-title, #${PANEL_ID} .e088-code,
    #${PANEL_ID} .e088-badge, #${PANEL_ID} .e088-state,
    #${PANEL_ID} .e088-metric, #${PANEL_ID} .e088-pair dt { color: CanvasText; }
  }
`;

/* E088-01 : cartographie des dix domaines A–J. Table statique, aucune date,
   aucune valeur issue du hasard : les totaux de la synthèse en dérivent. */
const DOMAINES = [
  { code: 'A', nom: 'Frise & ères', severite: 'Bloquant',
    blocage: 'La hiérarchie des bandes est définie dans le CSS global, hors du fichier possédé.',
    limite: 'aucun contraste ne peut être corrigé ici sans empiéter sur le domaine H.' },
  { code: 'B', nom: 'Filtres & périmètre', severite: 'Limite',
    blocage: 'Le signal de filtre est conservé par la vue, qui reconstruit le stage à chaque frappe.',
    limite: 'la lentille ne peut qu’observer le périmètre affiché, jamais le rétablir.' },
  { code: 'C', nom: 'Détail & fiche', severite: 'Limite',
    blocage: 'Les sources et les justifications appartiennent aux données du point, pas à la lentille.',
    limite: 'une omission justifiée est signalée, jamais comblée par une invention.' },
  { code: 'D', nom: 'Navigation & clavier', severite: 'Bloquant',
    blocage: 'Le routeur détient tous les raccourcis ; cette lentille n’installe aucun gestionnaire de touche.',
    limite: 'aucun Échap ni flèche ne peut être détourné pour ce panneau.' },
  { code: 'E', nom: 'Accessibilité & ARIA', severite: 'Limite',
    blocage: 'La région live unique est la propriété du domaine E041, pas de la qualité.',
    limite: 'le panneau reste hors aria-live pour ne pas ajouter de bavardage.' },
  { code: 'F', nom: 'Sémantique & données', severite: 'Info',
    blocage: 'Les chiffres affichés doivent découler du DOM ou d’une table explicite.',
    limite: 'aucune date ni aucun chiffre codé en dur ne peut être pris pour une preuve.' },
  { code: 'G', nom: 'Performance & rendu', severite: 'Limite',
    blocage: 'Boucle rAF, observations et canvas relèvent du maître d’œuvre du rendu.',
    limite: 'la lentille ne mesure pas la latence : elle se contente d’inclusions statiques.' },
  { code: 'H', nom: 'Responsive & mobile', severite: 'Bloquant',
    blocage: 'Les points de rupture et les safe-area sont portés par styles.css, non possédé.',
    limite: 'seul un repli local à 620px peut être ajouté sans toucher à la grille.' },
  { code: 'I', nom: 'Qualité & validation', severite: 'Info',
    blocage: 'node --check ne prouve pas le rendu : il valide la syntaxe du module uniquement.',
    limite: 'les contrôles visuels restent à rejouer par l’agent maître.' },
  { code: 'J', nom: 'Pédagogie & narration', severite: 'Limite',
    blocage: 'Le récit et le glossaire sont du ressort du contenu de la vue, pas de la lentille.',
    limite: 'le panneau documente le contrat, il ne raconte pas l’histoire à sa place.' },
];

/* E088-04 : dépendances inter-domaines, énoncées avec le verbe « observe » et
   jamais avec un verbe de modification. */
const DEPENDANCES = [
  ['Registre de la vue', 'fournit css, el et reducedMotion', 'observé, non modifié'],
  ['Coque de l’application', 'reconstruit le stage à chaque rendu', 'observé, non modifié'],
  ['Routeur clavier', 'détient les raccourcis globaux', 'observé, non modifié'],
  ['CSS global', 'définit les variables et la grille', 'observé, non modifié'],
  ['Région live de la vue', 'appartient au domaine E041', 'non doublé'],
];

/* E088-05 : contrat exact du greffon ; say() est listé comme absent pour rendre
   visible la frontière avec les lentilles qui annoncent. */
const CONTRAT = [
  ['viewId', 'chronologyv2 — identifiant de la vue'],
  ['stage', 'conteneur de scène fourni par la coque'],
  ['layout', 'conteneur de mise en page retenu comme hôte'],
  ['css(id, règles)', 'une seule feuille : chronology-v2-e088'],
  ['el(balise, classe, texte)', 'seul moyen de créer un nœud'],
  ['reducedMotion()', 'préférence lue, jamais modifiée'],
  ['say()', 'absent du contrat : aucune région live ajoutée'],
];

/* E088-06 : les cinq interdits du cahier des charges, chacun avec un état textuel. */
const INTERDITS = [
  ['Réseau', 'appel de téléchargement, requête asynchrone, module distant', 'interdit respecté'],
  ['Hasard', 'générateur pseudo-aléatoire et graine non déclarée', 'interdit respecté'],
  ['Journalisation', 'sortie de débogage vers la console', 'interdit respecté'],
  ['HTML brut', 'injection directe de balises dans le document', 'interdit respecté'],
  ['Minuterie', 'attente différée, intervalle répété, boucle d’animation', 'interdit respecté'],
];

/* E088-07 : limites d'observation, c'est-à-dire ce que la lentille ne peut pas
   mesurer même lorsqu'elle le voudrait. */
const LIMITES = [
  'Les nœuds détachés par la coque après un rendu échappent à getElementById.',
  'Les annonces des régions live existantes ne sont pas capturées : E041 les possède.',
  'Le focus programmatique de la coque compte comme un focus, pas comme une action utilisateur.',
  'Aucun horodatage n’est produit : l’état est recalculé à chaque rendu.',
  'Un défaut dans un fichier non possédé est listé, jamais réparé.',
];

/* E088-10 : renoncements explicites, gardés comme trace des décisions de
   non-intervention et rendus sous forme de liste ordonnée. */
const RENONCEMENTS = [
  'Je ne modifie ni le CSS global ni la grille : ils appartiennent au maître d’œuvre.',
  'Je n’ajoute aucun raccourci clavier : le routeur en est l’unique propriétaire.',
  'Je ne double pas la région live : la lentille E041 la porte déjà.',
  'Je ne corrige aucune donnée : je signale l’écart dans la liste des limites.',
];

let installations = 0;

/* E088-08 : empreinte FNV-1a déterministe, calculée sur des chaînes statiques.
   Aucun aléa, aucune date : deux rendus produisent toujours la même valeur. */
function empreinte(source) {
  let h = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    h ^= source.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/* E088-03 et E088-09 : une seule fonction d'écriture, qui ne touche au texte
   que s'il diffère ; cela évite les écritures redondantes entre deux rendus. */
function ecrire(node, texte) {
  if (node && node.textContent !== texte) node.textContent = texte;
}

/* E088-03 et E088-10 : garde d'existence pour toute ID préfixée. Un nœud déjà
   présent est réutilisé et déplacé dans le parent courant : la coque pouvant
   reconstruire le stage, un nœud de la rendu précédent se retrouve détaché. */
function assurer(faire, id, balise, classe, parent) {
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = faire(balise, classe);
    noeud.id = id;
  }
  if (noeud.parentElement !== parent) parent.appendChild(noeud);
  return noeud;
}

function section(faire, parent, id, titre, note) {
  const bloc = assurer(faire, id, 'div', 'e088-section', parent);
  const titreNoeud = faire('p', 'e088-legend', titre);
  const noteNoeud = faire('p', 'e088-legend', note);
  bloc.replaceChildren(titreNoeud, noteNoeud);
  return bloc;
}

function install(ctx) {
  const faire = ctx.el;
  if (typeof faire !== 'function') return;

  installations += 1;
  ctx.css(CSS_ID, CSS);

  const hote = [ctx.layout, ctx.stage].find((n) => n instanceof Element) || document.body;
  const panneau = assurer(faire, PANEL_ID, 'section', 'e088-panel', hote);
  panneau.setAttribute('role', 'region');
  panneau.setAttribute('aria-labelledby', TITLE_ID);

  const titre = assurer(faire, TITLE_ID, 'h2', 'e088-title', panneau);
  ecrire(titre, 'Blocages et limites inter-domaines');
  const lede = faire('p', 'e088-lede', 'Inventaire de lecture : chaque entrée nomme un blocage ou une limite qui relève d’un autre domaine. Ce panneau n’a rien à réparer, il rend les frontières visibles sans écrire dans les régions des autres lentilles.');

  /* E088-01 : une ligne par domaine, avec son blocage et sa limite. */
  const blocDomaines = section(faire, panneau, DOMAINS_ID, 'Cartographie des domaines A à J', 'Dix domaines, dix lignes : aucun chevauchement entre les objets décrits.');
  const listeDomaines = faire('ul', 'e088-list');
  DOMAINES.forEach((d) => {
    const ligne = faire('li', 'e088-row');
    ligne.setAttribute('data-domaine', d.code);
    ligne.append(
      faire('span', 'e088-code', d.code),
      faire('span', 'e088-nom', d.nom),
      faire('span', 'e088-texte', d.blocage),
      faire('span', 'e088-texte', d.limite)
    );
    listeDomaines.appendChild(ligne);
  });
  blocDomaines.appendChild(listeDomaines);

  /* E088-02 : la sévérité est un mot lisible, doublé d'un glyph en CSS. */
  const blocSeverite = section(faire, panneau, SEVERITY_ID, 'Sévérité explicite des blocages', 'Légende : ■ bloquant · ▲ limite · ◆ information. Le mot accompagne toujours le symbole.');
  const listeSeverite = faire('ul', 'e088-list');
  DOMAINES.forEach((d) => {
    const ligne = faire('li', 'e088-row');
    const badge = faire('span', 'e088-badge', d.severite);
    badge.setAttribute('data-severite', d.severite);
    ligne.append(faire('span', 'e088-code', d.code), badge, faire('span', 'e088-texte', d.nom));
    listeSeverite.appendChild(ligne);
  });
  blocSeverite.appendChild(listeSeverite);

  /* E088-03 : la frontière de propriété est affichée en deux groupes. */
  const blocPropriete = section(faire, panneau, OWNERSHIP_ID, 'Propriété des fichiers', 'Deux groupes distincts : ce que je possède et ce que je lis sans modifier.');
  const proprietes = faire('dl', 'e088-list');
  [
    ['Possédé', 'src/views/chronology/v2/E088.js et son rapport E088.md'],
    ['Lecture seule', 'registry.js, index.js, styles.css, src/views/chronology.js, passe 1, autres lentilles'],
  ].forEach(([cle, valeur]) => {
    const paire = faire('div', 'e088-pair');
    paire.append(faire('dt', 'e088-code', cle), faire('dd', 'e088-texte', valeur));
    proprietes.appendChild(paire);
  });
  blocPropriete.appendChild(proprietes);

  /* E088-04 : dépendances observées, jamais modifiées. */
  const blocDep = section(faire, panneau, DEPS_ID, 'Dépendances inter-domaines', 'Chaque relation est énoncée à l’infinitif : observer, jamais corriger.');
  const listeDep = faire('ul', 'e088-list');
  DEPENDANCES.forEach(([domaine, role, frontiere]) => {
    const ligne = faire('li', 'e088-row');
    ligne.append(
      faire('span', 'e088-nom', domaine),
      faire('span', 'e088-texte', role),
      faire('span', 'e088-badge', frontiere)
    );
    listeDep.appendChild(ligne);
  });
  blocDep.appendChild(listeDep);

  /* E088-05 : le contrat est listé tel qu'il est fourni, say() inclus comme absent. */
  const blocContrat = section(faire, panneau, CONTRACT_ID, 'Contrat du greffon', 'Les six entrées réellement fournies, plus l’absence explicite de say().');
  const contrat = faire('dl', 'e088-list');
  CONTRAT.forEach(([cle, valeur]) => {
    const paire = faire('div', 'e088-pair');
    paire.append(faire('dt', 'e088-code', cle), faire('dd', 'e088-texte', valeur));
    contrat.appendChild(paire);
  });
  blocContrat.appendChild(contrat);

  /* E088-06 : interdits et états textuels, sans couleur porteuse d'information. */
  const blocInterdits = section(faire, panneau, FORBIDDEN_ID, 'Registre des interdits', 'Cinq familles proscrites par le contrat, chacune avec son état écrit en toutes lettres.');
  const listeInterdits = faire('ul', 'e088-list');
  INTERDITS.forEach(([famille, forme, etat]) => {
    const ligne = faire('li', 'e088-row');
    ligne.append(
      faire('span', 'e088-nom', famille),
      faire('span', 'e088-texte', forme),
      faire('span', 'e088-state', etat)
    );
    listeInterdits.appendChild(ligne);
  });
  blocInterdits.appendChild(listeInterdits);

  /* E088-07 : limites d'observation, énoncées comme telles. */
  const blocLimites = section(faire, panneau, LIMITS_ID, 'Limites d’observation', 'Ce que la lentille ne peut pas mesurer, même avec un écouteur de plus.');
  const listeLimites = faire('ol', 'e088-list');
  LIMITES.forEach((texte) => listeLimites.appendChild(faire('li', 'e088-renoncement', texte)));
  blocLimites.appendChild(listeLimites);

  /* E088-08 : empreinte calculée depuis les tables, jamais depuis l'horloge. */
  const blocEmpreinte = section(faire, panneau, FINGERPRINT_ID, 'Empreinte de reproductibilité', 'FNV-1a sur les tables statiques : deux rendus donnent la même valeur.');
  const source = DOMAINES.map((d) => `${d.code}${d.nom}${d.severite}`).join('|')
    + DEPENDANCES.map((d) => d.join('|')).join(';')
    + CONTRAT.map((d) => d.join('|')).join(';')
    + INTERDITS.map((d) => d.join('|')).join(';')
    + LIMITES.join(';') + RENONCEMENTS.join(';');
  const valeur = empreinte(source);
  const badgeEmpreinte = faire('p', 'e088-fingerprint', `Empreinte : ${valeur}`);
  badgeEmpreinte.setAttribute('data-empreinte', valeur);
  blocEmpreinte.appendChild(badgeEmpreinte);

  /* E088-09 : toute la synthèse est dérivée des tables, aucun chiffre n'est écrit à la main. */
  const bloquants = DOMAINES.filter((d) => d.severite === 'Bloquant').length;
  const limites = DOMAINES.filter((d) => d.severite === 'Limite').length;
  const infos = DOMAINES.filter((d) => d.severite === 'Info').length;
  const reduit = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  const blocSynthese = section(faire, panneau, SUMMARY_ID, 'Synthèse chiffrée', 'Les totaux sont recalculés depuis la cartographie, pas saisis dans le texte.');
  const synthese = faire('p', 'e088-metric', `Domaines cartographiés : ${DOMAINES.length} · bloquants : ${bloquants} · limites : ${limites} · informations : ${infos} · dépendances : ${DEPENDANCES.length} · interdits : ${INTERDITS.length} · limites d’observation : ${LIMITES.length} · renoncements : ${RENONCEMENTS.length} · installations : ${installations} · mouvement réduit : ${reduit ? 'oui' : 'non'}.`);
  blocSynthese.appendChild(synthese);
  panneau.setAttribute('data-e088-domaines', String(DOMAINES.length));
  panneau.setAttribute('data-e088-bloquants', String(bloquants));
  panneau.setAttribute('data-e088-limites', String(limites));
  panneau.setAttribute('data-e088-infos', String(infos));
  panneau.setAttribute('data-e088-reduced', reduit ? '1' : '0');

  /* E088-10 : les renoncements forment une liste ordonnée, gardée telle quelle
     d'un rendu à l'autre par la garde d'existence du panneau. */
  const blocRenoncements = section(faire, panneau, RENOUNCEMENTS_ID, 'Renoncements documentés', 'Quatre décisions de non-intervention, assumées comme telles.');
  const listeRenoncements = faire('ol', 'e088-list');
  RENONCEMENTS.forEach((texte) => listeRenoncements.appendChild(faire('li', 'e088-renoncement', texte)));
  blocRenoncements.appendChild(listeRenoncements);
  panneau.setAttribute('data-e088-installations', String(installations));

  panneau.replaceChildren(titre, lede,
    blocDomaines, blocSeverite, blocPropriete, blocDep, blocContrat,
    blocInterdits, blocLimites, blocEmpreinte, blocSynthese, blocRenoncements);
}

register('E088', install);
