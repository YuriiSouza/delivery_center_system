  // ===== IMPORTAÇÕES CORRIGIDAS =====
  import electron from 'electron';
  const { ipcMain, dialog, app } = electron;

  import log from 'electron-log';

  import SheetsManager from './sheets.js';
  import WhatsAppAutomation from './whatsapp.js';
  import Store from 'electron-store';
  import UpdateReports from './reports.js';

  // ===== CONFIGURAÇÃO DE LOG =====
  log.transports.file.level = 'info';
  log.transports.console.level = 'debug';

  // ===== INSTÂNCIAS GLOBAIS =====
  const sheetsManager = new SheetsManager();
  const whatsappAutomation = new WhatsAppAutomation();
  const store = new Store({
      encryptionKey: 'hiagpwe-gsdf-hsff'
    });
    
    // ===== CONFIGURAÇÕES =====

  ipcMain.handle('get-config', () => {
    return store.get('config');
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


  // ===== Relatorios =====

  const savedConfig = store.get('config') || {};
  const spreadsheetId = savedConfig.spreadsheetId || null;
  const reports = new UpdateReports(spreadsheetId);

  // Login no portal
  ipcMain.handle('portal-login', async () => {
    try {
      return reports
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Baixar relatório
  ipcMain.handle('download-report', async (event, reportId) => {
    try {
      // Aqui você navega até a página do relatório e baixa
      // Exemplo:
      // await driver.get(`https://portal.exemplo.com/relatorios/${reportId}` );
      // await driver.findElement(By.id('download-btn')).click();
      // await sleep(5000); // Aguardar download
      
      const filePath = `/caminho/para/downloads/${reportId}.xlsx`;
      
      return { success: true, filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Enviar para Google Sheets
  ipcMain.handle('upload-report-to-sheets', async (event, params) => {
    try {
      const { reportId, filePath } = params;
      
      // Aqui você lê o arquivo e envia para o Sheets
      // Exemplo:
      // const data = await readExcelFile(filePath);
      // await sheetsManager.updateData({
      //   spreadsheetId: 'seu-spreadsheet-id',
      //   range: `${reportId}!A1`,
      //   values: data
      // });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Parar atualização
  ipcMain.handle('stop-report-update', async () => {
    // Implementar lógica de parada
    return { success: true };
  });


  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  export default {
    sheetsManager,
    whatsappAutomation,
    store,
    UpdateReports
  };
