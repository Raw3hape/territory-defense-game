import type { Position } from '../types/game.types';

// Используем Nominatim API от OpenStreetMap для геокодинга
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

export interface GeocodingResult {
  name: string;
  country: string;
  position: Position;
  type: string;
  displayName: string;
}

// Обратное геокодирование - получение информации о месте по координатам
export async function reverseGeocode(position: Position): Promise<GeocodingResult | null> {
  try {
    const url = `${NOMINATIM_URL}/reverse?lat=${position.lat}&lon=${position.lng}&format=json&accept-language=ru&zoom=10`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TerritoryDefenseGame/1.0'
      }
    });
    
    if (!response.ok) {
      console.error('Geocoding error:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    
    if (!data || data.error) {
      console.error('Geocoding error:', data?.error);
      return null;
    }
    
    // Извлекаем название города или населенного пункта
    const address = data.address || {};
    const name = address.city || 
                 address.town || 
                 address.village || 
                 address.hamlet ||
                 address.suburb ||
                 address.municipality ||
                 address.state_district ||
                 address.state ||
                 data.display_name?.split(',')[0] ||
                 'Неизвестное место';
    
    const country = address.country || 'Неизвестная страна';
    
    return {
      name: name,
      country: country,
      position: {
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lon)
      },
      type: data.type || 'place',
      displayName: data.display_name || `${name}, ${country}`
    };
  } catch (error) {
    console.error('Geocoding service error:', error);
    return null;
  }
}

// Прямое геокодирование - поиск координат по названию
export async function geocode(query: string): Promise<GeocodingResult[]> {
  try {
    const url = `${NOMINATIM_URL}/search?q=${encodeURIComponent(query)}&format=json&accept-language=ru&limit=10`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TerritoryDefenseGame/1.0'
      }
    });
    
    if (!response.ok) {
      console.error('Geocoding search error:', response.statusText);
      return [];
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      return [];
    }
    
    return data.map(item => {
      const parts = item.display_name.split(',');
      const name = parts[0]?.trim() || 'Неизвестное место';
      const country = parts[parts.length - 1]?.trim() || 'Неизвестная страна';
      
      return {
        name: name,
        country: country,
        position: {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        },
        type: item.type || 'place',
        displayName: item.display_name
      };
    });
  } catch (error) {
    console.error('Geocoding search error:', error);
    return [];
  }
}

// Кэш для избежания повторных запросов
const geocodeCache = new Map<string, GeocodingResult>();

export async function reverseGeocodeWithCache(position: Position): Promise<GeocodingResult | null> {
  const cacheKey = `${position.lat.toFixed(3)},${position.lng.toFixed(3)}`;
  
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey) || null;
  }
  
  const result = await reverseGeocode(position);
  
  if (result) {
    geocodeCache.set(cacheKey, result);
  }
  
  return result;
}