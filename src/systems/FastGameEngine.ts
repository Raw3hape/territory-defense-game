import { useGameStore } from '../store/gameStore';
import { TowerType, EnemyType } from '../types/game.types';
import type { Enemy, Position, Tower, Projectile, EnemyBase, City } from '../types/game.types';
import { getNearestCities, calculateDistance, getAllCities } from '../data/worldCities';
import { getRouteByRoad, getNearestRoad } from '../services/routingService';

// Дебаг режим
const DEBUG = true;
const log = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`[GameEngine] ${message}`, data || '');
  }
};

export class GameEngine {
  private animationId: number | null = null;
  private lastTime = 0;
  private routeCache = new Map<string, Position[]>();
  private basesInitialized = false;
  private enemiesKilledInWave = 0;
  private enemiesRequiredForNextWave = 20; // Начальное требование

  start() {
    log('Starting game engine');
    this.lastTime = performance.now();
    this.gameOverTriggered = false; // Сбрасываем флаг при старте
    this.enemiesKilledInWave = 0;
    this.enemiesRequiredForNextWave = 20; // 20 врагов для перехода на 2 волну
    this.initializeEnemyBases();
    this.gameLoop();
  }

  stop() {
    log('Stopping game engine');
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    // Очищаем все таймеры при остановке
    clearTimeout(this.baseCreationTimeout);
  }
  
  private baseCreationTimeout: any;

