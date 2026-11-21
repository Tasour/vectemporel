import { register } from './registry.js';

/* V2 lentille E081 — Lisibilité et mesure de lecture (complément de la passe 1).
   Dix chantiers V2 neufs, distincts de ceux de la passe 1 : lectures chiffrées
   supplémentaires (temps de lecture attentif, charge chiffrée, phrase la plus
   longue, certitudes du fil, couverture du fil, longueur des libellés) et
   confort typographique ciblé (lettrine, tracée aérée, bloc de mesures,
   mouvement réduit). Tout est dérivé du DOM réel, jamais inventé.
   Tous non destructifs : sans ce module, la vue reste intégralement lisible.
   Préfixes : classes recit-v2-e081-, ids DOM v2-e081- (jamais e081- de la passe 1,
   qui tourne sur le même DOM). Zéro réseau, zéro console, zéro aléa.
   Aucun fichier partagé modifié. */

const CSS = `
/* E081-01 / 02 / 03 / 04 / 05 / 06 — lectures chiffrées : présentation du bloc. */
.recit-v2-e081-mesures{margin:8px 0;padding:7px 10px;border-left:2px solid rgba(230,185,111,.34);background:rgba(230,185,111,.05);border-radius:0 8px 8px 0}
.recit-v2-e081-readout{display:block;margin:3px 0;color:var(--ink-soft);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums;transition:opacity .18s linear}
.recit-v2-e081-readout:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
/* E081-01 — temps de lecture attentif mis en évidence. */
.recit-v2-e081-attentif{color:var(--gold-bright)}
/* E081-02 / E081-03 — mesures de densité du point. */
.recit-v2-e081-charge,
.recit-v2-e081-phrase{color:var(--ink)}
/* E081-07 — lettrine sur le résumé du repère. */
.recit-v2-e081-lettrine::first-letter{float:left;font-family:Georgia,'Times New Roman',serif;font-size:2.6em;line-height:.85;padding:2px 6px 0 0;color:var(--gold-bright)}
/* E081-08 — interlignage généreux de la traçabilité et des sources. */
.recit-layout .recit-v2-e081-trace .recit-trace p,
.recit-layout .recit-v2-e081-trace .recit-sources{line-height:1.7}
/* E081-09 — chiffres stables et focus du bloc de mesures V2 (voir E081-01..06). */
.recit-layout .recit-v2-e081-mesures .recit-v2-e081-readout{font-variant-numeric:tabular-nums}
/* E081-10 — confort : mouvement réduit des lectures chiffrées V2. */
.recit-layout[data-v2-e081-motion="reduce"] .recit-v2-e081-readout{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e081-readout{transition:none}}
`;

/* Ajoute une classe sans jamais écraser les autres classes du nœud. */
function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

/* Comptage de mots, identique à celui utilisé par la vue pour .recit-timing. */
function motsDe(texte) {
  const valeur = String(texte || '').trim();
  return valeur ? valeur.split(/\s+/).filter(Boolean).length : 0;
}

/* Libellé utile d'un item du fil : sans numéro initial ni étiquette de type. */
function libelleItem(item) {
  if (!item) return '';
  let texte = item.textContent || '';
  const type = item.querySelector ? item.querySelector('.thread-kind') : null;
  if (type && type.textContent) texte = texte.split(type.textContent).join(' ');
  return texte.replace(/^\s*\d+\.\s*/, '').trim();
}

/* Réutilise (par id) un paragraphe de synthèse visible, ou le crée. */
function assureParagraphe(bloc, id, classe) {
  let paragraphe = document.getElementById(id);
  if (!paragraphe || paragraphe.parentNode !== bloc) {
    paragraphe = el('p', `recit-v2-e081-readout ${classe}`);
    paragraphe.id = id;
    bloc.appendChild(paragraphe);
  }
  return paragraphe;
}

/* Dépose une mesure ; la retire proprement si la donnée source est absente. */
function setMesure(bloc, id, classe, texte) {
  if (!texte) {
    const existant = document.getElementById(id);
    if (existant && existant.parentNode === bloc && existant.remove) existant.remove();
    return;
  }
  const paragraphe = assureParagraphe(bloc, id, classe);
  paragraphe.textContent = texte;
}

/* Place le bloc avant le fil (ancre stable), en le réutilisant d'un rendu à l'autre. */
function placeBloc(corps, ancre, bloc) {
  if (!corps || typeof corps.insertBefore !== 'function') return;
  const cible = ancre && ancre.parentNode === corps ? ancre : null;
  if (bloc.parentNode !== corps || (cible && bloc.nextSibling !== cible)) {
    corps.insertBefore(bloc, cible);
  }
}

