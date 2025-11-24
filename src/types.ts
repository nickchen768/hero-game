export const EntityType = {
  PLAYER: 'PLAYER',
  ENEMY_FLY: 'ENEMY_FLY',
  ENEMY_ANT: 'ENEMY_ANT',
  ENEMY_RAT: 'ENEMY_RAT',
  PROJECTILE: 'PROJECTILE',
  EFFECT: 'EFFECT'
} as const;

export type EntityType = typeof EntityType[keyof typeof EntityType];

export const ActionState = {
  IDLE: 'IDLE',
  WALK: 'WALK',
  JUMP: 'JUMP',
  ATTACK_NORMAL: 'ATTACK_NORMAL',
  ATTACK_SHIELD: 'ATTACK_SHIELD',
  ATTACK_DASH: 'ATTACK_DASH',
  HURT: 'HURT',
  DYING: 'DYING'
} as const;

export type ActionState = typeof ActionState[keyof typeof ActionState];

export interface Rect {
  x: number;
  y: number; // The "depth" position on the ground (Z-index equivalent in 2.5D)
  width: number;
  height: number; // Physical height of the sprite
  elevation: number; // Altitude (Z-axis in physics)
}

export interface Platform {
  x: number;
  y: number; // Ground Y position
  width: number;
  depth: number; // How "deep" the platform is
  height: number; // How high off the ground floor it is
  color: string;
}

export interface Entity extends Rect {
  id: number;
  type: EntityType;
  state: ActionState;
  direction: 1 | -1; // 1 = Right, -1 = Left
  vx: number;
  vy: number; // Velocity on the ground plane (depth)
  vz: number; // Velocity in the air (altitude)
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  frameIndex: number;
  frameTimer: number;
  isGrounded: boolean;
  attackCooldown: number;
  hitboxActive: boolean;
  invincibleTimer: number;
}

export interface GameState {
  score: number;
  wave: number;
  isPlaying: boolean;
  isGameOver: boolean;
  isVictory: boolean;
  timeElapsed: number;
  enemiesKilled: {
    flies: number;
    ants: number;
    rats: number;
  };
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  attack: boolean;
  skill1: boolean;
  skill2: boolean;
}