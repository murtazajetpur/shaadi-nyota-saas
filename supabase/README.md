# Supabase Setup

These files prepare the Shaadi Nyota backend schema. The current app still uses mock sample data and `localStorage`; no runtime behavior has been migrated yet.

## 1. Create A Supabase Project

1. Go to the Supabase dashboard.
2. Create a new project.
3. Wait for the project database to finish provisioning.

## 2. Run The Schema

1. Open the Supabase SQL editor.
2. Paste the full contents of `supabase/schema.sql`.
3. Run the SQL.

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

It also adds primary keys, foreign keys, check constraints, indexes, comments, and a simple `updated_at` trigger helper.

## 3. Run The Seed

1. Open another SQL editor tab.
2. Paste the full contents of `supabase/seed.sql`.
3. Run the SQL.

The seed adds minimal setup data:

- Theme: `palace-door-opening`
- Reveal variation: default Ganesha reveal
- Music option: `Din Shagna Da`

It does not seed full weddings, guests, or RSVP responses yet.

## 4. Add Local Env Vars

Copy `.env.example` to `.env` and fill in:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Use the project URL and anon public key from the Supabase project settings.

Do not commit `.env`. It is ignored by git.

## 5. Current App Behavior

The current Vite React app is still in mock mode:

- wedding data comes from sample data/localStorage
- dashboard draft data stays in localStorage
- admin state stays in localStorage
- RSVP responses stay in localStorage

Future migration phases will wire these screens to Supabase gradually.
