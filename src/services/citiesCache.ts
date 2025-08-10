import type { City, Position } from '../types/game.types';

// Глобальный кэш городов с временем жизни
interface CacheEntry {
  cities: City[];
  timestamp: number;
}

class CitiesCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 5 * 60 * 1000; // 5 минут

  private getKey(center: Position, radius: number): string {
    return `${center.lat.toFixed(1)},${center.lng.toFixed(1)}-${radius}`;
  }

  set(center: Position, radius: number, cities: City[]): void {
    const key = this.getKey(center, radius);
    this.cache.set(key, {
      cities,
      timestamp: Date.now()
    });
  }

  get(center: Position, radius: number): City[] | null {
    const key = this.getKey(center, radius);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Проверяем время жизни кэша
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.cities;
  }

  has(center: Position, radius: number): boolean {
    return this.get(center, radius) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  // Предзагрузка множества областей
  async preloadAreas(centers: Position[], radii: number[]): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (const center of centers) {
      for (const radius of radii) {
        if (!this.has(center, radius)) {
          // Здесь будет вызов API для загрузки городов
          // Это будет реализовано в geoNamesService
        }
      }
    }
    
    await Promise.all(promises);
  }
}

// Экспортируем единственный экземпляр кэша
export const citiesCache = new CitiesCache();