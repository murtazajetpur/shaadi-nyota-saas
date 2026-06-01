import type { RevealImageType, RevealStyle } from './sampleWeddingData';
import { assetAspectMetadataBySrc } from './assetAspectRatios';

export type AssetType = 'image' | 'video' | 'audio' | 'poster' | 'frame' | 'background';
export type AssetSection = 'openingReveal' | 'ourStory' | 'events' | 'closingGallery' | 'audio' | 'shared';
export type AssetCategory =
  | 'animation'
  | 'poster'
  | 'revealed-image'
  | 'image'
  | 'background'
  | 'haldi'
  | 'mehendi'
  | 'sangeet'
  | 'wedding'
  | 'nikaah'
  | 'reception'
  | 'walima'
  | 'generic'
  | 'preset-photo'
  | 'frame'
  | 'music';

export interface RegistryAsset {
  id: string;
  label: string;
  src: string;
  type: AssetType;
  section: AssetSection;
  category: AssetCategory;
  style: string;
  sourceTheme?: string;
  recommendedForThemes?: string[];
  compatibleThemes?: string[];
  tags?: string[];
  previewSrc?: string;
  intrinsicWidth?: number;
  intrinsicHeight?: number;
  aspectRatio?: string;
  notes?: string;
}

export interface OpeningRevealAnimationAsset extends RegistryAsset {
  revealStyle: RevealStyle;
  videoSrc: string;
  tallVideoSrc?: string;
  posterSrc: string;
  revealImageShowAtSeconds: number;
  heroFadeAtSeconds: number;
  helper: string;
  disabled?: boolean;
}

export interface RevealedImageAsset extends RegistryAsset {
  imageType: RevealImageType;
  altText: string;
  helper: string;
}

export interface StoryImageAsset extends RegistryAsset {
  altText: string;
}

export interface ThemeDefaults {
  openingRevealAnimationId: string;
  openingRevealPosterId: string;
  revealedImageId: string;
  ourStoryImageId: string;
  eventVisualDefaults: Partial<Record<'haldi' | 'mehendi' | 'sangeet' | 'wedding' | 'nikaah' | 'reception' | 'walima' | 'generic', string>>;
  closingBackgroundId?: string;
  closingPresetPhotoIds: string[];
  audioId: string;
}

export interface SectionFirstAssetRegistry {
  sections: {
    openingReveal: {
      animations: OpeningRevealAnimationAsset[];
      posters: RegistryAsset[];
      revealedImages: RevealedImageAsset[];
    };
    ourStory: {
      images: StoryImageAsset[];
      backgrounds: RegistryAsset[];
    };
    events: Record<string, RegistryAsset[]>;
    closingGallery: {
      backgrounds: RegistryAsset[];
      frames: RegistryAsset[];
      presetPhotos: RegistryAsset[];
    };
    audio: RegistryAsset[];
  };
  themeDefaults: Record<string, ThemeDefaults>;
}

const allThemeKeys = ['envelope-opening', 'scroll-opening', 'palace-door-opening', 'theme-2'];

const templateKeyAliases: Record<string, string> = {
  'theme-2': 'scroll-opening',
};

export const normalizeTemplateAssetKey = (templateKey = 'envelope-opening') => (
  templateKeyAliases[templateKey] ?? templateKey
);

const baseAsset = <T extends RegistryAsset>(asset: T): T => ({
  compatibleThemes: allThemeKeys,
  recommendedForThemes: asset.sourceTheme
    ? Array.from(new Set([asset.sourceTheme, normalizeTemplateAssetKey(asset.sourceTheme)]))
    : undefined,
  ...assetAspectMetadataBySrc[asset.src],
  ...asset,
});

const eventCategoryLabels: Partial<Record<AssetCategory, string>> = {
  generic: 'Generic',
  haldi: 'Haldi',
  mehendi: 'Mehendi',
  reception: 'Reception',
  sangeet: 'Sangeet',
  wedding: 'Wedding',
};

const eventStyleLabels: Record<string, string> = {
  faceless: 'Faceless',
  premium: 'Premium',
  sketch: 'Sketch',
};

const getEventAssetStyle = (id: string) => {
  if (id.includes('-faceless-')) return 'faceless';
  if (id.includes('-sketch-')) return 'sketch';
  return 'premium';
};

const eventAssetSrcById: Record<string, string> = {
  'event-haldi-faceless-01': '/assets/events/haldi/event-haldi-faceless-01-9x16.png',
  'event-haldi-faceless-02': '/assets/events/haldi/event-haldi-faceless-02-9x16.png',
  'event-haldi-faceless-03': '/assets/events/haldi/event-haldi-faceless-03-9x16.png',
  'event-haldi-faceless-04': '/assets/events/haldi/event-haldi-faceless-04-9x16.png',
  'event-haldi-premium-01': '/assets/events/haldi/event-haldi-premium-01-9x16.png',
  'event-haldi-premium-02': '/assets/events/haldi/event-haldi-premium-02-9x16.png',
  'event-haldi-premium-03': '/assets/events/haldi/event-haldi-premium-03-9x16.png',
  'event-haldi-premium-04': '/assets/events/haldi/event-haldi-premium-04-9x16.png',
  'event-haldi-premium-05': '/assets/events/haldi/event-haldi-premium-05-9x16.png',
  'event-haldi-premium-06': '/assets/events/haldi/event-haldi-premium-06-9x16.png',
  'event-haldi-premium-07': '/assets/events/haldi/event-haldi-premium-07-9x16.png',
  'event-haldi-premium-08': '/assets/events/haldi/event-haldi-premium-08-9x16.png',
  'event-haldi-sketch-01': '/assets/events/haldi/event-haldi-sketch-01-9x16.png',
  'event-haldi-sketch-02': '/assets/events/haldi/event-haldi-sketch-02-9x16.png',
  'event-haldi-sketch-03': '/assets/events/haldi/event-haldi-sketch-03-9x16.png',
  'event-haldi-sketch-04': '/assets/events/haldi/event-haldi-sketch-04-9x16.png',
};

const getEventAssetTokens = (category: string, id: string, style: string) => (
  id
    .replace(`event-${category}-`, '')
    .replace(/-\d{2}$/, '')
    .split('-')
    .filter((token) => token && token !== style && token !== 'event' && token !== category)
);

