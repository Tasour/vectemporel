import { register } from './registry.js';

/* Lentille E066 — Gestion de l'état appliquée aux métriques chiffrées de la vue
   Constellation. Dix chantiers concrets et variés : instantané de population,
   normalisation des coordonnées, étendue des années, agrégation des sources,
   état d'activation, détection de dérive entre rendus, historique borné,
   région live, contrat d'invariants et budget de densité. Tout est local et
   déterministe : zéro réseau, zéro aléa, zéro minuteur, zéro boucle propre,
   zéro sortie de débogage. Greffon tolérant : aucune exception ne doit
   interrompre le rendu.

   Contrat : register('E066', ctx => { … }) ; ctx = { viewId, stage, layout,
   css(id, rules), el(tag, cls, text), reducedMotion() }. */

/* État de dérive conservé entre deux rendus, indexé par la scène stable du
   shell. Une WeakMap évite toute clé globale dupliquée et tout timer de purge. */
const etatsPrecedents = new WeakMap();

const CSS = `
#e066-panel{
  margin:14px 0 0;padding:10px 12px;border:1px solid var(--line);border-radius:8px;
  background:var(--surface-2);color:var(--muted);font-family:inherit;
  font-size:9px;line-height:1.5;contain:layout style;
}
#e066-title{
  margin:0 0 6px;color:var(--gold);font-family:var(--serif);
  font-size:12px;font-weight:450;
}
#e066-readout,#e066-years,#e066-sources,#e066-active{
  margin:2px 0;color:var(--ink-soft);font-variant-numeric:tabular-nums;
}
#e066-history,#e066-contract{margin:4px 0 6px;padding-left:16px;}
#e066-history li,#e066-contract li{
  margin:1px 0;font-variant-numeric:tabular-nums;overflow-wrap:anywhere;
}
#e066-contract .e066-pass::before{content:'OK ';color:var(--gold);}
#e066-contract .e066-fail::before{content:'NOK ';color:var(--violet);}
#e066-live{
  margin:6px 0 0;color:var(--gold);font-size:9px;font-weight:600;
  font-variant-numeric:tabular-nums;
}
#e066-panel.e066-compact{padding:6px 8px;font-size:8px;}
#e066-panel.e066-compact #e066-title{margin-bottom:3px;font-size:11px;}
.constellation-layout .const-sun.e066-clamped,
.constellation-layout .const-planet.e066-clamped,
.constellation-layout .const-moon.e066-clamped{
  outline:1px dashed var(--gold);outline-offset:2px;
}
@media (prefers-reduced-motion:reduce){
  #e066-panel,#e066-panel *{transition:none!important;animation:none!important;}
}`;

/* Fabrique tolérante : le helper du registre est utilisé quand il existe. */
function creer(ctx, tag, cls, contenu) {
  if (typeof ctx.el === 'function') return ctx.el(tag, cls, contenu);
  const noeud = document.createElement(tag);
  if (cls) noeud.className = cls;
  if (contenu !== undefined) noeud.textContent = contenu;
  return noeud;
}

function attr(noeud, nom) {
  return noeud && typeof noeud.getAttribute === 'function'
    ? (noeud.getAttribute(nom) || '') : '';
}

/* Borne numérique déterministe, sans aléa ni arrondi implicit. */
function borne(valeur, min, max) {
  return Math.max(min, Math.min(max, valeur));
}

/* Indice numérique porté par une clé « sun:3 », « planet:2 », « moon:1 ». */
function indexCle(noeud) {
  const cle = attr(noeud, 'data-const-key');
  const parties = cle.split(':');
  const n = Number.parseInt(parties[parties.length - 1], 10);
  return Number.isFinite(n) ? n : -1;
}

/* Lecture d'une année au format rendu par formatYear (av. J.-C. = négatif). */
function parseAnnee(jeton) {
  const motif = String(jeton).trim().match(/^(\d+)\s*(av\.\s*J\.-C\.)?$/);
  if (!motif) return null;
  const valeur = Number.parseInt(motif[1], 10);
  return motif[2] ? -valeur : valeur;
}

