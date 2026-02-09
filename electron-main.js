const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');
const fs = require('fs');

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
  let serverStarted = false;
  let updateCheckInterval = null;
  let pendingUpdate = null; // Almacena info de actualización pendiente

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      title: "SACWare - Gestión Comercial",
      icon: path.join(__dirname, 'build', 'icon.ico'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
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
    startServer();
    setupAutoUpdater();

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