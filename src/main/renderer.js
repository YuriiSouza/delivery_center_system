import { ipcRenderer } from 'electron';

// Quando houver atualização disponível
ipcRenderer.on('update_available', () => {
  // Mostrar notificação
  showNotification('Nova versão disponível! Baixando...');
});

// Quando download terminar
ipcRenderer.on('update_downloaded', () => {
  // Mostrar botão para reiniciar
  const result = confirm('Atualização baixada! Reiniciar agora?');
  if (result) {
    ipcRenderer.send('restart_app');
  }
});