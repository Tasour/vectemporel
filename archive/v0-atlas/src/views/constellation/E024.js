import { register } from './registry.js';

/* Lentille E024 — structure sémantique appliquée aux lunes de la vue Constellation.
   Dix chantiers indépendants, tous dérivés du DOM existant : aucun fichier partagé
   n'est modifié, aucune donnée n'est inventée, aucune journalisation n'est émise.
   Le greffon reste tolérant : toute absence de nœud ou d'API est ignorée. */

/* Garde d'idempotence : une seule installation par rendu du layout. */
const INSTALLED = new WeakSet();

/* Lecture défensive d'une lune : tout provient de ses attributs publics. */
function lireLune(lune, index) {
  const cle = lune.dataset && lune.dataset.constKey ? lune.dataset.constKey : `moon:${index}`;
  const titre = lune.getAttribute('title') || '';
  const etiquette = lune.getAttribute('aria-label') || lune.dataset.label || '';
  const confianceBrut = (titre.match(/confiance\s+([^\s·]+)/i) || [])[1] || '';
  const nSource = etiquette.match(/(\d+)\s+source/i);
  const genreBrut = (etiquette.match(/Point\s+\d+\s*:\s*([^,]+)/i) || [])[1]
    || (lune.dataset.label || 'point vérifié').split(' · ')[0];
  return {
    cle,
    titre,
    etiquette,
    confiance: confianceBrut || 'non renseignée',
    sources: nSource ? Number(nSource[1]) : (/aucune source/i.test(etiquette) ? 0 : null),
    genre: String(genreBrut).trim() || 'point vérifié',
    actif: lune.getAttribute('aria-current') === 'true' || lune.classList.contains('is-active'),
  };
}

/* Niveau déterministe, calculé depuis la confiance telle qu'elle est affichée. */
function niveau(confiance) {
  const brut = String(confiance || '').trim().toLowerCase();
  if (/élev|high|fort/.test(brut)) return 'élevée';
  if (/moyen|medium/.test(brut)) return 'moyenne';
  if (/faible|low/.test(brut)) return 'faible';
  const n = Number.parseFloat(brut.replace(',', '.'));
  if (!Number.isFinite(n)) return 'non renseignée';
  if (n >= 0.8) return 'élevée';
  if (n >= 0.5) return 'moyenne';
  return 'faible';
}

