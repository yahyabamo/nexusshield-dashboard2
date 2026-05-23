import { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from './supabaseClient'
import {
  LayoutDashboard, Radio, BarChart3, Settings,
  Shield, LogOut, User, Wifi, WifiOff, Tv2, History
} from 'lucide-react'

import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import LiveFeedPage from './pages/LiveFeedPage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'
import MonitorPage from './pages/MonitorPage'

// ── Auth Context ──────────────────────────────────────────────────────────
import { AuthContext, useAuth } from './authContext'
import { ToastProvider } from './toastContext'

function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12 }}>
        <div className="spinner" />
        <span className="mono text-muted" style={{ fontSize: 12 }}>INITIALIZING</span>
      </div>
    )
  }

  return <AuthContext.Provider value={{ session }}>{children}</AuthContext.Provider>
}

// ── Protected Route ───────────────────────────────────────────────────────
function Protected({ children }) {
  const { session } = useAuth()
  return session ? children : <Navigate to="/login" replace />
}

// ── Layout (Sidebar + Topbar) ─────────────────────────────────────────────
const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/live', icon: Tv2, label: 'Live' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/live': 'Live Feed',
  '/monitor': 'Monitor',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
}

function Layout({ children }) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [realtimeOk, setRealtimeOk] = useState(true)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (!session) return
    supabase.from('profiles').select('full_name, role').eq('id', session.user.id).single()
      .then(({ data }) => setProfile(data))

    // Monitor realtime connection
    const channel = supabase.channel('health')
    channel.subscribe(status => setRealtimeOk(status === 'SUBSCRIBED'))
    return () => supabase.removeChannel(channel)
  }, [session])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="brand">
            <Shield size={13} style={{ display: 'inline', marginRight: 7 }} />
            SecureWatch
          </div>
          <div className="brand-sub">IoT Security Dashboard</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={15} className="icon" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 4 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--accent-dim)', border: '1px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <User size={13} color="var(--accent)" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{profile?.full_name || session?.user?.email?.split('@')[0]}</div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {profile?.role || 'viewer'}
              </div>
            </div>
          </div>
          <button className="nav-item" onClick={handleSignOut}>
            <LogOut size={15} className="icon" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="page-title">{PAGE_TITLES[location.pathname] || 'Dashboard'}</h1>
          </div>
          <div className="topbar-right">
            <div className="connection-badge">
              {realtimeOk
                ? <><div className="connection-dot" />REALTIME CONNECTED</>
                : <><div className="connection-dot offline" /><WifiOff size={12} /> DISCONNECTED</>
              }
            </div>
          </div>
        </header>

        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  )
}

// ── App Root ──────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={
              <Protected>
                <Layout>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/history" element={<LiveFeedPage />} />
                    <Route path="/live" element={<MonitorPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Routes>
                </Layout>
              </Protected>
            } />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}