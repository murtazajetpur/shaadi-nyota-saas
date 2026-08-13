import { useEffect, useState, type FormEvent } from 'react';
import './AuthPage.css';
import { useAuth } from '../context/AuthContext';

interface PasswordRecoveryPageProps {
  mode: 'request' | 'reset';
}

const PASSWORD_MIN_LENGTH = 8;

export default function PasswordRecoveryPage({ mode }: PasswordRecoveryPageProps) {
  const {
    isConfigured,
    isPasswordRecovery,
    loading,
    requestPasswordReset,
    session,
    updatePassword,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestComplete, setRequestComplete] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [error, setError] = useState('');

  const isResetMode = mode === 'reset';

  useEffect(() => {
    document.title = `${isResetMode ? 'Reset Password' : 'Forgot Password'} | Shaadi Nyota`;
  }, [isResetMode]);

  const handleRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await requestPasswordReset(email.trim());
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setRequestComplete(true);
  };

  const handleReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Use at least ${PASSWORD_MIN_LENGTH} characters for your new password.`);
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const result = await updatePassword(password);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setResetComplete(true);
    setPassword('');
    setConfirmPassword('');
  };

  const renderContent = () => {
    if (!isConfigured) {
      return (
        <div className="auth-message warning">
          Supabase env vars are missing. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env`.
        </div>
      );
    }

    if (!isResetMode) {
      if (requestComplete) {
        return (
          <div className="auth-message success" role="status">
            If an account exists for that email, a password reset link has been sent. Please check your inbox and spam folder.
          </div>
        );
      }

      return (
        <form className="auth-form" onSubmit={handleRequest}>
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
          {error && <div className="auth-message error" role="alert">{error}</div>}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      );
    }

    if (loading && (!session || !isPasswordRecovery)) {
      return <div className="auth-message warning">Validating your password reset link...</div>;
    }

    if (resetComplete) {
      return (
        <div className="auth-message success" role="status">
          Your password has been updated. You can now sign in with your new password.
        </div>
      );
    }

    if (!session || !isPasswordRecovery) {
      return (
        <div className="auth-message error" role="alert">
          This password reset link is invalid or has expired. Please request a new link.
        </div>
      );
    }

    return (
      <form className="auth-form" onSubmit={handleReset}>
        <label>
          <span>New password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={PASSWORD_MIN_LENGTH}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        </label>
        <label>
          <span>Confirm new password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={PASSWORD_MIN_LENGTH}
            placeholder="Repeat your new password"
            autoComplete="new-password"
          />
        </label>
        {error && <div className="auth-message error" role="alert">{error}</div>}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    );
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="auth-eyebrow">Shaadi Nyota</p>
        <h1>{isResetMode ? 'Choose a new password' : 'Reset your password'}</h1>
        <p className="auth-copy">
          {isResetMode
            ? 'Enter a new password for your Shaadi Nyota account.'
            : 'Enter your account email and we will send you a secure reset link.'}
        </p>

        {renderContent()}

        <p className="auth-switch">
          {isResetMode && !resetComplete ? 'Need a new reset link? ' : 'Return to your account. '}
          <a href={isResetMode && !resetComplete ? '/forgot-password' : '/login'}>
            {isResetMode && !resetComplete ? 'Request another' : 'Sign in'}
          </a>
        </p>
      </section>
    </main>
  );
}