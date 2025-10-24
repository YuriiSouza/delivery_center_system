// ===== IMPORTAÇÕES =====
import electron, { ipcMain, session } from 'electron';
const { app, BrowserWindow } = electron;

import path from 'path';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';

// Para usar __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importa os handlers IPC
import './ipc-handlers.js';
import autoUpdaterPkg from 'electron-updater';
const { autoUpdater } = autoUpdaterPkg;

// ===== VARIÁVEL GLOBAL =====
let mainWindow;

// ===== FUNÇÃO PARA CRIAR A JANELA =====
function createWindow() {

  const csp = isDev
    ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
    : "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self';";

  session.defaultSession.webRequest.onHeadersReceived((details, callback ) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    });
  });

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,                  // Isola o renderer process
      webSecurity: true,              // Habilita segurança web
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      enableRemoteModule: false,
    }
  });

  // Abre o DevTools automaticamente em desenvolvimento
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  if (isDev) {
    // Em desenvolvimento, carrega do servidor Vite
    mainWindow.loadURL('http://localhost:3000' );
  } else {
    // Em produção, carrega o arquivo HTML buildado
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  // Log de erros de carregamento
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ Falha ao carregar:', errorCode, errorDescription);
  });

  // Log quando carregar com sucesso
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Conteúdo carregado com sucesso!');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ===== CICLO DE VIDA DO APP =====

app.whenReady().then(() => {
  console.log('🚀 Electron está pronto!');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 5000);
  
  // Verificar a cada 4 horas
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 4 * 60 * 60 * 1000);
});

// Quando começar a verificar
autoUpdater.on('checking-for-update', () => {
  log.info('Verificando atualizações...');
  mainWindow.webContents.send('update-checking');
});

// Quando houver atualização disponível
autoUpdater.on('update-available', (info) => {
  log.info('Atualização disponível:', info.version);
  mainWindow.webContents.send('update-available', info);
});

// Quando NÃO houver atualização
autoUpdater.on('update-not-available', (info) => {
  log.info('App está atualizado');
  mainWindow.webContents.send('update-not-available');
});

// Progresso do download
autoUpdater.on('download-progress', (progressObj) => {
  log.info('Download:', progressObj.percent + '%');
  mainWindow.webContents.send('update-download-progress', progressObj);
});

// Quando download terminar
autoUpdater.on('update-downloaded', (info) => {
  log.info('Atualização baixada:', info.version);
  mainWindow.webContents.send('update-downloaded', info);
});

// Erro
autoUpdater.on('error', (err) => {
  log.error('Erro na atualização:', err);
  mainWindow.webContents.send('update-error', err);
});

// ===== IPC HANDLERS =====

// Quando usuário clicar em "Atualizar Agora"
ipcMain.on('restart-app', () => {
  autoUpdater.quitAndInstall();
});

// Verificar manualmente
ipcMain.on('check-for-updates', () => {
  autoUpdater.checkForUpdates();
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
