import { Fragment, useEffect, useMemo, useState } from 'react';
import './Dashboard.css';
import InviteExperience from './InviteExperience';
import {
    defaultDashboardWeddingSlug,
    mockDashboardDraftStorageKey,
    mockRsvpResponsesStorageKey,
    getWeddingBySlug,
    hasRsvpAccess,
    sampleWeddingData,
    type SampleWeddingData,
    type StoredRsvpResponse,
    type WeddingEvent,
    type WeddingGuest,
} from '../data/sampleWeddingData';

type DashboardTab = 'overview' | 'couple' | 'events' | 'guests' | 'rsvp' | 'theme' | 'preview';
type PreviewMode = 'public' | 'rsvp';

const dashboardTabs: Array<{ id: DashboardTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'couple', label: 'Couple' },
    { id: 'events', label: 'Events' },
    { id: 'guests', label: 'Guests' },
    { id: 'rsvp', label: 'RSVP Dashboard' },
    { id: 'theme', label: 'Theme' },
    { id: 'preview', label: 'Preview' },
];

const themeKeyOptions = ['palace-door-opening'];
const dashboardBaseWedding = getWeddingBySlug(defaultDashboardWeddingSlug) ?? sampleWeddingData;

const cloneWedding = (wedding: SampleWeddingData): SampleWeddingData => {
    return JSON.parse(JSON.stringify(wedding)) as SampleWeddingData;
};

const normalizeWedding = (wedding: SampleWeddingData): SampleWeddingData => {
    const defaults = cloneWedding(dashboardBaseWedding);

    return {
        ...defaults,
        ...wedding,
        wedding: {
            ...defaults.wedding,
            ...wedding.wedding,
            status: wedding.wedding.status ?? defaults.wedding.status,
        },
        hero: {
            ...defaults.hero,
            ...wedding.hero,
        },
        music: {
            ...defaults.music,
            ...wedding.music,
        },
        couple: {
            ...defaults.couple,
            ...wedding.couple,
        },
        rsvp: {
            ...defaults.rsvp,
            ...wedding.rsvp,
            responseOptions: {
                ...defaults.rsvp.responseOptions,
                ...wedding.rsvp.responseOptions,
            },
            mealOptions: {
                ...defaults.rsvp.mealOptions,
                ...wedding.rsvp.mealOptions,
            },
            guests: wedding.rsvp.guests ?? defaults.rsvp.guests,
        },
        closing: {
            ...defaults.closing,
            ...wedding.closing,
        },
        events: wedding.events?.length ? wedding.events : defaults.events,
    };
};

const loadInitialWedding = () => {
    const savedDraft = window.localStorage.getItem(mockDashboardDraftStorageKey);
    if (!savedDraft) return cloneWedding(dashboardBaseWedding);

    try {
        const draft = normalizeWedding(JSON.parse(savedDraft) as SampleWeddingData);
        return hasRsvpAccess(draft) && draft.wedding.slug === defaultDashboardWeddingSlug
            ? draft
            : cloneWedding(dashboardBaseWedding);
    } catch {
        window.localStorage.removeItem(mockDashboardDraftStorageKey);
        return cloneWedding(dashboardBaseWedding);
    }
};

