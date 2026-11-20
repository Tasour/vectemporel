import { register } from './registry.js';

/* Lentille E061 — Accessibilité clavier appliquée aux métriques chiffrées de la
 * vue Constellation. Dix chantiers concrets et variés : panneau focalisable,
 * région live, anneau de focus contrasté, navigation fléchée, position annoncée,
 * comparaison à une référence, raccourci d'appel, détail à la demande, état vide
 * et mouvement réduit. Contrat : un seul enregistrement de la lentille E061
 * auprès du registre, avec ctx = { viewId, stage, layout, css(id, rules),
 * el(tag, cls, text), reducedMotion() }. Le layout est vérifié avant tout ajout
 * DOM ; une seule feuille est injectée par ctx.css('constellation-e061', …).
 * Tous les identifiants sont préfixés e061-. Zéro sortie de débogage, réseau,
 * aléa, minuteur ou boucle d'animation propre.
 */

const CSS_ID = 'constellation-e061';
const PANEL_ID = 'e061-metrics';
const LIST_ID = 'e061-list';
const LIVE_ID = 'e061-live';
const REF_ID = 'e061-ref';
const HELP_ID = 'e061-help';
const TITLE_ID = 'e061-title';

/* État module : survit aux reconstructions complètes du DOM par la coque. */
const etat = {
  documentLie: false,
  indexActif: 0,
  dernier: '',
  rendus: 0,
};

/* Chaque chantier est isolé : une anomalie locale n'interrompt pas les suivants. */
function sansEchec(action) {
  try { action(); } catch { /* neutralisation silencieuse, sans journalisation */ }
}

function decimale(valeur) {
  return (Math.round(valeur * 10) / 10).toFixed(1).replace('.', ',');
}

function signe(valeur) {
  return (valeur < 0 ? '−' : '+') + decimale(Math.abs(valeur));
}

/* Feuille unique. Chaque règle est rattachée à son chantier par un commentaire. */
const CSS = `
  #${PANEL_ID}{
    margin:12px 0 0;padding:10px 12px;border:1px solid var(--line);
    border-radius:8px;background:var(--surface-2);color:var(--muted);
    font-family:inherit;font-size:10px;line-height:1.5;
  }
  #${TITLE_ID}{margin:0 0 6px;color:var(--gold);font-size:11px;font-weight:600;}
  /* E061-01 — cibles clavier au moins 36 px, chiffres à largeur stable. */
  #${LIST_ID}{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none;}
  #${LIST_ID} .e061-item{margin:0;}
  #${LIST_ID} .e061-figure{
    display:inline-flex;align-items:center;justify-content:center;gap:6px;
    min-width:44px;min-height:36px;padding:4px 8px;margin:0;
    border:1px solid var(--violet);border-radius:6px;background:transparent;
    color:var(--ink-soft);font:inherit;font-size:10px;
    font-variant-numeric:tabular-nums;font-feature-settings:'tnum' 1;
    cursor:pointer;transition:background-color .15s ease,border-color .15s ease;
  }
  /* E061-05 — rang visible, jamais porté par la seule couleur. */
  #${LIST_ID} .e061-rank{font-size:8px;color:var(--gold);text-decoration:underline;}
  #${REF_ID}{
    min-height:36px;margin:6px 6px 0 0;padding:4px 8px;
    border:1px solid var(--line);border-radius:6px;background:transparent;
    color:var(--ink-soft);font:inherit;font-size:10px;cursor:pointer;
  }
  /* E061-06 — état de comparaison doublé par le style de bordure. */
  #${REF_ID}[aria-pressed="true"]{border-style:dashed;font-weight:600;}
  /* E061-03 — anneau de focus contrasté et soulignement, sans couleur seule. */
  .constellation-layout.e061-focus-net #${LIST_ID} .e061-figure:focus-visible,
  .constellation-layout.e061-focus-net #${REF_ID}:focus-visible{
    outline:2px solid var(--gold-bright);outline-offset:2px;
    text-decoration:underline;
  }
  /* E061-08 — détail à la demande, masqué par l'attribut hidden natif. */
  #${LIST_ID} .e061-detail{margin:3px 0 0;color:var(--muted-2);font-size:9px;}
  #${LIST_ID} .e061-detail[hidden]{display:none;}
  #${HELP_ID}{margin:6px 0 0;color:var(--muted-2);font-size:9px;}
  #${LIVE_ID}{margin:5px 0 0;color:var(--gold-bright);font-size:9px;}
  /* E061-09 — état vide explicitement écrit, aucun chiffre sous-entendu. */
  #${PANEL_ID} .e061-vide{margin:5px 0 0;color:var(--muted-2);font-size:9px;}
  /* E061-10 — mouvement réduit : aucune transition residuelle sur les métriques. */
  .e061-still #${PANEL_ID},.e061-still #${PANEL_ID} *{
    transition:none!important;animation:none!important;
  }
  @media (prefers-reduced-motion:reduce){
    #${PANEL_ID},#${PANEL_ID} *{transition:none!important;animation:none!important;}
  }
  @media (max-width:620px){#${PANEL_ID}{padding:8px;}}`;

