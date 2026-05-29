import './EventAnimationLayer.css';
import { normalizeEventAnimationKey, type EventAnimationKey } from '../data/eventAnimations';

interface EventAnimationLayerProps {
  animationKey?: string | null;
  eventCategory?: string;
  previewMode?: boolean;
  className?: string;
}

const particleCountByAnimation: Record<EventAnimationKey, number> = {
  none: 0,
  'soft-petals': 20,
  'soft-petals-blush': 20,
  'soft-petals-yellow': 20,
  'soft-petals-gold': 20,
  'soft-petals-maroon': 20,
  'golden-glow': 7,
};

export default function EventAnimationLayer({
  animationKey,
  eventCategory,
  previewMode = false,
  className = '',
}: EventAnimationLayerProps) {
  const normalizedKey = normalizeEventAnimationKey(animationKey);
  if (normalizedKey === 'none') return null;

  const baseCount = particleCountByAnimation[normalizedKey];
  const particleCount = previewMode ? Math.max(4, Math.round(baseCount * 0.62)) : baseCount;

  return (
    <div
      className={[
        'event-animation-layer',
        `event-animation-${normalizedKey}`,
        previewMode ? 'event-animation-preview' : '',
        eventCategory ? `event-animation-category-${eventCategory}` : '',
        className,
      ].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      {Array.from({ length: particleCount }).map((_, index) => (
        <span key={`${normalizedKey}-${index}`} className="event-animation-particle" />
      ))}
    </div>
  );
}
