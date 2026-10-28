// Showroom world: a V-shaped room (windows wall + doors wall meeting at the apex, echoing
// the logo's V), daylight sky and garden, reflective floor with sun patches, home
// furnishings, products, lights and the intro-only elements (speed lines, wireframe, V mark).
import * as THREE from 'three';
import gsap from 'gsap';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { buildProduct } from './procedural.js';
import { buildFurniture, createFurnitureMaterials } from './furniture.js';
import { buildOutdoor } from './outdoor.js';
import { oakFloor, plaster, worldBox } from './textures.js';

const V3 = THREE.Vector3;
export const ROOM = { H: 4.8, T: 0.24 };
export const GOLD = new THREE.Color('#F2C14E');
export const SUN_ON = 5;
// Afternoon sun from behind the windows wall: it streams through the windows onto the floor.
const SUN_DIR = new THREE.Vector3(-14, 9, -12).normalize();

// Two walls from point a to point b (x, z). Local space: u runs a->b, y up, +z into the room.
// Left = windows (u measured from the front), right = doors (u measured from the apex).
const APEX = [0, -6];
const WALLS = {
  left: { a: [-8, 3], b: APEX, extendA: 4, extendB: 0.16 },
  right: { a: APEX, b: [8, 3], extendA: 0.16, extendB: 4 },
};
for (const w of Object.values(WALLS)) {
  const dx = w.b[0] - w.a[0], dz = w.b[1] - w.a[1];
  w.length = Math.hypot(dx, dz);
  w.rotY = Math.atan2(-dz / w.length, dx / w.length);
  w.uMin = -w.extendA;
  w.uMax = w.length + w.extendB;
}

// Generic, fictional exhibits (no manufacturer data). Names are product types only.
export const PRODUCTS = [
  // Windows wall (left)
  { id: 'tilt', type: 'tilt', wall: 'left', u: 3.9, w: 1.9, h: 2.1, b: 0.85, tag: 'Langai', name: 'Varstomas-verčiamas langas' },
  { id: 'slide', type: 'slide', wall: 'left', u: 6.9, w: 3.3, h: 2.4, b: 0.7, tag: 'Langai', name: 'Stumdoma langų sistema' },
  { id: 'fixed', type: 'fixed', wall: 'left', u: 9.95, w: 1.9, h: 2.1, b: 0.85, tag: 'Langai', name: 'Langas su varstomu viršlangiu' },
  // Doors wall (right)
  { id: 'french', type: 'french', wall: 'right', u: 2.1, w: 1.7, h: 2.4, b: 0, tag: 'Durys', name: 'Dvivėrės stiklinės durys' },
  { id: 'patio', type: 'patio', wall: 'right', u: 5.0, w: 2.6, h: 2.4, b: 0, tag: 'Durys', name: 'Terasos stumdomos durys' },
  { id: 'entry', type: 'door', wall: 'right', u: 8.1, w: 1.15, h: 2.35, b: 0, tag: 'Durys', name: 'Lauko durys' },
];

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// Procedural daylight sky: blue gradient, sun, drifting clouds and hazy hills.
const SKY_FRAG = /* glsl */ `
uniform float uIntensity;
uniform float uTime;
uniform vec3 uSunDir;
varying vec3 vDir;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  float az = atan(d.x, -d.z);
  vec3 zenith = vec3(0.09, 0.25, 0.6);
  vec3 horizon = vec3(0.58, 0.72, 0.86);
  vec3 col = mix(horizon, zenith, pow(smoothstep(0.0, 0.6, h), 0.7));
  float s = max(dot(d, uSunDir), 0.0);
  col += vec3(1.0, 0.9, 0.7) * pow(s, 8.0) * 0.22;
  col += vec3(1.0, 0.95, 0.85) * pow(s, 220.0) * 0.8;
  col += vec3(1.0) * smoothstep(0.9993, 0.9997, s) * 6.0;
  if (h > 0.0) {
    vec2 uv = d.xz / (h + 0.08) * 1.1 + vec2(uTime * 0.012, uTime * 0.004);
    float c = smoothstep(0.52, 0.8, fbm(uv)) * smoothstep(0.0, 0.12, h);
    vec3 cloud = mix(vec3(0.74, 0.79, 0.86), vec3(0.98, 0.97, 0.94), clamp(s * 1.2 + 0.3, 0.0, 1.0));
    col = mix(col, cloud, c * 0.85);
  }
  float far = 0.03 + 0.022 * sin(az * 3.1 + 0.6) + 0.012 * sin(az * 9.7 + 2.1) + 0.005 * sin(az * 23.0 + 1.0);
  float near = 0.014 + 0.01 * sin(az * 5.3 + 2.0) + 0.005 * sin(az * 13.1 + 0.4);
  col = mix(col, mix(horizon, vec3(0.33, 0.45, 0.5), 0.55), 1.0 - smoothstep(far - 0.002, far + 0.002, h));
  col = mix(col, vec3(0.16, 0.26, 0.15), 1.0 - smoothstep(near - 0.002, near + 0.002, h));
  if (h < 0.0) col = vec3(0.15, 0.24, 0.12);
  gl_FragColor = vec4(col * uIntensity, 1.0);
}`;

