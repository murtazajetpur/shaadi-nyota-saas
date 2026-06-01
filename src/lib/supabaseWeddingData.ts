import {
  defaultDashboardWeddingSlug,
  getWeddingBySlug,
  type MealPreference,
  type PackageType,
  type RevealImageType,
  type RevealStyle,
  type PaymentStatus,
  type RsvpStatus,
  type SampleWeddingData,
  type StoredRsvpResponse,
  type WeddingEvent,
  type WeddingGuest,
  type WeddingStatus,
} from '../data/sampleWeddingData';
import { normalizeEventAnimationKey } from '../data/eventAnimations';
import { supabase } from './supabaseClient';

export type WebsiteStatus = 'draft' | 'published' | 'suspended';

export interface SupabaseWeddingRow {
  id: string;
  owner_id?: string | null;
  created_by?: string | null;
  slug: string;
  package_type: PackageType;
  status: WebsiteStatus;
  payment_status: 'unpaid' | 'paid';
  theme_key: string | null;
  page_title: string | null;
  bride_name: string | null;
  groom_name: string | null;
  display_name: string | null;
  published_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface SupabaseWeddingSettingsRow {
  hero_reveal_style: RevealStyle | null;
  hero_reveal_cta_text: string | null;
  hero_scroll_hint_text: string | null;
  hero_video_src: string | null;
  hero_poster_src: string | null;
  hero_reveal_image_src: string | null;
  hero_reveal_image_type: RevealImageType | null;
  hero_reveal_image_alt: string | null;
  hero_reveal_image_show_at_seconds: number | null;
  hero_fade_at_seconds: number | null;
  music_audio_src: string | null;
  music_title: string | null;
  couple_enabled: boolean | null;
  couple_intro_line: string | null;
  couple_blessing_line: string | null;
  couple_background_image_src: string | null;
  story_title: string | null;
  story_text: string | null;
  story_image_src: string | null;
  story_image_alt: string | null;
  rsvp_enabled: boolean | null;
  rsvp_title: string | null;
  rsvp_subtitle: string | null;
  rsvp_labels: Record<string, unknown> | null;
  rsvp_meal_preference_enabled: boolean | null;
  rsvp_meal_options: Record<string, unknown> | null;
  rsvp_success_message: unknown;
  closing_enabled: boolean | null;
  closing_layout: 'simple' | 'gallery' | null;
  closing_include_photos: boolean | null;
  closing_line: string | null;
  closing_couple_display_name: string | null;
  closing_message: string | null;
  closing_carousel_images: unknown;
  closing_gallery_images?: unknown;
  closing_frame_image_src: string | null;
}

interface SupabaseEventRow {
  id: string;
  wedding_id: string;
  event_key: string | null;
  event_visual_key: string | null;
  event_text_style: WeddingEvent['eventTextStyle'] | null;
  event_animation_key: WeddingEvent['eventAnimationKey'] | null;
  event_name: string;
  date_label: string | null;
  start_time_label: string | null;
  venue_name: string | null;
  city: string | null;
  maps_url: string | null;
  dress_code: string | null;
  foreground_image_src: string | null;
  background_image_src: string | null;
  calendar_title: string | null;
  calendar_description: string | null;
  sort_order: number | null;
}

interface SupabaseGuestRow {
  id: string;
  wedding_id: string;
  guest_name: string;
  phone: string | null;
  invited_count: number | null;
  category: string | null;
  invite_code: string;
  meal_preference: MealPreference | null;
}

interface SupabaseGuestEventInviteRow {
  guest_id: string;
  event_id: string;
}

interface SupabaseRsvpResponseRow {
  wedding_id: string;
  guest_id: string;
  event_id: string;
  status: Exclude<RsvpStatus, ''>;
  updated_at: string | null;
}

const fallbackWedding = () => {
  const wedding = getWeddingBySlug(defaultDashboardWeddingSlug);
  return JSON.parse(JSON.stringify(wedding)) as SampleWeddingData;
};

const valueOr = <T>(value: T | null | undefined, fallback: T) => value ?? fallback;

const parseJsonStringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;

  const paths = value
    .map((item) => {
      if (typeof item === 'string') return item;
      if (
        item &&
        typeof item === 'object' &&
        'src' in item &&
        typeof (item as { src?: unknown }).src === 'string'
      ) {
        return (item as { src: string }).src;
      }
      return '';
    })
    .filter(Boolean);

  return paths;
};

const readJsonStringArray = (value: unknown, fallback: string[]) => {
  return parseJsonStringArray(value) ?? fallback;
};

const readFirstJsonStringArray = (values: unknown[], fallback: string[]) => {
  const parsedValues = values
    .map(parseJsonStringArray)
    .filter((value): value is string[] => Boolean(value));
  const firstWithImages = parsedValues.find((value) => value.length > 0);
  return firstWithImages ?? parsedValues[0] ?? fallback;
};

