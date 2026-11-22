/* JSON canonique + SHA-256, partagés par le build des récits et ses tests. */
import crypto from 'node:crypto';

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256Hex(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}
