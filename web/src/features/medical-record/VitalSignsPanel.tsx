'use client';

import { useState, useTransition } from 'react';
import { captureVitalSigns } from './vital-signs.actions';

interface VitalReading {
  id: string;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  heart_rate: number | null;
  temperature_c: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  bmi: number | null;
  o2_saturation: number | null;
  notes: string | null;
  captured_at: string;
}

interface Props {
  clientId: string;
  appointmentId?: string;
  readings: VitalReading[];
}

// ─── Sparkline (inline SVG, no library) ──────────────────────────────────────

function Sparkline({ values, color = 'var(--blue)' }: { values: (number | null)[]; color?: string }) {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length < 2) return null;

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;
  const W = 80;
  const H = 28;
  const step = W / (valid.length - 1);

  const pts = valid.map((v, i) => {
    const x = i * step;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {valid.map((v, i) => (
        <circle key={i} cx={i * step} cy={H - ((v - min) / range) * H} r="2" fill={color} />
      ))}
    </svg>
  );
}

// ─── Capture form ─────────────────────────────────────────────────────────────

function CaptureForm({ clientId, appointmentId, onClose }: { clientId: string; appointmentId: string; onClose: () => void }) {
  const [isPending, start] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('client_id', clientId);
    fd.set('appointment_id', appointmentId);
    start(async () => { await captureVitalSigns(fd); onClose(); });
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: 16, background: 'rgba(0,102,204,0.04)', border: '1px solid rgba(0,102,204,0.18)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--blue)' }}>Record vital signs</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { name: 'systolic_bp',   label: 'Systolic BP',    placeholder: '120' },
          { name: 'diastolic_bp',  label: 'Diastolic BP',   placeholder: '80' },
          { name: 'heart_rate',    label: 'Heart rate (bpm)', placeholder: '72' },
          { name: 'temperature_c', label: 'Temp (°C)',       placeholder: '37.0' },
          { name: 'weight_kg',     label: 'Weight (kg)',     placeholder: '70' },
          { name: 'height_cm',     label: 'Height (cm)',     placeholder: '175' },
          { name: 'o2_saturation', label: 'O₂ sat (%)',     placeholder: '98' },
        ].map(({ name, label, placeholder }) => (
          <div key={name}>
            <label className="field-label">{label}</label>
            <input name={name} type="number" step="0.1" placeholder={placeholder} className="pms-input" />
          </div>
        ))}
      </div>
      <div>
        <label className="field-label">Notes</label>
        <textarea name="notes" rows={2} className="pms-input" placeholder="Any observations…" />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={isPending} className="btn-pms btn-pms-primary btn-pms-sm">
          {isPending ? 'Saving…' : 'Save vitals'}
        </button>
        <button type="button" onClick={onClose} className="btn-pms btn-pms-ghost btn-pms-sm">Cancel</button>
      </div>
    </form>
  );
}

// ─── Latest reading card ──────────────────────────────────────────────────────

function LatestCard({ reading }: { reading: VitalReading }) {
  const date = new Date(reading.captured_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const items = [
    { label: 'BP',     value: reading.systolic_bp && reading.diastolic_bp ? `${reading.systolic_bp}/${reading.diastolic_bp}` : null, unit: 'mmHg' },
    { label: 'HR',     value: reading.heart_rate,    unit: 'bpm' },
    { label: 'Temp',   value: reading.temperature_c, unit: '°C' },
    { label: 'Weight', value: reading.weight_kg,     unit: 'kg' },
    { label: 'BMI',    value: reading.bmi,            unit: '' },
    { label: 'O₂',    value: reading.o2_saturation,  unit: '%' },
  ].filter(i => i.value !== null);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 12, marginBottom: 16 }}>
      {items.map(({ label, value, unit }) => (
        <div key={label} style={{ background: 'var(--parchment)', borderRadius: 'var(--r-sm)', padding: '10px 12px' }}>
          <p className="section-label" style={{ marginBottom: 4 }}>{label}</p>
          <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
            {typeof value === 'string' ? value : value}
          </p>
          {unit && <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>{unit}</p>}
        </div>
      ))}
      <div style={{ gridColumn: '1 / -1' }}>
        <p style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Recorded {date}</p>
      </div>
    </div>
  );
}

// ─── Trend rows ───────────────────────────────────────────────────────────────

function TrendRow({ label, values, unit, color }: { label: string; values: (number | null)[]; unit: string; color?: string }) {
  const latest = values.find(v => v !== null);
  if (latest === undefined) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--hairline)' }}>
      <span style={{ fontSize: 13, color: 'var(--ink-muted)', width: 60, flexShrink: 0 }}>{label}</span>
      <Sparkline values={values} color={color} />
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginLeft: 'auto' }}>{latest} {unit}</span>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function VitalSignsPanel({ clientId, appointmentId, readings }: Props) {
  const [capturing, setCapturing] = useState(false);
  const latest = readings[0] ?? null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.224px' }}>Vital signs</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{readings.length} reading{readings.length !== 1 ? 's' : ''}</span>
          {appointmentId && !capturing && (
            <button onClick={() => setCapturing(true)} className="btn-pms btn-pms-secondary btn-pms-sm">
              + Record vitals
            </button>
          )}
        </div>
      </div>

      {capturing && appointmentId && (
        <div style={{ marginBottom: 16 }}>
          <CaptureForm clientId={clientId} appointmentId={appointmentId} onClose={() => setCapturing(false)} />
        </div>
      )}

      {readings.length === 0 && !capturing ? (
        <div className="pms-card">
          <p style={{ fontSize: 14, color: 'var(--ink-faint)' }}>No vital signs recorded yet.</p>
        </div>
      ) : (
        <>
          {latest && <LatestCard reading={latest} />}

          {readings.length > 1 && (
            <div className="pms-card" style={{ padding: '12px 16px' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-faint)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Trends (last {readings.length})
              </p>
              <TrendRow label="Systolic"  values={readings.map(r => r.systolic_bp)}  unit="mmHg" color="var(--red)" />
              <TrendRow label="Diastolic" values={readings.map(r => r.diastolic_bp)} unit="mmHg" color="var(--orange)" />
              <TrendRow label="HR"        values={readings.map(r => r.heart_rate)}    unit="bpm"  color="var(--blue)" />
              <TrendRow label="Weight"    values={readings.map(r => r.weight_kg)}     unit="kg"   color="var(--ink-muted)" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
