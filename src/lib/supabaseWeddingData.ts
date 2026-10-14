import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_GUEST_RECORD_LIMIT,
  DEFAULT_INVITEE_LIMIT,
  defaultDashboardWeddingSlug,
  getWeddingBySlug,
  type MealPreference,
  type InviteeCountDisplayMode,
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
import {
  defaultWhatsAppReminderMessage,
  getDefaultWhatsAppPreviewDescription,
  getDefaultWhatsAppPreviewTitle,
} from '../data/whatsappInviteMessages';
import { normalizeEventAnimationKey } from '../data/eventAnimations';
import { publicSupabase, supabase } from './supabaseClient';
import { normalizeGuestPhone, validateGuestPhone } from './guestPhone';

export type WebsiteStatus = 'draft' | 'published' | 'suspended';
export type PublicWeddingRouteStatus = 'live' | 'not_live' | 'not_found' | 'unknown';

export interface OpenInvitation {
  id: string;
  weddingId: string;
  label: string;
  category: string;
  inviteCode: string;
  isActive: boolean;
  maxPartySize: number;
  showInviteeCount: boolean;
  mealPreferenceEnabled: boolean;
  expiresAt: string | null;
  eventIds: string[];
  responseCount: number;
  registeredPeople: number;
  createdAt: string;
  updatedAt: string;
}

export type OpenInvitationDraft = Pick<
  OpenInvitation,
  'label' | 'category' | 'isActive' | 'maxPartySize' | 'showInviteeCount' | 'mealPreferenceEnabled' | 'expiresAt' | 'eventIds'
> & { id?: string };

export interface PublicOpenInvitation {
  id: string;
  label: string;
  category: string;
  inviteCode: string;
  maxPartySize: number;
  showInviteeCount: boolean;
  mealPreferenceEnabled: boolean;
  expiresAt: string | null;
}

export interface OpenInvitationRsvpInput {
  weddingSlug: string;
  inviteCode: string;
  respondentName: string;
  respondentPhone: string;
  partySize: number;
  responses: Array<{
    eventId: string;
    status: Exclude<RsvpStatus, ''>;
    attendingCount: number;
  }>;
  mealPreference?: MealPreference;
}

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
  whatsapp_reminder_message: string | null;
  whatsapp_preview_title: string | null;
  whatsapp_preview_description: string | null;
  whatsapp_preview_image_src: string | null;
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
  guest_invitee_count_display_mode?: InviteeCountDisplayMode | null;
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
  phone_input?: string | null;
  client_ref?: string | null;
  invited_count: number | null;
  category: string | null;
  invite_code: string;
  meal_preference: MealPreference | null;
  open_invitation_id?: string | null;
  updated_at?: string | null;
}

