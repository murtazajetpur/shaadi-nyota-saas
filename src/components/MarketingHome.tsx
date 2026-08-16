import { useEffect, useState } from 'react';
import './MarketingHome.css';
import { getOptimizedAssetPath } from '../data/assetRegistry';
import { buildPaymentWhatsAppUrl, packageDetails } from '../data/paymentConfig';
import Section2 from './Section2';
import { EventSection } from './Section3';
import type { WeddingEvent } from '../data/sampleWeddingData';

const templateCards = [
  {
    name: 'Classic Envelope',
    theme: 'envelope-opening',
    previewHref: '/templates/classic-envelope',
    image: '/assets/opening-reveal/envelope/posters/opening-envelope-poster.jpeg',
    revealImage: '/assets/opening-reveal/envelope/revealed-images/revealed-hindu-classic-01.png',
    description: 'A graceful envelope reveal for timeless wedding invitations.',
  },
  {
    name: 'Scroll Opening',
    theme: 'scroll-opening',
    previewHref: '/templates/scroll-opening',
    image: '/assets/opening-reveal/scroll/posters/opening-scroll-poster.png',
    revealImage: '/assets/opening-reveal/scroll/revealed-images/revealed-couple-scroll-01.png',
    description: 'A cinematic scroll-inspired opening for traditional storytelling.',
  },
  {
    name: 'Palace Door Opening',
    theme: 'palace-door-opening',
    previewHref: '/templates/palace-door-opening',
    image: '/assets/opening-reveal/palace-door/posters/opening-reveal-palace-door-poster-01.png',
    revealImage: '/assets/opening-reveal/envelope/revealed-images/revealed-generic-classic-04.png',
    description: 'A royal entrance reveal for grand wedding celebrations.',
  },
];

const trustValues = [
  'Cinematic first tap',
  'Section-wise styling',
  'Guest-wise links',
  'RSVP ready',
];

const storyExamples = [
  {
    label: 'Romantic',
    displayName: 'Aarav & Meera',
    introLine: 'are getting married',
    title: 'Two Hearts, One Beginning',
    copy: 'A celebration of love, family, and the journey ahead.',
    image: '/assets/our-story/images/story-holding-hands-02.png',
  },
  {
    label: 'Royal',
    displayName: 'Kabir & Anaya',
    introLine: 'are getting married',
    title: 'A Love Written in Grace',
    copy: 'From the first meeting to forever, every moment becomes part of the story.',
    image: '/assets/our-story/images/story-arch-pose-01.png',
  },
  {
    label: 'Floral',
    displayName: 'Riya & Arjun',
    introLine: 'are getting married',
    title: 'Our Beautiful Beginning',
    copy: 'Join us as we begin a new chapter surrounded by blessings and joy.',
    image: '/assets/our-story/images/story-floral-swing-02.png',
  },
  {
    label: 'Minimal',
    displayName: 'Isha & Dev',
    introLine: 'are getting married',
    title: 'Together, Always',
    copy: 'A simple, elegant space for the couple story.',
    image: '/assets/our-story/images/story-back-walk-01.png',
  },
];

