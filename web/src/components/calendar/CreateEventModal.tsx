'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createAppointmentAction } from '@/app/(dashboard)/calendar/actions';

interface Client {
  id: string;
  name: string | null;
  wa_id: string;
  email: string | null;
}

interface Props {
  clients: Client[];
  defaultDate?: string; // pre-filled from calendar click (local datetime string)
  onClose: () => void;
}

export default function CreateEventModal({ clients, defaultDate, onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(defaultDate ?? '');
  const [intakeForm, setIntakeForm] = useState('');
  const [err, setErr] = useState('');

  const selectedClient = clients.find(c => c.id === clientId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!clientId) { setErr('Please select a patient'); return; }
    if (!date) { setErr('Please pick a date and time'); return; }

    startTransition(async () => {
      const res = await createAppointmentAction(
        clientId,
        selectedClient!.wa_id,
        selectedClient!.name ?? 'Patient',
        date + ':00',
        intakeForm || undefined,
      );
      if (!res.ok) { setErr(res.error ?? 'Failed'); return; }
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">New appointment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select a patient…</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name ?? 'Unnamed'} {c.email ? `— ${c.email}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time (Beirut)</label>
            <input
              type="datetime-local"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topic / Intake (optional)</label>
            <textarea
              rows={3}
              value={intakeForm}
              onChange={e => setIntakeForm(e.target.value)}
              placeholder="What will be discussed…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Creating…' : 'Create appointment'}
          </button>
        </form>
      </div>
    </div>
  );
}
