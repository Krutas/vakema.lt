// Renders the stills and clips for the lite version from the real 3D showroom.
//
//   node tools/capture/render.mjs
//
// Serves the site on a local port, opens it in headless Chrome with ?capture=1 (see the capture
// block at the end of js/main.js), walks through every view and writes
// assets/lite/: <shot>-<l|p>.webp stills, video/<clip>-<l|p>.mp4 clips (H.264 via ffmpeg
// on PATH: intro, wall-in/-out, focus) and shots.json (hotspots as fractions of the image, intro
// timing). `--stills` skips the clips.
// No npm packages: Chrome DevTools Protocol over Node's built-in WebSocket (Node 22+).
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..'); // the site root
const OUT = join(ROOT, 'assets/lite');
const VIDEO = join(OUT, 'video');
const STILLS_ONLY = process.argv.includes('--stills');
const DEBUG_PORT = 9333;

// Landscape for desktops, portrait for phones; both above 700 px so the full-quality path renders.
const SIZES = { l: [1920, 1080], p: [900, 1600] };
const SHOTS = [
  ['overview', 'overview'],
  ['wall-langai', 'wall:Langai'],
  ['focus-tilt', 'focus:tilt'], ['focus-slide', 'focus:slide'], ['focus-fixed', 'focus:fixed'],
  ['wall-durys', 'wall:Durys'],
  ['focus-french', 'focus:french'], ['focus-patio', 'focus:patio'], ['focus-entry', 'focus:entry'],
];
const QUALITY = 0.84;
// Clips render at the still size and are scaled down: sharper than rendering small
const CLIPS = [
  ['wall-in-langai', 'wall:Langai', { reverse: 'wall-out-langai' }],
  ['wall-in-durys', 'wall:Durys', { reverse: 'wall-out-durys' }],
  ...['tilt', 'slide', 'fixed', 'french', 'patio', 'entry'].map((id) => [`focus-${id}`, `focus:${id}`, {}]),
];
const VIDEO_SIZE = { l: '1280:720', p: '720:1280' };
const CRF = { intro: 30, clip: 29 }; // foliage is costly: ~1.5 MB intro, ~300 kB clips

const CHROME = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find((p) => p && existsSync(p));
if (!CHROME) throw new Error('Chrome not found: set CHROME=/path/to/chrome');

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json' };
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  const file = join(ROOT, path || 'index.html');
  if (!file.startsWith(ROOT) || !existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const site = `http://127.0.0.1:${server.address().port}/`;

const profile = mkdtempSync(join(tmpdir(), 'vakema-capture-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
  '--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11', '--hide-scrollbars', '--mute-audio',
  '--no-first-run', '--no-default-browser-check', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function pageSocketUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('Chrome did not start');
}

const ws = new WebSocket(await pageSocketUrl());
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let seq = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  const p = pending.get(msg.id);
  if (!p) return;
  pending.delete(msg.id);
  msg.error ? p.j(new Error(msg.error.message)) : p.r(msg.result);
};
const send = (method, params = {}) => new Promise((r, j) => {
  const id = ++seq;
  pending.set(id, { r, j });
  ws.send(JSON.stringify({ id, method, params }));
});
async function evaluate(expression) {
  const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
  return res.result.value;
}

function encode(frames, out, { crf, size, reverse = false }) {
  const vf = `${reverse ? 'reverse,' : ''}scale=${size}:flags=lanczos`;
  const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', '30', '-i', join(frames, '%04d.jpg'),
    '-vf', vf, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', '-an', out], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg failed for ${out}`);
}
const kB = (file) => `${(readFileSync(file).length / 1024).toFixed(0)} kB`;

async function record(name, file, key, extra = {}) {
  const info = await evaluate(`window.__capture.clip(${JSON.stringify(name)})`);
  const frames = mkdtempSync(join(tmpdir(), 'vakema-frames-'));
  try {
    for (let i = 0; i < info.frames; i++) {
      const img = await evaluate('window.__capture.frame()');
      writeFileSync(join(frames, `${String(i).padStart(4, '0')}.jpg`), Buffer.from(img.split(',')[1], 'base64'));
    }
    const opts = { crf: name === 'intro' ? CRF.intro : CRF.clip, size: VIDEO_SIZE[key] };
    const out = join(VIDEO, `${file}-${key}.mp4`);
    encode(frames, out, opts);
    console.log(`video/${file}-${key}.mp4  ${kB(out)}  (${info.frames} frames)`);
    if (extra.reverse) {
      const back = join(VIDEO, `${extra.reverse}-${key}.mp4`);
      encode(frames, back, { ...opts, reverse: true });
      console.log(`video/${extra.reverse}-${key}.mp4  ${kB(back)}`);
    }
    return info;
  } finally {
    rmSync(frames, { recursive: true, force: true });
  }
}

try {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(VIDEO, { recursive: true });
  const manifest = { rendered: Date.now() }; // lite.js adds it to URLs: a re-render busts browser caches
  for (const [key, [w, h]] of Object.entries(SIZES)) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: `${site}?capture=1` });
    for (let i = 0; !(await evaluate('window.__captureReady === true').catch(() => false)); i++) {
      if (i > 600) throw new Error('Showroom did not open in capture mode');
      await sleep(200);
    }
    if (key === 'l') console.log('GPU:', await evaluate(`(() => { const gl = document.querySelector('#scene').getContext('webgl2'); const i = gl.getExtension('WEBGL_debug_renderer_info'); return i ? gl.getParameter(i.UNMASKED_RENDERER_WEBGL) : '?'; })()`));
    manifest[key] = { w, h, shots: {} };
    // The intro needs the untouched page, so it goes first
    if (!STILLS_ONLY) {
      const intro = await record('intro', 'intro', key);
      manifest.intro = { uiAt: intro.uiAt, duration: Math.round((intro.frames / 30) * 100) / 100 };
    }
    for (const [file, name] of SHOTS) {
      await evaluate(`window.__capture.shot(${JSON.stringify(name)})`);
      const { img, hotspots } = await evaluate(`({ img: window.__capture.grab('image/webp', ${QUALITY}), hotspots: window.__capture.hotspots() })`);
      const buf = Buffer.from(img.split(',')[1], 'base64');
      writeFileSync(join(OUT, `${file}-${key}.webp`), buf);
      if (!file.startsWith('focus-')) manifest[key].shots[file] = hotspots;
      console.log(`${file}-${key}.webp  ${(buf.length / 1024).toFixed(0)} kB`);
    }
    if (!STILLS_ONLY) for (const [file, name, extra] of CLIPS) await record(name, file, key, extra);
  }
  if (STILLS_ONLY && existsSync(join(OUT, 'shots.json'))) {
    manifest.intro = JSON.parse(readFileSync(join(OUT, 'shots.json'), 'utf8')).intro; // keep the clip timing
  }
  writeFileSync(join(OUT, 'shots.json'), JSON.stringify(manifest, null, 1) + '\n');
  console.log('shots.json written');
} finally {
  ws.close();
  chrome.kill();
  server.close();
  await sleep(500);
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may still hold files */ }
}
