// Daylight garden around the showroom: lawn, terrace with pool and loungers, trees,
// hedges, flower beds and birds. All procedural; update(t) drives wind, water and birds.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { bark, leafSprig } from './textures.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

function canvasTexture(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const grassTexture = () => canvasTexture(256, 256, (x, w, h) => {
  const r = rng(7);
  x.fillStyle = '#5a7d39';
  x.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) {
    x.fillStyle = `rgba(${(40 + r() * 45) | 0},${(85 + r() * 65) | 0},${(28 + r() * 25) | 0},${0.25 + r() * 0.35})`;
    x.fillRect(r() * w, r() * h, 1 + r() * 2, 2 + r() * 4);
  }
}, [40, 40]);

const plankTexture = () => canvasTexture(64, 256, (x, w, h) => {
  const r = rng(3);
  for (let i = 0; i < 8; i++) {
    const l = 52 + r() * 10;
    x.fillStyle = `hsl(28, 32%, ${l}%)`;
    x.fillRect(i * 8, 0, 8, h);
    x.fillStyle = 'rgba(40, 25, 15, .55)';
    x.fillRect(i * 8 + 7, 0, 1, h);
  }
}, [6, 1]);

const WATER_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vW;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const WATER_FRAG = /* glsl */ `
uniform float uTime;
uniform float uLight;
varying vec2 vUv;
varying vec3 vW;
void main() {
  vec2 p = vW.xz;
  float w = sin(p.x * 2.7 + uTime * 1.1) * sin(p.y * 3.1 - uTime * 0.9);
  w += 0.6 * sin((p.x - p.y) * 5.3 + uTime * 1.7);
  w += 0.4 * sin((p.x * 0.7 + p.y) * 9.1 - uTime * 2.3);
  float caustic = smoothstep(0.9, 1.6, w);
  float edge = smoothstep(0.0, 0.14, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
  vec3 col = mix(vec3(0.09, 0.45, 0.55), vec3(0.03, 0.28, 0.42), edge);
  col += vec3(0.55, 0.85, 0.9) * caustic * 0.35;
  // sky reflection at grazing angles
  float fres = pow(1.0 - abs(normalize(cameraPosition - vW).y), 4.0);
  col = mix(col, vec3(0.55, 0.68, 0.82), fres * 0.75);
  gl_FragColor = vec4(col * uLight, 1.0);
}`;

function materials() {
  return {
    grass: new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: 1 }),
    deck: new THREE.MeshStandardMaterial({ map: plankTexture(), roughness: 0.75 }),
    stone: new THREE.MeshStandardMaterial({ color: '#d9d3c7', roughness: 0.7 }),
    bark: new THREE.MeshStandardMaterial({ map: bark(), roughness: 1 }),
    leaves: new THREE.MeshStandardMaterial({ map: leafSprig(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75 }),
    blade: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, side: THREE.DoubleSide }),
    hedge: new THREE.MeshStandardMaterial({ color: '#1f3a19', roughness: 1 }),
    frame: new THREE.MeshStandardMaterial({ color: '#2a2f36', metalness: 0.7, roughness: 0.35 }),
    cushion: new THREE.MeshStandardMaterial({ color: '#ece6da', roughness: 0.85 }),
    canopy: new THREE.MeshStandardMaterial({ color: '#eadfc9', roughness: 0.9, side: THREE.DoubleSide }),
    bird: new THREE.MeshBasicMaterial({ color: '#2b2f36', side: THREE.DoubleSide }),
    water: new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uLight: { value: 0 } },
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
    }),
  };
}

function shadows(obj) {
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return obj;
}

const CARD = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);

// Leaf cards scattered by `sample(o)` (sets o.position); random orientation, size and tint.
function foliage(m, r, count, size, sample) {
  const mesh = new THREE.InstancedMesh(CARD, m.leaves, count);
  const o = new THREE.Object3D();
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    sample(o);
    o.rotation.set(r() * Math.PI * 2, r() * Math.PI * 2, r() * Math.PI * 2);
    o.scale.setScalar(size * (0.7 + r() * 0.6));
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    c.setRGB(0.75 + r() * 0.35, 0.8 + r() * 0.3, 0.55 + r() * 0.3);
    mesh.setColorAt(i, c);
  }
  return mesh;
}

// A point in a ball, biased toward the surface so a crown reads as a mass of leaves.
function inBall(o, r, x, y, z, rad, squash = 0.85) {
  const u = r() * 2 - 1, th = r() * Math.PI * 2, d = rad * Math.cbrt(0.3 + 0.7 * r());
  const sq = Math.sqrt(1 - u * u);
  o.position.set(x + d * sq * Math.cos(th), y + d * u * squash, z + d * sq * Math.sin(th));
}

