import { useEffect, useRef, useState, type Ref } from 'react';
import type { WeddingEvent, WeddingGuest } from '../../data/sampleWeddingData';
import { resolveAssetPath } from '../../data/assetRegistry';
import EventAnimationLayer from '../../components/EventAnimationLayer';
import { getEventTheme2Image, getEventTheme2Tone, toGoogleCalendarUrl } from './theme2Utils';

const normalizeInvitedCount = (value: unknown) => Math.max(1, Math.floor(Number(value) || 1));

const getGuestEventInvitedCountLabel = (event: WeddingEvent, guest?: WeddingGuest) => {
  const count = guest
    ? guest.invitedEventCounts?.[event.id] ?? guest.invitedCount
    : event.guestInvitedCount;
  if (count === undefined) return null;
  const eventCount = normalizeInvitedCount(count);
  const familyCount = guest ? normalizeInvitedCount(guest.invitedCount) : null;
  return familyCount && eventCount >= familyCount ? 'All' : String(eventCount);
};

interface Theme2EventSectionProps {
  event: WeddingEvent;
  coupleDisplayName: string;
  isHeroDone: boolean;
  guest?: WeddingGuest;
}

interface Theme2EventFrameProps {
  event: WeddingEvent;
  coupleDisplayName: string;
  guest?: WeddingGuest;
  isVisible?: boolean;
  showActions?: boolean;
  className?: string;
  sectionRef?: Ref<HTMLDivElement>;
}

export function Theme2EventFrame({
  event,
  coupleDisplayName,
  guest,
  isVisible = true,
  showActions = true,
  className = '',
  sectionRef,
}: Theme2EventFrameProps) {
  const tone = getEventTheme2Tone(event);
  const imageSrc = resolveAssetPath(getEventTheme2Image(event));
  const textPosition = event.eventTextPosition === 'middle' || event.eventTextPosition?.startsWith('center') ? 'middle' : 'top';
  const mapsUrl = event.mapsUrl.trim();
  const showCalendar = event.eventShowCalendar !== false;
  const invitedCount = event.eventShowInvitedCount === true ? getGuestEventInvitedCountLabel(event, guest) : null;
  const shouldShowActions = showActions && (showCalendar || Boolean(mapsUrl));

  return (
    <div className={`theme2-section theme2-event-section theme2-event-${tone} theme2-event-text-position-${textPosition} ${className}`} ref={sectionRef}>
      <img src={imageSrc} className="theme2-section-bg" alt={event.eventName} loading="lazy" decoding="async" />
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
          {invitedCount !== null && <p className="theme2-event-invited-count">Invitees: {invitedCount}</p>}
        </div>
        {shouldShowActions && (
          <div className="theme2-event-actions theme2-fade-up cascade-4">
            {showCalendar && (
              <a href={toGoogleCalendarUrl(event, coupleDisplayName)} target="_blank" rel="noopener noreferrer" className="theme2-event-btn">
                Add to Calendar
              </a>
            )}
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="theme2-event-btn">
                View Location
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Theme2EventSection({ event, coupleDisplayName, isHeroDone, guest }: Theme2EventSectionProps) {
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
      guest={guest}
      isVisible={isVisible}
      sectionRef={sectionRef}
    />
  );
}

