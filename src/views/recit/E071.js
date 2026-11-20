import { register } from './registry.js';

/* Lentille E071 — Lisibilité et mesure de lecture (vue Récit).
 *
 * Dix chantiers E071-01 … E071-10, tous implémentés ici. Rapport détaillé :
 * UNIFIED_AUDIT/RECIT/views/E071.md. Lectures seules : src/views/recit.js,
 * src/views/recit/registry.js, src/views/recit/index.js.
 *
 * Une seule feuille de style (`recit-e071`), un seul enregistrement, des ids
 * préfixés `e071-`, des classes préfixées `recit-e071-`. Aucun appel réseau,
 * aucune sortie de débogage, aucune source d'aléa : chaque valeur est
 * recalculée depuis le texte et les styles réellement rendus par la vue.
 * Enrichissement strictement additif : sans JavaScript, la vue reste lisible.
 */

/* Feuille unique. Aucune règle ne masque du contenu existant ; aucune
   information n'est portée par la seule couleur. */
const CSS = `
.recit-layout .recit-e071-lisibilite{margin-left:8px;padding:1px 7px;border:1px solid var(--line-strong);border-radius:999px;color:var(--gold-bright);font-size:9px;white-space:nowrap;font-variant-numeric:tabular-nums}
.recit-layout .recit-e071-progression{margin:0 0 8px;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-layout .recit-e071-tableau{margin:8px 0 4px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.recit-layout .recit-e071-tableau-titre{margin:0 0 5px;color:var(--muted);font-size:9px;letter-spacing:.06em;text-transform:uppercase}
.recit-layout .recit-e071-mesure{margin:3px 0;color:var(--ink-soft);font-size:10px;line-height:1.5}
.recit-layout .recit-e071-valeur{color:var(--gold-bright);font-variant-numeric:tabular-nums}
.recit-layout .recit-e071-tronques{margin:6px 0;color:var(--muted-2);font-size:9px;line-height:1.5}
.recit-layout .recit-e071-effort{display:inline-block;margin-left:5px;padding:0 4px;border:1px solid var(--line);border-radius:4px;color:var(--muted-2);font-size:8px}
.recit-layout .recit-e071-effort-court{border-style:solid}
.recit-layout .recit-e071-effort-moyen{border-style:dashed}
.recit-layout .recit-e071-effort-long{border-style:double;border-width:3px}
.recit-layout .recit-e071-effort-legend{margin-top:6px}
.recit-layout[data-e071-motion="reduce"] .recit-e071-lisibilite,
.recit-layout[data-e071-motion="reduce"] .recit-e071-tableau,
.recit-layout[data-e071-motion="reduce"] .recit-e071-effort{transition:none}
@media (prefers-reduced-motion:reduce){
  .recit-layout .recit-e071-lisibilite,
  .recit-layout .recit-e071-tableau,
  .recit-layout .recit-e071-effort{transition:none}
}
@media print{
  .recit-layout .recit-e071-lisibilite,
  .recit-layout .recit-e071-tableau,
  .recit-layout .recit-e071-mesure,
  .recit-layout .recit-e071-progression,
  .recit-layout .recit-e071-tronques,
  .recit-layout .recit-e071-effort{color:#111;border-color:#777;background:none}
}
`;

/* --- Utilitaires de garde : aucune recherche ne doit pouvoir faire échouer
       le rendu, même sur une vue partiellement construite. --- */

function q(racine, selecteur) {
  return racine && typeof racine.querySelector === 'function'
    ? racine.querySelector(selecteur)
    : null;
}

function qa(racine, selecteur) {
  return racine && typeof racine.querySelectorAll === 'function'
    ? Array.from(racine.querySelectorAll(selecteur))
    : [];
}

function safe(action) {
  try { action(); }
  catch { /* une lentille défaillante ne casse jamais la vue. */ }
}

function cree(fabrique, balise, classe, texte) {
  try {
    let noeud;
    if (typeof fabrique === 'function') noeud = fabrique(balise, classe || undefined, texte);
    else {
      noeud = document.createElement(balise);
      if (classe) noeud.className = classe;
      if (texte !== undefined) noeud.textContent = texte;
    }
    return noeud || null;
  } catch { return null; }
}