function tree(m, r, s) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * s, 0.16 * s, 2.6 * s, 8), m.bark);
  trunk.position.y = 1.3 * s;
  g.add(trunk);
  const crown = new THREE.Group();
  crown.position.y = 2.2 * s;
  g.add(crown);
  const blobs = [];
  const n = 4 + ((r() * 3) | 0);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = (0.3 + r() * 0.6) * s;
    blobs.push([Math.cos(a) * d, (0.7 + r() * 1.3) * s, Math.sin(a) * d, (0.75 + r() * 0.5) * s]);
    // a branch from the trunk top toward each leaf mass
    const len = Math.hypot(blobs[i][0], blobs[i][1] - 0.2 * s, blobs[i][2]);
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * s, 0.06 * s, len, 5).translate(0, len / 2, 0), m.bark);
    br.position.y = 0.2 * s;
    br.lookAt(blobs[i][0], blobs[i][1], blobs[i][2]);
    br.rotateX(Math.PI / 2);
    crown.add(br);
  }
  crown.add(foliage(m, r, Math.round(650 * s), 0.55 * s, (o) => {
    const b = blobs[(r() * blobs.length) | 0];
    inBall(o, r, b[0], b[1], b[2], b[3]);
  }));
  return { group: g, crown };
}

function cypress(m, r, s) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * s, 0.1 * s, 0.8 * s, 6), m.bark);
  trunk.position.y = 0.4 * s;
  g.add(trunk);
  const crown = new THREE.Group();
  crown.position.y = 0.5 * s;
  g.add(crown);
  crown.add(foliage(m, r, Math.round(520 * s), 0.42 * s, (o) => {
    const t = r();
    inBall(o, r, 0, (0.2 + t * 3.4) * s, 0, (0.62 * (1 - t * 0.85)) * s, 0.6);
  }));
  return { group: g, crown };
}

// Hedge: dark core box wrapped in leaf cards.
function hedge(m, r, len, h, d) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.BoxGeometry(len - 0.2, h - 0.15, d - 0.25), m.hedge);
  core.position.y = (h - 0.15) / 2;
  g.add(core);
  g.add(foliage(m, r, Math.round(len * h * 70), 0.42, (o) => {
    const face = r();
    const x = (r() - 0.5) * len, y = r() * h, z = (r() - 0.5) * d;
    if (face < 0.42) o.position.set(x, y, (r() < 0.5 ? -1 : 1) * d / 2 * (0.8 + r() * 0.3));
    else if (face < 0.9) o.position.set(x, h * (0.85 + r() * 0.2), z);
    else o.position.set((r() < 0.5 ? -1 : 1) * len / 2, y, z);
    o.position.y -= 0.2;
  }));
  return g;
}

