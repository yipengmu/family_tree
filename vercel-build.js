const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = __dirname;
const buildDir = path.join(root, 'build');
const markerPath = path.join(root, '.vercel-build-meta.json');
const migrationMarkerPath = path.join(root, '.vercel-migrate-meta.json');

function hashFiles(files) {
  const hash = crypto.createHash('sha256');

  for (const file of files.sort()) {
    const absolutePath = path.join(root, file);
    if (!fs.existsSync(absolutePath)) continue;
    hash.update(file);
    hash.update(fs.readFileSync(absolutePath));
  }

  return hash.digest('hex');
}

const migrationFiles = [];
const migrationsDirectory = path.join(root, 'prisma', 'migrations');

function collectMigrationFiles(directory) {
  if (!fs.existsSync(directory)) return;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectMigrationFiles(absolutePath);
    else migrationFiles.push(path.relative(root, absolutePath));
  }
}

collectMigrationFiles(migrationsDirectory);

// 兼容只配置了 DATABASE_URL 的部署环境（如 Vercel 未单独设置直连地址）。
// Prisma schema 中 directUrl = env("DATABASE_URL_UNPOOLED") 在校验阶段就会要求该变量存在，
// 这里在调用 Prisma 之前补齐，避免构建因漏配而失败。
if (!process.env.DATABASE_URL_UNPOOLED && process.env.DATABASE_URL) {
  process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL;
}

const migrationFingerprint = hashFiles(migrationFiles);
let migratedFingerprint = null;

if (fs.existsSync(migrationMarkerPath)) {
  try {
    migratedFingerprint = JSON.parse(fs.readFileSync(migrationMarkerPath, 'utf8')).fingerprint;
  } catch {
    migratedFingerprint = null;
  }
}

// Vercel may invoke the build command again while bundling each API function.
// Migrations are still run before the first build, but not once per function.
if (migratedFingerprint !== migrationFingerprint) {
  const prismaCommand = path.join(root, 'node_modules', '.bin', 'prisma');
  const migration = spawnSync(prismaCommand, ['migrate', 'deploy'], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  });

  if (migration.error) throw migration.error;
  if (migration.status !== 0) process.exit(migration.status || 1);

  fs.writeFileSync(migrationMarkerPath, `${JSON.stringify({ fingerprint: migrationFingerprint }, null, 2)}\n`);
} else {
  console.log('Database migrations already applied for this source; reusing migration result.');
}

const files = ['package.json', 'package-lock.json', 'craco.config.js'];

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

const fingerprint = hashFiles(files);
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
