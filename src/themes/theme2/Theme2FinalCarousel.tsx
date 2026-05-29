import { useEffect, useState } from 'react';
import type { SampleWeddingData } from '../../data/sampleWeddingData';
import { resolveAssetPath } from '../../data/assetRegistry';
import { theme2Assets } from './theme2Assets';

interface Theme2FinalCarouselProps {
  closing: SampleWeddingData['closing'];
  couple: SampleWeddingData['couple'];
}

export default function Theme2FinalCarousel({ closing, couple }: Theme2FinalCarouselProps) {
  const images = closing.carouselImages.filter(Boolean).map(resolveAssetPath).slice(0, 3);
  const showGallery = closing.includePhotos && images.length > 0;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!showGallery || images.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % images.length);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [images.length, showGallery]);

  return (
    <div className={`theme2-section theme2-final-section ${showGallery ? 'theme2-final-gallery' : 'theme2-final-simple'}`}>
      <img src={resolveAssetPath(theme2Assets.background)} className="theme2-section-bg" alt="Final background" />
      <div className="theme2-section-overlay theme2-final-overlay" />
      <div className="theme2-section-content visible theme2-final-content">
        <h1 className="theme2-display-font theme2-final-heading">{closing.closingLine || 'With Love'}</h1>
        {closing.message && <p className="theme2-final-message">{closing.message}</p>}
        {showGallery && (
          <div className="theme2-memory-frame-outer">
            <div className="theme2-memory-frame-inner">
              <div className="theme2-carousel-container">
                {images.map((src, imageIndex) => (
                  <img
                    key={src}
                    src={src}
                    className={`theme2-carousel-img ${imageIndex === index ? 'active' : ''}`}
                    alt={`Memory ${imageIndex + 1}`}
                  />
                ))}
              </div>
              <div className="theme2-frame-overlay" />
            </div>
          </div>
        )}
        <div className="theme2-final-names">
          <h1 className="theme2-display-font">
            {closing.coupleDisplayName || `${couple.groomName} & ${couple.brideName}`}
          </h1>
        </div>
      </div>
    </div>
  );
}
