// Procedural textures drawn on canvases (no image files): oak floor, plaster, fabric,
// leaf sprigs and bark. Layered smooth noise is made by upscaling small random grids.
import * as THREE from 'three';

function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Smooth grey noise: random cells of decreasing size, upscaled with smoothing and layered.
function noiseCanvas(size, seed, octaves = [8, 16, 32, 64, 128], base = 128) {
  const r = rng(seed);
  const out = canvas(size);
  const x = out.getContext('2d');
  x.fillStyle = `rgb(${base},${base},${base})`;
  x.fillRect(0, 0, size, size);
  octaves.forEach((cells, i) => {
    const small = canvas(cells);
    const sx = small.getContext('2d');
    const img = sx.createImageData(cells, cells);
    for (let p = 0; p < cells * cells; p++) {
      const v = (r() * 255) | 0;
      img.data.set([v, v, v, 255], p * 4);
    }
    sx.putImageData(img, 0, 0);
    x.globalAlpha = 0.5 / (i + 1);
    x.imageSmoothingEnabled = true;
    // draw 3x3 so the upscaled noise tiles seamlessly
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) x.drawImage(small, ox, oy, size, size);
  });
  x.globalAlpha = 1;
  return out;
}

function texture(c, repeat = [1, 1], color = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Wide light-oak planks. One tile = 1.6 m × 1.6 m (8 planks of 20 cm). */
export function oakFloor() {
  const S = 1024, planks = 8, pw = S / planks;
  const r = rng(11);
  const col = canvas(S), rough = canvas(S);
  const c = col.getContext('2d'), g = rough.getContext('2d');
  g.fillStyle = '#9a9a9a';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < planks; i++) {
    // each column holds two or three boards of random length
    let y = -r() * S;
    while (y < S) {
      const len = S * (0.45 + r() * 0.5);
      const l = 58 + r() * 9, h = 30 + r() * 6, sat = 34 + r() * 10;
      c.fillStyle = `hsl(${h}, ${sat}%, ${l}%)`;
      for (const oy of [0, S]) c.fillRect(i * pw, y - oy, pw, len);
      // grain: wavy lengthwise strokes
      for (let k = 0; k < 46; k++) {
        const gx = i * pw + r() * pw, amp = 1 + r() * 3, f = 0.004 + r() * 0.01, ph = r() * 6;
        c.strokeStyle = `hsla(${h - 4}, ${sat + 10}%, ${l - 14 - r() * 12}%, ${0.08 + r() * 0.16})`;
        c.lineWidth = 0.6 + r() * 1.6;
        c.beginPath();
        for (let yy = 0; yy <= len; yy += 8) {
          const px = gx + Math.sin(yy * f + ph) * amp;
          yy ? c.lineTo(px, y + yy) : c.moveTo(px, y + yy);
        }
        c.stroke();
      }
      if (r() < 0.35) { // knot
        const kx = i * pw + pw * (0.25 + r() * 0.5), ky = y + len * r();
        c.fillStyle = `hsla(${h - 6}, 40%, ${l - 28}%, .55)`;
        c.beginPath();
        c.ellipse(kx, ky, 3 + r() * 4, 6 + r() * 8, 0, 0, Math.PI * 2);
        c.fill();
      }
      // board end joint
      c.fillStyle = 'rgba(40, 26, 14, .55)';
      c.fillRect(i * pw, (y + len) % S, pw, 2);
      const rv = (130 + r() * 50) | 0;
      g.fillStyle = `rgb(${rv},${rv},${rv})`;
      g.fillRect(i * pw, y, pw, len);
      y += len;
    }
    c.fillStyle = 'rgba(35, 22, 12, .6)';
    c.fillRect(i * pw, 0, 2, S);
    g.fillStyle = '#ffffff';
    g.fillRect(i * pw, 0, 2, S);
  }
  return { map: texture(col, [1 / 1.6, 1 / 1.6]), roughnessMap: texture(rough, [1 / 1.6, 1 / 1.6], false) };
}

/** Microcement / plaster: soft mottling for bump + roughness. 1 tile ≈ 3 m. */
export function plaster(seed = 5) {
  return texture(noiseCanvas(512, seed, [6, 12, 24, 64, 160]), [1 / 3, 1 / 3], false);
}

/** Woven upholstery bump. */
export function fabric() {
  const S = 128, c = canvas(S), x = c.getContext('2d');
  const r = rng(9);
  x.fillStyle = '#808080';
  x.fillRect(0, 0, S, S);
  for (let i = 0; i < S; i += 4) {
    x.fillStyle = `rgba(255,255,255,${0.12 + r() * 0.1})`;
    x.fillRect(0, i, S, 2);
    x.fillStyle = `rgba(0,0,0,${0.12 + r() * 0.1})`;
    x.fillRect(i, 0, 2, S);
  }
  const n = noiseCanvas(S, 3, [16, 64]);
  x.globalAlpha = 0.35;
  x.drawImage(n, 0, 0);
  return texture(c, [6, 6], false);
}

/** A sprig of leaves on transparency, for foliage cards. */
export function leafSprig(seed = 21) {
  const S = 256, c = canvas(S), x = c.getContext('2d');
  const r = rng(seed);
  x.strokeStyle = '#4a3a22';
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(S / 2, S);
  x.quadraticCurveTo(S * 0.45, S * 0.5, S * 0.52, S * 0.08);
  x.stroke();
  for (let i = 0; i < 9; i++) {
    const t = 0.15 + i * 0.09;
    const bx = S * (0.5 - 0.03 * t), by = S * (1 - t * 0.95);
    const side = i % 2 ? 1 : -1;
    const len = S * (0.2 + r() * 0.08), wid = len * 0.42;
    const ang = side * (0.6 + r() * 0.5) - Math.PI / 2;
    x.save();
    x.translate(bx, by);
    x.rotate(ang + Math.PI / 2);
    const grad = x.createLinearGradient(0, 0, 0, -len);
    const l = 30 + r() * 14;
    grad.addColorStop(0, `hsl(${95 + r() * 20}, 45%, ${l - 8}%)`);
    grad.addColorStop(1, `hsl(${85 + r() * 20}, 50%, ${l + 8}%)`);
    x.fillStyle = grad;
    x.beginPath();
    x.moveTo(0, 0);
    x.quadraticCurveTo(wid, -len * 0.45, 0, -len);
    x.quadraticCurveTo(-wid, -len * 0.45, 0, 0);
    x.fill();
    x.strokeStyle = 'rgba(220, 240, 180, .25)';
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(0, 0);
    x.lineTo(0, -len * 0.92);
    x.stroke();
    x.restore();
  }
  const t = texture(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Vertical bark streaks. */
export function bark() {
  const S = 128, c = canvas(S), x = c.getContext('2d');
  const r = rng(4);
  x.fillStyle = '#5a4838';
  x.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    x.fillStyle = `rgba(${r() < 0.5 ? '25,18,12' : '140,120,100'},${0.15 + r() * 0.25})`;
    x.fillRect(r() * S, r() * S - 20, 1 + r() * 3, 20 + r() * 60);
  }
  return texture(c, [2, 3]);
}

/** Give a BoxGeometry UVs in metres, so tiled textures keep their scale on any size. */
export function worldBox(w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; // px nx py ny pz nz
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]);
    }
  }
  return geo;
}
