import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getWeddingBySlug,
  mockAdminWeddingsStorageKey,
  mockDashboardDraftStorageKey,
  type SampleWeddingData,
  type WeddingEvent,
} from '../data/sampleWeddingData';
import { getEventVisualByKey, getRecommendedVisualForEvent } from '../data/eventVisuals';
import { resolveAssetPath } from '../data/assetRegistry';
import { loadSupabaseWeddingBySlug } from '../lib/supabaseWeddingData';
import InviteExperience from './InviteExperience';
import './WeddingDesignPreviews.css';

type VariationId =
  | 'media-1'
  | 'media-2'
  | 'media-3'
  | 'media-4'
  | 'media-5'
  | 'media-6'
  | 'cinematic-1'
  | 'cinematic-2'
  | 'cinematic-3'
  | 'cinematic-4'
  | 'cinematic-5';

interface VariationDefinition {
  id: VariationId;
  name: string;
  description: string;
  handoff: string;
}

const previewSlug = 'mahesh-neha';
const mediaFitVariations: VariationDefinition[] = [
  {
    id: 'media-1',
    name: 'Safe Cover + Focal Point',
    description: 'Keeps the immersive full-screen look, but protects the important center artwork with safer focal positions.',
    handoff: 'Immersive safe area',
  },
  {
    id: 'media-2',
    name: 'Full Artwork Matte',
    description: 'Shows the complete 9:16 artwork inside a warm champagne matte so nothing important is cropped.',
    handoff: 'Complete artwork view',
  },
  {
    id: 'media-3',
    name: 'Hybrid Hero Safe, Events Cover',
    description: 'Uses full artwork for opening/reveal moments, while event sections stay cinematic and full bleed.',
    handoff: 'Balanced mobile fit',
  },
  {
    id: 'media-4',
    name: 'Ornamental Phone Card',
    description: 'Frames every 9:16 visual as a premium invitation card inside taller modern phone screens.',
    handoff: 'Framed invitation art',
  },
  {
    id: 'media-5',
    name: 'Soft Fill Artwork Stage',
    description: 'Uses the full 9:16 artwork over a soft blurred version of itself for a warmer no-crop presentation.',
    handoff: 'Soft no-crop stage',
  },
  {
    id: 'media-6',
    name: 'Stretched Intro Only',
    description: 'Keeps the live website unchanged after the opening; only the intro video and reveal image stretch to fill the screen.',
    handoff: 'Intro stretch only',
  },
];

const cinematicVariations: VariationDefinition[] = [
  {
    id: 'cinematic-1',
    name: 'Soft Crossfade Scroll',
    description: 'Natural scrolling with gentle ivory crossfades between every chapter.',
    handoff: 'With blessings',
  },
  {
    id: 'cinematic-2',
    name: 'Sticky Storybook Panels',
    description: 'Warm storybook chapters softly layered within one consistent stage.',
    handoff: 'Our story begins',
  },
  {
    id: 'cinematic-3',
    name: 'Event Timeline Scroll',
    description: 'A connected celebration timeline that makes every event feel intentional.',
    handoff: 'The celebrations begin',
  },
  {
    id: 'cinematic-4',
    name: 'Parallax Invitation Layers',
    description: 'Delicate floral depth and gold ornament moving softly behind the journey.',
    handoff: 'With love and joy',
  },
  {
    id: 'cinematic-5',
    name: 'Gradient Bridge Scroll',
    description: 'The current invitation flow softened with compact ornamental bridges.',
    handoff: 'Join us in celebration',
  },
];

const variations: VariationDefinition[] = [...mediaFitVariations, ...cinematicVariations];

const getVariation = (id?: string) => variations.find((variation) => variation.id === id);
const isMediaFitVariation = (id: VariationId) => id.startsWith('media-');

const getFallbackPreviewWedding = () => {
  const sampleWedding = getWeddingBySlug(previewSlug);
  try {
    const draft = window.localStorage.getItem(mockDashboardDraftStorageKey);
    if (draft) {
      const parsedDraft = JSON.parse(draft) as SampleWeddingData;
      if (parsedDraft.wedding.slug === previewSlug) return parsedDraft;
    }
  } catch {
    // Ignore a malformed local preview draft and try the saved list/sample fallback.
  }
  try {
    const savedWeddings = window.localStorage.getItem(mockAdminWeddingsStorageKey);
    if (savedWeddings) {
      const wedding = (JSON.parse(savedWeddings) as SampleWeddingData[])
        .find((item) => item.wedding.slug === previewSlug);
      if (wedding) return wedding;
    }
  } catch {
    // Ignore malformed fallback storage.
  }
  return sampleWedding;
};

