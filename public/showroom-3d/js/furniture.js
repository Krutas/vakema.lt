// Procedural home furnishings – a living zone, a dining zone, a sideboard and plants,
// so the showroom reads as a real home. Everything is built from primitives in code.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { fabric, leafSprig, oakFloor } from './textures.js';

const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 28);
export const WARM = new THREE.Color(3.2, 2.0, 1.0);

export function createFurnitureMaterials() {
  const weave = fabric();
  const grain = oakFloor().map;
  grain.repeat.set(1, 1);
  return {
    fabric: new THREE.MeshStandardMaterial({ color: '#4a4844', roughness: 0.95, bumpMap: weave, bumpScale: 0.6 }),
    fabricDark: new THREE.MeshStandardMaterial({ color: '#2c2c30', roughness: 0.95, bumpMap: weave, bumpScale: 0.6 }),
    accent: new THREE.MeshStandardMaterial({ color: '#9c7238', roughness: 0.9, bumpMap: weave, bumpScale: 0.5 }),
    wood: new THREE.MeshStandardMaterial({ color: '#6b4a34', map: grain, roughness: 0.5 }),
    marble: new THREE.MeshStandardMaterial({ color: '#2b2b2e', roughness: 0.18, metalness: 0.1 }),
    metal: new THREE.MeshStandardMaterial({ color: '#1b1c1f', roughness: 0.4, metalness: 0.8 }),
    ceramic: new THREE.MeshStandardMaterial({ color: '#d8d0c2', roughness: 0.6 }),
    pot: new THREE.MeshStandardMaterial({ color: '#25221f', roughness: 0.85 }),
    leaf: new THREE.MeshStandardMaterial({ color: '#b8c9a8', map: leafSprig(33), alphaTest: 0.45, roughness: 0.6, side: THREE.DoubleSide }),
    rug: new THREE.MeshStandardMaterial({ color: '#3a332c', roughness: 1, bumpMap: weave, bumpScale: 1.2 }),
    rugBorder: new THREE.MeshStandardMaterial({ color: '#4b3e2f', roughness: 1 }),
    shade: new THREE.MeshStandardMaterial({ color: '#16171a', roughness: 0.35, metalness: 0.9, side: THREE.DoubleSide }),
    bulb: new THREE.MeshBasicMaterial({ color: 0x000000 }), // lit to WARM in the intro
  };
}

function mk(parent, geo, mat, sx, sy, sz, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}
const box = (p, mat, w, h, d, x, y, z, ry = 0) => mk(p, BOX, mat, w, h, d, x, y, z, 0, ry);
const cyl = (p, mat, r, h, x, y, z) => mk(p, CYL, mat, r, h, r, x, y, z);
const rbox = (p, mat, w, h, d, r, x, y, z, rx = 0, ry = 0, rz = 0) =>
  mk(p, new RoundedBoxGeometry(w, h, d, 3, r), mat, 1, 1, 1, x, y, z, rx, ry, rz);

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Local space for every piece: origin on the floor, front facing +z.
function sofa(m) {
  const g = new THREE.Group();
  box(g, m.metal, 2.5, 0.1, 0.86, 0, 0.05, 0);
  rbox(g, m.fabric, 1.18, 0.22, 0.78, 0.07, -0.6, 0.27, 0.05);
  rbox(g, m.fabric, 1.18, 0.22, 0.78, 0.07, 0.6, 0.27, 0.05);
  rbox(g, m.fabric, 2.44, 0.52, 0.22, 0.08, 0, 0.52, -0.36);
  rbox(g, m.fabric, 0.22, 0.46, 0.9, 0.08, -1.31, 0.36, 0);
  rbox(g, m.fabric, 0.22, 0.46, 0.9, 0.08, 1.31, 0.36, 0);
  rbox(g, m.fabricDark, 1.1, 0.42, 0.16, 0.07, -0.58, 0.62, -0.19, -0.18);
  rbox(g, m.fabricDark, 1.1, 0.42, 0.16, 0.07, 0.58, 0.62, -0.19, -0.18);
  rbox(g, m.accent, 0.42, 0.38, 0.12, 0.06, -0.86, 0.58, -0.04, -0.2, 0.25);
  rbox(g, m.accent, 0.38, 0.34, 0.12, 0.06, 0.92, 0.56, -0.05, -0.2, -0.3);
  return g;
}

