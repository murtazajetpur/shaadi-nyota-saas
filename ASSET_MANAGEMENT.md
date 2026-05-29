# Asset Management

## Current Strategy

Shaadi Nyota has a centralized asset registry at:

```text
src/data/assetRegistry.ts
```

The registry is now section-first and category-first. Assets are reusable library items, not theme-locked items.

Themes are presets/defaults. A theme can define which assets a new wedding starts with, but after creation a couple/admin should be able to mix section assets across styles.

Example combinations should be valid:

- Envelope Opening reveal with Scroll Opening Invite event visuals
- Scroll reveal with classic closing frame assets
- Future theme event art with the current Theme 1 invite shell

## Registry Model

The registry has two main layers:

- `sections`: the reusable asset library
- `themeDefaults`: the default asset ids for each runtime theme key

Current sections:

- `openingReveal.animations`
- `openingReveal.posters`
- `openingReveal.revealedImages`
- `ourStory.images`
- `ourStory.backgrounds`
- `events.haldi`
- `events.mehendi`
- `events.sangeet`
- `events.wedding`
- `events.nikaah`
- `events.reception`
- `events.walima`
- `events.generic`
- `closingGallery.backgrounds`
- `closingGallery.frames`
- `closingGallery.presetPhotos`
- `audio`

Each asset can include:

- `id`
- `label`
- `src`
- `section`
- `category`
- `style`
- `sourceTheme`
- `recommendedForThemes`
- `compatibleThemes`
- `type`
- `tags`
- `previewSrc`
- `intrinsicWidth`
- `intrinsicHeight`
- `aspectRatio`

`sourceTheme` is informational. It should not restrict selection.

## Aspect Ratio Metadata

Current image/video dimensions are captured in:

```text
src/data/assetAspectRatios.ts
```

`src/data/assetRegistry.ts` merges this metadata into registry assets through `baseAsset`, so pickers and future layout logic can read the original asset shape without guessing.

The current metadata records the existing asset dimensions only. Future 9:20 versions should be added as separate registry entries beside the current assets, rather than replacing these paths.

To refresh the generated metadata after adding or replacing local assets, run:

```text
node scripts/update-asset-aspect-metadata.cjs
```

## 9:16 Normalization Pilot

Haldi event assets have been prepared as the first review batch:

- Existing compatibility filenames remain in place.
- Current-ratio archive copies were added with `-current-{width}x{height}` in the filename.
- New normalized review files were added with `-9x16` in the filename.
- Regenerated taller mobile review files were added with `-regenerated-9x20` in the filename. These are recomposed from the reference images for 9:20 instead of cropped from the old artwork.
- The Haldi registry entries still use the same event visual ids, but now point to the normalized `-9x16` files.

If this review batch is approved, the same pattern can be applied to the remaining event categories.

## Theme Defaults

Theme defaults are stored separately under `themeDefaults`.

Current runtime theme keys:

- `palace-door-opening`
- `theme-2`

These defaults are intended to initialize a wedding when a theme is selected. They should not prevent later cross-style asset selection.

## Current Runtime Asset Root

Phase 2 has copied current runtime assets into the new section-first folder structure. No old files have been moved, renamed, or deleted.

`public/assets` still contains active runtime paths and legacy/unclear files. Treat this folder as compatibility-sensitive until old Supabase paths are migrated.

Existing Supabase rows may still store paths like:

- `/assets/hero-v1.mp4`
- `/assets/hero-poster-v1.jpeg`
- `/assets/theme-2/main-hero-video.mp4`
- `/assets/theme-2/first-section.png`

Those paths must remain supported until a later data migration is planned and tested.

User uploads should not be added to `public/assets`. Uploaded wedding media should go to Supabase Storage. Closing Gallery uploads currently use the `wedding-assets` bucket.

## Phase 3 Registry Path Migration

Phase 3 updated `src/data/assetRegistry.ts` so registry asset `src`, `videoSrc`, `posterSrc`, and preset values now point to the copied section-first paths. Old files remain untouched, and Supabase data has not been migrated.

