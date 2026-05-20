import { useEffect, useRef, useState } from 'react';
import type { SampleWeddingData } from '../../data/sampleWeddingData';
import { getTheme2CoupleImage } from './theme2Utils';

interface Theme2CoupleProps {
  couple: SampleWeddingData['couple'];
  isHeroDone: boolean;
}

export default function Theme2Couple({ couple, isHeroDone }: Theme2CoupleProps) {
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
    if (inView && isHeroDone) setIsVisible(true);
  }, [inView, isHeroDone]);

  return (
    <div className="theme2-section" ref={sectionRef}>
      <img
        src={getTheme2CoupleImage(couple.backgroundImageSrc)}
        className="theme2-section-bg"
        alt={couple.displayName}
        loading="lazy"
      />
      <div className="theme2-section-overlay theme2-overlay-couple" />
      <div className={`theme2-section-content ${isVisible ? 'visible' : ''}`} style={{ marginTop: '16dvh' }}>
        <h1 className="theme2-display-font theme2-fade-up cascade-1">{couple.groomName}</h1>
        <span className="theme2-ampersand theme2-fade-up cascade-2">&amp;</span>
        <h1 className="theme2-display-font theme2-fade-up cascade-3">{couple.brideName}</h1>
        <h2 className="theme2-body-font theme2-fade-up cascade-4">{couple.introLine || 'are getting married'}</h2>
      </div>
    </div>
  );
}
