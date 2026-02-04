const { app, BrowserWindow } = require('electron');
const path = require('path');

// Determinar entorno
const isDev = !app.isPackaged;

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

  // En producción usamos el puerto local, en desarrollo Vite
  const startUrl = 'http://localhost:3001'; 
  
  const loadWindow = () => {
      mainWindow.loadURL(startUrl).catch(() => {
          console.log("Esperando al servidor...");
          setTimeout(loadWindow, 1000);
      });
  };
  
  loadWindow();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  if (isDev) {
    console.log("Modo desarrollo...");
  } else {
    // MODO PRODUCCIÓN
    const serverPath = path.join(process.resourcesPath, 'server', 'index.js');
    
    try {
        process.env.IS_ELECTRON = "true";
        process.env.USER_DATA_PATH = app.getPath('userData'); 
        // Eliminamos process.env.DIST_PATH porque ya no es necesario
        
        console.log("Iniciando servidor interno...");
        require(serverPath); 
    } catch (e) {
        console.error("Error fatal iniciando servidor:", e);
    }
  }
}

app.on('ready', () => {
    startServer();
    createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});