`legacyAssetPathMap` maps known old paths to their new section-first paths. `resolveAssetPath(path)` preserves empty values, uploaded `http://` and `https://` URLs, and Supabase Storage public URLs, while translating known legacy paths where that helper is used.

Some public renderers, CSS `url()` references, sample data, and `src/data/eventVisuals.ts` may still contain hardcoded legacy paths. Those continue to work because old files remain in place. They should be cleaned up in a later, narrower phase after public invite smoke testing.

| Old Path | New Path | Used For | Compatibility Notes |
| --- | --- | --- | --- |
| `/assets/hero-v1.mp4` | `/assets/opening-reveal/envelope/videos/opening-envelope-video.mp4` | Envelope opening video | Mapped by `legacyAssetPathMap` |
| `/assets/hero-poster-v1.jpeg` | `/assets/opening-reveal/envelope/posters/opening-envelope-poster.jpeg` | Envelope opening poster | Mapped by `legacyAssetPathMap` |
| `/assets/Ganesha Image.png` | `/assets/opening-reveal/envelope/revealed-images/revealed-ganesha-classic-01.png` | Classic revealed blessing image | Mapped by `legacyAssetPathMap` |
| `/assets/theme-2/main-hero-video.mp4` | `/assets/opening-reveal/scroll/videos/opening-scroll-video.mp4` | Scroll opening video | Mapped by `legacyAssetPathMap` |
| `/assets/theme-2/hero-poster.png` | `/assets/opening-reveal/scroll/posters/opening-scroll-poster.png` | Scroll opening poster | Mapped by `legacyAssetPathMap` |
| `/assets/theme-2/first-section.png` | `/assets/opening-reveal/scroll/revealed-images/revealed-couple-scroll-01.png` | Scroll revealed image and legacy couple image | Mapped by `legacyAssetPathMap`; Our Story registry also has a section-first copy |
| `/assets/second section old.png` | `/assets/our-story/images/story-pheras-01.png` | Legacy Our Story image | Mapped into the shared Our Story portrait library |
| `/assets/theme-2/story-bg.png` | `/assets/theme-2/story-bg.png` | Scroll renderer background | Kept on its legacy renderer path; it is not a selectable Our Story image |
| `/assets/theme-2/background.png` | `/assets/theme-2/background.png` | Shared scroll fallback/background | Intentionally maps to itself because the same old path is used in several contexts |
| `/assets/haldi.png` | `/assets/events/haldi/event-haldi-classic-foreground-01.png` | Classic Haldi foreground | Mapped by `legacyAssetPathMap` |
| `/assets/haldi-bg.png` | `/assets/events/haldi/event-haldi-classic-bg-01.png` | Classic Haldi background | Mapped by `legacyAssetPathMap` |
| `/assets/mehendi.png` | `/assets/events/mehendi/event-mehendi-classic-foreground-01.png` | Classic Mehendi foreground | Mapped by `legacyAssetPathMap` |
| `/assets/mehendi-bg.png` | `/assets/events/mehendi/event-mehendi-classic-bg-01.png` | Classic Mehendi background | Mapped by `legacyAssetPathMap` |
| `/assets/sangeet.png` | `/assets/events/sangeet/event-sangeet-classic-foreground-01.png` | Classic Sangeet foreground | Mapped by `legacyAssetPathMap` |
| `/assets/sangeet-bg.png` | `/assets/events/sangeet/event-sangeet-classic-bg-01.png` | Classic Sangeet background | Mapped by `legacyAssetPathMap` |
| `/assets/wedding.png` | `/assets/events/wedding/event-wedding-classic-foreground-01.png` | Classic Wedding foreground | Mapped by `legacyAssetPathMap` |
| `/assets/wedding-bg.png` | `/assets/events/wedding/event-wedding-classic-bg-01.png` | Classic Wedding background | Mapped by `legacyAssetPathMap` |
| `/assets/reception.png` | `/assets/events/reception/event-reception-classic-foreground-01.png` | Classic Reception foreground | Mapped by `legacyAssetPathMap` |
| `/assets/reception-bg.png` | `/assets/events/reception/event-reception-classic-bg-01.png` | Classic Reception background | Mapped by `legacyAssetPathMap` |
| `/assets/event-gap-bg.png` | `/assets/events/generic/event-gap-bg-classic-01.png` | Classic generic event background | Mapped by `legacyAssetPathMap` |
| `/assets/theme-2/haldi.png` | `/assets/events/haldi/event-haldi-scroll-01.png` | Scroll Haldi visual | Mapped by `legacyAssetPathMap` |
| `/assets/theme-2/mehendi.png` | `/assets/events/mehendi/event-mehendi-scroll-01.png` | Scroll Mehendi visual | Mapped by `legacyAssetPathMap` |
| `/assets/theme-2/sangeet.png` | `/assets/events/sangeet/event-sangeet-scroll-01.png` | Scroll Sangeet visual | Mapped by `legacyAssetPathMap` |
| `/assets/theme-2/shaadi.png` | `/assets/events/wedding/event-wedding-scroll-01.png` | Scroll Wedding visual | Mapped by `legacyAssetPathMap` |
| `/assets/theme-2/reception.png` | `/assets/events/reception/event-reception-scroll-01.png` | Scroll Reception visual | Mapped by `legacyAssetPathMap` |
| `/assets/heart-frame.png` | `/assets/closing-gallery/frames/closing-frame-heart-classic-01.png` | Classic closing frame | Mapped by `legacyAssetPathMap` |
| `/assets/carousel1.png` | `/assets/closing-gallery/preset-photos/closing-photo-preset-01.png` | Closing preset photo | Mapped by `legacyAssetPathMap` |
| `/assets/carousel2.png` | `/assets/closing-gallery/preset-photos/closing-photo-preset-02.png` | Closing preset photo | Mapped by `legacyAssetPathMap` |
| `/assets/carousel3.png` | `/assets/closing-gallery/preset-photos/closing-photo-preset-03.png` | Closing preset photo | Mapped by `legacyAssetPathMap` |
| `/assets/theme-2/carousel1.png` | `/assets/closing-gallery/preset-photos/closing-photo-preset-01.png` | Duplicate scroll closing preset | Mapped to shared copied preset |
| `/assets/theme-2/carousel2.png` | `/assets/closing-gallery/preset-photos/closing-photo-preset-02.png` | Duplicate scroll closing preset | Mapped to shared copied preset |
| `/assets/theme-2/carousel3.png` | `/assets/closing-gallery/preset-photos/closing-photo-preset-03.png` | Duplicate scroll closing preset | Mapped to shared copied preset |
| `/assets/din-shangda-audio.mp3` | `/assets/audio/wedding-songs/music-din-shagna-da.mp3` | Wedding audio | Mapped by `legacyAssetPathMap` |
| `/assets/theme-2/din-shangda-audio.mp3` | `/assets/audio/wedding-songs/music-din-shagna-da.mp3` | Duplicate scroll wedding audio | Mapped to shared copied audio |

