import { create } from 'zustand';
import { TowerType } from '../types/game.types';
import type { GameState, Tower, Enemy, City, Resources, Position, Projectile, EnemyBase } from '../types/game.types';
import { showNotification } from '../components/UI/GameNotification';

interface CapturedCity extends City {
  health: number;
  maxHealth: number;
}

interface GameStore extends GameState {
  // UI state
  availableCitiesForCapture: City[];
  showAvailableCities: boolean;
  availableCitiesForTowers: City[];
  showAvailableCitiesForTowers: boolean;
  capturedCitiesData: CapturedCity[];
  gameOverData: {
    isOpen: boolean;
    cityName: string;
    score: number;
    wave: number;
  } | null;
  
  // Actions
  initGame: (startCity: City) => void;
  placeTower: (type: TowerType, position: Position) => boolean;
  placeTowerInCity: (type: TowerType, cityId: string) => boolean;
  canCaptureCity: (cityId: string) => boolean;
  captureNewCity: (cityId: string) => boolean;
  getCityDefenseStatus: () => { cityId: string; health: number; maxHealth: number; towers: number }[];
  getTowerLimit: () => number;
  getCurrentTowerCount: () => number;
  setAvailableCitiesForCapture: (cities: City[]) => void;
  setShowAvailableCities: (show: boolean) => void;
  setAvailableCitiesForTowers: (cities: City[]) => void;
  setShowAvailableCitiesForTowers: (show: boolean) => void;
  removeTower: (towerId: string) => void;
  updateEnemies: (deltaTime: number) => void;
  updateTowers: (deltaTime: number) => void;
  spawnEnemy: (enemy: Enemy) => void;
  removeEnemy: (enemyId: string) => void;
  addProjectile: (projectile: Projectile) => void;
  updateProjectiles: (projectiles: Projectile[]) => void;
  initEnemyBases: (bases: EnemyBase[]) => void;
  updateEnemyBases: (bases: EnemyBase[]) => void;
  damageEnemyBase: (baseId: string, damage: number) => void;
  damageCity: (cityId: string, damage: number) => void;
  checkGameOver: () => boolean;
  captureCity: (city: City) => void;
  expandTerritory: (expansionKm: number) => void;
  updateResources: (resources: Partial<Resources>) => void;
  setGameSpeed: (speed: number) => void;
  togglePause: () => void;
  setPlacingTowerType: (type?: TowerType) => void;
  selectTower: (tower?: Tower) => void;
  nextWave: () => void;
  resetGame: () => void;
}

const TOWER_COSTS = {
  [TowerType.BASIC]: 100,
  [TowerType.SNIPER]: 250,
  [TowerType.SPLASH]: 400,
  [TowerType.SLOW]: 150,
};

const CITY_CAPTURE_COST = 500;
const TOWERS_PER_CITY = 5;

const initialResources: Resources = {
  gold: 500, // Больше начального золота для удобства
  energy: 100,
  score: 0
};

