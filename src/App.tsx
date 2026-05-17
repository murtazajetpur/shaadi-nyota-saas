import { useState, useCallback, Suspense, lazy, useEffect } from 'react';
import './App.css';
import Hero from './components/Hero';
import Section1 from './components/Section1';
import AudioPlayer from './components/AudioPlayer';

const Section2 = lazy(() => import('./components/Section2'));
const Section3 = lazy(() => import('./components/Section3'));
const Section4 = lazy(() => import('./components/Section4'));
const Section5 = lazy(() => import('./components/Section5'));

function App() {
  const [ganeshaVisible, setGaneshaVisible] = useState(false);
  const [heroDone, setHeroDone] = useState(false);
  const [heroStarted, setHeroStarted] = useState(false);

  const handleGaneshaReveal = useCallback(() => setGaneshaVisible(true), []);
  const handleHeroComplete = useCallback(() => setHeroDone(true), []);

  useEffect(() => {
    if (!heroStarted) return;

    const preloadImage = (src: string) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = resolve; // Continue even if one image fails
        img.src = src;
      });
    };

    const runPreload = async () => {
      // Tier 1: Ganesha full composition
      await preloadImage('/assets/Ganesha Image.png');

      // Tier 2: Phera image
      await preloadImage('/assets/second section old.png');

      // Tier 3: Event backgrounds and carousels
      const tier3 = [
        '/assets/haldi.png', '/assets/haldi-bg.png',
        '/assets/mehendi.png', '/assets/mehendi-bg.png',
        '/assets/sangeet.png', '/assets/sangeet-bg.png',
        '/assets/wedding.png', '/assets/wedding-bg.png',
        '/assets/reception.png', '/assets/reception-bg.png',
        '/assets/carousel1.png', '/assets/carousel2.png', '/assets/carousel3.png',
        '/assets/heart-frame.png'
      ];
      await Promise.all(tier3.map(preloadImage));
    };

    runPreload();
  }, [heroStarted]);

  return (
    <>
      <div className="desktop-bg-blur" />
      <div className="desktop-vignette" />
      <div className="app-container">
        <div className={`phone-canvas ${!heroDone ? 'no-scroll' : 'ready-to-snap'}`}>
          {/* Global Audio Player */}
          {(heroStarted || heroDone) && <AudioPlayer triggerPlay={heroStarted || heroDone} />}

          {/* Main flow components */}
          {heroDone && (
            <>
              <Section1 ganeshaVisible={ganeshaVisible} />
              <Suspense fallback={null}>
                <Section2 />
                <Section3 />
                <Section4 />
                <Section5 />
              </Suspense>
            </>
          )}

          {/* Hero is mounted on top via absolute positioning until it's done */}
          {!heroDone && (
            <Hero
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
