import { useEffect, useRef, useState } from 'react';
import type { SampleWeddingData } from '../../data/sampleWeddingData';
import { theme2Assets } from './theme2Assets';
import { getTheme2CoupleImage } from './theme2Utils';

interface Theme2HeroRevealProps {
  hero: SampleWeddingData['hero'];
  couple: SampleWeddingData['couple'];
  onStarted: () => void;
  onDone: () => void;
  onPlayAudio: () => void;
}

export default function Theme2HeroReveal({
  hero,
  couple,
  onStarted,
  onDone,
  onPlayAudio,
}: Theme2HeroRevealProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [posterOpacity, setPosterOpacity] = useState(1);
  const [videoOpacity, setVideoOpacity] = useState(1);
  const [mandapOpacity, setMandapOpacity] = useState(0);
  const [showHero, setShowHero] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<number[]>([]);
  const mandapImage = getTheme2CoupleImage(couple.backgroundImageSrc);
  const videoSrc = hero.videoSrc && !hero.videoSrc.includes('/assets/hero-v1.mp4') ? hero.videoSrc : theme2Assets.heroVideo;
  const posterSrc = hero.posterSrc && !hero.posterSrc.includes('/assets/hero-poster-v1') ? hero.posterSrc : theme2Assets.heroPoster;

  const handleTap = () => {
    if (isRevealed) return;
    setIsRevealed(true);
    setPosterOpacity(0);

    videoRef.current?.play().catch(() => undefined);
    onPlayAudio();
    onStarted();

    timerRef.current.push(window.setTimeout(() => setMandapOpacity(1), 3800));
    timerRef.current.push(window.setTimeout(() => setVideoOpacity(0), 5000));
    timerRef.current.push(window.setTimeout(() => setShowHero(false), 4500));
    timerRef.current.push(window.setTimeout(onDone, 5500));
  };

  useEffect(() => {
    return () => {
      timerRef.current.forEach(window.clearTimeout);
    };
  }, []);

  return (
    <div className={`theme2-hero-reveal ${!showHero ? 'theme2-reveal-fade-out' : ''}`} onClick={handleTap}>
      <img
        src={mandapImage}
        className="theme2-hero-poster"
        style={{ opacity: mandapOpacity, transition: 'opacity 1.2s ease-out', zIndex: 10 }}
        alt={couple.displayName}
      />

      <video
        ref={videoRef}
        className="theme2-hero-video"
        playsInline
        muted={false}
        poster={posterSrc}
        style={{ opacity: videoOpacity, transition: 'opacity 0.8s ease-out', zIndex: 11 }}
      >
        <source src={videoSrc} type="video/mp4" />
      </video>

      <div
        className="theme2-hero-poster"
        style={{
          zIndex: 12,
          opacity: posterOpacity,
          transition: 'opacity 0.8s ease-out',
          pointerEvents: isRevealed ? 'none' : 'auto',
          overflow: 'hidden',
          background: '#000',
        }}
      >
        <img src={posterSrc} className="theme2-hero-poster" style={{ position: 'absolute' }} alt={couple.displayName} />
        <div className="theme2-hero-vignette" />
        <div className="theme2-hero-overlay-top" style={{ opacity: posterOpacity }}>
          <div className="theme2-hero-invitation">You are cordially invited to the wedding of</div>
        </div>
        <div className="theme2-hero-overlay-bottom" style={{ opacity: posterOpacity }}>
          <div className="theme2-hero-names">{couple.groomName}<br />&amp; {couple.brideName}</div>
        </div>
      </div>

      <button
        className="theme2-tap-to-reveal"
        style={{
          opacity: posterOpacity,
          pointerEvents: isRevealed ? 'none' : 'auto',
          zIndex: 100,
          transition: 'all 0.5s ease-out',
        }}
        onClick={handleTap}
        type="button"
      >
        {hero.revealCtaText || 'Tap to Reveal'}
      </button>
    </div>
  );
}