const readJsonLabels = (
  value: Record<string, unknown> | null,
  fallback: SampleWeddingData['rsvp']
) => ({
  nameQuestion: typeof value?.nameQuestion === 'string' ? value.nameQuestion : fallback.nameQuestion,
  namePlaceholder: typeof value?.namePlaceholder === 'string' ? value.namePlaceholder : fallback.namePlaceholder,
  attendanceQuestion: typeof value?.attendanceQuestion === 'string' ? value.attendanceQuestion : fallback.attendanceQuestion,
  phoneQuestion: typeof value?.phoneQuestion === 'string' ? value.phoneQuestion : fallback.phoneQuestion,
  phonePlaceholder: typeof value?.phonePlaceholder === 'string' ? value.phonePlaceholder : fallback.phonePlaceholder,
  responseOptions: {
    ...fallback.responseOptions,
    ...(typeof value?.responseOptions === 'object' && value.responseOptions ? value.responseOptions : {}),
  },
});

const readMealOptions = (
  value: Record<string, unknown> | null,
  fallback: SampleWeddingData['rsvp']['mealOptions']
) => ({
  ...fallback,
  ...(value ?? {}),
}) as SampleWeddingData['rsvp']['mealOptions'];

const normalizeRevealImageShowAtSeconds = (
  revealStyle: SampleWeddingData['hero']['revealStyle'],
  revealImageShowAtSeconds: number,
  videoSrc: string
) => {
  if ((revealStyle === 'envelope' || videoSrc.includes('/assets/hero-v1.mp4')) && revealImageShowAtSeconds === 5.0) {
    return 5.5;
  }

  return revealImageShowAtSeconds;
};

const normalizeEventTextStyle = (value?: string | null): WeddingEvent['eventTextStyle'] => (
  value === 'light' || value === 'dark' ? value : 'auto'
);

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value: string) => uuidPattern.test(value);

const normalizeEventLookupKey = (value?: string | null) => (
  value?.trim().toLowerCase().replace(/\s+/g, '-') ?? ''
);

type EventIdLookupSource = {
  id: string;
  eventKey?: string | null;
  eventName?: string | null;
  event_key?: string | null;
  event_name?: string | null;
};

const createEventIdResolver = (events: EventIdLookupSource[] = []) => {
  const lookup = new Map<string, string>();

  events.forEach((event) => {
    if (!isUuid(event.id)) return;
    [event.id, event.eventKey ?? event.event_key, event.eventName ?? event.event_name]
      .map(normalizeEventLookupKey)
      .filter(Boolean)
      .forEach((key) => lookup.set(key, event.id));
  });

  return (eventIdOrKey: string) => {
    if (isUuid(eventIdOrKey)) return eventIdOrKey;
    return lookup.get(normalizeEventLookupKey(eventIdOrKey)) ?? '';
  };
};

const getSupabaseEventIdResolver = async (weddingId: string, events: WeddingEvent[] = []) => {
  if (!supabase) return { resolveEventId: createEventIdResolver(events), error: '' };

  const { data, error } = await supabase
    .from('events')
    .select('id,event_key,event_name')
    .eq('wedding_id', weddingId);

  if (error) return { resolveEventId: createEventIdResolver(events), error: error.message };

  return {
    resolveEventId: createEventIdResolver([
      ...events,
      ...((data ?? []) as EventIdLookupSource[]),
    ]),
    error: '',
  };
};

const resolveSupabaseEventIdsForWedding = async (
  weddingId: string,
  eventIds: string[],
  events: WeddingEvent[] = []
) => {
  const { resolveEventId, error } = await getSupabaseEventIdResolver(weddingId, events);
  if (error) return { resolvedIds: [], unresolvedIds: [], error };

  const resolvedIds = eventIds
    .map(resolveEventId)
    .filter((eventId, index, allIds) => Boolean(eventId) && allIds.indexOf(eventId) === index);
  const unresolvedIds = eventIds.filter((eventId) => !resolveEventId(eventId));

  return { resolvedIds, unresolvedIds, error: '' };
};

const mapEventRow = (row: SupabaseEventRow): WeddingEvent => ({
  id: row.id,
  eventKey: row.event_key ?? '',
  eventVisualKey: row.event_visual_key ?? '',
  eventTextStyle: normalizeEventTextStyle(row.event_text_style),
  eventAnimationKey: normalizeEventAnimationKey(row.event_animation_key),
  eventName: row.event_name,
  date: row.date_label ?? '',
  startTime: row.start_time_label ?? '',
  venueName: row.venue_name ?? '',
  city: row.city ?? '',
  mapsUrl: row.maps_url ?? '',
  dressCode: row.dress_code ?? '',
  foregroundImageSrc: row.foreground_image_src ?? '/assets/reception.png',
  backgroundImageSrc: row.background_image_src ?? '/assets/reception-bg.png',
  calendarTitle: row.calendar_title ?? row.event_name,
  calendarDescription: row.calendar_description ?? '',
});