  private initializeEnemyBases(additionalBases: boolean = false) {
    const state = useGameStore.getState();
    const player = state.player;
    const currentWave = state.currentWave || 1;
    
    if (!player.startCity) {
      log('No start city found');
      return;
    }

    // Убираем проверку basesInitialized для additionalBases
    if (this.basesInitialized && !additionalBases) {
      log('Bases already initialized, skipping');
      return;
    }

    log(`Initializing enemy bases - Wave: ${currentWave}, Additional: ${additionalBases}`);

    // Получаем существующие базы для фильтрации
    const existingBases = state.enemyBases || [];
    
    // Определяем количество баз в зависимости от волны
    const targetBaseCount = Math.min(2 + Math.floor(currentWave / 2), 20); // Быстрее рост баз: 2, 3, 4, 5...
    const basesToAdd = additionalBases 
      ? Math.max(1, Math.min(3, targetBaseCount - existingBases.length)) // Добавляем 1-3 базы за раз
      : targetBaseCount; // При инициализации создаем все базы
    
    log(`Target bases: ${targetBaseCount}, Existing: ${existingBases.length}, To add: ${basesToAdd}`);
    const existingCityIds = existingBases.map(b => b.city.id);
    
    // Находим ближайшие города для создания вражеских баз
    const searchRadius = Math.min(100, 20 + currentWave * 3); // Увеличиваем количество городов для поиска
    const allNearestCities = getNearestCities(player.startCity.position, searchRadius);
    log('Found nearest cities:', allNearestCities.length);
    
    // Фильтруем города - исключаем стартовый город и уже занятые
    const filteredCities = allNearestCities.filter(city => {
      if (city.id === player.startCity!.id) return false;
      if (existingCityIds.includes(city.id)) return false; // Не создаем базы в уже занятых городах
      
      const dist = calculateDistance(city.position, player.startCity!.position);
      // Расширяем диапазон с волнами для размещения до 50 баз по всему миру
      const minDist = 30 + currentWave * 5;
      const maxDist = 500 + currentWave * 100; // Можем размещать базы очень далеко на поздних волнах
      return dist > minDist && dist < maxDist;
    });
    
    log(`Filtered cities in range: ${filteredCities.length}`);
    
    // Выбираем города для новых баз
    let nearestCities = filteredCities.slice(0, basesToAdd);
    
    // Если не хватает городов в радиусе, используем случайные города мира
    if (nearestCities.length < basesToAdd && currentWave > 3) {
      log('Not enough nearby cities, using random world cities');
      const additionalCities = this.getRandomWorldCities(player.startCity, basesToAdd - nearestCities.length);
      nearestCities = [...nearestCities, ...additionalCities];
    }
    
    log('Selected cities for bases:', nearestCities.map(c => `${c.name} (${c.country}) - ${calculateDistance(c.position, player.startCity!.position).toFixed(0)}km`));

    if (nearestCities.length === 0) {
      log('WARNING: No real cities found for enemy bases!');
      // Если нет городов поблизости, расширяем поиск
      const expandedCities = getNearestCities(player.startCity.position, 50);
      const expandedFiltered = expandedCities.filter(city => {
        if (city.id === player.startCity!.id) return false;
        const dist = calculateDistance(city.position, player.startCity!.position);
        return dist > 30; // Минимум 30 км
      }).slice(0, 3);
      
      if (expandedFiltered.length > 0) {
        log('Using expanded search, found cities:', expandedFiltered.map(c => c.name));
        const enemyBases: EnemyBase[] = expandedFiltered.map((city, index) => ({
          id: `base-${city.id}`,
          city: {
            ...city,
            health: 200,
            maxHealth: 200
          },
          health: 200,
          maxHealth: 200,
          spawnRate: 0.2 + (index * 0.1), // От 0.2 до 0.4 врагов в секунду
          lastSpawnTime: 0,
          isActive: true
        }));
        
        log('Initialized enemy bases from expanded search:', enemyBases.length);
        state.initEnemyBases(enemyBases);
        this.basesInitialized = true;
        return;
      }
      
      // Если все еще нет городов, используем случайные города из списка
      log('Using random world cities as fallback');
      const randomCities = this.getRandomWorldCities(player.startCity, 3);
      const enemyBases: EnemyBase[] = randomCities.map((city, index) => ({
        id: `base-${city.id}`,
        city: {
          ...city,
          health: 200,
          maxHealth: 200
        },
        health: 200,
        maxHealth: 200,
        spawnRate: 0.2 + (index * 0.1),
        lastSpawnTime: 0,
        isActive: true
      }));
      
      state.initEnemyBases(enemyBases);
      this.basesInitialized = true;
      return;
    }

    const newBases: EnemyBase[] = nearestCities.map((city, index) => {
      const baseStrength = 150 + currentWave * 50; // Базы становятся сильнее
      return {
        id: `base-${city.id}`,
        city: {
          ...city,
          health: baseStrength,
          maxHealth: baseStrength
        },
        health: baseStrength,
        maxHealth: baseStrength,
        spawnRate: Math.min(3, 0.3 + (index * 0.05) + (currentWave * 0.08)), // До 3 спавнов/сек на поздних волнах
        lastSpawnTime: 0,
        isActive: true
      };
    });

    log(`${additionalBases ? 'Adding' : 'Initialized'} ${newBases.length} enemy bases`);
    log('Base locations:', newBases.map(b => `${b.city.name} (${b.city.country})`));
    
    if (newBases.length === 0) {
      log('WARNING: No new bases created!');
      return;
    }
    
    if (additionalBases) {
      // Добавляем новые базы к существующим
      const allBases = [...existingBases, ...newBases];
      state.updateEnemyBases(allBases);
      log(`Total bases after addition: ${allBases.length}`);
    } else {
      state.initEnemyBases(newBases);
      this.basesInitialized = true;
    }
  }

  private getRandomWorldCities(excludeCity: City, count: number): City[] {
    // Получаем все города из базы
    const allCities = getAllCities();
    
    // Фильтруем исключая стартовый город
    const availableCities = allCities.filter(city => city.id !== excludeCity.id);
    
    // Выбираем города с разумным расстоянием
    const citiesWithDistance = availableCities.map(city => ({
      ...city,
      distance: calculateDistance(excludeCity.position, city.position)
    }));
    
    // Выбираем города на среднем расстоянии (300-2000 км)
    const suitableCities = citiesWithDistance.filter(city => 
      city.distance > 300 && city.distance < 2000
    );
    
    // Если нет подходящих, берем любые
    const citiesToUse = suitableCities.length > 0 ? suitableCities : citiesWithDistance;
    
    // Перемешиваем и берем нужное количество
    const shuffled = citiesToUse.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(({ distance, ...city }) => city);
  }

