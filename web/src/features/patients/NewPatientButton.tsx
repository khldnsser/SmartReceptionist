'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClientAction } from './actions';

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function NewPatientButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [err, setErr] = useState('');

  function reset() {
    setName(''); setPhone(''); setEmail(''); setAge(''); setErr('');
  }

  function handleClose() { setOpen(false); reset(); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    startTransition(async () => {
      const res = await createClientAction({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        age: age ? parseInt(age, 10) : null,
      });
      if (!res.ok) { setErr(res.error ?? 'Failed to create patient'); return; }
      router.refresh();
      handleClose();
      if (res.id) router.push(`/patients/${res.id}`);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-pms btn-pms-primary btn-pms-sm"
      >
        + New patient
      </button>

      {open && (
        <div className="modal-backdrop" onClick={handleClose}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <button className="modal-close" onClick={handleClose}><XIcon /></button>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.374px', marginBottom: 20 }}>
              New patient
            </h2>

            {err && <div className="error-msg" style={{ marginBottom: 16 }}>{err}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="field-label">Name <span style={{ color: 'var(--red)' }}>*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="pms-input"
                  placeholder="Full name"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="field-label">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="pms-input"
                  placeholder="+961 xx xxx xxx"
                />
                <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>
                  Used to auto-link WhatsApp when patient messages the clinic.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label className="field-label">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pms-input"
                    placeholder="patient@email.com"
                  />
                </div>
                <div style={{ width: 90 }}>
                  <label className="field-label">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    className="pms-input"
                    placeholder="—"
                    min={0}
                    max={150}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending || !name.trim()}
                className="btn-pms btn-pms-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', marginTop: 4 }}
              >
                {isPending ? 'Creating…' : 'Create patient'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
