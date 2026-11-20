import { register } from './registry.js';

/* Lentille V2 E019 — garde-fous complémentaires appliqués aux planètes de la
   vue Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau, sans source aléatoire, sans minuteur ni boucle d'animation.
   Le domaine reste celui de la passe 1 (robustesse des `.const-planet`), mais
   aucun contrôle n'est repris : cohérence des données, visibilité, cibles,
   navigation clavier et registre de conformité sont traités ici pour la
   première fois. Préfixe exclusif : `v2e019`. */

const CSS_ID = 'constellation-v2-e019';
const SELECTEUR = '.const-planet[data-const-key^="planet:"]';
const IDS = [
  'v2e019-panel', 'v2e019-head', 'v2e019-title', 'v2e019-readout',
  'v2e019-metrics', 'v2e019-findings', 'v2e019-legend',
];
const NAV_KEY = '__v2e019_nav';
const ANN_KEY = '__v2e019_ann';

let rendus = 0;

const CSS = `
.constellation-layout.v2e019 .v2e019-wrap{margin-top:12px}
#v2e019-panel{margin:0;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--muted);font:inherit;font-size:9px;line-height:1.55;contain:layout style}
#v2e019-panel .v2e019-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}
#v2e019-title{margin:0;color:var(--gold);font-family:var(--serif);font-size:12px;font-weight:450}
#v2e019-readout{margin:8px 0 6px;color:var(--ink-soft);font-variant-numeric:tabular-nums}
#v2e019-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:3px 12px;margin:6px 0}
#v2e019-metrics>div{min-width:0}
#v2e019-metrics dt{margin:0;color:var(--muted-2);font-size:8px;letter-spacing:.04em;text-transform:uppercase}
#v2e019-metrics dd{margin:1px 0;color:var(--ink-soft);font-size:9px;font-variant-numeric:tabular-nums}
#v2e019-findings{margin:6px 0 0;padding-left:16px;color:var(--muted-2)}
#v2e019-findings li{margin:1px 0;overflow-wrap:anywhere}
#v2e019-legend{margin-top:8px;border-top:1px solid var(--line);padding-top:6px}
#v2e019-legend summary{min-height:24px;color:var(--gold-bright);font-size:9px;cursor:pointer}
#v2e019-legend summary:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
#v2e019-legend .v2e019-defs div{margin:4px 0}
#v2e019-legend .v2e019-defs dt{margin:0;color:var(--gold);font-size:9px}
#v2e019-legend .v2e019-defs dd{margin:1px 0;color:var(--muted);font-size:9px;line-height:1.5}
.constellation-layout.v2e019 .const-planet.v2e019-flag{outline:1px dashed var(--gold);outline-offset:2px}
.constellation-layout.v2e019 .const-planet.v2e019-flag:focus-visible{outline:2px solid var(--gold-bright);box-shadow:0 0 0 3px rgba(230,185,111,.18)}
.v2e019-badge{position:absolute;left:50%;bottom:calc(100% + 3px);transform:translateX(-50%);padding:1px 4px;border:1px solid var(--gold);border-radius:4px;background:var(--surface-2);color:var(--gold-bright);font-size:7px;white-space:nowrap;z-index:6;pointer-events:none}
.const-planet[data-v2e019-small="1"]::before{content:"";position:absolute;inset:-8px}
@media (max-width:620px){#v2e019-panel{padding:8px 9px}#v2e019-metrics{grid-template-columns:repeat(auto-fit,minmax(120px,1fr))}}
@media (prefers-reduced-motion:reduce){#v2e019-panel,#v2e019-panel *,.constellation-layout.v2e019 .const-planet{transition:none!important;animation:none!important}}`;

function nouveau(ctx, tag, cls, text) {
  let noeud = null;
  if (ctx && typeof ctx.el === 'function') noeud = ctx.el(tag, cls, text);
  if (!noeud) {
    noeud = document.createElement(tag);
    if (cls) noeud.className = cls;
    if (text !== undefined) noeud.textContent = text;
  }
  return noeud;
}