export const useGameStore = create<GameStore>((set, get) => ({
      // Initial state
      availableCitiesForCapture: [],
      showAvailableCities: false,
      availableCitiesForTowers: [],
      showAvailableCitiesForTowers: false,
      capturedCitiesData: [],
      gameOverData: null,
      
      player: {
        id: 'player1',
        name: 'Player',
        startCity: null!,
        territory: {
          cities: [],
          bounds: [],
          area: 0,
          expansionLevel: 0
        },
        resources: initialResources,
        towers: [],
        capturedCities: []
      },
      enemies: [],
      towers: [],
      projectiles: [],
      enemyBases: [],
      currentWave: 0,
      gameSpeed: 1,
      isPaused: false,
      selectedTower: undefined,
      placingTowerType: undefined,

      // Actions
      initGame: (startCity) => {
        const cityWithHealth = {
          ...startCity,
          health: 100,
          maxHealth: 100
        };
        set((state) => ({
          player: {
            ...state.player,
            startCity: cityWithHealth,
            territory: {
              cities: [cityWithHealth],
              bounds: [],
              area: 0,
              expansionLevel: 0
            },
            capturedCities: [startCity.id],
            resources: initialResources
          },
          currentWave: 1,
          enemies: [],
          towers: []
        }));
      },

      placeTower: (type, position) => {
        const state = get();
        const cost = TOWER_COSTS[type];
        
        // Проверяем золото
        if (state.player.resources.gold < cost) {
          console.log('Недостаточно золота');
          return false;
        }
        
        // Проверяем лимит башен
        const currentTowerCount = state.towers.length;
        const towerLimit = get().getTowerLimit();
        
        if (currentTowerCount >= towerLimit) {
          console.log(`Достигнут лимит башен: ${currentTowerCount}/${towerLimit}. Захватите новый город!`);
          return false;
        }
        
        // Проверяем, что башня строится только рядом с городами (в радиусе 500 км)
        const allCities = [
          state.player.startCity,
          ...(state.capturedCitiesData || [])
        ].filter(Boolean);
        
        let isNearCity = false;
        const MAX_TOWER_DISTANCE = 500; // км
        
        for (const city of allCities) {
          if (!city) continue;
          // Расчет расстояния между точками на сфере (формула гаверсинуса)
          const R = 6371; // Радиус Земли в км
          const dLat = (position.lat - city.position.lat) * Math.PI / 180;
          const dLon = (position.lng - city.position.lng) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(city.position.lat * Math.PI / 180) * Math.cos(position.lat * Math.PI / 180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;
          
          if (distance <= MAX_TOWER_DISTANCE) {
            isNearCity = true;
            break;
          }
        }
        
        if (!isNearCity) {
          showNotification('Ошибка размещения', 'Башни можно строить только в радиусе 500 км от ваших городов!', 'warning');
          return false;
        }

        const newTower: Tower = {
          id: `tower-${Date.now()}`,
          type,
          position,
          level: 1,
          damage: type === TowerType.BASIC ? 10 : 
                  type === TowerType.SNIPER ? 25 :
                  type === TowerType.SPLASH ? 15 : 5,
          range: type === TowerType.BASIC ? 27 : 
                 type === TowerType.SNIPER ? 50 :
                 type === TowerType.SPLASH ? 20 : 17,
          health: 100,
          maxHealth: 100,
          fireRate: type === TowerType.BASIC ? 2 : 
                    type === TowerType.SNIPER ? 0.5 :
                    type === TowerType.SPLASH ? 1.5 : 3
        };

        set((state) => ({
          towers: [...state.towers, newTower],
          player: {
            ...state.player,
            resources: {
              ...state.player.resources,
              gold: state.player.resources.gold - cost
            }
          },
          placingTowerType: undefined,
          showAvailableCitiesForTowers: false
        }));

        return true;
      },
      
      placeTowerInCity: (type, cityId) => {
        const state = get();
        const cost = TOWER_COSTS[type];
        
        // Проверяем золото
        if (state.player.resources.gold < cost) {
          showNotification('Недостаточно золота', `Нужно ${cost} золота для этой башни`, 'warning');
          return false;
        }
        
        // Проверяем лимит башен
        const currentTowerCount = state.towers.length;
        const towerLimit = get().getTowerLimit();
        
        if (currentTowerCount >= towerLimit) {
          showNotification('Лимит башен', 'Захватите новый город для увеличения лимита!', 'warning');
          return false;
        }
        
        // Находим город
        let cityPosition: Position | null = null;
        
        if (state.player.startCity?.id === cityId) {
          cityPosition = state.player.startCity.position;
        } else {
          const capturedCity = state.capturedCitiesData.find(c => c.id === cityId);
          if (capturedCity) {
            cityPosition = capturedCity.position;
          } else {
            // Может быть это город из списка доступных для башен
            const availableCity = state.availableCitiesForTowers.find(c => c.id === cityId);
            if (availableCity) {
              cityPosition = availableCity.position;
            }
          }
        }
        
        if (!cityPosition) {
          showNotification('Ошибка', 'Город не найден', 'error');
          return false;
        }

        const newTower: Tower = {
          id: `tower-${Date.now()}`,
          type,
          position: cityPosition,
          level: 1,
          damage: type === TowerType.BASIC ? 10 : 
                  type === TowerType.SNIPER ? 25 :
                  type === TowerType.SPLASH ? 15 : 5,
          range: type === TowerType.BASIC ? 27 : 
                 type === TowerType.SNIPER ? 50 :
                 type === TowerType.SPLASH ? 20 : 17,
          health: 100,
          maxHealth: 100,
          fireRate: type === TowerType.BASIC ? 2 : 
                    type === TowerType.SNIPER ? 0.5 :
                    type === TowerType.SPLASH ? 1.5 : 3
        };

        set((state) => ({
          towers: [...state.towers, newTower],
          player: {
            ...state.player,
            resources: {
              ...state.player.resources,
              gold: state.player.resources.gold - cost
            }
          },
          placingTowerType: undefined,
          showAvailableCitiesForTowers: false
        }));
        
        showNotification('Башня установлена', `Башня размещена в городе`, 'success');
        return true;
      },

      removeTower: (towerId) => {
        set((state) => ({
          towers: state.towers.filter(t => t.id !== towerId)
        }));
      },

      updateEnemies: (_deltaTime) => {
        set((state) => {
          const updatedEnemies = state.enemies.map(enemy => {
            // Простая логика движения - будет улучшена
            return enemy;
          }).filter(enemy => enemy.health > 0);

          return { enemies: updatedEnemies };
        });
      },

      updateTowers: (_deltaTime) => {
        // Логика стрельбы башен
      },

      spawnEnemy: (enemy) => {
        set((state) => ({
          enemies: [...state.enemies, enemy]
        }));
      },

      removeEnemy: (enemyId) => {
        set((state) => ({
          enemies: state.enemies.filter(e => e.id !== enemyId)
        }));
      },

      addProjectile: (projectile) => {
        set((state) => ({
          projectiles: [...state.projectiles, projectile]
        }));
      },

      updateProjectiles: (projectiles) => {
        set({ projectiles });
      },

      initEnemyBases: (bases) => {
        set({ enemyBases: bases });
      },

      updateEnemyBases: (bases) => {
        set({ enemyBases: bases });
      },

      damageEnemyBase: (baseId, damage) => {
        set((state) => ({
          enemyBases: state.enemyBases.map(base => 
            base.id === baseId 
              ? { ...base, health: Math.max(0, base.health - damage) }
              : base
          )
        }));
      },

      captureCity: (city) => {
        set((state) => {
          // При захвате города автоматически расширяем территорию
          const newExpansionLevel = (state.player.territory.expansionLevel || 0) + 5; // +5км за каждый город
          
          return {
            player: {
              ...state.player,
              territory: {
                ...state.player.territory,
                cities: [...state.player.territory.cities, city],
                expansionLevel: newExpansionLevel
              },
              capturedCities: [...state.player.capturedCities, city.id]
            }
          };
        });
      },

      expandTerritory: (expansionKm) => {
        set((state) => ({
          player: {
            ...state.player,
            territory: {
              ...state.player.territory,
              expansionLevel: (state.player.territory.expansionLevel || 0) + expansionKm
            }
          }
        }));
      },

      updateResources: (resources) => {
        set((state) => ({
          player: {
            ...state.player,
            resources: {
              ...state.player.resources,
              ...resources
            }
          }
        }));
      },

      setGameSpeed: (speed) => {
        set({ gameSpeed: speed });
      },

      togglePause: () => {
        set((state) => ({ isPaused: !state.isPaused }));
      },

      setPlacingTowerType: (type) => {
        set({ 
          placingTowerType: type,
          showAvailableCitiesForTowers: type !== undefined
        });
      },

      selectTower: (tower) => {
        set({ selectedTower: tower });
      },

      nextWave: () => {
        set((state) => ({ currentWave: state.currentWave + 1 }));
      },

      resetGame: () => {
        set({
          enemies: [],
          towers: [],
          projectiles: [],
          enemyBases: [],
          currentWave: 0,
          gameSpeed: 1,
          isPaused: false,
          selectedTower: undefined,
          placingTowerType: undefined,
          gameOverData: null
        });
      },

      // Новые методы для системы городов
      getTowerLimit: () => {
        const state = get();
        // Только стартовый город дает 5 башен, плюс по 5 за каждый захваченный
        const totalCities = state.player.capturedCities.length;
        return (totalCities + 1) * TOWERS_PER_CITY;
      },

      getCurrentTowerCount: () => {
        return get().towers.length;
      },

      canCaptureCity: (cityId) => {
        const state = get();
        
        // Проверяем что город не захвачен
        if (state.player.capturedCities.includes(cityId)) {
          return false;
        }
        
        // Проверяем достаточно ли золота
        if (state.player.resources.gold < CITY_CAPTURE_COST) {
          return false;
        }
        
        return true;
      },

      captureNewCity: (cityId) => {
        const state = get();
        
        if (!get().canCaptureCity(cityId)) {
          return false;
        }
        
        // Находим город в доступных для захвата
        const cityToCapture = state.availableCitiesForCapture.find(c => c.id === cityId);
        if (!cityToCapture) {
          return false;
        }
        
        // Создаем захваченный город с здоровьем
        const capturedCity: CapturedCity = {
          ...cityToCapture,
          health: 100,
          maxHealth: 100
        };
        
        set((state) => ({
          player: {
            ...state.player,
            capturedCities: [...state.player.capturedCities, cityId],
            resources: {
              ...state.player.resources,
              gold: state.player.resources.gold - CITY_CAPTURE_COST,
              score: state.player.resources.score + 100
            }
          },
          capturedCitiesData: [...state.capturedCitiesData, capturedCity]
        }));
        
        console.log(`Город ${cityToCapture.name} захвачен! Новый лимит башен: ${get().getTowerLimit()}`);
        return true;
      },

      getCityDefenseStatus: () => {
        const state = get();
        const cities = [];
        
        // Стартовый город
        if (state.player.startCity) {
          cities.push({
            cityId: state.player.startCity.id,
            health: state.player.startCity.health || 100,
            maxHealth: state.player.startCity.maxHealth || 100,
            towers: state.towers.filter(t => {
              // Проверяем что башня в радиусе 100км от города
              const dist = Math.sqrt(
                Math.pow(t.position.lat - state.player.startCity!.position.lat, 2) +
                Math.pow(t.position.lng - state.player.startCity!.position.lng, 2)
              ) * 111; // примерное преобразование в км
              return dist <= 100;
            }).length
          });
        }
        
        // TODO: Добавить захваченные города
        
        return cities;
      },
      
      setAvailableCitiesForCapture: (cities) => {
        set({ availableCitiesForCapture: cities });
      },
      
      setShowAvailableCities: (show) => {
        set({ showAvailableCities: show });
      },
      
      setAvailableCitiesForTowers: (cities) => {
        set({ availableCitiesForTowers: cities });
      },
      
      setShowAvailableCitiesForTowers: (show) => {
        set({ showAvailableCitiesForTowers: show });
      },
      
      damageCity: (cityId, damage) => {
        set((state) => {
          const updatedCities = state.capturedCitiesData.map(city => 
            city.id === cityId 
              ? { ...city, health: Math.max(0, city.health - damage) }
              : city
          );
          
          // Проверяем, не уничтожен ли город
          const oldCity = state.capturedCitiesData.find(city => city.id === cityId);
          const destroyedCity = updatedCities.find(city => city.id === cityId && city.health <= 0);
          if (destroyedCity && oldCity && oldCity.health > 0) { // Показываем уведомление только если город был жив
            // Показываем модальное окно Game Over
            return { 
              capturedCitiesData: updatedCities,
              gameOverData: {
                isOpen: true,
                cityName: destroyedCity.name,
                score: state.player.resources.score,
                wave: state.currentWave
              }
            };
          }
          
          // Проверяем стартовый город
          if (cityId === state.player.startCity?.id) {
            const oldHealth = state.player.startCity.health || 100;
            const newHealth = Math.max(0, oldHealth - damage);
            if (newHealth <= 0 && oldHealth > 0) { // Показываем только при первом уничтожении
              // Показываем модальное окно Game Over
              return { 
                capturedCitiesData: updatedCities,
                gameOverData: {
                  isOpen: true,
                  cityName: state.player.startCity.name,
                  score: state.player.resources.score,
                  wave: state.currentWave
                }
              };
            }
            return {
              capturedCitiesData: updatedCities,
              player: {
                ...state.player,
                startCity: {
                  ...state.player.startCity,
                  health: newHealth
                }
              }
            };
          }
          
          return { capturedCitiesData: updatedCities };
        });
      },
      
      checkGameOver: () => {
        const state = get();
        
        // Проверяем стартовый город
        if (state.player.startCity && (state.player.startCity.health || 100) <= 0) {
          return true;
        }
        
        // Проверяем захваченные города
        const destroyedCity = state.capturedCitiesData.find(city => city.health <= 0);
        if (destroyedCity) {
          return true;
        }
        
        return false;
      }
}));