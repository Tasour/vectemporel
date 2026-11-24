#!/usr/bin/env node
/* Vérifie les articles extraits et reconstruit MANIFEST.json sans réseau. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'public/articles');
const MANIFEST = path.join(DIR, 'MANIFEST.json');
const MAX_IMAGE = 25 * 1024;

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(', ')}]`;
  if (isPlainObject(value)) {
    const entries = Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}: ${stable(item)}`);
    return `{${entries.join(', ')}}`;
  }
  return JSON.stringify(value);
}

function digest(article) {
  const { sha256: _ignored, ...payload } = article;
  return crypto.createHash('sha256').update(stable(payload)).digest('hex');
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

const previous = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
const files = fs
  .readdirSync(DIR)
  .filter(
    (file) =>
      file.endsWith('.json') &&
      !['MANIFEST.json', 'FAILURES.json', 'VERIFY-FAILURES.json', 'catalog.json'].includes(file),
  )
  .sort();

const articles = [];
const errors = [];
for (const file of files) {
  const id = file.slice(0, -5);
  try {
    const article = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
    if (!isPlainObject(article) || article.schema !== 2 || typeof article.extract !== 'string') {
      throw new Error('schéma invalide');
    }
    if (digest(article) !== article.sha256) throw new Error('SHA-256 invalide');
    if (article.image) {
      const bytes = Buffer.from(article.image, 'base64');
      if (bytes.length > MAX_IMAGE) throw new Error('image trop volumineuse');
      if (!article.imageCredit?.license || !article.imageCredit?.artist) {
        throw new Error('crédit image incomplet');
      }
    }
    articles.push({
      id,
      title: article.title,
      label: article.label,
      description: article.description,
      type: article.type,
      typeLabel: article.typeLabel,
      continents: article.continents,
      epochs: article.epochs,
      itemCount: article.itemCount,
      hasImage: Boolean(article.image),
      sha256: article.sha256,
    });
  } catch (error) {
    errors.push({ id, error: error instanceof Error ? error.message : 'erreur inconnue' });
  }
}

const manifest = {
  date: typeof previous.date === 'string' ? previous.date : '2026-11-25',
  source: 'Wikipédia FR REST summary + Wikimedia Commons',
  count: articles.length,
  articles,
};
const temporary = `${MANIFEST}.tmp`;
fs.writeFileSync(temporary, JSON.stringify(manifest, null, 2) + '\n');
fs.renameSync(temporary, MANIFEST);
if (errors.length) {
  fs.writeFileSync(path.join(DIR, 'VERIFY-FAILURES.json'), JSON.stringify(errors, null, 2) + '\n');
}
console.log(
  `manifeste : ${articles.length} article(s) vérifié(s), ${errors.length} erreur(s), images ${
    articles.filter((article) => article.hasImage).length
  }`,
);
if (errors.length) process.exitCode = 1;
