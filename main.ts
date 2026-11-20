// Leonida Legend — hand-in program for the gta6-trophy-guide-01 entry (Node 22, standard library
// only, nothing installed, no network).
//
// The guide itself is the static app in app/ beside this file: a browser opens app/index.html and
// everything runs from those files. This program's one job is to hand the entry in exactly the way
// the bounty asks: copy app/ and screenshots/ into the output directory and write dossier.json
// there with the kit's vendored buildDossier, untouched, because the scorer rebuilds the dossier
// with its own copy of that library and compares the two byte for byte.
//
// In the grader the output directory is /output; outside it, MAKEFUN_OUTPUT_DIR stands in:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The program runs twice in grading and both runs must write the same bytes, so it writes nothing
// time-dependent: the dossier is a pure function of the files it copies.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The caps the scorer enforces, passed to buildDossier so a hand-in that would be refused fails
// here first, with the library's own words, instead of at grading.
const DOSSIER_OPTIONS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

function requirePath(path: string, what: string): void {
  if (!existsSync(path)) throw new Error(`cannot hand in: ${what} is missing (${path})`);
}

function copyTree(from: string, to: string): void {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

function main(): void {
  const appDir = join(repoDir, 'app');
  const shotsDir = join(repoDir, 'screenshots');
  requirePath(join(appDir, 'index.html'), 'the app (app/index.html)');
  requirePath(join(appDir, 'data', 'trophies.json'), 'the trophy data (app/data/trophies.json)');
  requirePath(shotsDir, 'the screenshots folder');
  const shotCount = readdirSync(shotsDir).filter((name) => !name.startsWith('.')).length;
  if (shotCount < 3 || shotCount > 4) {
    throw new Error(`cannot hand in: screenshots/ holds ${shotCount} files, the bounty wants 3 or 4`);
  }

  mkdirSync(outputDir, { recursive: true });
  copyTree(appDir, join(outputDir, 'app'));
  copyTree(shotsDir, join(outputDir, 'screenshots'));
  writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, DOSSIER_OPTIONS));
}

main();
