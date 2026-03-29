import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  Direction,
  GhostType,
  Position,
  GridPosition,
  Pacman,
  Ghost,
  GameState
} from '../types/game';
import {
  MAZE_LAYOUT,
  INITIAL_CONFIG,
  GHOST_COLORS
} from '../types/game';

const CELL_SIZE = 20;
const COLS = 28;
const ROWS = 31;

// Ghost starting positions
const GHOST_START_POSITIONS: Record<GhostType, Position> = {
  blinky: { x: 13 * CELL_SIZE + CELL_SIZE / 2, y: 11 * CELL_SIZE + CELL_SIZE / 2 },
  pinky: { x: 13 * CELL_SIZE + CELL_SIZE / 2, y: 14 * CELL_SIZE + CELL_SIZE / 2 },
  inky: { x: 11 * CELL_SIZE + CELL_SIZE / 2, y: 14 * CELL_SIZE + CELL_SIZE / 2 },
  clyde: { x: 15 * CELL_SIZE + CELL_SIZE / 2, y: 14 * CELL_SIZE + CELL_SIZE / 2 }
};

// Ghost scatter targets (corners)
const SCATTER_TARGETS: Record<GhostType, Position> = {
  blinky: { x: 26 * CELL_SIZE, y: 0 },
  pinky: { x: 2 * CELL_SIZE, y: 0 },
  inky: { x: 26 * CELL_SIZE, y: 30 * CELL_SIZE },
  clyde: { x: 2 * CELL_SIZE, y: 30 * CELL_SIZE }
};

// Ghost house center
const GHOST_HOUSE_CENTER = { x: 13 * CELL_SIZE + CELL_SIZE / 2, y: 14 * CELL_SIZE + CELL_SIZE / 2 };

