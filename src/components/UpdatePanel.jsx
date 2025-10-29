import React, { useState, useEffect } from 'react';

function UpdatePanel({ addLog }) {
  const [selectedReports, setSelectedReports] = useState({
    disponibilidadeMotoristas: false,
    perfilMotorista: false,
    historicoATs: false,
    disponibilidadeMotorista: false,
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loginStatus, setLoginStatus] = useState('disconnected'); // disconnected, connecting, connected

  // Definição dos relatórios disponíveis
  const availableReports = [
    {
      id: 'disponibilidadeMotoristas',
      name: 'Disponibilidade dos Motoristas',
      icon: '🚗',
      description: 'Atualiza a planilha com a disponibilidade atual dos motoristas',
      color: '#4CAF50'
    },
    {
      id: 'perfilMotorista',
      name: 'Perfil de Motorista',
      icon: '👤',
      description: 'Atualiza informações do perfil dos motoristas',
      color: '#2196F3'
    },
    {
      id: 'historicoATs',
      name: 'Histórico ATs',
      icon: '📋',
      description: 'Atualiza o histórico de atendimentos',
      color: '#FF9800'
    },
    {
      id: 'disponibilidadeMotorista',
      name: 'Disponibilidade Motorista',
      icon: '📊',
      description: 'Atualiza dados de disponibilidade individual',
      color: '#9C27B0'
    },
  ];

  useEffect(() => {
    loadLastUpdate();
    loadSavedSelection();
  }, []);

  const loadLastUpdate = async () => {
    try {
      const config = await window.electronAPI.getConfig();
      if (config.lastReportUpdate) {
        setLastUpdate(new Date(config.lastReportUpdate));
      }
    } catch (error) {
      console.error('Erro ao carregar última atualização:', error);
    }
  };

  const loadSavedSelection = async () => {
    try {
      const config = await window.electronAPI.getConfig();
      if (config.selectedReports) {
        setSelectedReports(config.selectedReports);
      }
    } catch (error) {
      console.error('Erro ao carregar seleção:', error);
    }
  };

  const handleToggleReport = (reportId) => {
    setSelectedReports(prev => ({
      ...prev,
      [reportId]: !prev[reportId]
    }));
  };

  const handleSelectAll = () => {
    const allSelected = Object.values(selectedReports).every(v => v);
    const newSelection = {};
    Object.keys(selectedReports).forEach(key => {
      newSelection[key] = !allSelected;
    });
    setSelectedReports(newSelection);
  };

  const handleSaveSelection = async () => {
    try {
      const config = await window.electronAPI.getConfig();
      await window.electronAPI.saveConfig({
        ...config,
        selectedReports
      });
      addLog?.('✅ Seleção de relatórios salva', 'success');
    } catch (error) {
      addLog?.(`❌ Erro ao salvar: ${error.message}`, 'error');
    }
  };

  const handleUpdateReports = async () => {
    const selectedCount = Object.values(selectedReports).filter(v => v).length;
    
    if (selectedCount === 0) {
      addLog?.('⚠️ Selecione pelo menos um relatório para atualizar', 'warning');
      return;
    }

    const confirm = window.confirm(
      `Deseja atualizar ${selectedCount} relatório(s)?\n\n` +
      'O sistema irá:\n' +
      '1. Fazer login no portal\n' +
      '2. Baixar os relatórios selecionados\n' +
      '3. Enviar para o Google Sheets\n\n' +
      'Isso pode levar alguns minutos.'
    );

    if (!confirm) return;

    setIsUpdating(true);
    setProgress({ current: 0, total: selectedCount });
    addLog?.('🚀 Iniciando atualização de relatórios...', 'info');

    try {
      // 1. Fazer login no portal
      setLoginStatus('connecting');
      addLog?.('🔐 Fazendo login no portal...', 'info');
      
      const loginResult = await window.electronAPI.portalLogin();
      
      if (!loginResult.success) {
        addLog?.(`❌ Erro no login: ${loginResult.error}`, 'error');
        setLoginStatus('disconnected');
        setIsUpdating(false);
        return;
      }
      
      setLoginStatus('connected');
      addLog?.('✅ Login realizado com sucesso', 'success');

      // 2. Baixar e atualizar cada relatório selecionado
      const reportsToUpdate = Object.entries(selectedReports)
        .filter(([_, isSelected]) => isSelected)
        .map(([reportId]) => reportId);

      for (let i = 0; i < reportsToUpdate.length; i++) {
        const reportId = reportsToUpdate[i];
        const report = availableReports.find(r => r.id === reportId);
        
        setProgress({ current: i + 1, total: reportsToUpdate.length });
        addLog?.(`📥 [${i + 1}/${reportsToUpdate.length}] Baixando: ${report.name}...`, 'info');

        const downloadResult = await window.electronAPI.downloadReport(reportId);
        
        if (!downloadResult.success) {
          addLog?.(`❌ Erro ao baixar ${report.name}: ${downloadResult.error}`, 'error');
          continue;
        }

        addLog?.(`📤 Enviando ${report.name} para Google Sheets...`, 'info');
        
        const uploadResult = await window.electronAPI.uploadReportToSheets({
          reportId,
          filePath: downloadResult.filePath
        });

        if (uploadResult.success) {
          addLog?.(`✅ ${report.name} atualizado com sucesso`, 'success');
        } else {
          addLog?.(`❌ Erro ao atualizar ${report.name}: ${uploadResult.error}`, 'error');
        }
      }

      // 3. Salvar data da última atualização
      const config = await window.electronAPI.getConfig();
      await window.electronAPI.saveConfig({
        ...config,
        lastReportUpdate: new Date().toISOString()
      });
      
      setLastUpdate(new Date());

      addLog?.('', 'info');
      addLog?.('✅ Atualização de relatórios concluída!', 'success');

    } catch (error) {
      addLog?.(`❌ Erro: ${error.message}`, 'error');
    } finally {
      setIsUpdating(false);
      setLoginStatus('disconnected');
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleStop = async () => {
    try {
      await window.electronAPI.stopReportUpdate();
      addLog?.('⏹️ Atualização interrompida', 'warning');
    } catch (error) {
      console.error('Erro ao parar atualização:', error);
    } finally {
      setIsUpdating(false);
      setLoginStatus('disconnected');
    }
  };

  const selectedCount = Object.values(selectedReports).filter(v => v).length;
  const allSelected = Object.values(selectedReports).every(v => v);

  return (
    <div className="panel reports-panel">
      <div className="panel-header">
        <h2>📊 Atualização de Relatórios</h2>
      </div>

      <div className="panel-content">
        {/* Status do Login */}
        <div className="login-status-card">
          <h3>🔐 Status do Portal</h3>
          <div className={`status-badge status-${loginStatus}`}>
            {loginStatus === 'disconnected' && '🔴 Desconectado'}
            {loginStatus === 'connecting' && '🟡 Conectando...'}
            {loginStatus === 'connected' && '🟢 Conectado'}
          </div>
        </div>

        {/* Última Atualização */}
        {lastUpdate && (
          <div className="last-update-card">
            <h3>🕒 Última Atualização</h3>
            <p className="last-update-time">
              {lastUpdate.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        )}

        {/* Seleção de Relatórios */}
        <div className="reports-selection-card">
          <div className="reports-selection-header">
            <h3>📋 Selecione os Relatórios</h3>
            <button
              className="btn btn-small btn-secondary"
              onClick={handleSelectAll}
              disabled={isUpdating}
            >
              {allSelected ? '❌ Desmarcar Todos' : '✅ Selecionar Todos'}
            </button>
          </div>

          <div className="reports-grid">
            {availableReports.map(report => (
              <div
                key={report.id}
                className={`report-card ${selectedReports[report.id] ? 'selected' : ''}`}
                onClick={() => !isUpdating && handleToggleReport(report.id)}
                style={{ borderLeftColor: report.color }}
              >
                <div className="report-card-header">
                  <span className="report-icon">{report.icon}</span>
                  <input
                    type="checkbox"
                    checked={selectedReports[report.id]}
                    onChange={() => {}}
                    disabled={isUpdating}
                    className="report-checkbox"
                  />
                </div>
                <h4 className="report-name">{report.name}</h4>
                <p className="report-description">{report.description}</p>
              </div>
            ))}
          </div>

          <div className="selection-summary">
            <span className="selection-count">
              {selectedCount} de {availableReports.length} selecionado(s)
            </span>
          </div>
        </div>

        {/* Progresso */}
        {isUpdating && progress.total > 0 && (
          <div className="progress-card">
            <h3>📊 Progresso da Atualização</h3>
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

        {/* Ações */}
        <div className="actions">
          <button
            className="btn btn-secondary"
            onClick={handleSaveSelection}
            disabled={isUpdating || selectedCount === 0}
          >
            💾 Salvar Seleção
          </button>

          <button
            className="btn btn-primary"
            onClick={handleUpdateReports}
            disabled={isUpdating || selectedCount === 0}
          >
            {isUpdating ? '⏳ Atualizando...' : '🚀 Atualizar Relatórios'}
          </button>

          {isUpdating && (
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

export default UpdatePanel;
