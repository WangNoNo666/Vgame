import { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, Player, Portal, Platform, Spike, MovingObstacle, Checkpoint, SaveState } from '../game/types';
import { levels } from '../game/levels';

interface GameCanvasProps {
  levelIndex: number;
  onLevelComplete: () => void;
  onBack: () => void;
  customLevel?: typeof levels[0] | null;
}

const GRAVITY = 0.6;
const JUMP_FORCE = -13;
const MOVE_SPEED = 4.5;
const ICE_FRICTION = 0.98;
const NORMAL_FRICTION = 0.85;
const MAX_FALL_SPEED = 15;
const PORTAL_COOLDOWN = 30;

export default function GameCanvas({ levelIndex, onLevelComplete, onBack, customLevel }: GameCanvasProps) {
  const activeLevel = customLevel || levels[levelIndex];
  const activeLevelRef = useRef(activeLevel);
  activeLevelRef.current = activeLevel;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const breakableTimersRef = useRef<Map<string, number>>(new Map());
  const [deaths, setDeaths] = useState(0);
  const [portalMode, setPortalMode] = useState<'none' | 'A' | 'B'>('none');
  const [portalsLeft, setPortalsLeft] = useState(4);
  const [showCheckpointMsg, setShowCheckpointMsg] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const initLevel = useCallback((idx: number, saveState?: SaveState) => {
    const level = customLevel || levels[idx];
    if (!level) return;

    const player: Player = {
      x: saveState ? saveState.playerX : level.playerStart.x,
      y: saveState ? saveState.playerY : level.playerStart.y,
      vx: 0,
      vy: 0,
      width: 24,
      height: 32,
      onGround: false,
      facing: 'right',
      portalCooldown: 0,
    };

    const state: GameState = {
      player,
      portals: saveState ? saveState.portals : [],
      currentLevel: idx,
      saveState: saveState || {
        playerX: level.playerStart.x,
        playerY: level.playerStart.y,
        checkpointIndex: -1,
        portals: [],
      },
      gameStatus: 'playing',
      deaths: gameStateRef.current?.deaths || 0,
      time: 0,
      portalMode: 'none',
    };

    gameStateRef.current = state;
    setPortalsLeft(level.portalLimit - state.portals.length);
    breakableTimersRef.current.clear();
  }, []);

  const respawn = useCallback(() => {
    const state = gameStateRef.current;
    if (!state) return;

    state.player.x = state.saveState.playerX;
    state.player.y = state.saveState.playerY;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.onGround = false;
    state.deaths++;
    setDeaths(state.deaths);
    breakableTimersRef.current.clear();
  }, []);

  useEffect(() => {
    initLevel(levelIndex);
  }, [levelIndex, customLevel, initLevel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (e.key === 'Escape') {
        setIsPaused(p => !p);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const state = gameStateRef.current;
    if (!state || state.gameStatus !== 'playing' || isPaused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const portalSize = 30;

    if (portalMode === 'A' && portalsLeft > 0) {
      const existingB = state.portals.find(p => p.id === 'B');
      state.portals = state.portals.filter(p => p.id !== 'A');
      state.portals.push({
        x: x - portalSize / 2,
        y: y - portalSize / 2,
        width: portalSize,
        height: portalSize,
        color: '#00bfff',
        id: 'A',
      });
      if (existingB) {
        state.portals = state.portals.filter(p => p.id !== 'B');
        state.portals.push({ ...existingB });
      }
      setPortalsLeft(prev => prev - 1);
      setPortalMode('none');
    } else if (portalMode === 'B' && portalsLeft > 0) {
      const existingA = state.portals.find(p => p.id === 'A');
      state.portals = state.portals.filter(p => p.id !== 'B');
      state.portals.push({
        x: x - portalSize / 2,
        y: y - portalSize / 2,
        width: portalSize,
        height: portalSize,
        color: '#ff6b00',
        id: 'B',
      });
      if (existingA) {
        state.portals = state.portals.filter(p => p.id !== 'A');
        state.portals.push({ ...existingA });
      }
      setPortalsLeft(prev => prev - 1);
      setPortalMode('none');
    }
  }, [portalMode, portalsLeft, isPaused]);

  const handleRightClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const state = gameStateRef.current;
    if (!state || state.gameStatus !== 'playing' || isPaused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const portalSize = 30;
    const existingA = state.portals.find(p => p.id === 'A');
    state.portals = state.portals.filter(p => p.id !== 'B');
    state.portals.push({
      x: x - portalSize / 2,
      y: y - portalSize / 2,
      width: portalSize,
      height: portalSize,
      color: '#ff6b00',
      id: 'B',
    });
    if (existingA) {
      state.portals = state.portals.filter(p => p.id !== 'A');
      state.portals.push({ ...existingA });
    }
    setPortalsLeft(prev => Math.max(0, prev - 1));
  }, [isPaused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      const state = gameStateRef.current;
      if (!state) {
        animFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const level = activeLevelRef.current;

      if (!isPaused && state.gameStatus === 'playing') {
        timeRef.current++;

        // Update player
        updatePlayer(state, level, keysRef.current, breakableTimersRef.current);

        // Update moving obstacles
        updateMovingObstacles(level, timeRef.current);

        // Check collisions
        checkCollisions(state, level, breakableTimersRef.current);

        // Check portal teleportation
        checkPortals(state);

        // Check checkpoints
        const checkpointActivated = checkCheckpoints(state, level);
        if (checkpointActivated) {
          setShowCheckpointMsg(true);
          setTimeout(() => setShowCheckpointMsg(false), 2000);
        }

        // Check goal
        checkGoal(state, level, onLevelComplete);
      }

      // Always render
      render(ctx, state, level, timeRef.current, breakableTimersRef.current);

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [levelIndex, customLevel, onLevelComplete, isPaused]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-gray-900">
      {/* HUD */}
      <div className="absolute top-2 left-2 right-2 flex justify-between items-center z-10 px-4">
        <div className="flex gap-4 items-center">
          <span className="text-white text-sm font-bold bg-black/50 px-3 py-1 rounded">
            关卡 {levelIndex + 1}: {activeLevel?.name}
          </span>
          <span className="text-red-400 text-sm bg-black/50 px-3 py-1 rounded">
            💀 {deaths}
          </span>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setPortalMode(portalMode === 'A' ? 'none' : 'A')}
            className={`px-3 py-1 rounded text-sm font-bold transition-all ${
              portalMode === 'A' ? 'bg-blue-500 text-white scale-110' : 'bg-blue-500/30 text-blue-300 hover:bg-blue-500/50'
            }`}
          >
            🔵 传送门A (1)
          </button>
          <button
            onClick={() => setPortalMode(portalMode === 'B' ? 'none' : 'B')}
            className={`px-3 py-1 rounded text-sm font-bold transition-all ${
              portalMode === 'B' ? 'bg-orange-500 text-white scale-110' : 'bg-orange-500/30 text-orange-300 hover:bg-orange-500/50'
            }`}
          >
            🟠 传送门B (2)
          </button>
          <span className="text-yellow-300 text-sm bg-black/50 px-3 py-1 rounded">
            剩余: {portalsLeft}
          </span>
          <button
            onClick={() => setIsPaused(p => !p)}
            className="px-3 py-1 rounded text-sm bg-gray-600 text-white hover:bg-gray-500"
          >
            ⏸️
          </button>
          <button
            onClick={onBack}
            className="px-3 py-1 rounded text-sm bg-red-600 text-white hover:bg-red-500"
          >
            返回
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={activeLevel?.width || 1000}
        height={activeLevel?.height || 600}
        className="border-2 border-gray-700 rounded-lg cursor-crosshair max-w-full max-h-[80vh]"
        onClick={handleCanvasClick}
        onContextMenu={handleRightClick}
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Checkpoint message */}
      {showCheckpointMsg && (
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 bg-green-500/90 text-white px-6 py-3 rounded-lg text-lg font-bold animate-bounce">
          ✅ 存档点已激活！
        </div>
      )}

      {/* Pause overlay */}
      {isPaused && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
          <div className="bg-gray-800 p-8 rounded-xl text-center">
            <h2 className="text-white text-2xl font-bold mb-4">游戏暂停</h2>
            <p className="text-gray-300 mb-4">按 ESC 或点击继续</p>
            <button
              onClick={() => setIsPaused(false)}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-400 mr-2"
            >
              继续游戏
            </button>
            <button
              onClick={() => { respawn(); setIsPaused(false); }}
              className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-400 mr-2"
            >
              回到存档点
            </button>
            <button
              onClick={onBack}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-400"
            >
              返回菜单
            </button>
          </div>
        </div>
      )}

      {/* Controls help */}
      <div className="absolute bottom-2 left-2 text-gray-400 text-xs bg-black/50 px-3 py-1 rounded">
        WASD/方向键移动 | 空格跳跃 | 点击放置传送门 | 右键放置B门
      </div>
    </div>
  );
}

