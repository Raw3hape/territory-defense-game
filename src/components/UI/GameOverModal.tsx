import React from 'react';
import './GameOverModal.css';

interface GameOverModalProps {
  isOpen: boolean;
  score: number;
  wave: number;
  cityName: string;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  score,
  wave,
  cityName,
  onRestart,
  onMainMenu
}) => {
  if (!isOpen) return null;

  return (
    <div className="game-over-overlay">
      <div className="game-over-modal">
        <div className="game-over-header">
          <div className="game-over-icon">💀</div>
          <h2>Игра окончена!</h2>
        </div>
        
        <div className="game-over-content">
          <p className="game-over-message">
            {cityName} уничтожен! Ваша империя пала...
          </p>
          
          <div className="game-over-stats">
            <div className="stat-item">
              <span className="stat-label">Волна:</span>
              <span className="stat-value">{wave}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Очки:</span>
              <span className="stat-value">{score}</span>
            </div>
          </div>
        </div>
        
        <div className="game-over-actions">
          <button 
            className="game-over-button restart"
            onClick={onRestart}
          >
            🔄 Начать заново
          </button>
          <button 
            className="game-over-button menu"
            onClick={onMainMenu}
          >
            🏠 Главное меню
          </button>
        </div>
      </div>
    </div>
  );
};