function attribut(noeud, nom) {
  return noeud && typeof noeud.getAttribute === 'function'
    ? (noeud.getAttribute(nom) || '') : '';
}

function texte(noeud) {
  return noeud && typeof noeud.textContent === 'string' ? noeud.textContent.trim() : '';
}

function propriete(noeud, nom) {
  return noeud && noeud.style && typeof noeud.style.getPropertyValue === 'function'
    ? noeud.style.getPropertyValue(nom).trim() : '';
}

function nombre(brut) {
  const valeur = parseFloat(String(brut));
  return Number.isFinite(valeur) ? valeur : Number.NaN;
}

function decimal(valeur) {
  return (Math.round(valeur * 100) / 100).toString().replace('.', ',');
}

function geometrie(champ) {
  const largeur = champ && champ.clientWidth > 0 ? champ.clientWidth : 100;
  const hauteur = champ && champ.clientHeight > 0 ? champ.clientHeight : 100;
  return {
    w: largeur,
    h: hauteur,
    mesurable: !!(champ && champ.clientWidth > 0 && champ.clientHeight > 0),
  };
}

function tailleNoeud(champ) {
  const brut = parseInt(propriete(champ, '--const-node-size'), 10);
  return Number.isFinite(brut) && brut > 0 ? brut : 28;
}

function anneeDe(chaine) {
  const trouve = String(chaine || '').match(/\d{4}/);
  return trouve ? trouve[0] : '';
}

function titreDe(label) {
  const chaine = String(label || '');
  const indice = chaine.indexOf(' · ');
  return indice < 0 ? '' : chaine.slice(indice + 3).trim();
}

function unSeul(ctx, id, tag, cls, parent) {
  const trouves = Array.from(document.querySelectorAll(`[id="${id}"]`));
  for (let i = 1; i < trouves.length; i += 1) {
    if (trouves[i].parentNode) trouves[i].parentNode.removeChild(trouves[i]);
  }
  let cible = trouves[0];
  if (!cible) {
    cible = nouveau(ctx, tag, cls);
    cible.id = id;
    if (parent) parent.appendChild(cible);
  }
  return cible;
}

function marquer(noeud, libelle) {
  if (!noeud || !noeud.classList || typeof noeud.setAttribute !== 'function') return;
  noeud.classList.add('v2e019-flag');
  noeud.setAttribute('data-v2e019-flag', '1');
  const courant = attribut(noeud, 'data-v2e019-tag');
  const etiquette = courant ? `${courant} · ${libelle}` : libelle;
  noeud.setAttribute('data-v2e019-tag', etiquette);
  let badge = noeud.getElementsByClassName ? noeud.getElementsByClassName('v2e019-badge')[0] : null;
  if (!badge) {
    badge = nouveau(null, 'span', 'v2e019-badge');
    badge.setAttribute('aria-hidden', 'true');
    noeud.appendChild(badge);
  }
  badge.textContent = etiquette;
}

