const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const root = process.cwd();
const rows = JSON.parse(
  childProcess.execFileSync('node', ['scripts/print-asset-aspect-ratios.cjs'], {
    encoding: 'utf8',
  }),
)
  .filter((row) => row.width && row.height)
  .sort((a, b) => a.src.localeCompare(b.src));

const lines = [
  'export interface AssetAspectMetadata {',
  '  intrinsicWidth: number;',
  '  intrinsicHeight: number;',
  '  aspectRatio: string;',
  '}',
  '',
  'export const assetAspectMetadataBySrc: Record<string, AssetAspectMetadata> = {',
];

for (const row of rows) {
  lines.push(
    `  ${JSON.stringify(row.src)}: { intrinsicWidth: ${row.width}, intrinsicHeight: ${row.height}, aspectRatio: ${JSON.stringify(row.aspectRatio)} },`,
  );
}

lines.push('};', '');

fs.writeFileSync(path.join(root, 'src/data/assetAspectRatios.ts'), lines.join('\n'));
console.log(`Wrote ${rows.length} asset aspect metadata entries.`);
