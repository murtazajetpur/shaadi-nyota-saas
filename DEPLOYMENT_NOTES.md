# Deployment Notes

## App Type

Shaadi Nyota is a Vite React single-page app. Vercel should serve `dist` after the Vite build, and client-side routes are handled by the SPA fallback in `vercel.json`.

## Vercel Settings

- Build command: `npm run build`
- Output directory: `dist`
- Install command: Vercel default is fine

## Required Vercel Environment Variables

Add these to the Vercel project environment:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Do not add the Supabase service role key to Vercel frontend environment variables. This app runs in the browser and must only use the anon public key.

## Supabase Auth URLs

For local development, keep this site URL available:

```text
http://localhost:5173
```

After Vercel deployment, add the production site URL:

```text
https://your-domain.vercel.app
```

Add redirect URL patterns if your auth settings require them:

```text
http://localhost:5173/*
https://your-domain.vercel.app/*
```

If a custom domain is added later, add that domain and wildcard redirect pattern as well.

## Routes To Test After Deployment

- `/`
- `/login`
- `/signup`
- `/create-wedding`
- `/dashboard`
- `/admin`
- `/{slug}`
- `/{slug}/invite/{inviteCode}`
- `/{slug}/invite/badcode`

Also test direct refresh on each route to confirm the Vercel SPA rewrite serves the app.

## Supabase Reminder

The current Supabase project is already used for development and testing. A fresh Supabase setup is not required before deploying this MVP, but before production launch we should verify a clean setup using:

1. `supabase/schema.sql`
2. `supabase/rls_policies.sql`
3. `supabase/seed.sql`
4. Vercel env vars
5. Supabase Auth settings

