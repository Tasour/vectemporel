import { register } from './registry.js';

/* Lentille E017 — Diagnostic textuel appliqué aux planètes de la vue Constellation.
 *
 * La vue rend les repères de l'ère active sous forme de boutons `.const-planet`
 * portant un numéro visible, un `data-label` (« année · titre »), un `title`,
 * un `aria-label` et une clé `data-const-key`. Cette lentille audite UNIQUEMENT
 * ce texte déjà rendu : cohérence des étiquettes, présence du séparateur,
 * graphie de l'année, numérotation visible, unicité des clés. Elle n'invente
 * aucune donnée historique, ne modifie le contenu d'aucun nœud de la vue et
 * ajoute seule sa propre signalétique. Zéro réseau, zéro aléa, zéro timer,
 * zéro rAF propre, zéro sortie de débogage.
 *
 * Contrat : greffon unique enregistré sous l'identifiant E017 (ctx => { … }) ;
 * ctx = { viewId, stage, layout, css(id, rules), el(tag, cls, text), reducedMotion() }.
 */

const CSS_ID = 'constellation-e017';
const PANEL_ID = 'e017-panel';
const TITLE_ID = 'e017-title';
const READOUT_ID = 'e017-readout';
const FINDINGS_ID = 'e017-findings';

const CSS = `
#${PANEL_ID}{
  margin:14px 0 0;padding:10px 12px;border:1px solid var(--line);border-radius:8px;
  background:var(--surface-2);color:var(--muted);font-family:inherit;
  font-size:9px;line-height:1.55;contain:layout style;
}
#${PANEL_ID} .e017-title{
  margin:0 0 6px;color:var(--gold);font-family:var(--serif);
  font-size:12px;font-weight:450;
}
#${PANEL_ID} .e017-readout{margin:0 0 8px;color:var(--ink-soft);font-size:9px;}
#${PANEL_ID} .e017-findings{margin:0;padding-left:16px;color:var(--muted-2);}
#${PANEL_ID} .e017-findings li{margin:1px 0;overflow-wrap:anywhere;}
#${PANEL_ID} .e017-findings .e017-ok{color:var(--ink-soft);}
.constellation-layout.e017 .const-planet.e017-flag{
  outline:1px dashed var(--gold);outline-offset:2px;
}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID},#${PANEL_ID} *{transition:none!important;animation:none!important;}
}`;

function creer(ctx, tag, cls, text) {
  if (typeof ctx.el === 'function') return ctx.el(tag, cls, text);
  const noeud = document.createElement(tag);
  if (cls) noeud.className = cls;
  if (text !== undefined) noeud.textContent = text;
  return noeud;
}

function lireAttribut(noeud, nom) {
  return noeud && typeof noeud.getAttribute === 'function'
    ? (noeud.getAttribute(nom) || '') : '';
}

function texte(noeud) {
  return noeud && typeof noeud.textContent === 'string' ? noeud.textContent.trim() : '';
}

/* Le libellé rendu par constellation.js est « <année> · <titre> ». */
function parties(label) {
  const sep = label.indexOf(' · ');
  if (sep < 0) return { annee: '', titre: '' };
  return { annee: label.slice(0, sep).trim(), titre: label.slice(sep + 3).trim() };
}

/* Miroir de formatYear (constellation.js:158-160). */
const GRAPHIE_ANNEE = /^\d+$|^\d+ av\. J\.-C\.$/;

