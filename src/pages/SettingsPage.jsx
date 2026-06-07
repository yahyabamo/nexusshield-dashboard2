import { useState, useEffect } from 'react'
import { supabase, LOG_LEVELS } from '../supabaseClient'
import { enrichWithSeverity, MOTION_SEVERITY_META } from '../motionSeverity'
import { useAuth } from '../authContext'
import { format } from 'date-fns'
import { Save, User, Terminal } from 'lucide-react'

export default function SettingsPage() {
    const { session } = useAuth()
    const [profile, setProfile] = useState({ full_name: '' })
    const [logs, setLogs] = useState([])
    const [savingProfile, setSavingProfile] = useState(false)
    const [logFilter, setLogFilter] = useState('all')
    const [activeTab, setActiveTab] = useState('profile')

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        const [profRes, logRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', session.user.id).single(),
            supabase.from('system_logs').select('*, devices(name)').order('created_at', { ascending: false }).limit(100),
        ])

        setLogs(logRes.data || [])
        if (profRes.data) setProfile(profRes.data)
    }

    async function saveProfile() {
        setSavingProfile(true)
        await supabase.from('profiles').update({ full_name: profile.full_name }).eq('id', session.user.id)
        setSavingProfile(false)
    }

    // Attach computed severity to each log entry (shared utility)
    const enrichedLogs = enrichWithSeverity(logs)

    const filteredLogs = logFilter === 'all'
        ? enrichedLogs
        : logFilter === 'high' || logFilter === 'medium' || logFilter === 'low'
            ? enrichedLogs.filter(l => l._severity === logFilter)
            : enrichedLogs.filter(l => l.log_level === logFilter)

    const tabs = [
        { id: 'profile', label: 'Profile', icon: <User size={13} /> },
        { id: 'logs', label: 'System Logs', icon: <Terminal size={13} /> },
    ]

    return (
        <div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            padding: '9px 16px',
                            background: 'none', border: 'none',
                            borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`,
                            color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                            fontFamily: 'var(--font-display)',
                            fontSize: 13, fontWeight: 600,
                            cursor: 'pointer',
                            marginBottom: -1,
                            transition: 'all 0.15s',
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>


            {/* ── PROFILE TAB ── */}
            {activeTab === 'profile' && (
                <div className="card" style={{ maxWidth: 480 }}>
                    <div className="card-header"><span className="card-title">Your Profile</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label className="label">Full Name</label>
                            <input
                                className="input"
                                value={profile.full_name || ''}
                                onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
                                placeholder="Your name"
                            />
                        </div>
                        <div>
                            <label className="label">Email</label>
                            <input className="input" value={session.user.email} disabled style={{ opacity: 0.5 }} />
                        </div>
                        <div>
                            <label className="label">Role</label>
                            <input className="input" value={profile.role || 'viewer'} disabled style={{ opacity: 0.5 }} />
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={saveProfile}
                            disabled={savingProfile}
                            style={{ alignSelf: 'flex-start' }}
                        >
                            {savingProfile ? 'Saving...' : <><Save size={13} /> Save Profile</>}
                        </button>
                    </div>
                </div>
            )}

            {/* ── SYSTEM LOGS TAB ── */}
            {activeTab === 'logs' && (
                <div>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                        {[
                            { key: 'all',    label: 'All',    color: 'var(--text-secondary)' },
                            { key: 'high',   label: 'High',   color: '#f87171' },
                            { key: 'medium', label: 'Medium', color: '#fbbf24' },
                            { key: 'low',    label: 'Low',    color: '#60a5fa' },
                            { key: 'info',   label: 'Info',   color: '#60a5fa' },
                            { key: 'warn',   label: 'Warn',   color: 'var(--yellow)' },
                            { key: 'error',  label: 'Error',  color: 'var(--red)' },
                        ].map(({ key, label, color }) => (
                            <button
                                key={key}
                                onClick={() => setLogFilter(key)}
                                className="btn"
                                style={{
                                    padding: '5px 12px', fontSize: 11, textTransform: 'uppercase',
                                    fontFamily: 'var(--font-mono)',
                                    background: logFilter === key ? 'var(--accent-dim)' : 'transparent',
                                    border: `1px solid ${logFilter === key ? 'rgba(0,229,255,0.3)' : 'var(--border-accent)'}`,
                                    color: logFilter === key ? 'var(--accent)' : color,
                                }}
                            >
                                {label}
                            </button>
                        ))}
                        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>
                            {filteredLogs.length} entries
                        </span>
                    </div>

                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        {filteredLogs.length === 0
                            ? <div className="empty-state">No logs found</div>
                            : (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Level</th>
                                            <th>Device</th>
                                            <th>Message</th>
                                            <th>Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLogs.map(log => {
                                            const sev = log._severity ? MOTION_SEVERITY_META[log._severity] : null
                                            const lc  = sev || LOG_LEVELS[log.log_level] || { color: '#fff' }
                                            const displayLabel = sev ? sev.label : log.log_level
                                            return (
                                                <tr key={log.id}>
                                                    <td>
                                                        <span className="badge mono" style={{
                                                            color: lc.color, background: lc.color + '18',
                                                            textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.1em',
                                                        }}>
                                                            {displayLabel}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                                                        {log.devices?.name || '—'}
                                                    </td>
                                                    <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 400 }}>
                                                        {log.message}
                                                    </td>
                                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                        {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            )
                        }
                    </div>
                </div>
            )}
        </div>
    )
}