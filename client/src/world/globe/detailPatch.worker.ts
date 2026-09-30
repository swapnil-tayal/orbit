import { geoEquirectangular } from "d3-geo";
import { loadLand10, loadLand50, paintEarth, type LandSet } from "./texture.ts";

export interface PatchRequest {
  id: number;
  lat: number;
  lng: number;
  latSpan: number;
  lngSpan: number;
  width: number;
  height: number;
  pxPerDeg: number;
}

export interface PatchResponse {
  id: number;
  bitmap: ImageBitmap;
  fine: boolean;
}

const DEG = Math.PI / 180;
let land: LandSet | null = null;
let fine = false;
let canvas: OffscreenCanvas | null = null;

void loadLand50().then((l) => {
  if (!fine) land = l;
});
void loadLand10().then((l) => {
  land = l;
  fine = true;
});

self.onmessage = async (e: MessageEvent<PatchRequest>) => {
  const req = e.data;
  try {
    await handle(req);
  } catch (err) {
    console.error("detail patch build failed", err);
  }
};

async function handle(req: PatchRequest): Promise<void> {
  if (!land) land = await loadLand50();
  if (!canvas) canvas = new OffscreenCanvas(req.width, req.height);
  if (canvas.width !== req.width || canvas.height !== req.height) {
    canvas.width = req.width;
    canvas.height = req.height;
  }
  const ctx = canvas.getContext("2d")!;
  const projection = geoEquirectangular()
    .scale(req.pxPerDeg / DEG)
    .center([req.lng, req.lat])
    .translate([req.width / 2, req.height / 2])
    .clipExtent([
      [0, 0],
      [req.width, req.height],
    ]);
  const pad = 0.5;
  paintEarth(ctx, land, {
    projection,
    width: req.width,
    height: req.height,
    pxPerDeg: req.pxPerDeg,
    glowPx: Math.min(220, Math.max(6, req.pxPerDeg * 1.8)),
    strokePx: Math.max(1.5, req.pxPerDeg * 0.015),
    includeOceanBlobs: true,
    window: { west: req.lng - req.lngSpan / 2 - pad, east: req.lng + req.lngSpan / 2 + pad, south: req.lat - req.latSpan / 2 - pad, north: req.lat + req.latSpan / 2 + pad },
  });
  const bitmap = await createImageBitmap(canvas, { imageOrientation: "flipY" });
  const res: PatchResponse = { id: req.id, bitmap, fine };
  (self as unknown as Worker).postMessage(res, [bitmap]);
}