function updatePlayer(
  state: GameState,
  level: typeof levels[0],
  keys: Set<string>,
  breakableTimers: Map<string, number>
) {
  const player = state.player;

  // Horizontal movement
  let moveDir = 0;
  if (keys.has('a') || keys.has('arrowleft')) moveDir -= 1;
  if (keys.has('d') || keys.has('arrowright')) moveDir += 1;

  // Check if on ice
  const onIce = level.platforms.some(p => {
    if (p.type !== 'ice') return false;
    return (
      player.x + player.width > p.x &&
      player.x < p.x + p.width &&
      player.y + player.height >= p.y - 2 &&
      player.y + player.height <= p.y + 10
    );
  });

  const friction = onIce ? ICE_FRICTION : NORMAL_FRICTION;

  if (moveDir !== 0) {
    player.vx += moveDir * (onIce ? 0.3 : 1.2);
    player.facing = moveDir > 0 ? 'right' : 'left';
  }

  player.vx *= friction;
  if (Math.abs(player.vx) > MOVE_SPEED) {
    player.vx = MOVE_SPEED * Math.sign(player.vx);
  }
  if (Math.abs(player.vx) < 0.1) player.vx = 0;

  // Jump
  if ((keys.has(' ') || keys.has('w') || keys.has('arrowup')) && player.onGround) {
    player.vy = JUMP_FORCE;
    player.onGround = false;
  }

  // Gravity
  player.vy += GRAVITY;
  if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;

  // Move X
  player.x += player.vx;

  // Collision X with platforms
  for (const platform of level.platforms) {
    if (platform.type === 'breakable') {
      const key = `${platform.x}-${platform.y}`;
      if (breakableTimers.has(key) && breakableTimers.get(key)! <= 0) continue;
    }
    if (rectCollision(player.x, player.y, player.width, player.height,
      platform.x, platform.y, platform.width, platform.height)) {
      if (player.vx > 0) {
        player.x = platform.x - player.width;
      } else if (player.vx < 0) {
        player.x = platform.x + platform.width;
      }
      player.vx = 0;
    }
  }

  // Move Y
  player.y += player.vy;
  player.onGround = false;

  // Collision Y with platforms
  for (const platform of level.platforms) {
    if (platform.type === 'breakable') {
      const key = `${platform.x}-${platform.y}`;
      if (breakableTimers.has(key) && breakableTimers.get(key)! <= 0) continue;
    }
    if (rectCollision(player.x, player.y, player.width, player.height,
      platform.x, platform.y, platform.width, platform.height)) {
      if (player.vy > 0) {
        player.y = platform.y - player.height;
        player.vy = 0;
        player.onGround = true;

        // Start breakable timer
        if (platform.type === 'breakable') {
          const key = `${platform.x}-${platform.y}`;
          if (!breakableTimers.has(key)) {
            breakableTimers.set(key, 45); // frames before breaking
          }
        }
      } else if (player.vy < 0) {
        player.y = platform.y + platform.height;
        player.vy = 0;
      }
    }
  }

  // Collision with moving obstacles
  for (const obs of level.movingObstacles) {
    if (rectCollision(player.x, player.y, player.width, player.height,
      obs.x, obs.y, obs.width, obs.height)) {
      if (player.vy > 0) {
        player.y = obs.y - player.height;
        player.vy = 0;
        player.onGround = true;
      } else if (player.vy < 0) {
        player.y = obs.y + obs.height;
        player.vy = 0;
      }
    }
  }

  // Boundary check
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > level.width) player.x = level.width - player.width;

  // Fall death
  if (player.y > level.height + 50) {
    state.gameStatus = 'dead';
    setTimeout(() => {
      state.gameStatus = 'playing';
      const saveState = state.saveState;
      player.x = saveState.playerX;
      player.y = saveState.playerY;
      player.vx = 0;
      player.vy = 0;
      state.deaths++;
      breakableTimers.clear();
    }, 300);
  }

  // Portal cooldown
  if (player.portalCooldown > 0) player.portalCooldown--;
}

