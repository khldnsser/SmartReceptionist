import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import PatientSearch from '@/features/patients/PatientSearch';
import NewPatientButton from '@/features/patients/NewPatientButton';
import RealtimeRefresher from '@/components/RealtimeRefresher';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  booked:    { cls: 'badge-blue',   label: 'booked' },
  completed: { cls: 'badge-gray',   label: 'completed' },
  cancelled: { cls: 'badge-red',    label: 'cancelled' },
  missed:    { cls: 'badge-orange', label: 'missed' },
};

export default async function PatientsPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdminClient();

  let query = admin
    .from('clients')
    .select('id, name, email, phone, wa_id, created_at, appointments(booking_status, appointment_date)')
    .order('name');

  if (q) {
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data: clients } = await query;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--parchment)' }}>
      <RealtimeRefresher table="clients" />
      <RealtimeRefresher table="appointments" />

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Patients</h1>
          <p className="page-subtitle">{clients?.length ?? 0} total</p>
        </div>
        <NewPatientButton />
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '28px 32px', overflow: 'auto' }}>
        {/* Search */}
        <div style={{ marginBottom: 20 }}>
          <Suspense>
            <PatientSearch defaultValue={q} />
          </Suspense>
        </div>

        {/* Table */}
        <div className="pms-table-wrap">
          {!clients || clients.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 14 }}>
              {q ? `No patients match "${q}"` : 'No patients yet'}
            </div>
          ) : (
            <table className="pms-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Phone</th>
                  <th>WhatsApp ID</th>
                  <th>Last appointment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const appts = (client.appointments as { booking_status: string; appointment_date: string }[] | null) ?? [];
                  const sorted = [...appts].sort(
                    (a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime(),
                  );
                  const latest = sorted[0];
                  const badge = latest ? (STATUS_BADGE[latest.booking_status] ?? null) : null;

                  return (
                    <tr key={client.id} style={{ cursor: 'pointer' }}>
                      <td>
                        <Link href={`/patients/${client.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                          <div className="avatar" style={{ width: 34, height: 34, fontSize: 13 }}>
                            {(client.name ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 14 }}>
                              {client.name ?? <span style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>Unnamed</span>}
                            </p>
                            {client.email && <p style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{client.email}</p>}
                          </div>
                        </Link>
                      </td>
                      <td style={{ color: 'var(--ink-muted)' }}>{client.phone ?? '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--ink-faint)' }}>{client.wa_id}</td>
                      <td style={{ color: 'var(--ink-muted)' }}>
                        {latest
                          ? new Date(latest.appointment_date).toLocaleDateString('en-US', {
                              timeZone: 'Asia/Beirut', month: 'short', day: 'numeric', year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td>
                        {badge ? (
                          <span className={`badge ${badge.cls}`}>{badge.label}</span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>no appointments</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
