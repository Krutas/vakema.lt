// Showroom world: room, sunset sky, reflective floor, figure, products, lights and
// the intro-only elements (speed lines, wireframe, 3D V mark).
import * as THREE from 'three';
import gsap from 'gsap';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { buildProduct } from './procedural.js';

const V3 = THREE.Vector3;
export const ROOM = { H: 4.8, T: 0.24 };
export const GOLD = new THREE.Color('#F2C14E');

// Walls in their own local space: u runs along the wall, y up, +z into the room.
const WALLS = {
  back: { pos: [0, 0, -5], rotY: 0, uMin: -7.12, uMax: 7.12 },
  left: { pos: [-7, 0, 0], rotY: Math.PI / 2, uMin: -4, uMax: 5 },
  right: { pos: [7, 0, 0], rotY: -Math.PI / 2, uMin: -5, uMax: 4 },
};

// Generic, fictional exhibits (no manufacturer data). Names are product types only.
export const PRODUCTS = [
  { id: 'tilt', type: 'tilt', wall: 'back', u: -3.75, w: 1.9, h: 2.1, b: 0.85, tag: 'Langai', name: 'Varstomas-verčiamas langas' },
  { id: 'slide', type: 'slide', wall: 'back', u: 0, w: 3.3, h: 2.4, b: 0.7, tag: 'Langai', name: 'Stumdoma langų sistema' },
  { id: 'fixed', type: 'fixed', wall: 'back', u: 3.75, w: 1.9, h: 2.1, b: 0.85, tag: 'Langai', name: 'Langas su varstomu viršlangiu' },
  { id: 'entry', type: 'door', wall: 'left', u: 1.2, w: 1.15, h: 2.35, b: 0, tag: 'Durys', name: 'Lauko durys' },
  { id: 'patio', type: 'patio', wall: 'right', u: -1.2, w: 2.6, h: 2.4, b: 0, tag: 'Durys', name: 'Terasos stumdomos durys' },
];

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// Procedural sunset – a nod to the window in the Vakema logo.
const SKY_FRAG = /* glsl */ `
uniform float uIntensity;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  float az = atan(d.x, -d.z);
  vec3 sunDir = normalize(vec3(0.18, 0.07, -1.0));
  vec3 top = vec3(0.02, 0.03, 0.075);
  vec3 mid = vec3(0.13, 0.13, 0.27);
  vec3 warm = vec3(1.0, 0.48, 0.14);
  vec3 hor = vec3(1.0, 0.74, 0.38);
  vec3 col = mix(hor, warm, smoothstep(0.0, 0.07, h));
  col = mix(col, mid, smoothstep(0.05, 0.32, h));
  col = mix(col, top, smoothstep(0.3, 0.9, h));
  // warmer toward the sun's side
  col *= mix(0.55, 1.0, smoothstep(-2.2, 0.0, -abs(az - 0.18)));
  float s = max(dot(d, sunDir), 0.0);
  col += vec3(1.0, 0.62, 0.28) * pow(s, 18.0) * 0.45;
  col += vec3(1.0, 0.82, 0.55) * pow(s, 380.0) * 1.1;
  col += vec3(1.0, 0.95, 0.85) * smoothstep(0.99925, 0.9996, s) * 4.5;
  float hill = 0.035 + 0.03 * sin(az * 3.1 + 0.6) + 0.015 * sin(az * 9.7 + 2.1) + 0.006 * sin(az * 23.0 + 1.0);
  float mask = 1.0 - smoothstep(hill - 0.002, hill + 0.002, h);
  vec3 hillCol = mix(vec3(0.025, 0.02, 0.025), vec3(0.14, 0.075, 0.05), smoothstep(hill - 0.05, hill, h));
  col = mix(col, hillCol, mask);
  if (h < -0.02) col = vec3(0.018, 0.016, 0.018);
  gl_FragColor = vec4(col * uIntensity, 1.0);
}`;

