import * as THREE from 'three';
import gsap from 'gsap';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { buildWorld, PRODUCTS } from './scene.js';
import { createIntro } from './intro.js';
import { initI18n, onLangChange, t } from './i18n.js';
import { initQuote } from './quote.js';

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

initI18n();

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

  // "Under development" notice: dismissible for the session
  const banner = $('#dev-banner');
  try { if (sessionStorage.getItem('vakema:dev-banner') === 'hidden') banner.classList.add('is-hidden'); } catch { /* storage blocked */ }
  banner.querySelector('.dev-close').addEventListener('click', () => {
    banner.classList.add('is-hidden');
    try { sessionStorage.setItem('vakema:dev-banner', 'hidden'); } catch { /* storage blocked */ }
  });

  // Sheets: glass pages that grow out of the link or button that opened them
  const homeLink = links.querySelector('a[href="./"]');
  let activeSheet = null;
  function createSheet(section, { hash, navLink = null }) {
    let opener = null;
    const isOpen = () => section.classList.contains('is-open');
    const sheet = { section, isOpen, open, close };
    function open(from) {
      if (isOpen()) return;
      activeSheet?.close(false);
      opener = from;
      const r = from.getBoundingClientRect();
      section.style.setProperty('--ox', `${r.left + r.width / 2}px`);
      section.style.setProperty('--oy', `${r.top + r.height / 2}px`);
      section.hidden = false;
      section.getBoundingClientRect(); // commit the closed state so the opening animates
      section.classList.add('is-open');
      body.classList.add('sheet-open');
      menuBtn.setAttribute('aria-expanded', 'false');
      links.classList.remove('is-open');
      if (navLink) { homeLink.removeAttribute('aria-current'); navLink.setAttribute('aria-current', 'page'); }
      history.replaceState(null, '', hash);
      activeSheet = sheet;
      setTimeout(() => section.querySelector('.sheet-close').focus({ preventScroll: true }), 450);
    }
    function close(restoreFocus = true) {
      if (!isOpen()) return;
      section.classList.remove('is-open');
      body.classList.remove('sheet-open');
      if (navLink) { navLink.removeAttribute('aria-current'); homeLink.setAttribute('aria-current', 'page'); }
      history.replaceState(null, '', location.pathname + location.search);
      if (activeSheet === sheet) activeSheet = null;
      setTimeout(() => { if (!isOpen()) section.hidden = true; }, 900);
      if (restoreFocus) opener?.focus({ preventScroll: true });
    }
    section.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', () => close()));
    return sheet;
  }

  // Kontaktai
  const contactsLink = links.querySelector('[data-contacts]');
  const contacts = createSheet($('#kontaktai'), { hash: '#kontaktai', navLink: contactsLink });
  document.querySelectorAll('[data-contacts]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    contacts.open(a);
  }));
  $('#kontaktai form').addEventListener('submit', (e) => {
    e.preventDefault();
    toast(t('toast.sent'));
  });

  // Gauti pasiūlymą: any [data-quote] button opens it; a product card pre-fills that product
  const quoteSheet = createSheet($('#pasiulymas'), { hash: '#pasiulymas' });
  const quote = initQuote($('#pasiulymas'), { products: PRODUCTS, t, onLangChange });
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-quote]');
    if (!btn) return;
    e.preventDefault();
    const product = btn.dataset.quote;
    quote.setEntry(product ? `product:${product}` : btn.closest('.nav') ? 'nav' : 'hero');
    if (product) quote.addProduct(product);
    quoteSheet.open(btn);
  });

  // Capture phase, so Escape closes the sheet before the showroom handles it
  addEventListener('keydown', (e) => {
    if (!activeSheet) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      activeSheet.close();
    } else if (e.key === 'Tab') {
      const f = [...activeSheet.section.querySelectorAll('button, a[href], input, select, textarea')]
        .filter((el) => !el.disabled && !el.closest('[hidden], .hp'));
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  }, true);
  if (location.hash === '#kontaktai') contacts.open(contactsLink);
  if (location.hash === '#pasiulymas') quoteSheet.open($('.nav-cta'));

  document.addEventListener('click', (e) => {
    const soon = e.target.closest('[data-soon]');
    if (!soon) return;
    e.preventDefault();
    toast(t('toast.soon'));
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
  const small = Math.min(innerWidth, innerHeight) < 700;
  let dpr = Math.min(devicePixelRatio, small ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.AgXToneMapping; // photographic response
  renderer.toneMappingExposure = 1.05;

  let ov = overviewView();
  const camera = new THREE.PerspectiveCamera(ov.fov, innerWidth / innerHeight, 0.05, 200);
  const world = buildWorld(renderer, { reflectScale: small ? 0.35 : 0.5, shadowSize: small ? 1024 : 2048, small });
  const { scene, products } = world;

  const rt = new THREE.WebGLRenderTarget(innerWidth * dpr, innerHeight * dpr, { type: THREE.HalfFloatType, samples: small ? 2 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(dpr);
  composer.setSize(innerWidth, innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  if (!small) {
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
    label.innerHTML = `
      <span class="tag">${t(`tag.${p.spec.tag}`)}</span>
      <h2>${t(`product.${p.spec.id}`, p.spec.name)}</h2>
      ${isFocus
        ? `<p>${t('label.text')}</p>
           <div class="label-actions">
             <a class="btn btn-gold" href="#pasiulymas" data-quote="${p.spec.id}">${t('label.quote')}</a>
             <a class="btn btn-glass" href="#" data-soon>${t('label.configure')} <em class="soon">${t('soon')}</em></a>
           </div>`
        : `<p>${t('label.hover')}</p>`}`;
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
  // Mouse wheel steps through the exhibits: windows first, then doors. One gesture = one
  // step; a long continuous scroll keeps stepping about once a second.
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
    const start = focused ? products.indexOf(focused)
      : home ? products.findIndex((p) => p.spec.tag === home.tag) - (e.deltaY > 0 ? 1 : 0)
      : -1;
    const next = start + Math.sign(e.deltaY);
    if (next < 0 || (!focused && next < start)) { back(); return; }
    if (next >= products.length) { goOverview(); return; } // past the last door: main view
    const p = products[next];
    if (home && home.tag !== p.spec.tag) setHome(p.spec.tag);
    focusProduct(p);
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
    world.update(elapsed);
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
