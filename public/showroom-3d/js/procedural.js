// Procedural windows and doors – geometry is generated from parameters,
// so any product the admin adds later can be rendered without 3D files.
// Local space: origin at the bottom-centre of the wall opening, +y up, +z into the room.
import * as THREE from 'three';

const BOX = new THREE.BoxGeometry(1, 1, 1);
const PLANE = new THREE.PlaneGeometry(1, 1);

function part(parent, mat, w, h, d, x, y, z) {
  const m = new THREE.Mesh(BOX, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function rect(out, x0, y0, x1, y1) {
  out.push([x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]);
}

function bars(parent, mat, x0, y0, x1, y1, t, d, z) {
  const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  part(parent, mat, w, t, d, cx, y0 + t / 2, z);
  part(parent, mat, w, t, d, cx, y1 - t / 2, z);
  part(parent, mat, t, h - 2 * t, d, x0 + t / 2, cy, z);
  part(parent, mat, t, h - 2 * t, d, x1 - t / 2, cy, z);
}

function pane(parent, mat, x0, y0, x1, y1, z) {
  const g = new THREE.Mesh(PLANE, mat);
  g.scale.set(x1 - x0, y1 - y0, 1);
  g.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
  parent.add(g);
  return g;
}

function handle(parent, mat, x, y, z, type = 'lever', len = 0.42) {
  if (type === 'bar') {
    part(parent, mat, 0.022, len, 0.022, x, y, z + 0.05);
    part(parent, mat, 0.016, 0.016, 0.05, x, y + len * 0.4, z + 0.025);
    part(parent, mat, 0.016, 0.016, 0.05, x, y - len * 0.4, z + 0.025);
  } else {
    part(parent, mat, 0.036, 0.085, 0.018, x, y, z + 0.009);
    part(parent, mat, 0.024, 0.15, 0.022, x, y - 0.06, z + 0.034);
  }
}

// A sash (opening leaf) wrapped in a pivot group so it can tilt / turn / slide.
function sash(parent, mats, out, glassList, x0, y0, x1, y1, z, opt = {}) {
  const s = opt.profile ?? 0.065;
  const d = opt.depth ?? 0.075;
  const px = opt.pivot === 'left' ? x0 : opt.pivot === 'right' ? x1 : (x0 + x1) / 2;
  const py = opt.pivot === 'bottom' ? y0 : (y0 + y1) / 2;
  const pivot = new THREE.Group();
  pivot.position.set(px, py, z);
  const inner = new THREE.Group();
  inner.position.set(-px, -py, 0);
  pivot.add(inner);
  parent.add(pivot);

  bars(inner, mats.sash, x0, y0, x1, y1, s, d, 0);
  glassList.push(pane(inner, mats.glass, x0 + s, y0 + s, x1 - s, y1 - s, 0));
  if (opt.handle) {
    const hx = opt.handle === 'left' ? x0 + s / 2 : x1 - s / 2;
    handle(inner, mats.gold, hx, opt.handleY ?? (y0 + y1) / 2, d / 2, opt.handleType, opt.handleLen);
  }
  rect(out, x0, y0, x1, y1);
  return pivot;
}

/**
 * @param {{type:'tilt'|'slide'|'fixed'|'door'|'patio', w:number, h:number}} spec
 * @returns product parts + intro/open motion definitions
 */
export function buildProduct(spec, mats) {
  const { w, h, type } = spec;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const out = [];
  const glass = [];
  const sashes = []; // { obj, key, closed, from, open }

  const isDoor = type === 'door' || type === 'patio';
  const f = isDoor ? 0.08 : 0.07;
  const d = isDoor ? 0.16 : 0.14;
  const X0 = -w / 2 + f, X1 = w / 2 - f;
  const Y0 = isDoor ? 0.03 : f, Y1 = h - f;

  // Outer frame
  part(body, mats.frame, w, f, d, 0, h - f / 2, 0);
  if (isDoor) {
    part(body, mats.frame, f, h - f, d, -w / 2 + f / 2, (h - f) / 2, 0);
    part(body, mats.frame, f, h - f, d, w / 2 - f / 2, (h - f) / 2, 0);
    part(body, mats.gold, w - 2 * f, 0.03, d, 0, 0.015, 0); // threshold
  } else {
    part(body, mats.frame, w, f, d, 0, f / 2, 0);
    part(body, mats.frame, f, h - 2 * f, d, -w / 2 + f / 2, h / 2, 0);
    part(body, mats.frame, f, h - 2 * f, d, w / 2 - f / 2, h / 2, 0);
  }
  rect(out, -w / 2, 0, w / 2, h);
  rect(out, X0, Y0, X1, Y1);

  switch (type) {
    case 'tilt': {
      const m = 0.07;
      part(body, mats.frame, m, Y1 - Y0, d * 0.95, 0, (Y0 + Y1) / 2, 0);
      const L = sash(body, mats, out, glass, X0, Y0, -m / 2, Y1, 0, { pivot: 'left', handle: 'right' });
      const R = sash(body, mats, out, glass, m / 2, Y0, X1, Y1, 0, { pivot: 'bottom', handle: 'left' });
      sashes.push(
        { obj: L.rotation, key: 'y', closed: 0, from: -1.0, open: -0.55 },
        { obj: R.rotation, key: 'x', closed: 0, from: 0.6, open: 0.16 },
      );
      break;
    }
    case 'slide':
    case 'patio': {
      const ov = 0.04, mid = (X0 + X1) / 2;
      const prof = type === 'patio' ? 0.075 : 0.065;
      sash(body, mats, out, glass, X0, Y0, mid + ov, Y1, -0.03, { pivot: 'center', profile: prof });
      const R = sash(body, mats, out, glass, mid - ov, Y0, X1, Y1, 0.03, {
        pivot: 'center', profile: prof, handle: 'left', handleType: 'bar',
        handleLen: type === 'patio' ? 0.6 : 0.42, handleY: type === 'patio' ? 1.05 : undefined,
      });
      const x0 = R.position.x;
      const travel = (X1 - X0) * 0.42;
      sashes.push({ obj: R.position, key: 'x', closed: x0, from: x0 - travel, open: x0 - travel });
      break;
    }
    case 'fixed': {
      const m = 0.065;
      const yT = Y0 + (Y1 - Y0) * 0.7;
      part(body, mats.frame, X1 - X0, m, d * 0.95, 0, yT, 0);
      const c = (X1 - X0) / 3, xa = X0 + c, xb = X0 + 2 * c;
      const mh = yT - m / 2 - Y0;
      part(body, mats.frame, m, mh, d * 0.95, xa, Y0 + mh / 2, 0);
      part(body, mats.frame, m, mh, d * 0.95, xb, Y0 + mh / 2, 0);
      const yb = yT - m / 2;
      for (const [a, b] of [[X0, xa - m / 2], [xa + m / 2, xb - m / 2], [xb + m / 2, X1]]) {
        glass.push(pane(body, mats.glass, a, Y0, b, yb, 0));
        rect(out, a, Y0, b, yb);
      }
      const T = sash(body, mats, out, glass, X0, yT + m / 2, X1, Y1, 0, { pivot: 'bottom' });
      handle(T.children[0], mats.gold, 0, Y1 - 0.065 / 2, 0.0375, 'lever');
      sashes.push({ obj: T.rotation, key: 'x', closed: 0, from: 0.65, open: 0.22 });
      break;
    }
    case 'door': {
      const pivot = new THREE.Group();
      pivot.position.set(X0, 0, 0);
      const inner = new THREE.Group();
      inner.position.set(-X0, 0, 0);
      pivot.add(inner);
      body.add(pivot);
      const lw = X1 - X0, lh = Y1 - Y0, cx = (X0 + X1) / 2;
      part(inner, mats.panel, lw, lh, 0.075, cx, (Y0 + Y1) / 2, 0);
      // vertical glass insert + gold inlay lines
      const gx = X0 + lw * 0.3;
      pane(inner, mats.glassDark, gx - 0.07, Y0 + 0.28, gx + 0.07, Y1 - 0.28, 0.0385);
      part(inner, mats.gold, 0.006, lh - 0.5, 0.004, gx + 0.11, (Y0 + Y1) / 2, 0.039);
      // pull bar
      const bx = X1 - 0.13;
      part(inner, mats.gold, 0.028, 1.2, 0.028, bx, 1.05, 0.11);
      part(inner, mats.gold, 0.02, 0.02, 0.07, bx, 1.55, 0.07);
      part(inner, mats.gold, 0.02, 0.02, 0.07, bx, 0.55, 0.07);
      for (const y of [0.32, 1.2, 2.0]) part(body, mats.chrome, 0.022, 0.12, 0.03, X0, y, 0.045);
      rect(out, X0, Y0, X1, Y1);
      sashes.push({ obj: pivot.rotation, key: 'y', closed: 0, from: -1.3, open: -0.9 });
      break;
    }
  }

  // Invisible hit box for pointer picking (not scaled by the intro)
  const hit = new THREE.Mesh(BOX, mats.hit);
  hit.scale.set(w + 0.1, h + 0.1, 0.5);
  hit.position.set(0, h / 2, 0.2);
  root.add(hit);

  return { root, body, glass, sashes, outline: out, hit, frontZ: d / 2 };
}
