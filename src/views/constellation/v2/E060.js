import { register } from './registry.js';

/* Lentille V2 E060 — mouvement et transitions appliqués au focus et à la
   tabulation de la vue Constellation. Seconde passe : dix chantiers inédits,
   tous implémentés, sans réseau, sans source aléatoire et sans minuteur ni
   boucle d'animation propre. Préfixe exclusif : v2e060 (aucune collision avec
   la passe 1, qui utilisait e060- et constellation-e060). */
register('E060', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  if (typeof layout.querySelector !== 'function') return;
  const doc = layout.ownerDocument || document;
  if (!doc || typeof doc.createElement !== 'function') return;

  /* Feuille unique de la lentille : chaque règle est préfixée v2e060 et peut
     être neutralisée d'un seul geste. Aucune information n'est portée par la
     seule couleur : contour, texte et attributs redondent chaque effet. */
  css('constellation-v2-e060', `
.v2e060-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.constellation-layout .const-sun,
.constellation-layout .const-planet,
.constellation-layout .const-moon{animation:v2e060-enter .34s ease backwards;animation-delay:var(--v2e060-delay,0s)}
@keyframes v2e060-enter{from{opacity:0;transform:translate(-50%,-50%) scale(.9)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
.constellation-layout[data-v2e060-dim="1"] [data-const-key]{opacity:.42;transition:opacity var(--v2e060-dur,.24s) ease}
.constellation-layout[data-v2e060-dim="1"] [data-const-key][data-v2e060-focus="1"]{opacity:1}
.v2e060-badge{display:flex;align-items:center;gap:6px;margin-left:auto;color:var(--gold,#e6b96f);font-size:9px;font-variant-numeric:tabular-nums}
.v2e060-badge-piste{display:block;width:72px;height:3px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden}
.v2e060-badge-fill{display:block;width:0;height:100%;background:linear-gradient(90deg,var(--gold,#e6b96f),var(--violet,#b28bdd));transition:width var(--v2e060-dur,.24s) ease}
.v2e060-actif{animation:v2e060-glow .8s ease-out 1}
@keyframes v2e060-glow{0%{box-shadow:0 0 0 0 rgba(230,185,111,.55)}100%{box-shadow:0 0 0 9px rgba(230,185,111,0)}}
.v2e060-retour{animation:v2e060-return .6s ease-out 1}
@keyframes v2e060-return{0%{outline:0 solid transparent;outline-offset:2px}40%{outline:2px solid var(--gold-bright,#f0d29a);outline-offset:6px}100%{outline:0 solid transparent;outline-offset:2px}}
.constellation-layout[data-v2e060-type="sun"] .legend-sun,
.constellation-layout[data-v2e060-type="planet"] .legend-planet,
.constellation-layout[data-v2e060-type="moon"] .legend-moon{text-decoration:underline;text-underline-offset:3px;transition:opacity .2s ease,text-decoration-color .2s ease}
.constellation-layout[data-v2e060-motion="off"] .const-sun,
.constellation-layout[data-v2e060-motion="off"] .const-planet,
.constellation-layout[data-v2e060-motion="off"] .const-moon,
.constellation-layout[data-v2e060-motion="off"] [data-const-key],
.constellation-layout[data-v2e060-motion="off"] .v2e060-badge-fill,
.constellation-layout[data-v2e060-motion="off"] .v2e060-actif,
.constellation-layout[data-v2e060-motion="off"] .v2e060-retour{animation:none!important;transition:none!important;opacity:1!important}
.constellation-layout .constellation-field{scroll-behavior:auto}
@media (prefers-reduced-motion: reduce){
.constellation-layout .const-sun,
.constellation-layout .const-planet,
.constellation-layout .const-moon,
.constellation-layout [data-const-key],
.constellation-layout .v2e060-badge-fill,
.constellation-layout .v2e060-actif,
.constellation-layout .v2e060-retour{animation:none!important;transition:none!important;opacity:1!important}
}
  `);

  /* Utilitaires locaux : tolérants à un DOM incomplet, jamais d'exception
     propagée au registre. */
  const nodesDe = selecteur => {
    if (typeof layout.querySelectorAll !== 'function') return [];
    return Array.prototype.slice.call(layout.querySelectorAll(selecteur));
  };
  const poser = (noeud, nom, valeur) => {
    if (noeud && typeof noeud.setAttribute === 'function') noeud.setAttribute(nom, valeur);
  };
  const unique = (id, tag, classe, texte, parent) => {
    let noeud = typeof doc.getElementById === 'function' ? doc.getElementById(id) : null;
    if (!noeud) {
      noeud = typeof ctx.el === 'function' ? ctx.el(tag, classe, texte) : doc.createElement(tag);
      if (typeof ctx.el !== 'function') {
        if (classe) noeud.className = classe;
        if (texte !== undefined) noeud.textContent = texte;
      }
      noeud.id = id;
      if (parent && typeof parent.appendChild === 'function') parent.appendChild(noeud);
    }
    return noeud;
  };
  const coordonnees = noeud => {
    if (!noeud || !noeud.style) return null;
    const x = parseFloat(noeud.style.getPropertyValue('--x'));
    const y = parseFloat(noeud.style.getPropertyValue('--y'));
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  };
  const typeDe = noeud => String(noeud && noeud.dataset ? noeud.dataset.constKey : '').split(':')[0];

  const tous = nodesDe('[data-const-key]');
  if (!tous.length) return;
  const champ = layout.querySelector('.constellation-field');
  const entete = layout.querySelector('.constellation-head') || layout;
  const legende = layout.querySelector('.constellation-caption') || layout;

  /* E060-01 — Échelonnement déterministe de l'apparition des nœuds. Le retard
     est indexé sur l'ordre du DOM (45 ms par rang, plafonné à 540 ms) : aucun
     tirage aléatoire, la scène se révèle dans l'ordre ère → repère → point. */
  tous.forEach((noeud, index) => {
    noeud.style.setProperty('--v2e060-delay', Math.min(index * 45, 540) + 'ms');
    poser(noeud, 'data-v2e060-entree', String(index + 1));
  });

  /* E060-02 — Mode concentration : les nœuds non focalisés s'atténuent par une
     transition d'opacité, le nœud focalisé reste à pleine opacité. Le contour
     de focus de la passe 1 est intact : l'information ne repose pas sur
     l'opacité seule. */
  tous.forEach(noeud => poser(noeud, 'data-v2e060-focus', '0'));

  /* E060-03 — Mesure du saut spatial entre deux focus : distance euclidienne
     arrondie entre les variables --x / --y déjà posées par la vue, puis
     qualificatif textuel. Aucune position de nœud n'est modifiée. */
  /* E060-04 — Durée de transition adaptative au saut : la mesure du chantier
     03 alimente la variable --v2e060-dur, relue par les transitions d'opacité,
     de jauge et de légende. Les longs déplacements durent un peu plus longtemps. */
  /* E060-05 — Badge de rang et d'avance du parcours : texte « N / M · X % » et
     barre dont la largeur est transitionnée. Distinct du compteur de Tab de la
     passe 1, qui mesurait une fréquence et non une position dans la séquence. */
  let texteBadge = null;
  let remplissage = null;
  {
    const badge = unique('v2e060-badge', 'div', 'v2e060-badge', undefined, legende);
    poser(badge, 'aria-hidden', 'true');
    texteBadge = unique('v2e060-badge-texte', 'span', 'v2e060-badge-texte',
      '1 / ' + tous.length + ' · 0 %', badge);
    let piste = typeof doc.getElementById === 'function'
      ? doc.getElementById('v2e060-badge-piste') : null;
    if (!piste || !badge.contains(piste)) {
      piste = typeof ctx.el === 'function'
        ? ctx.el('span', 'v2e060-badge-piste')
        : doc.createElement('span');
      if (typeof ctx.el !== 'function') piste.className = 'v2e060-badge-piste';
      piste.id = 'v2e060-badge-piste';
      badge.appendChild(piste);
    }
    remplissage = unique('v2e060-badge-fill', 'span', 'v2e060-badge-fill', undefined, piste);
  }

  /* E060-06 — Transition de l'état actif : les nœuds marqués is-active ou
     aria-current portent un repère auditable et une lueur unique jouée une
     seule fois au rendu, sans modifier leur géométrie. */
  tous.forEach(noeud => {
    const actif = noeud.classList.contains('is-active')
      || noeud.getAttribute('aria-current') === 'true';
    if (actif) {
      poser(noeud, 'data-v2e060-actif', '1');
      noeud.classList.add('v2e060-actif');
    }
  });

  /* E060-08 — Surlignage de la légende selon le type de nœud focalisé :
     `data-v2e060-type` est posé sur le layout et le CSS cible l'entrée
     correspondante, avec un soulignement et une transition, jamais une
     couleur seule. */
  const entreesLegende = nodesDe('.constellation-legend span');
  const legendeSun = entreesLegende.filter(n => n.classList.contains('legend-sun'))[0];
  const legendePlanet = entreesLegende.filter(n => n.classList.contains('legend-planet'))[0];
  const legendeMoon = entreesLegende.filter(n => n.classList.contains('legend-moon'))[0];

  /* E060-09 — Région live dédiée au mouvement, distincte de l'annonce de focus
     de la passe 1 : elle décrit le saut (distance, qualificatif, rang) sans
     jamais déplacer le focus réel. */
  const moveLive = unique('v2e060-move-live', 'p', 'v2e060-sr', undefined, entete);
  poser(moveLive, 'role', 'status');
  poser(moveLive, 'aria-live', 'polite');
  poser(moveLive, 'aria-atomic', 'true');

  /* E060-10 — Repli mouvement réduit consolidé : l'état est reporté sur le
     layout, neutralisant toutes les animations de cette lentille, et le
     défilement du champ reste instantané. Un suivi unique de préférence, sans
     minuteur ni boucle propre, couvre un changement à chaud. */
  let calme = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { calme = !!ctx.reducedMotion(); } catch (erreur) { calme = false; }
  }
  poser(layout, 'data-v2e060-motion', calme ? 'off' : 'on');
  const CLE_MEDIA = '__v2e060_media';
  if (typeof window !== 'undefined' && window.matchMedia && !window[CLE_MEDIA]) {
    try {
      const requete = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (requete && typeof requete.addEventListener === 'function') {
        requete.addEventListener('change', () => {
          poser(layout, 'data-v2e060-motion', requete.matches ? 'off' : 'on');
        });
        window[CLE_MEDIA] = true;
      }
    } catch (erreur) {
      /* Préférence indisponible : l'état initial reste applicable. */
    }
  }

  let precedent = null;
  layout.addEventListener('focusin', evenement => {
    const cible = evenement && evenement.target && evenement.target.dataset
      && evenement.target.dataset.constKey ? evenement.target : null;
    if (!cible || !layout.contains(cible)) return;
    const rang = tous.indexOf(cible) + 1;
    if (rang < 1) return;

    /* Chantier 02 : concentration sur le nœud focalisé. */
    poser(layout, 'data-v2e060-dim', '1');
    tous.forEach(noeud => poser(noeud, 'data-v2e060-focus', noeud === cible ? '1' : '0'));

    /* Chantiers 03 et 04 : distance, qualificatif et durée adaptative. */
    const ici = coordonnees(cible);
    const avant = coordonnees(precedent);
    let delta = 0;
    if (ici && avant) {
      delta = Math.round(Math.sqrt(
        (ici.x - avant.x) * (ici.x - avant.x) + (ici.y - avant.y) * (ici.y - avant.y)
      ));
    }
    const saut = delta < 12 ? 'court' : delta < 30 ? 'moyen' : 'long';
    poser(layout, 'data-v2e060-delta', String(delta));
    poser(layout, 'data-v2e060-saut', saut);
    const duree = (0.16 + Math.min(0.2, delta / 180)).toFixed(3);
    layout.style.setProperty('--v2e060-dur', duree + 's');
    poser(layout, 'data-v2e060-duree', duree + 's');

    /* Chantier 05 : rang, avance et jauge. */
    const avance = Math.round((rang / tous.length) * 100);
    poser(layout, 'data-v2e060-rang', String(rang));
    poser(layout, 'data-v2e060-avance', String(avance));
    if (texteBadge) texteBadge.textContent = rang + ' / ' + tous.length + ' · ' + avance + ' %';
    if (remplissage) remplissage.style.width = avance + '%';

    /* Chantier 08 : type de nœud vers la légende. */
    const type = typeDe(cible);
    poser(layout, 'data-v2e060-type', type);
    const cibleLegende = type === 'sun' ? legendeSun
      : type === 'planet' ? legendePlanet : type === 'moon' ? legendeMoon : null;
    entreesLegende.forEach(n => poser(n, 'data-v2e060-type-focus', n === cibleLegende ? '1' : '0'));

    /* Chantier 09 : annonce polie du déplacement. */
    if (moveLive) {
      moveLive.textContent = 'Déplacement : saut ' + saut + ' de ' + delta
        + ' points, nœud ' + rang + ' sur ' + tous.length + ' — ' + (type || 'élément') + '.';
    }
    precedent = cible;
  });

  layout.addEventListener('focusout', evenement => {
    const suivant = evenement && evenement.relatedTarget;
    if (suivant && layout.contains(suivant) && suivant.dataset && suivant.dataset.constKey) return;
    poser(layout, 'data-v2e060-dim', '0');
  });

  /* E060-07 — Retour animé au nœud actif sur Échap. Une classe est retirée
     puis reposée après un reflow synchrone : l'animation joue à nouveau sans
     minuteur, et le focus réel n'est pas déplacé. */
  layout.addEventListener('keydown', evenement => {
    const cle = evenement && evenement.key;
    if (cle !== 'Escape' && cle !== 'Esc') return;
    const actif = tous.filter(n => n.getAttribute('aria-current') === 'true')[0]
      || tous.filter(n => n.classList.contains('is-active'))[0]
      || tous[0];
    if (actif) {
      actif.classList.remove('v2e060-retour');
      void actif.offsetWidth;
      actif.classList.add('v2e060-retour');
    }
    if (moveLive) {
      moveLive.textContent = 'Retour au nœud actif : '
        + (actif && actif.dataset.label ? actif.dataset.label : 'nœud initial') + '.';
    }
  });

  /* Le champ reste ancré : aucun déplacement de focus de cette lentille ne
     provoque de défilement fluide (voir chantier 10). */
  if (champ) champ.style.setProperty('scroll-behavior', 'auto');
});