interface SupabaseGuestEventInviteRow {
  guest_id: string;
  event_id: string;
  invited_count?: number | null;
  invitee_count_display_mode?: InviteeCountDisplayMode | null;
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

interface SupabaseOpenInvitationRow {
  id: string;
  wedding_id?: string;
  label: string;
  category?: string | null;
  invite_code: string;
  is_active?: boolean;
  max_party_size: number;
  show_invitee_count?: boolean;
  meal_preference_enabled?: boolean;
  expires_at?: string | null;
  event_ids?: string[];
  response_count?: number;
  registered_people?: number;
  created_at?: string;
  updated_at?: string;
}

interface PublicOpenInvitationRpcPayload {
  wedding: SupabaseWeddingRow;
  settings: SupabaseWeddingSettingsRow | null;
  open_invitation: SupabaseOpenInvitationRow;
  events: SupabaseEventRow[];
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

interface GuestDraftRpcPayload {
  success: boolean;
  client_id: string;
  guest: SupabaseGuestRow;
  guest_event_invites: SupabaseGuestEventInviteRow[];
}

interface DashboardSaveRpcPayload {
  success: boolean;
  wedding_updated_at: string;
  events: SupabaseEventRow[];
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
const normalizeInviteeCountDisplayMode = (value: unknown): InviteeCountDisplayMode | undefined => (
  value === 'all' || value === 'number' ? value : undefined
);

const mapGuestRows = (
  guests: SupabaseGuestRow[],
  invites: SupabaseGuestEventInviteRow[]
): WeddingGuest[] => guests.map((guest) => {
  const guestInvites = invites.filter((invite) => invite.guest_id === guest.id);
  return {
    id: guest.id,
    guestName: guest.guest_name,
    phone: guest.phone_input ?? (normalizeGuestPhone(guest.phone ?? '') || guest.phone || ''),
    invitedCount: normalizeInvitedCount(guest.invited_count),
    category: guest.category ?? '',
    inviteCode: guest.invite_code,
    invitedEventIds: guestInvites.map((invite) => invite.event_id),
    invitedEventCounts: Object.fromEntries(guestInvites.map((invite) => [
      invite.event_id,
      normalizeInvitedCount(invite.invited_count ?? guest.invited_count),
    ])),
    invitedEventDisplayModes: Object.fromEntries(guestInvites.flatMap((invite) => {
      const mode = normalizeInviteeCountDisplayMode(invite.invitee_count_display_mode);
      return mode ? [[invite.event_id, mode]] : [];
    })),
    mealPreference: guest.meal_preference ?? '',
    sourceOpenInvitationId: guest.open_invitation_id ?? undefined,
    updatedAt: guest.updated_at ?? undefined,
  };
});

const mapOpenInvitationRow = (row: SupabaseOpenInvitationRow): OpenInvitation => ({
  id: row.id,
  weddingId: row.wedding_id ?? '',
  label: row.label,
  category: row.category ?? '',
  inviteCode: row.invite_code,
  isActive: row.is_active !== false,
  maxPartySize: Math.max(1, Math.min(20, Number(row.max_party_size) || 20)),
  showInviteeCount: row.show_invitee_count !== false,
  mealPreferenceEnabled: row.meal_preference_enabled !== false,
  expiresAt: row.expires_at ?? null,
  eventIds: Array.isArray(row.event_ids) ? row.event_ids : [],
  responseCount: Number(row.response_count) || 0,
  registeredPeople: Number(row.registered_people) || 0,
  createdAt: row.created_at ?? '',
  updatedAt: row.updated_at ?? '',
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
      updatedAt: wedding.updated_at ?? undefined,
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
      reminderMessage: valueOr(settings?.whatsapp_reminder_message, defaultWhatsAppReminderMessage),
      previewTitle: valueOr(settings?.whatsapp_preview_title, getDefaultWhatsAppPreviewTitle(displayName)),
      previewDescription: valueOr(settings?.whatsapp_preview_description, getDefaultWhatsAppPreviewDescription(displayName)),
      previewImageSrc: settings?.whatsapp_preview_image_src ?? '',
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
  options: { includeGuests?: boolean; signal?: AbortSignal; client?: SupabaseClient } = {}
) {
  const client = options.client ?? supabase;
  if (!client) return { wedding: null, error: 'Supabase is not configured.' };

  const weddingQuery = client.from('weddings').select('*').eq('id', weddingId);
  const settingsQuery = client.from('wedding_settings').select('*').eq('wedding_id', weddingId);
  const eventsQuery = client.from('events').select('*').eq('wedding_id', weddingId).order('sort_order', { ascending: true });
  if (options.signal) {
    weddingQuery.abortSignal(options.signal);
    settingsQuery.abortSignal(options.signal);
    eventsQuery.abortSignal(options.signal);
  }

  const [{ data: wedding, error: weddingError }, { data: settings, error: settingsError }, { data: events, error: eventsError }] = await Promise.all([
    weddingQuery.single(),
    settingsQuery.maybeSingle(),
    eventsQuery,
  ]);

  if (weddingError) return { wedding: null, error: weddingError.message };
  if (settingsError) return { wedding: null, error: settingsError.message };
  if (eventsError) return { wedding: null, error: eventsError.message };

  let guests: SupabaseGuestRow[] = [];
  let invites: SupabaseGuestEventInviteRow[] = [];

  if (options.includeGuests) {
    const guestsQuery = client.from('guests').select('*').eq('wedding_id', weddingId).order('created_at', { ascending: false });
    const invitesQuery = client.from('guest_event_invites').select('*').eq('wedding_id', weddingId);
    if (options.signal) {
      guestsQuery.abortSignal(options.signal);
      invitesQuery.abortSignal(options.signal);
    }

    const [{ data: guestRows, error: guestsError }, { data: inviteRows, error: invitesError }] = await Promise.all([
      guestsQuery,
      invitesQuery,
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


export async function getSupabasePublicWeddingRouteStatus(slug: string) {
  if (!supabase) {
    return { status: 'unknown' as PublicWeddingRouteStatus, error: '', migrationRequired: false };
  }

  const { data, error } = await supabase.rpc('get_public_wedding_route_status', {
    wedding_slug: slug,
  });

  if (error) {
    const normalizedError = error.message.toLowerCase();
    const migrationRequired = normalizedError.includes('get_public_wedding_route_status')
      && (normalizedError.includes('schema cache') || normalizedError.includes('could not find'));
    return {
      status: 'unknown' as PublicWeddingRouteStatus,
      error: migrationRequired ? '' : error.message,
      migrationRequired,
    };
  }

  const status = data === 'live' || data === 'not_live' || data === 'not_found'
    ? data
    : 'unknown';
  return { status: status as PublicWeddingRouteStatus, error: '', migrationRequired: false };
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
    invitee_count_display_mode: event.guest_invitee_count_display_mode ?? null,
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

const isMissingOpenInvitationMigration = (message?: string | null) => {
  const normalized = message?.toLowerCase() ?? '';
  return normalized.includes('schema cache') && (
    normalized.includes('open_invitation') ||
    normalized.includes('open invitation')
  );
};

const openInvitationManagementError = (message?: string | null) => {
  const normalized = message?.toLowerCase() ?? '';
  if (isMissingOpenInvitationMigration(message)) {
    return 'Open Invitations are not available yet. Run supabase/add_open_invitations.sql and try again.';
  }
  if (normalized.includes('pro plan')) return 'Open Invitations are available on the Pro plan.';
  if (normalized.includes('access denied')) return 'You do not have access to manage Open Invitations for this wedding.';
  if (normalized.includes('select at least one event')) return 'Select at least one event for this Open Invitation.';
  if (normalized.includes('maximum group size')) return 'Maximum group size must be between 1 and 20.';
  if (normalized.includes('does not belong')) return 'One or more selected events no longer belong to this wedding. Refresh and try again.';
  return message || 'The Open Invitation could not be saved. Please try again.';
};

const publicOpenInvitationError = (message?: string | null) => {
  const normalized = message?.toLowerCase() ?? '';
  if (isMissingOpenInvitationMigration(message)) {
    return 'This Open Invitation is not available yet. Please contact the couple.';
  }
  if (normalized.includes('invalid, paused, or expired')) {
    return 'This Open Invitation is invalid, paused, or has expired.';
  }
  if (normalized.includes('connected to another invitation')) {
    return 'This mobile number is already linked to another wedding invitation. Please use that invitation link or contact the couple.';
  }
  if (normalized.includes('already been submitted')) {
    return 'This response could not be updated. Please refresh and try again.';
  }
  if (normalized.includes('guest entry limit') || normalized.includes('total people limit')) {
    return 'This wedding guest list has reached its capacity. Please contact the couple.';
  }
  if (normalized.includes('mobile number')) return 'Enter a valid mobile number with its country code.';
  if (normalized.includes('answer every event')) return 'Please answer every event before submitting.';
  if (normalized.includes('not included in this open invitation') || normalized.includes('rsvp event is invalid')) {
    return 'The events on this invitation have changed. Refresh the page and try again.';
  }
  if (normalized.includes('attending count')) return 'Choose a valid attendee count for every event.';
  if (normalized.includes('meal preference')) return 'Choose a valid meal preference and try again.';
  if (normalized.includes('group size')) return 'Choose a valid group size for this invitation.';
  if (normalized.includes('name')) return 'Enter your name using no more than 120 characters.';
  if (normalized.includes('jwt') || normalized.includes('token')) {
    return 'Your RSVP session could not be verified. Refresh the page and try again.';
  }
  if (normalized.includes('failed to fetch') || normalized.includes('network')) {
    return 'We could not reach the RSVP service. Check your connection and try again.';
  }
  return 'Your RSVP could not be submitted. Please review the form and try again.';
};

const getSupabaseErrorDetail = (error: {
  message?: string | null;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
}) => [
  error.code ? `Code: ${error.code}` : '',
  error.message ?? '',
  error.details ?? '',
  error.hint ?? '',
].filter(Boolean).join(' | ');

export async function loadSupabaseOpenInvitations(
  weddingId: string,
  options: { client?: SupabaseClient } = {}
) {
  const client = options.client ?? supabase;
  if (!client) return { invitations: [], error: 'Supabase is not configured.', detail: '' };

  const { data, error } = await client.rpc('list_open_invitations', {
    target_wedding_id: weddingId,
  });
  if (error) {
    return { invitations: [], error: openInvitationManagementError(error.message), detail: error.message };
  }

  const rows = Array.isArray(data) ? data as SupabaseOpenInvitationRow[] : [];
  return { invitations: rows.map(mapOpenInvitationRow), error: '', detail: '' };
}

export async function saveSupabaseOpenInvitation(
  weddingId: string,
  invitation: OpenInvitationDraft,
  options: { client?: SupabaseClient } = {}
) {
  const client = options.client ?? supabase;
  if (!client) return { id: '', inviteCode: '', error: 'Supabase is not configured.', detail: '' };

  const { data, error } = await client.rpc('save_open_invitation', {
    target_wedding_id: weddingId,
    invitation_row: {
      id: invitation.id ?? null,
      label: invitation.label.trim(),
      category: invitation.category.trim(),
      is_active: invitation.isActive,
      max_party_size: invitation.maxPartySize,
      show_invitee_count: invitation.showInviteeCount,
      meal_preference_enabled: invitation.mealPreferenceEnabled,
      expires_at: invitation.expiresAt,
      event_ids: invitation.eventIds,
    },
  });
  if (error) {
    return { id: '', inviteCode: '', error: openInvitationManagementError(error.message), detail: error.message };
  }

  const payload = (data ?? {}) as { id?: string; invite_code?: string };
  return { id: payload.id ?? '', inviteCode: payload.invite_code ?? '', error: '', detail: '' };
}

export async function regenerateSupabaseOpenInvitationCode(
  weddingId: string,
  openInvitationId: string,
  options: { client?: SupabaseClient } = {}
) {
  const client = options.client ?? supabase;
  if (!client) return { inviteCode: '', error: 'Supabase is not configured.', detail: '' };

  const { data, error } = await client.rpc('regenerate_open_invitation_code', {
    target_wedding_id: weddingId,
    target_open_invitation_id: openInvitationId,
  });
  if (error) {
    return { inviteCode: '', error: openInvitationManagementError(error.message), detail: error.message };
  }

  const payload = (data ?? {}) as { invite_code?: string };
  return { inviteCode: payload.invite_code ?? '', error: '', detail: '' };
}

export async function deleteSupabaseOpenInvitation(
  weddingId: string,
  openInvitationId: string,
  options: { client?: SupabaseClient } = {}
) {
  const client = options.client ?? supabase;
  if (!client) return { error: 'Supabase is not configured.', detail: '' };

  const { error } = await client.rpc('delete_open_invitation', {
    target_wedding_id: weddingId,
    target_open_invitation_id: openInvitationId,
  });
  return error
    ? { error: openInvitationManagementError(error.message), detail: error.message }
    : { error: '', detail: '' };
}

export async function loadSupabaseOpenInvitation(slug: string, inviteCode: string) {
  if (!publicSupabase) {
    return { wedding: null, weddingId: '', openInvitation: undefined, visibleEvents: undefined, error: 'Supabase is not configured.' };
  }

  const { data, error } = await publicSupabase.rpc('get_public_open_invitation_by_code', {
    wedding_slug: slug,
    open_invite_code: inviteCode,
  });
  if (error) {
    return {
      wedding: null,
      weddingId: '',
      openInvitation: undefined,
      visibleEvents: undefined,
      error: publicOpenInvitationError(error.message),
    };
  }
  if (!data) {
    return { wedding: null, weddingId: '', openInvitation: undefined, visibleEvents: undefined, error: '' };
  }

  const payload = data as PublicOpenInvitationRpcPayload;
  const eventRows = payload.events ?? [];
  const wedding = mapWeddingBundle(payload.wedding, payload.settings, eventRows);
  const invitation = mapOpenInvitationRow(payload.open_invitation);
  const openInvitation: PublicOpenInvitation = {
    id: invitation.id,
    label: invitation.label,
    category: invitation.category,
    inviteCode: invitation.inviteCode,
    maxPartySize: invitation.maxPartySize,
    showInviteeCount: invitation.showInviteeCount,
    mealPreferenceEnabled: invitation.mealPreferenceEnabled,
    expiresAt: invitation.expiresAt,
  };

  return {
    wedding,
    weddingId: payload.wedding.id,
    openInvitation,
    visibleEvents: wedding.events,
    error: '',
  };
}

export async function submitSupabaseOpenInvitationRsvp(input: OpenInvitationRsvpInput) {
  if (!publicSupabase) return { inviteCode: '', guestId: '', action: 'created' as const, error: 'Supabase is not configured.', detail: '' };
  const requiresPhone = input.responses.some((response) => (
    response.status === 'yes' || response.status === 'maybe'
  ));
  let canonicalPhone = '';
  if (requiresPhone || input.respondentPhone.trim()) {
    const phone = validateGuestPhone(input.respondentPhone);
    if (phone.error) return { inviteCode: '', guestId: '', action: 'created' as const, error: phone.error, detail: '' };
    canonicalPhone = phone.canonicalPhone;
  }

  const { data, error } = await publicSupabase.rpc('submit_open_invitation_rsvp', {
    wedding_slug: input.weddingSlug,
    open_invite_code: input.inviteCode,
    respondent_name: input.respondentName.trim(),
    respondent_phone: canonicalPhone,
    party_size: input.partySize,
    responses: input.responses.map((response) => ({
      event_id: response.eventId,
      status: response.status,
      attending_count: response.attendingCount,
    })),
    meal_preference: input.mealPreference || null,
  });
  if (error) {
    const detail = getSupabaseErrorDetail(error);
    if (import.meta.env.DEV) {
      console.error('Open Invitation RSVP submission failed:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    }
    return { inviteCode: '', guestId: '', action: 'created' as const, error: publicOpenInvitationError(error.message), detail };
  }

  const payload = (data ?? {}) as {
    invite_code?: string;
    guest_id?: string;
    submission_action?: 'created' | 'updated';
  };
  return {
    inviteCode: payload.invite_code ?? '',
    guestId: payload.guest_id ?? '',
    action: payload.submission_action === 'updated' ? 'updated' as const : 'created' as const,
    error: '',
    detail: '',
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

const whatsappSettingsColumns = new Set([
  'whatsapp_invite_message',
  'whatsapp_reminder_message',
  'whatsapp_preview_title',
  'whatsapp_preview_description',
  'whatsapp_preview_image_src',
]);

const buildWeddingSettingsPayload = (wedding: SampleWeddingData) => ({
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
  whatsapp_reminder_message: wedding.whatsapp.reminderMessage,
  whatsapp_preview_title: wedding.whatsapp.previewTitle,
  whatsapp_preview_description: wedding.whatsapp.previewDescription,
  whatsapp_preview_image_src: wedding.whatsapp.previewImageSrc,
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
  rsvp_attending_count_enabled: wedding.rsvp.attendingCountEnabled,
  rsvp_meal_options: wedding.rsvp.mealOptions,
  rsvp_success_message: wedding.rsvp.successMessage,
  rsvp_background_image_src: wedding.rsvp.backgroundImageSrc,
  closing_enabled: wedding.closing.enabled,
  closing_include_photos: wedding.closing.includePhotos,
  closing_layout: wedding.closing.includePhotos ? 'gallery' : 'simple',
  closing_line: wedding.closing.closingLine,
  closing_couple_display_name: wedding.closing.coupleDisplayName,
  closing_message: wedding.closing.message,
  closing_frame_image_src: wedding.closing.frameImageSrc,
  closing_background_image_src: wedding.closing.backgroundImageSrc,
  closing_carousel_images: wedding.closing.carouselImages,
  closing_gallery_images: wedding.closing.carouselImages,
});

export async function saveSupabaseWeddingSettings(weddingId: string, wedding: SampleWeddingData) {
  if (!supabase) return { error: 'Supabase is not configured.' };

  const basePayload = { wedding_id: weddingId, ...buildWeddingSettingsPayload(wedding) };

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
    if (whatsappSettingsColumns.has(missingColumn)) {
      return {
        error: 'WhatsApp messages and link preview settings cannot be saved until supabase/add_whatsapp_message_and_preview_settings.sql has been applied.',
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
  phone: normalizeGuestPhone(guest.phone) || guest.phone.trim() || null,
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
  phone: normalizeGuestPhone(guest.phone) || guest.phone.trim() || null,
  invited_count: normalizeInvitedCount(guest.invitedCount),
  category: guest.category,
  invite_code: guest.inviteCode,
  meal_preference: guest.mealPreference || null,
  invited_event_ids: guest.invitedEventIds,
  invited_event_counts: guest.invitedEventCounts ?? {},
  invited_event_display_modes: guest.invitedEventDisplayModes ?? {},
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
    const invitedEventDisplayModes = Object.fromEntries(invitedEventIds.flatMap((eventId) => {
      const originalId = Array.from(eventIdRemap.entries()).find(([, mappedId]) => mappedId === eventId)?.[0] ?? eventId;
      const mode = guest.invitedEventDisplayModes?.[eventId] ?? guest.invitedEventDisplayModes?.[originalId];
      return mode ? [[eventId, mode]] : [];
    }));

    return { ...guest, invitedEventIds, invitedEventCounts, invitedEventDisplayModes };
  });

  return { events: sanitizedEvents, guests: sanitizedGuests };
}

const transactionalSaveError = (message?: string | null) => {
  const normalized = message?.toLowerCase() ?? '';
  if (normalized.includes('schema cache') && (
    normalized.includes('save_wedding_guests_with_invitee_display_modes_transactional') ||
    normalized.includes('replace_guest_event_invites_with_display_modes_transactional')
  )) {
    return 'Could not save invitee display choices because the normal-invitation display-mode migration has not been applied. Run supabase/add_normal_invitation_invitee_display_modes.sql and try again.';
  }
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
  if (normalized.includes('changed in another session')) {
    return 'This guest was updated elsewhere while you were editing. Your changes are still on screen; review them and retry.';
  }
  if (normalized.includes('guest phone') || normalized.includes('phone number')) {
    return 'One or more guest phone numbers are invalid. Use a valid mobile number and include the country code for non-Indian numbers.';
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

const isMissingGuestAutosaveMigration = (message?: string | null) => {
  const normalized = message?.toLowerCase() ?? '';
  return normalized.includes('schema cache') && (
    normalized.includes('save_wedding_guest_draft') ||
    normalized.includes('save_wedding_dashboard_transactional') ||
    normalized.includes('phone_input') ||
    normalized.includes('client_ref') ||
    normalized.includes('invitee_count_display_mode')
  );
};

const guestDraftSaveTimeoutMs = 30000;

export async function saveSupabaseGuestDraft(
  weddingId: string,
  guest: WeddingGuest,
  options: { client?: SupabaseClient } = {}
) {
  const client = options.client ?? supabase;
  if (!client) return { guest: null, error: 'Supabase is not configured.', detail: '', code: '' };

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), guestDraftSaveTimeoutMs);

  try {
    const { data, error } = await client.rpc('save_wedding_guest_draft_with_invitee_display_modes', {
      target_wedding_id: weddingId,
      guest_row: {
        id: guest.id,
        guest_name: guest.guestName,
        phone_input: guest.phone,
        invited_count: normalizeInvitedCount(guest.invitedCount),
        category: guest.category,
        invite_code: guest.inviteCode,
        meal_preference: guest.mealPreference || null,
        invited_event_ids: guest.invitedEventIds,
        invited_event_counts: guest.invitedEventCounts ?? {},
        invited_event_display_modes: guest.invitedEventDisplayModes ?? {},
      },
      expected_updated_at: guest.updatedAt ?? null,
    }).abortSignal(abortController.signal);

    if (error) {
      return {
        guest: null,
        error: isMissingGuestAutosaveMigration(error.message)
          ? 'Guest autosave is not available yet. Run supabase/guest_autosave_and_save_reliability.sql, then supabase/add_normal_invitation_invitee_display_modes.sql, and try again.'
          : transactionalSaveError(error.message),
        detail: error.message,
        code: error.code ?? '',
      };
    }

    const payload = data as GuestDraftRpcPayload;
    const savedGuest = mapGuestRows([payload.guest], payload.guest_event_invites ?? [])[0] ?? null;
    return { guest: savedGuest, clientId: payload.client_id, error: '', detail: '', code: '' };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      guest: null,
      error: abortController.signal.aborted
        ? 'Saving this guest took too long. Please check your connection and retry.'
        : 'This guest could not be saved. Please retry.',
      detail,
      code: '',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function saveSupabaseWeddingDashboard(
  weddingId: string,
  wedding: SampleWeddingData,
  options: { client?: SupabaseClient } = {}
) {
  const client = options.client ?? supabase;
  if (!client) return { error: 'Supabase is not configured.', detail: '', events: [], weddingUpdatedAt: '' };

  const { data, error } = await client.rpc('save_wedding_dashboard_transactional', {
    target_wedding_id: weddingId,
    wedding_row: {
      bride_name: wedding.couple.brideName.trim(),
      groom_name: wedding.couple.groomName.trim(),
      display_name: wedding.couple.displayName.trim(),
      slug: wedding.wedding.slug.trim(),
      theme_key: wedding.wedding.themeKey.trim(),
      page_title: wedding.wedding.pageTitle.trim(),
    },
    settings_row: buildWeddingSettingsPayload(wedding),
    event_rows: wedding.events.map((event, index) => eventToTransactionalRow(event, index)),
    expected_updated_at: wedding.wedding.updatedAt ?? null,
  });

  if (error) {
    const addressError = error.message.toLowerCase().includes('duplicate') && error.message.toLowerCase().includes('slug');
    return {
      error: addressError
        ? 'This website address is already in use. Please choose a different address.'
        : isMissingGuestAutosaveMigration(error.message)
          ? 'Reliable dashboard saving is not available yet. Run supabase/guest_autosave_and_save_reliability.sql and try again.'
          : transactionalSaveError(error.message),
      detail: error.message,
      events: [],
      weddingUpdatedAt: '',
    };
  }

  const payload = data as DashboardSaveRpcPayload;
  return {
    error: '',
    detail: '',
    events: (payload.events ?? []).map(mapEventRow),
    weddingUpdatedAt: payload.wedding_updated_at ?? '',
  };
}

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
  eventCounts: Record<string, number> = {},
  eventDisplayModes: Record<string, InviteeCountDisplayMode> = {}
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
  const resolvedEventDisplayModes = Object.fromEntries(Object.entries(eventDisplayModes).map(([eventId, mode]) => [
    resolveEventId(eventId) ?? eventId,
    mode,
  ]));

  const { error } = await supabase.rpc('replace_guest_event_invites_with_display_modes_transactional', {
    target_wedding_id: weddingId,
    target_guest_id: guestId,
    event_ids: resolvedIds,
    event_counts: resolvedEventCounts,
    event_display_modes: resolvedEventDisplayModes,
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
    const invitedEventDisplayModes = Object.fromEntries(resolvedPairs.flatMap(({ originalId, resolvedId }) => {
      const mode = guest.invitedEventDisplayModes?.[originalId] ?? guest.invitedEventDisplayModes?.[resolvedId];
      return mode ? [[resolvedId, mode]] : [];
    }));
    return { ...guest, invitedEventIds, invitedEventCounts, invitedEventDisplayModes };
  });

  if (unresolvedSelections.size) {
    return { error: `Could not save guest event invites because these event selections do not map to Supabase event UUIDs: ${Array.from(unresolvedSelections).join(', ')}` };
  }

  const { data, error } = await supabase.rpc('save_wedding_guests_with_invitee_display_modes_transactional', {
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
    const invitedEventDisplayModes = Object.fromEntries(resolvedPairs.flatMap(({ originalId, resolvedId }) => {
      const mode = guest.invitedEventDisplayModes?.[originalId] ?? guest.invitedEventDisplayModes?.[resolvedId];
      return mode ? [[resolvedId, mode]] : [];
    }));

    return { ...guest, invitedEventIds, invitedEventCounts, invitedEventDisplayModes };
  });

  if (unresolvedSelections.size) {
    return { error: `Could not import guests because these event selections do not map to Supabase event UUIDs: ${Array.from(unresolvedSelections).join(', ')}` };
  }

  const { data, error } = await supabase.rpc('save_wedding_guests_with_invitee_display_modes_transactional', {
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

