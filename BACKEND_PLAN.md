# Shaadi Nyota Backend Plan

## Summary

Shaadi Nyota should move from local sample data and `localStorage` to a Supabase-backed MVP. The recommended stack is:

- Supabase Auth for couple and admin login.
- Supabase Postgres for weddings, settings, events, guests, guest-event visibility, RSVP responses, themes, and admin/payment state.
- Supabase Storage later for images, reveal videos, music, posters, and background assets.

This plan is documentation only. It should not change the current Vite React mock behavior until implementation begins.

## Backend Approach

Use Supabase as the MVP backend because it gives the product Auth, Postgres, row-level security, and future Storage without needing a separate custom backend immediately.

For MVP:

- Keep internal package values as `basic`, `rsvp`, and `whatsapp`.
- Keep user-facing labels aligned to active packages: Basic and Pro.
- Use `payment_status = 'unpaid' | 'manual_pending' | 'ref_pending' | 'paid'`; `manual_pending` is displayed as Verification Requested.
- Keep website status separate from payment status.
- Keep date/time labels for current invite display.

Later:

- Keep manual verification state until a real checkout flow replaces it.
- Add Supabase Storage for media upload and management.
- Add proper event datetime fields before WhatsApp event reminders.

## Database Tables

### `profiles`

Purpose: App-level user profile linked to Supabase Auth.

Fields:

- `id uuid primary key references auth.users(id)`
- `full_name text`
- `phone text`
- `role text check (role in ('couple', 'admin'))`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Relationships:

- One profile can own many weddings through `weddings.owner_id`.
- One profile/admin can create many weddings through `weddings.created_by`.

Important indexes:

- `profiles(role)`
- `profiles(phone)`

Notes:

- Admin access should be protected by RLS policies and role checks.

### `weddings`

Purpose: Main wedding record, route identity, package, payment, and publish state.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `owner_id uuid references profiles(id)`
- `created_by uuid references profiles(id)`
- `slug text not null unique`
- `package_type text not null check (package_type in ('basic', 'rsvp', 'whatsapp'))`
- `status text not null check (status in ('draft', 'published', 'suspended'))`
- `payment_status text not null check (payment_status in ('unpaid', 'paid'))`
- `theme_key text not null`
- `page_title text`
- `bride_name text`
- `groom_name text`
- `display_name text`
- `published_at timestamptz nullable`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Relationships:

- One wedding has one `wedding_settings` row.
- One wedding has many `events`, `guests`, `guest_event_invites`, and `rsvp_responses`.
- `owner_id` is the couple/user who owns the wedding.
- `created_by` is the user/admin who created the wedding record.

Important indexes:

- unique `weddings(slug)`
- `weddings(owner_id)`
- `weddings(created_by)`
- `weddings(status)`
- `weddings(payment_status)`
- `weddings(package_type)`

Notes:

- Set `published_at` when status changes to `published`.
- Clear or preserve `published_at` on unpublish based on the future audit requirement; for MVP, preserving it as first publish time is acceptable.
- Optional future soft delete: add `deleted_at timestamptz` later if the admin needs recoverable deletion. Not required for MVP.

### `wedding_settings`

Purpose: Configurable invite copy/media currently nested in `SampleWeddingData`.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `wedding_id uuid not null unique references weddings(id) on delete cascade`
- `hero_reveal_cta_text text`
- `hero_scroll_hint_text text`
- `hero_video_src text`
- `hero_poster_src text`
- `hero_reveal_image_src text`
- `hero_reveal_image_alt text`
- `hero_reveal_image_show_at_seconds numeric`
- `hero_fade_at_seconds numeric`
- `music_audio_src text`
- `music_title text`
- `couple_enabled boolean not null default true`
- `couple_intro_line text`
- `couple_blessing_line text`
- `couple_background_image_src text`
- `rsvp_enabled boolean not null default true`
- `rsvp_title text`
- `rsvp_subtitle text`
- `rsvp_labels jsonb`
- `rsvp_meal_preference_enabled boolean not null default true`
- `rsvp_meal_options jsonb`
- `rsvp_success_message jsonb`
- `closing_line text`
- `closing_couple_display_name text`
- `closing_carousel_images jsonb`
- `closing_frame_image_src text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Relationships:

- Belongs to one wedding.

Important indexes:

- unique `wedding_settings(wedding_id)`

Notes:

- Store asset paths/URLs as text for MVP.
- Move media files to Supabase Storage in a later phase.

### `events`

Purpose: Wedding functions such as Haldi, Mehendi, Sangeet, Nikaah, and Reception.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `wedding_id uuid not null references weddings(id) on delete cascade`
- `event_key text`
- `event_name text not null`
- `date_label text`
- `start_time_label text`
- `venue_name text`
- `city text`
- `maps_url text`
- `dress_code text`
- `foreground_image_src text`
- `background_image_src text`
- `calendar_title text`
- `calendar_description text`
- `sort_order integer not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Relationships:

- Belongs to one wedding.
- Linked to guests through `guest_event_invites`.
- Linked to RSVP status through `rsvp_responses`.

Important indexes:

- `events(wedding_id, sort_order)`
- unique optional `events(wedding_id, event_key)`

Notes:

- For MVP, `date_label` and `start_time_label` are enough because the current invite displays human-readable strings.
- Before WhatsApp event reminders, add proper scheduling fields:
  - `event_start_at timestamptz`
  - `event_end_at timestamptz nullable`
  - `timezone text`

### `guests`

Purpose: Guest/family records, personalized invite codes, invited count, category, and meal preference.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `wedding_id uuid not null references weddings(id) on delete cascade`
- `guest_name text not null`
- `phone text`
- `invited_count integer not null default 1`
- `category text`
- `invite_code text not null`
- `meal_preference text check (meal_preference in ('veg', 'nonVeg', 'jain'))`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Relationships:

- Belongs to one wedding.
- Linked to invited events through `guest_event_invites`.
- Linked to event RSVP rows through `rsvp_responses`.

Important indexes:

- unique `guests(wedding_id, invite_code)`
- `guests(wedding_id)`
- `guests(phone)`
- `guests(category)`

Notes:

- `invite_code` powers `/:slug/invite/:code`.
- Store `meal_preference` once per guest/family, not once per event.

### `guest_event_invites`

Purpose: Event-wise visibility for each guest/family.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `wedding_id uuid not null references weddings(id) on delete cascade`
- `guest_id uuid not null references guests(id) on delete cascade`
- `event_id uuid not null references events(id) on delete cascade`
- `created_at timestamptz not null default now()`

Relationships:

- Join table between guests and events.

Important indexes:

- unique `guest_event_invites(guest_id, event_id)`
- `guest_event_invites(wedding_id)`
- `guest_event_invites(event_id)`

Notes:

- Replaces the current `guest.invitedEventIds` array.

### `rsvp_responses`

Purpose: Event-wise RSVP status for each invited guest/family.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `wedding_id uuid not null references weddings(id) on delete cascade`
- `guest_id uuid not null references guests(id) on delete cascade`
- `event_id uuid not null references events(id) on delete cascade`
- `status text not null check (status in ('yes', 'no', 'maybe'))`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Relationships:

- One response per guest per event.
- Meal preference is read from `guests.meal_preference`.

Important indexes:

- unique `rsvp_responses(guest_id, event_id)`
- `rsvp_responses(wedding_id)`
- `rsvp_responses(event_id, status)`
- `rsvp_responses(guest_id)`

Notes:

- Keep this table focused on event-wise attendance status.
- Pending is derived when a guest is invited to an event but has no `rsvp_responses` row.

### `themes`

Purpose: Available invite themes.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `theme_key text not null unique`
- `display_name text not null`
- `description text`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`

Important indexes:

- unique `themes(theme_key)`
- `themes(is_active)`

Notes:

- Seed `palace-door-opening` first.

### `reveal_variations`

Purpose: Configurable reveal video/poster/image presets.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `theme_id uuid references themes(id)`
- `name text not null`
- `video_src text`
- `poster_src text`
- `reveal_image_src text`
- `reveal_image_alt text`
- `reveal_image_show_at_seconds numeric`
- `hero_fade_at_seconds numeric`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`

Important indexes:

- `reveal_variations(theme_id)`
- `reveal_variations(is_active)`

### `music_options`