register('E081', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx || {};
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    if (typeof css !== 'function' || typeof el !== 'function') return;
    css('recit-v2-e081', CSS); /* un seul appel, toutes les règles du module. */

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    const titre = document.getElementById('recit-point-title') || corps.querySelector('.recit-title');
    const contexte = document.getElementById('recit-context') || corps.querySelector('.recit-context');
    const statut = document.getElementById('c3a-status') || corps.querySelector('.c3a-status');
    const thread = document.getElementById('c3a-thread') || corps.querySelector('.recit-thread-list');
    const ancreFil = corps.querySelector('.recit-thread');

    const textePoint = `${titre ? (titre.textContent || '') : ''}${contexte ? ` ${contexte.textContent || ''}` : ''}`.trim();
    const nbMots = motsDe(textePoint);
    const items = thread && typeof thread.querySelectorAll === 'function'
      ? Array.from(thread.querySelectorAll('.recit-thread-item')) : [];

    /* E081-01 — temps de lecture attentif (120 mots/min) comparé à 180 mots/min. */
    let attentif = '';
    if (nbMots > 0) {
      const lent = Math.max(1, Math.round((nbMots / 120) * 60));
      const courant = Math.max(1, Math.round((nbMots / 180) * 60));
      attentif = `Lecture attentive : ≈ ${lent} s à 120 mots/min, contre ≈ ${courant} s à 180 mots/min.`;
    }

    /* E081-02 — indice de charge chiffrée du point courant. */
    let charge = '';
    if (nbMots > 0) {
      const chiffres = (textePoint.match(/\d/g) || []).length;
      charge = `Charge chiffrée : ${chiffres} chiffre(s) relevé(s) dans ce point.`;
    }

    /* E081-03 — phrase la plus longue du point courant. */
    let phrase = '';
    let maxMots = 0;
    textePoint.split(/[.!?…]+/).forEach((segment) => {
      const n = motsDe(segment);
      if (n > maxMots) maxMots = n;
    });
    if (maxMots > 0) phrase = `Phrase la plus longue : ${maxMots} mot(s).`;

    /* E081-04 — répartition des degrés de certitude dans le fil (attribut réel). */
    let certitudes = '';
    if (items.length) {
      const NOMS = { 'vérifié': 'vérifié', 'certain': 'certain', 'probable': 'probable', 'disputed': 'contesté' };
      const comptes = { 'vérifié': 0, 'certain': 0, 'probable': 0, 'contesté': 0, 'autre': 0 };
      items.forEach((item) => {
        const brut = item.getAttribute ? (item.getAttribute('data-confidence') || '') : '';
        const cle = Object.prototype.hasOwnProperty.call(NOMS, brut) ? NOMS[brut] : 'autre';
        comptes[cle] += 1;
      });
      const parties = Object.keys(comptes).filter((c) => comptes[c] > 0)
        .map((c) => `${comptes[c]} ${c}`);
      certitudes = `Certitudes du fil : ${parties.length ? parties.join(' · ') : 'aucun point'}.`;
    }

    /* E081-05 — taux de couverture du fil, lu dans le statut réel. */
    let couverture = '';
    if (statut && statut.textContent) {
      const trouve = statut.textContent.match(/(\d+)\s*point\(s\)\s*affiché\(s\)\s*sur\s*(\d+)/i);
      if (trouve) {
        const affiches = parseInt(trouve[1], 10);
        const total = parseInt(trouve[2], 10);
        const pourcent = total ? Math.round((affiches / total) * 100) : 0;
        couverture = `Couverture du fil : ${affiches} sur ${total} affiché(s) (${pourcent} %).`;
      }
    }

    /* E081-06 — longueur moyenne des libellés du fil (charge de balayage). */
    let libelles = '';
    if (items.length) {
      let somme = 0;
      items.forEach((item) => { somme += motsDe(libelleItem(item)); });
      const moyenne = Math.round(somme / items.length);
      libelles = `Libellés du fil : ≈ ${moyenne} mot(s) par point en moyenne.`;
    }

    /* Bloc de synthèse unique, rempli puis déplacé à chaque rendu. */
    let mesures = document.getElementById('v2-e081-mesures');
    if (!mesures || typeof mesures.appendChild !== 'function') {
      mesures = el('div', 'recit-v2-e081-mesures');
      mesures.id = 'v2-e081-mesures';
    }
    if (mesures.textContent) mesures.textContent = '';
    setMesure(mesures, 'v2-e081-attentif', 'recit-v2-e081-attentif', attentif);
    setMesure(mesures, 'v2-e081-charge', 'recit-v2-e081-charge', charge);
    setMesure(mesures, 'v2-e081-phrase', 'recit-v2-e081-phrase', phrase);
    setMesure(mesures, 'v2-e081-certitudes', 'recit-v2-e081-certitudes', certitudes);
    setMesure(mesures, 'v2-e081-couverture', 'recit-v2-e081-couverture', couverture);
    setMesure(mesures, 'v2-e081-libelles', 'recit-v2-e081-libelles', libelles);
    placeBloc(corps, ancreFil, mesures);

    /* E081-07 — lettrine uniquement si le résumé commence par une lettre. */
    if (contexte && contexte.textContent && /^\p{L}/u.test(contexte.textContent.trim())) {
      ajouteClasse(contexte, 'recit-v2-e081-lettrine');
    }

    /* E081-08 — interlignage généreux de la traçabilité et des sources. */
    ajouteClasse(corps, 'recit-v2-e081-trace');

    /* E081-09 — le bloc applique chiffres tabulaires et focus (règles CSS dédiées). */

    /* E081-10 — mouvement réduit, lu une seule fois par rendu. */
    let reduit = false;
    if (reducedMotion && typeof reducedMotion === 'function') reduit = reducedMotion() === true;
    layout.setAttribute('data-v2-e081-motion', reduit ? 'reduce' : 'normal');
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
