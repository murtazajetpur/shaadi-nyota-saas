import { useEffect, useState, type FormEvent } from 'react';
import './AuthPage.css';
import { useAuth } from '../context/AuthContext';

interface AuthPageProps {
  mode: 'login' | 'signup';
}

export default function AuthPage({ mode }: AuthPageProps) {
  const { isConfigured, signIn, signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const isSignup = mode === 'signup';

  useEffect(() => {
    document.title = `${isSignup ? 'Sign Up' : 'Login'} | Shaadi Nyota`;
  }, [isSignup]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsSubmitting(true);

    try {
      const result = isSignup
        ? await signUp(fullName.trim(), email.trim(), password)
        : await signIn(email.trim(), password);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.needsEmailConfirmation) {
        setNotice('Account created. Please confirm your email, then sign in.');
        return;
      }

      // DashboardRoute owns the wedding lookup and safely handles accounts
      // that have not created a wedding yet. Avoid blocking login on a second query.
      window.location.assign(isSignup ? '/create-wedding' : '/dashboard');
    } catch (submitError) {
      console.error('Authentication submission failed', submitError);
      setError(submitError instanceof Error
        ? submitError.message
        : 'Could not sign in. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="auth-eyebrow">Shaadi Nyota</p>
        <h1>{isSignup ? 'Create your couple account' : 'Sign in to your Shaadi Nyota account'}</h1>
        <p className="auth-copy">
          {isSignup
            ? 'Set up access to your Shaadi Nyota couple dashboard.'
            : 'Continue to your couple dashboard.'}
        </p>

        {!isConfigured && (
          <div className="auth-message warning">
            Supabase env vars are missing. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env`.
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignup && (
            <label>
              <span>Full name</span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                placeholder="Your name"
                autoComplete="name"
              />
            </label>
          )}
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              placeholder="Password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              minLength={6}
            />
          </label>

          {error && <div className="auth-message error">{error}</div>}
          {notice && <div className="auth-message success">{notice}</div>}

          <button type="submit" disabled={isSubmitting || !isConfigured}>
            {isSubmitting ? 'Please wait...' : isSignup ? 'Create Account' : 'Sign In'}
          </button>
          {!isSignup && (
            <a className="auth-forgot-link" href="/forgot-password">Forgot password?</a>
          )}
        </form>

        <p className="auth-switch">
          {isSignup ? 'Already have an account?' : 'Need an account?'}{' '}
          <a href={isSignup ? '/login' : '/signup'}>{isSignup ? 'Sign in' : 'Sign up'}</a>
        </p>
      </section>
    </main>
  );
}
