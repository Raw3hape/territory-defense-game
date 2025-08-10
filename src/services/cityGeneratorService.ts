import type { City, Position } from '../types/game.types';
import { calculateDistance } from '../data/worldCities';
import { getAllRealCitiesInRadius } from './realCitiesService';

// Генератор случайных городов вокруг точки
export function generateNearbyCities(centerPosition: Position, radius: number, count: number = 20): City[] {
  const cities: City[] = [];
  
  // Генерируем города в радиусе
  for (let i = 0; i < count; i++) {
    // Случайный угол и расстояние
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius + 50; // Минимум 50км от центра
    
    // Конвертируем в градусы (примерно)
    const latOffset = (distance / 111) * Math.cos(angle); // 111км = 1 градус широты
    const lngOffset = (distance / (111 * Math.cos(centerPosition.lat * Math.PI / 180))) * Math.sin(angle);
    
    const position: Position = {
      lat: centerPosition.lat + latOffset,
      lng: centerPosition.lng + lngOffset
    };
    
    // Генерируем имя города
    const cityNames = [
      'Новгород', 'Старград', 'Белогорск', 'Зеленоград', 'Солнечный',
      'Речной', 'Озерск', 'Лесной', 'Горный', 'Приморск',
      'Северск', 'Южный', 'Восточный', 'Западный', 'Центральный',
      'Высокогорск', 'Долинск', 'Береговой', 'Полевой', 'Степной'
    ];
    
    const suffixes = ['', 'ск', 'град', 'поль', 'бург', 'хайм', 'вилль'];
    
    const name = cityNames[Math.floor(Math.random() * cityNames.length)] + 
                 suffixes[Math.floor(Math.random() * suffixes.length)];
    
    // Случайное население (меньшие города)
    const population = Math.floor(Math.random() * 500000) + 10000; // 10k - 500k
    
    const city: City = {
      id: `generated-${Date.now()}-${i}`,
      name: name,
      position: position,
      population: population,
      country: 'Неизвестно',
      isCapital: false
    };
    
    cities.push(city);
  }
  
  return cities;
}

// Получить все города в радиусе (реальные + сгенерированные)
export async function getAllCitiesInRadius(
  centerPosition: Position, 
  radius: number,
  existingCities: City[],
  excludeIds: string[] = [],
  minDistance: number = 30 // По умолчанию минимум 30км для захвата городов
): Promise<City[]> {
  // Сначала пробуем получить реальные города через API
  const realCities = await getAllRealCitiesInRadius(centerPosition, radius, existingCities);
  
  // Фильтруем по минимальному расстоянию и исключенным ID
  const filteredCities = realCities.filter(city => {
    if (excludeIds.includes(city.id)) return false;
    const distance = calculateDistance(centerPosition, city.position);
    return distance <= radius && distance >= minDistance;
  });
  
  return filteredCities;
}

// Синхронная версия для обратной совместимости
export function getAllCitiesInRadiusSync(
  centerPosition: Position, 
  radius: number,
  existingCities: City[],
  excludeIds: string[] = [],
  minDistance: number = 30
): City[] {
  // Фильтруем существующие города по радиусу
  const realCitiesInRadius = existingCities.filter(city => {
    if (excludeIds.includes(city.id)) return false;
    const distance = calculateDistance(centerPosition, city.position);
    return distance <= radius && distance >= minDistance;
  });
  
  // Если реальных городов достаточно, возвращаем их
  if (realCitiesInRadius.length >= 10) {
    return realCitiesInRadius;
  }
  
  // Иначе добавляем сгенерированные
  const generatedCities = generateNearbyCities(centerPosition, radius, 15 - realCitiesInRadius.length);
  
  return [...realCitiesInRadius, ...generatedCities];
}

// Получить ВСЕ города в радиусе для размещения башен (включая близкие)
export async function getAllCitiesForTowers(
  centerPosition: Position,
  radius: number,
  existingCities: City[],
  excludeIds: string[] = []
): Promise<City[]> {
  // Получаем реальные города через API
  const realCities = await getAllRealCitiesInRadius(centerPosition, radius, existingCities);
  
  // Фильтруем только по исключенным ID (без минимального расстояния)
  const citiesInRadius = realCities.filter(city => {
    if (excludeIds.includes(city.id)) return false;
    const distance = calculateDistance(centerPosition, city.position);
    return distance <= radius; // Без минимального расстояния
  });
  
  return citiesInRadius;
}

// Синхронная версия для башен
export function getAllCitiesForTowersSync(
  centerPosition: Position,
  radius: number,
  existingCities: City[],
  excludeIds: string[] = []
): City[] {
  // Для башен включаем ВСЕ города в радиусе, даже очень близкие
  const citiesInRadius = existingCities.filter(city => {
    if (excludeIds.includes(city.id)) return false;
    const distance = calculateDistance(centerPosition, city.position);
    return distance <= radius; // Без минимального расстояния
  });
  
  return citiesInRadius;
}