import { register } from './registry.js';

/* Lentille V2 E055 — « disputé » jamais résolu par un silence
 * (domaine F : sémantique & données de la vue Chronologie).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E055.md — chantiers E055-01 à E055-10.
 * Fichier possédé : src/views/chronology/v2/E055.js uniquement. Lectures seules :
 * src/views/chronology/E049.js et UNIFIED_AUDIT/CHRONOLOGIE/views/E049.md (modèles
 * de qualité de la passe 1), UNIFIED_AUDIT/CHRONOLOGIE/V2/themes.json (clé E055),
 * contrat ctx énoncé dans la consigne. Aucun fichier partagé n'est modifié.
 *
 * Contrat exploité : viewId ('chronologyv2'), stage, layout, css, el, reducedMotion.
 * Le registre V2 ne fournit pas say() : la lentille n'ajoute aucune région live,
 * n'écrit dans aucune région existante et affiche son état en texte visible
 * ordinaire, dédupliqué (modèle E049.js:12-15).
 *
 * Invariants :
 * - un seul register('E055', ctx => { … }), un seul ctx.css('chronology-v2-e055', …) ;
 * - tous les IDs DOM sont préfixés chronology-v2-e055-, uniques, passer par assureNoeud ;
 * - zéro timer, zéro rAF, zéro aléa, zéro réseau, zéro journalisation, zéro innerHTML ;
 * - aucun écouteur : le statut est relu à chaque rendu, car chaque changement
 *   reconstruit le DOM et rejoue les greffons ;
 * - aucune date, aucune assertion historique, aucun chiffre n'est inventé : tout
 *   est lu dans le DOM ou le dataset, sinon un repli explicite est écrit.
 */

const CSS_ID = 'chronology-v2-e055';
const PANNEAU_ID = 'chronology-v2-e055-panneau';
const TITRE_ID = 'chronology-v2-e055-titre';
const DEFINITION_ID = 'chronology-v2-e055-definition';
const NON_ARBITRAGE_ID = 'chronology-v2-e055-non-arbitrage';
const DISTINCT_ID = 'chronology-v2-e055-distinct';
const LISTE_ID = 'chronology-v2-e055-liste';
const REPLI_ID = 'chronology-v2-e055-repli';
const COMPTE_ID = 'chronology-v2-e055-compte';
const METRIQUE_ID = 'chronology-v2-e055-metrique';
const MAIN_ID = 'atlas-chrono-main';

/* E055-01 : sélecteur tolérant, aligné sur les vocabulaires déjà rencontrés
   dans la vue (data-confidence, data-disputed, classes). Les variantes françaises
   et anglaises sont acceptées sans jamais être traduites en une donnée inventée. */
const SELECTEUR_CONTESTE = [
  '[data-disputed="true"]',
  '[data-dispute="true"]',
  '[data-confidence="dispute"]',
  '[data-confidence="disputé"]',
  '[data-confidence="disputee"]',
  '[data-statut="dispute"]',
  '[data-e055-dispute]',
  '.disputed',
  '.dispute',
].join(', ');

const SELECTEUR_ASSERTION = '[data-assertion], [data-point-id], .event-card, .chronology-point';
const VALEURS_CONTESTE = new Set([
  'true', '1', 'oui', 'dispute', 'disputé', 'disputee', 'conteste', 'contesté', 'contested',
]);

/* E055-02, E055-06, E055-09 : une seule feuille, injectée une fois. Le panneau
   est un bloc en flux normal en fin de colonne : jamais une modale, jamais
   superposé, jamais tabulable. Le badge « DISPUTÉ » porte un texte ET une forme
   (bordure en pointillé), donc aucune information n'est confiée à la couleur. */
