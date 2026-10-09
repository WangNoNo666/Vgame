import { useState, useRef, useCallback, useEffect } from 'react';
import { LevelData, Platform, Spike, MovingObstacle, Checkpoint, Goal } from '../game/types';

interface LevelEditorProps {
  onPlay: (levelData: LevelData) => void;
  onBack: () => void;
}

type EditorTool = 'platform' | 'spike' | 'checkpoint' | 'goal' | 'start' | 'obstacle' | 'ice' | 'breakable' | 'eraser';

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;
const GRID_SIZE = 20;

export default function LevelEditor({ onPlay, onBack }: LevelEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<EditorTool>('platform');
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [spikes, setSpikes] = useState<Spike[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [movingObs, setMovingObs] = useState<MovingObstacle[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [playerStart, setPlayerStart] = useState({ x: 50, y: 500 });
  const [levelName, setLevelName] = useState('我的关卡');
  const [portalLimit, setPortalLimit] = useState(4);
  const isDrawing = useRef(false);
  const drawStart = useRef({ x: 0, y: 0 });

  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.round(((e.clientX - rect.left) * scaleX) / GRID_SIZE) * GRID_SIZE;
    const y = Math.round(((e.clientY - rect.top) * scaleY) / GRID_SIZE) * GRID_SIZE;
    return { x, y };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    isDrawing.current = true;
    drawStart.current = { x, y };

    if (tool === 'start') {
      setPlayerStart({ x, y });
    } else if (tool === 'checkpoint') {
      setCheckpoints(prev => [...prev, { x, y, activated: false }]);
    } else if (tool === 'goal') {
      setGoal({ x, y, width: 40, height: 50 });
    } else if (tool === 'spike') {
      setSpikes(prev => [...prev, { x, y, width: 60, height: 20, direction: 'up' }]);
    } else if (tool === 'obstacle') {
      setMovingObs(prev => [...prev, {
        x, y, width: 60, height: 15,
        moveRange: 80, moveSpeed: 2, moveDir: 'horizontal',
        originalX: x, originalY: y, phase: 0,
      }]);
    } else if (tool === 'eraser') {
      // Remove items near click
      setPlatforms(prev => prev.filter(p =>
        !(x >= p.x && x <= p.x + p.width && y >= p.y && y <= p.y + p.height)
      ));
      setSpikes(prev => prev.filter(s =>
        !(x >= s.x && x <= s.x + s.width && y >= s.y && y <= s.y + s.height)
      ));
      setCheckpoints(prev => prev.filter(c =>
        !(x >= c.x - 10 && x <= c.x + 30 && y >= c.y - 20 && y <= c.y + 20)
      ));
      setMovingObs(prev => prev.filter(o =>
        !(x >= o.x && x <= o.x + o.width && y >= o.y && y <= o.y + o.height)
      ));
    }
  }, [tool, getCanvasCoords]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (tool === 'platform' || tool === 'ice' || tool === 'breakable') {
      const { x, y } = getCanvasCoords(e);
      const sx = Math.min(drawStart.current.x, x);
      const sy = Math.min(drawStart.current.y, y);
      const w = Math.max(Math.abs(x - drawStart.current.x), GRID_SIZE);
      const h = Math.max(Math.abs(y - drawStart.current.y), GRID_SIZE);

      const type = tool === 'ice' ? 'ice' : tool === 'breakable' ? 'breakable' : 'normal';
      setPlatforms(prev => [...prev, { x: sx, y: sy, width: w, height: h, type }]);
    }
  }, [tool, getCanvasCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    // Preview drawing handled in render
  }, []);

  // Render editor canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Platforms
    for (const p of platforms) {
      if (p.type === 'ice') {
        ctx.fillStyle = 'rgba(150, 220, 255, 0.7)';
      } else if (p.type === 'breakable') {
        ctx.fillStyle = 'rgba(200, 150, 100, 0.8)';
      } else {
        ctx.fillStyle = '#4a5568';
      }
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.strokeStyle = p.type === 'ice' ? '#88ddff' : p.type === 'breakable' ? '#cc9966' : '#718096';
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x, p.y, p.width, p.height);
    }

    // Spikes
    for (const s of spikes) {
      ctx.fillStyle = '#ff3333';
      const count = Math.floor(s.width / 15);
      for (let i = 0; i < count; i++) {
        ctx.beginPath();
        ctx.moveTo(s.x + i * 15, s.y + s.height);
        ctx.lineTo(s.x + i * 15 + 7, s.y);
        ctx.lineTo(s.x + i * 15 + 14, s.y + s.height);
        ctx.fill();
      }
    }

    // Moving obstacles
    for (const o of movingObs) {
      ctx.fillStyle = '#cc4444';
      ctx.fillRect(o.x, o.y, o.width, o.height);
      ctx.strokeStyle = '#ff6666';
      ctx.strokeRect(o.x, o.y, o.width, o.height);
      // Arrow showing direction
      ctx.fillStyle = '#ffaa00';
      ctx.font = '10px Arial';
      ctx.fillText(o.moveDir === 'horizontal' ? '↔' : '↕', o.x + o.width / 2 - 5, o.y - 3);
    }

    // Checkpoints
    for (const c of checkpoints) {
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(c.x + 8, c.y - 20, 4, 40);
      ctx.beginPath();
      ctx.moveTo(c.x + 12, c.y - 20);
      ctx.lineTo(c.x + 30, c.y - 12);
      ctx.lineTo(c.x + 12, c.y - 4);
      ctx.fill();
    }

    // Goal
    if (goal) {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
      ctx.fillRect(goal.x, goal.y, goal.width, goal.height);
      ctx.fillStyle = '#fff';
      ctx.font = '20px Arial';
      ctx.fillText('⭐', goal.x + 10, goal.y + 32);
    }

    // Player start
    ctx.fillStyle = '#44ddff';
    ctx.fillRect(playerStart.x + 4, playerStart.y + 8, 16, 24);
    ctx.fillStyle = '#66eeff';
    ctx.fillRect(playerStart.x + 6, playerStart.y, 12, 12);
    ctx.fillStyle = '#fff';
    ctx.font = '10px Arial';
    ctx.fillText('起点', playerStart.x - 5, playerStart.y - 5);
  }, [platforms, spikes, checkpoints, movingObs, goal, playerStart]);

  const handlePlay = () => {
    if (!goal) {
      alert('请放置终点旗帜！');
      return;
    }
    const levelData: LevelData = {
      id: 999,
      name: levelName,
      description: '自制关卡',
      platforms,
      spikes,
      checkpoints,
      goal,
      playerStart,
      movingObstacles: movingObs,
      portalLimit,
      bgColor: '#1a1a2e',
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    };
    onPlay(levelData);
  };

  const clearAll = () => {
    setPlatforms([]);
    setSpikes([]);
    setCheckpoints([]);
    setMovingObs([]);
    setGoal(null);
    setPlayerStart({ x: 50, y: 500 });
  };

  const tools: { id: EditorTool; label: string; icon: string; color: string }[] = [
    { id: 'platform', label: '普通平台', icon: '▪️', color: 'bg-gray-600' },
    { id: 'ice', label: '冰面平台', icon: '🧊', color: 'bg-cyan-700' },
    { id: 'breakable', label: '易碎平台', icon: '💔', color: 'bg-amber-700' },
    { id: 'spike', label: '尖刺', icon: '🔺', color: 'bg-red-700' },
    { id: 'obstacle', label: '移动障碍', icon: '⚡', color: 'bg-red-600' },
    { id: 'checkpoint', label: '存档点', icon: '🚩', color: 'bg-green-700' },
    { id: 'goal', label: '终点', icon: '⭐', color: 'bg-yellow-600' },
    { id: 'start', label: '起点', icon: '🏃', color: 'bg-blue-600' },
    { id: 'eraser', label: '橡皮擦', icon: '🧹', color: 'bg-purple-700' },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white text-xl font-bold">🎨 关卡编辑器</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={levelName}
            onChange={(e) => setLevelName(e.target.value)}
            className="px-3 py-1 bg-gray-700 text-white rounded text-sm"
            placeholder="关卡名称"
          />
          <label className="text-gray-300 text-sm flex items-center gap-1">
            传送门数:
            <input
              type="number"
              value={portalLimit}
              onChange={(e) => setPortalLimit(parseInt(e.target.value) || 2)}
              min={1}
              max={10}
              className="w-12 px-1 py-1 bg-gray-700 text-white rounded text-sm"
            />
          </label>
          <button
            onClick={handlePlay}
            className="px-4 py-1 bg-green-500 text-white rounded text-sm font-bold hover:bg-green-400"
          >
            ▶️ 试玩
          </button>
          <button
            onClick={clearAll}
            className="px-4 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-500"
          >
            🗑️ 清空
          </button>
          <button
            onClick={onBack}
            className="px-4 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-500"
          >
            返回
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-3 min-h-0">
        {/* Tool palette */}
        <div className="flex flex-col gap-1 w-32">
          {tools.map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`px-2 py-1.5 rounded text-xs font-medium text-left transition-all ${
                tool === t.id
                  ? `${t.color} text-white ring-2 ring-white/50 scale-105`
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="border-2 border-gray-600 rounded cursor-crosshair"
            style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 160px)' }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="text-gray-400 text-xs mt-2 text-center">
        提示：点击或拖拽放置平台 | 点击放置其他元素 | 使用橡皮擦删除 | 放置起点和终点后点击试玩
      </div>
    </div>
  );
}
