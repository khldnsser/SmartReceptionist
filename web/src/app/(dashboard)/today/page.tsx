import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getBeirutDayBounds } from '@/lib/dates';

export const dynamic = 'force-dynamic';

function statusStyle(status: string): React.CSSProperties {
  const map: Record<string, { bg: string; color: string }> = {
    booked:    { bg: 'rgba(0,102,204,0.10)',  color: 'var(--blue)' },
    completed: { bg: 'rgba(21,128,61,0.10)',  color: '#15803d' },
    cancelled: { bg: 'rgba(220,38,38,0.10)',  color: 'var(--red)' },
    missed:    { bg: 'rgba(217,119,6,0.10)',  color: '#d97706' },
  };
  const s = map[status] ?? { bg: 'rgba(0,0,0,0.07)', color: 'var(--ink-muted)' };
  return { background: s.bg, color: s.color, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 'var(--r-pill)' };
}

function fmtTime(date: string) {
  return new Date(date).toLocaleTimeString('en-US', {
    timeZone: 'Asia/Beirut', hour: '2-digit', minute: '2-digit',
  });
}

function fmtDay(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    timeZone: 'Asia/Beirut', weekday: 'long', month: 'long', day: 'numeric',
  });
}

function CalendarDotIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

interface Appointment {
  id: string;
  appointment_date: string;
  booking_status: string;
  clients: { id: string; name: string | null; phone: string | null } | null;
}

function AppointmentRow({ appt }: { appt: Appointment }) {
  const patientName = appt.clients?.name ?? 'Unknown patient';
  const initial = patientName.charAt(0).toUpperCase();
  return (
    <Link
      href={`/patients/${appt.clients?.id ?? '#'}`}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', textDecoration: 'none', borderBottom: '1px solid var(--hairline)' }}
    >
      <div className="avatar" style={{ width: 34, height: 34, fontSize: 13, flexShrink: 0 }}>{initial}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {patientName}
        </p>
        {appt.clients?.phone && (
          <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 1 }}>{appt.clients.phone}</p>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{fmtTime(appt.appointment_date)}</p>
        <span style={statusStyle(appt.booking_status)}>{appt.booking_status}</span>
      </div>
    </Link>
  );
}

function Section({ title, children, count }: { title: string; children: React.ReactNode; count: number }) {
  return (
    <div className="pms-card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: count > 0 ? 4 : 0 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.2px' }}>{title}</h2>
        <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{count}</span>
      </div>
      {children}
    </div>
  );
}

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdminClient();
  const { todayStart, tomorrowStart, in8DaysStart, todayDateStr } = getBeirutDayBounds();

  const [{ data: todayRaw }, { data: weekRaw }] = await Promise.all([
    admin
      .from('appointments')
      .select('id, appointment_date, booking_status, clients(id, name, phone)')
      .gte('appointment_date', todayStart)
      .lt('appointment_date', tomorrowStart)
      .order('appointment_date'),
    admin
      .from('appointments')
      .select('id, appointment_date, booking_status, clients(id, name, phone)')
      .gte('appointment_date', tomorrowStart)
      .lt('appointment_date', in8DaysStart)
      .eq('booking_status', 'booked')
      .order('appointment_date'),
  ]);

  const today = (todayRaw ?? []) as unknown as Appointment[];
  const week  = (weekRaw  ?? []) as unknown as Appointment[];

  const upcoming  = today.filter(a => a.booking_status === 'booked' && new Date(a.appointment_date) > new Date());
  const completed = today.filter(a => a.booking_status === 'completed');
  const other     = today.filter(a => !['booked', 'completed'].includes(a.booking_status) ||
    (a.booking_status === 'booked' && new Date(a.appointment_date) <= new Date()));

  // Group next 7 days by date string
  const byDay = new Map<string, Appointment[]>();
  for (const a of week) {
    const dayKey = new Date(a.appointment_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Beirut' });
    if (!byDay.has(dayKey)) byDay.set(dayKey, []);
    byDay.get(dayKey)!.push(a);
  }

  const todayLabel = new Date(todayDateStr).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Today</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginTop: 2 }}>{todayLabel}</p>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>{today.length}</p>
            <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>total</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)', lineHeight: 1 }}>{upcoming.length}</p>
            <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>upcoming</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#15803d', lineHeight: 1 }}>{completed.length}</p>
            <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>done</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 720 }}>

        {/* Upcoming */}
        <Section title="Upcoming today" count={upcoming.length}>
          {upcoming.length === 0
            ? <p style={{ fontSize: 14, color: 'var(--ink-faint)', marginTop: 8 }}>No upcoming appointments.</p>
            : upcoming.map(a => <AppointmentRow key={a.id} appt={a} />)
          }
        </Section>

        {/* Completed */}
        {completed.length > 0 && (
          <Section title="Completed today" count={completed.length}>
            {completed.map(a => <AppointmentRow key={a.id} appt={a} />)}
          </Section>
        )}

        {/* Missed / cancelled / past-booked */}
        {other.length > 0 && (
          <Section title="Other" count={other.length}>
            {other.map(a => <AppointmentRow key={a.id} appt={a} />)}
          </Section>
        )}

        {/* Next 7 days */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <CalendarDotIcon />
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.2px' }}>
              Next 7 days
            </h2>
            <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{week.length} booked</span>
          </div>

          {week.length === 0 ? (
            <div className="pms-card">
              <p style={{ fontSize: 14, color: 'var(--ink-faint)' }}>No appointments in the next 7 days.</p>
            </div>
          ) : (
            Array.from(byDay.entries()).map(([dayKey, appts]) => (
              <div key={dayKey} className="pms-card" style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4 }}>
                  {fmtDay(appts[0].appointment_date)}
                </p>
                {appts.map(a => <AppointmentRow key={a.id} appt={a} />)}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
