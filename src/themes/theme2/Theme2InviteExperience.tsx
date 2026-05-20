import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { hasRsvpAccess, type SampleWeddingData, type WeddingEvent, type WeddingGuest } from '../../data/sampleWeddingData';
import Theme2HeroReveal from './Theme2HeroReveal';
import Theme2Couple from './Theme2Couple';
import Theme2Story from './Theme2Story';
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
}

export default function Theme2InviteExperience({
  data,
  weddingId,
  embedded = false,
  guest,
  visibleEvents,
  personalizedInviteMode = false,
}: Theme2InviteExperienceProps) {
  const eventsToShow = visibleEvents ?? data.events;
  const shouldShowRsvp = hasRsvpAccess(data) && data.rsvp.enabled;
  const [heroStarted, setHeroStarted] = useState(false);
  const [heroDone, setHeroDone] = useState(false);
  const theme2CoupleBackground = getTheme2CoupleImage(data.couple.backgroundImageSrc);
  const [activeBg, setActiveBg] = useState(theme2CoupleBackground);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioSrc = data.music.audioSrc && !data.music.audioSrc.includes('/assets/din-shangda-audio.mp3')
    ? data.music.audioSrc
    : theme2Assets.audio;

  const bgSequence = useMemo(() => [
    theme2CoupleBackground,
    theme2Assets.storyBackground,
    ...eventsToShow.map(getEventTheme2Image),
    theme2Assets.background,
    theme2Assets.background,
  ], [theme2CoupleBackground, eventsToShow]);

  useEffect(() => {
    setHeroStarted(false);
    setHeroDone(false);
    setActiveBg(theme2CoupleBackground);
    setAudioPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [data, theme2CoupleBackground]);

  useEffect(() => {
    if (!heroStarted) return;
    const assets = [
      theme2CoupleBackground,
      theme2Assets.storyBackground,
      ...eventsToShow.map(getEventTheme2Image),
      theme2Assets.background,
      ...theme2Assets.carousel,
    ];
    assets.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [theme2CoupleBackground, eventsToShow, heroStarted]);

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

  const inviteCanvas = (
    <div className="theme2-phone-canvas-wrapper">
      <div className="theme2-blurred-backdrop" style={{ backgroundImage: `url("${activeBg}")` }} />
      <audio ref={audioRef} loop preload="auto" src={audioSrc} />
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
        className="theme2-phone-canvas"
        ref={canvasRef}
        onScroll={handleScroll}
        style={{
          opacity: heroStarted || heroDone ? 1 : 0,
          transition: 'opacity 1s ease-in',
        }}
      >
        {heroStarted && (
          <>
            {data.couple.enabled && <Theme2Couple couple={data.couple} isHeroDone={heroDone} />}
            <Theme2Story couple={data.couple} isHeroDone={heroDone} />
            {eventsToShow.map((event) => (
              <Theme2EventSection key={event.id} event={event} coupleDisplayName={data.couple.displayName} isHeroDone={heroDone} />
            ))}
            {shouldShowRsvp && (
              <div className="theme2-rsvp-section">
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
            )}
            <Theme2FinalCarousel closing={data.closing} couple={data.couple} />
          </>
        )}
      </div>

      {!heroDone && (
        <div className="theme2-hero-overlay-shell">
          <Theme2HeroReveal
            hero={data.hero}
            couple={data.couple}
            onStarted={() => setHeroStarted(true)}
            onDone={() => setHeroDone(true)}
            onPlayAudio={playAudioWithFade}
          />
        </div>
      )}
    </div>
  );

  if (embedded) {
    return <div className="theme2-embedded">{inviteCanvas}</div>;
  }

  return <div className="theme2-app-container">{inviteCanvas}</div>;
}
