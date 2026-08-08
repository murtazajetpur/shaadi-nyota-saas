-- Adds the couple-configurable WhatsApp invite message used by Dashboard > WhatsApp.
-- Run this once in the Supabase SQL editor for existing projects.

alter table public.wedding_settings
  add column if not exists whatsapp_invite_message text;

comment on column public.wedding_settings.whatsapp_invite_message is
  'Message template used when a couple opens Send Invite in WhatsApp.';

notify pgrst, 'reload schema';