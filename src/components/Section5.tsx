import { useState, useEffect } from 'react';
import './Section5.css';
import type { SampleWeddingData } from '../data/sampleWeddingData';
import { resolveAssetPath } from '../data/assetRegistry';

interface Section5Props {
    closing: SampleWeddingData['closing'];
}

export default function Section5({ closing }: Section5Props) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const galleryImages = closing.carouselImages.filter(Boolean).map(resolveAssetPath).slice(0, 3);
    const showGallery = closing.includePhotos && galleryImages.length > 0;
    const primaryImage = galleryImages[currentIndex] ?? '';

    useEffect(() => {
        if (!showGallery || galleryImages.length <= 1) return undefined;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % galleryImages.length);
        }, 2500);
        return () => clearInterval(timer);
    }, [galleryImages.length, showGallery]);

    return (
        <section className={`section-wrapper section-5 closing-section ${showGallery ? 'with-gallery' : 'simple-closing'}`}>
            <div className="closing-section-content">
                <h2 className="closing-text closing-top">{closing.closingLine}</h2>
                {closing.message && <p className="closing-message">{closing.message}</p>}

                {showGallery && (
                    <div className="closing-circle-gallery">
                        {galleryImages.map((src, index) => (
                            <img
                                key={src}
                                src={src}
                                alt={`Memories ${index + 1}`}
                                className={`carousel-image ${index === currentIndex ? 'active' : ''}`}
                            />
                        ))}
                    </div>
                )}

                {showGallery && galleryImages.length > 1 && (
                    <div className="closing-carousel-dots">
                        {galleryImages.map((src) => (
                            <i key={src} className={src === primaryImage ? 'active' : ''} />
                        ))}
                    </div>
                )}

                <h2 className="closing-text closing-bottom">{closing.coupleDisplayName}</h2>
            </div>
        </section>
    );
}
