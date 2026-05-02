import { createClient, createAdminClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import ProfileEditor from '@/components/patients/ProfileEditor';
import VisitSummaryPanel from '@/components/patients/VisitSummaryPanel';
import TestResultsPanel from '@/components/patients/TestResultsPanel';
import AppointmentsWithSummary from '@/components/patients/AppointmentsWithSummary';
import RealtimeRefresher from '@/components/RealtimeRefresher';

interface Props {
  params: Promise<{ id: string }>;
}


export default async function PatientProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdminClient();

  const [{ data: client }, { data: appointments }, { data: summaries }, { data: results }] =
    await Promise.all([
      admin.from('clients').select('*').eq('id', id).single(),
      admin
        .from('appointments')
        .select('*')
        .eq('client_id', id)
        .order('appointment_date', { ascending: false }),
      admin
        .from('visit_summaries')
        .select('id, appointment_id, created_at, diagnosis, notes, treatment, follow_up')
        .eq('client_id', id)
        .order('created_at', { ascending: false }),
      admin
        .from('test_results')
        .select('id, file_name, mime_type, file_size_bytes, storage_path, patient_note, doctor_label, doctor_note, created_at')
        .eq('client_id', id)
        .order('created_at', { ascending: false }),
    ]);

  if (!client) notFound();

  // Generate 1-hour signed URLs for each test result
  const signedUrls: Record<string, string> = {};
  if (results && results.length > 0) {
    await Promise.all(
      results.map(async (r) => {
        const { data } = await admin.storage
          .from('patient-uploads')
          .createSignedUrl(r.storage_path as string, 3600);
        if (data?.signedUrl) signedUrls[r.id as string] = data.signedUrl;
      }),
    );
  }

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <RealtimeRefresher table="appointments" filter={`client_id=eq.${client.id}`} />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/patients" className="hover:text-gray-600">Patients</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{client.name ?? 'Unnamed'}</span>
      </div>

      {/* Patient header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 text-xl font-bold flex items-center justify-center shrink-0">
          {(client.name ?? '?').charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{client.name ?? 'Unnamed patient'}</h1>
          <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500">
            {client.email && <span>{client.email}</span>}
            {client.phone && <span>· {client.phone}</span>}
            {client.age && <span>· Age {client.age}</span>}
            <span className="font-mono text-xs text-gray-300">wa:{client.wa_id}</span>
          </div>
        </div>
      </div>

      {/* Top grid: patient details + appointments (left) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Patient details</h2>
            <ProfileEditor client={{
              id: client.id,
              name: client.name,
              email: client.email,
              phone: client.phone,
              age: client.age,
              medical_history: client.medical_history,
            }} />
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Appointments</h2>
              <span className="text-xs text-gray-400">{appointments?.length ?? 0} total</span>
            </div>
            <AppointmentsWithSummary
              clientId={client.id}
              appointments={(appointments ?? []).map(a => ({
                id: a.id as string,
                appointment_date: a.appointment_date as string,
                booking_status: a.booking_status as string,
                intake_form: a.intake_form as string | null,
              }))}
              summaries={(summaries ?? []).map(s => ({
                id: s.id as string,
                appointment_id: s.appointment_id as string | null,
              }))}
            />
          </section>
        </div>

        {/* Right column: intentionally empty — keeps visual balance on wide screens */}
        <div />
      </div>

      {/* Visit Summaries — full width */}
      {(() => {
        const apptMap = new Map((appointments ?? []).map(a => [a.id as string, a.appointment_date as string]));
        return (
          <VisitSummaryPanel
            clientId={client.id}
            summaries={(summaries ?? []).map(s => ({
              id: s.id as string,
              appointment_id: s.appointment_id as string | null,
              appointment_date: s.appointment_id ? (apptMap.get(s.appointment_id as string) ?? null) : null,
              created_at: s.created_at as string,
              diagnosis: s.diagnosis as string | null,
              notes: s.notes as string | null,
              treatment: s.treatment as string | null,
              follow_up: s.follow_up as string | null,
            }))}
          />
        );
      })()}

      {/* Test Results — full width */}
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
          created_at: r.created_at as string,
          signedUrl: signedUrls[r.id as string] ?? null,
        }))}
      />
    </div>
  );
}
