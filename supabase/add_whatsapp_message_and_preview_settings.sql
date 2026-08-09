-- Adds couple-configurable WhatsApp reminder and invitation link preview settings.
-- Run this once in the Supabase SQL editor for existing projects.

alter table public.wedding_settings
  add column if not exists whatsapp_invite_message text,
  add column if not exists whatsapp_reminder_message text,
  add column if not exists whatsapp_preview_title text,
  add column if not exists whatsapp_preview_description text,
  add column if not exists whatsapp_preview_image_src text;

comment on column public.wedding_settings.whatsapp_invite_message is
  'Message template used when a couple opens Send Invite in WhatsApp.';

comment on column public.wedding_settings.whatsapp_reminder_message is
  'Message template used when a couple opens Send Reminder in WhatsApp.';

comment on column public.wedding_settings.whatsapp_preview_title is
  'Open Graph title used for personalized invitation link previews.';

comment on column public.wedding_settings.whatsapp_preview_description is
  'Open Graph description used for personalized invitation link previews.';

comment on column public.wedding_settings.whatsapp_preview_image_src is
  'Public image URL or product asset path used for personalized invitation link previews.';

notify pgrst, 'reload schema';
