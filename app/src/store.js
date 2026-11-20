// Progress store: which trophies are earned, plus the spoiler-shield setting.
// Everything lives in localStorage under one key; nothing leaves the browser.

const STORAGE_KEY = 'leonida-legend-progress-v1';

function blankState() {
  return { earned: [], spoilersHidden: true };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blankState();
    const parsed = JSON.parse(raw);
    return {
      earned: Array.isArray(parsed.earned) ? parsed.earned.filter((n) => typeof n === 'string') : [],
      spoilersHidden: parsed.spoilersHidden !== false,
    };
  } catch {
    return blankState();
  }
}

export function createStore() {
  const state = loadState();
  const earned = new Set(state.earned);
  const listeners = new Set();

  function persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ earned: [...earned], spoilersHidden: state.spoilersHidden }),
      );
    } catch {
      // Storage full or blocked: the tracker still works for this session.
    }
  }

  function emit() {
    for (const fn of listeners) fn();
  }

  return {
    isEarned(name) {
      return earned.has(name);
    },
    toggle(name) {
      if (earned.has(name)) earned.delete(name);
      else earned.add(name);
      persist();
      emit();
    },
    earnedCount() {
      return earned.size;
    },
    earnedNames() {
      return [...earned];
    },
    spoilersHidden() {
      return state.spoilersHidden;
    },
    setSpoilersHidden(value) {
      state.spoilersHidden = Boolean(value);
      persist();
      emit();
    },
    replaceEarned(names) {
      earned.clear();
      for (const n of names) earned.add(n);
      persist();
      emit();
    },
    reset() {
      earned.clear();
      persist();
      emit();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

// The export file is plain JSON: an object with the earned trophy names, so a
// player can read or hand-edit it. Import also accepts a bare array of names,
// which is what older checklist tools (and this app's first version) produced.
export function exportFileText(store) {
  return JSON.stringify(
    { app: 'leonida-legend', version: 1, earned: store.earnedNames() },
    null,
    2,
  );
}

export function parseImportText(text, validNames) {
  const data = JSON.parse(text);
  const names = Array.isArray(data) ? data : data.earned;
  if (!Array.isArray(names)) {
    throw new Error('That file does not hold a list of earned trophies.');
  }
  const valid = new Set(validNames);
  return names.filter((n) => typeof n === 'string' && valid.has(n));
}
