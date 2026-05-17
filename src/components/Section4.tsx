import { useState } from 'react';
import './Section4.css';
import type { SampleWeddingData } from '../data/sampleWeddingData';

interface Section4Props {
    rsvp: SampleWeddingData['rsvp'];
}

export default function Section4({ rsvp }: Section4Props) {
    const [step, setStep] = useState(0);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    const handleNextName = () => {
        if (name.trim() !== '') setStep(1);
    };

    const handleKeyDownName = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleNextName();
    };

    const handleAttendance = (value: string) => {
        console.log("User selected attendance:", value);
        setStep(2);
    };

    const handleNextPhone = () => {
        if (phone.trim() !== '') {
            // "Submit"
            setStep(3);
        }
    };

    const handleKeyDownPhone = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleNextPhone();
    };

    return (
        <section className="section-wrapper section-4 rsvp-section">
            <div className="rsvp-container">
                {step < 3 && (
                    <div className="rsvp-header-area">
                        <div className="step-indicator">0{step + 1} / 03</div>
                        <h2 className="rsvp-title">{rsvp.title}</h2>
                        {rsvp.subtitle && <p>{rsvp.subtitle}</p>}
                    </div>
                )}

                <div className="rsvp-flow-content">
                    {/* STEP 0: NAME */}
                    {step === 0 && (
                        <div className="rsvp-step fade-in">
                            <h3 className="rsvp-question">May we have your name?</h3>
                            <input
                                type="text"
                                className="rsvp-minimal-input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={handleKeyDownName}
                                placeholder="First & Last Name"
                            />
                            {name.trim() !== '' && (
                                <button className="rsvp-arrow-btn micro-interaction" onClick={handleNextName}>
                                    &rarr;
                                </button>
                            )}
                        </div>
                    )}

                    {/* STEP 1: ATTENDING */}
                    {step === 1 && (
                        <div className="rsvp-step fade-in">
                            <h3 className="rsvp-question">Will you be celebrating with us?</h3>
                            <div className="rsvp-choices">
                                <button className="rsvp-pill-btn micro-interaction" onClick={() => handleAttendance('yes')}>
                                    {rsvp.responseOptions.yes}
                                </button>
                                <button className="rsvp-pill-btn micro-interaction" onClick={() => handleAttendance('no')}>
                                    {rsvp.responseOptions.no}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: PHONE */}
                    {step === 2 && (
                        <div className="rsvp-step fade-in">
                            <h3 className="rsvp-question">Where can we reach you?</h3>
                            <input
                                type="tel"
                                className="rsvp-minimal-input"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                onKeyDown={handleKeyDownPhone}
                                placeholder="Phone Number"
                            />
                            {phone.trim() !== '' && (
                                <button className="rsvp-arrow-btn micro-interaction" onClick={handleNextPhone}>
                                    &rarr;
                                </button>
                            )}
                        </div>
                    )}

                    {/* STEP 3: SUCCESS */}
                    {step === 3 && (
                        <div className="rsvp-step fade-in success-step">
                            {rsvp.successMessage.map((message) => (
                                <p key={message} className="success-text">{message}</p>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
