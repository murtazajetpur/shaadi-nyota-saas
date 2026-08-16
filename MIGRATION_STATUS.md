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
4. `supabase/security_hardening_phase_1.sql`
5. `supabase/data_integrity_phase_2.sql`
6. Apply the feature migrations required by the deployed frontend.
7. Create the public `wedding-assets` bucket and run `supabase/storage_policies.sql`.
8. Run `supabase/add_wedding_media_library.sql` when enabling reusable uploads.
9. For an existing production project, run `supabase/production_security_hotfix.sql`.
10. Run `supabase/verify_production_security_hotfix.sql`; all checks must pass and both detail queries must return zero rows.
11. Run `supabase/add_admin_delete_wedding.sql` to enable permanent admin wedding deletion and uploaded-file cleanup.
12. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env`.
13. Configure Auth settings, including Confirm Email behavior.

## Guest Capacity Controls

- RSVP weddings default to 2,000 guest/family entries and 10,000 total people.
- Family Size is capped at 20 per guest entry.
- The Guests tab paginates 50 rows by default with 25/50/100 row options.
- Admins can override per-wedding limits; couples can view usage but cannot raise limits.
- Supabase enforces limits for direct writes, CSV imports, and transactional dashboard saves.
- Apply `supabase/add_guest_limits_and_pagination.sql` after the current Phase 2 and event-field migrations.

## Production Security Hotfix

- `supabase/production_security_hotfix.sql` is the idempotent production repair for the audited role, grant, RLS-policy, and Storage-listing findings.
- `supabase/verify_production_security_hotfix.sql` is read-only and verifies the expected production state.
- The SQL files are ready to run manually in the Supabase SQL Editor; committing them does not apply them to the hosted database.
- Normal public wedding data remains readable only for paid, published weddings.
- Personalized guest data and RSVP writes remain RPC-only and invite-code validated.
- Public Storage URLs remain usable, while object metadata and listing require an authenticated wedding owner or admin.
## Admin Wedding Deletion

- Run `supabase/add_admin_delete_wedding.sql` before using the Admin Panel delete action.
- Only authenticated profiles with `role = 'admin'` can execute `admin_delete_wedding`.
- Admins must type the wedding slug before the destructive action is enabled.
- The wedding row is deleted transactionally; foreign-key cascades remove settings, events, guests, invite assignments, message history, RSVP responses, and media metadata.
- Uploaded `wedding-assets` objects are removed immediately after the database transaction. A cleanup warning is shown if object deletion needs manual attention.
- The couple authentication/profile record is intentionally retained so the account can create another wedding.

## Known Limitations

- Theme media and detailed invite copy are still seeded from the existing theme defaults unless edited through current settings.
- Opening Reveal supports path-based configuration and a local preview, but image/video/audio upload is not implemented yet.
- Our Story supports preset/path-based story images and a local preview, but image upload is not implemented yet. The separate Couple tab is hidden from dashboard/admin navigation.
- Closing Gallery supports preset optional couple photos, Supabase Storage uploads, and a local preview. Gallery photos are not used as the closing section background.
- A reusable wedding-scoped Supabase media library now supports image uploads for Opening Reveal, Our Story, Events, RSVP backgrounds, Closing Gallery, and WhatsApp link previews. Video and music uploads remain future phases.
- Additional invitation delivery channels are not implemented yet.
- Real online payments are not implemented yet; manual payment instructions use a WhatsApp contact link and `manual_pending` as the verification-requested state.
- Basic dashboards lock Guests and RSVP Dashboard behind an upgrade prompt. The Pro plan and admin editing keep full guest/RSVP access.
- Custom domains are not implemented yet.
- The couple dashboard currently assumes one active wedding per couple account.
- CSV import validates file size and wedding capacity in the browser and database. A staged server-side import job is still recommended before supporting imports approaching 10,000 rows.

## Required RLS Summary

- `public.is_admin()` checks `profiles.role = 'admin'`.
- Users can read their own `profiles` row and update only `full_name` and `phone`.
- Profile role changes require a trusted service-role or SQL session.
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
- Public routes cannot directly read or update `guests`; personalized lookup uses `get_public_invite_by_code`.
- Couples can CRUD `guest_event_invites` for weddings they own.
- Admins can CRUD all `guest_event_invites`.
- Public routes cannot directly read `guest_event_invites`; the validated invite RPC returns only the matching guest assignments.
- Couples can read `rsvp_responses` for weddings they own.
- Admins can read all `rsvp_responses`.
- Public routes cannot directly access `rsvp_responses`; `submit_guest_rsvp` validates the wedding, invite code, event assignment, and invited count.
- Browser roles do not retain `TRUNCATE`, `REFERENCES`, or `TRIGGER` privileges on application tables.

## Next Recommended Phases

1. Move theme media management to Supabase Storage.
2. Add production-grade CSV validation and import previews.
3. Add payment/checkout integration and replace the manual WhatsApp verification flow.
4. Add optional invitation delivery workflows after adding timezone-aware event datetime fields.
5. Add admin wedding creation/support workflows.
6. Add multi-wedding support per couple account if needed.
## WhatsApp Messages And Link Preview

- Dashboard and admin editors can save separate invitation and reminder templates per wedding.
- Both templates support guest/couple variables, emoji, and line breaks; reminder scheduling remains a future phase.
- Couples can configure the personalized invitation link title, description, and preview image from the WhatsApp section.
- Preview images can be selected from the visual library or uploaded to the public `wedding-assets` bucket under `weddings/{weddingId}/whatsapp-preview/`.
- Personalized invite routes use `api/invite-preview.js` on Vercel to return server-rendered Open Graph metadata while preserving the existing React invite experience.
- Run `supabase/add_whatsapp_message_and_preview_settings.sql` before saving these fields in an existing project.

## Manual WhatsApp Send Tracking

- Run `supabase/add_guest_message_history.sql` to enable invitation and reminder tracking.
- Each confirmed send is stored as a separate history row, so reminder counts are not capped.
- The Guests table shows the first invitation date, reminder count, last reminder date, and full removable history.
- Tracking is manually confirmed by the dashboard user; it does not represent WhatsApp delivery or read verification.
- Guest deletion removes its tracking history through the existing database cascade.

## Wedding Media Library

- Run `supabase/add_wedding_media_library.sql` for existing Supabase projects.
- Couples and admins can upload JPG, PNG, or WebP source images up to 5 MB.
- The browser stores an optimized WebP master and a lightweight WebP thumbnail in `wedding-assets`.
- Limits are 15 uploaded images and 50 MB of optimized media per wedding, enforced in PostgreSQL as well as the UI.
- Uploaded images are reusable across image-based editor sections; preset assets and existing saved URLs remain compatible.
- Removing an in-use image clears every matching section reference and queues the file deletion until the wedding save succeeds.

## Guest Phone Validation

- Run `supabase/add_guest_phone_validation.sql` once on an existing Supabase project.
- Guest CSV import and manual guest editing share the same international phone validator.
- The plus sign is optional. Spaces, hyphens, brackets, and spreadsheet-safe apostrophes are removed automatically.
- Ten-digit Indian mobile numbers default to `+91`; non-Indian numbers must include their country calling code.
- Valid numbers are stored in canonical E.164 format, while shared family phone numbers produce warnings rather than blocking import.
- The database trigger validates and normalizes every new guest phone write. Existing rows are not bulk-modified by the migration.
