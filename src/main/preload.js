const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Sistema - Informações do App
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Configurações
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),

  // Google Sheets
  sheetsInitialize: (credentialsPath) => ipcRenderer.invoke('sheets-initialize', credentialsPath),
  sheetsGetPhoneNumbers: (params) => ipcRenderer.invoke('sheets-get-phone-numbers', params),
  sheetsGetData: (params) => ipcRenderer.invoke('sheets-get-data', params),
  sheetsUpdateData: (params) => ipcRenderer.invoke('sheets-update-data', params),
  sheetsAppendData: (params) => ipcRenderer.invoke('sheets-append-data', params),

  // WhatsApp
  whatsappInitialize: () => ipcRenderer.invoke('whatsapp-initialize'),
  whatsappSendBulk: (params) => ipcRenderer.invoke('whatsapp-send-bulk', params),
  whatsappStop: () => ipcRenderer.invoke('whatsapp-stop'),
  whatsappClose: () => ipcRenderer.invoke('whatsapp-close'),
  whatsappStatus: () => ipcRenderer.invoke('whatsapp-status'),
  
  // Listener para progresso do WhatsApp
  onWhatsappProgress: (callback) => {
    ipcRenderer.on('whatsapp-progress', (event, data) => callback(data));
  },

  // Sistema
  selectFile: () => ipcRenderer.invoke('select-file'),

  // Histórico
  saveHistory: (historyItem) => ipcRenderer.invoke('save-history', historyItem),
  getHistory: () => ipcRenderer.invoke('get-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
});
