import { useGameStore } from '../store/gameStore';
import { TowerType, EnemyType } from '../types/game.types';
import type { Enemy, Position, Tower, Projectile } from '../types/game.types';
import { getNearestCities, calculateDistance } from '../data/worldCities';

export class GameEngine {
  private animationId: number | null = null;
  private lastTime = 0;
  private waveTimer = 0;
  private nextWaveTime = 5000; // 5 секунд до первой волны
  private enemySpawnTimer = 0;
  private enemySpawnInterval = 1500; // 1.5 секунды между врагами
  private currentWaveEnemies = 0;
  private maxWaveEnemies = 5;

  start() {
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private gameLoop = () => {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    const state = useGameStore.getState();
    
    if (!state.isPaused) {
      const adjustedDelta = deltaTime * state.gameSpeed;
      
      // Обновление таймеров
      this.waveTimer += adjustedDelta;

      // Спавн волн
      if (this.waveTimer >= this.nextWaveTime) {
        this.startWave();
        this.waveTimer = 0;
        this.nextWaveTime = 15000; // Следующие волны через 15 секунд
      }

      // Спавн врагов текущей волны
      if (this.currentWaveEnemies > 0) {
        this.enemySpawnTimer += adjustedDelta;
        if (this.enemySpawnTimer >= this.enemySpawnInterval) {
          this.spawnWaveEnemy();
          this.enemySpawnTimer = 0;
        }
      }

      // Обновление врагов
      this.updateEnemies(adjustedDelta);
      
      // Обновление башен
      this.updateTowers(adjustedDelta);
      
      // Обновление снарядов
      this.updateProjectiles(adjustedDelta);

      // Проверка здоровья города
      this.checkCityHealth();
    }

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private startWave() {
    const state = useGameStore.getState();
    const waveNumber = state.currentWave;
    
    this.maxWaveEnemies = Math.min(5 + waveNumber * 2, 20);
    this.currentWaveEnemies = this.maxWaveEnemies;
    
    state.nextWave();
  }

  private spawnWaveEnemy() {
    if (this.currentWaveEnemies <= 0) return;
    
    const state = useGameStore.getState();
    const player = state.player;
    
    if (!player.startCity) return;

    // Находим ближайший город для спавна врагов (50-150 км от нашего города)
    const nearestCities = getNearestCities(player.startCity.position, 5)
      .filter(city => {
        const dist = calculateDistance(city.position, player.startCity!.position);
        return dist > 50 && dist < 150; // км
      });
    
    if (nearestCities.length === 0) {
      // Если нет городов, спавним на расстоянии 100 км
      const angle = Math.random() * Math.PI * 2;
      const distanceInDegrees = 100 / 111; // ~100 км в градусах
      
      const spawnPosition: Position = {
        lat: player.startCity.position.lat + Math.sin(angle) * distanceInDegrees,
        lng: player.startCity.position.lng + Math.cos(angle) * distanceInDegrees
      };
      
      this.spawnEnemy(spawnPosition, player.startCity.position);
    } else {
      const spawnCity = nearestCities[Math.floor(Math.random() * nearestCities.length)];
      this.spawnEnemy(spawnCity.position, player.startCity.position);
    }
    
    this.currentWaveEnemies--;
  }

  private spawnEnemy(from: Position, to: Position) {
    const waveNumber = useGameStore.getState().currentWave;
    const types = waveNumber > 3 ? 
      [EnemyType.REGULAR, EnemyType.FAST, EnemyType.TANK] :
      [EnemyType.REGULAR, EnemyType.REGULAR, EnemyType.FAST];
    
    const type = types[Math.floor(Math.random() * types.length)];
    
    const enemy: Enemy = {
      id: `enemy-${Date.now()}-${Math.random()}`,
      type,
      position: { ...from },
      health: type === EnemyType.TANK ? 150 : type === EnemyType.FAST ? 40 : 80,
      maxHealth: type === EnemyType.TANK ? 150 : type === EnemyType.FAST ? 40 : 80,
      speed: type === EnemyType.FAST ? 160 : type === EnemyType.TANK ? 60 : 100, // км/ч (увеличено в 2 раза)
      reward: type === EnemyType.TANK ? 30 : type === EnemyType.FAST ? 15 : 10,
      pathIndex: 0,
      path: this.generatePath(from, to),
      targetCityId: 'target'
    };

    useGameStore.getState().spawnEnemy(enemy);
  }

  private generatePath(from: Position, to: Position): Position[] {
    const steps = 50;
    const path: Position[] = [];
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Добавляем небольшую кривизну пути
      const curve = Math.sin(t * Math.PI) * 0.1;
      path.push({
        lat: from.lat + (to.lat - from.lat) * t + curve * (to.lng - from.lng) * 0.1,
        lng: from.lng + (to.lng - from.lng) * t - curve * (to.lat - from.lat) * 0.1
      });
    }
    
    return path;
  }

  private updateEnemies(deltaTime: number) {
    const state = useGameStore.getState();
    const enemies = [...state.enemies];
    const player = state.player;
    
    enemies.forEach(enemy => {
      // Движение по пути
      if (enemy.pathIndex < enemy.path.length - 1) {
        const speedInDegrees = (enemy.speed / 111) / 3600 * (deltaTime / 1000);
        const target = enemy.path[enemy.pathIndex + 1];
        const distance = calculateDistance(enemy.position, target);
        
        if (distance * 111 < speedInDegrees * 111) {
          enemy.pathIndex++;
          enemy.position = { ...target };
        } else {
          const dx = target.lng - enemy.position.lng;
          const dy = target.lat - enemy.position.lat;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 0) {
            enemy.position.lng += (dx / dist) * speedInDegrees;
            enemy.position.lat += (dy / dist) * speedInDegrees;
          }
        }
      } else {
        // Враг достиг города - наносим урон
        if (player.startCity) {
          const cityHealth = player.startCity.health || 100;
          const newHealth = Math.max(0, cityHealth - 10);
          
          useGameStore.setState({
            player: {
              ...player,
              startCity: {
                ...player.startCity,
                health: newHealth,
                maxHealth: player.startCity.maxHealth || 100
              }
            }
          });
        }
        
        state.removeEnemy(enemy.id);
        return;
      }
    });

    useGameStore.setState({ enemies });
  }

