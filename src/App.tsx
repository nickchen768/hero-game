import { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import type { GameState } from './types';

// Replace enum with const object to satisfy strict TypeScript rules
const AppState = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  GAME_OVER: 'GAME_OVER',
  VICTORY: 'VICTORY'
} as const;
type AppState = typeof AppState[keyof typeof AppState];

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.MENU);
  const [finalStats, setFinalStats] = useState<GameState | null>(null);

  const startGame = () => setAppState(AppState.PLAYING);
  
  const handleGameOver = (stats: GameState) => {
    setFinalStats(stats);
    setAppState(AppState.GAME_OVER);
  };

  const handleVictory = (stats: GameState) => {
    setFinalStats(stats);
    setAppState(AppState.VICTORY);
  };

  return (
    <div className="h-full w-full bg-slate-900 flex flex-col items-center justify-center font-sans overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-950 -z-10"></div>

      {appState === AppState.MENU && (
        <div className="flex flex-col items-center justify-center w-full h-full p-4 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 mb-6 text-center drop-shadow-lg">
            威盾英雄<br/><span className="text-2xl md:text-4xl text-white/80">環境保衛戰</span>
          </h1>

          <div className="bg-white/10 backdrop-blur-md p-6 md:p-8 rounded-2xl shadow-2xl text-center max-w-lg w-full border border-white/10">
            <div className="mb-6 text-blue-100 text-base md:text-lg space-y-2">
              <p>我們的家園正被害蟲入侵！</p>
              <p>扮演 <span className="text-yellow-400 font-bold">威盾超人</span>，清除蒼蠅、螞蟻與老鼠。</p>
            </div>
            
            {/* Desktop Instructions */}
            <div className="hidden md:grid grid-cols-2 gap-4 text-left text-sm text-gray-300 bg-black/40 p-4 rounded-lg mb-8">
              <div>
                  <strong className="text-white block mb-2 border-b border-white/20 pb-1">🎮 電腦操作</strong>
                  <ul className="space-y-1">
                      <li><span className="text-yellow-400">方向鍵</span> 移動</li>
                      <li><span className="text-yellow-400">Space</span> 跳躍</li>
                      <li><span className="text-yellow-400">↓ + Space</span> 下跳</li>
                  </ul>
              </div>
              <div>
                  <strong className="text-white block mb-2 border-b border-white/20 pb-1">⚔️ 攻擊技能</strong>
                  <ul className="space-y-1">
                      <li><span className="text-red-400">Z</span> 普攻連擊</li>
                      <li><span className="text-cyan-400">X</span> 飛盾 (耗MP)</li>
                      <li><span className="text-purple-400">C</span> 衝刺 (耗MP)</li>
                  </ul>
              </div>
            </div>
            
            {/* Mobile Instructions */}
            <div className="md:hidden text-left text-sm text-gray-300 bg-black/40 p-4 rounded-lg mb-8 border-l-4 border-blue-500">
              <strong className="text-white block mb-1">📱 手機版操作</strong>
              <p>遊戲開始後，使用螢幕下方的<br/>「虛擬搖桿」移動與「按鈕」攻擊。</p>
            </div>

            <button 
              onClick={startGame}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-bold rounded-xl text-xl shadow-lg border-b-4 border-blue-900 active:border-b-0 active:translate-y-1 transition-all"
            >
              開始保衛戰！
            </button>
          </div>
        </div>
      )}

      {appState === AppState.PLAYING && (
        <GameCanvas onGameOver={handleGameOver} onVictory={handleVictory} />
      )}

      {(appState === AppState.GAME_OVER || appState === AppState.VICTORY) && finalStats && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-800 p-6 md:p-8 rounded-2xl shadow-2xl text-center max-w-lg w-full border border-white/10 relative overflow-hidden">
             {/* Background glow */}
             <div className={`absolute top-0 left-0 w-full h-2 ${appState === AppState.VICTORY ? 'bg-yellow-400' : 'bg-red-500'}`}></div>

              <h2 className={`text-4xl md:text-5xl font-black mb-2 ${appState === AppState.VICTORY ? 'text-yellow-400' : 'text-red-500'}`}>
                  {appState === AppState.VICTORY ? 'MISSION CLEAR!' : 'GAME OVER'}
              </h2>
              <p className="text-white/60 mb-6">{appState === AppState.VICTORY ? '環境已淨化完畢' : '威盾超人倒下了...'}</p>
              
              <div className="space-y-4 mb-8 text-white">
                  <div className="text-3xl font-mono bg-black/40 p-4 rounded-lg border border-white/5">
                      <span className="text-xs text-gray-400 block mb-1">FINAL SCORE</span>
                      {finalStats.score}
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="bg-slate-700/50 p-2 rounded flex flex-col items-center">
                          <div className="text-2xl mb-1">🪰</div>
                          <span className="text-gray-300">蒼蠅</span>
                          <span className="font-bold text-white">{finalStats.enemiesKilled.flies}</span>
                      </div>
                      <div className="bg-slate-700/50 p-2 rounded flex flex-col items-center">
                          <div className="text-2xl mb-1">🐜</div>
                          <span className="text-gray-300">螞蟻</span>
                          <span className="font-bold text-white">{finalStats.enemiesKilled.ants}</span>
                      </div>
                      <div className="bg-slate-700/50 p-2 rounded flex flex-col items-center">
                          <div className="text-2xl mb-1">🐀</div>
                          <span className="text-gray-300">老鼠</span>
                          <span className="font-bold text-white">{finalStats.enemiesKilled.rats}</span>
                      </div>
                  </div>
              </div>
              <button 
                  onClick={() => setAppState(AppState.MENU)}
                  className="w-full py-3 bg-white text-slate-900 font-bold rounded-lg hover:bg-gray-200 transition-colors shadow-lg"
              >
                  回到標題
              </button>
          </div>
        </div>
      )}
    </div>
  );
}