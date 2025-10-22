const { ipcMain } = require('electron');
const SheetsManager = require('./sheets');
const WhatsAppAutomation = require('./whatsapp');
const Store = require('electron-store');
const path = require('path');

// Instâncias globais
const sheetsManager = new SheetsManager();
const whatsappAutomation = new WhatsAppAutomation();
const store = new Store();

// ===== CONFIGURAÇÕES =====

ipcMain.handle('get-config', () => {
  return store.get('config', {
    spreadsheetId: '',
    sheetName: 'Visão Geral Atribuições',
    phoneColumn: 'P',
    message: 'Bom dia driver, tem convocação no seu app!',
    delay: 3000,
  });
});

ipcMain.handle('save-config', (event, config) => {
  store.set('config', config);
  return { success: true };
});

// ===== GOOGLE SHEETS =====

ipcMain.handle('sheets-initialize', async (event, credentialsPath) => {
  return await sheetsManager.initialize(credentialsPath);
});

ipcMain.handle('sheets-get-phone-numbers', async (event, { spreadsheetId, sheetName, column }) => {
  return await sheetsManager.getPhoneNumbers(spreadsheetId, sheetName, column);
});

ipcMain.handle('sheets-get-data', async (event, { spreadsheetId, range }) => {
  return await sheetsManager.getData(spreadsheetId, range);
});

ipcMain.handle('sheets-update-data', async (event, { spreadsheetId, range, values }) => {
  return await sheetsManager.updateData(spreadsheetId, range, values);
});

ipcMain.handle('sheets-append-data', async (event, { spreadsheetId, range, values }) => {
  return await sheetsManager.appendData(spreadsheetId, range, values);
});

// ===== WHATSAPP =====

ipcMain.handle('whatsapp-initialize', async (event) => {
  return new Promise((resolve) => {
    whatsappAutomation.initialize((progress) => {
      event.sender.send('whatsapp-progress', { type: 'init', message: progress });
    }).then(resolve);
  });
});

ipcMain.handle('whatsapp-send-bulk', async (event, { phoneNumbers, message, delay }) => {
  return new Promise((resolve) => {
    whatsappAutomation.sendBulkMessages(
      phoneNumbers,
      message,
      delay,
      (progress) => {
        event.sender.send('whatsapp-progress', progress);
      }
    ).then(resolve);
  });
});

ipcMain.handle('whatsapp-stop', () => {
  whatsappAutomation.stop();
  return { success: true };
});

ipcMain.handle('whatsapp-close', async () => {
  return await whatsappAutomation.close();
});

ipcMain.handle('whatsapp-status', () => {
  return whatsappAutomation.getStatus();
});

// ===== SISTEMA =====

ipcMain.handle('select-file', async (event) => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'JSON', extensions: ['json'] }
    ]
  });

  if (result.canceled) {
    return { success: false, canceled: true };
  }

  return { success: true, path: result.filePaths[0] };
});

// ===== HISTÓRICO =====

ipcMain.handle('save-history', (event, historyItem) => {
  const history = store.get('history', []);
  history.unshift({
    ...historyItem,
    timestamp: new Date().toISOString(),
  });

  // Manter apenas últimos 100 registros
  if (history.length > 100) {
    history.pop();
  }

  store.set('history', history);
  return { success: true };
});

ipcMain.handle('get-history', () => {
  return store.get('history', []);
});

ipcMain.handle('clear-history', () => {
  store.set('history', []);
  return { success: true };
});

module.exports = {
  sheetsManager,
  whatsappAutomation,
  store,
};

