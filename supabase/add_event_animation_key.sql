alter table public.events
add column if not exists event_animation_key text not null default 'none';
