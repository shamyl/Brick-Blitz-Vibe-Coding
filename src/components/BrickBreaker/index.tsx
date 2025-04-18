"use client";

import React, { useState, useRef, useEffect } from 'react';
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
  ball: Ball;
}

const BrickBreaker: React.FC = () => {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [level, setLevel] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [gameState, setGameState] = useState<"start" | "playing" | "paused" | "gameover">("start");
  const [levels, setLevels] = useState<Level[]>([]); // Store levels
  const [currentLevelData, setCurrentLevelData] = useState<Level | null>(null);
  const [isVibrating, setIsVibrating] = useState<boolean>(false);

  // Sound effect refs
  const paddleHitSoundRef = useRef<HTMLAudioElement>(null);
  const brickBreakSoundRef = useRef<HTMLAudioElement>(null);
  const gameOverSoundRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const generateLevels = () => {
      const canvas = canvasRef.current;
      if (!canvas) return [];

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      const level1Bricks = createBricks(canvasWidth, canvasHeight, 1, { rows: 3, cols: 8 });
      const level2Bricks = createBricks(canvasWidth, canvasHeight, 2, { rows: 4, cols: 9 });
      const level3Bricks = createBricks(canvasWidth, canvasHeight, 3, { rows: 5, cols: 10 });

      return [
        {
          bricks: level1Bricks,
          paddle: { x: canvasWidth / 2 - 40, width: 80, height: 10, color: '#29ABE2', speed: 10 },
          ball: { x: canvasWidth / 2, y: canvasHeight - 30, radius: 10, color: '#8E2DE2', speed: 5, angle: Math.PI / 6 },
        },
        {
          bricks: level2Bricks,
          paddle: { x: canvasWidth / 2 - 40, width: 70, height: 10, color: '#29ABE2', speed: 11, },
          ball: { x: canvasWidth / 2, y: canvasHeight / 2, radius: 10, color: '#8E2DE2', speed: 6, angle: Math.PI / 6 },
        },
        {
          bricks: level3Bricks,
          paddle: { x: canvasWidth / 2 - 40, width: 60, height: 10, color: '#29ABE2', speed: 12, },
          ball: { x: canvasWidth / 2, y: canvasHeight / 2, radius: 10, color: '#8E2DE2', speed: 7, angle: Math.PI / 6 },
        },
      ];
    };

    const initialLevels = generateLevels();
    setLevels(initialLevels);

    // Initialize current level data and ball position on paddle
    const initialLevelData = initialLevels[level - 1] || null;
    if (initialLevelData) {
      initialLevelData.ball.x = initialLevelData.paddle.x + initialLevelData.paddle.width / 2;
      initialLevelData.ball.y = canvasRef.current!.height - currentLevelData!.paddle.height - initialLevelData.ball.radius - 1;
    }
    setCurrentLevelData(initialLevelData);
  }, [level]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const paddleHitSound = paddleHitSoundRef.current;
    const brickBreakSound = brickBreakSoundRef.current;
    const gameOverSound = gameOverSoundRef.current;

    if (!canvas || !currentLevelData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let rightPressed = false;
    let leftPressed = false;

    const drawBricks = () => {
      currentLevelData.bricks.forEach(brick => {
        if (!brick.hit) {
          ctx.beginPath();
          ctx.rect(brick.x, brick.y, brick.width, brick.height);
          ctx.fillStyle = brick.color;
          ctx.fill();
          ctx.closePath();
        }
      });
    };

    const drawPaddle = () => {
      ctx.beginPath();
      ctx.rect(currentLevelData.paddle.x, canvas.height - currentLevelData.paddle.height, currentLevelData.paddle.width, currentLevelData.paddle.height);
      ctx.fillStyle = currentLevelData.paddle.color;
      ctx.fill();
      ctx.closePath();
    };

    const drawBall = () => {
      ctx.beginPath();
      ctx.arc(currentLevelData.ball.x, currentLevelData.ball.y, currentLevelData.ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = currentLevelData.ball.color;
      ctx.fill();
      ctx.closePath();
    };

    const drawScore = () => {
      ctx.font = "16px sans-serif";
      ctx.fillStyle = "white";
      ctx.fillText(`سکور: ${score}`, 8, 20); // Score in Urdu
    };

    const drawLives = () => {
      ctx.font = "16px sans-serif";
      ctx.fillStyle = "white";
      ctx.fillText(`زندگیاں: ${lives}`, canvas.width - 80, 20); // Lives in Urdu
    };

    const collisionDetection = () => {
      currentLevelData.bricks.forEach(brick => {
        if (!brick.hit) {
          if (currentLevelData.ball.x > brick.x && currentLevelData.ball.x < brick.x + brick.width && currentLevelData.ball.y > brick.y && currentLevelData.ball.y < brick.y + brick.height) {
            // Calculate new angle based on collision point
            const collisionPoint = currentLevelData.ball.x - (brick.x + brick.width / 2);
            const normalizedCollisionPoint = collisionPoint / (brick.width / 2);
            const bounceAngle = normalizedCollisionPoint * (Math.PI / 3); // Max bounce angle of 60 degrees

            currentLevelData.ball.angle = -currentLevelData.ball.angle + bounceAngle;
            brick.hit = true;
            setScore(prevScore => prevScore + brick.points);
            brickBreakSound && brickBreakSound.play(); // Play brick break sound
            if (currentLevelData.bricks.every(b => b.hit)) {
              setGameState("gameover");
              gameOverSound && gameOverSound.play(); // Play game over sound
            }
          }
        }
      });
    };

    const keyDownHandler = (e: KeyboardEvent) => {
      if (e.key === "Right" || e.key === "ArrowRight") {
        rightPressed = true;
      } else if (e.key === "Left" || e.key === "ArrowLeft") {
        leftPressed = true;
      }
    };

    const keyUpHandler = (e: KeyboardEvent) => {
      if (e.key === "Right" || e.key === "ArrowRight") {
        rightPressed = false;
      } else if (e.key === "Left" || e.key === "ArrowLeft") {
        leftPressed = false;
      }
    };

    document.addEventListener("keydown", keyDownHandler, false);
    document.addEventListener("keyup", keyUpHandler, false);

    const gameLoop = () => {
      if (gameState !== "playing") return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBricks();
      drawPaddle();
      drawBall();
      drawScore();
      drawLives();
      collisionDetection();

      if (rightPressed && currentLevelData.paddle.x < canvas.width - currentLevelData.paddle.width) {
        currentLevelData.paddle.x += currentLevelData.paddle.speed;
      } else if (leftPressed && currentLevelData.paddle.x > 0) {
        currentLevelData.paddle.x -= currentLevelData.paddle.speed;
      }

      // Move ball
      currentLevelData.ball.x += currentLevelData.ball.speed * Math.cos(currentLevelData.ball.angle);
      currentLevelData.ball.y += currentLevelData.ball.speed * Math.sin(currentLevelData.ball.angle);

      // Ball collision with walls
      if (currentLevelData.ball.x + currentLevelData.ball.radius > canvas.width || currentLevelData.ball.x - currentLevelData.ball.radius < 0) {
        currentLevelData.ball.angle = Math.PI - currentLevelData.ball.angle;
      }
      if (currentLevelData.ball.y - currentLevelData.ball.radius < 0) {
        currentLevelData.ball.angle = -currentLevelData.ball.angle;
      }

      // Ball collision with paddle
      if (currentLevelData.ball.y + currentLevelData.ball.radius > canvas.height - currentLevelData.paddle.height && currentLevelData.ball.x > currentLevelData.paddle.x && currentLevelData.ball.x < currentLevelData.paddle.x + currentLevelData.paddle.width) {
         // Calculate new angle based on collision point with the paddle
        const paddleCollisionPoint = currentLevelData.ball.x - (currentLevelData.paddle.x + currentLevelData.paddle.width / 2);
        const normalizedPaddleCollisionPoint = paddleCollisionPoint / (currentLevelData.paddle.width / 2);
        const bounceAngle = normalizedPaddleCollisionPoint * (Math.PI / 3); // Adjust for desired bounce angle range
    
        currentLevelData.ball.angle = -Math.abs(Math.PI/2 + bounceAngle); //reverse direction and add angle
        paddleHitSound && paddleHitSound.play(); // Play paddle hit sound
      }

      // Ball out of bounds
      if (currentLevelData.ball.y + currentLevelData.ball.radius > canvas.height) {
        // Stop the ball immediately
        currentLevelData.ball.speed = 0;

        // Vibrate before losing life
        if (!isVibrating) {
          setIsVibrating(true);
          if ('vibrate' in navigator) {
            navigator.vibrate(500); // Vibrate for 500ms
          }
          setTimeout(() => {
            setIsVibrating(false);
            setLives(prevLives => {
              const newLives = prevLives - 1;
              if (newLives < 0) {
                setGameState("gameover");
                gameOverSound && gameOverSound.play(); // Play game over sound
                return 0;
              } else {
                // Reset ball position and angle after losing a life
                currentLevelData.ball.x = currentLevelData.paddle.x + currentLevelData.paddle.width / 2;
                currentLevelData.ball.y = canvas.height - currentLevelData.paddle.height - currentLevelData.ball.radius - 1;
                currentLevelData.ball.angle = Math.PI / 6;
                currentLevelData.ball.speed = levels[level - 1].ball.speed;
                return newLives;
              }
            });
          }, 500); // Delay to allow vibration
        }
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    if (gameState === "playing") {
      gameLoop();
    }

    return () => {
      document.removeEventListener("keydown", keyDownHandler, false);
      document.removeEventListener("keyup", keyUpHandler, false);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState, score, currentLevelData, lives, isVibrating, level, levels]);

  const startGame = () => {
    if (currentLevelData) {
      currentLevelData.bricks.forEach(brick => brick.hit = false); // Reset bricks
      // Ensure ball starts on the paddle
      currentLevelData.ball.x = currentLevelData.paddle.x + currentLevelData.paddle.width / 2;
      currentLevelData.ball.y = canvasRef.current!.height - currentLevelData.paddle.height - currentLevelData.ball.radius - 1;
      currentLevelData.ball.speed = levels[level - 1].ball.speed;
    }
    setScore(0);
    setLives(3);
    setGameState("playing");
  };

  const pauseGame = () => {
    setGameState("paused");
  };

  const resumeGame = () => {
    setGameState("playing");
  };

  const resetGame = () => {
    if (currentLevelData) {
      currentLevelData.bricks.forEach(brick => brick.hit = false); // Reset bricks
      // Ensure ball starts on the paddle
      currentLevelData.ball.x = currentLevelData.paddle.x + currentLevelData.paddle.width / 2;
      currentLevelData.ball.y = canvasRef.current!.height - currentLevelData.paddle.height - currentLevelData.ball.radius - 1;
      currentLevelData.ball.speed = levels[level - 1].ball.speed;
    }
    setScore(0);
    setLives(3);
    setGameState("start");
    setCurrentLevelData(levels[0]);
  };

  const handleLevelChange = (newLevel: number) => {
    if (newLevel >= 1 && newLevel <= levels.length) {
      setLevel(newLevel);
      setCurrentLevelData(levels[newLevel - 1]);
      // Ensure ball starts on the paddle when level changes
      if (levels[newLevel - 1]) {
          levels[newLevel - 1].ball.x = levels[newLevel - 1].paddle.x + levels[newLevel - 1].paddle.width / 2;
          levels[newLevel - 1].ball.y = canvasRef.current!.height - levels[newLevel - 1].paddle.height - levels[newLevel - 1].ball.radius - 1;
      }
      setGameState("start"); // or "playing" if you want to auto-start
    } else {
      alert(`سطح ${newLevel} دستیاب نہیں ہے۔`); // Level ${newLevel} is not available in Urdu
    }
  };

  return (
    <div className="flex flex-col items-center">
      <audio ref={paddleHitSoundRef} src="/sounds/paddleHit.wav" preload="auto" />
      <audio ref={brickBreakSoundRef} src="/sounds/brickBreak.wav" preload="auto" />
      <audio ref={gameOverSoundRef} src="/sounds/gameOver.wav" preload="auto" />

      <canvas ref={canvasRef} width="640" height="480" className="border-2 border-white rounded-md"></canvas>

      {gameState === "start" && (
        <div className="absolute flex flex-col items-center justify-center w-full h-full bg-black bg-opacity-75">
          <h1 className="text-3xl text-white mb-4">اینٹوں کا توڑ</h1> {/* Brick Blitz in Urdu */}
          <Button onClick={startGame}>کھیل شروع کریں</Button>{/* Start Game in Urdu */}
          <div className="mt-4">
            <Button onClick={() => handleLevelChange(1)}>لیول 1</Button>
            <Button onClick={() => handleLevelChange(2)}>لیول 2</Button>
            <Button onClick={() => handleLevelChange(3)}>لیول 3</Button>
          </div>
        </div>
      )}

      {gameState === "paused" && (
        <div className="absolute flex flex-col items-center justify-center w-full h-full bg-black bg-opacity-75">
          <h1 className="text-3xl text-white mb-4">موقوف</h1> {/* Paused in Urdu */}
          <Button onClick={resumeGame}>دوبارہ شروع کریں</Button>{/* Resume Game in Urdu */}
          <Button onClick={resetGame}>دوبارہ شروع کریں</Button>{/* Restart Game in Urdu */}
        </div>
      )}

      {gameState === "gameover" && (
        <div className="absolute flex flex-col items-center justify-center w-full h-full bg-black bg-opacity-75">
          <h1 className="text-3xl text-white mb-4">گیم ختم</h1> {/* Game Over in Urdu */}
          <p className="text-white text-lg mb-2">سکور: {score}</p>
          <Button onClick={resetGame}>دوبارہ شروع کریں</Button>{/* Restart Game in Urdu */}
        </div>
      )}
    </div>
  );
};

export default BrickBreaker;

// Helper function to create bricks
function createBricks(canvasWidth: number, canvasHeight: number, level: number, { rows, cols }: { rows: number; cols: number }): Brick[] {
  const brickWidth = Math.floor(canvasWidth / cols) - 10; // Adjust brickWidth calculation
  const brickHeight = 20;
  const padding = 10;
  const offsetTop = 50;
  const offsetLeft = 30;

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

// Function to generate random colors for the bricks
function getRandomColor(): string {
  const colors = ['red', 'green', 'yellow', 'orange'];
  return colors[Math.floor(Math.random() * colors.length)];
}
