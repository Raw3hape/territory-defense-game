import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getRealCities } from '../../services/geoNamesService';
import { calculateDistance } from '../../data/worldCities';
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
      
      // Асинхронно загружаем реальные города
      const loadCities = async () => {
        try {
          const realCities = await getRealCities(player.startCity.position, MAX_CAPTURE_DISTANCE);
          
          // Фильтруем города: исключаем уже захваченные и слишком близкие
          const available = realCities.filter(city => {
            if (excludeIds.includes(city.id)) return false;
            const distance = calculateDistance(player.startCity!.position, city.position);
            return distance >= 30 && distance <= MAX_CAPTURE_DISTANCE; // Минимум 30км
          });
          
          setAvailableCities(available);
          setAvailableCitiesForCapture(available);
        } catch (error) {
          console.error('Ошибка загрузки городов:', error);
          setAvailableCities([]);
          setAvailableCitiesForCapture([]);
        }
      };
      
      loadCities();
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