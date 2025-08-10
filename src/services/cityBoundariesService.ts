import type { Position } from '../types/game.types';

export interface CityBoundary {
  cityName: string;
  coordinates: Position[];
  bbox?: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
  };
}

// Кэш для границ городов
const boundariesCache = new Map<string, CityBoundary>();

/**
 * Получает границы города через Nominatim API
 */
export async function getCityBoundaries(cityName: string, country?: string): Promise<CityBoundary | null> {
  // Проверяем кэш
  const cacheKey = `${cityName}_${country || ''}`;
  if (boundariesCache.has(cacheKey)) {
    return boundariesCache.get(cacheKey)!;
  }

  try {
    // Формируем запрос к Nominatim
    const query = country ? `${cityName}, ${country}` : cityName;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&polygon_geojson=1&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TerritoryDefenseGame/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.length === 0) {
      console.warn(`No boundaries found for ${query}`);
      return null;
    }
    
    const result = data[0];
    
    // Проверяем наличие полигона
    if (!result.geojson || result.geojson.type !== 'Polygon' && result.geojson.type !== 'MultiPolygon') {
      console.warn(`No polygon data for ${query}`);
      return null;
    }
    
    // Извлекаем координаты
    let coordinates: Position[] = [];
    
    if (result.geojson.type === 'Polygon') {
      // Простой полигон
      coordinates = result.geojson.coordinates[0].map((coord: number[]) => ({
        lat: coord[1],
        lng: coord[0]
      }));
    } else if (result.geojson.type === 'MultiPolygon') {
      // Мультиполигон - берём самый большой
      let maxArea = 0;
      let maxPolygon: number[][] = [];
      
      for (const polygon of result.geojson.coordinates) {
        const area = calculatePolygonArea(polygon[0]);
        if (area > maxArea) {
          maxArea = area;
          maxPolygon = polygon[0];
        }
      }
      
      coordinates = maxPolygon.map((coord: number[]) => ({
        lat: coord[1],
        lng: coord[0]
      }));
    }
    
    // Вычисляем bounding box
    const lats = coordinates.map(c => c.lat);
    const lngs = coordinates.map(c => c.lng);
    
    const boundary: CityBoundary = {
      cityName,
      coordinates,
      bbox: {
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
        minLng: Math.min(...lngs),
        maxLng: Math.max(...lngs)
      }
    };
    
    // Сохраняем в кэш
    boundariesCache.set(cacheKey, boundary);
    
    return boundary;
    
  } catch (error) {
    console.error('Error fetching city boundaries:', error);
    return null;
  }
}

/**
 * Расширяет границы города на заданное расстояние
 */
export function expandBoundaries(boundary: CityBoundary, expansionKm: number): CityBoundary {
  // Упрощённое расширение через масштабирование от центра
  const center = calculateCentroid(boundary.coordinates);
  
  const expandedCoordinates = boundary.coordinates.map(coord => {
    // Вычисляем вектор от центра к точке
    const dlat = coord.lat - center.lat;
    const dlng = coord.lng - center.lng;
    
    // Расстояние в градусах (приблизительно)
    const distance = Math.sqrt(dlat * dlat + dlng * dlng);
    
    // Коэффициент расширения (км в градусы, примерно)
    const expansionDegrees = expansionKm / 111; // 1 градус ≈ 111 км
    const scale = (distance + expansionDegrees) / distance;
    
    return {
      lat: center.lat + dlat * scale,
      lng: center.lng + dlng * scale
    };
  });
  
  return {
    ...boundary,
    coordinates: expandedCoordinates
  };
}

/**
 * Упрощает полигон для оптимизации отрисовки
 */
export function simplifyBoundary(boundary: CityBoundary, tolerance: number = 0.001): CityBoundary {
  // Douglas-Peucker algorithm для упрощения полигона
  const simplified = douglasPeucker(boundary.coordinates, tolerance);
  
  return {
    ...boundary,
    coordinates: simplified
  };
}

// Вспомогательные функции

function calculatePolygonArea(coordinates: number[][]): number {
  let area = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    area += coordinates[i][0] * coordinates[i + 1][1];
    area -= coordinates[i + 1][0] * coordinates[i][1];
  }
  return Math.abs(area / 2);
}

function calculateCentroid(coordinates: Position[]): Position {
  let sumLat = 0;
  let sumLng = 0;
  
  for (const coord of coordinates) {
    sumLat += coord.lat;
    sumLng += coord.lng;
  }
  
  return {
    lat: sumLat / coordinates.length,
    lng: sumLng / coordinates.length
  };
}

function douglasPeucker(points: Position[], tolerance: number): Position[] {
  if (points.length <= 2) {
    return points;
  }
  
  // Находим точку с максимальным расстоянием от линии
  let maxDistance = 0;
  let maxIndex = 0;
  
  const start = points[0];
  const end = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }
  
  // Если максимальное расстояние больше допуска, рекурсивно упрощаем
  if (maxDistance > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIndex), tolerance);
    
    return [...left.slice(0, -1), ...right];
  } else {
    return [start, end];
  }
}

function perpendicularDistance(point: Position, lineStart: Position, lineEnd: Position): number {
  const dx = lineEnd.lng - lineStart.lng;
  const dy = lineEnd.lat - lineStart.lat;
  
  if (dx === 0 && dy === 0) {
    return Math.sqrt(
      Math.pow(point.lat - lineStart.lat, 2) + 
      Math.pow(point.lng - lineStart.lng, 2)
    );
  }
  
  const t = ((point.lng - lineStart.lng) * dx + (point.lat - lineStart.lat) * dy) / (dx * dx + dy * dy);
  
  const closestPoint = {
    lat: lineStart.lat + t * dy,
    lng: lineStart.lng + t * dx
  };
  
  return Math.sqrt(
    Math.pow(point.lat - closestPoint.lat, 2) + 
    Math.pow(point.lng - closestPoint.lng, 2)
  );
}

// Предзагруженные границы для популярных городов (фоллбэк)
export const fallbackBoundaries: Record<string, Position[]> = {
  'Moscow': [
    { lat: 55.9, lng: 37.3 },
    { lat: 55.9, lng: 37.9 },
    { lat: 55.5, lng: 37.9 },
    { lat: 55.5, lng: 37.3 },
    { lat: 55.9, lng: 37.3 }
  ],
  'New York': [
    { lat: 40.9, lng: -74.3 },
    { lat: 40.9, lng: -73.7 },
    { lat: 40.5, lng: -73.7 },
    { lat: 40.5, lng: -74.3 },
    { lat: 40.9, lng: -74.3 }
  ],
  'London': [
    { lat: 51.7, lng: -0.5 },
    { lat: 51.7, lng: 0.3 },
    { lat: 51.3, lng: 0.3 },
    { lat: 51.3, lng: -0.5 },
    { lat: 51.7, lng: -0.5 }
  ]
};