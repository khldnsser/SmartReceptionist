import { NextRequest, NextResponse } from 'next/server';
import type { ReactElement } from 'react';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { PatientPdfDocument } from '@/lib/patient-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const admin = createAdminClient();

  const [
    { data: client },
    { data: allergies },
    { data: problems },
    { data: medications },
    { data: summariesRaw },
    { data: vitalsRaw },
  ] = await Promise.all([
    admin.from('clients').select('name, email, phone, age').eq('id', id).single(),
    admin.from('client_allergies').select('substance, reaction, severity, notes').eq('client_id', id).order('created_at'),
    admin.from('client_problems').select('problem, icd10_code, status, onset_date').eq('client_id', id).order('status'),
    admin.from('client_medications').select('drug_name, dose, frequency, start_date, end_date, indication').eq('client_id', id).order('end_date', { ascending: false, nullsFirst: true }),
    admin.from('visit_summaries').select('appointment_id, created_at, diagnosis, notes, treatment, follow_up, signed_at').eq('client_id', id).order('created_at', { ascending: false }).limit(5),
    admin.from('visit_vital_signs').select('*').eq('client_id', id).order('captured_at', { ascending: false }).limit(1),
  ]);

  if (!client) return new NextResponse('Not found', { status: 404 });

  const appointmentIds = (summariesRaw ?? []).map(s => s.appointment_id).filter(Boolean) as string[];
  const { data: appts } = appointmentIds.length > 0
    ? await admin.from('appointments').select('id, appointment_date').in('id', appointmentIds)
    : { data: [] };
  const apptMap = new Map((appts ?? []).map(a => [a.id as string, a.appointment_date as string]));

  const summaries = (summariesRaw ?? []).map(s => ({
    ...s,
    appointment_date: s.appointment_id ? (apptMap.get(s.appointment_id as string) ?? null) : null,
  }));

  const exportedAt = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Beirut', month: 'long', day: 'numeric',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const safeFilename = (client.name ?? 'patient').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const dateSlug = new Date().toISOString().split('T')[0];

  const buffer = await renderToBuffer(<PatientPdfDocument
    client={client}
    allergies={allergies ?? []}
    problems={problems ?? []}
    medications={medications ?? []}
    vitals={vitalsRaw?.[0] ?? null}
    summaries={summaries}
    exportedAt={exportedAt}
  /> as ReactElement);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeFilename}-record-${dateSlug}.pdf"`,
    },
  });
}
