import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react'

const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

// severity -> styling map
const TOAST_STYLES = {
  high:   { icon: XCircle,      accent: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)'   },
  medium: { icon: AlertTriangle, accent: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)'  },
  low:    { icon: CheckCircle,  accent: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)'  },
  info:   { icon: Info,         accent: '#00e5ff', bg: 'rgba(0,229,255,0.10)',  border: 'rgba(0,229,255,0.25)'  },
}

let nextId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    // mark as leaving so the exit animation plays
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      delete timers.current[id]
    }, 350) // matches CSS transition duration
  }, [])

  const addToast = useCallback(({ type = 'info', title, message }) => {
    const id = ++nextId
    setToasts(prev => [...prev, { id, type, title, message, leaving: false }])

    // auto-dismiss after 5 seconds
    timers.current[id] = setTimeout(() => dismiss(id), 5000)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast stack — bottom right */}
      <div style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
      }}>
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function Toast({ toast, onDismiss }) {
  const style = TOAST_STYLES[toast.type] ?? TOAST_STYLES.info
  const Icon = style.icon

  return (
    <div
      style={{
        pointerEvents: 'all',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '13px 16px',
        background: '#0d1117',
        border: `1px solid ${style.border}`,
        borderLeft: `3px solid ${style.accent}`,
        borderRadius: 10,
        minWidth: 280,
        maxWidth: 360,
        boxShadow: `0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.05)`,
        backdropFilter: 'blur(12px)',
        animation: toast.leaving ? 'toastOut 0.35s ease forwards' : 'toastIn 0.3s ease',
        position: 'relative',
      }}
    >
      {/* Colored glow bg */}
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 10,
        background: style.bg,
        pointerEvents: 'none',
      }} />

      {/* Icon */}
      <div style={{ color: style.accent, flexShrink: 0, marginTop: 1, position: 'relative', zIndex: 1 }}>
        <Icon size={16} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 13,
          color: '#e8edf2',
          lineHeight: 1.3,
        }}>
          {toast.title}
        </div>
        {toast.message && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: '#7a8899',
            marginTop: 3,
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {toast.message}
          </div>
        )}
        {/* Shrinking progress bar */}
        <div style={{
          marginTop: 8,
          height: 2,
          borderRadius: 2,
          background: `${style.accent}33`,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            background: style.accent,
            animation: 'toastProgress 5s linear forwards',
            transformOrigin: 'left',
          }} />
        </div>
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#3d4f62',
          padding: 2,
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
          lineHeight: 1,
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#e8edf2'}
        onMouseLeave={e => e.currentTarget.style.color = '#3d4f62'}
      >
        <X size={14} />
      </button>
    </div>
  )
}
