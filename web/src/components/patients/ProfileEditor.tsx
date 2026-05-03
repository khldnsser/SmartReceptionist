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

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label className="field-label">Full name</label>
          <input name="name" value={form.name} onChange={handleChange} className="pms-input" />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} className="pms-input" />
        </div>
        <div>
          <label className="field-label">Phone</label>
          <input name="phone" value={form.phone} onChange={handleChange} className="pms-input" />
        </div>
        <div>
          <label className="field-label">Age</label>
          <input name="age" type="number" min="0" max="150" value={form.age} onChange={handleChange} className="pms-input" />
        </div>
      </div>

      <div>
        <label className="field-label">Medical history & notes</label>
        <textarea
          name="medical_history"
          rows={5}
          value={form.medical_history}
          onChange={handleChange}
          placeholder="Conditions, allergies, medications, notes…"
          className="pms-input"
        />
      </div>

      {err && <div className="error-msg">{err}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="submit" disabled={isPending} className="btn-pms btn-pms-primary btn-pms-sm">
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
        {saved && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 14, color: '#15803d' }}>
            <CheckIcon /> Saved
          </span>
        )}
      </div>
    </form>
  );
}