const mapGuestRows = (
  guests: SupabaseGuestRow[],
  invites: SupabaseGuestEventInviteRow[]
): WeddingGuest[] => guests.map((guest) => ({
  id: guest.id,
  guestName: guest.guest_name,
  phone: guest.phone ?? '',
  invitedCount: guest.invited_count ?? 1,
  category: guest.category ?? '',
  inviteCode: guest.invite_code,
  invitedEventIds: invites
    .filter((invite) => invite.guest_id === guest.id)
    .map((invite) => invite.event_id),
  mealPreference: guest.meal_preference ?? '',
}));

const mapWeddingBundle = (
  wedding: SupabaseWeddingRow,
  settings: SupabaseWeddingSettingsRow | null,
  events: SupabaseEventRow[],
  guests: SupabaseGuestRow[] = [],
  invites: SupabaseGuestEventInviteRow[] = []
): SampleWeddingData => {
  const fallback = fallbackWedding();
  const displayName = wedding.display_name ?? ([wedding.groom_name, wedding.bride_name].filter(Boolean).join(' & ') || fallback.couple.displayName);
  const rsvpLabels = readJsonLabels(settings?.rsvp_labels ?? null, fallback.rsvp);
  const revealStyle = valueOr(settings?.hero_reveal_style, fallback.hero.revealStyle);
  const heroVideoSrc = valueOr(settings?.hero_video_src, fallback.hero.videoSrc);
  const revealImageShowAtSeconds = Number(valueOr(settings?.hero_reveal_image_show_at_seconds, fallback.hero.revealImageShowAtSeconds));

  const closingGalleryImages = readFirstJsonStringArray(
    [settings?.closing_carousel_images, settings?.closing_gallery_images],
    fallback.closing.carouselImages
  );

  return {
    ...fallback,
    wedding: {
      slug: wedding.slug,
      packageType: wedding.package_type,
      status: wedding.status as WeddingStatus,
      paymentStatus: wedding.payment_status as PaymentStatus,
      themeKey: wedding.theme_key ?? fallback.wedding.themeKey,
      pageTitle: wedding.page_title || `${displayName} | Shaadi Nyota`,
    },
    hero: {
      revealStyle,
      revealCtaText: valueOr(settings?.hero_reveal_cta_text, fallback.hero.revealCtaText),
      scrollHintText: valueOr(settings?.hero_scroll_hint_text, fallback.hero.scrollHintText),
      videoSrc: heroVideoSrc,
      posterSrc: valueOr(settings?.hero_poster_src, fallback.hero.posterSrc),
      revealImageSrc: valueOr(settings?.hero_reveal_image_src, fallback.hero.revealImageSrc),
      revealImageType: valueOr(settings?.hero_reveal_image_type, fallback.hero.revealImageType),
      revealImageAlt: valueOr(settings?.hero_reveal_image_alt, fallback.hero.revealImageAlt),
      revealImageShowAtSeconds: normalizeRevealImageShowAtSeconds(revealStyle, revealImageShowAtSeconds, heroVideoSrc),
      heroFadeAtSeconds: Number(valueOr(settings?.hero_fade_at_seconds, fallback.hero.heroFadeAtSeconds)),
    },
    music: {
      audioSrc: valueOr(settings?.music_audio_src, fallback.music.audioSrc),
      title: valueOr(settings?.music_title, fallback.music.title),
    },
    couple: {
      enabled: settings?.couple_enabled ?? fallback.couple.enabled,
      brideName: wedding.bride_name ?? fallback.couple.brideName,
      groomName: wedding.groom_name ?? fallback.couple.groomName,
      displayName,
      introLine: settings?.couple_intro_line ?? '',
      blessingLine: valueOr(settings?.couple_blessing_line, fallback.couple.blessingLine),
      storyTitle: settings?.story_title ?? '',
      storyText: settings?.story_text ?? '',
      backgroundImageSrc: valueOr(settings?.story_image_src, valueOr(settings?.couple_background_image_src, fallback.couple.backgroundImageSrc)),
      imageAlt: valueOr(settings?.story_image_alt, fallback.couple.imageAlt),
    },
    events: events.map(mapEventRow),
    rsvp: {
      ...fallback.rsvp,
      enabled: settings?.rsvp_enabled ?? fallback.rsvp.enabled,
      title: valueOr(settings?.rsvp_title, fallback.rsvp.title),
      subtitle: valueOr(settings?.rsvp_subtitle, fallback.rsvp.subtitle),
      ...rsvpLabels,
      mealPreferenceEnabled: settings?.rsvp_meal_preference_enabled ?? fallback.rsvp.mealPreferenceEnabled,
      mealOptions: readMealOptions(settings?.rsvp_meal_options ?? null, fallback.rsvp.mealOptions),
      successMessage: readJsonStringArray(settings?.rsvp_success_message, fallback.rsvp.successMessage),
      guests: mapGuestRows(guests, invites),
    },
    closing: {
      enabled: settings?.closing_enabled ?? fallback.closing.enabled,
      includePhotos: settings?.closing_include_photos ?? (settings?.closing_layout ? settings.closing_layout === 'gallery' : closingGalleryImages.length > 0 || fallback.closing.includePhotos),
      coupleDisplayName: valueOr(settings?.closing_couple_display_name, displayName),
      closingLine: valueOr(settings?.closing_line, fallback.closing.closingLine),
      message: valueOr(settings?.closing_message, fallback.closing.message),
      carouselImages: closingGalleryImages,
      frameImageSrc: valueOr(settings?.closing_frame_image_src, fallback.closing.frameImageSrc),
    },
  };
};

