import { useEffect, useRef, useState } from 'react';
import type { SampleWeddingData } from '../../data/sampleWeddingData';
import { getOpeningRevealCrossfadeProgress } from '../../data/openingReveal';
import { theme2Assets } from './theme2Assets';
import { getTheme2CoupleImage } from './theme2Utils';
import { useOpeningRevealVideoSrc } from '../../hooks/useOpeningRevealVideoSrc';

interface Theme2HeroRevealProps {
  hero: SampleWeddingData['hero'];
  couple: SampleWeddingData['couple'];
  onStarted: () => void;
  onDone: () => void;
  onPlayAudio: () => void;
  enableResponsiveVideo?: boolean;
}

export default function Theme2HeroReveal({
  hero,
  couple,
  onStarted,
  onDone,
  onPlayAudio,
  enableResponsiveVideo = true,
}: Theme2HeroRevealProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [posterOpacity, setPosterOpacity] = useState(1);
  const [mandapOpacity, setMandapOpacity] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mandapImage = getTheme2CoupleImage(couple.backgroundImageSrc);
  const videoSrc = hero.videoSrc && !hero.videoSrc.includes('/assets/hero-v1.mp4') ? hero.videoSrc : theme2Assets.heroVideo;
  const responsiveVideoSrc = useOpeningRevealVideoSrc(videoSrc);
  const selectedVideoSrc = enableResponsiveVideo ? responsiveVideoSrc : videoSrc;
  const posterSrc = hero.posterSrc && !hero.posterSrc.includes('/assets/hero-poster-v1') ? hero.posterSrc : theme2Assets.heroPoster;
  const revealImage = hero.revealImageSrc || mandapImage;

  const handleTap = () => {
    if (isRevealed) return;
    setIsRevealed(true);
    setPosterOpacity(0);

    videoRef.current?.play().catch(() => undefined);
    onPlayAudio();
    onStarted();

  };

  useEffect(() => {
    if (revealImage) {
      const image = new Image();
      image.src = revealImage;
    }
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [revealImage]);

  useEffect(() => {
    if (!isRevealed) return undefined;

    const tick = () => {
      if (!videoRef.current) return;
      const progress = getOpeningRevealCrossfadeProgress(videoRef.current.currentTime, videoRef.current.duration);
      setMandapOpacity(progress);
      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(tick);
      }
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isRevealed]);

  return (
    <div className="theme2-hero-reveal" onClick={handleTap}>
      <img
        src={revealImage}
        className="theme2-hero-poster"
        style={{ opacity: mandapOpacity, transition: 'opacity 120ms linear', zIndex: 12 }}
        alt={couple.displayName}
      />

      <video
        key={selectedVideoSrc}
        ref={videoRef}
        className="theme2-hero-video"
        playsInline
        muted={false}
        poster={posterSrc}
        style={{ zIndex: 11 }}
        onEnded={() => {
          setMandapOpacity(1);
          onDone();
        }}
      >
        <source src={selectedVideoSrc} type="video/mp4" />
      </video>

      <div
        className="theme2-hero-poster"
        style={{
          zIndex: 12,
          opacity: posterOpacity,
          transition: 'opacity 0.8s ease-out',
          pointerEvents: isRevealed ? 'none' : 'auto',
          backgroundImage: `url(${posterSrc})`,
        }}
      />

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
