const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    request: (payload, options = {}) => {
        if (payload === 'check-license') {
            return ipcRenderer.invoke('check-license', options);
        }
        return ipcRenderer.invoke('backend:request', payload);
    },
    uploadFile: (payload) => ipcRenderer.invoke('backend:upload', payload),
    exportProductosCsv: () => ipcRenderer.invoke('backend:export-productos-csv'),
    checkLicense: (options = {}) => ipcRenderer.invoke('check-license', options),
    activateLicense: (payload = {}) => ipcRenderer.invoke('activate-license', payload),
    forceBackup: () => ipcRenderer.invoke('backup:force'),
    getLastBackupAt: () => ipcRenderer.invoke('backup:last-success'),
    markBackupPending: () => ipcRenderer.invoke('backup:mark-pending'),
    processPendingBackups: () => ipcRenderer.invoke('backup:process-pending'),
    getUploadUrl: (fileName) => fileName ? `kiosco-media://uploads/${encodeURIComponent(fileName)}` : null,
});

contextBridge.exposeInMainWorld('electronAPI', {
    // Escuchar cuando hay una actualización lista para instalar
    onUpdateReady: (callback) => {
        ipcRenderer.on('update-ready', (_event, data) => callback(data));
    },
    // Instalar la actualización pendiente (reinicia la app)
    installUpdate: () => ipcRenderer.send('install-update'),
    // Consultar si hay una actualización pendiente
    getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
    // Restaurar el foco al webContents desde el proceso principal
    refocusWindow: () => ipcRenderer.invoke('refocus-window'),
    // Escuchar cambios en estado de backup cloud (última copia / pendiente)
    onBackupUpdated: (callback) => {
        ipcRenderer.on('backup:updated', (_event, data) => callback(data));
    },
});