export async function loadSupabaseWeddingBundle(
  weddingId: string,
  options: { includeGuests?: boolean } = {}
) {
  if (!supabase) return { wedding: null, error: 'Supabase is not configured.' };

  const [{ data: wedding, error: weddingError }, { data: settings, error: settingsError }, { data: events, error: eventsError }] = await Promise.all([
    supabase.from('weddings').select('*').eq('id', weddingId).single(),
    supabase.from('wedding_settings').select('*').eq('wedding_id', weddingId).maybeSingle(),
    supabase.from('events').select('*').eq('wedding_id', weddingId).order('sort_order', { ascending: true }),
  ]);

  if (weddingError) return { wedding: null, error: weddingError.message };
  if (settingsError) return { wedding: null, error: settingsError.message };
  if (eventsError) return { wedding: null, error: eventsError.message };

  let guests: SupabaseGuestRow[] = [];
  let invites: SupabaseGuestEventInviteRow[] = [];

  if (options.includeGuests) {
    const [{ data: guestRows, error: guestsError }, { data: inviteRows, error: invitesError }] = await Promise.all([
      supabase.from('guests').select('*').eq('wedding_id', weddingId).order('created_at', { ascending: true }),
      supabase.from('guest_event_invites').select('guest_id,event_id').eq('wedding_id', weddingId),
    ]);
    if (guestsError) return { wedding: null, error: guestsError.message };
    if (invitesError) return { wedding: null, error: invitesError.message };
    guests = (guestRows ?? []) as SupabaseGuestRow[];
    invites = (inviteRows ?? []) as SupabaseGuestEventInviteRow[];
  }

  return {
    wedding: mapWeddingBundle(
      wedding as SupabaseWeddingRow,
      settings as SupabaseWeddingSettingsRow | null,
      (events ?? []) as SupabaseEventRow[],
      guests,
      invites
    ),
    weddingId,
    row: wedding as SupabaseWeddingRow,
    error: '',
  };
}

export async function loadSupabaseWeddingBySlug(slug: string, options: { includeGuests?: boolean } = {}) {
  if (!supabase) return { wedding: null, weddingId: '', error: 'Supabase is not configured.' };

  const { data, error } = await supabase
    .from('weddings')
    .select('id')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) return { wedding: null, weddingId: '', error: error.message };
  if (!data) return { wedding: null, weddingId: '', error: 'This wedding website is not published or the link is invalid.' };

  return loadSupabaseWeddingBundle(data.id as string, options);
}

export async function loadSupabasePersonalizedInvite(slug: string, inviteCode: string) {
  if (!supabase) return { wedding: null, weddingId: '', guest: undefined, visibleEvents: undefined, error: 'Supabase is not configured.' };

  const publicBundle = await loadSupabaseWeddingBySlug(slug, { includeGuests: false });
  if (!publicBundle.wedding || !publicBundle.weddingId) return { ...publicBundle, guest: undefined, visibleEvents: undefined };

  const { data: guestRow, error: guestError } = await supabase
    .from('guests')
    .select('*')
    .eq('wedding_id', publicBundle.weddingId)
    .eq('invite_code', inviteCode)
    .maybeSingle();

  if (guestError) return { ...publicBundle, guest: undefined, visibleEvents: undefined, error: guestError.message };
  if (!guestRow) return { ...publicBundle, guest: undefined, visibleEvents: undefined, error: '' };

  const { data: inviteRows, error: invitesError } = await supabase
    .from('guest_event_invites')
    .select('guest_id,event_id')
    .eq('wedding_id', publicBundle.weddingId)
    .eq('guest_id', guestRow.id);

  if (invitesError) return { ...publicBundle, guest: undefined, visibleEvents: undefined, error: invitesError.message };

  const guest = mapGuestRows([guestRow as SupabaseGuestRow], (inviteRows ?? []) as SupabaseGuestEventInviteRow[])[0];
  const visibleEvents = publicBundle.wedding.events.filter((event) => guest.invitedEventIds.includes(event.id));

  return {
    ...publicBundle,
    guest,
    visibleEvents,
    error: '',
  };
}