  private gameLoop = () => {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    const state = useGameStore.getState();
    
    // Ограничение на количество врагов для производительности
    const MAX_ENEMIES = 200; // Максимум врагов на карте
    
    if (!state.isPaused) {
      const adjustedDelta = deltaTime * state.gameSpeed;
      
      // Спавн врагов из баз (только если не слишком много)
      if (state.enemies.length < MAX_ENEMIES) {
        this.spawnEnemiesFromBases(adjustedDelta);
      } else {
        log(`Warning: Max enemies reached (${MAX_ENEMIES}), skipping spawn`);
      }
      
      // Обновление врагов
      this.updateEnemies(adjustedDelta);
      
      // Обновление башен
      this.updateTowers(adjustedDelta);
      
      // Обновление снарядов
      this.updateProjectiles(adjustedDelta);
      
      // Проверка состояния баз
      this.checkBases();
      
      // Проверка здоровья города
      this.checkCityHealth();
      
      // Логирование статистики каждые 5 секунд
      if (Math.floor(currentTime / 5000) !== Math.floor(this.lastTime / 5000)) {
        log(`Game stats: Enemies: ${state.enemies.length}, Bases: ${state.enemyBases.filter(b => b.isActive).length}, Wave: ${state.currentWave}, Gold: ${state.player.resources.gold}`);
      }
    }

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private async spawnEnemiesFromBases(deltaTime: number) {
    const state = useGameStore.getState();
    const player = state.player;
    const bases = [...state.enemyBases];
    const currentTime = performance.now();
    
    if (!player.startCity) return;

    for (const base of bases) {
      if (!base.isActive || base.health <= 0) continue;
      
      const timeSinceLastSpawn = currentTime - base.lastSpawnTime;
      const spawnInterval = 1000 / base.spawnRate; // миллисекунды между спавнами
      
      if (timeSinceLastSpawn >= spawnInterval) {
        base.lastSpawnTime = currentTime;
        
        // Увеличиваем частоту спавна с волнами, но ограничиваем
        const waveMultiplier = 1 + (state.currentWave - 1) * 0.2;
        base.spawnRate = Math.min(0.2 * waveMultiplier + (bases.indexOf(base) * 0.05), 2); // До 2 спавнов/сек
        
        // Выбираем ближайший город игрока для атаки
        let targetCity = player.startCity;
        let minDistance = calculateDistance(base.city.position, player.startCity.position);
        
        // Находим ближайший город игрока
        for (const city of state.capturedCitiesData || []) {
          const dist = calculateDistance(base.city.position, city.position);
          if (dist < minDistance) {
            minDistance = dist;
            targetCity = city;
          }
        }
        
        // Получаем или создаем маршрут по дорогам
        const routeKey = `${base.city.id}-${targetCity.id}`;
        let path = this.routeCache.get(routeKey);
        
        if (!path) {
          // Пытаемся получить маршрут по дорогам через OSRM
          try {
            const roadRoute = await getRouteByRoad(base.city.position, targetCity.position);
            if (roadRoute && roadRoute.length > 0) {
              path = roadRoute;
              log(`Got road route from ${base.city.name} to ${targetCity.name}, ${path.length} points`);
            } else {
              // Если не удалось получить маршрут по дорогам, используем прямой путь
              path = this.generateOptimizedPath(base.city.position, targetCity.position);
              log(`Using direct path from ${base.city.name} to ${targetCity.name} (no road route available)`);
            }
          } catch (error) {
            // В случае ошибки используем прямой путь
            path = this.generateOptimizedPath(base.city.position, targetCity.position);
            log(`Error getting road route, using direct path: ${error}`);
          }
          
          this.routeCache.set(routeKey, path);
        }
        
        this.spawnEnemyFromBase(base, path, targetCity.id);
      }
    }
    
    state.updateEnemyBases(bases);
  }

  private generateOptimizedPath(from: Position, to: Position): Position[] {
    const steps = 30; // Меньше точек для оптимизации
    const path: Position[] = [];
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Небольшая кривизна для реалистичности
      const curve = Math.sin(t * Math.PI) * 0.05;
      path.push({
        lat: from.lat + (to.lat - from.lat) * t + curve * (to.lng - from.lng) * 0.05,
        lng: from.lng + (to.lng - from.lng) * t - curve * (to.lat - from.lat) * 0.05
      });
    }
    
    return path;
  }

