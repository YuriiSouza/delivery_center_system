import React from 'react';

function UpdateProgress({ progress }) {
  return (
    <div className="update-progress">
      <p>Baixando atualização... {progress}%</p>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}