const isMissingEventAnimationColumnError = (message?: string | null) => (
  Boolean(message?.toLowerCase().includes('event_animation_key'))
);

const getEventKeyForStorage = (event: WeddingEvent) => (
  event.eventKey?.trim() || (!isUuid(event.id) ? event.id : null)
);

const eventToRow = (weddingId: string, event: WeddingEvent, sortOrder: number, includeAnimationKey = true) => ({
  id: isUuid(event.id) ? event.id : undefined,
  wedding_id: weddingId,
  event_key: getEventKeyForStorage(event),
  event_visual_key: event.eventVisualKey?.trim() || null,
  event_text_style: normalizeEventTextStyle(event.eventTextStyle),
  ...(includeAnimationKey ? { event_animation_key: normalizeEventAnimationKey(event.eventAnimationKey) } : {}),
  event_name: event.eventName.trim() || 'Untitled Event',
  date_label: event.date,
  start_time_label: event.startTime,
  venue_name: event.venueName,
  city: event.city,
  maps_url: event.mapsUrl,
  dress_code: event.dressCode,
  foreground_image_src: event.foregroundImageSrc,
  background_image_src: event.backgroundImageSrc,
  calendar_title: event.calendarTitle,
  calendar_description: event.calendarDescription,
  sort_order: sortOrder,
});

export async function createSupabaseEvent(weddingId: string, event: WeddingEvent, sortOrder: number) {
  if (!supabase) return { event: null, error: 'Supabase is not configured.' };
  const supabaseClient = supabase;
  const insertEvent = (includeAnimationKey = true) => supabaseClient
    .from('events')
    .insert({
      ...eventToRow(weddingId, event, sortOrder, includeAnimationKey),
      id: undefined,
    })
    .select('*')
    .single();
  let { data, error } = await insertEvent();
  if (isMissingEventAnimationColumnError(error?.message)) {
    ({ data, error } = await insertEvent(false));
  }

  return error
    ? { event: null, error: error.message }
    : { event: mapEventRow(data as SupabaseEventRow), error: '' };
}

export async function saveSupabaseEvents(weddingId: string, events: WeddingEvent[]) {
  if (!supabase) return { error: 'Supabase is not configured.' };
  const supabaseClient = supabase;

  const { data: existingRows, error: existingError } = await supabaseClient
    .from('events')
    .select('id,event_key,event_name')
    .eq('wedding_id', weddingId);

  if (existingError) return { error: existingError.message };

  const existingEventRows = (existingRows ?? []) as EventIdLookupSource[];
  const resolveExistingEventId = createEventIdResolver(existingEventRows);
  const eventsWithUuidIds: WeddingEvent[] = [];

  for (const [index, event] of events.entries()) {
    if (isUuid(event.id)) {
      eventsWithUuidIds.push(event);
      continue;
    }

    const matchedEventId = resolveExistingEventId(getEventKeyForStorage(event) ?? '')
      || resolveExistingEventId(event.eventName)
      || resolveExistingEventId(event.id);

    if (matchedEventId) {
      eventsWithUuidIds.push({ ...event, id: matchedEventId, eventKey: event.eventKey || event.id });
      continue;
    }

    const created = await createSupabaseEvent(weddingId, event, index);
    if (created.error || !created.event) {
      return { error: created.error || 'Could not create event.', events: eventsWithUuidIds };
    }
    eventsWithUuidIds.push(created.event);
  }

  const nextIds = new Set(eventsWithUuidIds.map((event) => event.id));
  const idsToDelete = existingEventRows
    .map((row) => row.id)
    .filter((id) => !nextIds.has(id));

  if (idsToDelete.length) {
    const { error: deleteError } = await supabaseClient
      .from('events')
      .delete()
      .eq('wedding_id', weddingId)
      .in('id', idsToDelete);
    if (deleteError) return { error: deleteError.message };
  }

  if (!eventsWithUuidIds.length) return { error: '', events: eventsWithUuidIds };

  const upsertEvents = (includeAnimationKey = true) => supabaseClient
    .from('events')
    .upsert(eventsWithUuidIds.map((event, index) => eventToRow(weddingId, event, index, includeAnimationKey)), { onConflict: 'id' });
  let { error } = await upsertEvents();
  if (isMissingEventAnimationColumnError(error?.message)) {
    ({ error } = await upsertEvents(false));
  }

  return { error: error?.message ?? '', events: eventsWithUuidIds };
}

