import { Component, Fragment, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import InviteExperience from './InviteExperience';
import OpeningRevealScrollPrompt from './OpeningRevealScrollPrompt';
import { EventSection as Theme1EventPreviewSection } from './Section3';
import Section2 from './Section2';
import Section5 from './Section5';
import './Dashboard.css';
import { useAuth } from '../context/AuthContext';
import { updateWeddingPaymentStatus, updateWeddingShell } from '../lib/weddingOnboarding';
import {
    createSupabaseEvent,
    createSupabaseGuest,
    deleteSupabaseEvent,
    deleteSupabaseGuest,
    deleteSupabaseGuests,
    importSupabaseGuests,
    loadSupabaseRsvpResponses,
    loadSupabaseWeddingBundle,
    replaceSupabaseGuestInvites,
    saveSupabaseRelationalData,
    saveSupabaseWeddingSettings,
} from '../lib/supabaseWeddingData';
import {
    canManageGuests,
    canUpgradePlan,
    canViewRsvpDashboard,
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
import {
    buildManualPaymentWhatsAppUrl,
    buildRsvpUpgradeWhatsAppUrl,
    packageDetails,
    paymentConfig,
    paymentStatusDescriptions,
    paymentStatusLabels,
    type PaymentWhatsAppContext,
} from '../data/paymentConfig';
import {
    eventVisuals,
    getEventVisualByKey,
    getRecommendedVisualForEvent,
    type EventVisual,
} from '../data/eventVisuals';
import {
    eventAnimationOptionLabels,
    eventAnimationOptions,
    getEventAnimationLabel,
    isEventAnimationRecommended,
    normalizeEventAnimationKey,
} from '../data/eventAnimations';
import { getOpeningRevealCrossfadeProgress, openingRevealCrossfadeSeconds } from '../data/openingReveal';
import {
    getAllClosingGalleryPresetPhotos,
    getAllOpeningRevealAnimations,
    getAllRevealedImages,
    getAllStoryImages,
    getAudioAssets,
    resolveAssetPath,
} from '../data/assetRegistry';
import { supabase } from '../lib/supabaseClient';

type DashboardTab = 'overview' | 'opening-reveal' | 'our-story' | 'couple' | 'events' | 'guests' | 'rsvp' | 'closing-gallery' | 'preview';
type CsvImportMode = 'append' | 'replace';
type DashboardMode = 'couple' | 'admin';

class DashboardPreviewErrorBoundary extends Component<{
    children: ReactNode;
    resetKey: string;
    onError: (error: unknown) => void;
}, { hasError: boolean }> {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: unknown) {
        this.props.onError(error);
    }

    componentDidUpdate(previousProps: { resetKey: string }) {
        if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
            this.setState({ hasError: false });
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="dashboard-preview-error">
                    Could not load preview. Please refresh or try again.
                </div>
            );
        }

        return this.props.children;
    }
}

const dashboardTabGroups: Array<{ label: string; tabs: Array<{ id: DashboardTab; label: string }> }> = [
    {
        label: 'Wedding Website',
        tabs: [{ id: 'overview', label: 'Overview' }],
    },
    {
        label: 'Content',
        tabs: [
            { id: 'opening-reveal', label: 'Opening Reveal' },
            { id: 'our-story', label: 'Our Story' },
            { id: 'events', label: 'Events' },
            { id: 'closing-gallery', label: 'Closing Gallery' },
        ],
    },
    {
        label: 'Guests',
        tabs: [
            { id: 'guests', label: 'Guests' },
            { id: 'rsvp', label: 'RSVP Responses' },
        ],
    },
    {
        label: 'Review',
        tabs: [{ id: 'preview', label: 'Preview' }],
    },
];

const revealAnimationOptions = getAllOpeningRevealAnimations().map((option) => ({
    key: option.id,
    label: option.label,
    revealStyle: option.revealStyle,
    videoSrc: resolveAssetPath(option.videoSrc),
    posterSrc: resolveAssetPath(option.posterSrc),
    revealImageShowAtSeconds: option.revealImageShowAtSeconds,
    heroFadeAtSeconds: option.heroFadeAtSeconds,
    themeLabel: option.disabled ? 'Unavailable' : 'Reveal Animation',
    disabled: option.disabled,
    helper: option.helper,
}));
const revealedImageOptions = getAllRevealedImages().map((option) => ({
    key: option.id,
    label: option.label,
    imageType: option.imageType,
    imageSrc: resolveAssetPath(option.src),
    altText: option.altText,
    themeLabel: 'Reveal Image Library',
    helper: option.helper,
}));
const storyImageOptions = getAllStoryImages().map((option) => ({
    key: option.id,
    label: option.label,
    imageSrc: resolveAssetPath(option.src),
    altText: option.altText,
    themeLabel: 'Our Story Library',
}));
const closingImagePresets = getAllClosingGalleryPresetPhotos().map((option) => ({
    key: option.id,
    label: option.label,
    imageSrc: resolveAssetPath(option.src),
    themeLabel: option.sourceTheme === 'theme-2' ? 'Scroll Opening' : 'Preset Library',
}));
const musicOptions = Array.from(
    new Map(getAudioAssets().map((option) => [resolveAssetPath(option.src), option])).values()
).map((option) => ({
    value: resolveAssetPath(option.src),
    label: option.label,
}));
const musicOptionLabels = Object.fromEntries(musicOptions.map((option) => [option.value, option.label]));
const closingGalleryBucket = 'wedding-assets';
const closingGalleryMaxImages = 3;
const revealStyleLabels: Record<string, string> = {
    envelope: 'Envelope Opening',
    scroll: 'Scroll Opening',
    'palace-door': 'Palace Door Opening',
};
const revealImageTypeLabels: Record<string, string> = {
    blessing: 'Blessing',
    couple: 'Couple Image',
    floral: 'Decorative',
};
const eventTypeOptions = ['', 'haldi', 'mehendi', 'sangeet', 'wedding', 'reception', 'custom'];
const eventTypeLabels: Record<string, string> = {
    '': 'Auto',
    haldi: 'Haldi',
    mehendi: 'Mehendi',
    sangeet: 'Sangeet',
    wedding: 'Wedding / Nikaah',
    reception: 'Reception / Walima',
    custom: 'Custom',
    generic: 'Generic',
};
const eventVisualStyleLabels: Record<string, string> = {
    premium: 'Premium',
    sketch: 'Sketch',
    faceless: 'Faceless',
};
const eventTextStyleOptions = ['auto', 'light', 'dark'];
const eventTextStyleLabels: Record<string, string> = {
    auto: 'Auto',
    light: 'Light text',
    dark: 'Dark text',
};
const eventAnimationKeys = eventAnimationOptions.map((option) => option.id);
const dashboardBaseWedding = getWeddingBySlug(defaultDashboardWeddingSlug) ?? sampleWeddingData;
const isScrollReveal = (hero: SampleWeddingData['hero']) => (
    hero.revealStyle === 'scroll' ||
    hero.videoSrc.includes('/assets/theme-2/main-hero-video.mp4')
);

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
    const mergedCouple = {
        ...defaults.couple,
        ...wedding.couple,
    };
    const defaultEventMedia = defaults.events[0];
    const normalizedEvents: WeddingEvent[] = wedding.events?.length
        ? wedding.events.map((event, index) => {
            const fallbackEvent = defaults.events[index] ?? defaultEventMedia;
            const eventTextStyle: WeddingEvent['eventTextStyle'] = event.eventTextStyle === 'light' || event.eventTextStyle === 'dark' ? event.eventTextStyle : 'auto';
            return {
                ...fallbackEvent,
                ...event,
                eventKey: event.eventKey ?? '',
                eventVisualKey: event.eventVisualKey ?? '',
                eventTextStyle,
                eventAnimationKey: normalizeEventAnimationKey(event.eventAnimationKey),
            };
        })
        : defaults.events;

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
            ...mergedCouple,
            introLine: wedding.couple?.introLine ?? '',
            storyTitle: wedding.couple?.storyTitle ?? '',
            storyText: wedding.couple?.storyText ?? '',
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
        events: normalizedEvents,
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

const dashboardDraftStoragePrefix = 'shaadi-nyota-dashboard-draft';

const createDashboardDraftStorageKey = (mode: DashboardMode, weddingId?: string, slug?: string) => (
    `${dashboardDraftStoragePrefix}:${mode}:${weddingId || slug || 'fallback'}`
);

type DashboardDraftSnapshot = {
    savedAt: string;
    wedding: SampleWeddingData;
};

const readDashboardDraft = (storageKey: string) => {
    try {
        const storedDraft = window.localStorage.getItem(storageKey);
        if (!storedDraft) return null;
        const parsed = JSON.parse(storedDraft) as DashboardDraftSnapshot | SampleWeddingData;
        const wedding = 'wedding' in parsed && 'savedAt' in parsed
            ? parsed.wedding
            : parsed as SampleWeddingData;
        return normalizeWedding(wedding);
    } catch {
        window.localStorage.removeItem(storageKey);
        return null;
    }
};

const applyAuthoritativePlanState = (
    draft: SampleWeddingData,
    source?: SampleWeddingData
) => {
    if (!source) return draft;

    return {
        ...draft,
        wedding: {
            ...draft.wedding,
            packageType: source.wedding.packageType,
            paymentStatus: source.wedding.paymentStatus,
            status: source.wedding.status,
        },
    };
};