function updateMovingObstacles(level: typeof levels[0], time: number) {
  for (const obs of level.movingObstacles) {
    const offset = Math.sin((time * obs.moveSpeed * 0.02) + obs.phase) * obs.moveRange;
    if (obs.moveDir === 'horizontal') {
      obs.x = obs.originalX + offset;
    } else {
      obs.y = obs.originalY + offset;
    }
  }
}

function checkCollisions(state: GameState, level: typeof levels[0], breakableTimers: Map<string, number>) {
  const player = state.player;

  // Spike collision
  for (const spike of level.spikes) {
    if (rectCollision(player.x + 4, player.y + 4, player.width - 8, player.height - 8,
      spike.x, spike.y, spike.width, spike.height)) {
      state.gameStatus = 'dead';
      setTimeout(() => {
        state.gameStatus = 'playing';
        const saveState = state.saveState;
        player.x = saveState.playerX;
        player.y = saveState.playerY;
        player.vx = 0;
        player.vy = 0;
        state.deaths++;
        breakableTimers.clear();
      }, 300);
      return;
    }
  }

  // Moving obstacle side collision (kill)
  for (const obs of level.movingObstacles) {
    const overlapX = Math.min(player.x + player.width, obs.x + obs.width) - Math.max(player.x, obs.x);
    const overlapY = Math.min(player.y + player.height, obs.y + obs.height) - Math.max(player.y, obs.y);
    if (overlapX > 0 && overlapY > 0 && overlapY < 8) {
      // Landing on top is fine, handled elsewhere
    } else if (overlapX > 0 && overlapY > 0) {
      // Side collision - check if it's pushing into spikes or off screen
      const pushDir = (player.x + player.width / 2) < (obs.x + obs.width / 2) ? -1 : 1;
      player.vx = pushDir * 3;
    }
  }

  // Update breakable timers
  for (const [key, timer] of breakableTimers.entries()) {
    breakableTimers.set(key, timer - 1);
  }
}

