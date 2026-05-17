import './Section1.css';

interface Section1Props {
    ganeshaVisible: boolean;
}

export default function Section1({ ganeshaVisible }: Section1Props) {
    return (
        <section className="section-wrapper section-1">
            <div className={`ganesha-stage ${ganeshaVisible ? 'reveal' : ''}`}>
                <div className="ganesha-frame">
                    <img
                        src="/assets/Ganesha Image.png"
                        alt="Lord Ganesha"
                        className="ganesha-full-img"
                        loading="eager"
                    />
                </div>
            </div>
        </section>
    );
}
