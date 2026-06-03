import { useEffect, useState, type ReactNode } from 'react';
import './App.css';
import Admin from './components/Admin';
import AuthPage from './components/AuthPage';
import CreateWeddingPage from './components/CreateWeddingPage';
import Dashboard from './components/Dashboard';
import InviteExperience from './components/InviteExperience';
import MarketingHome from './components/MarketingHome';
import WeddingDesignPreviews from './components/WeddingDesignPreviews';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  defaultWeddingSlug,
  getEventsForGuest,
  getGuestByInviteCode,
  getWeddingBySlug,
  isPersonalizedInvitePath,
  mockAdminWeddingsStorageKey,
  mockDashboardDraftStorageKey,
  type SampleWeddingData,
  type WeddingEvent,
  type WeddingGuest,
} from './data/sampleWeddingData';
import {
  buildWeddingShellFromRow,
  getOwnedWeddingForUser,
  type OwnedWeddingRow,
} from './lib/weddingOnboarding';
import {
  loadSupabasePersonalizedInvite,
  loadSupabaseWeddingBundle,
  loadSupabaseWeddingBySlug,
} from './lib/supabaseWeddingData';
import { isSupabaseConfigured } from './lib/supabaseClient';

const templateDemoRoutes: Record<string, { slug: string; inviteCode: string; title: string }> = {
  'classic-envelope': {
    slug: 'mahesh-neha',
    inviteCode: 'lvpehh',
    title: 'Classic Envelope Demo',
  },
  'scroll-opening': {
    slug: 'sahil-ruhana',
    inviteCode: '0gcbvj',
    title: 'Scroll Opening Demo',
  },
  'palace-door-opening': {
    slug: 'john-melissa',
    inviteCode: '4jz5bt',
    title: 'Palace Door Opening Demo',
  },
};

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

function useNoindexPage(title: string) {
  useEffect(() => {
    document.title = `${title} | Shaadi Nyota`;
    const existingRobotsMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previousRobotsContent = existingRobotsMeta?.getAttribute('content') ?? null;
    const robotsMeta = existingRobotsMeta ?? document.createElement('meta');
    robotsMeta.setAttribute('name', 'robots');
    robotsMeta.setAttribute('content', 'noindex,nofollow');
    if (!existingRobotsMeta) document.head.appendChild(robotsMeta);

    return () => {
      if (existingRobotsMeta) {
        if (previousRobotsContent) {
          existingRobotsMeta.setAttribute('content', previousRobotsContent);
        } else {
          existingRobotsMeta.removeAttribute('content');
        }
      } else {
        robotsMeta.remove();
      }
    };
  }, [title]);
}

function RedirectToLogin() {
  useEffect(() => {
    window.location.href = '/login';
  }, []);

  return (
    <AccessMessage
      title="Login required"
      message="Redirecting you to login..."
    />
  );
}