function PreviewIndex() {
  useEffect(() => {
    document.title = 'Mahesh & Neha Design Variations | Shaadi Nyota';
  }, []);

  return (
    <main className="wedding-preview-index">
      <header className="wedding-preview-index-header">
        <p>Design Review</p>
        <h1>Mahesh &amp; Neha Media Fit Previews</h1>
        <span>Five isolated media-fit options using the same wedding data</span>
      </header>
      <div className="wedding-preview-notice">
        These are isolated design previews and do not affect the live website.
      </div>
      <div className="wedding-preview-card-grid">
        {mediaFitVariations.map((variation, index) => (
          <article className={`wedding-preview-card wedding-preview-card-${index + 1}`} key={variation.id}>
            <span className="wedding-preview-card-number">Media Fit {index + 1}</span>
            <h2>{variation.name}</h2>
            <p>{variation.description}</p>
            <a href={`/${previewSlug}/preview/${variation.id}`}>
              Open Preview
              <span aria-hidden="true">&rarr;</span>
            </a>
          </article>
        ))}
      </div>
    </main>
  );
}

function PreviewRevealHero({ data }: { data: SampleWeddingData }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [complete, setComplete] = useState(false);
  const [revealOpacity, setRevealOpacity] = useState(0);
  const revealSrc = resolveAssetPath(data.hero.revealImageSrc);
  const posterSrc = resolveAssetPath(data.hero.posterSrc);
  const fadeWindowSeconds = 1.35;

  useEffect(() => {
    const preload = new Image();
    preload.src = revealSrc;
  }, [revealSrc]);

  const playVideo = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (complete) {
      video.currentTime = 0;
      setComplete(false);
      setRevealOpacity(0);
    }
    setStarted(true);
    try {
      await video.play();
      setPaused(false);
    } catch {
      setPaused(true);
    }
  };

  const handleHeroInteraction = () => {
    const video = videoRef.current;
    if (!started || complete) {
      void playVideo();
      return;
    }
    if (!video) return;
    if (video.paused) {
      void video.play();
      setPaused(false);
    } else {
      video.pause();
      setPaused(true);
    }
  };

  const updateRevealProgress = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const fadeStart = Math.max(0, video.duration - fadeWindowSeconds);
    const progress = Math.min(1, Math.max(0, (video.currentTime - fadeStart) / fadeWindowSeconds));
    setRevealOpacity(progress);
    if (progress >= 1) setComplete(true);
  };

  return (
    <section className="wdp-hero wdp-enter" aria-label="Opening reveal preview">
      <button
        className="wdp-hero-control"
        type="button"
        onClick={handleHeroInteraction}
        aria-label={started && !paused ? 'Pause opening reveal' : 'Play opening reveal'}
      >
        <img className="wdp-media-backdrop wdp-hero-backdrop" src={posterSrc} alt="" aria-hidden="true" />
        <video
          ref={videoRef}
          className="wdp-hero-media"
          poster={posterSrc}
          muted
          playsInline
          preload="metadata"
          src={resolveAssetPath(data.hero.videoSrc)}
          onTimeUpdate={updateRevealProgress}
          onEnded={() => {
            setComplete(true);
            setRevealOpacity(1);
            setPaused(true);
          }}
        />
        <img
          className="wdp-hero-media wdp-hero-reveal"
          src={revealSrc}
          alt={data.hero.revealImageAlt}
          style={{ opacity: revealOpacity }}
        />
        {!started && (
          <span className="wdp-reveal-cta">{data.hero.revealCtaText || 'Tap to Reveal'}</span>
        )}
        {started && paused && !complete && <span className="wdp-pause-indicator">Resume</span>}
        {complete && (
          <>
            <span className="wdp-scroll-prompt">
              Scroll to continue
              <i aria-hidden="true" />
            </span>
            <span className="wdp-replay">Play Again</span>
          </>
        )}
      </button>
    </section>
  );
}

