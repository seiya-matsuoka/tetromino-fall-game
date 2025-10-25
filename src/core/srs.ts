import type { Mino, ActivePiece } from './types';
import type { Cell } from './store';

/**
 * 4x4 の北向き形状。
 * 1=ブロックあり / 0=なし。
 */
export const SHAPES: Readonly<Record<Mino, number[][]>> = {
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

/**
 * 公式スポーン（北向き）：
 * - 4x4 スポーンボックスの「左上」を x=3、O のみ x=4 に置く
 * - y は天井の最上段（y=0）。HIDDEN_ROWS を2用意している想定なので可視外で問題なし
 */
export function spawnPiece(type: Mino): ActivePiece {
  const x = type === 'O' ? 4 : 3; // Oだけ右寄せ
  const y = 0; // スポーンボックスの上端は天井最上段
  return { type, x, y, rot: 0 };
}

/** rot（0..3, 時計回り）に応じた 4x4 形状を返す */
export function shapeAt(type: Mino, rot: 0 | 1 | 2 | 3): number[][] {
  const base = SHAPES[type];
  if (rot === 0) return base;

  // 4x4 の 90°時計回り回転
  const rotateCW = (a: number[][]): number[][] => {
    const b = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        b[x][3 - y] = a[y][x];
      }
    }
    return b;
  };

  let cur = base;
  for (let i = 0; i < rot; i++) {
    cur = rotateCW(cur);
  }
  return cur;
}

/** rot を考慮して盤面座標で occupied セルを走査 */
export function forEachCellAt(piece: ActivePiece, fn: (gx: number, gy: number) => void) {
  const shape = shapeAt(piece.type, piece.rot);
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      if (!shape[y][x]) continue;
      fn(piece.x + x, piece.y + y);
    }
}

/** 盤面外 or 既存ブロックに当たるなら true */
export function collides(board: Cell[][], piece: ActivePiece): boolean {
  const rows = board.length;
  const cols = board[0].length;
  let hit = false;
  forEachCellAt(piece, (gx, gy) => {
    if (hit) return;
    // 左右/下のはみ出し or 既存ブロック
    if (gx < 0 || gx >= cols || gy >= rows) {
      hit = true;
      return;
    }
    // 上はみ出し（gy < 0）は今回の座標系では発生しない想定
    if (gy >= 0 && board[gy][gx] !== 0) {
      hit = true;
    }
  });
  return hit;
}
