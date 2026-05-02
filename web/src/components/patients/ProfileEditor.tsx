'use client';

import { useState, useTransition } from 'react';
import { updateClientAction } from '@/app/(dashboard)/patients/actions';

interface Client {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  age: number | null;
  medical_history: string | null;
}

export default function ProfileEditor({ client }: { client: Client }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({
    name: client.name ?? '',
    email: client.email ?? '',
    phone: client.phone ?? '',
    age: client.age?.toString() ?? '',
    medical_history: client.medical_history ?? '',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setSaved(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    startTransition(async () => {
      const res = await updateClientAction(client.id, {
        name: form.name || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        age: form.age ? parseInt(form.age) : null,
        medical_history: form.medical_history || undefined,
      });
      if (!res.ok) { setErr(res.error ?? 'Failed to save'); return; }
      setSaved(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Full name</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Age</label>
          <input
            name="age"
            type="number"
            min="0"
            max="150"
            value={form.age}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Medical history & notes</label>
        <textarea
          name="medical_history"
          rows={5}
          value={form.medical_history}
          onChange={handleChange}
          placeholder="Conditions, allergies, medications, notes…"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
        {saved && <span className="text-sm text-green-600">✓ Saved</span>}
      </div>
    </form>
  );
}
