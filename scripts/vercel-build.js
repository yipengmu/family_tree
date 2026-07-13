const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const buildDir = path.join(root, 'build');
const markerPath = path.join(root, '.vercel-build-meta.json');

const hash = crypto.createHash('sha256');
const files = [
  'package.json',
  'package-lock.json',
  'craco.config.js',
];

function addDirectory(directory) {
  const absoluteDirectory = path.join(root, directory);
  if (!fs.existsSync(absoluteDirectory)) return;

  for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const relativePath = path.join(directory, entry.name);
    if (entry.isDirectory()) addDirectory(relativePath);
    else files.push(relativePath);
  }
}

addDirectory('src');
addDirectory('public');

for (const file of files.sort()) {
  const absolutePath = path.join(root, file);
  if (fs.existsSync(absolutePath)) {
    hash.update(file);
    hash.update(fs.readFileSync(absolutePath));
  }
}

const fingerprint = hash.digest('hex');
let existingFingerprint = null;

if (fs.existsSync(markerPath)) {
  try {
    existingFingerprint = JSON.parse(fs.readFileSync(markerPath, 'utf8')).fingerprint;
  } catch {
    existingFingerprint = null;
  }
}

if (existingFingerprint === fingerprint && fs.existsSync(path.join(buildDir, 'index.html'))) {
  console.log('Vercel build already completed for this source; reusing build output.');
  process.exit(0);
}

const result = spawnSync('npm', ['run', 'build'], {
  cwd: root,
  env: { ...process.env, GENERATE_SOURCEMAP: 'false' },
  stdio: 'inherit',
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);

fs.writeFileSync(markerPath, `${JSON.stringify({ fingerprint }, null, 2)}\n`);
