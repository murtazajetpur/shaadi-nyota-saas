import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { type SampleWeddingData, type WeddingEvent, type WeddingGuest } from '../../data/sampleWeddingData';
import { getWeddingSectionConfig, type WeddingSectionConfig } from '../../data/sectionConfig';
import Theme2HeroReveal from './Theme2HeroReveal';
import Theme2Couple from './Theme2Couple';
import Theme2EventSection from './Theme2EventSection';
import Theme2FinalCarousel from './Theme2FinalCarousel';
import { getEventTheme2Image, getTheme2CoupleImage } from './theme2Utils';
import { theme2Assets } from './theme2Assets';
import './theme2.css';

const Section4 = lazy(() => import('../../components/Section4'));

interface Theme2InviteExperienceProps {
  data: SampleWeddingData;
  weddingId?: string;
  embedded?: boolean;
  guest?: WeddingGuest;
  visibleEvents?: WeddingEvent[];
  personalizedInviteMode?: boolean;
  enableResponsiveOpeningVideo?: boolean;
}

export default function Theme2InviteExperience({
  data,
  weddingId,
  embedded = false,
  guest,
  visibleEvents,
  personalizedInviteMode = false,
  enableResponsiveOpeningVideo = true,
}: Theme2InviteExperienceProps) {
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
  const experienceResetKey = [
    data.wedding.slug,
    data.wedding.themeKey,
    data.hero.videoSrc,
    data.hero.revealImageSrc,
    data.hero.revealStyle,
  ].join('|');
  const [activeBg, setActiveBg] = useState(theme2CoupleBackground);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioSrc = data.music.audioSrc && !data.music.audioSrc.includes('/assets/din-shangda-audio.mp3')
    ? data.music.audioSrc
    : theme2Assets.audio;

  const bgSequence = useMemo(() => enabledSections.flatMap((section) => {
    switch (section.type) {
      case 'reveal':
        if (data.hero.skipRevealImage && heroDone) return null;
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
    setHeroStarted(false);
    setHeroDone(false);
    setActiveBg(openingRevealImage);
    setAudioPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [experienceResetKey, openingRevealImage]);

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
  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (audioPlaying) {
      audioRef.current.pause();
      setAudioPlaying(false);
      return;
    }
    audioRef.current.play().then(() => setAudioPlaying(true)).catch(() => undefined);
  };

  const playAudioWithFade = () => {
    if (!audioRef.current) return;
    audioRef.current.volume = 0;
    audioRef.current.play().then(() => {
      setAudioPlaying(true);
      let volume = 0;
      const fadeInterval = window.setInterval(() => {
        volume += 0.05;
        if (audioRef.current) audioRef.current.volume = Math.min(volume, 1);
        if (volume >= 1) window.clearInterval(fadeInterval);
      }, 150);
    }).catch(() => undefined);
  };

  const handleScroll = () => {
    if (!canvasRef.current) return;
    const scrollPos = canvasRef.current.scrollTop;
    const vh = canvasRef.current.clientHeight || window.innerHeight;
    const index = Math.round(scrollPos / vh);
    if (bgSequence[index]) setActiveBg(bgSequence[index]);
  };

  const renderTheme2Section = (section: WeddingSectionConfig) => {
    switch (section.type) {
      case 'reveal':
        if (data.hero.skipRevealImage && heroDone) return null;
        return (
          <Theme2HeroReveal
            key={section.id}
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
        );
      case 'story':
        return <Theme2Couple key={section.id} couple={data.couple} isHeroDone={heroDone} showScrollPrompt={heroDone && data.hero.skipRevealImage} />;
      case 'events':
        return eventsToShow.map((event) => (
          <Theme2EventSection key={event.id} event={event} coupleDisplayName={data.couple.displayName} isHeroDone={heroDone} guest={guest} />
        ));
      case 'rsvp':
        return (
          <div key={section.id} className="theme2-rsvp-section">
            <Suspense fallback={null}>
              <Section4
                rsvp={data.rsvp}
                weddingId={weddingId}
                weddingSlug={data.wedding.slug}
                events={eventsToShow}
                guest={guest}
                personalizedInviteMode={personalizedInviteMode}
              />
            </Suspense>
          </div>
        );
      case 'closing':
        return <Theme2FinalCarousel key={section.id} closing={data.closing} couple={data.couple} />;
      default:
        return null;
    }
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

        {enabledSections.map((section) => {
          if (section.type !== 'reveal' && (!heroStarted || (data.hero.skipRevealImage && !heroDone))) return null;
          return renderTheme2Section(section);
        })}
      </div>
    </div>
  );

  if (embedded) {
    return <div className="theme2-embedded">{inviteCanvas}</div>;
  }

  return <div className="theme2-app-container">{inviteCanvas}</div>;
}

