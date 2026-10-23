/**
 * Üretim dump → VDS taşıma. Çıktı git'e girmez (tmp-vds-dump/).
 * Kullanım: node scripts/dump-supabase-for-vds.mjs
 */
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');
const outDir = path.join(root, 'tmp-vds-dump');

function loadEnv(file) {
  const map = {};
  if (!existsSync(file)) throw new Error('.env yok');
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    map[t.slice(0, i)] = t.slice(i + 1);
  }
  return map;
}

const env = loadEnv(envPath);
const dbUrl = env.DATABASE_URL;
if (!dbUrl) throw new Error('DATABASE_URL yok');

mkdirSync(outDir, { recursive: true });

function dump(args, dest) {
  console.log('dump →', path.basename(dest));
  const r = spawnSync(
    'npx',
    ['--yes', 'supabase', 'db', 'dump', '--db-url', dbUrl, '-f', dest, ...args],
    { cwd: root, stdio: 'inherit', shell: true, env: process.env },
  );
  if (r.status !== 0) throw new Error('dump failed ' + dest);
}

dump(['-s', 'public'], path.join(outDir, '01-public-schema.sql'));
dump(['-s', 'public', '--data-only', '--use-copy'], path.join(outDir, '02-public-data.sql'));
dump(['-s', 'auth'], path.join(outDir, '03-auth-schema.sql'));
dump(['-s', 'auth', '--data-only', '--use-copy'], path.join(outDir, '04-auth-data.sql'));
dump(['-s', 'storage'], path.join(outDir, '05-storage-schema.sql'));
dump(['-s', 'storage', '--data-only', '--use-copy'], path.join(outDir, '06-storage-data.sql'));

console.log('OK', outDir);
