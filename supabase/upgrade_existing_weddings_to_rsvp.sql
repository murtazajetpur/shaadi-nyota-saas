-- One-time upgrade for existing weddings that should now use the RSVP plan.
-- This changes old Basic Website rows and older compatibility package rows.

update public.weddings
set package_type = 'rsvp'
where package_type in ('basic', 'whatsapp');
