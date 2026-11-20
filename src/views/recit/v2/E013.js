import { register } from './registry.js';

/* V2 lentille E013 — Recherche et filtrage (second regard).
 *
 * La passe 1 (`src/views/recit/E013.js`) a posé le bandeau de critères, la
 * description du champ, les pastilles d'occurrences, la coche des puces, le
 * compteur de résultats, l'état « hors filtre » du titre, les voies de
 * récupération, le repérage de la région d'annonce et le miroir de synthèse.
 * Cette passe V2 ne recopie aucun de ces chantiers : elle ajoute des lectures
 * chiffrées inédites et quelques renforts structurels, tous dérivés du DOM réel.
 *
 * Dix chantiers E013-01 … E013-10, tous implémentés ici. Rapport :
 * UNIFIED_AUDIT/RECIT/V2/views/E013.md.
 *
 * Greffon strictement additif et idempotent : une seule classe racine
 * `recit-v2-e013-root` posée sur `layout`, un seul bloc CSS injecté via
 * `css(identifiant, CSS)` avec l'identifiant unique `recit-v2-e013`, des nœuds
 * de synthèse visibles préfixés
 * `v2-e013-` et des attributs `data-v2-e013-*`. Aucun texte existant n'est
 * réécrit, aucun `aria-pressed` modifié, aucun écouteur ajouté, aucune annonce
 * dupliquée. La passe 1 et la V2 tournant sur le MÊME DOM, aucun identifiant
 * `e013-…` de la passe 1 n'est réutilisé. Zéro réseau, zéro console, zéro aléa.
 */

const RACINE = 'recit-v2-e013-root';

/* Toutes les règles sont cantonnées à la racine V2. Aucune information n'est
   portée par la seule couleur : les pastilles, les tirets et les libellés
   chiffrés accompagnent toujours la nuance. */
const CSS = `
/* E013-01 — Ratio de sélection en pourcentage. */
.recit-v2-e013-root{--v2-e013-filet:var(--gold)}
.recit-v2-e013-root .recit-v2-e013-ratio{
  margin:2px 0 0;color:var(--muted);font-size:9px;line-height:1.5;
  font-variant-numeric:tabular-nums
}
/* E013-02 — Longueur de la requête, chiffrée depuis la valeur du champ. */
.recit-v2-e013-root .recit-v2-e013-longueur{
  margin:2px 0 0;color:var(--muted);font-size:9px;line-height:1.5;
  font-variant-numeric:tabular-nums
}
/* E013-03 — Dénombrement des groupes de filtres et de leurs choix actifs. */
.recit-v2-e013-root .recit-v2-e013-groupes{
  margin:2px 0 0;color:var(--muted);font-size:9px;line-height:1.5;
  font-variant-numeric:tabular-nums
}
/* E013-04 — Puces « Tous » distinguées par le tiret, pas par la couleur seule. */
.recit-v2-e013-root .c3a-filter.recit-v2-e013-tous{border-style:dashed}
/* E013-05 — Groupe à filtre actif : filet interne en plus de la mise en gras. */
.recit-v2-e013-root .c3a-group.recit-v2-e013-groupe-actif{
  border-left:2px solid var(--v2-e013-filet);padding-left:6px;border-radius:3px
}
/* E013-06 — Distribution des types dans le fil. */
.recit-v2-e013-root .recit-v2-e013-types{
  margin:4px 0 0;color:var(--muted);font-size:9px;line-height:1.55;
  font-variant-numeric:tabular-nums
}
/* E013-07 — Distribution des certitudes dans le fil. */
.recit-v2-e013-root .recit-v2-e013-certitudes{
  margin:2px 0 0;color:var(--muted);font-size:9px;line-height:1.55;
  font-variant-numeric:tabular-nums
}
/* E013-08 — Pastille du nombre total de filtres actifs sur la barre d'outils. */
.recit-v2-e013-root .c3a-tools.recit-v2-e013-tools{
  display:flex;align-items:center;gap:8px
}
.recit-v2-e013-root .c3a-tools.recit-v2-e013-tools[data-v2-e013-nbfiltres]::after{
  content:attr(data-v2-e013-nbfiltres)" filtre(s)";flex:none;
  min-height:20px;padding:2px 8px;border:1px solid var(--v2-e013-filet);border-radius:999px;
  color:var(--gold-bright);font-size:9px;font-weight:700;
  font-variant-numeric:tabular-nums
}
/* E013-09 — Contrôle de cohérence fil/statut : signal par la forme et le texte. */
.recit-v2-e013-root .recit-v2-e013-coherence{
  margin:4px 0 0;padding:3px 8px;border:1px dashed var(--muted-2);border-radius:5px;
  color:var(--muted);font-size:9px;line-height:1.5;
  font-variant-numeric:tabular-nums
}
.recit-v2-e013-root .c3a-thread.recit-v2-e013-desync{
  border:1px dashed var(--gold);border-radius:8px
}
/* E013-10 — Cibles tactiles et focus visible des contrôles de recherche. */
.recit-v2-e013-root[data-v2-e013-tactile] .c3a-filter,
.recit-v2-e013-root[data-v2-e013-tactile] .c3a-reset{min-height:36px}
.recit-v2-e013-root .c3a-search:focus-visible,
.recit-v2-e013-root .c3a-filter:focus-visible,
.recit-v2-e013-root .c3a-reset:focus-visible{
  outline:2px solid var(--gold-bright);outline-offset:3px
}
.recit-v2-e013-readout{transition:opacity .2s linear}
@media (prefers-reduced-motion:reduce){.recit-v2-e013-readout{transition:none}}
@media (max-width:620px){
  .recit-v2-e013-root .recit-v2-e013-ratio,
  .recit-v2-e013-root .recit-v2-e013-longueur,
  .recit-v2-e013-root .recit-v2-e013-groupes,
  .recit-v2-e013-root .recit-v2-e013-types,
  .recit-v2-e013-root .recit-v2-e013-certitudes{font-size:8px}
}
`;

