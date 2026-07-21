import { useState, useCallback, useEffect, useRef } from 'react';
import Hero from './Hero';
import AudioPlayer from './AudioPlayer';
import DemoWatermarkOverlay from './DemoWatermarkOverlay';
import { type SampleWeddingData, type WeddingEvent, type WeddingGuest } from '../data/sampleWeddingData';
import { getWeddingSectionConfig, type WeddingSectionConfig } from '../data/sectionConfig';
import WeddingSectionRenderer from './WeddingSectionRenderer';
import { resolveAssetPath } from '../data/assetRegistry';
import { getEventVisualByKey } from '../data/eventVisuals';

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
  const sectionsMounted = previewMode || forceSectionsVisible || heroStarted || heroDone;

  const handleHeroComplete = useCallback(() => {
    setHeroDone(true);
  }, []);

  useEffect(() => {
    if (!heroStarted) return;

    const preloadImage = (src?: string) => {
      const resolvedSrc = resolveAssetPath(src ?? '');
      if (!resolvedSrc) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = resolvedSrc;
    };

    const imageSources = new Set<string>();
    if (!data.hero.skipRevealImage) imageSources.add(data.hero.revealImageSrc);
    imageSources.add(data.hero.posterSrc);
    imageSources.add(data.couple.backgroundImageSrc);
    eventsToShow.forEach((event) => {
      imageSources.add(event.foregroundImageSrc);
      imageSources.add(event.backgroundImageSrc);
      const visual = getEventVisualByKey(event.eventVisualKey);
      if (visual?.imageSrc) imageSources.add(visual.imageSrc);
    });
    data.closing.carouselImages.forEach((src) => imageSources.add(src));
    imageSources.add(data.closing.frameImageSrc);
    imageSources.add(data.rsvp.backgroundImageSrc);
    imageSources.add(data.closing.backgroundImageSrc);

    imageSources.forEach(preloadImage);
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

      {sectionsMounted && (
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
