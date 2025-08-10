import { useEffect } from 'react';
import { gameEngine } from '../../systems/FastGameEngine';
import { useGameStore } from '../../store/gameStore';

export const GameController: React.FC = () => {
  const player = useGameStore(state => state.player);

  useEffect(() => {
    // Запускаем игровой движок когда игра начата
    if (player?.startCity) {
      gameEngine.start();
    }

    return () => {
      gameEngine.stop();
    };
  }, [player?.startCity]);

  return null; // Этот компонент не рендерит UI
};