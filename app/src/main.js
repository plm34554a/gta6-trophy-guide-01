// Leonida Legend — entry point. Loads the trophy data (a file beside this
// app, never the network), wires the toolbar, tabs, tracker and roadmap.

import { createStore, exportFileText, parseImportText } from './store.js';
import {
  KIND_FILTERS,
  EMPTY_MESSAGES,
  aboutContent,
  filterTrophies,
  roadmapStage,
  trophyCard,
} from './render.js';

const store = createStore();
const expanded = new Set();
let doc = null;

const $ = (id) => document.getElementById(id);
const listEl = $('trophy-list');
const emptyEl = $('empty-state');

const filters = {
  search: '',
  kind: 'all',
  grade: 'all',
  status: 'all',
  sort: 'official',
  store,
};

function renderProgress() {
  const total = doc.trophies.length;
  const done = store.earnedCount();
  $('ring-count').textContent = String(done);
  const circumference = 326.7;
  $('ring-fg').style.strokeDashoffset = String(circumference * (1 - done / total));
  const counts = $('grade-counts');
  counts.replaceChildren();
  for (const grade of ['platinum', 'gold', 'silver', 'bronze']) {
    const all = doc.trophies.filter((t) => t.grade === grade);
    const got = all.filter((t) => store.isEarned(t.name)).length;
    const row = document.createElement('div');
    row.className = 'gc';
    const label = document.createElement('span');
    label.textContent = grade[0].toUpperCase() + grade.slice(1);
    const value = document.createElement('strong');
    value.textContent = `${got} / ${all.length}`;
    row.append(label, value);
    counts.append(row);
  }
  $('hero-note').textContent =
    done === total
      ? 'All 55 earned — Vice Got a Price! Welcome to legend status.'
      : `${total - done} to go. Progress saves in this browser automatically.`;
}

function renderList() {
  const visible = filterTrophies(doc.trophies, filters);
  listEl.replaceChildren();
  for (const t of visible) {
    listEl.append(trophyCard(t, store, expanded.has(t.name), (name) => {
      if (expanded.has(name)) expanded.delete(name);
      else expanded.add(name);
      renderList();
    }));
  }
  $('result-count').textContent = `Showing ${visible.length} of ${doc.trophies.length} trophies`;
  if (visible.length === 0) {
    emptyEl.hidden = false;
    emptyEl.textContent =
      filters.kind === 'online'
        ? EMPTY_MESSAGES.online
        : filters.kind === 'missable'
          ? EMPTY_MESSAGES.missable
          : EMPTY_MESSAGES.default;
  } else {
    emptyEl.hidden = true;
  }
}

function renderRoadmap() {
  const wrap = $('roadmap-list');
  wrap.replaceChildren();
  for (const stage of doc.roadmap) {
    wrap.append(roadmapStage(stage, doc.trophies, store, jumpToTrophy));
  }
}

function renderAll() {
  renderProgress();
  renderList();
  renderRoadmap();
}

function jumpToTrophy(name) {
  switchView('checklist');
  filters.kind = 'all';
  filters.grade = 'all';
  filters.status = 'all';
  filters.search = '';
  $('search').value = '';
  $('grade-filter').value = 'all';
  $('status-filter').value = 'all';
  syncChips();
  expanded.add(name);
  renderList();
  const card = listEl.querySelector(`[data-name="${CSS.escape(name)}"]`);
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function switchView(name) {
  for (const tab of document.querySelectorAll('.tab')) {
    tab.classList.toggle('is-active', tab.dataset.view === name);
  }
  for (const view of document.querySelectorAll('.view')) {
    view.classList.toggle('is-active', view.id === `view-${name}`);
  }
}

function syncChips() {
  for (const chip of document.querySelectorAll('#kind-chips .chip')) {
    chip.classList.toggle('is-active', chip.dataset.kind === filters.kind);
  }
}

function buildChips() {
  const wrap = $('kind-chips');
  for (const f of KIND_FILTERS) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (f.key === 'missable' ? ' chip-missable' : '');
    chip.dataset.kind = f.key;
    chip.textContent = f.label;
    chip.addEventListener('click', () => {
      filters.kind = f.key;
      syncChips();
      renderList();
    });
    wrap.append(chip);
  }
  syncChips();
}

function downloadProgress() {
  const blob = new Blob([exportFileText(store)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'leonida-legend-progress.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function importProgress(file) {
  const names = parseImportText(await file.text(), doc.trophies.map((t) => t.name));
  store.replaceEarned(names);
}

async function boot() {
  const res = await fetch('data/trophies.json');
  doc = await res.json();

  buildChips();
  $('about-body').append(aboutContent(doc));

  $('search').addEventListener('input', (e) => {
    filters.search = e.target.value;
    renderList();
  });
  $('grade-filter').addEventListener('change', (e) => {
    filters.grade = e.target.value;
    renderList();
  });
  $('status-filter').addEventListener('change', (e) => {
    filters.status = e.target.value;
    renderList();
  });
  $('sort-order').addEventListener('change', (e) => {
    filters.sort = e.target.value;
    renderList();
  });
  const spoilerToggle = $('spoiler-toggle');
  spoilerToggle.checked = store.spoilersHidden();
  spoilerToggle.addEventListener('change', () => store.setSpoilersHidden(spoilerToggle.checked));

  $('export-btn').addEventListener('click', downloadProgress);
  $('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await importProgress(file);
    } catch {
      $('hero-note').textContent = 'That import file could not be read — nothing was changed.';
    }
    e.target.value = '';
  });
  $('reset-btn').addEventListener('click', () => store.reset());
  $('alert-jump').addEventListener('click', () => jumpToTrophy('Positive Mental Attitude'));

  for (const tab of document.querySelectorAll('.tab')) {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  }

  store.subscribe(renderAll);
  renderAll();
}

boot();
