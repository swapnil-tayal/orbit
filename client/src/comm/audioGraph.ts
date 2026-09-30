import { CONFIG } from "@orbit/shared";

let ctx: AudioContext | null = null;

export function audioContext(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export class RemoteAudio {
  private el: HTMLAudioElement;
  private raf = 0;
  private target = 0;
  private current = 0;

  constructor(stream: MediaStream) {
    this.el = document.createElement("audio");
    this.el.autoplay = true;
    this.el.setAttribute("playsinline", "true");
    this.el.srcObject = stream;
    this.el.volume = 0;
    this.el.style.display = "none";
    document.body.appendChild(this.el);
    void this.el.play().catch(() => undefined);
  }

  fadeTo(volume: number, ms: number): Promise<void> {
    this.target = volume;
    cancelAnimationFrame(this.raf);
    const start = performance.now();
    const from = this.current;
    return new Promise((resolve) => {
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / ms);
        this.current = from + (this.target - from) * t;
        this.el.volume = Math.max(0, Math.min(1, this.current));
        if (t < 1) this.raf = requestAnimationFrame(step);
        else resolve();
      };
      this.raf = requestAnimationFrame(step);
    });
  }

  fadeIn(): Promise<void> {
    return this.fadeTo(1, CONFIG.zones.fadeInMs);
  }

  fadeOut(): Promise<void> {
    return this.fadeTo(0, CONFIG.zones.fadeOutMs);
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.el.srcObject = null;
    this.el.remove();
  }
}

export function playChime(): void {
  const ac = audioContext();
  if (!ac) return;
  const now = ac.currentTime;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
  gain.connect(ac.destination);
  const notes = [880, 1174.66];
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(now + i * 0.16);
    osc.stop(now + 0.75);
  });
}