const makeEventAssetLabel = (
  category: 'generic' | 'haldi' | 'mehendi' | 'reception' | 'sangeet' | 'wedding',
  id: string,
  style: string,
) => {
  const categoryLabel = eventCategoryLabels[category] ?? category;
  const styleLabel = eventStyleLabels[style] ?? style;
  const number = id.match(/-(\d{2})$/)?.[1];
  const tokens = getEventAssetTokens(category, id, style)
    .filter((token) => token !== 'foreground' && token !== 'bg')
    .join(' ');
  const descriptor = tokens ? `${tokens} ${styleLabel}` : styleLabel;

  if (category === 'generic' && style === 'generic') {
    return `Generic Visual ${number ?? ''}`.trim();
  }

  return `${descriptor} ${categoryLabel}${number ? ` ${number}` : ''}`;
};

const makeEventAsset = (
  category: 'generic' | 'haldi' | 'mehendi' | 'reception' | 'sangeet' | 'wedding',
  id: string,
) => {
  const style = getEventAssetStyle(id);
  const tokens = getEventAssetTokens(category, id, style);
  const isBackground = tokens.includes('bg') || tokens.includes('background');

  return baseAsset({
    id,
    label: makeEventAssetLabel(category, id, style),
    src: eventAssetSrcById[id] ?? `/assets/events/${category}/${id}.png`,
    type: isBackground ? 'background' : 'image',
    section: 'events',
    category,
    style,
    sourceTheme: 'asset-library',
    recommendedForThemes: [],
    compatibleThemes: allThemeKeys,
    tags: [category, style, ...tokens],
  });
};

const makeEventAssets = (
  category: 'generic' | 'haldi' | 'mehendi' | 'reception' | 'sangeet' | 'wedding',
  ids: string[],
) => ids.map((id) => makeEventAsset(category, id));

