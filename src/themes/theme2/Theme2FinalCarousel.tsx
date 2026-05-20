import { useEffect, useState } from 'react';
import type { SampleWeddingData } from '../../data/sampleWeddingData';
import { theme2Assets } from './theme2Assets';
import { isExternalAsset, isTheme2Asset } from './theme2Utils';

interface Theme2FinalCarouselProps {
  closing: SampleWeddingData['closing'];
  couple: SampleWeddingData['couple'];
}

const isTheme2OrCustomCarouselImage = (src: string) => {
  return isTheme2Asset(src) || isExternalAsset(src);
};

export default function Theme2FinalCarousel({ closing, couple }: Theme2FinalCarouselProps) {
  const customImages = closing.carouselImages.filter(isTheme2OrCustomCarouselImage);
  const images = customImages.length ? customImages : theme2Assets.carousel;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % images.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [images.length]);

  return (
    <div className="theme2-section theme2-final-section">
      <img src={theme2Assets.background} className="theme2-section-bg" alt="Final background" />
      <div className="theme2-section-overlay theme2-final-overlay" />
      <div className="theme2-section-content visible theme2-final-content">
        <h1 className="theme2-display-font theme2-final-heading">{closing.closingLine || 'With Love'}</h1>
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
        <div className="theme2-final-names">
          <h1 className="theme2-display-font">{couple.groomName}</h1>
          <span className="theme2-ampersand">&amp;</span>
          <h1 className="theme2-display-font">{couple.brideName}</h1>
        </div>
      </div>
    </div>
  );
}
