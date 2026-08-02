import { useCallback, useEffect, useRef, useState } from 'react';
import './MarketingEnvelopePreview.css';
import Hero from './Hero';
import { getOptimizedAssetPath } from '../data/assetRegistry';
import type { SampleWeddingData } from '../data/sampleWeddingData';

const hero: SampleWeddingData['hero'] = {
  revealStyle: 'envelope',
  videoSrc: '/assets/opening-reveal/envelope/videos/opening-envelope-video.mp4',
  posterSrc: '/assets/opening-reveal/envelope/posters/opening-envelope-poster.jpeg',
  revealImageSrc: '/assets/opening-reveal/envelope/revealed-images/revealed-generic-classic-04.png',
  revealImageType: 'floral',
  revealImageAlt: 'Shaadi Nyota invitation reveal',
  revealImageShowAtSeconds: 0,
  heroFadeAtSeconds: 0,
  scrollHintText: 'Scroll to continue',
  revealCtaText: 'Tap to open',
  skipRevealImage: true,
};

const templateCards = [
  {
    name: 'Classic Envelope',
    copy: 'A warm invitation-style reveal for traditional wedding websites.',
    imageSrc: '/assets/opening-reveal/envelope/posters/opening-envelope-poster.jpeg',
    href: '/templates/classic-envelope',
  },
  {
    name: 'Scroll Opening',
    copy: 'A graceful scroll-style opening for a softer editorial invitation.',
    imageSrc: '/assets/opening-reveal/scroll/posters/opening-scroll-poster.png',
    href: '/templates/scroll-opening',
  },
  {
    name: 'Palace Door',
    copy: 'A grand cinematic opening for a royal first impression.',
    imageSrc: '/assets/opening-reveal/palace-door/posters/opening-reveal-palace-door-poster-01.png',
    href: '/templates/palace-door-opening',
  },
];

type MarketingTemplateCard = (typeof templateCards)[number];

const builderItems = [
  ['Opening Reveal', 'Envelope, scroll, or palace door opening with music.'],
  ['Our Story', 'Names, subtitle, story text, and couple imagery.'],
  ['Events', 'Function visuals, dates, venue, maps, calendar, and invitees.'],
  ['RSVP', 'Event-wise responses, meal preference, and attending counts.'],
  ['Closing Gallery', 'Final thank-you section with optional couple photos.'],
];

const faqItems = [
  ['Can guests RSVP per event?', 'Yes. Each guest can see only the events they are invited to and respond event by event.'],
  ['Can invites be sent on WhatsApp?', 'Yes. The RSVP plan is built around WhatsApp sharing, reminders, and personalized invite links.'],
  ['Can I edit after publishing?', 'Yes. You can update sections from the dashboard and preview before sharing again.'],
  ['Can different guests see different functions?', 'Yes. Family, friends, and office guests can each receive the right event list.'],
];

function NoindexMarketingPreview() {
  useEffect(() => {
    document.title = 'Envelope Marketing Preview | Shaadi Nyota';
    const existingRobotsMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previousRobotsContent = existingRobotsMeta?.getAttribute('content') ?? null;
    const robotsMeta = existingRobotsMeta ?? document.createElement('meta');
    robotsMeta.setAttribute('name', 'robots');
    robotsMeta.setAttribute('content', 'noindex,nofollow');
    if (!existingRobotsMeta) document.head.appendChild(robotsMeta);

    return () => {
      if (previousRobotsContent === null && robotsMeta.parentNode) {
        robotsMeta.parentNode.removeChild(robotsMeta);
      } else if (previousRobotsContent !== null) {
        robotsMeta.setAttribute('content', previousRobotsContent);
      }
    };
  }, []);

  return null;
}

function PromiseSection() {
  return (
    <section className="marketing-card-section marketing-promise-section" aria-label="Shaadi Nyota promise">
      <div className="marketing-promise-copy">
        <span className="marketing-kicker">Shaadi Nyota</span>
        <h1>Create a beautiful wedding invite, share it with guests in one click, and track every RSVP.</h1>
        <p>
          Build a cinematic mobile wedding website, send personalized invite links on WhatsApp,
          collect event-wise RSVPs, and remind guests automatically.
        </p>
        <div className="marketing-brand-actions">
          <a href="/create-wedding">Create your invite</a>
          <a href="#marketing-template-previews">Preview templates</a>
        </div>
      </div>
      <div className="marketing-feature-strip" aria-label="Main benefits">
        <span>WhatsApp sharing</span>
        <span>Event-wise RSVP</span>
        <span>Guest lists</span>
        <span>Reminders</span>
      </div>
    </section>
  );
}

