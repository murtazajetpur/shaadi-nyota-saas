import type { WeddingEvent } from './sampleWeddingData';

export interface EventVisual {
  key: string;
  label: string;
  eventType: string;
  themeKey: string;
  themeLabel: string;
  imageSrc: string;
  defaultTextStyle: 'light' | 'dark';
  previewObjectPosition?: string;
  publicObjectPosition?: string;
}

export const eventVisuals: EventVisual[] = [
  {
    key: 'theme2-haldi',
    label: 'Haldi',
    eventType: 'haldi',
    themeKey: 'theme-2',
    themeLabel: 'Scroll Opening Invite',
    imageSrc: '/assets/theme-2/haldi.png',
    defaultTextStyle: 'dark',
    previewObjectPosition: '50% 72%',
  },
  {
    key: 'theme2-mehendi',
    label: 'Mehendi',
    eventType: 'mehendi',
    themeKey: 'theme-2',
    themeLabel: 'Scroll Opening Invite',
    imageSrc: '/assets/theme-2/mehendi.png',
    defaultTextStyle: 'dark',
    previewObjectPosition: 'center center',
  },
  {
    key: 'theme2-sangeet',
    label: 'Sangeet / Music',
    eventType: 'sangeet',
    themeKey: 'theme-2',
    themeLabel: 'Scroll Opening Invite',
    imageSrc: '/assets/theme-2/sangeet.png',
    defaultTextStyle: 'light',
    previewObjectPosition: 'center center',
  },
  {
    key: 'theme2-shaadi',
    label: 'Wedding / Nikaah',
    eventType: 'wedding',
    themeKey: 'theme-2',
    themeLabel: 'Scroll Opening Invite',
    imageSrc: '/assets/theme-2/shaadi.png',
    defaultTextStyle: 'dark',
    previewObjectPosition: 'center center',
  },
  {
    key: 'theme2-reception',
    label: 'Reception / Walima',
    eventType: 'reception',
    themeKey: 'theme-2',
    themeLabel: 'Scroll Opening Invite',
    imageSrc: '/assets/theme-2/reception.png',
    defaultTextStyle: 'dark',
    previewObjectPosition: 'center center',
  },
  {
    key: 'theme2-generic',
    label: 'Generic Floral',
    eventType: 'custom',
    themeKey: 'theme-2',
    themeLabel: 'Scroll Opening Invite',
    imageSrc: '/assets/theme-2/background.png',
    defaultTextStyle: 'dark',
    previewObjectPosition: 'center center',
  },
];

export const getEventVisualByKey = (key?: string) => (
  eventVisuals.find((visual) => visual.key === key)
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
  if (themeKey !== 'theme-2') return undefined;

  const normalizedEventKey = eventKey?.trim().toLowerCase();
  const visualKey = normalizedEventKey ? eventTypeToTheme2VisualKey[normalizedEventKey] : undefined;
  return getEventVisualByKey(visualKey ?? getRecommendedTheme2KeyFromText(eventName));
};