  private spawnEnemyFromBase(base: EnemyBase, path: Position[], targetCityId: string) {
    const currentWave = useGameStore.getState().currentWave;
    const waveModifier = Math.pow(1.2, currentWave - 1); // Экспоненциальное усиление
    
    // Количество врагов растет с волной, но ограничено для производительности
    const enemiesPerSpawn = Math.min(1 + Math.floor(currentWave / 3), 10); // 1-10 врагов за спавн
    
    for (let i = 0; i < enemiesPerSpawn; i++) {
      // Разнообразие врагов в зависимости от волны
      const types = [EnemyType.REGULAR, EnemyType.REGULAR, EnemyType.FAST];
      if (currentWave > 3) types.push(EnemyType.TANK);
      if (currentWave > 7) types.push(EnemyType.TANK, EnemyType.TANK); // Больше танков
      
      const type = types[Math.floor(Math.random() * types.length)];
      
      // Базовые скорости увеличены в 180 раз для масштабов планеты (было 90, теперь x2)
      const baseSpeed = type === EnemyType.FAST ? 27000 : type === EnemyType.TANK ? 10800 : 18000; // км/ч
      
      const enemy: Enemy = {
        id: `enemy-${Date.now()}-${Math.random()}-${i}`,
        type,
        position: { ...base.city.position },
        health: (type === EnemyType.TANK ? 200 : type === EnemyType.FAST ? 60 : 100) * waveModifier,
        maxHealth: (type === EnemyType.TANK ? 200 : type === EnemyType.FAST ? 60 : 100) * waveModifier,
        speed: baseSpeed * (1 + currentWave * 0.1), // Скорость растет с волнами
        reward: Math.floor((type === EnemyType.TANK ? 15 : type === EnemyType.FAST ? 8 : 5) * (1 + currentWave * 0.1)), // Меньше награды
        pathIndex: 0,
        path: [...path], // Копируем путь
        targetCityId: targetCityId // Используем переданную цель
      };
      
      // Небольшая задержка между спавнами в группе
      setTimeout(() => {
        useGameStore.getState().spawnEnemy(enemy);
      }, i * 50); // Меньше задержка для быстрого появления больших волн
    }
    
    log(`Spawned ${enemiesPerSpawn} enemies from base ${base.city.name} (Wave ${currentWave})`);
  }

  private updateEnemies(deltaTime: number) {
    const state = useGameStore.getState();
    let enemies = [...state.enemies];
    const player = state.player;
    const enemiesToRemove: string[] = [];
    let totalDamage = 0;
    
    // Обновляем всех врагов
    enemies.forEach(enemy => {
      if (enemy.pathIndex < enemy.path.length - 1) {
        // Скорость в градусах - врагов нужно сильно ускорить для масштабов планеты
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
        const damage = 10 + state.currentWave * 2; // Урон растет с волнами
        
        // Определяем, какой город атаковал враг
        if (enemy.targetCityId) {
          // Наносим урон конкретному городу
          state.damageCity(enemy.targetCityId, damage);
        } else {
          // По умолчанию атакуем стартовый город
          totalDamage += damage;
        }
        
        enemiesToRemove.push(enemy.id);
        // Не считаем врагов, достигших города, как убитых для прогресса волны
      }
    });
    
    // Удаляем врагов, достигших город
    if (enemiesToRemove.length > 0) {
      enemies = enemies.filter(e => !enemiesToRemove.includes(e.id));
      log(`${enemiesToRemove.length} enemies reached city, total damage: ${totalDamage}`);
    }
    
    // Обновляем состояние одним вызовом
    if (totalDamage > 0 && player.startCity) {
      // Наносим урон стартовому городу (если был накопленный урон)
      state.damageCity(player.startCity.id, totalDamage);
    }
    
    // Обновляем список врагов
    useGameStore.setState({ enemies });
  }