function TemplateDemoRoute({ demoKey }: { demoKey?: string }) {
  const demo = demoKey ? templateDemoRoutes[demoKey] : undefined;
  const [isLoadingInvite, setIsLoadingInvite] = useState(Boolean(demo && isSupabaseConfigured));
  const [supabaseData, setSupabaseData] = useState<{
    data: SampleWeddingData;
    weddingId?: string;
    guest?: WeddingGuest;
    visibleEvents?: WeddingEvent[];
  } | null>(null);
  const [supabaseError, setSupabaseError] = useState('');

  useNoindexPage(demo?.title ?? 'Template Demo');

  useEffect(() => {
    if (!demo) return;

    const preventContextMenu = (event: MouseEvent) => event.preventDefault();
    const preventDragStart = (event: DragEvent) => {
      if ((event.target as HTMLElement | null)?.tagName === 'IMG') {
        event.preventDefault();
      }
    };

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('dragstart', preventDragStart);
    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('dragstart', preventDragStart);
    };
  }, [demo]);

  useEffect(() => {
    let mounted = true;

    const loadInvite = async () => {
      if (!demo || !isSupabaseConfigured) {
        setIsLoadingInvite(false);
        return;
      }

      setIsLoadingInvite(true);
      const result = await loadSupabasePersonalizedInvite(demo.slug, demo.inviteCode);
      if (!mounted) return;

      if (result.error) {
        console.error('Template demo load failed:', result.error);
        setSupabaseError(result.error);
        setSupabaseData(null);
      } else if (result.wedding) {
        setSupabaseError('');
        setSupabaseData({
          data: result.wedding,
          weddingId: result.weddingId,
          guest: result.guest,
          visibleEvents: result.visibleEvents,
        });
      } else {
        setSupabaseError('Template demo not found.');
        setSupabaseData(null);
      }

      setIsLoadingInvite(false);
    };

    void loadInvite();

    return () => {
      mounted = false;
    };
  }, [demo]);

  if (!demo) {
    return (
      <NotFound
        title="Template preview not found"
        message="Please choose one of the available Shaadi Nyota template previews."
      />
    );
  }

  if (isLoadingInvite) {
    return <AccessMessage title="Loading template demo" message="Please wait while we load this protected preview." />;
  }

  const fallbackData = getWeddingBySlug(demo.slug);
  const data = supabaseData?.data ?? fallbackData;
  const guest = supabaseData?.guest ?? (data ? getGuestByInviteCode(data, demo.inviteCode) : undefined);
  const visibleEvents = supabaseData?.visibleEvents ?? (data && guest ? getEventsForGuest(data, guest) : undefined);

  if (!data) {
    return (
      <NotFound
        title="Template demo unavailable"
        message={supabaseError || 'This template preview could not be loaded. Please try again later.'}
      />
    );
  }

  if (data.wedding.status === 'suspended') {
    return (
      <NotFound
        title="Template demo unavailable"
        message="This template preview is currently unavailable."
      />
    );
  }

  if (!guest) {
    return (
      <NotFound
        title="Template invite not found"
        message="This protected template preview requires its demo invite record."
      />
    );
  }

  return (
    <InviteExperience
      data={data}
      weddingId={supabaseData?.weddingId}
      guest={guest}
      visibleEvents={visibleEvents}
      personalizedInviteMode
      demoPreviewMode
    />
  );
}

function AccessMessage({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="auth-eyebrow">Shaadi Nyota</p>
        <h1>{title}</h1>
        <p className="auth-copy">{message}</p>
        {action}
      </section>
    </main>
  );
}

function DashboardRoute() {
  const { user, loading, isConfigured } = useAuth();
  const userId = user?.id;
  const [ownedWedding, setOwnedWedding] = useState<OwnedWeddingRow | null>(null);
  const [dashboardWedding, setDashboardWedding] = useState<SampleWeddingData | null>(null);
  const [isCheckingWedding, setIsCheckingWedding] = useState(false);
  const [weddingError, setWeddingError] = useState('');

  useEffect(() => {
    if (!isConfigured || loading || !userId) return;

    setIsCheckingWedding(true);
    getOwnedWeddingForUser(userId).then(async ({ wedding, error }) => {
      setOwnedWedding(wedding);
      if (error || !wedding) {
        setWeddingError(error ?? '');
        setDashboardWedding(null);
        setIsCheckingWedding(false);
        return;
      }

      const bundle = await loadSupabaseWeddingBundle(wedding.id, { includeGuests: true });
      setDashboardWedding(bundle.wedding ?? buildWeddingShellFromRow(wedding));
      setWeddingError(bundle.error ?? '');
      setIsCheckingWedding(false);
    });
  }, [isConfigured, loading, userId]);

  if (!isConfigured) {
    return <Dashboard authNotice="Supabase env vars are missing, so the dashboard is running with development fallback data." />;
  }

  if (loading || isCheckingWedding) {
    return <AccessMessage title="Checking wedding" message="Please wait while we load your wedding workspace." />;
  }

  if (!user) {
    return <RedirectToLogin />;
  }

  if (weddingError) {
    return <AccessMessage title="Unable to load wedding" message={weddingError} />;
  }

  if (!ownedWedding) {
    return (
      <AccessMessage
        title="Create your wedding"
        message="You do not have a wedding workspace yet. Create one to start setting up your Shaadi Nyota invite."
        action={<a className="auth-link-button" href="/create-wedding">Create your wedding</a>}
      />
    );
  }

  return <Dashboard initialWedding={dashboardWedding ?? buildWeddingShellFromRow(ownedWedding)} supabaseWeddingId={ownedWedding.id} />;
}

