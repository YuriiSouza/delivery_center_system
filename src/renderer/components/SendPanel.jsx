import React, { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');

function SendPanel({ addLog }) {
  const [config, setConfig] = useState(null);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    loadConfig();
    setupWhatsAppListener();
  }, []);

  const loadConfig = async () => {
    const cfg = await ipcRenderer.invoke('get-config');
    setConfig(cfg);
  };

  const setupWhatsAppListener = () => {
    ipcRenderer.on('whatsapp-progress', (event, data) => {
      if (data.type === 'progress') {
        setProgress({ current: data.current, total: data.total });
        addLog(`[${data.current}/${data.total}] ${data.phone}`, 'info');
      } else if (data.type === 'log') {
        addLog(data.message, 'info');
      } else if (data.type === 'init') {
        addLog(data.message, 'info');
      }
    });
  };

  const handleLoadNumbers = async () => {
    if (!config) return;

    setIsLoading(true);
    addLog('📊 Carregando números da planilha...', 'info');

    try {
      // Inicializar Google Sheets se necessário
      const credPath = 'credenciais.json';
      await ipcRenderer.invoke('sheets-initialize', credPath);

      // Obter números
      const result = await ipcRenderer.invoke('sheets-get-phone-numbers', {
        spreadsheetId: config.spreadsheetId,
        sheetName: config.sheetName,
        column: config.phoneColumn,
      });

      if (result.success) {
        setPhoneNumbers(result.numbers);
        addLog(`✅ ${result.numbers.length} número(s) encontrado(s)`, 'success');
      } else {
        addLog(`❌ Erro: ${result.error}`, 'error');
      }
    } catch (error) {
      addLog(`❌ Erro: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!config || phoneNumbers.length === 0) {
      addLog('❌ Configure a planilha e carregue os números primeiro', 'error');
      return;
    }

    const confirm = window.confirm(
      `Deseja enviar mensagens para ${phoneNumbers.length} número(s)?`
    );

    if (!confirm) return;

    setIsSending(true);
    addLog('🚀 Iniciando envio de mensagens...', 'info');

    try {
      // Inicializar WhatsApp
      addLog('🌐 Inicializando WhatsApp Web...', 'info');
      const initResult = await ipcRenderer.invoke('whatsapp-initialize');

      if (!initResult.success) {
        addLog(`❌ Erro ao inicializar: ${initResult.error}`, 'error');
        return;
      }

      // Enviar mensagens
      const result = await ipcRenderer.invoke('whatsapp-send-bulk', {
        phoneNumbers,
        message: config.message,
        delay: config.delay,
      });

      // Salvar no histórico
      await ipcRenderer.invoke('save-history', {
        total: result.total,
        sent: result.sent,
        failed: result.failed,
        message: config.message,
      });

      addLog('', 'info');
      addLog('📊 RESUMO:', 'info');
      addLog(`✅ Enviados: ${result.sent}`, 'success');
      addLog(`❌ Falhas: ${result.failed}`, 'error');
      addLog(`📱 Total: ${result.total}`, 'info');

    } catch (error) {
      addLog(`❌ Erro: ${error.message}`, 'error');
    } finally {
      setIsSending(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleStop = async () => {
    await ipcRenderer.invoke('whatsapp-stop');
    addLog('⏹️ Envio interrompido', 'warning');
    setIsSending(false);
  };

  if (!config) {
    return <div className="panel">Carregando...</div>;
  }

  return (
    <div className="panel send-panel">
      <div className="panel-header">
        <h2>📱 Envio de Convocações</h2>
      </div>

      <div className="panel-content">
        <div className="info-card">
          <h3>📋 Configurações Atuais</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Planilha ID:</span>
              <span className="info-value">{config.spreadsheetId || 'Não configurado'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Aba:</span>
              <span className="info-value">{config.sheetName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Coluna:</span>
              <span className="info-value">{config.phoneColumn}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Mensagem:</span>
              <span className="info-value">"{config.message}"</span>
            </div>
          </div>
        </div>

        <div className="numbers-card">
          <h3>📞 Números Carregados</h3>
          <div className="numbers-info">
            <span className="numbers-count">{phoneNumbers.length}</span>
            <span className="numbers-label">número(s)</span>
          </div>
          {phoneNumbers.length > 0 && (
            <div className="numbers-preview">
              {phoneNumbers.slice(0, 5).map((num, idx) => (
                <span key={idx} className="number-chip">{num}</span>
              ))}
              {phoneNumbers.length > 5 && (
                <span className="number-chip">+{phoneNumbers.length - 5} mais</span>
              )}
            </div>
          )}
        </div>

        {isSending && (
          <div className="progress-card">
            <h3>📊 Progresso</h3>
            <div className="progress-info">
              <span>{progress.current} / {progress.total}</span>
              <span>{Math.round((progress.current / progress.total) * 100)}%</span>
            </div>
            <div className="progress-bar-large">
              <div 
                className="progress-fill-large" 
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="actions">
          <button
            className="btn btn-secondary"
            onClick={handleLoadNumbers}
            disabled={isLoading || isSending || !config.spreadsheetId}
          >
            {isLoading ? '⏳ Carregando...' : '🔄 Carregar Números'}
          </button>

          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={isLoading || isSending || phoneNumbers.length === 0}
          >
            {isSending ? '⏳ Enviando...' : '🚀 Enviar Convocações'}
          </button>

          {isSending && (
            <button
              className="btn btn-danger"
              onClick={handleStop}
            >
              ⏹️ Parar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SendPanel;

