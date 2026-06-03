alter table public.weddings
  drop constraint if exists weddings_payment_status_check;

alter table public.weddings
  add constraint weddings_payment_status_check
  check (payment_status in ('unpaid', 'manual_pending', 'ref_pending', 'paid'));

comment on column public.weddings.payment_status is
  'Manual payment workflow values: unpaid, manual_pending, ref_pending, paid.';
