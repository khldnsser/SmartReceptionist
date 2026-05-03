'use client';

import { useState, useTransition } from 'react';
import {
  addAllergy, updateAllergy, deleteAllergy,
  addProblem, updateProblem, deleteProblem,
  addMedication, updateMedication, deleteMedication,
  addFamilyHistory, updateFamilyHistory, deleteFamilyHistory,
  upsertSocialHistory,
} from '@/app/actions/medical-record';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Allergy {
  id: string;
  substance: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe';
  notes: string | null;
}

export interface Problem {
  id: string;
  problem: string;
  icd10_code: string | null;
  onset_date: string | null;
  status: 'active' | 'resolved' | 'inactive';
  notes: string | null;
}

export interface Medication {
  id: string;
  drug_name: string;
  dose: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  indication: string | null;
  notes: string | null;
}

export interface FamilyHistoryEntry {
  id: string;
  relation: string;
  condition: string;
  notes: string | null;
}

export interface SocialHistory {
  smoking_status: string | null;
  smoking_details: string | null;
  alcohol_use: string | null;
  alcohol_details: string | null;
  drug_use: string | null;
  drug_use_details: string | null;
  occupation: string | null;
  living_situation: string | null;
  other_notes: string | null;
}

interface Props {
  clientId: string;
  allergies: Allergy[];
  problems: Problem[];
  medications: Medication[];
  familyHistory: FamilyHistoryEntry[];
  socialHistory: SocialHistory | null;
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionShell({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ borderBottom: '1px solid var(--hairline)', paddingBottom: open ? 20 : 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
          {title}
          <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: 'var(--ink-faint)' }}>{count}</span>
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div style={{ paddingBottom: 4 }}>{children}</div>}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { cls: string }> = {
    mild:     { cls: 'badge-green' },
    moderate: { cls: 'badge-orange' },
    severe:   { cls: 'badge-red' },
  };
  return <span className={`badge ${(map[severity] ?? map.mild).cls}`}>{severity}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string }> = {
    active:   { cls: 'badge-blue' },
    resolved: { cls: 'badge-green' },
    inactive: { cls: 'badge-gray' },
  };
  return <span className={`badge ${(map[status] ?? map.active).cls}`}>{status}</span>;
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="btn-pms btn-pms-ghost btn-pms-sm" style={{ marginTop: 10 }}>
      + Add
    </button>
  );
}

function InlineForm({ children, onSubmit, onCancel, isPending, submitLabel = 'Save' }: {
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel?: string;
}) {
  return (
    <form onSubmit={onSubmit} style={{ marginTop: 10, padding: 14, background: 'rgba(0,102,204,0.04)', border: '1px solid rgba(0,102,204,0.18)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {children}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={isPending} className="btn-pms btn-pms-primary btn-pms-sm">
          {isPending ? 'Saving…' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="btn-pms btn-pms-ghost btn-pms-sm">Cancel</button>
      </div>
    </form>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 10 }}>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1 }}>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

// ─── Allergies ────────────────────────────────────────────────────────────────

function AllergyRow({ allergy, clientId }: { allergy: Allergy; clientId: string }) {
  const [editing, setEditing] = useState(false);
  const [isPending, start] = useTransition();

  if (editing) return (
    <AllergyForm clientId={clientId} defaults={allergy} onClose={() => setEditing(false)} />
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--hairline)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{allergy.substance}</span>
        <span style={{ fontSize: 13, color: 'var(--ink-muted)', marginLeft: 8 }}>→ {allergy.reaction}</span>
        {allergy.notes && <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>{allergy.notes}</p>}
      </div>
      <SeverityBadge severity={allergy.severity} />
      <button onClick={() => setEditing(true)} className="btn-pms btn-pms-ghost btn-pms-sm">Edit</button>
      <button onClick={() => start(async () => { await deleteAllergy(allergy.id, clientId); })} disabled={isPending} className="btn-pms btn-pms-sm" style={{ color: 'var(--red)' }}>
        {isPending ? '…' : 'Delete'}
      </button>
    </div>
  );
}