export const assetRegistry: SectionFirstAssetRegistry = {
  sections: {
    openingReveal: {
      animations: [
        baseAsset({
          id: 'opening-envelope-classic-01',
          label: 'Envelope Opening',
          src: '/assets/opening-reveal/envelope/videos/opening-envelope-video.mp4',
          type: 'video',
          section: 'openingReveal',
          category: 'animation',
          style: 'classic',
          sourceTheme: 'palace-door-opening',
          revealStyle: 'envelope',
          videoSrc: '/assets/opening-reveal/envelope/videos/opening-envelope-video.mp4',
          tallVideoSrc: '/assets/opening-reveal/envelope/videos/opening-envelope-video-1x2.mp4',
          posterSrc: '/assets/opening-reveal/envelope/posters/opening-envelope-poster.jpeg',
          previewSrc: '/assets/opening-reveal/envelope/posters/opening-envelope-poster.jpeg',
          revealImageShowAtSeconds: 5.5,
          heroFadeAtSeconds: 7.95,
          helper: 'Classic invite reveal animation',
          tags: ['envelope', 'classic', 'opening'],
        }),
        baseAsset({
          id: 'opening-scroll-floral-01',
          label: 'Scroll Opening',
          src: '/assets/opening-reveal/scroll/videos/opening-scroll-video.mp4',
          type: 'video',
          section: 'openingReveal',
          category: 'animation',
          style: 'scroll',
          sourceTheme: 'theme-2',
          revealStyle: 'scroll',
          videoSrc: '/assets/opening-reveal/scroll/videos/opening-scroll-video.mp4',
          tallVideoSrc: '/assets/opening-reveal/scroll/videos/opening-scroll-video-1x2.mp4',
          posterSrc: '/assets/opening-reveal/scroll/posters/opening-scroll-poster.png',
          previewSrc: '/assets/opening-reveal/scroll/posters/opening-scroll-poster.png',
          revealImageShowAtSeconds: 3.8,
          heroFadeAtSeconds: 5.5,
          helper: 'Cinematic scroll reveal animation',
          tags: ['scroll', 'floral', 'opening'],
        }),
        baseAsset({
          id: 'opening-palace-door-01',
          label: 'Palace Door Opening',
          src: '/assets/opening-reveal/palace-door/videos/opening-palace-door-video-01.mp4',
          type: 'video',
          section: 'openingReveal',
          category: 'animation',
          style: 'palace-door',
          revealStyle: 'palace-door',
          videoSrc: '/assets/opening-reveal/palace-door/videos/opening-palace-door-video-01.mp4',
          tallVideoSrc: '/assets/opening-reveal/palace-door/videos/opening-palace-door-video-1x2.mp4',
          posterSrc: '/assets/opening-reveal/palace-door/posters/opening-reveal-palace-door-poster-01.png',
          previewSrc: '/assets/opening-reveal/palace-door/posters/opening-reveal-palace-door-poster-01.png',
          revealImageShowAtSeconds: 4.0,
          heroFadeAtSeconds: 6.0,
          helper: 'Palace door opening reveal animation',
          tags: ['palace-door', 'opening'],
        }),
      ],
      posters: [
        baseAsset({ id: 'poster-envelope-classic-01', label: 'Envelope Poster', src: '/assets/opening-reveal/envelope/posters/opening-envelope-poster.jpeg', type: 'poster', section: 'openingReveal', category: 'poster', style: 'classic', sourceTheme: 'palace-door-opening' }),
        baseAsset({ id: 'poster-scroll-floral-01', label: 'Scroll Poster', src: '/assets/opening-reveal/scroll/posters/opening-scroll-poster.png', type: 'poster', section: 'openingReveal', category: 'poster', style: 'scroll', sourceTheme: 'theme-2' }),
      ],
      revealedImages: [
        baseAsset({
          id: 'revealed-hindu-classic-01',
          label: 'Hindu Blessing I',
          src: '/assets/opening-reveal/envelope/revealed-images/revealed-hindu-classic-01.png',
          type: 'image',
          section: 'openingReveal',
          category: 'revealed-image',
          style: 'classic',
          sourceTheme: 'palace-door-opening',
          imageType: 'blessing',
          altText: 'Hindu wedding blessing reveal',
          helper: 'Hindu blessing image after reveal',
          tags: ['hindu', 'blessing'],
        }),
        baseAsset({
          id: 'revealed-hindu-classic-02',
          label: 'Hindu Blessing II',
          src: '/assets/opening-reveal/envelope/revealed-images/revealed-hindu-classic-02.png',
          type: 'image',
          section: 'openingReveal',
          category: 'revealed-image',
          style: 'classic',
          sourceTheme: 'palace-door-opening',
          imageType: 'blessing',
          altText: 'Hindu wedding blessing reveal',
          helper: 'Hindu blessing image after reveal',
          tags: ['hindu', 'blessing'],
        }),
        baseAsset({
          id: 'revealed-islamic-classic-01',
          label: 'Islamic Blessing I',
          src: '/assets/opening-reveal/envelope/revealed-images/revealed-islamic-classic-01.png',
          type: 'image',
          section: 'openingReveal',
          category: 'revealed-image',
          style: 'classic',
          sourceTheme: 'palace-door-opening',
          imageType: 'blessing',
          altText: 'Islamic wedding blessing reveal',
          helper: 'Islamic blessing image after reveal',
          tags: ['islamic', 'blessing'],
        }),
        baseAsset({
          id: 'revealed-islamic-classic-02',
          label: 'Islamic Blessing II',
          src: '/assets/opening-reveal/envelope/revealed-images/revealed-islamic-classic-02.png',
          type: 'image',
          section: 'openingReveal',
          category: 'revealed-image',
          style: 'classic',
          sourceTheme: 'palace-door-opening',
          imageType: 'blessing',
          altText: 'Islamic wedding blessing reveal',
          helper: 'Islamic blessing image after reveal',
          tags: ['islamic', 'blessing'],
        }),
        baseAsset({
          id: 'revealed-christian-classic-01',
          label: 'Christian Blessing I',
          src: '/assets/opening-reveal/envelope/revealed-images/revealed-christian-classic-01.png',
          type: 'image',
          section: 'openingReveal',
          category: 'revealed-image',
          style: 'classic',
          sourceTheme: 'palace-door-opening',
          imageType: 'blessing',
          altText: 'Christian wedding blessing reveal',
          helper: 'Christian blessing image after reveal',
          tags: ['christian', 'blessing'],
        }),
        baseAsset({
          id: 'revealed-christian-classic-02',
          label: 'Christian Blessing II',
          src: '/assets/opening-reveal/envelope/revealed-images/revealed-christian-classic-02.png',
          type: 'image',
          section: 'openingReveal',
          category: 'revealed-image',
          style: 'classic',
          sourceTheme: 'palace-door-opening',
          imageType: 'blessing',
          altText: 'Christian wedding blessing reveal',
          helper: 'Christian blessing image after reveal',
          tags: ['christian', 'blessing'],
        }),
        baseAsset({
          id: 'revealed-sikh-classic-01',
          label: 'Sikh Blessing I',
          src: '/assets/opening-reveal/envelope/revealed-images/revealed-sikh-classic-01.png',
          type: 'image',
          section: 'openingReveal',
          category: 'revealed-image',
          style: 'classic',
          sourceTheme: 'palace-door-opening',
          imageType: 'blessing',
          altText: 'Sikh wedding blessing reveal',
          helper: 'Sikh blessing image after reveal',
          tags: ['sikh', 'blessing'],
        }),
        baseAsset({
          id: 'revealed-sikh-classic-02',
          label: 'Sikh Blessing II',
          src: '/assets/opening-reveal/envelope/revealed-images/revealed-sikh-classic-02.png',
          type: 'image',
          section: 'openingReveal',
          category: 'revealed-image',
          style: 'classic',
          sourceTheme: 'palace-door-opening',
          imageType: 'blessing',
          altText: 'Sikh wedding blessing reveal',
          helper: 'Sikh blessing image after reveal',
          tags: ['sikh', 'blessing'],
        }),
        baseAsset({
          id: 'revealed-generic-classic-01',
          label: 'Decorative Reveal I',
          src: '/assets/opening-reveal/envelope/revealed-images/revealed-generic-classic-01.png',
          type: 'image',
          section: 'openingReveal',
          category: 'revealed-image',
          style: 'classic',
          sourceTheme: 'palace-door-opening',
          imageType: 'floral',
          altText: 'Decorative wedding reveal image',
          helper: 'Decorative image after reveal',
          tags: ['generic', 'decorative'],
        }),
        baseAsset({
          id: 'revealed-generic-classic-02',
          label: 'Decorative Reveal II',
          src: '/assets/opening-reveal/envelope/revealed-images/revealed-generic-classic-02.png',
          type: 'image',
          section: 'openingReveal',
          category: 'revealed-image',
          style: 'classic',
          sourceTheme: 'palace-door-opening',
          imageType: 'floral',
          altText: 'Decorative wedding reveal image',
          helper: 'Decorative image after reveal',
          tags: ['generic', 'decorative'],
        }),
        baseAsset({
          id: 'revealed-generic-classic-03',
          label: 'Decorative Reveal III',
          src: '/assets/opening-reveal/envelope/revealed-images/revealed-generic-classic-03.png',
          type: 'image',
          section: 'openingReveal',
          category: 'revealed-image',
          style: 'classic',
          sourceTheme: 'palace-door-opening',
          imageType: 'floral',
          altText: 'Decorative wedding reveal image',
          helper: 'Decorative image after reveal',
          tags: ['generic', 'decorative'],
        }),
        baseAsset({
          id: 'revealed-generic-classic-04',
          label: 'Decorative Reveal IV',
          src: '/assets/opening-reveal/envelope/revealed-images/revealed-generic-classic-04.png',
          type: 'image',
          section: 'openingReveal',
          category: 'revealed-image',
          style: 'classic',
          sourceTheme: 'palace-door-opening',
          imageType: 'floral',
          altText: 'Decorative wedding reveal image',
          helper: 'Decorative image after reveal',
          tags: ['generic', 'decorative'],
        }),
      ],
    },
    ourStory: {
      images: [
        baseAsset({ id: 'story-pheras-01', label: 'Sacred Fire Walk', src: '/assets/our-story/images/story-pheras-01.png', type: 'image', section: 'ourStory', category: 'image', style: 'portrait', altText: 'Bride and groom walking beside the sacred wedding fire', tags: ['couple', 'pheras', 'ceremony'] }),
        baseAsset({ id: 'story-wedding-walk-01', label: 'Floral Wedding Walk', src: '/assets/our-story/images/story-wedding-walk-01.png', type: 'image', section: 'ourStory', category: 'image', style: 'portrait', altText: 'Bride and groom walking together among flowers', tags: ['couple', 'walk', 'floral'] }),
        baseAsset({ id: 'story-holding-hands-01', label: 'Joined Hands', src: '/assets/our-story/images/story-holding-hands-01.png', type: 'image', section: 'ourStory', category: 'image', style: 'portrait', altText: 'Bride and groom holding hands', tags: ['couple', 'hands', 'romantic'] }),
        baseAsset({ id: 'story-floral-swing-01', label: 'Floral Swing', src: '/assets/our-story/images/story-floral-swing-01.png', type: 'image', section: 'ourStory', category: 'image', style: 'portrait', altText: 'Bride and groom seated together on a floral swing', tags: ['couple', 'floral', 'swing'] }),
        baseAsset({ id: 'story-veil-walk-01', label: 'Bridal Veil Walk', src: '/assets/our-story/images/story-veil-walk-01.png', type: 'image', section: 'ourStory', category: 'image', style: 'portrait', altText: 'Bride and groom walking with a flowing bridal veil', tags: ['couple', 'walk', 'veil'] }),
        baseAsset({ id: 'story-pheras-petals-01', label: 'Petal Pheras', src: '/assets/our-story/images/story-pheras-petals-01.png', type: 'image', section: 'ourStory', category: 'image', style: 'portrait', altText: 'Bride and groom beside the wedding fire surrounded by petals', tags: ['couple', 'pheras', 'petals'] }),
        baseAsset({ id: 'story-arch-pose-01', label: 'Floral Arch Portrait', src: '/assets/our-story/images/story-arch-pose-01.png', type: 'image', section: 'ourStory', category: 'image', style: 'portrait', altText: 'Bride and groom together beneath a decorative arch', tags: ['couple', 'arch', 'portrait'] }),
        baseAsset({ id: 'story-back-walk-01', label: 'Together Forward', src: '/assets/our-story/images/story-back-walk-01.png', type: 'image', section: 'ourStory', category: 'image', style: 'portrait', altText: 'Bride and groom walking together', tags: ['couple', 'walk'] }),
        baseAsset({ id: 'story-floral-swing-02', label: 'Floral Swing II', src: '/assets/our-story/images/story-floral-swing-02.png', type: 'image', section: 'ourStory', category: 'image', style: 'portrait', altText: 'Bride and groom together on a floral swing', tags: ['couple', 'floral', 'swing'] }),
        baseAsset({ id: 'story-holding-hands-02', label: 'Joined Hands II', src: '/assets/our-story/images/story-holding-hands-02.png', type: 'image', section: 'ourStory', category: 'image', style: 'portrait', altText: 'Bride and groom holding hands together', tags: ['couple', 'hands', 'romantic'] }),
        baseAsset({ id: 'story-veil-walk-02', label: 'Bridal Veil Walk II', src: '/assets/our-story/images/story-veil-walk-02.png', type: 'image', section: 'ourStory', category: 'image', style: 'portrait', altText: 'Bride and groom walking with a bridal veil', tags: ['couple', 'walk', 'veil'] }),
        baseAsset({ id: 'story-wedding-walk-02', label: 'Floral Wedding Walk II', src: '/assets/our-story/images/story-wedding-walk-02.png', type: 'image', section: 'ourStory', category: 'image', style: 'portrait', altText: 'Bride and groom walking through floral wedding decor', tags: ['couple', 'walk', 'floral'] }),
      ],
      backgrounds: [],
    },
    events: {
      haldi: makeEventAssets('haldi', [
        'event-haldi-premium-01',
        'event-haldi-premium-02',
        'event-haldi-premium-03',
        'event-haldi-premium-04',
        'event-haldi-premium-05',
        'event-haldi-premium-06',
        'event-haldi-premium-07',
        'event-haldi-premium-08',
        'event-haldi-faceless-01',
        'event-haldi-faceless-02',
        'event-haldi-faceless-03',
        'event-haldi-faceless-04',
        'event-haldi-sketch-01',
        'event-haldi-sketch-02',
        'event-haldi-sketch-03',
        'event-haldi-sketch-04',
      ]),
      mehendi: makeEventAssets('mehendi', [
        'event-mehendi-premium-01',
        'event-mehendi-premium-02',
        'event-mehendi-premium-04',
        'event-mehendi-premium-09',
        'event-mehendi-faceless-01',
        'event-mehendi-faceless-02',
        'event-mehendi-faceless-03',
        'event-mehendi-faceless-04',
        'event-mehendi-sketch-01',
        'event-mehendi-sketch-02',
        'event-mehendi-sketch-03',
        'event-mehendi-sketch-04',
        'event-mehendi-sketch-05',
        'event-mehendi-sketch-06',
      ]),
      sangeet: makeEventAssets('sangeet', [
        'event-sangeet-premium-01',
        'event-sangeet-premium-02',
        'event-sangeet-premium-05',
        'event-sangeet-premium-10',
        'event-sangeet-premium-12',
        'event-sangeet-premium-13',
        'event-sangeet-premium-14',
        'event-sangeet-faceless-01',
        'event-sangeet-faceless-02',
        'event-sangeet-faceless-03',
        'event-sangeet-faceless-04',
        'event-sangeet-faceless-05',
        'event-sangeet-faceless-06',
        'event-sangeet-sketch-01',
        'event-sangeet-sketch-02',
        'event-sangeet-sketch-03',
        'event-sangeet-sketch-04',
        'event-sangeet-sketch-05',
        'event-sangeet-sketch-06',
        'event-sangeet-sketch-07',
      ]),
      wedding: makeEventAssets('wedding', [
        'event-wedding-premium-01',
        'event-wedding-premium-02',
        'event-wedding-premium-10',
        'event-wedding-premium-16',
        'event-wedding-premium-17',
        'event-wedding-premium-18',
        'event-wedding-premium-19',
        'event-wedding-premium-20',
        'event-wedding-premium-22',
        'event-wedding-premium-23',
        'event-wedding-premium-24',
        'event-wedding-premium-27',
        'event-wedding-premium-29',
        'event-wedding-premium-30',
        'event-wedding-premium-31',
        'event-wedding-premium-32',
        'event-wedding-premium-34',
        'event-wedding-premium-35',
        'event-wedding-faceless-01',
        'event-wedding-faceless-02',
        'event-wedding-faceless-03',
        'event-wedding-faceless-04',
        'event-wedding-faceless-05',
        'event-wedding-faceless-06',
        'event-wedding-faceless-07',
        'event-wedding-faceless-08',
        'event-wedding-faceless-09',
        'event-wedding-faceless-10',
        'event-wedding-faceless-11',
        'event-wedding-faceless-12',
        'event-wedding-faceless-13',
        'event-wedding-faceless-14',
        'event-wedding-faceless-15',
        'event-wedding-sketch-01',
        'event-wedding-sketch-02',
        'event-wedding-sketch-03',
        'event-wedding-sketch-04',
        'event-wedding-sketch-05',
        'event-wedding-sketch-06',
        'event-wedding-sketch-07',
      ]),
      reception: makeEventAssets('reception', [
        'event-reception-premium-01',
        'event-reception-premium-02',
        'event-reception-premium-03',
        'event-reception-premium-04',
        'event-reception-premium-05',
        'event-reception-premium-07',
        'event-reception-premium-10',
        'event-reception-premium-12',
        'event-reception-premium-13',
        'event-reception-premium-14',
        'event-reception-premium-15',
        'event-reception-premium-16',
        'event-reception-premium-17',
        'event-reception-premium-18',
        'event-reception-premium-20',
        'event-reception-premium-21',
        'event-reception-faceless-01',
        'event-reception-faceless-02',
        'event-reception-faceless-03',
        'event-reception-faceless-04',
        'event-reception-faceless-05',
        'event-reception-faceless-06',
        'event-reception-faceless-07',
        'event-reception-sketch-01',
        'event-reception-sketch-02',
      ]),
      generic: makeEventAssets('generic', [
        'event-generic-premium-01',
        'event-generic-premium-02',
        'event-generic-premium-03',
        'event-generic-premium-04',
        'event-generic-premium-05',
        'event-generic-premium-06',
        'event-generic-premium-07',
        'event-generic-premium-08',
        'event-generic-premium-09',
        'event-generic-premium-10',
        'event-generic-premium-11',
        'event-generic-premium-12',
      ]),
    },
    closingGallery: {
      backgrounds: [
        baseAsset({ id: 'closing-bg-scroll-floral-01', label: 'Scroll Closing Background', src: '/assets/closing-gallery/backgrounds/closing-bg-scroll-floral-01.png', type: 'background', section: 'closingGallery', category: 'background', style: 'scroll', sourceTheme: 'theme-2' }),
      ],
      frames: [
        baseAsset({ id: 'closing-frame-heart-classic-01', label: 'Heart Frame', src: '/assets/closing-gallery/frames/closing-frame-heart-classic-01.png', type: 'frame', section: 'closingGallery', category: 'frame', style: 'classic', sourceTheme: 'palace-door-opening' }),
      ],
      presetPhotos: [
        baseAsset({ id: 'closing-photo-classic-01', label: 'Classic Memory 1', src: '/assets/closing-gallery/preset-photos/closing-photo-preset-01.png', type: 'image', section: 'closingGallery', category: 'preset-photo', style: 'classic', sourceTheme: 'palace-door-opening' }),
        baseAsset({ id: 'closing-photo-classic-02', label: 'Classic Memory 2', src: '/assets/closing-gallery/preset-photos/closing-photo-preset-02.png', type: 'image', section: 'closingGallery', category: 'preset-photo', style: 'classic', sourceTheme: 'palace-door-opening' }),
        baseAsset({ id: 'closing-photo-classic-03', label: 'Classic Memory 3', src: '/assets/closing-gallery/preset-photos/closing-photo-preset-03.png', type: 'image', section: 'closingGallery', category: 'preset-photo', style: 'classic', sourceTheme: 'palace-door-opening' }),
        baseAsset({ id: 'closing-photo-scroll-01', label: 'Scroll Memory 1', src: '/assets/closing-gallery/preset-photos/closing-photo-preset-01.png', type: 'image', section: 'closingGallery', category: 'preset-photo', style: 'scroll', sourceTheme: 'theme-2' }),
        baseAsset({ id: 'closing-photo-scroll-02', label: 'Scroll Memory 2', src: '/assets/closing-gallery/preset-photos/closing-photo-preset-02.png', type: 'image', section: 'closingGallery', category: 'preset-photo', style: 'scroll', sourceTheme: 'theme-2' }),
        baseAsset({ id: 'closing-photo-scroll-03', label: 'Scroll Memory 3', src: '/assets/closing-gallery/preset-photos/closing-photo-preset-03.png', type: 'image', section: 'closingGallery', category: 'preset-photo', style: 'scroll', sourceTheme: 'theme-2' }),
      ],
    },
    audio: [
      baseAsset({ id: 'music-din-shagna-da-classic', label: 'Din Shagna Da', src: '/assets/audio/wedding-songs/music-din-shagna-da.mp3', type: 'audio', section: 'audio', category: 'music', style: 'classic', sourceTheme: 'palace-door-opening' }),
      baseAsset({ id: 'music-din-shagna-da-scroll', label: 'Din Shagna Da', src: '/assets/audio/wedding-songs/music-din-shagna-da.mp3', type: 'audio', section: 'audio', category: 'music', style: 'scroll', sourceTheme: 'theme-2' }),
      baseAsset({ id: 'music-jashn-e-bahaaraa', label: 'Jashn E Bahaaraa', src: '/assets/audio/wedding-songs/Jashn E Bahaaraa.mp3', type: 'audio', section: 'audio', category: 'music', style: 'romantic' }),
      baseAsset({ id: 'music-classic-wedding-melody', label: 'Classic Wedding Melody', src: '/assets/audio/instrumental/Classic Wedding Melody.mp3', type: 'audio', section: 'audio', category: 'music', style: 'classic' }),
      baseAsset({ id: 'music-elegant-invitation', label: 'Elegant Invitation', src: '/assets/audio/instrumental/Elegant Invitation.mp3', type: 'audio', section: 'audio', category: 'music', style: 'elegant' }),
      baseAsset({ id: 'music-punjabi-bhangra-beat', label: 'Punjabi Bhangra Beat', src: '/assets/audio/instrumental/Punjabi Bhangra Beat.mp3', type: 'audio', section: 'audio', category: 'music', style: 'festive' }),
      baseAsset({ id: 'music-romantic-wedding-background', label: 'Romantic Wedding Background Music', src: '/assets/audio/instrumental/Romantic Wedding Background Music.mp3', type: 'audio', section: 'audio', category: 'music', style: 'romantic' }),
      baseAsset({ id: 'music-royal-wedding-theme', label: 'Royal Wedding Theme', src: '/assets/audio/instrumental/Royal Wedding Theme.mp3', type: 'audio', section: 'audio', category: 'music', style: 'royal' }),
    ],
  },
  themeDefaults: {
    'envelope-opening': {
      openingRevealAnimationId: 'opening-envelope-classic-01',
      openingRevealPosterId: 'poster-envelope-classic-01',
      revealedImageId: 'revealed-hindu-classic-01',
      ourStoryImageId: 'story-pheras-01',
      eventVisualDefaults: {
        haldi: 'event-haldi-premium-06',
        mehendi: 'event-mehendi-premium-03',
        sangeet: 'event-sangeet-premium-05',
        wedding: 'event-wedding-premium-16',
        reception: 'event-reception-premium-02',
      },
      closingPresetPhotoIds: [],
      audioId: 'music-din-shagna-da-classic',
    },
    'palace-door-opening': {
      openingRevealAnimationId: 'opening-palace-door-01',
      openingRevealPosterId: 'poster-envelope-classic-01',
      revealedImageId: 'revealed-generic-classic-04',
      ourStoryImageId: 'story-floral-swing-02',
      eventVisualDefaults: {
        haldi: 'event-haldi-premium-06',
        mehendi: 'event-mehendi-premium-03',
        sangeet: 'event-sangeet-premium-05',
        wedding: 'event-wedding-premium-16',
        reception: 'event-reception-premium-02',
      },
      closingPresetPhotoIds: [],
      audioId: 'music-din-shagna-da-classic',
    },
    'scroll-opening': {
      openingRevealAnimationId: 'opening-scroll-floral-01',
      openingRevealPosterId: 'poster-scroll-floral-01',
      revealedImageId: 'revealed-generic-classic-01',
      ourStoryImageId: 'story-holding-hands-02',
      eventVisualDefaults: {
        haldi: 'event-haldi-premium-06',
        mehendi: 'event-mehendi-premium-03',
        sangeet: 'event-sangeet-premium-05',
        wedding: 'event-wedding-premium-16',
        reception: 'event-reception-premium-02',
      },
      closingBackgroundId: 'closing-bg-scroll-floral-01',
      closingPresetPhotoIds: [],
      audioId: 'music-din-shagna-da-scroll',
    },
  },
};