const loadStoredRsvpResponses = () => {
    try {
        return JSON.parse(window.localStorage.getItem(mockRsvpResponsesStorageKey) ?? '[]') as StoredRsvpResponse[];
    } catch {
        window.localStorage.removeItem(mockRsvpResponsesStorageKey);
        return [];
    }
};

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
    const [weddingData, setWeddingData] = useState<SampleWeddingData>(loadInitialWedding);
    const [previewMode, setPreviewMode] = useState<PreviewMode>('public');
    const [guestSearchQuery, setGuestSearchQuery] = useState('');
    const [expandedGuestId, setExpandedGuestId] = useState<string | null>(null);
    const [rsvpResponses, setRsvpResponses] = useState<StoredRsvpResponse[]>(loadStoredRsvpResponses);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');

    useEffect(() => {
        document.title = 'Mock Dashboard | Shaadi Nyota';
        const previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'auto';

        return () => {
            document.body.style.overflow = previousBodyOverflow;
        };
    }, []);

    useEffect(() => {
        if (activeTab === 'rsvp') {
            setRsvpResponses(loadStoredRsvpResponses());
        }
    }, [activeTab]);

    const validation = useMemo(() => {
        return {
            slug: weddingData.wedding.slug.trim() ? '' : 'Slug is required.',
            brideName: weddingData.couple.brideName.trim() ? '' : 'Bride name is required.',
            groomName: weddingData.couple.groomName.trim() ? '' : 'Groom name is required.',
            events: weddingData.events.map((event) => ({
                eventName: event.eventName.trim() ? '' : 'Event name is required.',
                date: event.date.trim() ? '' : 'Date is required.',
                startTime: event.startTime.trim() ? '' : 'Start time is required.',
                venueName: event.venueName.trim() ? '' : 'Venue name is required.',
            })),
            guests: weddingData.rsvp.guests.map((guest) => ({
                guestName: guest.guestName.trim() ? '' : 'Guest name is required.',
                phone: guest.phone.trim() ? '' : 'Phone is required.',
                invitedCount: guest.invitedCount >= 1 ? '' : 'Invited count must be at least 1.',
                invitedEventIds: guest.invitedEventIds.length ? '' : 'Select at least one invited event.',
            })),
        };
    }, [weddingData]);

    const validationCount = useMemo(() => {
        const coupleAndSlugWarnings = [validation.slug, validation.brideName, validation.groomName].filter(Boolean).length;
        const eventWarnings = validation.events.reduce((count, event) => (
            count + Object.values(event).filter(Boolean).length
        ), 0);
        const guestWarnings = validation.guests.reduce((count, guest) => (
            count + Object.values(guest).filter(Boolean).length
        ), 0);
        return coupleAndSlugWarnings + eventWarnings + guestWarnings;
    }, [validation]);

    const previewData = useMemo(() => {
        const previewWedding = cloneWedding(weddingData);
        previewWedding.wedding.packageType = previewMode === 'rsvp' ? 'rsvp' : 'basic';
        return previewWedding;
    }, [previewMode, weddingData]);

    const previewKey = useMemo(() => JSON.stringify(previewData), [previewData]);
    const guestSummary = useMemo(() => ({
        totalGuests: weddingData.rsvp.guests.length,
        totalInvitedCount: weddingData.rsvp.guests.reduce((total, guest) => total + guest.invitedCount, 0),
        noEventGuests: weddingData.rsvp.guests.filter((guest) => guest.invitedEventIds.length === 0).length,
        missingPhoneGuests: weddingData.rsvp.guests.filter((guest) => !guest.phone.trim()).length,
    }), [weddingData.rsvp.guests]);
    const filteredGuestRows = useMemo(() => {
        const query = guestSearchQuery.trim().toLowerCase();
        return weddingData.rsvp.guests
            .map((guest, guestIndex) => ({ guest, guestIndex }))
            .filter(({ guest }) => {
                if (!query) return true;
                return [guest.guestName, guest.phone, guest.category].some((value) => (
                    value.toLowerCase().includes(query)
                ));
            });
    }, [guestSearchQuery, weddingData.rsvp.guests]);
    const rsvpAnalytics = useMemo(() => {
        const relevantResponses = rsvpResponses.filter((response) => response.weddingSlug === weddingData.wedding.slug);
        const getResponse = (guest: WeddingGuest, eventId: string) => relevantResponses.find((response) => (
            response.guestId === guest.id && response.eventId === eventId
        ));
        const countStatusesForGuests = (guests: WeddingGuest[]) => {
            const counts = { yes: 0, no: 0, maybe: 0, pending: 0 };
            guests.forEach((guest) => {
                guest.invitedEventIds.forEach((eventId) => {
                    const status = getResponse(guest, eventId)?.status ?? '';
                    if (status === 'yes') counts.yes += 1;
                    else if (status === 'no') counts.no += 1;
                    else if (status === 'maybe') counts.maybe += 1;
                    else counts.pending += 1;
                });
            });
            return counts;
        };
        const totals = countStatusesForGuests(weddingData.rsvp.guests);
        const eventSummaries = weddingData.events.map((event) => {
            const invitedGuests = weddingData.rsvp.guests.filter((guest) => guest.invitedEventIds.includes(event.id));
            return {
                event,
                invitedGuests,
                counts: countStatusesForGuests(invitedGuests.map((guest) => ({
                    ...guest,
                    invitedEventIds: [event.id],
                }))),
            };
        });
        const guestMealPreferences = weddingData.rsvp.guests.map((guest) => (
            relevantResponses.find((response) => response.guestId === guest.id && response.mealPreference)?.mealPreference ?? ''
        ));
        const mealSummary = {
            veg: guestMealPreferences.filter((meal) => meal === 'veg').length,
            nonVeg: guestMealPreferences.filter((meal) => meal === 'nonVeg').length,
            jain: guestMealPreferences.filter((meal) => meal === 'jain').length,
            none: guestMealPreferences.filter((meal) => !meal).length,
        };
        const guestSummaries = weddingData.rsvp.guests.map((guest) => {
            const counts = countStatusesForGuests([guest]);
            const mealPreference = relevantResponses.find((response) => response.guestId === guest.id && response.mealPreference)?.mealPreference ?? '';
            const lastUpdated = relevantResponses
                .filter((response) => response.guestId === guest.id)
                .map((response) => response.updatedAt)
                .sort()
                .at(-1) ?? '';
            return { guest, counts, mealPreference, lastUpdated };
        });
        const categorySummaries = Array.from(new Set(weddingData.rsvp.guests.map((guest) => guest.category || 'Uncategorized'))).map((category) => {
            const guests = weddingData.rsvp.guests.filter((guest) => (guest.category || 'Uncategorized') === category);
            return {
                category,
                guestCount: guests.length,
                invitedCount: guests.reduce((total, guest) => total + guest.invitedCount, 0),
                counts: countStatusesForGuests(guests),
            };
        });

        return {
            totals,
            eventSummaries,
            mealSummary,
            guestSummaries,
            categorySummaries,
        };
    }, [rsvpResponses, weddingData]);

    const updateWeddingData = (updater: (current: SampleWeddingData) => SampleWeddingData) => {
        setWeddingData(updater);
        setHasUnsavedChanges(true);
        setSaveStatus('');
    };

    const handleSaveDraft = () => {
        window.localStorage.setItem(mockDashboardDraftStorageKey, JSON.stringify(weddingData));
        setHasUnsavedChanges(false);
        setSaveStatus('Saved');
    };

    const handleResetDraft = () => {
        window.localStorage.removeItem(mockDashboardDraftStorageKey);
        setWeddingData(cloneWedding(dashboardBaseWedding));
        setPreviewMode('public');
        setHasUnsavedChanges(false);
        setSaveStatus('');
    };

    const clearMockRsvpResponses = () => {
        window.localStorage.removeItem(mockRsvpResponsesStorageKey);
        setRsvpResponses([]);
    };

    const updateCouple = <Key extends keyof SampleWeddingData['couple']>(
        key: Key,
        value: SampleWeddingData['couple'][Key]
    ) => {
        updateWeddingData((current) => ({
            ...current,
            couple: {
                ...current.couple,
                [key]: value,
            },
            closing: key === 'displayName'
                ? { ...current.closing, coupleDisplayName: String(value) }
                : current.closing,
            wedding: key === 'displayName'
                ? { ...current.wedding, pageTitle: `${String(value)} | Shaadi Nyota` }
                : current.wedding,
        }));
    };

    const updateThemeKey = (themeKey: string) => {
        updateWeddingData((current) => ({
            ...current,
            wedding: {
                ...current.wedding,
                themeKey,
            },
        }));
    };

    const updateEvent = <Key extends keyof WeddingEvent>(
        index: number,
        key: Key,
        value: WeddingEvent[Key]
    ) => {
        updateWeddingData((current) => ({
            ...current,
            events: current.events.map((event, eventIndex) => (
                eventIndex === index ? { ...event, [key]: value } : event
            )),
        }));
    };

    const addEvent = () => {
        updateWeddingData((current) => {
            const mediaSource = current.events[0];
            const newEvent: WeddingEvent = {
                id: `event-${Date.now()}`,
                eventName: 'New Event',
                date: '1st January 2027',
                startTime: '7:00 PM',
                venueName: '',
                city: '',
                mapsUrl: '',
                dressCode: '',
                foregroundImageSrc: mediaSource?.foregroundImageSrc ?? '/assets/reception.png',
                backgroundImageSrc: mediaSource?.backgroundImageSrc ?? '/assets/reception-bg.png',
                calendarTitle: `${current.couple.displayName} New Event`,
                calendarDescription: `New event for ${current.couple.displayName}.`,
            };

            return {
                ...current,
                events: [...current.events, newEvent],
            };
        });
    };

    const deleteEvent = (index: number) => {
        updateWeddingData((current) => ({
            ...current,
            events: current.events.filter((_, eventIndex) => eventIndex !== index),
        }));
    };

    const updateGuest = <Key extends keyof WeddingGuest>(
        index: number,
        key: Key,
        value: WeddingGuest[Key]
    ) => {
        updateWeddingData((current) => ({
            ...current,
            rsvp: {
                ...current.rsvp,
                guests: current.rsvp.guests.map((guest, guestIndex) => (
                    guestIndex === index ? { ...guest, [key]: value } : guest
                )),
            },
        }));
    };

    const toggleGuestEvent = (guestIndex: number, eventId: string) => {
        updateWeddingData((current) => ({
            ...current,
            rsvp: {
                ...current.rsvp,
                guests: current.rsvp.guests.map((guest, index) => {
                    if (index !== guestIndex) return guest;
                    const invitedEventIds = guest.invitedEventIds.includes(eventId)
                        ? guest.invitedEventIds.filter((id) => id !== eventId)
                        : [...guest.invitedEventIds, eventId];
                    return { ...guest, invitedEventIds };
                }),
            },
        }));
    };

    const addGuest = () => {
        updateWeddingData((current) => {
            const newGuest: WeddingGuest = {
                id: `guest-${Date.now()}`,
                guestName: '',
                phone: '',
                invitedCount: 1,
                category: '',
                inviteCode: Math.random().toString(36).slice(2, 8),
                invitedEventIds: [],
            };

            return {
                ...current,
                rsvp: {
                    ...current.rsvp,
                    guests: [...current.rsvp.guests, newGuest],
                },
            };
        });
    };

    const deleteGuest = (index: number) => {
        updateWeddingData((current) => ({
            ...current,
            rsvp: {
                ...current.rsvp,
                guests: current.rsvp.guests.filter((_, guestIndex) => guestIndex !== index),
            },
        }));
    };

    const getGuestInviteLink = (guest: WeddingGuest) => {
        return `/${weddingData.wedding.slug}/invite/${guest.inviteCode}`;
    };

    const copyGuestInviteLink = async (guest: WeddingGuest) => {
        const link = `${window.location.origin}${getGuestInviteLink(guest)}`;
        await window.navigator.clipboard?.writeText(link);
    };

    const updateHero = <Key extends keyof SampleWeddingData['hero']>(
        key: Key,
        value: SampleWeddingData['hero'][Key]
    ) => {
        updateWeddingData((current) => ({
            ...current,
            hero: {
                ...current.hero,
                [key]: value,
            },
        }));
    };

    const updateMusic = <Key extends keyof SampleWeddingData['music']>(
        key: Key,
        value: SampleWeddingData['music'][Key]
    ) => {
        updateWeddingData((current) => ({
            ...current,
            music: {
                ...current.music,
                [key]: value,
            },
        }));
    };

    return (
        <main className="dashboard-page">
            <aside className="dashboard-sidebar">
                <div>
                    <p className="dashboard-eyebrow">Shaadi Nyota</p>
                    <h1>Couple Dashboard</h1>
                </div>
                <div className="dashboard-draft-bar">
                    <span className={hasUnsavedChanges ? 'unsaved' : 'saved'}>
                        {hasUnsavedChanges ? 'Unsaved changes' : saveStatus || 'Draft ready'}
                    </span>
                    <button type="button" onClick={handleSaveDraft}>Save Draft</button>
                    <button type="button" onClick={handleResetDraft}>Reset Draft</button>
                </div>
                <nav className="dashboard-tabs" aria-label="Dashboard sections">
                    {dashboardTabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={activeTab === tab.id ? 'active' : ''}
                            onClick={() => setActiveTab(tab.id)}
                            type="button"
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </aside>

            <section className="dashboard-content">
                {activeTab === 'overview' && (
                    <div className="dashboard-panel">
                        <div className="dashboard-panel-header">
                            <p className="dashboard-eyebrow">Overview</p>
                            <h2>{weddingData.couple.displayName}</h2>
                        </div>
                        <div className="overview-grid">
                            <ReadOnlyBadgeCard
                                label="Plan"
                                value={weddingData.wedding.packageType}
                                helperText="Plan changes will be handled from checkout/admin in a later phase."
                                actionLabel="Request upgrade"
                            />
                            <ReadOnlyBadgeCard
                                label="Status"
                                value={weddingData.wedding.status}
                                helperText="Payment and publishing status will be managed by admin/payment flow later."
                            />
                            <InfoBlock label="Slug" value={weddingData.wedding.slug || 'Missing slug'} />
                            <InfoBlock label="Theme" value={weddingData.wedding.themeKey} />
                        </div>
                        {validationCount > 0 && (
                            <p className="validation-summary">{validationCount} validation warning{validationCount === 1 ? '' : 's'} need attention.</p>
                        )}
                        <p className="dashboard-note">
                            This is a mock dashboard. Changes are stored only in local React state and are not saved to a database yet.
                        </p>
                    </div>
                )}

                {activeTab === 'couple' && (
                    <div className="dashboard-panel">
                        <div className="dashboard-panel-header">
                            <p className="dashboard-eyebrow">Couple</p>
                            <h2>Edit couple details</h2>
                        </div>
                        <label className="dashboard-check">
                            <input
                                type="checkbox"
                                checked={weddingData.couple.enabled}
                                onChange={(event) => updateCouple('enabled', event.target.checked)}
                            />
                            Show couple section
                        </label>
                        <div className="form-grid">
                            <TextField label="Bride name" value={weddingData.couple.brideName} error={validation.brideName} onChange={(value) => updateCouple('brideName', value)} />
                            <TextField label="Groom name" value={weddingData.couple.groomName} error={validation.groomName} onChange={(value) => updateCouple('groomName', value)} />
                            <TextField label="Display name" value={weddingData.couple.displayName} onChange={(value) => updateCouple('displayName', value)} />
                            <TextField label="Intro line" value={weddingData.couple.introLine} onChange={(value) => updateCouple('introLine', value)} />
                            <TextField label="Blessing line" value={weddingData.couple.blessingLine} onChange={(value) => updateCouple('blessingLine', value)} />
                        </div>
                    </div>
                )}

                {activeTab === 'events' && (
                    <div className="dashboard-panel">
                        <div className="dashboard-panel-header dashboard-panel-header-row">
                            <div>
                                <p className="dashboard-eyebrow">Events</p>
                                <h2>Wedding events</h2>
                            </div>
                            <button className="dashboard-primary-btn" type="button" onClick={addEvent}>Add event</button>
                        </div>
                        <div className="event-editor-list">
                            {weddingData.events.map((event, index) => (
                                <div className="event-editor" key={event.id}>
                                    <div className="event-editor-header">
                                        <h3>{event.eventName || `Event ${index + 1}`}</h3>
                                        <button type="button" onClick={() => deleteEvent(index)}>Delete</button>
                                    </div>
                                    <div className="form-grid">
                                        <TextField label="Event name" value={event.eventName} error={validation.events[index]?.eventName} onChange={(value) => updateEvent(index, 'eventName', value)} />
                                        <TextField label="Date" value={event.date} error={validation.events[index]?.date} onChange={(value) => updateEvent(index, 'date', value)} />
                                        <TextField label="Start time" value={event.startTime} error={validation.events[index]?.startTime} onChange={(value) => updateEvent(index, 'startTime', value)} />
                                        <TextField label="Venue name" value={event.venueName} error={validation.events[index]?.venueName} onChange={(value) => updateEvent(index, 'venueName', value)} />
                                        <TextField label="City" value={event.city} onChange={(value) => updateEvent(index, 'city', value)} />
                                        <TextField label="Maps URL" value={event.mapsUrl} onChange={(value) => updateEvent(index, 'mapsUrl', value)} />
                                        <TextField label="Dress code" value={event.dressCode} onChange={(value) => updateEvent(index, 'dressCode', value)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'guests' && (
                    <div className="dashboard-panel">
                        <div className="dashboard-panel-header dashboard-panel-header-row">
                            <div>
                                <p className="dashboard-eyebrow">Guests</p>
                                <h2>Guest invite links</h2>
                            </div>
                            <button className="dashboard-primary-btn" type="button" onClick={addGuest}>Add guest</button>
                        </div>
                        <div className="guest-summary-grid">
                            <InfoBlock label="Families" value={String(guestSummary.totalGuests)} />
                            <InfoBlock label="Invited count" value={String(guestSummary.totalInvitedCount)} />
                            <InfoBlock label="No events" value={String(guestSummary.noEventGuests)} />
                            <InfoBlock label="Missing phone" value={String(guestSummary.missingPhoneGuests)} />
                        </div>
                        <label className="guest-search">
                            <span>Search guests</span>
                            <input
                                value={guestSearchQuery}
                                onChange={(event) => setGuestSearchQuery(event.target.value)}
                                placeholder="Search by guest, phone, or category"
                            />
                        </label>
                        <div className="guest-table-wrap">
                            <table className="guest-table">
                                <thead>
                                    <tr>
                                        <th>Guest / Family Name</th>
                                        <th>Phone</th>
                                        <th>Invited Count</th>
                                        <th>Category</th>
                                        <th>Invited Events</th>
                                        <th>Invite Link</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredGuestRows.map(({ guest, guestIndex }) => (
                                        <Fragment key={guest.id}>
                                            <tr>
                                                <td>
                                                    <input
                                                        className={validation.guests[guestIndex]?.guestName ? 'cell-error' : ''}
                                                        value={guest.guestName}
                                                        onChange={(event) => updateGuest(guestIndex, 'guestName', event.target.value)}
                                                        placeholder="Guest / family"
                                                    />
                                                    {validation.guests[guestIndex]?.guestName && <em>{validation.guests[guestIndex]?.guestName}</em>}
                                                </td>
                                                <td>
                                                    <input
                                                        className={validation.guests[guestIndex]?.phone ? 'cell-error' : ''}
                                                        value={guest.phone}
                                                        onChange={(event) => updateGuest(guestIndex, 'phone', event.target.value)}
                                                        placeholder="+91..."
                                                    />
                                                    {validation.guests[guestIndex]?.phone && <em>{validation.guests[guestIndex]?.phone}</em>}
                                                </td>
                                                <td>
                                                    <input
                                                        className={validation.guests[guestIndex]?.invitedCount ? 'cell-error' : ''}
                                                        type="number"
                                                        min="1"
                                                        value={guest.invitedCount}
                                                        onChange={(event) => updateGuest(guestIndex, 'invitedCount', Number(event.target.value))}
                                                    />
                                                    {validation.guests[guestIndex]?.invitedCount && <em>{validation.guests[guestIndex]?.invitedCount}</em>}
                                                </td>
                                                <td>
                                                    <input
                                                        value={guest.category}
                                                        onChange={(event) => updateGuest(guestIndex, 'category', event.target.value)}
                                                        placeholder="Category"
                                                    />
                                                </td>
                                                <td>
                                                    <button
                                                        className="guest-events-toggle"
                                                        type="button"
                                                        onClick={() => setExpandedGuestId(expandedGuestId === guest.id ? null : guest.id)}
                                                    >
                                                        {guest.invitedEventIds.length} selected
                                                    </button>
                                                    {validation.guests[guestIndex]?.invitedEventIds && <em>{validation.guests[guestIndex]?.invitedEventIds}</em>}
                                                </td>
                                                <td>
                                                    <code>{getGuestInviteLink(guest)}</code>
                                                    <div className="guest-link-actions compact">
                                                        <button type="button" onClick={() => copyGuestInviteLink(guest)}>Copy</button>
                                                        <a href={getGuestInviteLink(guest)} target="_blank" rel="noreferrer">Preview</a>
                                                    </div>
                                                </td>
                                                <td>
                                                    <button className="delete-row-btn" type="button" onClick={() => deleteGuest(guestIndex)}>Delete</button>
                                                </td>
                                            </tr>
                                            {expandedGuestId === guest.id && (
                                                <tr className="guest-events-row" key={`${guest.id}-events`}>
                                                    <td colSpan={7}>
                                                        <div className="guest-event-options compact">
                                                            {weddingData.events.map((event) => (
                                                                <label key={event.id}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={guest.invitedEventIds.includes(event.id)}
                                                                        onChange={() => toggleGuestEvent(guestIndex, event.id)}
                                                                    />
                                                                    {event.eventName}
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                            {filteredGuestRows.length === 0 && (
                                <p className="dashboard-note">No guests match this search.</p>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'rsvp' && (
                    <div className="dashboard-panel rsvp-dashboard-panel">
                        <div className="dashboard-panel-header dashboard-panel-header-row">
                            <div>
                                <p className="dashboard-eyebrow">RSVP Dashboard</p>
                                <h2>Mock RSVP analytics</h2>
                            </div>
                            <button className="dashboard-primary-btn secondary" type="button" onClick={clearMockRsvpResponses}>
                                Clear Mock RSVP Responses
                            </button>
                        </div>
                        <div className="guest-summary-grid rsvp-summary-grid">
                            <InfoBlock label="Families" value={String(weddingData.rsvp.guests.length)} />
                            <InfoBlock label="Invited count" value={String(weddingData.rsvp.guests.reduce((total, guest) => total + guest.invitedCount, 0))} />
                            <InfoBlock label="RSVP Yes" value={String(rsvpAnalytics.totals.yes)} />
                            <InfoBlock label="RSVP No" value={String(rsvpAnalytics.totals.no)} />
                            <InfoBlock label="Maybe" value={String(rsvpAnalytics.totals.maybe)} />
                            <InfoBlock label="Pending" value={String(rsvpAnalytics.totals.pending)} />
                        </div>

                        <RsvpTable title="Event-wise RSVP summary" headers={['Event', 'Invited Families', 'Yes', 'No', 'Maybe', 'Pending']}>
                            {rsvpAnalytics.eventSummaries.map(({ event, invitedGuests, counts }) => (
                                <tr key={event.id}>
                                    <td>{event.eventName}</td>
                                    <td>{invitedGuests.length}</td>
                                    <td>{counts.yes}</td>
                                    <td>{counts.no}</td>
                                    <td>{counts.maybe}</td>
                                    <td>{counts.pending}</td>
                                </tr>
                            ))}
                        </RsvpTable>

                        <RsvpTable title="Meal preference summary" headers={['Veg', 'Non-veg', 'Jain', 'Not selected']}>
                            <tr>
                                <td>{rsvpAnalytics.mealSummary.veg}</td>
                                <td>{rsvpAnalytics.mealSummary.nonVeg}</td>
                                <td>{rsvpAnalytics.mealSummary.jain}</td>
                                <td>{rsvpAnalytics.mealSummary.none}</td>
                            </tr>
                        </RsvpTable>

                        <RsvpTable title="Guest-wise RSVP table" headers={['Guest / Family', 'Phone', 'Category', 'Invited Count', 'Invited Events', 'RSVP Status Summary', 'Meal Preference', 'Last Updated']}>
                            {rsvpAnalytics.guestSummaries.map(({ guest, counts, mealPreference, lastUpdated }) => (
                                <tr key={guest.id}>
                                    <td>{guest.guestName || 'Missing name'}</td>
                                    <td>{guest.phone || 'Missing phone'}</td>
                                    <td>{guest.category || 'Uncategorized'}</td>
                                    <td>{guest.invitedCount}</td>
                                    <td>{guest.invitedEventIds.length}</td>
                                    <td>Yes {counts.yes} · No {counts.no} · Maybe {counts.maybe} · Pending {counts.pending}</td>
                                    <td>{mealPreference || 'Not selected'}</td>
                                    <td>{lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Not submitted'}</td>
                                </tr>
                            ))}
                        </RsvpTable>

                        <RsvpTable title="Category-wise summary" headers={['Category', 'Families', 'Invited Count', 'Yes', 'No', 'Maybe', 'Pending']}>
                            {rsvpAnalytics.categorySummaries.map(({ category, guestCount, invitedCount, counts }) => (
                                <tr key={category}>
                                    <td>{category}</td>
                                    <td>{guestCount}</td>
                                    <td>{invitedCount}</td>
                                    <td>{counts.yes}</td>
                                    <td>{counts.no}</td>
                                    <td>{counts.maybe}</td>
                                    <td>{counts.pending}</td>
                                </tr>
                            ))}
                        </RsvpTable>
                    </div>
                )}

                {activeTab === 'theme' && (
                    <div className="dashboard-panel">
                        <div className="dashboard-panel-header">
                            <p className="dashboard-eyebrow">Theme</p>
                            <h2>Theme media</h2>
                        </div>
                        <div className="form-grid">
                            <SelectField
                                label="Theme key"
                                value={weddingData.wedding.themeKey}
                                options={themeKeyOptions}
                                onChange={updateThemeKey}
                            />
                            <TextField label="Hero video" value={weddingData.hero.videoSrc} onChange={(value) => updateHero('videoSrc', value)} />
                            <TextField label="Hero poster" value={weddingData.hero.posterSrc} onChange={(value) => updateHero('posterSrc', value)} />
                            <TextField label="Reveal image" value={weddingData.hero.revealImageSrc} onChange={(value) => updateHero('revealImageSrc', value)} />
                            <TextField label="Music audio" value={weddingData.music.audioSrc} onChange={(value) => updateMusic('audioSrc', value)} />
                            <TextField label="Music title" value={weddingData.music.title} onChange={(value) => updateMusic('title', value)} />
                        </div>
                    </div>
                )}

                {activeTab === 'preview' && (
                    <div className="dashboard-panel preview-panel">
                        <div className="dashboard-panel-header">
                            <p className="dashboard-eyebrow">Preview</p>
                            <h2>Guest invite preview</h2>
                        </div>
                        <div className="preview-mode-control">
                            <SelectField
                                label="Preview mode"
                                value={previewMode}
                                options={['public', 'rsvp']}
                                optionLabels={{
                                    public: 'Public/basic preview',
                                    rsvp: 'RSVP package preview',
                                }}
                                onChange={(value) => setPreviewMode(value as PreviewMode)}
                            />
                        </div>
                        <div className="dashboard-preview-frame">
                            <InviteExperience key={previewKey} data={previewData} embedded />
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
    return (
        <div className="info-block">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

function ReadOnlyBadgeCard({
    label,
    value,
    helperText,
    actionLabel,
}: {
    label: string;
    value: string;
    helperText: string;
    actionLabel?: string;
}) {
    return (
        <div className="readonly-card">
            <span>{label}</span>
            <strong>{value}</strong>
            <p>{helperText}</p>
            {actionLabel && (
                <button type="button" disabled>{actionLabel}</button>
            )}
        </div>
    );
}

function TextField({ label, value, error, onChange }: { label: string; value: string; error?: string; onChange: (value: string) => void }) {
    return (
        <label className={`dashboard-field ${error ? 'has-error' : ''}`}>
            <span>{label}</span>
            <input value={value} onChange={(event) => onChange(event.target.value)} />
            {error && <em>{error}</em>}
        </label>
    );
}

function SelectField({
    label,
    value,
    options,
    optionLabels,
    onChange,
}: {
    label: string;
    value: string;
    options: string[];
    optionLabels?: Record<string, string>;
    onChange: (value: string) => void;
}) {
    return (
        <label className="dashboard-field">
            <span>{label}</span>
            <select value={value} onChange={(event) => onChange(event.target.value)}>
                {options.map((option) => (
                    <option key={option} value={option}>
                        {optionLabels?.[option] ?? option}
                    </option>
                ))}
            </select>
        </label>
    );
}

function RsvpTable({
    title,
    headers,
    children,
}: {
    title: string;
    headers: string[];
    children: React.ReactNode;
}) {
    return (
        <section className="rsvp-analytics-section">
            <h3>{title}</h3>
            <div className="guest-table-wrap">
                <table className="guest-table rsvp-analytics-table">
                    <thead>
                        <tr>
                            {headers.map((header) => (
                                <th key={header}>{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>{children}</tbody>
                </table>
            </div>
        </section>
    );
}
