import { CanvasTexture, Color, Matrix4, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, SphereGeometry, SRGBColorSpace, RepeatWrapping, Vector3, Vector4, WebGLRenderer } from "three";
import { bearingDeg, haversineKm, midpoint, slerp, unitCentre, unitIdFor, vehicleState, type LatLng, type TravelMode, type TravelState, type UnitId } from "@orbit/shared";
import { COLORS, EASE_CAMERA, H_MIN, H_ORBIT, LOG_H_MIN, LOG_H_ORBIT, R, VFOV, levelFor, tiltFor, type Level } from "./constants.ts";
import { applyPose, groundExtentKm, pixelsPerKm, type Pose } from "./cameraRig.ts";
import { bearingToTangent, tangentFrame, toLatLng, toWorld, type Frame } from "./coords.ts";
import { generateEarthTexture } from "./texture.ts";
import { createHalo, createRim } from "./atmosphere.ts";
import { GridLayer, HighlightLayer, type Highlight } from "./grid.ts";
import { DetailPatch } from "./detailPatch.ts";
import { InteractionController } from "./interaction.ts";
import { TweenRunner, cubicBezier, easeIn } from "./tween.ts";
import { loadLand, landSync } from "./land.ts";

export interface PointSpec {
  id: string;
  lat: number;
  lng: number;
  alt?: number;
}

export interface TripSpec {
  id: string;
  from: LatLng;
  to: LatLng;
  mode: TravelMode;
  startedAt: number;
  durationMs: number;
  distanceKm: number;
  loop?: boolean;
}

export interface ProjectedPoint {
  x: number;
  y: number;
  visible: boolean;
  depth: number;
}

export interface TripFrame {
  path: Float32Array;
  n: number;
  vehicle: ProjectedPoint;
  shadow: ProjectedPoint;
  angle: number;
  s: number;
  done: boolean;
}

export interface FrameData {
  version: number;
  width: number;
  height: number;
  level: Level;
  pose: Pose;
  points: Map<string, ProjectedPoint>;
  trips: Map<string, TripFrame>;
  farSide: number;
}

export interface GlobeClick {
  unitId: UnitId;
  lat: number;
  lng: number;
  land: boolean;
  x: number;
  y: number;
}

export interface GlobeEvents {
  onClick?(e: GlobeClick): void;
  onDoubleClick?(e: GlobeClick): void;
  onHover?(unitId: UnitId | null): void;
  onLevel?(level: Level): void;
  onArrivalDive?(progress: number): void;
  onInteract?(): void;
}

/** Flights longer than this are chased by the camera instead of framed whole. */
const LONG_FLIGHT_KM = 3000;

function flightFollowH(km: number): number {
  return Math.max(1500, Math.min(3000, 0.3 * km));
}

type Mode = "free" | "tween" | "travel" | "arrival" | "auto";

interface TripRuntime {
  spec: TripSpec;
  samples: Vector3[];
  frame: TripFrame;
}

const easeCamera = cubicBezier(EASE_CAMERA[0], EASE_CAMERA[1], EASE_CAMERA[2], EASE_CAMERA[3]);
const PATH_SAMPLES = 48;

export class GlobeScene {
  readonly pose: Pose = { lat: 22, lng: 78, logH: LOG_H_ORBIT, tilt: 0, heading: 0 };
  mode: Mode = "free";
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera: PerspectiveCamera;
  private earth: Mesh<SphereGeometry, MeshBasicMaterial>;
  private halo = createHalo();
  private rim = createRim();
  private grid = new GridLayer();
  private highlights = new HighlightLayer();
  private patch: DetailPatch;
  private tweens = new TweenRunner();
  private interaction: InteractionController;
  private raf = 0;
  private last = 0;
  private width = 1;
  private height = 1;
  private paused = false;
  private disposed = false;
  private zoomTarget = LOG_H_ORBIT;
  private vx = 0;
  private vy = 0;
  private landing = false;
  private autoRotate = false;
  private dragging = false;
  private level: Level = "orbit";
  private hoverUnit: UnitId | null = null;
  private points: PointSpec[] = [];
  private pointWorld: Vector3[] = [];
  private trips = new Map<string, TripRuntime>();
  private subscribers = new Set<(f: FrameData) => void>();
  private viewProj = new Matrix4();
  private tmpV4 = new Vector4();
  private tmpV3 = new Vector3();
  private tmpFrame: Frame = { n: new Vector3(), east: new Vector3(), north: new Vector3() };
  private myTrip: TripRuntime | null = null;
  private chaseLook = new Vector3();
  private chasePos = new Vector3();
  private chaseInit = false;
  private followLast = 0;
  private resizeObserver: ResizeObserver;
  isContextLost(): boolean {
    return this.renderer.getContext().isContextLost();
  }