function AdminWeddingDetailRoute({ weddingId }: { weddingId: string }) {
  const [wedding, setWedding] = useState<SampleWeddingData | null>(null);
  const [isLoadingWedding, setIsLoadingWedding] = useState(true);
  const [weddingError, setWeddingError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadWedding = async () => {
      setIsLoadingWedding(true);
      const result = await loadSupabaseWeddingBundle(weddingId, { includeGuests: true });
      if (!mounted) return;

      if (result.error || !result.wedding) {
        console.warn('Could not load admin wedding detail', result.error);
        setWedding(null);
        setWeddingError(result.error || 'Wedding not found.');
      } else {
        setWedding(result.wedding);
        setWeddingError('');
      }
      setIsLoadingWedding(false);
    };

    void loadWedding();

    return () => {
      mounted = false;
    };
  }, [weddingId]);

  if (isLoadingWedding) {
    return <AccessMessage title="Loading wedding" message="Please wait while we load this wedding for admin editing." />;
  }

  if (weddingError || !wedding) {
    return (
      <AccessMessage
        title="Wedding not found"
        message={weddingError ? 'Could not load this wedding. Check the wedding ID and admin RLS policies.' : 'Wedding not found.'}
        action={<a className="auth-link-button" href="/admin">Back to Admin</a>}
      />
    );
  }

  return (
    <Dashboard
      mode="admin"
      title="Admin View"
      eyebrow="Shaadi Nyota Admin"
      authNotice="You are editing this wedding as an admin."
      initialWedding={wedding}
      supabaseWeddingId={weddingId}
    />
  );
}

function PublicInviteRoute({
  slug,
  inviteCode,
  isPersonalizedInvite,
}: {
  slug: string;
  inviteCode?: string;
  isPersonalizedInvite: boolean;
}) {
  const [isLoadingInvite, setIsLoadingInvite] = useState(isSupabaseConfigured);
  const [supabaseData, setSupabaseData] = useState<{
    data: SampleWeddingData;
    weddingId?: string;
    guest?: WeddingGuest;
    visibleEvents?: WeddingEvent[];
  } | null>(null);
  const [supabaseError, setSupabaseError] = useState('');

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

  useEffect(() => {
    let mounted = true;

    const loadInvite = async () => {
      if (!isSupabaseConfigured) {
        setIsLoadingInvite(false);
        return;
      }

      setIsLoadingInvite(true);
      const result = isPersonalizedInvite && inviteCode
        ? await loadSupabasePersonalizedInvite(slug, inviteCode)
        : await loadSupabaseWeddingBySlug(slug, { includeGuests: false });

      if (!mounted) return;

      if (result.error) {
        console.error('Public invite load failed:', result.error);
        setSupabaseError(result.error);
      } else {
        setSupabaseError('');
      }

      if (result.wedding) {
        const personalizedResult = result as {
          guest?: WeddingGuest;
          visibleEvents?: WeddingEvent[];
        };
        setSupabaseData({
          data: result.wedding,
          weddingId: result.weddingId,
          guest: personalizedResult.guest,
          visibleEvents: personalizedResult.visibleEvents,
        });
      } else {
        setSupabaseData(null);
      }

      setIsLoadingInvite(false);
    };

    void loadInvite();

    return () => {
      mounted = false;
    };
  }, [inviteCode, isPersonalizedInvite, slug]);

  const sampleWedding = getWeddingBySlug(slug);
  const baseData = draftWedding?.wedding.slug === slug ? draftWedding : sampleWedding;
  const adminWedding = adminWeddings.find((wedding) => wedding.wedding.slug === slug);
  const adminFieldSource = adminWedding ?? sampleWedding;
  const fallbackData = baseData && adminFieldSource
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

  const data = supabaseData?.data ?? fallbackData;
  const guest = supabaseData?.guest ?? (data && inviteCode ? getGuestByInviteCode(data, inviteCode) : undefined);
  const visibleEvents = supabaseData?.visibleEvents ?? (data && guest ? getEventsForGuest(data, guest) : undefined);

  useEffect(() => {
    if (data) {
      document.title = data.wedding.pageTitle;
    }
  }, [data]);

  if (isLoadingInvite) {
    return <AccessMessage title="Loading invitation" message="Please wait while we load this wedding website." />;
  }

  if (supabaseError && !fallbackData) {
    return <NotFound title="Unable to load invitation" message={supabaseError} />;
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
        title="Wedding website not live yet"
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
      weddingId={supabaseData?.weddingId}
      guest={guest}
      visibleEvents={visibleEvents}
      personalizedInviteMode={Boolean(guest)}
    />
  );
}

