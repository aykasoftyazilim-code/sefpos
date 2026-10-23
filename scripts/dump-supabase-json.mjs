/**
 * Supabase → JSON dump (Docker gerektirmez). Çıktı: tmp-vds-dump/
 */
import { readFileSync, mkdirSync, existsSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'tmp-vds-dump');

function loadEnv() {
  const map = {};
  for (const line of readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i > 0) map[t.slice(0, i)] = t.slice(i + 1);
  }
  return map;
}

const TABLES = [
  'tenants', 'branches', 'roles', 'profiles', 'table_groups', 'restaurant_tables',
  'categories', 'products', 'product_variants', 'customers', 'delivery_customers',
  'couriers', 'orders', 'order_items', 'payment_transactions', 'cash_register_transactions',
  'customer_transactions', 'online_order_platforms', 'online_orders', 'online_order_items',
  'print_jobs', 'printer_registrations', 'print_settings', 'order_cancel_logs',
  'courier_notifications', 'support_tickets', 'support_notifications', 'waiter_calls',
  'waiters', 'ingredients', 'recipes', 'stock_movements', 'stock_count_batches',
  'suppliers', 'purchase_invoices', 'purchase_invoice_items', 'shifts', 'shift_definitions',
  'loyalty_settings', 'loyalty_transactions', 'daily_closures', 'licenses', 'tenant_licenses',
  'order_daily_counters', 'payment_split_transactions', 'online_order_status_events',
  'branch_product_stocks', 'device_bindings', 'device_registrations',
];

const env = loadEnv();
const url = env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL yok');

mkdirSync(outDir, { recursive: true });

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const { rows: existing } = await client.query(
  `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`,
);
const have = new Set(existing.map((r) => r.table_name));
const manifest = {};

for (const t of TABLES) {
  if (!have.has(t)) {
    console.log('skip missing', t);
    continue;
  }
  const { rows } = await client.query(`SELECT * FROM public.${t}`);
  writeFileSync(path.join(outDir, `${t}.json`), JSON.stringify(rows));
  manifest[t] = rows.length;
  console.log(t, rows.length);
}

try {
  const { rows: users } = await client.query(
    `SELECT id::text AS id, email, encrypted_password AS password_hash, created_at
     FROM auth.users WHERE email IS NOT NULL`,
  );
  writeFileSync(path.join(outDir, 'app_users.json'), JSON.stringify(users));
  manifest.app_users = users.length;
  console.log('app_users', users.length);
} catch (e) {
  console.warn('auth.users okunamadi:', e.message);
}

writeFileSync(path.join(outDir, '_manifest.json'), JSON.stringify(manifest, null, 2));
await client.end();
console.log('OK', outDir);
