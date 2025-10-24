import React, { useState, useEffect } from 'react';

function HistoryPanel() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    const hist = await window.electronAPI.getHistory();
    setHistory(hist);
    setIsLoading(false);
  };

  const handleClearHistory = async () => {
    const confirm = window.confirm('Deseja limpar todo o histórico?');
    if (confirm) {
      await window.electronAPI.clearHistory();
      setHistory([]);
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="panel">
        <div className="panel-content">
          Carregando histórico...
        </div>
      </div>
    );
  }

  return (
    <div className="panel history-panel">
      <div className="panel-header">
        <h2>📊 Histórico de Envios</h2>
        {history.length > 0 && (
          <button className="btn btn-danger-outline" onClick={handleClearHistory}>
            🗑️ Limpar Histórico
          </button>
        )}
      </div>

      <div className="panel-content">
        {history.length === 0 ? (
          <div className="empty-state">
            <p>📭 Nenhum envio registrado ainda</p>
            <small>Os envios aparecerão aqui após você enviar convocações</small>
          </div>
        ) : (
          <div className="history-list">
            {history.map((item, index) => (
              <div key={index} className="history-item">
                <div className="history-header">
                  <span className="history-date">{formatDate(item.timestamp)}</span>
                  <div className="history-stats">
                    <span className="stat success">✅ {item.sent}</span>
                    <span className="stat error">❌ {item.failed}</span>
                    <span className="stat total">📱 {item.total}</span>
                  </div>
                </div>
                <div className="history-message">
                  <strong>Mensagem:</strong> "{item.message}"
                </div>
                <div className="history-footer">
                  <span className="success-rate">
                    Taxa de sucesso: {Math.round((item.sent / item.total) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default HistoryPanel;