const writeDashboardDraft = (storageKey: string, wedding: SampleWeddingData) => {
    const draft: DashboardDraftSnapshot = {
        savedAt: new Date().toISOString(),
        wedding,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
};

const clearDashboardDraft = (storageKey: string) => {
    window.localStorage.removeItem(storageKey);
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
    title = 'Couple Dashboard',
    eyebrow = 'Shaadi Nyota',
    mode = 'couple',
}: {
    authNotice?: string;
    initialWedding?: SampleWeddingData;
    supabaseWeddingId?: string;
    title?: string;
    eyebrow?: string;
    mode?: DashboardMode;
}) {
    const { user, isConfigured, signOut } = useAuth();
    const dashboardDraftStorageKey = supabaseWeddingId
        ? createDashboardDraftStorageKey(mode, supabaseWeddingId, initialWedding?.wedding.slug)
        : mockDashboardDraftStorageKey;
    const storedDashboardDraft = supabaseWeddingId ? readDashboardDraft(dashboardDraftStorageKey) : null;
    const restoredDashboardDraft = storedDashboardDraft
        ? applyAuthoritativePlanState(storedDashboardDraft, initialWedding)
        : null;
    const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
    const [weddingData, setWeddingData] = useState<SampleWeddingData>(() => (
        restoredDashboardDraft ?? (initialWedding ? normalizeWedding(initialWedding) : loadInitialWedding())
    ));
    const [guestSearchQuery, setGuestSearchQuery] = useState('');
    const [guestImportMode, setGuestImportMode] = useState<CsvImportMode>('append');
    const [guestImportWarnings, setGuestImportWarnings] = useState<string[]>([]);
    const [closingImagePickerTarget, setClosingImagePickerTarget] = useState<number | 'add' | null>(null);
    const [isClosingImageUploading, setIsClosingImageUploading] = useState(false);
    const [expandedGuestId, setExpandedGuestId] = useState<string | null>(null);
    const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
    const [rsvpResponses, setRsvpResponses] = useState<StoredRsvpResponse[]>(loadStoredRsvpResponses);
    const [isRsvpLoading, setIsRsvpLoading] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(Boolean(restoredDashboardDraft));
    const [saveStatus, setSaveStatus] = useState('');
    const [saveError, setSaveError] = useState('');
    const [saveErrorDetail, setSaveErrorDetail] = useState('');
    const [previewError, setPreviewError] = useState('');
    const [previewRefreshNonce, setPreviewRefreshNonce] = useState(0);
    const [isPreviewRefreshing, setIsPreviewRefreshing] = useState(false);
    const weddingDataRef = useRef(weddingData);
    const hasUnsavedChangesRef = useRef(Boolean(restoredDashboardDraft));
    const activeDraftStorageKeyRef = useRef(dashboardDraftStorageKey);
    const isAdminMode = mode === 'admin';
    const hasDashboardGuestAccess = isAdminMode || canManageGuests(weddingData);
    const hasDashboardRsvpAccess = isAdminMode || canViewRsvpDashboard(weddingData);
    const showPlanUpgrade = !isAdminMode && canUpgradePlan(weddingData);
    const weddingWebsiteUrl = `${window.location.origin}/${weddingData.wedding.slug}`;
    const paymentWhatsAppContext: PaymentWhatsAppContext = {
        email: user?.email,
        slug: weddingData.wedding.slug,
        websiteUrl: weddingWebsiteUrl,
        brideName: weddingData.couple.brideName,
        groomName: weddingData.couple.groomName,
        coupleDisplayName: weddingData.couple.displayName,
        packageType: weddingData.wedding.packageType,
    };
    const showTechnicalSaveDetail = Boolean(saveErrorDetail);
    const adminRlsHint = ' Admin access requires RLS policies allowing admins to read and update weddings, events, guests, guest_event_invites, and RSVP responses.';

    useEffect(() => {
        document.title = `${title} | Shaadi Nyota`;
        const previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'auto';

        return () => {
            document.body.style.overflow = previousBodyOverflow;
        };
    }, [title]);

    useEffect(() => {
        weddingDataRef.current = weddingData;
    }, [weddingData]);

    useEffect(() => {
        hasUnsavedChangesRef.current = hasUnsavedChanges;
    }, [hasUnsavedChanges]);

    useEffect(() => {
        const warnBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!hasUnsavedChangesRef.current) return;
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', warnBeforeUnload);
        return () => window.removeEventListener('beforeunload', warnBeforeUnload);
    }, []);

    useEffect(() => {
        if (activeTab === 'rsvp' && hasDashboardRsvpAccess) {
            if (supabaseWeddingId) {
                setIsRsvpLoading(true);
                loadSupabaseRsvpResponses(
                    supabaseWeddingId,
                    weddingData.wedding.slug,
                    weddingData.rsvp.guests
                ).then((result) => {
                    setIsRsvpLoading(false);
                    if (!result.error) {
                        setRsvpResponses(result.responses);
                    } else {
                        console.warn('Could not load RSVP responses', result.error);
                        setSaveError('Could not load RSVP responses.');
                    }
                });
            } else {
                setRsvpResponses(loadStoredRsvpResponses());
            }
        }
    }, [activeTab, hasDashboardRsvpAccess, supabaseWeddingId, weddingData.wedding.slug, weddingData.rsvp.guests]);

    useEffect(() => {
        setSelectedGuestIds((current) => current.filter((id) => (
            weddingData.rsvp.guests.some((guest) => guest.id === id)
        )));
    }, [weddingData.rsvp.guests]);

    useEffect(() => {
        if (initialWedding) {
            const draftScopeChanged = activeDraftStorageKeyRef.current !== dashboardDraftStorageKey;
            activeDraftStorageKeyRef.current = dashboardDraftStorageKey;
            if (!draftScopeChanged && hasUnsavedChangesRef.current) return;
            const restoredDraft = supabaseWeddingId ? readDashboardDraft(dashboardDraftStorageKey) : null;
            if (restoredDraft) {
                const nextDraft = applyAuthoritativePlanState(restoredDraft, initialWedding);
                setWeddingData(nextDraft);
                weddingDataRef.current = nextDraft;
                setHasUnsavedChanges(true);
                hasUnsavedChangesRef.current = true;
                setSaveStatus('Unsaved draft restored');
                return;
            }
            const nextWedding = normalizeWedding(initialWedding);
            setWeddingData(nextWedding);
            weddingDataRef.current = nextWedding;
            setHasUnsavedChanges(false);
            hasUnsavedChangesRef.current = false;
        }
    }, [dashboardDraftStorageKey, initialWedding, supabaseWeddingId]);

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

    const previewKey = useMemo(() => `${previewRefreshNonce}:${JSON.stringify(weddingData)}`, [previewRefreshNonce, weddingData]);
    const previewGuest = useMemo<WeddingGuest>(() => ({
        id: 'dashboard-preview-guest',
        guestName: 'Preview Guest',
        phone: '',
        invitedCount: 1,
        category: 'Preview',
        inviteCode: 'preview',
        invitedEventIds: weddingData.events.map((event) => event.id),
        mealPreference: '',
    }), [weddingData.events]);
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
    const areAllFilteredGuestsSelected = filteredGuestRows.length > 0 && filteredGuestRows.every(({ guest }) => (
        selectedGuestIds.includes(guest.id)
    ));
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
        setWeddingData((current) => {
            const nextWedding = updater(current);
            weddingDataRef.current = nextWedding;
            if (supabaseWeddingId) {
                writeDashboardDraft(dashboardDraftStorageKey, nextWedding);
            } else {
                window.localStorage.setItem(mockDashboardDraftStorageKey, JSON.stringify(nextWedding));
            }
            return nextWedding;
        });
        hasUnsavedChangesRef.current = true;
        setHasUnsavedChanges(true);
        setSaveStatus('');
        setSaveError('');
        setSaveErrorDetail('');
    };

    const handleSaveDraft = async () => {
        const weddingToSave = weddingDataRef.current;
        setSaveError('');
        setSaveErrorDetail('');
        setSaveStatus('Saving...');

        if (supabaseWeddingId) {
            if (validation.slug || validation.brideName || validation.groomName) {
                setSaveStatus('');
                setSaveError('Could not save wedding details. Please fix the highlighted wedding fields.');
                return;
            }

            const result = await updateWeddingShell({
                weddingId: supabaseWeddingId,
                brideName: weddingToSave.couple.brideName.trim(),
                groomName: weddingToSave.couple.groomName.trim(),
                displayName: weddingToSave.couple.displayName.trim(),
                slug: weddingToSave.wedding.slug.trim(),
                themeKey: weddingToSave.wedding.themeKey.trim(),
                pageTitle: weddingToSave.wedding.pageTitle.trim(),
            });

            if (result.error) {
                console.warn('Could not save wedding details', result.error);
                setSaveStatus('');
                setSaveErrorDetail(result.error);
                setSaveError(result.error.toLowerCase().includes('duplicate') || result.error.toLowerCase().includes('unique')
                    ? 'This slug is already in use. Please choose another slug.'
                    : result.error);
                return;
            }

            const settingsResult = await saveSupabaseWeddingSettings(supabaseWeddingId, weddingToSave);
            if (settingsResult.error) {
                console.error('Could not save wedding settings', {
                    error: settingsResult.error,
                    weddingId: supabaseWeddingId,
                    mode,
                });
                setSaveStatus('');
                setSaveErrorDetail(settingsResult.error);
                setSaveError(`Could not save wedding settings. If you recently added builder sections, run the latest Supabase migration SQL and try again.${isAdminMode ? adminRlsHint : ''}`);
                return;
            }

            const relationalResult = await saveSupabaseRelationalData(
                supabaseWeddingId,
                weddingToSave.events,
                weddingToSave.rsvp.guests,
                'replace'
            );
            if (relationalResult.error) {
                console.error('Could not save events and guests transactionally', {
                    error: relationalResult.detail || relationalResult.error,
                    weddingId: supabaseWeddingId,
                    mode,
                    events: weddingToSave.events.map((event) => ({
                        id: event.id,
                        eventName: event.eventName,
                        eventKey: event.eventKey,
                        eventVisualKey: event.eventVisualKey,
                        eventAnimationKey: event.eventAnimationKey,
                    })),
                });
                setSaveStatus('');
                setSaveErrorDetail(relationalResult.detail || relationalResult.error);
                setSaveError(`${relationalResult.error}${isAdminMode ? adminRlsHint : ''}`);
                return;
            }
            weddingToSave.events = relationalResult.events;
            weddingToSave.rsvp.guests = relationalResult.guests;
        }

        if (supabaseWeddingId) {
            clearDashboardDraft(dashboardDraftStorageKey);
        } else {
            window.localStorage.setItem(mockDashboardDraftStorageKey, JSON.stringify(weddingToSave));
        }
        hasUnsavedChangesRef.current = false;
        setHasUnsavedChanges(false);
        setSaveStatus('Saved');
    };

    const handleResetDraft = async () => {
        clearDashboardDraft(dashboardDraftStorageKey);
        window.localStorage.removeItem(mockDashboardDraftStorageKey);
        if (supabaseWeddingId) {
            const refreshed = await loadSupabaseWeddingBundle(supabaseWeddingId, { includeGuests: true });
            const nextWedding = refreshed.wedding ?? normalizeWedding(initialWedding ?? dashboardBaseWedding);
            setWeddingData(nextWedding);
            weddingDataRef.current = nextWedding;
        } else {
            const nextWedding = cloneWedding(initialWedding ?? dashboardBaseWedding);
            setWeddingData(nextWedding);
            weddingDataRef.current = nextWedding;
        }
        hasUnsavedChangesRef.current = false;
        setHasUnsavedChanges(false);
        setSaveStatus('');
        setSaveError('');
        setSaveErrorDetail('');
    };

    const refreshPreview = async () => {
        setPreviewError('');
        setIsPreviewRefreshing(true);

        try {
            if (supabaseWeddingId && !hasUnsavedChangesRef.current) {
                const refreshed = await loadSupabaseWeddingBundle(supabaseWeddingId, { includeGuests: true });
                if (refreshed.error || !refreshed.wedding) {
                    console.error('Preview load failed:', refreshed.error);
                    setPreviewError('Could not load preview. Please refresh or try again.');
                    setIsPreviewRefreshing(false);
                    return;
                }

                const nextWedding = normalizeWedding(refreshed.wedding);
                setWeddingData(nextWedding);
                weddingDataRef.current = nextWedding;
            }

            setPreviewRefreshNonce((current) => current + 1);
        } catch (error) {
            console.error('Preview load failed:', error);
            setPreviewError('Could not load preview. Please refresh or try again.');
        } finally {
            setIsPreviewRefreshing(false);
        }
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

    const updateClosing = <Key extends keyof SampleWeddingData['closing']>(
        key: Key,
        value: SampleWeddingData['closing'][Key]
    ) => {
        updateWeddingData((current) => ({
            ...current,
            closing: {
                ...current.closing,
                [key]: value,
            },
        }));
    };

    const setClosingGalleryImage = (target: number | 'add', imageSrc: string) => {
        updateWeddingData((current) => {
            const images = current.closing.carouselImages.filter(Boolean);
            if (target === 'add') {
                if (!images.includes(imageSrc)) {
                    images.push(imageSrc);
                }
            } else {
                images[target] = imageSrc;
            }
            return {
                ...current,
                closing: {
                    ...current.closing,
                    includePhotos: true,
                    carouselImages: images.slice(0, closingGalleryMaxImages),
                },
            };
        });
        setClosingImagePickerTarget(null);
    };

    const removeClosingGalleryImage = (index: number) => {
        updateWeddingData((current) => ({
            ...current,
            closing: {
                ...current.closing,
                carouselImages: current.closing.carouselImages.filter((_, imageIndex) => imageIndex !== index),
            },
        }));
    };

    const uploadClosingGalleryImage = async (file: File) => {
        if (!supabaseWeddingId || !supabase) {
            console.error('Closing Gallery upload failed: Supabase Storage is only available for saved Supabase weddings.');
            setSaveError('Could not upload image. Supabase Storage is only available for saved Supabase weddings.');
            return;
        }
        if (closingImagePickerTarget === null) return;

        setSaveError('');
        setIsClosingImageUploading(true);
        const safeName = file.name
            .toLowerCase()
            .replace(/[^a-z0-9.]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        const storagePath = `weddings/${supabaseWeddingId}/closing-gallery/${Date.now()}-${safeName || 'photo'}`;
        const { error: uploadError } = await supabase.storage
            .from(closingGalleryBucket)
            .upload(storagePath, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (uploadError) {
            setIsClosingImageUploading(false);
            console.error('Closing Gallery upload failed:', uploadError);
            setSaveError(`Could not upload image. ${uploadError.message}`);
            return;
        }

        const { data } = supabase.storage.from(closingGalleryBucket).getPublicUrl(storagePath);
        setClosingGalleryImage(closingImagePickerTarget, data.publicUrl);
        setIsClosingImageUploading(false);
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
            eventKey: '',
            eventVisualKey: '',
            eventTextStyle: 'auto',
            eventAnimationKey: 'none',
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
                console.warn('Could not add event', result.error);
                setSaveErrorDetail(result.error ?? '');
                setSaveError(`Could not add event.${isAdminMode ? adminRlsHint : ''}`);
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
        const assignedGuests = weddingData.rsvp.guests.filter((guest) => guest.invitedEventIds.includes(eventToDelete?.id ?? '')).length;
        const responseCount = rsvpResponses.filter((response) => response.eventId === eventToDelete?.id).length;
        const impact = assignedGuests || responseCount
            ? ` This will also permanently remove ${assignedGuests} guest assignment${assignedGuests === 1 ? '' : 's'} and ${responseCount} RSVP response${responseCount === 1 ? '' : 's'}.`
            : '';
        if (!eventToDelete || !window.confirm(`Delete ${eventToDelete.eventName || 'this event'}?${impact}`)) return;
        if (supabaseWeddingId && eventToDelete) {
            const result = await deleteSupabaseEvent(supabaseWeddingId, eventToDelete.id);
            if (result.error) {
                console.warn('Could not delete event', result.error);
                setSaveErrorDetail(result.detail || result.error);
                setSaveError(`${result.error}${isAdminMode ? adminRlsHint : ''}`);
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
            replaceSupabaseGuestInvites(supabaseWeddingId, currentGuest.id, nextEventIds, weddingData.events).then((result) => {
                if (result.error) {
                    console.warn('Could not update guest events', result.error);
                    setSaveErrorDetail(result.detail || result.error);
                    setSaveError(`${result.error}${isAdminMode ? adminRlsHint : ''}`);
                }
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
                console.warn('Could not add guest', result.error);
                setSaveErrorDetail(result.error ?? '');
                setSaveError(`Could not add guest.${isAdminMode ? adminRlsHint : ''}`);
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
        if (!guestToDelete || !window.confirm(`Delete ${guestToDelete.guestName || 'this guest'}?`)) return;
        if (supabaseWeddingId && guestToDelete) {
            const result = await deleteSupabaseGuest(supabaseWeddingId, guestToDelete.id);
            if (result.error) {
                console.error('Could not delete guest', result.error);
                setSaveError(`Could not delete guest.${isAdminMode ? adminRlsHint : ''}`);
                setSaveErrorDetail(result.detail || result.error);
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
        setSelectedGuestIds((current) => current.filter((guestId) => guestId !== guestToDelete.id));
        setSaveStatus('Guest deleted');
    };

    const getGuestInviteLink = (guest: WeddingGuest) => {
        return `/${weddingData.wedding.slug}/invite/${guest.inviteCode}`;
    };

    const copyGuestInviteLink = async (guest: WeddingGuest) => {
        const link = `${window.location.origin}${getGuestInviteLink(guest)}`;
        await window.navigator.clipboard?.writeText(link);
    };

    const copyWeddingWebsiteUrl = async () => {
        await window.navigator.clipboard?.writeText(weddingWebsiteUrl);
        setSaveStatus('Copied website URL');
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
            const result = await importSupabaseGuests(supabaseWeddingId, importedGuests, guestImportMode, weddingData.events);
            if (result.error) {
                console.warn('Could not import CSV', result.detail || result.error);
                setGuestImportWarnings([...warnings, `${result.error}${isAdminMode ? adminRlsHint : ''}`]);
                return;
            }
            const refreshed = await loadSupabaseWeddingBundle(supabaseWeddingId, { includeGuests: true });
            if (refreshed.wedding) {
                const nextWedding = normalizeWedding(refreshed.wedding);
                setWeddingData(nextWedding);
                writeDashboardDraft(dashboardDraftStorageKey, nextWedding);
                hasUnsavedChangesRef.current = true;
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

    const applyMusic = (audioSrc: string) => {
        const selectedMusic = musicOptions.find((option) => option.value === audioSrc);
        updateWeddingData((current) => ({
            ...current,
            music: {
                ...current.music,
                audioSrc,
                title: selectedMusic?.label ?? current.music.title,
            },
        }));
    };

    const handlePaymentVerificationRequest = async () => {
        const hadUnsavedChanges = hasUnsavedChangesRef.current;
        setSaveError('');
        setSaveErrorDetail('');
        setSaveStatus('Requesting payment verification...');

        if (supabaseWeddingId) {
            const result = await updateWeddingPaymentStatus({
                weddingId: supabaseWeddingId,
                paymentStatus: 'manual_pending',
            });

            if (result.error) {
                setSaveStatus('');
                setSaveErrorDetail(result.error);
                setSaveError('Could not request payment verification. If Supabase says the status is invalid, run the manual payment status migration SQL.');
                return;
            }

        }

        const nextWedding: SampleWeddingData = {
            ...weddingDataRef.current,
            wedding: {
                ...weddingDataRef.current.wedding,
                paymentStatus: 'manual_pending',
            },
        };
        weddingDataRef.current = nextWedding;
        setWeddingData(nextWedding);

        if (supabaseWeddingId && hadUnsavedChanges) {
            writeDashboardDraft(dashboardDraftStorageKey, nextWedding);
        } else if (!supabaseWeddingId) {
            window.localStorage.setItem(mockDashboardDraftStorageKey, JSON.stringify(nextWedding));
        }

        hasUnsavedChangesRef.current = hadUnsavedChanges;
        setHasUnsavedChanges(hadUnsavedChanges);
        setSaveStatus('Verification request submitted. We will review your payment and make the website live within 24-48 hours.');
    };

    const toggleGuestSelection = (guestId: string) => {
        setSelectedGuestIds((current) => (
            current.includes(guestId)
                ? current.filter((id) => id !== guestId)
                : [...current, guestId]
        ));
    };

    const toggleAllFilteredGuests = () => {
        const filteredIds = filteredGuestRows.map(({ guest }) => guest.id);
        setSelectedGuestIds((current) => (
            areAllFilteredGuestsSelected
                ? current.filter((id) => !filteredIds.includes(id))
                : Array.from(new Set([...current, ...filteredIds]))
        ));
    };

    const deleteSelectedGuests = async () => {
        const guestsToDelete = weddingData.rsvp.guests.filter((guest) => selectedGuestIds.includes(guest.id));
        if (!guestsToDelete.length) return;
        if (!window.confirm(`Delete ${guestsToDelete.length} selected guest${guestsToDelete.length === 1 ? '' : 's'}?`)) return;

        if (supabaseWeddingId) {
            const result = await deleteSupabaseGuests(supabaseWeddingId, guestsToDelete.map((guest) => guest.id));
            if (result.error) {
                console.error('Could not delete selected guests', result.detail || result.error);
                setSaveError(`${result.error}${isAdminMode ? adminRlsHint : ''}`);
                setSaveErrorDetail(result.detail || result.error);
                return;
            }

            const refreshed = await loadSupabaseWeddingBundle(supabaseWeddingId, { includeGuests: true });
            if (refreshed.error || !refreshed.wedding) {
                console.error('Could not refresh guests after bulk delete', refreshed.error);
                setSaveError('Guests were deleted, but the guest list could not refresh. Please reload the page.');
                setSaveErrorDetail(refreshed.error || 'No wedding data returned.');
                setSelectedGuestIds([]);
                return;
            }

            const nextWedding = normalizeWedding(refreshed.wedding);
            setWeddingData(nextWedding);
            weddingDataRef.current = nextWedding;
            setSelectedGuestIds([]);
            setExpandedGuestId(null);
            setSaveStatus(`Deleted ${guestsToDelete.length} guest${guestsToDelete.length === 1 ? '' : 's'}`);
            setSaveError('');
            setSaveErrorDetail('');
            return;
        }

        const deletedIds = new Set(guestsToDelete.map((guest) => guest.id));
        updateWeddingData((current) => ({
            ...current,
            rsvp: {
                ...current.rsvp,
                guests: current.rsvp.guests.filter((guest) => !deletedIds.has(guest.id)),
            },
        }));
        setSelectedGuestIds([]);
        setExpandedGuestId((current) => current && deletedIds.has(current) ? null : current);
        setSaveStatus(`Deleted ${guestsToDelete.length} guest${guestsToDelete.length === 1 ? '' : 's'}`);
    };

    const applyRevealAnimation = (option: (typeof revealAnimationOptions)[number]) => {
        if (option.disabled) return;
        updateWeddingData((current) => ({
            ...current,
            hero: {
                ...current.hero,
                revealStyle: option.revealStyle,
                videoSrc: option.videoSrc,
                posterSrc: option.posterSrc,
                revealImageShowAtSeconds: option.revealImageShowAtSeconds,
                heroFadeAtSeconds: option.heroFadeAtSeconds,
            },
        }));
    };

    const applyRevealedImage = (option: (typeof revealedImageOptions)[number]) => {
        updateWeddingData((current) => ({
            ...current,
            hero: {
                ...current.hero,
                revealImageSrc: option.imageSrc,
                revealImageType: option.imageType,
                revealImageAlt: option.altText,
            },
        }));
    };

    const applyStoryImage = (option: (typeof storyImageOptions)[number]) => {
        updateWeddingData((current) => ({
            ...current,
            couple: {
                ...current.couple,
                backgroundImageSrc: option.imageSrc,
                imageAlt: option.altText,
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
                    <p className="dashboard-eyebrow">{eyebrow}</p>
                    <h1>{title}</h1>
                    {user?.email && <p className="dashboard-auth-user">{user.email}</p>}
                </div>
                {authNotice && <p className="dashboard-auth-notice">{authNotice}</p>}
                <div className="dashboard-draft-bar">
                    <span className={hasUnsavedChanges ? 'unsaved' : 'saved'}>
                        {hasUnsavedChanges ? 'Unsaved changes' : saveStatus || 'Draft ready'}
                    </span>
                    {saveError && <em>{saveError}</em>}
                    {showTechnicalSaveDetail && <em className="technical-detail">Technical detail: {saveErrorDetail}</em>}
                    <button type="button" onClick={handleResetDraft}>Reset Draft</button>
                    {isConfigured && <button type="button" onClick={handleLogout}>Logout</button>}
                </div>
                <nav className="dashboard-tabs" aria-label="Dashboard sections">
                    {dashboardTabGroups.map((group) => (
                        <div className="dashboard-tab-group" key={group.label}>
                            <p className="dashboard-tab-group-label">{group.label}</p>
                            {group.tabs.map((tab) => {
                                const isLockedTab = (tab.id === 'guests' && !hasDashboardGuestAccess)
                                    || (tab.id === 'rsvp' && !hasDashboardRsvpAccess);

                                return (
                                    <button
                                        key={tab.id}
                                        className={`${activeTab === tab.id ? 'active' : ''}${isLockedTab ? ' locked' : ''}`}
                                        onClick={() => setActiveTab(tab.id)}
                                        type="button"
                                    >
                                        {tab.label}{isLockedTab ? ' Locked' : ''}
                                    </button>
                                );
                            })}
                        </div>
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
                                helperText={packageDetails[weddingData.wedding.packageType].summary}
                            />
                            <ReadOnlyBadgeCard
                                label="Status"
                                value={weddingData.wedding.status}
                                helperText="Publishing is handled after payment/admin verification."
                            />
                            <InfoBlock label="Payment" value={paymentStatusLabels[weddingData.wedding.paymentStatus]} />
                        </div>
                        <ManualPaymentCard
                            packageType={weddingData.wedding.packageType}
                            paymentStatus={weddingData.wedding.paymentStatus}
                            whatsAppContext={paymentWhatsAppContext}
                            onRequestVerification={handlePaymentVerificationRequest}
                        />
                        {showPlanUpgrade && <RsvpUpgradeCard whatsAppContext={paymentWhatsAppContext} />}
                        <WebsiteUrlCard
                            url={weddingWebsiteUrl}
                            onCopy={copyWeddingWebsiteUrl}
                        />
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
                                ? 'Core wedding, event, guest, and RSVP data is saved securely.'
                                : 'Development fallback mode is active because Supabase is not configured.'}
                        </p>
                    </div>
                )}

                {activeTab === 'opening-reveal' && (
                    <div className="dashboard-panel opening-reveal-panel">
                        <div className="dashboard-panel-header dashboard-panel-header-row">
                            <div>
                                <p className="dashboard-eyebrow">Opening Reveal</p>
                                <h2>Edit the invite intro</h2>
                            </div>
                            <button className="dashboard-primary-btn" type="button" onClick={handleSaveDraft}>
                                Save Opening Reveal
                            </button>
                        </div>
                        <p className="dashboard-note">
                            Opening Reveal combines the first animation with the image guests see when the animation completes.
                        </p>

                        <div className="opening-reveal-layout">
                            <div className="opening-reveal-editor-groups">
                                <section className="opening-reveal-group">
                                    <div className="opening-reveal-group-header">
                                        <span>Reveal Animation</span>
                                        <p>Choose the opening sequence, poster, tap text, and music.</p>
                                    </div>
                                    <div className="opening-reveal-option-grid">
                                        {revealAnimationOptions.map((option) => (
                                            <OpeningRevealOptionCard
                                                key={option.key}
                                                label={option.label}
                                                helper={option.helper}
                                                meta={option.themeLabel}
                                                imageSrc={option.posterSrc}
                                                selected={weddingData.hero.revealStyle === option.revealStyle && weddingData.hero.videoSrc === option.videoSrc}
                                                disabled={option.disabled}
                                                onClick={() => applyRevealAnimation(option)}
                                            />
                                        ))}
                                    </div>
                                    <div className="form-grid opening-reveal-fields">
                                        <TextField label="Tap to Reveal Text" value={weddingData.hero.revealCtaText} onChange={(value) => updateHero('revealCtaText', value)} />
                                        <SelectField
                                            label="Music / Audio"
                                            value={resolveAssetPath(weddingData.music.audioSrc)}
                                            options={musicOptions.map((option) => option.value)}
                                            optionLabels={musicOptionLabels}
                                            onChange={applyMusic}
                                        />
                                    </div>
                                </section>

                                <section className="opening-reveal-group">
                                    <div className="opening-reveal-group-header">
                                        <span>Revealed Image</span>
                                        <p>This image appears after the opening animation completes.</p>
                                    </div>
                                    <div className="opening-reveal-option-grid">
                                        {revealedImageOptions.map((option) => (
                                            <OpeningRevealOptionCard
                                                key={option.key}
                                                label={option.label}
                                                helper={option.helper}
                                                meta={option.themeLabel}
                                                imageSrc={option.imageSrc}
                                                selected={weddingData.hero.revealImageSrc === option.imageSrc}
                                                onClick={() => applyRevealedImage(option)}
                                            />
                                        ))}
                                    </div>
                                </section>
                            </div>

                            <OpeningRevealPreview
                                hero={weddingData.hero}
                                couple={weddingData.couple}
                                musicTitle={weddingData.music.title}
                                musicSrc={weddingData.music.audioSrc}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'our-story' && (
                    <div className="dashboard-panel our-story-panel">
                        <div className="dashboard-panel-header dashboard-panel-header-row">
                            <div>
                                <p className="dashboard-eyebrow">Our Story</p>
                                <h2>Edit the couple story</h2>
                            </div>
                            <button className="dashboard-primary-btn" type="button" onClick={handleSaveDraft}>
                                Save Our Story
                            </button>
                        </div>
                        <p className="dashboard-note">
                            Our Story uses one shared data model across all templates.
                        </p>

                        <div className="our-story-layout">
                            <div className="our-story-editor-groups">
                                <section className="our-story-group">
                                    <label className="dashboard-check">
                                        <input
                                            type="checkbox"
                                            checked={weddingData.couple.enabled}
                                            onChange={(event) => updateCouple('enabled', event.target.checked)}
                                        />
                                        Show Our Story
                                    </label>
                                    <div className="form-grid">
                                        <TextField label="Couple Display Name" value={weddingData.couple.displayName} onChange={(value) => updateCouple('displayName', value)} />
                                        <TextField label="Subtitle" value={weddingData.couple.introLine} onChange={(value) => updateCouple('introLine', value)} />
                                        <TextField label="Story Title" value={weddingData.couple.storyTitle} onChange={(value) => updateCouple('storyTitle', value)} />
                                    </div>
                                    <label className="dashboard-field">
                                        <span>Story Text</span>
                                        <textarea
                                            value={weddingData.couple.storyText}
                                            onChange={(event) => updateCouple('storyText', event.target.value)}
                                            rows={5}
                                        />
                                    </label>
                                </section>

                                <section className="our-story-group">
                                    <div className="opening-reveal-group-header">
                                        <span>Story Image</span>
                                        <p>Choose the visual that appears in your story section.</p>
                                    </div>
                                    <div className="our-story-image-grid">
                                        {storyImageOptions.map((option) => (
                                            <button
                                                key={option.key}
                                                className={`story-image-card ${resolveAssetPath(weddingData.couple.backgroundImageSrc) === option.imageSrc ? 'selected' : ''}`}
                                                type="button"
                                                onClick={() => applyStoryImage(option)}
                                            >
                                                <img src={resolveAssetPath(option.imageSrc)} alt="" />
                                                <strong>{option.label}</strong>
                                                <span>{option.themeLabel}</span>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            <OurStoryPreview couple={weddingData.couple} />
                        </div>
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
                                    <div className="event-editor-body">
                                        <div className="event-editor-fields form-grid">
                                            <TextField label="Event name" value={event.eventName} error={validation.events[index]?.eventName} onChange={(value) => updateEvent(index, 'eventName', value)} />
                                            <SelectField
                                                label="Event type"
                                                value={event.eventKey ?? ''}
                                                options={eventTypeOptions}
                                                optionLabels={eventTypeLabels}
                                                onChange={(value) => updateEvent(index, 'eventKey', value)}
                                            />
                                            <SelectField
                                                label="Text Style"
                                                value={event.eventTextStyle ?? 'auto'}
                                                options={eventTextStyleOptions}
                                                optionLabels={eventTextStyleLabels}
                                                onChange={(value) => updateEvent(index, 'eventTextStyle', value as WeddingEvent['eventTextStyle'])}
                                            />
                                            <SelectField
                                                label="Event Animation"
                                                value={normalizeEventAnimationKey(event.eventAnimationKey)}
                                                options={eventAnimationKeys}
                                                optionLabels={eventAnimationOptionLabels}
                                                onChange={(value) => updateEvent(index, 'eventAnimationKey', value as WeddingEvent['eventAnimationKey'])}
                                            />
                                            <TextField label="Date" value={event.date} error={validation.events[index]?.date} onChange={(value) => updateEvent(index, 'date', value)} />
                                            <TextField label="Start time" value={event.startTime} error={validation.events[index]?.startTime} onChange={(value) => updateEvent(index, 'startTime', value)} />
                                            <TextField label="Venue name" value={event.venueName} error={validation.events[index]?.venueName} onChange={(value) => updateEvent(index, 'venueName', value)} />
                                            <TextField label="City" value={event.city} onChange={(value) => updateEvent(index, 'city', value)} />
                                            <TextField label="Google Maps link (optional)" value={event.mapsUrl} onChange={(value) => updateEvent(index, 'mapsUrl', value)} />
                                        </div>
                                        <EventVisualPicker
                                            event={event}
                                            themeKey={weddingData.wedding.themeKey}
                                            onSelect={(visualKey) => updateEvent(index, 'eventVisualKey', visualKey)}
                                        />
                                    </div>
                                </div>
                            ))}
                            {weddingData.events.length === 0 && (
                                <p className="dashboard-note">No events yet. Add your first event.</p>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'guests' && (hasDashboardGuestAccess ? (
                    <div className="dashboard-panel">
                        <div className="dashboard-panel-header dashboard-panel-header-row">
                            <div>
                                <p className="dashboard-eyebrow">Guests</p>
                                <h2>Guest invite links</h2>
                            </div>
                            <div className="dashboard-header-actions">
                                {selectedGuestIds.length > 0 && (
                                    <button className="dashboard-primary-btn secondary delete-selected-btn" type="button" onClick={deleteSelectedGuests}>
                                        Delete selected ({selectedGuestIds.length})
                                    </button>
                                )}
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
                                        <th className="guest-select-column">
                                            <input
                                                aria-label="Select all visible guests"
                                                className="guest-select-checkbox"
                                                type="checkbox"
                                                checked={areAllFilteredGuestsSelected}
                                                onChange={toggleAllFilteredGuests}
                                            />
                                        </th>
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
                                                <td className="guest-select-column">
                                                    <input
                                                        aria-label={`Select ${guest.guestName || 'guest'}`}
                                                        className="guest-select-checkbox"
                                                        type="checkbox"
                                                        checked={selectedGuestIds.includes(guest.id)}
                                                        onChange={() => toggleGuestSelection(guest.id)}
                                                    />
                                                </td>
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
                                                    <td colSpan={8}>
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
                                <p className="dashboard-note">
                                    {weddingData.rsvp.guests.length === 0
                                        ? 'No guests yet. Add guests manually or import CSV.'
                                        : 'No guests match this search.'}
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <RsvpPlanLockedPanel title="Guest management is locked" whatsAppContext={paymentWhatsAppContext} />
                ))}

                {activeTab === 'rsvp' && (hasDashboardRsvpAccess ? (
                    <div className="dashboard-panel rsvp-dashboard-panel">
                        <div className="dashboard-panel-header dashboard-panel-header-row">
                            <div>
                                <p className="dashboard-eyebrow">RSVP Dashboard</p>
                                <h2>RSVP analytics</h2>
                            </div>
                            <div className="dashboard-header-actions">
                                <button className="dashboard-primary-btn secondary" type="button" onClick={exportRsvpCsv}>
                                    Export RSVP CSV
                                </button>
                                {!supabaseWeddingId && (
                                    <button className="dashboard-primary-btn secondary" type="button" onClick={clearMockRsvpResponses}>
                                        Clear Fallback RSVP Responses
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
                        {isRsvpLoading && <p className="dashboard-note">Loading RSVP responses...</p>}
                        {!isRsvpLoading && rsvpResponses.filter((response) => response.weddingSlug === weddingData.wedding.slug).length === 0 && (
                            <p className="dashboard-note">No RSVP responses yet.</p>
                        )}

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
                ) : (
                    <RsvpPlanLockedPanel title="RSVP Dashboard is locked" whatsAppContext={paymentWhatsAppContext} />
                ))}

                {activeTab === 'closing-gallery' && (
                    <div className="dashboard-panel closing-gallery-panel">
                        <div className="dashboard-panel-header dashboard-panel-header-row">
                            <div>
                                <p className="dashboard-eyebrow">Closing Gallery</p>
                                <h2>Edit the final thank-you section</h2>
                            </div>
                            <button className="dashboard-primary-btn" type="button" onClick={handleSaveDraft}>
                                Save Closing Gallery
                            </button>
                        </div>
                        <p className="dashboard-note">
                            Closing Gallery appears at the end of the invite. The thank-you section always uses the common invite design; couple photos are optional.
                        </p>

                        <div className="closing-gallery-layout">
                            <div className="closing-gallery-editor-groups">
                                <section className="closing-gallery-group">
                                    <label className="dashboard-check">
                                        <input
                                            type="checkbox"
                                            checked={weddingData.closing.includePhotos}
                                            onChange={(event) => updateClosing('includePhotos', event.target.checked)}
                                        />
                                        Include Couple Photos
                                    </label>
                                    <div className="form-grid">
                                        <TextField label="Closing Line" value={weddingData.closing.closingLine} onChange={(value) => updateClosing('closingLine', value)} />
                                        <TextField label="Couple Display Name" value={weddingData.closing.coupleDisplayName} onChange={(value) => updateClosing('coupleDisplayName', value)} />
                                    </div>
                                    <label className="dashboard-field">
                                        <span>Thank You Message</span>
                                        <textarea
                                            value={weddingData.closing.message}
                                            onChange={(event) => updateClosing('message', event.target.value)}
                                            rows={4}
                                        />
                                    </label>
                                </section>

                                {weddingData.closing.includePhotos && (
                                    <section className="closing-gallery-group">
                                        <div className="opening-reveal-group-header">
                                            <span>Gallery Images</span>
                                            <p>Add up to three photos. Choose a preset or upload an image from your computer.</p>
                                        </div>
                                        <div className="closing-selected-grid">
                                            {weddingData.closing.carouselImages.filter(Boolean).slice(0, closingGalleryMaxImages).map((imageSrc, imageIndex) => (
                                                <article className="closing-selected-card" key={`${imageSrc}-${imageIndex}`}>
                                                    <img src={resolveAssetPath(imageSrc)} alt="" />
                                                    <div>
                                                        <strong>Photo {imageIndex + 1}</strong>
                                                        <span>{imageSrc.startsWith('/assets/') ? 'Preset image' : 'Uploaded image'}</span>
                                                    </div>
                                                    <div className="closing-selected-actions">
                                                        <button type="button" onClick={() => setClosingImagePickerTarget(imageIndex)}>Replace</button>
                                                        <button type="button" onClick={() => removeClosingGalleryImage(imageIndex)}>Remove</button>
                                                    </div>
                                                </article>
                                            ))}
                                            {weddingData.closing.carouselImages.filter(Boolean).length === 0 && (
                                                <p className="dashboard-note compact">No photos selected yet.</p>
                                            )}
                                        </div>
                                        {weddingData.closing.carouselImages.filter(Boolean).length < closingGalleryMaxImages && (
                                            <button className="dashboard-primary-btn secondary" type="button" onClick={() => setClosingImagePickerTarget('add')}>
                                                Add Photo
                                            </button>
                                        )}
                                        {closingImagePickerTarget !== null && (
                                            <div className="closing-picker-panel">
                                                <div className="closing-picker-header">
                                                    <div>
                                                        <strong>{closingImagePickerTarget === 'add' ? 'Add photo' : 'Replace photo'}</strong>
                                                        <span>Choose a preset or upload your own image.</span>
                                                    </div>
                                                    <button type="button" onClick={() => setClosingImagePickerTarget(null)}>Close</button>
                                                </div>
                                                <label className="closing-upload-control">
                                                    <span>{isClosingImageUploading ? 'Uploading...' : 'Upload Image'}</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        disabled={isClosingImageUploading}
                                                        onChange={(event) => {
                                                            const file = event.target.files?.[0];
                                                            if (file) {
                                                                void uploadClosingGalleryImage(file);
                                                            }
                                                            event.target.value = '';
                                                        }}
                                                    />
                                                </label>
                                                <div className="closing-image-grid">
                                                    {closingImagePresets.map((option) => (
                                                        <button
                                                            key={option.key}
                                                            className="story-image-card"
                                                            type="button"
                                                            onClick={() => setClosingGalleryImage(closingImagePickerTarget, option.imageSrc)}
                                                        >
                                                            <img src={resolveAssetPath(option.imageSrc)} alt="" />
                                                            <strong>{option.label}</strong>
                                                            <span>{option.themeLabel}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </section>
                                )}
                            </div>

                            <ClosingGalleryPreview closing={weddingData.closing} />
                        </div>
                    </div>
                )}

                {activeTab === 'preview' && (
                    <div className="dashboard-panel preview-panel">
                        <div className="dashboard-panel-header dashboard-panel-header-row">
                            <div>
                                <p className="dashboard-eyebrow">Preview</p>
                                <h2>Wedding website preview</h2>
                            </div>
                            <button className="dashboard-primary-btn secondary" type="button" onClick={refreshPreview} disabled={isPreviewRefreshing}>
                                {isPreviewRefreshing ? 'Refreshing...' : 'Refresh Preview'}
                            </button>
                        </div>
                        <p className="dashboard-note">This preview loads the complete guest experience with all events visible.</p>
                        {previewError && <p className="dashboard-error-message">{previewError}</p>}
                        <div className="dashboard-preview-frame">
                            <DashboardPreviewErrorBoundary
                                resetKey={previewKey}
                                onError={(error) => {
                                    console.error('Preview render failed:', error);
                                    setPreviewError('Could not load preview. Please refresh or try again.');
                                }}
                            >
                                <InviteExperience
                                    key={previewKey}
                                    data={weddingData}
                                    embedded
                                    guest={previewGuest}
                                    visibleEvents={weddingData.events}
                                    personalizedInviteMode
                                    enableResponsiveOpeningVideo={false}
                                    forceEventsVisible
                                />
                            </DashboardPreviewErrorBoundary>
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}

function OpeningRevealOptionCard({
    label,
    helper,
    meta,
    imageSrc,
    selected,
    disabled = false,
    onClick,
}: {
    label: string;
    helper: string;
    meta: string;
    imageSrc: string;
    selected: boolean;
    disabled?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            className={`or-option-card ${selected ? 'selected' : ''}`}
            type="button"
            disabled={disabled}
            onClick={onClick}
        >
            {imageSrc ? (
                <img src={resolveAssetPath(imageSrc)} alt="" />
            ) : (
                <span className="or-option-placeholder">Soon</span>
            )}
            <strong>{label}</strong>
            <span>{meta}</span>
            <p>{helper}</p>
        </button>
    );
}

function OpeningRevealPreview({
    hero,
    couple,
    musicTitle,
    musicSrc,
}: {
    hero: SampleWeddingData['hero'];
    couple: SampleWeddingData['couple'];
    musicTitle: string;
    musicSrc: string;
}) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const [previewState, setPreviewState] = useState<'poster' | 'playing' | 'paused' | 'revealed'>('poster');
    const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
    const [revealTriggeredAt, setRevealTriggeredAt] = useState<number | null>(null);
    const [revealImageOpacity, setRevealImageOpacity] = useState(0);
    const [previewAudioEnabled, setPreviewAudioEnabled] = useState(false);
    const hasVideo = Boolean(hero.videoSrc.trim());
    const hasPoster = Boolean(hero.posterSrc.trim());
    const resolvedMusicSrc = resolveAssetPath(musicSrc);
    const hasMusic = Boolean(resolvedMusicSrc.trim());
    const isScrollOpeningPreview = isScrollReveal(hero);
    const revealLayerVisible = true;
    const revealedImageSrc = resolveAssetPath(hero.revealImageSrc || (isScrollOpeningPreview ? couple.backgroundImageSrc : ''));
    const revealedImageAlt = hero.revealImageAlt || couple.displayName || 'Revealed image';
    const hasRevealImage = Boolean(revealedImageSrc.trim());

    useEffect(() => {
        setPreviewState('poster');
        setPreviewCurrentTime(0);
        setRevealTriggeredAt(null);
        setRevealImageOpacity(0);
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setPreviewAudioEnabled(false);
        if (animationFrameRef.current) {
            window.cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    }, [hero.videoSrc, hero.posterSrc, hero.revealImageSrc, hero.revealCtaText, couple.backgroundImageSrc, musicSrc]);

    useEffect(() => () => {
        audioRef.current?.pause();
    }, []);

    useEffect(() => {
        if (previewState !== 'playing') {
            if (animationFrameRef.current) {
                window.cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            return undefined;
        }

        const tick = () => {
            if (!videoRef.current) return;
            const currentTime = videoRef.current.currentTime;
            setPreviewCurrentTime(currentTime);

            const duration = videoRef.current.duration;
            const progress = getOpeningRevealCrossfadeProgress(currentTime, duration);
            setRevealImageOpacity(progress);
            if (progress > 0 && revealTriggeredAt === null) {
                setRevealTriggeredAt(currentTime);
            }

            animationFrameRef.current = window.requestAnimationFrame(tick);
        };

        animationFrameRef.current = window.requestAnimationFrame(tick);

        return () => {
            if (animationFrameRef.current) {
                window.cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [previewState, revealTriggeredAt]);

    const playPreview = (restart = false) => {
        if (!hasVideo) {
            setPreviewState('revealed');
            return;
        }

        setPreviewState('playing');
        window.setTimeout(() => {
            if (!videoRef.current) return;
            if (restart) {
                videoRef.current.currentTime = 0;
                if (audioRef.current) audioRef.current.currentTime = 0;
            }
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => {
                audioRef.current?.pause();
                setPreviewState('revealed');
            });
            if (previewAudioEnabled && audioRef.current) {
                audioRef.current.play().catch(() => setPreviewAudioEnabled(false));
            }
        }, 0);
    };

    const pausePreview = () => {
        if (videoRef.current && previewState === 'playing') {
            videoRef.current.pause();
            audioRef.current?.pause();
            setPreviewCurrentTime(videoRef.current.currentTime);
            setPreviewState('paused');
        }
    };

    const replayPreview = () => {
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setPreviewCurrentTime(0);
        setRevealTriggeredAt(null);
        setRevealImageOpacity(0);
        setPreviewState('poster');
    };

    const handlePreviewClick = () => {
        if (previewState === 'poster') {
            playPreview(true);
            return;
        }
        if (previewState === 'playing') {
            pausePreview();
            return;
        }
        if (previewState === 'paused') {
            playPreview(false);
            return;
        }
        replayPreview();
    };

    const togglePreviewAudio = () => {
        if (!audioRef.current || !hasMusic) return;
        if (previewAudioEnabled) {
            audioRef.current.pause();
            setPreviewAudioEnabled(false);
            return;
        }

        setPreviewAudioEnabled(true);
        if (previewState === 'playing') {
            audioRef.current.play().catch(() => setPreviewAudioEnabled(false));
        }
    };

    return (
        <aside className="or-preview-card">
            <span className="event-preview-label">Opening Reveal preview</span>
            <div
                className={[
                    'or-preview-frame',
                    `or-preview-frame-${previewState}`,
                    'or-preview-frame-crossfade',
                    revealLayerVisible ? 'or-preview-frame-reveal-visible' : '',
                ].filter(Boolean).join(' ')}
                role="button"
                tabIndex={0}
                aria-label="Opening Reveal preview frame"
                onClick={handlePreviewClick}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handlePreviewClick();
                    }
                }}
            >
                {hasPoster ? (
                    <img className="or-preview-poster" src={resolveAssetPath(hero.posterSrc)} alt="" />
                ) : (
                    <div className="or-preview-empty">Poster image missing</div>
                )}
                {hasVideo && (
                    <video
                        ref={videoRef}
                        className="or-preview-video"
                        src={resolveAssetPath(hero.videoSrc)}
                        poster={resolveAssetPath(hero.posterSrc)}
                        muted
                        playsInline
                        preload="metadata"
                        onEnded={() => {
                            audioRef.current?.pause();
                            setRevealTriggeredAt(videoRef.current?.currentTime ?? null);
                            setRevealImageOpacity(1);
                            setPreviewState('revealed');
                        }}
                    />
                )}
                {hasMusic && (
                    <>
                        <audio ref={audioRef} src={resolvedMusicSrc} preload="metadata" loop />
                        <button
                            className={`or-preview-audio-toggle ${previewAudioEnabled ? 'is-on' : ''}`}
                            type="button"
                            aria-pressed={previewAudioEnabled}
                            aria-label={previewAudioEnabled ? 'Turn preview music off' : 'Turn preview music on'}
                            onClick={(event) => {
                                event.stopPropagation();
                                togglePreviewAudio();
                            }}
                        >
                            Music {previewAudioEnabled ? 'On' : 'Off'}
                        </button>
                    </>
                )}
                <div className="or-preview-scrim" />
                {previewState === 'poster' && (
                    <div className="or-preview-cta">
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                playPreview(true);
                            }}
                        >
                            {hero.revealCtaText || 'Tap to Reveal'}
                        </button>
                    </div>
                )}
                {previewState === 'paused' && (
                    <div className="or-preview-paused">
                        <span>Paused</span>
                        <strong>Tap to resume</strong>
                    </div>
                )}
                {revealLayerVisible && (
                    <div
                        className="or-preview-image-stage"
                        style={{ opacity: previewState === 'revealed' ? 1 : revealImageOpacity }}
                    >
                        {hasRevealImage ? (
                            <img src={revealedImageSrc} alt={revealedImageAlt} />
                        ) : (
                            <div className="or-preview-empty">Revealed image missing</div>
                        )}
                        {previewState === 'revealed' && (
                            <>
                                <OpeningRevealScrollPrompt compact />
                                <button
                                    className="or-preview-replay"
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        replayPreview();
                                    }}
                                >
                                    Play Again
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
            <div className="or-preview-meta">
                <strong>{revealStyleLabels[hero.revealStyle] ?? hero.revealStyle}</strong>
                <span>{revealImageTypeLabels[hero.revealImageType] ?? hero.revealImageType}</span>
                <p>Reveal image softly enters during the final {openingRevealCrossfadeSeconds.toFixed(2)}s of the video.</p>
                <p>
                    Preview clock: {previewCurrentTime.toFixed(2)}s
                    {revealTriggeredAt !== null ? ` / image triggered at ${revealTriggeredAt.toFixed(2)}s` : ''}
                </p>
                <p>Music is off by default in the editor. Use the in-frame control to hear it.</p>
                {musicTitle && <p>Music: {musicTitle}</p>}
            </div>
        </aside>
    );
}

function OurStoryPreview({
    couple,
}: {
    couple: SampleWeddingData['couple'];
}) {
    return (
        <aside className="story-preview-card">
            <span className="event-preview-label">Scaled preview of the Our Story section</span>
            <div className="story-preview-frame live-section-preview">
                {couple.enabled ? (
                    <Section2 couple={couple} />
                ) : (
                    <div className="story-preview-empty">Our Story section is hidden.</div>
                )}
            </div>
        </aside>
    );
}

function ClosingGalleryPreview({
    closing,
}: {
    closing: SampleWeddingData['closing'];
}) {
    return (
        <aside className="closing-preview-card">
            <span className="event-preview-label">Scaled preview of the Closing Gallery section</span>
            <div className="closing-preview-frame live-section-preview">
                <Section5 closing={closing} />
            </div>
        </aside>
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

function ManualPaymentCard({
    packageType,
    paymentStatus,
    whatsAppContext,
    onRequestVerification,
}: {
    packageType: SampleWeddingData['wedding']['packageType'];
    paymentStatus: SampleWeddingData['wedding']['paymentStatus'];
    whatsAppContext: PaymentWhatsAppContext;
    onRequestVerification: () => void;
}) {
    const plan = packageDetails[packageType];
    const isPaid = paymentStatus === 'paid';
    const isPending = paymentStatus === 'manual_pending' || paymentStatus === 'ref_pending';
    const manualPaymentWhatsAppUrl = buildManualPaymentWhatsAppUrl(whatsAppContext);

    return (
        <section className={`manual-payment-card ${paymentStatus}`}>
            <div className="manual-payment-header">
                <div>
                    <span className="manual-payment-eyebrow">Manual payment</span>
                    <h3>{isPaid ? 'Your Plan Is Active' : 'Complete Your Payment'}</h3>
                </div>
                <strong>{paymentStatusLabels[paymentStatus]}</strong>
            </div>
            <div className="manual-payment-plan">
                <span>{getPackageDisplayLabel(packageType)}</span>
                <strong>{plan.priceLabel}</strong>
            </div>
            <p>{paymentStatusDescriptions[paymentStatus]}</p>
            <ul>
                {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                ))}
            </ul>
            {!isPaid && (
                <div className="manual-payment-instructions">
                    <strong>Manual Payment Required</strong>
                    {paymentConfig.instructions.map((instruction) => (
                        <p key={instruction}>{instruction}</p>
                    ))}
                    <p className="manual-payment-note">{paymentConfig.paymentNote}</p>
                </div>
            )}
            <div className="manual-payment-actions">
                {!isPaid && (
                    <a className="dashboard-primary-btn secondary" href={manualPaymentWhatsAppUrl} target="_blank" rel="noreferrer">
                        Contact on WhatsApp
                    </a>
                )}
                {!isPaid && !isPending && (
                    <button className="dashboard-primary-btn" type="button" onClick={onRequestVerification}>
                        Request verification
                    </button>
                )}
            </div>
        </section>
    );
}

function RsvpUpgradeCard({ whatsAppContext }: { whatsAppContext: PaymentWhatsAppContext }) {
    const rsvpUpgradeWhatsAppUrl = buildRsvpUpgradeWhatsAppUrl({
        ...whatsAppContext,
        packageType: 'rsvp',
    });

    return (
        <section className="dashboard-upgrade-card">
            <p className="dashboard-eyebrow">Upgrade</p>
            <h3>Unlock RSVP Management</h3>
            <p>
                Manage guests, event-wise invitations, RSVP responses, and meal preferences.
            </p>
            <p>
                If you have already paid for your current plan, you only need to pay the difference amount.
                After payment, request verification and our team will update your plan.
            </p>
            <a className="dashboard-primary-btn" href={rsvpUpgradeWhatsAppUrl} target="_blank" rel="noreferrer">
                Request Upgrade
            </a>
        </section>
    );
}

function RsvpPlanLockedPanel({
    title,
    whatsAppContext,
}: {
    title: string;
    whatsAppContext: PaymentWhatsAppContext;
}) {
    return (
        <div className="dashboard-panel dashboard-locked-panel">
            <div>
                <p className="dashboard-eyebrow">Plan Locked</p>
                <h2>{title}</h2>
                <p>RSVP Management is not included in your current plan.</p>
                <p>
                    Upgrade to Basic Website + RSVP Management to manage guest lists, event-wise invites,
                    RSVP responses, and meal preferences.
                </p>
            </div>
            <RsvpUpgradeCard whatsAppContext={whatsAppContext} />
        </div>
    );
}

function WebsiteUrlCard({
    url,
    onCopy,
}: {
    url: string;
    onCopy: () => void;
}) {
    return (
        <section className="website-url-card">
            <div>
                <p className="dashboard-eyebrow">Website URL</p>
                <a href={url} target="_blank" rel="noreferrer">{url}</a>
            </div>
            <div className="website-url-actions">
                <button className="dashboard-primary-btn secondary" type="button" onClick={onCopy}>
                    Copy URL
                </button>
                <a className="dashboard-primary-btn" href={url} target="_blank" rel="noreferrer">
                    Open Website
                </a>
            </div>
        </section>
    );
}

function EventVisualPicker({
    event,
    themeKey,
    onSelect,
}: {
    event: WeddingEvent;
    themeKey: string;
    onSelect: (visualKey: string) => void;
}) {
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [styleFilter, setStyleFilter] = useState('all');
    const recommendedVisual = getRecommendedVisualForEvent(event.eventName, event.eventKey, themeKey);
    const selectedVisual = getEventVisualByKey(event.eventVisualKey) ?? recommendedVisual;
    const selectedKey = event.eventVisualKey ?? '';
    const selectedVisualKey = selectedVisual?.key ?? selectedKey;
    const categoryFilterOptions = [
        { key: 'all', label: 'All' },
        { key: 'haldi', label: 'Haldi' },
        { key: 'mehendi', label: 'Mehendi' },
        { key: 'sangeet', label: 'Sangeet / Music' },
        { key: 'wedding', label: 'Wedding / Nikaah' },
        { key: 'reception', label: 'Reception / Walima' },
        { key: 'generic', label: 'Generic' },
    ];
    const availableStyles = Array.from(new Set(
        eventVisuals
            .map((visual) => visual.style)
            .filter((style): style is string => Boolean(style))
    )).sort((a, b) => (
        (eventVisualStyleLabels[a] ?? a).localeCompare(eventVisualStyleLabels[b] ?? b)
    ));
    const styleFilterOptions = [
        { key: 'all', label: 'All styles' },
        ...availableStyles.map((style) => ({
            key: style,
            label: eventVisualStyleLabels[style] ?? style,
        })),
    ];
    const filteredVisuals = categoryFilter === 'all'
        ? eventVisuals
        : eventVisuals.filter((visual) => visual.eventType === categoryFilter);
    const styleFilteredVisuals = styleFilter === 'all'
        ? filteredVisuals
        : filteredVisuals.filter((visual) => visual.style === styleFilter);
    const previewEvent = {
        ...event,
        eventName: event.eventName || 'Wedding Event',
        date: event.date || 'Date',
        startTime: event.startTime || 'Time',
        venueName: event.venueName || 'Venue name',
        city: event.city || 'City',
    };

    useEffect(() => {
        setCategoryFilter('all');
        setStyleFilter('all');
    }, [themeKey]);

    return (
        <div className="event-visual-picker">
            <div>
                <span className="event-preview-label">Scaled preview of the event section</span>
                <div className="event-live-preview">
                    <div className="event-live-preview-surface phone-canvas">
                        <Theme1EventPreviewSection
                            event={previewEvent}
                            showParticles={false}
                        />
                    </div>
                </div>
            </div>

            <div className="event-visual-picker-summary">
                <div>
                    <span>Selected visual</span>
                    <strong>{selectedKey ? selectedVisual?.label ?? 'Selected visual' : 'Auto recommendation'}</strong>
                    <p>{selectedKey ? 'This visual is saved with the event.' : recommendedVisual ? `Auto uses ${recommendedVisual.label}.` : 'Auto uses the fallback visual.'}</p>
                    <p>
                        Animation: {getEventAnimationLabel(event.eventAnimationKey)}
                        {isEventAnimationRecommended(event.eventAnimationKey, event.eventKey, event.eventName) ? ' (recommended)' : ''}
                    </p>
                </div>
                {eventVisuals.length > 0 && (
                    <button
                        className="dashboard-primary-btn secondary"
                        type="button"
                        onClick={() => setIsPickerOpen(true)}
                    >
                        Change Visual
                    </button>
                )}
            </div>

            {eventVisuals.length === 0 && (
                <p className="dashboard-note compact">
                    Event visual cards will appear here when assets are available.
                </p>
            )}

            {isPickerOpen && eventVisuals.length > 0 && (
                <div className="event-visual-modal-backdrop" role="presentation" onClick={() => setIsPickerOpen(false)}>
                    <div
                        className="event-visual-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Choose event visual"
                        onClick={(clickEvent) => clickEvent.stopPropagation()}
                    >
                        <div className="event-visual-modal-header">
                            <div>
                                <span>Choose event visual</span>
                                <strong>{event.eventName || 'Wedding Event'}</strong>
                            </div>
                            <button type="button" onClick={() => setIsPickerOpen(false)}>Close</button>
                        </div>

                        <div className="event-visual-filter-group">
                            <span>Event category</span>
                            <div className="event-visual-filters" role="list" aria-label="Filter event visuals by category">
                                {categoryFilterOptions.map((filter) => (
                                    <button
                                        key={filter.key}
                                        className={categoryFilter === filter.key ? 'active' : ''}
                                        type="button"
                                        onClick={() => setCategoryFilter(filter.key)}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="event-visual-filter-group">
                            <span>Style</span>
                            <div className="event-visual-filters" role="list" aria-label="Filter event visuals by style">
                                {styleFilterOptions.map((filter) => (
                                    <button
                                        key={filter.key}
                                        className={styleFilter === filter.key ? 'active' : ''}
                                        type="button"
                                        onClick={() => setStyleFilter(filter.key)}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="event-visual-card-grid modal-grid">
                            <EventVisualCard
                                visual={recommendedVisual}
                                label="Auto recommendation"
                                helper={recommendedVisual ? `${eventVisualStyleLabels[recommendedVisual.style ?? ''] ?? recommendedVisual.style ?? 'Style'} / ${recommendedVisual.label}` : 'Uses fallback visual'}
                                selected={!selectedKey}
                                onClick={() => {
                                    onSelect('');
                                    setIsPickerOpen(false);
                                }}
                            />
                            {styleFilteredVisuals.map((visual) => (
                                <EventVisualCard
                                    key={visual.key}
                                    visual={visual}
                                    label={visual.label}
                                    helper={`${eventVisualStyleLabels[visual.style ?? ''] ?? visual.style ?? 'Style'} / ${eventTypeLabels[visual.eventType] ?? visual.eventType}`}
                                    selected={selectedVisualKey === visual.key}
                                    onClick={() => {
                                        onSelect(visual.key);
                                        setIsPickerOpen(false);
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function EventVisualCard({
    visual,
    label,
    helper,
    selected,
    onClick,
}: {
    visual?: EventVisual;
    label: string;
    helper: string;
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            className={`event-visual-card ${selected ? 'selected' : ''}`}
            type="button"
            onClick={onClick}
        >
            {visual ? (
                <img src={resolveAssetPath(visual.imageSrc)} alt="" />
            ) : (
                <span className="event-visual-card-empty">Auto</span>
            )}
            <strong>{label}</strong>
            <span>{helper}</span>
        </button>
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
