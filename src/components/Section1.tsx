import './Section1.css';
import type { SampleWeddingData } from '../data/sampleWeddingData';
import OpeningRevealScrollPrompt from './OpeningRevealScrollPrompt';

interface Section1Props {
    ganeshaVisible: boolean;
    hero: SampleWeddingData['hero'];
    settled?: boolean;
}

export default function Section1({ ganeshaVisible, hero, settled = false }: Section1Props) {
    return (
        <section className="section-wrapper section-1">
            <div className={`ganesha-stage ${settled ? 'settled' : ganeshaVisible ? 'reveal' : ''}`}>
                <div className="ganesha-frame">
                    <img
                        src={hero.revealImageSrc}
                        alt={hero.revealImageAlt}
                        className="ganesha-full-img"
                        loading="eager"
                    />
                </div>
                {settled && <OpeningRevealScrollPrompt />}
            </div>
        </section>
    );
}
