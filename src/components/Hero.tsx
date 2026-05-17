import { useState, useRef, useEffect } from 'react';
import './Hero.css';
import type { SampleWeddingData } from '../data/sampleWeddingData';

interface HeroProps {
    hero: SampleWeddingData['hero'];
    audioSrc: string;
    onHeroStart: () => void;
    onGaneshaReveal: () => void;
    onHeroComplete: () => void;
}

export default function Hero({ hero, audioSrc, onHeroStart, onGaneshaReveal, onHeroComplete }: HeroProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [ctaFadingOut, setCtaFadingOut] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const revealedRef = useRef(false);
    const fadingOutRef = useRef(false);

    const handleVideoReady = () => {
        setIsVideoReady(true);
    };

    const handleTap = () => {
        if (!isPlaying && !ctaFadingOut) {
            setCtaFadingOut(true);

            // 1. Play audio synchronously right here in the click handler
            // to prevent iOS Safari from blocking it. Do this irrespective of video state.
            const audioEl = document.querySelector('audio');
            if (audioEl && audioEl.paused) {
                if (!audioEl.getAttribute('src')) {
                    audioEl.setAttribute('src', audioSrc);
                }
                if (!audioEl.muted) {
                    audioEl.volume = 0; // Let AudioPlayer handle the fade-in via triggerPlay
                    audioEl.play().catch(err => console.error("Audio synchronous play blocked:", err));
                }
            }

            // 2. Play video
            if (videoRef.current) {
                videoRef.current.muted = true;
                const playPromise = videoRef.current.play();

                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        setIsPlaying(true);
                    }).catch(err => {
                        console.error("Video play failed or is buffering:", err);
                        // If it fails to play immediately (e.g. buffering), we still want to 
                        // register it as 'playing' so the UI progresses and video auto-recovers
                        setIsPlaying(true);
                    });
                } else {
                    setIsPlaying(true);
                }
            } else {
                // Fallback if video ref is missing for some reason
                setIsPlaying(true);
            }
        }
    };

    const hasStartedRef = useRef(false);

    const handleVideoPlay = () => {
        if (!hasStartedRef.current) {
            hasStartedRef.current = true;
            onHeroStart();
        }

        const audioEl = document.querySelector('audio');
        if (audioEl && audioEl.paused && !audioEl.muted) {
            if (!audioEl.getAttribute('src')) {
                audioEl.setAttribute('src', audioSrc);
            }
            audioEl.play().catch(err => console.error("Audio play blocked on video play event:", err));
        }
    };

    const checkTime = () => {
        if (videoRef.current && isPlaying) {
            const time = videoRef.current.currentTime;

            if (time >= hero.revealImageShowAtSeconds && !revealedRef.current) {
                revealedRef.current = true;
                onGaneshaReveal();
            }

            if (time >= hero.heroFadeAtSeconds && !fadingOutRef.current) {
                fadingOutRef.current = true;
                setIsFadingOut(true);

                // CSS transition is 0.7s to 0.9s
                setTimeout(() => {
                    onHeroComplete();
                }, 700);
            }
        }
    };

    useEffect(() => {
        let animationFrame: number;

        const loop = () => {
            checkTime();
            animationFrame = requestAnimationFrame(loop);
        };

        if (isPlaying && !fadingOutRef.current) {
            animationFrame = requestAnimationFrame(loop);
        }
        return () => cancelAnimationFrame(animationFrame);
    }, [isPlaying, hero.heroFadeAtSeconds, hero.revealImageShowAtSeconds, onGaneshaReveal, onHeroComplete]);

    return (
        <div className={`hero-container ${isFadingOut ? 'fade-out' : ''}`}>
            <video
                ref={videoRef}
                playsInline
                webkit-playsinline="true"
                className="hero-video"
                preload="auto"
                poster={hero.posterSrc}
                src={hero.videoSrc}
                onPlay={handleVideoPlay}
                onTimeUpdate={checkTime}
                onCanPlay={handleVideoReady}
                onLoadedData={handleVideoReady}
                onEnded={() => {
                    // Fallback if video is shorter than 8.0 for some reason
                    if (!fadingOutRef.current) {
                        fadingOutRef.current = true;
                        setIsFadingOut(true);
                        setTimeout(() => onHeroComplete(), 700);
                    }
                }}
            />

            <div
                className={`video-loading-overlay ${isVideoReady ? 'fade-out' : ''}`}
                style={{ backgroundImage: `url('${hero.posterSrc}')` }}
                onClick={handleTap}
            >
                {/* Empty overlay just for poster background and click interception */}
            </div>

            {!isPlaying && (
                <div className={`hero-cta-overlay ${ctaFadingOut ? 'fading-out' : ''}`} onClick={handleTap}>
                    <button className="hero-btn">{hero.revealCtaText}</button>
                </div>
            )}
        </div>
    );
}
