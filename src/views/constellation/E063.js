import { register } from './registry.js';

/* Lentille E063 — contraste visuel appliqué aux métriques chiffrées de la vue
 * Constellation. Dix chantiers concrets et variés (E063-01 … E063-10) : aucun
 * appel réseau, aucune source aléatoire, aucun minuteur ni boucle d'animation
 * propre. Un seul enregistrement, une seule feuille via ctx.css, des identifiants
 * DOM tous préfixés e063-. Greffon tolérant : chaque appel sensible est gardé
 * et ne lève jamais d'exception, même avec un contexte partiel. */

const CSS_ID = 'constellation-e063';
const PANNEAU_ID = 'e063-metriques';
const LIVE_ID = 'e063-live';

/* E063-06 — Calcul déterministe des métriques depuis le DOM déjà rendu.
 * Aucune valeur n'est inventée ni tirée au sort : tout est recompté à chaque
 * rendu depuis les couches de la vue et l'attribut d'état is-active. */
function indexActif(liste) {
  for (let i = 0; i < liste.length; i += 1) {
    const noeud = liste[i];
    if (noeud && noeud.classList && typeof noeud.classList.contains === 'function'
        && noeud.classList.contains('is-active')) return i + 1;
  }
  return 0;
}

function couche(layout, selecteur) {
  try {
    const noeud = layout.querySelector(selecteur);
    return noeud && typeof noeud.querySelectorAll === 'function'
      ? Array.from(noeud.querySelectorAll('button')) : [];
  } catch {
    return [];
  }
}

function virgule(value) {
  return value.toFixed(1).replace('.', ',');
}

