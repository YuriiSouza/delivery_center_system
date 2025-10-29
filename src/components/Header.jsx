import React, { useState, useEffect } from 'react';

function Header({ activeTab, onTabChange }) {
  const [version, setVersion] = useState('');

  useEffect(() => {
    // ✅ CORRETO: Use window.electronAPI ao invés de window.require
    if (window.electronAPI) {
      window.electronAPI.getAppVersion()
        .then(setVersion)
        .catch(err => {
          console.error('Erro ao obter versão:', err);
          setVersion('1.0.0'); // Fallback
        });
    } else {
      console.warn('electronAPI não disponível');
      setVersion('1.0.0'); // Fallback
    }
  }, []);

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="app-title">
            Delivery Center
          </h1>
          <span className="app-version">v{version}</span>
        </div>

        <nav className="header-nav">
          <button
            className={`nav-button ${activeTab === 'update' ? 'active' : ''}`}
            onClick={() => onTabChange('update')}
          >
            🔄️ Atualizar Planilha
          </button>

          <button
            className={`nav-button ${activeTab === 'send' ? 'active' : ''}`}
            onClick={() => onTabChange('send')}
          >
            🚀 Enviar
          </button>
          <button
            className={`nav-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => onTabChange('history')}
          >
            📊 Histórico
          </button>
          <button
            className={`nav-button ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => onTabChange('config')}
          >
            ⚙️ Configurações
          </button>
        </nav>
      </div>
    </header>
  );
}

export default Header;