function AllergyForm({ clientId, defaults, onClose }: { clientId: string; defaults?: Allergy; onClose: () => void }) {
  const [isPending, start] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('client_id', clientId);
    start(async () => { await (defaults ? updateAllergy(fd) : addAllergy(fd)); onClose(); });
  }
  return (
    <InlineForm onSubmit={handleSubmit} onCancel={onClose} isPending={isPending} submitLabel={defaults ? 'Update' : 'Add allergy'}>
      {defaults && <input type="hidden" name="id" value={defaults.id} />}
      <Row>
        <Field label="Substance *">
          <input name="substance" required defaultValue={defaults?.substance} className="pms-input" placeholder="e.g. Penicillin" />
        </Field>
        <Field label="Reaction *">
          <input name="reaction" required defaultValue={defaults?.reaction} className="pms-input" placeholder="e.g. Anaphylaxis" />
        </Field>
      </Row>
      <Row>
        <Field label="Severity">
          <select name="severity" defaultValue={defaults?.severity ?? 'mild'} className="pms-input">
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
          </select>
        </Field>
        <Field label="Notes">
          <input name="notes" defaultValue={defaults?.notes ?? ''} className="pms-input" placeholder="Optional" />
        </Field>
      </Row>
    </InlineForm>
  );
}

function AllergiesSection({ clientId, allergies }: { clientId: string; allergies: Allergy[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <SectionShell title="Allergies" count={allergies.length}>
      {allergies.map(a => <AllergyRow key={a.id} allergy={a} clientId={clientId} />)}
      {adding
        ? <AllergyForm clientId={clientId} onClose={() => setAdding(false)} />
        : <AddButton onClick={() => setAdding(true)} />}
    </SectionShell>
  );
}

// ─── Problems ─────────────────────────────────────────────────────────────────

function ProblemRow({ problem, clientId }: { problem: Problem; clientId: string }) {
  const [editing, setEditing] = useState(false);
  const [isPending, start] = useTransition();

  if (editing) return <ProblemForm clientId={clientId} defaults={problem} onClose={() => setEditing(false)} />;

  return (
    <div style={{ display: 'flex', alignItems: 'start', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--hairline)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{problem.problem}</span>
        {problem.icd10_code && <span style={{ fontSize: 12, color: 'var(--ink-faint)', marginLeft: 8 }}>{problem.icd10_code}</span>}
        {problem.onset_date && <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>Since {problem.onset_date}</p>}
        {problem.notes && <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>{problem.notes}</p>}
      </div>
      <StatusBadge status={problem.status} />
      <button onClick={() => setEditing(true)} className="btn-pms btn-pms-ghost btn-pms-sm">Edit</button>
      <button onClick={() => start(async () => { await deleteProblem(problem.id, clientId); })} disabled={isPending} className="btn-pms btn-pms-sm" style={{ color: 'var(--red)' }}>
        {isPending ? '…' : 'Delete'}
      </button>
    </div>
  );
}

function ProblemForm({ clientId, defaults, onClose }: { clientId: string; defaults?: Problem; onClose: () => void }) {
  const [isPending, start] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('client_id', clientId);
    start(async () => { await (defaults ? updateProblem(fd) : addProblem(fd)); onClose(); });
  }
  return (
    <InlineForm onSubmit={handleSubmit} onCancel={onClose} isPending={isPending} submitLabel={defaults ? 'Update' : 'Add problem'}>
      {defaults && <input type="hidden" name="id" value={defaults.id} />}
      <Row>
        <Field label="Problem *">
          <input name="problem" required defaultValue={defaults?.problem} className="pms-input" placeholder="e.g. Type 2 Diabetes" />
        </Field>
        <Field label="ICD-10 (optional)">
          <input name="icd10_code" defaultValue={defaults?.icd10_code ?? ''} className="pms-input" placeholder="e.g. E11" />
        </Field>
      </Row>
      <Row>
        <Field label="Onset date">
          <input name="onset_date" type="date" defaultValue={defaults?.onset_date ?? ''} className="pms-input" />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={defaults?.status ?? 'active'} className="pms-input">
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
      </Row>
      <Field label="Notes">
        <input name="notes" defaultValue={defaults?.notes ?? ''} className="pms-input" placeholder="Optional" />
      </Field>
    </InlineForm>
  );
}

function ProblemsSection({ clientId, problems }: { clientId: string; problems: Problem[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <SectionShell title="Active problems" count={problems.length}>
      {problems.map(p => <ProblemRow key={p.id} problem={p} clientId={clientId} />)}
      {adding
        ? <ProblemForm clientId={clientId} onClose={() => setAdding(false)} />
        : <AddButton onClick={() => setAdding(true)} />}
    </SectionShell>
  );
}

// ─── Medications ──────────────────────────────────────────────────────────────

function MedicationRow({ med, clientId }: { med: Medication; clientId: string }) {
  const [editing, setEditing] = useState(false);
  const [isPending, start] = useTransition();
  const isActive = !med.end_date;

  if (editing) return <MedicationForm clientId={clientId} defaults={med} onClose={() => setEditing(false)} />;

  return (
    <div style={{ display: 'flex', alignItems: 'start', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--hairline)', opacity: isActive ? 1 : 0.6 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{med.drug_name}</span>
        <span style={{ fontSize: 13, color: 'var(--ink-muted)', marginLeft: 8 }}>{med.dose} · {med.frequency}</span>
        {med.indication && <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>For: {med.indication}</p>}
        <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>
          Since {med.start_date}{med.end_date ? ` → ${med.end_date}` : ''}
        </p>
      </div>
      {isActive ? <span className="badge badge-blue">Active</span> : <span className="badge badge-gray">Stopped</span>}
      <button onClick={() => setEditing(true)} className="btn-pms btn-pms-ghost btn-pms-sm">Edit</button>
      <button onClick={() => start(async () => { await deleteMedication(med.id, clientId); })} disabled={isPending} className="btn-pms btn-pms-sm" style={{ color: 'var(--red)' }}>
        {isPending ? '…' : 'Delete'}
      </button>
    </div>
  );
}

function MedicationForm({ clientId, defaults, onClose }: { clientId: string; defaults?: Medication; onClose: () => void }) {
  const [isPending, start] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('client_id', clientId);
    start(async () => { await (defaults ? updateMedication(fd) : addMedication(fd)); onClose(); });
  }
  return (
    <InlineForm onSubmit={handleSubmit} onCancel={onClose} isPending={isPending} submitLabel={defaults ? 'Update' : 'Add medication'}>
      {defaults && <input type="hidden" name="id" value={defaults.id} />}
      <Row>
        <Field label="Drug name *">
          <input name="drug_name" required defaultValue={defaults?.drug_name} className="pms-input" placeholder="e.g. Metformin" />
        </Field>
        <Field label="Dose *">
          <input name="dose" required defaultValue={defaults?.dose} className="pms-input" placeholder="e.g. 500mg" />
        </Field>
      </Row>
      <Row>
        <Field label="Frequency *">
          <input name="frequency" required defaultValue={defaults?.frequency} className="pms-input" placeholder="e.g. Twice daily" />
        </Field>
        <Field label="Indication">
          <input name="indication" defaultValue={defaults?.indication ?? ''} className="pms-input" placeholder="e.g. Diabetes" />
        </Field>
      </Row>
      <Row>
        <Field label="Start date *">
          <input name="start_date" type="date" required defaultValue={defaults?.start_date} className="pms-input" />
        </Field>
        <Field label="End date (leave blank if ongoing)">
          <input name="end_date" type="date" defaultValue={defaults?.end_date ?? ''} className="pms-input" />
        </Field>
      </Row>
      <Field label="Notes">
        <input name="notes" defaultValue={defaults?.notes ?? ''} className="pms-input" placeholder="Optional" />
      </Field>
    </InlineForm>
  );
}

function MedicationsSection({ clientId, medications }: { clientId: string; medications: Medication[] }) {
  const [adding, setAdding] = useState(false);
  const active   = medications.filter(m => !m.end_date);
  const inactive = medications.filter(m =>  m.end_date);

  return (
    <SectionShell title="Medications" count={medications.length}>
      {active.map(m => <MedicationRow key={m.id} med={m} clientId={clientId} />)}
      {inactive.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: 12, color: 'var(--ink-faint)', cursor: 'pointer', userSelect: 'none' }}>
            {inactive.length} stopped medication{inactive.length !== 1 ? 's' : ''}
          </summary>
          {inactive.map(m => <MedicationRow key={m.id} med={m} clientId={clientId} />)}
        </details>
      )}
      {adding
        ? <MedicationForm clientId={clientId} onClose={() => setAdding(false)} />
        : <AddButton onClick={() => setAdding(true)} />}
    </SectionShell>
  );
}