function checkPortals(state: GameState) {
  const player = state.player;
  if (player.portalCooldown > 0) return;
  if (state.portals.length < 2) return;

  const portalA = state.portals.find(p => p.id === 'A');
  const portalB = state.portals.find(p => p.id === 'B');
  if (!portalA || !portalB) return;

  // Check if player enters portal A
  if (rectCollision(player.x, player.y, player.width, player.height,
    portalA.x, portalA.y, portalA.width, portalA.height)) {
    player.x = portalB.x + portalB.width / 2 - player.width / 2;
    player.y = portalB.y + portalB.height / 2 - player.height / 2;
    player.portalCooldown = PORTAL_COOLDOWN;
    player.vy = Math.min(player.vy, -5); // Give a small boost out
  }

  // Check if player enters portal B
  if (rectCollision(player.x, player.y, player.width, player.height,
    portalB.x, portalB.y, portalB.width, portalB.height)) {
    player.x = portalA.x + portalA.width / 2 - player.width / 2;
    player.y = portalA.y + portalA.height / 2 - player.height / 2;
    player.portalCooldown = PORTAL_COOLDOWN;
    player.vy = Math.min(player.vy, -5);
  }
}

function checkCheckpoints(state: GameState, level: typeof levels[0]): boolean {
  const player = state.player;
  for (let i = 0; i < level.checkpoints.length; i++) {
    const cp = level.checkpoints[i];
    if (!cp.activated && rectCollision(player.x, player.y, player.width, player.height,
      cp.x - 10, cp.y - 10, 40, 40)) {
      cp.activated = true;
      state.saveState = {
        playerX: cp.x,
        playerY: cp.y - 30,
        checkpointIndex: i,
        portals: [...state.portals],
      };
      return true;
    }
  }
  return false;
}

