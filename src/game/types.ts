export interface Vector2 {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  onGround: boolean;
  facing: 'left' | 'right';
  portalCooldown: number;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'normal' | 'moving' | 'breakable' | 'ice';
  moveRange?: number;
  moveSpeed?: number;
  moveDir?: 'horizontal' | 'vertical';
  originalX?: number;
  originalY?: number;
}

export interface Spike {
  x: number;
  y: number;
  width: number;
  height: number;
  direction: 'up' | 'down' | 'left' | 'right';
}

export interface Portal {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  id: 'A' | 'B';
}

export interface Checkpoint {
  x: number;
  y: number;
  activated: boolean;
}

export interface Goal {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MovingObstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  moveRange: number;
  moveSpeed: number;
  moveDir: 'horizontal' | 'vertical';
  originalX: number;
  originalY: number;
  phase: number;
}

export interface LevelData {
  id: number;
  name: string;
  description: string;
  platforms: Platform[];
  spikes: Spike[];
  checkpoints: Checkpoint[];
  goal: Goal;
  playerStart: Vector2;
  movingObstacles: MovingObstacle[];
  portalLimit: number;
  bgColor: string;
  width: number;
  height: number;
}

export interface SaveState {
  playerX: number;
  playerY: number;
  checkpointIndex: number;
  portals: Portal[];
}

export interface GameState {
  player: Player;
  portals: Portal[];
  currentLevel: number;
  saveState: SaveState;
  gameStatus: 'playing' | 'won' | 'dead' | 'menu' | 'editor';
  deaths: number;
  time: number;
  portalMode: 'none' | 'A' | 'B';
}
