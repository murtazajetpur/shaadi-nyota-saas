import { type MouseEvent, useEffect, useRef, useState } from 'react';
import type { SampleWeddingData } from '../../data/sampleWeddingData';
import { openingRevealCrossfadeSeconds } from '../../data/openingReveal';
import { theme2Assets } from './theme2Assets';
import { getTheme2CoupleImage } from './theme2Utils';
import { useOpeningRevealVideoSrc } from '../../hooks/useOpeningRevealVideoSrc';
import OpeningRevealScrollPrompt from '../../components/OpeningRevealScrollPrompt';

interface Theme2HeroRevealProps {
  hero: SampleWeddingData['hero'];
  couple: SampleWeddingData['couple'];
  onStarted: () => void;
  onDone: () => void;
  onPlayAudio: () => void;
  enableResponsiveVideo?: boolean;
  className?: string;
  showScrollPrompt?: boolean;
}

export default function Theme2HeroReveal({
  hero,
  couple,
  onStarted,
  onDone,
  onPlayAudio,
  enableResponsiveVideo = true,
  className = '',
  showScrollPrompt = false,
}: Theme2HeroRevealProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [posterOpacity, setPosterOpacity] = useState(1);
  const [mandapOpacity, setMandapOpacity] = useState(0);
  const [videoOpacity, setVideoOpacity] = useState(1);
  const [isRevealComplete, setIsRevealComplete] = useState(false);
  const [isRevealImageReady, setIsRevealImageReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const doneTimeoutRef = useRef<number | null>(null);
  const revealImagePreloadRef = useRef<Promise<void> | null>(null);
  const doneCalledRef = useRef(false);
  const mandapImage = getTheme2CoupleImage(couple.backgroundImageSrc);
  const videoSrc = hero.videoSrc && !hero.videoSrc.includes('/assets/hero-v1.mp4') ? hero.videoSrc : theme2Assets.heroVideo;
  const responsiveVideoSrc = useOpeningRevealVideoSrc(videoSrc);
  const selectedVideoSrc = enableResponsiveVideo ? responsiveVideoSrc : videoSrc;
  const posterSrc = hero.posterSrc && !hero.posterSrc.includes('/assets/hero-poster-v1') ? hero.posterSrc : theme2Assets.heroPoster;
  const skipRevealImage = hero.skipRevealImage === true;
  const revealImage = hero.revealImageSrc || mandapImage;

  const getRevealProgress = (currentTime: number, duration: number) => {
    const configuredStart = Number.isFinite(hero.revealImageShowAtSeconds)
      ? hero.revealImageShowAtSeconds
      : Number.NaN;
    const fallbackStart = Number.isFinite(duration) && duration > 0
      ? Math.max(0, duration - openingRevealCrossfadeSeconds)
      : 0;
    const revealStart = Number.isFinite(configuredStart) && configuredStart >= 0
      ? configuredStart
      : fallbackStart;

    return Math.min(
      1,
      Math.max(0, (currentTime - revealStart) / openingRevealCrossfadeSeconds),
    );
  };

  const handleTap = async (event?: MouseEvent<HTMLElement>) => {
    event?.stopPropagation();
    if (isRevealed) return;

    if (!skipRevealImage && !isRevealImageReady && revealImagePreloadRef.current) {
      await revealImagePreloadRef.current;
    }

    setIsRevealed(true);
    setPosterOpacity(0);

    window.requestAnimationFrame(() => {
      videoRef.current?.play().catch(() => undefined);
    });
    onPlayAudio();
    onStarted();

  };

  useEffect(() => {
    let isMounted = true;
    setIsRevealImageReady(false);
    revealImagePreloadRef.current = null;

    if (skipRevealImage) {
      setIsRevealImageReady(true);
    } else if (revealImage) {
      const image = new Image();
      image.decoding = 'sync';
      image.src = revealImage;
      revealImagePreloadRef.current = (image.decode
        ? image.decode()
        : new Promise<void>((resolve) => {
          image.onload = () => resolve();
          image.onerror = () => resolve();
        }))
        .catch(() => undefined)
        .then(() => {
          if (isMounted) setIsRevealImageReady(true);
        });
    } else {
      setIsRevealImageReady(true);
    }

    return () => {
      isMounted = false;
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      if (doneTimeoutRef.current !== null) {
        window.clearTimeout(doneTimeoutRef.current);
      }
    };
  }, [revealImage, skipRevealImage]);

  const completeReveal = () => {
    if (doneCalledRef.current) return;
    doneCalledRef.current = true;
    if (skipRevealImage) {
      onDone();
      return;
    }
    setIsRevealComplete(true);
    setMandapOpacity(1);
    setVideoOpacity(0);
    videoRef.current?.pause();
    doneTimeoutRef.current = window.setTimeout(() => {
      onDone();
    }, 250);
  };

  useEffect(() => {
    if (!isRevealed) return undefined;

    const tick = () => {
      if (!videoRef.current) return;

      if (skipRevealImage) {
        const { currentTime, duration } = videoRef.current;
        if (Number.isFinite(duration) && duration > 0 && duration - currentTime <= 0.12) {
          completeReveal();
          return;
        }
        animationFrameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      const progress = getRevealProgress(videoRef.current.currentTime, videoRef.current.duration);
      setMandapOpacity(progress);
      if (progress >= 0.98) {
        completeReveal();
        return;
      }
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
  }, [isRevealed, hero.revealImageShowAtSeconds, skipRevealImage]);

  return (
    <div
      className={`theme2-hero-reveal ${className}`}
      style={{
        backgroundImage: `url(${isRevealed && !skipRevealImage ? revealImage : posterSrc})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
      onClick={handleTap}
    >
      {!skipRevealImage && (
        <img
          src={revealImage}
          className="theme2-hero-poster"
          loading="eager"
          decoding="sync"
          style={{ opacity: isRevealComplete ? 1 : mandapOpacity, transition: 'opacity 120ms linear', zIndex: 13 }}
          alt={couple.displayName}
        />
      )}

      <video
        key={selectedVideoSrc}
        ref={videoRef}
        className="theme2-hero-video"
        playsInline
        muted={false}
        poster={posterSrc}
        style={{
          zIndex: 11,
          opacity: isRevealComplete ? 0 : videoOpacity,
          visibility: isRevealComplete ? 'hidden' : 'visible',
        }}
        onEnded={completeReveal}
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
      {showScrollPrompt && <OpeningRevealScrollPrompt />}
    </div>
  );
}
