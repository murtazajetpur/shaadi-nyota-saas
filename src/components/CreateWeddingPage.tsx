import { useEffect, useMemo, useState, type FormEvent } from 'react';
import './CreateWeddingPage.css';
import { useAuth } from '../context/AuthContext';
import {
  getPackageDisplayLabel,
  type PackageType,
} from '../data/sampleWeddingData';
import { activePackageOptions } from '../data/paymentConfig';
import { normalizeTemplateKey, templatePresets, type TemplateKey } from '../data/templatePresets';
import {
  createSlugFromNames,
  createWeddingShell,
  defaultThemeKey,
  getOwnedWeddingForUser,
} from '../lib/weddingOnboarding';

const templateOptions: TemplateKey[] = ['envelope-opening', 'scroll-opening', 'palace-door-opening'];

export default function CreateWeddingPage() {
  const { user, loading, isConfigured } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const initialThemeKey = normalizeTemplateKey(searchParams.get('theme') ?? undefined);
  const initialPackageType: PackageType = searchParams.get('plan') === 'rsvp' ? 'rsvp' : 'basic';
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [displayNameEdited, setDisplayNameEdited] = useState(false);
  const [themeKey, setThemeKey] = useState<string>(initialThemeKey || defaultThemeKey);
  const [packageType, setPackageType] = useState<PackageType>(initialPackageType);
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
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'auto';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
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
    if (!packageType) {
      setError('Select a package.');
      return;
    }

    setIsSubmitting(true);
    const result = await createWeddingShell({
      ownerId: user.id,
      brideName: brideName.trim(),
      groomName: groomName.trim(),
      displayName: displayName.trim() || suggestedDisplayName,
      slug: slug.trim(),
      packageType,
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
        <h1>Create your wedding website</h1>
        <p className="create-wedding-copy">
          Start with the basic wedding details. You can add events, guests, and RSVP settings from your dashboard.
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

          <div className="package-selection">
            <div>
              <span>Package</span>
              <p>Choose the plan for this wedding. Admin can adjust it later if needed.</p>
            </div>
            <div className="package-options">
              {activePackageOptions.map((option) => (
                <label
                  className={`package-option ${packageType === option.value ? 'selected' : ''}`}
                  key={option.value}
                >
                  <input
                    type="radio"
                    name="packageType"
                    value={option.value}
                    checked={packageType === option.value}
                    onChange={() => setPackageType(option.value)}
                  />
                  <strong>{getPackageDisplayLabel(option.value)}</strong>
                  <small>{option.priceLabel}</small>
                  <small>{option.summary}</small>
                </label>
              ))}
            </div>
          </div>

          <div className="package-selection">
            <div>
              <span>Template</span>
              <p>Choose a starting point. You can customize sections, visuals, music, and events later.</p>
            </div>
            <div className="package-options theme-options">
              {templateOptions.map((option) => {
                const preset = templatePresets[option];
                return (
                <label
                  className={`package-option ${themeKey === option ? 'selected' : ''}`}
                  key={option}
                >
                  <input
                    type="radio"
                    name="themeKey"
                    value={option}
                    checked={themeKey === option}
                    onChange={() => setThemeKey(option)}
                  />
                  <strong>{preset.displayName}</strong>
                  <small>{preset.description}</small>
                </label>
              )})}
            </div>
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
