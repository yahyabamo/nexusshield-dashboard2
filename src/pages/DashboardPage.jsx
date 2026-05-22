import { useState, useEffect } from 'react'
import { supabase, EVENT_TYPES, SEVERITY } from '../supabaseClient'
import { formatDistanceToNow } from 'date-fns'
import { Activity, Camera, AlertTriangle, Clock } from 'lucide-react'

export default function DashboardPage() {
    const [stats, setStats] = useState({ todayEvents: 0, activeDevices: 0, highSeverity: 0, lastEvent: null })
    const [recentEvents, setRecent] = useState([])
    const [devices, setDevices] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchAll()
        // Refresh stats every 30 seconds
        const interval = setInterval(fetchAll, 30000)
        return () => clearInterval(interval)
    }, [])

    async function fetchAll() {
        const today = new Date(); today.setHours(0, 0, 0, 0)

        const [eventsRes, devicesRes, recentRes, highRes] = await Promise.all([
            supabase.from('events').select('id', { count: 'exact' })
                .gte('created_at', today.toISOString()),
            supabase.from('devices').select('*'),
            supabase.from('events').select('*, devices(name), snapshots(image_url)')
                .order('created_at', { ascending: false }).limit(8),
            supabase.from('events').select('id', { count: 'exact' })
                .eq('severity', 'high').gte('created_at', today.toISOString()),
        ])

        const activeCount = devicesRes.data?.filter(d => d.status === 'online').length || 0
        const lastEventTime = recentRes.data?.[0]?.created_at

        setStats({
            todayEvents: eventsRes.count || 0,
            activeDevices: activeCount,
            highSeverity: highRes.count || 0,
            lastEvent: lastEventTime,
        })
        setDevices(devicesRes.data || [])
        setRecent(recentRes.data || [])
        setLoading(false)
    }

    if (loading) return (
        <div className="empty-state"><div className="spinner" /></div>
    )

    return (
        <div>
            {/* Stats row */}
            <div className="stats-grid">
                <StatCard
                    label="Events Today"
                    value={stats.todayEvents}
                    sub="motion detections"
                    color="var(--accent)"
                    icon={<Activity size={16} />}
                />
                <StatCard
                    label="Active Cameras"
                    value={`${stats.activeDevices}/${devices.length}`}
                    sub="devices online"
                    color="var(--green)"
                    icon={<Camera size={16} />}
                />
                <StatCard
                    label="High Severity"
                    value={stats.highSeverity}
                    sub="today"
                    color="var(--red)"
                    icon={<AlertTriangle size={16} />}
                />
                <StatCard
                    label="Last Activity"
                    value={stats.lastEvent ? formatDistanceToNow(new Date(stats.lastEvent), { addSuffix: false }) : '—'}
                    sub="ago"
                    color="var(--purple)"
                    icon={<Clock size={16} />}
                />
            </div>

            <div className="grid-2">
                {/* Recent Events */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Recent Events</span>
                    </div>
                    {recentEvents.length === 0
                        ? <div className="empty-state">No events yet</div>
                        : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Device</th>
                                        <th>Severity</th>
                                        <th>Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentEvents.map(ev => {
                                        const et = EVENT_TYPES[ev.event_type] || { label: ev.event_type, color: '#fff' }
                                        const sv = SEVERITY[ev.severity] || SEVERITY.low
                                        return (
                                            <tr key={ev.id}>
                                                <td>
                                                    <span className="badge" style={{ color: et.color, background: et.color + '18' }}>
                                                        <span className="badge-dot" style={{ background: et.color }} />
                                                        {et.label}
                                                    </span>
                                                </td>
                                                <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                                                    {ev.devices?.name || 'Unknown'}
                                                </td>
                                                <td>
                                                    <span className="badge" style={{ color: sv.color, background: sv.bg }}>
                                                        {sv.label}
                                                    </span>
                                                </td>
                                                <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                                                    {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )
                    }
                </div>

                {/* Device Status */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Device Status</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {devices.length === 0
                            ? <div className="empty-state">No devices registered</div>
                            : devices.map(dev => (
                                <DeviceStatusRow key={dev.id} device={dev} />
                            ))
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatCard({ label, value, sub, color, icon }) {
    return (
        <div className="stat-card" style={{ '--accent-color': color }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="stat-label">{label}</div>
                <div style={{ color, opacity: 0.7 }}>{icon}</div>
            </div>
            <div className="stat-value">{value}</div>
            <div className="stat-sub">{sub}</div>
        </div>
    )
}

function DeviceStatusRow({ device }) {
    const isOnline = device.status === 'online'
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: isOnline ? 'rgba(16,185,129,0.1)' : 'var(--bg-hover)',
                    border: `1px solid ${isOnline ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Camera size={14} color={isOnline ? 'var(--green)' : 'var(--text-muted)'} />
                </div>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{device.name}</div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {device.location || 'No location set'}
                    </div>
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <span className="badge" style={{
                    color: isOnline ? 'var(--green)' : 'var(--text-muted)',
                    background: isOnline ? 'rgba(16,185,129,0.12)' : 'var(--bg-hover)',
                }}>
                    <span className="badge-dot" style={{ background: isOnline ? 'var(--green)' : 'var(--text-muted)' }} />
                    {isOnline ? 'Online' : 'Offline'}
                </span>
                {device.last_seen_at && (
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 3 }}>
                        {formatDistanceToNow(new Date(device.last_seen_at), { addSuffix: true })}
                    </div>
                )}
            </div>
        </div>
    )
}