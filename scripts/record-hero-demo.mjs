import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import ffmpegPath from 'ffmpeg-static';

const [, , inputArg, maybeForce] = process.argv;
const force = maybeForce === '--force';

const outputDir = resolve('public/assets/marketing');
const outputBase = 'shaadi-nyota-hero-demo';
const webmOutput = resolve(outputDir, `${outputBase}.webm`);
const mp4Output = resolve(outputDir, `${outputBase}.mp4`);
const posterOutput = resolve(outputDir, `${outputBase}-poster.png`);

if (!ffmpegPath) {
  throw new Error('ffmpeg-static did not provide a usable ffmpeg binary.');
}

if (!inputArg) {
  console.log([
    'Usage:',
    '  node scripts/record-hero-demo.mjs <path-to-manual-screen-recording> [--force]',
    '',
    'Recommended manual capture:',
    '  1. Run npm.cmd run dev',
    '  2. Open http://127.0.0.1:5173/templates/palace-door-opening',
    '  3. Set viewport near 390x844 or 432x960',
    '  4. Record 15-25 seconds from opening reveal through closing gallery',
    '  5. Save that recording locally and pass it to this script',
    '',
    'Outputs:',
    `  ${webmOutput}`,
    `  ${mp4Output}`,
    `  ${posterOutput}`,
  ].join('\n'));
  process.exit(0);
}

const inputPath = resolve(inputArg);

if (!existsSync(inputPath)) {
  throw new Error(`Input recording not found: ${inputPath}`);
}

mkdirSync(outputDir, { recursive: true });

const ensureCanWrite = (path) => {
  if (!force && existsSync(path)) {
    throw new Error(`Refusing to overwrite existing file without --force: ${path}`);
  }
};

ensureCanWrite(webmOutput);
ensureCanWrite(mp4Output);
ensureCanWrite(posterOutput);

const runFfmpeg = (args, label) => new Promise((resolvePromise, reject) => {
  const child = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  child.on('error', reject);
  child.on('close', (code) => {
    if (code === 0) {
      resolvePromise();
      return;
    }

    reject(new Error(`${label} failed with code ${code}\n${stderr}`));
  });
});

const commonVideoFilter = 'scale=432:-2:flags=lanczos,fps=30';

await runFfmpeg([
  '-y',
  '-i', inputPath,
  '-an',
  '-vf', commonVideoFilter,
  '-t', '25',
  '-c:v', 'libvpx-vp9',
  '-b:v', '0',
  '-crf', '36',
  '-row-mt', '1',
  webmOutput,
], 'WebM export');

await runFfmpeg([
  '-y',
  '-i', inputPath,
  '-an',
  '-vf', commonVideoFilter,
  '-t', '25',
  '-c:v', 'libx264',
  '-profile:v', 'main',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  '-crf', '28',
  mp4Output,
], 'MP4 export');

await runFfmpeg([
  '-y',
  '-ss', '1',
  '-i', inputPath,
  '-frames:v', '1',
  '-vf', 'scale=432:-2:flags=lanczos',
  posterOutput,
], 'Poster export');

console.log([
  'Hero demo assets generated.',
  `Input: ${basename(inputPath)}`,
  `WebM: ${webmOutput}`,
  `MP4: ${mp4Output}`,
  `Poster: ${posterOutput}`,
  `Source extension: ${extname(inputPath) || 'unknown'}`,
].join('\n'));
