import { BufferAttribute, BufferGeometry, Color, DoubleSide, Group, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, Vector3 } from "three";
import { unitBounds, unitCentre, unitsInWindow, type LandIndex, type LatLng, type UnitId } from "@orbit/shared";
import { toWorld } from "./coords.ts";

const LIFT_GRID = 0.6;
const LIFT_QUAD = 0.9;
const MAX_CELLS = 2600;

export class GridLayer {
  readonly lines: LineSegments;
  private positions = new Float32Array(MAX_CELLS * 2 * 2 * 3);
  private focusKey = "";
  private tmp = new Vector3();

  constructor() {
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(this.positions, 3));
    geo.setDrawRange(0, 0);
    const mat = new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
    this.lines = new LineSegments(geo, mat);
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 2;
  }

  setOpacity(o: number): void {
    (this.lines.material as LineBasicMaterial).opacity = o;
    this.lines.visible = o > 0.005;
  }

  rebuild(centre: LatLng, latSpanDeg: number, lngSpanDeg: number, land: LandIndex | null): void {
    const key = `${centre.lat.toFixed(2)}:${centre.lng.toFixed(2)}:${latSpanDeg.toFixed(2)}`;
    if (key === this.focusKey) return;
    this.focusKey = key;
    const units = unitsInWindow(centre, latSpanDeg, lngSpanDeg);
    let n = 0;
    const pos = this.positions;
    for (const id of units) {
      if (n >= MAX_CELLS) break;
      const c = unitCentre(id);
      if (land && !land.isLand(c.lat, c.lng)) continue;
      const b = unitBounds(id);
      let o = n * 12;
      toWorld(b.south, b.west, LIFT_GRID, this.tmp);
      pos[o++] = this.tmp.x;
      pos[o++] = this.tmp.y;
      pos[o++] = this.tmp.z;
      toWorld(b.south, b.east, LIFT_GRID, this.tmp);
      pos[o++] = this.tmp.x;
      pos[o++] = this.tmp.y;
      pos[o++] = this.tmp.z;
      toWorld(b.south, b.west, LIFT_GRID, this.tmp);
      pos[o++] = this.tmp.x;
      pos[o++] = this.tmp.y;
      pos[o++] = this.tmp.z;
      toWorld(b.north, b.west, LIFT_GRID, this.tmp);
      pos[o++] = this.tmp.x;
      pos[o++] = this.tmp.y;
      pos[o++] = this.tmp.z;
      n++;
    }
    const attr = this.lines.geometry.getAttribute("position") as BufferAttribute;
    attr.needsUpdate = true;
    this.lines.geometry.setDrawRange(0, n * 4);
  }
}

export interface Highlight {
  unitId: UnitId;
  color: number;
  opacity: number;
  pulse?: boolean;
}

export class HighlightLayer {
  readonly group = new Group();
  private meshes = new Map<UnitId, Mesh<BufferGeometry, MeshBasicMaterial>>();
  private specs = new Map<UnitId, Highlight>();

  set(list: Highlight[]): void {
    const keep = new Set<UnitId>();
    for (const h of list) {
      keep.add(h.unitId);
      this.specs.set(h.unitId, h);
      let mesh = this.meshes.get(h.unitId);
      if (!mesh) {
        mesh = this.build(h.unitId);
        this.meshes.set(h.unitId, mesh);
        this.group.add(mesh);
      }
      mesh.material.color = new Color(h.color);
      mesh.material.opacity = h.opacity;
    }
    for (const [id, mesh] of this.meshes) {
      if (!keep.has(id)) {
        this.group.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        this.meshes.delete(id);
        this.specs.delete(id);
      }
    }
  }

  animate(t: number, globalOpacity: number): void {
    for (const [id, mesh] of this.meshes) {
      const spec = this.specs.get(id);
      if (!spec) continue;
      const pulse = spec.pulse ? 0.75 + 0.25 * Math.sin(t / 380) : 1;
      mesh.material.opacity = spec.opacity * pulse * globalOpacity;
      mesh.visible = mesh.material.opacity > 0.01;
    }
  }

  private build(unitId: UnitId): Mesh<BufferGeometry, MeshBasicMaterial> {
    const b = unitBounds(unitId);
    const sw = toWorld(b.south, b.west, LIFT_QUAD);
    const se = toWorld(b.south, b.east, LIFT_QUAD);
    const ne = toWorld(b.north, b.east, LIFT_QUAD);
    const nw = toWorld(b.north, b.west, LIFT_QUAD);
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(new Float32Array([sw.x, sw.y, sw.z, se.x, se.y, se.z, ne.x, ne.y, ne.z, sw.x, sw.y, sw.z, ne.x, ne.y, ne.z, nw.x, nw.y, nw.z]), 3));
    const mat = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false, side: DoubleSide });
    const mesh = new Mesh(geo, mat);
    mesh.renderOrder = 3;
    mesh.frustumCulled = false;
    return mesh;
  }
}
