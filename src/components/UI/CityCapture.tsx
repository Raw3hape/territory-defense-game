import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { WORLD_CITIES } from '../../data/worldCities';
import { getAllCitiesInRadius } from '../../services/cityGeneratorService';
import type { City } from '../../types/game.types';
import './CityCapture.css';

const CITY_CAPTURE_COST = 500;
const MAX_CAPTURE_DISTANCE = 500; // Увеличен радиус до 500км

export const CityCapture: React.FC = () => {
  const { 
    player, 
    getTowerLimit,
    getCurrentTowerCount,
    setAvailableCitiesForCapture,
    setShowAvailableCities,
    showAvailableCities
  } = useGameStore();
  
  const [availableCities, setAvailableCities] = useState<City[]>([]);
  
  useEffect(() => {
    if (player?.startCity) {
      // Список исключений (стартовый город + захваченные)
      const excludeIds = [player.startCity.id, ...player.capturedCities];
      
      // Получаем все города в радиусе (реальные + сгенерированные)
      const available = getAllCitiesInRadius(
        player.startCity.position,
        MAX_CAPTURE_DISTANCE,
        WORLD_CITIES,
        excludeIds,
        30 // Минимум 30км для захвата городов
      );
      
      setAvailableCities(available);
      setAvailableCitiesForCapture(available);
    }
  }, [player, setAvailableCitiesForCapture]);
  
  const toggleCityView = () => {
    setShowAvailableCities(!showAvailableCities);
  };
  
  const currentTowers = getCurrentTowerCount();
  const towerLimit = getTowerLimit();
  const needMoreTowers = currentTowers >= towerLimit - 2; // Предупреждение когда осталось 2 слота
  
  return (
    <div className="city-capture-panel">
      <div className="city-capture-header">
        <h3>🏰 Захват городов</h3>
        <div className="capture-info">
          <span>Башни: {currentTowers}/{towerLimit}</span>
          <span>Городов: {player?.capturedCities.length || 1}</span>
        </div>
      </div>
      
      {needMoreTowers && (
        <div className="capture-hint">
          💡 Скоро достигнете лимита башен! Захватите новый город.
        </div>
      )}
      
      <button
        className={`capture-button ${showAvailableCities ? 'active' : ''}`}
        onClick={toggleCityView}
        disabled={!player?.resources || player.resources.gold < CITY_CAPTURE_COST}
      >
        <span className="capture-icon">🏰</span>
        <span className="capture-text">
          {showAvailableCities ? 'Скрыть города' : 'Показать города на карте'}
        </span>
        <span className="capture-cost">{CITY_CAPTURE_COST} 💰</span>
      </button>
      
      {showAvailableCities && (
        <div className="city-hint">
          👆 Кликните на зелёный город на карте чтобы захватить его
          <br/>
          <small>Доступно городов: {availableCities.length}</small>
        </div>
      )}
    </div>
  );
};