import { register } from './registry.js';

/* Instrumentation E2E appliquée aux planètes de la vue Constellation.
   Dix chantiers observables et déterministes, tous locaux au rendu courant :
   aucun appel réseau, aucune source aléatoire, aucune sortie de débogage,
   aucun minuteur, aucune boucle d'animation. */

const CSS = `
.e018-panel{margin-top:14px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.02);font-size:9px;color:var(--muted);}
.e018-title{margin:0 0 6px;font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);}
.e018-count,.e018-state,.e018-coverage{margin:2px 0;font-variant-numeric:tabular-nums;}
.e018-journal,.e018-geo{margin:4px 0 6px;padding-left:16px;line-height:1.5;}
.e018-journal-item,.e018-geo-item{font-variant-numeric:tabular-nums;}
.e018-live{margin:6px 0 0;color:var(--ink-soft);font-weight:600;}
.e018-contract{margin:6px 0 0;padding:0;list-style:none;line-height:1.6;}
.e018-contract li::before{margin-right:6px;font-weight:700;}
.e018-contract .e018-pass::before{content:'PASS';color:var(--gold);}
.e018-contract .e018-fail::before{content:'FAIL';color:var(--violet);}
.const-planet.e018-covered{outline:1px solid var(--gold);outline-offset:1px;}
.const-planet.e018-covered::before{position:absolute;top:-6px;right:-6px;content:'✓';font-size:8px;color:var(--gold-bright);}
.e018-still *{transition:none!important;}
`;

/* Cible d'un clic : un nœud portant la classe voulue, sans dépendre du global Element. */
function plusProche(noeud, classe) {
  let courant = noeud;
  while (courant && typeof courant === 'object') {
    if (typeof courant.classList !== 'undefined' && courant.classList.contains(classe)) return courant;
    courant = courant.parentNode;
  }
  return null;
}

