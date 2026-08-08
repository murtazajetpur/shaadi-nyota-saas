import {
  DEFAULT_GUEST_RECORD_LIMIT,
  DEFAULT_INVITEE_LIMIT,
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
  payment_status: PaymentStatus;
  theme_key: string | null;
  page_title: string | null;
  bride_name: string | null;
  groom_name: string | null;
  display_name: string | null;
  guest_record_limit?: number | null;
  invitee_limit?: number | null;
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
  hero_skip_reveal_image: boolean | null;
  hero_reveal_image_src: string | null;
  hero_reveal_image_type: RevealImageType | null;
  hero_reveal_image_alt: string | null;
  hero_reveal_image_show_at_seconds: number | null;
  hero_fade_at_seconds: number | null;
  music_audio_src: string | null;
  music_title: string | null;
  whatsapp_invite_message: string | null;
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
  rsvp_attending_count_enabled: boolean | null;
  rsvp_background_image_src: string | null;
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
  closing_background_image_src: string | null;
}

interface SupabaseEventRow {
  id: string;
  wedding_id: string;
  event_key: string | null;
  event_visual_key: string | null;
  event_text_style: WeddingEvent['eventTextStyle'] | null;
  event_text_position?: NonNullable<WeddingEvent['eventTextPosition']> | null;
  event_animation_key: WeddingEvent['eventAnimationKey'] | null;
  event_show_calendar?: boolean | null;
  event_show_invited_count?: boolean | null;
  guest_invited_count?: number | null;
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
  invited_count?: number | null;
}

interface SupabaseRsvpResponseRow {
  wedding_id: string;
  guest_id: string;
  event_id: string;
  status: Exclude<RsvpStatus, ''>;
  attending_count?: number | null;
  updated_at: string | null;
}

interface PublicInviteRpcPayload {
  wedding: SupabaseWeddingRow;
  settings: SupabaseWeddingSettingsRow | null;
  guest: SupabaseGuestRow;
  events: SupabaseEventRow[];
  rsvp_responses: SupabaseRsvpResponseRow[];
}

interface TransactionalRelationalRpcPayload {
  success: boolean;
  events: SupabaseEventRow[];
  guests: SupabaseGuestRow[];
  guest_event_invites: SupabaseGuestEventInviteRow[];
  removed?: {
    events?: number;
    event_invites?: number;
    event_rsvp_responses?: number;
    guests?: number;
    guest_invites?: number;
    guest_rsvp_responses?: number;
  };
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

const normalizeEventTextPosition = (value?: string | null): NonNullable<WeddingEvent['eventTextPosition']> => {
  if (value === 'middle' || value?.startsWith('center')) {
    return 'middle';
  }

  return 'top';
};

const getLegacyEventTextPosition = (value?: string | null) => (
  normalizeEventTextPosition(value) === 'middle' ? 'center' : 'top-center'
);

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value: string) => uuidPattern.test(value);
const eventCategoryKeys = ['haldi', 'mehendi', 'sangeet', 'wedding', 'reception', 'generic', 'custom'];

const slugifyEventKey = (value?: string | null) => (
  value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') ?? ''
);

const getEventCategoryFromStorageKey = (value?: string | null) => {
  const normalized = slugifyEventKey(value);
  if (!normalized) return '';

  return eventCategoryKeys.find((category) => (
    normalized === category || normalized.startsWith(`${category}-`)
  )) ?? normalized;
};

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
  eventKey: getEventCategoryFromStorageKey(row.event_key),
  eventVisualKey: row.event_visual_key ?? '',
  eventTextStyle: normalizeEventTextStyle(row.event_text_style),
  eventTextPosition: normalizeEventTextPosition(row.event_text_position),
  eventAnimationKey: normalizeEventAnimationKey(row.event_animation_key),
  eventShowCalendar: row.event_show_calendar !== false,
  eventShowInvitedCount: row.event_show_invited_count === true,
  guestInvitedCount: row.guest_invited_count ?? undefined,
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

const normalizeInvitedCount = (value: unknown) => Math.max(1, Math.floor(Number(value) || 1));