register('E019', ctx => {
  /* Garde d'entrée : sans layout rendu ni fonction css, la lentille ne touche
   * à aucun DOM. La feuille unique est installée une seule fois. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  if (!layout.classList || typeof layout.querySelectorAll !== 'function') return;
  css(CSS_ID, CSS);

  /* Préambule — périmètre isolé : le layout reçoit une classe propre et un
   * enveloppeur sans ID, puis un panneau unique conforme à l'identifiant
   * `constellation-v2-…`. Aucun nœud de la passe 1 n'est réécrit. */
  try {
    layout.classList.add('v2e019');
    rendus += 1;
    const planetes = Array.from(layout.querySelectorAll(SELECTEUR));
    const champ = layout.querySelector('.constellation-field');
    const geo = geometrie(champ);
    const taille = tailleNoeud(champ);
    const total = planetes.length;

    let enveloppe = layout.querySelector('.v2e019-wrap');
    if (!enveloppe) {
      enveloppe = nouveau(ctx, 'div', 'v2e019-wrap');
      layout.appendChild(enveloppe);
    }
    const panneau = unSeul(ctx, 'v2e019-panel', 'section', '', enveloppe);
    panneau.textContent = '';
    panneau.setAttribute('aria-labelledby', 'v2e019-title');
    const tete = unSeul(ctx, 'v2e019-head', 'div', 'v2e019-head', panneau);
    tete.textContent = '';
    const titre = unSeul(ctx, 'v2e019-title', 'h3', '', tete);
    titre.textContent = 'Garde-fous V2 des planètes';
    tete.appendChild(titre);
    panneau.appendChild(tete);
    const lecture = unSeul(ctx, 'v2e019-readout', 'p', 'v2e019-readout', panneau);
    lecture.setAttribute('role', 'status');
    lecture.setAttribute('aria-live', 'polite');
    lecture.setAttribute('aria-atomic', 'true');
    panneau.appendChild(lecture);
    const mesures = unSeul(ctx, 'v2e019-metrics', 'dl', 'v2e019-metrics', panneau);
    mesures.textContent = '';
    panneau.appendChild(mesures);
    const constats = unSeul(ctx, 'v2e019-findings', 'ul', 'v2e019-findings', panneau);
    constats.textContent = '';
    panneau.appendChild(constats);

    layout.dataset.v2e019Planets = String(total);
    layout.dataset.v2e019Render = String(rendus);
    layout.dataset.v2e019Mode = total === 0 ? 'vide' : 'actif';

  /* E019-01 — Validité des coordonnées : --x et --y doivent être finis et
   * compris dans [0 ; 100]. Une valeur illisible est dite « defaut », une
   * valeur finie hors plage est dite « hors-plage » ; les deux sont marquées
   * textuellement, sans corriger la position réelle. */
    const coords = planetes.map((planete) => {
      const brutX = propriete(planete, '--x');
      const brutY = propriete(planete, '--y');
      const x = nombre(brutX);
      const y = nombre(brutY);
      const lisible = Number.isFinite(x) && Number.isFinite(y);
      const valide = lisible && x >= 0 && x <= 100 && y >= 0 && y <= 100;
      if (!valide) {
        planete.setAttribute('data-v2e019-coord', lisible ? 'hors-plage' : 'defaut');
        marquer(planete, 'Coordonnee invalide');
      }
      return {
        noeud: planete,
        x: lisible ? x : 50,
        y: lisible ? y : 50,
        xPx: (lisible ? x : 50) / 100 * geo.w,
        yPx: (lisible ? y : 50) / 100 * geo.h,
        valide,
      };
    });
    const coordsInvalides = coords.filter(pos => !pos.valide).length;
    layout.dataset.v2e019CoordIssues = String(coordsInvalides);

  /* E019-02 — Cohérence de l'année : le millésime de `data-label` (avant le
   * séparateur « · ») doit être le même que celui de l'`aria-label`. Une
   * année absente ou divergente est signalée ; les deux attributs d'origine
   * restent intacts. */
    let anneesIncoherentes = 0;
    planetes.forEach((planete) => {
      const anLabel = anneeDe(attribut(planete, 'data-label'));
      const anAria = anneeDe(attribut(planete, 'aria-label'));
      if (!anLabel || !anAria || anLabel !== anAria) {
        anneesIncoherentes += 1;
        planete.setAttribute('data-v2e019-year', '1');
        marquer(planete, 'Annee incoherente');
      }
    });
    layout.dataset.v2e019YearIssues = String(anneesIncoherentes);

  /* E019-03 — Titres d'événements dupliqués : deux repères portant le même
   * titre visible sont ambigus, même si leurs `aria-label` diffèrent par le
   * rang. Seule la seconde occurrence est marquée, l'ordre du DOM servant de
   * référence déterministe. */
    const titresVus = new Set();
    let titresRepetes = 0;
    planetes.forEach((planete) => {
      const titreEvenement = titreDe(attribut(planete, 'data-label'));
      if (!titreEvenement) return;
      if (titresVus.has(titreEvenement)) {
        titresRepetes += 1;
        planete.setAttribute('data-v2e019-title-dup', '1');
        marquer(planete, 'Titre repete');
      } else {
        titresVus.add(titreEvenement);
      }
    });
    layout.dataset.v2e019TitleDups = String(titresRepetes);

  /* E019-04 — Cibles tactiles : la taille de nœud est 18, 22 ou 28 px selon
   * le nombre de repères, donc sous le seuil de 24 px. Quand c'est le cas,
   * chaque planète reçoit un attribut dédié et une zone de frappe étendue de
   * 8 px de chaque côté par un ::before translucent, sans déplacer le disque. */
    let petitesCibles = 0;
    if (taille > 0 && taille < 24) {
      planetes.forEach((planete) => {
        planete.setAttribute('data-v2e019-small', '1');
        petitesCibles += 1;
      });
    }
    layout.dataset.v2e019SmallTargets = String(petitesCibles);

  /* E019-05 — Collision des étiquettes : les libellés font 118 px de large
   * et se placent sous le disque. Deux étiquettes sont dites superposées
   * quand leurs bandes horizontales se recoupent et que leurs hauteurs sont
   * presque égales. Le test n'est actif que si le champ est mesurable. */
    let collisionsEtiquettes = 0;
    if (geo.mesurable) {
      for (let i = 0; i < coords.length; i += 1) {
        for (let j = i + 1; j < coords.length; j += 1) {
          const a = coords[i];
          const b = coords[j];
          const yA = a.yPx + taille / 2 + 10;
          const yB = b.yPx + taille / 2 + 10;
          if (Math.abs(a.xPx - b.xPx) < 118 && Math.abs(yA - yB) < 12) {
            collisionsEtiquettes += 1;
            marquer(a.noeud, 'Etiquettes superposees');
            marquer(b.noeud, 'Etiquettes superposees');
          }
        }
      }
      layout.dataset.v2e019LabelCollisions = String(collisionsEtiquettes);
    } else {
      layout.dataset.v2e019LabelCollisions = 'non mesure';
    }

  /* E019-06 — Planètes non visibles : un bouton rendu mais sans boîte (ou
   * explicitement masqué) ne peut être atteint ni à la souris ni au clavier.
   * Le contrôle est désactivé quand le champ lui-même n'est pas mesurable,
   * afin de ne pas confondre mise en page différée et réel masquage. */
    let invisibles = 0;
    if (geo.mesurable) {
      planetes.forEach((planete) => {
        const zone = typeof planete.getBoundingClientRect === 'function'
          ? planete.getBoundingClientRect() : { width: taille, height: taille };
        const masque = planete.hidden === true || planete.disabled === true
          || (zone.width === 0 && zone.height === 0);
        if (masque) {
          invisibles += 1;
          planete.setAttribute('data-v2e019-hidden', '1');
          marquer(planete, 'Planete invisible');
        }
      });
      layout.dataset.v2e019Invisible = String(invisibles);
    } else {
      layout.dataset.v2e019Invisible = 'non mesure';
    }

  /* E019-07 — Conformité ARIA structurelle : chaque planète doit rester un
   * bouton `type="button"` avec un `aria-label` et un `title` non vides ; un
   * `aria-current` présent doit valoir « true ». Ce contrôle complète, sans
   * le redoubler, le seul comptage des doublons de la passe 1. */
    let ariaIncomplets = 0;
    planetes.forEach((planete) => {
      const aria = attribut(planete, 'aria-label');
      const titre = attribut(planete, 'title');
      const type = attribut(planete, 'type');
      const courant = attribut(planete, 'aria-current');
      const incomplet = type !== 'button' || !aria || !titre
        || (courant !== '' && courant !== 'true');
      if (incomplet) {
        ariaIncomplets += 1;
        planete.setAttribute('data-v2e019-aria', '1');
        marquer(planete, 'ARIA incomplet');
      }
    });
    layout.dataset.v2e019AriaIssues = String(ariaIncomplets);

  /* E019-08 — Numérotation continue : le texte visible est le rang local
   * (1 … N). Une suite trouée, répétée ou non numérique trahit un rendu
   * incohérent ; l'écart est publié sans modifier le texte affiché. */
    let ruptures = 0;
    planetes.forEach((planete, index) => {
      const attendu = String(index + 1);
      if (texte(planete) !== attendu) {
        ruptures += 1;
        planete.setAttribute('data-v2e019-sequence', '1');
        marquer(planete, 'Numerotation fausse');
      }
    });
    layout.dataset.v2e019Sequence = String(ruptures);

  /* E019-09 — Navigation clavier dédiée : un écouteur de capture unique,
   * enregistré sous une clé window propre, déplace le focus entre planètes
   * avec les quatre flèches puis Début/Fin. Il interroge le DOM vivant à
   * chaque frappe, donc il survit à un re-rendu sans retenir de nœud périmé. */
    const couche = planetes.length && planetes[0].parentNode ? planetes[0].parentNode : null;
    if (couche && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      const precedent = window[NAV_KEY];
      if (typeof precedent === 'function' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('keydown', precedent, true);
      }
      const surNav = (evenement) => {
        if (!evenement || evenement.defaultPrevented || evenement.ctrlKey
            || evenement.metaKey || evenement.altKey) return;
        const cible = evenement.target;
        if (!cible || cible.nodeType !== 1 || typeof cible.matches !== 'function') return;
        if (!cible.matches('button.const-planet') || !couche.contains(cible)) return;
        const liste = Array.from(couche.querySelectorAll(SELECTEUR))
          .filter(noeud => !noeud.disabled && noeud.tabIndex >= 0);
        if (liste.length < 2) return;
        const ou = liste.indexOf(cible);
        if (ou < 0) return;
        let suivant = ou;
        if (evenement.key === 'ArrowRight' || evenement.key === 'ArrowDown') {
          suivant = (ou + 1) % liste.length;
        } else if (evenement.key === 'ArrowLeft' || evenement.key === 'ArrowUp') {
          suivant = (ou - 1 + liste.length) % liste.length;
        } else if (evenement.key === 'Home') {
          suivant = 0;
        } else if (evenement.key === 'End') {
          suivant = liste.length - 1;
        } else {
          return;
        }
        evenement.preventDefault();
        evenement.stopPropagation();
        const dest = liste[suivant];
        if (dest && dest !== cible) {
          dest.focus({ preventScroll: true });
          dest.click();
        }
      };
      window[NAV_KEY] = surNav;
      window.addEventListener('keydown', surNav, true);
      layout.dataset.v2e019Nav = 'actif';
    } else {
      layout.dataset.v2e019Nav = 'inactif';
    }

  /* E019-10 — Annonce live et registre de conformité : la région
   * `role="status"` résume les dix contrôles ; un écouteur délégué, posé une
   * seule fois par layout, annonce la planète retenue. La légende définit
   * chaque formule et deux témoins (unicité des IDs, mouvement réduit)
   * ferment l'audit. */
    const lignes = [
      ['Planètes', String(total)],
      ['Coordonnées invalides', String(coordsInvalides)],
      ['Années incohérentes', String(anneesIncoherentes)],
      ['Titres répétés', String(titresRepetes)],
      ['Cibles < 24 px', String(petitesCibles)],
      ['Collisions d’étiquettes', String(layout.dataset.v2e019LabelCollisions)],
      ['Planètes invisibles', String(layout.dataset.v2e019Invisible)],
      ['ARIA incomplets', String(ariaIncomplets)],
      ['Ruptures de numérotation', String(ruptures)],
      ['Rendus', String(rendus)],
    ];
    lignes.forEach(([nom, valeur]) => {
      const rangee = nouveau(ctx, 'div', '');
      rangee.appendChild(nouveau(ctx, 'dt', '', nom));
      rangee.appendChild(nouveau(ctx, 'dd', '', valeur));
      mesures.appendChild(rangee);
    });

    const signales = planetes
      .map((planete, index) => {
        const tag = attribut(planete, 'data-v2e019-tag');
        return tag ? `Repère ${index + 1} — ${tag}.` : '';
      })
      .filter(Boolean);
    if (!signales.length) signales.push('Aucun écart V2 détecté sur les planètes rendues.');
    signales.forEach(phrase => constats.appendChild(nouveau(ctx, 'li', '', phrase)));

    const legend = unSeul(ctx, 'v2e019-legend', 'details', '', panneau);
    legend.textContent = '';
    legend.appendChild(nouveau(ctx, 'summary', '', 'Comprendre les garde-fous V2'));
    const definitions = nouveau(ctx, 'dl', 'v2e019-defs');
    const paires = [
      ['Coordonnée invalide', '--x et --y doivent être finis et appartenir à [0 ; 100] ; sinon la valeur est dite « defaut » ou « hors-plage ».'],
      ['Année incohérente', 'Le millésime de data-label (avant « · ») doit égaler celui de l’aria-label ; absence ou divergence sont signalées.'],
      ['Titre répété', 'Deux data-label partageant le même texte après « · » sont ambigus ; seul le second est marqué.'],
      ['Cible tactile', 'Une taille de nœud inférieure à 24 px reçoit une zone de frappe étendue de 8 px par un ::before Translucent.'],
      ['Collision d’étiquettes', 'Deux libellés de 118 px dont les bandes se recoupent à moins de 12 px de hauteur sont comptés comme superposés.'],
      ['Écart de numérotation', 'Le texte visible doit valoir 1 … N dans l’ordre du DOM ; tout écart est signalé sans correction.'],
    ];
    paires.forEach(([nom, definition]) => {
      const rangee = nouveau(ctx, 'div', '');
      rangee.appendChild(nouveau(ctx, 'dt', '', nom));
      rangee.appendChild(nouveau(ctx, 'dd', '', definition));
      definitions.appendChild(rangee);
    });
    legend.appendChild(definitions);
    panneau.appendChild(legend);

    lecture.textContent = `Audit V2 · ${total} planète(s) · ${coordsInvalides} coordonnée(s) invalide(s) · `
      + `${anneesIncoherentes} année(s) incohérente(s) · ${titresRepetes} titre(s) répété(s) · `
      + `${layout.dataset.v2e019LabelCollisions} collision(s) d’étiquettes · ${layout.dataset.v2e019Invisible} `
      + `planète(s) invisible(s) · ${ariaIncomplets} ARIA incomplet(s) · ${ruptures} rupture(s) de numérotation.`;

    if (!layout.hasAttribute('data-v2e019-ann')) {
      layout.setAttribute('data-v2e019-ann', '1');
      layout.addEventListener('click', (evenement) => {
        const cible = evenement && evenement.target;
        const planete = cible && cible.nodeType === 1 && typeof cible.closest === 'function'
          ? cible.closest('button.const-planet') : null;
        if (!planete || !layout.contains(planete)) return;
        lecture.textContent = `Repère retenu : ${attribut(planete, 'data-label') || texte(planete)}.`;
      });
      window[ANN_KEY] = layout;
    }

    layout.dataset.v2e019Reduced = String(Boolean(ctx.reducedMotion && ctx.reducedMotion()));
    layout.dataset.v2e019Unique = String(IDS.every(id => document.querySelectorAll(`[id="${id}"]`).length <= 1));
  } catch (_) {
    /* Greffon tolérant : un DOM inattendu ne doit jamais interrompre le rendu. */
  }
});
