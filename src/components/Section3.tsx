import { useEffect, useRef, useState } from 'react';
import './Section3.css';
import type { RefObject } from 'react';
import type { SampleWeddingData, WeddingEvent } from '../data/sampleWeddingData';
import { getEventVisualByKey } from '../data/eventVisuals';
import { resolveAssetPath } from '../data/assetRegistry';
import EventAnimationLayer from './EventAnimationLayer';

interface Section3Props {
    events: SampleWeddingData['events'];
}

const monthLookup: Record<string, number> = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
};

const toCalendarDateTime = (date: string, startTime: string) => {
    const dateMatch = date.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/);
    const timeMatch = startTime.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);

    if (!dateMatch || !timeMatch) return null;

    const day = Number(dateMatch[1]);
    const month = monthLookup[dateMatch[2].toLowerCase()];
    const year = Number(dateMatch[3]);
    let hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2] ?? '0');
    const period = timeMatch[3].toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    if (month === undefined) return null;

    const start = new Date(year, month, day, hours, minutes);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    const format = (value: Date) => {
        const pad = (part: number) => String(part).padStart(2, '0');
        return [
            value.getFullYear(),
            pad(value.getMonth() + 1),
            pad(value.getDate()),
            'T',
            pad(value.getHours()),
            pad(value.getMinutes()),
            '00',
        ].join('');
    };

    return `${format(start)}/${format(end)}`;
};

const createGoogleCalendarUrl = (event: WeddingEvent) => {
    const dates = toCalendarDateTime(event.date, event.startTime);
    const details = [event.calendarDescription, event.mapsUrl].filter(Boolean).join('\n\n');
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.calendarTitle || event.eventName,
        details,
        location: [event.venueName, event.city].filter(Boolean).join(', '),
    });

    if (dates) {
        params.set('dates', dates);
    }

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

function EventParticles({ eventId }: { eventId: string }) {
    if (eventId !== 'haldi' && eventId !== 'mehendi') return null;

    const particleClassName = eventId === 'haldi' ? 'haldi-particle' : 'mehendi-particle';
    const containerClassName = eventId === 'haldi' ? 'haldi-particles' : 'mehendi-particles';

    return (
        <div className={containerClassName}>
            {Array.from({ length: 15 }).map((_, i) => (
                <div
                    key={`${eventId}-${i}`}
                    className={particleClassName}
                    style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 2}s`
                    }}
                />
            ))}
        </div>
    );
}

export function EventSection({
    event,
    sectionRef,
    showParticles,
}: {
    event: WeddingEvent;
    sectionRef?: RefObject<HTMLElement | null>;
    showParticles: boolean;
}) {
    const selectedVisual = getEventVisualByKey(event.eventVisualKey);
    const foregroundImage = resolveAssetPath(event.foregroundImageSrc);
    const backgroundImage = resolveAssetPath(event.backgroundImageSrc);
    const selectedImage = resolveAssetPath(selectedVisual?.imageSrc);
    const resolvedTextStyle = event.eventTextStyle === 'light' || event.eventTextStyle === 'dark'
        ? event.eventTextStyle
        : selectedVisual?.defaultTextStyle ?? 'dark';
    const backgroundStyle = selectedImage
        ? { backgroundImage: `url('${selectedImage}')` }
        : { backgroundImage: `url('${foregroundImage}'), url('${backgroundImage}')` };

    const mapsUrl = event.mapsUrl.trim();

    const handleMapClick = () => {
        if (mapsUrl) {
            window.open(mapsUrl, '_blank');
        }
    };

    const handleCalendarClick = () => {
        window.open(createGoogleCalendarUrl(event), '_blank');
    };

    return (
        <section
            ref={sectionRef}
            className={[
                'section-wrapper',
                'event-section',
                `${event.id}-bg`,
                selectedImage ? 'event-section-selected-visual' : '',
                `event-section-text-${resolvedTextStyle}`,
            ].filter(Boolean).join(' ')}
            style={backgroundStyle}
        >
            {showParticles && <EventParticles eventId={event.id} />}
            <EventAnimationLayer animationKey={event.eventAnimationKey} eventCategory={event.eventKey ?? event.id} />

            <div className="event-content-overlay">
                <h3 className={`event-title ${event.id === 'wedding' ? 'wedding-title' : ''}`}>
                    {event.eventName}
                </h3>
                <div className="event-details">
                    <p>{event.date}</p>
                    <p>{event.startTime}</p>
                    <p>{event.venueName}</p>
                    <p>{event.city}</p>
                </div>
                <div className="event-actions">
                    <button className={`minimal-link-btn ${event.id === 'mehendi' || event.id === 'wedding' ? 'micro-interaction' : ''}`} onClick={handleCalendarClick}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        Add to Calendar
                    </button>
                    {mapsUrl && (
                        <button className={`minimal-link-btn ${event.id === 'mehendi' || event.id === 'wedding' ? 'micro-interaction' : ''}`} onClick={handleMapClick}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            View Location
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
}

export default function Section3({ events }: Section3Props) {
    const haldiRef = useRef<HTMLElement>(null);
    const mehendiRef = useRef<HTMLElement>(null);
    const [showHaldiParticles, setShowHaldiParticles] = useState(false);
    const [showMehendiParticles, setShowMehendiParticles] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.target === haldiRef.current && entry.isIntersecting && !showHaldiParticles) {
                        setShowHaldiParticles(true);
                    }
                    if (entry.target === mehendiRef.current && entry.isIntersecting && !showMehendiParticles) {
                        setShowMehendiParticles(true);
                    }
                });
            },
            { threshold: 0.3 }
        );

        if (haldiRef.current) observer.observe(haldiRef.current);
        if (mehendiRef.current) observer.observe(mehendiRef.current);
        return () => observer.disconnect();
    }, [showHaldiParticles, showMehendiParticles]);

    return (
        <div className="events-container">
            {events.map((event) => (
                <EventSection
                    key={event.id}
                    event={event}
                    sectionRef={event.id === 'haldi' ? haldiRef : event.id === 'mehendi' ? mehendiRef : undefined}
                    showParticles={
                        (event.id === 'haldi' && showHaldiParticles) ||
                        (event.id === 'mehendi' && showMehendiParticles)
                    }
                />
            ))}
        </div>
    );
}
