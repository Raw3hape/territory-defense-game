import { useState, useEffect } from 'react';
import { GameMap } from './components/Map/GameMap';
import { CitySearch } from './components/UI/CitySearch';
import { GameControls } from './components/UI/GameControls';
import { GameController } from './components/Game/GameController';
import { GameOverModal } from './components/UI/GameOverModal';
import { useGameStore } from './store/gameStore';
import type { City } from './types/game.types';
import './App.css';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const { initGame, player, gameOverData, resetGame } = useGameStore();

  const handleSelectCity = (city: City) => {
    initGame(city);
    setGameStarted(true);
  };

  // Проверяем, есть ли сохраненная игра
  useEffect(() => {
    if (player?.startCity) {
      setGameStarted(true);
    }
  }, [player]);

  if (!gameStarted) {
    return (
      <div className="start-screen">
        <div className="start-container">
          <h1 className="game-title">🌍 Territory Defense</h1>
          <p className="game-subtitle">
            Защищайте города и расширяйте свою территорию на карте мира
          </p>
          
          <div className="start-content">
            <h2>Выберите стартовый город</h2>
            <CitySearch onSelectCity={handleSelectCity} />
            
            <div className="game-features">
              <div className="feature">
                <span className="feature-icon">🏙️</span>
                <div>
                  <h3>Захватывайте города</h3>
                  <p>Защищайте города от волн врагов и расширяйте территорию</p>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">🗼</span>
                <div>
                  <h3>Стройте башни</h3>
                  <p>4 типа башен с уникальными способностями</p>
                </div>
              </div>
              <div className="feature">
                <span className="feature-icon">🗺️</span>
                <div>
                  <h3>Исследуйте мир</h3>
                  <p>Играйте на реальной карте мира с настоящими городами</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <GameController />
      <GameMap center={player?.startCity?.position} />
      <GameControls />
      
      <GameOverModal
        isOpen={gameOverData?.isOpen || false}
        cityName={gameOverData?.cityName || ''}
        score={gameOverData?.score || 0}
        wave={gameOverData?.wave || 0}
        onRestart={() => {
          resetGame();
          setGameStarted(false);
        }}
        onMainMenu={() => {
          resetGame();
          setGameStarted(false);
        }}
      />
      
      <div className="game-header">
        <h1 className="game-logo">Territory Defense</h1>
        <button 
          className="new-game-button"
          onClick={() => {
            if (window.confirm('Начать новую игру? Текущий прогресс будет потерян.')) {
              useGameStore.getState().resetGame();
              setGameStarted(false);
            }
          }}
        >
          Новая игра
        </button>
      </div>
    </div>
  );
}

export default App
