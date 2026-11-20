import { register } from './registry.js';

/* V2 lentille E095 — Accessibilité ARIA et lecteurs d'écran (complément de la passe 1).
   La passe 1 traite déjà la région nommée, la progression sémantique, la pastille
   de certitude, le titre décrit, le fil en liste, le groupe de commandes, la
   traçabilité, l'aide de recherche, le statut de recherche et le focus réduit.
   La V2 propose dix chantiers neufs et distincts, tous centrés sur l'annonce et
   la compréhension pour lecteur d'écran : annonce du point, situation du repère,
   sous-titre du fil, aide clavier, image légendée, glose de certitude, étiquettes
   redondantes masquées, état de lecture auto, tabulation unique et focus renforcé.
   Chaque chiffre est dérivé du DOM réel, jamais inventé. Non destructif : sans ce
   module, la vue reste intégralement lisible et utilisable.
   Préfixes : classes recit-v2-e095-, ids DOM v2-e095- (jamais e095- de la passe 1).
   Zéro réseau, zéro sortie de débogage, zéro aléa, aucun fichier partagé modifié. */

const CSS = `
/* E095-01 — Annonce du point courant (région live visible). */
.recit-v2-e095-current{margin:6px 0 0;padding:4px 0 4px 8px;border-left:2px solid var(--gold,#c79a52);color:var(--ink-soft,#b9b2a6);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E095-02 — Situation du repère rattachée au titre (descripteur sr-only). */
.recit-v2-e095-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}

/* E095-03 — Titre du fil promu sous-titre (sémantique de heading). */
.recit-layout .recit-v2-e095-soustitre .recit-thread-title{color:var(--muted,#d8d0c0);font-weight:600}

/* E095-04 — Aide clavier du fil (descripteur sr-only). */
.recit-v2-e095-aide{margin:0}

/* E095-05 — Image légendée : la légende sert de description. */
.recit-layout .recit-v2-e095-image .recit-media img{outline-color:var(--gold,#c79a52)}

/* E095-06 — Glose de certitude audible (paragraphe visible). */
.recit-v2-e095-glose{margin:2px 0 0;color:var(--ink-soft,#b9b2a6);font-size:10px;line-height:1.5}

/* E095-07 — Étiquettes de type redondantes masquées (décoratif aria-hidden). */
.recit-layout .recit-v2-e095-type .thread-kind[aria-hidden="true"]{pointer-events:none}

/* E095-08 — État de la lecture automatique (région live visible). */
.recit-v2-e095-play{margin:6px 0 0;padding:4px 0 4px 8px;border-left:2px solid var(--gold,#c79a52);color:var(--ink-soft,#b9b2a6);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E095-09 — Tabulation unique dans le fil (repère visuel du seul item tabulable). */
.recit-layout .recit-v2-e095-tab .recit-thread-item[tabindex="0"]{box-shadow:inset 0 -2px 0 var(--gold,#c79a52)}

/* E095-10 — Focus renforcé, cibles tactiles et mouvement réduit. */
.recit-layout .recit-v2-e095-focus button:focus-visible,
.recit-layout .recit-v2-e095-focus a:focus-visible,
.recit-layout .recit-v2-e095-focus [tabindex]:focus-visible{outline:3px solid var(--gold-bright,#e6b96f);outline-offset:3px}
.recit-layout .recit-v2-e095-focus button{min-height:36px}
.recit-layout[data-v2-e095-motion="reduce"] .recit-v2-e095-readout,
.recit-layout[data-v2-e095-motion="reduce"] .recit-v2-e095-sr{transition:none!important;animation:none!important}
@media (prefers-reduced-motion:reduce){.recit-v2-e095-readout,.recit-v2-e095-sr{transition:none!important;animation:none!important}}
`;

