import { installDiagnostics } from '../_diagnostics.js';

/* Registre des 100 lentilles d'amélioration de cette vue. Un greffon par
   module E01..E100, appliqué à chaque rendu ; une lentille défaillante est
   neutralisée sans interrompre le rendu. */
const entries = [];
const diagnostics = [];
let controller = null;

export function register(id, apply) {
  if (typeof id === 'string' && typeof apply === 'function') entries.push({ id, apply });
}

export function cssOnce(uniqueId, rules) {
  if (!uniqueId || document.getElementById(uniqueId)) return;
  const style = document.createElement('style');
  style.id = uniqueId;
  style.textContent = rules;
  document.head.appendChild(style);
}

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function runEnhancements(ctx) {
  if (controller) controller.abort();
  controller = new AbortController();
  const signal = controller.signal;
  const onLeave = (callback) => {
    if (typeof callback !== "function") return;
    signal.addEventListener("abort", () => {
      try { callback(); } catch (error) { console.warn("[lentilles] onLeave :", error); }
    }, { once: true });
  };
  diagnostics.length = 0;
  const api = {
    ...ctx,
    css: cssOnce,
    el,
    signal,
    onLeave,
    reducedMotion: () => {
      try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
      catch { return false; }
    },
  };
  installDiagnostics(ctx);
  entries.forEach(({ id, apply }) => {
    try { apply(api); }
    catch (error) { diagnostics.push({ id, message: String(error?.message || error) }); }
  });
  return { applied: entries.length, diagnostics: [...diagnostics] };
}

export function viewDiagnostics() {
  return { entries: entries.map((e) => e.id), diagnostics: [...diagnostics] };
}

if (typeof window !== "undefined") {
  window.__VATLAS_LENS_DIAGNOSTICS = window.__VATLAS_LENS_DIAGNOSTICS || [];
  window.__VATLAS_LENS_DIAGNOSTICS.push(viewDiagnostics);
}
