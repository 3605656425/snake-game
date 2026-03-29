import React from 'react';
import { useSnake } from '../hooks/useSnake';

export const SnakeGame: React.FC = () => {
  const { 
    canvasRef, 
    gameState, 
    setSpeed, 
    setDirection,
    GRID_WIDTH, 
    GRID_HEIGHT, 
    CELL_SIZE 
  } = useSnake();

  const handleDirection = (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (!gameState.gameStarted || gameState.gameOver || gameState.paused) return;
    setDirection(direction);
  };

  return (
    <div className="game-wrapper">
      {/* Header */}
      <div className="game-header">
        <div className="score-box">
          <div className="score-label">SCORE</div>
          <div className="score-value">{gameState.score.toString().padStart(4, '0')}</div>
        </div>
        <div className="score-box">
          <div className="score-label">HIGH</div>
          <div className="score-value">{gameState.highScore.toString().padStart(4, '0')}</div>
        </div>
        <div className="score-box">
          <div className="score-label">LENGTH</div>
          <div className="score-value">{gameState.snake.length}</div>
        </div>
      </div>

      {/* Game Board */}
      <div 
        className="game-board" 
        style={{ width: GRID_WIDTH * CELL_SIZE, height: GRID_HEIGHT * CELL_SIZE }}
      >
        <canvas
          ref={canvasRef}
          width={GRID_WIDTH * CELL_SIZE}
          height={GRID_HEIGHT * CELL_SIZE}
          className="game-canvas"
        />

        {/* Start Screen */}
        {!gameState.gameStarted && (
          <div className="overlay">
            <h1 className="game-title">SNAKE</h1>
            
            {/* Speed Selector */}
            <div className="speed-selector">
              <button 
                className={`speed-btn ${gameState.speed === 150 ? 'active' : ''}`}
                onClick={() => setSpeed('slow')}
              >
                SLOW
              </button>
              <button 
                className={`speed-btn ${gameState.speed === 100 ? 'active' : ''}`}
                onClick={() => setSpeed('normal')}
              >
                NORMAL
              </button>
              <button 
                className={`speed-btn ${gameState.speed === 70 ? 'active' : ''}`}
                onClick={() => setSpeed('fast')}
              >
                FAST
              </button>
            </div>
            
            <p className="blink-text">PRESS SPACE TO START</p>
            
            <div className="controls-info">
              <div><span className="key">↑</span><span className="key">↓</span><span className="key">←</span><span className="key">→</span> or <span className="key">W</span><span className="key">A</span><span className="key">S</span><span className="key">D</span> to Move</div>
              <div><span className="key">P</span> to Pause</div>
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState.gameStarted && gameState.gameOver && (
          <div className="overlay">
            <h2 className="game-over-title">GAME OVER</h2>
            <div className="final-score">SCORE: {gameState.score}</div>
            {gameState.score >= gameState.highScore && gameState.score > 0 && (
              <div className="high-score">NEW HIGH SCORE!</div>
            )}
            <p className="blink-text">PRESS SPACE TO RESTART</p>
          </div>
        )}

        {/* Pause Screen */}
        {gameState.gameStarted && gameState.paused && !gameState.gameOver && (
          <div className="overlay">
            <h2 className="pause-title">PAUSED</h2>
            <p className="blink-text">PRESS P TO RESUME</p>
          </div>
        )}
      </div>

      {/* Mobile Controls */}
      <div className="mobile-controls">
        <div className="dpad">
          <button 
            className="dpad-btn up"
            onTouchStart={(e) => { e.preventDefault(); handleDirection('UP'); }}
            onClick={() => handleDirection('UP')}
          >↑</button>
          <button 
            className="dpad-btn left"
            onTouchStart={(e) => { e.preventDefault(); handleDirection('LEFT'); }}
            onClick={() => handleDirection('LEFT')}
          >←</button>
          <button 
            className="dpad-btn right"
            onTouchStart={(e) => { e.preventDefault(); handleDirection('RIGHT'); }}
            onClick={() => handleDirection('RIGHT')}
          >→</button>
          <button 
            className="dpad-btn down"
            onTouchStart={(e) => { e.preventDefault(); handleDirection('DOWN'); }}
            onClick={() => handleDirection('DOWN')}
          >↓</button>
        </div>
      </div>
    </div>
  );
};
