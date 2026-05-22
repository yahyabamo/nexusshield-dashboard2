import { useState, useEffect } from 'react'
import { supabase, LOG_LEVELS } from '../supabaseClient'
import { useAuth } from '../authContext'
import { format } from 'date-fns'
import { Save, Camera, User, Terminal } from 'lucide-react'

export default function SettingsPage() {
    const { session } = useAuth()
    const [devices, setDevices] = useState([])
    const [configs, setConfigs] = useState({})   // { device_id: config }
    const [profile, setProfile] = useState({ full_name: '' })
    const [logs, setLogs] = useState([])
    const [saving, setSaving] = useState({})   // { device_id: bool }
    const [savingProfile, setSavingProfile] = useState(false)
    const [saved, setSaved] = useState({})   // { device_id: bool } for feedback
    const [logFilter, setLogFilter] = useState('all')
    const [activeTab, setActiveTab] = useState('devices')

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        const [devRes, cfgRes, profRes, logRes] = await Promise.all([
            supabase.from('devices').select('*'),
            supabase.from('device_config').select('*'),
            supabase.from('profiles').select('*').eq('id', session.user.id).single(),
            supabase.from('system_logs').select('*, devices(name)').order('created_at', { ascending: false }).limit(100),
        ])

        setDevices(devRes.data || [])
        setLogs(logRes.data || [])

        // Map configs by device_id for easy lookup
        const cfgMap = {}
            ; (cfgRes.data || []).forEach(c => { cfgMap[c.device_id] = { ...c } })
        setConfigs(cfgMap)

        if (profRes.data) setProfile(profRes.data)
    }

    function updateConfig(deviceId, field, value) {
        setConfigs(prev => ({
            ...prev,
            [deviceId]: { ...prev[deviceId], [field]: value }
        }))
    }

    async function saveConfig(deviceId) {
        setSaving(p => ({ ...p, [deviceId]: true }))
        const cfg = configs[deviceId]

        const { error } = await supabase
            .from('device_config')
            .upsert({
                device_id: deviceId,
                sensitivity: cfg.sensitivity,
                detection_cooldown: cfg.detection_cooldown,
                alert_enabled: cfg.alert_enabled,
                updated_at: new Date().toISOString(),
                updated_by: session.user.id,
            }, { onConflict: 'device_id' })

        setSaving(p => ({ ...p, [deviceId]: false }))
        if (!error) {
            setSaved(p => ({ ...p, [deviceId]: true }))
            setTimeout(() => setSaved(p => ({ ...p, [deviceId]: false })), 2000)
        }
    }

    async function saveProfile() {
        setSavingProfile(true)
        await supabase.from('profiles').update({ full_name: profile.full_name }).eq('id', session.user.id)
        setSavingProfile(false)
    }

    const filteredLogs = logFilter === 'all' ? logs : logs.filter(l => l.log_level === logFilter)

    const tabs = [
        { id: 'devices', label: 'Device Config', icon: <Camera size={13} /> },
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

            {/* ── DEVICE CONFIG TAB ── */}
            {activeTab === 'devices' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {devices.length === 0 && <div className="empty-state">No devices registered</div>}
                    {devices.map(dev => {
                        const cfg = configs[dev.id] || { sensitivity: 5, detection_cooldown: 15, alert_enabled: true }
                        const isSaving = saving[dev.id]
                        const wasSaved = saved[dev.id]

                        return (
                            <div key={dev.id} className="card">
                                {/* Device header */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{
                                            width: 36, height: 36, borderRadius: 10,
                                            background: dev.status === 'online' ? 'rgba(16,185,129,0.1)' : 'var(--bg-hover)',
                                            border: `1px solid ${dev.status === 'online' ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Camera size={16} color={dev.status === 'online' ? 'var(--green)' : 'var(--text-muted)'} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 14 }}>{dev.name}</div>
                                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                                                {dev.location || 'No location'} · {dev.id.slice(0, 8)}…
                                            </div>
                                        </div>
                                    </div>
                                    <span className="badge" style={{
                                        color: dev.status === 'online' ? 'var(--green)' : 'var(--text-muted)',
                                        background: dev.status === 'online' ? 'rgba(16,185,129,0.12)' : 'var(--bg-hover)',
                                    }}>
                                        <span className="badge-dot" style={{ background: dev.status === 'online' ? 'var(--green)' : 'var(--text-muted)' }} />
                                        {dev.status}
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                    {/* Sensitivity slider */}
                                    <div>
                                        <label className="label">
                                            Motion Sensitivity
                                            <span style={{ color: 'var(--accent)', marginLeft: 8 }}>{cfg.sensitivity} / 10</span>
                                        </label>
                                        <input
                                            type="range" min="1" max="10" step="1"
                                            className="slider"
                                            value={cfg.sensitivity}
                                            onChange={e => updateConfig(dev.id, 'sensitivity', parseInt(e.target.value))}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Low</span>
                                            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>High</span>
                                        </div>
                                    </div>

                                    {/* Cooldown */}
                                    <div>
                                        <label className="label">
                                            Detection Cooldown
                                            <span style={{ color: 'var(--accent)', marginLeft: 8 }}>{cfg.detection_cooldown}s</span>
                                        </label>
                                        <input
                                            type="range" min="5" max="120" step="5"
                                            className="slider"
                                            value={cfg.detection_cooldown}
                                            onChange={e => updateConfig(dev.id, 'detection_cooldown', parseInt(e.target.value))}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>5s</span>
                                            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>120s</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Alert toggle + save */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <label className="toggle">
                                            <input
                                                type="checkbox"
                                                checked={cfg.alert_enabled}
                                                onChange={e => updateConfig(dev.id, 'alert_enabled', e.target.checked)}
                                            />
                                            <span className="toggle-track" />
                                        </label>
                                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                            {cfg.alert_enabled ? 'Alerts enabled' : 'Alerts disabled'}
                                        </span>
                                    </div>

                                    <button
                                        className="btn btn-primary"
                                        onClick={() => saveConfig(dev.id)}
                                        disabled={isSaving}
                                        style={{ opacity: isSaving ? 0.7 : 1 }}
                                    >
                                        {isSaving ? (
                                            <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 2, borderTopColor: '#000' }} /> Saving...</>
                                        ) : wasSaved ? (
                                            '✓ Saved'
                                        ) : (
                                            <><Save size={13} /> Save Config</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

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
                        {['all', 'info', 'warn', 'error'].map(level => (
                            <button
                                key={level}
                                onClick={() => setLogFilter(level)}
                                className="btn"
                                style={{
                                    padding: '5px 12px', fontSize: 11, textTransform: 'uppercase',
                                    fontFamily: 'var(--font-mono)',
                                    background: logFilter === level ? 'var(--accent-dim)' : 'transparent',
                                    border: `1px solid ${logFilter === level ? 'rgba(0,229,255,0.3)' : 'var(--border-accent)'}`,
                                    color: logFilter === level ? 'var(--accent)'
                                        : level === 'error' ? 'var(--red)'
                                            : level === 'warn' ? 'var(--yellow)'
                                                : level === 'info' ? '#60a5fa'
                                                    : 'var(--text-secondary)',
                                }}
                            >
                                {level}
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
                                            const lc = LOG_LEVELS[log.log_level] || { color: '#fff' }
                                            return (
                                                <tr key={log.id}>
                                                    <td>
                                                        <span className="badge mono" style={{
                                                            color: lc.color, background: lc.color + '18',
                                                            textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.1em',
                                                        }}>
                                                            {log.log_level}
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