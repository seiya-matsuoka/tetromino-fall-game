import { shapeAt, spawnPiece, collides } from '../core/srs';
import { tryMove, isGrounded } from '../core/collision';
import type { Store } from '../core/store';
import type { Mino } from '../core/types';

// レベルごとの重力：何msで1マス落とすか
const GRAVITY_TABLE_MS: number[] = [
  0,
  1000, // L1
  793, // L2
  618, // L3
  473, // L4
  355, // L5
  262, // L6
  190, // L7
  135, // L8
  94, // L9
  64, // L10
  43, // L11
  28, // L12
  18, // L13
  11, // L14
  7, // L15
  4, // L16
  3, // L17
  2, // L18
  1, // L19
  1, // L20+
];

function getFallIntervalMs(level: number): number {
  const idx = Math.min(Math.max(level, 1), 20);
  return GRAVITY_TABLE_MS[idx];
}

// ロック遅延：接地後、このms待ってから固定する
const LOCK_DELAY_MS = 500;

// 盤面に焼き付けるときに使うIDテーブル
const MINO_ID: Record<Mino, number> = {
  I: 1,
  O: 2,
  T: 3,
  L: 4,
  J: 5,
  S: 6,
  Z: 7,
};

// アクティブピースの位置+回転のシグネチャ：ロック遅延リセット用
function sigOf(p: { x: number; y: number; rot: number }): string {
  return `${p.x},${p.y},${p.rot}`;
}

// --- Runtime/ゲーム状態 ---

export function createGameplay(store: Store, stopLoop: () => void) {
  // ゲームの進行中だけ保持されるランタイム変数
  let fallTimerMs = 0;
  let lockTimerMs = 0;
  let wasGrounded = false;
  let lastGroundSig: string | null = null;

  // ピースを盤面に固定する
  function fixActiveIntoBoard() {
    const s = store.getState();
    const p = s.active;
    if (!p) return;

    const newBoard = s.board.map((row) => [...row]);
    const shape = shapeAt(p.type, p.rot);

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if (!shape[y][x]) continue;
        const gx = p.x + x;
        const gy = p.y + y;
        if (gy < 0 || gy >= newBoard.length) continue;
        if (gx < 0 || gx >= newBoard[0].length) continue;
        newBoard[gy][gx] = MINO_ID[p.type];
      }
    }

    store.setBoard(newBoard);
    store.setActive(null);
  }

  // NEXTキューから1つ取り出してアクティブピースとして出す
  function spawnFromNext() {
    const state = store.getState();

    if (state.active) return; // 既に出てるなら何もしない

    const nextType = store.consumeNext();
    if (!nextType) {
      // NEXTが空なら何もしない：本来は常に補充されてる想定
      return;
    }

    const piece = spawnPiece(nextType);

    // スポーン位置で詰まっていたらゲームオーバー
    if (collides(state.board, piece)) {
      store.setOver(true);
      store.setPaused(true);
      stopLoop();
      return;
    }

    store.setActive(piece);

    // タイマーリセット
    fallTimerMs = 0;
    lockTimerMs = 0;
    wasGrounded = false;
    lastGroundSig = null;
  }

  // GameLoop から毎フレーム呼ばれるupdate
  // dtSec は秒。内部ではmsに直して扱う
  function update(dtSec: number) {
    const dtMs = dtSec * 1000;
    const s = store.getState();

    // ポーズやゲームオーバー中は進めない
    if (s.paused || s.over) return;

    // アクティブピースがいなければスポーンして終了
    if (!s.active) {
      spawnFromNext();
      return;
    }

    const active = s.active;
    const grounded = isGrounded(s.board, active);

    // --- 接地していない（空中にいる）場合 ---
    if (!grounded) {
      wasGrounded = false;
      lockTimerMs = 0;
      lastGroundSig = null;

      fallTimerMs += dtMs;
      const fallInterval = getFallIntervalMs(s.level);
      if (fallTimerMs >= fallInterval) {
        const moved = tryMove(s.board, active, 0, 1);
        if (moved) {
          store.setActive(moved);
        }
        fallTimerMs = 0;
      }
      return;
    }

    // --- grounded（床/ブロックの上に乗ってる） ---
    if (!wasGrounded) {
      // 接地しはじめた瞬間
      wasGrounded = true;
      lockTimerMs = 0;
      lastGroundSig = sigOf(active);
    } else {
      // すでに接地継続中
      const curSig = sigOf(active);
      if (curSig !== lastGroundSig) {
        // 接地中に少し動いた/回転した → 猶予リセット
        lockTimerMs = 0;
        lastGroundSig = curSig;
      } else {
        // 同じ場所にとどまっている → ロックタイマー進める
        lockTimerMs += dtMs;
      }
    }

    // 規定時間接地し続けたら固定して次ピースへ
    if (lockTimerMs >= LOCK_DELAY_MS) {
      fixActiveIntoBoard();
      spawnFromNext();
      fallTimerMs = 0;
      lockTimerMs = 0;
      wasGrounded = false;
      lastGroundSig = null;
    }
  }

  // 外から使いたいものを返す
  return {
    update,
    spawnFromNext,
  };
}
