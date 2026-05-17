import { useEffect, useRef, useState } from 'react';
import './Section3.css';
import type { RefObject } from 'react';
import type { SampleWeddingData, WeddingEvent } from '../data/sampleWeddingData';

interface Section3Props {
    events: SampleWeddingData['events'];
}

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

function EventSection({
    event,
    sectionRef,
    showParticles,
}: {
    event: WeddingEvent;
    sectionRef?: RefObject<HTMLElement | null>;
    showParticles: boolean;
}) {
    const handleMapClick = () => {
        if (event.mapsUrl) {
            window.open(event.mapsUrl, '_blank');
        }
    };

    return (
        <section
            ref={sectionRef}
            className={`section-wrapper event-section ${event.id}-bg`}
            style={{
                backgroundImage: `url('${event.foregroundImageSrc}'), url('${event.backgroundImageSrc}')`,
            }}
        >
            {showParticles && <EventParticles eventId={event.id} />}

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
                    <button className={`minimal-link-btn ${event.id === 'mehendi' || event.id === 'wedding' ? 'micro-interaction' : ''}`} onClick={() => alert('Calendar link (placeholder)')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        Add to Calendar
                    </button>
                    <button className={`minimal-link-btn ${event.id === 'mehendi' || event.id === 'wedding' ? 'micro-interaction' : ''}`} onClick={handleMapClick}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        View Location
                    </button>
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
