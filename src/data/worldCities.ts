import type { City } from '../types/game.types';

// Крупные города мира для офлайн игры
export const WORLD_CITIES: City[] = [
  // Европа
  { id: 'london', name: 'London', position: { lat: 51.5074, lng: -0.1278 }, population: 9000000, country: 'UK', isCapital: true },
  { id: 'paris', name: 'Paris', position: { lat: 48.8566, lng: 2.3522 }, population: 2200000, country: 'France', isCapital: true },
  { id: 'berlin', name: 'Berlin', position: { lat: 52.5200, lng: 13.4050 }, population: 3700000, country: 'Germany', isCapital: true },
  { id: 'moscow', name: 'Moscow', position: { lat: 55.7558, lng: 37.6173 }, population: 12500000, country: 'Russia', isCapital: true },
  { id: 'rome', name: 'Rome', position: { lat: 41.9028, lng: 12.4964 }, population: 2900000, country: 'Italy', isCapital: true },
  { id: 'madrid', name: 'Madrid', position: { lat: 40.4168, lng: -3.7038 }, population: 3300000, country: 'Spain', isCapital: true },
  { id: 'amsterdam', name: 'Amsterdam', position: { lat: 52.3676, lng: 4.9041 }, population: 900000, country: 'Netherlands', isCapital: true },
  { id: 'warsaw', name: 'Warsaw', position: { lat: 52.2297, lng: 21.0122 }, population: 1800000, country: 'Poland', isCapital: true },
  { id: 'minsk', name: 'Minsk', position: { lat: 53.9006, lng: 27.5590 }, population: 2000000, country: 'Belarus', isCapital: true },
  { id: 'kiev', name: 'Kiev', position: { lat: 50.4501, lng: 30.5234 }, population: 2900000, country: 'Ukraine', isCapital: true },
  { id: 'stockholm', name: 'Stockholm', position: { lat: 59.3293, lng: 18.0686 }, population: 1000000, country: 'Sweden', isCapital: true },
  { id: 'helsinki', name: 'Helsinki', position: { lat: 60.1699, lng: 24.9384 }, population: 650000, country: 'Finland', isCapital: true },
  { id: 'oslo', name: 'Oslo', position: { lat: 59.9139, lng: 10.7522 }, population: 700000, country: 'Norway', isCapital: true },
  { id: 'copenhagen', name: 'Copenhagen', position: { lat: 55.6761, lng: 12.5683 }, population: 660000, country: 'Denmark', isCapital: true },
  { id: 'vienna', name: 'Vienna', position: { lat: 48.2082, lng: 16.3738 }, population: 1900000, country: 'Austria', isCapital: true },
  { id: 'prague', name: 'Prague', position: { lat: 50.0755, lng: 14.4378 }, population: 1300000, country: 'Czech Republic', isCapital: true },
  { id: 'budapest', name: 'Budapest', position: { lat: 47.4979, lng: 19.0402 }, population: 1750000, country: 'Hungary', isCapital: true },
  { id: 'lisbon', name: 'Lisbon', position: { lat: 38.7223, lng: -9.1393 }, population: 550000, country: 'Portugal', isCapital: true },
  { id: 'athens', name: 'Athens', position: { lat: 37.9838, lng: 23.7275 }, population: 3200000, country: 'Greece', isCapital: true },
  { id: 'istanbul', name: 'Istanbul', position: { lat: 41.0082, lng: 28.9784 }, population: 15500000, country: 'Turkey' },
  { id: 'ankara', name: 'Ankara', position: { lat: 39.9334, lng: 32.8597 }, population: 5700000, country: 'Turkey', isCapital: true },
  
  // СНГ и Восточная Европа
  { id: 'saint-petersburg', name: 'Saint Petersburg', position: { lat: 59.9311, lng: 30.3609 }, population: 5400000, country: 'Russia' },
  { id: 'novosibirsk', name: 'Novosibirsk', position: { lat: 55.0084, lng: 82.9357 }, population: 1600000, country: 'Russia' },
  { id: 'yekaterinburg', name: 'Yekaterinburg', position: { lat: 56.8389, lng: 60.6057 }, population: 1500000, country: 'Russia' },
  { id: 'almaty', name: 'Almaty', position: { lat: 43.2220, lng: 76.8512 }, population: 2000000, country: 'Kazakhstan' },
  { id: 'astana', name: 'Astana', position: { lat: 51.1605, lng: 71.4704 }, population: 1200000, country: 'Kazakhstan', isCapital: true },
  { id: 'tashkent', name: 'Tashkent', position: { lat: 41.2995, lng: 69.2401 }, population: 2500000, country: 'Uzbekistan', isCapital: true },
  { id: 'baku', name: 'Baku', position: { lat: 40.4093, lng: 49.8671 }, population: 2300000, country: 'Azerbaijan', isCapital: true },
  { id: 'tbilisi', name: 'Tbilisi', position: { lat: 41.7151, lng: 44.8271 }, population: 1100000, country: 'Georgia', isCapital: true },
  { id: 'yerevan', name: 'Yerevan', position: { lat: 40.1792, lng: 44.4991 }, population: 1100000, country: 'Armenia', isCapital: true },
  { id: 'chisinau', name: 'Chisinau', position: { lat: 47.0105, lng: 28.8638 }, population: 700000, country: 'Moldova', isCapital: true },
  { id: 'riga', name: 'Riga', position: { lat: 56.9496, lng: 24.1052 }, population: 630000, country: 'Latvia', isCapital: true },
  { id: 'vilnius', name: 'Vilnius', position: { lat: 54.6872, lng: 25.2797 }, population: 580000, country: 'Lithuania', isCapital: true },
  { id: 'tallinn', name: 'Tallinn', position: { lat: 59.4370, lng: 24.7536 }, population: 450000, country: 'Estonia', isCapital: true },
  
  // Азия
  { id: 'tokyo', name: 'Tokyo', position: { lat: 35.6762, lng: 139.6503 }, population: 14000000, country: 'Japan', isCapital: true },
  { id: 'beijing', name: 'Beijing', position: { lat: 39.9042, lng: 116.4074 }, population: 21500000, country: 'China', isCapital: true },
  { id: 'shanghai', name: 'Shanghai', position: { lat: 31.2304, lng: 121.4737 }, population: 24200000, country: 'China' },
  { id: 'delhi', name: 'New Delhi', position: { lat: 28.6139, lng: 77.2090 }, population: 32000000, country: 'India', isCapital: true },
  { id: 'mumbai', name: 'Mumbai', position: { lat: 19.0760, lng: 72.8777 }, population: 20000000, country: 'India' },
  { id: 'seoul', name: 'Seoul', position: { lat: 37.5665, lng: 126.9780 }, population: 9700000, country: 'South Korea', isCapital: true },
  { id: 'singapore', name: 'Singapore', position: { lat: 1.3521, lng: 103.8198 }, population: 5700000, country: 'Singapore', isCapital: true },
  { id: 'dubai', name: 'Dubai', position: { lat: 25.2048, lng: 55.2708 }, population: 3400000, country: 'UAE' },
  { id: 'bangkok', name: 'Bangkok', position: { lat: 13.7563, lng: 100.5018 }, population: 10500000, country: 'Thailand', isCapital: true },
  
  // Америка
  { id: 'newyork', name: 'New York', position: { lat: 40.7128, lng: -74.0060 }, population: 8300000, country: 'USA' },
  { id: 'losangeles', name: 'Los Angeles', position: { lat: 34.0522, lng: -118.2437 }, population: 4000000, country: 'USA' },
  { id: 'chicago', name: 'Chicago', position: { lat: 41.8781, lng: -87.6298 }, population: 2700000, country: 'USA' },
  { id: 'washington', name: 'Washington D.C.', position: { lat: 38.9072, lng: -77.0369 }, population: 700000, country: 'USA', isCapital: true },
  { id: 'toronto', name: 'Toronto', position: { lat: 43.6532, lng: -79.3832 }, population: 2900000, country: 'Canada' },
  { id: 'mexico', name: 'Mexico City', position: { lat: 19.4326, lng: -99.1332 }, population: 9200000, country: 'Mexico', isCapital: true },
  { id: 'saopaulo', name: 'São Paulo', position: { lat: -23.5505, lng: -46.6333 }, population: 12300000, country: 'Brazil' },
  { id: 'rio', name: 'Rio de Janeiro', position: { lat: -22.9068, lng: -43.1729 }, population: 6700000, country: 'Brazil' },
  { id: 'buenosaires', name: 'Buenos Aires', position: { lat: -34.6037, lng: -58.3816 }, population: 3100000, country: 'Argentina', isCapital: true },
  
  // Африка
  { id: 'cairo', name: 'Cairo', position: { lat: 30.0444, lng: 31.2357 }, population: 21000000, country: 'Egypt', isCapital: true },
  { id: 'lagos', name: 'Lagos', position: { lat: 6.5244, lng: 3.3792 }, population: 14000000, country: 'Nigeria' },
  { id: 'johannesburg', name: 'Johannesburg', position: { lat: -26.2041, lng: 28.0473 }, population: 5700000, country: 'South Africa' },
  { id: 'nairobi', name: 'Nairobi', position: { lat: -1.2921, lng: 36.8219 }, population: 5000000, country: 'Kenya', isCapital: true },
  
  // Океания
  { id: 'sydney', name: 'Sydney', position: { lat: -33.8688, lng: 151.2093 }, population: 5300000, country: 'Australia' },
  { id: 'melbourne', name: 'Melbourne', position: { lat: -37.8136, lng: 144.9631 }, population: 5100000, country: 'Australia' },
  { id: 'auckland', name: 'Auckland', position: { lat: -36.8485, lng: 174.7633 }, population: 1700000, country: 'New Zealand' }
];

