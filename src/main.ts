import './style.css';
import { GameLoop } from './core/loop';
import { createStore, HIDDEN_ROWS } from './core/store';
import type { Store } from './core/store';
import type { Mino } from './core/types';
import { spawnPiece, collides, shapeAt } from './core/srs';
import { isGrounded, tryMove, tryRotateSRS } from './core/collision';

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

const PIECE_COLORS: Record<Mino, string> = {
  I: '#22d3ee', // cyan
  O: '#facc15', // yellow
  T: '#a78bfa', // purple
  L: '#fb923c', // orange
  J: '#60a5fa', // blue
  S: '#34d399', // green
  Z: '#f87171', // red
};

function drawActive() {
  const s = store.getState();
  const p = s.active;
  if (!p) return;

  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const cell = Math.min(w / COLS, h / VISIBLE_ROWS);
  const shape = shapeAt(p.type, p.rot);
  const c = ctx;

  c.fillStyle = PIECE_COLORS[p.type];
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      if (!shape[y][x]) continue;
      const gy = p.y + y - HIDDEN_ROWS;
      const gx = p.x + x;
      if (gy < 0 || gy >= VISIBLE_ROWS || gx < 0 || gx >= COLS) continue; // 画面外は描かない
      const px = gx * cell;
      const py = gy * cell;
      const r = Math.max(2, Math.floor(cell * 0.15));
      roundRect(ctx, px + 0.5, py + 0.5, cell - 1, cell - 1, r);
      ctx.fill();
    }
}

// ----- ストア -----
const store = createStore();

spawnFromNext();

// UI反映：スコア/レベル
const ui = {
  highScore: document.getElementById('highScore')!,
  score: document.getElementById('score')!,
  level: document.getElementById('level')!,
  pauseBtn: document.getElementById('pauseBtn')!,
  nextCanvases: [
    document.getElementById('next0') as HTMLCanvasElement,
    document.getElementById('next1') as HTMLCanvasElement,
    document.getElementById('next2') as HTMLCanvasElement,
  ],
};

// ----- NEXT描画ユーティリティ -----

