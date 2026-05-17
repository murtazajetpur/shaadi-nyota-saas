import { Fragment, useEffect, useMemo, useState } from 'react';
import './Admin.css';
import {
    getPackageDisplayLabel,
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

type WebsiteStatus = 'draft' | 'published' | 'suspended';
type PaymentFilter = 'all' | 'unpaid' | 'paid';
type WebsiteStatusFilter = 'all' | WebsiteStatus;

const cloneWedding = (wedding: SampleWeddingData): SampleWeddingData => (
    JSON.parse(JSON.stringify(wedding)) as SampleWeddingData
);

const packageOptions: PackageType[] = ['basic', 'rsvp', 'whatsapp'];

const getFallbackPaymentStatus = (status: WeddingStatus): PaymentStatus => (
    status === 'paid' || status === 'published' ? 'paid' : 'unpaid'
);

const getEffectivePaymentStatus = (paymentStatus: PaymentStatus): PaymentFilter => (
    paymentStatus === 'paid' ? 'paid' : 'unpaid'
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

const loadAdminWeddings = () => {
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

export default function Admin() {
    const [weddings, setWeddings] = useState<SampleWeddingData[]>(loadAdminWeddings);
    const [rsvpResponses, setRsvpResponses] = useState<StoredRsvpResponse[]>(loadStoredRsvpResponses);
    const [saveStatus, setSaveStatus] = useState('Admin data ready');
    const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [planFilter, setPlanFilter] = useState<'all' | PackageType>('all');
    const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
    const [websiteStatusFilter, setWebsiteStatusFilter] = useState<WebsiteStatusFilter>('all');

    useEffect(() => {
        document.title = 'Mock Admin | Shaadi Nyota';
        setRsvpResponses(loadStoredRsvpResponses());
    }, []);

    const summaries = useMemo(() => weddings.map((wedding) => {
        const guestCount = wedding.rsvp.guests.length;
        const invitedCount = wedding.rsvp.guests.reduce((total, guest) => total + guest.invitedCount, 0);
        const responseCount = rsvpResponses.filter((response) => response.weddingSlug === wedding.wedding.slug).length;

        return {
            wedding,
            guestCount,
            invitedCount,
            responseCount,
            paymentStatus: getEffectivePaymentStatus(wedding.wedding.paymentStatus),
            websiteStatus: getWebsiteStatus(wedding.wedding.status),
        };
    }), [rsvpResponses, weddings]);

    const filteredSummaries = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return summaries.filter(({ wedding, paymentStatus, websiteStatus }) => {
            const matchesSearch = !query || [wedding.couple.displayName, wedding.wedding.slug].some((value) => (
                value.toLowerCase().includes(query)
            ));
            const matchesPlan = planFilter === 'all' || wedding.wedding.packageType === planFilter;
            const matchesPayment = paymentFilter === 'all' || paymentStatus === paymentFilter;
            const matchesWebsiteStatus = websiteStatusFilter === 'all' || websiteStatus === websiteStatusFilter;

            return matchesSearch && matchesPlan && matchesPayment && matchesWebsiteStatus;
        });
    }, [paymentFilter, planFilter, searchQuery, summaries, websiteStatusFilter]);

    const persistWeddings = (nextWeddings: SampleWeddingData[]) => {
        setWeddings(nextWeddings);
        window.localStorage.setItem(mockAdminWeddingsStorageKey, JSON.stringify(nextWeddings));
        setSaveStatus('Saved');
    };

    const updateWedding = (
        slug: string,
        updater: (wedding: SampleWeddingData) => SampleWeddingData
    ) => {
        persistWeddings(weddings.map((wedding) => (
            wedding.wedding.slug === slug ? updater(wedding) : wedding
        )));
    };

    const changePlan = (slug: string, packageType: PackageType) => {
        updateWedding(slug, (wedding) => ({
            ...wedding,
            wedding: {
                ...wedding.wedding,
                packageType,
            },
        }));
    };

    const markPaid = (slug: string) => updateWedding(slug, (wedding) => ({
        ...wedding,
        wedding: {
            ...wedding.wedding,
            paymentStatus: 'paid',
            status: wedding.wedding.status === 'published' ? 'published' : 'draft',
        },
    }));

    const markUnpaid = (slug: string) => updateWedding(slug, (wedding) => ({
        ...wedding,
        wedding: {
            ...wedding.wedding,
            paymentStatus: 'unpaid',
            status: wedding.wedding.status === 'suspended' ? 'suspended' : 'draft',
        },
    }));

    const publishWedding = (slug: string) => updateWedding(slug, (wedding) => {
        if (getEffectivePaymentStatus(wedding.wedding.paymentStatus) !== 'paid') return wedding;
        return {
            ...wedding,
            wedding: {
                ...wedding.wedding,
                status: 'published',
            },
        };
    });

    const unpublishWedding = (slug: string) => updateWedding(slug, (wedding) => ({
        ...wedding,
        wedding: {
            ...wedding.wedding,
            status: 'draft',
        },
    }));

    const suspendWedding = (slug: string) => updateWedding(slug, (wedding) => ({
        ...wedding,
        wedding: {
            ...wedding.wedding,
            status: 'suspended',
        },
    }));

    const restoreWebsite = (slug: string) => updateWedding(slug, (wedding) => ({
        ...wedding,
        wedding: {
            ...wedding.wedding,
            status: 'draft',
        },
    }));

    const refreshFromLocalData = () => {
        const nextWeddings = mergeDashboardDraft(weddings.map(normalizeAdminWedding));
        persistWeddings(nextWeddings);
        setRsvpResponses(loadStoredRsvpResponses());
        setSaveStatus('Refreshed from local draft');
    };

    return (
        <main className="admin-page">
            <section className="admin-shell">
                <div className="admin-header">
                    <div>
                        <p className="admin-eyebrow">Shaadi Nyota</p>
                        <h1>Mock Admin Panel</h1>
                        <p>Manual package, payment, and publishing controls for local testing.</p>
                    </div>
                    <div className="admin-header-actions">
                        <span>{saveStatus}</span>
                        <button type="button" onClick={refreshFromLocalData}>Refresh Local Data</button>
                    </div>
                </div>

                <div className="admin-summary-grid">
                    <InfoCard label="Total Weddings" value={String(weddings.length)} />
                    <InfoCard
                        label="Live Websites"
                        value={String(summaries.filter((summary) => summary.websiteStatus === 'published').length)}
                    />
                    <InfoCard
                        label="Unpaid"
                        value={String(summaries.filter((summary) => summary.paymentStatus === 'unpaid').length)}
                    />
                    <InfoCard
                        label="Total Guests"
                        value={String(weddings.reduce((total, wedding) => total + wedding.rsvp.guests.length, 0))}
                    />
                    <InfoCard label="RSVP Responses" value={String(rsvpResponses.length)} />
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
                            {packageOptions.map((packageType) => (
                                <option key={packageType} value={packageType}>{getPackageDisplayLabel(packageType)}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span>Payment</span>
                        <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value as PaymentFilter)}>
                            <option value="all">All payment</option>
                            <option value="unpaid">unpaid</option>
                            <option value="paid">paid</option>
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
                                <th>Guests</th>
                                <th>Invited</th>
                                <th>RSVPs</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSummaries.map(({ wedding, guestCount, invitedCount, responseCount, paymentStatus, websiteStatus }) => (
                                <Fragment key={wedding.wedding.slug}>
                                    <tr>
                                        <td>
                                            <strong>{wedding.couple.displayName}</strong>
                                            <small>{wedding.wedding.pageTitle}</small>
                                        </td>
                                        <td><code>{wedding.wedding.slug}</code></td>
                                        <td><StatusBadge tone="plan">{getPackageDisplayLabel(wedding.wedding.packageType)}</StatusBadge></td>
                                        <td><StatusBadge tone={paymentStatus}>{paymentStatus}</StatusBadge></td>
                                        <td><StatusBadge tone={websiteStatus}>{websiteStatus}</StatusBadge></td>
                                        <td>{guestCount}</td>
                                        <td>{invitedCount}</td>
                                        <td>{responseCount}</td>
                                        <td>
                                            <button
                                                className="admin-manage-btn"
                                                type="button"
                                                onClick={() => setExpandedSlug(expandedSlug === wedding.wedding.slug ? null : wedding.wedding.slug)}
                                            >
                                                {expandedSlug === wedding.wedding.slug ? 'Close' : 'Manage'}
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedSlug === wedding.wedding.slug && (
                                        <tr className="admin-manage-row">
                                            <td colSpan={9}>
                                                <div className="admin-manage-panel">
                                                    <div className="admin-manage-section">
                                                        <h3>Change Plan</h3>
                                                        <label className="admin-inline-field">
                                                            <span>Plan</span>
                                                            <select
                                                                value={wedding.wedding.packageType}
                                                                onChange={(event) => changePlan(wedding.wedding.slug, event.target.value as PackageType)}
                                                            >
                                                                {packageOptions.map((packageType) => (
                                                                    <option key={packageType} value={packageType}>
                                                                        {packageDisplayLabels[packageType]}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </label>
                                                    </div>

                                                    <div className="admin-manage-section">
                                                        <h3>Payment Controls</h3>
                                                        <div className="admin-action-grid">
                                                            {paymentStatus === 'unpaid' ? (
                                                                <button type="button" onClick={() => markPaid(wedding.wedding.slug)}>Mark Paid</button>
                                                            ) : (
                                                                <button type="button" onClick={() => markUnpaid(wedding.wedding.slug)}>Mark Unpaid</button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="admin-manage-section">
                                                        <h3>Website Controls</h3>
                                                        <div className="admin-action-grid">
                                                            {websiteStatus === 'draft' && (
                                                                <button
                                                                    type="button"
                                                                    disabled={paymentStatus !== 'paid'}
                                                                    title={paymentStatus !== 'paid' ? 'Mark payment as paid before publishing' : undefined}
                                                                    onClick={() => publishWedding(wedding.wedding.slug)}
                                                                >
                                                                    Publish
                                                                </button>
                                                            )}
                                                            {websiteStatus === 'published' && (
                                                                <>
                                                                    <button type="button" onClick={() => unpublishWedding(wedding.wedding.slug)}>Unpublish</button>
                                                                    <button type="button" onClick={() => suspendWedding(wedding.wedding.slug)}>Suspend</button>
                                                                </>
                                                            )}
                                                            {websiteStatus === 'suspended' && (
                                                                <button type="button" onClick={() => restoreWebsite(wedding.wedding.slug)}>Restore Website</button>
                                                            )}
                                                        </div>
                                                        {websiteStatus === 'draft' && paymentStatus !== 'paid' && (
                                                            <p className="admin-helper-text">Mark payment as paid before publishing.</p>
                                                        )}
                                                    </div>

                                                    <div className="admin-manage-section">
                                                        <h3>Summary</h3>
                                                        <dl className="admin-summary-list">
                                                            <div>
                                                                <dt>Events</dt>
                                                                <dd>{wedding.events.length}</dd>
                                                            </div>
                                                            <div>
                                                                <dt>Families</dt>
                                                                <dd>{guestCount}</dd>
                                                            </div>
                                                            <div>
                                                                <dt>Invited Count</dt>
                                                                <dd>{invitedCount}</dd>
                                                            </div>
                                                            <div>
                                                                <dt>RSVP Responses</dt>
                                                                <dd>{responseCount}</dd>
                                                            </div>
                                                        </dl>
                                                    </div>

                                                    <div className="admin-manage-section">
                                                        <h3>Links</h3>
                                                        <div className="admin-link-stack">
                                                            <a href={`/${wedding.wedding.slug}`} target="_blank" rel="noreferrer">Open Website</a>
                                                            <a href="/dashboard" target="_blank" rel="noreferrer">Open Couple Dashboard</a>
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
                        <p className="admin-empty-state">No weddings match these filters.</p>
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