  private updateTowers(deltaTime: number) {
    const state = useGameStore.getState();
    const towers = [...state.towers];
    let enemies = [...state.enemies]; // Изменяемый массив
    const bases = state.enemyBases;
    const currentTime = performance.now();
    const enemiestoRemove: string[] = [];
    
    towers.forEach(tower => {
      const timeSinceLastShot = currentTime - (tower.lastShotTime || 0);
      const shotInterval = 1000 / tower.fireRate;
      
      if (timeSinceLastShot < shotInterval) return;
      
      // Сначала ищем врагов
      let target: Enemy | EnemyBase | null = null;
      let targetType: 'enemy' | 'base' = 'enemy';
      let closestDistance = Infinity;
      let targetIndex = -1;
      
      // Проверяем врагов
      enemies.forEach((enemy, index) => {
        if (enemy.health <= 0) return; // Пропускаем мёртвых
        const distance = calculateDistance(tower.position, enemy.position);
        if (distance <= tower.range && distance < closestDistance) {
          target = enemy;
          targetType = 'enemy';
          closestDistance = distance;
          targetIndex = index;
        }
      });
      
      // Если врагов нет, проверяем базы
      if (!target) {
        bases.forEach(base => {
          if (base.health <= 0) return;
          const distance = calculateDistance(tower.position, base.city.position);
          if (distance <= tower.range && distance < closestDistance) {
            target = base;
            targetType = 'base';
            closestDistance = distance;
          }
        });
      }

      // Мгновенная стрельба - сразу наносим урон
      if (target) {
        tower.targetId = target.id;
        tower.lastShotTime = currentTime;
        
        // Мгновенно наносим урон цели
        if (targetType === 'enemy' && targetIndex !== -1) {
          const enemy = enemies[targetIndex];
          enemy.health -= tower.damage;
          
          // Отключаем подробное логирование каждого выстрела для производительности
          // log(`Tower hit enemy: ${enemy.id}, damage: ${tower.damage}, health: ${enemy.health}/${enemy.maxHealth}`);
          
          // Создаём визуальный эффект попадания (мгновенная линия)
          const hitEffect: Projectile = {
            id: `hit-${Date.now()}-${Math.random()}`,
            from: { ...tower.position },
            to: { ...enemy.position },
            current: { ...enemy.position }, // Мгновенно появляется у цели
            targetId: enemy.id,
            targetType: 'enemy',
            damage: 0, // Урон уже нанесён
            speed: 10000, // Очень быстро исчезает
            color: tower.type === TowerType.BASIC ? '#4A90E2' :
                   tower.type === TowerType.SNIPER ? '#7B68EE' :
                   tower.type === TowerType.SPLASH ? '#FF6B6B' : '#4ECDC4',
            size: tower.type === TowerType.SNIPER ? 10 : 8,
            isHitEffect: true // Маркер для визуального эффекта
          };
          
          state.addProjectile(hitEffect);
          
          if (enemy.health <= 0) {
            // log(`Enemy destroyed by tower: ${enemy.id}`);
            enemiestoRemove.push(enemy.id);
            this.enemiesKilledInWave++; // Считаем убитых врагов
            state.updateResources({ 
              gold: state.player.resources.gold + enemy.reward,
              score: state.player.resources.score + 5 // Меньше очков
            });
          }
        } else {
          // Атака базы - тоже мгновенная
          const base = target as EnemyBase;
          state.damageEnemyBase(base.id, tower.damage);
          
          // Визуальный эффект для базы
          const hitEffect: Projectile = {
            id: `hit-${Date.now()}-${Math.random()}`,
            from: { ...tower.position },
            to: { ...base.city.position },
            current: { ...base.city.position },
            targetId: base.id,
            targetType: 'base',
            damage: 0,
            speed: 10000,
            color: tower.type === TowerType.BASIC ? '#4A90E2' :
                   tower.type === TowerType.SNIPER ? '#7B68EE' :
                   tower.type === TowerType.SPLASH ? '#FF6B6B' : '#4ECDC4',
            size: 12,
            isHitEffect: true
          };
          
          state.addProjectile(hitEffect);
          
          if (base.health - tower.damage <= 0) {
            const remainingBases = state.enemyBases.filter(b => b.health > 0 && b.id !== base.id).length;
            log(`Enemy base destroyed! Remaining active bases: ${remainingBases}`);
            state.updateResources({ 
              gold: state.player.resources.gold + 200, // Меньше награды за базу
              score: state.player.resources.score + 50
            });
          }
        }
      } else {
        tower.targetId = undefined;
      }
    });

    // Удаляем уничтоженных врагов
    enemies = enemies.filter(e => !enemiestoRemove.includes(e.id));
    
    useGameStore.setState({ towers, enemies });
  }

