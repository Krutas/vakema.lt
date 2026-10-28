import * as THREE from 'three';
import gsap from 'gsap';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildWorld } from './scene.js';
import { createIntro } from './intro.js';

const $ = (s) => document.querySelector(s);
const body = document.body;
const canvas = $('#scene');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const INTRO_KEY = 'vakema:intro-seen';
const DEG = Math.PI / 180;
const MAX_YAW = 18 * DEG;
const MAX_PITCH = 8 * DEG;

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

// If the safety net in index.html already switched to the 2D page (slow or blocked
// network), leave it alone instead of starting the 3D scene on top of it.
const safetyNetFired = body.classList.contains('no-webgl');
window.__vakemaStarted = true;

let renderer = null;
if (!safetyNetFired) {
  initChrome();
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  } catch (err) {
    console.warn('WebGL unavailable, using 2D fallback.', err);
  }
  if (renderer) start().catch((err) => { console.error(err); enterFallback(); });
  else enterFallback();
}

/* ------------------------------------------------------------------ */
/* Page chrome that works with or without WebGL                        */
/* ------------------------------------------------------------------ */
function initChrome() {
  const nav = $('#nav');
  nav.addEventListener('pointermove', (e) => {
    const r = nav.getBoundingClientRect();
    nav.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
  });

  const menuBtn = $('#menu-btn');
  const links = $('#nav-links');
  menuBtn.addEventListener('click', () => {
    const open = menuBtn.getAttribute('aria-expanded') !== 'true';
    menuBtn.setAttribute('aria-expanded', String(open));
    links.classList.toggle('is-open', open);
  });

  document.addEventListener('click', (e) => {
    const soon = e.target.closest('[data-soon]');
    if (!soon) return;
    e.preventDefault();
    toast(soon.dataset.soon === 'quote'
      ? 'Pasiūlymo forma bus prijungta kitame etape.'
      : 'Šis puslapis dar kuriamas.');
  });
}

let toastTimer;
function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2600);
}

function enterFallback() {
  body.classList.remove('is-intro');
  body.classList.add('no-webgl');
  $('#loader')?.remove();
  $('#skip-btn').hidden = true;
}

function overviewView() {
  const a = innerWidth / innerHeight;
  if (a < 0.8) return { pos: new THREE.Vector3(0, 2.3, 13), tgt: new THREE.Vector3(0, 0.55, -1.5), fov: 58 };
  if (a < 1.3) return { pos: new THREE.Vector3(-0.3, 1.9, 10), tgt: new THREE.Vector3(-0.3, 1.5, -1.5), fov: 46 };
  // Wide screens: shift the composition right so the copy on the left has room.
  return { pos: new THREE.Vector3(-1.1, 1.75, 8.2), tgt: new THREE.Vector3(-1.5, 1.55, -1.5), fov: 40 };
}

