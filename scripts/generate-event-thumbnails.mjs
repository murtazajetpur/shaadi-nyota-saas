import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';

const eventCategories = ['haldi', 'mehendi', 'sangeet', 'wedding', 'nikaah', 'reception', 'walima', 'generic'];
const sourceRoot = path.resolve('public/assets/events');
const thumbnailRoot = path.resolve('public/assets/thumbnails/events');
const force = process.argv.includes('--force');
const imagePattern = /\.(png|jpe?g|webp)$/i;
const registryPath = path.resolve('src/data/assetRegistry.ts');

if (!ffmpegPath) {
  throw new Error('ffmpeg-static did not provide a usable ffmpeg binary.');
}

const runFfmpeg = (inputPath, outputPath) => new Promise((resolve, reject) => {
  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    inputPath,
    '-vf',
    'scale=360:-2:force_original_aspect_ratio=decrease',
    '-frames:v',
    '1',
    '-c:v',
    'libwebp',
    '-quality',
    '76',
    '-compression_level',
    '4',
    outputPath,
  ];
  const child = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });
  child.on('error', reject);
  child.on('close', (code) => {
    if (code === 0) {
      resolve();
      return;
    }
    reject(new Error(stderr || `ffmpeg exited with code ${code}`));
  });
});

let generated = 0;
let skipped = 0;
let failed = 0;
const failures = [];

for (const category of eventCategories) {
  const sourceDir = path.join(sourceRoot, category);
  const outputDir = path.join(thumbnailRoot, category);
  await mkdir(outputDir, { recursive: true });

  if (!existsSync(sourceDir)) {
    skipped += 1;
    continue;
  }

  const entries = await readdir(sourceDir, { withFileTypes: true });
  const imageFiles = entries
    .filter((entry) => entry.isFile() && imagePattern.test(entry.name))
    .map((entry) => entry.name)
    .sort((first, second) => first.localeCompare(second));

  for (const filename of imageFiles) {
    const sourcePath = path.join(sourceDir, filename);
    const assetId = filename.replace(imagePattern, '');
    const outputPath = path.join(outputDir, `${assetId}.webp`);

    if (!force && existsSync(outputPath)) {
      skipped += 1;
      continue;
    }

    try {
      await runFfmpeg(sourcePath, outputPath);
      generated += 1;
    } catch (error) {
      failed += 1;
      failures.push(`${path.relative(process.cwd(), sourcePath)}: ${error.message}`);
    }
  }
}

const registrySource = await readFile(registryPath, 'utf8');
const mappedEventSrcs = Array.from(registrySource.matchAll(/'(event-[^']+)':\s*'\/assets\/events\/([^/]+)\/([^']+)'/g))
  .map((match) => ({
    id: match[1],
    category: match[2],
    sourcePath: path.join('public/assets/events', match[2], match[3]),
  }));

for (const mappedAsset of mappedEventSrcs) {
  const sourcePath = path.resolve(mappedAsset.sourcePath);
  const outputDir = path.join(thumbnailRoot, mappedAsset.category);
  const outputPath = path.join(outputDir, `${mappedAsset.id}.webp`);

  if (!existsSync(sourcePath)) {
    failed += 1;
    failures.push(`${mappedAsset.sourcePath}: mapped registry source file does not exist`);
    continue;
  }

  if (!force && existsSync(outputPath)) {
    skipped += 1;
    continue;
  }

  try {
    await runFfmpeg(sourcePath, outputPath);
    generated += 1;
  } catch (error) {
    failed += 1;
    failures.push(`${mappedAsset.sourcePath}: ${error.message}`);
  }
}

console.log(`Event thumbnails generated: ${generated}`);
console.log(`Event thumbnails skipped: ${skipped}`);
console.log(`Event thumbnail failures: ${failed}`);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
}
