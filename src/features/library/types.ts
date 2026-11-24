/** Types partagés du catalogue local et des articles téléchargés. */

export interface CatalogContinent {
  id: string;
  label: string;
}

export interface CatalogEpoch {
  id: string;
  label: string;
  from: number;
  to: number;
}

export interface CatalogGroup {
  id: string;
  type: 'ruler' | 'culture' | 'religion';
  typeLabel: string;
  code: string;
  title: string;
  wiki: string;
  image: string;
  continents: string[];
  epochs: string[];
  from: number;
  to: number;
  itemCount: number;
  items: string[];
}

export interface Catalog {
  meta: {
    source: string;
    version: string;
    count: number;
    sha256: string;
  };
  continents: CatalogContinent[];
  epochs: CatalogEpoch[];
  groups: CatalogGroup[];
}

export interface ArticleImageCredit {
  filename: string;
  artist: string;
  license: string;
  licenseUrl: string;
  credit: string;
  page: string;
}

export interface Article {
  schema: number;
  id: string;
  title: string;
  label: string;
  description: string;
  extract: string;
  type: CatalogGroup['type'];
  typeLabel: string;
  continents: string[];
  epochs: string[];
  from: number;
  to: number;
  itemCount: number;
  items: string[];
  source: string;
  articleLicense: string;
  image: string | null;
  imageCredit: ArticleImageCredit | null;
  revision: string;
  sha256: string;
}

export interface ManifestArticle {
  id: string;
  title: string;
  label: string;
  description: string;
  type: CatalogGroup['type'];
  typeLabel: string;
  continents: string[];
  epochs: string[];
  itemCount: number;
  hasImage: boolean;
  sha256: string;
}

export interface ArticleManifest {
  date: string;
  source: string;
  count: number;
  articles: ManifestArticle[];
}

export interface CollectionEntry {
  key: string;
  kind: 'article' | 'province';
  id: string;
  title: string;
  subtitle: string;
  continent: string;
  epoch: string;
  addedAt: string;
}

export type DownloadKey = `g:${string}` | `i:${string}:${string}`;