const eventExamples = [
  {
    label: 'Haldi',
    eventVisualKey: 'event-haldi-premium-06',
    eventTextStyle: 'dark',
    date: 'Friday, 24 January 2026',
    time: '10:00 AM onwards',
    venue: 'The Royal Courtyard, Jaipur',
    copy: 'A joyful morning of colors, blessings, and laughter.',
    image: '/assets/thumbnails/events/haldi/event-haldi-premium-06.webp',
  },
  {
    label: 'Mehendi',
    eventVisualKey: 'event-mehendi-premium-03',
    eventTextStyle: 'dark',
    date: 'Friday, 24 January 2026',
    time: '4:00 PM onwards',
    venue: 'Garden Pavilion',
    copy: 'An evening of music, mehendi, and memories.',
    image: '/assets/thumbnails/events/mehendi/event-mehendi-premium-01.webp',
  },
  {
    label: 'Sangeet',
    eventVisualKey: 'event-sangeet-premium-05',
    eventTextStyle: 'light',
    date: 'Saturday, 25 January 2026',
    time: '7:30 PM onwards',
    venue: 'Grand Ballroom',
    copy: 'A night of performances, dancing, and celebration.',
    image: '/assets/thumbnails/events/sangeet/event-sangeet-premium-05.webp',
  },
  {
    label: 'Wedding',
    eventVisualKey: 'event-wedding-premium-16',
    eventTextStyle: 'dark',
    date: 'Sunday, 26 January 2026',
    time: '11:30 AM onwards',
    venue: 'Palace Lawns',
    copy: 'Join us for the beginning of forever.',
    image: '/assets/thumbnails/events/wedding/event-wedding-premium-16.webp',
  },
  {
    label: 'Reception',
    eventVisualKey: 'event-reception-premium-02',
    eventTextStyle: 'dark',
    date: 'Sunday, 26 January 2026',
    time: '8:00 PM onwards',
    venue: 'Crystal Banquet',
    copy: 'Celebrate the newlyweds with dinner, joy, and blessings.',
    image: '/assets/thumbnails/events/reception/event-reception-premium-02.webp',
  },
  {
    label: 'Celebration',
    eventVisualKey: 'event-generic-premium-01',
    eventTextStyle: 'dark',
    date: 'Custom event',
    time: 'As planned',
    venue: 'Your chosen venue',
    copy: 'Add any family celebration with its own artwork and guest visibility.',
    image: '/assets/thumbnails/events/generic/event-generic-premium-01.webp',
  },
];

const functionNames = [
  'Haldi',
  'Mehendi',
  'Sangeet',
  'Wedding',
  'Reception',
  'Nikaah',
  'Walima',
  'Engagement',
  'Cocktail',
  'Custom Events',
];

const features = [
  ['Cinematic Opening Reveals', 'Envelope, scroll, and palace-door openings that make the first tap feel ceremonial.'],
  ['Section-wise Customization', 'Choose story visuals, event artwork, closing gallery photos, music, and invite details.'],
  ['Event-wise Guest Visibility', 'Show each family only the functions they are invited to, with personalized invite links.'],
  ['RSVP Management', 'Track attendance, invitees, meal preference, and event-wise responses in one dashboard.'],
  ['Mobile-first Design', 'Built around the phone screen where guests will actually open the invitation.'],
  ['Private Preview Flow', 'Review the invite, payment status, and live link before sharing with guests.'],
];

const faqs = [
  ['Can I customize sections?', 'Yes. You can edit opening reveal, story, events, music, closing content, and visuals from the dashboard.'],
  ['Can I choose different opening styles?', 'Yes. Start with Classic Envelope, Scroll Opening, or Palace Door Opening, then customize the rest of the invite.'],
  ['Can guests RSVP online?', 'Yes. RSVP is included in the Pro plan with event-wise responses, guest list management, and dashboard tracking.'],
  ['Can I invite different guests to different events?', 'Yes. With the Pro plan, each guest or family can be invited to the exact events you choose.'],
  ['Can I manage guests from the dashboard?', 'Yes. The Pro plan includes guest list management, personalized links, RSVP summaries, and export-ready data.'],
  ['Can I see a preview before paying?', 'Yes. You can build and review your wedding website before requesting payment verification.'],
  ['Can I use my own photos or visuals?', 'Yes. You can choose from presets and use supported upload flows where available in the builder.'],
  ['Can I update details later?', 'Yes. You can update event details and content from the dashboard, then save the latest version.'],
  ['Is this suitable for Indian wedding functions?', 'Yes. Shaadi Nyota is designed around Haldi, Mehendi, Sangeet, wedding, reception, and custom celebrations.'],
  ['How does payment work?', 'Payment is handled manually. After payment, request verification from your dashboard.'],
];

const contactUrl = buildPaymentWhatsAppUrl(
  'Hi Shaadi Nyota team, I want to know more about creating a wedding website.'
);

function BrandMark() {
  const [showLogo, setShowLogo] = useState(true);

  return (
    <a className="marketing-brand" href="/" aria-label="Shaadi Nyota home">
      {showLogo && (
        <img
          src="/assets/brand/shaadi-nyota-logo.png"
          alt=""
          decoding="async"
          draggable={false}
          onError={() => setShowLogo(false)}
        />
      )}
      <span>Shaadi Nyota</span>
    </a>
  );
}

