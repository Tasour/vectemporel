import { register } from './registry.js';

/* Lentille E028 — Instrumentation E2E appliquée aux lunes de la vue Constellation.
 *
 * Les lunes sont les points vérifiés du repère actif, rendus par constellation.js
 * sous forme de boutons `.const-moon` dans la couche `.const-layer-moons`. Cette
 * lentille ne modifie aucune donnée historique : elle instrumente le balisage déjà
 * rendu pour en faire une cible d'essais de bout en bout déterministe — sélecteurs
 * stables, signature sémantique, horloge logique, journal d'interactions,
 * assertions auto-évaluées, snapshot normalisé, couverture, empreinte géométrique,
 * pont de commande pilotable par événement DOM et verdict agrégé.
 *
 * Zéro réseau, zéro aléa, zéro console, zéro timer, zéro rAF propre.
 * Contrat : register('E028', ctx => { … }) ; ctx = { viewId, stage, layout,
 * css(id, rules), el(tag, cls, text), reducedMotion() }.
 */

const PANEL_ID = 'e028-panel';
const TITLE_ID = 'e028-title';
const READOUT_ID = 'e028-readout';
const BADGE_ID = 'e028-badge';
const JOURNAL_ID = 'e028-journal';
const HINT_ID = 'e028-hint';

function lireAttribut(noeud, nom) {
  return noeud && typeof noeud.getAttribute === 'function'
    ? (noeud.getAttribute(nom) || '') : '';
}

function creer(ctx, tag, cls, text) {
  if (typeof ctx.el === 'function') return ctx.el(tag, cls, text);
  const noeud = document.createElement(tag);
  if (cls) noeud.className = cls;
  if (text !== undefined) noeud.textContent = text;
  return noeud;
}

