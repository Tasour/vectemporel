import { register } from './registry.js';

/* Lentille V2 E024 — structure sémantique avancée des lunes (points vérifiés)
   de la vue Constellation. Seconde passe : dix chantiers inédits, tous
   implémentés, sous le préfixe exclusif v2e024. Aucun fichier partagé n'est
   modifié ; zéro réseau, zéro source aléatoire, zéro minuteur et zéro boucle
   d'animation propre. Le greffon reste passif et tolère un DOM incomplet. */
register('E024', ctx => {
  /* Garde d'entrée : sans layout courant ni API DOM, aucun ajout n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const faire = typeof ctx.el === 'function' ? ctx.el : null;
  if (!faire) return;
  const layout = ctx.layout;

  /* Feuille unique de la lentille : utilitaires visuels, tableau, fil, bouton
     d'évitement et repli « mouvement réduit ». Aucune couleur n'est le seul
     vecteur d'information ; aucune ressource distante, aucun appel réseau. */
  css('constellation-v2-e024', `
.v2e024-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e024-bloc{margin-top:12px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;color:var(--ink-soft);font-size:9px;line-height:1.55}
.v2e024-titre{margin:0 0 6px;font-family:var(--serif);font-size:12px;color:var(--gold-bright)}
.v2e024-table{border-collapse:collapse;width:100%;max-width:820px}
.v2e024-table caption{text-align:left;color:var(--muted);padding:2px 0 6px}
.v2e024-table th,.v2e024-table td{border-bottom:1px solid var(--line);padding:3px 6px;text-align:left;vertical-align:top}
.v2e024-table thead th{color:var(--gold);font-weight:500}
.v2e024-table tbody th{color:var(--ink);font-weight:500}
.v2e024-skip{position:absolute;left:10px;top:-64px;z-index:9;min-height:36px;padding:0 12px;border:1px solid var(--gold);border-radius:8px;background:var(--surface-2);color:var(--gold-bright);font-size:10px;cursor:pointer}
.v2e024-skip:focus-visible{top:8px;outline:3px solid var(--gold-bright);outline-offset:3px}
.v2e024-fil ol{display:flex;flex-wrap:wrap;gap:4px;margin:0;padding:0;list-style:none}
.v2e024-fil li+li::before{content:'›';padding:0 4px;color:var(--muted)}
.v2e024-fil [aria-current="page"]{color:var(--gold-bright);font-weight:600}
.v2e024-methode summary{min-height:36px;display:flex;align-items:center;color:var(--gold);cursor:pointer}
.v2e024-methode summary:focus-visible{outline:3px solid var(--gold-bright);outline-offset:3px}
.v2e024-methode p{margin:6px 0 0;color:var(--muted)}
.v2e024-output{display:inline-block;margin-top:6px;color:var(--ink);font-variant-numeric:tabular-nums}
.v2e024-calm .v2e024-skip,.v2e024-calm .v2e024-methode summary{transition:none}
@media (prefers-reduced-motion: reduce){.v2e024-skip,.v2e024-methode summary{transition:none!important}}
@media (max-width:620px){.v2e024-table{font-size:8px}}
`);

  const calque = layout.querySelector('.const-layer-moons');
  const lunes = Array.from((calque || layout).querySelectorAll('button.const-moon'));
  const total = lunes.length;
  const pluriel = nombre => (nombre > 1 ? 's' : '');

  /* Lectures défensives : tout provient des attributs publics déjà posés par
     la vue mère (data-const-key, data-label, title, aria-label, --x/--y). */
  const nettoyer = valeur => String(valeur == null ? '' : valeur).replace(/\s+/g, ' ').trim();
  const lire = (lune, index) => {
    const titre = nettoyer(lune.title);
    const etiquette = nettoyer(lune.getAttribute('aria-label'));
    const nature = nettoyer(
      (etiquette.match(/^Point\s+\d+\s*:\s*([^,]+)/i) || [])[1]
      || titre.split('·')[0]
      || nettoyer(lune.dataset.label).split('·')[0]
      || 'point vérifié'
    );
    const confiance = nettoyer(
      (titre.match(/confiance\s+([^·]+)/i) || [])[1]
      || (etiquette.match(/confiance\s+([^,]+)/i) || [])[1]
      || 'non renseignée'
    );
    const nSource = etiquette.match(/(\d+)\s+source/i) || titre.match(/(\d+)\s+source/i);
    const sources = nSource ? Number(nSource[1])
      : (/aucune source/i.test(`${etiquette} ${titre}`) ? 0 : null);
    return {
      index,
      cle: nettoyer(lune.dataset.constKey) || `moon:${index}`,
      nature,
      confiance,
      sources,
      actif: lune.getAttribute('aria-current') === 'true' || lune.classList.contains('is-active'),
    };
  };
  const infos = lunes.map(lire);

  /* Fusion idempotente de jetons dans un attribut ARIA déjà présent. */
  const ajouterJetons = (valeur, jetons) => {
    const liste = nettoyer(valeur).split(/\s+/).filter(Boolean);
    jetons.forEach(jeton => {
      if (liste.indexOf(jeton) === -1) liste.push(jeton);
    });
    return liste.join(' ');
  };
  const identifier = (noeud, propose) => {
    if (noeud.id) return noeud.id;
    noeud.id = propose;
    return propose;
  };

  /* Bloc conteneur unique, créé une seule fois par rendu, distinct du panneau
     de la passe 1. Il reçoit les structures sémantiques V2. */
  let bloc = layout.querySelector('#v2e024-bloc');
  if (!bloc) {
    bloc = faire('section', 'v2e024-bloc');
    bloc.id = 'v2e024-bloc';
    const titre = faire('h3', 'v2e024-titre',
      `Lecture structurée des points vérifiés — ${total} point${pluriel(total)}`);
    titre.id = 'v2e024-titre';
    bloc.setAttribute('aria-labelledby', titre.id);
    bloc.appendChild(titre);
    const ancre = calque || layout.querySelector('.constellation-caption') || layout;
    if (ancre.parentNode && typeof ancre.parentNode.insertBefore === 'function') {
      ancre.parentNode.insertBefore(bloc, ancre.nextSibling);
    } else {
      layout.appendChild(bloc);
    }
  }

  /* E024-01 — Position canonique de chaque lune dans l'ensemble des points. */
  lunes.forEach((lune, index) => {
    lune.setAttribute('aria-posinset', String(index + 1));
    lune.setAttribute('aria-setsize', String(total));
    lune.setAttribute('data-v2e024-pos', `${index + 1}/${total}`);
  });

  /* E024-02 — Roledescription et décompte sur le calque des lunes, sans
     écraser l'étiquette générique posée par la vue mère. */
  if (calque) {
    calque.setAttribute('aria-roledescription', 'ensemble de points vérifiés');
    const decompte = `${total} point${pluriel(total)} vérifié${pluriel(total)}`;
    const etiquetteCalque = nettoyer(calque.getAttribute('aria-label'));
    if (etiquetteCalque.indexOf(decompte) === -1) {
      calque.setAttribute('aria-label', `${etiquetteCalque || 'Points vérifiés'} — ${decompte}`);
    }
    calque.setAttribute('data-v2e024-groupe', String(total));
  }

  /* E024-03 — Tableau de données sémantique : légende, en-têtes de colonnes
     et de lignes explicitement typés, une rangée par lune. */
  let table = layout.querySelector('#v2e024-table');
  if (!table) {
    table = faire('table', 'v2e024-table');
    table.id = 'v2e024-table';
    const caption = faire('caption', 'v2e024-caption',
      `Points vérifiés du repère actif — ${total} point${pluriel(total)}`);
    caption.id = 'v2e024-caption';
    table.appendChild(caption);
    const thead = faire('thead', 'v2e024-thead');
    const tete = faire('tr', 'v2e024-ligne-tete');
    const thRang = faire('th', 'v2e024-th-col', 'Rang');
    thRang.setAttribute('scope', 'col');
    tete.appendChild(thRang);
    const thNature = faire('th', 'v2e024-th-col', 'Nature');
    thNature.setAttribute('scope', 'col');
    tete.appendChild(thNature);
    const thConfiance = faire('th', 'v2e024-th-col', 'Confiance');
    thConfiance.setAttribute('scope', 'col');
    tete.appendChild(thConfiance);
    const thSources = faire('th', 'v2e024-th-col', 'Sources');
    thSources.setAttribute('scope', 'col');
    tete.appendChild(thSources);
    const thClef = faire('th', 'v2e024-th-col', 'Clé');
    thClef.setAttribute('scope', 'col');
    tete.appendChild(thClef);
    thead.appendChild(tete);
    table.appendChild(thead);
    const tbody = faire('tbody', 'v2e024-tbody');
    tbody.id = 'v2e024-tbody';
    infos.forEach(info => {
      const ligne = faire('tr', 'v2e024-rangee');
      ligne.id = `v2e024-rangee-${info.index + 1}`;
      const thLigne = faire('th', 'v2e024-th-ligne', `Point ${info.index + 1}`);
      thLigne.setAttribute('scope', 'row');
      thLigne.tabIndex = -1;
      ligne.appendChild(thLigne);
      ligne.appendChild(faire('td', 'v2e024-td-nature', info.nature));
      ligne.appendChild(faire('td', 'v2e024-td-confiance', info.confiance));
      ligne.appendChild(faire('td', 'v2e024-td-sources',
        info.sources === null ? 'inconnues' : `${info.sources} source${pluriel(info.sources)}`));
      ligne.appendChild(faire('td', 'v2e024-td-clef', info.cle));
      tbody.appendChild(ligne);
    });
    table.appendChild(tbody);
    table.setAttribute('data-v2e024-table', String(total));
    bloc.appendChild(table);
  }

  /* E024-04 — Référencement croisé : chaque lune pilote sa rangée et chaque
     rangée renvoie à sa lune, par des identifiants v2e024 stables. */
  lunes.forEach((lune, index) => {
    const idLune = identifier(lune, `v2e024-lune-${index + 1}`);
    const ligne = layout.querySelector(`#v2e024-rangee-${index + 1}`);
    if (!ligne) return;
    lune.setAttribute('aria-controls', ajouterJetons(lune.getAttribute('aria-controls'), [ligne.id]));
    ligne.setAttribute('aria-controls', ajouterJetons(ligne.getAttribute('aria-controls'), [idLune]));
    ligne.setAttribute('data-v2e024-lune', idLune);
  });

  /* E024-05 — Orientation cardinale déduite des variables de position --x et
     --y déjà posées par la vue : information textuelle, jamais codée par la couleur. */
  const cardinal = (x, y) => {
    const angle = (Math.atan2(y - 50, x - 50) * 180 / Math.PI + 360) % 360;
    const directions = ['Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest', 'Nord', 'Nord-Est'];
    return directions[Math.round(angle / 45) % 8];
  };
  lunes.forEach(lune => {
    const x = Number.parseFloat(lune.style.getPropertyValue('--x'));
    const y = Number.parseFloat(lune.style.getPropertyValue('--y'));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const direction = cardinal(x, y);
    lune.setAttribute('data-v2e024-orientation', direction);
    const etiquette = nettoyer(lune.getAttribute('aria-label'));
    if (etiquette.indexOf('orientation') === -1) {
      lune.setAttribute('aria-label', `${etiquette}, orientation ${direction} (placement décoratif)`);
    }
  });

  /* E024-06 — Fil d'Ariane Ère › Repère › Point, dérivé de la ligne d'état
     déjà rendue dans la légende, avec repli générique sur un DOM incomplet. */
  const etatTexte = nettoyer(
    (layout.querySelector('.constellation-state') || {}).textContent || ''
  );
  const segment = motif => {
    const trouve = etatTexte.match(motif);
    return trouve ? nettoyer(trouve[1]) : '';
  };
  const ere = segment(/[Èè]re\s*:\s*([^·]+)/i) || 'Ère courante';
  const repere = segment(/Repère\s*:\s*([^·]+)/i) || 'Repère courant';
  const pointEtat = segment(/Point\s*:\s*([^·]+)/i)
    || `${total} point${pluriel(total)}`;
  let fil = layout.querySelector('#v2e024-fil');
  if (!fil) {
    fil = faire('nav', 'v2e024-fil');
    fil.id = 'v2e024-fil';
    fil.setAttribute('aria-label', 'Fil d’Ariane de la constellation');
    const liste = faire('ol', 'v2e024-fil-liste');
    [ere, repere, `Point ${pointEtat}`].forEach((texte, index, ensemble) => {
      const item = faire('li', 'v2e024-fil-item', texte);
      if (index === ensemble.length - 1) item.setAttribute('aria-current', 'page');
      liste.appendChild(item);
    });
    fil.appendChild(liste);
    bloc.appendChild(fil);
  }

  /* E024-07 — Définition en ligne des abréviations du tableau, à leur
     première occurrence, sans doubler le glossaire de la passe 1. */
  const abreviation = (texte, definition, identifiant) => {
    const noeud = faire('abbr', 'v2e024-abbr', texte);
    noeud.title = definition;
    noeud.setAttribute('aria-label', definition);
    if (identifiant) noeud.id = identifiant;
    return noeud;
  };
  const teteSources = table.querySelector('thead th:nth-child(4)');
  if (teteSources && !teteSources.querySelector('abbr')) {
    teteSources.textContent = '';
    teteSources.appendChild(abreviation('Src.', 'Source locale déclarée dans le dossier du point', 'v2e024-abbr-src'));
  }
  const teteConfiance = table.querySelector('thead th:nth-child(3)');
  if (teteConfiance && !teteConfiance.querySelector('abbr')) {
    teteConfiance.textContent = '';
    teteConfiance.appendChild(abreviation('Conf.', 'Degré de confiance déclaré du point', 'v2e024-abbr-conf'));
  }

  /* E024-08 — Lien d'évitement vers la rangée de l'index, avec cible visible
     au focus, hauteur minimale de 36 px et repli « mouvement réduit ». */
  let saut = layout.querySelector('#v2e024-saut');
  if (!saut) {
    saut = faire('button', 'v2e024-skip', 'Aller à l’index des points vérifiés');
    saut.id = 'v2e024-saut';
    saut.type = 'button';
    saut.setAttribute('aria-controls', table.id || 'v2e024-table');
    saut.addEventListener('click', () => {
      const cible = layout.querySelector('#v2e024-tbody th[scope="row"]') || lunes[0];
      if (cible && typeof cible.focus === 'function') cible.focus({ preventScroll: true });
    });
    const champ = layout.querySelector('.constellation-field');
    const avant = champ || calque;
    if (avant && avant.parentNode && typeof avant.parentNode.insertBefore === 'function') {
      avant.parentNode.insertBefore(saut, avant);
    } else {
      bloc.appendChild(saut);
    }
  }
  let calme = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { calme = !!ctx.reducedMotion(); } catch (_erreur) { calme = false; }
  }
  if (calme) bloc.classList.add('v2e024-calm');
  else bloc.classList.remove('v2e024-calm');

  /* E024-09 — Disclosure native « méthode de lecture » : aucun état JavaScript,
     le couple details/summary porte l'ouverture et le focus clavier. */
  let methode = layout.querySelector('#v2e024-methode');
  if (!methode) {
    methode = faire('details', 'v2e024-methode');
    methode.id = 'v2e024-methode';
    methode.appendChild(faire('summary', 'v2e024-resume', 'Méthode de lecture des points'));
    methode.appendChild(faire('p', 'v2e024-corps',
      'Chaque lune est un point vérifié du repère actif. Son rang, sa nature, sa confiance et le nombre de sources sont écrits dans le tableau et dans son étiquette ; la position autour du repère est décorative et ne code aucune donnée.'));
    bloc.appendChild(methode);
  }

  /* E024-10 — Compteur sémantique <output> : relate les identifiants des
     lunes et annonce poliment le décompte, distinct du bilan de la passe 1. */
  let sortie = layout.querySelector('#v2e024-output');
  if (!sortie) {
    sortie = faire('output', 'v2e024-output',
      `${total} point${pluriel(total)} vérifié${pluriel(total)} indexé${pluriel(total)}`);
    sortie.id = 'v2e024-output';
    sortie.setAttribute('role', 'status');
    sortie.setAttribute('aria-live', 'polite');
    sortie.setAttribute('aria-atomic', 'true');
    sortie.setAttribute('aria-label', 'Compte des points vérifiés indexés');
    sortie.setAttribute('for', lunes.map((lune, index) =>
      identifier(lune, `v2e024-lune-${index + 1}`)).join(' '));
    bloc.appendChild(sortie);
  }
});
