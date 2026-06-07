// ── Shared motion-severity classifier ─────────────────────────────────────
// Rules (only for entries whose message / event_type indicates motion):
//   HIGH   → logged between 00:00 and 05:59  (midnight-6 am)
//   MEDIUM → another motion from the same device within 30 seconds
//   LOW    → everything else
//
// Returns 'high' | 'medium' | 'low' | null
// null means the entry is NOT a motion event — callers should fall back to
// the raw severity / log_level stored in the database.

export const MOTION_SEVERITY_META = {
    high:   { label: 'High',   color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
    medium: { label: 'Medium', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)'  },
    low:    { label: 'Low',    color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
}

/**
 * Determine whether an entry represents a motion event.
 * Works for both `events` rows (event_type field) and
 * `system_logs` rows (message field).
 */
function isMotionEntry(entry) {
    if (entry.event_type === 'motion') return true
    if (typeof entry.message === 'string' &&
        entry.message.toLowerCase().includes('motion')) return true
    return false
}

/**
 * Compute a motion severity for a single entry given the full list.
 * @param {object} entry  - the event or log row
 * @param {object[]} all  - full array of event/log rows for clustering
 * @returns {'high'|'medium'|'low'|null}
 */
export function computeMotionSeverity(entry, all) {
    if (!isMotionEntry(entry)) return null

    const ts   = new Date(entry.created_at)
    const hour = ts.getHours()

    // HIGH — night window 00:00 – 05:59
    if (hour >= 0 && hour < 6) return 'high'

    // MEDIUM — another motion on the same device within 30 s
    const WINDOW_MS = 30_000
    const hasCluster = all.some(other =>
        other.id !== entry.id &&
        isMotionEntry(other) &&
        other.device_id === entry.device_id &&
        Math.abs(new Date(other.created_at) - ts) <= WINDOW_MS
    )
    if (hasCluster) return 'medium'

    return 'low'
}

/**
 * Enrich an array of entries with a `_severity` field.
 * Non-motion entries get `_severity = null`.
 */
export function enrichWithSeverity(entries) {
    return entries.map(e => ({
        ...e,
        _severity: computeMotionSeverity(e, entries),
    }))
}

/**
 * Return the display meta { label, color, bg } for an entry.
 * Falls back to a raw-level lookup via the fallbackMap if not a motion entry.
 *
 * @param {object} entry        - enriched entry (has _severity)
 * @param {object} fallbackMap  - e.g. SEVERITY or LOG_LEVELS from supabaseClient
 */
export function getSeverityMeta(entry, fallbackMap = {}) {
    if (entry._severity) return MOTION_SEVERITY_META[entry._severity]
    return fallbackMap[entry.severity] || fallbackMap[entry.log_level] || { label: entry.severity || entry.log_level || '—', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' }
}
