import { useState, useEffect, useRef, useCallback } from 'react';
import './AudioPlayer.css';

interface AudioPlayerProps {
    triggerPlay: boolean;
    audioSrc: string;
    title: string;
    audioElementId?: string;
    showControl?: boolean;
}

export default function AudioPlayer({ triggerPlay, audioSrc, title, audioElementId, showControl = true }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasAttemptedPlay, setHasAttemptedPlay] = useState(false);
    const fadeFrameRef = useRef<number | null>(null);

    const fadeInAudio = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (fadeFrameRef.current !== null) {
            cancelAnimationFrame(fadeFrameRef.current);
        }

        const fadeDurationMs = 2000;
        const startTime = performance.now();
        const startVolume = Number.isFinite(audio.volume) ? audio.volume : 0;

        const fadeAudio = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / fadeDurationMs, 1);

            if (audioRef.current) {
                audioRef.current.volume = Math.min(1, startVolume + ((1 - startVolume) * progress));
            }

            if (progress < 1) {
                fadeFrameRef.current = requestAnimationFrame(fadeAudio);
            } else {
                fadeFrameRef.current = null;
            }
        };

        fadeFrameRef.current = requestAnimationFrame(fadeAudio);
    }, []);

    const playAudio = useCallback(async (fade = true) => {
        const audio = audioRef.current;
        if (!audio || !audioSrc) return;

        if (!audio.getAttribute('src')) {
            audio.setAttribute('src', audioSrc);
        }
        audio.loop = true;
        audio.muted = false;
        if (fade) audio.volume = 0;

        try {
            await audio.play();
            setIsPlaying(true);
            if (fade) fadeInAudio();
        } catch (err) {
            setIsPlaying(false);
            console.warn('Audio playback was blocked by browser:', err);
        }
    }, [audioSrc, fadeInAudio]);

    const toggleAudio = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (!audio.paused && isPlaying) {
            audio.pause();
            setIsPlaying(false);
            return;
        }

        void playAudio(false);
    }, [isPlaying, playAudio]);

    useEffect(() => {
        setHasAttemptedPlay(false);
        setIsPlaying(false);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current.setAttribute('src', audioSrc);
            audioRef.current.load();
        }
    }, [audioSrc]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return undefined;

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => setIsPlaying(false);

        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    useEffect(() => {
        return () => {
            if (fadeFrameRef.current !== null) {
                cancelAnimationFrame(fadeFrameRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!triggerPlay || hasAttemptedPlay || !audioRef.current) return;
        setHasAttemptedPlay(true);
        void playAudio(true);
    }, [triggerPlay, hasAttemptedPlay, playAudio]);

    return (
        <div className={`audio-player-container ${showControl ? '' : 'is-hidden'}`}>
            <audio id={audioElementId} ref={audioRef} preload="auto" src={audioSrc} loop />
            <button
                className="mute-btn micro-interaction"
                onClick={toggleAudio}
                title={title}
                aria-label={isPlaying ? 'Mute audio' : 'Unmute audio'}
                type="button"
            >
                {isPlaying ? (
                    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                        <path d="M18.5 5.5a9 9 0 0 1 0 13" />
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                        <path d="m16 9 5 5" />
                        <path d="m21 9-5 5" />
                    </svg>
                )}
            </button>
        </div>
    );
}
