import { useState, useCallback, Suspense, lazy, useEffect } from 'react';
import './App.css';
import Hero from './components/Hero';
import Section1 from './components/Section1';
import AudioPlayer from './components/AudioPlayer';
import { defaultWeddingSlug, getWeddingBySlug } from './data/sampleWeddingData';

const Section2 = lazy(() => import('./components/Section2'));
const Section3 = lazy(() => import('./components/Section3'));
const Section4 = lazy(() => import('./components/Section4'));
const Section5 = lazy(() => import('./components/Section5'));

function App() {
  const slug = window.location.pathname.split('/').filter(Boolean)[0] ?? defaultWeddingSlug;
  const data = getWeddingBySlug(slug);
  const [ganeshaVisible, setGaneshaVisible] = useState(false);
  const [heroDone, setHeroDone] = useState(false);
  const [heroStarted, setHeroStarted] = useState(false);

  const handleGaneshaReveal = useCallback(() => setGaneshaVisible(true), []);
  const handleHeroComplete = useCallback(() => setHeroDone(true), []);

  useEffect(() => {
    document.title = data?.wedding.pageTitle ?? 'Wedding Not Found | Shaadi Nyota';
  }, [data?.wedding.pageTitle]);

  useEffect(() => {
    if (!heroStarted || !data) return;

    const preloadImage = (src: string) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = resolve; // Continue even if one image fails
        img.src = src;
      });
    };

    const runPreload = async () => {
      await preloadImage(data.hero.revealImageSrc);

      if (data.couple.enabled) {
        await preloadImage(data.couple.backgroundImageSrc);
      }

      const tier3 = [
        ...data.events.flatMap((event) => [event.foregroundImageSrc, event.backgroundImageSrc]),
        ...data.closing.carouselImages,
        data.closing.frameImageSrc,
      ];
      await Promise.all(tier3.map(preloadImage));
    };

    runPreload();
  }, [heroStarted, data]);

  if (!data) {
    return (
      <>
        <div className="desktop-bg-blur" />
        <div className="desktop-vignette" />
        <div className="app-container">
          <div className="phone-canvas">
            <section className="section-wrapper not-found-section">
              <h1>Wedding invite not found</h1>
              <p>Please check the invitation link and try again.</p>
            </section>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="desktop-bg-blur" />
      <div className="desktop-vignette" />
      <div className="app-container">
        <div className={`phone-canvas ${!heroDone ? 'no-scroll' : 'ready-to-snap'}`}>
          {/* Global Audio Player */}
          {(heroStarted || heroDone) && (
            <AudioPlayer
              triggerPlay={heroStarted || heroDone}
              audioSrc={data.music.audioSrc}
              title={data.music.title}
            />
          )}

          {/* Main flow components */}
          {heroDone && (
            <>
              <Section1 ganeshaVisible={ganeshaVisible} hero={data.hero} />
              <Suspense fallback={null}>
                {data.couple.enabled && <Section2 couple={data.couple} />}
                <Section3 events={data.events} />
                {data.rsvp.enabled && <Section4 rsvp={data.rsvp} />}
                <Section5 closing={data.closing} />
              </Suspense>
            </>
          )}

          {/* Hero is mounted on top via absolute positioning until it's done */}
          {!heroDone && (
            <Hero
              hero={data.hero}
              audioSrc={data.music.audioSrc}
              onHeroStart={() => setHeroStarted(true)}
              onGaneshaReveal={handleGaneshaReveal}
              onHeroComplete={handleHeroComplete}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default App;
