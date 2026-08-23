import { Component, Fragment, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
    Check,
    CheckCircle2,
    CircleAlert,
    Clock3,
    Copy,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Eye,
    LockKeyhole,
    Pencil,
} from 'lucide-react';
import InviteExperience from './InviteExperience';
import OpeningRevealScrollPrompt from './OpeningRevealScrollPrompt';
import { EventSection as Theme1EventPreviewSection } from './Section3';
import Section2 from './Section2';
import Section5 from './Section5';
import WeddingMediaLibrary from './WeddingMediaLibrary';
import './Dashboard.css';
import { useAuth } from '../context/AuthContext';
import { updateWeddingPaymentStatus, updateWeddingShell } from '../lib/weddingOnboarding';
import {
    createSupabaseEvent,
    deleteSupabaseEvent,
    deleteSupabaseGuests,
    importSupabaseGuests,
    loadSupabaseRsvpResponses,
    loadSupabaseWeddingBundle,
    replaceSupabaseGuestInvites,
    saveSupabaseRelationalData,
    saveSupabaseWeddingSettings,
} from '../lib/supabaseWeddingData';
import {
    loadGuestMessageHistory,
    recordGuestMessageSent,
    removeGuestMessageHistoryEntry,
    type GuestMessageHistoryEntry,
    type GuestMessageType,
} from '../lib/guestMessageHistory';
import {
    DEFAULT_GUEST_RECORD_LIMIT,
    DEFAULT_INVITEE_LIMIT,
    MAX_GUEST_CSV_BYTES,
    MAX_GUEST_FAMILY_SIZE,
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
import {
    defaultWhatsAppInviteMessage,
    defaultWhatsAppReminderMessage,
    getDefaultWhatsAppPreviewDescription,
    getDefaultWhatsAppPreviewTitle,
    normalizeWhatsAppInviteMessage,
    renderWhatsAppInviteMessage,
    whatsAppInviteEmojis,
    whatsAppInviteVariables,
} from '../data/whatsappInviteMessages';
import {
    deleteWeddingMedia,
    loadWeddingMedia,
    uploadWeddingMedia,
    type WeddingMediaAsset,
    type WeddingMediaSection,
} from '../lib/weddingMedia';
import { getGuestPhoneIdentity, validateGuestPhone } from '../lib/guestPhone';

type DashboardTab = 'overview' | 'opening-reveal' | 'our-story' | 'couple' | 'events' | 'guests' | 'whatsapp' | 'rsvp-settings' | 'rsvp' | 'closing-gallery' | 'preview';
type WebsiteActivationState = 'unpaid' | 'verification-pending' | 'publishing-pending' | 'live' | 'suspended';
type CsvImportMode = 'append' | 'replace';
type GuestCsvIssueLevel = 'error' | 'warning';
type GuestCsvIssue = {
    level: GuestCsvIssueLevel;
    message: string;
    row?: number;
    column?: string;
    value?: string;
};
type GuestCsvAnalysis = {
    fileName: string;
    guests: WeddingGuest[];
    issues: GuestCsvIssue[];
    totalRows: number;
    validRows: number;
    resultingGuestEntries: number;
    resultingPeople: number;
    preservedGuests: number;
    phoneNormalizations: Array<{ row: number; input: string; canonical: string }>;
};
type ParsedCsvResult = {
    rows: string[][];
    error: string;
};

const guestCsvRequiredHeaders = ['guestName', 'phone'];
const guestCsvGuestNameMaxLength = 120;
const guestCsvPhoneMaxLength = 40;
const guestCsvCategoryMaxLength = 80;

const formatGuestCsvIssue = (issue: GuestCsvIssue) => {
    const location = [issue.row ? `Row ${issue.row}` : '', issue.column ?? ''].filter(Boolean).join(' - ');
    return `${location ? `${location}: ` : ''}${issue.message}`;
};

const normalizeGuestMatchValue = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
const getGuestIdentityKey = (guestName: string, phone: string) => (
    `${normalizeGuestMatchValue(guestName)}|${getGuestPhoneIdentity(phone)}`
);
type DashboardMode = 'couple' | 'admin';
type GuestWhatsAppFilter = 'all' | 'invite-not-sent' | 'invite-sent' | 'no-reminders' | 'reminders-sent';
type GuestRsvpFilter = 'all' | 'no-response' | 'pending' | 'complete' | 'attending' | 'maybe' | 'declined';
type GuestEditableField = 'guestName' | 'phone' | 'category' | 'invitedCount';
type GuestActivityFilter = 'all' | 'never' | 'last-7-days' | 'older-than-7-days';
type GuestPhoneFilter = 'all' | 'available' | 'missing';

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
        label: 'Wedding Management',
        tabs: [
            { id: 'guests', label: 'Guest List' },
            { id: 'whatsapp', label: 'WhatsApp Message' },
            { id: 'rsvp-settings', label: 'RSVP Form' },
            { id: 'rsvp', label: 'RSVP Responses' },
        ],
    },
    {
        label: 'Review',
        tabs: [{ id: 'preview', label: 'Preview' }],
    },
];

const dashboardTabs = dashboardTabGroups.flatMap((group) => (
    group.tabs.map((tab) => ({ ...tab, groupLabel: group.label }))
));

const getWebsiteActivationState = (wedding: SampleWeddingData['wedding']): WebsiteActivationState => {
    if (wedding.status === 'suspended') return 'suspended';
    if (wedding.paymentStatus === 'manual_pending' || wedding.paymentStatus === 'ref_pending') {
        return 'verification-pending';
    }
    if (wedding.paymentStatus !== 'paid') return 'unpaid';
    if (wedding.status === 'published') return 'live';
    return 'publishing-pending';
};

const websiteActivationLabels: Record<WebsiteActivationState, string> = {
    unpaid: 'Not live',
    'verification-pending': 'Verification pending',
    'publishing-pending': 'Publishing pending',
    live: 'Live',
    suspended: 'Unavailable',
};
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
    thumbnailSrc: resolveAssetPath(option.thumbnailSrc ?? option.previewSrc ?? option.src),
    altText: option.altText,
    themeLabel: 'Reveal Image Library',
    helper: option.helper,
}));
const storyImageOptions = getAllStoryImages().map((option) => ({
    key: option.id,
    label: option.label,
    imageSrc: resolveAssetPath(option.src),
    thumbnailSrc: resolveAssetPath(option.thumbnailSrc ?? option.previewSrc ?? option.src),
    altText: option.altText,
    themeLabel: 'Our Story Library',
    visibility: option.visibility,
}));
const closingImagePresets = getAllClosingGalleryPresetPhotos().map((option) => ({
    key: option.id,
    label: option.label,
    imageSrc: resolveAssetPath(option.src),
    thumbnailSrc: resolveAssetPath(option.thumbnailSrc ?? option.previewSrc ?? option.src),
    themeLabel: option.sourceTheme === 'theme-2' ? 'Scroll Opening' : 'Preset Library',
}));
const sectionBackgroundPresets = [
    { key: 'plain', label: 'Plain', helper: 'Default clean section background', imageSrc: '' },
    { key: 'ivory-texture', label: 'Ivory Texture', helper: 'Soft paper texture', imageSrc: '/assets/shared/backgrounds/texture-background-ivory-01.png' },
    { key: 'floral-wash', label: 'Floral Wash', helper: 'Warm floral texture', imageSrc: '/assets/closing-gallery/backgrounds/closing-bg-scroll-floral-01.png' },
];
const musicOptions = Array.from(
    new Map(getAudioAssets().map((option) => [resolveAssetPath(option.src), option])).values()
).map((option) => ({
    value: resolveAssetPath(option.src),
    label: option.label,
}));
const musicOptionLabels = Object.fromEntries(musicOptions.map((option) => [option.value, option.label]));
const whatsAppPreviewFallbackImageSrc = '/assets/brand/shaadi-nyota-logo.png';
const closingGalleryMaxImages = 3;
const saveAllChangesLabel = 'Save All Changes';
const discardUnsavedChangesLabel = 'Discard Unsaved Changes';
const rsvpStatusLabels: Record<string, string> = {
    yes: 'Yes',
    no: 'No',
    maybe: 'Maybe',
    pending: 'Pending',
    '': 'Pending',
};
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
const eventTextPositionOptions = ['top', 'middle'];
const eventTextPositionLabels: Record<string, string> = {
    top: 'Top',
    middle: 'Middle',
};
const normalizeEventTextPositionOption = (position?: string): NonNullable<WeddingEvent['eventTextPosition']> => {
    if (position === 'middle' || position?.startsWith('center')) {
        return 'middle';
    }

    return 'top';
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

const guestCsvBaseHeaders = ['guestName', 'phone', 'familySize', 'category'];
const guestCsvMetadataHeaders = ['inviteCode', 'inviteLink'];
const guestCsvLegacyHeaders = ['invitedCount'];
const invitedCsvValues = new Set(['yes', 'y', 'true', '1']);
const notInvitedCsvValues = new Set(['no', 'n', 'false', '0']);
const guestPageSizeOptions = [25, 50, 100] as const;

const normalizeInvitedCount = (value: unknown) => (
    Math.max(1, Math.floor(Number(value) || 1))
);

function GuestFamilySizeInput({
    value,
    onCommit,
    onFinish,
    className = '',
    ariaLabel = 'Family Size',
    autoFocus = false,
}: {
    value: number;
    onCommit: (value: number) => boolean;
    onFinish?: () => void;
    className?: string;
    ariaLabel?: string;
    autoFocus?: boolean;
}) {
    const [draftValue, setDraftValue] = useState(String(value));

    const commitValue = () => {
        const parsedValue = Number(draftValue);
        if (!draftValue.trim() || !Number.isInteger(parsedValue) || parsedValue < 1) {
            setDraftValue(String(value));
            onFinish?.();
            return;
        }

        const didCommit = onCommit(parsedValue);
        setDraftValue(String(didCommit ? parsedValue : value));
        onFinish?.();
    };

    return (
        <input
            aria-label={ariaLabel}
            autoFocus={autoFocus}
            className={className}
            type="number"
            inputMode="numeric"
            min="1"
            max={MAX_GUEST_FAMILY_SIZE}
            value={draftValue}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => setDraftValue(event.target.value)}
            onBlur={commitValue}
            onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
                if (event.key === 'Escape') {
                    setDraftValue(String(value));
                    event.currentTarget.blur();
                }
            }}
        />
    );
}

const getGuestCapacityError = (wedding: SampleWeddingData) => {
    const guestRecordLimit = wedding.wedding.guestRecordLimit ?? DEFAULT_GUEST_RECORD_LIMIT;
    const inviteeLimit = wedding.wedding.inviteeLimit ?? DEFAULT_INVITEE_LIMIT;
    const totalPeople = wedding.rsvp.guests.reduce((total, guest) => total + normalizeInvitedCount(guest.invitedCount), 0);
    const oversizedGuest = wedding.rsvp.guests.find((guest) => normalizeInvitedCount(guest.invitedCount) > MAX_GUEST_FAMILY_SIZE);

    if (oversizedGuest) {
        return `${oversizedGuest.guestName || 'A guest entry'} has a Family Size above ${MAX_GUEST_FAMILY_SIZE}. Split larger groups into separate guest entries.`;
    }
    if (wedding.rsvp.guests.length > guestRecordLimit) {
        return `This wedding supports up to ${guestRecordLimit.toLocaleString()} guest entries. Remove extra entries or ask Shaadi Nyota to increase the limit.`;
    }
    if (totalPeople > inviteeLimit) {
        return `This wedding supports up to ${inviteeLimit.toLocaleString()} people. Reduce Family Size values or ask Shaadi Nyota to increase the limit.`;
    }

    return '';
};


const getGuestEventInvitedCount = (guest: WeddingGuest, eventId: string) => (
    normalizeInvitedCount(guest.invitedEventCounts?.[eventId] ?? guest.invitedCount)
);

const getGuestEventInviteScope = (guest: WeddingGuest, eventId: string) => (
    getGuestEventInvitedCount(guest, eventId) >= normalizeInvitedCount(guest.invitedCount) ? 'all' : 'number'
);

const buildWhatsAppUrl = (phone: string, message: string) => {
    const normalizedPhone = validateGuestPhone(phone).whatsappDigits;
    if (!normalizedPhone) return '';

    // WhatsApp Desktop can corrupt emoji text while handling wa.me deep links.
    // Keep the native wa.me flow on phones, and use WhatsApp Web directly on desktop.
    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
    const whatsAppUrl = isMobileDevice
        ? new URL(`https://wa.me/${normalizedPhone}`)
        : new URL('https://web.whatsapp.com/send');

    if (!isMobileDevice) {
        whatsAppUrl.searchParams.set('phone', normalizedPhone);
    }
    whatsAppUrl.searchParams.set('text', message);
    return whatsAppUrl.toString();
};

const normalizeCsvHeader = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const inviteeCountHeader = (eventName: string) => `${eventName} Invitees`;

