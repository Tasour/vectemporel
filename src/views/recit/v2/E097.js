import { register } from './registry.js';

/* V2 lentille E097 — Contraste et perception (complément de la passe 1).
   Dix chantiers V2 neufs, distincts de ceux de la passe 1 (bordures, piste
   crantée, micro-étiquettes, anneau de focus, surfaces, mesure WCAG du titre,
   bascule « contraste maximal », préférence système, point courant, mouvement
   réduit). Ici : barre d'outils, double encodage des filtres et des
   certitudes, répartition chiffrée du fil, état vide, mesure WCAG des jetons
   d'outillage, hiérarchie des métadonnées, contraste des aides, traduction
   textuelle de la pastille de certitude et confort des ajouts V2.
   Tous non destructifs : sans ce module, la vue reste intégralement lisible.
   Préfixes : classes recit-v2-e097-, ids DOM v2-e097- (jamais les ids e097-
   de la passe 1 qui tourne sur le même DOM).
   Zéro réseau, zéro console, zéro aléa, aucun fichier partagé modifié. */

const CSS = `
/* E097-01 — Contraste des textes et bordures de la barre d'outils. */
.recit-v2-e097-root.recit-v2-e097-toolbar .c3a-status,
.recit-v2-e097-root.recit-v2-e097-toolbar .c3a-group-label,
.recit-v2-e097-root.recit-v2-e097-toolbar .c3a-filter{color:var(--ink-soft)}
.recit-v2-e097-root.recit-v2-e097-toolbar .c3a-search::placeholder{color:var(--ink-soft);opacity:1}
.recit-v2-e097-root.recit-v2-e097-toolbar .c3a-search,
.recit-v2-e097-root.recit-v2-e097-toolbar .c3a-filter{border-color:var(--muted)}

/* E097-02 — État pressé des filtres : double encodage par la forme et la graisse. */
.recit-v2-e097-root.recit-v2-e097-pressed .c3a-filter[aria-pressed="true"]{
  font-weight:700;text-decoration:underline;text-underline-offset:2px;
  box-shadow:inset 0 0 0 1px var(--ink-soft);
}

/* E097-03 — Certitude des items du fil codée par la texture de bordure. */
.recit-v2-e097-root .recit-thread-item[data-v2-e097-conf="vérifié"]{border-style:solid}
.recit-v2-e097-root .recit-thread-item[data-v2-e097-conf="certain"]{border-style:double;border-width:3px}
.recit-v2-e097-root .recit-thread-item[data-v2-e097-conf="probable"]{border-style:dashed}
.recit-v2-e097-root .recit-thread-item[data-v2-e097-conf="disputed"]{border-style:dotted}

/* E097-04 — Répartition chiffrée des certitudes (paragraphe visible). */
.recit-v2-e097-repartition{margin:6px 0 8px;color:var(--ink-soft);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E097-05 — Contraste de l'état vide et du bouton de réinitialisation. */
.recit-v2-e097-root.recit-v2-e097-empty .c3a-empty,
.recit-v2-e097-root.recit-v2-e097-empty .c3a-empty p{color:var(--ink-soft)}
.recit-v2-e097-root.recit-v2-e097-empty .c3a-empty{border-color:var(--muted)}
.recit-v2-e097-root.recit-v2-e097-empty .c3a-reset{color:var(--ink);border-color:var(--muted)}

/* E097-06 — Mesure WCAG des jetons d'outillage (paragraphe visible). */
.recit-v2-e097-mesure{margin:6px 0;color:var(--ink-soft);font-size:10px;line-height:1.55;font-variant-numeric:tabular-nums}
.recit-v2-e097-mesure strong{color:var(--gold-bright)}

/* E097-07 — Hiérarchie perceptive des métadonnées du point. */
.recit-v2-e097-root.recit-v2-e097-meta .recit-meta,
.recit-v2-e097-root.recit-v2-e097-meta .recit-timing{color:var(--ink-soft)}
.recit-v2-e097-root.recit-v2-e097-meta .recit-conf{font-weight:700;letter-spacing:.02em}

/* E097-08 — Contraste des aides et de la traçabilité. */
.recit-v2-e097-root.recit-v2-e097-aides .recit-legend,
.recit-v2-e097-root.recit-v2-e097-aides .recit-trace,
.recit-v2-e097-root.recit-v2-e097-aides .recit-sources{color:var(--ink-soft)}
.recit-v2-e097-root.recit-v2-e097-aides .recit-trace summary{color:var(--ink)}

/* E097-09 — Traduction textuelle de la pastille de certitude (visible). */
.recit-v2-e097-certitude{margin:6px 0;color:var(--ink-soft);font-size:10px;line-height:1.5}

/* E097-10 — Confort perceptif : mouvement réduit des seuls ajouts V2. */
.recit-v2-e097-root .recit-v2-e097-readout{transition:opacity .2s linear}
.recit-v2-e097-root.recit-v2-e097-reduit .recit-v2-e097-readout{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e097-readout{transition:none}}
`;

