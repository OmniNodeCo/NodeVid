// Builds the site for GitHub Pages and writes it to the repository root,
// which is what Pages serves for this repo (Settings → Pages → Deploy from a
// branch, folder "/"). Usage: npm run build:pages [-- --base /NodeVid]
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argIdx = process.argv.indexOf('--base');
const repoName = path.basename(root);
const base = argIdx > -1 ? process.argv[argIdx + 1] : process.env.BASE_PATH ?? `/${repoName}/`;

console.log(`Building for GitHub Pages with base "${base}"…`);
// Build into a temp folder so dist/ (used by `npm start`) is left alone.
const dist = path.join(root, '.pages-build');
execSync(`npx vite build --outDir "${dist}"`, { cwd: root, stdio: 'inherit', env: { ...process.env, BASE_PATH: base } });

const outputs = ['index.html', '404.html', 'favicon.svg', '.nojekyll', 'assets'];

// Remove the previous build (old hashed assets) before copying the new one.
for (const name of outputs) fs.rmSync(path.join(root, name), { recursive: true, force: true });
for (const name of fs.readdirSync(dist)) fs.cpSync(path.join(dist, name), path.join(root, name), { recursive: true });
fs.writeFileSync(path.join(root, '.nojekyll'), '');
fs.rmSync(dist, { recursive: true, force: true });

console.log('GitHub Pages build written to the repo root. Commit index.html, 404.html, assets/ and push.');
