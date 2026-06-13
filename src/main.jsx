import React, { useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { create } from 'zustand';
import './styles.css';

const VIEWPORT = { width: 960, height: 540 };
const WORLD_WIDTH = 3450;
const GRAVITY = 1700;
const MOVE_SPEED = 430;
const JUMP_SPEED = 760;
const PLAYER = { width: 60, height: 106 };

const platforms = [
  { id: 'ground-a', x: 0, y: 488, width: 820, height: 52, type: 'ground' },
  { id: 'ground-b', x: 940, y: 488, width: 660, height: 52, type: 'ground' },
  { id: 'ground-c', x: 1740, y: 488, width: 780, height: 52, type: 'ground' },
  { id: 'ground-d', x: 2700, y: 488, width: 750, height: 52, type: 'ground' },
  { id: 'ledge-1', x: 340, y: 378, width: 180, height: 24 },
  { id: 'ledge-2', x: 650, y: 302, width: 150, height: 24 },
  { id: 'ledge-3', x: 1125, y: 386, width: 190, height: 24 },
  { id: 'ledge-4', x: 1465, y: 318, width: 180, height: 24 },
  { id: 'ledge-5', x: 1930, y: 390, width: 190, height: 24 },
  { id: 'ledge-6', x: 2260, y: 324, width: 165, height: 24 },
  { id: 'ledge-7', x: 2850, y: 384, width: 210, height: 24 },
  { id: 'ledge-8', x: 3170, y: 312, width: 190, height: 24 }
];

const coinSeed = [
  [385, 330],
  [468, 330],
  [690, 254],
  [759, 254],
  [1175, 338],
  [1255, 338],
  [1515, 270],
  [1595, 270],
  [1990, 342],
  [2070, 342],
  [2315, 276],
  [2895, 336],
  [2990, 336],
  [3220, 264],
  [3315, 264]
];

const enemySeed = [
  { id: 'mush-a', x: 590, y: 444, minX: 500, maxX: 760, dir: 1 },
  { id: 'mush-b', x: 1230, y: 444, minX: 1020, maxX: 1450, dir: -1 },
  { id: 'mush-c', x: 2050, y: 444, minX: 1840, maxX: 2380, dir: 1 },
  { id: 'mush-d', x: 2950, y: 444, minX: 2760, maxX: 3330, dir: -1 }
];

const makeInitialState = () => ({
  status: 'ready',
  player: {
    x: 78,
    y: 360,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: false,
    invincibleUntil: 0
  },
  keys: {},
  cameraX: 0,
  coins: coinSeed.map(([x, y], index) => ({ id: `coin-${index}`, x, y, collected: false })),
  enemies: enemySeed.map((enemy) => ({ ...enemy })),
  score: 0,
  lives: 3,
  elapsed: 0,
  faceImage: null,
  message: 'Press Start or Space'
});

const useGameStore = create((set, get) => ({
  ...makeInitialState(),
  setFaceImage: (faceImage) => set({ faceImage }),
  setKey: (key, down) => set((state) => ({ keys: { ...state.keys, [key]: down } })),
  start: () => set({ ...makeInitialState(), faceImage: get().faceImage, status: 'playing', message: '' }),
  pause: () =>
    set((state) => ({
      status: state.status === 'playing' ? 'paused' : state.status === 'paused' ? 'playing' : state.status,
      message: state.status === 'playing' ? 'Paused' : ''
    })),
  reset: () => set({ ...makeInitialState(), faceImage: get().faceImage }),
  tick: (dt) => {
    const state = get();
    if (state.status !== 'playing') return;

    let player = { ...state.player };
    const keys = state.keys;
    const wantLeft = keys.ArrowLeft || keys.KeyA;
    const wantRight = keys.ArrowRight || keys.KeyD;
    const wantJump = keys.Space || keys.ArrowUp || keys.KeyW;

    player.vx = wantLeft ? -MOVE_SPEED : wantRight ? MOVE_SPEED : 0;
    if (player.vx !== 0) player.facing = Math.sign(player.vx);
    if (wantJump && player.grounded) {
      player.vy = -JUMP_SPEED;
      player.grounded = false;
    }

    player.vy += GRAVITY * dt;
    const previous = { ...player };
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.x = clamp(player.x, 0, WORLD_WIDTH - PLAYER.width);

    let grounded = false;
    for (const platform of platforms) {
      const wasAbove = previous.y + PLAYER.height <= platform.y + 6;
      const isFalling = player.vy >= 0;
      const horizontalOverlap = player.x + PLAYER.width > platform.x && player.x < platform.x + platform.width;
      const verticalHit = player.y + PLAYER.height >= platform.y && player.y + PLAYER.height <= platform.y + platform.height + 30;

      if (isFalling && wasAbove && horizontalOverlap && verticalHit) {
        player.y = platform.y - PLAYER.height;
        player.vy = 0;
        grounded = true;
      }
    }
    player.grounded = grounded;

    let lives = state.lives;
    let status = state.status;
    let message = state.message;
    if (player.y > VIEWPORT.height + 180) {
      lives -= 1;
      player = { ...makeInitialState().player, invincibleUntil: state.elapsed + 1.5 };
      message = lives > 0 ? 'Careful - try again' : 'Game Over';
      status = lives > 0 ? 'playing' : 'lost';
    }

    let score = state.score;
    const coins = state.coins.map((coin) => {
      if (!coin.collected && rectsOverlap(player, PLAYER, { x: coin.x, y: coin.y }, { width: 34, height: 34 })) {
        score += 100;
        return { ...coin, collected: true };
      }
      return coin;
    });

    const enemies = state.enemies.map((enemy) => {
      let nextX = enemy.x + enemy.dir * 115 * dt;
      let dir = enemy.dir;
      if (nextX < enemy.minX || nextX > enemy.maxX) {
        dir *= -1;
        nextX = clamp(nextX, enemy.minX, enemy.maxX);
      }
      return { ...enemy, x: nextX, dir };
    });

    const now = state.elapsed + dt;
    for (const enemy of enemies) {
      const enemyRect = { x: enemy.x, y: enemy.y, width: 48, height: 44 };
      const stomp = previous.y + PLAYER.height <= enemy.y + 8 && player.vy > 0;
      if (rectsOverlap(player, PLAYER, enemyRect, enemyRect) && now > player.invincibleUntil) {
        if (stomp) {
          score += 250;
          enemy.x = enemy.minX - 9999;
        } else {
          lives -= 1;
          player = { ...player, x: Math.max(40, player.x - 120), y: 330, vx: 0, vy: -280, invincibleUntil: now + 1.6 };
          message = lives > 0 ? 'Ouch' : 'Game Over';
          if (lives <= 0) status = 'lost';
        }
      }
    }

    if (player.x > WORLD_WIDTH - 190) {
      status = 'won';
      message = 'You reached the goal';
      score += 1000;
    }

    const cameraX = clamp(player.x - VIEWPORT.width * 0.38, 0, WORLD_WIDTH - VIEWPORT.width);
    set({ player, coins, enemies, score, lives, cameraX, status, elapsed: now, message });
  }
}));

function Game() {
  const gameRef = useRef(null);
  const [renderScale, setRenderScale] = React.useState(1);
  const {
    status,
    player,
    cameraX,
    coins,
    enemies,
    score,
    lives,
    faceImage,
    message,
    setFaceImage,
    setKey,
    start,
    pause,
    reset,
    tick
  } = useGameStore();

  useEffect(() => {
    const frame = gameRef.current;
    if (!frame) return;

    const updateScale = () => {
      const { width } = frame.getBoundingClientRect();
      setRenderScale(width / VIEWPORT.width);
    };
    updateScale();

    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(updateScale);
      resizeObserver.observe(frame);
      return () => resizeObserver.disconnect();
    }

    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(event.code)) event.preventDefault();
      if (event.code === 'Enter') start();
      if (event.code === 'Escape') pause();
      setKey(event.code, true);
    };
    const onKeyUp = (event) => setKey(event.code, false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [pause, setKey, start]);

  useEffect(() => {
    let frameId;
    let lastTime = performance.now();
    const loop = (time) => {
      const dt = Math.min(0.032, (time - lastTime) / 1000);
      lastTime = time;
      tick(dt);
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [tick]);

  const collected = useMemo(() => coins.filter((coin) => coin.collected).length, [coins]);

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFaceImage(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <main className="app-shell">
      <section className="hud">
        <div>
          <p className="eyebrow">Big Face Run</p>
          <h1>Mushroom Ridge</h1>
        </div>
        <div className="stats" aria-label="Game stats">
          <span>Score {score}</span>
          <span>Coins {collected}/{coins.length}</span>
          <span>Lives {lives}</span>
        </div>
        <div className="actions">
          <label className="upload-button">
            <input type="file" accept="image/*" onChange={handleUpload} />
            Face
          </label>
          <button type="button" onClick={start}>Start</button>
          <button type="button" onClick={pause}>Pause</button>
          <button type="button" onClick={reset}>Reset</button>
        </div>
      </section>

      <section className="game-frame" ref={gameRef} aria-label="Mario like platform game">
        <div className="sky-layer">
          <div className="cloud cloud-a" />
          <div className="cloud cloud-b" />
          <div className="cloud cloud-c" />
        </div>

        <div
          className="world"
          style={{
            width: WORLD_WIDTH,
            height: VIEWPORT.height,
            transform: `scale(${renderScale}) translateX(${-cameraX}px)`
          }}
        >
          <div className="mountain mountain-a" />
          <div className="mountain mountain-b" />
          <div className="goal">
            <div className="flag" />
            <span>GOAL</span>
          </div>

          {platforms.map((platform) => (
            <div
              className={`platform ${platform.type === 'ground' ? 'ground' : ''}`}
              key={platform.id}
              style={{ left: platform.x, top: platform.y, width: platform.width, height: platform.height }}
            />
          ))}

          {coins.map((coin) => (
            <div
              className={`coin ${coin.collected ? 'collected' : ''}`}
              key={coin.id}
              style={{ left: coin.x, top: coin.y }}
            />
          ))}

          {enemies.map((enemy) => (
            <div className="enemy" key={enemy.id} style={{ left: enemy.x, top: enemy.y }}>
              <span />
            </div>
          ))}

          <Character player={player} faceImage={faceImage} />
        </div>

        {status !== 'playing' && (
          <div className="overlay">
            <div className="overlay-panel">
              <p>{message}</p>
              <button type="button" onClick={start}>{status === 'paused' ? 'Resume' : 'Start Game'}</button>
            </div>
          </div>
        )}
      </section>

      <section className="controls" aria-label="Controls">
        <span>Move: A/D or arrows</span>
        <span>Jump: Space/W/Up</span>
        <span>Enter: Start</span>
      </section>
    </main>
  );
}

function Character({ player, faceImage }) {
  const blinking = player.invincibleUntil > useGameStore.getState().elapsed;

  return (
    <div
      className={`hero ${blinking ? 'is-hit' : ''}`}
      style={{
        left: player.x,
        top: player.y,
        transform: `scaleX(${player.facing})`
      }}
    >
      <div className="hero-head">
        {faceImage ? <img src={faceImage} alt="Uploaded character face" /> : <span>YOU</span>}
      </div>
      <div className="hero-body">
        <div className="arm arm-left" />
        <div className="torso" />
        <div className="arm arm-right" />
        <div className="leg leg-left" />
        <div className="leg leg-right" />
      </div>
    </div>
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rectsOverlap(a, aSize, b, bSize) {
  return a.x < b.x + bSize.width && a.x + aSize.width > b.x && a.y < b.y + bSize.height && a.y + aSize.height > b.y;
}

createRoot(document.getElementById('root')).render(<Game />);
