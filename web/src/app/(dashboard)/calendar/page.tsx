import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CalendarView from '@/components/calendar/CalendarView';
import RealtimeRefresher from '@/components/RealtimeRefresher';

const STATUS_COLORS: Record<string, string> = {
  booked: '#2563eb',
  completed: '#6b7280',
  cancelled: '#ef4444',
  missed: '#ea580c',
};

export default async function CalendarPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdminClient();

  const [{ data: appointments }, { data: clients }] = await Promise.all([
    admin
      .from('appointments')
      .select('id, client_id, appointment_date, booking_status, intake_form')
      .neq('booking_status', 'cancelled')
      .order('appointment_date'),
    admin
      .from('clients')
      .select('id, name, wa_id, email')
      .order('name'),
  ]);

  const DURATION_MS = 30 * 60 * 1000;

  // Convert a UTC ISO string to a floating Beirut local ISO string (no offset).
  // FullCalendar with timeZone="Asia/Beirut" treats no-offset strings as already
  // local, so passing "2026-05-04T10:00:00" shows the event at 10:00 AM Beirut.
  function toBeirutLocal(utc: string): string {
    return new Date(utc)
      .toLocaleString('sv-SE', { timeZone: 'Asia/Beirut' })
      .replace(' ', 'T');
  }

  const clientMap = new Map((clients ?? []).map(c => [c.id as string, c]));

  const events = (appointments ?? []).map((appt) => {
    const client = clientMap.get(appt.client_id as string);
    const startUTC = appt.appointment_date as string;
    const endUTC = new Date(new Date(startUTC).getTime() + DURATION_MS).toISOString();
    const start = toBeirutLocal(startUTC);
    const end = toBeirutLocal(endUTC);
    const color = STATUS_COLORS[appt.booking_status] ?? '#2563eb';

    return {
      id: appt.id as string,
      title: (client?.name ?? 'Unknown patient') as string,
      start,
      end,
      backgroundColor: color,
      borderColor: color,
      extendedProps: {
        status: appt.booking_status as 'booked' | 'completed' | 'cancelled' | 'missed',
        intakeForm: (appt.intake_form ?? null) as string | null,
        clientName: (client?.name ?? 'Unknown') as string,
        clientId: (appt.client_id ?? '') as string,
        waId: (client?.wa_id ?? '') as string,
        email: (client?.email ?? null) as string | null,
      },
    };
  });

  const clientList = (clients ?? []).map(c => ({
    id: c.id as string,
    name: c.name as string | null,
    wa_id: c.wa_id as string,
    email: c.email as string | null,
  }));

  return (
    <div className="flex flex-col h-screen">
      <RealtimeRefresher table="appointments" />

      {/* Header */}
      <div className="px-8 py-5 border-b border-gray-200 bg-white shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Calendar</h1>
          <p className="text-xs text-gray-400 mt-0.5">Beirut time · Click an event to manage · Drag to reschedule · Click empty slot to create</p>
        </div>
      </div>

      {/* Calendar — fills remaining height */}
      <div className="flex-1 overflow-hidden p-6">
        <CalendarView events={events} clients={clientList} />
      </div>
    </div>
  );
}