Purpose: Selectable music presets.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `title text not null`
- `audio_src text not null`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`

Important indexes:

- `music_options(is_active)`

## Current Data Mapping

- `sampleWeddings[].wedding` maps to `weddings`.
- `sampleWeddings[].hero`, `music`, `couple`, `rsvp`, and `closing` map to `wedding_settings`.
- `sampleWeddings[].events[]` maps to `events`.
- `sampleWeddings[].rsvp.guests[]` maps to `guests`.
- `guest.invitedEventIds[]` maps to `guest_event_invites`.
- RSVP localStorage rows map to `rsvp_responses`, with meal preference moved to `guests.meal_preference`.
- Mock admin localStorage state maps to `weddings.package_type`, `weddings.status`, `weddings.payment_status`, and `weddings.published_at`.
- Mock dashboard draft state maps to upserts across `weddings`, `wedding_settings`, `events`, `guests`, and `guest_event_invites`.

Current localStorage keys:

- `shaadi-nyota-mock-dashboard-draft`
- `shaadi-nyota-mock-rsvp-responses`
- `shaadi-nyota-mock-admin-weddings`

## Route Access Logic

### Public wedding route: `/:slug`

- Query `weddings` by `slug`.
- If no wedding exists, show not found.
- If `status = 'published'`, render the invite.
- If `status = 'draft'`, show: `This wedding website is not live yet.`
- If `status = 'suspended'`, show: `This wedding website is currently unavailable.`

### Personalized invite route: `/:slug/invite/:inviteCode`

- Query `weddings` by `slug`.
- Query `guests` by `wedding_id` and `invite_code`.
- Require `weddings.status = 'published'`.
- If invite code is invalid, show invitation-link-not-found message.
- Show only events connected through `guest_event_invites`.
- RSVP only for invited events.
- Store event-wise status in `rsvp_responses`.
- Store meal preference once on `guests.meal_preference`.

### Couple dashboard: `/dashboard`

- Require Supabase Auth.
- Couple users can access weddings where `weddings.owner_id = auth.uid()`.
- Couple dashboard can edit wedding settings, events, and theme/media fields allowed by the product. Guests, guest-event invites, and RSVP dashboard access require the RSVP package.
- Package, payment, and publish status stay admin/payment-managed.

### Admin panel: `/admin`

- Require Supabase Auth and `profiles.role = 'admin'`.
- Admin can view all weddings.
- Admin can update package, payment status, publish/unpublish, and suspend/restore website status.
- Admin-created weddings should set `weddings.created_by` to the admin profile id.

## MVP Migration Phases

### Phase A: Supabase setup and env vars

- Create Supabase project.
- Add app env vars for Supabase URL and anon key.
- Create database schema.
- Seed initial theme, reveal variation, music option, and sample wedding records.
- Do not add Supabase Storage yet.

### Phase B: Auth

- Add Supabase Auth package.
- Create `profiles` rows for couple/admin users.
- Protect `/dashboard` and `/admin`.
- Keep public invite routes unauthenticated.

### Phase C: Weddings/events persistence

- Replace sample wedding reads with Supabase queries.
- Persist couple dashboard wedding, settings, and events.
- Keep local sample fallback only during transition if needed.

### Phase D: Guests persistence

- Move guest table CRUD to Supabase.
- Persist CSV imports into `guests` and `guest_event_invites`.
- Export CSV from database rows.
- Store meal preference once on `guests`.

### Phase E: RSVP persistence

- Replace RSVP localStorage with `rsvp_responses`.
- Pre-fill personalized RSVP from database.
- Update RSVP dashboard analytics from database.
- Derive pending counts from invited events with no response row.

### Phase F: Admin/payment/publish controls

- Move admin localStorage state into `weddings`.
- Admin updates package, payment status, website status, and `published_at`.
- Keep real payment gateway out of scope; manual payment verification uses the dashboard request action and admin Mark Paid / Verify Payment.

### Phase G: Storage/media later

- Move reveal videos, posters, images, music, and backgrounds to Supabase Storage.
- Update settings/theme records to use storage URLs.
- Add upload/replace workflows after core data persistence is stable.

## Mock Or Out Of Scope For Now

- Additional invitation delivery channels.
- Real online payment gateway.
- Custom domains.
- Multi-theme marketplace.
- Media upload/asset management.
- Refund payment statuses.

## Risks And Decisions

- RLS policies must be designed carefully so public invite routes can read only published wedding data and valid guest invite data.
- `invite_code` should be hard to guess before real launch.
- CSV import should validate duplicate invite codes, duplicate phone/name combinations, and invalid event columns.
- Date labels are enough for the current UI, but reminder automation will require real datetime and timezone fields.
- Media paths should remain text until Storage is introduced to avoid mixing two migrations.

## Build Verification

After documentation changes, run:

```bash
npm.cmd run build
```

The build should pass and runtime app behavior should remain unchanged.
