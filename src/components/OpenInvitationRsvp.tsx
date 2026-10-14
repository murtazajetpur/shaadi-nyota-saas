import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type {
  MealPreference,
  RsvpStatus,
  SampleWeddingData,
  WeddingEvent,
} from '../data/sampleWeddingData';
import { getOptimizedAssetPath } from '../data/assetRegistry';
import {
  submitSupabaseOpenInvitationRsvp,
  type PublicOpenInvitation,
} from '../lib/supabaseWeddingData';
import { validateGuestPhone } from '../lib/guestPhone';
import './Section4.css';
import './OpenInvitationRsvp.css';

interface OpenInvitationRsvpProps {
  rsvp: SampleWeddingData['rsvp'];
  weddingSlug: string;
  events: WeddingEvent[];
  openInvitation: PublicOpenInvitation;
}

type OpenResponse = {
  eventId: string;
  status: RsvpStatus;
  attendingCount: number;
};

type SubmissionOutcome = 'attending' | 'declined' | 'unknown';
type SubmissionAction = 'idle' | 'created' | 'updated';

type StoredSubmission = {
  outcome: SubmissionOutcome;
  respondentName: string;
};

const responseStorageKey = (weddingSlug: string, inviteCode: string) =>
  `shaadi-nyota-open-invitation-response:${weddingSlug}:${inviteCode}`;

const responseMetadataStorageKey = (weddingSlug: string, inviteCode: string) =>
  `${responseStorageKey(weddingSlug, inviteCode)}:metadata`;

const readStoredSubmission = (weddingSlug: string, inviteCode: string): StoredSubmission => {
  if (typeof window === 'undefined') {
    return { outcome: 'unknown', respondentName: '' };
  }

  try {
    const storedValue = window.localStorage.getItem(
      responseMetadataStorageKey(weddingSlug, inviteCode),
    );
    if (!storedValue) return { outcome: 'unknown', respondentName: '' };

    const parsed = JSON.parse(storedValue) as Partial<StoredSubmission>;
    const outcome = parsed.outcome === 'attending' || parsed.outcome === 'declined'
      ? parsed.outcome
      : 'unknown';
    return {
      outcome,
      respondentName: typeof parsed.respondentName === 'string' ? parsed.respondentName : '',
    };
  } catch {
    return { outcome: 'unknown', respondentName: '' };
  }
};

