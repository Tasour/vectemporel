/* Panneau Apprendre : cinq défis locaux, branchés sur le SRS existant.
 * Aucune donnée réseau, aucune horloge autre que Date.now() réel pour le SRS. */
import { loadSrs, saveSrs, reviewCard, srsSummary } from './srs.js';
import {
  localGoals, silentQuestion, srsHeatmap, trailFillQuestion, yearQuiz,
} from './challenges.js';

const SECTIONS = [
  { id: 'quiz', label: 'Année' },
  { id: 'silent', label: 'Carte muette' },
  { id: 'progress', label: 'Progression' },
  { id: 'goals', label: 'Objectifs' },
  { id: 'fill', label: 'À trous' },
];

export function createLearnPanel(host, api = {}) {
  let srs = loadSrs();
  let section = 'quiz';
  let quiz = yearQuiz();
  let quizIndex = 0;
  let answered = false;
  let fill = null;

  host.replaceChildren();
  const close = document.createElement('button');
  close.className = 'hm-close';
  close.id = 'learn-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Fermer Apprendre');
  close.textContent = '✕';
  const title = document.createElement('h2');
  title.textContent = 'Apprendre — défis locaux';
  const tabs = document.createElement('div');
  tabs.className = 'learn-tabs';
  tabs.setAttribute('role', 'tablist');
  for (const item of SECTIONS) {
    const button = document.createElement('button');
    button.className = 'learn-tab';
    button.type = 'button';
    button.dataset.section = item.id;
    button.setAttribute('role', 'tab');
    button.textContent = item.label;
    button.addEventListener('click', () => { section = item.id; render(); });
    tabs.appendChild(button);
  }
  const content = document.createElement('div');
  content.id = 'learn-content';
  content.setAttribute('role', 'tabpanel');
  host.append(close, title, tabs, content);

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (label, id, handler) => {
    const node = el('button', 'learn-option', label);
    node.type = 'button';
    if (id) node.id = id;
    node.addEventListener('click', handler);
    return node;
  };

  function record(id, correct) {
    reviewCard(srs, id, correct);
    saveSrs(srs);
  }

  function renderQuiz() {
    const question = quiz[quizIndex % quiz.length];
    answered = false;
    content.replaceChildren(
      el('p', 'learn-prompt', question.prompt),
      el('p', 'learn-meta', `Graine 20261121 · ${quiz.length} questions`),
    );
    const options = el('div', 'learn-options');
    for (const option of question.options) {
      options.appendChild(button(String(option), null, (event) => {
        if (answered) return;
        answered = true;
        const correct = Number(option) === question.answer;
        record(question.id, correct);
        event.currentTarget.classList.add(correct ? 'correct' : 'wrong');
        const feedback = el('p', 'learn-feedback',
          `${correct ? 'Bravo' : 'Pas tout à fait'} — réponse : ${question.answer}. ${question.source}`);
        feedback.id = 'learn-feedback';
        feedback.setAttribute('role', 'status');
        content.appendChild(feedback);
        api.readout?.(`Quiz année : ${correct ? 'correct' : 'à revoir'} · ${question.answer}.`);
      }));
    }
    content.appendChild(options);
    const next = button('Question suivante →', 'learn-next', () => { quizIndex += 1; render(); });
    next.className = 'learn-next';
    content.appendChild(next);
  }

  function renderSilent() {
    const state = api.getState?.() || {};
    const name = state.selected;
    const facts = name ? api.getFacts?.(name) : null;
    const question = silentQuestion(name, facts, state.year);
    content.replaceChildren();
    if (!question) {
      content.appendChild(el('p', 'learn-meta', 'Sélectionnez d’abord une région sur le globe.'));
      return;
    }
    content.append(el('p', 'learn-prompt', question.prompt), el('p', 'learn-meta', question.source));
    const reveal = button('Révéler le nom', 'learn-reveal', () => {
      const node = el('p', 'learn-feedback', `Réponse : ${question.answer}. ${question.source}`);
      node.id = 'learn-feedback';
      node.setAttribute('role', 'status');
      content.appendChild(node);
      api.readout?.(`Carte muette : ${question.answer}.`);
    });
    content.appendChild(reveal);
  }

  function renderProgress() {
    const summary = srsSummary(srs);
    const cells = srsHeatmap(srs);
    content.replaceChildren(
      el('p', 'learn-prompt', `${summary.cards} cartes · ${summary.reviews} révisions · ${summary.correct} bonnes réponses · série ${summary.streak}`),
      el('p', 'learn-meta', `Boîtes Leitner : ${summary.mastered} maîtrisées, ${summary.due} dues`),
    );
    const grid = el('div', 'learn-heatmap');
    grid.id = 'learn-heatmap';
    for (const day of cells) {
      const node = el('span', 'learn-day');
      node.style.opacity = String(0.2 + Math.min(1, day.count) * 0.8);
      node.title = `${new Date(day.day).toISOString().slice(0, 10)} : ${day.count} révision(s)`;
      grid.appendChild(node);
    }
    content.appendChild(grid);
  }

  function renderGoals() {
    const summary = srsSummary(srs);
    const progress = api.getProgress?.() || {};
    const goals = localGoals({
      reviews: summary.reviews,
      trails: progress.trails || 0,
      centuries: progress.centuries || 0,
    });
    content.replaceChildren(el('p', 'learn-meta', 'Objectifs stockés localement, sans classement ni réseau.'));
    const list = el('div', 'learn-goals');
    list.id = 'learn-goals';
    for (const goal of goals) {
      const row = el('div', `learn-goal${goal.done ? ' done' : ''}`);
      row.append(
        el('strong', '', goal.label),
        el('span', '', `${Math.min(goal.value, goal.target)} / ${goal.target}`),
      );
      list.appendChild(row);
    }
    content.appendChild(list);
  }

  function renderFill() {
    const state = api.getState?.() || {};
    const id = state.trail?.id || 'soie';
    const index = state.trail?.active ? state.trail.index : 0;
    fill = trailFillQuestion(id, index);
    content.replaceChildren(
      el('p', 'learn-prompt', fill.prompt),
      el('p', 'learn-meta', `${fill.evidence} · ${fill.source}`),
    );
    const options = el('div', 'learn-options');
    for (const option of fill.options) {
      options.appendChild(button(option, null, (event) => {
        const correct = option === fill.answer;
        record(fill.id, correct);
        event.currentTarget.classList.add(correct ? 'correct' : 'wrong');
        const feedback = el('p', 'learn-feedback',
          `${correct ? 'Bravo' : 'Pas tout à fait'} — ${fill.answer}. ${fill.evidence}`);
        feedback.id = 'learn-feedback';
        feedback.setAttribute('role', 'status');
        content.appendChild(feedback);
        api.readout?.(`Récit à trous : ${fill.answer}.`);
      }));
    }
    content.appendChild(options);
    const open = button('Ouvrir l’étape', 'learn-open-step', () => {
      api.applyYear?.(fill.year);
      api.startTrail?.(fill.trailId, fill.stepIndex);
      api.closeLearn?.();
    });
    open.className = 'learn-next';
    content.appendChild(open);
  }

  function render() {
    for (const tab of tabs.children) {
      const active = tab.dataset.section === section;
      tab.setAttribute('aria-selected', String(active));
      tab.classList.toggle('active', active);
    }
    if (section === 'quiz') renderQuiz();
    else if (section === 'silent') renderSilent();
    else if (section === 'progress') renderProgress();
    else if (section === 'goals') renderGoals();
    else renderFill();
  }

  close.addEventListener('click', () => api.closeLearn?.());
  render();
  return {
    open() { host.hidden = false; render(); },
    close() { host.hidden = true; },
    isOpen: () => !host.hidden,
    render,
    srs: () => srsSummary(srs),
  };
}