/* Vrai nœud d'élément (nodeType 1) — écarte textes et commentaires. */
function present(node) {
  return !!(node && node.nodeType === 1);
}

/* Ajoute une classe sans jamais lever d'erreur si le nœud est absent. */
function marquer(node, className) {
  if (present(node) && node.classList && typeof node.classList.add === 'function'
      && !node.classList.contains(className)) {
    node.classList.add(className);
  }
}

/* Retire un nœud créé par cette lentille, s'il existe encore. */
function retirer(node) {
  if (present(node) && node.parentNode && typeof node.parentNode.removeChild === 'function') {
    node.parentNode.removeChild(node);
  }
}

/* Pose un attribut data-* réservé à la lentille (jamais un id de la passe 1). */
function data(node, name, value) {
  if (!present(node) || typeof node.setAttribute !== 'function') return;
  try { node.setAttribute('data-v2-e013-' + name, String(value)); } catch (_) { /* facultatif */ }
}

/* Document courant, protégé pour le rendu sans DOM. */
function doc() {
  return typeof document !== 'undefined' ? document : null;
}

/* Recherche d'un identifiant V2 déjà inséré (idempotence). */
function parId(id) {
  const d = doc();
  return d && typeof d.getElementById === 'function' ? d.getElementById(id) : null;
}