// Instanced grass blades with a wind sway in the vertex shader.
function grassBlades(m, r, count, keep, time) {
  const geo = new THREE.BufferGeometry();
  const w = 0.03;
  geo.setAttribute('position', new THREE.Float32BufferAttribute(
    [-w, 0, 0, w, 0, 0, -w * 0.7, 0.4, 0, w * 0.7, 0.4, 0, -w * 0.35, 0.75, 0, w * 0.35, 0.75, 0, 0, 1, 0], 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(7).fill([0, 1, 0]).flat(), 3));
  geo.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5, 4, 5, 6]);
  m.blade.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
      float sway = sin(uTime * 1.6 + ip.x * 0.35 + ip.y * 0.25) * 0.6 + sin(uTime * 2.9 + ip.x * 1.7) * 0.25;
      transformed.x += sway * 0.16 * position.y * position.y;`);
  };
  const mesh = new THREE.InstancedMesh(geo, m.blade, count);
  const o = new THREE.Object3D();
  const c = new THREE.Color();
  let i = 0;
  while (i < count) {
    const a = r() * Math.PI * 2, d = 3 + Math.sqrt(r()) * 19;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (!keep(x, z)) continue;
    o.position.set(x, -0.02, z);
    o.rotation.set((r() - 0.5) * 0.35, r() * Math.PI * 2, 0);
    o.scale.set(1 + r(), 0.09 + r() * 0.13, 1);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    c.setHSL(0.24 + r() * 0.05, 0.45 + r() * 0.2, 0.22 + r() * 0.16);
    mesh.setColorAt(i, c);
    i++;
  }
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

function lounger(m) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.1, 1.3, 2, 0.04), m.cushion);
  seat.position.set(0, 0.34, 0.25);
  const back = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.1, 0.7, 2, 0.04), m.cushion);
  back.position.set(0, 0.55, -0.62);
  back.rotation.x = -0.65;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 1.9), m.frame);
  base.position.set(0, 0.26, 0);
  g.add(seat, back, base);
  for (const [x, z] of [[-0.27, -0.85], [0.27, -0.85], [-0.27, 0.85], [0.27, 0.85]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.04), m.frame);
    leg.position.set(x, 0.13, z);
    g.add(leg);
  }
  return g;
}

function parasol(m) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.4, 8), m.frame);
  pole.position.y = 1.2;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.08, 16), m.frame);
  foot.position.y = 0.04;
  const top = new THREE.Group();
  top.position.y = 2.35;
  const cloth = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.38, 8, 1, true), m.canopy);
  top.add(cloth);
  g.add(pole, foot, top);
  return { group: g, top };
}

function wingGeometry() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.07, 0.36, 0, -0.04, 0, 0, -0.1], 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * @param at (wall, u, out) => Vector3 – a point along a wall (u) and `out` metres outside it
 * @param yaw (wall) => rotation that aligns an object with that wall
 */
export function buildOutdoor({ at, yaw, local, small = false }) {
  const m = materials();
  const r = rng(42);
  const group = new THREE.Group();
  const sway = [];
  const time = { value: 0 };

  // Lawn
  const ground = new THREE.Mesh(new THREE.CircleGeometry(75, 64).rotateX(-Math.PI / 2), m.grass);
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  group.add(ground);

  const place = (obj, wall, u, out, y = 0) => {
    obj.position.copy(at(wall, u, out)).setY(y);
    obj.rotation.y = yaw(wall);
    group.add(obj);
    return obj;
  };

  // Terrace deck outside the doors, then a pool with stone coping
  place(shadows(new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.1, 2.8), m.deck)), 'right', 5.3, 1.52, -0.055);
  const pool = { u0: 2.2, u1: 8.2, o0: 3.5, o1: 6.3, rim: 0.3 };
  const pu = (pool.u0 + pool.u1) / 2, po = (pool.o0 + pool.o1) / 2;
  const pl = pool.u1 - pool.u0, pw = pool.o1 - pool.o0;
  for (const [u, o, w, d] of [
    [pu, pool.o0 - pool.rim / 2, pl + pool.rim * 2, pool.rim],
    [pu, pool.o1 + pool.rim / 2, pl + pool.rim * 2, pool.rim],
    [pool.u0 - pool.rim / 2, po, pool.rim, pw],
    [pool.u1 + pool.rim / 2, po, pool.rim, pw],
  ]) {
    place(shadows(new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), m.stone)), 'right', u, o, 0.015);
  }
  const water = place(new THREE.Mesh(new THREE.PlaneGeometry(pl, pw).rotateX(-Math.PI / 2), m.water), 'right', pu, po, 0.0);
  water.receiveShadow = false;

  // Loungers + parasol beyond the pool
  place(shadows(lounger(m)), 'right', 4.2, 7.4).rotation.y += 0.08;
  place(shadows(lounger(m)), 'right', 5.8, 7.4).rotation.y -= 0.06;
  const umbrella = parasol(m);
  place(shadows(umbrella.group), 'right', 5.0, 7.6);
  sway.push({ obj: umbrella.top, amp: 0.012, speed: 0.9, phase: 1.3 });

  // Flower bed between the loungers and the hedge
  const palette = ['#f2c14e', '#ffffff', '#e86a8a', '#b07ae0', '#ff9a5a'].map((c) => new THREE.Color(c));
  const bedMat = new THREE.MeshStandardMaterial({ color: '#3f6b2f', roughness: 1 });
  const flowerGeo = new THREE.IcosahedronGeometry(0.06, 0);
  const flowerMat = new THREE.MeshStandardMaterial({ roughness: 0.7 });
  const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, 160);
  const tmp = new THREE.Object3D();
  let fi = 0;
  for (const [u, len] of [[1.4, 2.6], [6.6, 3.2]]) {
    const bed = place(shadows(new THREE.Mesh(new RoundedBoxGeometry(len, 0.4, 0.9, 2, 0.18), bedMat)), 'right', u + len / 2, 9.2, 0.12);
    for (let i = 0; i < 80; i++) {
      tmp.position.set((r() - 0.5) * (len - 0.2), 0.28 + r() * 0.12, (r() - 0.5) * 0.7);
      tmp.scale.setScalar(0.7 + r() * 0.6);
      tmp.updateMatrix();
      flowers.setMatrixAt(fi, tmp.matrix.clone().premultiply(bed.matrix.compose(bed.position, bed.quaternion, bed.scale)));
      flowers.setColorAt(fi, palette[(r() * palette.length) | 0]);
      fi++;
    }
  }
  flowers.castShadow = true;
  group.add(flowers);

  // Hedges along the garden boundary
  place(shadows(hedge(m, r, 20, 1.4, 0.9)), 'left', 6, 13);
  place(shadows(hedge(m, r, 15, 1.3, 0.9)), 'right', 6.5, 10.6);

  // Grass blades on the lawn (not inside the house, on the terrace or in the pool)
  group.add(grassBlades(m, r, small ? 16000 : 60000, (x, z) => {
    if (Math.abs(x) < 11.6 && z > 1.125 * Math.abs(x) - 6.6) return false;
    const { u, out } = local('right', x, z);
    if (u > 0 && u < 10.6 && out > -0.5 && out < 3.0) return false;
    if (u > 1.8 && u < 8.6 && out > 3.1 && out < 6.7) return false;
    return true;
  }, time));

  // Trees: [wall, u, out, scale] or world [x, z, scale]. Near the windows wall they stand
  // between the windows or far out, so they don't block the sun streaming in.
  const trees = [
    ['left', 1, 6, 1.1], ['left', 12.6, 6, 1.0], ['left', 6.5, 18, 1.5], ['left', 3, 16.5, 1.4],
    ['left', -2, 10, 1.2], ['left', 10.5, 19, 1.6],
    ['right', 1, 12.5, 1.3], ['right', 11, 6, 1.2], ['right', 6, 14, 1.5], ['right', 13, 11, 1.1],
  ];
  for (const [wall, u, out, s] of trees) {
    const t = tree(m, r, s);
    place(shadows(t.group), wall, u, out).rotation.y = r() * Math.PI * 2;
    sway.push({ obj: t.crown, amp: 0.02 + r() * 0.015, speed: 0.6 + r() * 0.5, phase: r() * 6 });
  }
  for (const [wall, u, out, s] of [['left', 11.6, 3.6, 1.0], ['left', 14, 8, 1.2], ['right', 0.4, 4.4, 1.0], ['right', 9.8, 3.9, 0.9]]) {
    const t = cypress(m, r, s);
    place(shadows(t.group), wall, u, out);
    sway.push({ obj: t.crown, amp: 0.012, speed: 0.8 + r() * 0.4, phase: r() * 6 });
  }
  for (const [x, z, s] of [[0, -14, 1.7], [-3.5, -20, 1.5], [4, -19, 1.4], [-9, -17, 1.6], [10, -15, 1.5]]) {
    const t = tree(m, r, s);
    t.group.position.set(x, 0, z);
    group.add(shadows(t.group));
    sway.push({ obj: t.crown, amp: 0.02, speed: 0.5 + r() * 0.4, phase: r() * 6 });
  }

  // Birds: two small flocks circling in view of the windows and the doors
  const wing = wingGeometry();
  const birds = [];
  for (const [cx, cy, cz, n] of [[-12, 4.6, -24, 4], [8, 4.8, -27, 3]]) {
    for (let i = 0; i < n; i++) {
      const b = new THREE.Group();
      const wl = new THREE.Mesh(wing, m.bird);
      const wr = new THREE.Mesh(wing, m.bird);
      wr.scale.x = -1;
      b.add(wl, wr);
      group.add(b);
      birds.push({ b, wl, wr, cx: cx + (r() - 0.5) * 3, cy: cy + (r() - 0.5), cz: cz + (r() - 0.5) * 3, R: 4 + r() * 3, speed: 0.16 + r() * 0.08, phase: r() * 6 });
    }
  }

  function update(t, light) {
    time.value = t;
    m.water.uniforms.uTime.value = t;
    m.water.uniforms.uLight.value = light;
    for (const s of sway) {
      s.obj.rotation.z = Math.sin(t * s.speed + s.phase) * s.amp;
      s.obj.rotation.x = Math.sin(t * s.speed * 0.7 + s.phase * 1.7) * s.amp * 0.6;
    }
    for (const k of birds) {
      const a = t * k.speed + k.phase;
      k.b.position.set(k.cx + Math.cos(a) * k.R, k.cy + Math.sin(t * 0.6 + k.phase) * 0.5, k.cz + Math.sin(a) * k.R * 0.6);
      k.b.rotation.y = -a;
      const flap = Math.sin(t * 9 + k.phase * 3) * 0.55 * (0.4 + 0.6 * Math.max(0, Math.sin(t * 0.5 + k.phase)));
      k.wl.rotation.z = flap;
      k.wr.rotation.z = -flap;
    }
  }

  return { group, update };
}