function assure(parent, id, balise, classe, fabrique) {
  if (!parent || typeof parent.appendChild !== 'function' || !id) return null;
  const deja = typeof document !== 'undefined' ? document.getElementById(id) : null;
  if (deja) return deja.parentElement === parent ? deja : null;
  const noeud = cree(fabrique, balise, classe);
  if (!noeud) return null;
  noeud.id = id;
  try { parent.appendChild(noeud); }
  catch { return null; }
  return noeud;
}

function insereApres(noeud, reference, parent) {
  if (!noeud) return;
  if (reference && reference.parentNode === parent && typeof parent.insertBefore === 'function') {
    parent.insertBefore(noeud, reference.nextSibling);
  } else if (parent && typeof parent.appendChild === 'function') {
    parent.appendChild(noeud);
  }
}

function poserSiAbsent(noeud, attribut, valeur) {
  if (!noeud || typeof noeud.setAttribute !== 'function') return;
  if (typeof noeud.hasAttribute === 'function' && noeud.hasAttribute(attribut)) return;
  noeud.setAttribute(attribut, valeur);
}

/* --- Mesures déterministes, recalculées depuis le texte rendu. --- */

function mots(texte) {
  return String(texte || '').trim().split(/\s+/).filter(Boolean);
}

function nombreAvecVirgule(valeur, decimales = 1) {
  if (!Number.isFinite(valeur)) return '—';
  return valeur.toFixed(decimales).replace('.', ',');
}

function syllabesDuMot(mot) {
  let m = String(mot || '').toLowerCase().replace(/[^a-zàâçéèêëîïôùûüÿœæ]/g, '');
  if (!m) return 0;
  m = m.replace(/es$/, '').replace(/e$/, '');
  const groupes = m.match(/[aeiouyàâéèêëîïôùûüÿœæ]+/g);
  return groupes && groupes.length ? groupes.length : 1;
}

function analyseLisibilite(texte) {
  const liste = mots(texte);
  if (!liste.length) return { mots: 0, caracteres: 0, syllabes: 0, indice: null, bande: 'non mesurable' };
  const chaine = String(texte || '');
  const caracteres = chaine.length;
  const syllabes = liste.reduce((total, mot) => total + syllabesDuMot(mot), 0);
  const phrases = Math.max(1, (chaine.match(/[.!?]+/g) || []).length);
  const brut = 207 - 1.015 * (liste.length / phrases) - 73.6 * (syllabes / liste.length);
  const indice = Math.max(0, Math.min(100, Math.round(brut)));
  let bande = 'difficile';
  if (indice >= 60) bande = 'facile';
  else if (indice >= 45) bande = 'assez facile';
  else if (indice >= 30) bande = 'moyen';
  return { mots: liste.length, caracteres, syllabes, indice, bande };
}

/* Même borne que la vue : Estimation = max(4, min(12, ceil(mots / 3))). */
function secondesDeLecture(texte) {
  const nb = mots(texte).length;
  return Math.max(4, Math.min(12, Math.ceil(nb / 3)));
}

