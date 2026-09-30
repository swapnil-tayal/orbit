export interface InteractionCallbacks {
  onDragStart(): void;
  onDrag(dx: number, dy: number): void;
  onDragEnd(vx: number, vy: number): void;
  onZoom(deltaLog: number, x: number, y: number): void;
  onClick(x: number, y: number): void;
  onDoubleClick(x: number, y: number): void;
  onHover(x: number, y: number): void;
  onLeave(): void;
}

interface Sample {
  t: number;
  x: number;
  y: number;
}

export class InteractionController {
  private pointers = new Map<number, { x: number; y: number }>();
  private dragging = false;
  private moved = false;
  private downAt = 0;
  private downX = 0;
  private downY = 0;
  private lastX = 0;
  private lastY = 0;
  private samples: Sample[] = [];
  private lastClickAt = 0;
  private lastClickX = 0;
  private lastClickY = 0;
  private pinchDist = 0;
  private hoverRaf = 0;
  private hoverX = 0;
  private hoverY = 0;
  enabled = true;

  constructor(
    private el: HTMLElement,
    private cb: InteractionCallbacks,
  ) {
    el.style.touchAction = "none";
    el.addEventListener("pointerdown", this.onDown, { capture: true });
    el.addEventListener("pointermove", this.onMove, { capture: true });
    el.addEventListener("pointerup", this.onUp, { capture: true });
    el.addEventListener("pointercancel", this.onUp, { capture: true });
    el.addEventListener("pointerleave", this.onPointerLeave);
    el.addEventListener("wheel", this.onWheel, { passive: false });
    el.addEventListener("click", this.onClickCapture, { capture: true });
    el.addEventListener("dblclick", this.onDblClick);
  }

  dispose(): void {
    const el = this.el;
    el.removeEventListener("pointerdown", this.onDown, { capture: true });
    el.removeEventListener("pointermove", this.onMove, { capture: true });
    el.removeEventListener("pointerup", this.onUp, { capture: true });
    el.removeEventListener("pointercancel", this.onUp, { capture: true });
    el.removeEventListener("pointerleave", this.onPointerLeave);
    el.removeEventListener("wheel", this.onWheel);
    el.removeEventListener("click", this.onClickCapture, { capture: true });
    el.removeEventListener("dblclick", this.onDblClick);
  }

  private local(e: PointerEvent | MouseEvent | WheelEvent): { x: number; y: number } {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onDown = (e: PointerEvent) => {
    if (!this.enabled) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const p = this.local(e);
    this.pointers.set(e.pointerId, p);
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      return;
    }
    this.dragging = true;
    this.moved = false;
    this.downAt = performance.now();
    this.downX = this.lastX = p.x;
    this.downY = this.lastY = p.y;
    this.samples = [{ t: this.downAt, x: p.x, y: p.y }];
    try {
      this.el.setPointerCapture(e.pointerId);
    } catch {
      return;
    }
  };

  private onMove = (e: PointerEvent) => {
    if (!this.enabled) return;
    const p = this.local(e);
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, p);
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinchDist > 0 && d > 0) this.cb.onZoom(-Math.log(d / this.pinchDist), (a.x + b.x) / 2, (a.y + b.y) / 2);
      this.pinchDist = d;
      return;
    }
    if (this.dragging) {
      const dx = p.x - this.lastX;
      const dy = p.y - this.lastY;
      if (!this.moved && Math.hypot(p.x - this.downX, p.y - this.downY) > 5) {
        this.moved = true;
        this.cb.onDragStart();
      }
      if (this.moved) {
        this.cb.onDrag(dx, dy);
        const now = performance.now();
        this.samples.push({ t: now, x: p.x, y: p.y });
        while (this.samples.length > 2 && now - this.samples[0].t > 80) this.samples.shift();
      }
      this.lastX = p.x;
      this.lastY = p.y;
      return;
    }
    this.hoverX = p.x;
    this.hoverY = p.y;
    if (!this.hoverRaf) {
      this.hoverRaf = requestAnimationFrame(() => {
        this.hoverRaf = 0;
        this.cb.onHover(this.hoverX, this.hoverY);
      });
    }
  };

  private onUp = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinchDist = 0;
    if (!this.dragging) return;
    this.dragging = false;
    try {
      this.el.releasePointerCapture(e.pointerId);
    } catch {
      return;
    }
    if (this.moved) {
      const now = performance.now();
      const first = this.samples[0];
      const last = this.samples[this.samples.length - 1];
      const dt = Math.max(1, last.t - first.t);
      const vx = now - last.t > 60 ? 0 : (last.x - first.x) / dt;
      const vy = now - last.t > 60 ? 0 : (last.y - first.y) / dt;
      this.cb.onDragEnd(vx, vy);
    }
  };

  private onPointerLeave = () => {
    this.cb.onLeave();
  };

  private onClickCapture = (e: MouseEvent) => {
    if (this.moved || performance.now() - this.downAt > 350) {
      if (this.moved) {
        e.stopPropagation();
        e.preventDefault();
      }
      this.moved = false;
      return;
    }
    const p = this.local(e);
    const now = performance.now();
    if (now - this.lastClickAt < 350 && Math.hypot(p.x - this.lastClickX, p.y - this.lastClickY) < 8) {
      this.lastClickAt = 0;
      return;
    }
    this.lastClickAt = now;
    this.lastClickX = p.x;
    this.lastClickY = p.y;
    this.cb.onClick(p.x, p.y);
  };

  private onDblClick = (e: MouseEvent) => {
    const p = this.local(e);
    this.cb.onDoubleClick(p.x, p.y);
  };

  private onWheel = (e: WheelEvent) => {
    if (!this.enabled) return;
    e.preventDefault();
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 16;
    else if (e.deltaMode === 2) dy *= 400;
    const factor = e.ctrlKey ? 4 : 1;
    const p = this.local(e);
    this.cb.onZoom(dy * 0.0015 * factor, p.x, p.y);
  };
}
