import { useState } from 'react';
import './Section4.css';

export default function Section4() {
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
                        <h2 className="rsvp-title">Will you be joining us?</h2>
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
                                    Yes
                                </button>
                                <button className="rsvp-pill-btn micro-interaction" onClick={() => handleAttendance('no')}>
                                    Regretfully, no
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
                            <p className="success-text">Thank you.</p>
                            <p className="success-text">We look forward to celebrating together.</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
