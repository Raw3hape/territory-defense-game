import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle, Polygon } from 'react-leaflet';
import L from 'leaflet';
import type { LeafletMouseEvent } from 'leaflet';
import { useGameStore } from '../../store/gameStore';
import { TowerType, EnemyType } from '../../types/game.types';
import type { Position, Enemy } from '../../types/game.types';
import { FastProjectiles } from './FastProjectiles';
import { EnemyPaths } from './EnemyPaths';
import { CityBoundaries } from './CityBoundaries';
import 'leaflet/dist/leaflet.css';

// Фикс для иконок Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Кастомные иконки для башен
const createTowerIcon = (type: TowerType) => {
  const colors = {
    [TowerType.BASIC]: '#4A90E2',
    [TowerType.SNIPER]: '#7B68EE',
    [TowerType.SPLASH]: '#FF6B6B',
    [TowerType.SLOW]: '#4ECDC4'
  };

  return L.divIcon({
    className: 'tower-icon',
    html: `
      <div style="
        width: 30px;
        height: 30px;
        background: ${colors[type]};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        cursor: pointer;
      ">
        ${type === TowerType.BASIC ? 'B' :
          type === TowerType.SNIPER ? 'S' :
          type === TowerType.SPLASH ? 'A' : 'F'}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

// Иконка для врагов с полоской здоровья
const createEnemyIcon = (enemy: Enemy) => {
  const healthPercent = (enemy.health / enemy.maxHealth) * 100;
  const healthColor = healthPercent > 50 ? '#4CAF50' : healthPercent > 25 ? '#FFA500' : '#FF0000';
  
  // Разные стили для разных типов врагов
  let enemyStyle = '';
  let enemyIcon = '';
  let size = 20;
  
  switch(enemy.type) {
    case EnemyType.REGULAR:
      enemyStyle = `
        background: #FF3B30;
        border: 2px solid #8B0000;
        border-radius: 50%;`;
      enemyIcon = '👾'; // Обычный монстр
      size = 20;
      break;
    case EnemyType.FAST:
      enemyStyle = `
        background: #FFD700;
        border: 2px solid #FFA500;
        border-radius: 30%;`;
      enemyIcon = '⚡'; // Молния для быстрого
      size = 18;
      break;
    case EnemyType.TANK:
      enemyStyle = `
        background: #666666;
        border: 3px solid #333333;
        border-radius: 20%;`;
      enemyIcon = '🛡️'; // Щит для танка
      size = 26;
      break;
    default:
      enemyStyle = `
        background: #FF3B30;
        border: 2px solid #8B0000;
        border-radius: 50%;`;
      enemyIcon = '👹';
      size = 20;
  }
  
  return L.divIcon({
    className: 'enemy-icon',
    html: `
      <div style="position: relative;">
        <div style="
          width: ${size}px;
          height: ${size}px;
          ${enemyStyle}
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${size * 0.7}px;
        ">${enemyIcon}</div>
        <div style="
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 30px;
          height: 3px;
          background: rgba(0,0,0,0.3);
          border-radius: 2px;
        ">
          <div style="
            width: ${healthPercent}%;
            height: 100%;
            background: ${healthColor};
            border-radius: 2px;
          "></div>
        </div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

// Иконка для городов
const cityIcon = (isCaptured: boolean) => L.divIcon({
  className: 'city-icon',
  html: `
    <div style="
      width: 40px;
      height: 40px;
      background: ${isCaptured ? '#4CAF50' : '#FFA726'};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 3px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      color: white;
    ">🏙️</div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

// Компонент для обработки кликов на карте
function MapClickHandler() {
  const { placingTowerType, placeTower, showAvailableCities, availableCitiesForCapture, captureNewCity, setShowAvailableCities } = useGameStore();
  
  useMapEvents({
    click: (e) => {
      // Если показываются города для захвата, проверяем клик по ним
      if (showAvailableCities && availableCitiesForCapture.length > 0) {
        // Проверяем клик по городу
        const clickedCity = availableCitiesForCapture.find(city => {
          const distance = Math.sqrt(
            Math.pow(city.position.lat - e.latlng.lat, 2) + 
            Math.pow(city.position.lng - e.latlng.lng, 2)
          ) * 111; // примерное преобразование в км
          return distance < 20; // 20км радиус для клика
        });
        
        if (clickedCity) {
          const state = useGameStore.getState();
          if (state.player.resources.gold >= 500) {
            if (captureNewCity(clickedCity.id)) {
              setShowAvailableCities(false);
              alert(`✅ Город ${clickedCity.name} успешно захвачен!\n🏰 Новый лимит башен: ${state.getTowerLimit()}`);
            }
          } else {
            alert(`⚠️ Недостаточно золота!\n💰 Нужно: 500\n💰 У вас: ${state.player.resources.gold}`);
          }
          return;
        }
      }
      
      // Иначе размещаем башню
      if (placingTowerType) {
        const position: Position = {
          lat: e.latlng.lat,
          lng: e.latlng.lng
        };
        
        if (placeTower(placingTowerType, position)) {
          // Башня размещена успешно
        } else {
          alert('Недостаточно золота!');
        }
      }
    }
  });
  
  return null;
}

interface GameMapProps {
  center?: Position;
}

export const GameMap: React.FC<GameMapProps> = ({ center }) => {
  const { 
    towers, 
    enemies, 
    player,
    enemyBases,
    placingTowerType,
    selectedTower,
    availableCitiesForCapture,
    showAvailableCities,
    captureNewCity,
    capturedCitiesData
  } = useGameStore();
  
  const mapCenter = center || player?.startCity?.position || { lat: 40, lng: 0 };
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    // Обновляем ключ карты при изменении центра
    setMapKey(prev => prev + 1);
  }, [center]);

  return (
    <div className="game-map-container" style={{ 
      height: '100%', 
      width: '100%',
      cursor: placingTowerType ? 'crosshair' : 'grab'
    }}>
      <MapContainer
        key={mapKey}
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={5}
        style={{ height: '100%', width: '100%' }}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
        minZoom={2}
        maxZoom={18}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapClickHandler />
        
        {/* Границы города с полупрозрачной заливкой */}
        <CityBoundaries 
          expansionLevel={player?.territory?.expansionLevel || 0}
          showAnimation={true}
        />
        
        {/* Снаряды (быстрые пули) */}
        <FastProjectiles />

        {/* Вражеские базы */}
        {enemyBases?.map(base => (
          <React.Fragment key={base.id}>
            <Marker
              position={[base.city.position.lat, base.city.position.lng]}
              icon={L.divIcon({
                className: 'enemy-base-icon',
                html: `
                  <div style="
                    width: 50px;
                    height: 50px;
                    background: ${base.health > 0 ? '#8B0000' : '#555'};
                    border: 3px solid ${base.health > 0 ? '#FF0000' : '#333'};
                    border-radius: 50%;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    position: relative;
                  ">
                    ${base.health > 0 ? '⚔️' : '💀'}
                    <div style="
                      position: absolute;
                      bottom: -10px;
                      left: 50%;
                      transform: translateX(-50%);
                      width: 40px;
                      height: 4px;
                      background: rgba(0,0,0,0.3);
                      border-radius: 2px;
                    ">
                      <div style="
                        width: ${(base.health / base.maxHealth) * 100}%;
                        height: 100%;
                        background: ${base.health > 100 ? '#FF0000' : '#8B0000'};
                        border-radius: 2px;
                      "></div>
                    </div>
                  </div>
                `,
                iconSize: [50, 50],
                iconAnchor: [25, 25]
              })}
            >
              <Popup>
                <div>
                  <h3>🏴 Вражеская база</h3>
                  <p>Город: {base.city.name}</p>
                  <p>Здоровье: {base.health}/{base.maxHealth}</p>
                  <p>Скорость спавна: {base.spawnRate.toFixed(1)} врагов/сек</p>
                  {base.health <= 0 && <p style={{ color: '#4CAF50' }}>✓ Уничтожена</p>}
                </div>
              </Popup>
            </Marker>
            {/* Радиус угрозы базы */}
            {base.health > 0 && (
              <Circle
                center={[base.city.position.lat, base.city.position.lng]}
                radius={30000} // 30 км радиус угрозы
                pathOptions={{
                  color: '#FF0000',
                  fillColor: '#FF0000',
                  fillOpacity: 0.05,
                  weight: 1,
                  dashArray: '10, 10'
                }}
              />
            )}
          </React.Fragment>
        ))}

        {/* Территория игрока */}
        {player?.territory?.bounds?.length > 2 && (
          <Polygon 
            positions={player.territory.bounds.map(p => [p.lat, p.lng])}
            pathOptions={{
              color: '#4CAF50',
              weight: 3,
              opacity: 0.8,
              fillColor: '#4CAF50',
              fillOpacity: 0.2
            }}
          />
        )}

        {/* Доступные для захвата города */}
        {showAvailableCities && availableCitiesForCapture.map(city => (
          <React.Fragment key={`capture-${city.id}`}>
            <Circle
              center={[city.position.lat, city.position.lng]}
              radius={15000} // 15км радиус для лучшей видимости
              pathOptions={{
                color: '#4CAF50',
                fillColor: '#4CAF50',
                fillOpacity: 0.15,
                weight: 3,
                dashArray: '10, 5'
              }}
            />
            <Marker
              position={[city.position.lat, city.position.lng]}
              icon={L.divIcon({
                className: 'available-city-icon',
                html: `
                  <div style="
                    width: 45px;
                    height: 45px;
                    background: linear-gradient(135deg, #4CAF50, #45a049);
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    color: white;
                    cursor: pointer;
                    animation: pulse 2s infinite;
                    position: relative;
                  ">
                    🏰
                    <div style="
                      position: absolute;
                      top: -25px;
                      left: 50%;
                      transform: translateX(-50%);
                      background: #4CAF50;
                      color: white;
                      padding: 2px 8px;
                      border-radius: 4px;
                      font-size: 10px;
                      font-weight: bold;
                      white-space: nowrap;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    ">${city.name}</div>
                  </div>
                `,
                iconSize: [50, 50],
                iconAnchor: [25, 25]
              })}
              eventHandlers={{
                click: (e: LeafletMouseEvent) => {
                  e.originalEvent.stopPropagation();
                  const state = useGameStore.getState();
                  if (state.player.resources.gold >= 500) {
                    if (captureNewCity(city.id)) {
                      // Убираем подсветку после захвата
                      state.setShowAvailableCities(false);
                      alert(`✅ Город ${city.name} успешно захвачен!\n🏰 Новый лимит башен: ${state.getTowerLimit()}`);
                    }
                  } else {
                    alert(`⚠️ Недостаточно золота!\n💰 Нужно: 500\n💰 У вас: ${state.player.resources.gold}`);
                  }
                }
              }}
            >
              <Popup>
                <div>
                  <h3>🏰 Доступен для захвата</h3>
                  <p><strong>{city.name}</strong></p>
                  <p>{city.country}</p>
                  <p>Население: {city.population.toLocaleString()}</p>
                  <p>Стоимость: 500 💰</p>
                  <p style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                    Кликните на маркер города для захвата
                  </p>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}
        
        {/* Стартовый город */}
        {player?.startCity && (
          <React.Fragment key={`city-${player.startCity.id}`}>
            <Marker
              position={[player.startCity.position.lat, player.startCity.position.lng]}
              icon={L.divIcon({
                className: 'player-city-icon',
                html: `
                  <div style="
                    width: 50px;
                    height: 50px;
                    background: linear-gradient(135deg, #4CAF50, #45a049);
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    position: relative;
                  ">
                    🏰
                    <div style="
                      position: absolute;
                      bottom: -10px;
                      left: 50%;
                      transform: translateX(-50%);
                      width: 40px;
                      height: 4px;
                      background: rgba(0,0,0,0.3);
                      border-radius: 2px;
                    ">
                      <div style="
                        width: ${((player.startCity.health || 100) / (player.startCity.maxHealth || 100)) * 100}%;
                        height: 100%;
                        background: ${(player.startCity.health || 100) > 50 ? '#4CAF50' : (player.startCity.health || 100) > 25 ? '#FFA500' : '#FF0000'};
                        border-radius: 2px;
                      "></div>
                    </div>
                  </div>
                `,
                iconSize: [50, 50],
                iconAnchor: [25, 25]
              })}
            >
              <Popup>
                <div>
                  <h3>🏰 Стартовый город</h3>
                  <p><strong>{player.startCity.name}</strong></p>
                  <p>{player.startCity.country}</p>
                  <p>Население: {player.startCity.population.toLocaleString()}</p>
                  <p>Здоровье: {player.startCity.health || 100}/{player.startCity.maxHealth || 100}</p>
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[player.startCity.position.lat, player.startCity.position.lng]}
              radius={20000} // 20км радиус защиты
              pathOptions={{
                color: '#4CAF50',
                fillColor: '#4CAF50',
                fillOpacity: 0.05,
                weight: 2,
                dashArray: '5, 10'
              }}
            />
          </React.Fragment>
        )}
        
        {/* Захваченные города */}
        {capturedCitiesData?.map(city => (
          <React.Fragment key={`captured-${city.id}`}>
            <Marker
              position={[city.position.lat, city.position.lng]}
              icon={L.divIcon({
                className: 'captured-city-icon',
                html: `
                  <div style="
                    width: 45px;
                    height: 45px;
                    background: linear-gradient(135deg, #2196F3, #1976D2);
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    position: relative;
                  ">
                    🏙️
                    <div style="
                      position: absolute;
                      bottom: -10px;
                      left: 50%;
                      transform: translateX(-50%);
                      width: 40px;
                      height: 4px;
                      background: rgba(0,0,0,0.3);
                      border-radius: 2px;
                    ">
                      <div style="
                        width: ${(city.health / city.maxHealth) * 100}%;
                        height: 100%;
                        background: ${city.health > 50 ? '#4CAF50' : city.health > 25 ? '#FFA500' : '#FF0000'};
                        border-radius: 2px;
                      "></div>
                    </div>
                  </div>
                `,
                iconSize: [45, 45],
                iconAnchor: [22, 22]
              })}
            >
              <Popup>
                <div>
                  <h3>🏙️ Захваченный город</h3>
                  <p><strong>{city.name}</strong></p>
                  <p>{city.country}</p>
                  <p>Население: {city.population.toLocaleString()}</p>
                  <p>Здоровье: {city.health}/{city.maxHealth}</p>
                  {city.health < 50 && (
                    <p style={{ color: '#FF9800', fontWeight: 'bold' }}>
                      ⚠️ Город под атакой!
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[city.position.lat, city.position.lng]}
              radius={15000} // 15км радиус защиты
              pathOptions={{
                color: city.health > 50 ? '#2196F3' : '#FF9800',
                fillColor: city.health > 50 ? '#2196F3' : '#FF9800',
                fillOpacity: 0.05,
                weight: 2,
                dashArray: city.health > 50 ? '5, 10' : undefined
              }}
            />
          </React.Fragment>
        ))}

        {/* Башни */}
        {towers.map(tower => (
          <React.Fragment key={tower.id}>
            <Marker
              position={[tower.position.lat, tower.position.lng]}
              icon={createTowerIcon(tower.type)}
            >
              <Popup>
                <div>
                  <h3>Башня {tower.type}</h3>
                  <p>Урон: {tower.damage}</p>
                  <p>Скорострельность: {tower.fireRate}/сек</p>
                  <p>Уровень: {tower.level}</p>
                </div>
              </Popup>
            </Marker>
            {/* Радиус башни - всегда видимый */}
            <Circle
              center={[tower.position.lat, tower.position.lng]}
              radius={tower.range * 1000} // конвертируем км в метры
              pathOptions={{
                color: tower.targetId ? '#FF0000' : '#4A90E2',
                fillColor: tower.targetId ? '#FF0000' : '#4A90E2',
                fillOpacity: 0.05,
                weight: tower.targetId ? 2 : 1,
                dashArray: tower.targetId ? undefined : '5, 10'
              }}
            />
          </React.Fragment>
        ))}

        {/* Враги */}
        {enemies.map(enemy => (
          <Marker
            key={enemy.id}
            position={[enemy.position.lat, enemy.position.lng]}
            icon={createEnemyIcon(enemy)}
          >
            <Popup>
              <div>
                <p>Здоровье: {enemy.health}/{enemy.maxHealth}</p>
                <p>Скорость: {enemy.speed} км/ч</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};