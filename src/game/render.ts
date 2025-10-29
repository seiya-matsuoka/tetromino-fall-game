import type { Store } from '../core/store';
import type { Mino, ActivePiece } from '../core/types';
import { shapeAt } from '../core/srs';
import { COLS, VISIBLE_ROWS, HIDDEN_ROWS } from '../core/store';
import { tryMove } from '../core/collision';

// ピースごとのカラー（UI表示用）
const PIECE_COLORS: Record<Mino, string> = {
  I: '#22d3ee',
  O: '#facc15',
  T: '#a78bfa',
  L: '#fb923c',
  J: '#60a5fa',
  S: '#34d399',
  Z: '#f87171',
};

// boardセルの色 (MINO_IDに対応)
// board側では 0=空, 1..7=ブロックID
const ID_COLORS: Record<number, string> = {
  1: '#22d3ee', // I
  2: '#facc15', // O
  3: '#a78bfa', // T
  4: '#fb923c', // L
  5: '#60a5fa', // J
  6: '#34d399', // S
  7: '#f87171', // Z
};

function roundRect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/**
 * NEXTに表示する4x4プレビュー用
 */
function drawNextBox(cv: HTMLCanvasElement, type: Mino | undefined) {
  const dpr = window.devicePixelRatio || 1;
  const rect = cv.getBoundingClientRect();
  const css = Math.min(Math.floor(rect.width), Math.floor(rect.height));
  cv.style.width = `${css}px`;
  cv.style.height = `${css}px`;
  cv.width = Math.floor(css * dpr);
  cv.height = Math.floor(css * dpr);
  const c = cv.getContext('2d')!;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);

  c.clearRect(0, 0, css, css);
  if (!type) return;

  const shape = shapeAt(type, 0); // NEXT表示は常に北向き
  const cell = Math.floor(css / 5);
  const padding = Math.floor((css - cell * 4) / 2);

  // 形のバウンディングをとって中央寄せ
  let minX = 4,
    maxX = -1,
    minY = 4,
    maxY = -1;
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      if (!shape[y][x]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  const wCells = maxX - minX + 1;
  const hCells = maxY - minY + 1;
  const offsetX = padding + Math.floor((4 - wCells) / 2) * cell - minX * cell;
  const offsetY = padding + Math.floor((4 - hCells) / 2) * cell - minY * cell;

  c.fillStyle = PIECE_COLORS[type];
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      if (!shape[y][x]) continue;
      const px = offsetX + x * cell;
      const py = offsetY + y * cell;
      const r = Math.max(2, Math.floor(cell * 0.15));
      roundRect(c, px, py, cell - 1, cell - 1, r);
      c.fill();
    }
}

/**
 * active ピースを落ちない高さまで下に落としたゴーストを返す
 * - boardに固定されているブロックを考慮
 * - tryMove() を1マスずつ使って落とせるところまで進める
 */
function computeGhostPiece(board: number[][], piece: ActivePiece): ActivePiece {
  let ghost = { ...piece };
  while (true) {
    const moved = tryMove(board, ghost, 0, 1);
    if (!moved) break; // これ以上は落ちない
    ghost = moved;
  }
  return ghost;
}

/**
 * 盤面とアクティブピースをcanvasに描画する
 * - boardに固定済みのブロック
 * - ゴースト（落下予定位置）
 * - activeピース（落下中のもの）
 * - グリッド線
 */
function drawBoardLayer(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, store: Store) {
  const state = store.getState();
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const cell = Math.min(w / COLS, h / VISIBLE_ROWS);

  // DPR対応
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // 背景クリア
  ctx.clearRect(0, 0, w, h);

  // 1. 固定済みboardを描画
  for (let gy = 0; gy < VISIBLE_ROWS; gy++) {
    const boardY = gy + HIDDEN_ROWS; // boardは天井ぶん含む
    for (let gx = 0; gx < COLS; gx++) {
      const cellId = state.board[boardY][gx];
      if (!cellId) continue; // 0は空
      ctx.fillStyle = ID_COLORS[cellId] || '#888';

      const px = gx * cell;
      const py = gy * cell;
      const r = Math.max(2, Math.floor(cell * 0.15));
      roundRect(ctx, px + 0.5, py + 0.5, cell - 1, cell - 1, r);
      ctx.fill();
    }
  }

  // 2. ゴーストを描画
  if (state.active) {
    const active = state.active;
    const ghost = computeGhostPiece(state.board, active);

    const shapeGhost = shapeAt(active.type, ghost.rot);

    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = PIECE_COLORS[active.type];

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if (!shapeGhost[y][x]) continue;
        const gy = ghost.y + y - HIDDEN_ROWS;
        const gx = ghost.x + x;
        if (gy < 0 || gy >= VISIBLE_ROWS) continue;
        if (gx < 0 || gx >= COLS) continue;

        const px = gx * cell;
        const py = gy * cell;
        const r = Math.max(2, Math.floor(cell * 0.15));
        roundRect(ctx, px + 0.5, py + 0.5, cell - 1, cell - 1, r);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // 3. アクティブピースを描画
  if (state.active) {
    const p = state.active;
    const shape = shapeAt(p.type, p.rot);
    ctx.fillStyle = PIECE_COLORS[p.type];

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if (!shape[y][x]) continue;
        const gy = p.y + y - HIDDEN_ROWS;
        const gx = p.x + x;
        if (gy < 0 || gy >= VISIBLE_ROWS) continue;
        if (gx < 0 || gx >= COLS) continue;

        const px = gx * cell;
        const py = gy * cell;
        const r = Math.max(2, Math.floor(cell * 0.15));
        roundRect(ctx, px + 0.5, py + 0.5, cell - 1, cell - 1, r);
        ctx.fill();
      }
    }
  }

  // 4. グリッド線を描画（見た目用）
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let gx = 0; gx <= COLS; gx++) {
    const x = gx * cell + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, VISIBLE_ROWS * cell);
  }
  for (let gy = 0; gy <= VISIBLE_ROWS; gy++) {
    const y = gy * cell + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(COLS * cell, y);
  }
  ctx.stroke();
}

/**
 * スコア / レベル / ポーズボタン / NEXT などのUI要素に反映するセットアップ
 */
function initHUD(
  store: Store,
  ui: {
    highScore: HTMLElement;
    score: HTMLElement;
    level: HTMLElement;
    pauseBtn: HTMLElement;
    nextCanvases: HTMLCanvasElement[];
  }
) {
  store.subscribe((s) => {
    ui.highScore.textContent = String(s.highScore);
    ui.score.textContent = String(s.score);
    ui.level.textContent = String(s.level);
    ui.pauseBtn.textContent = s.paused ? '▶' : '⏸';
    for (let i = 0; i < ui.nextCanvases.length; i++) {
      drawNextBox(ui.nextCanvases[i], s.nextQueue[i]);
    }
  });
}

/**
 * レンダラーを組み立てるファクトリ
 * main.ts からは render() だけ呼べばOK
 */
export function createRenderer(
  store: Store,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  ui: {
    highScore: HTMLElement;
    score: HTMLElement;
    level: HTMLElement;
    pauseBtn: HTMLElement;
    nextCanvases: HTMLCanvasElement[];
  }
) {
  // HUD購読を初期化（1回でOK）
  initHUD(store, ui);

  function render(_alpha: number) {
    // alphaは今は未使用
    drawBoardLayer(ctx, canvas, store);
  }

  return {
    render,
  };
}
