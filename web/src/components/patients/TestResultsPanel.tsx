'use client';

import { useState, useTransition, useRef } from 'react';
import { updateTestResult, uploadTestResult, deleteTestResult } from '@/app/actions/test-results';

interface Result {
  id: string;
  file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  storage_path: string;
  patient_note: string | null;
  doctor_label: string | null;
  doctor_note: string | null;
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
      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ViewerModal({ result, onClose }: { result: Result; onClose: () => void }) {
  const isImage = result.mime_type?.startsWith('image/');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {result.doctor_label ?? result.file_name ?? 'Untitled'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(result.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              {result.file_size_bytes ? ` · ${formatBytes(result.file_size_bytes)}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3 ml-4 shrink-0">
            {result.signedUrl && (
              <a
                href={result.signedUrl}
                download={result.file_name ?? 'file'}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                Download
              </a>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center p-4">
          {!result.signedUrl ? (
            <p className="text-sm text-gray-400">File not available</p>
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={result.signedUrl}
              alt={result.doctor_label ?? result.file_name ?? 'Test result'}
              className="max-w-full max-h-[60vh] object-contain rounded-lg shadow"
            />
          ) : (
            <iframe
              src={result.signedUrl}
              className="w-full h-[60vh] rounded-lg border border-gray-200"
              title={result.file_name ?? 'PDF'}
            />
          )}
        </div>

        {/* Notes */}
        {(result.patient_note || result.doctor_note) && (
          <div className="px-5 py-3 border-t border-gray-100 space-y-1.5">
            {result.patient_note && (
              <p className="text-xs text-gray-500">
                <span className="font-medium text-gray-400 uppercase tracking-wide">Patient: </span>
                {result.patient_note}
              </p>
            )}
            {result.doctor_note && (
              <p className="text-xs text-gray-700">
                <span className="font-medium text-gray-400 uppercase tracking-wide">Doctor: </span>
                {result.doctor_note}
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
  const [isPending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateTestResult(formData);
      setEditing(false);
    });
  }

  function handleDelete() {
    if (!confirm('Delete this test result? This cannot be undone.')) return;
    startTransition(() => deleteTestResult(result.id, result.storage_path, clientId));
  }

  const date = new Date(result.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <>
      {viewing && <ViewerModal result={result} onClose={() => setViewing(false)} />}

      <div className="border border-gray-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          {/* Thumbnail / icon */}
          <button
            onClick={() => setViewing(true)}
            className="shrink-0 w-10 h-10 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
            title="View file"
          >
            {result.signedUrl && result.mime_type?.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={result.signedUrl}
                alt=""
                className="w-10 h-10 object-cover rounded-lg"
              />
            ) : (
              <FileIcon mimeType={result.mime_type} />
            )}
          </button>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800 font-medium truncate">
              {result.doctor_label ?? result.file_name ?? 'Untitled'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {date}{result.file_size_bytes ? ` · ${formatBytes(result.file_size_bytes)}` : ''}
            </p>
            {result.doctor_note && !editing && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{result.doctor_note}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setViewing(true)}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              View
            </button>
            {!editing && (
              <button onClick={() => setEditing(true)} className="text-xs text-gray-500 hover:text-gray-700">
                Edit
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
            >
              {isPending ? '…' : 'Del'}
            </button>
          </div>
        </div>

        {editing && (
          <form onSubmit={handleSave} className="mt-3 space-y-2 pt-3 border-t border-gray-100">
            <input type="hidden" name="id" value={result.id} />
            <input type="hidden" name="client_id" value={clientId} />
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Label</label>
              <input
                name="doctor_label"
                type="text"
                defaultValue={result.doctor_label ?? ''}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. CBC – Jan 2025"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Doctor note</label>
              <textarea
                name="doctor_note"
                defaultValue={result.doctor_note ?? ''}
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Internal note…"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
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
    <form onSubmit={handleSubmit} className="mb-4 border border-blue-100 bg-blue-50/40 rounded-xl p-4 space-y-3">
      <p className="text-xs font-medium text-blue-700">Upload test result</p>
      <input type="hidden" name="client_id" value={clientId} />

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">File</label>
        <input
          ref={fileRef}
          name="file"
          type="file"
          required
          accept="image/jpeg,image/png,image/gif,image/webp,image/heic,application/pdf"
          className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Label (optional)</label>
        <input
          name="doctor_label"
          type="text"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. CBC – Jan 2025"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Uploading…' : 'Upload'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function TestResultsPanel({ results, clientId }: Props) {
  const [uploading, setUploading] = useState(false);

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">Test results</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{results.length} total</span>
          {!uploading && (
            <button
              onClick={() => setUploading(true)}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              + Upload
            </button>
          )}
        </div>
      </div>

      {uploading && <UploadForm clientId={clientId} onClose={() => setUploading(false)} />}

      {results.length === 0 && !uploading ? (
        <p className="text-sm text-gray-400">No test results yet. Click &quot;+ Upload&quot; to add one.</p>
      ) : (
        <div className="space-y-3">
          {results.map((r) => (
            <ResultCard key={r.id} result={r} clientId={clientId} />
          ))}
        </div>
      )}
    </section>
  );
}