// 4x4 のビットマップで北向きの形を定義（1=ブロックあり, 0=なし）
const SHAPES: Record<Mino, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [0, 1, 1, 0],
    [0, 1, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  T: [
    [0, 1, 0, 0],
    [1, 1, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  L: [
    [0, 0, 1, 0],
    [1, 1, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0, 0],
    [1, 1, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  S: [
    [0, 1, 1, 0],
    [1, 1, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  Z: [
    [1, 1, 0, 0],
    [0, 1, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
};

function drawNextBox(cv: HTMLCanvasElement, type: Mino | undefined) {
  // ディスプレイ倍率に対応
  const dpr = window.devicePixelRatio || 1;
  const rect = cv.getBoundingClientRect();
  const css = Math.min(Math.floor(rect.width), Math.floor(rect.height)); // 正方形にそろえる

  // CSSサイズと実ピクセル（width/height属性）を同期
  cv.style.width = `${css}px`;
  cv.style.height = `${css}px`;
  cv.width = Math.floor(css * dpr);
  cv.height = Math.floor(css * dpr);

  const c = cv.getContext('2d')!;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);

  // 背景クリア
  c.clearRect(0, 0, css, css);

  if (!type) return;

  const shape = SHAPES[type];

  // 1マスのサイズ
  const cell = Math.floor(css / 5); // 余白をとる
  const padding = Math.floor((css - cell * 4) / 2);

  // 形のバウンディングを計算して中央寄せ
  let minX = 4,
    maxX = -1,
    minY = 4,
    maxY = -1;
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      if (shape[y][x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  const wCells = maxX - minX + 1;
  const hCells = maxY - minY + 1;

  const offsetX = padding + Math.floor((4 - wCells) * 0.5) * cell - minX * cell;
  const offsetY = padding + Math.floor((4 - hCells) * 0.5) * cell - minY * cell;

  // 角丸の四角で各セルを描く
  c.fillStyle = PIECE_COLORS[type];
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      if (!shape[y][x]) continue;
      const px = offsetX + x * cell;
      const py = offsetY + y * cell;
      const r = Math.max(2, Math.floor(cell * 0.15)); // 角丸半径：セルサイズに比例
      roundRect(c, px, py, cell - 1, cell - 1, r);
      c.fill();
    }
}

/** 角丸の矩形パスを作るヘルパー */
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

// スコア/レベル/ポーズ表示を同期し、NEXT3を描く
store.subscribe((s) => {
  ui.score.textContent = String(s.score);
  ui.level.textContent = String(s.level);
  ui.pauseBtn.textContent = s.paused ? '▶' : '⏸';

  for (let i = 0; i < ui.nextCanvases.length; i++) {
    drawNextBox(ui.nextCanvases[i], s.nextQueue[i]);
  }
});

// ----- スポーン（NEXT -> active） -----
function spawnFromNext() {
  // すでに操作中ピースがあるなら何もしない
  if (store.getState().active) return;

  const type = store.consumeNext(); // 先頭を取得（末尾は自動補充）
  const piece = spawnPiece(type);
  const board = store.getState().board;

  if (collides(board, piece)) {
    store.setOver(true);
    store.setPaused(true);
    loop.stop();
    return;
  }
  store.setActive(piece);
}

// 起動時に1回スポーン
spawnFromNext();

let fallTimerMs = 0; // 一定時間たったら1マス落とす
let lockTimerMs = 0; // 接地後にカウントするロック遅延
let wasGrounded = false; // 前フレームで接地してたか
let lastGroundSig: string | null = null; // 接地中の位置/回転のスナップショット

const GRAVITY_TABLE_MS: number[] = [
  0,
  1000, // level 1
  793, // level 2
  618, // level 3
  473, // level 4
  355, // level 5
  262, // level 6
  190, // level 7
  135, // level 8
  94, // level 9
  64, // level10
  43, // level11
  28, // level12
  18, // level13
  11, // level14
  7, // level15
  4, // level16
  3, // level17
  2, // level18
  1, // level19
  1, // level20以降も1ms扱い
];

// レベル→落下間隔(ms)を返す小ヘルパ
function getFallIntervalMs(level: number): number {
  const idx = Math.min(Math.max(level, 1), 20);
  return GRAVITY_TABLE_MS[idx];
}

function sigOf(piece: { x: number; y: number; rot: number }): string {
  return `${piece.x},${piece.y},${piece.rot}`;
}

const LOCK_DELAY_MS = 500;

// ミノの種類を board セル用の数値IDにするマップ
const MINO_ID: Record<Mino, number> = {
  I: 1,
  O: 2,
  T: 3,
  L: 4,
  J: 5,
  S: 6,
  Z: 7,
};

function fixActiveIntoBoard() {
  const s = store.getState();
  const p = s.active;
  if (!p) return;

  // boardをディープコピー（行ごとコピーで十分）
  const newBoard = s.board.map((row) => [...row]);

  const shape = shapeAt(p.type, p.rot);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      if (!shape[y][x]) continue;

      const gx = p.x + x;
      const gy = p.y + y;

      // 盤面範囲チェック
      if (gy < 0 || gy >= newBoard.length) continue;
      if (gx < 0 || gx >= newBoard[0].length) continue;

      newBoard[gy][gx] = MINO_ID[p.type];
    }
  }

  // 盤面とアクティブピースを更新
  store.setBoard(newBoard);
  store.setActive(null);
}

// --- ゲームループ（固定タイムステップ） ---
function update(dtSec: number) {
  // ms に直す
  const dtMs = dtSec * 1000;

  const s = store.getState();

  // ゲーム停止中なら何もしない
  if (s.paused || s.over) return;

  // アクティブピースがいないならスポーン試行して抜ける
  if (!s.active) {
    spawnFromNext();
    // タイマー系リセット
    fallTimerMs = 0;
    lockTimerMs = 0;
    wasGrounded = false;
    lastGroundSig = null;
    return;
  }

  const active = s.active;

  // 接地してるか
  const grounded = isGrounded(s.board, active);

  // 接地していないなら：重力落下タイマーを進める
  if (!grounded) {
    wasGrounded = false;
    lockTimerMs = 0;
    lastGroundSig = null;

    // ms を足す
    fallTimerMs += dtMs;

    const fallInterval = getFallIntervalMs(s.level);
    if (fallTimerMs >= fallInterval) {
      // 1マス下に動けるか
      const moved = tryMove(s.board, active, 0, 1);
      if (moved) {
        store.setActive(moved);
      }
      fallTimerMs = 0; // 次の落下カウントをリセット
    }

    return; // groundedでないならここまで
  }

  // groundedしてる場合（床/他ブロックの上に乗ってる）
  if (!wasGrounded) {
    // 接地した瞬間
    wasGrounded = true;
    lockTimerMs = 0;
    lastGroundSig = sigOf(active);
  } else {
    // 接地継続中
    const currentSig = sigOf(active);
    if (currentSig !== lastGroundSig) {
      // 接地中に動いた/回転したのでロック猶予をリセット
      lockTimerMs = 0;
      lastGroundSig = currentSig;
    } else {
      // 同じ場所で止まりっぱなし → ロックタイマー進行
      lockTimerMs += dtMs; // msで加算
    }
  }

  // ロックタイマーが閾値を超えたら固定処理
  if (lockTimerMs >= LOCK_DELAY_MS) {
    fixActiveIntoBoard(); // active=null
    spawnFromNext(); // 次のピースをアクティブに
    fallTimerMs = 0;
    lockTimerMs = 0;
    wasGrounded = false;
    lastGroundSig = null;
  }
}

function render(_alpha: number) {
  drawGrid();
  drawActive();
}

const loop = new GameLoop(update, render, 1 / 60);

ui.pauseBtn.addEventListener('click', () => {
  const paused = store.getState().paused;
  if (paused) {
    store.setPaused(false);
    loop.start();
  } else {
    store.setPaused(true);
    loop.stop();
  }
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

// --- 開発用：コンソール/キーから試す用 ---
declare global {
  interface Window {
    store: Store;
    moveL: () => void;
    moveR: () => void;
    moveD: () => void;
    rotCW: () => void;
    spawnFromNext?: () => void;
  }
}

if (import.meta.env.DEV) {
  window.store = store;
  window.moveL = () => {
    const s = store.getState();
    if (!s.active) return;
    const np = tryMove(s.board, s.active, -1, 0);
    if (np) store.setActive(np);
  };
  window.moveR = () => {
    const s = store.getState();
    if (!s.active) return;
    const np = tryMove(s.board, s.active, 1, 0);
    if (np) store.setActive(np);
  };
  window.moveD = () => {
    const s = store.getState();
    if (!s.active) return;
    const np = tryMove(s.board, s.active, 0, 1);
    if (np) store.setActive(np);
  };
  window.rotCW = () => {
    const s = store.getState();
    if (!s.active) return;
    const np = tryRotateSRS(s.board, s.active, 'cw');
    if (np) store.setActive(np);
  };

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    const s = store.getState();
    if (!s.active) return;
    if (k === 'arrowleft') {
      const np = tryMove(s.board, s.active, -1, 0);
      if (np) store.setActive(np);
    }
    if (k === 'arrowright') {
      const np = tryMove(s.board, s.active, 1, 0);
      if (np) store.setActive(np);
    }
    if (k === 'arrowdown') {
      const np = tryMove(s.board, s.active, 0, 1);
      if (np) store.setActive(np);
    }
    if (k === 'x') {
      const np = tryRotateSRS(s.board, s.active, 'cw');
      if (np) store.setActive(np);
    }
  });
}
