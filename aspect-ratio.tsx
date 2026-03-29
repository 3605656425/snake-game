import React from 'react';
import { useGame } from '../hooks/useGame';

export const GameCanvas: React.FC = () => {
  const { canvasRef, gameState, CELL_SIZE, COLS, ROWS } = useGame();

  return (
    <div className="game-container">
      {/* UI Panel */}
      <div className="ui-panel">
        <div className="score-display">
          <div>
            <span style={{ color: '#ffff00' }}>SCORE</span>
            <div>{gameState.score.toString().padStart(6, '0')}</div>
          </div>
          <div>
            <span style={{ color: '#ffff00' }}>HIGH</span>
            <div>{gameState.highScore.toString().padStart(6, '0')}</div>
          </div>
        </div>
        <div className="level-indicator">
          LEVEL {gameState.level}
        </div>
      </div>

      {/* Game Board */}
      <div className="game-board" style={{ width: COLS * CELL_SIZE, height: ROWS * CELL_SIZE }}>
        <canvas
          ref={canvasRef}
          width={COLS * CELL_SIZE}
          height={ROWS * CELL_SIZE}
          className="game-canvas"
        />

        {/* Start Screen */}
        {!gameState.gameStarted && (
          <div className="start-screen">
            <h1 className="game-title">PAC-MAN</h1>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              <span className="ghost-color-blinky">●</span>
              <span className="ghost-color-pinky">●</span>
              <span className="ghost-color-inky">●</span>
              <span className="ghost-color-clyde">●</span>
            </div>
            <p className="start-text">PRESS SPACE TO START</p>
            <div className="controls-info">
              <div>ARROWS / WASD - Move</div>
              <div>P - Pause</div>
            </div>
          </div>
        )}

        {/* Ready Text */}
        {gameState.gameStarted && gameState.ready && (
          <div className="ready-text">READY!</div>
        )}

        {/* Pause Screen */}
        {gameState.paused && (
          <div className="pause-screen">
            <div className="pause-text">PAUSED</div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState.gameOver && (
          <div className="game-over-screen">
            <div className="game-over-text">GAME OVER</div>
            <div className="final-score">SCORE: {gameState.score}</div>
            {gameState.score >= gameState.highScore && gameState.score > 0 && (
              <div className="high-score">NEW HIGH SCORE!</div>
            )}
            <p className="start-text">PRESS SPACE TO RESTART</p>
          </div>
        )}
      </div>

      {/* Lives Display */}
      <div className="ui-panel" style={{ marginTop: '10px' }}>
        <div className="lives-display">
          {Array.from({ length: gameState.lives }).map((_, i) => (
            <div key={i} className="life-icon" />
          ))}
        </div>
        <div style={{ fontSize: '10px', color: '#888' }}>
          {gameState.dots.size + gameState.powers.size} DOTS LEFT
        </div>
      </div>

      {/* Mobile Controls */}
      <div className="mobile-controls">
        <button 
          className="mobile-btn up"
          onTouchStart={() => {}}
          onClick={() => {}}
        >↑</button>
        <button 
          className="mobile-btn left"
          onTouchStart={() => {}}
          onClick={() => {}}
        >←</button>
        <button 
          className="mobile-btn right"
          onTouchStart={() => {}}
          onClick={() => {}}
        >→</button>
        <button 
          className="mobile-btn down"
          onTouchStart={() => {}}
          onClick={() => {}}
        >↓</button>
      </div>
    </div>
  );
};