  private updateTowers(deltaTime: number) {
    const state = useGameStore.getState();
    const towers = [...state.towers];
    const enemies = [...state.enemies];
    const currentTime = performance.now();
    
    towers.forEach(tower => {
      // Проверяем, можем ли стрелять
      const timeSinceLastShot = currentTime - (tower.lastShotTime || 0);
      const shotInterval = 1000 / tower.fireRate; // миллисекунды между выстрелами
      
      if (timeSinceLastShot < shotInterval) return;
      
      // Находим ближайшего врага в радиусе
      let closestEnemy: Enemy | null = null;
      let closestDistance = Infinity;
      
      enemies.forEach(enemy => {
        const distance = calculateDistance(tower.position, enemy.position); // в км
        if (distance <= tower.range && distance < closestDistance) {
          closestEnemy = enemy;
          closestDistance = distance;
        }
      });

      // Стреляем по врагу
      if (closestEnemy) {
        tower.targetId = (closestEnemy as Enemy).id;
        tower.lastShotTime = currentTime;
        
        // Создаем снаряд
        const projectile: Projectile = {
          id: `proj-${Date.now()}-${Math.random()}`,
          from: { ...tower.position },
          to: { ...(closestEnemy as Enemy).position },
          current: { ...tower.position },
          targetId: (closestEnemy as Enemy).id,
          targetType: 'enemy',
          damage: tower.damage,
          speed: 200, // км/ч
          color: tower.type === TowerType.BASIC ? '#4A90E2' :
                 tower.type === TowerType.SNIPER ? '#7B68EE' :
                 tower.type === TowerType.SPLASH ? '#FF6B6B' : '#4ECDC4',
          size: 5
        };
        
        state.addProjectile(projectile);
      } else {
        tower.targetId = undefined;
      }
    });

    // Обновляем состояние
    useGameStore.setState({ towers });
  }

  private updateProjectiles(deltaTime: number) {
    const state = useGameStore.getState();
    const projectiles = [...state.projectiles];
    const enemies = state.enemies;
    
    const updatedProjectiles = projectiles.filter(projectile => {
      // Находим цель
      const target = enemies.find(e => e.id === projectile.targetId);
      
      if (!target) {
        // Цель уничтожена
        return false;
      }
      
      // Обновляем позицию цели
      projectile.to = { ...target.position };
      
      // Движение снаряда
      const speedInDegrees = (projectile.speed / 111) / 3600 * (deltaTime / 1000);
      const distance = calculateDistance(projectile.current, projectile.to);
      
      if (distance < 5) { // Попадание (5 км радиус)
        // Наносим урон
        target.health -= projectile.damage;
        
        if (target.health <= 0) {
          // Враг уничтожен
          state.updateResources({ 
            gold: state.player.resources.gold + target.reward,
            score: state.player.resources.score + 10
          });
          state.removeEnemy(target.id);
        }
        
        return false; // Удаляем снаряд
      }
      
      // Движение к цели
      const dx = projectile.to.lng - projectile.current.lng;
      const dy = projectile.to.lat - projectile.current.lat;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        projectile.current.lng += (dx / dist) * speedInDegrees;
        projectile.current.lat += (dy / dist) * speedInDegrees;
      }
      
      return true; // Оставляем снаряд
    });
    
    state.updateProjectiles(updatedProjectiles);
  }

  private checkCityHealth() {
    const state = useGameStore.getState();
    const cityHealth = state.player.startCity?.health || 100;
    
    if (cityHealth <= 0) {
      alert('Игра окончена! Ваш город захвачен.');
      this.stop();
      state.resetGame();
    }
  }
}

export const gameEngine = new GameEngine();