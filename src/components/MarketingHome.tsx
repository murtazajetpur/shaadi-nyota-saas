import { useEffect, useState } from 'react';
import './MarketingHome.css';
import { buildPaymentWhatsAppUrl, packageDetails } from '../data/paymentConfig';

const templateCards = [
  {
    name: 'Classic Envelope',
    theme: 'envelope-opening',
    previewHref: '/templates/classic-envelope',
    image: '/assets/opening-reveal/envelope/posters/opening-envelope-poster.jpeg',
    description: 'A graceful first tap with a classic invitation reveal and blessing moment.',
    badges: ['Cinematic Opening', 'Mobile First', 'Classic'],
  },
  {
    name: 'Scroll Opening',
    theme: 'scroll-opening',
    previewHref: '/templates/scroll-opening',
    image: '/assets/opening-reveal/scroll/posters/opening-scroll-poster.png',
    description: 'A soft scroll-inspired reveal for couples who want a modern romantic mood.',
    badges: ['Floral Reveal', 'RSVP Ready', 'Elegant'],
  },
  {
    name: 'Palace Door Opening',
    theme: 'palace-door-opening',
    previewHref: '/templates/palace-door-opening',
    image: '/assets/opening-reveal/palace-door/posters/opening-reveal-palace-door-poster-01.png',
    description: 'A royal entrance that feels ceremonial, grand, and unmistakably wedding-first.',
    badges: ['Royal Opening', 'Premium', 'Ceremonial'],
  },
];

const guestFlow = [
  'Opening Reveal',
  'Our Story',
  'Events',
  'RSVP',
  'Closing Gallery',
];

const features = [
  ['Cinematic Opening Reveals', 'Envelope, scroll, and palace-door openings that make the first tap feel special.'],
  ['Our Story Section', 'Share your story with elegant text, portraits, and wedding-first layouts.'],
  ['Event-wise Details', 'Haldi, Mehendi, Sangeet, wedding, reception, and custom celebrations.'],
  ['Guest-wise Invite Links', 'Create personalized invite links for each family or guest group.'],
  ['RSVP Management', 'Track attendance, invited events, and meal preferences in one dashboard.'],
  ['Closing Gallery', 'End with a polished thank-you note and optional couple photos.'],
  ['Mobile-first Design', 'Built for the phone screen where your guests will actually open it.'],
  ['Manual Payment Support', 'Simple WhatsApp/UPI payment flow with verification before publishing.'],
];

const faqs = [
  ['Can I customize the invite?', 'Yes. You can edit sections, opening reveal, story, events, music, photos, and closing content from the dashboard.'],
  ['Can guests RSVP online?', 'Yes. RSVP is included in Nyota Plus with event-wise responses and meal preferences.'],
  ['Can I create different invites for different guests?', 'Yes. Nyota Plus supports personalized invite links and event-wise guest visibility.'],
  ['How does payment work?', 'Payment is handled manually via WhatsApp/UPI. After payment, request verification from your dashboard.'],
  ['How long does it take to make the website live?', 'After payment verification, your website is reviewed and made live within 24-48 hours.'],
  ['Can I update event details later?', 'Yes. You can update event details from the dashboard and save the changes.'],
  ['Can I add my own photos?', 'Yes. Current sections support selectable/uploaded images where enabled, with more upload flows planned.'],
  ['Is it mobile-friendly?', 'Yes. The invitation experience is designed primarily for mobile guests.'],
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
          onError={() => setShowLogo(false)}
        />
      )}
      <span>Shaadi Nyota</span>
    </a>
  );
}

function PhonePreview({
  image,
  title,
  eyebrow,
  className = '',
}: {
  image: string;
  title: string;
  eyebrow: string;
  className?: string;
}) {
  return (
    <div className={`marketing-phone ${className}`}>
      <div className="marketing-phone-screen">
        <img src={image} alt="" />
        <div className="marketing-phone-copy">
          <span>{eyebrow}</span>
          <strong>{title}</strong>
        </div>
      </div>
    </div>
  );
}