const CSS = `
  #${PANNEAU_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANNEAU_ID} [hidden] { display: none !important; }
  #${PANNEAU_ID} .e055-titre {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANNEAU_ID} .e055-lede,
  #${PANNEAU_ID} .e055-definition,
  #${PANNEAU_ID} .e055-non-arbitrage,
  #${PANNEAU_ID} .e055-distinct { margin: 0 0 7px; color: var(--ink-soft); }
  #${PANNEAU_ID} .e055-definition { color: var(--muted); }
  #${PANNEAU_ID} .e055-terme {
    color: var(--gold-bright); font-weight: 600; font-style: normal;
  }
  #${PANNEAU_ID} .e055-non-arbitrage {
    border-left: 2px dashed var(--gold); padding-left: 8px; color: var(--gold-bright);
  }
  #${PANNEAU_ID} .e055-distinct { color: var(--muted); }
  #${PANNEAU_ID} .e055-liste { margin: 6px 0 8px; padding: 0; list-style: none; }
  #${PANNEAU_ID} .e055-entree {
    margin: 0 0 8px; padding: 7px 8px 8px;
    border: 1px solid var(--line); border-left: 2px dashed var(--gold);
    border-radius: 7px;
  }
  #${PANNEAU_ID} .e055-ligne { display: flex; gap: 7px; align-items: baseline; margin: 0 0 5px; }
  #${PANNEAU_ID} .e055-badge {
    flex: 0 0 auto; padding: 1px 5px;
    border: 1px dashed var(--gold-bright); border-radius: 4px;
    color: var(--gold-bright); font-size: 9px; font-weight: 700; letter-spacing: .05em;
  }
  #${PANNEAU_ID} .e055-libelle { flex: 1 1 auto; min-width: 0; }
  #${PANNEAU_ID} .e055-motif,
  #${PANNEAU_ID} .e055-date,
  #${PANNEAU_ID} .e055-sources-conflit { margin: 3px 0 0; }
  #${PANNEAU_ID} .e055-variantes { margin: 4px 0 0; padding-left: 16px; }
  #${PANNEAU_ID} .e055-variante,
  #${PANNEAU_ID} .e055-variante-manquante { margin: 1px 0; }
  #${PANNEAU_ID} .e055-variante-manquante,
  #${PANNEAU_ID} .e055-source-manquante { color: var(--muted); }
  #${PANNEAU_ID} .e055-sources-label { color: var(--muted); }
  #${PANNEAU_ID} .e055-lien {
    color: var(--gold-bright); text-decoration: underline;
  }
  #${PANNEAU_ID} .e055-lien:focus-visible {
    outline: 2px solid var(--gold-bright); outline-offset: 2px;
  }
  #${PANNEAU_ID} .e055-repli {
    margin: 6px 0 8px; padding: 7px 9px;
    border: 1px dashed var(--line-strong); border-radius: 7px; color: var(--muted);
  }
  #${PANNEAU_ID} .e055-compte { margin: 6px 0 0; color: var(--muted); }
  #${PANNEAU_ID} .e055-metrique { margin: 4px 0 0; color: var(--muted-2); font-size: 9px; }
  #${PANNEAU_ID}[data-e055-etat="silence"] { border-left-style: dashed; }
  #${PANNEAU_ID}[data-e055-etat="conteste"] { border-left-style: solid; }
  @media (max-width: 620px) {
    #${PANNEAU_ID} .e055-ligne { flex-wrap: wrap; gap: 2px 7px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANNEAU_ID}, #${PANNEAU_ID} * {
      transition: none !important; animation: none !important;
    }
  }
  @media (forced-colors: active) {
    #${PANNEAU_ID}, #${PANNEAU_ID} .e055-entree, #${PANNEAU_ID} .e055-repli {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    #${PANNEAU_ID} .e055-badge { border: 1px dashed CanvasText; color: CanvasText; }
    #${PANNEAU_ID} .e055-titre,
    #${PANNEAU_ID} .e055-terme,
    #${PANNEAU_ID} .e055-non-arbitrage,
    #${PANNEAU_ID} .e055-lien { color: CanvasText; }
    #${PANNEAU_ID}[data-e055-etat="silence"] { border-left-style: dashed; }
  }
`;

