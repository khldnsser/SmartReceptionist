'use client';

interface Props {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: Props) {
  const isDanger = variant === 'danger';

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        style={{
          background: 'var(--canvas)',
          borderRadius: 'var(--r-lg)',
          width: '100%',
          maxWidth: 400,
          boxShadow: 'rgba(0,0,0,0.18) 0 20px 60px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '24px 24px 20px' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: description ? 8 : 20 }}>
            {title}
          </p>
          {description && (
            <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginBottom: 20, lineHeight: 1.5 }}>
              {description}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onCancel} className="btn-pms btn-pms-ghost btn-pms-sm">
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="btn-pms btn-pms-primary btn-pms-sm"
              style={isDanger ? { background: 'var(--red)', borderColor: 'var(--red)' } : undefined}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