register('E024', (ctx) => {
  if (!ctx || !ctx.layout) return; /* garde avant tout ajout DOM */
  const layout = ctx.layout;

  try {
    if (INSTALLED.has(layout)) return;
    INSTALLED.add(layout);

    const faire = typeof ctx.el === 'function' ? ctx.el : null;
    const css = typeof ctx.css === 'function' ? ctx.css : null;
    if (!faire || !css) return;
    const doc = layout.ownerDocument || (typeof document === 'undefined' ? null : document);
    if (!doc) return;

    const lunes = Array.from(layout.querySelectorAll('.const-moon'));
    const infos = lunes.map(lireLune);
    const calque = layout.querySelector('.const-layer-moons');
    const caption = layout.querySelector('.constellation-caption');
    const reduit = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion() === true;

    /* E024-01 — conteneur sémantique nommé : une section titrée insérée après la légende. */
    const panneau = faire('section', 'e024-panel');
    panneau.id = 'e024-panel';
    panneau.setAttribute('aria-labelledby', 'e024-heading');
    const titre = faire('h3', 'e024-heading',
      `Points vérifiés du repère — ${infos.length} lune${infos.length > 1 ? 's' : ''}`);
    titre.id = 'e024-heading';
    panneau.appendChild(titre);
    if (calque) calque.setAttribute('aria-describedby', 'e024-heading');
    panneau.setAttribute('data-e024-vue', ctx.viewId || 'constellation');
    if (caption && typeof caption.after === 'function') caption.after(panneau);
    else layout.appendChild(panneau);

    /* E024-02 — description partagée, référencée par chaque lune via aria-describedby. */
    const description = faire('p', 'e024-desc',
      'Une lune est un point vérifié du repère sélectionné. Sa nature, sa confiance et le nombre de sources locales sont indiqués par écrit dans l’index ci-dessous et dans l’étiquette de chaque lune ; aucune information ne repose sur la seule couleur.');
    description.id = 'e024-desc';
    panneau.appendChild(description);
    lunes.forEach((lune) => {
      if (!lune.hasAttribute('aria-describedby')) lune.setAttribute('aria-describedby', 'e024-desc');
    });

    /* E024-03 — marquage auditable : index, clé, confiance, niveau et sources sur chaque lune. */
    lunes.forEach((lune, index) => {
      lune.setAttribute('data-e024-index', String(index + 1));
      lune.setAttribute('data-e024-cle', infos[index].cle);
      lune.setAttribute('data-e024-confiance', infos[index].confiance);
      lune.setAttribute('data-e024-niveau', niveau(infos[index].confiance));
      lune.setAttribute('data-e024-sources',
        infos[index].sources === null ? 'inconnu' : String(infos[index].sources));
    });

    /* E024-04 — index ordonné : une navigation et une liste numérotée pour les lunes. */
    const navigation = faire('nav', 'e024-nav');
    navigation.id = 'e024-nav';
    navigation.setAttribute('aria-label', 'Index des points vérifiés');
    const liste = faire('ol', 'e024-index');
    liste.id = 'e024-index';
    if (!infos.length) liste.appendChild(faire('li', 'e024-item e024-vide', 'Aucune lune pour ce repère.'));
    infos.forEach((info, index) => {
      const item = faire('li', 'e024-item');
      item.setAttribute('data-e024-cle', info.cle);
      item.appendChild(faire('span', 'e024-num', `Lune ${index + 1}.`));
      item.appendChild(faire('span', 'e024-genre', info.genre));
      item.appendChild(faire('span', 'e024-niveau', `confiance ${niveau(info.confiance)}`));
      item.appendChild(faire('span', 'e024-src', info.sources === null
        ? 'sources inconnues'
        : `${info.sources} source${info.sources > 1 ? 's' : ''}`));
      liste.appendChild(item);
    });
    navigation.appendChild(liste);
    panneau.appendChild(navigation);

    /* E024-05 — répartition calculée par niveau de confiance dans une sous-liste. */
    const ordreNiveaux = ['élevée', 'moyenne', 'faible', 'non renseignée'];
    const niveaux = infos.map((info) => niveau(info.confiance));
    const bilan = faire('ul', 'e024-niveaux');
    bilan.id = 'e024-niveaux';
    ordreNiveaux.forEach((niveauCible) => {
      const total = niveaux.filter((n) => n === niveauCible).length;
      if (total) bilan.appendChild(faire('li', 'e024-niveau-ligne',
        `Confiance ${niveauCible} : ${total} lune${total > 1 ? 's' : ''}`));
    });
    if (!bilan.childNodes.length) {
      bilan.appendChild(faire('li', 'e024-niveau-ligne', 'Aucune lune à répartir.'));
    }
    panneau.appendChild(bilan);

    /* E024-06 — glossaire en liste de définitions, premier niveau de lecture. */
    const glossaire = faire('dl', 'e024-glossaire');
    glossaire.id = 'e024-glossaire';
    [
      ['Lune', 'Point vérifié rattaché au repère actif, ouvrable dans le détail.'],
      ['Confiance', 'Degré de fiabilité déclaré du point, repris tel quel depuis son étiquette.'],
      ['Source locale', 'Référence présente dans le dossier du point ; son nombre est indiqué par écrit.'],
      ['Repère', 'Événement autour duquel les lunes sont disposées, sans codage de date dans la position.'],
    ].forEach(([terme, definition]) => {
      glossaire.appendChild(faire('dt', 'e024-terme', terme));
      glossaire.appendChild(faire('dd', 'e024-definition', definition));
    });
    panneau.appendChild(glossaire);

    /* E024-07 — région live : annonce de la lune courante sur focus et sur clic. */
    const statut = faire('p', 'e024-status', infos.length
      ? `${infos.length} lune${infos.length > 1 ? 's' : ''} indexée${infos.length > 1 ? 's' : ''}.`
      : 'Aucune lune à annoncer.');
    statut.id = 'e024-status';
    statut.setAttribute('role', 'status');
    statut.setAttribute('aria-live', 'polite');
    panneau.appendChild(statut);
    const annoncer = (evenement) => {
      const cible = evenement && evenement.target && typeof evenement.target.closest === 'function'
        ? evenement.target.closest('.const-moon') : null;
      if (!cible || !layout.contains(cible)) return;
      const rang = cible.getAttribute('data-e024-index');
      const info = infos[Number(rang) - 1];
      if (!info) return;
      statut.textContent = `Lune ${rang} sur ${infos.length} : ${info.genre}, confiance ${niveau(info.confiance)}, ${info.sources === null ? 'sources inconnues' : `${info.sources} source(s)`}.`;
    };
    layout.addEventListener('focusin', annoncer);
    layout.addEventListener('click', annoncer);

    /* E024-08 — navigation clavier : Début et Fin rejoignent la première ou la dernière lune. */
    navigation.addEventListener('keydown', (evenement) => {
      if (!lunes.length || !evenement || (evenement.key !== 'Home' && evenement.key !== 'End')) return;
      const cible = evenement.key === 'Home' ? lunes[0] : lunes[lunes.length - 1];
      if (!cible || typeof cible.focus !== 'function') return;
      evenement.preventDefault();
      cible.focus({ preventScroll: true });
      if (typeof cible.scrollIntoView === 'function') cible.scrollIntoView({ block: 'nearest' });
    });

    /* E024-09 — unique feuille de style du greffon, avec repli mouvement réduit. */
    css('constellation-e024', `
      .e024-panel { margin-top: 14px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: rgba(255,255,255,.02); color: var(--ink-soft); font-size: 9px; line-height: 1.55; }
      .e024-heading { margin: 0 0 6px; font-family: var(--serif); font-size: 12px; font-weight: 500; color: var(--gold-bright); }
      .e024-desc { margin: 0 0 8px; max-width: 820px; color: var(--muted); }
      .e024-nav { margin: 0 0 8px; }
      .e024-index { margin: 0; padding-left: 22px; list-style: decimal-leading-zero; }
      .e024-item { display: grid; grid-template-columns: 8ch minmax(0, 1fr) 16ch 14ch; gap: 2px 10px; align-items: baseline; padding: 2px 0; }
      .e024-num { color: var(--gold); font-variant-numeric: tabular-nums; }
      .e024-genre { color: var(--ink); }
      .e024-niveau { color: var(--ink-soft); }
      .e024-src { color: var(--muted-2); }
      .e024-vide { color: var(--muted); font-style: italic; }
      .e024-niveaux { margin: 0 0 8px; padding-left: 18px; list-style: disc; color: var(--ink-soft); }
      .e024-niveau-ligne { padding: 1px 0; }
      .e024-glossaire { display: grid; grid-template-columns: 14ch minmax(0, 1fr); gap: 2px 10px; margin: 0 0 8px; }
      .e024-terme { margin: 0; color: var(--gold); }
      .e024-definition { margin: 0; color: var(--muted); }
      .e024-status { margin: 0 0 6px; color: var(--ink); transition: color .15s ease; }
      .e024-metrics { margin: 0; color: var(--muted); }
      .e024-metrics-valeur { color: var(--gold-bright); font-variant-numeric: tabular-nums; }
      .e024-static .e024-status { transition: none; }
      @media (prefers-reduced-motion: reduce) {
        .e024-status { transition: none !important; }
      }
      @media (max-width: 620px) {
        .e024-item { grid-template-columns: 7ch minmax(0, 1fr); }
        .e024-glossaire { grid-template-columns: 1fr; }
      }
    `);
    if (reduit) panneau.classList.add('e024-static');

    /* E024-10 — bilan chiffré : lunes indexées, sources et confiance maximale calculée. */
    const avecSources = infos.filter((info) => info.sources !== null && info.sources > 0).length;
    const maxConfiance = infos.reduce((meilleur, info) => {
      const n = Number.parseFloat(String(info.confiance).replace(',', '.'));
      return Number.isFinite(n) && n > meilleur ? n : meilleur;
    }, 0);
    const metrics = faire('p', 'e024-metrics');
    metrics.id = 'e024-metrics';
    metrics.appendChild(faire('strong', 'e024-metrics-valeur',
      `${infos.length} lune${infos.length > 1 ? 's' : ''}`));
    metrics.appendChild(doc.createTextNode(
      ` indexée${infos.length > 1 ? 's' : ''} · ${avecSources} avec source locale · confiance maximale ${maxConfiance.toFixed(2)}`
    ));
    panneau.appendChild(metrics);
  } catch (_erreur) {
    return; /* tolérance : un état inattendu ne doit jamais interrompre le rendu */
  }
});