const mapGuestRows = (
  guests: SupabaseGuestRow[],
  invites: SupabaseGuestEventInviteRow[]
): WeddingGuest[] => guests.map((guest) => {
  const guestInvites = invites.filter((invite) => invite.guest_id === guest.id);
  return {
    id: guest.id,
    guestName: guest.guest_name,
    phone: guest.phone ?? '',
    invitedCount: normalizeInvitedCount(guest.invited_count),
    category: guest.category ?? '',
    inviteCode: guest.invite_code,
    invitedEventIds: guestInvites.map((invite) => invite.event_id),
    invitedEventCounts: Object.fromEntries(guestInvites.map((invite) => [
      invite.event_id,
      normalizeInvitedCount(invite.invited_count ?? guest.invited_count),
    ])),
    mealPreference: guest.meal_preference ?? '',
  };
});

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
      guestRecordLimit: wedding.guest_record_limit ?? DEFAULT_GUEST_RECORD_LIMIT,
      inviteeLimit: wedding.invitee_limit ?? DEFAULT_INVITEE_LIMIT,
    },
    hero: {
      revealStyle,
      revealCtaText: valueOr(settings?.hero_reveal_cta_text, fallback.hero.revealCtaText),
      scrollHintText: valueOr(settings?.hero_scroll_hint_text, fallback.hero.scrollHintText),
      videoSrc: heroVideoSrc,
      posterSrc: valueOr(settings?.hero_poster_src, fallback.hero.posterSrc),
      skipRevealImage: settings?.hero_skip_reveal_image ?? fallback.hero.skipRevealImage,
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
    whatsapp: {
      inviteMessage: valueOr(settings?.whatsapp_invite_message, fallback.whatsapp.inviteMessage),
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
      attendingCountEnabled: settings?.rsvp_attending_count_enabled ?? fallback.rsvp.attendingCountEnabled,
      backgroundImageSrc: valueOr(settings?.rsvp_background_image_src, fallback.rsvp.backgroundImageSrc),
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
      backgroundImageSrc: valueOr(settings?.closing_background_image_src, fallback.closing.backgroundImageSrc),
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
      supabase.from('guest_event_invites').select('guest_id,event_id,invited_count').eq('wedding_id', weddingId),
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

  const { data, error } = await supabase.rpc('get_public_invite_by_code', {
    wedding_slug: slug,
    invite_code: inviteCode,
  });

  if (error) {
    return { wedding: null, weddingId: '', guest: undefined, visibleEvents: undefined, error: error.message };
  }
  if (!data) {
    return { wedding: null, weddingId: '', guest: undefined, visibleEvents: undefined, error: '' };
  }

  const payload = data as PublicInviteRpcPayload;
  const eventRows = payload.events ?? [];
  const inviteRows = eventRows.map((event) => ({
    guest_id: payload.guest.id,
    event_id: event.id,
    invited_count: event.guest_invited_count ?? payload.guest.invited_count ?? 1,
  }));
  const guest = mapGuestRows([payload.guest], inviteRows)[0];
  const wedding = mapWeddingBundle(payload.wedding, payload.settings, eventRows, [payload.guest], inviteRows);

  return {
    wedding,
    weddingId: payload.wedding.id,
    guest,
    visibleEvents: wedding.events,
    error: '',
  };
}

export async function loadSupabasePersonalizedRsvpResponses(weddingSlug: string, inviteCode: string) {
  if (!supabase) return { responses: [], error: 'Supabase is not configured.' };

  const { data, error } = await supabase.rpc('get_public_invite_by_code', {
    wedding_slug: weddingSlug,
    invite_code: inviteCode,
  });
  if (error) return { responses: [], error: error.message };
  if (!data) return { responses: [], error: 'Invalid or unavailable invitation.' };

  const payload = data as PublicInviteRpcPayload;
  const responses = (payload.rsvp_responses ?? []).map((response): StoredRsvpResponse => ({
    weddingSlug,
    inviteCode,
    guestId: payload.guest.id,
    eventId: response.event_id,
    status: response.status,
    mealPreference: payload.guest.meal_preference ?? '',
    updatedAt: response.updated_at ?? '',
  }));

  return { responses, error: '' };
}

const isMissingEventAnimationColumnError = (message?: string | null) => (
  Boolean(message?.toLowerCase().includes('event_animation_key'))
);

const isMissingEventTextPositionColumnError = (message?: string | null) => (
  Boolean(message?.toLowerCase().includes('event_text_position'))
);

const isMissingEventShowCalendarColumnError = (message?: string | null) => (
  Boolean(message?.toLowerCase().includes('event_show_calendar'))
);

const isMissingEventShowInvitedCountColumnError = (message?: string | null) => (
  Boolean(message?.toLowerCase().includes('event_show_invited_count'))
);


const getEventKeyForStorage = (event: WeddingEvent, sortOrder = 0) => {
  const category = slugifyEventKey(event.eventKey);
  const fallbackKey = !isUuid(event.id) ? slugifyEventKey(event.id) : '';
  const baseKey = category || fallbackKey;
  if (!baseKey) return null;

  const suffix = isUuid(event.id)
    ? event.id.slice(0, 8)
    : slugifyEventKey(event.id || event.eventName) || `event-${sortOrder + 1}`;

  return `${baseKey}-${suffix}`;
};

const eventToRow = (
  weddingId: string,
  event: WeddingEvent,
  sortOrder: number,
  includeAnimationKey = true,
  eventKeyOverride?: string | null,
  includeTextPosition = true,
  useLegacyTextPosition = false,
  includeShowCalendar = true,
  includeShowInvitedCount = true
) => ({
  id: isUuid(event.id) ? event.id : undefined,
  wedding_id: weddingId,
  event_key: eventKeyOverride !== undefined ? eventKeyOverride : getEventKeyForStorage(event, sortOrder),
  event_visual_key: event.eventVisualKey?.trim() || null,
  event_text_style: normalizeEventTextStyle(event.eventTextStyle),
  ...(includeTextPosition ? { event_text_position: useLegacyTextPosition ? getLegacyEventTextPosition(event.eventTextPosition) : normalizeEventTextPosition(event.eventTextPosition) } : {}),
  ...(includeAnimationKey ? { event_animation_key: normalizeEventAnimationKey(event.eventAnimationKey) } : {}),
  ...(includeShowCalendar ? { event_show_calendar: event.eventShowCalendar !== false } : {}),
  ...(includeShowInvitedCount ? { event_show_invited_count: event.eventShowInvitedCount === true } : {}),
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
  const insertEvent = (includeAnimationKey = true, includeTextPosition = true, useLegacyTextPosition = false, includeShowCalendar = true, includeShowInvitedCount = true) => supabaseClient
    .from('events')
    .insert({
      ...eventToRow(weddingId, event, sortOrder, includeAnimationKey, undefined, includeTextPosition, useLegacyTextPosition, includeShowCalendar, includeShowInvitedCount),
      id: undefined,
    })
    .select('*')
    .single();
  let includeAnimationKey = true;
  let includeTextPosition = true;
  let includeShowCalendar = true;
  let includeShowInvitedCount = true;
  let { data, error } = await insertEvent(includeAnimationKey, includeTextPosition, false, includeShowCalendar, includeShowInvitedCount);
  if (isMissingEventAnimationColumnError(error?.message)) {
    includeAnimationKey = false;
    ({ data, error } = await insertEvent(includeAnimationKey, includeTextPosition, false, includeShowCalendar, includeShowInvitedCount));
  }
  if (isMissingEventTextPositionColumnError(error?.message)) {
    includeTextPosition = false;
    ({ data, error } = await insertEvent(includeAnimationKey, includeTextPosition, false, includeShowCalendar, includeShowInvitedCount));
  }
  if (isMissingEventShowCalendarColumnError(error?.message)) {
    includeShowCalendar = false;
    ({ data, error } = await insertEvent(includeAnimationKey, includeTextPosition, false, includeShowCalendar, includeShowInvitedCount));
  }
  if (isMissingEventShowInvitedCountColumnError(error?.message)) {
    includeShowInvitedCount = false;
    ({ data, error } = await insertEvent(includeAnimationKey, includeTextPosition, false, includeShowCalendar, includeShowInvitedCount));
  }
  if (includeTextPosition && error) {
    const firstError = error;
    const retry = await insertEvent(includeAnimationKey, includeTextPosition, true, includeShowCalendar, includeShowInvitedCount);
    data = retry.data;
    error = retry.error ? firstError : null;
  }

  return error
    ? { event: null, error: error.message }
    : { event: mapEventRow(data as SupabaseEventRow), error: '' };
}

export async function saveSupabaseEvents(weddingId: string, events: WeddingEvent[]) {
  if (!supabase) return { error: 'Supabase is not configured.' };
  const current = await loadSupabaseWeddingBundle(weddingId, { includeGuests: true });
  if (current.error || !current.wedding) {
    return { error: current.error || 'Could not load current guest assignments before saving events.' };
  }

  const submittedEventIds = new Set(events.map((event) => event.id));
  const guests = current.wedding.rsvp.guests.map((guest) => ({
    ...guest,
    invitedEventIds: guest.invitedEventIds.filter((eventId) => submittedEventIds.has(eventId)),
  }));
  const result = await saveSupabaseRelationalData(weddingId, events, guests, 'replace');
  return { error: result.error, detail: result.detail, events: result.events };
}

const getSchemaCacheMissingColumn = (errorMessage?: string) => {
  if (!errorMessage?.includes('schema cache')) return '';
  const match = errorMessage.match(/'([^']+)' column/);
  return match?.[1] ?? '';
};

const closingSettingsColumns = new Set([
  'hero_skip_reveal_image',
  'closing_include_photos',
  'closing_layout',
  'closing_line',
  'closing_couple_display_name',
  'closing_message',
  'closing_frame_image_src',
  'rsvp_background_image_src',
  'rsvp_attending_count_enabled',
  'closing_background_image_src',
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
    hero_skip_reveal_image: wedding.hero.skipRevealImage === true,
    hero_reveal_image_src: wedding.hero.revealImageSrc,
    hero_reveal_image_type: wedding.hero.revealImageType,
    hero_reveal_image_alt: wedding.hero.revealImageAlt,
    hero_reveal_image_show_at_seconds: wedding.hero.revealImageShowAtSeconds,
    hero_fade_at_seconds: wedding.hero.heroFadeAtSeconds,
    music_audio_src: wedding.music.audioSrc,
    music_title: wedding.music.title,
    whatsapp_invite_message: wedding.whatsapp.inviteMessage,
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
    rsvp_background_image_src: wedding.rsvp.backgroundImageSrc,
    closing_include_photos: wedding.closing.includePhotos,
    closing_layout: wedding.closing.includePhotos ? 'gallery' : 'simple',
    closing_line: wedding.closing.closingLine,
    closing_couple_display_name: wedding.closing.coupleDisplayName,
    closing_message: wedding.closing.message,
    closing_frame_image_src: wedding.closing.frameImageSrc,
    closing_background_image_src: wedding.closing.backgroundImageSrc,
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
    if (missingColumn === 'whatsapp_invite_message') {
      return {
        error: 'WhatsApp invite messages cannot be saved until supabase/add_whatsapp_invite_message.sql has been applied.',
      };
    }
    if (missingColumn && closingSettingsColumns.has(missingColumn) && missingColumn in payload) {
      delete payload[missingColumn];
      removedColumns.add(missingColumn);
      continue;
    }

    return { error: error.message };
  }

  return { error: 'Could not save wedding settings because required wedding_settings columns are missing.' };
}

export async function deleteSupabaseEvent(weddingId: string, eventId: string) {
  if (!supabase) return { error: 'Supabase is not configured.', detail: '', result: null };
  const { data, error } = await supabase.rpc('delete_wedding_event_transactional', {
    target_wedding_id: weddingId,
    target_event_id: eventId,
  });
  return {
    error: error ? transactionalSaveError(error.message) : '',
    detail: error?.message ?? '',
    result: data as Record<string, unknown> | null,
  };
}

const guestToRow = (weddingId: string, guest: WeddingGuest) => ({
  id: guest.id,
  wedding_id: weddingId,
  guest_name: guest.guestName.trim() || 'Unnamed Guest',
  phone: guest.phone,
  invited_count: normalizeInvitedCount(guest.invitedCount),
  category: guest.category,
  invite_code: guest.inviteCode,
  meal_preference: guest.mealPreference || null,
});

const eventToTransactionalRow = (event: WeddingEvent, sortOrder: number, useLegacyTextPosition = false) => ({
  id: event.id,
  event_key: getEventKeyForStorage(event, sortOrder),
  event_visual_key: event.eventVisualKey,
  event_text_style: event.eventTextStyle,
  event_text_position: useLegacyTextPosition ? getLegacyEventTextPosition(event.eventTextPosition) : normalizeEventTextPosition(event.eventTextPosition),
  event_animation_key: event.eventAnimationKey,
  event_show_calendar: event.eventShowCalendar !== false,
  event_show_invited_count: event.eventShowInvitedCount === true,
  event_name: event.eventName,
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

const guestToTransactionalRow = (guest: WeddingGuest) => ({
  id: guest.id,
  guest_name: guest.guestName.trim() || 'Unnamed Guest',
  phone: guest.phone,
  invited_count: normalizeInvitedCount(guest.invitedCount),
  category: guest.category,
  invite_code: guest.inviteCode,
  meal_preference: guest.mealPreference || null,
  invited_event_ids: guest.invitedEventIds,
  invited_event_counts: guest.invitedEventCounts ?? {},
});

async function loadCurrentGuestIdSet(weddingId: string) {
  if (!supabase) return { ids: new Set<string>(), error: 'Supabase is not configured.' };
  const { data, error } = await supabase.from('guests').select('id').eq('wedding_id', weddingId);
  if (error) return { ids: new Set<string>(), error: error.message };
  return { ids: new Set((data ?? []).map((row) => String(row.id))), error: '' };
}

async function loadCurrentEventIdSet(weddingId: string) {
  if (!supabase) return { ids: new Set<string>(), error: 'Supabase is not configured.' };
  const { data, error } = await supabase.from('events').select('id').eq('wedding_id', weddingId);
  if (error) return { ids: new Set<string>(), error: error.message };
  return { ids: new Set((data ?? []).map((row) => String(row.id))), error: '' };
}

function removeStaleGuestIds(guests: WeddingGuest[], currentGuestIds: Set<string>) {
  return guests.filter((guest) => !isUuid(guest.id) || currentGuestIds.has(guest.id));
}

function sanitizeRelationalSavePayload(
  events: WeddingEvent[],
  guests: WeddingGuest[],
  currentEventIds: Set<string>
) {
  const eventIdRemap = new Map<string, string>();
  const sanitizedEvents = events.map((event, index) => {
    if (!isUuid(event.id) || currentEventIds.has(event.id)) return event;
    const fallbackId = slugifyEventKey(event.eventName || event.eventKey) || `event-${index + 1}`;
    const nextId = `event-${fallbackId}-${index + 1}`;
    eventIdRemap.set(event.id, nextId);
    return { ...event, id: nextId };
  });
  const submittedEventIds = new Set(sanitizedEvents.map((event) => event.id));
  const resolveSubmittedEventId = createEventIdResolver(sanitizedEvents);

  const sanitizedGuests = guests.map((guest) => {
    const remappedIds = guest.invitedEventIds
      .map((eventId) => eventIdRemap.get(eventId) ?? eventId)
      .map((eventId) => submittedEventIds.has(eventId) ? eventId : resolveSubmittedEventId(eventId))
      .filter((eventId) => Boolean(eventId) && submittedEventIds.has(eventId));
    const invitedEventIds = Array.from(new Set(remappedIds));
    const invitedEventCounts = Object.fromEntries(invitedEventIds.map((eventId) => {
      const originalId = Array.from(eventIdRemap.entries()).find(([, mappedId]) => mappedId === eventId)?.[0] ?? eventId;
      return [
        eventId,
        normalizeInvitedCount(guest.invitedEventCounts?.[eventId] ?? guest.invitedEventCounts?.[originalId] ?? guest.invitedCount),
      ];
    }));

    return { ...guest, invitedEventIds, invitedEventCounts };
  });

  return { events: sanitizedEvents, guests: sanitizedGuests };
}

const transactionalSaveError = (message?: string | null) => {
  const normalized = message?.toLowerCase() ?? '';
  if (normalized.includes('schema cache') && normalized.includes('save_wedding_relational_data_limited')) {
    return 'Could not save because the guest limits migration has not been applied. Run supabase/add_guest_limits_and_pagination.sql and try again.';
  }
  if (normalized.includes('schema cache') && normalized.includes('save_wedding_')) {
    return 'Could not save because the Phase 2 data-integrity SQL has not been applied or Supabase has not refreshed its schema cache. Run supabase/data_integrity_phase_2.sql and try again.';
  }
  if (normalized.includes('event_text_position')) {
    return 'Could not save event text position because the event_text_position SQL has not been applied yet. Run supabase/add_event_text_position.sql and try again.';
  }
  if (normalized.includes('schema cache') && (
    normalized.includes('replace_guest_event_invites_transactional') ||
    normalized.includes('delete_wedding_event_transactional') ||
    normalized.includes('delete_wedding_guests_transactional')
  )) {
    return 'Could not save because the Phase 2 data-integrity SQL has not been applied or Supabase has not refreshed its schema cache. Run supabase/data_integrity_phase_2.sql and try again.';
  }
  if (normalized.includes('guest entry limit')) {
    return 'This wedding has reached its guest-entry limit. Remove a guest or ask Shaadi Nyota to increase the limit.';
  }
  if (normalized.includes('total people limit') || normalized.includes('invitee limit')) {
    return 'This wedding has reached its total-people limit. Reduce Family Size values or ask Shaadi Nyota to increase the limit.';
  }
  if (normalized.includes('family size') && normalized.includes('20')) {
    return 'Family Size cannot be more than 20 for one guest entry.';
  }
  if (normalized.includes('duplicate') || normalized.includes('unique') || normalized.includes('already exists') || normalized.includes('already used')) {
    return 'A duplicate event key or guest invite code was found. Please make each value unique and try again.';
  }
  if (normalized.includes('does not belong') || normalized.includes('do not match') || normalized.includes('access denied')) {
    return 'Some saved selections no longer belong to this wedding. Refresh the page and try again.';
  }
  if (normalized.includes('requires') || normalized.includes('must be') || normalized.includes('invalid')) {
    return message || 'Some submitted data is invalid. Please review it and try again.';
  }
  return 'The save could not be completed. No relational data was changed. Please try again.';
};

const mapTransactionalPayload = (payload: TransactionalRelationalRpcPayload) => ({
  events: (payload.events ?? []).map(mapEventRow),
  guests: mapGuestRows(payload.guests ?? [], payload.guest_event_invites ?? []),
  removed: payload.removed,
});

export async function saveSupabaseRelationalData(
  weddingId: string,
  events: WeddingEvent[],
  guests: WeddingGuest[],
  guestMode: 'append' | 'replace' = 'replace'
) {
  if (!supabase) return { error: 'Supabase is not configured.', detail: '', events: [], guests: [] };
  const supabaseClient = supabase;
  const currentGuestLookup = await loadCurrentGuestIdSet(weddingId);
  const currentEventLookup = await loadCurrentEventIdSet(weddingId);
  const guestsToSave = currentGuestLookup.error ? guests : removeStaleGuestIds(guests, currentGuestLookup.ids);
  const relationalPayload = currentEventLookup.error
    ? { events, guests: guestsToSave }
    : sanitizeRelationalSavePayload(events, guestsToSave, currentEventLookup.ids);

  const saveRelationalData = (useLegacyTextPosition = false) => supabaseClient.rpc('save_wedding_relational_data_limited', {
    target_wedding_id: weddingId,
    event_rows: relationalPayload.events.map((event, index) => eventToTransactionalRow(event, index, useLegacyTextPosition)),
    guest_rows: relationalPayload.guests.map(guestToTransactionalRow),
    guest_mode: guestMode,
  });

  let { data, error } = await saveRelationalData();

  if (error) {
    const firstError = error;
    const retry = await saveRelationalData(true);
    data = retry.data;
    error = retry.error ? firstError : null;
  }

  if (error) {
    return { error: transactionalSaveError(error.message), detail: error.message, events: [], guests: [] };
  }

  const mapped = mapTransactionalPayload(data as TransactionalRelationalRpcPayload);
  return { error: '', detail: '', ...mapped };
}

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
    ? { guest: null, error: transactionalSaveError(error.message) }
    : {
      guest: mapGuestRows([data as SupabaseGuestRow], [])[0],
      error: '',
    };
}

export async function replaceSupabaseGuestInvites(
  weddingId: string,
  guestId: string,
  eventIds: string[],
  events: WeddingEvent[] = [],
  eventCounts: Record<string, number> = {}
) {
  if (!supabase) return { error: 'Supabase is not configured.', detail: '' };

  const { resolvedIds, unresolvedIds, error: resolveError } = await resolveSupabaseEventIdsForWedding(weddingId, eventIds, events);
  if (resolveError) return { error: resolveError };
  if (unresolvedIds.length) {
    return { error: `Could not save guest event invites because these event selections do not map to Supabase event UUIDs: ${unresolvedIds.join(', ')}` };
  }

  const { resolveEventId } = await getSupabaseEventIdResolver(weddingId, events);
  const resolvedEventCounts = Object.fromEntries(Object.entries(eventCounts).map(([eventId, count]) => [
    resolveEventId(eventId) ?? eventId,
    normalizeInvitedCount(count),
  ]));

  const { error } = await supabase.rpc('replace_guest_event_invites_transactional', {
    target_wedding_id: weddingId,
    target_guest_id: guestId,
    event_ids: resolvedIds,
    event_counts: resolvedEventCounts,
  });

  return {
    error: error ? transactionalSaveError(error.message) : '',
    detail: error?.message ?? '',
  };
}

export async function saveSupabaseGuests(weddingId: string, guests: WeddingGuest[], events: WeddingEvent[] = []) {
  if (!supabase) return { error: 'Supabase is not configured.', detail: '', guests: [] };
  const { resolveEventId, error: resolveError } = await getSupabaseEventIdResolver(weddingId, events);
  if (resolveError) return { error: `Resolving event invite IDs failed: ${resolveError}` };

  const unresolvedSelections = new Set<string>();
  const guestsWithResolvedEvents = guests.map((guest) => {
    const resolvedPairs = guest.invitedEventIds
      .map((eventId) => ({ originalId: eventId, resolvedId: resolveEventId(eventId) }))
      .filter((pair) => {
        if (!pair.resolvedId) {
          unresolvedSelections.add(pair.originalId);
          return false;
        }
        return true;
      })
      .filter((pair, index, pairs) => pairs.findIndex((item) => item.resolvedId === pair.resolvedId) === index);
    const invitedEventIds = resolvedPairs.map((pair) => pair.resolvedId);
    const invitedEventCounts = Object.fromEntries(resolvedPairs.map(({ originalId, resolvedId }) => [
      resolvedId,
      normalizeInvitedCount(guest.invitedEventCounts?.[originalId] ?? guest.invitedEventCounts?.[resolvedId] ?? guest.invitedCount),
    ]));
    return { ...guest, invitedEventIds, invitedEventCounts };
  });

  if (unresolvedSelections.size) {
    return { error: `Could not save guest event invites because these event selections do not map to Supabase event UUIDs: ${Array.from(unresolvedSelections).join(', ')}` };
  }

  const { data, error } = await supabase.rpc('save_wedding_guests_transactional', {
    target_wedding_id: weddingId,
    guest_rows: guestsWithResolvedEvents.map(guestToTransactionalRow),
    guest_mode: 'replace',
  });
  if (error) return { error: transactionalSaveError(error.message), detail: error.message };

  const mapped = mapTransactionalPayload(data as TransactionalRelationalRpcPayload);
  return { error: '', detail: '', guests: mapped.guests };
}

export async function deleteSupabaseGuest(weddingId: string, guestId: string) {
  if (!supabase) return { error: 'Supabase is not configured.', detail: '', result: null };
  return deleteSupabaseGuests(weddingId, [guestId]);
}

export async function deleteSupabaseGuests(weddingId: string, guestIds: string[]) {
  if (!supabase) return { error: 'Supabase is not configured.', detail: '', result: null };
  const candidateGuestIds = Array.from(new Set(guestIds.filter(isUuid)));
  const currentGuestLookup = await loadCurrentGuestIdSet(weddingId);
  const guestIdsToDelete = currentGuestLookup.error
    ? candidateGuestIds
    : candidateGuestIds.filter((guestId) => currentGuestLookup.ids.has(guestId));

  if (!guestIdsToDelete.length) {
    return { error: '', detail: '', result: { success: true, deleted_guests: 0, removed_guest_invites: 0, removed_rsvp_responses: 0 } };
  }

  const { data, error } = await supabase.rpc('delete_wedding_guests_transactional', {
    target_wedding_id: weddingId,
    guest_ids: guestIdsToDelete,
  });
  return {
    error: error ? transactionalSaveError(error.message) : '',
    detail: error?.message ?? '',
    result: data as Record<string, unknown> | null,
  };
}

export async function importSupabaseGuests(
  weddingId: string,
  guests: WeddingGuest[],
  mode: 'append' | 'replace',
  events: WeddingEvent[] = []
) {
  if (!supabase) return { error: 'Supabase is not configured.' };
  const { resolveEventId, error: resolveError } = await getSupabaseEventIdResolver(weddingId, events);
  if (resolveError) return { error: resolveError };

  const unresolvedSelections = new Set<string>();
  const resolvedGuests: WeddingGuest[] = guests.map((guest) => {
    const resolvedPairs = guest.invitedEventIds
      .map((eventId) => ({ originalId: eventId, resolvedId: resolveEventId(eventId) }))
      .filter((pair) => {
        if (!pair.resolvedId) {
          unresolvedSelections.add(pair.originalId);
          return false;
        }
        return true;
      })
      .filter((pair, index, pairs) => pairs.findIndex((item) => item.resolvedId === pair.resolvedId) === index);
    const invitedEventIds = resolvedPairs.map((pair) => pair.resolvedId);
    const invitedEventCounts = Object.fromEntries(resolvedPairs.map(({ originalId, resolvedId }) => [
      resolvedId,
      normalizeInvitedCount(guest.invitedEventCounts?.[originalId] ?? guest.invitedEventCounts?.[resolvedId] ?? guest.invitedCount),
    ]));

    return { ...guest, invitedEventIds, invitedEventCounts };
  });

  if (unresolvedSelections.size) {
    return { error: `Could not import guests because these event selections do not map to Supabase event UUIDs: ${Array.from(unresolvedSelections).join(', ')}` };
  }

  const { data, error } = await supabase.rpc('save_wedding_guests_transactional', {
    target_wedding_id: weddingId,
    guest_rows: resolvedGuests.map(guestToTransactionalRow),
    guest_mode: mode,
  });
  if (error) return { error: transactionalSaveError(error.message), detail: error.message };

  const mapped = mapTransactionalPayload(data as TransactionalRelationalRpcPayload);
  return { error: '', detail: '', guests: mapped.guests };
}

export async function loadSupabaseRsvpResponses(
  weddingId: string,
  weddingSlug: string,
  guests: WeddingGuest[]
) {
  if (!supabase) return { responses: [], error: 'Supabase is not configured.' };

  const { data, error } = await supabase
    .from('rsvp_responses')
    .select('wedding_id,guest_id,event_id,status,attending_count,updated_at')
    .eq('wedding_id', weddingId);

  if (error && error.message.toLowerCase().includes('attending_count')) {
    const fallback = await supabase
      .from('rsvp_responses')
      .select('wedding_id,guest_id,event_id,status,updated_at')
      .eq('wedding_id', weddingId);
    if (fallback.error) return { responses: [], error: fallback.error.message };
    const guestById = new Map(guests.map((guest) => [guest.id, guest]));
    const responses = ((fallback.data ?? []) as SupabaseRsvpResponseRow[]).map((response): StoredRsvpResponse => {
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
      attendingCount: response.attending_count ?? undefined,
      updatedAt: response.updated_at ?? '',
    };
  });

  return { responses, error: '' };
}

export async function saveSupabaseRsvpSubmission({
  weddingSlug,
  guest,
  responses,
  mealPreference,
}: {
  weddingId: string;
  weddingSlug: string;
  guest: WeddingGuest;
  responses: Array<{ eventId: string; status: RsvpStatus; attendingCount?: number }>;
  mealPreference: MealPreference;
  events?: WeddingEvent[];
}) {
  if (!supabase) return { error: 'Supabase is not configured.' };

  const activeResponses = responses
    .filter((response): response is { eventId: string; status: Exclude<RsvpStatus, ''>; attendingCount?: number } => Boolean(response.status));
  const { error } = await supabase.rpc('submit_guest_rsvp', {
    wedding_slug: weddingSlug,
    invite_code: guest.inviteCode,
    responses: activeResponses.map((response) => ({
      event_id: response.eventId,
      status: response.status,
      attending_count: response.attendingCount ?? 0,
    })),
    meal_preference: mealPreference || '',
  });
  if (error) return { error: error.message };

  const updatedAt = new Date().toISOString();
  const storedResponses: StoredRsvpResponse[] = responses.map((response) => ({
    weddingSlug,
    inviteCode: guest.inviteCode,
    guestId: guest.id,
    eventId: response.eventId,
    status: response.status,
    mealPreference,
    attendingCount: response.attendingCount,
    updatedAt,
  }));

  return { error: '', storedResponses };
}

