import { register } from './registry.js';

/* Lentille M20 — Annonces live du survol (domaine D : accessibilité / région live).
 *
 * Le chemin pointeur du globe (globe.js, callback `onHover` du moteur) met à jour
 * `#globe-hover-readout`, un <p> purement visuel : aucun `say()` n'est appelé, donc
 * le survol d'un pays est silencieux pour un lecteur d'écran. Le chemin clavier
 * (`highlight()`) appelle lui-même `say()` avec un message riche (Indication
 * « Entrée pour ouvrir »). M20 comble uniquement le vide du chemin pointeur,
 * en réutilisant l'unique région live partagée (`ctx.say` → `#globe-live`).
 *
 * Dix chantiers, tous implémentés ici. Aucun fichier partagé modifié, aucun
 * réseau, aucun aléa, aucun console.*, aucun sélecteur de test ajouté, aucun
 * timer, aucune seconde région aria-live.
 */

const DOMAIN_TOTAL = 14;
const HOST_HOVER = 'm20Hover';      // miroir d'état auditable, pas un sélecteur de test
const HOST_COUNT = 'm20Announced';  // compteur cumulé d'annonces effectuées

/* État module : un seul jeu de callbacks, un seul dédupage, un seul compteur.
 * Le registre pousse les callbacks à chaque rendu (registry.js:50) : les gardes
 * ci-dessous rendent l'installation idempotente. */
let hooksRegistered = false;
let sayFn = null;
let host = null;
let lastCode = null;
let announceCount = 0;

function safeList(value) {
  return Array.isArray(value) ? value : [];
}

function formatYear(year) {
  if (typeof year !== 'number' || !Number.isFinite(year)) return '?';
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

function plural(count, singular) {
  return `${count} ${singular}${count > 1 ? 's' : ''}`;
}

/* M20-03 : message concis, indexable et dérivé des mêmes chiffres que le readout
 * visuel de globe.js (countryMeta). Toutes les données sont gardées : un pays
 * partiel ne produit jamais « undefined » ni « NaN ». */
function describe(country) {
  const name = typeof country.name === 'string' && country.name ? country.name : 'Pays';
  const domain = safeList(country.domain);
  const points = safeList(country.points);
  const eras = safeList(country.eras).length;
  const events = safeList(country.events).length;
  const domains = new Set(points.map((point) => point && point.domain).filter((d) => d != null)).size;
  const parts = [name];
  if (domain.length >= 2) parts.push(`${formatYear(domain[0])} → ${formatYear(domain[1])}`);
  parts.push(plural(eras, 'ère'), plural(events, 'repère'), plural(points.length, 'point'));
  if (domains) parts.push(`${domains}/${DOMAIN_TOTAL} domaines`);
  return `${parts.join(' · ')}.`;
}

/* M20-06 : sortie de survol. On réinitialise le dédupage (pour qu'un retour sur
 * le même pays soit ré-annoncé) sans écrire de message : le silence vaut mieux
 * qu'un « survol terminé » bavard, et on ne touche jamais au message de
 * navigation précédemment émis par globe.js. */
function handleLeave() {
  lastCode = null;
  if (host && host.dataset) host.dataset[HOST_HOVER] = '';
}

/* M20-01/02/03/04/05/07/08/09 : unique point d'annonce du survol. */
function handleHover(payload) {
  const data = payload || {};
  const country = data.country || null;
  const code = data.code || (country && country.code) || null;
  if (!country || !code) { handleLeave(); return; }

  if (host && host.dataset) host.dataset[HOST_HOVER] = String(code);

  /* M20-04 : setHover() déduplique côté moteur (globe-engine.js:108) mais
   * highlight() de globe.js appelle aussi notifyMondeHover explicitement :
   * sans ce garde, une navigation clavier annoncerait deux fois le même pays. */
  if (code === lastCode) return;
  lastCode = code;

  /* M20-07 : on n'annonce jamais dans un onglet masqué ; l'état est tout de même
   * à jour (lastCode), donc aucun rattrapage surprise au retour. */
  if (document.hidden) return;
  if (typeof sayFn !== 'function') return;

  const message = describe(country);
  if (!message) return;

  /* M20-05 : appel synchrone, sans setTimeout ni rAF. Dans le chemin clavier,
   * highlight() appelle notifyMondeHover AVANT son propre say() : notre message
   * est donc écrasé par le message clavier riche (une seule annonce finale).
   * Dans le chemin pointeur, globe.js n'appelle pas say() : notre message reste.
   * Aucun timer parasite, cohérent avec M07-02/M07-06. */
  announceCount += 1;
  if (host && host.dataset) host.dataset[HOST_COUNT] = String(announceCount);
  sayFn(message);
}

/* M20-10 : aucune dépendance au reveal ni au mouvement réduit : l'annonce est
 * purement textuelle et reste disponible même si reducedMotion() est vrai ou
 * si reveal est absent. On n'interfère donc pas avec le zoom patché par M15. */

register('M20', (ctx) => {
  if (!ctx) return;
  if (ctx.host) host = ctx.host;
  if (typeof ctx.say === 'function') sayFn = ctx.say;

  /* M20-02 : garde module — les tableaux hoverCallbacks/leaveCallbacks du
   * registre vivent hors du rendu et accumuleraient un callback par render. */
  if (hooksRegistered) return;
  if (typeof ctx.onHover !== 'function' || typeof ctx.onLeave !== 'function') return;
  hooksRegistered = true;
  ctx.onHover(handleHover);
  ctx.onLeave(handleLeave);
});
