// Progress storage for the Leonida Legend tracker.
//
// Everything lives in the browser's localStorage on the reader's own machine: the set of earned
// trophy ids and whether the spoiler shield is on. Nothing is sent anywhere. Export writes the
// same state to a JSON file the reader keeps; import reads such a file back (it also accepts the
// plain array-of-names format simpler checklists use, so an old export is never stranded).

const STORAGE_KEY = 'leonida-legend-tracker-v1';
const EXPORT_APP = 'leonida-legend-gta6-trophy-tracker';

export function defaultState() {
  return { earnedIds: [], spoilerShield: false };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.earnedIds)) return defaultState();
    return {
      earnedIds: parsed.earnedIds.filter((id) => Number.isInteger(id)),
      spoilerShield: parsed.spoilerShield === true,
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function buildExport(state, trophies) {
  const nameById = new Map(trophies.map((t) => [t.id, t.name]));
  return {
    app: EXPORT_APP,
    version: 1,
    game: 'Grand Theft Auto VI',
    platform: 'PlayStation 5',
    exportedAt: new Date().toISOString(),
    spoilerShield: state.spoilerShield === true,
    earnedIds: [...state.earnedIds],
    earnedNames: state.earnedIds.map((id) => nameById.get(id)).filter(Boolean),
  };
}

export function downloadExport(state, trophies) {
  const payload = JSON.stringify(buildExport(state, trophies), null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'gta6-trophy-progress.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Accepts this app's export object, an object holding an "earned" array, or a bare array; the
// entries may be trophy ids (numbers) or official trophy names (strings). Returns a Set of ids,
// or null when the file holds nothing recognisable.
export function parseImport(text, trophies) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  const entries = Array.isArray(data) ? data : data.earnedIds ?? data.earned ?? data.earnedNames;
  if (!Array.isArray(entries)) return null;
  const byName = new Map(trophies.map((t) => [t.name, t.id]));
  const validIds = new Set(trophies.map((t) => t.id));
  const ids = new Set();
  for (const entry of entries) {
    if (Number.isInteger(entry) && validIds.has(entry)) ids.add(entry);
    else if (typeof entry === 'string' && byName.has(entry)) ids.add(byName.get(entry));
  }
  return ids;
}
