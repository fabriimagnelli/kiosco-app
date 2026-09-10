const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const os = require('os');
const { supabase } = require('./supabaseClient');

const CLOCK_ROLLBACK_TOLERANCE_MS = 5 * 60 * 1000;
const LAST_SYNC_REFRESH_MS = 6 * 60 * 60 * 1000;

let db = null;
let signingKey = null;
let machineFingerprint = '';
let hardwareId = '';

const REMOTE_BLOCKING_REASONS = new Set([
  'not-found',
  'inactive',
  'suspendida',
  'cancelada',
  'invalid-expiry',
  'hardware-mismatch',
]);

const toIso = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const nowIso = () => new Date().toISOString();

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onRun(err) {
    if (err) reject(err);
    else resolve(this);
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

const clampDays = (value) => (value < 0 ? 0 : value);

const getNormalizedMacAddresses = () => {
  const interfaces = os.networkInterfaces();
  return Object.values(interfaces)
    .flat()
    .filter(Boolean)
    .filter((network) => !network.internal)
    .map((network) => String(network.mac || '').trim().toLowerCase())
    .filter((mac) => mac && mac !== '00:00:00:00:00:00')
    .sort();
};

const buildMachineFingerprint = (machineScope = '') => {
  const macs = getNormalizedMacAddresses();
  return [
    os.hostname(),
    process.env.COMPUTERNAME || '',
    machineScope,
    macs.join(','),
  ].join('|');
};

const buildHardwareId = (fingerprint) => crypto.createHash('sha256').update(fingerprint).digest('hex');

const computeSignature = (record) => {
  const payload = [
    record.licencia_key || '',
    record.fecha_vencimiento || '',
    record.ultima_sincronizacion || '',
  ].join('|');

  return crypto.createHmac('sha256', signingKey).update(payload).digest('hex');
};

const ensureLicenseTable = async () => {
  await run(`CREATE TABLE IF NOT EXISTS configuracion_licencia (
    licencia_key TEXT,
    fecha_vencimiento TEXT,
    ultima_sincronizacion TEXT,
    firma_seguridad TEXT
  )`);
};

const getLicense = async () => {
  const row = await get('SELECT licencia_key, fecha_vencimiento, ultima_sincronizacion, firma_seguridad FROM configuracion_licencia LIMIT 1');
  return row || null;
};

const upsertLicense = async (record) => {
  await run('DELETE FROM configuracion_licencia');
  await run(
    'INSERT INTO configuracion_licencia (licencia_key, fecha_vencimiento, ultima_sincronizacion, firma_seguridad) VALUES (?,?,?,?)',
    [record.licencia_key, record.fecha_vencimiento, record.ultima_sincronizacion, record.firma_seguridad]
  );
};

const verifySignature = (record) => {
  if (!record?.firma_seguridad) return false;
  const expected = computeSignature(record);
  try {
    return crypto.timingSafeEqual(Buffer.from(record.firma_seguridad), Buffer.from(expected));
  } catch (_) {
    return false;
  }
};

const evaluateLicense = (record) => {
  const now = new Date();
  const expiry = toIso(record?.fecha_vencimiento);
  const lastSync = toIso(record?.ultima_sincronizacion);

  if (!record || !expiry || !lastSync) {
    return { activa: false, diasRestantes: 0, motivo: 'invalid-data' };
  }

  if (!verifySignature(record)) {
    return { activa: false, diasRestantes: 0, motivo: 'signature-mismatch' };
  }

  const lastSyncMs = new Date(lastSync).getTime();
  const nowMs = now.getTime();
  if ((nowMs + CLOCK_ROLLBACK_TOLERANCE_MS) < lastSyncMs) {
    return { activa: false, diasRestantes: 0, motivo: 'clock-rollback-detected' };
  }

  const expiryMs = new Date(expiry).getTime();
  const diffMs = expiryMs - nowMs;
  const days = clampDays(Math.ceil(diffMs / (24 * 60 * 60 * 1000)));

  return {
    activa: diffMs >= 0,
    diasRestantes: days,
    motivo: diffMs >= 0 ? 'ok' : 'expired',
  };
};

const refreshTrustedTimestamp = async (record) => {
  const lastSyncMs = new Date(record.ultima_sincronizacion).getTime();
  const nowMs = Date.now();
  if (Number.isNaN(lastSyncMs) || (nowMs - lastSyncMs) < LAST_SYNC_REFRESH_MS) {
    return record;
  }

  const updated = {
    ...record,
    ultima_sincronizacion: new Date(nowMs).toISOString(),
  };
  updated.firma_seguridad = computeSignature(updated);
  await upsertLicense(updated);
  return updated;
};

const syncWithRemote = async (record) => {
  if (!record?.licencia_key) return { synced: false, record };

  if (!supabase) {
    return { synced: false, record, reason: 'supabase-unconfigured' };
  }

  try {
    const { data, error } = await supabase
      .from('licencias')
      .select('id, licencia_key, estado, fecha_vencimiento, hardware_id')
      .eq('licencia_key', record.licencia_key)
      .maybeSingle();

    if (error) {
      return { synced: false, record, reason: error.message };
    }

    if (!data) {
      return { synced: false, record, reason: 'not-found' };
    }

    if (data.estado !== 'activa') {
      return { synced: false, record, reason: data.estado || 'inactive' };
    }

    if (data.hardware_id && data.hardware_id !== hardwareId) {
      return { synced: false, record, reason: 'hardware-mismatch' };
    }

    if (!data.hardware_id) {
      const { error: updateError } = await supabase
        .from('licencias')
        .update({ hardware_id: hardwareId })
        .eq('id', data.id)
        .is('hardware_id', null);

      if (updateError) {
        return { synced: false, record, reason: updateError.message };
      }
    }

    const normalizedExpiry = toIso(data.fecha_vencimiento);
    if (!normalizedExpiry) {
      return { synced: false, record, reason: 'invalid-expiry' };
    }

    const merged = {
      licencia_key: data.licencia_key || record.licencia_key,
      fecha_vencimiento: normalizedExpiry,
      ultima_sincronizacion: nowIso(),
      firma_seguridad: '',
    };
    merged.firma_seguridad = computeSignature(merged);
    await upsertLicense(merged);

    return { synced: true, record: merged };
  } catch (error) {
    return { synced: false, record, reason: error.message };
  }
};

const activateLicense = async ({ licenciaKey, forceSync = true } = {}) => {
  const key = String(licenciaKey || '').trim();
  if (!key) {
    throw new Error('Se requiere una licencia_key');
  }

  await ensureLicenseTable();
  const record = {
    licencia_key: key,
    fecha_vencimiento: null,
    ultima_sincronizacion: nowIso(),
    firma_seguridad: '',
  };

  const remoteResult = await syncWithRemote(record);
  if (!remoteResult.synced) {
    return {
      activa: false,
      diasRestantes: 0,
      motivo: remoteResult.reason === 'hardware-mismatch' ? 'hardware-mismatch' : 'activation-rejected',
      reason: remoteResult.reason || 'remote-sync-failed',
      licenciaKey: key,
    };
  }

  const syncedRecord = remoteResult.record;
  const status = evaluateLicense(syncedRecord);
  return {
    ...status,
    fechaVencimiento: syncedRecord.fecha_vencimiento,
    licenciaKey: syncedRecord.licencia_key,
    source: 'supabase',
    reason: remoteResult.reason || null,
  };
};

const checkLicenseStatus = async ({ forceSync = false } = {}) => {
  await ensureLicenseTable();
  let current = await getLicense();

  if (!current) {
    return {
      activa: false,
      diasRestantes: 0,
      motivo: 'no-license',
      fechaVencimiento: null,
    };
  }

  if (forceSync || !verifySignature(current)) {
    const remoteResult = await syncWithRemote(current);
    if (!remoteResult.synced && REMOTE_BLOCKING_REASONS.has(remoteResult.reason)) {
      return {
        activa: false,
        diasRestantes: 0,
        motivo: remoteResult.reason,
        fechaVencimiento: current.fecha_vencimiento || null,
      };
    }
    current = remoteResult.record;
  } else {
    const lastSyncMs = new Date(current.ultima_sincronizacion).getTime();
    if (Number.isFinite(lastSyncMs) && (Date.now() - lastSyncMs) > LAST_SYNC_REFRESH_MS) {
      const remoteResult = await syncWithRemote(current);
      if (!remoteResult.synced && REMOTE_BLOCKING_REASONS.has(remoteResult.reason)) {
        return {
          activa: false,
          diasRestantes: 0,
          motivo: remoteResult.reason,
          fechaVencimiento: current.fecha_vencimiento || null,
        };
      }
      current = remoteResult.record;
    }
  }

  const status = evaluateLicense(current);

  if (status.activa) {
    current = await refreshTrustedTimestamp(current);
    const refreshed = evaluateLicense(current);
    return { ...refreshed, fechaVencimiento: current.fecha_vencimiento };
  }

  return { ...status, fechaVencimiento: current.fecha_vencimiento };
};

const initializeLicenseManager = async ({ dbPath, machineScope = '' } = {}) => {
  if (!dbPath) throw new Error('dbPath es requerido para inicializar licenseManager');

  machineFingerprint = buildMachineFingerprint(machineScope);
  hardwareId = buildHardwareId(machineFingerprint);

  const pepper = process.env.LICENSE_PEPPER || 'SACWARE_LICENSE_PEPPER_V1';
  signingKey = crypto.pbkdf2Sync(pepper, machineFingerprint, 120000, 32, 'sha256');

  db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
  await ensureLicenseTable();
};

const registerLicenseHandlers = (ipcMain) => {
  if (!ipcMain) throw new Error('ipcMain es requerido');

  try {
    ipcMain.removeHandler('check-license');
  } catch (_) {}

  ipcMain.handle('check-license', async (_event, payload = {}) => {
    try {
      return await checkLicenseStatus(payload || {});
    } catch (error) {
      return {
        activa: false,
        diasRestantes: 0,
        motivo: 'internal-error',
        error: error.message,
      };
    }
  });

  try {
    ipcMain.removeHandler('activate-license');
  } catch (_) {}

  ipcMain.handle('activate-license', async (_event, payload = {}) => {
    try {
      return await activateLicense(payload || {});
    } catch (error) {
      return {
        activa: false,
        diasRestantes: 0,
        motivo: 'activation-error',
        error: error.message,
      };
    }
  });
};

module.exports = {
  initializeLicenseManager,
  registerLicenseHandlers,
  checkLicenseStatus,
  activateLicense,
};