/* ------------------------------------------------------------------ */
/* 3D experience                                                       */
/* ------------------------------------------------------------------ */
async function start() {
  const small = Math.min(innerWidth, innerHeight) < 700;
  let dpr = Math.min(devicePixelRatio, small ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  let ov = overviewView();
  const camera = new THREE.PerspectiveCamera(ov.fov, innerWidth / innerHeight, 0.05, 200);
  const world = buildWorld(renderer, { reflectScale: small ? 0.35 : 0.5 });
  const { scene, products } = world;

  const rt = new THREE.WebGLRenderTarget(innerWidth * dpr, innerHeight * dpr, { type: THREE.HalfFloatType, samples: small ? 2 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(dpr);
  composer.setSize(innerWidth, innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.45, 0.5, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------- Camera rig: tweened base + damped look/lean ---------- */
  const rig = { pos: new THREE.Vector3(), tgt: new THREE.Vector3() };
  const look = { yaw: 0, pitch: 0, tyaw: 0, tpitch: 0, amp: 0 };
  const lean = { v: new THREE.Vector3(), t: new THREE.Vector3(), s: 1, ts: 1 };
  const sph = new THREE.Spherical();
  const off = new THREE.Vector3();
  const aim = new THREE.Vector3();

  function updateRig(dt, t) {
    const k = 1 - Math.exp(-dt * 3.2);
    look.yaw += (look.tyaw * look.amp - look.yaw) * k;
    look.pitch += (look.tpitch * look.amp - look.pitch) * k;
    lean.v.lerp(lean.t, k * 0.7);
    lean.s += (lean.ts - lean.s) * k * 0.7;
    aim.copy(rig.tgt).add(lean.v);
    off.copy(rig.pos).sub(rig.tgt).multiplyScalar(lean.s);
    sph.setFromVector3(off);
    sph.theta += look.yaw;
    sph.phi = THREE.MathUtils.clamp(sph.phi - look.pitch, 0.05, Math.PI - 0.05);
    camera.position.setFromSpherical(sph).add(aim);
    if (!reduceMotion && look.amp > 0) {
      camera.position.x += Math.sin(t * 0.31) * 0.03;
      camera.position.y += Math.sin(t * 0.5) * 0.02;
    }
    camera.lookAt(aim);
  }

  /* ---------- Interaction state ---------- */
  let mode = 'intro'; // intro | overview | focus
  let hovered = null;
  let focused = null;
  const ndc = new THREE.Vector2(9, 9);
  let pointerKind = 'mouse';
  let hasPointer = false;
  const raycaster = new THREE.Raycaster();
  const hits = products.map((p) => p.hit);
  const label = $('#label');
  const backBtn = $('#back-btn');
  const hint = $('#hint');

  function setHovered(p) {
    if (p === hovered) return;
    hovered = p;
    canvas.style.cursor = p ? 'pointer' : '';
    if (mode === 'overview') {
      world.highlight(p);
      if (p) { lean.t.copy(p.center).sub(rig.tgt).multiplyScalar(0.14); lean.ts = 0.93; }
      else { lean.t.set(0, 0, 0); lean.ts = 1; }
    }
    renderLabel();
  }

  function renderLabel() {
    const p = focused || hovered;
    if (!p || mode === 'intro') { label.classList.remove('is-visible', 'is-focus'); return; }
    const isFocus = p === focused;
    label.hidden = false;
    label.innerHTML = `
      <span class="tag">${p.spec.tag}</span>
      <h2>${p.spec.name}</h2>
      ${isFocus
        ? `<p>Pritaikysime matmenis, spalvą ir stiklo paketą pagal Jūsų projektą.</p>
           <div class="label-actions">
             <a class="btn btn-gold" href="#" data-soon="quote">Gauti pasiūlymą →</a>
             <a class="btn btn-glass" href="#" data-soon>Konfigūruoti</a>
           </div>`
        : `<p>Spustelėkite, kad apžiūrėtumėte iš arti</p>`}`;
    label.classList.add('is-visible');
    label.classList.toggle('is-focus', isFocus);
  }

  const proj = new THREE.Vector3();
  function placeLabel() {
    const p = hovered;
    if (!p || focused || mode === 'intro') return;
    proj.copy(p.anchor).project(camera);
    const x = (proj.x * 0.5 + 0.5) * innerWidth;
    const y = (-proj.y * 0.5 + 0.5) * innerHeight;
    const pad = 160;
    label.style.left = `${THREE.MathUtils.clamp(x, pad, innerWidth - pad)}px`;
    label.style.top = `${THREE.MathUtils.clamp(y, 200, innerHeight - 24)}px`;
  }

  function focusProduct(p) {
    if (!p) return;
    if (focused && focused !== p) focused.close();
    mode = 'focus';
    focused = p;
    hovered = null;
    world.highlight(p);
    lean.t.set(0, 0, 0); lean.ts = 1;
    look.amp = 0.35;
    const dur = reduceMotion ? 0 : 1.6;
    gsap.to(rig.pos, { x: p.viewPos.x, y: p.viewPos.y, z: p.viewPos.z, duration: dur, ease: 'power3.inOut', overwrite: true });
    gsap.to(rig.tgt, { x: p.viewTgt.x, y: p.viewTgt.y, z: p.viewTgt.z, duration: dur, ease: 'power3.inOut', overwrite: true });
    p.open();
    backBtn.hidden = false;
    body.classList.add('is-focus');
    renderLabel();
  }

  function unfocus() {
    if (mode !== 'focus') return;
    focused?.close();
    focused = null;
    mode = 'overview';
    look.amp = 1;
    world.highlight(null);
    const dur = reduceMotion ? 0 : 1.4;
    gsap.to(rig.pos, { x: ov.pos.x, y: ov.pos.y, z: ov.pos.z, duration: dur, ease: 'power3.inOut', overwrite: true });
    gsap.to(rig.tgt, { x: ov.tgt.x, y: ov.tgt.y, z: ov.tgt.z, duration: dur, ease: 'power3.inOut', overwrite: true });
    backBtn.hidden = true;
    body.classList.remove('is-focus');
    renderLabel();
  }

  /* ---------- Pointer / touch / keyboard ---------- */
  let down = null;
  let hintTimer;
  let moved = 0;

  canvas.addEventListener('pointermove', (e) => {
    pointerKind = e.pointerType;
    const nx = (e.clientX / innerWidth) * 2 - 1;
    const ny = -(e.clientY / innerHeight) * 2 + 1;
    if (e.pointerType === 'mouse') {
      ndc.set(nx, ny);
      hasPointer = true;
      look.tyaw = -nx * MAX_YAW;
      look.tpitch = -ny * MAX_PITCH;
    } else if (down) {
      // touch: drag to look
      look.tyaw = THREE.MathUtils.clamp(look.tyaw - (e.movementX || 0) * 0.004, -MAX_YAW, MAX_YAW);
      look.tpitch = THREE.MathUtils.clamp(look.tpitch + (e.movementY || 0) * 0.003, -MAX_PITCH, MAX_PITCH);
    }
    if (mode !== 'intro' && (moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0)) > 240) hideHint();
  });
  canvas.addEventListener('pointerleave', () => { hasPointer = false; ndc.set(9, 9); setHovered(null); });
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const tap = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8;
    down = null;
    if (!tap) return;
    if (mode === 'intro') { skipIntro(); return; }
    if (e.pointerType !== 'mouse') {
      ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(hits, false)[0];
      if (hit) { focusProduct(hit.object.userData.product); return; }
    } else if (hovered) { focusProduct(hovered); return; }
    if (mode === 'focus') unfocus();
  });

  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (mode === 'intro') skipIntro();
      else unfocus();
      return;
    }
    if (mode === 'intro') return;
    const step = 4 * DEG;
    if (e.key === 'ArrowLeft') look.tyaw = Math.min(look.tyaw + step, MAX_YAW);
    else if (e.key === 'ArrowRight') look.tyaw = Math.max(look.tyaw - step, -MAX_YAW);
    else if (e.key === 'ArrowUp') look.tpitch = Math.max(look.tpitch - step / 2, -MAX_PITCH);
    else if (e.key === 'ArrowDown') look.tpitch = Math.min(look.tpitch + step / 2, MAX_PITCH);
  });
  addEventListener('wheel', () => { if (mode === 'intro') skipIntro(); }, { passive: true });

  backBtn.addEventListener('click', unfocus);
  $('#tour-btn').addEventListener('click', () => focusProduct(products.find((p) => p.spec.id === 'slide')));
  document.querySelectorAll('[data-focus]').forEach((btn) =>
    btn.addEventListener('click', () => focusProduct(products.find((p) => p.spec.id === btn.dataset.focus))));

  // Accessible product list mirrors the 3D exhibits
  const list = $('#product-list');
  for (const p of products) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `${p.spec.tag}: ${p.spec.name}`;
    b.addEventListener('focus', () => { if (mode === 'overview') setHovered(p); });
    b.addEventListener('blur', () => { if (mode === 'overview') setHovered(null); });
    b.addEventListener('click', () => focusProduct(p));
    li.append(b);
    list.append(li);
  }

  function showHint() {
    if (pointerKind !== 'mouse' && matchMedia('(pointer: coarse)').matches) return;
    hint.classList.add('is-visible');
    hintTimer = setTimeout(hideHint, 7000);
  }
  function hideHint() { clearTimeout(hintTimer); hint.classList.remove('is-visible'); }

  /* ---------- Intro ---------- */
  const tl = createIntro(world, rig, ov, { onUiReveal: () => body.classList.remove('is-intro') });
  tl.eventCallback('onComplete', finishIntro);

  function finishIntro() {
    if (mode !== 'intro') return;
    body.classList.remove('is-intro');
    world.settle();
    rig.pos.copy(ov.pos);
    rig.tgt.copy(ov.tgt);
    mode = 'overview';
    look.amp = reduceMotion ? 0 : 1;
    store.set(INTRO_KEY, '1');
    showHint();
    if (hasPointer) {
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(hits, false)[0];
      setHovered(hit ? hit.object.userData.product : null);
    }
  }
  function skipIntro() {
    if (mode !== 'intro') return;
    tl.progress(1);
    finishIntro();
  }
  $('#skip-btn').addEventListener('click', skipIntro);

  /* ---------- Resize / visibility / adaptive quality ---------- */
  function onResize() {
    ov = overviewView();
    camera.fov = ov.fov;
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
    composer.setSize(innerWidth, innerHeight);
    bloom.resolution.set(innerWidth / 2, innerHeight / 2);
    if (mode === 'overview') { rig.pos.copy(ov.pos); rig.tgt.copy(ov.tgt); }
  }
  addEventListener('resize', onResize);

  const clock = new THREE.Clock();
  let elapsed = 0;
  let slowFrames = 0;
  function adapt(dt) {
    slowFrames = dt > 1 / 38 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames > 90 && dpr > 1) {
      dpr = Math.max(1, dpr - 0.25);
      renderer.setPixelRatio(dpr);
      composer.setPixelRatio(dpr);
      slowFrames = 0;
    }
  }

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;
    updateRig(dt, elapsed);
    if (mode === 'overview' && hasPointer && pointerKind === 'mouse') {
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(hits, false)[0];
      setHovered(hit ? hit.object.userData.product : null);
    }
    placeLabel();
    composer.render(dt);
    adapt(dt);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) renderer.setAnimationLoop(null);
    else { clock.getDelta(); renderer.setAnimationLoop(frame); }
  });

  /* ---------- Go ---------- */
  updateRig(0, 0);
  renderer.compile(scene, camera);
  const minBrandBeat = new Promise((r) => setTimeout(r, reduceMotion ? 0 : 1500));
  const fonts = Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]);
  await Promise.all([minBrandBeat, fonts]);

  renderer.setAnimationLoop(frame);
  const loader = $('#loader');
  gsap.to(loader, { autoAlpha: 0, duration: reduceMotion ? 0 : 0.7, ease: 'power2.out', onComplete: () => loader.remove() });

  if (reduceMotion) {
    skipIntro();
  } else {
    if (store.get(INTRO_KEY)) tl.timeScale(5); // condensed replay for returning visitors
    tl.play(0);
  }
}
