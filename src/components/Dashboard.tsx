import { Fragment, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import './Dashboard.css';
import InviteExperience from './InviteExperience';
import { useAuth } from '../context/AuthContext';
import { updateWeddingShell } from '../lib/weddingOnboarding';
import {
    createSupabaseEvent,
    createSupabaseGuest,
    deleteSupabaseEvent,
    deleteSupabaseGuest,
    importSupabaseGuests,
    loadSupabaseRsvpResponses,
    loadSupabaseWeddingBundle,
    replaceSupabaseGuestInvites,
    saveSupabaseEvents,
    saveSupabaseGuests,
} from '../lib/supabaseWeddingData';
import {
    defaultDashboardWeddingSlug,
    getPackageDisplayLabel,
    mockAdminWeddingsStorageKey,
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
type CsvImportMode = 'append' | 'replace';

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

const applyAdminFields = (wedding: SampleWeddingData): SampleWeddingData => {
    try {
        const adminWeddings = JSON.parse(
            window.localStorage.getItem(mockAdminWeddingsStorageKey) ?? '[]'
        ) as SampleWeddingData[];
        const adminWedding = adminWeddings.find((record) => record.wedding.slug === wedding.wedding.slug);
        if (!adminWedding) return wedding;

        return {
            ...wedding,
            wedding: {
                ...wedding.wedding,
                packageType: adminWedding.wedding.packageType,
                status: adminWedding.wedding.status,
                paymentStatus: adminWedding.wedding.paymentStatus ?? wedding.wedding.paymentStatus,
            },
        };
    } catch {
        return wedding;
    }
};

const guestCsvBaseHeaders = ['guestName', 'phone', 'invitedCount', 'category'];
const invitedCsvValues = new Set(['yes', 'y', 'true', '1']);

const normalizeCsvHeader = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

const csvEscape = (value: string | number) => {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const parseCsv = (text: string) => {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        const nextChar = text[index + 1];

        if (char === '"' && inQuotes && nextChar === '"') {
            field += '"';
            index += 1;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            row.push(field);
            field = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') index += 1;
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        } else {
            field += char;
        }
    }

    if (field || row.length) {
        row.push(field);
        rows.push(row);
    }

    return rows.filter((csvRow) => csvRow.some((cell) => cell.trim()));
};

const downloadCsv = (filename: string, rows: Array<Array<string | number>>) => {
    const csvText = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
};

const createUniqueInviteCode = (existingCodes: Set<string>) => {
    let code = Math.random().toString(36).slice(2, 8);
    while (existingCodes.has(code)) {
        code = Math.random().toString(36).slice(2, 8);
    }
    existingCodes.add(code);
    return code;
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
            paymentStatus: wedding.wedding.paymentStatus ?? defaults.wedding.paymentStatus,
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
    if (!savedDraft) return applyAdminFields(cloneWedding(dashboardBaseWedding));

    try {
        const draft = normalizeWedding(JSON.parse(savedDraft) as SampleWeddingData);
        return hasRsvpAccess(draft) && draft.wedding.slug === defaultDashboardWeddingSlug
            ? applyAdminFields(draft)
            : applyAdminFields(cloneWedding(dashboardBaseWedding));
    } catch {
        window.localStorage.removeItem(mockDashboardDraftStorageKey);
        return applyAdminFields(cloneWedding(dashboardBaseWedding));
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

export default function Dashboard({
    authNotice,
    initialWedding,
    supabaseWeddingId,
}: {
    authNotice?: string;
    initialWedding?: SampleWeddingData;
    supabaseWeddingId?: string;
}) {
    const { user, isConfigured, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
    const [weddingData, setWeddingData] = useState<SampleWeddingData>(() => initialWedding ?? loadInitialWedding());
    const [previewMode, setPreviewMode] = useState<PreviewMode>('public');
    const [guestSearchQuery, setGuestSearchQuery] = useState('');
    const [guestImportMode, setGuestImportMode] = useState<CsvImportMode>('append');
    const [guestImportWarnings, setGuestImportWarnings] = useState<string[]>([]);
    const [expandedGuestId, setExpandedGuestId] = useState<string | null>(null);
    const [rsvpResponses, setRsvpResponses] = useState<StoredRsvpResponse[]>(loadStoredRsvpResponses);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');
    const [saveError, setSaveError] = useState('');

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
            if (supabaseWeddingId) {
                loadSupabaseRsvpResponses(
                    supabaseWeddingId,
                    weddingData.wedding.slug,
                    weddingData.rsvp.guests
                ).then((result) => {
                    if (!result.error) setRsvpResponses(result.responses);
                });
            } else {
                setRsvpResponses(loadStoredRsvpResponses());
            }
        }
    }, [activeTab, supabaseWeddingId, weddingData.wedding.slug, weddingData.rsvp.guests]);

    useEffect(() => {
        if (initialWedding) {
            setWeddingData(initialWedding);
            setHasUnsavedChanges(false);
        }
    }, [initialWedding]);

    const validation = useMemo(() => {
        return {
            slug: !weddingData.wedding.slug.trim()
                ? 'Slug is required.'
                : /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(weddingData.wedding.slug)
                    ? ''
                    : 'Use lowercase letters, numbers, and hyphens only.',
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
            guest.mealPreference ?? relevantResponses.find((response) => response.guestId === guest.id && response.mealPreference)?.mealPreference ?? ''
        ));
        const mealSummary = {
            veg: guestMealPreferences.filter((meal) => meal === 'veg').length,
            nonVeg: guestMealPreferences.filter((meal) => meal === 'nonVeg').length,
            jain: guestMealPreferences.filter((meal) => meal === 'jain').length,
            none: guestMealPreferences.filter((meal) => !meal).length,
        };
        const guestSummaries = weddingData.rsvp.guests.map((guest) => {
            const counts = countStatusesForGuests([guest]);
            const mealPreference = guest.mealPreference ?? relevantResponses.find((response) => response.guestId === guest.id && response.mealPreference)?.mealPreference ?? '';
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
        setSaveError('');
    };

    const handleSaveDraft = async () => {
        setSaveError('');
        setSaveStatus('Saving...');

        if (supabaseWeddingId) {
            if (validation.slug || validation.brideName || validation.groomName) {
                setSaveStatus('');
                setSaveError('Could not save wedding details. Please fix the highlighted wedding fields.');
                return;
            }

            const result = await updateWeddingShell({
                weddingId: supabaseWeddingId,
                brideName: weddingData.couple.brideName.trim(),
                groomName: weddingData.couple.groomName.trim(),
                displayName: weddingData.couple.displayName.trim(),
                slug: weddingData.wedding.slug.trim(),
                themeKey: weddingData.wedding.themeKey.trim(),
                pageTitle: weddingData.wedding.pageTitle.trim(),
            });

            if (result.error) {
                setSaveStatus('');
                setSaveError(`Could not save wedding details. ${result.error}`);
                return;
            }

            const eventsResult = await saveSupabaseEvents(supabaseWeddingId, weddingData.events);
            if (eventsResult.error) {
                setSaveStatus('');
                setSaveError(`Could not save events. ${eventsResult.error}`);
                return;
            }

            const guestsResult = await saveSupabaseGuests(supabaseWeddingId, weddingData.rsvp.guests);
            if (guestsResult.error) {
                setSaveStatus('');
                setSaveError(`Could not save guests. ${guestsResult.error}`);
                return;
            }
        }

        window.localStorage.setItem(mockDashboardDraftStorageKey, JSON.stringify(weddingData));
        setHasUnsavedChanges(false);
        setSaveStatus('Saved');
    };

    const handleResetDraft = () => {
        window.localStorage.removeItem(mockDashboardDraftStorageKey);
        setWeddingData(cloneWedding(initialWedding ?? dashboardBaseWedding));
        setPreviewMode('public');
        setHasUnsavedChanges(false);
        setSaveStatus('');
        setSaveError('');
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

    const updateWeddingShellField = <Key extends keyof SampleWeddingData['wedding']>(
        key: Key,
        value: SampleWeddingData['wedding'][Key]
    ) => {
        updateWeddingData((current) => ({
            ...current,
            wedding: {
                ...current.wedding,
                [key]: value,
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

    const addEvent = async () => {
        const mediaSource = weddingData.events[0];
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
            calendarTitle: `${weddingData.couple.displayName} New Event`,
            calendarDescription: `New event for ${weddingData.couple.displayName}.`,
        };

        if (supabaseWeddingId) {
            setSaveError('');
            const result = await createSupabaseEvent(supabaseWeddingId, newEvent, weddingData.events.length);
            if (result.error || !result.event) {
                setSaveError(`Could not add event. ${result.error}`);
                return;
            }
            updateWeddingData((current) => ({
                ...current,
                events: [...current.events, result.event],
            }));
            return;
        }

        updateWeddingData((current) => ({
            ...current,
            events: [...current.events, newEvent],
        }));
    };

    const deleteEvent = async (index: number) => {
        const eventToDelete = weddingData.events[index];
        if (supabaseWeddingId && eventToDelete) {
            const result = await deleteSupabaseEvent(eventToDelete.id);
            if (result.error) {
                setSaveError(`Could not delete event. ${result.error}`);
                return;
            }
        }
        updateWeddingData((current) => ({
            ...current,
            events: current.events.filter((_, eventIndex) => eventIndex !== index),
            rsvp: {
                ...current.rsvp,
                guests: current.rsvp.guests.map((guest) => ({
                    ...guest,
                    invitedEventIds: guest.invitedEventIds.filter((eventId) => eventId !== eventToDelete?.id),
                })),
            },
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
        const currentGuest = weddingData.rsvp.guests[guestIndex];
        const nextEventIds = currentGuest.invitedEventIds.includes(eventId)
            ? currentGuest.invitedEventIds.filter((id) => id !== eventId)
            : [...currentGuest.invitedEventIds, eventId];

        updateWeddingData((current) => ({
            ...current,
            rsvp: {
                ...current.rsvp,
                guests: current.rsvp.guests.map((guest, index) => {
                    if (index !== guestIndex) return guest;
                    return { ...guest, invitedEventIds: nextEventIds };
                }),
            },
        }));

        if (supabaseWeddingId) {
            replaceSupabaseGuestInvites(supabaseWeddingId, currentGuest.id, nextEventIds).then((result) => {
                if (result.error) setSaveError(`Could not update guest events. ${result.error}`);
            });
        }
    };

    const addGuest = async () => {
        const newGuest: WeddingGuest = {
            id: `guest-${Date.now()}`,
            guestName: '',
            phone: '',
            invitedCount: 1,
            category: '',
            inviteCode: Math.random().toString(36).slice(2, 8),
            invitedEventIds: [],
        };

        if (supabaseWeddingId) {
            const result = await createSupabaseGuest(supabaseWeddingId, newGuest);
            if (result.error || !result.guest) {
                setSaveError(`Could not add guest. ${result.error}`);
                return;
            }
            updateWeddingData((current) => ({
                ...current,
                rsvp: {
                    ...current.rsvp,
                    guests: [...current.rsvp.guests, result.guest],
                },
            }));
            return;
        }

        updateWeddingData((current) => ({
            ...current,
            rsvp: {
                ...current.rsvp,
                guests: [...current.rsvp.guests, newGuest],
            },
        }));
    };

    const deleteGuest = async (index: number) => {
        const guestToDelete = weddingData.rsvp.guests[index];
        if (supabaseWeddingId && guestToDelete) {
            const result = await deleteSupabaseGuest(guestToDelete.id);
            if (result.error) {
                setSaveError(`Could not delete guest. ${result.error}`);
                return;
            }
        }
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

    const previewGuestInvite = async (guest: WeddingGuest) => {
        await handleSaveDraft();
        window.open(getGuestInviteLink(guest), '_blank', 'noopener,noreferrer');
    };

    const downloadGuestCsvTemplate = () => {
        downloadCsv(`${weddingData.wedding.slug}-guest-template.csv`, [
            [...guestCsvBaseHeaders, ...weddingData.events.map((event) => event.eventName)],
        ]);
    };

    const exportGuestsCsv = () => {
        const rows: Array<Array<string | number>> = [[
            ...guestCsvBaseHeaders,
            'inviteCode',
            'inviteLink',
            ...weddingData.events.map((event) => event.eventName),
        ]];

        weddingData.rsvp.guests.forEach((guest) => {
            rows.push([
                guest.guestName,
                guest.phone,
                guest.invitedCount,
                guest.category,
                guest.inviteCode,
                getGuestInviteLink(guest),
                ...weddingData.events.map((event) => (
                    guest.invitedEventIds.includes(event.id) ? 'yes' : 'no'
                )),
            ]);
        });

        downloadCsv(`${weddingData.wedding.slug}-guests.csv`, rows);
    };

    const handleGuestCsvImport = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        const rows = parseCsv(await file.text());
        if (rows.length < 2) {
            setGuestImportWarnings(['CSV must include a header row and at least one guest row.']);
            return;
        }

        const [headers, ...dataRows] = rows;
        const normalizedHeaders = headers.map(normalizeCsvHeader);
        const headerIndex = (name: string) => normalizedHeaders.indexOf(normalizeCsvHeader(name));
        const baseHeaderKeys = new Set(guestCsvBaseHeaders.map(normalizeCsvHeader));
        const warnings: string[] = [];
        const eventColumns = headers
            .map((header, index) => {
                const normalizedHeader = normalizedHeaders[index];
                if (!header.trim() || baseHeaderKeys.has(normalizedHeader)) return null;
                const matchedEvent = weddingData.events.find((weddingEvent) => (
                    [weddingEvent.eventName, weddingEvent.id].some((eventKey) => (
                        normalizeCsvHeader(eventKey) === normalizedHeader
                    ))
                ));
                if (!matchedEvent) {
                    warnings.push(`Column "${header}" does not match a current event.`);
                    return null;
                }
                return { index, eventId: matchedEvent.id };
            })
            .filter((column): column is { index: number; eventId: string } => Boolean(column));
        const existingCodes = new Set(weddingData.rsvp.guests.map((guest) => guest.inviteCode));
        const existingIds = new Set(weddingData.rsvp.guests.map((guest) => guest.id));

        const importedGuests = dataRows.map((row, rowIndex) => {
            const displayRow = rowIndex + 2;
            const guestName = row[headerIndex('guestName')]?.trim() ?? '';
            const phone = row[headerIndex('phone')]?.trim() ?? '';
            const category = row[headerIndex('category')]?.trim() ?? '';
            const invitedCountValue = row[headerIndex('invitedCount')]?.trim() ?? '';
            const parsedInvitedCount = invitedCountValue ? Number(invitedCountValue) : 1;
            const invitedCount = Number.isFinite(parsedInvitedCount) && parsedInvitedCount >= 1
                ? Math.floor(parsedInvitedCount)
                : 1;
            const invitedEventIds = eventColumns
                .filter(({ index }) => invitedCsvValues.has((row[index] ?? '').trim().toLowerCase()))
                .map(({ eventId }) => eventId);

            if (!guestName) warnings.push(`Row ${displayRow}: guestName is missing.`);
            if (!phone) warnings.push(`Row ${displayRow}: phone is missing.`);
            if (invitedCountValue && (!Number.isFinite(parsedInvitedCount) || parsedInvitedCount < 1)) {
                warnings.push(`Row ${displayRow}: invitedCount is invalid.`);
            }
            if (!invitedEventIds.length) warnings.push(`Row ${displayRow}: no invited events selected.`);

            let guestId = `guest-${Date.now()}-${rowIndex + 1}`;
            while (existingIds.has(guestId)) {
                guestId = `guest-${Date.now()}-${rowIndex + 1}-${Math.random().toString(36).slice(2, 5)}`;
            }
            existingIds.add(guestId);

            return {
                id: guestId,
                guestName,
                phone,
                invitedCount,
                category,
                inviteCode: createUniqueInviteCode(existingCodes),
                invitedEventIds,
            };
        });

        if (supabaseWeddingId) {
            const result = await importSupabaseGuests(supabaseWeddingId, importedGuests, guestImportMode);
            if (result.error) {
                setGuestImportWarnings([...warnings, `Import failed: ${result.error}`]);
                return;
            }
            const refreshed = await loadSupabaseWeddingBundle(supabaseWeddingId, { includeGuests: true });
            if (refreshed.wedding) {
                setWeddingData(refreshed.wedding);
                setHasUnsavedChanges(true);
                setSaveStatus('');
                setSaveError('');
            }
            setGuestImportWarnings(warnings);
            return;
        }

        updateWeddingData((current) => ({
            ...current,
            rsvp: {
                ...current.rsvp,
                guests: guestImportMode === 'replace'
                    ? importedGuests
                    : [...current.rsvp.guests, ...importedGuests],
            },
        }));
        setGuestImportWarnings(warnings);
    };

    const exportRsvpCsv = () => {
        const relevantResponses = rsvpResponses.filter((response) => response.weddingSlug === weddingData.wedding.slug);
        const rows: Array<Array<string | number>> = [[
            'guestName',
            'phone',
            'category',
            'invitedCount',
            'eventName',
            'rsvpStatus',
            'mealPreference',
            'updatedAt',
        ]];

        weddingData.rsvp.guests.forEach((guest) => {
            guest.invitedEventIds.forEach((eventId) => {
                const weddingEvent = weddingData.events.find((eventItem) => eventItem.id === eventId);
                const response = relevantResponses.find((storedResponse) => (
                    storedResponse.guestId === guest.id && storedResponse.eventId === eventId
                ));
                rows.push([
                    guest.guestName,
                    guest.phone,
                    guest.category,
                    guest.invitedCount,
                    weddingEvent?.eventName ?? eventId,
                    response?.status || 'pending',
                    guest.mealPreference || response?.mealPreference || '',
                    response?.updatedAt || '',
                ]);
            });
        });

        downloadCsv(`${weddingData.wedding.slug}-rsvp-responses.csv`, rows);
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

    const handleLogout = async () => {
        await signOut();
        window.location.href = '/login';
    };

    return (
        <main className="dashboard-page">
            <aside className="dashboard-sidebar">
                <div>
                    <p className="dashboard-eyebrow">Shaadi Nyota</p>
                    <h1>Couple Dashboard</h1>
                    {user?.email && <p className="dashboard-auth-user">{user.email}</p>}
                </div>
                {authNotice && <p className="dashboard-auth-notice">{authNotice}</p>}
                <div className="dashboard-draft-bar">
                    <span className={hasUnsavedChanges ? 'unsaved' : 'saved'}>
                        {hasUnsavedChanges ? 'Unsaved changes' : saveStatus || 'Draft ready'}
                    </span>
                    {saveError && <em>{saveError}</em>}
                    <button type="button" onClick={handleResetDraft}>Reset Draft</button>
                    {isConfigured && <button type="button" onClick={handleLogout}>Logout</button>}
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
                        <div className="dashboard-panel-header dashboard-panel-header-row">
                            <div>
                                <p className="dashboard-eyebrow">Overview</p>
                                <h2>{weddingData.couple.displayName}</h2>
                            </div>
                            <button className="dashboard-primary-btn" type="button" onClick={handleSaveDraft}>
                                Save Wedding Details
                            </button>
                        </div>
                        <div className="overview-grid">
                            <ReadOnlyBadgeCard
                                label="Plan"
                                value={getPackageDisplayLabel(weddingData.wedding.packageType)}
                                helperText="Plan changes will be handled from checkout/admin in a later phase."
                                actionLabel="Request upgrade"
                            />
                            <ReadOnlyBadgeCard
                                label="Status"
                                value={weddingData.wedding.status}
                                helperText="Payment and publishing status will be managed by admin/payment flow later."
                            />
                            <InfoBlock label="Payment" value={weddingData.wedding.paymentStatus} />
                            <InfoBlock label="Theme" value={weddingData.wedding.themeKey} />
                        </div>
                        <div className="form-grid dashboard-shell-fields">
                            <TextField
                                label="Slug"
                                value={weddingData.wedding.slug}
                                error={validation.slug}
                                onChange={(value) => updateWeddingShellField('slug', value.toLowerCase())}
                            />
                            <TextField
                                label="Page title"
                                value={weddingData.wedding.pageTitle}
                                onChange={(value) => updateWeddingShellField('pageTitle', value)}
                            />
                        </div>
                        {validationCount > 0 && (
                            <p className="validation-summary">{validationCount} validation warning{validationCount === 1 ? '' : 's'} need attention.</p>
                        )}
                        <p className="dashboard-note">
                            {supabaseWeddingId
                                ? 'Core wedding, event, guest, and RSVP data is now saved in Supabase. Some theme copy still uses the local MVP defaults.'
                                : 'This is a mock dashboard. Changes are stored only in local React state and are not saved to a database yet.'}
                        </p>
                    </div>
                )}

                {activeTab === 'couple' && (
                    <div className="dashboard-panel">
                        <div className="dashboard-panel-header dashboard-panel-header-row">
                            <div>
                                <p className="dashboard-eyebrow">Couple</p>
                                <h2>Edit couple details</h2>
                            </div>
                            <button className="dashboard-primary-btn" type="button" onClick={handleSaveDraft}>
                                Save Couple Details
                            </button>
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
                            <div className="dashboard-header-actions">
                                <button className="dashboard-primary-btn secondary" type="button" onClick={handleSaveDraft}>
                                    Save Events
                                </button>
                                <button className="dashboard-primary-btn" type="button" onClick={addEvent}>Add event</button>
                            </div>
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
                            <div className="dashboard-header-actions">
                                <button className="dashboard-primary-btn secondary" type="button" onClick={handleSaveDraft}>
                                    Save Guests
                                </button>
                                <button className="dashboard-primary-btn" type="button" onClick={addGuest}>Add guest</button>
                            </div>
                        </div>
                        <div className="guest-summary-grid">
                            <InfoBlock label="Families" value={String(guestSummary.totalGuests)} />
                            <InfoBlock label="Invited count" value={String(guestSummary.totalInvitedCount)} />
                            <InfoBlock label="No events" value={String(guestSummary.noEventGuests)} />
                            <InfoBlock label="Missing phone" value={String(guestSummary.missingPhoneGuests)} />
                        </div>
                        <div className="guest-csv-toolbar">
                            <button className="dashboard-primary-btn secondary" type="button" onClick={downloadGuestCsvTemplate}>
                                Download CSV Template
                            </button>
                            <button className="dashboard-primary-btn secondary" type="button" onClick={exportGuestsCsv}>
                                Export Guests CSV
                            </button>
                            <label className="csv-mode-select">
                                <span>Import mode</span>
                                <select
                                    value={guestImportMode}
                                    onChange={(event) => setGuestImportMode(event.target.value as CsvImportMode)}
                                >
                                    <option value="append">Append to current guests</option>
                                    <option value="replace">Replace all guests</option>
                                </select>
                            </label>
                            <label className="csv-file-control">
                                <span>Import CSV</span>
                                <input type="file" accept=".csv,text/csv" onChange={handleGuestCsvImport} />
                            </label>
                        </div>
                        {guestImportWarnings.length > 0 && (
                            <div className="csv-warning-box">
                                <strong>Import warnings</strong>
                                <ul>
                                    {guestImportWarnings.slice(0, 10).map((warning) => (
                                        <li key={warning}>{warning}</li>
                                    ))}
                                </ul>
                                {guestImportWarnings.length > 10 && (
                                    <p>{guestImportWarnings.length - 10} more warnings hidden.</p>
                                )}
                            </div>
                        )}
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
                                                        <button type="button" onClick={() => previewGuestInvite(guest)}>Preview</button>
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
                                <h2>{supabaseWeddingId ? 'RSVP analytics' : 'Mock RSVP analytics'}</h2>
                            </div>
                            <div className="dashboard-header-actions">
                                <button className="dashboard-primary-btn secondary" type="button" onClick={exportRsvpCsv}>
                                    Export RSVP CSV
                                </button>
                                {!supabaseWeddingId && (
                                    <button className="dashboard-primary-btn secondary" type="button" onClick={clearMockRsvpResponses}>
                                        Clear Mock RSVP Responses
                                    </button>
                                )}
                            </div>
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
                        <div className="dashboard-panel-header dashboard-panel-header-row">
                            <div>
                                <p className="dashboard-eyebrow">Theme</p>
                                <h2>Theme media</h2>
                            </div>
                            <button className="dashboard-primary-btn" type="button" onClick={handleSaveDraft}>
                                Save Theme Settings
                            </button>
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
                                    public: 'Nyota Classic preview',
                                    rsvp: 'Nyota Plus preview',
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
