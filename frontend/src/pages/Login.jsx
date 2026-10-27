import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { login } from '../services/authService';
import { useAuth } from '../context/AuthContext';

function validate(form) {
  const errors = {};
  if (!form.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address';
  }
  if (!form.password) errors.password = 'Password is required';
  return errors;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginSuccess, isAuthenticated } = useAuth();

  const [form, setForm]                 = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors]             = useState({});
  const [apiError, setApiError] = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (location.state?.registered) {
      setSuccess('Account created. Sign in to continue.');
    }
  }, [location.state]);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    try {
      const { data } = await login(form);
      loginSuccess(data.access_token, data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.detail?.message ||
        err.response?.data?.detail ||
        'Something went wrong. Please try again.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">

        {/* Logo mark */}
        <div className="auth-logo-mark">
          {/* Leaf / campus icon */}
          <svg viewBox="0 0 24 24">
            <path d="M12 2C7 2 3 6 3 11c0 4 2.5 7.5 6 9l1-4c-2-1-3.5-3-3.5-5 0-3 2.5-5.5 5.5-5.5S17.5 8 17.5 11c0 2-1.5 4-3.5 5l1 4c3.5-1.5 6-5 6-9 0-5-4-9-9-9z"/>
          </svg>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to CampusConnect</p>

        {/* Banners */}
        {success  && <div className="alert alert-success">{success}</div>}
        {apiError && <div className="alert alert-error">{apiError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              name="email"
              type="email"
              placeholder="you@university.edu"
              autoComplete="email"
              className={`input${errors.email ? ' error' : ''}`}
              value={form.email}
              onChange={handleChange}
            />
            {errors.email && <p className="form-error">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" htmlFor="login-password" style={{ marginBottom: 0 }}>Password</label>
              <Link
                to="/forgot-password"
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--forest, #2F6F4E)',
                  textDecoration: 'none',
                }}
              >
                Forgot password?
              </Link>
            </div>
            <div className="password-input-wrapper" style={{ marginTop: 6 }}>
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
                autoComplete="current-password"
                className={`input${errors.password ? ' error' : ''}`}
                value={form.password}
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
            {errors.password && <p className="form-error">{errors.password}</p>}
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Sign in'}
          </button>
        </form>

        <div className="divider">or</div>

        <p className="auth-footer-text">
          Don't have an account?{' '}
          <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
