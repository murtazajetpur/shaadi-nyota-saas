import { useState, useCallback, useEffect, useRef } from 'react';
import Hero from './Hero';
import AudioPlayer from './AudioPlayer';
import DemoWatermarkOverlay from './DemoWatermarkOverlay';
import { type SampleWeddingData, type WeddingEvent, type WeddingGuest } from '../data/sampleWeddingData';
import { getWeddingSectionConfig, type WeddingSectionConfig } from '../data/sectionConfig';
import WeddingSectionRenderer from './WeddingSectionRenderer';

interface InviteExperienceProps {
  data: SampleWeddingData;
  weddingId?: string;
  embedded?: boolean;
  guest?: WeddingGuest;
  visibleEvents?: WeddingEvent[];
  personalizedInviteMode?: boolean;
  enableResponsiveOpeningVideo?: boolean;
  previewMode?: boolean;
  previewScrollFrame?: boolean;
  forceSectionsVisible?: boolean;
  forceEventsVisible?: boolean;
  demoPreviewMode?: boolean;
}

interface ClassicInviteExperienceProps extends InviteExperienceProps {
  eventsToShow: WeddingEvent[];
  sectionConfig: WeddingSectionConfig[];
}

function ClassicInviteExperience({
  data,
  weddingId,
  embedded = false,
  guest,
  personalizedInviteMode = false,
  enableResponsiveOpeningVideo = true,
  previewMode = false,
  previewScrollFrame = false,
  forceSectionsVisible = false,
  demoPreviewMode = false,
  eventsToShow,
  sectionConfig,
}: ClassicInviteExperienceProps) {
  const [heroDone, setHeroDone] = useState(false);
  const [heroStarted, setHeroStarted] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const contentReady = previewMode || forceSectionsVisible || heroDone;

  const handleHeroComplete = useCallback(() => {
    setHeroDone(true);
  }, []);

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
      if (!data.hero.skipRevealImage) {
        await preloadImage(data.hero.revealImageSrc);
      }

      if (data.couple.enabled) {
        await preloadImage(data.couple.backgroundImageSrc);
      }

      const tier3 = [
        ...eventsToShow.flatMap((event) => [event.foregroundImageSrc, event.backgroundImageSrc]),
        ...data.closing.carouselImages,
        data.closing.frameImageSrc,
        data.rsvp.backgroundImageSrc,
        data.closing.backgroundImageSrc,
      ];
      await Promise.all(tier3.map(preloadImage));
    };

    runPreload();
  }, [heroStarted, data, eventsToShow]);

  const inviteCanvas = (
    <div ref={canvasRef} className={`phone-canvas ${!contentReady ? 'no-scroll' : 'ready-to-snap'} ${previewMode || previewScrollFrame ? 'preview-mode' : ''}`}>
      {(heroStarted || heroDone) && (
        <AudioPlayer
          triggerPlay={heroStarted || heroDone}
          audioSrc={data.music.audioSrc}
          title={data.music.title}
        />
      )}

      {!(data.hero.skipRevealImage && heroDone) && (
        <Hero
          hero={data.hero}
          audioSrc={data.music.audioSrc}
          onHeroStart={() => setHeroStarted(true)}
          onGaneshaReveal={() => undefined}
          onHeroComplete={handleHeroComplete}
          enableResponsiveVideo={enableResponsiveOpeningVideo}
          showScrollPrompt={heroDone && !data.hero.skipRevealImage}
          previewMode={previewMode}
        />
      )}

      {contentReady && (
        <WeddingSectionRenderer
          data={data}
          sections={sectionConfig}
          events={eventsToShow}
        weddingId={weddingId}
        guest={guest}
        personalizedInviteMode={personalizedInviteMode}
      />
      )}
    </div>
  );

  if (embedded) {
    return (
      <>
        {inviteCanvas}
        {demoPreviewMode && <DemoWatermarkOverlay />}
      </>
    );
  }

  return (
    <>
      <div className="desktop-bg-blur" />
      <div className="desktop-vignette" />
      <div className="app-container">{inviteCanvas}</div>
      {demoPreviewMode && <DemoWatermarkOverlay />}
    </>
  );
}

export default function InviteExperience({
  data,
  weddingId,
  embedded = false,
  guest,
  visibleEvents,
  personalizedInviteMode = false,
  enableResponsiveOpeningVideo = true,
  previewMode = false,
  previewScrollFrame = false,
  forceSectionsVisible = false,
  forceEventsVisible = false,
  demoPreviewMode = false,
}: InviteExperienceProps) {
  const eventsToShow = visibleEvents ?? data.events;
  const sectionConfig = getWeddingSectionConfig(data, { visibleEvents }).map((section) => (
    forceEventsVisible && section.type === 'events' && eventsToShow.length > 0
      ? { ...section, enabled: true }
      : section
  ));

  return (
    <ClassicInviteExperience
      key={`${data.wedding.slug}-${data.wedding.themeKey}`}
      data={data}
      weddingId={weddingId}
      embedded={embedded}
      guest={guest}
      visibleEvents={visibleEvents}
      personalizedInviteMode={personalizedInviteMode}
      enableResponsiveOpeningVideo={enableResponsiveOpeningVideo}
      previewMode={previewMode}
      previewScrollFrame={previewScrollFrame}
      forceSectionsVisible={forceSectionsVisible}
      demoPreviewMode={demoPreviewMode}
      eventsToShow={eventsToShow}
      sectionConfig={sectionConfig}
    />
  );
}
