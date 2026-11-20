import { register } from './registry.js';

/* Lentille V2 E027 — diagnostic textuel avancé des lunes (points vérifiés) de la
   vue Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau, sans source aléatoire et sans minuteur ni boucle d'animation
   propre. Préfixe exclusif : v2e027 (aucune collision avec la passe 1). */
register('E027', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique : texte masqué, contour de focus renforcé et repli
     « mouvement réduit ». Aucune information n'est portée par la seule couleur. */
  css('constellation-v2-e027', `
.v2e027-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.constellation-layout .const-moon:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.v2e027-calm .const-moon{transition:none}
.v2e027-digest summary{min-height:36px;display:flex;align-items:center;cursor:pointer;color:var(--gold-bright);font-size:9px}
.v2e027-digest summary:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
@media (prefers-reduced-motion: reduce){.const-moon{transition:none!important}}
`);

  const doc = layout.ownerDocument || document;
  const creer = (tag, cls, texte) => {
    if (typeof ctx.el === 'function') return ctx.el(tag, cls, texte);
    const noeud = doc.createElement(tag);
    if (cls) noeud.className = cls;
    if (texte !== undefined) noeud.textContent = texte;
    return noeud;
  };

  const lunes = Array.from(layout.querySelectorAll('.const-moon'))
    .filter(m => !m.dataset.constKey || m.dataset.constKey.indexOf('moon:') === 0);
  if (!lunes.length) return;

  const caption = layout.querySelector('.constellation-caption') || layout;
  const ancrer = noeud => { caption.appendChild(noeud); return noeud; };
  const accord = (n, singulier, pluriel) => `${n} ${n > 1 ? pluriel : singulier}`;
  const focusSansDefilement = noeud => {
    if (noeud && typeof noeud.focus === 'function') noeud.focus({ preventScroll: true });
  };

  /* Lecture autonome du balisage d'origine : la V2 ne dépend d'aucun attribut
     posé par la passe 1 et reste lisible sur un DOM incomplet. */
  const normaliser = valeur => String(valeur || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const lireType = lune => (lune.getAttribute('data-label') || '').split('·')[0].trim() || 'point';
  const lireConfiance = lune => {
    const champs = [lune.getAttribute('title') || '', lune.getAttribute('aria-label') || ''];
    for (const champ of champs) {
      const trouve = champ.match(/confiance\s+([^,·;]+)/i);
      if (trouve) return trouve[1].trim();
    }
    return 'non précisée';
  };
  const lireSources = lune => {
    const label = lune.getAttribute('data-label') || '';
    const court = label.match(/·\s*(\d+)\s*src/i);
    if (court) return Number(court[1]);
    const titre = lune.getAttribute('title') || '';
    if (/aucune source associée/i.test(titre)) return 0;
    const long = titre.match(/(\d+)\s+source/i);
    return long ? Number(long[1]) : 0;
  };
  const VOCABULAIRE = [
    ['certain', 'établi', 'Fait établi, sans réserve.'],
    ['vérifié', 'vérifié', 'Confirmé par une source fiable.'],
    ['probable', 'à confirmer', 'Vraisemblable, mais non confirmé.'],
    ['disputed', 'contesté', 'Des sources divergentes se contredisent.'],
    ['non documenté', 'non étayé', 'Aucune source locale ne l’atteste.'],
  ];
  const verdictPour = confiance => {
    const valeur = normaliser(confiance);
    for (const entree of VOCABULAIRE) {
      if (valeur.indexOf(entree[0]) >= 0) return entree[1];
    }
    return 'à qualifier';
  };
  const etats = lunes.map(lune => {
    const confiance = lireConfiance(lune);
    return {
      type: lireType(lune),
      confiance,
      verdict: verdictPour(confiance),
      sources: lireSources(lune),
    };
  });
  const total = lunes.length;
  const sourceLabel = n => (n ? accord(n, 'source', 'sources') : 'aucune source');

  /* E027-01 — Ratio de couverture documentaire calculé puis verbaliser, avec
     une référence explicite (100 % = toutes les lunes étayées). */
  const etayees = etats.filter(etat => etat.sources > 0).length;
  const pourcentage = Math.round((etayees * 100) / total);
  const couverture = creer('p', 'v2e027-coverage',
    `Couverture documentaire : ${accord(etayees, 'lune', 'lunes')} sur ${total} disposent d’au moins une source locale, soit ${pourcentage} % ; 100 % signifierait toutes les lunes étayées.`);
  couverture.id = 'v2e027-coverage';
  ancrer(couverture);
  layout.dataset.v2e027Coverage = `${etayees}/${total}`;

  /* E027-02 — Histogramme textuel des confiances : une barre pleine par lune,
     aucun code couleur, donc lisible même sans styles. */
  const oranges = VOCABULAIRE.map(entree => entree[1]).concat('à qualifier');
  const parties = oranges.map(verdict => {
    const n = etats.filter(etat => etat.verdict === verdict).length;
    return `${verdict} ${'█'.repeat(n)}${n ? '' : '·'} (${n})`;
  });
  const histogramme = creer('p', 'v2e027-histogram',
    `Répartition des confiances en barres de texte (une barre = une lune) : ${parties.join(' · ')}.`);
  histogramme.id = 'v2e027-histogram';
  ancrer(histogramme);

  /* E027-03 — Annuaire des lunes regroupées par type, ordre alphabétique
     déterministe et départage par l'index de la lune. */
  const groupes = new Map();
  etats.forEach((etat, i) => {
    const cle = normaliser(etat.type) || 'point';
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle).push(i);
  });
  const annuaire = creer('ul', 'v2e027-directory');
  annuaire.id = 'v2e027-directory';
  Array.from(groupes.keys()).sort().forEach(cle => {
    const indexes = groupes.get(cle);
    annuaire.appendChild(creer('li', '',
      `Type « ${etats[indexes[0]].type} » : lunes ${indexes.map(i => i + 1).join(', ')} — ${accord(indexes.length, 'point', 'points')}.`));
  });
  ancrer(annuaire);

  /* E027-04 — Dossier textuel publié au focus d'une lune dans une région live
     distincte de l'annonce de sélection de la passe 1. */
  const dossier = creer('p', 'v2e027-sr', '');
  dossier.id = 'v2e027-focus-live';
  dossier.setAttribute('role', 'status');
  dossier.setAttribute('aria-live', 'polite');
  dossier.setAttribute('aria-atomic', 'true');
  ancrer(dossier);
  const coucheLunes = layout.querySelector('.const-layer-moons') || layout;
  coucheLunes.addEventListener('focusin', evenement => {
    const cible = evenement && evenement.target;
    const lune = cible && cible.nodeType === 1 && typeof cible.closest === 'function'
      ? cible.closest('.const-moon') : null;
    if (!lune || lunes.indexOf(lune) < 0) return;
    const rang = lunes.indexOf(lune);
    const etat = etats[rang];
    dossier.textContent = `Dossier lune ${rang + 1} : type ${etat.type}, confiance ${etat.confiance}, verdict ${etat.verdict}, ${sourceLabel(etat.sources)}. Placement décoratif.`;
  });

  /* E027-05 — Position canonique aria-posinset / aria-setsize : le rang réel
     dans la suite, distinct du classement par fiabilité de la passe 1. */
  lunes.forEach((lune, i) => {
    lune.setAttribute('aria-posinset', String(i + 1));
    lune.setAttribute('aria-setsize', String(total));
    lune.dataset.v2e027Pos = `${i + 1}/${total}`;
  });

  /* E027-06 — Vocabulaire de confiance en définition listée, relié à chaque
     lune par un aria-describedby enrichi sans écraser le précédent. */
  const lexique = creer('dl', 'v2e027-glossary');
  lexique.id = 'v2e027-glossary';
  VOCABULAIRE.forEach(([mot, verdict, definition]) => {
    lexique.appendChild(creer('dt', '', `${mot} — verdict ${verdict}`));
    lexique.appendChild(creer('dd', '', definition));
  });
  ancrer(lexique);
  lunes.forEach(lune => {
    const deja = (lune.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (deja.indexOf(lexique.id) < 0) {
      deja.push(lexique.id);
      lune.setAttribute('aria-describedby', deja.join(' '));
    }
  });

  /* E027-07 — Recensement des cas « à qualifier » dont le vocabulaire connu
     ne reconnaît pas le libellé de confiance. */
  const ambigus = etats.map((etat, i) => (etat.verdict === 'à qualifier' ? i : -1)).filter(i => i >= 0);
  const aQualifier = creer('p', 'v2e027-ambiguous',
    ambigus.length
      ? `À qualifier manuellement : ${ambigus.map(i => `lune ${i + 1} (confiance « ${etats[i].confiance} »)`).join(', ')}. Le vocabulaire connu ne couvre pas ces libellés.`
      : 'Aucun cas ambigu : toutes les confiances ont été reconnues par le vocabulaire.');
  aQualifier.id = 'v2e027-ambiguous';
  ancrer(aQualifier);
  layout.dataset.v2e027Ambiguous = String(ambigus.length);

  /* E027-08 — Extremes documentaires : le mieux et le moins étayé, départagés
     par l'index en cas d'égalité, donc identiques d'un rendu à l'autre. */
  let meilleur = 0;
  let pire = 0;
  etats.forEach((etat, i) => {
    if (etat.sources > etats[meilleur].sources) meilleur = i;
    if (etat.sources < etats[pire].sources) pire = i;
  });
  const extremes = creer('p', 'v2e027-extremes',
    `Point le mieux étayé : lune ${meilleur + 1} — ${etats[meilleur].type}, ${sourceLabel(etats[meilleur].sources)}. Point le moins étayé : lune ${pire + 1} — ${etats[pire].type}, ${sourceLabel(etats[pire].sources)}.`);
  extremes.id = 'v2e027-extremes';
  ancrer(extremes);

  /* E027-09 — Compte rendu repliable natif : récapitulatif textuel sans aucun
     gestionnaire ni minuteur, le résumé `<summary>` restant focusable. */
  const digest = creer('details', 'v2e027-digest');
  digest.id = 'v2e027-digest';
  digest.appendChild(creer('summary', '', 'Compte rendu textuel du diagnostic des lunes'));
  digest.appendChild(creer('p', '',
    `Diagnostic V2 : ${accord(total, 'lune', 'lunes')} — ${accord(etayees, 'lune étayée', 'lunes étayées')} (${pourcentage} %) — ${ambigus.length} cas à qualifier — vocabulaire : ${oranges.join(', ')}. Le détail par lune figure dans le dossier au focus et dans l’annuaire par type.`));
  ancrer(digest);

  /* E027-10 — Navigation Alt + flèches entre lunes, touches déclarées et focus
     sans défilement ; l'écouteur en capture est unique et nettoyé au rendu. */
  lunes.forEach(lune => {
    const jetons = (lune.getAttribute('aria-keyshortcuts') || '').split(/\s+/).filter(Boolean);
    ['Alt+ArrowLeft', 'Alt+ArrowRight'].forEach(jeton => {
      if (jetons.indexOf(jeton) < 0) jetons.push(jeton);
    });
    lune.setAttribute('aria-keyshortcuts', jetons.join(' '));
  });
  const NAV_KEY = '__v2e027_nav';
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    const precedent = window[NAV_KEY];
    if (typeof precedent === 'function' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('keydown', precedent, true);
    }
    const surTouche = evenement => {
      if (!evenement || evenement.defaultPrevented || evenement.ctrlKey || evenement.metaKey) return;
      if (!evenement.altKey) return;
      const cible = evenement.target;
      if (!cible || cible.nodeType !== 1 || typeof cible.matches !== 'function') return;
      if (!cible.matches('.const-moon')) return;
      const actuel = lunes.indexOf(cible);
      if (actuel < 0) return;
      const cle = evenement.key || '';
      let suivant = -1;
      if (cle === 'ArrowRight') suivant = (actuel + 1) % total;
      else if (cle === 'ArrowLeft') suivant = (actuel - 1 + total) % total;
      if (suivant < 0) return;
      evenement.preventDefault();
      evenement.stopPropagation();
      const destination = lunes[suivant];
      destination.dataset.v2e027Nav = cle === 'ArrowRight' ? 'suivante' : 'precedente';
      focusSansDefilement(destination);
    };
    window[NAV_KEY] = surTouche;
    window.addEventListener('keydown', surTouche, true);
  }

  /* Repli « mouvement réduit » : la classe sobre retire les transitions des
     lunes sans toucher au contour de focus, qui reste le même support visuel. */
  let sobre = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { sobre = !!ctx.reducedMotion(); } catch (erreur) { sobre = false; }
  }
  if (sobre) layout.classList.add('v2e027-calm');
  else layout.classList.remove('v2e027-calm');
});
