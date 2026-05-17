import './Section1.css';
import type { SampleWeddingData } from '../data/sampleWeddingData';

interface Section1Props {
    ganeshaVisible: boolean;
    hero: SampleWeddingData['hero'];
}

export default function Section1({ ganeshaVisible, hero }: Section1Props) {
    return (
        <section className="section-wrapper section-1">
            <div className={`ganesha-stage ${ganeshaVisible ? 'reveal' : ''}`}>
                <div className="ganesha-frame">
                    <img
                        src={hero.revealImageSrc}
                        alt={hero.revealImageAlt}
                        className="ganesha-full-img"
                        loading="eager"
                    />
                </div>
            </div>
        </section>
    );
}
