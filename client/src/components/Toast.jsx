import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  if (!message) return null;

  const isSuccess = type === 'success';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.875rem 1.25rem',
        borderRadius: '12px',
        backgroundColor: isSuccess ? '#ecfdf5' : '#fef2f2',
        color: isSuccess ? '#065f46' : '#991b1b',
        border: `1px solid ${isSuccess ? '#a7f3d0' : '#fecaca'}`,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
        maxWidth: '420px',
        animation: 'fadeIn 0.25s ease'
      }}
    >
      {isSuccess ? (
        <CheckCircle2 size={20} className="shrink-0" style={{ color: '#10b981' }} />
      ) : (
        <AlertCircle size={20} className="shrink-0" style={{ color: '#ef4444' }} />
      )}
      <span style={{ fontSize: '0.9rem', fontWeight: 500, flex: 1 }}>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{ color: 'inherit', opacity: 0.7, padding: '2px', display: 'flex' }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
