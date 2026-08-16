-- One-time upgrade for existing weddings that should now use the Pro plan (stored as rsvp).
-- This changes old Basic rows and older compatibility package rows.

update public.weddings
set package_type = 'rsvp'
where package_type in ('basic', 'whatsapp');