// Функция поиска города по названию
export function searchCities(query: string): City[] {
  const lowercaseQuery = query.toLowerCase().trim();
  
  if (!lowercaseQuery) return [];
  
  // Сначала ищем точные совпадения
  const exactMatches = WORLD_CITIES.filter(city => 
    city.name.toLowerCase() === lowercaseQuery ||
    city.country.toLowerCase() === lowercaseQuery
  );
  
  if (exactMatches.length > 0) {
    return exactMatches;
  }
  
  // Затем ищем частичные совпадения
  const partialMatches = WORLD_CITIES.filter(city => 
    city.name.toLowerCase().includes(lowercaseQuery) ||
    city.country.toLowerCase().includes(lowercaseQuery)
  );
  
  // Сортируем результаты: сначала те, где совпадение в начале названия
  return partialMatches.sort((a, b) => {
    const aStartsWith = a.name.toLowerCase().startsWith(lowercaseQuery);
    const bStartsWith = b.name.toLowerCase().startsWith(lowercaseQuery);
    
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;
    
    // Затем по населению
    return b.population - a.population;
  });
}

// Получить случайный город
export function getRandomCity(): City {
  return WORLD_CITIES[Math.floor(Math.random() * WORLD_CITIES.length)];
}

// Получить все города
export function getAllCities(): City[] {
  return [...WORLD_CITIES];
}

// Найти ближайшие города
export function getNearestCities(position: { lat: number; lng: number }, count: number = 5): City[] {
  return WORLD_CITIES
    .map(city => ({
      ...city,
      distance: calculateDistance(position, city.position)
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
    .map(({ distance, ...city }) => city);
}

// Расчет расстояния между точками (формула гаверсинуса)
export function calculateDistance(pos1: { lat: number; lng: number }, pos2: { lat: number; lng: number }): number {
  const R = 6371; // Радиус Земли в км
  const dLat = toRad(pos2.lat - pos1.lat);
  const dLng = toRad(pos2.lng - pos1.lng);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(pos1.lat)) * Math.cos(toRad(pos2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}