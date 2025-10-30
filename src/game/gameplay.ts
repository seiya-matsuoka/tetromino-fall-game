import { shapeAt, spawnPiece, collides } from '../core/srs';
import { tryMove, isGrounded, tryRotateSRS } from '../core/collision';
import type { Store } from '../core/store';
import type { Mino } from '../core/types';
import { clearFullLines } from '../core/lines';

// レベルごとの重力：何msで1マス落とすか
const GRAVITY_TABLE_MS: number[] = [
  0,
  1000, // L1
  880, // L2
  760, // L3
  640, // L4
  520, // L5
  420, // L6
  330, // L7
  250, // L8
  190, // L9
  140, // L10
  120, // L11
  105, // L12
  90, // L13
  78, // L14
  70, // L15
  64, // L16
  56, // L17
  48, // L18
  36, // L19
  28, // L20
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

// ライン消去後の得点テーブル
const SCORE_TABLE: Record<number, number> = {
  0: 0,
  1: 100,
  2: 300,
  3: 500,
  4: 800,
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

    // boardをディープコピー（行ごとコピー）
    const workingBoard = s.board.map((row) => [...row]);
    const shape = shapeAt(p.type, p.rot);

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if (!shape[y][x]) continue;
        const gx = p.x + x;
        const gy = p.y + y;
        // 盤面内チェック
        if (gy < 0 || gy >= workingBoard.length) continue;
        if (gx < 0 || gx >= workingBoard[0].length) continue;
        workingBoard[gy][gx] = MINO_ID[p.type];
      }
    }

    // ライン消去＆下詰め
    const { board: afterClear, cleared } = clearFullLines(workingBoard);

    // 盤面を更新、アクティブピースは消す
    store.setBoard(afterClear);
    store.setActive(null);

    // ライン消去数に応じてスコア加点
    if (cleared > 0) {
      // 1/2/3/4ライン消しに応じたスコア
      const gain = SCORE_TABLE[cleared] ?? 0;
      if (gain) {
        store.addScore(gain);
      }

      // 累計ライン数を増やす
      store.addLines(cleared);
    }
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

  // --- プレイヤー操作コマンド群 ---
  // 外部から直接 board/state を扱わず、関数経由で動かす
  function moveHorizontal(dx: -1 | 1) {
    const s = store.getState();
    if (s.paused || s.over || !s.active) return;
    const moved = tryMove(s.board, s.active, dx, 0);
    if (moved) {
      store.setActive(moved);
      // 接地中に動いた場合はロック遅延を伸ばすため、タイマー類もリセットする
      wasGrounded = false;
      lockTimerMs = 0;
      lastGroundSig = null;
    }
  }

  // ↓キーの1ステップだけ落とす
  function softDropStep() {
    const s = store.getState();
    if (s.paused || s.over || !s.active) return;
    const moved = tryMove(s.board, s.active, 0, 1);
    if (moved) {
      store.setActive(moved);
      // 接地中に動いた場合はロック遅延を伸ばすため、タイマー類もリセットする
      wasGrounded = false;
      lockTimerMs = 0;
      lastGroundSig = null;
    }
  }

  // ↓長押しからのハードドロップ
  function hardDrop() {
    const s0 = store.getState();
    if (s0.paused || s0.over || !s0.active) return;

    let p = s0.active;
    while (true) {
      const moved = tryMove(s0.board, p, 0, 1);
      if (!moved) break;
      p = moved;
    }

    // 最終位置を反映
    store.setActive(p);
    // その位置で即固定＋次のピースを出す
    fixActiveIntoBoard();
    spawnFromNext();
    // タイマー系リセット
    fallTimerMs = 0;
    lockTimerMs = 0;
    wasGrounded = false;
    lastGroundSig = null;
  }

  function rotateCW() {
    const s = store.getState();
    if (s.paused || s.over || !s.active) return;
    const spun = tryRotateSRS(s.board, s.active, 'cw');
    if (spun) {
      store.setActive(spun);
      wasGrounded = false;
      lockTimerMs = 0;
      lastGroundSig = null;
    }
  }

  function rotateCCW() {
    const s = store.getState();
    if (s.paused || s.over || !s.active) return;
    const spun = tryRotateSRS(s.board, s.active, 'ccw');
    if (spun) {
      store.setActive(spun);
      wasGrounded = false;
      lockTimerMs = 0;
      lastGroundSig = null;
    }
  }

  // 外から使うものを返す
  return {
    update,
    spawnFromNext,
    actions: {
      moveLeft: () => moveHorizontal(-1),
      moveRight: () => moveHorizontal(1),
      softDropStep,
      hardDrop,
      rotateCW,
      rotateCCW,
    },
  };
}
