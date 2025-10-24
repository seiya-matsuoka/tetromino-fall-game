import './style.css';
import { GameLoop } from './core/loop';
import { createStore } from './core/store';

const canvas = document.getElementById('board') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const COLS = 10;
const VISIBLE_ROWS = 20;

// --- DPR対応＋グリッド描画（既存の処理を関数化） ---
function resizeCanvasToWrapper() {
  const wrap = document.getElementById('boardWrap')!;
  const rect = wrap.getBoundingClientRect();

  const dpr = window.devicePixelRatio || 1;

  const cssW = Math.floor(rect.width);
  const cssH = Math.floor(rect.height);

  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawGrid() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const cell = Math.min(w / COLS, h / VISIBLE_ROWS);

  ctx.clearRect(0, 0, w, h);

  // 外枠
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, COLS * cell - 1, VISIBLE_ROWS * cell - 1);

  // グリッド
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  for (let c = 1; c < COLS; c++) {
    const x = Math.round(c * cell) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, VISIBLE_ROWS * cell);
    ctx.stroke();
  }
  for (let r = 1; r < VISIBLE_ROWS; r++) {
    const y = Math.round(r * cell) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(COLS * cell, y);
    ctx.stroke();
  }
}

// ----- ストア -----
const store = createStore();

// UI反映：スコア/レベル
const ui = {
  highScore: document.getElementById('highScore')!,
  score: document.getElementById('score')!,
  level: document.getElementById('level')!,
  pauseBtn: document.getElementById('pauseBtn')!,
};

store.subscribe((s) => {
  ui.score.textContent = String(s.score);
  ui.level.textContent = String(s.level);
  ui.pauseBtn.textContent = s.paused ? '▶' : '⏸';
});

// --- ゲームループ（固定タイムステップ） ---
function update(_dt: number) {
  // まだゲームロジックなし
}

function render(_alpha: number) {
  // レンダリングは毎フレーム1回
  drawGrid();
}

const loop = new GameLoop(update, render, 1 / 60);

// ポーズ切替をストア主導に
ui.pauseBtn.addEventListener('click', () => {
  store.setPaused(!store.getState().paused);
  if (store.getState().paused) loop.stop();
  else loop.start();
});

// タブ非表示/復帰
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    store.setPaused(true);
    loop.stop();
  } else {
    store.setPaused(false);
    loop.start();
  }
});

// 初期表示
window.addEventListener('resize', () => {
  resizeCanvasToWrapper();
  // リサイズで即描画
  drawGrid();
});
resizeCanvasToWrapper();
drawGrid(); // 起動フレーム（ループ開始前の1描画）
loop.start(); // ループ開始
