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

- Public RSVP depends on `weddings.status = 'published'`.
- Draft weddings are visible in the couple dashboard and admin panel but not on public invite routes.
- Suspended weddings show an unavailable message on public invite routes.
- Admin pages rely on `public.is_admin()` in RLS policies.
- The app still keeps local development fallback support for legacy sample routes when Supabase is unavailable.