/* --- utilitaires, tous gardés -------------------------------------------- */

function present(noeud) {
  return Boolean(noeud && noeud.nodeType === 1);
}

function ajouteClasse(noeud, nom) {
  if (present(noeud) && noeud.classList && typeof noeud.classList.add === 'function'
      && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function retireClasse(noeud, nom) {
  if (present(noeud) && noeud.classList && typeof noeud.classList.remove === 'function'
      && noeud.classList.contains(nom)) noeud.classList.remove(nom);
}

function setOnce(noeud, nom, valeur) {
  if (present(noeud) && typeof noeud.hasAttribute === 'function'
      && !noeud.hasAttribute(nom)) noeud.setAttribute(nom, valeur);
}

/* Écrit un texte éventuellement ponctué de fragments <strong> dans un nœud. */
function remplitFragments(noeud, texte, fabrique) {
  if (!present(noeud)) return;
  const brut = String(texte || '');
  if (typeof fabrique !== 'function') {
    noeud.textContent = brut.replace(/<\/?strong>/g, '');
    return;
  }
  noeud.textContent = '';
  brut.split(/(<strong>.*?<\/strong>)/).forEach((partie) => {
    const m = /^<strong>(.*?)<\/strong>$/.exec(partie);
    if (m) noeud.appendChild(fabrique('strong', '', m[1]));
    else if (partie && typeof document !== 'undefined' && document.createTextNode) {
      noeud.appendChild(document.createTextNode(partie));
    }
  });
}

/* Dépose (ou réutilise) un paragraphe visible, à un emplacement stable.
   Le nœud est identifié par son id : aucun doublon après reconstruction. */
function placeParagraphe(id, classe, parent, ancre, texte, fabrique) {
  if (typeof document === 'undefined' || !present(parent)
      || typeof parent.insertBefore !== 'function') return null;
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = typeof fabrique === 'function'
      ? fabrique('p', `recit-v2-e097-readout ${classe}`) : null;
    if (!present(noeud)) return null;
    noeud.id = id;
  }
  remplitFragments(noeud, texte, fabrique);
  const cible = present(ancre) && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

/* --- calcul déterministe des rapports de contraste (formule WCAG) -------- */

function hexRgb(valeur) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(valeur || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(rgb) {
  if (!rgb) return null;
  const canaux = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * canaux[0] + 0.7152 * canaux[1] + 0.0722 * canaux[2];
}

function rapport(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function jeton(nom, repli) {
  try {
    const brut = getComputedStyle(document.documentElement).getPropertyValue(nom).trim();
    return hexRgb(brut) ? brut : repli;
  } catch {
    return repli;
  }
}

function francise(nombre) {
  return Number(nombre).toFixed(1).replace('.', ',');
}

function qualifie(ratio, seuil) {
  if (ratio === null) return 'non calculable';
  return ratio >= seuil ? 'conforme' : 'insuffisant';
}

register('E097', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout
        || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e097', CSS); /* un seul appel, toutes les règles du module. */

    const corps = layout.querySelector('.recit-body');
    if (!present(corps)) return;
    ajouteClasse(layout, 'recit-v2-e097-root');

    const toolbar = document.getElementById('c3a-tools') || corps.querySelector('.c3a-tools');
    const statut = document.getElementById('c3a-status') || corps.querySelector('.c3a-status');
    const fil = document.getElementById('c3a-thread') || corps.querySelector('.recit-thread-list');
    const meta = corps.querySelector('.recit-meta');
    const pastille = present(meta) ? meta.querySelector('.recit-conf')
      : corps.querySelector('.recit-conf');

    /* E097-01 — contraste des textes et bordures de la barre d'outils. */
    ajouteClasse(layout, 'recit-v2-e097-toolbar');

    /* E097-02 — état pressé des filtres doublement encodé (forme + graisse). */
    ajouteClasse(layout, 'recit-v2-e097-pressed');

    /* E097-03 — certitude du fil doublée par une texture de bordure. */
    if (present(fil) && typeof fil.querySelectorAll === 'function') {
      Array.from(fil.querySelectorAll('.recit-thread-item')).forEach((item) => {
        const valeur = String(item.getAttribute('data-confidence') || '').trim();
        if (valeur) setOnce(item, 'data-v2-e097-conf', valeur);
      });
    }

    /* E097-04 — répartition chiffrée des certitudes, lue sur les items. */
    if (present(fil) && typeof fil.querySelectorAll === 'function') {
      const items = Array.from(fil.querySelectorAll('.recit-thread-item'));
      if (items.length) {
        const ordre = ['vérifié', 'certain', 'probable', 'disputed'];
        const libelles = {
          'vérifié': 'vérifiés', 'certain': 'certains',
          'probable': 'probables', 'disputed': 'contestés',
        };
        const comptes = {};
        ordre.forEach((cle) => { comptes[cle] = 0; });
        let sansMention = 0;
        items.forEach((item) => {
          const valeur = String(item.getAttribute('data-confidence') || '').trim();
          if (Object.prototype.hasOwnProperty.call(comptes, valeur)) comptes[valeur] += 1;
          else sansMention += 1;
        });
        const parties = ordre.filter((cle) => comptes[cle] > 0)
          .map((cle) => `${comptes[cle]} ${libelles[cle]}`);
        if (sansMention) parties.push(`${sansMention} sans mention`);
        const texte = `Certitudes dans le fil (${items.length} points) : `
          + `${parties.join(' · ') || 'aucune mention'}.`;
        placeParagraphe('v2-e097-repartition',
          'recit-v2-e097-repartition', corps, statut || toolbar, texte, el);
      }
    }

    /* E097-05 — contraste de l'état vide et du bouton de réinitialisation. */
    ajouteClasse(layout, 'recit-v2-e097-empty');

    /* E097-06 — mesure WCAG des jetons d'outillage (jamais de valeur figée). */
    const fond = hexRgb(jeton('--bg', '#070a0e'));
    const attenue = hexRgb(jeton('--muted', '#a8a198'));
    const accent = hexRgb(jeton('--gold', '#e6b96f'));
    const rTexte = rapport(attenue, fond);
    const rAccent = rapport(accent, fond);
    const mesure = 'Contraste de l’outillage (formule WCAG, fond de la vue) : '
      + `texte atténué <strong>${rTexte === null ? '—' : francise(rTexte) + ' : 1'}</strong>`
      + ` (réf. 4,5 : 1 — ${qualifie(rTexte, 4.5)}) · `
      + `accent des contrôles <strong>${rAccent === null ? '—' : francise(rAccent) + ' : 1'}</strong>`
      + ` (réf. 3 : 1 — ${qualifie(rAccent, 3)}).`;
    placeParagraphe('v2-e097-mesure', 'recit-v2-e097-mesure',
      corps, toolbar || statut, mesure, el);

    /* E097-07 — hiérarchie perceptive des métadonnées du point. */
    ajouteClasse(layout, 'recit-v2-e097-meta');

    /* E097-08 — contraste des aides et de la traçabilité. */
    ajouteClasse(layout, 'recit-v2-e097-aides');

    /* E097-09 — traduction textuelle de la pastille de certitude. */
    if (present(pastille)) {
      const libelle = String(pastille.textContent || '').trim();
      const glose = String(pastille.getAttribute('title') || '').trim();
      if (libelle) {
        const texte = glose
          ? `Certitude du point courant : ${libelle} — « ${glose} ».`
          : `Certitude du point courant : ${libelle}.`;
        placeParagraphe('v2-e097-certitude', 'recit-v2-e097-certitude',
          corps, meta, texte, el);
      }
    }

    /* E097-10 — mouvement réduit : seuls les ajouts V2 sont concernés. */
    let reduit = false;
    try { reduit = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
    catch { reduit = false; }
    if (reduit) ajouteClasse(layout, 'recit-v2-e097-reduit');
    else retireClasse(layout, 'recit-v2-e097-reduit');
    layout.setAttribute('data-v2-e097-motion', reduit ? 'reduce' : 'normal');
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
