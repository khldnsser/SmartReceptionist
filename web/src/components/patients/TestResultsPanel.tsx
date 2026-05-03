'use client';

import { useState, useTransition, useRef } from 'react';
import { updateTestResult, uploadTestResult, deleteTestResult } from '@/app/actions/test-results';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';

interface Result {
  id: string;
  file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  storage_path: string;
  patient_note: string | null;
  doctor_label: string | null;
  doctor_note: string | null;
  uploaded_via: 'whatsapp' | 'web' | null;
  created_at: string;
  signedUrl: string | null;
}

interface Props {
  results: Result[];
  clientId: string;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string | null }) {
  if (mimeType?.startsWith('image/')) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.8" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.8" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

function ViewerModal({ result, onClose }: { result: Result; onClose: () => void }) {
  const isImage = result.mime_type?.startsWith('image/');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        style={{ background: 'var(--canvas)', borderRadius: 'var(--r-lg)', width: '100%', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'rgba(0,0,0,0.18) 0 20px 60px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--hairline)', flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {result.doctor_label ?? result.file_name ?? 'Untitled'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>
              {new Date(result.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              {result.file_size_bytes ? ` · ${formatBytes(result.file_size_bytes)}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 16, flexShrink: 0 }}>
            {result.signedUrl && (
              <button
                style={{ fontSize: 13, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onClick={async (e) => {
                  e.stopPropagation();
                  const blob = await fetch(result.signedUrl!).then(r => r.blob());
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = result.file_name ?? 'file';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download
              </button>
            )}
            <button onClick={onClose} className="modal-close" style={{ position: 'static', width: 28, height: 28 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--parchment)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          {!result.signedUrl ? (
            <p style={{ fontSize: 14, color: 'var(--ink-faint)' }}>File not available</p>
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={result.signedUrl} alt={result.doctor_label ?? result.file_name ?? 'Test result'} style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: 'var(--r-md)' }} />
          ) : (
            <iframe src={result.signedUrl} style={{ width: '100%', height: '60vh', borderRadius: 'var(--r-md)', border: '1px solid var(--hairline)' }} title={result.file_name ?? 'PDF'} />
          )}
        </div>

        {(result.patient_note || result.doctor_note) && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--hairline)', flexShrink: 0 }}>
            {result.patient_note && (
              <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>
                <span className="section-label" style={{ marginRight: 6 }}>Patient:</span>{result.patient_note}
              </p>
            )}
            {result.doctor_note && (
              <p style={{ fontSize: 12, color: 'var(--ink)' }}>
                <span className="section-label" style={{ marginRight: 6 }}>Doctor:</span>{result.doctor_note}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({ result, clientId }: { result: Result; clientId: string }) {
  const [editing, setEditing] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateTestResult(formData);
      if (res?.ok === false) {
        addToast(res.error ?? 'Failed to save', 'error');
      } else {
        addToast('Saved', 'success');
        setEditing(false);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteTestResult(result.id, result.storage_path, clientId);
      addToast('Test result deleted', 'success');
    });
  }

  const date = new Date(result.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <>
      {viewing && <ViewerModal result={result} onClose={() => setViewing(false)} />}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete test result?"
          description="This cannot be undone."
          confirmText="Delete"
          variant="danger"
          onConfirm={() => { setConfirmDelete(false); handleDelete(); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      <div style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--r-md)', padding: 14, display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Thumbnail / icon */}
          <button
            onClick={() => setViewing(true)}
            style={{ width: 36, height: 36, background: 'var(--parchment)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, overflow: 'hidden', padding: 0 }}
            title="View file"
          >
            {result.signedUrl && result.mime_type?.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result.signedUrl} alt="" style={{ width: 36, height: 36, objectFit: 'cover' }} />
            ) : (
              <FileIcon mimeType={result.mime_type} />
            )}
          </button>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>
                {result.doctor_label ?? result.file_name ?? 'Untitled'}
              </p>
              {result.uploaded_via === 'whatsapp' && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 'var(--r-pill)', background: 'rgba(21,128,61,0.10)', color: '#15803d', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  WhatsApp
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 1 }}>
              {date}{result.file_size_bytes ? ` · ${formatBytes(result.file_size_bytes)}` : ''}
            </p>
            {result.doctor_note && !editing && (
              <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>{result.doctor_note}</p>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => setViewing(true)} className="btn-pms btn-pms-ghost btn-pms-sm">View</button>
            {!editing && (
              <button onClick={() => setEditing(true)} className="btn-pms btn-pms-ghost btn-pms-sm">Edit</button>
            )}
            <button onClick={() => setConfirmDelete(true)} disabled={isPending} className="btn-pms btn-pms-sm" style={{ color: 'var(--red)', fontSize: 13 }}>
              {isPending ? '…' : 'Delete'}
            </button>
          </div>
        </div>

        {editing && (
          <form onSubmit={handleSave} style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input type="hidden" name="id" value={result.id} />
            <input type="hidden" name="client_id" value={clientId} />
            <div>
              <label className="field-label">Label</label>
              <input name="doctor_label" type="text" defaultValue={result.doctor_label ?? ''} className="pms-input" placeholder="e.g. CBC – Jan 2025" />
            </div>
            <div>
              <label className="field-label">Doctor note</label>
              <textarea name="doctor_note" defaultValue={result.doctor_note ?? ''} rows={2} className="pms-input" placeholder="Internal note…" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={isPending} className="btn-pms btn-pms-primary btn-pms-sm">
                {isPending ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn-pms btn-pms-ghost btn-pms-sm">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

function UploadForm({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await uploadTestResult(formData);
      onClose();
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 16, border: '1px solid rgba(0,102,204,0.2)', background: 'rgba(0,102,204,0.04)', borderRadius: 'var(--r-md)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--blue)' }}>Upload test result</p>
      <input type="hidden" name="client_id" value={clientId} />

      <div>
        <label className="field-label">File</label>
        <input
          ref={fileRef}
          name="file"
          type="file"
          required
          accept="image/jpeg,image/png,image/gif,image/webp,image/heic,application/pdf"
          style={{ display: 'block', width: '100%', fontSize: 13, color: 'var(--ink-muted)', cursor: 'pointer' }}
        />
      </div>

      <div>
        <label className="field-label">Label (optional)</label>
        <input name="doctor_label" type="text" className="pms-input" placeholder="e.g. CBC – Jan 2025" />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={isPending} className="btn-pms btn-pms-primary btn-pms-sm">
          {isPending ? 'Uploading…' : 'Upload'}
        </button>
        <button type="button" onClick={onClose} className="btn-pms btn-pms-ghost btn-pms-sm">Cancel</button>
      </div>
    </form>
  );
}

export default function TestResultsPanel({ results, clientId }: Props) {
  const [uploading, setUploading] = useState(false);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.224px' }}>Test results</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{results.length} total</span>
          {!uploading && (
            <button onClick={() => setUploading(true)} className="btn-pms btn-pms-secondary btn-pms-sm" style={{ gap: 5 }}>
              <UploadIcon /> Upload
            </button>
          )}
        </div>
      </div>

      {uploading && <UploadForm clientId={clientId} onClose={() => setUploading(false)} />}

      {results.length === 0 && !uploading ? (
        <div className="pms-card">
          <p style={{ fontSize: 14, color: 'var(--ink-faint)' }}>No test results yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {results.map((r) => (
            <ResultCard key={r.id} result={r} clientId={clientId} />
          ))}
        </div>
      )}
    </div>
  );
}
