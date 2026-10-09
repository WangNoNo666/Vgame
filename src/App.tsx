import { useState, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import LevelEditor from './components/LevelEditor';
import { levels } from './game/levels';
import { LevelData } from './game/types';

type Screen = 'menu' | 'levels' | 'game' | 'editor' | 'customGame';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [completedLevels, setCompletedLevels] = useState<Set<number>>(new Set());
  const [customLevel, setCustomLevel] = useState<LevelData | null>(null);

  const handleLevelComplete = useCallback(() => {
    setCompletedLevels(prev => {
      const next = new Set(prev);
      next.add(currentLevel);
      return next;
    });
    setTimeout(() => {
      if (currentLevel < levels.length - 1) {
        setCurrentLevel(prev => prev + 1);
      } else {
        setScreen('levels');
      }
    }, 1500);
  }, [currentLevel]);

  const startLevel = (idx: number) => {
    setCurrentLevel(idx);
    setScreen('game');
  };

  const playCustomLevel = (levelData: LevelData) => {
    setCustomLevel(levelData);
    setScreen('customGame');
  };

  if (screen === 'game') {
    return (
      <GameCanvas
        levelIndex={currentLevel}
        onLevelComplete={handleLevelComplete}
        onBack={() => setScreen('levels')}
      />
    );
  }

  if (screen === 'customGame' && customLevel) {
    return (
      <GameCanvas
        levelIndex={0}
        customLevel={customLevel}
        onLevelComplete={() => {
          alert('🎉 恭喜通关自制关卡！');
          setScreen('editor');
        }}
        onBack={() => setScreen('editor')}
      />
    );
  }

  if (screen === 'editor') {
    return (
      <LevelEditor
        onPlay={playCustomLevel}
        onBack={() => setScreen('menu')}
      />
    );
  }

  if (screen === 'levels') {
    return (
      <div className="w-full h-full bg-gradient-to-b from-gray-900 via-indigo-950 to-gray-900 flex flex-col items-center overflow-auto p-6">
        <h2 className="text-white text-3xl font-bold mb-6">🗺️ 选择关卡</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-4xl">
          {levels.map((level, idx) => (
            <button
              key={level.id}
              onClick={() => startLevel(idx)}
              className={`relative p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                completedLevels.has(idx)
                  ? 'border-green-500 bg-green-500/20'
                  : idx === 0 || completedLevels.has(idx - 1)
                  ? 'border-blue-500 bg-blue-500/20 hover:border-blue-400'
                  : 'border-gray-600 bg-gray-800/50 opacity-60'
              }`}
            >
              <div className="text-3xl mb-2">
                {completedLevels.has(idx) ? '⭐' : idx < 3 ? '🟢' : idx < 6 ? '🟡' : idx < 9 ? '🔴' : '💀'}
              </div>
              <div className="text-white text-sm font-bold">{level.name}</div>
              <div className="text-gray-400 text-xs mt-1">{level.description}</div>
              <div className="text-gray-500 text-xs mt-1">
                难度: {'★'.repeat(Math.min(idx + 1, 10))}{'☆'.repeat(Math.max(10 - idx - 1, 0))}
              </div>
              {completedLevels.has(idx) && (
                <div className="absolute top-1 right-1 text-green-400 text-xs">✓</div>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => setScreen('menu')}
          className="mt-6 px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
        >
          返回主菜单
        </button>
      </div>
    );
  }

  // Main menu
  return (
    <div className="w-full h-full bg-gradient-to-b from-gray-900 via-purple-950 to-gray-900 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-10"
            style={{
              width: `${Math.random() * 100 + 50}px`,
              height: `${Math.random() * 100 + 50}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `radial-gradient(circle, ${i % 2 === 0 ? '#00bfff' : '#ff6b00'}, transparent)`,
              animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Title */}
      <div className="relative z-10 text-center mb-12">
        <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400 mb-4">
          传送门闯关
        </h1>
        <p className="text-gray-400 text-lg">放置传送门 · 跳跃闯关 · 自制关卡</p>
        <div className="flex gap-2 justify-center mt-4">
          <div className="w-8 h-8 rounded-full bg-blue-500/50 animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-white/50 mt-3" />
          <div className="w-2 h-2 rounded-full bg-white/50 mt-3" />
          <div className="w-2 h-2 rounded-full bg-white/50 mt-3" />
          <div className="w-8 h-8 rounded-full bg-orange-500/50 animate-pulse" />
        </div>
      </div>

      {/* Menu buttons */}
      <div className="relative z-10 flex flex-col gap-4 w-72">
        <button
          onClick={() => setScreen('levels')}
          className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl text-lg font-bold 
                     hover:from-blue-500 hover:to-blue-400 transition-all hover:scale-105 shadow-lg shadow-blue-500/30"
        >
          🎮 开始闯关
        </button>
        <button
          onClick={() => setScreen('editor')}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl text-lg font-bold 
                     hover:from-purple-500 hover:to-purple-400 transition-all hover:scale-105 shadow-lg shadow-purple-500/30"
        >
          🎨 自制关卡
        </button>
        <button
          onClick={() => setScreen('levels')}
          className="px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl text-lg font-bold 
                     hover:from-orange-500 hover:to-orange-400 transition-all hover:scale-105 shadow-lg shadow-orange-500/30"
        >
          📖 操作说明
        </button>
      </div>

      {/* Instructions panel */}
      <div className="relative z-10 mt-8 bg-black/40 rounded-xl p-6 max-w-lg border border-gray-700">
        <h3 className="text-white font-bold mb-3 text-center">🎯 游戏说明</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="text-gray-300">
            <span className="text-blue-400 font-bold">移动:</span> WASD / 方向键
          </div>
          <div className="text-gray-300">
            <span className="text-blue-400 font-bold">跳跃:</span> 空格 / W / ↑
          </div>
          <div className="text-gray-300">
            <span className="text-blue-400 font-bold">传送门A:</span> 点击按钮+左键
          </div>
          <div className="text-gray-300">
            <span className="text-blue-400 font-bold">传送门B:</span> 点击按钮+左键/右键
          </div>
          <div className="text-gray-300">
            <span className="text-green-400 font-bold">存档点:</span> 自动激活
          </div>
          <div className="text-gray-300">
            <span className="text-yellow-400 font-bold">目标:</span> 到达⭐旗帜
          </div>
        </div>
        <p className="text-gray-400 text-xs mt-3 text-center">
          💡 提示：传送门可以连接两个位置，进入一个会从另一个出来！善用传送门克服难关！
        </p>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 text-gray-600 text-xs">
        共 {levels.length} 个关卡 | 难度递进 | 最后超难！
      </div>
    </div>
  );
}


