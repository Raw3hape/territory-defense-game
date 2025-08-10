import React, { useState, useEffect, useRef } from 'react';
import { searchCities, WORLD_CITIES } from '../../data/worldCities';
import type { City } from '../../types/game.types';
import { geocode } from '../../services/geocodingService';
import './CitySearch.css';

interface CitySearchProps {
  onSelectCity: (city: City) => void;
  placeholder?: string;
}

export const CitySearch: React.FC<CitySearchProps> = ({ 
  onSelectCity, 
  placeholder = "Найдите город для начала игры..." 
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<City[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<'local' | 'global'>('local');
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isFocused) {
      if (query.length > 0) {
        // Сначала ищем в локальной базе
        const filtered = searchCities(query);
        
        if (filtered.length > 0) {
          setResults(filtered.slice(0, 15));
          setIsOpen(true);
          setSearchMode('local');
        } else if (query.length >= 3) {
          // Если в локальной базе ничего не найдено и ввели 3+ символа,
          // ищем через геокодинг с задержкой
          setSearchMode('global');
          
          // Отменяем предыдущий поиск
          if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
          }
          
          // Задержка перед поиском через API
          searchTimeoutRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
              const geocodeResults = await geocode(query);
              const cities: City[] = geocodeResults.map((result, index) => ({
                id: `geo-${Date.now()}-${index}`,
                name: result.name,
                country: result.country,
                position: result.position,
                population: 100000, // По умолчанию
                isCapital: false
              }));
              
              if (cities.length > 0) {
                setResults(cities.slice(0, 10));
                setIsOpen(true);
              } else {
                setResults([]);
                setIsOpen(true); // Показываем сообщение "ничего не найдено"
              }
            } catch (error) {
              console.error('Geocoding error:', error);
              setResults([]);
            } finally {
              setIsSearching(false);
            }
          }, 500); // Задержка 500мс
        } else {
          setResults([]);
          setIsOpen(query.length > 0);
        }
      } else {
        // Показываем популярные города при пустом вводе
        setResults(WORLD_CITIES.slice(0, 15));
        setIsOpen(true);
        setSearchMode('local');
      }
      setSelectedIndex(0);
    }
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, isFocused]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        if (isOpen && results.length > 0) {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % results.length);
        }
        break;
      case 'ArrowUp':
        if (isOpen && results.length > 0) {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (results.length > 0) {
          if (!isOpen) {
            setIsOpen(true);
          } else if (results[selectedIndex]) {
            handleSelectCity(results[selectedIndex]);
          }
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSelectCity = (city: City) => {
    onSelectCity(city);
    setQuery('');
    setIsOpen(false);
  };

  const handleRandomCity = () => {
    const randomCity = WORLD_CITIES[Math.floor(Math.random() * WORLD_CITIES.length)];
    handleSelectCity(randomCity);
  };

  return (
    <div className="city-search" ref={searchRef}>
      <div className="search-input-container">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="search-input"
          onFocus={() => {
            setIsFocused(true);
            setIsOpen(true);
          }}
          onBlur={() => {
            // Задержка чтобы успеть кликнуть на результат
            setTimeout(() => {
              setIsFocused(false);
              setIsOpen(false);
            }, 200);
          }}
        />
        {results.length > 0 && (
          <button 
            onClick={() => handleSelectCity(results[0])}
            className="search-button"
            title="Выбрать первый результат"
          >
            ✓
          </button>
        )}
        <button 
          onClick={handleRandomCity}
          className="random-button"
          title="Случайный город"
        >
          🎲
        </button>
      </div>
      
      {isOpen && (
        <div className="search-results">
          {isSearching && (
            <div className="search-hint">
              <span className="search-loading">Поиск города...</span>
            </div>
          )}
          {!isSearching && query.length === 0 && (
            <div className="search-hint">Популярные города:</div>
          )}
          {!isSearching && query.length > 0 && results.length === 0 && (
            <div className="search-hint">
              {query.length < 3 
                ? 'Введите минимум 3 символа для поиска любого города мира'
                : 'Ничего не найдено. Попробуйте другой запрос'}
            </div>
          )}
          {!isSearching && searchMode === 'global' && results.length > 0 && (
            <div className="search-hint">🌍 Результаты глобального поиска:</div>
          )}
          {!isSearching && results.map((city, index) => (
            <div
              key={city.id}
              className={`search-result-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSelectCity(city)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="city-info">
                <span className="city-name">{city.name}</span>
                <span className="city-country">{city.country}</span>
                {city.isCapital && <span className="capital-badge">⭐ Столица</span>}
              </div>
              <div className="city-population">
                {(city.population / 1000000).toFixed(1)}M чел.
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};