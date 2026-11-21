import { register } from './registry.js';

/* Lentille V2 E064 — Structure sémantique avancée des métriques chiffrées.
   Seconde passe : dix chantiers inédits, tous implémentés, sans réseau, ni
   source aléatoire, ni minuteur ni boucle d'animation propre. Module passif. */
register('E064', ctx => {
  /* Garde d'entrée : sans layout exploitable, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique de la lentille, préfixée v2e064, installée une seule fois. */
  css('constellation-v2-e064', `
.v2e064-panel{margin-top:14px;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.015)}
.v2e064-panel:focus-visible{outline:3px solid var(--gold-bright);outline-offset:2px}
.v2e064-panel.v2e064-calm *{transition:none!important}
.v2e064-titre{margin:0 0 8px;color:var(--gold-bright);font-family:var(--serif);font-size:12px;font-weight:600}
.v2e064-figure{margin:8px 0;padding:0}
.v2e064-figure figcaption{color:var(--muted);font-size:9px;margin-bottom:2px}
.v2e064-figure data{color:var(--ink);font-size:11px;font-variant-numeric:tabular-nums}
.v2e064-formule{margin:8px 0;color:var(--ink-soft);font-size:10px;line-height:1.7}
.v2e064-formule var{color:var(--gold);font-style:italic}
.v2e064-abbr,.v2e064-bdi,.v2e064-actif,.v2e064-citation{margin:8px 0;color:var(--muted);font-size:10px;line-height:1.6}
.v2e064-bdi bdi{font-variant-numeric:tabular-nums}
.v2e064-tableau{width:100%;border-collapse:collapse;margin-top:10px;font-size:10px;font-variant-numeric:tabular-nums}
.v2e064-tableau caption{caption-side:top;text-align:left;color:var(--muted);font-size:9px;padding-bottom:4px}
.v2e064-tableau th,.v2e064-tableau td{padding:4px 8px;border-bottom:1px solid var(--line);text-align:left}
.v2e064-tableau thead th{color:var(--gold);font-size:9px;letter-spacing:.06em}
.v2e064-tableau tbody th,.v2e064-tableau tfoot th{color:var(--ink-soft);font-weight:400}
.v2e064-tableau tfoot{font-style:italic;color:var(--gold)}
.v2e064-col-mesure{width:60%}
.v2e064-col-valeur{width:40%}
.v2e064-details{margin-top:10px;font-size:9px;color:var(--muted)}
.v2e064-details summary{cursor:pointer;color:var(--gold);font-size:10px;min-height:24px;padding:2px 0}
.v2e064-details summary:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.v2e064-details p{margin:6px 0 0;line-height:1.6}
.v2e064-actif mark{background:rgba(244,214,158,.22);color:var(--ink);font-weight:600;padding:0 3px;border-radius:3px}
@media (prefers-reduced-motion:reduce){.v2e064-panel *{transition:none!important}}
@media (max-width:620px){.v2e064-tableau th,.v2e064-tableau td{padding:3px 4px}}
`);

  /* Fabrique locale tolérante et utilitaires de lecture du DOM rendu. */
  const sansEchec = action => { try { action(); } catch { /* neutralisation silencieuse */ } };
  const fabriquer = (balise, classe, texte) => typeof ctx.el === 'function'
    ? ctx.el(balise, classe, texte) : document.createElement(balise);
  const libelle = noeud => !noeud || !noeud.dataset ? ''
    : String(noeud.dataset.label || noeud.title || noeud.getAttribute('aria-label') || '').trim();
  const diaphragme = nombre => {
    const valeur = typeof nombre === 'number' ? nombre : parseFloat(String(nombre).replace(',', '.'));
    return Number.isFinite(valeur) ? String(valeur).replace('.', ',') : '—';
  };

  const soleils = Array.prototype.slice.call(layout.querySelectorAll('.const-sun'));
  const planetes = Array.prototype.slice.call(layout.querySelectorAll('.const-planet'));
  const lunes = Array.prototype.slice.call(layout.querySelectorAll('.const-moon'));
  const nbSources = lunes.reduce((total, lune) => {
    const texte = [lune.dataset && lune.dataset.label, lune.title,
      lune.getAttribute('aria-label')].filter(Boolean).join(' ');
    const trouve = /(\d+)\s+sources?\s+locales?/i.exec(texte);
    return total + (trouve ? parseInt(trouve[1], 10) : 0);
  }, 0);
  const rayon = Math.max(18, Math.min(34, 14 + planetes.length * 1.8));
  const angle = 137.5;
  const actif = soleils.find(s => s.classList.contains('is-active')) || soleils[0];
  const libelleActif = libelle(actif) || 'ère non précisée';

  /* Panneau autonome, inséré avant la légende existante sans la réécrire. */
  let panneau = layout.querySelector('#v2e064-panel');
  sansEchec(() => {
    if (panneau) return;
    panneau = fabriquer('aside', 'v2e064-panel');
    panneau.id = 'v2e064-panel';
    panneau.tabIndex = 0;
    const caption = layout.querySelector('.constellation-caption');
    if (caption && caption.parentNode) caption.parentNode.insertBefore(panneau, caption);
    else layout.appendChild(panneau);
  });
  if (!panneau) return;

  /* E064-01 — Hiérarchie de titres calculée : le niveau du titre du panneau
     s'ajuste aux titres déjà présents dans la vue, sans titre orphelin. */
  sansEchec(() => {
    if (panneau.querySelector('#v2e064-titre')) return;
    let niveauMax = 2;
    layout.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(titre => {
      const niveau = parseInt(titre.tagName.charAt(1), 10);
      if (Number.isFinite(niveau) && niveau > niveauMax) niveauMax = niveau;
    });
    const niveau = Math.min(6, niveauMax + 1);
    const titre = fabriquer('h' + niveau, 'v2e064-titre', 'Structure sémantique des métriques');
    titre.id = 'v2e064-titre';
    panneau.appendChild(titre);
    panneau.setAttribute('aria-labelledby', titre.id);
  });

  /* E064-02 — Figures légendées : chaque grandeur dérivée devient une figure
     autonome, avec sa légende textuelle et sa valeur machine <data>. */
  sansEchec(() => {
    if (panneau.querySelector('#v2e064-figures')) return;
    const groupe = fabriquer('div', 'v2e064-figures');
    groupe.id = 'v2e064-figures';
    [['Rayon des repères', 'rayon', diaphragme(rayon.toFixed(1)) + ' %', rayon.toFixed(2)],
     ['Pas angulaire', 'angle', diaphragme(angle) + ' °', '137.5']].forEach(([legende, cle, valeur, brut]) => {
      const figure = fabriquer('figure', 'v2e064-figure');
      figure.appendChild(fabriquer('figcaption', '', legende));
      const data = fabriquer('data', '', valeur);
      data.id = 'v2e064-fig-' + cle;
      data.setAttribute('value', brut);
      figure.appendChild(data);
      groupe.appendChild(figure);
    });
    panneau.appendChild(groupe);
  });

  /* E064-03 — Formules typées : variables <var>, indices <sub> et marque
     d'ordre <sup> rendent la règle de calcul lisible par les lecteurs d'écran. */
  sansEchec(() => {
    if (panneau.querySelector('#v2e064-formule')) return;
    const p = fabriquer('p', 'v2e064-formule');
    p.id = 'v2e064-formule';
    const R = fabriquer('var', '', 'R');
    R.appendChild(fabriquer('sub', '', 'rep'));
    const n = fabriquer('var', '', 'n');
    n.appendChild(fabriquer('sub', '', 'rep'));
    const d = fabriquer('var', '', 'Δ');
    d.appendChild(fabriquer('sub', '', 'θ'));
    p.appendChild(R);
    p.appendChild(document.createTextNode(' = max(18, min(34, 14 + 1,8 × '));
    p.appendChild(n);
    p.appendChild(document.createTextNode(')) où '));
    p.appendChild(n);
    p.appendChild(document.createTextNode(' est le nombre de repères ; '));
    p.appendChild(d);
    p.appendChild(document.createTextNode(' = 137,5 ° entre repères consécutifs. Le 1'));
    p.appendChild(fabriquer('sup', '', 'er'));
    p.appendChild(document.createTextNode(' repère sert d’origine angulaire.'));
    panneau.appendChild(p);
  });

  /* E064-04 — Abréviations développées : <abbr title> porte l'expansion dès
     la première occurrence des sigles et symboles employés dans le panneau. */
  sansEchec(() => {
    if (panneau.querySelector('#v2e064-abbr')) return;
    const p = fabriquer('p', 'v2e064-abbr');
    p.id = 'v2e064-abbr';
    p.appendChild(document.createTextNode('Symboles : '));
    [['av. J.-C.', 'avant Jésus-Christ'], ['°', 'degrés'], ['%', 'pour cent']].forEach(([sigle, expansion], i) => {
      if (i) p.appendChild(document.createTextNode(', '));
      const abbr = fabriquer('abbr', '', sigle);
      abbr.setAttribute('title', expansion);
      p.appendChild(abbr);
    });
    p.appendChild(document.createTextNode('.'));
    panneau.appendChild(p);
  });

  /* E064-05 — Isolation bidirectionnelle : <bdi> enveloppe chaque valeur
     composée (nombre + unité) pour éviter les réordonnancements en lecture. */
  sansEchec(() => {
    if (panneau.querySelector('#v2e064-bdi')) return;
    const p = fabriquer('p', 'v2e064-bdi');
    p.id = 'v2e064-bdi';
    p.appendChild(document.createTextNode('Valeurs relevées : '));
    [diaphragme(rayon.toFixed(1)) + ' %', diaphragme(angle) + ' °',
     String(soleils.length) + ' ères', String(planetes.length) + ' repères',
     String(nbSources) + ' sources'].forEach((valeur, i) => {
      if (i) p.appendChild(document.createTextNode(' · '));
      p.appendChild(fabriquer('bdi', '', valeur));
    });
    panneau.appendChild(p);
  });

  /* E064-06 — Colonnes typées et cellules reliées : <colgroup>/<col> et
     l'attribut headers complètent scope pour les lecteurs d'écran. */
  sansEchec(() => {
    if (panneau.querySelector('#v2e064-tableau')) return;
    const tableau = fabriquer('table', 'v2e064-tableau');
    tableau.id = 'v2e064-tableau';
    tableau.appendChild(fabriquer('caption', '', 'Grandeurs relevées dans la vue figée'));
    const groupe = fabriquer('colgroup');
    groupe.appendChild(fabriquer('col', 'v2e064-col-mesure'));
    groupe.appendChild(fabriquer('col', 'v2e064-col-valeur'));
    tableau.appendChild(groupe);
    const tete = fabriquer('thead');
    const trTete = fabriquer('tr');
    const thMesure = fabriquer('th', '', 'Grandeur');
    thMesure.id = 'v2e064-col-mesure';
    thMesure.setAttribute('scope', 'col');
    const thValeur = fabriquer('th', '', 'Valeur');
    thValeur.id = 'v2e064-col-valeur';
    thValeur.setAttribute('scope', 'col');
    trTete.appendChild(thMesure);
    trTete.appendChild(thValeur);
    tete.appendChild(trTete);
    tableau.appendChild(tete);
    const corps = fabriquer('tbody');
    [['eres', 'Ères', String(soleils.length)],
     ['reperes', 'Repères', String(planetes.length)],
     ['points', 'Points vérifiés', String(lunes.length)],
     ['sources', 'Sources locales', String(nbSources)],
     ['rayon', 'Rayon (%)', diaphragme(rayon.toFixed(1))],
     ['angle', 'Pas angulaire (°)', diaphragme(angle)]].forEach(([cle, intitule, valeur]) => {
      const tr = fabriquer('tr');
      const thLigne = fabriquer('th', '', intitule);
      thLigne.id = 'v2e064-ligne-' + cle;
      thLigne.setAttribute('scope', 'row');
      const td = fabriquer('td', '', valeur);
      td.setAttribute('headers', 'v2e064-col-mesure v2e064-col-valeur v2e064-ligne-' + cle);
      tr.appendChild(thLigne);
      tr.appendChild(td);
      corps.appendChild(tr);
    });
    tableau.appendChild(corps);
    panneau.appendChild(tableau);
  });

  /* E064-07 — Pied de synthèse : <tfoot> sépare sémantiquement le total du
     corps du tableau, sans duplicateur d'information. */
  sansEchec(() => {
    const tableau = panneau.querySelector('#v2e064-tableau');
    if (!tableau || tableau.querySelector('tfoot')) return;
    const pied = fabriquer('tfoot');
    const tr = fabriquer('tr');
    const th = fabriquer('th', '', 'Nombre de grandeurs relevées');
    th.setAttribute('scope', 'row');
    const td = fabriquer('td', '', '6');
    td.setAttribute('headers', 'v2e064-col-mesure v2e064-col-valeur');
    tr.appendChild(th);
    tr.appendChild(td);
    pied.appendChild(tr);
    tableau.appendChild(pied);
  });

  /* E064-08 — Détail repliable : <details>/<summary> rend les règles de calcul
     consultables au clavier, sans JavaScript ni ressource externe. */
  sansEchec(() => {
    if (panneau.querySelector('#v2e064-details')) return;
    const details = fabriquer('details', 'v2e064-details');
    details.id = 'v2e064-details';
    details.appendChild(fabriquer('summary', '', 'Détail des règles de calcul'));
    details.appendChild(fabriquer('p', '',
      'Rayon = 14 + 1,8 × nombre de repères, borné entre 18 et 34 % ; pas angulaire = 137,5 ° entre repères consécutifs ; la confiance reste une étiquette textuelle, jamais une couleur.'));
    panneau.appendChild(details);
  });

  /* E064-09 — Sélection active marquée : <mark> doublé d'un libellé textuel,
     dans une région live, pour que l'information ne dépende pas de la couleur. */
  sansEchec(() => {
    if (panneau.querySelector('#v2e064-actif')) return;
    const p = fabriquer('p', 'v2e064-actif');
    p.id = 'v2e064-actif';
    p.setAttribute('role', 'status');
    p.setAttribute('aria-live', 'polite');
    p.setAttribute('aria-atomic', 'true');
    p.appendChild(document.createTextNode('Ère sélectionnée : '));
    p.appendChild(fabriquer('mark', '', libelleActif));
    p.appendChild(document.createTextNode(' — sélection active (également annoncée en texte).'));
    panneau.appendChild(p);
  });

  /* E064-10 — Langue déclarée et citation locale : <span lang> identifie le
     terme étranger, <q>/<cite> attribue la règle à sa source interne, sans
     aucun lien réseau. */
  sansEchec(() => {
    if (panneau.querySelector('#v2e064-citation')) return;
    const p = fabriquer('p', 'v2e064-citation');
    p.id = 'v2e064-citation';
    p.appendChild(document.createTextNode('Un point noté '));
    const etranger = fabriquer('span', '', 'disputed');
    etranger.setAttribute('lang', 'en');
    p.appendChild(etranger);
    p.appendChild(document.createTextNode(' est un point disputé. Règle rappelée : '));
    const q = fabriquer('q', '', 'la confiance reste une étiquette textuelle.');
    q.setAttribute('cite', '#v2e064-details');
    p.appendChild(q);
    p.appendChild(document.createTextNode(' — '));
    p.appendChild(fabriquer('cite', '', 'Règle interne de la vue Constellation.'));
    p.appendChild(document.createTextNode('.'));
    panneau.appendChild(p);
  });

  /* Accessibilité complémentaire : mode sobre demandé au contexte, sans
     sonde propre ni écouteur de média. */
  sansEchec(() => {
    if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion())
      panneau.classList.add('v2e064-calm');
    else panneau.classList.remove('v2e064-calm');
  });
});
