import { supabase } from './supabaseClient';
import {
  getOpeningRevealDefaults,
  sampleWeddingData,
  type PackageType,
  type SampleWeddingData,
} from '../data/sampleWeddingData';

export interface OwnedWeddingRow {
  id: string;
  owner_id: string;
  created_by: string | null;
  slug: string;
  package_type: PackageType;
  status: 'draft' | 'published' | 'suspended';
  payment_status: 'unpaid' | 'paid';
  theme_key: string;
  page_title: string | null;
  bride_name: string | null;
  groom_name: string | null;
  display_name: string | null;
  published_at: string | null;
}

export interface CreateWeddingInput {
  ownerId: string;
  brideName: string;
  groomName: string;
  displayName: string;
  slug: string;
  packageType: PackageType;
  themeKey: string;
  pageTitle: string;
}

export interface UpdateWeddingShellInput {
  weddingId: string;
  brideName: string;
  groomName: string;
  displayName: string;
  slug: string;
  themeKey: string;
  pageTitle: string;
}

const cloneWedding = (wedding: SampleWeddingData): SampleWeddingData => (
  JSON.parse(JSON.stringify(wedding)) as SampleWeddingData
);

export const defaultThemeKey = sampleWeddingData.wedding.themeKey;

export const createSlugFromNames = (brideName: string, groomName: string) => {
  return [groomName, brideName]
    .join(' ')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
};

export const buildWeddingShellFromRow = (row: OwnedWeddingRow): SampleWeddingData => {
  const fallback = cloneWedding(sampleWeddingData);
  const displayName = row.display_name || [row.groom_name, row.bride_name].filter(Boolean).join(' & ') || 'Your Wedding';

  return {
    ...fallback,
    wedding: {
      ...fallback.wedding,
      slug: row.slug,
      packageType: row.package_type,
      status: row.status,
      paymentStatus: row.payment_status,
      themeKey: row.theme_key,
      pageTitle: row.page_title || `${displayName} | Shaadi Nyota`,
    },
    couple: {
      ...fallback.couple,
      brideName: row.bride_name || '',
      groomName: row.groom_name || '',
      displayName,
      enabled: true,
      introLine: '',
      storyTitle: '',
      storyText: '',
    },
    rsvp: {
      ...fallback.rsvp,
      guests: [],
    },
    closing: {
      ...fallback.closing,
      coupleDisplayName: displayName,
    },
  };
};

export const getOwnedWeddingForUser = async (userId: string) => {
  if (!supabase) return { wedding: null, error: 'Supabase is not configured.' };

  const { data, error } = await supabase
    .from('weddings')
    .select('id, owner_id, created_by, slug, package_type, status, payment_status, theme_key, page_title, bride_name, groom_name, display_name, published_at')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    wedding: data as OwnedWeddingRow | null,
    error: error?.message ?? null,
  };
};

export const updateWeddingShell = async (input: UpdateWeddingShellInput) => {
  if (!supabase) return { error: 'Supabase is not configured.' };

  const { error } = await supabase
    .from('weddings')
    .update({
      bride_name: input.brideName,
      groom_name: input.groomName,
      display_name: input.displayName,
      slug: input.slug,
      theme_key: input.themeKey,
      page_title: input.pageTitle,
    })
    .eq('id', input.weddingId);

  if (error) {
    if (error.code === '23503' && error.message.includes('weddings_theme_key_fkey')) {
      return {
        error: `Theme "${input.themeKey}" is not available in Supabase yet. Run supabase/seed.sql so the themes table includes this theme.`,
      };
    }

    return {
      error: error.code === '23505'
        ? 'This slug is already taken. Please choose another.'
        : error.message,
    };
  }

  return { error: null };
};

export const getOwnedWeddingForCurrentUser = async () => {
  if (!supabase) return { wedding: null, error: 'Supabase is not configured.' };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { wedding: null, error: userError?.message ?? 'No logged-in user.' };
  }

  return getOwnedWeddingForUser(userData.user.id);
};

