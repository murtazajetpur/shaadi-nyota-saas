import { Fragment, useEffect, useMemo, useState } from 'react';
import './Admin.css';
import { useAuth } from '../context/AuthContext';
import {
    activePackageTypes,
    DEFAULT_GUEST_RECORD_LIMIT,
    DEFAULT_INVITEE_LIMIT,
    MAX_GUEST_RECORD_LIMIT,
    MAX_INVITEE_LIMIT,
    getPackageDisplayLabel,
    getThemeDisplayLabel,
    mockAdminWeddingsStorageKey,
    mockDashboardDraftStorageKey,
    mockRsvpResponsesStorageKey,
    packageDisplayLabels,
    sampleWeddings,
    type PackageType,
    type PaymentStatus,
    type SampleWeddingData,
    type StoredRsvpResponse,
    type WeddingStatus,
} from '../data/sampleWeddingData';
import { packageDetails, paymentStatusLabels } from '../data/paymentConfig';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

type WebsiteStatus = 'draft' | 'published' | 'suspended';
type PaymentFilter = 'all' | PaymentStatus;
type WebsiteStatusFilter = 'all' | WebsiteStatus;
type AdminDataSource = 'supabase' | 'mock';

interface SupabaseWeddingRow {
    id: string;
    owner_id: string | null;
    slug: string;
    package_type: PackageType;
    status: WebsiteStatus;
    payment_status: PaymentStatus;
    bride_name: string | null;
    groom_name: string | null;
    display_name: string | null;
    guest_record_limit: number | null;
    invitee_limit: number | null;
    page_title: string | null;
    theme_key: string | null;
    published_at: string | null;
    created_at: string | null;
}

interface AdminWeddingRecord {
    id: string;
    slug: string;
    packageType: PackageType;
    paymentStatus: PaymentStatus;
    websiteStatus: WebsiteStatus;
    displayName: string;
    pageTitle: string;
    themeKey: string;
    createdAt: string | null;
    publishedAt: string | null;
    guestCount: number | null;
    invitedCount: number | null;
    responseCount: number | null;
    eventCount: number | null;
    guestRecordLimit: number;
    inviteeLimit: number;
}

const getAdminPackageOptions = (currentPackageType?: PackageType) => {
    const options = [...activePackageTypes];
    if (currentPackageType && !options.includes(currentPackageType)) {
        options.push(currentPackageType);
    }
    return options;
};

const cloneWedding = (wedding: SampleWeddingData): SampleWeddingData => (
    JSON.parse(JSON.stringify(wedding)) as SampleWeddingData
);

const getFallbackPaymentStatus = (status: WeddingStatus): PaymentStatus => (
    status === 'paid' || status === 'published' ? 'paid' : 'unpaid'
);

const getWebsiteStatus = (status: WeddingStatus): WebsiteStatus => {
    if (status === 'published') return 'published';
    if (status === 'suspended') return 'suspended';
    return 'draft';
};