let rendus = 0;
let refs = {
  fabriquer: null, panneau: null, racine: null, liste: null, repli: null,
  compte: null, metrique: null, reduced: false,
};

/* E055-10 : garde d'existence pour toute ID préfixée chronology-v2-e055-.
   Un nœud déjà présent est réutilisé et déplacé dans le parent courant : la
   coque reconstruisant le stage, un nœud du rendu précédent est détaché et
   n'est donc pas retrouvé par getElementById. */
function assureNoeud(fabriquer, id, balise, classe, parent) {
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = fabriquer(balise, classe);
    noeud.id = id;
  }
  if (noeud.parentElement !== parent) parent.appendChild(noeud);
  return noeud;
}

/* Écriture dédupliquée : deux rafraîchissements sans changement ne modifient
   aucun textContent (modèle E049.js:125-127). */
function ecrire(noeud, texte) {
  if (noeud && noeud.textContent !== texte) noeud.textContent = texte;
}

function attribut(noeud, noms) {
  for (const nom of noms) {
    const valeur = noeud.getAttribute(nom);
    if (valeur !== null && valeur.trim() !== '') return valeur.trim();
  }
  return '';
}

function lireListe(valeur) {
  if (!valeur) return [];
  return valeur.split(/[|;]+/).map((partie) => partie.trim()).filter(Boolean);
}

/* E055-01 : un marqueur explicite seul qualifie une assertion de contestée.
   L'absence de marqueur n'est jamais interprétée comme un consensus. */
function estConteste(noeud) {
  if (noeud.classList.contains('disputed') || noeud.classList.contains('dispute')) return true;
  const valeur = attribut(noeud, [
    'data-disputed', 'data-dispute', 'data-e055-dispute', 'data-statut',
  ]).toLowerCase();
  if (VALEURS_CONTESTE.has(valeur)) return true;
  return VALEURS_CONTESTE.has(attribut(noeud, ['data-confidence']).toLowerCase());
}

function collecterContestes() {
  const { panneau, racine } = refs;
  if (!racine) return [];
  const contestes = [];
  const vus = new Set();
  racine.querySelectorAll(SELECTEUR_CONTESTE).forEach((noeud) => {
    if (panneau && panneau.contains(noeud)) return;
    if (!estConteste(noeud) || vus.has(noeud)) return;
    vus.add(noeud);
    contestes.push(noeud);
  });
  return contestes;
}

/* E055-08 : les assertions sans marqueur sont comptées, mais jamais nommées
   « disputées ». Le silence reste un état distinct, explicitement dit. */
function compterSansMarqueur(contestes) {
  const { panneau, racine } = refs;
  if (!racine) return 0;
  const vus = new Set(contestes);
  racine.querySelectorAll(SELECTEUR_ASSERTION).forEach((noeud) => {
    if (panneau && panneau.contains(noeud)) return;
    vus.add(noeud);
  });
  return Math.max(0, vus.size - contestes.length);
}

function libelleAssertion(noeud, index) {
  const titre = attribut(noeud, ['data-assertion', 'data-titre', 'aria-label', 'title']);
  if (titre) return titre.slice(0, 120);
  const texte = (noeud.textContent || '').trim().replace(/\s+/g, ' ');
  return texte ? `${texte.slice(0, 96)}${texte.length > 96 ? '…' : ''}` : `Assertion contestée ${index}`;
}

function lireVariantes(noeud) {
  const variantes = [];
  noeud.querySelectorAll('[data-variant], [data-variante]').forEach((enfant) => {
    const texte = attribut(enfant, ['data-variant', 'data-variante'])
      || (enfant.textContent || '').trim();
    if (texte) variantes.push(texte.slice(0, 160));
  });
  lireListe(attribut(noeud, ['data-variantes', 'data-variants'])).forEach((texte) => {
    variantes.push(texte.slice(0, 160));
  });
  return [...new Set(variantes)];
}

