import './OpeningRevealScrollPrompt.css';

interface OpeningRevealScrollPromptProps {
    compact?: boolean;
}

export default function OpeningRevealScrollPrompt({ compact = false }: OpeningRevealScrollPromptProps) {
    return (
        <div className={`opening-reveal-scroll-prompt ${compact ? 'compact' : ''}`}>
            <span>Scroll to continue</span>
            <i aria-hidden="true" />
        </div>
    );
}
