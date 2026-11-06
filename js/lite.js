// Lite showroom for devices that can't (or shouldn't) run the 3D scene: the same views and
// camera moves, pre-rendered by tools/capture/render.mjs, with clickable products laid over them.
// Stills (WebP) for every resting view, short H.264 clips for the moves between them: the intro,
// walking up to a wall and back, and the approach to a product while its sash opens.
// No three.js and no gsap. Mirrors the interaction model of main.js (overview → wall → product,
// back button, Escape, mouse wheel / vertical swipe stepping through the exhibits).
import { PRODUCTS } from './products.js';
import { initI18n, onLangChange, t } from './i18n.js';
import { initChrome, labelHTML } from './chrome.js';

const $ = (s) => document.querySelector(s);
const body = document.body;
const SHOTS = 'assets/lite/';
const INTRO_KEY = 'vakema:intro-seen'; // shared with the 3D version
const progress = window.__vakemaLoad || { at() {}, finish: () => Promise.resolve(), stop() {} };
// Clips only when motion is welcome and data isn't scarce; otherwise stills crossfade.
const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches && !navigator.connection?.saveData;

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

initI18n();
initChrome();
body.classList.add('is-lite');
start().catch((err) => { console.error(err); window.__vakemaError?.('network'); });

async function start() {
  const res = await fetch(`${SHOTS}shots.json`);
  if (!res.ok) throw new Error(`shots.json: ${res.status}`);
  const manifest = await res.json();
  progress.at(0.3);

  const stage = $('#lite-stage');
  const imgs = [...stage.querySelectorAll('.lite-shot')];
  const video = stage.querySelector('.lite-video');
  const layer = $('#lite-hotspots');
  const label = $('#label');
  const backBtn = $('#back-btn');
  const chips = document.querySelectorAll('[data-wall]');
  stage.hidden = false;

  // Portrait shots below the same aspect where the 3D camera switches to its portrait view
  const pickOrient = () => (innerWidth / innerHeight < 0.8 ? 'p' : 'l');
  let orient = pickOrient();

  let mode = 'overview'; // intro | overview | focus
  let home = null; // 'Langai' | 'Durys' while standing at a wall
  let focused = null;
  let hovered = null;
  let current = null; // shot name on screen
  let front = 0; // index of the visible <img>
  let token = 0; // bumps on every view change; stale async work checks it and stops

  const shotName = () => (focused ? `focus-${focused.id}` : home ? `wall-${home.toLowerCase()}` : 'overview');
  const v = manifest.rendered ? `?v=${manifest.rendered}` : ''; // new render, new URLs
  const stillSrc = (name) => `${SHOTS}${name}-${orient}.webp${v}`;
  const clipSrc = (name) => `${SHOTS}video/${name}-${orient}.mp4${v}`;

  // Stills: warm the HTTP cache. Clips: download whole into a blob so they never stall mid-move.
  const prefetched = new Set();
  function prefetch(name) {
    const url = stillSrc(name);
    if (prefetched.has(url)) return;
    prefetched.add(url);
    new Image().src = url;
  }
  const clips = new Map();
  function loadClip(name, onProgress) {
    const url = clipSrc(name);
    if (!clips.has(url)) {
      clips.set(url, (async () => {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`${url}: ${r.status}`);
        const total = +r.headers.get('content-length') || 0;
        if (!onProgress || !total || !r.body) return URL.createObjectURL(await r.blob());
        const reader = r.body.getReader();
        const parts = [];
        for (let got = 0; ;) {
          const { done, value } = await reader.read();
          if (done) break;
          parts.push(value);
          onProgress((got += value.length) / total);
        }
        return URL.createObjectURL(new Blob(parts, { type: 'video/mp4' }));
      })().catch((err) => { console.warn(err); clips.delete(url); return null; }));
    }
    return clips.get(url);
  }
  const prefetchClip = (name) => { if (motion) loadClip(name); };
  const within = (promise, ms) => Promise.race([promise, new Promise((r) => setTimeout(() => r(null), ms))]);

  // object-fit: cover maps image fractions to screen pixels
  function cover() {
    const { w, h } = manifest[orient];
    const s = Math.max(innerWidth / w, innerHeight / h);
    return { s: s * w, t: s * h, x: (innerWidth - s * w) / 2, y: (innerHeight - s * h) / 2 };
  }

  // Put a still on screen: crossfade, or instantly when it continues the frame already there
  async function setStill(name, instant) {
    const back = imgs[1 - front];
    back.src = stillSrc(name);
    try { await back.decode(); } catch { /* still shows once loaded */ }
    back.classList.toggle('is-instant', instant);
    imgs[front].classList.remove('is-active');
    back.classList.add('is-active');
    front = 1 - front;
  }

  function hideVideo(fade) {
    video.classList.toggle('is-fade', fade);
    video.classList.remove('is-playing');
    video.pause();
  }

  // Go to a view. With a clip: play it over the stills, then land on the view's still.
  //   seamless – the clip's first frame is the still on screen (wall in/out), so no fade-in
  async function go(name, clip = null, { seamless = false } = {}) {
    const my = ++token;
    current = name;
    stage.classList.add('is-busy');
    const url = motion && clip ? await within(loadClip(clip), seamless ? 900 : 1500) : null;
    if (my !== token) return;
    let played = false;
    if (url) {
      video.src = url;
      try {
        await video.play();
        played = my === token;
      } catch { /* autoplay refused or decode error: stills instead */ }
    }
    if (my !== token) return;
    if (!played) {
      hideVideo(true);
      await setStill(name, false);
    } else {
      video.classList.toggle('is-fade', !seamless);
      video.classList.add('is-playing');
      const landing = setStill(name, true); // decodes under the video while it plays
      await new Promise((r) => { video.onended = r; video.onerror = r; });
      await landing;
      if (my !== token) return;
      hideVideo(false);
    }
    if (my !== token) return;
    renderHotspots();
    stage.classList.remove('is-busy');
  }

  function renderHotspots() {
    layer.replaceChildren();
    const spots = manifest[orient].shots[current] || [];
    const c = cover();
    for (const h of spots) {
      const spec = PRODUCTS.find((p) => p.id === h.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lite-hot';
      b.dataset.product = spec.id;
      b.setAttribute('aria-label', `${t(`tag.${spec.tag}`)}: ${t(`product.${spec.id}`, spec.name)}`);
      Object.assign(b.style, {
        left: `${c.x + h.x * c.s}px`, top: `${c.y + h.y * c.t}px`,
        width: `${h.w * c.s}px`, height: `${h.h * c.t}px`,
      });
      b.anchor = { x: c.x + h.ax * c.s, y: c.y + h.ay * c.t };
      b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') setHovered(spec, b); });
      b.addEventListener('pointerleave', () => setHovered(null));
      b.addEventListener('focus', () => setHovered(spec, b));
      b.addEventListener('blur', () => setHovered(null));
      b.addEventListener('click', () => { if (performance.now() - swipedAt > 400) focusProduct(spec); });
      layer.append(b);
    }
  }

  function setHovered(spec, btn) {
    if (spec === hovered || mode !== 'overview') return;
    hovered = spec;
    body.classList.toggle('has-hover', !!spec);
    if (spec) {
      prefetch(`focus-${spec.id}`);
      prefetchClip(`focus-${spec.id}`);
      const pad = 160;
      label.style.left = `${Math.min(Math.max(btn.anchor.x, pad), innerWidth - pad)}px`;
      label.style.top = `${Math.min(Math.max(btn.anchor.y, 200), innerHeight - 24)}px`;
    }
    renderLabel();
  }

  function renderLabel() {
    backBtn.textContent = t(mode === 'focus' && home ? `back.${home}` : 'back.home');
    const spec = focused || hovered;
    if (!spec) { label.classList.remove('is-visible', 'is-focus'); return; }
    label.hidden = false;
    label.innerHTML = labelHTML(spec, spec === focused);
    label.classList.add('is-visible');
    label.classList.toggle('is-focus', spec === focused);
  }

  // Apply the new state; `from` is the shot that was on screen, which picks the clip
  function update() {
    const from = current;
    body.classList.toggle('is-focus', mode === 'focus');
    body.classList.toggle('is-wall', !!home);
    body.classList.remove('has-hover');
    chips.forEach((c) => c.classList.toggle('is-active', c.dataset.wall === home));
    backBtn.hidden = mode !== 'focus' && !home;
    hovered = null;
    const name = shotName();
    if (name === from) { renderLabel(); return; }
    if (focused) {
      // The card arrives as the sash finishes opening
      label.classList.remove('is-visible', 'is-focus');
      go(name, name).then(() => { if (focused && current === name) renderLabel(); });
      return;
    }
    renderLabel();
    if (from === 'overview' && home) go(name, `wall-in-${home.toLowerCase()}`, { seamless: true });
    else if (name === 'overview' && from?.startsWith('wall-')) go(name, `wall-out-${from.slice(5)}`, { seamless: true });
    else go(name);
  }

  function showWall(tag) {
    focused = null;
    mode = 'overview';
    home = tag;
    update();
    PRODUCTS.filter((p) => p.tag === tag).forEach((p) => { prefetch(`focus-${p.id}`); prefetchClip(`focus-${p.id}`); });
    prefetchClip(`wall-out-${tag.toLowerCase()}`);
  }
  function leaveWall() {
    if (!home || mode !== 'overview') return;
    home = null;
    update();
  }
  function focusProduct(spec) {
    if (!spec || mode === 'intro') return;
    focused = spec;
    mode = 'focus';
    update();
  }
  function unfocus() {
    if (mode !== 'focus') return;
    focused = null;
    mode = 'overview';
    update();
  }
  const back = () => (mode === 'focus' ? unfocus() : leaveWall());
  function goOverview() {
    focused = null;
    home = null;
    mode = 'overview';
    update();
  }

  // Pagrindinis / the logo (js/chrome.js): back to the main view without reloading the page
  addEventListener('vakema:home', () => (mode === 'intro' ? skipIntro() : goOverview()));

  // Wheel and vertical swipes step through the exhibits like the 3D version: windows, then doors
  function stepExhibit(dir) {
    const first = focused ? PRODUCTS.indexOf(focused)
      : home ? PRODUCTS.findIndex((p) => p.tag === home) - (dir > 0 ? 1 : 0)
      : -1;
    const next = first + dir;
    if (next < 0 || (!focused && next < first)) { back(); return; }
    if (next >= PRODUCTS.length) { goOverview(); return; }
    const p = PRODUCTS[next];
    if (home && home !== p.tag) home = p.tag;
    focusProduct(p);
    const after = PRODUCTS[next + dir];
    if (after) prefetchClip(`focus-${after.id}`);
  }

  backBtn.addEventListener('click', back);
  chips.forEach((btn) => btn.addEventListener('click', () => {
    if (mode === 'intro') skipIntro();
    if (home === btn.dataset.wall && mode === 'overview') leaveWall();
    else showWall(btn.dataset.wall);
  }));
  chips.forEach((btn) => btn.addEventListener('pointerenter', () => prefetchClip(`wall-in-${btn.dataset.wall.toLowerCase()}`)));
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (mode === 'intro') skipIntro();
    else back();
  });

  let down = null;
  let swipedAt = 0;
  stage.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  stage.addEventListener('pointerup', (e) => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    const quick = performance.now() - down.t < 700;
    down = null;
    if (mode === 'intro') { skipIntro(); return; }
    if (e.pointerType !== 'mouse' && quick && Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx) * 1.5) {
      swipedAt = performance.now();
      stepExhibit(dy < 0 ? 1 : -1);
      return;
    }
    // A tap on the picture outside the card leaves the product view
    if (Math.hypot(dx, dy) < 8 && mode === 'focus' && !e.target.closest('.lite-hot')) unfocus();
  });

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

  // Accessible product list, as in the 3D version
  const list = $('#product-list');
  list.replaceChildren(); // drop the static items from index.html
  for (const spec of PRODUCTS) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.addEventListener('click', () => focusProduct(spec));
    li.append(b);
    list.append(li);
  }
  const labelList = () => list.querySelectorAll('button').forEach((b, i) => {
    const spec = PRODUCTS[i];
    b.textContent = `${t(`tag.${spec.tag}`)}: ${t(`product.${spec.id}`, spec.name)}`;
  });
  labelList();
  onLangChange(() => { labelList(); renderLabel(); renderHotspots(); });

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const next = pickOrient();
      setHovered(null);
      if (next === orient) { renderHotspots(); return; }
      orient = next;
      prefetched.clear();
      if (mode !== 'intro') go(current);
    }, 120);
  });

  /* ---------- Intro: the 3D assembly as a clip, first visit only ---------- */
  let introDone = null;
  function skipIntro() {
    if (mode !== 'intro') return;
    introDone?.();
  }
  $('#skip-btn').addEventListener('click', skipIntro);
  async function playIntro() {
    const url = await within(loadClip('intro', (f) => progress.at(0.3 + f * 0.6)), 12000);
    if (!url) return false;
    video.src = url;
    try { await video.play(); } catch { return false; }
    video.pause();
    video.currentTime = 0;
    return true;
  }

  const wantIntro = motion && !store.get(INTRO_KEY) && manifest.intro;
  const introReady = wantIntro ? await playIntro() : false;
  current = 'overview';
  const firstStill = setStill('overview', true);
  if (!introReady) await firstStill;
  progress.at(0.96);
  await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]);
  await progress.finish();
  progress.stop();
  const loader = $('#loader');
  loader.classList.add('is-leaving');
  setTimeout(() => loader.remove(), 700);

  if (introReady) {
    mode = 'intro';
    video.classList.remove('is-fade');
    video.classList.add('is-playing');
    stage.classList.add('is-busy');
    video.ontimeupdate = () => { if (video.currentTime >= manifest.intro.uiAt) body.classList.remove('is-intro'); };
    video.play().catch(() => introDone?.());
    await new Promise((r) => { introDone = r; video.onended = r; video.onerror = r; });
    video.ontimeupdate = null;
    await firstStill;
    hideVideo(true);
    mode = 'overview';
    store.set(INTRO_KEY, '1');
    stage.classList.remove('is-busy');
  }
  body.classList.remove('is-intro');
  renderHotspots();
  // The walls are one click away: fetch them while the visitor reads the hero
  setTimeout(() => {
    prefetch('wall-langai'); prefetch('wall-durys');
    prefetchClip('wall-in-langai'); prefetchClip('wall-in-durys');
  }, 1200);
}
