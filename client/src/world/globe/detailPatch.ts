import { BufferAttribute, BufferGeometry, ClampToEdgeWrapping, DoubleSide, LinearFilter, Mesh, MeshBasicMaterial, SRGBColorSpace, Texture } from "three";
import { toWorld } from "./coords.ts";
import type { PatchRequest, PatchResponse } from "./detailPatch.worker.ts";

const SEGMENTS = 40;
const LIFT_KM = 0.45;
const MAX_H_KM = 3500;
const FULL_H_KM = 2000;
const DEG = Math.PI / 180;
const FEATHER = 0.18;

interface Window {
  lat: number;
  lng: number;
  latSpan: number;
  lngSpan: number;
}

export class DetailPatch {
  readonly mesh: Mesh<BufferGeometry, MeshBasicMaterial>;
  private texture: Texture;
  private worker: Worker | null = null;
  private window: Window | null = null;
  private pending: Window | null = null;
  private requestId = 0;
  private lastRequestAt = 0;
  private fine = false;
  private positions = new Float32Array((SEGMENTS + 1) * (SEGMENTS + 1) * 3);

  constructor(private maxTexture: number) {
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(this.positions, 3));
    const uvs = new Float32Array((SEGMENTS + 1) * (SEGMENTS + 1) * 2);
    const index: number[] = [];
    for (let r = 0; r <= SEGMENTS; r++) {
      for (let c = 0; c <= SEGMENTS; c++) {
        const i = r * (SEGMENTS + 1) + c;
        uvs[i * 2] = c / SEGMENTS;
        uvs[i * 2 + 1] = r / SEGMENTS;
        if (r < SEGMENTS && c < SEGMENTS) {
          const a = i;
          const b = i + 1;
          const cc = i + SEGMENTS + 1;
          const d = cc + 1;
          index.push(a, b, cc, b, d, cc);
        }
      }
    }
    geo.setAttribute("uv", new BufferAttribute(uvs, 2));
    const colors = new Float32Array((SEGMENTS + 1) * (SEGMENTS + 1) * 4);
    const edge = (t: number) => {
      const d = Math.min(t, 1 - t) / FEATHER;
      const x = Math.max(0, Math.min(1, d));
      return x * x * (3 - 2 * x);
    };
    for (let r = 0; r <= SEGMENTS; r++) {
      for (let c = 0; c <= SEGMENTS; c++) {
        const i = (r * (SEGMENTS + 1) + c) * 4;
        colors[i] = 1;
        colors[i + 1] = 1;
        colors[i + 2] = 1;
        colors[i + 3] = edge(c / SEGMENTS) * edge(r / SEGMENTS);
      }
    }
    geo.setAttribute("color", new BufferAttribute(colors, 4));
    geo.setIndex(index);
    this.texture = this.makeTexture();
    const mat = new MeshBasicMaterial({ map: this.texture, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.mesh = new Mesh(geo, mat);
    this.mesh.renderOrder = 1;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    if (typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined") {
      this.worker = new Worker(new URL("./detailPatch.worker.ts", import.meta.url), { type: "module" });
      this.worker.onmessage = (e: MessageEvent<PatchResponse>) => this.onResult(e.data);
      this.worker.onerror = (e) => {
        console.error("detail patch worker failed", e.message);
        this.worker?.terminate();
        this.worker = null;
        this.pending = null;
      };
    }
  }

  update(lat: number, lng: number, hKm: number, groundHeightKm: number, aspect: number, now: number): void {
    const opacity = Math.max(0, Math.min(1, (MAX_H_KM - hKm) / (MAX_H_KM - FULL_H_KM)));
    this.mesh.material.opacity = opacity;
    if (opacity <= 0.001 || !this.worker) {
      this.mesh.visible = false;
      return;
    }
    const latSpan = Math.max(1.2, Math.min(30, (groundHeightKm / 111.32) * 2.4));
    const cos = Math.max(0.2, Math.cos(lat * DEG));
    const lngSpan = Math.min(70, (latSpan * Math.max(1, aspect)) / cos);
    const w = this.pending ?? this.window;
    const stale = !w || Math.abs(lat - w.lat) > w.latSpan * 0.15 || Math.abs(((lng - w.lng + 540) % 360) - 180) > w.lngSpan * 0.15 || latSpan / w.latSpan < 0.7 || latSpan / w.latSpan > 1.2;
    if (stale && !this.pending && now - this.lastRequestAt > 120) {
      this.lastRequestAt = now;
      this.request({ lat, lng, latSpan, lngSpan });
    } else if (this.needsFine && this.window && !this.pending && now - this.lastRequestAt > 1500) {
      this.lastRequestAt = now;
      this.request(this.window);
    }
    this.mesh.visible = !!this.window;
  }

  private request(win: Window): void {
    if (!this.worker) return;
    this.pending = win;
    const pxPerDeg = Math.min(1400, this.maxTexture / win.lngSpan, 2048 / win.latSpan);
    const req: PatchRequest = {
      id: ++this.requestId,
      lat: win.lat,
      lng: win.lng,
      latSpan: win.latSpan,
      lngSpan: win.lngSpan,
      width: Math.max(64, Math.round(win.lngSpan * pxPerDeg)),
      height: Math.max(64, Math.round(win.latSpan * pxPerDeg)),
      pxPerDeg,
    };
    this.worker.postMessage(req);
  }

  private onResult(res: PatchResponse): void {
    const win = this.pending;
    if (res.id !== this.requestId || !win) {
      res.bitmap.close();
      this.pending = null;
      return;
    }
    this.pending = null;
    this.fine = res.fine;
    this.needsFine = !res.fine;
    const south = win.lat - win.latSpan / 2;
    const west = win.lng - win.lngSpan / 2;
    for (let r = 0; r <= SEGMENTS; r++) {
      const la = Math.max(-89.9, Math.min(89.9, south + (win.latSpan * r) / SEGMENTS));
      for (let c = 0; c <= SEGMENTS; c++) {
        const ln = west + (win.lngSpan * c) / SEGMENTS;
        const v = toWorld(la, ln, LIFT_KM);
        const i = (r * (SEGMENTS + 1) + c) * 3;
        this.positions[i] = v.x;
        this.positions[i + 1] = v.y;
        this.positions[i + 2] = v.z;
      }
    }
    (this.mesh.geometry.getAttribute("position") as BufferAttribute).needsUpdate = true;
    const old = this.texture;
    const oldImage = old.image as ImageBitmap | undefined;
    this.texture = this.makeTexture(res.bitmap);
    this.mesh.material.map = this.texture;
    this.mesh.material.needsUpdate = true;
    old.dispose();
    if (oldImage && typeof oldImage.close === "function") oldImage.close();
    this.window = win;
  }

  private makeTexture(image?: ImageBitmap): Texture {
    const t = new Texture(image);
    t.colorSpace = SRGBColorSpace;
    t.wrapS = ClampToEdgeWrapping;
    t.wrapT = ClampToEdgeWrapping;
    t.minFilter = LinearFilter;
    t.magFilter = LinearFilter;
    t.generateMipmaps = false;
    t.flipY = false;
    t.needsUpdate = !!image;
    return t;
  }

  private needsFine = false;

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.texture.dispose();
  }
}
