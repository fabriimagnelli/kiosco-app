const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

// Configuración básica del updater
autoUpdater.autoDownload = true;

// Prevenir que errores no capturados muestren el diálogo de error de Electron
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  // Si es EADDRINUSE, no crashear - el servidor maneja el reintento
  if (error.code === 'EADDRINUSE') return;
  // Para otros errores, loguear en escritorio
  try {
    const logPath = path.join(app.getPath('desktop'), 'error_kiosco.txt');
    const msg = `[${new Date().toISOString()}] Uncaught: ${error.message}\nStack: ${error.stack}`;
    fs.appendFileSync(logPath, msg + '\n\n');
  } catch(_) {}
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  let mainWindow;
  let serverStarted = false;

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      title: "SACWare - Gestión Comercial",
      icon: path.join(__dirname, 'build', 'icon.ico'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
      autoHideMenuBar: true,
      show: false // No mostrar hasta que esté listo
    });

    const loadApp = () => {
      const url = app.isPackaged ? 'http://localhost:3001' : 'http://localhost:5173';
      mainWindow.loadURL(url).catch(() => {
        console.log("Falló la carga, reintentando en 1.5s...");
        setTimeout(loadApp, 1500);
      });
    };

    mainWindow.webContents.on('did-finish-load', () => {
      if (!mainWindow.isVisible()) mainWindow.show();
    });

    mainWindow.webContents.on('did-fail-load', (_event, _code, desc) => {
      console.log("did-fail-load:", desc, "- reintentando...");
      setTimeout(loadApp, 1500);
    });

    loadApp();
    mainWindow.on('closed', () => mainWindow = null);
  }

  function startServer() {
    if (!app.isPackaged) return;

    try {
      process.env.IS_ELECTRON = "true";
      process.env.USER_DATA_PATH = app.getPath('userData');
      
      // El servidor está dentro del ASAR (en server/index.js)
      const serverPath = path.join(__dirname, 'server', 'index.js');
      
      console.log("Iniciando servidor interno desde:", serverPath);
      require(serverPath);
      serverStarted = true;
      console.log("Servidor requerido correctamente");

    } catch (e) {
      console.error("Error al iniciar servidor:", e);
      // Escribir error en el escritorio para diagnóstico
      try {
        const logPath = path.join(app.getPath('desktop'), 'error_kiosco.txt');
        const errorMsg = `[${new Date().toISOString()}] Error arranque servidor\nMessage: ${e.message}\nStack: ${e.stack}`;
        fs.writeFileSync(logPath, errorMsg);
      } catch (_) {}
    }
  }

  app.on('ready', () => {
    startServer();
    
    // Check updates (solo si está empaquetado)
    if (app.isPackaged) {
      setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify().catch(e => console.log("Updater error:", e));
      }, 5000);
    }

    // Esperar a que Express arranque antes de abrir la ventana
    setTimeout(createWindow, app.isPackaged ? 2500 : 500);
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
  
  // Eventos del Updater
  autoUpdater.on('update-available', () => console.log('Update available'));
  autoUpdater.on('update-downloaded', () => console.log('Update downloaded'));
}