function ShowcaseImage({
  src,
  alt,
  className,
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  return (
    <img
      className={className}
      src={getOptimizedAssetPath(src)}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
    />
  );
}

function HeroProductPreview() {
  return (
    <div className="hero-product-preview" aria-label="Shaadi Nyota product preview">
      <div className="hero-preview-phone">
        <div className="hero-preview-screen">
          <ShowcaseImage
            src="/assets/opening-reveal/palace-door/posters/opening-reveal-palace-door-poster-01.png"
            alt="Palace Door opening preview"
            eager
          />
          <div className="hero-preview-overlay">
            <span>Palace Door Opening</span>
            <strong>Tap to begin</strong>
          </div>
        </div>
      </div>
      <div className="hero-floating-card story-card">
        <ShowcaseImage src="/assets/our-story/images/story-holding-hands-02.png" alt="Our Story preview" />
        <span>Our Story</span>
      </div>
      <div className="hero-floating-card event-card">
        <ShowcaseImage src="/assets/thumbnails/events/wedding/event-wedding-premium-16.webp" alt="Wedding event preview" />
        <span>Event Sections</span>
      </div>
      <div className="hero-dashboard-mini">
        <span>Guest RSVP</span>
        <strong>124</strong>
        <p>responses organized</p>
      </div>
    </div>
  );
}

function toMarketingWeddingEvent(event: (typeof eventExamples)[number]): WeddingEvent {
  return {
    id: event.label.toLowerCase(),
    eventKey: event.label.toLowerCase(),
    eventVisualKey: event.eventVisualKey,
    eventTextStyle: event.eventTextStyle as WeddingEvent['eventTextStyle'],
    eventAnimationKey: 'none',
    eventName: event.label,
    date: event.date,
    startTime: event.time,
    venueName: event.venue,
    city: '',
    mapsUrl: 'https://maps.google.com',
    dressCode: '',
    foregroundImageSrc: '',
    backgroundImageSrc: '',
    calendarTitle: `${event.label} Ceremony`,
    calendarDescription: event.copy,
  };
}

function toMarketingCouple(story: (typeof storyExamples)[number]) {
  return {
    enabled: true,
    brideName: story.displayName.split('&')[1]?.trim() ?? 'Meera',
    groomName: story.displayName.split('&')[0]?.trim() ?? 'Aarav',
    displayName: story.displayName,
    introLine: story.introLine,
    blessingLine: '',
    storyTitle: story.title,
    storyText: story.copy,
    backgroundImageSrc: story.image,
    imageAlt: `${story.label} Our Story preview`,
  };
}

export default function MarketingHome() {
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [activeEventIndex, setActiveEventIndex] = useState(0);
  const activeStory = storyExamples[activeStoryIndex];
  const activeStoryCouple = toMarketingCouple(activeStory);
  const activeEvent = eventExamples[activeEventIndex];
  const activeWeddingEvent = toMarketingWeddingEvent(activeEvent);

  const showPreviousStory = () => {
    setActiveStoryIndex((current) => (current === 0 ? storyExamples.length - 1 : current - 1));
  };

  const showNextStory = () => {
    setActiveStoryIndex((current) => (current === storyExamples.length - 1 ? 0 : current + 1));
  };

  const showPreviousEvent = () => {
    setActiveEventIndex((current) => (current === 0 ? eventExamples.length - 1 : current - 1));
  };

  const showNextEvent = () => {
    setActiveEventIndex((current) => (current === eventExamples.length - 1 ? 0 : current + 1));
  };

  useEffect(() => {
    document.title = 'Shaadi Nyota | Premium Wedding Websites';
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'auto';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  return (
    <main className="marketing-home">
      <header className="marketing-header">
        <BrandMark />
        <nav aria-label="Homepage">
          <a href="#openings">Openings</a>
          <a href="#sections">Sections</a>
          <a href="#dashboard-showcase">RSVP</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <div className="marketing-header-actions">
          <a className="marketing-login" href="/login">Login</a>
          <a className="marketing-btn primary" href="/create-wedding">Create Website</a>
        </div>
      </header>

      <section className="marketing-hero">
        <div className="marketing-hero-copy">
          <p className="marketing-eyebrow">Premium Indian wedding websites</p>
          <h1>A wedding website that feels like your first invitation ceremony.</h1>
          <p>
            Create a mobile-first wedding invite with cinematic openings, event-wise guest links,
            RSVP tracking, and a closing note that feels personal.
          </p>
          <div className="marketing-hero-actions">
            <a className="marketing-btn primary" href="/create-wedding">Create Your Wedding Website</a>
            <a className="marketing-btn secondary" href="#openings">Preview Starting Styles</a>
          </div>
          <div className="marketing-hero-chips" aria-label="Product highlights">
            {trustValues.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
        <div className="marketing-hero-visual">
          <HeroProductPreview />
        </div>
      </section>

      <section className="marketing-trust-strip" aria-label="Shaadi Nyota highlights">
        {[
          'Review before sharing',
          'Built for Indian wedding functions',
          'Guest-wise event visibility',
          'Mobile-first for every guest',
        ].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </section>

      <section className="marketing-section openings-showcase" id="openings">
        <div className="marketing-section-heading">
          <p className="marketing-eyebrow">Starting Styles</p>
          <h2>Begin with a style, then make every section your own.</h2>
          <p>Use Envelope, Scroll, or Palace Door as a starting point without locking the rest of the website.</p>
        </div>
        <div className="template-grid">
          {templateCards.map((template) => (
            <article className="template-card" key={template.name}>
              <div className="template-preview">
                <div className="opening-concept-preview">
                  <div className="opening-preview-panel">
                    <span>Opening</span>
                    <ShowcaseImage src={template.image} alt={`${template.name} opening preview`} />
                  </div>
                  <div className="reveal-preview-panel">
                    <span>Reveal</span>
                    <ShowcaseImage src={template.revealImage} alt={`${template.name} revealed invite preview`} />
                  </div>
                </div>
              </div>
              <div>
                <h3>{template.name}</h3>
                <p>{template.description}</p>
                <div className="template-badges">
                  {['Watermarked Demo', 'Mobile First', 'Customizable'].map((badge) => <span key={badge}>{badge}</span>)}
                </div>
                <div className="template-actions">
                  <a href={template.previewHref}>Preview Demo</a>
                  <a href={`/create-wedding?theme=${template.theme}`}>Use This Style</a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section story-preview-section" id="sections">
        <div className="marketing-section-heading">
          <p className="marketing-eyebrow">Our Story</p>
          <h2>Tell the story in the same visual language as the invite.</h2>
          <p>Pick a story visual, adjust the words, and keep the final section preview true to the guest website.</p>
        </div>
        <div className="story-invite-showcase">
          <button
            className="showcase-carousel-arrow previous"
            type="button"
            onClick={showPreviousStory}
            aria-label="Show previous story"
          >
            &lsaquo;
          </button>
          <article className="story-invite-preview-card" aria-label={`${activeStory.label} Our Story section preview`}>
            <div className="story-invite-phone">
              <Section2 couple={activeStoryCouple} />
            </div>
          </article>
          <button
            className="showcase-carousel-arrow next"
            type="button"
            onClick={showNextStory}
            aria-label="Show next story"
          >
            &rsaquo;
          </button>
        </div>
        <div className="showcase-carousel-dots" aria-label="Our Story preview selector">
          {storyExamples.map((story, index) => (
            <button
              key={story.label}
              type="button"
              className={index === activeStoryIndex ? 'active' : ''}
              onClick={() => setActiveStoryIndex(index)}
              aria-label={`Show ${story.label}`}
              aria-current={index === activeStoryIndex ? 'true' : undefined}
            />
          ))}
        </div>
      </section>

      <section className="marketing-section event-preview-section">
        <div className="marketing-section-heading">
          <p className="marketing-eyebrow">Event Sections</p>
          <h2>Every function can carry its own mood.</h2>
          <p>Use premium, sketch, or faceless visuals for each ceremony while keeping the invite connected.</p>
        </div>
        <div className="event-invite-showcase">
          <button
            className="showcase-carousel-arrow previous"
            type="button"
            onClick={showPreviousEvent}
            aria-label="Show previous event"
          >
            &lsaquo;
          </button>
          <article className="event-invite-preview-card" aria-label={`${activeEvent.label} invite section preview`}>
            <div className="event-invite-phone">
              <EventSection event={activeWeddingEvent} showParticles={false} />
            </div>
          </article>
          <button
            className="showcase-carousel-arrow next"
            type="button"
            onClick={showNextEvent}
            aria-label="Show next event"
          >
            &rsaquo;
          </button>
        </div>
        <div className="showcase-carousel-dots" aria-label="Event preview selector">
          {eventExamples.map((event, index) => (
            <button
              key={event.label}
              type="button"
              className={index === activeEventIndex ? 'active' : ''}
              onClick={() => setActiveEventIndex(index)}
              aria-label={`Show ${event.label}`}
              aria-current={index === activeEventIndex ? 'true' : undefined}
            />
          ))}
        </div>
      </section>

      <section className="marketing-section closing-preview-section">
        <div className="marketing-section-heading">
          <p className="marketing-eyebrow">Closing Gallery</p>
          <h2>End with a graceful thank-you moment.</h2>
          <p>Keep the final note text-first, with optional couple photos inside the closing section.</p>
        </div>
        <div className="closing-gallery-preview">
          <div className="closing-gallery-copy">
            <span>Final thank-you section</span>
            <h3>Designed as the final screen guests remember.</h3>
            <p>
              The final section keeps the same builder structure, with optional couple photos shown inside the section.
            </p>
          </div>
          <div className="closing-gallery-phone" aria-label="Closing Gallery preview">
            <div className="closing-gallery-phone-inner">
              <p className="closing-script-line">With love</p>
              <h3>Looking forward to celebrating our important days with you.</h3>
              <div className="closing-circle-carousel">
                <ShowcaseImage
                  src="/assets/closing-gallery/preset-photos/closing-photo-preset-01.png"
                  alt="Closing Gallery couple photo"
                />
              </div>
              <div className="closing-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <p className="closing-couple-name">Aarav & Meera</p>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section function-showcase">
        <div className="marketing-section-heading">
          <p className="marketing-eyebrow">Wedding Functions</p>
          <h2>Designed for every wedding function.</h2>
          <p>
            Whether it is one ceremony or a full wedding week, your invite can show the right events to the right guests.
          </p>
        </div>
        <div className="function-chip-grid">
          {functionNames.map((name) => <span key={name}>{name}</span>)}
        </div>
      </section>

      <section className="marketing-section dashboard-showcase" id="dashboard-showcase">
        <div className="marketing-section-heading">
          <p className="marketing-eyebrow">RSVP Management</p>
          <h2>Replace scattered guest tracking with one organized dashboard.</h2>
          <p>Manage families, invited events, personal links, and RSVP responses without losing the elegance of the invite.</p>
        </div>
        <div className="dashboard-preview-grid">
          <article className="dashboard-mock-card guest-list-card">
            <span>Guest List</span>
            <h3>Family-wise invites</h3>
            {[
              ['Anaya Shah', '+91 98xx xxx 210', 'Haldi, Sangeet, Wedding'],
              ['Rohan Mehta', '+91 99xx xxx 884', 'Wedding, Reception'],
              ['Priya Iyer', '+91 97xx xxx 443', 'All events'],
            ].map(([name, phone, events]) => (
              <div className="mock-guest-row" key={name}>
                <strong>{name}</strong>
                <small>{phone}</small>
                <em>{events}</em>
              </div>
            ))}
          </article>
          <article className="dashboard-mock-card analytics-card">
            <span>RSVP Analytics</span>
            <div className="analytics-number-row">
              <div><strong>312</strong><small>Invited</small></div>
              <div><strong>186</strong><small>Confirmed</small></div>
              <div><strong>74</strong><small>Pending</small></div>
            </div>
            <div className="mock-progress"><span style={{ width: '64%' }} /></div>
            <p>Event-wise summaries help you see who is coming where.</p>
          </article>
          <article className="dashboard-mock-card actions-card">
            <span>Guest Link Actions</span>
            <button type="button">Copy Invite Link</button>
            <button type="button">Preview Guest View</button>
            <button type="button">Copy Guest Link</button>
          </article>
          <article className="dashboard-mock-card link-card">
            <span>Personalized Guest Links</span>
            <code>shaadi-nyota.app/riya-arjun/invite/a7k2pq</code>
            <p>Preview each guest link and share only the events they should see.</p>
          </article>
        </div>
      </section>

      <section className="marketing-section features" id="features">
        <div className="marketing-section-heading">
          <p className="marketing-eyebrow">Features</p>
          <h2>The essentials, designed around real Indian wedding workflows.</h2>
        </div>
        <div className="feature-grid">
          {features.map(([title, copy]) => (
            <article className="feature-card" key={title}>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section how-it-works" id="how-it-works">
        <div className="marketing-section-heading">
          <p className="marketing-eyebrow">How It Works</p>
          <h2>A simple path from first draft to live invite.</h2>
        </div>
        <div className="steps-grid">
          {[
            ['Choose your starting style', 'Start with a cinematic opening that matches the mood of your celebration.'],
            ['Customize each section', 'Edit story visuals, functions, timings, venues, music, and closing content.'],
            ['Share guest-wise links', 'Send one public link or personalized links with the Pro plan.'],
            ['Track RSVPs and responses', 'Review attendance, event visibility, and response status.'],
          ].map(([title, copy], index) => (
            <article className="step-card" key={title}>
              <span>{index + 1}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section pricing" id="pricing">
        <div className="marketing-section-heading">
          <p className="marketing-eyebrow">Pricing</p>
          <h2>Simple pricing for a polished wedding invite.</h2>
        </div>
        <div className="pricing-grid">
          <article className="pricing-card">
            <p>Wedding website</p>
            <h3>Basic</h3>
            <strong>{packageDetails.basic.priceLabel}</strong>
            <ul>
              <li>Cinematic wedding website</li>
              <li>Opening Reveal</li>
              <li>Our Story section</li>
              <li>Event details</li>
              <li>Closing Gallery</li>
              <li>Mobile-first guest experience</li>
              <li>Manual payment verification</li>
            </ul>
            <a className="marketing-btn secondary" href="/create-wedding?plan=basic">Choose Basic</a>
          </article>
          <article className="pricing-card featured">
            <p>Website + RSVP management</p>
            <h3>Pro</h3>
            <strong>{packageDetails.rsvp.priceLabel}</strong>
            <ul>
              <li>Everything in Basic</li>
              <li>Guest list management</li>
              <li>Personalized invite links</li>
              <li>Event-wise guest visibility</li>
              <li>RSVP dashboard</li>
              <li>RSVP response tracking</li>
            </ul>
            <a className="marketing-btn primary" href="/create-wedding?plan=rsvp">Choose Pro</a>
          </article>
        </div>
        <p className="pricing-note">
          Manual payment and verification keep publishing controlled. After payment, request verification and your
          website will be reviewed and made live within 24-48 hours.
        </p>
      </section>

      <section className="marketing-section faq" id="faq">
        <div className="marketing-section-heading">
          <p className="marketing-eyebrow">FAQ</p>
          <h2>Questions couples usually ask.</h2>
        </div>
        <div className="faq-grid">
          {faqs.map(([question, answer]) => (
            <article key={question}>
              <h3>{question}</h3>
              <p>{answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-final-cta">
        <p className="marketing-eyebrow">Begin beautifully</p>
        <h2>Make your first wedding impression unforgettable.</h2>
        <div className="marketing-hero-actions">
          <a className="marketing-btn primary" href="/create-wedding">Create Your Wedding Website</a>
          <a className="marketing-btn secondary" href="#openings">Preview Starting Styles</a>
        </div>
      </section>

      <footer className="marketing-footer" id="contact">
        <BrandMark />
        <p>Premium mobile-first wedding websites for Indian celebrations, cinematic openings, RSVP, and closing galleries.</p>
        <nav aria-label="Footer">
          <a href="#openings">Openings</a>
          <a href="#sections">Sections</a>
          <a href="#pricing">Pricing</a>
          <a href="/login">Login</a>
          <a href={contactUrl} target="_blank" rel="noreferrer">Contact</a>
        </nav>
        <small>&copy; {new Date().getFullYear()} Shaadi Nyota. All rights reserved.</small>
      </footer>
    </main>
  );
}
