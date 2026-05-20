# Shaadi Nyota

Shaadi Nyota is a Supabase-backed Vite React MVP for premium wedding invitation websites with personalized guest links, guest-wise event visibility, RSVP, couple dashboard, and admin controls.

## Current Status

- Supabase Auth for couple/admin access
- Create Wedding onboarding
- Couple dashboard for wedding details, events, guests, CSV import/export, and RSVP dashboard
- Admin panel for package, payment, publish status, and selected-wedding editing
- Public wedding invite routes and personalized RSVP links
- Vercel SPA deployment support

## Key Docs

- [Backend Plan](./BACKEND_PLAN.md)
- [Migration Status](./MIGRATION_STATUS.md)
- [Deployment Notes](./DEPLOYMENT_NOTES.md)
- [Smoke Test Checklist](./SMOKE_TEST_CHECKLIST.md)
- [Themes](./THEMES.md)

## Local Development

```bash
npm install
npm run dev
```

Create a `.env` from `.env.example`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Do not put Supabase service role keys in frontend env vars.