register('E018', (ctx) => {
  /* Garde d'entrée : sans layout valide, la lentille ne touche à aucun DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.appendChild !== 'function') return;

  try {
    const layout = ctx.layout;
    const doc = layout.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;

    const field = layout.querySelector('.constellation-field');
    const planets = Array.prototype.slice.call(layout.querySelectorAll('.const-planet'));

    const fabriquer = (tag, cls, text) => {
      if (typeof ctx.el === 'function') return ctx.el(tag, cls, text);
      const n = doc.createElement(tag);
      if (cls) n.className = cls;
      if (text !== undefined) n.textContent = text;
      return n;
    };
    const mouvementReduit = () => {
      try { return typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion(); }
      catch (_) { return false; }
    };

    /* E018-01 — Ancrage E2E stable : le champ devient racine de test repérable. */
    if (field) {
      field.setAttribute('data-e2e-scope', 'e018-planets');
      field.setAttribute('data-e018-scope', String(planets.length));
    }

    /* E018-02 — Sélecteurs déterministes : un data-testid par planète, issu de sa clé réelle. */
    planets.forEach((planet, i) => {
      const cleBrute = (planet.dataset && planet.dataset.constKey) || `planet:${i + 1}`;
      const suffixe = String(cleBrute).replace(/^planet:/, '').replace(/[^0-9a-zA-Z_-]/g, '-');
      planet.setAttribute('data-testid', `e018-planet-${suffixe}`);
      planet.setAttribute('data-e018-key', String(cleBrute));
    });

    /* E018-03 — Compteur de population : tableau de bord ancré et nombre mesuré. */
    const precedente = doc.getElementById('e018-panel');
    if (precedente && layout.contains(precedente) && precedente.parentNode) {
      precedente.parentNode.removeChild(precedente);
    }
    const panneau = fabriquer('section', 'e018-panel');
    panneau.id = 'e018-panel';
    panneau.setAttribute('aria-label', 'Instrumentation E2E des planètes');
    panneau.appendChild(fabriquer('h3', 'e018-title', 'Instrumentation E2E · planètes'));
    const compteur = fabriquer('p', 'e018-count');
    compteur.id = 'e018-count';
    compteur.setAttribute('data-e2e-count', String(planets.length));
    compteur.textContent = `Planètes observées : ${planets.length}`;
    panneau.appendChild(compteur);
    layout.appendChild(panneau);

    /* E018-04 — Instantané d'état : ère, planète et point actifs lus dans le DOM. */
    const soleilActif = layout.querySelector('.const-sun.is-active');
    const planeteActive = layout.querySelector('.const-planet.is-active');
    const luneActive = layout.querySelector('.const-moon.is-active');
    const cleSoleil = (soleilActif && soleilActif.dataset && soleilActif.dataset.constKey) || 'aucune';
    const clePlanete = (planeteActive && planeteActive.dataset && planeteActive.dataset.constKey) || 'aucune';
    const cleLune = (luneActive && luneActive.dataset && luneActive.dataset.constKey) || 'aucune';
    const etat = fabriquer('p', 'e018-state');
    etat.id = 'e018-state';
    etat.setAttribute('data-e2e-state', `${cleSoleil}|${clePlanete}|${cleLune}`);
    etat.textContent = `État : ère ${cleSoleil} · planète ${clePlanete} · point ${cleLune}`;
    panneau.appendChild(etat);

    /* E018-05 — Journal local borné : séquence logique des planètes actionnées. */
    const journal = [];
    let sequence = 0;
    const listeJournal = fabriquer('ol', 'e018-journal');
    listeJournal.id = 'e018-journal';
    panneau.appendChild(listeJournal);
    if (field) {
      field.addEventListener('click', (event) => {
        try {
          const cible = plusProche(event.target, 'const-planet');
          if (!cible || !field.contains(cible)) return;
          const cle = (cible.dataset && cible.dataset.constKey) || 'planet:?';
          sequence += 1;
          journal.push({ seq: sequence, cle });
          if (journal.length > 8) journal.shift();
          while (listeJournal.firstChild) listeJournal.removeChild(listeJournal.firstChild);
          journal.forEach((entree) => {
            const item = fabriquer('li', 'e018-journal-item', `#${entree.seq} ${entree.cle}`);
            item.setAttribute('data-e018-seq', String(entree.seq));
            listeJournal.appendChild(item);
          });
          listeJournal.setAttribute('data-e2e-last', cle);
        } catch (_) { /* Trace tolérante : aucun clic ne doit lever d'exception. */ }
      }, true);
    }

    /* E018-06 — Région live unique : annonce textuelle de la planète actionnée. */
    const live = fabriquer('p', 'e018-live');
    live.id = 'e018-live';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    live.textContent = 'Instrumentation E2E prête : aucune planète actionnée.';
    panneau.appendChild(live);
    if (field) {
      field.addEventListener('click', (event) => {
        try {
          const cible = plusProche(event.target, 'const-planet');
          if (!cible || !field.contains(cible)) return;
          const libelle = (cible.dataset && cible.dataset.label)
            || cible.getAttribute('aria-label') || 'planète';
          live.textContent = `Planète actionnée : ${libelle}.`;
        } catch (_) { /* Annonce tolérante. */ }
      });
    }

    /* E018-07 — Couverture : marqueur de visite posé sur chaque planète cliquée. */
    const couverture = fabriquer('p', 'e018-coverage');
    couverture.id = 'e018-coverage';
    panneau.appendChild(couverture);
    const majCouverture = () => {
      const visitees = layout.querySelectorAll('.const-planet.e018-covered').length;
      couverture.setAttribute('data-e2e-covered', `${visitees}/${planets.length}`);
      couverture.textContent = `Couverture : ${visitees} / ${planets.length} planètes visitées`;
    };
    majCouverture();
    if (field) {
      field.addEventListener('click', (event) => {
        try {
          const cible = plusProche(event.target, 'const-planet');
          if (!cible || !field.contains(cible)) return;
          cible.setAttribute('data-e018-covered', 'true');
          cible.classList.add('e018-covered');
          majCouverture();
        } catch (_) { /* Marquage tolérant. */ }
      });
    }

    /* E018-08 — Instantané géométrique : positions --x/--y normalisées, sans effet visuel. */
    const listeGeo = fabriquer('ul', 'e018-geo');
    listeGeo.id = 'e018-geo';
    panneau.appendChild(listeGeo);
    planets.forEach((planet, i) => {
      try {
        const brutX = planet.style && planet.style.getPropertyValue
          ? planet.style.getPropertyValue('--x') : '';
        const brutY = planet.style && planet.style.getPropertyValue
          ? planet.style.getPropertyValue('--y') : '';
        const x = parseFloat(brutX);
        const y = parseFloat(brutY);
        const jeton = Number.isFinite(x) && Number.isFinite(y) ? `${x.toFixed(2)},${y.toFixed(2)}` : 'n/a';
        planet.setAttribute('data-e018-pos', jeton);
        listeGeo.appendChild(fabriquer('li', 'e018-geo-item', `P${i + 1} → ${jeton}`));
      } catch (_) { /* Géométrie tolérante. */ }
    });

    /* E018-09 — Contrat d'assertions : invariants calculés depuis le DOM rendu. */
    const cles = planets.map((p) => (p.dataset && p.dataset.constKey) || '');
    const uniques = new Set(cles).size;
    const actives = layout.querySelectorAll('.const-planet.is-active').length;
    const pourvues = planets.filter((p) => p.hasAttribute('data-testid')).length;
    const vives = panneau.querySelectorAll('#e018-live').length;
    const controles = [
      ['population de planètes non nulle', planets.length > 0],
      ['clés de planètes uniques', uniques === planets.length],
      ['au plus une planète active', actives <= 1],
      ['sélecteurs data-testid présents', pourvues === planets.length],
      ['région live unique', vives === 1],
    ];
    const reussis = controles.filter((c) => c[1]).length;
    panneau.setAttribute('data-e2e-contract', `${reussis}/${controles.length}`);
    const listeContrat = fabriquer('ul', 'e018-contract');
    listeContrat.id = 'e018-contract';
    controles.forEach(([libelle, ok]) => {
      listeContrat.appendChild(fabriquer('li', ok ? 'e018-pass' : 'e018-fail', libelle));
    });
    panneau.appendChild(listeContrat);

    /* E018-10 — Garde-fous : CSS unique, mobilité réduite, IDs préfixés, tolérance totale. */
    if (typeof ctx.css === 'function') ctx.css('constellation-e018', CSS);
    if (mouvementReduit()) panneau.classList.add('e018-still');
    panneau.setAttribute('data-e018-instrument', 'constellation-planets');
  } catch (_) {
    /* Greffon tolérant : toute anomalie locale est absorbée, le rendu continue. */
  }
});
