// Rendering for the Leonida Legend guide: the checklist cards, the header progress, the roadmap
// view and the About view. Everything is built with textContent, never by injecting HTML strings,
// so trophy names and guide text are always shown exactly as the data file holds them.

export const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
export const GRADE_LABEL = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
export const KIND_LABEL = {
  story: 'Story',
  collectibles: 'Collectibles',
  activities: 'Activities',
  completion: 'Completion',
};

const SPOILER_NAME = 'Hidden story trophy';
const SPOILER_DESCRIPTION = 'Name and description are hidden by the spoiler shield until this trophy is earned.';

export function isSpoilerHidden(trophy, state, earnedIds) {
  return state.spoilerShield && trophy.kind === 'story' && !earnedIds.has(trophy.id);
}

export function trophyMatchesFilters(trophy, filters, earnedIds) {
  if (filters.kind === 'missable' && !trophy.missable) return false;
  if (filters.kind === 'online') return false; // the official list holds no online trophies
  if (filters.kind !== 'all' && filters.kind !== 'missable' && trophy.kind !== filters.kind) return false;
  if (filters.grade !== 'all' && trophy.grade !== filters.grade) return false;
  if (filters.status === 'earned' && !earnedIds.has(trophy.id)) return false;
  if (filters.status === 'open' && earnedIds.has(trophy.id)) return false;
  if (filters.query) {
    const haystack = `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
    if (!haystack.includes(filters.query)) return false;
  }
  return true;
}

export function sortTrophies(trophies, order) {
  const byRoadmap = (a, b) => a.stage - b.stage || a.id - b.id;
  if (order === 'grade') {
    return [...trophies].sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || byRoadmap(a, b));
  }
  if (order === 'name') {
    return [...trophies].sort((a, b) => a.name.localeCompare(b.name));
  }
  return [...trophies].sort(byRoadmap);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildSourceList(sources) {
  const wrap = el('div', 'sources');
  wrap.append(el('span', 'sources-label', 'Sources'));
  const list = el('ul', 'sources-list');
  for (const source of sources) {
    const item = el('li');
    if (source.url) {
      const link = el('a', '', source.label);
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      item.append(link);
    } else {
      item.append(document.createTextNode(source.label));
    }
    list.append(item);
  }
  wrap.append(list);
  return wrap;
}

export function buildTrophyCard(trophy, state, earnedIds, onToggleEarned) {
  const earned = earnedIds.has(trophy.id);
  const hidden = isSpoilerHidden(trophy, state, earnedIds);
  const card = el('article', `card grade-${trophy.grade}${earned ? ' is-earned' : ''}${hidden ? ' is-spoiled' : ''}`);
  card.dataset.trophyId = String(trophy.id);

  const box = el('button', 'earn-box', earned ? '✓' : '');
  box.type = 'button';
  box.setAttribute('aria-pressed', String(earned));
  box.setAttribute('aria-label', earned ? 'Mark as not earned' : 'Mark as earned');
  box.addEventListener('click', () => onToggleEarned(trophy.id));
  card.append(box);

  const main = el('div', 'card-main');
  const top = el('div', 'card-top');
  top.append(el('span', `gem gem-${trophy.grade}`));
  top.append(el('span', 'grade-label', GRADE_LABEL[trophy.grade]));
  top.append(el('span', 'tag', KIND_LABEL[trophy.kind] ?? trophy.kind));
  top.append(el('span', 'tag tag-stage', `Roadmap step ${trophy.stage}`));
  if (trophy.count) {
    const target = trophy.count.target.toLocaleString('en-US');
    top.append(el('span', 'tag tag-count', `Target: ${target} ${trophy.count.unit}`));
  }
  if (trophy.missable) top.append(el('span', 'tag tag-missable', 'Possibly missable'));
  main.append(top);

  main.append(el('h3', 'trophy-name', hidden ? SPOILER_NAME : trophy.name));

  const official = el('p', 'official');
  official.append(el('span', 'official-label', 'Official description'));
  official.append(document.createTextNode(hidden ? SPOILER_DESCRIPTION : `“${trophy.description}”`));
  main.append(official);

  if (trophy.missable && trophy.missableNote) {
    const note = el('p', 'missable-note');
    note.append(el('strong', '', 'Missable warning: '));
    note.append(document.createTextNode(trophy.missableNote));
    main.append(note);
  }

  if (!hidden) {
    const body = el('div', 'guide-body');
    body.hidden = true;
    body.append(el('p', 'guide-text', trophy.guide));
    if (Array.isArray(trophy.steps) && trophy.steps.length) {
      const steps = el('ol', 'guide-steps');
      for (const step of trophy.steps) steps.append(el('li', '', step));
      body.append(steps);
    }
    body.append(buildSourceList(trophy.sources ?? []));
    const toggle = el('button', 'guide-toggle', 'Read the guide');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => {
      body.hidden = !body.hidden;
      toggle.textContent = body.hidden ? 'Read the guide' : 'Hide the guide';
      toggle.setAttribute('aria-expanded', String(!body.hidden));
    });
    main.append(toggle, body);
  } else {
    main.append(el('p', 'spoiled-note', 'Earn this trophy in the game, tick it here, and its name, description and guide are revealed.'));
  }

  card.append(main);
  return card;
}

export function renderProgress(data, earnedIds) {
  const total = data.trophies.length;
  const pct = total === 0 ? 0 : Math.round((earnedIds.size / total) * 100);
  document.getElementById('progress-pct').textContent = `${pct}%`;
  document.getElementById('progress-headline').textContent =
    `${earnedIds.size} of ${total} trophies earned`;
  document.getElementById('progress-ring').style.background =
    `conic-gradient(var(--sunset-pink) ${pct}%, #2c2344 ${pct}%)`;
  document.getElementById('progress-fill').style.width = `${pct}%`;
  const stats = document.getElementById('grade-stats');
  stats.replaceChildren();
  for (const grade of ['platinum', 'gold', 'silver', 'bronze']) {
    const inGrade = data.trophies.filter((t) => t.grade === grade);
    const done = inGrade.filter((t) => earnedIds.has(t.id)).length;
    const item = el('li', `grade-stat grade-${grade}`, `${GRADE_LABEL[grade]} ${done}/${inGrade.length}`);
    stats.append(item);
  }
}

export function renderRoadmap(container, data, state, earnedIds, onJumpToTrophy) {
  container.replaceChildren();
  const byStage = new Map();
  for (const trophy of data.trophies) {
    if (!byStage.has(trophy.stage)) byStage.set(trophy.stage, []);
    byStage.get(trophy.stage).push(trophy);
  }
  for (const stageInfo of [...data.roadmap].sort((a, b) => a.stage - b.stage)) {
    const trophies = (byStage.get(stageInfo.stage) ?? []).sort((a, b) => a.id - b.id);
    const done = trophies.filter((t) => earnedIds.has(t.id)).length;
    const section = el('section', 'stage');
    const header = el('header', 'stage-header');
    header.append(el('span', 'stage-num', `Step ${stageInfo.stage}`));
    header.append(el('h3', '', stageInfo.title.replace(/^Step \d+ — /, '')));
    header.append(el('span', 'stage-progress', `${done}/${trophies.length} earned`));
    section.append(header);
    section.append(el('p', 'stage-text', stageInfo.text));
    const chips = el('div', 'stage-chips');
    for (const trophy of trophies) {
      const hidden = isSpoilerHidden(trophy, state, earnedIds);
      const chip = el('button', `stage-chip grade-${trophy.grade}${earnedIds.has(trophy.id) ? ' is-earned' : ''}`,
        hidden ? SPOILER_NAME : trophy.name);
      chip.type = 'button';
      chip.addEventListener('click', () => onJumpToTrophy(trophy.id));
      chips.append(chip);
    }
    section.append(chips);
    container.append(section);
  }
}

export function renderAbout(container, data) {
  container.replaceChildren();
  container.append(el('p', '', data.about));
  const facts = el('ul', 'about-facts');
  const factLines = [
    'The list: 55 trophies — 1 platinum, 2 gold, 6 silver, 46 bronze. Names, descriptions and grades are shown exactly as PlayStation publishes them; one name is printed with asterisks by PlayStation itself (T**s Ass Drug Money).',
    'Kinds and roadmap steps are this app’s own filing, derived from the official descriptions: a trophy is “story” when its description completes a chapter, a named mission or a stranger’s final mission; “collectibles” when it completes a set, a sweep or a registry; “completion” for the platinum and 100%.',
    'Online: the official list contains no online trophies — every trophy is single-player — so the Online filter is there to say so, and shows none.',
    'Missable: exactly one flag. PowerPyx and GTABase both flag Positive Mental Attitude (a Chapter 1 meditation with Lucia may count toward its 18 spots, and there is no mission replay). GTABase’s roadmap states everything else can be finished in free roam after the story, so nothing else is flagged; where a guide in this app goes beyond the description, it says so in its own text and calls itself an inference.',
    'Cheats: GTABase and TechWiser report that using a cheat disables trophies and saving — keep them off a trophy run.',
    'Your progress never leaves this device: it is stored in the browser’s localStorage, and Export/Import move it as a JSON file you keep.',
  ];
  for (const line of factLines) facts.append(el('li', '', line));
  container.append(facts);
  const seen = new Map();
  for (const trophy of data.trophies) {
    for (const source of trophy.sources ?? []) {
      if (!seen.has(source.label)) seen.set(source.label, source);
    }
  }
  container.append(el('h3', '', 'Sources cited in the guides'));
  container.append(buildSourceList([...seen.values()]));
}
