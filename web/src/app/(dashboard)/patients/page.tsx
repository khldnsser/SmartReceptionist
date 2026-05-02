import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import PatientSearch from '@/components/patients/PatientSearch';
import RealtimeRefresher from '@/components/RealtimeRefresher';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  booked: 'bg-blue-100 text-blue-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
  missed: 'bg-orange-100 text-orange-700',
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
    <div className="p-8">
      <RealtimeRefresher table="clients" />
      <RealtimeRefresher table="appointments" />

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Patients</h1>
          <p className="text-xs text-gray-400 mt-0.5">{clients?.length ?? 0} total</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-5">
        <Suspense>
          <PatientSearch defaultValue={q} />
        </Suspense>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!clients || clients.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            {q ? `No patients match "${q}"` : 'No patients yet'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Patient</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Phone</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">WhatsApp ID</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Last appointment</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map((client) => {
                const appts = (client.appointments as { booking_status: string; appointment_date: string }[] | null) ?? [];
                const sorted = [...appts].sort(
                  (a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime(),
                );
                const latest = sorted[0];
                const statusColor = latest ? (STATUS_COLORS[latest.booking_status] ?? 'bg-gray-100 text-gray-500') : '';

                return (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/patients/${client.id}`} className="group flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold flex items-center justify-center shrink-0">
                          {(client.name ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {client.name ?? <span className="text-gray-400 italic">Unnamed</span>}
                          </p>
                          {client.email && <p className="text-xs text-gray-400">{client.email}</p>}
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{client.phone ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-400 font-mono text-xs">{client.wa_id}</td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {latest
                        ? new Date(latest.appointment_date).toLocaleDateString('en-US', {
                            timeZone: 'Asia/Beirut',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {latest ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                          {latest.booking_status}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">no appointments</span>
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
  );
}
