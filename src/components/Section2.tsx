import "./Section2.css";
import type { SampleWeddingData } from "../data/sampleWeddingData";
import { getOptimizedAssetPath } from "../data/assetRegistry";
import OpeningRevealScrollPrompt from './OpeningRevealScrollPrompt';

interface Section2Props {
    couple: SampleWeddingData['couple'];
    showScrollPrompt?: boolean;
}

export default function Section2({ couple, showScrollPrompt = false }: Section2Props) {
    return (
        <section className="section-wrapper section-2">
            <div className="petals-container">
                {/* Petals intentionally disabled for now */}
            </div>

            <div
                className="s2-image-wrapper"
                style={{ backgroundImage: `url('${getOptimizedAssetPath(couple.backgroundImageSrc)}')` }}
            >
                {couple.displayName.trim() && <div className="s2-top-names">{couple.displayName}</div>}
                <div className="s2-heading-container">
                    {couple.introLine.trim() && <h2 className="s2-heading">{couple.introLine}</h2>}
                    {couple.storyTitle.trim() && <h3 className="s2-story-title">{couple.storyTitle}</h3>}
                    {couple.storyText.trim() && <p className="s2-story-text">{couple.storyText}</p>}
                </div>
                {showScrollPrompt && <OpeningRevealScrollPrompt />}
            </div>
        </section>
    );
}

