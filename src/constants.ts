

export const ASSETS = {
    PLAYER: {
      IDLE: 'https://s.snappable.media/C0PU.md.png',
      ATTACK: 'https://s.snappable.media/Cs0s.md.png',
      THROW: 'https://s.snappable.media/C0Tw.md.png',
      DASH: 'https://s.snappable.media/CsWJ.md.png',
    },
    BACKGROUND: 'https://s.snappable.media/Cs94.md.png'
  };
  
  // Physics & Gameplay
  export const GRAVITY = 0.6;
  export const GROUND_Y_LIMIT = 500; // Bottom of playable area
  export const SKY_Y_LIMIT = 250;    // Top of playable area
  export const CANVAS_WIDTH = 800;
  export const CANVAS_HEIGHT = 600;
  
  // Player Stats
  export const PLAYER_SPEED = 4;
  export const PLAYER_JUMP_FORCE = 12;
  export const MP_REGEN = 0.1;
  
  // Costs
  export const COST_SHIELD = 20; // Reduced to 20
  export const COST_DASH = 10;   // Reduced to 10
  
  // Enemies
  export const SPAWN_RATE_BASE = 200; // Frames between spawns
  
  // Dimensions for Sprites (Approximations based on 4-frame strips)
  export const SPRITE_SIZE = 128; // Assuming the source images are roughly 512px wide (128x4)
  export const HITBOX_PADDING = 30;
  
  // Platform Definitions
  export const PLATFORMS = [
    // Main Ground (Implicit, usually elevation 0)
    // Middle Platform
    { x: 100, y: 400, width: 200, depth: 40, height: 80, color: '#8B4513' },
    // High Platform
    { x: 450, y: 350, width: 250, depth: 40, height: 160, color: '#654321' },
    // Low long platform
    { x: 0, y: 550, width: 800, depth: 100, height: 0, color: 'transparent' } // Ground collider
  ];