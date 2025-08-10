import React, { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { TowerType } from '../../types/game.types';
import type { City } from '../../types/game.types';
import { CityCapture } from './CityCapture';
import { getRealCities } from '../../services/geoNamesService';
import './GameControls.css';

const TOWER_INFO = {
  [TowerType.BASIC]: { name: 'Базовая', cost: 100, icon: '🔫', color: '#4A90E2' },
  [TowerType.SNIPER]: { name: 'Снайпер', cost: 250, icon: '🎯', color: '#7B68EE' },
  [TowerType.SPLASH]: { name: 'Взрывная', cost: 400, icon: '💥', color: '#FF6B6B' },
  [TowerType.SLOW]: { name: 'Замедляющая', cost: 150, icon: '❄️', color: '#4ECDC4' }
};

export const GameControls: React.FC = () => {
  const { 
    player,
    currentWave,
    gameSpeed,
    isPaused,
    placingTowerType,
    enemies,
    enemyBases,
    towers,
    capturedCitiesData,
    setPlacingTowerType,
    setAvailableCitiesForTowers,
    setShowAvailableCitiesForTowers,
    showAvailableCitiesForTowers,
    togglePause,
    setGameSpeed,
    getTowerLimit,
    getCurrentTowerCount
  } = useGameStore();

  const resources = player?.resources || { gold: 0, energy: 0, score: 0 };
  const cityHealth = player?.startCity?.health || 100;
  const cityMaxHealth = player?.startCity?.maxHealth || 100;
  
  // Обновляем список доступных городов для башен при изменении типа башни
  useEffect(() => {
    if (placingTowerType && player?.startCity) {
      const MAX_TOWER_DISTANCE = 500; // км
      
      // Собираем все наши города
      const ourCities = [
        player.startCity,
        ...capturedCitiesData
      ];
      
      // Асинхронно загружаем реальные города через API
      const loadRealCities = async () => {
        const availableCities: City[] = [];
        const cityIds = new Set<string>();
        
        // Для каждого нашего города загружаем реальные города в радиусе
        // Ограничиваем до 15 городов для каждого нашего города
        for (const ourCity of ourCities) {
          try {
            const realCities = await getRealCities(ourCity.position, MAX_TOWER_DISTANCE, 15);
            
            for (const city of realCities) {
              if (!cityIds.has(city.id)) {
                cityIds.add(city.id);
                availableCities.push(city);
              }
            }
          } catch (error) {
            console.error('Ошибка загрузки городов:', error);
          }
        }
        
        // Добавляем наши города тоже
        for (const ourCity of ourCities) {
          if (!cityIds.has(ourCity.id)) {
            cityIds.add(ourCity.id);
            availableCities.push(ourCity);
          }
        }
        
        setAvailableCitiesForTowers(availableCities);
        setShowAvailableCitiesForTowers(true);
      };
      
      loadRealCities();
    } else {
      setShowAvailableCitiesForTowers(false);
    }
  }, [placingTowerType, player, capturedCitiesData, setAvailableCitiesForTowers, setShowAvailableCitiesForTowers]);

  return (
    <div className="game-controls">
      {/* Здоровье города */}
      <div className="city-health-panel">
        <h3>🏙️ Здоровье города</h3>
        <div className="health-bar">
          <div 
            className="health-fill" 
            style={{ 
              width: `${(cityHealth / cityMaxHealth) * 100}%`,
              backgroundColor: cityHealth > 50 ? '#4CAF50' : cityHealth > 25 ? '#FFA500' : '#FF0000'
            }}
          />
          <span className="health-text">{cityHealth} / {cityMaxHealth}</span>
        </div>
      </div>

      {/* Ресурсы */}
      <div className="resources-panel">
        <div className="resource">
          <span className="resource-icon">💰</span>
          <span className="resource-value">{resources.gold}</span>
        </div>
        <div className="resource">
          <span className="resource-icon">⚡</span>
          <span className="resource-value">{resources.energy}</span>
        </div>
        <div className="resource">
          <span className="resource-icon">🏆</span>
          <span className="resource-value">{resources.score}</span>
        </div>
        <div className="resource">
          <span className="resource-icon">🌊</span>
          <span className="resource-value">Волна {currentWave}</span>
        </div>
        <div className="resource" style={{ backgroundColor: enemies.length > 150 ? '#FFDDDD' : 'transparent' }}>
          <span className="resource-icon">👾</span>
          <span className="resource-value" style={{ color: enemies.length > 150 ? '#FF0000' : 'inherit' }}>
            {enemies.length}
          </span>
        </div>
        <div className="resource">
          <span className="resource-icon">🏴</span>
          <span className="resource-value">
            {enemyBases.filter(b => b.isActive).length}
          </span>
        </div>
      </div>

      {/* Башни */}
      <div className="towers-panel">
        <h3>Башни ({getCurrentTowerCount()}/{getTowerLimit()})</h3>
        {getCurrentTowerCount() >= getTowerLimit() && (
          <div className="tower-limit-warning">
            ⚠️ Достигнут лимит башен! Захватите новый город.
          </div>
        )}
        <div className="tower-buttons">
          {Object.entries(TOWER_INFO).map(([type, info]) => (
            <button
              key={type}
              className={`tower-button ${placingTowerType === type ? 'active' : ''} ${
                resources.gold < info.cost ? 'disabled' : ''
              }`}
              onClick={() => setPlacingTowerType(
                placingTowerType === type ? undefined : type as TowerType
              )}
              disabled={resources.gold < info.cost}
              style={{ borderColor: info.color }}
            >
              <span className="tower-icon">{info.icon}</span>
              <span className="tower-name">{info.name}</span>
              <span className="tower-cost">{info.cost} 💰</span>
            </button>
          ))}
        </div>
        {placingTowerType && (
          <div className="placement-hint">
            🎯 Кликните на город на карте для размещения башни
            <br/>
            <small>Доступные города подсвечены синим цветом</small>
          </div>
        )}
      </div>

      {/* Управление игрой */}
      <div className="game-speed-controls">
        <button 
          className={`control-button ${isPaused ? 'paused' : ''}`}
          onClick={togglePause}
        >
          {isPaused ? '▶️' : '⏸️'}
        </button>
        
        <div className="speed-buttons">
          <button 
            className={`speed-button ${gameSpeed === 1 ? 'active' : ''}`}
            onClick={() => setGameSpeed(1)}
          >
            1x
          </button>
          <button 
            className={`speed-button ${gameSpeed === 5 ? 'active' : ''}`}
            onClick={() => setGameSpeed(5)}
          >
            5x
          </button>
          <button 
            className={`speed-button ${gameSpeed === 10 ? 'active' : ''}`}
            onClick={() => setGameSpeed(10)}
          >
            10x
          </button>
        </div>
      </div>

      {/* Захват городов */}
      <CityCapture />
    </div>
  );
};