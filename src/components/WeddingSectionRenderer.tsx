import { lazy, Suspense } from 'react';
import type { SampleWeddingData, WeddingEvent, WeddingGuest } from '../data/sampleWeddingData';
import type { WeddingSectionConfig } from '../data/sectionConfig';

const Section2 = lazy(() => import('./Section2'));
const Section3 = lazy(() => import('./Section3'));
const Section4 = lazy(() => import('./Section4'));
const Section5 = lazy(() => import('./Section5'));

interface ClassicWeddingSectionRendererProps {
  data: SampleWeddingData;
  sections: WeddingSectionConfig[];
  events: WeddingEvent[];
  weddingId?: string;
  guest?: WeddingGuest;
  personalizedInviteMode?: boolean;
}

interface RenderSectionContext {
  data: SampleWeddingData;
  events: WeddingEvent[];
  weddingId?: string;
  guest?: WeddingGuest;
  personalizedInviteMode: boolean;
}

const renderStorySection = (section: WeddingSectionConfig, { data }: RenderSectionContext) => {
  return <Section2 key={section.id} couple={data.couple} />;
};

const renderEventsSection = (section: WeddingSectionConfig, { data, events, guest }: RenderSectionContext) => {
  return <Section3 key={section.id} events={events} coupleDisplayName={data.couple.displayName} guest={guest} />;
};

const renderRsvpSection = (
  section: WeddingSectionConfig,
  { data, events, weddingId, guest, personalizedInviteMode }: RenderSectionContext,
) => {
  return (
    <Section4
      key={section.id}
      rsvp={data.rsvp}
      weddingId={weddingId}
      weddingSlug={data.wedding.slug}
      events={events}
      guest={guest}
      personalizedInviteMode={personalizedInviteMode}
    />
  );
};

const renderClosingSection = (section: WeddingSectionConfig, { data }: RenderSectionContext) => {
  return <Section5 key={section.id} closing={data.closing} />;
};

export default function WeddingSectionRenderer({
  data,
  sections,
  events,
  weddingId,
  guest,
  personalizedInviteMode = false,
}: ClassicWeddingSectionRendererProps) {
  const enabledSections = sections
    .filter((section) => section.enabled && section.type !== 'opening' && section.type !== 'reveal')
    .sort((a, b) => a.order - b.order);
  const renderContext: RenderSectionContext = {
    data,
    events,
    weddingId,
    guest,
    personalizedInviteMode,
  };

  return (
    <Suspense fallback={null}>
      {enabledSections.map((section) => {
        // Templates now provide starting defaults only. Section variants remain in
        // the config for future per-section customization, but normal rendering
        // uses the common section components.
        switch (section.type) {
          case 'story':
            return renderStorySection(section, renderContext);
          case 'events':
            return renderEventsSection(section, renderContext);
          case 'rsvp':
            return renderRsvpSection(section, renderContext);
          case 'closing':
            return renderClosingSection(section, renderContext);
          default:
            return null;
        }
      })}
    </Suspense>
  );
}
