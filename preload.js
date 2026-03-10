const { contextBridge, ipcRenderer } = require('electron');

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
});
