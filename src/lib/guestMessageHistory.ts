import { supabase } from './supabaseClient';

export type GuestMessageType = 'invitation' | 'reminder';

export type GuestMessageHistoryEntry = {
  id: string;
  weddingId: string;
  guestId: string;
  messageType: GuestMessageType;
  messageSnapshot: string;
  sentAt: string;
  recordedBy?: string;
  createdAt: string;
};

type GuestMessageHistoryRow = {
  id: string;
  wedding_id: string;
  guest_id: string;
  message_type: GuestMessageType;
  message_snapshot: string | null;
  sent_at: string;
  recorded_by: string | null;
  created_at: string;
};

const historySelect = 'id,wedding_id,guest_id,message_type,message_snapshot,sent_at,recorded_by,created_at';

const mapHistoryRow = (row: GuestMessageHistoryRow): GuestMessageHistoryEntry => ({
  id: row.id,
  weddingId: row.wedding_id,
  guestId: row.guest_id,
  messageType: row.message_type,
  messageSnapshot: row.message_snapshot ?? '',
  sentAt: row.sent_at,
  recordedBy: row.recorded_by ?? undefined,
  createdAt: row.created_at,
});

const trackingError = (detail: string) => {
  const normalized = detail.toLowerCase();
  if (normalized.includes('guest_message_history') && (
    normalized.includes('schema cache')
    || normalized.includes('does not exist')
    || normalized.includes('could not find the table')
  )) {
    return 'WhatsApp tracking is not configured yet. Run supabase/add_guest_message_history.sql and try again.';
  }

  return 'Could not update WhatsApp tracking. Please try again.';
};

export async function loadGuestMessageHistory(weddingId: string) {
  if (!supabase) return { entries: [], error: 'Supabase is not configured.', detail: '' };

  const { data, error } = await supabase
    .from('guest_message_history')
    .select(historySelect)
    .eq('wedding_id', weddingId)
    .order('sent_at', { ascending: false });

  return error
    ? { entries: [], error: trackingError(error.message), detail: error.message }
    : {
      entries: ((data ?? []) as GuestMessageHistoryRow[]).map(mapHistoryRow),
      error: '',
      detail: '',
    };
}

export async function recordGuestMessageSent({
  weddingId,
  guestId,
  messageType,
  messageSnapshot,
}: {
  weddingId: string;
  guestId: string;
  messageType: GuestMessageType;
  messageSnapshot: string;
}) {
  if (!supabase) return { entry: null, error: 'Supabase is not configured.', detail: '' };

  const { data, error } = await supabase
    .from('guest_message_history')
    .insert({
      wedding_id: weddingId,
      guest_id: guestId,
      message_type: messageType,
      message_snapshot: messageSnapshot,
    })
    .select(historySelect)
    .single();

  return error
    ? { entry: null, error: trackingError(error.message), detail: error.message }
    : { entry: mapHistoryRow(data as GuestMessageHistoryRow), error: '', detail: '' };
}

export async function removeGuestMessageHistoryEntry(weddingId: string, entryId: string) {
  if (!supabase) return { error: 'Supabase is not configured.', detail: '' };

  const { error } = await supabase
    .from('guest_message_history')
    .delete()
    .eq('wedding_id', weddingId)
    .eq('id', entryId);

  return error
    ? { error: trackingError(error.message), detail: error.message }
    : { error: '', detail: '' };
}
