// Builds the "Mūsų darbai" gallery from the photos in gallery/ (see gallery/README.md).
//
//   node tools/gallery.mjs --out _site/gallery    (the Pages workflow does this on every push)
//   node tools/gallery.mjs                        (dry run: lists what it would publish)
//
// With --out: each photo is resized to at most 1920 px (and a 360 px thumbnail) as WebP using
// ImageMagick or ffmpeg, whichever is installed (otherwise copied as is), and gallery.json is
// written next to them. js/works.js reads gallery.json; locally it reads the folder listing instead.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'); // the site root
const SRC = join(ROOT, 'gallery');
const outArg = process.argv.indexOf('--out');
const OUT = outArg > 0 ? resolve(process.argv[outArg + 1]) : null;
const IMAGE = /\.(jpe?g|png|webp)$/i;
const SIZE = { full: 1920, thumb: 360 };

const info = existsSync(join(SRC, 'info.json')) ? JSON.parse(readFileSync(join(SRC, 'info.json'), 'utf8')) : {};
const collator = new Intl.Collator('lt', { numeric: true });

// "03-terasos-durys.jpg" → "Terasos durys"
const niceName = (file) => {
  const s = file.replace(extname(file), '').replace(/^\d+[-_ .]*/, '').replace(/[-_]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Photos straight in gallery/ first, then each subfolder (its name is the tag); info.json can
// order the folders with "_folders": ["langai", "durys"].
function collect() {
  const items = [];
  const add = (rel, tag) => {
    const meta = info[rel] || {};
    const title = meta.title || niceName(posix.basename(rel));
    items.push({
      file: rel, tag,
      title: { lt: title, en: meta.en?.title || title },
      text: { lt: meta.text || '', en: meta.en?.text || meta.text || '' },
    });
  };
  const entries = readdirSync(SRC).sort(collator.compare);
  entries.filter((f) => IMAGE.test(f)).forEach((f) => add(f, null));
  const order = info._folders || [];
  const folders = entries.filter((f) => statSync(join(SRC, f)).isDirectory() && f !== 'thumbs')
    .sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99) || collator.compare(a, b));
  for (const dir of folders) {
    const tag = dir.charAt(0).toUpperCase() + dir.slice(1);
    readdirSync(join(SRC, dir)).filter((f) => IMAGE.test(f)).sort(collator.compare).forEach((f) => add(`${dir}/${f}`, tag));
  }
  return items;
}

const has = (cmd) => spawnSync(cmd, ['-version'], { stdio: 'ignore' }).status === 0;
const tool = ['magick', 'convert', 'ffmpeg'].find(has) || null;

function resize(src, dest, width) {
  mkdirSync(dirname(dest), { recursive: true });
  const args = tool === 'ffmpeg'
    ? ['-loglevel', 'error', '-y', '-i', src, '-vf', `scale='min(${width},iw)':-2`, '-c:v', 'libwebp', '-quality', '80', dest]
    : [src, '-auto-orient', '-resize', `${width}x${width}>`, '-quality', '80', dest];
  return spawnSync(tool, args, { stdio: 'inherit' }).status === 0;
}

const items = collect();
if (!OUT) {
  console.log(`${items.length} photos in gallery/ (dry run, nothing written):`);
  items.forEach((i) => console.log(`  ${i.file}  [${i.tag || '-'}]  ${i.title.lt}`));
  process.exit(0);
}

mkdirSync(OUT, { recursive: true });
console.log(`Gallery: ${items.length} photos, resizing with ${tool || 'nothing (copied as is)'}`);
const manifest = { generated: new Date().toISOString(), items: [] };
for (const it of items) {
  const src = join(SRC, it.file);
  const webp = it.file.replace(/\.[^.]+$/, '.webp');
  let full = webp, thumb = `thumbs/${webp}`;
  if (!tool || !resize(src, join(OUT, full), SIZE.full) || !resize(src, join(OUT, thumb), SIZE.thumb)) {
    full = thumb = it.file; // no image tool: publish the original
    mkdirSync(dirname(join(OUT, full)), { recursive: true });
    copyFileSync(src, join(OUT, full));
  }
  manifest.items.push({ src: full, thumb, tag: it.tag, title: it.title, text: it.text });
}
writeFileSync(join(OUT, 'gallery.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(`gallery.json written to ${OUT}`);
