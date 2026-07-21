import type { WeddingEvent } from './sampleWeddingData';
import { assetRegistry, legacyEventAssetIdMap, resolveAssetPath, type RegistryAsset } from './assetRegistry';

export interface EventVisual {
  key: string;
  label: string;
  eventType: string;
  themeKey: string;
  themeLabel: string;
  imageSrc: string;
  thumbnailSrc?: string;
  style?: string;
  defaultTextStyle: 'light' | 'dark';
  previewObjectPosition?: string;
  publicObjectPosition?: string;
  visibility?: RegistryAsset['visibility'];
}

const themeLabelByKey: Record<string, string> = {
  'envelope-opening': 'Envelope Opening',
  'palace-door-opening': 'Palace Door Opening',
  'scroll-opening': 'Scroll Opening',
  'theme-2': 'Scroll Opening',
  'newly-created': 'New Event Library',
  'asset-library': 'Event Library',
  'custom-private': 'Custom Private',
};

const styleTextStyleDefaults: Record<string, 'light' | 'dark'> = {
  faceless: 'dark',
  premium: 'dark',
  sketch: 'dark',
};

const categoryTextStyleDefaults: Record<string, 'light' | 'dark'> = {
  sangeet: 'light',
};

const toEventType = (category: RegistryAsset['category']) => (
  category === 'generic' ? 'generic' : category
);

const toRegistryEventVisual = (asset: RegistryAsset): EventVisual => {
  const sourceTheme = asset.sourceTheme ?? asset.style;
  const defaultTextStyle = categoryTextStyleDefaults[asset.category] ?? styleTextStyleDefaults[asset.style] ?? 'dark';

  return {
    key: asset.id,
    label: asset.label,
    eventType: toEventType(asset.category),
    themeKey: sourceTheme,
    themeLabel: themeLabelByKey[sourceTheme] ?? asset.style,
    imageSrc: resolveAssetPath(asset.src),
    thumbnailSrc: resolveAssetPath(asset.thumbnailSrc ?? asset.previewSrc ?? asset.src),
    style: asset.style,
    defaultTextStyle,
    previewObjectPosition: asset.id === 'event-haldi-premium-05' ? '50% 72%' : 'center center',
    visibility: asset.visibility,
  };
};

const registryEventVisuals = Object.values(assetRegistry.sections.events)
  .flat()
  .filter((asset) => asset.type === 'image' || asset.type === 'background')
  .map(toRegistryEventVisual);

const legacyTheme2VisualKeyMap: Record<string, string> = {
  'theme2-haldi': 'event-haldi-premium-05',
  'theme2-mehendi': 'event-mehendi-premium-04',
  'theme2-sangeet': 'event-sangeet-premium-14',
  'theme2-shaadi': 'event-wedding-premium-35',
  'theme2-reception': 'event-reception-premium-20',
  'theme2-generic': 'event-generic-premium-12',
};

export const eventVisuals: EventVisual[] = registryEventVisuals;

export const getEventVisualByKey = (key?: string) => (
  eventVisuals.find((visual) => visual.key === (key ? legacyTheme2VisualKeyMap[key] ?? legacyEventAssetIdMap[key] ?? key : key))
);

export const getEventVisualsForTheme = (themeKey: string) => (
  eventVisuals.filter((visual) => visual.themeKey === themeKey)
);

const eventTypeToTheme2VisualKey: Record<string, string> = {
  haldi: 'theme2-haldi',
  mehendi: 'theme2-mehendi',
  sangeet: 'theme2-sangeet',
  wedding: 'theme2-shaadi',
  nikah: 'theme2-shaadi',
  nikaah: 'theme2-shaadi',
  reception: 'theme2-reception',
  walima: 'theme2-reception',
  generic: 'theme2-generic',
  custom: 'theme2-generic',
};

const eventTypeToRegistryCategory: Record<string, string> = {
  custom: 'generic',
  generic: 'generic',
  haldi: 'haldi',
  mehendi: 'mehendi',
  nikaah: 'wedding',
  nikah: 'wedding',
  reception: 'reception',
  sangeet: 'sangeet',
  walima: 'reception',
  wedding: 'wedding',
};

const getRecommendedCategoryFromText = (value: string) => {
  const key = value.toLowerCase();
  if (key.includes('haldi') || key.includes('turmeric')) return 'haldi';
  if (key.includes('mehendi') || key.includes('mehndi') || key.includes('henna')) return 'mehendi';
  if (
    key.includes('sangeet') ||
    key.includes('music') ||
    key.includes('dance') ||
    key.includes('qawwali') ||
    key.includes('carnival')
  ) {
    return 'sangeet';
  }
  if (
    key.includes('wedding') ||
    key.includes('shaadi') ||
    key.includes('nikaah') ||
    key.includes('nikah') ||
    key.includes('ceremony')
  ) {
    return 'wedding';
  }
  if (key.includes('reception') || key.includes('walima') || key.includes('dinner')) {
    return 'reception';
  }
  return 'generic';
};

const getRecommendedTheme2KeyFromText = (value: string) => {
  const key = value.toLowerCase();
  if (key.includes('haldi') || key.includes('turmeric')) return 'theme2-haldi';
  if (key.includes('mehendi') || key.includes('mehndi') || key.includes('henna')) return 'theme2-mehendi';
  if (
    key.includes('sangeet') ||
    key.includes('music') ||
    key.includes('dance') ||
    key.includes('qawwali') ||
    key.includes('carnival')
  ) {
    return 'theme2-sangeet';
  }
  if (
    key.includes('wedding') ||
    key.includes('shaadi') ||
    key.includes('nikaah') ||
    key.includes('nikah') ||
    key.includes('ceremony')
  ) {
    return 'theme2-shaadi';
  }
  if (key.includes('reception') || key.includes('walima') || key.includes('dinner')) {
    return 'theme2-reception';
  }
  return 'theme2-generic';
};

export const getRecommendedVisualForEvent = (
  eventName: string,
  eventKey: WeddingEvent['eventKey'],
  themeKey: string
) => {
  const normalizedEventKey = eventKey?.trim().toLowerCase();

  if (themeKey === 'theme-2' || themeKey === 'scroll-opening') {
    const visualKey = normalizedEventKey ? eventTypeToTheme2VisualKey[normalizedEventKey] : undefined;
    return getEventVisualByKey(visualKey ?? getRecommendedTheme2KeyFromText(eventName));
  }

  const category = normalizedEventKey
    ? eventTypeToRegistryCategory[normalizedEventKey] ?? getRecommendedCategoryFromText(eventName)
    : getRecommendedCategoryFromText(eventName);
  const currentThemeVisual = eventVisuals.find((visual) => (
    visual.eventType === category && visual.themeKey === themeKey
  ));
  if (currentThemeVisual) return currentThemeVisual;

  return eventVisuals.find((visual) => visual.eventType === category);
};
