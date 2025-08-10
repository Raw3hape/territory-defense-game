import React from 'react';
import { Circle, Polyline } from 'react-leaflet';
import { useGameStore } from '../../store/gameStore';

export const FastProjectiles: React.FC = () => {
  const projectiles = useGameStore(state => state.projectiles);

  return (
    <>
      {projectiles.map(projectile => {
        // Показываем линию выстрела для визуальных эффектов
        if (projectile.isHitEffect) {
          return (
            <React.Fragment key={projectile.id}>
              {/* Линия выстрела */}
              <Polyline
                positions={[
                  [projectile.from.lat, projectile.from.lng],
                  [projectile.to.lat, projectile.to.lng]
                ]}
                pathOptions={{
                  color: projectile.color,
                  weight: 5,
                  opacity: 0.9,
                  dashArray: '10, 5',
                  className: 'laser-shot'
                }}
              />
              {/* Эффект попадания */}
              <Circle
                center={[projectile.to.lat, projectile.to.lng]}
                radius={100} // метры
                pathOptions={{
                  color: projectile.color,
                  fillColor: projectile.color,
                  fillOpacity: 0.8,
                  weight: 2
                }}
              />
            </React.Fragment>
          );
        }
        return null;
      })}
    </>
  );
};