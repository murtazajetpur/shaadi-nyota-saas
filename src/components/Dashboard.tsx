import { useEffect, useMemo, useState } from 'react';
import './Dashboard.css';
import InviteExperience from './InviteExperience';
import { sampleWeddingData, type SampleWeddingData, type WeddingEvent } from '../data/sampleWeddingData';

type DashboardTab = 'overview' | 'couple' | 'events' | 'theme' | 'preview';

const dashboardTabs: Array<{ id: DashboardTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'couple', label: 'Couple' },
    { id: 'events', label: 'Events' },
    { id: 'theme', label: 'Theme' },
    { id: 'preview', label: 'Preview' },
];

const dashboardDraftStorageKey = 'shaadi-nyota-mock-dashboard-draft';

const cloneWedding = (wedding: SampleWeddingData): SampleWeddingData => {
    return JSON.parse(JSON.stringify(wedding)) as SampleWeddingData;
};

const loadInitialWedding = () => {
    const savedDraft = window.localStorage.getItem(dashboardDraftStorageKey);
    if (!savedDraft) return cloneWedding(sampleWeddingData);

    try {
        return JSON.parse(savedDraft) as SampleWeddingData;
    } catch {
        window.localStorage.removeItem(dashboardDraftStorageKey);
        return cloneWedding(sampleWeddingData);
    }
};

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
    const [weddingData, setWeddingData] = useState<SampleWeddingData>(loadInitialWedding);
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

    const previewKey = useMemo(() => JSON.stringify(weddingData), [weddingData]);

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
                            <InfoBlock label="Slug" value={weddingData.wedding.slug} />
                            <InfoBlock label="Package" value={weddingData.wedding.packageType} />
                            <InfoBlock label="Theme" value={weddingData.wedding.themeKey} />
                            <InfoBlock label="Status" value="Draft" />
                        </div>
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
                            <TextField label="Bride name" value={weddingData.couple.brideName} onChange={(value) => updateCouple('brideName', value)} />
                            <TextField label="Groom name" value={weddingData.couple.groomName} onChange={(value) => updateCouple('groomName', value)} />
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
                                        <TextField label="Event name" value={event.eventName} onChange={(value) => updateEvent(index, 'eventName', value)} />
                                        <TextField label="Date" value={event.date} onChange={(value) => updateEvent(index, 'date', value)} />
                                        <TextField label="Start time" value={event.startTime} onChange={(value) => updateEvent(index, 'startTime', value)} />
                                        <TextField label="Venue name" value={event.venueName} onChange={(value) => updateEvent(index, 'venueName', value)} />
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
                            <ReadOnlyField label="Theme key" value={weddingData.wedding.themeKey} />
                            <TextField label="Hero video" value={weddingData.hero.videoSrc} onChange={(value) => updateHero('videoSrc', value)} />
                            <TextField label="Hero poster" value={weddingData.hero.posterSrc} onChange={(value) => updateHero('posterSrc', value)} />
                            <TextField label="Reveal image" value={weddingData.hero.revealImageSrc} onChange={(value) => updateHero('revealImageSrc', value)} />
                            <TextField label="Music audio" value={weddingData.music.audioSrc} onChange={(value) => updateMusic('audioSrc', value)} />
                        </div>
                    </div>
                )}

                {activeTab === 'preview' && (
                    <div className="dashboard-panel preview-panel">
                        <div className="dashboard-panel-header">
                            <p className="dashboard-eyebrow">Preview</p>
                            <h2>Guest invite preview</h2>
                        </div>
                        <div className="dashboard-preview-frame">
                            <InviteExperience key={previewKey} data={weddingData} embedded />
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

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <label className="dashboard-field">
            <span>{label}</span>
            <input value={value} onChange={(event) => onChange(event.target.value)} />
        </label>
    );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
    return (
        <label className="dashboard-field">
            <span>{label}</span>
            <input value={value} readOnly />
        </label>
    );
}
