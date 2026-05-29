import { useState, useRef, useEffect } from 'react';
import './Hero.css';
import type { SampleWeddingData } from '../data/sampleWeddingData';
import { getOpeningRevealCrossfadeProgress } from '../data/openingReveal';
import { useOpeningRevealVideoSrc } from '../hooks/useOpeningRevealVideoSrc';

interface HeroProps {
    hero: SampleWeddingData['hero'];
    audioSrc: string;
    onHeroStart: () => void;
    onGaneshaReveal: () => void;
    onHeroComplete: () => void;
    enableResponsiveVideo?: boolean;
}

export default function Hero({ hero, audioSrc, onHeroStart, onGaneshaReveal, onHeroComplete, enableResponsiveVideo = true }: HeroProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const responsiveVideoSrc = useOpeningRevealVideoSrc(hero.videoSrc);
    const videoSrc = enableResponsiveVideo ? responsiveVideoSrc : hero.videoSrc;
    const [isPlaying, setIsPlaying] = useState(false);
    const [ctaFadingOut, setCtaFadingOut] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [revealImageOpacity, setRevealImageOpacity] = useState(0);
    const revealedRef = useRef(false);

    const handleVideoReady = () => {
        setIsVideoReady(true);
    };

    useEffect(() => {
        if (!hero.revealImageSrc) return;
        const revealImage = new Image();
        revealImage.src = hero.revealImageSrc;
    }, [hero.revealImageSrc]);

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
            const duration = videoRef.current.duration;

            const progress = getOpeningRevealCrossfadeProgress(time, duration);
            setRevealImageOpacity(progress);
            if (progress > 0 && !revealedRef.current) {
                revealedRef.current = true;
                onGaneshaReveal();
            }
        }
    };

    useEffect(() => {
        let animationFrame: number;

        const loop = () => {
            checkTime();
            animationFrame = requestAnimationFrame(loop);
        };

        if (isPlaying) {
            animationFrame = requestAnimationFrame(loop);
        }
        return () => cancelAnimationFrame(animationFrame);
    }, [isPlaying, onGaneshaReveal]);

    return (
        <div className="hero-container">
            <video
                ref={videoRef}
                playsInline
                webkit-playsinline="true"
                className="hero-video"
                preload="auto"
                poster={hero.posterSrc}
                src={videoSrc}
                onPlay={handleVideoPlay}
                onTimeUpdate={checkTime}
                onCanPlay={handleVideoReady}
                onLoadedData={handleVideoReady}
                onEnded={() => {
                    if (!revealedRef.current) {
                        revealedRef.current = true;
                        onGaneshaReveal();
                    }
                    setRevealImageOpacity(1);
                    onHeroComplete();
                }}
            />

            <img
                className="hero-reveal-image"
                src={hero.revealImageSrc}
                alt={hero.revealImageAlt}
                style={{ opacity: revealImageOpacity }}
            />

            <div
                className={`video-loading-overlay ${isVideoReady ? 'fade-out' : ''}`}
                style={{ backgroundImage: `url('${hero.posterSrc}')` }}
                onClick={handleTap}
            />

            {!isPlaying && (
                <div className={`hero-cta-overlay ${ctaFadingOut ? 'fading-out' : ''}`} onClick={handleTap}>
                    <button className="hero-btn">{hero.revealCtaText}</button>
                </div>
            )}
        </div>
    );
}