export const legacyEventAssetIdMap: Record<string, string> = {
  'event-generic-generic-01': 'event-generic-premium-01',
  'event-generic-generic-02': 'event-generic-premium-02',
  'event-generic-generic-03': 'event-generic-premium-03',
  'event-generic-generic-04': 'event-generic-premium-04',
  'event-generic-generic-05': 'event-generic-premium-05',
  'event-generic-generic-06': 'event-generic-premium-06',
  'event-generic-generic-07': 'event-generic-premium-07',
  'event-generic-generic-08': 'event-generic-premium-08',
  'event-generic-generic-09': 'event-generic-premium-09',
  'event-generic-generic-10': 'event-generic-premium-10',
  'event-generic-generic-11': 'event-generic-premium-11',
  'event-generic-scroll-bg-01': 'event-generic-premium-12',
  'event-haldi-classic-foreground-01': 'event-haldi-premium-03',
  'event-haldi-couple-watercolor-04': 'event-haldi-premium-04',
  'event-haldi-scroll-01': 'event-haldi-premium-05',
  'event-mehendi-classic-foreground-01': 'event-mehendi-premium-02',
  'event-mehendi-couple-watercolor-01': 'event-mehendi-sketch-04',
  'event-mehendi-couple-watercolor-02': 'event-mehendi-premium-04',
  'event-mehendi-couple-watercolor-03': 'event-mehendi-sketch-05',
  'event-mehendi-couple-watercolor-04': 'event-mehendi-faceless-03',
  'event-mehendi-couple-watercolor-05': 'event-mehendi-faceless-04',
  'event-mehendi-couple-watercolor-06': 'event-mehendi-sketch-06',
  'event-mehendi-scroll-01': 'event-mehendi-premium-09',
  'event-reception-classic-foreground-01': 'event-reception-premium-01',
  'event-reception-couple-formal-watercolor-01': 'event-reception-premium-02',
  'event-reception-couple-formal-watercolor-02': 'event-reception-premium-03',
  'event-reception-couple-formal-watercolor-03': 'event-reception-premium-04',
  'event-reception-couple-formal-watercolor-04': 'event-reception-premium-05',
  'event-reception-couple-formal-watercolor-05': 'event-reception-faceless-03',
  'event-reception-couple-formal-watercolor-06': 'event-reception-premium-07',
  'event-reception-couple-formal-watercolor-07': 'event-reception-faceless-04',
  'event-reception-couple-watercolor-01': 'event-reception-faceless-05',
  'event-reception-generic-01': 'event-reception-premium-10',
  'event-reception-generic-02': 'event-reception-faceless-06',
  'event-reception-generic-03': 'event-reception-premium-12',
  'event-reception-generic-04': 'event-reception-premium-13',
  'event-reception-generic-05': 'event-reception-premium-14',
  'event-reception-generic-06': 'event-reception-premium-15',
  'event-reception-generic-07': 'event-reception-premium-16',
  'event-reception-generic-08': 'event-reception-premium-17',
  'event-reception-generic-09': 'event-reception-premium-18',
  'event-reception-generic-10': 'event-reception-faceless-07',
  'event-reception-piano-watercolor-01': 'event-reception-premium-20',
  'event-reception-scroll-01': 'event-reception-premium-21',
  'event-sangeet-classic-foreground-01': 'event-sangeet-premium-02',
  'event-sangeet-dance-watercolor-01': 'event-sangeet-faceless-03',
  'event-sangeet-dance-watercolor-02': 'event-sangeet-faceless-04',
  'event-sangeet-dance-watercolor-03': 'event-sangeet-premium-05',
  'event-sangeet-dance-watercolor-04': 'event-sangeet-sketch-05',
  'event-sangeet-dance-watercolor-05': 'event-sangeet-sketch-06',
  'event-sangeet-dance-watercolor-06': 'event-sangeet-sketch-07',
  'event-sangeet-generic-01': 'event-sangeet-faceless-05',
  'event-sangeet-generic-02': 'event-sangeet-premium-10',
  'event-sangeet-generic-03': 'event-sangeet-faceless-06',
  'event-sangeet-generic-04': 'event-sangeet-premium-12',
  'event-sangeet-night-dance-watercolor-01': 'event-sangeet-premium-13',
  'event-sangeet-scroll-01': 'event-sangeet-premium-14',
  'event-wedding-arch-watercolor-01': 'event-wedding-faceless-03',
  'event-wedding-arch-watercolor-02': 'event-wedding-sketch-04',
  'event-wedding-arch-watercolor-03': 'event-wedding-faceless-04',
  'event-wedding-arch-watercolor-04': 'event-wedding-faceless-05',
  'event-wedding-ceremony-watercolor-01': 'event-wedding-faceless-06',
  'event-wedding-ceremony-watercolor-02': 'event-wedding-sketch-05',
  'event-wedding-ceremony-watercolor-03': 'event-wedding-faceless-07',
  'event-wedding-classic-foreground-01': 'event-wedding-premium-10',
  'event-wedding-couple-garden-watercolor-01': 'event-wedding-sketch-06',
  'event-wedding-couple-garden-watercolor-02': 'event-wedding-faceless-08',
  'event-wedding-couple-ivory-watercolor-01': 'event-wedding-faceless-09',
  'event-wedding-couple-peach-watercolor-01': 'event-wedding-faceless-10',
  'event-wedding-couple-watercolor-01': 'event-wedding-sketch-07',
  'event-wedding-couple-watercolor-02': 'event-wedding-premium-16',
  'event-wedding-couple-watercolor-03': 'event-wedding-premium-17',
  'event-wedding-couple-watercolor-04': 'event-wedding-premium-18',
  'event-wedding-garden-watercolor-01': 'event-wedding-premium-19',
  'event-wedding-generic-01': 'event-wedding-premium-20',
  'event-wedding-generic-02': 'event-wedding-faceless-11',
  'event-wedding-generic-03': 'event-wedding-premium-22',
  'event-wedding-generic-04': 'event-wedding-premium-23',
  'event-wedding-generic-05': 'event-wedding-premium-24',
  'event-wedding-generic-06': 'event-wedding-faceless-12',
  'event-wedding-generic-07': 'event-wedding-faceless-13',
  'event-wedding-generic-08': 'event-wedding-premium-27',
  'event-wedding-generic-09': 'event-wedding-faceless-14',
  'event-wedding-mandap-watercolor-01': 'event-wedding-premium-29',
  'event-wedding-red-bridal-watercolor-01': 'event-wedding-premium-30',
  'event-wedding-red-bridal-watercolor-02': 'event-wedding-premium-31',
  'event-wedding-red-bridal-watercolor-03': 'event-wedding-premium-32',
  'event-wedding-red-bridal-watercolor-04': 'event-wedding-faceless-15',
  'event-wedding-red-bridal-watercolor-05': 'event-wedding-premium-34',
  'event-wedding-scroll-01': 'event-wedding-premium-35',
  'event-mehendi-premium-03': 'event-mehendi-sketch-04',
  'event-mehendi-premium-05': 'event-mehendi-sketch-05',
  'event-mehendi-premium-06': 'event-mehendi-faceless-03',
  'event-mehendi-premium-07': 'event-mehendi-faceless-04',
  'event-mehendi-premium-08': 'event-mehendi-sketch-06',
  'event-sangeet-premium-03': 'event-sangeet-faceless-03',
  'event-sangeet-premium-04': 'event-sangeet-faceless-04',
  'event-sangeet-premium-06': 'event-sangeet-sketch-05',
  'event-sangeet-premium-07': 'event-sangeet-sketch-06',
  'event-sangeet-premium-08': 'event-sangeet-sketch-07',
  'event-sangeet-premium-09': 'event-sangeet-faceless-05',
  'event-sangeet-premium-11': 'event-sangeet-faceless-06',
  'event-reception-premium-06': 'event-reception-faceless-03',
  'event-reception-premium-08': 'event-reception-faceless-04',
  'event-reception-premium-09': 'event-reception-faceless-05',
  'event-reception-premium-11': 'event-reception-faceless-06',
  'event-reception-premium-19': 'event-reception-faceless-07',
  'event-wedding-premium-03': 'event-wedding-faceless-03',
  'event-wedding-premium-04': 'event-wedding-sketch-04',
  'event-wedding-premium-05': 'event-wedding-faceless-04',
  'event-wedding-premium-06': 'event-wedding-faceless-05',
  'event-wedding-premium-07': 'event-wedding-faceless-06',
  'event-wedding-premium-08': 'event-wedding-sketch-05',
  'event-wedding-premium-09': 'event-wedding-faceless-07',
  'event-wedding-premium-11': 'event-wedding-sketch-06',
  'event-wedding-premium-12': 'event-wedding-faceless-08',
  'event-wedding-premium-13': 'event-wedding-faceless-09',
  'event-wedding-premium-14': 'event-wedding-faceless-10',
  'event-wedding-premium-15': 'event-wedding-sketch-07',
  'event-wedding-premium-21': 'event-wedding-faceless-11',
  'event-wedding-premium-25': 'event-wedding-faceless-12',
  'event-wedding-premium-26': 'event-wedding-faceless-13',
  'event-wedding-premium-28': 'event-wedding-faceless-14',
  'event-wedding-premium-33': 'event-wedding-faceless-15',
};