register('E061', (ctx) => {
  /* Garde de contexte : aucun ajout DOM sans layout exploitable. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function'
      || typeof ctx.layout.appendChild !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'constellation') return;

  try {
    const layout = ctx.layout;
    const doc = layout.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;
    const css = typeof ctx.css === 'function' ? ctx.css : null;
    if (!css) return;

    const make = typeof ctx.el === 'function'
      ? (tag, cls, txt) => ctx.el(tag, cls, txt)
      : (tag, cls, txt) => {
          const node = doc.createElement(tag);
          if (cls) node.className = cls;
          if (txt !== undefined) node.textContent = txt;
          return node;
        };

    /* Mesures dérivées du DOM déjà rendu, sans nouvelle source de données. */
    const soleils = Array.from(layout.querySelectorAll('.const-sun'));
    const planetes = Array.from(layout.querySelectorAll('.const-planet'));
    const lunes = Array.from(layout.querySelectorAll('.const-moon'));
    const etatNoeud = layout.querySelector('.constellation-state');
    const texteEtat = etatNoeud && typeof etatNoeud.textContent === 'string'
      ? etatNoeud.textContent : '';
    const reperePoint = /Point\s*:\s*(\d+)\s*\/\s*(\d+)/.exec(texteEtat);
    const pointCourant = reperePoint ? Number(reperePoint[1]) : 0;
    const pointTotal = reperePoint ? Number(reperePoint[2]) : 0;

    let sommeConfiance = 0;
    let nbConfiance = 0;
    lunes.forEach((lune) => {
      const source = (lune.getAttribute('title') || '') + ' '
        + (lune.getAttribute('aria-label') || '');
      const mesure = /confiance\s+(\d+)/i.exec(source);
      if (mesure) {
        sommeConfiance += Number(mesure[1]);
        nbConfiance += 1;
      }
    });
    const confiance = nbConfiance ? Math.round(sommeConfiance / nbConfiance) : 0;
    const referenceCompte = (soleils.length + planetes.length + lunes.length) / 3;

    const figures = [
      {
        cle: 'eres', titre: 'Ères', valeur: soleils.length, unite: '',
        reference: referenceCompte,
        detail: `${soleils.length} ère(s) parcourue(s) par Tab dans la couche des soleils.`,
      },
      {
        cle: 'reperes', titre: 'Repères', valeur: planetes.length, unite: '',
        reference: referenceCompte,
        detail: `${planetes.length} repère(s) dans l'ère affichée ; ← → dans la vue change de repère.`,
      },
      {
        cle: 'points', titre: 'Points vérifiés', valeur: lunes.length, unite: '',
        reference: referenceCompte,
        detail: `Point sélectionné ${pointCourant} sur ${pointTotal}.`,
      },
      {
        cle: 'confiance', titre: 'Confiance moyenne', valeur: confiance, unite: ' %',
        reference: 50,
        detail: `${nbConfiance} lune(s) renseignée(s) sur ${lunes.length} ; référence de confiance 50 %.`,
      },
    ];

    /* E061-01 — Panneau focalisable : une section autonome, un bouton natif par
     * métrique, un seul arrêt dans l'ordre de tabulation au départ. */
    sansEchec(() => {
      const precedent = doc.getElementById(PANEL_ID);
      if (precedent && precedent.parentNode) precedent.parentNode.removeChild(precedent);
      const panneau = make('section', 'e061-panel');
      panneau.id = PANEL_ID;
      panneau.setAttribute('aria-labelledby', TITLE_ID);
      panneau.setAttribute('aria-describedby', HELP_ID);
      panneau.setAttribute('aria-keyshortcuts', 'M');
      const titre = make('h2', 'e061-title', 'Métriques chiffrées · navigation clavier');
      titre.id = TITLE_ID;
      panneau.appendChild(titre);
      const liste = make('ul', 'e061-list');
      liste.id = LIST_ID;
      panneau.appendChild(liste);
      if (etat.indexActif >= figures.length) etat.indexActif = 0;
      figures.forEach((figure, index) => {
        const item = make('li', 'e061-item');
        const bouton = make('button', 'e061-figure');
        bouton.type = 'button';
        bouton.id = 'e061-figure-' + (index + 1);
        bouton.dataset.e061Key = figure.cle;
        bouton.tabIndex = index === etat.indexActif ? 0 : -1;
        bouton.appendChild(make('span', 'e061-rank', String(index + 1)));
        bouton.appendChild(make('span', 'e061-value',
          String(figure.valeur) + figure.unite));
        item.appendChild(bouton);
        liste.appendChild(item);
      });
      const ref = make('button', 'e061-ref', 'Comparer à une référence');
      ref.id = REF_ID;
      ref.type = 'button';
      ref.setAttribute('aria-pressed', 'false');
      ref.setAttribute('aria-keyshortcuts', 'R');
      panneau.appendChild(ref);
      const aide = make('p', 'e061-help',
        'M : rejoindre les métriques · ← → : parcourir · Début/Fin : bornes · Entrée : détail · R : comparaison.');
      aide.id = HELP_ID;
      panneau.appendChild(aide);
      const ancre = layout.querySelector('.constellation-caption') || layout;
      ancre.insertBefore(panneau, ancre.firstChild || null);
      layout.dataset.e061Figures = String(figures.length);
    });

    /* E061-02 — Région live : annonce seulement sur changement effectif, pour
     * ne pas répéter la même métrique à chaque rendu. */
    sansEchec(() => {
      const panneau = doc.getElementById(PANEL_ID);
      if (!panneau || doc.getElementById(LIVE_ID)) return;
      const live = make('p', 'e061-live');
      live.id = LIVE_ID;
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      panneau.appendChild(live);
      layout.dataset.e061Live = 'on';
    });

    /* E061-03 — Focus renforcé : classe d'activation et marqueur par cible, la
     * feuille unique fournissant anneau contrasté et soulignement. */
    sansEchec(() => {
      layout.classList.add('e061-focus-net');
      layout.dataset.e061Focus = 'renforce';
      Array.from(doc.querySelectorAll('#' + LIST_ID + ' .e061-figure')).forEach((bouton) => {
        bouton.setAttribute('data-e061-focus', '2px');
      });
    });

    /* E061-04 — Navigation fléchée et tabindex mobile : un seul écouteur sur le
     * panneau, ← → pour parcourir, Home/End pour les bornes. */
    sansEchec(() => {
      const panneau = doc.getElementById(PANEL_ID);
      if (!panneau || panneau.dataset.e061Nav) return;
      panneau.dataset.e061Nav = '1';
      panneau.addEventListener('keydown', (event) => {
        try {
          const cle = event && event.key;
          const cible = event && event.target;
          if (!cible || typeof cible.closest !== 'function') return;
          const bouton = cible.closest('.e061-figure');
          if (!bouton || !panneau.contains(bouton)) return;
          const boutons = Array.from(panneau.querySelectorAll('.e061-figure'));
          const index = boutons.indexOf(bouton);
          if (index < 0 || !boutons.length) return;
          let suivant = -1;
          let borne = '';
          if (cle === 'ArrowRight' || cle === 'ArrowDown') suivant = (index + 1) % boutons.length;
          else if (cle === 'ArrowLeft' || cle === 'ArrowUp') suivant = (index - 1 + boutons.length) % boutons.length;
          else if (cle === 'Home') { suivant = 0; borne = 'début de liste'; }
          else if (cle === 'End') { suivant = boutons.length - 1; borne = 'fin de liste'; }
          if (suivant < 0) return;
          if (typeof event.preventDefault === 'function') event.preventDefault();
          boutons.forEach((item, rang) => { item.tabIndex = rang === suivant ? 0 : -1; });
          etat.indexActif = suivant;
          boutons[suivant].focus();
          layout.dataset.e061NavIndex = String(suivant + 1);
          const live = doc.getElementById(LIVE_ID);
          if (live && borne) {
            live.textContent = `${borne} · métrique ${suivant + 1} sur ${boutons.length}`;
            etat.dernier = live.textContent;
          }
        } catch { /* écouteur tolérant */ }
      });
    });

    /* E061-05 — Position dans l'ensemble : aria-posinset / aria-setsize et rang
     * visible, afin que « 2 sur 4 » soit lu et vu sans ambiguïté. */
    sansEchec(() => {
      const liste = doc.getElementById(LIST_ID);
      if (!liste) return;
      const boutons = Array.from(liste.querySelectorAll('.e061-figure'));
      boutons.forEach((bouton, index) => {
        bouton.setAttribute('aria-posinset', String(index + 1));
        bouton.setAttribute('aria-setsize', String(boutons.length));
        bouton.setAttribute('aria-label', figures[index].titre + ' : '
          + String(figures[index].valeur) + figures[index].unite
          + ' · métrique ' + (index + 1) + ' sur ' + boutons.length
          + ' · Entrée pour le détail.');
      });
      layout.dataset.e061Positions = String(boutons.length);
    });

    /* E061-06 — Comparaison à une référence : calcul d'écart, aria-pressed et
     * enrichissement textuel des détails, sans modifier le rendu d'origine. */
    sansEchec(() => {
      const ref = doc.getElementById(REF_ID);
      if (!ref || ref.dataset.e061Ref) return;
      ref.dataset.e061Ref = '1';
      ref.addEventListener('click', () => {
        try {
          const etaitActif = ref.getAttribute('aria-pressed') === 'true';
          ref.setAttribute('aria-pressed', etaitActif ? 'false' : 'true');
          figures.forEach((figure, index) => {
            const detail = doc.getElementById('e061-detail-' + (index + 1));
            if (!detail) return;
            detail.textContent = etaitActif
              ? figure.detail
              : figure.detail + ' · référence ' + decimale(figure.reference)
                + ' · écart ' + signe(figure.valeur - figure.reference)
                + (figure.unite ? ' ' + figure.unite.trim() : '');
          });
          layout.dataset.e061Comparaison = etaitActif ? 'inactive' : 'active';
          const live = doc.getElementById(LIVE_ID);
          if (live) {
            live.textContent = etaitActif
              ? 'Comparaison désactivée : valeurs seules.'
              : 'Comparaison activée : référence des compteurs '
                + decimale(referenceCompte) + ', confiance 50 %.';
            etat.dernier = live.textContent;
          }
        } catch { /* bascule tolérante */ }
      });
      layout.dataset.e061Reference = decimale(referenceCompte);
    });

    /* E061-07 — Raccourci d'appel : un seul écouteur document, une seule fois,
     * qui ramène le focus sur la métrique courante sans toucher aux champs. */
    sansEchec(() => {
      if (etat.documentLie) return;
      etat.documentLie = true;
      doc.addEventListener('keydown', (event) => {
        try {
          if (!event || event.metaKey || event.ctrlKey || event.altKey) return;
          const cle = event.key;
          if (cle !== 'm' && cle !== 'M') return;
          const cible = event.target;
          if (cible && cible.tagName && /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName)) return;
          const panneau = doc.getElementById(PANEL_ID);
          if (!panneau || !panneau.closest('.constellation-layout')) return;
          if (typeof event.preventDefault === 'function') event.preventDefault();
          const boutons = Array.from(panneau.querySelectorAll('.e061-figure'));
          if (!boutons.length) return;
          boutons[Math.min(etat.indexActif, boutons.length - 1)].focus();
          panneau.closest('.constellation-layout').dataset.e061Raccourci = 'M';
        } catch { /* raccourci tolérant */ }
      });
    });

    /* E061-08 — Détail à la demande : aria-expanded / aria-controls et paragraphe
     * hidden, pilotés par le clic natif des boutons (Entrée ou Espace). */
    sansEchec(() => {
      const liste = doc.getElementById(LIST_ID);
      if (!liste) return;
      Array.from(liste.querySelectorAll('.e061-figure')).forEach((bouton, index) => {
        if (bouton.dataset.e061Detail) return;
        bouton.dataset.e061Detail = '1';
        const detail = make('p', 'e061-detail', figures[index].detail);
        detail.id = 'e061-detail-' + (index + 1);
        detail.hidden = true;
        bouton.parentNode.appendChild(detail);
        bouton.setAttribute('aria-controls', detail.id);
        bouton.setAttribute('aria-expanded', 'false');
        bouton.addEventListener('click', () => {
          try {
            const ouvert = bouton.getAttribute('aria-expanded') === 'true';
            bouton.setAttribute('aria-expanded', ouvert ? 'false' : 'true');
            detail.hidden = ouvert;
            etat.indexActif = index;
            const live = doc.getElementById(LIVE_ID);
            if (live) {
              live.textContent = ouvert
                ? 'Détail refermé.'
                : 'Détail de ' + figures[index].titre + ' : ' + detail.textContent;
              etat.dernier = live.textContent;
            }
          } catch { /* détail tolérant */ }
        });
      });
    });

    /* E061-09 — État vide et bornes : verdict explicite quand aucune métrique
     * n'est disponible, et compteur de point publié en attribut réutilisable. */
    sansEchec(() => {
      const panneau = doc.getElementById(PANEL_ID);
      if (!panneau) return;
      const renseigne = soleils.length > 0 || planetes.length > 0
        || lunes.length > 0 || nbConfiance > 0;
      panneau.dataset.e061Etat = renseigne ? 'renseigne' : 'vide';
      panneau.dataset.e061Point = pointCourant + '/' + pointTotal;
      layout.dataset.e061PointIndex = String(pointCourant);
      layout.dataset.e061PointTotal = String(pointTotal);
      if (!renseigne) {
        const vide = make('p', 'e061-vide',
          'Aucune métrique chiffrée disponible pour ce rendu : ères, repères et points sont absents.');
        vide.id = 'e061-vide';
        panneau.insertBefore(vide, panneau.firstChild || null);
        const live = doc.getElementById(LIVE_ID);
        if (live) {
          live.textContent = 'Aucune métrique chiffrée disponible.';
          etat.dernier = live.textContent;
        }
        layout.dataset.e061Verdict = 'vide';
      } else {
        layout.dataset.e061Verdict = 'renseigne';
      }
    });

    /* E061-10 — Mouvement réduit et idempotence : préférence système respectée,
     * une seule feuille injectée et un seul panneau présent après deux rendus. */
    sansEchec(() => {
      etat.rendus += 1;
      const reduit = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
      if (reduit) layout.classList.add('e061-still');
      else layout.classList.remove('e061-still');
      layout.dataset.e061Motion = reduit ? 'reduit' : 'normal';
      layout.dataset.e061Rendus = String(etat.rendus);
      layout.dataset.e061Panneaux = String(doc.querySelectorAll('#' + PANEL_ID).length);
    });

    /* Feuille unique, identifiant réservé à cette lentille. */
    css(CSS_ID, CSS);
  } catch {
    /* Greffon tolérant : aucune exception ne remonte au registre. */
  }
});
