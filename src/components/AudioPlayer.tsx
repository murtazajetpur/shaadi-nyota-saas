import { useState, useEffect, useRef, useCallback } from 'react';
import './AudioPlayer.css';

interface AudioPlayerProps {
    triggerPlay: boolean;
}

export default function AudioPlayer({ triggerPlay }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [hasAttemptedPlay, setHasAttemptedPlay] = useState(false);

    const toggleMute = useCallback(() => {
        setIsMuted((prev) => {
            const newState = !prev;
            if (audioRef.current) {
                audioRef.current.muted = newState;
                // If unmuting and we haven't played yet, play it!
                if (!newState && audioRef.current.paused) {
                    audioRef.current.play().catch(e => console.error("Audio playback failed on unmute:", e));
                }
            }
            return newState;
        });
    }, []);

    // Handle initial trigger
    useEffect(() => {
        if (!triggerPlay || hasAttemptedPlay || !audioRef.current) return;
        setHasAttemptedPlay(true);

        // Standard setup
        const audio = audioRef.current;
        if (!audio.getAttribute('src')) {
            audio.setAttribute('src', '/assets/din-shangda-audio.mp3');
        }
        audio.loop = true;

        if (isMuted) {
            audio.muted = true;
            // The user refined "If muted once, audio must NOT auto-play again during session"
            // We'll respect that by skipping play entirely if they are starting the session muted.
            // But if they decide to unmute, the toggle handler will call play()
            return;
        }

        audio.volume = 0; // Set strictly 0 BEFORE playing
        audio.play().then(() => {
            // Fade in over ~2.0 seconds via requestAnimationFrame
            const fadeDurationMs = 2000;
            const startTime = performance.now();

            const fadeAudio = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / fadeDurationMs, 1);

                if (audioRef.current) {
                    audioRef.current.volume = progress;
                }

                if (progress < 1) {
                    requestAnimationFrame(fadeAudio);
                }
            };
            requestAnimationFrame(fadeAudio);
        }).catch((err) => {
            console.warn("Autoplay was blocked by browser:", err);
            // Fallback: If autoplay blocked without interaction, we show unmuted but rely on user tapping it to actually start
        });
    }, [triggerPlay, hasAttemptedPlay, isMuted]);

    return (
        <div className="audio-player-container">
            <audio ref={audioRef} preload="none" />
            <button
                className="mute-btn micro-interaction"
                onClick={toggleMute}
                title="Play / Pause Audio"
                aria-label={isMuted ? 'Play Audio' : 'Pause Audio'}
            >
                {isMuted ? (
                    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="currentColor" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="currentColor" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                )}
            </button>
        </div>
    );
}