## New Event Asset Batch

A batch of 65 newly created event images was copied from:

```text
public/newly created/
```

into the section-first event folders:

```text
public/assets/events/{category}/
```

Original source files were left untouched. No old files were removed, no Supabase data was migrated, and existing legacy paths remain supported.

Copied counts:

- Haldi: 7
- Mehendi: 6
- Sangeet: 11
- Wedding: 16
- Reception: 14
- Generic: 11

The copied files use lowercase kebab-case names such as:

- `event-haldi-premium-01.png`
- `event-mehendi-sketch-02.png`
- `event-sangeet-faceless-01.png`
- `event-wedding-generic-09.png`
- `event-reception-generic-10.png`
- `event-generic-generic-11.png`

The original upload/source folder was later archived from `public/newly created/` to:

```text
public/newly-created-event-source/
```

Those source files were also renamed to the same clean kebab-case filenames. They are retained only as source/archive copies; the canonical runtime assets live under `public/assets/events/{category}/`.

`src/data/assetRegistry.ts` includes these images under `sections.events` with:

- `sourceTheme: "newly-created"`
- `compatibleThemes: ["palace-door-opening", "theme-2"]`
- category/style tags for future filtering

The current Event Visual picker may still use `src/data/eventVisuals.ts` for some runtime-safe Theme 2 behavior. A later pass should merge picker data with the section-first registry so all newly created assets appear in the picker.

