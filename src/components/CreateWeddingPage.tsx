import { useEffect, useMemo, useState, type FormEvent } from 'react';
import './CreateWeddingPage.css';
import { useAuth } from '../context/AuthContext';
import {
  getPackageDisplayLabel,
  type PackageType,
} from '../data/sampleWeddingData';
import { activePackageOptions } from '../data/paymentConfig';
import {
  createSlugFromNames,
  createWeddingShell,
  defaultThemeKey,
  getOwnedWeddingForUser,
} from '../lib/weddingOnboarding';

export default function CreateWeddingPage() {
  const { user, loading, isConfigured } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const initialPackageType: PackageType = searchParams.get('plan') === 'rsvp' ? 'rsvp' : 'basic';
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [displayNameEdited, setDisplayNameEdited] = useState(false);
  const [packageType, setPackageType] = useState<PackageType>(initialPackageType);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingWedding, setIsCheckingWedding] = useState(true);
  const [error, setError] = useState('');

  const suggestedDisplayName = useMemo(() => {
    if (!brideName.trim() && !groomName.trim()) return '';
    return [brideName.trim(), groomName.trim()].filter(Boolean).join(' & ');
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
      setError('Website address is required.');
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
      themeKey: defaultThemeKey,
      pageTitle: `${displayName.trim() || suggestedDisplayName} | Shaadi Nyota`,
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
          Start with the basic wedding details. Your website is created as a private draft that you can preview,
          and its public link goes live after payment verification and publishing.
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
            <span>Website address</span>
            <div className="create-wedding-address-field">
              <span aria-hidden="true">shaadinyota.com/</span>
              <input
                value={slug}
                onChange={(event) => handleSlugChange(event.target.value)}
                required
                placeholder="bride-groom"
                aria-describedby="website-address-help"
              />
            </div>
            <small id="website-address-help" className="create-wedding-field-help">
              This will be the shareable link for your wedding website.
            </small>
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

          {error && <div className="create-wedding-message error">{error}</div>}

          <button type="submit" disabled={isSubmitting || !isConfigured}>
            {isSubmitting ? 'Creating...' : 'Create Wedding'}
          </button>
        </form>
      </section>
    </main>
  );
}
