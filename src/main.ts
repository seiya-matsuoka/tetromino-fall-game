import './style.css';
import { GameLoop } from './core/loop';
import { createStore } from './core/store';
import { createGameplay } from './game/gameplay';
import { createRenderer } from './game/render';
import { tryMove, tryRotateSRS } from './core/collision';
import { createInputController } from './core/input';

const boardCanvas = document.getElementById('board') as HTMLCanvasElement;
const boardCtx = boardCanvas.getContext('2d')!;

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

// ストア作成
const store = createStore();

// gameplay（進行ロジック）と renderer（描画）を組み立て
// gameplay に "loop.stop()" を渡す必要があるので、先にダミーで宣言する

// eslint-disable-next-line prefer-const
let loop: GameLoop;

// gameplayは stopLoop を受け取る
const gameplay = createGameplay(store, () => {
  loop.stop();
});

// rendererはスコアUI/NEXTキャンバス/メインボードcanvasを握る
const renderer = createRenderer(store, boardCanvas, boardCtx, ui);

// キーボード入力コントローラ
const inputController = createInputController(store, gameplay);

// GameLoopを用意
loop = new GameLoop(
  (dtSec) => {
    const dtMs = dtSec * 1000;

    // 左右/回転/ドロップなどを反映）
    inputController.update(dtMs);

    gameplay.update(dtSec);
  },
  (alpha) => {
    renderer.render(alpha);
  },
  1 / 60
);

// 最初の1ピースを出す
gameplay.update(0);
loop.start();

// --- ポーズ/再開トグル ---
ui.pauseBtn.addEventListener('click', () => {
  const s = store.getState();
  store.setPaused(!s.paused);

  if (!store.getState().paused && !store.getState().over) {
    loop.start();
  }
});

// --- タブが非表示になったら自動停止、戻ったら必要なら再開 ---
document.addEventListener('visibilitychange', () => {
  const state = store.getState();
  if (document.hidden) {
    loop.stop();
  } else {
    if (!state.over && !state.paused) {
      loop.start();
    }
  }
});

// TODO: 削除
// --- 開発用：コンソール/キーから試す用 ---
// declare global {
//   interface Window {
//     store: ReturnType<typeof createStore>;
//     moveL: () => void;
//     moveR: () => void;
//     moveD: () => void;
//     rotCW: () => void;
//     rotCCW: () => void;
//   }
// }

// if (import.meta.env.DEV) {
//   window.store = store;
//   window.moveL = () => {
//     const s = store.getState();
//     if (!s.active) return;
//     const np = tryMove(s.board, s.active, -1, 0);
//     if (np) store.setActive(np);
//   };
//   window.moveR = () => {
//     const s = store.getState();
//     if (!s.active) return;
//     const np = tryMove(s.board, s.active, 1, 0);
//     if (np) store.setActive(np);
//   };
//   window.moveD = () => {
//     const s = store.getState();
//     if (!s.active) return;
//     const np = tryMove(s.board, s.active, 0, 1);
//     if (np) store.setActive(np);
//   };
//   window.rotCW = () => {
//     const s = store.getState();
//     if (!s.active) return;
//     const np = tryRotateSRS(s.board, s.active, 'cw');
//     if (np) store.setActive(np);
//   };
//   window.rotCCW = () => {
//     const s = store.getState();
//     if (!s.active) return;
//     const np = tryRotateSRS(s.board, s.active, 'ccw');
//     if (np) store.setActive(np);
//   };

//   window.addEventListener('keydown', (e) => {
//     const k = e.key.toLowerCase();
//     const s = store.getState();
//     if (!s.active) return;
//     if (k === 'arrowleft') {
//       const np = tryMove(s.board, s.active, -1, 0);
//       if (np) store.setActive(np);
//     }
//     if (k === 'arrowright') {
//       const np = tryMove(s.board, s.active, 1, 0);
//       if (np) store.setActive(np);
//     }
//     if (k === 'arrowdown') {
//       const np = tryMove(s.board, s.active, 0, 1);
//       if (np) store.setActive(np);
//     }
//     if (k === 'x') {
//       const np = tryRotateSRS(s.board, s.active, 'cw');
//       if (np) store.setActive(np);
//     }
//     if (k === 'z') {
//       const np = tryRotateSRS(s.board, s.active, 'ccw');
//       if (np) store.setActive(np);
//     }
// });
// }
