import { PerspectiveCamera, Vector3 } from "three";
import { tangentFrame, toWorld, type Frame } from "./coords.ts";
import { R, VFOV } from "./constants.ts";

export interface Pose {
  lat: number;
  lng: number;
  logH: number;
  tilt: number;
  heading: number;
}

const DEG = Math.PI / 180;
const frame: Frame = { n: new Vector3(), east: new Vector3(), north: new Vector3() };
const P = new Vector3();
const behind = new Vector3();
const offset = new Vector3();
const up = new Vector3();

export function applyPose(camera: PerspectiveCamera, pose: Pose): void {
  const h = Math.exp(pose.logH);
  const tau = pose.tilt * DEG;
  const theta = pose.heading * DEG;
  tangentFrame(pose.lat, pose.lng, frame);
  toWorld(pose.lat, pose.lng, 0, P);
  const D = h / Math.cos(tau);
  behind.copy(frame.north).multiplyScalar(-Math.cos(theta)).addScaledVector(frame.east, -Math.sin(theta));
  offset.copy(frame.n).multiplyScalar(Math.cos(tau)).addScaledVector(behind, Math.sin(tau)).multiplyScalar(D);
  camera.position.copy(P).add(offset);
  up.copy(frame.north).multiplyScalar(Math.cos(theta)).addScaledVector(frame.east, Math.sin(theta));
  camera.up.copy(up);
  camera.lookAt(P);
  camera.near = Math.max(0.5, h * 0.02);
  camera.far = camera.position.length() + R * 0.2;
  camera.updateProjectionMatrix();
}

export function rangeFor(pose: Pose): number {
  return Math.exp(pose.logH) / Math.cos(pose.tilt * DEG);
}

export function pixelsPerKm(pose: Pose, viewportH: number): { x: number; y: number } {
  const D = rangeFor(pose);
  const ppk = viewportH / (2 * D * Math.tan((VFOV / 2) * DEG));
  return { x: ppk, y: ppk * Math.cos(pose.tilt * DEG) };
}

export function groundExtentKm(pose: Pose, viewportW: number, viewportH: number): { w: number; h: number } {
  const D = rangeFor(pose);
  const hExt = 2 * D * Math.tan((VFOV / 2) * DEG);
  return { w: (hExt * viewportW) / viewportH, h: hExt / Math.cos(pose.tilt * DEG) };
}
