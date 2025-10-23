export type UpdateFn = (dt: number) => void;
export type RenderFn = (alpha: number) => void;

export class GameLoop {
  private update: UpdateFn;
  private render: RenderFn;

  private step: number;
  private acc = 0;
  private last = 0;
  private rafId = 0;
  private running = false;

  constructor(update: UpdateFn, render: RenderFn, step = 1 / 60) {
    this.update = update;
    this.render = render;
    this.step = step;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  get isRunning() {
    return this.running;
  }

  private frame = (now: number) => {
    if (!this.running) return;

    this.acc += Math.min(0.25, (now - this.last) / 1000);

    while (this.acc >= this.step) {
      this.update(this.step);
      this.acc -= this.step;
    }
    const alpha = this.acc / this.step;

    this.render(alpha);
    this.last = now;
    this.rafId = requestAnimationFrame(this.frame);
  };
}