  private updateProjectiles(deltaTime: number) {
    const state = useGameStore.getState();
    const projectiles = [...state.projectiles];
    
    // Удаляем визуальные эффекты попадания через 100мс
    const updatedProjectiles = projectiles.filter(projectile => {
      if ((projectile as any).isHitEffect) {
        // Визуальные эффекты быстро исчезают
        const age = Date.now() - parseInt(projectile.id.split('-')[1]);
        return age < 100; // Показываем эффект 100мс
      }
      return false; // Обычные снаряды больше не используются
    });
    
    state.updateProjectiles(updatedProjectiles);
  }

  private checkBases() {
    const state = useGameStore.getState();
    const bases = state.enemyBases.map(base => ({
      ...base,
      isActive: base.health > 0
    }));
    
    // Проверяем переход на следующую волну по количеству убитых врагов
    const activeBases = bases.filter(b => b.isActive).length;
    const totalBases = bases.length;
    
    // Логируем текущее состояние для отладки
    log(`Wave ${state.currentWave}: Killed ${this.enemiesKilledInWave}/${this.enemiesRequiredForNextWave}, Active bases: ${activeBases}/${totalBases}`);
    
    // Переход на следующую волну когда убито достаточно врагов
    if (this.enemiesKilledInWave >= this.enemiesRequiredForNextWave && this.basesInitialized) {
      log(`=== Wave ${state.currentWave} COMPLETE! Killed ${this.enemiesKilledInWave} enemies ===`);
      
      // Переходим на следующую волну
      const nextWave = state.currentWave + 1;
      state.nextWave();
      log(`=== Starting wave ${nextWave} ===`);
      
      // Сбрасываем счетчик и увеличиваем требование
      this.enemiesKilledInWave = 0;
      this.enemiesRequiredForNextWave = Math.floor(20 + (nextWave - 1) * 10); // 20, 30, 40, 50...
      
      // Добавляем новые базы на новой волне (максимум до целевого количества)
      const targetBases = Math.min(2 + Math.floor(nextWave / 2), 20); // Быстрее рост
      log(`Wave ${nextWave}: Current bases: ${totalBases}, Target: ${targetBases}`);
      
      // Всегда добавляем хотя бы 1-2 новые базы на каждой волне
      setTimeout(() => {
        log(`Adding new bases for wave ${nextWave}`);
        this.initializeEnemyBases(true);
      }, 2000);
    } else if (state.currentWave >= 1 && activeBases > 0 && activeBases < Math.min(2 + Math.floor(state.currentWave / 3), 20)) {
      // Добавляем новые базы если их меньше чем должно быть (до 50 баз)
      // Новые базы появляются чаще на поздних волнах
      const spawnChance = Math.min(0.8, 0.3 + state.currentWave * 0.05);
      if (Math.random() < spawnChance) {
        const basesToAdd = Math.min(3, Math.floor(state.currentWave / 5) + 1); // Добавляем 1-3 базы за раз
        log(`Adding ${basesToAdd} new enemy bases!`);
        for (let i = 0; i < basesToAdd; i++) {
          setTimeout(() => {
            // Проверяем что игра все еще активна
            if (!this.gameOverTriggered) {
              this.initializeEnemyBases(true);
            }
          }, 2000 + i * 1000);
        }
      }
    }
    
    state.updateEnemyBases(bases);
  }

  private checkCityHealth() {
    const state = useGameStore.getState();
    const cityHealth = state.player.startCity?.health;
    
    // Проверяем что город есть и его здоровье определено
    if (cityHealth !== undefined && cityHealth <= 0 && !this.gameOverTriggered) {
      this.gameOverTriggered = true;
      log('Game Over - City destroyed');
      
      // Останавливаем игру немедленно
      this.stop();
      
      // Показываем сообщение с небольшой задержкой
      setTimeout(() => {
        alert(`Игра окончена! Ваш город захвачен.\nВолна: ${state.currentWave}\nОчки: ${state.player.resources.score}`);
        
        // Полный сброс состояния
        state.resetGame();
        this.gameOverTriggered = false;
        this.basesInitialized = false;
        this.routeCache.clear();
      }, 500);
    }
  }
  
  private gameOverTriggered = false;
}

export const gameEngine = new GameEngine();