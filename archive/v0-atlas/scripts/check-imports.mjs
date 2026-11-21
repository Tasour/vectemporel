#!/usr/bin/env node
/* V3-07 — modules JS non atteignables depuis src/app.js (imports statiques et dynamiques). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SRC = path.join(ROOT, 'src');
const entry = path.join(SRC, 'app.js');
const seen = new Set();
const importPatterns = [
  /import[^;'"]*from\s*['"]([^'"]+\.js)['"]/g,
  /import\s*['"]([^'"]+\.js)['"]/g,
  /import\(\s*['"]([^'"]+\.js)['"]\s*\)/g,
];

function resolve(from, specifier) {
  if (!specifier.startsWith('.')) return null;
  return path.resolve(path.dirname(from), specifier);
}

function walk(file) {
  if (seen.has(file) || !fs.existsSync(file)) return;
  seen.add(file);
  const text = fs.readFileSync(file, 'utf8');
  const patterns = importPatterns.map((pattern) => new RegExp(pattern.source, pattern.flags));
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const target = resolve(file, match[1]);
      if (target) walk(target);
    }
  }
}

walk(entry);

const all = [];
function collect(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) collect(full);
    else if (item.name.endsWith('.js')) all.push(full);
  }
}
collect(SRC);
const orphans = all.filter((file) => !seen.has(file)).map((file) => path.relative(ROOT, file)).sort();
console.log(`${seen.size} modules atteignables, ${orphans.length} orphelins`);
for (const file of orphans.slice(0, 20)) console.log(`- ${file}`);
if (orphans.length > 20) console.log(`… et ${orphans.length - 20} autres`);
process.exitCode = orphans.length ? 1 : 0;
