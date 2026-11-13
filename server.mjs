import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import sanitizeHtml from 'sanitize-html';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const GROK = 'https://grokipedia.com';
const CACHE_TTL = 1000 * 60 * 60 * 6;
const articleCache = new Map();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.md': 'text/markdown; charset=utf-8',
};

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function normalizeSlug(value) {
  if (typeof value !== 'string') return '';
  let slug = value.trim();
  if (!slug) return '';
  try {
    slug = decodeURIComponent(slug);
  } catch {
    // Keep the raw value if it is not valid percent-encoding.
  }
  if (slug.length > 160 || /[/\\\u0000-\u001f]/.test(slug)) return '';
  return slug;
}

function grokUrl(slug) {
  return `${GROK}/page/${encodeURIComponent(slug).replace(/%2F/gi, '/')}`;
}

function searchUrl(query) {
  return `${GROK}/search?q=${encodeURIComponent(query)}`;
}

async function fetchGrok(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(18000),
    headers: {
      'user-agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'en-US,en;q=0.8',
    },
  });
  return response;
}

function cleanArticleHtml($, body) {
  body.find('button, svg, script, style, form, noscript, iframe, audio, video').remove();
  body.find('sup').remove();
  body.find('.references, section.references').remove();

  // Grokipedia stores paragraphs as spans with data-tts-block.
  body.find('span[data-tts-block]').each((_, el) => {
    const $el = $(el);
    const paragraph = $('<p></p>');
    paragraph.html($el.html() || '');
    $el.replaceWith(paragraph);
  });

  // Any remaining block spans (captions, callouts) become paragraphs too.
  body.find('span').each((_, el) => {
    const $el = $(el);
    if (!$el.text().trim() && !$el.find('em,strong').length) {
      $el.remove();
      return;
    }
    if (!$el.parents('p').length) {
      const paragraph = $('<p></p>');
      paragraph.html($el.html() || '');
      $el.replaceWith(paragraph);
    }
  });

  body.find('h2, h3, h4').each((_, el) => {
    const $el = $(el);
    $el.find('button, svg').remove();
    $el.text($el.text().trim());
  });

  body.find('*').each((_, el) => {
    const $el = $(el);
    for (const name of Object.keys(el.attribs || {})) {
      if (/^on/i.test(name) || name === 'style' || name === 'class' || name === 'data-tts-block') {
        $el.removeAttr(name);
      }
    }
  });

  return body.html() || '';
}

function sanitizeArticle(html) {
  return sanitizeHtml(html, {
    allowedTags: [
      'h2', 'h3', 'h4', 'p', 'em', 'strong', 'i', 'b', 'a', 'ul', 'ol', 'li',
      'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'figure',
      'figcaption', 'img', 'br', 'sup', 'sub', 'hr',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'loading'],
      '*': ['id'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        let href = attribs.href || '';
        if (href.startsWith('/page/')) href = `${GROK}${href}`;
        const internal = href.startsWith(`${GROK}/page/`);
        return {
          tagName: 'a',
          attribs: {
            href,
            ...(attribs.title ? { title: attribs.title } : {}),
            ...(internal ? {} : { target: '_blank', rel: 'noopener noreferrer' }),
          },
        };
      },
      img: (tagName, attribs) => {
        let src = attribs.src || '';
        if (src && !/^https?:\/\//i.test(src)) {
          try {
            src = new URL(src, GROK).href;
          } catch {
            src = '';
          }
        }
        return {
          tagName: 'img',
          attribs: {
            ...(src ? { src } : {}),
            alt: attribs.alt || '',
            loading: 'lazy',
          },
        };
      },
    },
  });
}

function parseArticle(html, slug) {
  const $ = cheerio.load(html);
  const pageTitle = $('title').first().text().trim();
  if (/article not found/i.test(pageTitle)) return null;

  const title =
    $('article h1').first().text().trim() ||
    $('meta[property="og:title"]').attr('content') ||
    pageTitle.replace(/\s*—\s*Grokipedia\s*$/i, '').trim() ||
    slug.replaceAll('_', ' ');

  const description = $('meta[name="description"]').attr('content')?.trim() || '';
  const body = $('article .article-body').first();
  if (!body.length) return null;

  const htmlBody = sanitizeArticle(cleanArticleHtml($, body));
  if (!htmlBody || htmlBody.replace(/<[^>]+>/g, '').trim().length < 40) return null;

  return {
    title,
    description,
    html: htmlBody,
    url: grokUrl(slug),
    slug,
    language: 'en',
    fetchedAt: new Date().toISOString(),
  };
}


/* -------------------------------------------------------------------------- */
/* Traduction française                                                       */
/* -------------------------------------------------------------------------- */

