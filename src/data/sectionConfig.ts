import { hasRsvpAccess, type SampleWeddingData, type WeddingEvent } from './sampleWeddingData';
import { getTemplatePreset, type TemplatePreset, type WeddingSectionType } from './templatePresets';

export interface WeddingSectionConfig {
  id: WeddingSectionType;
  type: WeddingSectionType;
  enabled: boolean;
  order: number;
  variant: string;
  dataKey: keyof Pick<SampleWeddingData, 'hero' | 'couple' | 'events' | 'rsvp' | 'closing'>;
  reason?: string;
}

interface SectionConfigOptions {
  visibleEvents?: WeddingEvent[];
}

const dataKeyBySection: Record<WeddingSectionType, WeddingSectionConfig['dataKey']> = {
  opening: 'hero',
  reveal: 'hero',
  story: 'couple',
  events: 'events',
  rsvp: 'rsvp',
  closing: 'closing',
};

const isSectionEnabled = (
  section: WeddingSectionType,
  data: SampleWeddingData,
  eventsToShow: WeddingEvent[],
) => {
  switch (section) {
    case 'opening':
    case 'reveal':
      return true;
    case 'story':
      return data.couple.enabled;
    case 'events':
      return eventsToShow.length > 0;
    case 'rsvp':
      return hasRsvpAccess(data) && data.rsvp.enabled;
    case 'closing':
      return true;
    default:
      return false;
  }
};

const getSectionVariant = (section: WeddingSectionType, preset: TemplatePreset, data: SampleWeddingData) => {
  if (section === 'opening' || section === 'reveal') {
    return data.hero.revealStyle || preset.openingReveal.defaultRevealStyle;
  }

  // Templates are starting presets only. Non-opening sections now render through
  // the common section components unless a future wedding-level override is added.
  return 'common';
};

export const getWeddingSectionConfig = (
  data: SampleWeddingData,
  options: SectionConfigOptions = {},
): WeddingSectionConfig[] => {
  const preset = getTemplatePreset(data.wedding.themeKey);
  const eventsToShow = options.visibleEvents ?? data.events;

  // For now section order comes from the selected template preset. Persisted
  // wedding-level ordering can be layered in here later as an override.
  return preset.defaultSectionOrder.map((section, index) => ({
    id: section,
    type: section,
    enabled: isSectionEnabled(section, data, eventsToShow),
    order: index + 1,
    variant: getSectionVariant(section, preset, data),
    dataKey: dataKeyBySection[section],
  }));
};

export const getEnabledWeddingSections = (
  data: SampleWeddingData,
  options: SectionConfigOptions = {},
) => getWeddingSectionConfig(data, options).filter((section) => section.enabled);
