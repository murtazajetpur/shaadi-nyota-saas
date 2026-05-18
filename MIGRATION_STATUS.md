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

## Known Limitations

- Theme media and detailed invite copy are still seeded from the existing theme defaults unless edited through current settings.
- Supabase Storage is not implemented yet for image, video, or music uploads.
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
