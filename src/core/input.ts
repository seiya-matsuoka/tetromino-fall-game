import type { Store } from './store';

// gameplay の外から使える操作だけを要求する型
interface GameplayControls {
  actions: {
    moveLeft: () => void;
    moveRight: () => void;
    softDropStep: () => void;
    hardDrop: () => void;
    rotateCW: () => void;
    rotateCCW: () => void;
  };
}

// 長押しなどの閾値(ms)
const HOLD_ROTATE_CCW_MS = 350;
const HOLD_HARDDROP_MS = 350;

// リピート間隔(ms)
const REPEAT_HORIZ_DAS_MS = 150;
const REPEAT_HORIZ_ARR_MS = 50;
const REPEAT_SOFTDROP_MS = 50;

export function createInputController(store: Store, gameplay: GameplayControls) {
  // 各キーの状態管理
  const keyState = {
    left: { down: false, holdMs: 0, repeatMs: 0, firstShotDone: false },
    right: { down: false, holdMs: 0, repeatMs: 0, firstShotDone: false },
    down: { down: false, holdMs: 0, repeatMs: 0, hardDropped: false },
    rot: { down: false, holdMs: 0, firedCW: false, firedCCW: false },
  };

  function onKeyDown(e: KeyboardEvent) {
    const st = store.getState();
    if (st.paused || st.over) return;

    switch (e.key) {
      case 'ArrowLeft':
        if (!keyState.left.down) {
          keyState.left.down = true;
          keyState.left.holdMs = 0;
          keyState.left.repeatMs = 0;
          keyState.left.firstShotDone = false;
        }
        e.preventDefault();
        break;

      case 'ArrowRight':
        if (!keyState.right.down) {
          keyState.right.down = true;
          keyState.right.holdMs = 0;
          keyState.right.repeatMs = 0;
          keyState.right.firstShotDone = false;
        }
        e.preventDefault();
        break;

      case 'ArrowDown':
        if (!keyState.down.down) {
          keyState.down.down = true;
          keyState.down.holdMs = 0;
          keyState.down.repeatMs = 0;
          keyState.down.hardDropped = false;
        }
        e.preventDefault();
        break;

      case 'ArrowUp':
        if (!keyState.rot.down) {
          keyState.rot.down = true;
          keyState.rot.holdMs = 0;
          keyState.rot.firedCW = false;
          keyState.rot.firedCCW = false;
        }
        e.preventDefault();
        break;

      default:
        break;
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowLeft':
        keyState.left.down = false;
        break;
      case 'ArrowRight':
        keyState.right.down = false;
        break;
      case 'ArrowDown':
        keyState.down.down = false;
        break;
      case 'ArrowUp':
        keyState.rot.down = false;
        break;
      default:
        break;
    }
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // 毎フレーム呼ぶ
  function update(dtMs: number) {
    const st = store.getState();
    if (st.paused || st.over) return;

    // 経過時間
    if (keyState.left.down) {
      keyState.left.holdMs += dtMs;
      keyState.left.repeatMs += dtMs;
    }
    if (keyState.right.down) {
      keyState.right.holdMs += dtMs;
      keyState.right.repeatMs += dtMs;
    }
    if (keyState.down.down) {
      keyState.down.holdMs += dtMs;
      keyState.down.repeatMs += dtMs;
    }
    if (keyState.rot.down) {
      keyState.rot.holdMs += dtMs;
    }

    // 実行予定の操作を積む。優先順位：左右移動 → 回転 → 下
    const commands: Array<() => void> = [];

    // ←
    if (keyState.left.down) {
      if (!keyState.left.firstShotDone) {
        commands.push(() => gameplay.actions.moveLeft());
        keyState.left.firstShotDone = true;
        keyState.left.repeatMs = 0;
      } else {
        const wait =
          keyState.left.holdMs < REPEAT_HORIZ_DAS_MS ? REPEAT_HORIZ_DAS_MS : REPEAT_HORIZ_ARR_MS;
        if (keyState.left.repeatMs >= wait) {
          commands.push(() => gameplay.actions.moveLeft());
          keyState.left.repeatMs = 0;
        }
      }
    }

    // →
    if (keyState.right.down) {
      if (!keyState.right.firstShotDone) {
        commands.push(() => gameplay.actions.moveRight());
        keyState.right.firstShotDone = true;
        keyState.right.repeatMs = 0;
      } else {
        const wait =
          keyState.right.holdMs < REPEAT_HORIZ_DAS_MS ? REPEAT_HORIZ_DAS_MS : REPEAT_HORIZ_ARR_MS;
        if (keyState.right.repeatMs >= wait) {
          commands.push(() => gameplay.actions.moveRight());
          keyState.right.repeatMs = 0;
        }
      }
    }

    // ↑（回転）
    // タップ: CW & 長押し: CCWを一度だけ
    if (keyState.rot.down) {
      if (!keyState.rot.firedCW) {
        commands.push(() => gameplay.actions.rotateCW());
        keyState.rot.firedCW = true;
      } else if (!keyState.rot.firedCCW && keyState.rot.holdMs >= HOLD_ROTATE_CCW_MS) {
        commands.push(() => gameplay.actions.rotateCCW());
        keyState.rot.firedCCW = true;
      }
    }

    // ↓（ソフトドロップ / ハードドロップ）
    // 押している間: softDropStep & ホールド: hardDropを一回だけ
    if (keyState.down.down) {
      if (!keyState.down.hardDropped && keyState.down.holdMs >= HOLD_HARDDROP_MS) {
        commands.push(() => gameplay.actions.hardDrop());
        keyState.down.hardDropped = true;
      } else if (!keyState.down.hardDropped) {
        if (keyState.down.repeatMs >= REPEAT_SOFTDROP_MS) {
          commands.push(() => gameplay.actions.softDropStep());
          keyState.down.repeatMs = 0;
        }
      }
    }

    // 優先度は push 順で担保済み。その順で実行
    for (const fn of commands) {
      fn();
    }
  }

  function dispose() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  }

  return { update, dispose };
}
