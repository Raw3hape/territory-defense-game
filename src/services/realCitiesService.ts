import type { City, Position } from '../types/game.types';
import { calculateDistance } from '../data/worldCities';

// Кэш для городов чтобы не делать много запросов
const citiesCache = new Map<string, City[]>();

// Получить реальные города в области через Nominatim API
export async function getRealCitiesInArea(
  center: Position,
  radiusKm: number
): Promise<City[]> {
  const cacheKey = `${center.lat.toFixed(2)},${center.lng.toFixed(2)}-${radiusKm}`;
  
  // Проверяем кэш
  if (citiesCache.has(cacheKey)) {
    return citiesCache.get(cacheKey)!;
  }

  try {
    // Рассчитываем bounding box
    const latDegrees = radiusKm / 111; // 1 градус широты ≈ 111 км
    const lngDegrees = radiusKm / (111 * Math.cos(center.lat * Math.PI / 180));
    
    const south = center.lat - latDegrees;
    const north = center.lat + latDegrees;
    const west = center.lng - lngDegrees;
    const east = center.lng + lngDegrees;
    
    // Запрос к Nominatim API для получения городов
    // Ограничиваем типы только городами и поселками
    const query = `[out:json][timeout:25];
    (
      node["place"~"city|town"]["name"](${south},${west},${north},${east});
    );
    out body;`;
    
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      headers: {
        'Content-Type': 'text/plain'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch cities');
    }

    const data = await response.json();
    
    const cities: City[] = data.elements
      .filter((element: any) => element.tags?.name && element.lat && element.lon)
      .map((element: any) => ({
        id: `osm-${element.id}`,
        name: element.tags.name,
        position: {
          lat: element.lat,
          lng: element.lon
        },
        population: parseInt(element.tags.population || '50000'),
        country: element.tags['addr:country'] || element.tags.country || 'Unknown',
        isCapital: element.tags.capital === 'yes'
      }))
      .filter((city: City) => {
        // Фильтруем по расстоянию от центра
        const distance = calculateDistance(center, city.position);
        return distance <= radiusKm;
      });
    
    // Сохраняем в кэш
    citiesCache.set(cacheKey, cities);
    
    return cities;
  } catch (error) {
    console.error('Error fetching real cities:', error);
    // Возвращаем пустой массив если API недоступен
    return [];
  }
}

// Альтернативный метод: использовать Nominatim напрямую
export async function searchNearbyPlaces(
  center: Position,
  radiusKm: number
): Promise<City[]> {
  const cacheKey = `nominatim-${center.lat.toFixed(2)},${center.lng.toFixed(2)}-${radiusKm}`;
  
  if (citiesCache.has(cacheKey)) {
    return citiesCache.get(cacheKey)!;
  }

  try {
    // Используем reverse geocoding для поиска ближайших населенных пунктов
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=city&limit=50&viewbox=${
      center.lng - radiusKm/111
    },${
      center.lat - radiusKm/111
    },${
      center.lng + radiusKm/111
    },${
      center.lat + radiusKm/111
    }&bounded=1&extratags=1&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TerritoryDefenseGame/1.0'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch from Nominatim');
    }

    const data = await response.json();
    
    const cities: City[] = data
      .filter((place: any) => 
        place.lat && place.lon && 
        (place.type === 'city' || place.type === 'town' || place.class === 'place')
      )
      .map((place: any) => ({
        id: `nominatim-${place.place_id}`,
        name: place.display_name.split(',')[0],
        position: {
          lat: parseFloat(place.lat),
          lng: parseFloat(place.lon)
        },
        population: parseInt(place.extratags?.population || '50000'),
        country: place.address?.country || 'Unknown',
        isCapital: place.extratags?.capital === 'yes'
      }))
      .filter((city: City) => {
        const distance = calculateDistance(center, city.position);
        return distance <= radiusKm;
      });
    
    citiesCache.set(cacheKey, cities);
    return cities;
  } catch (error) {
    console.error('Error with Nominatim:', error);
    return [];
  }
}

// Объединенный метод: сначала пробуем API, потом фоллбэк на локальную базу
export async function getAllRealCitiesInRadius(
  center: Position,
  radiusKm: number,
  localCities: City[]
): Promise<City[]> {
  // Сначала пробуем получить реальные города из API
  let apiCities: City[] = [];
  
  try {
    // Пробуем Overpass API (самый точный)
    apiCities = await getRealCitiesInArea(center, radiusKm);
    
    if (apiCities.length === 0) {
      // Если Overpass не дал результатов, пробуем Nominatim
      apiCities = await searchNearbyPlaces(center, radiusKm);
    }
  } catch (error) {
    console.log('API unavailable, using local database');
  }
  
  // Если получили города из API, используем их
  if (apiCities.length > 0) {
    return apiCities;
  }
  
  // Иначе используем локальную базу данных
  return localCities.filter(city => {
    const distance = calculateDistance(center, city.position);
    return distance <= radiusKm;
  });
}