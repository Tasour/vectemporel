import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

const world = readJson('node_modules/world-countries/countries.json');

const appContext = { window: {} };
vm.createContext(appContext);
vm.runInContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), appContext);
const appData = appContext.window.VECTEMPOREL_DATA;
const appCountries = new Map(appData.countries.map((country) => [country.id, country]));

const ACTIVE = {
  FR: {
    appId: 'france',
    capital: 'Paris',
    audit: '9 périodes, 53 repères. De la Gaule à la Ve République, avec les grandes césures politiques, sociales et culturelles.',
    focus: 'État, religion, révolutions, construction européenne.',
  },
  GB: {
    appId: 'uk',
    capital: 'Londres',
    audit: '6 périodes, 20 repères. Institutions parlementaires, empire, industrialisation, Brexit.',
    focus: 'Constitution, empire, classes sociales, relation à l’Europe.',
  },
  US: {
    appId: 'usa',
    capital: 'Washington',
    audit: '6 périodes, 18 repères. Colonisation, indépendance, guerre civile, droits civiques, puissance mondiale.',
    focus: 'Fédéralisme, esclavage et ségrégation, frontières, interventionnisme.',
  },
  DE: {
    appId: 'germany',
    capital: 'Berlin',
    audit: '6 périodes, 17 repères. Saint-Empire, Réforme, unification, nazisme, division et réunification.',
    focus: 'Fragmentation politique, mémoire de la Shoah, Guerre froide.',
  },
  IT: {
    appId: 'italy',
    capital: 'Rome',
    audit: '5 périodes, 15 repères. Rome, Renaissance, Risorgimento, fascisme, République européenne.',
    focus: 'Ville et nation, papauté, régionalismes, mémoire du fascisme.',
  },
  ES: {
    appId: 'spain',
    capital: 'Madrid',
    audit: '5 périodes, 13 repères. Al-Andalus, empire, guerre civile, franquisme, transition démocratique.',
    focus: 'Coexistence religieuse, colonialisme, mémoire de la guerre civile.',
  },
  CN: {
    appId: 'china',
    capital: 'Pékin',
    audit: '5 périodes, 13 repères. Dynasties, empire, humiliations coloniales, révolution communiste, réforme économique.',
    focus: 'Continuité impériale, inventions, relations avec le monde, périodes maoïste et post-maoïste.',
  },
  IN: {
    appId: 'india',
    capital: 'New Delhi',
    audit: '4 périodes, 12 repères. Civilisation de l’Indus, empires, domination britannique, indépendance et libéralisation.',
    focus: 'Diversité religieuse, partition, non-violence, démocratie et développement.',
  },
  JP: {
    appId: 'japan',
    capital: 'Tokyo',
    audit: '5 périodes, 13 repères. Shoguns, fermeture d’Edo, restauration Meiji, guerre, miracle économique.',
    focus: 'Absorption des influences extérieures, militarisme, mémoire de 1945, Fukushima.',
  },
  EG: {
    appId: 'egypt',
    capital: 'Le Caire',
    audit: '5 périodes, 15 repères. Égypte pharaonique, mondes grec et romain, islam, modernité, révolution de 2011.',
    focus: 'Continuité du Nil, carrefour méditerranéen, panarabisme, transition politique.',
  },
};

const REGION_FR = {
  Africa: 'Afrique',
  Asia: 'Asie',
  Europe: 'Europe',
  'North America': 'Amérique du Nord',
  'South America': 'Amérique du Sud',
  Oceania: 'Océanie',
  Antarctic: 'Antarctique',
};

const SUBREGION_FR = {
  'Australia and New Zealand': 'Australie et Nouvelle-Zélande',
  'Caribbean': 'Caraïbes',
  'Central America': 'Amérique centrale',
  'Central Asia': 'Asie centrale',
  'Eastern Africa': 'Afrique de l’Est',
  'Eastern Asia': 'Asie de l’Est',
  'Eastern Europe': 'Europe de l’Est',
  'Melanesia': 'Mélanésie',
  'Micronesia': 'Micronésie',
  'Middle Africa': 'Afrique centrale',
  'Northern Africa': 'Afrique du Nord',
  'Northern America': 'Amérique du Nord',
  'Northern Europe': 'Europe du Nord',
  'Polynesia': 'Polynésie',
  'South America': 'Amérique du Sud',
  'South-Eastern Asia': 'Asie du Sud-Est',
  'Southern Africa': 'Afrique australe',
  'Southern Asia': 'Asie du Sud',
  'Southern Europe': 'Europe du Sud',
  'Western Africa': 'Afrique de l’Ouest',
  'Western Asia': 'Asie de l’Ouest',
  'Western Europe': 'Europe de l’Ouest',
};