function coffeeTable(m, gold) {
  const g = new THREE.Group();
  cyl(g, m.marble, 0.52, 0.04, 0, 0.38, 0);
  cyl(g, gold, 0.07, 0.34, 0, 0.19, 0);
  cyl(g, gold, 0.28, 0.02, 0, 0.01, 0);
  box(g, m.ceramic, 0.3, 0.035, 0.22, 0.12, 0.418, 0.1, 0.3);
  box(g, m.wood, 0.26, 0.03, 0.2, 0.12, 0.45, 0.1, 0.1);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), gold);
  bowl.position.set(-0.18, 0.51, -0.08);
  g.add(bowl);
  return g;
}

function rug(m) {
  const g = new THREE.Group();
  box(g, m.rugBorder, 3.4, 0.012, 2.6, 0, 0.006, 0);
  box(g, m.rug, 3.2, 0.014, 2.4, 0, 0.008, 0);
  return g;
}

function pouf(m) {
  const g = new THREE.Group();
  mk(g, new THREE.CylinderGeometry(0.3, 0.3, 0.38, 24), m.accent, 1, 1, 1, 0, 0.19, 0);
  return g;
}

function arcLamp(m, gold) {
  const g = new THREE.Group();
  cyl(g, m.marble, 0.2, 0.05, 0, 0.025, 0);
  const end = new THREE.Vector3(1.35, 2.05, 0);
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0.1, 2.7, 0), end);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.014, 6), gold));
  const shade = new THREE.Mesh(new THREE.SphereGeometry(0.24, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), m.shade);
  shade.position.copy(end).add(new THREE.Vector3(0, -0.12, 0));
  g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 8), m.bulb);
  bulb.position.copy(end).add(new THREE.Vector3(0, -0.12, 0));
  g.add(bulb);
  const light = new THREE.PointLight('#ffb36b', 0, 7, 2);
  light.position.copy(end).add(new THREE.Vector3(0, -0.3, 0));
  light.userData.on = 9;
  g.add(light);
  return { g, light };
}

function chair(m) {
  const g = new THREE.Group();
  for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) box(g, m.metal, 0.025, 0.44, 0.025, x, 0.22, z);
  rbox(g, m.fabric, 0.46, 0.07, 0.46, 0.03, 0, 0.46, 0);
  rbox(g, m.fabric, 0.46, 0.42, 0.06, 0.03, 0, 0.72, -0.21, -0.08);
  return g;
}

function diningSet(m, gold) {
  const g = new THREE.Group();
  box(g, m.wood, 0.95, 0.05, 1.75, 0, 0.745, 0);
  box(g, m.metal, 0.8, 0.72, 0.05, 0, 0.36, -0.62);
  box(g, m.metal, 0.8, 0.72, 0.05, 0, 0.36, 0.62);
  mk(g, new THREE.CylinderGeometry(0.06, 0.09, 0.32, 20), m.ceramic, 1, 1, 1, 0, 0.93, 0.1);
  cyl(g, gold, 0.03, 0.12, 0.12, 0.83, -0.35);
  cyl(g, gold, 0.03, 0.18, -0.1, 0.86, -0.42);
  for (const [x, z, ry] of [[-0.62, -0.42, Math.PI / 2], [-0.62, 0.42, Math.PI / 2], [0.62, -0.42, -Math.PI / 2], [0.62, 0.42, -Math.PI / 2]]) {
    const c = chair(m);
    c.position.set(x, 0, z);
    c.rotation.y = ry;
    g.add(c);
  }
  return g;
}

// Hangs from the ceiling: origin at ceiling height, children below.
function pendants(m, drop) {
  const g = new THREE.Group();
  const lights = [];
  [[-0.0, -0.45, 0.0], [0.0, 0.0, 0.25], [0.0, 0.45, -0.1]].forEach(([x, z, dy]) => {
    const len = drop + dy;
    box(g, m.metal, 0.008, len, 0.008, x, -len / 2, z);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 12), m.bulb);
    globe.position.set(x, -len - 0.12, z);
    g.add(globe);
  });
  const light = new THREE.PointLight('#ffb36b', 0, 6, 2);
  light.position.set(0, -drop - 0.35, 0);
  light.userData.on = 10;
  g.add(light);
  lights.push(light);
  return { g, lights };
}