function WhatsAppRsvpSection() {
  return (
    <section className="marketing-card-section marketing-whatsapp-section" aria-label="WhatsApp RSVP workflow">
      <div className="marketing-section-heading">
        <span className="marketing-kicker">One Click Invites</span>
        <h2>Send the right invite to every guest without chasing spreadsheets.</h2>
      </div>
      <div className="marketing-phone-flow" aria-label="WhatsApp invitation flow">
        <article>
          <span>1</span>
          <strong>Add guests</strong>
          <p>Import families, phone numbers, guest categories, and event invitees.</p>
        </article>
        <article>
          <span>2</span>
          <strong>Share links</strong>
          <p>Send personalized wedding links on WhatsApp with one action.</p>
        </article>
        <article>
          <span>3</span>
          <strong>Track RSVP</strong>
          <p>See who said yes, maybe, or no for every function.</p>
        </article>
        <article>
          <span>4</span>
          <strong>Remind guests</strong>
          <p>Send RSVP follow-ups and event reminders through WhatsApp.</p>
        </article>
      </div>
    </section>
  );
}

function MultiEventSection() {
  return (
    <section className="marketing-card-section marketing-events-section" aria-label="Multi event Indian wedding support">
      <div className="marketing-event-art">
        <img src={getOptimizedAssetPath('/assets/events/haldi/event-haldi-premium-06.png')} alt="Haldi event preview" loading="lazy" decoding="async" />
        <img src={getOptimizedAssetPath('/assets/events/sangeet/event-sangeet-premium-05.png')} alt="Sangeet event preview" loading="lazy" decoding="async" />
        <img src={getOptimizedAssetPath('/assets/events/reception/event-reception-premium-02.png')} alt="Reception event preview" loading="lazy" decoding="async" />
      </div>
      <div className="marketing-section-heading">
        <span className="marketing-kicker">Built For Indian Weddings</span>
        <h2>Different functions. Different guests. One clean invitation system.</h2>
        <p>
          Invite family to every ceremony, friends to sangeet and reception, and office guests to only the reception.
          Each guest sees only what they need.
        </p>
      </div>
    </section>
  );
}

