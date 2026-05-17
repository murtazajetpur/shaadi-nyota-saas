import { useEffect, useMemo, useState } from 'react';
import './Dashboard.css';
import InviteExperience from './InviteExperience';
import {
    sampleWeddingData,
    type SampleWeddingData,
    type WeddingEvent,
} from '../data/sampleWeddingData';

type DashboardTab = 'overview' | 'couple' | 'events' | 'theme' | 'preview';
type PreviewMode = 'public' | 'rsvp';

const dashboardTabs: Array<{ id: DashboardTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'couple', label: 'Couple' },
    { id: 'events', label: 'Events' },
    { id: 'theme', label: 'Theme' },
    { id: 'preview', label: 'Preview' },
];

const dashboardDraftStorageKey = 'shaadi-nyota-mock-dashboard-draft';
const themeKeyOptions = ['palace-door-opening'];

const cloneWedding = (wedding: SampleWeddingData): SampleWeddingData => {
    return JSON.parse(JSON.stringify(wedding)) as SampleWeddingData;
};

const normalizeWedding = (wedding: SampleWeddingData): SampleWeddingData => {
    const defaults = cloneWedding(sampleWeddingData);

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
        },
        closing: {
            ...defaults.closing,
            ...wedding.closing,
        },
        events: wedding.events?.length ? wedding.events : defaults.events,
    };
};

const loadInitialWedding = () => {
    const savedDraft = window.localStorage.getItem(dashboardDraftStorageKey);
    if (!savedDraft) return cloneWedding(sampleWeddingData);

    try {
        return normalizeWedding(JSON.parse(savedDraft) as SampleWeddingData);
    } catch {
        window.localStorage.removeItem(dashboardDraftStorageKey);
        return cloneWedding(sampleWeddingData);
    }
};

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
    const [weddingData, setWeddingData] = useState<SampleWeddingData>(loadInitialWedding);
    const [previewMode, setPreviewMode] = useState<PreviewMode>('public');
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
        };
    }, [weddingData]);

    const validationCount = useMemo(() => {
        const coupleAndSlugWarnings = [validation.slug, validation.brideName, validation.groomName].filter(Boolean).length;
        const eventWarnings = validation.events.reduce((count, event) => (
            count + Object.values(event).filter(Boolean).length
        ), 0);
        return coupleAndSlugWarnings + eventWarnings;
    }, [validation]);

    const previewData = useMemo(() => {
        const previewWedding = cloneWedding(weddingData);
        previewWedding.wedding.packageType = previewMode === 'rsvp' ? 'rsvp' : 'basic';
        return previewWedding;
    }, [previewMode, weddingData]);

    const previewKey = useMemo(() => JSON.stringify(previewData), [previewData]);

    const updateWeddingData = (updater: (current: SampleWeddingData) => SampleWeddingData) => {
        setWeddingData(updater);
        setHasUnsavedChanges(true);
        setSaveStatus('');
    };

    const handleSaveDraft = () => {
        window.localStorage.setItem(dashboardDraftStorageKey, JSON.stringify(weddingData));
        setHasUnsavedChanges(false);
        setSaveStatus('Saved');
    };

    const handleResetDraft = () => {
        window.localStorage.removeItem(dashboardDraftStorageKey);
        setWeddingData(cloneWedding(sampleWeddingData));
        setPreviewMode('public');
        setHasUnsavedChanges(false);
        setSaveStatus('');
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
