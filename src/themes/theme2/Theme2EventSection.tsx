import { useEffect, useRef, useState, type Ref } from 'react';
import type { WeddingEvent } from '../../data/sampleWeddingData';
import { resolveAssetPath } from '../../data/assetRegistry';
import EventAnimationLayer from '../../components/EventAnimationLayer';
import { getEventTheme2Image, getEventTheme2Tone, toGoogleCalendarUrl } from './theme2Utils';

interface Theme2EventSectionProps {
  event: WeddingEvent;
  coupleDisplayName: string;
  isHeroDone: boolean;
}

interface Theme2EventFrameProps {
  event: WeddingEvent;
  coupleDisplayName: string;
  isVisible?: boolean;
  showActions?: boolean;
  className?: string;
  sectionRef?: Ref<HTMLDivElement>;
}

export function Theme2EventFrame({
  event,
  coupleDisplayName,
  isVisible = true,
  showActions = true,
  className = '',
  sectionRef,
}: Theme2EventFrameProps) {
  const tone = getEventTheme2Tone(event);
  const imageSrc = resolveAssetPath(getEventTheme2Image(event));

  return (
    <div className={`theme2-section theme2-event-section theme2-event-${tone} ${className}`} ref={sectionRef}>
      <img src={imageSrc} className="theme2-section-bg" alt={event.eventName} loading="lazy" />
      <EventAnimationLayer animationKey={event.eventAnimationKey} eventCategory={event.eventKey ?? event.id} />
      <div className={`theme2-section-overlay theme2-event-overlay theme2-event-overlay-${tone}`} />
      <div className={`theme2-section-content theme2-event-content ${isVisible ? 'visible' : ''}`}>
        <h1 className="theme2-display-font theme2-fade-up cascade-1">{event.eventName}</h1>
        <div className="theme2-event-date theme2-fade-up cascade-2">
          <h2 className="theme2-body-font">{event.date}</h2>
          <h2 className="theme2-body-font">{event.startTime}</h2>
        </div>
        <div className="theme2-event-venue theme2-fade-up cascade-3">
          <h2 className="theme2-body-font">{event.venueName}</h2>
          <h2 className="theme2-body-font">{event.city}</h2>
        </div>
        {showActions && (
          <div className="theme2-event-actions theme2-fade-up cascade-4">
            <a href={toGoogleCalendarUrl(event, coupleDisplayName)} target="_blank" rel="noopener noreferrer" className="theme2-event-btn">
              Add to Calendar
            </a>
            {event.mapsUrl.trim() && (
              <a href={event.mapsUrl.trim()} target="_blank" rel="noopener noreferrer" className="theme2-event-btn">
                Google Maps
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Theme2EventSection({ event, coupleDisplayName, isHeroDone }: Theme2EventSectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setInView(true);
    }, { threshold: 0.1 });
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (inView && isHeroDone) {
      setIsVisible(true);
    }
  }, [inView, isHeroDone]);

  return (
    <Theme2EventFrame
      event={event}
      coupleDisplayName={coupleDisplayName}
      isVisible={isVisible}
      sectionRef={sectionRef}
    />
  );
}
