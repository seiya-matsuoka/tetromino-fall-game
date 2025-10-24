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

/** ミノ種別 */
export type Mino = 'I' | 'O' | 'T' | 'L' | 'J' | 'S' | 'Z';

/** 操作中ピース */
export interface ActivePiece {
  type: Mino;
  x: number; // 左上を0,0
  y: number; // 上に行くほど小さい（0は天井最上段）
  rot: 0 | 1 | 2 | 3; // 0=北, 1=東, 2=南, 3=西
}

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

  setActive(piece: ActivePiece | null): void;

  setNextQueue(q: Mino[]): void; // 丸ごと置換
  shiftNext(): Mino | undefined; // 先頭を取り出し
  pushNext(mino: Mino): void; // 末尾に追加
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

  // ここから下はAPI実装
  const api: Store = {
    getState: () => state,

    subscribe(fn) {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },

    reset() {
      state = initialState();
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
      api.setLines(state.lines + delta);
    },

    setActive(piece) {
      state = { ...state, active: piece };
      emit();
    },

    setNextQueue(q) {
      state = { ...state, nextQueue: q.slice() };
      emit();
    },

    shiftNext() {
      if (state.nextQueue.length === 0) return undefined;
      const [head, ...rest] = state.nextQueue;
      state = { ...state, nextQueue: rest };
      emit();
      return head;
    },

    pushNext(mino) {
      state = { ...state, nextQueue: [...state.nextQueue, mino] };
      emit();
    },
  };

  function emit() {
    const snapshot = state;
    listeners.forEach((fn) => fn(snapshot));
  }

  return api;
}
