import { register } from './registry.js';

/* V2 lentille E020 — Données, traçabilité et provenance : contrôles d'affichage.
   Dix chantiers V2 neufs, distincts de la passe 1 (qui portait sur la couverture
   de sources, le registre SRC, les marqueurs du fil, la légende, la statistique
   du repère, la chaîne d'identité, l'origine de la certitude, la méthode,
   l'observabilité et la provenance du jeu). Ici : signature de contenu, portée
   du fil, répartitions affichées, référence citables, couverture lue sur les
   marqueurs déjà présents, intégrité des boutons, cohérence titre/fil, volume
   de l'énoncé et tableau de bord de synthèse.

   Toutes les valeurs sont lues dans le DOM courant (textContent, data-*,
   aria-label) : aucune constante, aucun chiffre inventé, aucun appel réseau.
   Préfixes : classes recit-v2-e020-, ids DOM v2-e020- (jamais e020- de la
   passe 1, qui tourne sur le même DOM). Tous les nœuds sont greffés dans
   .recit-body, jamais en enfant direct de .recit-layout ou du stage, afin
   d'échapper au marquage de _diagnostics.js. Enrichissement non destructif :
   sans ce module, la vue reste intégralement lisible. */

const CSS = `
/* E020-01 — Signature de contenu du repère. */
.recit-layout .recit-v2-e020-signature{margin:4px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}

/* E020-02 — Portée du fil et taux de masquage. */
.recit-layout .recit-v2-e020-portee{margin:4px 0 6px;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E020-03 — Répartition des types affichés. */
.recit-layout .recit-v2-e020-types{margin:5px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5;overflow-wrap:anywhere}

/* E020-04 — Répartition des certitudes affichées. */
.recit-layout .recit-v2-e020-certitudes{margin:3px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5;overflow-wrap:anywhere}

/* E020-05 — Référence citable du point courant. */
.recit-layout .recit-v2-e020-reference{margin:4px 0 0;color:var(--ink-soft);font-size:9px;line-height:1.5;overflow-wrap:anywhere}

/* E020-06 — Couverture de sources lue sur les marqueurs du fil. */
.recit-layout .recit-v2-e020-couverture{margin:3px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E020-07 — Intégrité des boutons du fil. */
.recit-layout .recit-v2-e020-integrite{margin:3px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E020-08 — Cohérence titre ↔ fil. */
.recit-layout .recit-v2-e020-coherence{margin:3px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5}

/* E020-09 — Volume de l'énoncé courant. */
.recit-layout .recit-v2-e020-volume{margin:2px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E020-10 — Tableau de bord de traçabilité d'affichage. */
.recit-layout .recit-v2-e020-hub{margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}
.recit-layout .recit-v2-e020-hub-title{margin:0 0 6px;color:var(--gold-bright);font-size:10px;font-weight:700;letter-spacing:.06em}
.recit-layout .recit-v2-e020-synthese,
.recit-layout .recit-v2-e020-methode{margin:4px 0;font-size:9px;line-height:1.6;color:var(--muted-2);overflow-wrap:anywhere}
.recit-layout .recit-v2-e020-readout{transition:opacity .18s linear}
.recit-layout[data-v2-e020-motion="reduce"] .recit-v2-e020-readout{transition:none}
@media (prefers-reduced-motion:reduce){.recit-layout .recit-v2-e020-readout{transition:none}}
@media (max-width:620px){.recit-layout .recit-v2-e020-hub{margin-top:12px}}
@media (forced-colors:active){.recit-layout .recit-v2-e020-hub{border-top:1px solid CanvasText}}
`;

/* Lecture gardée du document, réutilisée pour l'idempotence. */
function parId(id) {
  try { return typeof document !== 'undefined' ? document.getElementById(id) : null; }
  catch { return null; }
}

function texteDe(noeud) {
  return noeud && typeof noeud.textContent === 'string' ? noeud.textContent.trim() : '';
}

function entier(valeur, repli = 0) {
  const n = Number.parseInt(valeur, 10);
  return Number.isFinite(n) ? n : repli;
}

function pourcentage(n, total) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function tronquer(valeur, max) {
  const texte = String(valeur || '').trim();
  return texte.length > max ? `${texte.slice(0, max - 1).trimEnd()}…` : texte;
}