const csvEscape = (value: string | number) => {
    const text = String(value ?? '');
    const spreadsheetSafeText = /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
    return /[",\r\n]/.test(spreadsheetSafeText) ? `"${spreadsheetSafeText.replace(/"/g, '""')}"` : spreadsheetSafeText;
};

const parseCsv = (text: string): ParsedCsvResult => {
    const sourceText = text.replace(/^\uFEFF/, '');
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let index = 0; index < sourceText.length; index += 1) {
        const char = sourceText[index];
        const nextChar = sourceText[index + 1];

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

    if (inQuotes) {
        return { rows: [], error: 'The CSV contains an unclosed quoted value. Export it again and retry.' };
    }

    return {
        rows: rows.filter((csvRow) => csvRow.some((cell) => cell.trim())),
        error: '',
    };
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
            const eventTextPosition = normalizeEventTextPositionOption(event.eventTextPosition);
            return {
                ...fallbackEvent,
                ...event,
                eventKey: event.eventKey ?? '',
                eventVisualKey: event.eventVisualKey ?? '',
                eventTextStyle,
                eventTextPosition,
                eventAnimationKey: normalizeEventAnimationKey(event.eventAnimationKey),
                eventShowCalendar: event.eventShowCalendar !== false,
                eventShowInvitedCount: event.eventShowInvitedCount === true,
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
        whatsapp: {
            ...defaults.whatsapp,
            ...wedding.whatsapp,
            inviteMessage: normalizeWhatsAppInviteMessage(wedding.whatsapp?.inviteMessage ?? defaultWhatsAppInviteMessage),
            reminderMessage: normalizeWhatsAppInviteMessage(wedding.whatsapp?.reminderMessage ?? defaultWhatsAppReminderMessage),
            previewTitle: wedding.whatsapp?.previewTitle ?? getDefaultWhatsAppPreviewTitle(mergedCouple.displayName),
            previewDescription: wedding.whatsapp?.previewDescription ?? getDefaultWhatsAppPreviewDescription(mergedCouple.displayName),
            previewImageSrc: wedding.whatsapp?.previewImageSrc ?? '',
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
            attendingCountEnabled: wedding.rsvp.attendingCountEnabled ?? defaults.rsvp.attendingCountEnabled,
            mealOptions: {
                ...defaults.rsvp.mealOptions,
                ...wedding.rsvp.mealOptions,
            },
            guests: (wedding.rsvp.guests ?? defaults.rsvp.guests).map((guest) => ({
                ...guest,
                invitedCount: normalizeInvitedCount(guest.invitedCount),
                invitedEventIds: guest.invitedEventIds ?? [],
                invitedEventCounts: guest.invitedEventCounts ?? {},
            })),
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

const dashboardTabIds = new Set<DashboardTab>(
    dashboardTabGroups.flatMap((group) => group.tabs.map((tab) => tab.id))
);

const createDashboardActiveTabStorageKey = (draftStorageKey: string) => `${draftStorageKey}:active-tab`;
const createDashboardScrollStorageKey = (draftStorageKey: string) => `${draftStorageKey}:scroll-y`;
const createEventVisualPickerStorageKey = (draftStorageKey: string) => `${draftStorageKey}:event-visual-picker`;

const readDashboardActiveTab = (storageKey: string): DashboardTab => {
    try {
        const storedTab = window.sessionStorage.getItem(storageKey) as DashboardTab | null;
        return storedTab && dashboardTabIds.has(storedTab) ? storedTab : 'overview';
    } catch {
        return 'overview';
    }
};

const writeDashboardActiveTab = (storageKey: string, tab: DashboardTab) => {
    try {
        window.sessionStorage.setItem(storageKey, tab);
    } catch {
        // Session storage may be unavailable in restricted browser contexts.
    }
};

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

const getWeddingMediaUsageLabels = (wedding: SampleWeddingData, imageSrc: string) => {
    const labels: string[] = [];
    if (wedding.hero.revealImageSrc === imageSrc) labels.push('Opening Reveal');
    if (wedding.couple.backgroundImageSrc === imageSrc) labels.push('Our Story');
    wedding.events.forEach((event) => {
        if ([event.eventVisualKey, event.foregroundImageSrc, event.backgroundImageSrc].includes(imageSrc)) {
            labels.push(event.eventName ? `Event: ${event.eventName}` : 'Events');
        }
    });
    if (wedding.rsvp.backgroundImageSrc === imageSrc) labels.push('RSVP');
    if (wedding.closing.backgroundImageSrc === imageSrc) labels.push('Closing background');
    if (wedding.closing.frameImageSrc === imageSrc) labels.push('Closing frame');
    if (wedding.closing.carouselImages.includes(imageSrc)) labels.push('Closing Gallery photos');
    if (wedding.whatsapp.previewImageSrc === imageSrc) labels.push('WhatsApp preview');
    return Array.from(new Set(labels));
};

const removeWeddingMediaReferences = (wedding: SampleWeddingData, imageSrc: string): SampleWeddingData => ({
    ...wedding,
    hero: {
        ...wedding.hero,
        revealImageSrc: wedding.hero.revealImageSrc === imageSrc ? '' : wedding.hero.revealImageSrc,
        skipRevealImage: wedding.hero.revealImageSrc === imageSrc ? true : wedding.hero.skipRevealImage,
    },
    couple: {
        ...wedding.couple,
        backgroundImageSrc: wedding.couple.backgroundImageSrc === imageSrc ? '' : wedding.couple.backgroundImageSrc,
    },
    events: wedding.events.map((event) => ({
        ...event,
        eventVisualKey: event.eventVisualKey === imageSrc ? '' : event.eventVisualKey,
        foregroundImageSrc: event.foregroundImageSrc === imageSrc ? '' : event.foregroundImageSrc,
        backgroundImageSrc: event.backgroundImageSrc === imageSrc ? '' : event.backgroundImageSrc,
    })),
    rsvp: {
        ...wedding.rsvp,
        backgroundImageSrc: wedding.rsvp.backgroundImageSrc === imageSrc ? '' : wedding.rsvp.backgroundImageSrc,
    },
    closing: {
        ...wedding.closing,
        backgroundImageSrc: wedding.closing.backgroundImageSrc === imageSrc ? '' : wedding.closing.backgroundImageSrc,
        frameImageSrc: wedding.closing.frameImageSrc === imageSrc ? '' : wedding.closing.frameImageSrc,
        carouselImages: wedding.closing.carouselImages.filter((src) => src !== imageSrc),
    },
    whatsapp: {
        ...wedding.whatsapp,
        previewImageSrc: wedding.whatsapp.previewImageSrc === imageSrc ? '' : wedding.whatsapp.previewImageSrc,
    },
});

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

const getMockGuestMessageHistoryStorageKey = (weddingSlug: string) => (
    `shaadiNyotaGuestMessageHistory:${weddingSlug}`
);

const loadStoredGuestMessageHistory = (weddingSlug: string) => {
    const storageKey = getMockGuestMessageHistoryStorageKey(weddingSlug);
    try {
        return JSON.parse(window.localStorage.getItem(storageKey) ?? '[]') as GuestMessageHistoryEntry[];
    } catch {
        window.localStorage.removeItem(storageKey);
        return [];
    }
};

const persistStoredGuestMessageHistory = (storageScope: string, entries: GuestMessageHistoryEntry[]) => {
    window.localStorage.setItem(getMockGuestMessageHistoryStorageKey(storageScope), JSON.stringify(entries));
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
    const dashboardActiveTabStorageKey = createDashboardActiveTabStorageKey(dashboardDraftStorageKey);
    const dashboardScrollStorageKey = createDashboardScrollStorageKey(dashboardDraftStorageKey);
    const eventVisualPickerStorageKey = createEventVisualPickerStorageKey(dashboardDraftStorageKey);
    const storedDashboardDraft = supabaseWeddingId ? readDashboardDraft(dashboardDraftStorageKey) : null;
    const restoredDashboardDraft = storedDashboardDraft
        ? applyAuthoritativePlanState(storedDashboardDraft, initialWedding)
        : null;
    const [activeTab, setActiveTab] = useState<DashboardTab>(() => readDashboardActiveTab(dashboardActiveTabStorageKey));
    const [weddingData, setWeddingData] = useState<SampleWeddingData>(() => (
        restoredDashboardDraft ?? (initialWedding ? normalizeWedding(initialWedding) : loadInitialWedding())
    ));
    const guestMessageHistoryStorageScope = supabaseWeddingId ?? weddingData.wedding.slug;
    const [guestSearchQuery, setGuestSearchQuery] = useState('');
    const [guestCategoryFilter, setGuestCategoryFilter] = useState('all');
    const [guestWhatsAppFilter, setGuestWhatsAppFilter] = useState<GuestWhatsAppFilter>('all');
    const [guestRsvpFilter, setGuestRsvpFilter] = useState<GuestRsvpFilter>('all');
    const [guestActivityFilter, setGuestActivityFilter] = useState<GuestActivityFilter>('all');
    const [guestPhoneFilter, setGuestPhoneFilter] = useState<GuestPhoneFilter>('all');
    const [areGuestFiltersOpen, setAreGuestFiltersOpen] = useState(false);
    const [guestPage, setGuestPage] = useState(1);
    const [guestPageSize, setGuestPageSize] = useState<(typeof guestPageSizeOptions)[number]>(25);
    const [guestImportMode, setGuestImportMode] = useState<CsvImportMode>('append');
    const [selectedGuestCsvFile, setSelectedGuestCsvFile] = useState<File | null>(null);
    const [guestCsvAnalysis, setGuestCsvAnalysis] = useState<GuestCsvAnalysis | null>(null);
    const [guestImportWarnings, setGuestImportWarnings] = useState<string[]>([]);
    const [isGuestCsvAnalyzing, setIsGuestCsvAnalyzing] = useState(false);
    const [isGuestCsvImporting, setIsGuestCsvImporting] = useState(false);
    const [guestCsvImportMessage, setGuestCsvImportMessage] = useState('');
    const guestCsvImportInFlightRef = useRef(false);
    const [closingImagePickerTarget, setClosingImagePickerTarget] = useState<number | 'add' | null>(null);
    const [isClosingImageUploading, setIsClosingImageUploading] = useState(false);
    const [expandedGuestId, setExpandedGuestId] = useState<string | null>(null);
    const [editingGuestField, setEditingGuestField] = useState<{ guestId: string; field: GuestEditableField } | null>(null);
    const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
    const [rsvpResponses, setRsvpResponses] = useState<StoredRsvpResponse[]>(loadStoredRsvpResponses);
    const [isRsvpLoading, setIsRsvpLoading] = useState(false);
    const [guestMessageHistory, setGuestMessageHistory] = useState<GuestMessageHistoryEntry[]>([]);
    const [isGuestMessageHistoryLoading, setIsGuestMessageHistoryLoading] = useState(false);
    const [whatsAppMessageMode, setWhatsAppMessageMode] = useState<GuestMessageType>('invitation');
    const [isWhatsAppPreviewImagePickerOpen, setIsWhatsAppPreviewImagePickerOpen] = useState(false);
    const [isWhatsAppPreviewImageUploading, setIsWhatsAppPreviewImageUploading] = useState(false);
    const [weddingMedia, setWeddingMedia] = useState<WeddingMediaAsset[]>([]);
    const [pendingWeddingMediaDeletions, setPendingWeddingMediaDeletions] = useState<WeddingMediaAsset[]>([]);
    const [isWeddingMediaLoading, setIsWeddingMediaLoading] = useState(false);
    const [weddingMediaSetupRequired, setWeddingMediaSetupRequired] = useState(false);
    const [mediaUploadingSection, setMediaUploadingSection] = useState<WeddingMediaSection | ''>('');
    const [guestMessageHistorySavingKey, setGuestMessageHistorySavingKey] = useState('');
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
    const activeTabStorageKeyRef = useRef(dashboardActiveTabStorageKey);
    const whatsappMessageTextareaRef = useRef<HTMLTextAreaElement | null>(null);
    const isAdminMode = mode === 'admin';
    const visibleStoryImageOptions = storyImageOptions.filter((option) => isAdminMode || option.visibility !== 'admin');
    const whatsAppPreviewImageOptions = Array.from(new Map([
        ...revealedImageOptions.map((option) => ({
            key: `whatsapp-reveal-${option.key}`,
            label: option.label,
            imageSrc: option.imageSrc,
            thumbnailSrc: option.thumbnailSrc,
            sectionLabel: 'Opening Reveal',
        })),
        ...visibleStoryImageOptions.map((option) => ({
            key: `whatsapp-story-${option.key}`,
            label: option.label,
            imageSrc: option.imageSrc,
            thumbnailSrc: option.thumbnailSrc,
            sectionLabel: 'Our Story',
        })),
        ...closingImagePresets.map((option) => ({
            key: `whatsapp-closing-${option.key}`,
            label: option.label,
            imageSrc: option.imageSrc,
            thumbnailSrc: option.thumbnailSrc,
            sectionLabel: 'Closing Gallery',
        })),
    ].filter((option) => Boolean(option.imageSrc)).map((option) => [option.imageSrc, option])).values());
    const usedWeddingMediaSources = useMemo(() => new Set([
        weddingData.hero.revealImageSrc,
        weddingData.couple.backgroundImageSrc,
        ...weddingData.events.flatMap((event) => [event.eventVisualKey, event.foregroundImageSrc, event.backgroundImageSrc]),
        weddingData.rsvp.backgroundImageSrc,
        weddingData.closing.backgroundImageSrc,
        weddingData.closing.frameImageSrc,
        ...weddingData.closing.carouselImages,
        weddingData.whatsapp.previewImageSrc,
    ].filter((value): value is string => Boolean(value))), [weddingData]);
    const isWeddingMediaInUse = (asset: WeddingMediaAsset) => usedWeddingMediaSources.has(asset.publicUrl);
    const pendingWeddingMediaDeletionIds = useMemo(
        () => new Set(pendingWeddingMediaDeletions.map((asset) => asset.id)),
        [pendingWeddingMediaDeletions]
    );
    const hasDashboardGuestAccess = isAdminMode || canManageGuests(weddingData);
    const hasDashboardRsvpAccess = isAdminMode || canViewRsvpDashboard(weddingData);
    const showPlanUpgrade = !isAdminMode && canUpgradePlan(weddingData);
    const weddingWebsiteUrl = `${window.location.origin}/${weddingData.wedding.slug}`;
    const websiteActivationState = getWebsiteActivationState(weddingData.wedding);
    const isWeddingWebsiteLive = websiteActivationState === 'live';
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
        if (activeTabStorageKeyRef.current === dashboardActiveTabStorageKey) return;
        activeTabStorageKeyRef.current = dashboardActiveTabStorageKey;
        setActiveTab(readDashboardActiveTab(dashboardActiveTabStorageKey));
    }, [dashboardActiveTabStorageKey]);

    useEffect(() => {
        let restoreFrame = 0;
        let settleFrame = 0;
        let persistFrame = 0;

        const persistScrollPosition = () => {
            try {
                window.sessionStorage.setItem(dashboardScrollStorageKey, String(window.scrollY));
            } catch {
                // Session storage may be unavailable in restricted browser contexts.
            }
        };
        const queueScrollPositionPersist = () => {
            if (persistFrame) return;
            persistFrame = window.requestAnimationFrame(() => {
                persistFrame = 0;
                persistScrollPosition();
            });
        };
        const restoreScrollPosition = () => {
            try {
                const storedScrollY = Number(window.sessionStorage.getItem(dashboardScrollStorageKey));
                if (!Number.isFinite(storedScrollY) || storedScrollY <= 0) return;
                restoreFrame = window.requestAnimationFrame(() => {
                    settleFrame = window.requestAnimationFrame(() => {
                        window.scrollTo({ top: storedScrollY, behavior: 'auto' });
                    });
                });
            } catch {
                // Keep the default scroll position when session storage is unavailable.
            }
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') persistScrollPosition();
        };

        restoreScrollPosition();
        window.addEventListener('scroll', queueScrollPositionPersist, { passive: true });
        window.addEventListener('pagehide', persistScrollPosition);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            persistScrollPosition();
            if (restoreFrame) window.cancelAnimationFrame(restoreFrame);
            if (settleFrame) window.cancelAnimationFrame(settleFrame);
            if (persistFrame) window.cancelAnimationFrame(persistFrame);
            window.removeEventListener('scroll', queueScrollPositionPersist);
            window.removeEventListener('pagehide', persistScrollPosition);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [dashboardScrollStorageKey]);

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
        let cancelled = false;

        const refreshWeddingMedia = async () => {
            await Promise.resolve();
            if (cancelled) return;

            if (!supabaseWeddingId) {
                setWeddingMedia([]);
                setWeddingMediaSetupRequired(false);
                return;
            }

            setIsWeddingMediaLoading(true);
            const result = await loadWeddingMedia(supabaseWeddingId);
            if (cancelled) return;

            setIsWeddingMediaLoading(false);
            setWeddingMedia(result.assets);
            setPendingWeddingMediaDeletions([]);
            setWeddingMediaSetupRequired(result.setupRequired);
            if (result.error && !result.setupRequired) {
                setSaveError(result.error);
            }
        };

        void refreshWeddingMedia();
        return () => {
            cancelled = true;
        };
    }, [supabaseWeddingId]);

    useEffect(() => {
        if ((activeTab === 'guests' || activeTab === 'rsvp') && hasDashboardRsvpAccess) {
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
        if (activeTab !== 'guests' || !hasDashboardGuestAccess) return;

        let cancelled = false;
        const cachedHistory = loadStoredGuestMessageHistory(guestMessageHistoryStorageScope);
        setGuestMessageHistory(cachedHistory);
        setIsGuestMessageHistoryLoading(Boolean(supabaseWeddingId));

        if (supabaseWeddingId) {
            loadGuestMessageHistory(supabaseWeddingId).then((result) => {
                if (cancelled) return;
                setIsGuestMessageHistoryLoading(false);
                if (result.error) {
                    setSaveError(result.error);
                    setSaveErrorDetail(result.detail);
                    return;
                }
                setGuestMessageHistory(result.entries);
                persistStoredGuestMessageHistory(guestMessageHistoryStorageScope, result.entries);
            });
        }

        return () => {
            cancelled = true;
        };
    }, [activeTab, guestMessageHistoryStorageScope, hasDashboardGuestAccess, supabaseWeddingId]);
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
                ? 'Website address is required.'
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
                phone: validateGuestPhone(guest.phone).error,
                invitedCount: guest.invitedCount < 1
                    ? 'Family size must be at least 1.'
                    : guest.invitedCount > MAX_GUEST_FAMILY_SIZE
                        ? 'Family size cannot exceed ' + MAX_GUEST_FAMILY_SIZE + '.'
                        : '',
                invitedEventIds: guest.invitedEventIds.length ? '' : 'Select at least one invited event.',
            })),
        };
    }, [weddingData]);

    const validationDetails = useMemo(() => {
        const details: string[] = [];
        if (validation.slug) details.push(`Website address: ${validation.slug}`);
        if (validation.brideName) details.push(`Couple details: ${validation.brideName}`);
        if (validation.groomName) details.push(`Couple details: ${validation.groomName}`);
        validation.events.forEach((eventValidation, index) => {
            const eventLabel = weddingData.events[index]?.eventName.trim() || `Event ${index + 1}`;
            if (eventValidation.eventName) details.push(`${eventLabel}: ${eventValidation.eventName}`);
            if (eventValidation.date) details.push(`${eventLabel}: ${eventValidation.date}`);
            if (eventValidation.startTime) details.push(`${eventLabel}: ${eventValidation.startTime}`);
            if (eventValidation.venueName) details.push(`${eventLabel}: ${eventValidation.venueName}`);
        });
        validation.guests.forEach((guestValidation, index) => {
            const guestLabel = weddingData.rsvp.guests[index]?.guestName.trim() || `Guest ${index + 1}`;
            if (guestValidation.guestName) details.push(`${guestLabel}: ${guestValidation.guestName}`);
            if (guestValidation.phone) details.push(`${guestLabel}: ${guestValidation.phone}`);
            if (guestValidation.invitedCount) details.push(`${guestLabel}: ${guestValidation.invitedCount}`);
            if (guestValidation.invitedEventIds) details.push(`${guestLabel}: ${guestValidation.invitedEventIds}`);
        });
        return details;
    }, [validation, weddingData.events, weddingData.rsvp.guests]);
    const validationCount = validationDetails.length;

    const previewKey = useMemo(() => `${previewRefreshNonce}:${JSON.stringify(weddingData)}`, [previewRefreshNonce, weddingData]);
    const previewGuest = useMemo<WeddingGuest>(() => ({
        id: 'dashboard-preview-guest',
        guestName: 'Preview Guest',
        phone: '',
        invitedCount: 1,
        category: 'Preview',
        inviteCode: 'preview',
        invitedEventIds: weddingData.events.map((event) => event.id),
        invitedEventCounts: Object.fromEntries(weddingData.events.map((event) => [event.id, 1])),
        mealPreference: '',
    }), [weddingData.events]);
    const guestSummary = useMemo(() => ({
        totalGuests: weddingData.rsvp.guests.length,
        totalPeople: weddingData.rsvp.guests.reduce((total, guest) => total + normalizeInvitedCount(guest.invitedCount), 0),
        totalInvitedCount: weddingData.rsvp.guests.reduce((total, guest) => (
            total + guest.invitedEventIds.reduce((eventTotal, eventId) => eventTotal + getGuestEventInvitedCount(guest, eventId), 0)
        ), 0),
        noEventGuests: weddingData.rsvp.guests.filter((guest) => guest.invitedEventIds.length === 0).length,
        missingPhoneGuests: weddingData.rsvp.guests.filter((guest) => !guest.phone.trim()).length,
    }), [weddingData.rsvp.guests]);
    const rsvpAnalytics = useMemo(() => {
        const relevantResponses = rsvpResponses.filter((response) => response.weddingSlug === weddingData.wedding.slug);
        const responseByGuestEvent = new Map(relevantResponses.map((response) => [
            `${response.guestId}:${response.eventId}`,
            response,
        ]));
        const eventNameById = new Map(weddingData.events.map((event) => [event.id, event.eventName || 'Event']));
        const getResponse = (guest: WeddingGuest, eventId: string) => responseByGuestEvent.get(`${guest.id}:${eventId}`);
        const createCounts = () => ({
            people: { yes: 0, no: 0, maybe: 0, pending: 0 },
            families: { yes: 0, no: 0, maybe: 0, pending: 0 },
        });
        const addStatus = (counts: ReturnType<typeof createCounts>, guest: WeddingGuest, eventId: string) => {
            const response = getResponse(guest, eventId);
            const status = response?.status || 'pending';
            const normalizedStatus = status === 'yes' || status === 'no' || status === 'maybe' ? status : 'pending';
            const invitedCount = getGuestEventInvitedCount(guest, eventId);
            if (normalizedStatus === 'yes') {
                const attendingCount = Math.max(0, Math.min(normalizeInvitedCount(response?.attendingCount ?? invitedCount), invitedCount));
                counts.people.yes += attendingCount;
                counts.people.no += Math.max(0, invitedCount - attendingCount);
            } else {
                counts.people[normalizedStatus] += invitedCount;
            }
            counts.families[normalizedStatus] += 1;
        };
        const countStatusesForGuests = (guests: WeddingGuest[]) => {
            const counts = createCounts();
            guests.forEach((guest) => {
                guest.invitedEventIds.forEach((eventId) => {
                    addStatus(counts, guest, eventId);
                });
            });
            return counts;
        };
        const totals = countStatusesForGuests(weddingData.rsvp.guests);
        const eventSummaries = weddingData.events.map((event) => {
            const invitedGuests = weddingData.rsvp.guests.filter((guest) => guest.invitedEventIds.includes(event.id));
            const counts = createCounts();
            invitedGuests.forEach((guest) => addStatus(counts, guest, event.id));
            return {
                event,
                invitedGuests,
                invitedPeople: invitedGuests.reduce((total, guest) => total + getGuestEventInvitedCount(guest, event.id), 0),
                counts,
            };
        });
        const eventMealSummaries = weddingData.events.map((event) => {
            const invitedGuests = weddingData.rsvp.guests.filter((guest) => guest.invitedEventIds.includes(event.id));
            const mealCounts = { veg: 0, nonVeg: 0, jain: 0, other: 0 };
            invitedGuests.forEach((guest) => {
                const response = getResponse(guest, event.id);
                if (response?.status !== 'yes') return;
                const mealPreference = response.mealPreference || guest.mealPreference || '';
                const invitedCount = getGuestEventInvitedCount(guest, event.id);
                const count = Math.max(0, Math.min(normalizeInvitedCount(response.attendingCount ?? invitedCount), invitedCount));
                if (mealPreference === 'veg') mealCounts.veg += count;
                else if (mealPreference === 'nonVeg') mealCounts.nonVeg += count;
                else if (mealPreference === 'jain') mealCounts.jain += count;
                else mealCounts.other += count;
            });
            return {
                event,
                mealCounts,
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
            const eventStatuses = guest.invitedEventIds.map((eventId) => {
                const status = getResponse(guest, eventId)?.status || 'pending';
                const label = rsvpStatusLabels[status] ?? 'Pending';
                return {
                    eventId,
                    eventName: eventNameById.get(eventId) ?? 'Event',
                    status,
                    label,
                };
            });
            const statusSummary = eventStatuses.length
                ? eventStatuses.map((item) => `${item.eventName}: ${item.label}`).join(' | ')
                : 'No events selected';
            const compactSummary = `Yes ${counts.families.yes} | No ${counts.families.no} | Maybe ${counts.families.maybe} | Pending ${counts.families.pending}`;
            return { guest, counts, mealPreference, lastUpdated, eventStatuses, statusSummary, compactSummary };
        });
        const categorySummaries = Array.from(new Set(weddingData.rsvp.guests.map((guest) => guest.category || 'Uncategorized'))).map((category) => {
            const guests = weddingData.rsvp.guests.filter((guest) => (guest.category || 'Uncategorized') === category);
            return {
                category,
                guestCount: guests.length,
                invitedCount: guests.reduce((total, guest) => (
                    total + guest.invitedEventIds.reduce((eventTotal, eventId) => eventTotal + getGuestEventInvitedCount(guest, eventId), 0)
                ), 0),
                counts: countStatusesForGuests(guests),
            };
        });

        return {
            totals,
            eventSummaries,
            eventMealSummaries,
            mealSummary,
            guestSummaries,
            categorySummaries,
            guestSummaryById: new Map(guestSummaries.map((summary) => [summary.guest.id, summary])),
        };
    }, [rsvpResponses, weddingData]);
    const guestMessageHistoryByGuestId = useMemo(() => {
        const lookup = new Map<string, GuestMessageHistoryEntry[]>();
        [...guestMessageHistory]
            .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
            .forEach((entry) => {
                const existing = lookup.get(entry.guestId) ?? [];
                existing.push(entry);
                lookup.set(entry.guestId, existing);
            });
        return lookup;
    }, [guestMessageHistory]);
    const guestCategoryOptions = useMemo(() => (
        Array.from(new Set(
            weddingData.rsvp.guests
                .map((guest) => guest.category.trim())
                .filter(Boolean),
        )).sort((a, b) => a.localeCompare(b))
    ), [weddingData.rsvp.guests]);
    const filteredGuestRows = useMemo(() => {
        const query = guestSearchQuery.trim().toLowerCase();
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

        return weddingData.rsvp.guests
            .map((guest, guestIndex) => ({ guest, guestIndex }))
            .filter(({ guest }) => {
                const rsvpSummary = rsvpAnalytics.guestSummaryById.get(guest.id);
                const messageHistory = guestMessageHistoryByGuestId.get(guest.id) ?? [];
                const hasInvitation = messageHistory.some((entry) => entry.messageType === 'invitation');
                const hasReminder = messageHistory.some((entry) => entry.messageType === 'reminder');
                const statuses = rsvpSummary?.eventStatuses.map((item) => item.status) ?? [];
                const hasResponse = Boolean(rsvpSummary?.lastUpdated);
                const hasPendingResponse = statuses.some((status) => status === 'pending');
                const lastUpdatedTime = rsvpSummary?.lastUpdated ? Date.parse(rsvpSummary.lastUpdated) : Number.NaN;
                const hasValidLastUpdated = Number.isFinite(lastUpdatedTime);
                const normalizedCategory = guest.category.trim();
                const hasPhone = Boolean(guest.phone.trim());

                const matchesSearch = !query || [
                    guest.guestName,
                    guest.phone,
                    guest.category,
                    rsvpSummary?.statusSummary ?? '',
                    rsvpSummary?.mealPreference ?? '',
                ].some((value) => value.toLowerCase().includes(query));
                const matchesCategory = guestCategoryFilter === 'all'
                    || (guestCategoryFilter === 'uncategorized' ? !normalizedCategory : normalizedCategory === guestCategoryFilter);
                const matchesWhatsApp = guestWhatsAppFilter === 'all'
                    || (guestWhatsAppFilter === 'invite-not-sent' && !hasInvitation)
                    || (guestWhatsAppFilter === 'invite-sent' && hasInvitation)
                    || (guestWhatsAppFilter === 'no-reminders' && !hasReminder)
                    || (guestWhatsAppFilter === 'reminders-sent' && hasReminder);
                const matchesRsvp = guestRsvpFilter === 'all'
                    || (guestRsvpFilter === 'no-response' && !hasResponse)
                    || (guestRsvpFilter === 'pending' && hasPendingResponse)
                    || (guestRsvpFilter === 'complete' && statuses.length > 0 && !hasPendingResponse)
                    || (guestRsvpFilter === 'attending' && statuses.some((status) => status === 'yes'))
                    || (guestRsvpFilter === 'maybe' && statuses.some((status) => status === 'maybe'))
                    || (guestRsvpFilter === 'declined' && statuses.length > 0 && statuses.every((status) => status === 'no'));
                const matchesActivity = guestActivityFilter === 'all'
                    || (guestActivityFilter === 'never' && !hasValidLastUpdated)
                    || (guestActivityFilter === 'last-7-days' && hasValidLastUpdated && lastUpdatedTime >= sevenDaysAgo)
                    || (guestActivityFilter === 'older-than-7-days' && hasValidLastUpdated && lastUpdatedTime < sevenDaysAgo);
                const matchesPhone = guestPhoneFilter === 'all'
                    || (guestPhoneFilter === 'available' && hasPhone)
                    || (guestPhoneFilter === 'missing' && !hasPhone);

                return matchesSearch
                    && matchesCategory
                    && matchesWhatsApp
                    && matchesRsvp
                    && matchesActivity
                    && matchesPhone;
            });
    }, [
        guestActivityFilter,
        guestCategoryFilter,
        guestMessageHistoryByGuestId,
        guestPhoneFilter,
        guestRsvpFilter,
        guestSearchQuery,
        guestWhatsAppFilter,
        rsvpAnalytics.guestSummaryById,
        weddingData.rsvp.guests,
    ]);
    const activeGuestFilterCount = [
        Boolean(guestSearchQuery.trim()),
        guestCategoryFilter !== 'all',
        guestWhatsAppFilter !== 'all',
        guestRsvpFilter !== 'all',
        guestActivityFilter !== 'all',
        guestPhoneFilter !== 'all',
    ].filter(Boolean).length;
    const clearGuestFilters = () => {
        setGuestSearchQuery('');
        setGuestCategoryFilter('all');
        setGuestWhatsAppFilter('all');
        setGuestRsvpFilter('all');
        setGuestActivityFilter('all');
        setGuestPhoneFilter('all');
        setGuestPage(1);
    };
    const guestRecordLimit = weddingData.wedding.guestRecordLimit ?? DEFAULT_GUEST_RECORD_LIMIT;

    const inviteeLimit = weddingData.wedding.inviteeLimit ?? DEFAULT_INVITEE_LIMIT;
    const totalGuestPages = Math.max(1, Math.ceil(filteredGuestRows.length / guestPageSize));
    const currentGuestPage = Math.min(guestPage, totalGuestPages);
    const guestPageStartIndex = (currentGuestPage - 1) * guestPageSize;
    const paginatedGuestRows = filteredGuestRows.slice(guestPageStartIndex, guestPageStartIndex + guestPageSize);
    const firstVisibleGuestNumber = filteredGuestRows.length ? guestPageStartIndex + 1 : 0;
    const lastVisibleGuestNumber = Math.min(guestPageStartIndex + guestPageSize, filteredGuestRows.length);
    const hasReachedGuestEntryLimit = weddingData.rsvp.guests.length >= guestRecordLimit;
    const hasReachedInviteeLimit = guestSummary.totalPeople >= inviteeLimit;
    const cannotAddGuest = hasReachedGuestEntryLimit || hasReachedInviteeLimit;
    const areAllVisibleGuestsSelected = paginatedGuestRows.length > 0 && paginatedGuestRows.every(({ guest }) => (
        selectedGuestIds.includes(guest.id)
    ));

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
        const guestCapacityError = getGuestCapacityError(weddingToSave);
        if (guestCapacityError) {
            setSaveStatus('');
            setSaveError(guestCapacityError);
            return;
        }

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
                    ? 'This website address is already in use. Please choose a different address.'
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
            const submittedEventsById = new Map(weddingToSave.events.map((event) => [event.id, event]));
            weddingToSave.events = relationalResult.events.map((savedEvent) => ({
                ...savedEvent,
                eventTextPosition: submittedEventsById.get(savedEvent.id)?.eventTextPosition ?? savedEvent.eventTextPosition,
                eventShowCalendar: submittedEventsById.get(savedEvent.id)?.eventShowCalendar ?? savedEvent.eventShowCalendar,
            }));
            weddingToSave.rsvp.guests = relationalResult.guests;
        }

        let mediaCleanupWarning = '';
        if (supabaseWeddingId && pendingWeddingMediaDeletions.length > 0) {
            const deletionResults = await Promise.all(
                pendingWeddingMediaDeletions.map(async (asset) => ({ asset, result: await deleteWeddingMedia(asset) }))
            );
            const failedDeletions = deletionResults.filter(({ result }) => Boolean(result.error));
            const deletedIds = new Set(
                deletionResults.filter(({ result }) => !result.error).map(({ asset }) => asset.id)
            );
            setWeddingMedia((current) => current.filter((asset) => !deletedIds.has(asset.id)));
            setPendingWeddingMediaDeletions([]);
            if (failedDeletions.length > 0) {
                mediaCleanupWarning = `The wedding was saved, but ${failedDeletions.length} image file${failedDeletions.length === 1 ? '' : 's'} could not be removed. Please try removing ${failedDeletions.length === 1 ? 'it' : 'them'} again.`;
                setSaveErrorDetail(failedDeletions.map(({ result }) => result.detail || result.error).join(' | '));
            }
        }

        if (supabaseWeddingId) {
            clearDashboardDraft(dashboardDraftStorageKey);
        } else {
            window.localStorage.setItem(mockDashboardDraftStorageKey, JSON.stringify(weddingToSave));
        }
        hasUnsavedChangesRef.current = false;
        setHasUnsavedChanges(false);
        setSaveStatus(mediaCleanupWarning ? 'Saved with image cleanup warning' : 'Saved');
        if (mediaCleanupWarning) setSaveError(mediaCleanupWarning);
    };

    const handleResetDraft = async () => {
        if (!window.confirm('Discard unsaved changes and reload the last saved version?')) return;
        clearDashboardDraft(dashboardDraftStorageKey);
        window.localStorage.removeItem(mockDashboardDraftStorageKey);
        setPendingWeddingMediaDeletions([]);
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

    const updateRsvp = <Key extends keyof SampleWeddingData['rsvp']>(
        key: Key,
        value: SampleWeddingData['rsvp'][Key]
    ) => {
        updateWeddingData((current) => ({
            ...current,
            rsvp: {
                ...current.rsvp,
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

    const uploadWeddingImage = async (
        file: File,
        section: WeddingMediaSection,
        onUploaded: (imageSrc: string) => void
    ) => {
        if (!supabaseWeddingId) {
            setSaveError('Custom uploads are available after the wedding has been saved to Supabase.');
            return;
        }

        setSaveError('');
        setSaveErrorDetail('');
        setMediaUploadingSection(section);
        if (section === 'closing-gallery') setIsClosingImageUploading(true);
        if (section === 'whatsapp') setIsWhatsAppPreviewImageUploading(true);
        const result = await uploadWeddingMedia({ weddingId: supabaseWeddingId, file, section });
        setMediaUploadingSection('');
        if (section === 'closing-gallery') setIsClosingImageUploading(false);
        if (section === 'whatsapp') setIsWhatsAppPreviewImageUploading(false);

        if (result.error || !result.asset) {
            setSaveError(result.error || 'Could not upload this image.');
            setSaveErrorDetail(result.detail);
            if (result.error.includes('migration')) setWeddingMediaSetupRequired(true);
            return;
        }

        setWeddingMedia((current) => [result.asset!, ...current]);
        onUploaded(result.asset.publicUrl);
    };

    const removeWeddingMediaAsset = async (asset: WeddingMediaAsset) => {
        const usageLabels = getWeddingMediaUsageLabels(weddingDataRef.current, asset.publicUrl);
        if (usageLabels.length > 0) {
            const confirmed = window.confirm(
                `This image is used in ${usageLabels.join(', ')}. Removing it will clear the image from every listed section when you save. Continue?`
            );
            if (!confirmed) return;

            updateWeddingData((current) => removeWeddingMediaReferences(current, asset.publicUrl));
            setPendingWeddingMediaDeletions((current) => (
                current.some((item) => item.id === asset.id) ? current : [...current, asset]
            ));
            setSaveStatus('Image removal is ready. Save changes to update the live invitation.');
            return;
        }

        if (!window.confirm('Remove this image from your wedding media library?')) return;
        const result = await deleteWeddingMedia(asset);
        if (result.error) {
            setSaveError(result.error);
            setSaveErrorDetail(result.detail);
            return;
        }
        setWeddingMedia((current) => current.filter((item) => item.id !== asset.id));
    };

    const uploadClosingGalleryImage = async (file: File) => {
        if (closingImagePickerTarget === null) return;
        await uploadWeddingImage(file, 'closing-gallery', (imageSrc) => {
            setClosingGalleryImage(closingImagePickerTarget, imageSrc);
        });
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

    const moveEvent = (index: number, direction: -1 | 1) => {
        updateWeddingData((current) => {
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= current.events.length) return current;
            const nextEvents = [...current.events];
            [nextEvents[index], nextEvents[targetIndex]] = [nextEvents[targetIndex], nextEvents[index]];
            return {
                ...current,
                events: nextEvents,
            };
        });
    };

    const addEvent = async () => {
        const mediaSource = weddingData.events[0];
        const newEvent: WeddingEvent = {
            id: `event-${Date.now()}`,
            eventKey: '',
            eventVisualKey: '',
            eventTextStyle: 'auto',
            eventTextPosition: 'top',
            eventAnimationKey: 'none',
            eventShowCalendar: true,
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
                    invitedEventCounts: Object.fromEntries(Object.entries(guest.invitedEventCounts ?? {}).filter(([eventId]) => eventId !== eventToDelete?.id)),
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

    const normalizeGuestPhoneAtIndex = (index: number) => {
        const guest = weddingData.rsvp.guests[index];
        if (!guest) return;
        const { canonicalPhone } = validateGuestPhone(guest.phone);
        if (canonicalPhone && canonicalPhone !== guest.phone) updateGuest(index, 'phone', canonicalPhone);
    };

    const updateGuestFamilySize = (index: number, value: number) => {
        const familySize = normalizeInvitedCount(value);
        const currentGuest = weddingData.rsvp.guests[index];
        const nextPeopleTotal = guestSummary.totalPeople - normalizeInvitedCount(currentGuest?.invitedCount) + familySize;
        if (familySize > MAX_GUEST_FAMILY_SIZE) {
            setSaveError(`Family Size cannot be more than ${MAX_GUEST_FAMILY_SIZE}. Split larger groups into separate guest entries.`);
            return false;
        }
        if (nextPeopleTotal > inviteeLimit) {
            setSaveError(`This wedding supports up to ${inviteeLimit.toLocaleString()} people. Reduce another Family Size before increasing this one.`);
            return false;
        }
        updateWeddingData((current) => ({
            ...current,
            rsvp: {
                ...current.rsvp,
                guests: current.rsvp.guests.map((guest, guestIndex) => {
                    if (guestIndex !== index) return guest;
                    const previousFamilySize = normalizeInvitedCount(guest.invitedCount);
                    const invitedEventCounts = Object.fromEntries(
                        Object.entries(guest.invitedEventCounts ?? {}).map(([eventId, count]) => [
                            eventId,
                            normalizeInvitedCount(count) >= previousFamilySize ? familySize : Math.min(normalizeInvitedCount(count), familySize),
                        ])
                    );
                    return { ...guest, invitedCount: familySize, invitedEventCounts };
                }),
            },
        }));
        return true;
    };
    const toggleGuestEvent = (guestIndex: number, eventId: string) => {
        const currentGuest = weddingData.rsvp.guests[guestIndex];
        const isSelected = currentGuest.invitedEventIds.includes(eventId);
        const nextEventIds = isSelected
            ? currentGuest.invitedEventIds.filter((id) => id !== eventId)
            : [...currentGuest.invitedEventIds, eventId];
        const nextEventCounts = { ...(currentGuest.invitedEventCounts ?? {}) };
        if (isSelected) {
            delete nextEventCounts[eventId];
        } else {
            nextEventCounts[eventId] = normalizeInvitedCount(currentGuest.invitedCount);
        }

        updateWeddingData((current) => ({
            ...current,
            rsvp: {
                ...current.rsvp,
                guests: current.rsvp.guests.map((guest, index) => {
                    if (index !== guestIndex) return guest;
                    return { ...guest, invitedEventIds: nextEventIds, invitedEventCounts: nextEventCounts };
                }),
            },
        }));

        if (supabaseWeddingId) {
            replaceSupabaseGuestInvites(supabaseWeddingId, currentGuest.id, nextEventIds, weddingData.events, nextEventCounts).then((result) => {
                if (result.error) {
                    console.warn('Could not update guest events', result.error);
                    setSaveErrorDetail(result.detail || result.error);
                    setSaveError(`${result.error}${isAdminMode ? adminRlsHint : ''}`);
                }
            });
        }
    };

    const updateGuestEventInvitedCount = (guestIndex: number, eventId: string, value: number) => {
        updateWeddingData((current) => ({
            ...current,
            rsvp: {
                ...current.rsvp,
                guests: current.rsvp.guests.map((guest, index) => {
                    if (index !== guestIndex) return guest;
                    return {
                        ...guest,
                        invitedEventCounts: {
                            ...(guest.invitedEventCounts ?? {}),
                            [eventId]: normalizeInvitedCount(value),
                        },
                    };
                }),
            },
        }));
    };

    const updateGuestEventInviteScope = (guestIndex: number, eventId: string, scope: 'all' | 'number') => {
        updateWeddingData((current) => ({
            ...current,
            rsvp: {
                ...current.rsvp,
                guests: current.rsvp.guests.map((guest, index) => {
                    if (index !== guestIndex) return guest;
                    const familySize = normalizeInvitedCount(guest.invitedCount);
                    const currentCount = getGuestEventInvitedCount(guest, eventId);
                    const nextCount = scope === 'all'
                        ? familySize
                        : Math.max(1, Math.min(currentCount >= familySize ? 1 : currentCount, Math.max(1, familySize - 1)));
                    return {
                        ...guest,
                        invitedEventCounts: {
                            ...(guest.invitedEventCounts ?? {}),
                            [eventId]: nextCount,
                        },
                    };
                }),
            },
        }));
    };
    const addGuest = () => {
        if (cannotAddGuest) {
            setSaveError(hasReachedGuestEntryLimit
                ? `This wedding already has the maximum ${guestRecordLimit.toLocaleString()} guest entries.`
                : `This wedding already has the maximum ${inviteeLimit.toLocaleString()} people.`);
            return;
        }
        const newGuest: WeddingGuest = {
            id: `guest-${Date.now()}`,
            guestName: '',
            phone: '',
            invitedCount: 1,
            category: '',
            inviteCode: Math.random().toString(36).slice(2, 8),
            invitedEventIds: [],
            invitedEventCounts: {},
        };

        updateWeddingData((current) => ({
            ...current,
            rsvp: {
                ...current.rsvp,
                guests: [newGuest, ...current.rsvp.guests],
            },
        }));
        setGuestSearchQuery('');
        setGuestCategoryFilter('all');
        setGuestWhatsAppFilter('all');
        setGuestRsvpFilter('all');
        setGuestActivityFilter('all');
        setGuestPhoneFilter('all');
        setGuestPage(1);
        setExpandedGuestId(newGuest.id);
        setSaveError('');
        setSaveErrorDetail('');
        setSaveStatus('New guest added. Complete the details and save your changes.');
    };

    const getGuestInviteLink = (guest: WeddingGuest) => {
        return `/${weddingData.wedding.slug}/invite/${guest.inviteCode}`;
    };

    const getGuestInviteUrl = (guest: WeddingGuest) => `${window.location.origin}${getGuestInviteLink(guest)}`;

    const updateWhatsAppSetting = <Key extends keyof SampleWeddingData['whatsapp']>(
        key: Key,
        value: SampleWeddingData['whatsapp'][Key]
    ) => {
        updateWeddingData((current) => ({
            ...current,
            whatsapp: {
                ...current.whatsapp,
                [key]: value,
            },
        }));
    };

    const activeWhatsAppMessage = whatsAppMessageMode === 'invitation'
        ? weddingData.whatsapp.inviteMessage
        : weddingData.whatsapp.reminderMessage;

    const updateWhatsAppMessage = (message: string) => {
        updateWhatsAppSetting(
            whatsAppMessageMode === 'invitation' ? 'inviteMessage' : 'reminderMessage',
            message
        );
    };

    const insertWhatsAppMessageContent = (content: string) => {
        const textarea = whatsappMessageTextareaRef.current;
        const selectionStart = textarea?.selectionStart ?? activeWhatsAppMessage.length;
        const selectionEnd = textarea?.selectionEnd ?? selectionStart;
        const nextMessage = `${activeWhatsAppMessage.slice(0, selectionStart)}${content}${activeWhatsAppMessage.slice(selectionEnd)}`;
        const nextCursorPosition = selectionStart + content.length;

        updateWhatsAppMessage(nextMessage);
        window.requestAnimationFrame(() => {
            whatsappMessageTextareaRef.current?.focus();
            whatsappMessageTextareaRef.current?.setSelectionRange(nextCursorPosition, nextCursorPosition);
        });
    };

    const uploadWhatsAppPreviewImage = async (file: File) => {
        await uploadWeddingImage(file, 'whatsapp', (imageSrc) => {
            updateWhatsAppSetting('previewImageSrc', imageSrc);
            setIsWhatsAppPreviewImagePickerOpen(false);
        });
    };

    const getGuestWhatsAppMessage = (guest: WeddingGuest, messageType: GuestMessageType) => {
        const inviteUrl = getGuestInviteUrl(guest);
        return renderWhatsAppInviteMessage(
            messageType === 'invitation'
                ? weddingData.whatsapp.inviteMessage
                : weddingData.whatsapp.reminderMessage,
            {
                guestName: guest.guestName || 'there',
                coupleName: weddingData.couple.displayName,
                brideName: weddingData.couple.brideName,
                groomName: weddingData.couple.groomName,
                inviteLink: inviteUrl,
            }
        );
    };

    const getGuestWhatsAppUrl = (guest: WeddingGuest, messageType: GuestMessageType) => (
        buildWhatsAppUrl(guest.phone, getGuestWhatsAppMessage(guest, messageType))
    );


    const confirmGuestMessageSent = async (guest: WeddingGuest, messageType: GuestMessageType) => {
        const savingKey = `${guest.id}:${messageType}`;
        setGuestMessageHistorySavingKey(savingKey);
        setSaveError('');
        setSaveErrorDetail('');

        let entry: GuestMessageHistoryEntry;
        if (supabaseWeddingId) {
            const result = await recordGuestMessageSent({
                weddingId: supabaseWeddingId,
                guestId: guest.id,
                messageType,
                messageSnapshot: getGuestWhatsAppMessage(guest, messageType),
            });
            if (result.error || !result.entry) {
                setGuestMessageHistorySavingKey('');
                setSaveError(result.error || 'Could not update WhatsApp tracking. Please try again.');
                setSaveErrorDetail(result.detail);
                return;
            }
            entry = result.entry;
        } else {
            const sentAt = new Date().toISOString();
            entry = {
                id: window.crypto.randomUUID(),
                weddingId: `mock:${weddingData.wedding.slug}`,
                guestId: guest.id,
                messageType,
                messageSnapshot: getGuestWhatsAppMessage(guest, messageType),
                sentAt,
                recordedBy: user?.id,
                createdAt: sentAt,
            };
        }

        setGuestMessageHistory((current) => {
            const next = [entry, ...current];
            persistStoredGuestMessageHistory(guestMessageHistoryStorageScope, next);
            return next;
        });
        setGuestMessageHistorySavingKey('');
        setSaveStatus(messageType === 'invitation' ? 'Invitation marked as sent' : 'Reminder marked as sent');
    };

    const removeGuestMessageRecord = async (entry: GuestMessageHistoryEntry) => {
        if (!window.confirm('Remove this manually recorded WhatsApp send?')) return;

        setGuestMessageHistorySavingKey(entry.id);
        if (supabaseWeddingId) {
            const result = await removeGuestMessageHistoryEntry(supabaseWeddingId, entry.id);
            if (result.error) {
                setGuestMessageHistorySavingKey('');
                setSaveError(result.error);
                setSaveErrorDetail(result.detail);
                return;
            }
        }

        setGuestMessageHistory((current) => {
            const next = current.filter((item) => item.id !== entry.id);
            persistStoredGuestMessageHistory(guestMessageHistoryStorageScope, next);
            return next;
        });
        setGuestMessageHistorySavingKey('');
        setSaveStatus('WhatsApp send record removed');
    };

    const whatsAppPreviewGuest = weddingData.rsvp.guests[0];
    const whatsAppPreviewMessage = renderWhatsAppInviteMessage(activeWhatsAppMessage, {
        guestName: whatsAppPreviewGuest?.guestName || 'Guest Name',
        coupleName: weddingData.couple.displayName,
        brideName: weddingData.couple.brideName,
        groomName: weddingData.couple.groomName,
        inviteLink: whatsAppPreviewGuest
            ? getGuestInviteUrl(whatsAppPreviewGuest)
            : `${window.location.origin}/${weddingData.wedding.slug}/invite/guest-code`,
    });

    const copyGuestInviteLink = async (guest: WeddingGuest) => {
        await window.navigator.clipboard?.writeText(getGuestInviteUrl(guest));
    };

    const copyWeddingWebsiteUrl = async () => {
        await window.navigator.clipboard?.writeText(weddingWebsiteUrl);
        setSaveStatus('Copied website URL');
    };
    const navigateToDashboardTab = (tab: DashboardTab) => {
        writeDashboardActiveTab(dashboardActiveTabStorageKey, tab);
        setActiveTab(tab);
    };
    const activeDashboardTabIndex = Math.max(0, dashboardTabs.findIndex((tab) => tab.id === activeTab));
    const activeDashboardTab = dashboardTabs[activeDashboardTabIndex];
    const navigateToAdjacentDashboardTab = (direction: -1 | 1) => {
        const nextTab = dashboardTabs[activeDashboardTabIndex + direction];
        if (nextTab) navigateToDashboardTab(nextTab.id);
    };
    const openDashboardPreview = () => navigateToDashboardTab('preview');


    const previewGuestInvite = async (guest: WeddingGuest) => {
        await handleSaveDraft();
        window.open(getGuestInviteUrl(guest), '_blank', 'noopener,noreferrer');
    };

    const getGuestCsvEventHeaders = () => weddingData.events.map((event) => event.eventName);

    const getGuestCsvEventValue = (guest: WeddingGuest, event: WeddingEvent) => {
        const isInvited = guest.invitedEventIds.includes(event.id);
        if (!isInvited) return 0;
        const eventInvitees = getGuestEventInvitedCount(guest, event.id);
        const familySize = normalizeInvitedCount(guest.invitedCount);
        return eventInvitees >= familySize ? 'All' : eventInvitees;
    };

    const downloadGuestCsvTemplate = () => {
        downloadCsv(`${weddingData.wedding.slug}-guest-template.csv`, [
            [...guestCsvBaseHeaders, ...getGuestCsvEventHeaders()],
        ]);
    };

    const exportGuestsCsv = () => {
        const rows: Array<Array<string | number>> = [[
            ...guestCsvBaseHeaders,
            'inviteCode',
            'inviteLink',
            ...getGuestCsvEventHeaders(),
        ]];

        weddingData.rsvp.guests.forEach((guest) => {
            rows.push([
                guest.guestName,
                guest.phone,
                guest.invitedCount,
                guest.category,
                guest.inviteCode,
                getGuestInviteUrl(guest),
                ...weddingData.events.map((event) => getGuestCsvEventValue(guest, event)),
            ]);
        });

        downloadCsv(`${weddingData.wedding.slug}-guests.csv`, rows);
    };

    const buildGuestCsvAnalysis = async (file: File, mode: CsvImportMode): Promise<GuestCsvAnalysis> => {
        const issues: GuestCsvIssue[] = [];
        const addIssue = (
            level: GuestCsvIssueLevel,
            message: string,
            row?: number,
            column?: string,
            value?: string
        ) => issues.push({ level, message, row, column, value });
        const emptyAnalysis = (): GuestCsvAnalysis => ({
            fileName: file.name,
            guests: [],
            issues,
            totalRows: 0,
            validRows: 0,
            resultingGuestEntries: weddingData.rsvp.guests.length,
            resultingPeople: guestSummary.totalPeople,
            preservedGuests: 0,
            phoneNormalizations: [],
        });

        if (!file.name.toLowerCase().endsWith('.csv')) {
            addIssue('error', 'Choose a file with a .csv extension.');
            return emptyAnalysis();
        }
        if (file.size === 0) {
            addIssue('error', 'The selected CSV file is empty.');
            return emptyAnalysis();
        }
        if (file.size > MAX_GUEST_CSV_BYTES) {
            addIssue('error', `CSV files must be 5 MB or smaller. This file is ${(file.size / (1024 * 1024)).toFixed(1)} MB.`);
            return emptyAnalysis();
        }

        const parsedCsv = parseCsv(await file.text());
        if (parsedCsv.error) {
            addIssue('error', parsedCsv.error);
            return emptyAnalysis();
        }
        if (parsedCsv.rows.length < 2) {
            addIssue('error', 'CSV must include a header row and at least one guest row.');
            return emptyAnalysis();
        }

        const [headers, ...dataRows] = parsedCsv.rows;
        const normalizedHeaders = headers.map(normalizeCsvHeader);
        const duplicateHeaders = Array.from(new Set(normalizedHeaders.filter((header, index) => (
            header && normalizedHeaders.indexOf(header) !== index
        ))));
        duplicateHeaders.forEach((header) => addIssue('error', `The column "${header}" appears more than once.`));

        const headerIndex = (name: string) => normalizedHeaders.indexOf(normalizeCsvHeader(name));
        guestCsvRequiredHeaders.forEach((header) => {
            if (headerIndex(header) < 0) addIssue('error', `Required column "${header}" is missing.`, 1, header);
        });
        const familySizeIndex = headerIndex('familySize') >= 0 ? headerIndex('familySize') : headerIndex('invitedCount');
        if (familySizeIndex < 0) addIssue('error', 'Required column "familySize" is missing.', 1, 'familySize');

        const normalizedEventNames = weddingData.events.map((event) => normalizeCsvHeader(event.eventName));
        const duplicateEventNames = Array.from(new Set(normalizedEventNames.filter((name, index) => (
            name && normalizedEventNames.indexOf(name) !== index
        ))));
        duplicateEventNames.forEach((name) => addIssue(
            'error',
            `Two current events normalize to "${name}". Rename one event before importing so assignments are unambiguous.`
        ));

        if (issues.some((issue) => issue.level === 'error')) return {
            ...emptyAnalysis(),
            totalRows: dataRows.length,
        };

        const ignoredHeaderKeys = new Set([...guestCsvBaseHeaders, ...guestCsvMetadataHeaders, ...guestCsvLegacyHeaders].map(normalizeCsvHeader));
        const usedEventColumnIndexes = new Set<number>();
        const findHeaderIndex = (candidates: string[]) => normalizedHeaders.findIndex((header) => (
            candidates.some((candidate) => normalizeCsvHeader(candidate) === header)
        ));
        const eventColumns = weddingData.events
            .map((event) => {
                const statusIndex = findHeaderIndex([event.eventName, event.id]);
                const inviteeIndex = findHeaderIndex([
                    inviteeCountHeader(event.eventName),
                    `${event.eventName} Count`,
                    `${event.eventName} Invited Count`,
                    inviteeCountHeader(event.id),
                ]);
                if (statusIndex >= 0) usedEventColumnIndexes.add(statusIndex);
                if (inviteeIndex >= 0) usedEventColumnIndexes.add(inviteeIndex);
                if (statusIndex < 0 && inviteeIndex < 0) return null;
                return { statusIndex, inviteeIndex, eventId: event.id, eventName: event.eventName };
            })
            .filter((column): column is { statusIndex: number; inviteeIndex: number; eventId: string; eventName: string } => Boolean(column));

        if (!eventColumns.length) {
            addIssue('error', 'No CSV column matches a current wedding event. Download a fresh template and try again.');
        }
        headers.forEach((header, index) => {
            const normalizedHeader = normalizedHeaders[index];
            if (!header.trim() || ignoredHeaderKeys.has(normalizedHeader) || usedEventColumnIndexes.has(index)) return;
            addIssue('warning', `Column "${header}" is not a supported guest field or current event and will be ignored.`, 1, header);
        });
        if (issues.some((issue) => issue.level === 'error')) return {
            ...emptyAnalysis(),
            totalRows: dataRows.length,
        };

        const existingCodes = new Set(weddingData.rsvp.guests.map((guest) => guest.inviteCode));
        const existingIds = new Set(weddingData.rsvp.guests.map((guest) => guest.id));
        const existingByInviteCode = new Map(weddingData.rsvp.guests.map((guest) => [guest.inviteCode.toLowerCase(), guest]));
        const existingByIdentity = new Map<string, WeddingGuest[]>();
        const existingByPhone = new Map<string, WeddingGuest[]>();
        weddingData.rsvp.guests.forEach((guest) => {
            const key = getGuestIdentityKey(guest.guestName, guest.phone);
            existingByIdentity.set(key, [...(existingByIdentity.get(key) ?? []), guest]);
            const phoneKey = getGuestPhoneIdentity(guest.phone);
            if (phoneKey) existingByPhone.set(phoneKey, [...(existingByPhone.get(phoneKey) ?? []), guest]);
        });
        const importedIdentityRows = new Map<string, number>();
        const importedPhoneRows = new Map<string, number>();
        const importedInviteCodeRows = new Map<string, number>();
        const guests: WeddingGuest[] = [];
        const phoneNormalizations: Array<{ row: number; input: string; canonical: string }> = [];
        let preservedGuests = 0;

        dataRows.forEach((row, rowIndex) => {
            const displayRow = rowIndex + 2;
            let rowHasError = false;
            const addRowIssue = (level: GuestCsvIssueLevel, message: string, column?: string, value?: string) => {
                if (level === 'error') rowHasError = true;
                addIssue(level, message, displayRow, column, value);
            };
            if (row.length > headers.length) {
                addRowIssue('error', `This row has ${row.length} values but the header has ${headers.length} columns.`);
            }

            const guestName = row[headerIndex('guestName')]?.trim() ?? '';
            const rawPhone = row[headerIndex('phone')]?.trim() ?? '';
            const category = row[headerIndex('category')]?.trim() ?? '';
            const familySizeValue = row[familySizeIndex]?.trim() ?? '';
            const parsedFamilySize = Number(familySizeValue);
            const familySize = Number.isInteger(parsedFamilySize) ? parsedFamilySize : 0;
            const phoneValidation = validateGuestPhone(rawPhone);

            if (!guestName) addRowIssue('error', 'Guest or family name is required.', 'guestName', guestName);
            else if (guestName.length > guestCsvGuestNameMaxLength) addRowIssue('error', `Keep the guest name within ${guestCsvGuestNameMaxLength} characters.`, 'guestName', guestName);
            if (!rawPhone) addRowIssue('error', 'Phone is required.', 'phone');
            else if (rawPhone.length > guestCsvPhoneMaxLength) addRowIssue('error', `Keep the phone value within ${guestCsvPhoneMaxLength} characters.`, 'phone', rawPhone);
            else if (phoneValidation.error) addRowIssue('error', phoneValidation.error, 'phone', rawPhone);
            if (category.length > guestCsvCategoryMaxLength) addRowIssue('error', `Keep category within ${guestCsvCategoryMaxLength} characters.`, 'category', category);
            if (!familySizeValue || familySize < 1 || familySize > MAX_GUEST_FAMILY_SIZE) {
                addRowIssue('error', `Family Size must be a whole number between 1 and ${MAX_GUEST_FAMILY_SIZE}.`, 'familySize', familySizeValue);
            }

            const usableFamilySize = familySize >= 1 && familySize <= MAX_GUEST_FAMILY_SIZE ? familySize : 1;
            const parsedEventSelections = eventColumns.map((column) => {
                const eventValue = column.statusIndex >= 0 ? (row[column.statusIndex] ?? '').trim() : '';
                const inviteeValue = column.inviteeIndex >= 0 ? (row[column.inviteeIndex] ?? '').trim() : '';
                const normalizedEventValue = eventValue.toLowerCase();
                const normalizedInviteeValue = inviteeValue.toLowerCase();
                const isLegacyTwoColumnFormat = column.inviteeIndex >= 0;
                const isAllValue = (value: string) => ['all', 'everyone', 'family', 'full', 'yes', 'y', 'true'].includes(value);
                const parseInviteeCount = (value: string) => {
                    if (!value || notInvitedCsvValues.has(value)) return 0;
                    if (isAllValue(value)) return usableFamilySize;
                    const parsedCount = Number(value);
                    if (!Number.isInteger(parsedCount) || parsedCount < 0 || parsedCount > usableFamilySize) {
                        addRowIssue('error', `Use 0, All, or a whole number between 1 and ${usableFamilySize}.`, column.eventName, value);
                        return 0;
                    }
                    return parsedCount;
                };

                let eventInvitees = 0;
                if (isLegacyTwoColumnFormat) {
                    const hasStatusYes = invitedCsvValues.has(normalizedEventValue);
                    const hasStatusNo = notInvitedCsvValues.has(normalizedEventValue);
                    const inviteeValueSelectsEvent = Boolean(inviteeValue) && !notInvitedCsvValues.has(normalizedInviteeValue);
                    if (!hasStatusYes && (hasStatusNo || !inviteeValueSelectsEvent)) return null;
                    eventInvitees = inviteeValue ? parseInviteeCount(normalizedInviteeValue) : usableFamilySize;
                } else {
                    eventInvitees = parseInviteeCount(normalizedEventValue);
                }
                return eventInvitees > 0 ? { eventId: column.eventId, invitedCount: eventInvitees } : null;
            }).filter((selection): selection is { eventId: string; invitedCount: number } => Boolean(selection));

            if (!parsedEventSelections.length) addRowIssue('error', 'Select at least one invited event using All or an invitee number.', 'events');

            const canonicalPhone = phoneValidation.canonicalPhone || rawPhone;
            if (phoneValidation.canonicalPhone && phoneValidation.canonicalPhone !== rawPhone) {
                phoneNormalizations.push({ row: displayRow, input: rawPhone, canonical: phoneValidation.canonicalPhone });
            }
            const identityKey = getGuestIdentityKey(guestName, canonicalPhone);
            const previousIdentityRow = importedIdentityRows.get(identityKey);
            if (previousIdentityRow) addRowIssue('error', `Duplicates row ${previousIdentityRow} with the same guest name and phone.`, 'guestName', guestName);
            else importedIdentityRows.set(identityKey, displayRow);
            const phoneKey = getGuestPhoneIdentity(canonicalPhone);
            const previousPhoneRow = importedPhoneRows.get(phoneKey);
            if (phoneKey && previousPhoneRow && !previousIdentityRow) {
                addRowIssue('warning', `Uses the same normalized phone as row ${previousPhoneRow}. Shared family numbers are allowed, but verify this is intentional.`, 'phone', canonicalPhone);
            } else if (phoneKey) {
                importedPhoneRows.set(phoneKey, displayRow);
            }

            const suppliedInviteCode = row[headerIndex('inviteCode')]?.trim() ?? '';
            if (suppliedInviteCode) {
                const normalizedCode = suppliedInviteCode.toLowerCase();
                const previousCodeRow = importedInviteCodeRows.get(normalizedCode);
                if (previousCodeRow) addRowIssue('error', `Invite code duplicates row ${previousCodeRow}.`, 'inviteCode', suppliedInviteCode);
                else importedInviteCodeRows.set(normalizedCode, displayRow);
            }

            const codeMatch = suppliedInviteCode ? existingByInviteCode.get(suppliedInviteCode.toLowerCase()) : undefined;
            const identityMatches = existingByIdentity.get(identityKey) ?? [];
            const identityMatch = identityMatches.length === 1 ? identityMatches[0] : undefined;
            const matchedGuest = codeMatch ?? identityMatch;
            const phoneMatches = existingByPhone.get(phoneKey) ?? [];
            if (mode === 'append' && matchedGuest) {
                addRowIssue('error', 'This guest already exists. Remove the row or use Replace mode to update the existing guest.', 'guestName', guestName);
            }
            if (mode === 'append' && !matchedGuest && phoneMatches.length > 0) {
                addRowIssue('warning', `This phone is already used by ${phoneMatches[0].guestName || 'another guest'}. Shared family numbers are allowed, but verify this is intentional.`, 'phone', canonicalPhone);
            }
            if (mode === 'replace' && !codeMatch && suppliedInviteCode) {
                addRowIssue('warning', 'This invite code is not part of the current wedding, so a new personalized link will be generated.', 'inviteCode', suppliedInviteCode);
            }
            if (mode === 'replace' && !codeMatch && identityMatches.length > 1) {
                addRowIssue('warning', 'Multiple existing guests share this name and phone, so their existing personalized link cannot be matched safely.', 'guestName', guestName);
            }

            if (rowHasError) return;
            let guestId = matchedGuest?.id ?? `guest-${Date.now()}-${rowIndex + 1}`;
            while (existingIds.has(guestId) && guestId !== matchedGuest?.id) {
                guestId = `guest-${Date.now()}-${rowIndex + 1}-${Math.random().toString(36).slice(2, 5)}`;
            }
            existingIds.add(guestId);
            const inviteCode = matchedGuest?.inviteCode ?? createUniqueInviteCode(existingCodes);
            if (matchedGuest) preservedGuests += 1;
            guests.push({
                id: guestId,
                guestName,
                phone: canonicalPhone,
                invitedCount: usableFamilySize,
                category,
                inviteCode,
                invitedEventIds: parsedEventSelections.map((selection) => selection.eventId),
                invitedEventCounts: Object.fromEntries(parsedEventSelections.map((selection) => [selection.eventId, selection.invitedCount])),
            });
        });

        const importedPeople = guests.reduce((total, guest) => total + guest.invitedCount, 0);
        const resultingGuestEntries = mode === 'replace' ? guests.length : weddingData.rsvp.guests.length + guests.length;
        const resultingPeople = mode === 'replace' ? importedPeople : guestSummary.totalPeople + importedPeople;
        if (resultingGuestEntries > guestRecordLimit) addIssue('error', `This import would create ${resultingGuestEntries.toLocaleString()} guest entries, above the ${guestRecordLimit.toLocaleString()} limit.`);
        if (resultingPeople > inviteeLimit) addIssue('error', `This import would create ${resultingPeople.toLocaleString()} people, above the ${inviteeLimit.toLocaleString()} limit.`);

        return {
            fileName: file.name,
            guests,
            issues,
            totalRows: dataRows.length,
            validRows: guests.length,
            resultingGuestEntries,
            resultingPeople,
            preservedGuests,
            phoneNormalizations,
        };
    };

    const analyzeGuestCsvFile = async (file: File, mode: CsvImportMode = guestImportMode) => {
        setIsGuestCsvAnalyzing(true);
        setGuestCsvAnalysis(null);
        setGuestCsvImportMessage('');
        setGuestImportWarnings([]);
        try {
            setGuestCsvAnalysis(await buildGuestCsvAnalysis(file, mode));
        } catch (error) {
            setGuestCsvAnalysis({
                fileName: file.name,
                guests: [],
                issues: [{ level: 'error', message: error instanceof Error ? error.message : 'The CSV could not be read.' }],
                totalRows: 0,
                validRows: 0,
                resultingGuestEntries: weddingData.rsvp.guests.length,
                resultingPeople: guestSummary.totalPeople,
                preservedGuests: 0,
                phoneNormalizations: [],
            });
        } finally {
            setIsGuestCsvAnalyzing(false);
        }
    };

    const importGuestCsvFile = async (file: File) => {
        if (!file || guestCsvImportInFlightRef.current) return;
        const activeAnalysis = guestCsvAnalysis?.fileName === file.name ? guestCsvAnalysis : null;
        const blockingIssueCount = activeAnalysis?.issues.filter((issue) => issue.level === 'error').length ?? 0;
        if (!activeAnalysis || blockingIssueCount > 0) {
            setGuestImportWarnings(['Validate the selected CSV and resolve all blocking errors before importing.']);
            return;
        }
        if (guestImportMode === 'replace') {
            const guestsRemoved = Math.max(0, weddingData.rsvp.guests.length - activeAnalysis.preservedGuests);
            const confirmed = window.confirm(
                `Replace ${weddingData.rsvp.guests.length.toLocaleString()} current guest entries with ${activeAnalysis.validRows.toLocaleString()} validated rows? `
                + `${activeAnalysis.preservedGuests.toLocaleString()} existing guest link${activeAnalysis.preservedGuests === 1 ? '' : 's'} will be preserved. `
                + `${guestsRemoved.toLocaleString()} unmatched current guest${guestsRemoved === 1 ? '' : 's'} and their RSVP history may be removed.`
            );
            if (!confirmed) return;
        }
        if (file.size > MAX_GUEST_CSV_BYTES) {
            setGuestImportWarnings([`CSV files must be 5 MB or smaller. This file is ${(file.size / (1024 * 1024)).toFixed(1)} MB.`]);
            return;
        }

        const parsedCsv = parseCsv(await file.text());
        if (parsedCsv.error) {
            setGuestImportWarnings([parsedCsv.error]);
            return;
        }
        const rows = parsedCsv.rows;
        if (rows.length < 2) {
            setGuestImportWarnings(['CSV must include a header row and at least one guest row.']);
            return;
        }

        const [headers, ...dataRows] = rows;
        const normalizedHeaders = headers.map(normalizeCsvHeader);
        const headerIndex = (name: string) => normalizedHeaders.indexOf(normalizeCsvHeader(name));
        const familySizeIndex = headerIndex('familySize') >= 0 ? headerIndex('familySize') : headerIndex('invitedCount');
        const ignoredHeaderKeys = new Set([...guestCsvBaseHeaders, ...guestCsvMetadataHeaders, ...guestCsvLegacyHeaders].map(normalizeCsvHeader));
        const warnings: string[] = [];
        const usedEventColumnIndexes = new Set<number>();
        const findHeaderIndex = (candidates: string[]) => normalizedHeaders.findIndex((header) => (
            candidates.some((candidate) => normalizeCsvHeader(candidate) === header)
        ));
        const eventColumns = weddingData.events
            .map((event) => {
                const statusIndex = findHeaderIndex([event.eventName, event.id]);
                const inviteeIndex = findHeaderIndex([
                    inviteeCountHeader(event.eventName),
                    `${event.eventName} Count`,
                    `${event.eventName} Invited Count`,
                    inviteeCountHeader(event.id),
                ]);
                if (statusIndex >= 0) usedEventColumnIndexes.add(statusIndex);
                if (inviteeIndex >= 0) usedEventColumnIndexes.add(inviteeIndex);
                if (statusIndex < 0 && inviteeIndex < 0) return null;
                return { statusIndex, inviteeIndex, eventId: event.id, eventName: event.eventName };
            })
            .filter((column): column is { statusIndex: number; inviteeIndex: number; eventId: string; eventName: string } => Boolean(column));

        headers.forEach((header, index) => {
            const normalizedHeader = normalizedHeaders[index];
            if (!header.trim() || ignoredHeaderKeys.has(normalizedHeader) || usedEventColumnIndexes.has(index)) return;
            warnings.push(`Column "${header}" does not match a current event or supported guest field.`);
        });
        const existingCodes = new Set(weddingData.rsvp.guests.map((guest) => guest.inviteCode));
        const existingIds = new Set(weddingData.rsvp.guests.map((guest) => guest.id));

        dataRows.forEach((row, rowIndex) => {
            const displayRow = rowIndex + 2;
            const guestName = row[headerIndex('guestName')]?.trim() ?? '';
            const phone = row[headerIndex('phone')]?.trim() ?? '';
            const category = row[headerIndex('category')]?.trim() ?? '';
            const invitedCountValue = familySizeIndex >= 0 ? row[familySizeIndex]?.trim() ?? '' : '';
            const parsedInvitedCount = invitedCountValue ? Number(invitedCountValue) : 1;
            const invitedCount = Number.isFinite(parsedInvitedCount) && parsedInvitedCount >= 1
                ? Math.floor(parsedInvitedCount)
                : 1;
            const parsedEventSelections = eventColumns.map((column) => {
                const eventValue = column.statusIndex >= 0 ? (row[column.statusIndex] ?? '').trim() : '';
                const normalizedEventValue = eventValue.toLowerCase();
                const inviteeValue = column.inviteeIndex >= 0 ? (row[column.inviteeIndex] ?? '').trim() : '';
                const normalizedInviteeValue = inviteeValue.toLowerCase();
                const isLegacyTwoColumnFormat = column.inviteeIndex >= 0;
                const isAllValue = (value: string) => ['all', 'everyone', 'family', 'full', 'yes', 'y', 'true'].includes(value);
                const parseInviteeCount = (value: string) => {
                    if (!value || notInvitedCsvValues.has(value)) return 0;
                    if (isAllValue(value)) return invitedCount;
                    const parsedEventInvitees = Number(value);
                    if (Number.isFinite(parsedEventInvitees) && parsedEventInvitees >= 0) {
                        return Math.min(Math.floor(parsedEventInvitees), invitedCount);
                    }
                    warnings.push(`Row ${displayRow}: ${column.eventName} should be 0, All, or a number between 1 and ${invitedCount}.`);
                    return 0;
                };

                let eventInvitees = 0;
                if (isLegacyTwoColumnFormat) {
                    const hasStatusYes = invitedCsvValues.has(normalizedEventValue);
                    const hasStatusNo = notInvitedCsvValues.has(normalizedEventValue);
                    const inviteeValueSelectsEvent = Boolean(inviteeValue) && !notInvitedCsvValues.has(normalizedInviteeValue);
                    const isInvited = hasStatusYes || (!hasStatusNo && inviteeValueSelectsEvent);
                    if (!isInvited) return null;
                    eventInvitees = inviteeValue ? parseInviteeCount(normalizedInviteeValue) : invitedCount;
                } else {
                    eventInvitees = parseInviteeCount(normalizedEventValue);
                }

                if (eventInvitees <= 0) return null;
                return { eventId: column.eventId, invitedCount: eventInvitees };
            }).filter((selection): selection is { eventId: string; invitedCount: number } => Boolean(selection));
            const invitedEventIds = parsedEventSelections.map((selection) => selection.eventId);
            const invitedEventCounts = Object.fromEntries(parsedEventSelections.map((selection) => [selection.eventId, selection.invitedCount]));

            if (!guestName) warnings.push(`Row ${displayRow}: guestName is missing.`);
            if (!phone) warnings.push(`Row ${displayRow}: phone is missing.`);
            if (invitedCountValue && (!Number.isFinite(parsedInvitedCount) || parsedInvitedCount < 1)) {
                warnings.push(`Row ${displayRow}: familySize is invalid.`);
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
                invitedEventCounts,
            };
        });

        const importedGuests = activeAnalysis.guests;
        const importedPeople = importedGuests.reduce((total, guest) => total + normalizeInvitedCount(guest.invitedCount), 0);
        const resultingGuestEntries = guestImportMode === 'replace'
            ? importedGuests.length
            : weddingData.rsvp.guests.length + importedGuests.length;
        const resultingPeople = guestImportMode === 'replace'
            ? importedPeople
            : guestSummary.totalPeople + importedPeople;
        const capacityErrors: string[] = [];
        const oversizedRows = importedGuests
            .map((guest, index) => ({ guest, row: index + 2 }))
            .filter(({ guest }) => normalizeInvitedCount(guest.invitedCount) > MAX_GUEST_FAMILY_SIZE);

        if (oversizedRows.length) {
            capacityErrors.push(`${oversizedRows.length} row${oversizedRows.length === 1 ? '' : 's'} exceed the maximum Family Size of ${MAX_GUEST_FAMILY_SIZE}.`);
        }
        if (resultingGuestEntries > guestRecordLimit) {
            capacityErrors.push(`This import would create ${resultingGuestEntries.toLocaleString()} guest entries, above the ${guestRecordLimit.toLocaleString()} limit.`);
        }
        if (resultingPeople > inviteeLimit) {
            capacityErrors.push(`This import would create ${resultingPeople.toLocaleString()} people, above the ${inviteeLimit.toLocaleString()} limit.`);
        }
        if (capacityErrors.length) {
            setGuestImportWarnings([...capacityErrors, ...warnings]);
            return;
        }
        guestCsvImportInFlightRef.current = true;
        setIsGuestCsvImporting(true);
        setGuestCsvImportMessage('');
        setGuestImportWarnings([]);
        try {
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
            setGuestImportWarnings([]);
            setSelectedGuestCsvFile(null);
            setGuestCsvAnalysis(null);
            setGuestCsvImportMessage(`${importedGuests.length.toLocaleString()} guest row${importedGuests.length === 1 ? '' : 's'} imported successfully.`);
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
        setGuestImportWarnings([]);
        setSelectedGuestCsvFile(null);
        setGuestCsvAnalysis(null);
        setGuestCsvImportMessage(`${importedGuests.length.toLocaleString()} guest row${importedGuests.length === 1 ? '' : 's'} imported successfully.`);
        } catch (error) {
            console.warn('Could not import CSV', error);
            setGuestImportWarnings([error instanceof Error ? error.message : 'The CSV import could not be completed. No guest data was changed.']);
        } finally {
            guestCsvImportInFlightRef.current = false;
            setIsGuestCsvImporting(false);
        }
    };

    const handleGuestCsvImport = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        event.target.value = '';
        setSelectedGuestCsvFile(file);
        setGuestCsvAnalysis(null);
        setGuestCsvImportMessage('');
        setGuestImportWarnings([]);
        if (file) {
            void analyzeGuestCsvFile(file);
        }
    };

    const handleGuestImportModeChange = (mode: CsvImportMode) => {
        setGuestImportMode(mode);
        setGuestCsvAnalysis(null);
        setGuestCsvImportMessage('');
        setGuestImportWarnings([]);
        if (selectedGuestCsvFile) void analyzeGuestCsvFile(selectedGuestCsvFile, mode);
    };

    const downloadGuestCsvIssues = () => {
        if (!guestCsvAnalysis?.issues.length) return;
        downloadCsv(`${weddingData.wedding.slug}-guest-import-issues.csv`, [
            ['severity', 'row', 'column', 'submittedValue', 'message'],
            ...guestCsvAnalysis.issues.map((issue) => [
                issue.level,
                issue.row ?? '',
                issue.column ?? '',
                issue.value ?? '',
                issue.message,
            ]),
        ]);
    };

    const exportRsvpCsv = () => {
        const relevantResponses = rsvpResponses.filter((response) => response.weddingSlug === weddingData.wedding.slug);
        const rows: Array<Array<string | number>> = [[
            'guestName',
            'phone',
            'category',
            'familySize',
            'eventName',
            'rsvpStatus',
            'attendingCount',
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
                    response?.attendingCount ?? '',
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

    const toggleAllVisibleGuests = () => {
        const visibleIds = paginatedGuestRows.map(({ guest }) => guest.id);
        setSelectedGuestIds((current) => (
            areAllVisibleGuestsSelected
                ? current.filter((id) => !visibleIds.includes(id))
                : Array.from(new Set([...current, ...visibleIds]))
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
            clearDashboardDraft(dashboardDraftStorageKey);
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
                    <span className={`dashboard-live-status status-${websiteActivationState}`}>
                        <WebsiteActivationIcon state={websiteActivationState} size={15} />
                        {websiteActivationLabels[websiteActivationState]}
                    </span>
                </div>
                {authNotice && <p className="dashboard-auth-notice">{authNotice}</p>}
                <div className="dashboard-draft-bar">
                    <span className={hasUnsavedChanges ? 'unsaved' : 'saved'}>
                        {hasUnsavedChanges ? 'Unsaved changes' : saveStatus || 'Draft ready'}
                    </span>
                    {saveError && <em>{saveError}</em>}
                    {showTechnicalSaveDetail && <em className="technical-detail">Technical detail: {saveErrorDetail}</em>}
                    <small className="dashboard-save-hint">Save buttons apply all unsaved dashboard changes.</small>
                    <button type="button" onClick={handleResetDraft}>{discardUnsavedChangesLabel}</button>
                    {isConfigured && <button type="button" onClick={handleLogout}>Logout</button>}
                </div>
                <div className="dashboard-mobile-section-nav">
                    <label htmlFor="dashboard-mobile-section-select">Dashboard section</label>
                    <div className="dashboard-mobile-section-control">
                        <button
                            type="button"
                            className="dashboard-mobile-section-step"
                            onClick={() => navigateToAdjacentDashboardTab(-1)}
                            disabled={activeDashboardTabIndex === 0}
                            aria-label="Previous dashboard section"
                            title="Previous section"
                        >
                            <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
                        </button>
                        <select
                            id="dashboard-mobile-section-select"
                            value={activeTab}
                            onChange={(event) => navigateToDashboardTab(event.target.value as DashboardTab)}
                            aria-describedby="dashboard-mobile-section-position"
                        >
                            {dashboardTabGroups.map((group) => (
                                <optgroup label={group.label} key={group.label}>
                                    {group.tabs.map((tab) => {
                                        const isLockedTab = ((tab.id === 'guests' || tab.id === 'whatsapp') && !hasDashboardGuestAccess)
                                            || ((tab.id === 'rsvp' || tab.id === 'rsvp-settings') && !hasDashboardRsvpAccess);

                                        return (
                                            <option value={tab.id} key={tab.id}>
                                                {tab.label}{isLockedTab ? ' (Pro)' : ''}
                                            </option>
                                        );
                                    })}
                                </optgroup>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="dashboard-mobile-section-step"
                            onClick={() => navigateToAdjacentDashboardTab(1)}
                            disabled={activeDashboardTabIndex === dashboardTabs.length - 1}
                            aria-label="Next dashboard section"
                            title="Next section"
                        >
                            <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
                        </button>
                    </div>
                    <p id="dashboard-mobile-section-position">
                        {activeDashboardTab.groupLabel} · {activeDashboardTabIndex + 1} of {dashboardTabs.length}
                    </p>
                </div>
                <nav className="dashboard-tabs" aria-label="Dashboard sections">
                    {dashboardTabGroups.map((group) => (
                        <div className="dashboard-tab-group" key={group.label}>
                            <p className="dashboard-tab-group-label">{group.label}</p>
                            {group.tabs.map((tab) => {
                                const isLockedTab = ((tab.id === 'guests' || tab.id === 'whatsapp') && !hasDashboardGuestAccess)
                                    || ((tab.id === 'rsvp' || tab.id === 'rsvp-settings') && !hasDashboardRsvpAccess);

                                return (
                                    <button
                                        key={tab.id}
                                        className={`${activeTab === tab.id ? 'active' : ''}${isLockedTab ? ' locked' : ''}`}
                                        onClick={() => navigateToDashboardTab(tab.id)}
                                        type="button"
                                        aria-label={`${tab.label}${isLockedTab ? ', available on the Pro plan' : ''}`}
                                        title={isLockedTab ? 'Available on the Pro plan' : undefined}
                                    >
                                        <span className="dashboard-tab-label">{tab.label}</span>
                                        {isLockedTab && <LockKeyhole className="dashboard-tab-lock" size={16} strokeWidth={2} aria-hidden="true" />}
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
                                {saveAllChangesLabel}
                            </button>
                        </div>
                        <WebsiteActivationBanner
                            state={websiteActivationState}
                            websiteUrl={weddingWebsiteUrl}
                            onCopy={copyWeddingWebsiteUrl}
                            onPreview={openDashboardPreview}
                        />
                        <div className="overview-grid">
                            <ReadOnlyBadgeCard
                                label="Plan"
                                value={getPackageDisplayLabel(weddingData.wedding.packageType)}
                                helperText={packageDetails[weddingData.wedding.packageType].summary}
                            />
                            <ReadOnlyBadgeCard
                                label="Website status"
                                value={websiteActivationLabels[websiteActivationState]}
                                helperText={isWeddingWebsiteLive
                                    ? 'Guests can open the public wedding link.'
                                    : 'Your dashboard preview remains available while the public website is private.'}
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
                            isLive={isWeddingWebsiteLive}
                            onCopy={copyWeddingWebsiteUrl}
                            onPreview={openDashboardPreview}
                        />
                        <div className="form-grid dashboard-shell-fields">
                            <TextField
                                label="Website address"
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
                            <div className="validation-summary" role="alert">
                                <strong>{validationCount} validation warning{validationCount === 1 ? '' : 's'} need attention.</strong>
                                <ul>
                                    {validationDetails.slice(0, 8).map((detail) => <li key={detail}>{detail}</li>)}
                                </ul>
                                {validationDetails.length > 8 && (
                                    <p>{validationDetails.length - 8} additional warning{validationDetails.length - 8 === 1 ? '' : 's'} appear in the related editor fields.</p>
                                )}
                            </div>
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
                                {saveAllChangesLabel}
                            </button>
                        </div>
                        <p className="dashboard-note">
                            Opening Reveal controls the first animation and the optional image guests can see before the invitation content.
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
                                        <TextField label="Tap to Reveal Text" value={weddingData.hero.revealCtaText} multiline rows={2} onChange={(value) => updateHero('revealCtaText', value)} />
                                        <SelectField
                                            label="Music / Audio"
                                            value={resolveAssetPath(weddingData.music.audioSrc)}
                                            options={musicOptions.map((option) => option.value)}
                                            optionLabels={musicOptionLabels}
                                            onChange={applyMusic}
                                        />
                                        <ToggleField
                                            label="Reveal image after video"
                                            checked={weddingData.hero.skipRevealImage !== true}
                                            onLabel="Visible"
                                            offLabel="Skipped"
                                            helperText="When skipped, guests go from the opening video directly to Our Story/content."
                                            onChange={(checked) => updateHero('skipRevealImage', !checked)}
                                        />
                                    </div>
                                </section>

                                {weddingData.hero.skipRevealImage !== true && (
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
                                                    imageSrc={option.thumbnailSrc}
                                                    selected={weddingData.hero.revealImageSrc === option.imageSrc}
                                                    onClick={() => applyRevealedImage(option)}
                                                />
                                            ))}
                                        </div>
                                        <WeddingMediaLibrary
                                            assets={weddingMedia}
                                            pendingRemovalIds={pendingWeddingMediaDeletionIds}
                                            selectedSrc={weddingData.hero.revealImageSrc}
                                            isUploading={mediaUploadingSection === 'opening-reveal'}
                                            isLoading={isWeddingMediaLoading}
                                            setupRequired={weddingMediaSetupRequired}
                                            disabled={!supabaseWeddingId}
                                            onUpload={(file) => void uploadWeddingImage(file, 'opening-reveal', (imageSrc) => updateHero('revealImageSrc', imageSrc))}
                                            onSelect={(asset) => updateHero('revealImageSrc', asset.publicUrl)}
                                            onDelete={(asset) => void removeWeddingMediaAsset(asset)}
                                            isInUse={isWeddingMediaInUse}
                                        />
                                    </section>
                                )}
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
                                {saveAllChangesLabel}
                            </button>
                        </div>
                        <p className="dashboard-note">
                            Our Story uses one shared data model across all templates.
                        </p>

                        <div className="our-story-layout">
                            <div className="our-story-editor-groups">
                                <section className="our-story-group">
                                    <ToggleField
                                        label="Our Story section"
                                        checked={weddingData.couple.enabled}
                                        onLabel="Visible"
                                        offLabel="Hidden"
                                        onChange={(checked) => updateCouple('enabled', checked)}
                                    />
                                    <div className="form-grid">
                                        <TextField label="Couple Display Name" value={weddingData.couple.displayName} multiline rows={2} onChange={(value) => updateCouple('displayName', value)} />
                                        <TextField label="Subtitle" value={weddingData.couple.introLine} multiline rows={2} onChange={(value) => updateCouple('introLine', value)} />
                                        <TextField label="Story Title" value={weddingData.couple.storyTitle} multiline rows={2} onChange={(value) => updateCouple('storyTitle', value)} />
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
                                        {visibleStoryImageOptions.map((option) => (
                                            <button
                                                key={option.key}
                                                className={`story-image-card ${resolveAssetPath(weddingData.couple.backgroundImageSrc) === option.imageSrc ? 'selected' : ''}`}
                                                type="button"
                                                onClick={() => applyStoryImage(option)}
                                            >
                                                <img src={resolveAssetPath(option.thumbnailSrc)} alt="" loading="lazy" decoding="async" />
                                                <strong>{option.label}</strong>
                                                <span>{option.themeLabel}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <WeddingMediaLibrary
                                        assets={weddingMedia}
                                        pendingRemovalIds={pendingWeddingMediaDeletionIds}
                                        selectedSrc={weddingData.couple.backgroundImageSrc}
                                        isUploading={mediaUploadingSection === 'our-story'}
                                        isLoading={isWeddingMediaLoading}
                                        setupRequired={weddingMediaSetupRequired}
                                        disabled={!supabaseWeddingId}
                                        onUpload={(file) => void uploadWeddingImage(file, 'our-story', (imageSrc) => updateCouple('backgroundImageSrc', imageSrc))}
                                        onSelect={(asset) => updateCouple('backgroundImageSrc', asset.publicUrl)}
                                        onDelete={(asset) => void removeWeddingMediaAsset(asset)}
                                        isInUse={isWeddingMediaInUse}
                                    />
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
                                {saveAllChangesLabel}
                            </button>
                        </div>
                        <ToggleField
                            label="Couple section"
                            checked={weddingData.couple.enabled}
                            onLabel="Visible"
                            offLabel="Hidden"
                            onChange={(checked) => updateCouple('enabled', checked)}
                        />
                        <div className="form-grid">
                            <TextField label="Bride name" value={weddingData.couple.brideName} error={validation.brideName} onChange={(value) => updateCouple('brideName', value)} />
                            <TextField label="Groom name" value={weddingData.couple.groomName} error={validation.groomName} onChange={(value) => updateCouple('groomName', value)} />
                            <TextField label="Display name" value={weddingData.couple.displayName} multiline rows={2} onChange={(value) => updateCouple('displayName', value)} />
                            <TextField label="Intro line" value={weddingData.couple.introLine} multiline rows={2} onChange={(value) => updateCouple('introLine', value)} />
                            <TextField label="Blessing line" value={weddingData.couple.blessingLine} multiline rows={2} onChange={(value) => updateCouple('blessingLine', value)} />
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
                                    {saveAllChangesLabel}
                                </button>
                                <button className="dashboard-primary-btn" type="button" onClick={addEvent}>Add event</button>
                            </div>
                        </div>
                        <div className="event-editor-list">
                            {weddingData.events.map((event, index) => (
                                <div className="event-editor" key={event.id}>
                                    <div className="event-editor-header">
                                        <h3>{event.eventName || `Event ${index + 1}`}</h3>
                                        <div className="event-order-actions">
                                            <button type="button" onClick={() => moveEvent(index, -1)} disabled={index === 0}>Move Up</button>
                                            <button type="button" onClick={() => moveEvent(index, 1)} disabled={index === weddingData.events.length - 1}>Move Down</button>
                                            <button type="button" onClick={() => deleteEvent(index)}>Delete</button>
                                        </div>
                                    </div>
                                    <div className="event-editor-body">
                                        <div className="event-editor-main">
                                            <section className="event-settings-group">
                                                <div className="event-settings-group-header">
                                                    <span>Basic Details</span>
                                                    <p>Name the function and choose the event category.</p>
                                                </div>
                                                <div className="event-editor-fields form-grid">
                                                    <TextField label="Event name" value={event.eventName} error={validation.events[index]?.eventName} multiline rows={2} onChange={(value) => updateEvent(index, 'eventName', value)} />
                                                    <SelectField
                                                        label="Event type"
                                                        value={event.eventKey ?? ''}
                                                        options={eventTypeOptions}
                                                        optionLabels={eventTypeLabels}
                                                        onChange={(value) => updateEvent(index, 'eventKey', value)}
                                                    />
                                                    <TextField label="Date" value={event.date} error={validation.events[index]?.date} onChange={(value) => updateEvent(index, 'date', value)} />
                                                    <TextField label="Start time" value={event.startTime} error={validation.events[index]?.startTime} onChange={(value) => updateEvent(index, 'startTime', value)} />
                                                </div>
                                            </section>

                                            <section className="event-settings-group">
                                                <div className="event-settings-group-header">
                                                    <span>Location</span>
                                                    <p>Add venue details and an optional Google Maps link.</p>
                                                </div>
                                                <div className="event-editor-fields form-grid">
                                                    <TextField label="Venue name" value={event.venueName} error={validation.events[index]?.venueName} multiline rows={2} onChange={(value) => updateEvent(index, 'venueName', value)} />
                                                    <TextField label="City" value={event.city} multiline rows={2} onChange={(value) => updateEvent(index, 'city', value)} />
                                                    <TextField label="Google Maps link (optional)" value={event.mapsUrl} onChange={(value) => updateEvent(index, 'mapsUrl', value)} />
                                                </div>
                                            </section>

                                            <section className="event-settings-group">
                                                <div className="event-settings-group-header">
                                                    <span>Display</span>
                                                    <p>Control text readability, placement, animation, and guest actions.</p>
                                                </div>
                                                <div className="event-editor-fields form-grid">
                                                    <SelectField
                                                        label="Text Style"
                                                        value={event.eventTextStyle ?? 'auto'}
                                                        options={eventTextStyleOptions}
                                                        optionLabels={eventTextStyleLabels}
                                                        onChange={(value) => updateEvent(index, 'eventTextStyle', value as WeddingEvent['eventTextStyle'])}
                                                    />
                                                    <SelectField
                                                        label="Text Position"
                                                        value={normalizeEventTextPositionOption(event.eventTextPosition)}
                                                        options={eventTextPositionOptions}
                                                        optionLabels={eventTextPositionLabels}
                                                        onChange={(value) => updateEvent(index, 'eventTextPosition', value as NonNullable<WeddingEvent['eventTextPosition']>)}
                                                    />
                                                    <SelectField
                                                        label="Event Animation"
                                                        value={normalizeEventAnimationKey(event.eventAnimationKey)}
                                                        options={eventAnimationKeys}
                                                        optionLabels={eventAnimationOptionLabels}
                                                        onChange={(value) => updateEvent(index, 'eventAnimationKey', value as WeddingEvent['eventAnimationKey'])}
                                                    />
                                                </div>
                                                <div className="event-toggle-grid">
                                                    <ToggleField
                                                        label="Add to Calendar button"
                                                        checked={event.eventShowCalendar !== false}
                                                        onLabel="Visible"
                                                        offLabel="Hidden"
                                                        onChange={(checked) => updateEvent(index, 'eventShowCalendar', checked)}
                                                    />
                                                    <ToggleField
                                                        label="Invitee count"
                                                        checked={event.eventShowInvitedCount === true}
                                                        onLabel="Visible"
                                                        offLabel="Hidden"
                                                        helperText="Shows each guest/family their invited count for this event."
                                                        onChange={(checked) => updateEvent(index, 'eventShowInvitedCount', checked)}
                                                    />
                                                </div>
                                            </section>
                                        </div>

                                        <EventVisualPicker
                                            event={event}
                                            themeKey={weddingData.wedding.themeKey}
                                            onSelect={(visualKey) => updateEvent(index, 'eventVisualKey', visualKey)}
                                            isAdminMode={isAdminMode}
                                            persistenceKey={eventVisualPickerStorageKey}
                                            uploadedMedia={weddingMedia}
                                            pendingRemovalIds={pendingWeddingMediaDeletionIds}
                                            isMediaUploading={mediaUploadingSection === 'events'}
                                            isMediaLoading={isWeddingMediaLoading}
                                            mediaSetupRequired={weddingMediaSetupRequired}
                                            mediaUploadDisabled={!supabaseWeddingId}
                                            onUploadMedia={(file) => void uploadWeddingImage(file, 'events', (imageSrc) => updateEvent(index, 'eventVisualKey', imageSrc))}
                                            onDeleteMedia={(asset) => void removeWeddingMediaAsset(asset)}
                                            isMediaInUse={isWeddingMediaInUse}
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
                    <div className="dashboard-panel guest-list-panel">
                        <div className="dashboard-panel-header dashboard-panel-header-row">
                            <div>
                                <p className="dashboard-eyebrow">Guest List</p>
                                <h2>Manage guests and invite links</h2>
                            </div>
                            <div className="dashboard-header-actions">
                                {selectedGuestIds.length > 0 && (
                                    <button className="dashboard-primary-btn secondary delete-selected-btn" type="button" onClick={deleteSelectedGuests}>
                                        Delete selected ({selectedGuestIds.length})
                                    </button>
                                )}
                                <button className="dashboard-primary-btn secondary" type="button" onClick={handleSaveDraft}>
                                    {saveAllChangesLabel}
                                </button>
                                <button
                                    className="dashboard-primary-btn"
                                    type="button"
                                    disabled={cannotAddGuest}
                                    title={cannotAddGuest ? 'Guest capacity reached' : undefined}
                                    onClick={addGuest}
                                >
                                    Add guest
                                </button>
                            </div>
                        </div>
                        <div className="guest-summary-grid">
                            <InfoBlock label="Guest Entries" value={`${guestSummary.totalGuests.toLocaleString()} / ${guestRecordLimit.toLocaleString()}`} />
                            <InfoBlock label="Total People" value={`${guestSummary.totalPeople.toLocaleString()} / ${inviteeLimit.toLocaleString()}`} />
                            <InfoBlock label="Unassigned Families" value={String(guestSummary.noEventGuests)} />
                            <InfoBlock label="Missing phone" value={String(guestSummary.missingPhoneGuests)} />
                        </div>
                        <p className={`guest-capacity-note${cannotAddGuest ? ' limit-reached' : ''}`}>
                            {cannotAddGuest
                                ? 'Guest capacity reached. Remove an entry, reduce Family Size, or contact Shaadi Nyota for a higher limit.'
                                : `${(guestRecordLimit - guestSummary.totalGuests).toLocaleString()} guest entries and ${(inviteeLimit - guestSummary.totalPeople).toLocaleString()} people remaining.`}
                        </p>
                        <div className="guest-csv-panel">
                            <div className="guest-csv-panel-header">
                                <div>
                                    <h3>Guest list import</h3>
                                    <p>Upload a CSV, review every issue, and import only after the file passes validation.</p>
                                </div>
                            </div>
                            <div className="guest-csv-toolbar">
                                <button className="dashboard-primary-btn secondary" type="button" onClick={downloadGuestCsvTemplate}>
                                    Download CSV Template
                                </button>
                                <button className="dashboard-primary-btn secondary" type="button" onClick={exportGuestsCsv}>
                                    Export Guests
                                </button>
                            </div>
                            <p className="guest-csv-helper">
                                Required columns are guestName, phone, and familySize. Each event column accepts 0, All, or a whole number capped by Family Size. Maximum file size is 5 MB.
                            </p>
                            <div className="guest-csv-import-row">
                                <label className="csv-mode-select">
                                    <span>Import Mode</span>
                                    <select
                                        value={guestImportMode}
                                        onChange={(event) => handleGuestImportModeChange(event.target.value as CsvImportMode)}
                                        disabled={isGuestCsvAnalyzing || isGuestCsvImporting}
                                    >
                                        <option value="append">Append new guests</option>
                                        <option value="replace">Replace existing guests</option>
                                    </select>
                                </label>
                                <label className="csv-file-control">
                                    <span>Choose CSV File</span>
                                    <input
                                        type="file"
                                        accept=".csv,text/csv"
                                        disabled={isGuestCsvAnalyzing || isGuestCsvImporting}
                                        onChange={handleGuestCsvImport}
                                    />
                                </label>
                                <button
                                    className="dashboard-primary-btn secondary"
                                    type="button"
                                    disabled={!selectedGuestCsvFile || !guestCsvAnalysis || guestCsvAnalysis.issues.some((issue) => issue.level === 'error') || isGuestCsvAnalyzing || isGuestCsvImporting}
                                    onClick={() => {
                                        if (selectedGuestCsvFile) void importGuestCsvFile(selectedGuestCsvFile);
                                    }}
                                >
                                    {isGuestCsvImporting
                                        ? 'Importing...'
                                        : guestImportMode === 'replace'
                                            ? 'Replace validated guest list'
                                            : 'Import validated guests'}
                                </button>
                                {selectedGuestCsvFile && <span className="csv-selected-file">{selectedGuestCsvFile.name}</span>}
                            </div>
                        </div>
                            {isGuestCsvAnalyzing && (
                                <div className="csv-analysis-loading" role="status" aria-live="polite">
                                    Checking file structure, guest details, event assignments, and capacity...
                                </div>
                            )}
                            {guestCsvAnalysis && !isGuestCsvAnalyzing && (
                                <GuestCsvValidationPanel
                                    analysis={guestCsvAnalysis}
                                    mode={guestImportMode}
                                    currentGuestCount={weddingData.rsvp.guests.length}
                                    onDownloadIssues={downloadGuestCsvIssues}
                                />
                            )}
                            {guestCsvImportMessage && <div className="csv-import-success" role="status">{guestCsvImportMessage}</div>}
                        {guestImportWarnings.length > 0 && (
                            <div className="csv-warning-box csv-import-failure" role="alert">
                                <strong>Import could not be completed</strong>
                                <ul>
                                    {guestImportWarnings.map((warning) => (
                                        <li key={warning}>{warning}</li>
                                    ))}
                                </ul>
                                <p>The selected file and validation results have been kept so you can correct the issue and retry.</p>
                            </div>
                        )}
                        <div className="guest-filter-bar">
                            <div className="guest-filter-header">
                                <div>
                                    <strong>Filter guest list</strong>
                                    <span>
                                        {filteredGuestRows.length.toLocaleString()} of {weddingData.rsvp.guests.length.toLocaleString()} guests
                                    </span>
                                </div>
                                {activeGuestFilterCount > 0 && (
                                    <button className="guest-filter-clear" type="button" onClick={clearGuestFilters}>
                                        Clear filters ({activeGuestFilterCount})
                                    </button>
                                )}
                            </div>
                            <div className="guest-mobile-filter-actions">
                                <label className="guest-mobile-search">
                                    <span>Search guests</span>
                                    <input
                                        value={guestSearchQuery}
                                        onChange={(event) => {
                                            setGuestSearchQuery(event.target.value);
                                            setGuestPage(1);
                                        }}
                                        placeholder="Name, phone, category, or RSVP"
                                        type="search"
                                    />
                                </label>
                                <div className="guest-mobile-quick-filters" aria-label="Quick guest filters">
                                    <button
                                        className={activeGuestFilterCount === 0 ? 'active' : ''}
                                        type="button"
                                        onClick={clearGuestFilters}
                                    >
                                        All
                                    </button>
                                    <button
                                        className={guestWhatsAppFilter === 'invite-not-sent' ? 'active' : ''}
                                        type="button"
                                        onClick={() => {
                                            setGuestWhatsAppFilter(guestWhatsAppFilter === 'invite-not-sent' ? 'all' : 'invite-not-sent');
                                            setGuestPage(1);
                                        }}
                                    >
                                        Not sent
                                    </button>
                                    <button
                                        className={guestRsvpFilter === 'no-response' ? 'active' : ''}
                                        type="button"
                                        onClick={() => {
                                            setGuestRsvpFilter(guestRsvpFilter === 'no-response' ? 'all' : 'no-response');
                                            setGuestPage(1);
                                        }}
                                    >
                                        No RSVP
                                    </button>
                                    <button
                                        className={guestPhoneFilter === 'missing' ? 'active' : ''}
                                        type="button"
                                        onClick={() => {
                                            setGuestPhoneFilter(guestPhoneFilter === 'missing' ? 'all' : 'missing');
                                            setGuestPage(1);
                                        }}
                                    >
                                        Missing phone
                                    </button>
                                </div>
                                <button
                                    className="guest-filter-toggle"
                                    type="button"
                                    aria-expanded={areGuestFiltersOpen}
                                    onClick={() => setAreGuestFiltersOpen((current) => !current)}
                                >
                                    {areGuestFiltersOpen ? 'Hide filters' : `More filters${activeGuestFilterCount ? ` (${activeGuestFilterCount})` : ''}`}
                                </button>
                            </div>
                            <div className={`guest-filter-grid${areGuestFiltersOpen ? ' mobile-open' : ''}`}>
                                <label className="guest-filter-field guest-filter-search">
                                    <span>Search</span>
                                    <input
                                        value={guestSearchQuery}
                                        onChange={(event) => {
                                            setGuestSearchQuery(event.target.value);
                                            setGuestPage(1);
                                        }}
                                        placeholder="Guest, phone, category, or RSVP"
                                    />
                                </label>
                                <label className="guest-filter-field">
                                    <span>Category</span>
                                    <select
                                        value={guestCategoryFilter}
                                        onChange={(event) => {
                                            setGuestCategoryFilter(event.target.value);
                                            setGuestPage(1);
                                        }}
                                    >
                                        <option value="all">All categories</option>
                                        {weddingData.rsvp.guests.some((guest) => !guest.category.trim()) && (
                                            <option value="uncategorized">Uncategorized</option>
                                        )}
                                        {guestCategoryOptions.map((category) => (
                                            <option key={category} value={category}>{category}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="guest-filter-field">
                                    <span>WhatsApp</span>
                                    <select
                                        value={guestWhatsAppFilter}
                                        onChange={(event) => {
                                            setGuestWhatsAppFilter(event.target.value as GuestWhatsAppFilter);
                                            setGuestPage(1);
                                        }}
                                    >
                                        <option value="all">Any send status</option>
                                        <option value="invite-not-sent">Invite not sent</option>
                                        <option value="invite-sent">Invite sent</option>
                                        <option value="no-reminders">No reminder sent</option>
                                        <option value="reminders-sent">Reminder sent</option>
                                    </select>
                                </label>
                                <label className="guest-filter-field">
                                    <span>RSVP Progress</span>
                                    <select
                                        value={guestRsvpFilter}
                                        onChange={(event) => {
                                            setGuestRsvpFilter(event.target.value as GuestRsvpFilter);
                                            setGuestPage(1);
                                        }}
                                    >
                                        <option value="all">Any RSVP status</option>
                                        <option value="no-response">No response yet</option>
                                        <option value="pending">Has pending responses</option>
                                        <option value="complete">All events answered</option>
                                        <option value="attending">Attending an event</option>
                                        <option value="maybe">Maybe for an event</option>
                                        <option value="declined">Declined all events</option>
                                    </select>
                                </label>
                                <label className="guest-filter-field">
                                    <span>Last RSVP Update</span>
                                    <select
                                        value={guestActivityFilter}
                                        onChange={(event) => {
                                            setGuestActivityFilter(event.target.value as GuestActivityFilter);
                                            setGuestPage(1);
                                        }}
                                    >
                                        <option value="all">Any update time</option>
                                        <option value="never">Never submitted</option>
                                        <option value="last-7-days">Updated in last 7 days</option>
                                        <option value="older-than-7-days">Updated over 7 days ago</option>
                                    </select>
                                </label>
                                <label className="guest-filter-field">
                                    <span>Phone</span>
                                    <select
                                        value={guestPhoneFilter}
                                        onChange={(event) => {
                                            setGuestPhoneFilter(event.target.value as GuestPhoneFilter);
                                            setGuestPage(1);
                                        }}
                                    >
                                        <option value="all">Any phone status</option>
                                        <option value="available">Ready to message</option>
                                        <option value="missing">Missing phone</option>
                                    </select>
                                </label>
                            </div>
                        </div>
                        <div className="guest-mobile-list" aria-label="Guest list">
                            {paginatedGuestRows.map(({ guest, guestIndex }) => {
                                const guestRsvpSummary = rsvpAnalytics.guestSummaryById.get(guest.id);
                                const messageHistory = guestMessageHistoryByGuestId.get(guest.id) ?? [];
                                const invitationHistory = messageHistory.filter((entry) => entry.messageType === 'invitation');
                                const reminderHistory = messageHistory.filter((entry) => entry.messageType === 'reminder');
                                const firstInvitation = invitationHistory[invitationHistory.length - 1];
                                const lastReminder = reminderHistory[0];
                                const inviteWhatsAppUrl = getGuestWhatsAppUrl(guest, 'invitation');
                                const reminderWhatsAppUrl = getGuestWhatsAppUrl(guest, 'reminder');
                                const primaryMessageType: GuestMessageType = firstInvitation ? 'reminder' : 'invitation';
                                const primaryWhatsAppUrl = firstInvitation ? reminderWhatsAppUrl : inviteWhatsAppUrl;
                                const isGuestMessageHistorySaving = guestMessageHistorySavingKey.startsWith(`${guest.id}:`);
                                const isExpanded = expandedGuestId === guest.id;
                                const activeEditField = editingGuestField?.guestId === guest.id ? editingGuestField.field : null;

                                return (
                                    <article className="guest-mobile-card" key={guest.id}>
                                        <div className="guest-mobile-card-header">
                                            <input
                                                aria-label={`Select ${guest.guestName || 'guest'}`}
                                                className="guest-select-checkbox"
                                                type="checkbox"
                                                checked={selectedGuestIds.includes(guest.id)}
                                                onChange={() => toggleGuestSelection(guest.id)}
                                            />
                                            <div className="guest-mobile-card-name">
                                                {activeEditField === 'guestName' ? (
                                                    <input
                                                        autoFocus
                                                        className={validation.guests[guestIndex]?.guestName ? 'cell-error' : ''}
                                                        value={guest.guestName}
                                                        onChange={(event) => updateGuest(guestIndex, 'guestName', event.target.value)}
                                                        onBlur={() => setEditingGuestField(null)}
                                                        placeholder="Guest / family"
                                                    />
                                                ) : (
                                                    <strong>{guest.guestName || 'Unnamed guest'}</strong>
                                                )}
                                                <span>
                                                    {guest.category.trim() || 'Uncategorized'}
                                                    {' - '}
                                                    {normalizeInvitedCount(guest.invitedCount)} {normalizeInvitedCount(guest.invitedCount) === 1 ? 'person' : 'people'}
                                                </span>
                                                {validation.guests[guestIndex]?.guestName && <em>{validation.guests[guestIndex]?.guestName}</em>}
                                            </div>
                                            <button
                                                className="guest-mobile-field-edit"
                                                type="button"
                                                aria-label={activeEditField === 'guestName' ? 'Finish editing guest name' : 'Edit guest name'}
                                                title={activeEditField === 'guestName' ? 'Finish editing' : 'Edit guest name'}
                                                onClick={() => setEditingGuestField(
                                                    activeEditField === 'guestName' ? null : { guestId: guest.id, field: 'guestName' }
                                                )}
                                            >
                                                {activeEditField === 'guestName' ? <Check aria-hidden="true" /> : <Pencil aria-hidden="true" />}
                                            </button>
                                        </div>

                                        <div className="guest-mobile-card-summary">
                                            <div className="guest-mobile-editable-row">
                                                <strong>Phone</strong>
                                                <div className="guest-mobile-editable-value">
                                                    {activeEditField === 'phone' ? (
                                                        <input
                                                            autoFocus
                                                            className={validation.guests[guestIndex]?.phone ? 'cell-error' : ''}
                                                            value={guest.phone}
                                                            onChange={(event) => updateGuest(guestIndex, 'phone', event.target.value)}
                                                            placeholder="+91..."
                                                            inputMode="tel"
                                                            autoComplete="tel"
                                                            onBlur={() => {
                                                                normalizeGuestPhoneAtIndex(guestIndex);
                                                                setEditingGuestField(null);
                                                            }}
                                                        />
                                                    ) : (
                                                        <span>{guest.phone.trim() || 'Missing phone'}</span>
                                                    )}
                                                    <button
                                                        className="guest-mobile-field-edit"
                                                        type="button"
                                                        aria-label={activeEditField === 'phone' ? 'Finish editing phone' : 'Edit phone'}
                                                        title={activeEditField === 'phone' ? 'Finish editing' : 'Edit phone'}
                                                        onClick={() => setEditingGuestField(
                                                            activeEditField === 'phone' ? null : { guestId: guest.id, field: 'phone' }
                                                        )}
                                                    >
                                                        {activeEditField === 'phone' ? <Check aria-hidden="true" /> : <Pencil aria-hidden="true" />}
                                                    </button>
                                                </div>
                                                {validation.guests[guestIndex]?.phone && <em>{validation.guests[guestIndex]?.phone}</em>}
                                            </div>
                                            <div className="guest-mobile-editable-row">
                                                <strong>Category</strong>
                                                <div className="guest-mobile-editable-value">
                                                    {activeEditField === 'category' ? (
                                                        <input
                                                            autoFocus
                                                            value={guest.category}
                                                            onChange={(event) => updateGuest(guestIndex, 'category', event.target.value)}
                                                            onBlur={() => setEditingGuestField(null)}
                                                            placeholder="Category"
                                                        />
                                                    ) : (
                                                        <span>{guest.category.trim() || 'Uncategorized'}</span>
                                                    )}
                                                    <button
                                                        className="guest-mobile-field-edit"
                                                        type="button"
                                                        aria-label={activeEditField === 'category' ? 'Finish editing category' : 'Edit category'}
                                                        title={activeEditField === 'category' ? 'Finish editing' : 'Edit category'}
                                                        onClick={() => setEditingGuestField(
                                                            activeEditField === 'category' ? null : { guestId: guest.id, field: 'category' }
                                                        )}
                                                    >
                                                        {activeEditField === 'category' ? <Check aria-hidden="true" /> : <Pencil aria-hidden="true" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="guest-mobile-editable-row">
                                                <strong>Family Size</strong>
                                                <div className="guest-mobile-editable-value">
                                                    {activeEditField === 'invitedCount' ? (
                                                        <GuestFamilySizeInput
                                                            key={`${guest.id}:${guest.invitedCount}:mobile`}
                                                            value={normalizeInvitedCount(guest.invitedCount)}
                                                            autoFocus
                                                            className={validation.guests[guestIndex]?.invitedCount ? 'cell-error' : ''}
                                                            onCommit={(value) => updateGuestFamilySize(guestIndex, value)}
                                                            onFinish={() => setEditingGuestField(null)}
                                                        />
                                                    ) : (
                                                        <span>{normalizeInvitedCount(guest.invitedCount)}</span>
                                                    )}
                                                    <button
                                                        className="guest-mobile-field-edit"
                                                        type="button"
                                                        aria-label={activeEditField === 'invitedCount' ? 'Finish editing Family Size' : 'Edit Family Size'}
                                                        title={activeEditField === 'invitedCount' ? 'Finish editing' : 'Edit Family Size'}
                                                        onClick={() => setEditingGuestField(
                                                            activeEditField === 'invitedCount' ? null : { guestId: guest.id, field: 'invitedCount' }
                                                        )}
                                                    >
                                                        {activeEditField === 'invitedCount' ? <Check aria-hidden="true" /> : <Pencil aria-hidden="true" />}
                                                    </button>
                                                </div>
                                                {validation.guests[guestIndex]?.invitedCount && <em>{validation.guests[guestIndex]?.invitedCount}</em>}
                                            </div>
                                            <div className="guest-mobile-editable-row">
                                                <strong>Invited Events</strong>
                                                <div className="guest-mobile-editable-value">
                                                    <span>
                                                        {weddingData.events
                                                            .filter((event) => guest.invitedEventIds.includes(event.id))
                                                            .map((event) => event.eventName)
                                                            .join(', ') || 'No events selected'}
                                                    </span>
                                                    <button
                                                        className="guest-mobile-field-edit"
                                                        type="button"
                                                        aria-label={isExpanded ? 'Finish editing invited events' : 'Edit invited events'}
                                                        title={isExpanded ? 'Finish editing' : 'Edit invited events'}
                                                        aria-expanded={isExpanded}
                                                        onClick={() => setExpandedGuestId(isExpanded ? null : guest.id)}
                                                    >
                                                        {isExpanded ? <Check aria-hidden="true" /> : <Pencil aria-hidden="true" />}
                                                    </button>
                                                </div>
                                            </div>
                                            {isExpanded && (
                                                <div className="guest-mobile-editor guest-mobile-inline-event-editor">
                                                    <div className="guest-mobile-event-editor">
                                                        <strong>Choose invited events</strong>
                                                        <div className="guest-event-options compact">
                                                            {weddingData.events.map((event) => (
                                                                <label key={event.id} className="guest-event-count-option">
                                                                    <span className="guest-event-count-check">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={guest.invitedEventIds.includes(event.id)}
                                                                            onChange={() => toggleGuestEvent(guestIndex, event.id)}
                                                                        />
                                                                        {event.eventName}
                                                                    </span>
                                                                    {guest.invitedEventIds.includes(event.id) && (
                                                                        <span className="guest-event-scope-input">
                                                                            <span>Invitees</span>
                                                                            <select
                                                                                aria-label={`${event.eventName} invitee scope`}
                                                                                value={getGuestEventInviteScope(guest, event.id)}
                                                                                onChange={(inputEvent) => updateGuestEventInviteScope(guestIndex, event.id, inputEvent.target.value as 'all' | 'number')}
                                                                            >
                                                                                <option value="all">All</option>
                                                                                <option value="number" disabled={normalizeInvitedCount(guest.invitedCount) <= 1}>Specific number</option>
                                                                            </select>
                                                                            {getGuestEventInviteScope(guest, event.id) === 'number' && (
                                                                                <input
                                                                                    aria-label={`${event.eventName} invitee count`}
                                                                                    type="number"
                                                                                    min="1"
                                                                                    max={Math.max(1, normalizeInvitedCount(guest.invitedCount) - 1)}
                                                                                    value={getGuestEventInvitedCount(guest, event.id)}
                                                                                    onChange={(inputEvent) => updateGuestEventInvitedCount(guestIndex, event.id, Number(inputEvent.target.value))}
                                                                                />
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                </label>
                                                            ))}
                                                        </div>
                                                        {validation.guests[guestIndex]?.invitedEventIds && <em>{validation.guests[guestIndex]?.invitedEventIds}</em>}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="guest-mobile-rsvp-detail">
                                                <strong>RSVP Summary</strong>
                                                <div>
                                                    {guestRsvpSummary?.eventStatuses.length ? (
                                                        guestRsvpSummary.eventStatuses.map((item) => (
                                                            <span key={item.eventId}>
                                                                <span>{item.eventName}</span>
                                                                <b>{item.label}</b>
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span><span>Status</span><b>No response yet</b></span>
                                                    )}
                                                </div>
                                            </div>
                                            <span>
                                                <strong>Invitation</strong>
                                                {isGuestMessageHistoryLoading
                                                    ? 'Loading...'
                                                    : firstInvitation
                                                        ? `Sent ${new Date(firstInvitation.sentAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
                                                        : 'Not sent'}
                                            </span>
                                            <span>
                                                <strong>Reminders</strong>
                                                {isGuestMessageHistoryLoading
                                                    ? 'Loading...'
                                                    : reminderHistory.length
                                                        ? `${reminderHistory.length} sent - Last ${new Date(lastReminder.sentAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
                                                        : 'None sent'}
                                            </span>
                                            <span>
                                                <strong>Last Updated</strong>
                                                {guestRsvpSummary?.lastUpdated ? new Date(guestRsvpSummary.lastUpdated).toLocaleString() : 'Not submitted'}
                                            </span>
                                            <div className="guest-mobile-link-detail">
                                                <strong>Invite Link</strong>
                                                <code>{getGuestInviteUrl(guest)}</code>
                                                <div>
                                                    <button type="button" onClick={() => copyGuestInviteLink(guest)}>Copy link</button>
                                                    <button type="button" onClick={() => previewGuestInvite(guest)}>Preview</button>
                                                </div>
                                            </div>
                                        </div>

                                        {primaryWhatsAppUrl ? (
                                            <a
                                                className="guest-mobile-whatsapp-action"
                                                href={primaryWhatsAppUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {primaryMessageType === 'invitation' ? 'Send Invite' : 'Send Reminder'}
                                            </a>
                                        ) : (
                                            <button className="guest-mobile-whatsapp-action disabled" type="button" disabled>
                                                Add a phone number to send
                                            </button>
                                        )}
                                        <div className="guest-whatsapp-manual-actions">
                                            <span>Update send status manually</span>
                                            <div>
                                                <button
                                                    type="button"
                                                    disabled={isGuestMessageHistorySaving}
                                                    onClick={() => confirmGuestMessageSent(guest, 'invitation')}
                                                >
                                                    <CheckCircle2 aria-hidden="true" />
                                                    Mark invite sent
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isGuestMessageHistorySaving}
                                                    onClick={() => confirmGuestMessageSent(guest, 'reminder')}
                                                >
                                                    <CheckCircle2 aria-hidden="true" />
                                                    Mark reminder sent
                                                </button>
                                            </div>
                                        </div>



                                        {messageHistory.length > 0 && (
                                            <details className="guest-whatsapp-history">
                                                <summary>Message history ({messageHistory.length})</summary>
                                                <div>
                                                    {messageHistory.map((entry) => (
                                                        <span key={entry.id}>
                                                            <span>
                                                                <strong>{entry.messageType === 'invitation' ? 'Invitation' : 'Reminder'}</strong>
                                                                <time dateTime={entry.sentAt}>{new Date(entry.sentAt).toLocaleString()}</time>
                                                            </span>
                                                            <button
                                                                type="button"
                                                                disabled={guestMessageHistorySavingKey === entry.id}
                                                                onClick={() => removeGuestMessageRecord(entry)}
                                                            >
                                                                Remove
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            </details>
                                        )}
                                    </article>
                                );
                            })}
                            {filteredGuestRows.length === 0 && (
                                <p className="dashboard-note">
                                    {weddingData.rsvp.guests.length === 0
                                        ? 'No guests yet. Add guests manually or import CSV.'
                                        : 'No guests match the current filters.'}
                                </p>
                            )}
                        </div>
                        <div className="guest-table-wrap guest-roster-table-wrap">
                            <table className="guest-table">
                                <thead>
                                    <tr>
                                        <th className="guest-select-column">
                                            <input
                                                aria-label="Select all guests on this page"
                                                className="guest-select-checkbox"
                                                type="checkbox"
                                                checked={areAllVisibleGuestsSelected}
                                                onChange={toggleAllVisibleGuests}
                                            />
                                        </th>
                                        <th>Guest Details</th>
                                        <th>Invited Events</th>
                                        <th>RSVP & Activity</th>
                                        <th>Invitation Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedGuestRows.map(({ guest, guestIndex }) => {
                                        const guestRsvpSummary = rsvpAnalytics.guestSummaryById.get(guest.id);
                                        const messageHistory = guestMessageHistoryByGuestId.get(guest.id) ?? [];
                                        const invitationHistory = messageHistory.filter((entry) => entry.messageType === 'invitation');
                                        const reminderHistory = messageHistory.filter((entry) => entry.messageType === 'reminder');
                                        const firstInvitation = invitationHistory[invitationHistory.length - 1];
                                        const lastReminder = reminderHistory[0];
                                        const isGuestMessageHistorySaving = guestMessageHistorySavingKey.startsWith(`${guest.id}:`);
                                        const inviteWhatsAppUrl = getGuestWhatsAppUrl(guest, 'invitation');
                                        const reminderWhatsAppUrl = getGuestWhatsAppUrl(guest, 'reminder');

                                        return (
                                            <Fragment key={guest.id}>
                                                <tr className="guest-roster-row">
                                                    <td className="guest-select-column">
                                                        <input
                                                            aria-label={`Select ${guest.guestName || 'guest'}`}
                                                            className="guest-select-checkbox"
                                                            type="checkbox"
                                                            checked={selectedGuestIds.includes(guest.id)}
                                                            onChange={() => toggleGuestSelection(guest.id)}
                                                        />
                                                    </td>
                                                    <td className="guest-identity-cell">
                                                        <input
                                                            className={validation.guests[guestIndex]?.guestName ? 'cell-error' : ''}
                                                            value={guest.guestName}
                                                            onChange={(event) => updateGuest(guestIndex, 'guestName', event.target.value)}
                                                            placeholder="Guest / family"
                                                        />
                                                        {validation.guests[guestIndex]?.guestName && <em>{validation.guests[guestIndex]?.guestName}</em>}
                                                        <div className="guest-identity-grid">
                                                            <label className="guest-compact-field">
                                                                <span>Phone</span>
                                                                <input
                                                                    className={validation.guests[guestIndex]?.phone ? 'cell-error' : ''}
                                                                    value={guest.phone}
                                                                    onChange={(event) => updateGuest(guestIndex, 'phone', event.target.value)}
                                                                    placeholder="+91..."
                                                                    inputMode="tel"
                                                                    autoComplete="tel"
                                                                    onBlur={() => normalizeGuestPhoneAtIndex(guestIndex)}
                                                                />
                                                                {validation.guests[guestIndex]?.phone && <em>{validation.guests[guestIndex]?.phone}</em>}
                                                            </label>
                                                            <label className="guest-compact-field">
                                                                <span>Category</span>
                                                                <input
                                                                    value={guest.category}
                                                                    onChange={(event) => updateGuest(guestIndex, 'category', event.target.value)}
                                                                    placeholder="Category"
                                                                />
                                                            </label>
                                                        </div>
                                                        <label className="guest-family-size-field">
                                                            <span>Family Size</span>
                                                            <GuestFamilySizeInput
                                                                key={`${guest.id}:${guest.invitedCount}:desktop`}
                                                                value={normalizeInvitedCount(guest.invitedCount)}
                                                                className={validation.guests[guestIndex]?.invitedCount ? 'cell-error' : ''}
                                                                onCommit={(value) => updateGuestFamilySize(guestIndex, value)}
                                                            />
                                                        </label>
                                                        {validation.guests[guestIndex]?.invitedCount && <em>{validation.guests[guestIndex]?.invitedCount}</em>}
                                                    </td>
                                                    <td className="guest-events-cell">
                                                        <button
                                                            className="guest-events-toggle"
                                                            type="button"
                                                            onClick={() => setExpandedGuestId(expandedGuestId === guest.id ? null : guest.id)}
                                                        >
                                                            {guest.invitedEventIds.length} selected
                                                        </button>
                                                        <div className="guest-event-name-list">
                                                            {weddingData.events
                                                                .filter((event) => guest.invitedEventIds.includes(event.id))
                                                                .map((event) => <span key={event.id}>{event.eventName}</span>)}
                                                        </div>
                                                        {validation.guests[guestIndex]?.invitedEventIds && <em>{validation.guests[guestIndex]?.invitedEventIds}</em>}
                                                    </td>
                                                    <td className="guest-rsvp-activity-cell">
                                                        <div className="guest-rsvp-events">
                                                            {guestRsvpSummary?.eventStatuses.length ? (
                                                                guestRsvpSummary.eventStatuses.map((item) => (
                                                                    <span key={item.eventId}>{item.eventName}: {item.label}</span>
                                                                ))
                                                            ) : (
                                                                <span>No events selected</span>
                                                            )}
                                                        </div>
                                                        <p>
                                                            <strong>Last updated</strong>
                                                            {guestRsvpSummary?.lastUpdated ? new Date(guestRsvpSummary.lastUpdated).toLocaleString() : 'Not submitted'}
                                                        </p>
                                                    </td>
                                                    <td className="guest-invitation-actions-cell">
                                                        <div className="guest-invite-link-block">
                                                            <code>{getGuestInviteUrl(guest)}</code>
                                                            <div className="guest-link-actions compact">
                                                                <button type="button" onClick={() => copyGuestInviteLink(guest)}>Copy</button>
                                                                <button type="button" onClick={() => previewGuestInvite(guest)}>Preview</button>
                                                            </div>
                                                        </div>
                                                        {inviteWhatsAppUrl ? (
                                                            <>
                                                                <div className="guest-whatsapp-status">
                                                                    <span>
                                                                        <strong>Invitation</strong>
                                                                        {isGuestMessageHistoryLoading
                                                                            ? 'Loading...'
                                                                            : firstInvitation
                                                                                ? `Sent ${new Date(firstInvitation.sentAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
                                                                                : 'Not sent'}
                                                                    </span>
                                                                    <span>
                                                                        <strong>Reminders</strong>
                                                                        {isGuestMessageHistoryLoading
                                                                            ? 'Loading...'
                                                                            : reminderHistory.length
                                                                                ? `${reminderHistory.length} sent - Last ${new Date(lastReminder.sentAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
                                                                                : 'None sent'}
                                                                    </span>
                                                                </div>
                                                                <div className="guest-link-actions compact guest-whatsapp-actions">
                                                                    <a
                                                                        href={inviteWhatsAppUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                    >
                                                                        {firstInvitation ? 'Resend Invite' : 'Send Invite'}
                                                                    </a>
                                                                    <a
                                                                        href={reminderWhatsAppUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                    >
                                                                        Send Reminder
                                                                    </a>
                                                                </div>
                                                                {messageHistory.length > 0 && (
                                                                    <details className="guest-whatsapp-history">
                                                                        <summary>History ({messageHistory.length})</summary>
                                                                        <div>
                                                                            {messageHistory.map((entry) => (
                                                                                <span key={entry.id}>
                                                                                    <span>
                                                                                        <strong>{entry.messageType === 'invitation' ? 'Invitation' : 'Reminder'}</strong>
                                                                                        <time dateTime={entry.sentAt}>{new Date(entry.sentAt).toLocaleString()}</time>
                                                                                    </span>
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={guestMessageHistorySavingKey === entry.id}
                                                                                        onClick={() => removeGuestMessageRecord(entry)}
                                                                                    >
                                                                                        Remove
                                                                                    </button>
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </details>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <button className="guest-missing-phone-btn" type="button" disabled>Missing phone</button>
                                                        )}
                                                        <div className="guest-whatsapp-manual-actions">
                                                            <span>Update send status manually</span>
                                                            <div>
                                                                <button
                                                                    type="button"
                                                                    disabled={isGuestMessageHistorySaving}
                                                                    onClick={() => confirmGuestMessageSent(guest, 'invitation')}
                                                                >
                                                                    <CheckCircle2 aria-hidden="true" />
                                                                    Mark invite sent
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={isGuestMessageHistorySaving}
                                                                    onClick={() => confirmGuestMessageSent(guest, 'reminder')}
                                                                >
                                                                    <CheckCircle2 aria-hidden="true" />
                                                                    Mark reminder sent
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expandedGuestId === guest.id && (
                                                    <tr className="guest-events-row" key={`${guest.id}-events`}>
                                                        <td colSpan={5}>
                                                            <div className="guest-event-options compact">
                                                                {weddingData.events.map((event) => (
                                                                    <label key={event.id} className="guest-event-count-option">
                                                                        <span className="guest-event-count-check">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={guest.invitedEventIds.includes(event.id)}
                                                                                onChange={() => toggleGuestEvent(guestIndex, event.id)}
                                                                            />
                                                                            {event.eventName}
                                                                        </span>
                                                                        {guest.invitedEventIds.includes(event.id) && (
                                                                            <span className="guest-event-scope-input">
                                                                                <span>Invitees</span>
                                                                                <select
                                                                                    aria-label={`${event.eventName} invitee scope`}
                                                                                    value={getGuestEventInviteScope(guest, event.id)}
                                                                                    onChange={(inputEvent) => updateGuestEventInviteScope(guestIndex, event.id, inputEvent.target.value as 'all' | 'number')}
                                                                                >
                                                                                    <option value="all">All</option>
                                                                                    <option value="number" disabled={normalizeInvitedCount(guest.invitedCount) <= 1}>Specific number</option>
                                                                                </select>
                                                                                {getGuestEventInviteScope(guest, event.id) === 'number' && (
                                                                                    <input
                                                                                        aria-label={`${event.eventName} invitee count`}
                                                                                        type="number"
                                                                                        min="1"
                                                                                        max={Math.max(1, normalizeInvitedCount(guest.invitedCount) - 1)}
                                                                                        value={getGuestEventInvitedCount(guest, event.id)}
                                                                                        onChange={(inputEvent) => updateGuestEventInvitedCount(guestIndex, event.id, Number(inputEvent.target.value))}
                                                                                    />
                                                                                )}
                                                                            </span>
                                                                        )}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {filteredGuestRows.length === 0 && (
                                <p className="dashboard-note">
                                    {weddingData.rsvp.guests.length === 0
                                        ? 'No guests yet. Add guests manually or import CSV.'
                                        : 'No guests match the current filters.'}
                                </p>
                            )}
                        </div>
                        {filteredGuestRows.length > 0 && (
                            <div className="guest-pagination" aria-label="Guest list pagination">
                                <p>
                                    Showing {firstVisibleGuestNumber.toLocaleString()}-{lastVisibleGuestNumber.toLocaleString()} of {filteredGuestRows.length.toLocaleString()} guest entries
                                </p>
                                <label>
                                    <span>Rows per page</span>
                                    <select
                                        value={guestPageSize}
                                        onChange={(event) => {
                                            setGuestPageSize(Number(event.target.value) as (typeof guestPageSizeOptions)[number]);
                                            setGuestPage(1);
                                        }}
                                    >
                                        {guestPageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
                                    </select>
                                </label>
                                <div className="guest-pagination-actions">
                                    <button
                                        type="button"
                                        disabled={currentGuestPage <= 1}
                                        onClick={() => setGuestPage(Math.max(1, currentGuestPage - 1))}
                                    >
                                        Previous
                                    </button>
                                    <span>Page {currentGuestPage} of {totalGuestPages}</span>
                                    <button
                                        type="button"
                                        disabled={currentGuestPage >= totalGuestPages}
                                        onClick={() => setGuestPage(Math.min(totalGuestPages, currentGuestPage + 1))}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <RsvpPlanLockedPanel title="Guest List is locked" whatsAppContext={paymentWhatsAppContext} />
                ))}

                {activeTab === 'whatsapp' && (hasDashboardGuestAccess ? (
                    <div className="dashboard-panel whatsapp-settings-panel">
                        <div className="dashboard-panel-header dashboard-panel-header-row">
                            <div>
                                <p className="dashboard-eyebrow">WhatsApp Message</p>
                                <h2>Configure messages and link preview</h2>
                            </div>
                            <button className="dashboard-primary-btn" type="button" onClick={handleSaveDraft}>
                                {saveAllChangesLabel}
                            </button>
                        </div>

                        <div className="whatsapp-message-layout">
                            <section className="whatsapp-message-composer" aria-labelledby="whatsapp-message-label">
                                <div className="whatsapp-message-mode" role="group" aria-label="WhatsApp message type">
                                    <button
                                        className={whatsAppMessageMode === 'invitation' ? 'active' : ''}
                                        type="button"
                                        onClick={() => setWhatsAppMessageMode('invitation')}
                                    >
                                        Invite Message
                                    </button>
                                    <button
                                        className={whatsAppMessageMode === 'reminder' ? 'active' : ''}
                                        type="button"
                                        onClick={() => setWhatsAppMessageMode('reminder')}
                                    >
                                        Reminder Message
                                    </button>
                                </div>
                                <label className="dashboard-field">
                                    <span id="whatsapp-message-label">
                                        {whatsAppMessageMode === 'invitation'
                                            ? 'Message sent with Send Invite'
                                            : 'Message sent with Send Reminder'}
                                    </span>
                                    <textarea
                                        key={whatsAppMessageMode}
                                        ref={whatsappMessageTextareaRef}
                                        value={activeWhatsAppMessage}
                                        rows={11}
                                        onChange={(event) => updateWhatsAppMessage(event.target.value)}
                                    />
                                </label>

                                <div className="whatsapp-message-tools">
                                    <div>
                                        <span className="whatsapp-message-tools-label">Insert guest details</span>
                                        <div className="whatsapp-message-chip-row">
                                            {whatsAppInviteVariables.map((variable) => (
                                                <button
                                                    className="whatsapp-message-chip"
                                                    type="button"
                                                    key={variable.token}
                                                    title={`Insert ${variable.label}`}
                                                    onClick={() => insertWhatsAppMessageContent(variable.token)}
                                                >
                                                    {variable.token}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="whatsapp-message-tools-label">Insert emoji</span>
                                        <div className="whatsapp-message-chip-row">
                                            {whatsAppInviteEmojis.map((emoji) => (
                                                <button
                                                    className="whatsapp-emoji-button"
                                                    type="button"
                                                    key={emoji}
                                                    aria-label={`Insert ${emoji}`}
                                                    onClick={() => insertWhatsAppMessageContent(emoji)}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    className="dashboard-primary-btn secondary whatsapp-reset-button"
                                    type="button"
                                    onClick={() => updateWhatsAppMessage(
                                        whatsAppMessageMode === 'invitation'
                                            ? defaultWhatsAppInviteMessage
                                            : defaultWhatsAppReminderMessage
                                    )}
                                >
                                    Restore default {whatsAppMessageMode === 'invitation' ? 'invite' : 'reminder'} message
                                </button>
                            </section>

                            <aside className="whatsapp-message-preview" aria-label="WhatsApp message preview">
                                <span>{whatsAppMessageMode === 'invitation' ? 'Invite preview' : 'Reminder preview'}</span>
                                <div className="whatsapp-message-bubble">{whatsAppPreviewMessage}</div>
                            </aside>
                        </div>

                        <section className="whatsapp-link-preview-section" aria-labelledby="whatsapp-link-preview-title">
                            <div className="whatsapp-link-preview-header">
                                <div>
                                    <h3 id="whatsapp-link-preview-title">Invitation link preview</h3>
                                    <p>Choose the image and copy shown when a personalized invitation link is shared.</p>
                                </div>
                            </div>
                            <div className="whatsapp-link-preview-layout">
                                <div className="whatsapp-link-preview-editor">
                                    <label className="dashboard-field">
                                        <span>Preview Title</span>
                                        <input
                                            value={weddingData.whatsapp.previewTitle}
                                            maxLength={90}
                                            onChange={(event) => updateWhatsAppSetting('previewTitle', event.target.value)}
                                            placeholder={getDefaultWhatsAppPreviewTitle(weddingData.couple.displayName)}
                                        />
                                    </label>
                                    <label className="dashboard-field">
                                        <span>Preview Description</span>
                                        <textarea
                                            value={weddingData.whatsapp.previewDescription}
                                            maxLength={200}
                                            rows={4}
                                            onChange={(event) => updateWhatsAppSetting('previewDescription', event.target.value)}
                                            placeholder={getDefaultWhatsAppPreviewDescription(weddingData.couple.displayName)}
                                        />
                                    </label>
                                    <div className="whatsapp-preview-image-control">
                                        <span>Preview Image</span>
                                        <div className="whatsapp-preview-image-current">
                                            <img
                                                src={resolveAssetPath(weddingData.whatsapp.previewImageSrc || whatsAppPreviewFallbackImageSrc)}
                                                alt=""
                                                loading="lazy"
                                                decoding="async"
                                            />
                                            <div>
                                                <strong>
                                                    {weddingData.whatsapp.previewImageSrc ? 'Selected wedding image' : 'Shaadi Nyota default image'}
                                                </strong>
                                                <span>Landscape images work best in WhatsApp link cards.</span>
                                                <div className="guest-link-actions compact">
                                                    <button type="button" onClick={() => setIsWhatsAppPreviewImagePickerOpen(true)}>
                                                        Change Image
                                                    </button>
                                                    {weddingData.whatsapp.previewImageSrc && (
                                                        <button type="button" onClick={() => updateWhatsAppSetting('previewImageSrc', '')}>
                                                            Use Default
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {isWhatsAppPreviewImagePickerOpen && (
                                        <div className="closing-picker-panel whatsapp-preview-image-picker">
                                            <div className="closing-picker-header">
                                                <div>
                                                    <strong>Choose preview image</strong>
                                                    <span>Select a wedding image or upload your own.</span>
                                                </div>
                                                <button type="button" onClick={() => setIsWhatsAppPreviewImagePickerOpen(false)}>Close</button>
                                            </div>
                                            <div className="whatsapp-preview-image-grid">
                                                {whatsAppPreviewImageOptions.map((option) => (
                                                    <button
                                                        key={option.key}
                                                        className="whatsapp-preview-image-option"
                                                        type="button"
                                                        onClick={() => {
                                                            updateWhatsAppSetting('previewImageSrc', option.imageSrc);
                                                            setIsWhatsAppPreviewImagePickerOpen(false);
                                                        }}
                                                    >
                                                        <img src={resolveAssetPath(option.thumbnailSrc)} alt="" loading="lazy" decoding="async" />
                                                        <span>
                                                            <strong>{option.label}</strong>
                                                            <small>{option.sectionLabel}</small>
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                            <WeddingMediaLibrary
                                                assets={weddingMedia}
                                                pendingRemovalIds={pendingWeddingMediaDeletionIds}
                                                selectedSrc={weddingData.whatsapp.previewImageSrc}
                                                isUploading={isWhatsAppPreviewImageUploading}
                                                isLoading={isWeddingMediaLoading}
                                                setupRequired={weddingMediaSetupRequired}
                                                disabled={!supabaseWeddingId}
                                                previewShape="landscape"
                                                onUpload={(file) => void uploadWhatsAppPreviewImage(file)}
                                                onSelect={(asset) => {
                                                    updateWhatsAppSetting('previewImageSrc', asset.publicUrl);
                                                    setIsWhatsAppPreviewImagePickerOpen(false);
                                                }}
                                                onDelete={(asset) => void removeWeddingMediaAsset(asset)}
                                                isInUse={isWeddingMediaInUse}
                                            />
                                        </div>
                                    )}
                                </div>

                                <aside className="whatsapp-link-card-preview" aria-label="Invitation link card preview">
                                    <span>Link preview</span>
                                    <div className="whatsapp-link-card">
                                        <img
                                            src={resolveAssetPath(weddingData.whatsapp.previewImageSrc || whatsAppPreviewFallbackImageSrc)}
                                            alt=""
                                            loading="lazy"
                                            decoding="async"
                                        />
                                        <div>
                                            <strong>
                                                {weddingData.whatsapp.previewTitle.trim()
                                                    || getDefaultWhatsAppPreviewTitle(weddingData.couple.displayName)}
                                            </strong>
                                            <p>
                                                {weddingData.whatsapp.previewDescription.trim()
                                                    || getDefaultWhatsAppPreviewDescription(weddingData.couple.displayName)}
                                            </p>
                                            <span>{window.location.host}</span>
                                        </div>
                                    </div>
                                </aside>
                            </div>
                        </section>
                    </div>
                ) : (
                    <RsvpPlanLockedPanel title="WhatsApp Message is locked" whatsAppContext={paymentWhatsAppContext} />
                ))}
                {activeTab === 'rsvp-settings' && (hasDashboardRsvpAccess ? (
                    <div className="dashboard-panel rsvp-settings-panel">
                        <div className="dashboard-panel-header dashboard-panel-header-row">
                            <div>
                                <p className="dashboard-eyebrow">RSVP Form</p>
                                <h2>RSVP form settings</h2>
                            </div>
                            <button className="dashboard-primary-btn" type="button" onClick={handleSaveDraft}>
                                {saveAllChangesLabel}
                            </button>
                        </div>
                        <section className="rsvp-settings-card rsvp-settings-card-stacked">
                            <div className="rsvp-settings-card-header">
                                <div>
                                    <h3>Guest RSVP form</h3>
                                    <p>Control what guests see when they submit RSVP from their personalized invite.</p>
                                </div>
                                <div className="dashboard-check-stack">
                                    <ToggleField
                                        label="Attending count question"
                                        checked={weddingData.rsvp.attendingCountEnabled}
                                        onLabel="Enabled"
                                        offLabel="Disabled"
                                        helperText="When guests select Yes, ask how many invitees will attend. The number is capped by their event invitee limit."
                                        onChange={(checked) => updateRsvp('attendingCountEnabled', checked)}
                                    />
                                    <ToggleField
                                        label="Meal preference question"
                                        checked={weddingData.rsvp.mealPreferenceEnabled}
                                        onLabel="Enabled"
                                        offLabel="Disabled"
                                        helperText="When hidden, guests can RSVP without selecting Veg, Non-Veg, or Jain."
                                        onChange={(checked) => updateRsvp('mealPreferenceEnabled', checked)}
                                    />
                                </div>
                            </div>
                            <SectionBackgroundPicker
                                label="RSVP Background"
                                value={weddingData.rsvp.backgroundImageSrc}
                                onChange={(imageSrc) => updateRsvp('backgroundImageSrc', imageSrc)}
                                uploadedMedia={weddingMedia}
                                pendingRemovalIds={pendingWeddingMediaDeletionIds}
                                isMediaUploading={mediaUploadingSection === 'rsvp'}
                                isMediaLoading={isWeddingMediaLoading}
                                mediaSetupRequired={weddingMediaSetupRequired}
                                mediaUploadDisabled={!supabaseWeddingId}
                                onUploadMedia={(file) => void uploadWeddingImage(file, 'rsvp', (imageSrc) => updateRsvp('backgroundImageSrc', imageSrc))}
                                onDeleteMedia={(asset) => void removeWeddingMediaAsset(asset)}
                                isMediaInUse={isWeddingMediaInUse}
                            />
                        </section>
                    </div>
                ) : (
                    <RsvpPlanLockedPanel title="RSVP Form is locked" whatsAppContext={paymentWhatsAppContext} />
                ))}
                {activeTab === 'rsvp' && (hasDashboardRsvpAccess ? (
                    <div className="dashboard-panel rsvp-dashboard-panel">
                        <div className="dashboard-panel-header dashboard-panel-header-row">
                            <div>
                                <p className="dashboard-eyebrow">RSVP Responses</p>
                                <h2>Response analytics</h2>
                            </div>
                            <div className="dashboard-header-actions">
                                <button className="dashboard-primary-btn secondary" type="button" onClick={handleSaveDraft}>
                                    {saveAllChangesLabel}
                                </button>
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
                            <InfoBlock label="Total Invited Guests" value={String(guestSummary.totalInvitedCount)} />
                            <InfoBlock label="Confirmed Guests" value={String(rsvpAnalytics.totals.people.yes)} />
                            <InfoBlock label="Maybe Guests" value={String(rsvpAnalytics.totals.people.maybe)} />
                            <InfoBlock label="Declined Guests" value={String(rsvpAnalytics.totals.people.no)} />
                            <InfoBlock label="Pending Guests" value={String(rsvpAnalytics.totals.people.pending)} />
                        </div>
                        <div className="guest-summary-grid rsvp-summary-grid secondary-summary-grid">
                            <InfoBlock label="Total Families" value={String(weddingData.rsvp.guests.length)} />
                            <InfoBlock label="Confirmed Families" value={String(rsvpAnalytics.totals.families.yes)} />
                            <InfoBlock label="Maybe Families" value={String(rsvpAnalytics.totals.families.maybe)} />
                            <InfoBlock label="Declined Families" value={String(rsvpAnalytics.totals.families.no)} />
                            <InfoBlock label="Pending Families" value={String(rsvpAnalytics.totals.families.pending)} />
                        </div>
                        {isRsvpLoading && <p className="dashboard-note">Loading RSVP responses...</p>}
                        {!isRsvpLoading && rsvpResponses.filter((response) => response.weddingSlug === weddingData.wedding.slug).length === 0 && (
                            <p className="dashboard-note">No RSVP responses yet.</p>
                        )}

                        <RsvpTable title="Event-wise Guest Count" headers={['Event', 'Invited Guests', 'Confirmed Guests', 'Maybe Guests', 'Declined Guests', 'Pending Guests']}>
                            {rsvpAnalytics.eventSummaries.map(({ event, invitedPeople, counts }) => (
                                <tr key={event.id}>
                                    <td>{event.eventName}</td>
                                    <td>{invitedPeople}</td>
                                    <td>{counts.people.yes}</td>
                                    <td>{counts.people.maybe}</td>
                                    <td>{counts.people.no}</td>
                                    <td>{counts.people.pending}</td>
                                </tr>
                            ))}
                        </RsvpTable>

                        {weddingData.rsvp.mealPreferenceEnabled && (
                            <RsvpTable
                                title="Meal Preference by Event"
                                helperText="Meal counts are calculated using invited guest count for confirmed RSVP responses. If a family has 5 invited guests and selects a meal preference, it counts as 5 meals."
                                headers={['Event', 'Veg Guests', 'Non-Veg Guests', 'Jain Guests', 'Other / Not Specified']}
                            >
                                {rsvpAnalytics.eventMealSummaries.map(({ event, mealCounts }) => (
                                    <tr key={event.id}>
                                        <td>{event.eventName}</td>
                                        <td>{mealCounts.veg}</td>
                                        <td>{mealCounts.nonVeg}</td>
                                        <td>{mealCounts.jain}</td>
                                        <td>{mealCounts.other}</td>
                                    </tr>
                                ))}
                            </RsvpTable>
                        )}

                        <p className="dashboard-note">View guest-wise RSVP responses in the Guests tab.</p>

                        <RsvpTable title="Category-wise Guest Summary" headers={['Category', 'Invited Guests', 'Confirmed Guests', 'Maybe Guests', 'Declined Guests', 'Pending Guests']}>
                            {rsvpAnalytics.categorySummaries.map(({ category, invitedCount, counts }) => (
                                <tr key={category}>
                                    <td>{category}</td>
                                    <td>{invitedCount}</td>
                                    <td>{counts.people.yes}</td>
                                    <td>{counts.people.maybe}</td>
                                    <td>{counts.people.no}</td>
                                    <td>{counts.people.pending}</td>
                                </tr>
                            ))}
                        </RsvpTable>
                    </div>
                ) : (
                    <RsvpPlanLockedPanel title="RSVP Responses is locked" whatsAppContext={paymentWhatsAppContext} />
                ))}

                {activeTab === 'closing-gallery' && (
                    <div className="dashboard-panel closing-gallery-panel">
                        <div className="dashboard-panel-header dashboard-panel-header-row">
                            <div>
                                <p className="dashboard-eyebrow">Closing Gallery</p>
                                <h2>Edit the final thank-you section</h2>
                            </div>
                            <button className="dashboard-primary-btn" type="button" onClick={handleSaveDraft}>
                                {saveAllChangesLabel}
                            </button>
                        </div>
                        <p className="dashboard-note">
                            Closing Gallery appears at the end of the invite. The thank-you section always uses the common invite design; couple photos are optional.
                        </p>

                        <div className="closing-gallery-layout">
                            <div className="closing-gallery-editor-groups">
                                <section className="closing-gallery-group">
                                    <ToggleField
                                        label="Couple photos"
                                        checked={weddingData.closing.includePhotos}
                                        onLabel="Included"
                                        offLabel="Hidden"
                                        onChange={(checked) => updateClosing('includePhotos', checked)}
                                    />
                                    <div className="form-grid">
                                        <TextField label="Closing Line" value={weddingData.closing.closingLine} multiline rows={2} onChange={(value) => updateClosing('closingLine', value)} />
                                        <TextField label="Couple Display Name" value={weddingData.closing.coupleDisplayName} multiline rows={2} onChange={(value) => updateClosing('coupleDisplayName', value)} />
                                    </div>
                                    <label className="dashboard-field">
                                        <span>Thank You Message</span>
                                        <textarea
                                            value={weddingData.closing.message}
                                            onChange={(event) => updateClosing('message', event.target.value)}
                                            rows={4}
                                        />
                                    </label>
                                    <SectionBackgroundPicker
                                        label="With Love Background"
                                        value={weddingData.closing.backgroundImageSrc}
                                        onChange={(imageSrc) => updateClosing('backgroundImageSrc', imageSrc)}
                                        uploadedMedia={weddingMedia}
                                        pendingRemovalIds={pendingWeddingMediaDeletionIds}
                                        isMediaUploading={mediaUploadingSection === 'closing-gallery'}
                                        isMediaLoading={isWeddingMediaLoading}
                                        mediaSetupRequired={weddingMediaSetupRequired}
                                        mediaUploadDisabled={!supabaseWeddingId}
                                        onUploadMedia={(file) => void uploadWeddingImage(file, 'closing-gallery', (imageSrc) => updateClosing('backgroundImageSrc', imageSrc))}
                                        onDeleteMedia={(asset) => void removeWeddingMediaAsset(asset)}
                                        isMediaInUse={isWeddingMediaInUse}
                                    />
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
                                                    <img src={resolveAssetPath(imageSrc)} alt="" loading="lazy" decoding="async" />
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
                                                <div className="closing-image-grid">
                                                    {closingImagePresets.map((option) => (
                                                        <button
                                                            key={option.key}
                                                            className="story-image-card"
                                                            type="button"
                                                            onClick={() => setClosingGalleryImage(closingImagePickerTarget, option.imageSrc)}
                                                        >
                                                            <img src={resolveAssetPath(option.thumbnailSrc)} alt="" loading="lazy" decoding="async" />
                                                            <strong>{option.label}</strong>
                                                            <span>{option.themeLabel}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                                <WeddingMediaLibrary
                                                    assets={weddingMedia}
                                                    pendingRemovalIds={pendingWeddingMediaDeletionIds}
                                                    isUploading={isClosingImageUploading}
                                                    isLoading={isWeddingMediaLoading}
                                                    setupRequired={weddingMediaSetupRequired}
                                                    disabled={!supabaseWeddingId}
                                                    onUpload={(file) => void uploadClosingGalleryImage(file)}
                                                    onSelect={(asset) => setClosingGalleryImage(closingImagePickerTarget, asset.publicUrl)}
                                                    onDelete={(asset) => void removeWeddingMediaAsset(asset)}
                                                    isInUse={isWeddingMediaInUse}
                                                />
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
                <img src={resolveAssetPath(imageSrc)} alt="" loading="lazy" decoding="async" />
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
    const skipRevealImage = hero.skipRevealImage === true;
    const revealLayerVisible = !skipRevealImage;
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
    }, [hero.videoSrc, hero.posterSrc, hero.revealImageSrc, hero.revealCtaText, hero.skipRevealImage, couple.backgroundImageSrc, musicSrc]);

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
            const progress = skipRevealImage ? 0 : getOpeningRevealCrossfadeProgress(currentTime, duration);
            setRevealImageOpacity(progress);
            if (!skipRevealImage && progress > 0 && revealTriggeredAt === null) {
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
    }, [previewState, revealTriggeredAt, skipRevealImage]);

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
                    <img className="or-preview-poster" src={resolveAssetPath(hero.posterSrc)} alt="" decoding="async" />
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
                            setRevealImageOpacity(skipRevealImage ? 0 : 1);
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
                            <img src={revealedImageSrc} alt={revealedImageAlt} decoding="async" />
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

function SectionBackgroundPicker({
    label,
    value,
    onChange,
    uploadedMedia,
    pendingRemovalIds,
    isMediaUploading,
    isMediaLoading,
    mediaSetupRequired,
    mediaUploadDisabled,
    onUploadMedia,
    onDeleteMedia,
    isMediaInUse,
}: {
    label: string;
    value: string;
    onChange: (imageSrc: string) => void;
    uploadedMedia: WeddingMediaAsset[];
    pendingRemovalIds: ReadonlySet<string>;
    isMediaUploading: boolean;
    isMediaLoading: boolean;
    mediaSetupRequired: boolean;
    mediaUploadDisabled: boolean;
    onUploadMedia: (file: File) => void;
    onDeleteMedia: (asset: WeddingMediaAsset) => void;
    isMediaInUse: (asset: WeddingMediaAsset) => boolean;
}) {
    return (
        <div className="section-background-picker">
            <div className="section-background-picker-header">
                <span>{label}</span>
                <p>Choose plain or a subtle texture for this section.</p>
            </div>
            <div className="section-background-option-grid">
                {sectionBackgroundPresets.map((option) => {
                    const selected = (value || '') === option.imageSrc;
                    return (
                        <button
                            key={option.key}
                            className={['section-background-option', selected ? 'selected' : '', option.imageSrc ? '' : 'plain'].filter(Boolean).join(' ')}
                            type="button"
                            onClick={() => onChange(option.imageSrc)}
                        >
                            {option.imageSrc ? <img src={resolveAssetPath(option.imageSrc)} alt="" loading="lazy" decoding="async" /> : <span className="section-background-plain-swatch" />}
                            <strong>{option.label}</strong>
                            <span>{option.helper}</span>
                        </button>
                    );
                })}
            </div>
            <WeddingMediaLibrary
                assets={uploadedMedia}
                pendingRemovalIds={pendingRemovalIds}
                selectedSrc={value}
                isUploading={isMediaUploading}
                isLoading={isMediaLoading}
                setupRequired={mediaSetupRequired}
                disabled={mediaUploadDisabled}
                previewShape="flexible"
                onUpload={onUploadMedia}
                onSelect={(asset) => onChange(asset.publicUrl)}
                onDelete={onDeleteMedia}
                isInUse={isMediaInUse}
            />
        </div>
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

function WebsiteActivationIcon({
    state,
    size = 20,
}: {
    state: WebsiteActivationState;
    size?: number;
}) {
    if (state === 'live') return <CheckCircle2 size={size} strokeWidth={2} aria-hidden="true" />;
    if (state === 'verification-pending' || state === 'publishing-pending') {
        return <Clock3 size={size} strokeWidth={2} aria-hidden="true" />;
    }
    return <CircleAlert size={size} strokeWidth={2} aria-hidden="true" />;
}

function WebsiteActivationBanner({
    state,
    websiteUrl,
    onCopy,
    onPreview,
}: {
    state: WebsiteActivationState;
    websiteUrl: string;
    onCopy: () => void;
    onPreview: () => void;
}) {
    const content: Record<WebsiteActivationState, { title: string; message: string }> = {
        unpaid: {
            title: 'Your website is not live yet',
            message: 'Complete payment and request verification to activate your public wedding invitation.',
        },
        'verification-pending': {
            title: 'Payment verification is in progress',
            message: 'Your website remains private while the Shaadi Nyota team reviews your payment.',
        },
        'publishing-pending': {
            title: 'Payment verified. Publishing is pending',
            message: 'Your website is ready for final review and remains private until it is published.',
        },
        live: {
            title: 'Your wedding website is live',
            message: 'Guests can now open and share your public wedding invitation.',
        },
        suspended: {
            title: 'Your website is temporarily unavailable',
            message: 'The public invitation is currently unavailable. Contact Shaadi Nyota for assistance.',
        },
    };
    const current = content[state];
    const paymentComplete = state === 'publishing-pending' || state === 'live' || state === 'suspended';
    const verificationComplete = state === 'publishing-pending' || state === 'live' || state === 'suspended';

    return (
        <section className={`website-activation-banner status-${state}`} aria-live="polite">
            <div className="website-activation-summary">
                <span className="website-activation-icon">
                    <WebsiteActivationIcon state={state} size={22} />
                </span>
                <div>
                    <span className="website-activation-kicker">Website activation</span>
                    <h3>{current.title}</h3>
                    <p>{current.message}</p>
                </div>
            </div>

            <ol className="website-activation-steps" aria-label="Website activation progress">
                <li className="complete"><span>1</span>Build website</li>
                <li className={paymentComplete ? 'complete' : state === 'unpaid' ? 'current' : 'complete'}><span>2</span>Complete payment</li>
                <li className={verificationComplete ? 'complete' : state === 'verification-pending' ? 'current' : ''}><span>3</span>Verification</li>
                <li className={state === 'live' ? 'complete current' : state === 'publishing-pending' ? 'current' : ''}><span>4</span>Website live</li>
            </ol>

            <div className="website-activation-actions">
                {state === 'live' ? (
                    <>
                        <a className="dashboard-primary-btn" href={websiteUrl} target="_blank" rel="noreferrer">
                            <ExternalLink size={16} aria-hidden="true" />
                            Open website
                        </a>
                        <button className="dashboard-primary-btn secondary" type="button" onClick={onCopy}>
                            <Copy size={16} aria-hidden="true" />
                            Copy link
                        </button>
                    </>
                ) : (
                    <>
                        <button className="dashboard-primary-btn" type="button" onClick={onPreview}>
                            <Eye size={16} aria-hidden="true" />
                            Preview website
                        </button>
                        {state === 'unpaid' && (
                            <a className="dashboard-primary-btn secondary" href="#manual-payment-details">
                                View payment details
                            </a>
                        )}
                    </>
                )}
            </div>
        </section>
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
        <section className={`manual-payment-card ${paymentStatus}`} id="manual-payment-details">
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
            <h3>Upgrade to Pro</h3>
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
                <p>RSVP management is included in the Pro plan.</p>
                <p>
                    Upgrade to Pro to manage guest lists, event-wise invites,
                    RSVP responses, and meal preferences.
                </p>
            </div>
            <RsvpUpgradeCard whatsAppContext={whatsAppContext} />
        </div>
    );
}

function WebsiteUrlCard({
    url,
    isLive,
    onCopy,
    onPreview,
}: {
    url: string;
    isLive: boolean;
    onCopy: () => void;
    onPreview: () => void;
}) {
    return (
        <section className="website-url-card">
            <div>
                <p className="dashboard-eyebrow">{isLive ? 'Live website URL' : 'Reserved website URL'}</p>
                {isLive
                    ? <a href={url} target="_blank" rel="noreferrer">{url}</a>
                    : <span className="website-url-value">{url}</span>}
                {!isLive && <small>Your public link is reserved but remains private until activation.</small>}
            </div>
            <div className="website-url-actions">
                <button className="dashboard-primary-btn secondary" type="button" onClick={onCopy}>
                    Copy URL
                </button>
                {isLive ? (
                    <a className="dashboard-primary-btn" href={url} target="_blank" rel="noreferrer">
                        Open Website
                    </a>
                ) : (
                    <button className="dashboard-primary-btn" type="button" onClick={onPreview}>
                        Preview Website
                    </button>
                )}
            </div>
        </section>
    );
}

function EventVisualPicker({
    event,
    themeKey,
    onSelect,
    isAdminMode = false,
    persistenceKey,
    uploadedMedia,
    pendingRemovalIds,
    isMediaUploading,
    isMediaLoading,
    mediaSetupRequired,
    mediaUploadDisabled,
    onUploadMedia,
    onDeleteMedia,
    isMediaInUse,
}: {
    event: WeddingEvent;
    themeKey: string;
    onSelect: (visualKey: string) => void;
    isAdminMode?: boolean;
    persistenceKey: string;
    uploadedMedia: WeddingMediaAsset[];
    pendingRemovalIds: ReadonlySet<string>;
    isMediaUploading: boolean;
    isMediaLoading: boolean;
    mediaSetupRequired: boolean;
    mediaUploadDisabled: boolean;
    onUploadMedia: (file: File) => void;
    onDeleteMedia: (asset: WeddingMediaAsset) => void;
    isMediaInUse: (asset: WeddingMediaAsset) => boolean;
}) {
    const [isPickerOpen, setIsPickerOpenState] = useState(() => {
        try {
            return window.sessionStorage.getItem(persistenceKey) === event.id;
        } catch {
            return false;
        }
    });
    const setIsPickerOpen = (isOpen: boolean) => {
        setIsPickerOpenState(isOpen);
        try {
            if (isOpen) {
                window.sessionStorage.setItem(persistenceKey, event.id);
            } else if (window.sessionStorage.getItem(persistenceKey) === event.id) {
                window.sessionStorage.removeItem(persistenceKey);
            }
        } catch {
            // Keep the in-memory modal state when session storage is unavailable.
        }
    };
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [styleFilter, setStyleFilter] = useState('all');
    const recommendedVisual = getRecommendedVisualForEvent(event.eventName, event.eventKey, themeKey);
    const selectedVisual = getEventVisualByKey(event.eventVisualKey) ?? recommendedVisual;
    const selectedKey = event.eventVisualKey ?? '';
    const selectedVisualKey = selectedVisual?.key ?? selectedKey;
    const visibleEventVisuals = eventVisuals.filter((visual) => isAdminMode || visual.visibility !== 'admin');

    const categoryFilterOptions = [
        { key: 'all', label: 'All' },
        { key: 'haldi', label: 'Haldi' },
        { key: 'mehendi', label: 'Mehendi' },
        { key: 'sangeet', label: 'Sangeet / Music' },
        { key: 'wedding', label: 'Wedding / Nikaah' },
        { key: 'reception', label: 'Reception / Walima' },
        { key: 'generic', label: 'Generic' },
        ...(isAdminMode ? [{ key: 'custom', label: 'Custom' }] : []),
    ];
    const availableStyles = Array.from(new Set(
        visibleEventVisuals
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
        ? visibleEventVisuals
        : visibleEventVisuals.filter((visual) => visual.eventType === categoryFilter);
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
    const previewGuest: WeddingGuest = {
        id: 'event-editor-preview-guest',
        guestName: 'Preview Guest',
        phone: '',
        invitedCount: 1,
        category: 'Preview',
        inviteCode: 'preview',
        invitedEventIds: [previewEvent.id],
        invitedEventCounts: { [previewEvent.id]: 1 },
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
                            guest={previewGuest}
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
                {visibleEventVisuals.length > 0 && (
                    <button
                        className="dashboard-primary-btn secondary"
                        type="button"
                        onClick={() => setIsPickerOpen(true)}
                    >
                        Change Visual
                    </button>
                )}
            </div>

            {visibleEventVisuals.length === 0 && (
                <p className="dashboard-note compact">
                    Event visual cards will appear here when assets are available.
                </p>
            )}

            {isPickerOpen && visibleEventVisuals.length > 0 && (
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

                        <WeddingMediaLibrary
                            assets={uploadedMedia}
                            pendingRemovalIds={pendingRemovalIds}
                            selectedSrc={selectedKey}
                            isUploading={isMediaUploading}
                            isLoading={isMediaLoading}
                            setupRequired={mediaSetupRequired}
                            disabled={mediaUploadDisabled}
                            onUpload={onUploadMedia}
                            onSelect={(asset) => {
                                onSelect(asset.publicUrl);
                                setIsPickerOpen(false);
                            }}
                            onDelete={onDeleteMedia}
                            isInUse={isMediaInUse}
                        />

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
                <img
                    src={resolveAssetPath(visual.thumbnailSrc ?? visual.imageSrc)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                        if (event.currentTarget.dataset.fallbackApplied) return;
                        event.currentTarget.dataset.fallbackApplied = 'true';
                        event.currentTarget.src = resolveAssetPath(visual.imageSrc);
                    }}
                />
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

function GuestCsvValidationPanel({
    analysis,
    mode,
    currentGuestCount,
    onDownloadIssues,
}: {
    analysis: GuestCsvAnalysis;
    mode: CsvImportMode;
    currentGuestCount: number;
    onDownloadIssues: () => void;
}) {
    const errors = analysis.issues.filter((issue) => issue.level === 'error');
    const warnings = analysis.issues.filter((issue) => issue.level === 'warning');
    const hasErrors = errors.length > 0;
    const renderIssueList = (issues: GuestCsvIssue[]) => (
        <>
            <ul>
                {issues.slice(0, 25).map((issue, index) => (
                    <li key={`${issue.level}-${issue.row ?? 'file'}-${issue.column ?? 'general'}-${index}`}>
                        <span>{formatGuestCsvIssue(issue)}</span>
                        {issue.value && <code>{issue.value.slice(0, 100)}</code>}
                    </li>
                ))}
            </ul>
            {issues.length > 25 && (
                <p>{(issues.length - 25).toLocaleString()} additional issue{issues.length - 25 === 1 ? '' : 's'} are included in the downloadable report.</p>
            )}
        </>
    );

    return (
        <section className={`csv-validation-panel${hasErrors ? ' has-errors' : ' is-ready'}`} aria-live="polite">
            <div className="csv-validation-header">
                <div>
                    <span>{hasErrors ? 'Needs attention' : 'Ready to import'}</span>
                    <strong>
                        {hasErrors
                            ? `${errors.length.toLocaleString()} blocking error${errors.length === 1 ? '' : 's'} found`
                            : `${analysis.validRows.toLocaleString()} guest row${analysis.validRows === 1 ? '' : 's'} validated`}
                    </strong>
                </div>
                {analysis.issues.length > 0 && (
                    <button className="dashboard-primary-btn secondary" type="button" onClick={onDownloadIssues}>
                        Download issue report
                    </button>
                )}
            </div>

            <div className="csv-validation-metrics">
                <span><strong>{analysis.totalRows.toLocaleString()}</strong>Rows checked</span>
                <span><strong>{analysis.validRows.toLocaleString()}</strong>Valid rows</span>
                <span><strong>{analysis.phoneNormalizations.length.toLocaleString()}</strong>Phones normalized</span>
                <span><strong>{errors.length.toLocaleString()}</strong>Errors</span>
                <span><strong>{warnings.length.toLocaleString()}</strong>Warnings</span>
                <span><strong>{analysis.resultingGuestEntries.toLocaleString()}</strong>Resulting guests</span>
                <span><strong>{analysis.resultingPeople.toLocaleString()}</strong>Resulting people</span>
            </div>

            {analysis.phoneNormalizations.length > 0 && (
                <details className="csv-issue-group csv-phone-normalizations">
                    <summary>Phone formatting changes ({analysis.phoneNormalizations.length.toLocaleString()})</summary>
                    <ul>
                        {analysis.phoneNormalizations.slice(0, 10).map((item) => (
                            <li key={`phone-normalization-${item.row}`}>
                                <span>Row {item.row}: {item.input}</span>
                                <code>{item.canonical}</code>
                            </li>
                        ))}
                    </ul>
                    {analysis.phoneNormalizations.length > 10 && (
                        <p>{(analysis.phoneNormalizations.length - 10).toLocaleString()} additional phone number{analysis.phoneNormalizations.length - 10 === 1 ? '' : 's'} will also be normalized.</p>
                    )}
                </details>
            )}

            {mode === 'replace' && !hasErrors && (
                <div className="csv-replace-notice">
                    <strong>Replace mode changes the complete guest list.</strong>
                    <p>
                        {analysis.preservedGuests.toLocaleString()} of {currentGuestCount.toLocaleString()} existing personalized link{currentGuestCount === 1 ? '' : 's'} matched safely.
                        {' '}Guests missing from this file will be deleted with their event assignments and RSVP responses after confirmation.
                    </p>
                </div>
            )}

            {errors.length > 0 && (
                <details className="csv-issue-group" open>
                    <summary>Blocking errors ({errors.length.toLocaleString()})</summary>
                    {renderIssueList(errors)}
                </details>
            )}
            {warnings.length > 0 && (
                <details className="csv-issue-group csv-issue-warnings" open={!hasErrors}>
                    <summary>Warnings ({warnings.length.toLocaleString()})</summary>
                    {renderIssueList(warnings)}
                </details>
            )}
            {!hasErrors && warnings.length === 0 && (
                <p className="csv-validation-clear">No data problems were found. The import will still be applied through the transactional save.</p>
            )}
        </section>
    );
}

function TextField({
    label,
    value,
    error,
    multiline = false,
    rows = 2,
    onChange,
}: {
    label: string;
    value: string;
    error?: string;
    multiline?: boolean;
    rows?: number;
    onChange: (value: string) => void;
}) {
    return (
        <label className={`dashboard-field ${error ? 'has-error' : ''}`}>
            <span>{label}</span>
            {multiline ? (
                <textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} />
            ) : (
                <input value={value} onChange={(event) => onChange(event.target.value)} />
            )}
            {error && <em>{error}</em>}
        </label>
    );
}

function ToggleField({
    label,
    checked,
    helperText,
    onLabel = 'On',
    offLabel = 'Off',
    onChange,
}: {
    label: string;
    checked: boolean;
    helperText?: string;
    onLabel?: string;
    offLabel?: string;
    onChange: (checked: boolean) => void;
}) {
    const stateLabel = checked ? onLabel : offLabel;

    return (
        <label className={`dashboard-toggle-field${checked ? ' is-enabled' : ''}`}>
            <span className="dashboard-toggle-copy">
                <strong>{label}</strong>
                {helperText && <small>{helperText}</small>}
            </span>
            <span className="dashboard-toggle-control">
                <span className="dashboard-toggle-status" aria-hidden="true">{stateLabel}</span>
                <span className="dashboard-toggle-switch">
                    <input
                        type="checkbox"
                        role="switch"
                        aria-label={`${label}: ${stateLabel}`}
                        checked={checked}
                        onChange={(event) => onChange(event.target.checked)}
                    />
                    <span className="dashboard-toggle-track" aria-hidden="true">
                        <span className="dashboard-toggle-thumb" />
                    </span>
                </span>
            </span>
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
    helperText,
    headers,
    children,
}: {
    title: string;
    helperText?: string;
    headers: string[];
    children: React.ReactNode;
}) {
    return (
        <section className="rsvp-analytics-section">
            <h3>{title}</h3>
            {helperText && <p className="rsvp-table-helper">{helperText}</p>}
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













