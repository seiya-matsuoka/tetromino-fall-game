import type { ActivePiece } from './types';
import type { Cell } from './store';
import { collides } from './srs';

export function canPlace(board: Cell[][], piece: ActivePiece): boolean {
  return !collides(board, piece);
}

export function tryMove(
  board: Cell[][],
  piece: ActivePiece,
  dx: number,
  dy: number
): ActivePiece | null {
  const cand = { ...piece, x: piece.x + dx, y: piece.y + dy } as ActivePiece;
  return canPlace(board, cand) ? cand : null;
}

export type RotDir = 'cw' | 'ccw';
export function tryRotate(board: Cell[][], piece: ActivePiece, dir: RotDir): ActivePiece | null {
  const rot = (piece.rot + (dir === 'cw' ? 1 : 3)) & 3;
  const cand = { ...piece, rot } as ActivePiece;
  return canPlace(board, cand) ? cand : null;
}

export function isGrounded(board: Cell[][], piece: ActivePiece): boolean {
  return tryMove(board, piece, 0, 1) === null;
}
