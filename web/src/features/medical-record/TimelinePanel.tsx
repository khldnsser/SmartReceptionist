import Link from 'next/link';

interface Appointment {
  id: string;
  appointment_date: string;
  booking_status: string;
  appointment_type: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  initial:     'Initial',
  follow_up:   'Follow-up',
  procedure:   'Procedure',
  telemedicine:'Telemedicine',
};

interface Addendum {
  id: string;
  content: string;
  created_at: string;
}

interface Summary {
  id: string;
  created_at: string;
  diagnosis: string | null;
  signed_at: string | null;
  addendums: Addendum[];
}

interface TestResult {
  id: string;
  file_name: string | null;
  doctor_label: string | null;
  created_at: string;
  mime_type: string | null;
}

interface Props {
  clientId: string;
  appointments: Appointment[];
  summaries: Summary[];
  results: TestResult[];
}

type EventType = 'appointment' | 'summary' | 'addendum' | 'test_result';

interface TimelineEvent {
  key: string;
  date: Date;
  type: EventType;
  tabLink: string;
  title: string;
  subtitle?: string;
  badge?: string;
}

function dotColor(type: EventType): string {
  switch (type) {
    case 'appointment': return 'var(--blue)';
    case 'summary':     return '#15803d';
    case 'addendum':    return '#d97706';
    case 'test_result': return '#7c3aed';
  }
}

function statusBadgeStyle(status: string): React.CSSProperties {
  const map: Record<string, string> = {
    booked:    'rgba(0,102,204,0.12)',
    completed: 'rgba(21,128,61,0.12)',
    cancelled: 'rgba(220,38,38,0.12)',
    missed:    'rgba(217,119,6,0.12)',
    Signed:    'rgba(21,128,61,0.12)',
    Draft:     'rgba(0,0,0,0.07)',
  };
  const textMap: Record<string, string> = {
    booked:    'var(--blue)',
    completed: '#15803d',
    cancelled: 'var(--red)',
    missed:    '#d97706',
    Signed:    '#15803d',
    Draft:     'var(--ink-muted)',
  };
  return {
    fontSize: 11,
    fontWeight: 500,
    padding: '2px 7px',
    borderRadius: 'var(--r-pill)',
    background: map[status] ?? 'rgba(0,0,0,0.07)',
    color: textMap[status] ?? 'var(--ink-muted)',
  };
}

export default function TimelinePanel({ clientId, appointments, summaries, results }: Props) {
  const events: TimelineEvent[] = [];

  for (const a of appointments) {
    const dateText = new Date(a.appointment_date).toLocaleString('en-US', {
      timeZone: 'Asia/Beirut',
      weekday: 'short', month: 'short', day: 'numeric',
      year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const typeLabel = a.appointment_type ? (TYPE_LABEL[a.appointment_type] ?? a.appointment_type) : null;
    events.push({
      key: `appt-${a.id}`,
      date: new Date(a.appointment_date),
      type: 'appointment',
      tabLink: `/patients/${clientId}?tab=appointments`,
      title: typeLabel ? `${dateText} · ${typeLabel}` : dateText,
      badge: a.booking_status,
    });
  }

  for (const s of summaries) {
    events.push({
      key: `summary-${s.id}`,
      date: new Date(s.created_at),
      type: 'summary',
      tabLink: `/patients/${clientId}?tab=summaries`,
      title: 'Visit summary',
      subtitle: s.diagnosis
        ? (s.diagnosis.length > 90 ? s.diagnosis.slice(0, 90) + '…' : s.diagnosis)
        : 'No diagnosis recorded',
      badge: s.signed_at ? 'Signed' : 'Draft',
    });

    for (const ad of s.addendums) {
      events.push({
        key: `addendum-${ad.id}`,
        date: new Date(ad.created_at),
        type: 'addendum',
        tabLink: `/patients/${clientId}?tab=summaries`,
        title: 'Addendum',
        subtitle: ad.content.length > 90 ? ad.content.slice(0, 90) + '…' : ad.content,
      });
    }
  }

  for (const r of results) {
    events.push({
      key: `result-${r.id}`,
      date: new Date(r.created_at),
      type: 'test_result',
      tabLink: `/patients/${clientId}?tab=results`,
      title: r.doctor_label ?? r.file_name ?? 'Test result',
      subtitle: r.mime_type?.startsWith('image/') ? 'Image' : 'Document',
    });
  }

  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  if (events.length === 0) {
    return (
      <div className="pms-card">
        <p style={{ fontSize: 14, color: 'var(--ink-faint)' }}>No activity yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.224px' }}>
          Activity timeline
        </h2>
        <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{events.length} events</span>
      </div>

      <div style={{ position: 'relative', paddingLeft: 28 }}>
        {/* Vertical connector line */}
        <div style={{
          position: 'absolute', left: 7, top: 10, bottom: 10,
          width: 2, background: 'var(--hairline)',
        }} />

        {events.map((ev, i) => (
          <div key={ev.key} style={{ position: 'relative', marginBottom: i < events.length - 1 ? 14 : 0 }}>
            {/* Dot */}
            <div style={{
              position: 'absolute', left: -28 + 1, top: 10,
              width: 14, height: 14, borderRadius: '50%',
              background: dotColor(ev.type),
              border: '2px solid var(--parchment)',
              zIndex: 1,
            }} />

            <Link href={ev.tabLink} style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--r-md)',
                padding: '10px 14px',
                background: 'var(--canvas)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 500, color: 'var(--ink)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {ev.title}
                    </p>
                    {ev.subtitle && (
                      <p style={{
                        fontSize: 12, color: 'var(--ink-muted)', marginTop: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {ev.subtitle}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                    <p style={{ fontSize: 11, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>
                      {ev.date.toLocaleDateString('en-US', {
                        timeZone: 'Asia/Beirut', month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                    {ev.badge && (
                      <span style={statusBadgeStyle(ev.badge)}>{ev.badge}</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