const isCountry = (country) =>
  country.ccn3 &&
  country.cca2 !== 'AQ' &&
  (country.independent || country.unMember || ['VA', 'PS', 'TW', 'XK'].includes(country.cca2));

const countries = world
  .filter(isCountry)
  .map((country) => {
    const code = country.cca2;
    const active = ACTIVE[code];
    const appCountry = active ? appCountries.get(active.appId) : null;
    const name = country.translations?.fra?.common || country.name.common;
    const capital = active?.capital || country.capital?.[0] || '';
    let region = REGION_FR[country.region] || country.region || '';
    if (country.region === 'Americas') {
      if (country.subregion === 'South America') region = 'Amérique du Sud';
      else if (country.subregion === 'Central America') region = 'Amérique centrale';
      else if (country.subregion === 'Caribbean') region = 'Caraïbes';
      else region = 'Amérique du Nord';
    }
    return {
      code,
      code3: country.ccn3,
      appId: active?.appId || null,
      name,
      officialName: country.translations?.fra?.official || country.name.official,
      flag: country.flag,
      region,
      subregion: SUBREGION_FR[country.subregion] || country.subregion || '',
      capital,
      lat: country.latlng?.[0] ?? 0,
      lng: country.latlng?.[1] ?? 0,
      available: Boolean(active),
      domain: appCountry ? [appCountry.domain[0], appCountry.domain[1]] : null,
      periods: appCountry ? appCountry.eras.length : 0,
      events: appCountry ? appCountry.events.length : 0,
      audit: active
        ? {
            status: 'published',
            summary: active.audit,
            focus: active.focus,
            href: `COUNTRY_AUDITS.md#${active.appId}`,
          }
        : {
            status: 'queued',
            summary: 'Audit expert à réaliser : périodisation, sources, repères et points de vigilance.',
            focus: '',
            href: '',
          },
    };
  })
  .sort((a, b) => {
    const region = a.region.localeCompare(b.region, 'fr');
    return region || a.name.localeCompare(b.name, 'fr');
  });

const atlas = {
  generatedAt: new Date().toISOString(),
  counts: {
    total: countries.length,
    available: countries.filter((country) => country.available).length,
    queued: countries.filter((country) => !country.available).length,
  },
  countries,
};
fs.writeFileSync(
  path.join(root, 'countries.js'),
  `/* Généré par scripts/build-atlas.mjs — ne pas éditer à la main. */\nwindow.VECTEMPOREL_ATLAS = ${JSON.stringify(atlas, null, 2)};\n`
);

const rows = countries
  .map(
    (country) =>
      `| ${country.flag} ${country.name} | ${country.code} | ${country.region} | ${country.capital || '—'} | ${
        country.available ? '✅ disponible' : 'à auditer'
      } |`
  )
  .join('\n');

const md = `# Atlas des pays

Liste générée des pays référencés par Vectemporel.

**Périmètre.** États membres de l’ONU, observateurs (Vatican, Palestine), plus Taïwan et le Kosovo. Les territoires dépendants ne sont pas comptés comme des pays.

- **${atlas.counts.total} pays** dans l’atlas.
- **${atlas.counts.available} pays disponibles** avec une frise et un audit.
- **${atlas.counts.queued} pays à auditer** avant publication.

Les pays sont classés par région, puis par nom. La colonne « Audit » indique si la frise est disponible dans l’application. Les audits détaillés des 10 pays pilotes sont dans [COUNTRY_AUDITS.md](COUNTRY_AUDITS.md).

| Pays | Code | Région | Capitale | Audit |
| --- | --- | --- | --- | --- |
${rows}
`;
fs.writeFileSync(path.join(root, 'COUNTRIES.md'), md);

console.log(
  `Atlas généré : ${atlas.counts.total} pays, ${atlas.counts.available} disponibles, ${atlas.counts.queued} à auditer.`
);