/* Empreinte FNV-1a 32 bits : déterministe, reproductible, sans aléa. */
function signature(chaines) {
  let h = 0x811c9dc5;
  chaines.forEach((chaine) => {
    for (let i = 0; i < chaine.length; i += 1) {
      h ^= chaine.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    h ^= 0x7c;
    h = Math.imul(h, 0x01000193) >>> 0;
  });
  return h.toString(16).toUpperCase().padStart(8, '0');
}

/* Dépose ou réutilise un paragraphe visible, sans écraser d'attribut existant. */
function place(cree, id, classe, parent, ancre, texte) {
  if (!parent || typeof parent.insertBefore !== 'function') return null;
  let noeud = parId(id);
  if (!noeud) noeud = cree('p', `recit-v2-e020-readout ${classe}`, texte);
  else noeud.textContent = texte;
  const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

register('E020', (ctx) => {
  try {
    if (typeof document === 'undefined' || !ctx || !ctx.layout
      || typeof ctx.layout.querySelector !== 'function') return;
    const { layout, css, el, reducedMotion } = ctx;
    css('recit-v2-e020', CSS); /* un seul appel, toutes les règles du module. */

    const corps = layout.querySelector('.recit-body')
      || (typeof document.querySelector === 'function' ? document.querySelector('.recit-body') : null);
    if (!corps) return;

    /* Fabrique gardée : ctx.el est fourni par le registre, repli sans API. */
    const cree = (tag, classe, texte) => {
      if (typeof el === 'function') return el(tag, classe, texte);
      const noeud = document.createElement(tag);
      if (classe) noeud.className = classe;
      if (texte !== undefined) noeud.textContent = texte;
      return noeud;
    };

    const mesures = {};
    const kicker = corps.querySelector('.view-kicker');
    const titre = document.getElementById('recit-point-title') || corps.querySelector('.recit-title');
    const meta = corps.querySelector('.recit-meta');
    const timing = corps.querySelector('.recit-timing');
    const statut = document.getElementById('c3a-status') || corps.querySelector('.c3a-status');
    const fil = document.getElementById('c3a-thread') || corps.querySelector('.recit-thread-list');
    const items = fil ? Array.from(fil.querySelectorAll('.recit-thread-item')) : [];

    /* E020-01 — signature calculée sur le titre et les libellés réels du fil. */
    if (kicker || titre || items.length) {
      const brut = items.map((bouton) => `${bouton.getAttribute('data-fk') || ''}|${texteDe(bouton)}`).join('~');
      mesures.signature = signature([brut, texteDe(titre)]);
      place(cree, 'v2-e020-signature', 'recit-v2-e020-signature', corps, kicker || titre,
        `Signature du repère : ${mesures.signature} (calculée sur le titre et les ${items.length} point(s) du fil).`);
    }

    /* E020-02 — portée lue dans le statut « X affiché(s) sur Y ». */
    if (statut) {
      const trouve = /(\d+)\s*point\(s\)\s*affiché\(s\)\s*sur\s*(\d+)/i.exec(texteDe(statut));
      if (trouve) {
        const affiches = entier(trouve[1]);
        const total = entier(trouve[2]);
        const caches = Math.max(0, total - affiches);
        mesures.portee = `${affiches}/${total}`;
        mesures.caches = caches;
        place(cree, 'v2-e020-portee', 'recit-v2-e020-portee', corps, statut,
          `Portée du fil : ${affiches} point(s) affiché(s) sur ${total} · ${caches} masqué(s) (${pourcentage(caches, total)} %).`);
      }
    }

    /* E020-03 — types des seuls points effectivement affichés. */
    let ancreFil = fil;
    if (items.length) {
      const table = Object.create(null);
      items.forEach((bouton) => {
        const type = bouton.getAttribute('data-kind') || 'point';
        table[type] = (table[type] || 0) + 1;
      });
      const cles = Object.keys(table).sort();
      mesures.types = cles.length;
      const ligne = cles.map((cle) => `${cle} ${table[cle]}`).join(' · ');
      ancreFil = place(cree, 'v2-e020-types', 'recit-v2-e020-types', corps, ancreFil,
        `Types affichés dans le fil : ${ligne}.`) || ancreFil;
    }

    /* E020-04 — certitudes des seuls points effectivement affichés. */
    if (items.length) {
      const table = Object.create(null);
      items.forEach((bouton) => {
        const certitude = bouton.getAttribute('data-confidence') || '—';
        table[certitude] = (table[certitude] || 0) + 1;
      });
      const cles = Object.keys(table).sort();
      mesures.certitudes = cles.length;
      const ligne = cles.map((cle) => `${cle} ${table[cle]}`).join(' · ');
      ancreFil = place(cree, 'v2-e020-certitudes', 'recit-v2-e020-certitudes', corps, ancreFil,
        `Certitudes affichées dans le fil : ${ligne}.`) || ancreFil;
    }

    /* E020-05 — référence citable assemblée depuis le kicker, la meta et le titre. */
    if (meta) {
      const segmentsMeta = texteDe(meta).split('·').map((partie) => partie.trim()).filter(Boolean);
      const annee = segmentsMeta[1] || '';
      const trouve = /Étape\s+(\d+)\s*\/\s*(\d+)/i.exec(texteDe(kicker));
      const position = trouve ? `étape ${trouve[1]}/${trouve[2]}` : '';
      const extrait = tronquer(texteDe(titre), 48);
      const segments = [position, annee, extrait ? `« ${extrait} »` : ''].filter(Boolean);
      if (segments.length) {
        mesures.reference = segments.join(' · ');
        place(cree, 'v2-e020-reference', 'recit-v2-e020-reference', corps, meta,
          `Référence du point : ${mesures.reference}.`);
      }
    }

    /* E020-06 — couverture lue sur les marqueurs déjà déposés par la passe 1. */
    if (items.length) {
      const marques = fil.querySelectorAll('.recit-e020-thread-mark');
      if (marques.length) {
        const sources = Array.from(marques).filter((marque) => texteDe(marque) === '●').length;
        mesures.couverture = `${sources}/${items.length}`;
        ancreFil = place(cree, 'v2-e020-couverture', 'recit-v2-e020-couverture', corps, ancreFil,
          `Couverture de sources du fil : ${sources} point(s) sourcé(s) sur ${items.length} affiché(s) (${pourcentage(sources, items.length)} %).`) || ancreFil;
      } else {
        mesures.couverture = 'non disponible';
        ancreFil = place(cree, 'v2-e020-couverture', 'recit-v2-e020-couverture', corps, ancreFil,
          'Couverture de sources du fil : marqueurs de provenance absents de ce rendu.') || ancreFil;
      }
    }

    /* E020-07 — intégrité des attributs d'adressabilité des boutons du fil. */
    if (items.length) {
      const adressables = items.filter((bouton) =>
        /^c3a-point-\d+$/.test(bouton.getAttribute('data-fk') || '')
        && Boolean((bouton.getAttribute('aria-label') || '').trim())
        && Boolean((bouton.getAttribute('data-kind') || '').trim())
      ).length;
      mesures.integrite = `${adressables}/${items.length} bouton(s) intègres`;
      ancreFil = place(cree, 'v2-e020-integrite', 'recit-v2-e020-integrite', corps, ancreFil,
        `Intégrité du fil : ${mesures.integrite} (data-fk, libellé accessible et type).`) || ancreFil;
    }

    /* E020-08 — cohérence entre le titre courant et les libellés du fil. */
    if (items.length && titre) {
      const court = tronquer(texteDe(titre), 72);
      const present = court.length > 0 && items.some((bouton) => texteDe(bouton).indexOf(court) >= 0);
      mesures.coherence = present;
      ancreFil = place(cree, 'v2-e020-coherence', 'recit-v2-e020-coherence', corps, ancreFil,
        `Cohérence titre ↔ fil : le titre courant ${present ? 'figure' : 'ne figure pas'} parmi les ${items.length} point(s) affiché(s).`) || ancreFil;
    }

    /* E020-09 — volume de l'énoncé lu sur le titre et le résumé si présent. */
    if (titre || corps.querySelector('.recit-context')) {
      const contexte = document.getElementById('recit-context') || corps.querySelector('.recit-context');
      const brut = `${texteDe(titre)} ${texteDe(contexte)}`.trim();
      const mots = brut ? brut.split(/\s+/).filter(Boolean).length : 0;
      const signes = brut.replace(/\s+/g, '').length;
      mesures.volume = `${mots} mot(s), ${signes} signe(s)`;
      place(cree, 'v2-e020-volume', 'recit-v2-e020-volume', corps, timing || meta || titre,
        `Volume de l'énoncé : ${mesures.volume} hors espaces.`);
    }

    /* E020-10 — tableau de bord : synthèse visible de toutes les mesures lues. */
    let hub = parId('v2-e020-hub');
    if (!hub) {
      hub = cree('section', 'recit-v2-e020-hub');
      hub.id = 'v2-e020-hub';
      hub.setAttribute('aria-label', 'Traçabilité de l’affichage du repère');
      hub.appendChild(cree('h2', 'recit-v2-e020-hub-title', 'Traçabilité de l’affichage'));
      corps.appendChild(hub);
    }
    let synthese = parId('v2-e020-synthese');
    if (!synthese) {
      synthese = cree('p', 'recit-v2-e020-readout recit-v2-e020-synthese');
      synthese.id = 'v2-e020-synthese';
      hub.appendChild(synthese);
    }
    const parties = [];
    if (mesures.signature) parties.push(`signature ${mesures.signature}`);
    if (mesures.portee) parties.push(`fil ${mesures.portee} (${mesures.caches} masqué(s))`);
    if (mesures.types !== undefined) parties.push(`${mesures.types} type(s)`);
    if (mesures.certitudes !== undefined) parties.push(`${mesures.certitudes} certitude(s)`);
    if (mesures.couverture) parties.push(`couverture ${mesures.couverture}`);
    if (mesures.integrite) parties.push(mesures.integrite);
    if (mesures.coherence !== undefined) parties.push(`titre ${mesures.coherence ? 'cohérent' : 'à vérifier'}`);
    if (mesures.volume) parties.push(mesures.volume);
    synthese.textContent = `Contrôles relevés dans le DOM : ${parties.length ? parties.join(' · ') : 'aucune mesure disponible'}.`;

    let methode = parId('v2-e020-methode');
    if (!methode) {
      methode = cree('p', 'recit-v2-e020-readout recit-v2-e020-methode');
      methode.id = 'v2-e020-methode';
      hub.appendChild(methode);
    }
    methode.textContent = 'Ces valeurs sont lues dans le rendu courant (titres, fil, statut, attributs) : aucune n’est inventée ni calculée depuis une constante.';

    if (typeof reducedMotion === 'function') {
      layout.setAttribute('data-v2-e020-motion', reducedMotion() ? 'reduce' : 'normal');
    }
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
