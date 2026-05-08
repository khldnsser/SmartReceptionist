import { createClient, createAdminClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import ProfileEditor from '@/features/patients/ProfileEditor';
import VisitSummaryPanel from '@/features/visit-summaries/VisitSummaryPanel';
import TestResultsPanel from '@/features/test-results/TestResultsPanel';
import AppointmentsWithSummary from '@/features/medical-record/AppointmentsWithSummary';
import MedicalRecordPanel from '@/features/medical-record/MedicalRecordPanel';
import VitalSignsPanel from '@/features/medical-record/VitalSignsPanel';
import TimelinePanel from '@/features/medical-record/TimelinePanel';
import MessagePatientButton from '@/features/patients/MessagePatientButton';
import RealtimeRefresher from '@/components/RealtimeRefresher';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

type Tab = 'profile' | 'medical' | 'vitals' | 'appointments' | 'summaries' | 'results' | 'timeline';

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export default async function PatientProfilePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab = 'timeline' } = await searchParams;
  const activeTab = tab as Tab;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdminClient();

  const [
    { data: client },
    { data: appointments },
    { data: summaries },
    { data: results },
    { data: allergies },
    { data: problems },
    { data: medications },
    { data: familyHistory },
    { data: socialHistory },
    { data: vitalSigns },
  ] = await Promise.all([
    admin.from('clients').select('*').eq('id', id).single(),
    admin.from('appointments').select('*').eq('client_id', id).order('appointment_date', { ascending: false }),
    admin.from('visit_summaries').select('id, appointment_id, created_at, diagnosis, notes, treatment, follow_up, signed_at, signed_by').eq('client_id', id).order('created_at', { ascending: false }),
    admin.from('test_results').select('id, file_name, mime_type, file_size_bytes, storage_path, patient_note, doctor_label, doctor_note, uploaded_via, created_at').eq('client_id', id).order('created_at', { ascending: false }),
    admin.from('client_allergies').select('*').eq('client_id', id).order('created_at', { ascending: true }),
    admin.from('client_problems').select('*').eq('client_id', id).order('status').order('created_at', { ascending: true }),
    admin.from('client_medications').select('*').eq('client_id', id).order('end_date', { ascending: false, nullsFirst: true }).order('start_date', { ascending: false }),
    admin.from('client_family_history').select('*').eq('client_id', id).order('created_at', { ascending: true }),
    admin.from('client_social_history').select('*').eq('client_id', id).maybeSingle(),
    admin.from('visit_vital_signs').select('*').eq('client_id', id).order('captured_at', { ascending: false }).limit(10),
  ]);

  if (!client) notFound();

  // Fetch addendums for all summaries
  const summaryIds = (summaries ?? []).map(s => s.id as string);
  const { data: addendums } = summaryIds.length > 0
    ? await admin.from('visit_summary_addendums').select('*').in('summary_id', summaryIds).order('created_at', { ascending: true })
    : { data: [] };

  // Generate 1-hour signed URLs for test results
  const signedUrls: Record<string, string> = {};
  if (results && results.length > 0) {
    await Promise.all(
      results.map(async (r) => {
        const { data } = await admin.storage.from('patient-uploads').createSignedUrl(r.storage_path as string, 3600);
        if (data?.signedUrl) signedUrls[r.id as string] = data.signedUrl;
      }),
    );
  }

  const apptMap = new Map(
    (appointments ?? []).map(a => [
      a.id as string,
      {
        date: a.appointment_date as string,
        type: (a.appointment_type as string | null) ?? null,
      },
    ]),
  );

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'timeline',     label: 'Timeline' },
    { id: 'profile',      label: 'Profile' },
    { id: 'medical',      label: 'Medical record' },
    { id: 'vitals',       label: 'Vitals',          count: vitalSigns?.length ?? 0 },
    { id: 'appointments', label: 'Appointments',     count: appointments?.length ?? 0 },
    { id: 'summaries',    label: 'Visit summaries',  count: summaries?.length ?? 0 },
    { id: 'results',      label: 'Test results',     count: results?.length ?? 0 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <RealtimeRefresher table="appointments" filter={`client_id=eq.${client.id}`} />

      {/* Page header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/patients" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 'var(--r-sm)', color: 'var(--ink-muted)', textDecoration: 'none', border: '1px solid var(--hairline)', transition: 'background 0.15s' }}>
            <ChevronLeft />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="avatar" style={{ width: 44, height: 44, fontSize: 18 }}>
              {(client.name ?? '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="page-title" style={{ fontSize: 18 }}>{client.name ?? 'Unnamed patient'}</h1>
              <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                {client.email && <span style={{ fontSize: 13, color: 'var(--ink-faint)' }}>{client.email}</span>}
                {client.phone && <span style={{ fontSize: 13, color: 'var(--ink-faint)' }}>· {client.phone}</span>}
                {client.age   && <span style={{ fontSize: 13, color: 'var(--ink-faint)' }}>· Age {client.age}</span>}
              </div>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <MessagePatientButton clientId={client.id} hasWhatsApp={!!client.wa_id} />
          <a
            href={`/api/patients/${client.id}/export`}
            download
            className="btn-pms btn-pms-ghost btn-pms-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export PDF
          </a>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {tabs.map((t) => (
          <Link key={t.id} href={`/patients/${id}?tab=${t.id}`} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}>
            {t.label}
            {t.count !== undefined && (
              <span style={{ marginLeft: 6, fontSize: 12, color: activeTab === t.id ? 'var(--blue)' : 'var(--ink-faint)' }}>
                ({t.count})
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px', background: 'var(--parchment)' }}>

        {activeTab === 'timeline' && (
          <div style={{ maxWidth: 700 }}>
            <TimelinePanel
              clientId={client.id}
              appointments={(appointments ?? []).map(a => ({
                id: a.id as string,
                appointment_date: a.appointment_date as string,
                booking_status: a.booking_status as string,
                appointment_type: (a.appointment_type as string | null) ?? null,
              }))}
              summaries={(summaries ?? []).map(s => ({
                id: s.id as string,
                created_at: s.created_at as string,
                diagnosis: s.diagnosis as string | null,
                signed_at: s.signed_at as string | null,
                appointment_type: s.appointment_id
                  ? (apptMap.get(s.appointment_id as string)?.type ?? null)
                  : null,
                addendums: (addendums ?? [])
                  .filter(a => a.summary_id === s.id)
                  .map(a => ({
                    id: a.id as string,
                    content: a.content as string,
                    created_at: a.created_at as string,
                  })),
              }))}
              results={(results ?? []).map(r => ({
                id: r.id as string,
                file_name: r.file_name as string | null,
                doctor_label: r.doctor_label as string | null,
                created_at: r.created_at as string,
                mime_type: r.mime_type as string | null,
              }))}
            />
          </div>
        )}

        {activeTab === 'profile' && (
          <div style={{ maxWidth: 640 }}>
            <div className="pms-card">
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 20, letterSpacing: '-0.224px' }}>
                Patient details
              </h2>
              <ProfileEditor client={{
                id: client.id,
                name: client.name,
                email: client.email,
                phone: client.phone,
                age: client.age,
                medical_history: client.medical_history,
              }} />
            </div>
          </div>
        )}

        {activeTab === 'medical' && (
          <div style={{ maxWidth: 700 }}>
            <MedicalRecordPanel
              clientId={client.id}
              allergies={allergies ?? []}
              problems={problems ?? []}
              medications={medications ?? []}
              familyHistory={familyHistory ?? []}
              socialHistory={socialHistory ?? null}
            />
          </div>
        )}

        {activeTab === 'vitals' && (
          <div style={{ maxWidth: 700 }}>
            <VitalSignsPanel
              clientId={client.id}
              readings={vitalSigns ?? []}
            />
          </div>
        )}

        {activeTab === 'appointments' && (
          <div style={{ maxWidth: 700 }}>
            <div className="pms-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.224px' }}>Appointments</h2>
                <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{appointments?.length ?? 0} total</span>
              </div>
              <AppointmentsWithSummary
                clientId={client.id}
                appointments={(appointments ?? []).map(a => ({
                  id: a.id as string,
                  appointment_date: a.appointment_date as string,
                  booking_status: a.booking_status as string,
                  intake_form: a.intake_form as string | null,
                  appointment_type: (a.appointment_type as string | null) ?? null,
                }))}
                summaries={(summaries ?? []).map(s => ({
                  id: s.id as string,
                  appointment_id: s.appointment_id as string | null,
                }))}
              />
            </div>
          </div>
        )}

        {activeTab === 'summaries' && (
          <div style={{ maxWidth: 700 }}>
            <VisitSummaryPanel
              clientId={client.id}
              summaries={(summaries ?? []).map(s => ({
                id: s.id as string,
                appointment_id: s.appointment_id as string | null,
                appointment_date: s.appointment_id ? (apptMap.get(s.appointment_id as string)?.date ?? null) : null,
                appointment_type: s.appointment_id ? (apptMap.get(s.appointment_id as string)?.type ?? null) : null,
                created_at: s.created_at as string,
                diagnosis: s.diagnosis as string | null,
                notes: s.notes as string | null,
                treatment: s.treatment as string | null,
                follow_up: s.follow_up as string | null,
                signed_at: s.signed_at as string | null,
                signed_by: s.signed_by as string | null,
                addendums: (addendums ?? [])
                  .filter(a => a.summary_id === s.id)
                  .map(a => ({
                    id: a.id as string,
                    content: a.content as string,
                    added_by: a.added_by as string,
                    created_at: a.created_at as string,
                  })),
              }))}
            />
          </div>
        )}

        {activeTab === 'results' && (
          <div style={{ maxWidth: 700 }}>
            <TestResultsPanel
              clientId={client.id}
              results={(results ?? []).map((r) => ({
                id: r.id as string,
                file_name: r.file_name as string | null,
                mime_type: r.mime_type as string | null,
                file_size_bytes: r.file_size_bytes as number | null,
                storage_path: r.storage_path as string,
                patient_note: r.patient_note as string | null,
                doctor_label: r.doctor_label as string | null,
                doctor_note: r.doctor_note as string | null,
                uploaded_via: (r.uploaded_via ?? null) as 'whatsapp' | 'web' | null,
                created_at: r.created_at as string,
                signedUrl: signedUrls[r.id as string] ?? null,
              }))}
            />
          </div>
        )}

      </div>
    </div>
  );
}
