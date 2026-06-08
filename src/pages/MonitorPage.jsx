import { useState, useEffect, useRef } from 'react'
import { supabase, EVENT_TYPES, SEVERITY } from '../supabaseClient'
import { formatDistanceToNow } from 'date-fns'
import { Maximize2, Minimize2, Camera, Wifi } from 'lucide-react'
import { computeMotionSeverity, MOTION_SEVERITY_META } from '../motionSeverity'

export default function MonitorPage() {
    const [devices, setDevices] = useState([])
    const [configs, setConfigs] = useState({}) // keyed by device_id
    const [selectedId, setSelectedId] = useState(null)
    const [streamError, setStreamError] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [events, setEvents] = useState([])
    const [loadingDevices, setLoadingDevices] = useState(true)
    const [loadingEvents, setLoadingEvents] = useState(false)
    const channelRef = useRef(null)

    // ── 1. Fetch devices + configs on mount ──────────────────────────────────
    useEffect(() => {
        async function fetchDevices() {
            const { data: devData } = await supabase
                .from('devices')
                .select('id, name, location, status, last_seen_at, stream_url')
                .order('name')

            const devs = devData || []
            setDevices(devs)

            if (devs.length > 0) {
                setSelectedId(devs[0].id)
            }

            if (devs.length > 0) {
                const ids = devs.map(d => d.id)
                const { data: cfgData } = await supabase
                    .from('device_config')
                    .select('device_id, sensitivity, detection_cooldown, alert_enabled')
                    .in('device_id', ids)

                const map = {}
                for (const cfg of cfgData || []) {
                    map[cfg.device_id] = cfg
                }
                setConfigs(map)
            }

            setLoadingDevices(false)
        }

        fetchDevices()
    }, [])

    // ── 2. Fetch events + realtime subscription when selectedId changes ───────
    useEffect(() => {
        if (!selectedId) return

        setStreamError(false)
        setLoadingEvents(true)

        async function fetchEvents() {
            const { data } = await supabase
                .from('events')
                .select('id, event_type, severity, created_at')
                .eq('device_id', selectedId)
                .order('created_at', { ascending: false })
                .limit(8)
            setEvents(data || [])
            setLoadingEvents(false)
        }

        fetchEvents()

        // Clean up previous channel
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current)
            channelRef.current = null
        }

        const channel = supabase
            .channel(`monitor-events-${selectedId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'events',
                filter: `device_id=eq.${selectedId}`,
            }, (payload) => {
                setEvents(prev => [payload.new, ...prev].slice(0, 8))
            })
            .subscribe()

        channelRef.current = channel

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
                channelRef.current = null
            }
        }
    }, [selectedId])

    const selectedDevice = devices.find(d => d.id === selectedId) || null
    const selectedConfig = selectedId ? configs[selectedId] : null

    // ── 3-state device status (same logic as Dashboard) ─────────────────────
    // online  → status=online AND last_seen_at within 2 minutes
    // stale   → status=online BUT last_seen_at > 2 minutes ago (lost power/crashed)
    // offline → status=offline
    const STALE_MS = 2 * 60 * 1000
    const lastSeen = selectedDevice?.last_seen_at ? new Date(selectedDevice.last_seen_at) : null
    const isRecentlySeen = lastSeen && (Date.now() - lastSeen.getTime()) <= STALE_MS

    let deviceStatusKey = 'offline'
    if (selectedDevice?.status === 'online' && isRecentlySeen) deviceStatusKey = 'online'
    else if (selectedDevice?.status === 'online' && !isRecentlySeen) deviceStatusKey = 'stale'

    const DEVICE_STATUS = {
        online:  { label: 'Online',        color: 'var(--green)',      bg: 'rgba(16,185,129,0.12)', dot: 'var(--green)'       },
        stale:   { label: 'Disconnected',  color: '#fbbf24',           bg: 'rgba(251,191,36,0.12)', dot: '#fbbf24'            },
        offline: { label: 'Offline',       color: 'var(--text-muted)', bg: 'var(--bg-hover)',       dot: 'var(--text-muted)'  },
    }
    const deviceStatus = DEVICE_STATUS[deviceStatusKey]

    const isOnline = deviceStatusKey === 'online'   // used by streamLive gate
    const hasStream = !!(selectedDevice?.stream_url)
    const streamLive = hasStream && !streamError && isOnline

    if (loadingDevices) {
        return <div className="empty-state"><div className="spinner" /></div>
    }

    if (devices.length === 0) {
        return (
            <div className="empty-state">
                <Camera size={32} style={{ opacity: 0.3 }} />
                <span>No devices registered</span>
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>

            {/* ── Camera selector bar ─────────────────────────────────────── */}
            {devices.length > 1 && (
                <div style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                }}>
                    <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                        marginRight: 4,
                    }}>
                        Channel
                    </span>
                    {devices.map((dev, idx) => {
                        const active = dev.id === selectedId
                        const online = dev.status === 'online'
                        return (
                            <button
                                key={dev.id}
                                onClick={() => setSelectedId(dev.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '6px 14px',
                                    borderRadius: 'var(--radius)',
                                    border: active
                                        ? '1px solid rgba(0,229,255,0.4)'
                                        : '1px solid var(--border-accent)',
                                    background: active ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    letterSpacing: '0.08em',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <span style={{
                                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                                    background: online ? 'var(--green)' : 'var(--text-muted)',
                                    boxShadow: online ? '0 0 5px var(--green)' : 'none',
                                }} />
                                CAM_{String(idx + 1).padStart(2, '0')}
                            </button>
                        )
                    })}
                </div>
            )}

            {/* ── Two-column layout ────────────────────────────────────────── */}
            <div className={`monitor-grid${isFullscreen ? ' fullscreen' : ''}`}>

                {/* ── LEFT: Stream area ─────────────────────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>

                    {/* Stream container */}
                    <div style={{
                        position: 'relative',
                        flex: 1,
                        minHeight: 320,
                        background: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border)',
                        overflow: 'hidden',
                    }}>
                        {/* Stream or offline overlay */}
                        {streamLive ? (
                            <img
                                key={selectedDevice?.stream_url}
                                src={selectedDevice.stream_url}
                                alt="Live Stream"
                                onError={() => setStreamError(true)}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: 'block',
                                }}
                            />
                        ) : (
                            <OfflineOverlay />
                        )}

                        {/* Fullscreen toggle */}
                        <button
                            onClick={() => setIsFullscreen(f => !f)}
                            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                            style={{
                                position: 'absolute',
                                top: 12,
                                right: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 34,
                                height: 34,
                                borderRadius: 'var(--radius)',
                                background: 'rgba(8,11,15,0.75)',
                                border: '1px solid var(--border-accent)',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                backdropFilter: 'blur(4px)',
                                transition: 'all 0.15s',
                                zIndex: 10,
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(8,11,15,0.9)'
                                e.currentTarget.style.color = 'var(--text-primary)'
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(8,11,15,0.75)'
                                e.currentTarget.style.color = 'var(--text-secondary)'
                            }}
                        >
                            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                        </button>

                        {/* LIVE badge */}
                        <div style={{
                            position: 'absolute',
                            top: 12,
                            left: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: 20,
                            background: 'rgba(8,11,15,0.75)',
                            border: '1px solid var(--border-accent)',
                            backdropFilter: 'blur(4px)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            letterSpacing: '0.1em',
                            color: streamLive ? 'var(--green)' : 'var(--text-muted)',
                        }}>
                            <span style={{
                                width: 7, height: 7, borderRadius: '50%',
                                background: streamLive ? 'var(--green)' : 'var(--text-muted)',
                                boxShadow: streamLive ? '0 0 6px var(--green)' : 'none',
                                animation: streamLive ? 'pulse 2s infinite' : 'none',
                                flexShrink: 0,
                            }} />
                            {streamLive ? 'LIVE' : 'OFFLINE'}
                        </div>
                    </div>

                    {/* ── Status bar ───────────────────────────────────── */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 20,
                        padding: '10px 16px',
                        background: 'var(--bg-surface)',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)',
                        flexWrap: 'wrap',
                    }}>
                        {/* Device name */}
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>
                                {selectedDevice?.name || '—'}
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                                {selectedDevice?.location || 'No location'}
                            </div>
                        </div>

                        <StatusPill label="Status" value={deviceStatus.label}
                            color={deviceStatus.color} />

                        {selectedDevice?.last_seen_at && (
                            <StatusPill
                                label="Last Seen"
                                value={formatDistanceToNow(new Date(selectedDevice.last_seen_at), { addSuffix: true })}
                                color="var(--text-secondary)"
                            />
                        )}

                        {selectedConfig && (
                            <StatusPill
                                label="Sensitivity"
                                value={`${selectedConfig.sensitivity ?? '—'} / 10`}
                                color="var(--accent)"
                            />
                        )}

                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Wifi size={13} color={streamLive ? 'var(--green)' : 'var(--text-muted)'} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: streamLive ? 'var(--green)' : 'var(--text-muted)' }}>
                                {streamLive ? 'Stream OK' : 'No Signal'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT: Info + Events panel ───────────────────────── */}
                {!isFullscreen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>

                        {/* Device Info card */}
                        <div className="card" style={{ flexShrink: 0 }}>
                            <div className="card-header">
                                <span className="card-title">Device Info</span>
                                <span className="badge" style={{
                                    color: deviceStatus.color,
                                    background: deviceStatus.bg,
                                }}>
                                    <span className="badge-dot" style={{
                                        background: deviceStatus.dot,
                                    }} />
                                    {deviceStatus.label}
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <InfoRow label="Name" value={selectedDevice?.name || '—'} />
                                <InfoRow label="Location" value={selectedDevice?.location || '—'} />
                                {selectedDevice?.last_seen_at && (
                                    <InfoRow
                                        label="Last Seen"
                                        value={formatDistanceToNow(new Date(selectedDevice.last_seen_at), { addSuffix: true })}
                                    />
                                )}

                                {selectedConfig != null && (
                                    <>
                                        {/* Sensitivity bar */}
                                        <div>
                                            <div style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: 10,
                                                letterSpacing: '0.1em',
                                                textTransform: 'uppercase',
                                                color: 'var(--text-muted)',
                                                marginBottom: 6,
                                            }}>
                                                Sensitivity
                                            </div>
                                            <div style={{
                                                height: 6,
                                                borderRadius: 6,
                                                background: 'var(--bg-hover)',
                                                overflow: 'hidden',
                                            }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${((selectedConfig.sensitivity ?? 0) / 10) * 100}%`,
                                                    background: 'var(--accent)',
                                                    borderRadius: 6,
                                                    transition: 'width 0.4s ease',
                                                    boxShadow: '0 0 6px var(--accent)',
                                                }} />
                                            </div>
                                            <div style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: 11,
                                                color: 'var(--accent)',
                                                marginTop: 4,
                                            }}>
                                                {selectedConfig.sensitivity ?? '—'} / 10
                                            </div>
                                        </div>

                                        {/* Alert enabled badge */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: 10,
                                                letterSpacing: '0.1em',
                                                textTransform: 'uppercase',
                                                color: 'var(--text-muted)',
                                            }}>
                                                Alerts
                                            </span>
                                            <span className="badge" style={{
                                                color: selectedConfig.alert_enabled ? 'var(--green)' : 'var(--text-muted)',
                                                background: selectedConfig.alert_enabled ? 'rgba(16,185,129,0.12)' : 'var(--bg-hover)',
                                            }}>
                                                {selectedConfig.alert_enabled ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </div>

                                        {selectedConfig.detection_cooldown != null && (
                                            <InfoRow
                                                label="Cooldown"
                                                value={`${selectedConfig.detection_cooldown}s`}
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Recent Events card */}
                        <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
                            <div className="card-header" style={{ padding: '14px 16px 0', marginBottom: 0 }}>
                                <span className="card-title">Recent Events</span>
                                <span style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 10,
                                    color: 'var(--text-muted)',
                                }}>
                                    REALTIME
                                </span>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0 4px' }}>
                                {loadingEvents ? (
                                    <div className="empty-state" style={{ padding: '28px 16px' }}>
                                        <div className="spinner" />
                                    </div>
                                ) : events.length === 0 ? (
                                    <div className="empty-state" style={{ padding: '28px 16px' }}>
                                        No events yet
                                    </div>
                                ) : (
                                    events.map(ev => {
                                        const et = EVENT_TYPES[ev.event_type] || { label: ev.event_type, color: 'var(--text-muted)' }
                                        const motionSev = computeMotionSeverity(ev, events)
                                        const sv = motionSev
                                            ? MOTION_SEVERITY_META[motionSev]
                                            : (SEVERITY[ev.severity] || SEVERITY.low)
                                        return (
                                            <div key={ev.id} className="new-row" style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                padding: '9px 16px',
                                                borderBottom: '1px solid var(--border)',
                                                transition: 'background 0.15s',
                                            }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                {/* Colored dot */}
                                                <span style={{
                                                    width: 8, height: 8, borderRadius: '50%',
                                                    background: et.color,
                                                    flexShrink: 0,
                                                    boxShadow: `0 0 5px ${et.color}`,
                                                }} />

                                                {/* Type label */}
                                                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {et.label}
                                                </span>

                                                {/* Severity badge */}
                                                <span className="badge" style={{
                                                    color: sv.color,
                                                    background: sv.bg,
                                                    flexShrink: 0,
                                                    fontSize: 10,
                                                }}>
                                                    {sv.label}
                                                </span>

                                                {/* Time ago */}
                                                <span style={{
                                                    fontFamily: 'var(--font-mono)',
                                                    fontSize: 10,
                                                    color: 'var(--text-muted)',
                                                    flexShrink: 0,
                                                }}>
                                                    {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    )
}

// ── Offline overlay ────────────────────────────────────────────────────────
function OfflineOverlay() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            minHeight: 320,
            gap: 12,
            background: 'var(--bg-base)',
        }}>
            <div style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <Camera size={24} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-secondary)' }}>
                Stream Unavailable
            </div>
            <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text-muted)',
                textAlign: 'center',
                maxWidth: 240,
                lineHeight: 1.6,
            }}>
                Device may be outside your network range
            </div>
        </div>
    )
}

// ── Status pill for status bar ─────────────────────────────────────────────
function StatusPill({ label, value, color }) {
    return (
        <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 2 }}>
                {label}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color }}>
                {value}
            </div>
        </div>
    )
}

// ── Info row for device info panel ─────────────────────────────────────────
function InfoRow({ label, value }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', flexShrink: 0 }}>
                {label}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right', wordBreak: 'break-word' }}>
                {value}
            </span>
        </div>
    )
}
