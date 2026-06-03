const fs = require('fs');
const path = require('path');

const root = path.join(process.cwd(), 'public', 'assets');
const registryPath = path.join(process.cwd(), 'src', 'data', 'assetRegistry.ts');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (entry.name === '.gitkeep') return [];
    return ['/' + path.relative(path.join(process.cwd(), 'public'), fullPath).replace(/\\/g, '/')];
  });
}

const files = walk(root).sort();
const registry = fs.readFileSync(registryPath, 'utf8');
const registrySrcs = Array.from(registry.matchAll(/'((?:\/assets\/)[^']+)'/g)).map((match) => match[1]);
const legacyPathKeys = new Set(
  Array.from(registry.matchAll(/'((?:\/assets\/)[^']+)':/g)).map((match) => match[1]),
);
const eventSrcOverrides = Object.fromEntries(
  Array.from(
    registry.matchAll(/'([^']+)':\s*'([^']+)'/g),
    (match) => [match[1], match[2]],
  ).filter(([id, src]) => id.startsWith('event-') && src.startsWith('/assets/events/')),
);
const generatedEventSrcs = Array.from(
  registry.matchAll(/(\w+):\s*makeEventAssets\('([^']+)',\s*\[([\s\S]*?)\]\)/g),
).flatMap(([, , category, idBlock]) => (
  Array.from(idBlock.matchAll(/'([^']+)'/g), (match) => {
    const id = match[1];
    return eventSrcOverrides[id] ?? `/assets/events/${category}/${id}.png`;
  })
));
const registeredSrcs = new Set([...registrySrcs, ...generatedEventSrcs]);
const missing = files.filter((file) => !registeredSrcs.has(file));
const missingFiles = registrySrcs
  .concat(generatedEventSrcs)
  .filter((src) => src.startsWith('/assets/'))
  .filter((src) => !legacyPathKeys.has(src))
  .filter((src) => !fs.existsSync(path.join(process.cwd(), 'public', src.replace(/^\//, ''))));

console.log(JSON.stringify({
  totalFiles: files.length,
  unregisteredCount: missing.length,
  unregistered: missing,
  missingRegisteredFilesCount: missingFiles.length,
  missingRegisteredFiles: missingFiles,
}, null, 2));
