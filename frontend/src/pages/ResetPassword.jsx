import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { resetPassword } from '../services/authService';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const resetToken = location.state?.reset_token || '';
  const email = location.state?.email || '';

  const [form, setForm]                               = useState({ newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword]               = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
    setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!form.newPassword) {
      errs.newPassword = 'New password is required';
    } else if (form.newPassword.length < 8) {
      errs.newPassword = 'Password must be at least 8 characters long';
    }

    if (!form.confirmPassword) {
      errs.confirmPassword = 'Confirm your new password';
    } else if (form.newPassword !== form.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valErrors = validate();
    if (Object.keys(valErrors).length > 0) {
      setErrors(valErrors);
      return;
    }

    if (!resetToken) {
      setApiError('Your password reset session has expired. Please start again.');
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      await resetPassword({
        reset_token: resetToken,
        new_password: form.newPassword,
      });
      setIsSuccess(true);
    } catch (err) {
      const msg =
        err.response?.data?.detail?.message ||
        err.response?.data?.detail ||
        'Failed to reset password. Please try again.';
      setApiError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  // If session token is missing completely
  if (!resetToken && !isSuccess) {
    return (
      <div className="auth-page">
        <div className="auth-card fade-in" style={{ textAlign: 'center' }}>
          <div className="auth-logo-mark" style={{ background: '#FFF0ED', color: 'var(--rust, #D9534F)' }}>
            <svg viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          </div>
          <h1 className="auth-title" style={{ fontSize: '1.4rem' }}>Session Expired</h1>
          <p className="auth-subtitle">
            Your password reset session has expired or is invalid. Please request a new OTP to continue.
          </p>
          <Link to="/forgot-password" className="btn btn-primary btn-full" style={{ marginTop: 'var(--space-3)' }}>
            Request New OTP
          </Link>
          <p className="auth-footer-text" style={{ marginTop: 'var(--space-4)' }}>
            <Link to="/login">Back to Sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  // Success screen
  if (isSuccess) {
    return (
      <div className="auth-page">
        <div className="auth-card fade-in" style={{ textAlign: 'center' }}>
          <div
            className="auth-logo-mark"
            style={{
              background: '#E8F5E9',
              color: 'var(--forest, #2F6F4E)',
              width: 56,
              height: 56,
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 32, height: 32 }}>
              <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
            </svg>
          </div>

          <h1 className="auth-title" style={{ fontSize: '1.45rem' }}>Password reset successful!</h1>
          <p className="auth-subtitle" style={{ marginBottom: 'var(--space-4)' }}>
            You can now log in with your new password.
          </p>

          <Link
            to="/login"
            id="go-to-login-btn"
            className="btn btn-primary btn-full"
            style={{ textDecoration: 'none' }}
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        {/* Logo mark */}
        <div className="auth-logo-mark">
          <svg viewBox="0 0 24 24">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
          </svg>
        </div>

        <h1 className="auth-title">Create New Password</h1>
        <p className="auth-subtitle">
          {email ? (
            <>Reset password for <strong style={{ color: 'var(--ink)' }}>{email}</strong></>
          ) : (
            'Enter your new password below'
          )}
        </p>

        {apiError && <div className="alert alert-error">{apiError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {/* New Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="new-password">New Password</label>
            <div className="password-input-wrapper">
              <input
                id="new-password"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                autoFocus
                className={`input${errors.newPassword ? ' error' : ''}`}
                value={form.newPassword}
                onChange={handleChange}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(prev => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.newPassword && <p className="form-error">{errors.newPassword}</p>}
          </div>

          {/* Confirm Password */}
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label" htmlFor="confirm-password">Confirm New Password</label>
            <div className="password-input-wrapper">
              <input
                id="confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                className={`input${errors.confirmPassword ? ' error' : ''}`}
                value={form.confirmPassword}
                onChange={handleChange}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword(prev => !prev)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}
          </div>

          <button
            id="reset-password-submit-btn"
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Reset Password'}
          </button>
        </form>

        <div className="divider">or</div>

        <p className="auth-footer-text">
          <Link to="/login">Back to Sign in</Link>
        </p>
      </div>
    </div>
  );
}