function Divider({ label }: { label?: string }) {
  return (
    <div className="wdp-divider" aria-hidden="true">
      <span />
      <i />
      {label && <small>{label}</small>}
      <i />
      <span />
    </div>
  );
}

function ChapterMarker({ label }: { label: string }) {
  return (
    <p className="wdp-chapter" aria-hidden="true">
      <span />
      {label}
      <span />
    </p>
  );
}

function PreviewStory({ data }: { data: SampleWeddingData }) {
  if (!data.couple.enabled) return null;
  const storyImage = resolveAssetPath(data.couple.backgroundImageSrc);
  return (
    <section className="wdp-story wdp-section wdp-enter">
      <img className="wdp-media-backdrop" src={storyImage} alt="" aria-hidden="true" />
      <img className="wdp-story-image" src={storyImage} alt="" />
      <div className="wdp-story-shade" />
      <div className="wdp-story-copy">
        <ChapterMarker label="Our Story" />
        {data.couple.introLine.trim() && <p className="wdp-kicker">{data.couple.introLine}</p>}
        {data.couple.displayName.trim() && <h2>{data.couple.displayName}</h2>}
        {data.couple.storyTitle.trim() && <h3>{data.couple.storyTitle}</h3>}
        {data.couple.storyText.trim() && <p className="wdp-body">{data.couple.storyText}</p>}
      </div>
    </section>
  );
}

const resolveEventVisual = (event: WeddingEvent, data: SampleWeddingData) => (
  getEventVisualByKey(event.eventVisualKey)
    ?? getRecommendedVisualForEvent(event.eventName, event.eventKey, data.wedding.themeKey)
);

function PreviewEvent({ data, event, index }: { data: SampleWeddingData; event: WeddingEvent; index: number }) {
  const visual = resolveEventVisual(event, data);
  const requestedTextStyle = event.eventTextStyle ?? 'auto';
  const textStyle = requestedTextStyle === 'auto' ? visual?.defaultTextStyle ?? 'dark' : requestedTextStyle;
  const imageSrc = visual?.imageSrc || resolveAssetPath(event.backgroundImageSrc);

  return (
    <article className={`wdp-event wdp-enter wdp-event-${textStyle}`}>
      {imageSrc && <img className="wdp-media-backdrop" src={imageSrc} alt="" aria-hidden="true" />}
      {imageSrc && <img className="wdp-event-image" src={imageSrc} alt="" />}
      <div className="wdp-event-overlay" />
      <div className="wdp-event-index">{String(index + 1).padStart(2, '0')}</div>
      <div className="wdp-event-copy">
        <ChapterMarker label={`Celebration ${index + 1}`} />
        <p className="wdp-kicker">Celebration</p>
        <h3>{event.eventName}</h3>
        <p>{event.date}</p>
        <p>{event.startTime}</p>
        <p>{event.venueName}{event.city ? `, ${event.city}` : ''}</p>
      </div>
    </article>
  );
}

function PreviewRsvp({ data }: { data: SampleWeddingData }) {
  if (!data.rsvp.enabled) return null;
  return (
    <section className="wdp-rsvp wdp-section wdp-enter">
      <ChapterMarker label="RSVP" />
      <p className="wdp-kicker">RSVP</p>
      <h2>{data.rsvp.title}</h2>
      <p>{data.rsvp.subtitle || 'We would be delighted to celebrate with you.'}</p>
      <div className="wdp-rsvp-field">{data.rsvp.namePlaceholder}</div>
      <div className="wdp-rsvp-actions">
        <span>{data.rsvp.responseOptions.yes}</span>
        <span>{data.rsvp.responseOptions.no}</span>
      </div>
      <small>Design preview only. RSVP submission is disabled here.</small>
    </section>
  );
}

function PreviewClosing({ data }: { data: SampleWeddingData }) {
  if (!data.closing.enabled) return null;
  const photos = data.closing.includePhotos
    ? data.closing.carouselImages.map(resolveAssetPath).filter(Boolean).slice(0, 3)
    : [];

  return (
    <section className="wdp-closing wdp-section wdp-enter">
      <ChapterMarker label="Thank You" />
      <p className="wdp-closing-line">{data.closing.closingLine}</p>
      <p className="wdp-closing-message">{data.closing.message}</p>
      {photos.length > 0 && (
        <div className="wdp-closing-photos">
          <img src={photos[0]} alt="" />
          {photos.length > 1 && (
            <div className="wdp-photo-dots" aria-hidden="true">
              {photos.map((photo) => <span key={photo} />)}
            </div>
          )}
        </div>
      )}
      <h2>{data.closing.coupleDisplayName || data.couple.displayName}</h2>
    </section>
  );
}

