import type { Mino, ActivePiece } from './types';
import { SevenBag } from './sevenBag';

/**
 * ゲーム状態ストア
 *
 * - 「現在のゲーム状態」を 1 か所で管理し、読み取りと更新を提供する
 * - 外から直接オブジェクトを書き換えないよう、更新ごとに「新しいオブジェクト」を作って差し替える
 *
 * - board: 10x(20+天井2) の0始まり配列。0=空、それ以外=色/ミノID（1..7想定）
 * - active: 現在操作中のピース
 * - nextQueue: NEXT表示用
 * - score/level/lines/paused/over:
 * - 使い方: createStore() → store.getState()/subscribe()/アクション関数 を利用
 */

/* 盤面サイズ（可視20 + 天井2） */
export const COLS = 10;
export const VISIBLE_ROWS = 20;
export const HIDDEN_ROWS = 2;
export const ROWS = VISIBLE_ROWS + HIDDEN_ROWS;

/** 1マスの値：0 は空。1..7 はミノID */
export type Cell = 0 | number;

/** ゲーム状態の全体像 */
export interface GameState {
  /** 盤面。配列は [row][col] でアクセス（0始まり） */
  board: Cell[][];
  /** 現在操作中のピース */
  active: ActivePiece | null;
  /** NEXT 表示用のキュー */
  nextQueue: Mino[];
  /** スコア */
  score: number;
  /** 現在レベル */
  level: number;
  /** これまで消した合計ライン数 */
  lines: number;
  /** ポーズ中かどうか */
  paused: boolean;
  /** ゲームオーバーかどうか */
  over: boolean;
}

/**
 * ストアが外に公開するAPI
 * - getState/subscribe は読む側が使う
 * - それ以外は更新する側（ゲームロジック）が使う
 */
export interface Store {
  getState(): Readonly<GameState>;
  subscribe(fn: (s: Readonly<GameState>) => void): () => void;

  // アクション
  reset(): void;
  setPaused(v: boolean): void;
  togglePaused(): void;
  setOver(v: boolean): void;

  setScore(v: number): void;
  addScore(delta: number): void;

  setLevel(v: number): void;
  setLines(v: number): void;
  addLines(delta: number): void;

  setBoard(board: Cell[][]): void;

  setActive(piece: ActivePiece | null): void;

  // NEXT（7バッグ連動）
  seedNext(count?: number): void; // 起動時に最低3つ分シード
  consumeNext(): Mino; // 先頭を返し、末尾を袋から補充
}

/* ---------- 内部ヘルパ ---------- */

/** ROWS x COLS の0埋め2次元配列を生成。毎回新しい配列を返す */
function createEmptyBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(0));
}

/** ゲーム開始状態を1か所に集約 */
function initialState(): GameState {
  return {
    board: createEmptyBoard(),
    active: null,
    nextQueue: [],
    score: 0,
    level: 1,
    lines: 0,
    paused: false,
    over: false,
  };
}

/* ---------- ストア本体 ---------- */

export function createStore(): Store {
  // 現在の状態（常に最新のスナップショットを保持）
  let state = initialState();

  const listeners = new Set<(s: Readonly<GameState>) => void>();

  // 7バッグをストア内部に保持
  const bag = new SevenBag();

  function emit() {
    const snapshot = state;
    listeners.forEach((fn) => fn(snapshot));
  }

  // NEXTがcount以上になるまで袋から補充
  function ensureNext(count = 3) {
    if (state.nextQueue.length >= count) return;
    const need = count - state.nextQueue.length;
    const add: Mino[] = [];
    for (let i = 0; i < need; i++) add.push(bag.next());
    state = { ...state, nextQueue: [...state.nextQueue, ...add] };
  }

  const api: Store = {
    getState: () => state,

    subscribe(fn) {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },

    reset() {
      state = initialState();
      // リセット後もNEXTを3つにシード
      ensureNext(3);
      emit();
    },

    setPaused(v) {
      if (state.paused === v) return;
      state = { ...state, paused: v };
      emit();
    },

    togglePaused() {
      api.setPaused(!state.paused);
    },

    setOver(v) {
      if (state.over === v) return;
      state = { ...state, over: v };
      emit();
    },

    setScore(v) {
      if (state.score === v) return;
      state = { ...state, score: v };
      emit();
    },

    addScore(delta) {
      if (delta === 0) return;
      api.setScore(state.score + delta);
    },

    setLevel(v) {
      if (state.level === v) return;
      state = { ...state, level: v };
      emit();
    },

    setLines(v) {
      if (state.lines === v) return;
      state = { ...state, lines: v };
      emit();
    },

    addLines(delta) {
      if (delta === 0) return;
      const newLines = state.lines + delta;
      // 0～9ライン -> L1, 10～19 -> L2, ... 上限L20
      const newLevel = Math.min(20, Math.floor(newLines / 10) + 1);

      state = {
        ...state,
        lines: newLines,
        level: newLevel,
      };
      emit();
    },

    setBoard(board) {
      state = { ...state, board };
      emit();
    },

    setActive(piece) {
      state = { ...state, active: piece };
      emit();
    },

    seedNext(count = 3) {
      ensureNext(count);
      emit();
    },

    consumeNext() {
      // 先頭を取り出す → 末尾を袋から補充 → NEXT3を維持
      if (state.nextQueue.length === 0) ensureNext(1);
      const [head, ...rest] = state.nextQueue;
      state = { ...state, nextQueue: rest };
      ensureNext(3);
      emit();
      return head!;
    },
  };

  // 初回シード（NEXT3）
  api.seedNext(3);

  return api;
}
