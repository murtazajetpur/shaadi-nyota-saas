# Supabase Setup

These files prepare the Shaadi Nyota Supabase backend used by the MVP app.

The current Supabase project is already being used for development and testing. You do not need to create a fresh Supabase project right now.

The setup order below is for future reproducibility and production-readiness testing. Before production launch, run through it on a fresh Supabase project to confirm the documented setup works end to end.

## Setup Order

1. Run `supabase/schema.sql`
2. Run `supabase/rls_policies.sql`
3. Run `supabase/seed.sql`
4. Add local env vars
5. Configure Auth settings, including Confirm Email behavior

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

## 5. Add Local Env Vars

Copy `.env.example` to `.env` and fill in:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Use the project URL and anon public key from Supabase project settings.

Do not commit `.env`. It is ignored by git.

## 6. Auth Notes

- Confirm Email can be disabled for local MVP testing.
- Signup passes `full_name` through Supabase Auth user metadata.
- The frontend does not insert into `public.profiles` during signup.
- The `public.handle_new_user()` database trigger should create the `profiles` row after a new auth user signs up.
- New profiles should default to `role = 'couple'`.
- To test admin access locally, manually update the test user's `profiles.role` to `admin` in Supabase.

## 7. Runtime Notes

- Active purchasable plans are `basic` (Basic Website, ₹3,000) and `rsvp` (Basic Website + RSVP Management, ₹5,000).
- A legacy package value remains in the schema only for existing records and is not shown as an active purchasable plan.
- Public RSVP depends on `weddings.status = 'published'`.
- Manual payment verification requests use `weddings.payment_status = 'manual_pending'`. The dashboard labels this as "Verification Requested". If an older database still only allows `unpaid` and `paid`, run `supabase/add_manual_payment_status.sql`.
- Basic Website dashboards show Guests and RSVP Dashboard as locked upgrade panels. Admin editing remains unrestricted.
- Dashboard/admin builder saves depend on the latest `wedding_settings` columns. If saving settings fails with a missing-column or schema-cache error, run `supabase/add_builder_settings_columns.sql`.
- Dashboard/admin event saves need current event columns plus authenticated insert/update/delete privileges. If saving Events fails with an RLS or permission error, run `supabase/fix_admin_events.sql`.
- To repair all dashboard/admin section editing permissions and current builder columns in one pass, run `supabase/fix_dashboard_admin_permissions.sql`.
- Draft weddings are visible in the couple dashboard and admin panel but not on public invite routes.
- Suspended weddings show an unavailable message on public invite routes.
- Admin pages rely on `public.is_admin()` in RLS policies.
- The app still keeps local development fallback support for legacy sample routes when Supabase is unavailable.
