const { app, BrowserWindow } = require('electron');
const path = require('path');

// --- 1. CANDADO DE INSTANCIA ÚNICA ---
// Si la app ya está corriendo, cerramos esta nueva instancia inmediatamente.
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // --- 2. LÓGICA PRINCIPAL ---
  let mainWindow;

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      title: "SACWare - Gestión Comercial",
      icon: path.join(__dirname, 'public/logo.png'), 
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
      autoHideMenuBar: true
    });

    // En producción cargamos directamente el archivo local (MÁS RÁPIDO Y SEGURO QUE LOCALHOST)
    // En desarrollo usamos Vite
    if (app.isPackaged) {
      // Intenta cargar desde resources/server/public/index.html
      const prodPath = path.join(process.resourcesPath, 'server', 'public', 'index.html');
      mainWindow.loadFile(prodPath).catch(e => console.error("Fallo al cargar UI:", e));
    } else {
      mainWindow.loadURL('http://localhost:5173');
    }

    mainWindow.on('closed', () => mainWindow = null);
  }

  // --- 3. INICIO DEL SERVIDOR ---
  function startServer() {
    if (!app.isPackaged) return; // En desarrollo ya corres el server aparte

    const serverPath = path.join(process.resourcesPath, 'server', 'index.js');
    
    try {
        process.env.IS_ELECTRON = "true";
        process.env.USER_DATA_PATH = app.getPath('userData'); 
        
        console.log("Iniciando servidor interno desde:", serverPath);
        require(serverPath); 
    } catch (e) {
        console.error("Error iniciando servidor:", e);
    }
  }

  app.on('ready', () => {
      startServer();
      createWindow();
  });

  // Si intentan abrir una segunda instancia, enfocamos la ventana existente
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (mainWindow === null) createWindow();
  });
}