export default function OpenInvitationRsvp({
  rsvp,
  weddingSlug,
  events,
  openInvitation,
}: OpenInvitationRsvpProps) {
  const backgroundImageSrc = getOptimizedAssetPath(rsvp.backgroundImageSrc);
  const sectionStyle = backgroundImageSrc
    ? ({ '--rsvp-background-image': 'url(' + JSON.stringify(backgroundImageSrc) + ')' } as CSSProperties)
    : undefined;
  const backgroundClassName = backgroundImageSrc ? ' has-custom-background' : '';
  const [respondentName, setRespondentName] = useState('');
  const [respondentPhone, setRespondentPhone] = useState('');
  const [partySize, setPartySize] = useState(1);
  const [responses, setResponses] = useState<OpenResponse[]>(() => (
    events.map((event) => ({ eventId: event.id, status: '', attendingCount: 0 }))
  ));
  const [mealPreference, setMealPreference] = useState<MealPreference>('');
  const [personalInviteCode, setPersonalInviteCode] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      return window.localStorage.getItem(
        responseStorageKey(weddingSlug, openInvitation.inviteCode),
      ) ?? '';
    } catch {
      return '';
    }
  });
  const [submittedResponse, setSubmittedResponse] = useState<StoredSubmission>(() => (
    readStoredSubmission(weddingSlug, openInvitation.inviteCode)
  ));
  const [submissionAction, setSubmissionAction] = useState<SubmissionAction>(() => (
    personalInviteCode ? 'created' : 'idle'
  ));
  const [submitError, setSubmitError] = useState('');
  const [submitErrorDetail, setSubmitErrorDetail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const successRef = useRef<HTMLDivElement>(null);
  const shouldScrollToSuccessRef = useRef(false);

  useEffect(() => {
    if ((submissionAction === 'idle' && !personalInviteCode) || !shouldScrollToSuccessRef.current) return;
    shouldScrollToSuccessRef.current = false;
    const frameId = window.requestAnimationFrame(() => {
      successRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [personalInviteCode, submissionAction]);

  const answeredCount = useMemo(
    () => responses.filter((response) => Boolean(response.status)).length,
    [responses],
  );
  const hasPositiveResponse = useMemo(
    () => responses.some((response) => response.status === 'yes' || response.status === 'maybe'),
    [responses],
  );
  const personalInviteUrl = personalInviteCode
    ? `/${weddingSlug}/invite/${personalInviteCode}`
    : '';
  const effectivePartySize = openInvitation.showInviteeCount ? partySize : 1;

  const updateStatus = (eventId: string, status: Exclude<RsvpStatus, ''>) => {
    setSubmitError('');
    setSubmitErrorDetail('');
    setResponses((current) => current.map((response) => (
      response.eventId === eventId
        ? {
          ...response,
          status,
          attendingCount: status === 'yes' ? effectivePartySize : 0,
        }
        : response
    )));
  };

  const updatePartySize = (nextSize: number) => {
    setSubmitError('');
    setSubmitErrorDetail('');
    setPartySize(nextSize);
    setResponses((current) => current.map((response) => ({
      ...response,
      attendingCount: response.status === 'yes'
        ? Math.max(1, Math.min(response.attendingCount || nextSize, nextSize))
        : 0,
    })));
  };

  const updateAttendingCount = (eventId: string, nextCount: number) => {
    setSubmitError('');
    setSubmitErrorDetail('');
    setResponses((current) => current.map((response) => (
      response.eventId === eventId
        ? {
          ...response,
          status: nextCount === 0 ? 'no' : 'yes',
          attendingCount: Math.max(0, Math.min(nextCount, partySize)),
        }
        : response
    )));
  };

  const handleSubmit = async () => {
    const name = respondentName.trim();
    if (!name) {
      setSubmitError('Please enter your name.');
      return;
    }

    if (answeredCount !== events.length) {
      setSubmitError('Please answer every event before submitting.');
      return;
    }

    if (hasPositiveResponse || respondentPhone.trim()) {
      const phone = validateGuestPhone(respondentPhone);
      if (phone.error) {
        setSubmitError(phone.error);
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitErrorDetail('');
    const result = await submitSupabaseOpenInvitationRsvp({
      weddingSlug,
      inviteCode: openInvitation.inviteCode,
      respondentName: name,
      respondentPhone,
      partySize: effectivePartySize,
      responses: responses.map((response) => ({
        eventId: response.eventId,
        status: response.status as Exclude<RsvpStatus, ''>,
        attendingCount: response.status === 'yes'
          ? openInvitation.showInviteeCount
            ? response.attendingCount || effectivePartySize
            : 1
          : 0,
      })),
      mealPreference: hasPositiveResponse && openInvitation.mealPreferenceEnabled
        ? mealPreference
        : '',
    });
    setIsSubmitting(false);

    if (result.error) {
      setSubmitError(result.error);
      setSubmitErrorDetail(result.detail);
      return;
    }

    shouldScrollToSuccessRef.current = true;
    const nextSubmittedResponse: StoredSubmission = {
      outcome: hasPositiveResponse ? 'attending' : 'declined',
      respondentName: name,
    };
    setSubmittedResponse(nextSubmittedResponse);
    setSubmissionAction(result.action);
    if (result.inviteCode) setPersonalInviteCode(result.inviteCode);
    try {
      if (result.inviteCode) {
        window.localStorage.setItem(
          responseStorageKey(weddingSlug, openInvitation.inviteCode),
          result.inviteCode,
        );
      }
      window.localStorage.setItem(
        responseMetadataStorageKey(weddingSlug, openInvitation.inviteCode),
        JSON.stringify(nextSubmittedResponse),
      );
    } catch {
      // The personal link remains available on this screen if local storage is unavailable.
    }
  };

  const confirmationName = submittedResponse.respondentName || respondentName.trim();
  const isDeclinedSubmission = submittedResponse.outcome === 'declined';
  const isAttendingSubmission = submittedResponse.outcome === 'attending';
  const isUpdatedSubmission = submissionAction === 'updated';

  return (
    <section
      className={`section-wrapper section-4 rsvp-section personalized-rsvp-section open-invitation-rsvp${backgroundClassName}`}
      style={sectionStyle}
    >
      <div className="rsvp-container personalized-rsvp-container open-invitation-rsvp-container">
        {personalInviteCode || isUpdatedSubmission ? (
          <div ref={successRef} className="open-invitation-success" role="status" aria-live="polite">
            <span>{isUpdatedSubmission ? 'RSVP updated' : isDeclinedSubmission ? 'Response received' : 'RSVP received'}</span>
            <h2>{confirmationName ? `Thank you, ${confirmationName}.` : 'Your RSVP has been saved.'}</h2>
            <p>
              {isUpdatedSubmission
                ? isDeclinedSubmission
                  ? "We're sorry you won't be able to join us. Your updated response has been shared with the couple."
                  : 'Your latest event responses have been saved and shared with the couple.'
                : isDeclinedSubmission
                  ? "We're sorry you won't be able to join us. Your response has been shared with the couple."
                  : isAttendingSubmission
                    ? 'Your personal invitation is ready. Keep this link to review or update your event responses later.'
                    : 'Your RSVP is already saved. Use your personal link to review or update your event responses.'}
            </p>
            {personalInviteCode && (
              <a href={personalInviteUrl}>
                {isDeclinedSubmission
                  ? 'Change your response'
                  : isAttendingSubmission
                    ? 'Open your personal invitation'
                    : 'Review your response'}
              </a>
            )}
          </div>
        ) : (
          <>
            <div className="rsvp-header-area compact-rsvp-header">
              <div className="step-indicator">{openInvitation.label}</div>
              <h2 className="rsvp-title">{rsvp.title}</h2>
              <p className="rsvp-helper-text">Introduce yourself and confirm attendance for each celebration.</p>
              <p className="rsvp-progress-text">{answeredCount} of {events.length} events answered</p>
            </div>

            <div className="open-invitation-identity">
              <label>
                <span>Your name</span>
                <input
                  autoComplete="name"
                  maxLength={120}
                  value={respondentName}
                  onChange={(event) => {
                    setSubmitError('');
                    setSubmitErrorDetail('');
                    setRespondentName(event.target.value);
                  }}
                  placeholder="Enter your full name"
                />
              </label>
              <label>
                <span>Mobile number{hasPositiveResponse ? '' : ' (optional)'}</span>
                <input
                  autoComplete="tel"
                  inputMode="tel"
                  required={hasPositiveResponse}
                  aria-required={hasPositiveResponse}
                  value={respondentPhone}
                  onChange={(event) => {
                    setSubmitError('');
                    setSubmitErrorDetail('');
                    setRespondentPhone(event.target.value);
                  }}
                  placeholder="+91 98765 43210"
                />
                <small>{hasPositiveResponse
                  ? 'Required when anyone answers Yes or Maybe.'
                  : 'Optional when your family is declining every event.'}</small>
              </label>
              {openInvitation.showInviteeCount && (
                <label>
                  <span>Number of people in your family</span>
                  <select value={partySize} onChange={(event) => updatePartySize(Number(event.target.value))}>
                    {Array.from({ length: openInvitation.maxPartySize }, (_, index) => index + 1)
                      .map((count) => <option key={count} value={count}>{count}</option>)}
                  </select>
                </label>
              )}
            </div>

            <div className="rsvp-event-list compact-rsvp-list">
              {events.map((event) => {
                const response = responses.find((item) => item.eventId === event.id);
                const selectedStatus = response?.status ?? '';
                const attendingCount = Math.max(0, Math.min(response?.attendingCount ?? 0, partySize));
                return (
                  <div className="rsvp-event-row fade-in" key={event.id}>
                    <div className="rsvp-event-copy">
                      <h3>{event.eventName}</h3>
                      <p>{event.date} - {event.startTime}</p>
                    </div>
                    <div className="rsvp-segmented-control">
                      {(['yes', 'no', 'maybe'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          className={selectedStatus === status ? 'selected' : ''}
                          onClick={() => updateStatus(event.id, status)}
                        >
                          {status === 'yes' ? 'Yes' : status === 'no' ? 'No' : 'Maybe'}
                        </button>
                      ))}
                    </div>
                    {openInvitation.showInviteeCount && rsvp.attendingCountEnabled && selectedStatus === 'yes' && (
                      <label className="rsvp-attending-count-field">
                        <span>How many people will attend?</span>
                        <select
                          value={attendingCount || partySize}
                          onChange={(event) => updateAttendingCount(
                            response?.eventId ?? '',
                            Number(event.target.value),
                          )}
                        >
                          {Array.from({ length: partySize + 1 }, (_, count) => (
                            <option key={count} value={count}>{count}</option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            {hasPositiveResponse && openInvitation.mealPreferenceEnabled && (
              <div className="rsvp-meal-panel fade-in">
                <h3>Meal Preference</h3>
                <p>Select one preference for your group.</p>
                <div className="rsvp-meal-options">
                  {(['veg', 'nonVeg', 'jain'] as const).map((meal) => (
                    <button
                      key={meal}
                      type="button"
                      className={`rsvp-pill-btn micro-interaction ${mealPreference === meal ? 'selected' : ''}`}
                      onClick={() => setMealPreference(meal)}
                    >
                      {rsvp.mealOptions[meal]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              className="rsvp-submit-btn micro-interaction"
              type="button"
              disabled={isSubmitting}
              onClick={() => void handleSubmit()}
            >
              {isSubmitting ? 'Submitting...' : 'Submit RSVP'}
            </button>
            {submitError && <p className="open-invitation-submit-error" role="alert">{submitError}</p>}
            {import.meta.env.DEV && submitErrorDetail && (
              <details className="open-invitation-submit-detail">
                <summary>Technical detail</summary>
                <p>{submitErrorDetail}</p>
              </details>
            )}
          </>
        )}
      </div>
    </section>
  );
}
