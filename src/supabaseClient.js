import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

supabase.from('profiles').select('count').then(({ data, error }) => {
    if (error) console.error('Supabase connection error:', error)
    else console.log('Supabase connected successfully:', data)
})

// ── Event types ────────────────────────────────────────────────────────────
export const EVENT_TYPES = {
    motion: { label: 'Motion', color: '#f59e0b' },
    door: { label: 'Door Opened', color: '#f97316' },
    person_detected: { label: 'Person Detected', color: '#ef4444' },
    camera_offline: { label: 'Camera Offline', color: '#6b7280' },
    camera_online: { label: 'Camera Online', color: '#10b981' },
    system_error: { label: 'System Error', color: '#8b5cf6' },
}

// ── Severity ───────────────────────────────────────────────────────────────
export const SEVERITY = {
    low: { label: 'Low', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    medium: { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    high: { label: 'High', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
}

// ── Log levels ─────────────────────────────────────────────────────────────
export const LOG_LEVELS = {
    info: { color: '#60a5fa' },
    warn: { color: '#f59e0b' },
    error: { color: '#ef4444' },
}