import { register } from './registry.js';

/* Lentille E27 — Transitions.
   Dix chantiers autour des moments de bascule de la chronologie : passage
   d'une ère à l'autre, passage d'un repère à l'autre, bascule de filtre,
   entrée dans la vue et retour à la carte. Tout est dérivé du DOM rendu par
   chronology.js : aucune donnée inventée, aucun appel réseau, aucune console,
   aucune animation qui ne se dégrade pas proprement.
   Contrat : register('E27', ctx => {...}) ; ctx = { viewId, stage, layout,
   css(id, rules), el(tag, cls, text), reducedMotion() }. */

const LIVE_ID = 'e27-transition-live';

/* Mémoire de la dernière transition d'ère franchie. Persiste entre deux
   rendus complets du DOM (la coque reconstruit tout à chaque changement). */
let derniereEre = null;

function formaterAnnee(valeur) {
  const an = Number(valeur);
  if (!Number.isFinite(an)) return 'année inconnue';
  return an < 0 ? `${Math.abs(an)} av. J.-C.` : String(an);
}

function selecteur(racine, selector) {
  return racine && typeof racine.querySelector === 'function'
    ? racine.querySelector(selector)
    : null;
}

function tous(racine, selector) {
  return racine && typeof racine.querySelectorAll === 'function'
    ? Array.from(racine.querySelectorAll(selector))
    : [];
}

function texte(node) {
  return node && node.textContent ? node.textContent.trim() : '';
}

/* Région live unique, créée hors de #app pour survivre au innerHTML de la
   coque. Un seul noeud par document, retrouvé par son identifiant. */
function annoncer(ctx, message) {
  if (!message) return;
  let live = document.getElementById(LIVE_ID);
  if (!live) {
    live = ctx.el('p', 'e27-sr-only');
    live.id = LIVE_ID;
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    document.body.appendChild(live);
  }
  live.textContent = message;
}

