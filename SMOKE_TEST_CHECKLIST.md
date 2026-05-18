# Shaadi Nyota Smoke Test Checklist

## A. Local Smoke Test

- Run `npm.cmd run build`
- Run `npm.cmd run dev`
- Test `/login`
- Test `/signup`
- Test `/create-wedding`
- Test `/dashboard`
- Test `/admin`
- Test `/{slug}`
- Test `/{slug}/invite/{guestCode}`

## B. Couple Flow

- Signup or login as a couple user
- Create a wedding
- Select a package
- Edit couple details
- Add, edit, and delete an event
- Add, edit, and delete a guest
- Import guests with CSV
- Export guests CSV
- Check RSVP dashboard

## C. Admin Flow

- Set `profiles.role = admin` in Supabase for the admin test user
- View all weddings in `/admin`
- Mark a wedding as paid
- Publish a wedding
- Suspend and restore a wedding
- Change a wedding plan
- Edit another couple's events and guests through `/admin/weddings/{weddingId}`
- Verify admin guest and RSVP counts

## D. Guest Flow

- Open the public wedding URL
- Open a personalized invite URL
- Confirm only invited events are shown
- Submit RSVP
- Refresh and confirm RSVP pre-fills
- Check dashboard RSVP counts

## E. Deployment Smoke Test

- Confirm Vercel env vars are set:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Confirm Supabase Auth Site URL is updated
- Confirm Supabase Redirect URLs include Vercel and localhost
- Test direct deep links on Vercel:
  - `/dashboard`
  - `/admin`
  - `/{slug}`
  - `/{slug}/invite/{guestCode}`

