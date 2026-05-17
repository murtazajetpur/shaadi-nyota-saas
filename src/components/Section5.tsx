import { useState, useEffect } from 'react';
import './Section5.css';
import type { SampleWeddingData } from '../data/sampleWeddingData';

interface Section5Props {
    closing: SampleWeddingData['closing'];
}

export default function Section5({ closing }: Section5Props) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % closing.carouselImages.length);
        }, 3500); // 3.5 seconds
        return () => clearInterval(timer);
    }, [closing.carouselImages.length]);

    return (
        <section className="section-wrapper section-5 closing-section">
            <h2 className="closing-text closing-top">{closing.closingLine}</h2>

            <div className="heart-frame-container">
                <div className="carousel-mask">
                    {closing.carouselImages.map((src, index) => (
                        <img
                            key={src}
                            src={src}
                            alt={`Memories ${index + 1}`}
                            className={`carousel-image ${index === currentIndex ? 'active' : ''}`}
                        />
                    ))}
                </div>
                <img
                    src={closing.frameImageSrc}
                    alt="Floral Heart Frame"
                    className="heart-frame-image"
                />
            </div>

            <h2 className="closing-text closing-bottom">{closing.coupleDisplayName}</h2>
        </section>
    );
}
