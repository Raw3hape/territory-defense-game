import React from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { useEffect } from 'react';
import type { Enemy, Tower } from '../../types/game.types';

interface HealthBarProps {
  entity: Enemy | Tower;
  isEnemy: boolean;
}

export const HealthBar: React.FC<HealthBarProps> = ({ entity, isEnemy }) => {
  const map = useMap();
  
  useEffect(() => {
    const healthBarHtml = `
      <div style="
        position: absolute;
        bottom: ${isEnemy ? '25px' : '35px'};
        left: 50%;
        transform: translateX(-50%);
        width: 40px;
        height: 4px;
        background: rgba(0,0,0,0.3);
        border-radius: 2px;
        overflow: hidden;
      ">
        <div style="
          width: ${(entity.health! / entity.maxHealth!) * 100}%;
          height: 100%;
          background: ${
            entity.health! > entity.maxHealth! * 0.5 ? '#4CAF50' : 
            entity.health! > entity.maxHealth! * 0.25 ? '#FFA500' : '#FF0000'
          };
          transition: width 0.3s ease;
        "></div>
      </div>
    `;

    const icon = L.divIcon({
      className: 'health-bar-icon',
      html: healthBarHtml,
      iconSize: [40, 30],
      iconAnchor: [20, 15]
    });

    const marker = L.marker([entity.position.lat, entity.position.lng], { 
      icon,
      interactive: false,
      zIndexOffset: 1000
    }).addTo(map);

    return () => {
      map.removeLayer(marker);
    };
  }, [entity.health, entity.maxHealth, entity.position, map, isEnemy]);

  return null;
};