const TRANSLATE_URL = 'https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=fr';
const TRANSLATE_BATCH_CHARS = 12000;
const TRANSLATE_BATCH_ITEMS = 24;
const TRANSLATE_CONCURRENCY = 2;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchTranslationBatch(texts) {
  const body = new URLSearchParams();
  for (const text of texts) body.append('q', text);

  const response = await fetch(TRANSLATE_URL, {
    method: 'POST',
    signal: AbortSignal.timeout(32000),
    headers: {
      'user-agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    },
    body,
  });

  if (!response.ok) throw new Error(`Traduction : réponse ${response.status}`);
  const payload = await response.json();
  const values = Array.isArray(payload) ? payload : [payload];
  if (values.length !== texts.length) {
    throw new Error(`Traduction : ${values.length} résultat(s) pour ${texts.length} bloc(s)`);
  }
  return values.map((value, index) => (typeof value === 'string' ? value : texts[index]));
}

async function translateBatchSafely(texts, attempt = 0) {
  try {
    return await fetchTranslationBatch(texts);
  } catch (error) {
    if (attempt < 1) {
      await delay(700);
      return translateBatchSafely(texts, attempt + 1);
    }
    if (texts.length > 1) {
      const middle = Math.ceil(texts.length / 2);
      const [left, right] = await Promise.all([
        translateBatchSafely(texts.slice(0, middle), 0),
        translateBatchSafely(texts.slice(middle), 0),
      ]);
      return [...left, ...right];
    }
    throw error;
  }
}

function makeTranslationBatches(entries) {
  const batches = [];
  let current = [];
  let weight = 0;

  for (const entry of entries) {
    const entryWeight = entry.text.length + 120;
    if (current.length && (current.length >= TRANSLATE_BATCH_ITEMS || weight + entryWeight > TRANSLATE_BATCH_CHARS)) {
      batches.push(current);
      current = [];
      weight = 0;
    }
    current.push(entry);
    weight += entryWeight;
  }
  if (current.length) batches.push(current);
  return batches;
}

async function translateTextEntries(entries) {
  const results = new Array(entries.length);
  const batches = makeTranslationBatches(entries);
  let cursor = 0;

  async function worker() {
    while (cursor < batches.length) {
      const batch = batches[cursor++];
      const translated = await translateBatchSafely(batch.map((entry) => entry.text));
      translated.forEach((text, index) => {
        results[batch[index].index] = text;
      });
    }
  }

  await Promise.all(Array.from({ length: Math.min(TRANSLATE_CONCURRENCY, batches.length) }, worker));
  return results;
}

async function translateArticleToFrench(article) {
  const $ = cheerio.load(`<div id="__vectemporel_article">${article.html}</div>`);
  const root = $('#__vectemporel_article');
  const nodes = root.find('p, h2, h3, h4, li, figcaption, th, td').toArray();
  const entries = [];

  for (const node of nodes) {
    const $node = $(node);
    if ($node.find('p, li').length) continue;
    const inner = ($node.html() || '').trim();
    if (!inner || $node.text().replace(/\s+/g, '').length < 2) continue;
    entries.push({ node, text: inner });
  }

  const texts = [article.title, ...entries.map((entry) => entry.text)];
  const translated = await translateTextEntries(
    texts.map((text, index) => ({ text, index }))
  );

  const translatedTitle = translated[0] || article.title;
  entries.forEach((entry, index) => {
    const value = translated[index + 1];
    if (typeof value === 'string' && value.trim()) {
      $(entry.node).html(value);
    }
  });

  let translatedHtml = sanitizeArticle(root.html() || '');
  if (!translatedHtml || translatedHtml.replace(/<[^>]+>/g, '').trim().length < 20) {
    throw new Error('La traduction obtenue est vide.');
  }

  // Le moteur rend souvent « 52 avant JC » ou « 52 av. JC ». On harmonise avec
  // l’affichage de la frise (av. J.-C. / apr. J.-C.).
  translatedHtml = translatedHtml
    .replace(
      /(\d{1,4}(?:\s*[–-]\s*\d{1,4})?)\s*(?:avant\s+(?:J\.?\s*C\.?|Jésus[- ]Christ)|av\.?\s*J\.?\s*C\.?)/gi,
      '$1 av. J.-C.'
    )
    .replace(
      /(\d{1,4})\s*(?:après\s+(?:J\.?\s*C\.?|Jésus[- ]Christ)|ap\.?\s*J\.?\s*C\.?)/gi,
      '$1 apr. J.-C.'
    )
    .replace(/\bavant\s+JC\b/gi, 'av. J.-C.')
    .replace(/\baprès\s+JC\b/gi, 'apr. J.-C.')
    .replace(/\bEtats généraux\b/g, 'États généraux')
    .replace(/\bEtats-Unis\b/g, 'États-Unis');

  return {
    ...article,
    title: translatedTitle,
    titleOriginal: article.title,
    html: translatedHtml,
    language: 'fr',
    sourceLanguage: 'en',
    translated: true,
    translationProvider: 'Google Translate',
    translationNotice: 'Traduction automatique depuis l’anglais.',
  };
}

async function getArticle(slug, refresh = false) {
  const cached = articleCache.get(slug);
  if (!refresh && cached && Date.now() - cached.at < CACHE_TTL) {
    return cached.data;
  }

  const response = await fetchGrok(grokUrl(slug));
  if (response.status === 404) {
    const data = { notFound: true, slug, url: grokUrl(slug) };
    articleCache.set(slug, { at: Date.now(), data });
    return data;
  }
  if (!response.ok) {
    throw new Error(`Grokipedia a répondu ${response.status}`);
  }

  const html = await response.text();
  const article = parseArticle(html, slug);
  let data = article || { notFound: true, slug, url: grokUrl(slug) };

  if (article) {
    const translationStarted = Date.now();
    try {
      data = await translateArticleToFrench(article);
      console.log(`[vectemporel] ${slug} traduit en ${Date.now() - translationStarted} ms`);
      articleCache.set(slug, { at: Date.now(), data });
    } catch (error) {
      console.error(`[vectemporel] traduction impossible pour ${slug}:`, error.message);
      data = {
        ...article,
        translated: false,
        translationError: error.message,
      };
      // Ne pas mettre en cache un article non traduit : la prochaine ouverture
      // retentera la traduction.
    }
    return data;
  }

  articleCache.set(slug, { at: Date.now(), data });
  return data;
}

async function searchGrok(query) {
  const q = String(query || '').trim().slice(0, 160);
  if (!q) return [];
  const response = await fetchGrok(searchUrl(q));
  if (!response.ok) throw new Error(`Recherche Grokipedia : ${response.status}`);
  const html = await response.text();
  const $ = cheerio.load(html);
  const seen = new Set();
  const results = [];
  $('a[href^="/page/"]').each((_, el) => {
    if (results.length >= 6) return false;
    const href = $(el).attr('href') || '';
    let slug = '';
    try {
      slug = decodeURIComponent(href.slice('/page/'.length));
    } catch {
      return;
    }
    if (!slug || seen.has(slug) || slug === 'Grokipedia') return;
    const heading = $(el).find('h3').first().text().replace(/\s+/g, ' ').trim();
    const text = heading || $(el).text().replace(/\s+/g, ' ').trim();
    if (!text || text.length > 120) return;
    seen.add(slug);
    results.push({ slug, title: text, url: `${GROK}${href}` });
  });
  return results;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  try {
    if (url.pathname === '/api/grokipedia') {
      const slug = normalizeSlug(url.searchParams.get('slug') || '');
      const query = url.searchParams.get('q') || '';
      if (!slug) return json(res, 400, { error: 'Slug manquant ou invalide.' });

      const article = await getArticle(slug, url.searchParams.get('refresh') === '1');
      if (article.notFound) {
        let candidates = [];
        try {
          candidates = await searchGrok(query || slug.replaceAll('_', ' '));
        } catch {
          // Search is a best-effort fallback.
        }
        return json(res, 404, {
          error: 'not_found',
          slug,
          searchUrl: searchUrl(query || slug.replaceAll('_', ' ')),
          candidates,
        });
      }
      return json(res, 200, article);
    }

    if (url.pathname === '/api/grokipedia/search') {
      const query = url.searchParams.get('q') || '';
      if (!query.trim()) return json(res, 400, { error: 'Requête manquante.' });
      const results = await searchGrok(query);
      return json(res, 200, { query, results, searchUrl: searchUrl(query) });
    }

    if (url.pathname === '/api/health') {
      return json(res, 200, { ok: true, articleCache: articleCache.size });
    }

    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const filePath = path.resolve(ROOT, `.${pathname}`);
    if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${path.sep}`)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    const info = await stat(filePath).catch(() => null);
    if (!info || !info.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }

    const body = await readFile(filePath);
    res.writeHead(200, {
      'content-type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    res.end(body);
  } catch (error) {
    console.error('[vectemporel]', error);
    if (url.pathname.startsWith('/api/')) {
      return json(res, 502, {
        error: 'service_unavailable',
        message: 'Grokipedia est momentanément inaccessible.',
      });
    }
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Internal server error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Vectemporel — POC Histoire\n  http://localhost:${PORT}\n`);
});
