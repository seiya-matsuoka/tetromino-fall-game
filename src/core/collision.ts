import type { ActivePiece, Mino } from './types';
import type { Cell } from './store';
import { collides } from './srs';

// 回転インデックス
export type Rot = 0 | 1 | 2 | 3;

// 回転方向
export type RotDir = 'cw' | 'ccw';

/**
 * その場所にその向きで置けるなら true
 */
export function canPlace(board: Cell[][], piece: ActivePiece): boolean {
  return !collides(board, piece);
}

/**
 * dx, dy 分だけ平行移動した結果が置けるならその新しいピースを返す
 * 置けないなら null
 */
export function tryMove(
  board: Cell[][],
  piece: ActivePiece,
  dx: number,
  dy: number
): ActivePiece | null {
  const cand: ActivePiece = {
    ...piece,
    x: piece.x + dx,
    y: piece.y + dy,
  };
  return canPlace(board, cand) ? cand : null;
}

/**
 * 1ステップ下に落ちられない = 接地してる の判定
 */
export function isGrounded(board: Cell[][], piece: ActivePiece): boolean {
  return tryMove(board, piece, 0, 1) === null;
}

/**
 * rot と回転方向から、新しい rot を求める（0→1→2→3→0）
 */
function nextRot(rot: Rot, dir: RotDir): Rot {
  return ((rot + (dir === 'cw' ? 1 : 3)) & 3) as Rot;
}

/* =========================
   SRSキックテーブル
   ========================= */

/**
 * JLSTZ用 SRSキック（CW）
 *  from rot -> array of [dx, dy] 候補
 */
const JLSTZ_CW: Record<Rot, Array<[number, number]>> = {
  0: [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  1: [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  2: [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  3: [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
};

/**
 * JLSTZ用 SRSキック（CCW）
 */
const JLSTZ_CCW: Record<Rot, Array<[number, number]>> = {
  0: [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  3: [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  2: [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  1: [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
};

/**
 * I用 SRSキック（CW）
 */
const I_CW: Record<Rot, Array<[number, number]>> = {
  0: [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, -1],
    [1, 2],
  ],
  1: [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, 2],
    [2, -1],
  ],
  2: [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, 1],
    [-1, -2],
  ],
  3: [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, -2],
    [-2, 1],
  ],
};

/**
 * I用 SRSキック（CCW）
 */
const I_CCW: Record<Rot, Array<[number, number]>> = {
  0: [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, -1],
    [-1, 2],
  ],
  3: [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, 2],
    [-2, -1],
  ],
  2: [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, 1],
    [1, -2],
  ],
  1: [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, 1],
  ],
};

/**
 * Oミノ用オフセット。
 * 4x4マトリクスの左上が piece.x,piece.yに合わせた
 * 回転姿勢ごとの原点ずらし量。
 *
 * rot: 0,1,2,3 (CW回転で進む)
 */
const O_OFFSETS: Record<Rot, [number, number]> = {
  0: [-1, 1],
  1: [-2, 0],
  2: [-1, -1],
  3: [0, 0],
};

/**
 * from向き→to向きへの回転に対して
 * SRS的に試す (dx,dy) 候補列を返す
 * - JLSTZ / I は公式キック表
 * - O は原点オフセットの差分（1候補だけ）
 */
function getKickTests(type: Mino, from: Rot, to: Rot): Array<[number, number]> {
  if (type === 'O') {
    const [fx, fy] = O_OFFSETS[from];
    const [tx, ty] = O_OFFSETS[to];
    // Oは「回転後の正しい原点 - 回転前の原点」の差分だけ動かす
    const dx = tx - fx;
    const dy = ty - fy;
    return [[dx, dy]];
  }

  const clockwise = ((to - from) & 3) === 1; // 0→1→2→3→0 がCW
  if (type === 'I') {
    return clockwise ? I_CW[from] : I_CCW[from];
  }
  // J/L/S/T/Z
  return clockwise ? JLSTZ_CW[from] : JLSTZ_CCW[from];
}

/**
 * SRS準拠の回転を試みる
 * - dir は 'cw' or 'ccw'
 * - キック候補を順に試し、衝突しない最初の位置/向きを返す
 * - どこにも置けない場合は null（回転キャンセル）
 */
export function tryRotateSRS(board: Cell[][], piece: ActivePiece, dir: RotDir): ActivePiece | null {
  const from = piece.rot as Rot;
  const to = nextRot(from, dir);

  const tests = getKickTests(piece.type, from, to);
  for (const [dx, dy] of tests) {
    const cand: ActivePiece = {
      ...piece,
      rot: to,
      x: piece.x + dx,
      y: piece.y + dy,
    };
    if (!collides(board, cand)) {
      return cand;
    }
  }
  return null;
}
