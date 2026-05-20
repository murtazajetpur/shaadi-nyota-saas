import { useEffect, useRef, useState } from 'react';
import type { SampleWeddingData } from '../../data/sampleWeddingData';
import { theme2Assets } from './theme2Assets';

interface Theme2StoryProps {
  couple: SampleWeddingData['couple'];
  isHeroDone: boolean;
}

export default function Theme2Story({ couple, isHeroDone }: Theme2StoryProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const introCopy = couple.introLine?.trim();
  const blessingCopy = couple.blessingLine?.trim();
  const storyCopy = [introCopy, blessingCopy].filter(Boolean).join(' ') ||
    'With love in our hearts and joy in every moment, we invite you to join us in celebrating the beginning of our forever.';

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
      <img src={theme2Assets.storyBackground} className="theme2-section-bg" alt="Story background" loading="lazy" />
      <div className="theme2-section-overlay theme2-story-overlay" />
      <div className={`theme2-section-content theme2-story-content ${isVisible ? 'visible' : ''}`}>
        <div>
          <h2 className="theme2-story-kicker theme2-fade-up cascade-1">Two Hearts,</h2>
          <h1 className="theme2-script-font theme2-fade-up cascade-2">One Beautiful Story</h1>
        </div>
        <p className="theme2-story-copy theme2-fade-up cascade-3">
          {storyCopy}
        </p>
      </div>
    </div>
  );
}
