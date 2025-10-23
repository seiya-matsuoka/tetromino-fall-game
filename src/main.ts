import './style.css';

const canvas = document.getElementById('board') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const COLS = 10;
const VISIBLE_ROWS = 20;

/** 実サイズに合わせてCanvasをDPR対応でセットし、グリッドだけ描く */
function resizeAndDraw() {
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

  drawGrid();
}

function drawGrid() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  ctx.clearRect(0, 0, w, h);

  const cell = Math.min(w / COLS, h / VISIBLE_ROWS);

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

window.addEventListener('resize', resizeAndDraw);
resizeAndDraw();

// 参照を保持
const ui = {
  highScore: document.getElementById('highScore')!,
  score: document.getElementById('score')!,
  level: document.getElementById('level')!,
  pauseBtn: document.getElementById('pauseBtn')!,
  btnRotate: document.getElementById('btnRotate')!,
  btnLeft: document.getElementById('btnLeft')!,
  btnRight: document.getElementById('btnRight')!,
  btnDown: document.getElementById('btnDown')!,
};
void ui;
