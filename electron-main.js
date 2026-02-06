const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// --- 1. CANDADO DE INSTANCIA ÚNICA ---
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  let mainWindow;

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      title: "SACWare - Gestión Comercial",
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
      autoHideMenuBar: true
    });

    if (app.isPackaged) {
      // En producción, cargar desde resources/server/public/index.html
      const prodPath = path.join(process.resourcesPath, 'server', 'public', 'index.html');
      console.log("Ruta de producción:", prodPath);
      console.log("¿Existe el archivo?", fs.existsSync(prodPath));

      if (fs.existsSync(prodPath)) {
        mainWindow.loadFile(prodPath).catch(e => console.error("Fallo al cargar UI:", e));
      } else {
        // Fallback a localhost si el archivo no existe
        console.log("Intentando localhost...");
        mainWindow.loadURL('http://localhost:3001');
      }
    } else {
      // En desarrollo usar Vite
      mainWindow.loadURL('http://localhost:5173');
    }

    mainWindow.on('closed', () => mainWindow = null);
  }

  // --- 3. INICIO DEL SERVIDOR ---
  function startServer() {
    if (!app.isPackaged) return; // En desarrollo ya corres el server aparte

    try {
      process.env.IS_ELECTRON = "true";
      process.env.USER_DATA_PATH = app.getPath('userData');

      const serverDir = path.join(process.resourcesPath, 'server');
      const serverPath = path.join(serverDir, 'index.js');

      console.log("Iniciando servidor desde:", serverPath);
      console.log("Directorio del servidor:", serverDir);
      console.log("¿Existe el archivo?", fs.existsSync(serverPath));

      // Cambiar al directorio del servidor antes de requerirlo
      process.chdir(serverDir);

      // Requerir el servidor
      require(serverPath);

      console.log("Servidor iniciado correctamente");

    } catch (e) {
      console.error("Error iniciando servidor:", e);
      console.error("Stack:", e.stack);
    }
  }

  app.on('ready', () => {
    startServer();
    // Esperar un poquito para que el servidor arranque
    setTimeout(() => {
      createWindow();
    }, 1500);
  });

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