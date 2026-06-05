# Performance Notes

## Phase 3 Mobile Asset Pass

- Global invite media preloads were removed from `index.html` so marketing, auth, dashboard, and admin routes do not download the default invite poster/video.
- Invite media should be loaded by the invite experience itself, where the active opening animation and reveal assets are known.
- Registry assets now support `thumbnailSrc`, `optimizedSrc`, `width`, and `height` metadata. Current entries fall back to `src` until generated thumbnails or optimized variants are added.
- Event Visual picker cards read `thumbnailSrc` when available, while saved selections continue to use the original asset `src`/asset id.
- Dashboard image grids and non-critical public section images use lazy loading and async decoding where safe.
- Critical reveal images remain eager/non-lazy to avoid delayed reveal flashes after the opening video.
- Theme 2 audio uses `preload="metadata"` instead of preloading the full audio file before interaction.

## Phase 4 Event Thumbnails

- Event picker thumbnails are stored under `public/assets/thumbnails/events/{category}/`.
- Generated thumbnails are WebP files at roughly 360px wide, preserving each source image's aspect ratio.
- `assetRegistry.ts` keeps each event asset `src` pointed at the original full-size image and sets `thumbnailSrc` to the generated WebP thumbnail.
- Dashboard Event Visual cards load `thumbnailSrc`; selected event visuals and public invites continue using the original `src`.
- If a thumbnail is missing, the Event Visual card falls back to the original event image.
- Use `npm.cmd run generate:event-thumbnails` to generate missing thumbnails, or `npm.cmd run generate:event-thumbnails -- --force` to refresh existing thumbnails.
- New event asset batches should include thumbnail generation before they are considered picker-ready.

## Upload Guardrails

- Closing Gallery uploads accept JPG, PNG, and WebP only.
- Closing Gallery uploads are limited to 5 MB per image.
- Uploaded files keep unique timestamped Supabase Storage paths under the wedding-specific folder.
- Client-side resizing/compression is not implemented yet.

## Future Asset Work

- Generate optimized WebP/AVIF variants for large public assets and set `optimizedSrc` where renderers can safely consume them.
- Keep old public asset paths available until saved Supabase rows have been migrated or compatibility mapping is no longer needed.
- Avoid long immutable cache headers for non-hashed public assets. Uploaded assets should continue using unique filenames/paths when content changes.
