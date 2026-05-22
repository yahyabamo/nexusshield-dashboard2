import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Shield, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleLogin = async () => {
        if (!email || !password) { setError('Please fill in all fields'); return }
        setLoading(true)
        setError(null)

        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) {
            setError(err.message)
            setLoading(false)
        } else {
            navigate('/')
        }
    }

    return (
        <div style={{
            height: '100vh',
            background: 'var(--bg-base)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Background grid */}
            <div style={{
                position: 'absolute', inset: 0, opacity: 0.03,
                backgroundImage: `linear-gradient(var(--accent) 1px, transparent 1px),
                          linear-gradient(90deg, var(--accent) 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
                pointerEvents: 'none',
            }} />

            {/* Glow */}
            <div style={{
                position: 'absolute', width: 400, height: 400,
                background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)',
                borderRadius: '50%', pointerEvents: 'none',
            }} />

            <div style={{
                width: 400,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-accent)',
                borderRadius: 'var(--radius-lg)',
                padding: 40,
                position: 'relative',
                animation: 'slideUp 0.3s ease',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        width: 52, height: 52,
                        background: 'var(--accent-dim)',
                        border: '1px solid var(--accent)',
                        borderRadius: 14,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                    }}>
                        <Shield size={24} color="var(--accent)" />
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '0.05em' }}>SecureWatch</div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 4, letterSpacing: '0.15em' }}>
                        IoT SECURITY DASHBOARD
                    </div>
                </div>

                {/* Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label className="label">Email</label>
                        <input
                            className="input"
                            type="email"
                            placeholder="admin@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        />
                    </div>

                    <div>
                        <label className="label">Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="input"
                                type={showPw ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                                style={{ paddingRight: 42 }}
                            />
                            <button
                                onClick={() => setShowPw(p => !p)}
                                style={{
                                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                                    padding: 0, display: 'flex',
                                }}
                            >
                                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div style={{
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: 'var(--radius)', padding: '10px 14px',
                            fontSize: 12, color: 'var(--red)', fontFamily: 'var(--font-mono)',
                        }}>
                            {error}
                        </div>
                    )}

                    <button className="btn btn-primary" onClick={handleLogin} disabled={loading}
                        style={{ width: '100%', justifyContent: 'center', marginTop: 4, opacity: loading ? 0.7 : 1 }}>
                        {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Signing in...</> : 'Sign In'}
                    </button>
                </div>

                <div style={{ marginTop: 20, textAlign: 'center', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    Create accounts via Supabase Auth dashboard
                </div>
            </div>
        </div>
    )
}