register('E27', (ctx) => {
  const { layout } = ctx;
  if (!layout) return;

  /* E27-10 — Feuille de styles unique, plafonnée aux classes e27-* et
     conditionnée à prefers-reduced-motion. Injectée une seule fois par
     ctx.css (cssOnce), donc stable entre deux rendus. */
  ctx.css('chronology-e27', `
#e27-era-seams{margin:8px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5}
.e27-active-mark{margin-left:6px;padding:1px 5px;border:1px solid var(--gold);border-radius:999px;color:var(--gold-bright);font-size:8px;white-space:nowrap}
@keyframes e27-pulse{0%,100%{opacity:.65}50%{opacity:1}}
@media (prefers-reduced-motion:no-preference){.e27-active-mark{animation:e27-pulse 2.4s ease-in-out infinite}}
#e27-stepper,#e27-ecart{margin:8px 0 0;color:var(--muted);font-size:9px;line-height:1.5}
#e27-ecart{color:var(--gold-bright);font-variant-numeric:tabular-nums}
#e27-filtre-temoins{flex:1 1 100%;margin:2px 0 0;color:var(--gold-bright);font-size:9px;line-height:1.5}
#e27-pont-eres{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0}
.e27-bridge-btn{min-height:36px;padding:6px 10px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--ink);font:inherit;font-size:9px;cursor:pointer}
.e27-bridge-btn:hover:not(:disabled){border-color:var(--gold);color:var(--gold-bright)}
.e27-bridge-btn:disabled{opacity:.4;cursor:not-allowed}
.e27-bridge-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
#e27-note-entree{margin:6px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5}
#e27-metriques-ere{margin:8px 0 0;color:var(--muted);font-size:9px;font-variant-numeric:tabular-nums}
.e27-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media (prefers-reduced-motion:reduce){.e27-active-mark{animation:none!important}}
[data-e27-motion="reduit"] .e27-active-mark{animation:none!important}`);

  /* Le régime de mouvement est une donnée observable sur le conteneur, sans
     modifier le comportement des autres lentilles. */
  layout.dataset.e27Motion = ctx.reducedMotion() ? 'reduit' : 'anime';

  const navEres = selecteur(layout, '#atlas-chrono-eras');
  const outils = selecteur(layout, '#atlas-chrono-tools');
  const liste = selecteur(layout, '#atlas-chrono-events');
  const fiche = selecteur(layout, '#atlas-chrono-aside');
  const recherche = selecteur(layout, '#atlas-chrono-search');
  const orientation = selecteur(layout, '.nav-c2-orientation');

  const bandes = tous(navEres, '.atlas-chrono-band');
  const bandeActive = bandes.find((bande) => bande.getAttribute('aria-current') === 'true') || null;
  const indexEre = bandes.indexOf(bandeActive);
  const cartes = tous(liste, '.event-card');
  const indexRepere = cartes.findIndex((carte) => carte.getAttribute('aria-current') === 'true');

  /* E27-01 — Ruban de transitions : chaque passage entre deux ères
     consécutives est écrit en texte réel, lisible et indexable. */
  if (bandes.length > 1 && !selecteur(layout, '#e27-era-seams')) {
    const jonctions = [];
    for (let i = 1; i < bandes.length; i += 1) {
      const avant = bandes[i - 1];
      const apres = bandes[i];
      const nomAvant = texte(selecteur(avant, 'span')) || 'ère précédente';
      const nomApres = texte(selecteur(apres, 'span')) || 'ère suivante';
      jonctions.push(`${nomAvant} → ${nomApres}`);
    }
    if (jonctions.length) {
      const ruban = ctx.el('p', 'e27-seams', `Transitions d'ères : ${jonctions.join(' · ')}.`);
      ruban.id = 'e27-era-seams';
      if (navEres) navEres.appendChild(ruban);
    }
  }

  /* E27-02 — Marqueur de seuil : l'ère active porte une étiquette « en cours »
     qui rend visible le franchissement, sans porter d'information par la
     seule couleur. */
  if (bandeActive && !selecteur(bandeActive, '.e27-active-mark')) {
    const marque = ctx.el('span', 'e27-active-mark', 'en cours');
    bandeActive.appendChild(marque);
  }

  /* E27-03 — Annonce de transition d'ère dans une région live locale.
     La clé inclut le pays : changer de pays peut réutiliser un identifiant
     d'ère identique sans être la même situation. */
  const pays = layout.dataset.countryId || '';
  const cleEre = `${pays}:${bandeActive ? bandeActive.dataset.eraId || '' : ''}`;
  if (derniereEre !== null && cleEre !== derniereEre) {
    const nomEre = texte(selecteur(bandeActive, 'span')) || 'ère non nommée';
    annoncer(ctx, `Transition d'ère : entrée dans « ${nomEre} ». ${cartes.length} repère(s) affiché(s).`);
  }
  derniereEre = cleEre;

  /* E27-04 — Fil de transition entre repères : avant / courant / après,
     écrit en texte dans la fiche latérale. */
  const courante = indexRepere >= 0 ? cartes[indexRepere] : null;
  const precedente = indexRepere > 0 ? cartes[indexRepere - 1] : null;
  const suivante = indexRepere >= 0 && indexRepere < cartes.length - 1
    ? cartes[indexRepere + 1]
    : null;
  if (courante && !selecteur(layout, '#e27-stepper')) {
    const titre = (carte) => texte(selecteur(carte, 'strong')) || 'repère sans titre';
    const an = (carte) => {
      const li = carte && carte.parentElement;
      return formaterAnnee(li && li.dataset.year);
    };
    const fil = ctx.el(
      'p',
      'e27-stepper',
      `Transition de repères : ${precedente ? `${titre(precedente)} (${an(precedente)})` : 'début de liste'}`
        + ` → ${titre(courante)} (${an(courante)})`
        + ` → ${suivante ? `${titre(suivante)} (${an(suivante)})` : 'fin de liste'}.`
    );
    fil.id = 'e27-stepper';
    if (fiche) fiche.appendChild(fil);
  }

  /* E27-05 — Mesure de portée de la transition : écart en années avec le
     repère précédent, recalculé depuis les données du DOM. */
  if (courante && precedente && !selecteur(layout, '#e27-ecart')) {
    const anCourant = Number(courante.parentElement && courante.parentElement.dataset.year);
    const anPrecedent = Number(precedente.parentElement && precedente.parentElement.dataset.year);
    if (Number.isFinite(anCourant) && Number.isFinite(anPrecedent)) {
      const ecart = Math.abs(anCourant - anPrecedent);
      const mesure = ctx.el(
        'p',
        'e27-ecart',
        `Écart de transition : ${ecart} an${ecart > 1 ? 's' : ''} entre les deux repères consécutifs.`
      );
      mesure.id = 'e27-ecart';
      if (fiche) fiche.appendChild(mesure);
    }
  }

  /* E27-06 — Témoin de transition de filtre : quand un filtre est actif, la
     lecture quitte le périmètre d'une ère pour parcourir tout le pays. */
  const requete = recherche ? recherche.value.trim() : '';
  const tagActif = tous(outils, '.atlas-chrono-tag[aria-pressed="true"]')[0] || null;
  if ((requete || tagActif) && !selecteur(layout, '#e27-filtre-temoins')) {
    const temoin = ctx.el(
      'p',
      'e27-filter-transition',
      `Transition de filtre active : ${cartes.length} repère(s) sur l'ensemble du pays`
        + `${tagActif ? `, thème « ${texte(tagActif)} »` : ''}`
        + `${requete ? `, recherche « ${requete} »` : ''}.`
    );
    temoin.id = 'e27-filtre-temoins';
    if (outils) outils.appendChild(temoin);
  }

  /* E27-07 — Pont clavier entre ères : deux boutons visibles qui déclenchent
     la même transition que les bandes, avec état désactivé aux bornes. */
  if (navEres && bandes.length > 1 && !selecteur(layout, '#e27-pont-eres')) {
    const pont = ctx.el('nav', 'e27-era-bridge');
    pont.id = 'e27-pont-eres';
    pont.setAttribute('aria-label', 'Transition entre ères');
    const precedent = ctx.el('button', 'e27-bridge-btn', '← Ère précédente');
    const suivant = ctx.el('button', 'e27-bridge-btn', 'Ère suivante →');
    precedent.type = suivant.type = 'button';
    precedent.id = 'e27-ere-precedente';
    suivant.id = 'e27-ere-suivante';
    precedent.setAttribute('aria-controls', 'atlas-chrono-events');
    suivant.setAttribute('aria-controls', 'atlas-chrono-events');
    precedent.disabled = indexEre <= 0;
    suivant.disabled = indexEre < 0 || indexEre >= bandes.length - 1;
    precedent.addEventListener('click', () => {
      const cible = bandes[indexEre - 1];
      if (cible) cible.click();
    });
    suivant.addEventListener('click', () => {
      const cible = bandes[indexEre + 1];
      if (cible) cible.click();
    });
    pont.append(precedent, suivant);
    navEres.appendChild(pont);
  }

  /* E27-08 — Transition d'entrée : le bloc de situation rappelle d'où vient
     la chronologie et comment revenir à la vue globale. */
  if (orientation && !selecteur(layout, '#e27-note-entree')) {
    const note = ctx.el(
      'p',
      'e27-entry-note',
      "Transition d'entrée : cette chronologie s'ouvre depuis la carte du monde ; « Retour au monde » rétablit la vue globale."
    );
    note.id = 'e27-note-entree';
    orientation.appendChild(note);
  }

  /* E27-09 — Synthèse chiffrée de l'ère franchie : nombre de repères affichés
     et plage couverte, recalculés depuis les attributs des bandes. */
  if (bandeActive && !selecteur(layout, '#e27-metriques-ere')) {
    const debut = Number(bandeActive.dataset.start);
    const fin = Number(bandeActive.dataset.end);
    const duree = Number.isFinite(debut) && Number.isFinite(fin)
      ? Math.max(0, fin - debut)
      : null;
    const nomEre = texte(selecteur(bandeActive, 'span')) || 'ère courante';
    const metriques = ctx.el(
      'p',
      'e27-era-metrics',
      `Ère « ${nomEre} » : ${cartes.length} repère(s) affiché(s) · plage ${formaterAnnee(debut)} → ${formaterAnnee(fin)}`
        + `${duree !== null ? ` · ${duree} an${duree > 1 ? 's' : ''} couverts` : ''}.`
    );
    metriques.id = 'e27-metriques-ere';
    if (navEres) navEres.appendChild(metriques);
  }
});