const getSchemaCacheMissingColumn = (errorMessage?: string) => {
  if (!errorMessage?.includes('schema cache')) return '';
  const match = errorMessage.match(/'([^']+)' column/);
  return match?.[1] ?? '';
};

const closingSettingsColumns = new Set([
  'closing_include_photos',
  'closing_layout',
  'closing_line',
  'closing_couple_display_name',
  'closing_message',
  'closing_frame_image_src',
  'closing_carousel_images',
  'closing_gallery_images',
]);

export async function saveSupabaseWeddingSettings(weddingId: string, wedding: SampleWeddingData) {
  if (!supabase) return { error: 'Supabase is not configured.' };

  const basePayload = {
    wedding_id: weddingId,
    hero_reveal_style: wedding.hero.revealStyle,
    hero_reveal_cta_text: wedding.hero.revealCtaText,
    hero_scroll_hint_text: wedding.hero.scrollHintText,
    hero_video_src: wedding.hero.videoSrc,
    hero_poster_src: wedding.hero.posterSrc,
    hero_reveal_image_src: wedding.hero.revealImageSrc,
    hero_reveal_image_type: wedding.hero.revealImageType,
    hero_reveal_image_alt: wedding.hero.revealImageAlt,
    hero_reveal_image_show_at_seconds: wedding.hero.revealImageShowAtSeconds,
    hero_fade_at_seconds: wedding.hero.heroFadeAtSeconds,
    music_audio_src: wedding.music.audioSrc,
    music_title: wedding.music.title,
    couple_enabled: wedding.couple.enabled,
    couple_intro_line: wedding.couple.introLine,
    couple_blessing_line: wedding.couple.blessingLine,
    couple_background_image_src: wedding.couple.backgroundImageSrc,
    story_title: wedding.couple.storyTitle,
    story_text: wedding.couple.storyText,
    story_image_src: wedding.couple.backgroundImageSrc,
    story_image_alt: wedding.couple.imageAlt,
    rsvp_enabled: wedding.rsvp.enabled,
    rsvp_title: wedding.rsvp.title,
    rsvp_subtitle: wedding.rsvp.subtitle,
    rsvp_labels: {
      nameQuestion: wedding.rsvp.nameQuestion,
      namePlaceholder: wedding.rsvp.namePlaceholder,
      attendanceQuestion: wedding.rsvp.attendanceQuestion,
      phoneQuestion: wedding.rsvp.phoneQuestion,
      phonePlaceholder: wedding.rsvp.phonePlaceholder,
      responseOptions: wedding.rsvp.responseOptions,
    },
    rsvp_meal_preference_enabled: wedding.rsvp.mealPreferenceEnabled,
    rsvp_meal_options: wedding.rsvp.mealOptions,
    rsvp_success_message: wedding.rsvp.successMessage,
    closing_include_photos: wedding.closing.includePhotos,
    closing_layout: wedding.closing.includePhotos ? 'gallery' : 'simple',
    closing_line: wedding.closing.closingLine,
    closing_couple_display_name: wedding.closing.coupleDisplayName,
    closing_message: wedding.closing.message,
    closing_frame_image_src: wedding.closing.frameImageSrc,
  };

  const payload: Record<string, unknown> = {
    ...basePayload,
    // Write both names when available. Older projects may have either column.
    closing_carousel_images: wedding.closing.carouselImages,
    closing_gallery_images: wedding.closing.carouselImages,
  };
  const removedColumns = new Set<string>();

  for (let attempt = 0; attempt <= closingSettingsColumns.size; attempt += 1) {
    const { error } = await supabase
      .from('wedding_settings')
      .upsert(payload, { onConflict: 'wedding_id' });

    if (!error) {
      const hasGalleryImages = wedding.closing.carouselImages.filter(Boolean).length > 0;
      if (
        hasGalleryImages &&
        removedColumns.has('closing_carousel_images') &&
        removedColumns.has('closing_gallery_images')
      ) {
        return {
          error: 'Closing Gallery photos could not be saved because wedding_settings is missing both closing_carousel_images and closing_gallery_images. Run the latest Closing Gallery migration SQL.',
        };
      }
      return { error: '' };
    }

    const missingColumn = getSchemaCacheMissingColumn(error.message);
    if (missingColumn && closingSettingsColumns.has(missingColumn) && missingColumn in payload) {
      delete payload[missingColumn];
      removedColumns.add(missingColumn);
      continue;
    }

    return { error: error.message };
  }

  return { error: 'Could not save wedding settings because required wedding_settings columns are missing.' };
}

export async function deleteSupabaseEvent(eventId: string) {
  if (!supabase) return { error: 'Supabase is not configured.' };
  const { error } = await supabase.from('events').delete().eq('id', eventId);
  return { error: error?.message ?? '' };
}

