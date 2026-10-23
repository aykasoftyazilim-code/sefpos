'use strict';

const https = require('https');
const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');

const DEFAULT_VDS_ORIGIN = 'https://sefpos.com.tr';
const PRINT_JOB_MAX_AGE_MINUTES = 30;
const PRINT_MIN_INTERVAL_MS = 2000;
const POLL_MS = 2500;
const REGISTER_MS = 60_000;

function getSessionPath() {
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  return path.join(appData, 'Sefpos', 'print-agent-session.json');
}

function ensureSessionDir() {
  const dir = path.dirname(getSessionPath());
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readSession() {
  try {
    const raw = fs.readFileSync(getSessionPath(), 'utf8');
    const s = JSON.parse(raw);
    if (!s?.tenantId || !s?.userJwt) return null;
    return {
      tenantId: s.tenantId,
      branchId: s.branchId || null,
      userJwt: s.userJwt,
      vdsOrigin: String(s.vdsOrigin || DEFAULT_VDS_ORIGIN).replace(/\/$/, ''),
      printers: Array.isArray(s.printers) ? s.printers : [],
    };
  } catch {
    return null;
  }
}

function writeSession(partial) {
  ensureSessionDir();
  const prev = readSession() || {};
  const next = {
    ...prev,
    ...partial,
    savedAt: new Date().toISOString(),
  };
  fs.writeFileSync(getSessionPath(), JSON.stringify(next, null, 2), 'utf8');
  return next;
}

function vdsFetch(session, apiPath, body) {
  return new Promise((resolve, reject) => {
    const origin = session.vdsOrigin || DEFAULT_VDS_ORIGIN;
    const url = new URL(origin + apiPath);
    const lib = url.protocol === 'https:' ? https : http;
    const payload = body == null ? null : JSON.stringify(body);
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.userJwt}`,
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
        timeout: 20000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(data || '{}');
          } catch {
            parsed = { error: data };
          }
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300 && !parsed?.error,
            status: res.statusCode,
            data: parsed,
          });
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

function isVirtualPrinterName(name) {
  const n = String(name || '').toLowerCase();
  return (
    n.includes('onenote') ||
    n.includes('fax') ||
    n.includes('xps') ||
    n.includes('microsoft print to pdf') ||
    n.includes('send to')
  );
}

function pickDefaultKitchenPrinter(printers) {
  const kw = ['80mm', 'pos-80', 'pos80', 'mutfak', 'kitchen', 'thermal', 'fis', 'fiş', 'kasa', 'bar', 'grill'];
  const named = printers
    .map((p) => (typeof p === 'string' ? p : p?.name || ''))
    .filter((n) => n && !isVirtualPrinterName(n));
  for (const k of kw) {
    const hit = named.find((n) => n.toLowerCase().includes(k));
    if (hit) return hit;
  }
  return named[0] || '';
}

function printJobIsExpired(job) {
  const raw = job?.created_at;
  if (!raw) return false;
  const t = new Date(raw).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t > PRINT_JOB_MAX_AGE_MINUTES * 60 * 1000;
}

/**
 * @param {{
 *   handlePrint: (html: string, printerName: string) => Promise<{ success: boolean, error?: string }>,
 *   listPrinters?: () => Promise<Array<{ name: string }>>,
 * }} opts
 */
function startQueuePoller(opts) {
  const processingJobIds = new Set();
  let lastDoPrintAt = 0;
  let lastRegisterAt = 0;

  async function updatePrintJobStatus(session, jobId, status, error) {
    try {
      await vdsFetch(session, '/vds-api/query', {
        table: 'print_jobs',
        operation: 'update',
        data: {
          status,
          updated_at: new Date().toISOString(),
          ...(error !== undefined ? { error: error || null } : {}),
          ...(status === 'done' ? { printed_at: new Date().toISOString() } : {}),
        },
        filters: [{ col: 'id', op: 'eq', val: jobId }],
      });
    } catch (err) {
      console.warn('[print-agent] job durumu güncellenemedi:', err.message);
    }
  }

  async function processPrintJob(session, job) {
    if (processingJobIds.has(job.id)) return;
    processingJobIds.add(job.id);

    try {
      if (printJobIsExpired(job)) {
        await updatePrintJobStatus(session, job.id, 'failed', 'Süresi doldu (otomatik iptal)');
        return;
      }

      const claim = await vdsFetch(session, '/vds-api/query', {
        table: 'print_jobs',
        operation: 'update',
        data: { status: 'processing', updated_at: new Date().toISOString() },
        filters: [
          { col: 'id', op: 'eq', val: job.id },
          { col: 'status', op: 'eq', val: 'pending' },
        ],
      });
      if (!claim.ok) return;
      const claimedRows = Array.isArray(claim.data?.data) ? claim.data.data : [];
      if (claimedRows.length === 0 && claim.data?.data == null) {
        // update may return empty array depending on driver — continue if no hard error
      }

      let targetPrinter = String(job.printer_name || '').trim();
      if (!targetPrinter) {
        targetPrinter = pickDefaultKitchenPrinter(session.printers);
      }

      const waitMs = PRINT_MIN_INTERVAL_MS - (Date.now() - lastDoPrintAt);
      if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));

      const html = job.html || job.payload?.html || '';
      if (!html) {
        await updatePrintJobStatus(session, job.id, 'failed', 'html yok');
        return;
      }

      const result = await opts.handlePrint(html, targetPrinter);
      lastDoPrintAt = Date.now();

      if (result.success) {
        await updatePrintJobStatus(session, job.id, 'done', '');
        console.log(`[print-agent] Kuyruk fişi basıldı: ${job.id} → ${targetPrinter || '(varsayılan)'}`);
      } else {
        await updatePrintJobStatus(session, job.id, 'failed', result.error || 'Bilinmeyen hata');
      }
    } catch (err) {
      await updatePrintJobStatus(session, job.id, 'failed', err.message);
    } finally {
      processingJobIds.delete(job.id);
    }
  }

  async function reclaimStaleProcessing(session) {
    try {
      const result = await vdsFetch(session, '/vds-api/query', {
        table: 'print_jobs',
        operation: 'select',
        select: 'id,status,updated_at,created_at',
        filters: [
          { col: 'tenant_id', op: 'eq', val: session.tenantId },
          { col: 'status', op: 'eq', val: 'processing' },
        ],
        orderBy: [{ col: 'created_at', asc: true }],
        limitVal: 20,
      });
      const rows = Array.isArray(result.data?.data) ? result.data.data : [];
      const cutoff = Date.now() - 90_000;
      for (const job of rows) {
        const t = new Date(job.updated_at || job.created_at).getTime();
        if (!Number.isNaN(t) && t < cutoff) {
          await updatePrintJobStatus(session, job.id, 'failed', 'Takılı kaldı (ajan yeniden başlatıldı)');
        }
      }
    } catch {
      /* ignore */
    }
  }

  let printBusy = false;

  async function fetchPendingJobs(session) {
    if (printBusy) return;
    printBusy = true;
    try {
      await reclaimStaleProcessing(session);
      const filters = [
        { col: 'tenant_id', op: 'eq', val: session.tenantId },
        { col: 'status', op: 'eq', val: 'pending' },
      ];
      const result = await vdsFetch(session, '/vds-api/query', {
        table: 'print_jobs',
        operation: 'select',
        select: 'id,tenant_id,branch_id,html,printer_name,status,created_at',
        filters,
        orderBy: [{ col: 'created_at', asc: true }],
        limitVal: 8, // birden fazla yazıcıya giden siparişler aynı turda
      });
      const rows = Array.isArray(result.data?.data) ? result.data.data : [];
      for (const job of rows) {
        if (session.branchId && job.branch_id && String(job.branch_id) !== String(session.branchId)) {
          continue;
        }
        await processPrintJob(session, job);
      }
    } finally {
      printBusy = false;
    }
  }

  async function registerPrinters(session) {
    if (!opts.listPrinters) return;
    try {
      const printers = await opts.listPrinters();
      const names = (printers || [])
        .map((p) => ({ name: p.name || p.Name || String(p), isDefault: !!p.isDefault }))
        .filter((p) => p.name);
      writeSession({ printers: names });
      session.printers = names;

      await vdsFetch(session, '/vds-api/query', {
        table: 'printer_registrations',
        operation: 'upsert',
        data: {
          id: session.tenantId,
          tenant_id: session.tenantId,
          branch_id: session.branchId || null,
          printers: names,
          last_seen_at: new Date().toISOString(),
        },
      });
      console.log(`[print-agent] ${names.length} yazıcı kaydedildi (tarayıcıda görünür)`);
    } catch (err) {
      console.warn('[print-agent] yazıcı kaydı:', err.message);
    }
  }

  async function tick() {
    const session = readSession();
    if (!session) return;
    try {
      if (Date.now() - lastRegisterAt > REGISTER_MS) {
        lastRegisterAt = Date.now();
        await registerPrinters(session);
      }
      await fetchPendingJobs(session);
    } catch (err) {
      console.warn('[print-agent] poll:', err.message);
    }
  }

  const timer = setInterval(() => {
    tick().catch(() => {});
  }, POLL_MS);
  tick().catch(() => {});

  return () => {
    clearInterval(timer);
  };
}

module.exports = {
  startQueuePoller,
  getSessionPath,
  readSession,
  writeSession,
  DEFAULT_VDS_ORIGIN,
};
