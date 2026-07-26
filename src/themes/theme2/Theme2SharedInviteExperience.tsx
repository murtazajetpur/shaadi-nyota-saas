import { useEffect, useMemo, useRef, useState } from 'react';
import { type SampleWeddingData, type WeddingEvent, type WeddingGuest } from '../../data/sampleWeddingData';
import { getWeddingSectionConfig } from '../../data/sectionConfig';
import WeddingSectionRenderer from '../../components/WeddingSectionRenderer';
import Theme2HeroReveal from './Theme2HeroReveal';
import Theme2Couple from './Theme2Couple';
import { getEventTheme2Image, getTheme2CoupleImage } from './theme2Utils';
import { theme2Assets } from './theme2Assets';
import './theme2.css';

interface Theme2SharedInviteExperienceProps {
  data: SampleWeddingData;
  weddingId?: string;
  embedded?: boolean;
  guest?: WeddingGuest;
  visibleEvents?: WeddingEvent[];
  personalizedInviteMode?: boolean;
  enableResponsiveOpeningVideo?: boolean;
}

export default function Theme2SharedInviteExperience({
  data,
  ...props
}: Theme2SharedInviteExperienceProps) {
  const experienceResetKey = [
    data.wedding.slug,
    data.wedding.themeKey,
    data.hero.videoSrc,
    data.hero.revealImageSrc,
    data.hero.revealStyle,
  ].join('|');

  return <Theme2SharedInviteExperienceContent key={experienceResetKey} data={data} {...props} />;
}