function VariationJourney({ data, variation }: { data: SampleWeddingData; variation: VariationDefinition }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = `${data.couple.displayName} | ${variation.name}`;
    const elements = rootRef.current?.querySelectorAll('.wdp-enter');
    if (!elements || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('wdp-visible');
      }),
      { threshold: 0.16 }
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [data.couple.displayName, variation.name]);

  return (
    <main ref={rootRef} className={`wedding-preview-variation wdp-${variation.id}`}>
      <div className="wdp-canvas">
        <div className="wdp-atmosphere" aria-hidden="true" />
        <PreviewRevealHero data={data} />
        <Divider label={variation.handoff} />
        <PreviewStory data={data} />
        <Divider label="The celebrations" />
        <section className="wdp-events" aria-label="Wedding events">
          <h2 className="wdp-events-title">The Celebrations</h2>
          {data.events.map((event, index) => (
            <div className="wdp-event-flow" key={event.id}>
              <PreviewEvent data={data} event={event} index={index} />
              {index < data.events.length - 1 && <Divider />}
            </div>
          ))}
        </section>
        {data.rsvp.enabled && <Divider label="Will you join us?" />}
        <PreviewRsvp data={data} />
        <Divider label="With love" />
        <PreviewClosing data={data} />
      </div>
    </main>
  );
}

function LiveMediaFitJourney({ data, variation }: { data: SampleWeddingData; variation: VariationDefinition }) {
  useEffect(() => {
    document.title = `${data.couple.displayName} | ${variation.name}`;
  }, [data.couple.displayName, variation.name]);

  return (
    <main className={`wedding-preview-variation wedding-preview-live wdp-${variation.id}`}>
      <InviteExperience data={data} enableResponsiveOpeningVideo={false} />
    </main>
  );
}

export default function WeddingDesignPreviews({ variationId }: { variationId?: string }) {
  const variation = getVariation(variationId);
  const [data, setData] = useState<SampleWeddingData | null>(null);
  const [loading, setLoading] = useState(Boolean(variation));
  const [error, setError] = useState('');
  const shouldLoadWedding = Boolean(variation);

  useEffect(() => {
    if (!shouldLoadWedding) return;
    let mounted = true;
    const fallbackWedding = getFallbackPreviewWedding();
    setLoading(true);
    loadSupabaseWeddingBySlug(previewSlug, { includeGuests: false })
      .then((result) => {
        if (!mounted) return;
        if (result.wedding) {
          setData(result.wedding);
          setError('');
        } else if (fallbackWedding) {
          setData(fallbackWedding);
          setError('');
        } else {
          setError(result.error || 'The Mahesh & Neha wedding data could not be loaded.');
        }
      })
      .catch(() => {
        if (!mounted) return;
        if (fallbackWedding) {
          setData(fallbackWedding);
          setError('');
        } else {
          setError('The Mahesh & Neha wedding data could not be loaded.');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [shouldLoadWedding]);

  const invalidVariation = useMemo(() => variationId && !variation, [variation, variationId]);

  if (!variationId) return <PreviewIndex />;
  if (invalidVariation) {
    return (
      <main className="wedding-preview-status">
        <h1>Variation not found</h1>
        <a href={`/${previewSlug}/preview`}>Return to design variations</a>
      </main>
    );
  }
  if (loading) {
    return <main className="wedding-preview-status"><p>Preparing design preview...</p></main>;
  }
  if (error || !data || !variation) {
    return (
      <main className="wedding-preview-status">
        <h1>Preview unavailable</h1>
        <p>{error || 'Wedding data could not be loaded.'}</p>
        <a href={`/${previewSlug}/preview`}>Return to design variations</a>
      </main>
    );
  }
  if (isMediaFitVariation(variation.id)) {
    return <LiveMediaFitJourney data={data} variation={variation} />;
  }

  return <VariationJourney data={data} variation={variation} />;
}
