import { login } from '@/lib/auth-actions';

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--parchment)' }}>
      <div style={{ width: '100%', maxWidth: 380, padding: '0 24px' }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 52, height: 52, background: 'var(--nav-bg)', borderRadius: 'var(--r-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
              <circle cx="18" cy="17" r="3" />
              <path d="M15 17h-3" />
            </svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.374px', lineHeight: 1.1, margin: 0 }}>Clinic PMS</h1>
          <p style={{ fontSize: 15, color: 'var(--ink-muted)', marginTop: 6, letterSpacing: '-0.224px' }}>Practice Management System</p>
        </div>

        {/* Card */}
        <div className="pms-card" style={{ padding: 32 }}>
          {error && (
            <div className="error-msg" style={{ marginBottom: 20 }}>
              {decodeURIComponent(error)}
            </div>
          )}

          <form action={login} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label htmlFor="email" className="field-label">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="doctor@clinic.com"
                className="pms-input"
              />
            </div>

            <div>
              <label htmlFor="password" className="field-label">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="pms-input"
              />
            </div>

            <button
              type="submit"
              className="btn-pms btn-pms-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', marginTop: 4, fontSize: 15 }}
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
