import { useState, useCallback, useEffect, useRef } from 'react';
import Hero from './Hero';
import Section2 from './Section2';
import AudioPlayer from './AudioPlayer';
import DemoWatermarkOverlay from './DemoWatermarkOverlay';
import { type SampleWeddingData, type WeddingEvent, type WeddingGuest } from '../data/sampleWeddingData';
import { getWeddingSectionConfig, type WeddingSectionConfig } from '../data/sectionConfig';
import WeddingSectionRenderer from './WeddingSectionRenderer';
import { getOptimizedAssetPath, resolveAssetPath } from '../data/assetRegistry';

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
  const [skipRevealProgress, setSkipRevealProgress] = useState(0);
  const [skipRevealBridgeVisible, setSkipRevealBridgeVisible] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const audioElementId = 'invite-audio-' + data.wedding.slug.replace(/[^a-zA-Z0-9_-]/g, '-');
  const resolvedAudioSrc = resolveAssetPath(data.music.audioSrc);
  const contentReady = previewMode || forceSectionsVisible || heroDone;
  const sectionsMounted = previewMode || forceSectionsVisible || (!data.hero.skipRevealImage && heroStarted) || heroDone;

  const handleSkipRevealProgress = useCallback((progress: number) => {
    setSkipRevealProgress(progress);
    if (progress > 0) setSkipRevealBridgeVisible(true);
  }, []);

  const handleHeroComplete = useCallback(() => {
    setSkipRevealProgress(1);
    if (data.hero.skipRevealImage) {
      setSkipRevealBridgeVisible(true);
      window.setTimeout(() => {
        setSkipRevealBridgeVisible(false);
      }, 520);
    }
    setHeroDone(true);
  }, [data.hero.skipRevealImage]);

  useEffect(() => {
    if (!heroStarted) return;

    const preloadImage = (src?: string) => {
      const resolvedSrc = getOptimizedAssetPath(src ?? '');
      if (!resolvedSrc) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = resolvedSrc;
    };

    const imageSources = new Set<string>();
    if (!data.hero.skipRevealImage) imageSources.add(data.hero.revealImageSrc);
    imageSources.add(data.hero.posterSrc);
    imageSources.add(data.couple.backgroundImageSrc);

    imageSources.forEach(preloadImage);
  }, [heroStarted, data.hero.skipRevealImage, data.hero.revealImageSrc, data.hero.posterSrc, data.couple.backgroundImageSrc]);

  const inviteCanvas = (
    <div ref={canvasRef} className={`phone-canvas ${!contentReady ? 'no-scroll' : 'ready-to-snap'} ${previewMode || previewScrollFrame ? 'preview-mode' : ''}`}>      {resolvedAudioSrc && (
        <AudioPlayer
          triggerPlay={heroStarted || heroDone}
          audioSrc={resolvedAudioSrc}
          title={data.music.title}
          audioElementId={audioElementId}
          showControl={heroStarted || heroDone}
        />
      )}

      {!(data.hero.skipRevealImage && heroDone) && (
        <Hero
          hero={data.hero}
          audioSrc={resolvedAudioSrc}
          onHeroStart={() => setHeroStarted(true)}
          onGaneshaReveal={() => undefined}
          onHeroComplete={handleHeroComplete}
          onSkipRevealProgress={handleSkipRevealProgress}
          audioElementId={audioElementId}
          enableResponsiveVideo={enableResponsiveOpeningVideo}
          showScrollPrompt={heroDone && !data.hero.skipRevealImage}
          previewMode={previewMode}
        />
      )}

      {heroStarted && data.hero.skipRevealImage && skipRevealBridgeVisible && (
        <div className={`skip-reveal-story-fade ${heroDone ? 'is-settling' : ''}`} style={{ opacity: heroDone ? 1 : skipRevealProgress }} aria-hidden="true">
          <Section2 couple={data.couple} />
        </div>
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
