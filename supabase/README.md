# Supabase Setup

These files prepare the Shaadi Nyota Supabase backend used by the MVP app.

The current Supabase project is already being used for development and testing. You do not need to create a fresh Supabase project right now.

The setup order below is for future reproducibility and production-readiness testing. Before production launch, run through it on a fresh Supabase project to confirm the documented setup works end to end.

## Setup Order

1. Run `supabase/schema.sql`
2. Run `supabase/rls_policies.sql`
3. Run `supabase/seed.sql`
4. For an existing project, run `supabase/security_hardening_phase_1.sql`
5. Run `supabase/data_integrity_phase_2.sql`
6. Create the `wedding-assets` Storage bucket and run `supabase/storage_policies.sql`
7. Add local env vars
8. Configure Auth settings, including Confirm Email behavior

## 1. Create A Supabase Project

1. Go to the Supabase dashboard.
2. Create a new project.
3. Wait for the project database to finish provisioning.

## 2. Run The Schema

Open the Supabase SQL editor, paste the full contents of `supabase/schema.sql`, and run it.

The schema creates:

- `profiles`
- `weddings`
- `wedding_settings`
- `events`
- `guests`
- `guest_event_invites`
- `rsvp_responses`
- `themes`
- `reveal_variations`
- `music_options`

It also adds primary keys, foreign keys, check constraints, indexes, comments, and the `updated_at` trigger helper.

## 3. Run RLS Policies

Open a new SQL editor tab, paste the full contents of `supabase/rls_policies.sql`, and run it.

If a published public or personalized invite link does not load while logged out
or in incognito, run `supabase/public_invite_access_fix.sql`. It reapplies the
public published-read policies and explicit `anon`/`authenticated` grants needed
by the public invite routes.

This enables row level security and creates policies for:

- users reading/updating their own profile
- admins reading all profiles
- couples creating, reading, and updating their own weddings
- admins reading/updating all weddings
- couples managing their own settings, events, guests, and guest-event invites
- admins managing all events, guests, and guest-event invites
- couples reading RSVP responses for their own weddings
- admins reading all RSVP responses
- public invite routes reading published wedding data
- public personalized invites submitting RSVP responses for valid published guest-event combinations

## 4. Run The Seed

Open another SQL editor tab, paste the full contents of `supabase/seed.sql`, and run it.

The seed adds minimal setup data:

- Theme: `palace-door-opening`
- Reveal variation: default Ganesha reveal
- Music option: `Din Shagna Da`

It does not seed full weddings, guests, or RSVP responses.

## 5. Configure Storage For Wedding Assets

Closing Gallery uploads use Supabase Storage bucket `wedding-assets`.

Create the bucket in Supabase Storage:

- Bucket ID: `wedding-assets`
- Public bucket: enabled

Then run `supabase/storage_policies.sql`.

Optional SQL for creating or repairing the bucket:

```sql
insert into storage.buckets (id, name, public)
values ('wedding-assets', 'wedding-assets', true)
on conflict (id) do update set public = true;
```

If the bucket is missing, the dashboard shows: "Image upload is not configured yet. Please create the wedding-assets Supabase Storage bucket and run the storage policies."

## 6. Add Local Env Vars

Copy `.env.example` to `.env` and fill in:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Use the project URL and anon public key from Supabase project settings.

Do not commit `.env`. It is ignored by git.

## 7. Auth Notes

- Confirm Email can be disabled for local MVP testing.
- Signup passes `full_name` through Supabase Auth user metadata.
- The frontend does not insert into `public.profiles` during signup.
- The `public.handle_new_user()` database trigger should create the `profiles` row after a new auth user signs up.
- `supabase/security_hardening_phase_1.sql` creates or replaces this trigger and
  backfills missing profile rows from `auth.users`.
- New profiles should default to `role = 'couple'`.
- To test admin access locally, manually update the test user's `profiles.role` to `admin` in Supabase.

## 8. Runtime Notes

- Active purchasable plans are `basic` (Basic Website, ₹3,000) and `rsvp` (Basic Website + RSVP Management, ₹5,000).
- A legacy package value remains in the schema only for existing records and is not shown as an active purchasable plan.
- Public invites require both `weddings.status = 'published'` and
  `weddings.payment_status = 'paid'`.
- Personalized invite lookup uses `public.get_public_invite_by_code(slug, code)`.
  Anonymous users cannot directly select guests, guest-event assignments, or
  RSVP responses.
- Public RSVP submission uses `public.submit_guest_rsvp(slug, code, responses,
  meal_preference)`, which validates plan access and every submitted event
  against that guest.
- Couple payment verification requests use
  `public.request_payment_verification(wedding_id)`. A database trigger blocks
  couples from directly changing package, payment, publication, or ownership
  fields while preserving admin controls.
