import React, { useState, useEffect } from 'react';

function UpdateBanner() {
  const [updateState, setUpdateState] = useState('idle');
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    // Verifica se o electronAPI está disponível
    if (!window.electronAPI) {
      console.warn('electronAPI não disponível - UpdateBanner desabilitado');
      return;
    }

    // ✅ CORRETO: Use window.electronAPI para listeners
    // Verificando atualizações
    const unsubCheckingUpdate = window.electronAPI.onUpdateChecking?.(() => {
      setUpdateState('checking');
    });

    // Atualização disponível
    const unsubUpdateAvailable = window.electronAPI.onUpdateAvailable?.((info) => {
      setUpdateState('available');
      setUpdateInfo(info);
    });

    // Não há atualização
    const unsubUpdateNotAvailable = window.electronAPI.onUpdateNotAvailable?.(() => {
      setUpdateState('idle');
    });

    // Progresso do download
    const unsubDownloadProgress = window.electronAPI.onUpdateDownloadProgress?.((progress) => {
      setUpdateState('downloading');
      setDownloadProgress(Math.round(progress.percent));
    });

    // Download concluído
    const unsubUpdateDownloaded = window.electronAPI.onUpdateDownloaded?.((info) => {
      setUpdateState('downloaded');
      setUpdateInfo(info);
    });

    // Erro
    const unsubUpdateError = window.electronAPI.onUpdateError?.((error) => {
      console.error('Erro na atualização:', error);
      setUpdateState('error');
    });

    // Cleanup: Remove os listeners quando o componente for desmontado
    return () => {
      unsubCheckingUpdate?.();
      unsubUpdateAvailable?.();
      unsubUpdateNotAvailable?.();
      unsubDownloadProgress?.();
      unsubUpdateDownloaded?.();
      unsubUpdateError?.();
    };
  }, []);

  const handleUpdate = () => {
    // ✅ CORRETO: Use window.electronAPI
    window.electronAPI.restartApp?.();
  };

  const handleCheckUpdates = () => {
    // ✅ CORRETO: Use window.electronAPI
    window.electronAPI.checkForUpdates?.();
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