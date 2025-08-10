import { useState, useEffect } from 'react';
import type { City, Position } from '../types/game.types';
import { getRealCities } from '../services/geoNamesService';

export function useRealCities(center: Position | undefined, radiusKm: number) {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!center) return;

    const fetchCities = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const realCities = await getRealCities(center, radiusKm);
        setCities(realCities);
        
        if (realCities.length === 0) {
          setError('Не удалось загрузить города. Проверьте подключение к интернету.');
        }
      } catch (err) {
        console.error('Error fetching cities:', err);
        setError('Ошибка загрузки городов');
        setCities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCities();
  }, [center?.lat, center?.lng, radiusKm]);

  return { cities, loading, error };
}