function BuilderSection() {
  return (
    <section className="marketing-card-section marketing-builder-section" aria-label="Invite builder sections">
      <div className="marketing-section-heading">
        <span className="marketing-kicker">Invite Builder</span>
        <h2>Every part of the wedding website stays editable.</h2>
        <p>Start with a template, then customize the sections that matter for your celebration.</p>
      </div>
      <div className="marketing-builder-list">
        {builderItems.map(([title, copy]) => (
          <article key={title}>
            <strong>{title}</strong>
            <p>{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function TemplateSection({ onPreviewTemplate }: { onPreviewTemplate: (template: MarketingTemplateCard) => void }) {
  return (
    <section id="marketing-template-previews" className="marketing-card-section marketing-template-section" aria-label="Template previews">
      <div className="marketing-section-heading">
        <span className="marketing-kicker">Starting Styles</span>
        <h2>Choose a cinematic opening, then make it yours.</h2>
      </div>
      <div className="marketing-template-list">
        {templateCards.map((template) => (
          <article key={template.name}>
            <img src={getOptimizedAssetPath(template.imageSrc)} alt={`${template.name} preview`} loading="lazy" decoding="async" />
            <div>
              <strong>{template.name}</strong>
              <p>{template.copy}</p>
              <button type="button" onClick={() => onPreviewTemplate(template)}>Preview style</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TemplatePreviewModal({ template, onClose }: { template: MarketingTemplateCard; onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="marketing-preview-modal" role="dialog" aria-modal="true" aria-label={`${template.name} template preview`}>
      <button className="marketing-preview-modal__backdrop" type="button" aria-label="Close preview" onClick={onClose} />
      <div className="marketing-preview-modal__panel">
        <div className="marketing-preview-modal__header">
          <div>
            <span>Template Preview</span>
            <strong>{template.name}</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="Close preview">Close</button>
        </div>
        <iframe title={`${template.name} demo invite`} src={template.href} loading="lazy" />
      </div>
    </div>
  );
}

function PricingMarketingSection() {
  return (
    <section className="marketing-card-section marketing-pricing-section" id="pricing">
      <div className="marketing-section-heading">
        <span className="marketing-kicker">Pricing</span>
        <h2>Simple packages for a polished wedding invite.</h2>
      </div>
      <div className="marketing-plan-list">
        <article>
          <p>Basic Website</p>
          <strong>Rs. 1,000</strong>
          <small>Opening reveal, story, event details, closing section, and a shareable wedding website link.</small>
          <a href="/create-wedding?plan=basic">Start basic</a>
        </article>
        <article className="featured">
          <p>Website + RSVP + WhatsApp</p>
          <strong>Rs. 5,000</strong>
          <small>Everything in Basic, plus guests, personalized links, WhatsApp invites, RSVP tracking, and reminders.</small>
          <a href="/create-wedding?plan=rsvp">Start with RSVP</a>
        </article>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="marketing-card-section marketing-faq-section" aria-label="Frequently asked questions">
      <div className="marketing-section-heading">
        <span className="marketing-kicker">Questions</span>
        <h2>Made for families who need beauty and clarity.</h2>
      </div>
      <div className="marketing-faq-list">
        {faqItems.map(([question, answer]) => (
          <article key={question}>
            <strong>{question}</strong>
            <p>{answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ClosingMarketingSection() {
  return (
    <section className="marketing-card-section marketing-closing-section">
      <div className="marketing-closing-inner">
        <p className="marketing-closing-script">With love</p>
        <h2>Make your invitation beautiful, personal, and easy to manage.</h2>
        <p>Launch a wedding website that guests can open, respond to, and remember.</p>
        <a href="/create-wedding">Start your invite</a>
      </div>
    </section>
  );
}

export default function MarketingEnvelopePreview() {
  const [heroStarted, setHeroStarted] = useState(false);
  const [heroDone, setHeroDone] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const [skipRevealProgress, setSkipRevealProgress] = useState(0);
  const [activeTemplatePreview, setActiveTemplatePreview] = useState<MarketingTemplateCard | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const heroFadeTimeoutRef = useRef<number | null>(null);
  const heroFadeOpacity = Math.max(0, 1 - skipRevealProgress);

  const handleSkipRevealProgress = useCallback((progress: number) => {
    setSkipRevealProgress(progress);
  }, []);

  const handleHeroComplete = useCallback(() => {
    setSkipRevealProgress(1);
    setHeroDone(true);
    if (heroFadeTimeoutRef.current !== null) {
      window.clearTimeout(heroFadeTimeoutRef.current);
    }
    heroFadeTimeoutRef.current = window.setTimeout(() => {
      setHeroVisible(false);
    }, 1450);
  }, []);

  useEffect(() => {
    return () => {
      if (heroFadeTimeoutRef.current !== null) {
        window.clearTimeout(heroFadeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!heroStarted) return;
    [
      hero.revealImageSrc,
      '/assets/shared/backgrounds/texture-background-ivory-01.png',
      '/assets/events/haldi/event-haldi-premium-06.png',
      '/assets/events/sangeet/event-sangeet-premium-05.png',
      '/assets/events/reception/event-reception-premium-02.png',
      ...templateCards.map((template) => template.imageSrc),
    ].forEach((src) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = getOptimizedAssetPath(src);
    });
  }, [heroStarted]);

  return (
    <main className="marketing-invite-page">
      <NoindexMarketingPreview />
      <div className="desktop-bg-blur" />
      <div className="desktop-vignette" />
      <div className="app-container marketing-invite-app-container">
        <div ref={canvasRef} className={`phone-canvas marketing-invite-canvas ${!heroDone || heroVisible ? 'no-scroll' : 'ready-to-snap'}`}>
{heroVisible && (
            <div className="marketing-hero-fade-shell" style={{ opacity: heroFadeOpacity, pointerEvents: heroFadeOpacity <= 0.01 ? 'none' : 'auto' }}>
              <Hero
                hero={hero}
                audioSrc=""
                onHeroStart={() => setHeroStarted(true)}
                onGaneshaReveal={() => undefined}
                onHeroComplete={handleHeroComplete}
                onSkipRevealProgress={handleSkipRevealProgress}
                enableResponsiveVideo={false}
                showScrollPrompt={heroDone && !hero.skipRevealImage}
              />
            </div>
          )}

          <PromiseSection />
          <WhatsAppRsvpSection />
          <MultiEventSection />
          <BuilderSection />
          <TemplateSection onPreviewTemplate={setActiveTemplatePreview} />
          <PricingMarketingSection />
          <FaqSection />
          <ClosingMarketingSection />
          {activeTemplatePreview && (
            <TemplatePreviewModal template={activeTemplatePreview} onClose={() => setActiveTemplatePreview(null)} />
          )}
        </div>
      </div>
    </main>
  );
}






