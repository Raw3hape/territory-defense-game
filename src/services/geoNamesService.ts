import type { City, Position } from '../types/game.types';
import { calculateDistance, WORLD_CITIES } from '../data/worldCities';
import { citiesCache } from './citiesCache';

// GeoNames API - бесплатный сервис с реальными городами
const GEONAMES_USERNAME = 'territorydefense'; // Нужно зарегистрироваться на geonames.org

export async function getRealCitiesFromGeoNames(
  center: Position,
  radiusKm: number
): Promise<City[]> {
  // Проверяем глобальный кэш
  const cached = citiesCache.get(center, radiusKm);
  if (cached) {
    return cached;
  }

  try {
    // GeoNames API для поиска городов в радиусе (используем HTTPS)
    // Ограничиваем до 50 городов для быстрой загрузки
    const url = `https://secure.geonames.org/findNearbyPlaceNameJSON?lat=${center.lat}&lng=${center.lng}&radius=${radiusKm}&cities=cities15000&maxRows=50&username=${GEONAMES_USERNAME}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.geonames) {
      console.error('GeoNames API error:', data);
      return [];
    }
    
    const cities: City[] = data.geonames.map((place: any) => ({
      id: `geonames-${place.geonameId}`,
      name: place.name || place.toponymName,
      position: {
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lng)
      },
      population: parseInt(place.population || '10000'),
      country: place.countryName || place.countryCode || 'Unknown',
      isCapital: place.fcode === 'PPLC' || place.fcl === 'PPLC'
    }));
    
    citiesCache.set(center, radiusKm, cities);
    return cities;
  } catch (error) {
    console.error('Error fetching from GeoNames:', error);
    return [];
  }
}

// Overpass API (OpenStreetMap) - альтернативный бесплатный источник
export async function getRealCitiesFromOSM(
  center: Position,
  radiusKm: number
): Promise<City[]> {
  // Проверяем глобальный кэш
  const cached = citiesCache.get(center, radiusKm);
  if (cached) {
    return cached;
  }

  try {
    // Расчет bounding box
    const latDegrees = radiusKm / 111;
    const lngDegrees = radiusKm / (111 * Math.cos(center.lat * Math.PI / 180));
    
    const south = center.lat - latDegrees;
    const north = center.lat + latDegrees;
    const west = center.lng - lngDegrees;
    const east = center.lng + lngDegrees;
    
    // Overpass QL запрос для получения городов
    // Получаем все города и крупные поселения
    const query = `
      [out:json][timeout:10];
      (
        node["place"="city"]["name"](${south},${west},${north},${east});
        node["place"="town"]["name"](${south},${west},${north},${east});
        node["place"="village"]["name"]["population">"10000"](${south},${west},${north},${east});
      );
      out body 50;
    `;
    
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      headers: {
        'Content-Type': 'text/plain'
      }
    });

    const data = await response.json();
    
    const cities: City[] = data.elements
      .filter((el: any) => el.tags?.name)
      .map((el: any) => ({
        id: `osm-${el.id}`,
        name: el.tags.name,
        position: {
          lat: el.lat,
          lng: el.lon
        },
        population: parseInt(el.tags.population || '50000'),
        country: el.tags['addr:country'] || 'Unknown',
        isCapital: el.tags.capital === 'yes'
      }))
      .filter((city: City) => {
        const distance = calculateDistance(center, city.position);
        return distance <= radiusKm;
      });
    
    citiesCache.set(center, radiusKm, cities);
    return cities;
  } catch (error) {
    console.error('Error fetching from OSM:', error);
    return [];
  }
}

// Photon API (на основе OSM, но быстрее)
export async function getRealCitiesFromPhoton(
  center: Position,
  radiusKm: number
): Promise<City[]> {
  // Проверяем глобальный кэш
  const cached = citiesCache.get(center, radiusKm);
  if (cached) {
    return cached;
  }

  try {
    // Photon API для реверс-геокодинга
    const url = `https://photon.komoot.io/reverse?lat=${center.lat}&lon=${center.lng}&radius=${radiusKm}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Photon API error:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    const cities: City[] = data.features
      .filter((f: any) => 
        f.properties?.type === 'city' || 
        f.properties?.type === 'town' ||
        f.properties?.osm_value === 'city' ||
        f.properties?.osm_value === 'town'
      )
      .map((f: any) => ({
        id: `photon-${f.properties.osm_id}`,
        name: f.properties.name || f.properties.city || f.properties.town,
        position: {
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0]
        },
        population: 50000, // Photon не предоставляет население
        country: f.properties.country || 'Unknown',
        isCapital: false
      }))
      .filter((city: City) => {
        const distance = calculateDistance(center, city.position);
        return distance <= radiusKm;
      });
    
    citiesCache.set(center, radiusKm, cities);
    return cities;
  } catch (error) {
    console.error('Error fetching from Photon:', error);
    return [];
  }
}

// Функция для получения городов из локальной базы (fallback)
export function getLocalCities(
  center: Position,
  radiusKm: number
): City[] {
  return WORLD_CITIES.filter(city => {
    const distance = calculateDistance(center, city.position);
    return distance <= radiusKm;
  });
}

// Главная функция - пробует разные источники
export async function getRealCities(
  center: Position,
  radiusKm: number,
  maxCities: number = 30 // Увеличиваем лимит городов
): Promise<City[]> {
  let cities: City[] = [];
  
  // Пробуем OSM Overpass API (самый точный)
  cities = await getRealCitiesFromOSM(center, radiusKm);
  
  if (cities.length === 0) {
    // Если OSM не работает, пробуем GeoNames
    cities = await getRealCitiesFromGeoNames(center, radiusKm);
  }
  
  if (cities.length === 0) {
    // Если и GeoNames не работает, пробуем Photon
    cities = await getRealCitiesFromPhoton(center, radiusKm);
  }
  
  if (cities.length === 0) {
    // Если все API недоступны, используем локальную базу
    console.warn('Все API недоступны, используем локальную базу городов');
    cities = getLocalCities(center, radiusKm);
  }
  
  // Убираем дубликаты по названию и близкому расположению
  const uniqueCities = new Map<string, City>();
  
  cities.forEach(city => {
    const key = `${city.name}-${Math.round(city.position.lat)}-${Math.round(city.position.lng)}`;
    if (!uniqueCities.has(key)) {
      uniqueCities.set(key, city);
    }
  });
  
  // Сортируем города по приоритету:
  // 1. По расстоянию (ближе - важнее)
  // 2. Столицы
  // 3. По населению (большие города важнее)
  const sortedCities = Array.from(uniqueCities.values()).sort((a, b) => {
    const distA = calculateDistance(center, a.position);
    const distB = calculateDistance(center, b.position);
    
    // Сначала по расстоянию (ближе лучше)
    if (Math.abs(distA - distB) > 50) { // Если разница больше 50 км
      return distA - distB;
    }
    
    // Потом столицы в приоритете
    if (a.isCapital && !b.isCapital) return -1;
    if (!a.isCapital && b.isCapital) return 1;
    
    // Затем по населению
    return b.population - a.population;
  });
  
  // Возвращаем ограниченное количество самых важных городов
  return sortedCities.slice(0, maxCities);
}

// Функция для предзагрузки городов в области
export async function preloadCitiesInArea(
  center: Position,
  radiusKm: number
): Promise<void> {
  // Загружаем города заранее в кэш (максимум 20 важных городов)
  await getRealCities(center, radiusKm, 20);
}