register('E095', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e095', CSS); /* un seul appel, toutes les règles du module. */

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    /* Ajoute un token sans écraser les attributs déjà portés par la coque. */
    function ajouteClasse(noeud, nom) {
      if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
    }
    function ajouteToken(noeud, attribut, token) {
      if (!noeud || typeof noeud.getAttribute !== 'function') return;
      const valeurs = (noeud.getAttribute(attribut) || '').split(/\s+/).filter(Boolean);
      if (valeurs.indexOf(token) < 0) {
        valeurs.push(token);
        noeud.setAttribute(attribut, valeurs.join(' '));
      }
    }
    /* Isole chaque chantier : une défaillance locale ne conduit pas les autres. */
    function garder(faire) {
      try { faire(); } catch (_) { /* chantier neutralisé */ }
    }
    /* Paragraphe visible, réutilisé par id et déplacé au bon endroit (idempotent). */
    function readout(id, classe, parent, ancre, texte, live) {
      if (!parent || typeof parent.insertBefore !== 'function') return null;
      let noeud = document.getElementById(id);
      if (!noeud) {
        noeud = el('p', 'recit-v2-e095-readout ' + classe);
        noeud.id = id;
      }
      noeud.textContent = texte;
      if (live) {
        noeud.setAttribute('role', 'status');
        noeud.setAttribute('aria-live', 'polite');
        noeud.setAttribute('aria-atomic', 'true');
      }
      const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
      if (noeud.parentNode !== parent || noeud.nextSibling !== cible) {
        parent.insertBefore(noeud, cible);
      }
      return noeud;
    }
    /* Descripteur sr-only, réutilisé par id (jamais dupliqué). */
    function srParagraphe(id, classe, parent, texte) {
      if (!parent || typeof parent.appendChild !== 'function') return null;
      let noeud = document.getElementById(id);
      if (!noeud) {
        noeud = el('p', 'recit-v2-e095-sr ' + classe);
        noeud.id = id;
      }
      noeud.textContent = texte;
      if (noeud.parentNode !== parent) parent.appendChild(noeud);
      return noeud;
    }

    const kicker = corps.querySelector('.view-kicker');
    const titre = document.getElementById('recit-point-title') || corps.querySelector('.recit-title');
    const meta = corps.querySelector('.recit-meta');
    const conf = corps.querySelector('.recit-conf');
    const fil = corps.querySelector('.recit-thread');
    const liste = document.getElementById('c3a-thread') || corps.querySelector('.recit-thread-list');
    const filTitre = corps.querySelector('.recit-thread-title');
    const actions = corps.querySelector('.recit-actions');
    const media = layout.querySelector('.recit-media');
    const image = media && media.querySelector('img');
    const legende = media && (media.querySelector('.media-caption') || media.querySelector('figcaption'));
    const items = Array.from(corps.querySelectorAll('.recit-thread-item'));

    /* E095-01 — Le titre et l'étape rendus audibles dès l'arrivée sur le point. */
    garder(() => {
      if (!titre) return;
      const trouvé = ((kicker && kicker.textContent) || '').match(/Étape\s+(\d+)\s*\/\s*(\d+)/i);
      const nom = (titre.textContent || '').trim();
      if (!nom) return;
      const texte = trouvé
        ? `Point courant : ${nom} — étape ${trouvé[1]} sur ${trouvé[2]}.`
        : `Point courant : ${nom}.`;
      readout('v2-e095-current', 'recit-v2-e095-current', corps, titre, texte, true);
    });

    /* E095-02 — Repère et année lus depuis .recit-meta, rattachés au h1. */
    garder(() => {
      if (!titre || !meta) return;
      const brut = (meta.textContent || '').trim();
      const evenement = brut.split('·')[0].trim();
      const annee = (brut.match(/\b(1[0-9]{3}|20[0-9]{2})\b/) || [])[0];
      if (!evenement) return;
      const texte = annee ? `Repère : ${evenement}, ${annee}.` : `Repère : ${evenement}.`;
      const note = srParagraphe('v2-e095-repere', 'recit-v2-e095-repere', corps, texte);
      if (note) ajouteToken(titre, 'aria-describedby', note.id);
    });

    /* E095-03 — Le libellé visible du fil devient un sous-titre navigable. */
    garder(() => {
      if (!filTitre) return;
      if (!filTitre.hasAttribute('role')) filTitre.setAttribute('role', 'heading');
      if (!filTitre.hasAttribute('aria-level')) filTitre.setAttribute('aria-level', '2');
      if (!filTitre.id) filTitre.id = 'v2-e095-fil-titre';
      ajouteClasse(fil || corps, 'recit-v2-e095-soustitre');
    });

    /* E095-04 — Aide clavier du fil, comptée depuis les vrais boutons. */
    garder(() => {
      if (!liste || !items.length) return;
      const texte = `Fil du repère : ${items.length} point(s). Utilisez les flèches gauche et droite ou les boutons de commande pour changer de point, puis Entrée pour ouvrir un point du fil.`;
      const note = srParagraphe('v2-e095-fil-aide', 'recit-v2-e095-aide', fil || corps, texte);
      if (note) ajouteToken(liste, 'aria-describedby', note.id);
    });

    /* E095-05 — La légende visible devient la description de l'image. */
    garder(() => {
      if (!media || !image || !legende) return;
      if (!legende.id) legende.id = 'v2-e095-legende';
      if (!image.hasAttribute('aria-describedby')) image.setAttribute('aria-describedby', legende.id);
      ajouteClasse(media, 'recit-v2-e095-image');
    });

    /* E095-06 — La glose de certitude (title) devient un texte audible. */
    garder(() => {
      if (!conf || !meta) return;
      const glose = conf.getAttribute('title');
      if (!glose) return;
      const texte = `Certitude — ${glose}`;
      const noeud = readout('v2-e095-conf-glose', 'recit-v2-e095-glose', meta, conf, texte, false);
      if (noeud) ajouteToken(conf, 'aria-describedby', noeud.id);
    });

    /* E095-07 — Les étiquettes de type doublonnent l'aria-label des items. */
    garder(() => {
      const tags = Array.from(corps.querySelectorAll('.recit-thread-item .thread-kind'));
      if (!tags.length) return;
      tags.forEach((tag) => {
        if (!tag.hasAttribute('aria-hidden')) tag.setAttribute('aria-hidden', 'true');
      });
      ajouteClasse(corps, 'recit-v2-e095-type');
    });

    /* E095-08 — L'état de la lecture auto annoncé depuis aria-pressed. */
    garder(() => {
      if (!actions) return;
      const bouton = Array.from(actions.querySelectorAll('button'))
        .find((b) => /Lecture automatique/i.test((b.textContent || '')));
      if (!bouton || !bouton.hasAttribute('aria-pressed')) return;
      const actif = bouton.getAttribute('aria-pressed') === 'true';
      const texte = `Lecture automatique : ${actif ? 'active' : 'en pause'}.`;
      readout('v2-e095-play-state', 'recit-v2-e095-play', corps, actions, texte, true);
    });

    /* E095-09 — Un seul item tabulable dans le fil, réparé seulement si besoin. */
    garder(() => {
      if (!items.length) return;
      const tabulables = items.filter((n) => !n.hasAttribute('tabindex') || n.getAttribute('tabindex') === '0');
      if (tabulables.length === 1) return; /* état déjà correct : aucune écriture. */
      const courant = items.find((n) => n.classList && n.classList.contains('is-current'));
      const cible = courant || items[0];
      items.forEach((n) => { if (n !== cible) n.setAttribute('tabindex', '-1'); });
      cible.setAttribute('tabindex', '0');
      ajouteClasse(corps, 'recit-v2-e095-tab');
    });

    /* E095-10 — Focus visible, cibles ≥ 36 px et mouvement réduit propre à la V2. */
    garder(() => {
      ajouteClasse(corps, 'recit-v2-e095-focus');
      const reduit = typeof reducedMotion === 'function' && reducedMotion();
      layout.setAttribute('data-v2-e095-motion', reduit ? 'reduce' : 'normal');
    });
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