function AppRoutes() {
  const { user, profile, loading, profileLoading, profileError, isConfigured, signOut, refreshProfile } = useAuth();
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const firstSegment = pathParts[0];
  const secondSegment = pathParts[1];
  const isDashboard = firstSegment === 'dashboard';
  const isAdmin = firstSegment === 'admin';
  const isLogin = firstSegment === 'login';
  const isSignup = firstSegment === 'signup';
  const isCreateWedding = firstSegment === 'create-wedding';
  const isTemplateDemo = firstSegment === 'templates';
  const isMarketingHome = !firstSegment;
  const isPersonalizedInvite = isPersonalizedInvitePath(window.location.pathname);
  const slug = firstSegment ?? defaultWeddingSlug;
  const inviteCode = isPersonalizedInvite ? pathParts[2] : undefined;

  if (isMarketingHome) {
    return <MarketingHome />;
  }

  if (isLogin) {
    return <AuthPage mode="login" />;
  }

  if (isSignup) {
    return <AuthPage mode="signup" />;
  }

  if (isCreateWedding) {
    return <CreateWeddingPage />;
  }

  if (isTemplateDemo) {
    return <TemplateDemoRoute demoKey={secondSegment} />;
  }

  if (firstSegment === 'mahesh-neha' && secondSegment === 'preview') {
    return <WeddingDesignPreviews variationId={pathParts[2]} />;
  }

  if (isDashboard) {
    return <DashboardRoute />;
  }

  if (isAdmin) {
    if (!isConfigured) {
      return <Admin authNotice="Supabase env vars are missing, so admin is running with development fallback data." />;
    }
    if (loading || profileLoading) {
      return <AccessMessage title="Checking admin access" message="Please wait while we verify your account." />;
    }
    if (!user) {
      return <RedirectToLogin />;
    }
    if (profileError) {
      return (
        <AccessMessage
          title="Unable to verify admin access"
          message={`Could not read your profile: ${profileError}`}
          action={<button className="auth-link-button" type="button" onClick={() => {
            void refreshProfile();
          }}>Retry Profile Check</button>}
        />
      );
    }
    if (!profile) {
      return (
        <AccessMessage
          title="Profile not ready"
          message="Your profile row was not found yet. If you just signed up, wait a moment and retry. The profiles table must also allow users to read their own profile."
          action={<button className="auth-link-button" type="button" onClick={() => {
            void refreshProfile();
          }}>Retry Profile Check</button>}
        />
      );
    }
    if (profile?.role !== 'admin') {
      return (
        <AccessMessage
          title="Access denied"
          message="Your account does not have admin access."
          action={<button className="auth-link-button" type="button" onClick={async () => {
            await signOut();
            window.location.href = '/login';
          }}>Sign Out</button>}
        />
      );
    }
    if (secondSegment === 'weddings') {
      const weddingId = pathParts[2];
      if (!weddingId) {
        return (
          <AccessMessage
            title="Wedding not found"
            message="Please choose a wedding from the admin panel."
            action={<a className="auth-link-button" href="/admin">Back to Admin</a>}
          />
        );
      }
      return <AdminWeddingDetailRoute weddingId={weddingId} />;
    }
    return <Admin />;
  }

  return <PublicInviteRoute slug={slug} inviteCode={inviteCode} isPersonalizedInvite={isPersonalizedInvite} />;
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