const FLOOR_VERT = /* glsl */ `
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// Darkens the mirror floor and draws the gold grid that radiates from the centre of the room.
// uDark fades the darkening out once daylight takes over; uOut fades the grid outside the room.
const FLOOR_FRAG = /* glsl */ `
uniform float uReveal;
uniform float uGrid;
uniform float uRing;
uniform float uDark;
uniform float uOut;
uniform vec3 uGold;
varying vec3 vW;
float gridLine(vec2 p, float scale) {
  vec2 q = p * scale;
  vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
  return 1.0 - min(min(g.x, g.y), 1.0);
}
void main() {
  vec2 p = vW.xz;
  float d = length(p);
  float revealed = 1.0 - smoothstep(uReveal - 1.5, uReveal, d);
  float ring = smoothstep(uReveal - 1.0, uReveal - 0.08, d) * (1.0 - smoothstep(uReveal - 0.08, uReveal, d));
  float fade = 1.0 - smoothstep(5.0, 17.0, d);
  float inside = step(0.0, p.y + 6.0 - 1.125 * abs(p.x));
  float g = (gridLine(p, 1.0) * 0.45 + gridLine(p, 0.25) * 0.9) * revealed * fade * uGrid * mix(uOut, 1.0, inside);
  float r = ring * fade * uRing * 1.6;
  vec3 glow = uGold * (g + r) * 2.0;
  float dark = mix(0.74, 0.96, smoothstep(2.5, 13.0, d)) * uDark;
  gl_FragColor = vec4(vec3(0.012, 0.013, 0.016) * dark + glow, dark);
}`;

function createSky(intensity = 0) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uIntensity: { value: intensity }, uTime: { value: 0 }, uSunDir: { value: SUN_DIR } },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(80, 48, 24), mat);
}

function createEnvironment(renderer) {
  // Self-made environment: the same daylight sky the visitor sees, plus one soft overhead
  // panel for a gentle highlight on the frames. No third-party HDRI.
  const envScene = new THREE.Scene();
  envScene.add(createSky(1));
  const soft = new THREE.Mesh(new THREE.PlaneGeometry(30, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.65), side: THREE.DoubleSide }));
  soft.position.set(0, 30, 4);
  soft.rotation.x = Math.PI / 2;
  envScene.add(soft);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(envScene, 0.035).texture;
  pmrem.dispose();
  return tex;
}

function buildVMark(mats) {
  // 3D version of the nav SVG mark (same path data, y flipped).
  const s = 0.0087;
  const toShape = (pts) => {
    const shape = new THREE.Shape();
    pts.forEach(([x, y], i) => (i ? shape.lineTo((x - 50) * s, (86 - y) * s) : shape.moveTo((x - 50) * s, (86 - y) * s)));
    shape.closePath();
    return shape;
  };
  const opts = { depth: 0.05, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2 };
  const gold = new THREE.Mesh(new THREE.ExtrudeGeometry(toShape([[2, 4], [30, 4], [60, 74], [52, 86]]), opts), mats.gold);
  const chrome = new THREE.Mesh(new THREE.ExtrudeGeometry(toShape([[80, 4], [98, 4], [64, 80], [58, 70]]), opts), mats.chrome);
  const group = new THREE.Group();
  group.add(gold, chrome);
  return { group };
}

// A point `u` metres along a wall and `out` metres outside it (world space, y = 0).
function wallPoint(key, u, out = 0) {
  const w = WALLS[key];
  const dx = (w.b[0] - w.a[0]) / w.length, dz = (w.b[1] - w.a[1]) / w.length;
  return new V3(w.a[0] + dx * u + dz * out, 0, w.a[1] + dz * u - dx * out);
}

// Wall-local coordinates of a world point: u along the wall, out = metres outside it.
function wallLocal(key, x, z) {
  const w = WALLS[key];
  const dx = (w.b[0] - w.a[0]) / w.length, dz = (w.b[1] - w.a[1]) / w.length;
  const px = x - w.a[0], pz = z - w.a[1];
  return { u: px * dx + pz * dz, out: px * dz - pz * dx };
}

export const HAZE = new THREE.Color('#aec3d8');

export function buildWorld(renderer, { reflectScale = 0.5, shadowSize = 2048, small = false } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#07080A');
  scene.environment = createEnvironment(renderer);
  scene.environmentIntensity = 0;
  scene.fog = new THREE.Fog(0x000000, 38, 170); // black during the intro, haze in daylight

  const mats = {
    frame: new THREE.MeshStandardMaterial({ color: '#2a2f36', metalness: 0.85, roughness: 0.32 }),
    sash: new THREE.MeshStandardMaterial({ color: '#363c44', metalness: 0.85, roughness: 0.28 }),
    gold: new THREE.MeshStandardMaterial({ color: '#D49A24', metalness: 1, roughness: 0.22 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#C9CED4', metalness: 1, roughness: 0.12 }),
    panel: new THREE.MeshStandardMaterial({ color: '#1d2127', metalness: 0.6, roughness: 0.38 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: '#e6eef6', metalness: 0, roughness: 0.02, transparent: true, opacity: 0,
      depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 0.7,
    }),
    glassDark: new THREE.MeshPhysicalMaterial({ color: '#0b0f14', metalness: 0.3, roughness: 0.05, clearcoat: 1, envMapIntensity: 2 }),
    wall: new THREE.MeshStandardMaterial({ color: '#2c2d31', roughness: 0.88, bumpMap: plaster(5), bumpScale: 1.2, transparent: true, opacity: 0 }),
    ceiling: new THREE.MeshStandardMaterial({ color: '#1d1e22', roughness: 0.95, bumpMap: plaster(8), bumpScale: 0.8, transparent: true, opacity: 0 }),
    hit: new THREE.MeshBasicMaterial({ visible: false }),
    wire: new THREE.LineBasicMaterial({ color: GOLD.clone().multiplyScalar(2.2), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }),
  };

  // Sky
  const sky = createSky(0);
  scene.add(sky);

  // Room floor (the V plus the open front): a mirror under a lit stone layer that catches
  // the sun patches, then the darkening/grid overlay. The lawn takes over outside the walls.
  const floorShape = new THREE.Shape([
    new THREE.Vector2(-11.3, -6.4), new THREE.Vector2(0, 6.35), new THREE.Vector2(11.3, -6.4),
    new THREE.Vector2(11.3, -24), new THREE.Vector2(-11.3, -24),
  ]);
  const floor = new Reflector(new THREE.ShapeGeometry(floorShape), {
    clipBias: 0.003,
    textureWidth: Math.round(innerWidth * Math.min(devicePixelRatio, 2) * reflectScale),
    textureHeight: Math.round(innerHeight * Math.min(devicePixelRatio, 2) * reflectScale),
    color: 0x8a9099,
  });
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const stone = new THREE.Mesh(
    new THREE.ShapeGeometry(floorShape),
    new THREE.MeshStandardMaterial({ ...oakFloor(), color: '#cdb89e', roughness: 0.62, envMapIntensity: 0.45, transparent: true, opacity: 0.93, depthWrite: false }),
  );
  stone.rotation.x = -Math.PI / 2;
  stone.position.y = 0.0015;
  stone.receiveShadow = true;
  stone.renderOrder = -2;
  scene.add(stone);
  const floorUniforms = {
    uReveal: { value: 0 }, uGrid: { value: 1 }, uRing: { value: 1 }, uGold: { value: GOLD.clone() },
    uDark: { value: 1 }, uOut: { value: 1 },
  };
  const overlay = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShaderMaterial({
      uniforms: floorUniforms, vertexShader: FLOOR_VERT, fragmentShader: FLOOR_FRAG,
      transparent: true, premultipliedAlpha: true, depthWrite: false,
    }),
  );
  overlay.rotation.x = -Math.PI / 2;
  overlay.position.y = 0.003;
  overlay.renderOrder = -1;
  scene.add(overlay);

  // Walls (box pieces around the openings)
  const wallMeshes = [];
  const wallGroups = {};
  for (const [key, def] of Object.entries(WALLS)) {
    const g = new THREE.Group();
    g.position.set(def.a[0], 0, def.a[1]);
    g.rotation.y = def.rotY;
    scene.add(g);
    wallGroups[key] = g;
    const openings = PRODUCTS.filter((p) => p.wall === key).sort((a, b) => a.u - b.u);
    const pieces = [];
    let cur = def.uMin;
    for (const o of openings) {
      const a = o.u - o.w / 2, b = o.u + o.w / 2;
      if (a > cur) pieces.push([cur, a, 0, ROOM.H]);
      if (o.b > 0) pieces.push([a, b, 0, o.b]);
      pieces.push([a, b, o.b + o.h, ROOM.H]);
      cur = b;
    }
    if (cur < def.uMax) pieces.push([cur, def.uMax, 0, ROOM.H]);
    for (const [u0, u1, y0, y1] of pieces) {
      const m = new THREE.Mesh(worldBox(u1 - u0, y1 - y0, ROOM.T), mats.wall);
      m.position.set((u0 + u1) / 2, (y0 + y1) / 2, 0);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
      wallMeshes.push(m);
    }
  }

  // Triangular ceiling + cove light strips following both walls
  const ceilShape = new THREE.Shape([new THREE.Vector2(-11, 6.2), new THREE.Vector2(11, 6.2), new THREE.Vector2(0, APEX[1] - 0.3)]);
  const ceiling = new THREE.Mesh(new THREE.ShapeGeometry(ceilShape).rotateX(Math.PI / 2), mats.ceiling);
  ceiling.material.side = THREE.DoubleSide;
  ceiling.position.y = ROOM.H;
  ceiling.castShadow = true;
  scene.add(ceiling);
  const strips = [];
  const stripMat = () => new THREE.MeshBasicMaterial({ color: 0x000000 });
  for (const [key, def] of Object.entries(WALLS)) {
    for (const o of [0.55, 2.1]) {
      // stop each strip where it meets its mirror strip near the apex
      const trim = 1.125 * o + 0.25;
      const u0 = key === 'left' ? -1.5 : trim;
      const u1 = key === 'left' ? def.length - trim : def.length + 1.5;
      const m = new THREE.Mesh(new THREE.BoxGeometry(u1 - u0, 0.02, 0.06), stripMat());
      m.position.set((u0 + u1) / 2, ROOM.H - 0.02, ROOM.T / 2 + o);
      wallGroups[key].add(m);
      strips.push(m);
    }
  }
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 9.2), stripMat());
  spine.position.set(0, ROOM.H - 0.02, 0.2);
  scene.add(spine);
  strips.push(spine);

  // Products
  const products = PRODUCTS.map((spec) => {
    const p = buildProduct(spec, mats);
    p.spec = spec;
    p.root.position.set(spec.u, spec.b, 0);
    wallGroups[spec.wall].add(p.root);
    p.root.traverse((o) => {
      if (o.isMesh && o.material !== mats.glass && o.material !== mats.hit) o.castShadow = o.receiveShadow = true;
    });
    return p;
  });

  // 3D V mark floating in the apex, in front of a vertical gold light seam
  const vMark = buildVMark(mats);
  vMark.group.position.set(0, 3.3, -4.95);
  scene.add(vMark.group);
  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.035, ROOM.H, 0.02), new THREE.MeshBasicMaterial({ color: GOLD.clone().multiplyScalar(2.2) }));
  seam.position.set(0, ROOM.H / 2, -5.79);
  scene.add(seam);
  vMark.seam = seam;

  // Home furnishings
  const furniture = buildFurniture(createFurnitureMaterials(), mats.gold, {
    leftWall: wallGroups.left, sideboardU: 6.9, wallFace: ROOM.T / 2, ceilingY: ROOM.H,
  });
  scene.add(furniture.group);
  furniture.meshes.forEach((o) => { if (o.material.type !== 'MeshBasicMaterial') o.castShadow = o.receiveShadow = true; });

  // Garden outside
  const outdoor = buildOutdoor({ at: wallPoint, yaw: (key) => WALLS[key].rotY, local: wallLocal, small });
  scene.add(outdoor.group);

  // Dust motes drifting in the sunlight
  const DUST = 180;
  const dustBase = [];
  while (dustBase.length < DUST) {
    const x = -5.5 + Math.random() * 8, z = -4 + Math.random() * 7.5;
    if (z + 6 - 1.125 * Math.abs(x) > 0.5) dustBase.push([x, 0.25 + Math.random() * 3.2, z, Math.random() * 6.3]);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(DUST * 3), 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: new THREE.Color(1.5, 1.35, 1.1), size: 0.016, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  dust.frustumCulled = false;
  scene.add(dust);

  // Speed lines (from the logo) + the floor line at the centre of the room
  const speedLines = [];
  for (let i = 0; i < 18; i++) {
    const c = i % 3 === 0 ? new THREE.Color('#C9CED4').multiplyScalar(2.4) : GOLD.clone().multiplyScalar(3);
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.012, 0.012),
      new THREE.MeshBasicMaterial({ color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    m.position.set(-30, 0.02 + Math.random() * 0.04, (Math.random() - 0.5) * 2.6);
    m.userData.endX = (Math.random() - 0.5) * 0.8;
    scene.add(m);
    speedLines.push(m);
  }
  const floorLine = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.01, 0.01),
    new THREE.MeshBasicMaterial({ color: GOLD.clone().multiplyScalar(3.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  floorLine.position.set(0, 0.012, 0.15);
  floorLine.scale.x = 0.0001;
  scene.add(floorLine);

  scene.updateMatrixWorld(true);

  // Wireframe: edges of walls, furniture and product outlines, sorted outward from the centre
  const segs = [];
  const a = new V3(), b = new V3();
  const pushEdges = (mesh, threshold) => {
    const eg = new THREE.EdgesGeometry(mesh.geometry, threshold);
    const pos = eg.attributes.position;
    for (let i = 0; i < pos.count; i += 2) {
      a.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      b.fromBufferAttribute(pos, i + 1).applyMatrix4(mesh.matrixWorld);
      segs.push([a.x, a.y, a.z, b.x, b.y, b.z]);
    }
    eg.dispose();
  };
  wallMeshes.forEach((m) => pushEdges(m, 20));
  furniture.meshes.forEach((m) => pushEdges(m, 28));
  for (const p of products) {
    for (const [x0, y0, x1, y1] of p.outline) {
      a.set(x0, y0, p.frontZ).applyMatrix4(p.body.matrixWorld);
      b.set(x1, y1, p.frontZ).applyMatrix4(p.body.matrixWorld);
      segs.push([a.x, a.y, a.z, b.x, b.y, b.z]);
    }
  }
  const origin = new V3(0, 1, 0);
  const mid = (s) => Math.hypot((s[0] + s[3]) / 2 - origin.x, (s[1] + s[4]) / 2 - origin.y, (s[2] + s[5]) / 2 - origin.z);
  segs.sort((s1, s2) => mid(s1) - mid(s2));
  const wireGeo = new THREE.BufferGeometry();
  wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(segs.flat(), 3));
  wireGeo.setDrawRange(0, 0);
  const wire = new THREE.LineSegments(wireGeo, mats.wire);
  wire.frustumCulled = false;
  scene.add(wire);

  // Lights
  const hemi = new THREE.HemisphereLight('#d6e4ff', '#4a3f33', 0);
  const fill = new THREE.DirectionalLight('#cfd6e0', 0);
  fill.position.set(0, 6, 9);
  const sun = new THREE.DirectionalLight('#fff0d8', 0);
  sun.target.position.set(0, 0, -1);
  sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 70 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  const key = new THREE.SpotLight('#ffffff', 0, 0, 0.42, 0.85, 2);
  key.position.set(0, 4.6, 2.6);
  key.target.position.set(0, 0.9, 0);
  const sweep = new THREE.PointLight('#fff1d6', 0, 7, 2);
  sweep.position.set(-5.2, 2.1, 1.5);
  scene.add(hemi, fill, sun, sun.target, key, key.target, sweep);

  const up = new V3(0, 1, 0);
  for (const p of products) {
    const { w, h } = p.spec;
    p.center = p.root.localToWorld(new V3(0, h / 2, 0));
    p.normal = new V3(0, 0, 1).applyQuaternion(p.root.getWorldQuaternion(new THREE.Quaternion()));
    p.anchor = p.root.localToWorld(new V3(0, h + 0.28, 0.2));
    p.viewTgt = p.center.clone();
    p.viewPos = p.center.clone().addScaledVector(p.normal, Math.max(w, h) * 1.05 + 1.5).addScaledVector(up, 0.45);
    const spot = new THREE.SpotLight('#fff4e0', 0, 0, 0.5, 0.9, 2);
    spot.position.copy(p.center).addScaledVector(p.normal, 3.2).addScaledVector(up, 2.2);
    spot.target.position.copy(p.center);
    scene.add(spot, spot.target);
    p.spot = spot;
    p.spotBase = 12;
    p.spotHover = 70;
    p.hit.userData.product = p;

    p.open = () => p.sashes.forEach((s) =>
      gsap.to(s.obj, { [s.key]: s.open, duration: 1.2, delay: 0.75, ease: 'power3.inOut', overwrite: 'auto' }));
    p.close = () => p.sashes.forEach((s) =>
      gsap.to(s.obj, { [s.key]: s.closed, duration: 0.9, ease: 'power3.inOut', overwrite: 'auto' }));
  }

  function highlight(target) {
    for (const p of products) {
      gsap.to(p.spot, { intensity: p === target ? p.spotHover : p.spotBase, duration: 0.6, overwrite: 'auto' });
    }
  }

  // After the intro, switch faded materials back to opaque for correct depth sorting.
  function settle() {
    for (const m of [mats.wall, mats.ceiling]) {
      m.opacity = 1;
      m.transparent = false;
      m.needsUpdate = true;
    }
    wire.visible = false;
    speedLines.forEach((l) => (l.visible = false));
    floorLine.visible = false;
  }

  // Per-frame life: clouds, wind, water, birds, dust
  const dustPos = dustGeo.attributes.position;
  function update(t) {
    sky.material.uniforms.uTime.value = t;
    outdoor.update(t, sun.intensity / SUN_ON);
    if (dust.material.opacity > 0) {
      dustBase.forEach(([x, y, z, ph], i) => dustPos.setXYZ(i,
        x + Math.sin(t * 0.11 + ph * 2) * 0.25,
        y + Math.sin(t * 0.15 + ph) * 0.3,
        z + Math.cos(t * 0.09 + ph * 3) * 0.25));
      dustPos.needsUpdate = true;
    }
  }

  return {
    scene, mats, sky, floorUniforms, wallMeshes, ceiling, strips,
    products, vMark, furniture, outdoor, dust, speedLines, floorLine, wire,
    lights: { hemi, fill, sun, key, sweep },
    highlight, settle, update,
  };
}
