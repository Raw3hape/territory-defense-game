import type { Position } from '../types/game.types';

// Кеш для маршрутов
const routeCache = new Map<string, Position[]>();

export async function getRouteByRoad(from: Position, to: Position): Promise<Position[]> {
  const cacheKey = `${from.lat},${from.lng}-${to.lat},${to.lng}`;
  
  // Проверяем кеш
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  try {
    // Используем публичный OSRM сервер
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const coordinates = route.geometry.coordinates;
      
      // Конвертируем координаты из [lng, lat] в наш формат {lat, lng}
      const path: Position[] = coordinates.map((coord: [number, number]) => ({
        lat: coord[1],
        lng: coord[0]
      }));
      
      // Интерполируем путь для плавного движения
      const interpolatedPath = interpolatePath(path, 100); // Максимум 100 точек
      
      // Сохраняем в кеш
      routeCache.set(cacheKey, interpolatedPath);
      
      return interpolatedPath;
    }
  } catch (error) {
    console.warn('Failed to get route from OSRM, using fallback:', error);
  }
  
  // Fallback: прямой путь если API недоступен
  return generateStraightPath(from, to);
}

// Интерполяция пути для плавного движения
function interpolatePath(path: Position[], maxPoints: number): Position[] {
  if (path.length <= 2) return path;
  
  const result: Position[] = [];
  const totalPoints = Math.min(path.length * 2, maxPoints);
  const step = (path.length - 1) / (totalPoints - 1);
  
  for (let i = 0; i < totalPoints; i++) {
    const index = i * step;
    const baseIndex = Math.floor(index);
    const t = index - baseIndex;
    
    if (baseIndex >= path.length - 1) {
      result.push(path[path.length - 1]);
    } else {
      const p1 = path[baseIndex];
      const p2 = path[baseIndex + 1];
      
      result.push({
        lat: p1.lat + (p2.lat - p1.lat) * t,
        lng: p1.lng + (p2.lng - p1.lng) * t
      });
    }
  }
  
  return result;
}

// Генерация прямого пути как запасной вариант
function generateStraightPath(from: Position, to: Position): Position[] {
  const steps = 50;
  const path: Position[] = [];
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    path.push({
      lat: from.lat + (to.lat - from.lat) * t,
      lng: from.lng + (to.lng - from.lng) * t
    });
  }
  
  return path;
}

// Найти ближайшую дорогу к точке
export async function getNearestRoad(position: Position): Promise<Position> {
  try {
    const url = `https://router.project-osrm.org/nearest/v1/driving/${position.lng},${position.lat}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.waypoints && data.waypoints.length > 0) {
      const nearestPoint = data.waypoints[0].location;
      return {
        lat: nearestPoint[1],
        lng: nearestPoint[0]
      };
    }
  } catch (error) {
    console.warn('Failed to find nearest road:', error);
  }
  
  return position;
}

// Очистка кеша (вызывать периодически)
export function clearRouteCache() {
  routeCache.clear();
}

// Получить размер кеша
export function getRouteCacheSize(): number {
  return routeCache.size;
}