- Manual payment verification requests use `weddings.payment_status = 'manual_pending'`. The dashboard labels this as "Verification Requested". If an older database still only allows `unpaid` and `paid`, run `supabase/add_manual_payment_status.sql`.
- Basic Website dashboards show Guests and RSVP Dashboard as locked upgrade panels. Admin editing remains unrestricted.
- Dashboard section save buttons say "Save All Changes" because every save button persists the full builder payload: wedding shell, settings, events, guests, and guest-event assignments.
- "Discard Unsaved Changes" clears the local draft and reloads the last saved Supabase version. It does not delete saved wedding data.
- Event reordering uses existing `events.sort_order`; the dashboard updates local order immediately and persists the order on Save All Changes.
- Guest invite, preview, CSV export, and WhatsApp guest actions continue to build links from `window.location.origin`, so local URLs use localhost and production/custom domains use the current deployed origin.
- Guest WhatsApp actions open `wa.me` links only. They do not send messages automatically.
- RSVP analytics now use each guest/family `invited_count` as the primary people count. Family/group counts remain visible as secondary metrics.
- Dashboard/admin builder saves depend on the latest `wedding_settings` columns. If saving settings fails with a missing-column or schema-cache error, run `supabase/add_builder_settings_columns.sql`.
- Dashboard/admin event saves need current event columns plus authenticated insert/update/delete privileges. If saving Events fails with an RLS or permission error, run `supabase/fix_admin_events.sql`.
- To repair all dashboard/admin section editing permissions and current builder columns in one pass, run `supabase/fix_dashboard_admin_permissions.sql`.
- Draft weddings are visible in the couple dashboard and admin panel but not on public invite routes.
- Suspended weddings show an unavailable message on public invite routes.
- Admin pages rely on `public.is_admin()` in RLS policies.
- The app still keeps local development fallback support for legacy sample routes when Supabase is unavailable.

## Production Security Hardening Phase 1

For an existing Supabase project, run:

1. `supabase/security_hardening_phase_1.sql`
2. `supabase/data_integrity_phase_2.sql`
3. Refresh the PostgREST schema cache if Supabase does not detect the RPCs.
4. Deploy the frontend that calls the new RPCs.
5. Run the anonymous, couple, and admin checks listed below.

The migration removes anonymous direct access to `guests`,
`guest_event_invites`, and `rsvp_responses`. Do not rerun an older public-access
script that restores those policies. The current `public_invite_access_fix.sql`
is safe after Phase 1 and preserves RPC-only personalized invite access.

Manual checks:

- An anonymous request to `guests`, `guest_event_invites`, or `rsvp_responses`
  returns no rows/access denied.
- A valid paid and published invite code loads only its matching guest/events.
- An invalid code, unpaid wedding, draft wedding, and suspended wedding do not
  return personalized invite data.
- A couple cannot directly update `package_type`, `payment_status`, `status`,
  `published_at`, `owner_id`, or `created_by`.
- Admin payment, package, publish, suspend, guest, and RSVP controls still work.

## Data Integrity Hardening Phase 2

Run `supabase/data_integrity_phase_2.sql` after Phase 1. It adds
transactional RPCs for destructive dashboard operations:

- `save_wedding_relational_data(wedding_id, events, guests, mode)` saves event
  rows, guest rows, guest-event assignments, and intentional deletions in one
  transaction.
- `save_wedding_guests_transactional(wedding_id, guests, mode)` powers CSV
  append/replace imports without deleting current guests before validation.
- `replace_guest_event_invites_transactional(wedding_id, guest_id, event_ids, event_counts)`
  validates event ownership before replacing one guest's assignments and stores
  per-event invited counts.
- `delete_wedding_event_transactional(wedding_id, event_id)` validates ownership
  and reports how many guest assignments/RSVP responses will be removed by FK
  cascade.
- `delete_wedding_guests_transactional(wedding_id, guest_ids)` deletes selected
  guests atomically after validating every ID.

These RPCs require the current authenticated user to own the wedding or be an
admin. Existing foreign-key cascades still intentionally remove event/guest
assignments and RSVP rows when the corresponding event or guest is deleted.

For existing projects that already ran an older Phase 2 script, run
`supabase/add_event_invited_counts.sql`. It adds `events.event_show_invited_count`,
`guest_event_invites.invited_count`, initializes old guest-event assignments from
`guests.invited_count`, refreshes `get_public_invite_by_code`, and recreates the
transactional guest/event save RPCs.

Manual checks:

- Full dashboard save with event edits and guest invite edits either fully
  succeeds or leaves prior guests/invites intact.
- CSV replace with an invalid event column or duplicate invite code leaves the
  existing guest list unchanged.
- CSV append with a duplicate invite code shows an error and makes no partial
  inserts.
- Guest event checkbox changes do not clear old assignments when validation
  fails.
- Deleting an event shows the guest/RSVP impact warning and cascades only after
  confirmation.
- Bulk guest delete validates all selected guests before deleting any of them.
## Opening Reveal Skip Image Migration

Opening Reveal can skip the post-video reveal image with `wedding_settings.hero_skip_reveal_image`. For existing projects, run `supabase/add_skip_reveal_image.sql` before expecting this setting to persist.