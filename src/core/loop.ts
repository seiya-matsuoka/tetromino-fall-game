/**
 * 固定タイムステップのゲームループ
 * - update(dt): ロジック更新。dtは固定秒（既定 1/60）
 * - render(alpha): 補間描画。alpha は 0..1
 */
export type UpdateFn = (dt: number) => void;
export type RenderFn = (alpha: number) => void;

export class GameLoop {
  /** 外部から受け取るコールバック */
  private update: UpdateFn;
  private render: RenderFn;

  /** 1ステップあたりの秒数（例: 1/60） */
  private step: number;
  /** 積み上げた経過時間（秒）。step を越えたら update を回す */
  private acc = 0;
  /** 前フレームの時刻（ms, performance.now()） */
  private last = 0;
  /** requestAnimationFrame のID（停止用） */
  private rafId = 0;
  /** ループが動作中かどうか */
  private running = false;

  /**
   * - update: ロジック更新（固定dtで呼ばれる）
   * - render: 描画（1フレーム1回。alphaで補間可）
   * - step: 固定ステップ秒数（既定1/60）
   */
  constructor(update: UpdateFn, render: RenderFn, step = 1 / 60) {
    this.update = update;
    this.render = render;
    this.step = step;
  }

  /** ループ開始。多重開始は無視 */
  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now(); // 基準時刻を初期化
    this.rafId = requestAnimationFrame(this.frame);
  }

  /** ループ停止。多重停止は無視 */
  stop() {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  /** 現在の動作状態 */
  get isRunning() {
    return this.running;
  }

  /**
   * rAF 用の1フレーム関数
   * - 経過時間をaccに積む
   * - accがstep以上の間は、固定回数だけupdateを回す
   * - 余り(acc/step)をalphaとしてrenderに渡す（補間に使える）
   */
  private frame = (now: number) => {
    if (!this.running) return;

    // 経過秒を加算（最大0.25秒まで）
    this.acc += Math.min(0.25, (now - this.last) / 1000);

    // 固定ステップで update を必要回数まわす
    while (this.acc >= this.step) {
      this.update(this.step);
      this.acc -= this.step;
    }

    // 余りを0..1に正規化
    const alpha = this.acc / this.step;

    // 1フレームにつき1回描画
    this.render(alpha);

    // 次フレームの基準時刻を更新してスケジュール
    this.last = now;
    this.rafId = requestAnimationFrame(this.frame);
  };
}