const getEventAssetCategoryFromId = (id: string) => id.match(/^event-([a-z0-9]+)-/)?.[1];

const legacyEventAssetPathMap = Object.fromEntries(
  Object.entries(legacyEventAssetIdMap).flatMap(([oldId, newId]) => {
    const oldCategory = getEventAssetCategoryFromId(oldId);
    const newCategory = getEventAssetCategoryFromId(newId);
    if (!oldCategory || !newCategory) return [];
    return [[
      `/assets/events/${oldCategory}/${oldId}.png`,
      eventAssetSrcById[newId] ?? `/assets/events/${newCategory}/${newId}.png`,
    ]];
  }),
);

export const legacyAssetPathMap: Record<string, string> = {
  ...legacyEventAssetPathMap,
  '/assets/hero-v1.mp4': '/assets/opening-reveal/envelope/videos/opening-envelope-video.mp4',
  '/assets/hero-poster-v1.jpeg': '/assets/opening-reveal/envelope/posters/opening-envelope-poster.jpeg',
  '/assets/Ganesha Image.png': '/assets/opening-reveal/envelope/revealed-images/revealed-hindu-classic-01.png',
  '/assets/opening-reveal/envelope/revealed-images/revealed-ganesha-classic-01.png': '/assets/opening-reveal/envelope/revealed-images/revealed-hindu-classic-01.png',
  '/assets/din-shangda-audio.mp3': '/assets/audio/wedding-songs/music-din-shagna-da.mp3',
  '/assets/second section old.png': '/assets/our-story/images/story-pheras-01.png',
  '/assets/theme-2/main-hero-video.mp4': '/assets/opening-reveal/scroll/videos/opening-scroll-video.mp4',
  '/assets/theme-2/hero-poster.png': '/assets/opening-reveal/scroll/posters/opening-scroll-poster.png',
  '/assets/theme-2/first-section.png': '/assets/opening-reveal/scroll/revealed-images/revealed-couple-scroll-01.png',
  '/assets/theme-2/background.png': '/assets/theme-2/background.png',
  '/assets/theme-2/story-bg.png': '/assets/theme-2/story-bg.png',
  '/assets/our-story/images/story-couple-classic-01.png': '/assets/our-story/images/story-pheras-01.png',
  '/assets/our-story/images/story-couple-classic-02.png': '/assets/our-story/images/story-pheras-01.png',
  '/assets/our-story/images/story-couple-scroll-01.png': '/assets/our-story/images/story-pheras-01.png',
  '/assets/our-story/backgrounds/story-bg-scroll-floral-01.png': '/assets/our-story/images/story-pheras-01.png',
  '/assets/our-story/backgrounds/story-bg-scroll-generic-01.png': '/assets/our-story/images/story-pheras-01.png',
  '/assets/haldi.png': '/assets/events/haldi/event-haldi-premium-03-9x16.png',
  '/assets/haldi-bg.png': '/assets/haldi-bg.png',
  '/assets/mehendi.png': '/assets/events/mehendi/event-mehendi-premium-02.png',
  '/assets/mehendi-bg.png': '/assets/mehendi-bg.png',
  '/assets/sangeet.png': '/assets/events/sangeet/event-sangeet-premium-02.png',
  '/assets/sangeet-bg.png': '/assets/sangeet-bg.png',
  '/assets/wedding.png': '/assets/events/wedding/event-wedding-premium-10.png',
  '/assets/wedding-bg.png': '/assets/wedding-bg.png',
  '/assets/reception.png': '/assets/events/reception/event-reception-premium-01.png',
  '/assets/reception-bg.png': '/assets/reception-bg.png',
  '/assets/event-gap-bg.png': '/assets/event-gap-bg.png',
  '/assets/theme-2/haldi.png': '/assets/events/haldi/event-haldi-premium-05-9x16.png',
  '/assets/theme-2/mehendi.png': '/assets/events/mehendi/event-mehendi-premium-09.png',
  '/assets/theme-2/sangeet.png': '/assets/events/sangeet/event-sangeet-premium-14.png',
  '/assets/theme-2/shaadi.png': '/assets/events/wedding/event-wedding-premium-35.png',
  '/assets/theme-2/reception.png': '/assets/events/reception/event-reception-premium-21.png',
  '/assets/heart-frame.png': '/assets/closing-gallery/frames/closing-frame-heart-classic-01.png',
  '/assets/carousel1.png': '/assets/closing-gallery/preset-photos/closing-photo-preset-01.png',
  '/assets/carousel2.png': '/assets/closing-gallery/preset-photos/closing-photo-preset-02.png',
  '/assets/carousel3.png': '/assets/closing-gallery/preset-photos/closing-photo-preset-03.png',
  '/assets/theme-2/carousel1.png': '/assets/closing-gallery/preset-photos/closing-photo-preset-01.png',
  '/assets/theme-2/carousel2.png': '/assets/closing-gallery/preset-photos/closing-photo-preset-02.png',
  '/assets/theme-2/carousel3.png': '/assets/closing-gallery/preset-photos/closing-photo-preset-03.png',
  '/assets/theme-2/din-shangda-audio.mp3': '/assets/audio/wedding-songs/music-din-shagna-da.mp3',
};

