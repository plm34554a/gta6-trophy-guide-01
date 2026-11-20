// Rendering: trophy cards, the roadmap and the about page, built with DOM
// calls (never innerHTML with data) so trophy text is always shown verbatim.

export const KIND_FILTERS = [
  { key: 'all', label: 'All kinds' },
  { key: 'story', label: 'Story' },
  { key: 'missable', label: 'Missable' },
  { key: 'collectibles', label: 'Collectibles' },
  { key: 'activities', label: 'Activities' },
  { key: 'online', label: 'Online' },
];

const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
const KIND_LABEL = {
  story: 'Story',
  activities: 'Activities',
  collectibles: 'Collectibles',
  completion: 'Completion',
  crime: 'Crime & heists',
  exploration: 'Exploration & secrets',
  money: 'Money & property',
  online: 'Online',
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function sourceList(sources) {
  const p = el('p', 'sources');
  p.append('Sources: ');
  sources.forEach((s, i) => {
    if (i > 0) p.append(' · ');
    if (s.url) {
      const a = el('a', null, s.label);
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      p.append(a);
    } else {
      p.append(s.label);
    }
  });
  return p;
}

export function isShielded(trophy, store) {
  return store.spoilersHidden() && trophy.kind === 'story' && !store.isEarned(trophy.name);
}

export function trophyCard(trophy, store, expanded, onToggleGuide) {
  const card = el('article', `trophy grade-${trophy.grade}`);
  card.dataset.name = trophy.name;
  if (store.isEarned(trophy.name)) card.classList.add('is-earned');
  const shielded = isShielded(trophy, store);
  if (shielded) card.classList.add('is-hidden-story');

  const top = el('div', 'trophy-top');
  const box = el('input', 'trophy-check');
  box.type = 'checkbox';
  box.checked = store.isEarned(trophy.name);
  box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
  box.addEventListener('change', () => store.toggle(trophy.name));
  top.append(box);

  const head = el('div', 'trophy-head');
  const shownName = shielded ? 'Hidden story trophy' : trophy.name;
  const shownDesc = shielded
    ? 'Name and description hidden by the spoiler shield — earn it (or turn the shield off) to reveal.'
    : trophy.description;
  head.append(el('h3', 'trophy-name', shownName));
  head.append(el('p', 'trophy-desc', shownDesc));

  const tags = el('div', 'trophy-tags');
  tags.append(el('span', `tag tag-grade-${trophy.grade}`, trophy.grade));
  tags.append(el('span', 'tag', KIND_LABEL[trophy.kind] ?? trophy.kind));
  tags.append(el('span', 'tag', `Roadmap step ${trophy.stage}`));
  if (trophy.target) {
    const label = trophy.targetLabel ?? 'to do';
    tags.append(el('span', 'tag tag-target', `Target: ${trophy.target.toLocaleString('en-US')} ${label}`));
  }
  if (trophy.missable) tags.append(el('span', 'tag tag-missable', 'Missable'));
  head.append(tags);
  top.append(head);

  const btn = el('button', 'guide-btn', expanded ? 'Hide guide' : 'Guide & sources');
  btn.type = 'button';
  btn.addEventListener('click', () => onToggleGuide(trophy.name));
  top.append(btn);
  card.append(top);

  if (expanded) {
    const guide = el('div', 'trophy-guide');
    if (shielded) {
      guide.append(el('p', null, 'This guide is hidden by the spoiler shield because it discusses a story trophy you have not earned yet. Turn the shield off in the toolbar to read it.'));
    } else {
      guide.append(el('p', null, trophy.guide));
      if (trophy.missable) {
        guide.append(el('p', null, 'Missable: yes — see the warning at the top of this page and Step 1 of the roadmap. Everything else on the list can still be earned in post-story free roam.'));
      }
      guide.append(sourceList(trophy.sources ?? []));
    }
    card.append(guide);
  }
  return card;
}

export function filterTrophies(trophies, filters) {
  const q = filters.search.trim().toLowerCase();
  const out = trophies.filter((t) => {
    if (filters.kind === 'missable' && !t.missable) return false;
    if (filters.kind !== 'all' && filters.kind !== 'missable' && t.kind !== filters.kind) return false;
    if (filters.grade !== 'all' && t.grade !== filters.grade) return false;
    if (filters.status === 'earned' && !filters.store.isEarned(t.name)) return false;
    if (filters.status === 'unearned' && filters.store.isEarned(t.name)) return false;
    if (q) {
      const hay = `${t.name} ${t.description} ${t.kind} ${t.guide}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  if (filters.sort === 'grade') {
    out.sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || a.id - b.id);
  } else if (filters.sort === 'roadmap') {
    out.sort((a, b) => a.stage - b.stage || a.id - b.id);
  } else {
    out.sort((a, b) => a.id - b.id);
  }
  return out;
}

export const EMPTY_MESSAGES = {
  online: 'No online trophies: the official PS5 list is entirely single-player — all 55 trophies are offline (PowerPyx and GTABase both list 0 online trophies). The filter stays because the list format allows for them.',
  missable: 'Only one trophy is missable, and it is not matching the other filters right now. Clear a filter to see Positive Mental Attitude.',
  default: 'No trophies match those filters. Loosen the search or clear a filter.',
};

export function roadmapStage(stage, trophies, store, onJump) {
  const wrap = el('article', 'stage');
  wrap.append(el('h3', null, stage.title));
  wrap.append(el('p', null, stage.text));
  if (stage.sources?.length) wrap.append(sourceList(stage.sources));
  const chips = el('div', 'stage-chips');
  for (const t of trophies.filter((x) => x.stage === stage.stage)) {
    const chip = el('button', 'stage-chip', t.missable ? `${t.name} — MISSABLE` : t.name);
    chip.type = 'button';
    if (store.isEarned(t.name)) chip.classList.add('is-earned');
    if (t.missable) chip.classList.add('is-missable');
    chip.addEventListener('click', () => onJump(t.name));
    chips.append(chip);
  }
  wrap.append(chips);
  return wrap;
}

export function aboutContent(doc) {
  const frag = document.createDocumentFragment();
  frag.append(el('p', null, doc.about));
  frag.append(el('h3', null, 'How the roadmap is built'));
  frag.append(el('p', null, 'The five roadmap steps follow the structure the cited guides agree on: story first (with the Chapter 1 meditation taken on time), the 100% checklist after the finale, and stranger strands and leftovers as cleanup. Grades, counts and missable flags in this app come from the official descriptions and the sources below — where a guide goes beyond them, the guide text says so and labels itself an inference.'));
  frag.append(el('h3', null, 'Sources'));
  const list = el('ul');
  for (const s of doc.sources_overview ?? []) {
    const li = el('li');
    if (s.url) {
      const a = el('a', null, s.label);
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      li.append(a);
    } else {
      li.append(s.label);
    }
    list.append(li);
  }
  frag.append(list);
  frag.append(el('h3', null, 'Your progress'));
  frag.append(el('p', null, 'Ticks are stored in this browser only (localStorage). Export downloads them as a small JSON file; import reads that file — or a plain JSON array of trophy names — and restores the ticks. Nothing is uploaded anywhere: the app makes no network requests.'));
  return frag;
}
