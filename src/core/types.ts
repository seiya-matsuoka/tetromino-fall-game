/** ミノ種別 */
export type Mino = 'I' | 'O' | 'T' | 'L' | 'J' | 'S' | 'Z';

/** 操作中ピース */
export interface ActivePiece {
  type: Mino;
  x: number; // 左上を0,0
  y: number; // 上に行くほど小さい（0は天井最上段）
  rot: 0 | 1 | 2 | 3; // 0=北, 1=東, 2=南, 3=西
}