// ─── Family History ───────────────────────────────────────────────────────────

function FamilyRow({ entry, clientId }: { entry: FamilyHistoryEntry; clientId: string }) {
  const [editing, setEditing] = useState(false);
  const [isPending, start] = useTransition();

  if (editing) return <FamilyForm clientId={clientId} defaults={entry} onClose={() => setEditing(false)} />;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--hairline)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 14, color: 'var(--ink-muted)', fontWeight: 500 }}>{entry.relation}:</span>
        <span style={{ fontSize: 14, color: 'var(--ink)', marginLeft: 6 }}>{entry.condition}</span>
        {entry.notes && <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>{entry.notes}</p>}
      </div>
      <button onClick={() => setEditing(true)} className="btn-pms btn-pms-ghost btn-pms-sm">Edit</button>
      <button onClick={() => start(async () => { await deleteFamilyHistory(entry.id, clientId); })} disabled={isPending} className="btn-pms btn-pms-sm" style={{ color: 'var(--red)' }}>
        {isPending ? '…' : 'Delete'}
      </button>
    </div>
  );
}

function FamilyForm({ clientId, defaults, onClose }: { clientId: string; defaults?: FamilyHistoryEntry; onClose: () => void }) {
  const [isPending, start] = useTransition();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('client_id', clientId);
    start(async () => { await (defaults ? updateFamilyHistory(fd) : addFamilyHistory(fd)); onClose(); });
  }
  return (
    <InlineForm onSubmit={handleSubmit} onCancel={onClose} isPending={isPending} submitLabel={defaults ? 'Update' : 'Add entry'}>
      {defaults && <input type="hidden" name="id" value={defaults.id} />}
      <Row>
        <Field label="Relation *">
          <input name="relation" required defaultValue={defaults?.relation} className="pms-input" placeholder="e.g. Mother" />
        </Field>
        <Field label="Condition *">
          <input name="condition" required defaultValue={defaults?.condition} className="pms-input" placeholder="e.g. Diabetes" />
        </Field>
      </Row>
      <Field label="Notes">
        <input name="notes" defaultValue={defaults?.notes ?? ''} className="pms-input" placeholder="Optional" />
      </Field>
    </InlineForm>
  );
}

