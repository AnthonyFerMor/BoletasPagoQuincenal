'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const icons = {
    success: <CheckCircle size={18} />,
    error: <AlertTriangle size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />,
  };

  const colors = {
    success: { bg: 'rgba(16, 185, 129, 0.15)', border: 'var(--accent-500)', text: 'var(--accent-400)' },
    error: { bg: 'rgba(239, 68, 68, 0.15)', border: 'var(--status-danger)', text: '#f87171' },
    warning: { bg: 'rgba(245, 158, 11, 0.15)', border: 'var(--status-warning)', text: '#fbbf24' },
    info: { bg: 'rgba(59, 130, 246, 0.15)', border: 'var(--status-info)', text: '#60a5fa' },
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast Container */}
      <div style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: '0.75rem',
        zIndex: 9999,
        pointerEvents: 'none',
      }}>
        {toasts.map((toast) => {
          const c = colors[toast.type] || colors.info;
          return (
            <div
              key={toast.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1.25rem',
                background: c.bg,
                backdropFilter: 'blur(12px)',
                border: `1px solid ${c.border}`,
                borderRadius: 'var(--radius-md)',
                color: c.text,
                fontSize: '0.875rem',
                fontWeight: 500,
                boxShadow: 'var(--shadow-lg)',
                animation: 'slideUp 0.25s ease',
                pointerEvents: 'auto',
                maxWidth: '400px',
              }}
            >
              {icons[toast.type]}
              <span style={{ flex: 1 }}>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  padding: '2px',
                  opacity: 0.7,
                }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
