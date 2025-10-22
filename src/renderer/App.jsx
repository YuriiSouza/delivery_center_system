import React, { useState } from 'react';
import Header from './components/Header';
import UpdateBanner from './components/UpdateBanner';
import ConfigPanel from './components/ConfigPanel';
import SendPanel from './components/SendPanel';
import LogPanel from './components/LogPanel';
import HistoryPanel from './components/HistoryPanel';
import './styles/App.css';

function App() {
  const [activeTab, setActiveTab] = useState('send'); // send, history, config
  const [logs, setLogs] = useState([]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="app">
      <UpdateBanner />
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="main-content">
        {activeTab === 'send' && (
          <SendPanel addLog={addLog} />
        )}
        
        {activeTab === 'history' && (
          <HistoryPanel />
        )}
        
        {activeTab === 'config' && (
          <ConfigPanel addLog={addLog} />
        )}
      </main>

      <LogPanel logs={logs} onClear={clearLogs} />
    </div>
  );
}

export default App;