function checkGoal(state: GameState, level: typeof levels[0], onLevelComplete: () => void) {
  const player = state.player;
  const goal = level.goal;
  if (rectCollision(player.x, player.y, player.width, player.height,
    goal.x, goal.y, goal.width, goal.height)) {
    state.gameStatus = 'won';
    setTimeout(() => {
      onLevelComplete();
    }, 1000);
  }
}

function rectCollision(
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number
): boolean {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  level: typeof levels[0],
  time: number,
  breakableTimers: Map<string, number>
) {
  const { player, portals } = state;

  // Clear
  ctx.fillStyle = level.bgColor;
  ctx.fillRect(0, 0, level.width, level.height);

  // Draw background grid
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < level.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, level.height);
    ctx.stroke();
  }
  for (let y = 0; y < level.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(level.width, y);
    ctx.stroke();
  }

  // Draw spikes
  for (const spike of level.spikes) {
    ctx.fillStyle = '#ff3333';
    const spikeCount = Math.floor(spike.width / 15);
    for (let i = 0; i < spikeCount; i++) {
      const sx = spike.x + i * 15;
      ctx.beginPath();
      if (spike.direction === 'up') {
        ctx.moveTo(sx, spike.y + spike.height);
        ctx.lineTo(sx + 7, spike.y);
        ctx.lineTo(sx + 14, spike.y + spike.height);
      } else {
        ctx.moveTo(sx, spike.y);
        ctx.lineTo(sx + 7, spike.y + spike.height);
        ctx.lineTo(sx + 14, spike.y);
      }
      ctx.fill();
    }
  }

  // Draw platforms
  for (const platform of level.platforms) {
    if (platform.type === 'breakable') {
      const key = `${platform.x}-${platform.y}`;
      const timer = breakableTimers.get(key);
      if (timer !== undefined && timer <= 0) continue;
      
      const alpha = timer !== undefined ? Math.max(0.3, timer / 45) : 1;
      ctx.fillStyle = `rgba(200, 150, 100, ${alpha})`;
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.strokeStyle = `rgba(255, 200, 150, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
      
      // Crack effect
      if (timer !== undefined && timer < 30) {
        ctx.strokeStyle = `rgba(100, 50, 0, ${1 - timer / 30})`;
        ctx.beginPath();
        ctx.moveTo(platform.x + platform.width * 0.3, platform.y);
        ctx.lineTo(platform.x + platform.width * 0.5, platform.y + platform.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(platform.x + platform.width * 0.7, platform.y);
        ctx.lineTo(platform.x + platform.width * 0.6, platform.y + platform.height);
        ctx.stroke();
      }
    } else if (platform.type === 'ice') {
      ctx.fillStyle = 'rgba(150, 220, 255, 0.7)';
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.strokeStyle = 'rgba(200, 240, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
      // Ice shine
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(platform.x + 5, platform.y + 2, platform.width * 0.3, 3);
    } else if (platform.type === 'moving') {
      ctx.fillStyle = '#8855cc';
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.strokeStyle = '#aa77ee';
      ctx.lineWidth = 2;
      ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    } else {
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.strokeStyle = '#718096';
      ctx.lineWidth = 2;
      ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
      // Top highlight
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(platform.x, platform.y, platform.width, 3);
    }
  }

  // Draw moving obstacles
  for (const obs of level.movingObstacles) {
    ctx.fillStyle = '#cc4444';
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    ctx.strokeStyle = '#ff6666';
    ctx.lineWidth = 1;
    ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    // Warning stripes
    ctx.fillStyle = 'rgba(255, 200, 0, 0.5)';
    for (let i = 0; i < obs.width; i += 10) {
      ctx.fillRect(obs.x + i, obs.y, 5, obs.height);
    }
  }

  // Draw checkpoints
  for (const cp of level.checkpoints) {
    if (cp.activated) {
      ctx.fillStyle = '#00ff88';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 10;
    } else {
      ctx.fillStyle = '#888888';
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
    // Flag pole
    ctx.fillRect(cp.x + 8, cp.y - 20, 4, 40);
    // Flag
    ctx.beginPath();
    ctx.moveTo(cp.x + 12, cp.y - 20);
    ctx.lineTo(cp.x + 30, cp.y - 12);
    ctx.lineTo(cp.x + 12, cp.y - 4);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Draw goal
  const goal = level.goal;
  const goalPulse = Math.sin(time * 0.05) * 0.3 + 0.7;
  ctx.fillStyle = `rgba(255, 215, 0, ${goalPulse})`;
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 15;
  ctx.fillRect(goal.x, goal.y, goal.width, goal.height);
  ctx.shadowBlur = 0;
  // Star on goal
  ctx.fillStyle = '#fff';
  ctx.font = '20px Arial';
  ctx.fillText('⭐', goal.x + 10, goal.y + 32);

  // Draw portals
  for (const portal of portals) {
    const pulse = Math.sin(time * 0.08) * 3;
    ctx.beginPath();
    ctx.arc(
      portal.x + portal.width / 2,
      portal.y + portal.height / 2,
      portal.width / 2 + pulse,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = portal.color + '44';
    ctx.fill();
    ctx.strokeStyle = portal.color;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner swirl
    ctx.beginPath();
    ctx.arc(
      portal.x + portal.width / 2,
      portal.y + portal.height / 2,
      portal.width / 4,
      time * 0.1,
      time * 0.1 + Math.PI * 1.5
    );
    ctx.strokeStyle = portal.color + 'aa';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    ctx.fillStyle = portal.color;
    ctx.font = 'bold 12px Arial';
    ctx.fillText(portal.id, portal.x + portal.width / 2 - 4, portal.y - 5);
  }

  // Draw player
  const px = player.x;
  const py = player.y;

  // Player body
  ctx.fillStyle = '#44ddff';
  ctx.shadowColor = '#44ddff';
  ctx.shadowBlur = 5;
  ctx.fillRect(px + 4, py + 8, player.width - 8, player.height - 8);
  ctx.shadowBlur = 0;

  // Player head
  ctx.fillStyle = '#66eeff';
  ctx.fillRect(px + 6, py, player.width - 12, 12);

  // Eyes
  ctx.fillStyle = '#fff';
  const eyeX = player.facing === 'right' ? px + 14 : px + 6;
  ctx.fillRect(eyeX, py + 3, 4, 4);
  ctx.fillStyle = '#000';
  ctx.fillRect(eyeX + 1, py + 4, 2, 2);

  // Death flash
  if (state.gameStatus === 'dead') {
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.fillRect(0, 0, level.width, level.height);
  }

  // Win effect
  if (state.gameStatus === 'won') {
    ctx.fillStyle = `rgba(255, 215, 0, ${Math.sin(time * 0.1) * 0.2 + 0.2})`;
    ctx.fillRect(0, 0, level.width, level.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎉 过关！', level.width / 2, level.height / 2);
    ctx.textAlign = 'left';
  }
}