  private onContextLost = () => {
    this.renderer.domElement.style.opacity = "0";
  };

  private onContextRestored = () => {
    this.renderer.domElement.style.opacity = "1";
  };

  private visibilityHandler = () => {
    if (document.hidden) this.stopLoop();
    else this.startLoop();
  };
  readonly frame: FrameData;

  constructor(
    private container: HTMLElement,
    private now: () => number,
    private events: GlobeEvents = {},
    private reducedMotion = false,
  ) {
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    const canvas = this.renderer.domElement;
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);
    canvas.addEventListener("webglcontextlost", this.onContextLost);
    canvas.addEventListener("webglcontextrestored", this.onContextRestored);
    this.camera = new PerspectiveCamera(VFOV, 1, 1, R * 4);
    const mat = new MeshBasicMaterial({ color: new Color(COLORS.ocean) });
    this.earth = new Mesh(new SphereGeometry(R, 384, 192), mat);
    const maxTexture = this.renderer.capabilities.maxTextureSize;
    this.patch = new DetailPatch(Math.min(4096, maxTexture));
    this.scene.add(this.earth, this.patch.mesh, this.rim, this.halo, this.grid.lines, this.highlights.group);
    this.frame = { version: 0, width: 1, height: 1, level: "orbit", pose: this.pose, points: new Map(), trips: new Map(), farSide: 0 };
    void generateEarthTexture(4096).then((cv) => {
      if (this.disposed) return;
      const tex = new CanvasTexture(cv);
      tex.colorSpace = SRGBColorSpace;
      tex.wrapS = RepeatWrapping;
      tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      this.earth.material.map = tex;
      this.earth.material.color = new Color(0xffffff);
      this.earth.material.needsUpdate = true;
    });
    void loadLand();
    this.interaction = new InteractionController(container, {
      onDragStart: () => {
        this.dragging = true;
        this.cancelAnimations();
      },
      onDrag: (dx, dy) => this.dragBy(dx, dy),
      onDragEnd: (vx, vy) => {
        this.dragging = false;
        this.vx = vx;
        this.vy = vy;
      },
      onZoom: (d, x, y) => this.zoomBy(d, x, y),
      onClick: (x, y) => {
        const hit = this.hitTest(x, y);
        if (hit) this.events.onClick?.(hit);
      },
      onDoubleClick: (x, y) => {
        const hit = this.hitTest(x, y);
        if (hit) this.events.onDoubleClick?.(hit);
      },
      onHover: (x, y) => {
        const hit = this.hitTest(x, y);
        const id = hit && hit.land ? hit.unitId : null;
        if (id !== this.hoverUnit) {
          this.hoverUnit = id;
          this.events.onHover?.(id);
        }
      },
      onLeave: () => {
        if (this.hoverUnit) {
          this.hoverUnit = null;
          this.events.onHover?.(null);
        }
      },
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    document.addEventListener("visibilitychange", this.visibilityHandler);
    this.startLoop();
  }

  private resize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.applyViewOffset();
    this.camera.updateProjectionMatrix();
    this.frame.width = w;
    this.frame.height = h;
  }

  private shift = { x: 0, y: 0 };

  setViewShift(x: number, y: number): void {
    this.shift = { x, y };
    this.applyViewOffset();
    this.camera.updateProjectionMatrix();
  }

  private applyViewOffset(): void {
    if (this.landing) this.camera.setViewOffset(this.width, this.height * 2.15, 0, -this.height * 0.09, this.width, this.height);
    else if (this.shift.x || this.shift.y) this.camera.setViewOffset(this.width, this.height, -this.width * this.shift.x, -this.height * this.shift.y, this.width, this.height);
    else this.camera.clearViewOffset();
  }

