-- Manual WhatsApp invitation/reminder tracking for dashboard users.
-- Run this once in the Supabase SQL editor, then reload the dashboard.

create table if not exists public.guest_message_history (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  message_type text not null check (message_type in ('invitation', 'reminder')),
  message_snapshot text not null default '',
  sent_at timestamptz not null default now(),
  recorded_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

comment on table public.guest_message_history is
  'Manual audit log for guest WhatsApp invitations and reminders.';
comment on column public.guest_message_history.sent_at is
  'Time the dashboard user confirmed that the message was sent.';

create index if not exists guest_message_history_wedding_id_idx
  on public.guest_message_history(wedding_id);
create index if not exists guest_message_history_guest_sent_idx
  on public.guest_message_history(guest_id, sent_at desc);

create or replace function public.validate_guest_message_history_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.guests
    where guests.id = new.guest_id
      and guests.wedding_id = new.wedding_id
  ) then
    raise exception 'Guest does not belong to this wedding.' using errcode = '23503';
  end if;

  return new;
end;
$$;

drop trigger if exists guest_message_history_validate_scope on public.guest_message_history;
create trigger guest_message_history_validate_scope
before insert or update of wedding_id, guest_id on public.guest_message_history
for each row execute function public.validate_guest_message_history_scope();

alter table public.guest_message_history enable row level security;

grant select, insert, delete on public.guest_message_history to authenticated;
revoke all on public.guest_message_history from anon;

drop policy if exists "Couples can manage own guest message history" on public.guest_message_history;
create policy "Couples can manage own guest message history"
on public.guest_message_history
for all
to authenticated
using (
  exists (
    select 1
    from public.weddings
    where weddings.id = guest_message_history.wedding_id
      and weddings.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.weddings
    where weddings.id = guest_message_history.wedding_id
      and weddings.owner_id = auth.uid()
  )
  and exists (
    select 1
    from public.guests
    where guests.id = guest_message_history.guest_id
      and guests.wedding_id = guest_message_history.wedding_id
  )
);

drop policy if exists "Admins can manage all guest message history" on public.guest_message_history;
create policy "Admins can manage all guest message history"
on public.guest_message_history
for all
to authenticated
using (public.is_admin())
with check (
  public.is_admin()
  and exists (
    select 1
    from public.guests
    where guests.id = guest_message_history.guest_id
      and guests.wedding_id = guest_message_history.wedding_id
  )
);
