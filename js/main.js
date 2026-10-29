import * as THREE from 'three';
import gsap from 'gsap';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { buildWorld } from './scene.js';
import { BEATS, createIntro } from './intro.js';
import { initI18n, onLangChange, t } from './i18n.js';
import { initChrome, labelHTML } from './chrome.js';

const $ = (s) => document.querySelector(s);
const body = document.body;
const canvas = $('#scene');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const INTRO_KEY = 'vakema:intro-seen';
const DEG = Math.PI / 180;
const MAX_YAW = 18 * DEG;
const MAX_PITCH = 8 * DEG;
// Device tier picked in index.html: 'full' or 'reduced' (the lite version never loads this file).
const tier = window.__vakemaTier || 'full';
// ?capture=1: deterministic shots for the lite version (tools/capture/render.mjs drives it)
const capture = new URLSearchParams(location.search).has('capture');

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

// Loader progress bar from index.html; this file reports the steps after the downloads.
const progress = window.__vakemaLoad || { at() {}, finish: () => Promise.resolve(), stop() {} };
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
// If 3D can't start, index.html switches to the lite version (or offers a retry on network errors).
const loadError = (kind) => window.__vakemaError?.(kind);

initI18n();
initChrome();

let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: capture });
} catch (err) {
  console.warn('WebGL unavailable.', err);
}
if (renderer) start().catch((err) => { console.error(err); loadError('error'); });
else loadError('webgl');

function overviewView() {
  const a = innerWidth / innerHeight;
  if (a < 0.8) return { pos: new THREE.Vector3(0, 2.6, 14.5), tgt: new THREE.Vector3(0, 0.55, -2), fov: 58 };
  if (a < 1.3) return { pos: new THREE.Vector3(0, 2.1, 12), tgt: new THREE.Vector3(0, 1.3, -2), fov: 50 };
  // Wide screens: centred on the apex, wide enough that both walls (windows left,
  // doors right, about ±6.4 m across) always fit.
  const dist = 11;
  const fov = Math.max(42, (2 * Math.atan(6.4 / dist / a)) / DEG);
  return { pos: new THREE.Vector3(0, 2.0, dist), tgt: new THREE.Vector3(0, 1.35, -2), fov };
}

