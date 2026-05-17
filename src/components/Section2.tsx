import "./Section2.css";
import type { SampleWeddingData } from "../data/sampleWeddingData";

interface Section2Props {
    couple: SampleWeddingData['couple'];
}

export default function Section2({ couple }: Section2Props) {
    return (
        <section className="section-wrapper section-2">
            <div className="petals-container">
                {/* Petals intentionally disabled for now */}
            </div>

            <div
                className="s2-image-wrapper"
                style={{ backgroundImage: `url('${couple.backgroundImageSrc}')` }}
            >
                <div className="s2-top-names">{couple.displayName}</div>
                <div className="s2-heading-container">
                    <h2 className="s2-heading">{couple.introLine}</h2>
                </div>
            </div>
        </section>
    );
}
