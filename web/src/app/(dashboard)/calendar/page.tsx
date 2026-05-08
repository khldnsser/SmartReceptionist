import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CalendarView from '@/features/calendar/CalendarView';
import RealtimeRefresher from '@/components/RealtimeRefresher';

const TYPE_COLORS: Record<string, string> = {
  initial:     '#7c3aed',
  follow_up:   '#0066cc',
  procedure:   '#c2410c',
  telemedicine:'#0891b2',
};

const TYPE_LABEL: Record<string, string> = {
  initial:     'Initial',
  follow_up:   'Follow-up',
  procedure:   'Procedure',
  telemedicine:'Telemedicine',
};

const STATUS_COLORS: Record<string, string> = {
  completed: '#6e6e73',
  cancelled:  '#d93025',
  missed:     '#ea580c',
};

export default async function CalendarPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdminClient();

  const [{ data: appointments }, { data: clients }] = await Promise.all([
    admin
      .from('appointments')
      .select('id, client_id, appointment_date, booking_status, intake_form, appointment_type, duration_minutes')
      .neq('booking_status', 'cancelled')
      .order('appointment_date'),
    admin
      .from('clients')
      .select('id, name, wa_id, email')
      .order('name'),
  ]);

  function toBeirutLocal(utc: string): string {
    return new Date(utc)
      .toLocaleString('sv-SE', { timeZone: 'Asia/Beirut' })
      .replace(' ', 'T');
  }

  const clientMap = new Map((clients ?? []).map(c => [c.id as string, c]));

  const events = (appointments ?? []).map((appt) => {
    const client = clientMap.get(appt.client_id as string);
    const startUTC = appt.appointment_date as string;
    const durationMs = ((appt.duration_minutes as number | null) ?? 30) * 60 * 1000;
    const endUTC = new Date(new Date(startUTC).getTime() + durationMs).toISOString();
    const start = toBeirutLocal(startUTC);
    const end = toBeirutLocal(endUTC);
    const status = appt.booking_status as string;
    const apptType = (appt.appointment_type as string | null) ?? 'follow_up';
    const color = STATUS_COLORS[status] ?? TYPE_COLORS[apptType] ?? '#0066cc';

    const typeLabel = TYPE_LABEL[apptType] ?? apptType;

    return {
      id: appt.id as string,
      title: `${client?.name ?? 'Unknown patient'} · ${typeLabel}`,
      start,
      end,
      backgroundColor: color,
      borderColor: color,
      extendedProps: {
        status: status as 'booked' | 'completed' | 'cancelled' | 'missed',
        intakeForm: (appt.intake_form ?? null) as string | null,
        appointmentType: apptType,
        durationMinutes: (appt.duration_minutes as number | null) ?? 30,
        clientName: (client?.name ?? 'Unknown') as string,
        clientId: (appt.client_id ?? '') as string,
        waId: (client?.wa_id ?? null) as string | null,
        email: (client?.email ?? null) as string | null,
      },
    };
  });

  const clientList = (clients ?? []).map(c => ({
    id: c.id as string,
    name: c.name as string | null,
    wa_id: (c.wa_id ?? null) as string | null,
    email: c.email as string | null,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <RealtimeRefresher table="appointments" />

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">Beirut time · click an event to manage · drag to reschedule · click empty slot to create</p>
        </div>
      </div>

      {/* Calendar */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '24px 32px' }}>
        <CalendarView events={events} clients={clientList} />
      </div>
    </div>
  );
}