const FLOOR_VERT = /* glsl */ `
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// Darkens the mirror floor and draws the gold grid that radiates from the figure.
const FLOOR_FRAG = /* glsl */ `
uniform float uReveal;
uniform float uGrid;
uniform float uRing;
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
  float g = (gridLine(p, 1.0) * 0.45 + gridLine(p, 0.25) * 0.9) * revealed * fade * uGrid;
  float r = ring * fade * uRing * 1.6;
  vec3 glow = uGold * (g + r) * 2.0;
  float dark = mix(0.74, 0.96, smoothstep(2.5, 13.0, d));
  gl_FragColor = vec4(vec3(0.012, 0.013, 0.016) * dark + glow, dark);
}`;

function createSky(intensity = 0) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uIntensity: { value: intensity } },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(80, 48, 24), mat);
}

function createEnvironment(renderer) {
  // Self-made studio environment: sunset sky + soft boxes. No third-party HDRI.
  const envScene = new THREE.Scene();
  envScene.add(createSky(1));
  const soft = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.6, 2.7), side: THREE.DoubleSide });
  const panel = (w, h, x, y, z, rx, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), soft);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    envScene.add(m);
  };
  panel(40, 5, 0, 30, -6, Math.PI / 2, 0);
  panel(40, 5, 0, 30, 10, Math.PI / 2, 0);
  panel(18, 3, -36, 10, 0, 0, Math.PI / 2);
  panel(18, 3, 36, 10, 0, 0, -Math.PI / 2);
  panel(30, 6, 0, 8, 40, 0, Math.PI);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(envScene, 0.035).texture;
  pmrem.dispose();
  return tex;
}

function buildFigure(mat) {
  // Minimal, faceless, low-poly silhouette.
  const g = new THREE.Group();
  const meshes = [];
  const cap = (r, len, x, y, rz = 0, sz = 1) => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 2, 7), mat);
    m.position.set(x, y, 0);
    m.rotation.z = rz;
    m.scale.z = sz;
    g.add(m);
    meshes.push(m);
  };
  cap(0.075, 0.72, -0.1, 0.47);
  cap(0.075, 0.72, 0.1, 0.47);
  cap(0.17, 0.42, 0, 1.18, 0, 0.7);
  cap(0.05, 0.52, -0.27, 1.12, 0.08);
  cap(0.05, 0.52, 0.27, 1.12, -0.08);
  cap(0.045, 0.06, 0, 1.53);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.115, 1), mat);
  head.position.set(0, 1.67, 0);
  head.scale.set(1, 1.12, 1);
  g.add(head);
  meshes.push(head);
  return { group: g, meshes };
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
  const ruleMat = new THREE.MeshBasicMaterial({ color: GOLD.clone().multiplyScalar(2.2) });
  const rules = [-1, 1].map((side) => {
    const r = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.012, 0.01), ruleMat);
    r.position.set(side * 1.55, 0.18, 0.02);
    group.add(r);
    return r;
  });
  return { group, rules };
}

export function buildWorld(renderer, { reflectScale = 0.5 } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#07080A');
  scene.environment = createEnvironment(renderer);
  scene.environmentIntensity = 0;

  const mats = {
    frame: new THREE.MeshStandardMaterial({ color: '#2a2f36', metalness: 0.85, roughness: 0.32 }),
    sash: new THREE.MeshStandardMaterial({ color: '#363c44', metalness: 0.85, roughness: 0.28 }),
    gold: new THREE.MeshStandardMaterial({ color: '#D49A24', metalness: 1, roughness: 0.22 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#C9CED4', metalness: 1, roughness: 0.12 }),
    panel: new THREE.MeshStandardMaterial({ color: '#1d2127', metalness: 0.6, roughness: 0.38 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: '#e6eef6', metalness: 0, roughness: 0.02, transparent: true, opacity: 0,
      depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.3,
    }),
    glassDark: new THREE.MeshPhysicalMaterial({ color: '#0b0f14', metalness: 0.3, roughness: 0.05, clearcoat: 1, envMapIntensity: 2 }),
    wall: new THREE.MeshStandardMaterial({ color: '#17191e', roughness: 0.9, metalness: 0, transparent: true, opacity: 0 }),
    ceiling: new THREE.MeshStandardMaterial({ color: '#0b0c0f', roughness: 0.95, transparent: true, opacity: 0 }),
    figure: new THREE.MeshStandardMaterial({ color: '#1c2026', metalness: 0.8, roughness: 0.28, flatShading: true, transparent: true, opacity: 0 }),
    hit: new THREE.MeshBasicMaterial({ visible: false }),
    wire: new THREE.LineBasicMaterial({ color: GOLD.clone().multiplyScalar(2.2), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }),
  };

  // Sky
  const sky = createSky(0);
  scene.add(sky);

  // Mirror floor + darkening/grid overlay
  const floor = new Reflector(new THREE.PlaneGeometry(40, 40), {
    clipBias: 0.003,
    textureWidth: Math.round(innerWidth * Math.min(devicePixelRatio, 2) * reflectScale),
    textureHeight: Math.round(innerHeight * Math.min(devicePixelRatio, 2) * reflectScale),
    color: 0x8a9099,
  });
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const floorUniforms = {
    uReveal: { value: 0 }, uGrid: { value: 1 }, uRing: { value: 1 }, uGold: { value: GOLD.clone() },
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
  scene.add(overlay);

  // Walls (box pieces around the openings)
  const wallMeshes = [];
  const wallGroups = {};
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  for (const [key, def] of Object.entries(WALLS)) {
    const g = new THREE.Group();
    g.position.set(...def.pos);
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
      const m = new THREE.Mesh(BOX, mats.wall);
      m.scale.set(u1 - u0, y1 - y0, ROOM.T);
      m.position.set((u0 + u1) / 2, (y0 + y1) / 2, 0);
      g.add(m);
      wallMeshes.push(m);
    }
  }

  // Ceiling + light strips
  const ceiling = new THREE.Mesh(BOX, mats.ceiling);
  ceiling.scale.set(14.4, 0.1, 9.4);
  ceiling.position.set(0, ROOM.H + 0.05, -0.5);
  scene.add(ceiling);
  const strips = [-3.7, -1.3, 1.1, 3.4].map((z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.02, 0.06), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    m.position.set(0, ROOM.H - 0.02, z);
    scene.add(m);
    return m;
  });

  // Figure + contact shadow
  const figure = buildFigure(mats.figure);
  scene.add(figure.group);
  const shadowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,0.85)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const figureShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 1.4),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0, depthWrite: false }),
  );
  figureShadow.rotation.x = -Math.PI / 2;
  figureShadow.position.y = 0.006;
  scene.add(figureShadow);

  // Products
  const products = PRODUCTS.map((spec) => {
    const p = buildProduct(spec, mats);
    p.spec = spec;
    p.root.position.set(spec.u, spec.b, 0);
    wallGroups[spec.wall].add(p.root);
    return p;
  });

  // 3D V mark on the back wall
  const vMark = buildVMark(mats);
  vMark.group.position.set(0, 3.58, -5 + ROOM.T / 2 + 0.005);
  scene.add(vMark.group);

  // Speed lines (from the logo) + the floor line at the figure's feet
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

  // Wireframe: edges of walls, figure and product outlines, sorted outward from the figure
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
  figure.meshes.forEach((m) => pushEdges(m, 25));
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
  const hemi = new THREE.HemisphereLight('#3a4150', '#050506', 0);
  const fill = new THREE.DirectionalLight('#cfd6e0', 0);
  fill.position.set(0, 6, 9);
  const sun = new THREE.DirectionalLight('#ffb36b', 0);
  sun.position.set(3, 4, -20);
  const key = new THREE.SpotLight('#ffffff', 0, 0, 0.42, 0.85, 2);
  key.position.set(0, 4.6, 2.6);
  key.target.position.set(0, 0.9, 0);
  const sweep = new THREE.PointLight('#fff1d6', 0, 7, 2);
  sweep.position.set(-8, 2.1, -3.7);
  scene.add(hemi, fill, sun, key, key.target, sweep);

  const up = new V3(0, 1, 0);
  for (const p of products) {
    const { w, h } = p.spec;
    p.center = p.root.localToWorld(new V3(0, h / 2, 0));
    p.normal = new V3(0, 0, 1).applyQuaternion(p.root.getWorldQuaternion(new THREE.Quaternion()));
    p.anchor = p.root.localToWorld(new V3(0, h + 0.28, 0.2));
    p.viewTgt = p.center.clone();
    p.viewPos = p.center.clone().addScaledVector(p.normal, Math.max(w, h) * 1.05 + 1.5).addScaledVector(up, 0.15);
    const spot = new THREE.SpotLight('#fff4e0', 0, 0, 0.5, 0.9, 2);
    spot.position.copy(p.center).addScaledVector(p.normal, 3.2).addScaledVector(up, 2.2);
    spot.target.position.copy(p.center);
    scene.add(spot, spot.target);
    p.spot = spot;
    p.spotBase = 26;
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
    for (const m of [mats.wall, mats.ceiling, mats.figure]) {
      m.opacity = 1;
      m.transparent = false;
      m.needsUpdate = true;
    }
    wire.visible = false;
    speedLines.forEach((l) => (l.visible = false));
    floorLine.visible = false;
  }

  return {
    scene, mats, sky, floorUniforms, wallMeshes, ceiling, strips, figure, figureShadow,
    products, vMark, speedLines, floorLine, wire,
    lights: { hemi, fill, sun, key, sweep },
    highlight, settle,
  };
}
