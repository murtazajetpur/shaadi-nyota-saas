import { useEffect, useMemo, useState } from 'react';
import './Section4.css';
import {
    mockRsvpResponsesStorageKey,
    type MealPreference,
    type RsvpResponse,
    type RsvpStatus,
    type SampleWeddingData,
    type StoredRsvpResponse,
    type WeddingEvent,
    type WeddingGuest,
} from '../data/sampleWeddingData';
import { loadSupabaseRsvpResponses, saveSupabaseRsvpSubmission } from '../lib/supabaseWeddingData';

interface Section4Props {
    rsvp: SampleWeddingData['rsvp'];
    weddingId?: string;
    weddingSlug: string;
    events: WeddingEvent[];
    guest?: WeddingGuest;
    personalizedInviteMode?: boolean;
}

const loadStoredRsvpResponses = () => {
    try {
        return JSON.parse(window.localStorage.getItem(mockRsvpResponsesStorageKey) ?? '[]') as StoredRsvpResponse[];
    } catch {
        return [];
    }
};

export default function Section4({ rsvp, weddingId, weddingSlug, events, guest, personalizedInviteMode = false }: Section4Props) {
    const [responses, setResponses] = useState<RsvpResponse[]>(() => (
        events.map((event) => {
            const stored = guest
                ? loadStoredRsvpResponses().find((response) => (
                    response.weddingSlug === weddingSlug &&
                    response.guestId === guest.id &&
                    response.eventId === event.id
                ))
                : undefined;

            return {
                guestId: guest?.id ?? 'public',
                eventId: event.id,
                status: stored?.status ?? '',
                mealPreference: stored?.mealPreference ?? '',
                updatedAt: stored?.updatedAt,
            };
        })
    ));
    const [mealPreference, setMealPreference] = useState<MealPreference>(() => {
        if (!guest) return '';
        if (guest.mealPreference) return guest.mealPreference;
        return loadStoredRsvpResponses().find((response) => (
            response.weddingSlug === weddingSlug &&
            response.guestId === guest.id &&
            response.mealPreference
        ))?.mealPreference ?? '';
    });
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState('');

    useEffect(() => {
        let mounted = true;

        const loadResponses = async () => {
            if (!weddingId || !guest) return;
            const result = await loadSupabaseRsvpResponses(weddingId, weddingSlug, [guest]);
            if (!mounted || result.error) return;

            setResponses(events.map((event) => {
                const stored = result.responses.find((response) => response.eventId === event.id);
                return {
                    guestId: guest.id,
                    eventId: event.id,
                    status: stored?.status ?? '',
                    mealPreference: guest.mealPreference ?? stored?.mealPreference ?? '',
                    updatedAt: stored?.updatedAt,
                };
            }));
            setMealPreference(guest.mealPreference ?? result.responses.find((response) => response.mealPreference)?.mealPreference ?? '');
        };

        void loadResponses();

        return () => {
            mounted = false;
        };
    }, [events, guest, weddingId, weddingSlug]);

    const hasPositiveResponse = useMemo(() => (
        responses.some((response) => response.status === 'yes' || response.status === 'maybe')
    ), [responses]);
    const answeredCount = useMemo(() => (
        responses.filter((response) => response.status).length
    ), [responses]);

    if (!personalizedInviteMode || !guest) {
        return (
            <section className="section-wrapper section-4 rsvp-section">
                <div className="rsvp-container">
                    <div className="rsvp-header-area">
                        <h2 className="rsvp-title">{rsvp.title}</h2>
                    </div>
                    <div className="rsvp-step fade-in success-step">
                        <p className="success-text public-rsvp-message">Please open your personalized invitation link to RSVP.</p>
                    </div>
                </div>
            </section>
        );
    }

    const updateStatus = (eventId: string, status: RsvpStatus) => {
        setSubmitted(false);
        setSubmitError('');
        setResponses((current) => current.map((response) => (
            response.eventId === eventId
                ? { ...response, status, updatedAt: new Date().toISOString() }
                : response
        )));
    };

    const handleSubmit = async () => {
        const updatedAt = new Date().toISOString();
        const mealValue = hasPositiveResponse ? mealPreference : '';

        if (weddingId) {
            const result = await saveSupabaseRsvpSubmission({
                weddingId,
                weddingSlug,
                guest,
                responses: responses.map((response) => ({ eventId: response.eventId, status: response.status })),
                mealPreference: mealValue,
            });

            if (result.error) {
                setSubmitError(result.error);
                return;
            }

            setResponses((current) => current.map((response) => ({
                ...response,
                mealPreference: mealValue,
                updatedAt,
            })));
            setSubmitted(true);
            return;
        }

        const storedResponses = loadStoredRsvpResponses();
        const submittedResponses: StoredRsvpResponse[] = responses.map((response) => ({
            ...response,
            weddingSlug,
            inviteCode: guest.inviteCode,
            mealPreference: mealValue,
            updatedAt,
        }));
        const submittedEventIds = new Set(submittedResponses.map((response) => response.eventId));
        const remainingResponses = storedResponses.filter((response) => !(
            response.weddingSlug === weddingSlug &&
            response.guestId === guest.id &&
            submittedEventIds.has(response.eventId)
        ));

        window.localStorage.setItem(
            mockRsvpResponsesStorageKey,
            JSON.stringify([...remainingResponses, ...submittedResponses])
        );
        setResponses((current) => current.map((response) => ({
            ...response,
            mealPreference: mealValue,
            updatedAt,
        })));
        setSubmitted(true);
    };

    return (
        <section className="section-wrapper section-4 rsvp-section">
            <div className="rsvp-container personalized-rsvp-container">
                <div className="rsvp-header-area compact-rsvp-header">
                    <div className="step-indicator">{guest.guestName}</div>
                    <h2 className="rsvp-title">{rsvp.title}</h2>
                    <p className="rsvp-helper-text">Please confirm your attendance for each event below.</p>
                    <p className="rsvp-progress-text">{answeredCount} of {events.length} events answered</p>
                    {rsvp.subtitle && <p>{rsvp.subtitle}</p>}
                </div>

                <div className="rsvp-event-list compact-rsvp-list">
                    {events.map((event) => {
                        const selectedStatus = responses.find((response) => response.eventId === event.id)?.status ?? '';
                        return (
                            <div className="rsvp-event-row fade-in" key={event.id}>
                                <div className="rsvp-event-copy">
                                    <h3>{event.eventName}</h3>
                                    <p>{event.date} - {event.startTime}</p>
                                </div>
                                <div className="rsvp-segmented-control">
                                    {(['yes', 'no', 'maybe'] as RsvpStatus[]).map((status) => (
                                        <button
                                            key={status}
                                            type="button"
                                            className={selectedStatus === status ? 'selected' : ''}
                                            onClick={() => updateStatus(event.id, status)}
                                        >
                                            {status === 'yes' && 'Yes'}
                                            {status === 'no' && 'No'}
                                            {status === 'maybe' && 'Maybe'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {hasPositiveResponse && rsvp.mealPreferenceEnabled && (
                    <div className="rsvp-meal-panel fade-in">
                        <h3>Meal Preference</h3>
                        <p>Please select one preference for your family/group.</p>
                        <div className="rsvp-meal-options">
                            {(['veg', 'nonVeg', 'jain'] as MealPreference[]).map((meal) => (
                                <button
                                    key={meal}
                                    type="button"
                                    className={`rsvp-pill-btn micro-interaction ${mealPreference === meal ? 'selected' : ''}`}
                                    onClick={() => setMealPreference(meal)}
                                >
                                    {meal === 'veg' && rsvp.mealOptions.veg}
                                    {meal === 'nonVeg' && rsvp.mealOptions.nonVeg}
                                    {meal === 'jain' && rsvp.mealOptions.jain}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <button className="rsvp-submit-btn micro-interaction" type="button" onClick={handleSubmit}>
                    Submit RSVP
                </button>

                {submitted && (
                    <div className="rsvp-step fade-in success-step">
                        {rsvp.successMessage.map((message) => (
                            <p key={message} className="success-text">{message}</p>
                        ))}
                    </div>
                )}
                {submitError && (
                    <div className="rsvp-step fade-in success-step">
                        <p className="success-text">Could not save RSVP. {submitError}</p>
                    </div>
                )}
            </div>
        </section>
    );
}
