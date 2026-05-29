import { useEffect, useRef, useState } from 'react';
import type { SampleWeddingData } from '../../data/sampleWeddingData';
import { theme2Assets } from './theme2Assets';
import { getTheme2CoupleImage } from './theme2Utils';

interface Theme2StoryProps {
  couple: SampleWeddingData['couple'];
  isHeroDone: boolean;
}

export default function Theme2Story({ couple, isHeroDone }: Theme2StoryProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const introCopy = couple.introLine.trim();
  const storyCopy = couple.storyText.trim();
  const storyTitle = couple.storyTitle.trim();
  const storyImage = getTheme2CoupleImage(couple.backgroundImageSrc);

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
    <div className="theme2-section theme2-story-section" ref={sectionRef}>
      <img src={theme2Assets.storyBackground} className="theme2-section-bg" alt="Story background" loading="lazy" />
      <img src={storyImage} className="theme2-story-image" alt={couple.imageAlt || couple.displayName} loading="lazy" />
      <div className="theme2-section-overlay theme2-story-overlay" />
      <div className={`theme2-section-content theme2-story-content ${isVisible ? 'visible' : ''}`}>
        <div className="theme2-story-heading">
          {couple.displayName.trim() && <span className="theme2-story-names theme2-fade-up cascade-1">{couple.displayName}</span>}
          {introCopy && <span className="theme2-story-intro theme2-fade-up cascade-2">{introCopy}</span>}
          {storyTitle && <h1 className="theme2-script-font theme2-fade-up cascade-2">{storyTitle}</h1>}
        </div>
        {storyCopy && <p className="theme2-story-copy theme2-fade-up cascade-3">{storyCopy}</p>}
      </div>
    </div>
  );
}