  setLandingMode(on: boolean): void {
    this.landing = on;
    this.applyViewOffset();
    this.camera.updateProjectionMatrix();
    if (on) {
      this.mode = "auto";
      this.pose.logH = Math.log(H_ORBIT);
      this.pose.tilt = 0;
      this.zoomTarget = this.pose.logH;
    } else if (this.mode === "auto") this.mode = "free";
  }

  setAutoRotate(on: boolean): void {
    this.autoRotate = on;
  }

  setInteractive(on: boolean): void {
    this.interaction.enabled = on;
  }

  setPoints(points: PointSpec[]): void {
    this.points = points;
    this.pointWorld = points.map((p) => toWorld(p.lat, p.lng, p.alt ?? 0));
    const next = new Map<string, ProjectedPoint>();
    for (const p of points) next.set(p.id, this.frame.points.get(p.id) ?? { x: 0, y: 0, visible: false, depth: 0 });
    this.frame.points = next;
  }

  setTrips(trips: TripSpec[]): void {
    const keep = new Set<string>();
    for (const t of trips) {
      keep.add(t.id);
      if (this.trips.has(t.id)) continue;
      this.trips.set(t.id, this.buildTrip(t));
    }
    for (const id of [...this.trips.keys()]) if (!keep.has(id)) this.trips.delete(id);
    const next = new Map<string, TripFrame>();
    for (const [id, rt] of this.trips) next.set(id, rt.frame);
    this.frame.trips = next;
  }

  private buildTrip(spec: TripSpec): TripRuntime {
    const samples: Vector3[] = [];
    for (let i = 0; i <= PATH_SAMPLES; i++) {
      const s = i / PATH_SAMPLES;
      const g = slerp(spec.from, spec.to, s);
      samples.push(toWorld(g.lat, g.lng, 0));
    }
    return {
      spec,
      samples,
      frame: {
        path: new Float32Array((PATH_SAMPLES + 1) * 3),
        n: PATH_SAMPLES + 1,
        vehicle: { x: 0, y: 0, visible: false, depth: 0 },
        shadow: { x: 0, y: 0, visible: false, depth: 0 },
        angle: 0,
        s: 0,
        done: false,
      },
    };
  }

  setHighlights(list: Highlight[]): void {
    this.highlights.set(list);
  }

  subscribe(cb: (f: FrameData) => void): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  get currentLevel(): Level {
    return this.level;
  }

  get altitudeKm(): number {
    return Math.exp(this.pose.logH);
  }

  canZoomIn(): boolean {
    return this.zoomTarget > LOG_H_MIN + 0.01;
  }

  canZoomOut(): boolean {
    return this.zoomTarget < LOG_H_ORBIT - 0.01;
  }

  zoomBy(deltaLog: number, x?: number, y?: number): void {
    if (this.mode === "travel" || this.mode === "arrival" || this.landing) return;
    this.cancelAnimations();
    this.zoomTarget = Math.max(LOG_H_MIN, Math.min(LOG_H_ORBIT, this.zoomTarget + deltaLog));
    if (x !== undefined && y !== undefined) {
      const hit = this.hitTest(x, y);
      this.zoomAnchor = hit ? { world: toWorld(hit.lat, hit.lng), x, y } : null;
    } else this.zoomAnchor = null;
    this.events.onInteract?.();
  }

  private zoomAnchor: { world: Vector3; x: number; y: number } | null = null;
  private zoomAnchorFinal = false;
  private anchorTmp: ProjectedPoint = { x: 0, y: 0, visible: false, depth: 0 };

