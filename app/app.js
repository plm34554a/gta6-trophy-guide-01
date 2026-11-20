// Leonida Legend — the GTA VI trophy guide and tracker.
//
// Boot: load app/data/trophies.json (a file beside this one, so the app works fully offline behind
// any static file server), restore the reader's progress from localStorage, then render. The
// checklist, the roadmap and the About view all read the same data; ticking a trophy anywhere
// updates everywhere, and every change is saved at once.

import { loadState, saveState, downloadExport, parseImport } from './store.js';
import {
  buildTrophyCard,
  renderProgress,
  renderRoadmap,
  renderAbout,
  trophyMatchesFilters,
  sortTrophies,
} from './render.js';

const filters = { kind: 'all', grade: 'all', status: 'all', query: '', sort: 'roadmap' };
let data = null;
let state = loadState();
let earnedIds = new Set(state.earnedIds);

const cardsEl = document.getElementById('cards');
const emptyEl = document.getElementById('empty-state');
const resultCountEl = document.getElementById('result-count');
const saveNoteEl = document.getElementById('save-note');

function persist() {
  state = { earnedIds: [...earnedIds], spoilerShield: state.spoilerShield };
  const ok = saveState(state);
  saveNoteEl.textContent = ok
    ? 'Progress is saved in this browser on this device.'
    : 'This browser refused to save (storage off or full) — export your progress to keep it.';
}

function toggleEarned(id) {
  if (earnedIds.has(id)) earnedIds.delete(id);
  else earnedIds.add(id);
  persist();
  renderAll();
}

function renderChecklist() {
  const visible = sortTrophies(
    data.trophies.filter((t) => trophyMatchesFilters(t, filters, earnedIds)),
    filters.sort,
  );
  cardsEl.replaceChildren();
  for (const trophy of visible) {
    cardsEl.append(buildTrophyCard(trophy, state, earnedIds, toggleEarned));
  }
  resultCountEl.textContent = `Showing ${visible.length} of ${data.trophies.length} trophies`;
  if (visible.length === 0) {
    emptyEl.hidden = false;
    emptyEl.textContent = filters.kind === 'online'
      ? 'The official PlayStation 5 list has no online trophies — every one of the 55 is single-player. Pick another kind to keep browsing.'
      : 'No trophy matches these filters. Loosen the search or pick another kind.';
  } else {
    emptyEl.hidden = true;
  }
}

function renderAll() {
  renderProgress(data, earnedIds);
  renderChecklist();
  renderRoadmap(document.getElementById('roadmap-stages'), data, state, earnedIds, jumpToTrophy);
}

function jumpToTrophy(id) {
  switchView('list');
  filters.kind = 'all';
  filters.grade = 'all';
  filters.status = 'all';
  filters.query = '';
  document.getElementById('search').value = '';
  document.querySelectorAll('#kind-chips .chip').forEach((chip) => {
    chip.classList.toggle('is-active', chip.dataset.kind === 'all');
  });
  document.getElementById('grade-filter').value = 'all';
  document.getElementById('status-filter').value = 'all';
  renderChecklist();
  const card = cardsEl.querySelector(`[data-trophy-id="${id}"]`);
  if (card) {
    card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    card.classList.add('flash');
    setTimeout(() => card.classList.remove('flash'), 1600);
  }
}

function switchView(name) {
  for (const view of ['list', 'roadmap', 'about']) {
    document.getElementById(`view-${view}`).hidden = view !== name;
    document.getElementById(`tab-${view}`).classList.toggle('is-active', view === name);
  }
}

function wireControls() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });
  document.getElementById('search').addEventListener('input', (event) => {
    filters.query = event.target.value.trim().toLowerCase();
    renderChecklist();
  });
  document.querySelectorAll('#kind-chips .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      filters.kind = chip.dataset.kind;
      document.querySelectorAll('#kind-chips .chip').forEach((c) => {
        c.classList.toggle('is-active', c === chip);
      });
      renderChecklist();
    });
  });
  document.getElementById('grade-filter').addEventListener('change', (event) => {
    filters.grade = event.target.value;
    renderChecklist();
  });
  document.getElementById('status-filter').addEventListener('change', (event) => {
    filters.status = event.target.value;
    renderChecklist();
  });
  document.getElementById('sort-order').addEventListener('change', (event) => {
    filters.sort = event.target.value;
    renderChecklist();
  });
  const shield = document.getElementById('spoiler-shield');
  shield.checked = state.spoilerShield === true;
  shield.addEventListener('change', () => {
    state.spoilerShield = shield.checked;
    persist();
    renderAll();
  });
  document.getElementById('export-progress').addEventListener('click', () => {
    downloadExport(state, data.trophies);
  });
  document.getElementById('import-progress').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const ids = parseImport(await file.text(), data.trophies);
    if (ids === null) {
      saveNoteEl.textContent = 'That file does not look like trophy progress — nothing was imported.';
      return;
    }
    earnedIds = ids;
    persist();
    renderAll();
    saveNoteEl.textContent = `Imported progress: ${ids.size} trophies marked earned.`;
  });
  document.getElementById('reset-progress').addEventListener('click', () => {
    earnedIds = new Set();
    persist();
    renderAll();
  });
}

async function boot() {
  const response = await fetch('data/trophies.json');
  data = await response.json();
  renderAbout(document.getElementById('about-body'), data);
  wireControls();
  renderAll();
}

boot().catch((error) => {
  emptyEl.hidden = false;
  emptyEl.textContent = `The guide data could not be loaded (${error.message}). Serve this folder with any static file server and reload.`;
});