/* Crée ou réutilise un paragraphe de synthèse visible, à un emplacement stable. */
function placeParagraphe(id, classe, parent, ancre, texte) {
  if (!present(parent) || typeof parent.insertBefore !== 'function') return null;
  const d = doc();
  let noeud = parId(id);
  if (!noeud && d && typeof d.createElement === 'function') {
    noeud = d.createElement('p');
    noeud.id = id;
  }
  if (!noeud) return null;
  noeud.className = 'recit-v2-e013-readout ' + classe;
  noeud.textContent = texte;
  const cible = present(ancre) && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

/* Lit « N point(s) affiché(s) sur M » dans le statut sans le réécrire. */
function lireComptage(statut) {
  const texte = String((statut && statut.textContent) || '');
  const trouvé = texte.match(/(\d+)\s*point\(s\)\s*affiché\(s\)\s*sur\s*(\d+)/i);
  if (!trouvé) return null;
  return { affiches: parseInt(trouvé[1], 10), total: parseInt(trouvé[2], 10) };
}

/* Requête réelle du champ de recherche. */
function lireRequete(champ) {
  return typeof (champ && champ.value) === 'string' ? champ.value.trim() : '';
}

/* Répartit les items du fil selon un attribut de données, dans leur ordre
   d'apparition. Aucune catégorie n'est inventée : seules celles présentes
   dans le DOM sont comptées. */
function repartition(items, attribut) {
  const ordre = [];
  const comptes = {};
  items.forEach((item) => {
    const cle = present(item) && typeof item.getAttribute === 'function'
      ? (item.getAttribute(attribut) || '') : '';
    if (!cle) return;
    if (!Object.prototype.hasOwnProperty.call(comptes, cle)) {
      comptes[cle] = 0;
      ordre.push(cle);
    }
    comptes[cle] += 1;
  });
  return ordre.map((cle) => cle + ' ×' + comptes[cle]);
}

register('E013', (ctx) => {
  try {
    if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
    const { layout, css } = ctx;
    const root = layout;

    /* Un seul bloc CSS pour toute la lentille (cssOnce garantit l'idempotence). */
    if (typeof css === 'function') {
      try { css('recit-v2-e013', CSS); } catch (_) { /* rendu préservé */ }
    }
    marquer(root, RACINE);

    const corps = root.querySelector('.recit-body');
    const statut = root.querySelector('#c3a-status')
      || (corps && corps.querySelector('.c3a-status'));
    const champ = root.querySelector('#c3a-search')
      || (corps && corps.querySelector('.c3a-search'));
    const outils = root.querySelector('#c3a-tools')
      || (corps && corps.querySelector('.c3a-tools'));
    const fil = root.querySelector('#c3a-thread')
      || (corps && corps.querySelector('.c3a-thread'));
    const ancres = present(corps) ? corps : root;
    const comptage = lireComptage(statut);
    const requete = lireRequete(champ);

    /* E013-01 — ratio de sélection calculé depuis le statut réel. */
    let ancre = present(statut) ? statut : null;
    if (comptage && comptage.total > 0) {
      const pourcent = Math.round((comptage.affiches / comptage.total) * 100);
      const texte = 'Sélection : ' + comptage.affiches + ' point'
        + (comptage.affiches > 1 ? 's' : '') + ' sur ' + comptage.total
        + ', soit ' + pourcent + ' % du repère.';
      ancre = placeParagraphe('v2-e013-ratio', 'recit-v2-e013-ratio',
        ancres, ancre, texte) || ancre;
    }

    /* E013-02 — longueur de la requête, lue dans la valeur du champ. */
    if (requete) {
      const texte = 'Requête : ' + requete.length + ' caractère'
        + (requete.length > 1 ? 's' : '') + ' saisi' + (requete.length > 1 ? 's' : '') + '.';
      ancre = placeParagraphe('v2-e013-longueur', 'recit-v2-e013-longueur',
        ancres, ancre, texte) || ancre;
    } else {
      retirer(parId('v2-e013-longueur'));
    }

    /* E013-03 — groupes de filtres, choix disponibles et choix actifs. */
    const groupes = root.querySelectorAll('.c3a-group');
    const groupesTab = Array.prototype.slice.call(groupes);
    if (groupesTab.length) {
      const resume = groupesTab.map((groupe) => {
        const boutons = groupe.querySelectorAll('.c3a-filter');
        const actifs = groupe.querySelectorAll('.c3a-filter[aria-pressed="true"]');
        const nom = (groupe.getAttribute('aria-label') || 'Groupe').trim();
        return nom + ' : ' + actifs.length + '/' + boutons.length + ' actif'
          + (actifs.length > 1 ? 's' : '');
      });
      const texte = 'Filtres : ' + groupesTab.length + ' groupe'
        + (groupesTab.length > 1 ? 's' : '') + ' · ' + resume.join(' · ') + '.';
      ancre = placeParagraphe('v2-e013-groupes', 'recit-v2-e013-groupes',
        ancres, ancre, texte) || ancre;
    }

    /* E013-04 — les puces « Tous » sont des réinitialisateurs de groupe. */
    let nbTous = 0;
    groupesTab.forEach((groupe) => {
      const boutons = groupe.querySelectorAll('.c3a-filter');
      Array.prototype.forEach.call(boutons, (bouton) => {
        const fk = bouton.getAttribute('data-fk') || '';
        if (fk === 'c3a-kind-all' || fk === 'c3a-conf-all'
            || /(^|-)all$/.test(fk)) {
          marquer(bouton, 'recit-v2-e013-tous');
          data(bouton, 'role', 'reset');
          nbTous += 1;
        }
      });
    });

    /* E013-05 — un groupe portant au moins un filtre pressé est accentué. */
    groupesTab.forEach((groupe) => {
      const actifs = groupe.querySelectorAll('.c3a-filter[aria-pressed="true"]');
      if (actifs.length) {
        marquer(groupe, 'recit-v2-e013-groupe-actif');
        data(groupe, 'actifs', actifs.length);
      }
    });

    /* E013-06 — répartition des types de points dans le fil affiché. */
    const items = fil ? Array.prototype.slice.call(
      fil.querySelectorAll('.c3a-thread-item')) : [];
    const types = repartition(items, 'data-kind');
    if (types.length) {
      ancre = placeParagraphe('v2-e013-types', 'recit-v2-e013-types',
        ancres, ancre, 'Types du fil : ' + types.join(' · ') + '.') || ancre;
    } else {
      retirer(parId('v2-e013-types'));
    }

    /* E013-07 — répartition des certitudes dans le fil affiché. */
    const certitudes = repartition(items, 'data-confidence');
    if (certitudes.length) {
      ancre = placeParagraphe('v2-e013-certitudes', 'recit-v2-e013-certitudes',
        ancres, ancre, 'Certitudes du fil : ' + certitudes.join(' · ') + '.') || ancre;
    } else {
      retirer(parId('v2-e013-certitudes'));
    }

    /* E013-08 — pastille du nombre de filtres actifs sur la barre d'outils.
       Le pseudo-élément n'est pas utilisé sur les puces (déjà occupées par
       E077, E032 et E099) mais sur la barre, libre de toute autre lentille. */
    let nbFiltres = 0;
    groupesTab.forEach((groupe) => {
      nbFiltres += groupe.querySelectorAll('.c3a-filter[aria-pressed="true"]').length;
    });
    if (present(outils)) {
      marquer(outils, 'recit-v2-e013-tools');
      data(outils, 'nbfiltres', nbFiltres);
      data(outils, 'reinitialisateurs', nbTous);
    }

    /* E013-09 — cohérence entre le nombre d'items réellement dans le fil et
       le nombre annoncé par le statut ; l'alerte n'est créée qu'en cas d'écart. */
    if (comptage) {
      const desync = items.length !== comptage.affiches;
      data(ancres, 'desync', desync ? '1' : '0');
      if (present(fil)) {
        if (desync) marquer(fil, 'recit-v2-e013-desync');
        else if (fil.classList) fil.classList.remove('recit-v2-e013-desync');
      }
      const alerte = parId('v2-e013-coherence');
      if (!desync) {
        retirer(alerte);
      } else {
        const texte = 'Fil et statut divergents : ' + items.length
          + ' point(s) dans le fil pour ' + comptage.affiches + ' annoncé(s).';
        placeParagraphe('v2-e013-coherence', 'recit-v2-e013-coherence',
          ancres, ancre, texte);
      }
    }

    /* E013-10 — cibles tactiles et focus visible des contrôles de recherche
       et de filtrage, sans toucher aux gestionnaires ni aux attributs ARIA. */
    data(root, 'tactile', '1');
  } catch (_) {
    /* Une lentille défaillante est neutralisée sans interrompre le rendu. */
  }
});