function dureeLisible(secondes) {
  const s = Math.max(0, Math.round(secondes));
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min ${s % 60} s`;
}

/* Le libellé accessible de l'item contient le texte intégral, contrairement
   au bouton dont le texte est abrégé par la vue. */
function texteIntegral(item) {
  const aria = item && typeof item.getAttribute === 'function'
    ? String(item.getAttribute('aria-label') || '') : '';
  const trouve = aria.match(/:\s*(.+)$/);
  if (trouve && trouve[1]) return trouve[1].trim();
  if (item && item.textContent) return String(item.textContent).trim().replace(/^\d+\.\s*/, '');
  return '';
}

function taillePx(valeur) {
  const trouve = String(valeur || '').match(/([0-9]+(?:\.[0-9]+)?)px/);
  return trouve ? parseFloat(trouve[1]) : null;
}

register('E071', (ctx) => {
  try {
    if (!ctx || typeof document === 'undefined') return;
    const { stage, layout, css, el, reducedMotion } = ctx;
    if (typeof css === 'function') css('recit-e071', CSS);
    const racine = layout || stage;
    if (!racine || typeof racine.querySelector !== 'function') return;
    if (typeof racine.hasAttribute === 'function' && racine.hasAttribute('data-e071-metrics')) return;

    const corps = q(racine, '.recit-body');
    const meta = q(racine, '.recit-meta');
    const titre = q(racine, '#recit-point-title') || q(racine, '.recit-title');
    const chrono = q(racine, '.recit-timing');
    const progression = q(racine, '.recit-progress');
    const remplissage = progression ? q(progression, 'span') : null;
    const kicker = q(racine, '.view-kicker');
    const contexte = q(racine, '#recit-context');
    const fil = q(racine, '.recit-thread');
    const liste = q(racine, '.recit-thread-list');
    const items = qa(liste, '.recit-thread-item');
    const legend = q(racine, '.recit-legend');

    /* Mesures partagées, calculées une seule fois par rendu. */
    const mesure = analyseLisibilite(titre && titre.textContent);
    const mentionTemps = String((chrono && chrono.textContent) || '')
      .match(/Lecture estimée\s*:\s*≈\s*(\d+)\s*s/i);
    const tempsAffiche = mentionTemps ? parseInt(mentionTemps[1], 10) : null;
    const tempsCalcule = secondesDeLecture(titre && titre.textContent);
    const motsParMinute = tempsCalcule > 0 ? Math.round((mesure.mots / tempsCalcule) * 60) : null;
    const etape = String((kicker && kicker.textContent) || '').match(/Étape\s+(\d+)\s*\/\s*(\d+)/i);
    const position = etape ? parseInt(etape[1], 10) : null;
    const totalEtape = etape ? parseInt(etape[2], 10) : null;
    let pourcentage = null;
    if (remplissage && remplissage.style && /width/.test(remplissage.style.width)) {
      pourcentage = parseInt(remplissage.style.width, 10);
    }
    if (!Number.isFinite(pourcentage)) {
      pourcentage = totalEtape ? Math.round(((position || 1) / totalEtape) * 100) : 0;
    }
    const cumulSecondes = items.reduce((total, item) => total + secondesDeLecture(texteIntegral(item)), 0);
    const abrèges = items.filter((item) => String((item && item.textContent) || '').indexOf('…') !== -1).length;
    let caracteresParLigne = null;
    safe(() => {
      if (!corps || !window || typeof window.getComputedStyle !== 'function') return;
      const largeur = typeof corps.clientWidth === 'number' ? corps.clientWidth : 0;
      const style = window.getComputedStyle(corps);
      const police = taillePx(style.fontSize);
      if (largeur > 0 && police > 0) caracteresParLigne = Math.round(largeur / (0.5 * police));
    });
    const cibleLigne = caracteresParLigne !== null
      && caracteresParLigne >= 60 && caracteresParLigne <= 75;
    let mouvementReduit = false;
    safe(() => { mouvementReduit = typeof reducedMotion === 'function' && !!reducedMotion(); });
    if (typeof racine.setAttribute === 'function') {
      racine.setAttribute('data-e071-motion', mouvementReduit ? 'reduce' : 'normal');
    }

    /* E071-01 — Indice de lisibilité approché du libellé courant. */
    safe(() => {
      if (!meta) return;
      const pastille = assure(meta, 'e071-lisibilite', 'span', 'recit-e071-lisibilite', el);
      if (!pastille) return;
      const texte = mesure.indice === null
        ? '◌ Lisibilité : non mesurable'
        : `◐ Lisibilité : ${mesure.indice}/100 · ${mesure.bande}`;
      pastille.textContent = texte;
      pastille.setAttribute('aria-label',
        `Lisibilité approchée du point courant : ${texte} (indice de Flesch simplifié, borné 0 à 100).`);
      pastille.setAttribute('title', 'Indice approché calculé depuis les mots et les syllabes du libellé affiché.');
    });

    /* E071-02 — Compteurs de mots, caractères et syllabes du point courant. */
    safe(() => {
      if (!corps) return;
      const tableau = assure(corps, 'e071-tableau', 'div', 'recit-e071-tableau', el);
      if (!tableau) return;
      const titreTableau = assure(tableau, 'e071-tableau-titre', 'p', 'recit-e071-tableau-titre', el);
      if (titreTableau) titreTableau.textContent = 'Mesure de lecture du point courant';
      tableau.setAttribute('role', 'group');
      tableau.setAttribute('aria-label', 'Mesures de lisibilité recalculées depuis le texte affiché');
      insereApres(tableau, chrono, corps);
      const ligne = assure(tableau, 'e071-compteurs', 'p', 'recit-e071-mesure', el);
      if (!ligne) return;
      const densite = mesure.mots ? nombreAvecVirgule(mesure.caracteres / mesure.mots) : '—';
      ligne.textContent = `Étendue du libellé : ${mesure.mots} mot(s) · ${mesure.caracteres} caractère(s) · `
        + `${mesure.syllabes} syllabe(s) · ${densite} caractère(s) par mot.`;
      ligne.setAttribute('aria-label', ligne.textContent);
    });

    /* E071-03 — Contrôle de l'estimation de lecture déjà affichée par la vue. */
    safe(() => {
      const tableau = q(racine, '#e071-tableau');
      if (!tableau) return;
      const ligne = assure(tableau, 'e071-controle-estimee', 'p', 'recit-e071-mesure', el);
      if (!ligne) return;
      const coherent = tempsAffiche !== null && tempsAffiche === tempsCalcule;
      const symbole = coherent ? '✓' : '!';
      const verbe = tempsAffiche === null ? 'estimation affichée introuvable' : 'estimation recalculée';
      ligne.textContent = `${symbole} Contrôle de l'estimation : ${verbe} — ${dureeLisible(tempsCalcule)} `
        + `pour ${mesure.mots} mot(s) · rythme implicite ${motsParMinute === null ? '—' : motsParMinute} mot(s)/min.`;
      ligne.setAttribute('aria-label', ligne.textContent);
    });

    /* E071-04 — Largeur de lecture mesurée en caractères par ligne. */
    safe(() => {
      const tableau = q(racine, '#e071-tableau');
      if (!tableau) return;
      const ligne = assure(tableau, 'e071-mesure-ligne', 'p', 'recit-e071-mesure', el);
      if (!ligne) return;
      const texte = caracteresParLigne === null
        ? '○ Largeur de lecture : non mesurable sur ce rendu.'
        : `${cibleLigne ? '✓' : '!'} Largeur de lecture : ≈ ${caracteresParLigne} caractère(s) par ligne `
          + `(cible 60 à 75) · ${cibleLigne ? 'dans la cible' : 'hors de la cible'}.`;
      ligne.textContent = texte;
      ligne.setAttribute('aria-label', texte);
    });

    /* E071-05 — Temps de lecture cumulé du repère affiché. */
    safe(() => {
      const tableau = q(racine, '#e071-tableau');
      if (!tableau) return;
      const ligne = assure(tableau, 'e071-cumul-lecture', 'p', 'recit-e071-mesure', el);
      if (!ligne) return;
      const texte = `Lecture complète du repère : ${dureeLisible(cumulSecondes)} pour `
        + `${items.length} point(s) affiché(s), somme des estimations de chaque libellé.`;
      ligne.textContent = texte;
      ligne.setAttribute('aria-label', texte);
    });

    /* E071-06 — Progression chiffrée et lisible, à côté de la barre. */
    safe(() => {
      if (!corps) return;
      const lecture = assure(corps, 'e071-progression', 'p',
        'recit-e071-progression', el);
      if (!lecture) return;
      const texte = `Progression de lecture : ${pourcentage} % · étape `
        + `${position === null ? '—' : position} sur ${totalEtape === null ? '—' : totalEtape}.`;
      lecture.textContent = texte;
      lecture.setAttribute('aria-label', texte);
      poserSiAbsent(progression, 'role', 'presentation');
      insereApres(lecture, progression, corps);
    });

    /* E071-07 — Contrôle typographique : taille et interligne du texte. */
    safe(() => {
      const tableau = q(racine, '#e071-tableau');
      if (!tableau) return;
      const ligne = assure(tableau, 'e071-typographie', 'p', 'recit-e071-mesure', el);
      if (!ligne) return;
      const parties = [];
      [['titre', titre], ['contexte', contexte]].forEach(([nom, noeud]) => {
        if (!noeud || !window || typeof window.getComputedStyle !== 'function') return;
        try {
          const style = window.getComputedStyle(noeud);
          const police = taillePx(style.fontSize);
          const interligne = taillePx(style.lineHeight);
          const ratio = police > 0 && interligne > 0 ? interligne / police : null;
          parties.push(`${nom} : ${police === null ? '—' : nombreAvecVirgule(police)} px, `
            + `interligne ${interligne === null ? '—' : nombreAvecVirgule(interligne)} px `
            + `(ratio ${ratio === null ? '—' : nombreAvecVirgule(ratio, 2)})`);
        } catch { /* style indisponible : mesure omise, sans erreur. */ }
      });
      ligne.textContent = parties.length
        ? `Typographie mesurée — ${parties.join(' ; ')}.`
        : 'Typographie : mesures indisponibles sur ce rendu.';
      ligne.setAttribute('aria-label', ligne.textContent);
    });

    /* E071-08 — Taux d'abrègement du fil : mesure de ce qui reste à lire. */
    safe(() => {
      if (!fil) return;
      const ligne = assure(fil, 'e071-tronques', 'p', 'recit-e071-tronques', el);
      if (!ligne) return;
      const part = items.length ? Math.round((abrèges / items.length) * 100) : 0;
      ligne.textContent = `Lisibilité du fil : ${abrèges} libellé(s) abrégé(s) sur ${items.length}, `
        + `soit ${part} % du repère affiché.`;
      ligne.setAttribute('aria-label', ligne.textContent);
      ligne.setAttribute('role', 'note');
    });

    /* E071-09 — Étiquette d'effort de lecture sur chaque point du fil. */
    safe(() => {
      items.forEach((item) => {
        if (!item || typeof item.appendChild !== 'function') return;
        try { if (item.dataset && item.dataset.e071Effort) return; } catch { /* jeu de données absent. */ }
        const nb = mots(texteIntegral(item)).length;
        let categorie = 'court';
        let marque = 'C';
        let libelle = 'Lecture courte';
        if (nb > 20) { categorie = 'long'; marque = 'L'; libelle = 'Lecture longue'; }
        else if (nb > 8) { categorie = 'moyen'; marque = 'M'; libelle = 'Lecture moyenne'; }
        const etiquette = cree(el, 'span', `recit-e071-effort recit-e071-effort-${categorie}`, marque);
        if (!etiquette) return;
        etiquette.setAttribute('title', `${libelle} : ${nb} mot(s).`);
        etiquette.setAttribute('aria-hidden', 'true');
        try { if (item.dataset) item.dataset.e071Effort = categorie; } catch { /* marquage facultatif. */ }
        try { item.appendChild(etiquette); } catch { /* aucun ajout possible. */ }
      });
      if (legend) {
        const ligne = assure(legend, 'e071-effort-legend', 'p',
          'recit-e071-effort-legend', el);
        if (ligne) {
          ligne.textContent = 'Effort de lecture dans le fil : C = court (8 mots ou moins), '
            + 'M = moyen (9 à 20 mots), L = long (plus de 20 mots), calculé sur le libellé entier.';
          ligne.setAttribute('aria-label', ligne.textContent);
        }
      }
    });

    /* E071-10 — Miroir de mesure : l'état complet est observable depuis le DOM. */
    safe(() => {
      if (typeof racine.setAttribute !== 'function') return;
      const jetons = [
        `mots:${mesure.mots}`,
        `car:${mesure.caracteres}`,
        `syll:${mesure.syllabes}`,
        `lisibilite:${mesure.indice === null ? '-' : mesure.indice}`,
        `lignes:${caracteresParLigne === null ? '-' : caracteresParLigne}`,
        `cumul:${cumulSecondes}s`,
        `progression:${pourcentage}%`,
        `abriges:${abrèges}/${items.length}`,
        `motion:${mouvementReduit ? 'reduce' : 'normal'}`,
        'css:1',
        'ids:11',
      ];
      racine.setAttribute('data-e071-metrics', jetons.join(' '));
    });
  } catch { /* neutralisation totale : la vue reste inchangée. */ }
});
