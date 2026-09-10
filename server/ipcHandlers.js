const { ipcMain, dialog, app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const backend = require('./index');
const backupManager = require('./backupManager');

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
};

const toErrorResult = (error) => ({
  ok: false,
  status: 500,
  headers: JSON_HEADERS,
  body: { error: error.message || 'Error interno' },
  bodyType: 'json',
  meta: null,
});

const ARRAY_RESPONSE_PATHS = new Set([
  '/api/reportes/productos_top',
  '/api/reportes/ventas_semana',
  '/api/reportes/metodos_pago',
]);

const normalizeArrayResult = (requestPath, result) => {
  if (!ARRAY_RESPONSE_PATHS.has(requestPath)) {
    return result;
  }

  if (Array.isArray(result?.body)) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    headers: JSON_HEADERS,
    body: [],
    bodyType: 'json',
    meta: result?.meta || null,
  };
};

const decodeRendererFile = (file) => {
  if (!file?.buffer) {
    throw new Error('No se envió archivo');
  }

  return {
    fieldname: file.fieldName,
    originalname: file.name,
    mimetype: file.type,
    size: file.size,
    buffer: Buffer.from(file.buffer, 'base64'),
  };
};

const handleUpload = async (payload = {}) => {
  const file = decodeRendererFile(payload.file);
  const productMatch = payload.path?.match(/^\/api\/productos\/(\d+)\/imagen$/);
  if (productMatch) {
    const body = await backend.guardarImagenProducto(productMatch[1], file);
    return { ok: true, status: 200, headers: JSON_HEADERS, body, bodyType: 'json', meta: null };
  }

  const cierreMatch = payload.path?.match(/^\/api\/cierres\/(\d+)\/foto_arqueo$/);
  if (cierreMatch) {
    const body = await backend.guardarFotoArqueo(cierreMatch[1], file);
    return { ok: true, status: 200, headers: JSON_HEADERS, body, bodyType: 'json', meta: null };
  }

  throw new Error('Ruta de upload no soportada por IPC');
};

const handleProductosCsvExport = async () => {
  const result = await backend.dispatchIpcRequest({
    path: '/api/productos/exportar/csv',
    method: 'GET',
  });

  if (!result.ok) return result;

  const filename = result.meta?.filename || `productos_${new Date().toISOString().slice(0, 10)}.csv`;
  const saveResult = await dialog.showSaveDialog({
    title: 'Guardar exportación CSV',
    defaultPath: path.join(app.getPath('downloads'), filename),
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });

  if (saveResult.canceled || !saveResult.filePath) {
    return {
      ok: false,
      status: 499,
      headers: JSON_HEADERS,
      body: { canceled: true },
      bodyType: 'json',
      meta: null,
    };
  }

  const content = result.bodyType === 'base64'
    ? Buffer.from(result.body, 'base64')
    : Buffer.from(result.body || '', 'utf-8');

  fs.writeFileSync(saveResult.filePath, content);
  return {
    ok: true,
    status: 200,
    headers: JSON_HEADERS,
    body: { success: true, filePath: saveResult.filePath },
    bodyType: 'json',
    meta: { filePath: saveResult.filePath },
  };
};

const registerHandler = (channel, handler) => {
  try {
    ipcMain.removeHandler(channel);
  } catch (_) {}
  ipcMain.handle(channel, handler);
};

const emitBackupUpdated = async () => {
  const status = await backupManager.getLastBackupStatus();
  BrowserWindow.getAllWindows().forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send('backup:updated', status);
    }
  });
};

const registerIpcHandlers = () => {
  backupManager.setDbPath(backend.dbPath);

  registerHandler('backend:request', async (_event, payload = {}) => {
    try {
      const result = await backend.dispatchIpcRequest(payload);
      return normalizeArrayResult(payload?.path, result);
    } catch (error) {
      if (ARRAY_RESPONSE_PATHS.has(payload?.path)) {
        return {
          ok: true,
          status: 200,
          headers: JSON_HEADERS,
          body: [],
          bodyType: 'json',
          meta: null,
        };
      }
      return toErrorResult(error);
    }
  });

  registerHandler('backend:upload', async (_event, payload = {}) => {
    try {
      return await handleUpload(payload);
    } catch (error) {
      return toErrorResult(error);
    }
  });

  registerHandler('backend:export-productos-csv', async () => {
    try {
      return await handleProductosCsvExport();
    } catch (error) {
      return toErrorResult(error);
    }
  });

  registerHandler('backup:force', async () => {
    try {
      const result = await backupManager.forceBackup({ queueOnFailure: true });
      if (result?.success) {
        await emitBackupUpdated();
      }
      return result;
    } catch (error) {
      let pending = false;
      try {
        const status = await backupManager.getLastBackupStatus();
        pending = !!status?.pending;
      } catch (_) {}
      return {
        success: false,
        error: error.message || 'No se pudo subir el backup a la nube.',
        pending,
      };
    }
  });

  registerHandler('backup:last-success', async () => {
    try {
      return await backupManager.getLastBackupStatus();
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo consultar el último backup cloud.',
      };
    }
  });

  registerHandler('backup:mark-pending', async () => {
    try {
      const result = await backupManager.markBackupPending();
      await emitBackupUpdated();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo encolar el backup pendiente.',
      };
    }
  });

  registerHandler('backup:process-pending', async () => {
    try {
      const result = await backupManager.processPendingBackups();
      if (result?.processed) {
        await emitBackupUpdated();
      }
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo procesar la cola de backups pendientes.',
      };
    }
  });
};

module.exports = {
  registerIpcHandlers,
};
