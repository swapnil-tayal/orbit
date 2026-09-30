export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const ax = 3 * x1 - 3 * x2 + 1;
  const bx = 3 * x2 - 6 * x1;
  const cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1;
  const by = 3 * y2 - 6 * y1;
  const cy = 3 * y1;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const err = sampleX(t) - x;
      const s = slopeX(t);
      if (Math.abs(err) < 1e-5 || s === 0) break;
      t -= err / s;
    }
    return sampleY(Math.max(0, Math.min(1, t)));
  };
}

export const easeCamera = cubicBezier(0.22, 0.8, 0.2, 1);
export const easeInOut = cubicBezier(0.42, 0, 0.58, 1);
export const easeIn = cubicBezier(0.5, 0, 1, 1);

export interface Tween {
  start: number;
  duration: number;
  ease: (t: number) => number;
  update: (k: number) => void;
  done: () => void;
}

export class TweenRunner {
  private active: Tween[] = [];

  add(duration: number, update: (k: number) => void, ease = easeCamera): Promise<void> {
    return new Promise((resolve) => {
      this.active.push({ start: performance.now(), duration, ease, update, done: resolve });
    });
  }

  cancelAll(): void {
    const pending = this.active;
    this.active = [];
    for (const tw of pending) tw.done();
  }

  get busy(): boolean {
    return this.active.length > 0;
  }

  step(now: number): void {
    if (this.active.length === 0) return;
    const finished: Tween[] = [];
    for (const tw of this.active) {
      const t = Math.min(1, (now - tw.start) / tw.duration);
      tw.update(tw.ease(t));
      if (t >= 1) finished.push(tw);
    }
    if (finished.length) {
      this.active = this.active.filter((t) => !finished.includes(t));
      for (const f of finished) f.done();
    }
  }
}
