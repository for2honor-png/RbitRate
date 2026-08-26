/**
 * Generates assets/icon.ico from assets/icon.png using sharp.
 * Run: npm run generate-icons
 *
 * Place a 1024x1024 PNG at desktop/assets/icon.png first.
 * The script produces a multi-size ICO file (16, 32, 48, 64, 128, 256).
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '../assets');
const src = path.join(assetsDir, 'icon.png');
const dst = path.join(assetsDir, 'icon.ico');

if (!fs.existsSync(src)) {
  console.error('ERROR: Place a 1024x1024 PNG at desktop/assets/icon.png first.');
  process.exit(1);
}

const SIZES = [16, 32, 48, 64, 128, 256];

async function buildIco() {
  // Build each size as raw RGBA buffer
  const frames = await Promise.all(
    SIZES.map(size =>
      sharp(src)
        .resize(size, size)
        .raw()
        .toBuffer({ resolveWithObject: true })
        .then(({ data, info }) => ({ data, size, info }))
    )
  );

  // Write a minimal ICO file
  // ICO format: ICONDIR + ICONDIRENTRY[] + image data[]
  const count = frames.length;
  const ICONDIR_SIZE = 6;
  const ENTRY_SIZE   = 16;
  const headerSize   = ICONDIR_SIZE + ENTRY_SIZE * count;

  // Calculate PNG buffers (use PNG format for each frame – ICO supports embedded PNGs for 256+)
  const pngBuffers = await Promise.all(
    SIZES.map(size =>
      sharp(src).resize(size, size).png().toBuffer()
    )
  );

  let offset = headerSize;
  const header = Buffer.alloc(ICONDIR_SIZE);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = 1 (ICO)
  header.writeUInt16LE(count, 4);

  const entries = Buffer.alloc(ENTRY_SIZE * count);
  pngBuffers.forEach((buf, i) => {
    const s = SIZES[i];
    const e = entries.subarray(i * ENTRY_SIZE);
    e.writeUInt8(s >= 256 ? 0 : s, 0);  // width  (0 = 256)
    e.writeUInt8(s >= 256 ? 0 : s, 1);  // height (0 = 256)
    e.writeUInt8(0, 2);                  // color count
    e.writeUInt8(0, 3);                  // reserved
    e.writeUInt16LE(1, 4);              // planes
    e.writeUInt16LE(32, 6);             // bit count
    e.writeUInt32LE(buf.length, 8);     // size of image data
    e.writeUInt32LE(offset, 12);        // offset of image data
    offset += buf.length;
  });

  const chunks = [header, entries, ...pngBuffers];
  fs.writeFileSync(dst, Buffer.concat(chunks));
  console.log(`✓ Written ${dst} (${SIZES.join(', ')}px)`);
}

buildIco().catch(e => { console.error(e.message); process.exit(1); });
