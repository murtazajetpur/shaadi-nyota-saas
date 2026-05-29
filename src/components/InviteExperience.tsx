import { useState, useCallback, Suspense, lazy, useEffect } from 'react';
import Hero from './Hero';
import Section1 from './Section1';
import AudioPlayer from './AudioPlayer';
import { hasRsvpAccess, type SampleWeddingData, type WeddingEvent, type WeddingGuest } from '../data/sampleWeddingData';
import Theme2InviteExperience from '../themes/theme2/Theme2InviteExperience';

const Section2 = lazy(() => import('./Section2'));
const Section3 = lazy(() => import('./Section3'));
const Section4 = lazy(() => import('./Section4'));
const Section5 = lazy(() => import('./Section5'));

interface InviteExperienceProps {
  data: SampleWeddingData;
  weddingId?: string;
  embedded?: boolean;
  guest?: WeddingGuest;
  visibleEvents?: WeddingEvent[];
  personalizedInviteMode?: boolean;
  enableResponsiveOpeningVideo?: boolean;
}

export default function InviteExperience({
  data,
  weddingId,
  embedded = false,
  guest,
  visibleEvents,
  personalizedInviteMode = false,
  enableResponsiveOpeningVideo = true,
}: InviteExperienceProps) {
  if (data.wedding.themeKey === 'theme-2') {
    return (
      <Theme2InviteExperience
        data={data}
        weddingId={weddingId}
        embedded={embedded}
        guest={guest}
        visibleEvents={visibleEvents}
        personalizedInviteMode={personalizedInviteMode}
        enableResponsiveOpeningVideo={enableResponsiveOpeningVideo}
      />
    );
  }

  const eventsToShow = visibleEvents ?? data.events;
  const shouldShowRsvp = hasRsvpAccess(data) && data.rsvp.enabled;
  const [ganeshaVisible, setGaneshaVisible] = useState(false);
  const [heroDone, setHeroDone] = useState(false);
  const [heroStarted, setHeroStarted] = useState(false);

  const handleGaneshaReveal = useCallback(() => setGaneshaVisible(true), []);
  const handleHeroComplete = useCallback(() => setHeroDone(true), []);

  useEffect(() => {
    setGaneshaVisible(false);
    setHeroDone(false);
    setHeroStarted(false);
  }, [data]);

  useEffect(() => {
    if (!heroStarted) return;

    const preloadImage = (src: string) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = resolve;
        img.src = src;
      });
    };

    const runPreload = async () => {
      await preloadImage(data.hero.revealImageSrc);

      if (data.couple.enabled) {
        await preloadImage(data.couple.backgroundImageSrc);
      }

      const tier3 = [
        ...eventsToShow.flatMap((event) => [event.foregroundImageSrc, event.backgroundImageSrc]),
        ...data.closing.carouselImages,
        data.closing.frameImageSrc,
      ];
      await Promise.all(tier3.map(preloadImage));
    };

    runPreload();
  }, [heroStarted, data, eventsToShow]);

  const inviteCanvas = (
    <div className={`phone-canvas ${!heroDone ? 'no-scroll' : 'ready-to-snap'}`}>
      {(heroStarted || heroDone) && (
        <AudioPlayer
          triggerPlay={heroStarted || heroDone}
          audioSrc={data.music.audioSrc}
          title={data.music.title}
        />
      )}

      {heroDone && (
        <>
          <Section1 ganeshaVisible={ganeshaVisible} hero={data.hero} settled />
          <Suspense fallback={null}>
            {data.couple.enabled && <Section2 couple={data.couple} />}
            <Section3 events={eventsToShow} />
            {shouldShowRsvp && (
              <Section4
                rsvp={data.rsvp}
                weddingId={weddingId}
                weddingSlug={data.wedding.slug}
                events={eventsToShow}
                guest={guest}
                personalizedInviteMode={personalizedInviteMode}
              />
            )}
            <Section5 closing={data.closing} />
          </Suspense>
        </>
      )}

      {!heroDone && (
        <Hero
          hero={data.hero}
          audioSrc={data.music.audioSrc}
          onHeroStart={() => setHeroStarted(true)}
          onGaneshaReveal={handleGaneshaReveal}
          onHeroComplete={handleHeroComplete}
          enableResponsiveVideo={enableResponsiveOpeningVideo}
        />
      )}
    </div>
  );

  if (embedded) {
    return inviteCanvas;
  }

  return (
    <>
      <div className="desktop-bg-blur" />
      <div className="desktop-vignette" />
      <div className="app-container">{inviteCanvas}</div>
    </>
  );
}