register('E063', (ctx) => {
  const { viewId, layout, css, el, reducedMotion } = ctx || {};

  /* E063-10 — Garde d'entrée et idempotence : sans layout exploitable, aucun
   * ajout au DOM n'est tenté. Avant toute création, les nœuds e063-* laissés
   * par une exécution précédente sont retirés. */
  if (typeof document === 'undefined' || !layout
      || typeof layout.querySelector !== 'function'
      || typeof layout.insertBefore !== 'function'
      || typeof el !== 'function') return;
  if (typeof viewId === 'string' && viewId !== 'constellation') return;

  try {
    const anciens = layout.querySelectorAll('[id^="e063-"]');
    if (anciens && typeof anciens.length === 'number') {
      Array.from(anciens).forEach((noeud) => {
        if (noeud && typeof noeud.remove === 'function') noeud.remove();
      });
    }
  } catch { /* greffon tolérant */ }

  let calme = false;
  try { calme = !!(typeof reducedMotion === 'function' && reducedMotion()); }
  catch { calme = false; }

  /* Une seule feuille de style pour toute la lentille. Chaque chantier CSS
   * porte son propre commentaire E063-0n. */
  if (typeof css === 'function') {
    css(CSS_ID, `
/* E063-01 — Bandeau isolé : fond opaque et bordure délimitent les chiffres. */
.e063-metriques{
  display:flex;flex-wrap:wrap;align-items:stretch;gap:6px;
  margin:10px 0 2px;padding:8px 10px;
  border:1px solid var(--line-strong);border-radius:10px;
  background:#0c1018;box-shadow:inset 0 0 0 1px rgba(244,214,158,.06);
}
.e063-item{display:block;min-width:78px;padding:4px 8px;border-left:1px solid var(--line)}
.e063-item:first-child{border-left:0}
.e063-etiquette{display:block;color:var(--muted);font-size:8px;letter-spacing:.06em;text-transform:uppercase}
.e063-valeur{display:block;color:#f2f5f9;font-size:14px;font-weight:650;line-height:1.15}

/* E063-02 — Chiffres tabulaires alignés sur les métriques de la vue. */
.e063-valeur,.e063-tabulaire{font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1}

/* E063-03 — Hiérarchie de contraste : la valeur courante est plus grande,
   plus grasse et cernée ; le contraste ne repose pas sur la seule couleur. */
.e063-item[data-e063-courant="true"]{background:rgba(244,214,158,.08);border-left-color:var(--gold)}
.e063-item[data-e063-courant="true"] .e063-valeur{color:var(--gold-bright);font-size:16px;font-weight:750}

/* E063-04 — Filet de soulignement sous la métrique active, repère non coloré. */
.e063-item[data-e063-courant="true"] .e063-valeur::after{
  content:"";display:block;width:100%;height:2px;margin-top:3px;background:var(--gold-bright);
}

/* E063-05 — Étiquettes librement lisibles, séparées de leur valeur. */
.e063-valeur[aria-label]{cursor:default}
.e063-live{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}

/* E063-07 — Contraste forcé du système : couleurs Canvas et Highlight. */
@media (forced-colors:active){
  .e063-metriques{border:1px solid CanvasText;background:Canvas;box-shadow:none}
  .e063-item{border-left-color:CanvasText}
  .e063-etiquette,.e063-valeur{color:CanvasText}
  .e063-item[data-e063-courant="true"]{background:Canvas;border-left-color:Highlight}
  .e063-item[data-e063-courant="true"] .e063-valeur{color:Highlight;font-weight:700}
  .e063-item[data-e063-courant="true"] .e063-valeur::after{background:Highlight}
}

/* E063-08 — Densité mobile : fond plus dense et chiffres resserrés, la valeur
   courante restant nettement plus grande que les autres. */
@media (max-width:620px){
  .e063-metriques{gap:4px;padding:6px 8px;background:#080b11}
  .e063-item{min-width:64px;padding:3px 6px}
  .e063-etiquette{font-size:7px}
  .e063-valeur{font-size:12px}
  .e063-item[data-e063-courant="true"] .e063-valeur{font-size:14px}
}

/* E063-09 — Mouvement réduit : aucune transition, valeur sans halo. */
.e063-item,.e063-valeur{transition:color .15s ease,background-color .15s ease}
.e063-overt .e063-valeur{text-shadow:none;opacity:1}
@media (prefers-reduced-motion:reduce){
  .e063-metriques,.e063-item,.e063-valeur{transition:none!important}
}
    `);
  }

  const soleils = couche(layout, '.const-layer-suns');
  const planetes = couche(layout, '.const-layer-planets');
  const lunes = couche(layout, '.const-layer-moons');
  const nbEres = soleils.length;
  const nbRep = planetes.length;
  const nbPoints = lunes.length;
  const ereActive = nbEres ? Math.max(1, indexActif(soleils)) : 0;
  const repActif = nbRep ? Math.max(1, indexActif(planetes)) : 0;
  const ptActif = nbPoints ? Math.max(1, indexActif(lunes)) : 0;

  /* E063-06 — Synthèse chiffrée recalculée depuis les formules ci-dessus. */
  const metriques = [
    { cle: 'eres', libelle: 'Ères', valeur: String(nbEres), courant: false },
    { cle: 'reperes', libelle: 'Repères', valeur: String(nbRep), courant: false },
    { cle: 'points', libelle: 'Points vérifiés', valeur: String(nbPoints), courant: false },
    { cle: 'ere-active', libelle: 'Ère active', valeur: `${ereActive} / ${nbEres}`, courant: true },
    { cle: 'rep-active', libelle: 'Repère actif', valeur: `${repActif} / ${nbRep}`, courant: false },
    { cle: 'point-actif', libelle: 'Point actif', valeur: `${ptActif} / ${nbPoints}`, courant: false },
    { cle: 'densite', libelle: 'Points / repère', valeur: virgule(nbRep ? nbPoints / nbRep : 0), courant: false },
  ];

  /* E063-01 — Création du bandeau, inséré juste avant le champ visuel. */
  const panneau = el('div', 'e063-metriques');
  panneau.id = PANNEAU_ID;
  panneau.setAttribute('role', 'group');
  panneau.setAttribute('aria-label', 'Métriques chiffrées de la constellation');

  metriques.forEach((metrique) => {
    const item = el('div', 'e063-item');
    item.setAttribute('data-e063-metric', metrique.cle);

    /* E063-03 — Marquage de la métrique courante, pilotant le CSS. */
    if (metrique.courant) item.setAttribute('data-e063-courant', 'true');

    /* E063-05 — Étiquette et valeur distinctes, la valeur portant un libellé
       complet pour les technologies d'assistance. */
    const etiquette = el('span', 'e063-etiquette', metrique.libelle);
    const valeur = el('span', 'e063-valeur', metrique.valeur);
    valeur.setAttribute('aria-label', `${metrique.libelle} : ${metrique.valeur}`);
    item.appendChild(etiquette);
    item.appendChild(valeur);
    panneau.appendChild(item);
  });

  /* E063-09 — Mode sobre demandé au contexte, sans sonde propre. */
  if (calme) panneau.classList.add('e063-overt');

  /* E063-02 — Les chiffres déjà présents dans la vue (état, soleils, planètes)
     reçoivent la même mise en forme tabulaire que le bandeau. */
  try {
    const existants = layout.querySelectorAll('.constellation-state, .const-sun, .const-planet');
    Array.from(existants).forEach((noeud) => {
      if (noeud && noeud.classList) noeud.classList.add('e063-tabulaire');
    });
  } catch { /* greffon tolérant */ }

  /* E063-06 — Région live : la synthèse chiffrée est annoncée en français. */
  const live = el('p', 'e063-live', '');
  live.id = LIVE_ID;
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  live.textContent = `Métriques : ${nbEres} ères, ${nbRep} repères, ${nbPoints} points vérifiés. `
    + `Ère active ${ereActive} sur ${nbEres}, repère actif ${repActif} sur ${nbRep}, `
    + `point actif ${ptActif} sur ${nbPoints}, ${virgule(nbRep ? nbPoints / nbRep : 0)} points par repère.`;

  try {
    const champ = layout.querySelector('.constellation-field');
    if (champ && champ.parentNode) layout.insertBefore(panneau, champ);
    else layout.appendChild(panneau);
    layout.appendChild(live);
  } catch { /* greffon tolérant */ }
});
