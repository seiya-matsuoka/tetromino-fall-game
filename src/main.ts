import './style.css';
import { GameLoop } from './core/loop';

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

// --- ゲームループ（固定タイムステップ） ---
function update(_dt: number) {
  // まだゲームロジックなし
}

function render(_alpha: number) {
  // レンダリングは毎フレーム1回
  drawGrid();
}

const loop = new GameLoop(update, render, 1 / 60);

// UI: ポーズボタンで start/stop
const pauseBtn = document.getElementById('pauseBtn')!;
function setPaused(paused: boolean) {
  if (paused) {
    loop.stop();
    pauseBtn.textContent = '▶';
  } else {
    loop.start();
    pauseBtn.textContent = '⏸';
  }
}
pauseBtn.addEventListener('click', () => setPaused(loop.isRunning));

// タブ非表示時は自動で一時停止（復帰で再開）
document.addEventListener('visibilitychange', () => {
  if (document.hidden) loop.stop();
  else loop.start();
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