register('E028', (ctx) => {
  /* Gardien : sans layout rendu par constellation.js, la lentille ne touche
   * à aucun DOM. ctx.viewId est facultatif mais vérifié quand il existe. */
  const layout = ctx && ctx.layout;
  if (!layout || layout.nodeType !== 1 || typeof layout.querySelectorAll !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'constellation') return;

  try {
    const moons = Array.from(layout.querySelectorAll('.const-moon'));
    const couche = layout.querySelector('.const-layer-moons');
    if (couche && !couche.id) couche.id = 'e028-moons';

    /* E028-01 — Signature sémantique déterministe du groupe de lunes :
     * concaténation ordonnée des clés et libellés rendus, publiée sur le layout.
     * Aucun aléa : la signature ne dépend que du DOM issu du rendu. */
    const signature = moons
      .map((lune) => `${lireAttribut(lune, 'data-const-key')}=${lireAttribut(lune, 'data-label')}`)
      .join('|');
    layout.dataset.e028Signature = signature || 'vide';

    /* E028-02 — Sélecteurs stables `data-testid` et rang d'ordre : un essai E2E
     * cible une lune par son identifiant de test, jamais par une position CSS
     * fragile. La valeur dérive de la clé `data-const-key` réellement rendue. */
    moons.forEach((lune, index) => {
      const cle = lireAttribut(lune, 'data-const-key') || `moon:${index}`;
      lune.setAttribute('data-testid', `e028-moon-${cle.replace(/[^a-z0-9_-]/gi, '_')}`);
      lune.dataset.e028Ordre = String(index);
    });

    /* E028-03 — Horloge logique monotone : un compteur d'interactions remplace
     * tout horodatage temps réel. Chaque opération instrumentée l'incrémente et
     * l'expose sur le layout, sans timer ni appel à Date. */
    let tick = 0;
    function avancerTick() {
      tick += 1;
      layout.dataset.e028Tick = String(tick);
    }
    layout.dataset.e028Tick = '0';

    /* E028-04 — Panneau d'instrumentation, région live, badge, journal borné et
     * traçage des interactions réelles (clic et focus) sur les lunes. Le journal
     * est une liste ordonnée de lignes textuelles, lisible sans JavaScript. */
    const panneau = creer(ctx, 'section', 'e028-panel');
    panneau.id = PANEL_ID;
    panneau.setAttribute('aria-labelledby', TITLE_ID);
    const titre = creer(ctx, 'h3', 'e028-title', 'Instrumentation E2E des lunes · E028');
    titre.id = TITLE_ID;
    panneau.appendChild(titre);
    const lecture = creer(ctx, 'p', 'e028-readout');
    lecture.id = READOUT_ID;
    lecture.setAttribute('role', 'status');
    lecture.setAttribute('aria-live', 'polite');
    lecture.setAttribute('aria-atomic', 'true');
    panneau.appendChild(lecture);
    const badge = creer(ctx, 'span', 'e028-badge');
    badge.id = BADGE_ID;
    panneau.appendChild(badge);
    const journal = creer(ctx, 'ol', 'e028-journal');
    journal.id = JOURNAL_ID;
    journal.setAttribute('role', 'log');
    journal.setAttribute('aria-live', 'polite');
    journal.setAttribute('aria-label', 'Journal des interactions E2E sur les lunes');
    panneau.appendChild(journal);
    const aide = creer(ctx, 'p', 'e028-hint',
      'Pont d’essai : dispatchEvent(new CustomEvent(\'e028:e2e-command\', '
      + '{ bubbles: true, detail: { command: \'first\' | \'last\' | \'next\' | \'prev\' } })) '
      + 'sur la couche #e028-moons.');
    aide.id = HINT_ID;
    panneau.appendChild(aide);
    journal.appendChild(creer(ctx, 'li', 'e028-entry',
      '0 · groupe · instrumentation initialisée'));
    const precedent = document.getElementById(PANEL_ID);
    if (precedent && precedent.parentNode) precedent.parentNode.removeChild(precedent);
    const ancre = layout.querySelector('.constellation-caption') || layout;
    ancre.appendChild(panneau);

    function estLune(node) {
      return !!(node && typeof node.classList === 'object'
        && node.classList.contains('const-moon') && layout.contains(node));
    }

    function tracer(action, lune) {
      avancerTick();
      if (lune) marquerCouvert(lune);
      const rang = lune && lune.dataset.e028Ordre !== undefined
        ? `#${Number(lune.dataset.e028Ordre) + 1} ${lireAttribut(lune, 'data-const-key')}`
        : 'groupe';
      const ligne = creer(ctx, 'li', 'e028-entry', `${tick} · ${rang} · ${action}`);
      journal.insertBefore(ligne, journal.firstChild);
      while (journal.children.length > 8) journal.removeChild(journal.lastChild);
    }

    if (couche) {
      couche.addEventListener('click', (event) => {
        if (estLune(event.target)) tracer('clic', event.target);
      });
      couche.addEventListener('focusin', (event) => {
        if (estLune(event.target)) tracer('focus', event.target);
      });
    }

    /* E028-05 — Assertions déclaratives auto-évaluées : cinq contrôles sur le
     * balisage rendu (présence, unicité des clés, unicité de aria-current,
     * libellés avec confiance, aria-label). Résultat chiffré et verdict textuel
     * exposés sur le layout et dans le badge, jamais par la seule couleur. */
    const cles = moons.map((lune) => lireAttribut(lune, 'data-const-key'));
    const uniques = new Set(cles).size;
    const courants = moons.filter((lune) => lireAttribut(lune, 'aria-current') === 'true').length;
    const libellesOK = moons.every((lune) => !!lireAttribut(lune, 'data-label')
      && lireAttribut(lune, 'title').indexOf('confiance') >= 0);
    const ariaOK = moons.every((lune) => !!lireAttribut(lune, 'aria-label'));
    const controles = [
      ['lunes-presentes', moons.length > 0],
      ['cles-uniques', cles.length === uniques],
      ['courant-unique', courants <= 1 && (moons.length === 0 || courants === 1)],
      ['libelles-confiance', libellesOK],
      ['aria-present', ariaOK],
    ];
    const reussies = controles.filter((entree) => entree[1]).length;
    const toutOK = reussies === controles.length;
    layout.dataset.e028Assertions = `${reussies}/${controles.length}`;
    badge.textContent = `Contrôles ${reussies}/${controles.length} · ${toutOK ? 'OK' : 'à revoir'}`;
    badge.setAttribute('data-e028-assertions', toutOK ? 'ok' : 'ko');

    /* E028-06 — Snapshot normalisé : les coordonnées `--x`/`--y`, seules valeurs
     * susceptibles de varier, sont remplacées par un marqueur. Le snapshot en
     * texte devient une golden image stable, immune au bruit de mise en page. */
    const snapshot = moons.map((lune, index) => {
      const style = lune.style || {};
      const x = style.getPropertyValue ? style.getPropertyValue('--x') : '';
      return `${index}:${lireAttribut(lune, 'data-const-key')}:`
        + `${lireAttribut(lune, 'data-label')}:${x ? '<<pos>>' : '<<abs>>'}`;
    }).join('|');
    layout.dataset.e028Snapshot = snapshot.slice(0, 240) || 'vide';

    /* E028-07 — Couverture d'interaction : une lune visitée par un clic, un focus
     * ou une commande reçoit une classe et un attribut de couverture. Le ratio
     * `visitée/total` est publié sur le layout comme métrique d'essai. */
    const couvertes = new Set();
    function marquerCouvert(lune) {
      if (!lune || couvertes.has(lune)) return;
      couvertes.add(lune);
      lune.classList.add('e028-covered');
      lune.setAttribute('data-e028-covered', '1');
      layout.dataset.e028Coverage = `${couvertes.size}/${moons.length}`;
    }
    layout.dataset.e028Coverage = `0/${moons.length}`;

    /* E028-08 — Empreinte géométrique déterministe : somme des coordonnées
     * arrondies au dixième, calculée depuis les variables CSS rendues. Sert de
     * point de contrôle de non-régression visuelle sans capture d'écran réseau. */
    let geometrie = 0;
    moons.forEach((lune) => {
      const style = lune.style || {};
      const x = parseFloat(style.getPropertyValue ? style.getPropertyValue('--x') : '') || 0;
      const y = parseFloat(style.getPropertyValue ? style.getPropertyValue('--y') : '') || 0;
      geometrie += Math.round(x * 10) + Math.round(y * 10);
    });
    layout.dataset.e028Geometry = String(geometrie);

    /* E028-09 — Pont de commande E2E : un événement DOM personnalisé
     * `e028:e2e-command` pilote le focus d'une lune (first, last, next, prev).
     * Aucun timer, aucun réseau : le harnais d'essai reste maître du cadencement. */
    if (couche) {
      couche.addEventListener('e028:e2e-command', (event) => {
        const detail = event && event.detail ? event.detail : null;
        const commande = detail ? detail.command : '';
        if (!commande || !moons.length) return;
        const courantIndex = moons.findIndex((lune) => lireAttribut(lune, 'aria-current') === 'true');
        const base = courantIndex >= 0 ? courantIndex : 0;
        let index = base;
        if (commande === 'first') index = 0;
        else if (commande === 'last') index = moons.length - 1;
        else if (commande === 'next') index = (base + 1) % moons.length;
        else if (commande === 'prev') index = (base - 1 + moons.length) % moons.length;
        else return;
        const cible = moons[index];
        if (!cible) return;
        event.preventDefault();
        marquerCouvert(cible);
        if (typeof cible.focus === 'function') cible.focus({ preventScroll: true });
        tracer(`commande:${commande}`, cible);
      });
      layout.dataset.e028Bridge = '1';
    }

    /* E028-10 — Verdict agrégé, traçage du mode de mouvement et unique feuille
     * de style. La région live résume toutes les mesures ; le CSS est injecté
     * une seule fois sous l'identifiant réservé à la lentille. */
    const reduit = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
    layout.dataset.e028Motion = reduit ? 'reduced' : 'full';
    const verdict = toutOK && moons.length > 0 ? 'instrumentable' : 'incomplete';
    layout.dataset.e028Verdict = verdict;
    layout.classList.add('e028');
    lecture.textContent = `E028 · ${moons.length} lune(s) · signature `
      + `${layout.dataset.e028Signature.length} car. · ${reussies}/${controles.length} contrôles · `
      + `couverture ${layout.dataset.e028Coverage} · géométrie ${geometrie} · `
      + `tick ${tick} · verdict ${verdict} · mouvement ${layout.dataset.e028Motion}.`;

    if (typeof ctx.css === 'function') ctx.css('constellation-e028', `
      #${PANEL_ID}{
        margin:12px 0 0;padding:10px 12px;border:1px solid var(--line);border-radius:8px;
        background:var(--surface-2);color:var(--muted);font-family:inherit;
        font-size:9px;line-height:1.55;contain:layout style;
      }
      #${PANEL_ID} .e028-title{
        margin:0 0 6px;color:var(--gold);font-family:var(--serif);
        font-size:12px;font-weight:450;
      }
      #${PANEL_ID} .e028-readout{margin:0 0 6px;color:var(--ink-soft);}
      #${PANEL_ID} .e028-badge{
        display:inline-block;margin:0 0 8px;padding:2px 8px;
        border:1px solid var(--violet);border-radius:10px;color:var(--violet);
        font-size:9px;font-variant-numeric:tabular-nums;
      }
      #${PANEL_ID} .e028-journal{margin:0;padding-left:16px;color:var(--muted-2);}
      #${PANEL_ID} .e028-entry{margin:1px 0;overflow-wrap:anywhere;}
      #${PANEL_ID} .e028-hint{margin:8px 0 0;color:var(--muted);font-size:8px;overflow-wrap:anywhere;}
      .constellation-layout .const-moon.e028-covered{
        outline:1px dotted var(--gold);outline-offset:2px;
      }
      @media (prefers-reduced-motion:reduce){
        #${PANEL_ID},#${PANEL_ID} *{transition:none!important;animation:none!important;}
      }
    `);
  } catch {
    /* Greffon tolérant : toute anomalie locale est neutralisée sans bruit. */
    return;
  }
});
