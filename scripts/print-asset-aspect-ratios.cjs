const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const root = process.cwd();
const registryPath = path.join(root, 'src/data/assetRegistry.ts');
const text = fs.readFileSync(registryPath, 'utf8');
const assetPaths = [...text.matchAll(/(?:src|videoSrc|tallVideoSrc|posterSrc|previewSrc):\s*['"]([^'"]+)['"]/g)]
  .map((match) => match[1])
  .filter((src) => src.startsWith('/assets/'));
const uniquePaths = [...new Set(assetPaths)].sort();

const gcd = (a, b) => {
  while (b) {
    const next = b;
    b = a % b;
    a = next;
  }
  return a;
};

const readPng = (buffer) => {
  if (buffer.toString('ascii', 1, 4) !== 'PNG') return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
};

const readJpeg = (buffer) => {
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return null;
};

const readVideo = (filePath) => {
  try {
    const output = childProcess.execFileSync(
      'ffprobe',
      ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', filePath],
      { encoding: 'utf8' },
    ).trim();
    const [width, height] = output.split(',').map((value) => Number(value));
    if (!width || !height) return null;
    return { width, height };
  } catch {
    return null;
  }
};

const findAssetImages = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findAssetImages(full);
    const ext = path.extname(entry.name).toLowerCase();
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) return [];
    return `/${path.relative(path.join(root, 'public'), full).replace(/\\/g, '/')}`;
  });
};

const pathsToMeasure = [...new Set([...uniquePaths, ...findAssetImages(path.join(root, 'public/assets/events'))])].sort();

const rows = pathsToMeasure.map((src) => {
  const filePath = path.join(root, 'public', src.replace(/^\//, ''));
  const ext = path.extname(filePath).toLowerCase();
  const row = { src, ext, exists: fs.existsSync(filePath) };
  if (!row.exists || !['.png', '.jpg', '.jpeg', '.mp4'].includes(ext)) return row;

  const dimensions = ext === '.mp4'
    ? readVideo(filePath)
    : ext === '.png'
      ? readPng(fs.readFileSync(filePath))
      : readJpeg(fs.readFileSync(filePath));
  if (!dimensions) return row;
  const divisor = gcd(dimensions.width, dimensions.height);
  return {
    ...row,
    width: dimensions.width,
    height: dimensions.height,
    aspectRatio: `${dimensions.width / divisor}:${dimensions.height / divisor}`,
  };
});

console.log(JSON.stringify(rows, null, 2));