Update: `src/data/eventVisuals.ts` now bridges the section-first registry into the Event Visual picker while preserving the legacy `theme2-*` keys for saved weddings. The picker can show classic, scroll, and newly-created event visuals across categories and styles. The module remains in place as a compatibility layer for public rendering and old saved `event_visual_key` values.

## Phase 2 Copied Asset Structure

Phase 2 created the section-first folders under `public/assets` and copied existing runtime files into them. The registry still points to the existing runtime paths until Phase 3. No Supabase data was migrated.

Empty future folders are kept with `.gitkeep` so the intended structure is visible in Git.

| Old Path | New Section-First Path | Notes |
| --- | --- | --- |
| `/assets/hero-v1.mp4` | `/assets/opening-reveal/envelope/videos/opening-envelope-video.mp4` | Envelope opening video |
| `/assets/hero-poster-v1.jpeg` | `/assets/opening-reveal/envelope/posters/opening-envelope-poster.jpeg` | Envelope opening poster |
| `/assets/Ganesha Image.png` | `/assets/opening-reveal/envelope/revealed-images/revealed-ganesha-classic-01.png` | Classic revealed blessing image |
| `/assets/theme-2/main-hero-video.mp4` | `/assets/opening-reveal/scroll/videos/opening-scroll-video.mp4` | Scroll opening video |
| `/assets/theme-2/hero-poster.png` | `/assets/opening-reveal/scroll/posters/opening-scroll-poster.png` | Scroll opening poster |
| `/assets/theme-2/first-section.png` | `/assets/opening-reveal/scroll/revealed-images/revealed-couple-scroll-01.png` | Scroll revealed couple image |
| `/assets/second section old.png` | `/assets/our-story/images/story-pheras-01.png` | Legacy Our Story image mapped into the shared library |
| `/assets/theme-2/first-section.png` | `/assets/opening-reveal/scroll/revealed-images/revealed-couple-scroll-01.png` | Opening Reveal image only; no longer an Our Story picker preset |
| `/assets/theme-2/story-bg.png` | `/assets/theme-2/story-bg.png` | Renderer-only scroll background retained outside the Our Story picker |
| `/assets/theme-2/background.png` | `/assets/theme-2/background.png` | Shared renderer fallback retained outside the Our Story picker |
| `/assets/haldi.png` | `/assets/events/haldi/event-haldi-classic-foreground-01.png` | Classic event foreground |
| `/assets/haldi-bg.png` | `/assets/events/haldi/event-haldi-classic-bg-01.png` | Classic event background |
| `/assets/mehendi.png` | `/assets/events/mehendi/event-mehendi-classic-foreground-01.png` | Classic event foreground |
| `/assets/mehendi-bg.png` | `/assets/events/mehendi/event-mehendi-classic-bg-01.png` | Classic event background |
| `/assets/sangeet.png` | `/assets/events/sangeet/event-sangeet-classic-foreground-01.png` | Classic event foreground |
| `/assets/sangeet-bg.png` | `/assets/events/sangeet/event-sangeet-classic-bg-01.png` | Classic event background |
| `/assets/wedding.png` | `/assets/events/wedding/event-wedding-classic-foreground-01.png` | Classic event foreground |
| `/assets/wedding-bg.png` | `/assets/events/wedding/event-wedding-classic-bg-01.png` | Classic event background |
| `/assets/reception.png` | `/assets/events/reception/event-reception-classic-foreground-01.png` | Classic event foreground |
| `/assets/reception-bg.png` | `/assets/events/reception/event-reception-classic-bg-01.png` | Classic event background |
| `/assets/event-gap-bg.png` | `/assets/events/generic/event-gap-bg-classic-01.png` | Classic generic event gap background |
| `/assets/theme-2/haldi.png` | `/assets/events/haldi/event-haldi-scroll-01.png` | Scroll event visual |
| `/assets/theme-2/mehendi.png` | `/assets/events/mehendi/event-mehendi-scroll-01.png` | Scroll event visual |
| `/assets/theme-2/sangeet.png` | `/assets/events/sangeet/event-sangeet-scroll-01.png` | Scroll event visual |
| `/assets/theme-2/shaadi.png` | `/assets/events/wedding/event-wedding-scroll-01.png` | Scroll wedding event visual |
| `/assets/theme-2/reception.png` | `/assets/events/reception/event-reception-scroll-01.png` | Scroll reception event visual |
| `/assets/theme-2/background.png` | `/assets/events/generic/event-generic-scroll-bg-01.png` | Scroll generic event visual |
| `/assets/heart-frame.png` | `/assets/closing-gallery/frames/closing-frame-heart-classic-01.png` | Classic closing frame |
| `/assets/carousel1.png` | `/assets/closing-gallery/preset-photos/closing-photo-preset-01.png` | Closing preset photo |
| `/assets/carousel2.png` | `/assets/closing-gallery/preset-photos/closing-photo-preset-02.png` | Closing preset photo |
| `/assets/carousel3.png` | `/assets/closing-gallery/preset-photos/closing-photo-preset-03.png` | Closing preset photo |
| `/assets/theme-2/background.png` | `/assets/closing-gallery/backgrounds/closing-bg-scroll-floral-01.png` | Scroll closing background |
| `/assets/din-shangda-audio.mp3` | `/assets/audio/wedding-songs/music-din-shagna-da.mp3` | Shared wedding song |