function FamilyHistorySection({ clientId, history }: { clientId: string; history: FamilyHistoryEntry[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <SectionShell title="Family history" count={history.length}>
      {history.map(e => <FamilyRow key={e.id} entry={e} clientId={clientId} />)}
      {adding
        ? <FamilyForm clientId={clientId} onClose={() => setAdding(false)} />
        : <AddButton onClick={() => setAdding(true)} />}
    </SectionShell>
  );
}

// ─── Social History ───────────────────────────────────────────────────────────

function SocialHistorySection({ clientId, social }: { clientId: string; social: SocialHistory | null }) {
  const [editing, setEditing] = useState(false);
  const [isPending, start] = useTransition();

  const handleSocialSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('client_id', clientId);
    start(async () => { await upsertSocialHistory(fd); setEditing(false); });
  };

  if (editing) {
    return (
      <SectionShell title="Social history" count={0}>
        <InlineForm onSubmit={handleSocialSubmit} onCancel={() => setEditing(false)} isPending={isPending} submitLabel="Save">
          <Row>
            <Field label="Smoking">
              <select name="smoking_status" defaultValue={social?.smoking_status ?? ''} className="pms-input">
                <option value="">—</option>
                <option value="never">Never</option>
                <option value="former">Former</option>
                <option value="current">Current</option>
              </select>
            </Field>
            <Field label="Details">
              <input name="smoking_details" defaultValue={social?.smoking_details ?? ''} className="pms-input" placeholder="e.g. 10/day for 20 years" />
            </Field>
          </Row>
          <Row>
            <Field label="Alcohol">
              <select name="alcohol_use" defaultValue={social?.alcohol_use ?? ''} className="pms-input">
                <option value="">—</option>
                <option value="none">None</option>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="heavy">Heavy</option>
              </select>
            </Field>
            <Field label="Details">
              <input name="alcohol_details" defaultValue={social?.alcohol_details ?? ''} className="pms-input" placeholder="Optional" />
            </Field>
          </Row>
          <Row>
            <Field label="Occupation">
              <input name="occupation" defaultValue={social?.occupation ?? ''} className="pms-input" placeholder="e.g. Teacher" />
            </Field>
            <Field label="Living situation">
              <input name="living_situation" defaultValue={social?.living_situation ?? ''} className="pms-input" placeholder="e.g. Lives alone" />
            </Field>
          </Row>
          <Field label="Other notes">
            <textarea name="other_notes" defaultValue={social?.other_notes ?? ''} rows={2} className="pms-input" placeholder="Anything else relevant…" />
          </Field>
        </InlineForm>
      </SectionShell>
    );
  }

  const hasSocial = social && Object.values(social).some(v => v !== null && v !== '');

  return (
    <SectionShell title="Social history" count={hasSocial ? 1 : 0}>
      {hasSocial ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', paddingTop: 4 }}>
          {social.smoking_status  && <SocialItem label="Smoking"    value={social.smoking_status + (social.smoking_details ? ` — ${social.smoking_details}` : '')} />}
          {social.alcohol_use     && <SocialItem label="Alcohol"    value={social.alcohol_use + (social.alcohol_details ? ` — ${social.alcohol_details}` : '')} />}
          {social.occupation      && <SocialItem label="Occupation" value={social.occupation} />}
          {social.living_situation && <SocialItem label="Living"    value={social.living_situation} />}
          {social.other_notes     && <SocialItem label="Notes"      value={social.other_notes} />}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--ink-faint)', paddingTop: 4 }}>No social history recorded.</p>
      )}
      <button onClick={() => setEditing(true)} className="btn-pms btn-pms-ghost btn-pms-sm" style={{ marginTop: 10 }}>
        {hasSocial ? 'Edit' : '+ Add'}
      </button>
    </SectionShell>
  );
}

function SocialItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="section-label" style={{ marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 13, color: 'var(--ink)' }}>{value}</p>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function MedicalRecordPanel({ clientId, allergies, problems, medications, familyHistory, socialHistory }: Props) {
  return (
    <div className="pms-card" style={{ padding: '0 24px' }}>
      <AllergiesSection      clientId={clientId} allergies={allergies} />
      <ProblemsSection       clientId={clientId} problems={problems} />
      <MedicationsSection    clientId={clientId} medications={medications} />
      <FamilyHistorySection  clientId={clientId} history={familyHistory} />
      <SocialHistorySection  clientId={clientId} social={socialHistory} />
    </div>
  );
}
