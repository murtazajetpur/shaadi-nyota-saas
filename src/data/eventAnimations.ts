export type EventAnimationKey =
  | 'none'
  | 'soft-petals'
  | 'soft-petals-blush'
  | 'soft-petals-yellow'
  | 'soft-petals-gold'
  | 'soft-petals-maroon'
  | 'golden-glow';

export interface EventAnimationOption {
  id: EventAnimationKey;
  label: string;
  description: string;
  recommendedFor: string[];
  intensity: 'none' | 'soft';
  tags: string[];
}

export const eventAnimationOptions: EventAnimationOption[] = [
  {
    id: 'none',
    label: 'None',
    description: 'No additional animation.',
    recommendedFor: [],
    intensity: 'none',
    tags: [],
  },
  {
    id: 'soft-petals',
    label: 'Ivory Petals',
    description: 'Gentle light petals for darker or colorful event visuals.',
    recommendedFor: [],
    intensity: 'soft',
    tags: ['petals', 'light', 'romantic'],
  },
  {
    id: 'soft-petals-blush',
    label: 'Blush Petals',
    description: 'Soft rose-blush petals for romantic floral sections.',
    recommendedFor: ['mehendi', 'reception', 'wedding'],
    intensity: 'soft',
    tags: ['petals', 'blush', 'romantic'],
  },
  {
    id: 'soft-petals-yellow',
    label: 'Yellow Petals',
    description: 'Bright yellow petals for Haldi and warm daylight sections.',
    recommendedFor: ['haldi'],
    intensity: 'soft',
    tags: ['petals', 'yellow', 'haldi'],
  },
  {
    id: 'soft-petals-gold',
    label: 'Golden Petals',
    description: 'Warm golden petals for festive Haldi and wedding sections.',
    recommendedFor: ['sangeet'],
    intensity: 'soft',
    tags: ['petals', 'gold', 'premium'],
  },
  {
    id: 'soft-petals-maroon',
    label: 'Maroon Petals',
    description: 'Darker petals for light event visuals that need visible contrast.',
    recommendedFor: [],
    intensity: 'soft',
    tags: ['petals', 'dark', 'contrast'],
  },
  {
    id: 'golden-glow',
    label: 'Golden Glow',
    description: 'Warm glowing light for premium festive sections.',
    recommendedFor: [],
    intensity: 'soft',
    tags: ['glow', 'gold', 'premium'],
  },
];

const legacyAnimationKeyMap: Record<string, EventAnimationKey> = {
  'floral-drift': 'soft-petals-blush',
  sparkles: 'golden-glow',
  'lantern-glow': 'golden-glow',
  'light-rays': 'golden-glow',
  'floating-dust': 'golden-glow',
  'confetti-celebration': 'golden-glow',
};

export const eventAnimationOptionLabels = eventAnimationOptions.reduce<Record<EventAnimationKey, string>>(
  (labels, option) => {
    labels[option.id] = option.label;
    return labels;
  },
  {} as Record<EventAnimationKey, string>
);

export const getEventAnimationByKey = (key?: string) => (
  eventAnimationOptions.find((option) => option.id === key)
);

export const normalizeEventAnimationKey = (key?: string | null): EventAnimationKey => {
  if (!key) return 'none';
  return getEventAnimationByKey(key)?.id ?? legacyAnimationKeyMap[key] ?? 'none';
};

export const getEventAnimationLabel = (key?: string | null) => (
  eventAnimationOptionLabels[normalizeEventAnimationKey(key)]
);

export const isEventAnimationRecommended = (
  animationKey: string | undefined,
  eventKey?: string,
  eventName?: string
) => {
  const option = getEventAnimationByKey(normalizeEventAnimationKey(animationKey));
  if (!option || option.id === 'none') return false;
  const eventText = `${eventKey ?? ''} ${eventName ?? ''}`.toLowerCase();
  return option.recommendedFor.some((category) => eventText.includes(category));
};
