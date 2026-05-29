# Shaadi Nyota Migration Status

## Supabase-Backed Now

- Supabase Auth for signup, login, logout, and role-based admin access.
- Create Wedding onboarding creates `weddings` and `wedding_settings` rows.
- Couple dashboard loads and saves wedding shell fields from Supabase.
- Couple dashboard event management uses `events`.
- Guest management uses `guests`.
- Guest-wise event visibility uses `guest_event_invites`.
- CSV guest import/export operates against the dashboard guest/event state, which is Supabase-backed for real weddings.
- Personalized invite routes load Supabase wedding, guest, event, and invite data when a matching Supabase slug exists.
- RSVP submit stores event-wise statuses in `rsvp_responses`.
- Meal preference is stored once per guest/family in `guests.meal_preference`.
- RSVP dashboard analytics read Supabase guests, events, invites, and RSVP responses for real weddings.
- Admin panel reads and updates Supabase `weddings`.
- Admin guest, invited, event, and RSVP counts are aggregated from Supabase.
- Theme selection is Supabase-backed through `weddings.theme_key`, including Theme 2: Scroll Opening Invite.
- Opening Reveal settings are Supabase-backed through `wedding_settings` hero/music fields, including reveal animation style, opening video, poster image, tap text, music, revealed image, image type, and alt text.
- Our Story settings are Supabase-backed through `wedding_settings`, using one shared data model across themes for display name, subtitle, story title, story text, and story image. Bride/groom names and alt text remain internal fields but are hidden from the normal editor UI.
- Closing Gallery settings are Supabase-backed through `wedding_settings`, using one shared data model across themes for the always-available closing text, optional couple photos, closing line, couple display name, thank-you message, and gallery images.
- Event visual selection is Supabase-backed through `events.event_visual_key`; Theme 2 uses this before automatic event type/name recommendations.
- Event text readability is Supabase-backed through `events.event_text_style`; Theme 2 uses `auto`, `light`, or `dark` to resolve event section text contrast.
- Event animation/effect selection is Supabase-backed through `events.event_animation_key`; dashboard previews and public Theme 1/Theme 2 event sections render the selected decorative animation layer.

## Fallback Still Present

The app still keeps fallback code for local development and legacy sample invite routes:

- `shaadi-nyota-mock-dashboard-draft`
- `shaadi-nyota-mock-rsvp-responses`
- `shaadi-nyota-mock-admin-weddings`

These keys are only intended for development fallback/sample routes when Supabase is unavailable or when a public slug does not exist in Supabase.

## Required Supabase Setup Files

The current Supabase project is already being used for development and testing. We do not need to create a fresh Supabase project right now.

Running the setup from scratch is a future reproducibility and production-readiness test. Before production launch, verify that a fresh Supabase project works with this order:

1. `supabase/schema.sql`
2. `supabase/rls_policies.sql`
3. `supabase/seed.sql`
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env`
5. Configure Auth settings, including Confirm Email behavior

For Closing Gallery uploads, also create a public Supabase Storage bucket named `wedding-assets` and run `supabase/storage_policies.sql`.

## Known Limitations

- Theme media and detailed invite copy are still seeded from the existing theme defaults unless edited through current settings.
- Opening Reveal supports path-based configuration and a local preview, but image/video/audio upload is not implemented yet.
- Our Story supports preset/path-based story images and a local preview, but image upload is not implemented yet. The separate Couple tab is hidden from dashboard/admin navigation.
- Closing Gallery supports preset optional couple photos, Supabase Storage uploads, and a local preview. Gallery photos are not used as the closing section background.
- Supabase Storage is implemented for Closing Gallery photo uploads only. Opening Reveal, Our Story, theme media, video, and music uploads remain future phases.
- WhatsApp invitations and reminders are not implemented yet.
- Real online payments are not implemented yet; admin payment status is manual.
- Custom domains are not implemented yet.
- The couple dashboard currently assumes one active wedding per couple account.
- CSV import is browser-side MVP logic and should be hardened further before very large production imports.

## Required RLS Summary

- `public.is_admin()` checks `profiles.role = 'admin'`.
- Users can read and update their own `profiles` row.
- Admins can read all `profiles`.
- Couples can create their own `weddings`.
- Couples can read and update their own `weddings`.
- Admins can read and update all `weddings`.
- Public invite routes can read published `weddings`.
- Couples can create, read, and update their own `wedding_settings`.
- Admins can read all relevant `wedding_settings`.
- Public invite routes can read published `wedding_settings`.
- Couples can CRUD `events` for weddings they own.
- Admins can CRUD all `events`.
- Public invite routes can read published `events`.
- Couples can CRUD `guests` for weddings they own.
- Admins can CRUD all `guests`.
- Public invite routes can read published invite guests and update meal preference for published weddings.
- Couples can CRUD `guest_event_invites` for weddings they own.
- Admins can CRUD all `guest_event_invites`.
- Public invite routes can read published guest-event invite mappings.
- Couples can read `rsvp_responses` for weddings they own.
- Admins can read all `rsvp_responses`.
- Public invite routes can read, insert, and update RSVP responses for valid guest-event invite combinations on published weddings.

## Next Recommended Phases

1. Move theme media management to Supabase Storage.
2. Add production-grade CSV validation and import previews.
3. Add payment/checkout integration and replace manual payment state.
4. Add WhatsApp invite/reminder automation after adding timezone-aware event datetime fields.
5. Add admin wedding creation/support workflows.
6. Add multi-wedding support per couple account if needed.