export default function MarketingHome() {
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
          <a href="#templates">Templates</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="marketing-header-actions">
          <a className="marketing-login" href="/login">Login</a>
          <a className="marketing-btn primary" href="/create-wedding">Create Website</a>
        </div>
      </header>

      <section className="marketing-hero">
        <div className="marketing-hero-copy">
          <p className="marketing-eyebrow">Premium royal digital invitations</p>
          <h1>Your wedding invitation, reimagined as a royal digital experience.</h1>
          <p>
            Create a beautiful mobile-first wedding website with cinematic openings,
            event details, RSVP management, and personalized guest invites.
          </p>
          <div className="marketing-hero-actions">
            <a className="marketing-btn primary" href="/create-wedding">Create Your Wedding Website</a>
            <a className="marketing-btn secondary" href="#templates">View Templates</a>
          </div>
        </div>
        <div className="marketing-hero-visual" aria-hidden="true">
          <PhonePreview
            className="main"
            image="/assets/our-story/images/story-holding-hands-02.png"
            eyebrow="Mahesh & Neha"
            title="are getting married"
          />
          <PhonePreview
            className="side top"
            image="/assets/opening-reveal/palace-door/posters/opening-reveal-palace-door-poster-01.png"
            eyebrow="Tap to reveal"
            title="Palace Door"
          />
          <PhonePreview
            className="side bottom"
            image="/assets/events/wedding/event-wedding-premium-16.png"
            eyebrow="Wedding"
            title="The celebrations"
          />
        </div>
      </section>

      <section className="marketing-section templates" id="templates">
        <div className="marketing-section-heading">
          <p className="marketing-eyebrow">Templates</p>
          <h2>Choose a style that feels like your celebration.</h2>
        </div>
        <div className="template-grid">
          {templateCards.map((template) => (
            <article className="template-card" key={template.name}>
              <div className="template-preview">
                <img src={template.image} alt="" />
              </div>
              <div>
                <h3>{template.name}</h3>
                <p>{template.description}</p>
                <div className="template-badges">
                  {template.badges.map((badge) => <span key={badge}>{badge}</span>)}
                </div>
                <div className="template-actions">
                  <a href={template.previewHref}>Preview</a>
                  <a href={`/create-wedding?theme=${template.theme}`}>Use This Style</a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section guest-flow">
        <div className="marketing-section-heading">
          <p className="marketing-eyebrow">Guest Experience</p>
          <h2>From the first tap to the final thank-you, every section feels like part of your wedding story.</h2>
        </div>
        <div className="flow-line">
          {guestFlow.map((item, index) => (
            <div className="flow-step" key={item}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{item}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="marketing-section features" id="features">
        <div className="marketing-section-heading">
          <p className="marketing-eyebrow">Features</p>
          <h2>Everything your wedding invite needs, beautifully managed.</h2>
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

      <section className="marketing-section rsvp-highlight">
        <div>
          <p className="marketing-eyebrow">Nyota Plus</p>
          <h2>No more messy RSVP tracking.</h2>
          <p>
            Guests can RSVP event-wise, families can be managed together, meal preferences
            can be captured, and the couple can review responses from the RSVP dashboard.
          </p>
        </div>
        <div className="rsvp-mini-card">
          <span>RSVP Dashboard</span>
          <strong>124</strong>
          <p>responses tracked across events</p>
        </div>
      </section>

      <section className="marketing-section how-it-works" id="how-it-works">
        <div className="marketing-section-heading">
          <p className="marketing-eyebrow">How It Works</p>
          <h2>A simple path from first draft to live invite.</h2>
        </div>
        <div className="steps-grid">
          {[
            ['Choose your invite style', 'Start with a cinematic template that matches your wedding mood.'],
            ['Add your story and events', 'Edit the couple story, celebrations, timings, venues, and visuals.'],
            ['Share personalized invite links', 'Send one public link or guest-wise links for RSVP plans.'],
            ['Track RSVPs and responses', 'Review attendance, event visibility, and meal preferences.'],
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
          <h2>Choose the plan that fits your celebration.</h2>
        </div>
        <div className="pricing-grid">
          <article className="pricing-card">
            <p>Basic Wedding Website</p>
            <h3>Nyota Classic</h3>
            <strong>{packageDetails.basic.priceLabel}</strong>
            <ul>
              <li>Cinematic wedding website</li>
              <li>Opening Reveal</li>
              <li>Our Story</li>
              <li>Event details</li>
              <li>Closing Gallery</li>
              <li>Mobile-first guest experience</li>
              <li>Manual payment verification</li>
            </ul>
            <a className="marketing-btn secondary" href="/create-wedding?plan=basic">Start with Nyota Classic</a>
          </article>
          <article className="pricing-card featured">
            <p>Website + RSVP Management</p>
            <h3>Nyota Plus</h3>
            <strong>{packageDetails.rsvp.priceLabel}</strong>
            <ul>
              <li>Everything in Nyota Classic</li>
              <li>Guest list management</li>
              <li>Personalized invite links</li>
              <li>Event-wise guest visibility</li>
              <li>RSVP dashboard</li>
              <li>Meal preferences</li>
              <li>RSVP response tracking</li>
            </ul>
            <a className="marketing-btn primary" href="/create-wedding?plan=rsvp">Start with Nyota Plus</a>
          </article>
        </div>
        <p className="pricing-note">
          Manual payment via WhatsApp/UPI. After payment, request verification and your website will be
          reviewed and made live within 24-48 hours.
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
          <a className="marketing-btn secondary" href="#templates">View Templates</a>
        </div>
      </section>

      <footer className="marketing-footer" id="contact">
        <BrandMark />
        <p>Premium mobile-first wedding websites with cinematic openings, events, RSVP, and closing galleries.</p>
        <nav aria-label="Footer">
          <a href="#templates">Templates</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
          <a href="/login">Login</a>
          <a href={contactUrl} target="_blank" rel="noreferrer">WhatsApp</a>
        </nav>
        <small>© {new Date().getFullYear()} Shaadi Nyota. All rights reserved.</small>
      </footer>
    </main>
  );
}