  private settleZoomAnchor(): void {
    const a = this.zoomAnchor;
    if (!a) return;
    for (let i = 0; i < 3; i++) {
      this.projectWorld(a.world, this.anchorTmp);
      if (!this.anchorTmp.visible) {
        this.zoomAnchor = null;
        return;
      }
      const dx = a.x - this.anchorTmp.x;
      const dy = a.y - this.anchorTmp.y;
      if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) return;
      this.dragBy(dx, dy);
      applyPose(this.camera, this.pose);
      this.camera.updateMatrixWorld();
      this.viewProj.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    }
  }

  zoomToLevel(logH: number): void {
    this.zoomTarget = Math.max(LOG_H_MIN, Math.min(LOG_H_ORBIT, logH));
  }

  private cancelAnimations(): void {
    if (this.mode === "travel" || this.mode === "arrival") return;
    this.tweens.cancelAll();
    this.mode = this.landing ? "auto" : "free";
    this.vx = 0;
    this.vy = 0;
    this.zoomTarget = this.pose.logH;
    this.zoomAnchor = null;
    this.events.onInteract?.();
  }

  private dragBy(dx: number, dy: number): void {
    const ppk = pixelsPerKm(this.pose, this.landing ? this.height * 2.15 : this.height);
    const cos = Math.max(0.15, Math.cos((this.pose.lat * Math.PI) / 180));
    this.pose.lat = Math.max(-85, Math.min(85, this.pose.lat + dy / (ppk.y * 111.32)));
    let lng = this.pose.lng - dx / (ppk.x * 111.32 * cos);
    lng = ((lng + 180) % 360 + 360) % 360 - 180;
    this.pose.lng = lng;
  }

  flyTo(target: LatLng, opts: { h?: number; ms?: number; heading?: number; tilt?: number } = {}): Promise<void> {
    if (this.mode === "travel" || this.mode === "arrival") return Promise.resolve();
    this.tweens.cancelAll();
    this.mode = "tween";
    this.vx = 0;
    this.vy = 0;
    const from = { ...this.pose };
    const targetLogH = opts.h !== undefined ? Math.log(Math.max(H_MIN, Math.min(H_ORBIT, opts.h))) : this.pose.logH;
    const targetHeading = opts.heading ?? 0;
    const ms = this.reducedMotion ? 0 : (opts.ms ?? 900);
    const a = toWorld(from.lat, from.lng).normalize();
    const b = toWorld(target.lat, target.lng).normalize();
    const dot = Math.max(-1, Math.min(1, a.dot(b)));
    const omega = Math.acos(dot);
    const distKm = omega * R;
    const hop = Math.max(0, Math.log(Math.max(1, 0.6 * distKm)) - Math.max(from.logH, targetLogH));
    const dHeading = ((targetHeading - from.heading + 540) % 360) - 180;
    return this.tweens.add(Math.max(1, ms), (k) => {
      let lat: number;
      let lng: number;
      if (omega < 1e-4) {
        lat = target.lat;
        lng = target.lng;
      } else {
        const so = Math.sin(omega);
        const wa = Math.sin((1 - k) * omega) / so;
        const wb = Math.sin(k * omega) / so;
        this.tmpV3.copy(a).multiplyScalar(wa).addScaledVector(b, wb);
        const ll = toLatLng(this.tmpV3);
        lat = ll.lat;
        lng = ll.lng;
      }
      this.pose.lat = lat;
      this.pose.lng = lng;
      this.pose.logH = from.logH + (targetLogH - from.logH) * k + Math.sin(Math.PI * k) * hop;
      this.pose.heading = from.heading + dHeading * k;
      this.pose.tilt = opts.tilt !== undefined ? from.tilt + (opts.tilt - from.tilt) * k : tiltFor(Math.exp(this.pose.logH));
      this.zoomTarget = this.pose.logH;
    }).then(() => {
      if (this.mode === "tween" && !this.tweens.busy) this.mode = "free";
    });
  }

  jumpTo(target: LatLng, h: number): void {
    this.pose.lat = target.lat;
    this.pose.lng = target.lng;
    this.pose.logH = Math.log(Math.max(H_MIN, Math.min(H_ORBIT, h)));
    this.pose.tilt = tiltFor(h);
    this.pose.heading = 0;
    this.zoomTarget = this.pose.logH;
  }

  private settle(p: Promise<void>, ms: number): Promise<void> {
    return Promise.race([
      p,
      new Promise<void>((resolve) => {
        window.setTimeout(() => {
          this.tweens.cancelAll();
          resolve();
        }, ms);
      }),
    ]);
  }

  async followTrip(spec: TripSpec, destUnit: UnitId): Promise<void> {
    this.setTrips([...this.trips.values()].map((t) => t.spec).filter((t) => t.id !== spec.id).concat([spec]));
    const rt = this.trips.get(spec.id)!;
    this.myTrip = rt;
    this.interaction.enabled = false;
    if (this.reducedMotion) {
      this.mode = "arrival";
      const c = unitCentre(destUnit);
      this.jumpTo(c, H_MIN);
      await new Promise((r) => setTimeout(r, 1200));
      this.myTrip = null;
      this.mode = "free";
      this.interaction.enabled = true;
      return;
    }
    const bearing = bearingDeg(spec.from, spec.to);
    if (spec.mode === "car") {
      await this.settle(this.flyTo(spec.from, { h: 140, ms: 800, heading: bearing, tilt: 55 }), 1400);
      this.chaseInit = false;
    } else {
      const km = spec.distanceKm;
      const longHaul = km > LONG_FLIGHT_KM;
      // Short flights: frame the whole arc from its midpoint. Long ones would put both ends
      // and the plane beyond the horizon, so start over the origin and chase the plane instead.
      const h = longHaul ? flightFollowH(km) : Math.max(300, Math.min(3000, 0.6 * km));
      const focus = longHaul ? spec.from : midpoint(spec.from, spec.to);
      await this.settle(this.flyTo(focus, { h, ms: 900, heading: longHaul ? bearing : bearing - 90, tilt: longHaul ? 50 : 48 }), 1500);
      this.chaseInit = false;
    }
    this.tweens.cancelAll();
    this.mode = "travel";
    const endsAt = spec.startedAt + spec.durationMs;
    await new Promise<void>((resolve) => {
      const check = () => {
        if (rt.frame.done || this.disposed || !this.trips.has(spec.id) || this.now() >= endsAt + 300) resolve();
        else setTimeout(check, 50);
      };
      check();
    });
    this.mode = "arrival";
    const c = unitCentre(destUnit);
    this.chaseInit = false;
    await this.settle(this.diveTo(c), 2400);
    this.myTrip = null;
    this.mode = "free";
    this.interaction.enabled = true;
  }

  private async diveTo(c: LatLng): Promise<void> {
    this.tweens.cancelAll();
    const from = { ...this.pose };
    if (this.camera.position.length() - R > 200 || Math.abs(from.heading) > 1) {
      const lat = this.pose.lat;
      const lng = this.pose.lng;
      const a = toWorld(lat, lng).normalize();
      const b = toWorld(c.lat, c.lng).normalize();
      const omega = Math.acos(Math.max(-1, Math.min(1, a.dot(b))));
      const dHeading = ((0 - from.heading + 540) % 360) - 180;
      await this.tweens.add(900, (k) => {
        if (omega > 1e-4) {
          const so = Math.sin(omega);
          this.tmpV3.copy(a).multiplyScalar(Math.sin((1 - k) * omega) / so).addScaledVector(b, Math.sin(k * omega) / so);
          const ll = toLatLng(this.tmpV3);
          this.pose.lat = ll.lat;
          this.pose.lng = ll.lng;
        } else {
          this.pose.lat = c.lat;
          this.pose.lng = c.lng;
        }
        this.pose.logH = from.logH + (LOG_H_MIN - from.logH) * k;
        this.pose.heading = from.heading + dHeading * k;
        this.pose.tilt = from.tilt + (55 - from.tilt) * k;
      }, easeCamera);
    }
    const startLog = this.pose.logH;
    const endLog = Math.log(8);
    await this.tweens.add(520, (k) => {
      this.pose.lat = c.lat;
      this.pose.lng = c.lng;
      this.pose.logH = startLog + (endLog - startLog) * k;
      this.pose.tilt = 55 - 25 * k;
      this.events.onArrivalDive?.(k);
    }, easeIn);
    this.pose.logH = LOG_H_MIN;
    this.pose.tilt = tiltFor(H_MIN);
    this.zoomTarget = LOG_H_MIN;
  }

  hitTest(x: number, y: number): GlobeClick | null {
    const ndcX = (x / this.width) * 2 - 1;
    const ndcY = -(y / this.height) * 2 + 1;
    const origin = this.camera.position;
    const dir = this.tmpV3.set(ndcX, ndcY, 0.5).unproject(this.camera).sub(origin).normalize();
    const b = origin.dot(dir);
    const c = origin.dot(origin) - R * R;
    const disc = b * b - c;
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    if (t < 0) return null;
    const p = dir.multiplyScalar(t).add(origin);
    const ll = toLatLng(p);
    const land = landSync();
    return { unitId: unitIdFor(ll.lat, ll.lng), lat: ll.lat, lng: ll.lng, land: land ? land.isHabitable(ll.lat, ll.lng) : true, x, y };
  }

  projectLatLng(lat: number, lng: number, alt = 0): ProjectedPoint {
    const out = { x: 0, y: 0, visible: false, depth: 0 };
    this.projectWorld(toWorld(lat, lng, alt, this.tmpV3), out);
    return out;
  }

  private projectWorld(w: Vector3, out: ProjectedPoint): void {
    const v = this.tmpV4.set(w.x, w.y, w.z, 1).applyMatrix4(this.viewProj);
    if (v.w <= 0) {
      out.visible = false;
      return;
    }
    const nx = v.x / v.w;
    const ny = v.y / v.w;
    out.x = ((nx + 1) / 2) * this.width;
    out.y = ((1 - ny) / 2) * this.height;
    out.depth = v.w;
    let visible = Math.abs(nx) <= 1.2 && Math.abs(ny) <= 1.2;
    if (visible) {
      const C = this.camera.position;
      const dx = w.x - C.x;
      const dy = w.y - C.y;
      const dz = w.z - C.z;
      const dd = dx * dx + dy * dy + dz * dz;
      const t = -(C.x * dx + C.y * dy + C.z * dz) / dd;
      if (t > 0 && t < 1) {
        const px = C.x + t * dx;
        const py = C.y + t * dy;
        const pz = C.z + t * dz;
        if (px * px + py * py + pz * pz < (R - 2) * (R - 2)) visible = false;
      }
    }
    out.visible = visible;
  }

  private startLoop(): void {
    if (this.raf || this.paused || this.disposed) return;
    this.last = performance.now();
    const loop = (now: number) => {
      this.raf = 0;
      if (this.paused || this.disposed) return;
      this.tick(now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private stopLoop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  pause(): void {
    this.paused = true;
    this.stopLoop();
  }

  resume(): void {
    this.paused = false;
    this.startLoop();
  }

  dispose(): void {
    this.disposed = true;
    this.stopLoop();
    document.removeEventListener("visibilitychange", this.visibilityHandler);
    this.resizeObserver.disconnect();
    this.interaction.dispose();
    this.patch.dispose();
    this.renderer.domElement.removeEventListener("webglcontextlost", this.onContextLost);
    this.renderer.domElement.removeEventListener("webglcontextrestored", this.onContextRestored);
    this.renderer.dispose();
    this.container.contains(this.renderer.domElement) && this.container.removeChild(this.renderer.domElement);
  }

  private tick(now: number): void {
    if (this.container.clientWidth !== this.width || this.container.clientHeight !== this.height) this.resize();
    const dt = Math.min(50, Math.max(0, now - this.last));
    this.last = now;
    const pose = this.pose;
    if (this.mode === "free") {
      if (Math.abs(this.vx) > 0.005 || Math.abs(this.vy) > 0.005) {
        this.dragBy(this.vx * dt, this.vy * dt);
        const decay = Math.exp(-dt / 110);
        this.vx *= decay;
        this.vy *= decay;
      }
      const k = 1 - Math.exp(-dt / 90);
      pose.logH += (this.zoomTarget - pose.logH) * k;
      if (Math.abs(this.zoomTarget - pose.logH) < 1e-4) {
        pose.logH = this.zoomTarget;
        if (this.zoomAnchor) this.zoomAnchorFinal = true;
      }
      pose.tilt = tiltFor(Math.exp(pose.logH));
      if (Math.abs(pose.heading) > 0.01) pose.heading *= Math.exp(-dt / 200);
    } else if (this.mode === "auto") {
      if (Math.abs(this.vx) > 0.005 || Math.abs(this.vy) > 0.005) {
        this.dragBy(this.vx * dt, this.vy * dt);
        const decay = Math.exp(-dt / 110);
        this.vx *= decay;
        this.vy *= decay;
      } else if (this.autoRotate && !this.dragging) pose.lng = ((pose.lng + 0.045 * (dt / 16.7) + 180) % 360) - 180;
      pose.tilt = 0;
    }
    this.tweens.step(now);
    if (this.mode === "travel" && this.myTrip) this.updateTravelCamera(dt);
    else applyPose(this.camera, pose);
    this.camera.updateMatrixWorld();
    this.viewProj.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    if (this.mode === "free" && this.zoomAnchor) {
      this.settleZoomAnchor();
      if (this.zoomAnchorFinal) {
        this.zoomAnchor = null;
        this.zoomAnchorFinal = false;
      }
    }

    const h = Math.exp(pose.logH);
    const groundNow = groundExtentKm(pose, this.width, this.height);
    this.patch.update(pose.lat, pose.lng, h, groundNow.h, this.width / this.height, now);
    const glow = 0.12;
    const haloOpacity = glow * Math.max(0, Math.min(1, (h - 150) / 450));
    this.halo.material.uniforms.opacity.value = haloOpacity;
    this.halo.visible = haloOpacity > 0.01;
    const rimOpacity = glow * 0.85 * Math.max(0, Math.min(1, (h - 300) / 1500));
    this.rim.material.uniforms.opacity.value = rimOpacity;
    this.rim.visible = rimOpacity > 0.01;
    const gridOpacity = 0.2 * Math.max(0, Math.min(1, (Math.log(1200) - pose.logH) / (Math.log(1200) - Math.log(400))));
    this.grid.setOpacity(gridOpacity);
    if (gridOpacity > 0.005) {
      const ext = groundExtentKm(pose, this.width, this.height);
      const latSpan = Math.min(12, (ext.h * 0.8) / 111.32);
      const lngSpan = Math.min(20, (ext.w * 0.8) / (111.32 * Math.max(0.2, Math.cos((pose.lat * Math.PI) / 180))));
      this.grid.rebuild({ lat: pose.lat, lng: pose.lng }, latSpan, lngSpan, landSync());
    }
    this.highlights.animate(now, Math.max(0, Math.min(1, (Math.log(2500) - pose.logH) / (Math.log(2500) - Math.log(600)))));

    this.projectAll();
    const level = levelFor(h, this.level);
    if (level !== this.level) {
      this.level = level;
      this.events.onLevel?.(level);
    }
    this.frame.level = level;
    this.renderer.render(this.scene, this.camera);
    this.frame.version++;
    for (const cb of this.subscribers) cb(this.frame);
  }

  private updateTravelCamera(dt: number): void {
    const rt = this.myTrip!;
    const spec = rt.spec;
    const st = vehicleState({ ...spec, fromUnit: "", toUnit: "", toSpaceId: "", toName: "" }, this.now(), spec.from, spec.to);
    const longFlight = spec.mode === "flight" && spec.distanceKm > LONG_FLIGHT_KM;
    if (spec.mode === "flight" && !longFlight) {
      applyPose(this.camera, this.pose);
      return;
    }
    // Chase camera: sit above and behind the vehicle, looking a little ahead of it.
    // Long flights use the same rig scaled up so the plane, which flies high, stays mid-screen.
    // Long flights: high and steep enough that the horizon sits in the upper third of the
    // frame, so the Earth fills the view with the plane just above centre.
    const up = longFlight ? 1500 : 40;
    const back = longFlight ? 1200 : 60;
    const ahead = longFlight ? 600 : 40;
    const tau = longFlight ? 160 : 150;
    const ground = toWorld(st.ground.lat, st.ground.lng, 0);
    const anchor = longFlight ? toWorld(st.ground.lat, st.ground.lng, st.altKm) : ground;
    tangentFrame(st.ground.lat, st.ground.lng, this.tmpFrame);
    const f = bearingToTangent(this.tmpFrame, st.headingDeg);
    const n = this.tmpFrame.n;
    const targetPos = anchor.clone().addScaledVector(n, up).addScaledVector(f, -back);
    const targetLook = ground.clone().addScaledVector(f, ahead);
    // Use wall-clock time, not the clamped frame delta: on a slow frame the vehicle still
    // covers a lot of ground, so the follow has to converge in real time.
    const wall = performance.now();
    const realDt = this.chaseInit ? Math.min(1000, wall - this.followLast) : dt;
    this.followLast = wall;
    if (!this.chaseInit) {
      this.chasePos.copy(this.camera.position);
      this.chaseLook.copy(targetLook);
      this.chaseInit = true;
    }
    const k = 1 - Math.exp(-realDt / tau);
    this.chasePos.lerp(targetPos, k);
    this.chaseLook.lerp(targetLook, k);
    this.camera.position.copy(this.chasePos);
    this.camera.up.copy(n);
    this.camera.lookAt(this.chaseLook);
    this.camera.near = 0.5;
    this.camera.far = this.camera.position.length() + R * 0.2;
    this.camera.updateProjectionMatrix();
    const ll = toLatLng(this.chasePos);
    this.pose.lat = ll.lat;
    this.pose.lng = ll.lng;
    this.pose.logH = Math.log(Math.max(H_MIN, this.chasePos.length() - R));
    this.pose.tilt = longFlight ? 50 : 55;
    this.pose.heading = st.headingDeg;
  }

  private projectAll(): void {
    const C = this.camera.position;
    const R2 = R * R;
    let far = 0;
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const out = this.frame.points.get(p.id);
      if (!out) continue;
      const w = this.pointWorld[i];
      this.projectWorld(w, out);
      if (w.x * C.x + w.y * C.y + w.z * C.z < R2) far++;
    }
    this.frame.farSide = far;
    const now = this.now();
    for (const rt of this.trips.values()) {
      const f = rt.frame;
      const tmp = { x: 0, y: 0, visible: false, depth: 0 };
      for (let i = 0; i < rt.samples.length; i++) {
        this.projectWorld(rt.samples[i], tmp);
        f.path[i * 3] = tmp.x;
        f.path[i * 3 + 1] = tmp.y;
        f.path[i * 3 + 2] = tmp.visible ? 1 : 0;
      }
      let bulgeX = 0;
      let bulgeY = 0;
      const last = rt.samples.length - 1;
      if (rt.spec.mode === "flight" && f.path[2] > 0.5 && f.path[last * 3 + 2] > 0.5) {
        const dx = f.path[last * 3] - f.path[0];
        const dy = f.path[last * 3 + 1] - f.path[1];
        const len = Math.hypot(dx, dy);
        if (len > 4) {
          let nx = -dy / len;
          let ny = dx / len;
          if (ny > 0) {
            nx = -nx;
            ny = -ny;
          }
          const amp = Math.min(36, len * 0.04);
          bulgeX = nx * amp;
          bulgeY = ny * amp;
          for (let i = 0; i <= last; i++) {
            const k = Math.sin((Math.PI * i) / last);
            f.path[i * 3] += bulgeX * k;
            f.path[i * 3 + 1] += bulgeY * k;
          }
        }
      }
      const spec = rt.spec;
      const tripNow = spec.loop ? spec.startedAt + ((now - spec.startedAt) % spec.durationMs) : now;
      const st = vehicleState({ ...spec, fromUnit: "", toUnit: "", toSpaceId: "", toName: "" }, tripNow, spec.from, spec.to);
      f.s = st.s;
      f.done = spec.loop ? false : st.done;
      const flightArc = bulgeX !== 0 || bulgeY !== 0;
      const vw = toWorld(st.ground.lat, st.ground.lng, flightArc ? 0 : st.altKm, this.tmpV3);
      this.projectWorld(vw, f.vehicle);
      if (flightArc) {
        const k = Math.sin(Math.PI * st.s);
        f.vehicle.x += bulgeX * k;
        f.vehicle.y += bulgeY * k;
      }
      const sh = toWorld(st.ground.lat, st.ground.lng, 0, this.tmpV3);
      this.projectWorld(sh, f.shadow);
      const aheadS = Math.min(1, st.s + 0.01);
      const aheadGround = slerp(spec.from, spec.to, aheadS);
      const aw = toWorld(aheadGround.lat, aheadGround.lng, flightArc ? 0 : st.altKm, this.tmpV3);
      this.projectWorld(aw, tmp);
      if (flightArc) {
        const k = Math.sin(Math.PI * aheadS);
        tmp.x += bulgeX * k;
        tmp.y += bulgeY * k;
      }
      if (tmp.visible && f.vehicle.visible) f.angle = (Math.atan2(tmp.y - f.vehicle.y, tmp.x - f.vehicle.x) * 180) / Math.PI;
    }
  }

  distanceKmTo(a: LatLng, b: LatLng): number {
    return haversineKm(a, b);
  }
}
