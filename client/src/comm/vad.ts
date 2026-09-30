import { audioContext } from "./audioGraph.ts";

export interface VadHandle {
  stop(): void;
}

export function startVad(stream: MediaStream, onChange: (speaking: boolean) => void, threshold = 0.018, hangoverMs = 300): VadHandle | null {
  const ac = audioContext();
  if (!ac) return null;
  const source = ac.createMediaStreamSource(stream);
  const analyser = ac.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.6;
  source.connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  let speaking = false;
  let lastLoud = 0;
  const timer = window.setInterval(() => {
    const track = stream.getAudioTracks()[0];
    if (!track || !track.enabled) {
      if (speaking) {
        speaking = false;
        onChange(false);
      }
      return;
    }
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length);
    const now = performance.now();
    if (rms > threshold) lastLoud = now;
    const next = now - lastLoud < hangoverMs;
    if (next !== speaking) {
      speaking = next;
      onChange(next);
    }
  }, 50);
  return {
    stop: () => {
      window.clearInterval(timer);
      source.disconnect();
      analyser.disconnect();
      if (speaking) onChange(false);
    },
  };
}