register('E017', (ctx) => {
  /* Gardien : sans layout rendu par constellation.js, la lentille ne touche
   * à aucun DOM. ctx.viewId est facultatif mais vérifié quand il existe. */
  const layout = ctx && ctx.layout;
  if (!layout || layout.nodeType !== 1 || typeof layout.querySelectorAll !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'constellation') return;

  /* E017-01 — Recensement des planètes : lecture du champ rendu, effectif
   * exposé sur le layout via l'attribut data-e017-planets. */
  const planetes = Array.from(layout.querySelectorAll('.const-planet[data-const-key^="planet:"]'));
  const total = planetes.length;
  layout.dataset.e017Planets = String(total);

  /* E017-02 — Cohérence étiquette / aria-label : l'année et le titre issus
   * de data-label doivent tous deux figurer dans l'aria-label de la planète. */
  let ecartsLabel = 0;
  planetes.forEach((planete) => {
    const { annee, titre } = parties(lireAttribut(planete, 'data-label'));
    const aria = lireAttribut(planete, 'aria-label');
    if (!annee || !titre || aria.indexOf(annee) < 0 || aria.indexOf(titre) < 0) {
      ecartsLabel += 1;
    }
  });
  layout.dataset.e017LabelMismatch = String(ecartsLabel);

  /* E017-03 — Libellés vides ou sans séparateur « · » : signalement par la
   * classe e017-flag et l'attribut data-e017-flag sur la planète fautive. */
  let libellesVides = 0;
  planetes.forEach((planete) => {
    if (!parties(lireAttribut(planete, 'data-label')).titre) {
      planete.classList.add('e017-flag');
      planete.setAttribute('data-e017-flag', 'libelle');
      libellesVides += 1;
    }
  });
  layout.dataset.e017EmptyLabels = String(libellesVides);

  /* E017-04 — Unicité des clés data-const-key : les clés revues sont comptées
   * comme doublons et le total est publié sur le layout. */
  const clesVues = new Set();
  let doublons = 0;
  planetes.forEach((planete) => {
    const cle = lireAttribut(planete, 'data-const-key');
    if (clesVues.has(cle)) doublons += 1;
    else clesVues.add(cle);
  });
  layout.dataset.e017DuplicateKeys = String(doublons);

  /* E017-05 — Numérotation visible : le texte des planètes doit suivre
   * 1, 2, 3… dans l'ordre du DOM ; tout écart est comptabilisé. */
  let ecartsNumero = 0;
  planetes.forEach((planete, index) => {
    if (texte(planete) !== String(index + 1)) ecartsNumero += 1;
  });
  layout.dataset.e017Numbering = String(ecartsNumero);

  /* E017-06 — Graphie de l'année : seules les formes « 1865 » et
   * « 600 av. J.-C. » sont réputées lisibles par formatYear. */
  let ecartsAnnee = 0;
  planetes.forEach((planete) => {
    const annee = parties(lireAttribut(planete, 'data-label')).annee;
    if (annee && !GRAPHIE_ANNEE.test(annee)) ecartsAnnee += 1;
  });
  layout.dataset.e017YearFormat = String(ecartsAnnee);

  /* E017-07 — Panneau de diagnostic : section autonome avec titre et région
   * live, insérée dans le layout en remplacement de tout panneau antérieur. */
  const panneau = creer(ctx, 'section', 'e017-panel');
  panneau.id = PANEL_ID;
  panneau.setAttribute('aria-labelledby', TITLE_ID);
  const titre = creer(ctx, 'h3', 'e017-title', 'Diagnostic textuel des planètes · E017');
  titre.id = TITLE_ID;
  panneau.appendChild(titre);
  const lecture = creer(ctx, 'p', 'e017-readout');
  lecture.id = READOUT_ID;
  lecture.setAttribute('role', 'status');
  lecture.setAttribute('aria-live', 'polite');
  lecture.setAttribute('aria-atomic', 'true');
  panneau.appendChild(lecture);
  const constats = creer(ctx, 'ul', 'e017-findings');
  constats.id = FINDINGS_ID;
  panneau.appendChild(constats);
  const precedent = document.getElementById(PANEL_ID);
  if (precedent && precedent.parentNode) precedent.parentNode.removeChild(precedent);
  layout.appendChild(panneau);

  /* E017-08 — Constats par planète : un énoncé textuel par repère, dérivé de
   * son libellé, ajouté à la liste ; la région live résume les cinq mesures. */
  planetes.forEach((planete, index) => {
    const { annee, titre: intitule } = parties(lireAttribut(planete, 'data-label'));
    const item = creer(ctx, 'li', intitule ? 'e017-ok' : '',
      `Repère ${index + 1} · ${annee || 'année absente'} · ${intitule || 'titre absent'}`);
    constats.appendChild(item);
  });
  lecture.textContent = `${total} planète(s) · ${ecartsLabel} écart(s) étiquette/aria · `
    + `${libellesVides} libellé(s) vide(s) · ${doublons} clé(s) dupliquée(s) · `
    + `${ecartsNumero} écart(s) de numérotation · ${ecartsAnnee} graphie(s) d'année atypique(s).`;

  /* E017-09 — Écouteur clavier délégué : au focus d'une planète, la région
   * live restitue son diagnostic textuel (équivalent clavier du survol). */
  if (!layout.dataset.e017Listener) {
    layout.addEventListener('focusin', (event) => {
      const cible = event.target && typeof event.target.closest === 'function'
        ? event.target.closest('.const-planet[data-const-key^="planet:"]') : null;
      if (!cible || !layout.contains(cible)) return;
      const { annee, titre } = parties(lireAttribut(cible, 'data-label'));
      lecture.textContent = `Planète en focus · ${annee || 'année absente'} · `
        + `${titre || 'titre absent'} · ${titre ? 'libellé lisible' : 'libellé à revoir'}.`;
    });
    layout.dataset.e017Listener = '1';
  }

  /* E017-10 — Verdict agrégé et feuille de style unique : le layout porte la
   * classe de portée et un verdict dérivé des cinq mesures du diagnostic. */
  const coherent = !ecartsLabel && !libellesVides && !doublons && !ecartsNumero && !ecartsAnnee;
  layout.classList.add('e017');
  layout.dataset.e017Verdict = coherent ? 'coherent' : 'a-revoir';
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);
});
