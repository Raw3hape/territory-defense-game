import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Position, City } from '../../types/game.types';
import { reverseGeocodeWithCache } from '../../services/geocodingService';
import './MapCitySelector.css';

interface MapCitySelectorProps {
  onSelectCity: (city: City) => void;
  onClose: () => void;
}

// Компонент для обработки кликов
function CityClickHandler({ onCitySelect }: { onCitySelect: (position: Position) => void }) {
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  
  useMapEvents({
    click: async (e) => {
      const position: Position = {
        lat: e.latlng.lat,
        lng: e.latlng.lng
      };
      setSelectedPosition(position);
      onCitySelect(position);
    }
  });
  
  return selectedPosition ? (
    <Marker
      position={[selectedPosition.lat, selectedPosition.lng]}
      icon={L.divIcon({
        className: 'selected-city-icon',
        html: `
          <div style="
            width: 40px;
            height: 40px;
            background: #4CAF50;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 3px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            color: white;
            animation: pulse 1.5s infinite;
          ">📍</div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      })}
    />
  ) : null;
}

export const MapCitySelector: React.FC<MapCitySelectorProps> = ({ onSelectCity, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handlePositionSelect = async (position: Position) => {
    setLoading(true);
    setError(null);
    
    try {
      const geocodeResult = await reverseGeocodeWithCache(position);
      
      if (geocodeResult) {
        const city: City = {
          id: `custom-${Date.now()}`,
          name: geocodeResult.name,
          country: geocodeResult.country,
          position: geocodeResult.position,
          population: 100000, // По умолчанию для неизвестных городов
          isCapital: false
        };
        
        setSelectedCity(city);
      } else {
        // Если геокодирование не удалось, используем координаты
        const city: City = {
          id: `coord-${Date.now()}`,
          name: `${position.lat.toFixed(2)}°, ${position.lng.toFixed(2)}°`,
          country: 'Координаты',
          position: position,
          population: 100000,
          isCapital: false
        };
        
        setSelectedCity(city);
      }
    } catch (err) {
      console.error('Error selecting city:', err);
      setError('Ошибка при получении информации о месте');
      
      // Используем координаты как запасной вариант
      const city: City = {
        id: `coord-${Date.now()}`,
        name: `${position.lat.toFixed(2)}°, ${position.lng.toFixed(2)}°`,
        country: 'Координаты',
        position: position,
        population: 100000,
        isCapital: false
      };
      
      setSelectedCity(city);
    } finally {
      setLoading(false);
    }
  };
  
  const handleConfirm = () => {
    if (selectedCity) {
      onSelectCity(selectedCity);
      onClose();
    }
  };
  
  return (
    <div className="map-city-selector">
      <div className="map-selector-header">
        <h2>Выберите любое место на карте</h2>
        <button className="close-button" onClick={onClose}>✕</button>
      </div>
      
      <div className="map-selector-instructions">
        <p>🗺️ Кликните на любую точку карты, чтобы начать игру в этом месте</p>
        <p>🌍 Можно выбрать любой город, деревню или даже пустыню!</p>
      </div>
      
      <div className="map-selector-container">
        <MapContainer
          center={[40, 0]}
          zoom={3}
          style={{ height: '500px', width: '100%' }}
          maxBounds={[[-90, -180], [90, 180]]}
          maxBoundsViscosity={1.0}
          minZoom={2}
          maxZoom={10}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <CityClickHandler onCitySelect={handlePositionSelect} />
        </MapContainer>
      </div>
      
      {loading && (
        <div className="map-selector-loading">
          <div className="loading-spinner"></div>
          <p>Получаем информацию о месте...</p>
        </div>
      )}
      
      {selectedCity && !loading && (
        <div className="map-selector-result">
          <h3>Выбранное место:</h3>
          <div className="selected-city-info">
            <p className="city-name">{selectedCity.name}</p>
            <p className="city-country">{selectedCity.country}</p>
            <p className="city-coords">
              Координаты: {selectedCity.position.lat.toFixed(4)}°, {selectedCity.position.lng.toFixed(4)}°
            </p>
          </div>
          <div className="map-selector-actions">
            <button className="confirm-button" onClick={handleConfirm}>
              ✓ Начать игру здесь
            </button>
            <button className="cancel-button" onClick={() => setSelectedCity(null)}>
              Выбрать другое место
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <div className="map-selector-error">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};