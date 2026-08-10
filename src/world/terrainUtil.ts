import * as THREE from 'three';

// ---- Deterministic value noise + fbm used across the campus for terrain,
// rock/plant scatter and tint variation so everything stays procedurally
// consistent (no texture assets are needed).

export function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

export function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

export function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = smooth(fx);
  const sy = smooth(fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

export function fbm(x: number, y: number, octaves = 4): number {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    v += amp * valueNoise(x * f, y * f);
    amp *= 0.5;
    f *= 2.13;
  }
  return v;
}

// Campus ground is mostly flat (it's an academy), with gentle swells far out
// and a hard flat hardstand near the buildings.
export function campusHeight(x: number, z: number): number {
  const d = Math.hypot(x, z);
  const near = Math.max(0, 1 - d / 46);
  const m = Math.max(0, 1 - near) * Math.min(1, (d - 30) / 90);
  const h = fbm(x * 0.012 + 4.2, z * 0.012 - 1.7) * 2.4;
  return h * m;
}

// Scatter layout: N items in a ring/area, each with position, rotation, scale
// and a per-item seed, so modules can place rocks/bushes/etc consistently.
export interface ScatterItem {
  position: THREE.Vector3;
  rot: number;
  scale: number;
  seed: number;
}

export function scatter(
  count: number,
  opts: {
    x: [number, number];
    z: [number, number];
    base: number;
    seed: number;
    avoid?: (x: number, z: number) => boolean;
    ring?: boolean;
  }
): ScatterItem[] {
  const items: ScatterItem[] = [];
  let s = opts.seed;
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  let guard = 0;
  while (items.length < count && guard++ < count * 40) {
    const [x0, x1] = opts.x;
    const [z0, z1] = opts.z;
    let x: number;
    let z: number;
    if (opts.ring) {
      const a = next() * Math.PI * 2;
      const r = x0 + next() * (x1 - x0);
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
    } else {
      x = x0 + next() * (x1 - x0);
      z = z0 + next() * (z1 - z0);
    }
    if (opts.avoid && opts.avoid(x, z)) continue;
    const p = opts.base;
    items.push({
      position: new THREE.Vector3(x, p, z),
      rot: next() * Math.PI * 2,
      scale: 0.7 + next() * 0.6,
      seed: Math.round(next() * 100000),
    });
  }
  return items;
}

// Build a BufferGeometry with per-vertex colors baked in.
export function tintedPlane(
  w: number,
  h: number,
  colorFn: (x: number, z: number) => THREE.Color,
  cells = 48
): THREE.PlaneGeometry {
  const g = new THREE.PlaneGeometry(w, h, cells, cells);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    c.copy(colorFn(pos.getX(i), pos.getZ(i)));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}