/* ------------------------------------------------------------------ */
/* 3D experience                                                       */
/* ------------------------------------------------------------------ */
async function start() {
  // Every download is in once this module runs; let the bar show it before the heavy work.
  const minBrandBeat = new Promise((r) => setTimeout(r, reduceMotion || capture ? 0 : 1500));
  let opened = false;
  progress.at(0.82);
  await nextFrame();
  const small = Math.min(innerWidth, innerHeight) < 700;
  const reduced = tier === 'reduced';
  const low = small || reduced; // no ambient occlusion, smaller reflections and shadows
  let dpr = capture ? 1 : Math.min(devicePixelRatio, reduced ? 1 : small ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.AgXToneMapping; // photographic response
  renderer.toneMappingExposure = 1.05;

  let ov = overviewView();
  const camera = new THREE.PerspectiveCamera(ov.fov, innerWidth / innerHeight, 0.05, 200);
  const world = buildWorld(renderer, { reflectScale: reduced ? 0.25 : small ? 0.35 : 0.5, shadowSize: low ? 1024 : 2048, small });
  const { scene, products } = world;
  progress.at(0.9);

  const rt = new THREE.WebGLRenderTarget(innerWidth * dpr, innerHeight * dpr, { type: THREE.HalfFloatType, samples: reduced ? 0 : small ? 2 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(dpr);
  composer.setSize(innerWidth, innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  if (!low) {
    // Ambient occlusion: soft contact shadows in corners and under furniture
    const ao = new GTAOPass(scene, camera, innerWidth, innerHeight);
    ao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1.2, scale: 1 });
    ao.blendIntensity = 0.9;
    composer.addPass(ao);
  }
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
      camera.position.x += Math.sin(t * 0.31) * 0.03 * look.amp;
      camera.position.y += Math.sin(t * 0.5) * 0.02 * look.amp;
    }
    camera.lookAt(aim);
  }

  /* ---------- Interaction state ---------- */
  let mode = 'intro'; // intro | overview | focus
  let hovered = null;
  let focused = null;
  let home = null; // a wall view (Langai / Durys) the camera rests at instead of the overview
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
    body.classList.toggle('has-hover', !!p && mode === 'overview');
    if (mode === 'overview') {
      world.highlight(p);
      if (p) { lean.t.copy(p.center).sub(rig.tgt).multiplyScalar(0.14); lean.ts = 0.93; }
      else { lean.t.set(0, 0, 0); lean.ts = 1; }
    }
    renderLabel();
  }

  function renderLabel() {
    backBtn.textContent = t(mode === 'focus' && home ? `back.${home.tag}` : 'back.home');
    const p = focused || hovered;
    if (!p || mode === 'intro') { label.classList.remove('is-visible', 'is-focus'); return; }
    const isFocus = p === focused;
    label.hidden = false;
    label.innerHTML = labelHTML(p.spec, isFocus);
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

  const chips = document.querySelectorAll('[data-wall]');
  const tweenRig = (v, dur) => {
    gsap.to(rig.pos, { x: v.pos.x, y: v.pos.y, z: v.pos.z, duration: dur, ease: 'power3.inOut', overwrite: true });
    gsap.to(rig.tgt, { x: v.tgt.x, y: v.tgt.y, z: v.tgt.z, duration: dur, ease: 'power3.inOut', overwrite: true });
  };

  // Stand in the room facing one wall, far enough back that all of its products fit.
  function wallView(tag) {
    const ps = products.filter((p) => p.spec.tag === tag);
    const us = ps.flatMap((p) => [p.spec.u - p.spec.w / 2, p.spec.u + p.spec.w / 2]);
    const u0 = Math.min(...us), u1 = Math.max(...us);
    const tgt = ps[0].root.parent.localToWorld(new THREE.Vector3((u0 + u1) / 2, tag === 'Langai' ? 1.55 : 1.3, 0));
    const halfH = Math.atan(Math.tan((camera.fov * DEG) / 2) * camera.aspect);
    const dist = Math.min(8.5, ((u1 - u0) / 2 + 0.7) / Math.tan(halfH));
    return { tag, pos: tgt.clone().addScaledVector(ps[0].normal, dist).setY(1.75), tgt };
  }

  function setHome(tag) {
    home = wallView(tag);
    chips.forEach((c) => c.classList.toggle('is-active', c.dataset.wall === tag));
  }

  function showWall(tag) {
    if (mode === 'intro') return;
    if (focused) { focused.close(); focused = null; }
    mode = 'overview';
    setHome(tag);
    world.highlight(null);
    lean.t.set(0, 0, 0); lean.ts = 1;
    look.amp = 0.5;
    tweenRig(home, reduceMotion ? 0 : 1.6);
    backBtn.hidden = false;
    body.classList.remove('is-focus');
    body.classList.add('is-wall');
    renderLabel();
  }

  function leaveWall() {
    if (!home || mode !== 'overview') return;
    home = null;
    look.amp = 1;
    tweenRig(ov, reduceMotion ? 0 : 1.4);
    backBtn.hidden = true;
    body.classList.remove('is-wall');
    chips.forEach((c) => c.classList.remove('is-active'));
  }

  function back() {
    if (mode === 'focus') unfocus();
    else leaveWall();
  }

  // Straight back to the main view, from a product or a wall view
  function goOverview() {
    if (mode === 'focus') {
      home = null;
      body.classList.remove('is-wall');
      chips.forEach((c) => c.classList.remove('is-active'));
      unfocus();
    } else leaveWall();
  }

  function focusProduct(p) {
    if (!p) return;
    if (focused && focused !== p) focused.close();
    mode = 'focus';
    focused = p;
    hovered = null;
    body.classList.remove('has-hover');
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
    look.amp = home ? 0.5 : 1;
    world.highlight(null);
    tweenRig(home || ov, reduceMotion ? 0 : 1.4);
    backBtn.hidden = !home;
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
      if (mode === 'intro') return; // camera stays on its rails until the intro ends
      look.tyaw = -nx * MAX_YAW;
      look.tpitch = -ny * MAX_PITCH;
    } else if (down && mode !== 'intro') {
      // touch: drag to look
      look.tyaw = THREE.MathUtils.clamp(look.tyaw - (e.movementX || 0) * 0.004, -MAX_YAW, MAX_YAW);
      look.tpitch = THREE.MathUtils.clamp(look.tpitch + (e.movementY || 0) * 0.003, -MAX_PITCH, MAX_PITCH);
    }
    if (mode !== 'intro' && (moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0)) > 240) hideHint();
  });
  canvas.addEventListener('pointerleave', () => { hasPointer = false; ndc.set(9, 9); setHovered(null); });
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    const tap = Math.hypot(dx, dy) < 8;
    const swipe = e.pointerType !== 'mouse' && Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx) * 1.5 && performance.now() - down.t < 700;
    down = null;
    if (swipe && mode !== 'intro') { look.tpitch = 0; stepExhibit(dy < 0 ? 1 : -1); return; }
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
      else back();
      return;
    }
    if (mode === 'intro') return;
    const step = 4 * DEG;
    if (e.key === 'ArrowLeft') look.tyaw = Math.min(look.tyaw + step, MAX_YAW);
    else if (e.key === 'ArrowRight') look.tyaw = Math.max(look.tyaw - step, -MAX_YAW);
    else if (e.key === 'ArrowUp') look.tpitch = Math.max(look.tpitch - step / 2, -MAX_PITCH);
    else if (e.key === 'ArrowDown') look.tpitch = Math.min(look.tpitch + step / 2, MAX_PITCH);
  });
  // Mouse wheel (and a vertical swipe on touch screens) steps through the exhibits: windows
  // first, then doors. One gesture = one step; a long continuous scroll keeps stepping about
  // once a second.
  function stepExhibit(dir) {
    const start = focused ? products.indexOf(focused)
      : home ? products.findIndex((p) => p.spec.tag === home.tag) - (dir > 0 ? 1 : 0)
      : -1;
    const next = start + dir;
    if (next < 0 || (!focused && next < start)) { back(); return; }
    if (next >= products.length) { goOverview(); return; } // past the last door: main view
    const p = products[next];
    if (home && home.tag !== p.spec.tag) setHome(p.spec.tag);
    focusProduct(p);
  }
  let lastWheel = 0;
  let wheelLock = 0;
  addEventListener('wheel', (e) => {
    if (mode === 'intro') { skipIntro(); return; }
    if (body.classList.contains('sheet-open') || Math.abs(e.deltaY) < 2) return;
    const now = performance.now();
    const fresh = now - lastWheel > 300;
    lastWheel = now;
    if (!fresh && now < wheelLock) return;
    wheelLock = now + 1100;
    stepExhibit(Math.sign(e.deltaY));
  }, { passive: true });

  backBtn.addEventListener('click', back);
  chips.forEach((btn) => btn.addEventListener('click', () => {
    if (home?.tag === btn.dataset.wall && mode === 'overview') leaveWall();
    else showWall(btn.dataset.wall);
  }));

  // Accessible product list mirrors the 3D exhibits
  const list = $('#product-list');
  for (const p of products) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.product = p.spec.id;
    b.addEventListener('focus', () => { if (mode === 'overview') setHovered(p); });
    b.addEventListener('blur', () => { if (mode === 'overview') setHovered(null); });
    b.addEventListener('click', () => focusProduct(p));
    li.append(b);
    list.append(li);
  }
  const labelList = () => list.querySelectorAll('button').forEach((b, i) => {
    const p = products[i];
    b.textContent = `${t(`tag.${p.spec.tag}`)}: ${t(`product.${p.spec.id}`, p.spec.name)}`;
  });
  labelList();
  onLangChange(() => { labelList(); renderLabel(); });

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
    // hand the camera to the mouse gently: start from where the pointer already is, fade the look in
    if (hasPointer) { look.tyaw = -ndc.x * MAX_YAW; look.tpitch = -ndc.y * MAX_PITCH; }
    look.amp = 0;
    if (!reduceMotion) gsap.to(look, { amp: 1, duration: 1.8, ease: 'power2.inOut' });
    store.set(INTRO_KEY, '1');
    showHint();
    if (hasPointer) {
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(hits, false)[0];
      setHovered(hit ? hit.object.userData.product : null);
    }
  }
  function skipIntro() {
    if (mode !== 'intro' || !opened) return;
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
    if (mode === 'overview') {
      if (home) home = wallView(home.tag);
      rig.pos.copy((home || ov).pos);
      rig.tgt.copy((home || ov).tgt);
    }
  }
  addEventListener('resize', onResize);

  const clock = new THREE.Clock();
  let elapsed = 0;
  let slowFrames = 0;
  function adapt(dt) {
    slowFrames = dt > 1 / 38 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames > 90 && dpr > 1 && !capture) {
      dpr = Math.max(1, dpr - 0.25);
      renderer.setPixelRatio(dpr);
      composer.setPixelRatio(dpr);
      slowFrames = 0;
    }
  }

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    render(dt);
    adapt(dt);
  }

  function render(dt) {
    elapsed += dt;
    updateRig(dt, elapsed);
    world.update(elapsed);
    if (mode === 'overview' && hasPointer && pointerKind === 'mouse') {
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(hits, false)[0];
      setHovered(hit ? hit.object.userData.product : null);
    }
    placeLabel();
    composer.render(dt);
  }

  document.addEventListener('visibilitychange', () => {
    if (capture) return; // capture runs on its own clock
    if (document.hidden || !opened) renderer.setAnimationLoop(null);
    else { clock.getDelta(); renderer.setAnimationLoop(frame); }
  });

  /* ---------- Go: compile everything behind the loader, then open ---------- */
  updateRig(0, 0);
  await nextFrame();
  if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
  else renderer.compile(scene, camera);
  progress.at(0.96);
  await nextFrame();
  composer.render(0); // first frame: compiles the post-processing shaders too
  const fonts = Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]);
  await Promise.all([minBrandBeat, fonts]);
  await progress.finish();
  opened = true;

  renderer.setAnimationLoop(frame);
  const loader = $('#loader');
  gsap.to(loader, { autoAlpha: 0, duration: reduceMotion ? 0 : 0.7, ease: 'power2.out', onComplete: () => { progress.stop(); loader.remove(); } });

  if (capture) {
    initCapture();
  } else if (reduceMotion) {
    skipIntro();
  } else {
    if (store.get(INTRO_KEY)) tl.timeScale(5); // condensed replay for returning visitors
    tl.play(0);
  }

  /* ---------- Capture: stills, clips and hotspot boxes for the lite version ---------- */
  // Runs on virtual time: gsap and the renderer advance exactly one frame per step, so clips
  // come out smooth however slow the machine is. Driven by tools/capture/render.mjs.
  function initCapture() {
    const FPS = 30;
    renderer.setAnimationLoop(null);
    gsap.ticker.remove(gsap.updateRoot);
    let vt = gsap.ticker.time;
    const still = () => { gsap.killTweensOf(look); Object.assign(look, { yaw: 0, pitch: 0, tyaw: 0, tpitch: 0, amp: 0 }); };
    const step = () => {
      vt += 1 / FPS;
      gsap.updateRoot(vt);
      still();
      render(1 / FPS);
    };
    const advance = (sec) => { for (let i = Math.round(sec * FPS); i > 0; i--) step(); };
    const byId = (id) => products.find((p) => p.spec.id === id);
    const calm = () => { hasPointer = false; setHovered(null); };
    const settled = () => { calm(); if (mode === 'intro') skipIntro(); goOverview(); advance(2.5); };

    const box = new THREE.Box3();
    const corner = new THREE.Vector3();
    const round = (v) => Math.round(v * 10000) / 10000;
    window.__capture = {
      fps: FPS,
      // Still views: 'overview' | 'wall:Langai' | 'wall:Durys' | 'focus:<product id>'
      shot(name) {
        const [kind, arg] = name.split(':');
        calm();
        if (mode === 'intro') skipIntro();
        if (kind === 'overview') goOverview();
        else if (kind === 'wall') showWall(arg);
        else focusProduct(byId(arg));
        advance(3.2); // camera tween + sash opening
      },
      // Clips: set the start state, return how many frames to step. Then call frame() that often.
      //   'intro'      – the assembly, from the first beat to the resting overview (fresh page only)
      //   'wall:<tag>' – overview → standing at that wall (played backwards for the way out)
      //   'focus:<id>' – the last metres of the approach to a product while its sash opens
      clip(name) {
        const [kind, arg] = name.split(':');
        if (kind === 'intro') {
          if (mode !== 'intro') throw new Error('intro needs a fresh page');
          tl.timeScale(1).play(0);
          return { frames: Math.ceil(tl.duration() * FPS) + 1, uiAt: BEATS.ui };
        }
        settled();
        if (kind === 'wall') {
          showWall(arg);
          return { frames: Math.ceil(1.65 * FPS) };
        }
        const p = byId(arg);
        rig.pos.copy(p.viewPos).addScaledVector(p.normal, 2.4).add(new THREE.Vector3(0, 0.25, 0));
        rig.tgt.copy(p.viewTgt);
        focusProduct(p); // tweens from here to the product view; the sash opens at 0.75–1.95 s
        return { frames: Math.ceil(2.1 * FPS) };
      },
      frame(type = 'image/jpeg', quality = 0.95) {
        step();
        return canvas.toDataURL(type, quality);
      },
      // Products in view: bounding box and label anchor as fractions of the canvas
      hotspots() {
        camera.updateMatrixWorld();
        return products.flatMap((p) => {
          box.setFromObject(p.hit);
          let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
          for (let i = 0; i < 8; i++) {
            corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
            if (corner.z > 1) return []; // partly behind the camera
            const x = corner.x * 0.5 + 0.5, y = -corner.y * 0.5 + 0.5;
            x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
          }
          x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(1, x1); y1 = Math.min(1, y1);
          if (x1 - x0 < 0.02 || y1 - y0 < 0.02) return [];
          proj.copy(p.anchor).project(camera);
          return [{ id: p.spec.id, x: round(x0), y: round(y0), w: round(x1 - x0), h: round(y1 - y0),
            ax: round(proj.x * 0.5 + 0.5), ay: round(-proj.y * 0.5 + 0.5) }];
        });
      },
      grab: (type = 'image/webp', quality = 0.86) => canvas.toDataURL(type, quality),
    };
    window.__captureReady = true;
  }
}
