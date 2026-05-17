import { useEffect, useRef, useState } from 'react';
import './Section3.css';

export default function Section3() {
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
            {/* 1. Haldi */}
            <section ref={haldiRef} className="section-wrapper event-section haldi-bg">
                {showHaldiParticles && (
                    <div className="haldi-particles">
                        {Array.from({ length: 15 }).map((_, i) => (
                            <div
                                key={i}
                                className="haldi-particle"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    animationDelay: `${Math.random() * 2}s`
                                }}
                            />
                        ))}
                    </div>
                )}

                <div className="event-content-overlay">
                    <h3 className="event-title">Haldi</h3>
                    <div className="event-details">
                        <p>28th December 2026</p>
                        <p>10:00 AM</p>
                        <p>Taj Mahal Palace</p>
                        <p>Mumbai</p>
                    </div>
                    <div className="event-actions">
                        <button className="minimal-link-btn" onClick={() => alert('Calendar link (placeholder)')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            Add to Calendar
                        </button>
                        <button className="minimal-link-btn" onClick={() => alert('Map link (placeholder)')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            View Location
                        </button>
                    </div>
                </div>
            </section>

            {/* 2. Mehendi */}
            <section ref={mehendiRef} className="section-wrapper event-section mehendi-bg">
                {showMehendiParticles && (
                    <div className="mehendi-particles">
                        {Array.from({ length: 15 }).map((_, i) => (
                            <div
                                key={`mehendi-${i}`}
                                className="mehendi-particle"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    animationDelay: `${Math.random() * 2}s`
                                }}
                            />
                        ))}
                    </div>
                )}

                <div className="event-content-overlay">
                    <h3 className="event-title">Mehendi</h3>
                    <div className="event-details">
                        <p>28th December 2026</p>
                        <p>4:00 PM</p>
                        <p>Taj Mahal Palace</p>
                        <p>Mumbai</p>
                    </div>
                    <div className="event-actions">
                        <button className="minimal-link-btn micro-interaction" onClick={() => alert('Calendar link (placeholder)')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            Add to Calendar
                        </button>
                        <button className="minimal-link-btn micro-interaction" onClick={() => alert('Map link (placeholder)')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            View Location
                        </button>
                    </div>
                </div>
            </section>

            {/* 2. Sangeet */}
            <section className="section-wrapper event-section sangeet-bg">
                <div className="event-content-overlay">
                    <h3 className="event-title">Sangeet</h3>
                    <div className="event-details">
                        <p>29th December 2026</p>
                        <p>7:00 PM</p>
                        <p>Taj Mahal Palace</p>
                        <p>Mumbai</p>
                    </div>
                    <div className="event-actions">
                        <button className="minimal-link-btn" onClick={() => alert('Calendar link (placeholder)')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            Add to Calendar
                        </button>
                        <button className="minimal-link-btn" onClick={() => alert('Map link (placeholder)')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            View Location
                        </button>
                    </div>
                </div>
            </section>

            {/* 4. Wedding */}
            <section className="section-wrapper event-section wedding-bg">
                <div className="event-content-overlay">
                    <h3 className="event-title wedding-title">Wedding</h3>
                    <div className="event-details">
                        <p>30th December 2026</p>
                        <p>9:00 AM</p>
                        <p>Taj Mahal Palace</p>
                        <p>Mumbai</p>
                    </div>
                    <div className="event-actions">
                        <button className="minimal-link-btn micro-interaction" onClick={() => alert('Calendar link (placeholder)')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            Add to Calendar
                        </button>
                        <button className="minimal-link-btn micro-interaction" onClick={() => alert('Map link (placeholder)')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            View Location
                        </button>
                    </div>
                </div>
            </section>

            {/* 5. Reception */}
            <section className="section-wrapper event-section reception-bg">
                <div className="event-content-overlay">
                    <h3 className="event-title">Reception</h3>
                    <div className="event-details">
                        <p>31st December 2026</p>
                        <p>7:00 PM</p>
                        <p>Taj Mahal Palace</p>
                        <p>Mumbai</p>
                    </div>
                    <div className="event-actions">
                        <button className="minimal-link-btn" onClick={() => alert('Calendar link (placeholder)')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            Add to Calendar
                        </button>
                        <button className="minimal-link-btn" onClick={() => alert('Map link (placeholder)')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            View Location
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
