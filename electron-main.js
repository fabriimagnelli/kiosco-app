const { app, BrowserWindow, dialog, ipcMain, protocol, net } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// ─── Configuración de logging ───────────────────────────────────────────────
// electron-log guarda en: %USERPROFILE%\AppData\Roaming\sacware-kiosco\logs\main.log
log.transports.file.level = 'info';
log.transports.file.maxSize = 5 * 1024 * 1024; // 5 MB máximo por archivo de log
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// ─── Configuración del auto-updater ─────────────────────────────────────────
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowDowngrade = false;

// Prevenir que errores no capturados muestren el diálogo de error de Electron
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error.message);
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
  let updateCheckInterval = null;
  let pendingUpdate = null; // Almacena info de actualización pendiente
  let backend = null;

  function initializeBackend() {
    process.env.IS_ELECTRON = 'true';
    process.env.DISABLE_HTTP_SERVER = 'true';
    process.env.USER_DATA_PATH = app.getPath('userData');
    process.env.SERVER_ROOT = path.join(__dirname, 'server');

    backend = require('./server/index.js');
    const { registerIpcHandlers } = require('./server/ipcHandlers');
    const { initializeLicenseManager, registerLicenseHandlers } = require('./server/licenseManager');
    registerIpcHandlers();

    initializeLicenseManager({
      dbPath: backend.dbPath,
      machineScope: app.getPath('userData'),
    }).catch((error) => {
      log.error('Error inicializando gestor de licencias:', error.message);
    });

    registerLicenseHandlers(ipcMain);
  }

  function registerMediaProtocol() {
    if (typeof protocol.handle === 'function') {
      protocol.handle('kiosco-media', async (request) => {
        try {
          const url = new URL(request.url);
          if (url.hostname !== 'uploads' || !backend?.uploadsPath) {
            return new Response('Not found', { status: 404 });
          }

          const fileName = path.basename(decodeURIComponent(url.pathname));
          const filePath = path.join(backend.uploadsPath, fileName);
          if (!fs.existsSync(filePath)) {
            return new Response('Not found', { status: 404 });
          }

          return net.fetch(pathToFileURL(filePath).toString());
        } catch (error) {
          log.error('Error sirviendo recurso local:', error.message);
          return new Response('Internal error', { status: 500 });
        }
      });
      return;
    }

    if (typeof protocol.registerFileProtocol === 'function') {
      protocol.registerFileProtocol('kiosco-media', (request, callback) => {
        try {
          const url = new URL(request.url);
          if (url.hostname !== 'uploads' || !backend?.uploadsPath) {
            callback({ error: -6 });
            return;
          }

          const fileName = path.basename(decodeURIComponent(url.pathname));
          const filePath = path.join(backend.uploadsPath, fileName);
          if (!fs.existsSync(filePath)) {
            callback({ error: -6 });
            return;
          }

          callback({ path: filePath });
        } catch (error) {
          log.error('Error sirviendo recurso local:', error.message);
          callback({ error: -6 });
        }
      });
    }
  }

  function createWindow() {
    // El preload debe apuntar al archivo desempaquetado en disco
    const preloadPath = app.isPackaged
      ? path.join(__dirname.replace('app.asar', 'app.asar.unpacked'), 'preload.js')
      : path.join(__dirname, 'preload.js');

    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      title: "SACWare - Gestión Comercial",
      icon: path.join(__dirname, 'build', 'icon.ico'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
      },
      autoHideMenuBar: true,
      show: false // No mostrar hasta que esté listo
    });

    const loadApp = () => {
      const loadPromise = app.isPackaged
        ? mainWindow.loadFile(path.join(__dirname, 'server', 'public', 'index.html'))
        : mainWindow.loadURL('http://localhost:5173');

      loadPromise.catch(() => {
        console.log('Falló la carga, reintentando en 1.5s...');
        setTimeout(loadApp, 1500);
      });
    };

    mainWindow.webContents.on('did-finish-load', () => {
      if (!mainWindow.isVisible()) mainWindow.show();
    });

    // FIX: Restaurar foco al webContents tras diálogos nativos (alert/confirm)
    mainWindow.on('focus', () => {
      mainWindow.webContents.focus();
    });

    mainWindow.webContents.on('did-fail-load', (_event, _code, desc) => {
      console.log("did-fail-load:", desc, "- reintentando...");
      setTimeout(loadApp, 1500);
    });

    loadApp();
    mainWindow.on('closed', () => mainWindow = null);
  }

  // ─── Función de chequeo de actualizaciones ──────────────────────────────
  function checkForUpdates() {
    if (!app.isPackaged) return;
    log.info('Buscando actualizaciones...');
    autoUpdater.checkForUpdates().catch(err => {
      log.warn('Error al buscar actualizaciones:', err.message);
    });
  }

  function setupAutoUpdater() {
    if (!app.isPackaged) return;

    // Primer chequeo: 10 segundos después de iniciar
    setTimeout(checkForUpdates, 10 * 1000);

    // Re-chequeo periódico cada 30 minutos
    updateCheckInterval = setInterval(checkForUpdates, 30 * 60 * 1000);
  }

  app.on('ready', () => {
    initializeBackend();
    registerMediaProtocol();
    setupAutoUpdater();
    createWindow();
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
  
  // ─── Eventos del Auto-Updater ───────────────────────────────────────────
  autoUpdater.on('checking-for-update', () => {
    log.info('Verificando si hay actualizaciones...');
  });

  autoUpdater.on('update-available', (info) => {
    log.info(`Actualización disponible: v${info.version}`);
    // Notificar al usuario que se está descargando
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', {
        status: 'downloading',
        version: info.version
      });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info(`App actualizada (v${info.version}). No hay nuevas versiones.`);
  });

  autoUpdater.on('download-progress', (progress) => {
    log.info(`Descargando actualización: ${Math.round(progress.percent)}%`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info(`Actualización v${info.version} descargada. Listo para instalar.`);
    
    // Guardar estado de actualización pendiente
    pendingUpdate = { version: info.version, date: new Date().toISOString() };
    
    // Notificar al renderer (para banner y botón en Configuración)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-ready', pendingUpdate);
    }
    
    // Preguntar al usuario si quiere reiniciar ahora
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Actualización disponible',
        message: `Se descargó la versión ${info.version} de SACWare Kiosco.`,
        detail: 'La actualización se instalará al reiniciar la aplicación. ¿Desea reiniciar ahora?',
        buttons: ['Reiniciar ahora', 'Más tarde'],
        defaultId: 0,
        cancelId: 1
      }).then(({ response }) => {
        if (response === 0) {
          log.info('Usuario eligió reiniciar ahora para actualizar.');
          autoUpdater.quitAndInstall(false, true);
        } else {
          log.info('Usuario pospuso la actualización. Disponible desde Configuración.');
        }
      });
    } else {
      // Si no hay ventana, instalar silenciosamente al cerrar
      log.info('Sin ventana activa. La actualización se instalará al cerrar.');
    }
  });

  // ─── IPC Handlers para comunicación con el renderer ────────────────────
  ipcMain.handle('refocus-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
      mainWindow.webContents.focus();
    }
  });

  ipcMain.handle('get-update-status', () => {
    return pendingUpdate;
  });

  ipcMain.on('install-update', () => {
    log.info('Usuario solicitó instalar actualización desde la UI.');
    autoUpdater.quitAndInstall(false, true);
  });

  autoUpdater.on('error', (err) => {
    log.error('Error en auto-updater:', err.message);
    // No molestar al usuario con errores de red - se reintentará en 30 min
  });
}