// Основные типы игры
export interface Position {
  lat: number;
  lng: number;
}

export interface City {
  id: string;
  name: string;
  position: Position;
  population: number;
  country: string;
  isCapital?: boolean;
  health?: number;
  maxHealth?: number;
}

export interface Tower {
  id: string;
  type: TowerType;
  position: Position;
  level: number;
  damage: number;
  range: number; // в километрах
  fireRate: number; // выстрелов в секунду
  targetId?: string;
  lastShotTime?: number;
  health?: number;
  maxHealth?: number;
}

export enum TowerType {
  BASIC = 'basic',
  SNIPER = 'sniper',
  SPLASH = 'splash',
  SLOW = 'slow'
}

export interface Enemy {
  id: string;
  type: EnemyType;
  position: Position;
  health: number;
  maxHealth: number;
  speed: number; // км/ч
  reward: number;
  pathIndex: number;
  path: Position[];
  targetCityId: string;
  lastAttackTime?: number;
}

export enum EnemyType {
  REGULAR = 'regular',
  FAST = 'fast',
  TANK = 'tank',
  FLYING = 'flying'
}

export interface Player {
  id: string;
  name: string;
  startCity: City;
  territory: Territory;
  resources: Resources;
  towers: Tower[];
  capturedCities: string[];
}

export interface Territory {
  cities: City[];
  bounds: Position[]; // полигон границ
  area: number; // км²
  expansionLevel?: number; // уровень расширения территории в км
}

export interface Resources {
  gold: number;
  energy: number;
  score: number;
}

export interface Wave {
  id: number;
  enemies: EnemyConfig[];
  startTime: number;
  fromCity: City;
  targetCity: City;
}

export interface EnemyConfig {
  type: EnemyType;
  count: number;
  interval: number; // мс между спавном
}

export interface GameState {
  player: Player;
  enemies: Enemy[];
  towers: Tower[];
  projectiles: Projectile[];
  enemyBases: EnemyBase[];
  currentWave: number;
  gameSpeed: number;
  isPaused: boolean;
  selectedTower?: Tower;
  placingTowerType?: TowerType;
}

export interface EnemyBase {
  id: string;
  city: City;
  health: number;
  maxHealth: number;
  spawnRate: number; // врагов в секунду
  lastSpawnTime: number;
  isActive: boolean;
}

export interface Projectile {
  id: string;
  from: Position;
  to: Position;
  current: Position;
  targetId: string;
  targetType: 'enemy' | 'base';
  damage: number;
  speed: number;
  color: string;
  size: number;
  isHitEffect?: boolean; // Визуальный эффект попадания
}

export interface TowerStats {
  [TowerType.BASIC]: {
    cost: 100;
    damage: 10;
    range: 50;
    fireRate: 1;
  };
  [TowerType.SNIPER]: {
    cost: 200;
    damage: 30;
    range: 100;
    fireRate: 0.5;
  };
  [TowerType.SPLASH]: {
    cost: 300;
    damage: 15;
    range: 40;
    fireRate: 0.8;
  };
  [TowerType.SLOW]: {
    cost: 150;
    damage: 5;
    range: 33;
    fireRate: 2;
  };
}