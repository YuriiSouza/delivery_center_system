import React from 'react';

function UpdateModal({ onUpdate, onLater }) {
  return (
    <div className="modal">
      <h2>🎉 Nova Versão Disponível!</h2>
      <p>Versão 2.0.0 está disponível para download.</p>
      
      <div className="changelog">
        <h3>O que há de novo:</h3>
        <ul>
          <li>✨ Nova interface moderna</li>
          <li>🚀 Performance melhorada</li>
          <li>🐛 Correções de bugs</li>
        </ul>
      </div>
      
      <div className="buttons">
        <button onClick={onUpdate} className="primary">
          Atualizar Agora
        </button>
        <button onClick={onLater} className="secondary">
          Mais Tarde
        </button>
      </div>
    </div>
  );
}