export const createWeddingShell = async (input: CreateWeddingInput) => {
  if (!supabase) return { wedding: null, error: 'Supabase is not configured.' };

  const { data: wedding, error: weddingError } = await supabase
    .from('weddings')
    .insert({
      owner_id: input.ownerId,
      created_by: input.ownerId,
      bride_name: input.brideName,
      groom_name: input.groomName,
      display_name: input.displayName,
      slug: input.slug,
      package_type: input.packageType,
      status: 'draft',
      payment_status: 'unpaid',
      theme_key: input.themeKey,
      page_title: input.pageTitle,
    })
    .select('id, owner_id, created_by, slug, package_type, status, payment_status, theme_key, page_title, bride_name, groom_name, display_name, published_at')
    .single();

  if (weddingError || !wedding) {
    return {
      wedding: null,
      error: weddingError?.code === '23505'
        ? 'This slug is already taken. Please choose another.'
        : weddingError?.message ?? 'Unable to create wedding.',
    };
  }

  const defaults = sampleWeddingData;
  const openingRevealDefaults = getOpeningRevealDefaults(input.themeKey);
  const { error: settingsError } = await supabase
    .from('wedding_settings')
    .insert({
      wedding_id: wedding.id,
      hero_reveal_style: openingRevealDefaults.hero.revealStyle,
      hero_reveal_cta_text: openingRevealDefaults.hero.revealCtaText,
      hero_scroll_hint_text: openingRevealDefaults.hero.scrollHintText,
      hero_video_src: openingRevealDefaults.hero.videoSrc,
      hero_poster_src: openingRevealDefaults.hero.posterSrc,
      hero_reveal_image_src: openingRevealDefaults.hero.revealImageSrc,
      hero_reveal_image_type: openingRevealDefaults.hero.revealImageType,
      hero_reveal_image_alt: openingRevealDefaults.hero.revealImageAlt,
      hero_reveal_image_show_at_seconds: openingRevealDefaults.hero.revealImageShowAtSeconds,
      hero_fade_at_seconds: openingRevealDefaults.hero.heroFadeAtSeconds,
      music_audio_src: openingRevealDefaults.music.audioSrc,
      music_title: openingRevealDefaults.music.title,
      couple_enabled: true,
      couple_intro_line: '',
      couple_blessing_line: defaults.couple.blessingLine,
      couple_background_image_src: defaults.couple.backgroundImageSrc,
      story_title: '',
      story_text: '',
      story_image_src: defaults.couple.backgroundImageSrc,
      story_image_alt: defaults.couple.imageAlt,
      rsvp_enabled: defaults.rsvp.enabled,
      rsvp_title: defaults.rsvp.title,
      rsvp_subtitle: defaults.rsvp.subtitle,
      rsvp_labels: {
        nameQuestion: defaults.rsvp.nameQuestion,
        namePlaceholder: defaults.rsvp.namePlaceholder,
        attendanceQuestion: defaults.rsvp.attendanceQuestion,
        phoneQuestion: defaults.rsvp.phoneQuestion,
        phonePlaceholder: defaults.rsvp.phonePlaceholder,
        responseOptions: defaults.rsvp.responseOptions,
      },
      rsvp_meal_preference_enabled: defaults.rsvp.mealPreferenceEnabled,
      rsvp_meal_options: defaults.rsvp.mealOptions,
      rsvp_success_message: defaults.rsvp.successMessage,
      closing_include_photos: defaults.closing.includePhotos,
      closing_layout: defaults.closing.includePhotos ? 'gallery' : 'simple',
      closing_line: defaults.closing.closingLine,
      closing_couple_display_name: input.displayName,
      closing_message: defaults.closing.message,
      closing_carousel_images: defaults.closing.carouselImages,
      closing_frame_image_src: defaults.closing.frameImageSrc,
    });

  if (settingsError) {
    return { wedding: null, error: settingsError.message };
  }

  return {
    wedding: wedding as OwnedWeddingRow,
    error: null,
  };
};