export const resolveAssetPath = (path?: string | null) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return legacyAssetPathMap[path] ?? path;
};

export const getThemeDefaults = (themeKey = 'envelope-opening') => (
  assetRegistry.themeDefaults[normalizeTemplateAssetKey(themeKey)] ?? assetRegistry.themeDefaults['envelope-opening']
);

export const getThemeAssets = () => assetRegistry.sections;
export const getOpeningRevealAssets = () => assetRegistry.sections.openingReveal;
export const getOurStoryAssets = () => assetRegistry.sections.ourStory;
export const getEventAssets = () => assetRegistry.sections.events;
export const getClosingGalleryAssets = () => assetRegistry.sections.closingGallery;
export const getAudioAssets = () => assetRegistry.sections.audio;

const recommendedFirst = <Asset extends RegistryAsset>(assets: Asset[], themeKey?: string) => {
  if (!themeKey) return assets;
  return [...assets].sort((a, b) => (
    Number(Boolean(b.recommendedForThemes?.includes(themeKey))) -
    Number(Boolean(a.recommendedForThemes?.includes(themeKey)))
  ));
};

export const getOpeningRevealAnimations = (themeKey?: string) => (
  recommendedFirst(assetRegistry.sections.openingReveal.animations, themeKey)
);

export const getRevealedImages = (themeKey?: string) => (
  recommendedFirst(assetRegistry.sections.openingReveal.revealedImages, themeKey)
);

export const getStoryImages = () => assetRegistry.sections.ourStory.images;

export const getClosingGalleryPresetPhotos = (themeKey?: string) => (
  recommendedFirst(assetRegistry.sections.closingGallery.presetPhotos, themeKey)
);

export const getAllOpeningRevealAnimations = getOpeningRevealAnimations;
export const getAllRevealedImages = getRevealedImages;
export const getAllStoryImages = getStoryImages;
export const getAllClosingGalleryPresetPhotos = getClosingGalleryPresetPhotos;
