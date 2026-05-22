import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns'

const CHART_COLORS = ['#00e5ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
const DAYS_OPTIONS = [7, 14, 30]

const tooltipStyle = {
    contentStyle: {
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-accent)',
        borderRadius: 8,
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--text-primary)',
    },
    itemStyle: { color: 'var(--text-secondary)' },
    labelStyle: { color: 'var(--text-primary)', fontWeight: 600 },
}

export default function AnalyticsPage() {
    const [days, setDays] = useState(7)
    const [loading, setLoading] = useState(true)

    const [lineData, setLineData] = useState([])
    const [donutData, setDonutData] = useState([])
    const [peakData, setPeakData] = useState([])
    const [heatmapData, setHeatmap] = useState([])
    const [uptimeData, setUptime] = useState([])

    useEffect(() => { fetchAll() }, [days])

    async function fetchAll() {
        setLoading(true)
        const from = subDays(new Date(), days).toISOString()

        const [eventsRes, devicesRes] = await Promise.all([
            supabase.from('events').select('event_type, severity, created_at, device_id').gte('created_at', from),
            supabase.from('devices').select('id, name'),
        ])

        const events = eventsRes.data || []
        const devices = devicesRes.data || []

        // ── 1. Events over time (line chart) ──────────────────────────────────
        const dayRange = eachDayOfInterval({ start: subDays(new Date(), days - 1), end: new Date() })
        const byDay = {}
        dayRange.forEach(d => { byDay[format(d, 'MMM d')] = 0 })
        events.forEach(ev => {
            const key = format(new Date(ev.created_at), 'MMM d')
            if (byDay[key] !== undefined) byDay[key]++
        })
        setLineData(Object.entries(byDay).map(([date, count]) => ({ date, count })))

        // ── 2. Event type breakdown (donut) ────────────────────────────────────
        const typeCounts = {}
        events.forEach(ev => { typeCounts[ev.event_type] = (typeCounts[ev.event_type] || 0) + 1 })
        setDonutData(Object.entries(typeCounts).map(([name, value]) => ({
            name: name.replace('_', ' '),
            value,
        })))

        // ── 3. Peak hours (bar chart, 0-23) ───────────────────────────────────
        const hourCounts = Array(24).fill(0)
        events.forEach(ev => { hourCounts[new Date(ev.created_at).getHours()]++ })
        setPeakData(hourCounts.map((count, hour) => ({
            hour: `${String(hour).padStart(2, '0')}:00`,
            count,
        })))

        // ── 4. Heatmap: day-of-week × hour ────────────────────────────────────
        const DAYS_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const grid = Array(7).fill(null).map(() => Array(24).fill(0))
        events.forEach(ev => {
            const d = new Date(ev.created_at)
            grid[d.getDay()][d.getHours()]++
        })
        setHeatmap(grid.map((hours, di) => ({ day: DAYS_LABELS[di], hours })))

        // ── 5. Device uptime (from events / heartbeats count) ─────────────────
        const devEventCounts = {}
        devices.forEach(d => { devEventCounts[d.id] = { name: d.name, events: 0 } })
        events.forEach(ev => {
            if (devEventCounts[ev.device_id]) devEventCounts[ev.device_id].events++
        })
        setUptime(Object.values(devEventCounts).map(d => ({ name: d.name, events: d.events })))

        setLoading(false)
    }

    if (loading) return <div className="empty-state"><div className="spinner" /></div>

    // Heatmap max value for color scaling
    const heatMax = Math.max(1, ...heatmapData.flatMap(row => row.hours))

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Day range toggle */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                {DAYS_OPTIONS.map(d => (
                    <button
                        key={d}
                        onClick={() => setDays(d)}
                        className="btn"
                        style={{
                            padding: '5px 14px', fontSize: 11,
                            background: days === d ? 'var(--accent-dim)' : 'transparent',
                            border: `1px solid ${days === d ? 'rgba(0,229,255,0.3)' : 'var(--border-accent)'}`,
                            color: days === d ? 'var(--accent)' : 'var(--text-secondary)',
                            fontFamily: 'var(--font-mono)',
                        }}
                    >
                        {d}D
                    </button>
                ))}
            </div>

            {/* Row 1: Line + Donut */}
            <div className="grid-2">
                {/* Events over time */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Events Over Time</span>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={lineData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-muted)' }} />
                            <YAxis tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-muted)' }} />
                            <Tooltip {...tooltipStyle} />
                            <Line type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Event type donut */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Event Breakdown</span>
                    </div>
                    {donutData.length === 0
                        ? <div className="empty-state">No data</div>
                        : (
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                                        {donutData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip {...tooltipStyle} />
                                    <Legend
                                        iconType="circle"
                                        iconSize={8}
                                        wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        )
                    }
                </div>
            </div>

            {/* Row 2: Peak hours */}
            <div className="card">
                <div className="card-header">
                    <span className="card-title">Peak Activity Hours</span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={peakData} barSize={14}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="hour" tick={{ fontSize: 9, fontFamily: 'var(--font-mono)', fill: 'var(--text-muted)' }} interval={1} />
                        <YAxis tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-muted)' }} />
                        <Tooltip {...tooltipStyle} />
                        <Bar dataKey="count" fill="var(--accent)" radius={[3, 3, 0, 0]} fillOpacity={0.85} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Row 3: Heatmap */}
            <div className="card">
                <div className="card-header">
                    <span className="card-title">Activity Heatmap — Day × Hour</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ width: 32 }} />
                        {Array(24).fill(0).map((_, h) => (
                            <div key={h} style={{
                                width: 22, textAlign: 'center',
                                fontSize: 8, fontFamily: 'var(--font-mono)',
                                color: 'var(--text-muted)',
                            }}>
                                {h % 4 === 0 ? String(h).padStart(2, '0') : ''}
                            </div>
                        ))}
                    </div>
                    {heatmapData.map(({ day, hours }) => (
                        <div key={day} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
                            <div style={{
                                width: 32, fontSize: 9, fontFamily: 'var(--font-mono)',
                                color: 'var(--text-secondary)', textAlign: 'right', paddingRight: 6,
                            }}>
                                {day}
                            </div>
                            {hours.map((count, h) => {
                                const intensity = count / heatMax
                                return (
                                    <div
                                        key={h}
                                        title={`${day} ${h}:00 — ${count} events`}
                                        style={{
                                            width: 22, height: 16,
                                            borderRadius: 3,
                                            background: count === 0
                                                ? 'var(--bg-hover)'
                                                : `rgba(0,229,255,${0.1 + intensity * 0.9})`,
                                            border: '1px solid var(--border)',
                                            cursor: 'default',
                                        }}
                                    />
                                )
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Row 4: Device event count */}
            <div className="card">
                <div className="card-header">
                    <span className="card-title">Events per Device</span>
                </div>
                {uptimeData.length === 0
                    ? <div className="empty-state">No devices</div>
                    : (
                        <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={uptimeData} layout="vertical" barSize={18}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-muted)' }} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--text-secondary)' }} width={120} />
                                <Tooltip {...tooltipStyle} />
                                <Bar dataKey="events" fill="var(--green)" radius={[0, 3, 3, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )
                }
            </div>
        </div>
    )
}