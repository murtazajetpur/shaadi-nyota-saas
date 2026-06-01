import { assetRegistry, getThemeDefaults, normalizeTemplateAssetKey, type ThemeDefaults } from './assetRegistry';
import type { EventAnimationKey, RevealStyle } from './sampleWeddingData';

export type TemplateKey = 'envelope-opening' | 'scroll-opening' | 'palace-door-opening';
export type LegacyTemplateKey = TemplateKey | 'theme-2';
export type WeddingSectionType = 'opening' | 'reveal' | 'story' | 'events' | 'rsvp' | 'closing';

export interface TemplatePreset {
  key: TemplateKey;
  displayName: string;
  description: string;
  defaultSectionOrder: WeddingSectionType[];
  legacyKeys?: string[];
  openingReveal: {
    defaultRevealStyle: RevealStyle;
    animationId: string;
    posterId: string;
    revealedImageId: string;
  };
  eventDefaults: {
    visualIds: ThemeDefaults['eventVisualDefaults'];
    animationKey: EventAnimationKey;
  };
  ourStory: {
    imageId: string;
  };
  closingGallery: {
    backgroundId?: string;
    presetPhotoIds: string[];
  };
  audioId: string;
  styleTags: string[];
}

const sectionOrder: WeddingSectionType[] = ['opening', 'reveal', 'story', 'events', 'rsvp', 'closing'];

const getOpeningAnimation = (animationId: string) => (
  assetRegistry.sections.openingReveal.animations.find((animation) => animation.id === animationId)
);

const makePreset = (
  key: TemplateKey,
  metadata: Pick<TemplatePreset, 'displayName' | 'description' | 'eventDefaults' | 'styleTags' | 'legacyKeys'>,
): TemplatePreset => {
  const defaults = getThemeDefaults(key);
  const openingAnimation = getOpeningAnimation(defaults.openingRevealAnimationId);

  return {
    key,
    ...metadata,
    defaultSectionOrder: sectionOrder,
    openingReveal: {
      defaultRevealStyle: openingAnimation?.revealStyle ?? 'envelope',
      animationId: defaults.openingRevealAnimationId,
      posterId: defaults.openingRevealPosterId,
      revealedImageId: defaults.revealedImageId,
    },
    ourStory: {
      imageId: defaults.ourStoryImageId,
    },
    closingGallery: {
      backgroundId: defaults.closingBackgroundId,
      presetPhotoIds: defaults.closingPresetPhotoIds,
    },
    audioId: defaults.audioId,
  };
};

export const templatePresets: Record<TemplateKey, TemplatePreset> = {
  'envelope-opening': makePreset('envelope-opening', {
    displayName: 'Envelope Opening',
    description: 'A classic invitation preset with an envelope reveal and blessing image.',
    eventDefaults: {
      visualIds: getThemeDefaults('envelope-opening').eventVisualDefaults,
      animationKey: 'golden-glow',
    },
    styleTags: ['envelope', 'classic', 'ceremonial'],
  }),
  'scroll-opening': makePreset('scroll-opening', {
    displayName: 'Scroll Opening',
    description: 'A soft cinematic scroll-opening preset with floral reveal timing.',
    legacyKeys: ['theme-2'],
    eventDefaults: {
      visualIds: getThemeDefaults('scroll-opening').eventVisualDefaults,
      animationKey: 'soft-petals',
    },
    styleTags: ['scroll', 'floral', 'cinematic'],
  }),
  'palace-door-opening': makePreset('palace-door-opening', {
    displayName: 'Palace Door Opening',
    description: 'A royal palace-door opening preset that reveals the blessing image from the glow.',
    eventDefaults: {
      visualIds: getThemeDefaults('palace-door-opening').eventVisualDefaults,
      animationKey: 'golden-glow',
    },
    styleTags: ['classic', 'palace', 'ceremonial'],
  }),
};

export const normalizeTemplateKey = (templateKey?: string): TemplateKey => {
  const normalizedKey = normalizeTemplateAssetKey(templateKey);
  return (templatePresets[normalizedKey as TemplateKey] ? normalizedKey : 'envelope-opening') as TemplateKey;
};

export const getTemplatePreset = (templateKey?: string) => {
  return templatePresets[normalizeTemplateKey(templateKey)];
};
