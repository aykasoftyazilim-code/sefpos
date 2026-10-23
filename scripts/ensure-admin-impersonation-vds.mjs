/**
 * VDS sefpos45: admin_tenant_impersonation tablosu (Oturum Aç).
 * Kullanım: node scripts/ensure-admin-impersonation-vds.mjs
 */
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sql from 'mssql';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(path.join(root, 'scripts/patch-vds-profiles.mjs'), 'utf8');
const pm = src.match(/password:\s*'([^']+)'/);
if (!pm) throw new Error('VDS SQL sifresi okunamadi');

const pool = await sql.connect({
  server: '45.195.231.185',
  port: 1433,
  database: 'sefpos45',
  user: 'sefpos',
  password: pm[1],
  options: { encrypt: false, trustServerCertificate: true },
  connectionTimeout: 20000,
  requestTimeout: 30000,
});

const before = await pool.request().query(`
  SELECT CASE WHEN OBJECT_ID(N'dbo.admin_tenant_impersonation', N'U') IS NULL THEN 0 ELSE 1 END AS tbl
`);

await pool.request().batch(`
IF OBJECT_ID(N'dbo.admin_tenant_impersonation', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.admin_tenant_impersonation (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    user_id UNIQUEIDENTIFIER NOT NULL,
    target_tenant_id UNIQUEIDENTIFIER NOT NULL,
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
  );
  CREATE UNIQUE INDEX uq_admin_tenant_impersonation_user ON dbo.admin_tenant_impersonation(user_id);
END
`);

await pool.request().batch(`
IF OBJECT_ID(N'dbo.trg_admin_tenant_impersonation_ins', N'TR') IS NOT NULL
  DROP TRIGGER dbo.trg_admin_tenant_impersonation_ins;
`);

await pool.request().batch(`
CREATE TRIGGER dbo.trg_admin_tenant_impersonation_ins
ON dbo.admin_tenant_impersonation
INSTEAD OF INSERT
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE t
    SET target_tenant_id = i.target_tenant_id,
        updated_at = ISNULL(i.updated_at, SYSUTCDATETIME()),
        id = i.user_id
  FROM dbo.admin_tenant_impersonation t
  INNER JOIN inserted i ON t.user_id = i.user_id;

  INSERT INTO dbo.admin_tenant_impersonation (id, user_id, target_tenant_id, updated_at)
  SELECT i.user_id, i.user_id, i.target_tenant_id, ISNULL(i.updated_at, SYSUTCDATETIME())
  FROM inserted i
  WHERE NOT EXISTS (
    SELECT 1 FROM dbo.admin_tenant_impersonation t WHERE t.user_id = i.user_id
  );
END
`);

const after = await pool.request().query(`
  SELECT
    CASE WHEN OBJECT_ID(N'dbo.admin_tenant_impersonation', N'U') IS NULL THEN 0 ELSE 1 END AS tbl,
    (SELECT COUNT(*) FROM tenants WHERE name LIKE N'Vadi%') AS vadi
`);
console.log(JSON.stringify({ before: before.recordset[0], after: after.recordset[0] }));
await pool.close();