/* Nombre de sources annoté dans le libellé d'une lune (« 2 src »). */
function parseSrc(libelle) {
  const motif = String(libelle).match(/(\d+)\s*src/);
  if (!motif) return 0;
  const valeur = Number.parseInt(motif[1], 10);
  return Number.isFinite(valeur) ? valeur : 0;
}

register('E066', (ctx) => {
  /* Garde d'entrée : sans layout rendu, la lentille ne touche à aucun DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;
  try {
    const layout = ctx.layout;
    if (ctx.viewId && ctx.viewId !== 'constellation') return;

    const soleils = Array.from(layout.querySelectorAll('.const-sun'));
    const planetes = Array.from(layout.querySelectorAll('.const-planet'));
    const lunes = Array.from(layout.querySelectorAll('.const-moon'));
    const noeuds = soleils.concat(planetes, lunes);
    const champ = layout.querySelector('.constellation-field');

    /* E066-01 — Instantané de population : les quatre métriques de base sont
     * mesurées dans le DOM puis sérialisées sur le layout (source de vérité). */
    const sources = lunes.reduce((somme, lune) => somme + parseSrc(attr(lune, 'data-label')), 0);
    const population = {
      eres: soleils.length,
      reperes: planetes.length,
      points: lunes.length,
      sources,
    };
    const populationTexte = `${population.eres}.${population.reperes}.${population.points}.${sources}`;
    layout.dataset.e066Population = populationTexte;

    /* E066-02 — Normalisation des coordonnées : --x/--y sont convertis en
     * nombres finis bornés comme dans polar(); l'écart est tracé par attribut
     * et par classe sur le nœud concerné. */
    let coordonneesCorrigees = 0;
    noeuds.forEach((noeud) => {
      const brutX = noeud.style && noeud.style.getPropertyValue
        ? parseFloat(noeud.style.getPropertyValue('--x')) : NaN;
      const brutY = noeud.style && noeud.style.getPropertyValue
        ? parseFloat(noeud.style.getPropertyValue('--y')) : NaN;
      const x = Number.isFinite(brutX) ? borne(brutX, 10, 90) : 50;
      const y = Number.isFinite(brutY) ? borne(brutY, 12, 88) : 50;
      if (brutX !== x || brutY !== y) {
        coordonneesCorrigees += 1;
        noeud.classList.add('e066-clamped');
        noeud.setAttribute('data-e066-clamped', '1');
      }
      noeud.setAttribute('data-e066-x', x.toFixed(2));
      noeud.setAttribute('data-e066-y', y.toFixed(2));
    });
    layout.dataset.e066Clamped = String(coordonneesCorrigees);

    /* E066-03 — Étendue des années : les bornes de chaque ère sont extraites
     * de data-label, converties en entiers signés, puis agrégées en une
     * métrique min / max / amplitude exposée sur le layout. */
    const annees = [];
    soleils.forEach((soleil) => {
      const apresSep = attr(soleil, 'data-label').split('·').slice(1).join('·');
      apresSep.split('–').forEach((jeton) => {
        const valeur = parseAnnee(jeton);
        if (valeur !== null) annees.push(valeur);
      });
    });
    const minAnnee = annees.length ? Math.min.apply(null, annees) : 0;
    const maxAnnee = annees.length ? Math.max.apply(null, annees) : 0;
    const amplitude = maxAnnee - minAnnee;
    layout.dataset.e066Years = `${minAnnee}|${maxAnnee}|${amplitude}`;

    /* E066-04 — Agrégation des sources : le total est complété par le nombre
     * de points sans source, deux états dérivés du même libellé chiffré. */
    const pointsSansSource = lunes.filter(
      (lune) => parseSrc(attr(lune, 'data-label')) === 0
    ).length;
    layout.dataset.e066Sources = `${sources}|${pointsSansSource}`;

    /* E066-05 — État d'activation : les trois niveaux sont lus une seule fois
     * et consolidés en un triplet d'indices, référence unique du rendu. */
    const actifSoleil = layout.querySelector('.const-sun.is-active');
    const actifPlanete = layout.querySelector('.const-planet.is-active');
    const actifLune = layout.querySelector('.const-moon.is-active');
    const etatActif = [actifSoleil, actifPlanete, actifLune].map(
      (noeud) => (noeud ? indexCle(noeud) : -1)
    );
    layout.dataset.e066Active = etatActif.join('|');

    /* E066-06 — Détection de dérive : l'instantané courant est comparé à celui
     * du rendu précédent conservé dans la WeakMap; le nombre de champs
     * modifiés est publié, sans timer ni lecture réseau. */
    const cleEtat = ctx.stage && typeof ctx.stage === 'object'
      ? ctx.stage : (layout.ownerDocument || layout);
    const instantane = [populationTexte, layout.dataset.e066Years,
      layout.dataset.e066Active, layout.dataset.e066Sources].join('|');
    const precedent = etatsPrecedents.get(cleEtat);
    if (precedent === undefined) {
      layout.dataset.e066Drift = 'initial';
    } else {
      const champsPrecedents = String(precedent).split('|');
      const champsCourants = instantane.split('|');
      const modifies = champsCourants.filter((champ, i) => champ !== champsPrecedents[i]).length;
      layout.dataset.e066Drift = String(modifies);
    }
    etatsPrecedents.set(cleEtat, instantane);

    /* E066-07 — Panneau d'état : titre, lignes chiffrées, historique, contrat
     * et région live. Tout panneau antérieur est retiré avant insertion. */
    const precedentPanneau = document.getElementById('e066-panel');
    if (precedentPanneau && precedentPanneau.parentNode) {
      precedentPanneau.parentNode.removeChild(precedentPanneau);
    }
    const panneau = creer(ctx, 'section', 'e066-panel');
    panneau.id = 'e066-panel';
    panneau.setAttribute('aria-labelledby', 'e066-title');
    const titre = creer(ctx, 'h3', 'e066-title', 'État des métriques chiffrées · E066');
    titre.id = 'e066-title';
    panneau.appendChild(titre);
    const lecture = creer(ctx, 'p', 'e066-readout');
    lecture.id = 'e066-readout';
    panneau.appendChild(lecture);
    const ligneAnnees = creer(ctx, 'p', 'e066-years');
    ligneAnnees.id = 'e066-years';
    panneau.appendChild(ligneAnnees);
    const ligneSources = creer(ctx, 'p', 'e066-sources');
    ligneSources.id = 'e066-sources';
    panneau.appendChild(ligneSources);
    const ligneActive = creer(ctx, 'p', 'e066-active');
    ligneActive.id = 'e066-active';
    panneau.appendChild(ligneActive);
    const historique = creer(ctx, 'ol', 'e066-history');
    historique.id = 'e066-history';
    panneau.appendChild(historique);
    const contrat = creer(ctx, 'ul', 'e066-contract');
    contrat.id = 'e066-contract';
    panneau.appendChild(contrat);
    const live = creer(ctx, 'p', 'e066-live');
    live.id = 'e066-live';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    panneau.appendChild(live);
    layout.appendChild(panneau);

    /* E066-08 — Région live et lignes chiffrées : une seule phrase résume
     * l'état mesuré, relayée au clavier comme à la souris via focusin. */
    lecture.textContent = `${population.eres} ère(s) · ${population.reperes} repère(s) · `
      + `${population.points} point(s) · dérive ${layout.dataset.e066Drift}.`;
    ligneAnnees.textContent = `Années : ${minAnnee} → ${maxAnnee} · amplitude ${amplitude} · `
      + `${coordonneesCorrigees} coordonnée(s) normalisée(s).`;
    ligneSources.textContent = `Sources : ${sources} au total · ${pointsSansSource} point(s) sans source.`;
    ligneActive.textContent = `Actifs : ère ${etatActif[0]} · repère ${etatActif[1]} · point ${etatActif[2]}.`;
    live.textContent = `État initial : ${population.eres} ères, ${population.reperes} repères, `
      + `${population.points} points, ${sources} sources.`;
    if (champ) {
      champ.addEventListener('focusin', (event) => {
        try {
          const cible = event.target && typeof event.target.closest === 'function'
            ? event.target.closest('[data-const-key]') : null;
          if (!cible || !champ.contains(cible)) return;
          live.textContent = `Focus ${attr(cible, 'data-const-key')} · `
            + `${lecture.textContent}`;
        } catch (_) { /* Annonce tolérante. */ }
      });
    }

    /* E066-09 — Historique borné : chaque action empile un instantané daté
     * d'un numéro séquentiel; le tampon plafonné à cinq entrées est redessiné. */
    let sequence = 0;
    const entrees = [];
    const enregistrer = () => {
      sequence += 1;
      entrees.push({ rang: sequence, valeur: instantane });
      if (entrees.length > 5) entrees.shift();
      while (historique.firstChild) historique.removeChild(historique.firstChild);
      entrees.forEach((entree) => {
        const item = creer(ctx, 'li', '',
          `#${entree.rang} ${entree.valeur}`);
        item.setAttribute('data-e066-rang', String(entree.rang));
        historique.appendChild(item);
      });
      historique.setAttribute('data-e066-history', String(entrees.length));
      live.textContent = `Instantané #${sequence} enregistré · ${entrees.length}/5 en mémoire.`;
    };
    enregistrer();
    if (champ) {
      champ.addEventListener('click', (event) => {
        try {
          const cible = event.target && typeof event.target.closest === 'function'
            ? event.target.closest('[data-const-key]') : null;
          if (!cible || !champ.contains(cible)) return;
          enregistrer();
        } catch (_) { /* Journal tolérant. */ }
      });
    }

    /* E066-10 — Contrat d'invariants, budget de densité et feuille unique :
     * les métriques sont vérifiées, un mode compact est activé au-delà du
     * budget, la préférence de mouvement est tracée, le CSS est injecté une
     * seule fois sous l'identifiant réservé. */
    const actifsParNiveau = [soleils, planetes, lunes].map(
      (groupe) => groupe.filter((noeud) => noeud.classList.contains('is-active')).length
    );
    const controles = [
      ['population non nulle', population.eres + population.reperes + population.points > 0],
      ['population finie', [population.eres, population.reperes, population.points, sources]
        .every((n) => Number.isFinite(n) && n >= 0)],
      ['amplitude cohérente', amplitude >= 0],
      ['au plus un actif par niveau', actifsParNiveau.every((n) => n <= 1)],
      ['historique borné à cinq', entrees.length <= 5],
    ];
    const reussis = controles.filter((controle) => controle[1]).length;
    controles.forEach(([libelle, ok]) => {
      contrat.appendChild(creer(ctx, 'li', ok ? 'e066-pass' : 'e066-fail', libelle));
    });
    panneau.setAttribute('data-e066-contract', `${reussis}/${controles.length}`);

    const densite = population.eres + population.reperes + population.points
      + sources + entrees.length + controles.length;
    layout.dataset.e066Density = String(densite);
    if (densite > 40) panneau.classList.add('e066-compact');
    let reduit = false;
    try { reduit = typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion(); }
    catch (_) { reduit = false; }
    layout.dataset.e066Motion = reduit ? 'reduced' : 'full';
    layout.classList.add('e066');
    if (typeof ctx.css === 'function') ctx.css('constellation-e066', CSS);
  } catch (_) {
    /* Greffon tolérant : toute anomalie locale est absorbée, le rendu continue. */
    return;
  }
});
