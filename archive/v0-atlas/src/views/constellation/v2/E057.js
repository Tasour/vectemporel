import { register } from './registry.js';

/* Lentille V2 E057 — diagnostic textuel avancé du focus et de la tabulation de
   la vue Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau, sans source aléatoire et sans minuteur ni boucle propre.
   Préfixe exclusif : v2e057 (aucune collision avec la passe 1). */

/* Sélecteur des arrêts candidats. Les tabindex négatifs sont filtrés plus bas,
   mais les tabindex positifs sont conservés afin d'être diagnostiqués (01). */
const SELECTEUR = 'button:not([disabled]), a[href], input:not([disabled]), '
  + 'select:not([disabled]), textarea:not([disabled]), [tabindex]';

/* Lecture défensive d'un libellé : aria-label, data-label, title, texte visible,
   puis repli explicite. Aucune information n'est inventée. */
function libelleV2(noeud) {
  if (!noeud || typeof noeud.getAttribute !== 'function') return 'contrôle sans libellé';
  const aria = noeud.getAttribute('aria-label');
  if (aria && aria.trim()) return aria.trim();
  const donnees = noeud.dataset && noeud.dataset.label ? String(noeud.dataset.label).trim() : '';
  if (donnees) return donnees;
  const titre = noeud.getAttribute('title');
  if (titre && titre.trim()) return titre.trim();
  const texte = typeof noeud.textContent === 'string' ? noeud.textContent.trim() : '';
  if (texte) return texte;
  return 'contrôle sans libellé';
}

/* Énumération des vrais arrêts : disabled, aria-hidden et tabindex négatif écartés. */
function arretsV2(racine) {
  if (!racine || typeof racine.querySelectorAll !== 'function') return [];
  return Array.from(racine.querySelectorAll(SELECTEUR)).filter(noeud => {
    if (noeud.hasAttribute('disabled') || noeud.getAttribute('aria-hidden') === 'true') return false;
    const ti = noeud.getAttribute('tabindex');
    if (ti !== null) {
      const n = Number.parseInt(ti, 10);
      if (Number.isFinite(n) && n < 0) return false;
    }
    return true;
  });
}

