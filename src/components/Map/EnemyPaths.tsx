import React from 'react';
import { Polyline } from 'react-leaflet';
import { useGameStore } from '../../store/gameStore';

export const EnemyPaths: React.FC = () => {
  const enemies = useGameStore(state => state.enemies);

  return (
    <>
      {enemies.map(enemy => {
        // Показываем путь от текущей позиции до конца
        const remainingPath = enemy.path.slice(enemy.pathIndex);
        
        if (remainingPath.length < 2) return null;
        
        return (
          <Polyline
            key={`path-${enemy.id}`}
            positions={remainingPath.map(p => [p.lat, p.lng])}
            pathOptions={{
              color: enemy.type === 'fast' ? '#FFA500' :
                     enemy.type === 'tank' ? '#8B0000' : '#FF0000',
              weight: 2,
              opacity: 0.3,
              dashArray: '10, 10',
              dashOffset: `${Date.now() % 20}`
            }}
          />
        );
      })}
    </>
  );
};