const normalizeAdminWedding = (wedding: SampleWeddingData): SampleWeddingData => {
    const sample = sampleWeddings.find((sampleWedding) => sampleWedding.wedding.slug === wedding.wedding.slug);
    const defaults = sample ? cloneWedding(sample) : cloneWedding(sampleWeddings[0]);

    return {
        ...defaults,
        ...wedding,
        wedding: {
            ...defaults.wedding,
            ...wedding.wedding,
            paymentStatus: wedding.wedding.paymentStatus ?? getFallbackPaymentStatus(wedding.wedding.status),
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
        events: wedding.events?.length ? wedding.events : defaults.events,
        closing: {
            ...defaults.closing,
            ...wedding.closing,
        },
    };
};

const loadDashboardDraft = () => {
    try {
        const draft = window.localStorage.getItem(mockDashboardDraftStorageKey);
        return draft ? normalizeAdminWedding(JSON.parse(draft) as SampleWeddingData) : undefined;
    } catch {
        return undefined;
    }
};

const mergeDashboardDraft = (records: SampleWeddingData[]) => {
    const draft = loadDashboardDraft();
    if (!draft) return records;

    const existingRecord = records.find((record) => record.wedding.slug === draft.wedding.slug);
    const draftWithAdminFields: SampleWeddingData = {
        ...draft,
        wedding: {
            ...draft.wedding,
            packageType: existingRecord?.wedding.packageType ?? draft.wedding.packageType,
            status: existingRecord?.wedding.status ?? draft.wedding.status,
            paymentStatus: existingRecord?.wedding.paymentStatus ?? draft.wedding.paymentStatus,
        },
    };

    if (existingRecord) {
        return records.map((record) => (
            record.wedding.slug === draft.wedding.slug ? draftWithAdminFields : record
        ));
    }

    return [...records, draftWithAdminFields];
};

const loadMockWeddings = () => {
    try {
        const savedWeddings = window.localStorage.getItem(mockAdminWeddingsStorageKey);
        const parsedWeddings = savedWeddings
            ? JSON.parse(savedWeddings) as SampleWeddingData[]
            : sampleWeddings.map(cloneWedding);
        return mergeDashboardDraft(parsedWeddings.map(normalizeAdminWedding));
    } catch {
        window.localStorage.removeItem(mockAdminWeddingsStorageKey);
        return mergeDashboardDraft(sampleWeddings.map(cloneWedding));
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

const mockWeddingToRecord = (wedding: SampleWeddingData, rsvpResponses: StoredRsvpResponse[]): AdminWeddingRecord => ({
    id: wedding.wedding.slug,
    slug: wedding.wedding.slug,
    packageType: wedding.wedding.packageType,
    paymentStatus: getFallbackPaymentStatus(wedding.wedding.status),
    websiteStatus: getWebsiteStatus(wedding.wedding.status),
    displayName: wedding.couple.displayName,
    pageTitle: wedding.wedding.pageTitle,
    themeKey: wedding.wedding.themeKey,
    createdAt: null,
    publishedAt: null,
    guestCount: wedding.rsvp.guests.length,
    invitedCount: wedding.rsvp.guests.reduce((total, guest) => total + guest.invitedCount, 0),
    responseCount: rsvpResponses.filter((response) => response.weddingSlug === wedding.wedding.slug).length,
    eventCount: wedding.events.length,
    guestRecordLimit: wedding.wedding.guestRecordLimit ?? DEFAULT_GUEST_RECORD_LIMIT,
    inviteeLimit: wedding.wedding.inviteeLimit ?? DEFAULT_INVITEE_LIMIT,
});

const supabaseWeddingToRecord = (
    wedding: SupabaseWeddingRow,
    counts: { guestCount?: number; invitedCount?: number; responseCount?: number; eventCount?: number } = {}
): AdminWeddingRecord => {
    const displayName = wedding.display_name || [wedding.groom_name, wedding.bride_name].filter(Boolean).join(' & ') || 'Untitled wedding';

    return {
        id: wedding.id,
        slug: wedding.slug,
        packageType: wedding.package_type,
        paymentStatus: wedding.payment_status,
        websiteStatus: wedding.status,
        displayName,
        pageTitle: wedding.page_title || `${displayName} | Shaadi Nyota`,
        themeKey: wedding.theme_key || 'palace-door-opening',
        createdAt: wedding.created_at,
        publishedAt: wedding.published_at,
        guestCount: counts.guestCount ?? 0,
        invitedCount: counts.invitedCount ?? 0,
        responseCount: counts.responseCount ?? 0,
        eventCount: counts.eventCount ?? 0,
        guestRecordLimit: wedding.guest_record_limit ?? DEFAULT_GUEST_RECORD_LIMIT,
        inviteeLimit: wedding.invitee_limit ?? DEFAULT_INVITEE_LIMIT,
    };
};

const formatDate = (value: string | null) => {
    if (!value) return 'Not available';
    return new Date(value).toLocaleDateString();
};

export default function Admin({ authNotice }: { authNotice?: string }) {
    const { user, profile, isConfigured, signOut } = useAuth();
    const [mockWeddings, setMockWeddings] = useState<SampleWeddingData[]>(loadMockWeddings);
    const [adminWeddings, setAdminWeddings] = useState<AdminWeddingRecord[]>([]);
    const [dataSource, setDataSource] = useState<AdminDataSource>('mock');
    const [rsvpResponses, setRsvpResponses] = useState<StoredRsvpResponse[]>(loadStoredRsvpResponses);
    const [saveStatus, setSaveStatus] = useState('Admin data ready');
    const [devWarning, setDevWarning] = useState('');
    const [isLoadingWeddings, setIsLoadingWeddings] = useState(false);
    const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [planFilter, setPlanFilter] = useState<'all' | PackageType>('all');
    const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
    const [websiteStatusFilter, setWebsiteStatusFilter] = useState<WebsiteStatusFilter>('all');

    const loadSupabaseWeddings = async () => {
        if (!supabase || !isSupabaseConfigured) {
            setDataSource('mock');
            setAdminWeddings(mockWeddings.map((wedding) => mockWeddingToRecord(wedding, rsvpResponses)));
            setDevWarning('Supabase env vars are missing, so admin is running with development fallback data.');
            return;
        }

        setIsLoadingWeddings(true);
        const { data, error } = await supabase
            .from('weddings')
            .select('id, owner_id, slug, package_type, status, payment_status, bride_name, groom_name, display_name, page_title, theme_key, guest_record_limit, invitee_limit, published_at, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            setIsLoadingWeddings(false);
            setDataSource('supabase');
            setAdminWeddings([]);
            console.warn('Could not load admin data', error.message);
            setDevWarning('Could not load admin data. Check admin RLS policies and try again.');
            setSaveStatus('Could not load admin data');
            return;
        }

        const weddings = (data ?? []) as SupabaseWeddingRow[];
        const weddingIds = weddings.map((wedding) => wedding.id);
        const countMap = new Map<string, { guestCount: number; invitedCount: number; responseCount: number; eventCount: number }>();
        weddingIds.forEach((id) => countMap.set(id, { guestCount: 0, invitedCount: 0, responseCount: 0, eventCount: 0 }));
        const countErrors: string[] = [];

        if (weddingIds.length) {
            const [guestsResult, responsesResult, eventsResult] = await Promise.all([
                supabase.from('guests').select('wedding_id,invited_count').in('wedding_id', weddingIds),
                supabase.from('rsvp_responses').select('wedding_id').in('wedding_id', weddingIds),
                supabase.from('events').select('wedding_id').in('wedding_id', weddingIds),
            ]);

            if (!guestsResult.error) {
                (guestsResult.data ?? []).forEach((guest) => {
                    const counts = countMap.get(guest.wedding_id as string);
                    if (!counts) return;
                    counts.guestCount += 1;
                    counts.invitedCount += Number(guest.invited_count ?? 0);
                });
            } else {
                countErrors.push(`Guest counts failed: ${guestsResult.error.message}`);
            }

            if (!responsesResult.error) {
                (responsesResult.data ?? []).forEach((response) => {
                    const counts = countMap.get(response.wedding_id as string);
                    if (counts) counts.responseCount += 1;
                });
            } else {
                countErrors.push(`RSVP counts failed: ${responsesResult.error.message}`);
            }

            if (!eventsResult.error) {
                (eventsResult.data ?? []).forEach((event) => {
                    const counts = countMap.get(event.wedding_id as string);
                    if (counts) counts.eventCount += 1;
                });
            } else {
                countErrors.push(`Event counts failed: ${eventsResult.error.message}`);
            }
        }

        setIsLoadingWeddings(false);
        setDataSource('supabase');
        setAdminWeddings(weddings.map((wedding) => supabaseWeddingToRecord(wedding, countMap.get(wedding.id))));
        const allVisibleWeddingsAreOwnedByAdmin = Boolean(
            profile?.role === 'admin' &&
            user?.id &&
            weddings.length > 0 &&
            weddings.every((wedding) => wedding.owner_id === user.id)
        );
        const visibilityWarning = allVisibleWeddingsAreOwnedByAdmin
            ? 'Admin query is unscoped, but Supabase returned only weddings owned by this user. If other weddings exist, update RLS so admins can read all weddings.'
            : '';
        setDevWarning([visibilityWarning, ...countErrors].filter(Boolean).join(' '));
        setSaveStatus(countErrors.length ? 'Loaded weddings; some counts failed' : 'Loaded from Supabase');
    };

    useEffect(() => {
        document.title = 'Admin | Shaadi Nyota';
        setRsvpResponses(loadStoredRsvpResponses());
        const previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'auto';

        return () => {
            document.body.style.overflow = previousBodyOverflow;
        };
    }, []);

    useEffect(() => {
        void loadSupabaseWeddings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConfigured, user]);

    useEffect(() => {
        if (dataSource === 'mock') {
            setAdminWeddings(mockWeddings.map((wedding) => mockWeddingToRecord(wedding, rsvpResponses)));
        }
    }, [dataSource, mockWeddings, rsvpResponses]);

    const summaries = useMemo(() => adminWeddings, [adminWeddings]);

    const filteredSummaries = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return summaries.filter((wedding) => {
            const matchesSearch = !query || [wedding.displayName, wedding.slug].some((value) => (
                value.toLowerCase().includes(query)
            ));
            const matchesPlan = planFilter === 'all' || wedding.packageType === planFilter;
            const matchesPayment = paymentFilter === 'all' || wedding.paymentStatus === paymentFilter;
            const matchesWebsiteStatus = websiteStatusFilter === 'all' || wedding.websiteStatus === websiteStatusFilter;

            return matchesSearch && matchesPlan && matchesPayment && matchesWebsiteStatus;
        });
    }, [paymentFilter, planFilter, searchQuery, summaries, websiteStatusFilter]);

    const persistMockWeddings = (nextWeddings: SampleWeddingData[]) => {
        setMockWeddings(nextWeddings);
        window.localStorage.setItem(mockAdminWeddingsStorageKey, JSON.stringify(nextWeddings));
        setSaveStatus('Saved fallback data');
    };

    const updateMockWedding = (
        slug: string,
        updater: (wedding: SampleWeddingData) => SampleWeddingData
    ) => {
        persistMockWeddings(mockWeddings.map((wedding) => (
            wedding.wedding.slug === slug ? updater(wedding) : wedding
        )));
    };

    const updateSupabaseWedding = async (id: string, values: Partial<SupabaseWeddingRow>) => {
        if (!supabase) return;

        const { error } = await supabase
            .from('weddings')
            .update(values)
            .eq('id', id);

        if (error) {
            setDevWarning(`Supabase update failed: ${error.message}`);
            return;
        }

        setSaveStatus('Saved to Supabase');
        await loadSupabaseWeddings();
    };

    const changePlan = (record: AdminWeddingRecord, packageType: PackageType) => {
        if (dataSource === 'supabase') {
            void updateSupabaseWedding(record.id, { package_type: packageType } as Partial<SupabaseWeddingRow>);
            return;
        }

        updateMockWedding(record.slug, (wedding) => ({
            ...wedding,
            wedding: {
                ...wedding.wedding,
                packageType,
            },
        }));
    };

    const changeGuestCapacity = (
        record: AdminWeddingRecord,
        field: 'guestRecordLimit' | 'inviteeLimit',
        rawValue: number
    ) => {
        const isGuestRecordLimit = field === 'guestRecordLimit';
        const currentUsage = isGuestRecordLimit ? (record.guestCount ?? 0) : (record.invitedCount ?? 0);
        const maximum = isGuestRecordLimit ? MAX_GUEST_RECORD_LIMIT : MAX_INVITEE_LIMIT;
        const value = Math.max(currentUsage, Math.min(maximum, Math.floor(rawValue || currentUsage || 1)));
        const column = isGuestRecordLimit ? 'guest_record_limit' : 'invitee_limit';

        if (dataSource === 'supabase') {
            void updateSupabaseWedding(record.id, { [column]: value } as Partial<SupabaseWeddingRow>);
            return;
        }

        updateMockWedding(record.slug, (wedding) => ({
            ...wedding,
            wedding: {
                ...wedding.wedding,
                [field]: value,
            },
        }));
    };
    const markPaid = (record: AdminWeddingRecord) => {
        if (dataSource === 'supabase') {
            void updateSupabaseWedding(record.id, { payment_status: 'paid' } as Partial<SupabaseWeddingRow>);
            return;
        }

        updateMockWedding(record.slug, (wedding) => ({
            ...wedding,
            wedding: {
                ...wedding.wedding,
                paymentStatus: 'paid',
                status: wedding.wedding.status === 'published' ? 'published' : 'draft',
            },
        }));
    };

    const markUnpaid = (record: AdminWeddingRecord) => {
        if (dataSource === 'supabase') {
            void updateSupabaseWedding(record.id, { payment_status: 'unpaid' } as Partial<SupabaseWeddingRow>);
            return;
        }

        updateMockWedding(record.slug, (wedding) => ({
            ...wedding,
            wedding: {
                ...wedding.wedding,
                paymentStatus: 'unpaid',
                status: wedding.wedding.status === 'suspended' ? 'suspended' : 'draft',
            },
        }));
    };

    const publishWedding = (record: AdminWeddingRecord) => {
        if (record.paymentStatus !== 'paid') return;

        if (dataSource === 'supabase') {
            void updateSupabaseWedding(record.id, {
                status: 'published',
                published_at: new Date().toISOString(),
            } as Partial<SupabaseWeddingRow>);
            return;
        }

        updateMockWedding(record.slug, (wedding) => ({
            ...wedding,
            wedding: {
                ...wedding.wedding,
                status: 'published',
            },
        }));
    };

    const unpublishWedding = (record: AdminWeddingRecord) => {
        if (dataSource === 'supabase') {
            void updateSupabaseWedding(record.id, { status: 'draft' } as Partial<SupabaseWeddingRow>);
            return;
        }

        updateMockWedding(record.slug, (wedding) => ({
            ...wedding,
            wedding: {
                ...wedding.wedding,
                status: 'draft',
            },
        }));
    };

    const suspendWedding = (record: AdminWeddingRecord) => {
        if (dataSource === 'supabase') {
            void updateSupabaseWedding(record.id, { status: 'suspended' } as Partial<SupabaseWeddingRow>);
            return;
        }

        updateMockWedding(record.slug, (wedding) => ({
            ...wedding,
            wedding: {
                ...wedding.wedding,
                status: 'suspended',
            },
        }));
    };

    const restoreWebsite = (record: AdminWeddingRecord) => {
        if (dataSource === 'supabase') {
            void updateSupabaseWedding(record.id, { status: 'draft' } as Partial<SupabaseWeddingRow>);
            return;
        }

        updateMockWedding(record.slug, (wedding) => ({
            ...wedding,
            wedding: {
                ...wedding.wedding,
                status: 'draft',
            },
        }));
    };

    const refreshData = () => {
        if (dataSource === 'supabase') {
            void loadSupabaseWeddings();
            return;
        }

        const nextWeddings = mergeDashboardDraft(mockWeddings.map(normalizeAdminWedding));
        persistMockWeddings(nextWeddings);
        setRsvpResponses(loadStoredRsvpResponses());
        setSaveStatus('Refreshed fallback data');
    };

    const handleLogout = async () => {
        await signOut();
        window.location.href = '/login';
    };

    const totalGuests = summaries.reduce((total, wedding) => total + (wedding.invitedCount ?? 0), 0);
    const totalResponses = summaries.reduce((total, wedding) => total + (wedding.responseCount ?? 0), 0);

    return (
        <main className="admin-page">
            <section className="admin-shell">
                <div className="admin-header">
                    <div>
                        <p className="admin-eyebrow">Shaadi Nyota</p>
                        <h1>Admin Panel</h1>
                        <p>Manual package, payment, and publishing controls.</p>
                        {user?.email && <p className="admin-auth-user">{user.email}</p>}
                        {(authNotice || devWarning) && <p className="admin-auth-notice">{authNotice || devWarning}</p>}
                        {dataSource === 'supabase' && (
                            <p className="admin-data-note">Wedding, guest, event, and RSVP counts are loaded from Supabase.</p>
                        )}
                    </div>
                    <div className="admin-header-actions">
                        <span>{isLoadingWeddings ? 'Loading...' : saveStatus}</span>
                        <button type="button" onClick={refreshData}>
                            {dataSource === 'supabase' ? 'Refresh Data' : 'Refresh Fallback Data'}
                        </button>
                        {isConfigured && <button type="button" onClick={handleLogout}>Logout</button>}
                    </div>
                </div>

                <div className="admin-summary-grid">
                    <InfoCard label="Total Weddings" value={String(summaries.length)} />
                    <InfoCard
                        label="Live Websites"
                        value={String(summaries.filter((summary) => summary.websiteStatus === 'published').length)}
                    />
                    <InfoCard
                        label="Payment Requests"
                        value={String(summaries.filter((summary) => (
                            summary.paymentStatus === 'manual_pending' || summary.paymentStatus === 'ref_pending'
                        )).length)}
                    />
                    <InfoCard
                        label="Total Guests"
                        value={String(totalGuests)}
                    />
                    <InfoCard
                        label="RSVP Responses"
                        value={String(totalResponses)}
                    />
                </div>

                <div className="admin-filters">
                    <label>
                        <span>Search</span>
                        <input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Couple name or slug"
                        />
                    </label>
                    <label>
                        <span>Plan</span>
                        <select value={planFilter} onChange={(event) => setPlanFilter(event.target.value as 'all' | PackageType)}>
                            <option value="all">All plans</option>
                            {getAdminPackageOptions().map((packageType) => (
                                <option key={packageType} value={packageType}>{getPackageDisplayLabel(packageType)}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span>Payment</span>
                        <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value as PaymentFilter)}>
                            <option value="all">All payment</option>
                            <option value="unpaid">{paymentStatusLabels.unpaid}</option>
                            <option value="manual_pending">{paymentStatusLabels.manual_pending}</option>
                            <option value="ref_pending">{paymentStatusLabels.ref_pending}</option>
                            <option value="paid">{paymentStatusLabels.paid}</option>
                        </select>
                    </label>
                    <label>
                        <span>Website</span>
                        <select
                            value={websiteStatusFilter}
                            onChange={(event) => setWebsiteStatusFilter(event.target.value as WebsiteStatusFilter)}
                        >
                            <option value="all">All website status</option>
                            <option value="draft">draft</option>
                            <option value="published">published</option>
                            <option value="suspended">suspended</option>
                        </select>
                    </label>
                </div>

                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Couple</th>
                                <th>Slug</th>
                                <th>Plan</th>
                                <th>Payment</th>
                                <th>Website Status</th>
                                <th>Created</th>
                                <th>Guests</th>
                                <th>RSVPs</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSummaries.map((wedding) => (
                                <Fragment key={wedding.id}>
                                    <tr className={wedding.paymentStatus === 'manual_pending' || wedding.paymentStatus === 'ref_pending' ? 'admin-payment-request-row' : undefined}>
                                        <td>
                                            <strong>{wedding.displayName}</strong>
                                            <small>{wedding.pageTitle}</small>
                                        </td>
                                        <td><code>{wedding.slug}</code></td>
                                        <td>
                                            <StatusBadge tone="plan">{getPackageDisplayLabel(wedding.packageType)}</StatusBadge>
                                            <small className="admin-plan-price">{packageDetails[wedding.packageType].priceLabel}</small>
                                        </td>
                                        <td><StatusBadge tone={wedding.paymentStatus}>{paymentStatusLabels[wedding.paymentStatus]}</StatusBadge></td>
                                        <td><StatusBadge tone={wedding.websiteStatus}>{wedding.websiteStatus}</StatusBadge></td>
                                        <td>{formatDate(wedding.createdAt)}</td>
                                        <td>{wedding.guestCount ?? 0} families / {wedding.invitedCount ?? 0} invited</td>
                                        <td>{wedding.responseCount ?? 0}</td>
                                        <td>
                                            <button
                                                className="admin-manage-btn"
                                                type="button"
                                                onClick={() => setExpandedSlug(expandedSlug === wedding.slug ? null : wedding.slug)}
                                            >
                                                {expandedSlug === wedding.slug ? 'Close' : 'Manage'}
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedSlug === wedding.slug && (
                                        <tr className="admin-manage-row">
                                            <td colSpan={9}>
                                                <div className="admin-manage-panel">
                                                    <div className="admin-manage-section">
                                                        <h3>Change Plan</h3>
                                                        <label className="admin-inline-field">
                                                            <span>Plan</span>
                                                            <select
                                                                value={wedding.packageType}
                                                                onChange={(event) => changePlan(wedding, event.target.value as PackageType)}
                                                            >
                                                                {getAdminPackageOptions(wedding.packageType).map((packageType) => (
                                                                    <option key={packageType} value={packageType}>
                                                                        {packageDisplayLabels[packageType]} · {packageDetails[packageType].priceLabel}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </label>
                                                    </div>

                                                    <div className="admin-manage-section">
                                                        <h3>Guest Capacity</h3>
                                                        <p className="admin-helper-text">
                                                            Current usage: {wedding.guestCount ?? 0} guest entries and {wedding.invitedCount ?? 0} people.
                                                        </p>
                                                        <div className="admin-limit-grid">
                                                            <label className="admin-inline-field">
                                                                <span>Guest entry limit</span>
                                                                <input
                                                                    key={`${wedding.id}-guest-limit-${wedding.guestRecordLimit}`}
                                                                    type="number"
                                                                    min={Math.max(1, wedding.guestCount ?? 0)}
                                                                    max={MAX_GUEST_RECORD_LIMIT}
                                                                    defaultValue={wedding.guestRecordLimit}
                                                                    onBlur={(event) => changeGuestCapacity(wedding, 'guestRecordLimit', Number(event.target.value))}
                                                                />
                                                            </label>
                                                            <label className="admin-inline-field">
                                                                <span>Total people limit</span>
                                                                <input
                                                                    key={`${wedding.id}-invitee-limit-${wedding.inviteeLimit}`}
                                                                    type="number"
                                                                    min={Math.max(1, wedding.invitedCount ?? 0)}
                                                                    max={MAX_INVITEE_LIMIT}
                                                                    defaultValue={wedding.inviteeLimit}
                                                                    onBlur={(event) => changeGuestCapacity(wedding, 'inviteeLimit', Number(event.target.value))}
                                                                />
                                                            </label>
                                                        </div>
                                                        <p className="admin-helper-text">Couples cannot increase these limits themselves.</p>
                                                    </div>
                                                    <div className="admin-manage-section">
                                                        <h3>Payment Controls</h3>
                                                        <div className="admin-action-grid">
                                                            {wedding.paymentStatus !== 'paid' ? (
                                                                <button type="button" onClick={() => markPaid(wedding)}>
                                                                    {wedding.paymentStatus === 'manual_pending' || wedding.paymentStatus === 'ref_pending' ? 'Verify Payment' : 'Mark Paid'}
                                                                </button>
                                                            ) : (
                                                                <button type="button" onClick={() => markUnpaid(wedding)}>Mark Unpaid</button>
                                                            )}
                                                        </div>
                                                        {(wedding.paymentStatus === 'manual_pending' || wedding.paymentStatus === 'ref_pending') && (
                                                            <p className="admin-helper-text">Payment verification has been requested by the couple.</p>
                                                        )}
                                                    </div>

                                                    <div className="admin-manage-section">
                                                        <h3>Website Controls</h3>
                                                        <div className="admin-action-grid">
                                                            {wedding.websiteStatus === 'draft' && (
                                                                <button
                                                                    type="button"
                                                                    disabled={wedding.paymentStatus !== 'paid'}
                                                                    title={wedding.paymentStatus !== 'paid' ? 'Mark payment as paid before publishing' : undefined}
                                                                    onClick={() => publishWedding(wedding)}
                                                                >
                                                                    Publish
                                                                </button>
                                                            )}
                                                            {wedding.websiteStatus === 'published' && (
                                                                <>
                                                                    <button type="button" onClick={() => unpublishWedding(wedding)}>Unpublish</button>
                                                                    <button type="button" onClick={() => suspendWedding(wedding)}>Suspend</button>
                                                                </>
                                                            )}
                                                            {wedding.websiteStatus === 'suspended' && (
                                                                <button type="button" onClick={() => restoreWebsite(wedding)}>Restore Website</button>
                                                            )}
                                                        </div>
                                                        {wedding.websiteStatus === 'draft' && wedding.paymentStatus !== 'paid' && (
                                                            <p className="admin-helper-text">Mark payment as paid before publishing.</p>
                                                        )}
                                                    </div>

                                                    <div className="admin-manage-section">
                                                        <h3>Summary</h3>
                                                        <dl className="admin-summary-list">
                                                            <div>
                                                                <dt>Template</dt>
                                                                <dd>{getThemeDisplayLabel(wedding.themeKey)}</dd>
                                                            </div>
                                                            <div>
                                                                <dt>Events</dt>
                                                                <dd>{wedding.eventCount ?? 'Not migrated'}</dd>
                                                            </div>
                                                            <div>
                                                                <dt>Families</dt>
                                                                <dd>{wedding.guestCount ?? 0}</dd>
                                                            </div>
                                                            <div>
                                                                <dt>Total Invited</dt>
                                                                <dd>{wedding.invitedCount ?? 0}</dd>
                                                            </div>
                                                            <div>
                                                                <dt>RSVP Responses</dt>
                                                                <dd>{wedding.responseCount ?? 0}</dd>
                                                            </div>
                                                        </dl>
                                                    </div>

                                                    <div className="admin-manage-section">
                                                        <h3>Links</h3>
                                                        <div className="admin-link-stack">
                                                            <a href={`/${wedding.slug}`} target="_blank" rel="noreferrer">Open Website</a>
                                                            <a href={`/admin/weddings/${wedding.id}`} target="_blank" rel="noreferrer">View/Edit Wedding</a>
                                                            <a href="/dashboard" target="_blank" rel="noreferrer">View RSVP</a>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                    {filteredSummaries.length === 0 && (
                        <p className="admin-empty-state">
                            {summaries.length === 0 ? 'No weddings found. Create your first wedding.' : 'No weddings match these filters.'}
                        </p>
                    )}
                </div>
            </section>
        </main>
    );
}

function InfoCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="admin-info-card">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

function StatusBadge({
    children,
    tone,
}: {
    children: string;
    tone: 'plan' | PaymentFilter | WebsiteStatus;
}) {
    return <span className={`admin-status-badge ${tone}`}>{children}</span>;
}