export function useGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  
  // Initialize dots and power pellets
  const initializeDots = useCallback(() => {
    const dots = new Set<string>();
    const powers = new Set<string>();
    
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = MAZE_LAYOUT[row]?.[col];
        if (cell === '.') {
          dots.add(`${col},${row}`);
        } else if (cell === 'o') {
          powers.add(`${col},${row}`);
        }
      }
    }
    
    return { dots, powers };
  }, []);

  // Initialize Pacman
  const initializePacman = useCallback((): Pacman => ({
    x: 14 * CELL_SIZE - CELL_SIZE / 2,
    y: 23 * CELL_SIZE + CELL_SIZE / 2,
    direction: 'left',
    nextDirection: 'none',
    mouthOpen: true,
    mouthAngle: 0.2,
    speed: INITIAL_CONFIG.pacmanSpeed,
    dead: false,
    deathFrame: 0
  }), []);

  // Initialize ghosts
  const initializeGhosts = useCallback((): Ghost[] => [
    {
      ...GHOST_START_POSITIONS.blinky,
      type: 'blinky',
      direction: 'left',
      state: 'scatter',
      speed: INITIAL_CONFIG.ghostSpeed,
      targetX: 0,
      targetY: 0,
      frightenedTimer: 0,
      flashCount: 0,
      inHouse: false,
      dotCounter: 0
    },
    {
      ...GHOST_START_POSITIONS.pinky,
      type: 'pinky',
      direction: 'down',
      state: 'house',
      speed: INITIAL_CONFIG.ghostSpeed * 0.8,
      targetX: 0,
      targetY: 0,
      frightenedTimer: 0,
      flashCount: 0,
      inHouse: true,
      dotCounter: 0
    },
    {
      ...GHOST_START_POSITIONS.inky,
      type: 'inky',
      direction: 'up',
      state: 'house',
      speed: INITIAL_CONFIG.ghostSpeed * 0.8,
      targetX: 0,
      targetY: 0,
      frightenedTimer: 0,
      flashCount: 0,
      inHouse: true,
      dotCounter: 0
    },
    {
      ...GHOST_START_POSITIONS.clyde,
      type: 'clyde',
      direction: 'up',
      state: 'house',
      speed: INITIAL_CONFIG.ghostSpeed * 0.8,
      targetX: 0,
      targetY: 0,
      frightenedTimer: 0,
      flashCount: 0,
      inHouse: true,
      dotCounter: 0
    }
  ], []);

  // Game state
  const [gameState, setGameState] = useState<GameState>(() => {
    const { dots, powers } = initializeDots();
    return {
      score: 0,
      highScore: parseInt(localStorage.getItem('pacman-highscore') || '0'),
      lives: 3,
      level: 1,
      paused: false,
      gameOver: false,
      gameStarted: false,
      ready: true,
      dots,
      powers,
      frightenedMode: false,
      frightenedTimer: 0,
      ghostsEaten: 0,
      fruitActive: false,
      fruitTimer: 0,
      fruitPosition: null
    };
  });

  const [pacman, setPacman] = useState<Pacman>(initializePacman);
  const [ghosts, setGhosts] = useState<Ghost[]>(initializeGhosts);

  // Get cell at position
  const getCell = useCallback((col: number, row: number): string => {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return '#';
    return MAZE_LAYOUT[row]?.[col] || '#';
  }, []);

  // Check if position is valid (not wall)
  const isValidPosition = useCallback((x: number, y: number, size: number = CELL_SIZE * 0.8): boolean => {
    const margin = (CELL_SIZE - size) / 2;
    const leftCol = Math.floor((x - CELL_SIZE / 2 + margin) / CELL_SIZE);
    const rightCol = Math.floor((x + CELL_SIZE / 2 - margin - 1) / CELL_SIZE);
    const topRow = Math.floor((y - CELL_SIZE / 2 + margin) / CELL_SIZE);
    const bottomRow = Math.floor((y + CELL_SIZE / 2 - margin - 1) / CELL_SIZE);

    const cells = [
      getCell(leftCol, topRow),
      getCell(rightCol, topRow),
      getCell(leftCol, bottomRow),
      getCell(rightCol, bottomRow)
    ];

    return !cells.some(cell => cell === '#');
  }, [getCell]);

  // Get grid position from pixel position
  const getGridPosition = useCallback((x: number, y: number): GridPosition => ({
    col: Math.floor(x / CELL_SIZE),
    row: Math.floor(y / CELL_SIZE)
  }), []);

  // Check if at center of cell
  const isAtCenter = useCallback((x: number, y: number): boolean => {
    const centerX = Math.floor(x / CELL_SIZE) * CELL_SIZE + CELL_SIZE / 2;
    const centerY = Math.floor(y / CELL_SIZE) * CELL_SIZE + CELL_SIZE / 2;
    return Math.abs(x - centerX) < pacman.speed && Math.abs(y - centerY) < pacman.speed;
  }, [pacman.speed]);

  // Get opposite direction
  const getOppositeDirection = useCallback((dir: Direction): Direction => {
    const opposites: Record<Direction, Direction> = {
      up: 'down',
      down: 'up',
      left: 'right',
      right: 'left',
      none: 'none'
    };
    return opposites[dir];
  }, []);

  // Check if can move in direction
  const canMove = useCallback((x: number, y: number, dir: Direction): boolean => {
    const testX = x + (dir === 'left' ? -pacman.speed : dir === 'right' ? pacman.speed : 0);
    const testY = y + (dir === 'up' ? -pacman.speed : dir === 'down' ? pacman.speed : 0);
    return isValidPosition(testX, testY);
  }, [isValidPosition, pacman.speed]);

  // Calculate distance
  const distance = useCallback((x1: number, y1: number, x2: number, y2: number): number => {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }, []);

  // Get ghost target based on type and state
  const getGhostTarget = useCallback((ghost: Ghost, pacmanPos: Position): Position => {
    if (ghost.state === 'eaten') {
      return GHOST_HOUSE_CENTER;
    }
    
    if (ghost.state === 'scatter') {
      return SCATTER_TARGETS[ghost.type];
    }
    
    if (ghost.state === 'frightened') {
      // Random target
      return {
        x: Math.random() * COLS * CELL_SIZE,
        y: Math.random() * ROWS * CELL_SIZE
      };
    }
    
    // Chase mode
    const pacmanCol = Math.floor(pacmanPos.x / CELL_SIZE);
    const pacmanRow = Math.floor(pacmanPos.y / CELL_SIZE);
    
    switch (ghost.type) {
      case 'blinky':
        return { x: pacmanPos.x, y: pacmanPos.y };
        
      case 'pinky': {
        // Target 4 tiles ahead of Pacman
        let targetCol = pacmanCol;
        let targetRow = pacmanRow;
        
        switch (pacman.direction) {
          case 'up': targetRow -= 4; break;
          case 'down': targetRow += 4; break;
          case 'left': targetCol -= 4; break;
          case 'right': targetCol += 4; break;
        }
        
        return { x: targetCol * CELL_SIZE + CELL_SIZE / 2, y: targetRow * CELL_SIZE + CELL_SIZE / 2 };
      }
        
      case 'inky': {
        // Complex targeting based on Blinky and Pacman
        const blinky = ghosts.find(g => g.type === 'blinky');
        if (!blinky) return { x: pacmanPos.x, y: pacmanPos.y };
        
        let pivotCol = pacmanCol;
        let pivotRow = pacmanRow;
        
        switch (pacman.direction) {
          case 'up': pivotRow -= 2; break;
          case 'down': pivotRow += 2; break;
          case 'left': pivotCol -= 2; break;
          case 'right': pivotCol += 2; break;
        }
        
        const blinkyCol = Math.floor(blinky.x / CELL_SIZE);
        const blinkyRow = Math.floor(blinky.y / CELL_SIZE);
        
        const targetCol = pivotCol + (pivotCol - blinkyCol);
        const targetRow = pivotRow + (pivotRow - blinkyRow);
        
        return { x: targetCol * CELL_SIZE + CELL_SIZE / 2, y: targetRow * CELL_SIZE + CELL_SIZE / 2 };
      }
        
      case 'clyde': {
        // Chase when far, scatter when close
        const dist = distance(ghost.x, ghost.y, pacmanPos.x, pacmanPos.y);
        if (dist > 8 * CELL_SIZE) {
          return { x: pacmanPos.x, y: pacmanPos.y };
        } else {
          return SCATTER_TARGETS.clyde;
        }
      }
        
      default:
        return { x: pacmanPos.x, y: pacmanPos.y };
    }
  }, [ghosts, distance]);

  // Update ghost direction
  const updateGhostDirection = useCallback((ghost: Ghost, target: Position): Direction => {
    if (!isAtCenter(ghost.x, ghost.y)) return ghost.direction;
    
    const possibleDirs: Direction[] = ['up', 'down', 'left', 'right'];
    const validDirs: Direction[] = [];
    
    for (const dir of possibleDirs) {
      if (dir === getOppositeDirection(ghost.direction)) continue;
      
      const testX = ghost.x + (dir === 'left' ? -ghost.speed : dir === 'right' ? ghost.speed : 0);
      const testY = ghost.y + (dir === 'up' ? -ghost.speed : dir === 'down' ? ghost.speed : 0);
      
      if (isValidPosition(testX, testY)) {
        validDirs.push(dir);
      }
    }
    
    if (validDirs.length === 0) {
      // Dead end, must reverse
      return getOppositeDirection(ghost.direction);
    }
    
    // Choose direction closest to target
    let bestDir = validDirs[0];
    let bestDist = Infinity;
    
    for (const dir of validDirs) {
      const testX = ghost.x + (dir === 'left' ? -CELL_SIZE : dir === 'right' ? CELL_SIZE : 0);
      const testY = ghost.y + (dir === 'up' ? -CELL_SIZE : dir === 'down' ? CELL_SIZE : 0);
      const dist = distance(testX, testY, target.x, target.y);
      
      if (dist < bestDist) {
        bestDist = dist;
        bestDir = dir;
      }
    }
    
    return bestDir;
  }, [isAtCenter, getGridPosition, getOppositeDirection, isValidPosition, distance]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (gameState.gameStarted && !gameState.paused && !gameState.gameOver) {
            setPacman(prev => ({ ...prev, nextDirection: 'up' }));
          }
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (gameState.gameStarted && !gameState.paused && !gameState.gameOver) {
            setPacman(prev => ({ ...prev, nextDirection: 'down' }));
          }
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (gameState.gameStarted && !gameState.paused && !gameState.gameOver) {
            setPacman(prev => ({ ...prev, nextDirection: 'left' }));
          }
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (gameState.gameStarted && !gameState.paused && !gameState.gameOver) {
            setPacman(prev => ({ ...prev, nextDirection: 'right' }));
          }
          break;
        case ' ':
          if (!gameState.gameStarted || gameState.gameOver) {
            startGame();
          }
          break;
        case 'p':
        case 'P':
          if (gameState.gameStarted && !gameState.gameOver) {
            setGameState(prev => ({ ...prev, paused: !prev.paused }));
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.gameStarted, gameState.paused, gameState.gameOver]);

  // Start game
  const startGame = useCallback(() => {
    const { dots, powers } = initializeDots();
    setGameState({
      score: 0,
      highScore: parseInt(localStorage.getItem('pacman-highscore') || '0'),
      lives: 3,
      level: 1,
      paused: false,
      gameOver: false,
      gameStarted: true,
      ready: true,
      dots,
      powers,
      frightenedMode: false,
      frightenedTimer: 0,
      ghostsEaten: 0,
      fruitActive: false,
      fruitTimer: 0,
      fruitPosition: null
    });
    setPacman(initializePacman());
    setGhosts(initializeGhosts());
    
    // Hide ready after 2 seconds
    setTimeout(() => {
      setGameState(prev => ({ ...prev, ready: false }));
    }, 2000);
  }, [initializeDots, initializePacman, initializeGhosts]);

  // Reset level
  const resetLevel = useCallback(() => {
    const { dots, powers } = initializeDots();
    setGameState(prev => ({
      ...prev,
      dots,
      powers,
      ready: true,
      frightenedMode: false,
      frightenedTimer: 0,
      ghostsEaten: 0,
      fruitActive: false,
      fruitTimer: 0,
      fruitPosition: null
    }));
    setPacman(initializePacman());
    setGhosts(initializeGhosts());
    
    setTimeout(() => {
      setGameState(prev => ({ ...prev, ready: false }));
    }, 2000);
  }, [initializeDots, initializePacman, initializeGhosts]);

  // Reset positions after death
  const resetPositions = useCallback(() => {
    setPacman(initializePacman());
    setGhosts(initializeGhosts());
    setGameState(prev => ({ ...prev, ready: true, frightenedMode: false, frightenedTimer: 0 }));
    
    setTimeout(() => {
      setGameState(prev => ({ ...prev, ready: false }));
    }, 2000);
  }, [initializePacman, initializeGhosts]);

  // Game loop
  useEffect(() => {
    if (!gameState.gameStarted || gameState.paused || gameState.gameOver || gameState.ready) return;

    const gameLoop = () => {
      // Update Pacman
      setPacman(prev => {
        if (prev.dead) {
          if (prev.deathFrame < 60) {
            return { ...prev, deathFrame: prev.deathFrame + 1 };
          }
          return prev;
        }

        let newPacman = { ...prev };
        
        // Try to change direction
        if (newPacman.nextDirection !== 'none' && canMove(newPacman.x, newPacman.y, newPacman.nextDirection)) {
          if (isAtCenter(newPacman.x, newPacman.y)) {
            newPacman.direction = newPacman.nextDirection;
            newPacman.nextDirection = 'none';
          }
        }
        
        // Move
        const newX = newPacman.x + (newPacman.direction === 'left' ? -newPacman.speed : newPacman.direction === 'right' ? newPacman.speed : 0);
        const newY = newPacman.y + (newPacman.direction === 'up' ? -newPacman.speed : newPacman.direction === 'down' ? newPacman.speed : 0);
        
        // Tunnel wrap
        if (newX < 0) {
          newPacman.x = COLS * CELL_SIZE - 1;
        } else if (newX >= COLS * CELL_SIZE) {
          newPacman.x = 0;
        } else if (isValidPosition(newX, newY)) {
          newPacman.x = newX;
          newPacman.y = newY;
        }
        
        // Animate mouth
        newPacman.mouthAngle = 0.2 + Math.sin(Date.now() / 50) * 0.2;
        
        return newPacman;
      });

      // Update ghosts
      setGhosts(prevGhosts => {
        return prevGhosts.map(ghost => {
          let newGhost = { ...ghost };
          
          // Release from house
          if (newGhost.inHouse && !gameState.ready) {
            newGhost.dotCounter++;
            if (newGhost.dotCounter > 30 + prevGhosts.indexOf(ghost) * 20) {
              newGhost.inHouse = false;
              newGhost.state = 'scatter';
              newGhost.x = GHOST_HOUSE_CENTER.x;
              newGhost.y = 11 * CELL_SIZE + CELL_SIZE / 2;
            }
          }
          
          // Update frightened timer
          if (newGhost.state === 'frightened') {
            newGhost.frightenedTimer--;
            if (newGhost.frightenedTimer <= 0) {
              newGhost.state = 'chase';
            }
          }
          
          // Get target
          const target = getGhostTarget(newGhost, { x: pacman.x, y: pacman.y });
          newGhost.targetX = target.x;
          newGhost.targetY = target.y;
          
          // Update direction
          if (!newGhost.inHouse) {
            newGhost.direction = updateGhostDirection(newGhost, target);
          }
          
          // Move
          if (!newGhost.inHouse) {
            const speed = newGhost.state === 'frightened' ? newGhost.speed * 0.6 : 
                         newGhost.state === 'eaten' ? newGhost.speed * 1.5 : newGhost.speed;
            
            const newX = newGhost.x + (newGhost.direction === 'left' ? -speed : newGhost.direction === 'right' ? speed : 0);
            const newY = newGhost.y + (newGhost.direction === 'up' ? -speed : newGhost.direction === 'down' ? speed : 0);
            
            // Tunnel wrap
            if (newX < 0) {
              newGhost.x = COLS * CELL_SIZE - 1;
            } else if (newX >= COLS * CELL_SIZE) {
              newGhost.x = 0;
            } else if (isValidPosition(newX, newY, CELL_SIZE * 0.9)) {
              newGhost.x = newX;
              newGhost.y = newY;
            }
          }
          
          // Check if reached house center when eaten
          if (newGhost.state === 'eaten') {
            const distToHouse = distance(newGhost.x, newGhost.y, GHOST_HOUSE_CENTER.x, GHOST_HOUSE_CENTER.y);
            if (distToHouse < CELL_SIZE) {
              newGhost.state = 'chase';
              newGhost.inHouse = true;
            }
          }
          
          return newGhost;
        });
      });

      // Check dot collection
      setGameState(prev => {
        const { col, row } = getGridPosition(pacman.x, pacman.y);
        const key = `${col},${row}`;
        let newState = { ...prev };
        
        if (newState.dots.has(key)) {
          newState.dots.delete(key);
          newState.score += INITIAL_CONFIG.dotScore;
        }
        
        if (newState.powers.has(key)) {
          newState.powers.delete(key);
          newState.score += INITIAL_CONFIG.powerScore;
          newState.frightenedMode = true;
          newState.frightenedTimer = INITIAL_CONFIG.frightenedDuration;
          newState.ghostsEaten = 0;
        }
        
        // Update frightened timer
        if (newState.frightenedTimer > 0) {
          newState.frightenedTimer--;
          if (newState.frightenedTimer <= 0) {
            newState.frightenedMode = false;
          }
        }
        
        // Update ghosts state based on frightened mode
        if (newState.frightenedMode && prev.frightenedTimer <= 0) {
          setGhosts(g => g.map(ghost => 
            ghost.state !== 'eaten' && !ghost.inHouse 
              ? { ...ghost, state: 'frightened', frightenedTimer: newState.frightenedTimer }
              : ghost
          ));
        } else if (!newState.frightenedMode && prev.frightenedTimer > 0) {
          setGhosts(g => g.map(ghost => 
            ghost.state === 'frightened' 
              ? { ...ghost, state: 'chase' }
              : ghost
          ));
        }
        
        // Check level complete
        if (newState.dots.size === 0 && newState.powers.size === 0) {
          newState.level++;
          setTimeout(resetLevel, 1000);
        }
        
        // Update high score
        if (newState.score > newState.highScore) {
          newState.highScore = newState.score;
          localStorage.setItem('pacman-highscore', newState.highScore.toString());
        }
        
        return newState;
      });

      // Check ghost collisions
      if (!pacman.dead) {
        ghosts.forEach(ghost => {
          const dist = distance(pacman.x, pacman.y, ghost.x, ghost.y);
          
          if (dist < CELL_SIZE * 0.7) {
            if (ghost.state === 'frightened') {
              // Eat ghost
              setGhosts(prev => prev.map(g => 
                g.type === ghost.type 
                  ? { ...g, state: 'eaten', frightenedTimer: 0 }
                  : g
              ));
              setGameState(prev => ({
                ...prev,
                score: prev.score + INITIAL_CONFIG.ghostScores[prev.ghostsEaten] || 1600,
                ghostsEaten: prev.ghostsEaten + 1
              }));
            } else if (ghost.state !== 'eaten') {
              // Pacman dies
              setPacman(prev => ({ ...prev, dead: true }));
              setGameState(prev => {
                const newLives = prev.lives - 1;
                if (newLives <= 0) {
                  return { ...prev, lives: 0, gameOver: true };
                }
                setTimeout(resetPositions, 1000);
                return { ...prev, lives: newLives };
              });
            }
          }
        });
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [gameState.gameStarted, gameState.paused, gameState.gameOver, gameState.ready, pacman.x, pacman.y, pacman.dead, ghosts, canMove, isAtCenter, isValidPosition, getGhostTarget, updateGhostDirection, getGridPosition, distance, resetLevel, resetPositions]);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw maze
    ctx.strokeStyle = '#2121de';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = getCell(col, row);
        const x = col * CELL_SIZE;
        const y = row * CELL_SIZE;

        if (cell === '#') {
          // Draw wall
          ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        }
      }
    }

    // Draw dots
    ctx.fillStyle = '#ffb8ae';
    gameState.dots.forEach(key => {
      const [col, row] = key.split(',').map(Number);
      const x = col * CELL_SIZE + CELL_SIZE / 2;
      const y = row * CELL_SIZE + CELL_SIZE / 2;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw power pellets (pulsing)
    const pulseSize = 4 + Math.sin(Date.now() / 100) * 2;
    gameState.powers.forEach(key => {
      const [col, row] = key.split(',').map(Number);
      const x = col * CELL_SIZE + CELL_SIZE / 2;
      const y = row * CELL_SIZE + CELL_SIZE / 2;
      ctx.beginPath();
      ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Pacman
    if (!pacman.dead || pacman.deathFrame < 30) {
      ctx.save();
      ctx.translate(pacman.x, pacman.y);
      
      // Rotate based on direction
      let rotation = 0;
      switch (pacman.direction) {
        case 'right': rotation = 0; break;
        case 'down': rotation = Math.PI / 2; break;
        case 'left': rotation = Math.PI; break;
        case 'up': rotation = -Math.PI / 2; break;
      }
      ctx.rotate(rotation);

      // Draw Pacman body
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      
      if (pacman.dead) {
        // Death animation - mouth closes
        const closeAmount = pacman.deathFrame / 30;
        ctx.arc(0, 0, CELL_SIZE * 0.4, closeAmount * Math.PI, (2 - closeAmount) * Math.PI);
      } else {
        ctx.arc(0, 0, CELL_SIZE * 0.4, pacman.mouthAngle, 2 * Math.PI - pacman.mouthAngle);
      }
      
      ctx.lineTo(0, 0);
      ctx.fill();
      ctx.restore();
    }

    // Draw ghosts
    ghosts.forEach(ghost => {
      ctx.save();
      ctx.translate(ghost.x, ghost.y);

      // Determine color
      let color = GHOST_COLORS[ghost.type];
      if (ghost.state === 'frightened') {
        // Flash when almost over
        if (ghost.frightenedTimer < 120 && Math.floor(Date.now() / 100) % 2 === 0) {
          color = '#fff';
        } else {
          color = '#2121de';
        }
      } else if (ghost.state === 'eaten') {
        color = 'transparent';
      }

      // Draw ghost body
      if (ghost.state !== 'eaten') {
        ctx.fillStyle = color;
        ctx.beginPath();
        
        // Top half circle
        ctx.arc(0, -CELL_SIZE * 0.1, CELL_SIZE * 0.4, Math.PI, 0);
        
        // Bottom wavy part
        const waveOffset = Math.sin(Date.now() / 100) * 2;
        ctx.lineTo(CELL_SIZE * 0.4, CELL_SIZE * 0.3 + waveOffset);
        ctx.lineTo(CELL_SIZE * 0.2, CELL_SIZE * 0.2 - waveOffset);
        ctx.lineTo(0, CELL_SIZE * 0.3 + waveOffset);
        ctx.lineTo(-CELL_SIZE * 0.2, CELL_SIZE * 0.2 - waveOffset);
        ctx.lineTo(-CELL_SIZE * 0.4, CELL_SIZE * 0.3 + waveOffset);
        ctx.closePath();
        ctx.fill();

        // Draw eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-CELL_SIZE * 0.15, -CELL_SIZE * 0.15, CELL_SIZE * 0.12, 0, Math.PI * 2);
        ctx.arc(CELL_SIZE * 0.15, -CELL_SIZE * 0.15, CELL_SIZE * 0.12, 0, Math.PI * 2);
        ctx.fill();

        // Draw pupils
        ctx.fillStyle = '#00f';
        let pupilOffsetX = 0;
        let pupilOffsetY = 0;
        switch (ghost.direction) {
          case 'left': pupilOffsetX = -2; break;
          case 'right': pupilOffsetX = 2; break;
          case 'up': pupilOffsetY = -2; break;
          case 'down': pupilOffsetY = 2; break;
        }
        ctx.beginPath();
        ctx.arc(-CELL_SIZE * 0.15 + pupilOffsetX, -CELL_SIZE * 0.15 + pupilOffsetY, CELL_SIZE * 0.05, 0, Math.PI * 2);
        ctx.arc(CELL_SIZE * 0.15 + pupilOffsetX, -CELL_SIZE * 0.15 + pupilOffsetY, CELL_SIZE * 0.05, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Draw only eyes when eaten
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-CELL_SIZE * 0.15, -CELL_SIZE * 0.15, CELL_SIZE * 0.1, 0, Math.PI * 2);
        ctx.arc(CELL_SIZE * 0.15, -CELL_SIZE * 0.15, CELL_SIZE * 0.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#00f';
        ctx.beginPath();
        ctx.arc(-CELL_SIZE * 0.15, -CELL_SIZE * 0.15, CELL_SIZE * 0.04, 0, Math.PI * 2);
        ctx.arc(CELL_SIZE * 0.15, -CELL_SIZE * 0.15, CELL_SIZE * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  }, [gameState.dots, gameState.powers, pacman, ghosts, getCell]);

  return {
    canvasRef,
    gameState,
    pacman,
    ghosts,
    startGame,
    CELL_SIZE,
    COLS,
    ROWS
  };
}
