// Leonida Legend — hand-in program for the gta6-trophy-guide-01 bounty.
//
// The guide itself is the static web app in app/ (open app/index.html in a
// browser; it works offline and loads only its own files). This program's
// whole job is to hand that app in: copy app/ and screenshots/ into the
// output directory and write dossier.json there with the kit's vendored
// buildDossier, byte for byte the way the scorer rebuilds it.
//
// Runs on Node 22 with the standard library only. In the grader the output
// directory is /output; locally, MAKEFUN_OUTPUT_DIR stands in for it:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail loudly rather than hand in a broken guide: the app entry page, its
// trophy data and at least the minimum screenshots must all be present.
const required = ['app/index.html', 'app/data/trophies.json', 'app/style.css', 'screenshots'];
for (const rel of required) {
  if (!existsSync(join(repoDir, rel))) {
    throw new Error(`cannot hand in: ${rel} is missing from the repository`);
  }
}
const shots = readdirSync(join(repoDir, 'screenshots')).filter((f) => /\.(png|jpe?g)$/i.test(f));
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`cannot hand in: screenshots/ holds ${shots.length} images, the bounty wants 3 or 4`);
}

mkdirSync(outDir, { recursive: true });
cpSync(join(repoDir, 'app'), join(outDir, 'app'), { recursive: true });
cpSync(join(repoDir, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

// The caps are the gate's own (max screenshots and their size, app file
// count and bytes, dossier text cap): buildDossier refuses anything the
// scorer would refuse, so a clean run here means the files are in bounds.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`handed in: app/ + ${shots.length} screenshots + dossier.json (${dossier.length} bytes) -> ${outDir}`);
