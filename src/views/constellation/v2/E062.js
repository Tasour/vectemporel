import { register } from './registry.js';

/* Lentille V2 E062 — performance appliquée aux métriques chiffrées de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau, sans source aléatoire et sans minuteur ni boucle propre.
   Préfixe exclusif : v2e062 (aucune collision avec la passe 1). */
register('E062', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique de la lentille : tout sélecteur est préfixé v2e062 ou vise
     l'annexe dédiée. Aucune couleur n'est le seul vecteur d'information. */
  css('constellation-v2-e062', `
.v2e062-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
#v2e062-annexe{margin:10px 0 0;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--muted);font-family:inherit;font-size:10px;line-height:1.5}
.v2e062-head{margin:0 0 4px;color:var(--gold);font-family:var(--serif);font-size:11px;font-weight:450}
.v2e062-figures{display:flex;flex-wrap:wrap;gap:4px 8px;margin:0 0 4px}
.v2e062-figure{display:inline-block;min-width:var(--v2e062-ch,4ch);padding:2px 6px;margin:0;border:1px solid var(--violet);border-radius:6px;text-align:right}
.v2e062-jauge{margin:2px 0 0;font-family:monospace;letter-spacing:1px;color:var(--gold-bright)}
.v2e062-live{margin:4px 0 0;color:var(--ink-soft)}
.v2e062-classement{margin:4px 0 0;padding-left:16px;color:var(--muted)}
.v2e062-dense #v2e062-annexe{padding:5px 7px}
.v2e062-dense .v2e062-figure{padding:1px 4px;font-size:9px}
@media (prefers-reduced-motion:reduce){#v2e062-annexe,#v2e062-annexe *{transition:none!important;animation:none!important}}
`);

  /* Greffon tolérant : toute anomalie locale est neutralisée sans bruit. */
  try {
    const make = typeof ctx.el === 'function'
      ? (tag, cls, txt) => ctx.el(tag, cls, txt)
      : (tag, cls, txt) => {
          const node = document.createElement(tag);
          if (cls) node.className = cls;
          if (txt !== undefined) node.textContent = txt;
          return node;
        };

    /* Pré-calcul partagé : une seule lecture des sources de chiffres, puis
       dérivation de toutes les mesures sans nouvelle interrogation du DOM. */
    const etat = layout.querySelector('.constellation-state');
    const soleils = layout.querySelectorAll('.const-sun');
    const planetes = layout.querySelectorAll('.const-planet');
    const lunes = layout.querySelectorAll('.const-moon');
    const luneList = Array.prototype.slice.call(lunes);
    const nbEres = soleils.length;
    const nbRep = planetes.length;
    const nbPoints = lunes.length;
    const texteEtat = etat && typeof etat.textContent === 'string' ? etat.textContent : '';
    const repere = /Point\s*:\s*(\d+)\s*\/\s*(\d+)/.exec(texteEtat);
    const courant = repere ? Number(repere[1]) : 0;
    const total = repere ? Number(repere[2]) : 0;

    /* Lecture d'une confiance déjà présente dans le titre et le libellé de la
       lune. Les valeurs sont bornées à 0–100 pour rester comparables. */
    const lireConfiance = lune => {
      const source = (lune.getAttribute('title') || '') + ' '
        + (lune.getAttribute('aria-label') || '');
      const mesure = /confiance\s+(\d+)/i.exec(source);
      if (!mesure) return null;
      const valeur = Number(mesure[1]);
      if (!Number.isFinite(valeur)) return null;
      return Math.max(0, Math.min(100, valeur));
    };

  /* E062-01 — Dispersion de la confiance en une passe : minimum, maximum,
       amplitude et écart-type de population, publiés en attributs. */
    let somme = 0;
    let carres = 0;
    let nbNotes = 0;
    let borneMin = 0;
    let borneMax = 0;
    luneList.forEach(lune => {
      const valeur = lireConfiance(lune);
      if (valeur === null) return;
      somme += valeur;
      carres += valeur * valeur;
      nbNotes += 1;
      if (nbNotes === 1 || valeur < borneMin) borneMin = valeur;
      if (nbNotes === 1 || valeur > borneMax) borneMax = valeur;
    });
    const moyenne = nbNotes ? somme / nbNotes : 0;
    const ecartType = nbNotes ? Math.sqrt(Math.max(0, carres / nbNotes - moyenne * moyenne)) : 0;
    const amplitude = nbNotes ? borneMax - borneMin : 0;
    layout.dataset.v2e062ConfMin = String(borneMin);
    layout.dataset.v2e062ConfMax = String(borneMax);
    layout.dataset.v2e062ConfAmplitude = String(amplitude);
    layout.dataset.v2e062ConfEcart = ecartType.toFixed(2);
    layout.dataset.v2e062ConfN = String(nbNotes);

  /* E062-02 — Classement déterministe des points par confiance décroissante,
       départage par ordre d'apparition. Chaque lune porte son rang. */
    const notes = luneList
      .map((lune, index) => ({ lune, index, confiance: lireConfiance(lune) }))
      .filter(entree => entree.confiance !== null);
    notes.sort((a, b) => (b.confiance - a.confiance) || (a.index - b.index));
    notes.forEach((entree, rang) => {
      entree.lune.dataset.v2e062Rank = String(rang + 1);
    });
    const classement = notes.slice(0, 3);

  /* E062-03 — Budget de glyphes numériques : décompte des chiffres réellement
       affichés, servant d'estimateur de charge de mise en page. */
    const digitCount = valeur => (String(valeur).match(/[0-9]/g) || []).length;
    let glyphes = digitCount(texteEtat);
    Array.prototype.forEach.call(soleils, noeud => { glyphes += digitCount(noeud.textContent); });
    Array.prototype.forEach.call(planetes, noeud => { glyphes += digitCount(noeud.textContent); });
    const charge = glyphes <= 24 ? 'leger' : glyphes <= 64 ? 'modere' : 'eleve';
    layout.dataset.v2e062Glyphes = String(glyphes);
    layout.dataset.v2e062Charge = charge;

  /* E062-04 — Snapshot figé et cohérent : un seul objet gelé rassemble toutes
       les métriques, évitant les lectures éparpillées et les états incohérents. */
    const snapshot = Object.freeze({
      eres: nbEres,
      reperes: nbRep,
      points: nbPoints,
      pointCourant: courant,
      pointTotal: total,
      confianceMin: borneMin,
      confianceMax: borneMax,
      ecartType: Number(ecartType.toFixed(2)),
      glyphes: glyphes
    });
    layout.dataset.v2e062Snapshot = JSON.stringify(snapshot);
    const KEY_SNAPSHOT = '__v2e062_snapshot';
    const KEY_PREVIOUS = '__v2e062_previous';

  /* E062-05 — Détection de dérive entre rendus : comparaison avec le snapshot
       précédent conservé en mémoire de fenêtre, sans minuteur ni écouteur. */
    const precedent = typeof window !== 'undefined' && window[KEY_PREVIOUS]
      && typeof window[KEY_PREVIOUS] === 'object' ? window[KEY_PREVIOUS] : null;
    const champs = Object.keys(snapshot);
    const derives = precedent ? champs.filter(champ => precedent[champ] !== snapshot[champ]) : [];
    layout.dataset.v2e062Drift = !precedent ? 'premier-rendu'
      : (derives.length ? derives.join(',') : 'aucun');
    if (typeof window !== 'undefined') {
      window[KEY_PREVIOUS] = snapshot;
      window[KEY_SNAPSHOT] = snapshot;
    }

  /* E062-06 — Signature de rendu déterministe (FNV-1a sur 32 bits) : une
       empreinte courte permet de comparer deux rendus sans stocker de texte. */
    const signer = texte => {
      let empreinte = 0x811c9dc5;
      for (let i = 0; i < texte.length; i += 1) {
        empreinte ^= texte.charCodeAt(i);
        empreinte = Math.imul(empreinte, 0x01000193) >>> 0;
      }
      return empreinte.toString(16).padStart(8, '0');
    };
    const base = champs.map(champ => `${champ}=${snapshot[champ]}`).join('|');
    const signature = signer(base);
    layout.dataset.v2e062Signature = signature;
    if (typeof window !== 'undefined') window.__v2e062_signature = signature;

  /* E062-07 — Formateur décimal français réutilisé : une seule instance Intl
       pour toutes les valeurs, avec repli déterministe si elle est absente. */
    let formateur = null;
    try {
      if (typeof Intl !== 'undefined' && typeof Intl.NumberFormat === 'function') {
        formateur = new Intl.NumberFormat('fr-FR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 1
        });
      }
    } catch {
      formateur = null;
    }
    const formater = valeur => formateur
      ? formateur.format(valeur)
      : String(Math.round(valeur * 10) / 10).replace('.', ',');
    const pourcentage = total > 0 ? (courant / total) * 100 : 0;
    layout.dataset.v2e062RatioFr = formater(pourcentage) + ' %';
    layout.dataset.v2e062EcartFr = formater(ecartType);

  /* E062-08 — Jauge textuelle accessible : dix cases pleines ou vides, sans
       couleur porteuse de sens, décrite par un aria-label explicite. */
    const largeurJauge = 10;
    const pleins = total > 0
      ? Math.max(0, Math.min(largeurJauge, Math.round((courant / total) * largeurJauge)))
      : 0;
    const jaugeText = '■'.repeat(pleins) + '□'.repeat(largeurJauge - pleins);

  /* E062-09 — Annexe métrique et largeur calculée en ch : le panneau réunit
       dispersion, jauge et classement ; sa largeur découle du nombre maximal
       de chiffres réellement présents, pas d'une constante arbitraire. */
    const panneau = make('section', 'v2e062-annexe');
    panneau.id = 'v2e062-annexe';
    panneau.setAttribute('aria-labelledby', 'v2e062-titre');
    const titre = make('h3', 'v2e062-head', 'Annexe métrique · V2');
    titre.id = 'v2e062-titre';
    panneau.appendChild(titre);

    const figures = make('div', 'v2e062-figures');
    const figureMin = make('span', 'v2e062-figure', String(borneMin));
    const figureMax = make('span', 'v2e062-figure', String(borneMax));
    const figureEcart = make('span', 'v2e062-figure', formater(ecartType));
    const figureGlyphes = make('span', 'v2e062-figure', String(glyphes));
    [figureMin, figureMax, figureEcart, figureGlyphes].forEach(figure => figures.appendChild(figure));
    panneau.appendChild(figures);

    const jauge = make('p', 'v2e062-jauge', jaugeText);
    jauge.setAttribute('role', 'img');
    jauge.setAttribute('aria-label',
      `Jauge du point ${courant} sur ${total} : ${formater(pourcentage)} pour cent, ${pleins} cases sur ${largeurJauge}.`);
    panneau.appendChild(jauge);

    if (classement.length) {
      const liste = make('ol', 'v2e062-classement');
      classement.forEach(entree => {
        liste.appendChild(make('li', '',
          `Point ${entree.index + 1} — confiance ${entree.confiance}`));
      });
      panneau.appendChild(liste);
    }

    const lecture = make('p', 'v2e062-live', '');
    lecture.id = 'v2e062-live';
    lecture.setAttribute('role', 'status');
    lecture.setAttribute('aria-live', 'polite');
    lecture.setAttribute('aria-atomic', 'true');
    panneau.appendChild(lecture);

    const maxChiffres = [nbEres, nbRep, nbPoints, courant, total, borneMin, borneMax]
      .reduce((acc, valeur) => Math.max(acc, digitCount(valeur)), 1);
    const largeurCh = Math.max(3, maxChiffres + 1);
    panneau.style.setProperty('--v2e062-ch', `${largeurCh}ch`);
    layout.dataset.v2e062Ch = String(largeurCh);

    const precedentPanneau = document.getElementById('v2e062-annexe');
    if (precedentPanneau && precedentPanneau.parentNode) {
      precedentPanneau.parentNode.removeChild(precedentPanneau);
    }
    const ancre = layout.querySelector('.constellation-caption') || layout;
    ancre.appendChild(panneau);
    lecture.textContent = `Dispersion de confiance : ${borneMin} à ${borneMax} `
      + `(écart-type ${formater(ecartType)} sur ${nbNotes} point(s)). `
      + `Budget de glyphes : ${glyphes}, niveau ${charge}. Signature ${signature}.`;

  /* E062-10 — Densité adaptive : au-delà d'un effectif de cibles, une classe
       resserre l'annexe via la feuille unique, sans animation ni script natif. */
    const cibles = nbEres + nbRep + nbPoints;
    const dense = cibles > 24;
    if (dense) layout.classList.add('v2e062-dense');
    else layout.classList.remove('v2e062-dense');
    layout.dataset.v2e062Cibles = String(cibles);
    layout.dataset.v2e062Densite = dense ? 'dense' : 'normale';
  } catch {
    return;
  }
});