function Theme2SharedInviteExperienceContent({
  data,
  weddingId,
  embedded = false,
  guest,
  visibleEvents,
  personalizedInviteMode = false,
  enableResponsiveOpeningVideo = true,
}: Theme2SharedInviteExperienceProps) {
  const eventsToShow = visibleEvents ?? data.events;
  const sectionConfig = getWeddingSectionConfig(data, { visibleEvents });
  const enabledSections = sectionConfig
    .filter((section) => section.enabled && section.type !== 'opening')
    .sort((a, b) => a.order - b.order);
  const shouldShowOurStory = enabledSections.some((section) => section.type === 'story');
  const [heroStarted, setHeroStarted] = useState(false);
  const [heroDone, setHeroDone] = useState(false);
  const [skipRevealProgress, setSkipRevealProgress] = useState(0);
  const [skipRevealBridgeVisible, setSkipRevealBridgeVisible] = useState(false);
  const theme2CoupleBackground = getTheme2CoupleImage(data.couple.backgroundImageSrc || data.hero.revealImageSrc);
  const openingRevealImage = data.hero.skipRevealImage ? theme2CoupleBackground : (data.hero.revealImageSrc || theme2CoupleBackground);
  const [activeBg, setActiveBg] = useState(openingRevealImage);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioFadeFrameRef = useRef<number | null>(null);
  const audioSrc = data.music.audioSrc && !data.music.audioSrc.includes('/assets/din-shangda-audio.mp3')
    ? data.music.audioSrc
    : theme2Assets.audio;

  const bgSequence = useMemo(() => enabledSections.flatMap((section) => {
    switch (section.type) {
      case 'reveal':
        return [openingRevealImage];
      case 'story':
        return [theme2CoupleBackground, theme2Assets.storyBackground];
      case 'events':
        return eventsToShow.map(getEventTheme2Image);
      case 'rsvp':
      case 'closing':
        return [theme2Assets.background];
      default:
        return [];
    }
  }), [enabledSections, openingRevealImage, theme2CoupleBackground, eventsToShow]);

  useEffect(() => {
    if (!heroStarted) return;
    const assets = [
      openingRevealImage,
      ...(shouldShowOurStory ? [theme2CoupleBackground, theme2Assets.storyBackground] : []),
      ...eventsToShow.map(getEventTheme2Image),
      theme2Assets.background,
      ...theme2Assets.carousel,
    ];
    assets.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [openingRevealImage, theme2CoupleBackground, eventsToShow, heroStarted, shouldShowOurStory]);


  const handleSkipRevealProgress = (progress: number) => {
    setSkipRevealProgress(progress);
    if (progress > 0) setSkipRevealBridgeVisible(true);
  };

  const completeHeroReveal = () => {
    setSkipRevealProgress(1);
    if (data.hero.skipRevealImage) {
      setSkipRevealBridgeVisible(true);
      window.setTimeout(() => {
        setSkipRevealBridgeVisible(false);
      }, 520);
    }
    setHeroDone(true);
  };
  const fadeAudioIn = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audioFadeFrameRef.current !== null) {
      window.cancelAnimationFrame(audioFadeFrameRef.current);
    }

    const fadeDurationMs = 2000;
    const startTime = performance.now();
    const startVolume = Number.isFinite(audio.volume) ? audio.volume : 0;

    const fade = (currentTime: number) => {
      const progress = Math.min((currentTime - startTime) / fadeDurationMs, 1);
      if (audioRef.current) {
        audioRef.current.volume = Math.min(1, startVolume + ((1 - startVolume) * progress));
      }
      if (progress < 1) {
        audioFadeFrameRef.current = window.requestAnimationFrame(fade);
      } else {
        audioFadeFrameRef.current = null;
      }
    };

    audioFadeFrameRef.current = window.requestAnimationFrame(fade);
  };

  const playAudioWithFade = () => {
    if (!audioRef.current) return;
    audioRef.current.volume = 0;
    audioRef.current.muted = false;
    audioRef.current.play().then(() => {
      setAudioPlaying(true);
      fadeAudioIn();
    }).catch(() => setAudioPlaying(false));
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (audioPlaying && !audioRef.current.paused) {
      audioRef.current.pause();
      setAudioPlaying(false);
      return;
    }
    audioRef.current.muted = false;
    audioRef.current.play().then(() => setAudioPlaying(true)).catch(() => setAudioPlaying(false));
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const handlePlay = () => setAudioPlaying(true);
    const handlePause = () => setAudioPlaying(false);
    const handleEnded = () => setAudioPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      if (audioFadeFrameRef.current !== null) {
        window.cancelAnimationFrame(audioFadeFrameRef.current);
      }
    };
  }, []);
  const handleScroll = () => {
    if (!canvasRef.current) return;
    const scrollPos = canvasRef.current.scrollTop;
    const vh = canvasRef.current.clientHeight || window.innerHeight;
    const index = Math.round(scrollPos / vh);
    if (bgSequence[index]) setActiveBg(bgSequence[index]);
  };

  const inviteCanvas = (
    <div className="theme2-phone-canvas-wrapper">
      <div className="theme2-blurred-backdrop" style={{ backgroundImage: `url("${activeBg}")` }} />
      <audio ref={audioRef} loop preload="metadata" src={audioSrc} />
      {(heroStarted || heroDone) && (
        <button className="theme2-audio-toggle-btn micro-interaction" onClick={toggleAudio} type="button" aria-label={audioPlaying ? 'Pause music' : 'Play music'}>
          {audioPlaying ? (
            <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          )}
        </button>
      )}

      <div
        className={`theme2-phone-canvas ${!heroDone ? 'theme2-scroll-locked' : ''}`}
        ref={canvasRef}
        onScroll={handleScroll}
      >
        {heroStarted && data.hero.skipRevealImage && skipRevealBridgeVisible && (
          <div className={`theme2-skip-reveal-story-fade ${heroDone ? 'is-settling' : ''}`} style={{ opacity: heroDone ? 1 : skipRevealProgress }} aria-hidden="true">
            <Theme2Couple couple={data.couple} isHeroDone={true} />
          </div>
        )}

        {!(data.hero.skipRevealImage && heroDone) && (
          <Theme2HeroReveal
            hero={data.hero}
            couple={data.couple}
            onStarted={() => setHeroStarted(true)}
            onDone={completeHeroReveal}
            onPlayAudio={playAudioWithFade}
            onSkipRevealProgress={handleSkipRevealProgress}
            enableResponsiveVideo={enableResponsiveOpeningVideo}
            className="theme2-hero-reveal-section"
            showScrollPrompt={heroDone && !data.hero.skipRevealImage}
          />
        )}

        {heroStarted && (
          <WeddingSectionRenderer
            data={data}
            sections={sectionConfig}
            events={eventsToShow}
            weddingId={weddingId}
            guest={guest}
            personalizedInviteMode={personalizedInviteMode}
            showStoryScrollPrompt={heroDone && data.hero.skipRevealImage}
          />
        )}
      </div>
    </div>
  );

  if (embedded) {
    return <div className="theme2-embedded">{inviteCanvas}</div>;
  }

  return <div className="theme2-app-container">{inviteCanvas}</div>;
}

