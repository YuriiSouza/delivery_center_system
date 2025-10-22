const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');
const isDev = require('electron-is-dev');

// Importar IPC handlers
require('./ipc-handlers');

// Configurar logs
log.transports.file.level = 'info';
autoUpdater.logger = log;

let mainWindow;

// ===== CRIAR JANELA PRINCIPAL =====
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    icon: path.join(__dirname, '../../build/icon.png'),
    show: false, // Não mostrar até carregar
  });

  // Carregar app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist-react/index.html'));
  }

  // Mostrar quando pronto
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Limpar referência ao fechar
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ===== CICLO DE VIDA DO APP =====
app.whenReady().then(() => {
  createWindow();

  // Verificar atualizações após 5 segundos
  if (!isDev) {
    setTimeout(() => {
      log.info('Verificando atualizações...');
      autoUpdater.checkForUpdatesAndNotify();
    }, 5000);

    // Verificar a cada 4 horas
    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 4 * 60 * 60 * 1000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ===== AUTO UPDATER =====

autoUpdater.on('checking-for-update', () => {
  log.info('Verificando atualizações...');
  sendStatusToWindow('update-checking');
});

autoUpdater.on('update-available', (info) => {
  log.info('Atualização disponível:', info.version);
  sendStatusToWindow('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
  log.info('App está atualizado');
  sendStatusToWindow('update-not-available', info);
});

autoUpdater.on('error', (err) => {
  log.error('Erro na atualização:', err);
  sendStatusToWindow('update-error', err.message);
});

autoUpdater.on('download-progress', (progressObj) => {
  let message = `Download: ${Math.round(progressObj.percent)}%`;
  log.info(message);
  sendStatusToWindow('update-download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Atualização baixada:', info.version);
  sendStatusToWindow('update-downloaded', info);
});

function sendStatusToWindow(event, data) {
  if (mainWindow) {
    mainWindow.webContents.send(event, data);
  }
}

// ===== IPC HANDLERS =====

// Reiniciar app para instalar atualização
ipcMain.on('restart-app', () => {
  log.info('Reiniciando app para instalar atualização...');
  autoUpdater.quitAndInstall(true, true);
});

// Verificar atualizações manualmente
ipcMain.on('check-for-updates', () => {
  log.info('Verificação manual de atualizações');
  autoUpdater.checkForUpdates();
});

// Obter versão do app
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Obter caminho de recursos
ipcMain.handle('get-resources-path', () => {
  return process.resourcesPath;
});

// Log para debug
ipcMain.on('log-message', (event, message) => {
  log.info('[Renderer]', message);
});

