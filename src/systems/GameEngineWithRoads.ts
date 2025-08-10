import { useGameStore } from '../store/gameStore';
import { TowerType, EnemyType } from '../types/game.types';
import type { Enemy, Position, Tower, Projectile } from '../types/game.types';
import { getNearestCities, calculateDistance } from '../data/worldCities';
import { getRouteByRoad, getNearestRoad, clearRouteCache } from '../services/routingService';

export class GameEngine {
  private animationId: number | null = null;
  private lastTime = 0;
  private waveTimer = 0;
  private nextWaveTime = 10000; // 10 секунд до первой волны
  private enemySpawnTimer = 0;
  private enemySpawnInterval = 2000; // 2 секунды между врагами
  private currentWaveEnemies = 0;
  private maxWaveEnemies = 5;
  private pendingEnemies: Array<{from: Position, to: Position}> = [];
  private processingRoute = false;

  start() {
    this.lastTime = performance.now();
    this.gameLoop();
    
    // Очищаем кеш маршрутов каждые 5 минут
    setInterval(() => clearRouteCache(), 5 * 60 * 1000);
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
        this.nextWaveTime = 20000; // Следующие волны через 20 секунд
      }

      // Спавн врагов текущей волны
      if (this.currentWaveEnemies > 0) {
        this.enemySpawnTimer += adjustedDelta;
        if (this.enemySpawnTimer >= this.enemySpawnInterval) {
          this.spawnWaveEnemy();
          this.enemySpawnTimer = 0;
        }
      }

      // Обработка отложенных врагов (ждущих маршрут)
      this.processPendingEnemies();

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
    
    this.maxWaveEnemies = Math.min(3 + waveNumber, 15); // Меньше врагов, но умнее
    this.currentWaveEnemies = this.maxWaveEnemies;
    
