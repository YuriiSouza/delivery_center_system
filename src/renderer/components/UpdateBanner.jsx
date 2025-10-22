import React, { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');

function UpdateBanner() {
  const [updateState, setUpdateState] = useState('idle');
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    // Verificando atualizações
    ipcRenderer.on('update-checking', () => {
      setUpdateState('checking');
    });

    // Atualização disponível
    ipcRenderer.on('update-available', (event, info) => {
      setUpdateState('available');
      setUpdateInfo(info);
    });

    // Não há atualização
    ipcRenderer.on('update-not-available', () => {
      setUpdateState('idle');
    });

    // Progresso do download
    ipcRenderer.on('update-download-progress', (event, progress) => {
      setUpdateState('downloading');
      setDownloadProgress(Math.round(progress.percent));
    });

    // Download concluído
    ipcRenderer.on('update-downloaded', (event, info) => {
      setUpdateState('downloaded');
      setUpdateInfo(info);
    });

    // Erro
    ipcRenderer.on('update-error', (event, error) => {
      console.error('Erro na atualização:', error);
      setUpdateState('error');
    });

    return () => {
      ipcRenderer.removeAllListeners('update-checking');
      ipcRenderer.removeAllListeners('update-available');
      ipcRenderer.removeAllListeners('update-not-available');
      ipcRenderer.removeAllListeners('update-download-progress');
      ipcRenderer.removeAllListeners('update-downloaded');
      ipcRenderer.removeAllListeners('update-error');
    };
  }, []);

  const handleUpdate = () => {
    ipcRenderer.send('restart-app');
  };

  const handleCheckUpdates = () => {
    ipcRenderer.send('check-for-updates');
  };

  if (updateState === 'checking') {
    return (
      <div className="update-banner info">
        <span>🔄 Verificando atualizações...</span>
      </div>
    );
  }

  if (updateState === 'available') {
    return (
      <div className="update-banner warning">
        <span>🎉 Nova versão {updateInfo?.version} disponível!</span>
        <button onClick={handleUpdate} className="btn-update">
          Baixar Agora
        </button>
      </div>
    );
  }

  if (updateState === 'downloading') {
    return (
      <div className="update-banner info">
        <span>⬇️ Baixando atualização... {downloadProgress}%</span>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${downloadProgress}%` }} />
        </div>
      </div>
    );
  }

  if (updateState === 'downloaded') {
    return (
      <div className="update-banner success">
        <span>✅ Atualização baixada! Versão {updateInfo?.version}</span>
        <button onClick={handleUpdate} className="btn-update">
          Reiniciar Agora
        </button>
      </div>
    );
  }

  if (updateState === 'error') {
    return (
      <div className="update-banner error">
        <span>❌ Erro ao verificar atualizações</span>
        <button onClick={handleCheckUpdates} className="btn-update">
          Tentar Novamente
        </button>
      </div>
    );
  }

  return null;
}

export default UpdateBanner;

