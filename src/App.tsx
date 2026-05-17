import { useEffect } from 'react';
import './App.css';
import Admin from './components/Admin';
import Dashboard from './components/Dashboard';
import InviteExperience from './components/InviteExperience';
import {
  defaultWeddingSlug,
  getEventsForGuest,
  getGuestByInviteCode,
  getWeddingBySlug,
  isPersonalizedInvitePath,
  mockAdminWeddingsStorageKey,
  mockDashboardDraftStorageKey,
  type SampleWeddingData,
} from './data/sampleWeddingData';

function NotFound({ title = 'Wedding invite not found', message = 'Please check the invitation link and try again.' }) {
  useEffect(() => {
    document.title = 'Wedding Not Found | Shaadi Nyota';
  }, []);

  return (
    <>
      <div className="desktop-bg-blur" />
      <div className="desktop-vignette" />
      <div className="app-container">
        <div className="phone-canvas">
          <section className="section-wrapper not-found-section">
            <h1>{title}</h1>
            <p>{message}</p>
          </section>
        </div>
      </div>
    </>
  );
}

function App() {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const firstSegment = pathParts[0];
  const isDashboard = firstSegment === 'dashboard';
  const isAdmin = firstSegment === 'admin';
  const isPersonalizedInvite = isPersonalizedInvitePath(window.location.pathname);
  const slug = firstSegment ?? defaultWeddingSlug;
  const savedDraft = window.localStorage.getItem(mockDashboardDraftStorageKey);
  const savedAdminWeddings = window.localStorage.getItem(mockAdminWeddingsStorageKey);
  let draftWedding: SampleWeddingData | undefined;
  let adminWeddings: SampleWeddingData[] = [];

  if (savedDraft) {
    try {
      draftWedding = JSON.parse(savedDraft) as SampleWeddingData;
    } catch {
      draftWedding = undefined;
    }
  }

  if (savedAdminWeddings) {
    try {
      adminWeddings = JSON.parse(savedAdminWeddings) as SampleWeddingData[];
    } catch {
      adminWeddings = [];
    }
  }

  const sampleWedding = getWeddingBySlug(slug);
  const baseData = draftWedding?.wedding.slug === slug ? draftWedding : sampleWedding;
  const adminWedding = adminWeddings.find((wedding) => wedding.wedding.slug === slug);
  const adminFieldSource = adminWedding ?? sampleWedding;
  const data = baseData && adminFieldSource
    ? {
      ...baseData,
      wedding: {
        ...baseData.wedding,
        packageType: adminFieldSource.wedding.packageType,
        status: adminFieldSource.wedding.status,
        paymentStatus: adminFieldSource.wedding.paymentStatus ?? baseData.wedding.paymentStatus,
      },
    }
    : baseData;
  const inviteCode = isPersonalizedInvite ? pathParts[2] : undefined;
  const guest = data && inviteCode ? getGuestByInviteCode(data, inviteCode) : undefined;
  const visibleEvents = data && guest ? getEventsForGuest(data, guest) : undefined;

  useEffect(() => {
    if (!isDashboard && data) {
      document.title = data.wedding.pageTitle;
    }
  }, [data, isDashboard]);

  if (isDashboard) {
    return <Dashboard />;
  }

  if (isAdmin) {
    return <Admin />;
  }

  if (!data) {
    return <NotFound />;
  }

  if (data.wedding.status === 'suspended') {
    return (
      <NotFound
        title="Wedding website unavailable"
        message="This wedding website is currently unavailable."
      />
    );
  }

  if (data.wedding.status !== 'published') {
    return (
      <NotFound
        title="Wedding website not live"
        message="This wedding website is not live yet."
      />
    );
  }

  if (isPersonalizedInvite && !guest) {
    return (
      <NotFound
        title="Invitation link not found"
        message="Please check your personalized invitation link and try again."
      />
    );
  }

  return (
    <InviteExperience
      data={data}
      guest={guest}
      visibleEvents={visibleEvents}
      personalizedInviteMode={Boolean(guest)}
    />
  );
}

export default App;
