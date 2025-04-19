"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button"

// Define types
interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  points: number;
  hit: boolean;
}

interface Paddle {
  x: number;
  width: number;
  height: number;
  color: string;
  speed: number;
}

interface Ball {
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
  angle: number;
}

interface Level {
  bricks: Brick[];
  paddle: Paddle;
  ball: Ball; // Keep original speed and angle here
}

// Type for the mutable game state derived from Level
type MutableLevelData = {
    bricks: Brick[];
    paddle: Paddle;
    ball: Ball;
}

type GameState = "start" | "playing" | "paused" | "gameover";

// Helper function to create bricks (defined below)
// Function to generate random colors for the bricks (defined below)

const BrickBreaker: React.FC = () => {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [level, setLevel] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [gameState, setGameState] = useState<GameState>("start");
  const gameStateRef = useRef<GameState>(gameState); // Ref to track latest gameState
  // Store level templates - these should NOT be mutated directly during gameplay
  const [levels, setLevels] = useState<Level[]>([]);
  // Store the current mutable state for the game loop
  const [currentLevelData, setCurrentLevelData] = useState<MutableLevelData | null>(null);
  const [isVibrating, setIsVibrating] = useState<boolean>(false);
  // State to track if the ball is currently launched and moving
  const [ballLaunched, setBallLaunched] = useState<boolean>(false);
  // State for displaying temporary messages on canvas
  const [displayMessage, setDisplayMessage] = useState<string | null>(null);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref to manage message timeout
  const animationFrameId = useRef<number | null>(null); // Use ref for animation frame ID

  // Sound effect refs
  const paddleHitSoundRef = useRef<HTMLAudioElement>(null);
  const brickBreakSoundRef = useRef<HTMLAudioElement>(null);
  const wallHitSoundRef = useRef<HTMLAudioElement>(null);
  const lifeLostSoundRef = useRef<HTMLAudioElement>(null);
  const gameOverSoundRef = useRef<HTMLAudioElement>(null);

  // Effect to keep gameStateRef synchronized with gameState
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Function to display a temporary message
  const showMessage = useCallback((msg: string, duration: number = 1500) => {
    if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
    }
    setDisplayMessage(msg);
    messageTimeoutRef.current = setTimeout(() => {
      setDisplayMessage(null);
      messageTimeoutRef.current = null;
    }, duration);
  }, []);

  // Cleanup message timeout on unmount
  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
      if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  // Generate level templates on mount
  useEffect(() => {
    const generateLevels = (canvasWidth: number, canvasHeight: number): Level[] => {
      const level1Bricks = createBricks(canvasWidth, canvasHeight, 1, { rows: 3, cols: 8 });
      const level2Bricks = createBricks(canvasWidth, canvasHeight, 2, { rows: 4, cols: 9 });
      const level3Bricks = createBricks(canvasWidth, canvasHeight, 3, { rows: 5, cols: 10 });
      const initialAngle = -Math.PI / 4;
      return [
        { bricks: level1Bricks, paddle: { x: canvasWidth / 2 - 40, width: 80, height: 10, color: '#29ABE2', speed: 10 }, ball: { x: canvasWidth / 2, y: canvasHeight - 30, radius: 10, color: '#8E2DE2', speed: 5, angle: initialAngle } },
        { bricks: level2Bricks, paddle: { x: canvasWidth / 2 - 35, width: 70, height: 10, color: '#29ABE2', speed: 11 }, ball: { x: canvasWidth / 2, y: canvasHeight - 30, radius: 10, color: '#8E2DE2', speed: 6, angle: initialAngle } },
        { bricks: level3Bricks, paddle: { x: canvasWidth / 2 - 30, width: 60, height: 10, color: '#29ABE2', speed: 12 }, ball: { x: canvasWidth / 2, y: canvasHeight - 30, radius: 10, color: '#8E2DE2', speed: 7, angle: initialAngle } },
      ];
    };
    const canvas = canvasRef.current;
    const cw = canvas?.width ?? 640;
    const ch = canvas?.height ?? 480;
    const initialLevels = generateLevels(cw, ch);
    setLevels(initialLevels);
  }, []);

  // Reset ball and paddle position
   const resetBallAndPaddlePosition = useCallback((levelData: MutableLevelData) => {
        const canvas = canvasRef.current;
        const levelTemplate = levels[level - 1];
        if (!canvas || !levelData || !levelTemplate) return;
        levelData.paddle.x = canvas.width / 2 - levelData.paddle.width / 2;
        levelData.ball.x = levelData.paddle.x + levelData.paddle.width / 2;
        levelData.ball.y = canvas.height - levelData.paddle.height - levelData.ball.radius - 1;
        levelData.ball.speed = 0;
        levelData.ball.angle = levelTemplate.ball.angle;
        setBallLaunched(false);
   }, [level, levels]);

  // --- Game State Control Functions --- Moved Before Main useEffect ---
  const startGame = useCallback(() => {
       if (!levels[level - 1]) { console.error("Cannot start game: Level data not loaded yet."); return; }
       setScore(0);
       setLives(3);
       setBallLaunched(false);
       setDisplayMessage(null);
       if (messageTimeoutRef.current) { clearTimeout(messageTimeoutRef.current); messageTimeoutRef.current = null; }
       const levelTemplate = levels[level - 1];
       const newLevelData: MutableLevelData = JSON.parse(JSON.stringify(levelTemplate));
       newLevelData.bricks.forEach(brick => brick.hit = false);
       setCurrentLevelData(newLevelData);
       resetBallAndPaddlePosition(newLevelData);
       setGameState("playing");
  }, [level, levels, resetBallAndPaddlePosition]); // Added dependencies

  const pauseGame = useCallback(() => {
      if (gameStateRef.current === "playing") {
        setGameState("paused");
    }
  }, []);

  const resumeGame = useCallback(() => {
     if (gameStateRef.current === "paused") {
        setGameState("playing");
    }
  }, []);

  const resetGame = useCallback(() => {
      setGameState("start");
      setLevel(1);
      setScore(0);
      setLives(3);
      setBallLaunched(false);
      setDisplayMessage(null);
      if (messageTimeoutRef.current) { clearTimeout(messageTimeoutRef.current); messageTimeoutRef.current = null; }
      // Let the useEffect below handle resetting level data based on level state change
  }, []);

   const handleLevelChange = useCallback((newLevel: number, autoPlay = false) => {
       if (newLevel >= 1 && newLevel <= levels.length) {
          setLevel(newLevel);
          setBallLaunched(false);
           if (autoPlay) {
              setTimeout(() => {
                 if (gameStateRef.current !== "gameover") {
                    setGameState("playing");
                 }
              }, 50);
           } else {
               setGameState("start");
           }
        } else {
          alert(`سطح ${newLevel} دستیاب نہیں ہے۔`);
        }
   }, [levels.length]); // Dependency on levels.length
  // --- End Game State Control Functions ---

  // Effect to initialize/update level data when level changes
  useEffect(() => {
    if (levels.length > 0 && level >= 1 && level <= levels.length) {
        const levelTemplate = levels[level - 1];
        const newLevelData: MutableLevelData = JSON.parse(JSON.stringify(levelTemplate));
        newLevelData.bricks.forEach(brick => brick.hit = false);
        setCurrentLevelData(newLevelData);
        resetBallAndPaddlePosition(newLevelData);
        setDisplayMessage(null);
         if (messageTimeoutRef.current) {
            clearTimeout(messageTimeoutRef.current);
            messageTimeoutRef.current = null;
        }
    } else {
        setCurrentLevelData(null);
    }
  }, [level, levels, resetBallAndPaddlePosition]);


  // Main game loop and event listeners effect
  useEffect(() => {
    const canvas = canvasRef.current;
    const paddleHitSound = paddleHitSoundRef.current;
    const brickBreakSound = brickBreakSoundRef.current;
    const wallHitSound = wallHitSoundRef.current;
    const lifeLostSound = lifeLostSoundRef.current;
    const gameOverSound = gameOverSoundRef.current;

    if (!canvas || !currentLevelData) {
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rightPressed = false;
    let leftPressed = false;

    // --- Drawing Functions (unchanged) ---
    const drawBricks = () => { currentLevelData.bricks.forEach(brick => { if (!brick.hit) { ctx.beginPath(); ctx.rect(brick.x, brick.y, brick.width, brick.height); ctx.fillStyle = brick.color; ctx.fill(); ctx.closePath(); } }); };
    const drawPaddle = () => { ctx.beginPath(); ctx.rect(currentLevelData.paddle.x, canvas.height - currentLevelData.paddle.height, currentLevelData.paddle.width, currentLevelData.paddle.height); ctx.fillStyle = currentLevelData.paddle.color; ctx.fill(); ctx.closePath(); };
    const drawBall = () => { ctx.beginPath(); ctx.arc(currentLevelData.ball.x, currentLevelData.ball.y, currentLevelData.ball.radius, 0, Math.PI * 2); ctx.fillStyle = currentLevelData.ball.color; ctx.fill(); ctx.closePath(); };
    const drawScore = () => { ctx.font = "16px sans-serif"; ctx.fillStyle = "white"; ctx.fillText(`سکور: ${score}`, 8, 20); };
    const drawLives = () => { ctx.font = "16px sans-serif"; ctx.fillStyle = "white"; ctx.fillText(`زندگیاں: ${lives}`, canvas.width - 80, 20); };
    const drawDisplayMessage = () => { if (displayMessage) { ctx.font = "bold 24px sans-serif"; ctx.fillStyle = "rgba(255, 255, 255, 0.9)"; ctx.textAlign = "center"; ctx.fillText(displayMessage, canvas.width / 2, canvas.height / 2); ctx.textAlign = "start"; } };
    // --- End Drawing Functions ---

    // --- Collision Detection ---
    const collisionDetection = () => {
       let allBricksHit = true;
       currentLevelData.bricks.forEach(brick => {
        if (!brick.hit) {
           allBricksHit = false;
            if (
                currentLevelData.ball.x + currentLevelData.ball.radius > brick.x &&
                currentLevelData.ball.x - currentLevelData.ball.radius < brick.x + brick.width &&
                currentLevelData.ball.y + currentLevelData.ball.radius > brick.y &&
                currentLevelData.ball.y - currentLevelData.ball.radius < brick.y + brick.height
            ) {
                currentLevelData.ball.angle = -currentLevelData.ball.angle;
                currentLevelData.ball.y += (currentLevelData.ball.angle < 0 || currentLevelData.ball.angle > Math.PI) ? -1 : 1;
                brick.hit = true;
                setScore(prevScore => prevScore + brick.points);
                brickBreakSound?.play();
                if (currentLevelData.bricks.every(b => b.hit)) {
                    allBricksHit = true;
                }
            }
        }
      });

        if (allBricksHit) {
             if (level < levels.length) {
                showMessage(`سطح ${level} مکمل!`);
                handleLevelChange(level + 1, true);
            } else {
                showMessage("آپ جیت گئے!");
                setGameState("gameover");
                gameOverSound?.play();
            }
        }
    };
    // --- End Collision Detection ---

    // --- Launch Ball Logic ---
    const tryLaunchBall = () => { if (!ballLaunched && lives > 0 && currentLevelData && levels[level - 1]) { currentLevelData.ball.speed = levels[level - 1].ball.speed; setBallLaunched(true); } };

    // --- Event Handlers --- (Now using useCallback versions of pause/resume)
    const keyDownHandler = (e: KeyboardEvent) => { if (e.key === "Right" || e.key === "ArrowRight") { rightPressed = true; } else if (e.key === "Left" || e.key === "ArrowLeft") { leftPressed = true; } else if (e.code === "Space") { e.preventDefault(); tryLaunchBall(); } else if (e.key === 'p' || e.key === 'P') { if (gameStateRef.current === "playing") { pauseGame(); } else if (gameStateRef.current === "paused") { resumeGame(); } } };
    const keyUpHandler = (e: KeyboardEvent) => { if (e.key === "Right" || e.key === "ArrowRight") { rightPressed = false; } else if (e.key === "Left" || e.key === "ArrowLeft") { leftPressed = false; } };
    const clickOrTouchHandler = (event: MouseEvent | TouchEvent) => { event.preventDefault(); tryLaunchBall(); };

    // Add event listeners
    document.addEventListener("keydown", keyDownHandler, false);
    document.addEventListener("keyup", keyUpHandler, false);
    canvas.addEventListener("click", clickOrTouchHandler, false);
    canvas.addEventListener("touchstart", clickOrTouchHandler, false);


    // --- Game Loop ---
    const gameLoop = () => {
      if (gameStateRef.current !== "playing") {
        animationFrameId.current = null;
        return;
      }
      const currentCtx = canvas?.getContext('2d');
      if (!currentCtx || !currentLevelData) { // Added check for currentLevelData
         animationFrameId.current = null;
         return;
      }

      currentCtx.clearRect(0, 0, canvas.width, canvas.height);
      drawBricks();
      drawPaddle();
      drawBall();
      drawScore();
      drawLives();
      drawDisplayMessage();
      collisionDetection();

      // Move Paddle
      if (rightPressed && currentLevelData.paddle.x < canvas.width - currentLevelData.paddle.width) {
        currentLevelData.paddle.x += currentLevelData.paddle.speed;
      } else if (leftPressed && currentLevelData.paddle.x > 0) {
        currentLevelData.paddle.x -= currentLevelData.paddle.speed;
      }

      // Move ball
      if (ballLaunched) {
        currentLevelData.ball.x += currentLevelData.ball.speed * Math.cos(currentLevelData.ball.angle);
        currentLevelData.ball.y += currentLevelData.ball.speed * Math.sin(currentLevelData.ball.angle);
      } else {
        currentLevelData.ball.x = currentLevelData.paddle.x + currentLevelData.paddle.width / 2;
        currentLevelData.ball.y = canvas.height - currentLevelData.paddle.height - currentLevelData.ball.radius - 1;
      }

      // Ball collision with walls
      if (currentLevelData.ball.x + currentLevelData.ball.radius > canvas.width || currentLevelData.ball.x - currentLevelData.ball.radius < 0) {
        currentLevelData.ball.angle = Math.PI - currentLevelData.ball.angle;
        currentLevelData.ball.x = (currentLevelData.ball.x + currentLevelData.ball.radius > canvas.width)
            ? canvas.width - currentLevelData.ball.radius - 1
            : currentLevelData.ball.radius + 1;
        wallHitSound?.play();
      }
      if (currentLevelData.ball.y - currentLevelData.ball.radius < 0) {
        currentLevelData.ball.angle = -currentLevelData.ball.angle;
        currentLevelData.ball.y = currentLevelData.ball.radius + 1;
        wallHitSound?.play();
      }

      // Ball collision with paddle
       const paddleTopY = canvas.height - currentLevelData.paddle.height;
      if (
          ballLaunched &&
          currentLevelData.ball.y + currentLevelData.ball.radius > paddleTopY &&
          currentLevelData.ball.y - currentLevelData.ball.radius < paddleTopY + currentLevelData.paddle.height &&
          currentLevelData.ball.x > currentLevelData.paddle.x &&
          currentLevelData.ball.x < currentLevelData.paddle.x + currentLevelData.paddle.width
      ) {
          const paddleCollisionPoint = currentLevelData.ball.x - (currentLevelData.paddle.x + currentLevelData.paddle.width / 2);
          const normalizedPaddleCollisionPoint = paddleCollisionPoint / (currentLevelData.paddle.width / 2);
          const maxBounceAngle = Math.PI / 3;
          const newAngle = -Math.PI / 2 + normalizedPaddleCollisionPoint * maxBounceAngle;
          currentLevelData.ball.angle = newAngle;
          currentLevelData.ball.y = paddleTopY - currentLevelData.ball.radius - 1;
          paddleHitSound?.play();
      }

      // Ball out of bounds (Bottom) - Lose life
      if (currentLevelData.ball.y + currentLevelData.ball.radius > canvas.height) {
         if (ballLaunched) {
              if (!isVibrating) {
                  setIsVibrating(true);
                  navigator.vibrate?.(200);
                  setTimeout(() => {
                      setIsVibrating(false);
                      setLives(prevLives => {
                          const newLives = prevLives - 1;
                          if (newLives < 0) {
                              setGameState("gameover");
                              gameOverSound?.play();
                              return 0;
                          } else {
                              showMessage("ایک زندگی کم ہوگئی!");
                              lifeLostSound?.play();
                              resetBallAndPaddlePosition(currentLevelData);
                              return newLives;
                          }
                      });
                  }, 50);
              }
          }
      }

       if (gameStateRef.current === "playing") {
           animationFrameId.current = requestAnimationFrame(gameLoop);
       } else {
           animationFrameId.current = null;
       }
    };
    // --- End Game Loop ---

    // Start/Stop loop based on gameState
     if (gameState === "playing") {
         if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
         animationFrameId.current = requestAnimationFrame(gameLoop);
    } else {
         if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
         }
    }

    // --- Cleanup Function ---
    return () => {
      document.removeEventListener("keydown", keyDownHandler, false);
      document.removeEventListener("keyup", keyUpHandler, false);
      canvas?.removeEventListener("click", clickOrTouchHandler, false);
      canvas?.removeEventListener("touchstart", clickOrTouchHandler, false);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
     // Removed pauseGame, resumeGame, handleLevelChange from deps
  }, [gameState, currentLevelData, lives, score, ballLaunched, level, levels, isVibrating, resetBallAndPaddlePosition, displayMessage, showMessage, handleLevelChange, pauseGame, resumeGame]); // Keep pauseGame/resumeGame/handleLevelChange here because keyDownHandler depends on them


  return (
    <div className="flex flex-col items-center justify-center relative">
      {/* Audio Elements */}
      <audio ref={paddleHitSoundRef} src="/sounds/paddleHit.wav" preload="auto" />
      <audio ref={brickBreakSoundRef} src="/sounds/brickBreak.wav" preload="auto" />
      <audio ref={wallHitSoundRef} src="/sounds/wallHit.wav" preload="auto" />
      <audio ref={lifeLostSoundRef} src="/sounds/lifeLost.wav" preload="auto" />
      <audio ref={gameOverSoundRef} src="/sounds/gameOver.wav" preload="auto" />

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width="640"
        height="480"
        className="border-2 border-gray-300 rounded-md bg-black"
        tabIndex={0}
       />

       {/* Overlays for Start/Pause/Game Over */}
      {gameState === "start" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 text-white z-10">
          <h1 className="text-4xl font-bold mb-6">اینٹوں کا توڑ</h1>
          <Button onClick={startGame} className="px-6 py-3 text-lg mb-4">کھیل شروع کریں</Button>
          <div className="flex space-x-4">
             {levels.map((_, index) => (
                <Button key={index} onClick={() => handleLevelChange(index + 1)}>لیول {index + 1}</Button>
             ))}
          </div>
        </div>
      )}
      {gameState === "paused" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-75 text-white z-10">
          <h1 className="text-3xl font-bold mb-4">موقوف</h1>
          <Button onClick={resumeGame} className="mb-2">دوبارہ شروع کریں</Button>
          <Button onClick={resetGame}>دوبارہ شروع کریں</Button>
        </div>
      )}
      {gameState === "gameover" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-75 text-white z-10">
          <h1 className="text-4xl font-bold mb-4">گیم ختم</h1>
          <p className="text-xl mb-4">آپ کا سکور: {score}</p>
          <Button onClick={resetGame}>دوبارہ شروع کریں</Button>
        </div>
      )}
    </div>
  );
};

export default BrickBreaker;

// Helper function to create bricks (Unchanged)
function createBricks(canvasWidth: number, canvasHeight: number, level: number, { rows, cols }: { rows: number; cols: number }): Brick[] {
  const totalPadding = (cols + 1) * 10;
  const availableWidth = canvasWidth - totalPadding - 60;
  const brickWidth = Math.max(20, Math.floor(availableWidth / cols));
  const brickHeight = 20;
  const padding = 10;
  const offsetTop = 50;
  const offsetLeft = 30 + (canvasWidth - (cols * (brickWidth + padding) - padding) - 60) / 2;
  const bricks: Brick[] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const brickX = c * (brickWidth + padding) + offsetLeft;
      const brickY = r * (brickHeight + padding) + offsetTop;
      const color = getRandomColor();
      const points = level * 10;
      bricks.push({ x: brickX, y: brickY, width: brickWidth, height: brickHeight, color, points, hit: false });
    }
  }
  return bricks;
}

// Function to generate random colors for the bricks (Unchanged)
function getRandomColor(): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#F7DC6F', '#BB8FCE', '#5DADE2'];
  return colors[Math.floor(Math.random() * colors.length)];
}