function lireSourcesConflit(noeud) {
  return lireListe(attribut(noeud, [
    'data-dispute-sources', 'data-dispute-source', 'data-conflit-sources',
  ]));
}

function lireDateConsensus(noeud) {
  return attribut(noeud, ['data-date-consensus', 'data-consensus-date']);
}

/* E055-02 à E055-07 : une entrée par assertion contestée, avec badge textuel,
   motif, variantes, sources du désaccord et état de la datation. Rien n'est
   tranché : les positions divergentes sont conservées telles quelles. */
function fabriquerEntree(fabriquer, noeud, index) {
  const entree = fabriquer('li', 'e055-entree');
  entree.setAttribute('data-e055-index', String(index));

  const ligne = fabriquer('p', 'e055-ligne');
  ligne.append(
    fabriquer('span', 'e055-badge', 'DISPUTÉ'),
    fabriquer('span', 'e055-libelle', libelleAssertion(noeud, index)),
  );
  entree.appendChild(ligne);

  const motif = attribut(noeud, [
    'data-dispute-reason', 'data-contestation-reason', 'data-e055-reason',
  ]);
  entree.appendChild(fabriquer('p', 'e055-motif', motif
    ? `Motif du désaccord — ${motif}.`
    : 'Motif du désaccord : non renseigné dans le DOM.'));

  const variantes = lireVariantes(noeud);
  const listeVariantes = fabriquer('ul', 'e055-variantes');
  if (variantes.length) {
    variantes.forEach((texte) => listeVariantes.appendChild(fabriquer('li', 'e055-variante', texte)));
  } else {
    listeVariantes.appendChild(fabriquer(
      'li', 'e055-variante-manquante', 'Variantes non détaillées dans le DOM : le désaccord est signalé, pas inventé.',
    ));
  }
  entree.appendChild(listeVariantes);

  const sources = lireSourcesConflit(noeud);
  const blocSources = fabriquer('p', 'e055-sources-conflit');
  blocSources.appendChild(fabriquer('span', 'e055-sources-label', 'Sources du désaccord : '));
  if (sources.length) {
    sources.forEach((source, rang) => {
      if (rang) blocSources.appendChild(fabriquer('span', 'e055-separateur', ' · '));
      if (/^https?:\/\//i.test(source)) {
        const lien = fabriquer('a', 'e055-lien', source);
        lien.href = source;
        lien.target = '_blank';
        lien.rel = 'noopener noreferrer';
        blocSources.appendChild(lien);
      } else {
        blocSources.appendChild(fabriquer('span', 'e055-source', source));
      }
    });
  } else {
    blocSources.appendChild(fabriquer('span', 'e055-source-manquante', 'non renseignées dans le DOM'));
  }
  entree.appendChild(blocSources);

  const consensus = lireDateConsensus(noeud);
  entree.appendChild(fabriquer('p', 'e055-date', consensus
    ? `Datation déclarée consensuelle : ${consensus}.`
    : 'Aucune datation consensuelle n’est déclarée dans le DOM : le désaccord n’est pas tranché par une date.'));

  return entree;
}

/* E055-01 à E055-09 : un seul rafraîchissement, relu à chaque rendu. Aucune
   écriture dans une région live, aucun écouteur, aucun timer. */
