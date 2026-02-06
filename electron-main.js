const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

// Configuración básica del updater
autoUpdater.autoDownload = true;

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
      icon: path.join(__dirname, 'build/icon.ico'), // Asegúrate que este icono exista o comenta si da error
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
      autoHideMenuBar: true
    });

    if (app.isPackaged) {
      // Intentar cargar desde el servidor local
      mainWindow.loadURL('http://localhost:3001');
      
      // Manejar fallos de carga (reintentar si el servidor tarda en arrancar)
      mainWindow.webContents.on('did-fail-load', () => {
        console.log("Falló la carga, reintentando en 1s...");
        setTimeout(() => mainWindow.loadURL('http://localhost:3001'), 1000);
      });
    } else {
      mainWindow.loadURL('http://localhost:5173');
    }

    mainWindow.on('closed', () => mainWindow = null);
  }

  function startServer() {
    if (!app.isPackaged) return;

    try {
      process.env.IS_ELECTRON = "true";
      process.env.USER_DATA_PATH = app.getPath('userData');
      
      // CAMBIO CLAVE: Usamos __dirname para buscar el servidor DENTRO del paquete ASAR
      // donde sí están las dependencias (Express, SQLite, etc.)
      const serverPath = path.join(__dirname, 'server/index.js');
      
      console.log("Iniciando servidor interno desde:", serverPath);

      // NO usamos chdir porque rompe la ruta a node_modules en ASAR
      // process.chdir(...) <--- BORRADO

      require(serverPath);
      console.log("Servidor requerido correctamente");

    } catch (e) {
      // Escribir error en un archivo en el escritorio para poder leerlo si falla
      const logPath = path.join(app.getPath('desktop'), 'error_kiosco.txt');
      fs.writeFileSync(logPath, `Error arranque: ${e.message}\nStack: ${e.stack}`);
    }
  }

  app.on('ready', () => {
    startServer();
    
    // Check updates
    setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify().catch(e => console.log(e));
    }, 2000);

    // Esperar 2 segundos para asegurar que Express arranque
    setTimeout(createWindow, 2000);
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
  
  // Eventos del Updater (Opcionales para log)
  autoUpdater.on('update-available', () => console.log('Update available'));
  autoUpdater.on('update-downloaded', () => console.log('Update downloaded'));
}