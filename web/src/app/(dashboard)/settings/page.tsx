import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: doctor } = await supabase
    .from('doctors')
    .select('name, email')
    .eq('id', user.id)
    .single();

  const displayName = doctor?.name ?? 'Doctor';
  const displayEmail = doctor?.email ?? user.email ?? '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--parchment)' }}>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Account and clinic configuration</p>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '28px 32px' }}>
        <div style={{ maxWidth: 480 }}>
          <div className="pms-card">
            <p className="section-label" style={{ marginBottom: 16 }}>Logged in as</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className="avatar" style={{ width: 52, height: 52, fontSize: 22 }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.224px' }}>{displayName}</p>
                <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginTop: 2 }}>{displayEmail}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
