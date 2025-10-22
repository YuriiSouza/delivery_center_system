import React, { useEffect, useRef } from 'react';

function LogPanel({ logs, onClear }) {
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="log-panel">
      <div className="log-header">
        <h3>📊 Log de Execução</h3>
        <button className="btn-clear-log" onClick={onClear}>
          🗑️ Limpar
        </button>
      </div>
      
      <div className="log-content">
        {logs.length === 0 ? (
          <div className="log-empty">
            Nenhum log ainda. Execute uma ação para ver os logs aqui.
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className={`log-entry log-${log.type}`}>
              <span className="log-timestamp">[{log.timestamp}]</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}

export default LogPanel;

