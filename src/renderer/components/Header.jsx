import React, { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');

function Header({ activeTab, onTabChange }) {
  const [version, setVersion] = useState('');

  useEffect(() => {
    ipcRenderer.invoke('get-app-version').then(setVersion);
  }, []);

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="app-title">
            📱 WhatsApp Automation
          </h1>
          <span className="app-version">v{version}</span>
        </div>

        <nav className="header-nav">
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

