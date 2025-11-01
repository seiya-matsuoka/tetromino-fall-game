import './style.css';
import { GameLoop } from './core/loop';
import { createStore } from './core/store';
import { createGameplay } from './game/gameplay';
import { createRenderer } from './game/render';
import { createInputController } from './core/input';
import { setupControlsUI } from './core/controls';

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
  levelStack: document.getElementById('levelStack') as HTMLElement,
  levelStackFill: document.getElementById('levelStackFill') as HTMLElement,
  levelGauge: document.getElementById('levelGauge') as HTMLElement,
  levelGaugeFill: document.getElementById('levelGaugeFill') as HTMLElement,
  levelGaugeLabel: document.getElementById('levelGaugeLabel') as HTMLElement,
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

setupControlsUI(inputController);

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

  // 1. ゲームオーバー後に押した場合はリスタート
  if (s.over) {
    // 全て初期状態に戻す
    store.reset();
    // reset() 直後は paused:true になっているため、動作モードにする
    store.setPaused(false);
    loop.start();
    return;
  }

  // 2. ポーズ⇄再開トグル
  if (s.paused) {
    store.setPaused(false);
    loop.start();
  } else {
    store.setPaused(true);
    loop.stop();
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
