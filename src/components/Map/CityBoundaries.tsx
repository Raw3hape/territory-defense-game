import React, { useEffect, useState } from 'react';
import { Polygon } from 'react-leaflet';
import { useGameStore } from '../../store/gameStore';
import { getCityBoundaries, expandBoundaries, simplifyBoundary, fallbackBoundaries } from '../../services/cityBoundariesService';
import type { Position } from '../../types/game.types';

interface CityBoundariesProps {
  expansionLevel?: number; // Уровень расширения территории в км
  showAnimation?: boolean;
}

export const CityBoundaries: React.FC<CityBoundariesProps> = ({ 
  expansionLevel = 0, 
  showAnimation = true 
}) => {
  const { player } = useGameStore();
  const [cityBoundaries, setCityBoundaries] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    const loadBoundaries = async () => {
      if (!player?.startCity) return;

      setIsLoading(true);
      
      try {
        // Пытаемся получить реальные границы города
        const boundaries = await getCityBoundaries(
          player.startCity.name, 
          player.startCity.country
        );

        if (boundaries) {
          // Упрощаем полигон для оптимизации
          const simplified = simplifyBoundary(boundaries);
          
          // Расширяем границы если нужно
          let finalBoundaries = simplified;
          if (expansionLevel > 0) {
            finalBoundaries = expandBoundaries(simplified, expansionLevel);
          }
          
          setCityBoundaries(finalBoundaries.coordinates);
        } else {
          // Используем фоллбэк границы если есть
          const fallback = fallbackBoundaries[player.startCity.name];
          if (fallback) {
            setCityBoundaries(fallback);
          } else {
            // Создаём круговую границу вокруг города
            setCityBoundaries(createCircularBoundary(
              player.startCity.position, 
              20 + expansionLevel // Базовый радиус 20км + расширение
            ));
          }
        }
      } catch (error) {
        console.error('Error loading city boundaries:', error);
        // Фоллбэк на круговую границу
        setCityBoundaries(createCircularBoundary(
          player.startCity.position, 
          20 + expansionLevel
        ));
      } finally {
        setIsLoading(false);
      }
    };

    loadBoundaries();
  }, [player?.startCity, expansionLevel]);

  // Анимация пульсации границ
  useEffect(() => {
    if (!showAnimation) return;

    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 360);
    }, 50);

    return () => clearInterval(interval);
  }, [showAnimation]);

  if (isLoading || cityBoundaries.length === 0) {
    return null;
  }

  // Вычисляем цвет и прозрачность на основе фазы анимации
  const opacity = showAnimation 
    ? 0.15 + Math.sin(animationPhase * Math.PI / 180) * 0.05 
    : 0.2;
  
  const strokeOpacity = showAnimation
    ? 0.6 + Math.sin(animationPhase * Math.PI / 180) * 0.2
    : 0.8;

  // Определяем цвет в зависимости от состояния
  const baseColor = player?.capturedCities?.includes(player.startCity?.id || '') 
    ? '#4CAF50' // Зелёный для захваченного города
    : '#2196F3'; // Синий для стартового города

  return (
    <>
      {/* Основная граница города */}
      <Polygon
        positions={cityBoundaries}
        pathOptions={{
          color: baseColor,
          weight: 3,
          opacity: strokeOpacity,
          fillColor: baseColor,
          fillOpacity: opacity,
          dashArray: showAnimation ? undefined : '10, 10',
          lineCap: 'round',
          lineJoin: 'round'
        }}
      />
      
      {/* Внутренняя граница для эффекта свечения */}
      {showAnimation && (
        <Polygon
          positions={cityBoundaries}
          pathOptions={{
            color: baseColor,
            weight: 1,
            opacity: 0.9,
            fillColor: 'transparent',
            fillOpacity: 0,
            dashArray: '5, 5'
          }}
        />
      )}
      
      {/* Дополнительные расширенные границы для визуализации роста территории */}
      {expansionLevel > 0 && (
        <>
          {[0.3, 0.6, 1].map((factor, index) => {
            const expandedBoundaries = expandBoundaries(
              { cityName: '', coordinates: cityBoundaries },
              expansionLevel * factor
            );
            
            return (
              <Polygon
                key={`expansion-${index}`}
                positions={expandedBoundaries.coordinates}
                pathOptions={{
                  color: baseColor,
                  weight: 1,
                  opacity: 0.3 - index * 0.1,
                  fillColor: 'transparent',
                  fillOpacity: 0,
                  dashArray: `${10 + index * 5}, ${10 + index * 5}`
                }}
              />
            );
          })}
        </>
      )}
    </>
  );
};

// Создаёт круговую границу вокруг точки
function createCircularBoundary(center: Position, radiusKm: number): Position[] {
  const points: Position[] = [];
  const segments = 32; // Количество сегментов для круга
  
  // Конвертируем радиус из км в градусы (приблизительно)
  const radiusDegrees = radiusKm / 111;
  
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    points.push({
      lat: center.lat + radiusDegrees * Math.sin(angle),
      lng: center.lng + radiusDegrees * Math.cos(angle) / Math.cos(center.lat * Math.PI / 180)
    });
  }
  
  return points;
}