const guestToRow = (weddingId: string, guest: WeddingGuest) => ({
  id: guest.id,
  wedding_id: weddingId,
  guest_name: guest.guestName.trim() || 'Unnamed Guest',
  phone: guest.phone,
  invited_count: Math.max(1, Number(guest.invitedCount) || 1),
  category: guest.category,
  invite_code: guest.inviteCode,
  meal_preference: guest.mealPreference || null,
});

export async function createSupabaseGuest(weddingId: string, guest: WeddingGuest) {
  if (!supabase) return { guest: null, error: 'Supabase is not configured.' };

  const { data, error } = await supabase
    .from('guests')
    .insert({
      ...guestToRow(weddingId, guest),
      id: undefined,
    })
    .select('*')
    .single();

  return error
    ? { guest: null, error: error.message }
    : {
      guest: mapGuestRows([data as SupabaseGuestRow], [])[0],
      error: '',
    };
}

export async function replaceSupabaseGuestInvites(
  weddingId: string,
  guestId: string,
  eventIds: string[],
  events: WeddingEvent[] = []
) {
  if (!supabase) return { error: 'Supabase is not configured.' };

  const { error: deleteError } = await supabase
    .from('guest_event_invites')
    .delete()
    .eq('wedding_id', weddingId)
    .eq('guest_id', guestId);

  if (deleteError) return { error: deleteError.message };
  const { resolvedIds, unresolvedIds, error: resolveError } = await resolveSupabaseEventIdsForWedding(weddingId, eventIds, events);
  if (resolveError) return { error: resolveError };
  if (unresolvedIds.length) {
    return { error: `Could not save guest event invites because these event selections do not map to Supabase event UUIDs: ${unresolvedIds.join(', ')}` };
  }
  if (!resolvedIds.length) return { error: '' };

  const { error } = await supabase
    .from('guest_event_invites')
    .insert(resolvedIds.map((eventId) => ({ wedding_id: weddingId, guest_id: guestId, event_id: eventId })));

  return { error: error?.message ?? '' };
}

export async function saveSupabaseGuests(weddingId: string, guests: WeddingGuest[], events: WeddingEvent[] = []) {
  if (!supabase) return { error: 'Supabase is not configured.' };

  const { data: existingRows, error: existingError } = await supabase
    .from('guests')
    .select('id')
    .eq('wedding_id', weddingId);

  if (existingError) return { error: existingError.message };

  const nextIds = new Set(guests.map((guest) => guest.id));
  const idsToDelete = ((existingRows ?? []) as Array<{ id: string }>)
    .map((row) => row.id)
    .filter((id) => !nextIds.has(id));

  if (idsToDelete.length) {
    const { error: deleteError } = await supabase
      .from('guests')
      .delete()
      .eq('wedding_id', weddingId)
      .in('id', idsToDelete);
    if (deleteError) return { error: deleteError.message };
  }

  if (guests.length) {
    const { error: upsertError } = await supabase
      .from('guests')
      .upsert(guests.map((guest) => guestToRow(weddingId, guest)), { onConflict: 'id' });
    if (upsertError) return { error: upsertError.message };
  }

  const { error: deleteInvitesError } = await supabase
    .from('guest_event_invites')
    .delete()
    .eq('wedding_id', weddingId);

  if (deleteInvitesError) return { error: deleteInvitesError.message };

  const { resolveEventId, error: resolveError } = await getSupabaseEventIdResolver(weddingId, events);
  if (resolveError) return { error: resolveError };

  const unresolvedSelections = new Set<string>();
  const inviteRows = guests.flatMap((guest) => {
    const resolvedIds = guest.invitedEventIds
      .map(resolveEventId)
      .filter((eventId, index, allIds) => Boolean(eventId) && allIds.indexOf(eventId) === index);
    const unresolvedIds = guest.invitedEventIds.filter((eventId) => !resolveEventId(eventId));
    unresolvedIds.forEach((eventId) => unresolvedSelections.add(eventId));
    return resolvedIds.map((eventId) => ({ wedding_id: weddingId, guest_id: guest.id, event_id: eventId }));
  });

  if (unresolvedSelections.size) {
    return { error: `Could not save guest event invites because these event selections do not map to Supabase event UUIDs: ${Array.from(unresolvedSelections).join(', ')}` };
  }

  if (!inviteRows.length) return { error: '' };

  const { error } = await supabase.from('guest_event_invites').insert(inviteRows);
  return { error: error?.message ?? '' };
}

export async function deleteSupabaseGuest(guestId: string) {
  if (!supabase) return { error: 'Supabase is not configured.' };
  const { error } = await supabase.from('guests').delete().eq('id', guestId);
  return { error: error?.message ?? '' };
}