    state.nextWave();
  }

  private async spawnWaveEnemy() {
    if (this.currentWaveEnemies <= 0) return;
    
    const state = useGameStore.getState();
    const player = state.player;
    
    if (!player.startCity) return;

    // Находим ближайшие города для спавна (100-300 км)
    const nearestCities = getNearestCities(player.startCity.position, 8)
      .filter(city => {
        const dist = calculateDistance(city.position, player.startCity!.position);
        return dist > 100 && dist < 300;
      });
    
    let spawnPosition: Position;
    
    if (nearestCities.length > 0) {
      const spawnCity = nearestCities[Math.floor(Math.random() * nearestCities.length)];
      spawnPosition = spawnCity.position;
    } else {
      // Спавним на расстоянии 150 км
      const angle = Math.random() * Math.PI * 2;
      const distanceInDegrees = 150 / 111;
      
      spawnPosition = {
        lat: player.startCity.position.lat + Math.sin(angle) * distanceInDegrees,
        lng: player.startCity.position.lng + Math.cos(angle) * distanceInDegrees
      };
    }
    
    // Добавляем в очередь для получения маршрута
    this.pendingEnemies.push({
      from: spawnPosition,
      to: player.startCity.position
    });
    
    this.currentWaveEnemies--;
  }

  private async processPendingEnemies() {
    if (this.pendingEnemies.length === 0 || this.processingRoute) return;
    
    this.processingRoute = true;
    const pending = this.pendingEnemies.shift();
    
    if (pending) {
      try {
        // Находим ближайшую дорогу к точке спавна
        const nearestRoadStart = await getNearestRoad(pending.from);
        const nearestRoadEnd = await getNearestRoad(pending.to);
        
        // Получаем маршрут по дорогам
        const roadPath = await getRouteByRoad(nearestRoadStart, nearestRoadEnd);
        
        // Создаем врага с маршрутом по дорогам
        this.spawnEnemyWithPath(nearestRoadStart, roadPath);
      } catch (error) {
        console.warn('Failed to get road route, using straight path:', error);
        // Fallback к прямому пути
        this.spawnEnemyWithPath(pending.from, this.generateStraightPath(pending.from, pending.to));
      }
    }
    
    this.processingRoute = false;
  }

  private spawnEnemyWithPath(startPosition: Position, path: Position[]) {
    const waveNumber = useGameStore.getState().currentWave;
    const types = waveNumber > 3 ? 
      [EnemyType.REGULAR, EnemyType.FAST, EnemyType.TANK] :
      [EnemyType.REGULAR, EnemyType.REGULAR, EnemyType.FAST];
    
    const type = types[Math.floor(Math.random() * types.length)];
    
    const enemy: Enemy = {
      id: `enemy-${Date.now()}-${Math.random()}`,
      type,
      position: { ...startPosition },
      health: type === EnemyType.TANK ? 150 : type === EnemyType.FAST ? 40 : 80,
      maxHealth: type === EnemyType.TANK ? 150 : type === EnemyType.FAST ? 40 : 80,
      speed: type === EnemyType.FAST ? 200 : type === EnemyType.TANK ? 80 : 120, // км/ч (увеличено в 2 раза)
      reward: type === EnemyType.TANK ? 30 : type === EnemyType.FAST ? 15 : 10,
      pathIndex: 0,
      path: path,
      targetCityId: 'target'
    };

    useGameStore.getState().spawnEnemy(enemy);
  }

  private generateStraightPath(from: Position, to: Position): Position[] {
    const steps = 50;
    const path: Position[] = [];
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      path.push({
        lat: from.lat + (to.lat - from.lat) * t,
        lng: from.lng + (to.lng - from.lng) * t
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
        // Враг достиг города
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
      const timeSinceLastShot = currentTime - (tower.lastShotTime || 0);
      const shotInterval = 1000 / tower.fireRate;
      
      if (timeSinceLastShot < shotInterval) return;
      
      // Находим ближайшего врага в радиусе
      let closestEnemy: Enemy | null = null;
      let closestDistance = Infinity;
      
      enemies.forEach(enemy => {
        const distance = calculateDistance(tower.position, enemy.position);
        if (distance <= tower.range && distance < closestDistance) {
          closestEnemy = enemy;
          closestDistance = distance;
        }
      });

      // Стреляем по врагу
      if (closestEnemy) {
        tower.targetId = closestEnemy.id;
        tower.lastShotTime = currentTime;
        
        // Создаем снаряд
        const projectile: Projectile = {
          id: `proj-${Date.now()}-${Math.random()}`,
          from: { ...tower.position },
          to: { ...closestEnemy.position },
          current: { ...tower.position },
          targetId: closestEnemy.id,
          damage: tower.damage,
          speed: 300, // км/ч - быстрые снаряды
          color: tower.type === TowerType.BASIC ? '#4A90E2' :
                 tower.type === TowerType.SNIPER ? '#7B68EE' :
                 tower.type === TowerType.SPLASH ? '#FF6B6B' : '#4ECDC4'
        };
        
        state.addProjectile(projectile);
      } else {
        tower.targetId = undefined;
      }
    });

    useGameStore.setState({ towers });
  }

  private updateProjectiles(deltaTime: number) {
    const state = useGameStore.getState();
    const projectiles = [...state.projectiles];
    const enemies = state.enemies;
    
    const updatedProjectiles = projectiles.filter(projectile => {
      const target = enemies.find(e => e.id === projectile.targetId);
      
      if (!target) {
        return false;
      }
      
      projectile.to = { ...target.position };
      
      const speedInDegrees = (projectile.speed / 111) / 3600 * (deltaTime / 1000);
      const distance = calculateDistance(projectile.current, projectile.to);
      
      if (distance < 3) { // Попадание
        target.health -= projectile.damage;
        
        if (target.health <= 0) {
          state.updateResources({ 
            gold: state.player.resources.gold + target.reward,
            score: state.player.resources.score + 10
          });
          state.removeEnemy(target.id);
        }
        
        return false;
      }
      
      const dx = projectile.to.lng - projectile.current.lng;
      const dy = projectile.to.lat - projectile.current.lat;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        projectile.current.lng += (dx / dist) * speedInDegrees;
        projectile.current.lat += (dy / dist) * speedInDegrees;
      }
      
      return true;
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