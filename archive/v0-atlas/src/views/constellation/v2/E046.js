import { register } from './registry.js';

/* Lentille V2 E046 — supervision et contrôle de l'état de la légende (ères,
   repères, points vérifiés). Seconde passe : dix chantiers inédits, tous
   implémentés, sans réseau, sans source aléatoire et sans minuteur ni boucle
   d'animation propre. Préfixe exclusif : v2e046 (aucune collision avec la
   passe 1, qui utilisait e046- et constellation-e046). */

/* Table faible des observateurs : un seul gestionnaire par nœud de légende,
   remplacé à chaque rendu pour toujours viser les éléments courants. */
const observateurs = new WeakMap();

register('E046', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique de la lentille : lecture différée, commandes larges, focus
     visible, repli « mouvement réduit ». Aucune information n'est portée par
     la seule couleur : chaque état est dit par un mot ou un chiffre. */
  css('constellation-v2-e046', `
.v2e046-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e046-tableau{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:6px 0 2px;padding:6px 8px;border:1px solid rgba(230,185,111,.30);border-radius:8px;background:rgba(9,13,20,.86)}
.v2e046-btn{min-width:36px;min-height:36px;padding:0 10px;border:1px solid var(--line,#3a4150);border-radius:7px;background:var(--surface-2,#141a24);color:var(--ink-soft,#cfd8e6);font-size:10px;cursor:pointer}
.v2e046-btn:focus-visible{outline:2px solid #e6b96f;outline-offset:2px}
.v2e046-ligne{flex:1 1 240px;margin:0;color:#cbd5e1;font:10px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums;word-break:break-word}
.v2e046-bloc{flex:1 1 100%;display:none;margin:0;padding:4px 6px;border-top:1px dashed rgba(230,185,111,.35);color:#cbd5e1;font:9px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-word}
.v2e046-ouvert .v2e046-bloc{display:block}
.v2e046-steady .v2e046-btn,.v2e046-steady .v2e046-bloc{transition:none}
@media (prefers-reduced-motion: reduce){.v2e046-btn,.v2e046-bloc{transition:none!important}}
@media (max-width:620px){.v2e046-tableau{padding:4px 6px}.v2e046-ligne{flex-basis:100%}}
`);

  const legend = layout.querySelector ? layout.querySelector('.constellation-legend') : null;
  if (!legend) return;
  const entrees = Array.from(legend.querySelectorAll('.legend-sun, .legend-planet, .legend-moon, .e046-item'));
  const fabriquer = typeof ctx.el === 'function'
    ? ctx.el
    : (tag, className, texte) => {
        const noeud = document.createElement(tag);
        if (className) noeud.className = className;
        if (texte !== undefined) noeud.textContent = texte;
        return noeud;
      };

  const texteDe = noeud => String(noeud && noeud.textContent ? noeud.textContent : '')
    .replace(/\s+/g, ' ').trim();
  const entierOu = (valeur, repli) => {
    const nombre = parseInt(valeur, 10);
    return Number.isFinite(nombre) ? nombre : repli;
  };
  const CHAMPS = ['selection', 'detail', 'ordre', 'mouvement', 'version'];
  const ORDRES_V2 = ['origine', 'alphabetique', 'inverse'];
  const MOUVEMENTS_V2 = ['complet', 'reduit'];
  const LIMITE_JOURNAL = 12;

  /* E046-01 — Miroir d'état : aucune valeur n'est inventée, tout est déduit
     des attributs écrits par la passe 1 et de l'état réel des nœuds. */
  function lireMiroir() {
    const instantane = legend.dataset.e046Snapshot || '';
    const versionTrouvee = /(?:^|;)version=(\d+)/.exec(instantane);
    return {
      total: entrees.length,
      selection: entierOu(legend.dataset.e046Selection, 0),
      detail: legend.dataset.e046Detail === '1',
      ordre: legend.dataset.e046Ordre || ORDRES_V2[0],
      mouvement: legend.dataset.e046Motion || MOUVEMENTS_V2[0],
      version: versionTrouvee ? entierOu(versionTrouvee[1], 0) : 0,
      cochees: entrees.filter(noeud => noeud.getAttribute('aria-checked') === 'true').length,
      tabulables: entrees.filter(noeud => noeud.tabIndex === 0).length,
    };
  }

  function canonique(miroir) {
    return 'selection=' + miroir.selection
      + ';detail=' + (miroir.detail ? 1 : 0)
      + ';ordre=' + miroir.ordre
      + ';mouvement=' + miroir.mouvement
      + ';version=' + miroir.version
      + ';total=' + miroir.total;
  }

  /* E046-03 — Empreinte FNV-1a 32 bits calculée sur la chaîne canonique : deux
     états de même contenu donnent toujours la même signature, sans aléa. */
  function empreinte(chaine) {
    let hachage = 0x811c9dc5;
    for (let i = 0; i < chaine.length; i += 1) {
      hachage ^= chaine.charCodeAt(i);
      hachage = (hachage * 0x01000193) >>> 0;
    }
    return hachage.toString(16).padStart(8, '0');
  }

  /* E046-04 — Contrôle d'invariants : bornes, unicité du choix, cohérence des
     attributs ARIA. Les anomalies sont énoncées en français, jamais en couleur. */
  function verifierInvariants(miroir) {
    const problemes = [];
    if (!miroir.total) problemes.push('légende vide');
    if (!Number.isInteger(miroir.selection) || miroir.selection < 0
        || (miroir.total > 0 && miroir.selection >= miroir.total)) {
      problemes.push('sélection hors limites');
    }
    if (!Number.isInteger(miroir.version) || miroir.version < 0) problemes.push('version invalide');
    if (ORDRES_V2.indexOf(miroir.ordre) < 0) problemes.push('ordre inconnu');
    if (MOUVEMENTS_V2.indexOf(miroir.mouvement) < 0) problemes.push('mouvement inconnu');
    if (miroir.cochees > 1) problemes.push('plusieurs entrées cochées');
    else if (miroir.total > 0 && miroir.cochees !== 1) problemes.push('aucune entrée cochée');
    if (miroir.tabulables > 1) problemes.push('plusieurs entrées tabulables');
    else if (miroir.total > 0 && miroir.tabulables !== 1) problemes.push('aucune entrée tabulable');
    return problemes;
  }

  /* E046-02 — Journal d'actions : compteur séquentiel, profondeur bornée à 12,
     aucun stockage hors du module et aucune donnée temporelle. */
  const journal = [];
  let compteurActions = 0;
  function journaliser(type, cible) {
    compteurActions += 1;
    journal.push({ numero: compteurActions, type: type, cible: cible || '' });
    if (journal.length > LIMITE_JOURNAL) {
      journal.splice(0, journal.length - LIMITE_JOURNAL);
    }
    legend.dataset.v2e046Journal = String(journal.length);
  }
  function texteJournal() {
    if (!journal.length) return 'Aucune action supervisée.';
    return journal.map(action => String(action.numero).padStart(2, '0')
      + ' · ' + action.type + (action.cible ? ' : ' + action.cible : '')).join(' | ');
  }

  function assurer(id, tag, className, parent, texte) {
    let noeud = null;
    try { noeud = document.getElementById(id); } catch (erreur) { noeud = null; }
    if (!noeud) {
      noeud = fabriquer(tag, className);
      noeud.id = id;
    }
    if (noeud.parentNode !== parent) parent.appendChild(noeud);
    if (texte !== undefined && !noeud.childNodes.length) noeud.textContent = texte;
    return noeud;
  }

  /* Tableau de supervision : le miroir est exposé sans modifier la source de
     vérité de la passe 1. */
  const tableau = assurer('v2e046-tableau', 'div', 'v2e046-tableau', layout);
  tableau.setAttribute('role', 'group');
  tableau.setAttribute('aria-label', 'Supervision de l’état de la légende');
  const ligneMiroir = assurer('v2e046-miroir', 'p', 'v2e046-ligne', tableau);
  const ligneEmpreinte = assurer('v2e046-empreinte', 'p', 'v2e046-ligne', tableau);
  const ligneDiff = assurer('v2e046-diff', 'p', 'v2e046-ligne', tableau);
  const ligneInvariants = assurer('v2e046-invariants', 'p', 'v2e046-ligne', tableau);
  const ligneVersion = assurer('v2e046-version', 'p', 'v2e046-ligne', tableau);
  const ligneTemoins = assurer('v2e046-temoins', 'p', 'v2e046-ligne', tableau);
  const ligneJournal = assurer('v2e046-journal', 'p', 'v2e046-bloc', tableau);
  const ligneBilan = assurer('v2e046-bilan', 'p', 'v2e046-bloc', tableau);

  /* E046-09 — Région live dédiée à la supervision, distincte du statut V1. */
  const vivant = assurer('v2e046-live', 'p', 'v2e046-sr', layout);
  vivant.setAttribute('role', 'status');
  vivant.setAttribute('aria-live', 'polite');
  vivant.setAttribute('aria-atomic', 'true');
  const dire = message => { vivant.textContent = String(message || ''); };

  /* Aide vocale rattachée sans écraser la description posée par la V1. */
  const aide = assurer('v2e046-help', 'p', 'v2e046-sr', layout,
    'Supervision de la légende : le tableau affiche un miroir de l’état, une empreinte, la différence entre deux observations, les invariants et la progression de version. Les boutons nommés sélectionnent une entrée, fixent ou comparent un témoin, et le diagnostic vérifie la cohérence globale.');
  const decrits = (legend.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (decrits.indexOf(aide.id) < 0) {
    decrits.push(aide.id);
    legend.setAttribute('aria-describedby', decrits.join(' '));
  }

  /* E046-05 — Différence incrémentale : seuls les champs réellement mutés
     entre deux observations sont nommés, dans l'ordre fixe de CHAMPS. */
  /* E046-06 — Horloge de version : le compteur de la passe 1 progresse, stagne
     ou régresse après chaque observation ; une régression est signalée. */
  let precedent = null;
  let derniereVersion = null;
  let enAction = false;
  let temoin = null;

  /* Actualisation complète du tableau : pure lecture du DOM, puis écriture
     d'attributs préfixés v2e046 et de textes lisibles. */
  function actualiser() {
    const miroir = lireMiroir();
    const canon = canonique(miroir);
    const signature = empreinte(canon);
    /* Calcul de la différence sur l'ordre fixe des champs du miroir. */
    let difference = 'observation initiale';
    if (precedent) {
      const changes = CHAMPS.filter(champ => precedent[champ] !== miroir[champ]);
      if (precedent.total !== miroir.total) changes.push('total');
      difference = changes.length ? changes.join(', ') : 'aucun';
    }
    /* Comparaison du compteur de version avec la dernière observation. */
    let verdictVersion = 'initial';
    if (derniereVersion !== null) {
      if (miroir.version > derniereVersion) verdictVersion = 'progression';
      else if (miroir.version < derniereVersion) verdictVersion = 'regression';
      else verdictVersion = 'stable';
    }
    const problemes = verifierInvariants(miroir);

    legend.dataset.v2e046Miroir = canon;
    legend.dataset.v2e046Empreinte = signature;
    legend.dataset.v2e046Diff = difference;
    legend.dataset.v2e046Invariants = String(problemes.length);
    legend.dataset.v2e046Version = verdictVersion;

    ligneMiroir.textContent = 'Miroir : ' + canon + '.';
    ligneEmpreinte.textContent = 'Empreinte : ' + signature + '.';
    ligneDiff.textContent = 'Différence : ' + difference + '.';
    ligneInvariants.textContent = 'Invariants : '
      + (problemes.length ? problemes.join(', ') : 'respectés') + '.';
    ligneVersion.textContent = 'Version : ' + miroir.version + ' (' + verdictVersion + ').';
    ligneJournal.textContent = 'Journal : ' + texteJournal() + '.';

    precedent = miroir;
    derniereVersion = miroir.version;
    return { miroir, canon, signature, difference, verdictVersion, problemes };
  }

  /* Premier relevé : il fixe la référence de différence et de version. */
  actualiser();

  /* E046-08 — sélection sémantique : un bouton nommé par le libellé de l'entrée
     déclenche le gestionnaire réel par un clic, sans dupliquer la machine à
     états de la passe 1. Le compteur de version est lu avant et après. */
  entrees.slice(0, 8).forEach((entree, index) => {
    const libelle = entree.dataset.e046Court || texteDe(entree).split(/\s+/)[0] || ('Entrée ' + (index + 1));
    const bouton = assurer('v2e046-cible-' + index, 'button', 'v2e046-btn', tableau);
    bouton.type = 'button';
    bouton.textContent = 'Aller à : ' + libelle;
    bouton.setAttribute('aria-label', 'Sélectionner l’entrée de légende ' + libelle);
    if (bouton.dataset.v2e046Lier === '1') return;
    bouton.dataset.v2e046Lier = '1';
    bouton.addEventListener('click', () => {
      const cible = entrees[index];
      if (!cible || typeof cible.click !== 'function') {
        dire('Cible de légende indisponible.');
        return;
      }
      const avant = lireMiroir();
      journaliser('Sélection sémantique', libelle);
      enAction = true;
      try { cible.click(); } finally { enAction = false; }
      const apres = actualiser();
      dire('Sélection sémantique : ' + libelle + '. Version ' + avant.version
        + ' puis ' + apres.miroir.version + '.');
    });
  });

  /* E046-07 — témoin de référence : capture d'un état gelé, puis comparaison
     par différence de champs. Le témoin vit dans une variable locale, jamais
     dans un stockage externe, et il est remplacable à chaque capture. */
  const fixer = assurer('v2e046-fixer', 'button', 'v2e046-btn', tableau);
  fixer.type = 'button';
  fixer.textContent = 'Fixer le témoin';
  const comparer = assurer('v2e046-comparer', 'button', 'v2e046-btn', tableau);
  comparer.type = 'button';
  comparer.textContent = 'Comparer au témoin';
  if (fixer.dataset.v2e046Lier !== '1') {
    fixer.dataset.v2e046Lier = '1';
    fixer.addEventListener('click', () => {
      temoin = lireMiroir();
      journaliser('Témoin fixé', 'version ' + temoin.version);
      legend.dataset.v2e046Temoins = 'fixe';
      ligneTemoins.textContent = 'Témoin : version ' + temoin.version + ' enregistrée.';
      dire('Témoin fixé à la version ' + temoin.version + '.');
    });
  }
  if (comparer.dataset.v2e046Lier !== '1') {
    comparer.dataset.v2e046Lier = '1';
    comparer.addEventListener('click', () => {
      if (!temoin) {
        legend.dataset.v2e046Temoins = 'absent';
        dire('Aucun témoin fixé.');
        return;
      }
      const courant = lireMiroir();
      const ecarts = CHAMPS.filter(champ => temoin[champ] !== courant[champ]);
      const verdict = ecarts.length ? 'different' : 'identique';
      legend.dataset.v2e046Temoins = verdict;
      ligneTemoins.textContent = 'Témoin : ' + verdict
        + (ecarts.length ? ' (' + ecarts.join(', ') + ')' : '') + '.';
      journaliser('Comparaison au témoin', verdict);
      dire('Comparaison au témoin : ' + verdict
        + (ecarts.length ? ', champs ' + ecarts.join(', ') : '') + '.');
    });
  }

  /* E046-10 — bascule de mode audit (commande indépendante, aria-pressed
     légitime) et bilan consolidé : le bouton de diagnostic relit le miroir,
     les invariants, l'empreinte, la différence et la version. */
  const audit = assurer('v2e046-audit', 'button', 'v2e046-btn', tableau);
  audit.type = 'button';
  audit.setAttribute('aria-pressed', 'false');
  audit.textContent = 'Afficher le détail de supervision';
  const diagnostic = assurer('v2e046-diagnostic', 'button', 'v2e046-btn', tableau);
  diagnostic.type = 'button';
  diagnostic.textContent = 'Lancer le diagnostic';
  if (audit.dataset.v2e046Lier !== '1') {
    audit.dataset.v2e046Lier = '1';
    audit.addEventListener('click', () => {
      const ouvert = tableau.classList.toggle('v2e046-ouvert');
      audit.setAttribute('aria-pressed', ouvert ? 'true' : 'false');
      audit.textContent = ouvert
        ? 'Masquer le détail de supervision'
        : 'Afficher le détail de supervision';
      journaliser('Mode audit', ouvert ? 'ouvert' : 'ferme');
      dire('Mode audit ' + (ouvert ? 'activé' : 'désactivé') + '.');
    });
  }
  if (diagnostic.dataset.v2e046Lier !== '1') {
    diagnostic.dataset.v2e046Lier = '1';
    diagnostic.addEventListener('click', () => {
      const resultat = actualiser();
      const problemes = resultat.problemes;
      const verdict = problemes.length ? 'anomalies : ' + problemes.join(', ') : 'invariants respectés';
      legend.dataset.v2e046Diagnostic = problemes.length ? 'anomalie' : 'conforme';
      ligneBilan.textContent = 'Bilan : ' + verdict + '. Empreinte ' + resultat.signature
        + '. Différence ' + resultat.difference + '. Version ' + resultat.miroir.version
        + ' (' + resultat.verdictVersion + ').';
      journaliser('Diagnostic', verdict);
      dire('Diagnostic : ' + verdict + '.');
    });
  }

  /* L'appel ci-dessus alimente le relevé affiché du journal. */
  journaliser('Ouverture de la supervision', '');

  /* Les résultats des chantiers 03 à 06 sont calculés par actualiser() et
     publiés dans les lignes du tableau ainsi que dans les attributs
     data-v2e046-*, sans dépendre d'un rafraîchissement externe. */
  const surChangement = () => {
    const resultat = actualiser();
    if (enAction || resultat.difference === 'aucun'
        || resultat.difference === 'observation initiale') return;
    dire('État observé modifié : ' + resultat.difference
      + '. Version ' + resultat.miroir.version + '.');
  };
  const precedentObservateur = observateurs.get(legend);
  if (precedentObservateur) {
    legend.removeEventListener('click', precedentObservateur);
    legend.removeEventListener('keyup', precedentObservateur);
  }
  observateurs.set(legend, surChangement);
  legend.addEventListener('click', surChangement);
  legend.addEventListener('keyup', surChangement);

  /* Repli mouvement réduit : la préférence est fournie par l'hôte, sans sonde
     propre ni animation. Le tableau reste lisible sans JavaScript. */
  let reduit = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduit = !!ctx.reducedMotion(); } catch (erreur) { reduit = false; }
  }
  if (reduit) {
    tableau.classList.add('v2e046-steady');
    legend.dataset.v2e046Motion = 'reduit';
  } else {
    tableau.classList.remove('v2e046-steady');
    legend.dataset.v2e046Motion = 'complet';
  }
});