function rafraichir() {
  const { fabriquer, panneau, liste, repli, compte, metrique, reduced } = refs;
  if (!panneau || !panneau.isConnected) return;

  const contestes = collecterContestes();
  const sansMarqueur = compterSansMarqueur(contestes);
  const etat = contestes.length ? 'conteste' : 'silence';

  if (panneau.dataset.e055Etat !== etat) panneau.dataset.e055Etat = etat;
  if (panneau.dataset.e055Contestes !== String(contestes.length)) {
    panneau.dataset.e055Contestes = String(contestes.length);
  }
  if (panneau.dataset.e055SansMarqueur !== String(sansMarqueur)) {
    panneau.dataset.e055SansMarqueur = String(sansMarqueur);
  }
  if (panneau.dataset.e055Rendus !== String(rendus)) panneau.dataset.e055Rendus = String(rendus);
  if (panneau.dataset.e055Reduit !== (reduced ? '1' : '0')) {
    panneau.dataset.e055Reduit = reduced ? '1' : '0';
  }

  const signature = contestes.map((noeud, index) => [
    index, libelleAssertion(noeud, index), lireVariantes(noeud).join('~'),
    lireSourcesConflit(noeud).join('~'), lireDateConsensus(noeud),
  ].join(':')).join('||');
  if (liste && liste.dataset.e055Signature !== signature) {
    liste.replaceChildren(...contestes.map((noeud, index) => fabriquerEntree(fabriquer, noeud, index + 1)));
    liste.dataset.e055Signature = signature;
  }
  if (liste) liste.hidden = contestes.length === 0;
  if (repli) repli.hidden = contestes.length !== 0;

  ecrire(compte, `Assertions contestées : ${contestes.length} · assertions sans marqueur : ${sansMarqueur} · total observé : ${contestes.length + sansMarqueur}.`);
  const etatTexte = contestes.length ? 'contestation conservée' : 'aucun marqueur observé';
  ecrire(metrique, `Rendus : ${rendus} · état : ${etatTexte} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);
}

function install(ctx) {
  const fabriquer = ctx && ctx.el;
  if (typeof fabriquer !== 'function' || !ctx.layout) return;

  rendus += 1;
  ctx.css(CSS_ID, CSS);

  const racine = document.getElementById(MAIN_ID) || ctx.stage || ctx.layout;
  const panneau = assureNoeud(fabriquer, PANNEAU_ID, 'section', 'e055-panneau', racine);
  panneau.setAttribute('role', 'region');
  panneau.setAttribute('aria-labelledby', TITRE_ID);

  const titre = assureNoeud(fabriquer, TITRE_ID, 'h2', 'e055-titre', panneau);
  titre.textContent = 'Assertions disputées — désaccord non arbitré';

  const definition = assureNoeud(fabriquer, DEFINITION_ID, 'p', 'e055-definition', panneau);
  const terme = fabriquer('dfn', 'e055-terme', 'Disputé');
  definition.replaceChildren(
    terme,
    fabriquer('span', 'e055-definition-corps', ' : qualifie une assertion dont les sources s’opposent. Le désaccord est conservé tel quel, il n’est pas tranché par défaut.'),
  );

  const nonArbitrage = assureNoeud(fabriquer, NON_ARBITRAGE_ID, 'p', 'e055-non-arbitrage', panneau);
  nonArbitrage.textContent = 'Aucune version n’est retenue ici par défaut : une assertion contestée reste contestée, même si une formulation plus simple pourrait faire croire à un consensus.';

  const distinct = assureNoeud(fabriquer, DISTINCT_ID, 'p', 'e055-distinct', panneau);
  distinct.textContent = 'Un marqueur absent n’est pas un consensus : « non renseigné » et « disputé » sont deux états distincts, et le silence ne résout pas un désaccord.';

  const liste = assureNoeud(fabriquer, LISTE_ID, 'ul', 'e055-liste', panneau);
  const repli = assureNoeud(fabriquer, REPLI_ID, 'p', 'e055-repli', panneau);
  repli.textContent = 'Aucune assertion n’est marquée comme disputée dans le DOM. Ce silence est une absence de marqueur, pas une preuve de consensus : aucune contestation n’est inventée, aucune n’est effacée.';

  const compte = assureNoeud(fabriquer, COMPTE_ID, 'p', 'e055-compte', panneau);
  const metrique = assureNoeud(fabriquer, METRIQUE_ID, 'p', 'e055-metrique', panneau);

  panneau.replaceChildren(titre, definition, nonArbitrage, distinct, liste, repli, compte, metrique);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  refs = { fabriquer, panneau, racine, liste, repli, compte, metrique, reduced };
  rafraichir();
}

register('E055', (ctx) => {
  install(ctx);
});
