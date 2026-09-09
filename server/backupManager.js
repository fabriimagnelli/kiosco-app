const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { supabase } = require('./supabaseClient');

const BUCKET_NAME = 'backups';
const RETENTION_COUNT = 5;
const PENDING_KEY = 'backup_pendiente';

let dbPath = '';
let backupInProgress = false;

const setDbPath = (nextDbPath) => {
  dbPath = nextDbPath || '';
};

const sanitizeSegment = (value) => String(value || '')
  .trim()
  .replace(/[^a-zA-Z0-9._-]/g, '_')
  .slice(0, 120);

const buildBackupFileName = () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `backup-${stamp}.db`;
};

const openDb = () => new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);

const dbGet = (database, sql, params = []) => new Promise((resolve, reject) => {
  database.get(sql, params, (error, row) => {
    if (error) reject(error);
    else resolve(row || null);
  });
});

const dbRun = (database, sql, params = []) => new Promise((resolve, reject) => {
  database.run(sql, params, function onRun(error) {
    if (error) reject(error);
    else resolve(this);
  });
});

const ensureConfigTable = async (database) => {
  await dbRun(database, `CREATE TABLE IF NOT EXISTS configuracion (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);
};

const withDb = async (work) => {
  const database = openDb();
  try {
    return await work(database);
  } finally {
    await new Promise((resolve) => database.close(() => resolve()));
  }
};

const getCurrentLicenseKey = async () => withDb(async (database) => {
  const row = await dbGet(database, 'SELECT licencia_key FROM configuracion_licencia LIMIT 1');
  return row?.licencia_key ? String(row.licencia_key).trim() : '';
});

const setConfigValue = async (key, value) => {
  await withDb(async (database) => {
    await ensureConfigTable(database);
    await dbRun(database, 'INSERT OR REPLACE INTO configuracion (key, value) VALUES (?, ?)', [key, String(value)]);
  });
};

const getConfigValue = async (key) => withDb(async (database) => {
  await ensureConfigTable(database);
  const row = await dbGet(database, 'SELECT value FROM configuracion WHERE key = ?', [key]);
  return row?.value ?? null;
});

const setBackupPending = async (isPending) => {
  await setConfigValue(PENDING_KEY, isPending ? 'true' : 'false');
};

const isBackupPending = async () => {
  const value = await getConfigValue(PENDING_KEY);
  return String(value || 'false').toLowerCase() === 'true';
};

const saveLastBackupMetadata = async ({ at, objectPath }) => {
  await withDb(async (database) => {
    await ensureConfigTable(database);
    await dbRun(database, "INSERT OR REPLACE INTO configuracion (key, value) VALUES ('last_cloud_backup_at', ?)", [at]);
    await dbRun(database, "INSERT OR REPLACE INTO configuracion (key, value) VALUES ('last_cloud_backup_path', ?)", [objectPath]);
  });
};

const getLastBackupMetadata = async () => withDb(async (database) => {
  await ensureConfigTable(database);

  const [atRow, pathRow] = await Promise.all([
    dbGet(database, "SELECT value FROM configuracion WHERE key = 'last_cloud_backup_at'"),
    dbGet(database, "SELECT value FROM configuracion WHERE key = 'last_cloud_backup_path'"),
  ]);

  return {
    lastBackupAt: atRow?.value || null,
    lastBackupPath: pathRow?.value || null,
  };
});

const applyRetention = async (licenseFolder) => {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(licenseFolder, {
      limit: 100,
      sortBy: { column: 'name', order: 'desc' },
    });

  if (error) {
    throw new Error(`No se pudo listar backups remotos: ${error.message}`);
  }

  const backups = (data || [])
    .filter((item) => item?.name && item.name.startsWith('backup-') && item.name.endsWith('.db'))
    .sort((a, b) => b.name.localeCompare(a.name));

  const removable = backups.slice(RETENTION_COUNT).map((item) => `${licenseFolder}/${item.name}`);
  if (removable.length === 0) return;

  const { error: removeError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(removable);

  if (removeError) {
    throw new Error(`No se pudo aplicar retención remota: ${removeError.message}`);
  }
};

const forceBackup = async ({ queueOnFailure = false } = {}) => {
  if (backupInProgress) {
    return {
      success: false,
      error: 'Ya hay una subida de backup en progreso.',
      busy: true,
    };
  }

  backupInProgress = true;
  try {
  if (!supabase) {
    throw new Error('Supabase no está configurado en este entorno.');
  }

  if (!dbPath) {
    throw new Error('backupManager no inicializado: falta dbPath.');
  }

  if (!fs.existsSync(dbPath)) {
    throw new Error('No se encontró el archivo kiosco.db local.');
  }

  const licenciaKey = await getCurrentLicenseKey();
  if (!licenciaKey) {
    throw new Error('No se encontró licencia local para estructurar el backup remoto.');
  }

  const licenseFolder = sanitizeSegment(licenciaKey);
  if (!licenseFolder) {
    throw new Error('La licencia local no es válida para crear la ruta del backup.');
  }

  const fileName = buildBackupFileName();
  const objectPath = `${licenseFolder}/${fileName}`;
  const fileBuffer = fs.readFileSync(dbPath);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(objectPath, fileBuffer, {
      contentType: 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`No se pudo subir backup a Supabase: ${uploadError.message}`);
  }

  await applyRetention(licenseFolder);

  const savedAt = new Date().toISOString();
  await saveLastBackupMetadata({ at: savedAt, objectPath });
  await setBackupPending(false);

  return {
    success: true,
    bucket: BUCKET_NAME,
    path: objectPath,
    savedAt,
    retention: RETENTION_COUNT,
  };
  } catch (error) {
    if (queueOnFailure) {
      await setBackupPending(true);
    }
    throw error;
  } finally {
    backupInProgress = false;
  }
};

const markBackupPending = async () => {
  await setBackupPending(true);
  return { success: true, pending: true };
};

const processPendingBackups = async () => {
  if (backupInProgress) {
    return { success: false, processed: false, pending: await isBackupPending(), busy: true };
  }

  const pending = await isBackupPending();
  if (!pending) {
    return { success: true, processed: false, pending: false };
  }

  try {
    const result = await forceBackup({ queueOnFailure: true });
    return {
      success: true,
      processed: true,
      pending: false,
      result,
    };
  } catch (error) {
    return {
      success: false,
      processed: false,
      pending: true,
      error: error.message,
    };
  }
};

const getLastBackupStatus = async () => {
  const metadata = await getLastBackupMetadata();
  const pending = await isBackupPending();
  return {
    success: true,
    ...metadata,
    pending,
  };
};

module.exports = {
  setDbPath,
  forceBackup,
  markBackupPending,
  processPendingBackups,
  getLastBackupStatus,
};
