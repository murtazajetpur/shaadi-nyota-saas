# Shaadi Nyota Themes

## Theme Keys

- `palace-door-opening`: Palace Door Opening
- `theme-2`: Scroll Opening Invite

## Theme 2: Scroll Opening Invite

Theme 2 was adapted from `reference-themes/theme-2-demo`.

It keeps the reference demo's visual direction:

- tap-to-reveal hero video
- floral/mandap couple section
- story section
- full-screen event sections
- event particles
- RSVP section using Shaadi Nyota's existing RSVP logic
- final carousel closing

Theme 2 uses the existing Shaadi Nyota wedding data model:

- `couple.brideName`
- `couple.groomName`
- `couple.displayName`
- `couple.introLine`
- `couple.storyTitle`
- `couple.storyText`
- `events[]`
- `rsvp`
- `closing`
- `hero`
- `music`

## Our Story

Our Story is the shared couple/story section between Opening Reveal and Events.

It follows one editor, one data model, multiple theme renderers:

- `couple.enabled` controls whether Our Story is shown.
- The editor shows `couple.displayName` as Couple Display Name. Bride/groom names remain internal/onboarding data.
- `couple.introLine` stores the user-facing Subtitle.
- `couple.storyTitle` stores the section headline.
- `couple.storyText` stores the main story copy.
- `couple.backgroundImageSrc` stores the story image path.
- `couple.imageAlt` remains supported internally, but normal dashboard/admin editing hides technical alt text fields.

Theme 1 presents these fields in its existing couple-section style. Theme 2 presents the same fields in the Scroll Opening Invite couple/story visual style. Future themes should consume the same fields and only change the renderer.

The dashboard/admin Our Story preview is a self-contained 9:16 phone-frame preview. The separate Couple tab is hidden from navigation because Our Story now owns the couple-facing copy. Upload/storage is intentionally not included yet; Supabase Storage media upload remains a future phase.

## Closing Gallery

Closing Gallery is the shared final thank-you/photo section at the end of the invite, after Events and RSVP when RSVP is enabled.

It follows one editor, one data model, multiple theme renderers:

- The closing section is always shown as the final thank-you section.
- `closing.includePhotos` controls whether couple photos/gallery are shown.
- `closing.closingLine` stores the short closing line.
- `closing.coupleDisplayName` stores the displayed couple name.
- `closing.message` stores the thank-you message.
- `closing.carouselImages` stores gallery image paths.
- `closing.frameImageSrc` remains the Theme 1 frame asset path.

The closing section is still shown when `closing.includePhotos` is false; only the personal photos/carousel are hidden. Gallery photos are displayed inside the closing section and are not used as the full background. Theme backgrounds remain theme-specific.

Theme 1 presents these fields in its existing final section style and hides the heart carousel when photos are disabled. Theme 2 presents the same fields in the Scroll Opening Invite final section style and hides the memory frame when photos are disabled. Future themes should consume the same fields and only change the renderer.

The dashboard/admin Closing Gallery preview is a self-contained 9:16 phone-frame preview. Users can select preset images or upload closing-gallery photos to the `wedding-assets` Supabase Storage bucket. The upload path is scoped by wedding id:

```text
weddings/{weddingId}/closing-gallery/{timestamp}-{filename}
```

## Opening Reveal

Opening Reveal is the first invite section and is shared across themes. It is one builder section with two linked parts:

- Reveal Animation: the opening sequence, such as envelope opening, scroll opening, or a future palace door opening.
- Revealed Image: the image guests see after the animation completes, such as a Ganesha/blessing image, couple image, or floral image.

The builder stores Opening Reveal mostly in `wedding_settings` hero/music fields:

- `hero_reveal_style`
- `hero_video_src`
- `hero_poster_src`
- `hero_reveal_cta_text`
- `music_audio_src`
- `hero_reveal_image_src`
- `hero_reveal_image_type`
- `hero_reveal_image_alt`

Theme 1 defaults to an envelope-style reveal with the existing Ganesha/blessing image. Theme 2 defaults to a scroll-style reveal with the Theme 2 hero video, poster, music, and mandap/couple image.

The dashboard/admin Opening Reveal preview simulates the full intro sequence in a fixed 9:16 phone frame. It is muted by default and does not change public invite audio behavior. Upload/storage is intentionally not included yet; Supabase Storage media upload remains a future phase.

## Event Visual Library

Event sections now separate event type from event visual:

- `events.event_key` stores the event type/category fallback, such as `haldi`, `mehendi`, `sangeet`, `wedding`, `reception`, or `custom`.
- `events.event_visual_key` stores the selected visual card when a couple/admin chooses a specific background.
- `events.event_text_style` controls event section readability. Allowed values are `auto`, `light`, and `dark`.
- `events.event_animation_key` stores the selected decorative effect. Allowed values are `none`, `soft-petals`, `soft-petals-blush`, `soft-petals-yellow`, `soft-petals-gold`, `soft-petals-maroon`, and `golden-glow`.
- `src/data/eventVisuals.ts` defines the reusable visual library.
- `src/data/eventAnimations.ts` defines reusable CSS-based event animation options. `src/components/EventAnimationLayer.tsx` renders the same selected effect in dashboard previews and public event sections.
- Visual entries include `key`, `label`, `eventType`, `themeKey`, `themeLabel`, and `imageSrc` so additional theme libraries can be added without changing the event editor.
- Visual entries can include a default text style. `auto` uses that visual default, then falls back to event type/name heuristics.
- The Events editor shows the selected visual and animation as a scaled mobile-style preview inside each event card. For Theme 2, this preview reuses the same event section rendering classes as the public invite. The full visual library opens in a modal from Change Visual.
- The picker starts with current theme visuals. If no visuals exist for the current theme, it shows all theme visuals.

Theme 2 resolves event imagery in this order:

1. `event_visual_key` mapped through the visual library
2. automatic recommendation from `event_key` or the event name
3. generic Theme 2 background fallback

Theme 2 currently includes these visual cards:

- haldi/turmeric -> `haldi.png`
- mehendi/mehndi/henna -> `mehendi.png`
- sangeet/music/dance/qawwali/carnival -> `sangeet.png`
- wedding/shaadi/nikaah/nikah/ceremony -> `shaadi.png`
- reception/walima/dinner -> `reception.png`
- unmatched events -> `background.png`

Existing Supabase projects should run:

```sql
alter table public.events
add column if not exists event_visual_key text;

alter table public.events
add column if not exists event_text_style text default 'auto';

alter table public.events
add column if not exists event_animation_key text not null default 'none';
```

The RSVP business logic is shared across themes through the existing RSVP component. Theme 2 only adds scoped visual styling around that shared logic.

## Theme 2 Assets

Theme 2 assets live in:

```text
public/assets/theme-2/
```

Only active reference assets were copied. Unused `old` variants, `node_modules`, `dist`, and nested `.git` files from the reference demo were not copied.
