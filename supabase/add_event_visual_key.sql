-- Add selected event visual support for existing Supabase projects.
alter table public.events
add column if not exists event_visual_key text;
