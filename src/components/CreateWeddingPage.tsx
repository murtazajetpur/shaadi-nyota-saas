import { useEffect, useMemo, useState, type FormEvent } from 'react';
import './CreateWeddingPage.css';
import { useAuth } from '../context/AuthContext';
import {
  createSlugFromNames,
  createWeddingShell,
  defaultThemeKey,
  getOwnedWeddingForUser,
} from '../lib/weddingOnboarding';

export default function CreateWeddingPage() {
  const { user, loading, isConfigured } = useAuth();
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [displayNameEdited, setDisplayNameEdited] = useState(false);
  const [themeKey, setThemeKey] = useState(defaultThemeKey);
  const [pageTitle, setPageTitle] = useState('');
  const [pageTitleEdited, setPageTitleEdited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingWedding, setIsCheckingWedding] = useState(true);
  const [error, setError] = useState('');

  const suggestedDisplayName = useMemo(() => {
    if (!brideName.trim() && !groomName.trim()) return '';
    return [groomName.trim(), brideName.trim()].filter(Boolean).join(' & ');
  }, [brideName, groomName]);

  useEffect(() => {
    document.title = 'Create Wedding | Shaadi Nyota';
  }, []);

  useEffect(() => {
    if (!isConfigured || loading) {
      setIsCheckingWedding(false);
      return;
    }

    if (!user) {
      window.location.href = '/login';
      return;
    }

    getOwnedWeddingForUser(user.id).then(({ wedding }) => {
      if (wedding) {
        window.location.href = '/dashboard';
        return;
      }
      setIsCheckingWedding(false);
    });
  }, [isConfigured, loading, user]);

  useEffect(() => {
    if (!displayNameEdited) {
      setDisplayName(suggestedDisplayName);
    }
  }, [displayNameEdited, suggestedDisplayName]);

  useEffect(() => {
    if (!slugEdited) {
      setSlug(createSlugFromNames(brideName, groomName));
    }
  }, [brideName, groomName, slugEdited]);

  useEffect(() => {
    if (!pageTitleEdited) {
      setPageTitle(suggestedDisplayName ? `${suggestedDisplayName} | Shaadi Nyota` : '');
    }
  }, [pageTitleEdited, suggestedDisplayName]);

  const handleSlugChange = (value: string) => {
    setSlugEdited(true);
    setSlug(createSlugFromNames(value, ''));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!isConfigured) {
      setError('Supabase is not configured. Add your env vars before creating a wedding.');
      return;
    }
    if (!user) {
      window.location.href = '/login';
      return;
    }
    if (!brideName.trim()) {
      setError('Bride name is required.');
      return;
    }
    if (!groomName.trim()) {
      setError('Groom name is required.');
      return;
    }
    if (!slug.trim()) {
      setError('Slug is required.');
      return;
    }

    setIsSubmitting(true);
    const result = await createWeddingShell({
      ownerId: user.id,
      brideName: brideName.trim(),
      groomName: groomName.trim(),
      displayName: displayName.trim() || suggestedDisplayName,
      slug: slug.trim(),
      themeKey: themeKey.trim() || defaultThemeKey,
      pageTitle: pageTitle.trim() || `${displayName.trim() || suggestedDisplayName} | Shaadi Nyota`,
    });
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    window.location.href = '/dashboard';
  };

  if (loading || isCheckingWedding) {
    return (
      <main className="create-wedding-page">
        <section className="create-wedding-card">
          <p className="create-wedding-eyebrow">Shaadi Nyota</p>
          <h1>Checking your account</h1>
          <p>Please wait while we prepare your wedding workspace.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="create-wedding-page">
      <section className="create-wedding-card">
        <p className="create-wedding-eyebrow">Shaadi Nyota</p>
        <h1>Create your wedding</h1>
        <p className="create-wedding-copy">
          Start with the basic wedding details. Guest lists, RSVP, and admin data remain in the mock workflow for now.
        </p>

        {!isConfigured && (
          <div className="create-wedding-message error">
            Supabase env vars are missing. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env`.
          </div>
        )}

        <form className="create-wedding-form" onSubmit={handleSubmit}>
          <div className="create-wedding-grid">
            <label>
              <span>Bride name</span>
              <input value={brideName} onChange={(event) => setBrideName(event.target.value)} required />
            </label>
            <label>
              <span>Groom name</span>
              <input value={groomName} onChange={(event) => setGroomName(event.target.value)} required />
            </label>
          </div>

          <label>
            <span>Display name</span>
            <input
              value={displayName}
              onChange={(event) => {
                setDisplayNameEdited(true);
                setDisplayName(event.target.value);
              }}
              placeholder="Ali & Sara"
            />
          </label>

          <label>
            <span>Slug</span>
            <input
              value={slug}
              onChange={(event) => handleSlugChange(event.target.value)}
              required
              placeholder="ali-sara"
            />
          </label>

          <div className="create-wedding-grid">
            <label>
              <span>Theme key</span>
              <input value={themeKey} onChange={(event) => setThemeKey(event.target.value)} />
            </label>
            <label>
              <span>Package</span>
              <input value="Nyota Classic" readOnly />
            </label>
          </div>

          <label>
            <span>Page title</span>
            <input
              value={pageTitle}
              onChange={(event) => {
                setPageTitleEdited(true);
                setPageTitle(event.target.value);
              }}
              placeholder="Ali & Sara | Shaadi Nyota"
            />
          </label>

          {error && <div className="create-wedding-message error">{error}</div>}

          <button type="submit" disabled={isSubmitting || !isConfigured}>
            {isSubmitting ? 'Creating...' : 'Create Wedding'}
          </button>
        </form>
      </section>
    </main>
  );
}
