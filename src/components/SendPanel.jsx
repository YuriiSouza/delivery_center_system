import React, { useState, useEffect } from 'react';

function SendPanel({ addLog }) {
  const [config, setConfig] = useState(null);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    loadConfig();
    const cleanup = setupWhatsAppListener();
    
    // Cleanup quando o componente for desmontado
    return () => {
      cleanup?.();
    };
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await window.electronAPI.getConfig();
      setConfig(cfg);
    } catch (error) {
      console.error('Erro ao carregar config:', error);
      addLog?.('⚠️ Erro ao carregar configurações', 'warning');
    }
  };

  const setupWhatsAppListener = () => {
    if (!window.electronAPI?.onWhatsappProgress) {
      console.warn('onWhatsappProgress não disponível');
      return;
    }

    // O listener retorna uma função de cleanup
    return window.electronAPI.onWhatsappProgress((data) => {
      if (data.type === 'progress') {
        setProgress({ current: data.current, total: data.total });
        addLog?.(`[${data.current}/${data.total}] ${data.phone}`, 'info');
      } else if (data.type === 'log') {
        addLog?.(data.message, 'info');
      } else if (data.type === 'init') {
        addLog?.(data.message, 'info');
      }
    });
  };

  const handleLoadNumbers = async () => {
    if (!config) return;

    setIsLoading(true);
    addLog?.('📊 Carregando números da planilha...', 'info');

    try {
      // Inicializar Google Sheets se necessário
      const credPath = 'credenciais.json';
      await window.electronAPI.sheetsInitialize(credPath);

      // Obter números
      const result = await window.electronAPI.sheetsGetPhoneNumbers({
        spreadsheetId: config.spreadsheetId,
        sheetName: config.sheetName,
        column: config.phoneColumn,
      });

      if (result.success) {
        setPhoneNumbers(result.numbers);
        addLog?.(`✅ ${result.numbers.length} número(s) encontrado(s)`, 'success');
      } else {
        addLog?.(`❌ Erro: ${result.error}`, 'error');
      }
    } catch (error) {
      addLog?.(`❌ Erro: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!config || phoneNumbers.length === 0) {
      addLog?.('❌ Configure a planilha e carregue os números primeiro', 'error');
      return;
    }

    const confirm = window.confirm(
      `Deseja enviar mensagens para ${phoneNumbers.length} número(s)?`
    );

    if (!confirm) return;

    setIsSending(true);
    addLog?.('🚀 Iniciando envio de mensagens...', 'info');

    try {
      // Inicializar WhatsApp
      addLog?.('🌐 Inicializando WhatsApp Web...', 'info');
      // ✅ CORRETO: Use window.electronAPI
      const initResult = await window.electronAPI.whatsappInitialize();

      if (!initResult.success) {
        addLog?.(`❌ Erro ao inicializar: ${initResult.error}`, 'error');
        setIsSending(false);
        return;
      }

      // Enviar mensagens
      const result = await window.electronAPI.whatsappSendBulk({
        phoneNumbers,
        message: config.message,
        delay: config.delay,
      });

      // Salvar no histórico
      await window.electronAPI.saveHistory({
        total: result.results.total,
        sent: result.results.sent,
        failed: result.results.failed,
        message: config.message,
      });

      addLog?.('', 'info');
      addLog?.('📊 RESUMO:', 'info');
      addLog?.(`✅ Enviados: ${result.results.sent}`, 'success');
      addLog?.(`❌ Falhas: ${result.results.failed}`, 'error');
      addLog?.(`📱 Total: ${result.results.total}`, 'info');

    } catch (error) {
      addLog?.(`❌ Erro: ${error.message}`, 'error');
    } finally {
      setIsSending(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleStop = async () => {
    try {
      await window.electronAPI.whatsappStop();
      addLog?.('⏹️ Envio interrompido', 'warning');
    } catch (error) {
      console.error('Erro ao parar envio:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (!config) {
    return (
      <div className="panel">
        <div className="panel-content">
          <div className="loading-state">
            ⏳ Carregando configurações...
          </div>
        </div>
      </div>
    );
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

        {isSending && progress.total > 0 && (
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