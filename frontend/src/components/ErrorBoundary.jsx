import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an exception:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          padding: 'var(--space-6)',
          textAlign: 'center',
          backgroundColor: 'var(--bg-light, #fafafa)'
        }}>
          <div className="card" style={{
            maxWidth: 480,
            width: '100%',
            padding: 'var(--space-6)',
            border: '2px solid var(--ink)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '8px 8px 0 var(--ink)',
            backgroundColor: '#fff'
          }}>
            <span style={{ marginBottom: 'var(--space-2)', display: 'block', textAlign: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block' }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <h2 style={{
              fontFamily: 'Fraunces, serif',
              fontWeight: 700,
              fontSize: '1.5rem',
              color: 'var(--ink)',
              marginBottom: 12
            }}>
              Unable to load profile
            </h2>
            <p style={{
              fontSize: '0.9rem',
              color: 'var(--ink-soft)',
              lineHeight: 1.6,
              marginBottom: 'var(--space-4)'
            }}>
              Something went wrong while rendering this page. The profile might be incomplete, or there was a temporary rendering issue.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="btn btn-primary"
              >
                Reload Page
              </button>
              <button
                onClick={() => window.location.href = '/network'}
                className="btn btn-outline"
              >
                Back to Network
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
