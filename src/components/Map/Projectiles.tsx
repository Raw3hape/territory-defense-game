import React from 'react';
import { Polyline, Circle } from 'react-leaflet';
import { useGameStore } from '../../store/gameStore';

export const Projectiles: React.FC = () => {
  const projectiles = useGameStore(state => state.projectiles);

  return (
    <>
      {projectiles.map(projectile => (
        <React.Fragment key={projectile.id}>
          {/* Линия выстрела */}
          <Polyline
            positions={[[projectile.from.lat, projectile.from.lng], [projectile.current.lat, projectile.current.lng]]}
            pathOptions={{
              color: projectile.color,
              weight: 4,
              opacity: 0.9,
              dashArray: '10, 5',
              dashOffset: `${Date.now() % 10}`
            }}
          />
          
          {/* Снаряд */}
          <Circle
            center={[projectile.current.lat, projectile.current.lng]}
            radius={200}
            pathOptions={{
              color: projectile.color,
              fillColor: projectile.color,
              fillOpacity: 1,
              weight: 2
            }}
          />
        </React.Fragment>
      ))}
    </>
  );
};