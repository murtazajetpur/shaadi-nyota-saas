import { useEffect, useRef, useState } from 'react';
import type { SampleWeddingData } from '../../data/sampleWeddingData';
import { theme2Assets } from './theme2Assets';
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
    <div className="theme2-section theme2-our-story-section" ref={sectionRef}>
      <img
        src={theme2Assets.storyBackground}
        className="theme2-section-bg theme2-our-story-bg"
        alt=""
        loading="lazy"
      />
      <img
        src={getTheme2CoupleImage(couple.backgroundImageSrc)}
        className="theme2-our-story-portrait"
        alt={couple.imageAlt || couple.displayName}
        loading="lazy"
      />
      <div className="theme2-section-overlay theme2-our-story-overlay" />
      <div className={`theme2-section-content theme2-our-story-content ${isVisible ? 'visible' : ''}`}>
        {couple.displayName.trim() && <span className="theme2-our-story-names theme2-fade-up cascade-1">{couple.displayName}</span>}
        {couple.introLine.trim() && <span className="theme2-our-story-intro theme2-fade-up cascade-2">{couple.introLine}</span>}
        {couple.storyTitle.trim() && <h1 className="theme2-script-font theme2-fade-up cascade-3">{couple.storyTitle}</h1>}
        {couple.storyText.trim() && <p className="theme2-our-story-copy theme2-fade-up cascade-4">{couple.storyText}</p>}
      </div>
    </div>
  );
}
