-- Diagnostic helper for event_key conflicts.
-- Run this if Events saves report:
-- duplicate key value violates unique constraint "events_wedding_id_event_key_key"

select
  weddings.slug,
  events.wedding_id,
  events.event_key,
  count(*) as row_count,
  array_agg(events.id order by events.sort_order nulls last, events.created_at) as event_ids,
  array_agg(events.event_name order by events.sort_order nulls last, events.created_at) as event_names
from public.events
join public.weddings
  on weddings.id = events.wedding_id
where events.event_key is not null
group by weddings.slug, events.wedding_id, events.event_key
having count(*) > 1
order by weddings.slug, events.event_key;