/* Normalisation sans dépendance : accents retirés, casse réduite, espaces bornés. */
function normaliseV2(texte) {
  return String(texte || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

/* Nature textuelle d'un arrêt, déduite de ses classes et de sa balise. */
function typeV2(noeud) {
  if (!noeud || !noeud.tagName) return 'élément';
  const balise = String(noeud.tagName).toLowerCase();
  const classe = typeof noeud.className === 'string' ? noeud.className : '';
  if (/\bconst-sun\b/.test(classe)) return 'ère';
  if (/\bconst-planet\b/.test(classe)) return 'repère';
  if (/\bconst-moon\b/.test(classe)) return 'point vérifié';
  if (balise === 'a') return 'lien';
  if (balise === 'button') return 'bouton';
  if (balise === 'input' || balise === 'select' || balise === 'textarea') return 'champ';
  return balise;
}

/* Accord singulier / pluriel réutilisé par les bilans chiffrés. */
function accordV2(n, singulier, pluriel) {
  return `${n} ${n > 1 ? pluriel : singulier}`;
}

/* Zone structurelle d'un arrêt, de la plus précise à la plus générale. */
function zoneV2(noeud) {
  if (!noeud || typeof noeud.closest !== 'function') return 'Autre';
  if (noeud.closest('.constellation-caption')) return 'Légende';
  if (noeud.closest('.constellation-field')) return 'Champ';
  if (noeud.closest('header, .constellation-header')) return 'En-tête';
  return 'Autre';
}

register('E057', ctx => {
  /* Garde d'entrée : sans layout exploitable, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;
  if (typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;

  const layout = ctx.layout;
  const doc = layout.ownerDocument || document;
  const helper = typeof ctx.el === 'function' ? ctx.el : null;
  const creer = (balise, classe, texte) => {
    if (helper) return helper(balise, classe, texte);
    const noeud = doc.createElement(balise);
    if (classe) noeud.className = classe;
    if (texte !== undefined) noeud.textContent = texte;
    return noeud;
  };

  /* Idempotence : un seul montage par nœud de layout, même si le greffon est
     réappliqué ; les panneaux d'un rendu antérieur sont retirés en amont. */
  if (layout.dataset && layout.dataset.v2e057Installe === 'oui') return;
  try {
    Array.from(layout.querySelectorAll('[id^="v2e057-"]')).forEach(noeud => {
      if (noeud && typeof noeud.remove === 'function') noeud.remove();
    });
  } catch (erreur) {
    /* DOM incomplet : on poursuit avec ce qui est disponible. */
  }

  /* Feuille unique de la lentille : aucune position n'est figée, aucune couleur
     comme seul vecteur, contour de focus natif préservé, repli mouvement réduit. */
  css('constellation-v2-e057', `
.v2e057-panel{margin-top:12px;padding:8px 10px;border:1px solid var(--line,#334);border-radius:8px;background:rgba(255,255,255,.02);color:var(--ink-soft,#cbd);font-size:9px;line-height:1.5}
.v2e057-panel summary{min-height:36px;display:flex;align-items:center;cursor:pointer;color:var(--gold-bright,#f4d69e);font:600 10px/1.4 inherit}
.v2e057-panel summary:focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.v2e057-readout{margin:0 0 4px;color:var(--muted,#9ab);font-variant-numeric:tabular-nums}
.v2e057-barre{position:relative;height:4px;margin:4px 0 8px;border-radius:4px;background:rgba(255,255,255,.10);overflow:hidden}
.v2e057-barre::after{content:"";position:absolute;inset:0 auto 0 0;width:var(--v2e057-pct,0%);background:var(--gold,#e6b96f)}
@media (prefers-reduced-motion: reduce){.v2e057-panel *{transition:none!important;animation:none!important}}
@media (max-width:620px){.v2e057-panel{font-size:10px}}
`);

  const arrets = arretsV2(layout);
  arrets.forEach((noeud, index) => noeud.setAttribute('data-v2e057-rang', String(index + 1)));

  /* E057-01 — Tabindex positifs : détection de l'ordre artificiel de Tab. */
  const positifs = arrets.filter(noeud => {
    const ti = noeud.getAttribute('tabindex');
    if (ti === null) return false;
    const n = Number.parseInt(ti, 10);
    return Number.isFinite(n) && n > 0;
  });
  positifs.forEach(noeud => {
    noeud.setAttribute('data-v2e057-tabindex-positif', noeud.getAttribute('tabindex') || '');
  });

  /* E057-02 — Arrêts masqués : boîte nulle ou style caché malgré la focalisation. */
  const vue = doc.defaultView || (typeof window !== 'undefined' ? window : null);
  const masques = arrets.filter(noeud => {
    if (typeof noeud.getBoundingClientRect !== 'function') return false;
    const rect = noeud.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return true;
    if (vue && typeof vue.getComputedStyle === 'function') {
      const style = vue.getComputedStyle(noeud);
      if (style && (style.display === 'none'
        || style.visibility === 'hidden' || style.visibility === 'collapse')) return true;
    }
    return false;
  });
  masques.forEach(noeud => noeud.setAttribute('data-v2e057-masque', 'oui'));

  /* E057-03 — Libellés dupliqués : ambiguïté des arrêts portant le même nom. */
  const vus = Object.create(null);
  const doublons = [];
  arrets.forEach(noeud => {
    const cle = normaliseV2(libelleV2(noeud));
    if (!cle) return;
    if (Object.prototype.hasOwnProperty.call(vus, cle)) {
      doublons.push(noeud);
      noeud.setAttribute('data-v2e057-doublon', 'oui');
    } else {
      vus[cle] = noeud;
    }
  });

  /* E057-09 — Répartition structurelle des arrêts par zone. */
  const zones = { 'En-tête': 0, Champ: 0, Légende: 0, Autre: 0 };
  arrets.forEach(noeud => {
    const zone = zoneV2(noeud);
    zones[zone] += 1;
    noeud.setAttribute('data-v2e057-zone', zone);
  });

  /* E057-10 — Indice de conformité et panneau de synthèse idempotent. */
  const etiquetes = arrets.filter(noeud => {
    const aria = noeud.getAttribute && noeud.getAttribute('aria-label');
    const donnees = noeud.dataset && noeud.dataset.label;
    return (aria && aria.trim()) || (donnees && String(donnees).trim());
  }).length;
  const criteres = [
    { nom: 'aucun tabindex positif', ok: positifs.length === 0 },
    { nom: 'aucun arrêt masqué', ok: masques.length === 0 },
    { nom: 'aucun libellé dupliqué', ok: doublons.length === 0 },
    { nom: 'tous les arrêts étiquetés', ok: etiquetes === arrets.length },
  ];
  const satisfaits = criteres.filter(critere => critere.ok).length;
  layout.dataset.v2e057Score = `${satisfaits}/${criteres.length}`;

  const panel = creer('details', 'v2e057-panel');
  panel.id = 'v2e057-diagnostic';
  panel.setAttribute('aria-label', 'Diagnostic V2 du focus et de la tabulation');
  panel.setAttribute('data-constellation-diagnostic', '');
  panel.appendChild(creer('summary', 'v2e057-resume',
    `Diagnostic V2 — focus et tabulation · conformité ${satisfaits}/${criteres.length}`));

  const lignes = [
    ['v2e057-ligne-01', `Tabindex positifs (ordre artificiel) : ${accordV2(positifs.length, 'arrêt', 'arrêts')} sur ${arrets.length}.`],
    ['v2e057-ligne-02', `Arrêts masqués ou de taille nulle : ${accordV2(masques.length, 'arrêt', 'arrêts')}.`],
    ['v2e057-ligne-03', `Libellés dupliqués : ${accordV2(doublons.length, 'libellé', 'libellés')}.`],
    ['v2e057-ligne-04', 'Dernier séjour mesuré : en attente d’un changement de focus.'],
    ['v2e057-ligne-05', 'Saut de parcours : en attente de deux focalisations successives.'],
    ['v2e057-ligne-06', `Couverture du parcours : 0 / ${arrets.length} arrêts distincts visités.`],
    ['v2e057-ligne-07', 'Focus programmatique hors liste : aucun constaté.'],
    ['v2e057-ligne-08', 'Reprise par le corps du document : aucun constaté.'],
    ['v2e057-ligne-09', `Zones : en-tête ${zones['En-tête']} · champ ${zones.Champ} · légende ${zones.Légende} · autre ${zones.Autre}.`],
    ['v2e057-ligne-10', `Conformité : ${satisfaits}/${criteres.length} critères satisfaits — ${criteres.map(c => `${c.nom} : ${c.ok ? 'oui' : 'non'}`).join(' · ')}.`],
  ];
  const dynamiques = ['v2e057-ligne-04', 'v2e057-ligne-05', 'v2e057-ligne-06', 'v2e057-ligne-07', 'v2e057-ligne-08'];
  lignes.forEach(([id, texte]) => {
    const ligne = creer('p', 'v2e057-readout', texte);
    ligne.id = id;
    if (dynamiques.indexOf(id) !== -1) {
      ligne.setAttribute('role', 'status');
      ligne.setAttribute('aria-live', 'polite');
      ligne.setAttribute('aria-atomic', 'true');
    }
    panel.appendChild(ligne);
  });

  /* E057-06 — Couverture du parcours : indicateur progressbar des arrêts visités. */
  const barre = creer('div', 'v2e057-barre');
  barre.id = 'v2e057-barre';
  barre.setAttribute('role', 'progressbar');
  barre.setAttribute('aria-label', 'Couverture du parcours de tabulation');
  barre.setAttribute('aria-valuemin', '0');
  barre.setAttribute('aria-valuemax', String(arrets.length));
  barre.setAttribute('aria-valuenow', '0');
  barre.setAttribute('aria-valuetext', `0 arrêt visité sur ${arrets.length}`);
  barre.style.setProperty('--v2e057-pct', '0%');
  const ligneCouverture = panel.querySelector('#v2e057-ligne-06');
  if (ligneCouverture && typeof ligneCouverture.after === 'function') ligneCouverture.after(barre);
  else panel.appendChild(barre);

  const ecrire = (id, texte) => {
    const ligne = layout.querySelector(`#${id}`);
    if (ligne) ligne.textContent = texte;
  };

  /* État partagé des chantiers 04 à 08 : seule l'horodature fournie par les
     événements est utilisée (event.timeStamp), sans minuteur ni rAF. */

  /* E057-04 — Durée de séjour par arrêt, calculée depuis event.timeStamp. */
  /* E057-05 — Sauts de parcours : écart entre deux rangs focalisés. */
  /* E057-07 — Focus programmatique sur un élément non répertorié. */
  /* E057-08 — Reprise de focus par le corps du document. */
  const sejours = Object.create(null);
  let precedent = null;
  let precedentRang = null;
  const visites = new Set();

  if (layout.addEventListener) {
    layout.addEventListener('focusin', evenement => {
      const cible = evenement && evenement.target;
      if (!cible || cible.nodeType !== 1) return;
      const instant = evenement && Number.isFinite(evenement.timeStamp) ? evenement.timeStamp : 0;
      const rang = cible.getAttribute ? cible.getAttribute('data-v2e057-rang') : null;

      /* Séjour : mesure effectuée à partir de l'horodatage de l'événement. */
      if (precedent && precedent.entree && instant) {
        const duree = Math.max(0, Math.round(instant - precedent.entree));
        const rangPrecedent = precedent.rang || '?';
        sejours[rangPrecedent] = duree;
        if (precedent.noeud) precedent.noeud.setAttribute('data-v2e057-sejour', `${duree} ms`);
        ecrire('v2e057-ligne-04', `Dernier séjour mesuré : arrêt ${rangPrecedent} — ${duree} ms avant le changement de focus.`);
      }

      /* Saut : comparaison du rang courant au dernier rang d'arrêt visité. */
      if (rang && precedentRang) {
        const depart = Number.parseInt(precedentRang, 10);
        const arrivee = Number.parseInt(rang, 10);
        if (Number.isFinite(depart) && Number.isFinite(arrivee)) {
          const ecart = Math.abs(arrivee - depart) - 1;
          if (ecart > 0) {
            cible.setAttribute('data-v2e057-saut', `depuis ${depart}`);
            ecrire('v2e057-ligne-05', `Saut détecté : ${accordV2(ecart, 'arrêt traversé', 'arrêts traversés')} entre les rangs ${depart} et ${arrivee}.`);
          } else {
            ecrire('v2e057-ligne-05', `Parcours contigu du rang ${depart} au rang ${arrivee} : aucun arrêt sauté.`);
          }
        }
      }
      if (rang) precedentRang = rang;

      /* Jauge de couverture (chantier 06) : actualisée à chaque arrêt visité. */
      if (rang) {
        visites.add(rang);
        const nombre = visites.size;
        const total = arrets.length;
        barre.setAttribute('aria-valuenow', String(nombre));
        barre.setAttribute('aria-valuetext', `${accordV2(nombre, 'arrêt visité', 'arrêts visités')} sur ${total}`);
        barre.style.setProperty('--v2e057-pct', total ? `${Math.round(nombre / total * 100)}%` : '0%');
        ecrire('v2e057-ligne-06', `Couverture du parcours : ${nombre} / ${total} arrêts distincts visités.`);
      }

      /* Hors liste (chantier 07) : focus posé hors de l'inventaire des arrêts. */
      const dansPanneau = panel.contains && panel.contains(cible);
      if (!rang && !dansPanneau && cible !== doc.body && cible !== doc.documentElement
          && layout.contains && layout.contains(cible)) {
        cible.setAttribute('data-v2e057-hors-liste', 'oui');
        ecrire('v2e057-ligne-07', `Focus programmatique sur un élément non répertorié : « ${libelleV2(cible)} » (${typeV2(cible)}).`);
      }

      /* Reprise (chantier 08) : le corps du document redevient la cible. */
      if (cible === doc.body || cible === doc.documentElement) {
        layout.dataset.v2e057Reprise = 'oui';
        ecrire('v2e057-ligne-08', 'Focus repris par le corps du document : aucun contrôle de la vue n’est focalisé.');
      } else {
        layout.dataset.v2e057Reprise = 'non';
      }

      precedent = { noeud: rang ? cible : null, rang: rang || '', entree: instant };
    });

    /* Complément du chantier 08 : sortie sans successeur déclaré, sans minuteur. */
    layout.addEventListener('focusout', evenement => {
      const suivant = evenement && evenement.relatedTarget;
      if (!suivant && layout.isConnected) {
        layout.dataset.v2e057Reprise = 'sans-successeur';
        ecrire('v2e057-ligne-08', 'Focus perdu : la vue a quitté le focus sans successeur déclaré.');
      }
    });
  }

  /* Insertion ordonnée : le panneau précède la légende pour rester adjacent au
     champ visuel, sans toucher aux fichiers partagés de la vue. */
  const caption = layout.querySelector('.constellation-caption');
  if (caption && caption.parentNode && typeof layout.insertBefore === 'function') {
    layout.insertBefore(panel, caption);
  } else if (typeof layout.appendChild === 'function') {
    layout.appendChild(panel);
  }
  layout.dataset.v2e057Installe = 'oui';
});