export async function importSupabaseGuests(
  weddingId: string,
  guests: WeddingGuest[],
  mode: 'append' | 'replace',
  events: WeddingEvent[] = []
) {
  if (!supabase) return { error: 'Supabase is not configured.' };

  if (mode === 'replace') {
    const { error: deleteError } = await supabase.from('guests').delete().eq('wedding_id', weddingId);
    if (deleteError) return { error: deleteError.message };
  }

  for (const guest of guests) {
    const { data, error } = await supabase
      .from('guests')
      .insert({
        wedding_id: weddingId,
        guest_name: guest.guestName.trim() || 'Unnamed Guest',
        phone: guest.phone,
        invited_count: Math.max(1, Number(guest.invitedCount) || 1),
        category: guest.category,
        invite_code: guest.inviteCode,
        meal_preference: guest.mealPreference || null,
      })
      .select('id')
      .single();
    if (error) return { error: error.message };

    const { resolvedIds, unresolvedIds, error: resolveError } = await resolveSupabaseEventIdsForWedding(weddingId, guest.invitedEventIds, events);
    if (resolveError) return { error: resolveError };
    if (unresolvedIds.length) {
      return { error: `Could not import guests because these event selections do not map to Supabase event UUIDs: ${unresolvedIds.join(', ')}` };
    }
    if (resolvedIds.length) {
      const { error: inviteError } = await supabase
        .from('guest_event_invites')
        .insert(resolvedIds.map((eventId) => ({ wedding_id: weddingId, guest_id: data.id, event_id: eventId })));
      if (inviteError) return { error: inviteError.message };
    }
  }

  return { error: '' };
}

export async function loadSupabaseRsvpResponses(
  weddingId: string,
  weddingSlug: string,
  guests: WeddingGuest[]
) {
  if (!supabase) return { responses: [], error: 'Supabase is not configured.' };

  const { data, error } = await supabase
    .from('rsvp_responses')
    .select('wedding_id,guest_id,event_id,status,updated_at')
    .eq('wedding_id', weddingId);

  if (error) return { responses: [], error: error.message };

  const guestById = new Map(guests.map((guest) => [guest.id, guest]));
  const responses = ((data ?? []) as SupabaseRsvpResponseRow[]).map((response): StoredRsvpResponse => {
    const guest = guestById.get(response.guest_id);
    return {
      weddingSlug,
      inviteCode: guest?.inviteCode ?? '',
      guestId: response.guest_id,
      eventId: response.event_id,
      status: response.status,
      mealPreference: guest?.mealPreference ?? '',
      updatedAt: response.updated_at ?? '',
    };
  });

  return { responses, error: '' };
}

export async function saveSupabaseRsvpSubmission({
  weddingId,
  weddingSlug,
  guest,
  responses,
  mealPreference,
  events = [],
}: {
  weddingId: string;
  weddingSlug: string;
  guest: WeddingGuest;
  responses: Array<{ eventId: string; status: RsvpStatus }>;
  mealPreference: MealPreference;
  events?: WeddingEvent[];
}) {
  if (!supabase) return { error: 'Supabase is not configured.' };

  const { error: mealError } = await supabase
    .from('guests')
    .update({ meal_preference: mealPreference || null })
    .eq('id', guest.id)
    .eq('wedding_id', weddingId);

  if (mealError) return { error: mealError.message };

  const activeResponses = responses
    .filter((response): response is { eventId: string; status: Exclude<RsvpStatus, ''> } => Boolean(response.status));
  const { resolveEventId, error: resolveError } = await getSupabaseEventIdResolver(weddingId, events);
  if (resolveError) return { error: resolveError };
  const unresolvedIds = activeResponses
    .map((response) => response.eventId)
    .filter((eventId) => !resolveEventId(eventId));
  if (unresolvedIds.length) {
    return { error: `Could not submit RSVP because these event selections do not map to Supabase event UUIDs: ${unresolvedIds.join(', ')}` };
  }

  const responseByResolvedId = new Map(
    activeResponses.map((response) => [resolveEventId(response.eventId), response.status])
  );
  const rows = Array.from(responseByResolvedId.entries())
    .map(([eventId, status]) => ({
      wedding_id: weddingId,
      guest_id: guest.id,
      event_id: eventId,
      status,
    }));

  if (rows.length) {
    const { error } = await supabase
      .from('rsvp_responses')
      .upsert(rows, { onConflict: 'guest_id,event_id' });
    if (error) return { error: error.message };
  }

  const updatedAt = new Date().toISOString();
  const storedResponses: StoredRsvpResponse[] = responses.map((response) => ({
    weddingSlug,
    inviteCode: guest.inviteCode,
    guestId: guest.id,
    eventId: response.eventId,
    status: response.status,
    mealPreference,
    updatedAt,
  }));

  return { error: '', storedResponses };
}

