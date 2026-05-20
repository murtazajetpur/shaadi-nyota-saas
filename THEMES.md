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
- `couple.blessingLine`
- `events[]`
- `rsvp`
- `closing`
- `hero`
- `music`

Story copy currently uses `couple.introLine` and `couple.blessingLine`, then a safe default when both are missing.

## Event Visual Library

Event sections now separate event type from event visual:

- `events.event_key` stores the event type/category fallback, such as `haldi`, `mehendi`, `sangeet`, `wedding`, `reception`, or `custom`.
- `events.event_visual_key` stores the selected visual card when a couple/admin chooses a specific background.
- `events.event_text_style` controls event section readability. Allowed values are `auto`, `light`, and `dark`.
- `src/data/eventVisuals.ts` defines the reusable visual library.
- Visual entries include `key`, `label`, `eventType`, `themeKey`, `themeLabel`, and `imageSrc` so additional theme libraries can be added without changing the event editor.
- Visual entries can include a default text style. `auto` uses that visual default, then falls back to event type/name heuristics.
- The Events editor shows the selected visual as a scaled mobile-style preview inside each event card. For Theme 2, this preview reuses the same event section rendering classes as the public invite. The full visual library opens in a modal from Change Visual.
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
```

The RSVP business logic is shared across themes through the existing RSVP component. Theme 2 only adds scoped visual styling around that shared logic.

## Theme 2 Assets

Theme 2 assets live in:

```text
public/assets/theme-2/
```

Only active reference assets were copied. Unused `old` variants, `node_modules`, `dist`, and nested `.git` files from the reference demo were not copied.
