import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { register } from '../services/authService';

const ROLES = [
  { value: 'student', label: 'Student' },
  { value: 'faculty', label: 'Faculty (Requires Admin Approval)' },
  { value: 'club',    label: 'Club'    },
];

function validate(form) {
  const errors = {};
  if (!form.name.trim())               errors.name     = 'Name is required';
  if (!form.email.trim())              errors.email    = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
                                       errors.email    = 'Enter a valid email address';
  if (!form.password)                  errors.password = 'Password is required';
  else if (form.password.length < 8)   errors.password = 'Minimum 8 characters';
  if (!form.role)                      errors.role     = 'Select a role';
  return errors;
}

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm]                 = useState({
    name: '', email: '', password: '', role: 'student',
    // Teacher-specific fields
    department: '', designation: '', employee_id: '', office_location: '', office_hours: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors]             = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading]   = useState(false);

  const isFaculty = form.role === 'faculty';

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
      const payload = {
        name:     form.name,
        email:    form.email,
        password: form.password,
        role:     form.role,
      };
      if (isFaculty) {
        if (form.department)      payload.department      = form.department;
        if (form.designation)     payload.designation     = form.designation;
        if (form.employee_id)     payload.employee_id     = form.employee_id;
        if (form.office_location) payload.office_location = form.office_location;
        if (form.office_hours)    payload.office_hours    = form.office_hours;
      }
      await register(payload);
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      const msg =
        err.response?.data?.detail?.message ||
        err.response?.data?.detail ||
        'Registration failed. Please try again.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-in" style={{ maxWidth: isFaculty ? 520 : 460 }}>

        {/* Logo mark */}
        <div className="auth-logo-mark">
          <svg viewBox="0 0 24 24">
            <path d="M12 2C7 2 3 6 3 11c0 4 2.5 7.5 6 9l1-4c-2-1-3.5-3-3.5-5 0-3 2.5-5.5 5.5-5.5S17.5 8 17.5 11c0 2-1.5 4-3.5 5l1 4c3.5-1.5 6-5 6-9 0-5-4-9-9-9z"/>
          </svg>
        </div>

        <h1 className="auth-title">Create an account</h1>
        <p className="auth-subtitle">Join your campus community</p>

        {apiError && <div className="alert alert-error">{apiError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {/* Full name */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Full name</label>
            <input
              id="reg-name"
              name="name"
              type="text"
              placeholder="Jane Smith"
              autoComplete="name"
              className={`input${errors.name ? ' error' : ''}`}
              value={form.name}
              onChange={handleChange}
            />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email address</label>
            <input
              id="reg-email"
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
          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="reg-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
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

          {/* Role */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-role">I am a</label>
            <select
              id="reg-role"
              name="role"
              className={`input${errors.role ? ' error' : ''}`}
              value={form.role}
              onChange={handleChange}
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {errors.role && <p className="form-error">{errors.role}</p>}
          </div>

          {/* Teacher-specific fields */}
          {isFaculty && (
            <div style={{
              marginTop: 'var(--space-3)',
              padding: 'var(--space-4)',
              background: 'var(--paper-raised)',
              border: '1.5px solid var(--sky)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-3)',
            }}>
              {/* Pending approval notice */}
              <div style={{
                padding: '10px 14px',
                background: 'var(--sky-tint)',
                border: '1px solid var(--sky)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 'var(--space-3)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                fontSize: '0.82rem',
                color: 'var(--ink-soft)',
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </span>
                <span>
                  <strong>Faculty accounts require admin approval</strong> before full access is granted.
                  Your profile and notices will be visible only after verification.
                </span>
              </div>

              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>
                Professional Details (Optional)
              </p>

              <div className="form-group" style={{ marginBottom: 'var(--space-2)' }}>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>Department</label>
                <input
                  name="department"
                  className="input"
                  placeholder="e.g. Computer Engineering"
                  value={form.department}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-2)' }}>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>Designation</label>
                <input
                  name="designation"
                  className="input"
                  placeholder="e.g. Assistant Professor"
                  value={form.designation}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-2)' }}>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>Employee ID</label>
                <input
                  name="employee_id"
                  className="input"
                  placeholder="e.g. MIT-CS-024"
                  value={form.employee_id}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-2)' }}>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>Office Location</label>
                <input
                  name="office_location"
                  className="input"
                  placeholder="e.g. Block B, Room 302"
                  value={form.office_location}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>Office Hours</label>
                <input
                  name="office_hours"
                  className="input"
                  placeholder="e.g. Mon–Fri 2:00 PM – 4:00 PM"
                  value={form.office_hours}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}

          <button
            id="register-submit-btn"
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
            style={{ marginTop: isFaculty ? 0 : 'var(--space-1)' }}
          >
            {loading ? <span className="spinner" /> : 'Create account'}
          </button>
        </form>

        <div className="divider">or</div>

        <p className="auth-footer-text">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