function sideboard(m, gold) {
  const g = new THREE.Group();
  for (const x of [-1.0, 1.0]) for (const z of [-0.15, 0.15]) cyl(g, gold, 0.015, 0.12, x, 0.06, z);
  box(g, m.wood, 2.2, 0.46, 0.42, 0, 0.35, 0);
  for (let i = 0; i < 14; i++) box(g, m.metal, 0.012, 0.4, 0.006, -1.0 + i * (2.0 / 13), 0.35, 0.212);
  mk(g, new THREE.CylinderGeometry(0.07, 0.11, 0.42, 20), m.ceramic, 1, 1, 1, -0.65, 0.79, 0);
  mk(g, new THREE.CylinderGeometry(0.05, 0.08, 0.26, 20), m.pot, 1, 1, 1, -0.45, 0.71, 0.05);
  box(g, m.accent, 0.32, 0.05, 0.24, 0.55, 0.605, 0, 0.1);
  box(g, m.ceramic, 0.3, 0.04, 0.22, 0.55, 0.65, 0, -0.08);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), gold);
  bowl.position.set(0.05, 0.71, 0);
  g.add(bowl);
  return g;
}

function plant(m, seed, height = 1.5) {
  const g = new THREE.Group();
  const r = rng(seed);
  mk(g, new THREE.CylinderGeometry(0.24, 0.18, 0.44, 18), m.pot, 1, 1, 1, 0, 0.22, 0);
  const leafGeo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0); // leaf-sprig card, pivot at its base
  const stems = 5 + Math.floor(r() * 3);
  for (let i = 0; i < stems; i++) {
    const a = (i / stems) * Math.PI * 2 + r();
    const lean = 0.12 + r() * 0.22;
    const len = height * (0.55 + r() * 0.45);
    const top = new THREE.Vector3(Math.cos(a) * lean * len, 0.42 + len, Math.sin(a) * lean * len);
    const base = new THREE.Vector3(0, 0.42, 0);
    const stem = new THREE.Mesh(CYL, m.wood);
    stem.scale.set(0.012, base.distanceTo(top), 0.012);
    stem.position.copy(base).lerp(top, 0.5);
    stem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(base).normalize());
    g.add(stem);
    const leaves = 6 + Math.floor(r() * 4);
    for (let j = 0; j < leaves; j++) {
      const t = 0.4 + (j / leaves) * 0.6;
      const leaf = new THREE.Mesh(leafGeo, m.leaf);
      leaf.position.copy(base).lerp(top, t);
      leaf.scale.setScalar(0.32 + r() * 0.18);
      // face outward from the stem and arch over
      leaf.rotation.set(-(0.5 + r() * 0.7), a + (r() - 0.5) * 1.6 - Math.PI / 2, 0, 'YXZ');
      leaf.castShadow = true;
      g.add(leaf);
    }
  }
  return g;
}

/**
 * @param leftWall wall group for the windows side (sideboard sits under the wide window)
 * @param ceilingY ceiling height for the pendants
 */
export function buildFurniture(m, gold, { leftWall, sideboardU, wallFace, ceilingY }) {
  const group = new THREE.Group();
  const items = []; // { obj, phase: 'structure' | 'light' }
  const lights = [];
  const place = (obj, x, z, ry = 0, phase = 'structure', parent = group) => {
    obj.position.set(x, obj.position.y, z);
    obj.rotation.y = ry;
    parent.add(obj);
    items.push({ obj, phase });
    return obj;
  };

  // Living zone (windows side)
  place(rug(m), -2.3, 1.3);
  place(sofa(m), -3.35, 1.3, Math.PI / 2);
  place(coffeeTable(m, gold), -1.95, 1.25);
  place(pouf(m), -1.5, 2.45);
  const lamp = arcLamp(m, gold);
  place(lamp.g, -3.75, -0.5, -0.35);
  lights.push(lamp.light);

  // Dining zone (doors side)
  place(diningSet(m, gold), 2.75, 1.0);
  const pend = pendants(m, 2.45);
  pend.g.position.y = ceilingY;
  place(pend.g, 2.75, 1.0, 0, 'light');
  lights.push(...pend.lights);

  // Sideboard under the wide window (child of the wall so it follows its angle)
  const sb = sideboard(m, gold);
  place(sb, sideboardU, wallFace + 0.24, 0, 'structure', leftWall);

  // Greenery
  place(plant(m, 7, 1.45), -3.05, -1.95);
  place(plant(m, 42, 0.9), 4.35, 2.55);
  place(plant(m, 3, 1.25), -5.6, 2.9);

  const meshes = [];
  group.traverse((o) => o.isMesh && meshes.push(o));
  sb.traverse((o) => o.isMesh && meshes.push(o));
  return { group, items, lights, meshes, bulbColor: m.bulb.color };
}
