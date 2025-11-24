import React, { useEffect, useRef, useState } from 'react';
// Separate imports for values (const objects) and types (interfaces)
import { ActionState, EntityType } from '../types';
import type { Entity, GameState, InputState } from '../types';
import { ASSETS, CANVAS_HEIGHT, CANVAS_WIDTH, COST_DASH, COST_SHIELD, GRAVITY, GROUND_Y_LIMIT, MP_REGEN, PLATFORMS, PLAYER_JUMP_FORCE, PLAYER_SPEED, SKY_Y_LIMIT, SPAWN_RATE_BASE } from '../constants';

// --- Assets Manager ---
const images: Record<string, HTMLImageElement> = {};
const loadImages = () => {
  const toLoad = {
    idle: ASSETS.PLAYER.IDLE,
    attack: ASSETS.PLAYER.ATTACK,
    throw: ASSETS.PLAYER.THROW,
    dash: ASSETS.PLAYER.DASH,
    bg: ASSETS.BACKGROUND,
  };
  Object.entries(toLoad).forEach(([key, src]) => {
    const img = new Image();
    img.src = src;
    images[key] = img;
  });
};

interface GameCanvasProps {
  onGameOver: (stats: GameState) => void;
  onVictory: (stats: GameState) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver, onVictory }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // -- Mutable Game State (Refs for performance) --
  const gameStateRef = useRef<GameState>({
    score: 0,
    wave: 1,
    isPlaying: true,
    isGameOver: false,
    isVictory: false,
    timeElapsed: 0,
    enemiesKilled: { flies: 0, ants: 0, rats: 0 },
  });

  const playerRef = useRef<Entity>({
    id: 0,
    type: EntityType.PLAYER,
    state: ActionState.IDLE,
    x: 100, y: 400,
    width: 80, height: 80,
    elevation: 0,
    vx: 0, vy: 0, vz: 0,
    direction: 1,
    hp: 100, maxHp: 100,
    mp: 100, maxMp: 100,
    frameIndex: 0, frameTimer: 0,
    isGrounded: true,
    attackCooldown: 0,
    hitboxActive: false,
    invincibleTimer: 0
  });

  const entitiesRef = useRef<Entity[]>([]);
  const keysRef = useRef<InputState>({
    left: false, right: false, up: false, down: false,
    jump: false, attack: false, skill1: false, skill2: false
  });
  
  // React State for UI Overlay (HP/MP)
  const [hudState, setHudState] = useState({ hp: 100, mp: 100, score: 0, wave: 1 });

  // --- Helpers ---
  const checkRectOverlap = (r1: Entity, r2: Entity) => {
    // 2.5D Collision:
    // 1. X overlap (horizontal)
    // 2. Y overlap (depth/ground plane)
    // 3. Elevation overlap (height)
    
    // Hitbox tweaking
    const r1w = r1.width * 0.4;
    const r2w = r2.width * 0.4;
    const r1d = 20; // Depth thickness
    const r2d = 20;
    
    const xOverlap = Math.abs(r1.x - r2.x) < (r1w + r2w) / 2;
    const yOverlap = Math.abs(r1.y - r2.y) < (r1d + r2d) / 2;
    const zOverlap = Math.abs(r1.elevation - r2.elevation) < (r1.height + r2.height) / 2;

    return xOverlap && yOverlap && zOverlap;
  };

  const spawnEnemy = (wave: number) => {
    const typeRoll = Math.random();
    let type: EntityType = EntityType.ENEMY_ANT;
    let y = Math.random() * (GROUND_Y_LIMIT - SKY_Y_LIMIT) + SKY_Y_LIMIT;
    let elevation = 0;
    let hp = 30;
    let width = 60;
    let height = 40;

    // Platform spawning logic
    const platform = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];
    if (Math.random() > 0.5 && platform.height > 0) {
      y = platform.y;
      elevation = platform.height;
    }

    if (wave > 1 && typeRoll > 0.6) type = EntityType.ENEMY_FLY;
    if (wave > 3 && typeRoll > 0.9) type = EntityType.ENEMY_RAT;

    if (type === EntityType.ENEMY_FLY) {
      elevation = Math.random() * 100 + 50;
      hp = 20;
      width = 40;
    } else if (type === EntityType.ENEMY_RAT) {
      hp = 80;
      width = 70;
      height = 50;
    }

    const enemy: Entity = {
      id: Date.now() + Math.random(),
      type,
      state: ActionState.IDLE,
      x: CANVAS_WIDTH + 50,
      y: y,
      elevation: elevation,
      vx: 0, vy: 0, vz: 0,
      width, height,
      direction: -1,
      hp, maxHp: hp,
      mp: 0, maxMp: 0,
      frameIndex: 0, frameTimer: 0,
      isGrounded: type !== EntityType.ENEMY_FLY,
      attackCooldown: 0,
      hitboxActive: true,
      invincibleTimer: 0
    };
    entitiesRef.current.push(enemy);
  };

  // --- Main Loop ---
  const update = () => {
    if (!gameStateRef.current.isPlaying) return;

    const player = playerRef.current;
    const keys = keysRef.current;
    
    gameStateRef.current.timeElapsed++;
    
    // 1. Spawning
    if (gameStateRef.current.timeElapsed % Math.max(50, SPAWN_RATE_BASE - gameStateRef.current.wave * 10) === 0) {
      spawnEnemy(gameStateRef.current.wave);
    }
    // Increase wave every 30 seconds (approx 1800 frames)
    if (gameStateRef.current.timeElapsed % 1800 === 0) {
      gameStateRef.current.wave++;
    }

    // 2. Player Physics & Input
    
    // PRIORITY 1: Special Attack States (Dash)
    if (player.state === ActionState.ATTACK_DASH) {
        // Dash overrides normal movement physics
        player.vx = 15 * player.direction; // Fly forward speed
        player.vz = 0; // Anti-gravity
        player.vy = 0; // Lock depth
    } 
    // PRIORITY 2: Status Effects (Hurt, Dying)
    else if (player.state === ActionState.HURT) {
       // Apply friction to knockback
       player.vx *= 0.9;
       
       // Automatically recover from HURT state
       if (player.invincibleTimer < 45) { 
           player.state = ActionState.IDLE;
       }
    } 
    else if (player.state === ActionState.DYING) {
        player.vx = 0;
        player.vy = 0;
    }
    // PRIORITY 3: Normal Movement & Actions
    else {
      // Reset velocity for normal control
      player.vx = 0;
      player.vy = 0;
      
      const isAttacking = ([ActionState.ATTACK_NORMAL, ActionState.ATTACK_SHIELD] as ActionState[]).includes(player.state);
      
      if (!isAttacking) {
          if (keys.left) { player.vx = -PLAYER_SPEED; player.direction = -1; }
          if (keys.right) { player.vx = PLAYER_SPEED; player.direction = 1; }
          if (keys.up) player.vy = -PLAYER_SPEED * 0.7;
          if (keys.down) player.vy = PLAYER_SPEED * 0.7;

          // State transitions
          if (player.vx !== 0 || player.vy !== 0) {
            player.state = ActionState.WALK;
          } else {
            player.state = ActionState.IDLE;
          }
      }

      // Jump
      if (keys.jump && player.isGrounded && !isAttacking) {
        // Drop down check
        let dropped = false;
        if (keys.down) {
           // check if on high platform
           if (player.elevation > 0) {
             player.elevation -= 2; // Nudge down to fall through
             player.isGrounded = false;
             dropped = true;
           }
        }
        
        if (!dropped) {
            player.vz = PLAYER_JUMP_FORCE;
            player.isGrounded = false;
            player.state = ActionState.JUMP;
        }
      }

      // Attacks
      if (!isAttacking && player.attackCooldown <= 0) {
        if (keys.attack) {
          player.state = ActionState.ATTACK_NORMAL;
          player.frameIndex = 0;
          player.attackCooldown = 20;
          player.hitboxActive = true;
        } else if (keys.skill1 && player.mp >= COST_SHIELD) {
          player.state = ActionState.ATTACK_SHIELD;
          player.mp -= COST_SHIELD;
          player.frameIndex = 0;
          player.attackCooldown = 40;
          
          // Spawn Shield Projectile (Larger AoE)
          const shield: Entity = {
            id: Date.now(),
            type: EntityType.PROJECTILE,
            state: ActionState.IDLE,
            x: player.x + (20 * player.direction),
            y: player.y,
            elevation: player.elevation + 20,
            width: 80, height: 80, // Larger size for AoE effect
            vx: 8 * player.direction,
            vy: 0, vz: 0,
            direction: player.direction,
            hp: 1, maxHp: 1, mp: 0, maxMp: 0,
            frameIndex: 0, frameTimer: 0,
            isGrounded: false,
            attackCooldown: 0,
            hitboxActive: true,
            invincibleTimer: 0
          };
          entitiesRef.current.push(shield);

        } else if (keys.skill2 && player.mp >= COST_DASH) {
          player.state = ActionState.ATTACK_DASH;
          player.mp -= COST_DASH;
          player.frameIndex = 0;
          player.attackCooldown = 30;
          player.invincibleTimer = 30;
          player.hitboxActive = true;
        }
      }
    }

    // Apply Velocity
    player.x += player.vx;
    player.y += player.vy;
    player.elevation += player.vz;
    // Apply gravity only if not Dashing
    if (player.state !== ActionState.ATTACK_DASH) {
        player.vz -= GRAVITY; 
    }

    // Bounds
    if (player.x < 0) player.x = 0;
    if (player.x > CANVAS_WIDTH) player.x = CANVAS_WIDTH;
    if (player.y < SKY_Y_LIMIT) player.y = SKY_Y_LIMIT;
    if (player.y > GROUND_Y_LIMIT) player.y = GROUND_Y_LIMIT;

    // Platform Collision (Grounding)
    let groundHeight = 0;
    
    // Check all platforms
    PLATFORMS.forEach(p => {
        // Check if within horizontal bounds
        if (player.x > p.x && player.x < p.x + p.width &&
            player.y > p.y - p.depth && player.y < p.y + p.depth) {
            
            // Check landing: falling and roughly at platform height
            if (player.elevation >= p.height && player.elevation + player.vz <= p.height && player.vz <= 0) {
                 groundHeight = Math.max(groundHeight, p.height);
            } else if (player.elevation === p.height) {
                // Already on it
                groundHeight = Math.max(groundHeight, p.height);
            }
        }
    });

    // Ground collision logic (ignored if Dashing/Flying)
    if (player.state !== ActionState.ATTACK_DASH) {
        if (player.elevation <= groundHeight && player.vz <= 0) {
        player.elevation = groundHeight;
        player.vz = 0;
        player.isGrounded = true;
        if (player.state === ActionState.JUMP) player.state = ActionState.IDLE;
        } else {
            player.isGrounded = false;
        }
    }

    // Cooldowns & Regen
    if (player.attackCooldown > 0) player.attackCooldown--;
    if (player.invincibleTimer > 0) player.invincibleTimer--;
    if (player.mp < player.maxMp) player.mp += MP_REGEN;

    // Animation Tick
    player.frameTimer++;
    if (player.frameTimer > 6) { // Slow down animation
        player.frameTimer = 0;
        player.frameIndex = (player.frameIndex + 1) % 4;
        
        // Reset attack state at end of animation
        if (([ActionState.ATTACK_NORMAL, ActionState.ATTACK_SHIELD, ActionState.ATTACK_DASH] as ActionState[]).includes(player.state)) {
            if (player.frameIndex === 0) {
                player.state = ActionState.IDLE;
                player.hitboxActive = false;
            }
        }
    }

    // 3. Entity Updates (Enemies & Projectiles)
    for (let i = entitiesRef.current.length - 1; i >= 0; i--) {
        const ent = entitiesRef.current[i];
        
        // FIX: Decrement invincibility for enemies so they can be hit again
        if (ent.invincibleTimer > 0) {
            ent.invincibleTimer--;
        }

        // Projectiles
        if (ent.type === EntityType.PROJECTILE) {
            ent.x += ent.vx;
            // Despawn
            if (ent.x < 0 || ent.x > CANVAS_WIDTH) entitiesRef.current.splice(i, 1);
            continue;
        }

        // Enemies
        // AI: Move towards player
        const dx = player.x - ent.x;
        const dy = player.y - ent.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (ent.state !== ActionState.HURT) {
            if (dist > 10) {
                ent.vx = (dx / dist) * (ent.type === EntityType.ENEMY_FLY ? 2 : 1.5);
                ent.direction = dx > 0 ? 1 : -1;
            } else {
                ent.vx = 0;
            }
            
            if (ent.type === EntityType.ENEMY_FLY) {
               ent.vy = (dy / dist) * 2;
               // Bobbing
               ent.elevation += Math.sin(gameStateRef.current.timeElapsed * 0.1) * 0.5;
            } else {
               ent.vy = (dy / dist) * 1.5;
               // Gravity for non-flyers
               ent.elevation += ent.vz;
               ent.vz -= GRAVITY;
               if (ent.elevation <= 0) { ent.elevation = 0; ent.vz = 0; ent.isGrounded = true; }
            }
        } else {
            // Knockback friction
            ent.vx *= 0.9;
        }

        ent.x += ent.vx;
        ent.y += ent.vy;
        
        // Enemy Animation
        ent.frameTimer++;
        if (ent.frameTimer > 8) {
            ent.frameTimer = 0;
            ent.frameIndex = (ent.frameIndex + 1) % 4;
            if (ent.state === ActionState.HURT && ent.frameIndex === 0) {
                ent.state = ActionState.IDLE;
            }
        }

        // --- Collisions ---
        
        // 1. Player Attack vs Enemy
        if (player.hitboxActive && checkRectOverlap(player, ent) && ent.invincibleTimer <= 0) {
            ent.hp -= 15;
            ent.state = ActionState.HURT;
            ent.vx = 5 * player.direction; // Knockback
            ent.invincibleTimer = 15;
            // MP Recovery
            player.mp = Math.min(player.maxMp, player.mp + 5);
        }

        // 2. Projectile vs Enemy
        const projectiles = entitiesRef.current.filter(e => e.type === EntityType.PROJECTILE);
        projectiles.forEach(proj => {
            if (checkRectOverlap(proj, ent) && ent.invincibleTimer <= 0) {
                ent.hp -= 20;
                ent.state = ActionState.HURT;
                ent.vx = 5 * proj.direction;
                ent.invincibleTimer = 15;
            }
        });

        // 3. Enemy vs Player (Damage)
        if (ent.state !== ActionState.HURT && checkRectOverlap(ent, player) && player.invincibleTimer <= 0 && player.state !== ActionState.ATTACK_DASH) {
            player.hp -= 10;
            player.state = ActionState.HURT;
            player.invincibleTimer = 60;
            player.vx = 5 * -player.direction; // Knockback
        }

        // Death Check
        if (ent.hp <= 0) {
            gameStateRef.current.score += 100;
            if (ent.type === EntityType.ENEMY_FLY) gameStateRef.current.enemiesKilled.flies++;
            if (ent.type === EntityType.ENEMY_ANT) gameStateRef.current.enemiesKilled.ants++;
            if (ent.type === EntityType.ENEMY_RAT) gameStateRef.current.enemiesKilled.rats++;
            
            entitiesRef.current.splice(i, 1);
        }
    }

    // Player Death
    if (player.hp <= 0 && !gameStateRef.current.isGameOver) {
        gameStateRef.current.isGameOver = true;
        gameStateRef.current.isPlaying = false;
        onGameOver(gameStateRef.current);
    }
    
    // Victory Condition (Example: Survive 3 mins or Score > 5000)
    if (gameStateRef.current.score >= 5000 && !gameStateRef.current.isVictory) {
        gameStateRef.current.isVictory = true;
        gameStateRef.current.isPlaying = false;
        onVictory(gameStateRef.current);
    }

    // Sync HUD
    if (gameStateRef.current.timeElapsed % 10 === 0) {
        setHudState({
            hp: Math.max(0, Math.floor(player.hp)),
            mp: Math.min(100, Math.floor(player.mp)),
            score: gameStateRef.current.score,
            wave: gameStateRef.current.wave
        });
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    // Clear
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Background
    if (images.bg) {
        ctx.drawImage(images.bg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // Platforms
    PLATFORMS.forEach(p => {
        // Draw shadow on ground
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(p.x, p.y - p.depth/2, p.width, p.depth);
        
        // Draw raised platform face (simple pseudo-3d)
        if (p.height > 0) {
            const screenY = p.y - p.height;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, screenY - 10, p.width, 20); // Top
            ctx.fillStyle = '#4a3b2a'; // darker side
            ctx.fillRect(p.x, screenY + 10, p.width, p.height); // front face support? Simple rep.
        }
    });

    // Entities Sort by Y (Depth) to draw correctly
    const allEntities = [...entitiesRef.current, playerRef.current].sort((a, b) => a.y - b.y);

    allEntities.forEach(ent => {
        const screenX = ent.x;
        const screenY = ent.y - ent.elevation;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(ent.x, ent.y, ent.width/2, ent.width/4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Sprite
        let img = images.idle;
        if (ent.type === EntityType.PLAYER) {
            if (ent.state === ActionState.ATTACK_NORMAL) img = images.attack;
            else if (ent.state === ActionState.ATTACK_SHIELD) img = images.throw;
            else if (ent.state === ActionState.ATTACK_DASH) img = images.dash;
        } else {
            // Placeholder enemies if no sprite
            // For now use player idle tinted or simple shapes if assets missing
        }

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.scale(ent.direction, 1);
        
        if (ent.state === ActionState.HURT && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.5; // Flash effect
        }

        if (ent.type === EntityType.PLAYER && img) {
            const sw = img.width / 4;
            const sh = img.height;
            ctx.drawImage(img, 
                ent.frameIndex * sw, 0, sw, sh,
                -ent.width/2 - 20, -ent.height - 20, 128, 128 // Adjust size
            );
        } else if (ent.type === EntityType.PROJECTILE) {
             ctx.fillStyle = 'rgba(0, 255, 255, 0.7)';
             ctx.beginPath();
             // Draw larger effect for AoE
             ctx.arc(0, -20, ent.width / 2, 0, Math.PI*2);
             ctx.fill();
        } else {
            // Simple Enemy Draw
            ctx.fillStyle = ent.type === EntityType.ENEMY_FLY ? 'red' : (ent.type === EntityType.ENEMY_ANT ? 'black' : 'gray');
            ctx.fillRect(-ent.width/2, -ent.height, ent.width, ent.height);
        }

        ctx.restore();

        // HP Bar for enemies
        if (ent.type !== EntityType.PLAYER && ent.type !== EntityType.PROJECTILE) {
            ctx.fillStyle = 'red';
            ctx.fillRect(screenX - 15, screenY - ent.height - 10, 30, 4);
            ctx.fillStyle = 'green';
            ctx.fillRect(screenX - 15, screenY - ent.height - 10, 30 * (ent.hp/ent.maxHp), 4);
        }
    });
  };

  // --- Effects ---
  useEffect(() => {
    loadImages();

    const loop = () => {
        update();
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) draw(ctx);
        }
        requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  // --- Input Listeners ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const k = keysRef.current;
        switch(e.code) {
            case 'ArrowLeft': k.left = true; break;
            case 'ArrowRight': k.right = true; break;
            case 'ArrowUp': k.up = true; break;
            case 'ArrowDown': k.down = true; break;
            case 'Space': k.jump = true; break;
            case 'KeyZ': k.attack = true; break;
            case 'KeyX': k.skill1 = true; break;
            case 'KeyC': k.skill2 = true; break;
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        const k = keysRef.current;
        switch(e.code) {
            case 'ArrowLeft': k.left = false; break;
            case 'ArrowRight': k.right = false; break;
            case 'ArrowUp': k.up = false; break;
            case 'ArrowDown': k.down = false; break;
            case 'Space': k.jump = false; break;
            case 'KeyZ': k.attack = false; break;
            case 'KeyX': k.skill1 = false; break;
            case 'KeyC': k.skill2 = false; break;
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // --- Virtual Controls Handlers ---
  const handleTouchStart = (action: keyof InputState) => (e: React.PointerEvent) => {
      e.preventDefault(); // Stop mouse emulation
      keysRef.current[action] = true;
  };
  const handleTouchEnd = (action: keyof InputState) => (e: React.PointerEvent) => {
      e.preventDefault();
      keysRef.current[action] = false;
  };


  return (
    <div className="relative w-full h-full flex flex-col items-center bg-slate-800">
      {/* HUD */}
      <div className="absolute top-0 left-0 w-full p-2 flex justify-between items-start pointer-events-none z-10 text-white font-mono text-sm md:text-base">
        <div className="flex flex-col gap-1 bg-black/30 p-2 rounded">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full border-2 border-white overflow-hidden">
                    <img src={ASSETS.PLAYER.IDLE} className="w-full h-full object-cover scale-150" alt="avatar"/>
                </div>
                <div>
                    <div className="w-32 h-3 bg-gray-700 rounded-full overflow-hidden border border-gray-500">
                        <div className="h-full bg-green-500 transition-all duration-200" style={{ width: `${hudState.hp}%` }}></div>
                    </div>
                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden border border-gray-500 mt-1">
                        <div className="h-full bg-blue-400 transition-all duration-200" style={{ width: `${hudState.mp}%` }}></div>
                    </div>
                </div>
            </div>
        </div>
        <div className="text-right bg-black/30 p-2 rounded">
            <div>WAVE {hudState.wave}</div>
            <div className="text-yellow-400 font-bold">SCORE: {hudState.score}</div>
        </div>
      </div>

      {/* Game Canvas Container */}
      <div className="relative flex-grow w-full max-w-[800px] aspect-[4/3] bg-black shadow-2xl overflow-hidden my-auto">
         <canvas 
            ref={canvasRef} 
            width={CANVAS_WIDTH} 
            height={CANVAS_HEIGHT}
            className="w-full h-full object-contain"
         />
      </div>

      {/* Virtual Controls (Mobile Only) */}
      <div className="w-full h-48 md:hidden flex-none bg-slate-900/90 border-t border-white/10 grid grid-cols-2 p-4 select-none touch-none">
          {/* D-Pad Area */}
          <div className="relative w-full h-full flex items-center justify-center">
              <div className="w-32 h-32 relative">
                  <button 
                    className="absolute top-0 left-1/3 w-1/3 h-1/3 bg-slate-700/80 rounded-t-lg active:bg-blue-500/80 border border-white/10"
                    onPointerDown={handleTouchStart('up')} onPointerUp={handleTouchEnd('up')} onPointerLeave={handleTouchEnd('up')}
                  >▲</button>
                  <button 
                    className="absolute bottom-0 left-1/3 w-1/3 h-1/3 bg-slate-700/80 rounded-b-lg active:bg-blue-500/80 border border-white/10"
                    onPointerDown={handleTouchStart('down')} onPointerUp={handleTouchEnd('down')} onPointerLeave={handleTouchEnd('down')}
                  >▼</button>
                  <button 
                    className="absolute left-0 top-1/3 w-1/3 h-1/3 bg-slate-700/80 rounded-l-lg active:bg-blue-500/80 border border-white/10"
                    onPointerDown={handleTouchStart('left')} onPointerUp={handleTouchEnd('left')} onPointerLeave={handleTouchEnd('left')}
                  >◀</button>
                  <button 
                    className="absolute right-0 top-1/3 w-1/3 h-1/3 bg-slate-700/80 rounded-r-lg active:bg-blue-500/80 border border-white/10"
                    onPointerDown={handleTouchStart('right')} onPointerUp={handleTouchEnd('right')} onPointerLeave={handleTouchEnd('right')}
                  >▶</button>
                  <div className="absolute top-1/3 left-1/3 w-1/3 h-1/3 bg-slate-800 rounded-full"></div>
              </div>
          </div>

          {/* Action Buttons */}
          <div className="relative w-full h-full">
              <div className="absolute bottom-2 right-2 flex gap-4 items-end">
                  <div className="flex flex-col gap-2">
                      <button 
                        className="w-12 h-12 bg-cyan-600/80 rounded-full border-2 border-white/30 text-white font-bold active:bg-cyan-400 active:scale-95 transition-transform"
                        onPointerDown={handleTouchStart('skill1')} onPointerUp={handleTouchEnd('skill1')} onPointerLeave={handleTouchEnd('skill1')}
                      >X</button>
                      <button 
                        className="w-12 h-12 bg-purple-600/80 rounded-full border-2 border-white/30 text-white font-bold active:bg-purple-400 active:scale-95 transition-transform"
                        onPointerDown={handleTouchStart('skill2')} onPointerUp={handleTouchEnd('skill2')} onPointerLeave={handleTouchEnd('skill2')}
                      >C</button>
                  </div>
                  <button 
                      className="w-16 h-16 bg-red-600/80 rounded-full border-4 border-white/30 text-white font-bold text-xl active:bg-red-400 active:scale-95 transition-transform shadow-lg"
                      onPointerDown={handleTouchStart('attack')} onPointerUp={handleTouchEnd('attack')} onPointerLeave={handleTouchEnd('attack')}
                  >Z</button>
                  <button 
                      className="w-14 h-14 bg-green-600/80 rounded-full border-4 border-white/30 text-white font-bold mb-8 active:bg-green-400 active:scale-95 transition-transform shadow-lg"
                      onPointerDown={handleTouchStart('jump')} onPointerUp={handleTouchEnd('jump')} onPointerLeave={handleTouchEnd('jump')}
                  >J</button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default GameCanvas;