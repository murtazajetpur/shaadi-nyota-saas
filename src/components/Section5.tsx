import { useState, useEffect } from 'react';
import './Section5.css';

const CAROUSEL_IMAGES = [
    '/assets/carousel1.png',
    '/assets/carousel2.png',
    '/assets/carousel3.png'
];

export default function Section5() {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
        }, 3500); // 3.5 seconds
        return () => clearInterval(timer);
    }, []);

    return (
        <section className="section-wrapper section-5 closing-section">
            <h2 className="closing-text closing-top">With love</h2>

            <div className="heart-frame-container">
                <div className="carousel-mask">
                    {CAROUSEL_IMAGES.map((src, index) => (
                        <img
                            key={src}
                            src={src}
                            alt={`Memories ${index + 1}`}
                            className={`carousel-image ${index === currentIndex ? 'active' : ''}`}
                        />
                    ))}
                </div>
                <img
                    src="/assets/heart-frame.png"
                    alt="Floral Heart Frame"
                    className="heart-frame-image"
                />
            </div>

            <h2 className="closing-text closing-bottom">Priya & Rahul</h2>
        </section>
    );
}
