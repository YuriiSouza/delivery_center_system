import React, { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');

function ConfigPanel({ addLog }) {
  const [config, setConfig] = useState({
    spreadsheetId: '',
    sheetName: 'Visão Geral Atribuições',
    phoneColumn: 'P',
    message: 'Bom dia driver, tem convocação no seu app!',
    delay: 3000,
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const cfg = await ipcRenderer.invoke('get-config');
    setConfig(cfg);
  };

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      await ipcRenderer.invoke('save-config', config);
      addLog('✅ Configurações salvas com sucesso!', 'success');
    } catch (error) {
      addLog(`❌ Erro ao salvar: ${error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    addLog('🧪 Testando conexão com Google Sheets...', 'info');

    try {
      const credPath = 'credenciais.json';
      const result = await ipcRenderer.invoke('sheets-initialize', credPath);

      if (result.success) {
        addLog('✅ Conexão com Google Sheets OK!', 'success');
        
        // Testar acesso à planilha
        if (config.spreadsheetId) {
          const testResult = await ipcRenderer.invoke('sheets-get-data', {
            spreadsheetId: config.spreadsheetId,
            range: `${config.sheetName}!A1:A1`,
          });

          if (testResult.success) {
            addLog('✅ Planilha acessível!', 'success');
          } else {
            addLog(`⚠️ Planilha não acessível: ${testResult.error}`, 'warning');
          }
        }
      } else {
        addLog(`❌ Erro: ${result.error}`, 'error');
      }
    } catch (error) {
      addLog(`❌ Erro: ${error.message}`, 'error');
    }
  };

  return (
    <div className="panel config-panel">
      <div className="panel-header">
        <h2>⚙️ Configurações</h2>
      </div>

      <div className="panel-content">
        <div className="config-section">
          <h3>📊 Google Sheets</h3>
          
          <div className="form-group">
            <label>ID da Planilha</label>
            <input
              type="text"
              value={config.spreadsheetId}
              onChange={(e) => handleChange('spreadsheetId', e.target.value)}
              placeholder="Ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
            />
            <small>
              Encontre o ID na URL da planilha: 
              docs.google.com/spreadsheets/d/<strong>[ID_AQUI]</strong>/edit
            </small>
          </div>

          <div className="form-group">
            <label>Nome da Aba</label>
            <input
              type="text"
              value={config.sheetName}
              onChange={(e) => handleChange('sheetName', e.target.value)}
              placeholder="Ex: Visão Geral Atribuições"
            />
          </div>

          <div className="form-group">
            <label>Coluna dos Telefones</label>
            <input
              type="text"
              value={config.phoneColumn}
              onChange={(e) => handleChange('phoneColumn', e.target.value.toUpperCase())}
              placeholder="Ex: P"
              maxLength="2"
            />
            <small>Letra da coluna onde estão os números de telefone</small>
          </div>
        </div>

        <div className="config-section">
          <h3>💬 Mensagem</h3>
          
          <div className="form-group">
            <label>Mensagem de Convocação</label>
            <textarea
              value={config.message}
              onChange={(e) => handleChange('message', e.target.value)}
              placeholder="Digite a mensagem..."
              rows="4"
            />
          </div>

          <div className="form-group">
            <label>Delay entre mensagens (ms)</label>
            <input
              type="number"
              value={config.delay}
              onChange={(e) => handleChange('delay', parseInt(e.target.value))}
              min="1000"
              max="10000"
              step="1000"
            />
            <small>Tempo de espera entre cada envio (recomendado: 3000ms)</small>
          </div>
        </div>

        <div className="config-section">
          <h3>🔐 Credenciais</h3>
          <p className="help-text">
            O arquivo <code>credenciais.json</code> deve estar na mesma pasta do aplicativo.
            <br />
            Siga o guia de configuração da API do Google Sheets para criar este arquivo.
          </p>
        </div>

        <div className="actions">
          <button
            className="btn btn-secondary"
            onClick={handleTestConnection}
          >
            🧪 Testar Conexão
          </button>

          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? '⏳ Salvando...' : '💾 Salvar Configurações'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfigPanel;

