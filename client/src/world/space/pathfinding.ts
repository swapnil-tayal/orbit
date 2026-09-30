import type { WalkGrid } from "@orbit/shared";

interface Node {
  i: number;
  g: number;
  f: number;
  parent: number;
}

const DIRS: Array<[number, number, number]> = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

export function nearestWalkableCell(grid: WalkGrid, x: number, y: number): { c: number; r: number } | null {
  const c0 = Math.max(0, Math.min(grid.cols - 1, Math.floor(x / grid.cell)));
  const r0 = Math.max(0, Math.min(grid.rows - 1, Math.floor(y / grid.cell)));
  if (grid.cells[r0 * grid.cols + c0]) return { c: c0, r: r0 };
  for (let radius = 1; radius < 12; radius++) {
    let best: { c: number; r: number; d: number } | null = null;
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== radius) continue;
        const c = c0 + dc;
        const r = r0 + dr;
        if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows) continue;
        if (!grid.cells[r * grid.cols + c]) continue;
        const d = dr * dr + dc * dc;
        if (!best || d < best.d) best = { c, r, d };
      }
    }
    if (best) return { c: best.c, r: best.r };
  }
  return null;
}

export function findPath(grid: WalkGrid, from: { x: number; y: number }, to: { x: number; y: number }): Array<{ x: number; y: number }> | null {
  const start = nearestWalkableCell(grid, from.x, from.y);
  const goal = nearestWalkableCell(grid, to.x, to.y);
  if (!start || !goal) return null;
  const cols = grid.cols;
  const idx = (c: number, r: number) => r * cols + c;
  const startI = idx(start.c, start.r);
  const goalI = idx(goal.c, goal.r);
  if (startI === goalI) return [{ x: to.x, y: to.y }];
  const h = (i: number) => {
    const dc = Math.abs((i % cols) - goal.c);
    const dr = Math.abs(Math.floor(i / cols) - goal.r);
    return Math.max(dc, dr) + (Math.SQRT2 - 1) * Math.min(dc, dr);
  };
  const open: Node[] = [{ i: startI, g: 0, f: h(startI), parent: -1 }];
  const best = new Map<number, Node>();
  best.set(startI, open[0]);
  const closed = new Set<number>();
  let found: Node | null = null;
  let guard = 0;
  while (open.length && guard++ < 20000) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (open[k].f < open[bi].f) bi = k;
    const cur = open.splice(bi, 1)[0];
    if (cur.i === goalI) {
      found = cur;
      break;
    }
    closed.add(cur.i);
    const c = cur.i % cols;
    const r = Math.floor(cur.i / cols);
    for (const [dc, dr, cost] of DIRS) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= grid.rows) continue;
      const ni = idx(nc, nr);
      if (!grid.cells[ni] || closed.has(ni)) continue;
      if (dc !== 0 && dr !== 0 && (!grid.cells[idx(c + dc, r)] || !grid.cells[idx(c, r + dr)])) continue;
      const g = cur.g + cost;
      const prev = best.get(ni);
      if (prev && prev.g <= g) continue;
      const node: Node = { i: ni, g, f: g + h(ni), parent: cur.i };
      best.set(ni, node);
      open.push(node);
    }
  }
  if (!found) return null;
  const cells: number[] = [];
  let n: Node | undefined = found;
  while (n && n.i !== startI) {
    cells.push(n.i);
    n = best.get(n.parent);
  }
  cells.reverse();
  const pts = cells.map((i) => ({ x: (i % cols) * grid.cell + grid.cell / 2, y: Math.floor(i / cols) * grid.cell + grid.cell / 2 }));
  const smoothed = smooth(grid, [{ x: from.x, y: from.y }, ...pts]);
  smoothed.push({ x: to.x, y: to.y });
  return smoothed.slice(1);
}

function lineClear(grid: WalkGrid, a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (grid.cell / 2));
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const c = Math.floor(x / grid.cell);
    const r = Math.floor(y / grid.cell);
    if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows || !grid.cells[r * grid.cols + c]) return false;
  }
  return true;
}

function smooth(grid: WalkGrid, pts: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  if (pts.length <= 2) return pts;
  const out = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !lineClear(grid, pts[i], pts[j])) j--;
    out.push(pts[j]);
    i = j;
  }
  return out;
}