Skipped duplicates:

- `/assets/theme-2/carousel1.png`, `/assets/theme-2/carousel2.png`, and `/assets/theme-2/carousel3.png` matched the existing root carousel images, so only one preset photo set was copied.
- `/assets/theme-2/din-shangda-audio.mp3` matched `/assets/din-shangda-audio.mp3`, so only one shared audio copy was created.

Phase 3 updated `src/data/assetRegistry.ts` and dashboard preset consumers to reference these new paths, while preserving the legacy path map for existing Supabase rows.

## Future Target Structure

The target physical folder structure should be section-first:

```text
public/assets/
  shared/
    audio/
    placeholders/
    icons/
    backgrounds/

  opening-reveal/
    envelope/
      videos/
      posters/
      revealed-images/
    scroll/
      videos/
      posters/
      revealed-images/
    palace-door/
      videos/
      posters/
      revealed-images/

  our-story/
    images/
    backgrounds/
    floral/
    minimal/
    royal/

  events/
    haldi/
    mehendi/
    sangeet/
    wedding/
    nikaah/
    reception/
    walima/
    generic/

  closing-gallery/
    backgrounds/
    frames/
    preset-photos/

  audio/
    wedding-songs/
    instrumental/
```

## Migration Rules

1. Add registry entries before moving files.
2. Copy files into new folders before updating references.
3. Keep old paths available while Supabase data still references them.
4. Add and test path normalization before database migration.
5. Remove old paths only after production smoke tests confirm no active wedding uses them.

## Registry Consumers

The dashboard consumes the registry for:

- Opening Reveal animation options
- Revealed image options
- Our Story image presets
- Closing Gallery preset photos

Public theme renderers and CSS background paths still include some existing paths in this phase.

Event visual picker migration is partially prepared by the section-first registry, but the current event visual implementation still uses `src/data/eventVisuals.ts` for public-safe Theme 2 rendering. A later pass should merge that with the registry once Theme 1 foreground/background pairs are represented cleanly.
